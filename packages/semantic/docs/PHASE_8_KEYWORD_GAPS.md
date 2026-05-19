# Phase 8 — SSE/WS/Reactive keyword gap audit

> Generated 2026-05-19 from item 20 in [htmx-v4-reactive-streaming.md follow-ups](../../../../../.claude/plans/htmx-v4-reactive-streaming.md).
> Read-only inventory; no profile edits in this commit. Phase 8c fills these in.

## Scope

Phase 8 of the htmx v4 plan localizes htmx-compat attribute _suffixes_ per the loka-js hook contract. The new htmx v4 surface area introduces these keywords that may need translation entries in `packages/semantic/src/generators/profiles/{lang}.ts`:

| Keyword   | Used in attribute                        | Why we need it for Phase 8                     |
| --------- | ---------------------------------------- | ---------------------------------------------- |
| `connect` | `sse-connect`, `ws-connect`              | Suffix in localized form (e.g. `sse-conectar`) |
| `send`    | `ws-send`                                | Same                                           |
| `stream`  | `sse-stream` (alternative naming)        | Conceptual keyword for SSE event channels      |
| `swap`    | `sse-swap`, `hx-swap`                    | Already used widely; just confirming           |
| `target`  | `hx-target`                              | Already used widely; just confirming           |
| `live`    | `hx-live`                                | Reactive expression attribute                  |
| `socket`  | (alias for WebSocket-related operations) | Compound forms in some languages may need this |
| `event`   | (semantic keyword for event names)       | Already present; just confirming               |

Phase 8 commits 8a/8b/8c rely on the hook contract from [loka-js](../../../../../loka-js/) but emit vocab modules from these profiles, so any gap below blocks vocab generation for the affected language.

## Inventory — priority languages (8)

Audit covers the eight priority languages flagged in the original plan. Format below: ✅ = present in profile, ❌ = missing.

| Keyword | en  | es  | fr  | ja  | zh  | ar  | ko  | de  |
| ------- | --- | --- | --- | --- | --- | --- | --- | --- |
| connect | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  |
| send    | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| stream  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  |
| swap    | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| target  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  |
| live    | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  |
| socket  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  | ❌  |
| event   | ✅  | ✅  | ✅  | ✅¹ | ✅  | ✅  | ✅¹ | ✅  |

¹ In `ja` and `ko` the `event` slot is repurposed as the post-positional object marker (`を` / `을`). This works for grammar-driven role placement but doesn't expose an attribute-suffix-friendly keyword. Phase 8c will need a second entry (e.g. `event_noun: '出来事'` / `이벤트`) or a tag that distinguishes the marker form from the noun form.

## Findings summary

**Missing from all 8 priority languages** (uniform gap — must be added before Phase 8c):

- `connect`
- `stream`
- `target`
- `live`
- `socket`

**Present everywhere** (no work needed):

- `send`, `swap`, `event` — though `event` for ja/ko needs the noun-vs-marker tweak noted above.

So the Phase 8c keyword work is concentrated, not dispersed: 5 missing keywords × 8 priority languages = 40 entries minimum, plus the ja/ko event-noun disambiguation.

## What Phase 8c should do

For each missing keyword and each priority language, add an entry to `packages/semantic/src/generators/profiles/{lang}.ts` of the form:

```typescript
connect: { primary: 'connecter', normalized: 'connect' },  // example: fr
live:    { primary: 'en-vivo', alternatives: ['vivo'], normalized: 'live' },  // example: es
target:  { primary: 'cible', normalized: 'target' },  // example: fr
```

Then re-run `npm run sync-keywords --prefix packages/vite-plugin` so the vite-plugin keyword sets pick up the new entries.

Translations should follow each profile's existing verb-form convention (infinitive vs imperative vs noun-base) — spot-check the `send`/`swap` rows in each profile when drafting `connect`/`stream`. The `live` keyword in particular has a tricky form because it has both adjective ("live stream") and verb ("X lives where") senses in English; pick the one each language uses idiomatically for "broadcasting".

## Estimated lift (Phase 8c)

- 40 keyword entries + ja/ko event-noun disambiguation: ~1 hr drafting (mostly look-up against existing i18n dictionaries in `packages/i18n/src/dictionaries/`).
- Verification: `npm run typecheck --prefix packages/semantic`, `npm test --prefix packages/semantic`.
- Re-sync to vite-plugin: `npm run sync-keywords --prefix packages/vite-plugin`.
- Total: ~1.5 hr.

## Beyond the 8 priority languages

The full supported-language set is 24 (per `packages/semantic/src/language-building-schema.ts`). Phase 8c only blocks on the 8 priority profiles. The other 16 languages can be left empty in vocab modules at first — the orchestrator falls back to English when a translation is missing, per the loka-js convention. Pick those up if/when demand surfaces from users authoring in those languages.

## Related

- Original plan: [~/.claude/plans/htmx-v4-reactive-streaming.md](../../../../../.claude/plans/htmx-v4-reactive-streaming.md) — Phase 8c (commit 8c).
- Execution plan: [~/.claude/plans/please-implement-remaining-recommended-expressive-pizza.md](../../../../../.claude/plans/please-implement-remaining-recommended-expressive-pizza.md) — Phase 6 (this commit).
- Existing keyword conventions: [packages/semantic/src/generators/profiles/](../src/generators/profiles/) — see `english.ts`, `spanish.ts` for the canonical shape.
- Sync to vite-plugin: [packages/vite-plugin/scripts/sync-keywords.mjs](../../vite-plugin/scripts/sync-keywords.mjs) (path to confirm; see CLAUDE.md root for instructions).
