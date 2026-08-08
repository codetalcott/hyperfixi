# domain-behaviorspec Improvement Plan

## Review Summary

**Date**: 2026-02-15
**Package**: `@lokascript/domain-behaviorspec` v1.0.0
**Status**: 145/145 tests passing, 0 type errors (all phases implemented)
**Architecture**: Well-structured, clean separation of concerns. Built on `@lokascript/framework` with 6 command schemas, 8 languages, custom tokenizers, Playwright code generation, natural-language rendering, feature-level parsing, and MCP tool integration.

---

## Bugs Fixed (This Session)

### 1. Unused `level` variable in spec-parser.ts (line 212)

- **What**: `relativeIndent` and `level` were computed but never used. Level detection was done implicitly via `hasKeyword()` checks and `currentInteraction` state.
- **Fix**: Removed dead code.

### 2. SOV negation stripping only checked line start (spec-parser.ts:267-278)

- **What**: `hasKeyword()` correctly detects SOV keywords at line end (e.g., `#toast 表示 否定`), but the negation stripping code only tried `startsWith()`. For Japanese, negation at end of line would be detected but never stripped, causing garbled `expect` parsing.
- **Fix**: Added end-of-line stripping for SOV languages with proper boundary checking.

### 3. Non-null assertions in playwright-generator.ts (lines 218, 228)

- **What**: `node.roles.get('name')!` and `node.roles.get('content')!` would crash if roles were missing.
- **Fix**: Defensive extraction with fallback values.

### 4. Redundant `.startsWith('.')` check (playwright-generator.ts:122-123)

- **What**: Outer `if` already confirmed `valueStr.startsWith('.')`, inner ternary was always true.
- **Fix**: Simplified to direct `.slice(1)`.

### 5. Ambiguous `negated || undefined` pattern (spec-parser.ts:297)

- **What**: `false || undefined` evaluates to `undefined` which is correct but confusing. Reader might think `false` should be preserved.
- **Fix**: Changed to explicit `negated ? true : undefined`.

---

## Remaining Gaps

### Gap 1: Only 4 Languages (vs 8 in SQL/BDD)

- **Impact**: HIGH
- SQL and BDD now support 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR). BehaviorSpec only has 4.
- Missing: Korean (SOV), Chinese (SVO), Turkish (SOV), French (SVO)
- **Effort**: ~200 lines per language (profile + tokenizer + keyword mappings + tests)

### Gap 2: No Feature-Level Parser

- **Impact**: HIGH
- BDD has `parseBDDFeature()` for Gherkin-style Feature/Background blocks.
- BehaviorSpec only has flat `parseBehaviorSpec()` — no reusable setup, no grouping, no `describe()` wrapper in output.
- Expected syntax:

  ```
  feature "Shopping Cart"
    setup
      given page /products/1

    test "Add to cart"
      when user clicks on #add-to-cart
        #toast appears

    test "Remove from cart"
      when user clicks on .remove-btn
        #item disappears
  ```

- **Effort**: ~150 lines (parser + types + code gen for `test.describe()`)

### Gap 3: Weak Error Reporting

- **Impact**: MEDIUM
- Errors are strings with line numbers but no structured diagnostics (codes, severity, position ranges).
- Spec parser test for malformed lines doesn't verify error collection.
- No recovery testing — does the parser continue after a bad line?
- **Effort**: ~60 lines (structured error type + tests)

### Gap 4: No Escaping Tests

- **Impact**: MEDIUM
- Zero tests for special characters in CSS selectors, URLs with query params, or quoted text with quotes.
- `escapeForString()` and `escapeForRegex()` exist but are untested directly.
- **Effort**: ~40 lines of tests

### Gap 5: Weak Assertion Vocabulary

- **Impact**: MEDIUM
- Missing assertion types: `checked`, `unchecked`, `focused`, `editable`, `empty`, `count N`
- `increases`/`decreases` only generate comments — no real Playwright code.
- **Effort**: ~80 lines (mappings + tests)

### Gap 6: No Cross-Language Compilation Equivalence Tests

- **Impact**: MEDIUM
- SQL has dedicated tests verifying all languages compile to identical output.
- BehaviorSpec has one JA compilation test but doesn't compare EN/ES/JA/AR outputs for equivalence.
- **Effort**: ~30 lines of tests

### Gap 7: Keyword Duplication Across Modules

- **Impact**: LOW
- `spec-parser.ts` duplicates keyword tables (`TEST_KEYWORDS`, `GIVEN_KEYWORDS`, etc.) that are also defined in `tokenizers/index.ts` and `profiles/index.ts`.
- Adding a new language requires changes in 3+ places.
- **Effort**: ~40 lines (extract to shared constants module)

### Gap 8: DurationExtractor/DimensionExtractor `canExtract` Too Greedy

- **Impact**: LOW
- `canExtract()` returns true for any digit, even in identifiers like `user123`. The `extract()` method correctly validates the pattern, so this only wastes extraction attempts.
- **Effort**: ~10 lines (add whitespace boundary check)

### Gap 9: No MCP Tool Integration

- **Impact**: LOW (but important for ecosystem parity)
- SQL and BDD both have MCP tools in `packages/mcp-server/src/tools/`.
- BehaviorSpec has none.
- **Effort**: ~100 lines (parse_behaviorspec, compile_behaviorspec, validate_behaviorspec, translate_behaviorspec)

### Gap 10: Arabic `findMapping()` Case-Sensitivity

- **Impact**: LOW
- `findMapping()` lowercases the keyword before searching, but Arabic keywords don't have case. The issue is that Arabic mapping keywords must match exactly — `toLowerCase()` is a no-op but conceptually wrong.
- No actual bug, just conceptual mismatch.

---

## Improvement Plan

### Phase 1: Test Coverage Hardening (Priority: HIGH)

**Goal**: Bring test quality to parity with domain-sql and domain-bdd.

1. **Error collection tests** (~30 lines)
   - Verify `errors` array for malformed spec lines
   - Verify error messages include line numbers
   - Test parser recovery (continues after bad lines)

2. **Escaping tests** (~40 lines)
   - CSS selectors with special chars
   - URLs with query parameters
   - Quoted text containing quotes
   - Direct tests for `escapeForString()` and `escapeForRegex()`

3. **Code generator direct tests** (~30 lines)
   - Test `behaviorspecCodeGenerator.generate()` with unknown actions
   - Test with missing roles (defensive handling)
   - Test negation output in generated Playwright code

4. **Cross-language compilation equivalence** (~30 lines)
   - given/when/expect commands produce identical Playwright code across all 4 languages
   - Full spec compilation equivalence

5. **SOV negation test** (~15 lines)
   - Test Japanese negation in spec parser
   - Verify stripping works for end-of-line keyword

**Estimated effort**: ~145 lines of test code

### Phase 2: Language Expansion (Priority: HIGH)

**Goal**: Match SQL/BDD at 8 languages.

For each new language (KO, ZH, TR, FR):

1. Add language profile in `profiles/index.ts`
2. Add tokenizer class in `tokenizers/index.ts`
3. Add keyword mappings to `generators/mappings.ts` (interaction/assertion keywords)
4. Add keyword entries to `parser/spec-parser.ts`
5. Add renderer keywords to `generators/behaviorspec-renderer.ts`
6. Register in `index.ts` `createBehaviorSpecDSL()`
7. Add parsing + equivalence + rendering tests

**Order**:

- **Korean** (SOV, validates SOV coverage beyond JA)
- **Chinese** (SVO, most spoken language)
- **French** (SVO, validates European SVO beyond ES)
- **Turkish** (SOV, agglutinative, tests suffix handling)

**Estimated effort**: ~200 lines per language, ~800 total

### Phase 3: Feature-Level Parser (Priority: MEDIUM)

**Goal**: Support multi-test grouping with shared setup.

1. Add `FeatureBlock` type with `name`, `setup`, `tests` fields
2. Add `parseFeature()` function to spec-parser.ts
3. Add `generateFeature()` to playwright-generator.ts (wraps in `test.describe()`)
4. Add `feature` and `setup` command schemas
5. Add tests for feature parsing and code generation

**Syntax**:

```
feature "Shopping Cart"
  setup
    given page /products/1

  test "Add item"
    when user clicks on #add
      #toast appears

  test "Remove item"
    when user clicks on .remove
      #item disappears
```

**Generated**:

```typescript
test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products/1');
  });

  test('Add item', async ({ page }) => {
    await page.locator('#add').click();
    await expect(page.locator('#toast')).toBeVisible();
  });

  test('Remove item', async ({ page }) => {
    await page.locator('.remove').click();
    await expect(page.locator('#item')).toBeHidden();
  });
});
```

**Estimated effort**: ~250 lines

### Phase 4: Assertion Vocabulary Expansion (Priority: MEDIUM)

**Goal**: Cover common Playwright assertions.

Add mappings for:

- `checked` / `unchecked` → `.toBeChecked()` / `.not.toBeChecked()`
- `focused` → `.toBeFocused()`
- `editable` → `.toBeEditable()`
- `empty` → `.toBeEmpty()`
- `count N` → `.toHaveCount(N)`
- `value X` → `.toHaveValue('X')`
- `attribute X` → `.toHaveAttribute('X')`
- Replace `increases`/`decreases` comment templates with real assertions

**Estimated effort**: ~100 lines (mappings + tests)

### Phase 5: Shared Keywords & Cleanup (Priority: LOW)

**Goal**: Eliminate keyword duplication, improve maintainability.

1. Extract shared keyword constants to `src/constants/keywords.ts`
2. Import in spec-parser, tokenizers, renderer
3. Add boundary check to `DurationExtractor.canExtract()` and `DimensionExtractor.canExtract()`
4. Add `allProfiles` export from profiles (already exists, verify used)

**Estimated effort**: ~80 lines

### Phase 6: MCP Integration (Priority: LOW)

**Goal**: Add MCP tools for BehaviorSpec like SQL/BDD.

Add to `packages/mcp-server/src/tools/behaviorspec-domain.ts`:

- `parse_behaviorspec` — Parse single step or multi-line spec
- `compile_behaviorspec` — Compile to Playwright test code
- `validate_behaviorspec` — Validate syntax
- `translate_behaviorspec` — Translate between languages

**Estimated effort**: ~100 lines

---

## Total Estimated Effort

| Phase                   | Lines     | Priority |
| ----------------------- | --------- | -------- |
| 1. Test Coverage        | ~145      | HIGH     |
| 2. Language Expansion   | ~800      | HIGH     |
| 3. Feature Parser       | ~250      | MEDIUM   |
| 4. Assertion Vocabulary | ~100      | MEDIUM   |
| 5. Shared Keywords      | ~80       | LOW      |
| 6. MCP Integration      | ~100      | LOW      |
| **Total**               | **~1475** |          |

Recommended order: Phase 1 → Phase 2 (KO first) → Phase 4 → Phase 3 → Phase 5 → Phase 6
