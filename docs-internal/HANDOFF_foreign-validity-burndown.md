# Handoff: foreign→English validity burndown (Phase 4 done; the vocabulary + seam work is finished)

Paste the block below into a fresh session to continue the arc. Everything above the
`---` is orientation for a human; the prompt itself starts after it.

**Arc state:** Phases 1a (#707), 1b + 3 (#711), **2 (the operator/copula slice, #718)**,
and **4 (`no` + `references` drift + the condition locative)** shipped. Foreign→English
render validity **90.7 % → 96.9 % (2965/3059)**. **94 pairs across 20 patterns** remain.
Companion scope doc: `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md`. Memory:
`foreign-validity-burndown-phase1.md`.

**What is LEFT is qualitatively different from everything above.** Phase 4 spent the last
of the cheap levers: there is no vocabulary family and no seam gap remaining. The residual
is `pick-text-range` (23, deferred — a ~3-arc rewrite, see the spike verdict below) and
~71 pairs of per-language STRUCTURAL parse damage, which is per-row work with no shared
root cause. Do not expect another 30-pair PR.

---

MISSION: Continue the foreign→English validity burndown. Authored non-English
LokaScript currently renders canonically-valid English **96.9 % (2965/3059)** of the
time. Phases 2 and 4 are DONE — **the profile/lexicon vocabulary work and the expression
seam work are both finished**. What remains is the structural family (§ "What is left").

READ FIRST (in order):

1. `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` — the spec, § "Where the
   burndown stands".
2. `packages/testing-framework/baselines/foreign-canonical-validity.json` — the
   committed allowlist (94 pairs / 20 patterns). It ratchets BOTH ways: a pair you
   clear must be pruned, or the gate fails on a stale entry.
3. `packages/semantic/src/parser/utils/expression-lexicon.ts` — the shared expression
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

## What is left (94 pairs) — no cheap levers remain

1. **`pick-text-range` (23) — LEAVE DEFERRED.** See the spike verdict below; it is NOT
   "one fix for 24 pairs". Budget ~3 arcs.
2. **Structural / per-language parse damage (~71).** No shared root cause — this is
   per-row work. Known shapes, each verified by probe:
   - `focus-trap` ar/tl — the locative now renders `in`, but a stray `من .modal` /
     `source .modal` survives and `[key=="Tab"]` is displaced past the condition.
   - `focus-trap` bn — positional `শেষ` normalizes to `end` (the block terminator), so the
     run's head gate correctly declines and `এ` leaks. A dict/tokenizer realign.
   - `form-submit-prevent` ar — `نتيجة` now renders `result`, but the copula `هو` surfaces
     as `it`: **`profile.references` is registered AFTER `keywords`**
     (`base-tokenizer.ts:502` vs `:482`), so an ar `is` entry is silently overwritten.
     This is a registration-ORDER fix, not vocabulary — plausibly the last mechanical win.
   - `swap-content` ar `بـ#b` fusion · `beep-debug-expression` · bn scrambles · sparse rows.
3. **`document`/`window` context globals (~1).** `body` is already 24/24 via
   `profile.references`; `window` is 1 (qu `k_iri`); only `document` is truly 0. The LAST
   slice by value, not a cheap first win. If you do it, use `references` (values, not
   verbs → phantom-safe).

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
- **The MCP server is NOT a valid probe channel mid-arc.** `.mcp.json` runs
  `mcp-server/dist/index.js`, which does not bundle semantic — it resolves the workspace
  symlink to `packages/semantic/dist/` **at startup** and node caches the module, so every
  semantic rebuild leaves MCP serving pre-change code until the server restarts. Its
  `LSP_DB_PATH` also points at the committed (lagging) `patterns.db`, and `populate`
  replaces that file under the open handle. Use the `tsx` probe recipe above.
- Do NOT open a docs-only PR — fold docs into the code PR.
- Ship one root cause per small PR, each gate-guarded.
