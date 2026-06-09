# Chinese (zh) Block-Body / BA-Marking Residue — Project Scope

> **Status:** Mostly shipped. **✅ DONE:** the **zh `wait` BA-marked duration**
> slice (the last zh `repeat-*` residue — `repeat-forever` 0.67 → 1.0); the
> **zh `那么` then-connective recognition** (#2); and now the **deeper root cause**
> (**#1 — the transformer role model**: it no longer emits ungrammatical object
> markers on a command's literal/measure primary argument). **⏳ REMAINING:** the
> zh `fetch`-in-event-block gap (#3), re-probed after #1 and found **not**
> unblocked — it's a distinct keyword-misalignment + source-marking track (see #3).
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

### #1 — Transformer over-applies `把` to non-patient arguments — ✅ SHIPPED

> **Fix shipped.** The transformer now honours a command's **primary role** when
> assigning the default role to its leading argument, so a literal/measure primary
> is no longer mis-marked as a fronted object. Concretely: a new
> `applyPrimaryRole` step (`transformer.ts`, run between `parseStatement` and
> `translateElements`) re-assigns the mis-defaulted `patient` value to the
> command's true primary role when that role is a **literal/measure** role
> (`LITERAL_PRIMARY_ROLES = {duration, quantity}`) **and** the target profile has
> no marker for it — so it can only ever _remove_ a spurious marker, never
> introduce a different one. The primary-role data lives in a local
> `COMMAND_PRIMARY_ROLES` map (`constants.ts`), kept in lock-step with the semantic
> command schemas by `command-primary-roles.test.ts` (so the i18n browser bundle
> needn't pull in the whole semantic graph).
>
> **Scope decisions (validated empirically, all to avoid regressions):**
>
> - **Only literal/measure primaries** (`duration`, `quantity`). Marker-bearing
>   primaries (`set`→destination `到`, `fetch`→source `从`, `send`/`trigger`→event)
>   are left on the `patient` default. Re-marking `event`-primary commands in a
>   language with _no_ event particle (Korean) made the semantic parser emit a
>   phantom `on` action — an over-generation that recall-based fidelity misses.
> - **Command statements only, not event handlers.** In `on click wait 2s …`, a
>   verb-final SOV language without an event particle (Korean) uses the leading
>   argument's object marker as the structural cue that anchors the handler;
>   un-marking it loses the `on`. The block-body / then-chain `wait` clauses this
>   fix targets are each parsed as their own command statement, so still covered.
>
> **Result:** standalone & block-body `wait` now emit grammatical `等待 1s` (zh),
> `待つ 1s` (ja), `대기 1s` (ko) — no spurious `把`/`を`/`를`. `--regression` gate
> green (parse 3679/3696, degenerate 132, **0 regressions**); per-language
> avgFidelity **he ↑ / hi ↑**, all others neutral. The `wait-zh-ba` workaround
> pattern is retained as a now-inert **defensive fallback** (the transformer no
> longer feeds it). Locked by the grammar suite's "Duration / literal-primary
> marking" block and `command-primary-roles.test.ts`.
>
> _Original analysis (kept for the record):_

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

### #3 — zh `fetch`-in-event-block (still deferred — re-probed after #1)

**Re-probed after #1 shipped: not unblocked.** `on click fetch /api/data then put it
into #result` still parses zh-degenerate (`当 点击 时 获取 把 /api/data 那么 …` → `{on}`,
fid 0.33). #1 does **not** touch it because `fetch`'s primary role is `source`
(marker-bearing), which #1 deliberately excludes — re-marking marker-bearing
primaries caused over-generation regressions in marker-lacking languages (see #1's
scope decisions). So #3 is a **distinct track**, not a corollary of #1. Concrete
findings from the re-probe:

- **Keyword misalignment (the German/ja-fetch pattern).** The i18n zh dict emits
  `fetch: '获取'` (`dictionaries/zh.ts`), but the semantic zh profile reads `获取` as
  **`get`** (`generators/profiles/chinese.ts:68`) — its `fetch` primary is `抓取`
  (`chinese.ts:105`). So `获取 …` never parses as `fetch`. Realigning the dict to
  `fetch: '抓取'` is necessary but **not sufficient**.
- **Source marking.** Only the `从`-marked form parses: `parseSemantic('抓取 从 /api/data','zh')`
  → `{fetch}`; `抓取 /api/data` and `抓取 把 /api/data` both → `{}`. The transformer
  emits neither `抓取` nor `从` (it emits the patient `把`). A real fix needs the zh
  `fetch` source argument marked `从` (or a `fetch-zh` pattern that tolerates `把`/no
  marker), plus the `as json` (`responseType`) form, plus the block-body/then-chain
  collapse so the trailing `put` also recovers.

This is a multi-part keyword + marker + block-body change (its own focused PR), not
the contained one-liner the German fix was. Tracked here and in `MULTILINGUAL_ROADMAP.md`.

## Suggested sequencing

1. ~~**#2 (then-keyword reconciliation)**~~ — ✅ done (profile `那么` alias; consistency fix).
2. ~~**#1 (transformer role model)**~~ — ✅ done (`applyPrimaryRole`; honors literal/measure
   primaries; gate green, 0 regressions, he/hi avgFidelity ↑).
3. **#3 (zh fetch block-body)** — re-probed after #1, **not** unblocked. Its own track:
   dict realign (`获取`→`抓取`) + zh `fetch` source-marking/pattern + `as json` + block body.

## Probe

Use the probe at the bottom of `NON_SOV_REPEAT_SCOPE.md`. **Caveat learned the hard
way:** the probe transforms its input `en → lang`, so pass **English** source
(`wait 1s`), not pre-transformed zh — feeding raw zh re-transforms it into garbage
and produces false negatives. To test a raw zh string directly, call
`parseSemantic('等待 把 1s', 'zh')` instead of going through the probe's transform.

## Definition of done

- **#1 ✅** — The transformer emits grammatical zh/ja/ko for duration/literal-primary
  commands (no spurious `把`/`を`/`를`); `--regression` gate green (3679/3696,
  degenerate 132, 0 regressions); zh grammar suite clean; locked by the grammar
  suite's "Duration / literal-primary marking" block + `command-primary-roles.test.ts`.
  The `wait-zh-ba` pattern is kept as an inert defensive fallback (the transformer no
  longer feeds it) rather than retired — harmless, and removing it would drop a
  safety net for legacy/hand-written `等待 把 1s` for no gate benefit.
- **#2 ✅** — `那么` then-recognition.
- **#3 ⏳** — still deferred; a distinct fetch keyword + source-marking + block-body
  track (see #3 for the concrete next steps surfaced by the post-#1 re-probe).
