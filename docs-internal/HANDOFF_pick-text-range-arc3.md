# HANDOFF: pick-text-range arc 3 — corpus + foreign patterns + range mechanism → 3059/3059

> ## ✅ OUTCOME (2026-07-20, executed same-day on `feat/pick-text-range-arc3`) — ARC COMPLETE, BURNDOWN COMPLETE
>
> **Foreign allowlist 23→0 (CLEARED=23, ADDED=0), en allowlist stays 0:
> 3059/3059.** The whole three-arc pick-text-range burndown is closed; no
> follow-on handoff. What landed, vs the plan below:
>
> - **Range mechanism** — as designed, with two measured corrections: (1) the
>   per-language separators match by **VALUE, not `(normalized ?? value)`** —
>   probe showed every language's separator normalizes to `destination` (es
>   `a`, ru `в`, th `ใน`…), so normalized matching would have turned every
>   destination marker into a range separator; (2) the fold synthesizes
>   `<a> to <b> [mode]` from `kind==='keyword' ? normalized : value` per
>   token — en output byte-identical (round-trip suite green).
> - **Foreign patterns** — NOT per-language leaf files: one
>   `patterns/pick.ts` with a verb-initial factory (17 langs; the literal
>   `pick` matches every native verb via **normalized-form literal matching**)
>   plus a verb-final factory (SOV six). he needs an optional `את` group and
>   keeps English `of` as its source marker (its dict never translates it);
>   zh needs `把` + `的`.
> - **UNPLANNED third mechanism (the probe surprise):** patterns alone fixed
>   only 4/17 verb-initial rows. Event-wrapped rows go through the FUSED
>   generated patterns (`pick-event-<lang>-vso`), whose truncated capture
>   (patient=`characters`) the #530 re-parse swap refused to replace — the
>   superset guard sees fused patient:literal vs re-parse patient:expression
>   as a type mismatch. Fix: a pick-specific preservation clause in
>   `semantic-parser.ts` — the fused patient literal reappearing under the
>   re-parse's `method` with the same value IS preservation. That one clause
>   cleared 13 languages at once.
> - **SOV six** — `sovPickRangeRule` custom render in i18n profiles
>   (patient-first verb-final: `#note の 文字 0 から 5 を クリック で 選択`),
>   co-evolved with the verb-final patterns. Corpus isolation diff: exactly 6
>   rows moved, all pick, zero collateral.
> - **qu vocab decision:** native-first `sanampa` (characters) in dict +
>   tokenizer EXTRAS; `kama` as range separator (`ta` would collide with the
>   accusative). The arc-2 triage's qu `of/from` complaint disappeared with
>   the rest — no qu-specific parser work beyond vocab + the shared factories.
> - **Fidelity recovery as predicted:** R1 +~0.0026 in all 23 non-en
>   languages; R3 → 1.0 in 14 languages, 0.9814→0.9907 in the other 9.
>   Baseline regenerated; 9-signal `--regression` green.
> - Arc-2's dormancy guard test (`does not fold a range when the source is a
>   foreign separator`) asserted the OLD behavior and was rewritten as the
>   positive fold test; a 23-language corpus round-trip table now pins every
>   surface in `test/pick-command.test.ts`.
> - Still deferred (named, unchanged): `item`/`items`, `start` endpoints,
>   `match`/`matches`, `..` separator, hi/sw `inclusive`/`exclusive` vocab.
>
> Everything below is the original pre-arc plan, kept for the record.

> **Paste-ready continuation prompt.** Written 2026-07-20 at the close of the
> arc-2 session. Parent plan: `docs-internal/PLAN_pick-text-range.md` (3 arcs).
> Arc-1 record: memory `pick-text-range-arc1.md`, PR #733 (merged, squash
> `30a472f8`). Arc-2 record: same memory file + the OUTCOME banner atop
> `docs-internal/HANDOFF_pick-text-range-arc2.md`, PR **#734**
> (`feat/pick-text-range-arc2`, 6 commits: aea9333c/8c9b46e7/96731557/d543d024/
> 8c9a82d5/15cc3350).
>
> **PREREQUISITE: arc 2 (PR #734) must be MERGED before this arc starts.** The
> repo squash-merges; never stack. The release date is deferred until these arcs
> complete (user decision 2026-07-20), so there is NO release-window hold — merge
> #734 as soon as CI is green. First act of the session:
> `git log --oneline origin/main | head` and confirm the #734 squash is on main,
> then `git checkout -b feat/pick-text-range-arc3 main`.

## Mission

Clear the last 23 (pattern, language) pairs in
`packages/testing-framework/baselines/foreign-canonical-validity.json` — all
`pick-text-range` — so BOTH canonical-validity allowlists are empty:
**3059/3059**. Then update the closed-arc records + memory.

Three coupled jobs (this is the arc the first two prepared):

1. **Foreign parse-back**: per-language semantic pick variant patterns (the
   foreign analogues of `pick-en-variant`) so each language's row parses with
   `method`/`patient`/`source` captured — plus the deferred **range mechanism**
   (per-profile separator + fold-time English normalization) so `0 a 5` folds to
   `0 to 5`.
2. **SOV corpus unscrambling**: per-command i18n pick render rules so the
   GENERATED rows for the SOV six stop scattering the range.
3. **Prune** the foreign allowlist 23→0 (ADDED=0) via
   `tools/regen-foreign-baseline.ts`, regenerate `multilingual-priority.json`,
   and keep the en allowlist empty.

## Current state of the 23 rows (as of arc-2 close — RE-TRIAGE FIRST, do not inherit)

Arc 2 changed all 22 registered rows (native `characters`), so the pre-arc-2
failure clusters (17 SVO `Unexpected value: <<<EOF>>>` + 5 SOV
`Unexpected Token : 0` + qu `Expected one of: 'of','from'`) are stale in detail
though probably right in shape. First probe of the session:

```bash
npm run populate --prefix packages/patterns-reference
npx tsx packages/testing-framework/tools/triage-foreign-residual.ts --detail /tmp/arc3-triage.json
```

Representative rows after arc 2 (read from a fresh `patterns.db`, never
hand-write):

- es (SVO, order already fine): `en clic escoger caracteres 0 a 5 de #note`
- ja (SOV, scrambled — the 5 stranded): `文字 0 を クリック で 選択 5 の #note に`
- tr (SOV, scrambled): `karakterler 0 i tıklama de seç 5 nin #note e`
- qu (deferred vocab, keeps English): `characters …` + its `of/from` complaint

**The load-bearing arc-2 probe finding:** the foreign generated pick pattern
(schema fallback, roles patient+source only) binds `patient` to the UNIT word
and **DROPS the range entirely** — `parseSemantic(es row)` → roles
`{patient:'characters'}`, renders `pick characters` (canonical-invalid EOF).
Even `escoger 0 a 5 de #note` binds `patient:'0'` and drops `a 5`. So the SVO
cluster is a **parse-back problem, not a render problem**: the es/fr/pt/… rows
are word-order-correct already; give each language a variant pattern with a unit
slot before `patient` + the separator fold, and the en render becomes
`pick characters 0 to 5 of #note` — valid — likely WITHOUT touching i18n for
those languages. The SOV six additionally need the i18n render rule to
unscramble the generated row itself. Sequence the arc that way:

- **Template first (es)**: es variant pattern + `es: {'a'}` separator + fold
  normalization → row parses full → renders valid → 1 pair CLEARED. Prove the
  whole chain on one language before fanning out.
- **SVO fan-out**: fr/pt/it/de/pl/ru/uk/ar/he/id/ms/sw/th/tl/vi/zh (whatever
  the fresh triage confirms) — pattern + separator word each.
- **SOV six** (ja/ko/tr/hi/bn + qu): i18n per-command pick render rule (fix the
  generated row) + paired semantic pattern (parse it back) — the
  `i18n-renders-semantic-patterns-coevolve` lesson says these land TOGETHER per
  language, and populate regenerates the row immediately.
- **qu last**: also needs the deferred `characters` vocab decision (see below).

## The deferred range mechanism (design preserved from arc-2 probes — build THIS, not something new)

All in `packages/semantic/src/parser/pattern-matcher.ts` (line refs as of arc-2
close; `this.currentProfile` is assigned at ~:93 and in scope everywhere below):

- `PICK_RANGE_SEPARATORS` (~:1274) is a flat `Set(['to'])`, consulted at ~:1299
  (separator) and ~:1336 (operand guard) by `(normalized ?? value)`.
- Add beside it a per-language table, e.g.
  `PICK_RANGE_SEPARATORS_BY_LANG: Readonly<Record<string, ReadonlySet<string>>>`
  keyed off `this.currentProfile?.code`, with a small
  `isPickRangeSeparator(...)` helper used at both sites. **NEVER via the
  roleMarkers table** — the separator word IS each language's destination marker
  (es `a`, ja `に`, ru `в`); the fold's gate (currentPatternCommand==='pick' &&
  role==='patient' && two-operand shape, call-site ~:712-722) is what makes the
  collision safe.
- **Fold-time English normalization**: replace the `joinExpressionTokens` call
  (~:1319) with manual synthesis `<operand> to <operand> [inclusive|exclusive]`
  (keyword→normalized, else value; mode word → its English normalized form). The
  folded value is then canonical English for EVERY language, so
  `pickMapper`'s hard-coded `/\s+to\s+/i` split (`ast-builder/command-mappers.ts`
  ~:860) and the en render work unchanged — one normalization site instead of
  two per-language ones. For en the output is byte-identical (the round-trip
  suite in `test/pick-command.test.ts` proves it — keep it green).
- `tryConsumePickRangeOperand` (~:1332) accepts keyword `start`/`end` mid-fold
  already; the connective guard (~:572-588) only rejects `end` as a slot's FIRST
  token. en `start to end` is tested (arc-2 Batch A).
- The mode words (`inclusive`/`exclusive`) are matched by normalized form via
  `PICK_RANGE_MODES` (~:1276) — arc-2's EXTRAS entries (20 langs) make the
  native mode words match with NO further matcher work. This was armed
  deliberately; note it in tests when a language exercises it.

## Foreign pattern shape (mirror `pick-en-variant`, don't invent)

`packages/semantic/src/patterns/languages/en/pick.ts` — read its FULL header
first; it carries both arc-1 render-selection constraints and the arc-2
dispositions. Key invariants that transfer to every language:

- The variant/unit word MUST ride the **`method` role** (render selection
  `findBestPattern` scores role PRESENCE, not literals; `swap` shares `method`).
- Range/count rides `patient`; the `of/from` root rides `source` (marker `of`,
  alternative `from` — use each language's genitive/source marker).
- Priority above the generated fallback (en uses 110 vs 100); the fallback still
  legitimately handles legacy `pick X from Y` (no method) via the −50
  missing-method penalty.
- **pickSchema roles stay FROZEN** (patient+source; doc comment at
  `generators/command-schemas.ts` ~:2631). Extend via patterns, never the schema
  — a role change regenerates all 24 fallback patterns.
- The unit words tokenize as KEYWORDS in the 22 registered languages (normalized
  `characters`) — unlike en where `characters` is an identifier. Set
  `expectedTypes` accordingly (en allows `['literal','expression']` for this
  reason; foreign patterns likely want the keyword/literal path).

Wiring convention: leaf in `src/patterns/languages/<lang>/pick.ts`, imported and
pushed in `src/patterns/<lang>.ts` (grep how en.ts:22/:367 does it, or how other
languages wire their fetch/swap leaves).

## i18n render rules (SOV six only, most likely)

`packages/i18n/src/grammar/profiles/index.ts` — per-command GrammarRule keyed by
`match.commands` (memory cites the ja `put-into` rule ~:175 as the template;
verify, that ref is from 2026-07 memory). **NEVER extend canonicalOrder
wholesale** — that was the R3 12→39 incident
(`i18n-renders-semantic-patterns-coevolve`). Each SOV language gets a pick rule
that keeps `<unit> <a> to <b>` adjacent (in native order with its particles) and
the source attached — probe the full generated row after EVERY rule change
(populate + read the row from patterns.db; the transformer output is what the
gate consumes, not your mental model of it).

## Deferred-vocab decisions arc 3 must make (all documented in the pick.ts header)

- **qu `characters`** — row keeps English until a native term is sourced;
  options: accept a loanword (tl-style `karakter`? qu convention favors native
  terms — research `sanampa`/`qillqa`), or leave qu allowlisted and shrink the
  mission to 22 (DON'T — the mission is 0; pick a word, the tl loanword
  precedent makes this acceptable).
- **hi/qu/sw `inclusive`/`exclusive`** — only matters if a test/row exercises
  modes in those languages; the corpus row doesn't. Optional.
- **`start`/`end` endpoints** — NOT needed for the corpus row (numeric 0/5).
  If pursued: `end` needs no registration anywhere (block-end normalizes; the
  fold accepts it mid-fold); `start` collides in 6 languages (hi/bn/id/ms/sw →
  `init`, qu → `default`; ar/he article-prefix split; vi multi-token) — only a
  slot-aware pattern context can gate it. Fine to leave deferred with comments.
- **`item`/`items`** — dict entry renames the `repeat for item in .items` loop
  variable (probed). Not needed for the corpus row. Leave deferred unless a
  masking fix for loop variables lands first.
- **`match`/`matches`** — needs a match-only role (renderer change). Out of
  scope; leave the comments.

## Verification protocol (inherited, verbatim-critical)

Per language-batch and once at the end:

```bash
npm run build --prefix packages/semantic       # stale dist is SILENTLY green
npm run build --prefix packages/i18n           # if dicts/rules touched
npm test --prefix packages/semantic -- --run
npm run test:affected
npm run check:fresh && npm run populate --prefix packages/patterns-reference
npm run test:canonical --prefix packages/testing-framework
npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts   # CLEARED grows, ADDED must stay 0
cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# after intentional movement: --save-baseline (once per batch or once at close)
```

**Corpus-movement isolation recipe (arc-2 proven):** the committed frozen
`patterns.db` LAGS src — never diff against it. Stash your working changes,
build+populate (BEFORE snapshot of `pattern_translations`), unstash,
build+populate (AFTER), diff. Any non-pick row diff = stop and probe.

Footguns (every one bit a prior session):

- `loadCanonicalParser()` **IS** the validate fn (destructuring yields
  undefined); `validate` returns an error array and NEVER throws — check
  `.length === 0`.
- `node.roles` is a `Map` — `JSON.stringify` prints `{}`. deMap before trusting
  a role dump.
- The regen tool REWRITES the baseline every run (2nd run shows 0/0);
  `git checkout --` it to re-read a diff. Cross-check
  `failing == before − CLEARED + ADDED`.
- **Never commit `packages/patterns-reference/data/patterns.db`** —
  `git checkout --` it before every commit (it's tracked, and populate dirties
  it).
- The CLI freshness guard refuses `--regression`/`--save-baseline` if ANY of the
  stack's `src/` is newer than its dist — **including a test-file edit**; rebuild
  the package first.
- Probe scripts must live INSIDE a package dir (scratchpad can't resolve
  node_modules); delete after.
- tl-style loanwords: when native == English form, the tokenizer leaves
  `normalized` unset — assert `(normalized ?? value)`, mirroring the matcher.
- The triage harness is COMMITTED
  (`packages/testing-framework/tools/triage-foreign-residual.ts --detail out.json`)
  — use it, don't rebuild it.
- Rows whose EN raw code is canonical-invalid sit OUTSIDE the R4 denominator —
  "invalid but not allowlisted" ≠ red gate.
- i18n dict/EXTRAS additions: dict moves the GENERATED corpus, semantic EXTRAS
  move the PARSE-BACK. Both surfaces, natives must match verbatim. Insertion
  anchors are uniform (`expressions: {` in dicts; `const <LANG>_EXTRAS:
  KeywordEntry[] = [` … `];` in tokenizers).

## Close-out (when CLEARED reaches 23)

1. Foreign allowlist empty, en allowlist empty (it already is — any en change
   that breaks it is a hard failure, not an allowlist edit): **3059/3059**.
2. `--save-baseline` (expect real fidelity GAINS this time — the foreign rows
   finally parse faithfully; inspect the pick-row R1/R3 recovery the arc-1/2
   drops predicted).
3. Update `docs-internal/MULTILINGUAL_NEXT_STEPS.md` (pick range-role deferral
   is named there), the arc-2 handoff banner, this file's banner, and memory
   (`pick-text-range-arc1.md` — rename/close the arc record).
4. One PR; body carries the per-pair CLEARED explanation and the baseline
   recovery numbers. This doc and any new handoff ride it.

## Governing discipline

This burndown's record is ~20 handoff/plan filings refuted by probes — arc 2
alone refuted five (item/items "plain nouns", the Latin/non-Latin registration
split, the es-separator "live proof", the start "new entries" disposition, and
the corpus-driver attribution). **Probe the claim before building on it; probe
whether a fix is COMPLETE, not just aimed at the right file.** The SVO-cluster
"parse-back only, no i18n needed" claim above is itself unproven at row level —
verify it on es before fanning out. If a probe refutes anything in this file,
update THIS file in the same commit — the next session inherits corrections,
not intentions.
