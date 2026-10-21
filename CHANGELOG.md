# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **`@hyperfixi/mcp-server` lists 14 core tools by default; the other 70 are in opt-in
  toolsets.** A connection listed all 84: about 13k tokens of definitions in each client that
  loads them all, and a month of sessions called 7 of them. The default list is the agent loop
  and what it leans on (`validate_and_compile`, `get_diagnostics`, `get_code_fixes`,
  `get_command_docs`, `get_expression_docs`, `search_patterns`), translation (`translate_code`,
  `translate_to_english`, `get_keyword_translations`, `list_supported_languages`), proof that
  a change kept its meaning (`score_fidelity`, `diff_behaviors`), and `detect_domain` /
  `compile_auto`: about 2.5k tokens. Set `LOKASCRIPT_MCP_TOOLSETS` to list more: `domains`
  (26), `lse` (13), `grail` (5), `debug` (4), `editor` (3), `analysis` (9), `profiles` (5),
  `project` (5), comma-separated, or `all`. Only the list changes: every tool still answers a
  call by name. A client that picks tools from the list (Claude Code, Claude Desktop) needs
  the variable to see a tool outside the core; the README lists each toolset's tools.

### Fixed

- **`lse_from_hyperscript` returned `[get patient:null]` for every input**, with `ok: true` and
  confidence 1: it read the semantic parse as the AST builder's tree. It now renders the parse,
  and refuses (`ok: false`, the rendered LSE under `partial`) a parse that left input unread or
  a shape whose LSE does not parse back, such as a `then` chain inside a handler.
- **`extract_routes` and `generate_server_routes` threw on every input** ("Cannot read
  properties of undefined"), from the day they were added: they read `.routes` from the array
  `scanRoutes` returns. They report server-bridge's route conflicts where they promised an
  `errors` field it never had. The import that hid this from the typecheck (an untyped ambient
  module) is gone.
- **`get_code_fixes` had no fixes for the codes `validate_and_compile` emits**
  (`ENGINE_PARSE_ERROR`, `UNCONSUMED_INPUT`, …), though the server's instructions send an agent
  there from its diagnostics; `get_diagnostics`' `parse-error` and `low-confidence` mapped to
  keys that did not exist. Every code compilation-service emits now has fixes, and a test holds
  that.
- **`explain_code` listed commands by kind, not in the order they run** (toggle → wait → add
  came out "toggles … adds … waits") and dropped their targets. It explains the parse now: each
  step rendered back to English with what it does, a block's body and an `if`'s two branches.
- **`get_diagnostics`' typo fix was titled `Fix typo: ${suggestion}`**, unfilled, with no edit.
  It now reads "Fix typo: toggle" with an edit that replaces the misspelled word.

## [7.2.0] - 2026-10-20

`@hyperfixi/mcp-server` moves to `@lokascript/domains` 7.1.0: learn left the domains for
lokascript-learn, its only user, and the server's four learn tools went with it. A minor, though
it removes tools: there are no known users of them, and `translate_code` writes what they wrote.

### Changed

- **`@hyperfixi/mcp-server` is on `@lokascript/domains` 7.1.0.** The domain DSLs take each
  language's grammar from `@lokascript/framework/languages` (framework 7.1); the six that remain
  read and write exactly as on 5.0.4 (the domains' round-trip gate: 0 worse, 0 better, 0 parses
  moved). Domains 7.1.0 peers framework and intent `^7.1.0`; semantic is no longer a peer
  (#1604, #1605).

### Removed

- **`@hyperfixi/mcp-server`'s four learn tools** (`parse_learn`, `compile_learn`,
  `validate_learn`, `translate_learn`), and learn in `detect_domain` and the composite tools.
  learn left `@lokascript/domains` in 7.1.0 for lokascript-learn, its only user. Its commanding
  sentence was `@lokascript/semantic`'s translation, which `translate_code` writes. A default
  connection lists 84 tools (88 before) (#1605).

## [7.1.0] - 2026-10-20

Each language's grammar is framework's data now (`@lokascript/framework/languages/<code>`), and
semantic's profiles extend it unchanged, so a domain can take a language's grammar without
hyperscript's. Installs get smaller: i18n and testing-framework stop pulling bundlers, browsers and
the repo's own gates.

### Added

- **`@lokascript/framework/languages/<code>`: each language's grammar, as data.** 24 modules, and a
  `languages` barrel, export what holds for a language whatever a DSL says in it: its names,
  direction, script, word order, marking strategy, spacing, role markers, verb placement,
  tokenization particles, the default command-verb form, the markers it writes onto their word, and
  how it builds "X's Y" (framework's new `GrammarProfile` type, a superset of `GrammarProfileSlice`).
  They are plain objects with no side effects, in ESM and CJS. `@lokascript/semantic`'s 24 profiles
  are now that grammar with hyperscript's vocabulary over it, so a domain can take a language's
  grammar without importing semantic, whose `languages/<code>` also registers hyperscript's
  tokenizer and patterns. No profile changed: all 24 are deep-equal to 7.0.0's, the 27,194 parses
  of the command-shape corpus are unchanged, and the domains' gate reads every sentence as before.
  Semantic's ESM files are smaller (the data is framework's); its browser bundles grew by at most
  0.6 KB gzipped (0.3%) (#1602).

### Fixed

- **`npm run add-language` runs again.** The scaffolder read `__dirname` in an ES module and threw
  before writing a file. It now also writes the language's grammar to framework (`--script` sets
  the writing system, default `latin`) and the profile over it (#1602).

- **`@hyperfixi/mcp-server` no longer reports a stale build when it runs from npm.** At startup it
  compares each `@hyperfixi/*` / `@lokascript/*` dependency's `src/` against its `dist/`, which
  catches a monorepo package edited and not rebuilt. An npm or npx install ships `src/` too, and
  writes it a few milliseconds after `dist/`, so every `npx @hyperfixi/mcp-server` launch (the
  hyperfixi plugin's) called five packages stale and printed `npm run build` commands for the npx
  cache. The check now runs only for packages that resolve outside `node_modules` (workspace
  links); the check that refuses a tool call when a `dist/` changes under the running server is
  unchanged (#1599).

### Changed

- **`@lokascript/i18n` no longer installs `vite`, `esbuild` and `happy-dom`.** They were runtime
  `dependencies`, but nothing in the package imports them when it runs: the one use is a type, the
  `Plugin` that `./plugins/vite` returns. So every install, `@lokascript/hyperscript-adapter`'s
  optional one included, pulled a bundler and a DOM: 145 MB and 40 packages for i18n 7.0.0, against
  about 74 MB and 11 without them (macOS arm64). They are devDependencies now, and `vite` is an
  optional peer (`>=4.0.0`, as `@hyperfixi/vite-plugin` declares it), so the plugin's types
  resolve where vite is installed (#1597).

- **`@hyperfixi/testing-framework` installs what its published files import: `diff` and `jsdom`.**
  Its three entries (`.`, `./runner`, `./assertions`) import those two, and `runner` loads
  `playwright` or `puppeteer` with `import()` only for a browser run. The other eleven runtime
  dependencies (semantic, i18n, compilation-service, patterns-reference, vite, esbuild, happy-dom,
  tsx, url-parse, and both browsers) back the repo's own gates, which are not in `dist/`: an
  install was 262 MB in 116 packages, and puppeteer's install script downloaded Chrome on top
  (`--ignore-scripts`, macOS arm64). Now about 28 MB in 38. `playwright` and `puppeteer` are
  optional peers: install the one a browser run uses. The built files are byte-identical (#1598).

### Removed

- **`@hyperfixi/testing-framework`'s `hyperfixi-test` and `hyperfixi-test-multilingual` bins.**
  They named `dist/cli.js` and `dist/multilingual/cli.js`, which the build has never produced, so
  neither command ever ran from the package (#1598).

## [7.0.0] - 2026-10-19

Removes what 6.x deprecated or never shipped: three MCP tools that duplicated `validate_and_compile`
and `translate_code`, `@lokascript/compilation-service`'s HTTP layer and `generate()`, and the
unpublished VS Code extension. For every other package 7.0 is a renumber: `@lokascript/domains`
5.0.4 accepts it. MIGRATION.md has the 6.x → 7.0 table.

### Removed (BREAKING)

- **`@hyperfixi/mcp-server`: `validate_hyperscript`, `translate_hyperscript` and
  `parse_multilingual`**, deprecated in 6.1.0 and 6.2.0. `validate_and_compile` and
  `translate_code` replace them (MIGRATION.md has the 7.0 table). 93 tools defined, 88 listed by
  default (96, 91).
- **`@lokascript/compilation-service/http`** (`createApp`, `serve`, `POST /validate` and the other
  routes). Its one user, the chat app, now serves its own routes (lokascript-examples #23). `hono`
  and `@hono/node-server` leave the package, so no mcp-server install carries them.
- **`CompilationService.generate()`** (the `intent-element` target) and `POST /generate`: nothing
  called them.
- **`packages/vscode-extension`**, the LokaScript VS Code extension, which was never published. The
  language server stays.

### Added

- **`@lokascript/compilation-service` exports `VERSION`.**

### Fixed

- **`@lokascript/semantic`: `transition … using "<css transition>"` translates in the verb-final
  languages** (#1589). In bn, hi, ja, ko, qu and tr the duration slot, which has no marker there,
  took the style's quoted string, so `translate()` refused the script, and the bare command did not
  parse. A duration slot that takes only literals now leaves a quoted string to the style.

### Changed

- **`@hyperfixi/mcp-server` requires `@lokascript/domains` ^5.0.4**, which peers framework, semantic
  and intent `^5.0.0 || ^6.0.0 || ^7.0.0` (lokascript-domains #60): the bridge that lets 7.0.0
  publish. 5.0.3, which it required before, lets BehaviorSpec's `given` set every state `expect`
  can check, and refuses an `expect` assertion it does not know (5.0.2 compiled it to a comment).

## [6.3.0] - 2026-10-18

The htmx adapter writes localized SSE and WebSocket attributes under the names the page's htmx
reads: htmx 4's `hx-sse:` / `hx-ws:` on htmx 4, without its deprecation warnings, and htmx 2's on
htmx 2.

### Changed

- **`@lokascript/htmx-adapter`: localized SSE and WebSocket attributes take the page's htmx's names**
  (#1582).
  On htmx 4, `sse-conectar` canonicalized to htmx 2's `sse-connect`. htmx 4's `hx-sse` and `hx-ws`
  extensions read that, but copy each one with a "legacy attribute … is deprecated" warning: three
  on a page with one connection of each. The adapter now writes `hx-sse:connect`, `hx-ws:connect` and
  `hx-ws:send` (in htmx's `metaCharacter`) on htmx 4, and htmx 2's names on htmx 2, which reads only
  those. The generation comes from the htmx `registerWith` is given, accepted or not; before that the
  adapter writes htmx 2's names, which both read. htmx 4's spelling of a localized name works too
  (`hx-sse:conectar`, `hx-ws:enviar`). `sse-swap` has no htmx 4 name (htmx 4 removed it), so a
  localized one stays `sse-swap`, and htmx 4 warns about it. A new browser test runs it on htmx
  4.0.0's own extensions: connect, swap and send, with no warning.

## [6.2.0] - 2026-10-18

The `@lokascript/semantic/core` path weighs about a third less, and its lexicons now register with
it. MCP `get_diagnostics` gives the engine's verdict for English, and a multi-line BehaviorSpec with
a line it cannot read is refused instead of compiled without it.

### Fixed

- **`@hyperfixi/mcp-server`: `get_diagnostics` gives the engine's verdict for English, where it
  stopped** (#1575). Measured on 672 inputs (the agent bench and the docs patterns, in en/ja/es/ar), it
  flagged 6 of the 27 English inputs the engine rejects, none with a position; gave 9 false errors
  on English the engine reads (8 of them a possessive `'s` read as an open quote); and warned 467
  `possible-typo`s, 391 on ja/es/ar words checked against an English command list. Now: 27 of 27,
  each at the token where the engine stopped; 0 false errors (semantic's doubts about English the
  engine reads are warnings); and a "did you mean" only for the word the engine stopped on
  (`toggel`, not `and`), never off English. Style advice (`wait` over `setTimeout`, `then` between
  commands) stays.

- **`@lokascript/semantic`: `lexicons/<code>` registers its vocabulary with `./core`.** Each
  lexicon file bundled a private copy of the lexicon registry, so a page that imported
  `@lokascript/semantic/core`, `languages/ja` and `lexicons/ja` registered the Japanese words in a
  Map `render` never read, and value words stayed English (`私の valueに` for `私の 値 に`). The root
  entry and the browser bundles were not affected. `test/core-subpaths.test.ts` holds it on the
  built files (#1577).

- **`@hyperfixi/mcp-server`: a multi-line BehaviorSpec with a line it cannot read is refused,
  not compiled without it** (lokascript-domains #54). On `@lokascript/domains` 5.0.1,
  `compile_behaviorspec` answered `ok: true` for `test "Login"` / `given page /login` /
  `when I click #submit` / `then #result is visible` with only the `goto`: the two lines it
  could not read were gone. mcp-server is on domains 5.0.2, whose `compileBehaviorSpec` throws a
  `BehaviorSpecError`; the multi-line handler answers `ok: false` with `errors` (one per line)
  and the rest under `partial`, never `code`. `validate_behaviorspec` reports what compile would
  refuse (a `given page /login when …` URL that takes the rest of its line), and
  `translate_behaviorspec` refuses such a spec whole (`translated` and `playwright` are `null`)
  instead of translating what remained (#1576).

- **`@lokascript/compilation-service`: `/health` reports the package's version**, not the `1.4.0`
  literal it reported through 6.1.0 (`src/version.ts`, rewritten by `set-version.cjs`; #1576).

### Changed

- **`@lokascript/semantic`: the `./core` + `./languages/<code>` path weighs about a third less.**
  Measured with esbuild (minified, gzip -9) on learn's ten languages with their lexicons:
  275 KB → 180 KB; `./core` alone 155 KB → 120 KB; core with one language and its lexicon
  168 KB → 133 KB. Two packaging changes: `KNOWN_PROFILES` is marked pure, so a bundle that does
  not use it drops the profiles of languages it never imports (35 KB); and the language and
  lexicon modules share their common code in chunks instead of a copy each (60 KB over ten).
  Through the packed tarball, the bundled path renders exactly what the root entry does (1,476 of
  1,476 pairs: 164 docs patterns × 9 languages, there and back), and the root entry is unchanged
  (3,772 of 3,772 pairs against 6.1.0). `@hyperfixi/vite-plugin`'s debug size table is
  re-measured (one language ~130–135 KB, `all` ~222 KB) (#1577).

- **`@lokascript/language-server` on `vscode-languageserver` 10** (protocol 3.18; replaces
  Dependabot #1278), and the LokaScript VS Code extension on `vscode-languageclient` 10 (#1279),
  which needs VS Code 1.91 (`engines.vscode` was `^1.85.0`). 10.x adds an exports map without
  `./node.js`, so the server imports `vscode-languageserver/node`; a diagnostic's `message` may be
  `MarkupContent` in 3.18, so the code actions read its text either way. Over stdio the server
  answers as 6.1.0 does: the same capabilities, the engine's parse error at the same position,
  hover and completion (#1579).

### Added

- **`@lokascript/semantic/core` exports `getAllTranslations` and `getAllTranslationsWithStatus`**,
  over the languages a page registered. lokascript-learn's playground imported the root entry, and
  with it all 24 languages, for this one function (#1577).

### Deprecated

- **`@hyperfixi/mcp-server`: `parse_multilingual`, removed in 7.0.** It returns only the top node
  (every handler as `on` and its event) and reported success on 21 of the 27 English inputs the
  engine rejects; `validate_and_compile` returns the whole IR and the engine's verdict. Its
  description starts "Deprecated", and each result carries a second text block naming the
  replacement (#1575).

## [6.1.0] - 2026-10-18

One validator and one translator: MCP `validate_and_compile` accepts the English the engine reads
and warns `NAME_COLLISION`, and `validate_hyperscript` and `translate_hyperscript` are deprecated for
7.0. `@hyperfixi/vite-plugin`'s `slavic` and `south-asian` regions load their languages.

### Added

- **`@lokascript/compilation-service`: `validate` warns `NAME_COLLISION`** on foreign input whose
  variable is spelled like a word of its own language (es `si` is also `if`), with the rename
  semantic's finder suggests: the one check MCP `validate_hyperscript` made that `validate_and_compile`
  did not, with its wording and its confidence floor (#1568).
- **`@lokascript/compilation-service`: a README** (#1570). `files` listed one, but the package had
  none.

### Deprecated

- **`@hyperfixi/mcp-server`: `validate_hyperscript` and `translate_hyperscript`, removed in 7.0**
  (#1569).
  Measured 2026-10-18 on 6.0.0, through the server:
  - `translate_hyperscript` returns `translate_code`'s text on 471 of 471 pairs, with the same 21
    refusals; `translate_code` adds a fidelity `verification` and `NAME_COLLISION` warnings.
  - On 672 inputs `validate_hyperscript` caught nothing `validate_and_compile` missed, and every
    warning only it gave was a false alarm (a fixed list of 34 event names; an if/end count). Its one
    useful check, `NAME_COLLISION`, is in `validate_and_compile` now.

  Both still work. Their descriptions start "Deprecated", and each result carries a second text block
  naming the replacement. The skills, the mcp-server README, MIGRATION.md and the LLM-tool checklist
  name only `validate_and_compile` and `translate_code`. The lokascript-multilingual skill had called
  `translate_hyperscript` keyword substitution that does not reorder words, which was not true.

### Fixed

- **`@lokascript/compilation-service`: `validate` (MCP `validate_and_compile`) no longer rejects
  English the engine reads.** Of the 1,128 command-shape cases `@hyperfixi/engine` reads, it
  rejected 90:
  - every behavior definition (a `BehaviorNode` keeps its name as a field, and the schema check read
    it as a missing role; this also failed behaviors in every other language);
  - 73 parses under semantic's default confidence bar (`init`, `when`, `def`, `live`, bare `hide`, …);
  - a quoted event name semantic does not read, and `wait for <event>`.

  For natural-language English the engine's parse now decides `ok`, and semantic's doubts come back
  as warnings that say the IR may leave part of the code out. A request that sets `confidence`
  keeps them as errors, as does foreign input, which runs as semantic's translation. On the agent
  bench every correct rejection was already the engine's (16 of 16), so none moved.
  testing-framework's `validate-agrees-with-engine.test.ts` holds the 1,128 at 0 rejected (#1566).

- **`@hyperfixi/vite-plugin`: `region: 'slavic'` and `region: 'south-asian'` load their languages**
  (#1567).
  Both were in the option's type and the README's language list, but the expansion had a
  hand-written case per region and none for these two, so they loaded English alone. Regions now
  expand from `REGIONS` itself, and the README's region table lists both. The debug size table
  (`SEMANTIC_BUNDLE_SIZES`, January 2025) is re-measured by a new
  `scripts/measure-semantic-sizes.ts`: semantic's core plus one language is ~163–175 KB gzipped,
  not the ~14–20 KB it claimed (`all` ~383 KB, not ~61 KB).

## [6.0.0] - 2026-10-18

Removes `@lokascript/compilation-service`'s test and component generation, deprecated in 5.1.0. For
every other package 6.0 is a renumber: `@lokascript/domains` 5.0.1+ accepts it.

### Removed (BREAKING)

- **`@lokascript/compilation-service`: test and component generation** (deprecated in #1560).
  Gone: `generateTests`, `generateComponent`, `registerTestRenderer`, `registerComponentRenderer`,
  `PlaywrightRenderer`, `ReactRenderer`, `VueRenderer`, `SvelteRenderer` and their types,
  `ServiceOptions.testRenderers` / `componentRenderers`, the HTTP routes `/generate-tests` and
  `/generate-component`, and `generate()`'s react, vue and svelte targets (it answers
  `UNKNOWN_TARGET`; `intent-element` stays). `@hyperfixi/mcp-server` drops the `generate_tests` and
  `generate_component` tools: 96 defined, 91 listed by default (98, 93). The operation extractor
  stays, behind `diff`; its per-operation tests now run through `/diff`. MIGRATION.md has the 6.0
  table.

### Changed

- **`@hyperfixi/mcp-server`: on `@lokascript/domains` 5.0.1**, which peers framework, semantic and
  intent `^5.0.0 || ^6.0.0` (lokascript-domains #52, #53): the bridge that lets 6.0.0 publish.

## [5.1.0] - 2026-10-18

Deprecates `@lokascript/compilation-service`'s test and component generation, which 6.0 removes;
`@hyperfixi/mcp-server` moves to `@lokascript/domains` 5.0.0.

### Changed

- **`@hyperfixi/mcp-server`: on `@lokascript/domains` 5.0.0** (domains rethink Phase 6), which deletes
  bdd and peers framework, semantic and intent `^5.0.0`. The server registers every domain (no
  `omit`); the same seven domains and 28 domain tools as 5.0.0. framework's and server-bridge's
  dev dependency follows (`^5.0.0`) (#1559).

### Deprecated

- **`@lokascript/compilation-service`: test and component generation, removed in 6.0** (#1560).
  `generateTests`, `generateComponent`, `registerTestRenderer`, `registerComponentRenderer`, the
  `PlaywrightRenderer`, `ReactRenderer`, `VueRenderer` and `SvelteRenderer` exports, and the react,
  vue and svelte targets of `generate` (its `intent-element` target stays). Each call still works
  and its response now carries an info diagnostic, `DEPRECATED`. The HTTP routes
  `/generate-tests` and `/generate-component` and the MCP tools `generate_tests` and
  `generate_component` go with them in 6.0; the tools' descriptions say so now. Measured on the
  docs sites' 164 English patterns and lokascript-examples chat's five examples: 15 of 169 inputs
  give a Playwright test that fails without the engine (103 are refused, 23 tests pass with no
  engine loaded, 26 fail on it), and 4 of 6 React components do not typecheck (every command
  aimed at another element: siblings with no fragment, `function ToggleDark-mode`,
  `const [, set]`). Validation, translation, `scoreFidelity` and `diff` stay.

## [5.0.0] - 2026-10-17

A renumber for everything but `@lokascript/framework`, whose classic DSL engine is removed: every
other package is unchanged in its API, and `@lokascript/domains` 4.2.1+ accepts 5.0.

### Removed (BREAKING)

- **`@lokascript/framework`: the classic DSL engine** (domains rethink Phase 6; M3 (e): one
  matcher). Every DSL reads on the core engine, which every kept domain has used since domains 4.2.0
  (bdd's own suite and its gate read the same on it, 0 cases moved). Gone: `PatternMatcher`,
  `patternMatcher`, `matchPattern`, `matchBest` and the `./core/pattern-matching` subpath (and
  `PatternMatcher` from `./parsing`); the classic generator, `generatePattern`,
  `generatePatternVariants` and `GeneratorConfig`. `createMultilingualDSL` defaults to the core;
  `engine: 'core'` is still accepted and changes nothing, so the domains build unchanged, while
  `engine: 'classic'` throws, naming what replaced it. Kept: the schema renderer
  (`createDomainRenderer`, `createSchemaRenderer`, the domains' renderer kit), `PatternGenLanguageProfile`
  and `sortRolesByWordOrder` (now in `generation/profile.ts`), and the value helpers the stock reader
  uses (`isTypeCompatible`, `getPossessiveReference` & co., now in `core/matching`, still exported
  from the root).

### Changed

- **`@hyperfixi/mcp-server`: on `@lokascript/domains` 4.2.1, without bdd's tools** (domains rethink
  Phase 5, D6). `parse_bdd`, `compile_bdd`, `validate_bdd` and `translate_bdd` and the multi-step
  bdd scenario handling are gone: behaviorspec reads bdd's preconditions, actions and assertions
  (`given #button is visible`, `when user presses 'Enter'`, `expect #title text Welcome`), and the
  server creates its registry with `createDomainRegistry({ omit: ['bdd'] })`. 98 tools defined, 93
  listed by default (102 and 97). From domains 4.2.0 the domain tools also refuse what their DSL does
  not read (no domain gate case accepts leftover input), and `parse_learn` & co. read and write
  learn's commanding sentence with semantic.

### Fixed

- **`@hyperfixi/server-bridge` reads a fetch's method from upstream's options.** It read the method
  only from 2.x's `via POST`, so a route written in the engine's syntax, such as
  `fetch /api/x with {method:'POST'}`, was generated as GET. It now reads `with {method:'POST'}`,
  `with method:'POST'` or a bare `{method:'POST'}`, with `as` before or after them (`as an html`
  too); `via` is still read. Measured on lokascript-examples' cross-domain and flow-playground
  pages: 3 POST routes read as GET, all POST now.

## [4.8.0] - 2026-10-16

### Added

- **`@lokascript/intent` / `@lokascript/framework`: a role's word list, `RoleSpec.words`** (domains
  rethink Phase 5). Per language, with `'*'` for every language; the core engine (`engine: 'core'`)
  reads such a slot only from one of its words, compared lower-cased, so a word the grammar does not
  know is left unread and the input refused, instead of read as the value. It is for a domain's fixed
  words: behaviorspec's `when clicks zzqx` read actor `clicks`, action `zzqx`, and compiled to a
  comment. The schema-pattern generator carries the pattern language's list on the role token
  (`RolePatternToken.words`); a grammar that lists no words generates the same patterns. The classic
  engine and semantic ignore it.
- **`@lokascript/framework/testing/gate`: `GateFixture.commands`**, commands the gate writes besides
  the generated ones, where one role's value depends on another's (behaviorspec's
  `[given subject:#box value:visible]` beside `[given subject:viewport value:1024x768]`).
- **`@lokascript/framework`: `UnreadInputError.hint`.** Where the last word a parse read as a value is
  followed by another bare word, the refusal adds `if "buy milk" is one value, quote it` (todo's
  `add buy milk to groceries`, whose item is quoted).

### Changed

- **`@lokascript/framework/testing/gate`: leftover input read into a role is `pass`.** An unknown word
  after a command used to be `silent` wherever the parse accepted it. It is `pass` when the parse is
  the text's own with the word in one role (an open-text role extended by it, sql's
  `where active zzqx`, or a role the text left empty, todo's `list zzqx`) and the word reaches the
  compiled code; `refused` when the input stops compiling; `silent` otherwise (read as something
  else, or the word goes nowhere). `readsWord` is exported. On the domains (domains 4.1.0, this
  framework packed): 74 leftover cases accepted → read, 0 worse, 0 parses moved.
- **`@lokascript/framework`: the stock reader's optional slot does not read a marker the rest of the
  pattern owes**, through its optional groups, as a required slot already does not read the marker
  next to it (behaviorspec's `when user types into #search`, whose typed text is optional and has no
  marker). No domain parse moves.

## [4.7.0] - 2026-10-16

### Added

- **`@lokascript/framework`: the matcher's skeleton, `MatchSkeleton`** (domains rethink Phase 4.3), with
  its seam (`ValueReader`, `MatchView`, `RoleSlot`) and the `ConfidenceModel` / `ConfidenceContext` /
  `ConfidenceBreakdown` interfaces, all exported. It is the skeleton semantic's hyperscript matcher runs:
  `@lokascript/semantic`'s `PatternMatcher` now extends it and passes `HyperscriptValueReader`, and its
  confidence types are framework's narrowed to hyperscript's names. Framework's pattern types take the
  fields semantic's carried alone (`LanguagePattern.parseOnly`, `LiteralPatternToken.renderSuppress`,
  `RolePatternToken.valueShape`, `GroupPatternToken.renderRequired`, `ExtractionRule.valueIsExpression`,
  `PatternMatchResult.roleStarts` / `eventSource`). `createMultilingualDSL` still uses its own matcher.
  Every hyperscript parse is unchanged (27,194 checked); semantic's browser bundles grew ~150 bytes
  gzipped.
- **`@lokascript/framework`: `createSchemaPatternGenerator`** (domains rethink Phase 4.4), the pattern
  generator semantic's hyperscript parser runs, moved from `@lokascript/semantic`: the main pattern per
  command and language and its variants (simple, omit-role, widened-type, required-role, SOV verb-first,
  value-prefix-literal), with the grammar's hook `positionOrder` (`'ascending'`: hyperscript's 1-based
  positions; `'descending'`: a domain's, as framework's `generatePattern` reads them). Also exported:
  `withoutVariantOnlyRoles`, `resolveMarkerForRole`, `schemaMarkerAlternatives`,
  `legacyMarkerAlternatives`. semantic's `generatePattern` / `generatePatternVariants` / … keep their
  names and signatures over it; its fused event-handler patterns stay in semantic. Every generated
  pattern in all 24 languages is byte-identical (5,899), and every parse unchanged (27,194).
- **`@lokascript/framework`: rendering through patterns, and the translation-loss checks** (domains
  rethink Phase 4.5), moved from `@lokascript/semantic`. `selectRenderPattern` scores a language's
  patterns for a node (role coverage, values a pattern pins) and `renderPattern` walks the chosen one;
  a grammar's preferences and its value writing are `PatternRenderHooks`. `findTranslationLoss` runs
  the fail-loud checks in order (unread input, forms nothing writes, a read-back that does not read or
  differs, verbatim values) with a grammar's `TranslationLossRules`; `LossyTranslationError`,
  `TranslationLoss` and `unconsumedSpans` moved with it (semantic re-exports them, so `instanceof`
  holds). semantic's renderer and `translate` run them with hyperscript's hooks and rules; its
  collision rule (`verified-render`) stays in semantic. Every translation of every command-shape case
  in all 24 languages is unchanged, rendered (27,240) and with refusals on (704 refused, the same
  kinds and losses).
- **`@lokascript/framework/testing/gate`: the round-trip gate kit and the grammar linter** (domains
  rethink Phase 4.6), moved from lokascript-domains: `runRoundTrip` renders every command of a
  grammar in each of its languages and reads it back (`pass` / `refused` / `silent`, plus each render
  with an unknown word after it, which must be refused); `compare` / `listingOf` / `countsOf` keep a
  shrink-only baseline and `snapshotOf` / `snapshotChanges` a parse snapshot; `lintDomain` runs the
  domain-toolkit rules R1–R10, its schema-structure rule on the validator the input passes
  (`validateSchema`; framework cannot import semantic). No test runner needed. On the 8 domains, with
  their own fixtures, it reads 3,488 of 3,488 cases as the domains' gate does, with no drift from
  their baseline.
- **`@lokascript/framework`: the stock value reader and confidence model for domain grammars** (domains
  rethink Phase 4.7a). `createStockReader()` (`StockValueReader`) is a `ValueReader` for the matcher's
  skeleton: a greedy slot reads up to the next marker its pattern owes (`readGreedy`,
  `greedyStopMarkers`), any other slot one value (`readRoleValue`: a selector, a quoted string, a number,
  a boolean, a duration, a URL, an identifier, or a dotted or called form, checked against the slot's
  types), a required slot never takes the marker its pattern wants next, and an optional one may be
  skipped for it. `stockConfidenceModel` scores as the old matcher did. Both are the old matcher's code,
  moved: `createMultilingualDSL`'s matcher calls them, and the domain gate on this build moves no case
  and no parse. `createSchemaPatternGenerator` also takes a domain schema's `greedy`, its
  post-verb `sovSlot` and its `markerPosition` (hyperscript's patterns: unchanged, 5,899).
- **`@lokascript/framework`: `engine: 'core'`, a domain DSL on the core** (domains rethink Phase 4.7b):
  a `DSLConfig` option. `createMultilingualDSL({ ...config, engine: 'core' })` returns the same
  `MultilingualDSL`, read by the core semantic's hyperscript parser runs: patterns from
  `createSchemaPatternGenerator` (positions descending), matched by `MatchSkeleton` with the stock
  reader and confidence model, and rendered through those patterns where the domain's own renderer
  declines. Parsing's whole-input rule, the refusals, translation's read-back, compile, explicit syntax
  and extensions are shared with the default, `engine: 'classic'`, which is unchanged; any other engine
  name throws. The stock reader also gives a required slot back the value an optional, marker-less slot
  just before it read (the old matcher's backtrack). Measured on the 8 domains, each on the core
  (the domain gate on a packed build): 0 cases worse, 30 better (behaviorspec 306 → 336
  round trips), no case silent that was not before.

### Changed

- **`@lokascript/intent`: one schema type for every grammar** (domains rethink Phase 4.1). `RoleSpec` and
  `CommandSchema` now hold the fields hyperscript's schemas use as well as the domains' (`valueShape`,
  `variantOnly`, `markerOptional`, `markerLegacy`, `valuePrefixLiteral`; `bareKeyword`, `structuralOnly`
  and the `omitRoleVariants` / `widenTypeVariants` / `rolePrefixLiteralVariants` / `requiredRoleVariants`
  lists), each documented with the code that reads it, and take type parameters for a grammar's action,
  role, value and category names. The parameters default to today's types, so a domain schema reads as
  before; framework's `docs/API_SURFACE.md` prints them spelled out. `@lokascript/semantic`'s `RoleSpec`
  is this type with hyperscript's names, and its `CommandSchema` extends it with the fields only its AST
  builder and error docs read (`ast`, `errorCodes`, `preconditions`, `recoveryHints`). One field keeps two
  meanings for now: framework's generator sorts `svoPosition` / `sovPosition` descending (higher =
  earlier), semantic's ascending; the field doc says so.
- **`@lokascript/semantic`: the pattern matcher reads every value through a seam** (domains rethink
  Phase 4.2). The matcher is now a grammar-neutral skeleton (`parser/match-skeleton.ts`: literals,
  groups and their rollback, the speculative skip of an optional slot, spans, ranking, confidence) and
  hyperscript's `HyperscriptValueReader`, which reads each role slot and answers the skeleton's grammar
  hooks (`parser/value-reader.ts`). `PatternMatcher` keeps its constructor, methods and import path. Every
  parse is unchanged (27,194 checked).

## [4.6.0] - 2026-10-15

### Added

- **`@lokascript/semantic`: `ask` and `answer`** in every language's own word (es `preguntar` /
  `responder`, ja `尋ねる` / `答える`, de `frage` / `antworte`): upstream's two dialog commands
  (`ask "Name?"` prompts; `answer "Save?" with "Yes" or "No"` confirms, the choices after the language's
  `with`). Both were refused in every language. Listed for native review in
  `packages/semantic/NATIVE_REVIEW_NEEDED.md`.
- **`@lokascript/semantic`: `scroll … by` with a direction** in every language's own words
  (`scroll #box down by 200px`: es `desplazamiento #box abajo por 200px`, ja `#boxを 下 200px スクロール`,
  ru `прокрутить #box вниз 200px`). Upstream's relative scroll was refused in every language: no
  direction had a word, and scroll's schema modeled `scroll to <el>` alone. Listed for native review in
  `packages/semantic/NATIVE_REVIEW_NEEDED.md`.

### Changed

- **`@lokascript/framework`: a domain DSL's parse refuses input it did not read.**
  `createMultilingualDSL`'s `parse` (and so `compile`, `validate`, `translate`) tries every pattern and
  takes the best match that reads the WHOLE input: highest priority, then confidence. When the only
  matches leave input unread, it throws `UnreadInputError` (exported; `code: 'unread-input'`, with the
  longest match's `reading` and the `unread` text). It used to return the first match however much it
  read, so a trailing word was dropped without a word: the domain gate (lokascript-domains) found
  1,744 of 1,744 renders accepted with an unknown word after them, and `ask what is 2+2` asked the
  model "what". Against the gate (domains 4.0.0, measured unpublished with `gate:upstream`): 1,527
  cases better, 62 worse, every one `pass → refused` (a value such as `click`'s that the generator
  ignored, now refused as unread rather than dropped); no case became silent, and no accepted parse
  changed its reading. A multi-word llm question is quoted: `ask "what is 2+2"`.
- **`@lokascript/framework`: a domain DSL's `translate` refuses a rendering that does not read
  back.** It reads its output in the target language and requires the source command: the same
  action and role values, or the same compiled code. Otherwise it throws `TranslationReadBackError`
  (exported; the text under `partial`, what it reads as under `reading`), unless `{ lossy: 'allow' }`,
  as semantic's `translate`. `DomainRegistry`'s tools (the MCP `parse_` / `compile_` / `validate_` /
  `translate_<domain>` tools) report refusals as `ok: false` with an `UNREAD_INPUT` or
  `TRANSLATION_DOES_NOT_READ_BACK` diagnostic instead of a generic tool error, and `translate_<domain>`
  reads its own rendering back the same way. Translating every domain gate command from English: 46
  renders that used to be returned are now refused (45 do not parse in the target language).
- **`@lokascript/semantic`: the parser is split into modules.** `semantic-parser.ts` went from 9,680
  lines to 751, across 22 modules under `parser/`, and each question about an end word (does it close a
  block, does it stop a clause) has one reader. Each step was checked against 27,194 parses; the steps
  that change a reading are listed under Fixed. `SemanticParseError` keeps its import path.

### Fixed

- **`@lokascript/semantic`: a handler's count** (`on click 1 …`, the first click only; `on click 2 …`)
  is read in every language. The renders already wrote it (es `al clic 1 ocultar`), but every reader
  outside English dropped it, so the translation was refused in all 23 languages. Bengali, Italian and
  Thai also read every clause between a handler's event and its body (`on click elsewhere`,
  `on mutation of attributes`, `on foo queue first`), which their head pattern skipped. In the command-shape
  gate, 375 lanes that were refused now pass.
- **`@lokascript/semantic`: a query of a pseudo-class alone** (`<:checked/>`, `<:not(.done)/>`) reads
  as a query in every language, English too. Every tokenizer read `<` and then a local variable
  `:checked`, so a translation was refused. In the command-shape gate, 161 lanes that were refused now
  pass.
- **`@lokascript/semantic`: value spellings from upstream's own tests** read in every language,
  English too: an escaped class name (`.group-\[:nth-of-type\(3\)_\&\]:block`), a query of several
  selectors (`<#d1, #d2/>`), a unit after parentheses (`(startWidth)px`), `[@data-foo]` and an
  attribute after a pronoun (`set it @disabled to true`, written `its @disabled`), a dotted property
  before `of` (`set parentNode.innerHTML of #d1 to "foo"`), and `set {bar: 2, baz: 3} on obj`. Each was
  refused. `get` no longer has a destination slot, which no reader used and which took Italian's `in`:
  `get #p1 in me` read back as `get #p1 on me` in Italian, and `get result as JSONString` was refused
  in Quechua. In the command-shape gate, 202 lanes are better, 3 of them silent before.
- **`@lokascript/semantic`: upstream's collection expressions** read in English and translate:
  `set :items to <span/> in #box where it matches .a`,
  `put matches mapped to its textContent into #out`, `repeat for x in :items where x.val > 10 …`. They were refused in every language, English
  too, or kept as an English clause after the command. A translation writes the language's own `where`,
  as it already did in a condition (es `donde`, de `wo`), and keeps `mapped to` in English until native
  review. Also read now: an element-scoped variable (`:items`) inside a longer value, the article in
  `in the closest <table/>` and `checked of the :boxes`, and zh/tl's `no` before a sigil variable. Quechua and
  Vietnamese read their own `where` back (it read as `target`, or split at its `_`), which also clears a
  silent pair in each. In the command-shape gate, 154 lanes are better, 2 of them silent before.
- **`@lokascript/semantic`: a query's scope inside a phrase** reads in English and translates:
  `put the length of <:checked/> in #box into me` (the value ended at the query and `in` was taken as
  put's marker), `bind $n to the length of <:checked/> in the next <tbody/> …` (a positional scope),
  `put <span/> in #box where it matches .a into me` (English came back silently as `… into #box …`), and
  `put the length of <p/> into #out` and `put 'x' into the next <div/>'s textContent`, which the lossy
  check refused because it read the `'s` after `<p/>` as a quote. In the command-shape gate, 63 lanes are
  better, 1 of them silent before.
- **`@lokascript/semantic`: no translation reads back as other English without saying so.** The
  command-shape gate's last five silent pairs read back as their source: pl's `closest .bar to .foo`
  (pl's own `to` is "it"), `closest @foo` in pl and sw, a Quechua chain of `'s` (`$data's inner's val`,
  read as a string), and Indonesian's `saya punya @data-x`. English `set closest @foo to "doh"` and
  `put closest @foo into me`, refused in all 24 languages, read now too.
- **`@lokascript/semantic`: commands that semantic already models, refused in some languages,** read
  and translate. In the command-shape gate, 168 lanes that were refused now pass; with the rows above,
  the refused lanes of shapes semantic models went from 911 to 86, and the gate reads 26,531 pass,
  709 refused and 0 silent. The commands:
  - `fetch $u as JSON`, with a `$` or `:` variable as the URL (23 languages);
  - `toggle my *display`, `*opacity` and `*visibility` (ar, de, fr, he, ja, tr);
  - a `js(…) … end` block after `then` behind a handler head (bn, es, it, ko, pl, ru, th, tl, uk);
  - a snake_case name (`call global_function()`), which 11 tokenizers split at its `_`;
  - a custom event after a handler head's `or` (`on click or foo`: bn, it, ja, ko, th, tr, zh). English
    no longer drops the second event of `on foo or bar`;
  - `put … at end of` in Vietnamese, and in bn, hi, ja, qu and tr after a bare name
    (`put response at end of #results`);
  - a `set` target with no marker after it, in it, pl, ru and uk (`set .divs.innerHTML to "foo"`,
    `#d1.parentNode`, `bar["count"]`), and `on keydown[key=="Enter"]` in ar, de, fr and he;
  - `fetch … as Object` and `as Number` behind a bn, hi or ko handler head;
  - a top-level `for item in items …`, which bn, hi, ko and sw read as a handler on `item`;
  - a loop's bottom test (`repeat … until x is 3 end`) in de, fr and ko;
  - a Korean second handler on a parameterized event (`on exception(error)`), and Polish
    `then throw` after `do` (Polish for `into`);
  - bn, th and vi's own word for `checked`.
- **`@lokascript/semantic`: `at end of` inside a behavior or a def** reads in every language:
  `behavior B on click put "x" at end of me end` was refused, English to English too, because the
  `end` of `at end of` closed the block. A variable spelled like an end word in such a body reads too
  (es `fin`).
- **`@lokascript/semantic`: two copied type lists that had lost `property-path`.** Chinese reads
  `put the textContent of last <.picked/> in #list`, which it refused, and ja, ko and zh write the count
  of `repeat the textContent of #a times` in their own words (`#aのtextContent`), not English.
- **`@lokascript/semantic`: Quechua's `repeat until event … from …`** writes Quechua
  (`kama ruway pointerup ta kutipay #box manta …`), not a leftover of the retired i18n transformer with
  English `until event` and `repeat` in it.
- **Test runs no longer fill the temp directory**: `scripts/vitest-run.sh` gives each run its own
  `TMPDIR` and removes it. Vitest 5.0.2 leaves a copy of every transformed module in `$TMPDIR` per run.

### Removed

- **`@hyperfixi/mcp-server`: the jsx domain's four tools** (`parse_jsx`, `compile_jsx`, `validate_jsx`,
  `translate_jsx`), and `jsx` as a `domain` for `lse_validate_and_feedback`, `generate_training_data`
  and the `lse_generate` prompt. The server now depends on `@lokascript/domains` ^4.0.0, which retired
  jsx with six other preview domains (`docs-internal/DOMAINS_RETHINK.md`, D1). 8 domains remain (sql,
  bdd, behaviorspec, llm, flow, voice, todo, learn): 32 domain tools, 102 tools defined, 97 listed by
  default.

## [4.5.0] - 2026-10-11

Pronouns, suffixes and handler heads read as their language. In 4.4.0 every translation wrote `me` and
`it` in the nominative beside a marker (es `a yo`, de `zu ich`, tr `ben e`, ar `إلى أنا`), wrote every
case particle as a word of its own (ko `#out 에`, ja `"x" を`), and wrote a Japanese, Bengali or Turkish
handler head with two markers (`クリック を で`, `ক্লিক তে`, `tıklama i üzerinde`). Each of these is now
the language's own form, and every reader still takes the old one. The forms are listed for native
review in `packages/semantic/NATIVE_REVIEW_NEEDED.md`; none has been reviewed yet.

### Added

- **`@lokascript/testing-framework`: the English-leak gate counts pronoun case and marker spacing.**
  `case:it` and an unmarked object pronoun (`case:me-object`, `case:it-object`) beside `case:me`; and
  `spacing:<marker>`, a particle ko, ja, bn or tr attaches to its noun written as a word of its own.
  Both shrink-only, both halves (corpus and command shapes), with per-language exit targets in
  `LEAK_TARGETS`.
- **`@lokascript/semantic`: `toggle … between`** in every language's own words (ja `の間で`, hi `के बीच`,
  he `בין`), with the style form's element written in the language.
- **`docs-internal/multilingual/FUSED_FORMS.md`**: the design for pronouns fused with their markers and
  suffixes attached to words, with the owner's four questions and their answers.

### Changed

- **`@lokascript/semantic` writes a pronoun in the case its marker takes.** Free forms: es `en mí`,
  pt `a mim`, it `a me`, tl `sa akin`, pl `do mnie`, ru `ко мне` / `во мне`, uk `до мене`, de `zu mir`
  / `in mich` (direction) / `auf mir` (location), hi `मुझ में`; `it` after a marker (ru `к этому`, pl
  `do tego`, de `dazu` / `darin` / `darauf`, fr `à lui`, hi `इस में`); `me` as a verb's object (de
  `zeige mich`, ru `покажи меня`). Fused forms: tr `bana` / `beni` / `benden`, `ona` / `onu`; ar `إليّ` / `فيه`;
  he `אליי` / `ממני`; bn `আমাকে` / `আমাতে`; hi `मुझे`; tl `dito`; pt `nele`. Object clitics on the verb:
  es `mostrarme`, it `metterlo`, pt `colocá-lo`, ar `ضعه`; fr writes the object pronoun before the
  infinitive (`le mettre`, `l'afficher`, `me cacher`). Every reader takes the nominative and the English
  forms as before.
- **`@lokascript/semantic` writes a case particle onto its word** in ko (`"x"을 #out에 넣다`, `나를`,
  each particle in the form the syllable takes), ja (`#outに`, `.aを`) and bn (`#outএ`, `.xকে`), and tr
  fuses a suffix with its own reference words (`sonucu`, `hedefe`, `belgeye`) while code keeps its
  suffix apart (`#out e`) until a reviewer picks a code word's harmony. tr also reads a suffix on code
  after an apostrophe (`#out'a`, `.active'i`).
- **`@lokascript/semantic`: a custom event in a wait takes the language's `event` word** (`esperar evento foo`,
  ja `イベント foo 待つ`), as `repeat until event X` already does; a known DOM event keeps `esperar transitionend`.
  `wait for <custom event>` was refused in every language. A possessive whose property is a reference word
  (`its.detail`) now reads back as that property, not the language's word for it.
- **`@lokascript/semantic`: ms and pl read their lexicon's `undefined` word** (`tidak_ditakrifkan`, `niezdefiniowane`),
  which read back as a variable name.
- **`@lokascript/testing-framework`: the hand-written-input gate** (`hand-written-input.test.ts`): twenty tasks a
  native speaker writes from English, run as written on the engine against upstream; committed with no inputs.
- **`@lokascript/semantic` writes a handler head as one word**: ja `クリックで` (was `クリック を で`),
  bn `ক্লিকে` (the locative in the form the word takes: `জমাতে` after a vowel; was `ক্লিক তে`),
  tr `tıklamada` (the locative in the form harmony gives: `göndermede`, `değişiklikte`; code keeps it apart, `keyup da`; was `tıklama i üzerinde`). The readers keep taking the two-marker heads.
- **`@lokascript/semantic` writes a query's scope before the query** in bn, hi, tr, ja and ko (tr
  `bendeki <p/>`, hi `मुझ में स्थित <p/>`, ja `自分 の中の <p/>`), where it wrote English's order.
- **`@lokascript/semantic`: es and pt write the `focus` and `blur` commands as verbs** (`enfocarme`,
  `focar-me`); the nouns were the events' and still read.
- **`@lokascript/semantic`: ja's head pattern outranks its fused handler patterns**, so a ja handler's
  body always takes the clause walk: a `js … end` block after `then` and `fetch … as T` round-trip
  where the fused path dropped them. The 2026-08 transformer's verb-first `繰り返し イベント X を まで`
  body no longer reads in ja (the render since 2026-08-28 does).

- **`@lokascript/htmx-adapter`: the tr vocab gains `hx-da` as an alias of `hx-on`;** `hx-üzerinde` stays the name
  (the profile's `on` word moved to the locative; a suffix is the wrong register for an attribute name).

### Fixed

- **`publish.yml`: a repair run skips a version npm is still processing** (`E409 previously staged`)
  instead of failing the whole run.

## [4.4.0] - 2026-10-10

Translations now read as their language. In 4.3.0, 19% of the corpus's translations and 24% of the
command-shape scripts' translations kept at least one English word, and a third of the corpus kept an
English event name. Counting only the English a recorded decision does not keep (type names, `url`,
`debounced at`, …), every one of the 23 languages is now at or under 5% of corpus renders (0.7–4.6%)
and 10% of command-shape renders (3.9–6.2%), and no translation writes an English event name its
language has a word for. The words are the owner's vocabulary sheet
(`docs-internal/multilingual/VOCABULARY_SHEET.md`), decided 2026-10-08.

### Added

- **`@hyperfixi/testing-framework`: the English left in a translation is gated.** `english-leaks.ts`
  counts, per render, the English grammar words (the tokens the engine's own parser matched in the
  source), English event names the language's lexicon has a word for, and a nominative `me` beside a
  marker in the 13 languages where that case is wrong. Two shrink-only baselines (the corpus, in
  `test:canonical`, and the command-shape cases, in their shards);
  `tools/regen-english-leaks-baseline.ts --report` prints each language against M2's targets. An English alternative a profile keeps for
  code-switched input, beside a primary that is the language's own, counts as English.
- **`@lokascript/semantic`: `transition … from … to`** reads and writes in every language (a `source`
  role), and the bare command reads in English. The schema's `destination` role is gone: upstream has
  none, and SOV destination markers read an owned property's owner as an element (tr and qu swapped
  `#foo's *width` silently). English writes `using` for an easing.
- **`@lokascript/semantic`: `add/remove/hide/show … when <condition>`** in every language, through a
  `condition` role marked with each profile's `when`. It was English in every translation, and refused
  as a bare command.

### Changed

- **`@lokascript/semantic` writes each language's own words** for: loop heads (`repeat for x in`,
  `while`, `until`; es `repetir para x en .items`), `I match` / `I am` (written as the third person, and
  back in English as upstream's first person), `does not match`, `fetch … do not throw`, `on first`,
  `go back`, `from elsewhere`, a loop's `index`, `start view transition`, a query's `in`, a conversion's
  `as` (the type name stays English), `the X of Y` inside an expression (es `valor de #price`, ja
  `#priceの値`), `catch` and `finally`, `element x`, and `def` (as the noun "function", es
  `función greet(name)`). bn, th and vi have their own `document` and `window`; he has its own words for all of
  these and for `matches`, `exists`, `or`, `not`, `first`, `next`, `previous`, `closest`, `empty`, `is`,
  `document` and `window`; and the 15 languages that wrote English `forever` have their own (es
  `repetir siempre`, de `endlos`, ja `ずっと`). Every reader still takes the English words. Where a word
  would read back as another (es `en` is also a marker), the translation keeps English's.
- **`@lokascript/semantic` writes native event names** in he, hi, it, pl, qu, ru, th, uk and vi where
  the lexicon's word reads back; the rest are denylisted with their reasons.
- **`@lokascript/semantic`: a foreign `put X at start of Y` is written with the language's `prepend`**,
  which English writes back as `put … at start of`.

### Fixed

- **`@lokascript/semantic` reads `me` after a marker in the case the marker takes**, as authors write it:
  de `zu mir`, pt `a mim`, pl `do mnie`, ru `ко мне`, uk `до мене`, hi `मुझ में`. Each was read as a
  variable (`zu mir` ran as `to mir`) or refused. Translations still write the nominative.

- **`@lokascript/semantic`: `put X at start of Y` translates.** It was refused in all 23 languages: no
  language but English had a pattern for it, and the render wrote `at end of` in its place.
- **`@lokascript/semantic`: a one-line handler's `put … at end of`** translates in es, id, it, pt, tl and
  uk. The fused handler pattern took the end noun for the destination wherever the language's `at` word
  is also a destination marker.
- **`@lokascript/semantic`: `^x is …` keeps its copula** in ar, hi and th, which read the `is` word after a
  `^` variable as the pronoun `it`.
- **`@lokascript/semantic`: an SOV loop body may open with a variable named `index`** (ja `index を …`),
  and `repeat` is never read as an event name.

## [4.3.0] - 2026-10-07

More of what upstream reads now translates, and what does not is refused instead of lost. On the
command-shape gate, round trips that came back silently different fell from 174 in 4.2.0 to 31,
none of them in English; 24,386 of 27,240 now read as their source does. English-to-English refuses
61 of the 1,135 scripts, down from 82, and each of the 61 now belongs to a named family with the
reason it is not carried yet.

### Added

- **`@lokascript/semantic` reads `on every <event>` and `init immediately`.** Both lost their head
  word, so the handler or the block was refused. `EventHandlerSemanticNode.eventModifiers.every` and
  `FeatureSemanticNode.immediately` carry them. English writes them as upstream does; every other
  language writes the English word first (`every al clic …`), as it already did for `on first`.
- **`@hyperfixi/testing-framework`: two new value-matrix axes.** A `branch` position is an `if` with
  no `then` before a command that names no target (`if 2 is in arr add .a end`). The matrix's `if`
  cells always wrote `then` and a `put` with its target, so an SOV reader always saw where the
  condition ended, and none of them could fail the way Turkish did (see Fixed). The 610 pairs that
  `branch` refuses are listed in the baseline. A twelfth operand kind is a CSS length (`100px`,
  `50%`). The matrix now has 5,396 cells.

### Changed

- **`@lokascript/semantic` refuses core's swap strategies that upstream has no spelling for.**
  `translate()` gains a loss kind, `'core-only'` (`TranslationLossKind`). Upstream and the engine
  read `swap morph of #t with it` as an exchange with a property named `morph`, so core's morph
  strategies, `none`, and a strategy with no content are now refused in every language. Before,
  English wrote them as they were read. Core's `swap into #t with x` and `swap over #t with x` are its
  innerHTML and outerHTML, and they are now written as `put x into #t` and `put x into #t's
outerHTML`. Before, English wrote `swap into of #t with x`, which runs as an exchange.
- **`@lokascript/semantic` writes a word in the target language only where that language's reader
  brings it back.** A property name is localized only through the reader's property table or as a
  keyword. So `add .foo to my children` keeps `children` in Spanish (`mi children`), where it wrote
  `mi hijos` and read back a property named `hijos`. A call's arguments are written as written
  (`call sprayInto(me)` wrote `sprayInto(yo)`). So is every bracket group inside an expression:
  `2 is in [true, n]` wrote `[verdadero, n]` in Spanish, a variable no reader de-localizes. And so is a
  type name after `am a`. These spots now show English words in foreign renders where they used to
  show words that did not come back.
- **`@lokascript/semantic`: `innerHTML` and `outerHTML` are no longer English keywords.** A swap's
  strategy slot still reads them, as words.

### Fixed

- **`@lokascript/semantic`: Turkish keeps an `if` condition whole before a command with no target.**
  `if 2 is in arr add .a end` read back as `if 2 add .a to is in arr end`, with any operand, and so
  did `is a Number` and `<` after a possessive. Turkish case markers may be dropped, and the marker
  test counted a marker word anywhere in the value: `in` (also the operator), `a` (also the article),
  `nin` (also the possessive). The marker must now be the last token of its group.
- **`@lokascript/semantic`: a number with a CSS unit is one value.** Upstream reads `100px`,
  `1.5rem` and `50%` as one string. Every tokenizer split them, so `set my *width to 100px` and
  `transition height to 100px` were refused in all 24 languages. A `%` that an operand touches
  (`5%2`) or that is spaced still reads as the operator.
- **`@lokascript/semantic`: more English forms that were refused in every language now read.**
  `set innerHTML of #d1 to …` and `increment innerHTML of #d1`; a single-quoted string that holds a
  `"` (`set #t to '<div _="…">'`), which was written back in double quotes and so closed early;
  `fetch … don't throw`; `put … at the start of` / `at the end of`, where the `end` closed the
  handler; `remove 3 from :arr` and `remove {color} from me`; `otherwise` as `else`. In a translation
  of an empty then-branch's `otherwise`, 13 languages wrote their own word for it inside the
  condition and read it back there, silently.
- **`@lokascript/semantic`: a handler's `catch` and `finally` bodies are written in upstream's
  spelling.** `catch e prepend …` kept core's `prepend`, which the engine rejects.

## [4.2.0] - 2026-10-07

A translation that would lose part of a script is now refused instead of returned short.
`@lokascript/semantic`'s `translate()` throws a `LossyTranslationError` unless the caller passes
`{ lossy: 'allow' }`, and the adapter, the Vite plugin's bundle and `@hyperscript-tools/i18n` keep
the author's text and warn. Upstream forms that translations used to drop now read whole in every
language: scripts of several features, `catch` / `finally`, conditionals and loops, `bind … and`,
scoped names such as `element x`, what `on` reads after its event, and clauses a command's
pattern does not model. On the new command-shape gate, round trips that came back silently
different fell from 7,614 at its first run to 174 (none in English); 23,763 of 27,240 now read as
their source does, and 3,303 are refused.

### Added

- **`@lokascript/semantic` keeps a clause its pattern does not model, as written.** A command's
  pattern read the start of the command and dropped the rest:
  `add .foo to .bar when it matches .doh`, `toggle between .a and .b`,
  `take .foo from .div for #d3`, `render #tmpl into #target`, `log me, my`. The rest is now
  kept on the node as `verbatimClause` and written back after the command in every language, in
  SOV and VSO word order too (ja `クリック を で .bar に .rey を 追加 when it matches .doh` reads
  back as `on click add .rey to .bar when it matches .doh`). So a foreign render can now hold a
  clause in English. A run that holds a command verb, a structure word (`else`, `catch`, `on`, …)
  or a word of the source language (es `cuando`) is not a clause, and its translation is
  refused. The parser records a `verbatim-clause` warning for each kept clause, since no role
  reads it: `@lokascript/compilation-service` reports it as `UNCONSUMED_INPUT` with its repair
  hint, and MCP `validate_hyperscript` lists it with the unconsumed tokens. A pattern group that
  reads its marker and binds no role now gives the marker back, so
  `take .foo from .div for #d3` keeps its `for` and `transition *width from 0px to 100px` its
  `from`.
- **`@lokascript/semantic` keeps what upstream's `on` reads between the event and the body.**
  `on click elsewhere`, a count (`on click 1`, `on click 1 to 2`), `on mutation of attributes`,
  `on click in #d1`, `on foo queue first` and `on x having threshold 0.1` lost everything after
  the event, so the handler ran on every event, or with a count, on the wrong ones. The run is now
  kept as `EventHandlerSemanticNode.headClause`, written after the whole head in every language
  (ja `クリック を で elsewhere .clicked を 追加`) and reported with the same `verbatim-clause`
  warning. Outside English a count is read only in the `1 to 2` form, since a body there can open
  with a number: a bare count in another language (`on click 1`) is refused.
- **`@lokascript/semantic` reads `catch` and `finally` in handlers and functions.** In a `def`, the
  clauses ran as more of the function's body, so its error handling ran every time, in silence. In
  a handler, `catch e …` was left unread. `EventHandlerSemanticNode` and `DefSemanticNode` now
  carry `catchName`, `catchBody` and `finallyBody`. A `def` writes its clauses before its `end`,
  and a handler writes them after its commands. No language has its own words for them yet, so
  every language writes English's `catch` and `finally`. `wait a tick` now reads as `wait 0ms`, as
  the engine runs it; every render wrote `wait tick`, a wait on a variable named `tick`.
- **`@hyperfixi/testing-framework`: the command-shape gate.** It takes the 1,135 scripts in
  upstream _hyperscript's own test suite (0.9.93) and in core's reference and hover examples that
  the engine reads, translates each into the other 23 languages and back (and English to English),
  and has the engine parse the result and the source. A pair passes when the two parses match,
  after a short list of named equivalences that are each checked on both engines. Otherwise it is
  refused (`translate` threw) or silent. The baseline lists the refused and silent pairs and only
  shrinks: the gate fails on a pair worse than listed and on one better. Every silent pair left
  belongs to a named family with a reason (`SILENT_FAMILIES`), and none is in English.
- **`@hyperfixi/engine`'s parse keeps two values it held only in a closure.** `GoNode.url` holds
  the address of `go to url <address>`, and `SymbolNode.on` the element of `^name on <element>`.
  Two scripts that differed only there parsed to the same tree. Nothing reads them at run time.

### Changed

- **`@lokascript/semantic`'s `translate()` refuses a translation that would lose part of the
  script.** This is a change in behavior. It used to return what it could render:
  `log it?.dataset?.customValue` came back in Spanish as `registrar ello`, and Hindi wrote
  `put it.name into #r` in a form that reads back as `on its.name put #r into me`. It now throws a
  `LossyTranslationError` carrying `partial` (what it would have returned, not the whole script),
  `loss.kind` and `loss.lost` (what it drops). It refuses when the parse leaves input unread
  (`truncation`); when the output does not read back with the input's commands, roles and `put`
  positions (`read-back`), as when a foreign `wait for <event>` reads back as a time wait; and when
  a string, number, selector, attribute, style or `$` / `:` / `^` name of the input is missing from
  the output (`invariant`). For example,
  `translate('on click ask "Name?" then put it into me', 'en', 'es')` throws with `loss.lost`
  `['ask "Name?"']`, since `ask` has no schema yet. Pass `{ lossy: 'allow' }` as the fourth
  argument to get the partial output instead. The root and
  `@lokascript/semantic/core` export `LossyTranslationError`, `findTranslationLoss` (the same
  checks on a parse and its render) and the types `TranslateOptions`, `TranslationLoss` and
  `TranslationLossKind`. Comments (`--`, `//`) and Bengali's polite verb forms (`টগল করুন`) are now
  read whole, so a correct translation that holds them is not refused.
  `@hyperfixi/core/multilingual`'s `translate` takes the same options and rethrows the refusal. It
  used to return the input unchanged on any error; input that does not parse still comes back
  unchanged.
- **`@lokascript/hyperscript-adapter`, `@hyperfixi/vite-plugin`'s bundle and
  `@hyperscript-tools/i18n` keep the author's text when a translation would lose part of it.**
  This is a change in behavior. The adapter's full, slim and lite plugins ran the partial English:
  `al clic alternar .foo cuando .bar` ran as `on click toggle .foo`. They now leave the script as
  written, so the host reports a parse error naming code the author wrote, and warn once per
  language with what would be dropped (`cuando .bar`). `preprocess()`'s config takes `onLossy`,
  which is called with the refusal. The Vite plugin's source transform does the same, and its
  `translateHyperscript` rethrows the refusal, where it returned the code unchanged on any error.
  `@hyperscript-tools/i18n`'s lenient mode kept the source text in silence. Now `translateHtml`
  reports a refusal through `onRefused` (`'warn'`, the default, `'error'`, or a callback), the
  Eleventy filters take `'warn'` or `'error'`, and the CLI names the file.
- **`@hyperfixi/mcp-server`'s translate tools report a refusal.** `translate_code` returns
  `ok: false` with a `LOSSY_TRANSLATION` diagnostic and `loss.lost`, and the partial text under
  `partial`, never `code`. `translate_hyperscript` and `translate_to_english` return
  `refused: true` with `lost` and `partial`. `translate_hyperscript` used to report every error as
  a missing package.

### Fixed

- **`@lokascript/semantic`: a script of several features reads as one program.** Upstream reads
  each top-level feature on its own. Semantic kept only the first and dropped the rest, or chained
  them with `then`, which neither engine reads: `def a … end def b … end` became one function,
  `def … end on click …` lost its handler, and `bind … end live …` and `set :x to 1 on click …`
  came out joined by `then`. A handler, a `def`, a `behavior`, a feature block, or a top-level
  `bind`, `set`, `install` or `js` now starts a new part of the program, and a top-level `init`
  parses, as a feature block (`FeatureAction` gains `'init'`). English writes one feature per
  line and closes each handler with `end`. It writes a `bind`, `set` or `install` with the `end`
  upstream allows when the next feature has no head word to split at, and joins consecutive
  `install` and `bind` features with a space, never `then`, which the engine rejects.
- **`@lokascript/semantic`: a dotted name is one name, and a behavior's `end`s are optional.**
  A dotted name is one name: `def utils.foo()` defined `utils` and left `.foo ( )` unread, and
  `behavior App.Widgets.Clickable` did not parse as a behavior. A behavior's last handler needs no
  `end`, nor does the behavior at the end of input: `behavior B(x) on click set @out to x` read as
  a `behavior` command chained to a `set`. A trailing `init` block in such a behavior is its init.
  A behavior member that is neither a handler nor `init`
  (`behavior MarkIt set @data-marked to 'yes' end`) came out as `behavior MarkIt then set …`,
  which the engine rejects; semantic does not model such members yet, so the translation is now
  refused. So is `behavior A … behavior B …` with no `end` between them: upstream reads B as part
  of A, and semantic read it as a `behavior` command in A's last handler.
- **`@lokascript/semantic`: `bind … and` / `with` and `install`'s arguments read.** Upstream reads
  `bind <left> and|with|to <right>` as the same binding. Only `to` had a pattern, and its left
  side took only a variable, so twelve of upstream's test scripts did not parse, among them
  `bind .dark and $darkMode` and `bind my value and #slider's value`. The left side now takes
  selectors and property paths too. `install Toggleable(cls: 'highlighted')`, the documented
  behaviors usage, lost its arguments: an install's parentheses are arguments, not a signature.
- **`@lokascript/semantic`: conditionals and loops read whole.** An English pattern read every
  top-level `if X …` as a handler for an event named `X`, so `if x log 1 else log 2 end` became
  `on x log 1 then log 2`. Seven languages read their own `if` the same way (es and fr `si`, pt
  `se`, zh `如果`, sw `kama` / `ikiwa`, id `jika` / `kalau` / `bila`, de `falls`), so every
  conditional rendered in them read back as a handler. A bare `if … end` is now a conditional; de
  `wenn` and `sobald` and id `apabila` still head a handler. An `if` on the line after `else`
  opens its own block, as upstream reads it. Semantic chained the two, so the commands after the
  inner `end` ran whether or not the condition held. Tokens that open a line now carry
  `metadata.lineStart`, and English writes such an `if` on its own line. The `end` of
  `at end of` no longer closes a conditional: in
  `if x put 'a' at end of me end put 'b' at end of me`, the second `put` ran inside the branch. An
  empty block (`if x then end`) stays a conditional, and a condition ends at `else`. `break` and
  `continue` read. A loop whose test follows its body (`repeat … until x end`,
  `repeat … while x end`) is read as one (`LoopSemanticNode.bottomTested`) and written
  `repeat forever … until x end`, which the engine reads as the same loop; before, `repeat set x`
  read as `repeat x times`. `repeat in X` keeps its collection, and `indexed by i` reads as
  `index i`.
- **`@lokascript/semantic`: a name with its scope is one value, in every language.** Upstream reads
  `global x`, `element x`, `element's x` (and `the element's x`), `local x` and `dom x` as one
  variable, its idiom for a behavior's state; seven of `@hyperfixi/behaviors`' sources use it.
  Semantic read the scope word alone, so the command around it was dropped, in English and in
  every language: `set element x to 10`, `set global x to 10`, `init set dom count to 42`. The
  tokenizers now read the scope word and the name as one token, and every language writes it as
  written, as it writes `$` and `:` names (es `establecer element x a 10`). A scope word alone
  (`set element to 5`) is still a word.
- **`@lokascript/semantic`: English writes upstream's postfix `unless` and drops `open`'s mode.**
  `toggle .foo unless I match .bar` was written `toggle .foo then unless I match .bar`, and core's
  prefix `unless C X` as it is; upstream rejects both. English now writes the guard after its
  command, and other languages keep their own form. Upstream's `open` is modal, and the engine
  reads `open #d as non-modal` as an expression, `(#d as non) - modal`. English now writes it
  `call #d.show()`, and `open #d as modal` as `open #d`. The reader still accepts core's mode.
- **`@lokascript/semantic`: a value keeps its spelling.** A call's arguments keep their spacing:
  `call navigator.clipboard.writeText(#input's value)` became `…(#input'svalue)`. A style block
  kept a space between every token, so `font-family` became `font - family`, a subtraction.
  `show`'s strategy argument is read raw, as upstream reads it: `display:inline-block` became
  `display:inline - block`. A swap's strategy slot takes only core's strategy words (`into`,
  `over`, `innerHTML`, …, `morph`), so `swap arr[0] with arr[2]` exchanges two values, as
  upstream reads it; it was written `swap arr of [0] …`. An attribute with its value and a name
  with its index are one value when nothing spaces them: `add @data-foo=baz` and
  `remove :arr[1]` kept only their first part, and `increment arr[1]` read as
  `increment arr by [1]`. Every language writes them as written. The words inside an index are
  the script's: bn wrote the variable `index` in `var[(index-1)..(index+1)]` as `সূচক`.
- **`@lokascript/semantic`: events, waits and amounts keep what was written.** A quoted event name
  stays quoted (`LiteralValue.quoted`): `trigger "my event"` now round-trips in all 23 languages,
  and `send "hello" to ChatSocket` keeps its quotes. A spaced time unit is read with its number:
  `wait 2 seconds` translated as `wait 2`, which is two milliseconds. A written `by 1` stays and
  an implicit one is never shown: German wrote `um 1` for every increment, and English dropped
  every written `by 1`. `measure` reads its element: `measure #other` became `measure`.
- **`@hyperfixi/core`'s reference and hover docs teach what the 4.x engine does.** `open`'s
  `as modal` / `as non-modal` mode does nothing on the engine, so the docs drop it and give
  `call #myDialog.show()` for a non-modal dialog. The `swap` example
  `swap innerHTML of #target with result` was core's `put`, but upstream and the engine exchange
  the two values: it is now `swap #a's value with #b's value`, and the hover text reads "Exchanges
  two elements, or two writable values." The `fetch` example is now a template literal,
  ``fetch `/api/${id}` as json``, since upstream sends a naked URL's `${id}` as written.
  Translation keeps core's meaning for both old forms: English writes `put result into #target`
  and a template literal. The Japanese example in `docs/EXAMPLES.md` is written as semantic writes
  it, `クリック で 自分 に .active を 切り替え`; the old one left `を 私` unread.

## [4.1.0] - 2026-10-06

Translations keep what the source says. `tell` blocks, swaps, view transitions, chains of
handlers without their `end`s, events with names of several words, and variables named like
events or keywords now survive `translate`, MCP `translate_code` and the adapter in every
language. The adapter's per-language bundles render English with semantic's renderer, and
`@lokascript/semantic/core` gains `registerHandcrafted`.

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
  `@lokascript/semantic/core`'s new `registerHandcrafted`), and bundlers drop the rest:
  semantic's single-language bundles are 14–15 KB gzipped smaller (`browser-de` 116 KB instead
  of 130), and a Vite or Rollup build that imports `@lokascript/semantic/core` and one
  `languages/<lang>` gets the same saving. The patterns each language builds are unchanged
  (hashed for all 24 before and after, from source and from the split `dist/`). The adapter's
  bundles, which also changed renderer in this release, are measured in its entry under Fixed.

### Fixed

- **`@lokascript/semantic`: a variable named like an event or a keyword keeps its name.** Upstream
  and the engine run `set input to "a"` on a variable named `input`, but semantic's English parse
  dropped the whole command (an event name alone took the value as the text "input", which a
  `set` cannot write), so `translate`, MCP `translate_code` and the adapter lost it in every
  language; `put "a" into input` was lost in ar, de, fr, id and zh, whose tokenizers read `input`
  as the event, and `toggle .a on input` in six. An event name alone where a value stands is now
  the variable it spells, as a structure word or a verb already was, except where an event stands
  (`send`, `trigger`, `repeat until event`, `wait`). And the renderer no longer writes a variable
  in the language's own word where that word reads back as another variable: `set when to 1`
  wrote es `establecer cuando a 1`, read back as a variable named `cuando`, in all 23 languages,
  and bn, ms, th and tl wrote `increment i by index` with their word for `index`. A variable keeps
  its localized word only where that word alone is the same value (es `ello` for `it`), and the
  verified render spells one whose neighbours change it (vi `đặt giá trị`, `set`, for `put value`).
  The value matrix now runs ten such names (`input`, `click`, `when`, `index`, …) in every
  position: all pass on both engines. No corpus row changes.
- **`@lokascript/semantic`: the event a command names reads back in every language, and a
  `wait` keeps its source for any event.** The handler head read a native event name through the
  event table, but `send`, `trigger` and `repeat until event` read it only when the language's
  tokenizer knew the word: es `enviar dobleclic a #x` read back `send dobleclic to #x`, so the
  event fired as `dobleclic` (55 of the 170 localized names per command: es, pt, fr, de, ko and zh
  coinages, and id and sw `unload`). They now read it as its English name, as the head does. A `wait` kept the source of an
  event only from a fixed list, in English first: `wait for myEvent from #b`,
  `wait for unload from #b` and `wait for focusin from window` lost the source in every language, and
  `wait for click or myEvent from #b` everything after `click`. Upstream reads every leg of
  `wait for` that is not a number as an event, so English now does, and a name followed by a
  source is an event in every language (a time wait has none); tr and tl no longer read `focusin`
  as `focus`. bn writes the event `send` sends with `কে`, as `trigger`'s, since
  `#x তে স্ক্রোল তে পাঠান` read as `scroll to #x`; the old `তে` still reads. And fr's `change`
  event, `changement`, no longer reads as the reactive `when … changes` word, which turned
  `repeat until event change` into a `when` feature. Four corpus rows change, the bn renders of
  `send` (`কে` for `তে`).
- **`@lokascript/semantic`: a hand-written event name of several words is read whole.** The event
  table reads 20 names of several words that the renderer never writes (ar `تمرير الماوس`, de
  `taste runter`, id `lepas tombol`, pt `pressionar tecla`, qu `mana q'away`, sw `bonyeza chini`,
  tr `fare_bas`, zh `鼠标进入`, and twelve more), but their tokenizers split them, and the reader took
  the first word for the event: de `wenn taste runter protokollieren 1` read `on taste log 1`, id
  `ketika lepas tombol …` `on lepas`, sw `unapo bonyeza chini …` `on click`, qu
  `maykama mana q'away …` `on false`, and ar `على تمرير الماوس من #b …` `on scroll`. A `wait for`,
  `send`, `trigger` or `repeat until event` lost the event the same way. The tokenizers now read
  each name whole; tr reads an `_`-joined word as one token when it is a keyword, as sw already did
  (its own `tuş_bas` had never been read), and splits any other at `_` as before. No corpus row
  changes.
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
  what the full `hyperscript-i18n.global.js` gives. English's own module builds through
  `@lokascript/semantic/core` (its pattern generator and repeat heads,
  `getRepeatPatternsForLanguage` now exported there), so a bundle holds one copy. Against 4.0.1,
  the single-language bundles are the same size (`-de` 116 KB gzipped) and `-en` is 109 KB
  instead of 148; the regional bundles are 8–16 KB larger (`western` 141 KB instead of 125).

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

[Unreleased]: https://github.com/codetalcott/hyperfixi/compare/v7.2.0...HEAD
[7.2.0]: https://github.com/codetalcott/hyperfixi/compare/v7.1.0...v7.2.0
[7.1.0]: https://github.com/codetalcott/hyperfixi/compare/v7.0.0...v7.1.0
[7.0.0]: https://github.com/codetalcott/hyperfixi/compare/v6.3.0...v7.0.0
[6.3.0]: https://github.com/codetalcott/hyperfixi/compare/v6.2.0...v6.3.0
[6.2.0]: https://github.com/codetalcott/hyperfixi/compare/v6.1.0...v6.2.0
[6.1.0]: https://github.com/codetalcott/hyperfixi/compare/v6.0.0...v6.1.0
[6.0.0]: https://github.com/codetalcott/hyperfixi/compare/v5.1.0...v6.0.0
[5.1.0]: https://github.com/codetalcott/hyperfixi/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/codetalcott/hyperfixi/compare/v4.8.0...v5.0.0
[4.8.0]: https://github.com/codetalcott/hyperfixi/compare/v4.7.0...v4.8.0
[4.7.0]: https://github.com/codetalcott/hyperfixi/compare/v4.6.0...v4.7.0
[4.6.0]: https://github.com/codetalcott/hyperfixi/compare/v4.5.0...v4.6.0
[4.5.0]: https://github.com/codetalcott/hyperfixi/compare/v4.4.0...v4.5.0
[4.4.0]: https://github.com/codetalcott/hyperfixi/compare/v4.3.0...v4.4.0
[4.3.0]: https://github.com/codetalcott/hyperfixi/compare/v4.2.0...v4.3.0
[4.2.0]: https://github.com/codetalcott/hyperfixi/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/codetalcott/hyperfixi/compare/v4.0.1...v4.1.0
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
