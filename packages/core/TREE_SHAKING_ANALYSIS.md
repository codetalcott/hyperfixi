# Tree-Shaking Analysis - Bundle Size Investigation

**Date**: 2025-01-20
**Status**: ⚠️ **Tree-shaking not working as expected**

## Issue Summary

The minimal and standard preset bundles are **not achieving expected size reductions** despite having lazy loading and command selection logic.

### Actual vs Expected Sizes

| Bundle Type | Actual (uncompressed) | Actual (gzipped) | Expected (gzipped) | Difference |
|-------------|----------------------|------------------|-------------------|------------|
| **Full** | 511 KB | 112 KB | ~130 KB | ✅ Close |
| **Standard** | 447 KB | 100 KB | ~70 KB | ❌ **+43%** |
| **Minimal** | 447 KB | 100 KB | ~60 KB | ❌ **+67%** |

**Key Finding**: Minimal and standard bundles are nearly identical (447KB vs 447KB) and only ~12% smaller than full bundle.

---

## Root Cause Analysis

### Problem: Static Imports Defeat Tree-Shaking

**File**: `packages/core/src/runtime/runtime.ts`
**Lines**: 17-68

The Runtime class imports **all command factories at the module level**:

```typescript
// These imports happen regardless of lazyLoad or commands options!
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createToggleCommand } from '../commands/dom/toggle';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createSendCommand } from '../commands/events/send';
import { createTriggerCommand } from '../commands/events/trigger';
import { createFetchCommand } from '../commands/async/fetch';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createLogCommand } from '../commands/utility/log';
// ... and many more
```

### Why This Prevents Tree-Shaking

1. **browser-bundle-minimal.ts** imports `Runtime` class:
   ```typescript
   import { Runtime } from '../runtime/runtime';
   ```

2. **Runtime.ts imports ALL commands** at module level (static imports)

3. **Rollup includes all transitive imports** in the bundle

4. **Result**: Even though minimal bundle only uses 8 commands at runtime, all ~40 commands are bundled

### Lazy Loading ≠ Tree-Shaking

```typescript
// This ONLY affects runtime behavior, NOT bundle size:
const runtime = new Runtime({
  lazyLoad: true,                    // Runtime behavior
  commands: MINIMAL_COMMANDS,         // Runtime behavior
  expressionPreload: 'core',          // Runtime behavior
});
```

**Lazy loading** controls when commands are *registered* at runtime.
**Tree-shaking** controls what code is *included* in the bundle.

The current architecture conflates these two concepts.

---

## Verification

### Command Imports in runtime.ts

```bash
$ grep "import.*Command.*from" src/runtime/runtime.ts | wc -l
20+
```

**20+ command imports** at module level, all included in every bundle.

### Bundle Analysis

All three bundles include:
- ✅ All DOM commands (hide, show, toggle, add, remove, put)
- ✅ All event commands (send, trigger)
- ✅ All async commands (fetch, wait)
- ✅ All control flow commands (if, repeat, halt, return)
- ✅ All data commands (set, increment, decrement)
- ✅ All utility commands (log, pick, copy)
- ✅ All animation commands (measure, settle, transition, take)
- ✅ Navigation, advanced, and template commands

**Proof**: The minimal and standard bundles are nearly identical in size (447KB each).

---

## Solutions

### Solution 1: Separate Runtime Classes (Recommended)

Create dedicated runtime classes that only import needed commands:

```typescript
// src/runtime/minimal-runtime.ts
import { Runtime } from './runtime-base'; // Core runtime WITHOUT command imports
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIfCommand } from '../commands/control-flow/if';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';

export function createMinimalRuntime() {
  const runtime = new Runtime({ lazyLoad: false });
  runtime.register(createAddCommand());
  runtime.register(createRemoveCommand());
  runtime.register(createToggleCommand());
  runtime.register(createPutCommand());
  runtime.register(createSetCommand());
  runtime.register(createIfCommand());
  runtime.register(createSendCommand());
  runtime.register(createLogCommand());
  return runtime;
}
```

**Pros**:
- ✅ True tree-shaking (only imports what's needed)
- ✅ Clean separation of concerns
- ✅ Can achieve 60-70% size reduction

**Cons**:
- ⚠️ Requires refactoring Runtime class to separate base from commands
- ⚠️ More runtime classes to maintain

### Solution 2: Dynamic Imports (Lazy Loading)

Use dynamic imports for true lazy loading:

```typescript
// In EnhancedCommandRegistry
async loadCommand(name: string) {
  switch(name) {
    case 'hide':
      const { createHideCommand } = await import('../commands/dom/hide');
      return createHideCommand();
    case 'show':
      const { createShowCommand } = await import('../commands/dom/show');
      return createShowCommand();
    // ... etc
  }
}
```

**Pros**:
- ✅ True code-splitting (commands loaded on-demand)
- ✅ Smallest initial bundle size
- ✅ Works with existing architecture

**Cons**:
- ⚠️ Async loading adds complexity
- ⚠️ First use of command has loading delay
- ⚠️ Requires network requests for chunks

### Solution 3: Factory Functions (Per Guide)

Create factory functions that build runtimes without importing Runtime class:

```typescript
// src/presets/dom-only.ts
import { Parser } from '../parser/parser';
import { CommandRegistry } from '../commands/command-registry';
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
// ... only needed commands

export function createDOMOnlyRuntime() {
  const registry = new CommandRegistry();
  registry.register(createHideCommand());
  registry.register(createShowCommand());
  // ...
  return { parser, registry, execute: ... };
}
```

**Pros**:
- ✅ True tree-shaking
- ✅ No refactoring of Runtime class
- ✅ Each preset is self-contained

**Cons**:
- ⚠️ Duplicates runtime logic across presets
- ⚠️ Harder to maintain consistency

---

## Recommendation

**Implement Solution 1**: Create separate runtime classes with base extraction.

### Implementation Plan

1. **Extract RuntimeBase** - Core runtime without command imports
2. **Create MinimalRuntime** - Only imports 8 commands
3. **Create StandardRuntime** - Only imports 20 commands
4. **Update browser bundles** - Use specific runtime classes
5. **Verify bundle sizes** - Should achieve 60-70% reduction

### Expected Results After Fix

| Bundle | Commands | Size (gzipped) | Reduction |
|--------|----------|----------------|-----------|
| Minimal | 8 | ~60 KB | 47% smaller |
| Standard | 20 | ~80 KB | 29% smaller |
| Full | 40+ | ~112 KB | baseline |

---

## Current State (Before Fix)

- ⚠️ Minimal/standard bundles exist but don't provide size benefits
- ⚠️ Lazy loading is runtime behavior, not bundle optimization
- ⚠️ Tree-shaking guide overpromises on size reductions
- ⚠️ All bundles include all commands due to static imports

## Next Steps

1. ✅ Document root cause (this file)
2. ⏳ Update Tree-Shaking Guide with realistic expectations
3. ⏳ Implement Solution 1 (separate runtime classes)
4. ⏳ Verify bundle sizes after fix
5. ⏳ Update documentation with actual measurements
