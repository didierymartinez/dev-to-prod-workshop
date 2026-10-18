#!/usr/bin/env bash
# Renderiza una foto (PNG) de cada lámina, ya con todo su contenido, en out/fotos/.
# Uso: bash scripts/fotos.sh [número de sección ...]     (sin argumentos: todas)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/fotos
npx esbuild scripts/fotos.ts --bundle --platform=node --log-level=warning --outfile=out/fotos.cjs
node out/fotos.cjs "$@" | cut -f1 | sort -u | while read -r sec; do
  rm -f out/fotos/seccion-"$(printf '%02d' "$sec")"-*.png   # las de antes, por si cambió la numeración
done
node out/fotos.cjs "$@" | while IFS=$'\t' read -r sec lam tipo frame; do
  id="seccion-$(printf '%02d' "$sec")"
  salida="out/fotos/${id}-$(printf '%02d' "$lam")-${tipo}.png"
  # muestra solo los avisos del ajuste ("[taller] … no cabe"), si los hay
  npx remotion still "$id" "$salida" --frame="$frame" --scale=0.5 --log=info </dev/null 2>&1 | grep "\[taller\]" || true
  echo "$salida"
done
