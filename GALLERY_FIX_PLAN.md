# Gallery Test Remaining Issues - Fix Plan

## Current Status (Updated)

**Session 1 Completed Fixes:**
- CSS selector property mismatch in add/remove/toggle commands
- Keyword preposition filtering in resolveTargets
- Install command identifier evaluation
- If command args-based format support
- Set command variable node type support

**Session 2 Completed Fixes:**
- Put command variable assignment detection (distinguish variables from CSS selectors)
- Repeat command loop type detection from args[0] identifier

**Test Results (After Session 2):**
- Basics: 5/5 (100%)
- Intermediate: 4/6 (67%) - Form Validation, Fetch Data failing
- Advanced: 3/5 (60%) - Color Cycling, State Machine failing

## Remaining Issues

### 1. Form Validation - `contains` Operator Not Working

**Symptom:** Email input doesn't get `.error` class when typing invalid text

**Test Code:**
```hyperscript
on input
  if my value contains '@'
    add .valid to me
  else
    add .error to me
  end
```

**Root Cause:**
The `contains` operator in `if my value contains '@'` is not evaluating correctly.
The condition appears to always be falsy, so neither branch executes properly.

**Investigation Needed:**
1. Check how `contains` is implemented in expression evaluator
2. Verify `my value` returns the input element's value
3. Test `contains` operator in isolation

**Fix Location:** Likely `packages/core/src/core/expression-evaluator.ts` or comparison logic

**Priority:** High - affects common string matching patterns

---

### 2. Fetch Data - Template Literal Interpolation Not Working

**Symptom:** Template literals render literally instead of being evaluated

**Output:**
```html
<h3>Todo #todoData.id</h3>
<p>Title: todoData.title</p>
```

**Expected:**
```html
<h3>Todo #1</h3>
<p>Title: delectus aut autem</p>
```

**Test Code:**
```hyperscript
put it.data into todoData
put `<h3>Todo #${todoData.id}</h3>...` into #native-output
```

**Root Cause:**
Template literal strings with `${...}` syntax are not being interpolated with
the current execution context. The `put` command receives the raw template
string without evaluation.

**Investigation Needed:**
1. Check how parser handles template literals
2. Verify expression evaluator handles template string interpolation
3. May need to add template literal evaluation in put command or globally

**Fix Location:** Parser template literal handling or expression evaluator

**Priority:** High - affects dynamic content rendering

---

### 3. Color Cycling - Transition Command Inside Repeat Block

**Error:**
```
transition command requires "to <value>" modifier
```

**Note:** The repeat `until-event` loop type is now working! The issue is the
`transition` command inside the loop not recognizing its modifiers.

**Test Code:**
```hyperscript
repeat until event pointerup from the document
  set rand to Math.random() * 360
  transition
    *background-color
    to `hsl(${rand} 100% 90%)`
    over 250ms
end
```

**Root Cause:**
The `transition` command's `parseInput` method doesn't find the `to` modifier
when the command is parsed within a repeat block. The parser may be structuring
the command differently when it's nested.

**Investigation Needed:**
1. Check how transition command parses `to` modifier
2. Compare AST structure of standalone vs nested transition commands
3. May need same args-based detection pattern used in other commands

**Fix Location:** `packages/core/src/commands/animation/transition.ts`

**Priority:** High - affects animations and visual feedback

---

### 4. State Machine - Test Timeout

**Error:** Test never completes (times out)

**Root Cause (Suspected):**
- Complex state machine logic may have infinite loop
- Event listeners not properly triggering state transitions
- Async operations not resolving

**Priority:** Low - complex debugging, other issues more impactful

---

## Implementation Order (Recommended)

1. **Template Literal Interpolation** - Root cause affects multiple examples
2. **Contains Operator** - Common string operation, should be straightforward
3. **Transition Command Modifiers** - Same pattern as other command fixes
4. **State Machine** - Requires deeper investigation

## Progress Summary

| Issue | Status | Notes |
|-------|--------|-------|
| Put Variable Assignment | ✅ Fixed | Variable vs CSS selector detection |
| Repeat Loop Type | ✅ Fixed | Args-based loop type detection |
| Form Validation | ❌ Pending | `contains` operator issue |
| Fetch Data Template | ❌ Pending | Template literal interpolation |
| Color Cycling Transition | ❌ Pending | Modifier parsing in nested blocks |
| State Machine | ❌ Pending | Timeout/hanging, needs investigation |
