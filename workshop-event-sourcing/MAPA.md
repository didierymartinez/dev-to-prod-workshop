# 🗺️ Mapa del taller — qué construyes en cada sección (y qué aprendes)

> 📖 ¿Buscas el **panorama como relato** (sin código, de corrido)? → [`NARRATIVA.md`](NARRATIVA.md). Este mapa es la **referencia por sección**: qué construyes y qué aprendes en cada una.

Este taller es **hands-on**: en cada sección **te reto a escribir el código tú mismo** (te describo qué construir, lo intentas, y luego revelo una forma de hacerlo en un bloque `<details>`). Lo que es idioma nuevo de C# —demasiado para inventarlo de cero— **se te muestra** directamente.

## El norte (v7)

El norte del taller es entender la **conexión de cada pieza** de `Cosmos.BuildingBlocks` a fondo —para **usarla, mantenerla y extenderla con criterio**, no por fe en la doc—. Por eso construimos **a mano** un motor de event sourcing: es un **andamio deliberado**. La librería nació sobre la Critter Stack (Marten **9.2.1** / Wolverine **6.1.0**); invertimos el orden a propósito, para que cuando la herramienta te dé algo hecho, sepas exactamente qué hace por debajo, porque lo escribiste tú. El caso emblemático del criterio: decidir si adoptar (o no) `FetchForWriting`.

> **Estado (replanteo v8):** el **motor a mano (§1-9) está en pie** — es el **patrón oro** del método (descubrimiento vivido, el "obvio" sale del alumno). La **segunda mitad (§10 en adelante) se borró a propósito**: estaba escrita *en reversa* desde la librería y se sentía un "tour de herramientas". Se está **reescribiendo vivida**. Diagnóstico y estrategia en [`COMO-HILAR-EL-FOCO.md`](COMO-HILAR-EL-FOCO.md). Nada se perdió: las secciones viejas viven en el historial de git.

---

## Lo construido

Las **9 secciones** en pie hoy —el motor de event sourcing construido a mano—, en orden (sigue los ➡️ de cada archivo):

1. **[El diario de una empresa](secciones/el-diario-de-una-empresa.md)** — sección conceptual (sin código): guardar el **diario** de hechos en vez de la **foto** del estado. Aprendes qué es **Event Sourcing** y por qué un `UPDATE` destruye el pasado que el diario conserva.

2. **[Los primeros hechos](secciones/los-primeros-hechos.md)** — escribes los primeros eventos como `record` inmutables y reconstruyes el estado con un `foreach` (el **Replay**). Aprendes que el estado **no se guarda, se reconstruye** (el paso `evolve`), dentro de un **Aggregate Root**.

3. **[Refactorizando el motor](secciones/refactorizando-el-motor.md)** — refactorizas el motor de replay en tres pasos: separar recorrer de aplicar, subirlo a una clase base **`AggregateRoot`**, y rutear por tipo con un `switch`. Aprendes separación de responsabilidades, herencia y **pattern matching** — un motor que crece sin volverse un `if` interminable.

4. **[El flujo de vida (EventStream)](secciones/el-flujo-de-vida.md)** — envuelves la historia de una empresa en un `EventStream<T>` genérico, dueño de su lista, con `Append` (anotar) y `Get` (rehidratar). Aprendes el patrón **Repositorio** y qué es un **Event Stream** (la historia de UNA empresa).

5. **[Decidir el futuro (emitir eventos)](secciones/decidir-el-futuro.md)** — le das a la `Empresa` métodos `decide` (`CambiarPlan`/`Suspender`/`Reactivar`) que **devuelven** el hecho sin tocar el estado, con validación e idempotencia. Aprendes que **decidir ≠ aplicar** y a distinguir lo **inválido** (se rechaza) de lo **redundante** (se ignora).

6. **[El Command Handler](secciones/el-command-handler.md)** — encapsulas el ciclo **cargar → actuar → guardar** en una clase handler **por comando**. Aprendes a sacar la logística del `Program.cs` a una pieza con un solo trabajo (responsabilidad única), dejando la lógica de negocio en el agregado.

7. **[El despachador: dado un comando, encuentra su handler](secciones/el-despachador.md)** — construyes un `Despachador` (tabla `tipo → handler`) que rutea cualquier comando a su handler. Al hacerlo **nacen** el **`record` por comando** (identidad de tipo) y el contrato **`ICommandHandler<T>`** — en su momento de necesidad.

8. **[El almacén: un cajón por empresa](secciones/el-almacen-por-id.md)** — construyes el `EventStore` (un cajón de hechos por id) y haces que el handler abra el stream por el `EmpresaId` del comando. Aprendes el patrón **Event Store** y que **el id es la llave**: handlers registrados una sola vez sirven a todas las empresas.

9. **[Cuando dos escriben a la vez (concurrencia optimista)](secciones/concurrencia-optimista.md)** — envuelves cada hecho en un sobre `EventoAlmacenado(Version, …)` y el almacén rechaza un `Append` cuya posición ya está ocupada. Aprendes el dolor de la **actualización perdida** y la **concurrencia optimista** (no bloquear; verificar la versión al guardar). **Aquí termina el motor a mano.**

---

## 🚧 Segunda mitad — en reescritura (replanteo v8)

Todo lo que iba **después de §9** (persistencia con Marten, proyecciones, daemon, servicio/DI, Wolverine, EDA, multi-tenancy, la plantilla y el capstone) **se borró a propósito**: estaba escrito *en reversa* desde `Cosmos.BuildingBlocks` —la respuesta ya conocida—, y por eso se sentía un **tour de herramientas** en vez del descubrimiento **vivido** de §1-9.

Se reescribe **sección a sección, vivida**, desde el dolor que deja §9 — con un **norte que empuja** (construir un monitor propio, tipo **Critter Watch**, que te haga *necesitar* cada pieza) en lugar de "converger a la librería". Documentos que guían la reescritura:

- [`COMO-HILAR-EL-FOCO.md`](COMO-HILAR-EL-FOCO.md) — diagnóstico del foco de las 39 secciones + los movimientos de re-hilado.
- [`CRITTERWATCH-BRUJULA.md`](CRITTERWATCH-BRUJULA.md) — el norte y las estaciones de la continuación (dolor → observador → descubrimiento).
- [`AMPLIACION-MARTEN.md`](AMPLIACION-MARTEN.md) — la profundidad de Marten anclada al repo real `Cosmos.ControlPlane`.

> **Nada se perdió.** Las 30 secciones borradas viven en el historial de git (`git checkout 1948ab0 -- workshop-event-sourcing/secciones/<archivo>.md`) — como **referencia**, no como base sobre la que construir.

---

## Cómo calificar mientras lo haces

En cada sección, intenta los retos **antes** de abrir el `<details>`, ejecuta, y anota tu resultado:
- `✅ entendí` — pude construirlo solo con la guía.
- `🟡 me costó` — lo saqué, pero con esfuerzo / abrí la solución antes de tiempo.
- `🔴 no entendí` — la guía no me alcanzó para intentarlo.

Las que marques 🟡/🔴 son candidatas a reforzar (más pista en el reto, partir la sección, o un ejemplo extra).
