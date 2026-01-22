# API Directory

This directory contains the main public API implementation for LokaScript.

## File Structure

| File                 | Purpose                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `hyperscript-api.ts` | **Implementation** - The actual API logic that parses/executes hyperscript language |
| `lokascript-api.ts`  | **Public Brand** - Re-exports with LokaScript brand naming                          |
| `dom-processor.ts`   | DOM attribute processing and event handling                                         |

## Naming Clarification

### Why is it called "hyperscript-api.ts" and not "lokascript-api.ts"?

This is a common source of confusion. Here's the rationale:

**`hyperscript-api.ts`** is named after the **LANGUAGE** it implements (hyperscript specification), NOT the original \_hyperscript library from BigSky Software.

Think of analogous naming patterns:

- A TypeScript compiler might have `javascript-api.ts` (implements JS language spec)
- A Python interpreter might have `python-ast.ts` (implements Python language spec)
- Our implementation has `hyperscript-api.ts` (implements hyperscript language spec)

This is **LokaScript's own implementation** that:

- Implements the hyperscript language specification
- Adds multilingual support (23 languages)
- Uses semantic-first parsing with confidence scoring
- Provides type-safe, modular architecture
- Maintains ~85% compatibility with official \_hyperscript syntax

**`lokascript-api.ts`** is the **public-facing brand name** - it re-exports the implementation with LokaScript branding.

## Architecture Pattern

```
hyperscript-api.ts (INTERNAL)
    ↓ implements hyperscript language spec
    ↓ extends with multilingual features
    ↓
lokascript-api.ts (PUBLIC)
    ↓ re-exports with brand naming
    ↓
index.ts (ENTRY POINT)
    ↓ exposes to consumers
    ↓
External code imports "@lokascript/core"
```

### Internal Code

Internal code can import from either:

```typescript
import { hyperscript } from './api/hyperscript-api'; // Direct implementation
import { lokascript } from './api/lokascript-api'; // Branded re-export
```

### External Code

External users see only the branded naming:

```typescript
import { lokascript } from '@lokascript/core';
```

### Browser Global

Browser bundles expose both names during transition:

```javascript
window.lokascript; // PRIMARY (new brand)
window.hyperfixi; // DEPRECATED (old brand, shows warning)
```

## Relationship to Original \_hyperscript

**Important**: This is NOT a fork or wrapper of the original \_hyperscript library from BigSky Software.

This is a ground-up reimplementation that:

- Implements the same language syntax (with extensions)
- Maintains ecosystem compatibility (behaviors, event patterns)
- Adds features not in original (multilingual, semantic parsing, tree-shaking)
- Uses modern TypeScript architecture
- Has its own parser, runtime, and AST representation

We maintain the "hyperscript" name in internal files because:

1. It accurately describes what the code does (implements hyperscript language)
2. It aids developer understanding ("this parses hyperscript syntax")
3. It's consistent with how other language implementations are named

For external branding and public APIs, we use "lokascript" to:

1. Establish our own identity
2. Avoid confusion with original \_hyperscript
3. Reflect the multilingual ("loka" = world) scope

## Summary

- **hyperscript-api.ts** = Implementation (named after language spec)
- **lokascript-api.ts** = Public API (named after our brand)
- Both refer to the same implementation
- Neither is the original \_hyperscript library
