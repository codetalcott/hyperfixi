# Release Checklist - v1.0.0

Quick reference checklist for releasing LokaScript packages to npm.

See [RELEASE_GUIDE.md](RELEASE_GUIDE.md) for detailed instructions.

## Pre-Release ✓

- [ ] On main branch and clean working directory
- [ ] Pulled latest changes: `git pull origin main`
- [ ] Validated versions: `npm run version:validate`
- [ ] Validated changelog: `npm run changelog:validate`
- [ ] Reviewed public packages list: `npm run packages:list:public`

## Build & Test ✓

- [ ] Clean rebuild: `npm run rebuild:clean` (3-5 minutes)
- [ ] All tests passing
- [ ] Type check passing
- [ ] Verified build artifacts exist in dist/ directories
- [ ] Dry run publish: `npm publish --dry-run` (core, semantic, i18n)

## NPM Setup ✓

- [ ] Logged into npm: `npm whoami`
- [ ] Member of @lokascript organization
- [ ] 2FA enabled on npm account
- [ ] Publish permissions verified

## Publishing 📦

### Core Packages (Required)

- [ ] @lokascript/core

  ```bash
  cd packages/core && npm publish --access public && cd ../..
  ```

- [ ] @lokascript/semantic

  ```bash
  cd packages/semantic && npm publish --access public && cd ../..
  ```

- [ ] @lokascript/i18n
  ```bash
  cd packages/i18n && npm publish --access public && cd ../..
  ```

### Other Packages

- [ ] @lokascript/vite-plugin
- [ ] @lokascript/testing-framework
- [ ] @lokascript/behaviors
- [ ] @lokascript/ast-toolkit
- [ ] @lokascript/mcp-server
- [ ] @lokascript/patterns-reference
- [ ] @lokascript/types-browser

## Verification ✅

- [ ] All packages visible on npm: `npm view @lokascript/core version`
- [ ] Test installation works:
  ```bash
  mkdir /tmp/test && cd /tmp/test
  npm init -y
  npm install @lokascript/core @lokascript/semantic
  node -e "console.log(require('@lokascript/core'))"
  ```
- [ ] Browser bundles work via CDN:
  ```html
  <script src="https://unpkg.com/@lokascript/semantic@1.0.0/dist/browser-en.en.global.js"></script>
  ```

## GitHub Release 🎉

- [ ] Created git tag:

  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  ```

- [ ] Created GitHub release at: https://github.com/codetalcott/lokascript/releases/new
  - [ ] Added release notes from CHANGELOG.md
  - [ ] Attached browser bundles
  - [ ] Published release

## Post-Release 📣

- [ ] Updated documentation with npm install instructions
- [ ] Announced release (optional):
  - [ ] Twitter/X
  - [ ] Reddit
  - [ ] Dev.to
  - [ ] Hacker News
- [ ] Monitoring npm stats
- [ ] Monitoring GitHub issues

## Rollback (If Needed) 🔙

If critical issues found within 72 hours:

```bash
npm unpublish @lokascript/PACKAGE@1.0.0
```

⚠️ **Better**: Publish patch version instead of unpublishing.

---

**Started**: \***\*\_\_\_\*\***
**Completed**: \***\*\_\_\_\*\***
**Duration**: \***\*\_\_\_\*\***
**Released by**: \***\*\_\_\_\*\***
