# En vivo y serverless

Tu servicio responde peticiones, pero una petición HTTP pregunta una vez y se va. Dos formas de entrega quedan fuera de ese molde.

## 🎯 El Objetivo

Ver dos formas de entrega más allá del pedir-y-responder: una pantalla que se **entera sola** de lo que de verdad pasó, y **serverless**, sin un host de larga vida, donde el daemon y el outbox **no aplican igual**.

## 💥 En vivo: la UI quiere enterarse sola

Soporte ya tiene su pantalla: el `Tablero` de [El tablero cruza streams](./el-tablero-cruza-streams.md). Con peticiones normales tiene que **volver a pedir** para verlo al día, y entre dos pedidos no se entera de nada. Quieres que el **servidor empuje** el cambio en cuanto ocurre.

> 🆕 **SSE (Server-Sent Events): el servidor empuja por una conexión abierta.** El cliente abre una conexión y la deja viva; el servidor le **envía** eventos (`text/event-stream`) cuando ocurren. .NET 10 lo trae nativo: `TypedResults.ServerSentEvents` sobre un `IAsyncEnumerable`.

> 🆕 **La fuente del stream es un `Channel`.** Para que el `IAsyncEnumerable` **emita cuando algo pasa**, lo lees de un `Channel<string>`, una cola en memoria: el productor le **escribe** el NIT de cada empresa suspendida, y el iterador del SSE lo **lee** con `ReadAllAsync`. El `CancellationToken` del iterador lleva `[EnumeratorCancellation]` para cortar cuando el cliente cierra.

> 🛠️ **Inténtalo tú.** (1) Declara el `Channel<string>` compartido en `Empresas.Historia`, como campo de una clase `static` (`EnVivo.Canal`), para que lo vean el endpoint y el productor. (2) El **productor**: un handler de tu propio anuncio, `EmpresaSuspendidaV2`, que haga `EnVivo.Canal.Writer.TryWrite(anuncio.Nit)`. El outbox se lo entrega solo si la suspensión se guardó. No escribas al canal desde tu `SuspenderHandler`: corre antes del commit, y si el guardado falla, la pantalla muestra una suspensión que no está en el diario, el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md). Tampoco desde el `Apply` de una proyección, que se rejuega en cada rearme. (3) El **consumidor**: un `GET /suspensiones/en-vivo` que devuelva `TypedResults.ServerSentEvents(...)` sobre un iterador que lea `EnVivo.Canal`. (4) Ábrelo con `curl -N`, suspende emp-90, y ve el evento llegar en vivo.

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
        yield return nit;   // → "event: suspension\ndata: 909000000\n\n"
}
```

`curl -N http://localhost:5000/suspensiones/en-vivo` deja la conexión abierta. Suspende emp-90 desde otra terminal: en cuanto la suspensión se guarda, aparece `data: 909000000`, sin recargar.

</details>

## 💥 La pantalla dijo «suspendida» antes de tiempo

Prueba con una empresa a la que Facturación le dice que no. En tu `Program.cs`, entre `var app = builder.Build();` y `app.Run()`, pon el NIT de emp-40 en `ConAcuerdoDePago`: `FacturacionHandler.ConAcuerdoDePago.Add("904000000");`. Esa línea se queda, porque el conjunto vive en memoria y empieza vacío en cada arranque. Reinicia tu servicio, da de alta seis empresas, de emp-40 a emp-45, y con el `curl -N` abierto, suspende emp-40. La pantalla avisa al instante:

```bash
for i in 40 41 42 43 44 45; do curl -s -o /dev/null -X POST http://localhost:5000/empresas -H "Content-Type: application/json" -d "{\"empresaId\":\"emp-$i\",\"nit\":\"90${i}00000\",\"nombre\":\"Empresa $i\",\"plan\":\"Basico\"}"; done
curl -X POST http://localhost:5000/empresas/emp-40/suspender      # → 202
# en la terminal del curl -N:   event: suspension   data: 904000000
```

Unos segundos después, pide la ficha con `curl http://localhost:5000/empresas/emp-40`. Cuenta el final: `"facturacion":"Rechazado","accesos":"Restituido","estado":"revertida"`.

La pantalla dijo «suspendida», y emp-40 terminó activa: Facturación dijo que no, el proceso se revirtió y Accesos devolvió el acceso. `EmpresaSuspendidaV2` sale en la transacción que **abre** el proceso de [El proceso tiene dueño](./el-proceso-tiene-dueno.md): anuncia que se **pidió**, no lo que pasó. Un orquestador de la organización tiene este error: marca «activado» al pedir la activación, y si el otro sistema falla, el usuario ya recibió el aviso de éxito.

## 🔧 La pantalla escucha lo confirmado

> 🛠️ **Inténtalo tú.** Quiero que la pantalla avise solo lo que quedó efectivo:
>
> ```
> POST /empresas/emp-41/suspender   →   event: suspension   data: 904100000
> POST /empresas/emp-40/suspender   →   (Facturación dice que no: la pantalla no muestra nada)
> ```
>
> Haz que funcione: (1) Declara en `Contratos` el contrato de lo confirmado, `SuspensionEfectivaV1(SuspensionId, Nit)`, con su `[MessageIdentity]`, la regla de [El outbox](./el-outbox.md). (2) Que `ProcesoDeSuspensionHandler` lo devuelva cuando entre los hechos decididos esté `SuspensionEfectiva`. Como ahora puede devolver dos mensajes, `RestituirAccesosV2` y este, su retorno pasa a `OutgoingMessages`, como el de tu `SuspenderHandler`, en `Decidir` y en los cinco `Handle`. Conserva el `ILogger` y la línea del descarte de [Seguir una acción](./seguir-una-accion.md): el descarte devuelve la salida vacía. (3) Que `EnVivoHandler` escuche `SuspensionEfectivaV1` en vez de `EmpresaSuspendidaV2`: el outbox se lo entrega solo si el commit del proceso pasó. (4) Suspende emp-41 y otra vez emp-40, y mira el `curl -N`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: lo confirmado, para quien quiera saber
[MessageIdentity("empresas.suspension-efectiva.v1")]
public record SuspensionEfectivaV1(string SuspensionId, string Nit);

// Empresas.Historia/ProcesoDeSuspensionHandler.cs (con using Wolverine;): Decidir y los cinco Handle devuelven Task<OutgoingMessages>
public static Task<OutgoingMessages> Handle(MultaCobradaV2 m, IDocumentSession s, ILogger log) => Decidir(s, log, m.SuspensionId, p => p.ConfirmarCobroDeMulta(m.CobradaEl));
// … igual en los otros cuatro …
static async Task<OutgoingMessages> Decidir(IDocumentSession session, ILogger log, string suspensionId, Func<SuspensionDeEmpresa, object[]> decidir)
    // … como antes, hasta los hechos:
    var salida = new OutgoingMessages();
    var hechos = decidir(proceso);
    if (hechos.Length == 0)
    {
        log.LogInformation("{SuspensionId}: el mensaje no cambia el proceso, se descarta", suspensionId);
        return salida;   // nada nuevo: no sale nada
    }
    // … los Append, igual que antes
    if (hechos.OfType<RestitucionDeAccesosSolicitada>().Any()) salida.Add(new RestituirAccesosV2(suspensionId, proceso.Nit));
    if (hechos.OfType<SuspensionEfectiva>().Any()) salida.Add(new SuspensionEfectivaV1(suspensionId, proceso.Nit));   // lo confirmado
    return salida;

// EnVivo: el productor escucha lo confirmado
public static void Handle(SuspensionEfectivaV1 aviso) => EnVivo.Canal.Writer.TryWrite(aviso.Nit);
```

Solo llega `904100000`, y llega cuando los dos socios contestaron. emp-40 vuelve a quedar `revertida`, y la pantalla no dijo nada.

</details>

**🔨 Rómpelo: el empuje en la proyección.** El tablero ya tiene un `Apply(IEvent<SuspensionEfectiva> e, Tablero t)`, y empujar desde ahí parece más corto que un contrato. Deja vacío el cuerpo de tu `Handle(SuspensionEfectivaV1 aviso)`, y en ese `Apply` agrega `EnVivo.Canal.Writer.TryWrite(e.StreamKey!);`. Cada suspensión nueva avisa una vez, como antes. Ahora rearma el tablero con tu orden: pon `await Vistas.Rearmar(app, "Tablero");` antes de `app.Run()`, arranca, y abre el `curl -N`. Sin que nadie suspenda, llega un aviso por cada suspensión efectiva de tu diario, tantos como cuenta `SELECT count(*) FROM mt_events WHERE type = 'suspension_efectiva';`. El rearmado rejugó el diario, y cada `Apply` volvió a empujar. Lo mismo pasa con un correo, un cobro o una llamada: en un servicio de la organización, rearmar una vista de 10.000 hechos dispararía 10.000 autenticaciones contra otro servicio. Un `Apply` solo lee el hecho y escribe su documento. Quita la línea del `Apply` y la de `Rearmar`, y devuélvele el cuerpo al `Handle`: un rearme no vuelve a llamar al handler del contrato.

## 🔧 Lo que viaja a la pantalla es un contrato

La pantalla de soporte es otro programa. Hazla con `dotnet new console -o Pantalla` y `dotnet add Pantalla reference Contratos`: referencia **solo** `Contratos`, como `Notificaciones`.

> 🆕 **`SseParser` lee un stream SSE.** `SseParser.Create(stream).EnumerateAsync()` recorre los eventos que llegan; cada uno trae su `EventType` y su `Data`, un `string`. Viene con .NET 10, en `System.Net.ServerSentEvents`.

```csharp
// Pantalla/Program.cs: la pantalla de soporte, en su propio proceso
using System.Net.ServerSentEvents;

using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };   // la conexión queda abierta
await using var flujo = await http.GetStreamAsync("http://localhost:5000/suspensiones/en-vivo");
await foreach (var item in SseParser.Create(flujo).EnumerateAsync())
    if (item.EventType == "suspension")
        Console.WriteLine($"NIT {item.Data}: suspendida");
```

Cierra el `curl -N`: el canal le entrega cada aviso a un solo lector, y con dos abiertos cada uno ve una parte. Con el host arriba, corre `dotnet run --project Pantalla` y suspende emp-42: la pantalla imprime `NIT 904200000: suspendida`.

**🔨 Rómpelo: el nombre que nadie fija.** Como el evento ya anuncia lo confirmado, cambia el literal del endpoint a `"suspension-efectiva"`. Los dos programas compilan. Arranca el host y la pantalla, y suspende emp-43: su ficha dice `efectiva`, y la pantalla no muestra nada, sin error. Un servicio de la organización tiene así el contrato con su UI, un literal y un objeto sin tipo: renombrar compila, despliega en verde y rompe la pantalla.

> 🛠️ **Inténtalo tú.** La pantalla depende de dos cosas que nadie le garantiza: que el evento se llame como lo escribe el endpoint, y que `data` sea un NIT. Que el nombre y la forma del aviso vivan en `Contratos`, donde los dos programas los leen. Al suspender emp-44, la pantalla debe imprimir `NIT 904400000: suspendida`, y por la conexión el aviso viaja así:
>
> ```
> event: suspension-efectiva
> data: {"suspensionId":"susp-emp-44-2","nit":"904400000"}
> ```
>
> Para eso: (1) Dale a `SuspensionEfectivaV1` el nombre del evento como constante, `public const string Tipo = "suspension-efectiva";`: un `const` es un valor fijo que el compilador conoce. (2) Que el canal lleve el contrato entero, `Channel<SuspensionEfectivaV1>`, y que `EnVivoHandler` escriba el `aviso`. (3) En el endpoint, `eventType: SuspensionEfectivaV1.Tipo`, y que `Leer` devuelva `IAsyncEnumerable<SuspensionEfectivaV1>`: `ServerSentEvents` manda cada uno como JSON. (4) En la pantalla, compara con `SuspensionEfectivaV1.Tipo` y lee el `Data` con `JsonSerializer.Deserialize<SuspensionEfectivaV1>(item.Data, JsonSerializerOptions.Web)`. Las opciones web leen los nombres en minúscula inicial, como los manda el servidor.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Contratos: la forma del aviso es el record; su nombre, la constante
[MessageIdentity("empresas.suspension-efectiva.v1")]
public record SuspensionEfectivaV1(string SuspensionId, string Nit)
{
    public const string Tipo = "suspension-efectiva";   // el nombre del evento en vivo
}

// EnVivo: el canal lleva el contrato
public static class EnVivo { public static readonly Channel<SuspensionEfectivaV1> Canal = Channel.CreateUnbounded<SuspensionEfectivaV1>(); }
public static void Handle(SuspensionEfectivaV1 aviso) => EnVivo.Canal.Writer.TryWrite(aviso);   // en EnVivoHandler

// Program.cs: el endpoint usa la constante
app.MapGet("/suspensiones/en-vivo", (CancellationToken ct) =>
    TypedResults.ServerSentEvents(Leer(ct), eventType: SuspensionEfectivaV1.Tipo));

static async IAsyncEnumerable<SuspensionEfectivaV1> Leer([EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var aviso in EnVivo.Canal.Reader.ReadAllAsync(ct))
        yield return aviso;
}

// Pantalla/Program.cs: con using System.Text.Json; y using Contratos;
await foreach (var item in SseParser.Create(flujo).EnumerateAsync())
{
    if (item.EventType != SuspensionEfectivaV1.Tipo) continue;
    var aviso = JsonSerializer.Deserialize<SuspensionEfectivaV1>(item.Data, JsonSerializerOptions.Web)!;
    Console.WriteLine($"NIT {aviso.Nit}: suspendida");
}
```

</details>

Ahora renombra en el contrato `Nit` a `NitEmpresa`. El host compila, porque arma el contrato por posición. La pantalla no: `dotnet build` da `error CS1061` sobre `Nit`. Lo que rompía la pantalla en silencio ahora falla al compilar. Devuélvele su nombre. El compilador solo cuida a los programas que compilan contra el mismo `Contratos`: una pantalla ya desplegada con la forma vieja mostraría `NIT : suspendida`, sin error. Por eso cambiar la forma de un contrato es una versión nueva, como en [El evento público](./el-evento-publico.md).

## 💥 Serverless: no hay host que viva para siempre

Ahora el otro extremo. Tu servicio es de **larga vida**: dentro de él corren el **daemon** de [El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md) y la entrega del **outbox** de [El outbox](./el-outbox.md), como trabajos de fondo. En **serverless**, una Azure Function despierta con cada mensaje y muere al terminar, como tu worker con su archivo: **no hay proceso persistente**. Y sin él:

- El **daemon async no puede correr**: nadie sostiene el bucle de fondo. Las proyecciones tienen que ser **`Inline`**, como tu `EmpresaDetalle` de [La vista en la misma transacción](./la-vista-en-la-misma-transaccion.md): no van atrás, y cada escritura también proyecta.
- El **outbox de fondo no entrega después**: nadie recoge los pendientes. Publicas con **`SendInline`**, que envía el mensaje **dentro** de la invocación, justo después del commit, en vez de dejarlo en la bandeja durable. Así enviaba tu regla de `PlanDeEmpresaV1` en [Lo que el broker no promete](./lo-que-el-broker-no-promete.md), antes de `UseDurableOutbox`: con el broker caído, su anuncio se perdió. El modo intermedio es `DurabilityMode.ServerlessWithOutbox`: guarda el mensaje con el hecho, en `wolverine_outgoing_envelopes`. Los pendientes salen cuando alguien de afuera corre la pasada de recuperación, `RunDurabilityPassAsync`, por ejemplo una Function con temporizador.
- El **plazo programado** de [Deshacer en tres sistemas](./deshacer-en-tres-sistemas.md) tampoco vence: el mensaje que Wolverine guarda para más tarde necesita un proceso que lo despierte. Con `ServerlessWithOutbox` lo despierta la primera pasada tras el vencimiento; en Azure Service Bus, la espera la hace el broker con su **entrega programada**. Y el orden por llave de [Dos respuestas a la vez](./dos-respuestas-a-la-vez.md) pasa al `SessionId` de la cola.

**🔨 Rómpelo: sin daemon, ¿quién rearma?** Deja tu servicio como quedaría en una Function: en tu `AgregarEmpresas`, las tres proyecciones `Inline`, y en tu `Program.cs`, `DaemonMode.Disabled`, el papel de tu worker. Pon `await Vistas.Rearmar(app, "Tablero");` antes de `app.Run()` y arranca: lanza `No service for type 'JasperFx.Events.Daemon.IProjectionCoordinator' has been registered`. Tu orden pausa el daemon del servicio, y este host no tiene ninguno. Haz que sirva sin él. En `Vistas.Rearmar`, pide el coordinador con `GetService`: si el servicio no está registrado, devuelve `null` en vez de lanzar. Pausa, y reanuda en el `finally`, solo si no es `null`.

Arranca otra vez: el tablero se rearma, porque el daemon armado a demanda de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md) no necesita el del servicio. Quita la llamada y suspende emp-45: su ficha dice `efectiva`, sin ningún daemon que la proyecte. Su `X-Rezago` no vuelve a 0: tu `Rezago` resta el progreso que guarda el daemon, y una vista `Inline` no lo lleva.

En serverless con todo `Inline`, cada escritura deja la vista al día. Pero una vista se rearma alguna vez, cuando cambias un `Apply` o la forma del documento. En una Function no hay un arranque que corra tu orden: corre aparte, como un trabajo que alguien tiene que prever. Tres servicios de la organización son todo `Inline` y no tienen dónde rearmar.

Lo contrario también pasa. Vuelve a poner `DaemonMode.HotCold`, con las tres `Inline`, y arranca: el log ya no dice `Started projection agent`, la línea con que el daemon empieza cada vista `Async`. Ese daemon no tiene nada que correr, y quien lee `HotCold` busca una vista `Async` que no existe. Otros tres servicios lo registran así, copiado de una plantilla. Donde no hay ninguna vista `Async`, el host va con `DaemonMode.Disabled`.

Vuelve a poner las dos `Async`, rearma las dos con tu orden, y quita las dos llamadas. Mientras fueron `Inline`, el daemon no movió su progreso: al volver, aplicaría otra vez los hechos de emp-45 encima de su documento, y su `Suspensiones` sumaría 2. Deja en `DECISIONES.md` una línea por vista `Inline`: quién la rearma y cómo.

> ⚠️ **Fuera de un handler, `SendInline` envía antes de guardar.** Dentro de un handler de Wolverine, el commit va primero. Un endpoint o una librería que llama `bus.PublishAsync(...)` y guarda después no tiene ese orden: con `SendInline`, el mensaje sale en el `PublishAsync`, y si el guardado falla, el broker ya tiene el anuncio de un hecho que no existe, el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md). Antes de adoptar un paquete con `SendInline`, mira dónde publica. Con la bandeja o con `SendInline`, el consumidor sigue siendo el de [Llegó dos veces](./llego-dos-veces.md): el broker entrega al menos una vez.

> 🏷️ **El resto es criterio.** Serverless real necesita la nube, con Azure Functions y Azure Service Bus como broker: no lo montas aquí, lo reconoces. Los proyectos del **Application Plane** corren justo así, y ahí `Inline` + `SendInline` son la forma de vivir sin un host de larga vida.

## El Descubrimiento

La entrega no es una sola forma. Los mismos hechos alimentan una UI que se actualiza sola (SSE: el servidor empuja por un canal) y una función serverless que despierta, trabaja y muere. La pantalla se entera de lo **confirmado**, con un contrato tipado de `Contratos` que publica el dueño del proceso, y el empuje sale del handler de ese contrato, nunca de una proyección. El daemon y el outbox asumen un **host de larga vida**. Serverless los cambia por proyecciones `Inline`, que alguien tiene que prever cómo rearmar, y por `SendInline`, que **pierde la atomicidad** del outbox. Elegir entre las dos formas es una decisión de **despliegue**, y saber qué consistencia y qué durabilidad gana o pierde cada una es el oficio.

> 🌱 Todo lo que has hecho asume una sola organización. Pero la plataforma la usan **varias** a la vez, y cada petición tiene que decir **de cuál** es. Si el sistema no lo sabe, o lo rellena con un valor por defecto, el hecho de una organización termina donde otra lo ve, o donde nadie lo ve, sin un solo error. De cuál organización es cada petición, y cómo el sistema lo exige en vez de adivinarlo, es el próximo dolor: [El contexto que falta](./el-contexto-que-falta.md).

## ✅ Compruébalo

- [ ] El endpoint SSE responde `content-type: text/event-stream` y, abierto con `curl -N`, empuja cada aviso sin que el cliente vuelva a pedir.
- [ ] Escuchando `EmpresaSuspendidaV2`, la pantalla avisó «suspendida» de emp-40, que terminó `revertida`; escuchando `SuspensionEfectivaV1`, solo avisa las efectivas.
- [ ] Con el empuje en el `Apply` del tablero, el rearme repitió cada suspensión efectiva sin que nadie suspendiera.
- [ ] Con el literal renombrado, los dos programas compilaron y la pantalla dejó de mostrar; con la constante y el record en `Contratos`, renombrar un campo no compila.
- [ ] En un host sin daemon, tu orden lanzó hasta pedir el coordinador con `GetService`, y luego rearmó el tablero; con todo `Inline` el host va con `DaemonMode.Disabled`, y `DECISIONES.md` dice quién rearma cada vista `Inline`.
- [ ] Sabes decir qué reemplaza al outbox de fondo en serverless (`SendInline`), qué se pierde (la atomicidad), cuándo envía antes de guardar (fuera de un handler) y dónde es la forma normal (el Application Plane).

## 🆘 Si algo salió mal

- **El navegador no recibe eventos en vivo:** el endpoint no devuelve `text/event-stream` (usa `TypedResults.ServerSentEvents`), o un proxy buffea; prueba con `curl -N`. Y confirma que el productor escribe al mismo `EnVivo.Canal` que el iterador lee.
- **El SSE no emite nada, o solo algunos avisos:** mira la ficha de la empresa: con `esperando` o `revertida` no hay aviso. Si dice `efectiva`, a `ProcesoDeSuspensionHandler` le falta devolver `SuspensionEfectivaV1`, o a `EnVivoHandler` escucharlo. Si llegan solo algunos, hay otro lector abierto: el canal le da cada aviso a uno solo.
- **`ProcesoDeSuspensionHandler` no compila tras el cambio:** el retorno es `Task<OutgoingMessages>` en `Decidir` y en los cinco `Handle`; `OutgoingMessages` viene de `using Wolverine;`.
- **`SseParser` no compila:** falta `using System.Net.ServerSentEvents;`. `JsonSerializer` viene de `using System.Text.Json;`.

## 📓 Registra tu avance

> 💭 **Reto:** ¿por qué la pantalla escucha `SuspensionEfectivaV1` y no `EmpresaSuspendidaV2`, y por qué el empuje no va en el `Apply` del tablero? En serverless, ¿qué se pierde con `SendInline`, y quién rearma una vista `Inline` si no hay daemon?

```bash
git add .
git commit -m "ES · En vivo y serverless (SSE de lo confirmado, contrato tipado, Inline sin daemon, SendInline)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Los mismos hechos se entregan de formas distintas: **SSE** le avisa a la UI lo **confirmado**, con un **contrato tipado** y desde el handler de ese contrato, nunca desde un `Apply`; **serverless** cambia el daemon por proyecciones `Inline`, que nadie rearma si no lo prevés, y el outbox por `SendInline`, que **pierde la atomicidad**; elegir es criterio de despliegue.

---

[⬅️ Volver: Lo que el broker no promete](./lo-que-el-broker-no-promete.md)

[➡️ Siguiente: El contexto que falta](./el-contexto-que-falta.md)
