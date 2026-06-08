# Fase 2 — Orquestación con Docker Swarm

> **Meta de la fase:** Dejar de correr la app en **una sola máquina** y pasarla a un **clúster**: varios servidores que trabajan como uno solo, con **varias réplicas** de la API, que **reparten la carga** y se **recuperan solas** si algo cae. Darás el salto natural desde `docker compose` (un host) a **Docker Swarm** (muchos hosts).

---

## La fragilidad que resolvemos

En el básico, tu app corría en una sola máquina con `docker compose`, y la infraestructura que declaraste en la Fase 1 es también **un solo host**. Eso significa: si esa máquina se satura, no puedes repartir el trabajo; si el contenedor (o la VM) se cae, alguien tiene que levantarlo a mano; y solo hay **una** copia de la API. Un orquestador resuelve las tres cosas: corre **varias copias** repartidas en **varios nodos**, y las mantiene vivas automáticamente.

> 🧩 Reutilizaremos lo de la Fase 1: con **Terraform** crearemos los nodos del clúster. La infraestructura como código y la orquestación trabajan juntas.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [El límite de un solo host](01-el-limite-de-un-host.md) | Entender qué es un orquestador | 20 min |
| 2 | [Crear el clúster](02-crear-el-cluster.md) | Un clúster Swarm de varios nodos | 40 min |
| 3 | [De compose a stack](03-de-compose-a-stack.md) | Desplegar la app al clúster con réplicas | 40 min |
| 4 | [Redes overlay](04-redes-overlay.md) | Comunicar los servicios entre nodos | 30 min |
| 5 | [Escalar y auto-recuperar](05-escalar-y-recuperar.md) | Ver el clúster escalar y sanarse solo | 30 min |

> 💰 Esta fase usa **dos** VMs (un manager + un worker); la base de datos correrá como un servicio del propio stack, anclada al manager. Recuerda apagar las VMs (`az vm deallocate`) o destruir con `terraform destroy` al terminar cada sesión.

---

**➡️ Empieza en:** [El límite de un solo host](01-el-limite-de-un-host.md)
