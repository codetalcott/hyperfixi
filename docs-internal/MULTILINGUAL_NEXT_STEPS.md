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
| Command shapes (1,135 scripts × 24)     | 25,886 pass, 1,343 refused, 11 silent; en 1,089 / 46 / 0 (10-12)    | `npx tsx tools/regen-command-shapes-baseline.ts --report` (testing-framework)                                                       |
| English left in renders: words / events / `me` case | corpus 5.4% / 0.0% / 9.0% of renders; command shapes 10.8% / 0.0% / 16.3%. Words counted toward the target (kept English out), per language: corpus 0.7–4.6%, shapes 3.9–6.2%, met in 23/23 (10-10) | `npx tsx tools/regen-english-leaks-baseline.ts --report` (testing-framework; corpus after `populate`) |
| Canonical validity (upstream parses it) | both allowlists empty (3174/3174 foreign, 138/138 en on 2026-09-23) | `npm run test:canonical --prefix packages/testing-framework`                                                                        |
| English reference preserved             | 162/163 units (1 allowlisted: async-block, by design; 2026-10-06)   | same                                                                                                                                |
| Bare-form render fidelity               | 2978/2990 (12 allowlisted pairs; 2026-10-06)                        | `baselines/bare-render-fidelity.json`                                                                                               |

What **no** gate measures (measured 2026-09-30 unless a row is dated):

| Gap                                          | Size                                                                                                                               | Items  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Commands outside every gate's input          | 36 filed parser items (2026-10-07); since 4.2.0 a translation that would lose part of a script is refused, so most are now loud     | P2–P55 |
| User docs that match the product             | example pages pin i18n 2.3.0; a never-deployed docs app; no package chooser; README examples run only for the adapter (2026-10-06) | D5–D8  |
| Shipping                                     | 4.3.0 on npm 2026-10-08 (`npm view @hyperfixi/core version`; unreleased: `git log v4.3.0..origin/main -- packages`)                | —      |

## 2. How we choose work now

The corpus and value gates are saturated (each widening of the value matrix found less, and PRs
112–128 moved no gate), so the product's gaps are in what no gate reads. From here:

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
a page was fine: the engine reads it directly). Plan: `~/.claude/plans/archive/m1-command-shape-gate.md`.

**The gate** (#1401) reads 1,135 scripts the engine runs: upstream's 0.9.93 tests and core's reference
and hover examples. Each goes through 24 lanes (`en`, and `en → L → en`), and the engine must parse
the output as it parses the source, after named equivalences pinned on both engines. A family is IN
(must round-trip), LOUD (must be refused, with a reason) or OUT (core-only). The baseline only shrinks.

**Fail-loud came first** (#1402, #1403; 4.2.0): `translate()` throws `LossyTranslationError` unless
`{ lossy: 'allow' }`, and the adapter and build tools keep the author's text and warn. Every silent
pair left is in a named family with a reason (`SILENT_FAMILIES`); the English lane has none.

**Fixes by family** (#1404–#1422, released in 4.2.0 and 4.3.0; the stories are in the PR bodies):
program structure, control flow, clauses no pattern models kept as written, scoped names, values as one
token, a word written only where its reader brings it back, and the English refusals. The 61 English
refusals left are LOUD, each family with its reason: `beep!` waits on vocabulary (the
M2 sheet), halt's `default` modes and collection expressions are filed (P56, P57), the rest are shapes
rare in pages.

**Left.** The English lane has no refusal outside a LOUD family (step 3's exit; silent pairs 7,614 at
the first run → 19 on 2026-10-11, each in a named family). The foreign lanes' refusals and the 19 are
the reliability rows after M2 (below). **Exit:** every IN family passes or has a reason; stop
widening when a widening finds nothing a user would write (rule 4).

### M2: translations that read as the language

**Why.** 19% of corpus renders (24% of authors' scripts) carry an English word, a third of corpus
renders keep an English event name, and 13 languages put a nominative pronoun beside a marker. Every
other gate checks that a render means what the source means, not that it reads as the language.
Plan: `~/.claude/plans/m2-naturalness.md`.

**Step 1 — the gate (2026-10-08).** `english-leaks.ts` counts, per render, English grammar words
(the tokens the engine's own parser matched as words in the source), English event names the lexicon
has a word for (N2), and a nominative `me` or `it` beside a marker or as an unmarked object (N3). Two shrink-only halves: the corpus
(`test:canonical`) and the command-shape cases' renders (in their shards). `--report` splits each word
by context (`clause`, the English M1 keeps as written, N9; `bracket`; `call`; `property`; `plain`) and
by whether the language has its own word. Measured: words in 18.9% of corpus renders (top: `repeat`,
`in`, `I match`, `debounced at`, `of`, `elsewhere`, `as`) and 24.2% of command-shape renders (`def`,
`the X of Y`, `as`, `catch`/`finally`, `start view transition`; M1's kept clauses, 116 in 59 shapes,
never occur in the corpus). **Exit targets (decided 2026-10-08), in every language, not on average**
(an average hid he: words in 35% of its corpus renders, the others near 18%): English words in at most
5% of corpus renders and 10% of command-shape renders, not counting English a recorded decision keeps
(policy 6, the sheet's keep rows); no `event:` finding (a denylisted event, each with its reason, is
none); no `case:` finding (`me`, `it`, an unmarked object), its forms checked by a native speaker (de, pl, ru and uk pick the case by
the marker); since 2026-10-11 (owner, FUSED_FORMS.md Q3), no `spacing:` finding (a marker ko, ja, bn
or tr attaches to its noun, written as its own word: N5). `--report` prints each language against them (`LEAK_TARGETS`). Words are mostly vocabulary:
without the sheet the floor is 13.3% / 19.4% (renders with a word the language has none for).

**Step 2 — no decision needed (N2): done 2026-10-08.** Native event names in he, hi, it, pl, qu, ru, th, uk
and vi where the lexicon's own word reads back; the rest denylisted with reasons. Events now 0 in both halves.

**Step 3 — owner vocabulary decisions (V1, N1): decided 2026-10-08, all as recommended; done 2026-10-11.**
The sheet, `multilingual/VOCABULARY_SHEET.md`: A1–A10 render words the dictionaries already have, B1–B7
add a word per language, C1–C4 keep English (`KEPT_ENGLISH` in `english-leaks.ts`; C4 deferred, still
counted). The sheet lists the PRs and the words that changed; the words target is met everywhere.

**Step 4 — design:**

- N3: an oblique pronoun form after a marker (es `a mí`, de `zu mir`, ru `ко мне`, tr `bana`), with a
  reader that accepts both forms (the reader half done 2026-10-10; renders write `me` in the oblique
  in the free-word languages es, pt, it, tl, pl, ru, uk, de and hi, then `it` after a marker and `me` as
  a verb's object, 2026-10-10; next the fused forms with N5);
- N5: suffixes attached in the agglutinative languages, with N3's fused forms (design:
  `multilingual/FUSED_FORMS.md`, 2026-10-10);
- N4: the ja/tr/bn handler heads (`クリック を で`, `tıklama i üzerinde`, `ক্লিক তে`): one marker, written
  onto the event (ja `クリックで`, bn `ক্লিকে` and tr `tıklamada` since 2026-10-11; the readers keep taking
  the spaced heads). Done; the forms wait on native review;
- N6: the article and marker slips.

**Step 5 — native review of what changed** (N8, V2, V3, `packages/semantic/NATIVE_REVIEW_NEEDED.md`).
One reviewer each for es, de, ru and ja would have caught N3 and N4 on sight. The community intake
exists (policy 13).

**Exit:**

- the leak ratchet runs in CI;
- event names are native wherever a round-tripping word exists;
- pronoun case is right in the 13 languages;
- the leak rate target (set at Step 1) is met.

**Owner decision 2026-10-11 (the order in force).** Correctness is measured and strong (command
shapes: silent pairs 7,614 → 19 since M1's first run); naturalness moved on a proxy no native speaker
has checked (`NATIVE_REVIEW_NEEDED.md`: 226 items, none reviewed); 9.3% of authors' script lanes are
refused; no gate reads code a native speaker writes; `semantic-parser.ts` grew 8,871 → 9,494 lines in
five days. So: finish N4 (ja, bn, tr) → release 4.5.0 → **no new naturalness form until native review
returns** (the case residue, N6 and every other form wait) → the review packet (ja, es, de, ru; answers
come back without hand copying) and the hand-written-input gate (the harness now, inputs from native
writers later, never seeded with our renders; recruiting is the owner's job) → the reliability rows
below → M3. Every PR records `semantic-parser.ts`'s line count.

### Reliability (after M2, before M3): the silent pairs, then the common refusals

**Why.** In the command-shape gate 2,537 of 27,240 lanes are refused: safe, but to a user it does not
work. 1,626 are LOUD families (shapes semantic does not model), 911 are shapes it models.

**Work, in order.** (1) The 19 silent pairs: ms/pl `… is undefined` (8), pl/sw `closest … to …` (3),
it `get … in me` (3; done 2026-10-12: `get`'s destination role, which no reader used, took Italian's `in`), qu/vi `if no <span/> in #box where …` (2), qu possessive chains (2), id `when my
@data-x changes` (1); each fixed, or its reason written in `SILENT_FAMILIES`. (2) Refusals by reach:
handler-head counts (`on click 1`; done 2026-10-12: 375 lanes, with every head clause bn, it and th
dropped, `on click elsewhere` among them; residue P61), `wait for <custom event>` (P52, done), pseudo-class
queries (`<:checked/>`; done 2026-10-12: 161 lanes; the two cases left are P62's), rare values (escaped class names, comma queries, `(w)px`, `[@a]`, `it @a`, a dotted path before `of`, `set {…} on obj`; done 2026-10-12: 202 lanes, with qu's `fetch … as JSON`), collection expressions (P57; done 2026-10-12: 154 lanes, 2 of them silent), a query's scope inside a phrase (P62; done 2026-10-12), then `transition` with two properties
in SOV, and the rest by the regen tool's family table. A refused pair that starts to render can come out silent: the
command-shape dry run shows each move.

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

**Stamped 2026-10-12, when M3 started (after the reliability rows: rare values #1480, P57 #1481, P62):**

- `semantic-parser.ts`: 9,680 lines (`wc -l`; 9,494 on 2026-10-11, 8,871 on 2026-10-06).
- Copied type lists: 139 literal `expectedTypes: [...]` in `src/patterns/*.ts` (158 on 2026-10-06), 5 files reading
  shared lists (`generators/role-types.ts`). After (a)'s first PR: 63; after its second: 46 (the `for` loop, the
  `on` heads, `if`/`unless`, wait's event, fetch's options, viewTransition's style). Of those left, 8 copies are
  narrower than their schema on purpose (es/qu/zh set values, `set.ts` says why), and the rest are wider or
  narrower copies to judge one by one (repeat's and pick's sources, en append/prepend/trigger, pl/uk hide's
  style), or roles their schema lacks (repeat's and wait's conditions, wait's source).
- Readers per question: an end word still has nine (`VALUE_READING.md` C3).

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
   - Taken so far: `null` as a loanword in 7 languages, hi `no`, qu `and`, tl/tr `includes`,
     counted loops in each language's own words (PR 131), and the M2 sheet (2026-10-08).
   - Don't register words into profiles "for hygiene".
   - Never `_`-join a multi-word keyword.
6. **English-kept surfaces, by design:**
   - type names (`as Int`: the conversion word gets the language's own, sheet A4);
   - fetch response types;
   - `set … on`;
   - `url` (push/replace, and `go to url`: sheet C2), `dom` and `view transition` (C3);
   - `debounced at` / `throttled at` (C1);
   - `equal to`;
   - `using view transition`;
   - brace and bracket interiors (array literals, attribute selectors, indexes), and a call's arguments;
   - a property name its language's reader cannot bring back (`my children`, `my style[…]`);
   - a clause no pattern models, and upstream's `on` head forms, kept as written (M1);
   - `global x` until it has a word (sheet C4; `catch`, `finally` and `element x` have theirs: A9, B2,
     A10);
   - unsafe event names;
   - `js … end` bodies (never translated).

   The M2 sheet revised these (2026-10-08): query-scope `in` and conversion words get words (A5 and A4,
   done).
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
| English leaks                    | English words, event names, `me` case in renders (corpus, shapes) | whether a native word is natural (M2 step 5, review) |
| _(none yet)_                     | README examples                                              | → D8                                                  |

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
