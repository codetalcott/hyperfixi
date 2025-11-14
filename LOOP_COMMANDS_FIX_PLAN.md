# Loop Commands Fix Plan: Break/Continue Error Handling

**Date**: 2025-11-13
**Issue**: Repeat command with break/continue throws unhandled errors
**Status**: Root cause identified, fix plan created

---

## 🐛 Problem Statement

### Test Results
```
Test 1 (repeat 5 times): ✅ PASS
Test 2 (repeat with break): ❌ FAIL - Error: BREAK_LOOP
Test 3 (repeat with continue): ❌ FAIL - Error: CONTINUE_LOOP
```

### Error Stack Trace
```
❌ COMMAND FAILED: Error: CONTINUE_LOOP
    at ContinueCommand.execute()              ← Line 58: throw continueError
    at RepeatCommand.execute()                 ← Should catch here, but doesn't
    at Runtime.executeEnhancedCommand()        ← Line 1326: no try-catch
    at Runtime.executeCommand()
    at Runtime.execute()
```

---

## 🔍 Root Cause Analysis

### Issue 1: Parser Integration vs. Implementation Mismatch

**The Fundamental Problem**:
- RepeatCommand is implemented as a `CommandImplementation` class
- It expects sub-commands as `Function[]` (line 284, 333, 374)
- But it's being given **AST nodes**, not Functions
- The error handling exists but operates on the wrong data structure

### Expected Flow (How It Should Work)

```typescript
// RepeatCommand.ts lines 346-361
for (const command of commands) {
  try {
    lastResult = await command(context);  // ← Calls function
  } catch (error) {
    if (error.message.includes('CONTINUE')) {
      break;  // Exit command loop, continue outer loop
    }
    if (error.message.includes('BREAK')) {
      interrupted = true;
      break;
    }
  }
  throw error;  // Only if not BREAK/CONTINUE
}
```

### Actual Flow (What's Happening)

```typescript
// RepeatCommand receives AST nodes, not Functions
// Somehow the commands get executed but errors escape
// The try-catch in RepeatCommand doesn't catch them
// Errors bubble up to Runtime
```

---

## 🎯 The Core Issue

Looking at the RepeatCommand interface definition (lines 14-25):

```typescript
export interface RepeatCommandInput {
  type: 'for' | 'times' | 'while' | 'until' | 'until-event' | 'forever';
  variable?: string;
  collection?: any;
  count?: number;
  condition?: any;
  indexVariable?: string;
  commands?: Function[];  // ← Commands as Functions
  eventName?: string;
  eventTarget?: any;
}
```

But how does the runtime pass AST nodes as Functions?

### The Missing Link: Command Executor Wrapper

The runtime needs to wrap AST node execution in a function. The RepeatCommand expects:

```typescript
commands: [
  async (ctx) => await runtime.execute(commandNode1, ctx),
  async (ctx) => await runtime.execute(commandNode2, ctx),
  async (ctx) => await runtime.execute(commandNode3, ctx),
]
```

But it's probably getting:
```typescript
commands: [
  commandNode1,  // ← Raw AST node
  commandNode2,
  commandNode3,
]
```

---

## 🔧 Three Possible Fixes

### Option 1: Fix Runtime Integration (Proper Solution)

**Location**: `packages/core/src/runtime/runtime.ts`

**Change**: Modify `executeEnhancedCommand` to wrap sub-command AST nodes as Functions before passing to RepeatCommand

**Implementation**:
```typescript
// Around line 1320-1330 in executeEnhancedCommand
if (name === 'repeat') {
  // Extract commands from input structure
  const input = evaluatedArgs[0] || {};

  // Wrap command AST nodes as executable functions
  if (input.commands && Array.isArray(input.commands)) {
    input.commands = input.commands.map(cmdNode =>
      async (ctx: ExecutionContext) => {
        try {
          return await this.execute(cmdNode, ctx);
        } catch (error) {
          // Let break/continue propagate to repeat command
          throw error;
        }
      }
    );
  }

  result = await adapter.execute(context, input);
}
```

**Effort**: 2-3 hours
- Investigate how commands are passed to repeat
- Implement wrapper logic
- Test all 6 loop types (for, times, while, until, until-event, forever)
- Test break and continue in each

**Pros**:
- ✅ Fixes the root cause
- ✅ Maintains existing RepeatCommand implementation
- ✅ Allows proper error handling

**Cons**:
- ⏰ Requires understanding runtime-command integration
- 🔧 May need similar fixes for other compound commands (if, unless, etc.)

---

### Option 2: Modify RepeatCommand to Handle AST Nodes

**Location**: `packages/core/src/commands/control-flow/repeat.ts`

**Change**: Modify RepeatCommand to accept AST nodes and execute them directly

**Implementation**:
```typescript
// Change interface
export interface RepeatCommandInput {
  // ...
  commands?: (Function | ASTNode)[];  // Accept either
}

// In handleTimesLoop, handleForLoop, etc.
for (const command of commands) {
  try {
    if (typeof command === 'function') {
      lastResult = await command(context);
    } else {
      // It's an AST node - execute via runtime
      const runtimeExecute = context.locals.get('_runtimeExecute');
      lastResult = await runtimeExecute(command, context);
    }
  } catch (error) {
    // ... existing error handling
  }
}
```

**Effort**: 3-4 hours
- Modify all 6 loop handler methods
- Add ASTNode type support
- Test all scenarios

**Pros**:
- ✅ Self-contained fix in RepeatCommand
- ✅ Flexible - supports both Functions and AST nodes

**Cons**:
- ⏰ More code changes
- 🔧 RepeatCommand becomes coupled to AST structure

---

### Option 3: Add Try-Catch in Runtime (Quick Patch)

**Location**: `packages/core/src/runtime/runtime.ts`

**Change**: Wrap `adapter.execute()` call in try-catch to handle control flow errors

**Implementation**:
```typescript
// Around line 1326 in executeEnhancedCommand
try {
  result = await adapter.execute(context, ...evaluatedArgs);
} catch (error) {
  // Handle control flow errors that escape from nested commands
  if (error instanceof Error) {
    if (error.message === 'BREAK_LOOP' || error.message === 'CONTINUE_LOOP') {
      // These should have been caught by repeat command
      // If they escape, it means repeat command completed
      // Don't propagate as error
      return undefined;
    }
  }
  throw error;
}
```

**Effort**: 30 minutes

**Pros**:
- ✅ Very quick fix
- ✅ Minimal code changes
- ✅ Gets tests passing

**Cons**:
- ❌ Doesn't fix root cause
- ❌ Hides the real problem
- ❌ May mask other issues
- ❌ Not a proper solution

---

## 📊 Recommended Approach

### Phase 1: Quick Investigation (1 hour)

1. **Trace actual data flow**:
   ```bash
   # Add debug logging to see what RepeatCommand actually receives
   # Check packages/core/src/commands/control-flow/repeat.ts line 118
   console.log('RepeatCommand.execute input:', input);
   console.log('Commands type:', typeof input.commands, Array.isArray(input.commands));
   if (input.commands) {
     console.log('First command type:', typeof input.commands[0]);
   }
   ```

2. **Check parser integration**:
   - How does the parser create RepeatCommand input?
   - Where are sub-commands extracted from the AST?
   - Are they AST nodes or Functions?

3. **Identify integration point**:
   - Find where Runtime calls RepeatCommand
   - See what data structure is actually passed

### Phase 2: Implement Fix (2-3 hours)

**Recommended: Option 1 (Runtime Integration Fix)**

Reasoning:
- Fixes root cause
- Maintains clean separation of concerns
- RepeatCommand stays as pure CommandImplementation
- Runtime handles AST → Function wrapping

**Steps**:
1. Locate where repeat command is invoked in runtime
2. Add command wrapping logic
3. Test with all 3 test cases
4. Verify error handling works correctly

### Phase 3: Comprehensive Testing (1 hour)

Test all loop scenarios:
- ✅ `repeat N times`
- ✅ `repeat N times with break`
- ✅ `repeat N times with continue`
- ✅ `for item in array`
- ✅ `while condition`
- ✅ `until condition`
- ✅ Nested loops with break/continue

---

## 🎯 Alternative: Check Official _hyperscript

Before implementing a fix, check if official _hyperscript has repeat/break/continue:

```bash
# Clone official _hyperscript repo
git clone https://github.com/bigskysoftware/_hyperscript
cd _hyperscript

# Search for repeat command
grep -r "repeat" src/

# Check how they handle break/continue
grep -r "break\|continue" src/
```

**If official _hyperscript has these commands**:
- Use their implementation
- Much less effort
- Guaranteed compatibility

**If official _hyperscript doesn't have them**:
- Our implementation is unique
- Need to fix our integration
- Continue with Phase 1-3 above

---

## 📝 Current Status

- ✅ Root cause identified
- ✅ Three fix options documented
- ✅ Test cases exist
- ⏳ Awaiting investigation (Phase 1)
- ⏳ Need to choose fix approach

---

## 🚀 Next Steps

**Immediate (1 hour)**:
1. Check official _hyperscript for repeat/break/continue
2. Add debug logging to trace data flow
3. Identify exact integration point

**Short-term (2-3 hours)**:
1. Implement chosen fix (likely Option 1)
2. Run all test cases
3. Verify error handling

**Follow-up**:
1. Check if other compound commands (if, unless) have similar issues
2. Add comprehensive loop tests to test suite
3. Document loop command behavior

---

**Priority**: MEDIUM-HIGH
**Effort**: 4-5 hours total
**Impact**: 3 additional working commands
**Risk**: LOW (isolated to loop commands)
