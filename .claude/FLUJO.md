# Flujo de revisión del taller (qué corre solo, qué corres tú)

Tres capas para que las fallas se atrapen **antes** de que las cace un humano. De más automática a más manual:

## 1. Automático — hooks (determinista, sin que nadie se acuerde)

Configurado en [`.claude/settings.json`](settings.json). Corre **solo**:

- **Al editar/escribir una sección** (`workshop-event-sourcing/secciones/*.md`) → se dispara `tools/hook-validar.sh`, que corre el validador. Si hay **errores** (links rotos, faltan `🎯/✅/🧠`, marcadores provisionales), te los muestra al instante. Si está limpio, calla.
- **Al cerrar un turno** con secciones modificadas sin commitear y el validador en rojo → `tools/hook-stop-validar.sh` **bloquea** el cierre hasta arreglarlo. No molesta en turnos que no tocaron secciones (guarda por `git status`) y no entra en loop (guarda por `stop_hook_active`).

Cubre solo lo **determinista** (estructura, links, marcadores). No corre agentes (un hook es shell, no LLM).

**Apagarlo:** borra el bloque `PostToolUse` o `Stop` de `.claude/settings.json`. No requiere reiniciar.

## 2. Por sección — el skill `revisar-seccion` (los agentes)

Al terminar o editar una sección, corre el arnés:

```
/revisar-seccion workshop-event-sourcing/secciones/<archivo>.md
```

Corre, sobre esa sección: validador + `revisor-estilo` (reglas A/B/F) + `revisor-principiante` (motivos, conceptos, guía-antes-del-details, piezas sorpresa) + `verificador-tecnico` (compila el código), consolida los hallazgos y los aplica. Es lo que cubre las fallas **de juicio** que el hook no puede.

## 3. Autónomo — `/goal` y `/loop` (para tandas largas)

Cuando quieras que Claude avance/revise **sección por sección hasta terminar**, sin ir a mano:

- **`/goal`** — fija una condición de parada; Claude trabaja turno a turno hasta cumplirla (un modelo rápido la evalúa tras cada turno):
  ```
  /goal cada sección de workshop-event-sourcing/secciones/ pasó revisar-seccion sin hallazgos de severidad alta y el validador queda limpio
  ```
- **`/loop`** — re-ejecuta un prompt en intervalo (para monitorear una sección mientras la trabajas):
  ```
  /loop 3m /revisar-seccion workshop-event-sourcing/secciones/<archivo>.md
  ```
  `Esc` para parar.

**`/goal`** es el que sirve para "revisa todo el taller solo": itera prompts dinámicos hasta la condición. **`/loop`** repite el mismo prompt en el tiempo.

---

**Resumen:** el **hook** es el gatillo determinista que corre siempre; el **skill `revisar-seccion`** es el arnés de agentes por sección; **`/goal`** sostiene la tanda autónoma. El contrato que todos aplican es [`workshop-event-sourcing/DEFINICIONES.md`](../workshop-event-sourcing/DEFINICIONES.md) (reglas A/B/C/F).
