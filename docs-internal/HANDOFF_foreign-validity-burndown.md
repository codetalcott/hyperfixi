# Handoff: foreign→English validity burndown (Phase 2 done; Phase 4 onward)

Paste the block below into a fresh session to continue the arc. Everything above the
`---` is orientation for a human; the prompt itself starts after it.

**Arc state:** Phases 1a (#707), 1b + 3 (#711), and **2 (the operator/copula slice)**
shipped. Foreign→English render validity **90.7 % → 95.9 % (2935/3059)**. **124 pairs
across 21 patterns** remain, and **none of them are lexicon-shaped** — the
profile-keyword vocabulary work is finished. Companion scope doc:
`docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md`. Memory:
`foreign-validity-burndown-phase1.md`.

---

MISSION: Continue the foreign→English validity burndown. Authored non-English
LokaScript currently renders canonically-valid English **95.9 % (2935/3059)** of the
time. Phase 2 is DONE. What remains is **four named, independent families** — pick the
one that fits your appetite; they do not depend on each other.

READ FIRST (in order):

1. `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` — the spec, § "Where the
   burndown stands".
2. `packages/testing-framework/baselines/foreign-canonical-validity.json` — the
   committed allowlist (124 pairs / 21 patterns). It ratchets BOTH ways: a pair you
   clear must be pruned, or the gate fails on a stale entry.
3. `packages/semantic/src/parser/utils/expression-lexicon.ts` — the shared expression
   seam. **You probably do NOT need to touch it** (see below).

## What Phase 2 established (do not re-derive)

- **The fix was profile DATA, not a new mechanism.** `surfaceOf`
  (`expression-lexicon.ts:371-372`) emits a token's `normalized` English form **iff it
  lexed as a keyword**; anything else leaks verbatim. So the whole copula/operator gap
  was *missing `profile.keywords` entries*. No slot parameter, no `COPULA_LEXICON`, no
  renderer change. Three PRs, zero logic changes (bar one dead-code removal), 70 pairs:
  `matches` ×13 profiles → 15 pairs, `exists` ×13 → 13, `is` ×10 → 42.
- **A slot parameter would not have worked anyway.** `es` is Spanish `is`
  (`spanish.ts`) but German `it` (`german.ts`). That is a *language* axis, not a slot
  axis; the profile is already the per-language axis.
- **`is`/`exists`/`matches`/`no` are phantom-SAFE**, unlike `empty`. `empty` is both an
  ActionType (`types.ts`) and a command schema (`command-schemas.ts`) — that is why ja
  `空` injected a phantom command (`japanese.ts:108-111`). The operators are neither, so
  no pattern is generated from them. Verify for any new word; don't assume.
- **`CONDITION_COPULAS_SURFACE` (`semantic-parser.ts`) is down to 3 entries** (ar هو /
  th เป็น / hi है) — exactly the three the copula slice could not register, because each
  is ambiguous with another sense. It is no longer a general mechanism.
- **Deliberate exclusions, each ambiguous with another sense** (all cost real pairs; all
  are the honest call): ar هو=`it`, hi है=`has/have`, th เป็น=`as` (copula); bn আছে=`has`,
  tl `may`/tr `var`=`has/have` (exists). ar is *structurally* impossible regardless:
  `profile.references` is registered AFTER `keywords` (`base-tokenizer.ts`), so an ar
  `is` entry is silently overwritten.
- ja `である` does **NOT** split, contrary to an earlier claim. It is registered and clears.
- **The ratchet's tolerances can hide a small regression.** `avgFidelity` tolerance 0.02
  averaged over ~133 patterns cannot see one pattern dropping to fid 0.75 (0.25/133 ≈
  0.002), and the lossy-flip counter has tolerance 3. When a change has a *named*
  single-pattern hazard, probe that pattern directly. (Phase 2 did: the copula slice
  removed ja/bn's escape from the ko-class "guard swallows the then-branch verb" bug.)

## The four remaining families (none is lexicon-shaped)

1. **`no` — `behavior-draggable` (20).** The last operator. Same profile-data mechanism
   as Phase 2. Guard: exclude hi नहीं (=`not`), zh 没有 / tl `walang` (=`without`).
   es `not:'no'` is a NON-issue (the map is `ningún→no`; es `no` is never a key). Dead
   on arrival for id `tidak_ada`, qu `mana_kanchu` (tokenizer splits `_`) and ar `لا يوجد`
   (two tokens). Realistic yield ~13.
2. **Condition locative — `focus-trap` (19).** The **only code change** left, and the
   one place the seam matters. `ru` has `matches` coverage yet still fails because `в`
   leaks verbatim and `de`'s `in` emits the ROLE NAME `destination`. Cause is NOT the
   third seam at `pattern-matcher.ts:1146` (that one is correct) — a *condition* never
   reaches `tryMatchPositionalExpression`; `tryParseConditionalBlock` joins raw tokens
   via `joinTokenText` → `joinExpressionTokens`, which has no locative handling. Fix:
   extract the positional-run recognizer (`pattern-matcher.ts:1075-1152`) into a shared
   helper and call it from `joinExpressionTokens`. Note `surfaceOf` has TWO failure
   modes, not one: verbatim leak AND role-name leak.
3. **`references` profile/dict DRIFT — 16 entries across 8 languages (NEW, see below).**
4. **Structural / per-language parse gaps** (~40): `swap-content` ar `بـ#b` fusion,
   `beep-debug-expression`, bn scrambles, the sparse rows.

**LEAVE DEFERRED: `pick-text-range` (23).** See the spike verdict below — it is NOT
"one fix for 24 pairs".

## NEW: the `references` profile/dict drift family

`profile.references` has drifted from what the i18n dicts actually emit, in 16 entries
across 8 languages. The corpus is authored FROM the dicts, so a drifted entry means the
parser cannot recognize the word real translations use, and it leaks:

| lang | drifted |
| --- | --- |
| ar | result النتيجة/نتيجة · event الحدث/حدث · target الهدف/هدف |
| de | result · event · target · body — all pure capitalization (`Ziel`/`ziel`) |
| ja | me 自分/私 · target ターゲット/対象 |
| qu | result rurasqa/lluqsiy · event ruwakuq/ruway |
| es | you tú/tu · fr it il/ça, you toi/tu · id you anda/kamu · pt it ele/isso |

This is what blocks `modal-close-backdrop` ar/ja (the last 2), and it is why the
`matches` slice EXCLUDED ar/ja: adding `matches` there parses the condition but its
operand still leaks (`if هدف matches …`), which turned two rows that passed R2 **only by
accident** — the unparsed condition was dropped, so `hide` ran unconditionally and
happened to match the reference DOM effect — into genuinely broken ones. The R2
execution ratchet caught it. **This is the cautionary tale of the arc: fixing an
operator without its operand can be worse than fixing neither.**

Why it is not a trivial data fix, and why Phase 2 did not do it:

- `references` is a flat `Record<string,string>` (`profiles/types.ts`) with **no
  `alternatives`**, so you cannot support both surfaces without a type change (+
  `base-tokenizer.ts:501-514`). That is a CODE change.
- Lookup is **case-sensitive** (`base-tokenizer.ts:633-634`), which is the whole of de's
  drift — and German capitalizes nouns, so the profile's `Ziel` is *correct German* and
  the **dict** is arguably the wrong side to fix.
- Precedent exists for aligning the profile to the dict: `arabic.ts:31`
  `body: 'جسم', // matches the i18n dict's emitted body word (corpus-canonical, parser
  must recognize it)`.
- Beware: a leaked operand can render as a *syntactically valid identifier*, so the
  validity gate passes while the meaning is wrong (de/fr/pt `if-exists` do this today —
  they cleared while still leaking `körper`/`ça`/`isso`). Only R2 sees this class.

## SPIKE VERDICT: `pick-text-range` — keep deferred, and the docs' reason was wrong

The old framing ("a named R1 deferral: pick range-role modeling", "one en-side fix
clears 23 foreign + 1 en") is **wrong on both counts**. It is not one fix, and it is not
range-roles. It is four coupled efforts:

1. **The schema models the wrong command.** `pickSchema` (`command-schemas.ts:2598`) is
   *"Select a random element from a collection"* with roles patient/source
   (`pick <item1>, <item2>` / `pick from <array>`). Canonical hyperscript's `pick`
   (`hyperscript.org@0.9.93`, `dist/_hyperscript.js:5979-6090`) is a different command
   with **6 variants** (`first`/`last`/`random`/`item(s)`/`character(s)`/`match(es)`),
   each with its own arg shape, plus a range sub-grammar
   `[at|from] (start|<expr>) [to (end|<expr>)] [inclusive|exclusive]`.
2. **The vocabulary does not exist in ANY language.** No dict defines `characters`,
   `items`, `random`, `start`, `end`, `inclusive`, or `exclusive`. The corpus proves it:
   all 23 translations leave `characters` in **literal English**.
3. **The corpus rows are themselves broken.** The range `to` was translated as a
   DESTINATION marker (es `0 a 5`, it `0 in 5`, vi `0 vào 5`, th `0 ใน 5`, ru `0 в 5`),
   and the SOV rows are scrambled (ja `characters 0 を クリック で 選択 5 の #note に`,
   qu, tr, bn, hi, ko). Re-authoring them couples to the fidelity baseline
   (memory: `corpus-rewrites-couple-to-fidelity`).
4. **R1 would move** — the roles change shape.

So the en fix alone clears **1** pair (the en allowlist entry), not 24; the 23 foreign
pairs additionally need (2) and (3). Budget it as ~3 arcs, not one PR. It remains the
sole entry in `baselines/canonical-validity.json`.

## Also true (verified, corrects the record)

- The residual is **21 patterns**, never 19 (the old handoff and scope doc both said 19).
- The sibling **en-render burndown is DONE** — `canonical-validity.json` holds exactly
  **1** entry (`pick-text-range`), not the 22 that `HANDOFF_render-validity-burndown.md`
  described. That doc is deleted; its two still-live follow-ups are preserved below.
- **Context globals are NOT "zero reverse coverage".** `body` is **24/24** via
  `profile.references`; `window` is 1 (qu `k_iri`); only `document` is truly 0. And
  `document`/`window` is worth ~1 pair standalone — it is the LAST slice by value, not a
  cheap first win. If you do it, use `references` (values, not verbs → phantom-safe).
- `repeat-until-event` fr/it/zh/pl is **NOT** a real family — it was stale-dist/stale-DB
  noise. A freshly populated DB reproduces the committed baseline exactly.
- `marker-templates.ts` is dead code (zero importers) despite `semantic/CLAUDE.md`.

## Preserved follow-ups (from the now-deleted render-validity handoff)

- **Fold validity in as an R4 signal** on the ratchet CLI (`--regression`), so validity
  is first-class alongside R0–R3.
- **Bake the parse-check into the build-time `@hyperscript-tools/i18n` transpiler**
  (roadmap §5).

## Probe recipe

Read translations from `patterns.db` (populate first) — never hand-write foreign source
(a hand-written `el valor` once suggested `the`→`el` needed translating; the real corpus
keeps `the` in English):

```ts
import Database from 'better-sqlite3';
import { parseSemantic, render } from '@lokascript/semantic';
const db = new Database('packages/patterns-reference/data/patterns.db', { readonly: true });
const r = db.prepare(
  "SELECT hyperscript FROM pattern_translations WHERE code_example_id=? AND language=?"
).get('focus-trap', 'ru');
render(parseSemantic(r.hyperscript, 'ru').node, 'en'); // what the gate validates
```

The probe file MUST live inside a package dir (e.g. `packages/testing-framework/`) — a
scratchpad outside the workspace cannot resolve `node_modules`. Delete it after.

## VERIFICATION PROTOCOL — run after EACH fix, before committing

- Rebuild: `npm run build --prefix packages/semantic`. **`dist/` staleness is silent** —
  a green run against a stale dist is vacuously green.
- `npm run test:affected` — a semantic change fans out to ~33 consumers incl.
  `hyperscript-adapter` (its own `preprocessToEnglish` + renderer). **`domain-toolkit`
  "fails" because it has 0 test files — pre-existing, ignore it.**
- `npm run populate --prefix packages/patterns-reference` then
  `npm run test:canonical --prefix packages/testing-framework` (both gates; sets
  `FOREIGN_CANONICAL_VALIDITY=1`). The foreign gate reads authored translations from
  `patterns.db`, which the committed copy LAGS — you MUST populate first.
- Prune: `npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts`.
  **Confirm ADDED is 0.** It REWRITES the baseline every run, so a 2nd run always shows
  0/0; `git checkout --` it first to re-read a diff. Cross-check `failing == before −
  CLEARED + ADDED`.
- Fidelity ratchet: `cd packages/testing-framework && npx tsx src/multilingual/cli.ts
  --full --bundle browser-priority --regression`. **Re-populate AFTER any semantic
  rebuild** or it refuses with a provenance-stamp error (working as designed). Mind the
  tolerance blind spot above.
- The **en-render gate must stay green** (en is the target).

## Footguns

- **Never commit `packages/patterns-reference/data/patterns.db`** — `git checkout --` it.
- **Exit-code masking is real.** `cmd > log; echo $?; grep …` reports the GREP's status.
  Read the explicit `EXIT=` line, not the harness's summary.
- The foreign gate throwing `Unknown token: <char>` IS the signal, not a harness bug.
- **zsh does not word-split** `$vars` — `for p in $pkgs` iterates once. Use literal lists.
- Do NOT open a docs-only PR — fold docs into the code PR.
- Ship one root cause per small PR, each gate-guarded.
