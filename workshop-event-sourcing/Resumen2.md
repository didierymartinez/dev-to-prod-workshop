# El hilo del taller — cómo nace cada sección de la anterior

> El **hilo conductor**: cada pieza nace del **código** de la anterior (no se ata con una transición). Derivado de las transcripciones **[C1]** (a mano) / **[C2]** (Marten) **y del repo real** `Cosmos.BuildingBlocks` (código + historial). Fuente de verdad: los **`.cs`** (Marten **9.2.1** / Wolverine **6.1.0**, .NET 10, 11 paquetes lockstep v1.2.5) — los README tienen drift.
>
> Este es el **Taller ①** de un programa: ① desmitificar BB pieza por pieza → ② usarla para construir apps → ③ desplegarla en Azure → ④ un "Critter Watch" propio (observabilidad) → ⑤ control plane. El hilo del programa es "entender la conexión de cada pieza" — y ① es la llave.

---

## La clave que revela el repo

`Cosmos.BuildingBlocks` **nunca se construyó "a mano primero"**: nació (commit 0e29e81) ya con Marten+Wolverine y toda la arquitectura. El motor casero de §1-9 es **andamio didáctico para ganar criterio**, no una etapa histórica. **Invertimos el orden a propósito, y hay que decírselo al alumno.** El historial vale por dos cosas: el **orden en que se añadieron las capas** (tenancy → público/privado → versión → UserId → outbox → endurecimiento) y las **decisiones reales** que tomó el equipo — los *momentos-criterio* (abajo).

**Cómo evolucionan los cursos** (la pedagogía, no la historia del repo):
> **[C1]** conceptos → dominio → **tests** → hacerlo una app (store + API + DI) → lectura → UI. · **[C2]** conocer Marten en el `Main` → rehidratar → proyectar → **swap** → avanzado. Ninguno pone la API primero; Marten se conoce directo en el `Main`.

---

## §1-9 — el motor a mano [C1]

Empezamos con un listado de `record` (hechos) en orden de ocurrencia, una `List<object>`. Recorro esa lista y, según el tipo de cada hecho, modifico unas variables. Al poner esas variables como propiedades de una clase `Empresa` y el `foreach` en el constructor —con un método `Aplicar` que tiene los `if` y recibe cada hecho— nace el concepto de **agregado**.

Después creo la clase abstracta `AggregateRoot` con un método `Load(List<object> hechos)` y un método abstracto `Aplicar(object hecho)`; `Empresa` hereda de `AggregateRoot`, llama a `Load` en el constructor y hace override de `Aplicar`. Esas listas no pueden andar sueltas, y la solución es una clase `EventStream` que recibe un tipo `AggregateRoot`, tiene una lista privada de `object`, un método `Get()` que devuelve una `Empresa` nueva haciendo `Load(lista)` (ya no en el constructor) y un método `Append` que inserta un `object` en la lista. Hasta acá: `AggregateRoot` → `EventStream` con `Get` y `Append`.

Creo métodos en `Empresa` que retornan los eventos (`Suspender` → `EmpresaSuspendida`); estos son **comandos**, para no andar haciendo suelto `Get → Act → Append`. Creo una clase `Handler` por cada acción: `SuspenderHandler(stream)` siempre tiene un método `Handle()` que recibe un comando, recupera la entidad con `stream.Get()`, ejecuta el método del agregado pasando los parámetros del comando —y el agregado retorna el hecho, o lanza excepción, o es idempotente—; si retorna, inserta el hecho en el stream con `Append`.

Se crea una interfaz `ICommandHandler<TCommand>` que define que todos deben tener el método `Handle`, y que `TCommand` es el tipo que le llega. El **despachador** es un diccionario cuya clave es el tipo del comando y cuyo valor es una función que ejecuta el handle: `(object comando) => handler.Handle((T)comando)`, con un método `Registrar<T>(ICommandHandler<T> handler)` donde ese `T` sirve para saber el tipo del comando y para el cast al hacer el handle.

Si el despachador registra por tipo y el parámetro de un handler es el stream, siempre se modificaría la misma empresa. Para evitar eso se crea un `Store` que almacena múltiples streams: el handler recibe todo el store y el id del agregado que debe abrir. El `EventStore` es un diccionario que encapsula el `EventStream` —clave: `AggregateId`, valor: `List<object>`— con tres métodos: `AbrirStream<T>`, `Get(id)` y `AppendEvent(id, evento)`.

Y como una app real atiende muchas peticiones a la vez, dos pueden abrir la misma empresa en el mismo instante y pisarse en silencio; para atraparlo, numero cada hecho en un **sobre** `EventoAlmacenado(Version, …)`, y el almacén rechaza un `Append` cuya posición ya está ocupada (`ConcurrencyException`). Eso es **concurrencia optimista**.

*(Estos §1-9 convergen a los CONTRATOS reales de `Cosmos.EventSourcing.Abstractions` — `AggregateRoot`, `IEventStore`, `ICommandHandler<T>`, `ICommandRouter` — que la librería tiene 1:1.)*

---

## §10+ — la continuación (el hilo constructivo)

> Cada eslabón abre citando el **código de la sección inmediata anterior**, no un tema nuevo.

**Blindar el dominio (§10-11) · nace de los handlers de §6-8 · [C1].** Tengo el motor completo, pero lo pruebo corriendo el `Main` y mirando la consola — y voy a refactorizarlo pronto (meter Marten), así que necesito una red. Mi `EventStore` en RAM **es su propio doble**: escribo un test que siembra hechos, ejecuta un handler y revisa los hechos nuevos. El primero es verboso, así que destilo **Given / When / Then**. *(Converge al `TestStore`/`CommandHandlerTestBase` reales, que aplican eventos por reflexión buscando `Apply` — se recupera en §37.)*

**Conocer Marten en el `Main` (§12-15) · nace del test de §11 · [C2].** Tu test GWT siembra hechos, corre el handler y verifica — pero **¿dónde viven esos hechos?** En tu `EventStore` en RAM: cierra el proceso y el test parte de cero. Bien para un test, letal en una app real. Necesitas una BD — y escribir el puente a mano es el **muro** (lo *tocas*: insertas un hecho en `psql`, ves la columna `data jsonb` + una columna `type`, y al leer necesitas un `switch(type)` para reconstruir el `object` — se siente feo). Así que adoptas **Marten** con criterio, en el `Main`: `DocumentStore.For(conn)` → sesión → `StartStream`/`Append` → `await SaveChangesAsync()`; miras `mt_events` y el stream en su **versión**. Escribiste, pero ¿cómo lees? Un `Create`/`Apply` por convención hace que `AggregateStreamAsync<Empresa>(id)` reconstruya tu `Empresa` (+ time travel). Y para consultar MUCHAS por criterio, una **proyección** `Inline`.

**El swap (§16-17) · nace de saber usar Marten (§13-15) + todo lo casero · [C2].** Hasta ahora Marten vivía en un `Main` de juguete y tu dominio en otro; el swap los **une**: el `Create`/`Apply` de §14 se lo das a **tu** `Empresa` (es la misma clase) y el `DocumentStore` pasa a vivir donde los handlers. Reemplazas el `EventStore` casero por la sesión de Marten (`StartStream` / `AggregateStreamAsync`+`Append` / `SaveChangesAsync`); todo se vuelve `async`; asumes el **elefante** (lock-in). **Y nombro la deuda:** el swap con `Append` **no verifica la versión** — tu `ConcurrencyException` de §9 queda temporalmente fuera. No la perdiste; Marten la hace distinto y decides cuándo traerla (§20). El swap rompió mis tests (dependían de mi `EventStore` casero **que acabo de borrar** — no de un "TestStore", que aún no existe), así que los recupero como **integración** contra Postgres real; la deuda de velocidad es a propósito (el `TestStore` sin BD llega con la plantilla, §37).

**Hacerlo un servicio (§18) · nace del cableado de §17 · [C1].** Tus tests de §17 crean un `DocumentStore` y abren sesión por operación — a mano, en cada test y en el `Main`. Un cliente real no va a instanciar tu `DocumentStore`. Extraes ese cableado repetido a un **contenedor** (DI — cura el "infierno de los `new`" de §7) y lo expones por **HTTP** (`POST`→202, `GET`→JSON). Registras Marten `Scoped`; y **aquí** el `async` cobra su sentido real: un servidor que bloquea agota hilos.

**Marten a fondo (§19-23) · el motor ya corre sobre Marten · [C2].** Un reporte que cruza streams → proyección **async** con **daemon** (HotCold) + checkpoints. El **porqué se guarda sin que yo llame `SaveChanges`**: el `MartenUnitOfWork` rastrea agregados cargados y un middleware los drena (fue un breaking change real). **`FetchForWriting` (momento-criterio):** el write-path canónico que la doc recomienda y que devolvería la concurrencia de §9 — **la plantilla NO lo usa** (usa `Append`); aquí decides si adoptarlo. Luego versionado/upcasting, auditoría (metadata, semilla del middleware), suscripciones.

**Wolverine (§24-25) · nace del despachador de §7 + el guardado central · [W][P].** Son middleware a mano; Wolverine los industrializa (discovery, `AutoApplyTransactions`, `bus.InvokeAsync`). Ojo: `ICommandRouter.InvokeAsync` vs `IQueryRouter.ResolveAsync` (verbos distintos); comandos `Balanced`, consultas `MediatorOnly`. El handler de evento es un `Handle()` plano por discovery — **no** hay `[AggregateHandler]` (eso es capacidad de Marten que la plantilla no usa).

**EDA (§26-31) · nace de los eventos que el agregado ya clasifica.** Marcadores **vacíos** público/privado — **el ruteo no está en el sender** (código idéntico) sino en la **config de arranque por reflexión** sobre el marcador (el alumno lo busca en las clases y no lo encuentra). El sobre (`TenancyDelivery`, dos clases homónimas). Outbox (`UseDurableOutbox*`, sin tabla visible; matar el proceso → el mensaje sobrevive). Transportes: RabbitMQ auto-provisiona vs ASB con topología por Terraform. UI en vivo (SignalR + la suscripción de §23). **Momento-criterio:** el validador de routing que se añadió y se retiró porque rompía consumidores puros.

**Multi-tenancy (§32-34).** Dos clientes mismo id se pisan → `Conjoined` + sesión por tenant. Resolver del header `X-Tenant-Id`. **Momento-criterio:** el `TenantId` viaja **nativo** por Wolverine, pero el `UserId` como **header manual** (`user_id`) porque el camino global no servía — nació de bugs reales. El `ProxyTenantResolver` elige por presencia de `HttpContext`.

**La plantilla — el norte (§35-40) · haber vivido el camino nativo.** Las dos vertientes (por qué el equipo abstrajo, y por qué **no** usa `FetchForWriting`). El agregado real: `_uncommittedEvents`/`Id`/`Version`/`GetPublicEvents`/`GetPrivateEvents` — **el `Apply` NO está en la base**, lo define cada agregado y lo invoca Marten (fold) o el `TestStore` (reflexión); desmitificar "¿dónde está `Apply`?" es el punto duro #1. `IEventStore`+`MartenEventStore`+UoW+`TestStore` (tests sin BD). Consumir los 11 paquetes (3 `.sln`, extension members C#14, idioma dual inglés-código/español-extensiones). Empaquetar: LOCKSTEP, `AssemblyVersion=0.0.0.0`, `.csproj` sin `<Version>`. **Capstone: tú, tomando la decisión real de adoptar `FetchForWriting` en la librería, con el criterio ya construido.**

---

## Momentos-criterio (el corazón del norte)

Decisiones reales que enfrenta quien mantiene BB — el taller te construye hasta poder juzgarlas:
- **`FetchForWriting`** (§20/§40): la doc lo recomienda, la plantilla no lo usa. ¿Adoptar?
- **Snapshots** (§20): solo con un problema medible.
- **El validador de routing añadido y retirado** (§29): por qué las abstracciones tienen su forma; cazar un bug distribuido.
- **`UserId` como header manual** (§34): la identidad viaja partida; nació de un bug.
- **Auto-flush** (§19): por qué se guarda sin llamar `SaveChanges` (breaking change real).

---

## Decisiones resueltas

- **Concurrencia en el swap:** resuelta a favor del repo — el swap usa `Append` (sin check de versión), la deuda se **nombra**, y `FetchForWriting` es el momento-criterio de §20/§40. (Ya no es decisión abierta.)
- **Fuente de verdad:** los `.cs`, no los README (que tienen drift: versiones, `CompositeTenantResolver` inexistente, etc.).
