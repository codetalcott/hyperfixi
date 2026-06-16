# Multilingual accuracy & reliability — next steps

> **Entry point, written 2026-06-16.** This is the _current_ forward-looking plan.
> The detailed session logs live in
> [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md) (§7a–§7cc, §11),
> [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md),
> [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md),
> [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md) and
> [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md). Read this first,
> then dive into those for the per-arc detail.

## Where we are (2026-06-15 baseline · commit `0af855c0` · `browser-priority`)

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp` + `commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                         | Value                   | Notes                                          |
| ------------------------------ | ----------------------- | ---------------------------------------------- |
| parse rate                     | **3686 / 3696 (99.7%)** | 10 hard fails                                  |
| degenerate passes (fid < 0.5)  | **39**                  | was ~69                                        |
| lossy passes (0.5 ≤ fid < 1.0) | **113**                 | was ~471 — the bulk of correctness debt        |
| faithful (fid = 1.0)           | **~3534**               |                                                |
| avgFidelity (R0-recall)        | **0.982**               | was 0.928                                      |
| avgPrecision (R0 trust floor)  | **0.960**               | newest ratchet; hi 0.813 is the outlier        |
| avgRoleFidelity (R1)           | **0.831**               | **the laggard dimension**                      |
| avgExecutionFidelity (R2)      | **1.000**               | curated subset fully reproduces en DOM effects |

The six-signal ratchet gate is fully wired (parse-rate · degenerate · R0-recall ·
R0-precision · R1 · R2) — see CLAUDE.md "Multilingual parse rate ≠ fidelity".
**Direction now: stop adding gate signals; spend them down.**

## The leverage map (what's actually non-faithful)

Of the **162** non-faithful instances (39 degenerate + 113 lossy + 10 hard-fail),
two clusters dominate:

| Cluster                                                                         | degenerate | lossy | hard-fail |  total |   share |
| ------------------------------------------------------------------------------- | ---------: | ----: | --------: | -----: | ------: |
| **Behaviors** (draggable/resizable/sortable/removable + install)                |         28 |    64 |         2 | **94** | **58%** |
| **Reactivity** (bind-\* / live-\* / two-way / computed / intercept / window-\*) |          8 |     2 |         7 | **17** |     10% |
| **Control-flow** (`unless-condition` + then-chain bodies)                       |          1 |     8 |         0 |      9 |      6% |
| Long tail (fetch-do-not-throw, get-value, tell-\*, set-color-variable, …)       |          2 |    39 |         1 |    ~42 |     26% |

Per-pattern: `behavior-draggable` 23 lossy · `behavior-resizable` 21 lossy + 2 degen ·
`behavior-removable` 13 degen + 8 lossy + 2 hard-fail · `behavior-sortable` 11 degen +
12 lossy · `unless-condition` 8 lossy. The 10 hard fails: he/zh `behavior-removable`,
ms `bind-*` ×4, sw `two-way-binding`/`computed-value`/`input-char-count`, tr `window-resize`.

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
2. **Fix `behavior-removable` — it is CURATED, so its failures are real bugs.** 13 degen, 8 lossy,
   and the only behavior with **hard** parse failures (he/zh). It is already source-compiled, so
   this is a parse/i18n bug, not an imperative-JS one — check the `install … Removable` block
   parses in he/zh.
3. **The actual priority — the authoring + install system for community & LLM agents:**
   - **Authoring guide:** consolidate `packages/core/BEHAVIORS.md` + the `curation.ts` boundary
     rule into one canonical "what is a behavior / how to write one / the boundary test" doc,
     written for humans _and_ agents.
   - **Install path:** the resolver hook already works (`install X` → `_hyperscript.behaviors.resolve(X)`
     → compile-on-first-use, `packages/behaviors/src/behavior-resolver.ts`). Document it as the
     public extension point.
   - **LLM-agent path (the gap):** there is no MCP tool / validator that lets an agent generate a
     candidate behavior and check it against the boundary rule. Add one — schema + a
     "stays-in-lane?" validator (reject component-shaped behaviors that need observers/async loops).

**Layer:** runtime (execute the Experimental-3 source + the Removable parse bug) + product
curation + DX/tooling (the system). **Owner docs:** MULTILINGUAL_BEHAVIORS_PLAN.md,
BEHAVIORS_CONSOLIDATION_PLAN.md, `packages/core/BEHAVIORS.md`. **Audit cmd:** grep
`imperativeInstaller` under `packages/behaviors/src/behaviors/` — must reach 0.

### Track 2 — Reactivity (htmx v4): bring the multilingual parse path up to the runtime

**Decision (settled): htmx v4 features, including reactivity, are in scope and must be
supported — including in the multilingual path.** So this is not an exclusion; it's a
parser/profile build-out.

**Why:** owns 8 of 10 hard parse failures (ms `bind-*` ×4, sw `two-way-binding`/`computed-value`/
`input-char-count`, tr `window-resize`) plus all 7 hi degenerate (`bind-*`/`live-*`/`intercept`).
The hx-v4 **runtime** already handles these (`hx-live` → `live … end` block + `@hyperfixi/reactivity`,
shipped in `hyperfixi-hx-v4.js`). The gap is purely the **semantic / multilingual parse path** —
it doesn't yet model the reactive block shapes, so these patterns drop to hard-fail/degenerate
when authored in non-English.

**Action:**

1. Teach the semantic parser the `bind … end` / `live … end` (and `intercept`) block shapes,
   mirroring how the behavior/`def` blocks were added (PRs #426–#430, the structural-layer work).
2. Add the per-language profile keywords (`bind`/`live`/`two-way`/`computed`) for the priority langs,
   starting with the hard-fail set (ms, sw, tr) and the hi degenerate cluster.
3. Re-baseline; expect hi precision (0.813, the outlier) and the ms/sw/tr hard fails to clear together.

**Layer:** semantic parser + per-language profiles (block-structure parsing). This is the largest
genuine _parser_ effort remaining now that behaviors resolve mostly by curation.

### Track 3 — R1 role-fidelity burn-down (the untouched dimension)

**Why:** avgRoleFidelity **0.831** is the laggard, and it has _never had a dedicated
campaign_ — it drifted up incidentally from 0.7505 (first measured, #365) to 0.831 as a
side effect of other work. The worst languages are the hard SOV/reorder set:
**hi 0.682 · qu 0.769 · bn 0.778 · ko 0.787 · ja/tr 0.792**. R1 measures
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

1. **Refresh stale headline numbers in the detailed docs.** CORRECTNESS_RELIABILITY_PLAN.md
   §1 still says lossy 471 / avgFidelity 0.928; MULTILINGUAL_ROADMAP.md "Remaining work"
   says ~159 degenerate. Reality: 113 / 0.982 / 39. (CLAUDE.md was refreshed 2026-06-16
   with a dated snapshot note + pointer to the baseline JSON — apply the same pattern here.)
2. **Make `populate` deterministic.** CLAUDE.md flags the "minor residual jitter" on a few
   boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02 avg).
   A deterministic populate lets us tighten those tolerances toward 0 and trust the gate more.
3. **Consider an absolute fidelity floor**, not just a ratchet — once a language clears a
   threshold, ratchet the floor upward so it can't silently backslide within tolerance.
4. **hi precision follow-up.** hi avgPrecision 0.813 is a clear outlier (next-lowest ~0.91).
   The 2026-06-15 marker-disambiguation fix lifted it +0.016; more phantom-command sources
   remain in the hi profile.

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

1. ~~**Track 1a — eliminate imperative JS**~~ **DONE** (2026-06-16, branch
   `feat/behaviors-no-imperative-js`): Draggable/Sortable/Resizable compile from `source`;
   `imperativeInstaller` → 0. Still open under Track 1: the curated `behavior-removable` he/zh
   parse bug, and the three **Runtime correctness follow-ups** above.
2. **Track 1b — behavior _system_ hardening**: the authoring guide + the resolver-as-public-API
   docs + the missing agent/MCP "write-and-validate-a-behavior" path. The stated priority;
   parallelizable with the parser work below.
3. **Track 2 — reactivity (htmx v4) in the multilingual parse path**: teach the semantic parser
   the `bind`/`live`/`intercept` block shapes; profile keywords for ms/sw/tr/hi first. The largest
   genuine parser effort now, and required (htmx v4 is in scope).
4. **Track 3 — R1 role-fidelity burn-down** on hi/qu/bn — greenfield headroom on the laggard dimension.
5. **Track 4 control-flow** opportunistically; **Track 5 hygiene** continuously.

Re-baseline (`--save-baseline`) after each intentional fidelity change, regenerate against a
freshly `populate`d DB, and commit only the dicts/profiles + baseline (not `patterns.db`).
