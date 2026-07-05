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

> **STATUS: DONE (2026-07-05).** Dict-side fix, option 1 as suggested: the i18n
> sw dict + grammar profile now emit `kuwa` ("to be/become" — the conversion
> sense, cf. `badilisha kuwa`) for `as`/method, and the semantic `fetch-sw`
> pattern reads `kuwa` as the responseType marker (hand-written `kama` still
> tolerated in as-marker position via a new `asMarkerAlternatives` param on
> `markerlessFetch`). A/B over all 8 kuwa-carrying sw translations: the 4
> phantom-if patterns (computed-value, event-debounce, fetch-with-headers,
> fetch-formdata) all reach precision 1.0, 4 unchanged, 0 regressed. sw
> avgPrecision 0.9855 → 0.9942. The non-kama singletons surfaced by the same
> probe (breakpoint-command `halt`, go-back `go`, behavior-sortable `empty`)
> remain — item 3 territory.

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

> **STATUS: DONE (2026-07-05).** All SIX suspects were affected (probe confirmed
> ja/bn split like hi; tr/qu never formed a `while` node at all). Two-part fix:
> (a) `foldFrontedWhileIntoRepeat` in semantic-parser.ts — at the end of
> `parseBodyWithClauses`, a flat `while{condition}` clause immediately followed
> by a flat condition-less `repeat` merges into one
> `repeat{loopType:"while", condition}` (junk numeric loopType from the
> comparison tail, ko/ja/tr `loopType:10`, is overwritten; loop nodes with
> bodies never enter the fold). (b) dict↔profile while-keyword alignment for
> the two languages whose fronted head never parsed: qu `kay_kaq`→`kaykamaqa`,
> tr `iken`→`süresince` (`iken` is the tr WHEN primary) — two
> `KNOWN_MISMATCHES` entries pruned. After the fix all six languages match the
> en reference role-for-role on repeat-while; fold blast radius corpus-wide is
> exactly {hi,bn,ja,ko,tr,qu}×repeat-while, and the qu/tr dict words appear in
> no other pattern. avgRoleFidelity +0.001–0.002 and avgPrecision +0.0013
> across the six; zero metric decreased anywhere.

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

> **STATUS: PARTIAL (2026-07-05).** The suggested en-noise batch landed as one
> PR, resolving two of the three families:
>
> - **add.destination (for-body)** — three-part fix: (1) the add schema's
>   destination now admits `expression` (a loop binding var `item` tokenizes as
>   expression, so `[selector, reference]` rejected the marked `to item` and
>   defaulted to `me` in the EN reference and most translations alike); (2) a
>   parse-scoped bound-identifier registry (repeat/for patients + set
>   destinations) lets the strict trailing-destination reclaim admit `item に`
>   in SOV; (3) a bound identifier captured as a bare literal (ja/ko typing)
>   canonicalizes to expression in normalizeCommandRoles. repeat-for-each and
>   stagger-animation now match en in ALL languages; only behavior-sortable's
>   deep case remains for hi/bn/ja/ko/tr (its `set item` binding sits in a
>   nested handler sub-parse).
> - **trigger.event** — event NAMES canonicalize to `literal` on command nodes
>   (normalizeCommandRoles): en typed `trigger init` literal only because
>   `init` is an en keyword; untranslated names elsewhere typed expression, and
>   colon-split `sortable:start` fragments hid truncation behind a vacuous
>   expression:expression type match. Both the trigger-event 15-lang miss and
>   the behaviors' family are gone.
> - **wait.duration — NOT fixed, diagnosed:** en `wait for transitionend`
>   parses as `wait{duration:literal="for"}` — the KEYWORD is captured as the
>   duration and the event name is dropped (wait-en-generated). The honest fix
>   needs a `wait for {event}` head + an event role on the wait schema + AST
>   mapper support (the wait mapper reads only `duration`) + a duration→event
>   value-shape relabel for the marker-less translations (`esperar
transitionend`) — an R2-touching arc, out of scope for this sweep.
>
> Per-lang aggregate deltas from the honest-reference shift: 12 langs up
> (qu +0.0029, it/pl +0.0022, zh/he +0.0017, …), 5 langs slightly down
> (bn/hi −0.0010, ms/th/tl −0.0017 — vacuous matches of the old noise now
> visible as real drops); corpus mean up. Gate green on all six signals.

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
