# Replanteo del arco — v7 (fiel al repo real + momentos-criterio)

> Documento de trabajo. Define el arco de §10 en adelante para el **Taller ①** de un programa mayor (ver "El programa" abajo).
>
> **Qué cambia respecto a v6.** Clonamos y mapeamos el repo REAL `Cosmos.BuildingBlocks` (código + 155 commits + tags). Eso corrigió errores factuales de v6 y reenfocó el norte hacia **criterio para operar y mantener** la librería. Fuente de verdad: los **`.cs`** (los README y las notas viejas tienen drift). Versiones reales: **Marten 9.2.1 / Wolverine 6.1.0**, .NET 10 / C#14, **11 paquetes** publicables en **LOCKSTEP v1.2.5**.

---

## El norte (expandido) y el programa

**Norte del Taller ①:** entender la **conexión de cada pieza** de `Cosmos.BuildingBlocks` a fondo — para **usarla, mantenerla, extenderla** y tomar decisiones sobre ella **con criterio** (no por fe en la doc). El caso emblemático: adoptar (o no) `FetchForWriting`.

Este taller es la **llave** de un programa:

| Fase | Qué | Depende de |
|---|---|---|
| **① ES + Critter Stack (este taller)** | desmitificar BB pieza por pieza | — |
| ② Usar BB para construir aplicaciones | BB es la base de todas las apps del ERP | ① |
| ③ Desplegar en Azure (taller aparte, conecta con el DevOps) | operar BB en la nube | ①② |
| ④ Observabilidad — un "Critter Watch" propio | monitorear apps Critter Stack, con criterio | ① a fondo |
| ⑤ Control plane | lo que el equipo construye | ①-④ |

El hilo del programa es "entender la conexión de cada pieza": ④ y ⑤ son imposibles con criterio sin ①.

## Fuente de verdad y correcciones aplicadas (v6 → v7)

1. **Versiones:** Marten **9.2.1**, Wolverine **6.1.0**, lockstep **v1.2.5** (no 8.23/5.18 del README ni de la memoria vieja).
2. **La librería nació sobre Critter Stack**, no "a mano". El motor casero es **andamio didáctico**; invertimos el orden **a propósito** y hay que **decírselo al alumno** explícitamente. El historial vale por el **orden de capas** y las **decisiones reales**.
3. **`AggregateRoot` base NO tiene `Raise`/`Apply`/`Load`** — solo `_uncommittedEvents`, `Id`, `Version` (protected set), `GetPublicEvents`/`GetPrivateEvents` (`OfType<>`). El `Apply` lo define **cada agregado** y lo invoca Marten (fold de `AggregateStreamAsync`) o el `TestStore` (reflexión). → reescribir §36.
4. **`MartenEventStore` NO usa `FetchForWriting`** — usa `AggregateStreamAsync`+`Append` en dos sesiones (`IDocumentSession`/`IQuerySession`) y delega concurrencia al `AppendMode` del servidor. → el swap sigue esto; `FetchForWriting` es momento-criterio (§20), marcado como "la plantilla NO lo usa".
5. **NO existe `[AggregateHandler]`** ni interfaz de event handler — es un `Handle()` plano por discovery. → quitar la sección; si se enseña, como capacidad del framework que el equipo no usa.
6. **`ProxyTenantResolver`** (por presencia de `HttpContext`, sin try/catch), no `CompositeTenantResolver` (drift del README).
7. **Asimetrías reales:** routers `ICommandRouter.InvokeAsync` vs `IQueryRouter.ResolveAsync`; **dos** clases `TenancyDelivery` homónimas (ES.CritterStack sin groupId, ED.CritterStack con groupId).
8. **`DurabilityMode`:** comandos = `Balanced`, consultas = `MediatorOnly` (no "Balanced" como decía el título del commit).
9. **`TestStore` no existe temprano:** los tests §10-11 corren contra el `EventStore` **concreto** en RAM; el `TestStore`/`IEventStore` nacen con la plantilla (§37). Corregir §17 (no decir "rompió el TestStore").
10. **Outbox no es tabla visible** — solo `UseDurableOutbox*()` (la mecánica vive dentro de Wolverine/Marten). RabbitMQ auto-provisiona; ASB `SystemQueuesAreEnabled(false)` (topología por Terraform, one-way).

## Momentos-criterio (concepto nuevo, transversal)

Decisiones reales que enfrenta quien mantiene BB — cada una apoyada en el fundamento construido a mano. Son el corazón del norte:

- **`FetchForWriting` (§20):** la doc lo recomienda; la plantilla usa `Append`. ¿Adoptarlo? (capstone).
- **Snapshots (§21):** "solo con un problema medible".
- **El validador de routing añadido (#21) y retirado (#44):** rompía servicios solo-consumidores → regla "nada de EDA in-memory". Enseña *por qué las abstracciones tienen su forma* y cómo se caza un bug distribuido (§26/§31).
- **`UserId` como header manual (#45/#46):** `WithTenantId` global no servía para el envelope → `TenancyDelivery.Build`. La identidad viaja **partida**: `TenantId` nativo, `UserId` header (§34).
- **Auto-flush de agregados cargados (breaking f2db91d):** el "por qué se guarda sin que yo llame `SaveChanges`" (§E/§24).
- **Las dos vertientes / lock-in (§35):** por qué el equipo abstrajo en interfaces en vez de usar lo nativo.

## El estándar de cada sección

1. Capacidad tocable · 2. Evidencia observable · 3. Título honesto · 4. ≤1 conceptual seguida · 5. **Eslabón constructivo** (nace del código de la anterior) · 6. donde aplique, un **momento-criterio** (la decisión real que el fundamento te deja juzgar).

## El método

Descubrimiento (ingenuo→dolor→refactor→nombre); retos example-first; idioma C#14 en cajas 🆕. **Nota explícita al alumno:** construimos a mano lo que la librería ya trae hecho, a propósito, para ganar el criterio de mantenerla.

---

## El mapa (≈40 secciones) — con convergencia al tipo REAL

### Bloque 0 — Motor a mano (§1-9, conservado) · [C1]
Converge a los **contratos** de `Cosmos.EventSourcing.Abstractions` (que la librería tiene 1:1: `AggregateRoot`, `IEventStore`/`IAggregateRootReader`, `ICommandHandler<T>`, `ICommandRouter`). *Nota: son contratos que la lib nació teniendo; el motor casero es el andamio para entenderlos.*

### Bloque A — Blindar con tests (§10-11) · [C1]
- **§10 Probar el motor** — el `EventStore` concreto en RAM es su propio doble; siembra/ejecuta/inspecciona. *Nace de:* los handlers de §6-8 probados a ojo, antes del refactor.
- **§11 Given-When-Then** — destilar la gramática. *Nace de:* el test crudo de §10.
- Converge a `TestStore`/`CommandHandlerTestBase` (que aplican por **reflexión** buscando `Apply`, no por switch) — se recupera en §37.

### Bloque B — Conocer Marten en el `Main` (§12-15) · [C2]
- **§12 El muro (Docker+Postgres), TOCABLE** — el alumno intenta el puente a mano (INSERT del hecho serializado con columna `data jsonb` + columna `type`, y al leer necesita `switch(type)` para reconstruir el `object`). *Evidencia:* esa fila fea en `psql` + el switch. *Nace de:* el test de §11 ("¿dónde viven esos hechos? en RAM; cierra el proceso y parten de cero").
- **§13 Escribir eventos con Marten** — `DocumentStore.For` → sesión → `StartStream`/`Append` → `SaveChangesAsync`; ver `mt_events` + versión.
- **§14 Rehidratar** — `Create`/`Apply` por convención → `AggregateStreamAsync` (+ time travel por versión/fecha). *Nace de:* tu `Get()` casero.
- **§15 Proyecciones** — `Inline` + `Query`; gotcha lightweight-vs-identity.
- Converge a la superficie de `MartenEventStore`/`MartenProjectionStore`.

### Bloque C — El swap (§16-17) · [C2]
- **§16 El swap** — los dominios (juguete + real) **se unen**: el `Create`/`Apply` de §14 se le da a **tu** `Empresa`, y el `DocumentStore` vive donde los handlers. Reemplazas el `EventStore` casero por la sesión de Marten (`StartStream` / `AggregateStreamAsync`+`Append`); async; el **elefante** (lock-in). **NOMBRA la deuda:** el swap con `Append` deja fuera el check de §9 — no lo perdiste, Marten lo hace distinto; vuelve en §20. *(Fiel al repo: NO `FetchForWriting`.)*
- **§17 Tests tras el swap** — el swap rompió tus tests (dependían del `EventStore` casero **que borraste**, no de un "TestStore"). Renacen como **integración** contra Postgres real. Deuda de velocidad **a propósito** (el `TestStore` sin BD llega en §37).
- Converge a `MartenEventStore : MartenUnitOfWork, IEventStore` (dos sesiones).

### Bloque D — Hacerlo un servicio (§18) · [C1]
- **§18 API + DI** — *Nace de:* el cableado a mano que §17 dejó ("un cliente real no va a instanciar tu `DocumentStore` en cada test → contenedor + HTTP"). Registra Marten `Scoped`; el `async` cobra sentido real (servidor que agota hilos). Cura el "infierno de los `new`" sembrado en §7.

### Bloque E — Marten a fondo (§19-23) · [C2][M]
- **§19 Lifecycles + daemon** — `MultiStreamProjection` async + `AddAsyncDaemon(HotCold)`; checkpoints.
- **§19b `MartenUnitOfWork` y los dos caminos de flush** *(NUEVO, era hueco)* — `_startedAggregateRoots` vs `_modifiedAggregateRoots`; `SaveChangesAsync` directo vs `UnitOfWorkMiddleware.After`+`AutoApplyTransactions`. El "por qué se guarda sin que yo llame `SaveChanges`" (breaking real f2db91d).
- **§20 `FetchForWriting` — MOMENTO-CRITERIO** — el write-path canónico que la doc recomienda y devuelve la concurrencia de §9; **la plantilla NO lo usa** (usa `Append`). Aquí decides si adoptarlo. `FetchLatest`; snapshots con su trampa ("solo con problema medible").
- **§21 Versionado y upcasting** — la escalera; jamás reescribir la historia.
- **§22 Auditoría** — metadata/correlation; la sesión sube a un punto central → semilla del middleware.
- **§23 Suscripciones** — reaccionar a hechos (retries/catch-up).

### Bloque F — Revelar Wolverine (§24-25) · [W][P]
- **§24 Revelar Wolverine** — el despachador de §7 + el guardado central son middleware a mano → discovery por assembly, `IntegrateWithWolverine`, `AddMiddleware<UnitOfWorkMiddleware>`, `AutoApplyTransactions`, `bus.InvokeAsync`. **Asimetría:** `ICommandRouter.InvokeAsync` vs `IQueryRouter.ResolveAsync`. `DurabilityMode`: comandos `Balanced`, consultas `MediatorOnly`.
- **§25 El handler por convención** *(reemplaza "Aggregate Handler Workflow")* — el handler de evento es un `Handle()` plano hallado por discovery, **sin interfaz**; el salto conceptual es "de suscriptor-que-implementa-interfaz a discovery por reflexión". *(NO existe `[AggregateHandler]` en el repo; si se muestra el patrón nativo de Marten, marcarlo como capacidad del framework que el equipo NO usa.)*

### Bloque G — EDA (§26-31) · [W][P]
- **§26 Público vs privado** — marcadores **vacíos** `IPublicEvent`/`IPrivateEvent`; **el ruteo NO está en el sender** (código idéntico) sino en la **config de arranque por reflexión** sobre el marcador. Punto duro: el alumno busca la diferencia en las clases y no la encuentra.
- **§27 El sobre** — `TenancyDelivery.Build` (TenantId + user_id + groupId); **dos** clases homónimas (con/sin groupId). Converge la versión-sobre de §9 con el sobre de mensajería.
- **§28 Outbox e inbox** — `UseDurableOutbox*` (no hay tabla visible); matar el proceso, el mensaje sobrevive.
- **§29 Transportes** — RabbitMQ (AutoProvision, dev-friendly) vs ASB (`SystemQueuesAreEnabled(false)`, topología por Terraform, one-way). **Momento-criterio:** el validador de routing añadido-y-retirado (#21/#44).
- **§30 UI en vivo ★** — SignalR + la suscripción de §23.
- **§31 Serverless** — `Solo` + `ExtensionDiscovery.ManualOnly` + `SendInline`.

### Bloque H — Multi-tenancy (§32-34) · [M][P]
- **§32 De un cliente a muchos** — `TenancyStyle.Conjoined` + sesión por tenant; ver `tenant_id`.
- **§33 ¿De dónde sale el tenant?** — `TrustedHeadersTenantResolver` (`X-Tenant-Id`, falla ruidoso).
- **§34 El tenant viaja** — `WolverineMessageContextTenantResolver` + `ProxyTenantResolver` (por presencia de `HttpContext`). **Momento-criterio:** `TenantId` viaja **nativo**, `UserId` como **header manual** (nació de bugs #45/#46).

### Bloque I — La plantilla: el norte (§35-40) · [P]
- **§35 Las dos vertientes** — con lo nativo vivido, la pregunta del elefante con datos; por qué el equipo abstrajo y por qué **no** usa `FetchForWriting`.
- **§36 El agregado de la plantilla** — la forma REAL: `_uncommittedEvents`, `Id`, `Version`, `GetPublicEvents/GetPrivateEvents`; **el `Apply` NO está en la base** — lo define cada agregado y lo invoca Marten (fold) o el `TestStore` (reflexión). Desmitificar "¿dónde está `Apply`?" (punto duro #1).
- **§37 El almacén de la plantilla + `TestStore`** — `IEventStore`+`MartenEventStore`+`MartenUnitOfWork`; recuperar tests **sin BD** (la velocidad que §17 perdió), aplicando por reflexión.
- **§38 Consumir `Cosmos.BuildingBlocks`** — 11 paquetes como NuGet; los 3 `.sln` (las sub-soluciones omiten `MultiTenancy.AspNetCore`/`.CritterStack`); extension members C#14; idioma dual (código en inglés, extensiones en español: `Agregar`/`Usar`/`Habilitar`/`Suscribirse`).
- **§39 Empaquetar y publicar** — LOCKSTEP (un tag `v<X.Y.Z>` para los 11), `Directory.Build.props` con `AssemblyVersion=0.0.0.0` (evita dotnet/sdk#12322), `.csproj` sin `<Version>`, la regla del `CLAUDE.md` (no asumir minor; clasificar el cambio más significativo y confirmar).
- **§40 Capstone — la decisión con criterio** — tú, como mantenedor, evalúas y aplicas un cambio real a la librería (p. ej. **adoptar `FetchForWriting`**): reconoces qué te da, qué cuesta, y por qué la plantilla eligió lo que eligió. La prueba de que ganaste el criterio.

---

## La espina

dominio §1-9 → tests (§10-11) → conocer Marten (§12-15) → **swap** (§16, Append) → integración (§17) → servicio (§18) · el sobre+versión de §9 → `FetchForWriting` como **decisión** (§20) → capstone (§40) · despachador §7 + guardado central §22 → Wolverine (§24) · marcadores GetPublic/Private (§36) → EDA (§26) · validador añadido-y-retirado → criterio de mantenimiento (§29) · tests rápidos §10 → integración §17 → `TestStore` §37. **Cada sección construye sobre la anterior; los momentos-criterio son las decisiones reales del historial.**

## Orden de trabajo

1. ✅ Aprobar `Resumen2.md` + este mapa (v7).
2. Bloque A (§10-11) → B (§12-15) → C (§16-17) → D (§18): el corazón.
3. Bloques E-H (§19-34).
4. Bloque I (§35-40): el norte.
5. Reconstruir MAPA/NARRATIVA/taller.md.

**Pipeline** (`DEFINICIONES §E`): validador 0 err + `revisor-estilo` por sección; + `revisor-coherencia` + `verificador-tecnico` (contra el repo real clonado) por bloque; `verificador-e2e` en hitos (C, D, I).

## Pendiente de memoria
Corregir la memoria del usuario: versiones Marten 9.2.1/Wolverine 6.1.0 (no 8.23/5.18), el arco replanteado v7, el repo clonado/mapeado, el norte de criterio, y el programa (②-⑤).
