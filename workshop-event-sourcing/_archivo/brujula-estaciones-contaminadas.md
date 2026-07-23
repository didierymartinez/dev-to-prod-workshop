# ⚠️ ARCHIVADO — mapa de estaciones pre-dibujado (NO SEGUIR)

> Este era el cuerpo de `CRITTERWATCH-BRUJULA.md`: una tabla de 7 estaciones + una bitácora de la Estación 1.
> Se **archivó** el 2026-07-23 por decisión del autor. Diagnóstico del panel adversarial (`replanteo-arco-es-diagnostico`, jul 2026):
> estaba construido **en reversa** desde la respuesta ya conocida (Marten + el producto Critter Watch). Cada "estación"
> mapea 1:1 a una sección del canon borrado (§10-39), en casi el mismo orden. Un mapa completo —por "vivido" que se
> declare— es una caminata hacia atrás desde el destino, y eso es justo lo que volvió la 2ª mitad un "tour de herramientas".
> **La Estación 1 (rezago) NO nació de correr §9 y chocar con un muro; salió de esta tabla.** Por eso queda aquí como
> referencia histórica, no como plan. El norte y el método vivos están en `CRITTERWATCH-BRUJULA.md`.

---

## Las estaciones (tabla contaminada — pre-dibujada desde la librería)

| # | El dolor (lo que quieres VER) | Usas (ya lo tienes) | Descubres (para observarlo) |
|---|---|---|---|
| 1 | ¿mis read models van al día, o el daemon se atascó? | proyecciones · daemon · consistencia eventual | checkpoint + high water mark; rezago = HWM − checkpoint |
| 2 | Ver los hechos entrar en vivo, stream por stream | event store · SignalR | una suscripción catch-up que empuja cada evento al panel |
| 3 | Mi proyección da un valor raro — ¿en qué evento se torció? | replay/fold · proyección | rejugar la proyección paso a paso con el diff (Projection Stepper) |
| 4 | ¿Qué mensajes fallaron, y por qué? | suscripciones · dead-letter · outbox | leer la DLQ, agrupar por excepción |
| 5 | ¿Por dónde viajó un hecho de un servicio a otro? | público/privado · sobre · transportes | seguir el correlation/causation id por outbox y bus |
| 6 | Avísame cuando el rezago pase de un umbral | todo | un agregado `Alerta` (raised→resolved) event-sourced |
| 7 | ¿Qué tenant va atrasado? | multi-tenancy conjoined | segmentar la progresión/eventos por tenant |

## Bitácora de la Estación 1 (contaminada — la respuesta de Marten ya estaba escrita antes de vivir el dolor)

- Dolor: en el daemon aceptaste consistencia eventual — ¿un pelín atrás, o atascado?
- El "ahh claro": el daemon retoma tras reiniciar → Marten ya guarda hasta dónde llegó cada proyección.
- Descubrimiento (Marten 9.x, verificado en spike):
  - checkpoint → `store.Advanced.AllProjectionProgress()` → `ShardState`.
  - high water mark → `store.Advanced.ProjectionProgressFor(new ShardName(ShardState.HighWaterMark))` / `FetchEventStoreStatistics().EventSequenceNumber`.
  - rezago = HWM − checkpoint; vive en la tabla `mt_event_progression`.

> El tell que lo delata: se podía escribir Q1..Q9 con su API de Marten al lado **antes** de vivir ningún muro. Descubrimiento genuino no puede hacer eso.
