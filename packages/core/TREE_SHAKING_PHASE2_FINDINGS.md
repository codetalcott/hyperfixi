# Tree-Shaking Phase 2 - Root Cause Analysis

**Date**: 2025-01-20
**Status**: 🔍 **Root Cause Identified** - Chain of imports defeating tree-shaking

---

## Problem Summary

After implementing Option C (new entry points that bypass Runtime), bundles are **still** 448KB. Tree-shaking is NOT working.

**Actual Results**:
- Minimal: 458KB (100KB gz) - **Expected: 128KB (45-55KB gz)**
- Standard: 459KB (100KB gz) - **Expected: 188KB (65-75KB gz)**
- Reduction: **0%** - **Expected: 60-70%**

Debug bundle contains **45 command classes** instead of the expected 8.

---

## Root Cause: Import Chain

The tree-shaking failure is caused by a chain of imports:

### Import Chain
```
browser-bundle-minimal-v2.ts
└─> defaultAttributeProcessor (from dom/attribute-processor.ts)
    └─> hyperscript (from api/hyperscript-api.ts)
        └─> Runtime (from runtime/runtime.ts)
            └─> ALL COMMANDS (lines 17-68)
```

###Steps Taken
1. ✅ Created `browser-bundle-minimal-v2.ts` - bypasses Runtime
2. ✅ Created `browser-bundle-standard-v2.ts` - bypasses Runtime
3. ✅ Created `MinimalCommandRegistry` - tree-shakeable registry
4. ❌ **STILL FAILING** - `defaultAttributeProcessor` pulls in full Runtime via `hyperscript-api`

---

## File Analysis

### src/dom/attribute-processor.ts (line 6)
```typescript
import { hyperscript } from '../api/hyperscript-api';
```

### src/api/hyperscript-api.ts (line 8)
```typescript
import { Runtime, type RuntimeOptions } from '../runtime/runtime';
```

### src/runtime/runtime.ts (lines 17-68)
```typescript
// Static imports of ALL commands
import { AddCommand } from '../commands/dom/add';
import { RemoveCommand } from '../commands/dom/remove';
// ... 18 more commands
```

---

## Solution Options

### Option A: Remove defaultAttributeProcessor from bundles ⭐⭐⭐ **RECOMMENDED**

**Change**: Don't import `defaultAttributeProcessor` in v2 bundles

**Pros**:
- ✅ Immediate fix - breaks the import chain
- ✅ Tree-shaking will work perfectly
- ✅ Bundles will achieve 60-70% reduction
- ✅ Zero risk to other code

**Cons**:
- ❌ Users must manually initialize DOM scanning:
  ```javascript
  // Instead of automatic _="" scanning
  const runtime = hyperfixi.runtime;
  document.querySelectorAll('[_]').forEach(el => {
    const code = el.getAttribute('_');
    runtime.execute(code, { me: el });
  });
  ```

**Implementation**: 2-3 lines changed

---

### Option B: Create MinimalAttributeProcessor ⭐⭐

**Change**: Create tree-shakeable attribute processor

```typescript
// src/dom/minimal-attribute-processor.ts
export class MinimalAttributeProcessor {
  constructor(private runtime: MinimalRuntimeV2) {}

  init() {
    document.querySelectorAll('[_]').forEach(el => {
      const code = el.getAttribute('_');
      this.runtime.execute(code, createContext({ me: el }));
    });
  }
}
```

**Pros**:
- ✅ Maintains automatic DOM scanning
- ✅ Tree-shakeable (no hyperscript-api import)
- ✅ Users get same experience

**Cons**:
- ⚠️ Need to create new file
- ⚠️ Slightly different API

**Implementation**: ~50 lines of code

---

### Option C: Keep defaultAttributeProcessor (Status Quo) ⭐

**Change**: Accept that tree-shaking won't work

**Pros**:
- ✅ No code changes needed

**Cons**:
- ❌ Bundles remain 448KB (0% reduction)
- ❌ Defeats entire purpose of this work
- ❌ No benefit over current bundles

---

## Recommendation

**Implement Option B** - Create MinimalAttributeProcessor

### Reasons:
1. **Best user experience** - maintains automatic _="" scanning
2. **Achieves tree-shaking** - breaks import chain
3. **Clean architecture** - proper separation of concerns
4. **Low risk** - self-contained change

### Implementation Plan:
1. Create `src/dom/minimal-attribute-processor.ts` (50 lines)
2. Update `browser-bundle-minimal-v2.ts` to use it
3. Update `browser-bundle-standard-v2.ts` to use it
4. Build and verify bundle sizes
5. Test _="" attribute scanning

**Estimated time**: 30-45 minutes

---

## Expected Results After Fix

### Bundle Sizes (with MinimalAttributeProcessor)
- **Minimal**: 128KB uncompressed (45-55KB gz) - **71% reduction**
- **Standard**: 188KB uncompressed (65-75KB gz) - **58% reduction**

### What Will Be Included
- Parser (~30KB)
- ExpressionEvaluator (~25KB)
- MinimalCommandRegistry (~5KB)
- MinimalAttributeProcessor (~3KB)
- 8/19 commands (~40-100KB)
- Context utilities (~10KB)
- DOM utilities (~8KB)

---

## Next Steps

**Question**: Should we implement Option A (remove processor) or Option B (create minimal processor)?

My recommendation is **Option B** for best user experience while achieving tree-shaking goals.
