# Handoff: foreign→English validity burndown (Phase 5 — the residual is TRIAGED)

Paste the block below into a fresh session to continue the arc. Everything above the
`---` is orientation for a human; the prompt itself starts after it.

**Arc state:** Phases 1a (#707), 1b + 3 (#711), **2 (the operator/copula slice, #718)**,
and **4 (`no` + `references` drift + the condition locative, #719)** shipped. Foreign→English
render validity **90.7 % → 96.9 % (2965/3059)**. **94 pairs across 20 patterns** remain.
Companion scope doc: `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md`. Memory:
`foreign-validity-burndown-phase1.md`.

> **CORRECTION — this doc claimed, one commit ago, that "the vocabulary work is finished"
> and that `document`/`window` was "worth ~1 pair … the LAST slice by value, not a cheap
> first win". A post-merge triage of all 94 residual pairs proves BOTH false.**
> `document` is registered in **zero** profiles while the i18n dicts emit it in 9+
> languages, so it leaks in **14 pairs**; `window` adds **3** — together **17 pairs, the
> single biggest actionable family left**. The "~1 pair" figure was inherited from an
> earlier handoff and restated without probing by two successive sessions, the second of
> which wrote "probe the claim before you plan around it" in this very file. The residual
> is **not** mostly structural: only 23 of the 94 have no leak at all.
>
> **And the first fix I reached for was also wrong** — registering the reference is
> necessary but changes nothing on its own (spiked and reverted; see § "What is left" § 1).
> The real defect is that `repeat`'s `source` role captures the raw surface while `put`'s
> `destination` captures the normalized English, in the same tree. The lesson keeps
> reasserting itself at one level deeper than you expect: **probe the fix, not just the
> claim.**

---

MISSION: Phase 5 of the foreign→English validity burndown. Authored non-English LokaScript
currently renders canonically-valid English **96.9 % (2965/3059)**; **94 pairs across 20
patterns** remain. Phases 2 and 4 are DONE. **The residual is fully triaged** — the table
in § "What is left" was produced by rendering all 94 pairs and clustering them by the
canonical parser's actual complaint, so it is measured, not estimated.

**Your first slice is decided: `document` + `window` — 17 pairs.** It is the biggest
actionable family. It needs `profile.references` entries **plus a role-capture fix**; the
data alone is proven insufficient (spiked and reverted — § "What is left" § 1 has the
evidence and names the fix site). Expected: 94 → ~77, 96.9 % → ~97.4 %. Then reassess
against the table; next-best are `beep!` (5, a real bug) and the `as` connective (3).
**Do not start with `pick-text-range` (23)** — the spike verdict below explains why it is
~3 arcs, not one PR.

**THE ARC'S GOVERNING LESSON, which this doc has itself violated three times: PROBE THE
CLAIM BEFORE YOU PLAN AROUND IT.** Every phase found a load-bearing falsehood in its own
handoff — a "case-sensitive" lookup that lowercases, a cautionary example that does not
reproduce, three "dead on arrival" languages that all worked, a defect count 5× too high,
and now a 17-pair family recorded as "~1 pair, the LAST slice by value" for four phases.
Each was one probe away from being caught. **Including the claims in this paragraph.**

READ FIRST (in order):

1. § "What is left" below — the triage. It supersedes every earlier prose estimate.
2. `packages/testing-framework/baselines/foreign-canonical-validity.json` — the
   committed allowlist (94 pairs / 20 patterns). It ratchets BOTH ways: a pair you
   clear must be pruned, or the gate fails on a stale entry.
3. `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` — the spec, § "Where the
   burndown stands".
4. `packages/semantic/src/parser/utils/expression-lexicon.ts` — the shared expression
   seam. Phase 4 closed its last call-site gap; **it is unlikely you need to touch it.**

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

## What Phase 4 shipped (three PRs, 30 pairs, 124 → 94)

All three are DONE. Recorded here because each corrected something this doc asserted —
**the doc's own claims were the least reliable input to the arc.** Every correction below
was verified against the AUTHORED corpus rows, not reasoned from the code.

**1. `no` — `behavior-draggable` 20 → 9 (11 pairs).** Pure profile data, Phase 2's shape.
Registered in 16 languages.

- **The "dead on arrival" call was wrong for all three.** id `tidak_ada` and qu
  `mana_kanchu` clear via a whole-token tokenizer EXTRAS entry (the `ubah_ukuran` /
  `hatun_kay` precedent — the keyword walk sorts longest-first, so the compound beats the
  `_` split); ar `لا يوجد` clears via the base tokenizer's multi-word keyword walk (the hi
  `मेل खाता` precedent). **id and qu cleared the gate outright.** The lesson: "the
  tokenizer splits it" is not a reason to give up — check for a whole-token precedent.
- **The ja `ない` hazard is real in principle but does not fire.** `ない` has blast radius 3
  and the dict's `not` (`ではない`) is unregistered, so the particle extractor peels で/は and
  can land on a bare `ない`. Probed: `unless-condition` (protected by `ない限り`, longest-first)
  and `fetch-do-not-throw` both render byte-identically before and after.
- **bn is not lexical.** Its dict has no `no`, so its row already carries literal English
  `no` and renders it correctly; it fails structurally. The ceiling was 19, not 20.
- The hi/zh/tl exclusions stand, but the reason is **dict-level**, not a profile
  collision: those profiles never register the surface — the DICT maps two senses to one
  (`hi not:'नहीं'` AND `no:'नहीं'`), so registering it as `no` would mistranslate every
  `not`/`without` in those corpora. es `not:'no'` was a non-issue as written.

**2. `references` drift — `modal-close-backdrop` 2 → 0, `focus-trap` ja (3 pairs).** Three
tokenizer EXTRAS lines + `matches` for ar/ja. **Both reasons this doc gave for deferring it
as a CODE change are FALSE:**

- **The lookup is NOT case-sensitive.** `lookupKeyword`/`isKeyword` both `.toLowerCase()`
  (`packages/framework/src/core/tokenization/base-tokenizer.ts` — note this doc pointed at
  a path that does not exist; `packages/semantic/src/parser/base-tokenizer.ts` is a
  re-export). The cited `:633-634` is a COMMENT inside `tryMultiWordKeyword`, which only
  handles space-containing keywords and which German never reaches. **The whole de
  sub-family was a non-issue** — de renders `body`/`target` correctly today.
- **No type change was needed.** The per-language `*_EXTRAS` array already supports
  alternates and overrides profile entries (precedent: `japanese.ts` `私`→me).
- **The stated cautionary example does not exist.** de/fr/pt `if-exists` do NOT "clear
  while still leaking `körper`/`ça`/`isso`" — probed against the authored rows, all three
  render byte-identically to en (`körper` via the case-insensitive lookup, `ça`/`isso` via
  existing EXTRAS).
- Of the 16 "drifted" entries only **3 actually leak** (ar `نتيجة`/`هدف`, ja `対象`); the
  rest are absorbed by the case-insensitive lookup, EXTRAS, `possessive.keywords`, or a
  profile keyword. 16 was right as a text-diff and ~5× too high as a defect count.

**The operand+operator coupling was REAL, and is the arc's one durable lesson.** The
condition is captured as a raw string; ar/ja's *unparsed* condition was silently dropped,
so `hide` ran unconditionally and coincidentally matched the en DOM effect —
`modal-close-backdrop` ar/ja passed R2 **by accident**. `matches` alone would parse the
condition into a real comparison whose operand evaluates to undefined, stopping `hide` and
flipping R2 pass→fail at tolerance 0. Both together render byte-identical to en. Only R2
can see this class.

**3. Condition locative — `focus-trap` 19 → 3 (16 pairs, incl. a `last-in-collection tr`
bonus).** The diagnosis in this doc was RIGHT; two details were not.

- **`surfaceOf` has THREE failure modes, not two:** verbatim leak, role-name leak, and
  wrong-sense-normalized leak (bn `শেষ`→`end`, out of scope — a dict realign).
- **The prescription omitted anchor ORDER, which is load-bearing.** The new anchor must sit
  AFTER the of-possessive anchor so it can only claim runs the earlier anchors declined
  (provably additive). Positional-first would flip `<positional> <sel> <of-marker> <sel>`
  away from `<sel> of <sel>`, and for a marker absent from `LOCATIVE_SURFACES` (zh `的`,
  ja `の`) `toEnglishLocative` falls through to the VERBATIM surface — worse than the leak.
- No data was added: `toEnglishLocative` / `LOCATIVE_SURFACES` /
  `ROLE_CONCEPT_TO_ENGLISH_LOCATIVE` already covered both classes. It was purely a
  call-site gap. `matchPositionalRun` now serves both seams.
- The run returns `{text, token}` pairs, not strings: the two callers join differently
  (role seam = plain space; the raw join needs SOURCE POSITION for `.`-glue). Bare strings
  would silently render `previous <input/> .value` inside conditions.

## What is left (94 pairs) — MEASURED, not estimated

Produced by rendering all 94 allowlisted pairs and clustering by the canonical parser's
actual complaint. **Reproduce it before trusting it** (recipe at the end of this section).

| # | Family | Kind | Where |
| --- | --- | --- | --- |
| **14** | **`document` reference leak** | **data** | `behavior-draggable` ar/ja/ko/ru/tl/uk/zh · `behavior-sortable` ar/id/ja/ko/ru/uk/zh |
| 23 | `pick-text-range` | deferred, ~3 arcs | all but en |
| 23 | structural (no leak) | per-row | see list below |
| 5 | hi `है` (=has/have) | blocked | `behavior-removable`, `behavior-sortable`, `form-submit-prevent`, `if-empty`, `input-validation` |
| 5 | th `เป็น` (=as/is) | blocked | same five patterns |
| 5 | `beep!` possessive glue+leak | bug | `beep-debug-expression` bn/hi/ja/ko/tr |
| **3** | **`window` reference leak** | **data** | `modal-close-escape` uk · `window-keydown` ar · `window-resize` th |
| 3 | `as` connective leak | data-ish | `computed-value` hi/th/zh |
| 2 | ja `空` (=empty) | phantom-blocked | `if-empty`, `input-validation` |
| 2 | bn `অথবা` | ? | `behavior-draggable`, `behavior-sortable` |
| 2 | bn `এ` (locative) | dict realign | `focus-trap`, `last-in-collection` |
| 7 | singles | various | hi `नहीं`, ko `정`, bn `এর`/`আছে`, ar `من`, zh `执行`, hi `बदलने` |

### 1. START HERE — `document` + `window` (17 pairs) — data PLUS a role-capture fix

The single biggest actionable family. **It is NOT "pure data" — I spiked that and it does
not work.** Read this whole section before starting; the spike is done, the answer is below.

**The leak (measured):** `document` leaks in 14 pairs, `window` in 3. In `behavior-draggable`
/ `behavior-sortable` it is ONE line inside a 20-line behavior body —
`repeat until event pointerup from ドキュメント` — which is why four phases of prose
inspection missed it.

**Step 1 — register the references (necessary, NOT sufficient).** `document` is registered
in **zero** profiles (`grep -l "document:" packages/semantic/src/generators/profiles/*.ts`
→ nothing), yet the dicts emit it: ja `ドキュメント` · ru `документ` · ko `문서` · zh `文档` ·
ar `وثيقة` · uk `документ` · tl `dokumento` · id `dokumen` · pl `dokument`. Same for
`window`: ja `ウィンドウ` · ru `окно` · ko `창` · zh `窗口` · ar `نافذة` · uk `вікно` ·
pl `okno` · tl `bintana` · id `jendela`. Add them to `profile.references` beside the
existing `body:` entry (`japanese.ts` `ボディ`, `russian.ts` `тело`). Phantom-safe:
references are VALUES, not verbs, so no pattern is generated from them.

**This alone changes NOTHING observable** — verified. After adding ja `document`, the token
lexes correctly (`tokenize('ドキュメント')` → `{kind:'keyword', normalized:'document'}`,
identical to `ボディ`→`body`) and the row **still** renders `from ドキュメント` and still fails.

**Step 2 — the actual bug: the role captures the SURFACE, not the normalized form.** Same
parse tree, two roles, two behaviours:

| pattern | role | captured value | outcome |
| --- | --- | --- | --- |
| `if-exists` ja `put it into ボディ` | `roles.destination.value` | **`"body"`** ← normalized | **passes** |
| `behavior-draggable` ja `… from ドキュメント` | `roles.source.value` | **`"ドキュメント"`** ← raw | leaks |

Both tokens lex identically, so the divergence is in role capture — `put.destination`
normalizes a reference, `repeat.source` does not. **That is the fix site.** Start at
`matchRoleToken` (`pattern-matcher.ts:463`) and compare the two roles' `expectedTypes` in
`command-schemas.ts`; the working case suggests a reference-typed role normalizes while a
literal-typed one keeps the surface. `PROPERTY_ACCESS_BASES` (`pattern-matcher.ts:1011`)
already lists `body`/`window`/`document`, so it is NOT that list.

**Also verified:** the isolated line `まで イベント pointerup を 繰り返し ドキュメント から`
parses via `repeat-ja-until-head` and reports `left 2 token(s) unconsumed: "ドキュメント から"`
— so the ja repeat pattern may lack the `from <source>` slot entirely, and the full-body
render attaches it through a fallback. Establish which path actually captures it before
choosing a fix.

**Guards:** th has NO `document`/`window` dict entry, so `window-resize` th is a different
bug (renders `on ป take ขนาด` — genuinely mangled). Do not force it. qu `k_iri` already
exists as a tokenizer EXTRA — that lone entry is the origin of the bogus "window is 1".

### 2. The `as` connective (3) — `computed-value` hi/th/zh

Each fails differently; all three are lexicon-shaped:

- zh `作为` → renders **`作 for Number`**: the compound split, `为` matched `for`.
- hi `के_रूप_में` → renders **`के _ रूप _ में`**: the underscore-joined dict word shattered.
  **This is already a named residual** in the scope doc ("hi `के_रूप_में` never matches").
  The `ubah_ukuran`/`mana_kanchu` whole-token EXTRAS precedent (Phase 4 PR1) is the fix.
- th `เป็น` → the deliberate copula exclusion (it is BOTH `as` and `is`). Slot-ambiguous;
  the `as` slot may be disambiguable where the copula was not — probe before assuming.

### 3. `beep!` possessive glue+leak (5) — a real bug, not vocabulary

`beep-debug-expression` renders **`beep!私の値`** (ja), **`beep!내값`** (ko),
**`beep!আমারমান`** (bn), **`beep!benimdeğer`** (tr) — the possessive is neither translated
NOR spaced. Two defects stacked: the `beep!` prefix seems to swallow the following run so
the possessive anchor never fires, and the join loses its spaces. en renders
`beep! my value`. Start from `joinExpressionTokens`'s possessive anchor and ask why
`beep!` suppresses it.

### 4. Deliberately blocked (12) — do NOT "fix" without reading why

- hi `है` (5) and th `เป็น` (5) are the copula slice's **named ambiguous exclusions**
  (`है`=has/have, `เป็น`=as). Registering either mistranslates every `has`/`as` in those
  corpora. Only a slot-aware disambiguation helps, and Phase 2 established the slot axis
  is the WRONG axis (`es` is Spanish `is` but German `it`). Treat as genuinely hard.
- ja `空` (2) is the **phantom-injection word** (`japanese.ts:108-111`): `empty` is both an
  ActionType and a command schema, so registering `空` injects a phantom command. This is
  the one place the "register the surface" reflex is actively wrong.

### 5. Structural, no leak (23) — per-row, no shared root cause

`behavior-removable` ar/id/qu · `behavior-sortable` qu · `computed-value` id ·
`fetch-error-handling` qu · `focus-trap` tl · `form-submit-prevent` ar · `if-empty` ar/id ·
`if-exists` tl/tr · `input-validation` ar/id · `modal-close-escape` pl · `swap-content`
ar/bn/hi/qu/tl/tr · `two-way-binding` id · `window-keydown` tl

Known shapes: `focus-trap` ar/tl (stray `من .modal`/`source .modal`, displaced
`[key=="Tab"]`) · `swap-content` ar `بـ#b` fusion · id `saya punya nilai` → `my punya nilai`
(the possessive head translated, the rest left) · `form-submit-prevent` ar, blocked by the
**registration ORDER** (`profile.references` registers AFTER `keywords`,
`base-tokenizer.ts:502` vs `:482`, so an ar `is` entry is silently overwritten — a code
change, plausibly the last mechanical win).

### Reproduce the triage

The gate hides exactly what you need: `checkForeignRenderValidity` assigns
`rendered = '(threw)'` in its catch, so when `validate()` throws — which is 46 of the 94 —
**the render that caused it is discarded**. Render and validate SEPARATELY:

```ts
// packages/testing-framework/triage.ts — delete after
import Database from 'better-sqlite3';
import { parseSemantic, render } from '@lokascript/semantic';
import { loadCanonicalParser } from './src/multilingual/canonical-validity';
const validate = await loadCanonicalParser();
const db = new Database('../../packages/patterns-reference/data/patterns.db', { readonly: true });
const src = (db.prepare(
  'SELECT hyperscript FROM pattern_translations WHERE code_example_id=? AND language=?'
).get('behavior-draggable', 'ja') as any).hyperscript;
const rendered = render(parseSemantic(src, 'ja').node!, 'en');
console.log(rendered);                       // ← keep this OUT of the try that validates
try { console.log(validate(rendered)); } catch (e) { console.log('LEAK:', e.message); }
```

Grep the render for non-ASCII to find the leak — in a 20-line behavior body the bad token
is one word on one line, and the parser only reports a single CHARACTER.

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

- The residual is **20 patterns / 94 pairs** after Phase 4 (`modal-close-backdrop` left
  the allowlist entirely). It was 21 patterns before, and never the 19 the pre-Phase-2
  handoff and the scope doc both claimed.
- The sibling **en-render burndown is DONE** — `canonical-validity.json` holds exactly
  **1** entry (`pick-text-range`), not the 22 that `HANDOFF_render-validity-burndown.md`
  described. That doc is deleted; its two still-live follow-ups are preserved below.
- `repeat-until-event` fr/it/zh/pl is **NOT** a real family — it was stale-dist/stale-DB
  noise. A freshly populated DB reproduces the committed baseline exactly.
- `marker-templates.ts` is dead code (zero importers) despite `semantic/CLAUDE.md`.
- **This doc has been the arc's least reliable input.** Phase 4 found a false premise in
  every family it touched (a "case-sensitive" lookup that lowercases; a cautionary example
  that does not reproduce; three "dead on arrival" languages that all work; a defect count
  ~5× too high). All were cheap to disprove with one probe against the authored corpus.
  **Probe the claim before you plan around it** — including the claims above.

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
  **If `testing-framework` ALSO fails, it is almost certainly an ordering artifact, not
  your change:** `test:affected`'s `ensure-fresh` hook rebuilds a stale dep mid-run, which
  invalidates the `patterns.db` provenance stamp under the canonical gate. Run
  `npm run check:fresh && npm run populate --prefix packages/patterns-reference` FIRST,
  then re-run. (Bit Phase 4 once; a direct `npm test --prefix packages/testing-framework`
  passed while `test:affected` failed.)
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
  **But `git checkout --` on it reverts to the STALE committed copy**, so the next gate run
  fails for a reason that is not your change. Re-`populate` before any further gate/probe
  work. (Bit Phase 4: a green gate went red purely from the cleanup step.)
- **`regen-foreign-baseline.ts` reformats the JSON** (explodes single-line arrays), which
  buries your real diff in churn. Run `npx prettier --write` on the baseline afterwards.
- **Exit-code masking is real.** `cmd > log; echo $?; grep …` reports the GREP's status.
  Read the explicit `EXIT=` line, not the harness's summary.
- The foreign gate throwing `Unknown token: <char>` IS the signal, not a harness bug.
- **zsh does not word-split** `$vars` — `for p in $pkgs` iterates once. Use literal lists.
- **The MCP server is NOT a valid probe channel mid-arc** — but it now TELLS you instead of
  lying. `.mcp.json` runs `mcp-server/dist/index.js`, which does not bundle semantic: it
  resolves the workspace symlink to `packages/semantic/dist/` **at startup** and node caches
  the module graph, so every rebuild leaves it serving pre-change code. Since the freshness
  guard (`packages/mcp-server/src/freshness.ts`) landed, a tool call after a rebuild returns
  an `isError` refusal naming the rebuilt packages and telling you to restart the server,
  rather than answering from stale code. **A refusal there is the guard working, not a
  bug** — restart the server (`/mcp` → reconnect). The `patterns.db` half self-heals: the
  connection reopens when `populate` replaces the file. Still prefer the `tsx` probe recipe
  above mid-arc; it imports fresh each run and needs no restart.
- Do NOT open a docs-only PR — fold docs into the code PR.
- Ship one root cause per small PR, each gate-guarded.
