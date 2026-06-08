# Fase 3 — Despliegues sin downtime

> **Meta de la fase:** Que actualizar tu aplicación **no tumbe el servicio**. Cuando publiques una versión nueva, las réplicas se reemplazarán **de a poco** y solo si la nueva está sana; y si algo sale mal, podrás **volver atrás** con un comando.

---

## La fragilidad que resolvemos

Tu app ya corre en un clúster con réplicas (Fase 2). Pero, ¿qué pasa cuando despliegas una versión nueva? Si Swarm tumba las réplicas viejas y arranca las nuevas sin cuidado, los usuarios ven errores durante la transición — y si la versión nueva está rota, te quedas con el servicio caído. Vamos a hacer que las actualizaciones sean **graduales, verificadas y reversibles**.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Health checks: que el clúster sepa si tu app está sana](01-health-checks.md) | La app reporta su salud; Swarm la vigila | 35 min |
| 2 | [Rolling updates](02-rolling-updates.md) | Actualizar sin cortar el servicio | 35 min |
| 3 | [Rollback](03-rollback.md) | Volver atrás cuando un despliegue falla | 25 min |

> Necesitas el clúster Swarm de la Fase 2 encendido (`az vm start` los dos nodos si los apagaste) con el stack `gestion` desplegado.

---

**➡️ Empieza en:** [Health checks](01-health-checks.md)
