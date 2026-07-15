# 🗺️ Mapa del taller — qué construyes en cada sección (y qué aprendes)

> 📖 ¿Buscas el **panorama como relato** (sin código, de corrido)? → [`NARRATIVA.md`](NARRATIVA.md). Este mapa es la **referencia por sección**: qué construyes y qué aprendes en cada una.

Este taller es **hands-on**: en cada sección **te reto a escribir el código tú mismo** (te describo qué construir, lo intentas, y luego revelo una forma de hacerlo en un bloque `<details>`). Lo que es idioma nuevo de C# —demasiado para inventarlo de cero— **se te muestra** directamente.

## El norte (v7)

El norte del taller es entender la **conexión de cada pieza** de `Cosmos.BuildingBlocks` a fondo —para **usarla, mantenerla y extenderla con criterio**, no por fe en la doc—. Por eso construimos **a mano** un motor de event sourcing: es un **andamio deliberado**. La librería nació sobre la Critter Stack (Marten **9.2.1** / Wolverine **6.1.0**); invertimos el orden a propósito, para que cuando la herramienta te dé algo hecho, sepas exactamente qué hace por debajo, porque lo escribiste tú. El caso emblemático del criterio: decidir si adoptar (o no) `FetchForWriting`.

> **Foto al 2026-07-07 · N=14 secciones construidas de ~40 planeadas (v7 en construcción); re-sincronizar al avanzar.**

---

## Lo construido

Las 14 secciones que existen hoy, en el orden real (sigue los ➡️ de cada archivo):

1. **[El diario de una empresa](secciones/el-diario-de-una-empresa.md)** — sección conceptual (sin código): guardar el **diario** de hechos en vez de la **foto** del estado. Aprendes qué es **Event Sourcing** y por qué un `UPDATE` destruye el pasado que el diario conserva.

2. **[Los primeros hechos](secciones/los-primeros-hechos.md)** — escribes los primeros eventos como `record` inmutables y reconstruyes el estado con un `foreach` (el **Replay**). Aprendes que el estado **no se guarda, se reconstruye** (el paso `evolve`), dentro de un **Aggregate Root**.

3. **[Refactorizando el motor](secciones/refactorizando-el-motor.md)** — refactorizas el motor de replay en tres pasos: separar recorrer de aplicar, subirlo a una clase base **`AggregateRoot`**, y rutear por tipo con un `switch`. Aprendes separación de responsabilidades, herencia y **pattern matching** — un motor que crece sin volverse un `if` interminable.

4. **[El flujo de vida (EventStream)](secciones/el-flujo-de-vida.md)** — envuelves la historia de una empresa en un `EventStream<T>` genérico, dueño de su lista, con `Append` (anotar) y `Get` (rehidratar). Aprendes el patrón **Repositorio** y qué es un **Event Stream** (la historia de UNA empresa).

5. **[Decidir el futuro (emitir eventos)](secciones/decidir-el-futuro.md)** — le das a la `Empresa` métodos `decide` (`CambiarPlan`/`Suspender`/`Reactivar`) que **devuelven** el hecho sin tocar el estado, con validación e idempotencia. Aprendes que **decidir ≠ aplicar** y a distinguir lo **inválido** (se rechaza) de lo **redundante** (se ignora).

6. **[El Command Handler](secciones/el-command-handler.md)** — encapsulas el ciclo **cargar → actuar → guardar** en una clase handler **por comando**. Aprendes a sacar la logística del `Program.cs` a una pieza con un solo trabajo (responsabilidad única), dejando la lógica de negocio en el agregado.

7. **[El despachador: dado un comando, encuentra su handler](secciones/el-despachador.md)** — construyes un `Despachador` (tabla `tipo → handler`) que rutea cualquier comando a su handler. Al hacerlo **nacen** el **`record` por comando** (identidad de tipo) y el contrato **`ICommandHandler<T>`** — en su momento de necesidad.

8. **[El almacén: un cajón por empresa](secciones/el-almacen-por-id.md)** — construyes el `EventStore` (un cajón de hechos por id) y haces que el handler abra el stream por el `EmpresaId` del comando. Aprendes el patrón **Event Store** y que **el id es la llave**: handlers registrados una sola vez sirven a todas las empresas.

9. **[Cuando dos escriben a la vez (concurrencia optimista)](secciones/concurrencia-optimista.md)** — envuelves cada hecho en un sobre `EventoAlmacenado(Version, …)` y el almacén rechaza un `Append` cuya posición ya está ocupada. Aprendes el dolor de la **actualización perdida** y la **concurrencia optimista** (no bloquear; verificar la versión al guardar).

10. **[Blindar el motor: Given-When-Then](secciones/given-when-then.md)** — destilas una base de test con tres verbos —`Given` (hechos previos), `When` (comando), `Then` (hechos emitidos)— partida entre el **motor** (intercambiable) y los **escenarios** (el invariante). Aprendes que en ES un test afirma **eventos**, no filas — y a escribirlos para que sobrevivan al swap.

11. **[Conoce a Marten: una base de datos de documentos](secciones/conoce-a-marten.md)** — descubres por qué un evento **es un documento** (no una fila) y por qué escribir su persistencia a mano no escala (el `switch` que crece, más conexión, índices y control de versión en SQL); luego levantas Postgres en Docker, guardas y lees un objeto de C# con Marten y lo ves convertido en `JSONB`, sobreviviendo a un reinicio. Aprendes el giro: Marten es de nacimiento una **base de datos de documentos** (`DocumentStore`), y como **un evento es solo otro documento**, el event sourcing viaja sobre esa misma maquinaria.

12. **[El swap: tu motor sobre Marten](secciones/el-swap.md)** — reemplazas, en tu proyecto real, el almacén casero por Marten pieza por pieza: los handlers usan `IDocumentSession` (`AggregateStreamAsync`/`Append`/`SaveChangesAsync`) y la `Empresa` reconstruye por convención (`Apply` por tipo). Aprendes el **lock-in** que asumes a propósito y por qué la concurrencia optimista queda pendiente para `FetchForWriting`.

13. **[Tests de integración: validar el swap](secciones/tests-de-integracion.md)** — revives los escenarios Given-When-Then contra Marten + Postgres reales cambiando **solo la base** (un `MartenFixture` que crea el store una vez), con `ResetAllData` por test. Aprendes que ese verde **valida el swap** y por qué estos tests son lentos (Docker, red) frente a los de RAM.

14. **[El almacén abstracto: tests rápidos sin Postgres](secciones/el-almacen-abstracto.md)** — metes una costura `IEventStore` (rehidratar + encolar + confirmar) con dos motores: `MartenEventStore` (producción) y `TestStore` (tests, en memoria). Recuperas tests **rápidos sin Postgres** y descubres que acabas de reconstruir, a mano, piezas que `Cosmos.BuildingBlocks` trae hechas.

---

## Lo que viene (planeado)

El roadmap de las secciones aún **no construidas** (definidas en [`REPLANTEO.md`](REPLANTEO.md)). Van marcadas 📋 **sin enlace** porque los archivos todavía no existen; se listan por su nombre y bloque para no adelantar links rotos.

### Bloque D — El lado de lectura (CQRS)
- 📋 **Proyecciones** — el read model separado (una proyección = fold de eventos hacia un documento consultable); `Query<T>` tipo LINQ. La #14 apunta a esta sección como siguiente.
- 📋 **Lifecycles + el daemon de proyecciones** — `MultiStreamProjection` async + `AddAsyncDaemon(HotCold)`, checkpoints.

### Servicio y DI
- 📋 **API + Inyección de Dependencias** — registrar Marten `Scoped`, HTTP, y curar el "infierno de los `new`"; aquí el `async` cobra sentido real (un servidor que agota hilos).

### Bloque E — Marten a fondo
- 📋 **`MartenUnitOfWork` y los dos caminos de flush** — `_started` vs `_modified`; el "por qué se guarda sin que yo llame `SaveChanges`".
- 📋 **`FetchForWriting` — momento-criterio** — el write-path que la doc recomienda y la plantilla **NO** usa; aquí decides si adoptarlo (recupera la concurrencia de la §9).
- 📋 **Versionado y upcasting de eventos** — el esquema evoluciona; traducir versiones antiguas al leer, jamás reescribir la historia.
- 📋 **Auditoría** (metadata/correlation) y 📋 **Suscripciones** (reaccionar a hechos, retries/catch-up).

### Bloque F — Revelar Wolverine (el mediador)
- 📋 **Revelar Wolverine** — discovery por assembly + `IntegrateWithWolverine` + `UnitOfWorkMiddleware` + `AutoApplyTransactions`; tu `Despachador` y el guardado central, industrializados.
- 📋 **El handler por convención** — el handler de evento es un `Handle()` plano hallado por discovery, sin interfaz.

### Bloque G — Event-Driven (EDA)
- 📋 **Público vs privado** — marcadores vacíos `IPublicEvent`/`IPrivateEvent`; el ruteo vive en la config de arranque, no en el sender.
- 📋 **El sobre** — `TenancyDelivery.Build` (TenantId + user_id + groupId); converge el sobre-versión de la §9 con el sobre de mensajería.
- 📋 **Outbox e Inbox** — `UseDurableOutbox*`; matar el proceso y que el mensaje sobreviva.
- 📋 **Transportes reales** — RabbitMQ (AutoProvision) vs Azure Service Bus; el validador de routing añadido-y-retirado como momento-criterio.
- 📋 **UI en vivo** (SignalR sobre suscripciones) y 📋 **Serverless** (`Solo` + `ManualOnly` + `SendInline`).

### Bloque H — Multi-tenancy
- 📋 **De un cliente a muchos** — `TenancyStyle.Conjoined`, la llave pasa de `id` a `(tenant, id)`.
- 📋 **¿De dónde sale el tenant?** — `TrustedHeadersTenantResolver` (`X-Tenant-Id`, falla ruidoso).
- 📋 **El tenant viaja con el mensaje** — `WolverineMessageContextTenantResolver` + `ProxyTenantResolver`; `TenantId` nativo, `UserId` como header manual.

### Bloque I — La plantilla: el norte
- 📋 **Las dos vertientes** — con lo nativo vivido, por qué el equipo abstrajo en interfaces y por qué **no** usa `FetchForWriting`.
- 📋 **El agregado de la plantilla** — la forma real (`_uncommittedEvents`, `Id`, `Version`, `GetPublicEvents`/`GetPrivateEvents`); el `Apply` lo define cada agregado.
- 📋 **El almacén de la plantilla + `TestStore`** — `IEventStore` + `MartenEventStore` + `MartenUnitOfWork`, aplicando por reflexión.
- 📋 **Consumir `Cosmos.BuildingBlocks`** — los paquetes como NuGet, los `.sln`, extension members de C#14, el idioma dual (código en inglés, extensiones en español).
- 📋 **Empaquetar y publicar** — versionado LOCKSTEP, `Directory.Build.props`, la regla de clasificar el cambio.
- 📋 **Capstone — la decisión con criterio** — como mantenedor, evalúas y aplicas un cambio real a la librería (p. ej. adoptar `FetchForWriting`): la prueba de que ganaste el criterio.

---

## Cómo calificar mientras lo haces

En cada sección, intenta los retos **antes** de abrir el `<details>`, ejecuta, y anota tu resultado:
- `✅ entendí` — pude construirlo solo con la guía.
- `🟡 me costó` — lo saqué, pero con esfuerzo / abrí la solución antes de tiempo.
- `🔴 no entendí` — la guía no me alcanzó para intentarlo.

Las que marques 🟡/🔴 son candidatas a reforzar (más pista en el reto, partir la sección, o un ejemplo extra).
