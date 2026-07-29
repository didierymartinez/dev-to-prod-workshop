# 🧵 La secuencia — una sola cadena

> **Esto es el taller: una sola secuencia de secciones, de la 1 a la N.** No hay fases, ni bloques, ni
> "primera mitad / segunda mitad", ni un "§1-9 que se deja quieto". Toda sección es **par** de las
> demás: la 3 se edita con el mismo criterio que la 25, y una sección nueva no es "lo que viene después"
> — es una posición más, metida donde su **dolor** nace.
>
> El **orden real** vive en la cadena `⬅️/➡️` de cada archivo; esta lista lo refleja de corrido y le
> suma las posiciones que todavía no se han vivido. Salió del panel de reevaluación (ganó el criterio
> *evidencia-desde-temprano*, que **no mueve ninguna de las secciones ya escritas**: solo teje las
> nuevas donde su dolor las reclama).

## Tres hilos que atraviesan la cadena (no son secciones ni bloques)

Corren a lo largo de toda la secuencia, ganando peso donde un dolor los toca:

- **Evidencia.** Desde que nace el arnés de tests (posición 12), **cada** choque posterior se fija en un test; los `🔨 rómpelo` pasan de "míralo en consola" a "mira el test caer".
- **Criterio.** Desde temprano, en las secciones donde el alumno toma una **decisión de criterio**, deja **una línea** en `DECISIONES.md`: qué decidió y por qué. El taller no cambia de motor (dolor → criterio) en una frontera; el criterio se registra en el camino.
- **El monitor.** Una **app companion que damos nosotros** —**CosmosLens**, en el repo `cosmos-trace`— que el alumno descarga y corre apuntándola a **su** Postgres, agentless y solo-lectura; el alumno **no la construye** (construye a mano el motor y los conceptos; la app le da la superficie para *verlos*). El hilo lo toca cada sección donde un dolor lo reclama: **rezago (19)** · **fallos (20)** · **daemon/rezago (32)** · **por-cliente (35)**, y se **cierra** en Observar el motor (36), donde el alumno reconoce que las consultas que escribió a mano son la lógica de los tableros. CosmosLens vive dos eras con **el mismo binario**: lee una tabla `eventos` como la del taller (era 1) y, tras el swap, lee `mt_events`/`mt_streams`/`mt_event_progression` de Marten y las tablas de Wolverine (era 2) — es **nuestro** observador, no CritterWatch (comercial). Plan completo: [`APP-MONITOR-PLAN.md`](APP-MONITOR-PLAN.md).

Y un hilo largo: **el comentario que sobrevive** (posición 37) — a lo largo de la cadena el alumno deja líneas que cargan peso (algunas sin comentar, otras comentadas con su **mecánica**, no con su **síntoma**); §37 las **cobra**: las re-comenta por el síntoma que las hace intocables y lleva ese criterio como aporte a la librería.

---

## La cadena

`✓` = escrita y verificada · `○` = por vivir (una a la vez, desde el dolor, con spike y arnés). El glifo
es **estado en disco**, no una división: cualquier posición se edita o se re-hila igual.

| # | Sección | De qué dolor nace → con qué queda el alumno |
|---|---|---|
| 1 | ✓ [El diario de una empresa](secciones/el-diario-de-una-empresa.md) | Un `UPDATE` destruye el pasado → guardar el **diario** de hechos, no la foto. |
| 2 | ✓ [Los primeros hechos](secciones/los-primeros-hechos.md) | ¿Cómo se escribe un hecho ineditable? → `record` inmutables + replay a mano. |
| 3 | ✓ [Refactorizando el motor](secciones/refactorizando-el-motor.md) | El `foreach` con un `if` por tipo crece feo → `AggregateRoot` + `switch`. |
| 4 | ✓ [El flujo de vida](secciones/el-flujo-de-vida.md) | La historia es una lista pelada que cualquiera ensucia → `EventStream<T>`. |
| 5 | ✓ [Decidir el futuro](secciones/decidir-el-futuro.md) | Nadie vigila las reglas → el agregado **decide** y emite, validando. |
| 6 | ✓ [El Command Handler](secciones/el-command-handler.md) | El ciclo cargar→actuar→guardar suelto en `Program.cs` → un handler por comando. |
| 7 | ✓ [El despachador](secciones/el-despachador.md) | Eliges la clase del handler a mano → `record` por comando + tabla tipo→handler. |
| 8 | ✓ [El almacén por id](secciones/el-almacen-por-id.md) | Un handler atado a un stream → `EventStore` central; el id es la llave. |
| 9 | ✓ [Concurrencia optimista](secciones/concurrencia-optimista.md) | Dos escritores se pisan en silencio → sobre con versión que rechaza el choque. |
| 10 | ✓ [Un acto, dos hechos](secciones/un-acto-dos-hechos.md) | El segundo `decide` decide a ciegas → hace falta que el agregado se aplique lo que decide. |
| 11 | ✓ [El agregado recuerda](secciones/el-agregado-recuerda.md) | La cura: `Emitir` = aplica + acumula; un solo `Append`. Y un hecho huérfano miente en silencio. |
| 12 | ✓ [Verde, y roto](secciones/verde-y-roto.md) | El estado puede pasar verde con el motor roto → afirmar los **hechos emitidos**. *(nace el arnés de tests)* |
| 13 | ✓ [El diario en disco](secciones/el-diario-en-disco.md) | Los tests siembran en RAM; nada sobrevive al reinicio → persistir a disco; se pierde el tipo del hecho. |
| 14 | ✓ [El nombre es un contrato](secciones/el-nombre-es-un-contrato.md) | Renombrar la clase rompe la historia en disco → nombre estable del evento. |
| 15 | ✓ [Todo o nada](secciones/todo-o-nada.md) | Una caída a mitad de acto deja media acción → Postgres a mano (transacción + `PRIMARY KEY`). |
| 16 | ✓ [La vista de lectura](secciones/la-vista-de-lectura.md) | El `SELECT` sobre hechos miente → una vista aparte para consultar el estado de hoy. |
| 17 | ✓ [Reconstruir la vista](secciones/reconstruir-la-vista.md) | La vista cambia de forma y el pasado no se re-ejecuta → borrar y re-derivar del diario. |
| **lectura madura + async →** | | *la vista deja de depender del handler; empieza a derivarse del diario por su cuenta* |
| 18 | ✓ [La vista se mantiene sola](secciones/la-vista-se-mantiene-sola.md) | Mantener la vista dentro del handler es frágil (dual-write) → un **proyector** que la deriva del diario desde un **checkpoint** (hasta dónde leyó). *(el async, vivido a mano)* |
| 19 | ✓ [El rezago](secciones/el-rezago.md) | El proyector corre aparte → queda **atrás**; decidir leyendo la vista atrasada rompe una invariante → **medir el rezago**. Consistencia eventual, sentida. *(monitor: panel 1)* |
| 20 | ✓ [El proyector tropieza](secciones/el-proyector-tropieza.md) | Un hecho que el proyector no puede digerir congela toda la vista → apartarlo (dead-letter `proyeccion_fallos`), dejar rastro y seguir. *(monitor: panel 2, fallos)* · *(la idempotencia del replay ya la da el proyector rehidrata-upsert; la reentrega de transporte se ve en la 31)* |
| **criterio y protección de la escritura →** | | *con el read-side maduro, el alumno gana el criterio de mantenedor* |
| 21 | ✓ [¿Merecía event sourcing?](secciones/merecia-event-sourcing.md) | Todo parece un stream → event-sourcear un catálogo plano cuesta ceremonia por cero invariantes ni historia; el criterio para decir *no*. *(nace el catálogo `Plan`, plano)* |
| 22 | ✓ [El puerto propio](secciones/el-puerto-propio.md) | La suite arranca Postgres y es lenta → extraer `IEventStore` + un doble en memoria; y el cobro: el doble debe sostener las garantías de producción o el verde miente. *(techo de capacidad → semilla del capstone)* |
| 23 | ✓ [Dos streams, la misma clave](secciones/dos-streams-misma-clave.md) | Dos registros del mismo NIT crean dos streams → unicidad atómica con un `localizador` (PK del NIT) dentro de la transacción; e idempotencia del doble clic. |
| 24 | ✓ [La forma del hecho se congela](secciones/la-forma-del-hecho-se-congela.md) | Un campo nuevo (el `Nit` de la 23) rompe la lectura del JSONB viejo → **upcaster** al leer (reconcilia la forma, no reescribe el disco); reshape pero no inventa. |
| 25 | ✓ [La vista por consulta](secciones/la-vista-por-consulta.md) | Llega otra pregunta (¿cuánto pagó cada empresa?) que ni la vista ni el agregado responden → un 2º read model **por hecho** (una fila por pago) con su propio checkpoint; el read-side es un catálogo de vistas. |
| **EDA →** | | *hasta aquí todo vive en un proceso; ahora un hecho tiene que cruzar hacia afuera* |
| 26 | ✓ [El hecho y su anuncio](secciones/el-hecho-y-su-anuncio.md) | Anunciar afuera + guardar el hecho son dos escrituras a dos sistemas (ni un 2PC las abraza) → el patrón **outbox** a mano: la *intención* de anunciar en la misma transacción del hecho (`bandeja_salida`), entrega aparte y reintentable. *(efecto externo falso: `MundoExterno`; el fantasma con y sin bandeja)* |
| 27 | ✓ [El evento público](secciones/el-evento-publico.md) | Publicar tu evento interno acopla al consumidor a tu forma privada → un **evento público** versionado en un proyecto `Contratos` que no ve tu dominio (límite de **compilación**); la traducción interno→público lleva la identidad de negocio (NIT vía `localizador` al revés, cabo de §23). |
| 28 | ✓ [El mensaje y la cola](secciones/el-mensaje-y-la-cola.md) | Un método no cruza procesos → el anuncio viaja por una **cola**; a mano solo llega al *claim* (`FOR UPDATE SKIP LOCKED`), y detrás vienen ack/reintento/dead-letter/orden = reescribir un broker. El muro que motiva el swap. |
| 29 | ✓ [El swap por reconocimiento](secciones/el-swap-por-reconocimiento.md) | Reconoces todo tu motor a mano en **Marten**/**Wolverine** y adoptas **hoy el diario** (`DocumentStore.For`, `StartStream`/`Append`/`AggregateStreamAsync`, concurrencia optimista integrada), encapsulación intacta; async = I/O no bloqueante (≠ consistencia eventual). El daemon→§32, outbox→§30, puerto→§38. |
| 30 | ✓ [El outbox](secciones/el-outbox.md) | Publicar al bus y guardar el hecho son dos escrituras (el dual-write de la 26) → el **outbox de Wolverine** guarda el mensaje en la misma tx del hecho (`IntegrateWithWolverine`+`AutoApplyTransactions`+`UseDurableLocalQueues`); y Wolverine es también tu **despachador** de §7 (cascading=devolver, inyecta la sesión). *(gotcha: `WolverineFx.RuntimeCompilation` obligatorio)* |
| 31 | ✓ [Llegó dos veces](secciones/llego-dos-veces.md) | El transporte es *at-least-once*: el mismo mensaje llega dos veces → idempotencia en el consumidor: natural (sobrescribe) o dedup por `envelope.Id` (`ON CONFLICT`, estable entre reentregas). *(mucho criterio; exactly-once = tx distribuida, cara)* |
| **async de verdad + servicio →** | | *correr todo esto como un servicio real* |
| 32 | ✓ [El daemon y la consistencia eventual](secciones/el-daemon-y-la-consistencia-eventual.md) | El proyector async es el **daemon** (`SingleStreamProjection` partial + `AddAsyncDaemon`); la vista es un read model aparte (setters públicos ≠ agregado encapsulado); consistencia eventual **declarada** (`Async`), **medida** (rezago = high-water − progreso de `mt_event_progression`) y **operada** (`DaemonMode` Solo/HotCold). *(monitor: panel de rezago)* |
| 33 | ✓ [El host y la inyección](secciones/el-host-y-la-inyeccion.md) | Wolverine ya mató los `new Handler`/`Registrar` en §30; falta que el comando entre por HTTP → **host web (ASP.NET Core) + DI**: `WebApplication`+`MapPost`+`IMessageBus` inyectado, `IDocumentSession` *scoped* por petición (unidad de trabajo, no singleton); el daemon/despachador viven mientras `app.Run()`. |
| 34 | ✓ [En vivo y serverless](secciones/en-vivo-y-serverless.md) | **SSE** (`TypedResults.ServerSentEvents` sobre un `Channel`, .NET 10) para una UI que se entera sola; y **serverless** (criterio): sin host de larga vida, daemon→proyección `Inline`, outbox→`SendInline` — que **pierde la atomicidad** (reasoma el fantasma de §26). Evidencia: Application Plane (Functions+ASB). |
| 35 | ✓ [El contexto que falta (multi-tenancy)](secciones/el-contexto-que-falta.md) | Sin el tenant, Marten usa `*DEFAULT*` y el hecho cae en el cliente equivocado, sin error → **tenancy conjoined** (aísla por `tenant_id`) + **fail-fast** (`DefaultTenantUsageEnabled=false` lanza si falta); tenant = organización, viaja desde el JWT. *(monitor: por cliente)* |
| 36 | ✓ [Observar el motor nuevo](secciones/observar-el-motor-nuevo.md) | El motor adoptado es una caja negra → observabilidad **agentless**: leer read-only el esquema (`mt_streams`.version, `mt_event_progression`, `mt_events`, `wolverine_dead_letters`) sin instrumentar; es lo que **CosmosLens** (el monitor que damos) hace por paneles. Cierra el hueco L6 de la auditoría. |
| 37 | ✓ [El comentario que sobrevive](secciones/el-comentario-que-sobrevive.md) | Una línea *silenciosa-si-se-quita* (`UseDurableLocalQueues`, el doble fiel, `ON CONFLICT`, el fail-fast) se "limpia" y el bug vuelve sin gritar → comentario que nombra el **síntoma** (no la mecánica) + el aporte upstream (issue). Cierra usar→mantener→aportar. |
| 38 | ✓ [La plantilla](secciones/la-plantilla.md) | Cada agregado nuevo repetiría la plomería → recogerla en `Cosmos.BuildingBlocks` en miniatura: `AggregateRoot` (Emitir/SinConfirmar + un solo `Apply(TEvento)`) + `MartenUnitOfWork` (Registrar→StartStream / Cargar→Append, una tx) + el doble del puerto; un agregado nuevo solo declara hechos y reglas. |
| 39 | ✓ [El capstone: FetchForWriting](secciones/el-capstone-fetchforwriting.md) | El `Append` pelado de la plantilla reabrió la deuda de §9 (dos actos deciden sobre el mismo estado viejo, ambos entran) → **`FetchForWriting`** trae la versión esperada al ciclo cargar-decidir-guardar (conflicto→`EventStreamUnexpectedMaxEventIdException`); usarlo **explícito** = handoff a la librería real. Cierra usar→mantener→aportar. |

> Las filas `async →` / `EDA →` / `async de verdad + servicio →` **no son bloques ni fases**: son solo
> pistas de lectura para ti sobre qué hilo pesa en ese tramo. La cadena sigue siendo una sola, y cada
> posición nace del final de la anterior.
>
> **Una decisión de diseño que tomé aquí, y puedes redirigir:** el **núcleo** de EDA se vive **a mano
> antes del swap** (el dual-write con un efecto falso, el evento público con un 2º proyecto, el intento
> de cola que choca contra el muro), y la **maquinaria** de EDA (outbox durable, reentrega, transportes
> reales) se vive **después del swap**, ya con Wolverine — porque un broker de verdad no se arma a mano.
> Es el mismo método de siempre (constrúyelo a mano → reconoce la herramienta), aplicado a EDA. Si
> prefieres otro reparto, se re-hila aquí.
>
> Las posiciones 18-39 son el **rumbo**, no un guion fijo: se viven una a la vez, y si al correr el
> código el dolor real apunta a otro lado, manda el dolor — se re-hila la cadena, no se defiende este mapa.
>
> **Honestidad de sentibilidad:** con un dominio de juguete en un proceso, el núcleo de cada dolor se
> vive de verdad, pero varias piezas de EDA (broker *at-least-once* real, serverless, multi-tenancy con
> JWT) **no se pueden sentir** — van como **criterio explicado**, con los repos del Application Plane
> como evidencia (el cross-módulo real es 100% broker). Está marcado arriba en cada fila que aplica.

---

## Cómo se avanza

Una sección a la vez: se **vive** (spike que corre y choca contra el código real de esa posición), se
escribe, se cierra con el arnés `revisar-seccion` (validador + estilo + principiante + técnico), y se
para. La siguiente nace del final concreto de la anterior. El detalle por sección (el dolor completo,
qué construye, qué exige del dominio) vive en [`PLAN-SECCIONES-DESDE-INSUMOS.md`](PLAN-SECCIONES-DESDE-INSUMOS.md);
los cambios finos sobre las secciones ya escritas, en [`PLAN-DE-OBRA.md`](PLAN-DE-OBRA.md). Ambos son
**detalle por sección** de esta única cadena — no otro ordenamiento.
