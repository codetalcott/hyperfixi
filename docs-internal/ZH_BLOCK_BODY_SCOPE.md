# Chinese (zh) Block-Body / BA-Marking Residue — Project Scope

> **Status:** Partially shipped. **✅ DONE:** the **zh `wait` BA-marked duration**
> slice (the last zh `repeat-*` residue — `repeat-forever` 0.67 → 1.0) and the
> **zh `那么` then-connective recognition** (#2 — profile now agrees with the i18n
> package that `那么` is a `then` keyword; a consistency fix, no behavioral change).
> **⏳ REMAINING:** the **deeper root cause** (#1 — the i18n transformer's generic
> patient-marking emits ungrammatical `把` on non-patient args) and the zh
> `fetch`-in-event-block gap (#3). #1 is architecturally significant (the i18n role
> model) and is the main open item.
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

### #2 — zh then-keyword `那么` recognition — ✅ SHIPPED

The i18n package deliberately maps `then` → `那么` (`dictionaries/zh.ts`; and
`parser-integration.test.ts` asserts `zhKeywords.resolve('那么') === 'then'`), and
the grammar transformer emits `那么` for `then`. The semantic zh profile, however,
listed only `然后` / `接着`, so `isThenKeyword('那么','zh')` was false — the parser
recognized `然后` but not `那么`.

**Finding (the gap was masked):** investigation showed this was a _latent
consistency gap, not an observable parse bug_. `parseClause`'s matchBest loop
recovers the commands on either side of an unrecognized `那么`, and event-handler
bodies re-parse regardless — so action sets and compound structures were already
identical for `那么` vs `然后`. (The "then-chains split on the wrong keyword" framing
in the original scope was overstated; the standalone single-command-only behavior is
a _general_ limitation affecting English too, not zh-specific.)

**Fix shipped:** added `那么` to the zh profile's `then.alternatives`
(`profiles/chinese.ts`), so the semantic parser and the i18n package now agree that
`那么` is a zh then-connective — removing the fragile dependence on the matchBest
fallback. Zero behavioral change (full `browser-priority` regen identical:
3679/3696, degenerate 132, no regression), if/then-consequence parsing unaffected.
Locked by `multilingual-roadmap-fixes.test.ts` ("zh then-connective 那么 recognized").
The tokenizer particle-extractor (`chinese-particle.ts` → `consequence`) was left as
is: `那么` still surfaces as a `keyword` token and `isThenKeyword` matches it by
profile value, so no precedence change was needed.

> **Original analysis (kept for the record):** The semantic tokenizer has a
> `那么`→then entry, but a particle extractor maps `那么` to role `consequence`,
> so `那么` surfaced with an empty `normalized`. This didn't block recovery (the
> clause parser's matchBest loop still found the next command after the
> unrecognized `那么`), but the keyword tables disagreed across packages.

### #3 — zh `fetch`-in-event-block (deferred elsewhere)

The roadmap notes a deferred zh `fetch` keyword/block-body gap in event handlers.
It is the same family as #1 (zh block-body parsing through the BA/marker layer); a
real #1 fix may unblock it. Cross-reference when picking #1 up.

## Suggested sequencing

1. ~~**#2 (then-keyword reconciliation)**~~ — ✅ done (profile `那么` alias; consistency fix).
2. **#1 (transformer role model)** — the big one, and the main open item. Scope a
   controlled change to honor `primaryRole` when marking, A/B against the gate + zh
   grammar suite, and retire the per-command handcrafted `把` patterns it makes
   redundant.
3. **#3 (zh fetch block-body)** — re-probe after #1; likely partially unblocked.

## Probe

Use the probe at the bottom of `NON_SOV_REPEAT_SCOPE.md`. **Caveat learned the hard
way:** the probe transforms its input `en → lang`, so pass **English** source
(`wait 1s`), not pre-transformed zh — feeding raw zh re-transforms it into garbage
and produces false negatives. To test a raw zh string directly, call
`parseSemantic('等待 把 1s', 'zh')` instead of going through the probe's transform.

## Definition of done (for the remaining work, #1 + #3)

The transformer emits grammatical zh for duration/literal-primary commands (no
spurious `把`); the per-command `把` workaround patterns (wait, …) retired where the
transformer fix subsumes them; `--regression` gate green; zh grammar suite clean.
(`那么` then-recognition, #2, is already done.)
