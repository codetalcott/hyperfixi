# Browser Test Suite

Comprehensive Playwright tests for HyperFixi browser bundles and compatibility.

## Test Organization

Tests are organized using **tags** for flexible test selection. Tests can have multiple tags to categorize them by tier, feature, and purpose.

### Tier Tags (Test Speed & Coverage)

| Tag                | Tests | Runtime  | When to Use                                                    |
| ------------------ | ----- | -------- | -------------------------------------------------------------- |
| **@smoke**         | ~10   | ~3-5s    | Critical path - must always pass. Run after every code change. |
| **@quick**         | ~80   | ~20-30s  | Core features - run before committing. Good for TDD workflow.  |
| **@integration**   | TBD   | ~60s     | End-to-end flows - run before pushing (currently unused).      |
| **@comprehensive** | ~100  | ~60s     | Thorough feature validation - run before PRs.                  |
| **Full**           | ~814  | ~5-10min | Everything except @skip - run in CI.                           |

### Feature Tags (Test Content)

| Tag                         | Description               | Example                         |
| --------------------------- | ------------------------- | ------------------------------- |
| **@toggle**                 | Toggle command tests      | `toggle .active`                |
| **@add**                    | Add command tests         | `add .foo to #bar`              |
| **@remove**                 | Remove command tests      | `remove .active`                |
| **@set**                    | Set command tests         | `set x to 42`                   |
| **@put**                    | Put command tests         | `put "hello" into #target`      |
| **@show / @hide**           | Show/hide command tests   | `show #modal`                   |
| **@increment / @decrement** | Increment/decrement tests | `increment count`               |
| **@log**                    | Log command tests         | `log "message"`                 |
| **@wait**                   | Wait command tests        | `wait 100ms`                    |
| **@if / @repeat**           | Control flow tests        | `if x > 5 ... end`              |
| **@control-flow**           | All control flow          | if, repeat, for, while          |
| **@expression**             | Expression tests          | All expression types            |
| **@math**                   | Math operators            | `1 + 2`, `x * y`                |
| **@comparison**             | Comparison operators      | `x > y`, `a == b`               |
| **@logical**                | Logical operators         | `and`, `or`, `not`              |
| **@call**                   | Function calls            | `foo()`, `str.toUpperCase()`    |
| **@i18n / @multilingual**   | Internationalization      | Japanese, Spanish, Arabic, etc. |
| **@bundle**                 | Bundle compatibility      | lite, hybrid, full              |
| **@gallery**                | Gallery examples          | Example pages from /examples/   |

## Running Tests

### By Test Tier

```bash
# Critical path - fast feedback (~3-5s)
npx playwright test --project=smoke

# Core features - good for TDD (~20-30s)
npx playwright test --project=quick

# Thorough validation (~60s)
npx playwright test --project=comprehensive

# Everything (~5-10min)
npx playwright test --project=full
```

### By Feature

```bash
# All toggle command tests
npx playwright test --project=commands --grep @toggle

# All expression tests
npx playwright test --project=expressions

# All control flow tests (if, repeat, etc.)
npx playwright test --project=control-flow

# All i18n/multilingual tests
npx playwright test --project=i18n

# All bundle compatibility tests
npx playwright test --project=bundles

# All gallery example tests
npx playwright test --project=gallery
```

### Combining Tags

```bash
# Quick toggle tests only
npx playwright test --grep "@quick.*@toggle"

# All toggle tests except slow ones
npx playwright test --grep @toggle --grep-invert @slow

# Quick tests for commands (toggle, add, remove, etc.)
npx playwright test --project=quick --grep "@toggle|@add|@remove"
```

### Interactive Mode

```bash
# Visual test runner with debugging
npx playwright test --ui

# Debug specific test
npx playwright test --debug --grep "toggle adds class"

# Run tests in headed browser
npx playwright test --headed
```

## Writing Tests

### Adding Tags to Your Tests

```typescript
// Tier tags - how fast/critical is this test?
test('basic toggle works @smoke @quick', async ({ page }) => {
  // Critical functionality - must always pass
});

test('toggle with modifiers @quick', async ({ page }) => {
  // Important but not critical
});

test('toggle edge case', async ({ page }) => {
  // Thorough coverage - runs in full suite only
});

// Feature tags - what does this test validate?
test.describe('Toggle Command @toggle', () => {
  // All tests in this describe block test the toggle command

  test('adds class when missing @quick', async ({ page }) => {
    // ...
  });

  test('removes class when present', async ({ page }) => {
    // ...
  });
});

// Multiple feature tags
test.describe('Expression Tests @expression @math', () => {
  // Tests both expression parsing AND math operations
});
```

### Tag Guidelines

1. **@smoke**: Reserve for absolute must-pass tests (~1-2 per major feature)
   - Basic toggle, put, add/remove
   - Core expression evaluation
   - Bundle loads correctly

2. **@quick**: Add to the most important test for each feature
   - First test in each command describe block
   - Basic expression types (math, comparison, logical)
   - Core gallery examples (basics/)

3. **Feature tags**: Apply to describe blocks or individual tests
   - Use specific tags (@toggle, @add) over generic tags
   - Multiple tags OK if test validates multiple features
   - Consider what developers will search for

4. **DON'T over-tag**: Avoid adding every possible tag
   - ❌ `@smoke @quick @comprehensive @expression @math @quick-math`
   - ✅ `@quick @math`

## Test Tiers Explained

### Smoke Tests (@smoke)

**Purpose:** Catch catastrophic failures immediately
**Runtime:** ~3-5 seconds
**Coverage:** 1-2 tests per critical feature
**Example workflow:**

```bash
# After every code change
npm run test:smoke
# If it passes, continue development
```

### Quick Tests (@quick)

**Purpose:** Validate core functionality during development
**Runtime:** ~20-30 seconds
**Coverage:** Most important test per feature (~80-100 tests)
**Example workflow:**

```bash
# Before committing
npm run test:quick
# If it passes, commit and push
```

### Comprehensive Tests (@comprehensive)

**Purpose:** Thorough feature validation before merging
**Runtime:** ~60 seconds
**Coverage:** All main functionality and common edge cases
**Example workflow:**

```bash
# Before creating PR
npm run test:comprehensive
# If it passes, create PR
```

### Full Suite (all tests)

**Purpose:** Complete validation in CI
**Runtime:** ~5-10 minutes
**Coverage:** Everything except @skip tagged tests
**Example workflow:**

```bash
# Runs automatically in CI on push
npm run test:browser
```

## Common Workflows

### Daily Development (TDD)

```bash
# Watch mode for quick tests
npx playwright test --project=quick --ui

# Or run in terminal after each save
npx playwright test --project=quick
```

### Working on Specific Feature

```bash
# Develop toggle command
npx playwright test --grep @toggle --ui

# Quick validation for toggle
npx playwright test --grep "@quick.*@toggle"
```

### Before Committing

```bash
# Quick validation (~30s)
npm run test:quick

# If working on specific feature, run those tests
npx playwright test --project=expressions  # if working on expressions
npx playwright test --project=i18n        # if working on i18n
```

### Before Creating PR

```bash
# Run comprehensive suite
npm run test:comprehensive

# Or run full suite to be extra safe
npm run test:browser
```

## Troubleshooting

### Tests are too slow

- Use `--project=quick` instead of `--project=full`
- Run specific feature tests: `--project=commands`
- Use `--grep` to filter further: `--grep @toggle`

### "No tests found"

- Check your tag syntax: `@tag` not `#tag` or `tag`
- Project name might be wrong: run `npx playwright test --list-projects`
- Make sure you're in the correct directory: `packages/core/`

### Web server won't start

- Check if port 3000 is already in use: `lsof -i :3000`
- Kill existing server: `kill -9 $(lsof -t -i :3000)`
- Or use existing server: Playwright will reuse if `reuseExistingServer: true`

### Tests are flaky

- Add `await page.waitForTimeout(300)` after navigation
- Use `await page.waitForFunction()` instead of fixed timeouts
- Check if test depends on previous test state (tests should be isolated)

## CI Integration

Tests run automatically on push via GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run browser tests
  run: npm run test:browser --prefix packages/core
```

The full test suite runs in CI with:

- Single worker (`workers: 1`) for reliability
- 2 retries for flaky tests
- HTML report uploaded as artifact

## File Organization

```
src/compatibility/browser-tests/
├── README.md (this file)
├── commands-comprehensive.spec.ts   # Command tests (@toggle, @add, etc.)
├── expressions-comprehensive.spec.ts # Expression tests (@math, @logical, etc.)
├── gallery-examples.spec.ts         # Gallery page tests (@gallery)
├── semantic-multilingual.spec.ts    # i18n tests (@i18n, @multilingual)
├── bundle-compatibility.spec.ts     # Bundle tests (@bundle)
├── hybrid-complete.spec.ts          # Hybrid bundle tests (@hybrid)
└── debug/                           # Debug tests (--project=debug)
    ├── debug-fetch.spec.ts
    └── ...
```

## Contributing

When adding new tests:

1. ✅ **DO** add feature tags to describe blocks
2. ✅ **DO** mark 1-2 most important tests as `@quick`
3. ✅ **DO** mark absolute must-pass tests as `@smoke`
4. ✅ **DO** use descriptive test names
5. ❌ **DON'T** add @quick to every test (keeps quick tests fast)
6. ❌ **DON'T** add @smoke unless truly critical
7. ❌ **DON'T** skip writing tests for new features

### Example PR Checklist

```markdown
## Testing

- [ ] Added tests with appropriate tags
- [ ] `npm run test:smoke` passes
- [ ] `npm run test:quick` passes
- [ ] `npm run test:comprehensive` passes (if major feature)
- [ ] Verified tests run in CI
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Test Tagging with Grep](https://playwright.dev/docs/test-annotations#tag-tests)
