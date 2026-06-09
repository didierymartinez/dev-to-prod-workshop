# 05 · El almacén en memoria (Event Store)

El `EventStream<T>` maneja muy bien la historia de **una** empresa. Pero quedó un cuello de botella: si tienes 1.000 empresas, tendrías 1.000 listas sueltas flotando en el programa. Falta un **archivero central** que las custodie a todas.

## 🎯 El Objetivo

Un único almacén que guarde y entregue los eventos de **cualquier** empresa por su `Id`, y un **contrato** claro de cómo se hace — para que el `EventStream` deje de cargar su propia lista y le pida los eventos al archivero.

## El sobre, ahora con versión

Un archivero con miles de cajones necesita un dato más en cada sobre: **en qué posición** va dentro de su cajón, para no perder el orden. Le añadimos un número de **versión** al sobre de la sección anterior:

```csharp
// 🔁 Reemplaza el EventoAlmacenado de la §04 por este (le agregamos Version como 2º campo)
public record EventoAlmacenado(
    string   AggregateId,  // ¿de qué empresa es?
    int      Version,      // ¿en qué posición va dentro de su cajón? (1, 2, 3, …)
    DateTime Timestamp,    // ¿cuándo se archivó?
    object   EventData     // el hecho (EmpresaRegistrada, …)
);
```

La `Version` es **por empresa**: el primer hecho de cada una es la 1, el siguiente la 2, y así. Por eso, en los ejemplos de abajo, `emp-7` y `emp-9` arrancan **ambas** en 1. (Más adelante verás que ese número, además de ordenar, sirve para algo importante.)

## El contrato: `IEventStore`

El archivero no sabe nada de `Empresa`, ni de planes ni de suspensiones. Solo entiende de **ids** (dame el cajón de esta empresa) y de **sobres** (`EventoAlmacenado`). Eso es justo lo que define una interfaz:

```csharp
public interface IEventStore
{
    IEnumerable<EventoAlmacenado> GetEvents(string aggregateId);  // dame la historia de esta empresa
    void AppendEvent(EventoAlmacenado evento);                    // archiva un hecho al final de su cajón
}
```

## La implementación: un diccionario en memoria

¿Cómo agrupamos muchos cajones, uno por empresa? Con un **`Dictionary`**: la llave es el `Id` de la empresa, el valor es su lista ordenada de sobres. Esta primera versión vive solo en RAM (perfecta para desarrollar):

```csharp
public class InMemoryEventStore : IEventStore
{
    // el archivero: cada empresa (su Id) tiene su propio cajón de sobres
    private readonly Dictionary<string, List<EventoAlmacenado>> _almacen = new();

    public IEnumerable<EventoAlmacenado> GetEvents(string aggregateId) =>
        // si esa empresa aún no tiene cajón, devolvemos lista vacía en vez de null
        _almacen.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<EventoAlmacenado>();

    public void AppendEvent(EventoAlmacenado evento)
    {
        if (!_almacen.TryGetValue(evento.AggregateId, out var cajon))
            _almacen[evento.AggregateId] = cajon = new();   // primer hecho de esa empresa: abrimos su cajón
        cajon.Add(evento);
    }
}
```

## Conectar el `EventStream` al almacén

Ahora el `EventStream<T>` ya **no** carga su propia lista: le pide los eventos al `IEventStore`. Es un cambio pequeño pero importante — el stream pasa de "dueño de una lista" a "ventana enfocada a una empresa dentro del archivero":

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly IEventStore _store;
    private readonly string _aggregateId;

    public EventStream(IEventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()
    {
        var entidad = new T { Id = _aggregateId };
        var eventos = _store.GetEvents(_aggregateId);     // los pide al almacén central
        entidad.Load(eventos.Select(e => e.EventData));   // y reproduce la historia
        return entidad;
    }
}
```

> 🔁 Reemplaza la clase `EventStream<T>` de la §04 por esta, y **borra** de tu `Program.cs` el bloque viejo `var eventos = …; var flujo = new EventStream<Empresa>(eventos, …)`: ahora el stream se alimenta del `store`, como ves enseguida.

## Todo junto: un almacén, muchas empresas

```csharp
IEventStore store = new InMemoryEventStore();   // UN solo archivero para toda la app

// (simulamos historia ya guardada de dos empresas distintas)
store.AppendEvent(new("emp-7", 1, DateTime.UtcNow, new EmpresaRegistrada("emp-7", "Constructora Andes", "Básico")));
store.AppendEvent(new("emp-7", 2, DateTime.UtcNow, new PlanCambiado("Premium")));
store.AppendEvent(new("emp-9", 1, DateTime.UtcNow, new EmpresaRegistrada("emp-9", "Interprensa", "Básico")));

// cada stream es una ventana enfocada a UNA empresa dentro del mismo archivero
var andes       = new EventStream<Empresa>(store, "emp-7").Get();
var interprensa = new EventStream<Empresa>(store, "emp-9").Get();

Console.WriteLine($"{andes.Nombre}: plan {andes.Plan}");             // Constructora Andes: plan Premium
Console.WriteLine($"{interprensa.Nombre}: plan {interprensa.Plan}"); // Interprensa: plan Básico
```

`dotnet run` y verás las dos empresas reconstruidas desde el mismo almacén, sin listas sueltas. Escalable a una o a un millón.

## 🔧 ¿Y si dos procesos tocan la misma empresa a la vez?

Mira este dolor. Dos peticiones leen a "Constructora Andes" **al mismo tiempo** (ambas la ven en su versión 2) y cada una guarda lo suyo:

```csharp
// 💥 los dos creen que les toca la versión 3
store.AppendEvent(new("emp-7", 3, DateTime.UtcNow, new EmpresaSuspendida("falta de pago"))); // proceso A
store.AppendEvent(new("emp-7", 3, DateTime.UtcNow, new PlanCambiado("Enterprise")));          // proceso B
```

Con el almacén de arriba, **ambos entran**: ahora hay dos "versión 3" en el cajón y el orden quedó ambiguo. Uno pisó al otro en silencio — un cambio **se perdió**. Ese número de `Version` en el sobre no sirve de nada si **nadie lo verifica**. Hagamos que el almacén **rechace** un hecho cuya versión esperada ya no esté vigente:

```csharp
public class ConcurrencyException(string mensaje) : Exception(mensaje);

public void AppendEvent(EventoAlmacenado evento)
{
    var cajon = _almacen.GetValueOrDefault(evento.AggregateId) ?? new();
    var versionActual = cajon.Count == 0 ? 0 : cajon[^1].Version;   // la última versión archivada

    if (evento.Version != versionActual + 1)
        throw new ConcurrencyException(
            $"Esperaba escribir la versión {versionActual + 1}, pero llegó la {evento.Version}. " +
            "Alguien escribió primero: recarga la empresa y reintenta.");

    _almacen[evento.AggregateId] = cajon;
    cajon.Add(evento);
}
```

Ahora el segundo "versión 3" choca y lanza `ConcurrencyException`. (Esa línea `public class ConcurrencyException(string mensaje) : Exception(mensaje);` usa un **constructor primario** —C# moderno—: recibe el `mensaje` y se lo pasa a `Exception`; es la forma corta de la clase de excepción de toda la vida.) Eso que acabas de construir tiene nombre: **control de concurrencia optimista**.

> [!NOTE]
> **¿Por qué "optimista"?** Asumes que los choques son **raros**, así que **no bloqueas** a nadie mientras trabaja (eso sería *pesimista*, y cuesta caro). Dejas que todos avancen y solo **al guardar** verificas la versión; si chocó, **fallas y reintentas** (recargar → reaplicar → reintentar). Es el detector de conflictos del event sourcing — y la prueba de que la `Version` del sobre no era decorativa. (Ese reintento lo construirás cuando el agregado emita sus propios hechos, más adelante; por ahora basta con ver que el almacén **rechaza** el choque.)
>
> 🌱 En producción no lo escribes a mano: las librerías que adoptaremos hacen esta misma verificación de "versión esperada" por ti al guardar un stream.

---

### El Descubrimiento

La arquitectura ya refleja la verdad del patrón: **un `IEventStore` central** que custodia todos los cajones, y **un `EventStream` por empresa** que es una ventana enfocada a uno de ellos.

```
IEventStore (un archivero para todos)
   ├── "emp-7" → [EmpresaRegistrada, PlanCambiado, EmpresaSuspendida, …]
   ├── "emp-9" → [EmpresaRegistrada, …]
   └── "emp-…" → […]
```

> [!NOTE]
> 🌱 **Semilla — reconstruir el estado es solo UNA vista de los eventos.** `Get()` recorre los hechos para armar el objeto `Empresa`. Pero de **esos mismos** hechos podrías derivar otras vistas: un *listado de empresas por estado*, un *conteo de suspensiones por mes*… A cada vista derivada de los eventos se le llama **proyección**, y a separar el modelo de escritura (los eventos) del de lectura (las proyecciones) se le llama **CQRS**. Lo veremos a fondo; por ahora: **el estado actual es solo una de muchas vistas que puedes sacar del diario**.

Quedan dos fragilidades que resolveremos enseguida:
1. Este almacén vive en RAM: **si el servidor se reinicia, se pierde todo**. (Lo persistiremos de verdad más adelante.)
2. Aún **fabricamos los `EventoAlmacenado` a mano** desde afuera. ¿Pero quién decide que "Constructora Andes" *puede* suspenderse, y emite ese hecho? Eso le toca a la propia empresa. En la próxima sección, el agregado tomará el control de **emitir** sus eventos protegiendo sus reglas.

---

## ✅ Compruébalo

- [ ] `dotnet run` reconstruye **dos** empresas distintas (`emp-7` y `emp-9`) desde **un** `InMemoryEventStore`.
- [ ] Provoca el choque: haz dos `AppendEvent` con la **misma** `Version` para `emp-7` y observa que el segundo lanza `ConcurrencyException`.
- [ ] Explica con tus palabras qué es **concurrencia optimista** y por qué la `Version` en el sobre **no basta** si el almacén no la verifica.
- [ ] Di una vista distinta del estado actual que podrías derivar de los mismos eventos de las empresas.

---

## 🧠 En una frase

Un **`IEventStore`** (aquí, un `Dictionary` en memoria) es el archivero central de todas las historias; cada **`EventStream`** es una ventana a una empresa; y verificar la **versión esperada** al guardar —**concurrencia optimista**— evita que dos escrituras simultáneas se pisen en silencio.

---

[⬅️ Volver: El flujo de vida (EventStream)](./04-el-flujo-de-vida.md)

[➡️ Siguiente: Decidir el futuro (emitir eventos)](./06-decidir-el-futuro.md)
