# API Reference

`@hyperfixi/core` 4.0. The root is [`@hyperfixi/engine`](../../engine/README.md), re-exported;
the tooling is on subpaths. (The 3.x API — `hyperscript.compileSync` / `eval` / `validate`,
`createRuntime`, `createContext`, `debugControl`, the `/commands`, `/expressions`, `/parser/*`,
`/registry`, `/behaviors`, `/bundle-generator` and `/lse` subpaths — left with core's own engine
in 4.0; [MIGRATION.md](../../../MIGRATION.md) maps each to its replacement.)

## Table of Contents

- [The root: the engine](#the-root-the-engine)
- [`/browser`](#browser)
- [`/multilingual`](#multilingual)
- [`/ast-utils`](#ast-utils)
- [`/lsp-metadata`, `/reference`, `/metadata`](#lsp-metadata-reference-metadata)

## The root: the engine

```ts
import { register, boot, everything, on, toggle, api } from '@hyperfixi/core';
```

ESM only. Every export of `@hyperfixi/engine`'s library entry, plus `VERSION`:

| Export                                                                 | What it is                                                                                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register(...modules)`                                                 | Add grammar modules to the engine. A command or feature that is not registered does not exist; a script that uses it fails to parse                                                    |
| `everything`                                                           | Every module (what the script-tag bundle registers)                                                                                                                                    |
| `on`, `toggle`, `add`, `put`, `fetchCommand`, …                        | The modules, one per command group, feature, or optional expression kind                                                                                                               |
| `boot()`                                                               | Install the engine as `window._hyperscript` and process the document when it is ready                                                                                                  |
| `processNode(node)` / `cleanup(element)`                               | Initialise the `_` / `script type="text/hyperscript"` scripts in a subtree; tear an element's handlers down                                                                            |
| `evaluate(src, overrides?)`                                            | Run source against a context; synchronous unless the source waits                                                                                                                      |
| `parse(src)` / `parseProgram(src)`                                     | Parse free-standing source (commands, features or one expression) / an element's script. Both throw `ParseError`                                                                       |
| `api`                                                                  | The public object, shaped like upstream's `_hyperscript`: `evaluate`, `parse` (returns `{ errors }`), `process`, `config`, `use(plugin)`, `addBeforeProcessHook`, `addSourceTransform` |
| `config`, `grammar`, `createGrammar`, `ParseError`, `tokenize`, `expr` | Runtime configuration; the grammar registry; the parse error; the lexer; the expression rule for modules written elsewhere                                                             |
| `VERSION`                                                              | The package version                                                                                                                                                                    |

```ts
import { register, boot, on, add, remove, toggle } from '@hyperfixi/core';

register(on, add, remove, toggle);
boot();
```

A parse error names where the engine stopped:

```ts
import { api } from '@hyperfixi/core';

api.parse('on click toggle .active on').errors[0]?.message;
```

The [engine's README](../../engine/README.md) describes modules, writing a module in another
package (`@hyperfixi/speech` does), and `addSourceTransform`, the hook the multilingual adapter
uses.

## `/browser`

`dist/hyperfixi.js`: the script-tag bundle, every module, installed as `window._hyperscript` and
`window.hyperfixi`. It is the engine's `hyperfixi-hs.js` under core's name.

## `/multilingual`

```ts
import { parse, render, translate } from '@hyperfixi/core/multilingual';

const node = await parse('#button の .active を 切り替え', 'ja'); // a semantic node, or null
const arabic = node && (await render(node, 'ar'));
const english = await translate('alternar .active', 'es', 'en'); // the input, if it cannot translate
```

Three functions over `@lokascript/semantic`, which is loaded on first use. Text is the
interchange: a translation is hyperscript the engine (or upstream \_hyperscript) reads. To run
non-English hyperscript on a page, use `@lokascript/hyperscript-adapter`.

## `/ast-utils`

Analysis and editor support on the interchange AST — the nodes `@lokascript/semantic`'s
`fromSemanticAST` builds:

- **Analysis:** `calculateComplexity`, `calculateCyclomatic`, `calculateCognitive`,
  `analyzeMetrics`, `detectCodeSmells`, `suggestOptimizations`; a visitor, query and transformer.
- **Positions:** `withEnginePositions(nodes, source, engineTree)` gives the nodes source
  positions from the engine's parse.
- **LSP:** `interchangeToLSPDiagnostics`, `…Symbols`, `…Hover`, `…Completions`.

The language server and the MCP server are its consumers.

## `/lsp-metadata`, `/reference`, `/metadata`

- **`/lsp-metadata`:** `COMMAND_KEYWORDS`, `FEATURE_KEYWORDS`, the expression keyword lists,
  `ALL_KEYWORDS`, `HOVER_DOCS`, `EVENT_NAMES`.
- **`/reference`:** `commands` (the engine's 53, each with syntax and examples),
  `searchCommands`, `getCommandsByCategory`, `bundles`, `patterns`, `searchPatterns`.
- **`/metadata`:** `packageInfo`, `bundleInfo`, `ecosystem`.

`npm run verify:reference` checks all three against the engine's grammar: every keyword is an
engine keyword, every example parses on the engine, every count is the engine's.
