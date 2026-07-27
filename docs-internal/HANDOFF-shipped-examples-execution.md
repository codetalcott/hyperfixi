# Handoff: the shipped-examples execution gate

> **Landed 2026-07-27** (branch `feat/shipped-examples-execution-gate`). Closes
> the "Nothing executes a shipped example" entry in
> [PARSER_NEXT_STEPS.md](PARSER_NEXT_STEPS.md) — the systemic gap behind both
> `if`-defect arcs: every parse-level gate stayed green while
> `native-dialog.html` shipped with its conditional body running
> unconditionally (#785), and again while five upstream-valid shapes regressed
> on a PR branch (#786).

## What it is

`packages/testing-framework/src/multilingual/shipped-examples-execution.ts`
(+ `.test.ts`, + `baselines/shipped-examples-execution.json`).

Every eligible `_="…"` handler in `examples/**` is executed on BOTH engines in
jsdom — hyperfixi via parse + a fresh `Runtime` with the element as context
(the browser attribute-processor shape), upstream `hyperscript.org` via
`processNode` — its trigger event dispatched, and the two DOM **effect
signatures** diffed against each other. Upstream is the behavioral oracle, the
role R4 gives it for validity. The signature machinery is shared with the R2
execution ratchet (`effect-signature.ts`), deliberately: the two gates can
never disagree about what a DOM effect is.

Three assertions, matching the shipped-sources gate: sanity floors (pages,
handlers, comparisons, **non-vacuous** matches), no NEW divergence outside the
committed allowlist, no stale allowlist entry. The allowlist key embeds a
source hash, so fixing a handler forces its entry's removal — the list only
ratchets down.

Current numbers (2026-07-27, post filter fix): 55 pages, 333 handlers, 162
compared (74 real matches, 43 vacuous empty-vs-empty pairs — counted
separately, never as parity; the fixed filter handler converged INTO the
vacuous column, both engines now correctly doing nothing on an unmet filter),
**45** allowlisted divergences (46 at introduction; the event-filter fix
converged one and the stale-entry ratchet forced its removal), 171 skips each
with a recorded reason (upstream-rejects 51, non-event handlers 27, `wait` 26,
hyperfixi-recovers 25, `fetch` 13, js-blocks 11, …).

## The finding families (burn-down list)

The 46 baseline entries collapse to six families — reasons live per-entry in
the baseline JSON. Families 1, 2, and 4 were **arbitrated in real Chrome on
2026-07-27** (see "Real-browser arbitration" below); their entries are now
permanent with verdict reasons, except the one reclassified defect in family 2:

1. **Element-target write semantics** (24) — **VERDICT: not a jsdom artifact;
   permanent engine difference.** Upstream's idRef assignment is
   `IdRef.set → runtime.replaceInDom → elt.replaceWith(...)`: in real Chrome,
   `increment #count` REPLACES the div with the literal text `NaN`
   (`parseFloat` of an element object), exactly matching its jsdom `-key`
   diff. hyperfixi writes the value in place and the element survives — which
   is what the shipped pages are authored for (`count-mirror`'s
   `on change in #count` needs the element to exist). No fix on either side.
   The `set #count to 0` satellite (below) also dissolved.
2. **show/hide strategy** (13) — **VERDICT: permanent strategy difference,
   plus ONE reclassified hyperfixi defect.** The original reason was doubly
   wrong: upstream show/hide never consults computed styles (only `toggle`
   does) and is not jsdom-inert — it manages ONLY the inline `display`
   property, identically in jsdom and Chrome. Consequence, Chrome-verified:
   upstream `show` cannot reveal a stylesheet-hidden element (the modal stays
   `display:none`; tabs never switch), while hyperfixi's deliberate
   class+inline strategy (commit 6e33c7c9) matches the pages' authored
   `.show` CSS rules — those pages work under hyperfixi only. For
   inline-hidden and already-visible targets the visible outcomes match; the
   signature delta is hyperfixi's `.show` marker class.
   **Exception — real hyperfixi bug:** the recipes.html entry
   (`show <blockquote/> in the next <div/> when its textContent contains my
   value`): upstream filters correctly in Chrome (match shown, non-match
   hidden); hyperfixi is a complete no-op in the shipped bundle and mis-targets
   `me` under the gate's Runtime path. Queued in
   [PARSER_NEXT_STEPS.md](PARSER_NEXT_STEPS.md).
3. **`swap` extension** (4): upstream parses the source but has no `swap`
   command — no oracle for the effect, only for the no-crash.
4. **Boolean-attribute toggles** (3) — **VERDICT (bonus arbitration):
   representation-only, permanent.** Both engines disable the control in
   Chrome; hyperfixi writes canonical `disabled=""` (falsy attribute value),
   upstream writes the literal string `"undefined"` (truthy). The
   `#disabled-status` span delta is downstream: the sibling handler tests
   `if #target-btn's @disabled`, which reads hyperfixi's `""` as false.
5. **Unmet event filter still fires** (~~1~~ → **FIXED 2026-07-27**, the same
   day the gate landed): the runtime never read `EventHandlerNode.condition` —
   every filtered handler ran unfiltered. Fixed in `runtime-base.ts`
   (`createEventHandler` evaluates the condition with event properties
   resolvable as bare identifiers); or-join legs stay unfiltered pending
   per-event condition representation (queued). The fix triggered THIS gate's
   stale-entry assertion and shrank the baseline 46 → 45 — the ratchet's first
   full cycle, exactly as designed. Coverage:
   `packages/core/src/api/event-filter-execution.test.ts`.
6. **js property-path argument** (1): `put document.getElementById(...).value
   into #result4` — hyperfixi produces no effect. REAL BUG CANDIDATE.

~~Also surfaced (part of family 1): `set #count to 0` produces NOTHING on
hyperfixi — the `set <idref> to <value>` form looks broken on its own.~~
**RESOLVED 2026-07-27, not a bug:** test-classic-i18n.html's `#count` opens at
`0`, so hyperfixi's write is 0-over-0 — invisible to the signature diff (the
same masking class the "per-handler isolation" lesson below describes). Probes:
the identical shape with a different start value writes in place on both the
gate's parse+Runtime path (jsdom) and the shipped browser bundle (real Chrome,
arbitration spec probe `f1c`).

## Real-browser arbitration (2026-07-27)

Families 1/2 (and 4, opportunistically) were arbitrated in real Chrome:

- Fixture: `packages/core/src/compatibility/browser-tests/debug/fixtures/execution-arbitration.html`
  — replicates each divergent shape exactly (counter, set-idref,
  stylesheet-hidden modal with `.show` CSS, inline-hidden, already-visible,
  tabs, recipes filtered-show, `toggle @disabled`); `?engine=hyperfixi|upstream`
  picks the engine via `document.write`.
- Spec: `packages/core/src/compatibility/browser-tests/debug/execution-arbitration.spec.ts`
  — run from `packages/core`:
  `npx playwright test --project=debug execution-arbitration`. It asserts only
  harness sanity and prints per-probe observations (element survival + text for
  family 1, computed display for family 2) for human reading.
- The upstream mechanisms were also confirmed in source
  (`node_modules/hyperscript.org/dist/_hyperscript.js`, v0.9.93): `IdRef.set →
  replaceInDom` for family 1; `HIDE_SHOW_STRATEGIES.display` touching only
  inline `display` (computed styles only in the `toggle` path) for family 2.

Net: jsdom was exonerated for both families — every diff the gate recorded is
the engine's genuine behavior. The arbitration's real findings were the
recipes.html filtered-show hyperfixi defect and the dissolution of the
set-idref candidate.

## Harness lessons (they cost hours; read before touching)

- **jsdom globals must be RE-pointed every swap.** Copying only missing keys
  left every DOM constructor bound to the first page; both engines'
  `instanceof` checks then silently failed for later pages' elements
  (upstream produced empty signatures for `on click put 'Hello' into #output`).
  `installGlobals` tracks what it owns and re-points it each call.
- **The api singleton binds its first document.** `hyperscript.eval` resolved
  later pages' selectors against page 1 (correct in a browser — document
  identity never changes in a realm; fatal in a multi-page harness). Fresh
  `Runtime` + `createContext(el)` per handler is the R2-proven shape.
- **Per-handler isolation, not sequential dispatch.** Dispatching all handlers
  in order on one page amplified ONE real divergence into a page of cascades
  (upstream's inert element-`decrement` made `put 0 into #count` write
  0-over-0 — invisible — so everything after diverged too), and let
  double-failures hide as empty-vs-empty "matches". Fresh page pair per
  handler; `vacuous` tracked separately from `match`.
- **Flat snapshot indices cascade.** One engine-inserted element shifted every
  later `tag[i]` key and turned a one-line diff into a churn storm. Elements
  are stamped `data-exec-key` before the run (same page → same stamping both
  engines); keys are identity, not position.
- **Engine bookkeeping is not behavior.** `data-hyperscript-powered`,
  `data-original-display`, `_`, `data-exec-key` are excluded from signatures
  (`ENGINE_ATTRS`). This changed exactly one R2 locked signature
  (`hide-with-transition`) and no fidelity numbers.
- **The vitest file MUST run in the node environment** (`@vitest-environment
  node` in its docblock). Under happy-dom the bootstrap refuses to overwrite
  globals it does not own and every hyperfixi signature comes back empty —
  0 real matches vs 74.

## What v2 could add (deliberately out of scope)

Re-evaluated 2026-07-27, after the family-1/2 arbitration burned down the
"pending investigation" reasons. In value order:

1. **Timer/`wait` handlers under fake timers — 26 skips, now clearly the
   largest coverage win** (next-biggest classes are hyperfixi-recovers 25 and
   upstream-rejects 51, neither of which fake timers help). Both engines
   schedule `wait` via `setTimeout` on globalThis, so vitest fake timers can
   advance them deterministically. One implementation caveat: the harness's
   own `settle()` uses `setTimeout` too — it must be captured as a real-timer
   escape hatch (or replaced with `vi.advanceTimersByTimeAsync` +
   `vi.runAllTicks`) before faking, or the sweep deadlocks itself.
2. `on load` / custom events (`hello`, `close`, `dragstart`) — 8 skips.
3. `<script type="text/hyperscript">` blocks (behaviors/functions defined
   on-page).
4. Doc-tree snippets, by synthesizing fixture pages.
5. ~~Real-browser (Playwright) arbitration for family 1/2~~ — **done**, and
   cheaper than expected as a standing artifact: the debug-project spec above
   re-runs on demand. Extend its fixture when a future family needs
   arbitration rather than building a new harness.
