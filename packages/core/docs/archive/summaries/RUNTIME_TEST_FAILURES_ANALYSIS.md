# Runtime Test Failures Analysis

## Overview
Analysis of 2 failing tests in `src/runtime/runtime.test.ts` after completing compound syntax implementation and add/remove class fixes.

## Failure 1: SET Command for Context Variables

### Test Case
```typescript
it('should execute set command for context variables', async () => {
  const setCommandAST = {
    type: 'command',
    name: 'set',
    args: [
      { type: 'identifier', name: 'result' },
      { type: 'identifier', name: 'to' },
      { type: 'literal', value: 'completed' }
    ]
  };

  await runtime.execute(setCommandAST as any, context);

  expect(context.result).toBe('completed'); // FAILS: context.result is null
});
```

### Failure Details
- **Expected**: `context.result === 'completed'`
- **Actual**: `context.result === null`
- **Reason**: Value was stored in `context.locals.get('result')` instead

### Root Cause

1. **ExecutionContext type definition** ([src/types/base-types.ts:115](src/types/base-types.ts#L115)):
   ```typescript
   export interface ExecutionContext {
     readonly result: unknown;
     readonly locals: Map<string, unknown>;
     ...
   }
   ```
   The `result` property is marked `readonly`.

2. **SET command implementation** ([src/commands/data/enhanced-set.ts:270](src/commands/data/enhanced-set.ts#L270)):
   ```typescript
   private setLocalVariable(context, variableName, value) {
     context.locals.set(variableName, value);
     context.it = value;  // Sets it, but not result
     return { target: variableName, value, ... };
   }
   ```

3. **The issue**: The SET command treats `result` as a regular variable and stores it in `context.locals` Map. But the test expects it to be set as a direct property on the context object.

### Official _hyperscript Behavior

In official _hyperscript, `result` is a special context property that gets set directly on the context, not in the variables Map. This is similar to how `it` is handled (which the SET command DOES set directly).

### Fix Required

The SET command needs special handling for context properties like `result`:

```typescript
private setLocalVariable(context, variableName, value) {
  // Special handling for context properties
  if (variableName === 'result') {
    (context as any).result = value;  // Type assertion needed due to readonly
    context.it = value;
    return { target: variableName, value, previousValue: context.result, targetType: 'variable' };
  }

  // Regular variable handling
  const previousValue = context.locals?.get(variableName) || ...;
  context.locals.set(variableName, value);
  context.it = value;
  return { target: variableName, value, previousValue, targetType: 'variable' };
}
```

**Alternative**: The test could be updated to check `context.locals.get('result')` instead, but this would diverge from official _hyperscript behavior.

---

## Failure 2: Missing Context Elements Error Handling

### Test Case
```typescript
it('should handle missing context elements', async () => {
  context.me = null;
  const ast = parse('hide me').node!;

  await expect(runtime.execute(ast, context)).rejects.toThrow('Context element "me" is null');
  // FAILS: Promise resolves with [] instead of rejecting
});
```

### Failure Details
- **Expected**: Promise rejects with error "Context element 'me' is null"
- **Actual**: Promise resolves successfully with value `[]` (empty array)

### Root Cause

The enhanced Hide command's `resolveTargets` method ([src/commands/dom/hide.ts:153-183](src/commands/dom/hide.ts#L153-L183)):

```typescript
private resolveTargets(context, target?) {
  // Default to context.me if no target specified
  if (target === undefined || target === null) {
    return context.me ? [context.me] : [];  // ← LINE 159: Returns [] when me is null
  }

  // Handle other target types...
  return [];
}
```

When executing `hide me`:
1. The `me` identifier evaluates to `null` (because `context.me = null`)
2. The Hide command receives `null` as the target
3. Line 159 checks `target === null` and returns `context.me ? [context.me] : []`
4. Since `context.me` is also `null`, it returns `[]`
5. The execute method processes empty array successfully (no elements to hide)
6. Returns `{ success: true, value: [], type: 'element-list' }`

### Expected Behavior

When `context.me` is null and a command explicitly references `me`, it should throw an error indicating that the context element is missing. This is important for:
- **Error detection**: Helps developers catch bugs where elements aren't properly initialized
- **Official compatibility**: Official _hyperscript throws errors for missing context references
- **User experience**: Clear error messages rather than silent failures

### Fix Required

Modify the `resolveTargets` method in [src/commands/dom/hide.ts:158-160](src/commands/dom/hide.ts#L158-L160):

```typescript
private resolveTargets(context, target?) {
  // Default to context.me if no target specified
  if (target === undefined || target === null) {
    if (!context.me) {
      throw new Error('Context element "me" is null');
    }
    return [context.me];
  }

  // ... rest of method
}
```

**Note**: This same issue likely exists in other DOM commands (Show, Toggle, etc.) that use similar target resolution logic.

---

## Impact Assessment

### Severity
- **Issue 1 (SET/result)**: **Medium** - Affects context variable semantics, breaks compatibility with official _hyperscript
- **Issue 2 (null context)**: **Medium** - Silently fails instead of reporting errors, makes debugging harder

### Scope
- **Issue 1**: Affects only SET command with context properties (`result`, possibly others)
- **Issue 2**: Affects all enhanced DOM commands (Hide, Show, Toggle, etc.) when context.me is null

### Compatibility
- **Issue 1**: Currently incompatible with official _hyperscript behavior for `result` variable
- **Issue 2**: Currently incompatible with official _hyperscript error handling

---

## Recommendation

Both issues are legitimate bugs that should be fixed to maintain compatibility with official _hyperscript and provide better developer experience.

### Priority
1. **Fix Issue 2 first**: Error handling is critical for debugging and user experience
2. **Fix Issue 1 after**: Context property handling is important for semantic correctness

### Testing
After fixes, verify:
- ✅ `set result to 'value'` sets `context.result` directly
- ✅ `hide me` with `context.me = null` throws appropriate error
- ✅ Enhanced commands (Hide, Show, Toggle, Add, Remove) all handle null context properly
- ✅ No regressions in existing 17 passing runtime tests

---

## Files Requiring Changes

1. **src/commands/data/enhanced-set.ts** - Add special handling for `result` (and potentially other context properties)
2. **src/commands/dom/hide.ts** - Fix null context handling in `resolveTargets`
3. **src/commands/dom/show.ts** - Similar fix needed (likely)
4. **src/commands/dom/toggle.ts** - Similar fix needed (likely)
5. **Other DOM commands** - Audit for similar issues

---

Generated: 2025-10-17
Status: Analysis Complete, Fixes Pending
Related Work: Compound Syntax Implementation (Complete), Add/Remove Class Integration (Complete)
