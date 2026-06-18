#!/usr/bin/env bash
# ============================================================================
# validate-workshop.sh — Validador determinista de talleres
#
# Comprueba, sobre una carpeta de taller con estructura de fases/lecciones:
#   1. Enlaces .md relativos rotos (apuntan a archivos que no existen).
#   2. Estructura de cada lección (secciones obligatorias + navegación).
#   3. Marcadores provisionales olvidados ("se construirá", "TODO", etc.).
#
# Uso:   tools/validate-workshop.sh <carpeta-del-taller> [--strict-links]
# Ej:    tools/validate-workshop.sh workshop-devops
#
# Por defecto, los enlaces a fases aún no construidas se reportan como AVISO
# (esperado durante la construcción). Con --strict-links cuentan como ERROR.
# ============================================================================
set -uo pipefail

DIR="${1:-.}"
STRICT_LINKS=false
[[ "${2:-}" == "--strict-links" ]] && STRICT_LINKS=true
[[ ! -d "$DIR" ]] && { echo "❌ La carpeta '$DIR' no existe."; exit 2; }

# Obligatorias en TODA lección (su ausencia es ERROR):
REQUIRED_MARKERS=("🎯" "✅" "🧠")
# Recomendadas (su ausencia es AVISO): 🤔 problema, 💡 conceptos, ➡️ navegación.
# Se omiten legítimamente en lecciones de práctica/reflexión pura (💡) o de cierre (🤔, ➡️).
RECOMMENDED_MARKERS=("🤔" "💡" "➡️")
PROVISIONAL_PATTERNS=("se construir" "tras validar" "pendiente de construir" "por construir" "TODO" "FIXME")

errors=0
warnings=0

echo "════════════════════════════════════════════════════════════"
echo "  Validando taller: $DIR"
echo "════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# 1. ENLACES .md RELATIVOS
# ---------------------------------------------------------------------------
echo ""
echo "▶ 1. Enlaces internos (.md)"
broken=0
while IFS= read -r mdfile; do
  while IFS= read -r link; do
    [[ -z "$link" ]] && continue
    if [[ "$link" == http* || "$link" == file:* || "$link" == /* ]]; then continue; fi
    target="$(cd "$(dirname "$mdfile")" 2>/dev/null && realpath -q "$link" 2>/dev/null)"
    if [[ -z "$target" || ! -f "$target" ]]; then
      if $STRICT_LINKS; then
        echo "   ❌ $mdfile → $link"
      else
        echo "   ⚠️  $mdfile → $link (¿fase aún no construida?)"
      fi
      broken=$((broken + 1))
    fi
  done < <(grep -oE '\]\([^)]+\.md[^)]*\)' "$mdfile" 2>/dev/null | sed -E 's/^\]\(([^)#]+).*/\1/')
done < <(find "$DIR" -name "*.md" | sort)
if [[ "$broken" -eq 0 ]]; then
  echo "   ✓ Todos los enlaces .md resuelven."
elif $STRICT_LINKS; then
  errors=$((errors + broken))
else
  warnings=$((warnings + broken))
fi

# ---------------------------------------------------------------------------
# 2. ESTRUCTURA DE CADA LECCIÓN
# ---------------------------------------------------------------------------
echo ""
echo "▶ 2. Estructura de las lecciones"
struct_errors=0
struct_warns=0
while IFS= read -r lesson; do
  base="$(basename "$lesson")"
  [[ "$base" == "README.md" ]] && continue
  # Las lecciones viven en secciones/ (los slugs ya no empiezan por número).
  # MAPA.md y METODO.md están en la raíz del taller → quedan fuera.
  [[ "$lesson" != */secciones/* ]] && continue
  miss_req=""
  for marker in "${REQUIRED_MARKERS[@]}"; do
    grep -q "$marker" "$lesson" || miss_req="$miss_req $marker"
  done
  miss_rec=""
  for marker in "${RECOMMENDED_MARKERS[@]}"; do
    grep -q "$marker" "$lesson" || miss_rec="$miss_rec $marker"
  done
  if [[ -n "$miss_req" ]]; then
    echo "   ❌ $lesson — falta (obligatorio):$miss_req"
    struct_errors=$((struct_errors + 1))
  fi
  if [[ -n "$miss_rec" ]]; then
    echo "   ⚠️  $lesson — falta (recomendado):$miss_rec"
    struct_warns=$((struct_warns + 1))
  fi
done < <(find "$DIR" -name "*.md" | sort)
errors=$((errors + struct_errors))
warnings=$((warnings + struct_warns))
if [[ "$struct_errors" -eq 0 && "$struct_warns" -eq 0 ]]; then
  echo "   ✓ Todas las lecciones tienen las secciones obligatorias y recomendadas."
elif [[ "$struct_errors" -eq 0 ]]; then
  echo "   ✓ Sin errores de estructura (los avisos pueden ser excepciones legítimas: práctica pura o cierre)."
fi

# ---------------------------------------------------------------------------
# 3. MARCADORES PROVISIONALES
# ---------------------------------------------------------------------------
echo ""
echo "▶ 3. Marcadores provisionales olvidados"
prov_found=0
while IFS= read -r hit; do
  echo "   ⚠️  $hit"
  prov_found=$((prov_found + 1))
done < <(
  for pat in "${PROVISIONAL_PATTERNS[@]}"; do
    # -w (palabra completa): evita falsos positivos como "TODO" dentro de "METODO"/"TODOS"
    # Excluye los docs de planeación (MAPA/METODO): ahí "por construir" es intencional (listan secciones futuras), no un olvido.
    grep -rnw "$pat" "$DIR" --include="*.md" --exclude="MAPA.md" --exclude="METODO.md" 2>/dev/null
  done
)
if [[ "$prov_found" -eq 0 ]]; then
  echo "   ✓ Sin marcadores provisionales."
else
  warnings=$((warnings + prov_found))
fi

# ---------------------------------------------------------------------------
# RESUMEN
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Resultado: $errors error(es), $warnings aviso(s)"
echo "════════════════════════════════════════════════════════════"
[[ "$errors" -gt 0 ]] && exit 1
exit 0
