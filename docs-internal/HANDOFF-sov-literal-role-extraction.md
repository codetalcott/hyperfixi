# Handoff — SOV literal-role extraction (the shared R2 blocker)

> **Written 2026-07-04**, after the R2 execution-coverage sweep (PRs #554–#558).
> Entry context: [MULTILINGUAL_NEXT_STEPS.md](MULTILINGUAL_NEXT_STEPS.md) top-of-file
> update dated 2026-07-04 ("R2 EXECUTION-COVERAGE SWEEP"). Read that first for the
> big picture; this doc is the focused, ready-to-execute arc plan.

## The task in one sentence

Teach the semantic parser to capture a **fronted or trailing BARE LITERAL role**
(a number for `increment`'s `quantity`, a string for `append`'s `content`/patient)
in **SOV languages** — the one shared root cause that currently blocks BOTH
`increment-by-amount` and `append-content` from joining the R2 execution subset.

## Why it matters / what "done" looks like

Two curated R2 patterns cannot join the execution subset today because their SOV
translations silently drop a literal role. Success:

1. **`increment-by-amount`** (`increment #score by 10`) captures the amount in
   **all 23 langs** (today the SOV 6 + th drop it), then joins the R2 subset
   (needs a `#score` fixture element).
2. **`append-content`** (`append "<li>Item</li>" to #list`) captures the content
   in **all 23 langs** (today ja/tr/bn drop it), then joins the R2 subset (needs a
   `#list` fixture element).
3. **Zero regressions** on the SOV languages currently passing — this edits the
   hottest, most regression-sensitive parser path (every SOV lang), so guard the
   full six-signal gate carefully.

## The precise grounding (so you don't re-discover it)

This is the Track-3 structural frontier: **selector-fronted SOV works
(`toggle .active` → perfect), literal/expression-fronted SOV is mis-handled.**
The #508 event-anchor guard already stopped a fronted literal from being mis-read
as the _event_; what remains is capturing that literal into a **non-primary role**
(quantity, content) under the SOV reorder.

### increment-by-amount — the SOV 6 + th (clean-DB translations)

The amount `10` trails the verb, bare (no marker), and is dropped → `quantity`
defaults to 1 (or is undefined). SVO marker langs (es/fr/pt/de) were fixed in
**#558**; it/zh work (bare amount captured positionally). Remaining:

| lang | corpus translation              | problem                                                                                                        |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| bn   | `#score কে ক্লিক এ বৃদ্ধি 10`   | bare `10` after verb `বৃদ্ধি`, dropped                                                                         |
| hi   | `#score को क्लिक पर बढ़ाएं 10`  | bare `10` after verb `बढ़ाएं`, dropped                                                                         |
| ja   | `#score を クリック で 増加 10` | bare `10` after verb `増加`, dropped                                                                           |
| ko   | `#score 를 클릭 할 때 증가 10`  | bare `10` after verb `증가`, dropped                                                                           |
| qu   | `#score ta ñitiy pi yapay 10`   | bare `10` after verb `yapay`, dropped                                                                          |
| tr   | `#score i tıklama de artır 10`  | bare `10` after verb `artır`, dropped                                                                          |
| th   | `เมื่อ คลิก เพิ่มค่า #score 10` | **SVO** bare `10` dropped (it/zh capture the same shape — likely a th tokenizer issue; investigate separately) |

**⚠️ Load-bearing subtlety:** `patterns/increment.ts` ALREADY has
`increment-bn-with-quantity` (marker `দিয়ে`) and `increment-hi-with-quantity`
(marker `সে`/`से`) — but they expect **quantity BEFORE the verb, marked**
(`{patient} কে {quantity} দিয়ে বৃদ্ধি করুন`). The i18n transformer actually emits
**amount AFTER the verb, bare** (`… বৃদ্ধি 10`). So the hand-crafted patterns don't
match the corpus form. This is the crux and it is **two-sided**: either (a) fix the
i18n transformer to emit the marked/pre-verb form the patterns expect, or (b) add
patterns matching the bare-trailing-amount form, or (c) make the SOV role
extraction capture a trailing bare literal generically. Decide deliberately;
don't assume it's one-sided.

### append-content — ja/tr/bn (clean-DB translations)

The content is a fronted string literal marked with the object particle; dropped
in 3 langs. ko/hi and 18 others work.

| lang | corpus translation                                 | result                                  |
| ---- | -------------------------------------------------- | --------------------------------------- |
| ja   | `"<li>Item</li>" を クリック で 末尾追加 #list に` | runtime error "append requires content" |
| tr   | `"<li>Item</li>" i tıklama de iliştir #list e`     | runtime error "append requires content" |
| bn   | `"<li>Item</li>" কে ক্লিক এ জুড়ুন #list তে`       | silent no-op (empty effect)             |
| ko   | `"<li>Item</li>" 를 클릭 할 때 덧붙이다 #list 에`  | **works** (content captured)            |

All four parse as `action=append`, `patternId=undefined`, empty top-level roles —
yet ko captures the patient via the SOV fallback and ja/tr/bn don't. **Find why
the SOV fallback role-extraction fires for ko but not ja/tr/bn** — that divergence
is the wedge. (Watch for append/add verb-normalization noise: some dict forms
normalize `append`→`add`; verify against a FRESH populate, not a stale snapshot.)

## Key files

| File                                                  | Why                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/semantic/src/parser/semantic-parser.ts`     | SOV extraction: `SOV_EVENT_MARKERS`, `SOV_EVENT_MARKER_PHRASES`, `buildEventHandler`, the Stage-3 SOV fallback (the ko-works/ja-fails divergence lives here)     |
| `packages/semantic/src/parser/pattern-matcher.ts`     | `matchRoleToken` — how a role token (with/without marker) binds under reorder                                                                                    |
| `packages/semantic/src/generators/command-schemas.ts` | `incrementSchema`/`decrementSchema` `quantity` + `appendSchema` `patient` — `sovPosition` fields; #558 added es/pt/fr/de quantity `markerOverride` here          |
| `packages/semantic/src/patterns/increment.ts`         | Existing SOV `*-with-quantity` patterns (bn/hi) that DON'T match the corpus form — see the subtlety above; #558 added `increment-de-with-quantity` as a template |
| `packages/semantic/src/patterns/add.ts`               | The `add` SOV patient-first patterns that DO work (`add-event-tr-sov-patient-first`, etc.) — the reference to mirror for append                                  |
| `packages/i18n/src/grammar/transformer.ts`            | If the fix is transformer-side (emit the marked/pre-verb amount form)                                                                                            |

## Reproduction & discovery-probe recipe

Node 24 is required (better-sqlite3 ABI). **Always do the FULL ordered rebuild
before `populate`** — a partial rebuild leaves the DB transitional and produces
phantom failures (this cost a phantom zh `toggle-visibility` gate failure last
session; see the CLAUDE.md "green suite against a stale dist is vacuously green"
hazard — it applies to `populate`, not just vitest).

```bash
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"
npm run test:multilingual:build-deps                      # FULL ordered rebuild (REQUIRED)
npm run populate --prefix packages/patterns-reference     # fresh patterns.db
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression   # gate must be green first
```

Probe a single pattern's per-language execution (add the fixture element first —
`#score` for increment, `#list` for append — in
`packages/testing-framework/src/multilingual/validators/execution-validator.ts`
`FIXTURE_HTML`, appended at the END so existing document-order indices are
preserved). Throwaway probe shape (place the `.mts` file INSIDE
`packages/testing-framework/` so workspace module resolution works; the validator
loads as CJS so reach members via `(EV as any).default ?? EV`):

```ts
import * as EV from './src/multilingual/validators/execution-validator.ts';
import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
const mod: any = (EV as any).default ?? EV;
const v = new mod.ExecutionValidator();
await v.initialize();
const ps = await getAllPatterns();
const byId = new Map(ps.map((p: any) => [p.id, p]));
const LANGS = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];
const id = 'increment-by-amount'; // or 'append-content'
const en = await v.execute(id, byId.get(id).rawCode, 'en');
const enSig = en.effects.join('|');
for (const lang of LANGS) {
  const t = (await getTranslationsByLanguage(lang, 2000)).find((x: any) => x.codeExampleId === id);
  const r = await v.execute(id, t.hyperscript, lang);
  const sig = r.error ? `ERR:${r.error}` : r.effects.join('|');
  if (sig !== enSig) console.log(lang, sig);
}
```

To inspect a parse: `parseSemantic(code, lang)` then `buildAST(node).ast`
(buildAST returns `{ ast, warnings }` — the amount surfaces as
`ast.commands[0].modifiers.by` for the handler form, or `ast.modifiers.by` for a
standalone command; append's content is the command's first arg).

## Working discipline (non-negotiable)

- **One increment per PR; merge on CI green.** (Prior session had standing
  approval to self-merge on green — confirm with the user for this session.)
- **Guard the full six-signal gate.** This is the hot SOV path — a change that
  helps ja can regress ko. After ANY change, run `--regression` AND a
  per-`(lang,pattern)` A/B (clean vs changed): a green gate's 0.02 tolerance
  HIDES per-pattern drops. Zero-regression is the bar, not "gate green."
- **Regenerate the baseline** (`--save-baseline`) only after an INTENTIONAL
  fidelity change, against a freshly `populate`d DB. **Do NOT commit
  `patterns.db`** (revert it before committing). Commit dicts/profiles/patterns +
  the baseline.
- **Add a guard test** per fix in
  `packages/semantic/test/multilingual-roadmap-fixes.test.ts` (the file has the
  established style; #558 added the `increment/decrement by-marker quantity` block
  as a recent template). Verify it FAILS without the fix.
- **R2 subset addition** (once a pattern captures the role in all 23 langs):
  add the fixture element (appended last), add the id to `EXECUTION_SUBSET` +
  the lock-count test + a signature-lock test in `execution-validator.test.ts`,
  then regenerate the baseline. Confirm the pattern matches en in all 23 langs
  via the probe BEFORE adding it.

## Suggested sequence

1. **Ground append first (smaller: 3 langs, and ko is a working reference).**
   Diff the ko (works) vs ja (fails) path through the Stage-3 SOV fallback in
   `semantic-parser.ts` — the ko-captures/ja-drops divergence is the most direct
   wedge into the shared root cause, and it's the cleaner "join R2" once fixed.
2. **Then increment.** Decide the two-sided question (transformer emits marked
   pre-verb amount, vs. patterns/extraction accept trailing bare amount). Reuse
   whatever generalizes from the append fix. Handle th separately (SVO tokenizer,
   not the SOV root cause).
3. **Join each to the R2 subset** as its own follow-up PR once all 23 langs pass.

## What NOT to do

- Don't chase `template-literal-interpolation` (poor R2 fixture — messy en
  signature from innerHTML document-reindex noise; documented in the roadmap).
- Don't chase the `set`-target ×5 rejections here (CSS custom property, positional
  target, block-continuation, `beep!`/`breakpoint`) — heterogeneous, separate arcs.
- Don't force a partial (marker-only or one-lang) fix into the R2 subset — a
  pattern joins only when all 23 langs match en (else R2 drops below 1.0).
