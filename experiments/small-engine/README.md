# small-engine (spike)

A fresh hyperscript engine written against upstream `_hyperscript`'s source as the
specification and upstream's own test suite as the oracle. It tests one thesis: an engine
can be typed, upstream-faithful and small at once. Plan and gates:
`~/.claude/plans/small-engine-spike.md`.

Not a workspace package and not published. Nothing in `packages/` depends on it.

## Layout

| File                                             | What it holds                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/tokenizer.ts`, `src/parser.ts`              | Lexer, token stream, grammar registry, parse errors                                                          |
| `src/expressions.ts`                             | The expression chain and the core expression kinds                                                           |
| `src/expressions-extra.ts`, `src/conversions.ts` | Optional modules: positional, `closest`, collection operators, type checks; the less common `as` conversions |
| `src/statements.ts`                              | Commands, command lists, programs                                                                            |
| `src/runtime.ts`, `src/engine.ts`                | Contexts, scopes, collections, block execution; DOM init, cleanup, public API                                |
| `src/on.ts`, `src/features.ts`                   | Features: `on`; `def`, `init`, `behavior`, `install`, top-level `set`                                        |
| `src/commands/*`                                 | 50 command keywords, one module export each                                                                  |
| `src/bundles/*`                                  | Bundle entries: a bundle is a list of modules passed to `register()`                                         |
| `upstream-suite/`                                | Runs upstream's Playwright suite against any engine bundle                                                   |
| `matrix/`                                        | Hosts the value matrix and R4 on this engine, beside upstream                                                |

## Commands

```bash
npx tsc -p experiments/small-engine/tsconfig.json      # typecheck (strict)
node experiments/small-engine/build.mjs                # build dist/, print sizes

# Upstream's tests are read at a pinned tag (HYPERSCRIPT_REF, default 0.9.93) from a `_hyperscript`
# checkout beside this repo (HYPERSCRIPT_REPO), whatever branch it is on. HYPERSCRIPT_TEST_ROOT
# reads a test directory from disk instead.
node experiments/small-engine/upstream-suite/run.mjs --bundle experiments/small-engine/dist/spike.js --set spike --fails
node experiments/small-engine/upstream-suite/run.mjs --bundle <any-bundle.js>      # whole suite

# The multilingual text path on this engine and on upstream (needs fresh semantic and adapter dists):
npx tsx experiments/small-engine/matrix/run.mts        # value matrix, both hosts (about 4 minutes)
npx tsx experiments/small-engine/matrix/r4.mts         # R4's strings on both parsers
npx tsx experiments/small-engine/matrix/probe.mts '<source>'   # one source on both engines
npx tsx experiments/small-engine/matrix/adapter-host.mts       # the adapter's plugin on both hosts
```

## Measured (2026-10-01, upstream 0.9.93)

|                        | new engine (`spike` bundle) | `hyperfixi.js`          | upstream |
| ---------------------- | --------------------------- | ----------------------- | -------- |
| Whole suite (1,419)    | 1,319                       | 825                     | 1,410    |
| Command tests (516)    | 505                         | 306                     | 515      |
| Expression tests (459) | 452                         | 370                     | 454      |
| Feature tests (254)    | 235                         | 100                     | 251      |
| Size, gzipped          | 30.6 KB with every module   | 92 KB engine-only build | 45.8 KB  |

Bundle sizes, gzipped: `minimal` (`on` + add / remove / toggle) 16.3 KB, `common` (15 everyday
commands) 18.3 KB, `spike` (everything) 30.6 KB, `core` (no commands) 13.8 KB.

The 100 tests that do not pass: `morph` (10), templates and live templates (20), sockets and
workers (17), cookies (5, a harness artifact that fails for upstream too), and upstream's
internal-API surface (`internals.tokenizer`, `evalStatically`, source info, error collection: 47),
and one `answer` dialog test (a harness artifact).

The engine was first ported from, and scored against, a checkout at 0.9.91 (1,300 / 1,400).
This repo's other gates (R4, the value matrix, the adapter's browser tests) use 0.9.93, so the
oracle is now pinned there and the 0.9.93 changes are ported: `as` after a `fetch` URL belongs to
the command, `fetchThrowsOn` is anchored, `in … where`, and reactive DOM queries behind one
document-wide observer.

As a host for the multilingual text path (semantic renders a translation, the adapter's
`preprocess` turns it back into English, the engine runs the English):

- **Value matrix** (`matrix/run.mts`, the gate's own 4,205 cells and oracle). English on this
  engine gives the oracle's value in 4,205 / 4,205 cells, and semantic's English round trip in
  4,205 / 4,205. Through the adapter in 23 languages, 96,640 of 96,643 (cell, language) pairs give
  the oracle's value, and the two hosts agree on every pair: the three that miss are the accepted
  Italian `di` ambiguity, and they miss on upstream too. (`packages/core` misses 8 cells in
  English and 187 pairs on its direct path.)
- **R4** (`matrix/r4.mts`). Of the 273 distinct English strings the gate puts to upstream's
  parser (corpus rows and renders of every authored translation), the two parsers disagree on 6,
  all `render` or `morph`.
- Of the 159 translatable English corpus patterns, 130 parse on both engines, 26 on neither, 3
  on upstream only (`render`, `morph`), and none on this engine only.

- **The plugin itself** (`matrix/adapter-host.mts`). The engine has one hook upstream lacks,
  `_hyperscript.addSourceTransform((source, element) => english)`: a script is rewritten as it
  is read, so the element keeps what its author wrote, and a parse error in the rewritten script
  carries the written text (`error.written`, and a line in the console report). The adapter uses
  the hook when the host has it and rewrites the attribute in place otherwise, as it must on
  upstream. Checked in six languages on both hosts.

The matrix found one difference upstream's own suite does not test: a missing value inserted
into the DOM (`put noSuchVariable into me`) shows as "null" on upstream. Fixed here.

Source: 7,400 lines, `tsc --strict`, no `any`, one documented type assertion (`num` in
`src/util.ts`). `upstream-suite/baseline-spike-bundle.json` is the per-file record.
