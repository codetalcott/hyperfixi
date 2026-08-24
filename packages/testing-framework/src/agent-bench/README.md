# Agent-loop benchmark

Measures what an LLM agent actually gets from emitting hyperscript through the
MCP validate/repair/compile loop, against twenty natural-language UI tasks.

Arc 3 of [AGENT_ERA_ROADMAP.md](../../../../docs-internal/AGENT_ERA_ROADMAP.md).

```bash
cd packages/testing-framework
npx tsx src/agent-bench/cli.ts verify-references   # every reference still usable
npx tsx src/agent-bench/cli.ts probe-variants      # the deterministic finding
npx tsx src/agent-bench/cli.ts list                # prompts, for a generator
npx tsx src/agent-bench/cli.ts score --run runs/my-run.json
```

## What it measures, and why in two halves

Two questions are scored separately, and keeping them apart is the point:

- **Does it parse?** `CompilationService.validate()` — the exact call the
  `validate_and_compile` MCP tool makes.
- **Does it do the right thing?** The candidate is executed in jsdom against the
  task's fixture and its DOM effect signature compared byte-for-byte to the
  reference's. (Effect-signature primitives are shared with the R2 ratchet, so
  the two cannot disagree about what a DOM effect is.)

A single blended "success rate" would hide the failure mode that matters most:
the parser **degrades rather than failing**, so a candidate can come back
`ok: true`, confidence 1.0, zero diagnostics — and target the wrong element, or
do nothing at all.

### Half 1 — the plausible-phrasing probe (no generator needed)

`probe-variants` scores a fixed catalogue of phrasings a competent generator
plausibly reaches for ([variants.ts](./variants.ts), each annotated with why).
No LLM runs, so the result is a reproducible property of the parser — measured
byte-identical across runs — and the claim stays narrow and checkable: _these
phrasings behave thus_, not _a model emits them at rate R_.

Recorded in [`baselines/agent-bench-phrasings.json`](../../baselines/agent-bench-phrasings.json)
and ratcheted both directions at tolerance 0 by
[`agent-bench.test.ts`](./agent-bench.test.ts) — a regression fails, and so does
an unrecorded improvement (the numbers below are quoted in the docs, so a stale
baseline makes them lie).

### Half 2 — the A/B run (needs a generator)

The loop being measured is the one a real integration runs, so simulating it
in-process would measure a simulation. Instead the harness is agent-driven:

1. `cli.ts list --json` — the prompts.
2. **One-shot condition.** The agent answers every prompt from the prompt alone,
   with no validation. Record them; do not revise after seeing any score.
3. **Loop condition.** The agent answers again, this time iterating through
   `cli.ts feedback --task <id> --code "<src>"` until it parses or it gives up.
   `feedback` returns **only** what the MCP loop returns — diagnostics and the
   parsed IR. It never reveals the reference or the behavior verdict; leaking
   either would turn the loop into an oracle and the delta into fiction.
4. `cli.ts score --run <file>` — per-condition parse rate, behavior rate, and
   the delta.

Run file:

```json
{
  "generator": { "model": "…", "date": "…", "context": "what the generator could see" },
  "conditions": {
    "one-shot": { "toggle-self-class": "on click toggle .active on me" },
    "loop": { "toggle-self-class": "on click toggle .active on me" }
  }
}
```

**No A/B run is committed here, deliberately.** The tasks and their reference
implementations were authored in the same session that would have produced the
candidates, so any one-shot number from that session measures recall of
just-written answers, not generation. A meaningful run needs a generator that
has not seen this directory — until one exists, the honest position is a harness
with no number attached, not a flattering number with a caveat. `score` is fully
implemented and ready for that run.

Not a CI gate: LLM-in-the-loop is nondeterministic and this repo's gates stay
deterministic. Half 1 **is** gated, because it has no generator in it.

## Findings — first probe, 2026-08-24

37 plausible phrasings, 20 tasks:

|                             | count |         |
| --------------------------- | ----- | ------- |
| parse                       | 36/37 | **97%** |
| behave correctly            | 18/37 | **49%** |
| parse clean but misbehave   | 18/37 | **49%** |
| …of which do nothing at all | 10/37 | 27%     |

**The loop's ceiling is lower than the pitch implies.** Exactly one of the 37
was caught by validation. Everything else that was wrong was wrong _silently_ —
no diagnostic, no error, nothing for an agent to react to and nothing for a
repair step to repair. Iterating `validate → fix → re-validate` cannot move a
single row in the ☠ band, because the loop is never told anything is wrong.

Families found, each a candidate diagnostic:

- **Omitted destination marker rebinds to `me`.** `add .highlight #item` and
  `toggle .open #panel` parse at confidence 1.0 and act on the button. The
  destination role silently defaults instead of reporting an unconsumed token.
- **Attribute writes have three spellings and only one works.**
  `set #panel's @aria-expanded to "true"` is correct; `set @aria-expanded of
#panel to …` and `… on #panel to …` are **silent no-ops**; `add
@aria-expanded="true" to #panel` writes an _empty_ value to the _wrong_
  element. The `of` form is the phrasing the style-property docs teach.
- **Plural emphasis breaks multi-target.** `add .done to all .todo` and `to
every .todo` hit the button instead of the matched set; `remove .active from
all .row` no-ops. Bare `.todo` / `.row` works — so the natural English
  intensifier is what breaks it.
- **`the X of Y` property phrasing no-ops.** `set the innerHTML of #output to …`
  parses and does nothing, while `#output.innerHTML` and the possessive both
  work.
- **Near-miss vocabulary no-ops silently:** `if #box has class .danger`,
  `remove element #item`, `on mouseover` (for a mouseenter trigger), and
  `add .modal-open to <body/>`.

Encouraging: `then`/`and`/comma sequencing, stray articles (`the #menu`,
`the closest .card`), `this` for `me`, and `put … in` vs `into` all work.

The actionable conclusion is not "polish the loop" but **make these failures
loud** — an unconsumed-token or no-op-command diagnostic would convert most of
the ☠ band into the band the loop already handles well.

## Adding a task

Append to [`tasks.ts`](./tasks.ts): a prompt with no hyperscript in it, a
reference, and the fixture markup it needs. Then run `verify-references` — a
reference that does not parse, or produces no DOM effect, is rejected (same
eligibility bar as R2's execution subset), because scoring against an empty
signature would make wrong answers look right.
