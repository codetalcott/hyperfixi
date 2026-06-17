# Multilingual accuracy & reliability — next steps

> **Entry point, written 2026-06-16.** This is the _current_ forward-looking plan.
> The detailed session logs live in
> [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md) (§7a–§7cc, §11),
> [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md),
> [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md),
> [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md) and
> [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md). Read this first,
> then dive into those for the per-arc detail.

## Where we are (2026-06-17 baseline · commit `18939a01` · `browser-priority`)

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp` + `commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                         | Value                    | Notes                                          |
| ------------------------------ | ------------------------ | ---------------------------------------------- |
| parse rate                     | **3688 / 3696 (99.78%)** | 8 hard fails (was 10)                          |
| degenerate passes (fid < 0.5)  | **29**                   | was 39                                         |
| lossy passes (0.5 ≤ fid < 1.0) | **94**                   | was 113 — still the bulk of correctness debt   |
| faithful (fid = 1.0)           | **~3565**                | was ~3534                                      |
| avgFidelity (R0-recall)        | **0.985**                | was 0.982                                      |
| avgPrecision (R0 trust floor)  | **0.960**                | hi 0.815 is the outlier (next-lowest ja ~0.91) |
| avgRoleFidelity (R1)           | **0.833**                | **the laggard dimension**                      |
| avgExecutionFidelity (R2)      | **1.000**                | curated subset fully reproduces en DOM effects |

The six-signal ratchet gate is fully wired (parse-rate · degenerate · R0-recall ·
R0-precision · R1 · R2) — see CLAUDE.md "Multilingual parse rate ≠ fidelity".
**Direction now: stop adding gate signals; spend them down.**

> **Update 2026-06-17 (PR #445, behavior-removable he/zh).** The two he/zh
> `behavior-removable` hard fails are fixed (null → lossy: he 0.556, zh 0.667).
> Root cause was two stacked bugs: (1) the i18n transformer inserted a
> pre-positioned object marker before the behavior name in he/zh
> (`behavior את Removable` / `behavior 把 Removable`), which broke the semantic
> block parser's `tokens[1]` name detection; (2) `parseConditional` dropped the
> condition of block-style `if <cond>` (no inline `then`) in **all** non-English
> languages. The condition fix is cross-language, so it rippled positively:
> `behavior-removable` degen→lossy in 7 other langs, and draggable/resizable
> collapsed from ~23 → 8–9 non-faithful each. Zero regressions; avgFidelity and
> avgRoleFidelity up in every language. **All 8 remaining hard fails are now
> reactivity (Track 2).**

## The leverage map (what's actually non-faithful) — 2026-06-17

Of the **131** non-faithful instances (29 degenerate + 94 lossy + 8 hard-fail),
two clusters dominate:

| Cluster                                                                         | degenerate | lossy | hard-fail |  total |   share |
| ------------------------------------------------------------------------------- | ---------: | ----: | --------: | -----: | ------: |
| **Behaviors** (removable/sortable/resizable/draggable + install)                |         18 |    47 |         0 | **65** | **50%** |
| **Reactivity** (bind-\* / live-\* / two-way / computed / intercept / window-\*) |          8 |     0 |         8 | **16** |     12% |
| **Control-flow** (`unless-condition` + then-chain bodies)                       |          1 |    10 |         0 |     11 |      8% |
| Long tail (fetch-do-not-throw, get-value, tell-\*, set-color-variable, …)       |          2 |    37 |         0 |     39 |     30% |

Per-pattern: `behavior-removable` 6 degen + 17 lossy (was 13 degen + 8 lossy + 2 hard) ·
`behavior-sortable` 9 degen + 14 lossy · `unless-condition` 1 degen + 8 lossy ·
`behavior-resizable` 1 degen + 8 lossy (was 21 lossy + 2 degen — the block-`if` fix) ·
`behavior-draggable` 8 lossy (was 23 lossy). **Hard fails were all reactivity** (ms `bind-*`×4,
sw `two-way-binding`/`computed-value`/`input-char-count`, tr `window-resize`); **PRs #446 + #447
cleared ms+sw (7 of 8)** — only `tr window-resize` remains (parse rate now **3695/3696**). See
the Track 2 increment notes below.

> **Read the behavior share through the implementation lens.** ~56 of the 94 behavior
> instances are the **Experimental 3** (Draggable/Sortable/Resizable) — the _only_ three
> behaviors implemented in **imperative JS** (`imperativeInstaller`) instead of compiled
> hyperscript `source`; the other 8 are source-compiled (audited 2026-06-16). But all three
> already ship a complete, faithful hyperscript `source` (e.g. `draggableSchema.source` is a
> real `repeat until event pointerup` / `wait for pointermove or pointerup` / `measure` impl).
> So this is a **runtime-capability** question, not a lane question — see Track 1.

## Plan — ranked by leverage

### Track 1 (top priority) — Behaviors: curate the showcase, fix the curated bug, harden the _system_

**The goal is not comprehensiveness.** We are not shipping a large behavior library —
the priority is **getting the behavior _system_ right**: a clear path for the user
community and LLM agents to write and install new behaviors, with the curated set as a
showcase of _what a behavior is_ and _what kinds hyperfixi enables_. The product decision
already exists in [`packages/behaviors/src/curation.ts`](../packages/behaviors/src/curation.ts):

- **Curated 5 (the supported story):** Toggleable, **Removable**, ClickOutside, Clipboard,
  AutoDismiss — real `on event → DOM action` inline scripts (the demonstration of "what is a behavior").
- **Optional 3:** FocusTrap, ScrollReveal, Tabs — primitives / nice-to-haves.
- **Experimental 3:** Draggable, Sortable, Resizable — labeled "stateful async components."
  **But each already ships a complete hyperscript `source`** and is the _only_ tier still
  executed via an **imperative JS** `install()` that bypasses that source. So the label is
  provisional: the boundary test is operational, not philosophical (see item 1).

**Constraint (user, 2026-06-16): no behavior may be implemented in imperative JS — all must
compile from hyperscript `source` (single source of truth).** Audit (2026-06-16): only
Draggable/Sortable/Resizable violate this (`imperativeInstaller`); the other 8 are clean.

The fix is to **eliminate imperative JS first**, then align curation, then invest in the system:

> **Status: item 1 DONE (2026-06-16, branch `feat/behaviors-no-imperative-js`).** Draggable /
> Sortable / Resizable now compile from `source`; `imperativeInstaller` under behaviors/ = 0.
> Required: parser CSS-interp whitespace fix (merged #440), `repeat until event … from <target>`
> resolution fix (core `repeat.ts`), and three source-idiom swaps (Resizable `*width`, Sortable
> `target.closest("li")`, `or pointerup` in the inner waits). Three runtime bugs surfaced en route
> — see **Runtime correctness follow-ups** below. Items 2 (`behavior-removable`) and 3 (the system)
> remain.

1. **Resolve the Experimental 3 to hyperscript `source` — fix-vs-cut is per-behavior and
   runtime-driven, not a blanket cut.** Each already has real source; the imperative installer
   exists because the runtime historically couldn't execute the source's advanced features.
   So, per behavior: (a) run its `source` and see what the runtime drops — Draggable needs
   `repeat until event pointerup`, `wait for pointermove or pointerup from document`, `measure
x/y`, and dynamic `add { left: ${…}px }` style templating; (b) if the runtime executes it,
   **delete the imperative `install()` and route through `source`** (same path as the curated 8)
   — this both honors the no-imperative-JS rule _and_ makes the multilingual fidelity follow for
   free (parse of one source); (c) **cut only** the behavior whose source genuinely can't execute
   without a runtime feature too costly to add — and even then, prefer fixing the feature, since
   it's likely shared (`repeat-until-event` is already a tracked gate pattern). Start with
   Draggable (we had it working before; richest source) as the bellwether for Sortable/Resizable.
2. ~~**Fix `behavior-removable` — it is CURATED, so its failures are real bugs.**~~ **DONE**
   (2026-06-17, PR #445). Was the only behavior with **hard** parse failures (he/zh null parse).
   Two stacked bugs, both fixed: (a) the i18n transformer inserted a pre-positioned object marker
   before the behavior name in he/zh (`behavior את Removable` / `behavior 把 Removable`), breaking
   the semantic block parser's `tokens[1]` name detection — fixed by `resolveNameTokenIndex`
   skipping a leading patient-marker token ([`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts));
   (b) `parseConditional` dropped the condition of block-style `if <cond>` (no inline `then`) in
   **all** non-English languages — fixed in [`transformer.ts`](../packages/i18n/src/grammar/transformer.ts).
   he/zh now parse 154/154 (lossy: he 0.556, zh 0.667). The condition fix is cross-language, so it
   rippled: `behavior-removable` degen→lossy in 7 other langs, draggable/resizable ~23 → 8–9
   non-faithful each, avgFidelity + avgRoleFidelity up everywhere, zero regressions. It is still
   6 degen + 17 lossy (the body sub-parse drops `trigger`/`remove`/`halt` after the conditionals) —
   a faithful pass is future headroom, not a regression. Remaining behavior debt is now
   `behavior-sortable` (9 degen + 14 lossy) and the Experimental-3 source execution (item 1).
3. **The actual priority — the authoring + install system for community & LLM agents:**
   - ~~**Authoring guide**~~ **DONE** (2026-06-16): `packages/behaviors/AUTHORING.md` — the
     canonical "what is a behavior / boundary test / how to write one / install + resolver /
     agent checklist" doc, for humans _and_ agents. Stale `core/BEHAVIORS.md` +
     `SORTABLE_BEHAVIOR_GUIDE.md` (old imperative architecture) replaced with redirects.
   - **Install path:** the resolver hook already works (`install X` → `_hyperscript.behaviors.resolve(X)`
     → compile-on-first-use, `packages/behaviors/src/behavior-resolver.ts`) — now documented in
     AUTHORING.md §7 as the public extension point.
   - **LLM-agent path (boundary _validator_) — SKIPPED for now** (decision 2026-06-16: too heavy
     for this stage of adoption). AUTHORING.md §9 already gives agents a boundary checklist; an
     MCP/programmatic validator that _enforces_ it (reject component-shaped behaviors) is deferred
     until adoption justifies the weight. Revisit when there's real third-party behavior authoring.

**Layer:** runtime (execute the Experimental-3 source + the Removable parse bug) + product
curation + DX/tooling (the system). **Owner docs:** `packages/behaviors/AUTHORING.md`,
MULTILINGUAL_BEHAVIORS_PLAN.md, BEHAVIORS_CONSOLIDATION_PLAN.md. **Audit cmd:** grep
`imperativeInstaller` under `packages/behaviors/src/behaviors/` — must reach 0.

### Track 2 — Reactivity: bring the multilingual parse path up to the runtime

> **htmx v4 syntax verified (2026-06-17, against four.htmx.org).** htmx v4 reactivity is the
> **`hx-live` extension only** — a JS-expression body re-run via a document-wide
> `MutationObserver` + `input`/`change` events + post-swap, with a `q()` selector proxy and
> `debounce`/`timeout`/`trigger`/`take`/`nextFrame` scope helpers — plus the separate `hx-sse`
> / `hx-ws` streaming extensions. **htmx v4 has NO `hx-bind`, `hx-computed`, two-way binding,
> or signals.** So of the gate's reactivity patterns, only **`live`** descends from htmx v4
> (`hx-live` → hyperfixi's `live … end`, with a hyperscript body instead of upstream's JS — a
> documented divergence). **`bind` / `computed` / `two-way` are hyperfixi-native reactivity
> DSL, not htmx v4.** The old "reactivity (htmx v4)" framing conflated the two; corrected here.
> (Possible follow-up unrelated to the gate: hyperfixi's SSE/WS compat uses the htmx-2-era
> `sse-connect`/`ws-connect` attribute names; htmx v4 ships these as the `hx-sse`/`hx-ws`
> extensions. Worth reconciling in the htmx-compat layer, but out of scope for the parse path.)

**Decision (settled): reactivity is in scope and must be supported in the multilingual path.**
This is a parser/profile build-out, not an exclusion.

> **Increment 1 DONE (2026-06-17, PR #446).**
> Recon disproved the "all 8 are reactive block shapes" framing: the 8 hard fails split three
> ways. Cleared the clean half:
>
> - **ms `bind`×4 (hard-fail → parse).** `bindSchema` source `markerOverride` had `ms:'to'`
>   (stale comment "no i18n grammar profile") but ms gained the Malay grammar profile, so the
>   transformer emits the dative `ke`. Pattern expected `to`, text had `ke` → NULL. Fixed
>   `ms:'to'`→`'ke'` (mirrors `id`) in `command-schemas.ts`.
> - **hi `bind`×4 + `intercept` (degenerate → faithful/improved).** The hi profile was missing
>   `bind` and `intercept` keywords entirely (English-literal emission, like `worker`/
>   `eventsource`); added them + a hi `bind` source marker (`में`).
>
> Result: parse rate **3688 → 3692/3696**, degenerate **29 → 24**, hi avgFidelity **+0.033**,
> gate green, **zero regressions**. Semantic suite 6099 green.

> **Increment 2 DONE (2026-06-17, PR pending — `feat/track2-sw-input-event`).** Cleared the
> sw `input` cluster (3 hard-fails: `input-char-count` / `two-way-binding` / `computed-value`).
> Root cause was NOT an event×`set` interaction (my first guess) but a dict↔tokenizer mismatch:
> the i18n transformer emits the Swahili `ingizo` for the `input` event, but the sw tokenizer
> only listed the English literal `input`, so `ingizo` tokenized as a bare **identifier**. After
> the homonymous on/into marker `kwenye` (normalized to `destination`), an unknown event +
> `set`-body became ambiguous → NULL (recognized events like `bonyeza`→click parsed fine; same
> handler with `add`/`put` survived). Fix: add `{ native: 'ingizo', normalized: 'input' }` to
> `tokenizers/swahili.ts` (same dict↔profile-alignment family as id `toggle`, qu/tl `get`).
> Result: sw 151 → 154/154, parse rate **3692 → 3695/3696**, gate green, zero regressions (sw
> precision −0.0012, within tolerance — the computed-value complex-expr phantom). Semantic 6099 green.

**Remaining: 1 hard fail + hi block cluster — precise diagnoses (deferred, each its own arc):**

1. **tr `window-resize` (the last hard-fail).** Two stacked issues. (a) The sw-style event-name
   gap, but worse: the i18n transformer emits `boyut_değiştir` for `resize`, and the tr tokenizer
   **splits on `_`** → `boyut` / `_` / `değiştir`, where `değiştir` alone normalizes to **`toggle`**
   (collision). So the resize event is destroyed, not just unrecognized. The click form
   (`tıklama`, single token) parses identically, so a single-token resize recognition is the core
   fix — but it needs the underscore-split resolved (cf. the `enyakın` fused-token fix), likely an
   i18n-side single-word resize emission + tr tokenizer entry. (b) Independently, the `debounced
at 200ms` event modifier is left untranslated and fronted by the SOV reorder. Both needed for
   the full gate pattern. 1 hard-fail, ~2 fixes — lower ROI than the hi block cluster.
2. **hi `live-derived-value` / `live-multiple-deps` (degenerate); also `intercept` blocks.** The
   genuine **reactive block-shape** work: `live`/`intercept` (and `eventsource`/`socket`/
   `worker`) are `bareKeyword` blocks (`hasBody:true`), but `block-parser.ts` only handles
   `behavior`/`def`. In non-English the `live … end` / `intercept … end` block parses as a bare
   `on`, dropping the block action. Teach the block layer the bareKeyword block shape (mirrors
   the behavior/`def` structural layer).

**Layer:** (1) sw semantic parser/tokenizer · (2) i18n transformer (SOV event reorder + modifier
xlate) · (3) semantic block-parser (bareKeyword blocks). Start with (1) — most leverage, cleanest
scope.

### Track 3 — R1 role-fidelity burn-down (the untouched dimension)

**Why:** avgRoleFidelity **0.833** is the laggard, and it has _never had a dedicated
campaign_ — it drifted up incidentally from 0.7505 (first measured, #365) to 0.833 as a
side effect of other work. The worst languages are the hard SOV/reorder set:
**hi 0.683 · qu 0.770 · bn 0.780 · ko 0.788 · ja/tr 0.793**. R1 measures
`action.role:valueType` recall — a parse that keeps the verb but drops or mistypes a role.

**Action:** triage R1 on hi/qu/bn first (worst three). For each, dump the role-signature
diff vs the en reference per pattern and find the recurring mistype/drop (likely a
marker→role mapping or a value-type classification in the per-language profile). This is
profile/parser work, same method as the R0 dict-alignment arcs — but targeting _roles_,
not _presence_. New `--regression` won't flag drift here until someone drives it; this is
greenfield headroom.

### Track 4 — Control-flow + long-tail lossy

**Why:** `unless-condition` (8 lossy + 1 degen) is the largest non-behavior lossy pattern;
the docs' long-standing diagnosis is **control-flow body parsing** (`if`/`unless` headers +
then-chain `put`/`set` bodies collapsing). The rest is a singleton long tail
(`fetch-do-not-throw` 5, `get-value` 4, `tell-*` 4, `set-color-variable` 4).

**Action:** opportunistic, lower ROI than Tracks 1–2. Take `unless-condition` as the
representative and fix the enclosing block/then-chain collapse; the tail is per-pattern.
Defer the per-language R2 structural arcs (STRUCTURAL_ARCS_ROADMAP.md) — explicitly the
lowest-ROI remaining parse work.

### Track 5 — Reliability hygiene (do alongside, not after)

1. **Refresh stale headline numbers in the detailed docs.** _Partly done 2026-06-17:_ this
   file + a dated snapshot note added to CORRECTNESS_RELIABILITY_PLAN.md §1 and
   MULTILINGUAL_ROADMAP.md "Remaining work" pointing at the 06-17 baseline
   (lossy **94** / avgFidelity **0.985** / degenerate **29**). The prose bodies of those two
   docs still carry their original session-era figures inline — left as historical context,
   superseded by the dated snapshot + the baseline JSON (the authoritative source).
2. **Make `populate` deterministic.** CLAUDE.md flags the "minor residual jitter" on a few
   boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02 avg).
   A deterministic populate lets us tighten those tolerances toward 0 and trust the gate more.
3. **Consider an absolute fidelity floor**, not just a ratchet — once a language clears a
   threshold, ratchet the floor upward so it can't silently backslide within tolerance.
4. **hi precision follow-up.** hi avgPrecision **0.815** is a clear outlier (next-lowest ja ~0.91).
   The 2026-06-15 marker-disambiguation fix lifted it +0.016; more phantom-command sources
   remain in the hi profile. (Largely subsumed by Track 2 — the hi degenerate cluster is reactivity.)

## Runtime correctness follow-ups (core `_hyperscript`-compat — surfaced during Track 1a)

These are general core-runtime bugs (not multilingual) found while making the behavior
sources execute. The behaviors shipped via working idioms, so none are blocking — but each
is a real `_hyperscript` compatibility gap worth its own focused fix + test.

1. ~~**Top-level `on event(args)` doesn't bind event args.**~~ **DONE** (branch
   `fix/runtime-event-args-and-style`). The top-level parser emitted the destructure names as
   an untyped `params` field the runtime never read; now emits `args` (the field the runtime
   binds from + the behavior parser already uses). `on click(button)` etc. now bind.
2. ~~**`set my style.X` resolves to the read-only _computed_ style.**~~ **DONE** (same branch).
   The set member-assignment path now targets the writable inline `element.style` for
   `.style.<prop>` writes (reads unchanged). `set my style.width to "50px"` works; the
   Resizable `*width` idiom remains valid (not retrofitted — `*prop` is equally canonical).
3. **`closest <X/> to Y` positional returns null.** The positional `the closest <li/> to the
target` idiom yields null even when a match exists (`target.closest("li")` works). Lower
   priority — workaround is clean. Fix: the `closest <selector/> to <expr>` evaluator.

## Recommended sequence

1. ~~**Track 1a — eliminate imperative JS**~~ **DONE** (PRs #440–#442): Draggable/Sortable/Resizable
   compile from `source`; `imperativeInstaller` → 0. Runtime follow-ups #1 (event-args) + #2 (inline
   style) also **DONE** (#442); #3 (`closest`) deferred.
2. ~~**Track 1b — authoring guide**~~ **DONE** (#443, `packages/behaviors/AUTHORING.md`). The
   boundary **validator** is **skipped** for this stage (see item 3 above).
3. ~~**`behavior-removable` he/zh**~~ **DONE** (2026-06-17, PR #445). See Track 1 item 2.
4. **Track 2 — reactivity (htmx v4) in the multilingual parse path — NOW THE TOP PRIORITY.**
   With behavior-removable fixed, reactivity owns **all 8** remaining hard parse failures
   (ms `bind-*` ×4, sw `two-way-binding`/`computed-value`/`input-char-count`, tr `window-resize`)
   plus the hi degenerate cluster and the hi precision outlier (0.815). Teach the semantic parser
   the `bind … end` / `live … end` / `intercept` block shapes (mirror the behavior/`def` structural
   layer, PRs #426–#430 / `block-parser.ts`); add profile keywords for ms → sw → tr → hi. The largest
   genuine parser effort remaining, and required (htmx v4 is in scope).
5. **Track 3 — R1 role-fidelity burn-down** on hi (0.683)/qu (0.770)/bn (0.780) — greenfield headroom
   on the laggard dimension (avgRoleFidelity 0.833); good fill-in between Track 2 sub-steps.
6. **Track 4 control-flow** opportunistically (`unless-condition` 1 degen + 8 lossy is the
   representative); **Track 5 hygiene** continuously.

Re-baseline (`--save-baseline`) after each intentional fidelity change, regenerate against a
freshly `populate`d DB, and commit only the dicts/profiles + baseline (not `patterns.db`).
