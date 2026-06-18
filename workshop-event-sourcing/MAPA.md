# 🗺️ Mapa del taller — qué construyes en cada sección (y qué aprendes)

Este taller es **hands-on**: en cada sección **te reto a escribir el código tú mismo** (te describo qué construir, lo intentas, y luego revelo una forma de hacerlo en un bloque `<details>`). Lo que es idioma nuevo de C# —demasiado para inventarlo de cero— **se te muestra** directamente.

Este mapa, para cada sección, te dice:
- **🛠️ Construyes (retos):** lo que se te pide *intentar* escribir.
- **💡 Qué aprendes:** el concepto que *fabricas* al hacerlo.
- **👁️ Se te muestra:** lo que se te da hecho — y *por qué* (idioma nuevo o dato).
- **Tu calificación:** márcala al hacer la sección (`✅ entendí` / `🟡 me costó` / `🔴 no entendí` + nota).

**Estado: TALLER COMPLETO — §01–§33 + §23b (34 secciones).** Bloques A convergencia · B revelar Critter Stack · C EDA · D CQRS · E multi-tenancy · F testing/idioma/NuGet · G capstone. Verificado contra paquetes/herramientas reales: §16 Marten 9.9, §17 WolverineFx.Marten 6.12, §23 WolverineFx.RabbitMQ/.AzureServiceBus 6.12, §24 proyección Marten 9, §30 xUnit+AwesomeAssertions (test verde), §31 extension members C#14. Bloques B/C/D/E validados con 3 agentes (✅, fixes aplicados); §15 y Bloque F en validación final + revisión de arco completo. 0 errores de estructura. (§23b = serverless/Azure Functions, escrita fuera de orden a pedido; **pendiente re-validar el 1:1 de nombres cuando se escriban §16/§17/§22/§23**). §01–§10 verificadas por build-along; §11 (bisagra conceptual) por los 3 revisores; §12 y §13 (convergencia 4b) por los **4 agentes**; §23b por coherencia ✅, técnico ✅ (fiel a la plantilla), principiante ✅ (build-along no aplica: requiere Azure real) (técnico: compila 0/0 con `-warnaserror`, salida exacta, afirmaciones verificadas con asserts; build-along: construible sin abrir `<details>`; coherencia ✅; principiante ✅). §14–§33 **planeadas al detalle** y **ancladas 1:1 a `Cosmos.BuildingBlocks`** (cada sección lleva una línea 🔗 con el tipo real al que converge, extraída leyendo la plantilla módulo por módulo). La numeración §11+ es **tentativa** (el METODO permite renumerar/partir).

---

## §01 · El diario de una empresa
- **🛠️ Construyes:** nada todavía (sección conceptual, sin código).
- **💡 Qué aprendes:** la diferencia entre guardar la **foto** (estado actual, el CRUD que borra el pasado) y el **diario** (la secuencia de hechos). Y el nombre: **Event Sourcing**.
- **👁️ Se te muestra:** la idea, con la `Empresa` que ya conoces. *(Por qué: es la intuición raíz; sin código aún.)*
- **Tu calificación:** [ ] _____

## §02 · Los primeros hechos
- **🛠️ Construyes (2 retos):**
  1. **El Replay** — recorrer la historia con un `foreach` y, según cada hecho, acumular el estado en variables.
  2. **La clase `Empresa`** — mover esas variables a propiedades y el `foreach` al constructor (tu ejemplo: "crea la clase, recibe la historia, corre el foreach adentro").
- **💡 Qué aprendes:** que el estado **no se guarda, se reconstruye** leyendo el diario (la función pura **`evolve`**); y que un objeto puede ser **dueño de su coherencia** (un **Aggregate Root**).
- **👁️ Se te muestra:** el `record` (idioma nuevo: inmutabilidad) y la lista `historia` (los datos de prueba). *(Por qué: el `record` es sintaxis nueva; la lista son datos dados para que todo coincida.)*
- **Tu calificación:** [ ] _____

## §03 · Refactorizando el motor
- **🛠️ Construyes (3 retos escalonados):**
  1. **Separar** "recorrer" de "aplicar" — sacar la lógica de cada hecho a un método `Aplicar`.
  2. **La clase base `AggregateRoot`** — subir el `foreach`/`Load` a una base abstracta y heredar.
  3. **El `switch`** — convertir los `if (hecho is …)` en pattern matching por tipo.
- **💡 Qué aprendes:** separación de responsabilidades; reutilización por **herencia** (clase abstracta con código compartido); **pattern matching**; cómo un motor crece sin volverse un `if` interminable.
- **👁️ Se te muestra:** la curiosidad de enrutar con `dynamic` (que **no** se adopta — pierde el chequeo de tipos). *(Por qué: es contraste, no la solución.)*
- **Tu calificación:** [ ] _____

## §04 · El flujo de vida (EventStream)
- **🛠️ Construyes (reto):** el envoltorio `EventStreamDeEmpresa` — recibe la lista de hechos, y en `Get()` crea una `Empresa` vacía y la rehidrata con `Load`.
- **💡 Qué aprendes:** el patrón **Repositorio** (esconder *cómo* se rehidrata; el consumidor solo pide `.Get()`); y qué es un **Event Stream** (la historia de UNA empresa).
- **👁️ Se te muestra:** el genérico `EventStream<T> where T : AggregateRoot, new()`. *(Por qué: genéricos con restricciones es sintaxis nueva; no se pide inventarla.)*
- **Tu calificación:** [ ] _____

## §05 · El almacén en memoria (Event Store)
- **🛠️ Construyes (reto):** el `InMemoryEventStore` — un `Dictionary` con un cajón por empresa (por id), con `GetEvents(id)` y `AppendEvent(id, hecho)`.
- **💡 Qué aprendes:** el patrón **Event Store** (almacén de eventos agrupados por id); que **el id es la llave**; y la **concurrencia optimista** (rechazar una escritura si la versión esperada ya está ocupada).
- **👁️ Se te muestra:** cómo el almacén te **entrega** el `EventStream` (`AbrirStream`, con el `this`); y el refactor de concurrencia (el sobre con `Version`), con un bloque **📦 "clase completa"** para que sepas cómo queda todo ensamblado. *(Por qué: la factory con back-reference y la concurrencia son sutiles.)*
- **Tu calificación:** [ ] _____

## §06 · Decidir el futuro (emitir eventos)
- **🛠️ Construyes (2 retos):**
  1. **Los métodos `decide`** — `CambiarPlan`/`Suspender`/`Reactivar` que **devuelven** el hecho **sin tocar** el estado.
  2. **Las reglas** — que `CambiarPlan` lance si está suspendida (**validación**) y `Suspender` devuelva `null` si ya lo está (**idempotencia**).
- **💡 Qué aprendes:** la función **`decide`** (gemela de `evolve`); que **decidir ≠ aplicar**; y la diferencia entre **rechazar lo inválido** (error) e **ignorar lo redundante** (no-op).
- **👁️ Se te muestra:** el patrón de prueba *Given-When-Then* (marcado "solo léelo por ahora"). *(Por qué: el proyecto de pruebas se monta en su propia sección.)*
- **Tu calificación:** [ ] _____

## §07 · El Command Handler
- **🛠️ Construyes (reto):** el handler que orquesta **cargar → actuar → guardar** para un comando (respetando el `null` de idempotencia).
- **💡 Qué aprendes:** sacar ese ciclo del `Program.cs` a una pieza con un solo trabajo (el **Command Handler**); y que la **intención** se empaqueta como un dato (un **Comando**).
- **👁️ Se te muestra:** el comando como `record`, y el contrato `ICommandHandler<T>` + un handler por comando. *(Por qué: la interfaz genérica/SRP es un patrón que conviene mostrar entero.)*
- **Tu calificación:** [ ] _____

## §08 · El tiempo de espera (async/await)
- **🛠️ Construyes:** (poco a mano) — se te guía a propagar `async` por la cascada (almacén → stream → handler).
- **💡 Qué aprendes:** **CPU vs I/O**; por qué **bloquear no escala** (agotas hilos); qué hace `await` (libera el hilo, no es "otro hilo"); "async hasta arriba" y propagar el `CancellationToken`.
- **👁️ Se te muestra:** todo async (idioma nuevo): `Task`/`async`/`await`, el almacén, el `EventStream` y los handlers, con bloques **📦 clase completa**. *(Por qué: async es conceptualmente nuevo; pedir inventarlo frustraría.)*
- **Tu calificación:** [ ] _____

## §09 · De `new` al contenedor (Inyección de Dependencias)
- **🛠️ Construyes:** (a mano, para desarmar la "magia") un **mini-contenedor** de ~20 líneas (diccionario + reflexión + recursión) — para *ver* que un contenedor no es magia.
- **💡 Qué aprendes:** los **4 conceptos** que se confunden (DIP / IoC / DI / contenedor); y por qué un contenedor real (`ServiceCollection`) hace lo mismo que tu juguete.
- **👁️ Se te muestra:** el `ServiceCollection` de .NET (idioma/herramienta nueva) y la instalación del paquete (`dotnet add package`). *(Por qué: la API real se usa, no se inventa.)*
- **Tu calificación:** [ ] _____

## §10 · Persistencia real (Docker y PostgreSQL)
- **🛠️ Construyes (setup, no código):** levantas un **Postgres en Docker** (`docker-compose.yml`, `docker compose up`, verificar con `psql`).
- **💡 Qué aprendes:** por qué un evento no cabe en una tabla rígida → **documento → JSONB**; y el **muro**: serializar y, sobre todo, **deserializar un `object` a su tipo** a mano es enorme → por eso se **adopta una herramienta**.
- **👁️ Se te muestra:** los comandos de Docker y el rationale de Postgres/JSONB. *(Por qué: es infraestructura; se ejecuta, no se inventa.)*
- **Tu calificación:** [ ] _____

---

## §11+ · Lo que viene (planeado al detalle)

> Cada sección, en el mismo formato que §01–§10, **más una línea 🔗 Ancla**: el tipo REAL de `Cosmos.BuildingBlocks` al que lo construido converge 1:1 (para que la "revelación" sea renombrar/intercambiar, no rediseñar — la regla de oro del METODO). Las divergencias con la doc oficial de Marten/Wolverine van marcadas como **⚖️**.

---

### 🅰️ Bloque A — Adopción y convergencia (cierra el motor a mano y lo lleva a la forma del canon)

> Esta es la **convergencia 4b** (obligatoria antes de revelar): el motor de §02–§09 se refactoriza, paso a paso, hasta tener la forma exacta de la plantilla. Varias secciones **reescriben** código ya hecho.

## §11 · La bisagra de adopción
- **🛠️ Construyes:** nada (sección conceptual; decidir adoptar con criterio).
- **💡 Qué aprendes:** recap de todo el motor a mano (tabla "lo que ya construiste" + tabla "lo que costaría mantenerlo"); qué es **Marten**, qué es **Wolverine**, qué reemplaza **de lo tuyo** y **cómo**; el principio **anti-cargo-cult** (adoptas porque sentiste la necesidad, sabes qué hace y puedes depurarlo).
- **👁️ Se te muestra:** el mapa "tu pieza → su equivalente"; ningún código nuevo aún.
- **🔗 Ancla:** prepara el swap; no introduce tipos todavía.
- **Tu calificación:** [ ] _____

## §12 · El agregado que acumula (de `decide`-devuelve a `Raise`-acumula)
- **🛠️ Construyes (reto):** que `Empresa` deje de **devolver** el hecho desde `decide` (§06) y en su lugar lo **levante**: una lista de no-confirmados + un `Raise(hecho)` que lo encola. Los métodos de negocio llaman a `Raise`.
- **💡 Qué aprendes:** el modelo de producción — el agregado es **dueño de sus eventos pendientes** (uncommitted), no una función que retorna. *(Reescribe §06.)*
- **👁️ Se te muestra:** por qué la lista es `List<object>` (no `List<IEvent>` — admite records que no marcan nada), y la exposición `UncommittedEvents` (solo-lectura) + `ClearUncommittedEvents()`.
- **🔗 Ancla:** converge 1:1 a `AggregateRoot._uncommittedEvents` / `UncommittedEvents` / `ClearUncommittedEvents` (`Cosmos.EventSourcing.Abstractions`).
- **Tu calificación:** [ ] _____

## §13 · Aplicar al levantar (`Raise` también aplica + `Apply` por tipo)
- **🛠️ Construyes (reto):** que `Raise`, además de encolar, **aplique** el hecho llamando al dispatcher (`Aplicar`), para que el estado refleje la decisión **al instante**; y **partir** el `switch Aplicar(object)` para que cada `case` solo **enrute** a un método **`Apply(TEvento)` público** (donde vive la mutación). Cierra la semilla de §12.
- **💡 Qué aprendes:** la **doble naturaleza** de `Apply` — (a) avanza el estado al ejecutar un comando y (b) reconstruye el estado al reproducir el stream; la asimetría *rehidratar (`Load`→`Aplicar`) no encola / decidir (`Raise`) encola y aplica*; por qué los `Apply(T)` son **públicos** (la herramienta los llama por convención al rehidratar).
- **👁️ Se te muestra:** el despacho por **`switch` tipado** que enruta a los `Apply(T)` (NO reflexión, NO `dynamic` — cashea la "otra forma" de §03).
- **🔗 Ancla:** converge al patrón de `FakeAggregateRoot`: encolar+aplicar (su `RaiseAndApply`/`ApplyInternal`) + un `public void Apply(TEvento)` por evento (lo que Marten/`TestStore` llaman para rehidratar). **⚖️ Divergencia del `Id`:** la plantilla lo estampa dentro del `Apply` del evento de creación (su evento de creación **lleva** el id); nuestro diseño deja el evento **sin id** (id = llave del stream, §05) → se difiere a §16. *(Simplificaciones didácticas: nuestro `Raise`/dispatcher viven en la base —§12—, la plantilla los pone per-agregado; no afecta el contrato de persistencia → el reveal sigue 1:1.)*
- **Tu calificación:** [ ] _____

## §14 · La versión es del agregado, no del stream
- **🛠️ Construyes (reto):** mover la `Version` que vivía en el sobre/stream (§05) al propio agregado — una propiedad `Version` (`int`) de solo-lectura externa; el `Load` la sube al cargar (un hecho persistido a la vez); Marten la poblará al rehidratar.
- **💡 Qué aprendes:** `Version` es **metadato del stream** que el agregado expone, no lógica que el agregado calcula; es la base de la **concurrencia optimista**. *(Reescribe el sobre de §05.)*
- **👁️ Se te muestra:** por qué el `set` es protegido y la sube el `Load` (y Marten la poblará al revelarlo).
- **🔗 Ancla:** converge 1:1 a `AggregateRoot.Version` (`int { get; protected set; }`), poblado por Marten al rehidratar.
- **Tu calificación:** [ ] _____

## §15 · El almacén directo: `StartStream` vs `AppendEvent` + Unit of Work
- **🛠️ Construyes (reto):** reemplazar el `EventStream`-ventana de §04 por un almacén directo con la forma del canon: `StartStream(agregado)` (alta de un stream nuevo), `AppendEvent(id, hecho)` (mutación de uno existente), `GetAggregateRootAsync<T>(id)` (rehidrata **y rastrea** lo cargado), `SaveChangesAsync(ct)` (drena los `UncommittedEvents` de lo rastreado y limpia). Sentir el bug clásico: si no rastreas lo que cargaste, al guardar **pierdes** los eventos que el handler agregó.
- **💡 Qué aprendes:** el patrón **Unit of Work** (cargar N → mutar → un solo `SaveChanges`); que `StartStream` ≠ `AppendEvent`; que **el id es la llave del stream**; `ExistsAsync`; por qué hay que **limpiar** el tracker. Aquí se **elimina** el `EventStream`-ventana.
- **👁️ Se te muestra:** el rastreo en **dos listas** (nacidos vs rehidratados); y las sobrecargas de lectura por **versión** y por **timestamp** (time-travel: leer el agregado como era en la versión 3 o en una fecha) — superpotencia del ES que un CRUD no da gratis.
- **🔗 Ancla:** la forma converge 1:1 a `IEventStore` + `IAggregateRootReader` (6 sobrecargas `GetAggregateRootAsync`) y al patrón `MartenUnitOfWork` (`_started`/`_modified`, `UncommitedModifiedAggregateRoots`, `ClearChangeTracker`). La **interfaz** `IEventStore` se extrae en §16, al aparecer la 2ª implementación.
- **Tu calificación:** [ ] _____

---

### 🅱️ Bloque B — Revelar la Critter Stack (el motor ya convergido se intercambia)

## §16 · El gran reveal (1): Marten reemplaza tu almacén
- **🛠️ Construyes (reto):** extraer ahora sí la interfaz `IEventStore` (porque llega la 2ª implementación) y escribir `MartenEventStore` mapeando **cada método tuyo** a Marten de bajo nivel, **sin tocar el dominio**: `GetAggregateRootAsync`→`querySession.Events.AggregateStreamAsync<T>(id)`, `StartStream`→`session.Events.StartStream(id, uncommitted)`, `AppendEvent`→`session.Events.Append(id, evt)`, `ExistsAsync`→`FetchStreamStateAsync`, `SaveChangesAsync`→`session.SaveChangesAsync`.
- **💡 Qué aprendes:** "lo que sufriste construyendo ya existe industrializado"; el contrato deja **enchufar** Marten sin reescribir; ver `mt_events` y el SQL que emite; Marten **puebla la Version**.
- **👁️ Se te muestra:** Marten/Critter Stack — `IDocumentSession` (escritura) vs `IQuerySession` (lectura), `StreamIdentity.AsString` (para que la llave sea string como tu `Id`), registro `Scoped`. **⚖️ Caja de divergencia:** la plantilla rehidrata con `AggregateStreamAsync` + escribe con `Append` y **NO usa `FetchForWriting`** (la doc de Marten lo recomienda hoy) — *semilla* 🌱 de "las dos vertientes" (§19).
- **🔗 Ancla:** converge 1:1 a `MartenEventStore` + `MartenEventStoreExtensions.AgregarMartenEventStore()` (Scoped) + la config (`StreamIdentity.AsString`, `TenancyStyle.Conjoined`, `EventNamingStyle.SmarterTypeName`, `UseLightweightSessions`, `UseSystemTextJsonForSerialization`).
- **Tu calificación:** [ ] _____

## §17 · El gran reveal (2): Wolverine reemplaza tu despacho + el commit automático
- **🛠️ Construyes (reto):** reemplazar el despacho/contenedor casero (§07 + §09) por Wolverine — `UseWolverine` + `Discovery.IncludeAssembly` (descubre handlers **por convención**) + `IntegrateWithWolverine`; y extraer el "guardar al final" repetitivo a un **middleware** (`After()` appendea los pendientes, `Finally()` limpia) + `AutoApplyTransactions`.
- **💡 Qué aprendes:** **discovery por convención** (tus interfaces `ICommandHandler` quedan **opcionales** — documentan intención, no cablean); cross-cutting concerns y el ciclo de vida de un mensaje; por qué en producción **nadie** llama `SaveChangesAsync` a mano.
- **👁️ Se te muestra:** Wolverine — `IMessageBus.InvokeAsync`, `o.Discovery.IncludeAssembly`, `Policies.AddMiddleware<UnitOfWorkMiddleware>()` + `Policies.AutoApplyTransactions()`, `UseRuntimeCompilation`. **⚖️ Sutileza fiel al código:** el middleware real **solo** tiene `After`/`Finally` (NO `Before`); el commit transaccional lo hace `AutoApplyTransactions`, no el middleware.
- **🔗 Ancla:** converge 1:1 a `UnitOfWorkMiddleware` + `WolverineExtensions.UsarWolverineParaComandos` (UseWolverine + Discovery + IntegrateWithWolverine + AddMiddleware + AutoApplyTransactions) + `ICommandRouter`/`WolverineCommandRouter` (`IMessageBus.InvokeAsync`).
- **Tu calificación:** [ ] _____

## §18 · Levantar la última magia: reflexión vs codegen
- **🛠️ Construyes:** (poco a mano) contrastar tu despacho por diccionario/reflexión (§09) contra el **código que Wolverine genera** (codegen) y el **SQL que emite Marten**.
- **💡 Qué aprendes:** por qué los frameworks **generan código** en vez de reflexión por llamada (rendimiento + inspeccionable); que nada es caja negra.
- **👁️ Se te muestra:** `UseRuntimeCompilation`, dónde ver el código generado de Wolverine y el SQL de Marten.
- **🔗 Ancla:** ancla en `o.UseRuntimeCompilation()` (`WolverineExtensions`); se contrasta con el `TestStore` reflexivo (la reflexión **sí** es apropiada para tests, ver §29).
- **Tu calificación:** [ ] _____

## §19 · Las dos vertientes de persistencia (nativo vs la capa de la plantilla)
- **🛠️ Construyes:** (comparar, no construir) poner lado a lado el **`FetchForWriting<T>(id)` nativo** (+ el atributo `[Aggregate]` de Wolverine, con concurrencia optimista incluida) contra la **capa propia** que construiste (`IEventStore` + `MartenEventStore` + `MartenUnitOfWork`).
- **💡 Qué aprendes:** **por qué la plantilla eligió su capa** (testeo sin BD con `TestStore`; separación público/privado para EDA; portabilidad/uniformidad; control del UoW y multi-tenancy); **qué cuesta** (más código propio, la concurrencia optimista es ahora **tuya** —no la da `FetchForWriting`—, posible costo de replay vivo, divergencia del camino recomendado); **cómo mantenerla** (cuándo plegar una mejora de Marten a la capa propia o migrar a lo nativo).
- **👁️ Se te muestra:** el `FetchForWriting`/`[Aggregate]` nativo (de la doc oficial), que la plantilla **no** usa.
- **🔗 Ancla:** cosecha 🌳 de la semilla de §16; contrasta `MartenEventStore` (`AggregateStreamAsync`+`Append`, **0** `FetchForWriting` verificado) vs el camino nativo documentado.
- **Tu calificación:** [ ] _____

---

### 🅲️ Bloque C — Event-Driven (EDA): los hechos que salen al mundo

## §20 · Dos tipos de hecho: público vs privado
- **🛠️ Construyes (reto):** distinguir los eventos que se quedan en casa de los que cruzan la frontera — primero feo (un `bool EsExterno` o un namespace), sentir el dolor; luego **tres interfaces marcadoras vacías** (`IEvent`/`IPublicEvent`/`IPrivateEvent`) + filtrar la lista del agregado (`GetPublicEvents`/`GetPrivateEvents`).
- **💡 Qué aprendes:** evento **público** (contrato inter-servicio, parte de tu API) vs **privado** (intra-servicio, libre de cambiar); por qué un marcador de tipo > una bandera o convención de nombres; por qué los contratos públicos **no** llevan id/tenant/timestamp en el cuerpo (eso es metadato del transporte).
- **👁️ Se te muestra:** interfaces marcadoras + LINQ `OfType<T>()`; por qué el acumulador es `List<object>` (admite eventos que no marcan nada).
- **🔗 Ancla:** converge 1:1 a `IEvent` / `IPublicEvent : IEvent` / `IPrivateEvent : IEvent` (`Cosmos.EventDriven.Abstractions`) y a `GetPublicEvents()`/`GetPrivateEvents()` (`OfType<...>().ToArray()`) en `AggregateRoot`.
- **Tu calificación:** [ ] _____

## §21 · Quién se lleva los hechos que salen: los senders + el sobre
- **🛠️ Construyes (reto):** dos enviadores (`IPublicEventSender`/`IPrivateEventSender`) con `PublishAsync(params ...[])` + sobrecarga con `groupId`; y un **sobre** que envuelve el evento con metadatos (tenant, usuario) sin ensuciar el `record`, estampándolos al publicar.
- **💡 Qué aprendes:** por qué el agregado separa público/privado (caminos distintos: EDA externo vs bus interno); orden **FIFO por grupo** (`groupId`); separación payload vs metadatos de entrega; por qué el contexto se **re-lee** en cada publicación.
- **👁️ Se te muestra:** el patrón **Envelope/DeliveryOptions** y la inyección de un resolver de contexto.
- **🔗 Ancla:** converge 1:1 a `IPublicEventSender`/`IPrivateEventSender` (`Cosmos.EventDriven.Abstractions`) + `TenancyDelivery.Build` (`new DeliveryOptions { TenantId, GroupId }.WithHeader(user_id)`); impls reales `WolverinePublicEventSender`/`WolverinePrivateEventSender` (vía `IMessageBus.PublishAsync`).
- **Tu calificación:** [ ] _____

## §22 · El proceso que se cae: por qué necesitas Outbox/Inbox
- **🛠️ Construyes (reto):** provocar el fallo (dual write: el hecho queda persistido pero nunca se notifica tras un crash); construir un **Outbox ingenuo** (tabla "pendientes" en la **misma transacción** que el append + un worker que la vacía) y un **Inbox** (ids procesados → idempotencia).
- **💡 Qué aprendes:** el problema de la **doble escritura** (BD + broker); atomicidad por outbox transaccional; idempotencia en el consumidor (Inbox / exactly-once de procesamiento); entrega **durable** vs envío **inline**.
- **👁️ Se te muestra:** la transacción que abarca dominio + bandeja de salida; un worker como relay. Se nombra recién aquí "Outbox"/"Inbox".
- **🔗 Ancla:** converge 1:1 a `UseDurableOutbox()`/`UseDurableOutboxOnAllSendingEndpoints()` y `HabilitarInbox()` = `UseDurableInboxOnAllListeners()` / `UseDurableInbox()`. El `SendInline()` de Azure Service Bus es el contraste (el camino **sin** outbox, ver §23).
- **Tu calificación:** [ ] _____

## §23 · Transportes reales: RabbitMQ y Azure Service Bus
- **🛠️ Construyes (reto):** enchufar el bus casero a un broker real — RabbitMQ (`HabilitarRabbitMq` + AutoProvision; `HabilitarOutboxParaEventosPublicos(serviceName, assembly)` → `ToRabbitExchange`; `SuscribirseAServicio` → `ListenToRabbitQueue` + `BindExchange` + `UseDurableInbox`); y el contraste **Azure Service Bus** dockerizado (`UseDurableOutbox`) vs serverless (`SendInline`).
- **💡 Qué aprendes:** ruteo **por tipo** a exchanges/topics (un exchange por servicio); la regla **"nada de EDA in-memory"** (si un público no tiene ruta, Wolverine cae a cola local y el `TenantId` no se propaga = bug silencioso); por qué serverless usa `SendInline` (una function no tiene proceso persistente que vacíe el outbox).
- **👁️ Se te muestra:** `WolverineFx.RabbitMQ` / `.AzureServiceBus` y las extensiones C#14 en español de la plantilla. **⚖️ Caja de divergencia:** el README dice "privados = in-memory", pero el código permite rutearlos a RabbitMQ — el destino lo decide la **config**, no el tipo del evento.
- **🔗 Ancla:** converge 1:1 a `WolverineExtensions` de RabbitMQ (`ToRabbitExchange`/`ListenToRabbitQueue`/`UseDurableOutbox`/`UseDurableInbox`) y de Azure Service Bus **dockerizado** (`HabilitarAzureServiceBus`, `PublicarEvento` → `UseDurableOutbox`; brokers nombrados). El contraste **serverless** (`SendInline`) se trata a fondo en §23b. *(Puente al taller de microservicios/EDA.)*
- **Tu calificación:** [ ] _____

## §23b · Serverless: la plantilla en Azure Functions
- **🛠️ Construyes (diagnóstico + configurar):** despliegas tu app de §22–§23 (host largo + outbox durable) como **Azure Function** y se rompe: (a) Wolverine no arranca y (b) los eventos publicados nunca salen. Diagnostica por qué y aplica las **3 variantes serverless**: host con `AddWolverine(ExtensionDiscovery.ManualOnly)` (no `UseWolverine`), `DurabilityMode.Solo`, y enviar con `SendInline()` en vez de `UseDurableOutbox()`.
- **💡 Qué aprendes:** que **el host importa**. Un proceso largo (Docker) tiene **hilos de fondo** que drenan el outbox; una **función serverless es efímera** (se apaga tras cada invocación, escala a cero) → (1) no hay proceso que vacíe el **outbox durable**, así que se **envía inline** dentro de la invocación; (2) no hay nodo de durabilidad persistente → `Solo`; (3) en **dotnet-isolated** el auto-descubrimiento de extensiones de Wolverine falla → `ManualOnly`. **Tradeoff / cuándo NO:** `SendInline` pierde la red de seguridad del outbox durable (si el envío falla tras confirmar, no hay relay que reintente) → para eventos críticos, mejor un host largo.
- **👁️ Se te muestra:** las APIs nuevas (idioma/herramienta nueva): `AddWolverine(ExtensionDiscovery.ManualOnly)`, `Durability.Mode = DurabilityMode.Solo`, `SystemQueuesAreEnabled(false)`, `SendInline()`; y por qué una Function se cablea en `IServiceCollection` (no `IHostBuilder`).
- **🔗 Ancla:** converge 1:1 a `AgregarWolverineParaComandosServerless` (`AddWolverine(ManualOnly)` + `IntegrateWithWolverine` + `AddMiddleware<UnitOfWorkMiddleware>` + `AutoApplyTransactions` + `Durability.Mode = Solo`) y a las extensiones ASB serverless: `HabilitarAzureServiceBusParaServerLess` (`SystemQueuesAreEnabled(false)`), `PublicarEventoServerless<T>` / `PublicarEventosServerless` (`SendInline()`), `AgregarAzureServiceBusNombradoServerless`. Se contrasta con sus gemelos dockerizados (`UsarWolverineParaComandos` / `PublicarEvento` / `Balanced`). **⚖️** El comentario del código documenta que `ManualOnly` esquiva un fallo real de descubrimiento en dotnet-isolated (`Microsoft.Azure.WebJobs`).
- **Tu calificación:** [ ] _____

---

### 🅳️ Bloque D — CQRS y el lado de lectura

## §24 · El lado de lectura: proyecciones y consultas (CQRS de verdad)
- **🛠️ Construyes (reto):** sentir el costo de reconstruir **cada** stream en cada consulta; construir un **read model** separado (una **proyección** = fold de eventos hacia un documento consultable) + un store de lectura con un `Query<T>` tipo LINQ; y consultas point-in-time (por versión/timestamp) a mano.
- **💡 Qué aprendes:** la separación lectura/escritura de **CQRS**; qué es una **proyección**; los modos **live/inline/async** (cuándo se calcula); **consistencia eventual**; el **"cuándo NO"** (un CRUD simple).
- **👁️ Se te muestra:** la maquinaria de proyecciones de **Marten desde la doc oficial** (`SingleStreamProjection`/`MultiStreamProjection`, registro Live/Inline/Async, el **async daemon**) — porque la plantilla **NO trae proyecciones concretas**: solo deja el hook `Action<ProjectionOptions>` + `AddAsyncDaemon(DaemonMode.HotCold)`; y `querySession.Query<T>`.
- **🔗 Ancla:** converge 1:1 a `IProjectionStore`/`MartenProjectionStore` (`Query<T>` + `GetAggregateRootAsync`) + `IQueryRouter`/`WolverineQueryRouter`, y al hook `projectionsOptions?.Invoke(o.Projections)` + `AddAsyncDaemon(daemonMode)` de `AgregarConfiguracionMartenConsultas`. **Las proyecciones del alumno se registran exactamente en ese `ProjectionOptions`.**
- **Tu calificación:** [ ] _____

## §25 · Versionado y upcasting de eventos
- **🛠️ Construyes (reto):** cambiar la forma de un evento ya persistido (añadir un campo) y ver que los eventos viejos en la BD ya no casan; construir un **upcaster** a mano (traducir el evento v1 al v2 al leer).
- **💡 Qué aprendes:** los eventos son inmutables y permanentes → tu **esquema evoluciona**; **upcasting** (traducir versiones antiguas al leer); estrategias de versionado de eventos.
- **👁️ Se te muestra:** el upcasting de **Marten desde la doc oficial** (la plantilla **NO** trae upcasters); cómo casa con su config.
- **🔗 Ancla:** la plantilla solo aporta `EventNamingStyle.SmarterTypeName` + `StreamIdentity.AsString` como base; el upcasting se enseña desde la doc de Marten y se conecta a esa configuración.
- **Tu calificación:** [ ] _____

---

### 🅴️ Bloque E — Multi-tenancy (varios clientes en el mismo motor)

## §26 · ¿De quién son estos eventos? (de un cliente a muchos)
- **🛠️ Construyes (reto):** meter **dos** empresas con el mismo aggregate id en el mismo proceso y ver que sus historias se **pisan**; arreglarlo cambiando la llave del almacén de `id` a `(tenantId, id)` y pasando `tenantId` a cada Append/Load.
- **💡 Qué aprendes:** el aislamiento multi-tenant es **ortogonal** al id; el id de stream solo es único **dentro** de un tenant; el tenant acompaña toda operación de escritura y lectura.
- **👁️ Se te muestra:** solo C# del propio motor (el dolor se siente con el in-memory store que ya tienes).
- **🔗 Ancla:** converge 1:1 a `TenancyStyle.Conjoined` + `AllDocumentsAreMultiTenanted()` (la tupla `(tenant, id)` = conjoined: tablas compartidas con `tenant_id` por fila).
- **Tu calificación:** [ ] _____

## §27 · ¿De dónde sale el tenant? No lo pidas, resuélvelo
- **🛠️ Construyes (reto):** esconder el parámetro `tenantId` tras una mini-interfaz "algo que me dice el tenant actual" (`{ TenantId; UserId }`), inyectarla en el handler; primero hardcoded, luego leyendo de un header HTTP **confiable** (`X-Tenant-Id`).
- **💡 Qué aprendes:** pasar-el-dato vs **resolver-del-contexto-ambiental**; header **confiable** emitido por un gateway (la app no autentica: confía en quien va delante); por qué **lanzar fuerte** si falta el tenant es mejor que un default silencioso.
- **👁️ Se te muestra:** ASP.NET Core mínimo — `IHttpContextAccessor`, `Request.Headers`.
- **🔗 Ancla:** converge 1:1 a `ITenantResolver` (`TenantId`/`UserId`) + `TrustedHeadersTenantResolver` (`X-Tenant-Id`/`X-User-Id`, lanza `InvalidOperationException` si faltan) + `AgregarTenantResolverConHeadersConfiables()`.
- **Tu calificación:** [ ] _____

## §28 · El tenant viaja con el mensaje (cuando ya no hay request)
- **🛠️ Construyes (reto):** un handler que corre en **segundo plano** (un daemon, sin `HttpContext`) necesita el tenant; construir un segundo resolver que lo lee del **sobre** del mensaje, y un **proxy** que elige el resolver según haya request activo o no.
- **💡 Qué aprendes:** el contexto de tenant debe **propagarse** por fronteras async (HTTP → cola → worker); el patrón **proxy/composite** (una abstracción, dos fuentes según el entorno de ejecución).
- **👁️ Se te muestra:** el modelo de envelope/headers; `InvokeForTenantAsync` para cruzar a **otro** tenant dentro de un handler.
- **🔗 Ancla:** converge 1:1 a `WolverineMessageContextTenantResolver` (`IMessageContext.TenantId` + header `user_id`) + `ProxyTenantResolver` (decide por presencia de `HttpContext`, sin `try/catch`) + `AgregarTenantResolverHibrido()`; `DeliveryOptions.TenantId` ↔ `IMessageContext.TenantId` + `TenancyHeaders.UserId = "user_id"`. **Nota:** este módulo **no diverge** de la doc — usa los caminos nativos de Wolverine.
- **Tu calificación:** [ ] _____

---

### 🅵️ Bloque F — Testing sin mocks, idioma C#14 y empaquetado

## §29 · Probar el motor sin base de datos: el `TestStore`
- **🛠️ Construyes (reto):** un `IEventStore` en memoria para tests — dos diccionarios (eventos **previos** sembrados / eventos **nuevos** producidos) + rehidratar aplicando los eventos en orden; primero "a pie" (un `switch`/`foreach` llamando `Apply`), sentir el dolor de mantener ese cableado por cada tipo.
- **💡 Qué aprendes:** simular el store **sin BD** para tests deterministas; "sembrar el pasado" vs "observar el presente" como dos colecciones; rehidratar = re-aplicar la historia; **test double**.
- **👁️ Se te muestra:** la **reflexión** en C# (`Activator.CreateInstance(typeof(T), nonPublic:true)`, buscar por `MethodInfo` el `Apply` que casa con el tipo del evento, cache `ConcurrentDictionary`) — la "magia que el motor real también usa"; aquí la reflexión **sí** es apropiada (es un test double).
- **🔗 Ancla:** converge 1:1 a `TestStore` (`Cosmos.EventSourcing.Testing.Utilities`): `_previousEvents`/`_newEvents`, `AppendPreviousEvents`, `GetNewEvents`, `GetAggregateRoot<T>`, el `ApplyEvent` reflexivo con cache; las sobrecargas de time-travel que lanzan `NotImplementedException` (un double implementa solo lo necesario).
- **Tu calificación:** [ ] _____

## §30 · Given-When-Then: una gramática para probar decisiones
- **🛠️ Construyes (reto):** una clase base de test con tres verbos — `Given(...eventos previos)`, `When(comando)` (ejecuta el handler **y** guarda), `Then(...eventos esperados)`; arrancar con Arrange-Act-Assert crudo, sentir lo verboso y **destilar** los verbos; más un `And(...)` para el **estado** final y `ThenIsPublishedPublicly/Privately` para los eventos publicados.
- **💡 Qué aprendes:** en ES un test mira la **lista de eventos producidos**, no filas de una tabla; Given-When-Then encaja con pasado/comando/nuevos; afirmar **eventos** (Then) vs **estado derivado** (And); **test spies** para los senders.
- **👁️ Se te muestra:** AwesomeAssertions (`BeEquivalentTo` + `EquivalencyOptions`, comparar records por valor, tolerar `"No members were found"`), `[AssertionMethod]` (JetBrains.Annotations), xUnit v3 (`TestContext.Current.CancellationToken`).
- **🔗 Ancla:** converge 1:1 a `CommandHandlerTestBase` (`Given`/`When`/`Then`/`And`/`ThenIsPublished*`) + `CommandHandlerTest<T>`/`CommandHandlerAsyncTest<T>` (`When`/`WhenAsync`) + `TestPublicEventSender`/`TestPrivateEventSender`.
- **Tu calificación:** [ ] _____

## §31 · El idioma de la plantilla: extension members de C#14
- **🛠️ Construyes (reto):** unos helpers de consulta async (`ToListAsync`/`AnyAsync`/`FirstOrDefaultAsync`) primero como métodos de extensión **clásicos** (`this IQueryable<T>`), repetir el `this`/boilerplate, y revelar el bloque **`extension(...)`** de C#14 que agrupa varios miembros bajo un receptor tipado.
- **💡 Qué aprendes:** la sintaxis de **extension members** de C#14 (LangVersion 14): varios métodos compartiendo receptor + constraints en un bloque, más legible que `this T`; es el estilo que la plantilla usa en **todos** sus `*Extensions.cs`, así que debes reconocerlo al destapar la plantilla.
- **👁️ Se te muestra:** el bloque `extension<TSource>(IQueryable<TSource>) where TSource : notnull { ... }` y `extension<T>(Task<T>) { Map/Tap }`; `PrivateAssets=all` (los helpers no propagan Marten al consumidor del paquete).
- **🔗 Ancla:** converge 1:1 a `QueryableExtensions` (`Cosmos.EventSourcing.Linq.Extensions`) y `TaskAggregateRootExtensions` (`Tap`/`Map`). *(Idioma transversal a toda la plantilla.)*
- **Tu calificación:** [ ] _____

## §32 · Empaquetar y publicar el motor como NuGet
- **🛠️ Construyes (reto):** preparar el motor (abstracciones + utilidades) para distribución — el `.csproj` del paquete (Title/Authors/Description, README/Icon empaquetados), decidir qué dependencias **no** filtrar (`PrivateAssets=all`), y diseñar el versionado de varios paquetes interdependientes; chocar con el problema de versiones y resolverlo.
- **💡 Qué aprendes:** versionado **LOCKSTEP** (todos los paquetes una misma versión por release, un solo tag `v*`); por qué desacoplar `AssemblyVersion` de `PackageVersion` (referencias horneadas a versiones inexistentes → fallo en runtime, *dotnet/sdk#12322*); `AssemblyVersion`/`FileVersion`/`PackageVersion`.
- **👁️ Se te muestra:** un `Directory.Build.props` compartido (AssemblyVersion=`0.0.0.0`, FileVersion derivada del `Version` vía Regex de MSBuild); `PackageReference` con `PrivateAssets=all`; el manifiesto `paquetes-nuget.yml` como fuente de verdad; un `release-nuget.yml` (`workflow_dispatch`) que delega en un reusable de organización con `secrets: inherit`; `PackageId` = nombre del proyecto, `Version` inyectada por el workflow.
- **🔗 Ancla:** converge 1:1 al `Directory.Build.props` raíz, a los `.csproj` reales (`PrivateAssets=all`) y al par `release-nuget.yml` + `paquetes-nuget.yml` (LOCKSTEP; primer release con input `version` explícito). *(Puente al taller DevOps.)*
- **Tu calificación:** [ ] _____

---

### 🅶️ Bloque G — Cierre

## §33 · Capstone: un bounded context de la `Empresa`, de punta a punta
- **🛠️ Construyes (reto):** reconstruir un bounded context completo de la `Empresa` usando **todo** — agregado acumulador, `IEventStore`/Marten, command/query handlers + Wolverine, eventos públicos a un broker, una proyección de lectura, multi-tenancy, y la batería de tests Given-When-Then.
- **💡 Qué aprendes:** integrar todas las piezas en un sistema coherente; **sentir que dominas `Cosmos.BuildingBlocks`** — y aquí, por fin, se nombra la plantilla como lo que llevas todo el taller reconstruyendo.
- **👁️ Se te muestra:** nada nuevo — es síntesis.
- **🔗 Ancla:** el sistema completo converge a la forma real de la plantilla; el alumno ya puede **leer y mantener** `Cosmos.BuildingBlocks` y seguirle el paso a la doc de Marten/Wolverine.
- **Tu calificación:** [ ] _____

---

## Cómo calificar mientras lo haces
En cada sección, intenta los retos **antes** de abrir el `<details>`, ejecuta, y marca:
- `[✅ entendí]` — pude construirlo solo con la guía.
- `[🟡 me costó]` — lo saqué, pero con esfuerzo / tuve que abrir la solución antes de tiempo.
- `[🔴 no entendí]` — la guía no me alcanzó para intentarlo.

Las que marques 🟡/🔴 son candidatas a reforzar (más pista en el reto, partir la sección, o un ejemplo extra). Tu calificación se suma a la del agente `revisor-principiante`, que también lee cada sección como novato.
