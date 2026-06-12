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
- **R2 — execution smoke ratchet (runtime, later).** Execute a curated subset of
  transformed patterns in the browser harness and assert DOM effects match the
  en reference's effects. This is the true production signal but a mini-project
  (effect capture, async patterns, flake control). Sequence after the parsing
  ship line, alongside Track 2.

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

## 10. Handoff — next session (written 2026-06-12, post-#372, session 3)

Read first: §7b (closing state), §9's track table is two sessions stale —
ignore it. Lock tests: `packages/semantic/test/multilingual-roadmap-fixes.test.ts`
— the last seven describe-blocks are #366–#372 and document every mechanism,
including the negative guards (ko 아니면 never unless; qu qillqay stays copy;
ko 동안 stays while; de löschen stays remove; the ar multi-line behavior guard
on Stage 2.5). i18n-side locks in `packages/i18n/src/grammar/grammar.test.ts`
(ko 할 때 emission + selector-event suppression; commands.blur ×5).

State: **avgFidelity 0.9690 | lossy 122 | degenerate 63 | R1 roleFidelity
0.7552**. Gate green on main. Economics unchanged (~+0.0001/instance):
0.97 needs ~11 more; lossy<100 needs ~22; the full ship line is one focused
session if the per-language tails cooperate. The behavior-\* degenerate block
(~40 instances) is untouched by all three sessions and is the single biggest
remaining mass — but it needs multi-line block parsing work, not keyword
realigns.

Half-confirmed mechanisms with probe evidence (rank-ordered):

- **possessive-dot triple (id/ms/vi, ~8 instances).** get-attribute-possessive-
  dot, method-call-possessive-dot, input-mirror. The transformer leaves
  dot-fused compounds verbatim (`my.getAttribute("data-id")`); en tokenizes
  `my` as keyword and assembles the property path, id/vi leave it an
  identifier and the put clause dies. PROBED: adding a `my`-passthrough
  keyword to the id tokenizer is NOT sufficient — the expression assembly
  (pattern-matcher property-path building) still rejects it. Probe there.
  ms also emits `saya_punya nilai` (underscore split) for `my value`.
- **ms put-with-ia (~3).** `letak ia ke #result` FAILS while `letak itu ke
#result` parses put — although ia tokenizes keyword(it) identically to itu.
  Both ms fetch tails (fetch-basic/event-debounce/fetch-loading-state) are
  blocked on it (their fetch halves parse). Suspect reference-value handling
  in the matcher, not the profile (ms.ts:25 `it: 'ia'` is the only listing).
- **if-exists body-word destinations (id/ar/ms/sw/tl/bn, ~6).** The then-tail
  put (`taruh itu ke badan`) drops; with `#out` it parses. NOT the references
  table alone (fr/pt aligned and still failed until #371; id badan vs profile
  tubuh IS misaligned, ar dict جسم vs profile الجسم too). After #371 the
  de/fr/pt instances are fixed; for the rest, realign dict body words to the
  profile references AND probe what value-type the put destination gets.
- **unless-condition SOV-final (ja/tr/hi/ko/bn, ~5 + zh 把, qu spurious-if).**
  The SOV transformer scatters unless: condition fronted, unless-word at the
  ABSOLUTE END of the handler (`I match .disabled 切り替え .selected を クリック
で でなければ`). No mid-stream trick rescues that — it needs either an
  emission-side rule (keep unless mid-stream like pt salvo) or a clause-final
  unless extractor mirroring the for-loop fix. ko's dict emits 아니면 for
  unless (the ELSE word — locked guard): the ko dict needs a different word
  entirely (~하지 않으면 class) BEFORE any parse-side work. zh `除非 把 …`
  fails the condition role on 把. qu mana_sichus reads as if (sichus wins).
- **hi (8 lossy + 8 degen, role 0.543 — worst language, untouched).** Two
  known leads: a generated hi `into`-pattern matches `में …` clauses before
  fallbacks can fire (blocks the for-loop fix landing for hi), and hi shares
  the keydown/announce/fetch-json shapes that realigns fixed elsewhere —
  check the hi dict words against the profile first (the #361/#364/#372
  class; it has been the highest-yield move three sessions running).
- **he tail (15 lossy).** send-event/send-event-to-form/send-with-detail/
  socket-send/trigger-event/tell-\* — probably one את-particle or verb
  mechanism for the whole family; one probe should tell.
- **URL token-kind parity (latent class, no instance tonight).** Only ~9
  tokenizers classify `/api/x` as kind url; the rest emit identifier→
  expression, which fetch patterns happen to accept. A 16-file parity sweep
  was prototyped and REVERTED as risk-without-reward (url→literal changes
  other patterns' type checks). If a future fetch/go/path bug appears, start
  here, and measure R1.

Meta-lessons (now ~13-for-13 across three sessions): the dominant residual
class is **mis-listed keywords** — a word listed under a role/action it does
not mean (kung-as-kapag, آخر-as-end, mettre/colocar/setzen-as-set,
동안-as-for, wyczyść-as-clear, 아니면-as-unless). Before trusting ANY
structural diagnosis, grep the word in (a) the curated parser keyword sets
(then/end/else in semantic-parser.ts), (b) handcrafted pattern alternatives
(patterns/\*.ts), (c) the profile keywords, and (d) fix-translations.sql.
New this session: (6) standalone-clause probes do NOT exercise parseClause —
probe corpus-shaped full strings, then isolate; (7) Stage 2 returns the FIRST
command match and silently drops trailing then-chains — any new command
pattern can expose it; (8) dict commands.X shadows events.X in event-name
translation (blur) — parse-safe only if the command word is also in
eventNameTranslations; (9) `git stash push` pathspecs resolve against CWD —
run it from the repo root.

Operating mode that worked (now 16 PRs over two overnight runs): unchanged —
measure-first probe, one mechanism per PR (realign batches of the same class
may bundle), serialize merges on the baseline file, prototype the next
mechanism in the working tree while CI runs, stash with named messages.
The probe→falsify rhythm matters more than the plan: five of seven PRs
tonight fixed something OTHER than the documented diagnosis.
