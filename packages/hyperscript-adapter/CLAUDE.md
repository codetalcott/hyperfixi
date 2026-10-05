# CLAUDE.md — hyperscript-adapter

## What This Package Does

Adapter plugin that enables the **original \_hyperscript** runtime to accept
hyperscript written in 24 languages. Works as a text preprocessor: an
`addBeforeProcessHook` callback rewrites non-English `_="..."` attributes (and
`<script type="text/hyperscript">` bodies) to English in place — before the
runtime's own scan reads them — using `@lokascript/semantic` for translation.

## Structure

```text
src/
├── index.ts              # Node.js entry — exports plugin, preprocess, types
├── browser.ts            # Browser IIFE entry — auto-registers with _hyperscript
├── browser-lite.ts       # Lite browser entry — expects external semantic global
├── plugin.ts             # _hyperscript.use() plugin factory + standalone preprocess()
├── slim-plugin.ts        # Slim plugin factory (imports from semantic/core)
├── preprocessor-core.ts  # Shared skeleton: strategies, prefix-stripping, fallback
├── preprocessor.ts       # Full path: parseSemantic + render('en') + translate() rescue
├── slim-preprocessor.ts  # Slim path: the full path's logic on semantic/core (+ languages/en)
├── attribute-translator.ts  # The runtime seam: addBeforeProcessHook installer
├── language-resolver.ts  # Lang cascade: data-* overrides → closest [lang] → document (matches htmx-adapter's langOf)
├── host-validate.ts      # F8 gate: rendered English checked on the host's own parse() before commit
└── bundles/
    ├── shared.ts         # Shared setup: auto-register (the pattern generator is /core's)
    ├── es.ts, ja.ts, …   # Per-language IIFE entries (24 languages)
    └── western.ts, east-asian.ts, slavic.ts, south-asian.ts, southeast-asian.ts  # Regional
scripts/
└── generate-parity-fixture.ts  # Regenerates test/fixtures/preprocessor-parity.json
test/
├── preprocessor.test.ts       # Commands × languages through the full path
├── slim-preprocessor.test.ts  # Per-language bundle path integration
├── language-resolver.test.ts  # DOM attribute resolution
├── plugin.test.ts             # Plugin registration, warn-once, serialize→reparse behavior
├── attribute-translator.test.ts  # Hook seam: WeakSet idempotency, zero DOM mutation
├── host-validate.test.ts      # Validity gate: channel folding (mock + REAL vendored engine)
├── engine-host.test.ts        # The real plugin on the real @hyperfixi/engine: runs, attribute stays as written
├── semantic-iife-lite.test.ts # Built lite adapter × every built semantic IIFE on hyperfixi-hs.js (PR7 gate)
├── adapter-iife.test.ts       # Every built self-contained adapter IIFE on hyperfixi-hs.js: handler shapes × each language
├── parity-harness.ts          # Shared parity corpus (no preprocessor imports — see file doc)
├── whole-string-first.test.ts # Repaired block-body rows, validated on the vendored engine
├── preprocessor-parity.full.test.ts  # Full path vs committed snapshot
├── preprocessor-parity.slim.test.ts  # Slim path vs committed snapshot (own module graph)
├── fixtures/preprocessor-parity.json # Snapshot: both paths' outputs + divergence set
└── browser/                   # Playwright e2e against the REAL _hyperscript runtime
    ├── adapter.spec.ts        # Localized toggles/add/put/remove across 8 languages + inheritance
    ├── adapter-test.html      # Fixture page (loads vendor runtime + dist bundle)
    └── vendor/                # _hyperscript 0.9.93 + ground-truth README
demo/
└── index.html            # Live demo with ES/JA/KO/ZH/FR examples
```

## Commands

```bash
npm run typecheck          # TypeScript validation
npm run test:run           # Vitest (366 tests, jsdom environment)
npm run test:browser       # Playwright e2e vs real vendored _hyperscript (build dist first)
npm run build              # ESM + CJS + browser IIFEs
```

The e2e suite serves the repo root on port **3010** (core's Playwright uses
3000, htmx-adapter's 3009 — all three run as sequential steps of CI's
`browser-tests` job). It needs the built `dist/hyperscript-i18n.global.js`.

## Key Design Decisions

- **Preprocessor, not AST mapping**: \_hyperscript AST nodes are closure objects tightly coupled to the parser — reproducing them from semantic data would mean reimplementing every command parser
- **One English renderer: semantic's** (since 2026-10-05). The per-language and regional bundles used their own writer, `hyperscript-renderer.ts`, to skip English's language data. It drifted far from semantic's: measured over the corpus, 1,242 of 3,772 translations rendered to valid but different English (every `if` lost its branches, `put … before` became `put … into`, `from window`/`or <event>`/`debounced` vanished, `in me` scopes widened, a `repeat for` lost its binding) and 345 to English the engine rejects, so the script kept its author's text and did not run. Owner decision: correctness over size. `slim-preprocessor.ts` registers `languages/en` and calls `render(node, 'en')` from `/core`; `languages/en` builds through `../core` (the generator, the repeat heads), so its dist file does not carry a second copy of core's schemas
- **One pattern generator: `/core`'s** (hand-crafted + generated, installed by `@lokascript/semantic/core` on import since Phase C1). Until 4.0.1 `bundles/shared.ts` replaced it with a generate-only one, which lost the hand-crafted patterns: de, fr, qu and zh could not read `on click toggle .active` in any self-contained per-language or regional bundle, and 1106 of the corpus's 3772 translations read differently from the full package (the full `hyperscript-i18n.global.js` was never affected). `adapter-iife.test.ts` runs every built bundle on the engine; the parity corpus below never reached those forms
- **Two preprocessor paths, one skeleton, one renderer**: the strategy/strip/fallback logic lives once in `preprocessor-core.ts`; `preprocessor.ts` (full, `@lokascript/semantic`) and `slim-preprocessor.ts` (`…/core` + `languages/*`) differ only in how they register languages. The parity ratchet (`test/preprocessor-parity.*.test.ts` + `fixtures/preprocessor-parity.json`, regenerated via `scripts/generate-parity-fixture.ts`) holds them equal: `KNOWN_DIVERGENCES` is empty since the slim writer retired (its last entry, the es `repeat` row whose `times` the writer dropped, left with it, and with it the safety pin that kept that output engine-invalid). Two test FILES on purpose: one file = one module graph = one registry under vitest's shared-src aliases, and the slim file must import only the chain a bundle imports (`/core` + `/languages/*`), never the full package
- **Whole-string only — the split fallback is deleted**: `trySemanticTranslation` hands the WHOLE source to the semantic parser, which handles then-sequences, newlines, loop/tell bodies and behavior blocks natively. The reorder to whole-string-first (#899) was measured over the 3105 corpus translations whose English reference the real 0.9.93 engine accepts: split-first **2849/3105** canonically valid, whole-first **3105/3105** (256 repaired — every `repeat-*`/`tell`/`behavior-*`/`bind-two-way` row, in every language — 0 broken; the 73 rows where only split-first matched the reference byte-for-byte are cosmetic, since the connector between sibling commands is OPTIONAL in canonical hyperscript — the oracle for this class is the engine, not the reference string). `test/whole-string-first.test.ts` asserts validity against the vendored 0.9.93 loaded into jsdom. The old split fallback (`splitStatements` on localized `then`/newlines, `translateCompound` rejoining with a hardcoded `then`) was then measured to produce ZERO final outputs over all 3703 patterns.db translations + the parity corpus on BOTH paths (full: 115 invocations, all null; slim: 32, all null — post-#899, an input whose pieces each parse would have parsed whole) and deleted 2026-08-07, erasing its two defect classes wholesale (string-literal-blind splitting; `then` rejoin invalid after block headers). The parity fixture regenerated byte-identical over all pre-existing rows, and new parity rows pin that literals containing then-keywords stay atomic through the whole-string arm
- **Confidence gating**: semantic analysis below threshold falls through to original text, avoiding bad translations. This also makes re-processing safe: already-translated English fed back through translation is an identity no-op
- **Host-parser validity gate** (`host-validate.ts`, default ON, `validateWithHost: false` to opt out): after a CHANGED translation, all three plugin variants ask the host's own `parse()` whether the rendered English actually parses — folding both failure channels (`parse().errors` + the tokenizer's throw) — and fall back to the author's original text on rejection, warn-once per lang. The runtime analog of the offline R4 gate; the F5 arc measured this failure class shipping (256 corpus rows of engine-rejected English until #899). Feature-detected: hosts without `parse()` skip the gate; only changed translations pay the parse
- **WeakSet idempotency, zero DOM mutation**: the attribute translator tracks processed elements in a module-level `WeakSet` instead of stamping a marker attribute — devtools/serialization show exactly what the author wrote. A serialize→reparse round-trip produces new elements that are re-processed, which the confidence gate makes harmless (tested)
- **Warn once per language**: an unchanged translation is often legitimate (canonical-English hyperscript under a non-en lang scope), so the full plugin warns once per language per page load (mirroring htmx-adapter's `warnMissingLangOnce`); `{ debug: true }` gives per-element detail. `resetTranslationWarnings()` resets the once-state (mainly for tests)
- **`fallbackToOriginal` is deprecated and inert**: it never did anything — the preprocessor's string contract always returns the original source on failure. Kept in the type for compile compatibility; ignored at runtime
- **Bundle sizes (gzipped, measured 2026-10-05 with #1379)**: per-language ~116–117 KB (4.0.1: ~115–118), regional ~127–141 KB (4.0.1: ~120–127), `-en` ~109 KB (4.0.1: 148), lite ~1.8 KB (expects an external semantic global). Each language registers only its own hand-crafted patterns (semantic's `patterns/handcrafted/<lang>.ts`); a regional bundle compresses each language's patterns separately, which is most of its growth

## Integration Point

`installAttributeTranslator` (src/attribute-translator.ts) registers an
`addBeforeProcessHook` callback — \_hyperscript.org's supported public
extension point. The hook fires on the subtree root passed to `processNode()`
before the runtime reads the configured script attributes (`_`, `script`,
`data-script` via `config.attributes`) or `<script type="text/hyperscript">`
bodies, so rewriting them in place at hook time translates before parse.

A host that offers `addSourceTransform` (`@hyperfixi/engine`;
\_hyperscript.org has no such hook) is given the translator through it instead. That host hands
each script to the translator as it reads it, so the attribute keeps the
author's text and nothing in the DOM is rewritten. Feature-detected in
`installAttributeTranslator`, so all three plugin variants get it.

Historical note: every plugin variant here used to monkey-patch
`internals.runtime.getScript`. Current \_hyperscript builds make `#getScript`
a private class field, so that assignment created a stray own-property the
runtime never read — translation silently never happened. Commit 86405944
(2026-07-28) moved to the hook; builds without `addBeforeProcessHook`
(≤ 0.9.14) get a console warning and no translation.
