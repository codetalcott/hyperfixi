#!/usr/bin/env bash
# ensure-fresh.sh — Auto-rebuild workspace packages whose dist/ is stale.
#
# Usage:
#   ./scripts/ensure-fresh.sh <package-dir> [<package-dir> ...]
#
# Compares newest src/ timestamp to dist/index.{js,mjs,cjs}. If src/ is newer,
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
  src_dir="$pkg/src"
  # The freshness marker is the package's built entry, whichever extension its
  # build emits: `.js` for most, `.mjs` for core (whose `.js` CJS twin became
  # `.cjs` when `"type": "module"` made Node read it as ESM — an empty
  # `require()` surface, shipped through 3.0.0).
  # The NEWEST candidate wins: a tree that built before the `.cjs` rename keeps a
  # stale `index.js` beside a fresh `index.mjs`, and taking the first match made
  # that leftover the marker — every run then saw "src newer than dist".
  dist_marker=""
  for candidate in "$pkg/dist/index.js" "$pkg/dist/index.mjs" "$pkg/dist/index.cjs"; do
    [[ -f "$candidate" ]] || continue
    if [[ -z "$dist_marker" || "$candidate" -nt "$dist_marker" ]]; then
      dist_marker="$candidate"
    fi
  done
  [[ -n "$dist_marker" ]] || dist_marker="$pkg/dist/index.js"

  # Skip if no dist or src
  [[ -d "$src_dir" ]] || continue
  [[ -f "$dist_marker" ]] || {
    echo "  ⚙  $name: no dist/ found, building..."
    npm run build --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name")
    continue
  }

  # Check if any src/ file is newer than the dist marker
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
