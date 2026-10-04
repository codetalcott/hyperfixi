# API Reference

This section provides detailed documentation for the LokaScript API.

## Core API

The main entry point for LokaScript is the `hyperscript` object:

```javascript
import { hyperscript } from '@lokascript/core';

// Process all hyperscript attributes in the DOM
hyperscript.processNode(document.body);

// Compile a hyperscript string to an executable
const result = hyperscript.compileSync('on click toggle .active');

// Execute hyperscript code directly
await hyperscript.eval('toggle .active on #myElement', element);
```

## API v2 (Recommended)

The v2 API provides cleaner methods with structured results:

### `compileSync(code, options?)`

Synchronous compilation with structured result.

```javascript
const result = hyperscript.compileSync('toggle .active');

if (result.ok) {
  console.log('Parser:', result.meta.parser); // 'semantic' or 'traditional'
  console.log('Confidence:', result.meta.semanticConfidence);
  // Execute the compiled code
  await result.executable.execute(element, {});
} else {
  console.error('Errors:', result.errors);
}
```

**Returns:**

```typescript
interface CompileResult {
  ok: boolean;
  executable?: CompiledExecutable;
  errors?: CompileError[];
  meta: {
    parser: 'semantic' | 'traditional';
    semanticConfidence?: number;
    semanticLanguage?: string;
    warnings: string[];
  };
}
```

### `compileAsync(code, options?)`

Async compilation for language loading.

```javascript
const result = await hyperscript.compileAsync(code, { language: 'ja' });
```

### `eval(code, element?, options?)`

Compile and execute in one call.

```javascript
// Execute on specific element
await hyperscript.eval('add .clicked to me', button);

// Execute without element context
await hyperscript.eval('log "Hello World"');

// Execute with options
await hyperscript.eval('toggle .active', element, { language: 'en' });
```

### `validate(code, options?)`

Validate hyperscript syntax without executing.

```javascript
const validation = await hyperscript.validate('toggle .active');

if (!validation.valid) {
  validation.errors.forEach(err => {
    console.error(`Line ${err.line}: ${err.message}`);
  });
}
```

**Returns:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

### `createContext(element?, parent?)`

Create execution context with optional parent inheritance.

```javascript
const parent = hyperscript.createContext();
const child = hyperscript.createContext(element, parent);
```

## Compilation Options

```typescript
interface CompileOptions {
  language?: string; // Language code (e.g., 'en', 'ja', 'es')
  confidenceThreshold?: number; // Min confidence for semantic parsing (0-1)
  traditional?: boolean; // Force traditional parser
}
```

## Compilation Metadata

Every compilation returns metadata about parser decisions:

```javascript
const result = hyperscript.compileSync('toggle .active');
console.log(result.meta);
// {
//   parser: 'semantic',
//   semanticConfidence: 0.98,
//   semanticLanguage: 'en',
//   warnings: []
// }
```

This helps identify:

- Which parser processed the code (semantic vs traditional)
- Confidence score if semantic parser was used
- Any warnings about ambiguous syntax

## Legacy API

The following methods still work but show deprecation warnings:

| Legacy Method | v2 Replacement  |
| ------------- | --------------- |
| `compile()`   | `compileSync()` |
| `run()`       | `eval()`        |
| `evaluate()`  | `eval()`        |

## API Sections

### Core Functions

- [hyperscript Object](/en/api/hyperscript) - Main runtime object
- [compile()](/en/api/compile) - Compile hyperscript to executable
- [execute()](/en/api/execute) - Execute hyperscript code

### Commands

LokaScript includes 43 commands organized by category:

- [DOM Commands](/en/api/commands/dom) - `toggle`, `add`, `remove`, `put`, `set`
- [Control Flow](/en/api/commands/control-flow) - `if`, `repeat`, `for`, `while`
- [Animation](/en/api/commands/animation) - `transition`, `settle`, `wait`
- [Async Commands](/en/api/commands/async) - `fetch`, `async`, `send`
- [Navigation](/en/api/commands/navigation) - `go`, `push url`, `replace url`
- [Data Commands](/en/api/commands/data) - `default`
- [Utility Commands](/en/api/commands/utility) - `log`, `beep!`, `copy`, `pick`

### Expressions

- [Selectors](/en/api/expressions/selectors) - CSS selectors, `me`, `you`, `it`
- [Positional](/en/api/expressions/positional) - `first`, `last`, `next`, `previous`
- [Properties](/en/api/expressions/properties) - Possessive syntax, property access
- [Logical](/en/api/expressions/logical) - Comparisons, boolean operators
- [Strings](/en/api/expressions/strings) - String operations, interpolation
- [Type Conversion](/en/api/expressions/conversion) - `as String`, `as Number`, `as Array`

## Quick Example

```html
<button
  _="on click
  add .loading to me
  fetch /api/data as json
  put result.message into #output
  remove .loading from me"
>
  Load Data
</button>
```

## Next Steps

- [Debugging](/en/guide/debugging) - Debug tools and techniques
- [Bundles](/en/guide/bundles) - Bundle selection guide
- [htmx Compatibility](/en/guide/htmx-compatibility) - htmx 4 beside the engine, and localized `hx-*` names
