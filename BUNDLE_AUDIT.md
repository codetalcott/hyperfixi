# Browser Bundle Audit Report

**Date**: 2026-01-17
**Auditor**: Claude Code
**Scope**: Check for server code leakage into browser bundles

## Summary

✅ **PASSED** - No server code detected in browser bundles

## Bundles Analyzed

### 1. `hyperfixi-hybrid-complete.js`

**Size**:

- Uncompressed: 28.8 KB
- Gzipped: **7.4 KB** ✨

**Server Code Check**:

- ✅ No `express` imports
- ✅ No `request-event-source` imports
- ✅ No `ServerRequest` or `ServerResponse` types
- ✅ No Node.js `node:*` imports

**Registry Code**:

- ❌ Not included in this bundle
- This bundle uses a minimal inline runtime, not RuntimeBase

**Verdict**: Clean browser build, optimal for production

### 2. `hyperfixi-browser.js` (Full Bundle)

**Size**:

- Uncompressed: 1.0 MB

**Composition**:

- Core runtime with RuntimeBase
- All 48 commands
- Full expression system
- Semantic parsing (multilingual support)
- Registry integration (framework-agnostic)

**Server Code Check**:

- ❌ Does NOT import from `server-integration` package
- ❌ Does NOT include Express types or HTTP framework code
- ✅ Includes `RegistryIntegration` (framework-agnostic, OK for browser)

**Registry System in Full Bundle**:
The full bundle includes `RegistryIntegration` from `packages/core/src/registry/runtime-integration.ts`. This is **intentional and safe** because:

1. **Framework-Agnostic**: Uses generic `ExecutionContext`, not HTTP-specific types
2. **Tree-Shakeable**: Can be excluded if not used
3. **Browser-Compatible**: Works for custom client-side event sources (WebSocket, SSE, etc.)
4. **No Server Dependencies**: Zero imports from `server-integration` package

## Architecture Assessment

### ✅ Separation is Correct

```
packages/
├── core/                           # Browser-safe
│   ├── src/registry/               # ✅ Framework-agnostic (OK in browser)
│   │   ├── event-source-registry.ts     # Generic event source API
│   │   ├── context-provider-registry.ts # Generic context API
│   │   └── runtime-integration.ts       # Runtime bridge (no HTTP types)
│   └── src/runtime/runtime-base.ts # Uses registry (optional)
│
└── server-integration/             # Node.js only
    └── src/
        ├── events/request-event-source.ts  # ❌ NOT in browser bundles
        └── middleware/                     # ❌ NOT in browser bundles
```

### Type Safety Analysis

**Current Types**:

```typescript
// packages/core/src/registry/event-source-registry.ts:24-32
export interface EventSourcePayload {
  type: string;
  data: unknown;
  target?: Element | object | null; // ⚠️ Generic 'object'
  // ...
}
```

**Assessment**:

- ✅ Uses generic `object` instead of `Request` (good)
- ✅ No HTTP framework imports
- ⚠️ Could be more type-safe with conditional types

## Recommendations

### 1. Add Environment-Specific Type Guards

Create conditional types that adapt based on environment:

```typescript
// packages/core/src/registry/types.ts

export type EnvironmentContext = 'browser' | 'node' | 'universal';

export interface EventSourcePayload<TEnv extends EnvironmentContext = 'universal'> {
  type: string;
  data: unknown;
  target?: TEnv extends 'browser'
    ? Element | null
    : TEnv extends 'node'
      ? object | null
      : Element | object | null;
  // ...
}
```

### 2. Explicit Browser vs Server Types

Split types into environment-specific exports:

```typescript
// packages/core/src/registry/browser-types.ts
export interface BrowserEventPayload extends EventSourcePayload<'browser'> {
  target?: Element | null;
  nativeEvent?: Event;
}

// packages/server-integration/src/types.ts
export interface ServerEventPayload extends EventSourcePayload<'node'> {
  target?: object | null;
  // No nativeEvent in server
}
```

### 3. Tree-Shaking Improvements

Ensure registry can be excluded from minimal bundles:

```typescript
// In rollup config for minimal bundles:
{
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false
  },
  // Optionally mark registry as external for ultra-minimal builds
}
```

## Bundle Size Targets

| Bundle                                | Current | Target  | Status               |
| ------------------------------------- | ------- | ------- | -------------------- |
| `hyperfixi-hybrid-complete.js` (gzip) | 7.4 KB  | <10 KB  | ✅ Excellent         |
| `hyperfixi-browser-minimal.js` (gzip) | ?       | <15 KB  | ❓ Needs measurement |
| `hyperfixi-browser.js` (gzip)         | ?       | <200 KB | ❓ Needs measurement |

## Action Items

1. ✅ Verify no server code in browser bundles (DONE)
2. 🔧 Implement conditional types for EventSourcePayload
3. 🔧 Add environment-specific type guards
4. 📏 Measure all bundle sizes (gzipped)
5. 📝 Document bundle selection guide

## Conclusion

**Browser bundles are clean** - no server code leakage detected. The registry system included in full bundles is framework-agnostic and appropriate for browser use (WebSocket events, custom client commands, etc.).

The architecture correctly separates concerns:

- ✅ Core package: Framework-agnostic, browser-safe
- ✅ Server-integration: Node-only, not in browser bundles
- ✅ Registry: Universal API, works in both environments

Recommended improvements focus on **type safety** and **documentation**, not architectural changes.
