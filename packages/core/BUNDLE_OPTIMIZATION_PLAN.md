# Bundle Optimization Plan

**Goal**: Reduce HyperFixi bundle from 353 KB (80 KB gzipped) to match original _hyperscript at 101 KB (26 KB gzipped)

**Current State**:
- HyperFixi: 353 KB raw, 351 KB minified, 80 KB gzipped
- Original _hyperscript: 308 KB raw, 101 KB minified, 26 KB gzipped
- Gap: 3.5x larger (gzipped)

---

## Phase 1: Fix Terser Minification (Priority: Critical)

**Problem**: Minification reduces bundle by only 2 KB (353 KB → 351 KB), should be ~60% reduction.

**Root Cause Analysis**:
```bash
# Current rollup config likely missing terser or misconfigured
```

**Tasks**:
1. [ ] Audit `rollup.browser.config.mjs` for terser plugin configuration
2. [ ] Ensure terser is installed: `npm ls terser`
3. [ ] Add/fix terser config:
   ```js
   import terser from '@rollup/plugin-terser';

   export default {
     plugins: [
       // ... other plugins
       terser({
         compress: {
           drop_console: true,
           drop_debugger: true,
           pure_funcs: ['debug.log', 'debug.parse'],
         },
         mangle: {
           properties: false, // Don't mangle public API
         },
       }),
     ],
   };
   ```
4. [ ] Create separate `rollup.browser.prod.config.mjs` if needed
5. [ ] Verify minification works: target 120-150 KB minified

**Expected Savings**: 150-200 KB (minified output)

---

## Phase 2: Split Features into Optional Bundles

**Problem**: All features bundled together (sockets, workers, eventsource = 125 KB source)

**Current Structure**:
```
src/features/
├── sockets.ts        (45 KB) - WebSocket support
├── webworker.ts      (40 KB) - Web Worker support
├── eventsource.ts    (40 KB) - SSE support
├── behaviors.ts      (44 KB) - Behavior system
├── def.ts            (49 KB) - Function definitions
├── on.ts             (36 KB) - Event handlers
└── init.ts           (38 KB) - Initialization
```

**New Bundle Structure**:
```
dist/
├── hyperfixi-core.min.js      (~60 KB) - Parser, runtime, core commands
├── hyperfixi-full.min.js      (~100 KB) - Core + all features
├── hyperfixi-sockets.min.js   (~5 KB) - WebSocket feature (optional)
├── hyperfixi-workers.min.js   (~5 KB) - Web Worker feature (optional)
├── hyperfixi-sse.min.js       (~5 KB) - EventSource feature (optional)
```

**Tasks**:
1. [ ] Create `browser-bundle-core.ts` with minimal imports:
   ```typescript
   // Core only - no optional features
   import { Parser } from '../parser/parser';
   import { Runtime } from '../runtime/runtime';
   // Core commands only (set, get, if, repeat, add, remove, toggle, etc.)
   // NO: sockets, workers, eventsource
   ```

2. [ ] Create feature entry points:
   ```typescript
   // src/features/sockets-bundle.ts
   export { SocketFeature } from './sockets';
   export function registerSocketFeature(runtime: Runtime) { ... }
   ```

3. [ ] Add rollup configs for each bundle:
   - `rollup.core.config.mjs`
   - `rollup.sockets.config.mjs`
   - `rollup.workers.config.mjs`
   - `rollup.sse.config.mjs`

4. [ ] Update package.json exports:
   ```json
   {
     "exports": {
       ".": "./dist/hyperfixi-core.min.js",
       "./full": "./dist/hyperfixi-full.min.js",
       "./sockets": "./dist/hyperfixi-sockets.min.js",
       "./workers": "./dist/hyperfixi-workers.min.js",
       "./sse": "./dist/hyperfixi-sse.min.js"
     }
   }
   ```

5. [ ] Document usage in README:
   ```html
   <!-- Core only (smallest) -->
   <script src="hyperfixi-core.min.js"></script>

   <!-- Add WebSocket support -->
   <script src="hyperfixi-sockets.min.js"></script>
   ```

**Expected Savings**: 40-60 KB for core-only bundle

---

## Phase 3: Strip Development-Only Code

**Problem**: Validation, suggestions, and metadata add ~30 KB to production bundle

**Code to Strip**:
1. `suggestions` arrays in error objects
2. `metadata` objects on expressions/commands
3. `LLMDocumentation` interfaces
4. `debug.*` calls
5. Validation in hot paths (keep boundary validation)

**Implementation Options**:

### Option A: Build-time stripping (Recommended)
```typescript
// Use process.env.NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  this.metadata = { ... };
}

// Terser will dead-code eliminate this
```

### Option B: Separate development/production builds
```typescript
// src/expressions/base-expression.ts
export abstract class BaseExpressionImpl<TInput, TOutput> {
  // Production: minimal
  abstract readonly name: string;

  // Development only (stripped in prod)
  metadata?: ExpressionMetadata;
  documentation?: LLMDocumentation;
}
```

### Option C: External metadata file
```typescript
// metadata.json - not bundled in production
// Can be loaded separately for dev tools
```

**Tasks**:
1. [ ] Audit all `suggestions` arrays - wrap in `NODE_ENV` check
2. [ ] Audit all `metadata` objects - make optional or strip
3. [ ] Configure terser to drop `debug.*` calls
4. [ ] Create `strip-dev-code.ts` rollup plugin if needed
5. [ ] Verify production bundle has no dev-only code

**Expected Savings**: 15-25 KB

---

## Phase 4: Deduplicate Expression Implementations

**Problem**: Multiple parallel expression systems with duplicated code

**Current Duplication**:
```
src/expressions/
├── logical/
│   ├── index.ts           (28 KB) - Expression classes
│   └── impl/
│       ├── index.ts       (12 KB) - Another implementation
│       └── comparisons.ts (25 KB) - Comparison logic
├── comparison/
│   └── index.ts           (21 KB) - Overlaps with logical/comparisons
```

**Tasks**:
1. [ ] Audit expression directories for duplication:
   ```bash
   # Find similar function names across files
   grep -r "evaluate\|validate" src/expressions/ --include="*.ts"
   ```

2. [ ] Identify candidates for consolidation:
   - `logical/impl/comparisons.ts` vs `comparison/index.ts`
   - Multiple `normalizeCollection` implementations
   - Multiple `inferResultType` implementations (already started with BaseExpressionImpl)

3. [ ] Create shared utilities:
   ```typescript
   // src/expressions/shared/collection-utils.ts
   export function normalizeCollection(value: unknown): unknown[] { ... }

   // src/expressions/shared/type-inference.ts
   export function inferType(value: unknown): EvaluationType { ... }
   ```

4. [ ] Refactor expressions to use shared code
5. [ ] Delete redundant implementations

**Expected Savings**: 20-40 KB

---

## Phase 5: Reduce Feature Code Bloat

**Problem**: Features are 8-14x larger than original _hyperscript equivalents

**Comparison**:
| Feature | Original | HyperFixi | Bloat Factor |
|---------|----------|-----------|--------------|
| sockets | 5.5 KB | 45 KB | 8x |
| worker | 5 KB | 40 KB | 8x |
| eventsource | 7.5 KB | 40 KB | 5x |

**Root Causes**:
1. Extensive TypeScript interfaces
2. Validation at every step
3. Error handling with suggestions
4. LLM documentation
5. Performance tracking

**Tasks**:
1. [ ] Audit each feature file for:
   - Unused code paths
   - Excessive type definitions (move to `.d.ts`)
   - Verbose error handling

2. [ ] Simplify feature implementations:
   ```typescript
   // Before: 45 KB
   class SocketFeature {
     metadata = { ... };
     documentation = { ... };
     validate(input: unknown): ValidationResult { ... }
     // ... extensive implementation
   }

   // After: 10 KB
   class SocketFeature {
     connect(url: string, options?: SocketOptions): WebSocket {
       // Direct implementation, minimal overhead
     }
   }
   ```

3. [ ] Move type definitions to declaration files:
   ```
   src/features/
   ├── sockets.ts      (10 KB) - Implementation only
   └── sockets.d.ts    (5 KB) - Types (not bundled)
   ```

4. [ ] Consider using original _hyperscript feature code as reference

**Expected Savings**: 80-100 KB across all features

---

## Phase 6: Optimize Validation System

**Problem**: `lightweight-validators.ts` is 26 KB

**Tasks**:
1. [ ] Audit validator usage - are all validators needed?
2. [ ] Consider lazy-loading validators
3. [ ] Remove unused validator methods
4. [ ] Simplify validation for production (full validation in dev only)

**Expected Savings**: 10-15 KB

---

## Implementation Order

1. **Phase 1: Fix Terser** (1 hour) - Critical, blocks accurate measurement
2. **Phase 2: Split Features** (4 hours) - High impact, low risk
3. **Phase 3: Strip Dev Code** (2 hours) - Medium impact
4. **Phase 4: Deduplicate** (4 hours) - Medium impact, some risk
5. **Phase 5: Reduce Feature Bloat** (8 hours) - High impact, higher risk
6. **Phase 6: Optimize Validation** (2 hours) - Low priority

---

## Success Metrics

| Metric | Current | Target | Stretch |
|--------|---------|--------|---------|
| Core bundle (min) | 351 KB | 100 KB | 80 KB |
| Core bundle (gzip) | 80 KB | 30 KB | 25 KB |
| Full bundle (min) | 351 KB | 150 KB | 120 KB |
| Full bundle (gzip) | 80 KB | 45 KB | 35 KB |

---

## Rollback Plan

Each phase should be:
1. Developed on a feature branch
2. Tested against full test suite
3. Compared with bundle size baseline
4. Merged only if tests pass and size reduces

Keep archived copies of removed code in case features need restoration.

---

## Notes

- Original _hyperscript uses plain JavaScript with no build step
- HyperFixi's TypeScript adds overhead but provides type safety
- Some size increase is acceptable for better DX and LLM compatibility
- Target: 1.5-2x original size (not 3.5x)
