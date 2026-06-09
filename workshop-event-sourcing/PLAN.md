# Plan del Taller: Event Sourcing con la Critter Stack — hasta dominar `Cosmos.BuildingBlocks`

> **Estado: PROPUESTA para revisión (v2, reorientada a la plantilla real).** Una vez aprobado, se construye fase por fase, validando cada una con el script + agentes.

---

## Propósito

Llevar a un desarrollador que **ya programa en C#** desde los fundamentos del lenguaje que el event sourcing exige hasta poder **entender al 100%, dar soporte y mantener `Cosmos.BuildingBlocks`** — la plantilla base de todos los proyectos Cosmos (Marten + Wolverine), y estar **al día con la documentación oficial** de Marten y Wolverine para actualizarla cuando haga falta.

El norte no es abstracto: es **concreto y medible**. Al terminar, el aprendiz puede abrir cualquier archivo de `Cosmos.BuildingBlocks`, explicar qué hace, por qué está así, qué API de Marten/Wolverine usa por dentro, y extenderlo o corregirlo con criterio.

## El norte: `Cosmos.BuildingBlocks`

Es una colección de paquetes NuGet (**.NET 10, C# 14, Marten 8.23, WolverineFx 5.18**) con dos dominios:

```
EVENT DRIVEN (EDA)                         EVENT SOURCING (CQRS)
EventDriven.Abstractions                   EventSourcing.Abstractions
  IEvent · IPublicEvent · IPrivateEvent      AggregateRoot · IEventStore · IProjectionStore
  IPublicEventSender · IPrivateEventSender    IAggregateRootReader · ICommandHandler(Async)
EventDriven.CritterStack                     ICommandRouter · IQueryHandler · IQueryRouter
  WolverinePublic/PrivateEventSender        EventSourcing.CritterStack
EventDriven.CritterStack.RabbitMQ            MartenEventStore · MartenUnitOfWork
  outbox/inbox duradero, ToRabbitExchange    UnitOfWorkMiddleware · WolverineCommand/QueryRouter
EventDriven.CritterStack.AzureServiceBus     MartenProjectionStore · Tap/Map · WolverineExtensions
  serverless, SendInline / DurableOutbox    EventSourcing.Linq.Extensions (ToListAsync/AnyAsync)
                                            EventSourcing.Testing.Utilities
Cosmos.MultiTenancy                           TestStore · CommandHandlerTest(Base/Async)
  ITenantResolver · InvokeForTenantAsync      TestPublic/PrivateEventSender · Given-When-Then
```

**Todo concepto que aparezca en estos paquetes debe estar en el taller.** El plan está organizado para que cada pieza tenga su lección, construida primero desde cero (para entenderla) y luego mapeada a la plantilla (para mantenerla).

## Para quién es

Para quien **sabe programar en C#** (el taller básico u otro equivalente). No se enseña C# desde cero, pero se refuerzan a fondo los idiomas que ES y la Critter Stack exigen —incluidos los rasgos de **C# 14** que la plantilla usa (extension members)—. No se da por sabido nada de event sourcing, Marten ni Wolverine.

## Decisiones de diseño (acordadas)

| Decisión | Elección | Por qué |
|---|---|---|
| Objetivo final | **Dominar y mantener `Cosmos.BuildingBlocks`** | Es la meta real del usuario, concreta y medible |
| Versión | **.NET 10 / C# 14** | La plantilla lo exige (extension blocks, net10.0). Subimos el piso respecto al básico/DevOps |
| Método pedagógico | **Revelar el concepto a través de la práctica** (🟢 ingenuo → 💥 dolor → 🔧 refactor → 🏷️ patrón) | Pedido explícito del usuario |
| Hilo conductor | **`gestion-empresas` (la `Empresa`), event-sourced** | Reusa el dominio que el alumno ya conoce en CRUD |
| Agregado | **Funcional primero (entender), luego el `AggregateRoot` OO de la plantilla** | La plantilla usa una clase mutable con `Apply` + `_uncommittedEvents`; se llega a ella tras entender el fold puro |
| Workflow | **Enseñar el nativo (`FetchForWriting`/`[Aggregate]`) Y la capa propia de Cosmos** | La plantilla NO usa el nativo; el aprendiz debe saber ambos y por qué Cosmos eligió su capa |
| Mensajería | **RabbitMQ local + Azure Service Bus (a nivel "entender la plantilla")** | Ambos transportes están en la plantilla; lo distribuido a escala va al taller de EDA |
| Multi-tenancy | **El "qué" (por mensaje y por sesión Marten)** | Está horneado en cada router/sender; lo profundo (FIFO/entre servicios) va al taller de EDA |
| Mantenimiento | **Incluido**: versionado NuGet multi-paquete, publicación, estar al día con la doc | El objetivo es "dar soporte y actualizar" |
| Base de datos | **PostgreSQL** | Marten corre sobre Postgres |

## El método (eje del taller)

```
🟢 ingenuo → escribes la solución obvia que ya sabes
💥 dolor   → topas con su límite
🔧 refactor → evolucionas el código
🏷️ patrón  → le pones el nombre que la industria/la plantilla le da
```

Ejemplos que vertebran las fases: `class` mutable → `record`; `if/else` → `switch`; copiar el store → genéricos; `new` por todos lados → DI; método de extensión clásico → **extension block C# 14**; `UPDATE` → `Append`; event store a mano → `MartenEventStore`; "publicar y rezar" → outbox transaccional; mocks → `TestStore` en memoria.

## Filosofía (heredada del básico y el DevOps)

Manual primero → revelar el framework · levantar la magia (mostrar `mt_events` y el código que Wolverine genera) · currículo en espiral (🌱→🌳) · profesional sin narrativa de personajes · propósito y comprobación, no copiar y pegar · siempre el tradeoff y el "cuándo NO" · validar cada fase con script + agentes desde el día 1.

## El taller hermano: EDA / Aplicaciones distribuidas

Este taller cubre la plantilla **a fondo**, incluidos sus módulos de RabbitMQ, Azure Service Bus y multi-tenancy, al nivel necesario para **entenderla y mantenerla**. El **diseño de sistemas distribuidos más allá de la plantilla** —coreografía vs orquestación, sagas entre servicios, multi-tenancy FIFO a escala, consistencia eventual entre bounded contexts, Azure Service Bus en producción— será un taller separado (`workshop-eda`), el siguiente peldaño.

---

## De dónde venimos: el dolor que motiva el taller

En el básico, tu `gestion-empresas` guardaba cada empresa como una **fila** que se **sobrescribe**: cada `UPDATE` destruye el pasado. Solo ves la **foto**, nunca la **película**. El event sourcing guarda **cada cambio como un hecho inmutable** y deriva el estado reproduciéndolos. Y la plantilla de tu empresa, `Cosmos.BuildingBlocks`, ya está construida sobre esa idea — este taller te lleva a entenderla del todo.

---

## El mapa de fases

### Movimiento I — Fundamentos y la Critter Stack desde cero

| Fase | Carpeta | Concepto central |
|---|---|---|
| **0** | `00-por-que-event-sourcing/` | Foto vs Película · setup .NET 10 |
| **1** | `01-csharp-moderno-para-eventos/` | records · pattern matching · genéricos · delegados |
| **2** | `02-csharp-asincronia-y-composicion/` | async · LINQ · DI · **C# 14: extension members** y rasgos de la plantilla |
| **3** | `03-diseno-del-dominio/` | lenguaje ubicuo · agregado · evento · comando |
| **4** | `04-event-sourcing-a-mano/` | del `decide/evolve` funcional al **`AggregateRoot` OO** (`Apply` + uncommitted) |
| **5** | `05-persistencia-con-marten/` | Marten: sesiones · `StartStream`/`Append`/`AggregateStreamAsync` · concurrencia |
| **6** | `06-cqrs-y-proyecciones/` | proyecciones live/inline/async daemon · `Query<T>` · read models |
| **7** | `07-wolverine/` | handlers por convención · HTTP · codegen · middleware · `AutoApplyTransactions` |
| **8** | `08-la-critter-stack-nativa/` | Aggregate Handler Workflow (`FetchForWriting`) · testing given-when-then |

### Movimiento II — Dominar y mantener `Cosmos.BuildingBlocks`

| Fase | Carpeta | Concepto central |
|---|---|---|
| **9** | `09-eventos-publicos-y-privados/` | `IPublicEvent`/`IPrivateEvent` · senders · `DeliveryOptions` · groupId/FIFO |
| **10** | `10-mensajeria-fiable/` | RabbitMQ (outbox/inbox duradero) · Azure Service Bus / serverless |
| **11** | `11-multi-tenancy/` | `ITenantResolver` · `InvokeForTenantAsync` · Marten `TenancyStyle.Conjoined` |
| **12** | `12-anatomia-buildingblocks/` | abstracciones · `MartenEventStore` · `MartenUnitOfWork`+middleware · routers · capa propia vs nativa |
| **13** | `13-el-paquete-de-testing/` | `TestStore` · senders en memoria · `Then`/`ThenIsPublished`/`And` |
| **14** | `14-evolucion-y-operacion/` | upcasting · rebuild de proyecciones · snapshots · subscriptions · observabilidad |
| **15** | `15-mantener-la-plantilla/` | NuGet multi-paquete · `publish(...)` · versionado · estar al día con la doc |
| **16** | `16-capstone/` | extender/mantener BuildingBlocks de punta a punta · puente a EDA y Cosmos |

> Las **Fases 1-2** (fundamentos) son densas y **autocontenidas**: separables a un mini-taller `workshop-csharp-para-eventos` si crecen demasiado.

---

## Detalle de las fases (borrador)

### Fase 0 — ¿Por qué event sourcing?
- **0.1** Tu `Empresa` no tiene memoria (foto vs película, sobre el CRUD del básico). *(concepto)*
- **0.2** Qué es —y qué no es— un evento (evento ≠ comando ≠ estado). *(concepto)*
- **0.3** Prepara tu entorno: **.NET 10**, Docker (Postgres/RabbitMQ), IDE; proyecto `Laboratorio`.

### Fase 1 — C# moderno para eventos I
- **1.1** `class` mutable → `record` (inmutabilidad, `init`, `with`, igualdad por valor).
- **1.2** `if` encadenado → `switch` expression (patrones de tipo, propiedad, deconstrucción).
- **1.3** copiar el motor → genéricos `<T>` + `where`.
- **1.4** lógica incrustada → delegados (`Func`/`Action`, orden superior; `decide`/`evolve` como funciones).
- **1.5** funciones puras y determinismo (el reloj va en el evento).

### Fase 2 — C#: asincronía, composición y C# 14
- **2.1** bloquear → `async/await` (con un dolor medible).
- **2.2** `for` acumulador → LINQ (`Aggregate`/`Select`/`Where`).
- **2.3** `new` por todos lados → Inyección de Dependencias (mini-contenedor a mano → el real).
- **2.4** minimal hosting y configuración.
- **2.5** **Extension members de C# 14**: método de extensión clásico → bloque `extension(X) { ... }` (sobre tipos, genéricos y `Task<T>`). *La firma estilística de toda la plantilla.*
- **2.6** Los rasgos de C# 14/.NET 10 que verás en la plantilla: primary constructors, collection expressions + spread (`[..a, ..b]`), interfaces marcadoras (`interface IEvento;`), `file`-scoped namespaces, `required`/`init`, `Guid.CreateVersion7()`, nullable + `where T : notnull`.

### Fase 3 — Diseño del dominio (DDD-light)
- **3.1** Lenguaje ubicuo (el nombre del evento es diseño). *(concepto)*
- **3.2** El agregado y la frontera de consistencia.
- **3.3** Comando vs evento; cómo se relacionan con eventos de dominio (privados) e integración (públicos) — siembra de EDA. 🌱
- **3.4** Bounded context (siembra).

### Fase 4 — Event sourcing a mano (del funcional al `AggregateRoot` OO)
- **4.1** Los eventos de la `Empresa` como `record`.
- **4.2** `evolve`: reconstruir plegando eventos (replay).
- **4.3** `decide`: el agregado valida y emite eventos (función pura).
- **4.4** Un event store en memoria + command handler.
- **4.5** **Del fold funcional al `AggregateRoot` orientado a objetos**: empaquetar `evolve` en métodos `Apply(TEvent)` de una clase base mutable con `_uncommittedEvents`, `Id`, `Version`; emitir = `Apply(e)` + `_uncommittedEvents.Add(e)`. *(Es exactamente el `AggregateRoot.cs` de la plantilla; se construye aquí.)*
- **4.6** Separar eventos privados y públicos en el agregado (`GetPrivateEvents`/`GetPublicEvents`). 🌱

### Fase 5 — Persistencia real con Marten
- **5.1** Postgres + JSONB con Docker.
- **5.2** `AddMarten` y configuración: `Connection`, `DatabaseSchemaName`, `UseSystemTextJsonForSerialization`, `StreamIdentity.AsString`, `EventNamingStyle.SmarterTypeName`.
- **5.3** `IDocumentSession` vs `IQuerySession`; `UseLightweightSessions`.
- **5.4** `session.Events.StartStream`/`Append` y `SaveChangesAsync` (reemplaza tu store a mano).
- **5.5** Rehidratar: `querySession.Events.AggregateStreamAsync<T>` — y cómo Marten invoca tus métodos `Apply` (self-aggregating). `FetchStreamStateAsync` para `ExistsAsync`.
- **5.6** Cómo lo hace por dentro: `mt_events`/`mt_streams`, el SQL. *(levantar la magia)*
- **5.7** Concurrencia optimista (versión esperada del stream).

### Fase 6 — CQRS y proyecciones
- **6.1** Escribir ≠ leer (cuándo NO). *(concepto)*
- **6.2** Proyecciones live / inline / async.
- **6.3** El async daemon (`AddAsyncDaemon(DaemonMode.HotCold)`).
- **6.4** `querySession.Query<T>()` y read models a medida (single/multi-stream).
- **6.5** Consistencia eventual y sus implicaciones.

### Fase 7 — Wolverine
- **7.1** El acoplamiento del handler a mano. *(dolor)*
- **7.2** Handlers por convención (`Handle`/`HandleAsync`); `IMessageBus` (`InvokeAsync`, `PublishAsync`).
- **7.3** Wolverine.HTTP (endpoints sin controladores).
- **7.4** Codegen (`dotnet run -- codegen write`) — levantar la magia.
- **7.5** Middleware por convención (`Before`/`After`/`Finally`) y `AutoApplyTransactions`.
- **7.6** Integración con Marten: `IntegrateWithWolverine()`, `DurabilityMode` (Solo/Balanced), transacción auto-aplicada.

### Fase 8 — La Critter Stack nativa
- **8.1** El **Aggregate Handler Workflow** nativo: `[Aggregate]`, `FetchForWriting`/`FetchLatest`. *(lo que la Critter Stack ofrece de fábrica)*
- **8.2** Eventos como retorno (side effects) y A-Frame architecture.
- **8.3** Testing sin mocks (given-when-then) — la idea, antes del paquete de Cosmos.

### Fase 9 — Eventos públicos y privados (EDA)
- **9.1** Evento de dominio (privado) vs de integración (público): por qué la distinción. *(concepto)* `IEvent`/`IPublicEvent`/`IPrivateEvent`.
- **9.2** Los senders: `IPublicEventSender`/`IPrivateEventSender` y su impl Wolverine (`PublishAsync` + `DeliveryOptions`; el ruteo lo decide el transporte, no el método).
- **9.3** Orden garantizado: `groupId` → `DeliveryOptions.GroupId` (FIFO).

### Fase 10 — Mensajería fiable
- **10.1** El mensajero muerto: por qué un mensaje se pierde. *(dolor)*
- **10.2** Outbox/Inbox transaccional y duradero (Wolverine + Marten).
- **10.3** RabbitMQ: `UseRabbitMqUsingNamedConnection().AutoProvision()`, `UseDurableOutboxOnAllSendingEndpoints`, `PublishMessage(t).ToRabbitExchange(...)`, `ListenToRabbitQueue(...).BindExchange(...).UseDurableInbox()`.
- **10.4** Idempotencia y dead letter queues.
- **10.5** Sagas / process managers (dentro de la app).
- **10.6** Azure Service Bus y serverless: `UseAzureServiceBus`, `SystemQueuesAreEnabled(false)`, `AddNamedAzureServiceBusBroker`, `ToAzureServiceBusTopic`, `SendInline` vs `UseDurableOutbox` (Azure Functions). *(entender el módulo de la plantilla; lo profundo, en el taller de EDA)*

### Fase 11 — Multi-tenancy
- **11.1** Por qué multi-tenancy y qué es un tenant (sin nombrar antes el concepto en el básico). *(concepto)*
- **11.2** Por mensaje: `ITenantResolver`, `InvokeForTenantAsync`, `DeliveryOptions.TenantId`.
- **11.3** Por sesión (Marten): `TenancyStyle.Conjoined`, `AllDocumentsAreMultiTenanted` — aislamiento por discriminador. *(lo profundo/FIFO/entre servicios → taller de EDA)*

### Fase 12 — Anatomía de `Cosmos.BuildingBlocks`
- **12.1** El grafo de paquetes y por qué está partido así (abstractions ← critterstack; ES.Abstractions → ED.Abstractions). Las tres soluciones.
- **12.2** El `AggregateRoot` de la plantilla (ya lo construiste en 4.5): leerlo línea a línea.
- **12.3** Las abstracciones: `IEventStore`/`IAggregateRootReader`/`IProjectionStore`, `ICommandRouter`/`IQueryRouter`, los 4 `ICommandHandler`, `IQueryHandler`.
- **12.4** `MartenEventStore`: `StartStream`/`AppendEvent`/`AggregateStreamAsync`/`FetchStreamStateAsync`; helpers `Tap`/`Map` sobre `Task<T>`.
- **12.5** El Unit of Work propio: `MartenUnitOfWork` (change tracker), `UnitOfWorkMiddleware` (`After`/`Finally`), y cómo `AutoApplyTransactions` cierra la transacción.
- **12.6** Los routers Wolverine (`WolverineCommandRouter`/`WolverineQueryRouter`) y el registro DI (`WolverineExtensions`).
- **12.7** `Cosmos.EventSourcing.Linq.Extensions`: envolver `Marten.QueryableExtensions` (`ToListAsync`/`AnyAsync`).
- **12.8** **Capa propia vs workflow nativo**: por qué Cosmos eligió `IEventStore` + `MartenUnitOfWork` en vez de `FetchForWriting`/`[Aggregate]` (abstracción, testabilidad, multi-tenant, serverless). Tradeoffs.

### Fase 13 — El paquete de testing de Cosmos
- **13.1** `TestStore`: un `IEventStore` en memoria; rehidratar por reflexión sobre `Apply` (y por qué el agregado necesita ctor sin args).
- **13.2** `TestPublicEventSender`/`TestPrivateEventSender`: senders que acumulan en vez de publicar.
- **13.3** `CommandHandlerTestBase`/`CommandHandlerTest`/`CommandHandlerAsyncTest`: `Given`/`When`/`Then`/`ThenIsPublished…`/`And`.
- **13.4** xUnit v3 (`TestContext.Current`) + AwesomeAssertions (`BeEquivalentTo`, `EquivalencyOptions`); escribir tests reales de un handler de `Empresa`.

### Fase 14 — Evolución y operación del sistema event-sourced
- **14.1** Versionado y upcasting de eventos.
- **14.2** Rebuild de proyecciones.
- **14.3** Snapshots.
- **14.4** Subscriptions / reenvío de eventos.
- **14.5** Observabilidad (OpenTelemetry; `TrackConnections`/`DisableNpgsqlLogging`).

### Fase 15 — Mantener y publicar la plantilla
- **15.1** Estar al día con la doc oficial de Marten/Wolverine: cómo leer los changelogs, fijar versiones, y detectar APIs desactualizadas (ejercicio: corregir los ejemplos `Save`/`GetByIdAsync` de los READMEs y la nota de CloudEvents).
- **15.2** Versionado NuGet multi-paquete: `<Version>` por `.csproj`, semver, la directiva `publish(...)` en el commit, pre-releases `-RC.N`.
- **15.3** Empaquetado: `GeneratePackageOnBuild`, `PrivateAssets`, incrustar `Cosmos.MultiTenancy.dll` con un Target MSBuild, el CI (`.github/workflows`).

### Fase 16 — Capstone
- **16.1** Extender/mantener `BuildingBlocks` de punta a punta: agrega una capacidad real (p. ej. una sobrecarga, una corrección) con su test, su versión y su PR.
- **16.2** Hacia dónde seguir: el taller de **EDA / aplicaciones distribuidas** y el producto **Cosmos** (multi-tenancy a escala, sagas entre servicios, Azure Service Bus en producción).

**Total estimado:** 17 fases (0-16), ~70 lecciones cortas.

---

## Reconciliaciones y tensiones (cómo las maneja el taller)

1. **Agregado funcional vs `AggregateRoot` OO de la plantilla.** Se enseña el `decide/evolve` funcional primero (Fase 4.1-4.4) porque es la forma más clara de **entender** el event sourcing; luego (4.5) se **empaqueta ese mismo fold** en la clase `AggregateRoot` mutable con `Apply` + `_uncommittedEvents` — que es literalmente la de la plantilla, y compatible con el self-aggregating de Marten.
2. **Workflow nativo (`FetchForWriting`/`[Aggregate]`) vs capa propia de Cosmos.** Se enseñan **ambos**: el nativo en la Fase 8 ("lo que la Critter Stack ofrece de fábrica") y la capa propia en la Fase 12, explicando **por qué** Cosmos eligió `IEventStore` + `MartenUnitOfWork` (abstracción, testabilidad, multi-tenant, serverless).
3. **.NET 8/C# 12 → .NET 10/C# 14.** Subimos el piso: la plantilla exige C# 14 (extension blocks). Los fundamentos enseñan los rasgos de C# 14 que la plantilla usa (Fase 2.5-2.6).
4. **Multi-tenancy "diferido" → en el taller.** El "qué" (por mensaje y por sesión Marten) se enseña aquí (Fase 11) porque está horneado en cada router/sender; lo profundo (FIFO/entre servicios) va al taller de EDA.
5. **CloudEvents y los READMEs desactualizados.** CloudEvents se cita pero **no está implementado**: se menciona como estándar opcional, no como "lo que hace la plantilla". Los ejemplos obsoletos de los READMEs (`Save`/`GetByIdAsync`) se usan como **ejercicio de mantenimiento** (Fase 15.1).

---

## Prerequisitos, costos y validación

- **Saber programar en C#** (básico u equivalente). **.NET 10 SDK**, **Docker** (Postgres/RabbitMQ), un IDE. Nuevos: Marten, Wolverine, PostgreSQL como event store, RabbitMQ, xUnit v3/AwesomeAssertions.
- **Costos:** casi todo corre local (Postgres/RabbitMQ en Docker, sin costo). Azure Service Bus —que costaría— se trata a nivel "entender el módulo"; lo de producción, en el taller de EDA.
- **Validación desde el día 1:** `tools/validate-workshop.sh` + agentes `revisor-coherencia` y `verificador-tecnico` (que **ejecuta `dotnet build`** sobre el código y lo coteja con la plantilla y la doc oficial), + `revisor-principiante` para claridad.

## Próximos pasos

1. **Revisar y ajustar este plan v2.**
2. La muestra ya construida (README + Fase 0 + Fase 1) se mantiene; ajustarla a .NET 10 y añadir las lecciones de C# 14 (Fase 2.5-2.6).
3. Construir fase por fase, validando cada una contra el código real de `Cosmos.BuildingBlocks`.
