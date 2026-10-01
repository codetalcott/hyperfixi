# @hyperfixi/engine

A hyperscript engine written against upstream `_hyperscript`'s source as the specification and
upstream's own test suite as the acceptance oracle. It is typed (`tsc --strict`, no `any`),
synchronous until a script really waits on something, and built from modules, so a bundle
contains the commands it registers and nothing else.

It is meant to replace the engine in `packages/core`. Today it is `private` (not published) and
nothing else in the repository depends on it; the migration plan is
`~/.claude/plans/engine-replaces-core.md`.

## Use

```ts
import { register, boot, on, add, remove, toggle } from '@hyperfixi/engine';

register(on, add, remove, toggle); // this engine knows `on`, `add`, `remove`, `toggle`
boot(); // install as window._hyperscript and initialise the document
```

A module is a function `(g: Grammar) => void` that adds its rules to the grammar: a command, a
feature, or an optional expression kind. A rule that is not registered does not exist, and a
script that uses it fails with a parse error that names the token. `src/bundles/full.ts` is the
list of every module.

The public object is shaped like upstream's `_hyperscript` (`evaluate`, `parse`, `process`,
`config`, `use(plugin)`, `addBeforeProcessHook`), so a plugin written for upstream's public API
can be used on it; the multilingual adapter is. It adds one hook upstream lacks:

```ts
_hyperscript.addSourceTransform((source, element) => english);
```

A script is rewritten as it is read. The element keeps the text its author wrote, and a parse
error in the rewritten script carries that text (`error.written`). `@lokascript/hyperscript-adapter`
uses the hook when the host has it.

## Layout

| File                                                             | What it holds                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                                                   | The library entry: the engine functions, the node types, every module                                        |
| `src/tokenizer.ts`, `src/parser.ts`                              | Lexer, token stream, grammar registry, parse errors                                                          |
| `src/expressions.ts`                                             | The expression chain and the core expression kinds                                                           |
| `src/expressions-extra.ts`, `src/conversions.ts`                 | Optional modules: positional, `closest`, collection operators, type checks; the less common `as` conversions |
| `src/statements.ts`                                              | Commands, command lists, programs                                                                            |
| `src/runtime.ts`, `src/engine.ts`                                | Contexts, scopes, collections, block execution; DOM init, cleanup, public API                                |
| `src/on.ts`, `src/features.ts`                                   | Features: `on`; `def`, `init`, `behavior`, `install`, top-level `set`                                        |
| `src/reactivity.ts`, `src/templates.ts`, `src/live-templates.ts` | Optional: `when` / `live` / `bind`; `render` and template text; live templates                               |
| `src/commands/*`                                                 | 52 command keywords, one module export each                                                                  |
| `src/bundles/*`                                                  | Browser bundle entries. `full` is everything; `core`, `minimal`, `common` exist to measure size              |
| `upstream-suite/`                                                | The acceptance gate: upstream's Playwright suite (vendored) against a bundle                                 |
| `matrix/`                                                        | The multilingual text path on this engine beside upstream: value matrix, R4, the adapter's plugin            |

A node is typed data plus the closure that runs it, bound when the node is parsed: an
expression has `ev`, a command has `run`, a feature has `install`. Control flow is a value a
command returns (`return`, `break`, `continue`), not an exception.

## Commands

```bash
npm run build --prefix packages/engine          # dist/: library, bundles, declarations; prints sizes
npm run typecheck --prefix packages/engine
npm run test:upstream --prefix packages/engine  # the gate (needs a build; about 30 s)
npm run cost --prefix packages/engine           # what each module costs in the full bundle

# Any engine bundle can be scored on the same suite:
node packages/engine/upstream-suite/run.mjs --bundle <bundle.js> --fails

# The multilingual text path on both hosts (needs fresh semantic and adapter dists):
npx tsx packages/engine/matrix/run.mts          # value matrix, about 4 minutes
npx tsx packages/engine/matrix/r4.mts           # R4's strings on both parsers
npx tsx packages/engine/matrix/adapter-host.mts # the adapter's plugin on both hosts
npx tsx packages/engine/matrix/probe.mts '<source>'   # one source on both engines
```

## The gate

`test:upstream` runs upstream's own tests (`upstream-suite/vendor/`, release 0.9.93, the one
this repository's other gates use) against `dist/full.js`. The tests that fail must be exactly
the ones listed in `upstream-suite/known-failures.json`. A new failure fails the gate. So does a
listed test that now passes: prune it with `npm run test:upstream:update` in the same change,
so the list stays what does not pass. CI runs it in the `browser-tests` job.

## Measured (2026-10-01, upstream 0.9.93)

|                        | this engine (`full` bundle) | `hyperfixi.js`          | upstream |
| ---------------------- | --------------------------- | ----------------------- | -------- |
| Whole suite (1,467)    | 1,401                       | 826                     | 1,466    |
| Command tests (516)    | 516                         | 306                     | 516      |
| Expression tests (459) | 457                         | 371                     | 459      |
| Feature tests (254)    | 237                         | 100                     | 253      |
| Core tests (190)       | 143                         | 49                      | 190      |
| Template tests (48)    | 48                          | 0                       | 48       |
| Size, gzipped          | 33.6 KB with every module   | 92 KB engine-only build | 45.8 KB  |

Bundle sizes, gzipped: `minimal` (`on` + add / remove / toggle) 16.3 KB, `common` (15 everyday
commands) 18.4 KB, `full` 33.6 KB, `core` (no commands) 13.8 KB.

The 66 known failures: upstream's internal-API surface (`internals.tokenizer`,
`evalStatically`, source info, error collection: 47), sockets and workers (17, upstream
extensions that are not built), and two collection-expression tests that need upstream's
component extension. Upstream's one failure is a test that expects its worker extension to be
absent.

As a host for the multilingual text path (semantic renders a translation, the adapter's
`preprocess` turns it back into English, the engine runs the English):

- **Value matrix** (`matrix/run.mts`, the gate's own 4,205 cells and oracle). English on this
  engine gives the oracle's value in 4,205 / 4,205 cells, and semantic's English round trip in
  4,205 / 4,205. Through the adapter in 23 languages, 96,640 of 96,643 (cell, language) pairs give
  the oracle's value, and the two hosts agree on every pair: the three that miss are the accepted
  Italian `di` ambiguity, and they miss on upstream too. (`packages/core` misses 8 cells in
  English and 187 pairs on its direct path.)
- **R4** (`matrix/r4.mts`). Of the 273 distinct English strings the gate puts to upstream's
  parser (corpus rows and renders of every authored translation), the two parsers disagree on
  none.
- Of the 159 translatable English corpus patterns, 133 parse on both engines and 26 on neither;
  none parses on one engine only. The 26 are mostly syntax only `packages/core` accepts.
- **The plugin itself** (`matrix/adapter-host.mts`): the shipped adapter plugin in six
  languages on both hosts. Here the attribute stays as written; on upstream it is rewritten.

## Where the bytes are

`npm run cost` rebuilds the full bundle without each registered module and prints the
difference. Of the 33.6 KB: the fixed core (tokenizer, parser, the core expression kinds,
runtime, engine) is 12.2 KB; `on` is 1.6; the optional modules add up to 14.4; code that
several modules share is 5.4. The largest modules: `expressionsExtra` 1.5, `reactivity` 1.3,
`render` 1.0, `repeat` 0.8, `toggle` 0.8, `fetch` 0.7, `pick` 0.7. A simple command costs 20 to
190 bytes (`throw` 18, `get` 53, `log` 73, `send` 101, `append` 189).

Three ideas for the command layer were measured. None is worth doing for size:

| Idea                                                              | Minified  | Gzipped                                                                     |
| ----------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| Share the class / attribute handling of `add`, `remove`, `toggle` | −188      | −4 (`minimal`), +6 (all)                                                    |
| Drop the descriptive fields from node literals (65 of them)       | −1,459    | −566 (all), −177 (`minimal`)                                                |
| A table-driven grammar for the simple commands                    | not built | an estimate: under 200, since the eight simplest commands cost 700 in total |

Gzip already removes repeated text, so removing duplication between commands shrinks the
minified file and not the download. The first row is kept because it is less code. The second
saves 1.7 % and would cost the typed half of each node. The third would have to parse those
commands for nothing to break even.

The fixed core is three quarters of a small bundle. The comparison operators (`is`, `matches`,
`is greater than`, `starts with`, …) are 1.25 KB of it and the math operators 0.15 KB, measured
by stubbing them out. They stay in the core by decision (2026-10-01): a bundle without them
would reject `when it matches .x`, and simpler bundles were preferred to smaller ones.

Source: 8,100 lines, one documented type assertion (`num` in `src/util.ts`).
