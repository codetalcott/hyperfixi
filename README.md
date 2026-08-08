# HyperFixi / LokaScript

[![CI](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/hyperfixi/graph/badge.svg)](https://codecov.io/gh/codetalcott/hyperfixi)
[![npm version](https://img.shields.io/npm/v/@hyperfixi/core.svg)](https://www.npmjs.com/package/@hyperfixi/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A multilingual programming-language engine.** Write
[\_hyperscript](https://hyperscript.org) UI behaviors in any of 24 languages —
with real grammar, not keyword swaps — and get back verified-equivalent code.
Built on a tree-shakeable \_hyperscript runtime the translations must survive
execution on.

```text
English (SVO):   toggle .active on #button
Japanese (SOV):  #button で .active を トグル
Arabic  (VSO):   بدّل .active على #button
German  (V2):    schalte .active auf #button um
```

All four parse to the same semantic structure — same command, patient
`.active`, destination `#button` — execute identically, and translate between
each other. Word order, case particles, agglutinative suffixes, and script
direction are handled by per-language grammar profiles — 24 languages, one
intermediate representation.

Two writeups cover what makes this hard and how it stays honest:

- **[Word order across 24 languages](docs/WORD-ORDER.md)** — the linguistic
  phenomena the semantic engine solves (verb-medial commands, fronted markers,
  nested-block bodies, agglutinative tokenization, homonym disambiguation),
  each tied to an executable guard test.
- **[Structural fidelity](docs/FIDELITY.md)** — how an eleven-signal
  recall/precision/role/value/execution ratchet catches _silent meaning-drops_
  that text-diff and parse-success both miss. A transferable methodology for
  any meaning-preserving transform (i18n of program structure, codegen, AST
  migrations). Current corpus: **3,744/3,744 faithful** across the 24 priority
  languages (per the committed baseline).

The same framework generalizes past hyperscript: nine domain DSLs (SQL, BDD,
JSX, LLM prompts, voice commands, reactive flows, …) are built on it, each
multilingual from day one — see the
[DSL author guide](packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md).

## Try the runtime

The substrate is a real, tree-shakeable \_hyperscript engine — also the fastest
on-ramp. Save this as an HTML file and open it — or
[try it live](https://hyperfixi.org/try/).

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

## Try it multilingual

```html
<script src="https://unpkg.com/@lokascript/semantic/dist/lokascript-semantic.browser.global.js"></script>
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi-multilingual.js"></script>
<script>
  await hyperfixi.execute('토글 .active', 'ko'); // Korean
  const korean = await hyperfixi.translate('toggle .active', 'en', 'ko');
</script>
```

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

- **24-language authoring** — semantic parsing + SOV/VSO/V2 grammar transformation ([lokascript.org](https://lokascript.org))
- **Verified translation** — the fidelity ratchet gates every change on structural equivalence, not parse success
- **A real \_hyperscript runtime** — 43 commands; existing hyperscript code works as-is
- **Tree-shakeable** — ship only the commands you use (1.9 KB lite to ~310 KB full)
- **TypeScript types** — full type safety with comprehensive definitions
- **A DSL framework** — build your own multilingual DSL on the same engine
- **Optional htmx compat** — htmx-like attributes via the `hyperfixi-hx.js` bundle
- **14,000+ tests** across the monorepo

## Package Scopes

- **`@lokascript/*`** — the multilingual engine: semantic parser, i18n grammar, DSL framework, domain DSLs, language tools
- **`@hyperfixi/*`** — the hyperscript substrate: runtime, parser, commands, vite-plugin, behaviors

Only need English hyperscript? Use `@hyperfixi/*` alone — the multilingual
layer is fully optional and costs nothing when absent.

## Learn More

- [Multilingual support](https://lokascript.org) — hyperscript in 24 languages
- [Choosing a bundle](https://hyperfixi.org/guide/bundles/) — bundles from 1.9 KB (lite) to ~310 KB (full)
- [Examples gallery](https://hyperfixi.org/examples/) — 35+ interactive demos
- [Playground](https://hyperfixi.org/playground/) — live REPL
- [Vite plugin guide](https://hyperfixi.org/guide/vite-plugin/) — automatic tree-shaking

**Going deeper:**

- [Architecture](./docs/ARCHITECTURE.md) — monorepo structure, package map, bundle tiers
- [DSL framework](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) — build your own multilingual DSL
- [About this project](./docs/ABOUT.md) — motivation, design position, current gaps
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
