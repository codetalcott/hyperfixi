#!/usr/bin/env bash
# ensure-fresh.sh — Auto-rebuild workspace packages whose dist/ is stale.
#
# Usage:
#   ./scripts/ensure-fresh.sh <package-dir> [<package-dir> ...]
#
# Compares newest src/ timestamp to dist/index.js. If src/ is newer,
# rebuilds the package silently. Skips packages with no dist/ or src/.
#
# Designed for use in pretest hooks:
#   "pretest": "../../scripts/ensure-fresh.sh ../semantic ../compilation-service"

set -euo pipefail

rebuilt=()

for pkg in "$@"; do
  # Resolve to absolute path
  if [[ ! "$pkg" = /* ]]; then
    pkg="$(cd "$pkg" 2>/dev/null && pwd)" || continue
  fi

  name=$(basename "$pkg")
  dist_marker="$pkg/dist/index.js"
  src_dir="$pkg/src"

  # Skip if no dist or src
  [[ -d "$src_dir" ]] || continue
  [[ -f "$dist_marker" ]] || {
    echo "  ⚙  $name: no dist/ found, building..."
    npm run build --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name")
    continue
  }

  # Check if any src/ file is newer than dist/index.js
  stale=$(find "$src_dir" -name '*.ts' -newer "$dist_marker" -print -quit 2>/dev/null)
  if [[ -n "$stale" ]]; then
    echo "  ⚙  $name: src/ changed since last build, rebuilding..."
    npm run build --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name")
  fi
done

if [[ ${#rebuilt[@]} -gt 0 ]]; then
  echo "  ✓  Rebuilt: ${rebuilt[*]}"
fi
