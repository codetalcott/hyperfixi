# HyperFixi

[![CI](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/hyperfixi/graph/badge.svg)](https://codecov.io/gh/codetalcott/hyperfixi)
[![npm version](https://img.shields.io/npm/v/@hyperfixi/core.svg)](https://www.npmjs.com/package/@hyperfixi/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tree-shakeable [\_hyperscript](https://hyperscript.org) runtime. Human-readable UI behaviors from 1.9 KB.

## Try It

Save this as an HTML file and open it in your browser — or [try it live](https://hyperfixi.org/try/).

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <button _="on click toggle .active on me">Toggle</button>

    <button
      _="on click
        set my.count to (my.count or 0) + 1
        then put 'Clicks: ' + my.count into me"
    >
      Clicks: 0
    </button>

    <button _="on click toggle @hidden on #message">Show/Hide</button>
    <p id="message">Hello from HyperFixi.</p>

    <style>
      .active {
        background: #0066cc;
        color: white;
        border-radius: 4px;
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
- **Tree-shakeable** -- ship only the commands you use (1.9 KB lite to ~299 KB full)
- **TypeScript types** -- full type safety with comprehensive definitions
- **Optional multilingual** -- write hyperscript in 24 languages ([lokascript.org](https://lokascript.org))
- **Optional htmx compat** -- htmx-like attributes via the `hyperfixi-hx.js` bundle
- **8100+ tests** across all packages

## Package Scopes

- **`@hyperfixi/*`** -- Core engine: runtime, parser, commands, vite-plugin, behaviors
- **`@lokascript/*`** -- Multilingual: semantic parser, i18n grammar, language tools, domain DSLs

Use `@hyperfixi/*` packages. Add `@lokascript/*` only if you need multilingual support.

## Under the Hood: the Multilingual Engine

The optional `@lokascript/*` layer lets you author hyperscript in 24 languages with
real SOV/VSO/V2 **word-order transformation** — and, unusually, it **proves** the
translation preserved meaning rather than merely "parsed". Two writeups go deep:

- **[Word order across 24 languages](docs/WORD-ORDER.md)** -- the linguistic
  phenomena the semantic engine solves (verb-medial commands, fronted markers,
  nested-block bodies, agglutinative tokenization, homonym disambiguation), each
  tied to an executable guard test.
- **[Structural fidelity](docs/FIDELITY.md)** -- how a recall/precision/role/execution
  ratchet catches _silent meaning-drops_ that text-diff and parse-success both miss.
  A transferable methodology for any meaning-preserving transform (i18n of program
  structure, codegen, AST migrations).

## Learn More

- [Choosing a bundle](https://hyperfixi.org/guide/bundles/) -- bundles from 1.9 KB (lite) to ~299 KB (full)
- [Examples gallery](https://hyperfixi.org/examples/) -- 35+ interactive demos
- [Playground](https://hyperfixi.org/playground/) -- live REPL
- [Vite plugin guide](https://hyperfixi.org/guide/vite-plugin/) -- automatic tree-shaking
- [Multilingual support](https://lokascript.org) -- hyperscript in 24 languages

**Going deeper:**

- [Architecture](./docs/ARCHITECTURE.md) -- monorepo structure, package map, bundle tiers
- [DSL framework](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) -- build your own multilingual DSL
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
