# Fase 1 — Infraestructura como Código (Terraform)

> **Meta de la fase:** Dejar de crear servidores a mano. Aprenderás **Terraform** para describir tu infraestructura en archivos de texto, versionados en Git, que se crean y destruyen con un comando — reproducibles, revisables y sin sorpresas.

---

## La fragilidad que resolvemos

En el básico creaste tu servidor con comandos `az` sueltos en la terminal. Funcionó, pero esos comandos no quedaron en ningún lado: si tuvieras que recrear esa infraestructura, tendrías que recordar cada comando, en orden, con los mismos valores. Y si alguien cambia algo a mano en el portal, nadie se entera. Eso no escala ni es confiable.

Con **Infraestructura como Código** tu servidor pasa a ser un archivo que vive en tu repositorio, junto a tu código.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [El problema de hacerlo a mano](01-el-problema-de-hacerlo-a-mano.md) | Entender qué es IaC y por qué | 20 min |
| 2 | [Tu primer Terraform](02-tu-primer-terraform.md) | Crear el grupo de recursos como código | 35 min |
| 3 | Declarar el servidor | Recrear la VM del básico con Terraform | 40 min |
| 4 | El estado de Terraform | Entender el `state` y por qué importa | 25 min |
| 5 | Variables y reutilización | Parametrizar la infraestructura | 30 min |
| 6 | Destruir y recrear | La magia de IaC + versionar en Git | 25 min |

> Las lecciones 3 a 6 se construirán después de validar el estilo de las dos primeras.

---

**➡️ Empieza en:** [El problema de hacerlo a mano](01-el-problema-de-hacerlo-a-mano.md)
