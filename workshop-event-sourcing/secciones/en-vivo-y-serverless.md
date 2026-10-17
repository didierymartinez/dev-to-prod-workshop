# En vivo y serverless

Tu servicio responde peticiones y despacha comandos, pero una petición HTTP pregunta una vez y se va. Dos formas de entrega quedan fuera de ese molde, y una rompe supuestos que diste por sentados.

## 🎯 El Objetivo

Ver dos variantes de entrega más allá del pedir-y-responder: una UI que se **entera sola** cuando algo cambia (SSE); y **serverless**, donde no hay un host de larga vida y el daemon y el outbox **no aplican igual**.

## 💥 En vivo: la UI quiere enterarse sola

Soporte ya tiene su pantalla: el `Tablero` de [El tablero cruza streams](./el-tablero-cruza-streams.md). Con peticiones normales, para verlo al día hay que **recargar** — y entre recarga y recarga, la pantalla miente. Lo que quieres es que el **servidor empuje** el cambio en cuanto ocurre.

> 🆕 **SSE (Server-Sent Events): el servidor empuja por una conexión abierta.** El cliente abre una conexión y la deja viva; el servidor le **envía** eventos (`text/event-stream`) cuando ocurren, sin que el cliente vuelva a preguntar. .NET 10 lo trae nativo: `TypedResults.ServerSentEvents` sobre un `IAsyncEnumerable`.

> 🆕 **La fuente del stream es un `Channel`.** Para que el `IAsyncEnumerable` **emita cuando algo pasa**, lo lees de un `Channel<string>` —una cola en memoria productor→consumidor—: el productor (un handler de tu anuncio) le **escribe** el NIT de cada empresa suspendida; el iterador del SSE lo **lee** con `ReadAllAsync`. El `CancellationToken` del iterador se marca con `[EnumeratorCancellation]` para cortar cuando el cliente cierra.

> 🛠️ **Inténtalo tú.** (1) Declara el `Channel<string>` compartido en `Empresas.Historia`, como campo de una clase `static` (`EnVivo.Canal`): así lo ven el endpoint y el productor. (2) El **productor**: un handler de tu propio anuncio, `EmpresaSuspendidaV2`, en `Empresas.Historia`, que haga `EnVivo.Canal.Writer.TryWrite(anuncio.Nit)`. El outbox se lo entrega solo si la suspensión se guardó. No escribas al canal desde tu `SuspenderHandler`: corre antes del commit. Si el guardado falla o se reintenta, la pantalla muestra una suspensión que no está en el diario: el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md). Tampoco desde el `Apply` de una proyección: una proyección nueva o rearmada rejuega todo el diario, y volvería a empujar cada suspensión histórica. (3) El **consumidor**: un `GET /suspensiones/en-vivo` que devuelva `TypedResults.ServerSentEvents(...)` sobre un iterador que lea `EnVivo.Canal`. (4) Ábrelo con `curl -N`, dispara una suspensión, y ve el evento llegar en vivo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
using System.Threading.Channels;          // en el archivo de EnVivo
using Contratos;                          // en el archivo de EnVivo, para EmpresaSuspendidaV2
using System.Runtime.CompilerServices;    // en Program.cs, para [EnumeratorCancellation]

// en Empresas.Historia, en su propio archivo: la cola en memoria que comparten el endpoint y el productor
public static class EnVivo { public static readonly Channel<string> Canal = Channel.CreateUnbounded<string>(); }

// PRODUCTOR (mismo archivo): un handler de tu propio anuncio; el outbox se lo entrega solo si la suspensión se guardó
public static class EnVivoHandler
{
    public static void Handle(EmpresaSuspendidaV2 anuncio) => EnVivo.Canal.Writer.TryWrite(anuncio.Nit);
}

// CONSUMIDOR (Program.cs): el endpoint SSE lee el canal y lo transmite
app.MapGet("/suspensiones/en-vivo", (CancellationToken ct) =>
    TypedResults.ServerSentEvents(Leer(ct), eventType: "suspension"));

static async IAsyncEnumerable<string> Leer([EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var nit in EnVivo.Canal.Reader.ReadAllAsync(ct))
        yield return nit;   // → "event: suspension\ndata: 901000000\n\n"
}
```

`curl -N http://localhost:5000/suspensiones/en-vivo` deja la conexión abierta. En cuanto un `POST` de suspensión se guarda, el handler del anuncio escribe al canal y el evento aparece en la terminal, sin recargar.

</details>

## 💥 Serverless: no hay host que viva para siempre

Ahora el otro extremo. En [El host y la inyección](./el-host-y-la-inyeccion.md) montaste un host de **larga vida**: dentro de él corren el **daemon** (§37) y el **outbox** (§30) como servicios de fondo. En **serverless** —una Azure Function que despierta con cada mensaje y muere al terminar— ese supuesto se cae: **no hay proceso persistente**. Y sin él:

- El **daemon async no puede correr**: nadie sostiene el bucle de fondo. Las proyecciones tienen que ser **`Inline`**: se aplican en la **misma transacción** de la escritura, síncronas y **atómicas** — no el dual-write no atómico con que actualizabas la vista a mano en [La vista de lectura](./la-vista-de-lectura.md) (§16) y que [La vista se mantiene sola](./la-vista-se-mantiene-sola.md) tuvo que arreglar, sino esa misma idea ya dentro de la transacción. Ganas consistencia fuerte; el costo es que cada escritura también proyecta.
- El **outbox de fondo no entrega después**: no hay worker que recoja los pendientes. Publicas **`SendInline`** —la opción de Wolverine para enviar el mensaje **dentro** de la invocación, síncrono, en vez de dejarlo en la bandeja durable—. Wolverine trae también un modo intermedio, `DurabilityMode.ServerlessWithOutbox`, que guarda la bandeja en la transacción del hecho. Los pendientes salen cuando alguien de afuera corre la pasada de recuperación, `RunDurabilityPassAsync`: por ejemplo, una Function con temporizador.
- El **plazo programado** de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md) y [El proceso tiene dueño](./el-proceso-tiene-dueno.md) tampoco vence: el mensaje que Wolverine guarda para más tarde necesita un proceso de fondo que lo despierte. Con `ServerlessWithOutbox`, lo despierta esa misma pasada, la primera que corra después del vencimiento. En Azure Service Bus, la espera la hace el broker, con su **entrega programada**. Y el orden por llave de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) pasa al `SessionId` de la cola.

> ⚠️ **`SendInline` NO te da la atomicidad del outbox.** Ojo con esto, que contradice lo que tanto costó en [El hecho y su anuncio](./el-hecho-y-su-anuncio.md): el outbox guardaba el mensaje **en la transacción del hecho**, y la entrega se podía reintentar. `SendInline` no guarda nada: Wolverine envía al broker justo después del commit. Si ese envío falla —el broker no responde, la función se corta—, el hecho ya quedó y el anuncio no queda guardado en ningún lado para reintentarlo. Es **la otra cara de §26**: un hecho real que el mundo de afuera perdió. Es el precio de no tener un proceso de fondo. Por eso, donde el anuncio no puede perderse, necesitas la bandeja: un servicio de larga vida con outbox, o `ServerlessWithOutbox` con su pasada programada.

> 🏷️ **Esto es criterio, no se vive con el juguete.** Serverless real necesita la nube (Azure Functions + un broker como Azure Service Bus). No lo montas aquí; lo reconoces. Y hay evidencia cercana: los proyectos del **Application Plane** corren justo así —Functions sobre Azure Service Bus, con el cruce entre módulos por el broker—. Ahí `Inline` + `SendInline` no son exóticos: son la forma de vivir sin un host de larga vida.

## El Descubrimiento

La entrega no es una sola forma: los **mismos** hechos alimentan una UI que se actualiza sola (SSE: el servidor empuja por un canal) y una función serverless que despierta, trabaja y muere. El daemon y el outbox que adoptaste asumen un **host de larga vida**; serverless cambia ese supuesto y con él la mecánica —proyecciones `Inline` en vez del daemon, `SendInline` en vez del outbox de fondo—, más simple de operar pero con un precio real: `SendInline` **pierde la atomicidad** del outbox (un envío que falla tras el commit pierde el anuncio, la otra cara de §26). Elegir entre "servicio de larga vida con daemon + outbox" y "serverless con Inline + SendInline" es una decisión de **despliegue**, y saber qué consistencia y qué durabilidad se ganan o pierden en cada una es el oficio.

> 🌱 Todo lo que has hecho asume una empresa, un cliente. Pero la plataforma sirve a **muchos** clientes a la vez, y una petición tiene que saber **de cuál** es. El día que el sistema rellene ese dato con un valor por defecto en vez de fallar, un hecho de un cliente termina en el diario de otro — sin un solo error. De qué cliente es cada petición, y cómo el sistema lo exige en vez de adivinarlo, es el próximo dolor: [El contexto que falta](./el-contexto-que-falta.md).

## ✅ Compruébalo

- [ ] El endpoint SSE responde `content-type: text/event-stream`; abierto con `curl -N`, empuja un evento cada vez que el productor escribe a `EnVivo.Canal`, sin que el cliente vuelva a pedir.
- [ ] Sabes decir por qué el **daemon async** no corre en serverless (no hay proceso persistente) y qué lo reemplaza (proyecciones `Inline` = la vista en la transacción, como en §16).
- [ ] Sabes decir por qué el **outbox de fondo** no aplica en serverless, qué lo reemplaza (`SendInline`), y **qué se pierde**: la atomicidad del outbox (un envío que falla tras el commit pierde el anuncio, la otra cara de §26).
- [ ] Sabes nombrar la evidencia real (Application Plane: Functions + Azure Service Bus) de dónde `Inline`/`SendInline` es la forma normal.

## 🆘 Si algo salió mal

- **El navegador no recibe eventos en vivo:** el endpoint no devuelve `text/event-stream` (usa `TypedResults.ServerSentEvents`), o un proxy buffea; prueba con `curl -N`. Y confirma que el **productor** escribe al mismo `EnVivo.Canal` que el iterador lee.
- **El SSE no emite nada aunque haya suspensiones:** nadie escribe al canal — te falta el handler de `EmpresaSuspendidaV2` en `Empresas.Historia`, con su `EnVivo.Canal.Writer.TryWrite(anuncio.Nit)`.
- **El SSE empuja una suspensión que no está en el diario, o la misma varias veces:** escribes al canal desde el `SuspenderHandler`, antes del commit; cada intento fallido o reintentado empuja otra vez. Mueve la escritura al handler del anuncio.
- **Intentas correr el daemon en una Function:** no hay proceso que lo sostenga entre invocaciones; cambia esas proyecciones a `Inline` o córrelas en un servicio de larga vida aparte.
- **En serverless esperas la atomicidad del outbox:** no la tienes con `SendInline`. Si el anuncio no puede perderse, usa `ServerlessWithOutbox` con su pasada programada, o un servicio de larga vida con outbox.

## 📓 Registra tu avance

> 💭 **Reto:** el daemon (§37) y el outbox (§30) asumen un host de larga vida. Para el outbox, explica qué se rompe en serverless con `SendInline` (pista: la atomicidad de §26) y cuándo ese trade es aceptable y cuándo no.

```bash
git add .
git commit -m "ES · En vivo y serverless (SSE con Channel + Inline/SendInline)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Los mismos hechos se entregan de formas distintas: **SSE** empuja a una UI que se entera sola (`text/event-stream` sobre un `Channel`, nativo en .NET 10), y **serverless** —sin host de larga vida— cambia el daemon por proyecciones `Inline` y el outbox por `SendInline`, ganando simplicidad pero **perdiendo la atomicidad** del outbox (un envío fallido pierde el anuncio, la otra cara de §26); elegir es criterio de despliegue.

---

[⬅️ Volver: El host y la inyección](./el-host-y-la-inyeccion.md)

[➡️ Siguiente: El contexto que falta](./el-contexto-que-falta.md)
