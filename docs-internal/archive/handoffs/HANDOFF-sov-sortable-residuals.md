# Handoff — SOV/structural `behavior-sortable` residuals

> Written 2026-06-20, after the SOV behavior-fidelity arc (PRs **#461 A2b**,
> **#463 A2a**, **#464 juxtaposed-body / trigger-tail**, **#465 qu init**) landed on
> `main`. Read [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md) first for the
> big picture; this doc is the precise, ready-to-resume scope for the **three remaining
> `behavior-sortable` residuals**, each its own arc.

## Where we are (2026-06-20, `browser-priority`)

`behavior-removable` is **faithful in every SOV/VSO language**. `behavior-sortable`
is faithful in ko/tr/hi/bn/qu/es/fr/it/id/ms/pl/pt/ru/sw/uk/vi/zh/he. Priority gate:
parse-rate **3695/3696**, **degenerate 10**, **lossy 55**, zero open regressions.

The committed baseline (`packages/testing-framework/baselines/multilingual-priority.json`)
is authoritative. The four merged fixes touched:

- `packages/semantic/src/parser/semantic-parser.ts` — `parseBodyWithClauses`
  (depth-aware `end`, A2b), `tryParseConditionalBlock` + `sovCommandStartsAt`
  (verb-medial then-branch boundary, A2a), `parseClause` (skipped-run gap recovery
  via `parseSOVClauseByVerbAnchoring`, juxtaposed-body).
- `packages/semantic/src/tokenizers/extractors/quechua-keyword.ts` —
  `quechuaSuffixStartsAt` (don't split native words at English-fallback keywords).

## The three remaining residuals

### 1. `ja sortable` — fid 0.400 (degenerate). **A coupled multi-defect, not a single fix.**

Only `[behavior, on, if, set]` survive; halt/add/trigger/repeat/wait/remove are
dropped. Prefix-testing the real ja handler (`on pointerdown(clientY) from me …`)
isolates **two independent breaks**:

- **1a — `set` with a method-call patient + a following `if`.**
  `set item to the target.closest("li")` → ja `item を 設定 the target.closest("li") に`.
  Alone it parses (`[set, into]`, with a spurious `into`/`from` from the `the …` leak).
  Add the next clause `if item is null / exit / end` and the **`set` is lost** — only
  `[if]` survives. The method-call patient (`the target.closest("li")`) interacts with
  the A2a condition/then boundary split. Start in `tryParseConditionalBlock` /
  `sovCommandStartsAt` and the `the <expr>.method()` value tokenization.
- **1b — commands after the `repeat until … end` loop are dropped.**
  `remove .{dragClass} from item` and the final `trigger sortable:end on me` after the
  loop are lost. ja fronts `まで`(until) **before** the `繰り返し`(repeat) opener
  (`まで イベント pointerup を 繰り返し ドキュメント から … 終わり`), so the A2b
  depth-tracker in `parseBodyWithClauses` (which counts `if/unless/while/for/repeat`
  openers as they accumulate) never registers the loop opener → its `終わり` is treated
  as the body terminator. Fix: recognise the fronted-`until` SOV loop opener for depth
  tracking (and confirm the loop body still folds).

Both are genuinely SOV-structural and interact; do them as one focused arc. ja
`removable` is faithful, so the machinery works — sortable's richer body is the stress
case. Note `ja sortable` is **1 of the 10 degenerate** gate instances, so this is the
only residual that moves the degenerate count.

### 2. `ar sortable` — fid 0.900, misses `wait`. **i18n transformer / ar tokenizer (NOT a parser bug).**

The `wait for pointermove(clientY) or pointerup(clientY) from document` clause renders
(via `GrammarTransformer`) as roughly
`wait source and ثيقة wait source and ثيقة pointermove(clientY) أو pointerup(clientY)` —
i.e. Arabic `وثيقة` (document) is **mask-split into `و` + `ثيقة`** and the clause is
doubled. The parser can't recover a `wait` from that. This is the **same family as the
deferred `tr window-resize`** underscore/fused-token split. Fix lives in
`packages/i18n/src/grammar/transformer.ts` (+ `packages/patterns-reference/src/sync/span-mask.ts`
masking and/or the ar tokenizer's handling of `document`/`وثيقة`), not in the semantic
parser. Low gate value (1 pattern/lang, already lossy not degenerate).

### 3. `de sortable` — fid 0.900, misses `remove`. **German V2 body-parse (defect C).**

de is V2 word order; `remove .{dragClass} from item` after the `repeat … end` loop is
dropped. This is "defect C — de (V2) sortable body" in `MULTILINGUAL_NEXT_STEPS.md`.
Isolated, small; a V2-specific body-parse issue distinct from the SOV reorders.

## How to resume (repro + gate)

Throwaway repro harness (put in `packages/patterns-reference/scripts/`, run with
`npx tsx`, delete after — these scripts are NOT committed):

```ts
import { parse } from '@lokascript/semantic';
import { GrammarTransformer } from '@lokascript/i18n';
import { maskSpans, unmaskSpans } from '../src/sync/span-mask';
import { sortableSchema } from '../../behaviors/src/schemas/sortable.schema';
const tr = (code: string, lang: string) => {
  const { masked, spans } = maskSpans(code);
  return unmaskSpans(new GrammarTransformer('en', lang).transform(masked), spans);
};
const ms = (n: any, a: string[] = []): string[] => {
  if (!n || typeof n !== 'object') return a;
  if (typeof n.action === 'string' && n.action !== 'compound') a.push(n.action);
  for (const f of [
    'body',
    'statements',
    'thenBranch',
    'elseBranch',
    'branches',
    'eventHandlers',
    'initBlock',
  ])
    (Array.isArray(n[f]) ? n[f] : [n[f]]).forEach((c: any) => ms(c, a));
  return a;
};
for (const lang of ['ja', 'ar', 'de']) {
  console.log(lang, ms(parse(tr(sortableSchema.source, lang), lang)));
  console.log(tr(sortableSchema.source, lang)); // inspect the transform
}
```

> Build deps first so `@lokascript/*` dist is fresh, else you score stale code:
> `npm run build --prefix packages/semantic && npm run build --prefix packages/i18n`.
> To prefix-test, build the handler incrementally from `sortableSchema.source` lines
> (that is how 1a/1b above were isolated).

Gate workflow (same as the merged PRs — see `CLAUDE.md` "Running the multilingual
`--regression` gate locally"):

```bash
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# after an intentional fidelity change, re-run with --save-baseline and commit the baseline
```

**Conventions that held all four PRs:** branch off `main`; one defect per PR; add a
guard to `packages/semantic/test/multilingual-roadmap-fixes.test.ts` and verify it
**fails without the fix** (`git stash` the src, run `-t "<title>"`, pop); keep a strict
**zero-regression** bar (the gate must print "No regression" with no within-tolerance
flips); do **not** commit `patterns.db` (CI re-populates — `git checkout` it before
committing); commit only src + test + baseline.

## Sequencing recommendation

Highest leverage first: **ja sortable (1a + 1b)** — the only degenerate residual, and
the SOV machinery is already in place. Then **de (3)** — small, isolated. **ar (2)**
last and separately — it's a transformer/tokenizer arc, best batched with the other
fused-token splits (`tr window-resize`, the `_`/space split family), not the parser.
