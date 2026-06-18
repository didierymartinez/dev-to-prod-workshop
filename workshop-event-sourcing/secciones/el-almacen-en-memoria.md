# El almacén en memoria (Event Store)

El `EventStream<T>` ([El flujo de vida](el-flujo-de-vida.md)) ya **lee** (`Get`) y **escribe** (`Append`) la historia de **una** empresa — pero guarda sus hechos en su **propia lista**. Con 1.000 empresas tendrías 1.000 streams, cada uno con su lista suelta flotando en el programa. Falta un **almacén central** que custodie las historias de todas; el stream seguirá siendo tu puerta de lectura y escritura, pero los hechos se **mudarán** ahí.

## 🎯 El Objetivo

Un único almacén que custodie y entregue la historia de **cualquier** empresa por su id; y que el `EventStream` —el que ya lee (`Get`) y escribe (`Append`) desde [El flujo de vida](el-flujo-de-vida.md)— deje de guardar en su lista propia y **delegue** en ese almacén.

## Cada empresa, su id

Para guardar muchas historias juntas, primero hay que poder **distinguirlas**: cada empresa necesita un **`Id`**. Hasta [El flujo de vida](el-flujo-de-vida.md) una empresa era solo su estado —no le hacía falta—; ahora que vamos a guardar miles, el id es imprescindible. Se lo damos a la clase base:

```csharp
// 🔁 AggregateRoot ahora lleva un Id
public abstract class AggregateRoot
{
    public string Id { get; set; } = "";
    public void Load(IEnumerable<object> historia) { foreach (var h in historia) Aplicar(h); }
    protected abstract void Aplicar(object hecho);
}
```

## El almacén: un cajón por empresa

El almacén guarda los hechos de **cada empresa en su propio cajón**, rotulado con su id. En C#, eso es un **`Dictionary`**: la llave es el id; el valor, la lista ordenada de hechos de esa empresa.

> 🛠️ **Inténtalo tú.** Crea la clase concreta `InMemoryEventStore` (vive en RAM) con un `Dictionary<string, List<object>>` (la llave = el id). Dale dos métodos donde **el id es un parámetro**: `GetEvents(string aggregateId)` que devuelve la lista de ese cajón (o una lista vacía si no existe), y `AppendEvent(string aggregateId, object hecho)` que mete el hecho en ese cajón (creándolo si es el primero). *(Pistas: `_cajones.GetValueOrDefault(id)` y `_cajones.TryGetValue(id, out var cajon)`.)*

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class InMemoryEventStore
{
    private readonly Dictionary<string, List<object>> _cajones = new();

    // dame los hechos del cajón rotulado con este id
    public IEnumerable<object> GetEvents(string aggregateId) =>
        _cajones.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<object>();

    // mete este hecho en el cajón rotulado con este id (lo abre si no existía)
    public void AppendEvent(string aggregateId, object hecho)
    {
        if (!_cajones.TryGetValue(aggregateId, out var cajon))
            _cajones[aggregateId] = cajon = new();
        cajon.Add(hecho);
    }
}
```
</details>

Fíjate: el **id es siempre un parámetro**. Tanto para leer (`GetEvents(id)`) como para escribir (`AppendEvent(id, …)`), le dices al almacén **de qué cajón** hablas. El almacén no sabe de empresas ni de replay: solo guarda y entrega cajones por su rótulo. Es de **bajo nivel** — la app no lo tocará directo; para eso está el stream.

> [!NOTE]
> 🌱 **Semilla — ¿y una interfaz `IEventStore`?** Todavía **no**. Una interfaz solo gana su sueldo cuando hay **algo que varía detrás de ella** (varias implementaciones, o un test que mete una versión falsa —un *doble*—). Hoy hay **una sola** implementación —esta, de memoria—, y una interfaz con una única implementación es ceremonia. Cuando cambiemos este almacén por una base de datos real **sin tocar el resto del código**, ahí sí extraeremos `IEventStore`. Abstraer tiene su momento, y no es este.

## El `EventStream`: el almacén te lo entrega

El `EventStream` ya lo conoces ([El flujo de vida](el-flujo-de-vida.md)): lee (`Get`) y escribe (`Append`). Lo único que cambia ahora es **de dónde** saca y guarda los hechos — ya no de su lista propia, sino del almacén. Y el enlace es más simple de lo que parecía: **tú no lo construyes ni le pasas el almacén**. Se lo **pides** al almacén, y él te lo entrega ya conectado:

```csharp
var stream = store.AbrirStream<Empresa>("emp-7");   // "almacén, dame el stream de la empresa emp-7"
```

A partir de ahí solo lees o escribes con ese stream; **nunca vuelves a mencionar el almacén ni el id**. ¿Cómo funciona por dentro? Guarda el almacén y el id —los necesita para hablarle al almacén—, pero fíjate **quién** se los pone: el propio almacén, al incluirse a sí mismo (`this`) cuando te lo entrega. Tú no.

```csharp
// dentro de InMemoryEventStore: el método que te entrega el stream ya conectado
public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
    => new(this, aggregateId);   // ← el almacén se incluye a sí mismo; por eso el stream sabe volver a él
```

> 💡 `new(this, aggregateId)` (sin el tipo delante) es *target-typed new*: como el método devuelve `EventStream<T>`, C# deduce que **eso** es lo que se crea, y te ahorra repetirlo.

```csharp
// 🔁 Reemplaza el EventStream<T> de «El flujo de vida»: ya no guarda una lista; habla con el almacén
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly InMemoryEventStore _store;
    private readonly string _aggregateId;       // el id del cajón de esta empresa

    // lo crea el almacén en AbrirStream; tú no lo construyes a mano
    public EventStream(InMemoryEventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()                       // LEER: trae el cajón y rehidrata
    {
        var entidad = new T { Id = _aggregateId };
        entidad.Load(_store.GetEvents(_aggregateId));   // ← le pasa el id al almacén
        return entidad;
    }

    public void Append(object hecho)     // ESCRIBIR: mete un hecho en el cajón
        => _store.AppendEvent(_aggregateId, hecho);     // ← le pasa el mismo id al almacén
}
```

Con esto, el id deja de estar enredado: es **uno solo** —el id de la empresa— y aparece en tres momentos, siempre el **mismo valor**:

1. Se lo das al **almacén** al pedir el stream (`store.AbrirStream<Empresa>("emp-7")`).
2. El **stream** se lo pasa al almacén en cada `GetEvents`/`AppendEvent` → es la **llave del cajón**.
3. El **stream** se lo **estampa** a la empresa al cargarla → es su **identidad**.

Llave del diccionario, parámetro del almacén e identidad del agregado **son el mismo valor**: el id de la empresa. No son tres ids; es uno que tú entregas una vez y viaja solo.

> [!NOTE]
> 🌱 **Semilla — este `EventStream` es un andamio nuestro.** Nos sirve para hacer visible el ciclo (cargar → escribir) y para llevar la cuenta de la versión. Pero el almacén de verdad (el que adoptaremos) **no te entrega un objeto así**: te da **directamente la empresa** ya rehidratada, y guardas pidiéndole al propio almacén que persista los cambios. Cuando lleguemos ahí, el `EventStream` **desaparece** en favor de esas llamadas directas. Anótalo: este objeto es un peldaño, no la meta.

## Probémoslo: un almacén, muchas empresas

Escribimos y leemos **siempre por el stream** —como ya hacías en [El flujo de vida](el-flujo-de-vida.md); lo nuevo es que ahora hay **muchas** empresas, cada una con su **id** (los hechos aún los fabricamos a mano; la empresa aprenderá a emitirlos en [Decidir el futuro](decidir-el-futuro.md)):

```csharp
var store = new InMemoryEventStore();

var s7 = store.AbrirStream<Empresa>("emp-7");
s7.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
s7.Append(new PlanCambiado("Premium"));

var s9 = store.AbrirStream<Empresa>("emp-9");
s9.Append(new EmpresaRegistrada("Interprensa", "Básico"));

var andes = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"{andes.Id}: {andes.Nombre}, plan {andes.Plan}");
// emp-7: Constructora Andes, plan Premium
```

`dotnet run`: dos empresas en el mismo almacén, cada una en su cajón, sin un solo acceso directo al store.

## 🔧 ¿Y si dos peticiones tocan la misma empresa a la vez?

Mira el dolor. Dos peticiones abren su propio stream de "Constructora Andes" **al mismo tiempo**, cada una la rehidrata, decide algo y lo escribe:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");
var b = store.AbrirStream<Empresa>("emp-7");
a.Get();   // A carga la empresa
b.Get();   // B la carga al mismo tiempo (la ve igual que A)

a.Append(new EmpresaSuspendida("falta de pago"));   // A la suspende
b.Append(new PlanCambiado("Enterprise"));            // B le cambia el plan
```

Ambas escrituras entran tan tranquilas. Pero **B decidió "Enterprise" mirando una empresa que A acababa de suspender** — trabajó sobre un estado que ya no era cierto, y nadie se dio cuenta. Para atrapar esto, cada hecho debería declarar **en qué posición** entra en el cajón; si esa posición ya está ocupada, es que alguien escribió primero.

Esa posición es la **versión**. Y para llevarla pegada a cada hecho, por fin necesitamos un **sobre** que lo envuelva:

```csharp
// el sobre nace aquí: envuelve el hecho con su POSICIÓN en el cajón (y cuándo se anotó)
public record EventoAlmacenado(int Version, DateTime Timestamp, object EventData);
```

> 💡 El sobre **no** lleva el id de la empresa: el cajón en el que vive **ya es** su empresa. Solo añade lo que el hecho por sí mismo no sabe: su posición y su fecha.

El almacén ahora guarda **sobres** y **rechaza** uno cuya posición ya esté ocupada:

```csharp
public class ConcurrencyException(string mensaje) : Exception(mensaje);

// 🔁 el cajón guarda sobres, y AppendEvent valida la versión antes de aceptar
private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

public IEnumerable<EventoAlmacenado> GetEvents(string aggregateId) =>
    _cajones.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<EventoAlmacenado>();

public void AppendEvent(string aggregateId, EventoAlmacenado evento)
{
    var cajon = _cajones.GetValueOrDefault(aggregateId) ?? new();
    var versionActual = cajon.Count == 0 ? 0 : cajon[^1].Version;

    if (evento.Version != versionActual + 1)
        throw new ConcurrencyException(
            $"Esperaba la versión {versionActual + 1}, pero llegó la {evento.Version}. " +
            "Alguien escribió primero: recarga la empresa y reintenta.");

    _cajones[aggregateId] = cajon;
    cajon.Add(evento);
}
```

Y el stream lleva la cuenta de la versión (la lee al cargar, la incrementa al escribir) y **desenvuelve** el sobre al leer —al agregado le interesa el hecho, no el sobre—:

```csharp
// 🔁 el stream rastrea la versión y desenvuelve los sobres
private int _version;

public T Get()
{
    var entidad = new T { Id = _aggregateId };
    var sobres  = _store.GetEvents(_aggregateId).ToList();
    entidad.Load(sobres.Select(s => s.EventData));            // desenvuelve: solo el hecho
    _version = sobres.Count == 0 ? 0 : sobres[^1].Version;    // recuerda la última posición
    return entidad;
}

public void Append(object hecho)
{
    _version++;                                               // el hecho ocupa la siguiente posición
    _store.AppendEvent(_aggregateId, new(_version, DateTime.UtcNow, hecho));
}
```

> 📦 **Cómo quedan tus dos clases, completas.** Los `🔁` de arriba son cambios sueltos; aquí está el resultado **ensamblado** — esto es lo que debe quedar en tu código (fíjate que `InMemoryEventStore` **conserva** su `AbrirStream`):
>
> ```csharp
> public class InMemoryEventStore
> {
>     private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();
>
>     public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
>         => new(this, aggregateId);
>
>     public IEnumerable<EventoAlmacenado> GetEvents(string aggregateId) =>
>         _cajones.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<EventoAlmacenado>();
>
>     public void AppendEvent(string aggregateId, EventoAlmacenado evento)
>     {
>         var cajon = _cajones.GetValueOrDefault(aggregateId) ?? new();
>         var versionActual = cajon.Count == 0 ? 0 : cajon[^1].Version;   // cajon[^1] = el último elemento
>         if (evento.Version != versionActual + 1)
>             throw new ConcurrencyException(
>                 $"Esperaba la versión {versionActual + 1}, pero llegó la {evento.Version}. Recarga y reintenta.");
>         _cajones[aggregateId] = cajon;
>         cajon.Add(evento);
>     }
> }
>
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
>     public T Get()
>     {
>         var entidad = new T { Id = _aggregateId };
>         var sobres  = _store.GetEvents(_aggregateId).ToList();
>         entidad.Load(sobres.Select(s => s.EventData));
>         _version = sobres.Count == 0 ? 0 : sobres[^1].Version;
>         return entidad;
>     }
>
>     public void Append(object hecho)
>     {
>         _version++;
>         _store.AppendEvent(_aggregateId, new(_version, DateTime.UtcNow, hecho));
>     }
> }
> ```
> (`cajon[^1]` es el **último** elemento de la lista — el índice "desde el final" de C#.)

Ahora el choque se nota: si "Constructora Andes" va en la versión 2, `a.Append` escribe la 3 (entra), y `b.Append` —que también cree que le toca la 3— **choca** y lanza `ConcurrencyException` en vez de pisar a A en silencio.

> [!NOTE]
> (`ConcurrencyException(string mensaje) : Exception(mensaje)` usa un **constructor primario** —C# moderno—: recibe el `mensaje` y se lo pasa a `Exception`.)
>
> Esto que construiste tiene nombre: **control de concurrencia optimista**. **¿Por qué "optimista"?** Asumes que los choques son **raros**, así que **no bloqueas** a nadie mientras trabaja (eso sería *pesimista*, y cuesta caro). Dejas que todos avancen y solo **al guardar** verificas la versión; si chocó, **fallas y reintentas** (recargar → reaplicar → reintentar). El reintento lo construirás cuando el agregado emita sus propios hechos (próxima sección).
>
> 🌱 En producción no lo escribes a mano: las librerías que adoptaremos hacen exactamente esta verificación de "versión esperada" por ti al guardar un stream.

---

### El Descubrimiento

La arquitectura ya refleja la verdad del patrón: un **almacén central** (`InMemoryEventStore`) con un **cajón por empresa rotulado con su id**, y un **`EventStream`** que es el objeto con el que lees (`Get`) y escribes (`Append`) la historia de una de esas empresas, pasándole su id al almacén en cada llamada.

```
InMemoryEventStore
   ├── "emp-7" → [EmpresaRegistrada, PlanCambiado, EmpresaSuspendida, …]
   ├── "emp-9" → [EmpresaRegistrada, …]
   └── "emp-…" → […]
```

El id no está enredado: es **uno solo** —el rótulo del cajón— que tú le das al stream, el stream le pasa al almacén, y el stream le estampa a la empresa. Y la `Version`, que parecía un número de orden, resultó ser el **detector de conflictos**.

> [!NOTE]
> 🌱 **Semilla — reconstruir el estado es solo UNA vista de los eventos.** `Get()` recorre los hechos para armar el objeto `Empresa`. Pero de **esos mismos** hechos podrías derivar otras vistas: un *listado de empresas por estado*, un *conteo de suspensiones por mes*… A cada vista derivada de los eventos se le llama **proyección**, y a separar el modelo de escritura (los eventos) del de lectura (las proyecciones) se le llama **CQRS**. Lo veremos a fondo; por ahora: **el estado actual es solo una de muchas vistas que puedes sacar del diario**.

Quedan dos fragilidades que resolveremos enseguida:
1. Este almacén vive en RAM: **si el servidor se reinicia, se pierde todo**.
2. Aún **fabricamos los hechos a mano** y se los pasamos al stream. ¿Pero quién decide que "Constructora Andes" *puede* suspenderse, y produce ese hecho? Eso le toca a la propia empresa. En la próxima sección, el agregado tomará el control de **emitir** sus eventos — y el stream, que ya sabe escribir, los guardará.

---

## ✅ Compruébalo

- [ ] `dotnet run` escribe y lee **dos** empresas distintas (`emp-7`, `emp-9`) **siempre a través del stream**, nunca tocando el `store` directo.
- [ ] Explica en una frase el enlace stream↔almacén: el stream guarda el **id** de su cajón y se lo **pasa al almacén** en cada `GetEvents`/`AppendEvent`.
- [ ] Confirma que el id es **uno solo**: la llave del diccionario, el parámetro del stream y el `Id` que se le estampa a la empresa son el **mismo valor**.
- [ ] Provoca el choque con **dos streams** sobre `emp-7` (ambos `Get`, ambos `Append`): el segundo lanza `ConcurrencyException`.

---

## 🧠 En una frase

Un **almacén** (`InMemoryEventStore`: un cajón de hechos por id) custodia las historias; el **`EventStream`** es el objeto con el que lees (`Get`) y escribes (`Append`) la historia de una empresa —se lo pides al almacén con su id y él se lo pasa al almacén en cada llamada—; y al guardar se verifica la **versión esperada** (**concurrencia optimista**) para que dos escrituras simultáneas no se pisen en silencio.

---

[⬅️ Volver: El flujo de vida (EventStream)](./el-flujo-de-vida.md)

[➡️ Siguiente: Decidir el futuro (emitir eventos)](./decidir-el-futuro.md)
