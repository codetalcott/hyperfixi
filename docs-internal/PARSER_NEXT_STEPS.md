# Core parser — next steps

> **Entry point, written 2026-07-27.** Standing queue for the **core parser**
> track (`packages/core/src/parser/`), the counterpart to
> [MULTILINGUAL_NEXT_STEPS.md](MULTILINGUAL_NEXT_STEPS.md). Read this first, then
> the linked HANDOFF for per-defect detail.
>
> **Pointer-only by design.** Never restate a repro or a diagnosis here — that is
> what the HANDOFF docs are for, and duplicated detail is the first thing to rot.
> One line per item; the linked source is authoritative.
>
> Not scoped to a release. Nothing below is release-blocking; these are
> correctness papercuts in a shipped parser. Tying them to a version means either
> the version slips and this lies, or they defer and this rots — which is exactly
> how [PARSER_FIX_STATUS.md](PARSER_FIX_STATUS.md) died (its name promised an
> index, it delivered a six-month-old snapshot of one already-fixed defect).

## Read this before triaging anything below

**Which entries are load-bearing.** Two of these are protected by a gate that
fails loudly on its own; the rest can be lost entirely. Know which you are
looking at before deciding what to work on — and do **not** "tidy up" the gated
ones, because the gate *is* the tracking mechanism.

| Item | Severity | Gate | Detail |
| ---- | -------- | ---- | ------ |
| **Or-join filters have no per-event representation** | low — `on click or keypress[key=='Enter']` runs keypress unfiltered (upstream filters that leg); single-event filters ARE enforced | ✅ KNOWN GAP test | `packages/core/src/api/event-filter-execution.test.ts`; the runtime-side note at the `applicableCondition` site in `runtime-base.ts` |
| **`tell` never consumes a terminating `end`** | medium — no real `tell … end` block form; upstream requires one | **none** | comment at `packages/core/src/parser/command-parsers/utility-commands.ts` (the `ELSE`/`END` break in `parseTellCommand`) |
| **`set <idref> to <value>` / js property-path args no-op** | medium — silent no-effect on shipped pages | ✅ execution-gate allowlist entries | families 1/6 in [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md) |
| `and` is not a command separator anywhere | low — consistent everywhere, so no surprise | ✅ 2 `KNOWN GAP` tests | `packages/core/src/parser/__tests__/then-as-separator.test.ts` |
| `sortable-list.html` recovers with errors | low — one shipped example | ✅ allowlist ratchet | `packages/testing-framework/baselines/shipped-sources-validity.json` |

### Why the gated entries need no doc to survive

- **`and`** — the two `KNOWN GAP` tests assert the *current, wrong* shape. Anyone
  who fixes the pratt parser breaks them immediately and is forced to decide
  deliberately. That is the intended design; the tests are not stale assertions.
- **`sortable-list.html`** — the allowlist key embeds `sha1(source)`, and
  assertion 3 of the shipped-sources gate **fails** when an allowlisted source
  goes clean. The list can only ratchet down. It cannot be silently forgotten.
- **The execution-gate entries** (`set <idref>` / js-path no-ops) — same
  mechanism as `sortable-list.html`: their allowlist keys in
  `packages/testing-framework/baselines/shipped-examples-execution.json` embed a
  source hash, and the gate's stale-entry assertion fails when a divergence
  converges, forcing the entry's removal in the fixing change. This is not
  theoretical: the event-filter fix (History) triggered exactly that assertion
  and shrank the baseline 46 → 45 in the same change.
- **Or-join filters** — the KNOWN GAP test pins the current unfiltered behavior
  of BOTH legs; per-event condition representation flips both halves, so the
  fix is forced to be deliberate and visible.

The ungated one (`tell`) has no such mechanism. **It is what this document is
for.**

## Notes

**The `examples/**` execution gap is CLOSED** (2026-07-27): the shipped-examples
execution gate runs every eligible `_=` handler on both hyperfixi and the real
`hyperscript.org` engine in jsdom and ratchets on DOM-effect divergence —
upstream as the behavioral oracle, the R4 pattern applied to behavior. It is
what would have caught the #785 defect on *behaviour* rather than on a
diagnostic. Design, current numbers, the divergence families, and the
harness lessons: [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md).
Its first sweep produced two bug candidates: the unmet-event-filter defect
(**fixed** — see History) and the `set <idref>` / js-path no-ops row above.

**Expression-first condition parsing** is the deferred follow-on from the `if`
family (see History). #786 replaced the raw "is this token spelled like a
command?" test with a positional approximation (`isBodyCommandStart`: first-token
exemption, operand rule, chain rule), which fixed every measured shape — but it is
still a heuristic. The residual it leaves is LOW and known: a command-word in a
mid-condition position that is neither first nor operator-preceded (e.g. after a
possessive, `if x's set is 3` + newline body) can still mislead the form scans.
The real fix parses the condition via `parseExpression()` from token zero and
classifies the form from what follows — viable, since the pratt parser accepts
command-word operands (`add is 3` parses cleanly). Fold the residual into that
work rather than extending `OPERAND_INTRODUCERS` piecemeal. Detail + the
regression episode that motivates it:
[HANDOFF-command-word-in-if-condition.md](HANDOFF-command-word-in-if-condition.md).

## History

- **2026-07-27** — event filters enforced: `on keydown[key=='Escape']` ran on
  ANY key because the runtime never read `EventHandlerNode.condition` (parsed,
  typed, documented, never consumed). The gate's first finding, fixed the same
  day; the fix triggered the gate's stale-entry ratchet, shrinking its baseline
  46 → 45 in the same change — the loop's first full cycle. Filters resolve
  bare identifiers from the event (upstream semantics), run after arg
  destructuring, and gate SINGLE-event handlers only (or-join legs need
  per-event conditions — the new table row). Coverage:
  `packages/core/src/api/event-filter-execution.test.ts`.
- **2026-07-27** — shipped-examples execution gate landed: `examples/**`
  handlers executed on both engines in jsdom, DOM-effect divergence ratcheted
  against `hyperscript.org` as the behavioral oracle. 46 divergences baselined
  in six families; two promoted to bug-candidate rows above. Brief:
  [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md).
- **2026-07-27 (#786, repair commit)** — command-name words in `if`/`unless`
  conditions (`if log is 3 add .a` died with "Expected condition"; in a handler
  the `if` vanished and its body ran unconditionally, `ok: true`). Fixed by
  replacing the spelling test with command **position** (`isBodyCommandStart` +
  an unguarded first condition parse). The same commit repaired **five
  upstream-valid shapes the two entries below had regressed vs main** — their
  bounds were built on the same broken classifier, and every gate stayed green
  through it because no in-repo source uses command-word conditions. The
  `hasThen` bound became the command-CHAIN rule (same-line then-joined bodies
  bind; a command starting a later line breaks the chain). Full episode:
  [HANDOFF-command-word-in-if-condition.md](HANDOFF-command-word-in-if-condition.md).
- **2026-07-27** — the `hasThen` residual of the entry below: a single-line `if`
  whose FOLLOWING line carried a body `then` was still swallowed, because that
  lookahead crosses newlines. First bounded at the first command — over-corrected,
  see the entry above — and settled as the chain rule; the `commandToken.line`
  bound #785 considered stays rejected, since a header `then` may sit on the line
  after the condition.
- **2026-07-27** — implicit-multiline `if` swallowing the following line into its
  block. The lookahead answered the "FIRST command's line" question correctly and
  then kept walking, so the second command overrode the answer; it is now bounded
  to the `if`'s own line once that first command is found, which preserves the
  same-line `else`/`end` hunt the missing `break` exists for. Brief:
  [HANDOFF-implicit-multiline-if.md](HANDOFF-implicit-multiline-if.md) (read its
  RESOLVED header — one residual stays open, at the top of the table above).
- **#785** (2026-07-27) — `then` as a command separator in `if`/`unless`, `def` /
  `init` / `catch` / `finally`, and `tell` bodies; `--` comments in `if` bodies;
  shipped-sources allowlist 4 → 1. Brief:
  [HANDOFF-if-block-then-separator.md](HANDOFF-if-block-then-separator.md)
  (carries two corrections to its own original triage — read its header).
- **#784** — shipped-sources validity gate + `ParseResult.recovered`. Brief:
  [HANDOFF-parse-success-and-doc-examples.md](HANDOFF-parse-success-and-doc-examples.md).
- 2026-01-30 — behavior parameters shadowing command names. **Resolved**;
  archived at [PARSER_FIX_STATUS.md](PARSER_FIX_STATUS.md).
