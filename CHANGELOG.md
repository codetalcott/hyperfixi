# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`@lokascript/semantic` reads upstream's `start view transition … end`, in all 24 languages.**
  `on click start view transition swap #a with #b end` parsed as a `transition` command whose
  patient was `swap`, so `translate`, MCP `translate_code` and the corpus lost the block and its
  body (`on click transition swap`), and validation reported the rest as unconsumed input. The
  block is now a `viewTransition` command with its `body` (`ViewTransitionSemanticNode`;
  `isViewTransitionBlock` from the package root), nested the way a loop's body is: a command after
  the block's `end` stays after it, and the `end` no longer closes the handler, behavior or `def`
  around it. `start [a] view transition [using "<type>"]` is written in English in every language,
  as core's `using view transition` tail already is (a browser API's name, which no profile
  translates). The corpus row `swap-view-transition` is now written this way and parses on both
  engines.

### Changed

- **Single-language bundles hold only their own language's hand-crafted patterns.** Each
  command's pattern dispatcher in `@lokascript/semantic` named all 24 languages' hand-crafted
  patterns, so every bundle that could build patterns held all of them (~200 KB minified). Each
  language module now registers its own (`src/patterns/handcrafted/<lang>.ts`, through
  `@lokascript/semantic/core`'s new `registerHandcrafted`), and bundlers drop the rest.
  `@lokascript/hyperscript-adapter`'s single-language bundles are 12–14 KB gzipped smaller
  (`hyperscript-i18n-de.global.js` 103 KB instead of 116, 388 KB raw instead of 532; `-en`
  123 instead of 148), and semantic's `browser-de` is 115 KB instead of 130. The adapter's
  regional bundles move by −6 to +3 KB gzipped (`south-asian` 114 instead of 120, `western` 128
  instead of 125): each language's patterns now sit in their own module, which compresses less
  well than all 24 side by side. A Vite or Rollup build that imports
  `@lokascript/semantic/core` and one `languages/<lang>` gets the single-language saving. The
  patterns each language builds are unchanged (hashed for all 24 before and after, from source
  and from the split `dist/`).

### Fixed

- **`@lokascript/semantic`: an event name of several words keeps what is written after it.** ar
  writes keydown, keyup and resize as `ضغط المفتاح`, `رفع المفتاح` and `تغيير حجم`, id writes
  keydown as `tekan tombol`, and vi writes resize as `đổi kích thước`, but each tokenizer read only
  the first word as the event. So `on keyup from #b log 1` read back `on keyup log 1` in ar,
  `on resize from window` read back `on change` in ar and vi, and `send keyup to #x`,
  `trigger keydown on #x`, `repeat until event keyup from #b` and `wait for resize` lost their
  `to`, `on` or `from`, or waited for `change`. `translate`, MCP `translate_code` and the adapter
  carried the loss. The three tokenizers now read each name whole, as es, fr, pt and qu already
  did. The corpus's ar and vi `window-resize` rows, which the parser's compound repair already
  read right, now parse at full confidence (1.0, was 0.82); no other corpus row changes.
- **`@lokascript/semantic`: a behavior's handlers need no `end` of their own.** Upstream ends a
  handler's commands at the next feature, so `behavior F on click add .a on keyup log 1 end end`
  is two handlers. The behavior parser split its body only at `end`, read both handlers as one,
  and English wrote `behavior F then add .a then log 1`, which the engine rejects: `translate`,
  MCP `translate_code` and the adapter broke such a behavior in every language. Each piece now goes
  through the splitter a top-level chain of handlers already used, and parses to the same node as
  the form with every `end` written. No corpus row changes (every one writes its `end`s).
- **`@lokascript/semantic`: a chain of handlers written natively without their `end`s reads as
  written, in every language.** In 9 languages such a chain merged into one handler, at top level
  and inside a behavior, and the result was valid English that ran wrong: de, fr, id, zh, ko, qu
  and tr dropped the second event and ran its commands on the first (`on click add .a then log
1`), and hi and bn read it as a destination (`add .a to keyup`). The split knew a handler head
  only as `on`'s forms and ja/ko's `を で` / `을 에`; it now reads each language's own: the `when`
  word the renderer writes (de `wenn`, fr `quand`, id `ketika`, qu `maykama`), zh's `一 … 就`, and
  the words after the event (ko `할 때`, tr `i üzerinde`). The same rule ends an `init` with no
  `end` in SOV languages too, and he and vi no longer read a handler after `toggle .a on #x` as the
  toggle's. hi `पर` and bn `তে` are also the destination marker, which almost every command there
  may write first, so a split at one is never trusted: it reads as written, at a confidence below
  the adapter's threshold, so the adapter leaves the script as written and the engine reports it.
  No corpus row changes.
- **`@lokascript/semantic`: English writes core's view-transition tail as upstream's block.**
  `swap #a with #b using view transition` (and `morph`'s tail) renders to English as
  `start view transition swap #a with #b end`, which upstream _hyperscript and `@hyperfixi/engine`
  both parse; the tail itself is rejected by both. Every language reads the tail, and
  `@lokascript/hyperscript-adapter` hands the host the English render, so a page written in
  another language with a view-transition swap failed to parse and ran nothing. Foreign renders
  keep the tail.
- **`@lokascript/semantic`: a `swap` keeps both operands in every language.** Only a swap of two
  selectors round-tripped. `swap #target with me`, `swap :x with :y` and a swap of properties
  (`swap my textContent with #a`, `swap #a's textContent with #b's textContent`) lost an operand
  or its property in up to 21 languages, so a translated page swapped the wrong thing or nothing.
  Four causes: swap's roles took no reference or property path; a handler's repair re-parse was
  vetoed when the swap's first operand moved to its real role; an optional slot that declined a
  value by type still consumed it (any command's pattern could lose the next role that way); and
  in pl/uk the with-word is also the of-word, so `swap el with #t` read as `#t's el`.
- **`@lokascript/semantic`: a `tell` block keeps its extent.** Semantic kept `tell` flat, its body
  being every statement after it, so in English and every translation a command after the tell's
  `end` was lost (`tell #modal show end then log 2` lost the `log`) or pulled inside it
  (`… end log 2`), a nested tell took its parent's remaining commands, and in a behavior or `def`
  the tell's `end` closed the enclosing block, dropping the next handler or command. The parser
  now nests a tell's body as it nests a loop's (`BlockCommandSemanticNode`, `isBlockCommand`), and
  reads an `end` as the tell's exactly when the engine does: before a new `on <event>`, `def`,
  `init` or `behavior`, a tell needs none.
- **`@lokascript/hyperscript-adapter`'s per-language and regional bundles render English with
  semantic's renderer.** They rendered with their own English writer, which saved English's
  language data and had drifted far from semantic's: over the corpus's 3,772 translations, 1,242
  rendered to valid English that did something else, and 345 to English the engine rejects (the
  script then kept its author's text and did not run). Every `if` lost its branches,
  `put … before`/`after` became `put … into`, `from window`, `from elsewhere`, `debounced` and
  `or <event>` vanished, `<button/> in me` widened to the whole page, `repeat for x in …` lost
  its binding, and every `swap #a with #b` was written `swap of #a with #b`. They now give exactly
  what the full `hyperscript-i18n.global.js` gives. English's own module builds through `@lokascript/semantic/core` (its pattern generator and
  repeat heads, `getRepeatPatternsForLanguage` now exported there), so a bundle holds one copy.
  Single-language bundles stay at about 4.0.1's size (`-de` 116 KB gzipped); regional bundles
  are 8–16 KB larger.

## [4.0.1] - 2026-10-05

Fixes for 4.0.0: the per-language adapter bundles read every language again, and the MCP server's
documentation and core's metadata describe the 4.0 engine.

### Fixed

- **`@lokascript/hyperscript-adapter`: the self-contained per-language and regional bundles read
  German, French, Quechua and Chinese again.** `hyperscript-i18n-<lang>.global.js` and the regional
  bundles installed a generate-only pattern generator over the one `@lokascript/semantic/core`
  provides, discarding its hand-crafted patterns: in de, fr, qu and zh even
  `on click toggle .active` stayed untranslated (the host then rejected it), and other languages
  lost shapes such as `toggle … on #target`; 1106 of the corpus's 3772 translations read
  differently from the full package. Published 3.x and 4.0.0 bundles alike; the all-languages
  `hyperscript-i18n.global.js` was unaffected. The bundles now keep `/core`'s generator (sizes
  unchanged: the ~23 KB 4.0.0 added was this generator, unused until now). Their English renderer
  also drops only an implicit `me` now, so `put "x" into me` no longer renders as the
  engine-invalid `put "x"` in every language. New gate: every built bundle runs translated
  handlers on the engine (`test/adapter-iife.test.ts`).
- **`@hyperfixi/mcp-server`'s documentation resources teach upstream's spelling.**
  `hyperscript://docs/commands`, `/expressions`, `/events` and `hyperscript://examples/common` still
  taught core 3.x: `on submit.prevent`, `on input.debounce(300ms)`, `on keydown.enter`,
  `swap #t innerHTML`, `while …`, a bare `[attr]` selector, a `parent` keyword, `you` as the event
  target. The engine rejects those, or reads them as something else (`on click.prevent` listens for
  an event named `click.prevent`). A test now parses every example on the engine. The repo's
  `hyperfixi-developer` skill, generated from them, follows (`generate:skills` had been writing to
  the wrong directory).
- **`@hyperfixi/core/metadata` describes 4.0.** `packageInfo.description` still said "Modern
  hyperscript engine with fixi/htmx integration" and `compatibility` "~85% official _hyperscript",
  both 3.x claims. `packageInfo.upstreamSuite` (`{ version, passed, total }`) now publishes the
  engine's result on upstream _hyperscript's own test suite (1401 of 1467 in 0.9.93), and
  `compatibility` is derived from it; `verify:reference` fails when it disagrees with
  `packages/engine/upstream-suite/known-failures.json`. `ecosystem` drops "212 LLM examples".

## [4.0.0] - 2026-10-04

`@hyperfixi/core`'s own hyperscript engine is gone: its root re-exports `@hyperfixi/engine`, and
its `hyperfixi.js` is the engine's 34 KB script-tag bundle where core's ~352 KB bundle used to be.
The engine follows upstream `_hyperscript`'s grammar and is gated by upstream's own test suite, so
scripts in core-only syntax need upstream's spelling (two additions stay: `new X()` and
`toggle <element>`). Core's other bundles, its htmx layer, the core-era plugin packages and the
AOT compiler retire: htmx 4 or fixi supply hypermedia attributes beside the engine, and
`@lokascript/hyperscript-adapter` runs hyperscript written in other languages. Every package moves
to 4.0.0 together. Everything under **Removed** is breaking, as is each **Changed** item marked ⚠;
[MIGRATION.md](MIGRATION.md) names each replacement.

### Removed

- **Core's engine and its API** (#1368). These root exports had no engine counterpart:
  `hyperscript` (`compile`, `compileSync`, `compileAsync`, `eval`, `validate`), `lokascript`,
  `Runtime`, `RuntimeBase`, `createContext` and the element-scope helpers, `installPlugin`,
  `getParserExtensionRegistry`, `setGlobal`, `DebugController`, `validatePartialContent` and its
  helpers, `fromCoreAST` / `toCoreAST`. `parse` is now the engine's. The root is ESM-only, like the
  engine: `dist/index.cjs` and the UMD `dist/index.min.js` (`LokaScriptCore`) are gone, though the
  kept subpaths still ship CommonJS.
- **21 of core's 29 entry points**: `/commands`, `/expressions`, `/parser/*`, `/behaviors`,
  `/bundle-generator`, `/registry/*`, `/lse`, and `/browser/` `hybrid-complete`, `hybrid-hx`,
  `hybrid-hx-v4`, `multilingual`, `modular` (#1343–#1368). Instead of `/commands`, import the
  grammar modules from the root: `import { toggle } from '@hyperfixi/core'`.
- **Core's browser bundles** (#1348, #1350, #1352, #1368): `hyperfixi-hx.js`,
  `hyperfixi-hx-v4.js`, `hyperfixi-hybrid-complete.js`, `hyperfixi-multilingual.js`,
  `hyperfixi-classic-i18n.js` and the code-split `hyperfixi.mjs`, plus every alias
  (`hyperfixi-browser.js`, `hyperfixi-hybrid-hx.js`, each `lokascript-*.js`). Only
  `hyperfixi.js` remains. CDN URLs pinned to 3.x keep working.
- **Core's embedded htmx layer** (#1342, #1348, #1350): `hx-*` and fixi `fx-*` on core's runtime,
  `hx-live`, `sse-connect` / `sse-swap`, `ws-connect` / `ws-send`. Load htmx 4 or fixi beside the
  engine. `hx-live` becomes the engine's `live` block, and SSE and WebSockets are htmx 4's
  `hx-sse` / `hx-ws`.
- **Core-only members of `window.hyperfixi`**: `compile`, `compileSync`, `execute`, `setLocale`,
  `evalLSENode`, `debugControl`, `semanticDebug`, the `hyperfixi:semantic-parse` event,
  `hyperfixi:debug` logging, `_hyperscript.behaviors.resolve`, and the deprecated
  `window.lokascript` (#1352, #1355).
- **Core-only hyperscript syntax** (#1346, #1363, #1365). The engine rejects `has` / `have`,
  `prepend`, `copy`, `push url` / `replace url`, `process partials`, the `pseudo` keyword, prefix
  `unless`, bare `beep`, `a ? b : c`, core's `swap <strategy> of X with Y`, `set @a to v on X`,
  `.debounce(n)` / `.throttle(n)`, `my?.x` and `tell X to …`. A few forms still parse but no longer
  do what they did, such as `toggle .a on this` and `go forward`. MIGRATION.md gives each form's
  upstream spelling. The multilingual reader still accepts them all.
- **`@hyperfixi/core/multilingual`'s class API** (#1345, #1368): `MultilingualHyperscript` (with
  `parseToAST`, `getAllTranslations`, …), `getMultilingual`, `multilingual`, `LanguageInfo`,
  `schemaRoleInferrer`. The entry is three async functions: `parse`, `render`, `translate`.
- **The AOT compiler** (#1364). Its output ran only on a runtime that was never published.
  `@lokascript/compilation-service` loses `compile()`, `POST /compile`, `CompileResponse`, the
  compile cache (`SemanticCache`, `getCacheStats`, `clearCache`, `/cache`), `generateTests`'
  `executionMode` and `generate()`'s `'js'` target. `generate()` now requires `target`
  (`react` | `vue` | `svelte` | `intent-element`). `@hyperfixi/mcp-server` loses
  `compile_hyperscript`, `execute_lse`, `lse_to_hyperscript`'s `compile` option and
  `generate_tests`' `executionMode`, leaving 106 tools. The loop is now `validate_and_compile`
  (name kept), then repair, then the hyperscript as is in `_="…"`.
- **`@hyperfixi/vite-plugin`'s compile mode** (#1360). `mode: 'compile'` warns and builds the
  engine bundle. The exports `CompiledHandler`, `CompileOptions` and
  `set/clear/hasSemanticParser` are removed.
- **Smaller removals.** `@hyperfixi/core/reference` loses `availability`, `BundleAvailability`
  and `getCommandsByAvailability` (#1363). `@hyperfixi/speech` loses `speechPlugin`,
  `speakCommand`, `askCommand` and `answerCommand`; the engine has `ask` / `answer` (#1358).
  `@hyperfixi/intent-element` loses its `evalLSENode` fallback (#1356).
  `@hyperfixi/patterns-reference` loses four rows that held only retired htmx attributes, and
  `hx-live-with-mutator` is renamed `live-with-handler` (#1348). Of the never-published VS Code
  extensions, the LokaScript one loses its debugger and the standalone `_hyperscript` one is
  retired (#1361).

### Deprecated

- **`@hyperfixi/reactivity`, `@hyperfixi/realtime`, `@hyperfixi/components`**: deprecated on npm,
  last version 3.3.0 (#1358). Use the engine's built-in `live` / `when` / `bind`, htmx 4's
  `hx-sse` / `hx-ws`, and upstream's component extension.
- **`@hyperfixi/types-browser`'s `LokaScriptCoreAPI`**: a deprecated alias of `HyperfixiAPI`
  (#1356).

### Changed

- ⚠ **`@hyperfixi/core` is the engine plus tooling** (#1368). The root is
  `export * from '@hyperfixi/engine'` and `VERSION`: `register`, `everything` and each grammar
  module, `api`, `parse`, `evaluate`, `processNode`, `boot`, and the AST types. The engine stays
  external, so both packages share one grammar. Kept: `/multilingual`, `/ast-utils`,
  `/reference`, `/metadata`, `/lsp-metadata`, `/browser`.
- ⚠ **`hyperfixi.js` (`@hyperfixi/core/browser`) is the engine's `hyperfixi-hs.js`**, byte for
  byte: 34 KB gzipped instead of ~352 KB (#1355). `window.hyperfixi` is `window._hyperscript`,
  upstream-shaped (`evaluate`, `parse`, `process`, `use`, `config`, `addSourceTransform`). Parse
  errors are a `hyperscript:parse-error` event on the element plus a `console.error` (#1354).
- ⚠ **Runtime semantics follow upstream** wherever core's differed. `swap #a with #b` exchanges
  the elements; `show` / `hide … with *opacity` honour the strategy; `tell` binds `you`, not `me`;
  `set` on a selector sets every match; and `no ""` is true. MIGRATION.md has the full list.
- ⚠ **`@hyperfixi/vite-plugin` emits a bundle on `@hyperfixi/engine`** (#1343). There is one
  tier: the grammar modules the scan finds. It weighs 17.9 KB gzipped for three commands (3.x lite:
  3.9 KB) and 34.4 KB for everything; 3.x fell back to 352 KB on `fetch`. htmx is not bundled.
  Non-English scripts are translated as the engine reads them. `devFallback: 'everything'` is new,
  and `'full'` / `'hybrid-complete'` mean the same. The plugin no longer depends on core.
- ⚠ **`@hyperfixi/behaviors` runs on the engine** (peer `@hyperfixi/engine`; upstream works too).
  Each behavior is defined with `host.evaluate(source)` and written in upstream's idioms.
  Toggleable's `target` parameter is now `targetEl`. `LokaScriptInstance` / `LokaScriptWindow`
  are now `HyperscriptHost` / `HyperscriptWindow` (#1338).
- ⚠ **`@hyperfixi/speech` is an engine module** (#1358). Install it with
  `register(...everything, speak)`. It is ESM-only and peers on the engine. `speak` takes
  upstream's syntax (`speak <text> [with voice|rate|pitch|volume <x>]…`) and waits for the
  utterance to end.
- ⚠ **The localized htmx vocabulary moved** from `@hyperfixi/core/vocab/htmx/{lang}.js` to
  `@lokascript/htmx-adapter/vocab/{lang}.js`; the data is unchanged (#1349).
- **`@hyperfixi/intent-element`** renders an intent to English with the page's semantic bundle
  and runs it through the host's `evaluate` (`NO_RENDERER` without one). It peers on
  `@hyperfixi/engine` and `@lokascript/semantic` (#1339, #1356).
- **`@lokascript/semantic` writes upstream's spelling in English** for core-only forms (#1346).
  For example, `has` becomes `matches`, `prepend` becomes `put … at start of`, and swap strategies
  become `put … into` / `before` / `after`. This reaches `translate(…, 'en')`,
  `render(node, 'en')`, both adapters and MCP `translate_to_english`. In `fromSemanticAST`, a
  handler's `then` chain is now its body (#1359).
- **The language tools read the engine's parse** (#1356, #1359, #1365).
  `@lokascript/language-server` and MCP `validate_hyperscript` report the engine's errors
  (`source: 'engine'`). Hover and symbols come from `@lokascript/semantic`, and some long handlers
  show fewer commands than in 3.x. Hyperscript mode flags exactly `new X()` and `toggle <element>`.
  `@lokascript/compilation-service` rejects natural-language input the engine cannot read
  (`ENGINE_PARSE_ERROR`), and its generated Playwright tests load `hyperfixi-hs.js`. The language
  server, the MCP server and the compilation service now peer on `@hyperfixi/engine`.
- **MCP**: `get_bundle_config` recommends `hyperfixi-hs.js`, plus an `adapter` field for
  non-English. `analyze_complexity` / `analyze_metrics` no longer count every comparison as a
  decision. The `debug_*` tools point to `log` and `breakpoint`. `UNSUPPORTED_QUERY_LITERAL` is
  gone (#1350, #1352, #1359, #1361, #1364).
- **`@hyperfixi/core/reference`, `/lsp-metadata`, `/metadata` describe the engine** (#1355,
  #1363). They cover its 53 commands, adding `for`, `ask`, `answer` and `beep!`. Examples are in
  upstream spelling and each is checked to parse; descriptions of core-only semantics (`pick`,
  `beep`, `swap`) are fixed. `FEATURE_KEYWORDS` gains `install`, `when`, `live` and `bind`, and
  `bundleInfo` holds one row.
- **Dependencies.** `@lokascript/i18n`, `@hyperfixi/testing-framework`, `@hyperfixi/vite-plugin`,
  `@hyperfixi/behaviors`, `@hyperfixi/speech` and `@hyperfixi/intent-element` no longer depend
  on core. Core drops `@lokascript/intent`, morphlex, tslib and its optional peers. Versions are
  lockstep, so upgrade `@hyperfixi/*` and `@lokascript/*` together. `@hyperfixi/mcp-server`,
  `@lokascript/framework` (tests) and `@hyperfixi/server-bridge` (tests) range on
  `@lokascript/domains ^3.0.1`, the first domains release whose peers accept framework,
  semantic and intent 4.x (`^3.1.0 || ^4.0.0`).

### Added

- **`@hyperfixi/engine` exports `expr`**, so a grammar module can live in another package
  (#1358).
- **`@hyperfixi/core/ast-utils`'s `withEnginePositions`** gives interchange nodes the source
  spans of the engine's parse (#1359).

### Fixed

- **`@hyperfixi/engine`** accepts upstream's `beep!` command (`beep! a, b`); 3.3.0 rejected it
  (#1362).
- **`@hyperfixi/types-browser`** types `window.hyperfixi` / `window._hyperscript` as the engine's
  `HyperfixiAPI`. 3.3.0 re-exported a `./globals` it never emitted, so `window.hyperfixi` was
  untyped (#1356).
- **Semantic browser bundles** (#1351). Single-language and regional bundles (es, ja,
  east-asian, …) registered no English, so the hyperscript adapter left scripts untranslated. They
  now register it (+~2.2 KB gzipped) and export `translate`. The lite adapter finds any
  `LokaScriptSemantic*` global.
- **`@lokascript/semantic`** (#1338, #1343, #1347). `/core` plus a language module no longer
  throws "No patterns registered". `on click from (x or me)` parses in th and zh. A `js … end`
  block no longer ends its handler in ja / ko / hi / tr / qu / bn. An options object's `}` is no
  longer read as an SOV event name.
- **Language server and MCP** (#1359, #1363, #1365). `beep!` has hover docs. `set X to`
  completions offer values. Hyperscript-mode errors land on the form, not line 0. Hover no longer
  shows a second `on click`.

## [3.3.0] - 2026-10-02

The first publication of `@hyperfixi/engine`, the hyperscript engine meant to replace the one
in `@hyperfixi/core`, and the example gallery moved onto it.

### Added

- **`@hyperfixi/engine` is published.** A hyperscript engine written against upstream
  `_hyperscript`'s source, with upstream's own test suite as the acceptance oracle (1,401 of
  1,467 tests; the 66 known failures are upstream's internal API, sockets and workers). It
  ships `dist/hyperfixi-hs.js`, a script-tag bundle of hyperscript and nothing else, 34.1 KB
  gzipped, which 36 of the repository's example pages now load instead of `hyperfixi.js`. It
  keeps two forms upstream lacks, `new X(...)` and `toggle <element>`; the other hyperfixi-only
  forms are not in it. It is typed (`tsc --strict`, no `any`), built from modules, and exposes
  upstream's public API shape plus one hook, `addSourceTransform`, which
  `@lokascript/hyperscript-adapter` uses to run the 24 languages on it.

### Changed

- **Examples and docs are written in upstream `_hyperscript`'s spelling** wherever upstream has
  one: `put Y into X` for the `swap` strategies, `debounced at 300ms`, `matches`, `set X's @a`,
  `increment #count's textContent` (core counted in a bare `#count`; upstream does not),
  `on mutation of childList from #x`, `my offsetLeft` in place of `measure x`. The multilingual
  reader still accepts the old forms; the renderer writes upstream's. Corpus rows follow.
- **`@lokascript/semantic` renders `repeat for x in xs index i`** (was `with index`) and
  `tell X show` (was `tell X to show`), upstream's spellings.
- **The examples' bundle loader** takes a per-page default (`data-default="hs"`), and `?bundle=hs`
  switches any page to the engine bundle.

### Fixed

- **`@hyperfixi/core`**: `toggle *display of X` parsed and then threw.
- **Hybrid bundles (`hyperfixi-hx.js`)**: `increment` / `decrement` of a possessive wrote only
  style properties; `increment #count's textContent` evaluated to the text and threw on
  `querySelectorAll('0')`. They now write the property.
- **`@lokascript/semantic`**: a template-literal URL in a Korean handler was read as a custom
  event name.

## [3.2.0] - 2026-09-30

A correctness release for multilingual hyperscript. The semantic parser behind
`translate()`, `@lokascript/hyperscript-adapter`, MCP `translate_code` and hyperfixi's
non-English path now keeps whole programs that it used to shorten or drop: values,
conditions, loops and handler heads. Every value shape in a generated matrix of 4,205
(executed in 24 languages, directly and through the adapter, against upstream
\_hyperscript) now matches upstream, apart from two documented differences. Core
matches upstream \_hyperscript on more forms.

### Added

- **Counted loops are written in each language's own words**: es `repetir 3 veces`,
  fr `répéter 3 fois`, ja `3 回 を 繰り返し`, hi `3 बार को दोहराएं`, where translations
  wrote English `times` in 18 languages and English `repeat` in the SOV six. English
  `times`/`repeat` and each language's other count words (es `vez`, ru `раза`, …) still
  read. 18 i18n dictionaries gain a `temporal.times` word.
- **Variable names that are words of the target language.** A variable spelled like a
  structure word (es `si`, pl `w`, tr `al`) is written in parentheses, `(si)`, where the
  plain translation would be misread, and read back as the variable. The language server
  warns (`name-collision`, with a rename quick fix), MCP `validate_hyperscript` reports
  `NAME_COLLISION`, and `translate_code` warns when a variable reads as a value word in
  the target (tl `ako` is `me`). `@lokascript/semantic` exports `nameCollision`,
  `findNameCollisions` and `findTranslationCollisions`.
- Event-handler modifiers (`once`, `debounced at`, `throttled at`, `from`) render in every
  language and are scored by the fidelity signals.
- `of`-paths and pseudo-commands (`reset() the closest <form/>`) survive translation.
- `@lokascript/hyperscript-adapter`'s host gate also rejects a translation that reads a
  reference as a handler's event (`on click on me toggle .active`, an empty click handler
  plus a handler for an event named `me`), falling back to the author's text with a
  warning; such a translation used to parse cleanly and do nothing.
- **Localized htmx attributes: all 23 non-English languages now cover
  every attribute the _Hypermedia Systems_ book's code listings use** —
  `hx-vals`, `hx-select`, `hx-swap-oob` and `hx-sync` join the Contact.app
  twelve (`hx-値`, `hx-valores`, `hx-값`, `hx-werte`, `hx-選択`, `hx-selección`,
  `hx-seçim`, `hx-auswahl`, `hx-sélection`, `hx-选择`, …). tr/de/fr/zh are new
  in the table: the Contact.app seven they lacked (`hx-sil`, `hx-löschen`,
  `hx-supprimer`, `hx-删除`, …) plus audited trigger/swap primaries following
  loka-js (`hx-tetikleyici`, `hx-auslöser`, `hx-déclencheur`, `hx-替换`; the
  profile words `hx-tetikle`, `hx-auslösen`, `hx-déclencher`, `hx-交换` still
  resolve). de gains a lowercase `hx-ziel`: the profile's `hx-Ziel` could never
  match a parsed attribute, since HTML lowercases attribute names. The other
  15 languages (ar, bn, he, hi, id, it, ms, pl, qu, ru, sw, th, tl, uk, vi)
  are unreviewed drafts, every entry flagged `lowConfidence`; they also gain
  the trigger heads their dictionaries left in English (ms and tl all six,
  vi/he/ar some). id gains `hx-sasaran` for a target that was the English
  identity; tl keeps `hx-target` on purpose. `hx-ext` is left in English on
  purpose: htmx 4 removed it. The vocab table gains an `events` block for
  trigger heads the i18n dictionaries do not name; ja, es, pt and ko author
  the DOM `search` event (`検索`, `buscar`, `검색`), which the book's and
  Contact.app's search box fires. htmx's own trigger words (`revealed`,
  `every`) stay English, like the `delay:` / `from:` modifiers.
- Adapter-only vocab keys now resolve from the authored table alone, never
  from a semantic profile: 22 profiles carry a `select` keyword that means
  mark/highlight text (de `markieren`, tr `vurgula`), and it would otherwise
  have shipped as `hx-select` in 22 unreviewed languages.

- **Localized htmx attributes: ja, es, pt and ko now cover every attribute the
  _Hypermedia Systems_ Contact.app uses** — `hx-post`, `hx-delete`,
  `hx-confirm`, `hx-push-url`, `hx-boost`, `hx-indicator` and `hx-include` join
  the existing five (e.g. `hx-削除`, `hx-eliminar`, `hx-excluir`, `hx-삭제`).
  `hx-indicator` / `hx-include` localize under `@hyperfixi/htmx-adapter` (stock
  htmx implements them; the embedded layer does not).
- **Vocab aliases.** Several localized names may map to one attribute or event;
  the first is the form to teach, later ones keep already-authored pages
  working. Core's embedded orchestrator now reads whichever form an element
  carries (it previously kept a single name per attribute).

### Changed

- **Rendered vocabulary** (owner decisions): `null` is written `null` in ar, hi, id, qu,
  sw, th and tr, where it shared the word for `empty`; hi writes `no` as `कोई नहीं`; qu
  writes `and` as `hinallataq`; tl and tr write `includes` with `contains`' word (both
  engines read the two as one operator).
- `@lokascript/semantic` exports its real `VERSION` (it was `0.1.0` since the first
  release); browser bundles report `<version>-<bundle>`.
- MCP `translate_hyperscript` is described accurately: it uses the same semantic engine as
  `translate_code`, without the verification.
- **Audited primaries for `hx-trigger` / `hx-swap`** in ja (`hx-トリガー`,
  `hx-置換`), es (`hx-disparador`, `hx-intercambio`), pt (`hx-gatilho`,
  `hx-troca`) and ko (`hx-교체`), following loka-js's terminology reviews. The
  names that shipped before (`hx-引き金`, `hx-disparar`, …) still resolve.
- The vocab modules are regenerated against the current i18n dictionaries.
  **No working name was removed** — 141 retired event names and three attribute
  names are kept as aliases. One name changed meaning with its dictionary: sw
  `panya_juu` is now `mouseup` (was `mouseover`).

### Fixed

- **Translations that lost code** (semantic parse and render, in every language):
  - `get` of a literal (`get "hello"`, `get 3`, `get true`) dropped the whole command; an
    object literal after `get` was cut to `get {`.
  - Loops keep their extent and body; `repeat until` stops; a loop keeps its index
    variable, the tail after an `if` inside it, and the command after an empty loop its own
    `end` closes; a count may be any value (a variable, `$n`, `it`, a possessive), where
    some translations read `forever`, a silent infinite loop.
  - Handler heads keep `or` events, filters and event parameters; a translated
    `wait for <event>` waits instead of throwing; behaviors keep their handlers and init
    blocks; an else-if chain shares one `end`.
  - Values keep their comparison phrases (`is equal to`, `includes`, `is an Element`, …),
    `and`/`or`/`not`, `mod`, possessive and `of` chains, object and array literals, every
    conversion core supports (`as Int`, `as Fixed:2`, piped conversions), unary minus and
    property paths; `true`/`false`/`null` keep their meaning.
  - Commands keep `put … into <variable>`, `tell … to show`, fetch's `do not throw` and
    response type, event-source/socket URLs, show/hide `with` strategies, `go`/`scroll`
    positions, `${…}` URLs, core's `has`, and a class query's `in` scope.
- **`@hyperfixi/core` follows upstream \_hyperscript**:
  - `X of Y` binds as property access, and the X of a null target is null.
  - `increment` reads its amount and counter as upstream does, and writing an object's
    property through `'s`/`of` works.
  - A loop's count reads as upstream's `index < times` does: `"6.5"` loops 7 times and
    `"6abc"` none, in the full runtime and in the hybrid bundles (`hyperfixi-hx.js`,
    plugin bundles), which read `parseInt`.
  - Blocks close at the end of input; `morph … to`; `render … with name: value`; `beep!`
    as an expression; `transition`'s owners, several properties, `from` and `using`; three
    handler forms from _Hypermedia Systems_; four upstream-valid forms that compiled and
    then failed at run time; `.item in #list` keeps its scope; `on click once` fires on
    the first click.
- htmx: camelCase event names survive an attribute name.
- MCP: the validators report what the parsers actually did.
- The AOT compiler (experimental): loops were compiled to `while (true)`; targets,
  property access, scoped queries, `empty` and variable scope now compile to what they
  mean.
- `@lokascript/hyperscript-adapter` and `@hyperscript-tools/multilingual` READMEs: the
  Japanese quickstart example was a dead button, and the multi-language example loaded
  only the Spanish bundle; the examples are now native and run in a test. Bundle sizes are
  measured.
- Bare CDN URLs now serve a browser bundle: `unpkg.com/@lokascript/hyperscript-adapter@3` (and
  jsDelivr) served `dist/index.cjs`, which throws in a `<script>` tag. The adapter,
  `@hyperscript-tools/multilingual`, `@lokascript/semantic`, `@hyperfixi/core` and
  `@lokascript/htmx-adapter` declare `unpkg`/`jsdelivr` entries.
- `hyperfixi-multilingual.js`'s error names the semantic bundle that exists (the full
  `browser.global.js`, the only one that defines `LokaScriptSemantic`).
- READMEs: `@lokascript/i18n` no longer claims to translate (and its `/lsp` export and CLI,
  which do not exist, are gone); `@lokascript/semantic`, `@hyperfixi/vite-plugin` and
  `@hyperfixi/core` have correct package names, API calls, language lists (24) and measured
  bundle sizes.
- Dependencies: the js-yaml and smol-toml advisories; Vite 8, vitest 5 and happy-dom 20.14.
- **Vietnamese `hx-get` / `hx-target` / `hx-swap` / `hx-trigger` / `sse-swap`
  never worked**: the names were emitted with spaces (`hx-lấy giá trị`), which
  HTML reads as three attributes. They are now hyphen-joined
  (`hx-lấy-giá-trị`), like vi's existing `hx-trực-tiếp`.
- 29 multi-word event names (ar, vi) were removed from the vocab modules: an
  event is a single token of an `hx-trigger` value, so they could never match.

## [3.1.1] - 2026-09-04

### Fixed

- **`@hyperfixi/mcp-server` no longer installs two copies of the contract
  packages.** 3.1.0 pinned `@lokascript/domains ^2.11.1`, whose framework /
  semantic / intent were hard 2.x dependencies — a clean install got 3.1.0 at
  the top level and 2.11.1 nested under domains, and every `DomainRegistry` /
  schema singleton forked across that boundary. mcp-server, framework and
  server-bridge now range on `@lokascript/domains ^3.0.0`, which peers on
  framework 3.x instead.

### Added

- **`scripts/check-domains-peer-major.cjs`** — the cross-repo guard for that
  class: the domains version the lockfile pins must PEER (not depend) on
  framework / semantic / intent at a range the version this repo publishes
  satisfies. Runs in `lint-typecheck`, first thing in `publish.yml` after the
  version bump, and from the pre-commit hook. `examples/release-smoke/run.mjs`
  additionally asserts one installed copy of each contract package, and
  Dependabot now gives `@lokascript/domains` its own PR group so a domains
  release is visible on its own instead of riding the weekly tooling PR.

## [3.1.0] - 2026-09-04

### Added

- **`hyperscript.use(frontEnd)`** — register the multilingual front-end
  `compile()` consults for a non-English program (and `toLSE`/`fromLSE` for
  a semantic node and a renderer). The contract is `FrontEnd` in
  `@hyperfixi/core` (`parseToAST`, optional `parse`/`render`);
  `@lokascript/semantic` satisfies it through
  `createBridgeFrontEnd(new SemanticGrammarBridge())` from
  `@hyperfixi/core/multilingual`. The full browser bundle registers it at
  boot. The library entry registers nothing and, through 3.x, builds the same
  bridge lazily on the first non-English compile — so nothing changes for a
  consumer with `@lokascript/semantic` installed. **4.0 will remove that
  default:** a non-English `compile()` with no front-end registered will
  return the same result the core-parser-only path returns today, and
  `@lokascript/semantic` becomes an optional peer. Engine-migration plan
  Arc 1, steps 2 and 3.

### Fixed

- **Language server: valid non-English code no longer gets a `parse-error`.**
  In `lokascript`/`hyperscript-i18n` mode the server ran core's English
  parser on every region regardless of what the semantic front-end said, so
  `al hacer clic alternar .activo` (accepted at 0.89 confidence) was published
  as `Unexpected token: hacer`. Core's errors are now suppressed for a region
  the front-end accepted in a non-English language. The integration suite
  that claimed to cover this had been discarding every notification; it now
  records `publishDiagnostics` and asserts on it.

- **Language server: settings actually reach the server.** Neither VS Code
  extension set `synchronize.configurationSection`, so the client pushed
  `settings: null` and every `mode`/`language`/`maxDiagnostics` value was
  ignored; `initializationOptions` was ignored too. The server now reads
  `initializationOptions`, a pushed `lokascript`/`hyperscript` section, or
  pulls `workspace/configuration` when the push is empty — and merges partial
  objects over the defaults instead of replacing them (a bare
  `{ maxDiagnostics }` used to leave `language` undefined and error on every
  document). Both extensions push their section, and the LokaScript one now
  contributes `lokascript.mode`.

- **Both VS Code extension server bundles build and run.** The standalone
  hyperscript extension's `bundle:server` had failed since #1016 (no shim for
  `@hyperfixi/core/multilingual`); the LokaScript extension externalized
  `@hyperfixi/core` without shipping it, so every install ran with core
  absent ("diagnostics and hover degraded"). Core is bundled in now, and CI
  runs both bundle scripts.

- **`@lokascript/language-server` declares what it imports.**
  `@lokascript/semantic` was an optional peer but a static import (the
  server crashed at startup without it); `@lokascript/framework` was
  undeclared and got inlined together with `@lokascript/intent` (261 KB) —
  and without `--clean`, `dist/` shipped every previous build's chunk (three
  dead ones, 63% of the tarball). Both are regular dependencies now, the
  build cleans, the 20-byte `--dts` output is gone, and `npm test` rebuilds
  the server it spawns.

- **Hyperscript-compat mode stops flagging portable code.** `as Int`, `Float`,
  `JSON`, `Date`, `Set`, `Map` are upstream conversions (the extension list
  is now `Math`/`Values`, the ones core registers and upstream lacks);
  `my.x`/`your.x` evaluate upstream (only `its.` is flagged); and the
  extension-command scan no longer fires inside `y.replace(`, `arr.push(`,
  string literals, `:process`, `--` comments, or the upstream trailing
  `… unless …` modifier.

- **Language-server false positives and misses.** A `.hs` file containing a
  query literal like `<li/>` was classified as HTML and lost every feature;
  possessives after `)`/`]`/`>` and apostrophes in `--` comments raised
  `unmatched-quote`; the outline reported the `on` in `toggle .x on me` as a
  handler and `.init` as an init block; `install Foo(args)` produced
  overlapping rename edits VS Code rejects; `on draggable:start` became a
  variable named `:start`; and keyword boundaries were ASCII `\b`, so
  definitions and symbols were silently absent in the ten non-Latin
  languages. Completion-context and document-symbol logic moved out of the
  entry script into `completion-context.ts` / `document-symbols.ts` so the
  unit suite tests the shipped code rather than the hand-copied twins it
  used to carry.

- **MCP `get_diagnostics`, `get_completions` and `get_document_symbols` read
  the AST.** The bridge guarded those paths on helper names core never
  exported, so all three had only ever taken their token-based fallback.
  They now read the interchange: the core parser's own errors become
  diagnostics, completions inside a command offer that command's argument
  shapes, symbols carry their commands as children, and a document with
  several `end`-terminated handlers keeps all of them.

- **`hyperscript.process()` honours the event grammar.** The API-side DOM
  processor carried its own listener installer for `on …` attributes and
  silently dropped what the runtime's installer handles: `on
click[event.shiftKey]` fired on a plain click, `on mouseenter or click` never
  fired on mouseenter, `on click from document` never fired. Every browser
  bundle already went through the runtime; `process()` now does too, and
  `config.logAll` moved into the runtime so both paths log. Pinned by
  `api/dom-processor.test.ts`, which runs each case on both paths.

- **The browser bundles' attribute processor now runs the element lifecycle,
  and its lazy stub only takes the shapes it can run faithfully.** Measured
  side by side with `hyperscript.process()`: the bundle path never dispatched
  `hyperscript:before:init` / `hyperscript:after:init` and never set
  `data-hyperscript-powered` — both lived only in the API processor, so a
  morph engine reading the marker saw nothing on a bundle-processed page, and
  canceling `before:init` was impossible there. It also compiled every
  attribute as English; it now detects the element's language (`data-lang`,
  closest `lang`, the document's) the way `process()` always did. And the
  `lazyParsing` stub read only the event NAME from the header, so for the
  first event it ignored a filter (`on click[event.shiftKey]` fired on a
  plain click), listened for the first name of an `or` list only, and never
  saw `from <target>` at all; a header with a filter, `(args)`, `or`, `from`,
  `elsewhere`, `queue`, `debounced`, `throttled` or `in` is now processed
  eagerly. `dom/processor-parity.test.ts` runs every row on all three paths
  (API, eager, lazy) and is the gate the DOM-processor collapse landed under.

- **`hyperscript.process()` and the browser bundles share one DOM
  processor.** `process()` and `cleanup()` now run on the attribute
  processor every bundle uses, which receives its compiler and runtime from
  the API by injection instead of importing it (the `dom -> api` layering
  edge is gone). What changes for `process()` callers, all of it upstream
  parity: an element is initialized once however many times it is passed or
  scanned (it used to re-install on every call); `<script
type="text/hyperscript">` tags inside the tree are processed, with or
  without `for=`, before the elements that may `install` what they define;
  each element gets a non-bubbling `load` event once its program has run,
  and an unparseable attribute is reported through `console.error`, the
  `hyperfixi:compile-error` event and `config.onCompileError` (it was logged
  at debug level only). And `cleanup(container)` now un-marks every processed
  descendant — it stripped the root's `data-hyperscript-powered` only — and
  drops a lazy stub still waiting on an element, so cleanup-then-process
  re-initializes the tree once. A second scan in `lazyParsing` mode no longer
  registers a second stub.
  The API-side processor module is deleted; the multilingual bundle's own
  copy of the language walk now calls the shared one, narrowed to the
  languages that bundle ships; and a subtree the `MutationObserver` picks up
  takes the same entry as `process()`.

- **`set *<css-property>` writes inline style in every spelling upstream
  accepts.** `set *opacity to 0.5`, `set *opacity of me to 0.5` and
  `set *background-color of me to "red"` were silent no-ops and
  `set the *opacity of me to 0.5` threw; only the possessive `set my *opacity`
  worked. The tokenizer classes `*opacity` as a selector (for `measure`), and
  `set`'s parser now re-types it into the identifier property the runtime's
  style rungs already handle, so one path serves all of them — bare, `of
<target>`, `the … of <target>`, `<target>'s`. Ten rows pinned against
  `_hyperscript` 0.9.93.

- **`require('@hyperfixi/core')` returned `{}`, and the subpath `require`s
  threw — since `"type": "module"`, on 3.0.0 too.** Every `exports.*.require`
  and `main` pointed at a `.js` file built as CommonJS, which Node reads as
  ESM under that flag. The CJS outputs are `.cjs` now (main entry, the 21
  subpaths, the parser modules); the `import` conditions are unchanged. The
  bare-Node check in CI now `require()`s the entries as well as importing
  them, which is the check that would have caught this. Found by the
  end-to-end probe that landed Arc 1's build half.

### Changed

- **`@hyperfixi/core`'s library entry no longer bundles the multilingual
  front-end.** `dist/index.mjs`/`index.js` had `@lokascript/semantic`,
  `@lokascript/intent` and `@lokascript/framework` inlined whole (3.33 MB, zero
  dynamic imports left); they are external now (1.04 MB) and load on the first
  non-English `compileAsync`, the way the source always said they would. No
  API change: semantic and intent stay `dependencies`, framework stays an
  optional peer — and is now genuinely one. A consumer that imported both core
  and semantic no longer holds two copies of semantic. `dist/index.min.js`
  (UMD, not in `exports`) stays self-contained. Gated by
  `scripts/check-node-import.mjs` on the sourcemap. Engine-migration plan Arc 1
  step 2, build half.

- **`@lokascript/semantic` drops its `asyncSchema`.** Core deleted the `async`
  command in 3.0.0 (#1102); the semantic front-end never emitted the action
  anyway — its `stripAsyncModifier` pass removes the keyword (in all 24
  languages) and parses the following command, so `async fetch /api as json`
  is a `fetch`. The schema, its registration, the `'async'` `ActionType`
  member and the AST-builder mapper row are gone. Kept on purpose: every
  profile's `keywords.async` (the stripper matches on it) and the
  `'then' | 'and' | 'async'` chain type (a different concept). The IR-level
  `async all/race` node lives in `@lokascript/intent` and is untouched.

## [3.0.0] - 2026-09-03

Full notes: [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases/tag/v3.0.0).

One major, two themes. `@lokascript/i18n`'s grammar transformer is gone,
because `@lokascript/semantic` overtook it on every row of the translation
corpus (#973–#1001). And the engine-migration plan
(`docs-internal/ENGINE_MIGRATION_PLAN.md`) closed its last arc, which deleted
the exported dead code it had been carrying and collapsed the browser bundle
lineup to two names (#1099–#1105). One arc is still open: Arc 1's steps 2
and 3 — `@hyperfixi/core`'s library entry still bundles the semantic
front-end (recorded in the plan's History, 2026-09-03).

### ⚠ BREAKING

- **`@lokascript/i18n` no longer translates** (#1001). `translate()`, `toLocale()`,
  `toEnglish()`, `GrammarTransformer` and `createTransformer` are deleted; the
  package is per-language vocabulary and grammar profiles. Migrate to
  `import { translate } from '@lokascript/semantic'` (same signature; it throws
  on unparseable input where the transformer returned nonsense). The classic-i18n
  browser bundle, `@hyperscript-tools/i18n` and `@lokascript/types-browser` drop
  the same members (#998, #999); the patterns corpus writer is semantic-only (#1000).
- **The prebuilt browser bundles are two names** (#1105): `hyperfixi-hx.js`
  (small: hybrid parser, blocks, expressions, htmx v1/v2 attributes) and
  `hyperfixi.js` (everything); `hyperfixi-hx-v4.js` and
  `hyperfixi-multilingual.js` stay as separate products. `hyperfixi-lite.js`,
  `-lite-plus.js`, `-minimal.js`, `-standard.js` and their `./browser/*`
  exports are gone — use `hyperfixi-hx.js`, `hyperfixi.js`, or the Vite
  plugin, which picks the tier itself. `./browser/hybrid-complete` remains as
  the plugin's internal fallback.
- **Exported dead code deleted from `@hyperfixi/core`** — none had a
  production caller: the six `@deprecated` `features/` families and the
  modular bundle's `features` namespace (#1099); `Lexer`/`Tokens` (#1100 —
  use `tokenize`); the `unified-types` `Validator`, the `types.d.ts` shim and
  `registry/multilingual` (#1101); the `async` command (#1102 — it was
  unreachable from parsed hyperscript; the manifest is 58 commands);
  `ContextProviderRegistry`, the context-provider `Proxy`, the registry's
  `context` slot and the plugin `contextProviders` field (#1104 — set
  request-scoped values as `context.locals`).

### Fixed

- **A small bundle fails loudly on a command it lacks and names `hyperfixi.js`**
  (#1103). The hybrid parser had been dropping an unrecognised word silently;
  making it loud also exposed and fixed three silent mis-parses in the hybrid
  bundles: unquoted `fetch /api/data` fetched `/`, `send custom:event` sent
  `custom` to `me`, and `repeat forever` ran zero iterations.
- **English→foreign rendering is gated** (#931–#972, #953): 3105/3105 corpus
  renders parse on the canonical engine; the bare (handler-less) surface has its
  own gate. `as JSON` stays part of the value (#991); a flattened loop header
  closes (#992).
- Plugins report their real versions (#926); `analyze_content` is unshadowed in
  the MCP server (#927); four dependency advisories resolved; the `domain-flow`
  → `server-bridge` route contract is pinned (#1000s).

### Changed

- `hyperfixi.js` and `hyperfixi-hx-v4.js` carry the 24-language render
  vocabulary (~19 KB gzip each) so `translate` works in the browser (#931).
- Deprecated `@lokascript/domain-*` references repoint to `@lokascript/domains`.

## [2.11.1] - 2026-08-25

Patch release. Fixes the release workflow itself: the build now runs **after**
the version sync, so a published tarball carries its own version rather than
the previous one, and `version.ts` is committed (#925). Also lands the
agent-loop A/B benchmark with an isolated generator (#924).

## [2.11.0] - 2026-08-24

Full notes: [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases/tag/v2.11.0).

### Changed

- **The domain-DSL family moved out** (#909). Twelve packages left this
  monorepo: the ten publishable `@lokascript/domain-*` packages (bdd,
  behaviorspec, config, flow, jsx, learn, llm, sql, todo, voice) plus the
  private `domain-toolkit` and `mcp-multilingual-intent`. They now ship as
  **`@lokascript/domains`**, one subpath export per domain, from the
  [lokascript-domains](https://github.com/codetalcott/lokascript-domains)
  repository.

  All ten published names are **deprecated on npm**, each naming its
  replacement subpath (`@lokascript/domain-sql` → "import from
  `@lokascript/domains/sql`"). Existing installs keep working — deprecation is
  a warning, not a removal — they simply stop receiving updates. The
  pre-deletion tree is preserved at the `moved/domain-family` tag.

  _Migration:_ replace nine dependencies with one, and change
  `from '@lokascript/domain-x'` to `from '@lokascript/domains/x'`. The root
  entry absorbed `domain-config` and exports `createDomainRegistry`,
  `registerAllDomains` and `DOMAIN_PRIORITY`.

### Added

- **"Show in My Language"** — LSP request plus VSCode command (#921).
- **Verified-translation badge** in the compilation service (#920).
- **`scoreFidelity` / `@lokascript/semantic/fidelity`** (#919).
- **Inert-shape warnings** (#918) and surfaced unconsumed-input warnings (#916)
  in the compilation service.
- **The agent-loop benchmark** and the silent-failure finding it produced
  (#915), and the MCP server's agent-era roadmap (#914).
- **Element-collection write-back** for hypermedia tables, with gallery
  examples and four system fixes (#904).
- **The comprehensive Playwright tier now runs in CI** (#908) alongside
  `quick`. It had never run: 122 specs, hiding four real bugs — a detached
  `startViewTransition`, untracked reads of unset globals, concurrent effects
  clobbering dependency capture, and `put` stringifying DocumentFragments
  (#905).

### Fixed

- **The `hyperscript-adapter` review arc** (#895–#902): whole-string
  translation first, taking canonical validity from 2849/3105 to **3105/3105**
  (#899); a host-parser validity gate so an invalid render falls back to the
  author's text (#900); the dead split-statement fallback deleted after
  measuring 0 outputs (#901); and the slim divergence set burned 6 → 1 via
  schema marker data, repairing 39 body-dropping corpus rows (#902).
- **`qu take.recipient`** — the R1 tail's last `take` row (#910).
- **The release workflows** no longer reference the moved-out domain family
  (#922).

## [2.10.0] - 2026-08-01

Full notes: [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases/tag/v2.10.0).

Highlights: `swap`/`process`/`morph … using view transition` across all 24
languages (#870, #873, #875), typed command registration (#869, #871),
`tell`/`process` parser fixes (#861, #872), the R1 role-fidelity burn-down
(#864, #867, #868, #874, #878), and guards for the remaining hand-maintained
CI package lists (#862, #865).

## [2.9.0] - 2026-07-25

> **Gap note:** 2.9.1 through 2.9.4 shipped without entries in this file; their
> details live in [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases).

### ⚠ BREAKING (types)

- **Domain renderers return `string | null`.** `renderSQL`, `renderJSX`, `renderTodo`,
  `renderLLM`, `renderFlow`, `renderBDD`, `renderVoice` and `renderBehaviorSpec`
  previously signalled "I don't know this action" with a successful-looking
  sentinel string — `` `-- Unknown: ${node.action}` `` (or `// Unknown:` in three
  domains). Consumers were forced into string matching, and any legitimately
  rendered sentence starting with `--` was silently dropped. They now return
  `null`.

  **Rendered output for every previously-known action is byte-identical** — all
  1,939 existing domain tests pass unchanged.

  _Migration:_ replace sentinel sniffing with a null check. A guard of the shape
  `if (!sentence || sentence.startsWith('--')) return null;` already handles it.

### Added

- **Domains are open for extension** (`@lokascript/framework` + all 8 domain packages).
  A consumer can add a command to a domain **without editing that package**, by
  passing a `DomainExtension` to `createXDSL({ extensions })`. A schema plus one
  vocabulary entry per language is enough to parse, render and compile it in all
  of them — word order, marker placement and keyword position derive from the
  schema and the language profiles. Vocabulary may cover a subset of the DSL's
  languages, so it can be filled in over time. See
  [Extending an Existing Domain](packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md#extending-an-existing-domain).
- **`createDomainRenderer`** (`@lokascript/framework`) composes a domain's
  hand-written per-action renderers with a schema-driven fallback, returning
  `null` for actions it has neither for. It is what each domain's `renderX` now
  runs, and what makes an extension command render without the domain knowing it
  exists.
- **`MultilingualDSL.render(node, language)`** — render a parsed node back to
  natural language. Chains extension renderer → domain renderer → schema
  fallback → `null`. `parse()` + `render()` is the language-to-language path that
  does not need a `grammarProfile`.
- **`getAllTranslationsWithStatus()`** (`@lokascript/semantic`) — the same result
  as `getAllTranslations()`, plus a `failed` map naming each language that could
  not render and why.
- **`createMultilingualDSL` is now a named export** of `@lokascript/framework`
  rather than reaching consumers only through a wildcard re-export. Domains also
  export `allProfiles`, which extension authors need.
- **A CHANGELOG now ships in every published package.** Determining what changed
  between two releases previously meant probing the installed code.

### Changed

- **Directional markers for `add` / `put` / `go` in es, ar, zh, fr, de, pt**
  (`@lokascript/semantic`). Every language profile's `destination` marker is
  locative (`on` / `على` / `在` / `sur` / `auf`) because it also serves
  `toggle`/`show`; only English overrode it for the directional commands, so the
  rest rendered "add .active ON #box". Now: add → es `a`, ar `إلى`, zh `到`,
  fr `à`, de `zu`, pt `a`; put → ar `في`, zh `到`, fr `dans`, de `in`; go → es `a`,
  ar `إلى`, fr `à`, de `zu`, pt `para`. ja `に` / ko `에` / tr `e` were already
  directional and are unchanged.

  **Parsing accepts a strict superset**: a new `RoleSpec.markerLegacy` keeps every
  previously-rendered marker parsing, so source written against ≤2.8 keeps working.
  Downstream consumers maintaining correction tables for these markers (as
  `lokascript-learn` does) can now delete those entries.

- **`createSchemaRenderer` honors `svoPosition` / `sovPosition`.** It previously
  iterated roles in declaration order and never read the positions, so a schema
  whose declared order differed from its declaration order rendered a surface its
  own generated pattern could not re-parse. It now sorts with the same comparator
  pattern generation uses (**descending — higher values render earlier**). Affects
  only custom schemas; no in-repo consumer relied on the old behavior.
- **Absent roles no longer leave a dangling marker.** `createSchemaRenderer` emitted
  a role's marker even with no value, producing `analyze #content as` /
  `#content として 分析`.
- **`getAllTranslations()` covers every registered language** (24) instead of a
  frozen 13-language list, and a language that fails to render is skipped rather
  than throwing. The full browser bundle now registers Hebrew, which was
  registered everywhere except there.
- **Schema-validation diagnostics are opt-in.** `import '@lokascript/domain-llm'`
  printed ~44 lines of `[SCHEMA VALIDATION]` stderr into every downstream test run
  and CI log. Set `LOKASCRIPT_SCHEMA_VALIDATION=1` to see them; a standing test in
  `@lokascript/semantic` keeps them honest.
- **`dsl.translate()` names the missing config field** when a language has no
  `grammarProfile`, instead of failing deep in the transformer with
  "No profile found for language: en". Anyone matching that exact message must update.
- **`defineCommand` / `getRoleSpec` validate their input.** A malformed schema now
  fails with a message naming the field, instead of
  `TypeError: undefined is not an object (evaluating 'schema.roles[0]')` from
  inside the package.

### Fixed

- **A corrected marker stopped parsing in nested contexts.** Three separate
  override branches — the SOV and VSO event-handler generators and the shared
  marker resolver — each dropped marker alternatives, so Arabic
  `ضع هو إلى #chat` parsed standalone but not inside a `socket` block. They now
  share one definition of what an override still accepts.

## [2.8.0] - 2026-07-25

> **Gap note:** 2.6.0 through 2.7.2 shipped without entries in this file; their
> details live in [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases).
> Full notes for this release: `docs-internal/RELEASE_NOTES_v2.8.0-draft.md` (swapped
> into the GitHub release on publish day).

A size and correctness release: the full bundles shed a duplicated core+semantic copy (~534 → ~299 KB gz), the semantic parser closes out several multilingual correctness arcs, and the publish pipeline's gates are now honest end-to-end.

### Highlights

- **Full bundles nearly halved** (`@hyperfixi/core`): since 2.7.0 the full bundles shipped two copies of the core runtime and multilingual parser (the bundled reactivity/realtime plugins resolved `@hyperfixi/core` to its prebuilt dist alongside the bundle's own source graph). A rollup alias folds everything onto one graph: `hyperfixi.js` ~534 → **~299 KB gz**, `hyperfixi-hx-v4.js` ~540 → **~311 KB gz**. Same features and pre-installed plugins; CI size ceilings ratcheted down to catch re-duplication.
- **`fetch … with { … }` options in all 24 languages** (#662): request options (braced bodies, `method:` / `headers:` / `body:` named args) are captured by the semantic parser in every supported language — previously most non-English languages silently dropped the clause and issued a bare GET.
- **Event modifiers in all 24 languages** (#673): `once`, `debounce(N)`, `throttle(N)` and their translated forms flow from every language's event-handler head to the runtime.
- **Foreign→English canonical validity: 3059/3059** (#724–#732, pick text-range #733/#734/#736): every authored foreign translation now renders English that the canonical hyperscript.org parser accepts — both canonical-validity allowlists are empty — and a new R4 canonical-validity ratchet (#727) plus a ninth `--regression` signal keep it that way.
- **New package: `@lokascript/htmx-adapter`** (#735): multilingual adapter for upstream htmx v4 (canonicalizing extension).

### Fixed

- **`go to url "/page"` no longer drops the URL** (#680) — the destination was silently lost in every language (the English reference itself was affected, which masked it).
- **Broken event listeners in six languages** (#681) — de/fr/id/it/pl/zh dictionaries rendered `mousedown`/`mouseup` as words the parser could not resolve; a V3c vocabulary check now verifies every dictionary event word round-trips on the parse side.
- **"Unknown command: compound" on semantic-path bundles** (#675) — multi-command handler bodies could throw at runtime on the full bundles; the per-segment semantic adapter now defers non-command parses to the traditional parser.

### Infrastructure

- Publish pipeline hardening (#672, #674): reproducible `npm ci` installs, `pre-publish-check` with real exit codes end-to-end, export validation after bundle builds, complete BUILD_ORDER, and a final verdict step that always runs.
- Vocab consistency gate and total input-coverage instrumentation in CI; the multilingual fidelity ratchet holds the 2026-07-11 high-water marks (fidelity 1.000 on all 3,696 corpus rows across 24 languages).

## [2.5.1] - 2026-05-24

A single-bug patch for a v2.5.0 publishing regression that broke every localized htmx attribute.

### Fixed

- **`hyperfixi-hx.js` / `hyperfixi-hx-v4.js`: `window.__hyperfixi_i18n` lost to terser** (`@hyperfixi/core`). The Phase 8 orchestrator's public-API singleton (`window.__hyperfixi_i18n = { register }`) was being eliminated by terser in the published v2.5.0 hybrid-hx and hybrid-hx-v4 bundles, silently breaking every `vocab/htmx/{lang}.js` module on load with `"loaded before the htmx-compat orchestrator"`. Two layers fixed: (1) the module-level `installPublicAPI()` invocation is now exported and called explicitly from each bundle entry that includes htmx-compat, so terser's `unused: true, toplevel: true` pass can't drop it; (2) the API is exposed via bracket-access (`window['__hyperfixi_i18n']`) to bypass terser's `properties.regex: /^_/` mangling. Localized htmx attribute names (`hx-obtener`, `hx-取得`, `hx-احصل`, …) now resolve correctly in the published bundles, matching their already-working behavior under the source-aliased vitest suite.

### Tests

- **Orchestrator public-API gate** in pre-publish-check + release-smoke. New 2-test Playwright spec (`packages/core/src/compatibility/browser-tests/i18n-orchestrator-api.spec.ts`, ~600 ms) asserts `typeof window.__hyperfixi_i18n.register === 'function'` in both shipped htmx bundles. Wired into `.github/workflows/pre-publish-check.yml` (fails the workflow on regression) and the `--matrix` stage of `examples/release-smoke/run.mjs` (so the gate fires against the registry-installed tarball, not only the locally-built dist). Surgical — no swap-pipeline dependency. The broader `i18n-htmx.spec.ts` remains un-wired pending two pre-existing bugs unrelated to this release: a reactivity / notify-hook bug breaking localized `hx-live` re-renders, and a swap-pipeline bug stringifying `DocumentFragment`s in `fetch ... as html` → `put it into target`.

## [2.5.0] - 2026-05-22

A focused release: a new LLM-domain introspection API, plus correctness fixes for the parser, the multilingual renderers, and how published packages declare their internal dependencies.

### Added

- **`describeCommands()` / `describeCommand()`** in `@lokascript/domain-llm` — a JSON-serializable description of every LLM command: its roles, per-language marker keywords, and a verified runnable example in each of the 8 supported languages. Adds the `LLM_LANGUAGE_CODES` export. One source of truth for docs, MCP tool schemas, and LLM-agent discovery. `@lokascript/domain-llm` also gains a package README.

### Fixed

- **`toggle @attribute`** (`@hyperfixi/core`): `toggle @disabled`, `toggle @required`, and similar threw `toggle command: no valid class names found` in the browser. `toggle` now skips semantic parsing (like its sibling DOM commands `add` / `remove`), so the `@attr` / `.class` / `*property` argument forms all work.
- **SOV word order in the multilingual renderers** (`@lokascript/domain-bdd`, `@lokascript/domain-llm`): Japanese / Korean / Turkish output from `renderBDD` and `renderLLM` was not parseable — particle placement and word order were wrong, so `translate_bdd` / `translate_llm` produced broken SOV text. Fixed, with render→compile round-trip guardrail tests.
- **Internal dependency versions**: published packages declared their internal workspace dependencies as `"*"`, which shipped literally to npm and could let a consumer resolve a mismatched (older) internal package. Internal deps now carry exact caret ranges.

## [2.4.0] - 2026-05-20

Two parallel arcs landed since v2.3.1: **upstream `_hyperscript` 0.9.90 parity** (9 phases — commands, comparators, collection ops, event modifiers, plugin system, 3 new public plugin packages, i18n) and **htmx v4 compatibility** (reactive `hx-live`, SSE/WebSocket streaming, per-element localized attribute names, the size-busting `hyperfixi-hx-v4.js` bundle).

### Added

#### Core language (upstream \_hyperscript 0.9.90 compat)

- **9 new commands**: `focus`, `blur`, `empty`, `open`, `close`, `select`, `clear`, `reset`, `breakpoint` — covers DOM focus management, form state, window control, and debugger integration.
- **4 comparator expressions**: `X starts with Y`, `X ends with Y`, `X is between A and B`, and the postfix `... ignoring case` modifier for case-insensitive string comparison. `between` is inclusive and auto-orders bounds.
- **5 collection infix operators**: `collection where <pred>`, `collection sorted by <key>`, `collection mapped to <expr>`, `string split by <sep>`, `array joined by <sep>`. `where`/`sorted by`/`mapped to` bind `it` per element for inline predicates/keys.
- **Event modifiers**: `on first <event>` alias for `.once`, plus synthetic `on resize` for HTMLElements backed by `ResizeObserver` (browser standard `resize` is window-only).

#### Plugin system

- **`HyperfixiPlugin` public API**: `installPlugin(plugin)` on Runtime, `ParserExtensionRegistry` singleton with snapshot/restore for test isolation. Five plugin seams: `registerFeature`, `registerNodeEvaluator`, `registerGlobalWriteHook`, `registerGlobalReadHook`, and `HyperfixiPluginContext.runtime`. `$name` globals canonicalized to bare-key storage across `setVariableValue` and both identifier evaluators.

#### New plugin packages

- **`@hyperfixi/speech`**: Voice I/O via Web Speech API — `speak "text"` (with optional `rate`/`pitch`/`voice`/`volume`), `ask "question"`, `answer with "value"`. Idempotent installation; no-ops cleanly when the Web Speech API or `window.prompt()` is unavailable.
- **`@hyperfixi/reactivity`**: Reactive signals — `live { ... }` blocks, `bind` expressions (now also accepts explicit property via `'s` or `.` syntax), `when X changes`, `^name` reactive reads. Microtask-flushed scheduler with cycle guard and auto-stop on element disconnect.
- **`@hyperfixi/components`**: Custom Element registration from `<template component="tag">` / `<script type="text/hyperscript-template" component="tag">`. **v2 shipped this release** — reactive `^var` rendering (via `@hyperfixi/reactivity`), `#if` / `#for` directives, slot substitution, `${expr}` interpolation. Init scripts (`_=` on the `<template>`) run on each stamp.

#### Internationalization (i18n)

- Phase 1 commands translated across all 23 COMPLETE_LANGUAGES (7 new schemas in `@lokascript/semantic`: `empty`, `open`, `close`, `select`, `clear`, `reset`, `breakpoint`).
- Phase 2 comparators (`starts with`, `ends with`, `between`, `ignoring case`) translated across all 23 languages (with `starts with`/`ends with`/`between` backfills in bn, th, vi).
- Phase 3 collection ops (`sorted by`, `mapped to`, `split by`, `joined by`) translated across all 23 languages (`where` predated this release).
- New `packages/i18n/src/schema-alignment.test.ts` — guards drift: every `CommandSchema` must have an `en.ts` entry, Phase 1/2/3 operators must exist across all complete dictionaries.

#### htmx v4 integration

- **`hx-live` reactive expressions**: When `@hyperfixi/reactivity` is installed, the htmx-compat layer recognizes htmx v4's `hx-live` attribute and translates it to a `live ... end` block. The expression body is hyperscript (not JavaScript like upstream htmx v4), so it gets fine-grained dependency tracking + inherits multilingual support. If reactivity isn't installed, the element is skipped with a clear console error.
- **`sse-connect` / `sse-swap`**: Long-lived `EventSource` per element. Bounded exponential reconnect backoff (1s → 2s → 4s … capped at 30s, 5 retries). Auto-close on DOM removal via `MutationObserver`. Lifecycle events: `htmx:sseOpen`, `htmx:sseMessage`, `htmx:sseError`, `htmx:sseClose`. Multiple named events per connection. Swap targets resolve `closest`/`find`/`next`/`previous`.
- **`ws-connect` / `ws-send`**: Bidirectional WebSocket per element. JSON envelope routing (`{ target, swap?, data }`) drives surgical updates through the existing `hx-target`/`hx-swap` machinery; raw messages dispatch as `htmx:wsMessage`. Outbound sends queue while connecting, flush on `htmx:wsOpen`. Same reconnect backoff as SSE.
- **Localized htmx attribute names (Phases 8–10)**: Per-element `lang=` resolution. Authors can write `hx-obtener` / `hx-objetivo` / `sse-conectar` (Spanish), `hx-取得` / `hx-ターゲット` (Japanese), `hx-احصل` / `hx-هدف` (Arabic), etc. — the orchestrator translates them to canonical English before they hit the existing processor. 8 priority vocab modules ship with the bundle (en, es, fr, ja, zh, ar, ko, de). Missing-vocab languages log a one-time warning per language and fall back to English. `eventNameOf` / `selectorFor` / `nameOf` hooks are namespaced (`hx`, `sse`, `ws`) so `hx-on:*` localizes correctly.
- **htmx event lifecycle**: New CustomEvents `htmx:configuring` (cancelable, mutate `e.detail.config`), `htmx:beforeRequest` (cancelable), `htmx:afterSettle`, `htmx:error`, plus the SSE/WS lifecycle events listed above.

#### Bundles & build tooling

- **`hyperfixi-hx-v4.js`** (~257 KB gz): Full runtime + `@hyperfixi/reactivity` (auto-installed) + htmx-compat + SSE/WS support, all in a single script tag. The "batteries-included" choice for projects using htmx v4 reactive/streaming features. The slim `hyperfixi-hx.js` (~13 KB gz) does NOT ship reactivity/SSE/WS — choose hx-v4 when you reach for `hx-live` / `sse-connect` / `ws-connect`, hx otherwise.
- **Vite plugin: htmx v4 surface detection** — scans HTML for `hx-live` / `sse-*` / `ws-*` attributes and auto-routes to `hyperfixi-hx-v4.js`; otherwise emits a minimal handcrafted bundle as before.
- **`getDefaultRuntime()`** exposed for forcing lazy runtime construction (useful for bundles that defer wiring until first DOM event).

### Fixed

- **Runtime**: `it`/`its`/`result` identifier cache no longer returns stale values across loop iterations — required for Phase 3 collection operators that rebind `it` per element (16 ms TTL cache had masked all Phase 3 tests before fix).
- **Runtime**: method-call `this` binding preserved on member callees — `items mapped to it.toUpperCase()` no longer throws "called on null or undefined". Uses `.apply(thisArg, args)` for member expressions.
- **Parser**: `is not` binary operator now routes to `notEquals.evaluate` — pre-existing gap where tokens parsed but runtime dispatch threw `Unknown binary operator: is not`.
- **Runtime**: `execute()` now mutates the caller's `ExecutionContext` in place when injecting the `ExpressionRegistry`, rather than shallow-cloning. Commands writing to `context.result` / `context.it` (e.g. the new `answer` command) now propagate those writes back to the caller — matching the long-standing `context.locals.set(...)` / `context.globals.set(...)` mutation pattern in the same function. `ExecutionContext.registry` is now mutable in the type signature (the runtime is the only legitimate writer; the `readonly` modifier was a defensive holdover from an earlier consolidation arc).
- **Runtime**: `or` / `and` short-circuit now returns the operand value (truthy/falsy), not a coerced boolean — matches upstream `_hyperscript` semantics.
- **Runtime**: `put` / `set` / `toggle` accept plain property names as write targets (not just `the X.Y` chains).
- **Runtime**: `evalHyperScript()` defaults to shared globals when none provided.
- **Runtime**: scoped `notifyLocalRead()` now fires when reading scoped locals (was missing — broke reactive `bind` to local vars).
- **Math**: binary-arithmetic operands accept DOM elements (coerced through the consolidated "is this convertible" path).
- **Parser**: `set the X.Y to Z` dotted property chains (e.g. `set the event.detail.result to ...`) now use the full expression parser rather than a fixed 2-token lookahead — handles arbitrary-depth chains and `of` expressions uniformly.
- **Parser**: `pick first 3 of arr` and other keyword-led command syntaxes (commands whose argument grammar starts with a keyword) now route through dedicated parsers and preserve trailing args. Added to `COMPOUND_COMMANDS` with a dedicated `parseXxxCommand` per case.
- **Browser bundle**: `ExpressionRegistry` threaded through the command-execution path (`processCommand` → `adapter.execute` → `parseInput`). Without this, commands like `tell`/`send`/`toggle` whose `parseInput()` evaluates AST nodes failed in the example gallery with "Expression X not in ExecutionContext.registry".
- **htmx-compat**: `hx-on:*` registers real event listeners directly from the processor (the translator never sees them, so it can stay declarative-only). Refresh observer wired correctly; localized `hx-on:*` prefix resolved via the namespaced i18n hooks.
- **i18n**: Reactive blocks (`live`, `when X changes`) route around `parseStatement` to fix `when`/`unless` + SOV-language `live` block parsing. Suppressed spurious "then" injection inside live blocks.
- **patterns-reference**: HTML patterns marked non-translatable (they're DOM markup, not source code); cleaned orphan languages from the database seed.
- **Semantic**: registry singleton shared across tsup entries (multi-entry split was forking the registry, breaking cross-entry pattern lookups).

### Changed (internal)

- **Evaluator consolidation**: Retired the `BaseExpressionEvaluator` class hierarchy and 4 helper modules (~2,700 LOC removed) in favor of the single canonical evaluator at `parser/runtime.ts:evaluateAST` with the `ExpressionRegistry` on `ExecutionContext`. Both consolidation arcs (α + β) closed.
- **Domain DSLs**: Extracted a shared config package (`@hyperfixi/domain-config`) consumed by all 8 domain DSLs.
- **Published infrastructure packages**: `@lokascript/intent`, `@hyperfixi/domain-config`, `@hyperfixi/planner`, and `@hyperfixi/intent-element` are published to npm as transitive dependencies (required for `@hyperfixi/core` and the domain DSLs to install cleanly from the registry). They are infra deps — users do not install them directly. (These were published from post-tag fix-forward commits; the `v2.4.0` git tag predates them.)

## [2.3.1] - 2026-04-23

### Fixed

- **CI**: Added `planner` package to the build step (before `mcp-server`, which depends on it) across `ci.yml`, `publish.yml`, and `pre-publish-check.yml`; added `planner/dist` to the build-artifacts upload.
- **hybrid-complete bundle**: `toggle @attribute` and positional selectors (`first .x`, `last .y` in selector position) now work — closed a parser gap surfaced by the README "try it live" examples.

### Added

- **README**: "Try it live" link to the gallery, broken-up counter example, tier links.

### Changed

- **`planner` package**: Marked private (workspace-only — published packages should not list private deps).

## [2.3.0] - 2026-03-17

### Added

- **Lazy behavior resolver**: `install X` just works — behaviors resolve on demand without manual registration
- **Hyperscript-native behaviors**: Behaviors defined as hyperscript source strings via patterns-reference schemas
- **Dynamic class selectors**: `.{varName}` syntax in `toggle`, `add`, and `remove` resolves variables as CSS class names
- **Variable/expression durations**: `wait` command now accepts variable and expression durations (e.g., `wait feedbackDuration ms`)
- **Behavior schema sources**: Single source of truth for behavior schemas in patterns-reference

### Fixed

- **Parser**: `js()` single-quote parsing, `set the X.Y` dotted property chains (e.g., `event.detail.result`), improved `set` error messages
- **Parser**: Namespaced events (`custom:activate`) and `trigger`/`on` inside `repeat` blocks in behaviors
- **Parser**: Adjacent dot after keywords treated as property access, not CSS selector
- **Behaviors**: Clipboard `wait feedbackDuration`, AutoDismiss wait timing, Removable confirm dialog
- **Browser**: Resolver bundle timing and Playwright test stability
- **CI**: Behaviors package added to build pipeline, artifact upload, and pre-publish-check build order

## [2.2.1] - 2026-03-16

### Fixed

- Parser: adjacent dot after keywords treated as property access, not CSS selector
- Dependency updates (build-tools group)

## [2.2.0] - 2026-03-15

### Fixed

- Dependency security: resolved 27 of 33 Dependabot vulnerabilities
- CI: copy examples gallery into repo, remove external clone dependency
- CI: suppress already-published errors in publish dry run

## [2.1.0] - 2026-02-20

### Added

- **domain-llm**: Expanded from 4 to 8 languages (added Korean, Chinese, Turkish, French) — 68 tests
- **domain-flow**: Expanded from 4 to 8 languages (added Korean, Chinese, Turkish, French) — 108 tests
- **domain-flow**: First npm publication as `@lokascript/domain-flow`

### Changed

- All 7 domain DSLs now consistently support 8 languages (en, es, ja, ar, ko, zh, tr, fr)
- MCP server registry updated for new domain languages

### Fixed

- Resolved test failures in 4 packages (19 tests)
- Scoped `first .X in me` to context element instead of document
- Property target bugs: disabled on button, tabIndex as number

## [2.0.0] - 2026-02-15

### Changed

- **Rebrand**: Renamed from LokaScript to HyperFixi for engine packages (`@lokascript/core` → `@hyperfixi/core`)
- Multilingual packages remain under `@lokascript/*` scope
- Synchronized all package versions to 2.0.0

## [1.4.0] - 2026-02-10

### Added

- **Language Server & VSCode Extension**: Full LSP with Go to Definition, Find References, multilingual hover, syntax highlighting, and HTML region extraction
- **AOT Compiler** (internal): Ahead-of-time compiler with 45 command codegens, expression transforms, 4 optimization passes, and 533 tests
- **Compilation Service** (internal): HTTP service for multilingual compilation with React renderer, test generation, and semantic diffing
- **Hyperscript Adapter** (@lokascript/hyperscript-adapter): Multilingual preprocessor plugin for original \_hyperscript with 24 per-language bundles
- **Semantic**: Russian/Ukrainian normalizers, improved SOV pass rates (JA 99%, KO 96%, TR 96%)
- **Vite Plugin**: htmx/fixi attribute scanning for zero-config support, hybrid-plus bundle commands

### Changed

- **Monorepo cleanup**: Moved experimental packages (analytics, server-integration, multi-tenant, ssr-support, siren) to `experiments/`
- **Code audits**: Comprehensive audits across core (+58 tests), runtime (+34 tests), behaviors (+66 tests), expressions (9 security fixes), validation (+20 tests), features (+19 tests), i18n (+33 tests)
- **Semantic refactoring**: Modularized tokenizer, split pattern generator by word order, eliminated all `as any` casts
- **CI**: Consolidated workflows, switched to OIDC trusted publishing, upgraded to Node 24 LTS
- **Test count**: 4046 → 8100+ tests

### Fixed

- Runtime correctness: GC fix, timeout handling, expression security hardening
- Browser test timeouts and false CI failures
- TypeScript errors across 6 packages for clean workspace typecheck
- Debug console.log leak in set command

## [1.3.0] - 2026-01-23

_Synchronized version release. See git history for details._

## [1.2.0] - 2026-01-21

_Synchronized version release. See git history for details._

## [1.0.0] - 2026-01-19

### Added

- **Initial Release**: First public release of LokaScript
- **Core Package** (@lokascript/core): Full hyperscript runtime with 43 commands
- **Semantic Package** (@lokascript/semantic): Multilingual parsing for 23 languages
- **I18n Package** (@lokascript/i18n): Grammar transformation for SOV/VSO/SVO word orders
- **Vite Plugin** (@lokascript/vite-plugin): Zero-config Vite integration
- **MCP Server** (@lokascript/mcp-server): Model Context Protocol server for LLM integration
- **Browser Bundles**: 7 size-optimized bundles (lite, lite-plus, hybrid-complete, hybrid-hx, minimal, standard, full)
- **23 Language Support**: English, Spanish, Japanese, Korean, Arabic, Chinese, French, German, Portuguese, Indonesian, Turkish, Swahili, Quechua, and more
- **4046 Tests**: Comprehensive test suite with >95% coverage
- **Etymology**: "LokaScript" from Sanskrit "loka" (world/realm/universe) reflecting multilingual scope

### Changed

- **Rebrand**: Project renamed from HyperFixi to LokaScript
- **NPM Organization**: Published under @lokascript/\* scope
- **Browser API**: Primary global changed to window.lokascript (with window.hyperfixi backward compatibility)
- **Lifecycle Events**: Renamed to lokascript:_ prefix (dual dispatch with hyperfixi:_ for compatibility)

### Fixed

- Workspace dependency resolution using wildcard versions (\*)
- TypeScript compilation across all 20+ packages
- Build system for browser bundles

### Backward Compatibility

- window.hyperfixi available as deprecated alias to window.lokascript
- hyperfixi:_ events still dispatched alongside lokascript:_ events
- File names kept for compatibility (e.g., hyperfixi-browser.js)

### Documentation

- Complete rebrand of all README files
- Updated CLAUDE.md with project context
- NPM organization setup guide
- Version management documentation

### Security

- npm access token stored in GitHub Secrets
- 2FA recommended for npm organization

[Unreleased]: https://github.com/codetalcott/hyperfixi/compare/v4.0.1...HEAD
[4.0.1]: https://github.com/codetalcott/hyperfixi/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/codetalcott/hyperfixi/compare/v3.3.0...v4.0.0
[3.3.0]: https://github.com/codetalcott/hyperfixi/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/codetalcott/hyperfixi/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/codetalcott/hyperfixi/compare/v3.0.0...v3.1.0
[2.10.0]: https://github.com/codetalcott/hyperfixi/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/codetalcott/hyperfixi/compare/v2.8.0...v2.9.0
[2.8.0]: https://github.com/codetalcott/hyperfixi/compare/v2.5.1...v2.8.0
[2.5.1]: https://github.com/codetalcott/hyperfixi/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/codetalcott/hyperfixi/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/codetalcott/hyperfixi/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/codetalcott/hyperfixi/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/codetalcott/hyperfixi/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/codetalcott/hyperfixi/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/codetalcott/hyperfixi/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/codetalcott/hyperfixi/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/codetalcott/hyperfixi/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/codetalcott/hyperfixi/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/codetalcott/hyperfixi/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/codetalcott/hyperfixi/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/codetalcott/hyperfixi/releases/tag/v1.0.0
