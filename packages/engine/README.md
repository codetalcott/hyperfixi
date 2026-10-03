# @hyperfixi/engine

A hyperscript engine written against upstream `_hyperscript`'s source as the specification and
upstream's own test suite as the acceptance oracle. It is typed (`tsc --strict`, no `any`),
synchronous until a script really waits on something, and built from modules, so a bundle
contains the commands it registers and nothing else.

It is meant to replace the engine in `packages/core`, and is published as its own package
(since 2026-10-02). Nothing else in the repository depends on it at run time yet; the migration
plan is `~/.claude/plans/engine-replaces-core.md`.

## Install

The script-tag bundle, hyperscript and nothing else (34.1 KB gzipped). It installs as
`window._hyperscript` and `window.hyperfixi`, and reads the document when it is ready:

```html
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
<button _="on click toggle .active on me">Toggle</button>
```

Or, with a bundler, build an engine from the modules a page needs:

```sh
npm install @hyperfixi/engine
```

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

| File                                                             | What it holds                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                                                   | The library entry: the engine functions, the node types, every module                                                                                        |
| `src/tokenizer.ts`, `src/parser.ts`                              | Lexer, token stream, grammar registry, parse errors                                                                                                          |
| `src/expressions.ts`                                             | The expression chain and the core expression kinds                                                                                                           |
| `src/expressions-extra.ts`, `src/conversions.ts`                 | Optional modules: positional, `closest`, collection operators, type checks; the less common `as` conversions                                                 |
| `src/statements.ts`                                              | Commands, command lists, programs                                                                                                                            |
| `src/runtime.ts`, `src/engine.ts`                                | Contexts, scopes, collections, block execution; DOM init, cleanup, public API                                                                                |
| `src/on.ts`, `src/features.ts`                                   | Features: `on`; `def`, `init`, `behavior`, `install`, top-level `set`                                                                                        |
| `src/reactivity.ts`, `src/templates.ts`, `src/live-templates.ts` | Optional: `when` / `live` / `bind`; `render` and template text; live templates                                                                               |
| `src/commands/*`                                                 | 52 command keywords, one module export each                                                                                                                  |
| `src/additions.ts`                                               | The two forms upstream does not have: `new X()` and `toggle <element>`                                                                                       |
| `src/bundles/*`                                                  | Browser bundle entries. `hyperfixi-hs` is the script-tag bundle; `full` is the same modules, for the gate; `core`, `minimal`, `common` exist to measure size |
| `upstream-suite/`                                                | The acceptance gate: upstream's Playwright suite (vendored) against a bundle                                                                                 |
| `tests/`                                                         | This package's own tests (`src/additions.ts`, and regressions upstream's tests did not show), in the form of upstream's and on the same fixtures             |
| `tools/probe.mts`                                                | One source on this engine and on upstream, side by side, on the value matrix's fixture                                                                       |

A node is typed data plus the closure that runs it, bound when the node is parsed: an
expression has `ev`, a command has `run`, a feature has `install`. Control flow is a value a
command returns (`return`, `break`, `continue`), not an exception.

## Commands

```bash
npm run build --prefix packages/engine          # dist/: library, bundles, declarations; prints sizes
npm run typecheck --prefix packages/engine
npm run test:upstream --prefix packages/engine  # the gate (needs a build; about 30 s)
npm run test:own --prefix packages/engine       # additions and regressions (needs a build; 2 s)
npm run cost --prefix packages/engine           # what each module costs in the full bundle

# Any engine bundle can be scored on the same suite:
node packages/engine/upstream-suite/run.mjs --bundle <bundle.js> --fails

# One source on this engine and on upstream, side by side:
npx tsx packages/engine/tools/probe.mts '<source>'

# What this engine reads of the sources this repository ships, beside core and upstream:
npx tsx packages/engine/tools/shipped-sources.mts
```

## The gates

**Upstream's suite.** `test:upstream` runs upstream's own tests (`upstream-suite/vendor/`,
release 0.9.93, the one this repository's other gates use) against `dist/full.js`. The tests
that fail must be exactly the ones listed in `upstream-suite/known-failures.json`. A new failure
fails the gate. So does a listed test that now passes: prune it with
`npm run test:upstream:update` in the same change, so the list stays what does not pass. CI runs
it in the `browser-tests` job.

**The package's own tests.** `test:own` runs `tests/` against the same bundle, for the two forms
upstream has no tests for. Every one must pass. On upstream's own bundle 2 of the 21 pass (the
two that check an upstream form still reads as it did), which is what shows the rest test the
additions. `tests/regressions.js` holds the other kind: places where this engine differed from
upstream and upstream's tests did not show it (each of those passes on upstream). CI runs both
after the upstream suite.

**The multilingual gates**, in the packages that own them:

- The value matrix (`packages/testing-framework`, `value-matrix.ts`) has an `eng` lane, the
  English source on this engine, and a `<lang>/eng` lane per language: the adapter's English,
  the same string the `/up` lane runs on upstream, on this engine.
- `engine-parser-parity.test.ts` (same package) puts every string the canonical-validity gates
  ask upstream's parser about to this engine's parser; the two must agree.
- `packages/hyperscript-adapter/test/engine-host.test.ts` hosts the real plugin on this engine.

**The shipped-sources gates**, also in `packages/testing-framework`:

- `shipped-sources-engine.test.ts` lists the sources this repository ships (`examples/`, the doc
  trees) that `packages/core` compiles and this engine rejects
  (`baselines/shipped-sources-engine.json`). A new one fails; so does a listed one that now
  parses. It is empty when replacing core's engine breaks no shipped page.
- `shipped-examples-execution.test.ts` has an engine lane: every example handler upstream accepts
  is run on upstream and on this engine, in jsdom, and the DOM effects must match. Measured
  2026-10-01: 134 handlers, 89 matches with an effect, 44 with none on either, 1 difference
  (upstream reads a stale `document` in that harness). `packages/core` differs on 31.

## Measured (2026-10-01, upstream 0.9.93)

|                        | this engine (`full` bundle) | `hyperfixi.js`          | upstream |
| ---------------------- | --------------------------- | ----------------------- | -------- |
| Whole suite (1,467)    | 1,401                       | 826                     | 1,466    |
| Command tests (516)    | 516                         | 306                     | 516      |
| Expression tests (459) | 457                         | 371                     | 459      |
| Feature tests (254)    | 237                         | 100                     | 253      |
| Core tests (190)       | 143                         | 49                      | 190      |
| Template tests (48)    | 48                          | 0                       | 48       |
| Size, gzipped          | 34.1 KB with every module   | 92 KB engine-only build | 45.8 KB  |

Bundle sizes, gzipped: `minimal` (`on` + add / remove / toggle) 16.3 KB, `common` (15 everyday
commands) 18.4 KB, `full` 34.1 KB, `core` (no commands) 13.8 KB.

## The script-tag bundle: `hyperfixi-hs.js`

`dist/hyperfixi-hs.js` (minified, 34.1 KB gzipped; `hyperfixi-hs.dev.js` is the readable build) is the first product on this engine:
hyperscript and nothing else, every module, no htmx attributes, English only. It installs
`window._hyperscript`, as upstream does, and the same object as `window.hyperfixi`. The name
pairs with `hyperfixi-hx.js` (hyperscript plus htmx); `hyperfixi.js` is everything.

Every tracked gallery page loads it instead of `packages/core/dist/hyperfixi.js`
(2026-10-03: forty-seven pages; the error-path page for core's htmx layer was deleted with that
layer). Thirty-two by a script tag; fifteen through the examples' loader, `data-default="hs"`,
so that `?bundle=` still switches them. Core's Playwright suites run them, and the bundle is a
column of the bundle-compatibility matrix (`?bundle=hs` in the examples' loader). No page needed
an API shim: `processNode` is upstream's name too, and the other `hyperfixi.*` calls were core
debugging code. The multilingual demo pages are among them: their handlers are English, and what
they translate for display comes from the i18n or semantic bundle, loaded beside the engine. The
behavior pages load `@hyperfixi/behaviors`' bundle beside it, which defines its eleven behaviors
on the engine with `evaluate` (the package peers on this engine since 2026-10-03; its sources
are in upstream's idioms and run on upstream too). The intent-element pages load the semantic
English bundle beside it: `<lse-intent>` renders its LSE JSON to hyperscript text and hands it
to the host's `evaluate`, the `lse_to_hyperscript` direction (core's `evalLSENode` was the AST
path). The history pages write `call history.pushState(null, '', X)` / `replaceState`
(upstream's spelling; the owner decided against a `push url` addition) and define their
`HistorySwap` behavior in the page. The htmx pages (`examples/hx-v4/`, `hx-v4-i18n/`) are the
two stacks that replace core's embedded htmx layer (retired by owner decision, 2026-10-03): the
engine's own `live` / `bind` blocks where no request is involved, and REAL htmx 4 (vendored under
`examples/vendor/`) with its `hx-sse` / `hx-ws` extensions and `@lokascript/htmx-adapter` for
localized attribute names beside the engine where one is. Core's own debug pages left the
gallery for `packages/core/test-pages/`. One behavior of core's is not in this engine, by decision
(2026-10-02): `increment #count` on core counts in the element's text, where upstream and this
engine want `increment #count's textContent`. The examples write the second, which every
bundle runs to the same count (the bundle matrix's Counter row).

The 66 known failures: upstream's internal-API surface (`internals.tokenizer`,
`evalStatically`, source info, error collection: 47), sockets and workers (17, upstream
extensions that are not built), and two collection-expression tests that need upstream's
component extension. Upstream's one failure is a test that expects its worker extension to be
absent.

As a host for the multilingual text path (semantic renders a translation, the adapter's
`preprocess` turns it back into English, the engine runs the English):

- **Value matrix.** 4,205 cells. English on this engine gives the oracle's value in every cell.
  Through the adapter in 23 languages, 96,640 of 96,643 (cell, language) pairs do, and the two
  hosts agree on every pair: the three that miss are the accepted Italian `di` ambiguity, and
  they miss on upstream too. (`packages/core` misses 8 cells in English and 187 pairs on its
  direct path.)
- **Parser parity.** Of the 273 distinct English strings the canonical-validity gates put to
  upstream's parser, the two parsers disagree on none.
- Of the 168 corpus rows, 151 parse on both engines and 17 on neither; none parses on one
  engine only. Fifteen of the 17 are markup or extension rows (components, `sse-*` / `ws-*` /
  `hx-live`, sockets, workers, event sources, `intercept`) and one is valid nowhere. Two are
  syntax only `packages/core` has: `as FormData` (fetch-formdata) and `swap … using view
transition` (swap-view-transition). Nine more were, until the rows were rewritten in
  upstream's spelling on 2026-10-01.
- **The adapter's plugin** in six languages: the script runs and the attribute stays as
  written. On upstream the plugin has to rewrite the attribute.

## Against what this repository ships

`npx tsx packages/engine/tools/shipped-sources.mts` puts every hyperscript source in
`examples/` and the doc trees (the shipped-sources gate's collection: 386 sources, 336
distinct) to three parsers. Measured 2026-10-01:

- upstream accepts 272, this engine 309, `packages/core` 320;
- **12 sources that core accepts are rejected here**: the eleven handlers that use core's
  history commands (`push url`, `replace url`), which wait for the htmx decision, and the
  `hyperfixi-hx.js` example in `docs/BROWSER_BUNDLES.md`, which is written in the hybrid
  parser's own dialect (`on click.debounce(300)`, `me has .loading`).

It was 78 when first measured. The examples and docs were moved to upstream's spellings where
upstream has one (`put … into` for core's `swap` strategies, `debounced at 300ms`,
`start view transition … end`, `morph … to`, `toggle *display of`, `descending`, …: each
rewrite was run on core, upstream and this engine, to the same DOM), and two forms were added
here (below).

A parse-level count understates a difference: a source can parse and run differently.
`set t to new Date().getDay()` parses on upstream (`new` is a variable there, the call a second
command) and fails when it runs; `swap afterBegin of #list with html` is upstream's exchange of
two values and inserts nothing. The comparison that counts is the DOM a handler leaves
(`shipped-examples-execution` in `packages/testing-framework`).

## Differences from upstream

Three, all recorded here and nowhere silent.

**Two additions** (`src/additions.ts`, decided 2026-10-01), forms `packages/core` has and the
shipped examples use. Each is its own module, and neither changes how an upstream script reads:
upstream's suite passes the same tests with them registered as without.

- `new Date()`, `new Intl.NumberFormat('en')`, `(new Date()).getDay()`: a constructor call as
  an expression. `new` is still an ordinary name unless a constructor call follows it. Upstream
  has the `make a Date` command and no expression. 0.20 KB.
- `toggle #dialog`, `toggle #dialog modal` (or `as modal`), `toggle #details`: open what is
  closed and close what is open, for a dialog, a details element (or its summary), a popover
  and a select. Upstream rejects `toggle <expression>` unless `between` follows; that form is
  unchanged. 0.21 KB.

**One looser reading**, found by the measurement above: `my @id as String` (an attribute read
through `my` / `its` / `your`, then a conversion or any further access). Upstream rejects it,
because its attribute-access rule does not continue the expression chain as every other access
does; the possessive form `#a's @title as String` works on both. This engine continues the
chain. It is kept because the stricter reading looks like an upstream slip and a shipped
example uses the form (`its @data-stock as Number > 0`).

Considered and not added: core's `swap` strategies (upstream's `swap` means something else),
`copy`, a `? :` conditional, `.debounce(n)`, `has`, prefix `unless`, `set @a to v on <target>`,
`sorted by … desc`. `push url` / `replace url` are undecided.

## Where the bytes are

`npm run cost` rebuilds the full bundle without each registered module and prints the
difference. Of the 34.1 KB: the fixed core (tokenizer, parser, the core expression kinds,
runtime, engine) is 12.2 KB; `on` is 1.6; the optional modules add up to 15.1; code that
several modules share is 5.2. The largest modules: `expressionsExtra` 1.5, `reactivity` 1.3,
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
