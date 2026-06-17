# 🗺️ Mapa del taller — qué construyes en cada sección (y qué aprendes)

Este taller es **hands-on**: en cada sección **te reto a escribir el código tú mismo** (te describo qué construir, lo intentas, y luego revelo una forma de hacerlo en un bloque `<details>`). Lo que es idioma nuevo de C# —demasiado para inventarlo de cero— **se te muestra** directamente.

Este mapa, para cada sección, te dice:
- **🛠️ Construyes (retos):** lo que se te pide *intentar* escribir.
- **💡 Qué aprendes:** el concepto que *fabricas* al hacerlo.
- **👁️ Se te muestra:** lo que se te da hecho — y *por qué* (idioma nuevo o dato).
- **Tu calificación:** márcala al hacer la sección (`✅ entendí` / `🟡 me costó` / `🔴 no entendí` + nota).

**Estado:** §01–§10 construidas, en estilo reto, **verificadas por un "alumno" agente** (build-along: se pueden construir solo siguiendo la guía; el proyecto final compila y corre). §11+ planeadas.

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

## §11+ · Lo que viene (planeado)

> Cada uno se partirá en las lecciones que haga falta; aquí, qué se RETARÁ a construir y qué se aprenderá.

| # tent. | Sección | 🛠️ Qué construirás (reto) | 💡 Qué aprenderás |
|---|---|---|---|
| §11 | **La bisagra de adopción** | (conceptual) decidir adoptar con criterio | por qué/cuándo adoptar Marten + Wolverine, sin cargo-cult |
| §12 | **El agregado acumula** | que `Empresa` **acumule** sus hechos (`Raise` + lista de no-confirmados) en vez de devolverlos | el modelo de producción (Unit of Work) |
| §13 | **`Apply` por tipo** | convertir el `switch` en métodos `Apply(TipoConcreto)` hallados por reflexión | la forma exacta del agregado del canon |
| §14 | **Store directo + UoW** | reemplazar el `EventStream`-ventana por `GetAggregateRootAsync`/`AppendEvent`/`SaveChangesAsync` | el patrón Unit of Work y el store del canon |
| §15 | **Revelar Marten** | enchufar Marten (mapeo 1:1 de lo tuyo) | que "lo que escribiste, la librería lo hace"; ver `mt_events` |
| §16 | **Las dos vertientes** | (comparar) `FetchForWriting` nativo vs la capa de la plantilla | por qué la plantilla eligió su capa; cómo mantenerla |
| §17+ | Wolverine, Outbox/Inbox, CQRS/proyecciones, Decider, upcasting, testing, codegen, multi-tenancy, EDA, anatomía de BuildingBlocks, NuGet, capstone | (cada uno con sus retos) | profundizar el Critter Stack y dominar la plantilla |

---

## Cómo calificar mientras lo haces
En cada sección, intenta los retos **antes** de abrir el `<details>`, ejecuta, y marca:
- `[✅ entendí]` — pude construirlo solo con la guía.
- `[🟡 me costó]` — lo saqué, pero con esfuerzo / tuve que abrir la solución antes de tiempo.
- `[🔴 no entendí]` — la guía no me alcanzó para intentarlo.

Las que marques 🟡/🔴 son candidatas a reforzar (más pista en el reto, partir la sección, o un ejemplo extra). Tu calificación se suma a la del agente `revisor-principiante`, que también lee cada sección como novato.
