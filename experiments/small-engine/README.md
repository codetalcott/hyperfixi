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
| `src/runtime.ts`, `src/engine.ts`                | Contexts, scopes, collections; DOM init, cleanup, public API                                                 |
| `src/on.ts`, `src/commands/*`                    | The `on` feature and the spike's 16 commands                                                                 |
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

|                                 | new engine (`spike` bundle)           | `hyperfixi.js`          | `hyperfixi-hybrid-complete.js` | upstream                                          |
| ------------------------------- | ------------------------------------- | ----------------------- | ------------------------------ | ------------------------------------------------- |
| Spike files (275 tests)         | 270                                   | 163                     | 56                             | 275                                               |
| Upstream expression tests (459) | 430                                   | 370                     | not run                        | 454                                               |
| Whole suite (1,400)             | 819, with 16 commands and one feature | 818                     | not run                        | 1,392                                             |
| Size, gzipped                   | 19.1 KB (core alone 12.9 KB)          | 92 KB engine-only build | 11.7 KB                        | 45.1 KB full, 34.5 KB for a comparable module set |

`upstream-suite/baseline-spike-bundle.json` is the per-file record of the whole-suite run.
