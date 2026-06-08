# Fase 6 — Entornos y CD avanzado

> **Meta de la fase:** Dejar de desplegar directo a un único entorno "a ciegas". Crearás un **staging** aislado e idéntico a producción (mismo código de Terraform), automatizarás el despliegue a tu **clúster Swarm**, y **promoverás** el mismo artefacto de staging a producción **con una aprobación manual**. Al final, tu pipeline no se repetirá: lo extraerás a un **workflow reutilizable**.

---

## La fragilidad que resolvemos

Tienes **un solo entorno**. Cada `push` a `main` va directo a la única máquina que tienes — que para tus usuarios *es* producción. Si un cambio rompe algo, lo descubren ellos. No hay un lugar "igual a producción pero seguro" donde probar antes de soltar. Y el despliegue al clúster Swarm, hasta ahora, lo hiciste **a mano** (`scp` + `ssh` + `docker stack deploy`). Vamos a cerrar ese círculo: varios entornos, despliegue automático y una **compuerta de aprobación** antes de tocar producción.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [El riesgo de un solo entorno](01-el-riesgo-de-un-solo-entorno.md) | Entender dev/staging/prod y la promoción | 20 min |
| 2 | [Crear staging con Terraform](02-crear-staging-con-terraform.md) | Dos entornos aislados desde un mismo código (workspaces) | 40 min |
| 3 | [Promoción con aprobación](03-promocion-con-aprobacion.md) | Pipeline staging → (aprobación) → producción | 45 min |
| 4 | [Pipelines reutilizables](04-pipelines-reutilizables.md) | Un workflow de despliegue sin copy-paste | 35 min |

> Necesitas el repo `gestion-empresas` con su Terraform (Fase 1-4), el `stack.yml` (Fase 2-4) y el pipeline del básico (`.github/workflows/deploy.yml`).

> 💰 **Ojo al gasto:** tener staging **y** producción significa **dos clústeres** (más VMs). La compuerta de aprobación te ayuda: el despliegue a producción **espera** tu visto bueno, así solo enciendes prod cuando vas a aprobarlo. Cada lección recuerda cómo destruir; usa tamaños pequeños y limpia al terminar.

---

**➡️ Empieza en:** [El riesgo de un solo entorno](01-el-riesgo-de-un-solo-entorno.md)
