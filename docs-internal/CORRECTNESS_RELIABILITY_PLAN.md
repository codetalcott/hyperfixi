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

## 10. Handoff — next session (written 2026-06-12, post-#365)

Read first: §7 (current state), §8 (R1 — now SHIPPED, burn-down unscheduled),
§9 (the track table is stale; use the table below). Lock tests:
`packages/semantic/test/multilingual-roadmap-fixes.test.ts` — the last nine
describe-blocks are #357–#365 and document every mechanism.

State: **avgFidelity 0.9608 | lossy 189 | degenerate 67 | R1 roleFidelity
0.7505 recorded**. Gate green on main at `32c62e3d`. Per-instance economics
still ≈ +0.0001 avgFidelity per cleared lossy instance; 0.965 needs ~42 more,
0.97 needs ~90 + lossy<100 (i.e. nearly everything). The cheap universal
clusters are gone — what remains is per-language/per-cluster work.

Half-confirmed mechanisms with probe evidence (rank-ordered):

- **ko event marker (highest yield, needs care).** The i18n `koreanProfile`
  (`packages/i18n/src/grammar/profiles/index.ts`) has NO event-role marker —
  the only SOV profile without one (ja emits で, tr de/da) — so every ko
  handler emits a bare event name and the semantic `*-event-ko-sov-*` patterns
  (which expect 할 때) can't anchor; verb-homonym events (블러) hijack whole
  handlers into a bare verb. Adding
  `{ form: '할 때', role: 'event', position: 'postposition', required: true }`
  measured **net ko 0.9244→0.9492, lossy 13→10, degen 7→5, global +0.0008**,
  BUT flipped 4 ko patterns faithful→lossy (announce-screen-reader: a SECOND
  spurious 할 때 lands after a non-event clause-final role; fetch-json: set
  drops; form-disable-on-submit: put drops; if-exists: put drops) — over the
  R0 tolerance (3), branch dropped. `required: false` does NOT change the
  emission. Fix the 4 (likely the transformer's role-mapper marking non-event
  roles, plus body-path interactions) and this is ~7 net instances + the
  biggest ko unlock.
- **tl/ar if-first VSO reorder (Track B, mechanism confirmed).**
  `event-tl-kapag` (`packages/semantic/src/patterns/event-handler.ts` ~1536)
  lists **'kung' (= if!) as a kapag-alternative**, so if-first emissions
  (`kung <cond> … kapag <event> …`, focus-trap class) match the EVENT pattern
  with event=`target` — the if-clause is eaten. Removing 'kung' alone leaves
  no anchor; the real fix is an if-first mid-stream reorder (Stage-1.5
  sibling in semantic-parser.ts): detect `<if-clause> <kapag-event> <body>`,
  build handler(event){if(cond){body}}. ar analog: `إذا … عند <event> ثم …`.
  ~8–10 instances (tl 11 lossy, ar 8).
- **SOV clause-final for-loop (bn/hi/ja/ko/qu/tr).** #358's table fixed SVO;
  these six emit `<var> <in-word> <coll> <pat-marker> <for-word>` with the
  for-keyword LAST (`item में $items को के_लिए`). Needs an SOV for-loop
  pattern (or generator variant) anchored on the trailing keyword. 6 instances
  (template-literal-list-build) + fetch-json tails.
- **SOV clause-final unless (ja/ko/tr/hi/qu) + zh 把-blocked unless.** The
  dict words exist but sit clause-final (`… tıklama de değilse`); zh 除非
  tokenizes fine but `除非 把 I match …` fails the condition role on the 把
  particle. ~6 instances. NOTE the locked guard: ko 아니면 must NEVER become
  an unless keyword (it's the else word — see the #361 lock test).
- **Underscore-compound tokenizer splits (vi/hi/qu).** ru/uk word extractors
  split at `_` (если*не → если+*+не) — fixed by realigning to real words
  (кроме/крім). vi trừ*khi and hi जब*तक*नहीं still split; tl maliban_kung
  works (its extractor treats * as a word char). Either teach those extractors
  `_`, or pick single-word dict emissions.
- **Residual clusters worth a probe each:** keydown-key-is-syntax (9 langs;
  `on keyup[key is 'Escape']` — the bracketed `key is X` form),
  fetch-loading-state (9; `add … fetch … then remove …` — the fetch drops
  mid-chain in ar, others vary), event-debounce (8; `debounced at 300ms`
  modifier), if-exists put/set tails (9; de/fr/pt parse put-as-set via verb
  collision — setzen/mettre/colocar double as set; id/ar drop it entirely:
  `taruh itu ke badan` fails on the untranslated `badan`), blur-element (5),
  render/morph-with-template (id/ms/qu/tl/vi).
- **R1 burn-down (new track, NOT started).** Mean roleFidelity 0.7505; worst
  hi 0.543, qu 0.648, ko 0.688, it 0.693, ja 0.703. Expect transformer-side
  role-assignment bugs (the swapped patient/destination class). Start by
  dumping per-pattern roleFidelity from results.json parseResults[].roleSignature
  for hi and clustering by command.

Meta-lessons confirmed again tonight (now nine-for-nine across two sessions):
the documented diagnosis is wrong until probed (the ja "generator gap" was a
TOKENIZER split — も particle ate もし; the qu "transformer-side" set bug was
a stale fix-translations.sql override re-stomping a fixed dict on every
populate). New ones: (1) when a fix needs a profile keyword, check whether the
word ALREADY means something else in that language (ko 아니면 = else; sw
mwisho = end) — the R0 warning list is the cheapest detector; (2) the
underscore-compound trick only works in tokenizers whose word extractor
includes `_`; (3) `populate` re-runs fix-translations.sql, so any dict realign
must check that file for a frozen override of the same rows.

Operating mode that worked: measure-first probe → one mechanism per PR →
serialize merges (the baseline conflicts) → prototype the NEXT fix in the
working tree while the current PR is in CI, stash, pop onto a fresh branch
after merge. Nine PRs in one night with zero gate failures except the one the
ratchet correctly blocked.
