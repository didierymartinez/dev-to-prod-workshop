# 04 · El flujo de vida (EventStream)

Ya tienes un motor de replay elegante (`AggregateRoot`). Pero para "despertar" a la empresa, todavía le pasas a mano una lista cruda:

```csharp
var historia = new List<object> { new EmpresaRegistrada(...) /* … */ };
var empresa = new Empresa(historia);
```

## 🎯 El Objetivo

Dejar de manosear listas crudas. Queremos un envoltorio que **proteja** la historia de una empresa y que sepa **instanciarla y rehidratarla** por nosotros — para no repetir ese `new Empresa(...)` en cada rincón del programa.

## El problema de la lista cruda

Pasar una `List<object>` por ahí tiene dos fallas:

1. **Acoplamiento.** Quien quiera consultar la empresa tiene que saber *cómo* se rehidrata (`new Empresa(historia)`). Eso no debería ser problema de quien la consume.
2. **Lista desprotegida.** Es una lista pelada: por error, alguien podría hacer `historia.Add("hola")` y meter basura en el diario sin que nada lo impida.

Necesitamos un envoltorio que centralice la lógica y blinde la lista.

## 🔧 Refactor 1: el sobre — `EventoAlmacenado`

Antes del envoltorio, resolvamos lo más urgente: la lista cruda no sabe **a quién** pertenece cada hecho ni **cuándo** se guardó. En vez de ensuciar nuestros eventos de dominio (`EmpresaRegistrada`…) obligándolos a heredar cosas raras, los metemos en un **sobre** con esa metadata:

```csharp
// El "sobre" que envuelve cualquier hecho antes de archivarlo
public record EventoAlmacenado(
    string   AggregateId,  // ¿a qué empresa le pasó?
    DateTime Timestamp,    // ¿cuándo se guardó?
    object   EventData     // el hecho en sí (EmpresaRegistrada, PlanCambiado, …)
);
```

De aquí en adelante abandonamos la `List<object>` cruda: la historia de una empresa será una `List<EventoAlmacenado>`.

## 🔧 Refactor 2: el envoltorio — `EventStream<T>`

Ahora el envoltorio. Como debe servir **igual** para una `Empresa`, una `Factura` o lo que venga, lo hacemos **genérico** con `<T>`:

> [!NOTE]
> **¿Qué es ese `<T>` y el `where`?**
> El `<T>` (de *Type*) es un **hueco para un tipo** que rellenas al usar la clase: `EventStream<Empresa>` significa "un stream de empresas". Así **una sola clase** sirve para todos los agregados.
> La parte `where T : AggregateRoot, new()` son **restricciones**: le exigen a `T` dos cosas — que sea un `AggregateRoot` (para poder llamarle `.Load(...)`) y que tenga un **constructor sin parámetros** (eso significa `new()`), para poder crear uno vacío con `new T()` y luego rehidratarlo.

Para que `new T()` funcione, la `Empresa` necesita un constructor **sin parámetros** (ya no recibe la historia: de eso se encargará el stream). Y subimos un `Id` a la clase base, para saber de quién es cada agregado:

```csharp
public abstract class AggregateRoot
{
    public string Id { get; set; } = "";

    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);
    }

    protected abstract void Aplicar(object hecho);
}

public class Empresa : AggregateRoot
{
    public string Nombre { get; private set; } = "";
    public string Plan   { get; private set; } = "";
    public bool   Suspendida    { get; private set; }
    public int    Reactivaciones { get; private set; }

    public Empresa() { }   // sin parámetros: el stream la crea vacía y la rehidrata con Load

    protected override void Aplicar(object hecho)
    {
        switch (hecho)
        {
            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan;       break;
            case PlanCambiado p:      Plan = p.NuevoPlan;                      break;
            case EmpresaSuspendida:   Suspendida = true;                       break;
            case EmpresaReactivada:   Suspendida = false; Reactivaciones++;    break;
        }
    }
}
```

> 🔁 Esto **reemplaza** la `Empresa` de la §03: su constructor ya no recibe la historia. Borra de tu `Program.cs` el `var historia = …` y el `new Empresa(historia)` sueltos de antes — la empresa ahora se obtiene con `flujo.Get()` (lo ves abajo).

Y el envoltorio que esconde la lista y expone un método limpio para obtener la empresa ya rehidratada:

```csharp
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly List<EventoAlmacenado> _eventos;
    private readonly string _aggregateId;

    public EventStream(List<EventoAlmacenado> eventos, string aggregateId)
    {
        _eventos = eventos;
        _aggregateId = aggregateId;
    }

    // Entrega la entidad ya despierta: la crea, le estampa su Id y la rehidrata.
    public T Get()
    {
        var entidad = new T();
        entidad.Id = _aggregateId;                       // le ponemos su identidad
        var hechos = _eventos.Select(e => e.EventData);  // sacamos los hechos de sus sobres
        entidad.Load(hechos);                            // y reproducimos su historia
        return entidad;
    }
}
```

Así de limpio queda usarlo:

```csharp
var eventos = new List<EventoAlmacenado>
{
    new("emp-7", DateTime.UtcNow, new EmpresaRegistrada("emp-7", "Constructora Andes", "Básico")),
    new("emp-7", DateTime.UtcNow, new PlanCambiado("Premium")),
    new("emp-7", DateTime.UtcNow, new EmpresaSuspendida("falta de pago")),
};

var flujo = new EventStream<Empresa>(eventos, "emp-7");
var empresa = flujo.Get();   // el stream instancia y rehidrata por ti

Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}");
// Constructora Andes: plan Premium
```

> 💡 ¿Ves los `new(...)` sin el tipo delante (en vez de `new EventoAlmacenado(...)`)? Es *target-typed new*: como la lista ya es de `EventoAlmacenado`, C# deduce el tipo y te ahorra repetirlo.

Quien consume ya **no sabe ni le importa** cómo se rehidrata una empresa: pide `flujo.Get()` y recibe una `Empresa` lista. Ese patrón —un envoltorio que esconde el almacenamiento y te entrega el objeto— se llama **Repositorio**.

> [!NOTE]
> 🌱 **Semilla — los genéricos no son solo "ahorrar código".** Sin `<T>` tendrías que devolver `object` y andar casteando por todos lados (con riesgo de reventar en ejecución). Con `EventStream<Empresa>`, el compilador **sabe** que `Get()` devuelve una `Empresa`: autocompletado, seguridad de tipos, cero sorpresas. Esta misma firma —genérico con restricción a `AggregateRoot`— es **exactamente** la que usan las librerías que adoptaremos para cargar agregados. La estás construyendo a mano.

---

### El Descubrimiento

El `EventStream<T>` es el guardián de **una sola línea de vida**. Blindó la lista (ya nadie le mete basura), centralizó el `new Empresa()` y te dio un método limpio: `Get()`. Pero queda un cuello de botella: si llegan **1.000 empresas**, tendrías 1.000 listas sueltas flotando en el programa para alimentar 1.000 streams. ¿Cómo se **archivan y organizan** miles de historias sin variables globales por todas partes? Para eso necesitamos un **Event Store**.

---

## ✅ Compruébalo

- [ ] `dotnet run` imprime `Constructora Andes: plan Premium` — ahora obtenido vía `flujo.Get()`, no `new Empresa(historia)`.
- [ ] Intenta crear `new EventStream<string>(…)` y observa que **no compila**: `string` no es un `AggregateRoot`, y la restricción `where` lo impide.
- [ ] Quítale a `Empresa` el constructor `public Empresa() { }` y mira el error: sin constructor sin parámetros, `new T()` (y por tanto `EventStream<Empresa>`) deja de compilar — eso es lo que exige el `new()` del `where`.
- [ ] Explica por qué pasamos de `List<object>` a `List<EventoAlmacenado>` (qué ganamos con el sobre).

---

## 🧠 En una frase

Una lista cruda de hechos acopla y no se protege; envolviéndola en un **sobre** (`EventoAlmacenado`, con quién/cuándo) dentro de un **`EventStream<T>`** genérico (un **Repositorio**) que sabe instanciar y rehidratar el agregado, el consumidor solo pide `Get()` y recibe la empresa lista.

---

[⬅️ Volver: Refactorizando el motor](./03-refactorizando-el-motor.md)

[➡️ Siguiente: El almacén en memoria (Event Store)](./05-el-almacen-en-memoria.md)
