# CLAUDE.md — htmx-adapter

## What This Package Does

Multilingual adapter for **upstream htmx v4** (not hyperfixi's embedded
htmx-compat layer). Localized `hx-*`/`sse-*`/`ws-*` attribute names are
canonicalized onto the element before stock htmx processes it, via an initial
document sweep plus a registered htmx v4 extension
(`htmx_before_process_node`). Vocab data is the same generated
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
├── registry.test.ts
├── lang-resolver.test.ts
└── browser/               # Playwright e2e against REAL vendored libraries
    ├── adapter.spec.ts    # v4 request/swap/order/re-process, executor mode w/ real _hyperscript, v2 fallback
    ├── fixtures/*.html
    └── vendor/            # htmx 4.0.0-beta5, htmx 2.0.10, _hyperscript 0.9.93 + ground-truth README
docs/
└── UPSTREAM_HOOK_PROPOSAL.md  # Mechanism (c): the attribute-name resolver seam for htmx core
```

## Commands

```bash
npm run typecheck          # TypeScript validation
npm run test:run           # Vitest (60 tests, jsdom environment)
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
  hx-on attr (listener install; claims deduped per element by resolved
  event name), suppresses canonical-sibling creation for localized names,
  and REMOVES canonical-named `hx-on:*` attrs so htmx never JS-evals a
  hyperscript body. Bodies translate lazily (first fire, memoized) via
  `setBodyTranslator()` (auto-detected from `HyperscriptI18n.preprocess`).
- **Two authored-attribute mutations, both documented**: `hx-trigger`
  in-place value translation (localized event values in a canonical attr
  have no separate canonical target; idempotent by construction), and
  executor-mode removal of canonical-named `hx-on:*` (double-execution
  guard).
- **Zero workspace deps** — builds standalone anywhere in CI's build order.

## Load order (matters)

Adapter → vocab module(s) → htmx. The adapter's DOMContentLoaded sweep must
register before htmx's own scan listener; late vocab registrations trigger a
re-sweep, and htmx-swapped content is covered by the extension hook regardless
of order.
