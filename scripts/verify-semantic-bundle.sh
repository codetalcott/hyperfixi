#!/usr/bin/env bash
#
# Verifies the @lokascript/semantic build output at the dist level.
#
# Guards against a class of build-config regressions where the IIFE browser
# bundles externalize `../core` as an unresolvable `require('../core.js')`
# (throws at load -> `window.LokaScriptSemantic` is undefined -> the entire
# semantic/multilingual browser-test cluster fails). This happened when the
# `externalize-core` esbuild plugin — meant only for the ESM `languages/*`
# build, so those modules share the runtime registry singleton — leaked into
# the IIFE blocks because tsup applies esbuildPlugins across all config blocks.
#
# Two invariants, checked at the dist level (unit tests can't catch this — they
# resolve to source via vitest aliases):
#   1. IIFE browser bundles MUST inline `../core` (no `core.js` require).
#   2. ESM `languages/*` builds MUST still externalize it (`import ... from "../core.js"`).
#
# Run from the repo root after `npm run build --prefix packages/semantic`.
set -euo pipefail

DIST="packages/semantic/dist"
fail=0

note() { printf '%s\n' "$*"; }

# --- Invariant 1: browser IIFE bundles inline core -------------------------
shopt -s nullglob
globals=("$DIST"/*.global.js)
if [ ${#globals[@]} -eq 0 ]; then
  note "ERROR: no IIFE bundles found in $DIST (did the browser build run?)"
  exit 1
fi
for f in "${globals[@]}"; do
  if grep -q 'core\.js' "$f"; then
    note "ERROR: $(basename "$f") references core.js — '../core' was externalized"
    note "       into a browser bundle (it must be inlined). See tsup.config.ts"
    note "       'externalize-core' plugin: gate it on format === 'esm'."
    fail=1
  fi
done

# --- Invariant 2: ESM languages/* keep core external -----------------------
es="$DIST/languages/es.js"
if [ -f "$es" ]; then
  if ! grep -q 'from "\.\./core\.js"' "$es" && ! grep -q "from '\.\./core\.js'" "$es"; then
    note "ERROR: $es does not import registerLanguage from '../core.js'."
    note "       The languages/* ESM build must externalize core so every"
    note "       language module shares the runtime registry singleton."
    fail=1
  fi
else
  note "WARNING: $es not found — skipping languages externalization check."
fi

if [ "$fail" -ne 0 ]; then
  note ""
  note "Semantic bundle verification FAILED."
  exit 1
fi

note "Semantic bundle verification passed:"
note "  - ${#globals[@]} IIFE bundle(s) inline ../core"
note "  - languages/* ESM externalizes ../core.js"
