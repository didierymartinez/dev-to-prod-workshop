# El tiempo de espera (async/await)

En [Docker y PostgreSQL](docker-postgres.md) levantaste Postgres y viste el **muro** de meter tus hechos ahí a mano. Lo cruzarás con Marten en las próximas secciones. Pero una base de datos real trae un costo que tu almacén en RAM nunca tuvo: **hablarle tarda**. Prepara el motor para esa espera antes de conectarlo.

> [!NOTE]
> Todavía **no** conectas Marten (llega enseguida); aquí preparas la **forma `async`** para que, cuando el almacén hable con Postgres, el resto del código —handlers, despachador, API— ya **no tenga que cambiar**.

## 🎯 El Objetivo

Preparar el motor —de la base de datos hasta el endpoint HTTP— para hablar con algo que **tarda**, sin congelar la aplicación mientras espera.

## CPU vs I/O: por qué esperar bloqueando es un desastre

Hay dos tipos de operación:

- **CPU** (sumar, el `switch Aplicar`): la CPU tiene los datos ahí mismo. Ocurre en **nanosegundos**.
- **I/O** (escribir en disco, llamar a PostgreSQL en otra máquina): hay que **salir al mundo exterior**. Toma **milisegundos** — para la CPU, una eternidad.

Tu servidor atiende peticiones con un número **limitado** de **hilos** (*threads*) — piensa en cada hilo como un **trabajador**, y en el conjunto como una **bolsa** (*pool*). Cuando se acaban, las peticiones nuevas esperan en fila.

> [!WARNING]
> Si le dices al procesador *"guarda estos hechos en la base de datos"* y lo obligas a quedarse **congelado** esperando, desperdicias un recurso carísimo: ese hilo no atiende a nadie más mientras tanto. Con 100 peticiones a la vez, congelas 100 hilos esperando al disco y la aplicación se cae. **Esperar bloqueando no escala.**

## La solución de C#: `Task`, `async`, `await`

- **`Task`**: la **promesa** de un resultado que llegará en el futuro (`Task<T>` si trae valor; `Task` a secas si no).
- **`async`**: marca un método que contiene esperas largas hacia afuera.
- **`await`**: "ve y haz el viaje; mientras tanto **me libero** para atender a otro; avísame al volver y sigo justo aquí".

La regla del event sourcing real (y de la plantilla del equipo): **todo acceso al almacén es asíncrono**, y el `async` se propaga **de abajo hacia arriba** — del almacén hasta el endpoint HTTP. Vamos a subir esa cascada.

## 🔁 Peldaño 1 — el almacén

Los métodos del `EventStore` devuelven una **`Task`** y reciben un `CancellationToken`. Como todo está en RAM, no espera de verdad: envolvemos el resultado en una `Task` ya cumplida.

```csharp
// 🔁 Reemplaza tu EventStore (el de «Concurrencia optimista») por esta versión asíncrona
public class EventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
        => new(this, aggregateId);

    public Task<List<EventoAlmacenado>> GetEventsAsync(string aggregateId, CancellationToken ct = default)
        => Task.FromResult(_cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new());

    public Task AppendEventAsync(string aggregateId, EventoAlmacenado sobre, CancellationToken ct = default)
    {
        if (!_cajones.ContainsKey(aggregateId)) _cajones[aggregateId] = new();
        var cajon = _cajones[aggregateId];
        if (sobre.Version <= cajon.Count)
            throw new ConcurrencyException($"La versión {sobre.Version} ya está ocupada (el cajón va en {cajon.Count}). Recarga y reintenta.");
        cajon.Add(sobre);
        return Task.CompletedTask;   // no hubo espera real: la "promesa" ya está cumplida
    }
}
```

> [!NOTE]
> **¿Ese `CancellationToken ct = default`?** Una señal de *"ya no necesito esto, abandona"* (el cliente cerró la página, venció un *timeout*). Toda API de base de datos real lo recibe. Lo dejamos con `= default` como **hueco reservado**: está en la firma, pero aún no lo encadenamos. `Task.FromResult`/`Task.CompletedTask` son "promesas ya cumplidas" — cumplen el contrato `async` sin I/O real; cuando llegue Marten, el `await` cobrará sentido de verdad.

## 🔁 Peldaño 2 — el stream y los handlers

Si el almacén espera, el stream que lo llama también, y el handler que llama al stream, también. El contrato `ICommandHandler<T>` sube con ellos.

```csharp
// 🔁 EventStream: Get → GetAsync, Append → AppendAsync (lo demás de la clase no cambia)
public async Task<T> GetAsync()
{
    var entidad = new T();
    var sobres  = await _store.GetEventsAsync(_aggregateId);   // ← await: libera el hilo mientras llega
    entidad.Load(sobres.Select(s => s.EventData));
    _version = sobres.Count;
    return entidad;
}

public async Task AppendAsync(object hecho)
{
    _version++;
    await _store.AppendEventAsync(_aggregateId, new(_version, DateTime.UtcNow, hecho));
}
```

```csharp
// 🔁 El contrato y los handlers, ahora async
public interface ICommandHandler<TCommand>
{
    Task HandleAsync(TCommand comando, CancellationToken ct = default);
}

public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = await stream.GetAsync();                    // 1. cargar (espera I/O)
        var hecho   = empresa.Suspender(cmd.Motivo);              // 2. decidir (CPU, instantáneo)
        if (hecho is not null) await stream.AppendAsync(hecho);   // 3. guardar (espera I/O)
    }
}
```

*(`CambiarPlanHandler` y `RegistrarEmpresaHandler` suben igual: `Handle` → `async Task HandleAsync`, con `await` en cargar y guardar.)* Fíjate en el patrón: la **espera** está en cargar y guardar; la **decisión** (CPU pura) en medio no espera nada.

## 🔁 Peldaño 3 — el despachador y la API

El despachador ruteaba llamando `handler.Handle`; ahora ese `Handle` es `HandleAsync`, así que el despachador también devuelve una `Task`. Y la API, que llama al despachador, `await`ea esa `Task`:

```csharp
// 🔁 Despachador: la tabla guarda funciones que devuelven Task; Enviar → EnviarAsync
public class Despachador
{
    private readonly Dictionary<Type, Func<object, Task>> _handlers = new();

    public void Registrar<T>(ICommandHandler<T> handler)
        => _handlers[typeof(T)] = comando => handler.HandleAsync((T)comando);

    public Task EnviarAsync(object comando) => _handlers[comando.GetType()](comando);
}
```

```csharp
// 🔁 Los endpoints de «La API HTTP» pasan a async + await — la cascada llega hasta arriba
app.MapPost("/api/empresas", async (RegistrarEmpresa cmd, Despachador despachador) =>
{
    await despachador.EnviarAsync(cmd);
    return Results.Accepted($"/api/empresas/{cmd.EmpresaId}");
});

app.MapGet("/api/empresas/{id}", async (string id, EventStore store) =>
{
    var empresa = await store.AbrirStream<Empresa>(id).GetAsync();
    return Results.Ok(new { empresa.Nombre, empresa.Plan, empresa.Suspendida });
});
```

*(El endpoint de suspender sube igual: `async (…) => { await despachador.EnviarAsync(...); return Results.Accepted(); }`.)* ASP.NET Core estaba hecho para esto: un endpoint `async` libera su hilo mientras la base de datos responde, y con eso atiende muchas más peticiones con los mismos trabajadores.

> 🛠️ **Inténtalo tú.** Tus tests también suben la cascada. En la base `HandlerTest<TCommand>` de [Given-When-Then](given-when-then.md): `Given` y `Then` `await`ean el almacén (`AppendAsync`/`GetEventsAsync`), y `When` se vuelve `WhenAsync` (`await Handler.HandleAsync(comando)`). Cada `[Fact]` pasa a `async Task` con `await WhenAsync(...)`. Corre `dotnet test`: deben seguir en verde.

## 🔍 ¿Lo lograste?

`dotnet run` levanta la API y los tres `curl` de [La API HTTP](la-api-http.md) responden igual (202 / 202 / el JSON) — pero ahora cada endpoint libera su hilo mientras el almacén trabaja. Y `dotnet test` sigue en **verde** con la gramática async. Nada cambió de comportamiento; cambió que ya **no se congela** al esperar.

---

### El Descubrimiento

La arquitectura real **nunca** asume que la base de datos es instantánea. En .NET se modela con `Task` + `async`/`await`, propagados **de punta a punta** —almacén → stream → handler → despachador → endpoint HTTP—: todos esperan **sin congelar el hilo**, que queda libre para atender a otros.

> [!WARNING]
> 🌱 **Semilla — tres reglas de producción (adóptalas desde ya):**
> 1. **Nunca `.Result` ni `.Wait()`** sobre un `Task`: en ASP.NET Core bloquean un hilo del pool; bajo carga agotas los hilos y la app se cae. **Async hasta arriba.**
> 2. **Deja siempre el `CancellationToken` en la firma async.** Hoy es un hueco reservado; con una base de datos real lo propagarás por toda la cadena para cancelar de verdad.
> 3. **`async` no es "más rápido" ni "otro hilo".** `await` compila a una **máquina de estados**: no hay un hilo esperando a la base de datos. No ganas velocidad, ganas **escalabilidad**.

---

## ✅ Compruébalo

- [ ] El `EventStore`, el `EventStream`, los handlers, el `Despachador` y los endpoints son **todos** `async`.
- [ ] `dotnet run` + los tres `curl` responden igual que antes (202 / 202 / JSON), ahora sin bloquear hilos.
- [ ] Tu base `HandlerTest` y sus `[Fact]` son `async` y `dotnet test` sigue en verde.
- [ ] Explicas por qué el almacén en memoria usa `Task.FromResult`/`Task.CompletedTask`, y por qué evitamos `.Result`/`.Wait()`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué `await` no es 'otro hilo' ni 'más rápido'? ¿Qué ganas, y qué pasa con `.Result` en ASP.NET Core?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El tiempo de espera" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Hablar con una base de datos es **I/O que tarda**; con `Task` + `async`/`await` propagados de abajo hacia arriba —almacén, stream, handler, despachador, endpoint— el hilo se **libera** mientras espera en vez de congelarse, lo que da **escalabilidad**; y nunca se bloquea con `.Result`/`.Wait()`.

---

[⬅️ Volver: Persistencia real (Docker y PostgreSQL)](./docker-postgres.md)

[➡️ Siguiente: Conocer Marten (el sandbox)](./conocer-marten.md)
