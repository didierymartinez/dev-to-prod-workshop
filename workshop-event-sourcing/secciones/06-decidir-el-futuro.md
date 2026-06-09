# 06 · Decidir el futuro (emitir eventos)

La empresa ya sabe **reconstruir su pasado**. Pero la vida sigue: cambia de plan, la suspenden, la reactivan. Hasta ahora fabricábamos esos hechos **a mano desde afuera** (`new PlanCambiado(...)` sueltos en el `Program.cs`). Eso está mal: ¿quién dice que "Constructora Andes" *puede* cambiar de plan? Esa decisión le toca a la **propia empresa**.

## 🎯 El Objetivo

Que la `Empresa` **emita sus propios hechos** —protegiendo sus reglas— en vez de que se los insertemos por la fuerza.

## La empresa decide; no le insertan hechos

Aquí hay un detalle sutil del event sourcing: la `Empresa` es la **dueña de las reglas** de su historia, pero **no guarda la lista de eventos**. No le "metemos" un hecho a la fuerza; le **pedimos** que haga algo, y ella, a cambio, **devuelve** el hecho que ocurrió. Otro se encargará de guardarlo.

Por ahora, en el camino feliz, le agregamos métodos que devuelven el hecho correspondiente (los `record` de eventos ya existen desde la §02):

```csharp
public class Empresa : AggregateRoot
{
    // … propiedades y el switch Aplicar de antes …

    public PlanCambiado      CambiarPlan(string nuevoPlan) => new(nuevoPlan);
    public EmpresaSuspendida Suspender(string motivo)      => new(motivo);
    public EmpresaReactivada Reactivar()                   => new();
}
```

Fíjate en algo importante: `CambiarPlan` **no** toca la propiedad `Plan`. Solo **devuelve** el hecho `PlanCambiado`. El estado cambia únicamente cuando ese hecho se **aplica** (el `switch Aplicar` que ya tienes) al reproducir la historia. Decidir y aplicar son dos cosas separadas — recuérdalo, es la columna vertebral del patrón.

## Enseñarle al `EventStream` a escribir

El `EventStream<T>` hasta ahora solo **leía** (`Get`). Ahora que la empresa produce hechos nuevos, el stream necesita la capacidad inversa: **guardar**. Le añadimos `Append`, que envuelve el hecho en su sobre (con la siguiente `Version`) y se lo entrega al almacén:

```csharp
// 🔁 Amplía tu EventStream<T> de la §05: lleva la cuenta de la versión y gana el método Append
public class EventStream<T> where T : AggregateRoot, new()
{
    private readonly IEventStore _store;
    private readonly string _aggregateId;
    private int _version;   // ← en qué versión va el stream

    public EventStream(IEventStore store, string aggregateId)
    {
        _store = store;
        _aggregateId = aggregateId;
    }

    public T Get()
    {
        var entidad = new T { Id = _aggregateId };
        var eventos = _store.GetEvents(_aggregateId).ToList();
        entidad.Load(eventos.Select(e => e.EventData));
        _version = eventos.Count == 0 ? 0 : eventos[^1].Version;   // recordamos la última versión
        return entidad;
    }

    public void Append(object hecho)
    {
        _version++;   // el hecho nuevo va en la siguiente versión
        _store.AppendEvent(new(_aggregateId, _version, DateTime.UtcNow, hecho));
    }
}
```

## El ciclo de vida: cargar → actuar → guardar

```csharp
var stream = new EventStream<Empresa>(store, "emp-7");

var empresa = stream.Get();                       // 1. CARGAR (rehidratar desde el almacén)
Console.WriteLine($"[antes] plan {empresa.Plan}");

var hecho = empresa.CambiarPlan("Enterprise");    // 2. ACTUAR (la empresa decide y emite el hecho)
stream.Append(hecho);                             // 3. GUARDAR (el stream lo archiva)

var verificacion = new EventStream<Empresa>(store, "emp-7").Get();   // recargamos desde cero
Console.WriteLine($"[después] plan {verificacion.Plan}");
// [después] plan Enterprise
```

`dotnet run`: el plan cambió porque el hecho quedó **archivado** y, al recargar, el replay lo aplica. La empresa en memoria del paso 1 no cambió sola — el cambio vive en el **diario**, no en el objeto.

> [!NOTE]
> 🌱 **Semilla — acabas de escribir la función `decide`.** En la §02 viste `evolve` (estado + hecho → nuevo estado). `CambiarPlan` / `Suspender` hacen la **otra mitad**: **`decide`** (estado + intención → hechos). Juntas forman el **patrón Decider**, el modelo del event sourcing: `decide` *decide qué pasó*, `evolve` *aplica lo que pasó*. Ambas son **puras** → se prueban sin base de datos. Las librerías que adoptaremos se montan justo sobre este par.

> [!NOTE]
> 🌱 **Semilla — tres tipos de mensaje, no los confundas.** Desde ahora manejas tres cosas fáciles de mezclar:
>
> | Tipo | Qué es | ¿Cuántos lo reciben? | ¿Se puede rechazar? | Tiempo verbal |
> |------|--------|---------|---------------------|---------------|
> | **Comando** | una *intención* ("haz esto") | **1** (un handler) | **Sí** (puede fallar una regla) | imperativo: `CambiarPlan` |
> | **Evento** | un *hecho* que ya ocurrió | **0..N** interesados | **No** (ya pasó) | pasado: `PlanCambiado` |
> | **Query** | una *pregunta* (pedir datos) | 1, devuelve un resultado | n/a (no muta) | `ObtenerEmpresa` |
>
> Por ahora la "intención" la representa el **método** del agregado (`CambiarPlan`). En la próxima sección le daremos forma de objeto: un **Comando**. Las **queries** llegan con CQRS.

## 🔧 ¿Y si la misma orden llega dos veces?

El camino feliz **siempre** emite. Pero en la vida real una orden puede repetirse (la red falló, el usuario hizo doble clic). Mira el dolor:

```csharp
// 💥 la misma orden de suspender llega dos veces
stream.Append(empresa.Suspender("falta de pago"));
stream.Append(empresa.Suspender("falta de pago"));
// El diario ahora dice que la empresa se suspendió DOS veces.
// Y peor: si una regla dijera "no se puede cambiar el plan de una empresa suspendida",
// nada lo impide, porque CambiarPlan emite sin mirar el estado.
```

El agregado es el **guardián de las reglas**, así que la defensa nace **dentro** de la `Empresa`, mirando su estado **antes** de emitir:

```csharp
public class ReglaDeNegocioException(string mensaje) : Exception(mensaje);

public class Empresa : AggregateRoot
{
    // … propiedades (Plan, Suspendida, …) y el switch Aplicar …

    public PlanCambiado CambiarPlan(string nuevoPlan)
    {
        // (a) VALIDACIÓN — la operación es inválida → se RECHAZA (es un error)
        if (Suspendida)
            throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");

        return new PlanCambiado(nuevoPlan);
    }

    public EmpresaSuspendida? Suspender(string motivo)
    {
        // (b) IDEMPOTENCIA — operación válida pero redundante → NO-OP (no es un error)
        if (Suspendida)
            return null;   // ya está suspendida: no emitimos un hecho duplicado

        return new EmpresaSuspendida(motivo);
    }
}
```

> [!IMPORTANT]
> 🏷️ **Dos motivos distintos para NO emitir un hecho — no los confundas:**
> - **Validación (rechazar):** la operación es **inválida** (cambiar el plan de una empresa suspendida). Es un **error**: lanzas una excepción para que el llamador se entere. Nunca te "tragues" una regla violada.
> - **Idempotencia (no-op):** la operación es **válida pero redundante** (suspender algo ya suspendido; la orden llegó dos veces). **No es un error**: simplemente no emites un hecho duplicado y sigues.
>
> Las dos viven en el agregado, pero una **grita** y la otra **calla**. (Más adelante, en mensajería, verás la *segunda* línea de defensa de la idempotencia: deduplicar por id de mensaje.)

> [!NOTE]
> 🌱 **Semilla — devolver el hecho en vez de publicarlo.** Fíjate: `Suspender` **devuelve** el hecho; no lo guarda ni lo publica por su cuenta. Es deliberado: mantiene el método **puro** (no esconde envíos ni inyecta el almacén) y deja a la vista *qué* produce con solo leerlo. Las librerías que adoptaremos elevan esto a patrón (te dejan **devolver** los hechos y ellas los guardan/publican). Lo verás a fondo en el Aggregate Handler.

## 🧪 Pruébalo desde ya

`Suspender` y `CambiarPlan` son **funciones puras**: reciben un estado (la historia previa) y devuelven un hecho (o lo rechazan). Eso significa que **ya puedes probarlas** sin base de datos ni mocks. Adopta el hábito desde aquí (en un proyecto de pruebas; lo formalizaremos en su sección):

```csharp
// montamos una empresa desde su historia previa (Given) — sin base de datos, en memoria
static Empresa Construir(params object[] historia)
{
    var empresa = new Empresa();
    empresa.Load(historia);   // Load es el motor de replay de la §03
    return empresa;
}

var activa     = Construir(new EmpresaRegistrada("emp-7", "Constructora Andes", "Básico"));
var suspendida = Construir(new EmpresaRegistrada("emp-7", "Constructora Andes", "Básico"),
                           new EmpresaSuspendida("falta de pago"));

// suspender una empresa activa emite el hecho
activa.Suspender("falta de pago").Should().BeOfType<EmpresaSuspendida>();   // ✅

// suspender una YA suspendida no emite nada (idempotencia → no-op)
suspendida.Suspender("otro motivo").Should().BeNull();                      // ✅

// cambiar el plan de una suspendida es RECHAZADO (validación → error)
var act = () => suspendida.CambiarPlan("Enterprise");
act.Should().Throw<ReglaDeNegocioException>();                              // ✅
```

> 🌱 Este patrón **Given → When → Then** (historia previa → actuar → verificar el hecho) será tu forma de probar todo el taller. No esperes a una "fase de testing": cada vez que escribas un `decide` o un `evolve`, **escribe su prueba al lado**.

---

### El Descubrimiento

El flujo del dominio queda claro: **cargar** (rehidratar el pasado) → **actuar** (pedirle al agregado que decida y **emita** un hecho) → **guardar** (archivar ese hecho). La empresa no guarda su lista ni cambia su estado al decidir: solo **emite** lo que pasó, y protege sus reglas **antes** de emitir — distinguiendo lo **inválido** (se rechaza) de lo **redundante** (se ignora). Eso que escribiste es el `decide`, gemelo del `evolve`.

---

## ✅ Compruébalo

- [ ] `dotnet run` muestra el plan cambiado tras `CambiarPlan` + `Append` + recargar.
- [ ] `Suspender` sobre una empresa **ya suspendida** devuelve `null` (idempotencia), **sin** lanzar.
- [ ] `CambiarPlan` sobre una empresa suspendida **lanza** `ReglaDeNegocioException` (validación).
- [ ] Explica por qué `CambiarPlan` **no** modifica la propiedad `Plan` directamente (decidir ≠ aplicar).

---

## 🧠 En una frase

El agregado **decide** (estado + intención → hecho) protegiendo sus reglas, y solo **emite** el hecho; el `EventStream` lo **guarda** (`Append`); el estado cambia al **aplicarlo** en el replay. Rechazar lo inválido es **validación**; ignorar lo redundante es **idempotencia**.

---

[⬅️ Volver: El almacén en memoria (Event Store)](./05-el-almacen-en-memoria.md)

[➡️ Siguiente: El Command Handler](./07-el-command-handler.md)
