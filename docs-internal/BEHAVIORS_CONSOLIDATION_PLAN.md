# Behaviors consolidation — decision + plan

> **Thesis:** Behaviors have been hard to land because there was never _one_ thing
> to make reliable. A single source of truth (the `schema.source` hyperscript
> strings) feeds three consumers that disagree, and the package over-reached past
> "inline web scripting" into stateful async components. This plan collapses to one
> runtime path, cuts to a small curated set defined by a clear boundary rule, locks
> reliability with real behavior tests, and _then_ realizes the multilingual payoff.
>
> Companion to [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md)
> (the block/parse layer that makes Tier-A behaviors multilingual). The imperative
> installers were a **mistaken experiment** — confirmed below — not a direction.

## 1. What we found (2026-06-14 audit)

**One source of truth, three diverging consumers:**

| Consumer                              | Runs                                               | Audience                   |
| ------------------------------------- | -------------------------------------------------- | -------------------------- |
| `dist/resolver.browser.global.js`     | the hyperscript `schema.source`                    | demo / CDN (recommended)   |
| patterns-reference `behavior-loader`  | the same `source`, re-seeded into `patterns.db`    | LLM / multilingual tooling |
| `@hyperfixi/behaviors` npm installers | **imperative JS that ignores `source`** (10 of 11) | `import` users             |

The npm installers are a **fork**: `install Toggleable` does different things from
the CDN vs npm, and even _within_ the npm package only `removable.ts` compiles the
source. That divergence — not any single bug — is why behaviors never stabilized.

**The imperative justification is obsolete.** `toggleable.ts` claims `.{cls}` can't
resolve behavior params at runtime; [`template-interpolation.test.ts`](../packages/core/src/commands/behaviors/__tests__/template-interpolation.test.ts)
proves it does (4/4 green). All 11 schema sources compile through the core parser
today; the historical blockers (`js()...end` single-quote tokenizer bug, dynamic
selector templates in behavior context) are fixed upstream.

## 2. The boundary rule (what a behavior _is_)

> **A behavior is a named, parameterized, _reusable inline script_ — `on event →
DOM action`. Not a component.** When it needs an observer, a focus model, or an
> async pointer loop, it has left hyperfixi's lane.

Grading the 11 by how genuinely hyperscript-native they are (handler count, `js()`
reliance, async loops):

- **Tier A — sweet spot** (real handlers, `js()` only to dispatch a lifecycle event,
  body translates multilingually): **Toggleable, Removable, ClickOutside**.
- **Tier B — web-API wrappers** (`handlers=0`, all logic in a `js()` init block;
  multilingual translation near-worthless): **Clipboard, AutoDismiss, ScrollReveal,
  FocusTrap, Tabs**.
- **Tier C — async component over-reach** (`repeat until event` + `wait for` pointer
  loops; worst CDN-vs-npm divergence; most historical thrash): **Draggable,
  Sortable, Resizable**.

## 3. Decisions

### 3a. Curated set (ships, first-class, tested, multilingual): **5**

**Toggleable · Removable · ClickOutside · Clipboard · AutoDismiss**

Covers ~80% of real UI needs: accordion/dropdown, dismiss, outside-click (a
primitive), copy button, toast. The **Tier-A three lead the multilingual showcase**
(their bodies are real hyperscript); Clipboard/AutoDismiss ship but are honestly
labeled JS-backed (their `js()` core stays English — fine, fidelity-neutral).

### 3b. Demote experimental (kept, not curated, clearly "beyond inline scripting"): **3**

**Draggable · Sortable · Resizable** — documented as advanced/experimental
components, explicitly outside the boundary rule. Not in the "reliable behaviors"
story.

> **Implementation note (Phase 3):** the demotion is delivered via a programmatic
> **curation status** (`src/curation.ts`: `CURATED`/`OPTIONAL`/`EXPERIMENTAL`),
> in-file `EXPERIMENTAL` markers on the three schemas, README tiering, and demo
> grouping — **not** a physical move to `experimental/`. A directory move would
> churn `tsup.config.ts`, the package.json exports map (dist paths), and 6+ internal
> files for zero external benefit (no consumer imports the Tier-C subpaths). The
> curation status is the thing code can rely on; the directory is cosmetic.

### 3c. Optional (kept, documented as primitives/nice-to-have): **3**

**FocusTrap · ScrollReveal · Tabs** — FocusTrap + ClickOutside are the primitives a
Modal composes from; ScrollReveal is a nice-to-have; Tabs is high-value but heavy
(candidate to re-home as a web component later).

### 3d. One runtime path

Delete the imperative installers. Both npm registration and the CDN resolver compile
the same `schema.source`. `behavior-resolver.ts` (already source-based) is the model;
`registerToggleable` et al. become source-compilers too.

## 4. Phased plan (audit → phase → commit, gates between)

**Phase 1 — Collapse to one path.**
Rewrite the curated 5's `register*()` to compile `schema.source` (drop
`imperativeInstaller`); align `index.ts registerAll`. Gate: behaviors vitest green;
CDN and npm produce identical registrations (one new equivalence test).

**Phase 2 — Lock reliability with real behavior tests.**
Per curated behavior: a DOM test asserting actual behavior **and** lifecycle events
(not "compiles non-null"). happy-dom/vitest where adequate (click/toggle/dismiss),
Playwright where it isn't. Gate: all curated behaviors pass; this is the "parses ≠
works" guard the multilingual side already learned.

**Phase 3 — Reorganize + document the boundary.**
Move Tier-C to `experimental/`; mark Tier-B-optional; write the boundary rule into
`packages/behaviors` README + `examples/behaviors/demo.html`. Mine
`~/projects/_hyperscript/www/patterns/` for an **inline-recipe gallery** (most
"behaviors" are short scripts) and promote only genuinely-reusable ones. Gate: docs

- demo build clean; exports map matches the new layout.

**Phase 4 — Realize multilingual (the payoff).**
Verify the curated behaviors' bodies translate + round-trip across languages, and
ship a showcase demo. Two parts were deliberately scoped down for an unsupervised
run (see note):

- ✅ **Verify + showcase.** `examples/behaviors/multilingual.html`: each curated
  behavior's core handler is translated live by `LokaScriptSemantic` into es/ja/ar/
  ko/zh/de with the round-trip parse confidence shown, alongside a live English
  `install Toggleable` that actually runs. Playwright-smoked.
- ⏸ **patterns-reference `sync:translations` + baseline regen — deferred to a
  supervised run.** The curated source edits (Phase 2) are **fidelity-neutral** for
  the current gate corpus (the gate's behavior patterns are removable/draggable/
  sortable/resizable; their _translatable_ `source` is unchanged — only descriptions
  changed, which don't affect translation), so there is no regression to chase now.
  The populate + `--save-baseline` flow is guarded (provenance stamp, ordered build)
  and correctness-sensitive — run it with human oversight, not autonomously.
- ⏸ **Localized prose metadata (names/param-docs) — deferred to native review.** The
  feasibility doc explicitly calls for native-speaker review; hand-authoring es/ja/ar
  descriptions unsupervised would commit unreviewed translations. The _capability_ is
  proven; the curated reviewed data is a follow-up.

## 5. Risks

- **Hidden runtime bugs in `js()`-heavy sources** the imperative path was masking
  (ClickOutside/Clipboard/AutoDismiss). Phase 2 tests are exactly the catch.
- **Cut-list pushback** — Draggable/Sortable demos are visually appealing; demoting
  them may feel like a loss. Mitigation: keep them working under `experimental/`,
  just out of the curated/marketing story.

## 6. Status

- **2026-06-14:** audit complete; decisions in §3 locked. **Owner signed off on the
  curated-5 cut list** (Toggleable/Removable/ClickOutside/Clipboard/AutoDismiss
  curated; Draggable/Sortable/Resizable → experimental; FocusTrap/ScrollReveal/Tabs
  optional).
- **2026-06-15: Phase 1 ✅** — curated 5 collapsed onto one source-compiled runtime
  path; imperative installers removed; unit tests assert source-compile. 143 green.
- **2026-06-15: Phase 2 ✅** — `curated-runtime.test.ts` drives each curated behavior
  through the real core runtime under happy-dom. **Caught + fixed two source bugs the
  imperative path masked:** ClickOutside read `event.target` without passing `event`
  into js(); Clipboard used top-level `await` in a js() block. 148 green.
- **2026-06-15: Phase 3 ✅** — demotion via `src/curation.ts` (curated/optional/
  experimental) + in-file EXPERIMENTAL markers; package README with the boundary
  rule + tier table; demo grouped by tier with a boundary banner; new
  `examples/behaviors/recipes.html` inline-recipe gallery adapted from the
  \_hyperscript cookbook. 153 green; typecheck clean.
- **2026-06-15: Phase 4 ✅ (scoped).** Verified curated behavior bodies translate +
  round-trip across es/ja/ar/ko/zh/de (78–100%); shipped
  `examples/behaviors/multilingual.html` (Playwright-smoked: 18/18 round-trips OK,
  live English `install Toggleable` runs, 0 console errors). Deferred (with
  rationale): patterns-reference populate + baseline regen (fidelity-neutral now;
  supervised op) and localized prose metadata (needs native review).
- **Consolidation arc complete.** Curated 5 on one tested runtime path; boundary
  documented; recipe + multilingual demos shipped.
- **2026-06-15: Optional-3 conversion ✅** (follow-up #1). FocusTrap/ScrollReveal/
  Tabs now compile their `schema.source` (`compileSync` + `execute`) instead of a
  synthetic node with `imperativeInstaller` — the last curated/optional fork between
  the CDN resolver and the npm path is closed. Their web-API logic (focus model,
  `IntersectionObserver`, ARIA/keyboard wiring) was already complete in each
  schema's `init`-block `js()` body, so the conversion is mechanically identical to
  the Phase-1 curated collapse. New `src/behaviors/optional-runtime.test.ts` drives
  all three through the real core runtime under happy-dom (focus-trap wrap,
  intersection reveal via a stubbed observer, tab ARIA/keyboard nav + cancelable
  `tabs:change`) — the "parses ≠ works" gate. `integration.test.ts` moves the three
  into `compiledBehaviors`; mock unit tests assert the compile path. **Only the
  experimental 3 (Draggable/Sortable/Resizable) remain imperative** — deliberate, as
  async components beyond the inline-scripting boundary (§3b/§3d). behaviors
  **167 green**; typecheck + tsup build clean; dist verified (optional-3 globals
  carry `compileSync`, `imperativeInstaller` only in the experimental-3 globals).
- **Remaining follow-ups:** supervised patterns-reference sync; native-reviewed
  localized metadata. Both require human/native oversight (see §4 Phase 4 notes).
