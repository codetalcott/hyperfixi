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
| `api/dom-processor.ts` | 285 (was 444) | `hyperscript.process()`, `hyperscript.cleanup()` | injected `compileSync`/`compileAsync` (initialized from the API to dodge a cycle) | the runtime (since the first slice) |
| `dom/attribute-processor.ts` | 664 | every browser bundle (`defaultAttributeProcessor`); `browser-modular` | `hyperscript.compileSync` directly | the runtime |
| `dom/minimal-attribute-processor.ts` | 148 | the small bundles' `MinimalRuntime` (`createMinimalAttributeProcessor`) | none — hands SOURCE to `runtime.execute(code, ctx)` | the minimal runtime |

Importers, non-test: `compatibility/browser-bundle.ts`, `browser-modular.ts`,
`browser-bundle-classic.ts`, `browser-bundle-classic-i18n.ts` and
`api/hyperscript-api.ts`. The layering baseline carries one edge for this:
`dom -> api` (attribute-processor imports the API it sits under).

What only the attribute processor has, and the collapse must keep:
`MutationObserver` re-scan, the **lazy stub** (compile on first trusted event
so user activation survives — clipboard, fullscreen), `<script
type="text/hyperscript">` with and without `for=`, `hyperscript:before:init` /
`after:init` lifecycle, `data-hyperscript-powered`, the `IMMEDIATE_EVENTS` set,
and multi-handler detection. What only the API processor has: language
detection per element (`detectLanguage` → `compileAsync` for non-English),
which the bundle path does through the same API anyway.

## The shape to reach

One processor module under `dom/`, with the API's `process()`/`cleanup()`
calling it (not the reverse — that deletes the `dom -> api` edge, which needs
`compileSync`/`compileAsync`/`getDefaultRuntime` to arrive by injection the
way `initializeDOMProcessor` already does). Both entry points compile through
the API's Program cache, so a re-scan after a swap re-uses the compiled
handler rather than re-parsing. The minimal processor stays: it serves a
runtime with no parser of its own and is 148 lines.

## Order

1. **Parity gate first.** Extend `api/dom-processor.test.ts`'s two-path table
   to the attribute processor's features: lifecycle events, `powered`
   marker, lazy stub (a `click` handler installed lazily must run for the
   first trusted click), script tags. Every row asserts BOTH paths. This is
   the gate the merge lands under.
2. Move `processHyperscriptAttribute` + `process` from `api/` into the
   attribute processor as its element-level entry; the API imports it.
   `dom -> api` edge → gone; regenerate `baselines/layering.json` (shrink).
3. Delete `api/dom-processor.ts`'s remaining duplicates (`detectLanguage` has
   a twin in the attribute processor's async path — measure which is used).
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
