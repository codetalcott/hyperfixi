# LokaScript - Maintenance Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-19
**Status**: Production Ready

This guide documents all systems and workflows for maintaining the LokaScript monorepo.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Rebuild Workflows](#rebuild-workflows)
3. [Version Management](#version-management)
4. [Changelog Management](#changelog-management)
5. [Publication Process](#publication-process)
6. [Common Tasks](#common-tasks)
7. [Scripts Reference](#scripts-reference)
8. [Documentation Index](#documentation-index)

## Quick Start

```bash
# After pulling changes
npm install
npm run build

# After modifying code
npm run rebuild                    # Quick rebuild
npm run rebuild:full               # Full validation

# Before publishing
npm run prepublishOnly             # Validates everything
```

## Rebuild Workflows

### Quick Reference

| Task            | Command                                         | Time  |
| --------------- | ----------------------------------------------- | ----- |
| Single package  | `npm run build --workspace=@lokascript/PACKAGE` | ~10s  |
| All packages    | `npm run build`                                 | ~30s  |
| With validation | `npm run rebuild`                               | ~45s  |
| Full rebuild    | `npm run rebuild:full`                          | ~2min |
| Clean rebuild   | `npm run rebuild:clean`                         | ~3min |

### Standard Workflow After Code Changes

```bash
# 1. Modify code in packages/core/src/...

# 2. Rebuild
cd packages/core
npm run build

# 3. Test
npm test

# 4. Verify in browser
cd ../..
npm run dev                        # http://localhost:3000
```

### Browser Bundles

The core package has multiple browser bundles:

```bash
cd packages/core

# Main bundle (default)
npm run build:browser

# Specific bundles
npm run build:browser:lite
npm run build:browser:hybrid-complete
npm run build:browser:minimal

# All bundles (~2-3 min)
npm run build:browser:all
```

**See**: [REBUILD_WORKFLOW.md](build/REBUILD_WORKFLOW.md) | [REBUILD_QUICKSTART.md](build/REBUILD_QUICKSTART.md)

## Version Management

### Fixed Versioning Strategy

All 21 packages share the same version number and bump together.

### Setting Version

```bash
# Set all packages to specific version
npm run version:set -- 1.2.3

# Validate versions are consistent
npm run version:validate
```

### Bumping Version

```bash
# Bump version (creates template in CHANGELOG.md)
npm run version:bump -- patch      # 1.0.0 → 1.0.1
npm run version:bump -- minor      # 1.0.0 → 1.1.0
npm run version:bump -- major      # 1.0.0 → 2.0.0

# Or set specific version
npm run version:bump -- 1.5.0
```

**What it does:**

1. Updates all package.json files
2. Creates CHANGELOG.md template
3. Creates git commit
4. Creates git tag

**Next steps:**

1. Edit CHANGELOG.md (add release notes)
2. Validate: `npm run changelog:validate`
3. Push: `git push && git push --tags`

**See**: [scripts/bump-version.cjs](scripts/bump-version.cjs)

## Changelog Management

### Guidelines

**INCLUDE (Public packages only):**

- @lokascript/core, semantic, i18n, vite-plugin, etc. (14 packages)
- User-facing features, bug fixes, breaking changes

**EXCLUDE (Private packages):**

- @lokascript/analytics, developer-tools, multi-tenant, etc. (6 packages)
- Internal changes, test infrastructure, development tools

### Validation

```bash
# Validate changelog (no private packages)
npm run changelog:validate

# List public/private packages
npm run packages:list
npm run packages:list:public
npm run packages:list:private
```

### Protection System

The `prepublishOnly` hook automatically validates the changelog. **Publication is blocked** if private packages are mentioned.

**See**: [CHANGELOG_GUIDELINES.md](build/CHANGELOG_GUIDELINES.md) | [CHANGELOG_PROTECTION.md](build/CHANGELOG_PROTECTION.md)

## Publication Process

### Pre-Publication Checklist

```bash
# 1. Clean rebuild
npm run rebuild:clean

# 2. Run full validation (happens automatically)
npm run prepublishOnly
# This runs:
# - npm run version:validate
# - npm run changelog:validate
# - npm run build
# - npm run test

# 3. Check dry-run (optional)
cd packages/core && npm publish --dry-run
cd ../semantic && npm publish --dry-run

# 4. Verify package lists
npm run packages:list:public        # Should see 14 packages
```

### Publishing to npm

```bash
# Option 1: Publish all packages with lerna
npm run release:publish

# Option 2: Publish individually (testing)
cd packages/core && npm publish
cd ../semantic && npm publish
# ... etc
```

### Post-Publication

```bash
# 1. Create GitHub Release
# - Tag: v1.0.0
# - Title: LokaScript v1.0.0
# - Body: Copy from CHANGELOG.md
# - Attach: Browser bundles from packages/core/dist/

# 2. Announce release
# - npm: Package pages updated automatically
# - GitHub: Release notes published
# - Documentation: Update version references
```

**See**: [PRE_PUBLICATION_REPORT.md](release/PRE_PUBLICATION_REPORT.md)

## Common Tasks

### Adding a New Package

```bash
# 1. Create package directory
mkdir packages/my-package
cd packages/my-package

# 2. Create package.json
{
  "name": "@lokascript/my-package",
  "version": "1.0.0",  # Match monorepo version
  "private": false,     # or true for internal
  "publishConfig": {
    "access": "public"  # if not private
  }
}

# 3. Add to version scripts
# Scripts automatically detect new packages

# 4. Build
npm run build
```

### Updating Dependencies

```bash
# Update specific package
npm update PACKAGE_NAME

# Update all packages
npm update

# Check for outdated
npm outdated

# After updating, rebuild
npm run rebuild:full
```

### Running Tests

```bash
# All tests
npm test

# Specific package
npm run test:core
npm run test:semantic

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Scripts Reference

### Build Scripts

| Script                   | Description                               |
| ------------------------ | ----------------------------------------- |
| `npm run build`          | Build all packages                        |
| `npm run build:packages` | Build packages only (not apps)            |
| `npm run rebuild`        | Build + typecheck                         |
| `npm run rebuild:full`   | Build + typecheck + test + validate       |
| `npm run rebuild:fast`   | Build + typecheck + validate (skip tests) |
| `npm run rebuild:clean`  | Clean + full rebuild                      |

### Validation Scripts

| Script                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `npm run version:validate`   | Check version consistency            |
| `npm run changelog:validate` | Check changelog for private packages |
| `npm run typecheck`          | TypeScript validation                |
| `npm run prepublishOnly`     | Full pre-publish validation          |

### Version Scripts

| Script                         | Description                      |
| ------------------------------ | -------------------------------- |
| `npm run version:set -- X.Y.Z` | Set all to version X.Y.Z         |
| `npm run version:bump -- TYPE` | Bump version (patch/minor/major) |

### Package Scripts

| Script                          | Description               |
| ------------------------------- | ------------------------- |
| `npm run packages:list`         | List all packages         |
| `npm run packages:list:public`  | List public packages (14) |
| `npm run packages:list:private` | List private packages (6) |

### Test Scripts

| Script                     | Description           |
| -------------------------- | --------------------- |
| `npm test`                 | Run all tests         |
| `npm run test:core`        | Test core package     |
| `npm run test:semantic`    | Test semantic package |
| `npm run test:integration` | Integration tests     |
| `npm run test:watch`       | Watch mode            |
| `npm run test:coverage`    | Coverage report       |

### Development Scripts

| Script               | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | HTTP server on :3000       |
| `npm run lint`       | Lint all packages          |
| `npm run lint:fix`   | Fix linting issues         |
| `npm run clean`      | Remove all build artifacts |
| `npm run clean:test` | Remove test outputs        |

## Documentation Index

### Core Documentation

- **[README.md](README.md)** - Project overview
- **[CLAUDE.md](CLAUDE.md)** - Claude Code context
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

### Workflow Documentation

- **[REBUILD_WORKFLOW.md](build/REBUILD_WORKFLOW.md)** - Comprehensive rebuild guide
- **[REBUILD_QUICKSTART.md](build/REBUILD_QUICKSTART.md)** - Quick reference
- **[PRE_PUBLICATION_REPORT.md](release/PRE_PUBLICATION_REPORT.md)** - Publication checklist

### Policy Documentation

- **[CHANGELOG_GUIDELINES.md](build/CHANGELOG_GUIDELINES.md)** - Changelog best practices
- **[CHANGELOG_PROTECTION.md](build/CHANGELOG_PROTECTION.md)** - Protection system
- **[TYPE_SAFETY_DESIGN.md](analysis/TYPE_SAFETY_DESIGN.md)** - Type safety patterns

### Package Documentation

- **[packages/core/README.md](packages/core/README.md)** - Core runtime
- **[packages/semantic/README.md](packages/semantic/README.md)** - Semantic parser
- **[packages/i18n/README.md](packages/i18n/README.md)** - Grammar transformation
- **[packages/vite-plugin/README.md](packages/vite-plugin/README.md)** - Vite integration

### Technical Documentation

- **[packages/core/docs/API.md](packages/core/docs/API.md)** - API reference
- **[packages/behaviors/AUTHORING.md](packages/behaviors/AUTHORING.md)** - Behavior system: authoring & installing
- **[packages/core/TREE_SHAKING_GUIDE.md](packages/core/TREE_SHAKING_GUIDE.md)** - Bundle optimization

## Troubleshooting

### Build Issues

**"Cannot find module @lokascript/core"**

```bash
npm run build --workspace=@lokascript/core
```

**Type errors**

```bash
npm run typecheck                  # Find issues
npm run build:types --prefix packages/core  # Rebuild types
```

**Stale artifacts**

```bash
npm run clean
npm run build
```

### Publication Issues

**"Version mismatch detected"**

```bash
npm run version:set -- 1.0.0      # Reset to target version
```

**"Private package found in CHANGELOG"**

```bash
npm run changelog:validate        # See which package
# Edit CHANGELOG.md to remove private package mentions
```

**"prepublishOnly failed"**

```bash
# Run each step individually to find issue
npm run version:validate
npm run changelog:validate
npm run build
npm run test
```

### Development Issues

**Hot reload not working**

```bash
npm run dev                        # Restart dev server
```

**Tests failing**

```bash
npm run clean:test                 # Clean test artifacts
npm test                           # Re-run tests
```

## Emergency Procedures

### Rollback Published Version

```bash
# 1. Identify bad version
npm view @lokascript/core versions

# 2. Deprecate bad version
npm deprecate @lokascript/core@X.Y.Z "Broken build, use X.Y.Z-1 instead"

# 3. Publish fix
npm run version:bump -- patch
# ... publish as normal
```

### Fix Version Inconsistency

```bash
# Reset all packages to specific version
npm run version:set -- 1.0.0
npm run version:validate

# If still broken, manual fix:
node scripts/set-version.cjs 1.0.0
git add . && git commit -m "fix: reset versions to 1.0.0"
```

## Support

- **Issues**: https://github.com/codetalcott/lokascript/issues
- **Discussions**: GitHub Discussions
- **Claude Code**: Use `/help` command

---

**Maintained by**: LokaScript Core Team
**License**: MIT
**Repository**: https://github.com/codetalcott/lokascript
