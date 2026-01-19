#!/bin/bash
# Pre-publish validation script
# Run this after npm login to verify everything is ready

set -e

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  LokaScript Pre-Publish Validation"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check npm login
echo "1️⃣  Checking npm authentication..."
if npm whoami &>/dev/null; then
  USERNAME=$(npm whoami)
  echo -e "${GREEN}✅ Logged in as: $USERNAME${NC}"
else
  echo -e "${RED}❌ Not logged in to npm${NC}"
  echo "   Run: npm login"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Check git status
echo "2️⃣  Checking git status..."
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${GREEN}✅ Working directory clean${NC}"
else
  echo -e "${YELLOW}⚠️  Uncommitted changes found${NC}"
  echo "   Consider committing or stashing changes"
fi
echo ""

# 3. Check current branch
echo "3️⃣  Checking git branch..."
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo -e "${GREEN}✅ On main branch${NC}"
else
  echo -e "${YELLOW}⚠️  On branch: $BRANCH (should be 'main')${NC}"
fi
echo ""

# 4. Validate versions
echo "4️⃣  Validating package versions..."
if npm run version:validate --silent; then
  echo -e "${GREEN}✅ All packages at version 1.0.0${NC}"
else
  echo -e "${RED}❌ Version mismatch detected${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Validate changelog
echo "5️⃣  Validating changelog..."
if npm run changelog:validate --silent; then
  echo -e "${GREEN}✅ Changelog validated (no private packages)${NC}"
else
  echo -e "${RED}❌ Changelog validation failed${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. Check build artifacts
echo "6️⃣  Checking build artifacts..."
MISSING=0
for PKG in core semantic i18n vite-plugin; do
  if [ -d "packages/$PKG/dist" ]; then
    FILE_COUNT=$(find "packages/$PKG/dist" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ packages/$PKG/dist ($FILE_COUNT files)${NC}"
  else
    echo -e "${RED}❌ packages/$PKG/dist missing${NC}"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Run: npm run build${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 7. Check publishConfig
echo "7️⃣  Checking publishConfig..."
PUBLIC_COUNT=0
for PKG in packages/*/package.json; do
  if ! grep -q '"private": true' "$PKG"; then
    if grep -q '"access": "public"' "$PKG"; then
      PUBLIC_COUNT=$((PUBLIC_COUNT + 1))
    fi
  fi
done
echo -e "${GREEN}✅ $PUBLIC_COUNT packages configured for public access${NC}"
echo ""

# 8. Check organization membership (if logged in)
if npm whoami &>/dev/null; then
  echo "8️⃣  Checking npm organization..."
  if npm org ls lokascript 2>/dev/null | grep -q "$USERNAME"; then
    echo -e "${GREEN}✅ Member of @lokascript organization${NC}"
  else
    echo -e "${RED}❌ Not a member of @lokascript organization${NC}"
    echo "   Contact organization admin to add you"
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
fi

# Summary
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready to publish!${NC}"
  echo ""
  echo "To publish core packages, run:"
  echo ""
  echo "  cd packages/core && npm publish --access public && cd ../.."
  echo "  cd packages/semantic && npm publish --access public && cd ../.."
  echo "  cd packages/i18n && npm publish --access public && cd ../.."
  echo "  cd packages/vite-plugin && npm publish --access public && cd ../.."
  echo ""
  echo "Or use the batch script:"
  echo "  ./scripts/publish-core.sh"
else
  echo -e "${RED}❌ $ERRORS error(s) found - Fix issues before publishing${NC}"
  exit 1
fi
echo "══════════════════════════════════════════════════════════════"
echo ""
