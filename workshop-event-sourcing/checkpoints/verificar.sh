#!/usr/bin/env bash
# Compila y corre cada checkpoint; corre los tests donde existen. Sale con error si algo falla.
set -euo pipefail
cd "$(dirname "$0")"
fallos=0
for d in [0-9][0-9]-*/; do
  d=${d%/}
  if [ -d "$d/Empresas.Tests" ]; then
    if (cd "$d/Empresas.Tests" && dotnet test --nologo -v q >/dev/null 2>&1); then echo "✅ $d (tests)"; else echo "❌ $d (tests)"; fallos=1; fi
  else
    salida=$(cd "$d" && dotnet run 2>&1 || true)
    if echo "$salida" | grep -q "error CS"; then echo "❌ $d (no compila)"; fallos=1
    else echo "✅ $d → $(echo "$salida" | tail -1)"; fi
  fi
done
exit $fallos
