# @hyperfixi/vite-plugin

Zero-config Vite plugin that automatically generates minimal HyperFixi bundles based on detected hyperscript usage.

## Features

- **Zero-config**: Just add the plugin and it works
- **Automatic detection**: Scans HTML, Vue, Svelte, JSX/TSX for `_="..."` attributes
- **Minimal bundles**: Only includes commands and blocks you actually use
- **HMR support**: Re-generates bundle when you add new hyperscript
- **Framework agnostic**: Works with any Vite-based project

## Installation

```bash
npm install @hyperfixi/vite-plugin @hyperfixi/core
```

## Quick Start

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()]
};
```

```javascript
// main.js
import 'hyperfixi';  // Auto-generated minimal bundle
```

```html
<!-- Just write hyperscript - plugin detects what you use -->
<button _="on click toggle .active">Toggle</button>
```

## How It Works

1. **Scans** your HTML/Vue/Svelte/JSX files for `_="..."` attributes
2. **Detects** which commands, blocks, and expressions you use
3. **Generates** a minimal bundle with only the features you need
4. **Regenerates** on HMR when you add new hyperscript

## Compile Mode (Minimal Bundle Size)

When bundle size is the priority, use **compile mode** to pre-compile hyperscript to JavaScript at build time:

```javascript
hyperfixi({
  mode: 'compile'  // ~500 bytes gzip vs ~8KB for interpret mode
})
```

**Trade-offs:**

| Feature              | Interpret (default) | Compile             |
| -------------------- | ------------------- | ------------------- |
| Bundle size          | ~8 KB gzip          | ~500 bytes gzip     |
| Dynamic `execute()`  | ✓                   | ✗                   |
| Block commands       | ✓                   | ✗                   |
| Build complexity     | Lower               | Higher              |

**When to use compile mode:**

- Landing pages with simple interactions (toggles, shows, hides)
- Performance-critical apps where every KB matters
- Static sites where hyperscript is just for UI polish

**When NOT to use compile mode:**

- Apps using `if`, `repeat`, `fetch`, or `for each` blocks
- Dynamic hyperscript generation at runtime via `execute()`
- Apps that need the full hyperscript power

**Supported commands in compile mode:**
toggle, add, remove, show, hide, focus, blur, set, get, put, increment, decrement, log, send, trigger, wait

**Positional expressions:** next, previous, parent, first, last, closest

## Options

```javascript
hyperfixi({
  // Bundle mode: 'interpret' (default) or 'compile'
  mode: 'interpret',

  // Extra commands to always include (for dynamic hyperscript)
  extraCommands: ['fetch', 'put'],
  extraBlocks: ['for'],

  // Always include positional expressions
  positional: true,

  // Enable htmx attribute compatibility
  htmx: true,

  // Debug logging
  debug: true,

  // File patterns
  include: /\.(html|vue|svelte|jsx|tsx)$/,
  exclude: /node_modules/,

  // Custom bundle name (shown in generated code comments)
  bundleName: 'MyApp',

  // Global variable name (default: 'hyperfixi')
  globalName: 'hyperfixi',
})
```

## Detected Features

### Commands (21)

toggle, add, remove, removeClass, show, hide, set, get, put, append, take,
increment, decrement, log, send, trigger, wait, transition, go, call, focus, blur, return

### Blocks (5)

if, repeat, for, while, fetch

### Positional Expressions (6)

first, last, next, previous, closest, parent

## Virtual Module

The plugin creates a virtual module that you can import:

```javascript
// All of these work:
import 'hyperfixi';
import 'virtual:hyperfixi';
import '@hyperfixi/core';  // Redirects to virtual module
```

## HMR Support

When you add new hyperscript to your HTML files, the plugin:
1. Re-scans the changed file
2. Updates the aggregated usage
3. Triggers a page reload if new commands are detected

## Bundle Size Comparison

| Usage | Generated Size (gzip) | vs Full Bundle |
|-------|----------------------|----------------|
| 3 commands | ~5 KB | 90% smaller |
| 6 commands | ~6.5 KB | 85% smaller |
| 9 commands + blocks | ~8 KB | 80% smaller |
| All features | ~40 KB | same |

## Edge Cases

For dynamically generated hyperscript that can't be detected:

```javascript
// This can't be detected by static analysis
element.setAttribute('_', `on click ${dynamicCommand} .active`);
```

Use `extraCommands` to include those:

```javascript
hyperfixi({
  extraCommands: ['toggle', 'add', 'remove']
})
```

## Supported File Types

- `.html`, `.htm`
- `.vue` (single file components)
- `.svelte`
- `.jsx`, `.tsx`
- `.astro`
- `.php`, `.erb`, `.ejs`, `.hbs`

## Monorepo Development

When developing in the hyperfixi monorepo:

```javascript
// vite.config.js
import { hyperfixi } from '../../packages/vite-plugin/src/index.ts';
import path from 'path';

export default {
  plugins: [hyperfixi({ debug: true })],
  resolve: {
    alias: {
      '@hyperfixi/core/parser/hybrid': path.resolve(__dirname, '../../packages/core/src/parser/hybrid')
    }
  }
};
```

## Example

See the [vite-plugin-test](../../examples/vite-plugin-test/) example for a working demo:

```bash
cd examples/vite-plugin-test
npm install
npm run dev
```

## API Reference

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enable debug logging |
| `include` | `RegExp \| string[]` | See below | File patterns to scan |
| `exclude` | `RegExp \| string[]` | `/node_modules/` | File patterns to exclude |
| `extraCommands` | `string[]` | `[]` | Commands to always include |
| `extraBlocks` | `string[]` | `[]` | Blocks to always include |
| `positional` | `boolean` | `false` | Always include positional expressions |
| `htmx` | `boolean` | `false` | Enable htmx integration |
| `bundleName` | `string` | `'ViteAutoGenerated'` | Bundle name in comments |
| `globalName` | `string` | `'hyperfixi'` | Window global name |

### Default Include Pattern

```regex
/\.(html?|vue|svelte|jsx?|tsx?|astro|php|erb|ejs|hbs|handlebars)$/
```

## License

MIT
