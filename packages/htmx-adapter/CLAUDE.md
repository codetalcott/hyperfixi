# CLAUDE.md — htmx-adapter

## What This Package Does

Multilingual adapter for **upstream htmx v4** (not hyperfixi's embedded
htmx-compat layer). Localized `hx-*`/`sse-*`/`ws-*` attribute names are
canonicalized onto the element before stock htmx processes it, via an initial
document sweep plus a registered htmx v4 extension
(`htmx_before_process`; the executor-mode guard is the cancelable
`htmx_before_on_init`). Vocab data is the same generated
`packages/core/vocab/htmx/{lang}.js` modules the embedded layer consumes.

## Structure

```
src/
├── index.ts          # Library entry — re-exports the public API
├── browser.ts        # IIFE entry — installs window.__hyperfixi_i18n, auto-registers, sweeps
├── registry.ts       # Vocab store; same payload shape as core's i18n-orchestrator
├── canonicalize.ts   # localized → canonical attribute copy + hx-trigger value translation
├── hx-on.ts          # executor mode: hyperscript hx-on: bodies (claim/translate/execute hooks)
├── extension.ts      # htmx v4 extension (+ v2 fallback) + installAutoSweep
└── lang-resolver.ts  # langOf()/normLang() — byte-mirror of core's htmx/lang-resolver.ts
test/
├── canonicalize.test.ts   # Core semantics: add-canonical, keep-authored, idempotency, mixed-lang
├── hx-on.test.ts          # Executor mode: claim/suppress/removal, lazy translation, dedup, auto-detect
├── extension.test.ts      # v4/v2 registration + hooks + auto-sweep lifecycle
├── vocab-modules.test.ts  # REUSE GUARD: loads every real core vocab module against this registry
├── vendor-mirror.test.ts  # DRIFT GUARD: TOP_LEVEL_COMMA_RE.source === the vendored htmx HCON.split literal
├── registry.test.ts
├── lang-resolver.test.ts
└── browser/               # Playwright e2e against REAL vendored libraries
    ├── adapter.spec.ts    # v4 request/swap/order/re-process, executor mode w/ real _hyperscript (4 load orders,
    │                      #   allowlist rejection, mixed node; console + htmx:error collectors), v2 fallback
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
  set lives only in core's generator (`gen-htmx-vocab.mjs`). The
  vocab-modules test is the drift guard.
- **Same `window.__hyperfixi_i18n` public API as core** so the generated vocab
  modules work verbatim; if core's registry already exists on the page, the
  browser entry fans registrations out to both.
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
- **`init(internalAPI)` takes ONE thing**: `HCON.split`. The rest of
  4.0.0's 14-member surface was evaluated and passed over — see the
  rationale on `createExtension` in extension.ts (notably `htmxProp`'s
  private `onInitialized` flag vs. the typed cancelable event).
- **Zero workspace deps** — builds standalone anywhere in CI's build order.

## Load order (matters)

Adapter → vocab module(s) → htmx. The adapter's DOMContentLoaded sweep must
register before htmx's own scan listener; late vocab registrations trigger a
re-sweep, and htmx-swapped content is covered by the extension hook regardless
of order.
