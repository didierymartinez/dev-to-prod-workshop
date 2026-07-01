# El agregado que acumula

En [Adoptar una herramienta](por-que-adoptar-herramientas.md) quedamos en que, antes de enchufar las herramientas, vamos a **afinar tu motor a su forma de producción** — para que la adopción sea un intercambio 1:1 y no un rediseño. Empecemos por una pieza pequeña pero de fondo: **cómo emite sus hechos el agregado**.

## 🎯 El Objetivo

Que la `Empresa` **acumule** los hechos que decide (los recuerde en una lista), en vez de **devolverlos** uno por uno — para que un comando pueda emitir varios hechos y el handler deje de conocer las reglas del agregado.

## El dolor: devolver un hecho no escala

Hoy tu `CambiarPlan` **devuelve** el hecho y el handler lo archiva. Mira los dos olores que arrastra:

```csharp
public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
{
    var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
    var empresa = await stream.GetAsync();
    var hecho   = empresa.Suspender(cmd.Motivo);
    if (hecho is not null) await stream.AppendAsync(hecho);   // 👈 olor 1
}
```

1. **El handler tiene que saber de idempotencia.** Ese `if (hecho is not null)` existe porque `Suspender` devuelve `null` cuando la orden es redundante ([Decidir el futuro](decidir-el-futuro.md)). Pero esa es una **regla del agregado** filtrándose al handler. El handler debería obedecer, no conocer.
2. **Un comando solo puede emitir UN hecho.** `Suspender` devuelve uno. ¿Y si una operación tuviera que emitir **dos** (p. ej. *reactivar y subir de plan* en un mismo paso)? "Devolver un hecho" no lo modela; "devolver una lista" obliga al handler a manejar `null`/vacío/lista. Incómodo.

La salida es darle la vuelta: que la empresa **recuerde** lo que decidió. Cada decisión **levanta** (`Raise`) un hecho hacia una lista de *cambios sin confirmar*; el handler solo **drena** esa lista (la recorre archivando cada hecho y la vacía), tenga 0, 1 o 5 hechos.

## 🔧 Refactor 1: el agregado acumula sus hechos

> 🛠️ **Inténtalo tú.** Dos cambios:
> 1. En la base **`AggregateRoot`**, añade una lista privada de hechos no confirmados, un método **`protected void Raise(object hecho)`** que solo la encola, una propiedad de **solo lectura** `UncommittedEvents` para asomarse a ella, y un `ClearUncommittedEvents()` para vaciarla. *(Conserva el `Id` de [El almacén por id](el-almacen-por-id.md) y el `Load`/`Aplicar` abstracto de [Refactorizando el motor](refactorizando-el-motor.md); solo **sumas** la maquinaria de acumulación.)*
> 2. En `Empresa`, **🔁 reemplaza** los **tres** métodos de decisión para que sean **`void`** y usen `Raise(...)` en vez de `return` — sí, los tres: `Suspender` deja de devolver `EmpresaSuspendida?` y `Reactivar` deja de devolver `EmpresaReactivada`; ahora son `void`. La **validación** de `CambiarPlan` sigue lanzando; la **idempotencia** de `Suspender` pasa de `return null` a simplemente **`return`** (no encola nada); `Reactivar` ni valida ni es idempotente: solo levanta su hecho.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

La base, ahora con la maquinaria de acumulación (🔁 reemplaza tu `AggregateRoot`):

```csharp
public abstract class AggregateRoot
{
    private readonly List<object> _uncommittedEvents = new();

    public string Id { get; set; } = "";

    // los hechos que el agregado decidió pero aún no se han archivado
    public IReadOnlyList<object> UncommittedEvents => _uncommittedEvents.AsReadOnly();
    public void ClearUncommittedEvents() => _uncommittedEvents.Clear();

    // la empresa "levanta" un hecho: lo encola para que alguien lo persista
    protected void Raise(object hecho) => _uncommittedEvents.Add(hecho);

    public void Load(IEnumerable<object> historia)
    {
        foreach (var hecho in historia)
            Aplicar(hecho);
    }

    protected abstract void Aplicar(object hecho);
}
```

Y en `Empresa`, los tres métodos de decisión (🔁 reemplaza los de [Decidir el futuro](decidir-el-futuro.md); el `switch Aplicar` y las propiedades **no** cambian):

```csharp
public void CambiarPlan(string nuevoPlan)
{
    if (Suspendida)   // validación: inválido → se RECHAZA (grita)
        throw new ReglaDeNegocioException("No se puede cambiar el plan de una empresa suspendida.");

    Raise(new PlanCambiado(nuevoPlan));
}

public void Suspender(string motivo)
{
    if (Suspendida) return;   // idempotencia: redundante → NO-OP (calla, no encola)

    Raise(new EmpresaSuspendida(motivo));
}

public void Reactivar() => Raise(new EmpresaReactivada());
```
</details>

> [!NOTE]
> **Por qué `List<object>` y no `List<Evento>`.** Un hecho puede ser **cualquier** `record` (`PlanCambiado`, `EmpresaSuspendida`…); no tienen una base común todavía. `object` los acepta a todos sin obligarte a una jerarquía. *(Más adelante distinguiremos tipos de evento —públicos vs privados— pero la lista seguirá siendo de `object`.)* Y `Raise` es **`protected`**: solo la propia empresa levanta sus hechos; nadie se los mete desde afuera. (`UncommittedEvents` es de solo lectura vía `AsReadOnly()`: desde afuera pueden **mirar** la lista, no meterle mano.)

## 🔧 Refactor 2: el handler solo drena

Ahora `Suspender` ya no devuelve nada: encola (o no). El handler deja de recibir un hecho y pasa a **vaciar** la lista del agregado.

> 🛠️ **Inténtalo tú.** **🔁 Reemplaza el cuerpo completo** de los **dos** handlers (`SuspenderHandler` **y** `CambiarPlanHandler`): tras pedir la decisión, recorre `empresa.UncommittedEvents` archivando cada hecho con `AppendAsync`, y al final llama a `ClearUncommittedEvents()`. **Borra** la vieja línea `var hecho = empresa.Suspender(...)` y el `if (hecho is not null)`: como ahora los métodos son `void`, `var hecho = …` ni siquiera compila. Fíjate en lo que **desaparece**.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class CambiarPlanHandler(EventStore store) : ICommandHandler<CambiarPlanDeEmpresa>
{
    public async Task HandleAsync(CambiarPlanDeEmpresa cmd, CancellationToken ct = default)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = await stream.GetAsync();

        empresa.CambiarPlan(cmd.NuevoPlan);                 // decide → encola

        foreach (var hecho in empresa.UncommittedEvents)    // drena lo que haya
            await stream.AppendAsync(hecho);
        empresa.ClearUncommittedEvents();
    }
}

public class SuspenderHandler(EventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd, CancellationToken ct = default)
    {
        var stream  = store.AbrirStream<Empresa>(cmd.EmpresaId);
        var empresa = await stream.GetAsync();

        empresa.Suspender(cmd.Motivo);                      // si es redundante, no encola nada

        foreach (var hecho in empresa.UncommittedEvents)    // … y el foreach no archiva nada
            await stream.AppendAsync(hecho);
        empresa.ClearUncommittedEvents();
    }
}
```
</details>

¿Viste qué se fue? El **`if (hecho is not null)`**. La idempotencia ya no asoma en el handler: si `Suspender` decidió no encolar, `UncommittedEvents` está vacía y el `foreach` no archiva nada. La regla vive **entera** en el agregado; el handler hace el mismo gesto siempre: *decide → drena → limpia*. Y si mañana un comando emite dos hechos, este handler ya los archiva **sin tocar una línea**.

> [!NOTE]
> 🌱 **Semilla — la empresa en memoria todavía no refleja el cambio.** Sobre la **misma instancia** recién decidida dentro del handler: después de `empresa.CambiarPlan("Premium")`, si imprimes `empresa.Plan` verás el **viejo** (`Básico`): `Raise` solo **encoló** el hecho, no lo **aplicó** al estado. *(En el 🔍 Comprueba de abajo sí verás "Premium", porque ahí la empresa se **recarga** con `GetAsync` —otra instancia— que reproduce el diario entero.)* Es raro que un objeto "decida algo" y no lo refleje; lo arreglamos en [Aplicar al levantar](aplicar-al-levantar.md): que `Raise` también **aplique**.

> [!NOTE]
> 🌱 **Semilla — esto es la forma de producción.** Acabas de invertir lo que [Decidir el futuro](decidir-el-futuro.md) anticipó: de *"devolver y que otro guarde"* a *"el agregado acumula y alguien drena"*. Es exactamente como trabajan las herramientas que adoptaremos: el agregado junta sus *cambios sin confirmar* y, al final del comando, **un solo paso** (un middleware, [Revelar Wolverine](revelar-wolverine.md)) los persiste a todos juntos en una transacción. Ese `foreach` que escribiste a mano en el handler es lo que pronto te harán **gratis**.

---

## 🔍 Comprueba

Arma este `Program.cs` que registre una empresa, le cambie el plan, y la suspenda **dos veces** (la segunda es la prueba de la idempotencia):

```csharp
var store = new EventStore();
await store.AbrirStream<Empresa>("emp-7").AppendAsync(new EmpresaRegistrada("Constructora Andes", "Básico"));

await new CambiarPlanHandler(store).HandleAsync(new CambiarPlanDeEmpresa("emp-7", "Premium"));
await new SuspenderHandler(store).HandleAsync(new SuspenderEmpresa("emp-7", "falta de pago"));
await new SuspenderHandler(store).HandleAsync(new SuspenderEmpresa("emp-7", "otra vez"));   // redundante

var empresa  = await store.AbrirStream<Empresa>("emp-7").GetAsync();
var historia = await store.GetEventsAsync("emp-7");
Console.WriteLine($"{empresa.Nombre}: plan {empresa.Plan}, {(empresa.Suspendida ? "suspendida" : "activa")}; {historia.Count()} hechos");
```

> Para esta prueba volvemos a `new` directo (el contenedor de DI de [Inyección de Dependencias](inyeccion-de-dependencias.md) no estorba). Y `GetEventsAsync` te entrega los **sobres** del almacén de bajo nivel —solo para asomarnos aquí—; contarlos equivale a contar los hechos archivados.

**Corre** `dotnet run`.

> **¿Lo lograste?** Deberías ver:
> ```
> Constructora Andes: plan Premium, suspendida; 3 hechos
> ```
> **Tres** hechos, no cuatro: el segundo `Suspender` no encoló nada (idempotencia), y el handler —sin ningún `if`— simplemente no archivó nada esa vez.

---

## ✅ Compruébalo

- [ ] `AggregateRoot` tiene `UncommittedEvents` (solo lectura), `ClearUncommittedEvents()` y un `Raise` **`protected`**.
- [ ] Los tres métodos de `Empresa` son `void` y usan `Raise`; la validación lanza, la idempotencia hace `return` sin encolar.
- [ ] Los handlers **drenan** `UncommittedEvents` y ya **no** tienen el `if (hecho is not null)`.
- [ ] Suspender dos veces deja **3** hechos en el diario (no 4).
- [ ] Explica por qué acumular-y-drenar modela mejor "un comando puede emitir varios hechos" que "devolver un hecho".

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 **Reto:** suspende dos veces la misma empresa. ¿Cuántos hechos quedan y por qué? ¿Por qué el `if (hecho is not null)` desapareció del handler?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El agregado que acumula" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El agregado deja de **devolver** sus hechos y pasa a **acumularlos** (`Raise` → lista de *cambios sin confirmar*); el handler solo los **drena**, así que la idempotencia (y cualquier regla) vive entera en el agregado y un comando puede emitir varios hechos — la forma exacta que usan las herramientas de producción.

---

[⬅️ Volver: El momento de adoptar una herramienta](./por-que-adoptar-herramientas.md)

[➡️ Siguiente: Aplicar al levantar](./aplicar-al-levantar.md)
