#!/usr/bin/env bash
# ============================================================================
# hook-validar.sh — Hook PostToolUse.
# Cada vez que se edita/escribe una sección del taller ES, corre el validador
# determinista y, si hay ERRORES, los inyecta como contexto (PostToolUse no
# puede bloquear; solo avisa). Silencioso si el archivo no es una sección o si
# el validador queda limpio.
#
# Recibe el evento del hook como JSON por stdin.
# ============================================================================
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
payload="$(cat)"

# Ruta del archivo editado (jq si está; si no, fallback con sed).
if command -v jq >/dev/null 2>&1; then
  file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"
else
  file="$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

# Solo actúa sobre secciones del taller de Event Sourcing.
case "$file" in
  *workshop-event-sourcing/secciones/*.md) ;;
  *) exit 0 ;;
esac

out="$(cd "$REPO" && bash tools/validate-workshop.sh workshop-event-sourcing 2>&1)"
code=$?

if [ "$code" -ne 0 ]; then
  {
    echo "🔴 validate-workshop (ES) encontró ERRORES tras editar $(basename "$file"):"
    printf '%s\n' "$out" | grep -E "❌|Resultado:"
    echo "→ Corrígelos antes de cerrar la sección. Y corre el skill 'revisar-seccion' sobre ella (estilo/principiante/técnico)."
  } >&2
fi
exit 0
