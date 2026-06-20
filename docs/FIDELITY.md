# Structural fidelity: proving a meaning-preserving transform didn't silently drop something

> **Thesis.** Parse-success and text-diff both miss _silent meaning-drops_ in
> DSL/i18n translation. A structural-signature ratchet — recall + precision +
> role-typing + execution, multiset-aware, guarded by a provenance stamp — turns
> "did this transform preserve meaning?" into a CI gate that fails on backsliding
> while still letting an imperfect system ship incrementally.

This is the measurement layer behind LokaScript's multilingual pipeline (write
hyperscript in 24 languages with real SOV/VSO/V2 word-order transformation, parse
it back semantically). The transform is only trustworthy if you can _prove_ the
Japanese or Quechua rendering of `on click toggle .active` still means the same
thing. That proof is the artifact described here.

The implementation lives in
[`packages/testing-framework/src/multilingual/fidelity.ts`](../packages/testing-framework/src/multilingual/fidelity.ts)
(signatures + metrics) and
[`packages/testing-framework/src/multilingual/cli.ts`](../packages/testing-framework/src/multilingual/cli.ts)
(the `--regression` gate). The committed scoreboard is
[`packages/testing-framework/baselines/multilingual-priority.json`](../packages/testing-framework/baselines/multilingual-priority.json).

---

## The problem: the two obvious checks are both blind

You have a source program `S` (English hyperscript) and a transform `T(S, lang)`
that rewrites it into another language's word order. How do you know `T` preserved
meaning?

- **Text-diff is useless.** `T(S, 'ja')` is _supposed_ to be byte-different from
  `S` — it's a different language in a different word order. Every character
  differs by design. A diff tells you nothing about meaning.
- **Parse-success is a liar.** "The parser returned a non-null AST" is trivially
  easy to satisfy. A translated `if/focus/halt` body can parse as a bare `if` —
  non-null, "passing", and _wrong_. Returning _something_ is not returning the
  _right thing_.

The gap between them is where silent meaning-drops live: the transform (or the
parser consuming it) quietly loses a command, adds a phantom one, keeps the verb
but mistypes a role, or computes the wrong value — and every coarse check says
green.

## The idea: compare _structural signatures_, not text

Parse both `S` and `T(S, lang)` to semantic node trees, then reduce each tree to a
small, **word-order-agnostic signature** and compare the signatures. Because the
signature is a _set/multiset of structural facts_ — not surface text — a faithful
SOV/VSO reorder scores identically to the English source, while a parse that loses
structure scores low.

Three signatures, increasingly strict (all in `fidelity.ts`):

| Signature           | What it captures                                                                                                                                                                                            | Function                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **action set**      | the distinct command verbs anywhere in the tree (`toggle`, `add`, `if`, `on`…), excluding the structural `compound` wrapper                                                                                 | `collectActions`         |
| **action multiset** | same, but duplicates preserved (`[toggle, toggle, put]`)                                                                                                                                                    | `collectActionsMultiset` |
| **role signature**  | per command, which roles were filled and with what _value type_ — `add.patient:selector`, `put.destination:reference` — compared by role + type, never by value string (values are legitimately translated) | `collectRoleSignature`   |

## The six signals: defense in depth

Each signal catches a failure mode the previous ones are structurally blind to.
That layering is the whole point — no single number is sufficient.

| #   | Signal                                          | Catches                                             | Blind to                                          |
| --- | ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| 0   | **parse-rate** (non-null)                       | total parse failures                                | everything about _correctness_                    |
| 1   | **R0-recall** (`computeFidelity`)               | **dropped** commands                                | added commands, wrong roles, wrong values         |
| 2   | **R0-precision** (`computePrecision`, multiset) | **added/phantom** commands                          | wrong roles, wrong values                         |
| 3   | **R1 role-fidelity**                            | dropped / **mistyped roles** (verb kept, role lost) | wrong values, wrong effect                        |
| 4   | **R2 execution**                                | wrong **values / DOM effect** (the ground truth)    | nothing — but only affordable on a curated subset |

Read top-to-bottom: each row sees what every row above it cannot. Read as cost:
the cheap structural signals (1–3) run over the **entire** corpus; the expensive
ground-truth signal (4) runs jsdom over a **curated subset**. The structural
signals are a cheap, full-coverage _proxy_ for the execution truth you can't
afford to run everywhere.

### Recall (R0): the dropped-command detector

```text
recall = |reference_actions ∩ candidate_actions| / |reference_actions|
```

**Worked example — `behavior-removable` in Japanese.**
The English behavior's action set is
`{behavior, halt, if, js, on, remove, set, trigger}` (8 verbs). An earlier
Japanese parse dropped three of them — `set` (the `init` body) and `remove` +
`trigger` (the commands trailing a nested `if … end` block) — yielding
`{behavior, halt, if, js, on}`, recall `5/8 = 0.625`.

Text-diff: 100% different (it's Japanese) — silent.
Parse-success: non-null event-handler — green.
Recall: `0.625` — **caught**, with the exact missing verbs named.

(Those three drops were three distinct parser defects, each fixed and ratcheted
separately — recall is what made them _visible and countable_ in the first place.)

### Precision (R0): the phantom-command detector — and why it must be a _multiset_

Recall is fooled by _addition_: if a render injects a command the source never had,
every reference action is still present, so recall stays `1.0`.

```text
precision = (candidate actions justified by the reference, multiset) / |candidate actions|
```

**Worked example — the phantom `toggle`.** Several languages' event-handler
_rendering_ injected a spurious `toggle` ahead of the real one. Reference
`[on, toggle]`; candidate `[on, toggle, toggle]`.

- Recall = `2/2 = 1.0` — **fooled**.
- A _set_-based check would dedupe `[on, toggle, toggle] → {on, toggle}` and also
  see nothing.
- Multiset precision: reference counts `{on:1, toggle:1}`; the candidate's third
  token finds no remaining `toggle` to justify it → `2/3 = 0.667` — **caught.**

The multiset is load-bearing: a _duplicated_ phantom is exactly the case a Set
erases. (`spuriousActions` returns the unjustified extras for diagnostics.)

### Role-fidelity (R1): the verb's-right-but-wrong detector

A parse can find every command with the **wrong roles** — a swapped or dropped
patient/destination executes incorrectly while scoring recall `1.0`. R1 compares
the role signature (`action.role:valueType`) against the English reference. So
`add .a to me` parsed as `add` with the destination lost (`add.patient:selector`
present, `add.destination:reference` missing) is recall-perfect but R1 < 1.

Cross-language comparison is by role **name + value type**, never value string —
the value is supposed to be translated; the _shape_ is not.

### Execution (R2): the ground truth, rationed

Two parses can share an identical action set _and_ role signature yet still
produce different DOM effects (wrong selector, swapped operands). R2 runs a curated
subset in jsdom and compares the actual DOM mutation against the English
reference's. It's binary and deterministic, so its tolerance is **0**. It's the
truth — and the reason the structural proxies exist is that this truth is too
expensive (and often not well-defined) to run over all 3,696 cases.

## The ratchet: monotonic, not absolute

The gate does **not** demand `fidelity = 1.0`. It can't yet — faithful SOV/VSO
reordering is genuinely hard, and the system is honestly imperfect (cross-language
`avgFidelity ≈ 0.98`, `avgPrecision ≈ 0.96`, `avgRoleFidelity ≈ 0.83`). Demanding
perfection would block all progress.

Instead it ratchets: **fidelity may never go down.** Each signal compares the
current run against the committed baseline and fails CI on a _backslide_, with a
small tolerance to absorb non-determinism in the corpus build:

| Signal          | Constant (`cli.ts`)                                                     | Fails when                                                        |
| --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| parse-rate      | `REGRESSION_TOLERANCE_PTS = 2`                                          | drops > 2 pts                                                     |
| degenerate (R0) | `FIDELITY_REGRESSION_TOLERANCE = 3`                                     | > 3 faithful→degenerate flips                                     |
| recall (R0)     | `LOSSY_REGRESSION_TOLERANCE = 3` + `AVG_FIDELITY_DROP_TOLERANCE = 0.02` | > 3 faithful→lossy flips, or per-language avgFidelity drop > 0.02 |
| precision (R0)  | `AVG_PRECISION_DROP_TOLERANCE = 0.02`                                   | per-language avgPrecision drop > 0.02                             |
| role (R1)       | `AVG_ROLE_FIDELITY_DROP_TOLERANCE = 0.02`                               | per-language avgRoleFidelity drop > 0.02                          |
| execution (R2)  | tolerance `0`                                                           | any curated pass→fail                                             |

Each signal is **guarded by the baseline carrying its field** — a baseline written
before a signal existed yields a `0` delta for it, so adding a signal never
retro-flags old work. After an _intentional_ fidelity change you regenerate the
baseline (`--save-baseline`) and commit it; the new numbers become the floor.

This is what lets an imperfect system ship one honest increment at a time: you
prove each change _only improves or holds_, never silently regresses.

### Triage bands

Recall passes are bucketed (`FIDELITY_THRESHOLD = 0.5`) so not all imperfection is
equal:

- **degenerate** (`fid < 0.5`) — lost most of the structure; the worst, tracked
  separately so it can't hide inside an average.
- **lossy** (`0.5 ≤ fid < 1.0`) — clears the floor but silently drops ≥ 1 command.
- **faithful** (`fid = 1.0`).

## The staleness guard: provenance, because a green run can still be a lie

A subtle, real footgun: the gate compares a freshly-computed run against a
_committed_ baseline, but the run reads a generated corpus (`patterns.db`). If that
DB was generated from _different source_ than the current checkout, the comparison
is meaningless — and silently so. A DB synced on one branch, then scored on
another, produces phantom regressions (or phantom passes).

So the corpus build writes a **provenance stamp** — a SHA-256 of the source that
determines the DB's content (the i18n + semantic `src` trees, the seed data, the
sync script;
[`packages/patterns-reference/src/sync/db-stamp.ts`](../packages/patterns-reference/src/sync/db-stamp.ts)).
The gate checks it before comparing: if the source changed since the last sync, the
gate **refuses to run** and tells you to re-sync. A correctness gate that can be
silently fed stale inputs isn't a gate; the stamp closes that hole.

## Why this generalizes

Nothing here is hyperscript-specific. The pattern is:

> For any transform `T` that should preserve meaning between representations
> (i18n of program _structure_, codegen, AST migrations, lowering passes,
> serialization round-trips), reduce both sides to **structural signatures**,
> score **recall and precision as a multiset**, add a **role/type** signature for
> argument-level fidelity, validate a **curated subset against ground-truth
> execution**, and **ratchet** the whole thing monotonically with a
> **provenance-stamped** input so the gate can't be fed stale data.

Most i18n and codegen projects ship with none of this — they have text-diffs,
snapshot tests, and "it parsed" — and so they cannot distinguish a faithful
transform from a plausible-but-lossy one. That distinction is the contribution.

## Map to the code

| Concept                            | Location                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------- |
| signatures + recall/precision/role | `packages/testing-framework/src/multilingual/fidelity.ts`                 |
| `--regression` gate + tolerances   | `packages/testing-framework/src/multilingual/cli.ts`                      |
| committed scoreboard / floor       | `packages/testing-framework/baselines/multilingual-priority.json`         |
| provenance stamp                   | `packages/patterns-reference/src/sync/db-stamp.ts`                        |
| running the gate locally           | root `CLAUDE.md` → "Running the multilingual `--regression` gate locally" |
| worked phenomena the gate guards   | `packages/semantic/test/multilingual-roadmap-fixes.test.ts`               |
