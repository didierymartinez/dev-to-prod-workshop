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
> 💡 Esto **no** es la decisión de fondo. La granularidad es táctica; las tres que siguen son las que de verdad muerden.

## Decisión 2 — ¿evento… o lo estás forzando? (la grande)

Un **evento** dice *"esto ya pasó"*: fire-and-forget, el emisor **no espera respuesta** ni sabe (ni le importa) quién escucha. Un **comando / request** dice *"haz esto"*: espera un resultado.

**La señal de alarma:** si después de publicar te quedas **esperando** un evento de vuelta (`TerceroCreado`/`TerceroRechazado`) **para continuar tu propio flujo**, no estás haciendo EDA — estás haciendo un **request-reply disfrazado de eventos**. Eso es **acoplamiento temporal**: pagas la complejidad del async (broker, outbox, correlacionar la respuesta) **y** sufres la rigidez del sync (esperas igual). El peor de los dos mundos.

La regla práctica:

> **¿El emisor necesita el resultado para seguir?** → es una **pregunta**: usa **request-reply síncrono** (gRPC/HTTP). → **No** → es un **hecho**: usa un **evento**.

"Tercero creado o rechazado" suele ser una **pregunta** ("¿me aprobaste este tercero?") cuando el flujo de origen **se bloquea** esperándola: ahí gRPC encaja mejor que un evento. Un evento brilla cuando **notificas un hecho y otros reaccionan a su ritmo**, sin que tú esperes. (Es justo lo que se nota en la práctica: *"servicios que deberían comunicarse por gRPC y los forzamos a un eventual… terminamos esperando respuesta"* — ese es el smell.)

## Decisión 3 — el acoplamiento que los eventos esconden

Los eventos desacoplan en el **espacio** (el emisor no conoce al consumidor) — pero pueden **acoplarte en el tiempo y en el flujo** si los usas para *coordinar* un proceso. Dos olores:

- **Dependencia circular:** A emite → B escucha → B emite → A escucha. Si los dos lados son el **mismo proceso de negocio** (transaccional), tienes una **saga implícita sin dueño**: nadie ve el proceso completo, y recuperarte de un fallo a mitad de camino es una pesadilla.
- **Smell ≠ antipatrón:** un *smell* no significa que esté mal — significa que **vale la pena mirarlo**. Un ciclo entre servicios puede ser legítimo (eventual, sin transacción compartida) o un grito de que eso debería ser una llamada síncrona o un proceso con coordinador.

## Decisión 4 — ¿quién manda el proceso? coreografía vs orquestación

Cuando un hecho dispara una cadena (`RegistroObligacionCreado` → crear/rechazar tercero → …), hay dos formas de coordinarla:

- **Coreografía:** cada servicio reacciona a eventos, sin coordinador central. Flexible y desacoplado — pero **el "proceso completo" no vive en ningún lado**: emerge de quién-escucha-a-quién, y se vuelve difícil de ver y depurar cuando crece.
- **Orquestación:** un **coordinador** (un orquestador / una *saga*) dice los pasos y las compensaciones. El proceso queda **explícito y visible**, a costa de un punto central.

Regla de pulgar: para *notificaciones* sueltas, coreografía; para un **proceso con pasos, resultados y compensaciones**, una saga/orquestador suele razonarse mejor que pura coreografía.

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
