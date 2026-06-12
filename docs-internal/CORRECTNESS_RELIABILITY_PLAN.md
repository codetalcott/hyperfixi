# Multilingual correctness & reliability — assessment + plan

> **Thesis:** the system **parses reliably** (~99.4% non-null) but does not always
> parse **correctly**. The headline metrics (parse rate, degenerate count) hide a
> ~7×-larger band of **lossy passes** — translations that parse and pass CI while
> silently dropping commands. This plan reframes the work around **fidelity**
> (avgFidelity 0.928 at writing; **0.9495 as of #356** — see §7) and prioritizes
> correctness/reliability **before** behaviors (Track 2 runtime).

## 1. The measurement (full fidelity distribution)

A sweep of **24 languages × 154 gate patterns = 3696 instances** (each parsed via
`@hyperfixi/core/multilingual`, fidelity = fraction of the English reference parse's
command actions present — the same signal the gate ratchets on):

| Bucket                                             | Count   | Share     |
| -------------------------------------------------- | ------- | --------- |
| **Faithful** (fidelity = 1.0)                      | 3133    | 84.8%     |
| **Lossy** (0.5 ≤ fid < 1.0 — parses, drops ≥1 cmd) | **471** | **12.7%** |
| **Degenerate** (fid < 0.5 — the tracked headline)  | 69      | 1.9%      |
| **Failed** (null parse)                            | 23\*    | 0.6%      |

\* In-scope null failures only; the 5 `component-*` HTML-template patterns (110
instances) are markup, correctly excluded from the semantic-parse set.

**Key point:** the **lossy bucket (471) is ~7× the degenerate bucket (69)** we've been
optimizing. The degenerate ratchet only catches the worst ~13% of the incomplete-parse
problem. The fetch-droppers fixed in #330 (es/pl/id/sw/he, sitting at 0.67) were all
lossy — invisible to the degenerate metric until measured directly.

### Per-language fidelity (avgFidelity, worst → best)

```
zh 0.865 | ms 0.879 | qu 0.882 | id 0.889 | ja 0.901 | he 0.904 | sw 0.905 | hi 0.908
pt 0.913 | de 0.914 | ko 0.915 | fr 0.921 | tr 0.931 | ar 0.934 | es 0.944 | it 0.949
tl 0.954 | vi 0.957 | ru 0.963 | uk 0.963 | bn 0.965 | th 0.979 | (en 1.000)
```

Cross-language avgFidelity **0.928**. Parse rate (~99.4%) overstates health by ~7pts of
fidelity. The lowest-fidelity languages (zh, ms, qu, id, ja) carry the most lossy passes
(zh 38, qu 36, ms 34, id 32, de 27).

## 2. What's actually being dropped (leverage analysis)

Across all lossy+degenerate instances, the most-dropped commands:

| Dropped cmd    | Count | Cluster                                                              |
| -------------- | ----- | -------------------------------------------------------------------- |
| `if`           | 109   | **Control-flow conditions** — if/unless headers don't form           |
| `put`          | 88    | Mostly **inside then-chain / block bodies** (`… then put it into Y`) |
| `behavior`     | 60    | Track 2 (behaviors) — deferred                                       |
| `set`          | 49    | then-chain / block bodies                                            |
| `on`           | 36    | event head mangled (SOV/VSO reorder, modifiers)                      |
| `empty`        | 30    | `is empty` predicate (condition vocab)                               |
| `wait`         | 24    | block/loop tails                                                     |
| `focus`        | 23    | `focus first <input/> in closest <form/>` positional                 |
| `for`/`unless` | 23/21 | loops / conditionals                                                 |

Top lossy patterns (instances across 23 non-en languages): `first-in-parent` (23),
`focus-trap` (23), `template-literal-list-build` (23), `form-submit-prevent` (22),
`form-disable-on-submit` (22), `fetch-do-not-throw` (22), `unless-condition` (21),
`if-empty` (21), `input-validation` (17), `if-exists` (15), `append-content` (13),
`swap-content` (11), `modal-close-backdrop` (10), `event-debounce` (10).

**Diagnosis:** the single dominant correctness gap is **control-flow body parsing** —
conditionals (`if`/`unless`, ~130 drops with `empty`) and the commands inside/after them
(`put`/`set`, the then-chain bodies). `put`/`set` are not a simple keyword/marker issue
(a bare `put X into Y` parses fine in 22/23 languages); they drop because the **enclosing
block/then-chain** collapses. So conditionals and then-chain bodies are one campaign.

A `put X into Y` spot-check (kept in 22/23, only zh drops) confirms the simple commands
are fine — the loss is structural (the block/condition wrapper), not lexical.

## 3. Reliability gap in the harness (fix first)

The gate ratchets on **degenerate flips** (faithful→<0.5) and parse-rate (±2pt). It does
**not** track the lossy band, so a faithful→lossy regression (a command silently dropped
at, say, 0.8) **passes CI invisibly**. That is the reliability hole: the metric that
would catch silent command-drops isn't enforced.

**R0 (do first): add a per-language avgFidelity ratchet + lossy-pass count to the gate.**
Record `avgFidelity` and `lossyPasses` per language in the baseline; fail CI on an
avgFidelity drop beyond a small tolerance (mirroring the degenerate ratchet's spirit).
This makes every command-drop visible and prevents correctness backsliding while we work
the clusters below. (Low-risk harness change; the data is already computed per run.)

## 4. Prioritized tracks (correctness before behaviors)

### Track A — control-flow body parsing (biggest lever) — ~150–200 lossy/degen instances

Conditionals and their bodies. Members: `if-empty`, `if-exists`, `unless-condition`,
`input-validation`, `form-submit-prevent`, `form-disable-on-submit`, `modal-close-*`,
and the `put`/`set` drops in `… then put …` tails. This is the B1 condition campaign
(BLOCK_BODY_CONDITION_SCOPE.md §3.3) **re-scoped with the lossy data** — far larger than
the degenerate count implied. Sub-mechanisms (each its own measure-first PR):

- **A1 — predicate vocabulary** (`is empty`, `I match …`, `exists`): mirror the Spanish
  profile's predicate keywords into more languages (de/sw shipped; he/ja/ko deferred for
  reorder reasons). Recovers `if`/`unless`/`empty`/`matches`.
- **A2 — then-chain / block-body attachment**: the `… then put it into Y` body after
  `fetch`/`if`/`async` collapses (drops `put`/`set`). Generalize the event-body recovery
  to then-chain positions (additive, guarded — the proven #329 shape).
- **A3 — SOV/VSO event-head + condition reorder** (ja/ko/he/ar): the highest-risk slice;
  the handler collapses to a bare event. Dedicated parser work, sequence last.

### Track B — positional & content clusters — ~50–80 instances

- **B1 — `focus first <input/> in closest <form/>`** (`first-in-parent`/`focus-trap`):
  the positional `first … in …` query drops `focus` across ~all languages. One positional
  fix clears two patterns ×23.
- **B2 — `append`/`swap`/`prepend` content** (`append-content`, `swap-content`): content
  commands drop in block/then contexts.
- **B3 — long-tail**: `wait` tails, `event-debounce` (ar/tl `${…}`-in-URL tokenizer),
  `keydown-key-is-syntax`.

### Track C — low-fidelity language audits — zh / ms / qu / id / ja

The bottom-5 by avgFidelity. After Tracks A/B land, sweep each for residual
language-specific drops (zh has 4 hard nulls + 38 lossy; ms 34 lossy + 5 nulls). Some are
keyword/marker alignments (the cheap id-toggle/get-value family), some are structural.

### Deferred — Track 2 behaviors (60 `behavior` drops + the null behavior defs)

`behavior … end` definitions don't parse/run — a **runtime** track, not parsing/i18n.
Explicitly **after** correctness per the current priority. (Also out of scope: the
`component-*` HTML templates.)

## 5. Method (unchanged — it works)

Every item: **measure-first probe** (confirm the mechanism and the dropped-command set
before editing) → **one mechanism per PR** → **clean A/B** on the same DB (avgFidelity up,
0 parse-rate drops, 0 faithful→degenerate flips) → **lock test** + **regenerate baseline**
(patterns.db uncommitted). This session's 3 PRs (get-value −2, fr/pt fetch −4, es/pl/id/sw/he
fetch +fidelity) validate the loop; the recurring lesson is that **the documented diagnosis
is often wrong until probed** (hi `bind` → structural; B3 → fetch gap, not then-chain;
`${…}`-in-URL → red herring that surfaced the broad fetch gap).

## 6. Sequencing recommendation

1. **R0** — avgFidelity ratchet in the gate (reliability floor; unblocks everything else).
2. **Track A** (control-flow bodies) — biggest fidelity lever; multi-PR, A1 → A2 → A3.
3. **Track B** (positional/content) — interleave the cheap ones (focus-first-in-parent).
4. **Track C** (low-fidelity audits) — sweep zh/ms/qu/id/ja for residual cheap wins.
5. **Then** behaviors (Track 2).

Target: avgFidelity **0.928 → ~0.97+** (clearing the lossy bucket) before behaviors.

## 7. Status update (2026-06-12, post-#365 — overnight run)

**avgFidelity 0.9608 | lossy 189 | degenerate 67 | R1 avgRoleFidelity 0.7505
(recorded)**. Nine PRs in one overnight session (#357–#365) cleared **127 lossy
instances** (316 → 189; avgFidelity 0.9495 → 0.9608). The Phase-0 sizing rule
("don't trust §9's yield estimates") paid for the whole night: the baseline's
own lossy-pattern frequency table revealed three near-universal clusters §9
hadn't ranked, and the two largest fixes were one- and two-line schema changes.

- **#357** — generated if/unless condition `expectedTypes` widened to match the
  en handcrafted set (`['expression','reference','selector']`). A bare reference
  condition (`ello`/`it`/`оно`) failed the type check and the `if` wrapper
  silently dropped in EVERY language. −41 lossy.
- **#358** — generated for-loop: patient accepts identifier loop vars + a
  per-language `markerOverride` table for the dict's `in`-connective. The only
  live `for` pattern had been en's. −17 (SOV clause-final tail remains).
- **#359** — `is empty` predicate adjective added to `keywords.empty`
  alternatives in 11 profiles (the pl-pusty/es-vacío proof generalized). −22.
- **#360** — ja tokenizer: a single-char particle reading must not split a
  longer keyword (もし read as も+し, so NO ja conditional could ever anchor —
  the documented "SOV generator gap" diagnosis was wrong; the patterns all
  existed). Also dissolved the ぼかし(blur)-verb hijack. −8 lossy, −2 degen.
- **#361** — `unless` keyword added to pl/it/ru/uk/th profiles (the 14 failing
  languages had NO keywords.unless, so no pattern was ever generated);
  single-token dict realigns it salvo / ru кроме / uk крім. ko 아니면 was tried
  and reverted — it is ko's _else_ word (R0 caught the flip). −5.
- **#362** — positional put (before/after) for de/fr/he/id/ms/pt/sw/zh + zh
  then-set fix (之后 was a curated then-keyword, splitting put-after's clause;
  那么 — what the transformer actually emits — replaced it). −16.
- **#363** — qu patient-first SOV variants for add/remove/put (transformer
  emits patient-first; handcrafted patterns were source-first only). −11.
- **#364** — qu dict log → qillqakuy (qillqay is copy) + pruned 2 stale
  fix-translations.sql overrides that re-stomped the set/churanay realign on
  every populate. −7. qu overall: 0.8923/32-lossy → 0.9471/12-lossy.
- **#365** — R1 role-fidelity ratchet (§8) shipped: per-language
  `avgRoleFidelity` recorded + ratcheted. First measurement mean **0.7505**
  (worst: hi 0.543, qu 0.648, ko 0.688, it 0.693, ja 0.703) — the predicted
  larger band, now visible and non-regressable. Burn-down deliberately NOT
  started (out of parsing-track scope).

Ship line (0.97 / lossy<100) not reached; honorable-finish threshold 0.965 also
not reached — the universal clusters bent the curve (+0.0113 in one night vs
+0.0009/instance economics), but the residue is genuinely per-language tails
now. Worst languages: hi 0.928, ko 0.931, id 0.933, ja 0.934, he 0.934.
Largest residual clusters: keydown-key-is-syntax (9), unless-condition (9,
SOV-final), if-exists (9, put/set tails), fetch-loading-state (9),
event-debounce (8). One probed-but-dropped branch: the ko i18n event-marker
(see handoff) — net +0.0008 but 4 ko faithful→lossy flips, correctly blocked
by the R0 ratchet.

## 7b. Status update (2026-06-12, post-#372 — overnight run, session 3)

**avgFidelity 0.9690 | lossy 122 | degenerate 63 | R1 avgRoleFidelity 0.7552**.
Seven PRs (#366–#372) cleared **67 lossy + 4 degenerate** (189 → 122;
avgFidelity 0.9608 → 0.9690). Honorable-finish threshold 0.965 passed mid-run;
the 0.97 half of the ship line is ~11 instances away, but lossy<100 needs
another ~22 — one more session.

- **#366** — fused-event body walker recovers verb-mid SOV clauses:
  parseBodyWithGrammarPatterns gained parseClause's per-clause
  parseSOVClauseByVerbAnchoring fallback (fires only when nothing in the
  clause matched). −10 (bn/ja/qu/tr then-tails) and the precondition for #367.
- **#367** — ko event marker 할 때 end-to-end (the §10 carry-over, landed):
  i18n profile marker + insertMarkers suppression for SELECTOR-shaped
  pseudo-events (the dangling locative-`on` target — also strips ja's spurious
  で) + trySOVEventExtraction consumes the optional two-token 할 때 phrase and
  lets it confirm custom identifier events. All 4 documented probe flips
  resolved. ko 0.9307 → 0.9574, lossy −3, degen −2.
- **#368** — tl/ar VSO event recovery: ar آخر (positional last!) removed from
  the end-keyword set (it chopped every clause at a positional last — found by
  token-tracing parseBodyWithClauses); tl 'kung' (= if) removed from the
  kapag-alternatives; Stage 2.5 runs tryMidStreamEventExtraction for VSO when
  Stage 2 matched NO command (single-line-gated: a multi-line behavior block
  must not flatten — ar behavior-removable caught it). −5 incl. both
  focus-traps WITHOUT the planned Stage-1.5 reorder.
- **#369** — SOV clause-final for-loop: `for` un-skipped in buildVerbLookup so
  the verb-anchoring fallback anchors the trailing for-word; dict realigns
  ko 동안→각각 (동안 is while), qu rayku→sapankaq (doubles as by),
  hi के_लिए→हेतु (underscore split). −5 (bn/ja/ko/qu/tr); hi blocked by an
  into-pattern matching first (tracked).
- **#370** — marker-less fetch ×8 (de/ru/uk/it/vi/th/ar/tl): for `fetch <url>`
  the transformer emits no source marker but the generated pattern requires
  one — the existing fetch-fr/pt markerlessFetch table extended. −16: BOTH
  fetch-loading-state and event-debounce cleared in all 8.
- **#371** — set patterns must not claim put verbs: set-de/fr/pt listed
  setzen/stellen, mettre, colocar (the PUT verbs) as set-alternatives; the
  dicts emit distinct verbs, so every transformed put parsed as set with
  swapped roles. One collision, four clusters (if-exists, async-block,
  fetch-with-headers, when-value-changes). −12.
- **#372** — dict↔profile realigns: clear ×8 (the dict clear words are remove
  words in their profiles — keydown-key-is-syntax cluster; he had no entry),
  commands.blur ×5 (dicts had blur only as an EVENT word — blur-element, plus
  sw if-empty/input-validation), pt unless a_menos→salvo (underscore split).
  −16. R1 0.7525 → 0.7552.

Worst languages now: hi 0.928 (untouched tonight, 8 lossy + 8 degen,
role 0.543), id 0.933, he 0.934, ja 0.938, ms 0.953. th reached 1.0000;
es/it 0 lossy. Largest residual clusters: unless-condition (8, SOV-final +
zh 把), if-exists (6, body-word destinations), possessive-dot triple
(get-attribute/method-call/input-mirror, id/ja/ms/vi), he tail (15: the
send/trigger/tell cluster), behavior-\* degenerates (~40 across languages —
untouched all sessions).

## 7c. Status update (2026-06-12, post-#374 — session 4): SHIP LINE REACHED

**avgFidelity 0.9717 | lossy 99 | degenerate 63 | R1 avgRoleFidelity 0.7575**.
Two PRs (#373, #374) cleared 23 lossy instances and crossed BOTH halves of
the ship line (≥0.97 AND lossy<100). 16 PRs total across sessions 2–4
(189 → 99 lossy; avgFidelity 0.9495 → 0.9717).

- **#373** — the lexicon emit-mismatch RATCHET
  (`packages/semantic/test/lexicon-emit-mismatch.test.ts`): every i18n dict
  `commands.<action>` emission is statically cross-checked against what the
  semantic side reads that word as (profile keywords + pattern head literals).
  New mismatches fail CI; 127 pre-existing ones are an allowlisted baseline to
  prune. This is the architectural answer to the "grep the word in all four
  places" meta-lesson — the manual grep is now a ratchet. Its FIRST RUN
  generated the realign batch shipped in the same PR (17 dict rows, 7
  languages: trigger-as-call pl/ru/uk, take-as-remove/get qu/tl/tr,
  render-as-show id/qu/tl, settle/morph unread id/qu/tl/sw, sw make unread)
  → −17: trigger-event ×3, take-class-from-siblings ×2, render/settle/morph
  templates ×3 each, sw if-exists + make-element + make-toast-element.
- **#374** — he accusative את: the 15-lossy he tail was ONE mechanism. The
  transformer marks every verb's object with את; ~40 generated he patterns
  embed it before {patient}, but send/trigger/wait name their object slot
  event/duration, so their generated patterns are marker-less and the clause
  dropped. Handcrafted את-marked variants (send-zh-ba shape) + the tokenizer's
  את→you homonym mapping removed. Probed-and-REVERTED: dropping את from the
  token stream (breaks the 40 patterns embedding it). −6.

Per §9's stopping rule the parsing track now STOPS: the marginal session
clears ~5 hard instances while R2 removes whole categories of production
risk. Remaining parsing tail (99 lossy, 63 degen) is documented in §10.

## 7d. Status update (2026-06-12, post-#375 — session 5): R2 SHIPPED

**R2 executionFidelity 0.5141 (23 languages, recorded + ratcheted) | parsing
floor unchanged (avgFidelity 0.9717 | lossy 99 | degenerate 63 | R1 0.7575).**
One PR (#375) — the R2 execution smoke ratchet (§8), built and baselined in a
single session. No parser/dict files touched.

- **Mechanism**: semantic parse → buildAST → `runtime.execute` installs the
  `on click` handler in a fresh jsdom fixture → dispatch click → diff the DOM
  (classes / attrs / inline style / leaf text) → exact-match the effect
  signature against the en reference's. Curated 17-pattern subset
  (toggle/add/remove/put/set/show/hide/increment on click), locked by test.
  Per-language `avgExecutionFidelity` + `executionFailures` in the baseline;
  gate fails on ANY pass→fail flip (tolerance 0 — harness measured
  byte-identical across full sweeps). All in
  `packages/testing-framework/src/multilingual/validators/execution-validator.ts`
  - orchestrator/reporters/CLI wiring.
- **Infra discovery (measure-first paid again)**: no new browser harness was
  needed. `packages/core/src/multilingual/e2e-execution.test.ts` had already
  proven parse → buildAST → execute in jsdom; R2 is that loop made
  corpus-driven and ratcheted. Playwright was deliberately NOT used: jsdom is
  in-process, deterministic, and runs inside the existing multilingual CLI.
- **First measurement — the predicted new band, 3rd time in a row**:
  executionFidelity mean **0.5141**, 190 failing instances across 13/17
  patterns. Worst: qu 0.118, hi 0.294, ko 0.294, then a 10-language 0.412
  shelf. Best: **he 1.000 and zh 1.000** (he's perfect score is the #374 את
  mechanism paying off at runtime — spot-verified). Burn-down deliberately
  NOT started (§8 rule).
- **Dominant failure classes (probe evidence, half-confirmed mechanisms)**:
  (1) _dropped destination role_ — `show #modal` / `toggle .open on #menu` /
  `increment #counter` execute against `me` instead of the selector target in
  ~18 languages; this is the R1 role-loss band becoming execution-visible
  (R0 scores several of these 1.0). (2) _ja AST mis-builds_ — connective
  words leak into the AST as commands (`Unknown command: into/from`); the
  effect often still lands, then the bogus trailing command throws.
  (3) _ko literal quoting_ — `put "Done!" into me` writes `"Done!"` with
  quotes (`text["Done!"]` vs en `text[Done!]`). (4) _possessive-dot_ —
  `set my.textContent/innerHTML/*style` diverges in hi/id/it/ko/pl/ru/th/uk(/vi)
  — the §10 possessive-dot triple, now measured at runtime.
- **Effects-only match (deliberate)**: trapped runtime errors are diagnostic,
  not part of the signal — their attribution rides on unhandled-rejection
  timing (racy), while the DOM snapshot is synchronous. A mis-build that
  damages behavior diverges in effects regardless. Flake control first.
- **Excluded from the subset (en reference itself doesn't execute)**:
  `toggle-visibility` (`toggle @hidden`), `set-text-basic`
  (`set #output.innerText`), `set-attribute` (`set @disabled`) — these are
  RUNTIME gaps visible even in English; candidates for a runtime track, not
  translation work.

## 7e. Status update (2026-06-12, post-#380 — session 6): R2 BURN-DOWN

**R2 executionFidelity 0.5141 → 0.9130 | failing instances 190 → 34 |
13/23 languages at 1.000 (ar bn de es fr he pl pt ru sw tr uk zh) | parsing
floor byte-identical (avgFidelity 0.9717, lossy 99, degen 63) | R1 0.7575 →
0.7844 (newly captured source/destination roles raise recall).** Five PRs
(#376–#380), each one mechanism, each baselined and locked. The §10
role-injection diagnosis held exactly as probed — the first session where
the documented mechanism survived contact with the probe.

- **#376 — spurious destination:me (the ~18-language shelf, −104 instances,
  mean → 0.7801).** The SOV/VSO event-handler wrapper generators (SVO reuses
  VSO) hardcoded `destination: {fromRole, default: me}` into EVERY wrapped
  command's extraction — including show/hide/increment/decrement, whose
  schemas declare no destination role. buildAST's mappers fill args with
  `destination ?? patient`, so the fabricated me beat the real patient.
  Fix: `eventHandlerDestinationExtraction()` defers to the wrapped schema
  (no role → no extraction; declared role keeps the schema's own default —
  benign for toggle/add/remove, whose mappers route destination to
  modifiers). en's parse shape is now mirrored exactly.
- **#377 — ko quote retention (−1, ko put now en-identical).** The
  particle-based SOV fallback (`semantic-parser`'s tokenToSemanticValue /
  tokensToSemanticValue) wrapped RAW token values in createLiteral — unlike
  pattern-matcher's parseLiteralValue. `put "Done!"` wrote `"Done!"` with
  quotes into the DOM. Both sites now strip symmetric quotes + tag dataType.
- **#378 — wrappers had NO source slot (−35, mean → 0.8721, six languages
  to 1.000).** `remove X from Y` translations: SVO/VSO silently dropped the
  from-phrase (pattern matched, trailer lossy-discarded); SOV leaked it past
  the matched span, where the verb-anchoring fallback read the から particle
  as a verb (buildVerbLookup indexes ALL profile keywords, including the
  `from` modifier) and fabricated a `from` command — Unknown command thrown
  AFTER the remove acted on the wrong target, killing the rest of the body.
  Fix: `eventHandlerSourceGroup()` — schema-deferring, position-aware
  (prepositions precede the value, postpositional particles follow it);
  trails the verb in SOV (where the transformer emits the phrase), sits
  between patient and trailing event marker in verb-first VSO.
- **#379 — SOV trailing destination (−7, bn to 1.000, ja 0.941).** The
  destination twin: the transformer emits `add X to Y`'s to-phrase
  post-verb (`追加 #item に`), but the SOV wrappers' only destination group
  sat pre-patient; the leak became a bogus `into` command + default me.
  Same generic role-group builder, destination flavor.
- **#380 — set.ts role-convention split (−9, pl/ru/uk to 1.000, mean →
  0.9130).** Handcrafted set patterns carried THREE conventions:
  {destination}+{patient} (en, what setMapper reads), {patient}+{goal}
  (bn/it/pl/ru/th/uk), {target}+{value} (vi). setMapper ignores
  goal/target/value → args EMPTY, runtime set nothing. All realigned to the
  en convention; mapper untouched.

**The session's shape:** every mechanism was the same disease in a different
organ — generated/handcrafted patterns emitting role shapes the en reference
never produces (fabricated defaults, missing slots, renamed roles), invisible
to recall-based R1, surfaced wholesale by R2's first sweep. The fix idiom
that worked five out of five times: make the emission side defer to the
command schema and mirror en's parse shape; never touch the mappers.

## 8. R1 / R2 — role-fidelity and execution ratchets (extend R0)

Action-set fidelity (R0's signal) cannot see a parse that finds the right
commands with the **wrong roles** — a swapped patient/destination executes
wrongly while scoring 1.0. Two stages, ~10× apart in cost:

- **R1 — role-fidelity ratchet (static, cheap — do first).** The harness already
  records full captured roles per parse (`test-results/results.json` →
  `parseResults[].roles`). Compare role assignments against the en reference
  parse (role name → value type/shape, not exact string equality across
  languages) and record a per-language `roleFidelity` in the baseline with the
  same ratchet semantics as avgFidelity. Testing-framework-only change; no
  parser/dict files touched, so it parallelizes with everything.
  **Expectation (learned from R0): the first measurement will reveal a new,
  larger failure band. Record + ratchet the baseline; do NOT fold its burn-down
  into the current parsing-track goal.**
- **R2 — execution smoke ratchet (runtime). SHIPPED in #375 (see §7d).**
  Executes a curated 17-pattern subset in jsdom (parse → buildAST →
  runtime.execute → dispatch → DOM-effect diff) and exact-matches each
  language's effect signature against the en reference's. Per-language
  `avgExecutionFidelity` + `executionFailures` ratcheted in the baseline,
  tolerance 0 (deterministic harness). First measurement mean 0.5141 —
  the expected larger band; burn-down is its own track, not this one.
  Expansion path: grow the subset (multi-command, control-flow, behavior-\*
  patterns) — every expansion recalibrates the averages, so it must
  regenerate the baseline and update the subset lock test in the same PR.

## 9. Endgame: parallel tracks, merge-queue discipline, ship line

The remaining work decomposes into low-overlap tracks (recent PRs touched
disjoint files by construction; the global A/B gate validates each
independently):

| Track | Scope                                                                          | Files touched                                   | Est. yield       |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------- |
| A     | ja/ko fused-if SOV generator gap (no if-event pattern anchors at all)          | `semantic/src/generators/event-handlers-sov.ts` | ~10–15 instances |
| B     | tl/ar if-first VSO reorder (mid-stream event + source in an if body)           | `semantic/src/parser/semantic-parser.ts` stages | ~5–10            |
| C     | qu sweep (Track C cheap dict↔profile realigns; qu has the largest lossy count) | qu dict + tokenizer only                        | ~15–25           |
| D     | he/id/ms/ja residual keyword tails                                             | dicts/tokenizers only                           | ~10–15           |
| E     | R1 role-fidelity ratchet (§8)                                                  | testing-framework only                          | risk reduction   |

**Serialization point:** every PR regenerates
`packages/testing-framework/baselines/multilingual-priority.json` — a guaranteed
merge conflict. Discipline: land PRs **one at a time**; at merge time, rebase on
main, rerun build → populate → gate → `--save-baseline`, then squash-merge with
an explicit `--subject`. The lock-test file appends conflict trivially at the
same anchor — resolve at integration. Never commit `patterns.db`.

**Timeboxes:** tracks A and B carry the structural-variance risk. Give each a
3–4 hour measure-first probe to confirm a mechanism; if unconfirmed by then,
demote it and redeploy onto C/D (slower per instance, never stalls).

**Ship line for the parsing track: avgFidelity ≥ 0.97 AND lossy < 100.** Then
stop and re-baseline rather than grinding the tail — at that point the marginal
session clears ~5 hard-reorder instances while the same effort on R2/Track 2
removes a whole category of production risk. If a deadline run is at risk
mid-way, drop the target to 0.965 and ship that; the ratchet keeps whatever
landed.

**Out of scope for the ship line:** Track 2 behaviors, R2 execution, the
`component-*` HTML templates, and R1's burn-down (baseline only).

## 10. Handoff — next session (written 2026-06-12, post-#380, session 6)

**R2 burn-down is past the knee: 0.9130, 34 failing instances, 13/23
languages perfect (§7e).** All four ratchets hold; the parsing track remains
STOPPED (§9). The remaining R2 mass is per-language tails — ≥6 distinct
small mechanisms, each probed this session to at least parse level. In
order of expected yield:

1. **it/th event-handler body-role drop (~6 instances + drags set-style).**
   `su clic impostare mio.textContent in "Done!"` matches the handcrafted
   `event-handler-it-full` pattern (packages/semantic/src/patterns/
   event-handler.ts:993) which captures `{action}` as a positional role —
   the body command comes out action=set with ZERO roles, while the SAME
   clause standalone (`impostare mio.textContent in "Done!"`) parses
   destination correctly via set-it-full. th identical via
   `event-handler-th-svo` (line 1470). The body re-parse path for the
   handcrafted full patterns is the site — find where the captured action
   role becomes a command node without re-running pattern extraction.
   HALF-CONFIRMED: pattern ids verified, body-parse site not yet located.
   Also note it set-it-full's value marker is `a` (alternatives su/come)
   while the transformer emits `in` — even after the body-parse fix the
   patient may need `in` added to the alternatives.
2. **ko post-verb phrase on PLAIN patterns (~4: remove/tabs/add-to-other).**
   ko corpus strings lack the 할 때 event marker (`.active 를 클릭 제거
.items 에서`), so they match plain `remove-ko-generated` — whose
   schema-ordered source group sits pre-patient (sovPosition), not
   post-verb where the transformer puts it; the schema default then
   fabricates source=me. The #378/#379 trailing-group fix only covers the
   event WRAPPERS. Candidate: trailing role groups on plain generated SOV
   command patterns too (buildTokens in pattern-generator.ts), or fix the
   ko transformer's event-marker emission so the wrapper matches at all.
   CONFIRMED at parse level (patternId probed).
3. **toggle-on-other then-scatter (bn/ja ~2 + hi/qu).** The transformer
   emits the to-phrase behind a then-connective (`切り替え それから #menu
で`); the clause splitter cuts at それから and the orphan `#menu で`
   clause is silently dropped. Transformer-side ordering bug (emit the
   phrase before the verb, or not behind then) — i18n grammar territory,
   NOT parseable away with optional groups. CONFIRMED by probe.
4. **vi untranslated `my.` (~2).** vi corpus for set-text/inner-html
   carries literal English `my.textContent` (`gán my.textContent vào …`) —
   parses to contextType 'my' (vs en 'me') with stray position fields.
   Either the vi transformer should emit `của tôi`, or the corpus rows are
   stale. Check patterns-reference data first.
5. **ja put root-not-wrapped (~1) + id increment (~1) + qu everything
   (0.412, 10 instances).** ja `"Done!" を 私 に 置く クリック で` parses as
   a bare put (event dropped) — SOV verb-final put with trailing event
   phrase; no wrapper covers that order. qu remains the worst language and
   is baseline-only (not CI-gated) — lowest priority.
6. **R2 subset expansion** — the burn-down is arguably "stabilized" now:
   multi-command patterns, then control-flow (`if-matches`,
   `unless-condition`), then behavior-\*. RULE (locked by test): any subset
   change regenerates the baseline AND updates the membership lock in the
   SAME PR.
7. **Runtime gaps visible in en** (from the subset exclusions):
   `toggle @hidden`, `set #output.innerText to X`, `set @disabled to true`
   fail in ENGLISH in the current runtime. Core-runtime track, independent
   of translation.

Mechanism idiom that went five-for-five this session (§7e): make the
emission side defer to the command schema and mirror en's parse shape;
never patch the AST mappers. The helpers to extend are
`eventHandlerDestinationExtraction` / `eventHandlerSourceExtraction` /
`eventHandlerRoleGroup` in
`packages/semantic/src/generators/command-schemas.ts`.

One discovered-but-unfixed hazard, left alone deliberately: `buildVerbLookup`
(semantic-parser.ts) indexes EVERY profile keyword as a verb-anchor except a
small skip list — the modifier keywords (into/from/before/after/until/event)
still fabricate commands when a marked phrase strands in its own clause.
#378/#379 removed the two live instances by capturing the phrases upstream;
the lookup itself is still permissive. If a new bogus-command class appears,
skip particles (token.kind === 'particle') in the verb search — から/に/へ
matched as VERBS is the root absurdity — or filter the lookup to schema
actions (careful: `for` must stay, see the comment at the site).

R2 operational notes for the next session:

- The validator lives in
  `packages/testing-framework/src/multilingual/validators/execution-validator.ts`;
  scoring in `orchestrator.scoreExecution`; ratchet in regression-reporter +
  CLI (`newExecutionFailures`, tolerance 0). Match is EFFECTS-ONLY by design —
  do not add trapped runtime errors to the match signal without solving
  unhandled-rejection attribution first (it raced probe-vs-harness in
  session 5).
- `@hyperfixi/core`'s root dist touches `Element` at module-eval time: jsdom
  globals must be installed BEFORE importing it (the validator's
  `initialize()` does this; any new consumer must too).
- The baseline now spans 24 languages while the CI gate sweeps 21
  (bn/ms/qu are baseline-only) — keep using the 24-language list for
  `--save-baseline` or those three lose ratchet coverage.
- Workflow gotcha that cost one redo: `--save-baseline` must run against a
  freshly `populate`d patterns.db (CI re-populates before the gate), and
  patterns.db must be reverted before commit.

Lock tests: the last ~15 describe-blocks of
`packages/semantic/test/multilingual-roadmap-fixes.test.ts` (#366–#374
parsing-track + #376–#380 R2 burn-down: wrapper destination deference, ko
quote stripping, source groups, trailing destination, set.ts convention) +
`packages/semantic/test/lexicon-emit-mismatch.test.ts` (the allowlist is a
PRUNE-DOWN list: fixing a dict row should delete its entry) +
`packages/i18n/src/grammar/grammar.test.ts` + the R2 locks
(`execution-validator.test.ts` subset/behavior locks and the R2
describe-block in `regression-reporter.test.ts`).

If a future session DOES return to parsing, the residual map:

- **behavior-\* degenerate mass (~40 of the 63 degen)** — multi-line behavior
  blocks; untouched four sessions running; needs block-structure parsing, not
  keyword work. Biggest single mass and also the most R2-visible.
- **hi (8 lossy + 8 degen, role 0.543)** — worst language, still untouched.
  The hi `into`-pattern matches `में …` clauses before fallbacks fire (blocks
  the #369 for-loop fix there). The #373 auditor lists hi rows to prune.
- **possessive-dot triple (id/ms/vi ~8)** — `my.getAttribute(...)` heads:
  en assembles property-paths from my:keyword; id/vi leave my an identifier.
  A tokenizer passthrough alone is NOT sufficient (probed) — the assembly
  lives in pattern-matcher property-path building.
- **ms put-with-ia (~3)** — `letak ia ke #result` fails while `letak itu ke
#result` parses, with identical-looking tokens (ia keyword(it)). Suspect
  reference-value handling in the matcher. Blocks three ms fetch tails.
- **unless-condition SOV-final (ja/tr/hi/ko/bn ~5 + zh 把 + qu)** — the
  transformer scatters unless (condition fronted, unless-word handler-final).
  Emission-side fix preferred (keep unless mid-stream like pt salvo). ko's
  dict emits 아니면 (= else, locked guard) — fix the ko dict word FIRST.
- **#373 allowlist prune-down** — 127 known emit-mismatches; most are
  commands with no live corpus pattern (catch, pushUrl), but es poner-as-set,
  de senden-under-two-actions, bn নিন take/get, id/ms ambil take/fetch are
  real latent collisions. Each prune is a permanent win the ratchet enforces.
- **tl tapos listed as BOTH then and end in the curated parser sets**; pt
  depois / es después / bn পরে are after-words in thenKeywords (the zh 之后
  class, #362) — latent, no live instance tonight.

Meta-lessons (sessions 2–4, ~16-for-16): unchanged from §10-session-3, plus:
(10) when a tokenizer-level "drop the particle" fix looks elegant, check how
many GENERATED patterns embed that particle as a required literal first —
the generator inserts profile roleMarkers into templates; (11) the auditor
(one afternoon of work) replaced three sessions of manual grepping — when a
manual diagnostic move pays off three times, mechanize it; (12) homonym
mappings in tokenizer EXTRAS lists (את→you, ja も) are the quiet killers —
the profile/dict never shows them.

Session-5 additions: (13) measure-first applies to INFRA too — the "browser
harness mini-project" was already 80% built (`e2e-execution.test.ts` proved
the execution loop; the work was corpus-wiring + ratchet semantics, one
session not several); (14) when a binary ratchet signal can race
(unhandled-rejection attribution), cut the racy half out of the signal
rather than tolerating flake — effects-only matching kept tolerance at 0;
(15) the en reference can itself be broken — always validate the reference
side first and EXCLUDE rather than score against garbage (3 of 20 candidate
patterns failed in English).

Operating mode: unchanged (measure-first probe, one mechanism per PR,
serialize on the baseline, prototype-while-CI-runs, stash with names).
18 PRs over three overnight runs, one ratchet-blocked branch, zero broken
mains.
