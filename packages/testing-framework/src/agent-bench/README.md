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

## Findings

### First probe, 2026-08-24 (pre-3b)

37 plausible phrasings, 20 tasks: **97% parse, 49% behave correctly, 49% parse
clean but misbehave** — and exactly one of the failures produced a diagnostic.
Iterating `validate → fix → re-validate` could not move a single ☠ row, because
the loop was never told anything was wrong. The actionable conclusion was not
"polish the loop" but **make these failures loud** — which became Arc 3b.

### Arc 3b, first diagnostic (unconsumed-input propagation)

The parser had been flagging dropped tokens all along — a `warning`-severity
`unconsumed-input` diagnostic on the node, hoisted from any depth, with a
confidence dock — and `CompilationService.normalize()` simply never read node
diagnostics, so `validate()` reported `ok` with an empty diagnostics array. The
fix is pure plumbing (no parser change, so the multilingual ratchets are
untouched): lift warning/error-severity node diagnostics into the response, as
`UNCONSUMED_INPUT` with a repair suggestion.

|                                       | pre-3b      | post-3b                |
| ------------------------------------- | ----------- | ---------------------- |
| parse                                 | 36/37 (97%) | 36/37 (97%)            |
| behave correctly                      | 18/37 (49%) | 18/37 (49%)            |
| wrong but **warned** (loop can react) | 1/37        | **12/37** (11 ⚠ + 1 ✗) |
| wrong and **silent**                  | 18/37 (49%) | **7/37 (19%)**         |

One plumbing fix moved 11 of the 18 silent rows into the visible band: the
omitted-marker family, the whole attribute-write family, `to every .y`,
`the X of Y` properties, and `remove element`. Behavior is unchanged — these
phrasings are still wrong — but the loop can now see and repair them.

The remaining ☠ 7 split honestly in two:

- **Real diagnostic gaps (5)** — parses that consume everything yet provably
  do nothing or bind the wrong target with no trace: `add .x to all .y` /
  `remove .x from all .y` (note the asymmetry: `every` warns, `all` doesn't),
  `set the text of #el`, `if #el has class .x`, `add .x to <body/>`. These are
  the next 3b targets (a no-op-command diagnostic covers most).
- **Valid code, different intent (2)** — `add .hidden to #menu` (adds a class
  named "hidden"; only wrong versus the _hide_ reference) and `on mouseover`
  (a real handler for a neighbouring event). No parser diagnostic can catch
  these; they are exactly what IR-vs-intent review (and Arc 4's equivalence
  checking) is for.

Bands are computed by `harness.bandOf` — one function shared by the probe, the
committed baseline, and the ratchet test, so they cannot drift apart.

## Adding a task

Append to [`tasks.ts`](./tasks.ts): a prompt with no hyperscript in it, a
reference, and the fixture markup it needs. Then run `verify-references` — a
reference that does not parse, or produces no DOM effect, is rejected (same
eligibility bar as R2's execution subset), because scoring against an empty
signature would make wrong answers look right.
