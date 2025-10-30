# Command Migration Guide: Legacy → Enhanced Pattern

**Purpose**: Guide for migrating legacy commands to the enhanced TypeScript pattern
**Date Created**: 2025-10-29
**Status**: Active - Use for all future command migrations

---

## Table of Contents

1. [Overview](#overview)
2. [Pattern Comparison](#pattern-comparison)
3. [Migration Process](#migration-process)
4. [Step-by-Step Checklist](#step-by-step-checklist)
5. [Type Safety Requirements](#type-safety-requirements)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The HyperFixi codebase maintains two command implementation patterns:

### Legacy Pattern (OLD)
```typescript
class HaltCommand {
  name = 'halt';

  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    // Implementation uses rest parameters
    // No type safety for inputs
  }
}

// Registration
this.registerLegacyCommand(new HaltCommand() as any);
```

### Enhanced Pattern (NEW)
```typescript
interface HaltCommandInput {
  // Typed input parameters
}

interface HaltCommandOutput {
  // Typed output
}

class HaltCommand implements CommandImplementation<HaltCommandInput, HaltCommandOutput> {
  name = 'halt';

  async execute(
    input: HaltCommandInput,
    context: TypedExecutionContext
  ): Promise<HaltCommandOutput> {
    // Implementation uses typed input object
    // Full TypeScript type safety
  }
}

// Registration (via factory or enhanced registry)
ENHANCED_COMMAND_FACTORIES.set('halt', () => new HaltCommand());
```

**Benefits of Enhanced Pattern**:
- ✅ Full TypeScript type safety
- ✅ Clear input/output contracts
- ✅ Better IDE autocomplete
- ✅ Easier to test and maintain
- ✅ No `any` types or type assertions
- ✅ Consistent architecture across codebase

---

## Pattern Comparison

| Aspect | Legacy Pattern | Enhanced Pattern |
|--------|----------------|------------------|
| **Execute Signature** | `execute(context, ...args)` | `execute(input, context)` |
| **Input Types** | `unknown[]` (rest params) | Typed interface |
| **Output Types** | `Promise<unknown>` | `Promise<TOutput>` |
| **Context Type** | `ExecutionContext` | `TypedExecutionContext` |
| **Type Safety** | Minimal (casts required) | Full TypeScript |
| **Registration** | `registerLegacyCommand()` | `EnhancedCommandRegistry` |
| **Function Length** | `execute.length === 1` | `execute.length === 2` |
| **Interface** | None or loose | `CommandImplementation<TInput, TOutput>` |

---

## Migration Process

### Phase 1: Preparation (15-30 minutes)

1. **Read the existing command implementation**
   ```bash
   # Example: Migrating HaltCommand
   cat packages/core/src/commands/control-flow/halt.ts
   ```

2. **Read the existing tests**
   ```bash
   cat packages/core/src/commands/control-flow/halt.test.ts
   ```

3. **Document current behavior**
   - What arguments does the command accept?
   - What does it return?
   - What side effects does it have?
   - Are there edge cases or special behaviors?

4. **Check for duplicate registration**
   - Search for the command name in `runtime.ts`
   - Verify if it's in both legacy AND enhanced registries
   - If duplicate, plan to remove the legacy registration

### Phase 2: Type Definitions (15-30 minutes)

1. **Define Input Interface**
   ```typescript
   /**
    * Input parameters for the halt command
    */
   interface HaltCommandInput {
     // Define all parameters with types
     // Add JSDoc comments for documentation
     reason?: string;
     immediately?: boolean;
   }
   ```

2. **Define Output Interface**
   ```typescript
   /**
    * Output from the halt command
    */
   interface HaltCommandOutput {
     halted: boolean;
     reason?: string;
   }
   ```

3. **Add JSDoc Documentation**
   - Describe purpose of each field
   - Note optional vs required fields
   - Document default values
   - Include examples

### Phase 3: Implementation (30-60 minutes)

1. **Update Class Declaration**
   ```typescript
   export class HaltCommand implements CommandImplementation<HaltCommandInput, HaltCommandOutput> {
     name = 'halt';
     description = 'Halt command execution';
     syntax = 'halt [reason]';
   ```

2. **Update Execute Method Signature**
   ```typescript
   // OLD
   async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown>

   // NEW
   async execute(input: HaltCommandInput, context: TypedExecutionContext): Promise<HaltCommandOutput>
   ```

3. **Refactor Method Body**
   ```typescript
   // OLD: Extract from args array
   const reason = args[0] as string | undefined;
   const immediately = args[1] as boolean | undefined;

   // NEW: Use typed input object
   const { reason, immediately } = input;
   ```

4. **Update Return Statements**
   ```typescript
   // OLD
   return undefined; // or return some unknown value

   // NEW
   return {
     halted: true,
     reason: reason || 'Execution halted'
   };
   ```

5. **Remove Type Assertions**
   - Replace `as any` with proper types
   - Replace `as unknown` with specific types
   - Remove type suppression comments

### Phase 4: Registration (10-15 minutes)

1. **Remove Legacy Registration**
   ```typescript
   // In packages/core/src/runtime/runtime.ts
   // DELETE THIS LINE:
   this.registerLegacyCommand(new HaltCommand() as any);
   ```

2. **Add/Verify Enhanced Registration**
   ```typescript
   // In packages/core/src/commands/command-registry.ts
   // Verify this exists in ENHANCED_COMMAND_FACTORIES:
   ENHANCED_COMMAND_FACTORIES.set('halt', () => new HaltCommand());
   ```

3. **Update Imports**
   - Ensure command is imported in command-registry.ts
   - Remove command import from legacy registration section in runtime.ts (if applicable)

### Phase 5: Testing & Validation (20-40 minutes)

1. **Run TypeScript Validation**
   ```bash
   npm run typecheck --prefix packages/core
   ```
   - Must pass with ZERO errors
   - Fix any type errors before proceeding

2. **Run Command-Specific Tests**
   ```bash
   npm test src/commands/control-flow/halt.test.ts
   ```
   - All tests must pass
   - Add new tests if coverage is insufficient

3. **Run Full Test Suite**
   ```bash
   npm test --prefix packages/core
   ```
   - Ensure no regressions in other commands

4. **Test in Browser (Optional but Recommended)**
   ```bash
   npm run build:browser --prefix packages/core
   # Open test pages in browser to verify behavior
   ```

### Phase 6: Documentation (10-15 minutes)

1. **Update Command Documentation**
   - Add or update JSDoc comments
   - Document input/output types
   - Include usage examples

2. **Update Migration Tracking**
   - Mark command as "migrated" in ARCHITECTURE_NOTE_LEGACY_ENHANCED.md
   - Update this guide with lessons learned (if applicable)

3. **Commit Changes**
   ```bash
   git add packages/core/src/commands/control-flow/halt.ts
   git add packages/core/src/runtime/runtime.ts
   git commit -m "feat: Migrate HaltCommand to enhanced pattern

   - Define HaltCommandInput and HaltCommandOutput interfaces
   - Update execute signature to use typed input/context
   - Remove legacy registration, verify enhanced registration
   - All tests passing, zero TypeScript errors

   Part of gradual command consolidation (Phase 2, Session 2)"
   ```

---

## Step-by-Step Checklist

Use this checklist for each command migration:

### Before Starting
- [ ] Read existing command implementation
- [ ] Read existing tests
- [ ] Document current behavior and edge cases
- [ ] Check for duplicate registration
- [ ] Estimate complexity (simple/moderate/complex)

### Type Definitions
- [ ] Create `[CommandName]Input` interface
- [ ] Create `[CommandName]Output` interface
- [ ] Add JSDoc documentation to interfaces
- [ ] Mark optional fields with `?`
- [ ] Document default values

### Implementation
- [ ] Update class to implement `CommandImplementation<TInput, TOutput>`
- [ ] Change execute signature: `(context, ...args)` → `(input, context)`
- [ ] Replace args destructuring with `const { prop1, prop2 } = input`
- [ ] Update context type: `ExecutionContext` → `TypedExecutionContext`
- [ ] Fix all return statements to match `TOutput` type
- [ ] Remove all `as any` and `as unknown` casts
- [ ] Add explicit type annotations to all variables (no implicit `any`)

### Registration
- [ ] Remove `registerLegacyCommand()` call from runtime.ts
- [ ] Verify command factory in ENHANCED_COMMAND_FACTORIES (command-registry.ts)
- [ ] Update imports in both files

### Testing
- [ ] Run `npm run typecheck` - MUST PASS (zero errors)
- [ ] Verify no implicit `any` types
- [ ] Run command-specific tests - MUST PASS
- [ ] Run full test suite - MUST PASS
- [ ] Manual browser testing (optional but recommended)

### Documentation
- [ ] Update JSDoc comments on command class
- [ ] Add usage examples in comments
- [ ] Update ARCHITECTURE_NOTE_LEGACY_ENHANCED.md
- [ ] Update this guide with lessons learned (if needed)

### Commit
- [ ] Stage all changed files
- [ ] Write descriptive commit message
- [ ] Reference migration phase and session number
- [ ] Include "zero TypeScript errors" in message

---

## Type Safety Requirements

### Strict TypeScript Configuration

Ensure these settings are enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### No Implicit Any

❌ **BAD** (implicit any):
```typescript
const value = args[0]; // type: any
const result = someFunction(); // type: any
```

✅ **GOOD** (explicit types):
```typescript
const value = args[0] as string | undefined;
const result: CommandOutput = await someFunction();
```

### No Type Assertions

❌ **BAD** (type assertions):
```typescript
const command = new HaltCommand() as any;
return result as unknown;
```

✅ **GOOD** (proper types):
```typescript
const command: CommandImplementation<Input, Output> = new HaltCommand();
return result; // Already typed correctly
```

### Proper Optional Handling

❌ **BAD** (no null checks):
```typescript
const name = input.name; // Could be undefined
console.log(name.toUpperCase()); // Runtime error if undefined
```

✅ **GOOD** (proper handling):
```typescript
const name = input.name;
if (name) {
  console.log(name.toUpperCase());
}
// OR
const name = input.name ?? 'default';
```

---

## Examples

### Example 1: Simple Command (HaltCommand)

**Before (Legacy Pattern)**:
```typescript
export class HaltCommand {
  name = 'halt';

  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    throw new Error('Execution halted');
  }
}

// Registration in runtime.ts
this.registerLegacyCommand(new HaltCommand() as any);
```

**After (Enhanced Pattern)**:
```typescript
interface HaltCommandInput {
  // Halt takes no parameters, but we still define an interface for consistency
}

interface HaltCommandOutput {
  halted: true;
}

export class HaltCommand implements CommandImplementation<HaltCommandInput, HaltCommandOutput> {
  name = 'halt';
  description = 'Immediately halt command execution';
  syntax = 'halt';

  async execute(input: HaltCommandInput, context: TypedExecutionContext): Promise<HaltCommandOutput> {
    throw new Error('Execution halted');
  }
}

// Registration in command-registry.ts
ENHANCED_COMMAND_FACTORIES.set('halt', () => new HaltCommand());

// Remove legacy registration from runtime.ts (delete the registerLegacyCommand line)
```

### Example 2: Command with Parameters (DefaultCommand)

**Before (Legacy Pattern)**:
```typescript
export class DefaultCommand {
  name = 'default';

  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const variableName = args[0] as string;
    const defaultValue = args[1];

    const currentValue = context.locals?.get(variableName);
    if (currentValue === undefined) {
      context.locals?.set(variableName, defaultValue);
    }

    return context.locals?.get(variableName);
  }
}
```

**After (Enhanced Pattern)**:
```typescript
/**
 * Input for default command
 */
interface DefaultCommandInput {
  /** Name of the variable to set default for */
  variableName: string;
  /** Default value to use if variable is undefined */
  defaultValue: unknown;
}

/**
 * Output from default command
 */
interface DefaultCommandOutput {
  /** The final value of the variable (either existing or default) */
  value: unknown;
}

export class DefaultCommand implements CommandImplementation<DefaultCommandInput, DefaultCommandOutput> {
  name = 'default';
  description = 'Set a default value for a variable if it is undefined';
  syntax = 'default variableName to defaultValue';

  async execute(input: DefaultCommandInput, context: TypedExecutionContext): Promise<DefaultCommandOutput> {
    const { variableName, defaultValue } = input;

    const currentValue = context.locals.get(variableName);
    if (currentValue === undefined) {
      context.locals.set(variableName, defaultValue);
    }

    const finalValue = context.locals.get(variableName);
    return { value: finalValue };
  }
}
```

### Example 3: Complex Command (PickCommand)

**Before (Legacy Pattern)**:
```typescript
export class PickCommand {
  name = 'pick';

  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const criteria = args[0] as string; // 'random', 'first', 'last'
    const collection = args[1] as unknown[];

    switch (criteria) {
      case 'random':
        return collection[Math.floor(Math.random() * collection.length)];
      case 'first':
        return collection[0];
      case 'last':
        return collection[collection.length - 1];
      default:
        throw new Error(`Unknown pick criteria: ${criteria}`);
    }
  }
}
```

**After (Enhanced Pattern)**:
```typescript
/**
 * Pick criteria for selecting elements from a collection
 */
type PickCriteria = 'random' | 'first' | 'last';

/**
 * Input for pick command
 */
interface PickCommandInput {
  /** Criteria for picking: 'random', 'first', or 'last' */
  criteria: PickCriteria;
  /** Collection to pick from */
  collection: unknown[];
}

/**
 * Output from pick command
 */
interface PickCommandOutput {
  /** The selected element */
  selected: unknown;
  /** The index of the selected element */
  index: number;
}

export class PickCommand implements CommandImplementation<PickCommandInput, PickCommandOutput> {
  name = 'pick';
  description = 'Pick an element from a collection based on criteria';
  syntax = 'pick [random|first|last] from collection';

  async execute(input: PickCommandInput, context: TypedExecutionContext): Promise<PickCommandOutput> {
    const { criteria, collection } = input;

    let index: number;

    switch (criteria) {
      case 'random':
        index = Math.floor(Math.random() * collection.length);
        break;
      case 'first':
        index = 0;
        break;
      case 'last':
        index = collection.length - 1;
        break;
      default:
        // TypeScript will catch this at compile time with proper typing
        throw new Error(`Unknown pick criteria: ${criteria}`);
    }

    return {
      selected: collection[index],
      index
    };
  }
}
```

---

## Testing

### Unit Tests

Ensure your migrated command has comprehensive unit tests:

```typescript
import { describe, it, expect } from 'vitest';
import { HaltCommand } from './halt';
import type { TypedExecutionContext } from '../../types/command-types';

describe('HaltCommand (Enhanced Pattern)', () => {
  let command: HaltCommand;
  let context: TypedExecutionContext;

  beforeEach(() => {
    command = new HaltCommand();
    context = {
      me: document.createElement('div'),
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      variables: new Map(),
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict',
      evaluationHistory: []
    };
  });

  it('should have correct metadata', () => {
    expect(command.name).toBe('halt');
    expect(command.description).toBeDefined();
    expect(command.syntax).toBeDefined();
  });

  it('should implement CommandImplementation interface', () => {
    expect(command.execute).toBeDefined();
    expect(typeof command.execute).toBe('function');
    // Enhanced commands have execute.length === 2
    expect(command.execute.length).toBe(2);
  });

  it('should accept typed input and context', async () => {
    const input: HaltCommandInput = {};

    await expect(command.execute(input, context)).rejects.toThrow('Execution halted');
  });

  it('should have proper TypeScript types (compile-time check)', () => {
    // This test verifies TypeScript compilation
    const cmd: CommandImplementation<HaltCommandInput, HaltCommandOutput> = command;
    expect(cmd).toBe(command);
  });
});
```

### Integration Tests

Test the command in the runtime context:

```typescript
describe('HaltCommand Integration', () => {
  it('should be registered in enhanced registry', () => {
    const runtime = new Runtime();
    const registry = runtime.getEnhancedRegistry();

    expect(registry.has('halt')).toBe(true);
  });

  it('should execute via runtime', async () => {
    const runtime = new Runtime();
    const context = createTestContext();
    const ast = { type: 'command', name: 'halt', args: [] };

    await expect(runtime.execute(ast, context)).rejects.toThrow('Execution halted');
  });
});
```

### Type Checking

Always verify TypeScript compilation:

```bash
# Must pass with ZERO errors
npm run typecheck --prefix packages/core

# Check for specific command file
npx tsc --noEmit packages/core/src/commands/control-flow/halt.ts
```

---

## Troubleshooting

### Issue: TypeScript Errors After Migration

**Symptom**: `npm run typecheck` shows errors

**Common Causes**:
1. Input/output interfaces don't match implementation
2. Missing type annotations on variables
3. Incorrect context type (ExecutionContext vs TypedExecutionContext)

**Solution**:
```typescript
// ❌ BAD
const value = input.someProperty; // If someProperty doesn't exist on interface

// ✅ GOOD
// Add to interface first:
interface MyCommandInput {
  someProperty: string;
}
// Then use it:
const value: string = input.someProperty;
```

### Issue: Tests Failing After Migration

**Symptom**: Tests that passed before now fail

**Common Causes**:
1. Test is passing wrong argument structure (array vs object)
2. Test is using old ExecutionContext instead of TypedExecutionContext
3. Expected return type changed

**Solution**:
```typescript
// ❌ BAD (legacy test)
await command.execute(context, 'arg1', 'arg2');

// ✅ GOOD (enhanced test)
await command.execute({ param1: 'arg1', param2: 'arg2' }, context);
```

### Issue: Duplicate Registration Warning

**Symptom**: Console shows "DUPLICATE REGISTRATION" warning

**Cause**: Command is registered in both legacy and enhanced registries

**Solution**:
1. Find the legacy registration in `runtime.ts`
2. Remove the `registerLegacyCommand()` line
3. Verify enhanced registration exists in `command-registry.ts`

### Issue: Command Not Found at Runtime

**Symptom**: "Unknown command: commandName" error

**Common Causes**:
1. Forgot to add factory to ENHANCED_COMMAND_FACTORIES
2. Command name mismatch between class and factory
3. Import missing in command-registry.ts

**Solution**:
```typescript
// In command-registry.ts
import { MyCommand } from '../commands/category/my-command';

ENHANCED_COMMAND_FACTORIES.set('my-command', () => new MyCommand());
```

### Issue: Complex Command Migration Taking Too Long

**Symptom**: Migration is taking multiple hours

**Solution**: Break it down into smaller steps:
1. Day 1: Create interfaces only, commit
2. Day 2: Update execute signature, commit
3. Day 3: Refactor implementation, commit
4. Day 4: Update tests, commit
5. Day 5: Final validation and documentation, commit

---

## Migration Tracking

### Commands Migrated (✅ Complete)
- (None yet - this is the start of Phase 1)

### Commands In Progress (🔄 In Progress)
- (None yet)

### Commands Pending (⏳ Pending)

**Phase 2 - Simple Control Flow** (3 commands)
- HaltCommand
- BreakCommand
- ContinueCommand

**Phase 3 - Data & Utility** (2 commands)
- PickCommand
- DefaultCommand

**Phase 4 - Return & Throw** (2 commands)
- ReturnCommand
- ThrowCommand

**Phase 5 - Conditional** (2 commands)
- UnlessCommand
- IfCommand

**Phase 6 - Advanced Execution** (4 commands)
- AsyncCommand
- CallCommand
- JSCommand
- TellCommand

**Phase 7 - Animation** (4 commands)
- MeasureCommand
- SettleCommand
- TransitionCommand
- TakeCommand (most complex!)

**Phase 8 - Creation & Content** (2 commands)
- MakeCommand
- AppendCommand

**Total**: 19 commands to migrate

---

## Success Metrics

Track these metrics for each migration:

- **Time to Migrate**: Target 1-2 hours per command (simple), 2-4 hours (complex)
- **Test Pass Rate**: Must be 100% before and after migration
- **TypeScript Errors**: Must be 0 before and after migration
- **Lines of Code Changed**: Track for effort estimation
- **Type Safety Improvements**: Count of `any`/`unknown` types removed

---

## Notes and Lessons Learned

### Session 1 Lessons:
- (To be filled in as we complete migrations)

### Best Practices:
- Always run typecheck after each command migration
- Commit after each successful migration (don't batch)
- Use git mv when renaming files to preserve history
- Write comprehensive commit messages
- Update this guide with new patterns discovered

---

## References

- [ARCHITECTURE_NOTE_LEGACY_ENHANCED.md](ARCHITECTURE_NOTE_LEGACY_ENHANCED.md) - Architectural analysis
- [CONSOLIDATION_COMPLETE.md](CONSOLIDATION_COMPLETE.md) - Naming consolidation (Sessions 1-10)
- [packages/core/src/types/command-types.ts](packages/core/src/types/command-types.ts) - TypeScript type definitions
- [packages/core/src/runtime/command-adapter.ts](packages/core/src/runtime/command-adapter.ts) - Enhanced command adapter
- [packages/core/src/commands/command-registry.ts](packages/core/src/commands/command-registry.ts) - Command factory registry

---

**Last Updated**: 2025-10-29
**Version**: 1.0
**Status**: Active - Ready for use in Phase 2+
