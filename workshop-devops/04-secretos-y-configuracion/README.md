# Fase 4 — Secretos y configuración

> **Meta de la fase:** Sacar la contraseña de la base de datos —y cualquier otro secreto— de los archivos y las variables de entorno, y guardarla donde debe estar: en **secretos del clúster** y en un **cofre gestionado** (Azure Key Vault). De paso, separarás la **configuración** que cambia entre entornos.

---

## La fragilidad que resolvemos

En cada despliegue repetiste `export DB_PASSWORD="Clave_Servidor_2024"`. Esa contraseña viaja **en texto plano**: en tu terminal, en el historial del shell, y visible para cualquiera que haga `docker service inspect`. Rotarla implica cambiarla en varios sitios. Es justo lo que un atacante busca. Vamos a tratarla como lo que es: un **secreto**.

---

## Lecciones de esta fase

| # | Lección | Qué logras | Tiempo |
|---|---------|------------|--------|
| 1 | [Config vs secreto: por qué el entorno no basta](01-config-vs-secreto.md) | Entender qué es un secreto y por qué el entorno no basta | 20 min |
| 2 | [Secretos del clúster (docker secret)](02-docker-secret.md) | La contraseña fuera de los archivos, montada como secreto | 40 min |
| 3 | [Un cofre gestionado: Azure Key Vault](03-key-vault.md) | El secreto en un cofre con auditoría y rotación | 35 min |
| 4 | [Configuración por entorno](04-configuracion-por-entorno.md) | Separar lo que cambia entre dev y prod | 25 min |

> Necesitas el clúster Swarm de las fases anteriores con el stack `gestion` desplegado.

---

**➡️ Empieza en:** [Config vs secreto](01-config-vs-secreto.md)
