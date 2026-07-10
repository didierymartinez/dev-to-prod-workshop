# El almacén: un cajón por empresa

Ya tienes un **`Despachador`** que rutea cualquier comando a su handler ([El despachador](el-despachador.md)).

## 💥 El dolor: ¿y cuando nace la segunda empresa?

En [El despachador](el-despachador.md) registraste tus handlers atados a **un** stream:

```csharp
var stream1 = new EventStream<Empresa>();

var despachador = new Despachador();
despachador.Registrar(new SuspenderHandler(stream1));      // ← atado a la empresa 1
despachador.Registrar(new CambiarPlanHandler(stream1));
```

Funciona para **una** empresa. Pero llega la segunda, con su propio `stream2`… ¿registras otra vez?

```csharp
despachador.Registrar(new SuspenderHandler(stream2));   // 💥 MISMA llave: typeof(SuspenderEmpresa)
```

El despachador rutea por **tipo del comando**, así que este `Registrar` **pisa** al de la empresa 1 (misma entrada del diccionario). No caben dos empresas en un mismo despachador.

La causa de fondo no es el despachador. Es que el handler está **atado a un stream**, o sea a **una** empresa (`new SuspenderHandler(stream1)`). Por eso te haría falta uno por empresa. En cambio, si el handler recibiera un **almacén con todas** las empresas y abriera la correcta **por su `id`** (que haremos viajar en el comando en un momento), **un solo** handler serviría a **todas**. Y lo registrarías **una vez**. Ese **almacén central por id** es la pieza que falta.

## 🎯 El Objetivo

Un único almacén que custodie la historia de **cualquier** empresa por su **id**; y que el handler reciba **ese almacén** (no un stream fijo) y abra la empresa que el comando indique. Handlers registrados **una vez**, sirviendo a **todas** las empresas.

## El almacén: un cajón por empresa

El almacén guarda los hechos de **cada empresa en su propio cajón**, rotulado con su id. En C#, eso es un **`Dictionary`**: la llave es el id; el valor, la lista de hechos de esa empresa.

> 🛠️ **Inténtalo tú.** Crea la clase `EventStore` con un `Dictionary<string, List<object>>` (la llave = el id). Dale dos métodos donde **el id es un parámetro**: `GetEvents(string aggregateId)` que devuelve la lista de ese cajón (o una vacía si no existe), y `AppendEvent(string aggregateId, object hecho)` que **crea el cajón si no existe** y mete el hecho.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class EventStore
{
    private readonly Dictionary<string, List<object>> _cajones = new();

    public List<object> GetEvents(string aggregateId)
        => _cajones.ContainsKey(aggregateId) ? _cajones[aggregateId] : new();

    public void AppendEvent(string aggregateId, object hecho)
    {
        if (!_cajones.ContainsKey(aggregateId))   // 1ª vez: crea el cajón EN el diccionario
            _cajones[aggregateId] = new();
        _cajones[aggregateId].Add(hecho);
    }
}
```

> [!WARNING]
> Ojo con dos trampas del `Dictionary`: (1) `_cajones[id]` **lanza** `KeyNotFoundException` si la llave no existe (no devuelve `null`), por eso `GetEvents` comprueba con `ContainsKey`. (2) En `AppendEvent`, crea el cajón **dentro** del diccionario antes de añadir; si añadieras a una lista vacía suelta, el hecho se perdería.
</details>

Fíjate: el **id es siempre un parámetro**. El almacén no sabe de empresas ni de replay: solo guarda y entrega cajones por su rótulo. Es de **bajo nivel**.

> [!WARNING]
> **No llames al almacén directo desde tu handler.** `GetEvents` y `AppendEvent` son plomería interna: los llama el `EventStream` que construyes enseguida. Tu handler usará `stream.Get()` y `stream.Append(hecho)`; al `store` solo le pides el stream con `AbrirStream`. Llamar `store.AppendEvent(id, hecho)` tú mismo **funciona aquí** (el stream solo reenvía), pero es un hábito que se rompe: en [Concurrencia optimista](concurrencia-optimista.md) `AppendEvent` pasa a recibir un **sobre con versión**, y saltarte el stream te salta ese control.

> [!NOTE]
> 🌱 **Semilla — este no será tu único almacén.** El de hoy guarda en RAM, perfecto para aprender. Pero más adelante nacerán **hermanos con otros propósitos**: uno contra una **base de datos real** para producción ([El swap](el-swap.md)) y uno **en memoria pensado para tests** ([El almacén abstracto](el-almacen-abstracto.md)). El día que existan varios, extraeremos una interfaz `IEventStore` para poder **intercambiarlos sin tocar el resto del código**.

## El `EventStream`: ahora el almacén te lo entrega

Hasta [El Command Handler](el-command-handler.md), tu `EventStream` era **dueño** de su propia lista. Ahora los hechos viven en el **almacén central**. El stream deja de guardarlos y **delega**. Le pides al almacén el stream de un id. El stream que recibes guarda por dentro dos cosas: una referencia al almacén y ese id. Así, cuando dices `Get()` o `Append(...)`, el stream ya sabe a qué almacén y de qué cajón hablar. Por dentro llama a `_store.GetEvents(id)` / `_store.AppendEvent(id, …)`.

### Paso 1 · Reescribe el `EventStream` para que delegue

> 🛠️ **Inténtalo tú.** **🔁 Reescribe** el `EventStream<T>` de [El flujo de vida](el-flujo-de-vida.md): que **ya no guarde su lista**. Recibe `(store, id)` por constructor; en `Get()` pide los hechos al almacén (`store.GetEvents(id)`) y rehidrata; en `Append(hecho)` se lo pasa al almacén (`store.AppendEvent(id, hecho)`).

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🔁 Reemplaza el EventStream<T> de «El flujo de vida»: ya no guarda la lista; habla con el almacén
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly EventStore _store;
    private readonly string _aggregateId;

    public EventStream(EventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()                       // LEER: trae los hechos del cajón y rehidrata
    {
        var entidad = new T();
        entidad.Load(_store.GetEvents(_aggregateId));
        return entidad;
    }

    public void Append(object hecho)     // ESCRIBIR: al cajón de esta empresa
        => _store.AppendEvent(_aggregateId, hecho);
}
```
</details>

### Paso 2 · Que el almacén te lo entregue: `AbrirStream`

Quieres poder pedirle el stream al almacén y usarlo así —sin armarlo a mano—:

```csharp
var store = new EventStore();
var s = store.AbrirStream<Empresa>("emp-7");
s.Append(new EmpresaRegistrada("Constructora Andes", "Básico"));
Console.WriteLine(store.AbrirStream<Empresa>("emp-7").Get().Nombre);   // Constructora Andes
```

> 🛠️ **Inténtalo tú.** Haz que ese ejemplo funcione: dale al `EventStore` un método **`AbrirStream<T>(string id)`** que **cree y devuelva** el `EventStream<T>` de ese id, guardándole dentro el almacén y el id. *(Pista: `AbrirStream` vive **dentro** del `EventStore`, así que ahí `this` **es el propio almacén**; pásaselo al stream al crearlo —`new(this, id)`— y el stream lo guardará en `_store` para poder llamarlo después.)*

> [!NOTE]
> 🆕 **Idioma de C# que verás en la solución.**
> - `new(this, aggregateId)` — *target-typed new*: como el tipo de retorno ya dice `EventStream<T>`, no repites el nombre; `new(...)` basta.
> - `AbrirStream<T>(...) where T : AggregateRoot, new()` — la **misma** restricción de `EventStream<T>`, ahora en un **método** genérico (no una clase): el método también necesita poder hacer `new T()`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// AbrirStream vive en EventStore, así que this = el propio almacén; se lo pasamos al stream para que sepa a quién llamar
public EventStream<T> AbrirStream<T>(string aggregateId) where T : AggregateRoot, new()
    => new(this, aggregateId);
```
</details>

> 🔍 **¿Lo lograste?** Corre el ejemplo de arriba: si imprime `Constructora Andes`, la pieza más difícil ya está.

## El handler ya no recibe un stream suelto: lo busca por id

Ahora el handler recibe el **almacén** (no un stream fijo) y abre el stream de la empresa que el comando indica. Y por eso **el comando recupera su `EmpresaId`**:

> 🛠️ **Inténtalo tú.** (1) **🔁** Añade `EmpresaId` a cada comando (`CambiarPlanDeEmpresa`, `SuspenderEmpresa`). (2) **🔁** Cambia los handlers para que reciban el `EventStore` por constructor y abran el stream con `store.AbrirStream<Empresa>(cmd.EmpresaId)`.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// 🔁 el comando ahora dice de QUÉ empresa habla
public record CambiarPlanDeEmpresa(string EmpresaId, string NuevoPlan);
public record SuspenderEmpresa(string EmpresaId, string Motivo);

// 🔁 el handler recibe el almacén y abre el stream por id
public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
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

`CambiarPlanHandler` cambia **igual**: recibe el `EventStore`, abre por `cmd.EmpresaId` y lee `cmd.NuevoPlan`.
</details>

## Probémoslo: un almacén, muchas empresas

Ahora sí — el dolor del inicio, resuelto. **Un** despachador, handlers registrados **una vez**, y el `EmpresaId` del comando elige la empresa:

```csharp
var store = new EventStore();
var despachador = new Despachador();
despachador.Registrar(new SuspenderHandler(store));      // ← el ALMACÉN, no un stream; UNA vez
despachador.Registrar(new CambiarPlanHandler(store));

despachador.Enviar(new SuspenderEmpresa("emp-7", "falta de pago"));    // empresa 7
despachador.Enviar(new CambiarPlanDeEmpresa("emp-9", "Premium"));      // empresa 9 — mismo handler

var andes = store.AbrirStream<Empresa>("emp-7").Get();
Console.WriteLine($"emp-7: suspendida={andes.Suspendida}");
// emp-7: suspendida=True
```

`dotnet run`: dos empresas en el mismo almacén, cada una en su cajón, con handlers que se registraron **una sola vez**.

Con esto, el id es **uno solo** que entregas **una vez**: se lo das al **almacén** al pedir el stream (`AbrirStream(id)`), y el **stream** se lo pasa en cada `GetEvents`/`AppendEvent` como la **llave del cajón**.

> [!NOTE]
> 🌱 **Semilla — este `EventStream` es un andamio.** Nos sirve para ver el ciclo (cargar → escribir). Pero el almacén de verdad (el que adoptaremos) **no te entrega un objeto así**: te da **directamente la empresa** rehidratada. Cuando lleguemos ahí, el `EventStream` **desaparece** (lo verás en [El swap](el-swap.md)). Es un peldaño, no la meta.

---

### El Descubrimiento

Un **almacén central** (`EventStore`) con un **cajón por empresa rotulado con su id**, un **`EventStream`** que el almacén te **entrega** para leer (`Get`) y escribir (`Append`) la historia de una, y un **handler** que la busca por id. Registras los handlers **una vez** y sirven para todas las empresas — el dolor del despachador-por-empresa, disuelto.

```
EventStore
   ├── "emp-7" → [EmpresaRegistrada, PlanCambiado, EmpresaSuspendida, …]
   ├── "emp-9" → [EmpresaRegistrada, …]
   └── "emp-…" → […]
```

> [!NOTE]
> 🌱 **Semilla — reconstruir el estado es solo UNA vista de los eventos.** `Get()` recorre los hechos para armar la `Empresa`. Pero de **esos mismos** hechos podrías derivar otras vistas: un *listado por estado*, un *conteo de suspensiones por mes*… A cada vista derivada se le llama **proyección**, y a separar escritura (eventos) de lectura (proyecciones), **CQRS**. Lo verás en [Proyecciones](proyecciones.md).

Pero falta un peligro que aparece justo cuando hay **muchos escritores** sobre el mismo cajón: dos peticiones que tocan la misma empresa a la vez. Eso —y su cura— es la próxima sección.

---

## ✅ Compruébalo

- [ ] `dotnet run` escribe y lee **dos** empresas distintas (`emp-7`, `emp-9`) **siempre a través del stream**, nunca tocando el `store` directo.
- [ ] Los handlers se registran **una sola vez** (reciben el `EventStore`, no un stream), y el comando trae su `EmpresaId`.
- [ ] Sigue el id con la vista: `AbrirStream(id)` → `store.AppendEvent(id, …)` → `_cajones[id]` — es el **mismo** string, sin transformarse en el camino.
- [ ] Explica por qué el diseño de [El despachador](el-despachador.md) no escalaba a dos empresas (pista: la llave del despachador es el **tipo** del comando).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** ¿por qué registrar los handlers atados a un stream no escalaba a dos empresas? ¿Cómo viaja el **mismo** id desde `AbrirStream` hasta la llave del cajón?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El almacén: un cajón por empresa" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Un **almacén** (`EventStore`: un cajón de hechos por id) custodia las historias de **muchas** empresas; el **`EventStream`** —que ahora te **entrega** el almacén— lee (`Get`) y escribe (`Append`) la de una; y el **handler**, registrado una sola vez, la busca por el **`EmpresaId`** del comando. Un id que viaja solo.

---

[⬅️ Volver: El despachador (dado un comando, encuentra su handler)](./el-despachador.md)

[➡️ Siguiente: Cuando dos escriben a la vez (concurrencia optimista)](./concurrencia-optimista.md)
