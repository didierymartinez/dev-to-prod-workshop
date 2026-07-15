# Glosario de enlaces — el mapa de acoplamiento de conceptos

> Documento de orientación (no es una sección del alumno). Complementa `GLOSARIO.md`
> (solo términos) diciendo **cómo se ENGANCHA cada concepto** al event sourcing.
> Fuente de verdad del arco: `REPLANTEO.md` (v7). Contrato de creación: `DEFINICIONES.md`.
> **FOTO al 2026-07-07** — 14 secciones construidas; la cadena real termina en
> `tests-de-integracion.md` (que apunta a `el-almacen-abstracto.md`, aún no escrita).

---

## 1. Manifiesto

**El principio del autor.** Todo concepto obligatorio entra por una **necesidad del event
sourcing** y se **enlaza a un gemelo o a un consumidor**. Ningún tema se enseña suelto. Un
concepto solo aparece **cuando hay un trabajo que sin él no se puede hacer** (DEFINICIONES B3,
B4: "el nombre cuando gana su sueldo", "cada pieza donde tiene consumidor").

Dos ejemplares de **buen enlace** que ya viven en el taller y fijan el estándar:

- **Repositorio ⇄ `EventStream<T>`** (`el-flujo-de-vida.md`). No son dos temas: son **el mismo
  objeto visto por dos ángulos**. *Event stream* por la historia que envuelve; *repositorio*
  por cómo la esconde y te entrega el agregado listo (`Append`/`.Get()`). El nombre "Repositorio"
  no se enseña aparte — se **descubre** cuando el envoltorio ya esconde la lista.

- **`decide` ⇄ `evolve`** (`decidir-el-futuro.md`, gemelo de `los-primeros-hechos.md`). Gemelos
  del patrón Decider: `evolve` (estado + hecho → estado) aplica lo que pasó; `decide`
  (estado + intención → hecho) produce lo que va a pasar. `decide` se introduce **nombrando** a
  su gemelo ya construido — nunca en frío.

Este documento clasifica cada concepto en un tratamiento:
🟢 **entretejido** (nace de un dolor de ES y enlaza a un gemelo/consumidor) ·
🔗 **ortogonal-obligatorio** (obligatorio pero no intrínseco a ES → necesita un HOOK explícito) ·
🟡 **presente-pero-desacoplado** (aparece suelto → riesgo a corregir) ·
❌ **ausente** (sección aún no construida).

---

## 2. Tabla de ortogonales-obligatorios

Conceptos de C#/.NET obligatorios que **no son** event sourcing, pero deben entrar por un dolor
de ES y enlazarse. "Tratamiento actual" = lo verificado leyendo las 14 secciones.

| Concepto | Categoría | Hook de ES (por qué entra y a qué enlaza) | Tratamiento actual | Acción |
|---|---|---|---|---|
| **record** | C# | Un hecho es un **hecho inmutable**: el pasado no se edita. Enlaza a → evento/stream. | 🟢 `los-primeros-hechos` (se justifica: inmutable + igualdad por valor, "no porque esté de moda") | Mantener. Ejemplar. |
| **`{ get; private set; }`** | C# | El agregado es **dueño de su coherencia**; nadie muta su estado desde fuera. Enlaza a → Aggregate Root. | 🟢 `los-primeros-hechos` (caja 🆕 + `empresa.Plan="X"` no compila) | Mantener. |
| **herencia `abstract`/`override`** | C# | El motor de replay (`Load`) es **idéntico para toda entidad** → vive una vez en la base. Enlaza a → `AggregateRoot`. | 🟢 `refactorizando-el-motor` (nace del dolor "el `foreach` se copiaría para `Factura`") | Mantener. |
| **pattern matching / `switch` por tipo** | C# | Rutear la mutación **según el tipo del hecho** sin un `if` que crece. Enlaza a → `Apply`/`evolve`. | 🟢 `refactorizando-el-motor` (refactor 3; y contrasta `dynamic` como la "otra forma" NO adoptada) | Mantener. Ejemplar de "problema→solución". |
| **genéricos `<T>` + `where`** | C# | Un **repositorio para CUALQUIER agregado** (`EventStream<Empresa>`/`<Factura>`). Enlaza a → `EventStream<T>`/repositorio. | 🟢 `el-flujo-de-vida` (nace del dolor "un envoltorio por agregado"; el "De" → `<>`) | Mantener. Ejemplar. |
| **constructor primario** | C# | Azúcar para inyectar el stream/almacén al handler sin campo+ctor. Enlaza a → Command Handler. | 🟢 `el-command-handler` (caja 🆕 al recibir el `EventStream` por ctor) | Mantener. |
| **`T?` (nullable)** | C# | `Suspender` **no emite** si ya está suspendida (idempotencia = no-op). Enlaza a → decide/idempotencia. | 🟢 `decidir-el-futuro` (caja 🆕 junto al no-op) | Mantener. |
| **DTO (el comando como dato)** | C# / DDD | Cada intención necesita **identidad de tipo** para rutearse; un `string` colisiona. Enlaza a → despachador/comando. | 🟢 `el-despachador` (nace en Pieza 1; el `record`-comando "gana su sueldo" como llave de la tabla) | Mantener. |
| **marker / contrato `ICommandHandler<T>`** | C# | El despachador debe **tratar a todos los handlers igual** (`handler.Handle((T)c)`). Enlaza a → despachador. | 🟢 `el-despachador` (Pieza 2, nace cuando la tabla lo exige; ancla a `ICommandHandler<T>` real) | Mantener. |
| **lambda / `Action<object>` / closure** | C# | La tabla `tipo→handler` debe ser **uniforme** aunque cada handler reciba un comando distinto. Enlaza a → despachador. | 🟢 `el-despachador` ("el truco de la lambda que captura T") | Mantener. |
| **LINQ `.Select(...)`** | C# | **Desenvolver** el hecho del sobre para pasarlo al `Load`. Enlaza a → sobre/versión. | 🟢 `concurrencia-optimista` (caja 🆕); reaparece en tests. | Mantener. |
| **`Task` / `async` / `await`** | C# | El almacén hace **I/O real contra Postgres**: hablar con la BD tarda y no debe congelar el proceso. Enlaza a → event store (Marten). | 🟢 `conoce-a-marten` (caja 🆕 larga, motivada: "Postgres es otro programa; `await` no acelera, libera el hilo"); **se propaga** en `el-swap` (jubila el `Despachador` síncrono) y aterriza en tests. | Mantener. **Ejemplar de ortogonal bien enganchado.** Ver §4-nota (el "servidor que agota hilos" aún no se toca). |
| **`await using` / `IAsyncDisposable`** | C# | La sesión de Marten se cierra async. Enlaza a → sesión Marten. | 🟢 `conoce-a-marten` · `tests-de-integracion` | Mantener. |
| **inyección de dependencias (DIP/IoC/DI/contenedor)** | C# / infra | El **"infierno de los `new`"** al cablear el almacén + handlers + despachador a mano; un cliente real no instancia el `DocumentStore` en cada test → contenedor + HTTP. Enlaza a → despachador (`new` a mano), swap (cableado de sesión), Wolverine. | ❌ **No hay sección construida.** Solo **sembrada**: el HOOK ya existe como semilla 🌱 en `el-despachador` ("germen del infierno de los `new`"). | **Construir la sección** (arco v7 §18 "API + DI"), cosechando esa semilla. Registrar Marten `Scoped`; ahí el `async` "cobra sentido real" (servidor que agota hilos). Ver §4. |
| **reflexión (`Activator`/`MethodInfo`)** | C# | El `TestStore` (y el fold de Marten) **hallan el `Apply`** por convención sin switch. Enlaza a → `Apply`/rehidratar. | ❌ ausente (sección `el-almacen-abstracto`/`teststore` no construida; contrastada como la "otra forma" `dynamic` NO adoptada en `refactorizando-el-motor`) | Construir con hook: "la reflexión SÍ es apropiada en un test double". |
| **extension methods / `extension` C#14** | C# | La API en español de la plantilla (`Agregar`/`Usar`/`Habilitar`) y los helpers LINQ async. Enlaza a → idioma de la plantilla. | ❌ ausente (bloque F/I no construido) | Construir con hook al destapar la plantilla. |
| **marker interface `IPublicEvent`/`IPrivateEvent`** | EDA | Distinguir el hecho que **cruza la frontera** del que se queda en casa, sin bandera ni namespace. Enlaza a → EDA / `GetPublicEvents`. | ❌ ausente (bloque G/EDA no construido); **sembrada** en `los-primeros-hechos` ("algunos eventos llevarán una marca") | Construir con hook; la semilla ya está plantada. |
| **`IHttpContextAccessor` / headers** | ASP.NET | ¿De dónde sale el **tenant**? No lo pidas, resuélvelo del contexto. Enlaza a → multi-tenancy/resolver. | ❌ ausente (bloque H no construido) | Construir con hook. |

---

## 3. Entretejidos confirmados (🟢) — con su enlace

Conceptos **intrínsecos a ES** que ya nacen de un dolor y enlazan bien (verificado en las 14 secciones):

- **Event / evento** ⇄ el diario vs la foto — nace del dolor "amnesia del `UPDATE`" (`el-diario-de-una-empresa`).
- **Stream** ⇄ "la única fuente de la verdad" — la secuencia ordenada (`los-primeros-hechos`).
- **Replay / rehidratar** ⇄ `foreach` que reconstruye el estado (`los-primeros-hechos`).
- **`evolve`** ⇄ el paso `(estado,hecho)→estado`; gemelo declarado de `decide` (`los-primeros-hechos`).
- **Aggregate Root** ⇄ la clase dueña de su coherencia; motor común en la base (`refactorizando-el-motor`).
- **`EventStream<T>` = Repositorio** ⇄ **ejemplar**: mismo objeto, dos ángulos (`el-flujo-de-vida`).
- **`decide`** ⇄ **ejemplar**: gemelo de `evolve`; decide ≠ aplica (`decidir-el-futuro`).
- **validación vs idempotencia** ⇄ rechazar (grita) vs no-op (calla) (`decidir-el-futuro`).
- **Command / Command Handler** ⇄ encapsula cargar→actuar→guardar (`el-command-handler`).
- **Dispatcher / mediador** ⇄ un punto que rutea por tipo; andamio de Wolverine (`el-despachador`).
- **Event Store (por id)** ⇄ un cajón por agregado; el id es la llave (`el-almacen-por-id`).
- **Concurrencia optimista + sobre/versión** ⇄ nace del dolor "lost update" (`concurrencia-optimista`).
- **Given-When-Then / test double** ⇄ el motor en RAM es su propio doble (`given-when-then`).
- **Documento / JSONB / serialización polimórfica** ⇄ un hecho no cabe en tabla rígida; el `switch(type)` que no vale la pena (`conoce-a-marten`).
- **`DocumentStore` / event = documento** ⇄ el giro que motiva el swap (`conoce-a-marten`).
- **Swap / lock-in / fold / `Apply` por convención** ⇄ cada pieza casera muere nombrando su reemplazo (`el-swap`).
- **Tests de integración / fixture** ⇄ los mismos escenarios validan el swap (`tests-de-integracion`).

---

## 4. Riesgos 🟡 desacoplados a corregir (y su corrección)

**No se hallaron conceptos 🟡 desacoplados en las 14 secciones construidas.** El enganche está
sano en todo lo escrito. Los riesgos reales son de **cobertura pendiente**, no de acoplamiento roto.
Se listan como riesgos a vigilar al construir las secciones que faltan:

1. **DI podría entrar "porque toca" (riesgo alto).** Es el ortogonal más fácil de enseñar suelto
   ("qué es un contenedor", DIP/IoC/DI/contenedor como teoría). **Corrección:** entra SOLO por el
   dolor ya sembrado en `el-despachador` (el "germen del infierno de los `new`": `Registrar(new
   SuspenderHandler(store))` + cada `new` a mano) más el dolor de `tests-de-integracion` (un
   cliente real no instancia el `DocumentStore` a mano). Enlazar a → despachador (lo que Wolverine
   industrializa) y a → registro `Scoped` de Marten. Un mini-contenedor a mano (~20 líneas) para
   desmitificar, como manda el METODO, NO una lección de teoría de IoC.

2. **async/await tiene su enganche a medio cobrar (riesgo bajo).** Entra bien en `conoce-a-marten`
   (I/O contra Postgres), pero su consumidor completo —"un servidor que **agota hilos** si bloquea"—
   se **promete** ("la ganancia llega cuando sea un servidor…") y aún no se **demuestra**, porque no
   hay sección de API/servidor. **Corrección:** cerrar el arco en la sección de **API + DI** (v7 §18),
   donde el `async` "cobra sentido real". Hasta entonces la promesa queda honesta pero abierta.

3. **reflexión / marker interfaces / extension members / tenant-resolver:** ❌ ausentes hoy, con
   **semillas ya plantadas** (marker en `los-primeros-hechos`; reflexión contrastada como la forma
   `dynamic` NO adoptada en `refactorizando-el-motor`). **Corrección:** al construirlas, cosechar la
   semilla y entrar por su dolor (test double halla el `Apply`; el marcador evita bandera/namespace;
   el idioma español de la plantilla; resolver el tenant del contexto).

4. **Deriva de documentos maestros (riesgo medio, no de concepto sino de navegación).** `MAPA.md` y
   `taller.md` describen el arco viejo (slugs `inyeccion-de-dependencias.md`, `el-almacen-directo.md`,
   `revelar-marten.md`… que **no existen**) y difieren de la cadena real de las secciones y de
   `REPLANTEO.md` v7. **Corrección:** al reconstruir MAPA/taller (orden de trabajo v7, paso 5),
   alinear los slugs y el orden con la cadena real y con v7, para que ningún enlace apunte a vacío.

---

## Resumen

- **Ortogonales-obligatorios catalogados: 18.** De ellos, **11 están entretejidos hoy** (record,
  `private set`, herencia, pattern matching, genéricos, ctor primario, `T?`, DTO/comando, contrato
  `ICommandHandler<T>`, lambda/closure, LINQ) **más async/await y `await using`** = 13 🟢.
- **Sueltos hoy (🟡): 0.** Ningún ortogonal construido está desacoplado — el enganche está sano.
- **Ausentes (❌): 5** ortogonales aún sin sección (DI, reflexión, extension members, marker
  público/privado, tenant-resolver) — **todos con su hook ya identificado**, y varios ya **sembrados**.
- **Foco pedido:**
  - **async/await → 🟢 bien enganchado** (entra por I/O real contra Postgres en `conoce-a-marten`, se
    propaga en `el-swap`). Única deuda: su consumidor "servidor que agota hilos" se promete pero no se
    demuestra hasta la sección API+DI (aún no escrita).
  - **inyección de dependencias → ❌ aún no construida, pero con el mejor hook posible ya sembrado**
    ("germen del infierno de los `new`" en `el-despachador`). NO está suelta: está pendiente. El riesgo
    es que al escribirla se cuele como teoría de IoC en vez de nacer del dolor del cableado a mano.
- **Acciones top:**
  1. Al construir **API + DI (§18)**: cosechar la semilla del despachador; entrar por el "infierno de
     los `new`" + "el cliente no instancia el `DocumentStore`"; y ahí **cerrar** el arco de async.
  2. Mantener intactos los ejemplares (Repositorio/`EventStream<T>`, `decide`/`evolve`, genéricos,
     pattern matching): son el patrón de oro a replicar.
  3. Alinear `MAPA.md` y `taller.md` con la cadena real y con `REPLANTEO.md` v7 (slugs y orden), para
     que las referencias dejen de apuntar a secciones inexistentes.
