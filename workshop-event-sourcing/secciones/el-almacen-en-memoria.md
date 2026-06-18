# El almacén en memoria (Event Store)

Tu `EventStream` ya **lee** (`Get`), **escribe** (`Append`) y **numera** (el sobre `EventoAlmacenado`) la historia de **una** empresa, y un Command Handler orquesta el ciclo. Pero todo eso vive sobre **un** stream suelto. Con **mil** empresas tendrías mil streams sueltos flotando en el programa. Falta un **almacén central** que custodie la historia de **todas** y te dé la correcta por su **id** — y que, ahora que habrá varios escritores, **detecte los choques**.

## 🎯 El Objetivo

Un único almacén que custodie y entregue la historia de **cualquier** empresa por su **id**; y que el Command Handler busque la empresa por id en vez de cargar un stream suelto.

## Cada empresa, su id

Para guardar muchas historias juntas, primero hay que poder **distinguirlas**: cada empresa necesita un **`Id`**. Hasta ahora una empresa era solo su estado y vivía en un único stream —no le hacía falta—; ahora que vamos a guardar miles, el id es imprescindible. Se lo damos a la clase base:

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

El almacén guarda los hechos de **cada empresa en su propio cajón**, rotulado con su id. En C#, eso es un **`Dictionary`**: la llave es el id; el valor, la lista ordenada de **sobres** (`EventoAlmacenado`, que ya conoces de [El Command Handler](el-command-handler.md)) de esa empresa.

> 🛠️ **Inténtalo tú.** Crea la clase `InMemoryEventStore` (vive en RAM) con un `Dictionary<string, List<EventoAlmacenado>>` (la llave = el id). Dale dos métodos donde **el id es un parámetro**: `GetEvents(string aggregateId)` que devuelve la lista de ese cajón (o vacía si no existe), y `AppendEvent(string aggregateId, EventoAlmacenado evento)` que mete el sobre en ese cajón.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class InMemoryEventStore
{
    private readonly Dictionary<string, List<EventoAlmacenado>> _cajones = new();

    public IEnumerable<EventoAlmacenado> GetEvents(string aggregateId) =>
        _cajones.GetValueOrDefault(aggregateId) ?? Enumerable.Empty<EventoAlmacenado>();

    public void AppendEvent(string aggregateId, EventoAlmacenado evento)
    {
        var cajon = _cajones.GetValueOrDefault(aggregateId) ?? new();
        _cajones[aggregateId] = cajon;
        cajon.Add(evento);
    }
}
```
</details>

Fíjate: el **id es siempre un parámetro**. Tanto para leer como para escribir, le dices al almacén **de qué cajón** hablas. El almacén no sabe de empresas ni de replay: solo guarda y entrega cajones por su rótulo. Es de **bajo nivel** — la app no lo tocará directo; para eso está el stream.

> [!NOTE]
> 🌱 **Semilla — ¿y una interfaz `IEventStore`?** Todavía **no**. Una interfaz solo gana su sueldo cuando hay **algo que varía detrás de ella** (varias implementaciones, o un test que mete una versión falsa). Hoy hay **una sola** implementación. Cuando cambiemos este almacén por una base de datos real **sin tocar el resto del código**, ahí sí extraeremos `IEventStore`. Abstraer tiene su momento, y no es este.

## El `EventStream`: ahora el almacén te lo entrega

Hasta [El Command Handler](el-command-handler.md), tu `EventStream` era **dueño** de su propia lista. Ahora que los hechos viven en el **almacén central**, el stream deja de guardarlos y **delega**: se lo **pides** al almacén con un id, y él te lo entrega ya conectado.

```csharp
var stream = store.AbrirStream<Empresa>("emp-7");   // "almacén, dame el stream de la empresa emp-7"
```

A partir de ahí solo lees o escribes con ese stream; **nunca vuelves a mencionar el almacén ni el id**. ¿Cómo? El propio almacén se incluye a sí mismo (`this`) al entregártelo:

```csharp
// dentro de InMemoryEventStore: el método que te entrega el stream ya conectado
public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
    => new(this, aggregateId);   // ← el almacén se incluye a sí mismo; por eso el stream sabe volver a él
```

```csharp
// 🔁 Reemplaza el EventStream<T> de «El Command Handler»: ya no guarda la lista; habla con el almacén
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly InMemoryEventStore _store;
    private readonly string _aggregateId;       // el id del cajón de esta empresa
    private int _version;                        // la versión cargada (la lee al cargar, la sube al escribir)

    public EventStream(InMemoryEventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()                       // LEER: trae el cajón, recuerda la versión y rehidrata
    {
        var entidad = new T { Id = _aggregateId };
        var sobres  = _store.GetEvents(_aggregateId).ToList();
        entidad.Load(sobres.Select(s => s.EventData));            // desenvuelve: solo el hecho
        _version = sobres.Count == 0 ? 0 : sobres[^1].Version;    // recuerda la última posición
        return entidad;
    }

    public void Append(object hecho)     // ESCRIBIR: el hecho ocupa la siguiente posición
    {
        _version++;
        _store.AppendEvent(_aggregateId, new(_version, DateTime.UtcNow, hecho));
    }
}
```

Con esto, el id deja de estar enredado: es **uno solo** —el id de la empresa— y aparece en tres momentos, siempre el **mismo valor**:

1. Se lo das al **almacén** al pedir el stream (`store.AbrirStream<Empresa>("emp-7")`).
2. El **stream** se lo pasa al almacén en cada `GetEvents`/`AppendEvent` → es la **llave del cajón**.
3. El **stream** se lo **estampa** a la empresa al cargarla → es su **identidad**.

Llave del diccionario, parámetro del almacén e identidad del agregado **son el mismo valor**. No son tres ids; es uno que tú entregas una vez y viaja solo.

> [!NOTE]
> 🌱 **Semilla — este `EventStream` es un andamio nuestro.** Nos sirve para hacer visible el ciclo (cargar → escribir) y llevar la cuenta de la versión. Pero el almacén de verdad (el que adoptaremos) **no te entrega un objeto así**: te da **directamente la empresa** ya rehidratada, y guardas pidiéndole al propio almacén que persista. Cuando lleguemos ahí, el `EventStream` **desaparece** ([El almacén directo](el-almacen-directo.md)). Anótalo: este objeto es un peldaño, no la meta.

## El handler ya no carga un stream suelto: lo busca por id

Ahora el Command Handler recibe el **almacén** (no un stream suelto) y abre el stream de la empresa que el comando indica. Y por eso **el comando recupera su `EmpresaId`**:

```csharp
// 🔁 el comando ahora dice de QUÉ empresa habla
public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);

// 🔁 el handler recibe el almacén y abre el stream por id
public class SuspenderHandler(InMemoryEventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public void Handle(SuspenderEmpresa cmd)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);   // buscar por id
        var empresa = stream.Get();
        var hecho   = empresa.Suspender(cmd.Motivo);
        if (hecho is not null) stream.Append(hecho);
    }
}
```

## Probémoslo: un almacén, muchas empresas

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

Ahora que hay varios escritores, mira el dolor. Dos peticiones abren su propio stream de "Constructora Andes" **al mismo tiempo**, cada una la rehidrata, decide algo y lo escribe:

```csharp
var a = store.AbrirStream<Empresa>("emp-7");
var b = store.AbrirStream<Empresa>("emp-7");
a.Get();   // A carga la empresa
b.Get();   // B la carga al mismo tiempo (la ve igual que A)

a.Append(new EmpresaSuspendida("falta de pago"));   // A la suspende
b.Append(new PlanCambiado("Enterprise"));            // B le cambia el plan
```

Ambas escrituras entran tan tranquilas. Pero **B decidió "Enterprise" mirando una empresa que A acababa de suspender** — trabajó sobre un estado que ya no era cierto, y nadie se dio cuenta. Aquí cobra sentido la **versión** que ya pones en cada sobre ([El Command Handler](el-command-handler.md)): cada hecho declara **en qué posición** entra; si esa posición ya está ocupada, es que alguien escribió primero. El almacén lo **rechaza**:

```csharp
public class ConcurrencyException(string mensaje) : Exception(mensaje);

// 🔁 AppendEvent valida la versión antes de aceptar
public void AppendEvent(string aggregateId, EventoAlmacenado evento)
{
    var cajon = _cajones.GetValueOrDefault(aggregateId) ?? new();
    var versionActual = cajon.Count == 0 ? 0 : cajon[^1].Version;   // cajon[^1] = el último elemento

    if (evento.Version != versionActual + 1)
        throw new ConcurrencyException(
            $"Esperaba la versión {versionActual + 1}, pero llegó la {evento.Version}. " +
            "Alguien escribió primero: recarga la empresa y reintenta.");

    _cajones[aggregateId] = cajon;
    cajon.Add(evento);
}
```

Ahora el choque se nota: si "Constructora Andes" va en la versión 2, `a.Append` escribe la 3 (entra), y `b.Append` —que también cree que le toca la 3— **choca** y lanza `ConcurrencyException` en vez de pisar a A en silencio.

> [!NOTE]
> Esto que construiste tiene nombre: **control de concurrencia optimista**. **¿Por qué "optimista"?** Asumes que los choques son **raros**, así que **no bloqueas** a nadie mientras trabaja (eso sería *pesimista*, y cuesta caro). Dejas que todos avancen y solo **al guardar** verificas la versión; si chocó, **fallas y reintentas** (recargar → reaplicar → reintentar).
>
> 🌱 En producción no lo escribes a mano: las librerías que adoptaremos hacen exactamente esta verificación de "versión esperada" por ti al guardar un stream.

---

### El Descubrimiento

La arquitectura ya refleja la verdad del patrón: un **almacén central** (`InMemoryEventStore`) con un **cajón por empresa rotulado con su id**, un **`EventStream`** que te entrega el almacén para leer (`Get`) y escribir (`Append`) la historia de una de ellas, y un **handler** que busca la empresa por id.

```
InMemoryEventStore
   ├── "emp-7" → [EmpresaRegistrada, PlanCambiado, EmpresaSuspendida, …]
   ├── "emp-9" → [EmpresaRegistrada, …]
   └── "emp-…" → […]
```

El id es **uno solo** —el rótulo del cajón— que viaja del handler al stream y al almacén. Y la `Version` que numeraba los hechos resultó ser el **detector de conflictos**.

> [!NOTE]
> 🌱 **Semilla — reconstruir el estado es solo UNA vista de los eventos.** `Get()` recorre los hechos para armar el objeto `Empresa`. Pero de **esos mismos** hechos podrías derivar otras vistas: un *listado de empresas por estado*, un *conteo de suspensiones por mes*… A cada vista derivada se le llama **proyección**, y a separar el modelo de escritura (los eventos) del de lectura (las proyecciones) se le llama **CQRS**. Lo veremos a fondo; por ahora: **el estado actual es solo una de muchas vistas que puedes sacar del diario**.

Queda una fragilidad: este almacén vive en RAM —**si el servidor se reinicia, se pierde todo**— y hablar con una base de datos real es **I/O que tarda**. En la próxima sección enfrentamos ese mundo: la espera, y por qué cambia la forma de nuestro código.

---

## ✅ Compruébalo

- [ ] `dotnet run` escribe y lee **dos** empresas distintas (`emp-7`, `emp-9`) **siempre a través del stream**, nunca tocando el `store` directo.
- [ ] El comando recuperó su `EmpresaId` y el handler abre el stream **por ese id** desde el almacén.
- [ ] Confirma que el id es **uno solo**: la llave del diccionario, el parámetro del stream y el `Id` de la empresa son el **mismo valor**.
- [ ] Provoca el choque con **dos streams** sobre `emp-7` (ambos `Get`, ambos `Append`): el segundo lanza `ConcurrencyException`.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** abre dos streams de la misma empresa, `Get` en ambos, `Append` en ambos. ¿Qué excepción salta y por qué? ¿Qué tres caras tiene el mismo id?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El almacén en memoria" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Un **almacén** (`InMemoryEventStore`: un cajón de sobres por id) custodia las historias de **muchas** empresas; el **`EventStream`** —que ahora te **entrega** el almacén— lee (`Get`) y escribe (`Append`) la de una; el **handler** la busca por **id**; y al guardar se verifica la **versión esperada** (**concurrencia optimista**) para que dos escrituras simultáneas no se pisen.

---

[⬅️ Volver: El Command Handler](./el-command-handler.md)

[➡️ Siguiente: El tiempo de espera (async/await)](./el-tiempo-de-espera.md)
