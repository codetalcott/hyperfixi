# @hyperfixi/core

Hyperscript for the browser, in any of 24 human languages, with the tooling around it.

Since 4.0 the engine is [`@hyperfixi/engine`](../engine/README.md): typed, built from modules,
and written against upstream [\_hyperscript](https://hyperscript.org)'s source, with upstream's own
test suite as its acceptance oracle. `@hyperfixi/core` re-exports it and adds the tooling on
subpaths. (Core's own parser and runtime were retired in 4.0; see
[MIGRATION.md](../../MIGRATION.md) for the move from 3.x.)

## Install

The script-tag bundle (34 KB gzipped). It installs as `window._hyperscript` and
`window.hyperfixi`, and reads the document when it is ready:

```html
<script src="https://unpkg.com/@hyperfixi/core/dist/hyperfixi.js"></script>
<button _="on click toggle .active on me">Toggle</button>
```

`dist/hyperfixi.js` is the engine's `hyperfixi-hs.js`, the same file under core's name. For
hypermedia attributes, add [fixi](https://github.com/bigskysoftware/fixi) or htmx 4 beside it.

With a bundler, [`@hyperfixi/vite-plugin`](../vite-plugin/README.md) scans your templates and
builds an engine from only the modules they use.

## Use as a library

```sh
npm install @hyperfixi/core
```

The root is `@hyperfixi/engine`, re-exported (ESM only):

```ts
import { register, boot, everything } from '@hyperfixi/core';

register(...everything); // or only the modules a page needs: register(on, toggle)
boot(); // install as window._hyperscript and initialise the document
```

`api` is the object shaped like upstream's `_hyperscript` (`evaluate`, `parse`, `process`,
`config`, `use(plugin)`), and `parse` / `evaluate` / `processNode` are also exported directly. See
the [engine's README](../engine/README.md) for modules and the public API.

## Subpaths

| Import                         | What it is                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hyperfixi/core/browser`      | `dist/hyperfixi.js`, the script-tag bundle                                                                                                                                         |
| `@hyperfixi/core/multilingual` | `parse(code, lang)`, `render(node, lang)`, `translate(code, from, to)` over [`@lokascript/semantic`](../semantic/README.md), loaded on first use                                   |
| `@hyperfixi/core/ast-utils`    | Analysis (complexity, smells, metrics), the interchange AST, `withEnginePositions`, and LSP diagnostics / symbols / hover / completions; the language server and MCP server use it |
| `@hyperfixi/core/lsp-metadata` | Keyword lists and hover docs for editors                                                                                                                                           |
| `@hyperfixi/core/reference`    | The commands, with syntax and examples                                                                                                                                             |
| `@hyperfixi/core/metadata`     | Package and bundle facts (version, size, command count)                                                                                                                            |

The reference and LSP data document the engine and are checked against its grammar
(`npm run verify:reference`): every keyword is an engine keyword, and every example parses on
the engine.

## Hyperscript in other languages

Hyperscript written in any of 24 languages runs on the engine through
[`@lokascript/hyperscript-adapter`](../hyperscript-adapter/README.md), which translates each script
as the engine reads it:

```html
<script src="hyperfixi.js"></script>
<script src="browser.global.js"></script>
<!-- @lokascript/semantic -->
<script src="hyperscript-i18n-lite.global.js"></script>
<!-- @lokascript/hyperscript-adapter -->

<button lang="ko" _="클릭 할 때 .active 를 토글">토글</button>
```

## Development

```bash
npm run build --prefix packages/core          # library entry + subpaths (build the engine first)
npm run build:browser --prefix packages/core  # dist/hyperfixi.js, copied from the engine
npm test --prefix packages/core               # unit tests (ast-utils, multilingual, dist charset)
npm run verify:reference --prefix packages/core
cd packages/core && npx playwright test browser-tests/   # the browser suite, on the engine's bundle
```

## License

MIT
