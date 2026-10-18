# El host y la inyección

Desde [El outbox](./el-outbox.md) vienes armando `AddMarten(...)`, `AddWolverine(...)` y `AddAsyncDaemon(...)` en un host de consola que arrancas para probar.

## 🎯 El Objetivo

Montar el **host de servicio** —una API web (ASP.NET Core)— que recibe comandos por HTTP y arma y entrega las piezas por **inyección de dependencias**, cerrando el "infierno de los `new`" que sembraste en [El despachador](./el-despachador.md).

## 💥 El dolor: un servicio de verdad no se dispara desde un script

El "infierno de los `new`" (`new SuspenderHandler(store, vista)` + `despachador.Registrar(...)`) **ya lo pagó Wolverine** en [El outbox](./el-outbox.md): tus handlers se volvieron `static`, se descubren por convención, y la `IDocumentSession` ya te la inyectan.

Lo que **sigue a medias** es cómo entra el comando. Hasta ahora lo disparabas desde una línea de script:

```csharp
var bus = host.Services.GetRequiredService<IMessageBus>();     // sacar el bus a mano del host
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));   // y llamarlo desde tu código
```

Eso sirve para un spike, no para un servicio: operaciones no ejecuta tu `Program.cs`, manda un `POST`. Falta el **host web** que reciba esa petición y arme por dentro la cadena `endpoint → bus → handler → sesión`, con una **sesión fresca por cada comando**.

## 🔧 Un host web que inyecta las piezas

Un **host web** con un **contenedor de inyección de dependencias** hace ese cableado: registras cada pieza una vez, y cuando un endpoint necesita algo (`IMessageBus`, `IDocumentSession`), el contenedor lo **entrega** con el alcance correcto.

> 🆕 **ASP.NET Core minimal API + inyección de dependencias.** `WebApplication.CreateBuilder(args)` arma un host **web**, en lugar del `Host.CreateApplicationBuilder` de consola. No crees otro proyecto: es el mismo `Empresas.Historia`, con el host en su `Program.cs`; en `Empresas.Historia.csproj` cambia `Sdk="Microsoft.NET.Sdk"` por `Sdk="Microsoft.NET.Sdk.Web"`. `app.MapPost("/ruta/{id}", (…) => …)` publica un endpoint: en su lambda, el `{id}` de la ruta se enlaza al parámetro `string id`, y **cualquier otro parámetro** (`IMessageBus bus`) lo resuelve el **contenedor**. `Results.Ok()` responde HTTP 200. `app.Run()` levanta el servidor y lo deja **vivo**, y con él el daemon y el despachador de Wolverine, que son servicios hospedados.

> 🆕 **Una `IDocumentSession` es una unidad de trabajo, y por eso va una por operación.** No es una conexión que compartes: acumula los cambios sin confirmar de **una** operación, tiene su *identity map* y **no es segura entre hilos**. El contenedor la registra *scoped*: un endpoint que la pida recibe una **fresca por petición**, que se cierra al responder. Tu handler recibe otra: Wolverine le abre **una por cada mensaje** y la cierra al terminar. Ninguna es un *singleton* compartido entre operaciones.

> 🛠️ **Inténtalo tú.** Quiero llamar el endpoint y que el hecho quede en el diario, sin escribir un solo `new`:
>
> ```
> POST /empresas/emp-10/suspender   →   EmpresaSuspendida en el diario
> ```
>
> Haz que funcione: (1) monta el host con `WebApplication.CreateBuilder(args)`, ahora en su sitio de verdad, y pásale tu `AddMarten` y tu `AddWolverine` sin perder ninguna línea: tu `Hechos.Registrar`, las tres proyecciones con su porqué al lado, la línea de `Metadata` de `EmpresaDetalle`, los dos `IncludeAssembly` (Facturacion y Accesos), `MultipleHandlerBehavior.Separated`, tus dos políticas `OnException` (el choque y el timeout) y el `ScheduledJobPollingTime`. Sin el `IncludeAssembly` de Accesos, nadie atiende `RevocarAccesosV1` y ninguna suspensión queda efectiva. Los pasos de [El tablero cruza streams](./el-tablero-cruza-streams.md) salen de tu `Program.cs`: desde aquí, los comandos entran por el endpoint. Conserva la lectura de `CADENA_POSTGRES` y tu método `Sembrar`. (2) Añade un `app.MapPost("/empresas/{id}/suspender", ...)` cuya lambda reciba `IMessageBus bus` (el contenedor lo inyecta) y haga `bus.InvokeAsync(...)`. (3) No toques tu `SuspenderHandler`: ya recibe la `IDocumentSession` por parámetro, sin `new`. Lo nuevo es quién lo invoca: el endpoint, a través del `IMessageBus`. (4) Siembra una empresa activa, `emp-10` (abajo), llama el endpoint con `curl` y verifica el hecho con una consulta SQL sobre `mt_events`.

La siembra hace falta porque tu handler no abre un segundo proceso: con una empresa que ya tiene uno abierto, el diario no cambia. `emp-10` nace activa y con su `Localizador`, por `Sembrar`. Ponla en tu `Program.cs`, entre `var app = builder.Build();` y `app.Run();`: lo que va después de `app.Run()` no corre mientras el servidor atiende. Bórrala tras el primer arranque: en el siguiente, `emp-10` ya existe.

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run(): una sola vez
var store = app.Services.GetRequiredService<IDocumentStore>();
await using (var s = store.LightweightSession())
{
    Sembrar(s, "emp-10", "901000000", "Transportes Sabana", "Premium");
    await s.SaveChangesAsync();
}
```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs (Empresas.Historia.csproj con Sdk Microsoft.NET.Sdk.Web)
var cadena = Environment.GetEnvironmentVariable("CADENA_POSTGRES")
    ?? throw new InvalidOperationException("Falta la variable de entorno CADENA_POSTGRES.");   // la misma línea de Todo o nada
var builder = WebApplication.CreateBuilder(args);   // host WEB

// AddMarten y AddWolverine: los de tu host de consola, sin perder ninguna línea
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    Hechos.Registrar(opts);                                                        // §31
    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);       // Async: solo la mira soporte; sin AddAsyncDaemon no avanza, y no avisa
    opts.Projections.Add<EmpresaDetalleProjection>(ProjectionLifecycle.Inline);   // Inline: Facturación cobra con su respuesta; en Async cobra el plan viejo
    opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);           // Async: la pantalla de soporte tolera ir un instante atrás
    opts.Schema.For<EmpresaDetalle>().Metadata(m => m.Revision.MapTo(d => d.Version));   // la versión de la vista Inline, desde mt_version
})
.UseLightweightSessions()
.IntegrateWithWolverine()          // el outbox de §32
.AddAsyncDaemon(DaemonMode.Solo);  // el daemon de §40

builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();
    opts.Policies.UseDurableLocalQueues();   // el outbox durable de §32
    // los handlers de los socios: Wolverine solo busca en el ensamblado que arranca el host
    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);
    opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);       // §36
    opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;      // §36
    opts.OnException<JasperFx.ConcurrencyException>()                      // §37: la clase base, con el nombre completo
        .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());
    opts.OnException<TimeoutException>()                                   // §38: lo pasajero se reintenta
        .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());
    opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();          // §38
    // si conservas el orden por llave de §37, también va aquí
});
// + paquete WolverineFx.RuntimeCompilation

var app = builder.Build();

// aquí, antes de app.Run(), va la siembra de emp-10 (solo el primer arranque)
// y en cualquier parte del archivo, tu método Sembrar de §31

// el endpoint: {id} viene de la ruta; IMessageBus lo inyecta el contenedor. Es tu despachador.Enviar, ahora por HTTP.
app.MapPost("/empresas/{id}/suspender", async (string id, IMessageBus bus) =>
{
    await bus.InvokeAsync(new SuspenderEmpresa(id, "mora"));
    return Results.Ok();
});

app.Run();   // levanta el servidor y lo deja vivo (con el daemon + Wolverine corriendo dentro)
```

Tu `SuspenderHandler` no aparece aquí porque no cambia.

Llámalo, con el servidor corriendo:

```bash
curl -X POST http://localhost:5000/empresas/emp-10/suspender      # → 200
```

Y verifícalo en el diario:

```sql
SELECT stream_id, version, type FROM mt_events WHERE stream_id = 'emp-10' ORDER BY version;
-- emp-10 | 1 | empresa_registrada
-- emp-10 | 2 | empresa_suspendida
```

El contenedor le da al endpoint el `IMessageBus`, y Wolverine le abre al handler la sesión de ese mensaje: sin un solo `new EventStore(...)` ni `despachador.Registrar(...)`.

</details>

> 🛠️ **Inténtalo tú.** Que soporte pregunte, también por HTTP, qué empresas están suspendidas:
>
> ```bash
> curl http://localhost:5000/empresas/suspendidas      # → ["emp-10", …]
> ```
>
> Sale emp-10, y las demás suspendidas de tu base. Añade un `app.MapGet("/empresas/suspendidas", ...)` cuya lambda pida una `IQuerySession` (la sesión de Marten que solo lee, de [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md)); con ella, consulta `VistaSuspendida` y devuelve los `Id` de las que tienen `Suspendida`. El endpoint responde la lista como JSON. Es el lector que le faltaba a `VistaSuspendida` desde [El tablero cruza streams](./el-tablero-cruza-streams.md).

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// el endpoint de lectura: la IQuerySession la da el contenedor, una fresca por petición
app.MapGet("/empresas/suspendidas", async (IQuerySession session) =>
    await session.Query<VistaSuspendida>().Where(v => v.Suspendida).Select(v => v.Id).ToListAsync());
```

Si emp-10 no sale justo después de suspenderla, el daemon va atrás: la vista es `Async`. Repite en un segundo.

</details>

## 🔨 Rómpelo: el `new` que no está, la sesión que no es tuya, y el reset que viaja · no lo saltes

[La configuración viene de afuera](./la-configuracion-viene-de-afuera.md) parte de lo que dejas aquí: el entorno del host (`ASPNETCORE_ENVIRONMENT` e `IsDevelopment()`) y tu `PermitirReset`.

**El `new` ausente:** repasa el flujo endpoint → handler → sesión → diario y cuenta los `new` de cableado que escribiste: **cero**. Agrega otra dependencia al handler (un logger, `ILogger`): la declaras como parámetro y el contenedor la inyecta — sin tocar ningún sitio de registro. Quítala al terminar: tu test de suspender llama al handler sin ella.

**La sesión que no se comparte:** en tu `SuspenderHandler`, guarda en un campo `static` la primera `IDocumentSession` que recibas y úsala en las llamadas siguientes. Siembra dos empresas activas más, como `emp-10`: `Sembrar(s, "emp-15", "901500000", "Panadería Oriente", "Basico")` y `Sembrar(s, "emp-16", "901600000", "Lavandería Sur", "Basico")`. El plan tiene que ser uno de los de tu tarifa en Facturación; si no, el cobro lanza `KeyNotFoundException`. Suspéndelas por el endpoint, una tras otra, y espera unos segundos a que venza el plazo.

Las dos responden 200 y `multas` tiene una fila por cada una. Pero en `mt_events` solo entra la suspensión de emp-15: emp-16 se queda en `empresa_registrada`, y su proceso, `susp-emp-16-2`, no existe. Es el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), un cobro sin su hecho, y el error llega después, lejos de la causa: las respuestas de los dos socios, y luego el plazo, buscan un proceso que no existe. `ProcesoDeSuspensionHandler` lanza `InvalidOperationException` en `Decidir` (`No existe la suspensión susp-emp-16-2`), y los tres mensajes caen en dead letters.

```sql
SELECT message_type, exception_type FROM wolverine_dead_letters ORDER BY sent_at DESC LIMIT 3;
-- facturacion.multa-cobrada.v2 | System.InvalidOperationException
-- accesos.accesos-revocados.v2 | System.InvalidOperationException
-- RevisarSuspension            | System.InvalidOperationException
-- (el orden puede variar)
```

La sesión guardada era la del primer mensaje, y Wolverine la cerró al terminarlo. En cada mensaje nuevo, Wolverine llama `SaveChangesAsync` sobre la sesión que él abrió, y esa no lleva tu `Append` ni tu `StartStream`. Los pedidos sí salen: los devolviste, y Wolverine los guarda en su propia sesión. Al terminar, quita el campo `static`.

**La sesión propia:** la otra forma de no usar la sesión del mensaje es abrir una tú, como hacen varios proyectos de la organización para guardar cuando el handler decide. En tu `SuspenderHandler`, cambia el parámetro `IDocumentSession session` por `IDocumentStore store`, y abre la tuya con `await using var session = store.LightweightSession();`. Sin `SaveChangesAsync`, es el mismo fantasma: los pedidos salen y los hechos no. Ponle tu propio `await session.SaveChangesAsync();` antes del `return`, y después de esa línea simula una falla tardía: `throw new InvalidOperationException("falla después de guardar");`. Siembra `emp-39` como las otras, con `Sembrar(s, "emp-39", "903900000", "Papelería Andina", "Basico")`, y suspéndela por el endpoint:

```bash
curl -X POST http://localhost:5000/empresas/emp-39/suspender      # → 500
```

```sql
SELECT stream_id, version, type FROM mt_events WHERE stream_id IN ('emp-39', 'susp-emp-39-2') ORDER BY seq_id;
-- emp-39        | 1 | empresa_registrada
-- emp-39        | 2 | empresa_suspendida
-- susp-emp-39-2 | 1 | suspension_solicitada
```

La petición falló, pero los hechos quedaron: tu `SaveChangesAsync` los confirmó en su propia transacción. Los pedidos no salieron, porque Wolverine los envía cuando el handler devuelve, y el handler lanzó antes. `multas` no tiene fila para `903900000`, y el tablero dice `esperando` para siempre. Ahora vuelve a recibir la sesión por parámetro, sin tu `SaveChangesAsync`, y deja la falla. Suspende emp-16, que sigue activa: también da 500, y su diario se queda en `empresa_registrada`. El hecho y sus pedidos van en una sola transacción, la del mensaje, y caen juntos. Quita la falla: un handler usa la sesión que le da Wolverine, nunca una que abra él.

> 🆕 **El entorno y la configuración del host.** `app.Environment.EnvironmentName` dice en qué entorno corre el host. Lo toma de la variable `ASPNETCORE_ENVIRONMENT` y, si no está, vale `Production`. `app.Environment.IsDevelopment()` pregunta si es `Development`. `app.Configuration.GetValue<bool>("PermitirReset")` lee un valor de la configuración del host, que también sale de una variable de entorno con ese nombre; si no existe, da `false`.

**El reset que viaja a producción:** borrar la siembra tras cada arranque cansa, y la tentación es un endpoint que deje la base limpia. Pruébalo en una base desechable, no en la tuya, porque va a borrar. Crea otra (`CREATE DATABASE empresas_reset;`) con las dos tablas de Facturación, `procesados` y `multas`, como en [Llegó dos veces](./llego-dos-veces.md) y [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md), y `multas` con su columna `suspension_id` de [El proceso tiene dueño](./el-proceso-tiene-dueno.md), y apunta a ella tu `CADENA_POSTGRES` mientras dure este 🔨. Marten crea sus tablas al arrancar. Siembra ahí emp-10 y suspéndela por el endpoint, como en el reto. Agrega el endpoint, sin guarda:

```csharp
// Empresas.Historia/Program.cs, antes de app.Run(): solo para el 🔨
app.MapPost("/dev/reset", async (IDocumentStore store) =>
{
    await store.Advanced.Clean.DeleteAllEventDataAsync();   // vacía mt_events y mt_streams
    return Results.Ok();
});
```

Llámalo con `curl -X POST http://localhost:5000/dev/reset` (→ 200), y mira la base:

```sql
SELECT count(*) FROM mt_events;                                   -- 0
SELECT id, data->>'Estado', data->>'Suspension' FROM mt_doc_tablero;
-- emp-10 | efectiva | susp-emp-10-2      (un proceso que ya no existe)
SELECT count(*) FROM mt_doc_localizador;                          -- 1: el NIT sigue reservado
```

Vuelve a poner la siembra de emp-10 y arranca: el arranque lanza `DocumentAlreadyExistsException`, porque su NIT sigue en el localizador. Quita la siembra otra vez. La base no quedó limpia: quedó incoherente. Y el log del arranque dice `Hosting environment: Production`: tu endpoint de desarrollo corría en producción, y un POST sin usuario ni contraseña borra la historia de todas las empresas, sin de dónde recuperarla. Cinco servicios de la organización tienen hoy un endpoint así en su binario de producción.

La cura tiene tres partes. **Que no viaje:** el endpoint se registra solo en desarrollo, y solo si lo prendes en la configuración. `Development` no basta: lo fija una variable olvidada en un servidor, o un `launchSettings.json`. El valor de configuración obliga a pedirlo a propósito.

```csharp
// lo de desarrollo, solo en desarrollo y solo si lo prendes
if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("PermitirReset"))
{
    app.MapPost("/dev/reset", async (IServiceProvider servicios) =>
    {
        await servicios.ResetAllMartenDataAsync();   // hechos y documentos juntos; pausa el daemon mientras borra
        return Results.Ok();
    });
}
```

Con `dotnet run`, el `curl` del reset responde 404. Con `ASPNETCORE_ENVIRONMENT=Development dotnet run`, también 404. Solo con `ASPNETCORE_ENVIRONMENT=Development PermitirReset=true dotnet run` responde 200 (en PowerShell: `$env:ASPNETCORE_ENVIRONMENT="Development"; $env:PermitirReset="true"; dotnet run`, y las variables quedan puestas en esa terminal). Deja vacíos a la vez `mt_events`, el tablero y el localizador, y la siembra de emp-10 vuelve a entrar: en una base de desarrollo, borrarlo todo está bien. En un entorno compartido, además, va detrás de autorización; tu servicio todavía no autentica a nadie. **Rearmar no es borrar:** para rearmar el tablero basta tu orden de [Reconstruir con el daemon](./reconstruir-con-el-daemon.md), `Vistas.Rearmar`, que rejuega el diario sin tocarlo. El diario no se rearma desde nada: borrarlo para arreglar una vista es perderlo. **Que no haga falta:** para empezar limpio en tu máquina, usa una base desechable, como en este 🔨. Para retirar una empresa de prueba de una base compartida, `session.Events.ArchiveStream(id)` la archiva: sus hechos siguen en `mt_events`, marcados, y Marten deja de cargarla (`AggregateStreamAsync` devuelve `null`). Deja el endpoint con su guarda, o bórralo si no lo usas, y devuelve tu `CADENA_POSTGRES` a tu base.

## El Descubrimiento

El "infierno de los `new`" de [El despachador](./el-despachador.md) se pagó en dos tiempos: Wolverine se llevó el cableado de handlers en [El outbox](./el-outbox.md), y aquí el **contenedor de inyección de dependencias** cierra lo que faltaba: provee las piezas con el **alcance** correcto y conecta una petición HTTP con tu dominio. Queda una sesión por operación, sea una petición o un mensaje, nunca compartida y nunca abierta por el handler: esa parte en dos transacciones lo que debía ser una. Marten y Wolverine pedían un host porque el daemon y el despachador de Wolverine son **servicios hospedados** que necesitan un proceso vivo (`app.Run()`). Y un host web sabe en qué entorno corre: lo de desarrollo se registra solo en desarrollo, y un servicio desplegado no borra su diario.

> 🌱 Tu host sabe en qué entorno corre, pero lo que cambia de un entorno a otro sigue en el código. El plazo de la suspensión es un `5.Seconds()` fijo, y la cadena sale de una variable que lees a mano: un despliegue con Docker Swarm entrega sus secretos como archivos. Lo sacas del código en [La configuración viene de afuera](./la-configuracion-viene-de-afuera.md).

## ✅ Compruébalo

- [ ] Un `POST` para `emp-10` despacha el comando por `IMessageBus` (inyectado) y `empresa_suspendida` aparece en `mt_events`, con tu `SuspenderHandler` tal como lo tenías: sin `new` ni registro a mano.
- [ ] El handler recibe por parámetro una `IDocumentSession` nueva en cada mensaje; sabes por qué va una por operación y qué se rompe si la guardas en un campo `static`.
- [ ] `GET /empresas/suspendidas` lee `VistaSuspendida` con la `IQuerySession` que el contenedor le da a cada petición.
- [ ] Con una sesión propia y su `SaveChangesAsync`, viste los hechos guardados sin sus pedidos tras un 500; con la sesión del mensaje, la misma falla no deja nada.
- [ ] Viste el `/dev/reset` sin guarda vaciar `mt_events` en un host que corría en `Production`, y dejar el tablero y el localizador apuntando a nada.
- [ ] Tu reset responde 404 en Production y en Development sin `PermitirReset`; sabes por qué rearmar una vista no pide borrar el diario.
- [ ] El daemon (§40) y el outbox (§32) corren dentro del mismo host web mientras `app.Run()` lo mantiene vivo.

## 🆘 Si algo salió mal

- **El endpoint no recibe `IMessageBus`:** falta `AddWolverine(...)`, o no declaraste el parámetro en la lambda del `MapPost`. El contenedor solo inyecta lo registrado.
- **`WebApplication` no existe / no compila:** `Empresas.Historia.csproj` debe usar el SDK `Microsoft.NET.Sdk.Web`; el de consola no trae ASP.NET Core.
- **El `POST` responde 200 pero el diario no cambia:** esa empresa ya tiene un proceso abierto. Usa una empresa activa, como `emp-10`.
- **El log dice `Hosting environment: Development` sin que lo pidas:** tu editor creó un `Properties/launchSettings.json` que lo fija. En un servidor ese archivo no existe.
- **El daemon o el outbox no corren:** el host debe seguir vivo (`app.Run()`); si el proceso termina, mueren con él.

## 📓 Registra tu avance

> 💭 **Reto:** ¿qué parte del "infierno de los `new`" pagó Wolverine en §32 y qué parte cierra el host web + DI aquí? Y: ¿por qué tu handler recibe una `IDocumentSession` nueva en cada mensaje, y qué pasa si la guardas para reusarla?

```bash
git add .
git commit -m "ES · El host y la inyección (entrada HTTP + DI + una sesión por operación)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Wolverine ya se llevó el cableado de handlers en §32; el host web y la inyección de dependencias cierran el resto: reciben el comando por HTTP, dan una `IDocumentSession` por operación (una por petición, una por mensaje, nunca compartida ni abierta por el handler) y mantienen vivo (`app.Run()`) el proceso del daemon y de Wolverine; y lo de desarrollo, como un reset, se registra solo en desarrollo y con un valor que lo prende.

---

[⬅️ Volver: El tablero cruza streams](./el-tablero-cruza-streams.md)

[➡️ Siguiente: La configuración viene de afuera](./la-configuracion-viene-de-afuera.md)
