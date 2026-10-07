# Multilingual roadmap

> Written 2026-09-30 at `4f65ddaae` (PR 131). This file replaces the 8,740-line queue it used to be.
> That version is kept at the tag `archived/multilingual-next-steps-2026-09-30`
> (`git show archived/multilingual-next-steps-2026-09-30:docs-internal/MULTILINGUAL_NEXT_STEPS.md`).
>
> - **Every open item** from it, plus the 2026-09-30 product survey's findings, is in
>   [`multilingual/OPEN_ITEMS.md`](multilingual/OPEN_ITEMS.md), with the IDs used below.
> - **The value-reading rule inventory** and the name-collision policy are in
>   [`multilingual/VALUE_READING.md`](multilingual/VALUE_READING.md).
> - How to keep this file short is at the end.

## 1. Where we are

What the gates measure. Each claim carries its re-check command:

| Signal                                  | Value                                                               | Re-check                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Corpus fidelity, 11 ratchet signals     | 1.000 in all 24 languages (baseline 2026-09-25)                     | `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression` (after `populate`) |
| Value matrix (4,537 cells × 48 lanes)   | 6 failing, all ACCEPTED, 0 open (2026-10-07)                        | `npx tsx tools/regen-value-matrix-baseline.ts --dry-run` (testing-framework)                                                        |
| Command shapes (1,135 scripts × 24)     | 23,954 pass, 3,242 refused, 44 silent; en 1,053 / 82 / 0 (10-07)    | `npx tsx tools/regen-command-shapes-baseline.ts --report` (testing-framework)                                                       |
| Canonical validity (upstream parses it) | both allowlists empty (3174/3174 foreign, 138/138 en on 2026-09-23) | `npm run test:canonical --prefix packages/testing-framework`                                                                        |
| English reference preserved             | 162/163 units (1 allowlisted: async-block, by design; 2026-10-06)   | same                                                                                                                                |
| Bare-form render fidelity               | 2978/2990 (12 allowlisted pairs; 2026-10-06)                        | `baselines/bare-render-fidelity.json`                                                                                               |

What **no** gate measures (measured 2026-09-30 unless a row is dated):

| Gap                                          | Size                                                                                                                               | Items  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| English words left in renders                | 769/3542 corpus renders (21.7%), from ~12 constructions that leak identically in all 23 languages                                  | N1, V1 |
| English DOM event names                      | 1912/3496 handler events; 94–98% in he hi it ms pl ru th tl uk vi                                                                  | N2     |
| Ungrammatical `me` after a preposition       | 13 languages, 80–92% of such renders (es `a yo`, de `zu ich`, ru `к я`)                                                            | N3     |
| Commands outside every gate's input          | 36 filed parser items (2026-10-07); since 4.2.0 a translation that would lose part of a script is refused, so most are now loud     | P2–P55 |
| User docs that match the product             | example pages pin i18n 2.3.0; a never-deployed docs app; no package chooser; README examples run only for the adapter (2026-10-06) | D5–D8  |
| Shipping                                     | 4.2.0 on npm 2026-10-07 (`npm view @hyperfixi/core version`; unreleased: `git log v4.2.0..origin/main -- packages`)                | —      |

## 2. How we choose work now

The corpus and value gates are saturated. Each widening of the value matrix found less:

- 3,016 open pairs (PR 93), then 3,419 (PR 108), 371 (PR 124) and 887 (PR 130).
- PRs 112–128 moved no gate at all.

The product's gaps are now in what no gate reads. From here:

1. **What a user sees comes first.** A translation that drops a command or reads as broken outranks a
   gate count.
2. **Ship each arc.** Release when an arc lands. No finished work sits unreleased for more than two
   weeks.
3. **Complexity has a budget.** An arc that grows `packages/semantic/src/parser` says why in its PR.
   Prefer a fix that deletes something: derive a list rather than copy it, and answer one question with
   one predicate.
4. **Gate first, then fix, but only toward shapes users write.** A new generated gate names the
   user-visible class it hunts. A gate that finds nothing after its first burn-down stops being widened.
5. **This file holds the plan and the current state only.** Per-PR history goes in PR bodies and git
   log (see §7).

## 3. Arcs, in order

### M1: commands a translation silently drops

**Why.** For shapes no corpus row has, semantic's English parse dropped whole commands, and
`translate()`, MCP `translate_code`, the corpus writer and the adapter inherited the loss (English on
a page was fine: the engine reads it directly). Plan: `~/.claude/plans/m1-command-shape-gate.md`.

**The gate** (#1401) reads 1,135 scripts the engine runs: upstream's 0.9.93 tests and core's reference
and hover examples. Each goes through 24 lanes (`en`, and `en → L → en`), and the engine must parse
the output as it parses the source, after named equivalences pinned on both engines. A family is IN
(must round-trip), LOUD (must be refused, with a reason) or OUT (core-only). The baseline only shrinks.

**Fail-loud came first** (#1402, #1403; 4.2.0): `translate()` throws `LossyTranslationError` unless
`{ lossy: 'allow' }`, and the adapter and build tools keep the author's text and warn. Every silent
pair left is in a named family with a reason (`SILENT_FAMILIES`); the English lane has none.

**Fixes by family** (#1404–#1417): program structure; control flow; trailing clauses, by one
mechanism (a clause no pattern models, and upstream's `on` head forms, kept as written); scoped
names (P45); values as one token (`@a=v`, `arr[1]`) and bracket interiors as written.
`packages/semantic/src/parser` grew by 862 lines net since 4.1.0. Then a word is written only where
its reader brings it back (#1419), and three losses no gate held (step 2): tr read an `if` with no
`then` as the condition's head plus a branch whose destination was the condition's tail (P54; the
value matrix's `branch` position now holds the shape), core's `swap into`/`over` were written as an
exchange with a property, and a strategy upstream cannot spell is refused (`core-only`, S6).
`it.value` written `its.value` (P14) was measured as no loss: both engines read `its` as `it`, and
upstream's own suite writes `its.ok`. Step 3 (English refusals) began with values: a CSS length
(`100px`, `50%`) is one value, `innerHTML of #d1` names a property, a string holding a quote keeps
closing, and `don't throw` reads (82 → 73 refused).

| Run                    | pass   | refused | silent | en lane (pass / refused / silent) |
| ---------------------- | ------ | ------- | ------ | --------------------------------- |
| first run (2026-10-06) | 18,171 | 1,479   | 7,614  | 793 / 60 / 283                    |
| 4.2.0 (2026-10-07)     | 23,763 | 3,303   | 174    | 1,053 / 82 / 0                    |
| main (2026-10-07)      | 23,954 | 3,242   | 44     | 1,053 / 82 / 0                    |
| step 3, values         | 24,139 | 3,057   | 44     | 1,062 / 73 / 0                    |

**Left.** English refusals: `scroll … by` (P8), `.stop*` classes (P2), `default … in` (P10),
`make a Set` (P11), a second `on` after `send` (P26), `halt default`, `don't throw`, `send` arguments,
`beep!`, `.foo()` chains, `closest @foo`, `otherwise`, `on every click`, `init immediately`, `on "a-b"`,
and the LOUD families. Group 6, foreign lanes: P9, P15, P18, P21, P52, foreign bare counts and `queue`
forms, ko verbs that are also events, and the `branch` refusals (an SOV condition ending in an owner
takes the branch's `.y`). The gate's `--report`
lists the silent families. **Exit:** every IN family passes or has a reason; stop widening when a
widening finds nothing a user would write (rule 4).

### M2: translations that read as the language

**Why.** 22% of renders carry English words, half of all handler events are English, and 13 languages
put a nominative pronoun after a preposition. No gate reads for this: they check that a render parses,
not that it reads.

**Step 1 — the gate.** Commit the survey's English-leak scan as a shrink-only baseline (per language
and per construction), plus a pronoun-case probe.

**Step 2 — no decision needed (N2).** Native event names in he, hi, it, pl, ru, th, uk and vi, where the
lexicon's own word round-trips (87–100% of corpus rows). Denylist the pairs that don't:

- keydown/keyup compounds;
- pl `załaduj`;
- ru/uk scroll and blur.

**Step 3 — owner vocabulary decisions, batched into one sheet (V1, N1).** The render lexicon is locked
to the i18n dictionary, so each decision is a dictionary change:

- the loop words: `repeat` in `for`/`while`/`until`/`until event`, `forever`, `with index`;
- the event modifiers: `once`, `debounced at`, `throttled at`, `from elsewhere`;
- `I match`, `do not throw`, `go back`, `go to url`, `tell … to`, `def`;
- the expression words: `the X of Y`, `as T`, positional `in`, `on <target>`. These cross semantic's
  "commands only" scope line.

The sheet proposes a word for each and a recommendation.

**Step 4 — design:**

- N3: an oblique pronoun form after a marker (es `a mí`, de `zu mir`, ru `ко мне`, tr `bana`), with a
  reader that accepts both forms;
- N5: suffixes attached in the agglutinative languages;
- N4: the ja/tr handler heads (`クリック を で`, `tıklama i üzerinde`);
- N6: the article and marker slips.

**Step 5 — native review of what changed** (N8, V2, V3, `packages/semantic/NATIVE_REVIEW_NEEDED.md`).
One reviewer each for es, de, ru and ja would have caught N3 and N4 on sight. The community intake
exists (policy 13).

**Exit:**

- the leak ratchet runs in CI;
- event names are native wherever a round-tripping word exists;
- pronoun case is right in the 13 languages;
- the leak rate target (set at Step 1) is met.

### M3: complexity down

**Why.**

- `semantic-parser.ts` is 8,871 lines (2026-10-06, `wc -l`), and grew 19% in the week of 2026-09-23.
- The handcrafted patterns hold 158 hand-written `expectedTypes` lists; only 5 files derive theirs from
  a schema. A copied list that drifted is why German lost every `get` of a literal (PR 130).
- An end word has nine readers.

**Work:**

- (a) Where a handcrafted pattern copies a schema's type list, derive it (as `put.ts`, `get.ts` and
  `hide.ts` do). Where it narrows the list deliberately, say why in a comment.
- (b) An explicit render/parse-only flag on patterns (R6), so the render surface is chosen rather than
  inherited. Four parse-only patterns became the render by accident.
- (c) Arc D: penalize unconsumed input in the confidence score (G1). Then try deleting `parseInternal`'s
  stages 0 and 0.5.
- (d) Split `semantic-parser.ts` by responsibility, behavior-preserving and checked against a parity
  oracle.
- (e) Decide the semantic/framework `PatternMatcher` fork (4,247 vs 1,630 lines on 2026-10-06; Phase 3
  of the old `multilingual/plan.md`, archived 2026-10-06).

**Exit metrics** (stamp them when the arc starts):

- `semantic-parser.ts` line count;
- the number of copied type lists;
- the number of readers per question in `VALUE_READING.md`.

### M4: the small queue (take items opportunistically)

- **Parser items not in M1:** P6, P7, P13, P16, P17, P23–P25, P29, P31–P44, P53, P55. (P16 and P17
  left M1 on 2026-10-06: the engine rejects their source.)
- **Render items:** R1–R4.
- **Vocabulary:** V5–V7.
- **Gate items:** G2–G6, G9, G10.
- **G11** is a one-line win: widen `ARGS_FORM_OK` to 23 languages.

## 4. Parked, and decisions waiting on the owner

- **M1 calls taken:** fail-loud by default (F1 `translate()` throws, F2 the adapter refuses at run time;
  2026-10-06, shipped in 4.2.0). `swap innerHTML of …` and a naked `${}` URL keep core's meaning in
  translation, and the docs teach upstream's (2026-10-07).
- **`ask` / `answer` vocabulary** (M1's LOUD family): neither has a schema or a word in any
  dictionary, so both are refused. Adding them is a policy-5 vocabulary call.
- **AOT** retired (owner, 2026-10-04): `packages/aot-compiler` and MCP `compile_hyperscript` were removed for 4.0 (it was parked from 2026-09-27).
- **`hx-query`** (htmx 4's new verb, V4): core's htmx-compat layer retired in Phase C3, so this is
  vocabulary only now. Give it a localized name in the htmx adapter's vocabulary, or leave it English?
- **Community-review badges and ledgers** (PR1) wait for real reviewer inflow.
- **The behavior boundary validator** (PR2) waits for third-party behavior authoring.
- **htmx v4 attribute names** (PR5): the htmx adapter's vocabulary localizes htmx 2's
  `sse-connect`/`ws-connect`, where htmx 4 ships `hx-sse`/`hx-ws`.
- **The Arc B dictionary flip** (derive the dictionaries from the profiles, PR6). The V1 vocabulary
  gate holds the two consistent today.
- **Weight (S4):** a single-language page loads ~150 KB gz (the engine and a per-language adapter
  bundle, 4.1.0). Is a lighter, render-free, parse-only single-language bundle worth more to users than
  further correctness work?
- **The LokaScript VS Code extension** (S1): publish it, or drop it from the product story? (The
  standalone `_hyperscript` extension was retired 2026-10-04: upstream ships its own.)
- **The docs site** (D6): lokascript.org and hyperfixi.org build from `_hyper_min` (on 4.x since
  2026-10-05); this repo's `apps/docs-site` was never deployed. Delete it, or make it the site?
- **Approaching upstream** (PR8): when to offer the multilingual tools and the MCP server to
  hyperscript.org, and in what order.

## 5. Policies in force

The archived file holds the rationale for each; `OPEN_ITEMS.md` explains how to read it.

1. **Name collisions:**
   - A, parser inference, is frozen: no new per-name rules.
   - B, the verified render, parenthesizes a colliding variable only where the plain render would be
     misread.
   - C, the diagnostic, covers hand-written text.

   Details are in `VALUE_READING.md`.
2. **Core-only syntax is read, and written back in upstream's spelling** (2026-10-01; it rendered as
   written before). `packages/engine` replaces core's engine and drops most core-only forms, so English
   that reaches an engine must be upstream's. Corpus rows are written in upstream's spelling, and an
   engine-invalid row is fixed at its source. What is not yet written back: `OPEN_ITEMS.md` section 2j.
3. **Canonical hyperscript first.** Showcase behaviors don't drive the queue.
4. **The value matrix is shrink-only.**
   - ACCEPTED pairs stay in the baseline: it `di` (6 pairs on 2026-10-06; core's `the X of Y as T`
     left with core's lanes in Phase C4).
   - Recorded keep-or-match calls: `as Boolean`, and `[@name="value"]` as a value.
5. **The render lexicon is locked to the i18n dictionary**, so changing a rendered word is an owner
   vocabulary decision.
   - Taken so far: `null` as a loanword in 7 languages, hi `no`, qu `and`, tl/tr `includes`, and
     counted loops in each language's own words (PR 131).
   - Don't register words into profiles "for hygiene".
   - Never `_`-join a multi-word keyword.
6. **English-kept surfaces, by design:**
   - conversion words and type names;
   - fetch response types;
   - `set … on`;
   - push/replace `url`;
   - query-scope `in`;
   - `equal to`;
   - `using view transition`;
   - brace and bracket interiors (array literals, attribute selectors, indexes), and a call's arguments;
   - a property name its language's reader cannot bring back (`my children`, `my style[…]`);
   - a clause no pattern models, and upstream's `on` head forms, kept as written (M1);
   - scope words (`element x`, `global x`), and `catch` / `finally` until they have words;
   - unsafe event names;
   - `js … end` bodies (never translated).

   M2 Step 3 may revisit some of these; until then they stand.
7. **The corpus writer is semantic-only.**
   - A row it cannot render keeps its English, is counted, and is reported.
   - A markup `_=` body is translated only if its English re-render preserves its content.
8. **Allowlists only shrink.** In the English-reference gate, `the` is not an equivalence.
9. **Invariant:** take's `source` never defaults to `me`.
10. **Measurement discipline:**
    - probe the whole corpus before and after a parser change;
    - drop each piece of a fix and re-measure;
    - mutation-test every guard;
    - "pre-existing" means measured on the base;
    - re-measure a standing deferral before costing it.
11. **Baselines:**
    - regenerate against a freshly `populate`d DB;
    - never commit `patterns.db`;
    - no baseline-moving arc in the days before a release.
12. **Behaviors:**
    - no imperative JS;
    - curated 5, optional 3, experimental 3.
13. **Community review:**
    - intake is GitHub-native;
    - issue-form field ids are a public API;
    - reviewer incentives stay unstated until the owner says otherwise.

## 6. What the gates cover

| Gate                             | Sees                                                         | Blind to                                              |
| -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Multilingual `--regression` (11) | corpus parses: actions, roles, values, execution (R2 subset) | shapes not in the corpus; naturalness; confidence     |
| Value matrix                     | value shapes in 11 positions, executed on both engines       | command/structure shapes (the command-shape gate)     |
| Command shapes                   | authors' scripts (upstream's tests, core's docs), round trip | values the scripts lack (value matrix); naturalness   |
| Canonical validity (R4 + en)     | renders upstream rejects                                     | renders upstream accepts but that mean something else |
| en-reference-preservation        | English parses that lose source content (corpus)             | shapes not in the corpus                              |
| Bare / wrapped render fidelity   | the handler-free form of each corpus row                     | same                                                  |
| Vocab V1–V4, lexicon parity      | dictionary ↔ profile ↔ tokenizer agreement                   | whether a word is right, or natural                   |
| _(none yet)_                     | English leaks, pronoun case, README examples                 | → M2 Step 1, D8                                       |

## 7. Keeping this file honest

- **A status claim carries a date or commit and the command that re-checks it.** A decision needs only
  a date.
- **An item is one line with an ID in `OPEN_ITEMS.md`.** A PR that fixes it deletes the line; the PR
  body keeps the story. No dated "Update" blockquotes, and no per-PR narrative, here or there.
- **This file stays under ~300 lines.** Past that, something in it is history: delete it, since git keeps
  it.
- **Handoffs live outside the repo and end when their arc ships.** Durable lessons go to the
  value-matrix playbook or to memory, not here.
- **A PR that moves a value-reading rule updates its row in `VALUE_READING.md`.**
