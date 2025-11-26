# Gallery Test Remaining Issues Plan

## Summary

After multiple sessions of parser fixes, the gallery tests show:
- Basics: 5/5 ✅
- Intermediate: 6/6 ✅
- Advanced: 4/5 ✅ (Color Cycling, Draggable, Sortable, Infinite Scroll pass)

Two remaining issues:

## Issue 1: State Machine Test Timeout (Runtime Issue)

**Status**: Runtime execution issue, not a parsing issue

**Symptoms**: The State Machine page times out during DOM content load in Playwright testing. The page HTML loads successfully (commit), and HyperFixi runtime registers, but execution hangs.

**Root Cause**: Unknown - likely an infinite loop or blocking operation during hyperscript execution. The parsing works correctly (verified via `npx tsx` tests).

**Investigation Notes**:
- Page commit succeeds
- Runtime V2 registers successfully (43 commands)
- Execution hangs after that
- TypeScript source parses the state machine code correctly

**Solution Options**:

1. **Debug runtime execution** - Add logging to trace where execution hangs
2. **Simplify state machine code** - Remove complex features one by one to isolate issue
3. **Skip in automated suite** - Mark as manual-only test

**Priority**: Low (does not affect other functionality)

## Issue 2: Parser Syntax Gaps

**Status**: Most issues resolved in Sessions 14-15

**Resolved**:

- ✅ `for item in` loops (Session 14)
- ✅ `init` block comments (Session 15)
- ✅ Comments in event handlers (Session 15)
- ✅ `end` keyword in top-level event handlers (Session 15)

**Remaining**:

### 2a. `for item in collection` Loop Syntax

**Status**: ✅ RESOLVED (Session 14)

**Implementation Completed**:
- Added `for` to COMMANDS set in `tokenizer.ts` and `parser-constants.ts`
- Created `parseForCommand()` in `control-flow-commands.ts`
- Reuses RepeatCommand execution for iteration
- Supports: `for item in collection`, `for each item in collection`, `for item in collection index i`
- Unit tests: 5/5 passing in `packages/core/src/parser/for-in.test.ts`

**Syntax Supported**:
```hyperscript
for item in items
  log item
end

for each entry in :history
  append entry to #list
end

for box in .state-box index i
  log i
  remove .active from box
end
```

### 2b. `init` Block Comment Parsing

**Status**: ✅ RESOLVED (Session 15)

**Fix Applied**: Added `checkTokenType(TokenType.COMMENT)` handling in both `parseTopLevelInitBlock()` and `parseEventHandler()` to skip comment tokens.

**Unit Tests**: 5/5 passing in `packages/core/src/parser/init-block.test.ts`

## Priority Order

1. ~~**`init` block comments**~~ - ✅ RESOLVED (Session 15)
2. ~~**`for item in`**~~ - ✅ RESOLVED (Session 14)
3. **State Machine timeout** - Runtime execution issue (needs investigation)

## Related Files

- Parser: `packages/core/src/parser/parser.ts`
- Behavior system: `packages/core/src/commands/utility/install.ts`
- Control flow: `packages/core/src/commands/control-flow/`
- Test scripts: `debug-draggable.mjs`, gallery test scripts
