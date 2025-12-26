# htmx-like Code Audit Plan

## Executive Summary

This document provides a comprehensive audit plan for the htmx-like feature additions to HyperFixi. The audit examines pattern consistency, DRY principles, type safety, and alignment with established codebase conventions.

## Files Added for htmx-like Features

### Commands (Builder Pattern)
| File | Lines | Pattern |
|------|-------|---------|
| `commands/dom/swap.ts` | 662 | **New** Builder Pattern |
| `commands/navigation/push-url.ts` | 184 | **New** Builder Pattern |
| `commands/navigation/replace-url.ts` | 182 | **New** Builder Pattern |

### Behaviors (Pre-built)
| File | Lines | Pattern |
|------|-------|---------|
| `behaviors/history-swap.ts` | 332 | Behavior Object + Factory |
| `behaviors/boosted.ts` | 506 | Behavior Object + Factory |
| `behaviors/index.ts` | 57 | Re-export barrel |

### Library Utilities
| File | Lines | Pattern |
|------|-------|---------|
| `lib/morph-adapter.ts` | 268 | Pluggable Adapter Pattern |
| `lib/view-transitions.ts` | 343 | Module + Queue Pattern |

**Total New Code**: ~2,534 lines across 8 files

---

## Audit Checklist

### 1. Command Pattern Consistency

#### Issue: Two Command Patterns Exist

**Existing Pattern (43 commands)**: Class-based with `CommandImplementation` interface
```typescript
// Example: commands/navigation/go.ts
class GoCommand implements CommandImplementation<GoInput, void, TypedExecutionContext> {
  static readonly metadata = { category: 'navigation', ... };
  async parseInput(raw, evaluator, ctx) { ... }
  async execute(input, context) { ... }
}
export function createGoCommand() { return new GoCommand(); }
```

**New Pattern (3 commands)**: Builder Pattern with `defineCommand()`
```typescript
// Example: commands/dom/swap.ts
export const swapCommand = defineCommand('swap')
  .category('dom')
  .description('...')
  .syntax([...])
  .parseInput<SwapCommandInput>(async (raw, evaluator, ctx) => { ... })
  .execute(async (input, context) => { ... })
  .build();

export function createSwapCommand() { return swapCommand; }
```

#### Audit Questions
- [ ] Is the Builder Pattern intended to replace the class-based pattern?
- [ ] Should existing 43 commands be migrated to Builder Pattern?
- [ ] Is the factory function `createXxxCommand()` still required for Builder Pattern?
- [ ] Does `command-builder.ts` integrate properly with `CommandRegistryV2`?

#### Recommendations
1. **Document the pattern decision** - Add explanation to ARCHITECTURE.md about when to use each pattern
2. **Consider migration path** - If Builder is preferred, create migration plan for existing commands
3. **Ensure registry compatibility** - Verify both patterns work with the same registry

---

### 2. Shared Helper Utilization

#### Available Helpers (commands/helpers/index.ts)
```typescript
export { getVariableValue, setVariableValue } from './variable-access';
export { resolveElement, resolveElements, ... } from './element-resolution';
export { parseDuration, formatDuration } from './duration-parsing';
export { parseClasses } from './class-manipulation';
```

#### Audit: Helper Usage in htmx-like Commands

| File | Uses Helpers? | Duplicated Functionality? |
|------|---------------|--------------------------|
| `swap.ts` | ❌ No | ⚠️ Yes - `resolveTargets()` duplicates `resolveElements()` |
| `push-url.ts` | ❌ No | ✅ No duplication |
| `replace-url.ts` | ❌ No | ✅ No duplication |
| `history-swap.ts` | ❌ No | ⚠️ Yes - `resolveTarget()` duplicates `resolveElement()` |
| `boosted.ts` | ❌ No | ⚠️ Yes - `resolveTarget()` duplicates `resolveElement()` |

#### Duplication Analysis

**swap.ts:147-170** - `resolveTargets()`:
```typescript
async function resolveTargets(
  selector: string | null,
  context: ExecutionContext
): Promise<HTMLElement[]> {
  if (!selector || selector === 'me') {
    if (!context.me || !isHTMLElement(context.me)) { ... }
    return [context.me as HTMLElement];
  }
  const selected = document.querySelectorAll(selector);
  // ... filtering logic
}
```

**Compare to helpers/element-resolution.ts** - `resolveElements()`:
```typescript
export function resolveElements(
  value: unknown,
  context: ExecutionContext
): Element[] {
  // Similar but more comprehensive logic
}
```

#### Recommendations
1. **Refactor swap.ts** to use `resolveElements()` from helpers
2. **Refactor behaviors** to use `resolveElement()` from helpers
3. **Consider new helper** for common URL validation/transformation logic

---

### 3. Type Registry Integration

#### Current htmx-like Types

**swap.ts**:
- `SwapStrategy` - union type for swap strategies
- `SwapCommandInput` - input interface

**push-url.ts / replace-url.ts**:
- `PushUrlCommandInput` / `ReplaceUrlCommandInput` - input interfaces

**morph-adapter.ts**:
- `MorphOptions` - morphing configuration
- `MorphEngine` - pluggable engine interface

**view-transitions.ts**:
- `TransitionCallback` - callback type
- `ViewTransitionOptions` - options interface
- `ViewTransitionsConfig` - global configuration

#### Audit Questions
- [ ] Are these types exported from the main package entry point?
- [ ] Should `SwapStrategy` be in a shared types file?
- [ ] Are type exports documented for external consumers?

#### Recommendations
1. **Add exports to `types/index.ts`** for public consumption
2. **Consider consolidating** `SwapStrategy` to shared types if used elsewhere
3. **Document type exports** in package README

---

### 4. DRY Analysis: Duplicated Code Patterns

#### 4.1 executeSwap Function Duplication

**Location 1**: `swap.ts:188-293` - `executeSwapStrategy()`
**Location 2**: `history-swap.ts:80-129` - `executeSwap()`
**Location 3**: `boosted.ts:166-191` - `executeSwap()`

All three implement the same switch statement for swap strategies:
```typescript
switch (strategy) {
  case 'morph': morphAdapter.morphInner(...); break;
  case 'morphOuter': morphAdapter.morph(...); break;
  case 'innerHTML': target.innerHTML = ...; break;
  // ... etc
}
```

**Impact**: ~60 lines duplicated 3 times = 120 lines wasted

**Recommendation**: Extract to `lib/swap-executor.ts`:
```typescript
// lib/swap-executor.ts
export function executeSwap(
  target: HTMLElement,
  content: string | HTMLElement | null,
  strategy: SwapStrategy,
  morphOptions?: MorphOptions
): void { ... }
```

#### 4.2 View Transition Pattern Duplication

**Location 1**: `swap.ts:531-535`
```typescript
if (useViewTransition && isViewTransitionsSupported()) {
  await withViewTransition(performSwap);
} else {
  performSwap();
}
```

**Location 2**: `history-swap.ts:207-211`
```typescript
if (useViewTransition && 'startViewTransition' in document) {
  await (document as any).startViewTransition(performSwap).finished;
} else {
  performSwap();
}
```

**Location 3**: `boosted.ts:283-287` - Same pattern

**Issue**: Inconsistent implementations - swap.ts uses the proper `withViewTransition()` helper while others don't

**Recommendation**:
1. All files should use `withViewTransition()` from `lib/view-transitions.ts`
2. Remove direct `startViewTransition` calls

#### 4.3 URL Validation Duplication

**push-url.ts:136-143** and **replace-url.ts:136-143**:
```typescript
if (!url || typeof url !== 'string') {
  throw new Error(`push url command: URL must be a string...`);
}
if (url === 'undefined') {
  throw new Error(`push url command: URL evaluated to string 'undefined'...`);
}
```

**Recommendation**: Extract to `helpers/url-validation.ts`:
```typescript
export function validateUrl(url: unknown, commandName: string): string {
  if (!url || typeof url !== 'string') throw new Error(...);
  if (url === 'undefined') throw new Error(...);
  return url;
}
```

---

### 5. Behavior Pattern Consistency

#### Existing Behavior Pattern
Both `history-swap.ts` and `boosted.ts` follow the same pattern:
```typescript
// Types
export interface XxxConfig { ... }
export interface XxxInstance { destroy: () => void; ... }

// Factory
export function createXxx(config: XxxConfig): XxxInstance { ... }

// Behavior Object
export const XxxBehavior = {
  name: 'Xxx',
  init(element, params): XxxInstance { ... },
  destroy(instance): void { ... },
};

// Registry Helper
export function registerXxx(registry): void { ... }

// Hyperscript Source (reference)
export const xxxHyperscript = `behavior Xxx...`;
```

**Assessment**: ✅ Consistent and well-structured

#### Recommendations
1. **Document behavior pattern** in a BEHAVIORS.md file
2. **Consider behavior base class** if more behaviors are added
3. **Add tests** for behavior registration

---

### 6. Error Handling Consistency

#### Current Patterns

**swap.ts**: Throws errors with descriptive messages
```typescript
throw new Error('swap command requires arguments');
throw new Error(`swap command: no elements found matching "${selector}"`);
```

**push-url.ts/replace-url.ts**: Includes debug info in errors
```typescript
throw new Error(`push url command: URL must be a string (got ${typeof url}: ${url}). Debug: ${debugInfo}`);
```

**behaviors**: Uses console.warn for recoverable issues
```typescript
console.warn(`HistorySwap: target "${target}" not found`);
```

#### Recommendations
1. **Standardize error format** - Consider: `[HyperFixi:command-name] Error message`
2. **Remove debug info from production** - Use a debug flag instead of always including
3. **Document error handling guidelines**

---

### 7. Console Logging Audit

#### Debug Logging Found

**swap.ts**: 12 console.log statements (DEBUG)
```typescript
console.log('[SWAP DEBUG] parseInput called with raw:', ...);
console.log('[SWAP DEBUG] args.length:', args.length);
// ... 10 more
```

**push-url.ts**: 1 console.log statement
```typescript
console.log('[PUSH-URL EXECUTE] About to pushState with url:', url);
```

**replace-url.ts**: 0 console.log statements ✅

**behaviors**: Uses console.warn for warnings appropriately ✅

#### Recommendations
1. **Remove debug console.log** before production
2. **Add debug flag** or use consistent debug logging pattern:
   ```typescript
   const DEBUG = false;
   if (DEBUG) console.log('[SWAP]', ...);
   ```
3. **Consider** using a centralized logger

---

### 8. Test Coverage Analysis

#### Current Test Status
- htmx-like examples test: **19 passed, 3 failed**
- Failures are in boosted links form submission

#### Missing Tests
- [ ] Unit tests for `morph-adapter.ts`
- [ ] Unit tests for `view-transitions.ts`
- [ ] Unit tests for individual swap strategies
- [ ] Behavior registration tests
- [ ] Error handling tests

#### Recommendations
1. **Add Vitest unit tests** for lib utilities
2. **Add Playwright tests** for each swap strategy
3. **Add behavior integration tests**
4. **Fix remaining 3 test failures**

---

## Priority Action Items

### High Priority (Technical Debt)

1. **Extract duplicated swap execution** to `lib/swap-executor.ts`
2. **Use shared helpers** for element resolution in swap.ts and behaviors
3. **Remove debug console.log** statements from swap.ts
4. **Fix inconsistent View Transitions usage** - all should use `withViewTransition()`

### Medium Priority (Pattern Alignment)

5. **Document command pattern decision** (Builder vs Class-based)
6. **Add type exports** to main package entry
7. **Standardize error message format**
8. **Add URL validation helper**

### Lower Priority (Polish)

9. **Add missing unit tests**
10. **Create BEHAVIORS.md documentation**
11. **Add debug logging flag**
12. **Fix remaining 3 test failures**

---

## Metrics Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Total new lines | ~2,534 | Moderate addition |
| Duplicated lines | ~200 | ⚠️ Needs refactoring |
| Console.log statements | 13 | ⚠️ Remove before prod |
| Pattern consistency | 2 patterns | ⚠️ Needs documentation |
| Helper utilization | 0% | ❌ Not using shared helpers |
| Test coverage | ~86% | ⚠️ 3 failing tests |
| Type exports | Incomplete | ⚠️ Needs updates |

---

---

## 9. Demo & Documentation Issues (Dec 2024)

### Discovery: Inline Hyperscript Limitations for Complex HTML Strings

While building the morph comparison demo (`examples/htmx-like/02-morph-comparison.html`), several DX issues were discovered when using inline hyperscript for innerHTML operations.

#### Problems Found

**1. Complex Quote Escaping in Hyperscript Strings**

When constructing HTML strings inside hyperscript `_=` attributes, escaped quotes become problematic:

```html
<!-- This is error-prone and hard to maintain -->
<button _="on click
  set html to '<div id=innerHTML-box class=drag-box style=\"left: 20px; top: 20px;\" _=\"install Draggable\">Drag me!</div>'
  swap innerHTML of #container with html">
  Update
</button>
```

Issues:
- Escaped double quotes `\"` inside single-quoted hyperscript strings
- Nested `_=` attributes require multiple levels of escaping
- Multi-line HTML strings are unreadable in single-line `_=` attributes
- Difficult to debug when parsing fails

**2. New Elements Need Manual Re-processing**

After `swap innerHTML`, new elements with `_="..."` attributes don't automatically get processed by hyperfixi. Behaviors like `install Draggable` won't work unless `hyperfixi.processNode()` is called:

```javascript
// Required after innerHTML swap to re-initialize behaviors
container.innerHTML = newHtml;
if (window.hyperfixi && window.hyperfixi.processNode) {
  window.hyperfixi.processNode(container);
}
```

#### Solution Applied in Demo

Moved innerHTML button handlers from inline hyperscript to JavaScript:

```html
<!-- Before: Problematic inline hyperscript -->
<button _="on click
  set html to '<div _=\"install Draggable\"...'
  swap innerHTML of #container with html">

<!-- After: Clean JavaScript handler -->
<button id="innerHTML-btn">Update with innerHTML</button>

<script>
document.getElementById('innerHTML-btn').addEventListener('click', function() {
  container.innerHTML = `
    <div id="box" class="drag-box"
         style="left: 20px; top: 20px;"
         _="install Draggable">
      Drag me!
    </div>
  `;
  // Re-process so Draggable behavior works
  if (window.hyperfixi && window.hyperfixi.processNode) {
    window.hyperfixi.processNode(container);
  }
});
</script>
```

Benefits:
- **Cleaner template literals** - No quote escaping issues
- **Proper behavior re-initialization** - Calls `hyperfixi.processNode()` after swap
- **Better maintainability** - Multi-line HTML is readable and editable

#### Recommendations for Library Improvements

**High Priority:**

1. **Auto-process new elements** - Consider adding a MutationObserver to automatically process elements with `_=` attributes when they appear in the DOM. This is how htmx handles `hx-*` attributes on dynamically added elements.

   ```typescript
   // Potential implementation
   const observer = new MutationObserver((mutations) => {
     for (const mutation of mutations) {
       for (const node of mutation.addedNodes) {
         if (node instanceof Element) {
           hyperfixi.processNode(node);
         }
       }
     }
   });
   observer.observe(document.body, { childList: true, subtree: true });
   ```

2. **Document `processNode()` API** - Ensure `hyperfixi.processNode()` is documented and exported for cases where manual re-processing is needed.

**Medium Priority:**

3. **Multi-line hyperscript support** - Consider supporting `<script type="text/hyperscript">` blocks for complex logic that doesn't fit in attributes:

   ```html
   <button id="my-btn">Click</button>
   <script type="text/hyperscript" for="#my-btn">
     on click
       set html to '<div _="install Draggable">...'
       swap innerHTML of #container with html
   </script>
   ```

4. **Template literal syntax** - Consider supporting backtick template literals in hyperscript for multi-line strings:

   ```hyperscript
   -- Hypothetical syntax
   on click
     set html to `
       <div class="drag-box" _="install Draggable">
         Drag me!
       </div>
     `
     swap innerHTML of #container with html
   ```

**Lower Priority:**

5. **Helper for dynamic HTML with behaviors** - Add a built-in helper that combines innerHTML swap with processNode:

   ```hyperscript
   -- Hypothetical command
   swap innerHTML of #container with html then process #container
   ```

#### Affected Files

| File | Issue |
|------|-------|
| `examples/htmx-like/02-morph-comparison.html` | Used JavaScript handlers as workaround |
| `packages/core/src/runtime/` | Potential location for MutationObserver |
| `packages/core/docs/API.md` | Should document `processNode()` |

---

## Conclusion

The htmx-like code additions are well-structured and functional, but there are opportunities to improve:

1. **DRY violations** - ~200 lines of duplicated swap/transition logic
2. **Pattern inconsistency** - Builder Pattern is new and undocumented
3. **Helper underutilization** - New code doesn't leverage existing helpers
4. **Debug artifacts** - Console.log statements should be removed
5. **Dynamic element processing** - Need auto-processing or documented manual API

**Estimated refactoring effort**: 4-6 hours to address high-priority items
