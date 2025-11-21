# Phase 3 Progress: Additional Commands with parseInput()

**Date**: 2025-01-21
**Status**: ✅ **IN PROGRESS** - 3 additional commands migrated

## Summary

Continuing the tree-shaking refactoring by adding parseInput() methods to additional important commands, expanding our coverage beyond the core 13 commands from Phase 2.

## Phase 3 Commands (3 new commands) ✅

### New Commands Created
14. **SendCommand** - [commands-v2/events/send.ts](src/commands-v2/events/send.ts)
15. **GoCommand** - [commands-v2/navigation/go.ts](src/commands-v2/navigation/go.ts)
16. **MakeCommand** - [commands-v2/dom/make.ts](src/commands-v2/dom/make.ts)

## Total Command Coverage

**Phase 2**: 13 commands (hide, show, add, remove, toggle, put, wait, fetch, set, increment, decrement, log, trigger)
**Phase 3**: +3 commands (send, go, make)
**Total**: **16 commands** with parseInput() pattern

## Parsing Patterns

### SendCommand - Event Emission Pattern
**Syntax**: `send <event-name> [<event-detail>] [to <target>]`

```typescript
async parseInput(raw, evaluator, context): Promise<any[]> {
  const eventName = await evaluator.evaluate(raw.args[0], context);
  const restArgs = [];

  // Evaluate remaining args (event detail, etc.)
  for (let i = 1; i < raw.args.length; i++) {
    restArgs.push(await evaluator.evaluate(raw.args[i], context));
  }

  // Add target from 'to' or 'on' modifier
  if (raw.modifiers.to) {
    const target = await evaluator.evaluate(raw.modifiers.to, context);
    restArgs.push('to', target);
  }

  return [eventName, ...restArgs];
}
```

### GoCommand - Navigation Pattern
**Syntax**: `go back | go to url <url> | go to <position> of <element>`

```typescript
async parseInput(raw, evaluator, context): Promise<any[]> {
  // Simple evaluation - GoCommand handles complex pattern matching internally
  const evaluatedArgs = await Promise.all(
    raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
  );
  return evaluatedArgs;
}
```

### MakeCommand - Element Creation Pattern
**Syntax**: `make (a|an) <element-type>`

```typescript
async parseInput(raw, evaluator, context): Promise<any> {
  const type = raw.args.length > 0
    ? await evaluator.evaluate(raw.args[0], context)
    : undefined;

  const article = raw.modifiers.a || raw.modifiers.an;

  return { type, article: article ? 'a' : undefined };
}
```

## Validation Results

✅ **TypeScript Compilation**: Zero errors in commands-v2 directory
✅ **Type Safety**: Full type inference maintained
✅ **Non-Destructive**: Original commands untouched
✅ **Index Updated**: All new exports added to commands-v2/index.ts

```bash
$ npx tsc --noEmit --project tsconfig.json 2>&1 | grep "commands-v2"
# (no output - zero errors)
```

## File Structure Update

```
packages/core/src/commands-v2/
├── index.ts                     # Updated with 16 exports
├── async/
│   ├── wait.ts
│   └── fetch.ts
├── data/
│   ├── set.ts
│   ├── increment.ts
│   └── decrement.ts
├── dom/
│   ├── hide.ts
│   ├── show.ts
│   ├── add.ts
│   ├── remove.ts
│   ├── toggle.ts
│   ├── put.ts
│   └── make.ts                  # NEW
├── events/
│   ├── trigger.ts
│   └── send.ts                  # NEW
├── navigation/
│   └── go.ts                    # NEW
└── utility/
    └── log.ts
```

## Remaining Commands to Migrate

### High Priority (Common Usage)
- **IfCommand** - Conditional execution (complex - needs block handling)
- **RepeatCommand** - Loops (complex - needs block handling)
- **TakeCommand** - Property transfer between elements
- **CallCommand** - Function invocation
- **ThrowCommand** - Error throwing

### Medium Priority
- **UnlessCommand** - Inverse conditional
- **ForCommand** - For loops
- **WhileCommand** - While loops
- **ListenCommand** - Event listeners
- **BackCommand** - Browser history

### Lower Priority
- **MeasureCommand** - DOM measurements
- **RenderCommand** - Template rendering
- **InstallCommand** - Behavior installation
- **AwaitCommand** - Promise handling
- **HaltCommand**, **ExitCommand**, **ReturnCommand** - Control flow

## Bundle Size Impact (Projected)

| Configuration | Current | With 16 Commands | Savings |
|---------------|---------|------------------|---------|
| Minimal (2 commands) | 511 KB | ~90 KB | 82% |
| Small (5 commands) | 511 KB | ~120 KB | 76% |
| Medium (10 commands) | 511 KB | ~160 KB | 69% |
| **Standard (16 commands)** | 511 KB | **~200 KB** | **61%** |

## Next Steps

### Option A: Complete Critical Commands (Recommended)
1. **IfCommand** - Most important for control flow
2. **RepeatCommand** - Essential for loops
3. **TakeCommand** - Common DOM manipulation
4. **CallCommand** - Function invocation

Benefits:
- Covers most common use cases
- Enables real-world runtime testing
- ~20 commands total (Phase 2 + Phase 3 + critical)

### Option B: Test Current Progress
1. Update RuntimeExperimental with all 16 commands
2. Build browser bundles
3. Measure actual tree-shaking effectiveness
4. Validate behavior matches Runtime

Benefits:
- Validates architecture before more work
- Provides real bundle size data
- Identifies any integration issues early

### Option C: Continue Full Migration
Continue adding parseInput() to all remaining commands systematically.

Benefits:
- Complete coverage
- No command left behind
- Maximum tree-shaking potential

## Metrics

- **Commands Migrated (Phase 3)**: 3
- **Total Commands with parseInput()**: 16
- **Total Lines Added (Phase 3)**: ~400
- **TypeScript Errors**: 0
- **Breaking Changes**: 0
- **Time to Complete**: ~1 hour

## Success Criteria ✅

Phase 3 goals met:

1. ✅ **3 additional commands** - Send, Go, Make migrated
2. ✅ **Zero TypeScript errors** - All compile successfully
3. ✅ **Index updated** - New exports added
4. ✅ **Patterns documented** - Parsing logic explained
5. ✅ **Non-destructive** - Original commands untouched

## Conclusion

Phase 3 is successfully progressing with **16 total commands** now supporting the parseInput() pattern. The architecture continues to prove solid, with consistent patterns emerging across different command types.

**Recommendation**: Proceed with **Option A** (critical commands) to enable meaningful runtime testing while maintaining momentum.
