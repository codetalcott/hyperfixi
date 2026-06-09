# Chinese (zh) Block-Body / BA-Marking Residue — Project Scope

> **Status:** Partially shipped. The **zh `wait` BA-marked duration** slice is
> **✅ DONE** (the last zh `repeat-*` residue — `repeat-forever` 0.67 → 1.0; see
> below + `MULTILINGUAL_ROADMAP.md` → Shipped). This file scopes the **deeper
> root cause** behind it (the i18n transformer's generic patient-marking) and the
> related zh then-keyword mismatch, both of which the shipped slice worked around
> at the parser rather than fixing at the source.
> **Prereq reading:** `NON_SOV_REPEAT_SCOPE.md` (the arc this fell out of) and
> `MULTILINGUAL_ROADMAP.md` → Shipped.

## Shipped (the contained slice)

**zh `wait` BA-marked duration.** The i18n transformer emits `等待 把 1s` for
`wait 1s` — it runs the argument through a generic parser that defaults the first
argument to the `patient` role (`transformer.ts` ~L910/973: `let currentRole = 'patient'`),
and zh marks `patient` with the BA particle `把` (`profiles/index.ts`:
`{ form: '把', role: 'patient' }`). The generated semantic pattern is
`等待 {duration}` (no `把`), so `等待 把 1s` didn't match and the trailing `wait`
dropped (the zh `repeat-forever` body `… 那么 等待 把 1s 结束` lost its `wait`).

A handcrafted `wait-zh-ba` pattern (`packages/semantic/src/patterns/wait.ts`) now
tolerates the optional `把` before the duration, mirroring the existing
`toggle-zh-ba` convention. **zh `repeat-forever` 0.67 → 1.0** (now recovers the
full `{on, repeat, toggle, wait}` body); avgFidelity zh 0.794 → 0.808; parse rate
unchanged (3679/3696), 0 regressions. Locked by `multilingual-roadmap-fixes.test.ts`
("zh wait BA-marked duration").

This is the same shape as the qu increment fix — a contained, per-command
handcrafted pattern that absorbs a transformer/parser keyword-or-marker mismatch.

## What's left (the root causes the slice worked around)

### #1 — Transformer over-applies `把` to non-patient arguments

`等待 把 1s` is **ungrammatical zh** (a duration is not a BA-construction object;
natural zh is `等待 1s` / `等待 2秒` — which the transformer's own example table at
`transformer.ts` ~L2009 already lists as the intended form). The generic argument
parser assigns every leading argument the `patient` role, so any command whose
primary argument is a **duration / literal / measure** — not a fronted object —
gets a spurious `把`:

- `wait <duration>` → `等待 把 <dur>` (worked around here)
- likely also `settle`, `transition` durations, and other literal-primary commands
  (unverified — probe before assuming).

**Root-cause fix:** teach the transformer that a command's primary role can be a
non-patient (the semantic command schemas already carry `primaryRole` — e.g.
`wait.primaryRole = 'duration'`). The transformer's role model is independent of
the semantic schemas, so this is an **architecturally significant** change to how
i18n assigns/marks roles — it affects every zh patient-marked command and the
display-quality of translated output, not just parsing. Validate against the full
zh grammar test suite (`packages/i18n/src/grammar/grammar.test.ts`) and the
multilingual `--regression` gate. Until then, the per-command handcrafted patterns
(toggle/add/wait …) absorb the mismatch on the parse side.

### #2 — zh then-keyword mismatch (`那么` vs `然后`)

The i18n dictionary maps `then` → `那么` (`dictionaries/zh.ts`), but the semantic
zh profile's `then` is `然后` / `接着`. The semantic tokenizer has a `那么`→then
entry, but a particle extractor (`tokenizers/extractors/chinese-particle.ts` maps
`那么` to role `consequence`) shadows it, so `那么` surfaces with an empty
`normalized` and `isThenKeyword` doesn't recognize it. In the shipped slice this
didn't block recovery (the clause parser's matchBest loop still found `等待` after
the unrecognized `那么`), but it means **zh then-chains split on the wrong keyword
wherever the transformer is the source** — a latent correctness gap for multi-clause
zh bodies.

**Fix:** reconcile the i18n dict (`那么`) and the semantic profile (`然后`) on one
canonical `then`, and resolve the tokenizer's particle-vs-keyword precedence for
`那么` so it normalizes to `then`. Smaller and more isolated than #1; do it first.

### #3 — zh `fetch`-in-event-block (deferred elsewhere)

The roadmap notes a deferred zh `fetch` keyword/block-body gap in event handlers.
It is the same family as #1 (zh block-body parsing through the BA/marker layer); a
real #1 fix may unblock it. Cross-reference when picking #1 up.

## Suggested sequencing

1. **#2 (then-keyword reconciliation)** — small, isolated, fixes a latent
   multi-clause zh correctness gap. Probe `a 那么 b 那么 c` round-trips first.
2. **#1 (transformer role model)** — the big one. Scope a controlled change to
   honor `primaryRole` when marking, A/B against the gate + zh grammar suite, and
   retire the per-command handcrafted `把` patterns it makes redundant.
3. **#3 (zh fetch block-body)** — re-probe after #1; likely partially unblocked.

## Probe

Use the probe at the bottom of `NON_SOV_REPEAT_SCOPE.md`. **Caveat learned the hard
way:** the probe transforms its input `en → lang`, so pass **English** source
(`wait 1s`), not pre-transformed zh — feeding raw zh re-transforms it into garbage
and produces false negatives. To test a raw zh string directly, call
`parseSemantic('等待 把 1s', 'zh')` instead of going through the probe's transform.

## Definition of done (for the remaining work)

`那么` recognized as `then` (zh multi-clause bodies split correctly); the transformer
emits grammatical zh for duration/literal-primary commands (no spurious `把`); the
per-command `把` workaround patterns retired where the transformer fix subsumes them;
`--regression` gate green; zh grammar suite clean.
