#!/usr/bin/env bash
# Run test:check across all packages with compact output.
# Exits with non-zero if any package fails.
#
# Auto-rebuilds stale workspace packages first. npm pre/post hooks only
# fire for the bare script name (`npm test`), not for variants like
# `test:check`, so per-package pretest hooks DON'T fire here — we have
# to invoke ensure-fresh ourselves.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Order is dep-before-dependent: ensure-fresh rebuilds in argument order, so a
# dep listed after its consumer gets rebuilt too late to help.
# `core` before `reactivity` — reactivity's build consumes core's dist.
"$REPO_ROOT/scripts/ensure-fresh.sh" \
  "$REPO_ROOT/packages/core" \
  "$REPO_ROOT/packages/reactivity" \
  "$REPO_ROOT/packages/framework" \
  "$REPO_ROOT/packages/semantic" \
  "$REPO_ROOT/packages/i18n" \
  "$REPO_ROOT/packages/patterns-reference" \
  "$REPO_ROOT/packages/aot-compiler" \
  "$REPO_ROOT/packages/compilation-service" \
  "$REPO_ROOT/packages/mcp-server" \
  "$REPO_ROOT/packages/intent" \
  "$REPO_ROOT/packages/domain-toolkit" \
  "$REPO_ROOT/packages/domain-sql" \
  "$REPO_ROOT/packages/domain-bdd" \
  "$REPO_ROOT/packages/domain-behaviorspec" \
  "$REPO_ROOT/packages/domain-jsx" \
  "$REPO_ROOT/packages/domain-todo" \
  "$REPO_ROOT/packages/domain-llm" \
  "$REPO_ROOT/packages/domain-flow" \
  "$REPO_ROOT/packages/domain-voice" \
  "$REPO_ROOT/packages/domain-learn" \
  "$REPO_ROOT/packages/domain-config" \
  "$REPO_ROOT/packages/planner" \
  "$REPO_ROOT/packages/realtime" \
  "$REPO_ROOT/packages/intent-element" \
  "$REPO_ROOT/packages/mcp-multilingual-intent" \
  "$REPO_ROOT/packages/hyperscript-tools-i18n" \
  "$REPO_ROOT/packages/htmx-adapter" \
  "$REPO_ROOT/packages/behaviors"

PACKAGES=(
  # Core runtime & parsing
  "core:Core"
  "semantic:Semantic"
  "i18n:i18n"
  "framework:Framework"
  "intent:Intent"

  # Compilation & tooling
  "aot-compiler:AOT Compiler"
  "compilation-service:Compilation Service"
  "hyperscript-adapter:Hyperscript Adapter"
  "server-bridge:Server Bridge"

  # Domain DSLs (+ shared registry wiring)
  "domain-bdd:BDD"
  "domain-behaviorspec:BehaviorSpec"
  "domain-flow:Flow"
  "domain-jsx:JSX"
  "domain-learn:Learn"
  "domain-llm:LLM"
  "domain-sql:SQL"
  "domain-todo:Todo"
  "domain-voice:Voice"
  "domain-config:Domain Config"
  "domain-toolkit:Domain Toolkit"

  # MCP & Language Servers
  "mcp-server:MCP Server"
  "mcp-multilingual-intent:MCP Multilingual Intent"
  "language-server:Language Server"

  # Plugin & bundling
  "vite-plugin:Vite Plugin"
  "smart-bundling:Smart Bundling"
  "htmx-adapter:htmx Adapter"

  # Runtime plugins (HyperfixiPlugin)
  "reactivity:Reactivity"
  "realtime:Realtime"
  "intent-element:Intent Element"

  # Other
  "developer-tools:Developer Tools"
  "behaviors:Behaviors"
  "patterns-reference:Patterns Reference"
  "testing-framework:Testing Framework"
  "planner:Planner"
  "hyperscript-tools-i18n:Hyperscript Tools i18n"
)

failed=0

# Vocab cross-surface consistency (V1–V4). CI gates on this in the
# multilingual-validation job, but that job is PR-only — so before this it was
# possible to run the whole local gate green and still push a marker that cannot
# tokenize in its own language (how the th `go` marker `ยัง` reached CI in #763).
# It needs no patterns.db, only the dists ensure-fresh just refreshed, and takes
# ~1s. What matters is the UNWAIVED count; waivers live in vocab-waivers.json.
echo "=== Vocab consistency (V1–V4) ==="
if ! (cd "$REPO_ROOT/packages/testing-framework" && npx tsx src/vocab/cli.ts validate); then
  failed=1
fi

for entry in "${PACKAGES[@]}"; do
  pkg="${entry%%:*}"
  label="${entry#*:}"
  echo "=== $label ==="
  if ! npm run test:check --prefix "packages/$pkg"; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "SOME PACKAGES FAILED"
  exit 1
fi
