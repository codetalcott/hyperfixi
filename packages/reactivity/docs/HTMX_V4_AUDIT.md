# Phase 0 Audit — htmx v4 reactive/streaming + localized attributes

Audit completed 2026-05-19 in support of [~/.claude/plans/htmx-v4-reactive-streaming.md](file://~/.claude/plans/htmx-v4-reactive-streaming.md). Each item below closes ambiguity left open by the plan and produces concrete file targets / line numbers for subsequent phases.

---

## 1. Cleanup-registry behavior under SSE/WS lifecycle

**File:** [packages/core/src/runtime/cleanup-registry.ts](../../../packages/core/src/runtime/cleanup-registry.ts)

**Findings:**

- `CleanupRegistry` class exposes `registerCustom(element, cleanupFn, description)` at line 173. This is the right API for SSE/WS connection close.
- Auto-cleanup is bootstrapped via `createAutoCleanupRegistry()` (line 378), which installs a MutationObserver on `document.body` watching `{ childList: true, subtree: true }`.
- Move-vs-delete distinction handled via `queueMicrotask` deferral (line 403): an element only triggers `cleanupElementTree` if it's still disconnected after the microtask.
- `cleanupElementTree` (line 259) walks `element.querySelectorAll('*')` and runs all registered cleanups per descendant — verified covers nested elements that own connections.
- Cleanup runs **before** GC: `cleanupElement` (line 224) iterates `entries` array which holds strong refs to the cleanup closures. Strong refs in the closure keep `EventSource`/`WebSocket` alive until `.close()` is called explicitly.

**Verdict — no blockers.** SSE/WS modules in Phase 3/4 should:

- Call `registry.registerCustom(element, () => connection.close())` at construction time
- Hold the `EventSource`/`WebSocket` instance in a closure-captured local, not in element state directly — the registry's strong reference will keep it alive until cleanup fires

**Risk noted:** `createAutoCleanupRegistry` only watches `childList`, not `attributes`. If an `sse-connect` attribute is _removed_ without removing the element, the connection won't auto-close. This is an edge case; address via processor-level attribute-change handling (Phase 3a) rather than registry changes.

---

## 2. `hx-live` attribute event surface

**File:** [packages/core/src/htmx/htmx-attribute-processor.ts](../../../packages/core/src/htmx/htmx-attribute-processor.ts)

**Findings:**

- MutationObserver in `startObserver()` at lines 664-693 watches `{ childList: true, subtree: true, attributes: true, attributeFilter: ALL_ATTRS }`.
- `ALL_ATTRS` at line 160 is built from `HTMX_ALL_ATTRS` (lines 142-153) + `FIXI_ATTRS` (line 156).
- Attribute-change handler at lines 674-682 already re-processes elements when a watched attribute changes — including added or removed.
- The `attributeFilter` is a static array captured at observer-creation time. Adding `'hx-live'` to `HTMX_ALL_ATTRS` (Phase 2a) automatically extends the filter.

**Verdict — no extra work.** Adding `'hx-live'` to `HTMX_ALL_ATTRS` is sufficient. The observer will pick up `hx-live`-bearing elements on add, mutation, and removal without further changes.

---

## 3. Reactivity plugin install ordering

**Files reviewed:**

- [packages/core/src/runtime/plugin.ts:75](../../../packages/core/src/runtime/plugin.ts#L75) — `installPlugin(runtime, plugin)`
- [packages/core/src/compatibility/browser-bundle-hybrid-hx.ts](../../../packages/core/src/compatibility/browser-bundle-hybrid-hx.ts) — current htmx-compat entry point
- [packages/reactivity/src/index.ts:69](../../../packages/reactivity/src/index.ts#L69) — idempotency guard via `parserExtensions.hasFeature('live')`

**Findings:**

- `hybrid-hx` bundle does NOT install `reactivityPlugin`. It creates `HtmxAttributeProcessor` and calls `init(executeCallback)` at line 87 with a callback that delegates to `hybridComplete.execute()`.
- The hyperscript runtime used by `hybrid-hx` does not register the `live` / `when` / `bind` features, since reactivity is opt-in.
- For Phase 5's `hx-v4` bundle: reactivityPlugin must be installed _before_ `htmxProcessor.init()` is called. Otherwise, when the processor encounters `hx-live` and emits a `live ... end` block, the runtime's parser will fail to recognize `live` as a feature.
- Phase 2 (in non-v4 bundles or vite-plugin contexts) needs a runtime check: if `parserExtensions.hasFeature('live')` is false at the moment `hx-live` is seen, log a clear console error and skip the element rather than emit code that will fail at parse time.

**Action items for Phase 2/5:**

- Phase 2a: in `translateToHyperscript()` or the processor's element-handling path, when `hx-live` is present, check whether the runtime's parser-extensions registry has `live`. If not, console.error and return empty translation (skip the element). The check function needs access to the runtime — either pass it through `init()` or expose a getter.
- Phase 5: `browser-bundle-hybrid-hx-v4.ts` imports `reactivityPlugin` from `@hyperfixi/reactivity`, calls `installPlugin(runtime, reactivityPlugin)` after the hybrid-complete runtime is created, _then_ instantiates `HtmxAttributeProcessor`.

**Entry points in scope** for Phase 5: only `browser-bundle-hybrid-hx-v4.ts` (the new bundle). Phase 6 (vite-plugin) auto-installs `reactivityPlugin` when the scanner detects `hx-live`, so vite users get correct ordering by construction.

---

## 4. Vite-plugin scanner gaps

**File:** [packages/vite-plugin/src/scanner.ts](../../../packages/vite-plugin/src/scanner.ts)

**Findings — currently detected:**

- `hx-get|post|put|patch|delete` (line 12-13)
- `fx-action`, `fx-method` (lines 14-15)
- `hx-swap|fx-swap`, `hx-target|fx-target`, `hx-trigger|fx-trigger` (lines 16-18)
- `hx-push-url|hx-replace-url` (line 19)
- `hx-confirm` (line 20)
- `hx-on:*` (line 21)

**Currently missed (even pre-v4):** `hx-vals`, `hx-headers`, `hx-boost`. Not in scope for this arc but worth noting.

**Phase 6 additions needed:**

- `hx-live` — emit `needsReactivity`, `needsHxLive` usage flags
- `sse-connect`, `sse-swap` — emit `needsSSE`
- `ws-connect`, `ws-send` — emit `needsWS`
- `bind\s+\$\w+\s+to\s+[^.\s]+\.\w+` inside `_=` attribute values — emit `needsBindToProperty`

**Architecture observation:** scanner currently uses hardcoded `/[a-z-]+/` patterns. Adding the localized-attribute scan in Phase 8e needs a different approach (read `lang` attribute on document or any parent, look up vocab module, scan for translated attribute names). Deferred to Phase 8e's design; for v1 of Phase 8, vite-plugin localization can simply assume the vocab module is loaded at runtime and not scan localized forms.

---

## 5. Bundle size projections

**Measurements (gzip):**

| Bundle                                  | Raw bytes | Gzip bytes                                                                                            | Notes                                               |
| --------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Current `hybrid-hx.js`                  | 41,784    | **11,190** (~11 KB)                                                                                   | Baseline; v1/v2 attribute set + hyperscript runtime |
| `@hyperfixi/reactivity` `dist/index.js` | 19,002    | **4,902** (~5 KB)                                                                                     | Standalone; assumes already-built                   |
| SSE module (projected)                  | —         | **~2 KB** (~120 LOC of TS, mostly EventSource wrapping + backoff)                                     |
| WS module (projected)                   | —         | **~2 KB** (~150 LOC of TS, includes reconnect with exponential backoff — slightly larger than SSE)    |
| `hx-live` translator (projected)        | —         | **~0.5 KB** (adds `'hx-live'` to ALL_ATTRS + a small `translateHxLive()` function)                    |
| `bind-to-property` (Phase 1)            | —         | **~0.3 KB** (member-access parser extension in bind.ts) — folded into reactivity dist, not standalone |

**`hx-v4` total projection:** 11 + 5 + 2 + 2 + 0.5 = **~20.5 KB gzip** (tighter than the 22-28 KB plan estimate).

**Within bundle-size policy:** yes. Phase 5 verification gate requires the new bundle to stay under 28 KB gzip; we have ~7 KB of headroom for unexpected import bloat.

**Hyperfixi-reactivity not standalone in `hx-v4`:** the bundle will inline the reactivity machinery (not import-by-reference), so the 5 KB measurement is approximate — could shrink slightly with tree-shaking.

---

## 6. loka-js hook contract inspection

**Files reviewed:** [loka-js/fixi.js](file:///Users/williamtalcott/projects/loka-js/fixi.js), [loka-js/orchestrator.js](file:///Users/williamtalcott/projects/loka-js/orchestrator.js), [loka-js/lang-resolver.js](file:///Users/williamtalcott/projects/loka-js/lang-resolver.js)

**Findings — hook surface (4 hooks, not 3):**

| Hook           | Signature                  | Default                   | Purpose                                                                        |
| -------------- | -------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `fx.name`      | `(elt, key) → attrName`    | `(e, k) => 'fx-' + k`     | Resolve attribute name for a key on a specific element                         |
| `fx.event`     | `(elt, value) → eventName` | `(e, v) => v`             | Translate event-name values (e.g., `'clic'` → `'click'`)                       |
| `fx.sel`       | `(key) → cssSelector`      | `(k) => '[fx-' + k + ']'` | Build CSS selector that matches both English and any registered localized form |
| `fx.ignoreSel` | string                     | `'[fx-ignore]'`           | Single CSS selector for elements to skip                                       |

**Plan correction:** our plan said "3-hook contract" — the actual loka-js contract is **4 hooks**. The plan's Phase 8a/8b will need to include `ignoreSel` resolution. Update Phase 8 commit details to reflect 4 hooks.

**Pre-install via `??=`:** orchestrator runs before fixi.js and assigns hooks onto `window.fixi` _before_ fixi captures them (fixi uses `??=` so pre-assigned values win). **Our architecture differs**: `HtmxAttributeProcessor` is a class. We don't need the `??=` dance — just expose `nameOf`/`selectorFor`/`eventNameOf`/`ignoreSelector` as overridable processor options at construction time. Simpler and avoids global state.

**Lang resolution** (lang-resolver.js): 4-level lookup

1. `data-loka-lang` on the element
2. `data-loka-lang` on closest ancestor
3. `lang` on closest ancestor (HTML standard)
4. `'en'` fallback

All results normalized via `s.split('-')[0].toLowerCase()` so `es-MX` → `es`. **Our Phase 8 should adopt this exactly**, possibly renaming `data-loka-lang` to `data-hyperfixi-lang` (or keeping `data-loka-lang` for cross-project consistency — recommendation: keep, share with loka-js).

**SSE/WS keys not in loka-js scope:** loka-js only knows `fx-*`. Phase 8 needs to extend the vocab module format to cover the broader `hx-*`, `sse-*`, `ws-*` attribute set. The natural shape: replace `fixi.attrs` with `htmx.attrs` (or both, for cross-library locale modules).

---

## 7. Vocab generator inventory

**Files reviewed:** [loka-js/scripts/fx-vocab.mjs](file:///Users/williamtalcott/projects/loka-js/scripts/fx-vocab.mjs), [loka-js/locales/es.js](file:///Users/williamtalcott/projects/loka-js/locales/es.js)

**Generator input shape (LocaleSpec):**

```js
{
  profile: 'spanish',        // basename of @lokascript/semantic profile (without .ts)
  name: 'Spanish',           // display name
  reviewed: true,            // native-speaker reviewed
  fixi: {
    attrs: { 'fx-acción': 'fx-action', /* ... */ },
    events: { 'pulsacion': 'keydown', /* ... */ },
  },
  props: { 'valor': 'value' },  // localized DOM property names (used by psatina-modular, not fixi)
}
```

**Generator output shape** (per-locale `.js` file):

```js
window.loka.register('es', {
  fixi: {
    attrs: {
      /* same shape */
    },
    events: {
      /* ... */
    },
  },
});
```

**Reviewed locales (3):** es, ja, ar. Others (14) are best-effort translations awaiting native-speaker review.

**Phase 8c plan:**

- Adapt this generator into `packages/core/scripts/gen-htmx-vocab.mjs`
- Generator input becomes `{ profile, name, reviewed, htmx: { attrs, events } }` — same shape, `htmx` namespace replaces `fixi`
- Emit modules call `window.__hyperfixi_i18n.register('es', { htmx: { ... } })`
- Coordinate with loka-js so both libraries can share data sourced from the same authoritative `@lokascript/semantic` profile data — note in MEMORY when both projects' generators have stabilized so a future unification arc has a starting point

---

## 8. Existing translations for new attribute concepts

**Spot-check method:** grepped for canonical English values (`'live'`, `'connect'`, `'listen'`, etc.) across [packages/semantic/src/generators/profiles/](../../../packages/semantic/src/generators/profiles/).

**Existing translations** (verified present in Spanish profile [spanish.ts](../../../packages/semantic/src/generators/profiles/spanish.ts)):

- `target` → `'objetivo'` (also `'destino'`)
- `swap` → `'intercambiar'`/`'permutar'`
- `trigger` → `'disparar'`/`'activar'`
- `send` → `'enviar'`

**Missing translations** (zero matches across any of 24 profiles):

- `live` — NEEDED for `hx-live`
- `connect` — NEEDED for `sse-connect` and `ws-connect`
- `listen` — would be NEEDED if we added `sse-listen` (not in current scope; documenting for completeness)

**Action for Phase 8c (blocker):** before the vocab generator runs, semantic profiles for priority languages (es, fr, ja, zh, ar, ko, de) need entries for `live` and `connect`. This is small, well-bounded prep work — ~30 minutes per language to add two keyword entries.

**Recommended translations** (to be reviewed by native speakers in Phase 8d, not the generator):

- `live`: es `en-vivo`/`vivo`, fr `en-direct`/`vivant`, ja `ライブ`/`生`, zh `实时`/`直播`, ar `حي`/`مباشر`, ko `라이브`/`실시간`, de `live`/`echtzeit`
- `connect`: es `conectar`, fr `connecter`, ja `接続`, zh `连接`, ar `اتصال`, ko `연결`, de `verbinden`

These are best-effort; Phase 8c's verification gate is that semantic profile owners have signed off, not that this audit got them right.

---

## Summary

**No blockers to Phases 1-7.** Cleanup registry behaves correctly for SSE/WS use. MutationObserver auto-extends to `hx-live`. Plugin install order has a single bundle to wire (Phase 5). Bundle size projections come in tighter than the plan's estimate (20.5 KB vs 22-28 KB).

**Phase 8 has one clarification (4 hooks, not 3) and one pre-req (translation gaps in semantic profiles).** Both are within scope; neither delays the arc.

**Recommended plan adjustments** (none breaking; capture in next plan revision):

- Phase 8 commit messages should reference 4 hooks (`nameOf`, `eventNameOf`, `selectorFor`, `ignoreSelector`)
- Phase 8c's "pre-req" should appear in the plan: add `live` + `connect` to priority-language semantic profiles before the vocab generator runs
- Vite-plugin scanner gap for `hx-vals` / `hx-headers` / `hx-boost` worth filing as separate followup (not blocking)
