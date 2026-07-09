#!/usr/bin/env bash
# ============================================================================
# hook-stop-validar.sh — Hook Stop (red de seguridad).
# Al terminar un turno, si hay secciones del taller ES modificadas (sin
# commitear) y el validador tiene ERRORES, bloquea el cierre para que se
# arreglen. No molesta en turnos que no tocaron secciones.
#
# Recibe el evento del hook como JSON por stdin; emite JSON de decisión.
# Para desactivarlo: borra el bloque "Stop" de .claude/settings.json.
# ============================================================================
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
payload="$(cat)"

# Evita loop infinito: si el Stop-hook ya está activo, deja parar.
if command -v jq >/dev/null 2>&1; then
  active="$(printf '%s' "$payload" | jq -r '.stop_hook_active // false')"
else
  active="$(printf '%s' "$payload" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && echo true || echo false)"
fi
[ "$active" = "true" ] && exit 0

# Solo actúa si hay secciones del taller ES modificadas sin commitear.
changed="$(cd "$REPO" && git status --porcelain workshop-event-sourcing/secciones/ 2>/dev/null)"
[ -z "$changed" ] && exit 0

out="$(cd "$REPO" && bash tools/validate-workshop.sh workshop-event-sourcing 2>&1)"
code=$?
[ "$code" -eq 0 ] && exit 0

resumen="$(printf '%s' "$out" | grep -E "Resultado:" | head -1)"
reason="El validador del taller ES tiene errores (${resumen}). Hay secciones modificadas sin cerrar. Arréglalos (y corre 'revisar-seccion' si editaste una sección) antes de terminar."

if command -v jq >/dev/null 2>&1; then
  jq -n --arg r "$reason" '{decision:"block", reason:$r}'
else
  printf '{"decision":"block","reason":"%s"}\n' "$reason"
fi
exit 0
