# HyperFixi

[![CI](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/hyperfixi/graph/badge.svg)](https://codecov.io/gh/codetalcott/hyperfixi)
[![npm version](https://img.shields.io/npm/v/@hyperfixi/core.svg)](https://www.npmjs.com/package/@hyperfixi/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tree-shakeable [\_hyperscript](https://hyperscript.org) runtime. Human-readable UI behaviors from 7 KB.

## Try It

Save this as an HTML file and open it in your browser:

```html
<!DOCTYPE html>
<html>
  <body>
    <button _="on click toggle .active on me">Toggle</button>

    <button _="on click set my.count to (my.count or 0) + 1 then put 'Clicks: ' + my.count into me">
      Clicks: 0
    </button>

    <button _="on click toggle .hidden on #message">Show/Hide</button>
    <p id="message">Hello from HyperFixi.</p>

    <style>
      .active {
        background: #0066cc;
        color: white;
        border-radius: 4px;
      }
      .hidden {
        display: none;
      }
    </style>
    <script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hybrid-complete.js"></script>
  </body>
</html>
```

No server, no npm, no build step. Just save and open.

## Install

**CDN** (simplest):

```html
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hybrid-complete.js"></script>
```

**Vite** (recommended for production):

```bash
npm install @hyperfixi/vite-plugin
```

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';
export default { plugins: [hyperfixi()] };
```

The plugin scans your files for `_="..."` attributes and generates a minimal bundle with only the commands you use.

## What You Get

- **43 commands** -- toggle, add, remove, set, put, fetch, repeat, if/else, and more
- **\_hyperscript compatible** -- existing hyperscript code works as-is
- **Tree-shakeable** -- ship only the commands you use (1.9 KB to 200 KB)
- **TypeScript types** -- full type safety with comprehensive definitions
- **Optional multilingual** -- write hyperscript in 24 languages ([lokascript.org](https://lokascript.org))
- **Optional htmx compat** -- htmx-like attributes via the `hyperfixi-hx.js` bundle
- **8100+ tests** across all packages

## Package Scopes

- **`@hyperfixi/*`** -- Core engine: runtime, parser, commands, vite-plugin, behaviors
- **`@lokascript/*`** -- Multilingual: semantic parser, i18n grammar, language tools, domain DSLs

Use `@hyperfixi/*` packages. Add `@lokascript/*` only if you need multilingual support.

## Learn More

- [Choosing a bundle](https://hyperfixi.org/guide/bundles/) -- 6 bundles from 1.9 KB to 200 KB
- [Examples gallery](https://hyperfixi.org/examples/) -- 35+ interactive demos
- [Playground](https://hyperfixi.org/playground/) -- live REPL
- [Vite plugin guide](https://hyperfixi.org/guide/vite-plugin/) -- automatic tree-shaking
- [Multilingual support](https://lokascript.org) -- hyperscript in 24 languages
- [DSL framework](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) -- build your own multilingual DSL
- [Architecture](./docs/ARCHITECTURE.md) -- monorepo structure, package map, bundle tiers
- [About this project](./docs/ABOUT.md) -- motivation, experiment notes, current gaps
- [Contributing](./CONTRIBUTING.md)
- [Migration from v1.x](./MIGRATION.md)

## Development

```bash
npm install
npm test --prefix packages/core
npm run build:browser --prefix packages/core
```

## License

MIT
