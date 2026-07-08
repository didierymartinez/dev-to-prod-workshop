# El almacén de la plantilla: la unidad de trabajo

Tu `Empresa` ahora [acumula sus hechos](el-agregado-de-la-plantilla.md) en vez de entregarlos. Alguien tiene que recorrer esos `UncommittedEvents` y volcarlos a Marten al confirmar. Y hay un matiz: un agregado **nuevo** necesita **crear** su stream; uno **modificado** —que rehidrataste de la base— necesita **añadir** a un stream que ya existe. El `MartenEventStore` real lleva esa cuenta con una **unidad de trabajo** de dos rastros — y confirma **sin que el handler llame `SaveChanges`**.

## 🎯 El Objetivo

Construir el `MartenEventStore` real: una unidad de trabajo que, al confirmar, **vuelca** los `UncommittedEvents` distinguiendo un agregado **nuevo** (`StartStream`) de uno **modificado** (`Append`).

## 💥 El dolor: nuevo y modificado no se guardan igual

Tu almacén de [El almacén abstracto](el-almacen-abstracto.md) recibía hechos sueltos del handler. Pero ahora el agregado los acumula, y aparecen **dos caminos** que no son iguales:

- Una `Empresa` **nueva** (`Create`) no tiene stream todavía: hay que **`StartStream`**.
- Una `Empresa` **rehidratada** (la leíste para modificarla) ya tiene stream: sus hechos nuevos van con **`Append`**.

Si tratas los dos igual, o creas un stream que ya existe (choque) o intentas añadir a uno que no existe. El almacén tiene que **saber cuál es cuál** — y volcar los `UncommittedEvents` de cada uno en el momento justo.

## 🔧 La unidad de trabajo

### Paso 1 · El contrato `IEventStore`

> 🛠️ **Inténtalo tú.** Amplía tu `IEventStore`: además de leer (`GetAggregateRootAsync`, heredado de un `IAggregateRootReader`), que sepa **iniciar** un stream, **añadir** hechos y **confirmar**.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IAggregateRootReader
{
    Task<T?> GetAggregateRootAsync<T>(string aggregateId, CancellationToken ct) where T : AggregateRoot;
}

public interface IEventStore : IAggregateRootReader
{
    void StartStream(AggregateRoot aggregateRoot);            // agregado NUEVO
    void AppendEvents(string aggregateId, IEnumerable<object> eventos);
    Task SaveChangesAsync(CancellationToken ct);
}
```
</details>

> [!NOTE]
> 🆕 **Dos cambios de firma respecto a tu costura.** Frente al `IEventStore` de [El almacén abstracto](el-almacen-abstracto.md), la restricción pasó de `class, new()` a **`where T : AggregateRoot`**: el store ahora necesita leer `UncommittedEvents` del agregado para volcarlos, y eso solo lo garantiza `AggregateRoot`. Y entra un `CancellationToken`, para propagar la cancelación como el resto de Marten. La costura es la misma; el contrato se afinó.

### Paso 2 · Los dos rastros

> 🛠️ **Inténtalo tú.** Escribe una base `MartenUnitOfWork` que lleve **dos** listas: agregados **iniciados** (via `StartStream`) y agregados **rehidratados** (los que leíste). Expón los rehidratados con hechos pendientes y la unión de ambos.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public abstract class MartenUnitOfWork
{
    private readonly List<AggregateRoot> _startedAggregateRoots = [];   // nuevos (StartStream)
    private readonly List<AggregateRoot> _modifiedAggregateRoots = []; // rehidratados

    // rehidratados que SÍ tienen hechos nuevos por volcar:
    public IEnumerable<AggregateRoot> UncommitedModifiedAggregateRoots =>
        _modifiedAggregateRoots.Where(a => a.UncommittedEvents.Count > 0);

    // todos los tocados en esta unidad de trabajo (para limpiar al final):
    public IEnumerable<AggregateRoot> AggregateRoots => _startedAggregateRoots.Concat(_modifiedAggregateRoots);

    public void ClearChangeTracker()
    {
        _startedAggregateRoots.Clear();
        _modifiedAggregateRoots.Clear();
    }

    protected void AddToStartedAggregateRoots(AggregateRoot a) => _startedAggregateRoots.Add(a);
    protected void AddToModifiedAggregateRoots(AggregateRoot? a) { if (a is not null) _modifiedAggregateRoots.Add(a); }
}
```
</details>

> [!NOTE]
> 🆕 **Dos rastros, dos destinos.** Los **iniciados** ya entregaron sus hechos al `StartStream`: Marten los dejó **encolados dentro de la sesión** (aún no en la base, pero listos para el commit), así que **no** hay que volver a `Append`earlos. Los **rehidratados** llegaron limpios de la base; si el comando les agregó hechos, esos hay que `Append`earlos al confirmar. Por eso `UncommitedModifiedAggregateRoots` filtra justo esos. ¿Y para qué guardar los **iniciados**, si no se vuelcan? Para poder **limpiarlos** al terminar (`AggregateRoots` los incluye): al cerrar la unidad de trabajo hay que vaciar los `UncommittedEvents` de **todos** los agregados tocados, iniciados y rehidratados.

### Paso 3 · `MartenEventStore` vuelca al confirmar

> 🛠️ **Inténtalo tú.** **🔁** Haz que `MartenEventStore` herede de `MartenUnitOfWork`. `StartStream` inicia el stream **y** registra el agregado como iniciado; `GetAggregateRootAsync` rehidrata **y** lo registra como modificado; `SaveChangesAsync` recorre los modificados pendientes, `Append`ea sus `UncommittedEvents`, los limpia, y confirma la sesión.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
using Marten;

public class MartenEventStore(IDocumentSession session, IQuerySession querySession)
    : MartenUnitOfWork, IEventStore
{
    public void StartStream(AggregateRoot aggregateRoot)
    {
        if (string.IsNullOrEmpty(aggregateRoot.Id)) throw new ArgumentException("El id es obligatorio");
        session.Events.StartStream(aggregateRoot.Id, aggregateRoot.UncommittedEvents);
        AddToStartedAggregateRoots(aggregateRoot);
    }

    public Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct) where T : AggregateRoot =>
        querySession.Events.AggregateStreamAsync<T>(id, token: ct)
            .Tap(AddToModifiedAggregateRoots);        // registra el rehidratado

    public void AppendEvents(string id, IEnumerable<object> eventos) => session.Events.Append(id, eventos);

    public Task SaveChangesAsync(CancellationToken ct)
    {
        foreach (var a in UncommitedModifiedAggregateRoots)
        {
            AppendEvents(a.Id, a.UncommittedEvents.ToArray());   // vuelca lo pendiente
            a.ClearUncommittedEvents();
        }
        ClearChangeTracker();
        return session.SaveChangesAsync(ct);
    }
}
```
</details>

> [!NOTE]
> 🆕 **Dos sesiones: escribir y leer.** El store recibe **dos**: `IDocumentSession session` para **escribir** (`StartStream`, `Append`, el commit) y `IQuerySession querySession` para **leer** (`AggregateStreamAsync`). ¿Por qué leer con la de consulta y no con la de escritura? Porque rehidratar es una lectura pura, y la sesión de consulta es más ligera. La versión del stream no se pierde por eso: quien recuerda qué volcar es el **rastro** de la unidad de trabajo, no la sesión. *(Guarda este detalle: el [Capstone](capstone.md) lo reconsidera — `FetchForWriting` querría leer desde la sesión de **escritura**.)*

> [!NOTE]
> 🆕 **`.Tap` — azúcar de encadenamiento.** `.Tap(AddToModifiedAggregateRoots)` equivale a `var a = await …; AddToModifiedAggregateRoots(a); return a;`: ejecuta un efecto sobre el resultado de un `Task` y lo devuelve igual, sin desanidar. Es un helper del repo (`Cosmos.EventSourcing.CritterStack`, en `TaskAggregateRootExtensions`). Puro estilo — puedes escribirlo con `await` explícito y da lo mismo.

### Paso 4 · Confirmar sin llamar `SaveChanges`

Falta cerrar el "¿por qué se guarda sin que yo llame `SaveChanges`?". Cuando el handler corre bajo Wolverine, no llamas `SaveChangesAsync` tú: lo hace un **middleware**.

> 🛠️ **Inténtalo tú.** Escribe un `UnitOfWorkMiddleware` que reciba el `IEventStore` y, con dos ganchos, vuelque los hechos **después** del handler y limpie el rastro **al final**.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public class UnitOfWorkMiddleware(IEventStore eventStore)
{
    public void After()      // tras el handler: vuelca los hechos acumulados
    {
        if (eventStore is not MartenEventStore store) return;
        foreach (var a in store.UncommitedModifiedAggregateRoots)
            store.AppendEvents(a.Id, a.UncommittedEvents.ToArray());
    }

    public void Finally()    // pase lo que pase: limpia el rastro
    {
        if (eventStore is not MartenEventStore store) return;
        foreach (var a in store.AggregateRoots) a.ClearUncommittedEvents();
        store.ClearChangeTracker();
    }
}
```
</details>

> [!NOTE]
> 🆕 **Un middleware de Wolverine.** Un **middleware** es código que Wolverine corre **alrededor** de cada handler — el "guardado central" que industrializaste en [Revelar Wolverine](revelar-wolverine.md), ahora atado al rastro. Wolverine descubre sus ganchos **por convención de nombre**: `After()` corre **tras** el handler (vuelca los hechos acumulados a la sesión), y `Finally()` corre **pase lo que pase**, con o sin excepción (limpia los `UncommittedEvents` de todos los agregados y vacía el rastro, para que un segundo mensaje no reprocese lo del primero). El **commit** lo pone `AutoApplyTransactions` (confirma la sesión de Marten). Reparto: el middleware **vuelca y limpia**, `AutoApplyTransactions` **confirma**, y tu handler **solo decide**.

> 🔍 **¿Lo lograste?** Dos comprobaciones, con Postgres arriba (reusa el arnés de [Tests de integración](tests-de-integracion.md)). (1) **A mano:** crea una `Empresa` nueva y `StartStream` → aparece un stream nuevo en `mt_events`; rehidrata `emp-7`, `Suspender`, y `store.SaveChangesAsync` → el `EmpresaSuspendida` se **añade** al stream existente. (2) **El auto-flush:** con el `UnitOfWorkMiddleware` registrado en Wolverine, corre un handler que suspenda `emp-7` y **no** llame `SaveChanges` — la fila **igual** aparece en `mt_events`. Esa es la prueba de que el volcado ocurre por debajo.

---

### El Descubrimiento

Construiste la **unidad de trabajo** real. El `MartenEventStore` distingue dos rastros: agregados **iniciados** (`StartStream`, hechos ya encolados en la sesión) y **rehidratados** (`Append` de sus `UncommittedEvents` al confirmar), y usa **dos sesiones** (escritura y consulta). `SaveChangesAsync` vuelca los modificados pendientes y confirma cuando lo llamas a mano; bajo Wolverine, el `UnitOfWorkMiddleware` lo dispara **solo** (`After` vuelca, `Finally` limpia, `AutoApplyTransactions` confirma), así el handler únicamente decide. Es la pieza que tu almacén casero no tenía: no volcabas hechos acumulados por el agregado, porque tu agregado no los acumulaba. Ahora el ciclo cierra — el agregado recuerda, la unidad de trabajo vuelca.

> [!NOTE]
> 🌱 **Semilla — probar esto sin Postgres.** Todo este vaivén (rehidratar, acumular, volcar) merece pruebas **rápidas**, sin levantar Postgres — como recuperaste en [El almacén abstracto](el-almacen-abstracto.md) con el `TestStore`. La plantilla trae su `TestStore`, que aplica los hechos **por reflexión** para no repetir el `switch` de cada agregado. Lo ves en [El TestStore](el-teststore.md).

---

## ✅ Compruébalo

- [ ] `IEventStore` hereda de `IAggregateRootReader` y suma `StartStream`, `AppendEvents`, `SaveChangesAsync` (con `where T : AggregateRoot` y `CancellationToken`).
- [ ] `MartenUnitOfWork` lleva **dos** rastros (iniciados vs rehidratados) y expone `UncommitedModifiedAggregateRoots` y `AggregateRoots`.
- [ ] `MartenEventStore` usa **dos sesiones** (escritura y consulta) y explicas por qué lee con la de consulta.
- [ ] `SaveChangesAsync` `Append`ea los `UncommittedEvents` de los modificados, los limpia, y confirma.
- [ ] Construiste el `UnitOfWorkMiddleware` (`After` vuelca, `Finally` limpia) y explicas quién confirma (`AutoApplyTransactions`).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué un agregado **nuevo** y uno **rehidratado** no se guardan igual? ¿Qué hace la unidad de trabajo con cada rastro? ¿Quién vuelca, quién confirma y quién limpia bajo Wolverine?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · El almacén de la plantilla: la unidad de trabajo" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El `MartenEventStore` real es una **unidad de trabajo** de dos rastros —agregados **iniciados** (`StartStream`) y **rehidratados** (`Append` de sus `UncommittedEvents`)— con dos sesiones (escritura y consulta); al confirmar vuelca lo pendiente, y bajo Wolverine el `UnitOfWorkMiddleware` lo dispara solo (`After` vuelca, `Finally` limpia, `AutoApplyTransactions` confirma) para que el handler solo decida.

---

[⬅️ Volver: El agregado de la plantilla](./el-agregado-de-la-plantilla.md)

[➡️ Siguiente: El TestStore](./el-teststore.md)
