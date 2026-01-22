# Parser Fix Status Report

## Problem Summary

The core parser cannot parse behavior definitions when parameter names match command names (e.g., `trigger`).

### Failing Tests

- **Test 1**: "should parse behavior with parameter used in from clause"
- **Test 2**: "should parse behavior with trigger parameter and trigger command"
- **Location**: `packages/core/src/parser/behavior-parser.test.ts:471-515`
- **Status**: 2/24 tests failing

## Implementation

### Changes Made

**File**: `packages/core/src/parser/parser.ts`

**Change 1 (Line 2524-2525):**

```typescript
// Create parameter set for checking in event handler parsing
const parameterSet = new Set(parameters);
```

**Change 2 (Lines 2580-2592):**

```typescript
// Capture the target identifier/selector
// Allow behavior parameters even if they match command names
if (!this.isAtEnd()) {
  const targetToken = this.peek();
  const isParameter = parameterSet.has(targetToken.value);
  const isCommand = this.checkIsCommand();

  if (!isCommand || isParameter) {
    targetTokens.push(targetToken.value);
    eventSource = targetToken.value;
    this.advance();
  }
}
```

### Logic

The condition `!isCommand || isParameter` should:

- ✅ Accept non-command identifiers (like `document`, `window`)
- ✅ Accept parameter names even if they match commands (like `trigger`)
- ❌ Reject command names that aren't parameters (like `toggle`)

## Test Results

**Status**: Tests still failing after implementation

```
Test Files  1 failed (1)
Tests  2 failed | 22 passed (24)
```

## Debugging Attempts

1. **Added debug logging** - No output reached console, suggesting code path may not be executing
2. **Checked token flow** - Unable to confirm `from` clause is being reached
3. **Verified parameterSet** - Unable to confirm parameters are in the set
4. **Tried multiple approaches** - All resulted in same failure

## Possible Issues

### Issue 1: Code Path Not Executing

The `from` clause parsing code may not be reached at all. Possible causes:

- Event name parsing consumes extra tokens
- Earlier parser error prevents reaching this code
- Different code path used for behaviors vs. top-level events

### Issue 2: Token Classification

The `checkIsCommand()` method may:

- Return false for `trigger` (if it checks token kind instead of value)
- Not be called with correct context
- Have different behavior in behavior parsing vs. normal parsing

### Issue 3: Parameter Set Scope

The `parameterSet` variable may:

- Be out of scope when `from` clause is parsed
- Be empty due to parameter parsing issue
- Not contain expected values due to case sensitivity or normalization

## Recommendations

### Option 1: Alternative Approach

Instead of modifying the validation logic, try a different approach:

1. Store parameters in parser instance property
2. Add a `isBehaviorParameter(name: string): boolean` method
3. Check this method BEFORE checking if token is a command

### Option 2: Deeper Investigation

1. Add unit tests for `checkIsCommand()` with parameter names
2. Test `parameterSet.has('trigger')` directly in the failing case
3. Trace complete token flow from `behavior Test(trigger)` through `from trigger`
4. Compare with working test case (e.g., `from document`)

### Option 3: Revert and Document

1. Revert all changes to parser.ts
2. Mark tests as `.skip()` with TODO comment
3. Create detailed issue for investigation by parser experts
4. Document as known limitation in behaviors package README

## Current State

**Files Modified:**

- `packages/core/src/parser/parser.ts` (clean, no debug code)

**Test Status:**

- 22/24 passing in behavior-parser.test.ts
- All 21 tests passing in behaviors package
- Behaviors package itself is correctly implemented

## Next Steps

Requires decision on:

1. Continue debugging with different approach?
2. Escalate to parser experts?
3. Document as known issue and move forward?
