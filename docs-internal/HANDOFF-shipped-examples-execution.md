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
the baseline JSON:

1. **Element-target write semantics** (24): `increment #count` / `decrement` /
   `set #x to v` — hyperfixi writes `textContent` in place; upstream's diff is
   `-div:14#count`, the element GONE from the after-snapshot. Which engine
   matches real-browser behavior is the open question — check in a browser
   before "fixing" either.
2. **show/hide strategy** (13): hyperfixi uses class + inline display; upstream
   consults computed styles and is inert under jsdom. Includes the
   form-validation and tabs entries (their `show`/`hide` legs are what differ).
3. **`swap` extension** (4): upstream parses the source but has no `swap`
   command — no oracle for the effect, only for the no-crash.
4. **Boolean-attribute toggles** (3): `toggle @disabled` representation
   differs.
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

Also surfaced, outside the allowlist (it diverges as part of family 1):
`set #count to 0` produces NOTHING on hyperfixi while `increment #count` on
the same page works — the `set <idref> to <value>` form looks broken on its
own.

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

- `on load` / custom events (`hello`, `close`, `dragstart`) — 8 skips.
- Timer/`wait` handlers under fake timers — 26 skips, the largest
  deterministic-in-principle class.
- `<script type="text/hyperscript">` blocks (behaviors/functions defined
  on-page).
- Doc-tree snippets, by synthesizing fixture pages.
- Real-browser (Playwright) arbitration for family 1/2 divergences where
  jsdom itself is the suspect.
