# Taller: DevOps — Operar Software en Producción

La evolución del taller básico. Si en el básico aprendiste a **desplegar** una aplicación, aquí aprenderás a **operarla** como lo hace un equipo profesional: infraestructura reproducible, varios servidores orquestados, despliegues sin caídas, secretos gestionados, visibilidad de producción y seguridad en el pipeline.

---

**Continuamos donde quedó el básico.** Damos por sabido lo que enseñó (Git, Docker, `docker compose`, una API, CI/CD simple). **No** damos por sabido nada de DevOps: cada herramienta y concepto nuevo —Terraform, Docker Swarm, observabilidad— se explica antes de usarse.

---

## ¿Qué vas a lograr?

Tomarás la misma aplicación del básico (`gestion-empresas`) y la llevarás de *"está desplegada"* a *"está operada con criterio profesional"*:

- Su infraestructura dejará de crearse a mano y pasará a ser **código versionado** (Terraform).
- Dejará de correr en una sola máquina y pasará a un **clúster** que escala y se recupera solo (Docker Swarm).
- Se actualizará **sin downtime**, con posibilidad de **rollback**.
- Sus secretos vivirán en un **cofre**, no en archivos.
- Sabrás **qué pasa en producción** (logs, métricas, alertas).
- Tendrá **entornos** separados (staging/prod) y un pipeline con control.
- Su pipeline **revisará vulnerabilidades** automáticamente.

## El problema que resuelve este taller

Al terminar el básico, tu aplicación funcionaba en internet. Pero quedaron fragilidades que ningún equipo serio acepta en producción:

```
• La infraestructura se creó a mano (comandos sueltos): no es reproducible.
• Corre en una sola máquina: no escala y cada despliegue la tumba un momento.
• Los secretos viven en archivos .env en el servidor.
• No sabes qué pasa adentro: estás ciego salvo por "docker logs".
• Hay un solo entorno: se despliega directo a producción.
• Nadie revisa si las imágenes o dependencias tienen vulnerabilidades.
```

Cada fase de este taller ataca una de esas fragilidades.

## Cómo está organizado

Igual que el básico: **fases** (carpetas) con **lecciones cortas** (20-45 min). Cada lección sigue la misma estructura — 🤔 el problema → 💡 conceptos → 🛠️ manos a la obra → ✅ compruébalo → 🧠 lo que aprendiste → 🆘 si algo salió mal — y mantiene la filosofía: **manual primero, automatizar después**, el problema antes de la solución, y `commit` + `push` en cada práctica.

## El mapa: las fases

| Fase | Carpeta | Lo que logras | Concepto central |
|---|---|---|---|
| **0** | `00-que-es-devops/` | Entender el porqué y preparar el entorno | Cultura DevOps |
| **1** | `01-infraestructura-como-codigo/` | Infra declarada y versionada | Terraform |
| **2** | `02-orquestacion-swarm/` | De un host a un clúster | Docker Swarm |
| **3** | `03-despliegues-sin-downtime/` | Actualizar sin caídas | Rolling updates + rollback |
| **4** | `04-secretos-y-configuracion/` | Secretos fuera del código | Docker secrets + Key Vault |
| **5** | `05-observabilidad/` | Ver qué pasa en producción | Logs + métricas + alertas |
| **6** | `06-entornos-y-cd-avanzado/` | Dev/staging/prod con control | Entornos + promoción |
| **7** | `07-seguridad-devsecops/` | Seguridad en el pipeline | Escaneo + identidades |
| **8** | `08-cierre/` | Panorama y próximos pasos | SRE, plataformas, GitOps |

> 🧭 **Sobre el orden:** como en el básico, primero entiendes el dolor (o haces algo a mano) y luego lo mejoras. Cada fase parte de una fragilidad concreta que quedó del básico.

## Prerequisitos

- Haber hecho el **taller básico** (o manejar Git, Docker, `docker compose`, una API y un CI/CD simple).
- Cuenta de **GitHub** y de **Azure** (las del básico).
- Herramientas del básico: Git, Docker, Azure CLI. **Nueva:** Terraform (la instalas en la Fase 0).

> 💰 **Costos:** este taller usa varias máquinas pequeñas en Azure (un clúster Swarm + base de datos). Con tamaños de la serie B y **destruyendo todo al terminar cada sesión** (Terraform lo hace con un comando), el costo total se mantiene en pocos dólares. Cada fase te recuerda cómo apagar o destruir.

---

**➡️ Empieza en:** [`00-que-es-devops/`](00-que-es-devops/README.md)
