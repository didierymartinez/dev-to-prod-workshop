# Academia de Ingeniería de Software

> Una ruta práctica **del código a producción — y más allá**. Talleres encadenados que llevan a un desarrollador desde el ciclo de vida básico del software hasta operar y diseñar sistemas reales. Pensados como **documentación viva**: para aprender, para enseñar y para consultar.

---

## Qué es esto

No son cursos sueltos: es un **currículo** de talleres que se construyen uno sobre otro. Cada taller toma a quien terminó el anterior y lo lleva un paso más allá, sobre **el mismo proyecto** (`gestion-empresas`), para que nunca haya que reaprender el dominio — solo las ideas nuevas.

Todos comparten la misma **filosofía** y el mismo **formato**, así que cambiar de taller no implica cambiar de hábitos.

## Cómo está hecho cada taller

- Dividido en **fases** (carpetas) con **lecciones cortas** (20-45 min).
- Cada lección: 🤔 el problema → 💡 conceptos → 🛠️ manos a la obra → ✅ compruébalo → 🧠 lo que aprendiste → 🆘 si algo salió mal.
- **Reglas de oro:** el problema antes de la solución · manual primero, automatizar después · nada se asume sobre el tema nuevo · multiplataforma (Windows/macOS/Linux) · `commit` + `push` en cada práctica · sin narrativa de personajes.

## El mapa del currículo

```
FUNDAMENTOS
  ①  Básico — El ciclo de vida del software            ✅ completo
       git → API/HTTP → frontend → datos → Docker → servidor → CI/CD → arquitectura

OPERACIÓN
  ②  DevOps — Operar en producción                     ✅ completo
       IaC (Terraform) · Swarm · sin-downtime · secretos · observabilidad · entornos · DevSecOps

ARQUITECTURA Y DISEÑO
  ③  Estilos y diseño arquitectónico                   📋 planeado
       monolito → capas → hexagonal → cuándo (y cuándo NO) microservicios
  ④  EDA + Event Sourcing                              ♻️ a reconstruir
       eventos · mensajería · event store · proyecciones · CQRS
  ⑤  Microservicios                                    📋 planeado
       descomposición · comunicación · resiliencia · sagas

PROFUNDIZACIÓN / SRE
  ⑥  Observabilidad                                    📋 planeado
       logs · métricas · trazas · SLOs · alerting
  ⑦  DevOps avanzado                                   📋 planeado
       Kubernetes · GitOps · multi-entorno · service mesh

CAPSTONE
  ⑧  El producto real (Cosmos)                         ♻️ a reconstruir
       integra todo en un ERP SaaS multi-tenant
```

## Rutas según tu objetivo

Cada taller declara su **prerequisito**. Sigue la ruta que te interese; todas parten del Básico:

| Si quieres ser… | Ruta |
|---|---|
| **Desarrollador backend** | ① → ③ → ④ → ⑤ |
| **DevOps / Infraestructura** | ① → ② → ⑥ → ⑦ |
| **Arquitecto de software** | ① → ② → ③ → ④ → ⑤ → ⑧ |

## Los talleres

| # | Taller | Estado | Carpeta |
|---|--------|--------|---------|
| ① | [Básico — El ciclo de vida del software](workshop-basics/README.md) | ✅ Completo | `workshop-basics/` |
| ② | [DevOps — Operar en producción](workshop-devops/README.md) | ✅ Completo | `workshop-devops/` |
| ③ | Estilos y diseño arquitectónico | 📋 Planeado | — |
| ④ | EDA + Event Sourcing | ♻️ A reconstruir | carpeta nueva (la actual `eventsourcing-workshops-basics/` queda como guía) |
| ⑤ | Microservicios | 📋 Planeado | — |
| ⑥ | Observabilidad | 📋 Planeado | — |
| ⑦ | DevOps avanzado | 📋 Planeado | — |
| ⑧ | El producto real (Cosmos) | ♻️ A reconstruir | carpeta nueva (la actual `workshop-adv/` queda como guía) |

> Los enlaces aparecen a medida que cada taller queda listo y validado.

---

## Para autores (cómo se construye y mantiene la academia)

La consistencia y la calidad no dependen de la memoria: están **codificadas**.

- **Skill `crear-taller`** (`.claude/skills/crear-taller/`): la filosofía, el formato de lección, las convenciones y el proceso. Se invoca al crear o ampliar cualquier taller.
- **Validador determinista** (`tools/validate-workshop.sh <taller>`): enlaces rotos, estructura de lecciones y marcadores provisionales.
- **Agentes de criterio** (`.claude/agents/`): se lanzan antes de dar por terminada una fase.
  - `revisor-coherencia` — hilo conductor, progresión de conceptos, naming.
  - `verificador-tecnico` — ejecuta las herramientas reales (terraform, hadolint, shellcheck, actionlint, dotnet) sobre el código de las lecciones.
  - `revisor-principiante` — lee como un novato y marca dónde se atascaría.
  - `verificador-e2e` — sigue la lección en un entorno real (uso puntual, en hitos).

**Flujo al terminar una fase:** correr el validador + lanzar `revisor-coherencia` y `verificador-tecnico` (y `revisor-principiante` si hay dudas de claridad).

---

**¿Por dónde empezar?** Si eres nuevo, entra al [Taller Básico](workshop-basics/README.md).
