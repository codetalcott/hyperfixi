# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Domain DSLs**: Extracted a shared internal config package (workspace-only) consumed by all 8 domain DSLs.

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

[Unreleased]: https://github.com/codetalcott/hyperfixi/compare/v2.4.0...HEAD
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
