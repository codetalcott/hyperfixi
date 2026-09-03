# Handoff — collapse the three DOM processors onto the Program cache

> **Written 2026-09-03 from measurement, not started.** This is the plan's
> risk 6 ("two of the three DOM processors will move"), filed as After-the-plan
> item 2 and worked as far as its first slice: `hyperscript.process()` no
> longer carries a private listener installer (its own `addEventListener`
> dropped filters, `or` lists and `from` — measured, fixed, pinned by
> `api/dom-processor.test.ts`). What is left is the collapse itself.

## What is true today (measured 2026-09-03)

| Processor | Lines | Behind | Compiles via | Installs handlers via |
| --- | --- | --- | --- | --- |
| ~~`api/dom-processor.ts`~~ | ~~285 (was 444)~~ **deleted 2026-09-03** | ~~`hyperscript.process()`, `hyperscript.cleanup()`~~ — both now call the attribute processor | — | — |
| `dom/attribute-processor.ts` | 664 | every browser bundle (`defaultAttributeProcessor`); `browser-modular` | `hyperscript.compileSync` directly | the runtime |
| `dom/minimal-attribute-processor.ts` | 148 | the small bundles' `MinimalRuntime` (`createMinimalAttributeProcessor`) | none — hands SOURCE to `runtime.execute(code, ctx)` | the minimal runtime |

Importers, non-test: `compatibility/browser-bundle.ts`, `browser-modular.ts`,
`browser-bundle-classic.ts`, `browser-bundle-classic-i18n.ts` and
`api/hyperscript-api.ts`. The layering baseline carries one edge for this:
`dom -> api` (attribute-processor imports the API it sits under).

What only the attribute processor has, and the collapse must keep:
`MutationObserver` re-scan, the **lazy stub** (compile on first trusted event
so user activation survives — clipboard, fullscreen), `<script
type="text/hyperscript">` with and without `for=`, the `load` element event,
compile-error reporting (`console.error` + `hyperfixi:compile-error` +
`config.onCompileError`), the `IMMEDIATE_EVENTS` set, and multi-handler
detection. What only the API processor had — **corrected 2026-09-03, the
first draft of this paragraph had it backwards**: the `hyperscript:before:init`
/ `after:init` lifecycle, `data-hyperscript-powered`, and language detection
per element (`detectLanguage` → `compileAsync` for non-English). The bundle
path had NONE of the three: it compiled every attribute as English, so the
morph-engine marker was absent on every bundle-processed page. **PR 1 moved
all three into the attribute processor** (the survivor), and found the lazy
stub wrong on the first event for every header feature (filter, `or`, `from`,
`(args)`) — `LAZY_HEADER` now admits only `on <event> <body>`.

## The shape to reach

One processor module under `dom/`, with the API's `process()`/`cleanup()`
calling it (not the reverse — that deletes the `dom -> api` edge, which needs
`compileSync`/`compileAsync`/`getDefaultRuntime` to arrive by injection the
way `initializeDOMProcessor` already does). Both entry points compile through
the API's Program cache, so a re-scan after a swap re-uses the compiled
handler rather than re-parsing. The minimal processor stays: it serves a
runtime with no parser of its own and is 148 lines.

## Order

1. ~~**Parity gate first.**~~ ✅ **DONE 2026-09-03 (PR 1).**
   `api/dom-processor.test.ts` runs 36 rows on THREE paths — API, eager,
   lazy — for the event grammar, the lifecycle (dispatch order, cancel,
   marker), event identity (the lazy stub passes the real event) and
   `logAll`. Four mutations each redden exactly the rows that claim them.
   The rows only the bundle path can pass today (`load`, compile-error
   reporting, script tags, cleanup-then-reprocess) land WITH step 2: a row
   red on one path cannot land first.
2. ~~Move `processHyperscriptAttribute` + `process` from `api/` into the
   attribute processor as its element-level entry; the API imports it.
   `dom -> api` edge → gone; regenerate `baselines/layering.json` (shrink).~~
   ✅ **DONE 2026-09-03 (PR 2).** `processTree(root)` on the attribute
   processor is what `process()` calls; `forget(root)` is what `cleanup()`
   calls; the API injects `compileSync`/`compile`/`execute`/`config` through
   `initializeAttributeProcessor` (a declared `ProcessorHost` contract, typed
   structurally so the API's shapes are checked at the call site). The row
   is gone from `layering.json`. Found on the way: `cleanup(container)`
   stripped the root's marker only; the lazy path never checked the
   processed set (a second scan → a second stub); "processed" was
   per-instance state, so `cleanup()` could not forget an element another
   instance had stubbed — it is module-level now, a property of the element.
   `api/dom-processor.ts` is now unimported; step 3 deletes it.
3. ~~Delete `api/dom-processor.ts`'s remaining duplicates (`detectLanguage` has
   a twin in the attribute processor's async path — measure which is used).~~
   ✅ **DONE 2026-09-03 (PR 3).** `api/dom-processor.ts` deleted whole (its
   last importer left in PR 2); the parity table moved beside the survivor as
   `dom/processor-parity.test.ts`. The `detectLanguage` twin was NOT in the
   attribute processor's async path (that path had no language detection at
   all — PR 1 gave it the API's) but in `browser-bundle-multilingual.ts`,
   which walked the ancestors itself; measured against the shared function
   the only differences were a `SUPPORTED_LANGUAGES` check and a lowercase,
   so it now calls the shared one and keeps the check — from
   `dom/detect-language.ts`, a module with no imports: the first cut imported
   it from the processor, and CI's size job measured the parser-free
   multilingual bundle growing 91.2 → 93.2 KB gzipped (2.2%, out of
   tolerance) because the whole processor came along. Also folded: the
   `MutationObserver`'s hand-rolled script-tag + element + descendant block
   is `processTree()` (which now also takes a root that is itself a script
   tag) — a dedupe, not a fix: dropping the script-tag `await` reddened no
   row, because a behavior definition registers synchronously — and the
   `lazyElements` set that was written and never read.
4. Re-run: core `test:check`, the Playwright `quick` + `comprehensive`
   projects (the bundle path), the bundle-size snapshot (no bundle may grow —
   the full bundle already carries both processors, so this should shrink).

## Traps

- `hyperscript.process()` is SYNC (returns void); the attribute processor is
  async. The parity test awaits both; a caller relying on sync install after
  `process()` exists (the `logAll` test dispatches right after) — the runtime
  installs the listener before its first await, so keep that property.
- The lazy stub bypasses `runtime.execute` for the FIRST event on purpose
  (listeners added during dispatch are not invoked for the current event);
  do not "simplify" it into a plain execute.
- `browser-modular.ts` exports `defaultAttributeProcessor` by name — public.
