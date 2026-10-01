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
| `src/bundles/*`                                  | Bundle entries: a bundle is a list of modules passed to `use()`                                              |
| `upstream-suite/`                                | Runs upstream's Playwright suite against any engine bundle                                                   |

## Commands

```bash
npx tsc -p experiments/small-engine/tsconfig.json      # typecheck (strict)
node experiments/small-engine/build.mjs                # build dist/, print sizes

# Upstream's tests need a `_hyperscript` checkout beside this repo (or HYPERSCRIPT_TEST_ROOT).
node experiments/small-engine/upstream-suite/run.mjs --bundle experiments/small-engine/dist/spike.js --set spike --fails
node experiments/small-engine/upstream-suite/run.mjs --bundle <any-bundle.js>      # whole suite
```

## Measured (2026-10-01, upstream checkout 0.9.91-dev)

|                        | new engine (`spike` bundle)  | `hyperfixi.js`          | upstream |
| ---------------------- | ---------------------------- | ----------------------- | -------- |
| Whole suite (1,400)    | 1,183                        | 818                     | 1,392    |
| Command tests (511)    | 500                          | 301                     | 510      |
| Expression tests (459) | 444                          | 370                     | 454      |
| Feature tests (254)    | 133                          | 100                     | 252      |
| Size, gzipped          | 27.2 KB (core alone 13.2 KB) | 92 KB engine-only build | 45.1 KB  |

What the new engine does not have yet: reactivity (`when`, `bind`, `live`, live templates:
about 135 tests), `morph`, sockets, workers, cookies, and upstream's internal-API surface
(`_hyperscript.internals`, error collection, source info: about 45 tests).

Source: 6,550 lines, `tsc --strict`, no `any`, one documented type assertion (`num` in
`src/util.ts`). `upstream-suite/baseline-spike-bundle.json` is the per-file record.
