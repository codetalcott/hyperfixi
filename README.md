# HyperFixi

[![CI](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml/badge.svg)](https://github.com/codetalcott/hyperfixi/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/codetalcott/hyperfixi/graph/badge.svg)](https://codecov.io/gh/codetalcott/hyperfixi)
[![npm version](https://img.shields.io/npm/v/@hyperfixi/core.svg)](https://www.npmjs.com/package/@hyperfixi/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modular [\_hyperscript](https://hyperscript.org) engine, built against upstream's own test suite. Human-readable UI behaviors from 18 KB gzipped (34 KB with everything) — and a **verifiable target for LLM agents**: generated code that parses or fails with structured diagnostics, checked by a real parser, renderable into 24 human languages for review.

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
    <script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
  </body>
</html>
```

No server, no npm, no build step. Just save and open.

## Install

**Vite** — the default. One plugin, zero options: it scans your files for `_="..."` attributes and emits a bundle with only the engine modules you use.

```bash
npm install @hyperfixi/vite-plugin
```

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';
export default { plugins: [hyperfixi()] };
```

**Script tag** — the engine's bundle, hyperscript with every module (~34 KB gz):

```html
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
```

For hypermedia attributes, add [fixi](https://github.com/bigskysoftware/fixi) or htmx 4 beside it
(and `@lokascript/htmx-adapter` for `hx-*` names in other languages); the engine runs the
hyperscript in content they swap in. `@hyperfixi/core` ships the
same file as `dist/hyperfixi.js`; core's own bundles (the ~352 KB `hyperfixi.js`, `hyperfixi-hx.js`,
`hyperfixi-multilingual.js`) retired in the 4.0 cycle.

## For LLM Agents

An agent emitting hyperscript instead of free-form JavaScript gets properties JS can't offer: every candidate **parses or fails with structured diagnostics** (a real parser, no LLM in the checker), the parse comes back as a **semantic IR** to check against intent, `diff_behaviors` compares two snippets **command by command and role by role** (across languages too), and the result renders **deterministically into 24 languages** so a human can review the agent's work in their own language — [measured, with the residual published](docs/FIDELITY.md).

The MCP server (`@hyperfixi/mcp-server`) exposes the whole loop: generate → `validate_and_compile` → repair from diagnostics → the hyperscript, as is, in an `_="..."` attribute. See **[AGENTS.md](./AGENTS.md)** for the worked example and ground rules.

## What You Get

- **53 commands** -- toggle, add, remove, set, put, fetch, repeat, if/else, and more
- **\_hyperscript compatible** -- the engine passes 1,450 of the 1,498 tests in upstream \_hyperscript 0.9.93's own suite; the rest are [listed](./packages/engine/upstream-suite/known-failures.json)
- **Tree-shakeable** -- the Vite plugin ships only the engine modules you use (18–34 KB gz); `hyperfixi-hs.js` is ~34 KB
- **TypeScript types** -- the engine is written in TypeScript and ships its types
- **Agent-ready** -- MCP server with a deterministic validate/repair/compile loop ([AGENTS.md](./AGENTS.md))
- **Optional multilingual** -- read and write hyperscript in 24 languages ([lokascript.org](https://lokascript.org))
- **htmx alongside** -- real htmx 4 or fixi beside the engine; `@lokascript/htmx-adapter` localizes `hx-*` names

## Package Scopes

- **`@hyperfixi/*`** -- the engine and what is built on it: `engine`, `core` (the engine plus tooling), `vite-plugin`, `behaviors`, `mcp-server`
- **`@lokascript/*`** -- multilingual: the semantic parser, vocabulary, the adapters that run non-English hyperscript on the engine or on upstream \_hyperscript, and the DSL framework
- **`@hyperscript-tools/*`** -- the same multilingual tools packaged for projects on upstream \_hyperscript

Use `@hyperfixi/*` packages. Add `@lokascript/*` only if you need multilingual support. The domain DSLs built on the framework live in [lokascript-domains](https://github.com/codetalcott/lokascript-domains).

## Under the Hood: the Multilingual Engine

The optional `@lokascript/*` layer lets you author hyperscript in 24 languages with
real SOV/VSO **word-order transformation**, and it checks that a translation preserved
the script's structure rather than merely "parsed": a translation that would lose part of a
script is refused. (The vocabulary is another matter: most languages have not been reviewed by
native speakers.) Two writeups go deep:

- **[Word order across 24 languages](docs/WORD-ORDER.md)** -- the linguistic
  phenomena the semantic engine solves (verb-medial commands, fronted markers,
  nested-block bodies, agglutinative tokenization, homonym disambiguation), each
  tied to an executable guard test.
- **[Structural fidelity](docs/FIDELITY.md)** -- how a recall/precision/role/execution
  ratchet catches _silent meaning-drops_ that text-diff and parse-success both miss.
  A transferable methodology for any meaning-preserving transform (i18n of program
  structure, codegen, AST migrations).

## Learn More

- [Choosing a bundle](https://hyperfixi.org/guide/bundles/) -- one 34 KB script-tag bundle, or the Vite plugin's 18–34 KB
- [Examples gallery](https://hyperfixi.org/examples/) -- 35+ interactive demos
- [Playground](https://hyperfixi.org/playground/) -- live REPL
- [Vite plugin guide](https://hyperfixi.org/guide/vite-plugin/) -- automatic tree-shaking
- [Multilingual support](https://lokascript.org) -- hyperscript in 24 languages

**Going deeper:**

- [AGENTS.md](./AGENTS.md) -- emitting hyperscript from an LLM agent: the validate/repair/compile loop
- [Architecture](./docs/ARCHITECTURE.md) -- monorepo structure, package map, bundle tiers
- [DSL framework](./packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) -- build your own multilingual DSL
- [About this project](./docs/ABOUT.md) -- motivation, experiment notes, current gaps
- [Contributing](./CONTRIBUTING.md)
- [Migration between majors](./MIGRATION.md)

## Development

```bash
npm install
npm run build --prefix packages/engine
npm run test:own --prefix packages/engine   # the engine's own tests
npm run test:check                           # every package's suite, summarised
```

## License

MIT
