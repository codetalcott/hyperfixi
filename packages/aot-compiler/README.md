# @lokascript/aot-compiler

Ahead-of-Time compiler for LokaScript/hyperscript. Transforms hyperscript to optimized JavaScript at build time, eliminating runtime parsing overhead and reducing bundle sizes.

## Features

- **Zero-cost parsing**: 100% of parsing happens at build time
- **Smaller bundles**: ~80% reduction by removing the runtime parser
- **Static analysis**: Enables optimization and dead code elimination
- **Tree-shaking**: Includes only commands actually used
- **Faster execution**: Direct function calls instead of registry lookups
- **Multilingual**: Supports 24 languages via semantic parser integration
- **Source maps**: Debug original hyperscript in browser devtools

## Installation

```bash
npm install @lokascript/aot-compiler
```

## Usage

### Programmatic API

```typescript
import { AOTCompiler, compileHyperscript } from '@lokascript/aot-compiler';

// Simple usage
const js = await compileHyperscript('on click toggle .active');

// Full compiler usage
const compiler = new AOTCompiler();

// Extract hyperscript from HTML
const scripts = compiler.extract(htmlSource, 'index.html');

// Compile all extracted scripts
const result = compiler.compile(scripts, { language: 'en' });

console.log(result.code);
// Output: JavaScript code with event handlers
```

### CLI

```bash
# Compile HTML files to JavaScript
lokascript-aot compile "src/**/*.html" --output dist

# Analyze hyperscript usage
lokascript-aot analyze "src/**/*.html" --json

# Extract hyperscript without compiling
lokascript-aot extract "src/**/*.html"

# Generate minimal runtime bundle
lokascript-aot bundle "src/**/*.html" --output dist/runtime.js
```

### Vite Plugin Integration

```typescript
// vite.config.ts
import { lokascriptAOT } from '@lokascript/vite-plugin';

export default {
  plugins: [
    lokascriptAOT({
      enabled: true,
      sourceMaps: true,
      languages: ['en', 'es', 'ja'],
    }),
  ],
};
```

## Example Output

**Input (HTML):**

```html
<button id="btn" _="on click toggle .active">Toggle</button>
```

**Generated JavaScript:**

```javascript
import { createContext } from '@lokascript/aot-compiler/runtime';

function _handler_click_toggle_a1b2(_event) {
  const _ctx = createContext(_event, this);
  _ctx.me.classList.toggle('active');
}

document.getElementById('btn').addEventListener('click', _handler_click_toggle_a1b2);
```

## Current Status

The compiler supports 45 command codegens, full expression codegen, control flow (if/else, repeat, for-each, while), and 24-language multilingual compilation via the semantic parser adapter. 533 tests passing. See [aot-compiler-design.md](../../docs-internal/proposals/aot-compiler-design.md#11-implementation-status-2026-02-05) for full reliability assessment.

## Supported Features

### Commands

| Command             | Codegen | Notes                             |
| ------------------- | ------- | --------------------------------- |
| toggle              | Yes     | classList.toggle()                |
| add                 | Yes     | classList.add() or DOM            |
| remove              | Yes     | classList.remove() or DOM         |
| show/hide           | Yes     | display style                     |
| focus/blur          | Yes     | Element methods                   |
| log                 | Yes     | console.log                       |
| send/trigger        | Yes     | dispatchEvent                     |
| halt/exit           | Yes     | Control flow                      |
| return              | Yes     | Return statement                  |
| if/else             | Yes     | Conditionals                      |
| repeat              | Yes     | For loops                         |
| for each            | Yes     | Iteration                         |
| while               | Yes     | While loops                       |
| set                 | Yes     | Vars, properties, attrs           |
| put                 | Yes     | into/before/after                 |
| wait                | Yes     | Duration (ms, s, m, h)            |
| fetch               | Yes     | JSON, text, HTML                  |
| increment/decrement | Yes     | Vars and elements                 |
| call                | Yes     | Function/method calls             |
| scroll              | Yes     | scrollIntoView                    |
| take                | Yes     | Class from siblings               |
| get                 | Yes     | Property access                   |
| go                  | Yes     | location/history navigation       |
| throw               | Yes     | throw Error                       |
| try/catch           | Yes     | Exception handling                |
| break/continue      | Yes     | Loop control                      |
| beep                | Yes     | console.log debug                 |
| js                  | Yes     | Inline JavaScript                 |
| copy                | Yes     | Clipboard API                     |
| make                | Yes     | createElement                     |
| swap                | Yes     | innerHTML/outerHTML strategies    |
| morph               | Yes     | DOM diffing via runtime           |
| transition          | Yes     | CSS transition + transitionend    |
| measure             | Yes     | getBoundingClientRect             |
| settle              | Yes     | Wait for animations to complete   |
| tell                | Yes     | Scoped context rebinding          |
| async               | Yes     | Fire-and-forget IIFE              |
| install             | Yes     | Behavior installation via runtime |
| render              | Yes     | Template rendering via runtime    |

### Expressions

| Expression                                                | Status |
| --------------------------------------------------------- | ------ |
| Literals                                                  | Full   |
| Selectors (#id, .class)                                   | Full   |
| Context vars (me, you, it)                                | Full   |
| Local vars (:var)                                         | Full   |
| Global vars ($var, ::var)                                 | Full   |
| Binary operators                                          | Full   |
| Possessive ('s)                                           | Full   |
| Positional (first, last, next, previous, closest, parent) | Full   |
| Method calls                                              | Full   |

### Event Modifiers

| Modifier     | Status |
| ------------ | ------ |
| .prevent     | Full   |
| .stop        | Full   |
| .once        | Full   |
| .passive     | Full   |
| .capture     | Full   |
| .debounce(N) | Full   |
| .throttle(N) | Full   |

## Optimization Passes

The compiler includes several optimization passes:

1. **Constant Folding**: Evaluates compile-time constants

   ```hyperscript
   set :x to 5 + 3  →  set :x to 8
   ```

2. **Selector Caching**: Caches repeated selector lookups

   ```hyperscript
   add .a to #btn then remove .b from #btn
   →
   const _sel = document.getElementById('btn');
   _sel.classList.add('a');
   _sel.classList.remove('b');
   ```

3. **Dead Code Elimination**: Removes unreachable code

   ```hyperscript
   halt then log "never runs"  →  halt
   ```

4. **Loop Unrolling**: Unrolls small fixed-count loops
   ```hyperscript
   repeat 3 times add .a end
   →
   add .a; add .a; add .a;
   ```

## Runtime

The AOT runtime is a minimal (~3KB) set of helpers that cannot be inlined:

```typescript
import {
  createContext, // Execution context
  toggle, // Class/attribute toggle
  debounce, // Function debouncing
  throttle, // Function throttling
  wait, // Promise-based delay
  send, // Custom event dispatch
  fetchJSON, // Fetch helper
  globals, // Global variable store
  morph, // DOM diffing replacement
  transition, // CSS transition helper
  measure, // getBoundingClientRect
  settle, // Wait for animations
  installBehavior, // Behavior installation
  render, // Template rendering
} from '@lokascript/aot-compiler/runtime';
```

## Configuration

```typescript
interface CompileOptions {
  // Language code (ISO 639-1). Defaults to 'en'.
  language?: string;

  // Confidence threshold for semantic parsing (0-1).
  confidenceThreshold?: number;

  // Enable debug logging
  debug?: boolean;

  // Optimization level: 0 = none, 1 = basic, 2 = full
  optimizationLevel?: 0 | 1 | 2;

  // Code generation options
  codegen?: {
    target: 'es2020' | 'es2022' | 'esnext';
    mode: 'iife' | 'esm' | 'cjs';
    minify: boolean;
    sourceMaps: boolean;
  };
}
```

## Performance

| Metric             | JIT (Runtime)     | AOT (Build-time) | Improvement |
| ------------------ | ----------------- | ---------------- | ----------- |
| Initial parse time | 2-5ms per handler | 0ms              | 100%        |
| Bundle size (full) | 203 KB            | ~40 KB           | 80%         |
| Bundle size (lite) | 7.3 KB            | ~3 KB            | 59%         |
| Command dispatch   | ~0.5ms            | ~0.1ms           | 80%         |

## License

MIT
