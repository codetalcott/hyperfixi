# @lokascript/vite-plugin

Zero-config Vite plugin that automatically generates minimal LokaScript bundles based on detected hyperscript usage.

## Features

- **Zero-config**: Just add the plugin and it works
- **Automatic detection**: Scans HTML, Vue, Svelte, JSX/TSX for `_="..."` attributes
- **Minimal bundles**: Only includes commands and blocks you actually use
- **HMR support**: Re-generates bundle when you add new hyperscript
- **Framework agnostic**: Works with any Vite-based project

## Installation

```bash
npm install @lokascript/vite-plugin @lokascript/core
```

## Quick Start

```javascript
// vite.config.js
import { lokascript } from '@lokascript/vite-plugin';

export default {
  plugins: [lokascript()],
};
```

```javascript
// main.js
import 'lokascript'; // Auto-generated minimal bundle
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
lokascript({
  mode: 'compile', // ~500 bytes gzip vs ~8KB for interpret mode
});
```

**Trade-offs:**

| Feature             | Interpret (default) | Compile         |
| ------------------- | ------------------- | --------------- |
| Bundle size         | ~8 KB gzip          | ~500 bytes gzip |
| Dynamic `execute()` | ✓                   | ✗               |
| Block commands      | ✓                   | ✗               |
| Build complexity    | Lower               | Higher          |

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

**Animations:** Use CSS transitions - toggling classes triggers them automatically. No special `transition` command needed.

## Multilingual & Semantic Parsing

Enable semantic parsing for natural language hyperscript and multilingual support across 13 languages.

### Multilingual Options

| Option           | Type                                               | Default | Description                             |
| ---------------- | -------------------------------------------------- | ------- | --------------------------------------- |
| `semantic`       | `boolean \| 'en' \| 'auto'`                        | `false` | Enable semantic parser                  |
| `languages`      | `string[]`                                         | `[]`    | Explicit language codes to support      |
| `region`         | `'western' \| 'east-asian' \| 'priority' \| 'all'` | auto    | Force a regional bundle                 |
| `grammar`        | `boolean`                                          | `false` | Enable grammar transformation (SOV/VSO) |
| `extraLanguages` | `string[]`                                         | `[]`    | Languages to always include             |

### Supported Languages (13)

- **Western:** en, es, pt, fr, de
- **East Asian:** ja, zh, ko
- **Other:** ar, tr, id, sw, qu

### Usage Examples

```javascript
// Auto-detect languages from source files
lokascript({ semantic: 'auto' });

// English synonyms only (smallest semantic bundle)
lokascript({ semantic: 'en' });

// Explicit languages (selects optimal regional bundle)
lokascript({ languages: ['en', 'es', 'ja'] });

// Force a specific regional bundle
lokascript({ region: 'western' });

// Full multilingual with grammar transformation
lokascript({ semantic: true, grammar: true });
```

### Language Auto-Detection

When `semantic: 'auto'` is set, the plugin scans your hyperscript for non-English keywords:

```html
<!-- Detected as Japanese -->
<button _="on click トグル .active">Toggle</button>

<!-- Detected as Spanish -->
<button _="on click alternar .active">Alternar</button>
```

The plugin automatically selects the smallest bundle that covers all detected languages.

### Semantic Bundle Sizes

| Bundle                 | Gzip Size | Languages             |
| ---------------------- | --------- | --------------------- |
| `semantic: 'en'`       | ~20 KB    | English only          |
| `semantic: 'es'`       | ~16 KB    | Spanish only          |
| `region: 'es-en'`      | ~25 KB    | English + Spanish     |
| `region: 'western'`    | ~30 KB    | en, es, pt, fr, de    |
| `region: 'east-asian'` | ~24 KB    | ja, zh, ko            |
| `region: 'priority'`   | ~48 KB    | 11 priority languages |
| `region: 'all'`        | ~61 KB    | All 13 languages      |

### Tiered Bundle Architecture

```
Level 0: Base HybridParser (default)     4-9 KB gzip
         ↓ semantic: true
Level 1: + Semantic English              +20 KB
         ↓ languages detected/specified
Level 2: + Regional Semantic Bundle      +16-61 KB
         ↓ grammar: true
Level 3: + Grammar Transformation        +68 KB
```

## htmx v4 reactive / streaming surface

The scanner detects `hx-live`, `sse-connect` / `sse-swap`, `ws-connect` / `ws-send`, and `bind <var> to <expr>.<prop>` inside `_=` bodies. When any of those is found in the project, the generated bundle is the `hyperfixi-hx-v4.js` premade bundle (full runtime + `@hyperfixi/reactivity` + htmx-compat auto-installed + SSE/WS).

```html
<!-- Triggers the hx-v4 fallback automatically -->
<div hx-live="put $count into me"></div>
<div sse-connect="/stream" sse-swap="tick" hx-target="#out"></div>
<form ws-send><input name="msg" /></form>
<input _="on input bind $val to me.value" />
```

The slim minimal-bundle generator can't satisfy these features (its parser/runtime doesn't know `live`/`when`/`bind`, doesn't route writes through `notifyGlobalWrite`, and doesn't ship the SSE/WS modules), so the plugin opts into the full hx-v4 bundle for correctness over size. If size matters more, drop the v4 attributes and use plain `_=` / v1-v2 htmx attributes.

## Options

```javascript
lokascript({
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

  // Global variable name (default: 'lokascript')
  globalName: 'lokascript',

  // Multilingual options (see "Multilingual & Semantic Parsing" section)
  semantic: false, // boolean | 'en' | 'auto'
  languages: [], // ['en', 'es', 'ja']
  region: undefined, // 'western' | 'east-asian' | 'priority' | 'all'
  grammar: false, // Enable grammar transformation
  extraLanguages: [], // Languages to always include
});
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
import 'lokascript';
import 'virtual:lokascript';
import '@lokascript/core'; // Redirects to virtual module
```

## HMR Support

When you add new hyperscript to your HTML files, the plugin:

1. Re-scans the changed file
2. Updates the aggregated usage
3. Triggers a page reload if new commands are detected

## Bundle Size Comparison

| Usage               | Generated Size (gzip) | vs Full Bundle |
| ------------------- | --------------------- | -------------- |
| 3 commands          | ~5 KB                 | 90% smaller    |
| 6 commands          | ~6.5 KB               | 85% smaller    |
| 9 commands + blocks | ~8 KB                 | 80% smaller    |
| All features        | ~40 KB                | same           |

## Edge Cases

For dynamically generated hyperscript that can't be detected:

```javascript
// This can't be detected by static analysis
element.setAttribute('_', `on click ${dynamicCommand} .active`);
```

Use `extraCommands` to include those:

```javascript
lokascript({
  extraCommands: ['toggle', 'add', 'remove'],
});
```

## Supported File Types

- `.html`, `.htm`
- `.vue` (single file components)
- `.svelte`
- `.jsx`, `.tsx`
- `.astro`
- `.php`, `.erb`, `.ejs`, `.hbs`

## Monorepo Development

When developing in the lokascript monorepo:

```javascript
// vite.config.js
import { lokascript } from '../../packages/vite-plugin/src/index.ts';
import path from 'path';

export default {
  plugins: [lokascript({ debug: true })],
  resolve: {
    alias: {
      '@lokascript/core/parser/hybrid': path.resolve(
        __dirname,
        '../../packages/core/src/parser/hybrid'
      ),
    },
  },
};
```

## Examples

### Basic Example

See the [vite-plugin-test](../../examples/vite-plugin-test/) example for a basic demo:

```bash
cd examples/vite-plugin-test
npm install
npm run dev
```

### Multilingual Example

See the [vite-plugin-multilingual](../../examples/vite-plugin-multilingual/) example for multilingual features:

```bash
cd examples/vite-plugin-multilingual
npm install
npm run dev
```

This example demonstrates language auto-detection with Japanese, Spanish, and Korean keywords.

## API Reference

### Plugin Options

| Option           | Type                        | Default               | Description                           |
| ---------------- | --------------------------- | --------------------- | ------------------------------------- |
| `debug`          | `boolean`                   | `false`               | Enable debug logging                  |
| `include`        | `RegExp \| string[]`        | See below             | File patterns to scan                 |
| `exclude`        | `RegExp \| string[]`        | `/node_modules/`      | File patterns to exclude              |
| `extraCommands`  | `string[]`                  | `[]`                  | Commands to always include            |
| `extraBlocks`    | `string[]`                  | `[]`                  | Blocks to always include              |
| `positional`     | `boolean`                   | `false`               | Always include positional expressions |
| `htmx`           | `boolean`                   | `false`               | Enable htmx integration               |
| `bundleName`     | `string`                    | `'ViteAutoGenerated'` | Bundle name in comments               |
| `globalName`     | `string`                    | `'lokascript'`        | Window global name                    |
| `semantic`       | `boolean \| 'en' \| 'auto'` | `false`               | Enable semantic parser                |
| `languages`      | `string[]`                  | `[]`                  | Explicit language codes               |
| `region`         | `string`                    | auto                  | Force regional bundle                 |
| `grammar`        | `boolean`                   | `false`               | Enable grammar transformation         |
| `extraLanguages` | `string[]`                  | `[]`                  | Languages to always include           |

### Default Include Pattern

```regex
/\.(html?|vue|svelte|jsx?|tsx?|astro|php|erb|ejs|hbs|handlebars)$/
```

## License

MIT
