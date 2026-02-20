#!/usr/bin/env bash
# Run test:check across all packages with compact output.
# Exits with non-zero if any package fails.

set -e

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
