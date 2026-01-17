# Type Safety Without Bloat: Conditional Types Design

## Problem Statement

The current registry system uses generic types that work in both browser and server environments:

```typescript
export interface EventSourcePayload {
  type: string;
  data: unknown;
  target?: Element | object | null; // ⚠️ Too permissive
  nativeEvent?: Event; // ❌ Doesn't exist in Node.js
  // ...
}
```

**Issues**:

1. `Element | object` is too permissive - no type safety
2. `Event` type doesn't exist in Node.js environment
3. No compile-time guarantees about environment-specific fields

## Solution: Environment-Aware Conditional Types

### Phase 1: Environment Discriminator

Create a type-level environment discriminator:

```typescript
// packages/core/src/registry/environment.ts

/**
 * Runtime environment types
 */
export type RuntimeEnvironment = 'browser' | 'node' | 'universal';

/**
 * Detect runtime environment at type level
 * Uses conditional types to branch based on available globals
 */
export type DetectEnvironment<T = typeof globalThis> = T extends { document: any; window: any }
  ? 'browser'
  : T extends { process: any; require: any }
    ? 'node'
    : 'universal';

/**
 * Type guard for runtime environment detection
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}
```

### Phase 2: Environment-Specific Types

Use conditional types to provide correct types per environment:

```typescript
// packages/core/src/registry/types.ts

/**
 * Environment-specific target types
 */
export type EventTarget<TEnv extends RuntimeEnvironment> = TEnv extends 'browser'
  ? Element
  : TEnv extends 'node'
    ? object
    : Element | object;

/**
 * Environment-specific event types
 */
export type NativeEvent<TEnv extends RuntimeEnvironment> = TEnv extends 'browser'
  ? Event
  : TEnv extends 'node'
    ? never // No native events in Node.js
    : Event | undefined;

/**
 * Event source payload with environment-aware types
 */
export interface EventSourcePayload<TEnv extends RuntimeEnvironment = 'universal'> {
  /** Event type (e.g., 'request', 'click', 'message') */
  type: string;

  /** Raw event data */
  data: unknown;

  /**
   * Event target
   * - Browser: Element (DOM element)
   * - Node: object (generic context object)
   * - Universal: Element | object
   */
  target?: EventTarget<TEnv> | null;

  /**
   * Native browser event (browser only)
   * - Browser: Event
   * - Node: never (doesn't exist)
   * - Universal: Event | undefined
   */
  nativeEvent?: NativeEvent<TEnv>;

  /** Additional metadata */
  meta?: Record<string, unknown>;
}
```

### Phase 3: Type-Safe Browser API

Export browser-specific types that exclude server concerns:

```typescript
// packages/core/src/registry/browser-types.ts

import type { EventSourcePayload, RuntimeEnvironment } from './types';

/**
 * Browser-specific event payload
 * Guarantees Element targets and Event objects
 */
export interface BrowserEventPayload extends EventSourcePayload<'browser'> {
  target?: Element | null;
  nativeEvent?: Event;
}

/**
 * Browser event source
 */
export interface BrowserEventSource {
  name: string;
  subscribe(
    options: {
      event: string;
      handler: (payload: BrowserEventPayload, context: any) => void;
      target?: string | Element;
    },
    context: any
  ): { id: string; unsubscribe: () => void };
}

/**
 * Type guard to narrow payload to browser environment
 */
export function isBrowserPayload(payload: EventSourcePayload): payload is BrowserEventPayload {
  return typeof window !== 'undefined' && payload.target instanceof Element;
}
```

### Phase 4: Type-Safe Server API

Export server-specific types (in `server-integration` package):

```typescript
// packages/server-integration/src/types.ts

import type { EventSourcePayload } from '@hyperfixi/core/registry';

/**
 * HTTP request object (framework-agnostic)
 */
export interface ServerRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string | string[]>;
  body: unknown;
}

/**
 * HTTP response builder (framework-agnostic)
 */
export interface ServerResponse {
  status(code: number): ServerResponse;
  header(name: string, value: string): ServerResponse;
  json(data: unknown): void;
  html(content: string): void;
  text(content: string): void;
  redirect(url: string, code?: number): void;
  send(data: unknown): void;
}

/**
 * Server-specific event payload
 * Target is ServerRequest, no nativeEvent
 */
export interface ServerEventPayload extends EventSourcePayload<'node'> {
  data: {
    request: ServerRequest;
    response: ServerResponse;
    params: Record<string, string>;
  };
  target?: object | null;
  // nativeEvent is never in server context
}

/**
 * Type guard to narrow payload to server environment
 */
export function isServerPayload(payload: EventSourcePayload): payload is ServerEventPayload {
  return (
    typeof payload.data === 'object' &&
    payload.data !== null &&
    'request' in payload.data &&
    'response' in payload.data
  );
}
```

### Phase 5: Universal Types for Shared Code

For code that works in both environments:

```typescript
// packages/core/src/registry/universal-types.ts

import type { EventSourcePayload, RuntimeEnvironment } from './types';

/**
 * Universal event source (works in browser and server)
 */
export interface UniversalEventSource<TEnv extends RuntimeEnvironment = 'universal'> {
  name: string;
  description?: string;
  supportedEvents?: string[];

  subscribe(
    options: {
      event: string;
      handler: (payload: EventSourcePayload<TEnv>, context: any) => void;
      target?: string | object;
    },
    context: any
  ): { id: string; unsubscribe: () => void };

  supports?(event: string): boolean;
  initialize?(): Promise<void> | void;
  destroy?(): void;
}

/**
 * Type-safe registry that adapts to environment
 */
export interface TypedRegistry<TEnv extends RuntimeEnvironment = 'universal'> {
  eventSources: {
    register(name: string, source: UniversalEventSource<TEnv>): void;
    get(name: string): UniversalEventSource<TEnv> | undefined;
    has(name: string): boolean;
  };

  context: {
    register<T>(
      name: string,
      provide: (ctx: any) => T,
      options?: { description?: string; cache?: boolean }
    ): void;
    has(name: string): boolean;
  };

  commands: {
    register(command: any): void;
    has(name: string): boolean;
  };
}
```

## Usage Examples

### Browser-Only Code

```typescript
import type {
  BrowserEventPayload,
  BrowserEventSource,
} from '@hyperfixi/core/registry/browser-types';

const clickSource: BrowserEventSource = {
  name: 'custom-click',
  subscribe(options, context) {
    const handler = (e: Event) => {
      const payload: BrowserEventPayload = {
        type: 'click',
        data: { x: (e as MouseEvent).clientX },
        target: e.target as Element, // ✅ Type-safe
        nativeEvent: e, // ✅ Type-safe
      };
      options.handler(payload, context);
    };

    document.addEventListener('click', handler);
    return {
      id: 'click_1',
      unsubscribe: () => document.removeEventListener('click', handler),
    };
  },
};
```

### Server-Only Code

```typescript
import type { ServerEventPayload } from '@hyperfixi/server-integration';

function handleRequest(payload: ServerEventPayload) {
  const { request, response } = payload.data; // ✅ Type-safe

  response.status(200).header('Content-Type', 'application/json').json({ success: true });

  // ❌ TypeScript error: nativeEvent doesn't exist in server context
  // console.log(payload.nativeEvent);
}
```

### Universal Code (Works in Both)

```typescript
import type { EventSourcePayload } from '@hyperfixi/core/registry';
import { isBrowserPayload, isServerPayload } from './type-guards';

function handleEvent(payload: EventSourcePayload) {
  if (isBrowserPayload(payload)) {
    // ✅ Type narrowed to BrowserEventPayload
    console.log('DOM element:', payload.target?.tagName);
    console.log('Event type:', payload.nativeEvent?.type);
  } else if (isServerPayload(payload)) {
    // ✅ Type narrowed to ServerEventPayload
    console.log('Request path:', payload.data.request.path);
    console.log('Method:', payload.data.request.method);
  }
}
```

## Implementation Plan

### Step 1: Add Environment Detection

```bash
# Create environment detection module
touch packages/core/src/registry/environment.ts
```

**File**: `packages/core/src/registry/environment.ts`

- Export `RuntimeEnvironment` type
- Export `DetectEnvironment<T>` conditional type
- Export runtime detection functions

### Step 2: Update Core Types

**File**: `packages/core/src/registry/types.ts`

- Add `<TEnv extends RuntimeEnvironment = 'universal'>` generic to `EventSourcePayload`
- Add `EventTarget<TEnv>` conditional type
- Add `NativeEvent<TEnv>` conditional type
- Keep default as `'universal'` for backward compatibility

### Step 3: Create Browser-Specific Exports

```bash
# Create browser-specific types
touch packages/core/src/registry/browser-types.ts
```

**File**: `packages/core/src/registry/browser-types.ts`

- Export `BrowserEventPayload`
- Export `BrowserEventSource`
- Export `isBrowserPayload()` type guard

### Step 4: Create Server-Specific Exports

**File**: `packages/server-integration/src/types.ts` (update existing)

- Export `ServerEventPayload extends EventSourcePayload<'node'>`
- Export `isServerPayload()` type guard
- Keep existing `ServerRequest` and `ServerResponse` interfaces

### Step 5: Add Universal Types

```bash
# Create universal types
touch packages/core/src/registry/universal-types.ts
```

**File**: `packages/core/src/registry/universal-types.ts`

- Export `UniversalEventSource<TEnv>`
- Export `TypedRegistry<TEnv>`

### Step 6: Update Package Exports

**File**: `packages/core/package.json`

```json
{
  "exports": {
    "./registry": {
      "types": "./dist/registry/index.d.ts",
      "import": "./dist/registry/index.mjs"
    },
    "./registry/browser": {
      "types": "./dist/registry/browser-types.d.ts",
      "import": "./dist/registry/browser-types.mjs"
    },
    "./registry/universal": {
      "types": "./dist/registry/universal-types.d.ts",
      "import": "./dist/registry/universal-types.mjs"
    }
  }
}
```

### Step 7: Migration Guide

Provide clear migration path for existing code:

**Before** (generic, less safe):

```typescript
import { EventSourcePayload } from '@hyperfixi/core/registry';

const payload: EventSourcePayload = {
  type: 'click',
  data: {},
  target: element, // Could be Element or object
};
```

**After** (type-safe):

```typescript
// Browser code
import { BrowserEventPayload } from '@hyperfixi/core/registry/browser';

const payload: BrowserEventPayload = {
  type: 'click',
  data: {},
  target: element, // ✅ Must be Element
  nativeEvent: event,
};
```

```typescript
// Server code
import { ServerEventPayload } from '@hyperfixi/server-integration';

const payload: ServerEventPayload = {
  type: 'request',
  data: { request, response, params },
  target: null, // ✅ Generic object or null
  // nativeEvent not allowed
};
```

## Benefits

### 1. Zero Runtime Cost

All type checking happens at compile time. No environment detection code in bundles.

### 2. Better IntelliSense

```typescript
// Browser context
payload.nativeEvent?.preventDefault(); // ✅ Autocomplete works

// Server context
payload.data.request.path; // ✅ Autocomplete works
payload.nativeEvent; // ❌ TypeScript error
```

### 3. Catches Bugs at Compile Time

```typescript
// Server code trying to use DOM API
function serverHandler(payload: ServerEventPayload) {
  payload.target?.classList.add('active');
  // ❌ TypeScript error: Property 'classList' does not exist on type 'object'
}
```

### 4. Tree-Shaking Friendly

No additional runtime code, so tree-shaking works perfectly:

- Browser bundles: Only `BrowserEventPayload` types (zero bytes)
- Server bundles: Only `ServerEventPayload` types (zero bytes)
- Universal code: Generic `EventSourcePayload` (zero bytes)

### 5. Backward Compatible

Default to `'universal'` environment keeps existing code working:

```typescript
// Existing code still works
const payload: EventSourcePayload = {
  /* ... */
};

// New code gets better types
const browserPayload: EventSourcePayload<'browser'> = {
  /* ... */
};
```

## Testing Strategy

### Type Tests

```typescript
// packages/core/src/registry/__tests__/types.test.ts

import type { EventSourcePayload, EventTarget, NativeEvent } from '../types';
import { expectType } from 'tsd';

// Test browser environment types
type BrowserTarget = EventTarget<'browser'>;
expectType<Element>(null as any as BrowserTarget);

type BrowserEvent = NativeEvent<'browser'>;
expectType<Event>(null as any as BrowserEvent);

// Test node environment types
type NodeTarget = EventTarget<'node'>;
expectType<object>(null as any as NodeTarget);

type NodeEvent = NativeEvent<'node'>;
expectType<never>(null as any as NodeEvent); // Should be never

// Test universal environment types
type UniversalTarget = EventTarget<'universal'>;
expectType<Element | object>(null as any as UniversalTarget);
```

### Runtime Tests

```typescript
// packages/core/src/registry/__tests__/type-guards.test.ts

import { isBrowserPayload } from '../browser-types';
import { isServerPayload } from '@hyperfixi/server-integration';

describe('Type Guards', () => {
  it('should detect browser payload', () => {
    const payload = {
      type: 'click',
      data: {},
      target: document.body,
      nativeEvent: new Event('click'),
    };

    expect(isBrowserPayload(payload)).toBe(true);

    if (isBrowserPayload(payload)) {
      // Type is narrowed
      expect(payload.target instanceof Element).toBe(true);
    }
  });

  it('should detect server payload', () => {
    const payload = {
      type: 'request',
      data: {
        request: { method: 'GET', path: '/' },
        response: {},
      },
    };

    expect(isServerPayload(payload)).toBe(true);
  });
});
```

## Documentation Updates

### 1. Add to CLAUDE.md

````markdown
## Type Safety

HyperFixi uses conditional types for environment-specific type safety:

**Browser Code**:

```typescript
import { BrowserEventPayload } from '@hyperfixi/core/registry/browser';
// Full type safety for DOM elements and Events
```
````

**Server Code**:

```typescript
import { ServerEventPayload } from '@hyperfixi/server-integration';
// Full type safety for HTTP request/response
```

**Universal Code**:

```typescript
import { EventSourcePayload } from '@hyperfixi/core/registry';
// Works in both environments
```

````

### 2. Add Type Safety Guide

```bash
# Create comprehensive type safety documentation
touch packages/core/docs/TYPE_SAFETY.md
````

## Summary

This design provides **type safety without bloat** by:

1. ✅ Using TypeScript conditional types (zero runtime cost)
2. ✅ Providing environment-specific exports (`browser`, `node`, `universal`)
3. ✅ Adding type guards for runtime narrowing
4. ✅ Maintaining backward compatibility (default to `'universal'`)
5. ✅ Enabling better IntelliSense and compile-time error checking
6. ✅ Supporting tree-shaking (no runtime code)

The implementation adds **zero bytes** to bundles while providing significantly better developer experience and type safety.
