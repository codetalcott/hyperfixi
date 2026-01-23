# Skipped Tests Analysis - Core Package

**Generated**: 2026-01-23
**Total Skipped Tests**: 40+ individual tests across 20 files

## Summary by Category

### 1. Performance/Benchmarks (2 files - whole describe blocks)

**Status**: Skip is intentional - excluded from main test suite

- `src/performance/expression-benchmarks.test.ts`
  - Reason: "Performance benchmarks require full enhanced expression implementation"
  - Action: Keep skipped, excluded in vitest.config.ts

- `src/performance/command-benchmarks.test.ts`
  - Reason: "Tests pass incomplete input objects, commands expect full CommandInput with targets[]"
  - Action: Keep skipped, excluded in vitest.config.ts

### 2. V1/V2 Migration Issues (2 files)

**Status**: Needs migration to V2 patterns

- `src/validation/validate-commands.test.ts` (whole describe block)
  - Reason: "Tests expect V1-style command metadata (syntax, outputType, documentation.parameters) that differs from V2 command structure"
  - Action: **Update tests to use V2 command structure**

- `src/features/on.test.ts` (whole describe block)
  - Reason: V1 on feature system
  - Action: **Migrate to V2 on feature tests or remove**

### 3. Bridge Integration Not Implemented (1 file, 10+ tests)

**Status**: Feature not complete

- `src/expressions/positional/impl/bridge.test.ts` (whole describe block)
  - Reason: "Bridge integration not fully implemented"
  - Tests: first expression errors, documentation, safe operations, batch operations
  - Action: **Complete bridge implementation or remove tests**

### 4. Flaky/Timing-Based Tests (2 files)

**Status**: Need better mocking

- `src/multilingual/bridge.test.ts`
  - Test: "should cache repeated transformations"
  - Reason: "Flaky timing-based test - system load can cause failures"
  - Action: **Use fake timers or performance.now() mock**

- `src/features/init-verification.test.ts` (3 tests)
  - Tests: attribute setting with/without fake timers
  - Reason: Timing issues with init feature
  - Action: **Fix fake timer setup**

### 5. DOM Environment Issues (1 file, 3 tests)

**Status**: happy-dom vs jsdom differences

- `src/expressions/positional/index.test.ts`
  - Tests: "should handle DOM element children" (first, last, at)
  - Reason: "DOM children access differs in test environment"
  - Action: **Adjust tests for happy-dom environment**

### 6. Error Handling Tests (2 files)

**Status**: Need error message updates

- `src/integration/end-to-end.test.ts` (2 tests)
  - Tests: null context, undefined variables
  - Reason: Error messages don't match expected
  - Action: **Update expected error messages**

- `src/api/hyperscript-api.test.ts` (1 test)
  - Test: "should handle empty input gracefully"
  - Reason: Error message mismatch
  - Action: **Update expected error message**

### 7. Parser Issues (5 files, 7 tests)

**Status**: Parser behavior needs investigation

- `src/tokenizer.test.ts` (2 tests)
  - Test: "should tokenize operators"
  - Test: "should tokenize large input efficiently"
  - Reason: Tokenizer implementation incomplete
  - Action: **Complete tokenizer or remove tests**

- `src/parser/existence-operators.test.ts` (3 tests)
  - Tests: 'some' keyword (null, empty, non-empty values)
  - Reason: 'some' keyword not implemented
  - Action: **Implement 'some' keyword or remove tests**

- `src/parser/error-recovery.test.ts` (1 test)
  - Test: "should handle errors in nested expressions accurately"
  - Reason: Error recovery not accurate enough
  - Action: **Improve parser error recovery**

- `src/parser/parser-context.test.ts` (1 test)
  - Test: "should check if token is a keyword"
  - Reason: isKeyword method not working as expected
  - Action: **Fix isKeyword implementation**

- `src/parser/method-chaining.test.ts` (1 test)
  - Test: "should handle complex nested method chaining"
  - Reason: Advanced chaining not supported
  - Action: **Implement or document limitation**

### 8. Feature-Specific Issues (4 files)

**Status**: Various feature implementations incomplete

- `src/features/def.test.ts` (2 tests)
  - Test: "should handle missing arguments with undefined"
  - Test: "should provide function metadata for JavaScript"
  - Reason: "Behavior differs - needs investigation"
  - Action: **Investigate and fix def feature behavior**

- `src/features/predefined-behaviors/modal-behavior.test.ts` (1 test)
  - Test: "should support form submission inside modal"
  - Reason: Not implemented
  - Action: **Implement form submission support**

- `src/context/__tests__/integration.test.ts` (1 test)
  - Test: "should provide helpful suggestions for common issues"
  - Reason: "Suggestion system not fully implemented"
  - Action: **Implement or remove LLM context suggestions**

- `src/types/hyperscript-program.test.ts` (1 test)
  - Test: "HyperScriptProgramSchema validates program structure"
  - Reason: Schema validation not working
  - Action: **Fix schema validation**

## Priority Action Plan

### Immediate Fixes (Can fix without new implementation)

1. **Error message updates** (3 tests):
   - `src/api/hyperscript-api.test.ts` - Update expected error
   - `src/integration/end-to-end.test.ts` - Update expected errors (2 tests)

2. **DOM environment fixes** (3 tests):
   - `src/expressions/positional/index.test.ts` - Adjust for happy-dom

3. **Timing fixes** (4 tests):
   - `src/multilingual/bridge.test.ts` - Mock timers
   - `src/features/init-verification.test.ts` - Fix fake timers (3 tests)

**Total Quick Wins**: 10 tests

### Requires Investigation (Medium effort)

4. **V2 migration** (2 describe blocks):
   - `src/validation/validate-commands.test.ts` - Update to V2 structure
   - `src/features/on.test.ts` - Migrate or remove

5. **Parser issues** (7 tests):
   - `src/parser/*` - Various parser completeness issues

6. **Feature completeness** (4 tests):
   - `src/features/def.test.ts` - def behavior (2 tests)
   - `src/features/predefined-behaviors/modal-behavior.test.ts` - form submission
   - `src/context/__tests__/integration.test.ts` - suggestions
   - `src/types/hyperscript-program.test.ts` - schema validation

### Keep Skipped (Intentional)

7. **Performance benchmarks** (2 describe blocks):
   - Already excluded in vitest.config.ts
   - Not counted toward coverage

8. **Bridge integration** (10+ tests):
   - Feature not implemented yet
   - Can be removed or marked as TODO for future

## Recommended Approach

### Phase 1: Quick Wins (1-2 days)

- Fix 10 tests with simple error message/DOM/timing fixes
- Expected coverage gain: +2%

### Phase 2: V2 Migration (2-3 days)

- Update validate-commands.test.ts to V2
- Migrate or remove on.test.ts
- Expected coverage gain: +1%

### Phase 3: Decision on Incomplete Features

- Decide whether to:
  - Complete implementations (parser features, def behavior, etc.)
  - Remove tests for unplanned features
  - Document as known limitations

## Files Requiring Changes

| File                                             | Action                | Tests | Effort    |
| ------------------------------------------------ | --------------------- | ----- | --------- |
| `src/api/hyperscript-api.test.ts`                | Update error message  | 1     | 5 min     |
| `src/integration/end-to-end.test.ts`             | Update error messages | 2     | 10 min    |
| `src/expressions/positional/index.test.ts`       | Fix DOM access        | 3     | 30 min    |
| `src/multilingual/bridge.test.ts`                | Mock timers           | 1     | 15 min    |
| `src/features/init-verification.test.ts`         | Fix fake timers       | 3     | 30 min    |
| `src/validation/validate-commands.test.ts`       | V2 migration          | block | 2 hours   |
| `src/features/on.test.ts`                        | Migrate/remove        | block | 2 hours   |
| `src/parser/*` (5 files)                         | Various fixes         | 7     | 3-4 hours |
| `src/features/*` (4 files)                       | Feature work          | 4     | 3-4 hours |
| `src/expressions/positional/impl/bridge.test.ts` | Remove/defer          | block | 30 min    |

## Impact on Coverage

**Current skipped tests**: 40+
**Quick wins**: 10 tests (~2% coverage)
**V2 migration**: 2 blocks (~1% coverage)
**Total potential**: ~3% coverage gain from resolving skipped tests

This aligns with Phase 1 plan target of +5% coverage when combined with helper tests.
