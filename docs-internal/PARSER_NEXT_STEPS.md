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
| **Implicit-multiline `if` swallows the next line** | **high** — an unconditional command silently stops running | **none** | [HANDOFF-implicit-multiline-if.md](HANDOFF-implicit-multiline-if.md) |
| **`tell` never consumes a terminating `end`** | medium — no real `tell … end` block form; upstream requires one | **none** | comment at `packages/core/src/parser/command-parsers/utility-commands.ts` (the `ELSE`/`END` break in `parseTellCommand`) |
| **Nothing executes a shipped example** | medium — `examples/**` is parsed but never run | **none** | "Wider question" in [HANDOFF-if-block-then-separator.md](HANDOFF-if-block-then-separator.md) |
| `and` is not a command separator anywhere | low — consistent everywhere, so no surprise | ✅ 2 `KNOWN GAP` tests | `packages/core/src/parser/__tests__/then-as-separator.test.ts` |
| `sortable-list.html` recovers with errors | low — one shipped example | ✅ allowlist ratchet | `packages/testing-framework/baselines/shipped-sources-validity.json` |

### Why the gated two need no doc to survive

- **`and`** — the two `KNOWN GAP` tests assert the *current, wrong* shape. Anyone
  who fixes the pratt parser breaks them immediately and is forced to decide
  deliberately. That is the intended design; the tests are not stale assertions.
- **`sortable-list.html`** — the allowlist key embeds `sha1(source)`, and
  assertion 3 of the shipped-sources gate **fails** when an allowlisted source
  goes clean. The list can only ratchet down. It cannot be silently forgotten.

The ungated three have no such mechanism. **They are what this document is for.**

## Notes on the ungated three

**Implicit-multiline `if`** is the one to do first. It is the mirror image of the
`then` defect fixed in #785 (that one pushed a conditional body *out* so it ran
unconditionally; this one pulls an unconditional command *in* so it stops
running), and it is the reason #785 left the `hasThen` lookahead unbounded —
bounding it routes more inputs down this already-broken path. Fix this, then
re-evaluate that bound. **The shipped-sources gate is not the regression test
here** — no shipped example trips it, so the gate would pass a broken fix. Write
the coverage first.

**No execution test for `examples/**`** is the systemic one. #785 added
`packages/core/src/api/if-body-then-execution.test.ts`, which is the right shape
(compile, run in jsdom, assert the DOM) but only covers hand-written sources. The
R2 execution ratchet does this for 47 curated corpus patterns
(`avgExecutionFidelity`); extending something like it to `examples/**` is the
natural follow-on. It is what would have caught the #785 defect on *behaviour*
rather than on a diagnostic — `native-dialog.html` shipped with its conditional
body running unconditionally and every parse-level gate was green.

## History

- **#785** (2026-07-27) — `then` as a command separator in `if`/`unless`, `def` /
  `init` / `catch` / `finally`, and `tell` bodies; `--` comments in `if` bodies;
  shipped-sources allowlist 4 → 1. Brief:
  [HANDOFF-if-block-then-separator.md](HANDOFF-if-block-then-separator.md)
  (carries two corrections to its own original triage — read its header).
- **#784** — shipped-sources validity gate + `ParseResult.recovered`. Brief:
  [HANDOFF-parse-success-and-doc-examples.md](HANDOFF-parse-success-and-doc-examples.md).
- 2026-01-30 — behavior parameters shadowing command names. **Resolved**;
  archived at [PARSER_FIX_STATUS.md](PARSER_FIX_STATUS.md).
