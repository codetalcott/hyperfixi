#!/bin/bash
# Publish core LokaScript packages to npm
# Must be logged in with: npm login

set -e

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Publishing Core LokaScript Packages"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if logged in
if ! npm whoami &>/dev/null; then
  echo -e "${RED}❌ Not logged in to npm${NC}"
  echo "Run: npm login"
  exit 1
fi

USERNAME=$(npm whoami)
echo -e "${GREEN}✅ Logged in as: $USERNAME${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  You are about to publish 4 packages to npm:${NC}"
echo ""
echo "  1. @lokascript/core (663 KB)"
echo "  2. @lokascript/semantic (2.7 MB)"
echo "  3. @lokascript/i18n (2.7 MB)"
echo "  4. @lokascript/vite-plugin (137 KB)"
echo ""
echo -e "${YELLOW}This action is PERMANENT and cannot be undone!${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo "Starting publication..."
echo ""

# Track success/failure
PUBLISHED=()
FAILED=()

# Function to publish a package
publish_package() {
  local PKG=$1
  local NAME=$2

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${BLUE}📦 Publishing $NAME...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  cd "packages/$PKG"

  # Final checks
  echo "Running final checks..."
  if ! npm run build &>/dev/null; then
    echo -e "${RED}❌ Build failed for $NAME${NC}"
    FAILED+=("$NAME (build failed)")
    cd ../..
    return 1
  fi

  # Publish with 2FA prompt
  echo ""
  echo -e "${YELLOW}You will be prompted for 2FA code...${NC}"
  echo ""

  if npm publish --access public; then
    echo ""
    echo -e "${GREEN}✅ Successfully published $NAME${NC}"
    PUBLISHED+=("$NAME")
  else
    echo ""
    echo -e "${RED}❌ Failed to publish $NAME${NC}"
    FAILED+=("$NAME")
    cd ../..
    return 1
  fi

  cd ../..
  echo ""
  sleep 2  # Brief pause between publishes
}

# Publish packages in order
publish_package "core" "@lokascript/core"
publish_package "semantic" "@lokascript/semantic"
publish_package "i18n" "@lokascript/i18n"
publish_package "vite-plugin" "@lokascript/vite-plugin"

# Summary
echo "══════════════════════════════════════════════════════════════"
echo "  Publication Summary"
echo "══════════════════════════════════════════════════════════════"
echo ""

if [ ${#PUBLISHED[@]} -gt 0 ]; then
  echo -e "${GREEN}✅ Successfully Published (${#PUBLISHED[@]}):${NC}"
  for pkg in "${PUBLISHED[@]}"; do
    echo "   - $pkg"
  done
  echo ""
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "${RED}❌ Failed to Publish (${#FAILED[@]}):${NC}"
  for pkg in "${FAILED[@]}"; do
    echo "   - $pkg"
  done
  echo ""
  exit 1
fi

echo -e "${GREEN}🎉 All core packages published successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify on npm: npm view @lokascript/core version"
echo "  2. Test installation: npm install @lokascript/core"
echo "  3. Create GitHub release: git tag -a v1.0.0 -m \"Release v1.0.0\""
echo "  4. Publish remaining packages (optional)"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo ""
