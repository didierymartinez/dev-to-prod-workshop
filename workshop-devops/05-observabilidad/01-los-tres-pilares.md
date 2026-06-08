# Lección 5.1 — Estás ciego en producción: los tres pilares

> ⏱️ 20 minutos · 🎯 **Al terminar:** distinguirás los tres pilares de la observabilidad —**logs**, **métricas** y **trazas**—, sabrás para qué sirve cada uno y por qué en un clúster necesitas **centralizarlos**. Lección de **conceptos**.

---

## 🤔 El problema

Tu plataforma se ve sólida: clúster que escala, despliegues sin caídas, secretos en su sitio. Pero respóndete esto, hoy mismo:

- ¿Cuántas peticiones por segundo está atendiendo la API ahora?
- ¿Qué réplica consume más memoria? ¿Alguna se reinició anoche?
- Un usuario dice que "a las 3 de la tarde la app se puso lenta". ¿Qué pasó a esa hora?

Con lo que tienes hoy, la única respuesta es: entrar por SSH al nodo correcto, correr `docker logs` y **adivinar**. Y para las preguntas de "¿cuánto?" o "¿qué tan rápido?", ni eso. Estás **ciego**: solo te enteras de los problemas cuando ya explotaron o cuando se queja un usuario.

Operar en serio es lo contrario: el sistema **te cuenta** lo que le pasa, y tú puedes **preguntarle** cosas que no anticipaste.

---

## 💡 Conceptos

### Monitoreo vs. observabilidad

- **Monitoreo** responde preguntas que ya sabías hacer: *¿está arriba? ¿la CPU pasa del 80%?* Tableros y chequeos fijos.
- **Observabilidad** es poder responder preguntas que **no** anticipaste sobre el estado interno del sistema, a partir de lo que éste emite. *¿Por qué solo fallan las peticiones de un cliente, los martes, desde una réplica?*

No necesitas dominar la distinción; quédate con la idea: queremos que el sistema **emita** suficiente información como para investigar lo inesperado.

### Los tres pilares

| Pilar | Qué es | Responde | Ejemplo |
|---|---|---|---|
| **Logs** | Eventos discretos con marca de tiempo (líneas de texto) | *¿Qué pasó exactamente?* | `2026-06-08 15:00:12 ERROR no se pudo conectar a la BD` |
| **Métricas** | Números medidos en el tiempo (series temporales) | *¿Cuánto? ¿Qué tan rápido? ¿Cuántos?* | CPU 73%, 240 peticiones/min, latencia 120 ms |
| **Trazas** | El recorrido de **una** petición a través de los servicios | *¿Dónde se fue el tiempo?* | "esta petición tardó 800 ms: 50 en la API, 750 en la BD" |

- Los **logs** son ideales para el **detalle** y para depurar un caso concreto. Pero son caros de guardar en volumen y difíciles de agregar.
- Las **métricas** son baratas de almacenar y perfectas para **tendencias** y **alertas** ("avísame si la memoria sube de 90%"). No te dan el detalle de un caso puntual.
- Las **trazas** brillan cuando una petición cruza **varios servicios** (microservicios). Con una sola app son menos urgentes — por eso las verás a fondo en el **taller avanzado**, no aquí.

> 🧠 Regla práctica: usa **métricas** para saber *que* algo va mal (y para alertar), y **logs** para entender *por qué*. Las trazas conectan ambos cuando hay muchos servicios.

### Por qué un clúster lo complica

En el básico tenías un servidor: los logs estaban en un solo `docker logs`. Ahora tienes **varios nodos** y **varias réplicas** de cada servicio. Los logs de la API están repartidos en 3 contenedores que viven en máquinas distintas; las métricas de CPU están en cada nodo por separado. Investigar "saltando por SSH de máquina en máquina" no escala.

La solución es **centralizar**: que todos los nodos envíen sus logs y métricas a un lugar único donde puedas **buscar y graficar**.

### Lo que vas a montar en esta fase

Todo como contenedores en tu propio clúster (sin instalar nada local):

```
   LOGS                          MÉTRICAS                      ALERTAS
   Promtail (un agente por        Prometheus (recolecta          Alertmanager (recibe
   nodo) → Loki (almacén)         métricas de cada nodo,          alertas de Prometheus,
                                   contenedor y de la API)         agrupa y notifica)
        \                              /                                  |
         \                            /                                   |
              Grafana  (un solo panel para ver logs y métricas)      Slack / email / etc.
```

- **5.2** — Logs centralizados con **Loki + Promtail**, vistos en **Grafana**.
- **5.3** — Métricas con **Prometheus** (+ exporters), graficadas en el **mismo Grafana**.
- **5.4** — **Alertas** que disparan una notificación antes de que el usuario note el problema.

---

## ✅ Compruébalo

Responde con tus palabras:

- [ ] ¿Qué diferencia hay entre un **log** y una **métrica**? Da un ejemplo de cada uno.
- [ ] ¿Qué pilar usarías para responder *"¿cuántas peticiones por segundo atendemos?"* y cuál para *"¿por qué falló esta petición concreta a las 3 pm?"*?
- [ ] ¿Por qué tener un clúster con varios nodos y réplicas obliga a **centralizar** logs y métricas?

---

## 🧠 Lo que aprendiste

- La **observabilidad** es poder responder preguntas no anticipadas sobre tu sistema a partir de lo que emite (va más allá del monitoreo fijo).
- Tres pilares: **logs** (qué pasó), **métricas** (cuánto/qué tan rápido, ideales para tendencias y alertas) y **trazas** (recorrido de una petición; clave en microservicios).
- En un clúster, logs y métricas están **repartidos**: hay que **centralizarlos** para buscar y graficar.
- En esta fase montarás logs (Loki + Promtail), métricas (Prometheus) y alertas (Alertmanager), todo visto en **Grafana**.

---

**➡️ Siguiente:** [Logs centralizados](02-logs-centralizados.md)
