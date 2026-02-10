# LokaScript Release Guide

## Overview

This guide walks through the complete process of releasing LokaScript packages to npm. Follow these steps carefully to ensure a smooth release.

## Pre-Release Checklist

### 1. Verify Current State

```bash
# Check git status (should be clean)
git status

# Verify you're on main branch
git branch --show-current

# Pull latest changes
git pull origin main

# Check current version
cat package.json | jq '.version'
# Should show: "1.0.0"
```

### 2. Validate All Packages

```bash
# Run validation script
npm run version:validate

# Expected output:
# ✅ All packages at version 1.0.0
# Validated 21 packages
```

### 3. Validate Changelog

```bash
# Ensure no private packages mentioned
npm run changelog:validate

# Expected output:
# ✅ No private packages found in CHANGELOG.md
# Validated against 6 private packages
```

### 4. Review Public Packages

```bash
# List all public packages
npm run packages:list:public

# Expected output:
# 📦 Public Packages (14):
#   ✅ @lokascript/ast-toolkit
#   ✅ @lokascript/behaviors
#   ✅ @lokascript/core
#   ✅ @lokascript/i18n
#   ✅ @lokascript/mcp-server
#   ✅ @lokascript/patterns-reference
#   ✅ @lokascript/semantic
#   ✅ @lokascript/testing-framework
#   ✅ @lokascript/types-browser
#   ✅ @lokascript/vite-plugin
```

## Build and Test Phase

### 5. Clean Build All Packages

```bash
# Full clean rebuild
npm run rebuild:clean

# This will:
# - Remove all dist/ directories
# - Remove all node_modules/
# - Reinstall dependencies
# - Build all packages
# - Run type checking
# - Run all tests
# - Validate versions and changelog

# Expected duration: ~3-5 minutes
```

**⚠️ IMPORTANT**: If any step fails, STOP and fix the issues before proceeding.

### 6. Verify Build Artifacts

```bash
# Check core bundles
ls -lh packages/core/dist/*.js | head -10

# Check semantic bundles
ls -lh packages/semantic/dist/browser-*.global.js | head -10

# Check i18n bundle
ls -lh packages/i18n/dist/*.js | head -5

# Verify bundle sizes
du -sh packages/core/dist/
du -sh packages/semantic/dist/
du -sh packages/i18n/dist/
```

### 7. Dry Run Publishing

Test the publishing process without actually publishing:

```bash
# Dry run for key packages
cd packages/core && npm publish --dry-run
cd ../semantic && npm publish --dry-run
cd ../i18n && npm publish --dry-run
cd ../vite-plugin && npm publish --dry-run
cd ../..

# Check for any warnings or errors
# Look for:
# - Files that shouldn't be included
# - Missing files that should be included
# - Incorrect package sizes
```

## NPM Authentication

### 8. Verify NPM Authentication

```bash
# Check if logged in
npm whoami

# If not logged in, login with your npm account
npm login

# Verify you're part of @lokascript organization
npm org ls lokascript

# Verify you have publish permissions
npm access ls-packages @lokascript
```

**⚠️ CRITICAL**: Ensure you have:

- Valid npm authentication token
- Publish access to @lokascript organization
- 2FA enabled on npm account (required for organization packages)

## Publishing Packages

### 9. Publish Strategy

We'll publish packages in dependency order to avoid issues:

**Order:**

1. Core packages (no dependencies)
2. Packages that depend on core
3. Integration packages

### 10. Publish Core Package

```bash
cd packages/core

# Final check
npm run build
npm test

# Publish
npm publish --access public

# You'll be prompted for 2FA code
# Enter the code from your authenticator app

# Verify published
npm view @lokascript/core

cd ../..
```

### 11. Publish Semantic Package

```bash
cd packages/semantic

# Final check
npm run build
npm test

# Publish
npm publish --access public

# Verify
npm view @lokascript/semantic

cd ../..
```

### 12. Publish i18n Package

```bash
cd packages/i18n

# Final check
npm run build
npm test

# Publish
npm publish --access public

# Verify
npm view @lokascript/i18n

cd ../..
```

### 13. Publish Remaining Packages

Publish the rest in order:

```bash
# Vite Plugin
cd packages/vite-plugin && npm publish --access public && cd ../..

# Testing Framework
cd packages/testing-framework && npm publish --access public && cd ../..

# Behaviors
cd packages/behaviors && npm publish --access public && cd ../..

# AST Toolkit
cd packages/ast-toolkit && npm publish --access public && cd ../..

# MCP Server
cd packages/mcp-server && npm publish --access public && cd ../..

# Patterns Reference
cd packages/patterns-reference && npm publish --access public && cd ../..

# Types Browser
cd packages/types-browser && npm publish --access public && cd ../..
```

**Alternative: Batch Publishing**

If you prefer to publish all at once:

```bash
# WARNING: This publishes ALL public packages simultaneously
# Make sure you're ready!

for pkg in packages/*/package.json; do
  dir=$(dirname "$pkg")
  if ! grep -q '"private": true' "$pkg"; then
    echo "Publishing $dir"
    (cd "$dir" && npm publish --access public)
  fi
done
```

## Post-Release Verification

### 14. Verify All Packages on npm

```bash
# Check each package is available
npm view @lokascript/core version
npm view @lokascript/semantic version
npm view @lokascript/i18n version
npm view @lokascript/vite-plugin version

# Expected output for each: 1.0.0
```

### 15. Test Installation

Create a test project and verify installation works:

```bash
# Create test directory
mkdir /tmp/lokascript-test
cd /tmp/lokascript-test

# Initialize project
npm init -y

# Install packages
npm install @lokascript/core @lokascript/semantic @lokascript/i18n

# Verify installation
ls -la node_modules/@lokascript/

# Test imports
node -e "const core = require('@lokascript/core'); console.log('Core loaded:', !!core);"
node -e "const semantic = require('@lokascript/semantic'); console.log('Semantic loaded:', !!semantic);"

# Clean up
cd -
rm -rf /tmp/lokascript-test
```

### 16. Test Browser Bundles

```bash
# Create simple test HTML
cat > /tmp/test-bundles.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>LokaScript Bundle Test</title>
</head>
<body>
  <h1>Testing LokaScript Bundles</h1>
  <div id="result"></div>

  <script src="https://unpkg.com/@lokascript/semantic@1.0.0/dist/browser-en.en.global.js"></script>
  <script>
    const result = document.getElementById('result');
    try {
      const parsed = LokaScriptSemanticEn.parse('toggle .active', 'en');
      result.innerHTML = '<p style="color: green;">✅ Bundle loaded and working!</p>';
      console.log('Parsed:', parsed);
    } catch (err) {
      result.innerHTML = '<p style="color: red;">❌ Error: ' + err.message + '</p>';
    }
  </script>
</body>
</html>
EOF

# Open in browser to verify
open /tmp/test-bundles.html
# Or: python3 -m http.server 8080 (then open http://localhost:8080/test-bundles.html)
```

## Create GitHub Release

### 17. Create Git Tag

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release

LokaScript 1.0.0 - First public release

Core Features:
- Full hyperscript runtime with 43 commands
- Multilingual semantic parsing for 23 languages
- Grammar transformation for SOV/VSO/SVO word orders
- 7 optimized browser bundles (lite to full)
- Zero-config Vite plugin
- Comprehensive TypeScript support

Packages Released:
- @lokascript/core (663 KB)
- @lokascript/semantic (2.7 MB)
- @lokascript/i18n (2.7 MB)
- @lokascript/vite-plugin (137 KB)
- ... and 10 more packages

See CHANGELOG.md for full details.
"

# Push tag
git push origin v1.0.0
```

### 18. Create GitHub Release

Go to GitHub and create a release:

```bash
# Open GitHub releases page
open https://github.com/codetalcott/lokascript/releases/new

# Or use gh CLI:
gh release create v1.0.0 \
  --title "v1.0.0 - Initial Public Release" \
  --notes-file CHANGELOG.md \
  packages/core/dist/lokascript-browser.js \
  packages/core/dist/lokascript-hybrid-complete.js \
  packages/semantic/dist/browser.global.js \
  packages/i18n/dist/lokascript-i18n.min.js
```

**Release Notes Template:**

````markdown
# LokaScript v1.0.0 - Initial Public Release

We're excited to announce the first public release of **LokaScript**, a complete hyperscript ecosystem with multilingual support and modern developer tooling.

## 🎉 What's New

### Core Features

- ✅ **43 Commands**: Full hyperscript command set
- ✅ **23 Languages**: Write hyperscript in your native language
- ✅ **7 Browser Bundles**: From 1.9 KB (lite) to 203 KB (full)
- ✅ **Zero-Config Vite Plugin**: Automatic minimal bundles
- ✅ **4046 Tests**: >95% test coverage

### Packages Released

- [@lokascript/core](https://www.npmjs.com/package/@lokascript/core) - Runtime and parser
- [@lokascript/semantic](https://www.npmjs.com/package/@lokascript/semantic) - Multilingual parsing
- [@lokascript/i18n](https://www.npmjs.com/package/@lokascript/i18n) - Grammar transformation
- [@lokascript/vite-plugin](https://www.npmjs.com/package/@lokascript/vite-plugin) - Vite integration
- ... and 10 more packages

## 📦 Installation

```bash
npm install @lokascript/core
```
````

## 🚀 Quick Start

```html
<script src="https://unpkg.com/@lokascript/core@1.0.0/dist/lokascript-browser.js"></script>
<button _="on click toggle .active">Toggle</button>
```

## 📚 Documentation

- [README](https://github.com/codetalcott/lokascript#readme)
- [CLAUDE.md](https://github.com/codetalcott/lokascript/blob/main/CLAUDE.md)
- [Language Bundles](https://github.com/codetalcott/lokascript/blob/main/packages/semantic/LANGUAGE_BUNDLES.md)

## 🌍 Supported Languages

English, Spanish, French, German, Portuguese, Japanese, Korean, Chinese, Arabic, Turkish, Indonesian, Quechua, Swahili, and more!

## 📊 Bundle Sizes

| Bundle          | Size   | Use Case                  |
| --------------- | ------ | ------------------------- |
| Lite            | 1.9 KB | Basic toggle/show/hide    |
| Hybrid Complete | 7.3 KB | ~85% hyperscript coverage |
| Standard        | 63 KB  | Full command set          |
| Browser         | 203 KB | Everything + parser       |

See [CHANGELOG.md](https://github.com/codetalcott/lokascript/blob/main/CHANGELOG.md) for complete details.

```

## Post-Release Tasks

### 19. Update Documentation

Update any documentation that references installation:

- [ ] Update README.md with installation instructions
- [ ] Update examples to use npm packages
- [ ] Update documentation site (if applicable)
- [ ] Update package READMEs with npm badges

### 20. Announce Release

Consider announcing on:
- [ ] Twitter/X
- [ ] Reddit (r/javascript, r/webdev)
- [ ] Dev.to
- [ ] Hacker News
- [ ] Discord/Slack communities
- [ ] Company blog/website

### 21. Monitor for Issues

After release, monitor:
- [ ] npm download stats: `npm view @lokascript/core`
- [ ] GitHub issues: https://github.com/codetalcott/lokascript/issues
- [ ] npm package page: https://www.npmjs.com/package/@lokascript/core
- [ ] CDN availability: https://unpkg.com/@lokascript/core@1.0.0/

## Troubleshooting

### Publishing Fails with 403 Error

```

npm ERR! code E403
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@lokascript/core

```

**Solutions:**
1. Verify you're logged in: `npm whoami`
2. Check organization membership: `npm org ls lokascript`
3. Verify 2FA is enabled on npm account
4. Ensure package.json has `"publishConfig": { "access": "public" }`

### Package Already Exists

```

npm ERR! code E409
npm ERR! 409 Conflict - PUT https://registry.npmjs.org/@lokascript/core

````

**Solution:**
- Package version already published
- Bump version: `npm run version:bump -- patch`
- Or publish with new version

### Files Missing from Published Package

**Solution:**
1. Check package.json `files` field
2. Check .npmignore patterns
3. Run `npm publish --dry-run` to preview included files
4. Adjust files/npmignore as needed

### Test Installation Fails

**Solutions:**
1. Wait 5-10 minutes for npm CDN to propagate
2. Clear npm cache: `npm cache clean --force`
3. Try different npm registry: `npm install --registry=https://registry.npmjs.org`

## Rollback Procedure

If you need to unpublish (within 72 hours):

```bash
# DANGER: This cannot be undone!
# Only use if there's a critical issue

# Unpublish specific package
npm unpublish @lokascript/core@1.0.0

# Unpublish all packages (nuclear option)
for pkg in $(npm run packages:list:public --silent | grep '@lokascript'); do
  npm unpublish "$pkg@1.0.0"
done
````

**⚠️ WARNING**: Unpublishing is discouraged by npm. Consider publishing a patch version instead.

## Post-Mortem

After release, document:

- [ ] What went well
- [ ] What could be improved
- [ ] Any issues encountered
- [ ] Time taken for each phase
- [ ] Update this guide with lessons learned

## Quick Reference

```bash
# Pre-release
npm run version:validate
npm run changelog:validate
npm run rebuild:clean

# Publish (core packages)
cd packages/core && npm publish --access public && cd ../..
cd packages/semantic && npm publish --access public && cd ../..
cd packages/i18n && npm publish --access public && cd ../..

# Post-release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
gh release create v1.0.0

# Verify
npm view @lokascript/core version
npm install @lokascript/core
```

---

**Last Updated**: 2026-01-19
**Current Version**: 1.0.0
**Status**: ✅ Ready for Release
