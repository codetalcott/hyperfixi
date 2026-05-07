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
"$REPO_ROOT/scripts/ensure-fresh.sh" \
  "$REPO_ROOT/packages/framework" \
  "$REPO_ROOT/packages/semantic" \
  "$REPO_ROOT/packages/aot-compiler" \
  "$REPO_ROOT/packages/compilation-service" \
  "$REPO_ROOT/packages/mcp-server" \
  "$REPO_ROOT/packages/intent" \
  "$REPO_ROOT/packages/domain-toolkit" \
  "$REPO_ROOT/packages/domain-config" \
  "$REPO_ROOT/packages/planner"

PACKAGES=(
  # Core runtime & parsing
  "core:Core"
  "semantic:Semantic"
  "i18n:i18n"
  "framework:Framework"

  # Compilation & tooling
  "aot-compiler:AOT Compiler"
  "compilation-service:Compilation Service"
  "hyperscript-adapter:Hyperscript Adapter"
  "server-bridge:Server Bridge"

  # Domain DSLs
  "domain-bdd:BDD"
  "domain-behaviorspec:BehaviorSpec"
  "domain-flow:Flow"
  "domain-jsx:JSX"
  "domain-llm:LLM"
  "domain-sql:SQL"
  "domain-todo:Todo"

  # MCP & Language Servers
  "mcp-server:MCP Server"
  "mcp-server-hyperscript:MCP Server (HS)"
  "language-server:Language Server"

  # Plugin & bundling
  "vite-plugin:Vite Plugin"
  "smart-bundling:Smart Bundling"

  # Other
  "ast-toolkit:AST Toolkit"
  "developer-tools:Developer Tools"
  "behaviors:Behaviors"
  "patterns-reference:Patterns Reference"
  "testing-framework:Testing Framework"
)

failed=0

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
