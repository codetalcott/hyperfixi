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

## 7f. Status update (2026-06-12, post-#385 — session 7): R2 TAIL

**R2 executionFidelity 0.9130 → 0.9821 | failing instances 34 → 7 |
19/23 languages at 1.000 (everything but hi id ja qu) | parsing floor
byte-identical (avgFidelity 0.9717).** Four PRs (#382–#385), each one
mechanism, each baselined and locked. The §10 ranking held loosely: target 1
landed as probed; targets 2/3 were partially stale (the remove/tabs/toggle
items had already cleared in the session-6 endgame — re-measure before
trusting any handoff's instance lists); the real remaining mass was the
set-trio across 8 languages, which fell to three different drifts.

- **#382 — it/th body-role drop (−12, it/th → 1.000, qu 0.412 → 0.765).**
  The handcrafted fused patterns (`su {event} {action}`, `เมื่อ {event}
{action}`) capture only the body VERB; the body's arguments trail and the
  command node came out role-less. Fix is a parser-side RETRY in
  buildEventHandler (semantic-parser.ts): when the captured action produced a
  zero-roled command, re-parse [verb..clause-boundary] with the command
  patterns and swap in the result — only if it's a single command with the
  SAME action and ≥1 role, so bodies with no standalone pattern (it
  blur/transition, th breakpoint/put) keep the zero-roled action instead of
  degenerating. By construction no R0 regression is possible; the full it/th
  corpus sweep showed ~40 rows gaining roles, zero losing actions, one
  spurious beep dropping (now en-identical). Companions: set-it-full gained
  the transformer's `in` marker; set-th-simple's broken positional patient
  became the ใน marker group. NOTE: node.roles is a Map — an Object.keys()
  acceptance check silently never fires (cost one debug round).
- **#383 — ko set marker drift (−3, ko → 1.000).** setSchema's ko patient
  markerOverride said 으로; the ko dict translates set's `to` as 에. No
  generated pattern matched, the particle fallback INVERTED the roles (를 →
  patient, 에 → destination), and set wrote nothing. One-line realign to the
  dict; zero corpus rows used 으로. Three test fixtures had hardcoded the
  drifted form (official-examples, language-matrix, hyperscript-adapter
  preprocessor — the last one only surfaced in CI round 2).
- **#384 — possessive-dot heads (−10, ms/vi → 1.000, qu → 0.941).** The
  dot-notation transformer SKIPS multi-word possessives (can't prefix them
  onto `my.X`), so id (`saya punya`) and vi (`của tôi`) corpus heads stay
  literal English `my.textContent`; ms emits single-token `saya_punya.X` and
  qu the romanization `noqaq.X` — forms their semantic profiles never
  listed. The possessive matcher found no keyword → raw expression instead
  of property-path(me.X) → setMapper wrote nothing. Fix: add the EMITTED
  forms to the four profiles' possessive.keywords (id/vi: `my` passthrough).
  Parse-side only, no corpus churn.
- **#385 — tl source marker (−2, tl → 1.000).** Three-way drift with the
  i18n grammar profile as odd one out: it emitted spaced `mula sa` while the
  tl dict AND semantic profile both use underscore `mula_sa` (the standard
  tl multi-word convention). Two tokens never matched the single literal;
  remove lost its source phrase and the schema default fabricated source=me.
  One-line grammar-profile fix; corpus regenerates parseable.

**Remaining 7 (per-language tails, all distinct mechanisms):** hi set trio
(3 — event-hi-bare swallows the fronted possessive as the event; hi remains
the worst language), ja/qu put-content-basic (2 — SOV put root-not-wrapped),
id set-style (1 — the TWO-WORD phrase `saya punya *background`: the matcher
reads punya as the property; new mechanism found this session), id
increment-counter (1 — dict emits tambahkan which parses as add; keyword-
collision family).

## 7g. Status update (2026-06-12, post-#387/#388 — session 8): R2 SUBSET EXPANSION WAVE 1

**Subset 17 → 19 patterns (tabs-content + accordion-exclusive) | recalibrated
mean executionFidelity 0.9542 | 9/23 perfect | failing instances 20 = the 7
carried tails + a NEW 13-language tabs-content band | parsing floor
unchanged.** Two PRs: #387 (qu restore, see below) then #388 (expansion +
baseline). accordion-exclusive passes 24/24 on arrival.

- **Eligibility probe (13 candidates, 11 excluded).** Probed 8 multi-command
  - 5 control-flow click patterns through the validator in en FIRST
    (lesson 15). Only tabs-content and accordion-exclusive have a usable en
    reference. The nine exclusions are en-side gaps, documented in the subset
    comment (execution-validator.ts) and itemized in §10.6:
  * `halt the event then toggle …` — runtime halt exits the WHOLE handler
    (patient parses as bare 'the'); the second command never runs.
  * `set @attr … on <sel>` — "Invalid selector @aria-selected" (joins the
    set-attribute/toggle-visibility family). **RESOLVED §7bb (S1):** `set @attr
to V on <scope>` now captures the `on`-scope (scope role + core scope-apply).
    The dispatchable member `tabs-aria` is in the subset and PASSES (execFid
    1.0000). The only other set@scope corpus cell, `announce-screen-reader`
    (`on success put event.detail.message into #X set @role to "alert" on #X`),
    now parses with the scope captured but stays excluded for a SEPARATE en gap —
    its body degenerates to a bare `compound` (the `on success` + `event.detail`
    put/set juxtaposition doesn't split), so its en reference produces no effect
    (verified: qu executes the same shape end-to-end, so it is NOT the scope).
  * `hide closest .modal …` — the en SEMANTIC PARSE drops the hide command
    entirely; only the following remove survives.
  * `toggle .open on next .dropdown-menu halt` — buildAST emits a
    propertyAccess node the runtime rejects.
  * `make a <div.card/>` — runtime "Invalid selector <div.card/>" (make with
    HTML-literal selector), 2 patterns.
  * **if/unless flatten IN ENGLISH** (5 patterns): `if I match .active then A
else B end` parses as flat siblings if(condition:'I') + A + B; the
    runtime rejects the bare if. The §2 dominant cluster is not a
    translation problem — control-flow R2 expansion is BLOCKED on it.
- **The tabs-content band (13 langs: bn he hi it ja ko pl qu ru th tr uk
  vi).** A 4-command juxtaposed chain (remove/add/hide/show) — en itself
  drops cmd 4 (`show the next <div.tab-panel/>`), and 13 translations drop
  more. This is the multi-command-drop surface the expansion exists to
  expose; it is RECORDED in the baseline, not folded into the old tail.
- **qu incident + #387.** The session opened with the committed baseline
  unreproducible: 6 curated qu rows (fix-translations.sql glottalized
  spellings) failed execution on a clean ordered rebuild of HEAD, though the
  baseline said they passed. Root causes (both fixed in #387, no baseline
  change needed): (1) tokenizer keyword table lacked `ñit'iy`, so the
  word-walk split it at the framework-injected English passthrough `it`
  (ñ + it + 'iy — event parsed as literal "'iy"); (2) the hand-crafted
  `event-qu-source` wrapper stole a body command's own `manta` from-phrase
  (qu SOV puts it right after the event) and the non-action
  buildEventHandler path discards wrapper roles other than `event`, so any
  match lost the phrase — removed, nothing legitimate matched its shape.
  **Process lesson (extends the stale-handoff rule): before regenerating a
  baseline, first verify the COMMITTED one reproduces — a clean rebuild +
  `--regression` run is the cheap check. The §10 save-from-transitional-
  build gotcha recurred and would have silently laundered a real regression
  into the new baseline.**

## 7h. Status update (2026-06-12, post-#393 — session 9): en if/unless EXECUTES

**Both reopened tracks (§9 owner decision) land their first increment in one PR
(#396). en control-flow now PARSES and EXECUTES end-to-end** — `if I match
.active then A else B end` and `if target matches .modal-backdrop hide …`
produce the correct DOM effects in a jsdom run. Three fixes, each independently
gated:

1. **Parsing — en if/else fold (`semantic-parser.tryParseConditionalBlock`).**
`parseBodyWithClauses` folds an English-order `if <cond> [then] <body> [else
<body>] [end]` into a `ConditionalSemanticNode`: full condition capture (up to
   an explicit `then` or the first command verb, copula-guarded so `is empty`
   stays in the condition) + recursively-parsed then/else branches. `unless` is
   left flat on purpose — the conditional node is always action `if`, and folding
   `unless` relabels its action and desyncs the cross-language action-set
   comparison (caught as a 12-language faithful→lossy mid-implementation). Action
   fidelity is recursion-aware, so nesting changes no reference action set — the
   gate is green with **no baseline change**.
2. **Core runtime — `propertyAccess` evaluator (§10.7 gap).** The core parser
   emits `memberExpression`, so `evaluateAST` never handled `propertyAccess`; the
   semantic→AST builder emits it for property paths fed straight into the runtime,
   so valid semantic ASTs crashed `Unknown AST node type: propertyAccess` (this
   blocked dropdown-toggle). Added an evaluator sharing `resolveNamedProperty`
   with member access.
3. **Expression parser — keyword comparison operators.** `is`/`matches`/
   `contains`/`in` were matched by `checkValue()` (peek-only) but read via
   `previous()` without advancing, so the operator was unconsumed and the operand
   mis-attributed (`target matches .modal-backdrop` → broken `matches.modal`).
   Now they consume properly, `match` aliases `matches`, and a selector tokenizes
   after a comparison keyword.

**Validation:** multilingual `--regression` gate green (all four ratchets, no
baseline change); semantic 5813, expression-parser 36, core
expressions/control-flow/parser 2580, runtime-ast-coverage 75; typechecks clean.

**Same-session follow-ups (landed after #396 merged):**

- **Remaining condition forms SHIPPED** — `exists` postfix (`#modal exists`),
  `is empty` / `is not empty` unary predicates, the possessive SPACE form
  (`my value` → propertyAccess), and contextReference `my`/`its`/`your` aliases
  in the core runtime. `input-validation` now executes BOTH branches correctly
  in jsdom; `if #modal exists show #modal` works. Locked by
  expression-parser.test.ts + runtime-ast-coverage.test.ts. Gate green, no
  baseline change.
- **R2 expansion wave 2 SHIPPED** — subset 19 → 23 (`if-condition`,
  `if-matches`, `if-exists`, `modal-close-backdrop` + a backdrop
  PATTERN_SETUP). `unless-condition` stays out (unless deliberately not
  folded); `dropdown-toggle` still excluded (the `next .dropdown-menu`
  positional mis-parse, NOT the propertyAccess gap — that's fixed).
  **Recalibration: mean executionFidelity 0.9542 → 0.7902, failing instances
  20 → 111** — the four new patterns fail in most of the 23 non-en languages
  because the conditional fold is en-only. This is the expected
  record-the-band outcome (§8); the cross-language conditional burn-down is
  its OWN track, not folded into this one. Baseline regenerated + subset lock
  updated in the same PR per the locked rule.

- **@attr family SHIPPED (wave 2b)** — the semantic value converter and
  expression parser now emit the canonical `attributeAccess` node for `@attr`
  (previously a selector node → "Invalid selector @disabled", or a bare
  identifier with the `@` lost). The core side already supported
  attributeAccess everywhere (set's resolveAttributeWriteTarget, toggle's
  evaluateFirstArg, evaluateAST). `set-attribute`, `toggle-visibility`, and
  `tabs-aria` en references now execute; R2 subset 23 → 26, baseline
  regenerated (mean executionFidelity 0.7902 → **0.8010**, failing instances
  111 → 119 from the larger surface). **`set-text-basic` is NOT a runtime
  gap** — probed: the full cascade works at source level; jsdom simply doesn't
  implement `innerText` (the write becomes an inert expando), so its en
  signature is empty. Harness limitation; works in real browsers. Excluded
  with that reason documented.

- **halt-the-event + make literals SHIPPED (wave 2c)** — the semantic halt
  mapper preserves its patient (so `halt the event then toggle …` continues the
  handler; HaltCommand already resolved the 'the' target), and convertSelector
  carries `<…>` element literals on `raw` (MakeCommand's canonical field) so
  `make a <div.card/>` creates instead of querySelector-ing. Subset 26 → 28
  (halt-propagation, make-element; #container fixture element added).
- **`next .sel` positional fold SHIPPED (wave 2d)** — the expression parser
  folds `next/previous/closest/first/last <selector>` to a call expression
  (the shape the runtime's positional expressions evaluate); previously
  `next .dropdown-menu` mangled into a `next.dropdown - menu` binary. Subset
  28 → 29 (dropdown-toggle; `.dropdown-menu` fixture element). Zero
  parse-level fidelity churn from the fold (gate green, no avgFidelity moves).

## 7i. Status update (2026-06-12, session 10): positional-phrase patients (wave 3)

**The "deep en body-parse arc" turned out to be three small pattern-matcher
gaps, not body segmentation.** `hide closest .modal` and `show the next
<div.tab-panel/>` dropped because the role matcher never RECOGNIZED the
phrase — once the role captures it as one expression, the existing clause
segmentation, the #400 expression-parser positional fold, and the core
runtime all already work. Three fixes in `pattern-matcher.ts`:

1. **`closest` joins POSITIONAL_KEYWORDS** — `tryMatchPositionalExpression`
   only fired for first/last/next/previous/random, so a `closest <sel>`
   patient/destination rejected the keyword and the whole command dropped from
   the event body. Bonus surface: destinations — `toggle .x on closest .card`
   previously captured destination literal `"closest"` (selector stranded) and
   `add .x to closest .card` silently defaulted to `me`; both now capture the
   full positional expression (closest-ancestor / accordion-exclusive
   references improved).
2. **`skipNoiseWords` skips articles before positional keywords** — `the
next <div.tab-panel/>` never reached the positional matcher because the
   article was only skipped before selectors/identifiers (tabs-content §10.5).
3. **Source-clause command-verb guard** — the positional matcher's optional
   `<marker> <selector>` source clause accepted ANY keyword as the marker, so
   in the juxtaposed modal-close-button body (`hide closest .modal remove
.modal-open from body`) it swallowed `remove` as a locative marker and the
   following command was lost. Markers whose normalized form is a schema
   action (`commandSchemas` keys — language-independent) are now refused.

**Validation:** semantic 5835 green; en references for tabs-content (all FOUR
commands, §10.5 resolved), modal-close-button, closest-ancestor now parse and
EXECUTE end-to-end in jsdom. Subset 29 → 30 (modal-close-button +
PATTERN_SETUP giving #btn a `.modal` ancestor); membership lock updated in the
same PR. **The §10.5 band inversion happened as predicted**: 58 execution rows
re-recorded (the four improved en signatures now demand correct positional
behavior the translations don't yet produce — mean executionFidelity 0.7706 →
0.6957, the recorded-band outcome, NOT a regression). Parse-level fidelity
unchanged (0.9742; one within-tolerance sw flip). Baseline regenerated; gate
green against it.

**Wave 3b (same session, post-#401): the at-end-of positional put SHIPPED.**
`put it at end of body` (make-toast-element) needed five small fixes across
the stack, found by walking the failure end-to-end:

1. **en put patterns** for `at end of` / `at start of` (patterns/put.ts) —
   the three-word position phrase matched as consecutive literal tokens,
   recorded whole in `manner`.
2. **The end-noun guard** (parseBodyWithClauses) — the `end` in `at end of`
   hit the block-terminator break and the body clause parsed EMPTY; the guard
   is sandwich-gated (previous token `at`, next token `of`), so real
   block-`end`s still terminate.
3. **putMapper reads `manner`** (was `method`, which no producer sets) — this
   also fixed a LATENT bug: `put X before Y` silently built a put-INTO AST.
4. **Core PutCommand accepts the multi-word modifier keys** (`at end of` /
   `at start of`) on the semantic-modifiers path.
5. **contextReference `body`/`document`/`window` resolve** in the core
   runtime (the builder emits these surface forms; `body` fell through to
   undefined and the put landed on `me`). The identifier path deliberately
   does NOT pre-empt `body` (would shadow user locals).

Harness: the effect snapshot now serializes **body under its own key** —
before, a body write was invisible (and the old modal-open en reference was
only scoreable because its `add .modal-open to body` WRONGLY fell back to
`me`); modal-close-button's PATTERN_SETUP also pre-adds `.modal-open` so the
body remove is scoreable. Subset 30 → **31** (make-toast-element — the last
R2 candidate excluded for an unusable en reference; en signature is one clean
line: the toast appended at end of body). Zero parse-level churn (0.9742 /
78 lossy / 63 degen identical); meanExecutionFidelity 0.6957 → 0.6452
(recorded band: the new pattern + re-scored body signatures).

**Still deferred:** cross-language positional/conditional burn-down (SOV/VSO
orders — now visible as the widened R2 band); behavior-\* degenerate mass.

## 7j. Status update (2026-06-12, session 11): cross-language conditional fold

**The conditional cluster (a) collapsed with ONE parser-routing fix.** The
baseline's per-language `executionFailures` clustered exactly as §10 predicted:
if-condition / if-exists / if-matches / modal-close-backdrop failed in ALL 23
non-en languages (92 of 253 failing cells). The mechanism was NOT a per-language
dict drift: `tryParseConditionalBlock` is already language-parameterized
(profile-driven if/then/else/end keywords), but non-en handlers match a **fused
grammar event pattern** that captures the body's first verb as `action` — and
the action-captured path in `buildEventHandler` builds a flat command +
`parseBodyWithGrammarPatterns`, which has no fold. The condition truncated to
whatever role the pattern grabbed and the branches flattened into siblings
(runtime: "if command requires a condition to evaluate"). Two fixes in
`semantic-parser.ts`:

1. **buildEventHandler routes fused `action='if'` through the fold** — rewind
   to the if-keyword token, parse the remaining body via `parseBodyWithClauses`
   (where the fold lives), and swap in ONLY when a conditional actually folded;
   anything else falls through byte-identical. `unless` stays unfolded
   (action-relabel desync, see the fold's own comment).
2. **`joinTokenText` normalizes keyword tokens** in the folded condition raw —
   the core expression evaluator reads English operator words only, so a
   translated condition (`#modal 存在する`, `si … existe`, `jest pusty`) is
   unevaluable as-is while its normalized join (`#modal exists`, `is empty`)
   runs. Identifiers/selectors/literals keep their surface value; en unchanged.

**Result:** if-condition 23→3, if-exists 23→1, if-matches 23→4,
modal-close-backdrop 23→6 failing languages; meanExecutionFidelity **0.6452 →
0.7546**, failing cells **253 → 175**. Parse-level: avgFidelity 0.9742→0.9741,
lossy 78→80, degen 63 unchanged. The +2 lossy are ko if-empty/input-validation
faithful→lossy flips (within tolerance) and are HONEST: the ko SOV transformer
emits a scrambled conditional (`… 이다 추가 …` = "is add" — the copula directly
before the then-branch verb, the empty-adjective stranded inside the add), so
the old faithful 1.0 was an action-set accident on a broken translation. The
fold's copula guard now swallows the add into the condition. Realigning the ko
transformer's SOV conditional emission is a tracked dict/transformer-layer
follow-up (NOT a parser bug). Side effect of (2): id/pl/it/vi if-empty now fold
the `is empty` predicate INTO the condition (the en-reference shape); the two
empty-predicate test families accept either shape (folded condition or the
flat-compromise `empty` command for languages whose copula doesn't normalize —
fr/pt/zh/ru/uk).

**Remaining R2 clusters (next session):** make-toast-element ×23 +
accordion-exclusive/tabs-content ×22 + modal-close-button ×21 (multi-command /
positional bodies); halt-propagation ×18; closest-ancestor + dropdown-toggle
×13 (positional capture, same 13 Latin-script langs — cluster (b));
modal-open ×12 (SOV/non-Latin); conditional residue: hi/ko/qu/ru/uk/zh on
modal-close-backdrop, id/qu/tr/zh on if-matches.

## 7k. Status update (2026-06-13, session 12): cross-language positional normalize

**The positional cluster (b) + most of the multi-command positional bodies
collapsed with ONE parser fix — the positional analog of §7j's joinTokenText.**
`tryMatchPositionalExpression` (pattern-matcher.ts) built the captured `raw`
from each token's SURFACE value, so a source-language positional keyword
(`cercano`, `nächste`, `次`, `다음`, `التالي`, `الأقرب`) survived into the role
value. The core's positional expression parser is English-only (`next(...)`,
`closest(...)`), so the runtime either errored ("got number"), dropped to `me`,
or — with the keyword silently ignored — matched EVERY element (e.g.
`show <div.tab-panel/>` revealing all panels instead of the next one). Fix: the
leading positional keyword and the optional locative source marker (`in`/`from`)
now contribute their NORMALIZED English form to `raw`; selectors/identifiers are
code and keep their surface value (en byte-identical).

**Result:** meanExecutionFidelity **0.7546 → 0.8471**, failing cells **175 →
109** (−66). tabs-content 22→0, dropdown-toggle 13→0, closest-ancestor 13→2,
accordion-exclusive 22→8, modal-close-button 21→15. Parse-level byte-identical
(avgFidelity 0.9741, 80 lossy, 63 degen — only the execution layer moved, since
the change touches only the captured expression's raw text the runtime reads,
not the action set or role shapes). Gate green; baseline regenerated. 7
cross-language unit tests added (R2 wave 5 block).

**Residuals on the targeted patterns are now DISTINCT, separate-layer issues
(not parser bugs this fix introduced):**

- **de `nächste`→`next` collision** (accordion/modal-close-button de): German
  `nächste` means both "next" and "nearest"; the tokenizer normalizes it to
  `next`, so a de "closest" surfaces as `next` and the wrong element is hit.
  Needs a de dict/normalizer disambiguation (closest = `nächstgelegene`?) —
  dict-layer.
- **`body`/`körper`/`جسم`/SOV body source not recognized** (modal-close-button
  ja/ko/ar/de): `remove .modal-open from body` captures source `body` in en/es
  (cuerpo→body) but ja/ko/ar/de leave it untranslated, falling back to `me`.
  Needs the per-language `body` contextReference word in the dict — dict-layer.
- **ja/ko SOV destination-position positional drop** (accordion ja/ko):
  `最も近い .accordion-item に` (closest in DESTINATION role) drops to `me`,
  while the SAME `最も近い` in PATIENT position (modal-close-button) now
  captures correctly. The SOV destination path doesn't reach
  tryMatchPositionalExpression. Parser follow-up, narrower scope.
- **make-toast-element ×23 untouched** — its `put it at end of body` needs the
  `at end of` manner phrase + the third clause, which non-en translations drop
  entirely (the handcrafted en put patterns for `at end of` have no per-language
  counterpart). Separate, harder mechanism — its own track.

## 7l. Status update (2026-06-13, session 13): body reference dict↔profile align

**Half of §7k's "body source not recognized" residual was a dict↔profile word
drift, fixed by aligning the semantic profile's `references.body` to the i18n
dict's emitted word** (the corpus-canonical surface form the parser must
recognize). Three profiles carried the literal English placeholder `'body'`
(ru/tl/uk) instead of the language's word (`тело`/`katawan`/`тіло`); three more
disagreed on a real word (ar `الجسم`≠dict `جسم`; ko `본문`="main text", wrong for
the DOM body, ≠dict `바디`; id `tubuh`≠dict `badan`). Aligned profile→dict
(lowest blast radius — changes only parser recognition, not the committed
corpus). Cleared ar/id/ru/tl on **modal-close-button** (15→10 failing) and
**modal-open** (12→7).

**A measurement-exposed latent bug rode along (and got fixed):** id `if-exists`
was faithful-by-accident — its else word `lainnya` wasn't a profile else
alternative (profile only had `selainnya`), so the else-branch (`make`+`put into
body`) flattened into the _then_-branch; with the condition true and `body`
unrecognized, the stray `put` was an inert no-op that happened to match en. Once
`body` resolved, that put produced a spurious effect (an honest faithful→failing
exposure, exactly the §7j ko pattern). Fixed at the root by adding `lainnya` as
a profile else alternative → the else-branch nests, doesn't execute, if-exists
is _truly_ faithful. (`mana_chayqa` for qu is the same drift but blocked by a
separate **tokenizer underscore-split** bug — `mana_chayqa` tokenizes as
`mana`/`_`/`chayqa` = false/\_/then — so qu's body+else changes were REVERTED to
keep qu at baseline until the tokenizer is fixed; tracked below.)

**Result:** meanExecutionFidelity **0.8471 → 0.8640**, failing cells **109 →
97** (−12). Parse-level essentially flat (avgFidelity 0.9741→0.9743, lossy 80→77
from the id if-exists nesting, degen 63 unchanged). Gate green; baseline
regenerated; 6 unit tests added (R2 wave 6 block). Semantic 5855 green.

**Remaining body-source residual (still separate-layer):**

- **SOV/marker-after post-verb source clause** (ja/ko/tr/hi modal-close-button):
  a control test (`.modal-open を 削除 .container から`) proved even a SELECTOR
  source drops to `me` in the SOV post-verb position — the trailing source
  clause after the verb isn't parsed. Structural parser follow-up.
- **`source=undefined`** (bn/it/th modal-close-button): the source role isn't
  captured at all (dict word matches the profile, so not a word issue) — a
  different role-capture path.
- **qu underscore-tokenization**: the qu tokenizer splits dict words joined with
  `_` (`mana_chayqa`, and any other multi-word qu dict emission). Until fixed,
  qu else/body dict alignments can't land. Tokenizer-layer.

## 7m. Status update (2026-06-13, session 14): halt-the-event article (core)

**halt-propagation 18→1 with a one-line core fix.** All 18 non-en translations
captured the halt patient as the literal English article `"the"` (the i18n
transformer leaves `the` verbatim and the event noun is dropped/elsewhere). en
emitted it as a `literal "the"`, which `HaltCommand.execute` already special-
cased (`=== 'the'` → halt the event, CONTINUE); the other 17 emitted it as an
`identifier "the"` (via the expression value converter), which `parseInput`
_evaluated_ (→ undefined) → halt threw `HALT_EXECUTION` → the handler stopped and
every command after `halt the event` was swallowed (the toggle never fired).

The structural-looking compound-vs-flat difference was a red herring: identical
`halt{patient:"the"}` semantic nodes, but the AST node TYPE differed
(literal vs identifier) and only the literal hit execute's recovery path. Fix in
`packages/core/src/commands/control-flow/halt.ts` `parseInput`: treat a leading
`"the"` article (by `name` OR `value`, so literal and identifier both match,
event noun present or not) as the prevent-default-and-CONTINUE form — return
`{ target: context.event }` before the evaluate-and-maybe-throw path. Subsumes
the old narrow `the`+`event` two-arg check.

**Result:** meanExecutionFidelity **0.8640 → 0.8878**, failing cells **97 → 80**
(−17). halt-propagation 18→1 (only **hi** remains — its SOV clause drops the
leading `the` so the patient is undefined → bare halt; a separate SOV
leading-article sub-case). Parse-level untouched (halt is runtime-only:
avgFidelity 0.9743, lossy 77, degen 63 all identical). Core 6987 green (2 new
halt parseInput tests). Gate green; baseline regenerated.

**Still-open R2 clusters after this (80 failing, ranked):** make-toast-element
×23 (`at end of` manner phrase, non-en drop); accordion-exclusive ×8 (de
`nächste` collision + ja/ko SOV destination positional); modal-close-button ×~10
(SOV post-verb source ja/ko/tr/hi + bn/it/th source=undefined + de collision);
modal-open ×7; modal-close-backdrop ×6; tabs-aria ×5; if-matches ×4; hi
halt-propagation ×1. Next-mechanism candidates unchanged: SOV post-verb source
clause (parser), qu underscore-tokenizer, de `nächste`/`next` disambiguation,
make-toast `at end of` per-language.

## 7n. Status update (2026-06-13, session 15): make-toast `at end of` per-language

**The biggest single R2 cluster (make-toast-element ×23) dropped to ×6 with one
generated-pattern table.** en carries a handcrafted `put {patient} at end of
{destination}` pattern (`put-en-at-end`); the i18n transformer translates that
three-word position phrase verbatim into every other language, but no non-en
language had a counterpart, so the third clause of make-toast (`put it at end of
body`) either **dropped entirely** (SOV/VSO — the made toast is never attached →
empty effect) or the generic into-put grabbed the `end` word as the destination.
Fix in `packages/semantic/src/patterns/put.ts`: a `PUT_AT_END` table records the
per-language surface words for the put verb + `at`/`end`/`of`, and
`buildAtEndPutPatterns` reconstructs the en shape (`<verb> {patient} <at> <end>
<of> {destination}`, SOV variant `{patient} <at> <end> <of> {destination}
<objMarker> <verb>`) with `manner: 'at end of'` at priority 110 (above the
generic into-put). The destination is the language's dict-canonical `body` word,
which **already aligns** with each profile's `references.body` (the §7l
alignment), so it resolves to the `body` contextReference with no dict change.

**Result:** make-toast-element 23→6 failing (cleared **17 languages**: es, fr,
pt, it, de, sw, id, vi, pl, ru, th, tl, ar, he, ja, ko, tr).
meanExecutionFidelity **0.8878 → 0.9116**, failing cells **80 → 63** (−17).
Parse-level **byte-identical** (avgFidelity 0.9743, lossy 77, degen 63 all
unchanged): the dropped third command is a duplicate `put` action, so action-set
fidelity was already 1.0 — exactly the lossy-but-faithful gap R2 execution
fidelity exists to catch (same shape as the §7m halt fix). avgRoleFidelity (R1)
ticked up slightly for the 17 (the now-parsed third put adds correct roles). Gate
green; baseline regenerated; subset membership unchanged (make-toast was already
in). 17 cross-language unit tests added (R2 wave 8 block). Semantic 5872 green.

**Two findings worth the next session:** (1) a multi-word marker (vi `kết thúc`)
tokenizes as ONE token whose value is the whole phrase, so the literal must carry
the phrase verbatim — splitting on whitespace emits two literals that never
align. (2) The single-token multi-word case is the _opposite_ of the usual
assumption; check `tokenize(code,lang).tokens` before assuming a space splits.

**make-toast survivors (6) — all SEPARATE, pre-existing mechanisms (none are
this fix's regressions):**

- **ms/tl-path**: ms drops the third clause even though every token is correct
  and tl (identical SVO shape) works — ms's event body routes through the
  grammar/fused path (`parseBodyWithGrammarPatterns`), not `parseBodyWithClauses`,
  so the handcrafted at-end pattern is never consulted (the §7j routing class,
  now manifesting on make-toast's fused make-event). tl proves the pattern is
  correct; ms needs the body-routing fix.
- **zh/bn compound collapse**: the whole event body parses as a single
  `compound` (a higher-level event path), so neither the at-end nor any body
  pattern is reached. Pre-existing.
- **hi/uk second-put bug**: the at-end (third) put parses correctly, but the
  SECOND clause mis-parses — hi drops `'Saved!'` (patient→it, dest→me); uk
  truncates the string literal `'Saved!'`→`"Save"` and drops the destination
  (`put requires content and position`). Separate string/role-capture bugs.
- **qu**: body word mismatch (`kurku`≠profile `ukhu`) + the underscore-tokenizer
  bug — excluded from PUT_AT_END; tracked for the qu-tokenizer arc.

**Still-open R2 clusters after this (63 failing, ranked):** modal-close-button
×10 (bn de hi it ja ko qu sw th tr — SOV post-verb source + bn/it/th
source=undefined + de collision); accordion-exclusive ×8 (bn de hi ja ko sw th
tr); modal-open ×7 (bn hi ja ko qu th tr); make-toast-element ×6 (bn hi ms qu uk
zh — the survivors above); modal-close-backdrop ×6 (hi ko qu ru uk zh); tabs-aria
×5 (bn hi ja ko tr); make-element ×3 (bn hi ms); set-attribute ×3 (hi qu tr);
if-matches ×3 (qu tr zh); closest-ancestor ×2 (de sw); set-style ×2 (hi id);
put-content-basic ×2 (ja qu); if-condition ×2 (qu zh); + singletons
(halt-propagation hi, set-_-possessive-dot hi×2, if-exists zh). **Next-mechanism
ranking:** (1) **SOV post-verb source clause** (parser, parseClause — modal-close-
button/accordion ja/ko/tr/hi; control test in §7l proved even a selector source
drops); (2) **qu underscore-tokenizer** (unlocks qu else/body + make-toast);
(3) **de `nächste`/`next` disambiguation**; (4) **fused-event body routing**
(would unlock ms/tl-class make-toast + possibly the zh/bn compound collapse — the
§7j class generalized). Alt track: behavior-_ degenerate mass (~40 of 63 degen).

## 7o. Status update (2026-06-13, session 16): trailing post-verb source clause

**modal-close-button 10→4 by reclaiming the trailing post-verb source.** Its
body is `hide closest .modal then remove .modal-open from body`; the grammar
transformer emits the from-phrase AFTER the verb — SOV `.modal-open を 削除 ボディ
から` (bn/hi/ja/ko/tr), SVO th `ลบ .modal-open จาก บอดี้` — and the per-command
remove pattern (which ends at the verb) never claims it, so the class was removed
from the clicked button (the schema's `me` default) instead of the document body
(no effect).

**Key discovery (the handoff's parseClause hypothesis was half-right):** the
remove clause does NOT go through `parseClause`. modal-close-button's fused event
pattern captures the first command (`hide`) as the action, so the trailing
`remove …` clause is parsed by **`parseBodyWithGrammarPatterns`** (the §7j fused-
body path), not `parseBodyWithClauses → parseClause`. A `parseClause`-only fix
therefore never fired (confirmed by an instrumented probe). The fix adds a shared
`tryAttachTrailingSource` helper called at BOTH the `parseClause` and the
`parseBodyWithGrammarPatterns` `matchBest` call sites: after a command matches, if
its schema declares a `source` role that is currently absent or the defaulted
`me`, and the next tokens form a clean marker+value pair in the profile's
source-marker order (postpositional `<value> <from>` for SOV; prepositional
`<from> <value>` for SVO), it reclaims the trailing source. The body-clause twin
of #379's event-wrapper trailing source group.

**Result:** modal-close-button 10→4 failing (cleared **6 languages**: bn, hi, ja,
ko, th, tr). meanExecutionFidelity **0.9116 → 0.9201**; failing execution cells
**63 → 57** (−6). Parse-level byte-identical (avgFidelity 0.9743, lossy 77, degen
63 — the remove command was already present, only its source role was wrong);
avgRoleFidelity (R1) ticked up for the 6. Conservative guard verified: accordion-
exclusive / remove-class-from-all / take-class-from-siblings keep their genuinely
captured sources (`.accordion-item` / `.items` / `.tab-button`) — the reclaim
returns early on a non-`me` existing source. Gate green; baseline regenerated;
subset membership unchanged. 9 cross-language unit tests added (R2 wave 9 block).
Semantic 5881 green.

**modal-close-button survivors (4) — separate mechanisms:** de (`nächste`→next
collision, hide targets the wrong element); it (captures body as DESTINATION not
source — a role-mislabel in the it path); sw (the `hide` command drops entirely);
qu (body word `kurku`≠profile + underscore tokenizer).

**Still-open R2 clusters after this (57 failing, ranked):** accordion-exclusive
×8 (bn de hi ja ko sw th tr — the SOV **destination**-positional drop: `add .open
to closest .accordion-item` → destination `me`, a DIFFERENT mechanism from the
source clause); modal-open ×7 (bn hi ja ko qu th tr); make-toast-element ×6 (bn hi
ms qu uk zh); modal-close-backdrop ×6 (hi ko qu ru uk zh); tabs-aria ×5 (bn hi ja
ko tr); modal-close-button ×4 (de it qu sw); make-element ×3 (bn hi ms);
set-attribute ×3 (hi qu tr); if-matches ×3 (qu tr zh); closest-ancestor ×2 (de
sw); set-style ×2 (hi id); put-content-basic ×2 (ja qu); if-condition ×2 (qu zh);

- singletons. **Next-mechanism ranking:** (1) **SOV destination-positional drop**
  (accordion-exclusive `add` destination `closest .accordion-item`→`me` in
  bn/hi/ja/ko/sw/tr — the destination twin of this PR's source reclaim, but in the
  positional-phrase path; ~6 cells, the largest cluster); (2) **qu underscore-
  tokenizer** (qu appears in 8 cells); (3) **de `nächste`/`next` disambiguation**
  (de in 3 cells: modal-close-button, accordion, closest-ancestor); (4) **fused-
  event body routing** (ms/tl make-toast + zh/bn compound collapse). Alt track:
  behavior-\* degenerate mass (~40 of 63 degen).

## 7q. Status update (2026-06-13, session 18): trailing positional destination

**accordion-exclusive 8→3 by extending the trailing-role reclaim to positional
phrases.** accordion's body is `remove .open from .accordion-item then add .open
to closest .accordion-item`; the add's to-phrase trails the verb as a POSITIONAL
phrase — SOV `… 最も近い .accordion-item に` (closest + selector + to-marker) —
which the wave-10 single-token reclaim couldn't capture (the leading token is the
`closest` keyword, not a selector/reference), so the destination defaulted to
`me`. Added a positional branch to `tryAttachTrailingRole`: when the strict
(destination) role's trailing tokens are `<positional-keyword> <selector>
<marker>`, it builds the same `{ type: 'expression', raw: 'closest
.accordion-item' }` the English reference produces (normalized positional keyword

- selector surface), so the core's positional evaluator resolves it identically.

**Result:** accordion-exclusive 8→3 failing (cleared bn, hi, ja, ko, tr), plus a
ride-along (toggle-aria-expanded's `next .panel` destination, also positional).
meanExecutionFidelity **0.9285 → 0.9355**; failing execution cells **51 → 46**
(−5). Parse-level byte-identical (avgFidelity 0.9743, lossy 77, degen 63); the
clean same-`patterns.db` diff showed only the two correct positional captures
(`closest .accordion-item`, `next .panel`) across the five languages — no
cascading. Gate green; baseline regenerated; subset membership unchanged. 5 unit
tests added (R2 wave 11; tr omitted — see below).

**tr — populate-jitter on the execution boundary (important reliability note).**
tr's `closest` keyword is two words (`en yakın`); the i18n transformer joins it
non-deterministically across populates — `en yakın` (space) and `enyakın`
(joined) both tokenize to `closest` (tr PASSES), but `en_yakın` (underscore)
splits to `en`/`_`/`yakın` (tr FAILS). Before this PR, tr accordion failed
**regardless** of the join (no reclaim → destination always `me`), so it was
stably failing. This PR puts tr on the jitter boundary. Six consecutive fresh
`npm run populate` runs all produced a passing form (`enyakın`); the failing
`en_yakın` was only in the stale committed `patterns.db`, which **CI overwrites
with a fresh populate** before the gate — so CI sees the passing form and the
baseline (tr passing) is consistent. tr is therefore counted as a win, but it is
**omitted from the wave-11 parse-lock** to keep the unit test decoupled from the
jittery corpus surface form. The proper fix is the underscore-tokenizer arc
(below) — once tr/sw `closest` tokenizes deterministically, this boundary
disappears. The four locked languages (ja/ko/hi/bn) use single-token `closest`
words that never jitter.

**Still-open R2 clusters after this (46 failing, ranked):** make-toast-element ×6
(bn hi ms qu uk zh); modal-close-backdrop ×6 (hi ko qu ru uk zh); tabs-aria ×5
(bn hi ja ko tr); modal-close-button ×4 (de it qu sw); make-element ×3 (bn hi
ms); accordion-exclusive ×3 (de sw th — de nächste, sw/th underscore/other);
set-attribute ×3 (hi qu tr); if-matches ×3 (qu tr zh); closest-ancestor ×2 (de
sw); set-style ×2 (hi id); put-content-basic ×2 (ja qu); if-condition ×2 (qu zh);

- singletons. **Next-mechanism ranking:** (1) **underscore-tokenizer** (qu
  `mana_chayqa`, tr `en_yakın`, sw `karibu_zaidi`, de? — the `_`-joined multi-word
  keyword split; qu in 8 cells, also unlocks tr/sw `closest` in accordion, and the
  qu else/body alignments reverted in #405); (2) **modal-close-backdrop condition
  keyword normalization** — `if target matches .X`'s `matches` keyword (일치/
  соответствует/відповідає) is not normalized to English so the core can't evaluate
  the condition, AND the then-branch (`hide`) is dropped (conditional residue, the
  §7j/#403 class); (3) **tabs-aria `set @attr to X on scope`** — the `on <scope>`
  target and the attr/value roles scramble under SOV reordering; (4) **de
  `nächste`/`next` disambiguation**; (5) **fused-event body routing** (ms/tl
  make-toast + zh/bn compound collapse). Alt track: behavior-\* degenerate mass.

## 7p. Status update (2026-06-13, session 17): trailing post-verb destination

**modal-open 7→1 by generalizing the wave-9 source reclaim to destinations.**
modal-open's body is `show #modal then add .modal-open to body`; the transformer
emits the to-phrase AFTER the verb — SOV `.modal-open を 追加 ボディ に`, SVO th
`เพิ่ม .modal-open ใน บอดี้` — so the add pattern (ending at the verb) drops it and
the class is added to the clicked button (the `me` default) instead of the body.
modal-open's destination value is `body` — a single reference token, the exact
shape wave 9 already handled for source. Generalized `tryAttachTrailingSource` →
`tryAttachTrailingRole`: it now loops over {source, destination}, reclaiming a
trailing marker+value phrase for whichever the command's schema declares and is
currently absent or `me`.

**Two hard-won guards (a first cut regressed R1, then cascaded):**

1. **Block keywords are not values.** `end`/`else`/`then` tokenize as identifiers
   in some languages; a naive `isValue` admitting identifiers captured hi `put …
end` → destination `end` (the role-fidelity regression the first measurement
   exposed). A `NON_VALUE_KEYWORDS` set rejects them.
2. **The destination matcher is STRICT (selectors + DOM reference words only, no
   bare identifiers); the source matcher stays broad (shipped #408).** The
   `to`-markers (ja に, ko 에, …) are common, so admitting arbitrary identifiers
   made the reclaim eat tokens a later command needed, **cascading** into wholly
   different downstream parses (ja fetch-loading-state `get` → `fetch source:then`,
   ~1000 captures changed). Restricting destination values to selectors/references
   eliminated the cascade; the clean same-`patterns.db` diff then showed ONLY
   correct improvements (modal-open→body, send-with-detail→#target,
   window-scroll→#header). The `from`-markers are rarer and were verified safe
   broad, so source keeps its shipped breadth (and its degenerate
   behavior-draggable `source:document` capture). The destination strictness also
   means accordion's positional `add .open to closest .accordion-item` is left
   untouched (the leading `closest` keyword fails isValue) — exactly right, that's
   the separate positional path.

**Result:** modal-open 7→1 failing (cleared bn, hi, ja, ko, th, tr).
meanExecutionFidelity **0.9201 → 0.9285**; failing execution cells **57 → 51**
(−6). Parse-level byte-identical (avgFidelity 0.9743, lossy 77, degen 63). The
per-language avgRoleFidelity baseline wiggled ±0.002 (within the documented
populate-jitter tolerance — the gate passed; the clean parser-only diff is purely
positive). Gate green; baseline regenerated; subset membership unchanged. 9 unit
tests added (R2 wave 10). Semantic 5889 green.

**Process note (measurement trap that cost two false alarms):** a `probe-roles`
diff is only valid against ONE `patterns.db` — repopulating between the before/
after captures makes populate jitter masquerade as a ~1000-line parser regression.
Capture both snapshots against the same DB (stash the parser change, rebuild,
capture; pop, rebuild, capture — no `populate` in between), or trust the gate.

**Still-open R2 clusters after this (51 failing, ranked):** accordion-exclusive
×8 (bn de hi ja ko sw th tr — SOV destination-positional, the `closest
.accordion-item` phrase); make-toast-element ×6 (bn hi ms qu uk zh);
modal-close-backdrop ×6 (hi ko qu ru uk zh); tabs-aria ×5 (bn hi ja ko tr);
modal-close-button ×4 (de it qu sw); make-element ×3 (bn hi ms); set-attribute ×3
(hi qu tr); if-matches ×3 (qu tr zh); closest-ancestor ×2 (de sw); set-style ×2
(hi id); put-content-basic ×2 (ja qu); if-condition ×2 (qu zh); + singletons.
**Next-mechanism ranking:** (1) **accordion destination-POSITIONAL** — same
trailing-destination shape but the value is a `closest <sel>` positional phrase,
so it needs positional-expression capture (not the single-token `isValue`), AND
tr/sw are additionally blocked by underscore-tokenization (`en_yakın`/
`karibu_zaidi`); clean yield ja/ko/hi/bn ≈ 4 cells. (2) **qu/tr/sw underscore-
tokenizer** (the `_`-joined multi-word keyword split — qu in 8 cells, also unlocks
tr/sw `closest`). (3) **de `nächste`/`next` disambiguation**. (4) **fused-event
body routing**. Alt track: behavior-\* degenerate mass.

## 7r. Status update (2026-06-13, session 19): `matches` operator normalization

**modal-close-backdrop 6→3 with a three-line profile addition — the §7q/#2
condition-keyword-normalization mechanism, confirmed by measure-first.** The
fresh wave-11 baseline cluster (46 failing cells) was dominated by the
conditional family (modal-close-backdrop ×6, if-matches ×3, if-condition ×2,
if-exists ×1). A parse-probe of every modal-close-backdrop translation
(`if target matches .modal-backdrop hide … end`) showed the fold is already
STRUCTURALLY CORRECT in every language (condition + then-`hide`) — the only
divergence is the `matches` operator word left untranslated in the condition
raw: ko `target 일치 .modal-backdrop`, ru `target соответствует …`, uk `target
відповідає …`. `joinTokenText` only normalizes `kind === 'keyword'` tokens, and
**no profile defined `matches`** (it's a comparison operator — core territory —
so it had always tokenized as an identifier), so the raw stayed un-English and
the core expression parser (English operators only) couldn't evaluate it; the
condition failed and the then-branch dropped at runtime.

- **Fix**: add `matches: { primary: '<word>', normalized: 'matches' }` to the
  ko/ru/uk profiles (the exact corpus surface words `일치`/`соответствует`/
  `відповідає`). Now `matches` tokenizes as a keyword and the condition
  normalizes to the en-identical `target matches .modal-backdrop`. Parser-side
  only (the i18n dict already emits these words); lowest blast radius. The three
  words occur in exactly two corpus patterns (modal-close-backdrop, focus-trap),
  both as the comparison operator — no non-operator collision.
- **Result**: modal-close-backdrop 6→3 failing (cleared ko, ru, uk).
  meanExecutionFidelity **0.9355 → 0.9397**; failing execution cells **46 → 43**
  (−3). Parse-level **byte-identical** (avgFidelity unchanged, lossy 77, degen
  63 — the action set was always {if, hide}; only the un-normalized condition
  raw moved, the lossy-but-faithful gap R2 exists to catch). Gate green (all four
  ratchets); baseline regenerated; 4 lock tests added (wave 12). Semantic 5893.
- **The remaining 3 are each a SEPARATE, pre-existing bug** (adding `matches`
  doesn't help them): **hi** `मेल_खाता` (matches) underscore-splits to
  `मेल`/`_`/`खाता`; **qu** `punta` (target) splits to `pun`/`ta`-particle (and
  `tupan`/matches also unnormalized); **zh** the whole event body collapses to a
  `compound` (the §7n zh/bn compound-collapse path) so the fold never runs at
  all. hi/qu are blocked by the underscore/particle tokenizer; zh by body
  routing.

**Still-open R2 clusters after this (43 failing, ranked):** make-toast-element
×6 (bn hi ms qu uk zh); modal-close-backdrop ×3 (hi qu zh — the survivors
above); tabs-aria ×5 (bn hi ja ko tr); modal-close-button ×4 (de it qu sw);
make-element ×3 (bn hi ms); accordion-exclusive ×3 (de sw th); set-attribute ×3
(hi qu tr); if-matches ×3 (qu tr zh); closest-ancestor ×2 (de sw); set-style ×2
(hi id); put-content-basic ×2 (ja qu); if-condition ×2 (qu zh); + singletons
(halt-propagation hi, set-{inner-html,text}-possessive-dot hi, modal-open qu,
if-exists zh). **Next-mechanism ranking unchanged from §7q:** (1) **underscore-
tokenizer** (qu `mana_chayqa`/`punta`-ish, tr `en_yakın`, sw `karibu_zaidi` — a
`_`-joined or particle-suffix multi-word keyword split; would unblock hi/qu
modal-close-backdrop, sw closest, + the qu else/body alignments reverted in
#405); (2) **tabs-aria `set @attr to X on scope`** (now the largest single
cluster at ×5); (3) **de `nächste`/`next` disambiguation**; (4) **fused-event
body routing / zh-bn compound collapse**. Alt track: behavior-\* degenerate mass.

## 7s. Status update (2026-06-13, session 19 cont.): de nächste/closest disambiguation

**de cleared entirely (3 cells) — the §7k/§7q de `nächste`/`next` collision.**
German `nächste` is genuinely ambiguous (next/nearest); the de i18n dict emitted
it for BOTH `next` and `closest`, and the german tokenizer deliberately
normalizes `nächste`→next (last-wins — a second `closest` entry would shadow the
positional-capable `next`, documented in german.ts). So a translated `closest .X`
surfaced as `next .X` and the wrong element was hit at runtime (accordion-exclusive,
closest-ancestor, modal-close-button).

- **Fix** (align-the-odd-one-out idiom, two layers): de dict emits the
  unambiguous `nächstgelegene` ("nearest-located") for `closest`; the german
  tokenizer maps `nächstgelegene`→closest. Distinct word → no shadowing of
  `next`; closest round-trips. Pruned the now-fixed `de:closest` from the
  `positional-keyword-drift` burn-down allowlist (the list only shrinks). A probe
  confirmed all three de cells capture en-identical roles (`closest .accordion-item`,
  `closest .card`, `hide closest .modal`; modal-close-button's `körper`→body
  source already resolved, so de modal-close-button is fully clean).
- **Result**: de now has **0** execution failures (was 3). meanExecutionFidelity
  **0.9397 → 0.9439**; failing execution cells **43 → 40** (−3). Parse-level
  byte-identical (avgFidelity / lossy 77 / degen 63 unchanged — only the captured
  positional `raw` the runtime reads moved from next/me to `closest .X`). Gate
  green; baseline regenerated; 3 lock tests added (wave 13). Semantic 5900, i18n
  846 green.

**Still-open R2 clusters after this (40 failing, ranked):** make-toast-element ×6
(bn hi ms qu uk zh); tabs-aria ×5 (bn hi ja ko tr); make-element ×3 (bn hi ms);
modal-close-backdrop ×3 (hi qu zh); set-attribute ×3 (hi qu tr); modal-close-button
×3 (it qu sw); if-matches ×3 (qu tr zh); set-style ×2 (hi id); put-content-basic ×2
(ja qu); if-condition ×2 (qu zh); accordion-exclusive ×2 (sw th); + singletons
(halt-propagation hi, set-{inner-html,text}-possessive-dot hi, modal-open qu,
closest-ancestor sw, if-exists zh). **The residual is now dominated by two
cross-cutting blockers**: (1) **underscore/particle tokenizer** — qu (8 cells via
`mana_chayqa`/`punta`), sw (`karibu_zaidi` → accordion/closest-ancestor), ms
(`ke_dalam` → make-element/make-toast); (2) **zh/bn fused-event compound collapse**
(zh all conditionals + make-toast; bn make-element/make-toast/tabs-aria). Plus
per-language SOV scrambles (hi set-trio, tabs-aria SOV) and the en-reference-lossy
tabs-aria (`on <scope>` dropped even in en — a two-layer arc). Probed this session:
make-element/set-attribute/tabs-aria are each scattered per-language structural
bugs, NOT clean single mechanisms.

## 7t. Status update (2026-06-13, session 20): sw/qu `_`-joined surface words

**The underscore-tokenizer "arc" turned out to be a small dict-alignment win,
not the multi-PR effort the §7q framing implied — measure-first corrected three
stale assumptions.** Re-probing against the current dist showed: (1) **ms is NOT
underscore** — `ke_dalam` tokenizes cleanly (`_` is a malay word-char); ms's
make-element/make-toast drop is the fused-body-routing class (§7n). (2) **tr is
already fixed** — the tr dict emits the concatenated `enyakın`, not `en_yakın`
(the §7q jitter note is stale); and tr's failing cells don't use closest anyway.
(3) The genuine `_`-split cases are **sw** and **qu**, each a one-line dict
realign to a clean single-token form (the established `enyakın` pattern).

- **sw closest**: dict `karibu_zaidi` → `karibuzaidi` (+ a swahili tokenizer
  EXTRAS entry `karibuzaidi`→closest). The `_ zaidi` had stranded and broken the
  positional `closest <selector>` capture (destination defaulted to `me`).
  Cleared sw **accordion-exclusive, closest-ancestor, AND modal-close-button**
  (the last via `hide closest .modal` — the §7o "sw hide drops" diagnosis was
  actually this closest break). 3 cells; also a parse-level bonus
  (modal-close-button lossy→faithful, sw avgFidelity 0.9706→0.9728, lossy 77→76).
- **qu else**: dict `mana_chayqa` → `manachus` (the qu profile's existing else
  word — a dict↔profile alignment, no tokenizer change). The old form tokenized
  as `mana`(false)/`_`/`chayqa`(then), so no else keyword formed and qu
  conditionals never split their else branch. Cleared qu **if-matches,
  if-condition**. 2 cells.

- **Result**: meanExecutionFidelity **0.9439 → 0.9509**; failing execution cells
  **40 → 35** (−5). lossy 77→76, degen 63 unchanged. Gate green (all four
  ratchets); baseline regenerated; 2 lock tests added (wave 14). Semantic 5902,
  i18n 846 green.
- **Remaining underscore residue is NOT a clean win**: qu `punta` (target) is a
  _particle_ split (`pun`/`ta`-accusative), not underscore — blocks qu
  modal-close-backdrop separately; qu `closest` is `kaylla` (no underscore).

**Still-open R2 clusters after this (35 failing, ranked):** make-toast-element ×6
(bn hi ms qu uk zh); tabs-aria ×5 (bn hi ja ko tr); make-element ×3 (bn hi ms);
modal-close-backdrop ×3 (hi qu zh); set-attribute ×3 (hi qu tr); set-style ×2 (hi
id); modal-close-button ×2 (it qu); put-content-basic ×2 (ja qu); if-matches ×2
(tr zh); + singletons (halt-propagation hi, set-{inner-html,text}-possessive-dot
hi, modal-open qu, accordion-exclusive th, if-condition zh, if-exists zh). **The
residual is now dominated by structural blockers, each its own hard arc**:
(1) **fused-event body routing / zh-bn-ms compound collapse** — the largest
remaining lever (ms make-element/make-toast, bn make-element/make-toast/tabs-aria,
zh make-toast + conditional residue); (2) **per-language SOV scrambles** (hi
set-trio + tabs-aria, ja/ko/tr tabs-aria); (3) **en-reference-lossy tabs-aria**
(`on <scope>` dropped even in en — two-layer arc); (4) qu particle-split (`punta`)

- remaining qu tails. No more cheap dict-alignment wins remain in the cluster;
  the tail is genuinely the §9 "marginal session clears ~5 hard instances" regime.

## 7u. Status update (2026-06-13, session 21): hi matches + session wrap (waves 12–15)

**hi modal-close-backdrop cleared — the wave-12 + wave-14 mechanisms combined.**
hi's matches both lacked a profile entry (wave-12 class) AND underscore-split
(wave-14 class): the dict emitted `मेल_खाता`, which the hi tokenizer split into
मेल/\_/खाता, and no hi profile entry mapped it to `matches`. Concatenate the dict
to `मेलखाता` (no underscore) + add `मेलखाता`→matches to the hindi profile → the
folded condition normalizes to the en-identical `target matches .modal-backdrop`.

- **Result**: meanExecutionFidelity **0.9509 → 0.9523**; failing execution cells
  **35 → 34** (−1). lossy 76, degen 63 unchanged. Gate green; baseline
  regenerated; 1 lock test added (wave 15). Semantic 5903, i18n 846 green.

### Session arc (waves 12–15): 46 → 34 failing execution cells

| wave | PR     | mechanism                                             | cells |
| ---- | ------ | ----------------------------------------------------- | ----- |
| 12   | #411   | `matches` operator → ko/ru/uk profiles                | 46→43 |
| 13   | #412   | de `nächstgelegene` closest vs next disambiguation    | 43→40 |
| 14   | #413   | sw/qu `_`-joined surface words (karibuzaidi/manachus) | 40→35 |
| 15   | (this) | hi `मेलखाता` matches (concat + profile)               | 35→34 |

meanExecutionFidelity 0.9355 → 0.9523; avgFidelity / lossy 77→76 / degen 63
essentially flat (these were execution-layer fixes — the lossy-but-faithful gap).
All four ratchets held every wave; zero parse-level regressions; zero broken mains.

### Stopping point — the cheap dict-alignment wins are EXHAUSTED

The session cleared every remaining **dict/profile-alignment** mechanism (the
"align the odd-one-out / emit a clean single-token surface form" idiom). The
residual **34 cells are all deep structural arcs**, each its own multi-session
effort (NOT clean single-mechanism fixes — all probed this session):

1. **Fused-event body routing / compound collapse** (~12 cells: make-toast ×6,
   make-element ×3, + zh/bn conditional residue). ms drops the trailing
   `then put …` because `letak ia …` (put-with-`ia`) fails to parse standalone
   (the §10 ms-put-ia bug); bn/zh collapse the whole event body to a single
   `compound` (a higher-level event path) that bypasses the fold/grammar/at-end
   paths. Needs semantic-parser body-routing + ms put-pattern work.
2. **Per-language SOV scrambles** (hi set-trio + tabs-aria, ja/ko/tr tabs-aria):
   fronted possessives captured as the event; attr/value/scope roles reorder.
3. **en-reference-lossy tabs-aria** (×5): `set @attr … on <scope>` drops the
   `on <scope>` modifier even in EN — a two-layer arc (fix en parse first, which
   inverts the band).
4. **qu particle-split** (`punta`/target → `pun`/`ta`-accusative) + dict↔profile
   target mismatch (`punta` vs `ñawpaqman`): blocks qu modal-close-backdrop,
   modal-open, put-content-basic. A tokenizer (particle) arc.
5. **set-attribute / set-style / possessive-dot tails** (hi/qu/tr/id): SOV
   fronting + possessive-phrase capture.

Per §9 this is the documented stop: the marginal session now clears ~1–2 hard
structural instances at high risk, while the same effort on Track-2 (behaviors,
~40 of 63 degen) or R1 burn-down removes whole categories. The four ranked
mechanisms remaining (fused-routing, SOV scrambles, en-lossy tabs-aria, qu
particle) are each scoped above as their own arcs for a future session.

## 7v. Design note (2026-06-13, session 22): the underscore convention is wrong — prefer native-natural surface forms

**Owner question, answered: is the `_`-joined multi-word keyword surface form
(`karibu_zaidi`, `मेल_खाता`, `mana_chayqa`, `के_साथ`) correct, or just
confusing? Verdict: WRONG on both axes — unnatural AND usually unparseable.**

1. **Unnatural.** No native author writes snake_case in their own language; it's
   a C-identifier convention leaking into text that is supposed to BE the
   language. It defeats the "write code in your language" premise.
2. **Mis-tokenizes.** Most tokenizers treat `_` as a non-word char, so
   `मेल_खाता` → `मेल`/`_`/`खाता` (a stray `_` token) and the keyword never forms —
   the exact bug class waves 14/15 fixed. Smoking gun: the hi dict emits
   `के_साथ` (with) which tokenizes BROKEN, while the natural `के साथ` tokenizes as
   one token. It only "works" in Malay, by accident (malay's letter-class
   includes `_`).

**Preference hierarchy for multi-word/compound keywords (apply going forward):**

1. **Real single word** if one exists — de `nächstgelegene` (closest), qu
   `manachus` (else), sw `karibu` (closest). Natural and parseable.
2. **Natural spaced phrase** with longest-match multi-word tokenization — the hi
   tokenizer ALREADY does this for `के लिए`/`जब तक` (the `for`/`while` keywords).
3. **Concatenation** (`enyakın`, `karibuzaidi`, `मेलखाता`) ONLY as a last resort,
   documented as a parse-driven compromise. Better than `_` (parses), but still
   not how the language is written.
4. **Never `_`.**

**State of the migration (already in progress, unfinished):** the semantic
profiles increasingly use natural spaced forms (hi `के लिए`/`जब तक`) while the
i18n dicts still emit underscores (`के_साथ`, `से_पहले`, `के_बीच`, `mana_sichus`,
`kay_kaq`, … — dozens across ~20 langs). Many are latent `के_साथ`-class parse
bugs waiting for a pattern to use them. **session-22 correction (this PR):** sw
`karibuzaidi` → `karibu` (the wave-14 fused form replaced with the real word;
zero metric change, pure naturalness). hi stays on `मेलखाता` because the natural
`मेल खाता` does NOT tokenize — the hi extractor's multi-word support is a
**hardcoded postpositional-compound allowlist** (`hindi-keyword.ts`: `के लिए`,
`के साथ`, …) that doesn't cover a two-word verb phrase.

**The proper fix (recommended arc, not yet done):** (a) generalize multi-word
keyword tokenization — replace the per-language hardcoded compound allowlists
with real longest-phrase matching against the profile keyword set (the framework
`tryProfileKeyword` already does `startsWith` across spaces; the extractor-based
tokenizers need to consult it for multi-token keywords); then (b) audit every
`_` in the dicts and replace with the natural single/spaced form. (a) unblocks
(b) for every language at once and lets the `_` convention be deleted wholesale.

## 7w. Status update (2026-06-13, session 22): multi-word keyword tokenization GENERALIZED (the §7v keystone)

**Shipped the keystone from §7v(a): profile-driven longest-phrase multi-word
keyword matching in the framework base tokenizer.** Measure-first found that
multi-word profile keywords were DEAD in ~8 languages (id `ke dalam`, qu
`mana waqtalla`, he `כל עוד`, bn `তৈরি করুন`, tr `üzerine gelme`, es `tecla
abajo`, sw `isiyo sawia` all split) — only vi and hi worked, each via its OWN
**hardcoded compound list** (the vietnamese extractor's 80-entry
`multiWordPhrases`, the hindi extractor's allowlist). The generalization makes it
one mechanism, profile-driven.

- **Mechanism** (`packages/framework/src/core/tokenization/base-tokenizer.ts`):
  `initializeKeywordsFromProfile` now also builds `multiWordKeywords` (the
  space-containing `profileKeywords`, longest-first). `tokenizeWithExtractors`
  calls `tryMultiWordKeyword` after whitespace-skip, BEFORE the per-language
  extractors: it matches the longest multi-word profile keyword at a word
  boundary and emits one keyword token. No-op for single-word and no-space (CJK)
  languages (`multiWordKeywords` empty).
- **Marker/modifier concepts are EXCLUDED** (`MARKER_CONCEPT_NORMALIZEDS`):
  into/from/to/with/before/after/… + role names (patient/destination/source/
  event/eventMarker/…). Those are matched POSITIONALLY by the pattern matcher;
  greedily pre-matching a multi-word marker phrase shadows the single-word marker
  patterns depend on. Found via two real regressions the first cut produced: id
  `ke dalam` (into) swallowed the `ke` destination marker (broke the put pattern),
  and ko `할 때` (eventMarker) pre-empted the SOV event extraction (broke
  modal-close-backdrop + the §7-#367 event-marker handling). Command verbs /
  control-flow / event names are KEPT (vi `với mỗi`=for, es `tecla abajo`=keydown,
  bn `তৈরি করুন`=make) — those are keyword literals, so one-token matching helps.
- **Result**: failing execution cells **34 → 32** (bn make-element +
  make-toast-element cleared — `তৈরি করুন`=make now parses whole);
  meanExecutionFidelity 0.9523 → 0.9551; **lossy 76 → 73** (the bn pair went
  lossy→faithful — a parse-level improvement too); degen 63 unchanged. Gate green
  (all four ratchets); no language regressed. Framework 764, semantic 5916, i18n
  846, all 8 domain suites green; typechecks clean.
- **hi natural-form migration (§7v(b), partial)**: hi `matches` `मेलखाता` (wave-15
  concatenation) → natural spaced **`मेल खाता`**, now that the base matches it.
  The wave-15 lock test updated to the natural form.

**Deferred (tracked):** fully retiring the hindi/vi hardcoded lists + the
dict-wide `_` audit (§7v(b) remainder). Blocker: those lists also hold
MARKER-phrases (`से पहले`/before, `vào trong`/into, `के साथ`/with) that the base
matcher excludes — fully retiring needs the PATTERN MATCHER to accept multi-word
marker keywords (so into/before/after can leave `MARKER_CONCEPT_NORMALIZEDS`).
The lists are now redundant for non-marker keywords (the base runs first) and
coexist harmlessly. That pattern-matcher work + the underscore audit is the next
arc.

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

> **Owner decision (2026-06-12, session 8): two tracks REOPENED/APPROVED.**
>
> 1. **Parsing track reopens, scoped to the en if/unless flatten only.** The
>    session-8 probe (§7g) showed the §2 dominant cluster manifests in
>    ENGLISH: `if I match .active then A else B end` parses as flat siblings
>    (condition truncated), so the runtime rejects the bare `if`. Fixing the
>    conditional-node assembly in the semantic parser is the single biggest
>    unlock — it gates R2 expansion wave 2 (all control-flow patterns) and
>    underlies ~130 cross-language drops. The general ship-line stop still
>    applies to the REST of the parsing tail; this is a surgical reopen.
> 2. **Core-runtime gaps track approved** (the §10.7 en-side list): runtime
>    `halt` exiting the whole handler even as `halt the event`; `@attr`
>    selector family; `make` with HTML-literal selectors; the propertyAccess
>    AST rejection; `set #id.prop` / `toggle @attr` family. Independent of
>    translation; each fix re-qualifies excluded patterns for the R2 subset.

**Out of scope for the ship line:** Track 2 behaviors, R2 execution, the
`component-*` HTML templates, and R1's burn-down (baseline only).

## 10. Handoff — next session (written 2026-06-12, post-#388, session 8)

**R2 now runs the 19-pattern subset: mean 0.9542 (recalibrated), 9/23
perfect, 20 failing instances = 7 carried tails + the 13-language
tabs-content band (§7g).** All four ratchets hold; the parsing track remains
STOPPED (§9). Two session-8 process rules, both hard-learned: (1) handoff
instance-lists go stale — ALWAYS re-read `executionFailures` from the
current baseline before picking a target; (2) before regenerating a
baseline, VERIFY THE COMMITTED ONE REPRODUCES on a clean ordered rebuild
(`--regression`, zero hits expected) — session 8 caught a silently
unreproducible baseline (qu, fixed in #387) that a blind regen would have
laundered into the new floor. The remaining instances:

1. **hi set trio (3: set-text/set-inner-html possessive-dot + set-style).**
   `मेरा.textContent को क्लिक पर सेट "Done!" में` — `event-hi-bare` matches
   FIRST and captures the fronted possessive (मेरा.textContent, correctly
   assembled as a property-path!) as the EVENT; the body collapses to a
   role-less compound. The hi profile's possessive keywords are fine; this
   is event-pattern ordering/shape (the hi `into`-pattern family from the
   §10-session-6 residual map). hi is the worst language overall — expect
   the fix to drag other hi rows. CONFIRMED by probe this session.
2. **id set-style (1) — two-word possessive PHRASE.** The id row is `atur
saya punya *background ke "red"` (space form — NOT the dot-head the
   #384 passthrough fixed). tryMatchPossessiveExpression reads saya→me,
   then takes `punya` as the PROPERTY (me.punya) and strands \*background.
   Candidate: a possessive-linker skip in the matcher (id `punya` after
   saya/aku), or emission-side single-token form. CONFIRMED by probe.
3. **ja/qu put-content-basic (2).** ja `"Done!" を 私 に 置く クリック で`
   parses as a bare put (event dropped) — SOV verb-final put with trailing
   event phrase; no wrapper covers that order (unchanged from session 6).
4. **id increment-counter (1).** Corpus `pada klik tambahkan #counter` —
   the id dict emits tambahkan for increment, which the id profile parses
   as ADD (keyword collision family; the #373 allowlist lists it). Fix the
   dict word (id increment → e.g. naikkan) AND prune the allowlist row in
   the same PR.
5. **The tabs-content band (13 langs) — PROBED (session 8, post-#391): it
   is NOT 13 broken languages; it is the EN reference being lossy.** All
   13 "failers" (probed: ru/he/ko/it/ja/vi) parse ALL FOUR commands
   faithfully; the 10 "passers" (probed: de/es/tl/zh) drop `show the next
<div.tab-panel/>` exactly like en does — they pass by sharing en's
   lossiness. The failers diverge only because their faithful 4th command
   produces an extra DOM effect. There is NO per-language work here. The
   fix path is en-side and needs BOTH reopened tracks: (a) parsing — en's
   body parse silently drops `show <positional> <html-literal>`; (b) core
   runtime — even a correct parse hits the positional-node rejection (the
   dropdown-toggle "Unknown AST node type: propertyAccess" gap), so
   fixing the parse alone would turn en's reference into an ERROR and
   disqualify the pattern entirely. Land runtime support FIRST, then the
   en parse. WARNING: when en starts parsing all 4, the band INVERTS —
   today's 10 passers become the failers; expect a full re-record at the
   next `--save-baseline`, not a regression.
6. **Expansion waves remaining:** control-flow (`if-matches`,
   `unless-condition`, …) is BLOCKED on the en if/unless flatten (§7g —
   the §2 dominant cluster, parsing track); behavior-\* still out. Wave 2
   becomes possible only after en control-flow parses execute. RULE
   (locked by test) unchanged: any subset change regenerates the baseline
   AND updates the membership lock in the SAME PR.
7. **Runtime/parse gaps visible in en** (from the subset exclusions; the
   session-8 probe added five): `toggle @hidden`, `set #output.innerText
to X`, `set @disabled to true`, `set @attr … on <sel>` (tabs-aria);
   runtime `halt` exits the whole handler even as `halt the event`
   (halt-propagation); en parse drops `hide closest .modal`
   (modal-close-button); buildAST emits propertyAccess for `next .X` that
   the runtime rejects (dropdown-toggle); `make a <div.card/>` invalid
   selector (make-element, make-toast-element); en if/unless branch
   flatten (5 control-flow patterns). Core-runtime/parsing tracks,
   independent of translation.

Mechanism idiom, now 9-for-9 across two sessions (§7e/§7f): find which of
the three layers drifted — dict emission, grammar-profile emission, or
semantic profile/schema parse side — and realign the odd one out toward the
other two / toward en's parse shape; never patch the AST mappers. New
parser-side tool from #382: the buildEventHandler zero-roled-action RETRY
(semantic-parser.ts) — it re-parses fused-pattern bodies through the command
patterns with a same-action+roles acceptance guard, so improving a
language's STANDALONE command patterns now automatically improves its fused
event-handler bodies too. Beware: `CommandSemanticNode.roles` is a Map
(`.size`, not `Object.keys`).

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

Lock tests: the last ~19 describe-blocks of
`packages/semantic/test/multilingual-roadmap-fixes.test.ts` (#366–#374
parsing-track + #376–#380 R2 burn-down: wrapper destination deference, ko
quote stripping, source groups, trailing destination, set.ts convention;
#382–#385 R2 tail: fused-body retry + it/th markers, ko 에 realign,
possessive-dot passthrough, tl mula_sa) +
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

## 7x. Status update (2026-06-13, session 23): S2 fused-event arc COMPLETE (32→25)

**The S2 "fused-event body routing / compound collapse" arc — the roadmap's #1
leverage target — is done in 5 semantic-only waves, clearing 7 cells (zh ×5 + ms
×2, both languages now fully clear).** Measure-first dismantled the original
"one big body-routing mechanism" framing into FIVE distinct bugs:

| wave | mechanism                                                     | cells cleared                               |
| ---- | ------------------------------------------------------------- | ------------------------------------------- |
| 1    | zh `当 {event} 时 {body}` circumfix event pattern             | zh if-condition, if-exists, if-matches      |
| 2    | zh `匹配`→matches profile operator (§7r mechanism, zh)        | zh modal-close-backdrop                     |
| 3    | reject role-marker concept normalized as possessive property  | ms make-element (the §10 put-with-`ia` bug) |
| 4    | per-language `at end of` position noun in the clause splitter | zh make-toast-element                       |
| 5    | reject PUT_AT_END connective word as possessive property      | ms make-toast-element                       |

- **Root cause of the zh "compound collapse" (§7n/§7r):** NOT a higher-level event
  path — the `当…时` circumfix's trailing `时` leaked into the body (no event
  pattern consumed it), pushing the leading `如果` off clause-start so
  `parseBodyWithClauses` never folded the conditional (`currentClauseTokens.length
=== 0` guard). Consuming `时` in the wrapper fixed all four zh conditionals (3
  fold-and-execute immediately on English conditions; modal-close-backdrop needed
  wave 2's `匹配` operator).
- **Root cause of the ms "put-with-`ia`" (§10):** `ia`(it)/`saya`(me) are
  possessive bases AND object pronouns. `tryMatchPossessiveExpression` greedily
  read the FOLLOWING role marker as the possessive's property — `ke`→`destination`
  (wave 3, normalized-concept guard) and the at-end connective `di` (wave 5,
  PUT_AT_END-word guard). Genuine `my value`→property-path is unaffected (verified).
- **make-toast attaching put:** make-toast's 3rd clause `put it at end of body`
  attaches the made toast; without it the div is detached → zero DOM effect. Both
  the zh keyword-`结束` clause-break (wave 4) and the ms `ia di` possessive-greedy
  (wave 5) dropped that clause.
- **Result:** meanExecutionFidelity **0.9551 → 0.9649**; execution failures
  **32 → 25**. Parse-level byte-identical every wave (avgFidelity, lossy 76, degen
  63 unchanged — pure execution-layer / lossy-but-faithful fixes). All four gate
  ratchets held; baseline regenerated each wave; 15 lock tests added across the
  `multilingual-roadmap-fixes` describe blocks. Semantic 5938 green. bn was NOT a
  live S2 target (its only cell is tabs-aria → S1).

**Cluster after S2 (25 cells):** hi ×8 (S6 — next), qu ×6 (qu tokenizer),
tr ×3, ja ×2, bn/id/it/ko/th/uk ×1. The make-toast survivors (hi/qu/uk) are each
a SEPARATE arc — hi SOV, qu tokenizer, uk string-truncation. See
STRUCTURAL_ARCS_ROADMAP.md for the leverage-first continuation (S6 next).

## 7y. Status update (2026-06-13, session 23 cont.): S6 hi 6/8 (25→19)

**S6 (hi, the worst language) cleared 6 of its 8 cells in two zero-regression
waves — the "per-language grind" had two clean shared sub-levers, not eight
separate fixes.**

| wave | mechanism                                                      | cleared                                            |
| ---- | -------------------------------------------------------------- | -------------------------------------------------- |
| 1    | set schema markerOverride.hi {destination:`को`, patient:`में`} | set-text, set-inner-html, set-style, set-attribute |
| 2    | `put-hi-verb-medial` (`{patient} को रखें {destination} में`)   | make-element, make-toast-element                   |

- **Wave 1 (set-family):** hi fronts set's TARGET to position 0
  (`मेरा.textContent को क्लिक पर सेट "Done!" में`); the transformer marks target
  with को and value with में — INVERTED from the hi profile defaults — but the set
  schema had no `hi` markerOverride, so the generated hi set patterns carried the
  swapped markers, matched no corpus, and the set-family fell to `event-hi-bare`
  (capturing the fronted target as the EVENT). One marker pair → the existing
  `set-event-hi-sov-2role-dest-first` pattern matches.
- **Wave 2 (make-element/make-toast):** the transformer emits put VERB-MEDIAL in
  fused-body then-clauses (`… बनाएं फिर यह को रखें #container में`); no hi put
  pattern covered it, so it fell to `put-hi-bare` and grabbed the destination as
  the patient. Added the verb-medial pattern (closes the S3 hi put role-swap share).
- **Result:** execution **25 → 19**; meanExecutionFidelity **0.9649 → 0.9734**.
  Both waves parse-clean (no fidelity flips); gate green; baseline regenerated; 5
  lock tests added. Semantic 5942 green.
- **Probed + reverted (NOT shipped) — halt-propagation:** the leaked English
  article `the` (`the घटना`, fronted to position 0) is grabbed as the event. A
  general leading-`the` strip fixes hi but **regresses tr/form-submit-prevent 4
  actions → 1** — tr's leaked leading `the olay` is load-bearing for a fragile
  halt+call+if body parse (its faithful-with-`the` parse was an action-set
  accident — the §7j pattern). Within-tolerance, but a real per-pattern
  regression, so reverted. Needs a hi-scoped strip or tr-body hardening.

**Cluster after S6 (19 cells):** qu ×6 (qu tokenizer — largest single cluster),
tabs-aria ×5 (bn/hi/ja/ko/tr → S1), tr ×2, id/it/ja/th/uk ×1, hi halt-propagation
×1. hi 8→2; zh ×0; ms ×0.

## 7z. Status update (2026-06-13, session 23 cont.): qu tokenizer arc DONE (19→13)

**The qu tokenizer arc cleared all 6 qu cells in 3 waves — and the roadmap's
"accusative-particle over-stripping" diagnosis was wrong: it was an unknown-word
artifact, not a particle-logic bug.**

| wave | mechanism                                                          | cleared                                                                 |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1    | reference alignment to dict forms (me/it/target/body)              | modal-open, modal-close-button, modal-close-backdrop, put-content-basic |
| 2    | `cheqaq`→true in the tokenizer EXTRAS                              | set-attribute                                                           |
| 3    | single-quote strings + fused-body at-end guard + PUT_AT_END wiring | make-toast-element                                                      |

- **Wave 1 (the big lever, 4 cells):** the qu semantic profile carried formal
  spellings — me=`ñuqa`, target=`ñawpaqman`, body=`ukhu`, it=`pay` — that appear in
  ZERO corpus rows; the i18n dict emits noqa/punta/kurku/chay. So the put
  destination, the matches-condition target, and the DOM body never resolved.
  Crucially, `punta` (target) was being SPLIT into `pun`+`ta`-accusative ONLY
  because it wasn't a known word — once it's the profile's `target` reference it
  tokenizes whole. The §10/§7n "qu accusative over-stripping" was a phantom (no
  particle-logic change needed) — the §7l reference-alignment idiom did it all.
- **Wave 2:** the tokenizer mapped only arí/ari ("yes") to `true`; the dict emits
  `cheqaq` ("correct"). `set @disabled to <undefined>` → `to true`.
- **Wave 3 (3 sub-fixes for 1 cell):** (a) the qu string extractor rejected single
  quotes (to dodge the glottalization apostrophe `ch'usaq`) so `'Saved!'` broke —
  accept `'` (safe: those apostrophes are always mid-word, and the extractor only
  runs at a token start); (b) the fused make-event body routes through
  parseBodyWithGrammarPatterns, whose `end`-break lacked the S2 `isAtEndPositionNoun`
  guard, so `tukuy` (end) chopped the attaching put — guard mirrored; (c)
  `case 'qu'` didn't spread `...atEnd`, so PUT_AT_END never generated
  `put-qu-at-end`. The `pi` event-marker/at-marker collision was a red herring once
  the at-end pattern (priority 110) existed.
- **Result:** execution **19 → 13**; meanExecutionFidelity up. All waves
  semantic-only, zero regressions / fidelity flips; gate green; baseline
  regenerated; 7 lock tests added. Semantic 5949 green. The shared
  parseBodyWithGrammarPatterns guard is gated to a language's exact PUT_AT_END
  at/of words, so non-qu bodies are byte-identical.

**Cluster after qu (13 cells):** tabs-aria ×5 (bn/hi/ja/ko/tr → S1 en-reference-
lossy), tr ×2 (if-matches, set-attribute), id/it/ja/th/uk ×1, hi halt-propagation
×1. zh ×0, ms ×0, qu ×0; hi ×2. Session 23 total: **32 → 13 (19 cells, 4 arcs).**

## 7aa. Status update (R2 structural tails — batch 2: 10 → 5)

**The five remaining non-S1 R2 execution cells are cleared — each a distinct,
localized, probed-before-edit, gate-green, zero-fidelity-regression fix.** The
only remaining execution cluster is **S1 tabs-aria ×5** (the deferred
en-reference band-inversion). avgExecutionFidelity **0.9860 → 0.9930**.

| cell                 | mechanism                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| tr set-attribute     | `doğru` ("true") was in POSTPOSITIONS ("towards"), classified before isKeyword → `kind='particle'` (no `tokenToSemanticValue` case) → patient rejected. Plus the dative allomorph `ya` (vowel harmony) wasn't a marker alt. Removed `doğru` from POSTPOSITIONS; wired schema `markerVariants` into the SOV two-role generators (new `resolveRoleMarker`); added tr dative allomorphs (e/a/ye/ya) to set's patient. |
| ja put-content-basic | event phrase trails the verb (`"Done!" を 私 に 置く クリック で`); no event-LAST SOV variant, so it fell to the bare command (runs pre-click → invisible). Added `generateSOVTwoRoleEventLastEventHandlerPattern`.                                                                                                                                                                                                |
| id set-style         | dict renders "my" as two-word `saya punya`; the connector `punya` broke the possessive matcher. Added `PossessiveConfig.connectors` (id: `punya`), skipped after the possessor keyword.                                                                                                                                                                                                                            |
| tr if-matches        | folded-`if` condition truncated at the first command-beginning token; in SOV the then-verb is clause-final, so `match .disabled durdur` spuriously matched a verb-last halt pattern, cutting the condition to `I`. Added `CONDITION_OPERATORS` guard (an operator never begins a command).                                                                                                                         |
| hi halt-propagation  | the §7y-blocked one. hi fronts the halt patient with a leaked English article (`the घटना को क्लिक पर रोकें …`); the patient role grabbed only `the`, the marker `को` failed, halt fell to a BARE halt (stops handler). `skipNoiseWords` now skips a leaked `the` before `the <ref-noun> <marker>` only.                                                                                                            |

- **The §7y blocker (leaked-`the` strip regresses tr/form-submit-prevent) is
  SOLVED, not avoided.** The fix is gated three ways — non-English only (en `the`
  is authored), reference-noun keyword only (event/body/target/…, via
  `isValidReference`), AND a following particle marker. The last gate is the key:
  hi `the घटना को` has a MARKER after the ref noun (a fronted patient → skip), but
  tr `the olay çağır …` has a VERB (`call`) after it (→ leave `the` intact). tr
  form-submit-prevent keeps its 4 actions (halt,call,if,log) — verified by lock
  test and the full gate (zero fidelity regressions, vs the 1 within-tolerance
  flip the naive non-en-only gate produced).
- **All semantic-only; en reference byte-identical** (the leaked-`the` skip is
  excluded for en). Full `--regression` gate green (parse-rate, fidelity,
  correctness, execution ratchets); baseline regenerated against a freshly
  populated patterns.db; 11 lock tests added (`multilingual-roadmap-fixes.test.ts`
  → 580 in file). Semantic 5958 green.

**Cluster after batch 2 (5 cells):** tabs-aria ×5 (bn/hi/ja/ko/tr → S1) — all that
remains. The next R2 move is S1 (a deliberate en-reference band-inversion + full
re-record) or, per the stopping rule, switch to behaviors (Track 2). See
STRUCTURAL_ARCS_ROADMAP.md.

## 7bb. Status update (S1 tabs-aria — the en-reference band inversion: 5 → 0)

**The deferred S1 arc is complete; the R2 execution tail is fully cleared (0
cells).** `set @attr to V on <scope>` now captures its `on`-scope end-to-end, the
en reference flipped from lossy to scoped, and **all 24 languages reproduce it**.
avgExecutionFidelity **0.9930 → 1.0000**.

**The lossy reference (probed):** `on click set @aria-selected to "false" on .tab
set @aria-selected to "true" on me` parsed to two `set`s that BOTH dropped their
`on <scope>` (the semantic `setSchema` had only destination + patient), so both
wrote `me` (#btn) → net `aria-selected=true on #btn`. The 5 SOV translations
(bn/hi/ja/ko/tr) only reached the first set; the ~18 other languages PASSED by
sharing en's lossiness (§7g). So a real fix HAD to invert the band.

**The fix — a 4-layer scope plumb (not just an en parse change):**

1. **`scope` SemanticRole + `setSchema` role** (optional; marker `on` in every
   language — passthrough-alignment; svo/sovPosition 3). The set mapper routes it
   to `modifiers.on`.
2. **Core `SetCommand`** — the attribute write applies to EVERY scope-matched
   element (`resolveTargets`, defaulting to `[me]` when scope is absent so the
   common case is unchanged). `resolveElements` made cross-realm/missing-global
   safe (`isNodeList` vs `instanceof NodeList` — the exec harness installs no
   `NodeList` global).
3. **i18n transformer** (`transformSetWithScope` + a dedicated splitter guard,
   since `set` is excluded from `ON_TARGET_COMMANDS` for the dual-destination
   collision) — keeps `on <scope>` attached and positions it per word order:
   appended at clause end for verb-first orders and verb-MEDIAL SOV event-handler
   sets; verb-LAST repositioning (`on <scope>` before the moved verb) for SOV
   standalone then-clause sets; before a clause-final verb for qu's
   `{dest}{patient}{event}{verb}` order.
4. **Pattern capture** — the hand-crafted set patterns (`withTrailingScope`) and
   the SOV/VSO two-role event-handler generators (`appendOptionalScope`, gated on
   the scope role → no-op for put) gained an optional trailing `[on {scope}]`.

**Band inversion ABSORBED (the §10.5 worst case did NOT materialize):** because
every language was fixed in the same PR, the `--regression` gate vs the OLD
baseline showed **no new execution failures** — the previously-lossy passers now
pass against the scoped reference, and the 5-cluster improved (fail → pass). The
baseline was regenerated to RECORD the gains (execFid 1.0000, empty
executionFailures across all 24). parse-rate unchanged (0.9949); a small
avgConfidence dip (≤0.03 on a few langs, from the extra optional scope token) is
within tolerance.

**Re-qualifies §10.6's excluded `set @attr … on <sel>` family** — the
runtime/parse gap that excluded it is closed. Re-probe outcome (no new subset
cell to add): the family's only dispatchable member, `tabs-aria`, was already in
the subset (wave 2b) and now PASSES; the only other set@scope corpus cell,
`announce-screen-reader`, now parses with the scope captured but stays excluded
for a SEPARATE en gap — its `on success put event.detail.message into #X set
@role to "alert" on #X` body degenerates to a bare `compound` so its en
reference yields no effect (qu executes the identical shape, proving it is the
body parse, not the scope). Adding it would need that en body-parse fix +
per-cell trigger/`detail` support in the execution harness (a separate arc, not
the set-scope concern). The §7g exclusion bullet is annotated RESOLVED.

**Lock tests:** the `S1 tabs-aria` describe-block in
`packages/semantic/test/multilingual-roadmap-fixes.test.ts` (8 cases: en
standalone + `on me`, es SVO, ja verb-medial event-handler + verb-last
standalone, ko, qu clause-final verb, and a scope-less-set no-op guard) + the
`execute - attribute on a multi-element scope` block in
`packages/core/src/commands/data/__tests__/set.test.ts`. Semantic 5977 green;
core set 84 green; typechecks clean.

## 11. Next-arc handoffs (post-#416)

The cheap dict/profile-alignment wins are exhausted (R2 execution: 13 cells after
S2+S6+qu, parse ship line held). The next work is decomposed into focused handoffs:

- ✅ **Task #10 — multi-word markers + dict underscore audit:** DONE (#417).
- ✅ **S2 — fused-event body routing / compound collapse:** DONE (session 23, §7x;
  32→25). zh + ms fully clear.
- ✅ **S6 — hi SOV fronting:** 7/8 DONE (§7y + §7aa). hi halt-propagation cleared in
  batch 2 (the leaked-`the` blocker solved with a marker-gated skip). Only hi
  tabs-aria (S1) remains.
- ✅ **qu tokenizer arc:** DONE (session 23, §7z; 19→13; qu 6→0).
- ✅ **R2 structural tails — S3/S4/tails:** DONE (§7aa; 10→5). tr set-attribute, ja
  put-content-basic, id set-style, tr if-matches, hi halt-propagation.
- ✅ **S1 — tabs-aria ×5 (en-reference band inversion):** DONE (§7bb; 5→0). The
  `set @attr to V on <scope>` scope plumb; band inversion absorbed in-PR; all 24
  langs reproduce the scoped reference; avgExecutionFidelity → 1.0000. **R2
  execution tail fully cleared (0 cells).**
- **Per-language structural arcs (the R2 tail):**
  [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md). Every remaining R2 cell
  mapped to an arc, with a triage rubric (yield · leverage · confidence · risk ·
  unblocks) and a leverage-first ranking (~~S2~~ > ~~S6~~ > ~~qu~~ > ~~S3/S4/tails~~
  > **S1 en-lossy (only remaining, deferred)**). Opportunistic — lower ROI than behaviors.
- **Track 2 — behaviors (next big track):** 49 of the 63 degenerate passes are
  `behavior-*` (draggable/resizable/sortable ×15 each + removable ×4 +
  install-behavior ×3). This is a **runtime** effort (block-structure parsing +
  behavior execution), not parsing/i18n — the biggest single mass and the
  recommended focus after Task #10.
