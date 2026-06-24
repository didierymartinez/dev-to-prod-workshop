# El tiempo de espera (async/await)

Tienes el flujo completo de event sourcing… pero vive en RAM. Cuando el programa se apaga, el `InMemoryEventStore` se va a la basura con toda su historia. Para que las empresas sobrevivan a un reinicio, hay que enviar los hechos **fuera del proceso**: a una base de datos real. Y eso trae un costo nuevo: **el tiempo de espera**.

## 🎯 El Objetivo

Preparar el motor para hablar con algo que **tarda** (una base de datos), sin congelar la aplicación mientras espera.

## CPU vs I/O: por qué esperar bloqueando es un desastre

Hay dos tipos de operación:

- **CPU** (sumar, el `switch Aplicar`): la CPU tiene los datos ahí mismo. Ocurre en **nanosegundos**.
- **I/O** (escribir en disco, llamar a PostgreSQL en otra máquina): hay que **salir al mundo exterior**. Toma **milisegundos** — para la CPU, una eternidad.

Una palabra antes de seguir: tu servidor atiende peticiones con un número **limitado** de **hilos** (*threads*) — piensa en cada hilo como un **trabajador**, y en el conjunto como una **bolsa** (*pool*) de trabajadores. Cuando se acaban, las peticiones nuevas **esperan en fila**. Con eso en mente:

> [!WARNING]
> Si le dices al procesador *"guarda estos hechos en la base de datos"* y lo obligas a quedarse **congelado** esperando la respuesta, desperdicias un recurso carísimo: ese hilo no puede atender a nadie más mientras tanto. Con 100 peticiones a la vez, congelas 100 hilos esperando al disco y la aplicación se cae. **Esperar bloqueando no escala.**

## La solución de C#: `Task`, `async`, `await`

- **`Task`**: la **promesa** de un resultado que llegará en el futuro (`Task<T>` si trae valor; `Task` a secas si no).
- **`async`**: marca un método que contiene esperas largas hacia afuera.
- **`await`**: "ve y haz el viaje; mientras tanto **me libero** para atender a otro; avísame al volver y sigo justo aquí".

La regla del event sourcing real (y de la plantilla del equipo): **todo acceso al almacén es asíncrono**. Absolutamente todo. Vamos a propagar el `async` de abajo hacia arriba.

## 🔁 El almacén, ahora asíncrono

Los métodos del `InMemoryEventStore` cambian de firma: en vez de devolver una lista al instante, devuelven una **`Task`** (la promesa de un resultado futuro), y reciben un parámetro nuevo, el **`CancellationToken`**.

> [!NOTE]
> **¿Qué es ese `CancellationToken ct = default`?** Es una señal de *"ya no necesito esto, abandona"*: si el cliente cierra la página o se cumple un *timeout*, la operación se corta en vez de seguir gastando. Toda API real de base de datos lo recibe (y las de la plantilla, también). Lo dejamos con `= default` para no tener que pasarlo en cada llamada todavía. **Por ahora el `ct` es un hueco reservado: lo recibimos en las firmas, pero aún no lo encadenamos** (los handlers todavía llaman a `GetAsync()`/`AppendAsync()` sin pasarlo). Eso lo haremos cuando importe —cuando detrás haya una base de datos real que pueda cancelarse—. Lo que queremos dejar grabado hoy es el **hábito de la firma**: cuando un método sea `async`, déjale su `CancellationToken` listo.

El `InMemoryEventStore` no habla con ninguna red — todo está en RAM, así que **no espera de verdad**. Como no hay espera, envolvemos sus resultados en una `Task` ya completada:

```csharp
// 🔁 Reemplaza el InMemoryEventStore de «El almacén en memoria» por esta versión asíncrona
public class InMemoryEventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    // sin cambios: sigue entregándote el stream ya conectado
    public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
        => new(this, aggregateId);

    public Task<IEnumerable<EventoAlmacenado>> GetEventsAsync(string aggregateId, CancellationToken ct = default) =>
        Task.FromResult<IEnumerable<EventoAlmacenado>>(
            _cajones.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<EventoAlmacenado>());

    public Task AppendEventAsync(string aggregateId, EventoAlmacenado evento, CancellationToken ct = default)
    {
        var cajon = _cajones.GetValueOrDefault(aggregateId) ?? new();
        var versionActual = cajon.Count == 0 ? 0 : cajon[^1].Version;
        if (evento.Version != versionActual + 1)
            throw new ConcurrencyException(
                $"Esperaba la versión {versionActual + 1}, pero llegó la {evento.Version}.");

        _cajones[aggregateId] = cajon;
        cajon.Add(evento);
        return Task.CompletedTask;   // no hubo espera real: la "promesa" ya está cumplida
    }
}
```

> [!NOTE]
> `Task.FromResult(...)` y `Task.CompletedTask` son "promesas ya cumplidas": cumplen el contrato `async` sin que haya I/O de verdad. Es lo correcto en memoria. Cuando en unas secciones cambiemos esto por PostgreSQL, ahí sí habrá una espera real — y el `await` cobrará todo su sentido.

## 🔁 El `EventStream` y el handler, asíncronos de cabo a rabo

La asincronía sube como una cascada: si el almacén espera, el stream que lo llama también, y el handler que llama al stream, también.

```csharp
// 🔁 EventStream: Get → GetAsync, Append → AppendAsync
public async Task<T> GetAsync()
{
    var entidad = new T { Id = _aggregateId };
    var sobres = (await _store.GetEventsAsync(_aggregateId)).ToList();   // ← await: libera el hilo mientras llega
    entidad.Load(sobres.Select(s => s.EventData));
    _version = sobres.Count == 0 ? 0 : sobres[^1].Version;
    return entidad;
}

public async Task AppendAsync(object hecho)
{
    _version++;
    await _store.AppendEventAsync(_aggregateId, new(_version, DateTime.UtcNow, hecho));
}
```

> 📦 **Cómo queda tu `EventStream<T>`, completo** (esos dos métodos van dentro de la clase; lo demás no cambia):
>
> ```csharp
> public class EventStream<T> where T : AggregateRoot, new()
> {
>     private readonly InMemoryEventStore _store;
>     private readonly string _aggregateId;
>     private int _version;
>
>     public EventStream(InMemoryEventStore store, string aggregateId)
>     {
>         _store = store;
>         _aggregateId = aggregateId;
>     }
>
>     public async Task<T> GetAsync()
>     {
>         var entidad = new T { Id = _aggregateId };
>         var sobres = (await _store.GetEventsAsync(_aggregateId)).ToList();
>         entidad.Load(sobres.Select(s => s.EventData));
>         _version = sobres.Count == 0 ? 0 : sobres[^1].Version;
>         return entidad;
>     }
>
>     public async Task AppendAsync(object hecho)
>     {
>         _version++;
>         await _store.AppendEventAsync(_aggregateId, new(_version, DateTime.UtcNow, hecho));
>     }
> }
> ```

Primero, el **contrato** también se vuelve async:

```csharp
// 🔁 El contrato ICommandHandler<T> de «El Command Handler», ahora async
public interface ICommandHandler<TCommand>
{
    Task HandleAsync(TCommand comando, CancellationToken ct = default);
}
```

Y **ambos** handlers (`SuspenderHandler` y `CambiarPlanHandler`) pasan a `HandleAsync` con `await` en cada espera de I/O:

```csharp
// 🔁 Handle → HandleAsync (y recibe su CancellationToken)
public class SuspenderHandler(InMemoryEventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = await stream.GetAsync();             // 1. cargar (espera I/O)
        var hecho   = empresa.Suspender(cmd.Motivo);       // 2. actuar (CPU, instantáneo)
        if (hecho is not null) await stream.AppendAsync(hecho);  // 3. guardar (espera I/O)
    }
}

public class CambiarPlanHandler(InMemoryEventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public async Task HandleAsync(CambiarPlanDeEmpresa cmd, CancellationToken ct = default)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = await stream.GetAsync();
        await stream.AppendAsync(empresa.CambiarPlan(cmd.NuevoPlan));
    }
}
```

Y en el `Program.cs`, como los *top-level statements* ya son `async`, simplemente usas `await` (siembra `emp-7` primero, para que tenga historia que cargar):

```csharp
var store = new InMemoryEventStore();
await store.AbrirStream<Empresa>("emp-7").AppendAsync(new EmpresaRegistrada("Constructora Andes", "Básico"));  // siembra

await new SuspenderHandler(store).HandleAsync(new SuspenderEmpresa("emp-7", "falta de pago"));   // top-level async: solo await

var emp = await store.AbrirStream<Empresa>("emp-7").GetAsync();
Console.WriteLine(emp.Suspendida ? "suspendida" : "activa");   // 👉 suspendida
```

Fíjate en el patrón del handler: la **espera** (I/O) está en cargar y guardar; la **decisión** (CPU pura) en medio no espera nada. Eso es exactamente lo que el `await` te deja hacer bien.

---

### El Descubrimiento

La arquitectura real **nunca** asume que la base de datos es instantánea. En .NET se modela con `Task` + `async`/`await`, propagados de punta a punta: el almacén espera, el stream espera, el handler espera — todos **sin congelar el hilo**, que queda libre para atender a otros.

> [!WARNING]
> 🌱 **Semilla — tres reglas de producción (adóptalas desde ya):**
> 1. **Nunca `.Result` ni `.Wait()`** sobre un `Task`. En ASP.NET Core / Azure Functions (como la plantilla) esto **bloquea un hilo del pool** mientras espera; bajo carga agotas los hilos y la app se cae. La regla: **async hasta arriba**.
> 2. **Deja siempre el `CancellationToken` en la firma async.** Hoy lo recibimos pero todavía no lo encadenamos (es un hueco reservado); cuando detrás haya una base de datos real lo propagaremos por toda la cadena para poder cancelar de verdad.
> 3. **`async` no es "más rápido" ni "otro hilo".** Bajo el capó, `await` compila a una **máquina de estados**: no hay un hilo "esperando" a la base de datos. Lo que ganas no es velocidad, es **escalabilidad** (más peticiones con los mismos hilos).

Ahora las interfaces ya no mienten: dicen la verdad sobre la espera. Pero queda una pregunta — ¿quién va a *armar* el handler y darle el almacén (`new SuspenderHandler(store)`), y de dónde sale ese `store`? Hasta ahora lo hacemos a mano con `new()` por todos lados. En la próxima sección despedimos a ese intermediario manual.

---

## ✅ Compruébalo

- [ ] El `InMemoryEventStore`, el `EventStream` y los handlers son **todos** `async` (devuelven `Task`/`Task<T>`).
- [ ] `dotnet run` sigue funcionando con `await` en el `Program.cs`.
- [ ] Sabes explicar por qué el almacén en memoria usa `Task.FromResult`/`Task.CompletedTask` (no hay espera real, pero cumple el contrato).
- [ ] Sabes, a grandes rasgos, por qué evitamos `.Result`/`.Wait()` (bloquean un hilo en vez de liberarlo) y qué significa "async hasta arriba".

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

Hablar con una base de datos es **I/O que tarda**; con `Task` + `async`/`await` propagados de abajo hacia arriba, el hilo se **libera** mientras espera (no se congela), lo que da **escalabilidad** — y nunca se bloquea con `.Result`/`.Wait()`.

---

[⬅️ Volver: El almacén en memoria (Event Store)](./el-almacen-en-memoria.md)

[➡️ Siguiente: De `new` al contenedor (Inyección de Dependencias)](./inyeccion-de-dependencias.md)
