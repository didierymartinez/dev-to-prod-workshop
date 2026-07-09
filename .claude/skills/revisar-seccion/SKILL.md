---
name: revisar-seccion
description: Arnés de revisión por sección del taller de Event Sourcing (workshop-event-sourcing). Corre el pipeline completo sobre una sección — validador determinista + revisor-estilo + revisor-principiante + verificador-tecnico en paralelo — contra el contrato DEFINICIONES.md (reglas A/B/C/F), consolida los hallazgos por severidad y los aplica. Úsalo al terminar o editar CADA sección, en vez de correr los agentes a mano. Pásale el archivo de la sección (o el bloque). Reemplaza los workflows de revisión ad hoc.
---

# Revisar una sección (arnés)

El pipeline estándar para cerrar una sección del taller de Event Sourcing. Lo diseñamos porque las fallas se repetían al correr los agentes sueltos y con lentes distintas cada vez: este arnés las corre **todas, iguales, siempre**.

**Contrato / fuente de verdad:** `workshop-event-sourcing/DEFINICIONES.md` — reglas **A** (redacción), **B** (estructura), **C** (hilo), **F** (retos 🛠️). Los agentes revisan contra él.

## Cuándo usarlo

Al terminar de escribir o editar una sección (o un bloque). Es el reemplazo de "correr revisor-estilo a mano" — corre el battery completo y consolida.

## Procedimiento (una sección)

1. **Identifica el archivo** desde los argumentos (p.ej. `secciones/given-when-then.md`). Si te pasan un bloque/carpeta, ve al final ("Escalar a un bloque").
2. **Validador determinista primero.** Corre `bash tools/validate-workshop.sh workshop-event-sourcing` (usa `--strict-links` si el taller ya está completo). Arregla **errores** de estructura/links antes de seguir; los avisos 🤔/💡 son la excepción de casa (el taller usa `💥 El dolor`, no `🤔`).
3. **Los tres lentes, EN PARALELO** (un solo mensaje con tres llamadas a Agent — no secuenciales):
   - `revisor-estilo` sobre la sección → reglas A/B/**F** (retos: example-first, verbos concretos, guía-antes-del-`<details>`, sin sorpresas en la solución, sin sobre-prescribir, arranque=gancho, 🎯 en términos conocidos).
   - `revisor-principiante` sobre la sección → motivos no demostrados, conceptos asumidos (incluido el 🎯), guía tras la solución (solo copiar), piezas sorpresa en el `<details>`, preguntas ignoradas.
   - `verificador-tecnico` sobre la sección **solo si tiene código** → compila el código load-bearing contra los paquetes reales (Marten 9.2.1 / Wolverine 6.1.0 / xUnit) y coteja la fidelidad de la API.
   A cada agente pásale la ruta del archivo y pídele hallazgos estructurados: `{severidad (alto/medio/bajo), lente, cita exacta, problema, arreglo}`.
4. **Verifica el código tú mismo si es finicky.** Los `<details>` con API nueva (Marten/Wolverine) se **spike-verifican** en el scratchpad (proyecto de juguete con los paquetes reales, `dotnet build`/`dotnet test`) antes de dar la sección por buena — no confíes solo en la lectura. (Este paso se volverá determinista cuando exista el arnés de compilación.)

## Consolidar y aplicar

5. **Consolida** los hallazgos de los tres lentes en UNA lista: dedup (el mismo punto desde dos lentes = uno), ordenada por severidad (alto → bajo), cada uno con su cita y su arreglo. Descarta el ruido (sesgo anti-churn: ante la duda, no es hallazgo).
6. **Aplica** los arreglos reales (quirúrgicos, en la voz de la sección). Para los `alto` de reto/guía/concepto, aplica siempre; los `bajo` de estilo, según criterio.
7. **Cierra:** re-corre el validador (**0 errores**) y re-spike del código si lo tocaste. La sección queda cerrada cuando el validador está limpio y el battery no deja `alto` sin resolver.

## El estándar que aplican los lentes (recordatorio)

- **Reto (F):** abre con la línea/uso que se quiere lograr; verbos concretos; toda pieza del `<details>` anunciada antes; la guía 🆕 **antes** de la solución; idioma-nuevo se muestra, no se reta; un miembro por paso (evolutivo); no sobre-prescribir.
- **Concepto-ganado:** nada se usa antes de introducirse — incluido el 🎯.
- **Arranque:** intro = gancho de 1-2 frases, no re-decir el dolor/objetivo.
- **Placement:** cada pieza dice en qué proyecto/archivo va; nada de dónde-va-esto ambiguo.

## Escalar a un bloque (varias secciones)

Para revisar un bloque completo, no corras esto sección por sección a mano: lanza un **Workflow** que haga *fan-out* por `sección × lente` (revisor-estilo por sección + revisor-principiante en las densas + verificador-tecnico sobre el código + un revisor-coherencia sobre el bloque entero), con `schema` estructurado, y consolida al final. Es el mismo battery, paralelizado.
