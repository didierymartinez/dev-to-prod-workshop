---
name: crear-taller
description: Reglas, formato y proceso para crear o continuar talleres técnicos didácticos (estilo de los workshops de cosmos-dev-to-prod-workshop). Úsalo al crear un taller nuevo, agregar fases o lecciones a uno existente, o validar su calidad. Cubre la filosofía pedagógica, el formato fijo de cada lección, las convenciones de nombres y cómo validar (script de links/estructura + agente revisor de coherencia).
---

# Crear talleres técnicos didácticos

Guía para producir talleres con el estilo ya validado de este repositorio (básico, devops, avanzado). El objetivo es enseñar **el ciclo de vida real del software**, paso a paso, a gente que se defiende con el computador pero no necesariamente con el tema del taller.

## Filosofía (las reglas de oro)

1. **El problema antes de la solución.** Ninguna herramienta o concepto se introduce sin un dolor concreto que lo motive. Si el alumno no ha sentido el problema, no metas la solución (evita "solución sin problema").
2. **Manual primero, automatizar después.** Se aprende haciendo algo a mano (y sintiendo su fricción) antes de automatizarlo. El orden de las fases respeta esto.
3. **Nada se asume sobre el tema nuevo.** Cada herramienta/concepto se explica antes de usarse. Sí se puede asumir lo que enseñó un taller-prerequisito (declararlo en el README).
4. **Propósito y comprobación, no copiar y pegar.** Cada paso dice *qué* se hace y *por qué*. Cada lección termina con una forma de que el alumno compruebe por sí mismo que lo logró. El código se explica; no se pega sin más.
5. **Profesional, sin narrativa de personajes.** El propósito viene de objetivos de aprendizaje claros y de construir algo realista, no de un cuento o mascota.
6. **Multiplataforma.** Comandos para Windows (PowerShell), macOS y Linux lado a lado, o herramientas que sirven igual en los tres. La instalación se explica y se verifica.
7. **No abrumar.** Un concepto a la vez. La longitud de una lección depende de la importancia del concepto, no de una cuota fija. Si una herramienta tiene muchos comandos (Docker, git), enfocar los que se usan a diario; el IDE puede reemplazar comandos cuando aplique.
8. **Versionar el avance.** En cada lección de práctica, instruir `commit` + **`push`** (no solo commit local): el push asegura el guardado en internet.

## Estructura

- El taller se divide en **fases** = carpetas numeradas (`00-…/`, `01-…/`, …).
- Cada fase tiene un **`README.md`** (meta de la fase + tabla de sus lecciones + enlace a la primera) y **lecciones cortas** = archivos `NN-nombre.md` (20-45 min cada una).
- Un **`README.md` raíz** del taller: propósito, para quién, el problema que resuelve, cómo está organizado, el mapa de fases, prerequisitos y nota de costos si aplica.
- Hilo conductor: **un solo proyecto** que evoluciona a lo largo del taller. Mantener naming de proyecto, recursos y código **coherente entre lecciones**.

## Formato fijo de cada lección

Encabezado: `# Lección X.Y — Título`, luego una línea `> ⏱️ <tiempo> · 🎯 **Al terminar:** <logro concreto>`.

Secciones, en este orden. **Obligatorias** (el validador las marca como ERROR si faltan): `🎯` (objetivo, en el encabezado), `## ✅ Compruébalo`, `## 🧠 Lo que aprendiste`. **Recomendadas** (AVISO si faltan, con excepciones legítimas): `## 🤔 El problema`, `## 💡 Conceptos`, navegación `➡️`.

- `## 🤔 El problema` — por qué importa (qué duele sin esto). *Recomendada.*
- `## 💡 Conceptos` — las ideas nuevas, con analogías simples. *Recomendada* (se omite en práctica/reflexión pura que no introduce concepto nuevo).
- `## 🛠️ Manos a la obra` — los pasos (solo en lecciones de práctica; las de concepto puro no la llevan).
- `## ✅ Compruébalo` — checklist auto-verificable. *Obligatoria.*
- `## 🧠 Lo que aprendiste` — resumen de lo esencial. *Obligatoria.*
- `## 🆘 Si algo salió mal` — errores comunes y solución (recomendado en lecciones de práctica).
- Cierre de navegación: `**➡️ Siguiente:** [..](..)` (o `**➡️ Siguiente fase:** [..](..)`). *Recomendada.*

> **Tipos de lección y sus excepciones:** las de **concepto puro** omiten 🛠️ y 🆘 (pero llevan 🤔 💡); las de **práctica/reflexión pura** pueden omitir 💡; la de **cierre** de un taller omite 🤔 y la navegación ➡️ (es el final). El validador trata estas ausencias como AVISO, no error — el autor juzga si son legítimas.

## Proceso recomendado

1. **Proponer el arco** (visión + fases) y conectar con el taller previo/siguiente si existe.
2. **Preguntar las decisiones clave** que cambian el contenido (lenguaje, nube, herramientas, dominio, enfoque) antes de construir.
3. **Construir Fase 0 + Fase 1 como muestra** y pedir validación de estilo ANTES de producir en masa.
4. **Construir fase por fase**, validando cada una.
5. Mantener un `PLAN.md` con el plan acordado mientras se construye.

## Cómo validar (antes de dar por terminada una fase)

Hay un validador determinista (script) y cuatro de criterio (agentes). Para una fase normal, corre el **script** y los agentes **revisor-coherencia** + **verificador-tecnico**; usa **revisor-principiante** cuando dudes de la claridad, y **verificador-e2e** solo en hitos.

1. **Script determinista** — `tools/validate-workshop.sh <carpeta>`. Enlaces `.md` rotos, secciones obligatorias/recomendadas y marcadores provisionales. (Enlaces a fases no construidas = AVISO; `--strict-links` los vuelve error, úsalo al terminar el taller.)
2. **Agente `revisor-coherencia`** — hilo conductor, progresión de conceptos (nada usado antes de explicarse), naming/dominio consistente y transiciones. *(El de mayor valor; corrió y encontró cosas reales.)*
3. **Agente `verificador-tecnico`** — ejecuta las herramientas reales (terraform, hadolint, shellcheck, actionlint, dotnet) sobre el código de las lecciones y aplica checklists de buenas prácticas por stack. Confirma que el código que el alumno copiará **valida**.
4. **Agente `revisor-principiante`** — lee como un novato y marca dónde se atascaría (jerga sin explicar, supuestos, ambigüedad, saltos). Lente complementaria a la de coherencia.
5. **Agente `verificador-e2e`** — sigue los pasos en un entorno **real** (Azure, Docker) y confirma que funcionan. COSTOSO (crea recursos de pago): solo en hitos, y siempre limpiando al terminar.

> **Nota de diseño:** NO se crean agentes "especialistas" por cada tecnología — el modelo base ya conoce las tecnologías, así que serían redundantes. El conocimiento por stack vive como **checklists dentro de `verificador-tecnico`**, que además *ejecuta* las herramientas (verificación real, no opinión).

## Anti-patrones a evitar (aprendidos en este repo)

- Introducir un patrón avanzado "porque sí" antes de que el alumno sienta el problema (p. ej. inyección de dependencias o un orquestador sin necesidad). Diferirlo a donde aporta valor.
- Enseñar una mecánica que luego no se reutiliza (p. ej. leer un archivo solo para descartarlo después): crea zigzag en la progresión.
- Dejar enlaces "se construirá tras validar" en material que se da por terminado.
- Dar por sabido algo del tema nuevo (un comando, una herramienta) sin explicarlo.
