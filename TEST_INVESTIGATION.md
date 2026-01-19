# Bundle Compatibility Test Investigation

## Summary

**Test Progress:** 71 passing → 75 passing (out of 79 total)
**Date:** 2026-01-19

## Issues Fixed

### 1. Incorrect Bundle Feature Flags ✅

**Problem:** Test configuration claimed minimal/standard bundles had features they don't actually have.

**Root Cause:**

- `minimal` bundle: Only has 10 commands (no blocks, no event modifiers, no increment)
- `standard` bundle: Only has 16 commands (no blocks, no event modifiers)

**Fix:** Updated [bundle-compatibility.spec.ts](packages/core/src/compatibility/browser-tests/bundle-compatibility.spec.ts) with correct feature flags.

**Files:**

- `packages/core/src/compatibility/browser-bundle-minimal-v2.ts` (commands list at line 90)
- `packages/core/src/compatibility/browser-bundle-standard-v2.ts` (commands list at line 120-137)

### 2. Test Infrastructure for Large Bundles ✅

**Problem:** Large bundles (browser 203KB, minimal 58KB, standard 63KB) timeout when loaded via `page.setContent()`.

**Fix:** Created dedicated test HTML pages and switched to `page.goto()`:

- `packages/core/test-pages/blocks-if-else.html`
- `packages/core/test-pages/event-modifiers.html`
- `packages/core/test-pages/css-property-syntax.html`

### 3. Hybrid-HX Double-Processing Bug ✅

**Problem:** hybrid-hx toggle commands not executing.

**Root Cause:**
hybrid-hx was calling `hybridComplete.process()` during initialization, but hybrid-complete already auto-initializes on DOMContentLoaded. This caused elements to be processed twice, breaking event handlers.

**Evidence:**

- AST logged twice in console when clicking button
- Classes didn't change: `demo-box` → `demo-box` (no toggle)

**Fix:** Removed `hybridComplete.process()` call from `enableHtmxCompatibility()` function.

**File:** [browser-bundle-hybrid-hx.ts:67](packages/core/src/compatibility/browser-bundle-hybrid-hx.ts#L67)

**Test:** `node test-toggle.mjs` (now passes)

## Remaining Issues (Browser Bundle Only)

### 4. Browser Bundle `has` Operator Bug ❌

**Problem:** The `has` operator returns an empty object `{}` instead of a boolean.

**Evidence:**

```javascript
// Test code:
if me has .active
  put 'yes' into #out
else
  put 'no' into #out
end

// Button has class="active" but outputs "no" (wrong)
```

**Direct test results:**

```javascript
const btn = document.getElementById('btn'); // has class="active"
btn.classList.contains('active'); // ✅ true (correct)
hyperfixi.evaluate('me has .active', btn); // ❌ {} (wrong, should be true)
```

**Reproduction:** `node test-has-operator.mjs`

**Impact:** if/else blocks test fails

**Investigation needed:** Check expression evaluator for `has` operator implementation in:

- `packages/core/src/expressions/logical/`
- `packages/core/src/runtime/runtime.ts`

### 5. Browser Bundle Event Modifiers Not Working ❌

**Problem:** Event modifiers (.once, .prevent, .stop) don't work in browser bundle.

**Evidence:**

- `.once` - Button gets clicked multiple times (should only work once)
- `.prevent` - Link navigates to #should-not-navigate (should prevent default)
- `.stop` - Event propagates to parent (should stop propagation)

**Test pages:** `packages/core/test-pages/event-modifiers.html`

**Impact:** 3 event modifier tests fail

**Investigation needed:** Check event modifier parsing and application in:

- `packages/core/src/parser/parser.ts` (event modifier parsing)
- `packages/core/src/dom/attribute-processor.ts` (event attachment)

## Test Commands

### Run Full Test Suite

```bash
cd packages/core
npx playwright test src/compatibility/browser-tests/bundle-compatibility.spec.ts --reporter=list
```

### Debug Specific Bundle

```bash
node test-toggle.mjs        # Test toggle command with any bundle
node debug-bundle.mjs       # Inspect bundle loading and execution
node test-has-operator.mjs  # Test has operator specifically
node test-browser.mjs       # Test browser bundle basic functionality
```

### Edit Debug Scripts

All scripts use variables at the top:

```javascript
const BASE_URL = 'http://127.0.0.1:3000';
// For bundle-specific tests:
await page.goto(`${BASE_URL}/path/to/page.html?bundle=hybrid-hx`);
```

## Bundle Status

| Bundle          | Size   | Tests | Status         | Notes                                 |
| --------------- | ------ | ----- | -------------- | ------------------------------------- |
| lite            | 1.9 KB | ✅    | Pass           | 8 commands, regex parser              |
| lite-plus       | 2.6 KB | ✅    | Pass           | 14 commands, i18n aliases             |
| hybrid-complete | 7.3 KB | ✅    | Pass           | 21 commands + blocks                  |
| hybrid-hx       | 9.5 KB | ✅    | Pass           | hybrid-complete + htmx                |
| minimal         | 58 KB  | ✅    | Pass           | 10 commands, no blocks                |
| standard        | 63 KB  | ✅    | Pass           | 16 commands, no blocks                |
| browser         | 203 KB | ❌    | **4 failures** | has operator + event modifiers broken |

## Next Steps

1. **Add blocks to standard bundle** (user request)
2. **Fix browser bundle `has` operator** - return boolean instead of object
3. **Fix browser bundle event modifiers** - ensure .once/.prevent/.stop work

## Notes

- The browser bundle is the full-featured bundle with 40+ commands
- All smaller bundles (lite, hybrid-complete, hybrid-hx) work correctly
- hybrid-complete (7.3KB) is recommended over browser bundle for most use cases
- hybrid-complete has ~85% hyperscript coverage and all tests pass
