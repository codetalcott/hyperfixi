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

> **Update during 8c-prep execution (2026-05-19):** the table above is the original audit. Verification before fill found two corrections:
>
> 1. `target` was actually present in all 8 priority profiles' `keywords` block. Real fill scope was 4 keywords × 8 langs = **32 entries**, not 40.
> 2. In ja/ko, `keywords.event` already holds the noun (`イベント` / `이벤트`) — only `roleMarkers.event` holds the particle. No `event_noun` disambiguation needed.
>
> See commit closing this audit for the actual fills.

## Findings summary (corrected)

**Filled in 8c-prep** (added to all 8 priority languages in `packages/semantic/src/generators/profiles/`):

- `connect`
- `stream`
- `live`
- `socket`

**Already present** (no work needed):

- `send`, `swap`, `event`, `target`.

Final scope: 4 missing keywords × 8 priority languages = **32 entries**.

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
