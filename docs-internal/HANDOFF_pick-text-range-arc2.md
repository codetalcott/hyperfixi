# HANDOFF: pick-text-range arc 2 — vocabulary, 24 languages

> **Paste-ready continuation prompt.** Written 2026-07-19 at the close of the arc-1
> session. Parent plan: `docs-internal/PLAN_pick-text-range.md` (3 arcs; landing
> all three empties BOTH canonical-validity allowlists → **3059/3059**).
> Arc-1 record: memory `pick-text-range-arc1.md`, PR **#733**
> (`feat/pick-text-range-arc1`, commit `7018b69b`).
>
> **PREREQUISITE: arc 1 must be MERGED before this arc starts** (PR #733 is held
> until after the 07-25 v2.8.0 release; freeze 07-24). Do NOT stack a branch on
> the unmerged arc-1 branch — the repo squash-merges, and stacked branches
> conflict on rebase (Phase 9+10 lesson). Branch `feat/pick-text-range-arc2` off
> `main` once #733 is in. First act of the session: `git log --oneline | head`
> and confirm `7018b69b` (or its squash) is on main.

## Mission

Register the canonical `pick` vocabulary across the 24 languages so that arc 3
(per-command i18n render rules + corpus regeneration) has words to render. Arc 2
is **vocabulary only** — no i18n GrammarRules, no per-language semantic pick
pattern variants (both are arc 3), no renderer changes.

**Definition of done:**

1. Every worklist word below registered (or explicitly gated/deferred with an
   in-code comment) in all 24 languages.
2. Per-word after-probes green: no phantom commands, no hot-row regressions
   (R0-precision is the tripwire — see the ja `空` lesson below).
3. Full verification loop green (protocol at the bottom): semantic suite, both
   canonical gates, 9-signal `--regression` ratchet.
4. Baselines regenerated where rows legitimately moved (see "Arc 2 is NOT
   corpus-neutral" — expect movement), foreign allowlist churn inspected and
   explained pair-by-pair in the PR body.

## What arc 1 shipped (the seams you inherit)

All in `packages/semantic`; line numbers as of `7018b69b`:

- **`pick-en-variant` pattern** — `src/patterns/languages/en/pick.ts` (prio 110,
  wired at `src/patterns/en.ts:22,366`). Variant word rides the **`method`**
  role; range/count rides `patient`; `of|from` literal + `source`. The header
  comment documents the deferrals (match/matches render collision, `..`, bare
  `random`, `at/from` prefix) — read it before extending.
- **Range assembler** — `tryMatchPickRangeExpression`
  (`src/parser/pattern-matcher.ts:1288`, call-site gate :712-717, separators set
  `PICK_RANGE_SEPARATORS` :1274 = `{'to'}`). Folds `<a> to <b>
  [inclusive|exclusive]` into ONE expression value; gated to
  `currentPatternCommand==='pick' && role==='patient'`. **Arc 2/3 widen the
  separator per-profile HERE, positionally — never via the roleMarkers table**
  (range-`to` collides with the destination marker by design; that collision IS
  the es `0 a 5` corpus bug).
- **`pickMapper`** — `src/ast-builder/command-mappers.ts:815` (registered
  :1252). Splits the range raw manually; never feed a joint `"0 to 5"` to
  `convertValue` (routes to the expression parser, which can't parse it).
- **pickSchema roles are FROZEN** (`src/generators/command-schemas.ts` — doc
  comment states the invariant). Do not add roles in arc 2 either: the schema
  drives the generated fallback pattern for all 24 languages, and role changes
  rewrite them all. Extend via patterns/EXTRAS/profile keywords.
- en gate row round-trips and validates: `on click pick characters 0 to 5 of
  #note`. en allowlist (`canonical-validity.json`) is **empty** — any en
  regression is now a hard gate failure, not an allowlist entry.

## ⚠️ KEY SEQUENCING FACT: arc 2 is NOT corpus-neutral

The 24 corpus translations are **GENERATED**, not authored: only en `raw_code`
lives in `packages/patterns-reference/scripts/init-db.ts:1417-1423`;
`scripts/sync-translations.ts` generates the rest via the i18n
`GrammarTransformer` **plus a keyword-translation fallback built from the
semantic profiles** (`KEYWORD_TRANSLATIONS` from `KNOWN_PROFILES`). CI
re-populates a fresh DB for the gate. Therefore:

- Adding a dict word or a profile keyword can change the generated pick rows
  **immediately** (e.g. es `characters` → `caracteres`), before any arc-3 work.
- The SOV scrambling and range-`to` mistranslation will REMAIN until arc 3 — so
  the rows will change but most should stay canonical-invalid. Expected outcome:
  foreign allowlist stays ~23, but **renders change**, and R0/R1/R3 values can
  move → run the regen tool AND `--save-baseline` in the same PR, and inspect
  the pick rows in the baseline diff (they moved in arc 1 too; small drops are
  the honest state, not damage).
- If a pair accidentally renders VALID early, the regen tool prunes it —
  that's a win; note it in the PR. If a NON-pick row changes, stop and probe:
  that's the phantom-risk tripwire firing.
- Because profile keywords feed the same generation, there is **no "safe half"**
  of arc 2 that avoids corpus movement. Plan the PR around one full
  populate→gates→regen→save-baseline loop at the end, plus per-word probe loops
  during.

## Word worklist (dispositions verified 2026-07-19 by grep across all 24 dicts + 24 profiles + tokenizers)

> **CORRECTIONS from behavioral probes, 2026-07-20 (arc-2 execution, Batch A):**
> Every "likely clean"/"plain noun" in the grep table below was probed; the
> refutations:
>
> - **`item`/`items` DEFERRED** — not a plain noun. Adding `item` to a dict's
>   `expressions` renames the loop variable in the corpus rows
>   `repeat for item in .items …` (probe: `item` → its translation, a non-pick-row
>   corruption). No corpus pick row uses `item(s)` — all use `characters` — so the
>   collision buys nothing in arc 2. Register `character`/`characters` only.
> - **Registration surface: the Latin=profile / non-Latin=EXTRAS split below is
>   FALSE.** Positional/pick-type vocab lives in the tokenizer **EXTRAS for 23 of
>   24** languages; only `es` puts positional words in its profile — and even es
>   has a `SPANISH_EXTRAS`. Arc 2 registers ALL new vocab via tokenizer EXTRAS
>   (+ i18n dict), es included — uniform, and dodges the profile-keyword phantom
>   class (ja `空`).
> - **Corpus is driven by the i18n DICTS, not the semantic profiles.**
>   `sync-translations.ts` uses the i18n GrammarTransformer (reads the dicts,
>   incl. `expressions`) for all 24 languages; the semantic-profile
>   `KEYWORD_TRANSLATIONS` fallback is dead code. So dict entries move the
>   generated corpus; semantic EXTRAS move the parse-back. Both are needed.
> - **`random` is in EXTRAS for ru AND uk** (russian.ts / ukrainian.ts), and is
>   **missing from the he and vi i18n dicts** (present in the other 22).
> - **`match`/`matches`** stays deferred (unchanged). **`inclusive`/`exclusive`**
>   registered for 20 confident languages; hi/qu/sw deferred (uncertain vocab).
> - **En gets no new vocab** — it rides identifiers through the arc-1 pattern +
>   assembler; new en keywords would only risk that path.
> - **Range separator `to` DEFERRED to arc 3 (probed DORMANT in arc 2).** The
>   plan's "seed es `a` for a live proof" premise is false: every foreign corpus
>   pick row binds `patient` to the UNIT word (`characters`) and DROPS the range
>   (`es escoger characters 0 a 5 …` → `patient:'characters'`, renders
>   `pick characters`; even synthetic `escoger 0 a 5 de #note` → `patient:'0'`,
>   renders `pick 0`). The range fold (`tryMatchPickRangeExpression`) never reaches
>   the separator because no arc-2 foreign pattern has a unit slot BEFORE patient —
>   that slot arrives with arc 3's foreign pick variant patterns. So a per-profile
>   separator + fold-normalization has zero arc-2 effect and only risks the working
>   en fold path. It co-evolves with the arc-3 patterns (the
>   `i18n-renders-semantic-patterns-coevolve` lesson). pattern-matcher.ts is
>   UNTOUCHED in arc 2.
> - File notes: ja `空` lesson comment is at `generators/profiles/japanese.ts:111-115`
>   (profile); `isCuratedEndKeyword` is in `parser/end-keywords.ts:63`.

| Word | Status today | Action | Hazard to probe FIRST |
| --- | --- | --- | --- |
| `item`/`items` | absent EVERYWHERE | **DEFERRED** (loop-var collision, probed) | — |
| `character`/`characters` | absent EVERYWHERE | new EXTRAS + dict entries, 23 foreign langs | `normalized` is not an ActionType so no pattern is generated (same mechanism as the es `matches` comment, `spanish.ts:168-172`) — still after-probe hot rows per language |
| `inclusive` / `exclusive` | absent everywhere | new entries, 20 langs (hi/qu/sw deferred) | PROBED clean (Batch A canary: zero corpus movement, gates green) |
| range-`start` | absent as vocabulary (only `verb.position: 'start'` config) | new entries | colon-events (`draggable:start`) are tokenizer-level and were fixed in the colon-event-names arc — verify a new `start` keyword doesn't re-split them (probe the behavior-draggable/sortable rows in every language you touch) |
| range-`end` | **registered as block-end in EVERY language** | **context gate, NOT re-registration** | the bn `শেষ` dual class. Precedent: `POSITIONAL_HEAD_DUALS` + angle-bracket gate (`expression-lexicon.ts:261-277`, gate :336-339). Also note the matcher's connective guard (`pattern-matcher.ts:~572-587`) rejects a keyword-`end` as a role's FIRST token — a range endpoint `end` consumed MID-fold by `tryConsumePickRangeOperand` (:1332, accepts keyword `end` by normalized form) is already safe. en `start to end` endpoints are accepted by the arc-1 assembler but were never probed — probe en first, then per-language |
| range-`to` | destination marker in every language (es `a`, ja `に`, ru `в`…) | **DEFERRED to arc 3** (probed dormant — see below) | NEVER via roleMarkers. When arc 3 lands it: per-profile lookup keyed off `this.currentProfile?.code` beside `PICK_RANGE_SEPARATORS` + fold-time English normalization of the folded `raw` (the `pickMapper` `/\s+to\s+/i` split and en render then work unchanged); the gate (pick+patient+two-operand shape) keeps it safe |
| `first` / `last` | registered everywhere (profile for Latin, tokenizer EXTRAS for non-Latin; also `POSITIONAL_KEYWORDS`, `expression-lexicon.ts:252-259`) | reuse | tr `son` / curated-end words: `isCuratedEndKeyword` guard exists — probe tr/qu pick rows specifically |
| `random` | in 22/24 dicts' `expressions` (MISSING he, vi); in EXTRAS for ru (`russian.ts:129`) AND uk (`ukrainian.ts:124`); es/ja/ar do not | promotion: EXTRAS for the ~21 missing langs + dict for he/vi | ru precedent incl. gender/case variants where the lang inflects — nominative forms had to be added or positional queries never formed |
| `match` (singular) / `matches` | `match` absent everywhere; `matches` = comparison operator everywhere | **DEFER** | the en match variant is deferred at RENDER (arc-1 finding: identical role set → `findBestPattern` can't distinguish; needs a match-only role = renderer change). Registering foreign match-vocab before that is solved buys nothing and risks the operator dual. Leave a comment, skip |

Per-language mechanics (CORRECTED 2026-07-20 — the Latin/non-Latin split was wrong):

- **All 24 languages: tokenizer EXTRAS**, `packages/semantic/src/tokenizers/<name>.ts`
  — `{ native, normalized }`, appended to the `const <LANG>_EXTRAS: KeywordEntry[]`
  array. Examples: ja `japanese.ts`, ar `arabic.ts`, es `SPANISH_EXTRAS`
  (`spanish.ts:65`). Positional vocab (`first`/`last`/`random`) already lives here
  in 23/24 tokenizers; only es ALSO carries positional words in its profile
  `keywords` block (the historical outlier — don't extend it, use es EXTRAS).
  Watch per-tokenizer length caps: qu `maxKeywordLen=13` (`extractors/quechua-keyword.ts`),
  tr `=12` (`turkish-keyword.ts`), ko `=6` (`korean-keyword.ts`); id has no cap.
- **i18n dicts** (`packages/i18n/src/dictionaries/<code>.ts`): add the same
  words (likely `expressions` section) — this is what the sync-translations
  fallback and arc-3 render rules will read.
- **vite-plugin `sync-keywords`: NOT needed** — `DETECTION_KEYWORDS`
  (`packages/vite-plugin/scripts/sync-keywords.ts:37-48`) excludes all pick
  nouns; it's language-detection only.
- Translation research: check the i18n dict first (often already has the word
  under another section), follow each profile's verb-form/noun convention, avoid
  hyphens (tokenizers split them — prefer underscores for compounds).

## Dual/context-gate precedents (use these, don't invent)

- **bn `শেষ` (end→last)**: `POSITIONAL_HEAD_DUALS` in
  `packages/semantic/src/parser/utils/expression-lexicon.ts:261-277` — fires
  only before an ANGLE-BRACKET element query; a bare `.`-class was not enough
  (first cut minted a phantom `last .{dragClass}` in behavior-sortable).
- **ja `空` (do-NOT-register lesson)**: `japanese.ts:111-115` — registering a
  dual-sense word as a command keyword minted a phantom command and an
  R0-precision regression; resolution was the render-side gate. **After any
  profile keyword addition, probe ALL hot rows containing that word in that
  language, not just the pick rows** (memory:
  `profile-keyword-additions-phantom-risk`).
- **`AMBIGUOUS_SENSES`** (`expression-lexicon.ts:542-551`, resolver :575-616,
  five context slots): the render-side escape hatch when tokenizer registration
  is unsafe. Registration-free → no phantom risk. Phase 12 cleared 24 pairs with
  it in one mechanism.

## Tests to write

Follow the repo convention (core CLAUDE.md §8): full role-extraction assertions
for priority languages (**en, es, ja, ar, ko**) + `canParse` smoke tests for the
rest. Extend `packages/semantic/test/pick-command.test.ts` or add
`pick-vocab-multilingual.test.ts`. Assert on captured roles and renders — a
non-null parse is not evidence (the arc's founding lesson). Add a
phantom-guard test per gated dual (the bn `শেষ` gate has guard tests in
`semantic/test/expression-lexicon.test.ts` — mirror that shape).

## Probe recipe + verification protocol (inherited, verbatim-critical)

Read foreign source from `patterns.db` — NEVER hand-write it (the `el valor`
lesson). Probe files must live inside a package dir (scratchpad can't resolve
node_modules); delete after:

```ts
import Database from 'better-sqlite3';
import { parseSemantic, render } from '@lokascript/semantic';
const db = new Database('packages/patterns-reference/data/patterns.db', { readonly: true });
const r = db.prepare(
  "SELECT hyperscript FROM pattern_translations WHERE code_example_id=? AND language=?"
).get('pick-text-range', 'es');
render(parseSemantic(r.hyperscript, 'es').node, 'en'); // what the gate validates
```

After each word-batch, before committing:

```bash
npm run build --prefix packages/semantic       # stale dist is SILENTLY green
npm test --prefix packages/semantic -- --run
npm run test:affected                          # domain-toolkit 0-test "failure" = noise;
                                               # testing-framework-only failure = ordering
                                               # artifact → check:fresh + populate, re-run
npm run check:fresh && npm run populate --prefix packages/patterns-reference
npm run test:canonical --prefix packages/testing-framework
npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts   # inspect CLEARED/ADDED
cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# after intentional movement: re-run with --save-baseline
```

Footguns (every one of these bit a prior session):

- `loadCanonicalParser()` **IS** the validate fn — destructuring yields
  undefined. `validate` returns an error array and NEVER throws; check
  `.length === 0`.
- `node.roles` is a `Map` — `JSON.stringify(node)` prints `{}` and hides
  bindings; deMap before trusting a role dump.
- The regen tool REWRITES the baseline every run (2nd run always shows 0/0);
  `git checkout --` it to re-read a diff. Cross-check
  `failing == before − CLEARED + ADDED`.
- Never commit `packages/patterns-reference/data/patterns.db`
  (`git checkout --` it before committing).
- The triage harness is COMMITTED at
  `packages/testing-framework/tools/triage-foreign-residual.ts`
  (`--detail out.json`) — use it, don't rebuild it.
- Rows whose EN raw code is canonical-invalid sit OUTSIDE the gate denominator
  — "invalid but not allowlisted" ≠ red gate.

## Out of scope (arc 3 / follow-ups — do not drift into them)

- i18n per-command pick GrammarRules (`packages/i18n/src/grammar/profiles/index.ts`)
  and paired per-language semantic pick pattern variants → arc 3.
- The SOV row unscrambling and the final allowlist prune 23→0 → arc 3.
- match/matches render collision (needs a match-only role), `..` separator,
  bare `pick random of X`, `at/from` range prefix → deferred follow-ups,
  documented in the arc-1 pattern-leaf header.
- Core runtime execution of new variants via the semantic path → filed follow-up
  (plan doc arc-1 item 5); R2 unaffected (pick is not in `EXECUTION_SUBSET`).

## Governing discipline

This burndown's record is **15 consecutive handoff mis-filings refuted by
probes** — including this handoff's parent plan (arc 1 deviated from "replace
pickSchema" after probing). Every "likely clean" and "absent everywhere" above
was verified by grep on 2026-07-19 but NOT behaviorally probed per-language.
**Probe the claim before you build on it, and probe whether a fix is COMPLETE,
not just aimed at the right file.** Expect at least one word in the table to
fragment into two defects; budget for it. If a probe refutes a disposition
above, update THIS file's table in the same commit — the next session inherits
your corrections, not your intentions.
