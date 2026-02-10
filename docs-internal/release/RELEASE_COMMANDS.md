# Release Commands Quick Reference

## One-Line Commands for Copy/Paste

### Pre-Release Validation

```bash
npm run version:validate && npm run changelog:validate && npm run packages:list:public
```

### Full Clean Build

```bash
npm run rebuild:clean
```

### Dry Run All Core Packages

```bash
cd packages/core && npm publish --dry-run && cd ../semantic && npm publish --dry-run && cd ../i18n && npm publish --dry-run && cd ../..
```

### Publish Core Packages (One by One)

```bash
cd packages/core && npm publish --access public && cd ../..
cd packages/semantic && npm publish --access public && cd ../..
cd packages/i18n && npm publish --access public && cd ../..
cd packages/vite-plugin && npm publish --access public && cd ../..
```

### Publish All Public Packages (Batch)

```bash
for pkg in packages/*/package.json; do
  dir=$(dirname "$pkg")
  if ! grep -q '"private": true' "$pkg"; then
    name=$(jq -r '.name' "$pkg")
    echo "📦 Publishing $name..."
    (cd "$dir" && npm publish --access public) || echo "❌ Failed: $name"
  fi
done
```

### Verify Published Versions

```bash
npm view @lokascript/core version && \
npm view @lokascript/semantic version && \
npm view @lokascript/i18n version && \
npm view @lokascript/vite-plugin version
```

### Create and Push Tag

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release" && \
git push origin v1.0.0
```

### Test Installation

```bash
npm_config_yes=true npx --package=@lokascript/core node -e "console.log('✅ Core installed')" && \
npm_config_yes=true npx --package=@lokascript/semantic node -e "console.log('✅ Semantic installed')"
```

## Package-by-Package Publishing

Copy and run these commands in order:

```bash
# 1. Core (Required First)
cd packages/core && npm publish --access public && cd ../..

# 2. Semantic (Depends on Core)
cd packages/semantic && npm publish --access public && cd ../..

# 3. i18n (Depends on Core)
cd packages/i18n && npm publish --access public && cd ../..

# 4. Vite Plugin (Depends on Core)
cd packages/vite-plugin && npm publish --access public && cd ../..

# 5. Testing Framework
cd packages/testing-framework && npm publish --access public && cd ../..

# 6. Behaviors
cd packages/behaviors && npm publish --access public && cd ../..

# 7. AST Toolkit
cd packages/ast-toolkit && npm publish --access public && cd ../..

# 9. MCP Server
cd packages/mcp-server && npm publish --access public && cd ../..

# 10. Patterns Reference
cd packages/patterns-reference && npm publish --access public && cd ../..

# 14. Types Browser
cd packages/types-browser && npm publish --access public && cd ../..
```

## Emergency Rollback

```bash
# Unpublish specific package (within 72 hours only)
npm unpublish @lokascript/PACKAGE@1.0.0

# Unpublish all packages (DANGER!)
for pkg in $(npm run packages:list:public --silent | grep '@lokascript'); do
  npm unpublish "$pkg@1.0.0"
done
```

## Quick Verification Chain

```bash
# Check all 14 packages are published
echo "Checking published packages..." && \
npm view @lokascript/core version && \
npm view @lokascript/semantic version && \
npm view @lokascript/i18n version && \
npm view @lokascript/vite-plugin version && \
npm view @lokascript/testing-framework version && \
npm view @lokascript/behaviors version && \
npm view @lokascript/ast-toolkit version && \
npm view @lokascript/mcp-server version && \
npm view @lokascript/patterns-reference version && \
npm view @lokascript/types-browser version && \
echo "✅ All packages published!"
```
