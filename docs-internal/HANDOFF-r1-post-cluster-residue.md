# Handoff — R1 residue after the five-cluster triage (fronted repeat-while · sw kama homonym · singletons)

> **Written 2026-07-05**, immediately after clusters D (#567) and E (#568) landed
> the same session (B/A1/C landed 2026-07-04 as #564/#565/#566 — see
> [HANDOFF-r1-residual.md](HANDOFF-r1-residual.md) for that triage and its
> status blocks). All five clusters from that triage are now done. This doc is
> the fresh grounding for what remains, from same-session probes against a
> fresh populate.

## Where things stand (2026-07-05 baseline, commit fb09542c)

Corpus mean R1 **0.9654** (was 0.9535 at the start of 2026-07-04). Worst six:
**qu 0.9347 · hi 0.9381 · ko 0.9428 · tr 0.9475 · ja 0.9479 · bn 0.9507**.
Worst precision: **bn 0.9344 · hi 0.9400 · ja/ko 0.9517**. Parse 3696/3696,
degenerate/lossy 0, R2 1.0 on the 47-pattern curated subset.

**PR stack state:** #567 (cluster D, based on main) ← #568 (cluster E, based
on #567). Both regenerate `multilingual-priority.json`; #568's copy supersedes
#567's, so merge #567 first, retarget #568 to main, merge. **Start the next
arc from merged main**, re-run the ordered build + populate, and re-probe
before trusting any number in this doc.

## The three remaining items (ranked by suggested order)

### 1. sw `kama` homonym — phantom `if` family (precision, sw-specific, smallest)

sw `kama` is both "as" and "if". The sw SEMANTIC parser reads a standalone
`kama` as an `if` command, so any translation carrying `kama <word>` grows a
phantom `if`. Probed spurious-action list for sw (multiset, vs en reference):

- `computed-value` → `["if","if"]` (precision 0.500 — one per `kama Number`;
  the second appeared when cluster E restored the dropped second operand — the
  knowingly-accepted −0.0011 in #568)
- `event-debounce`, `fetch-with-headers`, `fetch-formdata` → `["if"]` each
- (same probe also surfaced non-kama singletons: `breakpoint-command` →
  `["halt"]`, `go-back` → `["go"]`, `behavior-sortable` → `["empty"]`)

Fix options, in precedent order:

1. **Dict-side (pl get/pobierz precedent, cheapest):** make the i18n sw dict
   emit a non-homonym "as" word so the transformer output stops colliding.
   Check what natural sw uses — `kama` is the idiomatic "as/like", so verify an
   alternative reads acceptably before swapping; if none does, go parser-side.
2. **Parser-side:** make the sw `if` head require more than the bare keyword
   (e.g. reject `kama` when it is immediately followed by a bare
   identifier/number inside an expression run, or require a condition-shaped
   continuation). Riskier — touches sw if-parsing for all patterns.

Ratchet note: sw avgPrecision is 0.9842 — nowhere near the 0.02 per-language
ratchet, so this is opportunistic quality, not a gate risk. But it is the
single biggest identified phantom-action family with a known mechanism.

### 2. SOV fronted repeat-while (hi/qu/ko + likely ja/bn/tr; parser-side arc)

Cluster D canonicalized en repeat-while to `repeat{loopType:literal="while",
condition:property-path}` and added verb-first while-heads (es/it/de/… now
match in full). The SOV translations front the while-phrase BEFORE the event
phrase:

- hi `जब तक #counter.innerText < 10 को क्लिक पर दोहराएं …`
- ko `동안 #counter.innerText < 10 를 클릭 할 때 반복 …`

These parse as a SEPARATE `while{condition:property-path}` node followed by a
bare `repeat{}` (ko's repeat carries `loopType:literal=10` — a value bug, but
the TYPE matches so ko only misses `condition`). Current misses: **hi/qu
condition+loopType (2 each) · ko condition (1)** — unchanged counts from
before cluster D (neutral by design; D deliberately left this shape alone).

Fix shape: this is FOLD machinery, not a head pattern — the fronted
`while{condition}` node needs to merge into the adjacent `repeat` (set
`loopType="while"`, move `condition`, drop the separate while node). Precedent:
the trailing-`unless` guard recovery in `parseBodyWithClauses`
(semantic-parser.ts) which re-associates a fronted condition with its body.
Alternative: transformer-side (emit the while-phrase after the verb in SOV) —
riskier, changes translations corpus-wide; probe first. Check ja/bn/tr/qu
shapes before scoping (only hi/qu/ko were probed this session).

Precision bonus: the merge removes the phantom standalone `while` action
(currently spurious vs the en reference for these patterns).

### 3. Singleton families (corpus-wide, opportunistic — batch or skip)

Carried over from the 2026-07-04 triage (counts per language unless noted),
plus new observations from the cluster D probes:

- `send.destination:reference` ×2 (send-with-detail, socket-send — every lang)
- `wait.duration:literal`, `tell.destination:selector`,
  `trigger.event:literal` singletons (every lang)
- `halt.patient:reference` ×4 (es/it/de only — ABSENT in the SOV trio; also
  the behaviors' `halt the event` line, seen again in the D probes)
- `js.patient:expression`; `render.style:expression` ×2 (trio)
- **NEW (D probes):** `add.destination:reference` en NOISE on for-body
  patterns — en `add .processed to item` parses `destination:reference=me`
  (the `to item` binding-var destination is dropped and defaulted), while
  it/qu produce the arguably-correct `destination:expression="item"` and get
  penalized for it. Same shape as the old repeat-head noise: fix the EN
  reference first (`to {identifier}` → destination:expression), then check
  which langs already match. Affects repeat-for-each + stagger-animation
  (it/qu missing lists).
- **Still open from the original triage:** cluster A2 — expression-valued
  `set` patients (`"Hello, " + my value`, two-way-binding) need multi-token
  expression-run assembly in matchRoleToken (greedy-capture risk; A/B per
  marker).

Each is small; none is a coherent arc on its own. Suggested treatment: batch
2–3 of the en-noise ones (add.destination, wait.duration, trigger.event) into
one "en-reference noise sweep" PR with the same discipline (probe → en fix →
per-lang check → gate → baseline regen).

## Working discipline (unchanged — it has worked for five clusters)

One increment per PR; fresh ordered build + populate before any probe (Node
24 via nvm — better-sqlite3 is compiled for it; the shell may default to Node
20); six-signal `--regression` gate + per-(lang,pattern) A/B per change;
guard tests that FAIL without the fix (verify via stash round-trip, then
REBUILD the stashed package — mtime staleness trips the gate); regenerate the
baseline only on intentional change against a fresh populate; never commit
patterns.db. Probe-writing notes: end `.mts` probes with `process.exit(0)`;
standalone statement parses only try patterns at position 0 (no skip-ahead);
value bugs are invisible to R0/R1 — check R2/execution probes for them.
