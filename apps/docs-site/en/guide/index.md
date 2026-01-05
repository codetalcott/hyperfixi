# Getting Started

HyperFixi is a complete hyperscript ecosystem that lets you add interactive behaviors to your HTML with a simple, readable syntax.

## What is HyperFixi?

HyperFixi is a fork and evolution of [_hyperscript](https://hyperscript.org), designed to be:

- **Modular** - Use only what you need with tree-shakeable bundles
- **Multilingual** - Write in your native language (13 languages supported)
- **Server-ready** - Full SSR support with server-side compilation
- **Well-tested** - 2838+ tests with ~85% compatibility with official _hyperscript

## Installation

### Option 1: CDN (Quick Start)

The fastest way to try HyperFixi:

```html
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-browser.js"></script>
```

### Option 2: npm

```bash
npm install @hyperfixi/core
```

```js
import { hyperscript } from '@hyperfixi/core'

// Process all elements with _="..." attributes
hyperscript.processNode(document.body)
```

### Option 3: Vite Plugin (Recommended)

The Vite plugin automatically generates minimal bundles based on the commands you actually use:

```bash
npm install @hyperfixi/core @hyperfixi/vite-plugin
```

```js
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin'

export default {
  plugins: [hyperfixi()]
}
```

```js
// main.js - just import, the plugin handles the rest
import 'hyperfixi'
```

## Your First Hyperscript

Add the `_` attribute to any HTML element:

```html
<button _="on click toggle .active on me">
  Click me
</button>
```

This reads as: "On click, toggle the `.active` class on me (this element)."

### More Examples

**Show/Hide:**
```html
<button _="on click toggle .hidden on #content">
  Toggle Content
</button>
<div id="content">This content can be hidden.</div>
```

**Add class on hover:**
```html
<div _="on mouseenter add .highlight then on mouseleave remove .highlight">
  Hover over me
</div>
```

**Fetch and display:**
```html
<button _="on click fetch /api/greeting then put result into #output">
  Load Greeting
</button>
<div id="output"></div>
```

## Choosing a Bundle

HyperFixi offers multiple bundle sizes to match your needs:

| Bundle | Size (gzip) | Commands | Best For |
|--------|-------------|----------|----------|
| `hyperfixi-lite.js` | 1.9 KB | 8 | Toggle, show/hide, simple interactions |
| `hyperfixi-lite-plus.js` | 2.6 KB | 14 | Basic + form handling, i18n aliases |
| `hyperfixi-hybrid-complete.js` | 6.7 KB | 21+ | Most projects (blocks, expressions) |
| `hyperfixi-browser.js` | 224 KB | 43 | Full parser, all features |

[Learn more about bundle selection →](/en/guide/bundles)

## Next Steps

- [Commands Reference](/en/api/commands/dom) - All 43 commands explained
- [Expressions](/en/guide/expressions) - Selectors, properties, and more
- [Multilingual Support](/en/guide/multilingual) - Write in your native language
- [Cookbook](/en/cookbook/) - Real-world recipes and patterns
