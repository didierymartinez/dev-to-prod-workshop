# En vivo y serverless

Tu servicio responde peticiones y despacha comandos, pero una petición HTTP pregunta una vez y se va. Dos formas de entrega quedan fuera de ese molde, y una rompe supuestos que diste por sentados.

## 🎯 El Objetivo

Ver dos variantes de entrega más allá del pedir-y-responder: una UI que se **entera sola** cuando algo cambia (SSE); y **serverless**, donde no hay un host de larga vida y el daemon y el outbox **no aplican igual**.

## 💥 En vivo: la UI quiere enterarse sola

Operaciones tiene un tablero de empresas suspendidas. Con peticiones normales, para verlo al día hay que **recargar** — y entre recarga y recarga, la pantalla miente. Lo que quieres es que el **servidor empuje** el cambio en cuanto ocurre.

> 🆕 **SSE (Server-Sent Events): el servidor empuja por una conexión abierta.** El cliente abre una conexión y la deja viva; el servidor le **envía** eventos (`text/event-stream`) cuando ocurren, sin que el cliente vuelva a preguntar. .NET 10 lo trae nativo: `TypedResults.ServerSentEvents` sobre un `IAsyncEnumerable`.

> 🆕 **La fuente del stream es un `Channel`.** Para que el `IAsyncEnumerable` **emita cuando algo pasa**, lo lees de un `Channel<string>` —una cola en memoria productor→consumidor—: el productor (tu handler o proyección) le **escribe** el id al suspender; el iterador del SSE lo **lee** con `ReadAllAsync`. El `CancellationToken` del iterador se marca con `[EnumeratorCancellation]` para cortar cuando el cliente cierra.

> 🛠️ **Inténtalo tú.** (1) Declara un `Channel<string> _canal` compartido. (2) El **productor**: donde una empresa se suspende (tu handler de `EmpresaSuspendidaV1`, o la proyección), `_canal.Writer.TryWrite(id)`. (3) El **consumidor**: un `GET /suspensiones/en-vivo` que devuelva `TypedResults.ServerSentEvents(...)` sobre un iterador que lea `_canal`. (4) Ábrelo con `curl -N`, dispara una suspensión, y ve el evento llegar en vivo.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
using System.Threading.Channels;
using System.Runtime.CompilerServices;

static readonly Channel<string> _canal = Channel.CreateUnbounded<string>();   // cola en memoria, compartida

// PRODUCTOR: donde suspendes (handler de EmpresaSuspendidaV1, o el Apply de la proyección), empuja el id
_canal.Writer.TryWrite(cmd.EmpresaId);

// CONSUMIDOR: el endpoint SSE lee el canal y lo transmite
app.MapGet("/suspensiones/en-vivo", (CancellationToken ct) =>
    TypedResults.ServerSentEvents(Leer(ct), eventType: "suspension"));

static async IAsyncEnumerable<string> Leer([EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var id in _canal.Reader.ReadAllAsync(ct))
        yield return id;   // → "event: suspension\ndata: emp-1\n\n"
}
```

`curl -N http://localhost:5000/suspensiones/en-vivo` deja la conexión abierta; en cuanto un `POST` de suspensión escribe al canal, el evento aparece en la terminal, sin recargar. Ese mismo canal es el que un panel del monitor usaría para actualizarse en vivo.

</details>

## 💥 Serverless: no hay host que viva para siempre

Ahora el otro extremo. En [El host y la inyección](./el-host-y-la-inyeccion.md) montaste un host de **larga vida**: dentro de él corren el **daemon** (§32) y el **outbox** (§30) como servicios de fondo. En **serverless** —una Azure Function que despierta con cada mensaje y muere al terminar— ese supuesto se cae: **no hay proceso persistente**. Y sin él:

- El **daemon async no puede correr**: nadie sostiene el bucle de fondo. Las proyecciones tienen que ser **`Inline`**: se aplican en la **misma transacción** de la escritura, síncronas y **atómicas** — no el dual-write no atómico con que actualizabas la vista a mano en [La vista de lectura](./la-vista-de-lectura.md) (§16) y que [La vista se mantiene sola](./la-vista-se-mantiene-sola.md) tuvo que arreglar, sino esa misma idea ya dentro de la transacción. Ganas consistencia fuerte; el costo es que cada escritura también proyecta.
- El **outbox de fondo no entrega después**: no hay worker que recoja los pendientes. Publicas **`SendInline`** —la opción de Wolverine para enviar el mensaje **dentro** de la invocación, síncrono, en vez de dejarlo en la bandeja durable—.

> ⚠️ **`SendInline` NO te da la atomicidad del outbox.** Ojo con esto, que contradice lo que tanto costó en [El hecho y su anuncio](./el-hecho-y-su-anuncio.md): el outbox guardaba el mensaje **en la transacción del hecho** (atómico, sin fantasma). `SendInline` publica fuera de esa red: si el guardado se revierte después de enviar, ya anunciaste algo que no pasó — **el fantasma de §26 vuelve a asomar**. Es el precio de no tener un proceso de fondo. Por eso, donde la atomicidad del anuncio importa de verdad, un servicio de larga vida con outbox le gana a serverless.

> 🏷️ **Esto es criterio, no se vive con el juguete.** Serverless real necesita la nube (Azure Functions + un broker como Azure Service Bus). No lo montas aquí; lo reconoces. Y hay evidencia cercana: los proyectos del **Application Plane** corren justo así —Functions sobre Azure Service Bus, con el cruce entre módulos por el broker—. Ahí `Inline` + `SendInline` no son exóticos: son la forma de vivir sin un host de larga vida.

## El Descubrimiento

La entrega no es una sola forma: los **mismos** hechos alimentan una UI que se actualiza sola (SSE: el servidor empuja por un canal) y una función serverless que despierta, trabaja y muere. El daemon y el outbox que adoptaste asumen un **host de larga vida**; serverless cambia ese supuesto y con él la mecánica —proyecciones `Inline` en vez del daemon, `SendInline` en vez del outbox de fondo—, más simple de operar pero con un precio real: `SendInline` **pierde la atomicidad** del outbox (reasoma el fantasma de §26). Elegir entre "servicio de larga vida con daemon + outbox" y "serverless con Inline + SendInline" es una decisión de **despliegue**, y saber qué consistencia y qué durabilidad se ganan o pierden en cada una es el oficio.

> 🌱 Todo lo que has hecho asume una empresa, un cliente. Pero la plataforma sirve a **muchos** clientes a la vez, y una petición tiene que saber **de cuál** es. El día que el sistema rellene ese dato con un valor por defecto en vez de fallar, un hecho de un cliente termina en el diario de otro — sin un solo error. De qué cliente es cada petición, y cómo el sistema lo exige en vez de adivinarlo, es el próximo dolor: [El contexto que falta](./el-contexto-que-falta.md).

## ✅ Compruébalo

- [ ] El endpoint SSE responde `content-type: text/event-stream`; abierto con `curl -N`, empuja un evento cada vez que el productor escribe al `_canal`, sin que el cliente vuelva a pedir.
- [ ] Sabes decir por qué el **daemon async** no corre en serverless (no hay proceso persistente) y qué lo reemplaza (proyecciones `Inline` = la vista en la transacción, como en §16).
- [ ] Sabes decir por qué el **outbox de fondo** no aplica en serverless, qué lo reemplaza (`SendInline`), y **qué se pierde**: la atomicidad del outbox (vuelve el fantasma de §26).
- [ ] Sabes nombrar la evidencia real (Application Plane: Functions + Azure Service Bus) de dónde `Inline`/`SendInline` es la forma normal.

## 🆘 Si algo salió mal

- **El navegador no recibe eventos en vivo:** el endpoint no devuelve `text/event-stream` (usa `TypedResults.ServerSentEvents`), o un proxy buffea; prueba con `curl -N`. Y confirma que el **productor** escribe al mismo `_canal` que el iterador lee.
- **El SSE no emite nada aunque haya suspensiones:** nadie escribe al canal — te falta el `_canal.Writer.TryWrite(id)` en el productor (el handler o la proyección).
- **Intentas correr el daemon en una Function:** no hay proceso que lo sostenga entre invocaciones; cambia esas proyecciones a `Inline` o córrelas en un servicio de larga vida aparte.
- **En serverless esperas la atomicidad del outbox:** no la tienes con `SendInline`; si el anuncio no puede mentir, no uses serverless para ese acto (o compénsalo con idempotencia en el consumidor, §31).

## 📓 Registra tu avance

> 💭 **Reto:** el daemon (§32) y el outbox (§30) asumen un host de larga vida. Para el outbox, explica qué se rompe en serverless con `SendInline` (pista: la atomicidad de §26) y cuándo ese trade es aceptable y cuándo no.

```bash
git add .
git commit -m "ES · En vivo y serverless (SSE con Channel + Inline/SendInline)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Los mismos hechos se entregan de formas distintas: **SSE** empuja a una UI que se entera sola (`text/event-stream` sobre un `Channel`, nativo en .NET 10), y **serverless** —sin host de larga vida— cambia el daemon por proyecciones `Inline` y el outbox por `SendInline`, ganando simplicidad pero **perdiendo la atomicidad** del outbox (reasoma el fantasma de §26); elegir es criterio de despliegue.

---

[⬅️ Volver: El host y la inyección](./el-host-y-la-inyeccion.md)

[➡️ Siguiente: El contexto que falta](./el-contexto-que-falta.md)
