# Publishing Readiness Plan: @hyperfixi/core and @hyperfixi/semantic

**Date:** 2026-01-16
**Status:** Ready for implementation

## Model Assignment Legend

| Model      | Use For                                              | Cost    |
| ---------- | ---------------------------------------------------- | ------- |
| **Haiku**  | File copies, running commands, mechanical JSON edits | Lowest  |
| **Sonnet** | Straightforward code changes, multi-field edits      | Medium  |
| **Opus**   | Complex debugging, architectural decisions           | Highest |

---

## Executive Summary

This plan addresses critical issues blocking npm publication of the core and semantic packages. The semantic package must be published first since core depends on it.

---

## Priority 1: CRITICAL - Fix Semantic Package TypeScript Errors

| Attribute  | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Model**  | **Sonnet**                                              |
| **Impact** | Blocks all builds and tests                             |
| **Reason** | Simple code edit but requires understanding the context |

### Issue

The `generate-indexes.ts` script creates invalid JavaScript identifiers for `marker-templates.ts` because it treats it as a language profile (it's not - it's a utility file).

**Affected file:** `packages/semantic/src/generators/language-profiles.ts`

- Line 44: `export { marker-templatesProfile }` (invalid - hyphen in identifier)
- Line 70: `import { marker-templatesProfile }` (invalid)
- Line 105: `marker-templates: marker-templatesProfile` (invalid variable reference)

### Fix

Edit `packages/semantic/scripts/generate-indexes.ts`:

**Line 174** - Add `'marker-templates.ts'` to excludes:

```typescript
// FROM:
const files = getLanguageFiles(dir, ['index.ts', 'types.ts']);
// TO:
const files = getLanguageFiles(dir, ['index.ts', 'types.ts', 'marker-templates.ts']);
```

**Line 219** - Same change:

```typescript
// FROM:
const files = getLanguageFiles(dir, ['index.ts', 'types.ts']);
// TO:
const files = getLanguageFiles(dir, ['index.ts', 'types.ts', 'marker-templates.ts']);
```

Then regenerate:

```bash
npm run generate:indexes --prefix packages/semantic
```

### Verification

```bash
npm run typecheck --prefix packages/semantic  # Must pass
npm test --prefix packages/semantic -- --run   # Must pass
npm run build --prefix packages/semantic       # Must succeed
```

---

## Priority 2: CRITICAL - Fix Core Package Dependencies

| Attribute  | Value                                           |
| ---------- | ----------------------------------------------- |
| **Model**  | **Sonnet**                                      |
| **Impact** | Blocks npm installation after publish           |
| **Reason** | Multiple JSON edits requiring careful placement |

### Issue 1: Invalid entry point exports

`packages/core/package.json` lines 15-24 export `./parser` and `./runtime` but no index files exist in those directories.

### Fix 1: Remove invalid exports

Delete lines 15-24 from `packages/core/package.json`:

```json
"./parser": {
  "types": "./dist/parser/index.d.ts",
  "import": "./dist/parser/index.mjs",
  "require": "./dist/parser/index.js"
},
"./runtime": {
  "types": "./dist/runtime/index.d.ts",
  "import": "./dist/runtime/index.mjs",
  "require": "./dist/runtime/index.js"
},
```

### Issue 2: Dev dependencies in wrong section

`esbuild`, `jsdom`, `vite` are in `dependencies` but are only used for development.

### Fix 2: Move to devDependencies

In `packages/core/package.json`, move from `dependencies` to `devDependencies`:

- `"esbuild": "0.25.11"`
- `"jsdom": "^26.1.0"`
- `"vite": "^7.1.12"`

### Issue 3: File-path dependency won't work on npm

`"@hyperfixi/semantic": "file:../semantic"` breaks when published.

### Fix 3: Update after semantic is published

After publishing semantic to npm, update to:

```json
"@hyperfixi/semantic": "^0.1.0"
```

---

## Priority 3: HIGH - Add LICENSE Files

| Attribute  | Value                                     |
| ---------- | ----------------------------------------- |
| **Model**  | **Haiku**                                 |
| **Impact** | Legal compliance                          |
| **Reason** | Simple file copy and mechanical JSON edit |

### Fix

1. Copy LICENSE to both packages:

```bash
cp LICENSE packages/core/LICENSE
cp LICENSE packages/semantic/LICENSE
```

2. Update `packages/core/package.json` files array:

```json
"files": [
  "dist/",
  "src/",
  "docs/",
  "README.md",
  "LICENSE"
]
```

3. Update `packages/semantic/package.json` files array:

```json
"files": [
  "dist",
  "src",
  "LICENSE"
]
```

---

## Priority 4: RECOMMENDED - Add Semantic Package Metadata

| Attribute  | Value                                  |
| ---------- | -------------------------------------- |
| **Model**  | **Haiku**                              |
| **Impact** | npm discoverability and best practices |
| **Reason** | Mechanical JSON field additions        |

### Fix

Add to `packages/semantic/package.json`:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/hyperfixi/hyperfixi.git",
  "directory": "packages/semantic"
},
"bugs": {
  "url": "https://github.com/hyperfixi/hyperfixi/issues"
},
"homepage": "https://github.com/hyperfixi/hyperfixi/tree/main/packages/semantic#readme",
"engines": {
  "node": ">=18.0.0"
},
"publishConfig": {
  "access": "public"
}
```

---

## Implementation Order with Model Assignments

### Step 1: Fix Semantic Package [Sonnet]

```bash
# 1. Edit generate-indexes.ts (add marker-templates.ts to excludes)
# 2. Regenerate index files
npm run generate:indexes --prefix packages/semantic

# 3. Verify
npm run typecheck --prefix packages/semantic
npm test --prefix packages/semantic -- --run
npm run build --prefix packages/semantic
```

### Step 2: Add LICENSE and Metadata to Semantic [Haiku]

```bash
# 1. Copy LICENSE
cp LICENSE packages/semantic/LICENSE

# 2. Edit package.json (add repository, bugs, homepage, engines, publishConfig, update files)
```

### Step 3: Publish Semantic [Haiku]

```bash
cd packages/semantic
npm publish --access public
```

### Step 4: Fix Core Package [Sonnet]

```bash
# 1. Edit package.json:
#    - Remove ./parser and ./runtime exports
#    - Move esbuild, jsdom, vite to devDependencies
#    - Update @hyperfixi/semantic to "^0.1.0"
#    - Add LICENSE to files array

# 2. Copy LICENSE
cp LICENSE packages/core/LICENSE

# 3. Verify
npm run typecheck --prefix packages/core
npm test --prefix packages/core -- --run
npm run build --prefix packages/core
```

### Step 5: Publish Core [Haiku]

```bash
cd packages/core
npm publish --access public
```

---

## Files to Modify

| File                                            | Changes                                                                                                            | Model  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| `packages/semantic/scripts/generate-indexes.ts` | Add `'marker-templates.ts'` to excludes at lines 174 and 219                                                       | Sonnet |
| `packages/semantic/package.json`                | Add repository, bugs, homepage, engines, publishConfig; update files array                                         | Haiku  |
| `packages/semantic/LICENSE`                     | Copy from root                                                                                                     | Haiku  |
| `packages/core/package.json`                    | Remove ./parser and ./runtime exports; move esbuild/jsdom/vite to devDeps; update semantic dep; update files array | Sonnet |
| `packages/core/LICENSE`                         | Copy from root                                                                                                     | Haiku  |

---

## Verification Checklist

### Before publishing semantic

- [ ] `npm run typecheck --prefix packages/semantic` passes
- [ ] `npm test --prefix packages/semantic -- --run` passes
- [ ] `npm run build --prefix packages/semantic` succeeds
- [ ] LICENSE file exists in packages/semantic/
- [ ] package.json has repository, bugs, homepage, engines, publishConfig

### Before publishing core

- [ ] semantic is published to npm at version 0.1.0
- [ ] `@hyperfixi/semantic` dependency updated to `^0.1.0`
- [ ] Invalid `./parser` and `./runtime` exports removed
- [ ] esbuild, jsdom, vite moved to devDependencies
- [ ] `npm run typecheck --prefix packages/core` passes
- [ ] `npm test --prefix packages/core -- --run` passes
- [ ] `npm run build --prefix packages/core` succeeds
- [ ] LICENSE file exists in packages/core/

---

## Deferred Items (Post-Release)

These are not required for initial publish but should be addressed later:

| Item                                                                              | Model  |
| --------------------------------------------------------------------------------- | ------ |
| Add missing unit tests for animation commands (measure, settle, take, transition) | Sonnet |
| Add missing unit tests for behaviors/install                                      | Sonnet |
| Add missing unit tests for content/append                                         | Sonnet |
| Add missing unit tests for execution commands (call, pseudo-command)              | Sonnet |
| Increase test coverage thresholds from 60% to 70%+                                | Haiku  |
| Add TypeScript types to browser bundle exports                                    | Haiku  |
