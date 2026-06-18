# El gran reveal: Marten reemplaza tu almacén

Llegó el momento. Tu motor tiene la **forma exacta** de producción ([El agregado que acumula](el-agregado-acumula.md) a [El almacén directo](el-almacen-directo.md)): un agregado que acumula y aplica, una versión que es suya, un almacén directo con Unit of Work. Ahora enchufamos **Marten** sobre PostgreSQL — y verás que tu **dominio no cambia una sola línea**. Eso es lo que [Adoptar una herramienta](por-que-adoptar-herramientas.md) prometió: una adopción que es **renombrar e intercambiar**, no rediseñar.

## 🎯 El Objetivo

Reemplazar tu `InMemoryEventStore` por uno construido sobre **Marten** (Postgres real) **sin tocar** el dominio (`Empresa`, `Apply`, `decide`) ni los handlers.

## El que lo hace posible: extrae la interfaz

Hasta ahora los handlers reciben el tipo **concreto** `InMemoryEventStore`. Para poder cambiarlo por otro, necesitan depender de un **contrato**, no de una implementación. Es el momento de extraer `IEventStore` — y es justo ahora porque por fin hay una **segunda implementación** (la de Marten) que justifica la abstracción.

> 🛠️ **Inténtalo tú.** (1) Extrae una interfaz `IEventStore` con los métodos públicos de tu almacén (`StartStream`, `GetAggregateRootAsync<T>`, `AppendEvent`, `SaveChangesAsync`, `ExistsAsync<T>`). (2) Haz que `InMemoryEventStore` la implemente (`: IEventStore`). (3) En los tres handlers, cambia el parámetro `InMemoryEventStore store` por **`IEventStore store`**. Compila: debe seguir todo igual.

<details>
<summary>👉 Muéstrame una forma de hacerlo</summary>

```csharp
public interface IEventStore
{
    void StartStream(AggregateRoot agregado);
    Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot, new();
    void AppendEvent(string id, object hecho);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<bool> ExistsAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot;
}
```

`public class InMemoryEventStore : IEventStore { … }` (su código no cambia, solo declara que cumple el contrato). Y en los handlers: `RegistrarEmpresaHandler(IEventStore store)`, `CambiarPlanHandler(IEventStore store)`, `SuspenderHandler(IEventStore store)`.
</details>

Con eso, el dominio y los handlers ya **no saben** si los hechos van a RAM o a Postgres. Solo conocen `IEventStore`. Ese desacople es lo que hace el swap trivial.

## La segunda implementación: `MartenEventStore`

Instala Marten:

```bash
dotnet add package Marten
```

Ahora la pieza nueva. La **API de Marten es idioma nuevo**, así que te la muestro entera. Fíjate que **cada método es tu método de [El almacén directo](el-almacen-directo.md), mapeado a Marten**:

```csharp
using Marten;

// El change-tracker (Unit of Work), igual que en «El almacén directo» pero como base reutilizable
public abstract class MartenUnitOfWork
{
    private readonly List<AggregateRoot> _modificados = [];
    private readonly List<AggregateRoot> _iniciados   = [];

    public IEnumerable<AggregateRoot> ModificadosConCambios =>
        _modificados.Where(ar => ar.UncommittedEvents.Count > 0);

    public void ClearChangeTracker() { _modificados.Clear(); _iniciados.Clear(); }
    protected void RastrearIniciado(AggregateRoot ar)   => _iniciados.Add(ar);
    protected void RastrearModificado(AggregateRoot? ar) { if (ar is not null) _modificados.Add(ar); }
}

// Marten te da DOS sesiones (las registra e inyecta AddMarten, abajo): IDocumentSession (escribir) y IQuerySession (leer)
public class MartenEventStore(IDocumentSession session, IQuerySession querySession)
    : MartenUnitOfWork, IEventStore
{
    public void StartStream(AggregateRoot ar)                       // tu StartStream → Marten
    {
        if (string.IsNullOrEmpty(ar.Id)) throw new ArgumentException("El agregado necesita un Id.");
        session.Events.StartStream(ar.Id, ar.UncommittedEvents);
        RastrearIniciado(ar);
    }

    public async Task<T?> GetAggregateRootAsync<T>(string id, CancellationToken ct = default)
        where T : AggregateRoot, new()                             // tu rehidratar → AggregateStreamAsync
    {
        var ar = await querySession.Events.AggregateStreamAsync<T>(id, token: ct);
        if (ar is not null) ar.Id = id;        // el id es la llave del stream (El almacén en memoria): lo estampamos al cargar
        RastrearModificado(ar);
        return ar;
    }

    public void AppendEvent(string id, object hecho) => session.Events.Append(id, hecho);

    public async Task<bool> ExistsAsync<T>(string id, CancellationToken ct = default) where T : AggregateRoot
        => await querySession.Events.FetchStreamStateAsync(id, ct) is not null;

    public async Task SaveChangesAsync(CancellationToken ct = default)   // tu SaveChanges → session.SaveChangesAsync
    {
        foreach (var ar in ModificadosConCambios)
        {
            session.Events.Append(ar.Id, ar.UncommittedEvents);
            ar.ClearUncommittedEvents();
        }
        ClearChangeTracker();
        await session.SaveChangesAsync(ct);
    }
}
```

El mapeo, lado a lado:

| Tu almacén en memoria ([El almacén directo](el-almacen-directo.md)) | Marten |
|---|---|
| `GetAggregateRootAsync` → recorrer el cajón y `Load` | `querySession.Events.AggregateStreamAsync<T>(id)` (reproduce el stream **llamando tus `Apply(T)`** de [Aplicar al levantar](aplicar-al-levantar.md)) |
| `StartStream(ar)` → guardar en `_cajones` | `session.Events.StartStream(ar.Id, ar.UncommittedEvents)` |
| volcar `UncommittedEvents` | `session.Events.Append(id, eventos)` |
| `SaveChangesAsync` | `session.SaveChangesAsync()` |
| `ExistsAsync` | `querySession.Events.FetchStreamStateAsync(id)` |

> [!NOTE]
> **Un matiz fino entre tu almacén en memoria ([El almacén directo](el-almacen-directo.md)) y Marten** (no te detiene, pero el anclaje es 1:1 con esto claro): en [El almacén directo](el-almacen-directo.md) `SaveChangesAsync` drenaba **las dos listas** (`_iniciados` y `_modificados`). Con Marten, `StartStream` **ya entrega** los hechos del agregado nuevo a la sesión en el momento (línea `session.Events.StartStream(ar.Id, ar.UncommittedEvents)`); por eso el `SaveChangesAsync` de arriba solo recorre los **modificados** y `RastrearIniciado` sirve para la **unión** de agregados y la limpieza, **no** para re-anexar. Lo que difiere el commit en ambos casos es la misma idea —nada toca Postgres hasta `session.SaveChangesAsync()`—, solo cambia *cuándo* se entregan los hechos del alta. (Así es exacto en la plantilla del equipo.)

> [!IMPORTANT]
> **Lo que NO cambió:** ni `Empresa`, ni sus `Apply(T)`, ni `decide`, ni los handlers, ni `IEventStore`. Marten rehidrata **llamando tus `Apply(EmpresaRegistrada)`, `Apply(PlanCambiado)`…** por convención — por eso en [Aplicar al levantar](aplicar-al-levantar.md) los hicimos **públicos y por tipo**. Tu motor *era* la forma que Marten esperaba.

## Configurar Marten y hacer el swap

Marten se configura una vez, en el arranque (con la cadena de conexión de tu Postgres de [Docker y PostgreSQL](docker-postgres.md)). Necesitarás `using Marten;` y `using JasperFx.Events;` (de ahí salen `StreamIdentity` y `EventNamingStyle` en Marten 9):

```csharp
services.AddMarten(options =>
{
    options.Connection("Host=localhost;Port=5432;Database=gestion_eventstore;Username=gestion;Password=dev_local_pwd");
    options.UseSystemTextJsonForSerialization();
    options.Events.StreamIdentity   = StreamIdentity.AsString;        // la llave del stream es string (tu Id)
    options.Events.EventNamingStyle = EventNamingStyle.SmarterTypeName; // guarda el nombre del tipo de evento
}).UseLightweightSessions();

// EL SWAP: una línea
services.AddScoped<IEventStore, MartenEventStore>();   // antes: InMemoryEventStore
```

Eso es todo el cambio en producción: **registrar `IEventStore` apuntando a `MartenEventStore`**. El resto del programa —que solo conoce `IEventStore`— ni se entera.

> [!NOTE]
> `StreamIdentity.AsString` le dice a Marten que la llave del stream es un **string** (tu `Id`), no un `Guid`. Y `EventNamingStyle.SmarterTypeName` resuelve el "muro" de [Docker y PostgreSQL](docker-postgres.md): Marten guarda el **nombre del tipo** de cada evento en la BD y lo usa para **deserializar al tipo correcto** al leer. El problema que ibas a escribir a mano, resuelto.

## Levanta la magia: mira el SQL

Con Postgres corriendo (`docker compose up -d`, [Docker y PostgreSQL](docker-postgres.md)) y la app conectada, Marten crea sola una tabla `mt_events`. Asómate:

```bash
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore -c "\dt"
docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore -c "SELECT version, type, data FROM mt_events ORDER BY version;"
```

Verás una fila por hecho, con su `version`, el `type` (`empresa_registrada`, `plan_cambiado`…) y el `data` en **JSONB** — exactamente el diario que diseñaste, ahora en Postgres. No es una caja negra: es lo que tú habrías escrito, hecho por expertos.

> [!NOTE]
> ⚖️ **Cómo escribe Marten aquí (semilla para [Las dos vertientes](dos-vertientes.md)).** Fíjate que cargamos con `AggregateStreamAsync` y escribimos aparte con `Events.Append` — **dos pasos**. La doc de Marten recomienda hoy otro camino para el flujo de escritura: `FetchForWriting<T>(id)`, que carga **y** deja la sesión lista para anexar con **concurrencia optimista incluida**. La capa del equipo eligió `AggregateStreamAsync`+`Append` (verás por qué, y qué cuesta, en [Las dos vertientes](dos-vertientes.md) "las dos vertientes"). Por eso tu concurrencia ([El almacén directo](el-almacen-directo.md)) la haces tú, no `FetchForWriting`.

> [!NOTE]
> 🌱 **Semilla — el `Id` y los `Apply(T)`, dos caminos.** Mantuvimos los eventos **sin id** (el id es la llave del stream, [El almacén en memoria](el-almacen-en-memoria.md)) y lo estampamos al cargar (`ar.Id = id`). La plantilla del equipo toma el otro camino: su evento de creación **lleva** el id y su `Apply` lo estampa. Ambos funcionan con Marten; el nuestro deja los eventos más limpios. (Lo retomamos en [Las dos vertientes](dos-vertientes.md).)

> [!NOTE]
> 🌱 **Semilla — el viaje en el tiempo, gratis.** `AggregateStreamAsync` acepta una **versión** o una **fecha**: `AggregateStreamAsync<Empresa>(id, version: 3)` te da la empresa **como era en la versión 3**. Marten te regala el *time-travel* que tu event store ya hacía posible. (La plantilla expone esas sobrecargas en su `IEventStore`.)

---

## ✅ Compruébalo

- [ ] Extrajiste `IEventStore`; `InMemoryEventStore` la implementa y los handlers dependen de **`IEventStore`**, no del concreto.
- [ ] `MartenEventStore` mapea cada método al de Marten (`AggregateStreamAsync`/`StartStream`/`Append`/`SaveChangesAsync`/`FetchStreamStateAsync`).
- [ ] El swap fue **una línea** de registro (`AddScoped<IEventStore, MartenEventStore>()`); el dominio y los handlers **no** cambiaron.
- [ ] Con Postgres arriba, `SELECT * FROM mt_events` muestra tus hechos en JSONB.
- [ ] Explica por qué Marten puede rehidratar tu `Empresa` **sin que se la describas**: usa tus `Apply(T)` públicos por convención.

---

## 📓 Registra tu avance

```bash
git add . && git commit -m "ES · Revelar Marten" \
  -m "Con mis palabras: ¿qué método tuyo se volvió qué llamada de Marten? ¿Por qué el reveal fue 1:1 y no un rediseño?"
git push
```

---

## 🧠 En una frase

Como tu motor ya tenía la forma del canon, adoptar Marten es **extraer `IEventStore`** y escribir un `MartenEventStore` que **mapea 1:1** tus métodos a Marten (`AggregateStreamAsync`/`StartStream`/`Append`/`SaveChangesAsync`) — un **swap de una línea** en el registro, con el dominio intacto, y tus hechos viviendo ya en `mt_events` (JSONB) sobre Postgres.

---

[⬅️ Volver: El almacén directo](./el-almacen-directo.md)

[➡️ Siguiente: El gran reveal (2) — Wolverine y el commit automático](./revelar-wolverine.md)
