#!/usr/bin/env bash
# Atajo: una foto de cada lámina en out/fotos/ (ver scripts/fotos.mjs).
# Uso: bash scripts/fotos.sh [número de sección ...]     (sin argumentos: todas)
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/fotos.mjs "$@"
