# Handoff: foreign→English validity burndown (Phase 2 onward)

Paste the block below into a fresh session to continue the arc. Everything above the
`---` is orientation for a human; the prompt itself starts after it.

**Arc state:** Phases 1a (PR #707), **1b + 3** shipped. Foreign→English render validity
**90.7 % → 93.7 % (2865/3059)**. **194 pairs across 19 patterns** remain, and they are
now overwhelmingly ONE family: **the copula `is` and its operator siblings — Phase 2**.
Companion scope doc: `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md`.
Memory: `foreign-validity-burndown-phase1.md`.

---

MISSION: Continue the foreign→English validity burndown. Authored non-English
LokaScript currently renders canonically-valid English **93.7 % (2865/3059)** of the
time. The property/pronoun/connective families are done; **Phase 2 (operators + copula)
is now the whole remaining burndown** — worth roughly 130 of the 194 residual pairs.

READ FIRST (in order):

1. `docs-internal/EXPRESSION_INTERNAL_TRANSLATION_SCOPE.md` — the spec. Read the two
   sections added by 1b/3: **"Where the burndown stands"** and **"Corrected Phase 2
   taxonomy"**. The latter assigns the 49 pairs the original phasing left unassigned
   and names three families the Phase 2 list omitted.
2. `packages/semantic/src/parser/utils/expression-lexicon.ts` — the shared expression
   seam: `joinExpressionTokens` (used by BOTH raw-expression joins), the lexicons, and
   the anchoring rules. **Extend this**, don't build a new one.
3. `packages/testing-framework/src/multilingual/foreign-canonical-validity.ts` + its
   `.test.ts` — the gate you're burning down.
4. `packages/testing-framework/baselines/foreign-canonical-validity.json` — the
   committed allowlist (194 pairs / 19 patterns). It ratchets BOTH ways: a pair you
   clear must be pruned, or the gate fails on a stale entry.

## What 1a/1b/3 established (do not re-derive)

- **The lexicon lives in `packages/semantic`, NOT `packages/i18n`.** Semantic is
  UPSTREAM of i18n in the build order, so it cannot import the i18n dictionaries at
  runtime. Surfaces are copied across by a committed generator:
  `packages/i18n/scripts/extract-property-lexicon.ts` — now emits THREE literals
  (property names, connectives, locative surfaces). Re-run + paste to add vocabulary.
- **There were two raw-expression joins, not one** (the old handoff named only
  `joinTokenText`). Both now route through `joinExpressionTokens`. If you add
  vocabulary, add it there and both seams get it.
- **Reuse the profiles' own tables.** English's `possessive.specialForms` already maps
  `me`→`my`; `getEnglishPossessiveAdjective` reads it. Don't hard-code a fourth copy
  (`renderer.ts` already holds a third, missing `you`).
- **Translation must be ANCHORED.** A raw expression has none of the slot guarantees
  the possessive matchers had. The cautionary tale: ms `ia` / qu `chay` are BOTH the
  possessive (`its`) and the bare reference (`it`), so translating a possessive surface
  on sight rewrote `if it` → invalid `if its`. A possessive is only a possessive when a
  property head actually follows it.
- **Ambiguity guards are load-bearing.** The connective generator drops any surface a
  language reuses for another sense in ANY dict bucket — th `เป็น` is both `as` and the
  copula `is`. Locatives need no guard (the slot fixes the sense); connectives do.
- **The fidelity ratchet did NOT move** on 1a/1b/3 — R0–R3 score actions, role TYPES,
  and (R3) only *language-invariant* values. Property/operator/connective WORDS are not
  scored. Re-verify for your phase anyway; do not assume.
- **`marker-templates.ts` is dead code** (zero importers, already drifted from the
  profiles) despite `packages/semantic/CLAUDE.md` advertising it. Extend the profiles.

## Phase 2 — operators + copula (start here; ~130 pairs)

The single biggest lever left. The pass/fail split partitions the 23 languages
*exactly* against a committed table, so attribution is near-certain:

- **The copula `is`** — `form-submit-prevent` (13), 13 of `behavior-sortable`'s 16, and
  the residual 14 of BOTH `input-validation` and `if-empty` (whose residual sets are now
  identical: ar bn fr hi id ja ms pt qu ru th tl tr uk). Only 9 languages register a
  `normalized:'is'` surface; `he` passes because its dict has no `is` entry at all.
  **`CONDITION_COPULAS_SURFACE` (`semantic-parser.ts:~5393`) already enumerates 12 of
  the 13 failing surfaces** — a ready-made map, currently used only to suppress a
  condition split. Watch the `is`→`it` ambiguity (ar `هو`).
- **`no`** — `behavior-draggable` (19 of 20; `if no dragHandle`). NOT in the old Phase 2
  list. 19 dicts define `no:`; the 3 passers (he/th/vi) don't.
- **`matches`** — `focus-trap`, `modal-close-backdrop`. Note es HAS `is`/`exists`/`empty`
  as profile keywords but NO `matches` entry: part of this is missing profile keywords,
  not missing mechanism. **But adding profile keywords risks phantom-injecting actions
  into hot rows** (memory: `profile-keyword-additions-phantom-risk`) — prefer the
  lexicon + an anchor where you can, and after-probe every hot row containing the word.
- **Context globals** (`document`/`window`/`body`) — zero reverse coverage anywhere in
  `packages/semantic`. Benign on Latin scripts, fatal on CJK/Arabic (`Unknown token: 文`).

## Then

- **Phase 4 — residual per-language parse gaps** (not vocab): `swap-content` ar `بـ#b`
  fusion, bn's `wait for X or Y` scramble, plus the sparse rows.
- **`if-empty`'s i18n scramble** — the transformer emits `si mi valor es entonces vacío`
  (the `entonces`/then lands mid-predicate), dropping predicate + body. Same family as
  the known spurious-`then` bug (`packages/i18n/src/grammar/grammar.test.ts:~1897`).
  **No longer the front blocker** — if-empty's residual set is now identical to
  input-validation's, i.e. the copula. Do Phase 2 first and re-measure.
- **LEAVE DEFERRED:** `pick-text-range` (23) — a named R1 deferral.

## Probe recipe

The corpus translations live in `patterns.db` (populate first). Read them directly —
this reproduces the gate path exactly and avoids hand-writing foreign source (which
misleads: a hand-written `el valor` suggested `the`→`el` needed translating; the real
corpus keeps `the` in English, because no dict has a `the:` entry):

```ts
import Database from 'better-sqlite3';
import { parseSemantic, render } from '@lokascript/semantic';
const db = new Database('packages/patterns-reference/data/patterns.db', { readonly: true });
const r = db.prepare(
  "SELECT hyperscript FROM pattern_translations WHERE code_example_id=? AND language=?"
).get('fetch-do-not-throw', 'ms');
render(parseSemantic(r.hyperscript, 'ms').node, 'en'); // what the gate validates
```

The probe file MUST live inside a package dir (e.g. `packages/testing-framework/`) —
a scratchpad outside the workspace cannot resolve `node_modules`. Delete it after.

## VERIFICATION PROTOCOL — run after EACH fix, before committing

- Rebuild: `npm run build --prefix packages/semantic`
- `npm run test:affected` — CRITICAL. A semantic change fans out to ~33 consumers incl.
  `hyperscript-adapter` (its own `preprocessToEnglish` + custom renderer). The semantic
  suite alone is NOT sufficient. **`domain-toolkit` "fails" because it has no test
  files (0 of them) — pre-existing, ignore it.**
- Foreign + en gates:
  `npm run populate --prefix packages/patterns-reference` then
  `npm run test:canonical --prefix packages/testing-framework`.
  The foreign gate is env-gated (`FOREIGN_CANONICAL_VALIDITY=1`, set by
  `test:canonical`) and reads authored translations from `patterns.db`, which the
  committed copy LAGS — you MUST populate first.
- Prune cleared pairs: `npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts`
  (prints CLEARED/ADDED, rewrites the JSON, bumps the counts). **Confirm ADDED is 0** —
  this is what caught the `if its` regression above. NOTE the tool REWRITES the baseline
  on every run, so a second run always shows 0/0; `git checkout --` the baseline first
  if you need to re-read the diff. Cross-check the arithmetic: `failing` should equal
  `before − CLEARED + ADDED`.
- Fidelity ratchet: `npm run test:multilingual:build-deps && npm run populate --prefix
  packages/patterns-reference && cd packages/testing-framework && npx tsx
  src/multilingual/cli.ts --full --bundle browser-priority --regression`.
  If it moves and the movement is intended, regenerate with `--save-baseline`
  (populate first) and commit `baselines/multilingual-priority.json`.
- The **en-render gate must stay green** (en is the target; a correct fix cannot
  regress it).

## Footguns

- **Never commit `packages/patterns-reference/data/patterns.db`** — commit dicts/
  profiles + baselines only. `git checkout --` it before committing.
- The foreign gate throwing `Unknown token: <char>` IS the signal (non-Latin vocab
  leaked), not a harness bug.
- **zsh does not word-split** `$vars` — `for p in $pkgs` iterates once. Use literal lists.
- Do NOT open a docs-only PR — fold docs into the code PR (build/lint/unit-tests run
  unconditionally and burn Actions minutes).
- Ship one phase (or a coherent slice) per small PR, each gate-guarded.
