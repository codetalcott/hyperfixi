# Changelog Guidelines

## What to Include

The CHANGELOG.md is a **public-facing document** that describes changes to published npm packages.

### ✅ DO Include

**Public packages only** (14 packages):

- @lokascript/core
- @lokascript/semantic
- @lokascript/i18n
- @lokascript/vite-plugin
- @lokascript/ast-toolkit
- @lokascript/behaviors
- @lokascript/mcp-server
- @lokascript/patterns-reference
- @lokascript/testing-framework
- @lokascript/types-browser

**Types of changes**:

- New features visible to users
- Breaking API changes
- Bug fixes affecting published packages
- Security updates
- Deprecations
- Documentation improvements

### ❌ DO NOT Include

**Private packages** (7 packages):

- @lokascript/analytics
- @lokascript/developer-tools
- @lokascript/multi-tenant
- @lokascript/server-integration
- @lokascript/smart-bundling
- @lokascript/tron-backend
- hyperfixi-python

**Internal changes**:

- Development tooling updates
- Test infrastructure changes
- Build system improvements (unless they affect users)
- Internal refactoring
- Private package features

## Guidelines by Category

### Added

Features, packages, or capabilities that are new and user-facing.

**Good examples**:

- New command in @lokascript/core
- New language support in @lokascript/semantic
- New browser bundle option

**Bad examples**:

- Internal analytics tracking added (private package)
- New development tools (not user-facing)

### Changed

Modifications to existing functionality that users might notice.

**Good examples**:

- API signature changes
- Default behavior changes
- Performance improvements

**Bad examples**:

- Internal code restructuring
- Test suite improvements

### Fixed

Bug fixes that affect published packages.

**Good examples**:

- Parser bug fixed in @lokascript/core
- Memory leak fixed in browser bundle

**Bad examples**:

- Fixed test flakiness
- Fixed internal tooling bug

### Deprecated

Features or APIs marked for future removal.

**Good examples**:

- Old API method deprecated in favor of new one
- Legacy package marked as deprecated

### Removed

Features or APIs that have been removed.

**Good examples**:

- Removed deprecated API from @lokascript/core
- Removed support for old browser versions

### Security

Security-related fixes or improvements.

**Good examples**:

- XSS vulnerability fixed
- Dependency vulnerability patched

## Validation

Before publishing, run:

```bash
node scripts/validate-changelog.cjs
```

This script checks that:

1. No private package names appear in the changelog
2. All mentioned packages are public
3. Version sections are properly formatted

## Style Guide

### Format

- Use Keep a Changelog format
- Group changes by category (Added, Changed, Fixed, etc.)
- Use bullet points starting with `-`
- Put package names in **bold** when introducing new packages
- Put package names in code format for specific changes: `@lokascript/core`

### Examples

**Good**:

```markdown
### Added

- **New Command**: Added `fetch` command to @lokascript/core for HTTP requests
- **Language Support**: Added Korean language support to @lokascript/semantic
```

**Bad**:

```markdown
### Added

- Added analytics tracking to @lokascript/analytics (private package - shouldn't be here)
- Updated internal build tools (not user-facing)
```

### Version Entries

Each version should have:

- Version number and date: `## [1.1.0] - 2026-01-25`
- At least one non-empty category
- Clear, concise descriptions
- Links to issues/PRs where relevant

### Breaking Changes

Clearly mark breaking changes:

```markdown
### Changed

- **BREAKING**: `compile()` now returns `CompileResult` instead of throwing errors
  - Migration: Change `try/catch` to check `result.ok`
  - See migration guide: [MIGRATION.md](MIGRATION.md)
```

## Workflow

1. When bumping version: `npm run version:bump -- patch`
2. Script creates empty template in CHANGELOG.md
3. **Manually fill in changes** (this is where you filter out private packages)
4. Validate changelog: `node scripts/validate-changelog.cjs`
5. Commit and push
6. Publish packages

## Reference

To see which packages are public vs private:

```bash
# List public packages
node scripts/list-packages.cjs --public

# List private packages
node scripts/list-packages.cjs --private

# Check changelog for private packages
node scripts/validate-changelog.cjs
```
