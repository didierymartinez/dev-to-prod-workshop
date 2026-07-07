# 🧑‍🏫 Guion del facilitador — Taller de Event Sourcing (presencial)

Este es el **guion para dictar el taller en vivo**. Tú das los **conceptos**; aquí tienes, sección por sección y en orden:

- **🧑‍🏫 Presentas:** los nombres/ideas clave a explicar **antes** del reto (solo el recordatorio — la explicación la das tú).
- **🛠️ Pides que hagan:** los retos **desglosados en micro-pasos** para ir guiando a los asistentes.
- **✅ Deben ver:** el resultado en pantalla o el "ajá" que confirma que el paso quedó.
- **💬 Dirige la discusión:** en las secciones conceptuales (sin código), las preguntas con las que guías la reflexión.

> Las **soluciones de código completas** están en el `<details>` de cada sección (los bloques *"👉 Muéstrame una forma de hacerlo"*). Tú guías con los micro-pasos; si alguien se traba, abren el `<details>`.
>
> **Bitácora (📓):** cada sección cierra con un `commit` + `push`; el mensaje del commit es la **reflexión del asistente con sus palabras** (la pregunta está en el bloque "📓 Registra tu avance" de cada sección). Pídeles que lo hagan al cerrar cada sección — su GitHub queda como diario de lo aprendido.

> 📸 **Foto al 2026-07-07 · v7 en construcción (15/~40).** Este guion recorre las **15 secciones ya construidas** de la cadena real (los enlaces resuelven). El resto del arco (proyecciones → API+DI → Marten a fondo → Wolverine → EDA → multi-tenancy → la plantilla) está **planeado** en [`REPLANTEO.md`](REPLANTEO.md) pero **aún sin archivo**: aparece al final en *"Lo que viene (planeado)"*, por nombre y sin enlaces.

**Prerequisitos del asistente:** .NET 10 SDK (C# 14) · Docker Desktop (para PostgreSQL) · Git + cuenta de GitHub · saber C# básico.

**Proyecto:** una sola consola de C# que va creciendo — el dominio es la `Empresa` (cliente de la plataforma). Todo se acumula en un `Program.cs` (código suelto arriba; clases y `record` al final) hasta que aparezcan los proyectos de tests.

---

## 1 · El diario de una empresa  ·  📄 [el-diario-de-una-empresa.md](secciones/el-diario-de-una-empresa.md)
🎯 *La foto (una fila que el `UPDATE` sobrescribe y borra el pasado) vs el diario (la secuencia de hechos). Eso es Event Sourcing.*
**🧑‍🏫 Presentas:** la **foto** (estado actual, amnésico) vs el **diario** (todo lo que le pasó a la empresa); cada renglón del diario es un **evento**. (Sin código todavía.)
**💬 Dirige la discusión:**
1. ¿Qué información **destruye** un `UPDATE` que el diario conservaría?
2. Con el diario, ¿cómo sabrías el estado de la empresa **el mes pasado**?
3. Di una pregunta del negocio que la **foto** no puede responder y el **diario** sí.
**✅ Deben poder responder:** el estado de hoy se **reconstruye** leyendo el diario; el pasado ya no se pierde.
**📓 Setup:** que creen el repo (`git init` + primer commit + enlazar a GitHub) — está en el bloque 📓 de la sección.

---

## 2 · Los primeros hechos  ·  📄 [los-primeros-hechos.md](secciones/los-primeros-hechos.md)
🎯 *Recalcular el estado de hoy leyendo el diario, en vez de guardarlo — solo con .NET, sin BD ni librerías.*
**🧑‍🏫 Presentas:** el `record` (inmutable, se compara por contenido); el **Stream** (la historia); el **Replay**; reconstruir el estado recorriendo los hechos; el **Aggregate Root**.
**🛠️ Pides que hagan:**
1. Crea el proyecto de consola (`dotnet new console` + `dotnet new gitignore`).
2. Escribe los hechos como `record`: `EmpresaRegistrada(Nombre, Plan)`, `PlanCambiado(NuevoPlan)`, `EmpresaSuspendida(Motivo)`, `EmpresaReactivada()`.
3. Mételos, **en orden**, en una `List<object>` (la historia).
4. Declara 4 variables sueltas: `nombre`, `plan`, `suspendida`, `reactivaciones`.
5. Recorre la lista con un `foreach`; según el **tipo** de cada hecho (`if (hecho is EmpresaRegistrada r)…`), actualiza la variable que toque. Imprime el estado final.
6. **(2º reto)** Crea la clase `Empresa`: las 4 variables como **propiedades** `{ get; private set; }`, y mueve el `foreach` al **constructor** que recibe `IEnumerable<object> historia`.
**✅ Deben ver:** el estado reconstruido correcto (p. ej. `Constructora Andes`, plan `Premium`, suspendida según la historia).

---

## 3 · Refactorizando el motor  ·  📄 [refactorizando-el-motor.md](secciones/refactorizando-el-motor.md)
🎯 *Que el motor que lee la historia y reconstruye el estado sea limpio (no un `if` interminable) y reutilizable (sirve a `Empresa` hoy y a `Factura` mañana).*
**🧑‍🏫 Presentas:** separación de responsabilidades; reutilización por **herencia** (clase abstracta con código compartido); **pattern matching**.
**🛠️ Pides que hagan:**
1. **Separa el recorrer del aplicar:** saca la lógica de los 4 `if` a un método `Aplicar(object hecho)`; deja el constructor con **solo** el `foreach` llamando a `Aplicar`.
2. Crea la clase base **`AggregateRoot`** con `Load(IEnumerable<object>)` (el `foreach`) y un `protected abstract void Aplicar(object)`; haz que `Empresa` **herede** y conserve solo su `Aplicar`.
3. Convierte los 4 `if (hecho is …)` de `Aplicar` en un **`switch`** por tipo (`case X e: … break;`).
**✅ Deben ver:** mismo resultado de antes, pero ahora con un **motor de replay reutilizable**.

---

## 4 · El flujo de vida (EventStream)  ·  📄 [el-flujo-de-vida.md](secciones/el-flujo-de-vida.md)
🎯 *Dejar de manosear listas crudas: un envoltorio dueño de la historia de una empresa, que solo exponga leer (rehidratar) y anotar.*
**🧑‍🏫 Presentas:** el patrón **Repositorio**; el **Event Stream** (la historia de UNA empresa — no confundir con `System.IO.Stream`); **genéricos** (el tipo como "parámetro"). Recuerda que la clase `EventStream<T>` es un **andamio**: más adelante la librería la reemplaza.
**🛠️ Pides que hagan:**
1. Crea `EventStreamDeEmpresa` **dueña de su propia `List<object>`** (nace vacía), con `Append(object hecho)` (anota) y `Get()` (crea una `Empresa` vacía y la rehidrata con `Load`). Añade a `Empresa` un **constructor sin parámetros** y quita el que recibía la historia.
2. **Generalízala** a `EventStream<T> where T : AggregateRoot, new()`; **borra** `EventStreamDeEmpresa`.
3. Demo: crea el stream, `Append` dos hechos, `Get`, imprime.
**✅ Deben ver:** `Constructora Andes: plan Premium`. Y que **ellos** ponen los hechos a mano (lo dará la empresa en la §5).

---

## 5 · Decidir el futuro (emitir eventos)  ·  📄 [decidir-el-futuro.md](secciones/decidir-el-futuro.md)
🎯 *Que la `Empresa` emita sus propios hechos —protegiendo sus reglas— en vez de que se los insertemos por la fuerza con `Append`.*
**🧑‍🏫 Presentas:** la empresa **decide**, no le insertan hechos (le pides algo y ella **devuelve** el hecho); **decidir ≠ aplicar**; **validación** (rechazar lo inválido) vs **idempotencia** (ignorar lo redundante).
**🛠️ Pides que hagan:**
1. Añade a `Empresa` tres métodos que **devuelvan** el hecho, **sin tocar propiedades**: `CambiarPlan(plan)→PlanCambiado`, `Suspender(motivo)→EmpresaSuspendida`, `Reactivar()→EmpresaReactivada`.
2. **🔁 Modifica** dos: `CambiarPlan` **lanza** `ReglaDeNegocioException` si está suspendida (validación); `Suspender` **devuelve `null`** si ya está suspendida (idempotencia → retorno `EmpresaSuspendida?`).
3. Demo sobre **un** stream: `Append` la historia previa → `Get` → `CambiarPlan` → `Append` → `Get` de nuevo para verificar.
**✅ Deben ver:** el plan cambió al recargar; suspender dos veces da `null`; cambiar el plan de una suspendida **lanza**.

---

## 6 · El Command Handler  ·  📄 [el-command-handler.md](secciones/el-command-handler.md)
🎯 *Encapsular el "cargar → actuar → guardar" en una pieza con un solo trabajo, para que el resto del programa solo diga "ejecuta esta intención" y no sepa de streams.*
**🧑‍🏫 Presentas:** el **Command Handler** (el "secretario" que orquesta cargar→decidir→guardar); qué es un **comando** (la *intención*, en imperativo) vs un **evento** (lo que ya pasó); **responsabilidad única** (una clase por comando). *(Por ahora la orden viaja como **parámetros sueltos** a un método; el record y la interfaz llegan en §7, cuando hagan falta.)*
**🛠️ Pides que hagan:**
1. **(Primer intento)** Crea `EmpresaCommandHandlers(EventStream<Empresa> stream)` con un método por operación **de parámetros sueltos** (`CambiarPlan(string)`, `Suspender(string)`) que **carga** (`Get`) → pide **decidir** → **guarda** (`Append`); respeta el `null` de `Suspender`.
2. **🔁 Rompe el súper-secretario** en una clase **por comando** (`CambiarPlanHandler`, `SuspenderHandler`), cada una con un `Handle(...)` de **parámetros sueltos** (aún **sin record ni interfaz**).
**✅ Deben ver:** un handler **por comando** suspende la empresa. Y la pregunta abierta: para ejecutar uno **eliges la clase a mano** — eso pedirá un despachador (§7).

---

## 7 · El despachador: dado un comando, encuentra su handler  ·  📄 [el-despachador.md](secciones/el-despachador.md)
🎯 *Un solo punto que reciba un comando cualquiera y encuentre y ejecute su handler por el tipo —sin `switch`, sin nombrar clases— y descubrir las dos piezas que eso exige.*
**🧑‍🏫 Presentas:** un **despachador** (mediador) que rutea por **el tipo** del comando; y las **dos piezas que eso exige** (aquí nacen, no antes): el **Comando** (un `record` por intención, para rutear por tipo) y el **contrato `ICommandHandler<T>`** (molde común). El `Despachador` es un **andamio** — lo industrializará Wolverine más adelante.
**🛠️ Pides que hagan:**
1. **💥 El dolor:** con `new SuspenderHandler(...).Handle("…")` eres **tú** quien elige la clase; un `switch` por tipo crece con cada comando.
2. **(Pieza 1 — el Comando)** Crea un `record` por comando (`CambiarPlanDeEmpresa(NuevoPlan)`, `SuspenderEmpresa(Motivo)`) y **🔁** cambia cada handler de `Handle(string)` a `Handle(suComando)`. *(Con `string` todos colisionan; rutear por tipo exige que cada comando sea su PROPIO tipo.)*
3. **(Pieza 2 — el contrato)** Declara `ICommandHandler<TCommand>` con `Handle(TCommand)`; cada handler lo **implementa**.
4. **(El despachador)** Construye `Despachador` con `Dictionary<Type, Action<object>>`: `Registrar<T>(ICommandHandler<T>)` (guarda una lambda que castea) y `Enviar(object)` (busca por `comando.GetType()`). Demo: registra los handlers y `Enviar` un comando que llega como `object`.
**✅ Deben ver:** un `object` ruteado a su handler **por tipo**, sin `switch`. Y **por qué** hacían falta el record (la llave es `GetType()`) y la interfaz (`Registrar<T>` no se escribe sin el contrato). Diles que **dejen el `Despachador` de lado** después: es andamio; Wolverine lo hace.

---

## 8 · El almacén: un cajón por empresa  ·  📄 [el-almacen-por-id.md](secciones/el-almacen-por-id.md)
🎯 *Un único almacén que custodie la historia de cualquier empresa por su id, y que el handler reciba ese almacén (no un stream fijo). Handlers registrados una vez, sirviendo a todas.*
**🧑‍🏫 Presentas:** el **dolor de empresa2** — los handlers atados a un stream fijo no sirven a varias empresas → hace falta un **almacén central por id** (un `Dictionary`: llave = id).
**🛠️ Pides que hagan:**
1. Crea `EventStore` con `Dictionary<string, List<object>>`; métodos `GetEvents(id)` y `AppendEvent(id, hecho)` (el **id es parámetro**).
2. **🔁** `AggregateRoot` gana `Id` (`{ get; set; }` — es el rótulo, se estampa desde fuera).
3. Añade `AbrirStream<T>(id)` (dentro del store, `this` = el almacén, se lo pasa al stream); **🔁 reescribe** `EventStream` para **delegar** (guarda `_store` + `_aggregateId`).
4. **🔁** El comando gana `EmpresaId`; el handler recibe el **almacén** y abre el stream por `cmd.EmpresaId` → se registran **una vez**, para todas.
**✅ Deben ver:** dos empresas (`emp-7`, `emp-9`) en el mismo almacén, con handlers registrados una sola vez.

---

## 9 · Cuando dos escriben a la vez (concurrencia optimista)  ·  📄 [concurrencia-optimista.md](secciones/concurrencia-optimista.md)
🎯 *Que dos escrituras simultáneas sobre la misma empresa no se pisen sin que nadie se entere: detectar el choque y rechazarlo.*
**🧑‍🏫 Presentas:** la **actualización perdida** (*lost update*) — dos escritores a la vez sobre la misma empresa, en silencio; la **concurrencia optimista** (no bloquear; verificar la versión al guardar); el **sobre** que numera cada hecho.
**🛠️ Pides que hagan:**
1. El **sobre `EventoAlmacenado(Version, Timestamp, EventData)`** — numerar cada hecho con su posición.
2. **🔁** El `EventStore` guarda **sobres**; `AppendEvent` **valida la versión** → lanza `ConcurrencyException` si la posición ya está ocupada.
3. **🔁** El `EventStream` numera al escribir y **desenvuelve** (`.Select`) al leer.
**✅ Deben ver:** con un escritor, versiones 1,2,3…; con **dos** streams de la misma empresa (ambos `Get`, ambos `Append`), el segundo lanza `ConcurrencyException`.

---

## 10 · Blindar el motor: Given-When-Then  ·  📄 [given-when-then.md](secciones/given-when-then.md)
🎯 *Una base de test Given / When / Then que fije el comportamiento del motor — escrita de modo que los mismos escenarios sobrevivan al swap (corran igual contra Marten, sin tocarlos).*
**🧑‍🏫 Presentas:** el patrón **Given → When → Then**; `Then` compara **hechos**, no filas; tu `EventStore` en RAM es su propio doble de test (sin mocks); **xUnit** (`[Fact]`, `Assert.…`) instalado como proyecto aparte que **referencia** el tuyo.
**🛠️ Pides que hagan:**
1. Crea el proyecto de tests (`dotnet new xunit` + `dotnet add … reference`).
2. Una base `HandlerTest`: `Given(params)` (siembra historia en un `EventStore` nuevo), corre el handler, y `Then(params)` (afirma los **hechos nuevos**). Deja el `EventStore` **detrás** de la base, no en cada `[Fact]`.
3. Escribe un escenario `[Fact]` Given→When→Then y **ponlo en verde**.
**✅ Deben ver:** el test en verde — la lógica probada **sin leer la consola a ojo**, y escenarios que no nombran el `EventStore` (listos para el swap).

---

## 11 · Persistir a mano tiene un límite  ·  📄 [persistir-a-mano.md](secciones/persistir-a-mano.md)
🎯 *Levantar un PostgreSQL real, guardar un hecho a mano y verlo sobrevivir a un reinicio. Y ver el límite: recuperar ese hecho a su tipo desde C# marca dónde hacerlo a mano deja de tener sentido.*
**🧑‍🏫 Presentas:** un evento no cabe en una tabla rígida → es un **documento JSONB**; una fila **muta**, un hecho **no** (se escribe una vez); **PostgreSQL + JSONB** (ACID + consultable); el **"muro"** (recuperar un `object` a su **tipo exacto**: serialización polimórfica).
**🛠️ Pides que hagan:**
1. Crea `docker-compose.yml` con `postgres` (usuario, contraseña, db, puerto `5432`); `docker compose up -d`; `docker ps` (debe verse `Up`).
2. Guarda un hecho **a mano** (un `INSERT` con el JSON del evento) y recárgalo tras reiniciar.
3. Intenta recuperarlo **a su tipo** de C# — y topa con el muro.
**💬 Discusión:** ¿cuál es el **muro** que hace que escribir el store de Postgres a mano no valga la pena?
**✅ Deben ver:** el hecho sobrevive al reinicio; y el muro (deserializar a su tipo) que motiva **adoptar** una herramienta.

---

## 12 · Conoce a Marten: una base de datos de documentos  ·  📄 [conoce-a-marten.md](secciones/conoce-a-marten.md)
🎯 *Guardar y leer un objeto de C# como documento con Marten, verlo convertido en JSONB dentro de Postgres, y descubrir el giro: tu event store viajará sobre este mismo motor.*
**🧑‍🏫 Presentas:** **Marten** como base de datos de **documentos** sobre Postgres (la idea de Mongo/Raven, pero en Postgres); el `DocumentStore` (fábrica central) y las **sesiones**; que serializar a JSONB es justo lo que hicieron a mano en §11, pero automático.
**🛠️ Pides que hagan:**
1. `dotnet add package Marten --version 9.2.1`.
2. Crea el `DocumentStore.For(...)` con la cadena de conexión; abre una sesión, **guarda** un objeto y **léelo** de vuelta.
3. Mira en Postgres cómo quedó guardado como **JSONB**.
**✅ Deben ver:** un objeto de C# ida y vuelta como documento JSONB — y el gancho: el event store irá sobre **este mismo motor**.

---

## 13 · El swap: tu motor sobre Marten  ·  📄 [el-swap.md](secciones/el-swap.md)
🎯 *Que tus handlers reales dejen de hablar con el `EventStore` en RAM y hablen con Marten (Postgres de verdad), y borrar el almacén casero — sin cambiar el comportamiento.*
**🧑‍🏫 Presentas:** el swap es **1:1** (intercambiar el motor, no rediseñar); las dos opciones de eventos de Marten (`StreamIdentity.AsString` para llaves `"emp-7"`, `EventNamingStyle.SmarterTypeName`); `Events.StartStream`/`Append` para escribir y `AggregateStreamAsync` para rehidratar.
**🛠️ Pides que hagan:**
1. `dotnet add package Marten --version 9.2.1`; configura el `DocumentStore` con `StreamIdentity.AsString` y `EventNamingStyle.SmarterTypeName`.
2. **🔁** Reescribe los handlers para que carguen/guarden con la sesión de Marten en vez del `EventStore` en RAM.
3. **Borra** el `EventStore` casero, el `EventStream`/`AbrirStream` y el sobre a mano.
**✅ Deben ver:** los **mismos** handlers corriendo contra **Postgres real**; los hechos quedan en las tablas de Marten (`mt_events`).

---

## 14 · Tests de integración: validar el swap  ·  📄 [tests-de-integracion.md](secciones/tests-de-integracion.md)
🎯 *Que los mismos escenarios Given-When-Then de antes corran verdes contra Marten + Postgres reales. Ese verde es la validación del swap.*
**🧑‍🏫 Presentas:** los **escenarios no se tocan**; solo cambia la base a Marten; el `DocumentStore` es **caro** → un `MartenFixture` que xUnit crea **una vez** y comparte, con `ResetAllData()` por test; todo **`async`**.
**🛠️ Pides que hagan:**
1. **🔁** En `HandlerTest`, reemplaza el `EventStore` en RAM por Marten dentro de un `MartenFixture` compartido.
2. `Given` siembra con `StartStream`, `When` corre el handler `async`, `Then` lee los hechos del stream.
3. Corre los **mismos** `[Fact]` de §10 — ahora contra Postgres.
**✅ Deben ver:** los escenarios de §10 **verdes contra Marten** — el swap validado sin reescribir un solo test de negocio.

---

## 15 · El almacén abstracto: tests rápidos sin Postgres  ·  📄 [el-almacen-abstracto.md](secciones/el-almacen-abstracto.md)
🎯 *Que los handlers dependan de una abstracción (`IEventStore`), no de Marten: producción usa Marten, y los tests un doble en memoria — rápidos, sin Postgres.*
**🧑‍🏫 Presentas:** la **costura** — de todo Marten, el handler solo usa **tres** cosas (rehidratar, emitir, confirmar); eso es el contrato `IEventStore`; producción → `MartenEventStore` (envuelve la sesión), tests → `TestStore` en memoria (rehidrata por **reflexión** sobre `Apply`); los de integración quedan como el **puñado** que valida el cableado.
**🛠️ Pides que hagan:**
1. Declara `IEventStore` con las tres operaciones (`GetAggregateRootAsync<T>`, `AppendEvent`, `SaveChangesAsync`).
2. **🔁** Cambia los handlers para que reciban `IEventStore` en vez de la sesión concreta.
3. Escribe `MartenEventStore : IEventStore` (envuelve la sesión) y `TestStore : IEventStore` (dos diccionarios: eventos sembrados y eventos nuevos; rehidrata por reflexión de `Apply`).
4. Vuelve a apuntar la base de tests de negocio al `TestStore`; deja los de integración sobre Marten.
**✅ Deben ver:** los tests de negocio **rápidos y sin Postgres**; y que acaban de reconstruir piezas de la **plantilla real** del equipo.
➡️ *La cadena construida termina aquí. La sección siguiente (**La primera proyección**) aún no existe — ver "Lo que viene".*

---

## 📋 Lo que viene (planeado — aún sin archivo)

Estas secciones están **diseñadas en [`REPLANTEO.md`](REPLANTEO.md)** pero todavía **no construidas**; se listan por nombre, sin enlaces (se irán agregando a este guion a medida que se escriban). El norte del tramo restante es el **criterio para operar y mantener** `Cosmos.BuildingBlocks` (Marten 9.2.1 / Wolverine 6.1.0).

- 📋 **Proyecciones (CQRS · el lado de lectura):** la primera proyección, lifecycles y el daemon async, versionado/upcasting.
- 📋 **API + Inyección de Dependencias:** del cableado a mano al contenedor y el servidor HTTP; Marten `Scoped`; el `async` cobra sentido real.
- 📋 **Marten a fondo:** `FetchForWriting` como **momento-criterio** (la plantilla usa `Append` — ¿adoptarlo?), snapshots, `FetchLatest`.
- 📋 **Revelar Wolverine:** el despachador de §7 + el guardado central se vuelven middleware descubierto por convención; `IntegrateWithWolverine`, `AutoApplyTransactions`, `InvokeAsync`.
- 📋 **EDA (mensajería + diseño):** público vs privado, senders y el sobre, outbox/inbox, transportes reales (RabbitMQ / Azure Service Bus), y el **criterio de diseño con eventos**.
- 📋 **Multi-tenancy:** la llave `(tenant, id)`, resolver el tenant (header confiable), y el tenant que viaja con el mensaje en el daemon.
- 📋 **La plantilla (el norte) + Capstone:** el agregado y el almacén reales de `Cosmos.BuildingBlocks`, empaquetar en NuGet (LOCKSTEP), y la decisión con criterio del mantenedor.

---

## 📋 Tabla de ritmo (para tu planeación)

| Bloque | Secciones | Tono |
|---|---|---|
| **Fundamentos del diario** | 1–2 | discusión + primeros hechos a mano |
| **Motor a mano** | 3–9 | construcción guiada, mucho teclado (motor → decisiones → handlers → despachador → almacén → concurrencia) |
| **Blindar el motor** | 10 | tests Given-When-Then (sin BD) |
| **Persistir de verdad** | 11–12 | Postgres a mano topa el muro → conocer Marten |
| **El swap y su red** | 13–15 | motor sobre Marten + tests de integración + la abstracción `IEventStore` |
| **Lo que viene (planeado)** | 📋 | proyecciones · API+DI · Marten a fondo · Wolverine · EDA · multi-tenancy · la plantilla (aún sin archivo) |

> Cierra **cada** sección con su commit de bitácora (📓) antes de pasar a la siguiente.
