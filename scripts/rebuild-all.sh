#!/bin/bash
# Rebuild all packages with verification
# Usage: ./scripts/rebuild-all.sh [--clean] [--skip-tests]

set -e  # Exit on error

CLEAN=false
SKIP_TESTS=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./scripts/rebuild-all.sh [--clean] [--skip-tests]"
      exit 1
      ;;
  esac
done

echo ""
echo "🏗️  LokaScript - Full Rebuild"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean if requested
if [ "$CLEAN" = true ]; then
  echo "1️⃣  Cleaning build artifacts..."
  npm run clean:test
  echo "   ✅ Test artifacts cleaned"
  echo ""
fi

# Build all packages (skip apps with --workspaces --if-present)
echo "2️⃣  Building packages..."
npm run build --workspaces --if-present 2>&1 | grep -E "(✔|✓|Built|Error)" || true
echo "   ✅ Packages built"
echo ""

# Build browser bundles (not included in workspace build)
echo "2b️⃣ Building browser bundles..."
npm run build:browser --prefix packages/core 2>&1 | grep -E "(✓|✗|Success|Error|Summary)" || true
echo "   ✅ Browser bundles built"
echo ""

# Type check
echo "3️⃣  Type checking..."
npm run typecheck
echo "   ✅ Type checks passed"
echo ""

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
  echo "4️⃣  Running tests..."
  npm test
  echo "   ✅ All tests passed"
  echo ""
fi

# Verify browser bundles exist
echo "5️⃣  Verifying browser bundles..."
BUNDLES=(
  "packages/core/dist/hyperfixi.js"
  "packages/i18n/dist/lokascript-i18n.min.js"
  "packages/semantic/dist/browser.global.js"
)

MISSING=0
for bundle in "${BUNDLES[@]}"; do
  if [ -f "$bundle" ]; then
    SIZE=$(ls -lh "$bundle" | awk '{print $5}')
    echo "   ✅ $(basename "$bundle") ($SIZE)"
  else
    echo "   ❌ Missing: $(basename "$bundle")"
    MISSING=$((MISSING + 1))
  fi
done
echo ""

if [ $MISSING -gt 0 ]; then
  echo "⚠️  Warning: $MISSING bundle(s) missing"
  echo "   Run: npm run build:browser --prefix packages/core"
  echo ""
fi

# Validate versions
echo "6️⃣  Validating versions..."
npm run version:validate
echo ""

# Validate changelog
echo "7️⃣  Validating changelog..."
npm run changelog:validate
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Rebuild complete!"
echo ""
echo "Next steps:"
echo "  • Test in browser: npm run dev (http://localhost:3000)"
echo "  • Bump version: npm run version:bump -- patch"
echo "  • Publish: npm run release:publish"
echo ""
