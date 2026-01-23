# Test Recovery Strategy from Git History

## Summary

55 test files were deleted during the V1 to V2 migration (commit ac3131c99). These can be recovered and adapted for the new standalone command architecture.

## Recovery Command

```bash
# Recover any test file from git history:
git show ac3131c991817e11687a685791843a90516249f3^:PATH_TO_FILE > OUTPUT_FILE
```

## High-Priority Recoverable Tests (Match Phase 2 Plan)

### Data Commands (5 files)

- `packages/core/src/commands/data/increment.test.ts` (447 lines)
- `packages/core/src/commands/data/decrement.test.ts`
- `packages/core/src/commands/data/bind.test.ts`
- `packages/core/src/commands/data/default.test.ts`
- `packages/core/src/commands/data/persist.test.ts`

### Animation Commands (4 files)

- `packages/core/src/commands/animation/measure.test.ts`
- `packages/core/src/commands/animation/settle.test.ts`
- `packages/core/src/commands/animation/take.test.ts`
- `packages/core/src/commands/animation/transition.test.ts`

### Content & Execution (3 files)

- `packages/core/src/commands/content/append.test.ts`
- `packages/core/src/commands/behaviors/install.test.ts`
- `packages/core/src/commands/execution/call.test.ts`

### Control Flow & Navigation (3 files)

- `packages/core/src/commands/control-flow/halt.test.ts`
- `packages/core/src/commands/control-flow/unless.test.ts`
- `packages/core/src/commands/navigation/go.test.ts`

### Utility Commands (3 files)

- `packages/core/src/commands/advanced/beep.test.ts`
- `packages/core/src/commands/utility/copy.test.ts`
- `packages/core/src/commands/advanced/tell.test.ts`

**Total: 18 high-priority files matching Phase 2 plan**

## Additional Recoverable Tests (37 more files)

### Already Re-implemented (3 files - skip these)

- `packages/core/src/commands/dom/add.test.ts` - NOW: `__tests__/add.test.ts`
- `packages/core/src/commands/data/set.test.ts` - NOW: `__tests__/set.test.ts`
- `packages/core/src/commands/dom/toggle.test.ts` - NOW: `__tests__/toggle.test.ts`

### Control Flow (6 more files)

- `packages/core/src/commands/control-flow/break.test.ts`
- `packages/core/src/commands/control-flow/continue.test.ts`
- `packages/core/src/commands/control-flow/exit.test.ts`
- `packages/core/src/commands/control-flow/if.test.ts`
- `packages/core/src/commands/control-flow/repeat.test.ts`
- `packages/core/src/commands/control-flow/return.test.ts`
- `packages/core/src/commands/control-flow/throw.test.ts`

### DOM Commands (4 more files)

- `packages/core/src/commands/dom/hide.test.ts`
- `packages/core/src/commands/dom/put.test.ts`
- `packages/core/src/commands/dom/remove.test.ts`
- `packages/core/src/commands/dom/show.test.ts`

### Async Commands (2 files)

- `packages/core/src/commands/async/fetch.test.ts`
- `packages/core/src/commands/async/wait.test.ts`

### Template Commands (8 files)

- `packages/core/src/commands/templates/render.test.ts`
- `packages/core/src/commands/templates/template-compiler.test.ts`
- `packages/core/src/commands/templates/template-executor.test.ts`
- `packages/core/src/commands/templates/template-executor-optimized.test.ts`
- `packages/core/src/commands/templates/template-integration.test.ts`
- `packages/core/src/commands/templates/directives/directives.test.ts`
- `packages/core/src/commands/templates/render-escaping.test.ts`
- `packages/core/src/commands/templates/template-line-breaks.test.ts`

### Other Commands (6 files)

- `packages/core/src/commands/creation/make.test.ts`
- `packages/core/src/commands/events/send.test.ts`
- `packages/core/src/commands/execution/pseudo-command.test.ts`
- `packages/core/src/commands/utility/pick.test.ts`
- `packages/core/src/commands/advanced/async.test.ts`
- `packages/core/src/commands/advanced/js.test.ts`

### V1/V2 Compat Tests (3 files - probably skip)

- `packages/core/src/commands/dom/__tests__/hide-v1-v2-compat.test.ts`
- `packages/core/src/commands/dom/__tests__/show-v1-v2-compat.test.ts`
- `packages/core/src/commands/utility/__tests__/log-v1-v2-compat.test.ts`

### Dialog-specific (2 files)

- `packages/core/src/commands/dom/toggle.dialog.test.ts`
- `packages/core/src/commands/dom/toggle.elements.test.ts`

## Adaptation Required

The old tests were written for the V1 command architecture. They will need:

1. **Import changes**: Update from old V1 imports to V2 standalone imports
2. **API changes**: The V2 standalone pattern uses:
   - `CommandImplementation<TInput, TOutput, TypedExecutionContext>`
   - `parseInput()` method instead of direct execution
   - Different metadata structure
3. **Context setup**: Use new mock utilities from helper tests
4. **Test structure**: Follow the pattern from `add.test.ts` and `set.test.ts`

## Recommended Approach

1. **Quick validation**: Recover increment.test.ts and assess adaptation effort
2. **Batch recovery**: If adaptation is reasonable, recover all 18 high-priority files
3. **Systematic adaptation**: Update each file to V2 patterns
4. **Iterative testing**: Fix and verify each file before moving to next

## Expected Coverage Gain

If all 18 high-priority files are recovered and adapted:

- **Conservative estimate**: +10-15% coverage (assuming ~200-400 lines per file)
- **This would reach**: 56-61% coverage (vs Phase 1 target of 55%)

## Alternative: Hybrid Approach

1. Use recovered tests as **reference documentation** for behavior
2. Write new V2-style tests based on old test structure
3. Best of both worlds: fast recovery + modern architecture compliance
