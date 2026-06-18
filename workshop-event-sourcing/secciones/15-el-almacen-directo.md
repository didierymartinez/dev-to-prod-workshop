# 15 · El almacén directo (y la Unit of Work)

Tu motor ya tiene la forma de producción casi completa. Falta el último gran refactor de la convergencia: **jubilar el `EventStream`-ventana**. Nos sirvió para entender "la historia de una empresa", pero es una capa extra entre tú y el almacén — y choca con cómo trabaja la herramienta real. La reemplazamos por un almacén al que le hablas **directo**, con una pieza que **guarda por ti**: la **Unit of Work**.

## 🎯 El Objetivo

Cargar y guardar agregados hablándole **directo** al almacén, y que **un solo `SaveChangesAsync`** persista todo lo que tocaste — sin drenar `UncommittedEvents` a mano.

## El dolor: el handler hace de plomero

Mira lo que hace hoy tu handler (§12):

```csharp
var empresa = await stream.GetAsync();
empresa.CambiarPlan(cmd.NuevoPlan);
foreach (var hecho in empresa.UncommittedEvents)   // 👈 plomería
    await stream.AppendAsync(hecho);
empresa.ClearUncommittedEvents();                  // 👈 plomería
```

Ese `foreach` + `Clear` es **fontanería de persistencia** repetida en cada handler. Y hay algo más de fondo: el `EventStream` es una **ventana a UNA empresa**. Pero una operación de negocio real podría tocar **varias** (registrar una empresa y apuntar algo en otra) y querría guardarlas **juntas, en una sola transacción**. La ventana de a-una no modela eso.

La salida: un almacén que **recuerda** qué agregados tocaste durante la operación, y al final los persiste **todos de un golpe**. Esa pieza tiene nombre: **Unit of Work** (unidad de trabajo).

## El almacén directo (te lo muestro: el rastreo es sutil)

Esta pieza —un almacén que rastrea agregados y los drena al guardar— es maquinaria fina, así que te la muestro entera. **🔁 Reemplaza tu `InMemoryEventStore`** por esta versión (y **borra** la clase `EventStream<T>` y el viejo `AbrirStream`: ya no existen):

```csharp
public class InMemoryEventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    // La Unit of Work: recuerda qué tocaste en esta operación
    private readonly List<AggregateRoot> _iniciados   = new();   // nacieron aquí (StartStream)
    private readonly List<AggregateRoot> _modificados = new();   // se cargaron para mutar (Get)

    // ALTA: un agregado nuevo abre su stream
    public void StartStream(AggregateRoot ar)
    {
        if (string.IsNullOrEmpty(ar.Id)) throw new InvalidOperationException("El agregado necesita un Id.");
        _iniciados.Add(ar);                       // se persiste en SaveChangesAsync, no ya
    }

    // CARGA: rehidrata Y lo apunta como "tocado"
    public Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot, new()
    {
        var cajon = _cajones.GetValueOrDefault(id);
        if (cajon is null || cajon.Count == 0) return Task.FromResult<T?>(null);

        var ar = new T { Id = id };
        ar.Load(cajon.Select(s => s.EventData));
        _modificados.Add(ar);                     // lo rastreo: al guardar, drenaré sus hechos
        return Task.FromResult<T?>(ar);
    }

    public Task<bool> ExistsAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot =>
        Task.FromResult(_cajones.TryGetValue(id, out var c) && c.Count > 0);

    // GUARDA: drena los hechos pendientes de todo lo rastreado, en un solo paso
    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var ar in _iniciados)
        {
            if (_cajones.TryGetValue(ar.Id, out var existe) && existe.Count > 0)
                throw new ConcurrencyException($"El stream '{ar.Id}' ya existe.");
            Volcar(ar, desdeVersion: ar.Version);
        }
        foreach (var ar in _modificados.Where(a => a.UncommittedEvents.Count > 0))
        {
            var actual = _cajones.TryGetValue(ar.Id, out var c) ? c.Count : 0;
            if (actual != ar.Version)             // concurrencia optimista (§05), ahora con ar.Version (§14)
                throw new ConcurrencyException($"Esperaba la versión {ar.Version} de '{ar.Id}', pero está en {actual}.");
            Volcar(ar, desdeVersion: ar.Version);
        }
        _iniciados.Clear(); _modificados.Clear();   // limpia el rastreo: la operación terminó
        return Task.CompletedTask;
    }

    private void Volcar(AggregateRoot ar, int desdeVersion)
    {
        var cajon = _cajones.GetValueOrDefault(ar.Id) ?? new();
        _cajones[ar.Id] = cajon;
        var version = desdeVersion;
        foreach (var hecho in ar.UncommittedEvents)
            cajon.Add(new EventoAlmacenado(++version, DateTime.UtcNow, hecho));
        ar.ClearUncommittedEvents();
    }
}
```

Lo importante de leer ahí:
- **Dos listas** = la Unit of Work. `_iniciados` (agregados nacidos en esta operación, vía `StartStream`) y `_modificados` (cargados con `Get` para mutar). El almacén **recuerda** lo que tocaste.
- **`SaveChangesAsync` drena todo de un golpe** y limpia el rastreo. Es el **único** punto que persiste — y el único que el handler tendrá que llamar.
- La **concurrencia optimista** de §05 se mudó aquí: antes de volcar un agregado modificado, comprueba que el stream **siga** en la versión con la que cargó (`ar.Version`, de §14). Por eso pusimos la versión en el agregado.

## 🔧 El alta de un agregado: `StartStream`

`GetAggregateRootAsync` sirve para uno que **ya existe**. ¿Y para **registrar** una empresa nueva, que aún no tiene stream? Ahí entra `StartStream`. Démosle a `Empresa` una forma de nacer.

> 🛠️ **Inténtalo tú.** (1) Añade a `Empresa` un método estático `Registrar(id, nombre, plan)` que cree una empresa, le ponga el `Id`, y **levante** (`Raise`) un `EmpresaRegistrada(nombre, plan)`. (2) Escribe un `RegistrarEmpresaHandler` que la cree con `Empresa.Registrar(...)`, la pase a `store.StartStream(...)` y llame a `store.SaveChangesAsync(ct)`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// en Empresa (recuerda: el evento de creación no lleva id; el id es la llave del stream, §05)
public static Empresa Registrar(string id, string nombre, string plan)
{
    var empresa = new Empresa { Id = id };
    empresa.Raise(new EmpresaRegistrada(nombre, plan));
    return empresa;
}
```

```csharp
public class RegistrarEmpresaHandler(InMemoryEventStore store) : ICommandHandler<RegistrarEmpresa>
{
    public async Task HandleAsync(RegistrarEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = Empresa.Registrar(cmd.EmpresaId, cmd.Nombre, cmd.Plan);
        store.StartStream(empresa);
        await store.SaveChangesAsync(ct);
    }
}
```

Con su comando: `public record RegistrarEmpresa(string EmpresaId, string Nombre, string Plan);`
</details>

## 🔧 Los handlers ya no drenan

Ahora el premio: los handlers de mutación se vuelven **cargar → actuar → guardar**, sin plomería.

> 🛠️ **Inténtalo tú.** **🔁 Reemplaza** `CambiarPlanHandler` y `SuspenderHandler`: carga con `store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId, ct)` (si da `null`, no existe → lanza), pide la decisión, y llama a `store.SaveChangesAsync(ct)`. **Borra** el `foreach`/`ClearUncommittedEvents`: ahora eso lo hace el almacén.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class CambiarPlanHandler(InMemoryEventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public async Task HandleAsync(CambiarPlanDeEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId, ct)
                      ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}.");
        empresa.CambiarPlan(cmd.NuevoPlan);
        await store.SaveChangesAsync(ct);
    }
}

public class SuspenderHandler(InMemoryEventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId, ct)
                      ?? throw new InvalidOperationException($"No existe la empresa {cmd.EmpresaId}.");
        empresa.Suspender(cmd.Motivo);
        await store.SaveChangesAsync(ct);
    }
}
```
</details>

Fíjate qué desapareció: el `foreach (var hecho in empresa.UncommittedEvents)` y el `ClearUncommittedEvents()`. El handler vuelve a decir solo lo esencial —*carga, decide, guarda*— y la **Unit of Work** se encarga del resto. La idempotencia sigue intacta (si `Suspender` no levanta nada, no hay qué drenar).

> [!NOTE]
> 🌱 **Semilla — esto se mapea 1:1 con Marten.** Cuando reveles Marten (§16), tu `GetAggregateRootAsync` será `querySession.Events.AggregateStreamAsync<T>(id)`, tu `StartStream` será `session.Events.StartStream(id, …)`, y tu `SaveChangesAsync` será `session.SaveChangesAsync()`. La interfaz `IEventStore` la extraeremos **ahí**, cuando aparezca la 2ª implementación (la de Marten) y tengamos de qué abstraer.

> [!NOTE]
> 🌱 **Semilla — ni siquiera llamarás `SaveChangesAsync`.** En §17 un **middleware** de Wolverine lo llamará por ti al terminar cada comando. El handler quedará en *carga, decide* — el *guarda* será automático. Por eso fue clave que el guardar viva en **un solo** método (`SaveChangesAsync`) y no regado.

> [!NOTE]
> ⚖️ **Semilla — la concurrencia, para §19.** Tu almacén **sí** hace cumplir la concurrencia optimista (el chequeo `actual != ar.Version`). La capa del equipo tiene la `Version` pero —lo verás en "las dos vertientes"— **no** la usa para frenar escrituras; el camino **nativo** de Marten (`FetchForWriting`) sí lo haría. Dos formas, un mismo problema.

---

## 🔍 Comprueba

Pon esto en tu `Program.cs` y corre `dotnet run`:

```csharp
var store = new InMemoryEventStore();

await new RegistrarEmpresaHandler(store).HandleAsync(new RegistrarEmpresa("emp-7", "Constructora Andes", "Básico"));
await new CambiarPlanHandler(store).HandleAsync(new CambiarPlanDeEmpresa("emp-7", "Premium"));
await new SuspenderHandler(store).HandleAsync(new SuspenderEmpresa("emp-7", "falta de pago"));

var empresa = await store.GetAggregateRootAsync<Empresa>("emp-7");
Console.WriteLine($"{empresa!.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}, versión {empresa.Version}");
```

> **¿Lo lograste?** Deberías ver:
> ```
> Constructora Andes: plan Premium, suspendida, versión 3
> ```
> Una empresa **registrada** (alta con `StartStream`), **modificada** dos veces (cargar→decidir→guardar) y **rehidratada** — sin un solo `EventStream` ni un `foreach` de drenado a la vista.

---

## ✅ Compruébalo

- [ ] Borraste `EventStream<T>` y `AbrirStream`; el almacén ahora tiene `StartStream` / `GetAggregateRootAsync` / `SaveChangesAsync` / `ExistsAsync`.
- [ ] Los handlers ya **no** tienen `foreach`/`ClearUncommittedEvents`: solo cargan, deciden y llaman `SaveChangesAsync`.
- [ ] `RegistrarEmpresaHandler` usa `StartStream`; los de mutación usan `GetAggregateRootAsync`.
- [ ] `dotnet run` imprime `versión 3`.
- [ ] Explica qué es la **Unit of Work** (las dos listas) y por qué un solo `SaveChangesAsync` puede persistir varios agregados juntos.

---

## 🧠 En una frase

El `EventStream`-ventana se jubila: le hablas **directo** al almacén (`StartStream` para nacer, `GetAggregateRootAsync` para cargar) y una **Unit of Work** —las dos listas que recuerdan lo que tocaste— lo persiste todo con un solo **`SaveChangesAsync`**; el handler vuelve a *cargar, decidir, guardar*, sin plomería — la forma exacta que Marten y Wolverine industrializan a continuación.

---

[⬅️ Volver: La versión es del agregado](./14-la-version-del-agregado.md)

[➡️ Siguiente: El gran reveal — Marten reemplaza tu almacén](./16-revelar-marten.md)
