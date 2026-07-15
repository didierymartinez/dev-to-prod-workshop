# Outbox e Inbox: que el mensaje no se pierda

Ya publicas `EmpresaSuspendida` hacia facturación, con su [sobre](el-sobre.md). Pero guardas el evento en Postgres **y** lo mandas al bus: **dos sistemas distintos** que no se pueden hacer atómicos. Es el problema que [Suscripciones](suscripciones.md) dejó anotado, y que `IntegrateWithWolverine` ya venía preparando.

## 🎯 El Objetivo

Hacer que un mensaje publicado **sobreviva a la muerte del proceso**: escribirlo en la **misma transacción** que el evento (un **outbox** durable en Postgres) y que un worker lo **drene** al bus después. Y el espejo en el receptor: el **inbox**.

## 💥 El dolor: la escritura doble (dual-write)

Publicar "de una" hace dos escrituras a dos sistemas:

```
1. session.SaveChangesAsync()   → el evento queda en Postgres
2. bus.PublishAsync(hecho)       → el hecho sale al broker
```

No hay forma de envolver ambas en una sola transacción: Postgres y el broker no se coordinan. Si el proceso cae después del paso 1 y antes del 2, el evento existe pero **nadie afuera lo sabe**, para siempre. Si inviertes el orden, publicas algo que quizás no se guardó. Necesitas que "guardar el hecho" y "encolar su publicación" sean **una sola cosa** que se confirma junta o no se confirma.

## 🔧 El outbox y el inbox

### Paso 1 · Una transacción, no dos

La idea del **outbox**: en vez de mandar el hecho al broker directamente, lo escribes en una **tabla de salientes en la misma Postgres** de Marten — dentro de la **misma transacción** que el evento. O se guardan los dos, o ninguno. Luego, un worker aparte lee esa tabla y publica al broker.

Aquí hay que separar dos cosas. `IntegrateWithWolverine()` (de [Revelar Wolverine](revelar-wolverine.md)) montó la **infraestructura** del outbox: las tablas y la sesión compartida con Marten. Pero el envío sigue siendo **directo** hasta que marcas el endpoint como **durable**. `UseDurableOutbox` hace que publicar **deje una fila** en la tabla de salientes, en vez de mandar al broker de una. Como esa fila se escribe en la sesión compartida, entra en la **misma transacción** que el evento (la que `AutoApplyTransactions()` confirma).

Enciéndelo por política, en todos los endpoints de salida — es un flag de config de Wolverine (inguessable), así que aquí te lo muestro:

```csharp
// por política, en todos los endpoints de salida: publicar deja una fila en el outbox, no un envío directo
opts.Policies.UseDurableOutboxOnAllSendingEndpoints();
// (afinar el outbox en la ruta de un mensaje concreto se ve en Transportes, con el transporte real)
```

> [!NOTE]
> 🆕 **Patrón outbox (durable).** "Durable" = el mensaje saliente se **persiste** en Postgres antes de salir, en la misma transacción que el evento. Como comparten transacción, es **imposible** que quede el evento sin su mensaje: la atomicidad que dos sistemas no te daban, la da **una** base de datos. Es el pago de haber montado todo sobre Marten + Postgres.

### Paso 2 · El worker drena el outbox

Guardado el saliente, ¿quién lo manda al broker? Un **worker en segundo plano** de Wolverine —su agente de durabilidad— lee la tabla de salientes y publica cada fila, marcándola como enviada. Es el mismo patrón del **daemon** que ya viste en [El daemon de proyecciones](daemon-proyecciones.md): trabajo que ocurre **fuera** de tu transacción de escritura, en un proceso que retoma donde quedó.

Si el proceso muere con filas sin drenar, al reiniciar el worker las encuentra y las publica. Por eso la entrega es **al-menos-una-vez**: un mensaje puede salir **más de una vez** (drenado, caída antes de marcarlo, reintento). El receptor tiene que tolerarlo — y ahí entra el inbox.

> 🔍 **¿Lo lograste?** Con Postgres arriba —y aún **sin broker** (lo levantas en [Transportes](transportes.md))—, arranca (`dotnet run`) y suspende `emp-7` con el `curl` de [Revelar Wolverine](revelar-wolverine.md): `curl -X POST .../empresas/emp-7/suspender -d '{"Motivo":"impago"}'`. Consulta la tabla de salientes: `docker exec -it gestion_eventstore psql -U gestion -d gestion_eventstore -c "select id, message_type from wolverine_outgoing_envelopes;"` — la fila del `EmpresaSuspendida` está ahí, junto al evento en `mt_events`, **en la misma base**, esperando. Ese "queda guardada aunque no salga" es lo que hace que el mensaje **sobreviva** a una caída: no depende de que el proceso siga vivo para publicar. (Cuando levantes el broker en Transportes, el worker drenará esa fila y desaparecerá.)

### Paso 3 · El inbox: el espejo en el receptor

Facturación recibe el mensaje. Como la entrega es al-menos-una-vez, podría **recibir el mismo dos veces**. El **inbox** es el outbox al revés: el receptor escribe el mensaje entrante en una **tabla de entrantes** antes de procesarlo. ¿Cómo sabe que dos son el mismo? Cada mensaje lleva un **id único** en su sobre; el inbox registra ese id y descarta uno ya visto. Y si el proceso cae a mitad, al reiniciar retoma el pendiente.

En el receptor, el espejo es igual de directo — otra línea de config de Wolverine, que te muestro:

```csharp
// por política, en todos los listeners:
opts.Policies.UseDurableInboxOnAllListeners();

// o al suscribirse a una cola concreta:
opts.ListenToRabbitQueue(nombreDeLaCola)
    .UseDurableInbox();
```

> [!NOTE]
> 🆕 **Patrón inbox.** El entrante se persiste antes de procesarse. Da dos cosas: **de-duplicación** (un mensaje repetido no se procesa dos veces) y **reanudación** (si el proceso cae, retoma el pendiente al reiniciar). Junto con el outbox recortan las reentregas: el mensaje sale sí o sí, y el inbox descarta duplicados **del transporte**. Ojo: eso **no te exime** de la idempotencia que exigía [Suscripciones](suscripciones.md). El inbox de-duplica a nivel de mensaje; tu efecto sigue siendo tu red de seguridad, porque el inbox no cubre todo (p. ej. un reintento tras fallar a mitad de procesar). De cara a tu lógica, sigue siendo **al-menos-una-vez**.

---

### El Descubrimiento

Cerraste el hueco del **dual-write**. El **outbox** guarda el mensaje saliente en la **misma transacción** que el evento (gracias a `IntegrateWithWolverine`, ambos viven en la Postgres de Marten), así que es imposible que el hecho quede sin publicar; un **worker** lo drena al bus después, con reintento si el proceso muere. El **inbox** es el espejo en el receptor: de-duplica los reenvíos del transporte y reanuda tras una caída. La entrega sigue siendo **al-menos-una-vez**; el inbox recorta duplicados, pero la **idempotencia** de tu efecto (la de [Suscripciones](suscripciones.md)) sigue siendo la red que garantiza el efecto único. Esto es lo que un bus "fiable" significa de verdad — y ahora sabes qué lo hace fiable.

> [!NOTE]
> 🌱 **Semilla — falta el cable.** Tienes el outbox, el inbox y el sobre. Falta **por dónde** viaja el mensaje entre servicios: el **transporte**. La plantilla usa dos —RabbitMQ y Azure Service Bus— y elegir/configurar cada uno trae decisiones de criterio (¿quién crea las colas?, ¿qué pasa con un evento sin ruta?). Lo ves en [Transportes reales](transportes.md).

---

## ✅ Compruébalo

- [ ] Explicas el **dual-write**: por qué guardar el evento y publicar al bus son dos sistemas que no se pueden hacer atómicos.
- [ ] Encendiste el **outbox durable** (`UseDurableOutbox` / `UseDurableOutboxOnAllSendingEndpoints`).
- [ ] Explicas que `IntegrateWithWolverine` pone el outbox en la **misma Postgres** y por eso evento + saliente comparten transacción.
- [ ] Un **worker** drena el outbox al bus; si el proceso muere, reintenta al reiniciar (**al-menos-una-vez**).
- [ ] Encendiste el **inbox durable** (`UseDurableInbox` / `UseDurableInboxOnAllListeners`) y explicas qué te da (de-dup + reanudar).

---

## 📓 Registra tu avance

Piensa la respuesta a esto (es tu reflexión de la sección):

> 💭 ¿Por qué guardar el evento y publicarlo al bus "de una" es frágil? ¿Cómo hace el outbox que sean atómicos sin coordinar dos sistemas, y qué te obliga a garantizar el inbox en el receptor?

Y **escríbela tú, con tus palabras, en el mensaje del commit** — reemplaza el placeholder, no pegues la pregunta:

```bash
git add .
git commit -m "ES · Outbox e Inbox: que el mensaje no se pierda" -m "<aquí TU respuesta, con tus palabras>"
git push
```

---

## 🧠 En una frase

El **outbox** escribe el mensaje saliente en la **misma transacción** que el evento (ambos en la Postgres de Marten, vía `IntegrateWithWolverine`) para que sea imposible perderlo, y un **worker** lo drena al bus después; el **inbox** es el espejo en el receptor (de-dup + reanudar) — recortan las reentregas del transporte, aunque la **idempotencia** de tu efecto sigue siendo la red que garantiza el efecto único.

---

[⬅️ Volver: El sobre](./el-sobre.md)

[➡️ Siguiente: Transportes reales](./transportes.md)
