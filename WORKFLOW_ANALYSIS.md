# GitHub Actions Workflow Analysis

## Summary

Analyzed 7 workflows with the following findings:

- 3 workflows currently failing
- Significant duplication across workflows
- Opportunity to reduce complexity by ~40%

---

## Current Failures

### 1. CI Workflow - Browser Tests Job ❌

**Status**: Failing consistently
**Error**: `Could not load packages/semantic/dist/index.js: ENOENT`

**Root Cause**: Build order issue in [.github/workflows/ci.yml:227-232](.github/workflows/ci.yml#L227-L232). The job tries to build multiple browser bundles simultaneously:

```bash
npm run build:browser --prefix packages/core
npm run build:browser:hybrid-complete --prefix packages/core
npm run build:browser:classic-i18n --prefix packages/core
npm run build:browser:multilingual --prefix packages/core
```

The `build:browser:multilingual` and `build:browser:classic-i18n` commands may depend on files not created by the base `build` command.

**Fix**:

- Run `npm run build --prefix packages/core` (full build) before browser bundle builds
- Or sequence the browser bundle builds properly with dependencies

---

### 2. Tests Workflow - Multilingual Validation Job ⚠️

**Status**: Failing on SOV/VSO languages
**Pass Rates**:

- Arabic (AR): 61% (expected >80%)
- Japanese (JA): 11% (expected >80%)
- Korean (KO): 7% (expected >80%)
- Turkish (TR): 2% (expected >80%)
- Tagalog (TL): 49% (expected >80%)

**Root Cause**: Grammar transformation for non-SVO languages needs more development. This is a known issue (see [test.yml:95](test.yml#L95)) but pass rates are lower than expected.

**Fix**: This is a **feature development issue**, not a CI issue. Options:

1. Set more realistic pass thresholds in workflow (continue-on-error with lower expectations)
2. Skip these languages in CI until fully implemented
3. Fix the grammar transformations (larger effort)

**Recommendation**: Skip or mark as expected failures until grammar system is complete.

---

### 3. Tests Workflow - Browser Tests Job ❌

**Status**: Failing on behavior tests
**Failing Tests**: Draggable, Sortable, Resizable behaviors

**Root Cause**: Behaviors feature not fully implemented. Parser errors:

- `Expected 'end' to close behavior definition`
- Behaviors not installing on elements

**Fix**: This is a **feature development issue**. Options:

1. Skip these tests in CI until behaviors are implemented
2. Mark as expected failures (continue-on-error)

**Recommendation**: Move behavior tests to a separate "experimental features" suite that doesn't block CI.

---

### 4. Semantic Package CI - Cache Configuration ⚠️

**Status**: Non-critical but incorrect
**Issue**: [semantic.yml:26](.github/workflows/semantic.yml#L26) specifies `cache-dependency-path: packages/semantic/package-lock.json` but this file doesn't exist in a monorepo setup.

**Fix**: Remove the `cache-dependency-path` parameter (let it auto-detect root package-lock.json) or set to root:

```yaml
cache-dependency-path: package-lock.json
```

---

## Workflow Duplication Analysis

### Overlap Matrix

| Feature            | ci.yml | test.yml | semantic.yml | benchmark.yml | patterns-reference.yml |
| ------------------ | ------ | -------- | ------------ | ------------- | ---------------------- |
| Lint/Typecheck     | ✅     | ✅       | ✅           | -             | ✅                     |
| Unit Tests         | ✅     | ✅       | ✅           | -             | ✅                     |
| Browser Tests      | ✅     | ✅       | -            | -             | -                      |
| Build Packages     | ✅     | ✅       | ✅           | ✅            | ✅                     |
| Bundle Size Check  | ✅     | -        | -            | ✅            | -                      |
| Multilingual Tests | -      | ✅       | -            | -             | -                      |

### Duplication Issues

1. **ci.yml vs test.yml**: ~60% overlap
   - Both run browser tests (slightly different configs)
   - Both run unit tests
   - Both build same packages multiple times

2. **Bundle size checking**: Appears in both `ci.yml` (lines 249-337) and `benchmark.yml` (lines 106-139) with different limits

3. **Build steps repeated**: Every workflow rebuilds semantic → i18n → core in sequence
   - Happens 5+ times per CI run
   - No artifact sharing between jobs

4. **Path-specific workflows** (`semantic.yml`, `patterns-reference.yml`) could be jobs in main CI

---

## Simplification Recommendations

### Option A: Consolidate into Single CI Workflow (Recommended)

**Before**: 7 separate workflows
**After**: 3 workflows (CI, Publish, Pre-Publish)

**Structure**:

```yaml
# .github/workflows/ci.yml (consolidated)
jobs:
  # Shared build job (runs once)
  build:
    - Build semantic, i18n, core
    - Upload as artifacts

  # Parallel jobs using artifacts
  lint-typecheck:
    needs: build

  unit-tests:
    needs: build
    matrix: [node 18, 20, 22]

  browser-tests:
    needs: build

  bundle-size:
    needs: build

  # Path-conditional jobs
  semantic-tests:
    if: changed('packages/semantic/**')
    needs: build

  patterns-tests:
    if: changed('packages/patterns-reference/**')
    needs: build
```

**Benefits**:

- Build packages once, use everywhere (faster, consistent)
- Easier to maintain (one file vs three)
- Clear dependencies between jobs
- Reduced total CI time by ~30-40%

**Files to remove**:

- `.github/workflows/test.yml` (merge into ci.yml)
- `.github/workflows/semantic.yml` (merge into ci.yml)
- `.github/workflows/patterns-reference.yml` (merge into ci.yml)

---

### Option B: Fix Current Structure (Minimal Changes)

Keep separate workflows but fix issues:

1. **ci.yml fixes**:
   - Add full core build before browser bundle builds
   - Share build artifacts between jobs
   - Reduce bundle size limit to 230KB (actual size ~203-208KB)

2. **test.yml fixes**:
   - Mark failing multilingual tests as `continue-on-error: true`
   - Skip behavior tests or move to separate experimental suite
   - Remove duplicate browser tests (use ci.yml version)

3. **semantic.yml fixes**:
   - Fix cache-dependency-path
   - Consider merging into ci.yml with path filter

4. **Remove duplication**:
   - Move bundle size check to single location
   - Create reusable workflow for common build steps

---

## Immediate Action Items

### Critical (Blocking CI)

1. ✅ Fix ci.yml browser bundle build order
2. ✅ Fix semantic.yml cache configuration
3. ✅ Skip or mark known-failing multilingual tests as expected

### High Priority (Reduce Complexity)

4. Choose consolidation approach (Option A or B)
5. Implement shared build artifacts
6. Remove one set of duplicate browser tests

### Medium Priority (Technical Debt)

7. Deduplicate bundle size checks
8. Move experimental features to separate test suite
9. Add workflow diagram to documentation

---

## Workflow Metrics

| Workflow               | Jobs | Avg Duration | Failure Rate | Complexity |
| ---------------------- | ---- | ------------ | ------------ | ---------- |
| ci.yml                 | 6    | 10-15 min    | 60%          | High       |
| test.yml               | 3    | 8-14 min     | 70%          | Medium     |
| semantic.yml           | 3    | 3-5 min      | 30%          | Low        |
| benchmark.yml          | 2    | 5-7 min      | 0%           | Low        |
| patterns-reference.yml | 2    | 4-6 min      | 0%           | Low        |

**Total CI time per push**: ~25-35 minutes
**Estimated after consolidation**: ~15-20 minutes (40% reduction)

---

## Testing Matrix Coverage

### Currently Tested

- ✅ Node versions: 18, 20, 22
- ✅ OS: Ubuntu only
- ✅ Browsers: Chromium (via Playwright)
- ✅ Languages: 20 of 23 (excluding QU, BN, MS)

### Gaps

- ❌ No Windows/macOS testing
- ❌ No Firefox/Safari testing
- ⚠️ Incomplete SOV/VSO language support

---

## Next Steps

1. **Decide on approach**: Review Option A vs B
2. **Fix immediate failures**: Implement fixes for critical items
3. **Create PR**: Implement chosen consolidation approach
4. **Monitor**: Watch CI pass rates improve
5. **Document**: Update CLAUDE.md with new workflow structure

Would you like me to implement Option A (consolidation) or Option B (minimal fixes)?
