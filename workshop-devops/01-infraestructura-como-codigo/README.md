# Fase 1 — Infraestructura como Código (Terraform)

> **Meta de la fase:** Dejar de crear servidores a mano. Aprenderás **Terraform** para describir tu infraestructura en archivos de texto, versionados en Git, que se crean y destruyen con un comando — reproducibles, revisables y sin sorpresas.

---

## La fragilidad que resolvemos

En el básico creaste tu servidor con comandos `az` sueltos en la terminal. Funcionó, pero esos comandos no quedaron en ningún lado: si tuvieras que recrear esa infraestructura, tendrías que recordar cada comando, en orden, con los mismos valores. Y si alguien cambia algo a mano en el portal, nadie se entera. Eso no escala ni es confiable.

Con **Infraestructura como Código** tu servidor pasa a ser un archivo que vive en tu repositorio, junto a tu código.

> 🧭 **Empezamos simple, a propósito.** Tu básico terminó con dos máquinas (la app y la base de datos separada en su propia VM privada) y un gateway. Recrear todo eso de golpe ahogaría el aprendizaje de Terraform. Por eso en esta fase declaramos como código una **versión simple**: una sola VM que corre la app, expuesta en el puerto 5000 (sin gateway todavía). A lo largo del taller **reconstruiremos como código —y mejoraremos— la arquitectura completa**: el clúster en la Fase 2, los secretos en la 4, los entornos en la 6. El objetivo de la Fase 1 es dominar Terraform, no reproducir toda la complejidad de una vez.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [El problema de hacerlo a mano](01-el-problema-de-hacerlo-a-mano.md) | Entender qué es IaC y por qué | 20 min |
| 2 | [Tu primer Terraform](02-tu-primer-terraform.md) | Crear el grupo de recursos como código | 35 min |
| 3 | [Declarar el servidor](03-declarar-el-servidor.md) | Recrear la VM del básico con Terraform | 40 min |
| 4 | [El estado de Terraform](04-el-estado-de-terraform.md) | Entender el `state` y por qué importa | 25 min |
| 5 | [Variables y reutilización](05-variables-y-reutilizacion.md) | Parametrizar la infraestructura | 30 min |
| 6 | [Destruir y recrear](06-destruir-y-recrear.md) | La magia de IaC + versionar en Git | 25 min |

---

**➡️ Empieza en:** [El problema de hacerlo a mano](01-el-problema-de-hacerlo-a-mano.md)
