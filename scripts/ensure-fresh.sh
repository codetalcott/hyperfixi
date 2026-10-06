#!/usr/bin/env bash
# ensure-fresh.sh — Auto-rebuild workspace packages whose dist/ is stale.
#
# Usage:
#   ./scripts/ensure-fresh.sh <package-dir> [<package-dir> ...]
#
# Compares newest src/ timestamp to dist/index.{js,mjs,cjs}. If src/ is newer,
# rebuilds the package silently. Skips packages with no dist/ or src/.
#
# A file a build bakes another workspace package into (see baked_files) is
# also rebuilt when that package was built after it.
#
# Pass packages dependency-first: each is checked after the ones before it
# were rebuilt. Designed for use in pretest hooks:
#   "pretest": "../../scripts/ensure-fresh.sh ../semantic ../compilation-service"

set -euo pipefail

rebuilt=()

# The files a package's build bakes another workspace package into: a browser
# bundle that inlines it, or a copy of its bundle. The package's own src/ can be
# unchanged while such a file is stale (a semantic change left every adapter
# bundle on the old semantic), so each is checked against that package's built
# entry. One line per file: <package> <file in dist/> <npm script that writes it>.
baked_files() {
  case "$1" in
    semantic) echo "framework browser.global.js build" ;;
    hyperscript-adapter) echo "semantic hyperscript-i18n.global.js build" ;;
    core) echo "engine hyperfixi.js build:browser" ;;
  esac
}

# The package's built entry, whichever extension its build emits: `.js` for
# most, `.mjs` for core (whose `.js` CJS twin became `.cjs` when `"type":
# "module"` made Node read it as ESM — an empty `require()` surface, shipped
# through 3.0.0). The NEWEST candidate wins: a tree that built before the
# `.cjs` rename keeps a stale `index.js` beside a fresh `index.mjs`, and taking
# the first match made that leftover the marker — every run then saw "src
# newer than dist".
dist_marker_of() {
  local marker="" candidate
  for candidate in "$1/dist/index.js" "$1/dist/index.mjs" "$1/dist/index.cjs"; do
    [[ -f "$candidate" ]] || continue
    if [[ -z "$marker" || "$candidate" -nt "$marker" ]]; then
      marker="$candidate"
    fi
  done
  echo "${marker:-$1/dist/index.js}"
}

for pkg in "$@"; do
  # Resolve to absolute path
  if [[ ! "$pkg" = /* ]]; then
    pkg="$(cd "$pkg" 2>/dev/null && pwd)" || continue
  fi

  name=$(basename "$pkg")
  src_dir="$pkg/src"
  dist_marker=$(dist_marker_of "$pkg")

  # Skip if no src; build if no dist
  [[ -d "$src_dir" ]] || continue
  if [[ ! -f "$dist_marker" ]]; then
    echo "  ⚙  $name: no dist/ found, building..."
    npm run build --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name")
  # Check if any src/ file is newer than the dist marker
  elif [[ -n "$(find "$src_dir" -name '*.ts' -newer "$dist_marker" -print -quit 2>/dev/null)" ]]; then
    echo "  ⚙  $name: src/ changed since last build, rebuilding..."
    npm run build --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name")
  fi

  # A baked-in package built after the file that holds it.
  while read -r dep file script; do
    [[ -n "$dep" ]] || continue
    dep_marker=$(dist_marker_of "$(dirname "$pkg")/$dep")
    [[ -f "$dep_marker" ]] || continue
    if [[ ! -f "$pkg/dist/$file" ]]; then
      echo "  ⚙  $name: no dist/$file, running $script..."
    elif [[ "$dep_marker" -nt "$pkg/dist/$file" ]]; then
      echo "  ⚙  $name: $dep was rebuilt after dist/$file, running $script..."
    else
      continue
    fi
    npm run "$script" --prefix "$pkg" --silent 2>/dev/null
    rebuilt+=("$name ($file)")
  done <<< "$(baked_files "$name")"
done

if [[ ${#rebuilt[@]} -gt 0 ]]; then
  echo "  ✓  Rebuilt: ${rebuilt[*]}"
fi
