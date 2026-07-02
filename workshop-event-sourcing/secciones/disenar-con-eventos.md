# Diseñar con eventos: las decisiones que el broker no toma por ti

Ya sabes **publicar** un `IPublicEvent` a un broker ([Transportes](transportes-rabbitmq-asb.md)). Pero *antes* de publicar hay decisiones de **diseño** que ninguna librería toma por ti — y son las que separan "cablear EDA" de "diseñar con EDA". Las razonamos con un caso **real**, salido de una discusión de equipo.

## 🎯 El Objetivo

Razonar cuatro decisiones de diseño EDA —**granularidad de topics**, **evento vs comando**, **acoplamiento** y **coreografía vs orquestación**— sobre un caso concreto, para no usar eventos por inercia.

## El caso (real)

> *"`RegistroObligacionCreado` lo escuchan terceros, y pueden emitir `TerceroCreado` **o** `TerceroRechazado`. Como hablamos de un topic por evento… ¿un topic para `TerceroCreado` y otro para `TerceroRechazado`? ¿o los dos en uno? Y no sé si esto es un antipatrón."*

Hay cuatro preguntas escondidas ahí. Una por una.

## Decisión 1 — ¿un topic por qué?

La pregunta literal: *¿un topic por cada tipo de evento?* En [Transportes](transportes-rabbitmq-asb.md) tomamos otra postura: **un exchange/topic por SERVICIO** (el que emite), y el **tipo** del evento es la *routing key* / el filtro del consumidor. Eso reconcilia las dos ideas:

- `TerceroCreado` y `TerceroRechazado` salen al **exchange del servicio de terceros** (no a uno por cada uno).
- Quien solo quiere uno se **suscribe filtrando por tipo**.

Respuesta a la pregunta: **no necesitas un topic por cada tipo** — un exchange **por servicio** + ruteo/suscripción **por tipo** te da lo mismo sin que el número de topics explote. (Trade-off: *por-evento* da topics finos pero proliferan; *por-servicio* agrupa y el consumidor elige — escala mejor en número.)

> [!NOTE]
> 💡 Esto **no** es la decisión de fondo. La granularidad es táctica; las tres que siguen son las que de verdad importan.

## Decisión 2 — ¿evento… o lo estás forzando? (la grande)

Un **evento** dice *"esto ya pasó"*: fire-and-forget, el emisor **no espera respuesta** ni sabe (ni le importa) quién escucha. Un **comando / request** dice *"haz esto"*: espera un resultado.

**La señal de alarma:** si después de publicar te quedas **esperando** un evento de vuelta (`TerceroCreado`/`TerceroRechazado`) **para continuar tu propio flujo**, no estás haciendo EDA — estás haciendo un **request-reply disfrazado de eventos**. Eso es **acoplamiento temporal**: pagas la complejidad del async (broker, outbox, correlacionar la respuesta) **y** sufres la rigidez del sync (esperas igual). El peor de los dos mundos.

La regla práctica:

> **¿El emisor necesita el resultado para seguir?** → es una **pregunta**: usa **request-reply síncrono** (gRPC/HTTP). → **No** → es un **hecho**: usa un **evento**.

"Tercero creado o rechazado" suele ser una **pregunta** ("¿me aprobaste este tercero?") cuando el flujo de origen **se bloquea** esperándola: ahí gRPC encaja mejor que un evento. Un evento brilla cuando **notificas un hecho y otros reaccionan a su ritmo**, sin que tú esperes. (Es justo lo que se nota en la práctica: *"servicios que deberían comunicarse por gRPC y los forzamos a un eventual… terminamos esperando respuesta"* — ese es el smell.)

Y la **otra cara**, del lado del **consumidor**: si un handler *reacciona* a un evento ejecutando **lógica de dominio que cambia estado y puede ser *rechazada*** (validar, fallar), eso **no** es reaccionar a un hecho — es un **comando disfrazado de evento**. Hazlo explícito: un comando con su handler, no un efecto colgado de un evento. *(Khorikov: los domain events son para comunicar **efectos más allá de la BD**; el flujo dentro de la app va explícito —devuelve el resultado y pásalo al siguiente paso—, no por eventos.)*

## Decisión 3 — el acoplamiento que los eventos esconden

Los eventos desacoplan en el **espacio** (el emisor no conoce al consumidor) — pero pueden **acoplarte en el tiempo y en el flujo** si los usas para *coordinar* un proceso. Dos olores:

- **Dependencia circular:** A emite → B escucha → B emite → A escucha. Si los dos lados son el **mismo proceso de negocio** (transaccional), tienes una **saga implícita sin dueño**: nadie ve el proceso completo, y recuperarte de un fallo a mitad de camino es una pesadilla.
- **Smell ≠ antipatrón:** un *smell* no significa que esté mal — significa que **vale la pena mirarlo**. Un ciclo entre servicios puede ser legítimo (eventual, sin transacción compartida) o un grito de que eso debería ser una llamada síncrona o un proceso con coordinador.

## Decisión 4 — ¿quién manda el proceso? coreografía vs orquestación

Cuando un hecho dispara una cadena (`RegistroObligacionCreado` → crear/rechazar tercero → …), hay dos formas de coordinarla:

- **Coreografía:** cada servicio reacciona a eventos, sin coordinador central. Flexible y desacoplado — pero **el "proceso completo" no vive en ningún lado**: emerge de quién-escucha-a-quién, y se vuelve difícil de ver y depurar cuando crece.
- **Orquestación:** un **coordinador** (un orquestador / una *saga*) dice los pasos y las compensaciones. El proceso queda **explícito y visible**, a costa de un punto central.

Regla de pulgar: para *notificaciones* sueltas, coreografía; para un **proceso con pasos, resultados y compensaciones**, una saga/orquestador suele razonarse mejor que pura coreografía.

## 🧭 Zoom out: tres patrones que se llaman "evento"

Las cuatro decisiones de arriba se confunden porque **tres patrones distintos** usan la palabra "evento". Sepáralos por su **propósito**:

| Patrón | Propósito | Dónde vive en este taller |
|---|---|---|
| **Event Sourcing** | **Persistencia**: el evento **es el estado**; reconstruyes reproduciéndolo | el event store ([El almacén directo](el-almacen-directo.md)) |
| **Domain events in-process** | **Notificación dentro del mismo proceso/transacción** | el agregado los **levanta** y se despachan **al commit** (el `UnitOfWorkMiddleware` de [Revelar Wolverine](revelar-wolverine.md)) |
| **EDA / integration events** | **Comunicación async entre servicios** (cruzan boundaries) | `IPublicEvent` → broker ([Transportes](transportes-rabbitmq-asb.md)) |

La trampa: **es el mismo evento el que cambia de ROL**. Mientras vive en el stream, es **estado** (ES). En el momento en que lo publicas para que **otro** reaccione, pasó a ser un **mensaje** (EDA) — y ahora exige lo que EDA exige: async, durabilidad, idempotencia, consistencia eventual, contexto en el sobre. El error clásico es **tratarlo como si siguiera siendo ES/in-process**: una cola en memoria que se procesa de inmediato. Así te saltas todo eso.

> [!NOTE]
> 💡 **Los cuatro significados de "event-driven" (Martin Fowler).** "Event-driven" no es **una** cosa: (1) **Event Notification** —avisar de un cambio sin esperar respuesta (tus `IPublicEvent`)—; (2) **Event-carried State Transfer** —el evento lleva **suficientes datos** para que el consumidor no tenga que volver a llamar al emisor (un evento "gordo")—; (3) **Event Sourcing** —el log es la fuente de la verdad (todo este taller)—; (4) **CQRS** —separar lectura de escritura ([CQRS y proyecciones](cqrs-proyecciones.md))—. El taller construye 1, 3 y 4; el **2 (ECST)** es una decisión de diseño: un evento más gordo **desacopla** al consumidor de llamadas síncronas, a costa de **duplicar datos** y versionar un contrato más grande.

> [!NOTE]
> 💡 **Domain events in-process: el patrón legítimo (Jimmy Bogard).** Levantar domain events y despacharlos **dentro del proceso** es válido y respetado —*si* lo haces bien—: **no despaches al instante**; **registra** los eventos en el agregado y **despáchalos en un punto controlado, justo al commit, en el mismo scope/transacción**. Es justo lo que hace tu `UnitOfWorkMiddleware` ([Revelar Wolverine](revelar-wolverine.md)). El **anti-patrón** es una cola en memoria que se procesa de inmediato en otro scope. Ahí no hay misma transacción: el efecto se **pierde** si el proceso cae. Y no hay contexto: `local://` no rehidrata el tenant ([El tenant viaja con el mensaje](tenant-viaja-con-el-mensaje.md)). Para un efecto **intra-proceso**, un broker real sería *overkill*; el broker es para los **integration events** que cruzan servicios.

## 📋 La regla, en cuatro líneas

Para decidir **qué hacer con un hecho** que tu comando produce:

1. **Es estado (ES)** → va al **event store**. No se "publica para procesar".
2. **Es efecto de la *misma* decisión de negocio** (mismo comando; mismo agregado o efecto acotado) → **flujo explícito** o **domain event diferido al commit**, en el **mismo scope** — **no una cola**.
3. **Es una reacción *cross-cutting*** (otro agregado / otro proceso / otro servicio) → **EDA real**: outbox + async + idempotencia + el contexto (tenant) viajando en el sobre.
4. **Un handler de evento NUNCA ejecuta lógica de dominio que pueda ser *rechazada*.** Si puede fallar/validar, no estás reaccionando a un hecho: es un **comando** — hazlo explícito.

> [!NOTE]
> ⚖️ Esto resume la **postura del equipo** para `Cosmos.BuildingBlocks`: **un mecanismo por caso**, no un "evento → cola en memoria → handler" para todo. La frontera entre la regla 2 y la 3 la decide el **criterio de Vernon** ([El almacén directo](el-almacen-directo.md)): ¿dejar consistente es trabajo del usuario de este caso de uso, o de otro/del sistema?

---

### El Descubrimiento

El broker te deja publicar **lo que sea** — el criterio lo pones tú. Antes de un `IPublicEvent`, cuatro preguntas: **¿topic por servicio o por evento?** (táctico), **¿evento o comando?** (si espero respuesta → gRPC, no un evento disfrazado), **¿se forma un ciclo?** (acoplamiento), **¿quién coordina el proceso?** (coreografía vs orquestación). Un evento mal elegido te da lo **peor del async y del sync** a la vez.

> [!NOTE]
> 🌱 **Semilla — esto se profundiza en el taller ⑤ Microservicios.** Aquí tienes el **criterio** para razonar estas decisiones desde un servicio que publica eventos. El tratamiento **a fondo** —sagas y orquestadores, transacciones distribuidas, resiliencia, descomposición y comunicación entre **N** servicios— es el siguiente taller de la academia: **⑤ Microservicios** ([índice de la academia](../../README.md)). Esta sección **siembra** ese terreno; allá lo construirás.

---

## ✅ Compruébalo

- [ ] Explicas por qué **"un exchange por servicio + ruteo por tipo"** responde la pregunta de "uno o dos topics" sin que los topics proliferen.
- [ ] Distingues **evento** (no espero) de **comando/request** (espero), y reconoces el smell de **esperar una respuesta por eventos** (acoplamiento temporal) → cuándo conviene **gRPC** en su lugar.
- [ ] Identificas una **dependencia circular** A→B→A y por qué huele (peor si es transaccional); y por qué un *smell* **no** es lo mismo que un antipatrón.
- [ ] Distingues **coreografía** (sin coordinador) de **orquestación** (con coordinador/saga), y cuándo conviene cada una.

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 El último evento público que publicaste, ¿era de verdad un **hecho** (no esperabas respuesta), o un **request disfrazado**? ¿Cómo lo decidirías?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git commit --allow-empty -m "ES · Diseñar con eventos" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El broker publica lo que le des; el **diseño** es tuyo: topic **por servicio** (no por evento) + ruteo por tipo; **evento** solo si no esperas respuesta (si esperas, es un **comando** → gRPC, no un evento disfrazado que te acopla en el tiempo); ojo a las **dependencias circulares** (smell, no siempre antipatrón); y para procesos con pasos, **orquestación** > coreografía — todo lo cual el taller **⑤ Microservicios** lleva a fondo.

---

[⬅️ Volver: Transportes reales (RabbitMQ y Azure Service Bus)](./transportes-rabbitmq-asb.md)

[➡️ Siguiente: Serverless — la plantilla en Azure Functions](./serverless-azure-functions.md)

> Si despliegas en contenedores (no serverless), puedes **saltar [Serverless (Azure Functions)](serverless-azure-functions.md)** e ir directo a [CQRS y proyecciones](./cqrs-proyecciones.md) — pero léela cuando toques Azure Functions.
