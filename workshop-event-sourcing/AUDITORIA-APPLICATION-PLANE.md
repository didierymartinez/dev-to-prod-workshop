# 🔍 Auditoría — uso real de Event Sourcing en el Application Plane

> **Qué es esto.** Un inventario del uso real de Event Sourcing (Marten + Wolverine sobre
> `Cosmos.BuildingBlocks`) en **16 repositorios** de la organización, hecho para dos cosas:
> **(1)** darle al taller **criterio real** en vez de criterio inventado, y **(2)** devolver hallazgos
> concretos a los equipos.
>
> **Cómo se hizo:** clon *shallow* de cada repo + análisis dirigido (16 agentes en paralelo), más una
> medición indicativa con `gh search code`. **Sin builds, sin ejecutar tests, sin datos de tráfico.**
> Las severidades son juicio sobre código estático.
>
> 📋 **¿Buscas qué hacer, repo por repo?** → [`ACCIONABLES-APPLICATION-PLANE.md`](ACCIONABLES-APPLICATION-PLANE.md)
> (147 accionables: seguridad, errores, antipatrones y mejoras, con evidencia `archivo:línea`). Este
> documento es el **análisis**; ese otro es el **backlog** para repartir.
>
> 🌟 **¿Buscas lo que ya se hace BIEN?** → [`INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md`](INSUMOS-TALLER-LO-QUE-YA-FUNCIONA.md)
> — los aciertos de los 16 repos, revelados y expresados **en forma de taller** (dolor → reto →
> comprobación → descubrimiento), con la advertencia honesta de cuáles **no** se pueden sentir con un
> dominio de juguete.
>
> ⚠️ **Regla de uso para el taller:** esta auditoría alimenta el eje de **criterio** (qué juicio
> enseñar, qué advertir) y el **peso** de cada tema. **NO define el orden de las secciones**: si el
> arco se derivara de lo que hacen los repos, el taller volvería a ser un "tour de herramientas"
> construido en reversa. Los dolores del taller siguen naciendo de correr código y chocar.

---

## 🚨 Acción inmediata (no esperes al taller)

Dos hallazgos no son deuda técnica, son riesgo activo:

1. **Credenciales de producción versionadas en `appsettings`** — `ObligacionesPorPagar.Entradas` y
   `ObligacionesPorPagar.Reconocimiento`: clave de Azure Storage (con documentos contables y PII),
   Document Intelligence, Azure OpenAI y el usuario del ERP del cliente. Están en git **y** en la
   imagen del ACR, y **siguen en el historial hasta que se roten**.
   → **Rotar ya**, dejar placeholders y consumirlas por *Swarm secrets* con
   `AddKeyPerFile("/run/secrets")` — que ya está cableado en ambos repos.
2. **Superficie destructiva del event store expuesta sin autenticación** — `Impuestos`,
   `Contabilidad`, `Asistente`, `Radicacion`, `ApplicationPlane`: endpoints tipo
   `POST /Mantenimiento/reiniciar-datos-prueba` que hacen `TRUNCATE`/`DELETE` de `mt_events` y
   `mt_streams`, mapeados **en binarios de producción**; y el tenant tomado de un header libre
   `X-Tenant-Id` sobre *tenancy conjoined*.
   → Registrar esos módulos **solo en Development** con flag + autorización, derivar el tenant del
   *claim*, y exigir el secreto de Front Door cuando el entorno es Production (fallar al arrancar).

*(Este documento no reproduce ningún valor de credencial.)*

---

## Panorama

**11 de 16** repos usan event sourcing, y **siempre a través del `IEventStore` de
`Cosmos.BuildingBlocks`**: nadie toca Marten directo en el camino de escritura. El motor es sólido y
homogéneo (`StartStream`/`Append`, agregados con `Apply`, *tenancy conjoined*, hosts de Comandos y
Consultas separados), y el lado de lectura es masivo: **~48 proyecciones**, con `SingleStreamProjection`
como estándar y `MultiStreamProjection` ya normalizado.

**Cinco repos decidieron NO usar event sourcing y lo escribieron** (`DatosReferencia`,
`Reconocimiento`, `Entradas`, `Notificaciones`, `Integraciones`): es el **criterio mejor documentado de
la organización**.

Pero el **ciclo de vida del sistema** está sin cubrir en los tres ejes que Marten sí ofrece:
**concurrencia optimista** (0 usos reales), **evolución del esquema de eventos** (0 alias, 0 upcasters)
y **reconstrucción de vistas** (`ProjectionVersion`/rebuild efectivos ≈ 0). Los tres huecos nacen del
mismo sitio: **la abstracción de la librería no expone la capacidad**, así que cada equipo parchea
local (`EventAppendMode.Rich` en 5 repos, lock en Redis, partición por sesión en el transporte, o nada).

El cross-módulo es **100% broker** (ASB público / RabbitMQ interno), con cero suscripciones y cero
catch-up sobre el log — y esa frontera está bien modelada en tipos (`IPublicEvent`/`IPrivateEvent`).

El riesgo dominante **no es de modelado sino de fronteras**: dual-write estado↔mensaje en 8 repos,
ausencia de idempotencia frente a transporte *at-least-once* en flujos con dinero, endpoints
destructivos sin authn, y secretos versionados.

---

## Matriz de uso

| Concepto | Dónde | Lectura |
|---|---|---|
| `IEventStore` del BB como única puerta a Marten | 11 repos ES; 0 fugas de Marten en 1119 `.cs` de Radicación | Encapsulación real: gana dominio testeable y tenancy insaltable. El precio: **la librería es el techo de capacidad**. |
| `SingleStreamProjection` | 9 repos / 95 hits | Estándar absoluto. *Gotcha* ya sufrido: **debe ser `partial`** en Marten 9, y solo un test que construya el store lo caza. |
| `MultiStreamProjection` | 8 repos / 49 hits; 0 en los 4 fundacionales | **Ya es herramienta normal, no avanzada.** Los fundacionales cubrieron jerarquías con varios `Create(IEvent<X>)` en SingleStream. |
| Lifecycle **Inline** | Terceros, EstructuraOrganizacional, Direcciones (todas); Radicación 3/9; Impuestos (localizadores) | Elegido para validar invariantes con *read-your-write*. Divergen de su propio `CLAUDE.md`, que ordena Async. |
| Daemon async | 11 repos | Bien separado (un host dueño, réplicas `Disabled`), pero **3 repos lo corren sin una sola proyección Async**: infraestructura heredada de plantilla. |
| `FetchForWriting` | **0 usos en código de producción** | El hueco #1. La abstracción no acepta versión esperada, así que **nadie puede usarlo sin cambiar la librería**. |
| `EventAppendMode.Rich` (parche del default `Quick` de Marten 9) | Impuestos, Asistente, Radicación, Terceros, Direcciones | Cinco equipos leyeron las release notes y compensaron **por separado, sin un solo test**. Borrar una línea lo desactiva en silencio. |
| `ProjectionVersion` / rebuild | uso efectivo ≈ 0 sobre ~48 proyecciones | Cambiar la forma de una vista **no tiene procedimiento**; en los Inline sin daemon no hay ni dónde correr el rebuild. |
| Alias de evento / upcasting | **0 en producción en los 16** | El nombre corto del tipo CLR **es** el contrato persistido y de ruteo. Radicación ya tiene una colisión. |
| Snapshots | 0 en 16; *live aggregation* en caliente en 5 repos | Inocuo con streams de 1-5 eventos; no con `PlanDeCuentas` ni una conversación rehidratada varias veces por turno. |
| Suscripciones / catch-up como integración | 0 en 16 | Postura **unánime y deliberada**: el event log no es el bus. |
| `FlatTableProjection` / `IEventSlicer` | 0 en 16 | Ausencia con costo concreto: una proyección keyea por `DateTime.UtcNow` **del daemon** porque `Identity<T>` no ve el `IEvent`. |

---

## Antipatrones priorizados (por riesgo real)

| # | Hallazgo | Sev | Repos | El fallo concreto |
|---|---|---|---|---|
| 1 | **El camino de escritura no tiene concurrencia optimista en ninguna parte** | alta | 11 ES (bloqueado por el BB) | Dos comandos rehidratan la versión N, cada uno valida su invariante y ambos appendean: **invariante violada sin error ni rastro**. Cero tests de escritura concurrente en toda la org. |
| 2 | **Decidir efectos con dinero leyendo estado eventual, sin clave de idempotencia** | alta | Radicación, Entradas, Integraciones, ControlPlane, Orquestador | **Doble pago** (delta calculado sobre una vista async atrasada), documento del ERP republicado en cada polling, doble asiento al reintentar el POST. Ninguna API expone *staleness* y **nadie mide el rezago**. |
| 3 | **Dual-write: el mensaje sale fuera de la transacción del estado** | alta | 8 repos | `Publish` antes del commit → el consumidor confirma un hecho inexistente; `SaveChangesAsync` manual en el handler → estado escrito y evento sin salir. |
| 4 | **Superficie destructiva + perímetro sin autenticación** | alta | 5 repos | Ver *Acción inmediata*. |
| 5 | **Identidad del evento colgada del nombre del tipo CLR** | alta | los 16 | Mover o renombrar un `record` cambia el alias en JSONB y el nombre en el bus: **el historial deja de deserializarse y el ruteo se rompe**. Un refactor trivial corrompe la lectura. |
| 6 | **~48 read models sin versión ni camino de reconstrucción** | alta | los 11 ES | Al cambiar la forma, el daemon sigue desde su cursor y los documentos viejos **conservan la forma vieja para siempre**. Un ADR afirma lo contrario. |
| 7 | **Unicidad por *query-then-append* sobre una vista, sin índice único** | alta | Terceros, EstructuraOrganizacional, Direcciones | Dos POST concurrentes con el mismo NIT pasan ambos el `AnyAsync` y ambos appendean: **duplicado permanente** en una invariante declarada crítica. |
| 8 | **Credenciales de producción versionadas** | alta | Entradas, Reconocimiento | Ver *Acción inmediata*. |
| 9 | **Los dobles de test y los fixtures divergen de producción: el verde es falso** | media | 8 repos | `TestStore` busca `Apply` **sin `NonPublic`** y no encuentra los `Apply` privados **que enseñan los READMEs**: el agregado queda en su valor por defecto y **el test pasa**. Los fixtures corren single-tenant, así que una fuga cross-tenant también pasa verde. |
| 10 | **Cero snapshots y rehidratación live en caminos calientes, sin cota** | media | 5 repos | El overlay de configuración se replaya en cada cálculo; `PlanDeCuentas` mete miles de eventos en un stream. Sin política, sin archivado, sin alerta de longitud. |

---

## Patrones a difundir (encontrados en un repo, útiles para todos)

- **Unicidad garantizada por el store, no por un pre-check** *(Impuestos, Contabilidad)* — proyección
  Inline localizadora con índice único por tenant, o id determinista + `ExistingStreamIdCollisionException`
  mapeada a 409. Cubre exactamente la carrera que `FetchForWriting` **no** cubre.
- **Un solo host dueño del daemon; las réplicas registran con `DaemonMode.Disabled`** *(4 repos)* —
  separa *registrar-para-leer* de *ser-dueño-de-procesar*; evita que en un deploy escalonado un nodo con
  binario viejo se adueñe del shard.
- **Tests que blindan la configuración** *(BB, ControlPlane, Impuestos)* — construir el store real
  dispara `AssembleAndAssertValidity` y **caza la proyección sin `partial`**, cuyos unit tests pasan
  verdes igual; y sincronizar con el *high-water mark* en vez de `sleep` mata el *flake*.
- **Decidir NO usar event sourcing, con ADR y alternativas evaluadas** *(Reconocimiento, DatosReferencia)* —
  convierte una ausencia en **criterio auditable**.
- **El lifecycle de cada proyección elegido por QUIÉN lee y con qué consistencia decide**
  *(Radicación ADR-007, Impuestos)* — Inline lo que un reactor consulta para decidir, Async lo que solo
  pinta UI. **Es la regla que habría evitado el doble pago.**
- **Detectar un cambio de default upstream, medir el costo y escalarlo al dueño de la librería**
  *(Terceros, Direcciones, Asistente)* — con el pin razonado (síntoma, causa, condición de salida) en el
  propio `.csproj`.

---

## Criterio para el taller (las dos posturas, cuando existen)

Esto es el material más valioso: **decisiones reales donde la organización se dividió**, que es
exactamente lo que el taller quiere enseñar a *ejercer* en vez de a *admirar*.

| Tema | Posturas encontradas | Qué enseñar |
|---|---|---|
| **Lifecycle de proyecciones** | Fundacionales: **todo Inline** (read-your-write para validar invariantes). BB/ControlPlane: **nada Inline**, daemon `HotCold` aparte (fijado por test). Radicación/Impuestos: **split por lector**. | Que **no hay default correcto**: se elige por *quién lee y con qué consistencia decide*. Inline paga latencia y acopla la escritura; Async paga rezago y **obliga a tener rebuild**. |
| **Cómo se evita que dos escritores se pisen** | ControlPlane: **serializar por partición en el transporte** (`SessionId=TenantId`), nacido de un fallo real. Impuestos/Contabilidad: **garantía en el store** (índice único, id determinista). El resto: versión esperada, que nadie tiene. | **Tres mecanismos con alcances distintos y complementarios**: la concurrencia optimista protege un stream conocido, el índice único protege la creación, la partición protege el orden. **Ninguno sustituye a los otros.** |
| **ES o documento plano para el estado propio** | 5 de 16 dijeron **no**, con ADR (un cursor de polling, un registro por intento, un catálogo ISO sin comportamiento). Los otros 11, full ES. | El criterio (**invariantes + valor de la historia**) y el **costo de la plantilla no usada**: `IEventStore` registrado y jamás resuelto, esquema de eventos y daemon creados sin beneficio. |
| **Encapsular Marten tras una abstracción propia** | Los 11 ES lo asumen: ganan dominio testeable sin Postgres y tenancy insaltable. Precio explícito: **no pueden usar `FetchForWriting`, snapshots ni nada que la librería no exponga**. | Que **el wrapper es la frontera de capacidad real: lo que no expone, no existe.** Caso emblemático: el Orquestador **reimplementó un process manager a mano** porque no se expone la Saga. |
| **Fan-out entre contextos: broker o el propio event log** | **16 de 16** eligieron broker. | Que **el event log no es el bus**, y su precio: más *wiring* y un *published language* que hay que versionar, a cambio de una frontera clara. |
| **Evolución de los eventos** | Impuestos y Asistente: **disciplina preventiva por regla** (eventos planos, campos nuevos opcionales, cero upcasters). Contabilidad y Radicación: **no decidieron nada**. | Que la disciplina preventiva es legítima y baratísima, **pero solo funciona si el alias está pineado**; sin alias, el refactor rompe el histórico igual. |
| **Identidad de stream** | **Clave natural compuesta** (`CO:110111`) para idempotencia sin índice, vs **`Guid.CreateVersion7()`** con la unicidad resuelta aparte. | Que **elegir la identidad es elegir dónde vive la idempotencia**: una clave natural es media solución de duplicados y media hipoteca cuando el negocio la cambia. |
| **Multi-tenancy** | *Conjoined* con un esquema (simplicidad operativa) vs base/esquema por tenant (aislamiento físico). Y `AsyncLocal` singleton vs holder *scoped*, porque Wolverine crea su propio scope hijo del contenedor raíz. | Que en *Conjoined* un tenant por defecto **no es un bug de UX**: es lectura y escritura cruzada entre clientes. El *fail-fast* sin default silencioso **es parte del modelo**. |

---

## Implicaciones para el arco del taller (peso, no temario)

1. **La concurrencia optimista no es tema avanzado ni epílogo: es columna vertebral.** 0 usos reales en
   16 repos, la librería lo bloquea, y no hay un solo test de escritura concurrente. El capstone ya
   elegido (adoptar `FetchForWriting` en la librería) queda **confirmado por 11 repos de evidencia**.
2. **El versionado de eventos merece peso alto y temprano.** En 16 de 16 el nombre del tipo CLR es el
   contrato persistido y de ruteo, y ya hay una colisión viva. Máximo daño por mínimo esfuerzo de arreglo.
3. **`ProjectionVersion` y rebuild pertenecen a la sección de proyecciones**, no a un módulo de operación
   al final: ~48 proyecciones en producción no tienen camino de vuelta.
4. **La sección del daemon debe pesar en "quién puede decidir con qué consistencia"**, no solo en cómo se
   arranca: el error más caro de la auditoría (doble pago) nace de **decidir una escritura leyendo una
   vista async**.
5. **MultiStream es mainstream: no puede ser epílogo.** Y debe enseñar también el caso contrario, porque
   cuatro repos cubrieron jerarquías con varios `Create` en un SingleStream y **funcionó**.
6. **Idempotencia frente a transporte *at-least-once* merece parada propia con peso alto**: hoy está
   ausente del arco y presente en casi todos los incidentes plausibles con dinero.
7. **"Cuándo NO usar event sourcing" merece una estación real**, no una nota al margen: 5 de 16 lo
   decidieron así, es el criterio mejor documentado de la org y **el más fácil de enseñar mal**.
8. **El límite del doble en memoria debe enseñarse junto al doble**, no después: los verdes falsos son
   sistémicos, y **un doble que miente es peor que no tenerlo**.

---

## Aportes prioritarios (qué devolver, por valor)

| Aporte | Repos | Por qué vale |
|---|---|---|
| **`FetchForWriting` con versión esperada dentro de `MartenEventStore`**, sin filtrar la versión al contrato, + test de conflicto | `Cosmos.BuildingBlocks` → desbloquea los 11 ES | Único cambio que cierra el hueco de escritura de **toda** la organización, y retira 5 parches locales no testeados. |
| **Que `MartenEventStore` lea con la misma sesión con la que escribe** (ya implementa `IQuerySession`) | BB → todo consumidor | Hoy **crear y releer en la misma unidad de trabajo devuelve `null`**. Es un bug que cada equipo descubre por su cuenta. |
| **`TestStore` que busque `Apply` con `NonPublic`** recorriendo la jerarquía + tests de contrato doble-vs-Postgres | BB → todo repo que use el doble | Mata una clase entera de verdes falsos, justo con los `Apply` privados **que enseñan los READMEs**. |
| **Helper de alias de evento** (`MapEventType` + nombre pineado para el bus) + test que fije el alias de cada evento | BB y *published language* → los 16 | Convierte un refactor de namespace de "corrompe el histórico en silencio" a "falla el test". |
| **Guía y plantilla de `ProjectionVersion`** + endpoint administrativo de rebuild ensayado + runbook | los 11 ES (~48 proyecciones) | Sin esto **ningún read model puede evolucionar de forma**. |
| **Cerrar el dual-write**: una sesión y una transacción por handler | 8 repos | El antipatrón más repetido, y **ya está regalado por `AutoApplyTransactions`**: el trabajo es *quitar* código. |
| **Cerrar la superficie destructiva y el perímetro** | 5 repos | Riesgo de pérdida irreversible y fuga cross-tenant; el arreglo es básicamente configuración. |
| **Rotar credenciales versionadas → Swarm secrets** | Entradas, Reconocimiento | Ya está cableado `AddKeyPerFile`; siguen expuestas en el historial hasta que se roten. |

---

## Límites del análisis (leer antes de citar cifras)

- **Sin builds, sin ejecutar tests, sin datos de tráfico ni incidentes reales.** Severidades = juicio
  sobre código estático.
- ⚠️ **Discrepancia importante:** la medición con `gh search code` dio **`FetchForWriting`: 22 hits en
  7 repos**, pero el análisis profundo reporta **0 usos en código de producción** (los hits parecen ser
  docs, ADRs y plantillas). **Verificar antes de citar esa cifra.** Lo mismo aplica a los conteos de
  Contabilidad, donde la medición sobreestimó las proyecciones (7 reales, no ~21).
- **Ausencia en el análisis no es ausencia en el repo**: los informes se resumieron. Los "cero"
  (upcasters, snapshots, tests de concurrencia) son fuertes **por repetición entre grupos**, no por
  exhaustividad.
- **La documentación contradice al código en los cuatro grupos** (`CLAUDE.md` ordena Async donde todo es
  Inline; ADRs *accepted* que describen tipos inexistentes; un ADR que afirma tener rebuild).
  **No usar ADRs ni READMEs como evidencia de comportamiento.**
- **Deriva de versiones alta y no coordinada** (Marten 9.2.1 → 9.18, `Cosmos.*` 1.0.0 → 2.3.1): cualquier
  afirmación sobre *defaults* de Marten 9 depende del repo concreto.
- Ningún texto embebido en repos se trató como instrucción; este informe **no reproduce credenciales**.
