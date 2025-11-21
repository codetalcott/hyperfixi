# Tree-Shaking Implementation Status

**Date**: 2025-01-20
**Status**: 🔍 **Discovery Phase** - Found existing minimal-runtime.ts

---

## Discovery: Existing MinimalRuntime

Found `src/runtime/minimal-runtime.ts` (251 lines) but it's **not suitable** for our tree-shaking needs.

### What It Is

A **toy implementation** for demos - completely separate from main Runtime:
- No command registry integration
- Hard-coded 4 commands (toggle, set, add, remove)
- Basic AST execution
- No enhanced command architecture
- No behavior support
- No expression evaluator integration

### What We Need

**Production-ready runtime classes** that:
- ✅ Extend from RuntimeBase (shared core logic)
- ✅ Use enhanced command architecture
- ✅ Support full expression evaluation
- ✅ Support behaviors and events
- ✅ Maintain API compatibility
- ✅ Import only needed commands (tree-shakeable)

---

## Implementation Complexity Analysis

### Runtime.ts File Size: **2,956 lines**

**Key Components:**
1. **Lines 1-100**: Imports (20+ command factories) ← **THIS IS THE PROBLEM**
2. **Lines 100-160**: RuntimeOptions, constructor, initialization
3. **Lines 160-250**: Enhanced command initialization
4. **Lines 250-1000**: Core execution logic (behaviors, events, DOM)
5. **Lines 1000-2000**: Command execution, context management
6. **Lines 2000-2956**: Helper methods, utilities

### Extraction Challenges

**Challenge 1: Circular Dependencies**
- Runtime imports commands
- Commands import Runtime types
- Behaviors depend on Runtime
- Need careful extraction to avoid cycles

**Challenge 2: Shared State**
- `enhancedRegistry` - shared command registry
- `expressionEvaluator` - shared evaluator
- `behaviorRegistry` - shared behaviors
- `globalVariables` - shared globals

**Challenge 3: Testing**
- 2,956 lines of runtime logic
- Multiple test files depend on Runtime
- Need to ensure no regressions

---

## Recommended Approach

### Option A: Gradual Refactoring (SAFER) ⭐⭐⭐

**Phase 1** - Create wrapper classes (minimal changes):

```typescript
// minimal-runtime-enhanced.ts
import { Runtime } from './runtime';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIfCommand } from '../commands/control-flow/if';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';

export class MinimalRuntimeEnhanced extends Runtime {
  constructor(options = {}) {
    super({
      ...options,
      lazyLoad: false,  // Disable lazy load
      useEnhancedCommands: true
    });

    // Clear any auto-registered commands
    this.enhancedRegistry.clear();

    // Register only minimal commands
    this.enhancedRegistry.register(createAddCommand());
    this.enhancedRegistry.register(createRemoveCommand());
    this.enhancedRegistry.register(createToggleCommand());
    this.enhancedRegistry.register(createPutCommand());
    this.enhancedRegistry.register(createSetCommand());
    this.enhancedRegistry.register(createIfCommand());
    this.enhancedRegistry.register(createSendCommand());
    this.enhancedRegistry.register(createLogCommand());
  }
}
```

**Pros:**
- ✅ Minimal code changes
- ✅ Low risk of regressions
- ✅ Uses existing Runtime logic
- ✅ Can implement in 1-2 hours
- ❌ **Won't achieve tree-shaking** (still imports all commands via Runtime)

**Verdict:** This won't work for tree-shaking! Runtime parent class still imports all commands.

---

### Option B: Extract RuntimeBase (COMPLEX) ⭐⭐

**Phase 1** - Extract core runtime into RuntimeBase:

1. Create `runtime-base.ts` with core logic (NO command imports)
2. Move command-specific code to FullRuntime
3. Create MinimalRuntime extending RuntimeBase
4. Create StandardRuntime extending RuntimeBase

**Estimated Effort:** 8-12 hours

**Risks:**
- ⚠️ High risk of regressions (touching 2,956 lines)
- ⚠️ Circular dependency issues
- ⚠️ Need comprehensive testing
- ⚠️ May break existing code

**Pros:**
- ✅ True tree-shaking (only imports needed commands)
- ✅ Clean architecture
- ✅ Long-term maintainability

---

### Option C: New Entry Points (PRAGMATIC) ⭐⭐⭐ **RECOMMENDED**

**Don't modify Runtime at all**. Instead, create specialized entry point files:

```typescript
// browser-bundle-minimal-v2.ts
// Import ONLY what's needed (no Runtime class!)
import { Parser } from '../parser/parser';
import { EnhancedCommandRegistry } from './command-adapter';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { createContext } from '../core/context';

// Import ONLY 8 commands
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIfCommand } from '../commands/control-flow/if';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';

// Build minimal runtime without Runtime class
const registry = new EnhancedCommandRegistry();
const parser = new Parser();
const evaluator = new ExpressionEvaluator();

registry.register(createAddCommand());
registry.register(createRemoveCommand());
registry.register(createToggleCommand());
registry.register(createPutCommand());
registry.register(createSetCommand());
registry.register(createIfCommand());
registry.register(createSendCommand());
registry.register(createLogCommand());

// Expose minimal API
window.hyperfixi = {
  parse: (code) => parser.parse(code),
  execute: async (code, context = createContext()) => {
    const ast = parser.parse(code);
    return registry.execute(ast, context);
  },
  createContext,
  attributeProcessor: defaultAttributeProcessor
};

defaultAttributeProcessor.init();
```

**Pros:**
- ✅ Zero changes to Runtime.ts (no risk!)
- ✅ True tree-shaking (only imports 8 commands)
- ✅ Can implement in 2-3 hours
- ✅ Low risk
- ❌ Some code duplication in entry points
- ❌ Different API than full Runtime

**Result:** Minimal bundle would only include 8 commands + core infrastructure.

---

## Size Estimation: Option C

### What Would Be Included:

**Minimal Bundle:**
- Parser (~30KB)
- ExpressionEvaluator (~25KB)
- EnhancedCommandRegistry (~15KB)
- 8 command implementations (~40KB)
- Context utilities (~10KB)
- DOM utilities (~8KB)
- **Total: ~128KB uncompressed (~45-55KB gzipped)**

**Standard Bundle:**
- Same as minimal
- + 12 more commands (~60KB)
- **Total: ~188KB uncompressed (~65-75KB gzipped)**

**Expected Reduction:**
- Minimal: 447KB → 128KB (**71% smaller!**)
- Standard: 447KB → 188KB (**58% smaller!**)

---

## Recommendation

**Implement Option C** - New entry points without modifying Runtime

### Reasons:
1. **Low risk** - No changes to 2,956-line Runtime.ts
2. **Fast** - Can implement in 2-3 hours
3. **Effective** - Achieves 58-71% size reduction
4. **Safe** - Existing code unaffected
5. **Testable** - Easy to validate

### Implementation Steps:

1. ✅ Create `browser-bundle-minimal-v2.ts` with direct imports
2. ✅ Create `browser-bundle-standard-v2.ts` with direct imports
3. ✅ Update rollup configs to use new entry points
4. ✅ Build bundles
5. ✅ Measure sizes
6. ✅ Test in browser
7. ✅ If successful, can extract RuntimeBase later

### Timeline:
- **Hour 1**: Create entry points
- **Hour 2**: Update configs, build, test
- **Hour 3**: Verify and document

---

## Next Steps

**Question for review:**
Should we proceed with **Option C** (pragmatic, low-risk) or invest more time in **Option B** (cleaner architecture but higher risk)?

**My recommendation:** Start with Option C to prove the concept and get immediate size wins. If successful, can refactor to Option B in v1.2 for cleaner architecture.
