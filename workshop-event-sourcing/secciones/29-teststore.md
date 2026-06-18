# 29 · Probar sin base de datos: el TestStore

En §19 dijimos que una de las razones por las que el equipo construyó su **capa propia** (`IEventStore`) en vez del `FetchForWriting` nativo es poder **testear sin base de datos**. Es hora de cobrar ese cheque. Como tu agregado y tu `decide` son **funciones puras** (§02, §06) y los handlers hablan con la **interfaz** `IEventStore`, puedes probar toda tu lógica con un almacén **en memoria** — sin Postgres, sin Marten, sin mocks.

## 🎯 El Objetivo

Un `IEventStore` **en memoria** para tests: siembras hechos pasados, ejecutas, y observas los hechos nuevos — todo determinista y sin infraestructura.

## El dolor: tu almacén real necesita Postgres

`MartenEventStore` (§16) necesita una conexión a Postgres viva. Probar contra él es lento, flojo (depende de la BD) y arrastra infraestructura a tus tests. Pero tus handlers **no** dependen de Marten: dependen de `IEventStore`. Así que para tests, basta **otra implementación** de `IEventStore`, en memoria.

## 🔧 Un TestStore que rehidrata por reflexión

> 🛠️ **Inténtalo tú.** Un `TestStore` con dos diccionarios: **eventos previos** (los que *siembras* como historia) y **eventos nuevos** (los que el handler *produce*). Y un `GetAggregateRoot<T>(id)` que rehidrate **reproduciendo** esa historia. Para aplicar cada hecho sin un `switch` a mano por tipo, usa **reflexión**: busca el método `Apply(TipoDelEvento)` del agregado y llámalo (cachéalo).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using System.Collections.Concurrent;
using System.Reflection;

public class TestStore : IEventStore
{
    private readonly Dictionary<string, List<object>> _previos = new();   // historia sembrada (Given)
    private readonly Dictionary<string, List<object>> _nuevos  = new();   // hechos producidos (Then)
    private readonly List<AggregateRoot> _rastreados = new();             // lo cargado/iniciado en esta operación
    private static readonly ConcurrentDictionary<(Type, Type), MethodInfo?> _cache = new();

    public void AppendPreviousEvents(string id, params object[] eventos) =>          // Given
        (_previos[id] = _previos.GetValueOrDefault(id) ?? new()).AddRange(eventos);

    public IEnumerable<object> GetNewEvents(string id) => _nuevos.GetValueOrDefault(id) ?? [];   // Then

    // --- IEventStore: lo que el handler usa (carga + rastrea; guardar drena a _nuevos) ---
    public void StartStream(AggregateRoot ar) => _rastreados.Add(ar);

    public Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot, new()
    {
        var ar = new T { Id = id };
        if (_previos.TryGetValue(id, out var historia)) foreach (var e in historia) ApplyEvent(ar, e);   // rehidrata
        _rastreados.Add(ar);                                                                             // rastrea
        return Task.FromResult<T?>(ar);
    }

    public void AppendEvent(string id, object e) => (_nuevos[id] = _nuevos.GetValueOrDefault(id) ?? new()).Add(e);
    public Task<bool> ExistsAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot
        => Task.FromResult(_previos.ContainsKey(id));
    public Task SaveChangesAsync(CancellationToken ct = default) { SaveChanges(); return Task.CompletedTask; }

    // el "commit" del test: vuelca los hechos nuevos de lo rastreado a _nuevos (lo que Then observará)
    public void SaveChanges()
    {
        foreach (var ar in _rastreados)
        {
            (_nuevos[ar.Id] = _nuevos.GetValueOrDefault(ar.Id) ?? new()).AddRange(ar.UncommittedEvents);
            ar.ClearUncommittedEvents();
        }
        _rastreados.Clear();
    }

    // rehidrata para inspección (historia previa + hechos nuevos), aplicando por reflexión
    public T GetAggregateRoot<T>(string id) where T : AggregateRoot, new()
    {
        var ar = new T { Id = id };
        if (_previos.TryGetValue(id, out var p)) foreach (var e in p) ApplyEvent(ar, e);
        if (_nuevos.TryGetValue(id, out var n)) foreach (var e in n) ApplyEvent(ar, e);
        return ar;
    }

    // reflexión: halla el Apply(TipoConcreto) del agregado y lo invoca (cacheado)
    private static void ApplyEvent<T>(T ar, object evento)
    {
        var metodo = _cache.GetOrAdd((typeof(T), evento.GetType()),
            llave => llave.Item1.GetMethod("Apply", new[] { llave.Item2 }));
        metodo?.Invoke(ar, new[] { evento });
    }
}
```
</details>

> [!NOTE]
> **Aquí la reflexión SÍ es la elección correcta** (lo prometido en §18). En producción Wolverine/Marten **generan código** por rendimiento; pero en un test double el costo de arranque no importa y la **flexibilidad** de "busca el `Apply` que encaje" gana: cero `switch` que mantener, cero codegen. Cada herramienta donde encaja.

> [!NOTE]
> ⚖️ **Es el `TestStore` de la plantilla, 1:1** (`Cosmos.EventSourcing.Testing.Utilities`): mismos `_previousEvents`/`_newEvents`, `AppendPreviousEvents`, `GetNewEvents`, `GetAggregateRoot<T>`, y el `ApplyEvent` reflexivo con cache. Dos matices del real: (a) usa `Activator.CreateInstance(typeof(T), nonPublic: true)` (en vez de `new T()`) para poder instanciar agregados con **constructor protegido**; (b) las sobrecargas de *time-travel* (por versión/fecha) lanzan `NotImplementedException` — un test double implementa **solo lo necesario**.

---

## 🔍 Comprueba

```csharp
var store = new TestStore();
store.AppendPreviousEvents("emp-7",
    new EmpresaRegistrada("Constructora Andes", "Básico"),
    new EmpresaSuspendida("falta de pago"));

var emp = store.GetAggregateRoot<Empresa>("emp-7");
Console.WriteLine($"{emp!.Nombre}, plan {emp.Plan}, suspendida={emp.Suspendida}");
```

> **¿Lo lograste?** Deberías ver `Constructora Andes, plan Básico, suspendida=True`. Sembraste dos hechos como "pasado" y el `TestStore` rehidrató la empresa **reproduciéndolos por reflexión** — sin Postgres, sin Marten.

---

## ✅ Compruébalo

- [ ] Un `TestStore` con `_previos` (Given) y `_nuevos` (Then), que implementa `IEventStore` (lo que tu handler use).
- [ ] `GetAggregateRoot<T>` rehidrata re-aplicando la historia sembrada.
- [ ] `ApplyEvent` usa **reflexión** (busca `Apply(tipo)` por `MethodInfo`, cacheado), no un `switch`.
- [ ] Explicas por qué aquí la reflexión es buena elección (test: flexibilidad > rendimiento de arranque).
- [ ] Sabes que es el `TestStore` de la plantilla (con `Activator.CreateInstance(nonPublic:true)` y las sobrecargas no implementadas).

---

## 🧠 En una frase

Como tus handlers dependen de `IEventStore`, los pruebas con un **`TestStore` en memoria** que siembra hechos previos (Given), expone los nuevos (Then) y rehidrata **reproduciéndolos por reflexión** —rápido, determinista, sin Postgres— justo el doble de test que trae la plantilla.

---

[⬅️ Volver: El tenant viaja con el mensaje](./28-tenant-viaja-con-el-mensaje.md)

[➡️ Siguiente: Given-When-Then (probar decisiones)](./30-given-when-then.md)
