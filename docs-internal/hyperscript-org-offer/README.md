# Hand-off package: language support for hyperscript.org

> **Not sent (2026-10-06).** The owner is holding all outreach until the hyperfixi code is ready.
> Refreshed against 4.1.0 on 2026-10-06; re-check the status table before sending.

Working set for the offer to Carson Gross: the message ([handoff.md](./handoff.md)) and the page it
links ([integration-guide.md](./integration-guide.md), to be published on lokascript.org).

## Status (2026-10-06, 4.1.0)

| Step | Artifact                                                              | Status                                                                                                                                                                                                                          |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `@hyperscript-tools/multilingual` (31 adapter bundles in its `dist/`) | ✅ on npm at 4.1.0; `unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js` serves (455 KB)                                                                                                               |
| 2    | `@hyperscript-tools/i18n` (CLI, Eleventy plugin, API)                 | ✅ on npm at 4.1.0; translates with `@lokascript/semantic` (#999); `--check` parses the English on hyperscript.org                                                                                                               |
| 3    | lokascript.org/patterns: language chips and live execution            | ✅ live (`enableTranslations` on `_hyper_min`'s shared patterns page); hyperfixi.org/patterns loads too                                                                                                                          |
| 4    | The guide page for hyperscript.org's audience                         | ❌ not deployed: lokascript.org/integration-guide is a 404. lokascript.org/multilingual-plugin/ is live, but it teaches `@lokascript/hyperscript-adapter`, not the neutral `@hyperscript-tools/*` names (see "Open before sending") |
| 5    | The message                                                           | 📄 [handoff.md](./handoff.md)                                                                                                                                                                                                    |

## Decisions baked in

- **Both sites stay on `@lokascript/*` / `@hyperfixi/*` deps.** The `@hyperscript-tools/*` names
  appear only in the guide aimed at _external_ sites.
- **Audience split: hyperfixi.org = engine showcase, lokascript.org = multilingual demo.**
- **Switcher UX = compact chip grid** (24 chips, native names and ISO codes).
- **Build-time companion = wrapper + CLI + Eleventy plugin.** A Vite plugin can come later if asked.

## Open before sending

1. **Where the guide lives.** Deploy [integration-guide.md](./integration-guide.md) at
   lokascript.org/integration-guide (neutral names, as decided), or point the message at the live
   /multilingual-plugin/ page (which names `@lokascript/hyperscript-adapter`).
2. **The readiness bar** for the code (owner).
3. **Order** relative to the book-track email (`~/projects/ideas/hypermedia-systems-outreach-draft.md`),
   which goes to the same person.

Then walk the pre-send checklist in [handoff.md](./handoff.md).

## Source

- [`packages/multilingual-hyperscript/`](../../packages/multilingual-hyperscript/): the
  `@hyperscript-tools/multilingual` wrapper; `scripts/copy-bundles.mjs` copies the adapter's bundles
  into its `dist/`.
- [`packages/hyperscript-tools-i18n/`](../../packages/hyperscript-tools-i18n/): the build-time
  companion.
- [`packages/hyperscript-adapter/`](../../packages/hyperscript-adapter/): the plugin itself
  (`src/attribute-translator.ts` is the hook).
