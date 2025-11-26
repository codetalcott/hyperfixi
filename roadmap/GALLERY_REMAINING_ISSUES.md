# Gallery Test Remaining Issues Plan

## Summary

After fixing the MeasureCommand AST node handling, the gallery tests show:
- Basics: 5/5 ✅
- Intermediate: 6/6 ✅
- Advanced: 4/5 ✅ (Draggable now works!)

Two categories of remaining issues exist, neither are regressions:

## Issue 1: State Machine Test Timeout (Test Infrastructure)

**Status**: Test infrastructure issue, not a code bug

**Symptoms**: The State Machine test times out in automated Playwright testing

**Root Cause**: The state machine example requires user interaction (button clicks) that the current test harness doesn't simulate properly within the timeout window.

**Solution Options**:

1. **Increase timeout** for state machine tests specifically
2. **Add programmatic triggers** - Dispatch click events in the test script
3. **Add data-testid attributes** to make automated interaction easier
4. **Skip in automated suite** - Mark as manual-only test

**Recommended Approach**: Option 2 - Add programmatic triggers in the test script that simulate the state transitions, similar to how `debug-draggable.mjs` dispatches pointer events.

**Priority**: Low (test infrastructure, not user-facing)

## Issue 2: Parser Syntax Gaps

**Status**: Pre-existing parser limitations for advanced _hyperscript features

**Affected Examples**:
- Sortable List (`for item in`)
- Infinite Scroll (`init` blocks, `for item in`)

### 2a. `for item in collection` Loop Syntax

**Current Parser Support**: The parser supports `repeat` loops but not the `for item in` iteration syntax.

**_hyperscript Syntax**:
```hyperscript
for item in items
  append item to #list
end
```

**Current Workaround**: Use `repeat for` with index access:
```hyperscript
repeat for i from 0 to items.length - 1
  set item to items[i]
  append item to #list
end
```

**Implementation Plan**:
1. Add `for` keyword to lexer
2. Parse `for <identifier> in <expression>` as ForInNode
3. Implement ForInCommand that iterates and binds the variable
4. Add tests for array, NodeList, and object iteration

**Estimated Complexity**: Medium (new control flow command)

### 2b. `init` Block in Behaviors

**Current Parser Support**: Behaviors parse but `init` blocks aren't executed on installation.

**_hyperscript Syntax**:
```hyperscript
behavior Draggable(dragHandle)
  init
    if no dragHandle set the dragHandle to me
  end
  on pointerdown ...
end
```

**Current Status**: The `init` keyword is recognized but the block execution during `install` isn't fully wired up.

**Implementation Plan**:
1. Ensure BehaviorNode stores init commands
2. In InstallCommand, execute init block after behavior installation
3. Ensure init block has access to behavior parameters
4. Add tests for init with conditionals and variable setup

**Estimated Complexity**: Medium (behavior system enhancement)

## Priority Order

1. **`init` blocks** - Higher priority because Draggable behavior uses this pattern
2. **`for item in`** - Medium priority for iteration patterns
3. **State Machine timeout** - Low priority (test-only issue)

## Related Files

- Parser: `packages/core/src/parser/parser.ts`
- Behavior system: `packages/core/src/commands/utility/install.ts`
- Control flow: `packages/core/src/commands/control-flow/`
- Test scripts: `debug-draggable.mjs`, gallery test scripts
