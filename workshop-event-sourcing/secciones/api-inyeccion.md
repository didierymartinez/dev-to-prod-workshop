# API + Inyección de dependencias: la app se vuelve un servicio

En [El daemon](daemon-proyecciones.md) apareció un **host** por primera vez (para que el worker viviera en algún lado). Y desde el swap vienes cableando todo **a mano**: `new SuspenderHandler(new MartenEventStore(session))`, y antes, un `new` por store, despachador y handler. Un servicio HTTP real no puede `new`-ear eso en cada petición — el store es de toda la app, la sesión es de **cada petición**. Es hora de convertir la app en un **servicio**: un contenedor cablea las piezas por ti, y ahí, por fin, `async` cobra sentido.

## 🎯 El Objetivo

Exponer la app como servicio HTTP donde un **contenedor de dependencias** arma el grafo de piezas (store, sesión, handler) por petición — sin un solo `new` a mano — y ver por qué `async` importa cuando hay muchas peticiones a la vez.

## 💥 El dolor: el infierno de los `new` (y el `async` sin cobrar)

Recuerda la semilla de [El despachador](el-despachador.md): cada pieza se cablea con un `new`, y quien crea el handler tiene que crear también todo lo que el handler necesita. En un `Main` de juguete se aguanta. En un servicio con endpoints, no: cada petición necesita su propia **sesión** de Marten (una unidad de trabajo por request), pero el `DocumentStore` es **uno** para toda la app. Hacer `new` de ese enredo a mano, por petición, es frágil y se equivoca de tiempos de vida. Y el `async` que aprendiste en [Conoce a Marten](conoce-a-marten.md) prometía una ganancia —no congelar el hilo— que en un solo `Main` no se veía. Un servidor **sí** la muestra.

## 🔧 Un contenedor cablea todo por ti

### Paso 1 · Registra las piezas (con su tiempo de vida)

Pasas de un host de consola a un **host web** (`WebApplication`), y registras cada pieza **una vez**, diciendo cuánto vive. Ese *cuánto vive* es el **tiempo de vida** de la pieza: `Scoped` = una instancia **por petición** (nace con el request, muere al responder); *singleton* = una sola para toda la app. La **sesión** de Marten la quieres `Scoped` (una unidad de trabajo por petición); el `DocumentStore`, singleton.

> 🛠️ **Inténtalo tú.** Con `WebApplication.CreateBuilder`: `AddMarten` (+ `UseLightweightSessions` para que la sesión sea **por petición**), registra `IEventStore → MartenEventStore` y el handler como **`Scoped`**, y (del daemon) mantén `AddAsyncDaemon`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;
using JasperFx.Events;
using JasperFx.Events.Projections;
using JasperFx.Events.Daemon;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMarten(opts =>
{
    opts.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
    opts.Events.StreamIdentity = StreamIdentity.AsString;
    opts.Events.EventNamingStyle = EventNamingStyle.SmarterTypeName;
    opts.Projections.Add<ResumenEmpresaProjection>(ProjectionLifecycle.Async);
})
.UseLightweightSessions()   // registra IDocumentSession como Scoped (una por petición)
.AddAsyncDaemon(DaemonMode.Solo);

builder.Services.AddScoped<IEventStore, MartenEventStore>();   // el motor de escritura
builder.Services.AddScoped<SuspenderHandler>();               // el handler

var app = builder.Build();
```
</details>

> [!NOTE]
> 🆕 **El contenedor.** `builder.Services` es el **contenedor de inyección de dependencias**: la lista de "cómo construir cada pieza". `AddScoped` registra las tuyas con el tiempo de vida por petición, y `UseLightweightSessions` registra así la `IDocumentSession` (la sesión por petición); el `DocumentStore` (la fábrica) queda **singleton**. Nadie hace `new`: el contenedor construye el grafo.

### Paso 2 · El endpoint pide su handler (y ya no hay `new`)

Un endpoint declara qué necesita **en sus parámetros**; el contenedor lo **inyecta** ya construido.

> [!NOTE]
> 🆕 **Minimal API: `MapPost`.** Un **endpoint** es una ruta HTTP atada a una función. `app.MapPost("/empresas/{id}/suspender", ...)` dice: ante un `POST` a esa ruta, ejecuta esta función. El `{id}` sale de la URL, el cuerpo JSON se ata al `record SuspenderBody`, y `Results.Ok()` responde `200`. Es idioma nuevo de ASP.NET: te lo muestro. Fíjate en el único parámetro que **no** viene del HTTP —el `handler`—: ese lo inyecta el contenedor.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
app.MapPost("/empresas/{id}/suspender",
    async (string id, SuspenderBody body, SuspenderHandler handler) =>
    {
        await handler.HandleAsync(new SuspenderEmpresa(id, body.Motivo));
        return Results.Ok();
    });

app.Run();

// en top-level statements, las declaraciones de tipo van al FINAL del archivo
public record SuspenderBody(string Motivo);
```
</details>

> [!NOTE]
> 🆕 **Inyección en el endpoint.** El `SuspenderHandler handler` del parámetro **no lo creas tú**: el contenedor lo arma para esta petición, y con él todo su grafo — `handler ← IEventStore (MartenEventStore) ← IDocumentSession` —, todo `Scoped` (la misma sesión para toda la petición). Ese es el fin del **infierno de los `new`**: declaras qué necesitas, el contenedor lo cablea. *(Aún registras el handler endpoint por endpoint; Wolverine industrializará ese ruteo — es el gemelo de tu `Despachador` jubilado.)*

### Paso 3 · Ahora `async` cobra sentido

Un servidor atiende **muchas** peticiones a la vez. Cada una, al llegar a Marten, **espera** a Postgres. Si esa espera **congelara** el hilo (sin `await`), cada petición en vuelo **retendría un hilo entero parado**, y con suficiente carga el servidor se queda **sin hilos** — deja de atender. Con `await`, el hilo se **libera** durante la espera y atiende otra petición mientras Postgres responde. Por eso todo el camino es `async`: **es lo que deja al servidor escalar**. Esa es la ganancia que en [Conoce a Marten](conoce-a-marten.md) solo se prometía — aquí se cobra.

> 🔍 **¿Lo lograste?** Con Postgres arriba y **`emp-7` ya sembrada** (un `EmpresaRegistrada`, como en [el swap](el-swap.md)), `dotnet run` y desde otra terminal: `curl -X POST http://localhost:5000/empresas/emp-7/suspender -H "Content-Type: application/json" -d '{"Motivo":"falta de pago"}'` → `200 OK`, y el `EmpresaSuspendida` aparece en `mt_events`. No creaste ningún `new`: el contenedor armó el handler, su `IEventStore` y la sesión de esa petición.
>
> *(Si `emp-7` no existe, `Suspender` devuelve `null` y no se persiste nada — coherente: no suspendes lo que no se registró. Y el puerto lo fija `launchSettings.json`; ajústalo a 5000 o usa el que imprima la consola.)*

---

### El Descubrimiento

La app es un **servicio**. Un **contenedor** cablea el grafo de piezas por petición —store singleton, sesión `Scoped`, handler `Scoped`—, curando el **infierno de los `new`**: declaras qué necesitas y el contenedor lo construye. Y `async` por fin **cobró sentido**: con muchas peticiones concurrentes, `await` libera el hilo durante la espera a Postgres y el servidor escala en vez de agotarse. El daemon del lado de lectura corre en el mismo host.

> [!NOTE]
> 🌱 **Semilla — el ruteo, industrializado.** Aún cableas un handler por endpoint (como antes hacías con `new`). **Wolverine** —el gemelo de tu `Despachador`— descubrirá los handlers por convención y los invocará por ti, y probarás el servicio de punta a punta con **Alba** (peticiones HTTP en memoria). Lo verás al revelar Wolverine.

> [!NOTE]
> 🌱 **Semilla — ¿quién llama `SaveChanges`?** Fíjate: tu handler llama `SaveChangesAsync` a mano. En la plantilla, un **middleware de unidad de trabajo** lo hace por ti alrededor de cada comando — para poder componer varios en una transacción. Lo desarmas al adoptar la plantilla (con su `AggregateRoot` real y su `MartenUnitOfWork`).

---

## ✅ Compruébalo

- [ ] Usas `WebApplication.CreateBuilder` + `AddMarten(...).UseLightweightSessions()`; registras `IEventStore → MartenEventStore` y el handler como `Scoped`.
- [ ] El endpoint recibe el handler **por parámetro** (inyectado), sin `new`; el contenedor arma el grafo por petición.
- [ ] Explicas por qué la **sesión** es `Scoped` (una unidad de trabajo por petición) y el `DocumentStore` singleton.
- [ ] `dotnet run` + `curl` al endpoint → `200 OK` y el hecho en `mt_events`.
- [ ] Explicas por qué `async` **importa en un servidor** (libera el hilo durante la espera; sin él, se agotan bajo carga).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué "infierno de los `new`" curó el contenedor, y por qué la sesión es `Scoped` y el store singleton? ¿Por qué `async` recién ahora "cobra sentido"?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · API + Inyección de dependencias: la app se vuelve un servicio" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Conviertes la app en un **servicio HTTP** con un **contenedor** que cablea el grafo por petición (store singleton, sesión y handler `Scoped`), curando el **infierno de los `new`**; y con un servidor atendiendo muchas peticiones, `async` **cobra sentido** por fin: `await` libera el hilo durante la espera a Postgres y evita que el servidor se quede sin hilos.

---

[⬅️ Volver: El daemon de proyecciones](./daemon-proyecciones.md)

[➡️ Siguiente: FetchForWriting: recuperar la concurrencia con criterio](./fetch-for-writing.md)
