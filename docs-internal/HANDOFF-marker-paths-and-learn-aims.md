# Handoff: the marker-resolution code-path split, domain-learn's aims, and priority languages

> **STATUS 2026-07-25 — items 1 and 2 are CLOSED; item 3 is deferred, deliberately.**
> Four commits on `fix/per-pattern-parse-ratchet`: `d8d71105` (R5 ratchet + lossy
> tolerance 0), `76e0c3b0` (`schemaMarkerAlternatives`), `1c868ee5` (shared
> `CssSelectorExtractor`), `442f5e4d` (ja/ko ablative).
>
> **Three of this brief's own premises did not survive measurement** — read these
> before trusting anything below:
>
> 1. **The ratchet blind spot is real but not where this brief says.** One parse
>    flip is invisible to every signal (exactly 0.0000 on the five avg* ratchets,
>    since a failed parse leaves numerator AND denominator). But reverting the
>    #763 fix does not produce a parse failure at all — the parser degrades to a
>    LOSSY parse, and the lossy cushion of 3 swallowed it. The fix was the new R5
>    ratchet **plus** dropping lossy to 0. Verified: green before, red after.
> 2. **`resolveMarkerForRole` never read `markerVariants` in either branch.** The
>    asymmetry was in `pattern-generator.ts`, and `event-handlers-vso.ts` was worse
>    still — it read neither field in its default branch. One live victim: tr
>    `set`'s dative allomorphs. The recommended schema-validator error was NOT
>    added: with both fields merged by one helper, declaring both is no longer
>    silent loss, so the error would have fired on `put` and needed an allowlist
>    to say "correct". A pinning test in `schema-consistency.test.ts` does the job.
> 3. **`DOMAIN-LEARN-PARITY-FINDINGS.md` measured a function the product does not
>    ship.** lokascript-learn never imports `renderLearn` and explicitly declines
>    to use domain-learn's parser. Both pieces of evidence this brief cites for
>    reading (B) dissolve on inspection: `parse_learn` is auto-generated for every
>    registered domain, and the playground parses with `@lokascript/semantic`.
>    **Owner decided (A): domain-learn is a generator.** So the queue in item 2
>    below was NOT worked — it targets `renderLearn`.
>
> Also found, not in this brief: `parse_learn`/`parse_todo` silently truncated CSS
> selectors to their sigil in four domain DSLs. Fixed in `1c868ee5`.
>
> The remaining work is the imperative forms —
> `docs-internal/HANDOFF-imperative-forms.md`, which is a much smaller job than it
> looks. Item 3 (priority languages) is gated on it.

**Paste "The prompt" below into a fresh Claude Code session opened in `~/projects/hyperfixi`.**

Successor to `docs-internal/archive/HANDOFF-learn-parity-and-markers.md` (all three of its
items landed in PR #763, branch `fix/sovslot-pattern-generation`). That file's
closing section — "§ What the three items actually found" — is the context for
items 1 and 2 here; read it, plus the **Traps** section of
`HANDOFF-parity-and-marker-tail.md`, before touching marker data.

Three items. **Item 1 is a latent-bug fix with a real gate question attached.
Item 2 is a design conversation before it is a code change. Item 3 is a
prioritisation decision that is the owner's, and the data below argues with the
current draft of it.** They are independent and do not need one session.

---

## The prompt

> Three follow-ups from PR #763, brief at
> `docs-internal/HANDOFF-marker-paths-and-learn-aims.md` — read it fully, plus
> the **Traps** section of `HANDOFF-parity-and-marker-tail.md`.
>
> Item 1 is the marker-resolution code-path asymmetry: a real latent bug plus an
> open question about whether the multilingual ratchet can see single-pattern
> regressions at all. Do the empirical check the brief describes BEFORE
> proposing a fix, and tell me what you find — the answer changes what the fix
> should be.
>
> Item 2 is domain-learn. Do NOT start fixing the queued defects. Start by
> answering what the package is FOR, using the evidence in
> `docs-internal/DOMAIN-LEARN-PARITY-FINDINGS.md`, and come back to me with the
> options — the defect list looks different depending on the answer.
>
> Item 3 is target-language prioritisation for lokascript-learn. The brief has
> coverage data that disagrees with my draft list; read it, then give me a
> recommendation rather than just implementing my list.
>
> Constraint unchanged: `renderX` output is frozen unless I've agreed to a
> specific change. Any `@lokascript/semantic` marker or pattern-generation change
> needs the multilingual `--regression` gate AND the downstream lokascript-learn
> verification, with the regenerated baseline in the same commit.

---

## Item 1 — `markerLegacy` and `markerVariants` are on different code paths

**A latent bug, currently masked.** Marker resolution has two branches and each
reads only one of the two alternative-marker fields:

| branch | taken when | reads |
| --- | --- | --- |
| **override** | the role has `markerOverride[lang]` | `markerLegacy[lang]` |
| **profile-default** | it does not | `markerVariants[lang]` |

(`resolveMarkerForRole` in `packages/semantic/src/parser/utils/marker-resolution.ts`;
mirrored by `pushWord` / `asMarker` in `packages/semantic/src/generators/pattern-generator.ts`
and again in `event-handlers-sov.ts`.)

So **adding a `markerOverride` to a language silently deletes its
`markerVariants`.** In #763 this stopped `לך את back` parsing the moment `go`
gained `markerOverride.he` — the exact thing the previous brief instructed
("add `markerLegacy` for every language whose rendered marker changes"). Two
tests in `packages/semantic/test/multilingual-roadmap-fixes.test.ts` caught it.

The fix applied was minimal and local: move he's `את` into `markerLegacy` (it is
a parse-only synonym, which is what `markerLegacy` is for), leave zh's `把` in
`markerVariants` because zh has no override, and comment both sites. **The trap
itself is untouched** — the next person to add a `markerOverride` to a language
that has `markerVariants` will hit it again.

### The open question: can the ratchet see this at all?

`לך את back` is a real corpus row (`go-back`, he). So the multilingual
`--regression` gate parsed a pattern that had started failing — and the question
nobody has answered is whether it would have gone green anyway.

The arithmetic says it would: one pattern out of ~159 per language is a **0.63pt**
parse-rate drop, against a **2pt** tolerance. The degenerate and lossy ratchets
tolerate 3 flips. The fidelity/precision/role/value ratchets tolerate 0.02. Every
one of those tolerances exists to absorb cross-machine float and collation drift
(see CLAUDE.md), which means **a single-pattern regression in a single language
may be structurally invisible to all nine signals.**

**Do this before proposing anything:**

```bash
# 1. Reproduce the break in isolation: remove `'את'` from goSchema.destination's
#    markerLegacy.he in packages/semantic/src/generators/command-schemas.ts
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```

If that comes back green, the gate has a blind spot worth a signal of its own —
a zero-tolerance "no pattern that parsed in the baseline now fails to parse"
check, which is cheap (the baseline already records per-pattern results) and
catches a class the percentage-based signals cannot. If it comes back red, say
so and drop the idea; the tolerances are doing their job.

### Then fix the trap itself

Three options, roughly increasing in blast radius. Recommend one:

- **(a) Make the override branch read both.** `legacyMarkerAlternatives()` also
  merges `markerVariants[lang]`. Simplest, but it directly contradicts the
  comment on that function and **trap #2 of the parent brief** — `put`'s
  `before`/`after` variants carry a distinct `method` role via `methodCarrier`,
  and merging them as synonyms is what broke 23 languages at once. Only safe if
  it merges variants that have no `methodCarrier`, which makes it conditional
  rather than simple.
- **(b) Make it a validation error.** A schema check that fails the build when a
  role declares `markerVariants[lang]` *and* `markerOverride[lang]` — forcing the
  author to decide which the variant is. Zero runtime risk, catches every future
  instance, and does not touch the resolution semantics. There is already a
  schema validator to hang it on (`packages/semantic/src/generators/schema-validator.ts`).
- **(c) Document only.** Add it to the `RoleSpec` field docs and the parent
  brief's Traps list. Cheapest, and does nothing to stop recurrence.

(b) is the recommendation unless the gate check above shows the ratchet is blind,
in which case do (b) *and* the new signal — (b) prevents the schema mistake, the
signal catches everything else that breaks one pattern quietly.

---

## Item 2 — domain-learn: what is it FOR?

**Do not start fixing the defect list.** The measurements say something more
basic is unresolved, and the fix list looks different depending on the answer.

`docs-internal/DOMAIN-LEARN-PARITY-FINDINGS.md` has the full data. The headline:

```
renderLearn output re-parsed by domain-learn's own parser:
  en 14/15   es 13/15   pt 13/15   ar 12/15   zh 12/15   fr 11/15
  ja  0/15   ko  0/15   tr  0/15   de  0/15          TOTAL 75/150
```

The tool shows a learner a sentence it cannot itself read back, in four of its
ten languages. Plus: `set` renders its two roles in **opposite orders in all 10
languages**; ko and tr fail on input as simple as `.x 추가` / `.x ekle`; tr's
profile keywords are ASCII-folded (`kaldir`) while the renderer writes correct
Turkish (`kaldır`), so a Turkish learner typing their own language correctly does
not parse.

### The question

Whether any of that is a bug depends on what the package is for, and the code
supports at least two readings that imply different fixes:

- **(A) A generator.** It produces natural-language sentences for learners to
  READ, and parsing them back is incidental. Then the 75/150 is not a defect at
  all, the parity lock is the right and sufficient outcome, and the only real
  bugs are `set`'s role order and the ja/ko `get`/`fetch` source particle.
- **(B) A round-trip DSL.** Learners TYPE what the tool shows them, so the
  rendered surface must parse. Then 75/150 is the headline defect, ko/tr are
  effectively non-functional, and the fix is per-language keyword `alternatives`
  covering the imperative forms.

Evidence for (B): `createLearnDSL()` exposes `parse`, lokascript-learn has a
playground that accepts learner input in all 10 languages
(`shared/__tests__/playground-examples.test.ts`), and the profiles already carry
*some* imperative alternatives (es `quita`, tr `kaldirmak`) — which only makes
sense if input was meant to parse. Evidence for (A): the imperative forms live in
the renderer's own tables and were never synced to the profiles, in any language,
which is not how a round-trip design drifts.

**Answer this from the code and from lokascript-learn's actual UX before
proposing work**, then bring the owner the two options with the fix-list each
implies. The owner has flagged they want to step back on the package's aims —
this is that conversation, so lead with it rather than with the defect queue.

### If the answer is (B), the queue is already ordered

Cheapest first, from the findings doc — note the first one is nearly free and
de-risks the pattern for the rest:

1. **de keyword alternatives** — pure profile data. All 15 German imperatives are
   separable-verb forms (`hinzufügen` → `füge hinzu`) absent from the profile's
   `alternatives`. Verified in isolation: `hinzufügen .x zu #a` parses, `füge
   hinzu .x zu #a` does not. Takes de from 0/15 to ~15/15 with no schema or
   renderer change and nothing downstream rendering differently.
2. **tr ASCII folding** — decide first whether the folding is a deliberate
   tokenizer constraint or simply wrong. If wrong, ADD the correct spellings as
   alternatives rather than replacing the folded ones.
3. **ja/ko imperative alternatives** — same shape as (1), larger table.
4. **`set` role order** — needs a decision about which side is right first.
5. **ja/ko `get`/`fetch` source particle** — a schema fix; the one place the
   renderer is already correct.

All of these move parse patterns, so each needs the downstream lokascript-learn
verification before landing.

---

## Item 3 — priority languages for lokascript-learn (owner's call; the data argues)

The owner's draft list is **Japanese, Portuguese, Spanish, Chinese, Indonesian,
Korean, Turkish, Vietnamese**, on prospective-audience size.

Two facts change what that list costs, and a third suggests it is incomplete.

### Fact 1 — two of the eight do not exist

domain-learn and lokascript-learn both ship exactly **en, es, ja, ar, zh, ko, fr,
tr, de, pt**. **Indonesian and Vietnamese are not among them.** Adding either is
new-language work — a `LearnLanguageProfile` with morphology tables (conjugation
forms per verb), sentence frames, a tokenizer and curriculum content — not
polish. That is a materially different cost from the other six and should be
decided separately.

There is a head start: PR #763 gave `@lokascript/semantic` correct directional
markers for both (id `ke`, vi `vào`/bare-after-`đi đến`), and both already have
full semantic tokenizers and profiles among the 24. So the semantic layer is
ready; it is the domain-learn layer that is missing.

### Fact 2 — current content investment is almost inverted from the draft

Content files in `lokascript-learn/shared/{curriculum,exercises}` mentioning each
language, against the round-trip health from item 2:

| lang | in learn? | round-trip | content files | draft priority |
| ---- | --------- | ---------- | ------------- | -------------- |
| en   | ✓         | 14/15      | 34            | reference      |
| ja   | ✓         | **0/15**   | 31            | #1             |
| pt   | ✓         | 13/15      | **4**         | #2             |
| es   | ✓         | 13/15      | 21            | #3             |
| zh   | ✓         | 12/15      | 16            | #4             |
| id   | **✗**     | —          | 0             | #5             |
| ko   | ✓         | **0/15**   | 21            | #6             |
| tr   | ✓         | **0/15**   | 16            | #7             |
| vi   | **✗**     | —          | 0             | #8             |
| ar   | ✓         | 12/15      | 25            | dropped        |
| fr   | ✓         | 11/15      | 17            | dropped        |
| de   | ✓         | **0/15**   | 14            | dropped        |

Two readings of that table:

- **"Polish" means different work per language.** ja/ko/tr are broken *engines*
  with good content. pt is a healthy engine with almost no content (4 files —
  thinnest of all ten, while ranked #2). Those are different teams' worth of
  work, and lumping them under one priority list will mis-plan both.
- **Three deprioritised languages currently have more content than three
  prioritised ones.** ar (25) and fr (17) beat tr (16), zh (16), de (14) and pt
  (4). Deprioritising them is a decision to strand existing investment, which may
  well be right — but it should be explicit rather than incidental.

### Fact 3 — Hindi is the notable omission

If the criterion is prospective audience, Hindi has a speaker base in the same
class as Spanish and Portuguese and sits in one of the world's largest developer
populations. It is absent from the draft list AND from domain-learn. It is also
already fully supported in `@lokascript/semantic` (24 languages), and #763 just
corrected its `go` marker. It deserves an explicit accept or reject rather than
silence — and if the answer is "add new languages", it belongs in the same
decision as id and vi.

### Recommendation to put to the owner

1. **Keep the six that exist** (ja, pt, es, zh, ko, tr) as the polish set — the
   draft is well-aligned with the defect data there, since ja/ko/tr are exactly
   the broken ones.
2. **Split id + vi (+ hi?) into a separate "new domain-learn language" decision**,
   sized honestly. Do not let them ride along inside "polish".
3. **Keep de in scope opportunistically.** It is 0/15 like ja/ko/tr but is the
   *cheapest* fix of the four — profile data only — and doing it first proves the
   pattern for ja/ko at near-zero cost.
4. **Keep ar as a structural canary regardless of audience rank.** It is the only
   RTL and the only VSO language in domain-learn's ten, which makes it the only
   test surface for a whole class of marker-position and word-order bugs. Its
   audience rank and its testing value are different arguments; dropping it on the
   first loses the second.
5. **Decide pt's problem is content, not engine**, and plan it as authoring.

None of this is settled — items 2 and 3 interact (if item 2 answers (A), the
"broken engine" column above stops mattering and the whole list reorders around
content). Resolve item 2 first.

---

## Gates you will need

**Vocab consistency (V1–V4)** — run this FIRST for any marker change, before the
expensive gates:

```bash
cd packages/testing-framework && npx tsx src/vocab/cli.ts validate
```

**It is NOT part of `npm run test:check`**, which is exactly how a broken marker
reached CI in #763: the th `go` marker `ยัง` classifies as `identifier` rather
than keyword/particle, so it cannot tokenize as vocabulary — trap #5 of
`HANDOFF-parity-and-marker-tail.md`, in a language nobody thought to check. V4
validates every schema marker, profile keyword and grammar form against that
language's tokenizer, and it is fast (~1s). The gate carries 138 waived errors;
what matters is the **unwaived** count.

The fix that mattered there is worth generalising: when V4 rejects a marker,
consider whether the word is genuinely wrong for the language before adding it to
the tokenizer's keyword list. `ยัง` is also the very common Thai adverb
"still/yet", so promoting it would have mis-tokenized ordinary Thai — the right
answer was to render bare, which Thai motion verbs take anyway. **A V4 failure is
sometimes telling you the marker is wrong, not that the tokenizer is incomplete.**

**Multilingual `--regression`** (any semantic marker or pattern-gen change):

```bash
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```

After an intentional change: `--save-baseline`, commit the baseline in the SAME
commit. Do NOT commit the locally-regenerated `patterns.db`.

**Downstream lokascript-learn** (any change to a package it consumes). Do NOT
repoint its `file:` deps; overlay `node_modules` instead, and **include
`framework` in the overlay even if you did not change it** — published 2.8.0
predates `createDomainRenderer` and overlaying only domain packages fails with
~19 import errors that are environmental:

```bash
cd ~/projects/lokascript-learn
# back up node_modules/@lokascript/{pkg}, copy local dist/ + src/ over them
bun test shared/ db/ server/     # expect 1781 pass / 0 fail
bunx tsc --noEmit                # expect clean
# restore the backups afterward
```

Note `bun test` writes to `AUDIT.md` in that repo — revert it afterwards. Their
E2E global-setup fails identically on published 2.8.0 (environmental); don't
chase it.

## Traps carried forward

Everything in `HANDOFF-parity-and-marker-tail.md` § Traps still applies. Added by
#763:

- **`markerLegacy` / `markerVariants` are on different branches** — item 1 above.
- **`renderOverride` without `markerOptional`** produces a surface the generated
  pattern cannot read back. Rendering a role bare means the parse side can no
  longer require its marker.
- **Bundle-size gzip is platform-dependent.** `packages/core/src/metadata.ts`
  carries the sizes CI measures (Linux zlib); a local macOS `npm run update:sizes`
  reads lower and reports a spurious `CHANGED`. Read failing sizes from the CI
  log, not from a local measurement. Measured offset in #763:

  | bundle       | local (macOS) | CI (Linux) |
  | ------------ | ------------- | ---------- |
  | hybrid-hx-v4 | 320.5 KB      | 322.2 KB   |
  | browser      | 308.7 KB      | 310.7 KB   |
  | minimal      | 76.1 KB       | 76.2 KB    |
  | standard     | 82.6 KB       | 82.7 KB    |

  Note `minimal`/`standard` show as CHANGED locally while CI reports them
  unchanged — so a local run over-reports which bundles moved, not just by how
  much. `metadata.ts` stores gzip as a 1-decimal KB **string**, so the value in
  the CI log is directly committable. Only the two full bundles ever actually
  move on a schema-text change; the small ones are pure platform noise.

- **The vocab gate is not in `test:check`.** See the Gates section — run
  `npx tsx src/vocab/cli.ts validate` from `packages/testing-framework` for any
  marker change.
- **Generated patterns' `format` string disagrees with their own `tokens`** about
  which side of its value an SOV marker sits on — `format` resolves position from
  the profile alone. Pre-existing, documentation-only (nothing reads `format`),
  pinned with a test expectation in `pattern-generator.test.ts`. Left alone
  deliberately: fixing it moves every SOV golden entry with a marker.
