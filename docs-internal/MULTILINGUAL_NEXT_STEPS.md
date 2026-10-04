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

| Signal                                  | Value                                                 | Re-check                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Corpus fidelity, 11 ratchet signals     | 1.000 in all 24 languages (baseline 2026-09-25)       | `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression` (after `populate`) |
| Value matrix (4,205 cells × 48 lanes)   | 6 failing, all ACCEPTED, 0 open (2026-10-04)          | `npx tsx tools/regen-value-matrix-baseline.ts --dry-run` (testing-framework)                                                       |
| Canonical validity (upstream parses it) | foreign 3105/3105, en 134/134                         | `npm run test:canonical --prefix packages/testing-framework`                                                                       |
| English reference preserved             | 159/161 units (2 allowlisted: async-block, draggable) | same                                                                                                                               |
| Bare-form render fidelity               | 3024/3036 (12 allowlisted pairs)                      | `baselines/bare-render-fidelity.json`                                                                                              |

What **no** gate measures (all measured 2026-09-30):

| Gap                                          | Size                                                                                             | Items  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| English words left in renders                | 769/3542 corpus renders (21.7%), from ~12 constructions that leak identically in all 23 languages | N1, V1 |
| English DOM event names                      | 1912/3496 handler events; 94–98% in he hi it ms pl ru th tl uk vi                                | N2     |
| Ungrammatical `me` after a preposition       | 13 languages, 80–92% of such renders (es `a yo`, de `zu ich`, ru `к я`)                          | N3     |
| Commands dropped outside the corpus's shapes | ~44 filed parser items, most in semantic's **English** parse, so every translation inherits them | P1–P44 |
| User docs that match the product             | lokascript.org pins 2.10.0; a README quickstart is a dead button; stale translator docs and sizes | D1–D7  |
| Shipping                                     | last publish 3.1.1 (2026-09-04); 168 commits unreleased                                          | —      |

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

### M0: ship what is done (3.2.0)

**Status (2026-09-30):** 3.2.0 is on npm (25 packages; release smoke green). Shipped with it: D1 and the
adapter's reference-event guard, D3, D4 (in the package READMEs and `docs/`), S2, CDN entries for five
packages, and README examples executed for the adapter. Left: D2 (the sites, pending the owner's
docs-site decision), D5, D6, and README-example tests beyond the adapter.

**Why.** 168 commits of fixes no npm user has, and the docs site shows 2.10.0.

**Work:**

- Release notes grouped by what a user notices, not by PR.
- Fix the docs that would mislead on release day:
  - D1: the adapter README's `on me` example is a dead button. Also guard the host gate against a
    handler for an event named `me`, `it` or `you`.
  - D3: the i18n README still claims i18n translates.
  - D4: stale sizes and language counts; semantic exports `VERSION = '0.1.0'`.
  - S2: the `translate_hyperscript` tool description.
  - D5: the five example pages pinned to i18n@2.3.0.
- Execute every README example in a test, so the docs cannot rot silently again.
- Redeploy lokascript.org on 3.2.0 (D2). Its source lives in `_hyper_min`.

**Exit.** npm is at 3.2.0; `examples/release-smoke/run.mjs` passes; README examples run in CI.

**Owner decisions:**

- Publish the LokaScript VS Code extension, or drop it from the product story (S1)? (The standalone `_hyperscript` extension was retired 2026-10-04: upstream ships its own.)
- Which repo owns the docs site (D2, D6)?

### M1: commands a translation silently drops

**Why.** For shapes no corpus row has, semantic's English parse drops whole commands. Examples:

- `on click toggle .stopped` loses its toggle (P2);
- a bare `if … end` becomes a handler (P3);
- `break`/`continue` vanish (P5);
- `tell … end then log 2` loses the log (P1);
- `scroll down by 100` is lost (P8).

`translate()`, MCP `translate_code`, the corpus writer and the non-English runtime all inherit the loss.
English on core's own parser is unaffected, which is why nobody running English noticed.

**Step 1 — the gate.** A command-shape gate, the value matrix's structural twin:

- **Input:** every syntax form core documents (`commandMeta` syntax and examples, the reference docs)
  and upstream's documented forms.
- **Check:** each form goes through semantic English and is executed against upstream.
- **Baseline:** shrink-only, like the value matrix.

**Step 2 — fix by reach.** First the English-parse items (P1–P5, P8, P10–P12, P14, P17, P30), then
the translation-side ones (P9, P15, P18–P21, P26).

**Exit.** Every documented command form round-trips through semantic English, or is allowlisted with a
reason.

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

- `semantic-parser.ts` is 8,755 lines, and grew 19% in the week of 2026-09-23.
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
- (e) Decide the semantic/framework `PatternMatcher` fork (4,219 vs 1,630 lines; the old
  `multilingual/plan.md` Phase 3).

**Exit metrics** (stamp them when the arc starts):

- `semantic-parser.ts` line count;
- the number of copied type lists;
- the number of readers per question in `VALUE_READING.md`.

### M4: the small queue (take items opportunistically)

- **Parser items not in M1:** P6, P7, P13, P16, P19–P29, P31–P44.
- **Render items:** R1–R4.
- **Vocabulary:** V5–V7.
- **Gate items:** G2–G6, G9, G10.
- **G11** is a one-line win: widen `ARGS_FORM_OK` to 23 languages.
- **C1–C12** are core runtime differences from upstream. They belong in `PARSER_NEXT_STEPS.md`: move
  them there when that file is next touched.

## 4. Parked, and decisions waiting on the owner

- **AOT** is parked (owner, 2026-09-27): no AOT work, and no AOT lane in the value matrix.
- **`hx-query`** (htmx 4's new verb, V4): adopt its semantics in core's htmx-compat layer, or treat it
  as vocabulary only?
- **Community-review badges and ledgers** (PR1) wait for real reviewer inflow.
- **The behavior boundary validator** (PR2) waits for third-party behavior authoring.
- **htmx v4 attribute names** `hx-sse`/`hx-ws` (PR5) are not reconciled.
- **The Arc B dictionary flip** (derive the dictionaries from the profiles, PR6). The V1 vocabulary
  gate holds the two consistent today.
- **Weight (S4):** is a lighter, render-free, parse-only single-language bundle worth more to users
  than further correctness work?

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
   - ACCEPTED pairs stay in the baseline: core's `the X of Y as T` binding, and it `di`.
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
   - brace interiors;
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
14. **The slim adapter's engine-invalid repeat output is a safety property.** Fix the repeat surface
    whole or not at all.

## 6. What the gates cover

| Gate                             | Sees                                                         | Blind to                                              |
| -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Multilingual `--regression` (11) | corpus parses: actions, roles, values, execution (R2 subset) | shapes not in the corpus; naturalness; confidence     |
| Value matrix                     | value shapes in 9 positions, executed on both engines        | command/structure shapes (M1's gate)                  |
| Canonical validity (R4 + en)     | renders upstream rejects                                     | renders upstream accepts but that mean something else |
| en-reference-preservation        | English parses that lose source content (corpus)             | shapes not in the corpus                              |
| Bare / wrapped render fidelity   | the handler-free form of each corpus row                     | same                                                  |
| Vocab V1–V4, lexicon parity      | dictionary ↔ profile ↔ tokenizer agreement                   | whether a word is right, or natural                   |
| _(none yet)_                     | English leaks, pronoun case, README examples                 | → M2 Step 1, M0                                       |

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
