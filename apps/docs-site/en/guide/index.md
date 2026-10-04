# Getting Started

LokaScript is a complete hyperscript ecosystem that lets you add interactive behaviors to your HTML with a simple, readable syntax.

## What is LokaScript?

LokaScript is a fork and evolution of [\_hyperscript](https://hyperscript.org), designed to be:

- **Modular** - Use only what you need with tree-shakeable bundles
- **Multilingual** - Write in your native language (13 languages supported)
- **Server-ready** - Full SSR support with server-side compilation
- **Well-tested** - 2838+ tests with ~85% compatibility with official \_hyperscript

## Installation

### Option 1: CDN (Quick Start)

The fastest way to try LokaScript:

```html
<script src="https://unpkg.com/@lokascript/core/dist/lokascript-browser.js"></script>
```

### Option 2: npm

```bash
npm install @lokascript/core
```

```js
import { hyperscript } from '@lokascript/core';

// Process all elements with _="..." attributes
hyperscript.processNode(document.body);
```

### Option 3: Vite Plugin (Recommended)

The Vite plugin automatically generates minimal bundles based on the commands you actually use:

```bash
npm install @lokascript/core @lokascript/vite-plugin
```

```js
// vite.config.js
import { hyperfixi } from '@lokascript/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

```js
// main.js - just import, the plugin handles the rest
import 'hyperfixi';
```

## Your First Hyperscript

Add the `_` attribute to any HTML element:

```html
<button _="on click toggle .active on me">Click me</button>
```

This reads as: "On click, toggle the `.active` class on me (this element)."

### More Examples

**Show/Hide:**

```html
<button _="on click toggle .hidden on #content">Toggle Content</button>
<div id="content">This content can be hidden.</div>
```

**Add class on hover:**

```html
<div _="on mouseenter add .highlight then on mouseleave remove .highlight">Hover over me</div>
```

**Fetch and display:**

```html
<button _="on click fetch /api/greeting then put result into #output">Load Greeting</button>
<div id="output"></div>
```

## Choosing a Bundle

LokaScript offers multiple bundle sizes to match your needs:

| Bundle                                 | Size (gzip) | Use Case                                                                      |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| via **`@hyperfixi/vite-plugin`**       | 18–34 KB    | Vite projects: registers only the engine modules your pages use               |
| **`hyperfixi-hs.js`** (engine)         | ~34 KB      | Script tag: hyperscript only, every module, `live` / `when` / `bind` built in |
| **`hyperfixi.js`** (`@hyperfixi/core`) | ~352 KB     | Core's everything bundle, until the engine replaces it in 4.0                 |

The 3.x small prebuilts (`lite`, `hybrid-complete`, `hyperfixi-hx.js`, …) are retired; see
[Bundle Selection](/en/guide/bundles).

[Learn more about bundle selection →](/en/guide/bundles)

## Next Steps

- [Commands Reference](/en/api/commands/dom) - All 43 commands explained
- [Expressions](/en/guide/expressions) - Selectors, properties, and more
- [Multilingual Support](/en/guide/multilingual) - Write in your native language
- [Cookbook](/en/cookbook/) - Real-world recipes and patterns
