# Parser Test Fix Plan

**Goal:** Fix 10 failing parser tests (70/80 → 80/80 passing rate, 100%)

**Date:** 2024-01-24

## Test Failure Analysis

### Category 1: Test Expectation Mismatches (4 tests) - **Priority: LOW**

These tests expect old parser behavior (identifiers/binaryExpressions) but the parser now correctly returns command nodes. These are **test bugs, not parser bugs**.

**Affected Tests:**
1. ❌ **"should parse simple commands"** (line 394)
   - Input: `"hide"`
   - Expected: `{ type: 'identifier', name: 'hide' }`
   - Actual: `{ type: 'command', name: 'hide' }`
   - **Fix:** Update test to expect command node (parser is correct)

2. ❌ **"should parse commands with targets"** (line 401)
   - Input: `"hide #target"`
   - Expected: `{ type: 'binaryExpression', operator: ' ', left: identifier, right: selector }`
   - Actual: `{ type: 'command', name: 'hide', args: [...] }`
   - **Fix:** Update test to expect command node (parser is correct)

3. ❌ **"should parse add/remove class commands"** (line 452)
   - Input: `"add .active"`
   - Expected: `{ type: 'binaryExpression', operator: ' ', ... }`
   - Actual: `{ type: 'command', name: 'add', args: [...] }`
   - **Fix:** Update test to expect command node (parser is correct)

4. ❌ **"should parse event handlers with selectors"** (line 358)
   - Input: `"on click from .button hide"`
   - Expected: `{ selector: ".button", ... }`
   - Actual: Missing `selector` property in eventHandler node
   - **Fix:** Update test expectations OR add selector extraction logic to parseEventHandler

**Complexity:** LOW - Just update test expectations
**Risk:** NONE - These are test bugs
**Time:** 15-30 minutes

### Category 2: Error Reporting Bugs (3 tests) - **Priority: MEDIUM**

Error objects are missing the `position` property, causing TypeError in tests.

**Affected Tests:**
5. ❌ **"should handle empty input"** (line 726)
   - Input: `""`
   - Expected: `error.position` to be 0
   - Actual: `error.position` is undefined
   - **Fix:** Ensure error objects always include position property

6. ❌ **"should provide meaningful error messages"** (line 770)
   - Tests various malformed inputs
   - Expected: `error.position` >= 0
   - Actual: `error.position` is undefined
   - **Fix:** Add position to all error paths in parser

7. ❌ **"should preserve source location for error reporting"** (line 876)
   - Input: `"if (x > 5 then"` (missing closing paren)
   - Expected: `error.position` >= 0
   - Actual: `error.position` is undefined
   - **Fix:** Add position to error generation in parse() function

**Root Cause:** The `parse()` function's error handling doesn't always set `position` property

**Complexity:** MEDIUM - Need to trace error generation paths
**Risk:** LOW - Just adding missing properties
**Time:** 30-60 minutes

### Category 3: Parser Logic Bugs (3 tests) - **Priority: HIGH**

Parser fails to parse valid input (result.success = false).

**Affected Tests:**
8. ❌ **"should parse conditional with commands"** (line 637)
   - Input: `"if count > 5 then log 'high' end"`
   - Expected: success = true
   - Actual: success = false (parser error)
   - **Likely Cause:** Issue with 'then' keyword handling in if command

9. ❌ **"should parse large expressions efficiently"** (line 908)
   - Input: Large chained binary expression (100 additions)
   - Expected: success = true, parse < 500ms
   - Actual: success = false (parser error or timeout)
   - **Likely Cause:** Stack overflow or infinite loop in expression parsing

10. ❌ **"should handle deeply nested expressions"** (line 939)
    - Input: Deeply nested conditionals
    - Expected: success = true
    - Actual: success = false (parser error)
    - **Likely Cause:** Recursion depth or nested conditional handling

**Complexity:** HIGH - Requires debugging parser logic
**Risk:** MEDIUM - Changes to parser logic could introduce regressions
**Time:** 1-2 hours

## Execution Plan

### Phase 1: Low-Hanging Fruit (Category 1 + 2) - **60-90 minutes**

**Goal:** Fix 7/10 tests quickly with minimal risk

**Step 1.1:** Fix test expectations (4 tests) - **30 minutes**
- Read failing test code
- Update expectations to match current parser behavior
- Verify parser output is semantically correct

**Step 1.2:** Fix error reporting (3 tests) - **30-60 minutes**
- Find parse() function error handling
- Add position property to all error objects
- Test with empty input and malformed expressions

**Expected Result:** 77/80 tests passing (96.25%)

### Phase 2: Parser Logic Bugs (Category 3) - **1-2 hours**

**Goal:** Fix remaining 3 parsing failures

**Step 2.1:** Debug "if then" conditional parsing - **30 minutes**
- Read test input: `"if count > 5 then log 'high' end"`
- Add debug logging to if command parser
- Trace where parsing fails
- Fix the 'then' keyword handling

**Step 2.2:** Debug large expression parsing - **30 minutes**
- Read test input: Large chained additions
- Check for stack overflow or infinite loop
- Optimize expression parsing if needed
- Add recursion depth limits if necessary

**Step 2.3:** Debug nested conditional parsing - **30 minutes**
- Read test input: Nested if statements
- Check conditional nesting logic
- Fix any recursion or boundary issues

**Expected Result:** 80/80 tests passing (100%)

### Phase 3: Verification - **15 minutes**

**Goal:** Ensure no regressions introduced

**Step 3.1:** Run full parser test suite
- Verify 80/80 passing
- Check for any new failures

**Step 3.2:** Run integration tests
- Verify no runtime regressions

**Step 3.3:** Commit with clear message

## Implementation Priority

**Order of execution:**

1. ✅ **Category 1** (Low risk, quick wins)
   - Update 4 test expectations
   - No parser code changes needed

2. ✅ **Category 2** (Medium risk, important)
   - Fix error reporting in parse() function
   - Add position to all error paths

3. ✅ **Category 3** (Higher risk, most important)
   - Fix if/then parsing
   - Fix large expression parsing
   - Fix nested conditional parsing

## Success Metrics

- **Primary:** 80/80 parser tests passing (100%)
- **Secondary:** Zero regressions in integration tests
- **Tertiary:** Improved error messages with accurate positions

## Risk Mitigation

1. **Incremental commits** - Commit after each category fix
2. **Test after each fix** - Run tests immediately after changes
3. **Rollback plan** - Each commit is independently revertible
4. **Baseline preservation** - Maintain 70/80 as minimum throughout

## Files to Modify

Based on analysis:
- **src/parser/parser.test.ts** - Update test expectations (Category 1)
- **src/parser/parser.ts** - Fix error reporting (Category 2), Fix parsing logic (Category 3)
- **src/parser/command-parsers/control-flow-commands.ts** - Possibly for if/then fix (Category 3)

## Expected Timeline

- **Phase 1:** 60-90 minutes (7 tests fixed)
- **Phase 2:** 1-2 hours (3 tests fixed)
- **Phase 3:** 15 minutes (verification)
- **Total:** 2-3.5 hours

## Post-Fix Actions

After achieving 80/80:
1. Update roadmap with 100% parser test status
2. Document fixes in session summary
3. Consider adding more edge case tests
4. Update CLAUDE.md with improved test metrics
