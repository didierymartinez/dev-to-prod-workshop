# Plan del Taller: DevOps — Operar Software en Producción

> **Estado: PROPUESTA para revisión.** Este documento describe el taller completo antes de construir las lecciones. Una vez aprobado (y ajustado), se construye fase por fase, igual que el básico.

---

## Propósito

Tomar a quien terminó el taller básico —que ya despliega una app a un servidor con CI/CD— y llevarlo a **operar software como un equipo DevOps**: infraestructura reproducible, varios servidores orquestados, despliegues sin caídas, secretos gestionados, visibilidad de lo que pasa en producción, múltiples entornos y seguridad en el pipeline.

## Para quién es

Para egresados del **taller básico** (o quien ya maneje Git, Docker, `docker compose`, una API y un CI/CD simple). Damos por sabido lo del básico; **no** damos por sabido nada de DevOps: cada herramienta y concepto nuevo (Terraform, Swarm, observabilidad…) se explica antes de usarse.

## Decisiones de diseño (acordadas)

| Decisión | Elección | Por qué |
|---|---|---|
| Orquestador | **Docker Swarm** | Transición suave desde `docker compose`; conecta con el workshop avanzado |
| Infraestructura como Código | **Terraform** | Estándar de industria, multi-nube, alineado con el avanzado |
| Proyecto | **Continuar `gestion-empresas`** | Foco 100% en DevOps; continuidad con el básico |
| Enfoque | **Neutral, peldaño hacia el avanzado** | Proyecto neutral, pero con las mismas herramientas del avanzado |
| Nube | **Azure** | Continuidad con el básico |

## Filosofía (heredada del básico)

- **Manual primero → automatizar.** Cada tema arranca recordando cómo se hacía "a mano" (o el dolor que quedó) y luego se mejora.
- **El problema antes de la solución.** Ningún concepto se introduce sin un dolor que lo motive.
- **Nada se asume** sobre el tema nuevo; profesional, sin narrativa de personajes.
- **Fases con lecciones cortas** (20-45 min), cada una con: 🤔 problema → 💡 conceptos → 🛠️ manos a la obra → ✅ compruébalo → 🧠 resumen → 🆘 si algo salió mal.
- **Multiplataforma** (Windows / macOS / Linux) y **commit + push** en cada lección de práctica.

---

## De dónde venimos: los dolores que quedaron en el básico

El egresado del básico tiene su app en Azure (2 VMs, gateway nginx, CI/CD por GHCR+SSH). Pero, con ojos de DevOps, hay fragilidades — y cada una motiva una fase:

| Fragilidad al terminar el básico | Lo que resolvemos | Fase |
|---|---|---|
| La infra se creó **a mano** con comandos `az` sueltos | Infraestructura como Código (Terraform) | 1 |
| La app corre en **una sola máquina**; no escala ni se recupera sola | Orquestación (Docker Swarm) | 2 |
| Cada despliegue causa **downtime** | Despliegues sin caídas | 3 |
| Secretos en `.env` y en el servidor | Secretos y configuración gestionados | 4 |
| Estás **ciego** en producción (solo `docker logs`) | Observabilidad | 5 |
| **Un solo entorno**; se despliega directo a producción | Entornos + CD avanzado | 6 |
| Nadie revisa **vulnerabilidades** | Seguridad (DevSecOps) | 7 |

---

## Cómo conectan los tres talleres

```
BÁSICO (neutral)            DEVOPS (neutral)               AVANZADO (Cosmos)
fundamentos:                prácticas de operación:        arquitectura específica:
Git · API · BD · Docker ·   IaC (Terraform) ·          →   Cosmos · multi-plano ·
CI/CD · 1 servidor      →   orquestación (Swarm) ·         YARP · Service Bus ·
                            secretos · observabilidad ·    Private Link · Control Plane
                            entornos · seguridad
```

Quien termine el DevOps llegará al avanzado sabiendo ya la *mecánica* (Terraform, Swarm, Key Vault, managed identity) y solo aprenderá lo *específico de Cosmos*.

---

## El mapa de fases

| Fase | Carpeta | Lo que logras | Concepto central |
|---|---|---|---|
| **0** | `00-que-es-devops/` | Entender el porqué y preparar el entorno | Cultura DevOps |
| **1** | `01-infraestructura-como-codigo/` | Recrear la infra declarada y versionada | Terraform |
| **2** | `02-orquestacion-swarm/` | De un host a un clúster | Docker Swarm |
| **3** | `03-despliegues-sin-downtime/` | Actualizar sin caídas | Rolling updates + rollback |
| **4** | `04-secretos-y-configuracion/` | Secretos fuera del código | Docker secrets + Key Vault |
| **5** | `05-observabilidad/` | Ver qué pasa en producción | Logs + métricas + alertas |
| **6** | `06-entornos-y-cd-avanzado/` | Dev/staging/prod con control | Entornos + promoción |
| **7** | `07-seguridad-devsecops/` | Seguridad en el pipeline | Escaneo + identidades |
| **8** | `08-cierre/` | Panorama y próximos pasos | SRE, plataformas, GitOps |

---

## Detalle de las fases y lecciones

### Fase 0 — ¿Qué es DevOps?
- **0.1 De "desarrollar" a "operar":** qué es DevOps, el problema histórico "dev vs ops", el ciclo de feedback. *(concepto)*
- **0.2 De dónde venimos:** repaso del estado final del básico y mapa de las fragilidades que vamos a resolver.
- **0.3 Prepara tu entorno:** instalar y verificar Terraform; repasar Azure CLI y Docker (multiplataforma).

### Fase 1 — Infraestructura como Código (Terraform)
- **1.1 El problema de crear infra a mano:** no reproducible, "¿qué cambié?", *drift*. Qué es IaC. *(concepto)*
- **1.2 Tu primer Terraform:** providers, `init` / `plan` / `apply`; crear el grupo de recursos declarativamente.
- **1.3 Declarar el servidor:** recrear la VM del básico como código; recursos, variables y outputs.
- **1.4 El estado de Terraform:** qué es el `state`, por qué importa, dónde vive, por qué no se toca a mano.
- **1.5 Variables y reutilización:** parametrizar (tamaño, región) para no repetir y preparar varios entornos.
- **1.6 Destruir y recrear:** la magia de IaC (`destroy` / `apply`); versionar la infraestructura en Git.

### Fase 2 — Orquestación con Docker Swarm
- **2.1 El límite de un solo host:** sin réplicas ni auto-recuperación; qué es un orquestador. *(concepto)*
- **2.2 Crear un clúster Swarm:** `swarm init`, managers y workers, unir nodos.
- **2.3 De compose a stack:** `docker stack deploy`, servicios vs contenedores, réplicas.
- **2.4 Redes overlay:** cómo se comunican los servicios entre nodos; red pública vs interna.
- **2.5 Escalar y auto-recuperar:** `service scale`; qué pasa cuando un contenedor o un nodo cae (self-healing).

### Fase 3 — Despliegues sin downtime
- **3.1 El problema del downtime:** la app se cae un momento en cada deploy. Health checks. *(concepto + práctica)*
- **3.2 Rolling updates:** actualizar las réplicas de a poco, sin cortar el servicio.
- **3.3 Rollback:** volver a la versión anterior cuando un despliegue sale mal.

### Fase 4 — Secretos y configuración
- **4.1 El problema de los `.env`:** secretos esparcidos; el principio 12-factor (config en el entorno). *(concepto)*
- **4.2 Secretos del clúster:** `docker secret` para la contraseña de la BD, fuera de los archivos.
- **4.3 Un cofre gestionado:** Azure Key Vault — qué es, por qué, leer secretos (alineado con el avanzado).
- **4.4 Configuración por entorno:** separar lo que cambia entre dev y prod.

### Fase 5 — Observabilidad
- **5.1 Estás ciego en producción:** los tres pilares — logs, métricas, trazas. *(concepto)*
- **5.2 Logs centralizados:** juntar y consultar los logs de todos los servicios y nodos.
- **5.3 Métricas y dashboards:** Prometheus + Grafana (desplegados en el clúster); ver CPU, memoria, peticiones.
- **5.4 Health checks y alertas:** detectar problemas y recibir un aviso antes de que lo note el usuario.

### Fase 6 — Entornos y CD avanzado
- **6.1 El riesgo de un solo entorno:** se despliega directo a producción. Dev / staging / prod. *(concepto)*
- **6.2 Crear staging con Terraform:** reutilizar el código IaC para levantar otro entorno idéntico.
- **6.3 Promoción con aprobación:** pipeline que pasa de staging a producción con una aprobación manual (GitHub Environments).
- **6.4 Pipelines reutilizables:** un workflow central que no se repite por proyecto (como en el avanzado).

### Fase 7 — Seguridad (DevSecOps)
- **7.1 ¿Tu imagen es segura?:** vulnerabilidades en imágenes y dependencias; qué es DevSecOps. *(concepto)*
- **7.2 Escanear imágenes:** Trivy en el pipeline; fallar el build si hay vulnerabilidades graves.
- **7.3 Escanear dependencias y código:** Dependabot y análisis estático.
- **7.4 Identidades y mínimo privilegio:** Managed Identity en vez de credenciales; *least privilege* (alineado con el avanzado).

### Fase 8 — Cierre
- **8.1 El panorama que construiste:** las preguntas que ahora sabes responder; checklist de egreso.
- **8.2 Hacia dónde seguir:** Kubernetes, SRE, *platform engineering*, GitOps — y el puente al taller avanzado. Limpieza final (`terraform destroy`).

**Total estimado:** 9 fases (0-8), ~33 lecciones cortas.

---

## Prerequisitos y herramientas nuevas

- Haber hecho el taller básico (o equivalente).
- **Terraform CLI** (nuevo) — Fase 1.
- Azure CLI, Docker, Git, cuenta de GitHub y de Azure (del básico).
- *(Se despliegan como contenedores en el clúster: Prometheus, Grafana — no requieren instalación local.)*

## Nota de costos

Swarm necesita **varios nodos** (p. ej. 1 manager + 1-2 workers) además de la BD: más VMs que en el básico. Se usan tamaños pequeños (serie B) y cada fase recuerda **apagar** (`az vm deallocate`) o **destruir** (`terraform destroy`) al terminar. El costo del taller sigue siendo de pocos dólares si se limpia tras cada sesión.

---

## Próximos pasos

1. **Revisar y ajustar este plan** (alcance, orden, fases que sobren o falten).
2. Validar el estilo construyendo la **Fase 0 + Fase 1** como muestra (igual que hicimos con el básico).
3. Construir el resto fase por fase.
