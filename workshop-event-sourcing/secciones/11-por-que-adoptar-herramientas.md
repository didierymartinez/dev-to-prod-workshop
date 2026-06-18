# 11 · El momento de adoptar una herramienta

Construiste, a mano y desde cero, un motor de Event Sourcing **que funciona**: guarda hechos, rehidrata agregados, decide con reglas, orquesta comandos, no bloquea hilos y se ensambla solo. En §10 lo dejaste a las puertas de una base de datos real… y te topaste con un **muro** (recuperar un `object` como su tipo exacto, la concurrencia en SQL, los índices). Antes de escalar ese muro ladrillo por ladrillo, hay una decisión de ingeniería que tomar.

## 🎯 El Objetivo

Tu líder técnico te pregunta dos cosas: *"¿esto lo vas a mantener tú en producción, o usamos algo probado?"* y *"si adoptamos algo, ¿cómo sé que no es por moda?"*. Esta sección no escribe código: te da el **criterio** para responder — y el mapa de **qué herramienta reemplaza qué pieza tuya**.

---

## Lo que ya construiste (no es poco)

Vale la pena verlo junto. Esto es un motor de Event Sourcing real:

| Sección | Tu pieza | Qué hace |
|---|---|---|
| §02–03 | eventos (`record`) + `evolve` + `AggregateRoot` | reconstruir el estado leyendo los hechos |
| §04 | `EventStream` | la historia de **una** empresa |
| §05 | `InMemoryEventStore` + el sobre `EventoAlmacenado` (con `Version`) | almacén por id + concurrencia optimista |
| §06 | `decide` | emitir hechos validando reglas |
| §07 | `CommandHandler` | orquestar **cargar → decidir → guardar** |
| §08 | `async/await` | no agotar hilos al esperar I/O |
| §09 | contenedor de DI | ensamblar sin `new` regado |
| §10 | Docker + Postgres/`JSONB` | persistir de verdad |

Entiendes el mecanismo **por dentro**. Ese es el activo que vas a cobrar ahora.

---

## El dolor: ¿y si esto fuera a producción tal cual?

> 🛠️ **Inténtalo tú (sin código).** Antes de mirar la tabla: anota **tres** cosas de tu motor que te darían **miedo mantener** en un sistema real con clientes pagando. Piensa en lo que aún NO resolviste o resolviste "de juguete".

<details>
<summary>👉 Lo que a casi todos nos daría miedo</summary>

| Lo que falta o costaría a mano | Por qué duele en producción |
|---|---|
| **Serialización polimórfica** (`object` → su tipo) | el muro de §10: un `switch` gigante y frágil sobre nombres de tipo, evento por evento |
| **Concurrencia optimista** de verdad | dos comandos al mismo stream a la vez → historia corrupta si te equivocas en un detalle |
| **Proyecciones / read models** (CQRS) | hoy reconstruyes cada stream entero para cada consulta; eso no escala |
| **Outbox transaccional** | guardar el hecho **y** avisar al mundo sin que se pierda ninguno si el proceso se cae |
| **Multi-tenancy** | aislar a cada empresa-cliente sin duplicar infraestructura |
| **Time-travel, snapshots, rendimiento** | replay de streams largos, "estado en la versión 7", caché |
| **Versionado / upcasting** | el día que un evento cambie de forma, leer los viejos sin romperse |
| **Testing sin base de datos** | probar handlers de forma rápida y determinista |

</details>

Ninguna de estas es "imposible" — las podrías construir. Pero son **meses** de fontanería difícil y fácil de equivocar, y es un problema que **ya está resuelto** por librerías curtidas en producción. Construiste el motor a mano para **entenderlo**, no para reimplementar una base de datos de eventos entera.

---

## Las dos herramientas

Hay dos librerías hermanas (mismo autor, la familia se llama **Critter Stack**) que hacen exactamente lo que tú ya entiendes:

- **Marten** — convierte **PostgreSQL** en un **event store** (y base documental) de primera. Guarda streams de eventos, los rehidrata reproduciéndolos, lleva la versión, serializa y **deserializa al tipo correcto** por ti, y trae proyecciones, multi-tenancy y time-travel horneados. Es tu `InMemoryEventStore` + todo el plumbing de Postgres del §10, hecho por expertos.
- **Wolverine** — un **mediador + mensajería**. Encuentra tus handlers, despacha comandos, **comitea (guarda) por ti** al final de cada uno, y publica eventos a un **broker** (un servicio de mensajería intermedio —tipo cola— que aún no construyes) con **outbox/inbox** durable. Es tu `CommandHandler` y tu orquestación, industrializados.

> [!NOTE]
> 💡 Wolverine **no** reemplaza tu contenedor de DI (§09): se **apoya** en él. Lo que reemplaza es el **despacho** de comandos y el "guardar al final" que escribías a mano.

> 🛠️ **Inténtalo tú.** Empareja cada pieza tuya con la herramienta que crees que la reemplaza: `InMemoryEventStore` · `CommandHandler` + save manual · el bus de eventos (que aún no construyes) · multi-tenancy/proyecciones.

<details>
<summary>👉 El mapa "tu pieza → su equivalente"</summary>

| Tu pieza (a mano) | La reemplaza | Cómo (a grandes rasgos) |
|---|---|---|
| `InMemoryEventStore` + plumbing de Postgres | **Marten** | guarda/rehidrata streams, versión y serialización por ti |
| `CommandHandler` + despacho + `Save` manual | **Wolverine** | media comandos por convención + commit automático |
| el bus de eventos (lo construirás en §20+) | **Wolverine** | publica eventos a un broker con outbox/inbox |
| multi-tenancy · proyecciones · upcasting | **Marten** | capacidades de su event store que activas: multi-tenancy viene listo; proyecciones y upcasting los defines tú sobre su soporte |

Esto es solo el mapa de alto nivel. El **cómo exacto** (qué método tuyo se vuelve qué llamada de Marten/Wolverine) lo verás, pieza por pieza, al revelarlas.

</details>

---

## La regla: adoptar con criterio, no por moda

> [!IMPORTANT]
> **Anti-cargo-cult.** Adoptas una herramienta cuando se cumplen las cuatro:
> 1. **Sentiste la necesidad** — chocaste con el dolor real (el muro de §10, la concurrencia, el outbox), no la adoptas "porque está de moda".
> 2. **Sabes qué hace** — porque construiste su versión a mano.
> 3. **Sabes cómo lo hace** — puedes abrir la caja y entender el mecanismo.
> 4. **Puedes depurarla** — si falla en producción, no estás frente a una caja negra.
>
> Tú cumples las cuatro. Por eso, adoptar aquí **no** es rendirse a la magia: es delegar en expertos un trabajo que ya dominas — y poder **mantener** lo que el equipo construyó encima.

---

### El Descubrimiento

No vas a tirar tu motor y enchufar Marten de golpe. Harías un cambio brusco y arriesgado, y buena parte de lo que revelemos se sentiría como magia. En vez de eso, el plan es en dos tiempos:

1. **Afinar tu motor a su forma de producción** (§12–§15): unos refactores guiados que llevan tu agregado, tu versión y tu almacén a la **forma exacta** que usan las herramientas del equipo — sintiendo, en el camino, los últimos dolores que justifican esa forma.
2. **Revelar las herramientas** (§16+): cuando tu motor ya tenga esa forma, enchufar Marten y Wolverine será **renombrar e intercambiar 1:1**, no rediseñar. Verás que "lo que escribiste, la librería lo hace".

Afinar primero es lo que convierte la revelación en un *"ah, esto ya lo tenía"* y no en un *"¿de dónde salió esto?"*.

---

## ✅ Compruébalo

Sin código — asegúrate de que el criterio quedó:

- [ ] Nombra **tres** dolores de tu motor a mano que una herramienta de event sourcing resolvería por ti.
- [ ] Di, en una frase, qué reemplaza **Marten** y qué reemplaza **Wolverine** de lo que construiste.
- [ ] Explica por qué adoptar aquí **no** es cargo-cult (las cuatro condiciones).
- [ ] Explica por qué vamos a **afinar el motor a mano (§12–§15) antes** de enchufar las herramientas.

---

## 🧠 En una frase

Construiste un motor de Event Sourcing completo y lo **entiendes por dentro**; eso te da el derecho a **adoptar** Marten (tu event store) y Wolverine (tu mediador) con criterio y no por moda — pero primero vas a **afinar tu motor a su forma de producción** para que la adopción sea un intercambio 1:1, no un rediseño.

---

[⬅️ Volver: Persistencia real (Docker y PostgreSQL)](./10-docker-postgres.md)

[➡️ Siguiente: El agregado que acumula](./12-el-agregado-acumula.md)
