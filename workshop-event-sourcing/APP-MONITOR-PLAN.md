# 📟 Nuestro observador de sistemas event-sourced — plan

> **Qué es.** Una herramienta de observabilidad **propia** (sin licencia, construida por nosotros), para
> sistemas event-sourced sobre **Marten + Wolverine**. Dos usos, **un mismo artefacto**:
> 1. **En el taller:** se construye **a lo largo de las secciones** —el alumno aprende event sourcing
>    *construyendo la herramienta que lo observa*— y revela paneles al ritmo de lo que va entendiendo.
> 2. **En producción:** el equipo la apunta a un proyecto real del **Application Plane** (Contabilidad,
>    Impuestos, ObligacionesPorPagar…), a **ControlPlane**, o a cualquier app sobre la Critter Stack, y
>    **observa su comportamiento** — sin tocar el proyecto observado.
>
> **Por qué existe (y no usamos el CritterWatch real):** CritterWatch es un producto **comercial y
> licenciado** de JasperFx (lo administrativo y el MCP son de pago; ver abajo). Y —más importante— la
> auditoría del Application Plane encontró que **nadie mide el rezago del daemon**: toda proyección es
> async y no hay instrumento que muestre el atraso (aporte **L6** de
> [`ACCIONABLES-APPLICATION-PLANE.md`](ACCIONABLES-APPLICATION-PLANE.md)). Esta herramienta **es esa pieza
> faltante**, construida con lo aprendido en el taller. Cierra el norte: *usar → mantener → **aportar de
> vuelta***.

## Cómo observa: agentless primero (la decisión que lo hace útil sin fricción)

- **Agentless (leer la BD, read-only):** se conecta al Postgres del proyecto y **lee** `mt_events`,
  `mt_streams`, el progreso del daemon (high-water / checkpoints), y las tablas de dead-letter / inbox /
  outbox de Wolverine. **No requiere cambiar el proyecto observado** — por eso se puede apuntar a los 11
  repos ES tal como están. "Read-only" aquí = **solo consulta, no muta**: observar no debe alterar lo
  observado. (Esto no es la limitación de licencia; es higiene de un observador.)
- **Instrumentado (snapshot push, como CritterWatch), opcional y después:** el proyecto añade nuestro
  paquete y publica *snapshots* por un transporte, para señales en vivo que la BD no da (p. ej. flujo de
  mensajes al vuelo). Requiere tocar el proyecto; es opt-in.
- **Acciones de operador (reprocesar DLQ, pausar listeners, rebuild):** *escriben* sobre el sistema
  observado. Llegan **al final y con guardas** (confirmación, entorno, permisos). No hay límite de
  licencia que nos las prohíba — solo el cuidado de que mutan producción.

**Recomendación:** **agentless como núcleo** (cero fricción, cubre timeline / streams / rezago /
dead-letters sobre cualquier proyecto ya existente) + instrumentación opcional para lo en-vivo + acciones
al final. Encaja con el taller: el motor a mano escribe a una tabla `eventos` (la lee agentless), y tras
el swap escribe a `mt_events` (la misma herramienta, esquema más rico). El **mismo** código observa el
juguete del alumno y un proyecto real.

## CosmosLens: arquitectura (Aspire + OpenTelemetry) y definición de listo

> **Nombre:** **CosmosLens** (los tableros / la lente). **Repo destino:** `didierymartinez/cosmos-trace`
> (existe, vacío — listo). *cosmos-trace* = el proyecto/herramienta; *CosmosLens* = su UI de tableros.

> **Referencia (arquitectura real de CritterWatch,** verificada en ronda 2 contra samples + doc oficial**):** app standalone que monitorea 1+ apps Wolverine; recibe telemetría *push* de los servicios por **transporte pluggable** (RabbitMQ / ASB / SQS / Postgres-queue / Redis / Kafka / HTTPS); guarda su estado en **Marten** (sabor SQL Server = **Polecat**; el "Ermine" del diagrama del blog: sin evidencia en código ni doc); en la postura *external-metrics* consulta **Prometheus vía PromQL**; empuja al navegador por **SignalR** (`/api/messages`) con una **SPA Vue embebida** (no React — React es elección *nuestra*). Su consola es **event-sourced con Marten** (dogfooding confirmado: las alertas son eventos inmutables). Copiamos el *modelo*, no el producto.

**Ingesta — de dónde saca los datos (tres vías, complementarias):**

- **Lectura agentless de Postgres** *(nuestro núcleo y diferenciador)* → **cubre más de lo que parecía.**
  Lo event-sourcing-nativo (timeline de streams, **rezago del daemon** vía tabla de *progression* de
  Marten, conteos) **y también** —hallazgo de las notas de JasperFx— **dead-letters, mensajes programados
  e inbox/outbox**, porque esos paneles leen el **`IMessageStore` durable de Wolverine** (tablas en
  Postgres), *no* la cola nativa del broker. Todo eso es agentless, read-only, **sin tocar el proyecto**.
  (CritterWatch mismo lo lee del store durable — lo verificamos abajo.)
- **OpenTelemetry → Prometheus → PromQL** *(métricas)* → throughput, duración de handlers, tasas. Marten y
  Wolverine **emiten OTel**; en la postura *external-metrics* de CritterWatch los servicios corren
  meter-only, Prometheus los *scrapea* y la consola **consulta por PromQL**. **No reimplementamos
  Prometheus: lo usamos**, exactamente como ellos. Las **trazas** OTel se correlacionan evento↔traza.
- **Push por transporte** *(instrumentado, en vivo)* → lo que la BD **no** da: liveness/heartbeat en vivo,
  métricas de manejo al vuelo, y el **canal de comandos de operador** (la escritura de vuelta). El
  servicio publica al *queue* `critterwatch` por el transporte (Postgres-queue, RabbitMQ, SQS, Redis,
  Kafka…). Opt-in, más adelante — y es lo único que exige instrumentar el proyecto.

### Refinamientos de las notas de diseño de JasperFx (`critterwatch/plans/`)

Navegamos las notas del propio equipo (no hay repo público de CritterWatch — es cerrado; esto es lo más
cercano a su fuente). Lo que ajusta nuestra definición:

- **Los paneles DLQ y Scheduled leen el `IMessageStore` durable, no el broker** (`09-FINDINGS.md`, regla
  universal). → **agentless los puede servir** leyendo las tablas de Wolverine en Postgres. Gran ampliación
  de lo que hacemos sin instrumentar.
- **Base = `Fleet.PostgresqlQueues`** (cola en la BD, **sin broker**): es "la ruta no-broker más realista de
  producción" y la de **paneles más ricos** (un servicio con store durable llena DLQ + Scheduled gratis).
  Confirmado como nuestra base.
- **Existe un modo *embedded*** (`AddCritterWatchEmbedded(conn, hostOwnsPrimaryStore, schemaName)` +
  `MapCritterWatchEmbedded()`): CritterWatch corriendo **dentro** del host con un store *ancillary*. Para
  el taller, un modo embedded temprano puede ser más simple que una consola aparte — a evaluar.
- **Modelo de dev/test = Aspire F5 + `Aspire.Hosting.Testing`**: `dotnet run` en el AppHost levanta todos
  los contenedores + proyectos; el test asegura que arranca y que las rutas (`/api/critterwatch/about`,
  `/services`) responden 200. **Adoptamos ese mismo *definition-of-done* por panel.**
- **Dos posturas de métricas** (push nativo vs *external* Prometheus/OTel): elegimos **external
  (OTel→Prometheus→PromQL)** por tu preferencia de OTel y porque desacopla al servicio de la consola.
- **API real** (de `plans/README.md`): consola `builder.AddCritterWatch(conn, configureWolverine, …)` +
  `app.UseCritterWatch()`; monitoreo `opts.AddCritterWatchMonitoring(critterWatchUri, controlUri)` con
  `.MetricsDataSource("prometheus")` / `.TraceProvider(...)`. Referencia para nombrar lo nuestro parecido.

**Presentación:**

- **React (SPA) + ASP.NET Core (API)**; **live por SignalR** (el mismo mecanismo de CritterWatch, cliente
  SignalR en React). Store propio en **Marten/Postgres**.
- **Aspire** **orquesta en dev** (Postgres + Prometheus + `gestion-empresas` + API + SPA, un `dotnet run`)
  y su dashboard ya muestra el OTel genérico; CosmosLens **complementa** con la lente ES, no lo duplica.

**Definición de listo (recomendación por defecto; confírmalas o procedo con ellas):**

| # | Decisión | Por defecto |
|---|---|---|
| 1 | Repo | `didierymartinez/cosmos-trace` (el tuyo) |
| 2 | Nombre de la UI | **CosmosLens** |
| 3 | Stack | **Siempre la versión más reciente** — .NET, Aspire, Marten, Wolverine, React. **Se verifica al construir** (nuget.org / npm), NO se asume de memoria. Aplica al tool **y al taller** (nada de pins viejos rezagados). |
| 4 | OTel | CosmosLens **emite y usa** OTel; las trazas/métricas genéricas van al dashboard de Aspire / un backend OTLP estándar; su valor propio son las **vistas ES-nativas** (DB reads) + la correlación evento↔traza |
| 5 | Frontend | **React (SPA)** + backend **ASP.NET Core (API)** — elección nuestra (CritterWatch usa una SPA **Vue** embebida; el patrón SPA+API+SignalR es el mismo). *(Ver la nota de abajo: el ALUMNO no escribe React — construye el lado ES en .NET; la SPA la damos nosotros.)* |
| 6 | Conexión | config de **N targets** (nombre + connstring **read-only**) → un CosmosLens observa varios proyectos (el juguete del alumno, Contabilidad, ControlPlane…) |
| 7 | Primer entregable (*walking skeleton*) | Aspire AppHost = Postgres + **`gestion-empresas`** (el hilo conductor) + API .NET + SPA React con el panel **Timeline** leyendo agentless. Verificado con `dotnet run`. |
| 8 | Orden de construcción | el de los paneles (timeline → rezago → dead-letters → flujo → servicios), cada uno verificado |
| 9 | Relación taller ↔ tool | `cosmos-trace` es la herramienta **real y completa** (React + .NET + Aspire + OTel). El taller enseña sus conceptos haciendo que el alumno construya el **lado event-sourcing en .NET** (las consultas/proyecciones que alimentan cada panel — el rezago, la timeline), **no la SPA**; observa con la CosmosLens que le damos. Al final lo apunta a `cosmos-trace` completo. (Igual que motor → Marten.) |

> **El alumno no construye React.** El taller es de event sourcing, no de frontend. Lo que el alumno
> construye por secciones es la **lógica de observación en .NET** (p. ej. la consulta que calcula el
> rezago, la proyección que alimenta la timeline); CosmosLens —la SPA que damos— la **renderiza**. Así el
> foco se queda en ES y el alumno igual entiende *cómo* se calcula cada panel (decisión #2 de arriba: se
> muestra la consulta detrás).

**A confirmar en el primer spike (no frena el arranque):** las versiones más recientes reales (nuget/npm),
el nombre exacto de la tabla de *progression* del daemon de Marten (para el rezago), los *source names* de
OTel de Marten/Wolverine, y el esquema de dead-letter de Wolverine.

**Estado: listo para construir.** Decisiones cerradas (React SPA + .NET API; siempre última versión;
`gestion-empresas` como app observada; repo `cosmos-trace`). El próximo prompt puede ser "constrúyelo":
arranco por el *walking skeleton* y de ahí panel por panel, verificado.

## Se conecta a los datos del alumno — nunca inventa

Regla de oro: **la herramienta solo muestra lo que existe de verdad en la BD que observa.** No simula. Lo
que puede leer depende del esquema que encuentre — y ese esquema es el mismo del juguete del alumno (era 1)
que el de un proyecto real (era 2), lo que hace el reveal honesto por diseño:

| Esquema que encuentra en el Postgres | Qué lee | En el taller aparece en |
|---|---|---|
| tabla `eventos(stream, version, tipo, datos jsonb)` (motor a mano) | streams y sus hechos | 15 |
| tabla de checkpoint del proyector + frente del diario | el rezago | 23-24 |
| hechos que rompieron una vista / cola de muertos a mano | fallos | 25 |
| `mt_events`, `mt_streams`, progreso del daemon (Marten) | todo lo anterior, sobre el esquema real | 29+ / **cualquier proyecto real** |
| tablas de dead-letter / inbox / outbox de Wolverine | dead-letters, flujo de mensajes | 30+ / **cualquier proyecto real** |

Antes de la 15 (motor en RAM/archivo) no hay BD que leer: ahí el alumno mira con `Console`/`SELECT`, como
hoy. La herramienta entra cuando hay Postgres.

## Dos eras (la herramienta madura con el taller, y termina sirviendo en producción)

- **Era 1 · esquema a mano (pos ~15-28).** Lee la tabla `eventos` del alumno (y su checkpoint): línea de
  tiempo, flujo de hechos, rezago, fallos. Es la herramienta naciendo, contra un esquema propio simple.
- **Era 2 · esquema real de la Critter Stack (pos 29+, y producción).** El mismo código pasa a leer
  `mt_events` / `mt_streams` / progreso del daemon / tablas de Wolverine. **Aquí deja de ser un juguete:
  el mismo binario que observa la `Empresa` del alumno observa Contabilidad o ControlPlane**, porque todos
  escriben el mismo esquema de Marten. El taller además **señala** el CritterWatch comercial (qué añade:
  flota, alertas, MCP) para que el alumno sepa que existe la versión de producción de pago — pero la
  nuestra ya es útil de verdad.

## Los paneles, mapeados a posiciones (y a la funcionalidad de CritterWatch)

| Panel | Aparece en | Funcionalidad de CritterWatch que cubre |
|---|---|---|
| Línea de tiempo de un stream ("¿qué le pasó a emp-7?") | 15 | vista de eventos / stream |
| Flujo de hechos (el diario en vivo) | 16 | event/message flow (versión ES) |
| **Rezago** (checkpoint vs frente) | 24 | estado de proyecciones / daemon lag |
| Fallos del proyector / dead-letters | 25 → 31 | dead-letter queues |
| Flujo de mensajes entre servicios | 30 | message flow |
| Salud del daemon y de la config | 32 | node/agent/endpoint health |
| Por cliente (tenant) | 35 | flota / tenants |
| Catálogo de servicios y alertas | 36 / cierre | service catalog, alerts |

## Cómo se revela "al ritmo de lo explicado"

Reveal = **posición del alumno** (una selección simple: "voy en la sección N", o una variable de entorno
`WORKSHOP_STAGE=N`) **∧ dato disponible**. Así un panel aparece cuando (a) ya se explicó y (b) hay datos
reales que mostrar. Nada de paneles vacíos ni adelantados.

## Distribución

- **Un repo** propio (`workshop-event-sourcing-monitor/`) + **una imagen Docker** publicada.
- El alumno corre algo como:
  ```bash
  docker run --rm -p 8080:8080 \
    -e WORKSHOP_STAGE=24 \
    -e POSTGRES="Host=host.docker.internal;Port=5432;Username=postgres;Password=postgres;Database=postgres" \
    <imagen>/workshop-monitor
  ```
  apuntando a **su** Postgres. Una sola imagen; los paneles se encienden con `WORKSHOP_STAGE` y con lo
  que encuentre en la base. (El repo permite además leer el código, en la filosofía del taller.)
- No hay re-descarga por sección: la misma imagen revela más a medida que el alumno avanza.

## Stack

**.NET / ASP.NET Core**, por dos razones: (1) en la Era 2 debe poder usar `AddCritterWatch()` real
(paquete .NET) y hablar con Wolverine; (2) coherencia con el taller. Frontend: lo mínimo para los
paneles (server-rendered + un poco de tiempo real; nada de SPA pesada).

## Lo que cambia en el "norte" (y hay que confirmar)

El norte era "construir tu propio Critter Watch". Con esto, el alumno **no construye el monitor** — lo
**corre** y observa; construye a mano el **motor** y los **conceptos** que el monitor visualiza. La
motivación ("ver el sistema respirar") se mantiene y hasta se cumple mejor. La app, por dentro, sí vive
el arco a-mano→herramienta — pero eso es asunto **nuestro**, no un reto del alumno.

## Decisiones (tomadas)

1. **Reveal = las dos condiciones juntas:** un panel aparece si `WORKSHOP_STAGE ≥ su posición` **y**
   hay dato real que mostrar. Control fino + honestidad.
2. **La app trae todo hecho, pero cada panel enseña la consulta/mecanismo detrás** — nada de magia: el
   alumno puede ver *cómo* se calcula el rezago, de dónde sale el flujo, etc.
3. **Se construye incremental, en paralelo a las secciones:** cada panel nace verificado contra el spike
   de su sección; nada de big-bang al final. **Precondición: investigar CritterWatch a fondo** —
   clonar el repo de ejemplos, leer el código, entender la instrumentación (`AddCritterWatchMonitoring`),
   la consola (`AddCritterWatch`), el modelo de telemetría y cada panel real, para que nuestros paneles
   converjan honestamente a los suyos. *(Investigación en curso; hallazgos abajo.)*

## Investigación de CritterWatch (hecha)

> Fuente: repo `JasperFx/CritterStackSamples` clonado (carpeta `critterwatch/`, samples Fleet.* + WebService.Http)
> + doc oficial. Detalle por archivo en `scratchpad/critterwatch-findings/` (consola, instrumentación,
> transportes, ui-paneles, arquitectura, samples-es).

### Cómo funciona (arquitectura real)

- **En cada servicio**: un *observer* del runtime de Wolverine que **batchea** estado y **publica un
  snapshot ~1/seg** por el **transporte que el proyecto ya usa** (broker, cola de BD, o HTTP). Se activa
  con `opts.AddCritterWatchMonitoring(uriConsola, uriPropia)` + `opts.ServiceName = "..."`. Dos URIs: #1 la
  cola de la consola (telemetría), #2 la cola propia del servicio (comandos de operador de vuelta). Paquete
  `Wolverine.CritterWatch`. El daemon/Marten es requisito del *event store explorer*, no del monitoreo.
- **La consola** (`AddCritterWatch(connString, configureWolverine) + UseCritterWatch()`, paquete `CritterWatch`):
  consume los snapshots y los **proyecta a su PROPIO Postgres vía Marten** (timeline/audit/alertas como
  eventos inmutables; métricas rolling con retención). **Dogfoodea Marten** — es en sí un ejemplo. Expone
  `/api/critterwatch/*`, un hub SignalR `/api/messages` y una SPA.
- **Canal de control**: una cola nombrada `critterwatch`. Los comandos de operador (replay DLQ, pausar
  listeners, rebuild de proyecciones) viajan como **mensajes entrantes**.

### El inventario de paneles (lo que hay que replicar), mapeado a la cadena

| Panel de CritterWatch | Qué muestra / necesita | Posición del taller |
|---|---|---|
| **Activity Timeline** | el "diario" en vivo (eventos que pasan) | 15-16 |
| **Event Store Explorer + Projection Stepper** | streams, eventos, y replay **paso a paso** (given-when-then visual) | 15-16 y 24 |
| **Projections + Durability Monitor** | salud de shards, **rezago**, high-water mark, inbox/outbox | 24 |
| **Dead Letters** | mensajes muertos, replay | 25 / 31 |
| **Message Topology / Listeners & Endpoints** | flujo de mensajes, endpoints | 30 |
| **Services / Dashboard / Alerts** | catálogo de servicios de la **flota**, salud, alertas | 32-36 |

Ancla temprana = Timeline + Event Store Explorer (posición 15). El resto enciende donde su dato nace.

### Transporte recomendado para el taller

**`Fleet.PostgresqlQueues` (sin broker)**: un solo Postgres, sin RabbitMQ. Encaja con el bajo setup del
taller. Clave: consola y servicio **comparten el mismo schema de transporte** (`wolverine_queues`) o la
telemetría no llega; el store de la consola va en su **propio schema Marten**. (RabbitMQ y HTTP quedan como
variantes de la sección de transportes, 28-30.)

### ⚠️ Licencia y versiones — la decisión de fondo

- **Licencia = BUSL 1.1, verificada en el `.nuspec`/`LICENSE.txt` del paquete** (ronda 2): uso
  **no-productivo permitido explícitamente** (dev, aprender, estudiar); **producción exige licencia
  comercial** (`JASPERFX__LICENSEKEY`; el check corre solo fuera de Development).
  `requireLicenseAcceptance=true`. El binario es un dll de 23.6 MB sin fuente (repo privado).
- **Pricing anunciado** (jasperfx.net/our-products): **Free = 3 servicios, read-only** · Professional
  **$4,000 USD/año** (25 servicios) · Enterprise **$7,500 USD/año** (ilimitado). Las acciones (DLQ replay,
  rebuilds, MCP) exigen licencia o trial de 30 días.
- **Cadencia**: 0.1.0 (abr-2026) → rc.1 (27-jul) → **rc.2 (28-jul)** → **GA 1.0 anunciado para el
  2026-08-03**. Targetea net10 **y net9**.
- **Consecuencia doble para nosotros:** (a) la estación de *reconocimiento* del taller **puede usar el
  CritterWatch real gratis** (Free tier read-only, ≤3 servicios — el juguete del alumno cabe); (b)
  **CosmosLens sigue siendo necesario** para el Application Plane (11+ repos > 3 servicios; las acciones
  son de pago; y nuestro agentless es un enfoque que CritterWatch no ofrece — ver abajo).
- **Versiones al 2026-07-28** (verificadas en nuget/npm): CritterWatch `1.0.0-rc.2`, WolverineFx `6.24.0`,
  Marten `9.20.2`, Polecat `5.7.1`, Aspire.Hosting.AppHost `13.4.6` (⚠️ re-versionó: 9.5.x → 13.x), React
  `19.2.8`, .NET `10.0.10` GA. **Regla: re-verificar el día del build** — rc.2 salió 27 h después de rc.1.

**Consecuencia para el diseño (revisa las "Dos eras" abajo):** NO convertimos nuestra app en la consola
comercial. Construimos un **clon didáctico de solo-lectura** que replica sus 4 paneles ancla y su misma
**arquitectura** (snapshot → proyección a Postgres con Marten), y al final **señalamos** el CritterWatch
real como la herramienta de producción, mostrando cómo se instrumenta el servicio para él. La convergencia
es de **reconocimiento** ("lo que construiste es esto, y así se ve la versión de producción"), no de
redistribuir un producto licenciado.

### Ronda 2 — confirmaciones contra fuentes primarias (código público, nuget, doc)

Verificación afirmación-por-afirmación (detalle en `scratchpad/critterwatch-findings/r2-*.md`). Lo que
quedó **confirmado con cita** y hace construible a CosmosLens:

**El panel de rezago, ya concreto (verificado en el código público de Marten/Wolverine):**
- La tabla del daemon **existe y se llama `mt_event_progression`** (`EventProgressionTable.cs:12`):
  columnas `name` (PK) / `last_seq_id` / `last_updated`. El high-water mark es una fila con identidad
  constante; **no hay columna tenant** — el tenant viaja dentro de `name` (`{Proyección}:{Shard}:{tenant}`).
- **Opt-in valioso para lo observado:** `EnableExtendedProgressionTracking=true` agrega 10 columnas de
  monitoreo (heartbeat, agent_status, pause_reason, running_on_node, umbrales, failure_*) — diseñado
  exactamente para esto; recomendarlo a los proyectos observados.
- **OTel, nombres reales:** ActivitySource `"Wolverine"` y `"Marten"`; Meter de Wolverine =
  `"Wolverine:{ServiceName}"` (¡por servicio — AddMeter con wildcard!); métricas con **guion**
  (`wolverine-messages-sent`, `-execution-time`, `-dead-letter-queue`, `-inbox/outbox-count`…). Marten
  emite el **histograma `gap`** (`marten.{db}.{proyección}.{shard}` = high-water − progresión: el rezago
  como métrica), el span `marten.daemon.highwatermark` y `marten.event.append` opt-in con `tenant.id`.
- **Paneles agentless viables confirmados por la doc**: Dead Letters lee `wolverine_dead_letters` ("not
  from broker-native DLQs" — cita literal de su doc), Durability Monitor lee
  `wolverine_incoming/outgoing_envelopes`, Scheduled lee el outbox durable, lag = `mt_event_progression`
  vs HWM.

**La divergencia que nos define (honesta):** la doc oficial dice *"the console never opens a connection
to your services' databases"* — CritterWatch es **agent-based por diseño**. Nuestro **agentless es una
divergencia deliberada** y es el diferenciador: observar los 11 repos del Application Plane **sin
tocarlos**. Lo que el agentless no alcanza (Conversations, Workflow, Topology, Services-heartbeat) exige
instrumentación — no lo prometemos en fase agentless.

**Inventario real de la UI (ronda 2, contra `/ui/`):** son **22 páginas en 5 grupos**
(Monitor / Explore / Reliability / Health / Configuration). No existen los "Messaging/Document/EF/Saga
Explorer" ni "HTTP/gRPC" (404). Projections/Listeners/Topology/Event Store se **plegaron** dentro de los
exploradores. Nuevos confirmados: Workflow (clasifica aristas *Inferred/Observed/Confirmed*), Event
Modeling (7 lanes: Trigger→Command→Handler→Event→Projection→Read Model→Query), Store Inspector, Rebuilds,
Message Routing, Reflection, Settings.

**Correcciones aplicadas a este plan (ronda 2):** "Ermine" no existe en código ni doc (el sabor SQL
Server es **Polecat**); la SPA de CritterWatch es **Vue**, no React, y "MVU" solo aparece en el diagrama
del blog (React queda como elección nuestra, con la justificación corregida); versiones → rc.2/6.24.0/
9.20.2; el matiz de L6: el rezago aplica donde hay daemon — 3 repos del AP son todo-Inline sin daemon
(su problema es otro: no tienen dónde correr un rebuild).

**Fuentes nuevas encontradas (estilo `plans/`, para la construcción):**
- **En el repo público `JasperFx/wolverine` hay más docs de diseño del mismo estilo**:
  `RELEASE-PLAN-2026-07-13/14.md`, `NEXT-WAVE-HANDOFF.md`, `CONJOINED-TENANCY-EPIC-PLAN.md`,
  `TRANSPORT-CAPABILITY-RESEARCH-2026-07-18.md`.
- El **mapa hash del sitio de docs expone ~70 páginas**, incluidas internas no navegables:
  `design/309-rebuild-orchestration.md`, `design/815-inline-projection-rebuild.md`,
  `competitive_analysis.md`, `architecture/event-sourcing.md`.
- **crittermart ADR-017** (erikshafer, GitHub): la integración externa mejor documentada — wiring completo
  + gotchas (license-check solo fuera de Development; CVE de MessagePack).
- **ai-skills.jasperfx.net**: JasperFx distribuye un *"critterwatch-install skill"* (playbook de
  instalación para agentes IA) — conseguirlo como insumo.
- Video: *"A very early look at CritterWatch!"* (YouTube, feb-2026).

### Bonus: los samples validan el arco del taller

Los otros samples del repo (`BankAccountES`, `OutboxDemo`, `EcommerceMicroservices`) confirman 1:1 el
camino que ya teníamos: `Apply` void sin `Create` obligatorio, `StartStream` para crear, `[AggregateHandler]`
(= `FetchForWriting` envuelto) como camino idiomático de comandos, `SingleStreamProjection` partial,
snapshot inline, Alba para tests. Útil: el taller enseña `FetchForWriting` **explícito** (con
`EventStreamUnexpectedMaxEventIdException`) como diferenciador, mientras los samples lo esconden tras
`[AggregateHandler]` — ese contraste es exactamente el criterio del capstone (posición 39). *(Referencia,
no copiar.)*
