# El almacén abstracto: tests rápidos sin Postgres

Los tests de integración de la sección anterior **prueban el swap**, pero pesan: necesitan Docker y Postgres, y cada uno va a la base. No los corres en cada tecla, como sí hacías con los de RAM en [Blindar el motor](given-when-then.md). Quieres esa velocidad **de vuelta** para probar comportamiento — y dejar los de integración para lo suyo, confiar en el cableado. La traba es que tu handler **habla Marten directo** (`IDocumentSession`). Aquí metes una **costura** para poder cambiarle el almacén por uno en memoria.

## 🎯 El Objetivo

Que tus handlers dependan de una **abstracción** (`IEventStore`), no de Marten: producción usa Marten, y los tests un **doble en memoria** — rápidos, sin Postgres, sin depender de Marten.

## La costura: ¿qué le pide el handler al almacén?

Mira tu `SuspenderHandler` del swap. De todo Marten, solo usa **tres** cosas: **rehidratar** la empresa, **emitir** un hecho, y **confirmar**. Nada más. Eso es justo el contrato que necesitas — ni una pieza más.

### Paso 1 · Define `IEventStore` y desacopla el handler

> 🛠️ **Inténtalo tú.** Declara `IEventStore` con esas tres operaciones. Luego **🔁** cambia `SuspenderHandler` para que reciba un `IEventStore` en vez de la `IDocumentSession`. El cuerpo es el mismo ciclo, con los nombres del contrato.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IEventStore
{
    Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new();  // rehidratar
    void AppendEvent(string id, object evento);                           // encolar un hecho
    Task SaveChangesAsync();                                              // confirmar todo
}
```

```csharp
// 🔁 antes recibía IDocumentSession (Marten directo); ahora la abstracción
public class SuspenderHandler(IEventStore store) : ICommandHandler<SuspenderEmpresa>
{
    public async Task HandleAsync(SuspenderEmpresa cmd)
    {
        var empresa = await store.GetAggregateRootAsync<Empresa>(cmd.EmpresaId);
        var hecho = empresa?.Suspender(cmd.Motivo);
        if (hecho is not null)
        {
            store.AppendEvent(cmd.EmpresaId, hecho);
            await store.SaveChangesAsync();
        }
    }
}
```
</details>

> [!NOTE]
> 🆕 **Por qué `AppendEvent` y `SaveChangesAsync` van separados.** `AppendEvent` no persiste: **encola** el hecho. `SaveChangesAsync` confirma **todo lo encolado** en una transacción. Separarlos te deja **componer**: un comando grande puede llamar a varios handlers que encolan hechos, y confirmar **una sola vez** al final. Es la idea de *unidad de trabajo* — el mismo rol del `DbContext` de Entity Framework. Tu handler ya **no menciona Marten**: solo el contrato.

### Paso 2 · Dos implementaciones del contrato

La misma interfaz, dos motores detrás: uno real (Marten) para producción, uno en memoria para los tests.

> 🛠️ **Inténtalo tú.** (1) `MartenEventStore` recibe una `IDocumentSession` y traduce cada método a Marten (lo que hacía el handler antes). (2) `TestStore` guarda los hechos en diccionarios en memoria y rehidrata **aplicando** los eventos al agregado.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
// PRODUCCIÓN — envuelve Marten
public class MartenEventStore(IDocumentSession session) : IEventStore
{
    public Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new()
        => session.Events.AggregateStreamAsync<T>(id);
    public void AppendEvent(string id, object evento) => session.Events.Append(id, evento);
    public Task SaveChangesAsync() => session.SaveChangesAsync();
}
```

```csharp
// TESTS — en memoria, sin base de datos
public class TestStore : IEventStore
{
    private readonly Dictionary<string, List<object>> _previos = new();   // los "Given"
    private readonly Dictionary<string, List<object>> _nuevos = new();    // los emitidos

    public void SembrarPrevios(string id, params object[] eventos) => _previos[id] = eventos.ToList();
    public IReadOnlyList<object> HechosNuevos(string id) => _nuevos.GetValueOrDefault(id, []);

    public Task<T?> GetAggregateRootAsync<T>(string id) where T : class, new()
    {
        if (!_previos.TryGetValue(id, out var eventos)) return Task.FromResult<T?>(null);
        var agregado = new T();
        foreach (var e in eventos) Aplicar(agregado, e);
        return Task.FromResult<T?>(agregado);
    }

    public void AppendEvent(string id, object evento)
    {
        var lista = _nuevos.GetValueOrDefault(id, []);
        lista.Add(evento);
        _nuevos[id] = lista;
    }

    public Task SaveChangesAsync() => Task.CompletedTask;   // en memoria: nada que confirmar

    // busca un método Apply(TEvento) por el tipo del evento y lo invoca — la MISMA convención que usa Marten
    private static void Aplicar<T>(T agregado, object evento) =>
        typeof(T).GetMethods()
            .FirstOrDefault(m => m.Name == "Apply"
                && m.GetParameters().Length == 1
                && m.GetParameters()[0].ParameterType == evento.GetType())
            ?.Invoke(agregado, [evento]);
}
```
</details>

> [!NOTE]
> 🆕 **La reflexión del `TestStore`.** Marten reconstruye llamando tus `Apply(TEvento)` por convención (§ [El swap](el-swap.md)). El `TestStore` hace **lo mismo a mano**: busca por reflexión el método `Apply` cuyo parámetro coincide con el tipo del evento, y lo invoca. Por eso **la misma `Empresa` sirve en producción y en tests** sin cambios — ninguno de los dos necesita un `switch`.

### Paso 3 · Los tests, otra vez rápidos

Ahora el `HandlerTest` vuelve a ser **en memoria** (como en [Blindar el motor](given-when-then.md)): su motor es un `TestStore`, no Marten. Los escenarios, los mismos.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public abstract class HandlerTest<TCommand>
{
    protected readonly TestStore Store = new();      // el motor: en memoria, sin Postgres
    protected string AggregateId = "emp-7";

    protected abstract ICommandHandler<TCommand> CrearHandler(IEventStore store);

    protected void Given(params object[] eventos) => Store.SembrarPrevios(AggregateId, eventos);
    protected Task When(TCommand comando) => CrearHandler(Store).HandleAsync(comando);
    protected void Then(params object[] esperados) =>
        Store.HechosNuevos(AggregateId).Should().BeEquivalentTo(esperados);
}
```

```csharp
public class SuspenderEmpresaTests : HandlerTest<SuspenderEmpresa>
{
    protected override ICommandHandler<SuspenderEmpresa> CrearHandler(IEventStore store)
        => new SuspenderHandler(store);

    [Fact]
    public async Task Suspender_una_empresa_activa_emite_EmpresaSuspendida()
    {
        Given(new EmpresaRegistrada("Constructora Andes", "Básico"));
        await When(new SuspenderEmpresa(AggregateId, "falta de pago"));
        Then(new EmpresaSuspendida("falta de pago"));
    }
}
```
</details>

> 🔍 **¿Lo lograste?** `dotnet test` **sin Postgres, sin `docker compose up`** → verde en **milisegundos**. `Given` y `Then` vuelven a ser síncronos (no hay I/O); solo `When` es `async`, porque el handler lo es. Recuperaste la velocidad de RAM — con tu handler y tu `Empresa` **reales**, no un juguete.

> [!NOTE]
> **Los de integración no se van: se quedan pocos.** Tu `HandlerTest` de [integración](tests-de-integracion.md) (el del `MartenFixture`) sigue igual — solo que `CrearHandler` ahora devuelve `new SuspenderHandler(new MartenEventStore(session))`: el mismo handler, envuelto para Marten. Consérvalo como un **puñado** que confirma el cableado, no como todos tus tests. Muchos rápidos (comportamiento, `TestStore`) + pocos lentos (cableado, Marten): la **pirámide de pruebas**.

---

### El Descubrimiento

Metiste una **costura** —`IEventStore`, tres métodos— y tu handler dejó de depender de Marten. Detrás pusiste **dos motores**: `MartenEventStore` (producción, envuelve la sesión) y `TestStore` (tests, en memoria, rehidrata por la misma reflexión de `Apply` que usa Marten). Así recuperaste los tests **rápidos** de RAM para el comportamiento, dejando los de Postgres como el puñado que valida el cableado. Y —clave— esto **no lo inventaste**: acabas de construir, a mano, las piezas que `Cosmos.BuildingBlocks` trae hechas (`IEventStore`, `MartenEventStore`, `TestStore`, `CommandHandlerTestBase`).

> [!NOTE]
> 🌱 **Semilla — la versión de la plantilla es más rica.** El `IEventStore` real suma `StartStream` y `ExistsAsync`, y se apoya en un `AggregateRoot` que **encola sus propios eventos** (`RaiseAndApply` + `UncommittedEvents`); además, **el `SaveChanges` no lo llama el handler** sino un **`UnitOfWorkMiddleware`** que envuelve cada comando (con Wolverine). Todo eso lo adoptas al converger a la plantilla, más adelante.

> [!NOTE]
> 🌱 **Semilla — falta cobrar la concurrencia.** Tu `IEventStore` rehidrata y añade, pero (como el swap) **no verifica versión**. La red de [concurrencia optimista](concurrencia-optimista.md) que dejaste pendiente se recupera con **`FetchForWriting`** — el momento de adoptar, con criterio, la mejora que la doc de Marten recomienda.

---

## ✅ Compruébalo

- [ ] `IEventStore` declara `GetAggregateRootAsync`/`AppendEvent`/`SaveChangesAsync`, y `SuspenderHandler` recibe `IEventStore` (ya no `IDocumentSession`).
- [ ] Explicas por qué `AppendEvent` (encola) y `SaveChangesAsync` (confirma) van separados: componer varios handlers en una transacción (unidad de trabajo).
- [ ] `MartenEventStore` traduce a Marten; `TestStore` guarda en memoria y rehidrata con la **misma** convención `Apply` (por reflexión).
- [ ] `HandlerTest` usa un `TestStore`; `dotnet test` corre **verde sin Postgres**, en milisegundos.
- [ ] Explicas la **pirámide**: muchos rápidos (`TestStore`) + pocos de integración (Marten).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Qué gana tu handler al depender de `IEventStore` en vez de `IDocumentSession`? ¿Por qué el `TestStore` puede probar tu handler **real** sin una base de datos?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El almacén abstracto: tests rápidos sin Postgres" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

Metes una **costura** `IEventStore` (rehidratar + encolar + confirmar) para que el handler no dependa de Marten: producción usa `MartenEventStore` (envuelve la sesión) y los tests un `TestStore` en memoria (rehidrata por la misma reflexión de `Apply`) — recuperando tests **rápidos sin Postgres** para el comportamiento y dejando los de integración como el puñado que valida el cableado; y resulta que acabas de reconstruir piezas de la plantilla.

---

[⬅️ Volver: Tests de integración: validar el swap](./tests-de-integracion.md)

[➡️ Siguiente: La primera proyección](./proyecciones.md)
