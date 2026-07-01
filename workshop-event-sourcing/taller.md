# 🧑‍🏫 Guion del facilitador — Taller de Event Sourcing (presencial)

Este es el **guion para dictar el taller en vivo**. Tú das los **conceptos**; aquí tienes, sección por sección y en orden:

- **🧑‍🏫 Presentas:** los nombres/ideas clave a explicar **antes** del reto (solo el recordatorio — la explicación la das tú).
- **🛠️ Pides que hagan:** los retos **desglosados en micro-pasos** para ir guiando a los asistentes.
- **✅ Deben ver:** el resultado en pantalla o el "ajá" que confirma que el paso quedó.

> Las **soluciones de código completas** están en el `<details>` de cada sección (los enlaces 📄). Tú guías con los micro-pasos; si alguien se traba, abren el `<details>`.
>
> **Bitácora (📓):** cada sección cierra con un `commit` + `push`; el mensaje del commit es la **reflexión del asistente con sus palabras** (la pregunta está en el bloque "📓 Registra tu avance" de cada sección). Pídeles que lo hagan al cerrar cada sección — su GitHub queda como diario de lo aprendido.

**Prerequisitos del asistente:** .NET 10 SDK · Docker Desktop (para Postgres/RabbitMQ) · Git + cuenta de GitHub · saber C# básico.

**Proyecto:** una sola consola de C# que va creciendo — el dominio es la `Empresa` (cliente de la plataforma).

---

## 1 · El diario de una empresa  ·  📄 [el-diario-de-una-empresa.md](secciones/el-diario-de-una-empresa.md)
**🧑‍🏫 Presentas:** la **foto** (estado actual, una fila que el `UPDATE` sobrescribe y borra el pasado) vs el **diario** (la secuencia de hechos). Eso es **Event Sourcing**; cada renglón del diario es un **evento**. (Sin código todavía.)
**💬 Dirige la discusión:**
1. ¿Qué información **destruye** un `UPDATE` que el diario conservaría?
2. Con el diario, ¿cómo sabrías el estado de la empresa **el mes pasado**?
3. Di una pregunta del negocio que la **foto** no puede responder y el **diario** sí.
**✅ Deben poder responder:** el estado de hoy se **reconstruye** leyendo el diario; el pasado ya no se pierde.
**📓 Setup:** que creen el repo (`git init` + primer commit + enlazar a GitHub) — está en el bloque 📓 de la sección.

---

## 2 · Los primeros hechos  ·  📄 [los-primeros-hechos.md](secciones/los-primeros-hechos.md)
**🧑‍🏫 Presentas:** el `record` (inmutable, se compara por contenido); el **Stream** (la historia); el **Replay**; la función **`evolve`**; el **Aggregate Root**.
**🛠️ Pides que hagan:**
1. Escribe los hechos como `record`: `EmpresaRegistrada(Nombre, Plan)`, `PlanCambiado(Plan)`, `EmpresaSuspendida(Motivo)`, `EmpresaReactivada()`.
2. Mételos, **en orden**, en una `List<object>` (la historia).
3. Declara 4 variables sueltas: `nombre`, `plan`, `suspendida`, `reactivaciones`.
4. Recorre la lista con un `foreach`; según el **tipo** de cada hecho (`if (hecho is EmpresaRegistrada r)…`), actualiza la variable que toque.
5. Imprime el estado final.
6. **(2º reto)** Crea la clase `Empresa`: las 4 variables como **propiedades** `{ get; private set; }`, y mueve el `foreach` al **constructor** que recibe `IEnumerable<object> historia`. Arriba, reemplaza las variables por `var empresa = new Empresa(historia);`.
**✅ Deben ver:** el estado reconstruido correcto (p. ej. `Constructora Andes`, plan `Premium`, suspendida según la historia).

---

## 3 · Refactorizando el motor  ·  📄 [refactorizando-el-motor.md](secciones/refactorizando-el-motor.md)
**🧑‍🏫 Presentas:** separación de responsabilidades; reutilización por **herencia** (clase abstracta con código compartido); **pattern matching**.
**🛠️ Pides que hagan:**
1. **Separa el recorrer del aplicar:** saca la lógica de los 4 `if` a un método `Aplicar(object hecho)`; deja el constructor con **solo** el `foreach` llamando a `Aplicar`.
2. Crea la clase base **`AggregateRoot`** con `Load(IEnumerable<object>)` (el `foreach`) y un `protected abstract void Aplicar(object)`; haz que `Empresa` **herede** y conserve solo su `Aplicar`.
3. Convierte los 4 `if (hecho is …)` de `Aplicar` en un **`switch`** por tipo (`case X e: … break;`).
**✅ Deben ver:** mismo resultado de antes, pero ahora con un **motor de replay reutilizable**.

---

## 4 · El flujo de vida (EventStream)  ·  📄 [el-flujo-de-vida.md](secciones/el-flujo-de-vida.md)
**🧑‍🏫 Presentas:** el patrón **Repositorio**; el **Event Stream** (la historia de UNA empresa); **genéricos** (el `De Empresa` se vuelve `<Empresa>`, el tipo como "parámetro").
**🛠️ Pides que hagan:**
1. Crea `EventStreamDeEmpresa` **dueña de su propia `List<object>`** (nace vacía), con `Append(object hecho)` (anota) y `Get()` (crea una `Empresa` vacía y la rehidrata con `Load`). Añade a `Empresa` un **constructor sin parámetros** y quita el que recibía la historia.
2. **Generalízala** a `EventStream<T> where T : AggregateRoot, new()`; **borra** `EventStreamDeEmpresa`.
3. Demo: crea el stream, `Append` dos hechos, `Get`, imprime.
**✅ Deben ver:** `Constructora Andes: plan Premium`. Y que **ellos** ponen los hechos a mano (lo dará la empresa en la §5).

---

## 5 · Decidir el futuro (emitir eventos)  ·  📄 [decidir-el-futuro.md](secciones/decidir-el-futuro.md)
**🧑‍🏫 Presentas:** la función **`decide`** (gemela de `evolve`); **decidir ≠ aplicar**; **validación** (rechazar lo inválido) vs **idempotencia** (ignorar lo redundante).
**🛠️ Pides que hagan:**
1. Añade a `Empresa` tres métodos que **devuelvan** el hecho, **sin tocar propiedades**: `CambiarPlan(plan)→PlanCambiado`, `Suspender(motivo)→EmpresaSuspendida`, `Reactivar()→EmpresaReactivada`.
2. **🔁 Modifica** dos: `CambiarPlan` **lanza** `ReglaDeNegocioException` si está suspendida (validación); `Suspender` **devuelve `null`** si ya está suspendida (idempotencia → retorno `EmpresaSuspendida?`).
3. Demo sobre **un** stream: `Append` la historia previa → `Get` → `CambiarPlan` → `Append` → `Get` de nuevo para verificar.
**✅ Deben ver:** el plan cambió al recargar; suspender dos veces da `null`; cambiar el plan de una suspendida **lanza**.

---

## 6 · El Command Handler  ·  📄 [el-command-handler.md](secciones/el-command-handler.md)
**🧑‍🏫 Presentas:** el **Command Handler** (el "secretario" que orquesta cargar→decidir→guardar); **responsabilidad única** (una clase por comando); el **constructor primario** de C# (idioma nuevo: `class X(deps)`); la **versión del evento** (el sobre). *(Ojo: aquí NO nace el record ni la interfaz — eso llega en §6b, cuando hagan falta.)*
**🛠️ Pides que hagan:**
1. **(Primer intento)** Crea `EmpresaCommandHandlers(EventStream<Empresa> stream)` con un método por operación **de parámetros sueltos** (`CambiarPlan(string)`, `Suspender(string)`) que **carga** (`Get`) → pide **decidir** → **guarda** (`Append`); respeta el `null` de `Suspender`.
2. **🔁 Rompe el súper-secretario** en una clase **por comando** (`CambiarPlanHandler`, `SuspenderHandler`), cada una con un `Handle(...)` de **parámetros sueltos** (aún **sin record ni interfaz**).
3. **(Versión del evento)** Define el sobre `EventoAlmacenado(int Version, DateTime Timestamp, object EventData)`; **🔁 modifica** `EventStream<T>` para guardar **sobres**, llevar un `_version` que **sube con cada `Append`**, y **desenvolver** el sobre al leer.
**✅ Deben ver:** un handler **por comando** suspende la empresa; cada hecho queda **numerado** (1, 2, 3…). Y la pregunta abierta: para ejecutar uno **eliges la clase a mano** — eso pedirá un despachador (§6b).

---

## 6b · El despachador  ·  📄 [el-despachador.md](secciones/el-despachador.md)
**🧑‍🏫 Presentas:** un **despachador** (mediador) que, dado un comando *cualquiera*, encuentra y llama a su handler **por el tipo** — sin `switch` ni nombres. Y las **dos piezas que eso exige** (aquí nacen, no antes): el **Comando** (un `record` por intención, para rutear por tipo) y el **contrato `ICommandHandler<T>`** (molde común). El `Despachador` es un **andamio** — lo industrializará Wolverine (§17).
**🛠️ Pides que hagan:**
1. **💥 El dolor:** con `new SuspenderHandler(...).Handle("…")` eres **tú** quien elige la clase; un `switch` por tipo crece con cada comando (justo lo que el contrato prometía evitar).
2. **(Pieza 1 — el Comando)** Crea un `record` por comando (`CambiarPlanDeEmpresa(NuevoPlan)`, `SuspenderEmpresa(Motivo)`) y **🔁** cambia cada handler de `Handle(string)` a `Handle(suComando)`. *(Motivo real: rutear por tipo necesita que cada comando sea su PROPIO tipo — con `string` todos colisionan.)*
3. **(Pieza 2 — el contrato)** Declara `ICommandHandler<TCommand>` con `Handle(TCommand)`; cada handler lo **implementa**.
4. **(El despachador)** Construye `Despachador` con `Dictionary<Type, Action<object>>`: `Registrar<T>(ICommandHandler<T>)` (guarda una lambda que castea) y `Enviar(object)` (busca por `comando.GetType()`). Demo: registra los handlers y `Enviar` un comando que llega como `object`.
**✅ Deben ver:** un `object` ruteado a su handler **por tipo**, sin `switch`. Y **por qué** hacían falta el record (la llave es `GetType()`) y la interfaz (`Registrar<T>` no se escribe sin el contrato — sin él, reflexión/`dynamic`). Diles que **dejen el `Despachador` de lado** después: es andamio; Wolverine lo hace en §17.

---

## 7 · El almacén: un cajón por empresa  ·  📄 [el-almacen-por-id.md](secciones/el-almacen-por-id.md)
**🧑‍🏫 Presentas:** el **dolor de empresa2** — los handlers atados a un stream **colisionan por tipo** en el despachador → hace falta un **almacén central por id**.
**🛠️ Pides que hagan:**
1. **🔁** `AggregateRoot` gana `Id` (`{ get; set; }` — es el rótulo, se estampa desde fuera).
2. Crea `EventStore` con `Dictionary<string, List<object>>`; métodos `GetEvents(id)` y `AppendEvent(id, hecho)` (el **id es parámetro**).
3. Añade `AbrirStream<T>(id)` (dentro del store, `this` = el almacén, se lo pasa al stream); **🔁 reescribe** `EventStream` para **delegar** (guarda `_store` + `_aggregateId`).
4. **🔁** El comando gana `EmpresaId`; el handler recibe el **almacén** y abre el stream por `cmd.EmpresaId` → se registran **una vez**, para todas.
**✅ Deben ver:** dos empresas (`emp-7`, `emp-9`) en el mismo almacén, con handlers registrados una sola vez.

---

## 7b · Cuando dos escriben a la vez (concurrencia optimista)  ·  📄 [concurrencia-optimista.md](secciones/concurrencia-optimista.md)
**🧑‍🏫 Presentas:** el peligro de **dos escritores a la vez** sobre la misma empresa (actualización perdida, en silencio); la **concurrencia optimista** (no bloquear; verificar la versión al guardar).
**🛠️ Pides que hagan:**
1. El **sobre `EventoAlmacenado(Version, …)`** — numerar cada hecho con su posición.
2. **🔁** El `EventStore` guarda **sobres**; `AppendEvent` **valida la versión** → lanza `ConcurrencyException` si la posición ya está ocupada.
3. **🔁** El `EventStream` numera al escribir y **desenvuelve** (`.Select`) al leer.
**✅ Deben ver:** con un escritor, versiones 1,2,3…; con **dos** streams de la misma empresa (ambos `Get`, ambos `Append`), el segundo lanza `ConcurrencyException`.

---

## 8 · El tiempo de espera (async/await)  ·  📄 [el-tiempo-de-espera.md](secciones/el-tiempo-de-espera.md)
**🧑‍🏫 Presentas:** **CPU vs I/O**; por qué bloquear no escala (agotas hilos); `await` **libera el hilo** (no es "otro hilo" ni "más rápido"); "async hasta arriba"; nunca `.Result`/`.Wait()`.
**🛠️ Pides que hagan:**
1. Propaga `async`/`await` por toda la cascada: almacén (`GetEventsAsync`/`AppendEventAsync`), stream (`GetAsync`/`AppendAsync`), handlers (`HandleAsync`). Devuelven `Task`/`Task<T>`; el almacén en RAM usa `Task.FromResult`/`Task.CompletedTask`.
2. Propaga un `CancellationToken ct = default` por toda la cadena.
**✅ Deben ver:** `dotnet run` sigue dando lo mismo, ahora con `await` de punta a punta.

---

## 9 · De `new` al contenedor (Inyección de Dependencias)  ·  📄 [inyeccion-de-dependencias.md](secciones/inyeccion-de-dependencias.md)
**🧑‍🏫 Presentas:** los 4 conceptos que se confunden — **DIP / IoC / DI / contenedor**.
**🛠️ Pides que hagan:**
1. **(Para desmitificar)** Un **mini-contenedor** a mano de ~20 líneas: un diccionario `tipo → implementación` + **reflexión** + **recursión** para resolver dependencias.
2. Reemplázalo por el `ServiceCollection` real: registra el almacén y los handlers, y resuélvelos desde el contenedor.
**✅ Deben ver:** el sistema se **ensambla solo**, sin `new` regado por el `Program.cs`.

---

## 10 · Persistencia real (Docker y PostgreSQL)  ·  📄 [docker-postgres.md](secciones/docker-postgres.md)
**🧑‍🏫 Presentas:** un evento no cabe en una tabla rígida → es un **documento JSONB**; **PostgreSQL + JSONB** (ACID + consultable); el **"muro"** (recuperar un `object` como su tipo exacto: serialización polimórfica).
**🛠️ Pides que hagan:**
1. Crea `docker-compose.yml` con `postgres:17-alpine` (usuario, contraseña, db, puerto `5432`).
2. `docker compose up -d`; `docker ps` (debe verse `Up`); conéctate con `psql` (sin tablas todavía).
**💬 Discusión:** ¿cuál es el **muro** que hace que escribir el store de Postgres a mano no valga la pena?
**✅ Deben ver:** el contenedor `Up`, la base encendida y vacía — listos para **adoptar** una herramienta.

---

## 11 · El momento de adoptar una herramienta  ·  📄 [por-que-adoptar-herramientas.md](secciones/por-que-adoptar-herramientas.md)
**🧑‍🏫 Presentas:** recap del motor; **Marten** (event store sobre Postgres) y **Wolverine** (mediador + mensajería) = **Critter Stack**; la regla **anti-cargo-cult** (4 condiciones); el plan de 2 tiempos (afinar §12–15 → revelar §16+). **Sin código.**
**💬 Dirige la discusión:**
1. Anota **3** cosas de tu motor que te darían **miedo mantener** en producción.
2. Empareja pieza → herramienta: `InMemoryEventStore` · `CommandHandler` + save manual · el bus de eventos · multi-tenancy/proyecciones.
3. ¿Por qué adoptar aquí **no** es cargo-cult? (las 4 condiciones)
**✅ Deben poder responder:** qué reemplaza Marten y qué reemplaza Wolverine, y por qué adoptan **con criterio**.

---

## 12 · El agregado que acumula  ·  📄 [el-agregado-acumula.md](secciones/el-agregado-acumula.md)
**🧑‍🏫 Presentas:** **acumular** (`Raise`) en vez de **devolver** — para que un comando emita varios hechos y la idempotencia no se filtre al handler.
**🛠️ Pides que hagan:**
1. En `AggregateRoot`: añade `_uncommittedEvents` (lista privada), `protected void Raise(object)` (encola), `UncommittedEvents` (solo lectura) y `ClearUncommittedEvents()`.
2. Los 3 métodos de `Empresa` pasan a **`void` + `Raise`** (validación lanza; idempotencia hace `return` sin encolar; `Reactivar` solo levanta).
3. **🔁 Reemplaza el cuerpo** de los 2 handlers: tras decidir, recorre `empresa.UncommittedEvents` archivando cada uno y luego `ClearUncommittedEvents()`. **Borra** el `var hecho = …` y el `if (hecho is not null)`.
**✅ Deben ver:** suspender **dos veces** = **3** hechos (no 4); y que el `if` de idempotencia **desapareció** del handler.

---

## 13 · Aplicar al levantar  ·  📄 [aplicar-al-levantar.md](secciones/aplicar-al-levantar.md)
**🧑‍🏫 Presentas:** el agregado refleja la decisión **al instante**; los `Apply(T)` **públicos** son el gancho que la herramienta llama al rehidratar (no un `switch` con `dynamic`).
**🛠️ Pides que hagan:**
1. **🔁** En `AggregateRoot`, `Raise` ahora **también aplica**: `{ _uncommittedEvents.Add(h); Aplicar(h); }`.
2. **🔁** En `Empresa`, parte el `switch Aplicar`: cada `case` queda en **una línea** enrutando a un método `Apply(TEvento)` **público**; **mueve** la mutación de estado a esos `Apply`. (Cuida: ligar la variable en cada `case`; borra mutaciones que queden sueltas en el `switch`.)
**✅ Deben ver:** el estado refleja la decisión sin recargar; `Load` reproduce llamando a los `Apply`.

---

## 14 · La versión es del agregado  ·  📄 [la-version-del-agregado.md](secciones/la-version-del-agregado.md)
**🧑‍🏫 Presentas:** la **versión** vive en el agregado (no en el stream); es la base de la concurrencia optimista y **sobrevive** al almacén directo.
**🛠️ Pides que hagan:**
1. En `AggregateRoot`: `Version { get; protected set; }`; **`Load`** la sube **uno por hecho aplicado**; **`Raise` NO la toca**.
2. `EventStream.GetAsync` **lee** `entidad.Version` en vez de recalcularla.
**✅ Deben ver:** "cargada en versión 3"; tras decidir sin guardar sigue en **3** (1 sin confirmar); `emp.Version = 5` **no compila**.

---

## 15 · El almacén directo (y la Unit of Work)  ·  📄 [el-almacen-directo.md](secciones/el-almacen-directo.md)
**🧑‍🏫 Presentas:** la **Unit of Work** (recuerda qué tocaste y persiste todo de un golpe); jubilar el `EventStream`-ventana; **un solo `SaveChangesAsync`**. Y el matiz **poder ≠ deber**: `SaveChanges` *puede* persistir varios agregados, pero la regla de diseño es **1 transacción = 1 agregado** (Evans/Vernon, regla de pulgar); cruzarla pide **consistencia eventual** (criterio de Vernon: ¿es trabajo del usuario de este caso de uso, o de otro?).
**🛠️ Pides que hagan:**
1. Añade a `Empresa` un estático `Registrar(id, nombre, plan)` (crea, pone `Id`, `Raise(EmpresaRegistrada)`); y un `RegistrarEmpresaHandler` (`Empresa.Registrar` → `store.StartStream` → `SaveChangesAsync`).
2. **🔁 Reemplaza** `InMemoryEventStore` por la versión **directa** con UoW (`StartStream`, `GetAggregateRootAsync` que **rastrea**, `AppendEvent`, `SaveChangesAsync` que **drena**, `ExistsAsync`); **borra** `EventStream<T>` y `AbrirStream`.
3. **🔁 Reemplaza** los handlers: cargan con `GetAggregateRootAsync` (`null` → lanza), deciden y llaman `SaveChangesAsync`; **borra** el `foreach`/`ClearUncommittedEvents`.
**✅ Deben ver:** todo corre **sin** el `EventStream`; un solo `SaveChangesAsync` persiste lo tocado. (El motor ya tiene la **forma de producción**.)

---

## 16 · El gran reveal: Marten  ·  📄 [revelar-marten.md](secciones/revelar-marten.md)
**🧑‍🏫 Presentas:** **Marten** convierte Postgres en tu event store; el reveal es **1:1** (renombrar/intercambiar, no rediseñar).
**🛠️ Pides que hagan:**
1. **Extrae** la interfaz `IEventStore` (`StartStream`, `GetAggregateRootAsync<T>`, `AppendEvent`, `SaveChangesAsync`, `ExistsAsync<T>`); `InMemoryEventStore : IEventStore`; los handlers reciben **`IEventStore`**.
2. Instala `Marten`; escribe `MartenEventStore : IEventStore` mapeando cada método a Marten (`AggregateStreamAsync` cargar, `Events.StartStream`/`Append` escribir, `session.SaveChangesAsync`, `FetchStreamStateAsync` para existir). Estampa el `Id` al cargar.
3. Configura `AddMarten` (Connection, `StreamIdentity.AsString`, `EventNamingStyle.SmarterTypeName`); **cambia el registro** de DI a `MartenEventStore`.
**✅ Deben ver:** los **mismos handlers** corriendo contra **Postgres real**; los `Apply(T)` rehidratan; los hechos quedan en `mt_events`.

---

## 17 · El gran reveal (2): Wolverine  ·  📄 [revelar-wolverine.md](secciones/revelar-wolverine.md)
**🧑‍🏫 Presentas:** Wolverine **descubre** los handlers por convención y hace el **commit automático** (un middleware + la política `AutoApplyTransactions`).
**🛠️ Pides que hagan:**
1. Instala **`WolverineFx.Marten`** y **`WolverineFx.RuntimeCompilation`** (sin este último, `UseRuntimeCompilation()` ni compila ni arranca).
2. **🔁 Ajusta** los handlers: que solo **carguen y decidan**, y **borra** el `await store.SaveChangesAsync`.
3. Añade `MartenUnitOfWork` (`AggregateRoots`, `AppendEvents`) y el `UnitOfWorkMiddleware` (`After` appendea los modificados, `Finally` limpia — **no comitea**).
4. Cablea `UseWolverine`: `Discovery.IncludeAssembly`, `UseRuntimeCompilation()`, `AddMarten(...).IntegrateWithWolverine()`, `Policies.AddMiddleware<UnitOfWorkMiddleware>()`, `Policies.AutoApplyTransactions()`; y `AddScoped<IEventStore, MartenEventStore>`.
**✅ Deben ver:** se invoca el comando por el bus; el middleware appendea y `AutoApplyTransactions` comitea — **handlers sin `SaveChanges`**.

---

## 18 · Levanta la última magia: reflexión vs codegen  ·  📄 [reflexion-vs-codegen.md](secciones/reflexion-vs-codegen.md)
**🧑‍🏫 Presentas:** la reflexión (tu §9: lenta por llamada, falla tarde) vs el **codegen** (Wolverine/Marten **generan código** en el arranque, legible y auditable). **Sin código nuevo.**
**💬 Dirige la discusión:**
1. ¿Por qué generar código en el arranque y no reflexionar en cada comando?
2. ¿Dónde **sí** encaja la reflexión? (en los tests, el `TestStore` de §29)
**✅ Deben poder responder:** que "la magia" es código generado que pueden **leer**, no una caja negra.

---

## 19 · Las dos vertientes de persistencia  ·  📄 [dos-vertientes.md](secciones/dos-vertientes.md)
**🧑‍🏫 Presentas:** la **nativa** (`FetchForWriting`/`[Aggregate]`: 1 llamada, **concurrencia gratis**) vs la **capa del equipo** (`IEventStore`+`AggregateStreamAsync`+UoW: testeable sin BD, separación público/privado, control). **Sin código.**
**💬 Dirige la discusión:**
1. ¿Por qué el equipo eligió su capa? (3 razones: tests sin BD, público/privado, portabilidad/control)
2. ¿Qué cuesta? (3: más código, concurrencia tuya, divergencia de la doc)
3. Un caso para **mantener** la capa y uno para **migrar** a lo nativo.
**✅ Deben poder responder:** traducir "esto que el creador hace con `FetchForWriting`, aquí es `AggregateStreamAsync`+`Append`".

---

## 20 · Dos tipos de hecho: público vs privado  ·  📄 [publico-vs-privado.md](secciones/publico-vs-privado.md)
**🧑‍🏫 Presentas:** hechos de **integración** (públicos, otros servicios los oyen) vs **internos** (privados); el **destino lo decide la ruta**, no solo el tipo.
**🛠️ Pides que hagan:**
1. Crea tres interfaces marcadoras **vacías**: `IEvent`, `IPublicEvent : IEvent`, `IPrivateEvent : IEvent`.
2. Marca como **públicos** los hechos que otros oirían (p. ej. `EmpresaSuspendida`, `EmpresaReactivada`) con `IPublicEvent`.
3. En `AggregateRoot`, añade `GetPublicEvents()`/`GetPrivateEvents()` que **filtran** los no-confirmados por tipo (`OfType`).
**✅ Deben ver:** se puede separar **qué** eventos salen al mundo.

---

## 21 · Senders y el sobre  ·  📄 [senders-y-sobre.md](secciones/senders-y-sobre.md)
**🧑‍🏫 Presentas:** un **sender** publica los hechos públicos; el **sobre** lleva el contexto (TenantId, UserId, GroupId) — lo que en la herramienta es `DeliveryOptions`.
**🛠️ Pides que hagan:**
1. Define `IPublicEventSender` e `IPrivateEventSender` (`PublishAsync(params …Event[])` + sobrecarga con `groupId`); y un `TestPublicEventSender` **en memoria** que solo **acumula** lo enviado (será el doble de test de §30).
2. Modela un `Sobre` que envuelva el evento: `Payload`, `TenantId`, `UserId`, `GroupId` opcional.
**✅ Deben ver:** el sender en memoria acumula lo publicado; el sobre transporta el contexto.

---

## 22 · El proceso que se cae: Outbox e Inbox  ·  📄 [outbox-inbox.md](secciones/outbox-inbox.md)
**🧑‍🏫 Presentas:** la **doble escritura** (BD + broker) no es atómica → el **outbox transaccional** (guarda hecho y mensaje juntos) y el **inbox** (dedupe del consumidor).
**🛠️ Pides que hagan:**
1. Un almacén que, al guardar un hecho, **encole su mensaje** en una outbox (misma transacción).
2. Un **relay** que **drene** la outbox publicando al bus y la vacíe.
3. Un **inbox**: un conjunto de ids ya procesados, para **no procesar dos veces** el mismo mensaje.
**✅ Deben ver:** el evento se guarda **y** se anuncia sin perderse; el consumidor no duplica.

---

## 23 · Transportes reales: RabbitMQ y Azure Service Bus  ·  📄 [transportes-rabbitmq-asb.md](secciones/transportes-rabbitmq-asb.md)
**🧑‍🏫 Presentas:** el **broker** real (RabbitMQ dockerizado / Azure Service Bus en nube); **un exchange por servicio**; `AutoProvision`; la **regla de oro** (todo público con ruta, o muere en una cola local).
**🛠️ Pides que hagan:**
1. **Levanta RabbitMQ:** añade el servicio `rabbitmq:4-management` a tu `docker-compose.yml` (puertos `5672` y `15672`); `docker compose up -d`. (Panel en `http://localhost:15672`, guest/guest.)
2. En `appsettings.json`, pon `ConnectionStrings:rabbitmq = amqp://guest:guest@localhost:5672`.
3. En `UseWolverine`: `UseRabbitMqUsingNamedConnection("rabbitmq").AutoProvision()`; publica cada `IPublicEvent` a su exchange (`ToRabbitExchange` + `UseDurableOutbox`); suscríbete con `ListenToRabbitQueue` + `BindExchange` + `UseDurableInbox`.
**✅ Deben ver:** en el panel `:15672` aparecen el **exchange** y la **cola**, y un evento público **da la vuelta** y se consume.

---

## 23b · Diseñar con eventos  ·  📄 [disenar-con-eventos.md](secciones/disenar-con-eventos.md)
**🧑‍🏫 Presentas:** las decisiones que el broker **no** toma por ti, sobre un caso real (`RegistroObligacionCreado → TerceroCreado/TerceroRechazado`). Marcos: **evento vs comando** (si esperas respuesta es un comando → gRPC, no un evento disfrazado = acoplamiento temporal); **tres patrones que se llaman "evento"** (ES=persistencia · domain-events-in-process=notificación · EDA=comunicación) y que el **mismo evento cambia de rol** (estado→mensaje); los **4 significados de Fowler** (Notification · ECST · ES · CQRS); el patrón **in-process de Bogard** (registrar→despachar al commit, no cola inmediata); **1-tx-1-agregado** + criterio de **Vernon**; la **dependencia circular** (smell ≠ antipatrón). **Sin código (diseño/criterio).**
**💬 Dirige la discusión:**
1. Para `TerceroCreado`/`TerceroRechazado`: ¿un topic por evento o uno **por servicio**? (por servicio + ruteo por tipo).
2. ¿El emisor **espera** la respuesta para seguir? → es un **comando** (gRPC), no un evento. ¿Un handler que **valida y puede rechazar** reaccionando a un evento? → **comando disfrazado** (Regla 4).
3. Reciten **las 4 reglas** del destino de un hecho (ES→store · misma decisión→explícito/diferido-a-commit · cross-cutting→EDA real · un handler de evento nunca corre lógica rechazable).
4. ¿Por qué un broker es **overkill** para un efecto intra-proceso? (Bogard: despacha al commit, mismo scope).
**✅ Deben poder responder:** ante un hecho, decidir si va al **store**, a un **domain-event in-process**, o a **EDA real** — y reconocer la postura de la plantilla (*un mecanismo por caso*). *(Lo profundo —sagas, orquestación entre servicios— es el taller ⑤ Microservicios.)*

---

## 23c · Serverless: Azure Functions *(opcional — solo si despliegas en Functions)*  ·  📄 [serverless-azure-functions.md](secciones/serverless-azure-functions.md)
**🧑‍🏫 Presentas:** una Function **se apaga entre invocaciones** → el outbox durable no tiene quién lo drene; en `dotnet-isolated` el auto-discovery de Wolverine falla. Los **gemelos serverless**: `AddWolverine(ManualOnly)`, `DurabilityMode.Solo`, `SendInline()`.
**💬 Dirige la discusión:**
1. En una función que se apaga apenas responde, ¿quién corre el proceso de fondo del outbox?
2. ¿Qué se usa en su lugar, y qué se **pierde** (la red de seguridad del relay)?
**✅ Deben poder responder:** el dominio **no cambia**; solo el hospedaje y el envío.

---

## 24 · El lado de lectura: CQRS y proyecciones  ·  📄 [cqrs-proyecciones.md](secciones/cqrs-proyecciones.md)
**🧑‍🏫 Presentas:** el estado es **una** vista de los eventos; **CQRS** (separar escritura de lectura); una **proyección** es un read model.
**🛠️ Pides que hagan:**
1. Define una proyección `EmpresaResumen` con `SingleStreamProjection<EmpresaResumen, string>` que aplique los eventos a una vista de lectura.
2. Regístrala en `AddMarten` (modo `Inline` o `Async`).
3. **Consulta** el read model directamente (en vez de rehidratar el stream entero).
**✅ Deben ver:** una vista de lectura derivada de **los mismos** eventos, lista para consultar.

---

## 25 · Versionado y upcasting de eventos  ·  📄 [versionado-upcasting.md](secciones/versionado-upcasting.md)
**🧑‍🏫 Presentas:** el día que un evento cambie de forma, hay que **leer los viejos sin romperse** (**upcasting**); `EventNamingStyle` fija el nombre del evento. **Sin código (conceptual).**
**💬 Dirige la discusión:**
1. Si dentro de un año `PlanCambiado` gana un campo, ¿cómo lees los eventos **ya guardados** sin el campo?
2. ¿Por qué importa fijar el **nombre** del tipo de evento?
**✅ Deben poder responder:** el upcasting traduce el evento viejo al nuevo al leer.

---

## 26 · ¿De quién son estos eventos? (Multi-tenancy)  ·  📄 [multitenancy-aislamiento.md](secciones/multitenancy-aislamiento.md)
**🧑‍🏫 Presentas:** cada empresa-cliente de la plataforma es un **tenant** aislado; la llave de un agregado pasa a ser **`(tenant, id)`**.
**🛠️ Pides que hagan:**
1. Cambia la llave de tu almacén de `id` a la **tupla `(tenantId, id)`**, y pasa el `tenantId` al guardar/cargar.
2. Comprueba: dos empresas con el **mismo id** en tenants distintos **no se pisan**. (Con Marten: `TenancyStyle.Conjoined` / multi-tenanted.)
**✅ Deben ver:** aislamiento por tenant en la misma base.

---

## 27 · ¿De dónde sale el tenant? Resuélvelo  ·  📄 [resolver-el-tenant.md](secciones/resolver-el-tenant.md)
**🧑‍🏫 Presentas:** el tenant se **resuelve** (de un header confiable), no se pide como parámetro al dominio.
**🛠️ Pides que hagan:**
1. Define `ITenantResolver` (con `TenantId` y `UserId`).
2. Una implementación **hardcoded** para empezar.
3. Una que lea de **headers HTTP confiables** (`X-Tenant-Id`, `X-User-Id`) y **lance** si faltan.
**✅ Deben ver:** el tenant llega resuelto, no manoseado por el dominio.

---

## 28 · El tenant viaja con el mensaje  ·  📄 [tenant-viaja-con-el-mensaje.md](secciones/tenant-viaja-con-el-mensaje.md)
**🧑‍🏫 Presentas:** cuando **no hay un HTTP request** (un daemon de fondo procesando mensajes), el tenant viaja **en el mensaje**; un **proxy** elige el resolver correcto.
**🛠️ Pides que hagan:**
1. Un segundo resolver que lea el tenant/usuario del **contexto del mensaje** de Wolverine.
2. Un **proxy** que, tras una sola `ITenantResolver`, **elija** el resolver según haya o no `HttpContext`.
**✅ Deben ver:** el tenant se resuelve igual desde HTTP y desde el daemon.

---

## 29 · Probar sin base de datos: el TestStore  ·  📄 [teststore.md](secciones/teststore.md)
**🧑‍🏫 Presentas:** probar la lógica **sin Postgres**; aquí la **reflexión** sí encaja (simple, sin generar nada).
**🛠️ Pides que hagan:**
1. Un `TestStore` (implementa `IEventStore`) con dos diccionarios: **eventos previos** (los que *siembras*) y **eventos nuevos** (los que el handler *produce*).
2. `GetAggregateRoot<T>(id)` que **rehidrate** reproduciendo la historia, aplicando cada hecho por **reflexión** (busca y **cachea** el método `Apply(TipoEvento)`).
3. `SaveChanges` que drena `UncommittedEvents` a "nuevos".
**✅ Deben ver:** un almacén de pruebas en memoria, determinista, sin base de datos.

---

## 30 · Given-When-Then: probar decisiones  ·  📄 [given-when-then.md](secciones/given-when-then.md)
**🧑‍🏫 Presentas:** el patrón **Given → When → Then**; `Then` compara **hechos**, no filas.
**🛠️ Pides que hagan:**
1. Una `CommandHandlerTestBase`: `Given(params)` (siembra historia), `Then(params)` (afirma los **hechos nuevos** con `BeEquivalentTo`), `And(proyección, esperado)` (afirma el **estado** rehidratado).
2. Una `CommandHandlerAsyncTest<TCommand>` con `WhenAsync(comando)` (ejecuta el handler y guarda).
3. Escribe un test `[Fact]` Given→When→Then y **ponlo en verde**.
**✅ Deben ver:** `Superado: 1` — la lógica de negocio probada **sin base de datos**.

---

## 31 · El idioma de la plantilla: extension members (C# 14)  ·  📄 [extension-members.md](secciones/extension-members.md)
**🧑‍🏫 Presentas:** las **extension members** de C# 14 (un bloque `extension(...)` donde los miembros comparten el receptor), el idioma con el que está escrita la plantilla.
**🛠️ Pides que hagan:**
1. Escribe un par de helpers async sobre `IQueryable<T>` (`ToListAsync`, `AnyAsync`) **primero** como métodos de extensión clásicos (con `this`).
2. **Refactóralos** a un bloque `extension<T>(IQueryable<T> fuente) where T : notnull { … }`. (Requiere `<LangVersion>14</LangVersion>` + .NET 10.)
**✅ Deben ver:** los miembros comparten el receptor; la API queda más limpia y legible.

---

## 32 · Empaquetar y publicar como NuGet  ·  📄 [nuget-empaquetado.md](secciones/nuget-empaquetado.md)
**🧑‍🏫 Presentas:** empaquetar la plantilla como **NuGet**; versionado **LOCKSTEP**; `Directory.Build.props` (config compartida). **Sobre todo conceptual/mostrar.**
**💬 Dirige la discusión / muestra:**
1. ¿Por qué `AssemblyVersion` va fija en `0.0.0.0` y la versión real en `FileVersion`?
2. ¿Qué es **LOCKSTEP** y por qué los paquetes de la familia se versionan juntos?
**✅ Deben poder responder:** cómo se versiona y publica la familia `Cosmos.*` (muestra `Directory.Build.props` y el workflow de release).

---

## 33 · Capstone: un bounded context de punta a punta  ·  📄 [capstone.md](secciones/capstone.md)
**🧑‍🏫 Presentas:** **el gran reveal** — lo que construyeron **es** `Cosmos.BuildingBlocks`, casi línea por línea.
**🛠️ Pides que hagan (o esbocen en grupo):**
1. Arma el servicio completo de la `Empresa` integrando **todo**: agregado (`Raise`/`Apply`/`Version`) → `IEventStore`/`MartenEventStore` → handlers descubiertos por Wolverine → eventos públicos con outbox a un broker → una **proyección** (CQRS) → multi-tenancy → tests Given-When-Then.
**💬 Cierre:** mapea cada pieza que construyeron a su equivalente en `Cosmos.BuildingBlocks`; respondan **las 7 preguntas**.
**✅ Deben poder responder:** las 7 preguntas sin titubear, y *a qué pieza de la plantilla corresponde cada cosa que hicieron*.

---

## 📋 Tabla de ritmo (para tu planeación)

| Bloque | Secciones | Tono |
|---|---|---|
| **Motor a mano** | 1–10 (+6b despachador) | construcción guiada, mucho teclado |
| **Bisagra** | 11 | discusión (sin código) |
| **Afinar a producción** | 12–15 | refactores guiados |
| **Revelar la Critter Stack** | 16–19 | "lo que escribiste, la librería lo hace" + 2 discusiones |
| **EDA (mensajería + diseño)** | 20–23 · 23b diseño *(23c serverless opc.)* | público/privado, outbox, broker real, **criterio de diseño EDA** |
| **CQRS · versionado · multi-tenancy** | 24–28 | lado de lectura + aislamiento |
| **Testing · idioma · NuGet** | 29–32 | probar sin BD, C#14, empaquetar |
| **Capstone** | 33 | ensamblar + el reveal final |

> Cierra **cada** sección con su commit de bitácora (📓) antes de pasar a la siguiente.
