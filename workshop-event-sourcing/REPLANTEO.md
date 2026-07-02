# Replanteo del arco — v3 (con el curso 2 de Dometrain + poda por necesidad)

> Documento de trabajo (no es una sección del taller). Propone el nuevo orden de secciones.
> Fuentes: los DOS cursos de Dometrain (`DometrainESTranscript.md` = construir a mano; `DometrainMartenTranscript.md` = deep dive con Marten), la doc oficial de Marten, y el diagnóstico del arco actual.
> Etiquetas: **[D1]** curso 1 · **[D2]** curso 2 · **[M]** doc de Marten · **[X]** corrige un problema del arco actual.

---

## La referencia: por qué funcionan las primeras secciones

Las secciones 1-9 actuales (de *El diario de una empresa* a *Concurrencia optimista*) son el molde del resto del taller. *(La 10ª, async/await, se evaluó aparte: es fundamento del **lenguaje**, no de ES — se mudó junto a su consumidor real; ver Poda.)* Lo que las hace funcionar:

1. **Evolutivas**: cada sección nace de un dolor que la anterior dejó a la vista. No hay saltos.
2. **Explican el fundamento**: la pieza se construye a mano antes de nombrarla; primero se siente, luego se bautiza.
3. **Acuñan conceptos base que el resto reutiliza**: el hecho, el replay, `decide`, el handler, el despachador, la llave por id, la versión, async. Nada se enseña que no se vuelva a usar.

Cada bloque de este replanteo se diseñó con esa vara: la tabla de cada sección dice **qué concepto acuña y quién lo reutiliza después**.

## Lo que aporta el curso 2 (deep dive con Marten)

El curso 2 es el modelo exacto de "aprender la herramienta evolutivamente". Sus movidas, que este plan adopta:

- **Sandbox antes del refactor**: conoce Marten en una consola aparte (StartStream/Append/AggregateStream + mirar `mt_*` en la base) ANTES de tocar la app real.
- **El refactor nombra al muerto**: cada pieza casera se borra diciendo qué API la reemplaza ("tu `StoredEvent` ≈ el `IEvent` de Marten").
- **La base de datos como evidencia**: después de cada operación, mirar las tablas.
- **El error como maestro**: provocar la excepción esperada y arreglarla en vivo.
- **Lecciones de criterio intercaladas**: el "elefante" del lock-in (Marten entra al dominio: decisión consciente — "si dudas, abstrae"), la estrategia de testing (el equipo de Marten recomienda **integración** sobre mocks cuando no abstraes), snapshots ("conoce la técnica fina, no la hagas sin un problema medible").
- **Escaleras de esfuerzo**: versionado de izquierda (barato: ¿es otro evento de negocio?) a derecha (caro: copiar y transformar el stream).

## El cambio estructural clave respecto a la v1 ⚠️

**v1 proponía**: converger el motor a la forma de la plantilla → revelar Marten como swap 1:1 → usar la herramienta.

**v2/v3 proponen (siguiendo el curso 2 y la doc de Marten): aprender Marten NATIVO primero, y la capa de la plantilla al final, como decisión de equipo que ya puedes juzgar.**

Por qué:

1. El curso 2 no converge nada: hace el swap directo a Marten nativo, asume el lock-in **como lección de criterio** ("el elefante"), y profundiza con la herramienta desnuda.
2. La doc de Marten marca el patrón "AggregateRoot + repositorio + `Append(id, versión)`" —la forma de la plantilla— como **legado**; el canon nativo es `FetchForWriting` + decider. Enseñar nativo primero es fiel a la doc.
3. El bloque de convergencia actual (4 secciones) era el túnel sin destino visible que diagnosticamos. **No se bota: se muda al bloque de la plantilla**, re-propositado como "construir la capa del equipo **sobre** Marten" — ahí sí tiene destino, porque responde preguntas que el alumno ya vivió (lock-in, tests sin BD, público/privado, control).
4. `dos-vertientes` deja de ser una lectura comparativa: el alumno llega habiendo **usado** las dos vías.

Consecuencia sobre los tests: los GWT tempranos corren contra tu `EventStore` casero **directo** (ya es in-memory: es su propio doble perfecto; sin interfaz nueva). Tras el swap a Marten nativo se rompen → se migran a **integración** (schema por corrida, la estrategia oficial [D2]). El `TestStore` + `IEventStore` del equipo regresan en el bloque plantilla como SU respuesta para recuperar tests sin BD. La interfaz aparece una sola vez: donde el equipo la introdujo.

## La poda: evaluación de necesidad (v3)

Cada sección heredada se evaluó con tres criterios: ¿sirve a la cadena nueva? ¿su concepto se reutiliza? ¿es del norte (plantilla/Marten/Wolverine) o accesorio? Veredictos (decididos el 2/jul):

| Sección | Veredicto | Razón |
|---|---|---|
| `reflexion-vs-codegen` | **CORTADA** → nota 💡 en revelar-Wolverine | 0 retos, contemplativa; Marten 9 le envejeció la mitad. Su insight útil (mirar `Internal/Generated`) cabe en una nota. |
| `por-que-adoptar-herramientas` | **FUSIONADA** → abre el sandbox (16) | Sin el bloque de convergencia perdió la mitad de su trabajo. El criterio anti-cargo-cult (las 4 condiciones) es una idea, no una sección. |
| `extension-members` | **FUSIONADA** → caja 🆕 en consumir-la-plantilla (41) | Es idioma para *leer* la plantilla: va donde se abre la plantilla. |
| `senders-y-sobre` | **REFORMADA + REPARTIDA** | El concepto obligatorio en EDA es **el sobre** (`DeliveryOptions`, headers — lo necesita tenant-viaja): queda en EDA con publicación nativa Wolverine. Los senders del equipo (`IPublicEventSender`) son piezas de la **plantilla**: llegan en el bloque 9. |
| `outbox-inbox` | Conservada, **juguete adelgazado** | El dolor del dual-write y el kill-test son lo esencial; el outbox casero se reduce a demo mínima. |
| `serverless-azure-functions` | Conservada **obligatoria** | Confirmado: el equipo despliega en Functions. |
| `nuget-empaquetado` | Conservada **corta** (pista de mantenedor) | Obligatoria para quien mantiene la plantilla; contexto para el resto. |
| `la-ui-en-vivo` | Conservada, **marcada opcional ★** | Elegida por gusto; nadie después depende de ella. |
| `el-tiempo-de-espera` | **SE MUEVE** (10 → 15, antes del sandbox) | Es fundamento del lenguaje, no de ES (la única de las 10 primeras que no acuña un concepto ES). En la posición 10 pagaba el costo (async en cascada) sin nada que esperar de verdad. Se muda a justo antes de Marten: el primer `await` real es `SaveChangesAsync` contra Postgres. Los tests GWT y la API nacen síncronos (más simples); esta sección los convierte. |

**Decisiones previas** (2/jul): tests adelantados ✅ · API HTTP temprana ✅ · NuGets reales en el capstone ✅ · UI en vivo ✅.

---

## El nuevo mapa (43 secciones, 10 bloques)

### Bloque 0 — Fundamentos a mano (1-9 · evaluadas con la misma vara: se conservan por mérito)

> No están congeladas por gusto: pasaron la misma poda que el resto. Cada una acuña un concepto ES con consumidor en el arco nuevo (columna derecha del mapa y "Cadena de conceptos"). La única de las 10 originales que no lo pasaba (async, fundamento del lenguaje sin consumidor cercano) se movió a la 15.

| # | Sección | Concepto que acuña |
|---|---|---|
| 1 | El diario de una empresa | el hecho inmutable |
| 2 | Los primeros hechos | el replay: estado = f(hechos) |
| 3 | Refactorizando el motor | `AggregateRoot` / `Aplicar` |
| 4 | El flujo de vida (`EventStream`) | leer/escribir una historia |
| 5 | Decidir el futuro | `decide`: validar → emitir |
| 6 | El Command Handler | cargar → decidir → guardar |
| 7 | El despachador | rutear por tipo de comando |
| 8 | El almacén: un cajón por empresa | la llave por id |
| 9 | Concurrencia optimista | el sobre + la versión (dolor que Marten responderá con `FetchForWriting`) |

### Bloque 1 — Blindar el motor: tests primero [D1][X]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 10 | Probar el motor | **SE ADELANTA + REFORMA** (era teststore, pos. 25) | Tests contra tu `EventStore` casero **directo** — ya es in-memory, es su propio doble. Sin interfaz nueva; **síncronos** (async aún no existe: más simples). | sembrar historia → ejecutar → inspeccionar hechos nuevos |
| 11 | Given-When-Then | **SE ADELANTA** (era pos. 26) | La gramática. **Desde aquí, cada reto del taller se verifica con un test.** | Given/When/Then como especificación |

### Bloque 2 — La app real [D1][X]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 12 | Inyección de dependencias | se conserva | Ahora desemboca en el `Program.cs` de la API. | el contenedor arma el grafo |
| 13 | **La API HTTP** | **NUEVA** | Minimal API: `POST` comandos → despachador → `202 Accepted` [D1]; `GET /api/empresas/{id}` → rehidratar → JSON. `curl`/REST Client. | el sistema vivo; 202 = aceptado, no terminado |
| 14 | Docker y PostgreSQL | se conserva | El muro de la serialización, sentido desde una app real que quiere sobrevivir reinicios. | el muro que justifica la herramienta |

### Bloque 3 — Conocer Marten: el sandbox [D2]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 15 | El tiempo de espera | **SE MUEVE** (era la 10) **+ REFORMA leve** | Docker te dio una BD real; hablarle es **I/O que tarda**. Async/await con consumidor inmediato: aquí se convierten la API y los handlers, y la sección siguiente hace el primer `await` real. | async/await para I/O |
| 16 | **Conocer Marten** | **NUEVA** (absorbe el criterio de por-que-adoptar) | Abre con el criterio anti-cargo-cult (sentiste la necesidad; sabes qué hace; sabes cómo; puedes depurarla). Consola aparte (no la app): `DocumentStore.For` → `LightweightSession` → `StartStream`/`Append`/`SaveChangesAsync` → **mirar `mt_streams`/`mt_events` en psql**. "Casi nada de código y ya hay un event store operativo." | adoptar con criterio; la sesión = unidad de trabajo; la BD como evidencia |
| 17 | **Rehidratar con Marten** | **NUEVA** | `Create`/`Apply` estáticos por convención + `AggregateStreamAsync` (+ **time travel** por versión/fecha, gratis). La convención de identidad (provocar la excepción a propósito). | convención sobre configuración; tu `Get()` ≈ `AggregateStreamAsync` |

### Bloque 4 — El refactor: la app pasa a Marten nativo [D2]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 18 | El swap | **REFORMA** (revelar-marten) | Los handlers pasan a `IDocumentSession` nativo: `StartStream` / `AggregateStreamAsync` + `decide` + `Append`. El almacén casero **se borra nombrando al reemplazo** ("tu sobre ≈ `IEvent`"). Cierre: `curl` → fila en `mt_events`. Nota de criterio: **el elefante** (Marten entra al dominio; lock-in consciente; "si dudas, abstrae" — semilla de la plantilla). | el mapeo casero→framework, pieza por pieza |
| 19 | **Tests de integración** | **NUEVA** | El swap rompió los tests GWT. Estrategia oficial [D2]: si no abstraes, prueba **integración** contra Postgres real. Fixture con schema por corrida + `CollectionFixture` (de 1s/clase a 10-20ms). La gramática GWT **sobrevive**; cambia el motor debajo. | integración: el test atrapa errores de infraestructura, no solo de lógica |
| 20 | **La primera proyección** | **NUEVA** (absorbe parte de cqrs-proyecciones) | Feature: `GET /api/empresas?estado=suspendida`. Dolor: no hay LINQ sobre replay. `SingleStreamProjection` **Inline** + `Query<T>`. Gotcha en vivo: lightweight vs identity session. | proyección = otra vista de los mismos hechos; CQRS |

### Bloque 5 — Marten a fondo: features del proyecto [D2][M]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 21 | **Lifecycles y el daemon** | **NUEVA** (absorbe el resto de cqrs) | Inline/Async/Live situados en el flujo; feature: `GET /api/reportes/suspensiones-por-mes` → `MultiStreamProjection` + `Identity()` → **async por defecto** → `AddAsyncDaemon(Solo)`; checkpoints y high-watermark en la BD; `WaitForNonStaleProjectionDataAsync` en tests. | consistencia eventual, elegida por vista |
| 22 | **FetchForWriting: el write-path** | **NUEVA** [M] | Cierra el dolor de la sección 9: `FetchForWriting` + decider (+ `expectedVersion`, `ConcurrencyException`) y `FetchLatest` para leer tras escribir. Snapshots built-in (`Projections.Snapshot`) con la trampa demostrada (`AggregateStreamAsync` los ignora). Criterio: no snapshotees sin un problema medible [D2]. | el command handler canónico de la doc |
| 23 | Versionado y upcasting | **REFORMA** | La **escalera** del curso 2: ¿es otro evento de negocio? → no-rompedores (nullable/default/`JsonPropertyName`) → `MapEventType`/`AddEventType`/upcasters → copiar-y-transformar (último recurso, conceptual). Reto sobre TU `mt_events` con historia real. Regla marco: jamás reescribas la historia. | la escalera de izquierda a derecha |
| 24 | **Auditoría: el log no viene gratis** | **NUEVA** [D2] | El stream no guarda quién/cuándo/por qué. Refactor: la **sesión sale del handler al despachador** (una transacción) → el comando se persiste como documento (`LoggedCommand`) → **correlation/causation/headers** cosen evento↔comando. Bonus: idempotencia por command id. | metadata que cose la historia; cross-cutting en un punto central (semilla del middleware) |
| 25 | **Suscripciones** | **NUEVA** [D2] | Nunca llames un sistema externo dentro del handler. `ISubscription`: reacciona a eventos del store con **retries y catch-up gratis** (demo: lanza excepción → la progresión no avanza → rearranca y repone). | reaccionar a hechos, no acoplar llamadas |

### Bloque 6 — Wolverine [M]

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 26 | Revelar Wolverine | **REFORMA** (+ absorbe el insight de reflexion-vs-codegen como nota 💡) | El despachador casero + el guardado centralizado de la auditoría **son** middleware hecho a mano. Wolverine: descubre handlers por convención, `AutoApplyTransactions`, la API pasa a `bus.InvokeAsync`. Nota 💡: el código que genera es legible (`Internal/Generated`). Tests de integración siguen verdes. | el despacho industrializado |
| 27 | **El Aggregate Handler Workflow** | **NUEVA** [M] | `[AggregateHandler]`: Wolverine hace `FetchForWriting` por ti; tu handler queda `(comando, agregado) → eventos` — decider puro. "La forma más simple de escribir command handlers con Marten hoy" (doc). | el handler como función pura |

### Bloque 7 — EDA (sin volver al juguete)

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 28 | Diseñar con eventos | se mueve al frente del bloque | | evento ≠ mensaje: el rol cambia |
| 29 | Público vs privado | se conserva | | el contrato hacia afuera |
| 30 | **El sobre del mensaje** | **REFORMA** (de senders-y-sobre) | Publicación **nativa** Wolverine + `DeliveryOptions`/headers (el sobre que tenant-viaja necesitará). Los senders del equipo se difieren al bloque 9. | el sobre viaja |
| 31 | Outbox e Inbox | **REFORMA** (juguete adelgazado) | Dual-write → outbox casero mínimo → `UseDurableOutbox` y **matar el proceso**: el mensaje sobrevive. | exactly-once de efecto |
| 32 | Transportes: RabbitMQ y ASB | **REFORMA leve** | Reto: publicar y **ver el mensaje** en la management UI de Rabbit. | el broker real |
| 33 | **La UI en vivo** ★ opcional | **NUEVA** [D2] | SignalR: la página se suscribe a una empresa y ve sus eventos llegar. El publicador reutiliza `ISubscription` (25) — misma pieza, nuevo consumidor. | la UI también es un suscriptor |
| 34 | Serverless: Azure Functions | se conserva (confirmado: el equipo lo usa) | | el host efímero cambia las reglas |

### Bloque 8 — Multi-tenancy (sobre la app viva)

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 35 | De un cliente a muchos | **REFORMA** | Dolor sobre TU app con Marten (no el in-memory): `TenancyStyle.Conjoined` + sesión por tenant. | el tenant parte la base |
| 36 | ¿De dónde sale el tenant? | **REFORMA leve** | El header llega en tus `curl` reales; reutiliza los headers de sesión de la auditoría (24). | resolver, no pedir |
| 37 | El tenant viaja con el mensaje | se conserva | | el contexto cruza fronteras async |

### Bloque 9 — La plantilla: la capa del equipo, ahora que puedes juzgarla

| # | Sección | Disposición | Qué pasa | Concepto que acuña |
|---|---|---|---|---|
| 38 | Las dos vertientes | **REFORMA + SE MUEVE** | Ya viviste el camino **nativo** (FetchForWriting, `[AggregateHandler]`, tests de integración, lock-in asumido). La pregunta del elefante (18) vuelve: el equipo eligió **abstraer**. Sus razones, una a una, contra tu experiencia. | la abstracción como decisión, no como reflejo |
| 39 | El agregado de la plantilla | **RE-PROPÓSITO** (fusión de agregado-acumula + aplicar-al-levantar + la-version) | Construyes la forma del equipo **sobre** Marten: `Raise` acumula y aplica, `Apply(T)` público, `Version`. Cada pieza mapeada a la API nativa que envuelve. | el agregado acumulador |
| 40 | El almacén de la plantilla | **RE-PROPÓSITO** (el-almacen-directo) | `IEventStore` + `MartenEventStore` + Unit of Work + middleware; y el **`TestStore`** del equipo: recuperas tests GWT **sin BD** (lo que la integración no da). El porqué de cada capa, ya vivido. | la capa = control + tests sin BD |
| 41 | **Consumir la plantilla** | **NUEVA** (+ caja 🆕 de extension members C#14) | Se nombra `Cosmos.BuildingBlocks`; `dotnet add package` (NuGets reales); tour mapeando cada pieza a lo que construiste/usaste — incluidos los **senders** (`IPublicEventSender`) sobre la publicación nativa que ya hiciste (30). | la plantilla no es magia: la conoces por dentro |
| 42 | Empaquetar como NuGet | se conserva **corta** (pista de mantenedor) | Cómo se publica lo que instalaste (LOCKSTEP). | mantener ≠ consumir |
| 43 | Capstone | **REFORMA** | Bounded context **nuevo** (p. ej. facturación) consumiendo la plantilla: comando → evento → proyección → endpoint → test → evento público con outbox. | la prueba real de adopción |

---

## Resumen de disposiciones

- **Se conservan (18)**: las 9 primeras + DI, docker-postgres, disenar-con-eventos, publico-vs-privado, serverless, tenant-viaja, nuget-empaquetado (corta), transportes (leve), outbox (adelgazada).
- **Se mueve (1)**: el-tiempo-de-espera → 15 (antes del sandbox, junto a su consumidor real).
- **Se adelantan reformadas (2)**: teststore→10, given-when-then→11.
- **Reformas (8)**: revelar-marten→18, revelar-wolverine→26, cqrs-proyecciones→20+21, versionado→23, senders-y-sobre→30 (repartida), multitenancy→35, resolver-tenant→36, dos-vertientes→38, capstone→43.
- **Re-propositadas al bloque plantilla (4)**: agregado-acumula + aplicar-al-levantar + la-version → 39; el-almacen-directo → 40.
- **Cortadas/fusionadas (3)**: reflexion-vs-codegen (nota en 26), por-que-adoptar-herramientas (abre 16), extension-members (caja en 41).
- **Nuevas (11)**: la-api-http (13), conocer-marten (16), rehidratar-con-marten (17), tests-de-integracion (19), la-primera-proyeccion (20), lifecycles-y-daemon (21), fetch-for-writing (22), auditoria (24), suscripciones (25), aggregate-handler-workflow (27), ui-en-vivo (33★), consumir-la-plantilla (41).

Total: **43 secciones** (hoy 37; una ★ opcional).

## Cadena de conceptos (la prueba de que es evolutivo)

sobre+versión (9) → FetchForWriting (22) · despachador (7) + sesión centralizada (24) → middleware Wolverine (26) · decide-devuelve (5) → decider `[AggregateHandler]` (27) · suscripción (25) → UI en vivo (33) y notificaciones externas · headers de sesión (24) → resolver del tenant (36) · el sobre (30) → tenant-viaja (37) · elefante del lock-in (18) → dos vertientes (38) → plantilla (39-41) · GWT (11) → integración (19) → TestStore del equipo (40) · async (15) → primer `await` real en el sandbox (16). **Ningún concepto se enseña sin reutilizarse.**

## Efectos colaterales a resolver al construir

1. La semilla de `el-almacen-por-id` ("nacerán hermanos… extraeremos `IEventStore`") se re-apunta: la interfaz nace en el bloque plantilla (40), no antes.
2. `concurrencia-optimista` (9) gana una semilla: "la herramienta responderá esto con una API dedicada" (→ 22).
3. Marten 9 en las secciones nuevas: `QuickWithServerTimestamps`, `UseIdentityMapForAggregates=true`, `UseLightweightSessions` — y la advertencia decider (no mutar el agregado en el handler).
4. El curso 2 **no usa Wolverine** (mantiene su router casero): el bloque 6 se apoya en la doc de Marten/Wolverine y la plantilla, no en Dometrain.
5. MAPA.md, NARRATIVA.md y taller.md se reconstruyen al final.

## Orden de trabajo propuesto

> **Contrato de escritura:** toda sección se crea y se valida contra `DEFINICIONES.md` (reglas de redacción, estructura, hilo y formato + el roster de agentes y su pipeline).

1. ✅ Aprobar este mapa (v3, con poda aplicada).
2. Bloques 1-2 (tests + API): el fundamento de todo lo demás.
3. Bloques 3-4 (sandbox + swap nativo + integración + primera proyección) — el corazón del cambio.
4. Bloque 5 (Marten a fondo).
5. Bloques 6-8 (Wolverine, EDA, tenancy).
6. Bloque 9 (plantilla + capstone).
7. Reconstruir MAPA/NARRATIVA/taller.md y validar todo (script + agentes).

**Pipeline de validación** (detalle en `DEFINICIONES.md` §E): por sección → validador 0 errores + `revisor-estilo`; por bloque → + `revisor-coherencia` + `verificador-tecnico`; hitos (bloques 4, 7, 9) → + `verificador-e2e`.
