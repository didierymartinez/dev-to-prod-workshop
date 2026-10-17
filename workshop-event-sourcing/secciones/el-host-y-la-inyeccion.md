# El host y la inyección

Desde [El outbox](./el-outbox.md) vienes escribiendo `builder.Services.AddMarten(...)`, `AddWolverine(...)`, `AddAsyncDaemon(...)` en un host "mínimo" que arrancabas para probar. Pero un comando aún entra por una **línea de script**, no desde afuera. Un servicio de verdad recibe peticiones.

## 🎯 El Objetivo

Montar el **host de servicio** —una API web (ASP.NET Core)— que recibe comandos por HTTP y arma y entrega las piezas por **inyección de dependencias**, cerrando el "infierno de los `new`" que sembraste en [El despachador](./el-despachador.md).

## 💥 El dolor: un servicio de verdad no se dispara desde un script

Ojo, no es el dolor que quizá esperas. El "infierno de los `new`" —`new SuspenderHandler(store, vista)` + `despachador.Registrar(...)`— **ya lo pagó Wolverine** en [El outbox](./el-outbox.md): tus handlers se volvieron `static`, se descubren por convención, y la `IDocumentSession` **ya** te la inyectan. La convención de Wolverine es, en el fondo, una forma de inyección de dependencias. Eso está resuelto.

Lo que **sigue a medias** es cómo entra el comando. Hasta ahora lo disparabas desde una línea de script:

```csharp
var bus = host.Services.GetRequiredService<IMessageBus>();     // sacar el bus a mano del host
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));   // y llamarlo desde tu código
```

Eso sirve para un spike, no para un servicio: operaciones no ejecuta tu `Program.cs`, manda un `POST`. Falta el **host web** que reciba esa petición y, por dentro, arme la cadena `endpoint → bus → handler → sesión` — con una **sesión fresca por cada comando**, abierta y cerrada bien. Ese cableado por petición, a mano, no escala.

## 🔧 Un host web que inyecta las piezas

Un **host web** con un **contenedor de inyección de dependencias** hace ese cableado: registras cada pieza una vez, y cuando un endpoint necesita algo (`IMessageBus`, `IDocumentSession`), el contenedor lo **entrega** con el alcance correcto.

> 🆕 **ASP.NET Core minimal API + inyección de dependencias.** `WebApplication.CreateBuilder(args)` arma un host **web** (reemplaza el `Host.CreateApplicationBuilder` de consola que usabas). No crees otro proyecto: es el mismo `Empresas.Historia`, ahora web. En `Empresas.Historia.csproj` cambia `Sdk="Microsoft.NET.Sdk"` por `Sdk="Microsoft.NET.Sdk.Web"`. El host sigue en su `Program.cs`. `app.MapPost("/ruta/{id}", (…) => …)` publica un endpoint. En su lambda, el `{id}` de la ruta se enlaza al parámetro `string id`, y **cualquier otro parámetro** (`IMessageBus bus`) lo resuelve el **contenedor** — así distingue "viene de la URL" de "lo provee la DI". `Results.Ok()` responde HTTP 200. `app.Run()` levanta el servidor y lo deja **vivo** (por eso el daemon y el despachador de Wolverine, que son servicios hospedados, siguen corriendo).

> 🆕 **Una `IDocumentSession` es una unidad de trabajo, y por eso va una por operación.** No es una conexión que compartes: acumula los cambios sin confirmar de **una** operación, tiene su *identity map*, y **no es segura entre hilos**. El contenedor la registra *scoped*: un endpoint que la pida recibe una **fresca por petición**, que se cierra al responder. Tu handler no recibe esa: Wolverine le abre **una propia por cada mensaje** que trata, y la cierra al terminar. Ninguna de las dos es un *singleton* compartido entre operaciones concurrentes.

> 🛠️ **Inténtalo tú.** Quiero llamar el endpoint y que el hecho quede en el diario, sin escribir un solo `new`:
>
> ```
> POST /empresas/emp-10/suspender   →   EmpresaSuspendida en el diario
> ```
>
> Haz que funcione: (1) monta el host con `WebApplication.CreateBuilder(args)`, ahora en su sitio de verdad, y pásale tu `AddMarten` y tu `AddWolverine` sin perder ninguna línea: las dos proyecciones, los dos `IncludeAssembly` (Facturacion y Accesos), `MultipleHandlerBehavior.Separated`, tu política `OnException` y el `ScheduledJobPollingTime`. Sin el `IncludeAssembly` de Accesos, nadie atiende `RevocarAccesosV1` y ninguna suspensión queda efectiva. Los pasos de [El tablero cruza streams](./el-tablero-cruza-streams.md) salen de tu `Program.cs`: desde aquí, los comandos entran por el endpoint. Conserva la línea `Localizador.cadena = cadena;` de [El outbox](./el-outbox.md): tu handler la usa en `NitDe`. (2) Añade un `app.MapPost("/empresas/{id}/suspender", ...)` cuya lambda reciba `IMessageBus bus` (el contenedor lo inyecta) y haga `bus.InvokeAsync(...)`. (3) No toques tu `SuspenderHandler`: ya recibe la `IDocumentSession` por parámetro, sin `new`. Lo nuevo es quién lo invoca: el endpoint, a través del `IMessageBus`. (4) Siembra una empresa activa, `emp-10` (abajo), llama el endpoint con `curl` y verifica el hecho con una consulta SQL sobre `mt_events`.

La siembra hace falta porque tu handler no suspende dos veces: con una empresa ya suspendida, el diario no cambia. `emp-10` nace activa y con su fila en el localizador, como en [El contrato lleva lo justo](./el-contrato-lleva-lo-justo.md). Pon la siembra en tu `Program.cs`, entre `var app = builder.Build();` y `app.Run();`. Lo que va después de `app.Run()` no corre mientras el servidor atiende. Bórrala tras el primer arranque: en el siguiente, `emp-10` ya existe.

```csharp
// Empresas.Historia/Program.cs, entre var app = builder.Build(); y app.Run(): una sola vez
var store = app.Services.GetRequiredService<IDocumentStore>();
await using (var s = store.LightweightSession())
{
    s.Events.StartStream<Empresa>("emp-10", new EmpresaRegistrada("901000000", "Transportes Sabana", "Premium"));
    await s.SaveChangesAsync();
}
```

```sql
INSERT INTO localizador(nit, stream) VALUES ('901000000', 'emp-10');
```

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
// Empresas.Historia/Program.cs (Empresas.Historia.csproj con Sdk Microsoft.NET.Sdk.Web)
Localizador.cadena = cadena;   // sigue aquí: tu handler la usa en Localizador.NitDe
var builder = WebApplication.CreateBuilder(args);   // host WEB

// AddMarten y AddWolverine: los de tu host de consola, sin perder ninguna línea
builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);   // §37
    opts.Projections.Add<TableroProjection>(ProjectionLifecycle.Async);       // §38
})
.UseLightweightSessions()
.IntegrateWithWolverine()          // el outbox de §30
.AddAsyncDaemon(DaemonMode.Solo);  // el daemon de §37

builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();
    opts.Policies.UseDurableLocalQueues();   // el outbox durable de §30
    // los handlers de los socios: Wolverine solo busca en el ensamblado que arranca el host
    opts.Discovery.IncludeAssembly(typeof(FacturacionHandler).Assembly);
    opts.Discovery.IncludeAssembly(typeof(AccesosHandler).Assembly);       // §33
    opts.MultipleHandlerBehavior = MultipleHandlerBehavior.Separated;      // §33
    opts.OnException<EventStreamUnexpectedMaxEventIdException>()
        .RetryWithCooldown(50.Milliseconds(), 100.Milliseconds(), 250.Milliseconds());   // §34
    opts.Durability.ScheduledJobPollingTime = 500.Milliseconds();          // §35
    // si conservas el orden por llave de §34, también va aquí
});
// + paquete WolverineFx.RuntimeCompilation

var app = builder.Build();

// aquí, antes de app.Run(), va la siembra de emp-10 (solo el primer arranque)

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

Una petición entra y el contenedor le da al endpoint el `IMessageBus`. Wolverine le abre al handler la sesión de ese mensaje. El hecho queda en el diario y el outbox despacha el anuncio. Sin un solo `new EventStore(...)` ni `despachador.Registrar(...)`. El daemon corre en el mismo host, en background.

</details>

## 🔨 Rómpelo: el `new` que no está, y la sesión que no se comparte

**El `new` ausente:** repasa el flujo endpoint → handler → sesión → diario y cuenta los `new` de cableado que escribiste: **cero**. Agrega otra dependencia al handler (un logger, `ILogger`): la declaras como parámetro y el contenedor la inyecta — sin tocar ningún sitio de registro.

**La sesión que no se comparte:** en tu `SuspenderHandler`, guarda en un campo `static` la primera `IDocumentSession` que recibas y úsala en las llamadas siguientes. Siembra dos empresas activas más, como `emp-10`: `emp-15` y `emp-16`, con NIT `901500000` y `901600000`. Suspéndelas por el endpoint, una tras otra, y espera unos segundos a que venza el plazo.

Las dos responden 200 y `multas` tiene una fila por cada una. Pero en `mt_events` solo entra la suspensión de emp-15: emp-16 se queda en `empresa_registrada`, y su proceso, `susp-emp-16-2`, no existe. La petición no da error: es el fantasma de [El hecho y su anuncio](./el-hecho-y-su-anuncio.md), un cobro sin su hecho. El error llega después, lejos de la causa. Las respuestas de los dos socios, y luego el plazo, buscan un proceso que no existe: `ProcesoDeSuspensionHandler` lanza `NullReferenceException` en `Decidir`, y los tres mensajes caen en dead letters.

```sql
SELECT message_type, exception_type FROM wolverine_dead_letters ORDER BY sent_at DESC LIMIT 3;
-- Contratos.MultaCobradaV2     | System.NullReferenceException
-- Contratos.AccesosRevocadosV2 | System.NullReferenceException
-- RevisarSuspension            | System.NullReferenceException
-- (el orden puede variar)
```

La sesión guardada era la del primer mensaje, y Wolverine la cerró al terminarlo. En cada mensaje nuevo, Wolverine llama `SaveChangesAsync` sobre la sesión que él abrió, y esa no lleva tu `Append` ni tu `StartStream`. Los pedidos sí salen: los devolviste, y Wolverine los guarda en su propia sesión. Una sesión es la unidad de trabajo de **una** operación: Wolverine abre una por mensaje, y el contenedor una por petición. Al terminar, quita el campo `static`.

## El Descubrimiento

El "infierno de los `new`" de [El despachador](./el-despachador.md) se pagó en dos tiempos: Wolverine se llevó el cableado de handlers en [El outbox](./el-outbox.md) (convención en vez de `new` + `Registrar`), y aquí el **contenedor de inyección de dependencias** cierra lo que faltaba — provee las piezas con el **alcance** correcto y conecta el mundo de afuera (una petición HTTP) con tu dominio. Junto con Wolverine, eso deja una sesión por operación, sea una petición o un mensaje, nunca compartida. Por eso Marten y Wolverine pedían "un host": el daemon y el despachador de Wolverine son **servicios hospedados** que necesitan un proceso vivo (`app.Run()`), y el contenedor arma todo lo demás alrededor. Tu `Program.cs` de consola con `new`s y un `Dictionary` de handlers es ahora un host web que reconoce las piezas por su tipo y las conecta solo.

> 🌱 Tu servicio ya recibe peticiones y despacha comandos. Pero una petición HTTP normal pregunta una vez y se va; ¿y una UI que quiere **enterarse sola** cuando algo cambia, sin recargar? ¿Y un mundo **serverless**, donde no hay un host que viva para siempre y el daemon o el outbox no aplican igual? Esas dos variantes de entrega son el próximo paso: [En vivo y serverless](./en-vivo-y-serverless.md).

## ✅ Compruébalo

- [ ] Un `POST` para `emp-10` despacha el comando por `IMessageBus` (inyectado) y `empresa_suspendida` aparece en `mt_events` — sin que construyas el handler con `new` ni lo registres a mano.
- [ ] Tu `SuspenderHandler` quedó tal como lo tenías; lo que cambió es quién lo invoca.
- [ ] El handler recibe por parámetro una `IDocumentSession` nueva en cada mensaje; sabes por qué va una por operación (unidad de trabajo, no segura entre hilos) y qué se rompe si la guardas en un campo `static`.
- [ ] El daemon (§37) y el outbox (§30) corren dentro del mismo host web mientras `app.Run()` lo mantiene vivo.
- [ ] Sabes qué pagó Wolverine en §30 (el cableado de handlers) y qué cierra §39 (la entrada HTTP + el alcance de las sesiones).

## 🆘 Si algo salió mal

- **El endpoint no recibe `IMessageBus`:** falta `AddWolverine(...)`, o no declaraste el parámetro en la lambda del `MapPost`. El contenedor solo inyecta lo registrado.
- **`WebApplication` no existe / no compila:** `Empresas.Historia.csproj` debe usar el SDK `Microsoft.NET.Sdk.Web`; el de consola no trae ASP.NET Core.
- **El `POST` responde 200 pero el diario no cambia:** esa empresa ya estaba suspendida, y tu handler no la suspende dos veces. Usa una empresa activa, como `emp-10`.
- **El `POST` responde 500 y el log dice `The ConnectionString property has not been initialized`:** se perdió `Localizador.cadena = cadena;` al pasar al host web. Tu handler la necesita para `Localizador.NitDe`.
- **El `POST` responde 200 y hay fila en `multas`, pero la suspensión no está en `mt_events`, y las respuestas caen en dead letters con `NullReferenceException`:** guardaste la `IDocumentSession` en un campo `static` y la reúsas. Esa sesión es la de un mensaje que ya terminó. Recíbela por parámetro en cada llamada: Wolverine abre una por mensaje.
- **El daemon o el outbox no corren:** el host debe seguir vivo (`app.Run()`); si el proceso termina, mueren con él.

## 📓 Registra tu avance

> 💭 **Reto:** ¿qué parte del "infierno de los `new`" pagó Wolverine en §30 y qué parte cierra el host web + DI aquí? Y: ¿por qué tu handler recibe una `IDocumentSession` nueva en cada mensaje, y qué pasa si la guardas para reusarla?

```bash
git add .
git commit -m "ES · El host y la inyección (entrada HTTP + DI + una sesión por operación)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Wolverine ya se llevó el cableado de handlers en §30; el host web (ASP.NET Core) + la inyección de dependencias cierran el resto —reciben el comando por HTTP y proveen las piezas con su alcance, una `IDocumentSession` por operación (una por petición al endpoint, una por mensaje al handler, nunca compartida)— y mantienen vivo (`app.Run()`) el proceso donde el daemon y el despachador de Wolverine son servicios hospedados.

---

[⬅️ Volver: El tablero cruza streams](./el-tablero-cruza-streams.md)

[➡️ Siguiente: En vivo y serverless](./en-vivo-y-serverless.md)
