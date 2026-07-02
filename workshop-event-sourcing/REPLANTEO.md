# Replanteo del arco — v5 (una sola columna vertebral)

> Documento de trabajo (no es una sección del taller). Define el arco de §10 en adelante.
>
> **Qué cambia respecto a la v4.** La v4 ordenó las secciones por **tema** (bloque de tests, bloque de app, bloque de Marten), y por eso los bloques no se enlazaban entre sí: §10-11 (tests) no le creaba ninguna necesidad a §12 (DI). La v5 reordena todo en **una sola cadena evolutiva**: el final de cada sección crea el dolor **sentido** (no anticipado) de la siguiente. El tema es solo una etiqueta; la espina es continua.
>
> **De dónde sale el contenido (autoridad).** Los archivos de secciones viejas y los docs de planeación previos son **solo referencia de lo que no funcionó** — no se copian. La autoridad es la **doc oficial** de Marten/Wolverine, las **transcripciones** de los dos cursos, y el **código de la plantilla**. Etiquetas: **[D1]** curso 1 (a mano) · **[D2]** curso 2 (Marten a fondo) · **[M]**/**[W]** doc oficial · **[P]** código de `Cosmos.BuildingBlocks`.

---

## El norte (manda sobre cada objetivo)

Al terminar, el alumno debe poder **dos** cosas. Cada sección se justifica por servir a una o ambas:

1. **Administrar la plantilla `Cosmos.BuildingBlocks`** — leerla, mantenerla, extenderla y publicarla. Saber por qué existe cada capa, qué API de Marten/Wolverine envuelve, y cómo evolucionarla sin romper a quien la consume.
2. **Entender los conceptos a fondo** — haberlos **construido a mano** y reconocerlos luego en la herramienta.

El bloque de la plantilla (8) es donde el norte #1 se cobra; todo lo anterior existe para llegar ahí sabiendo juzgar cada decisión.

## El estándar de cada sección (el filtro)

1. **Capacidad tocable** — termina modificando un archivo concreto (se dice cuál y dónde va el código).
2. **Evidencia observable** — termina con algo que el alumno corre y ve (test verde, respuesta HTTP, fila en `psql`, mensaje en la cola, excepción provocada).
3. **Título honesto** — promete solo lo que entrega; si solo motiva o razona, produce al menos un artefacto.
4. **≤ 1 conceptual seguida** — nunca dos secciones sin capacidad tocable.
5. **Eslabón sentido** — nace de un dolor que el alumno **ya siente** al terminar la anterior, no de uno anticipado. Si el hilo (`Resumen2.md`) hay que forzarlo, la sección está mal orientada.

Resumen operativo de `DEFINICIONES.md` (reglas A/B/C); el contrato completo manda.

## El método (lo que hizo funcionar §1-9)

Descubrimiento: **ingenuo → dolor → refactor → nombre**. La pieza se construye a mano, se siente su fricción, se refactoriza y solo entonces se nombra (y se muestra su equivalente en la herramienta). Retos **example-first**: el reto abre con el código que quieres poder escribir + la salida esperada, "🛠️ hazlo funcionar" con pistas, y la solución en `<details>`. Idioma nuevo de C# en cajas 🆕.

## Dos tipos de hilo (honestidad)

- **§10-19 — cadena de dolor.** Cada sección nace del dolor sentido de la anterior. Es la espina apretada (como §1-9).
- **§20-41 — impulsada por el producto.** El motor ya corre sobre Marten; cada sección es una **necesidad real del producto** (un reporte, una auditoría que pide el negocio, un cambio de esquema, una notificación externa) que la herramienta te deja satisfacer reutilizando lo anterior. La evolución se siente porque las capacidades se acumulan y se apoyan entre sí — no se finge un "dolor" donde hay una feature.

---

## El mapa (41 secciones, 9 bloques)

### Bloque 0 — Fundamentos a mano (§1-9, conservadas) · [D1]

Las que al autor le gustaron: guían los fundamentos y ya cumplen el estándar (cada una corre en consola y muestra estado reconstruido / una excepción). El arco nuevo **construye sobre §9**.

| # | Sección | Concepto que acuña |
|---|---|---|
| 1 | El diario de una empresa | el hecho inmutable *(única conceptual pura: el gancho)* |
| 2 | Los primeros hechos | replay: estado = f(hechos) |
| 3 | Refactorizando el motor | `AggregateRoot` / `Aplicar` |
| 4 | El flujo de vida (`EventStream`) | leer/escribir una historia |
| 5 | Decidir el futuro | `decide`: validar → emitir |
| 6 | El Command Handler | cargar → decidir → guardar |
| 7 | El despachador | rutear por tipo de comando |
| 8 | El almacén: un cajón por empresa | la llave por id |
| 9 | Concurrencia optimista | el sobre + la versión |

### Bloque 1 — La app viva y persistente · [D1][D2]

**§10 · La API HTTP** *(nueva; trae el contenedor)*
- **← nace de:** el motor corre una vez en `Main` y muere; una empresa real **recibe peticiones**.
- **Objetivo:** exponer el sistema con Minimal API (`POST` comando → despachador → `202`; `GET /api/empresas/{id}` → rehidratar → JSON) y **registrar `EventStore` + handlers en el contenedor incorporado** de ASP.NET, en vez de armarlos con `new`.
- **Evidencia:** `curl` POST → `202 Accepted`; `curl` GET → el JSON de la empresa. Cero `new` tuyos: el contenedor inyecta.
- **Acuña → consume:** el sistema vivo por HTTP; el contenedor → §11, §14 (`AddMarten` se enchufa aquí).

**§11 · El contenedor por dentro (DI)** *(reforma; motivación por curiosidad, no por `new`)*
- **← nace de:** la API me dio un contenedor y lo usé — ¿qué es esta "magia"? Y **Marten se enchufará ahí** pidiendo una sesión `Scoped`, así que debo entender los tiempos de vida antes.
- **Objetivo:** ver que el contenedor no es magia — un mini-contenedor de ~20 líneas (diccionario + reflexión + recursión); distinguir DIP / IoC / DI / contenedor y los tiempos de vida (Singleton/Scoped/Transient).
- **Evidencia:** `dotnet run` del mini-contenedor resuelve un handler con su store inyectado, sin `new` tuyo; explicas por qué `Scoped` importará con Marten.
- **Acuña → consume:** el contenedor + lifetimes → §14 (Marten `Scoped`).

**§12 · Persistencia real (Docker y PostgreSQL)** *(reforma — ahora SÍ persiste)*
- **← nace de:** la app viva vive en RAM: **la apago y pierdo la historia de todas las empresas**.
- **Objetivo:** levantar Postgres en Docker y **guardar dos hechos a mano en `psql`** como JSONB, consultarlos por dentro del JSON, y verlos sobrevivir a un reinicio. Sentir el **muro**: recuperar un `object` a su tipo exacto desde C#.
- **Evidencia:** `docker compose up -d`; en `psql`: `CREATE TABLE eventos(... data jsonb)`, `INSERT` de dos hechos, `SELECT data->>'Nombre'`; `docker compose restart` → los hechos **siguen ahí**.
- **Fuente:** [D2]. **Acuña → consume:** el muro que justifica adoptar → §14.

**§13 · El tiempo de espera (async/await)**
- **← nace de:** hablarle a esa base es **I/O que tarda**; congelar el hilo esperando agota los hilos y tumba la app.
- **Objetivo:** convertir handlers y API a `async`, listos para el primer `await` real (su consumidor está en la sección siguiente).
- **Evidencia:** `dotnet run` y `dotnet test` siguen verdes ya en async; el primer `await` que espera de verdad es `SaveChangesAsync` en §14.
- **Fuente:** [D1]. **Acuña → consume:** async para I/O → §14.

### Bloque 2 — Conocer Marten: el sandbox · [D2][M]

**§14 · Conocer Marten** *(nueva; absorbe el criterio de "por qué adoptar")*
- **← nace de:** el muro de §12 → adopto una herramienta, **con criterio** (sentí la necesidad, sé qué hace, puedo depurarla).
- **Objetivo:** en una **consola aparte** (no la app), un event store Marten operativo: `DocumentStore.For` → `LightweightSession` → `StartStream` / `Append` / `SaveChangesAsync`.
- **Evidencia:** `dotnet run` del sandbox y luego, en `psql`, **ver las filas reales en `mt_streams` y `mt_events`**. El primer `await` real.
- **Fuente:** [D2 cap.1][M]. **Acuña → consume:** adoptar con criterio; la sesión = unidad de trabajo; la BD como evidencia → §15, §17.

**§15 · Rehidratar con Marten**
- **← nace de:** el sandbox ya escribe; ahora necesito **leer** de vuelta.
- **Objetivo:** reconstruir la `Empresa` con `Create`/`Apply` por convención + `AggregateStreamAsync`; **viajar en el tiempo** por versión y fecha; provocar la excepción de convención de identidad y arreglarla.
- **Evidencia:** la consola imprime el estado **en la versión 2** frente al actual; la excepción salta y la corriges.
- **Fuente:** [D2][M]. **Acuña → consume:** convención sobre configuración; tu `Get()` ≈ `AggregateStreamAsync` → §17.

### Bloque 3 — El salto · [D2][M]

**§16 · Given-When-Then: blinda el motor** *(reforma; fusiona "probar el motor" + la gramática)*
- **← nace de:** estoy a punto de **arrancar mi motor casero entero** y meter Marten; necesito una **red de seguridad** que me diga si cambié el comportamiento.
- **Objetivo:** como el `EventStore` casero aún vive en memoria (es su propio doble), escribir tests que fijan el comportamiento de hoy; el primero a pelo (verboso) → destilar la gramática `Given / When / Then`.
- **Evidencia:** `dotnet test` verde; el test se lee como especificación.
- **Fuente:** [D1]. **Acuña → consume:** GWT sin BD → §18 (integración), §38 (TestStore lo restaura).

**§17 · El swap (con `FetchForWriting`)** *(el clímax)*
- **← nace de:** protegido por los tests, hago el salto.
- **Objetivo:** que los handlers reales pasen a `IDocumentSession` nativo usando **`FetchForWriting`** (el camino canónico de Marten, que **conserva la concurrencia optimista de §9**: da el agregado con su versión esperada y verifica el choque al guardar); borrar el `EventStore` casero **nombrando su reemplazo**.
- **Evidencia:** `curl` POST → una **fila nueva en `mt_events`**; los tests en memoria **fallan** (ya no hay store casero). Nota de criterio: el **elefante** (Marten entró al dominio; lock-in consciente; "si dudas, abstrae" — semilla de la plantilla).
- **Fuente:** [D2][M]. **Acuña → consume:** el mapeo casero→framework; `FetchForWriting` → §37 (la plantilla decide **no** usarlo), §26 (`[AggregateHandler]` lo automatiza).

**§18 · Tests de integración**
- **← nace de:** el swap **rompió** los tests: dependían del store en memoria.
- **Objetivo:** migrar los GWT a **integración** contra Postgres real (schema por corrida, `IAsyncLifetime`, `CollectionFixture`). La gramática sobrevive; cambia el motor debajo.
- **Evidencia:** `dotnet test` verde **contra la base**; un test tumbado a propósito por un error de esquema demuestra que ahora atrapa fallas de infraestructura. *(Costo sentido: de milisegundos a segundos — deuda que §38 salda.)*
- **Fuente:** [D2] (integración sobre mocks). **Acuña → consume:** integración → §38 (TestStore).

**§19 · La primera proyección**
- **← nace de:** con la escritura resuelta, llega la primera necesidad de **lectura**: `GET /api/empresas?estado=suspendida` — y no hay LINQ sobre el replay.
- **Objetivo:** `SingleStreamProjection` **Inline** + `Query<T>`.
- **Evidencia:** `curl` devuelve solo las suspendidas; **ver el documento de proyección** en `psql`. Gotcha: lightweight vs. identity session.
- **Fuente:** [D2][M]. **Acuña → consume:** proyección = otra vista; CQRS → §20.

### Bloque 4 — Marten a fondo: necesidades del producto · [D2][M]

**§20 · Lifecycles y el daemon**
- **← necesidad:** un reporte que cruza muchas empresas (suspensiones por mes); recalcularlo inline en cada escritura sería caro.
- **Objetivo:** `MultiStreamProjection` **async** + `AddAsyncDaemon`. Inline vs. Async vs. Live situados.
- **Evidencia:** el reporte se puebla **tras un instante** (consistencia eventual); **checkpoints/high-watermark en la BD**; el test espera con `WaitForNonStaleProjectionDataAsync`.
- **Acuña → consume:** consistencia eventual, elegida por vista.

**§21 · `FetchLatest` y snapshots**
- **← necesidad:** cerrar los rincones del write-path del swap: leer el estado justo tras escribir, y acelerar rehidrataciones largas.
- **Objetivo:** `FetchLatest` (leer tras escribir en la misma sesión); snapshots built-in (`Projections.Snapshot`) con la trampa demostrada (`AggregateStreamAsync` los ignora). Criterio: no snapshotees sin un problema **medible**.
- **Evidencia:** un test que muestra `FetchLatest` devolviendo el estado ya con el evento recién escrito; el snapshot en `psql`.
- **Acuña → consume:** el write-path a fondo.

**§22 · Auditoría: el log no viene gratis**
- **← necesidad:** el negocio pregunta "¿quién suspendió esta empresa y por qué?" — el stream guarda el *qué*, no el *quién/por qué*.
- **Objetivo:** registrar cada comando (`LoggedCommand` como documento) y coser evento↔comando con **correlation / causation / headers**; la sesión sube del handler a un punto central (una transacción). Idempotencia por command id.
- **Evidencia:** **ver el documento del comando y sus headers en `psql`**, ligados al evento que produjeron.
- **Acuña → consume:** metadata que cose la historia; cross-cutting central → §25 (middleware), §34 (headers de tenant).

**§23 · Versionado y upcasting**
- **← necesidad:** un año después toca añadir un campo a un evento **ya persistido**; los viejos ya no casan.
- **Objetivo:** la **escalera**: ¿es en realidad otro evento de negocio? → cambio no-rompedor (nullable/default/`JsonPropertyName`) → `MapEventType`/upcaster → copiar-y-transformar (último recurso). Regla marco: jamás reescribas la historia.
- **Evidencia:** eventos v1 que ya están en `mt_events` se leen como v2; reto sobre **tu** historia real.
- **Acuña → consume:** la escalera de esfuerzo.

**§24 · Suscripciones**
- **← necesidad:** otro sistema debe enterarse de una suspensión; llamarlo dentro del handler acopla y pierde el aviso si falla.
- **Objetivo:** `ISubscription` reacciona a los eventos del store con retries y catch-up.
- **Evidencia:** lanzas una excepción en la suscripción → **la progresión no avanza** (checkpoint detenido, se ve) → reinicias → repone.
- **Acuña → consume:** reaccionar a hechos → §31 (UI en vivo).

### Bloque 5 — Wolverine · [W][P] *(D2 no usa Wolverine → doc + plantilla)*

**§25 · Revelar Wolverine**
- **← nace de:** mi despachador (§7) + el guardado central de la auditoría (§22) **son** middleware hecho a mano.
- **Objetivo:** Wolverine lo industrializa: discovery por convención, `AutoApplyTransactions`, la API pasa a `bus.InvokeAsync`. Nota 💡: el código que genera es legible.
- **Evidencia:** `curl` sigue respondiendo; los tests de integración **siguen verdes**; **ver el código generado** en `Internal/Generated`.
- **Acuña → consume:** el despacho industrializado.

**§26 · El Aggregate Handler Workflow**
- **← nace de:** el handler todavía carga-decide-guarda.
- **Objetivo:** `[AggregateHandler]` — Wolverine hace el `FetchForWriting`; el handler queda `(comando, agregado) → eventos`: decider puro.
- **Evidencia:** la misma feature con el handler **más corto del taller**; test verde.
- **Acuña → consume:** el handler como función pura.

### Bloque 6 — EDA: los hechos salen al mundo · [W][P]

**§27 · Diseñar con eventos: público vs privado** *(fusión de dos secciones que se solapaban)*
- **← nace de:** los hechos empiezan a salir al mundo, y no todos deben salir.
- **Objetivo:** distinguir evento **público** (contrato hacia afuera) de **privado** (interno, libre de cambiar) con tres interfaces marcadoras + filtro en el agregado; y las decisiones que el broker **no** toma por ti (granularidad de topics por servicio, evento vs. comando que espera respuesta). Escribir los contratos públicos de un flujo real.
- **Evidencia:** un test afirma que **solo los públicos** cruzan la frontera; los `record` del flujo compilan.
- **Acuña → consume:** el contrato hacia afuera → §28, §39.

**§28 · El sobre del mensaje**
- **← nace de:** al publicar un evento público, el destino necesita tenant y usuario, que **no** van en el cuerpo (es contrato).
- **Objetivo:** publicar con Wolverine nativo + `DeliveryOptions` / headers.
- **Evidencia:** publicas y **ves el evento con sus headers** (spy en test o log).
- **Acuña → consume:** el sobre viaja → §35.

**§29 · Outbox e Inbox** *(juguete adelgazado)*
- **← nace de:** guardar el evento y publicarlo son dos escrituras; si el proceso muere en medio, el hecho queda y el aviso se pierde.
- **Objetivo:** outbox casero mínimo → `UseDurableOutbox`.
- **Evidencia:** **matas el proceso** entre append y envío → al reiniciar, **el mensaje sale igual** (se ve en la cola). Kill-test.
- **Acuña → consume:** exactly-once de efecto.

**§30 · Transportes: RabbitMQ y Azure Service Bus**
- **← nace de:** el bus era casero; hay que enchufarlo a un broker real.
- **Objetivo:** RabbitMQ con AutoProvision; contraste con ASB.
- **Evidencia:** publicas y **lo ves llegar en la management UI de RabbitMQ**.
- **Acuña → consume:** el broker real.

**§31 · La UI en vivo ★** *(opcional)*
- **← nace de:** quiero ver los eventos de una empresa en pantalla, en vivo.
- **Objetivo:** SignalR + el `ISubscription` de §24 (misma pieza, nuevo consumidor).
- **Evidencia:** abres el navegador, disparas un comando por `curl`, y **ves el evento aparecer** en la página.
- **Acuña → consume:** la UI también es un suscriptor.

**§32 · Serverless: Azure Functions** *(tema de host, no de EDA — se ubica al cierre del bloque)*
- **← nace de:** el equipo despliega en Functions; al llevar la app allá, **se rompe**.
- **Objetivo:** diagnosticar (no hay proceso largo que drene el outbox durable) y aplicar las 3 variantes (`AddWolverine(ManualOnly)`, `DurabilityMode.Solo`, `SendInline`).
- **Evidencia:** la function **corre y publica** (host local de Functions o Azure); antes fallaba.
- **Acuña → consume:** el host efímero cambia las reglas.

### Bloque 7 — Multi-tenancy · [M][P] *(D2 apenas lo menciona → doc + plantilla)*

**§33 · De un cliente a muchos**
- **← nace de:** dos empresas de distintos clientes con el mismo aggregate id se **pisan** (sobre tu app Marten real).
- **Objetivo:** `TenancyStyle.Conjoined` + sesión por tenant.
- **Evidencia:** mismo id, distinto tenant, **no se pisan**; **ver `tenant_id` por fila** en `mt_events`.
- **Acuña → consume:** el tenant parte la base.

**§34 · ¿De dónde sale el tenant? Resuélvelo, no lo pidas**
- **← nace de:** pasar el `tenantId` a mano por todos lados ensucia todo.
- **Objetivo:** resolverlo de un header confiable `X-Tenant-Id` (reusando los headers de §22).
- **Evidencia:** `curl` con `X-Tenant-Id` enruta al tenant correcto; **sin el header → excepción fuerte**.
- **Acuña → consume:** resolver del contexto.

**§35 · El tenant viaja con el mensaje**
- **← nace de:** un worker de segundo plano no tiene `HttpContext` y también necesita el tenant.
- **Objetivo:** resolverlo del **sobre** del mensaje (§28); proxy que elige la fuente según haya request.
- **Evidencia:** un handler en background **escribe en el tenant correcto** (se ve la fila con su `tenant_id`).
- **Acuña → consume:** el contexto cruza fronteras async.

### Bloque 8 — La plantilla: administrarla (EL NORTE) · [P]

**§36 · Las dos vertientes** *(criterio + artefacto)*
- **← nace de:** ya viviste el camino nativo entero; la pregunta del elefante (§17) vuelve **con datos**.
- **Objetivo:** comparar lo nativo contra la capa del equipo y **decidir**; el equipo eligió abstraer.
- **Evidencia:** **llenas la tabla de trade-offs** (tests sin BD, público/privado, control del UoW, portabilidad, costo) **contra tu propio código**.
- **Acuña → consume:** la abstracción como decisión, no reflejo.

**§37 · El agregado de la plantilla** *(re-propósito)*
- **← nace de:** para abstraer, primero la forma del agregado del equipo.
- **Objetivo:** construir **sobre** Marten: `Raise` acumula y aplica, `Apply(T)` público, `Version`. Cada pieza mapeada a la API nativa que envuelve.
- **Evidencia:** un test GWT **verde** con el agregado acumulador; el mapeo escrito.
- **Acuña → consume (norte):** el agregado acumulador.

**§38 · El almacén de la plantilla (+ el `TestStore`)** *(re-propósito)*
- **← nace de:** la integración (§18) es lenta; el equipo quiere tests rápidos de vuelta y control del Unit of Work.
- **Objetivo:** `IEventStore` + `MartenEventStore` + Unit of Work + middleware; y el **`TestStore`** → recuperar los GWT **sin base de datos**.
- **Evidencia:** los tests corren **en milisegundos, sin Postgres**, y pasan — la deuda de §18 saldada.
- **Acuña → consume (norte):** la capa = control + tests sin BD.

**§39 · Consumir la plantilla** *(nueva; + caja 🆕 extension members C#14)*
- **← nace de:** todo lo construido tiene nombre y ya es un paquete.
- **Objetivo:** `Cosmos.BuildingBlocks`; `dotnet add package` (NuGets reales); tour mapeando cada pieza a lo que construiste — incluidos los **senders** (`IPublicEventSender`) sobre la publicación nativa de §28.
- **Evidencia:** tu app **compila contra el paquete real** y corre igual.
- **Acuña → consume (norte):** la plantilla no es magia: la conoces por dentro.

**§40 · Empaquetar y publicar como NuGet** *(corta — administrar = mantener)*
- **← nace de:** ahora te toca el sombrero de **mantenedor**.
- **Objetivo:** empaquetar la plantilla y entender su release: versionado **LOCKSTEP**, `Directory.Build.props`, `PrivateAssets=all`, el manifiesto de versiones.
- **Evidencia:** `dotnet pack` produce el `.nupkg`; ves el manifiesto y el workflow.
- **Acuña → consume (norte directo):** mantener ≠ consumir.

**§41 · Capstone**
- **← nace de:** la prueba final: ¿dominas la plantilla?
- **Objetivo:** un bounded context **nuevo** (p. ej. facturación) de punta a punta: comando → evento → proyección → endpoint → test → evento público con outbox.
- **Evidencia:** el flujo completo **verde y respondiendo a `curl`**, construido por el alumno.
- **Acuña → consume (norte):** la prueba real de adopción.

---

## La espina (concepto → dónde se reutiliza)

sobre+versión (9) → **conservado por `FetchForWriting` en el swap** (17) · despachador (7) + sesión central (22) → middleware Wolverine (25) · `decide`-devuelve (5) → decider `[AggregateHandler]` (26) · suscripción (24) → UI en vivo (31) · headers de sesión (22) → resolver del tenant (34) · el sobre (28) → tenant-viaja (35) · **tests rápidos (16) → integración lenta forzada por el swap (18) → `TestStore` los restaura (38)** · elefante del lock-in (17) → dos vertientes (36) → plantilla (37-40) → capstone (41) · async (13) → primer `await` real en el sandbox (14). **Ningún concepto se enseña sin reutilizarse; y el swap ya no regresa ninguna capacidad en silencio.**

## Disposiciones (resumen)

- **Conservadas (§1-9):** las 9 primeras.
- **Reordenadas para continuidad:** API (10) y DI (11) suben antes de docker; async (13) queda pegado a su primer `await`; los tests (16) bajan a ser la red de seguridad **justo antes** del swap.
- **`FetchForWriting` sube al swap (17):** ya no se difiere — conserva la concurrencia de §9. §21 se queda con `FetchLatest` + snapshots.
- **Fusiones:** "probar el motor" + GWT → §16; "diseñar con eventos" + "público/privado" → §27.
- **Reubicada:** serverless (32) al cierre de EDA, marcada como tema de host.
- **Nuevas:** API (10), conocer-marten (14), rehidratar (15), integración (18), primera-proyección (19), lifecycles-daemon (20), fetchlatest-snapshots (21), auditoría (22), suscripciones (24), aggregate-handler (26), ui-en-vivo (31★), consumir-la-plantilla (39).
- **Cortadas/fusionadas:** "por qué adoptar" → abre §14; "reflexión vs codegen" → nota en §25; "extension members" → caja en §39.

Total: **41 secciones** (una ★ opcional).

## Efectos colaterales al construir

1. La semilla de `el-almacen-por-id` ("extraeremos `IEventStore`") se re-apunta a §38.
2. `concurrencia-optimista` (9) gana una semilla: "la herramienta lo hará con `FetchForWriting`" (→ §17).
3. Marten 9: `UseLightweightSessions`, `StreamIdentity.AsString`; `StreamIdentity` vive en `JasperFx.Events`; `SnapshotLifecycle` en `JasperFx.Events.Projections`; fixtures con `IAsyncLifetime` (xUnit no llama `DisposeAsync` sobre solo-`IAsyncDisposable`). La advertencia decider: no mutar el agregado en el handler nativo.
4. `MAPA.md`, `NARRATIVA.md` y `taller.md` se reconstruyen al final, ya con las secciones escritas.

## Orden de trabajo

> **Contrato de escritura:** toda sección se crea y valida contra `DEFINICIONES.md`.

1. ✅ Aprobar este mapa (v5) y el hilo de `Resumen2.md`.
2. **Escribir §12 (docker-postgres) como sección de muestra** — la que el autor marcó como "no enseña"; si pasa el estándar, se aprueba sobre esa muestra.
3. Bloque 1 (§10-13): la app viva y persistente.
4. Bloque 2-3 (§14-19): sandbox + swap + integración + primera proyección — el corazón.
5. Bloque 4 (§20-24): Marten a fondo.
6. Bloque 5-7 (§25-35): Wolverine, EDA, tenancy.
7. Bloque 8 (§36-41): la plantilla — el norte.
8. Reconstruir MAPA/NARRATIVA/taller.md y validar todo.

**Pipeline** (`DEFINICIONES.md` §E): por sección → validador 0 errores + `revisor-estilo`; por bloque → + `revisor-coherencia` + `verificador-tecnico`; hitos (bloques 3, 6, 8) → + `verificador-e2e`.
