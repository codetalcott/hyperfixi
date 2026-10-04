# CLAUDE.md — htmx-adapter

## What This Package Does

Multilingual adapter for **upstream htmx v4** (the replacement for core 3.x's
embedded htmx-compat layer, retired in Phase C3). Localized `hx-*`/`sse-*`/`ws-*` attribute names are
canonicalized onto the element before stock htmx processes it, via an initial
document sweep plus a registered htmx v4 extension
(`htmx_before_process`; the executor-mode guard is the cancelable
`htmx_before_on_init`). Vocab data is the generated `vocab/{lang}.js` modules
in this package (moved from `@hyperfixi/core` in Phase C3, when core's embedded
layer retired with `hyperfixi-hx.js`).

## Structure

```
src/
├── index.ts          # Library entry — re-exports the public API
├── browser.ts        # IIFE entry — installs window.__hyperfixi_i18n, auto-registers, sweeps
├── registry.ts       # Vocab store; the payload shape of core's (retired) i18n-orchestrator
├── canonicalize.ts   # localized → canonical attribute copy + hx-trigger value translation
├── hx-on.ts          # executor mode: hyperscript hx-on: bodies (claim/translate/execute hooks)
├── extension.ts      # htmx v4 extension (+ v2 fallback) + installAutoSweep
└── lang-resolver.ts  # langOf()/normLang() — mirrors loka-js's lang-resolver
scripts/
├── gen-htmx-vocab.mjs      # the generator (semantic profiles + i18n dictionaries + the table)
├── htmx-attr-vocab.mjs     # hand-authored names: htmx-only attributes, trigger heads
└── htmx-vocab-legacy.json  # retired names kept as aliases (names are additive)
vocab/                      # GENERATED, committed and published: one self-registering script per language
test/
├── canonicalize.test.ts   # Core semantics: add-canonical, keep-authored, idempotency, mixed-lang
├── hx-on.test.ts          # Executor mode: claim/suppress/removal, lazy translation, dedup, auto-detect
├── extension.test.ts      # v4/v2 registration + hooks + auto-sweep lifecycle
├── vocab-modules.test.ts  # loads every generated vocab module against this registry
├── vocab-generator.test.ts # what the generator emits, by source text + the DRIFT gate (--check)
├── vendor-mirror.test.ts  # DRIFT GUARD: TOP_LEVEL_COMMA_RE.source === the vendored htmx HCON.split literal
├── registry.test.ts
├── lang-resolver.test.ts
└── browser/               # Playwright e2e against REAL vendored libraries
    ├── adapter.spec.ts    # v4 request/swap/order/re-process, executor mode w/ real _hyperscript (4 load orders,
    │                      #   allowlist rejection, mixed node; console + htmx:error collectors), v2 fallback
    ├── contact-app.spec.ts # ja/es/pt/ko Contact.app attrs on stock htmx 4: delete+confirm+push-url, include,
    │                      #   indicator, post, boost:inherited — asserts htmx BEHAVIOR, not sibling attrs
    ├── fixtures/*.html
    └── vendor/            # htmx 4.0.0, htmx 2.0.10, _hyperscript 0.9.93 + ground-truth README
docs/
└── UPSTREAM_HOOK_PROPOSAL.md  # Mechanism (c): the attribute-name resolver seam for htmx core
```

## Commands

```bash
npm run typecheck          # TypeScript validation
npm run test:run           # Vitest (jsdom environment)
npm run test:browser       # Playwright e2e vs real htmx v4/v2 + _hyperscript (build dist first)
npm run build              # ESM + CJS + browser IIFE (~2 KB gz)
npm run generate:vocab     # regenerate vocab/{lang}.js (semantic + i18n built first)
npm run check:vocab        # exit 1 if a committed module is stale
```

## Key Design Decisions

- **Canonicalization, not a fork**: htmx v4 exposes no attribute-name resolver
  hook, so we copy localized attrs to canonical names in
  `htmx_before_process_node` + an initial sweep. The authored attribute is
  never removed. If the upstream hook proposal lands
  (docs/UPSTREAM_HOOK_PROPOSAL.md), only `extension.ts` changes — registry,
  canonicalizer table, and lang resolution are mechanism-agnostic.
- **No KEYS copy**: the vocab attrs maps are fully-qualified on both sides
  (`'hx-obtener': 'hx-get'`), so the adapter is data-driven; the canonical key
  set lives only in the generator (`scripts/gen-htmx-vocab.mjs`). The
  vocab-generator test is the drift guard.
- **Same `window.__hyperfixi_i18n` public API as core** so the generated vocab
  modules work verbatim; if a registry already exists on the page (core 3.x's
  `hyperfixi-hx.js`), the browser entry fans registrations out to both.
- **`hx-on:` bodies are JS by default (upstream semantics), hyperscript by
  opt-in**: `setBodyExecutor()` (auto-detected from `window._hyperscript`)
  flips the hx-on family into executor mode — the adapter claims every
  hx-on attr (a claim RECORDS {attrName, body} per element, keyed by
  resolved event name; the listener reads the record so a re-claim after
  `htmx.process(elt, true)` runs an edited body), suppresses
  canonical-sibling creation for localized names, and keeps htmx from
  JS-evaling canonical-named `hx-on:*` bodies. HOW is decided by the
  runtime that owns the node, never from the API's shape:
  - v4, registration ACCEPTED (`registerWith` checks `registerExtension`'s
    `false` return — allowlist rejection / duplicate): claim-time removal
    is turned OFF and the extension's `htmx_before_on_init` decides per
    node from the claim record — cancel when every htmx-bindable hx-on
    attr is claimed (attrs stay), otherwise remove the claimed canonical
    attrs and let htmx bind the rest. "htmx-bindable" is computed from
    `htmx.config.prefix` / `metaCharacter` the way core's
    `#prefixes("hx-on")` + `#handleHxOnAttributes` do.
  - v2 (2.0.10 binds hx-on BEFORE firing `beforeProcessNode` — measured),
    a rejected v4 registration, or no htmx: `neutralizeOnClaim` stays ON
    (default) and the canonical attr is removed at claim time.
  - An adapter-created canonical sibling (no-executor sweep copied
    `hx-en:clic` → `hx-on:click`, executor arrived later) is removed on
    re-claim in every mode — it was never authored.
  - Bodies translate lazily (first fire, memoized) via `setBodyTranslator()`
    (auto-detected from `HyperscriptI18n.preprocess`).
- **Load-order safety**: `installAutoSweep` sweeps only once
  DOMContentLoaded has FIRED (or readyState is `complete`; a `load`
  listener covers the gap) — `readyState !== 'loading'` is already true
  DURING DOMContentLoaded dispatch and for `defer`/module scripts. The
  browser entry adds the registration retry listener BEFORE the executor
  re-detect. Pinned by three e2e fixtures (late `_hyperscript`, all
  `defer`, allowlist rejection).
- **Authored-attribute mutations, all documented**: `hx-trigger` in-place
  value translation (localized event values in a canonical attr have no
  separate canonical target; idempotent by construction — covers the
  `hx-trigger:inherited`/`:append` modifier forms too), plus the
  executor-mode removal cases above.
- **Trigger-spec grammar is htmx's own**: on 4.0.0 `init(internalAPI)`
  adopts `internalAPI.HCON.split`; otherwise `translateTriggerValue`
  splits with a byte-mirror of that regex (commas inside `[filters]`,
  `(calls)`, and quoted strings are not separators), pinned against the
  vendored build by `test/vendor-mirror.test.ts`. Split/join is
  byte-preserving, so an all-canonical value comes back verbatim. Vocab
  lookups are own-key only (`constructor` is not an event). Non-`hx-on`
  colon suffixes (`:inherited`/`:append`) pass through as modifiers —
  never through the events map.
- **Keys read off an attribute NAME fold like HTML does** (`lookupByAttrName`
  in registry.ts): the parser ASCII-lowercases names, so pt's
  `hx-em:teclaBaixo` arrives as `hx-em:teclabaixo`. Exact own key first,
  then the ASCII-folded key — never a full `toLowerCase()` (`É` survives the
  parser). Used for localized attr names, colon-family bases and `hx-on:`
  event suffixes; trigger VALUES stay exact (event names are case-sensitive).
  pt's 15 camelCase events came out `hx-on:teclabaixo` until this;
  `vocab-modules.test.ts` now drives every event of every language through an
  `hx-on` name parsed from markup, and the generator refuses two names of one
  language that fold together. Core's embedded layer did the same through
  `eventNameOf(…, { fromAttrName: true })` until it retired.
- **`init(internalAPI)` takes ONE thing**: `HCON.split`. The rest of
  4.0.0's 14-member surface was evaluated and passed over — see the
  rationale on `createExtension` in extension.ts (notably `htmxProp`'s
  private `onInitialized` flag vs. the typed cancelable event).
- **Zero workspace deps** — builds standalone anywhere in CI's build order.
  The generator reads the built semantic and i18n `dist/` by path, so only
  `generate:vocab`, `check:vocab` and the drift test need those two built.

## Load order (matters)

Adapter → vocab module(s) → htmx. The adapter's DOMContentLoaded sweep must
register before htmx's own scan listener; late vocab registrations trigger a
re-sweep, and htmx-swapped content is covered by the extension hook regardless
of order.

## The vocab (`vocab/`, `scripts/`)

To regenerate the modules from the semantic profiles + i18n dictionaries
(the generator reads both packages' built `dist/` by path):

```bash
npm run build --prefix packages/semantic && npm run build --prefix packages/i18n
npm run generate:vocab                     # emits vocab/{lang}.js
npm run sync-htmx-vocab --prefix packages/vite-plugin   # the scanner's copy
```

Attribute names resolve from two sources, in order: the hand-authored table
`scripts/htmx-attr-vocab.mjs`, then the semantic profile. The table exists
because most htmx attributes are not hyperscript keywords, and their natural
words are often already a command's (ja `削除` / es `eliminar` are `remove`) —
**do not add htmx-only names to a semantic profile.** It also _leads_ the
profile where the profile's word suits a command but not an attribute name
(ja `引き金` → `トリガー`, es `disparar` → `disparador`, following loka-js's
terminology reviews). All 23 non-English languages are authored for the 12
attributes the _Hypermedia Systems_ Contact.app uses plus the four more the
book's code listings use (`hx-vals`, `hx-select`, `hx-swap-oob`, `hx-sync`),
and for the `search` trigger head; only ja, es, pt, ko, tr, de, fr and zh
were authored with any care — the other 15 (2026-09-22) are unreviewed
drafts meant as hooks for readers, every one flagged `lowConfidence`. tl
leaves `hx-target` as the English identity on purpose (so does loka-js). (de also authors a lowercase `target`:
the profile's `Ziel` shipped as `hx-Ziel`, which no parsed attribute can match
because HTML lowercases attribute names.) `hx-indicator` / `hx-include` / `hx-select` /
`hx-swap-oob` / `hx-sync` are generator-only keys (`ADAPTER_ONLY_KEYS`): stock
htmx implements them under this adapter; core's embedded layer never did,
which is how they came to sit apart from `KEYS`. **An adapter-only key resolves
from the table alone, never the profile** — 22 profiles carry a `select`
keyword meaning mark/highlight text (de `markieren`), which would otherwise
have shipped as `hx-select`, permanently. `hx-ext` has no name on purpose:
htmx 4 removed it.

The table also has an `events` block for trigger heads no i18n dictionary
names (`search`, the DOM event the book's search box fires). A dictionary
event must also exist in the semantic profile's lexicon
(`lexicon-parity.test.ts`), so an htmx-only head lives in the table. htmx's
own trigger words (`revealed`, `every`, `intersect`) are trigger syntax, like
`delay:`, and stay English.

**Names are additive — never delete a shipped name, demote it.** Several
localized names may map to one canonical; the first is the primary (the form
to teach) and the rest are parse aliases; this adapter canonicalizes every
one of them. A name retired by
a profile/dictionary change goes in `scripts/htmx-vocab-legacy.json`, which the
generator appends after the current names.

`npm run check:vocab` (also the drift test in `test/vocab-generator.test.ts`)
fails when the committed modules differ from what the generator emits — so
editing a profile keyword or a dictionary event word that feeds the vocab
reddens this package's suite until you regenerate. **Read that diff**: a disappearing name breaks pages
authored with it. The gate exists because the modules once sat months behind
their inputs and a plain regeneration would have deleted 165 shipped event
names.

Two generator rules for multi-word words: an **event** name is skipped and
reported (it is one `\S+` token of an `hx-trigger` value or an `hx-on:` suffix
in both consumers, and a joined form would be an unreviewed coinage); an
**attribute** name is hyphen-joined (vi `lấy giá trị` → `hx-lấy-giá-trị`, the
convention the vi profile already uses for `trực-tiếp`).
