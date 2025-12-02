# HyperFixi Bundle Size Assessment & Optimization Plan

**Date**: December 2025
**Current Size**: 361 KB minified / 80 KB gzipped
**Target Size**: 150 KB minified / 40 KB gzipped (50% reduction)

---

## Executive Summary

HyperFixi's bundle size (80 KB gzipped) is **4-5x larger** than comparable libraries:

| Library | Gzipped | Purpose |
|---------|---------|---------|
| _hyperscript (official) | ~18 KB | Hyperscript implementation |
| Alpine.js | 15 KB | Reactive framework |
| htmx | 14 KB | HTML extensions |
| **HyperFixi (current)** | **80 KB** | Hyperscript implementation |
| **HyperFixi (target)** | **40 KB** | Same features, optimized |

To be competitive, HyperFixi needs significant architectural changes focused on:
1. Modular expression system (currently largest contributor)
2. On-demand command loading
3. Parser optimization
4. Dead code elimination

---

## Current Bundle Composition (Estimated)

| Component | Est. Size | % of Bundle | Notes |
|-----------|-----------|-------------|-------|
| **Parser** (parser.ts + expression-parser.ts) | ~85 KB | 24% | Required, hard to reduce |
| **Expression System** (6 categories) | ~90 KB | 25% | Largest opportunity |
| **43 Commands** | ~55 KB | 15% | All registered at startup |
| **Runtime + Evaluator** | ~40 KB | 11% | Core execution engine |
| **Features** (sockets, webworker, etc.) | ~50 KB | 14% | Advanced features |
| **Utilities + Types** | ~40 KB | 11% | Infrastructure |

---

## Phase 1: Quick Wins (Target: -30 KB, 330 KB)

### 1.1 Remove Unused Expression Implementations

**Problem**: The expression registry imports ALL expression implementations even though many are redundant with inlined operators.

**Files**:
- `src/expressions/logical/index.ts` - exports lessThan, greaterThan, etc.
- `src/expressions/special/index.ts` - exports arithmetic operations
- `src/core/expression-evaluator.ts` - registers all expressions

**Action**: Remove expression implementations that are now inlined:
- `lessThan`, `greaterThan`, `lessThanOrEqual`, `greaterThanOrEqual`
- `equals`, `strictEquals`, `notEquals`, `strictNotEquals`
- `subtract`, `multiply`, `divide`, `modulo`
- `and`, `or`

**Estimated savings**: 15-20 KB

### 1.2 Remove Debug Infrastructure from Production

**Problem**: Debug utilities add overhead even when stripped by Terser.

**Files**:
- `src/utils/debug.ts`
- All files importing `debug`

**Action**: Use build-time replacement to eliminate debug imports entirely in production builds.

**Estimated savings**: 5-10 KB

### 1.3 Tree-Shake Expression Categories

**Problem**: All 6 expression categories are imported wholesale.

**Action**: Only import expression implementations actually used by the evaluator.

**Estimated savings**: 10-15 KB

---

## Phase 2: Modular Architecture (Target: -80 KB, 250 KB)

### 2.1 Lazy Command Registration

**Problem**: All 43 commands are imported and registered at startup.

**Current**:
```typescript
// runtime.ts imports all 43 commands
import { createHideCommand } from '../commands/dom/hide';
// ... 42 more imports
registry.register(createHideCommand());
// ... 42 more registrations
```

**Solution**: Command-on-demand loading with a registry that lazy-imports.

```typescript
// New approach: lightweight command manifest
const COMMAND_MANIFEST = {
  hide: () => import('../commands/dom/hide'),
  show: () => import('../commands/dom/show'),
  // ...
};

class LazyCommandRegistry {
  async getCommand(name: string) {
    if (!this.loaded.has(name)) {
      const loader = COMMAND_MANIFEST[name];
      if (loader) {
        const module = await loader();
        this.loaded.set(name, module.create());
      }
    }
    return this.loaded.get(name);
  }
}
```

**Trade-off**: Adds async overhead to first command execution.

**Estimated savings**: 30-40 KB (commands not used won't be bundled)

### 2.2 Modular Expression Evaluator

**Problem**: ExpressionEvaluator imports all 6 expression categories (~90 KB).

**Solution**: Tiered expression loading based on actual usage.

**Tier 0 - Core (always loaded, ~20 KB)**:
- Basic operators (inlined, already done)
- `me`, `you`, `it` references
- CSS selectors

**Tier 1 - Common (loaded on demand, ~30 KB)**:
- `as` type conversion
- `matches`, `contains`
- Property access

**Tier 2 - Advanced (loaded on demand, ~40 KB)**:
- Positional expressions (`first`, `last`, `random`)
- Complex conversions
- Form processing

**Estimated savings**: 40-60 KB for basic use cases

### 2.3 Automatic On-Demand Feature Loading

**Problem**: Advanced features bundled even if unused.

**Files**:
- `src/features/sockets.ts` (1,439 lines) - WebSocket
- `src/features/webworker.ts` (1,289 lines) - Web Workers
- `src/features/eventsource.ts` (1,250 lines) - SSE

**Solution**: Dual bundle strategy with automatic loading

Users choose their preference - no configuration needed for either:

```html
<!-- Simple: Full bundle, no thinking required (80KB gzipped) -->
<script src="hyperfixi.js"></script>

<!-- Optimized: ES module with auto-loading (40KB + features on demand) -->
<script type="module" src="hyperfixi.mjs"></script>
```

**Implementation** (✅ COMPLETE):

1. **Feature Loader** (`src/compatibility/feature-loader.ts`)
   - Scans hyperscript code for feature keywords
   - Dynamically imports only required features
   - Parallel loading for optimal performance

2. **ES Module Entry** (`src/compatibility/browser-modular.ts`)
   - Auto-detects features during DOM processing
   - Loads features before execution
   - Same API as IIFE bundle

3. **Rollup Code Splitting** (`rollup.browser-modular.config.mjs`)
   - Core bundle: ~150KB minified (~40KB gzipped)
   - Feature chunks: ~20KB each (loaded on demand)

**Build command**: `npm run build:browser:modular`

**Feature detection patterns**:
- `socket` / `connect to ws:` → loads sockets.ts
- `eventsource` / `connect to sse:` → loads eventsource.ts
- `worker` / `start worker` → loads webworker.ts

**Actual Results** (Measured December 2025):

| Bundle | Size | Gzipped |
|--------|------|---------|
| Core (hyperfixi.mjs) | 367 KB | 81 KB |
| Sockets chunk | 30 KB | 8 KB |
| EventSource chunk | 20 KB | 6 KB |
| WebWorker chunk | 20 KB | 6 KB |

✅ **Code splitting verified**: WebSocket/SSE/Worker code IS in separate chunks
⚠️ **Finding**: Features are only ~70 KB total. The core itself is ~360 KB.

**Key Insight**: The biggest optimization opportunity is the core (parser, runtime,
expressions, commands), NOT the features. Feature splitting provides marginal savings
since they're already small relative to the core.

**Estimated savings**: 5-10 KB for typical applications (features already small)

---

## Phase 3: Parser Optimization (Target: -40 KB, 210 KB)

### 3.1 Streamline Parser

**Problem**: Parser is 3,408 lines with many specialized parsing functions.

**Analysis needed**:
- Which parsing functions are rarely used?
- Can some be lazy-loaded?
- Are there redundant code paths?

**Potential actions**:
- Extract advanced parsing (behaviors, workers) to add-ons
- Simplify error handling (verbose in production)
- Remove unused parser features

**Estimated savings**: 15-25 KB

### 3.2 Streamline Expression Parser

**Problem**: Expression parser is 2,531 lines.

**Potential actions**:
- Combine similar parsing patterns
- Remove debug logging code paths
- Simplify operator precedence handling

**Estimated savings**: 10-15 KB

---

## Phase 4: Code-Level Optimizations (Target: -20 KB, 190 KB)

### 4.1 Replace Verbose Patterns

**Examples**:
```typescript
// Before (verbose)
if (Array.isArray(value)) {
  return value.includes(item);
} else if (typeof value === 'string') {
  return value.includes(String(item));
} else if (value instanceof NodeList) {
  return Array.from(value).includes(item);
}

// After (compact)
const arr = Array.isArray(value) ? value :
            value instanceof NodeList ? Array.from(value) : null;
return arr?.includes(item) ?? value?.includes?.(String(item)) ?? false;
```

### 4.2 Use Terser More Aggressively

**Current config**:
```javascript
mangle: { properties: false }
```

**Consider**:
```javascript
mangle: {
  properties: {
    regex: /^_/  // Mangle private properties starting with _
  }
}
```

**Estimated savings**: 5-10 KB

---

## Recommended Implementation Order

### Immediate (1-2 days)
1. Remove unused expression implementations (Phase 1.1)
2. Tree-shake expression categories (Phase 1.3)
3. Fix minimal/standard bundle entry points

**Expected result**: 330 KB / 70 KB gzipped

### Short-term (1 week)
4. Implement lazy command registry (Phase 2.1)
5. Create tiered expression loading (Phase 2.2)

**Expected result**: 250 KB / 55 KB gzipped

### Medium-term (2-3 weeks)
6. Extract optional features to add-ons (Phase 2.3)
7. Parser optimization (Phase 3)

**Expected result**: 200 KB / 45 KB gzipped

### Long-term
8. Code-level optimizations (Phase 4)
9. Consider alternative parsing strategies

**Expected result**: 150-180 KB / 35-40 KB gzipped

---

## Success Metrics

| Metric | Current | Target | Competitive |
|--------|---------|--------|-------------|
| Full bundle (gzipped) | 80 KB | 40 KB | < 25 KB |
| Core bundle (gzipped) | N/A | 25 KB | < 20 KB |
| Time to Interactive | ~50ms | ~25ms | < 15ms |
| Parse time | ~10ms | ~5ms | < 3ms |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes | Medium | High | Comprehensive test suite |
| Performance regression | Low | Medium | Benchmark before/after |
| Async loading complexity | Medium | Medium | Careful API design |
| Increased maintenance | Medium | Low | Good documentation |

---

## Appendix: File Size Analysis

### Largest Source Files

```
3,408 lines - src/parser/parser.ts
2,531 lines - src/parser/expression-parser.ts
1,555 lines - src/features/def.ts
1,439 lines - src/features/sockets.ts
1,369 lines - src/features/behaviors.ts
1,365 lines - src/parser/tokenizer.ts
1,356 lines - src/expressions/special/index.ts
1,309 lines - src/core/expression-evaluator.ts
1,289 lines - src/features/webworker.ts
1,250 lines - src/features/eventsource.ts
```

### Command Distribution

- DOM Commands: 7 (hide, show, add, remove, toggle, put, make)
- Control Flow: 8 (if, repeat, break, continue, halt, return, exit, unless)
- Data Commands: 7 (set, get, increment, decrement, bind, default, persist)
- Async Commands: 2 (wait, fetch)
- Event Commands: 2 (trigger, send)
- Animation: 4 (transition, measure, settle, take)
- Advanced: 5 (js, async, call, append, render)
- Utility: 6 (log, tell, copy, pick, beep, install)
- Control: 2 (throw, pseudo-command)

**Core commands** (likely used by 90% of users): hide, show, add, remove, toggle, set, if, wait, log
**Advanced commands** (used by 10% of users): Everything else
