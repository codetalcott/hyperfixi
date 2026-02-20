#!/bin/bash
# publish-all.sh — publish all @lokascript/* and @hyperfixi/* packages to npm
# Usage: ./publish-all.sh --otp=YOUR_CODE
# Or interactively: ./publish-all.sh (prompts for OTP each time)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
OTP_FLAG="$1"

publish_pkg() {
  local pkg="$1"
  local dir="$ROOT/packages/$pkg"
  local name version
  name=$(node -e "console.log(require('$dir/package.json').name)")
  version=$(node -e "console.log(require('$dir/package.json').version)")
  echo ""
  echo "► Publishing $name@$version ..."
  (cd "$dir" && npm publish --access public $OTP_FLAG 2>&1)
  echo "  ✓ $name@$version published"
}

echo "=== LokaScript npm publish ==="
echo "Root: $ROOT"
echo ""

# ── Tier 1: Foundation (no local deps) ──────────────────────────────────────
echo "--- Tier 1: Foundation ---"
publish_pkg "framework"
publish_pkg "server-bridge"
publish_pkg "types-browser"

# ── Tier 2: Domains (depend on framework) ───────────────────────────────────
echo ""
echo "--- Tier 2: Domains ---"
publish_pkg "domain-sql"
publish_pkg "domain-bdd"
publish_pkg "domain-llm"
publish_pkg "domain-todo"
publish_pkg "domain-behaviorspec"
publish_pkg "domain-jsx"
publish_pkg "domain-flow"

# ── Tier 3: Tools (depend on published core) ────────────────────────────────
echo ""
echo "--- Tier 3: Tools ---"
publish_pkg "behaviors"
publish_pkg "testing-framework"
publish_pkg "language-server"

# ── Tier 4: Compilation service (bundles aot-compiler) ──────────────────────
echo ""
echo "--- Tier 4: Compilation service ---"
publish_pkg "compilation-service"

echo ""
echo "=== All done! ==="
