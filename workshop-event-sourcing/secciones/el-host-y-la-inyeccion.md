# El host y la inyección

Desde [El swap por reconocimiento](./el-swap-por-reconocimiento.md) vienes escribiendo `builder.Services.AddMarten(...)`, `AddWolverine(...)`, `AddAsyncDaemon(...)` en un host "mínimo" que arrancabas para probar. Pero un comando aún entra por una **línea de script**, no desde afuera. Un servicio de verdad recibe peticiones.

## 🎯 El Objetivo

Montar el **host de servicio** —una API web (ASP.NET Core)— que recibe comandos por HTTP y arma y entrega las piezas por **inyección de dependencias**, cerrando el "infierno de los `new`" que sembraste en [El despachador](./el-despachador.md).

## 💥 El dolor: un servicio de verdad no se dispara desde un script

Ojo, no es el dolor que quizá esperas. El "infierno de los `new`" —`new SuspenderHandler(store, vista)` + `despachador.Registrar(...)`— **ya lo pagó Wolverine** en [El outbox](./el-outbox.md): tus handlers se volvieron `static`, se descubren por convención, y la `IDocumentSession` **ya** te la inyectan. La convención de Wolverine es, en el fondo, una forma de inyección de dependencias. Eso está resuelto.

Lo que **sigue a medias** es cómo entra el comando. Hasta ahora lo disparabas desde una línea de script:

```csharp
var bus = host.Services.GetRequiredService<IMessageBus>();     // sacar el bus a mano del host
await bus.InvokeAsync(new SuspenderEmpresa("emp-7", "mora"));   // y llamarlo desde tu código
```

Eso sirve para un spike, no para un servicio: operaciones no ejecuta tu `Program.cs`, manda un `POST`. Falta el **host web** que reciba esa petición y, por dentro, arme la cadena `endpoint → bus → handler → sesión` — con una **sesión fresca por petición**, abierta y cerrada bien. Ese cableado por petición, a mano, no escala.

## 🔧 Un host web que inyecta las piezas

Un **host web** con un **contenedor de inyección de dependencias** hace ese cableado: registras cada pieza una vez, y cuando un endpoint o un handler necesita algo (`IMessageBus`, `IDocumentSession`), el contenedor lo **entrega** —con el alcance correcto—.

> 🆕 **ASP.NET Core minimal API + inyección de dependencias.** `WebApplication.CreateBuilder(args)` arma un host **web** (reemplaza el `Host.CreateApplicationBuilder` de consola que usabas; es un proyecto web, SDK `Microsoft.NET.Sdk.Web`). `app.MapPost("/ruta/{id}", (…) => …)` publica un endpoint. En su lambda, el `{id}` de la ruta se enlaza al parámetro `string id`, y **cualquier otro parámetro** (`IMessageBus bus`) lo resuelve el **contenedor** — así distingue "viene de la URL" de "lo provee la DI". `Results.Ok()` responde HTTP 200. `app.Run()` levanta el servidor y lo deja **vivo** (por eso el daemon y el despachador de Wolverine, que son servicios hospedados, siguen corriendo).

> 🆕 **Una `IDocumentSession` es una unidad de trabajo, y por eso va *scoped*.** No es una conexión que compartes: acumula los cambios sin confirmar de **una** operación, tiene su *identity map*, y **no es segura entre hilos**. Por eso el contenedor te da una **fresca por petición** (*scoped*) y la cierra al responder — nunca un *singleton* compartido entre peticiones concurrentes.

> 🛠️ **Inténtalo tú.** Quiero llamar el endpoint y que el hecho quede en el diario, sin escribir un solo `new`:
>
> ```
> POST /empresas/emp-7/suspender   →   EmpresaSuspendida en el diario
> ```
>
> Haz que funcione: (1) monta el host con `WebApplication.CreateBuilder(args)` y registra Marten y Wolverine como venías haciendo — ahora en su sitio de verdad. (2) Añade un `app.MapPost("/empresas/{id}/suspender", ...)` cuya lambda reciba `IMessageBus bus` (el contenedor lo inyecta) y haga `bus.InvokeAsync(...)`. (3) Confirma que tu `SuspenderHandler` recibe la `IDocumentSession` por parámetro, sin `new`. (4) Llama el endpoint con `curl` y verifica el hecho con `Query`/`AggregateStreamAsync`.

<details>
<summary>👉 Una forma de hacerlo</summary>

```csharp
var builder = WebApplication.CreateBuilder(args);   // host WEB (proyecto Microsoft.NET.Sdk.Web)

builder.Services.AddMarten(opts =>
{
    opts.Connection(cadena);
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Projections.Add<SuspendidasProjection>(ProjectionLifecycle.Async);   // §32
})
.UseLightweightSessions()
.IntegrateWithWolverine()          // el outbox de §30
.AddAsyncDaemon(DaemonMode.Solo);  // el daemon de §32

builder.Services.AddWolverine(opts =>
{
    opts.Policies.AutoApplyTransactions();
    opts.Policies.UseDurableLocalQueues();   // el outbox durable de §30
});
// + paquete WolverineFx.RuntimeCompilation

var app = builder.Build();

// el endpoint: {id} viene de la ruta; IMessageBus lo inyecta el contenedor. Es tu despachador.Enviar, ahora por HTTP.
app.MapPost("/empresas/{id}/suspender", async (string id, IMessageBus bus) =>
{
    await bus.InvokeAsync(new SuspenderEmpresa(id, "mora"));
    return Results.Ok();
});

app.Run();   // levanta el servidor y lo deja vivo (con el daemon + Wolverine corriendo dentro)
```

```csharp
// el handler: sin new, sin Registrar. El contenedor le inyecta la IDocumentSession (scoped, una por petición).
// Sigue cascadeando el evento público al outbox, como en El outbox (§30).
public static class SuspenderHandler
{
    public static EmpresaSuspendidaV1 Handle(SuspenderEmpresa cmd, IDocumentSession session)
    {
        session.Events.Append(cmd.EmpresaId, new EmpresaSuspendida(cmd.Motivo));
        return new EmpresaSuspendidaV1(NitDe(cmd.EmpresaId), cmd.Motivo);   // al outbox, misma transacción
    }
}
```

Llámalo y verifícalo:

```bash
curl -X POST http://localhost:5000/empresas/emp-7/suspender      # → 200
# y consultas el diario: AggregateStreamAsync<Empresa>("emp-7") → Suspendida == true
```

Una petición entra, el contenedor arma lo que el endpoint y el handler piden —incluida la sesión *scoped*—, el hecho queda en el diario y el outbox despacha el anuncio. Sin un solo `new EventStore(...)` ni `despachador.Registrar(...)`. El daemon corre en el mismo host, en background.

</details>

## 🔨 Rómpelo: el `new` que no está, y la sesión que no se comparte

**El `new` ausente:** repasa el flujo endpoint → handler → sesión → diario y cuenta los `new` de cableado que escribiste: **cero**. Agrega otra dependencia al handler (un logger, `ILogger`): la declaras como parámetro y el contenedor la inyecta — sin tocar ningún sitio de registro.

**La sesión que no se comparte:** guarda la `IDocumentSession` en un campo `static` y reúsala entre peticiones. Con dos peticiones a la vez verás errores ("sesión ya en uso / cerrada") o cambios de una que se cuelan en otra: una sesión es una unidad de trabajo de **una** operación, no algo compartido. Por eso va *scoped* — una por petición, que el contenedor administra.

## El Descubrimiento

El "infierno de los `new`" de [El despachador](./el-despachador.md) se pagó en dos tiempos: Wolverine se llevó el cableado de handlers en [El outbox](./el-outbox.md) (convención en vez de `new` + `Registrar`), y aquí el **contenedor de inyección de dependencias** cierra lo que faltaba — provee las piezas con el **alcance** correcto (una sesión por petición, cerrada al terminar) y conecta el mundo de afuera (una petición HTTP) con tu dominio. Por eso Marten y Wolverine pedían "un host": el daemon y el despachador de Wolverine son **servicios hospedados** que necesitan un proceso vivo (`app.Run()`), y el contenedor arma todo lo demás alrededor. Tu `Program.cs` de consola con `new`s y un `Dictionary` de handlers es ahora un host web que reconoce las piezas por su tipo y las conecta solo.

> 🌱 Tu servicio ya recibe peticiones y despacha comandos. Pero una petición HTTP normal pregunta una vez y se va; ¿y una UI que quiere **enterarse sola** cuando algo cambia, sin recargar? ¿Y un mundo **serverless**, donde no hay un host que viva para siempre y el daemon o el outbox no aplican igual? Esas dos variantes de entrega son el próximo paso: [En vivo y serverless](./en-vivo-y-serverless.md).

## ✅ Compruébalo

- [ ] Un `POST` al endpoint despacha el comando por `IMessageBus` (inyectado) y el hecho queda en el diario — sin que construyas el handler con `new` ni lo registres a mano.
- [ ] El handler recibe la `IDocumentSession` **inyectada**; sabes por qué es *scoped* (unidad de trabajo, no *thread-safe*) y qué se rompe si la haces *singleton*.
- [ ] El daemon (§32) y el outbox (§30) corren dentro del mismo host web mientras `app.Run()` lo mantiene vivo.
- [ ] Sabes qué pagó Wolverine en §30 (el cableado de handlers) y qué cierra §33 (la entrada HTTP + el alcance de las sesiones).

## 🆘 Si algo salió mal

- **El endpoint no recibe `IMessageBus`:** falta `AddWolverine(...)`, o no declaraste el parámetro en la lambda del `MapPost`. El contenedor solo inyecta lo registrado.
- **`WebApplication` no existe / no compila:** el proyecto debe ser web (SDK `Microsoft.NET.Sdk.Web`); el de consola no trae ASP.NET Core.
- **La sesión da "ya cerrada" o mezcla datos entre peticiones:** la guardaste en un campo `static`/singleton. Debe ser *scoped* — inyéctala por parámetro y deja que el contenedor la administre por petición.
- **El daemon o el outbox no corren:** el host debe seguir vivo (`app.Run()`); si el proceso termina, mueren con él.

## 📓 Registra tu avance

> 💭 **Reto:** ¿qué parte del "infierno de los `new`" pagó Wolverine en §30 y qué parte cierra el host web + DI aquí? Y: ¿por qué una `IDocumentSession` tiene que ser *scoped* por petición y no un *singleton*?

```bash
git add .
git commit -m "ES · El host y la inyección (entrada HTTP + DI + sesiones scoped)" -m "<aquí TU respuesta, con tus palabras>"
git push
```

## 🧠 En una frase

Wolverine ya se llevó el cableado de handlers en §30; el host web (ASP.NET Core) + la inyección de dependencias cierran el resto —reciben el comando por HTTP y proveen las piezas con su alcance, una `IDocumentSession` *scoped* por petición (unidad de trabajo, no *singleton*)— y mantienen vivo (`app.Run()`) el proceso donde el daemon y el despachador de Wolverine son servicios hospedados.

---

[⬅️ Volver: El daemon y la consistencia eventual](./el-daemon-y-la-consistencia-eventual.md)

[➡️ Siguiente: En vivo y serverless](./en-vivo-y-serverless.md)
