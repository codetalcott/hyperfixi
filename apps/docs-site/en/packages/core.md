# @lokascript/core

The main LokaScript runtime, parser, and command system.

## Installation

```bash
npm install @lokascript/core
```

## Quick Start

```javascript
import { hyperscript } from '@lokascript/core';

// Execute hyperscript
await hyperscript.eval('toggle .active on me', element);

// Or process HTML with _="..." attributes
hyperscript.processNode(document.body);
```

## Browser Bundles

| Bundle                                 | Size (gzip) | Use Case                                                                                 |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| via **`@hyperfixi/vite-plugin`**       | 18–34 KB    | Vite projects: registers only the engine modules your pages use                          |
| **`hyperfixi-hs.js`** (engine)         | ~34 KB      | Script tag: hyperscript only, every module, `live` / `when` / `bind` built in            |
| **`hyperfixi.js`** (`@hyperfixi/core`) | ~34 KB      | The same file as `hyperfixi-hs.js`, under core's name (core's own 352 KB bundle retired) |

The 3.x small prebuilts (`lite`, `hybrid-complete`, `hyperfixi-hx.js`, …) are retired; see
[Bundle Selection](/en/guide/bundles).

```html
<!-- CDN usage -->
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
```

## Features

### 43 Commands

DOM manipulation, control flow, async operations, events, and more.

```javascript
// DOM
await hyperscript.eval('toggle .active on me', el);
await hyperscript.eval('put "Hello" into #output');
await hyperscript.eval('show #modal');

// Control flow
await hyperscript.eval('if me has .active remove .active from me end', el);
await hyperscript.eval('repeat 3 times log "hi" end');

// Async
await hyperscript.eval('wait 500ms then hide me', el);
await hyperscript.eval('fetch /api/data then put result into #output');
```

### Full Expression Parser

Arithmetic, comparisons, property access, method calls.

```javascript
await hyperscript.eval('5 + 3 * 2'); // 11
await hyperscript.eval('#input.value.length > 10'); // boolean
await hyperscript.eval('me.dataset.count as Int + 1'); // number
```

### HTML Integration

Automatic processing of `_="..."` attributes.

```html
<button _="on click toggle .active on me">Toggle</button>
<button _="on click put 'Clicked!' into the next <div/>">Click</button>
```

### Event Modifiers

```html
<button _="on click.once log 'only once'">Once</button>
<form _="on submit.prevent fetch /api/submit">Submit</form>
<input _="on input.debounce(300) put my value into #preview" />
```

### Runtime Hooks

```javascript
import { createHooks } from '@lokascript/core';

const hooks = createHooks({
  beforeExecute: ctx => console.log('Executing:', ctx.commandName),
  afterExecute: (ctx, result) => console.log('Done:', result),
  onError: (ctx, error) => console.error('Error:', error),
});

hyperscript.registerHooks('my-hooks', hooks);
```

### Debug Control

```javascript
// Enable detailed logging
hyperscript.debugControl.enable();

// Check compilation metadata
const result = hyperscript.compileSync('toggle .active');
console.log(result.meta.parser); // 'semantic' or 'traditional'
console.log(result.meta.confidence); // 0.95
```

### Memory Management

```javascript
// Clean up event listeners when removing elements
hyperscript.cleanup(element);

// Clean up a container and all descendants
hyperscript.cleanupTree(container);

// Full shutdown
hyperscript.destroy();
```

## API Reference

### Main Methods

| Method               | Description                 |
| -------------------- | --------------------------- |
| `eval(code, ctx?)`   | Compile and execute         |
| `compileSync(code)`  | Synchronous compilation     |
| `compileAsync(code)` | Async compilation           |
| `validate(code)`     | Syntax validation           |
| `createContext(el?)` | Create execution context    |
| `processNode(el)`    | Process \_="..." attributes |
| `cleanup(el)`        | Clean up element            |
| `destroy()`          | Full shutdown               |

See [API Reference](/en/api/hyperscript) for complete documentation.

## TypeScript

Full TypeScript support with type definitions included.

```typescript
import { hyperscript, ExecutionContext, CompileResult } from '@lokascript/core';

const ctx: ExecutionContext = hyperscript.createContext(element);
const result: CompileResult = hyperscript.compileSync('toggle .active');
```

## Compatibility

- 100% compatible with official \_hyperscript syntax
- Works in all modern browsers
- Node.js support for SSR

## Next Steps

- [API Reference](/en/api/hyperscript) - Complete API documentation
- [Bundle Selection](/en/guide/bundles) - Choose the right bundle
- [Vite Plugin](/en/packages/vite-plugin) - Automatic bundle generation
