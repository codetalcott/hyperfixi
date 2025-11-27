# Plan: Investigate and Address Failing Unit Tests

**Date**: 2025-11-27
**Status**: Draft
**Test Summary**: 451 passed, 53 failed, 7 skipped (511 total)

## Overview

The unit test suite has 53 pre-existing failing tests (not introduced by recent changes). This plan categorizes them and outlines a strategy to address each category.

---

## Category 1: Compound Syntax Tests (4 failures)

**File**: `src/parser/compound-syntax.test.ts`

**Failing Tests**:
- `should parse put command with "at start of"`
- `should parse put command with "at end of"`
- `should parse put command with "at the start of"`
- `should parse put command with "at the end of"`

**Error**: `expected 'identifier' to be 'command'`

**Root Cause**: Parser is not recognizing `put` as a command when followed by compound prepositions like "at start of". The tokenizer correctly creates compound keywords, but the parser fails to create a command node.

**Priority**: Medium - Feature incomplete but not blocking core functionality

**Fix Strategy**:
1. Investigate `parseput` in parser.ts
2. Check if compound prepositions are being handled after "put"
3. May need to add compound preposition handling to put command parser

---

## Category 2: Tokenizer Tests (Multiple failures)

**File**: `src/parser/tokenizer.test.ts`

**Likely Issues**:
- Token type mismatches
- Edge cases in tokenization

**Priority**: Medium - Foundational but not affecting runtime

**Fix Strategy**:
1. Run tokenizer tests in isolation
2. Review failing assertions
3. May be outdated tests or intentional behavior changes

---

## Category 3: Browser Compatibility Tests (Multiple 404 errors)

**Files**:
- `src/compatibility/browser-tests/test-sortable-interactive.spec.ts`
- `src/compatibility/browser-tests/test-globals.spec.ts`
- `src/compatibility/browser-tests/hyperscript-api-analysis.spec.ts`
- `src/compatibility/browser-tests/debug-test.spec.ts`
- `src/compatibility/browser-tests/console-debug.spec.ts`

**Error**: `404 (Not Found)` - Tests trying to fetch from localhost:3000

**Root Cause**: These are Playwright-style tests being run in Vitest context. They try to fetch themselves from localhost which fails.

**Priority**: Low - These are debug/analysis tests, not core functionality

**Fix Strategy**:
1. Option A: Move to Playwright test directory (already have `.spec.ts` extension)
2. Option B: Skip in Vitest with `describe.skip()`
3. Option C: Refactor to not require HTTP server

---

## Category 4: Test Infrastructure Issues

**Symptoms**: Tests timing out, tests expecting HTTP server

**Root Cause**: Mixed test environments (Vitest + Happy-DOM vs Playwright + real browser)

**Priority**: Medium - Affects CI/CD reliability

**Fix Strategy**:
1. Clearly separate Vitest tests from Playwright tests
2. Add proper test environment detection
3. Consider vitest-browser-mode for browser-requiring tests

---

## Recommended Action Plan

### Phase 1: Quick Wins (Low effort, high impact)
1. Skip browser compatibility tests in Vitest (`describe.skip`)
2. Document which tests are Playwright-only

### Phase 2: Compound Syntax Fix
1. Debug parser handling of "put X at start of Y"
2. Fix or mark as known limitation

### Phase 3: Test Infrastructure Cleanup
1. Move `.spec.ts` files to proper Playwright directory
2. Create clear separation between Vitest and Playwright tests
3. Update test:comprehensive script to handle both

### Phase 4: Tokenizer Review
1. Run tokenizer tests in isolation
2. Review each failure and determine: bug vs outdated test

---

## Success Metrics

- Vitest tests: 0 failures (excluding properly skipped tests)
- Playwright tests: Continue passing (7/7 gallery, others as applicable)
- Clear test categories documented

---

## Notes

- The 53 failing tests are NOT blocking runtime functionality
- Gallery examples work correctly (7/7 regression tests pass)
- Core hyperscript features work (verified in browser)
