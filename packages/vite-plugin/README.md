# @hyperfixi/vite-plugin

Zero-config Vite plugin that emits a bundle on [`@hyperfixi/engine`](../engine/README.md) registering only the grammar modules your hyperscript uses.

## Features

- **Zero-config**: Just add the plugin and it works
- **Automatic detection**: Scans HTML, Vue, Svelte, JSX/TSX for `_="..."` attributes
- **Minimal bundles**: Registers only the engine modules your commands and blocks need (17.9 KB gzipped for three commands, 34.4 KB for everything)
- **Upstream's grammar**: The engine is gated by `_hyperscript`'s own test suite, so what works on `hyperfixi-hs.js` works in the generated bundle
- **Multilingual**: Non-English scripts are translated as the engine reads them (the attribute stays as written)
- **HMR support**: Re-generates bundle when you add new hyperscript
- **Framework agnostic**: Works with any Vite-based project

## Installation

```bash
npm install @hyperfixi/vite-plugin @hyperfixi/engine
```

## Quick Start

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

```javascript
// main.js
import 'hyperfixi'; // the generated bundle: the engine + your modules
```

```html
<!-- Just write hyperscript - plugin detects what you use -->
<button _="on click toggle .active">Toggle</button>
```

## How It Works

1. **Scans** your HTML/Vue/Svelte/JSX files for `_="..."` attributes
2. **Detects** which commands, blocks, and expression kinds you use
3. **Emits** a bundle on [`@hyperfixi/engine`](../engine/README.md) that registers only
   the grammar modules those need — a bundle on the engine is the list passed to
   `register()`, so there is one tier: the modules. The emitted module is a few
   lines; Vite bundles the engine's modules into it.
4. **Regenerates** on HMR when you add new hyperscript

```javascript
// What the virtual module looks like for a page using toggle, add and an if block
import {
  api,
  boot,
  register,
  on,
  conversions,
  add,
  toggle,
  ifCommand,
  toggleElement,
} from '@hyperfixi/engine';
register(on, conversions, add, toggle, ifCommand, toggleElement);
window.hyperfixi = api; // the same object boot() installs as window._hyperscript
boot();
export default api;
```

The engine's parser is upstream `_hyperscript`'s grammar (its vendored test suite
is the gate), so a generated bundle reads exactly what `hyperfixi-hs.js` reads;
only the command set differs. Scanning is by word, so a name the engine has no
module for (a false positive in a string, or a form the engine dropped) selects
nothing; `debug: true` lists them.

## Compile Mode (parked)

`mode: 'compile'` pre-compiled handlers to JavaScript with `@hyperfixi/core`'s hybrid
parser (~500 bytes for a page of toggles). It is **parked** with the AOT compiler
(owner decision 2026-10-03): it still runs on `@hyperfixi/core` 3.x and leaves with
core's parser at 4.0. Selecting it logs a warning. The engine-module bundle above is
the product; measure before reaching for compile mode.

## Multilingual & Semantic Parsing

Enable semantic parsing for natural language hyperscript and multilingual support across 24 languages.

### Multilingual Options

| Option           | Type                                               | Default | Description                             |
| ---------------- | -------------------------------------------------- | ------- | --------------------------------------- |
| `semantic`       | `boolean \| 'en' \| 'auto'`                        | `false` | Enable semantic parser                  |
| `languages`      | `string[]`                                         | `[]`    | Explicit language codes to support      |
| `region`         | `'western' \| 'east-asian' \| 'priority' \| 'all'` | auto    | Force a regional bundle                 |
| `grammar`        | `boolean`                                          | `false` | Add `translateHyperscript()` to the API |
| `extraLanguages` | `string[]`                                         | `[]`    | Languages to always include             |

### Supported Languages (24)

- **Western (Latin script):** en, es, pt, fr, de, it, vi
- **Slavic:** pl, ru, uk
- **East Asian:** ja, zh, ko
- **RTL:** ar, he
- **South Asian:** hi, bn
- **Southeast Asian:** th
- **Agglutinative Latin:** tr
- **Other:** id, ms, sw, qu, tl

### Usage Examples

```javascript
// Auto-detect languages from source files
hyperfixi({ semantic: 'auto' });

// English synonyms only (smallest semantic bundle)
hyperfixi({ semantic: 'en' });

// Explicit languages (selects optimal regional bundle)
hyperfixi({ languages: ['en', 'es', 'ja'] });

// Force a specific regional bundle
hyperfixi({ region: 'western' });

// Semantic parsing plus translateHyperscript(code, from, to)
hyperfixi({ semantic: true, grammar: true });
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

| Bundle                    | Languages                                                        |
| ------------------------- | ---------------------------------------------------------------- |
| `semantic: 'en'`          | English only                                                     |
| `languages: ['es']`       | Spanish only                                                     |
| `languages: ['en', 'es']` | English + Spanish                                                |
| `region: 'western'`       | en, es, pt, fr, de, it                                           |
| `region: 'east-asian'`    | ja, zh, ko                                                       |
| `region: 'priority'`      | 13 languages: en, es, pt, fr, de, it, ja, zh, ko, ar, tr, ru, hi |
| `region: 'all'`           | All 24 languages                                                 |

English is always included as the fallback. The generated code imports
`@lokascript/semantic/core` plus one `@lokascript/semantic/languages/<code>` module
per language, so the final size depends on Vite's tree-shaking; for reference, the
prebuilt standalone semantic bundles range from ~90 KB (no languages) to ~260 KB
(all 24 languages) gzipped, measured locally — see `docs/BROWSER_BUNDLES.md` in the repo.

### How the multilingual bundle works

Text is the interchange. When semantic parsing is enabled the emitted bundle imports
`@lokascript/semantic/core` plus one `@lokascript/semantic/languages/<code>` module
per language and installs a **source transform** on the engine
(`api.addSourceTransform`): a non-English script is parsed in its language and
rendered to English as the engine reads it, and the element's attribute stays as
written. The language comes from `data-lang`, `data-hyperscript-lang`, the nearest
`lang` ancestor, or the document's `lang`. English scripts pass through untouched.

The API gains `translateSource(src, element)` (what the transform does, for one
script) and, with `grammar: true`, `translateHyperscript(code, from, to)`.

Measured 2026-10-03, gzipped: three commands + Spanish is ~209 KB, of which the
engine is 18 KB — the rest is semantic's parser and the language. Keep the language
list to what the page uses.

## Reactivity, htmx, and streaming

`live … end`, `when … changes`, `bind` and `^var` inside `_=` bodies are the
engine's reactive features: the scanner detects them and the bundle registers the
engine's `reactivity` and `liveTemplates` modules (+2 KB gzipped). No separate
bundle, no separate package.

htmx is not bundled. Load htmx 4 beside the generated bundle for `hx-get` and
friends, `hx-sse` / `hx-ws` for streams, and
[`@lokascript/htmx-adapter`](../htmx-adapter/README.md) for localized attribute
names (the two stacks in [docs/BROWSER_BUNDLES.md](../../docs/BROWSER_BUNDLES.md)).
When the scan finds htmx attributes (or `htmx: true` is set) the bundle hands
swapped-in content to the engine on `htmx:load` / `htmx:afterSettle`. A
hyperscript-bodied `hx-live` attribute is a `_="live … end"` block on the engine;
`sse-connect` / `ws-connect` are htmx 4's `hx-sse` / `hx-ws`.

## Options

```javascript
hyperfixi({
  // Bundle mode: 'interpret' (default); 'compile' is parked (see above)
  mode: 'interpret',

  // Extra commands to always include (for dynamic hyperscript)
  extraCommands: ['fetch', 'put'],
  extraBlocks: ['for'],

  // Always include positional expressions
  positional: true,

  // Hand htmx-swapped content to the engine (on by default when hx-* attributes are found)
  htmx: true,

  // Dev-server bundle: 'everything' (the whole engine, faster rebuilds) or 'auto' (the module list)
  devFallback: 'auto',

  // Debug logging
  debug: true,

  // File patterns
  include: /\.(html|vue|svelte|jsx|tsx)$/,
  exclude: /node_modules/,

  // Custom bundle name (shown in generated code comments)
  bundleName: 'MyApp',

  // Global variable name (default: 'hyperfixi')
  globalName: 'hyperfixi',

  // Multilingual options (see "Multilingual & Semantic Parsing" section)
  semantic: false, // boolean | 'en' | 'auto'
  languages: [], // ['en', 'es', 'ja']
  region: undefined, // 'western' | 'east-asian' | 'priority' | 'all'
  grammar: false, // Add translateHyperscript() to the API (implies semantic)
  extraLanguages: [], // Languages to always include
});
```

## Detected Features

The scanner's word list is **derived from the engine** at load: every command and
feature keyword its modules register (`add`, `call`, `for`, `tell`, `make`, …).
Blocks: `if`, `repeat`, `for`, `while`, `fetch`. Expression kinds that select the
engine's optional `expressionsExtra` module: `first`, `last`, `next`, `previous`,
`closest`, `parent`, `random`, `where`, `sorted by`, `mapped to`, `split by`,
`joined by`, `some`, `beep!`. Also `new X(…)` (the engine's `construct`
addition) and `cookies`. `on` and the `as` conversions are always registered.

## Virtual Module

The plugin creates a virtual module that you can import:

```javascript
// All of these work:
import 'hyperfixi';
import 'virtual:hyperfixi';
import '@hyperfixi/core'; // Redirects to virtual module
```

## HMR Support

When you add new hyperscript to your HTML files, the plugin:

1. Re-scans the changed file
2. Updates the aggregated usage
3. Triggers a page reload if new commands are detected

## Bundle Size Comparison

Measured 2026-10-03 (esbuild, minified, gzipped; `@hyperfixi/engine` 3.3.0):

| Usage                                                | Generated size (gzip) |
| ---------------------------------------------------- | --------------------- |
| 3 commands (toggle, add, remove)                     | 17.9 KB               |
| 7 commands (+ show, hide, put, set)                  | 18.7 KB               |
| 5 commands + `if` / `repeat`                         | 19.6 KB               |
| 10 commands + `if` / `repeat` / `fetch` + positional | 22.8 KB               |
| + reactivity (`live` / `when` / `bind`)              | 20.3 KB               |
| everything (the dev fallback; = `hyperfixi-hs.js`)   | 34.4 KB               |

The engine's fixed cost (tokenizer, parser, the core expression kinds, runtime) is
13.8 KB, so there is no sub-5 KB tier any more: the 3.x generator's regex "lite"
parser emitted 3.9 KB for three commands, its hybrid parser 12–16 KB, and any page
using `fetch` or one of twenty other commands fell back to the 352 KB `hyperfixi.js`.
What you get in exchange is one grammar, gated by upstream's own test suite.

## Edge Cases

For dynamically generated hyperscript that can't be detected:

```javascript
// This can't be detected by static analysis
element.setAttribute('_', `on click ${dynamicCommand} .active`);
```

Use `extraCommands` to include those:

```javascript
hyperfixi({
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

When developing in the hyperfixi monorepo, point the plugin at its source; the
emitted bundle's `@hyperfixi/engine` import resolves through the workspace
(build the engine first: `npm run build --prefix packages/engine`):

```javascript
// vite.config.js
import { hyperfixi } from '../../packages/vite-plugin/src/index.ts';

export default {
  plugins: [hyperfixi({ debug: true })],
  optimizeDeps: { exclude: ['hyperfixi', 'virtual:hyperfixi'] },
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
| `globalName`     | `string`                    | `'hyperfixi'`         | Window global name                    |
| `semantic`       | `boolean \| 'en' \| 'auto'` | `false`               | Enable semantic parser                |
| `languages`      | `string[]`                  | `[]`                  | Explicit language codes               |
| `region`         | `string`                    | auto                  | Force regional bundle                 |
| `grammar`        | `boolean`                   | `false`               | Add `translateHyperscript()` to API   |
| `extraLanguages` | `string[]`                  | `[]`                  | Languages to always include           |

### Default Include Pattern

```regex
/\.(html?|vue|svelte|jsx?|tsx?|astro|php|erb|ejs|hbs|handlebars)$/
```

## License

MIT
