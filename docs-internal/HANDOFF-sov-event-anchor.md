# Handoff — SOV bare-command / event-anchor disambiguation

> Paste into a fresh session to pick up the next multilingual arc. Self-contained.
> Forward plan: [MULTILINGUAL_NEXT_STEPS.md](MULTILINGUAL_NEXT_STEPS.md) (Track 3 note + recommended sequence).

## Goal

Fix the **single structural root cause** behind the three biggest remaining multilingual
gaps. In SOV languages (hi, qu, bn, ko, ja, tr) the i18n reorder fronts the object before the
verb. When that fronted element is a **selector** the parse is correct; when it is a
**literal or expression** (a URL, a `fn()` call), the parser **mis-anchors it as the event**
(or fails to match the bare command at all). One arc closes all three:

1. **`tr window-resize`** — the last reactivity **hard parse failure** (parse rate 3695/3696).
2. **hi/qu/bn R1 role-fidelity** — the laggard dimension (avgRoleFidelity **0.833**;
   hi **0.683** / qu **0.770** / bn **0.780**). Dominant drops: `on.event:literal` (hi 22×),
   `fetch.source:literal` (hi/qu/bn **13× each**), `repeat.loopType`/`repeat.event` (~7×).
3. **SOV `fetch` NULLs** — qu/bn return null on bare `fetch <url>`.

## The root cause (already diagnosed — start here, don't re-triage)

The proof is a controlled triple (all `on click <body>` → hi):

| English                      | hi translation                 | parse                                    | why                                       |
| ---------------------------- | ------------------------------ | ---------------------------------------- | ----------------------------------------- |
| `on click toggle .active`    | `.active को क्लिक पर टॉगल`     | ✅ R1-perfect                            | selector-fronted → not mistaken for event |
| `on click call myFunction()` | `myFunction() को क्लिक पर कॉल` | ✗ `myFunction()` parsed as the **event** | expression-fronted → mis-anchored         |
| `fetch /api/data`            | `/api/data को लाएं`            | ✗ parsed as `on /api/data … fetch`       | literal-fronted → mis-anchored            |

qu `/api/data ta apamuy` and bn `/api/data কে আনুন` return **NULL** (the bare SOV
`<obj> <marker> <verb>` command pattern doesn't match at all — a different surface of the
same problem).

**Two sub-fixes:** (a) SOV event-anchor: a fronted **string-literal / expression / URL** must
not be treated as an event name (events are bare identifiers like click/keyup, never selectors,
URLs, or `fn()` calls); (b) the bare SOV command pattern must match for the qu/bn null cases.

## Reproduce (cold tree → probe)

```bash
npm install
npm run test:multilingual:build-deps                      # ordered build of the stack
npm run populate --prefix packages/patterns-reference      # rebuild patterns.db + provenance stamp
```

Then probe directly (a scratch `tsx` under `packages/testing-framework/src/multilingual/`):

```ts
import { GrammarTransformer, getProfile } from '@lokascript/i18n';
import { maskSpans, unmaskSpans } from '../../../patterns-reference/src/sync/span-mask';
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
import { collectRoleSignature } from './fidelity';
const tr = (c, l) => {
  const { masked, spans } = maskSpans(c);
  return unmaskSpans(new GrammarTransformer('en', l).transform(masked), spans);
};
const ml = new MultilingualHyperscript();
await ml.initialize();
const node = await ml.parse(tr('fetch /api/data', 'hi'), 'hi'); // inspect node.roles / collectRoleSignature(node)
```

To re-derive the R1 leverage map, dump per-pattern `collectRoleSignature` recall vs the en
reference for hi/qu/bn (the throwaway `_r1diag.ts` from the 2026-06-17 triage did exactly this —
load `loadPatterns`, parse each, diff role signatures, aggregate the misses).

## Where to look

- `packages/semantic/src/parser/semantic-parser.ts` — the SOV event-extraction path and the
  bare-command matcher. The mis-anchor decision (what counts as an event after the on-marker)
  lives here; cross-check `looksLikeEvent`-style gates (the block-parser has a sibling notion in
  `tryParseProgram`, see `TARGET_REFERENCES` / `looksLikeEvent` in `block-parser.ts`).
- `packages/semantic/src/parser/pattern-matcher.ts` — why the bare SOV `<obj> <marker> <verb>`
  command fails to match in qu/bn (the NULL cases).
- **tr `window-resize` is a compounded case**, two extra fixes layered on the SOV anchor:
  (1) the i18n transformer emits `boyut_değiştir` for `resize`; the tr tokenizer
  (`packages/semantic/src/tokenizers/turkish.ts`) **splits on `_`** → `değiştir` collides with
  **`toggle`**. Needs a single-token resize form (cf. the `enyakın` fused-token fix) — likely an
  i18n single-word resize emission + tr tokenizer entry. (2) the `debounced at 200ms` event
  modifier is left **untranslated** and fronted by the reorder.
- Prior tractable family for reference (R0 dict-alignment): the merged Track 2 fixes — sw
  `ingizo`→input (`tokenizers/swahili.ts`), ms `bind` marker + hi `bind`/`intercept` keywords
  (`command-schemas.ts` / `profiles/hindi.ts`).

## Method (proven playbook — see CLAUDE.md "Running the multilingual gate locally")

1. Probe the single failing pattern (translate + parse + `collectRoleSignature`) BEFORE any run.
2. Edit the SOV parser path; **rebuild semantic**: `cd packages/semantic && npx tsup && npm run build:types`.
   (The harness parses via `@hyperfixi/core/multilingual`, which imports `@lokascript/semantic`
   at runtime — no core rebuild needed unless the guard flags core's dist as stale.)
3. Re-probe; run the semantic unit suite (`npm run test:check --prefix packages/semantic`).
4. `npm run populate --prefix packages/patterns-reference`.
5. `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression`.
6. After an intentional change: `--save-baseline`; verify the diff is improvements only
   (parse-rate ↑, R1 ↑) with **no `↓`** — especially **no R0/precision regression** elsewhere.
7. `git checkout packages/patterns-reference/data/patterns.db` (never commit the binary DB).
   Commit dicts/profiles/parser + baseline only.

## Gotchas

- **This is the hottest, most regression-sensitive parser path** — every currently-passing SOV
  language (ja/ko/hi/qu/bn/tr) routes through it. Guard R0-recall, R0-precision, **and**
  parse-rate, not just R1. An un-gated SOV event-extraction change has regressed ja/bn/he/de
  before (roadmap: the "mid-stream event" arc had to be `wordOrder`-gated).
- `--regression` refuses to run against a stale/unstamped `patterns.db` — always `populate` first.
- `npx tsup` alone skips `build:types`; run both or `build-artifacts.test.ts` fails on missing `.d.ts`.
- Keep changes language-scoped where possible; re-baseline isolates the deltas.

## Alternative (if a lower-risk arc is preferred)

**Track 4 — lossy long-tail.** 94 lossy passes ≫ the 1 remaining hard-fail. `unless-condition`
(1 degen + 8 lossy) is the representative; the rest is a per-pattern tail (`fetch-do-not-throw`
5, `get-value` 4, `tell-*` 4, `set-color-variable` 4). Per-pattern, lower blast radius than the
SOV arc.

## Definition of done (SOV arc)

`tr window-resize` parses non-null; hi/qu/bn `avgRoleFidelity` rises (target: clear the
`on.event`/`fetch.source` drop clusters); SOV `fetch` NULLs parse; `--regression` green with
**no R0/precision/parse-rate regression**; baseline regenerated and committed; `patterns.db`
left uncommitted.
