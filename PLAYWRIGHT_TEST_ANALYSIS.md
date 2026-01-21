# Playwright Test Suite Analysis

**Generated:** 2026-01-20
**Commit:** 0adf8463

## Current State

### Test Distribution

| Project           | Tests | % of Total | Runtime  | Purpose                        |
| ----------------- | ----- | ---------- | -------- | ------------------------------ |
| **smoke**         | 8     | 1.0%       | ~3s      | Critical path validation       |
| **quick**         | 62    | 7.6%       | ~10-15s  | Broader coverage than smoke    |
| **integration**   | 0     | 0.0%       | N/A      | Pre-commit validation (unused) |
| **comprehensive** | 103   | 12.7%      | ~60s     | Feature coverage               |
| **cookbook**      | 14    | 1.7%       | ~60s     | Pattern validation             |
| **full**          | 814   | 100%       | ~5-10min | Everything except @skip        |
| **Untagged**      | ~627  | 77.0%      | N/A      | No category                    |

**Total Tests:** 814 across 50 files

### Files with @quick Tags (7 files)

1. `classic-i18n.spec.ts` - Classic i18n parsing tests
2. `i18n-package.spec.ts` - i18n package browser bundle tests
3. `semantic-multilingual.spec.ts` - Semantic parser multilingual tests
4. `showcase-test.spec.ts` - Showcase page validation
5. `semantic-package.spec.ts` - Semantic package tests
6. `multilingual-e2e.spec.ts` - End-to-end multilingual tests
7. `hybrid-complete.spec.ts` - Hybrid bundle tests

### Key Issues

1. **77% of tests are untagged** - Only run in "full" mode, making them hard to run selectively
2. **@integration project is empty** - No tests use this tag despite being configured
3. **@quick is indeed arbitrary** - Only covers 7 files (mostly i18n/multilingual), misses core features
4. **Long runtime for full suite** - 814 tests take 5-10 minutes, discourages frequent testing
5. **No command/feature-based categorization** - Tests aren't organized by what they validate

## Recommendations

### Strategy 1: Feature-Based Tagging (Recommended)

Tag tests based on what feature/command they validate. This allows targeted testing when making changes.

#### Proposed Tags

```typescript
// Core features
@toggle @add @remove @set @put @get      // Basic commands
@fetch @htmx                              // Network operations
@event @behavior                          // Event handling
@parser @semantic                         // Parsing systems
@i18n @multilingual                       // Internationalization
@bundle @lite @hybrid                     // Bundle variants
@expression @selector @positional         // Expression types

// Test tiers (keep existing)
@smoke    // 1% - Must pass always (~10-20 tests)
@quick    // 10% - Run on every save (~80-100 tests)
@standard // 30% - Run before commit (~240-300 tests)
@full     // 100% - Pre-push/CI (~814 tests)
```

#### Implementation

**Phase 1: Critical Path (Week 1)**

- Tag all command tests with their command name
- Ensure each command has at least 1 @smoke test
- Goal: `npx playwright test --grep @toggle` shows all toggle tests

**Phase 2: Expand Coverage (Week 2)**

- Tag parser, semantic, and i18n tests
- Tag bundle compatibility tests
- Add feature tags to gallery examples

**Phase 3: Rebalance Tiers (Week 3)**

- Smoke: 1-2 tests per critical feature (~20 total)
- Quick: Most important test per feature (~100 total)
- Standard: All main functionality (~300 total)
- Full: Everything including edge cases (~814 total)

### Strategy 2: Component-Based Projects (Alternative)

Create projects based on what system is being tested.

```typescript
projects: [
  { name: 'commands', grep: /@command/ }, // All command tests
  { name: 'parser', grep: /@parser/ }, // Parser validation
  { name: 'runtime', grep: /@runtime/ }, // Runtime execution
  { name: 'bundles', grep: /@bundle/ }, // Bundle variants
  { name: 'i18n', grep: /@i18n/ }, // Internationalization
  { name: 'integration', grep: /@e2e/ }, // End-to-end tests
];
```

**Pros:** Clear ownership, easy to run related tests
**Cons:** Doesn't solve the "run tests quickly" problem

### Strategy 3: Smart Defaults (Immediate Win)

Update package.json scripts to make common operations easier:

```json
{
  "scripts": {
    "test:browser": "playwright test --project=full",
    "test:quick": "playwright test --project=quick",
    "test:smoke": "playwright test --project=smoke",
    "test:changed": "playwright test --only-changed", // Git-aware
    "test:ui": "playwright test --ui", // Interactive mode
    "test:debug": "playwright test --debug",
    "test:command": "playwright test --grep" // Feature-specific
  }
}
```

**Example usage:**

```bash
npm run test:quick                    # Run 62 tests (~15s)
npm run test:command -- @toggle       # Run all toggle tests
npm run test:ui                       # Visual test runner
```

## Immediate Actions

### 1. Fix @integration Tag Usage

The @integration tag exists but isn't used. Either:

- **Option A:** Remove it from config (dead code)
- **Option B:** Define its purpose and tag ~50-100 tests for pre-commit validation

### 2. Rebalance @quick Tests

Current @quick (62 tests) is heavily weighted toward i18n/multilingual. Expand to cover:

- ✅ i18n/multilingual (7 files) - Already covered
- ❌ Core commands (toggle, add, remove, set) - Missing
- ❌ Event handling - Missing
- ❌ Bundle compatibility basics - Missing

**Proposed @quick expansion:**

- Keep existing 62 i18n/multilingual tests
- Add 20-30 core command tests
- Add 10-15 bundle smoke tests
- Target: ~100-120 tests, 20-30 second runtime

### 3. Document Test Selection Strategy

Create `packages/core/src/compatibility/browser-tests/README.md`:

````markdown
# Browser Test Guidelines

## When to Use Each Project

- **smoke** - Critical path only, runs in <5s
- **quick** - Run on every file save, <30s
- **standard** - Run before committing, <2min
- **full** - Run before pushing, ~5-10min

## Tagging Your Tests

```typescript
// Critical path - must always pass
test('basic toggle works @smoke', async ({ page }) => { ... });

// Important but not critical
test('toggle with complex selector @quick', async ({ page }) => { ... });

// Edge cases and thorough validation
test('toggle with all modifiers', async ({ page }) => { ... });
```
````

## Running Specific Features

```bash
npx playwright test --grep @toggle      # All toggle tests
npx playwright test --grep @i18n        # All i18n tests
npx playwright test --grep "@quick.*toggle"  # Quick toggle tests
```

````

## Performance Optimization

### Current Bottlenecks

1. **Parallel execution limited in CI** - `workers: 1` in CI mode
2. **Many small test files** - 50 files with average 16 tests each
3. **Bundle compatibility matrix** - Tests 7 bundles × 9 examples = 63 tests
4. **No test sharding** - All tests run in single job

### Optimizations

```typescript
// playwright.config.ts additions
export default defineConfig({
  // ... existing config

  // Shard tests across multiple CI jobs
  shard: process.env.CI_NODE_INDEX
    ? { current: parseInt(process.env.CI_NODE_INDEX), total: parseInt(process.env.CI_NODE_TOTAL) }
    : undefined,

  // Increase workers in CI (if runners can handle it)
  workers: process.env.CI ? 4 : undefined,

  // Use blob reporter for CI
  reporter: process.env.CI
    ? [['blob'], ['github']]
    : [['html'], ['list']],
});
````

### CI Workflow Update

Split browser tests into 3 parallel jobs:

```yaml
# .github/workflows/test.yml
browser-tests:
  strategy:
    matrix:
      shard: [1, 2, 3]
  steps:
    - name: Run browser tests (shard ${{ matrix.shard }}/3)
      env:
        CI_NODE_INDEX: ${{ matrix.shard }}
        CI_NODE_TOTAL: 3
      run: npm run test:browser --prefix packages/core
```

**Expected improvement:** 5-10 min → 2-4 min

## Summary

**Current State:**

- ✅ Tests are comprehensive (814 tests)
- ✅ Tiered project structure exists
- ❌ Most tests untagged (77%)
- ❌ Quick subset too narrow (7.6%)
- ❌ No feature-based organization
- ❌ Slow CI execution (5-10 min)

**Priority Actions:**

1. **High:** Expand @quick to ~100-120 tests (add core commands)
2. **High:** Document test selection strategy
3. **Medium:** Add feature tags (@toggle, @add, etc.)
4. **Medium:** Implement test sharding in CI
5. **Low:** Consider component-based projects

**Expected Outcome:**

- Quick tests cover core features (20-30s)
- Developers can run relevant tests (`--grep @toggle`)
- CI runs faster (2-4 min with sharding)
- Better test organization and discoverability
