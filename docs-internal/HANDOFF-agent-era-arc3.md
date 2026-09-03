# HANDOFF — agent-era Arc 3: the loop benchmark, and what it found

> Brief for Arc 3 of [AGENT_ERA_ROADMAP.md](./AGENT_ERA_ROADMAP.md). Landed
> 2026-08-24. Code: `packages/testing-framework/src/agent-bench/`.

## What shipped

- **`tasks.ts`** — 20 natural-language UI requests with reference
  implementations and per-task jsdom fixtures. Prompts carry no hyperscript (a
  test enforces this: a prompt containing the answer measures nothing).
- **`harness.ts`** — scores *parses* (`CompilationService.validate()`, the exact
  call `validate_and_compile` makes) and *behaves* (jsdom effect signature vs
  the reference) **separately**. Effect-signature primitives are imported from
  `../multilingual/effect-signature`, so this and the R2 ratchet can never
  disagree about what a DOM effect is. Reference signatures are memoized per
  process.
- **`variants.ts` + `probe-variants`** — 37 plausible phrasings, each annotated
  with why a generator would emit it. No generator needed at runtime, so the
  result is a reproducible property of the parser (verified byte-identical
  across runs; ~6s).
- **`cli.ts`** — `verify-references`, `probe-variants [--json]`, `list`,
  `feedback`, `score --run`.
- **`baselines/agent-bench-phrasings.json`** + **`agent-bench.test.ts`** — the
  probe is ratcheted both directions at tolerance 0 (24 tests, ~11s). An
  unrecorded *improvement* fails too: the numbers are quoted in AGENTS.md and
  the roadmap, so a stale baseline makes the docs lie.

## The finding

**37 plausible phrasings: 36 parse (97%), 18 behave correctly (49%). Exactly one
failure produced a diagnostic.** Ten phrasings parse clean and do *nothing*.

This reframes Arc 1's premise. The pitch was "a constrained DSL fails loudly and
cheaply, so the validate/repair loop converts failures into successes." Measured,
the loop's reachable set is tiny: it can only act on the 1 row it was told about.
The other 18 failures are invisible to it — confidence 1.0, zero diagnostics —
so no amount of repair-guidance polish moves them.

Families (each a candidate diagnostic, all listed in the agent-bench README and
as a lookup table in root `AGENTS.md`):

1. **Omitted destination marker rebinds to `me`** — `add .x #el`, `toggle .x #el`.
   Highest-yield fix: an unconsumed-token diagnostic also covers family 3.
2. **Attribute writes: three spellings, one works** — possessive is correct;
   `of`/`on` forms are silent no-ops; `add @a="v" to #el` writes an empty value
   to the wrong element. The `of` form is what the style-property docs teach.
3. **Plural emphasis breaks multi-target** — `to all .y` / `to every .y` hit the
   button; `from all .y` no-ops. Bare `.y` works, so the natural English
   intensifier is the trigger.
4. **`the X of Y` property phrasing no-ops** — while `#el.innerHTML` and the
   possessive both work.
5. **Near-miss vocabulary** — `has class`, `remove element`, `on mouseover`,
   `<body/>`.

Working fine: `then`/`and`/comma sequencing, stray articles, `this` for `me`,
`put … in` vs `into`.

## Why no A/B number is committed

The roadmap asked for "first-try X% → with loop Y%". Not claimed, deliberately:
the tasks and their references were authored in the same session that would have
produced the candidates, so a one-shot score from that session measures recall of
just-written answers, not generation. The A/B path (`list` → generate → `feedback`
→ `score`) is fully implemented and documented for a generator that has not seen
the directory. `feedback` returns only diagnostics + parsed IR — never the
reference or the behavior verdict — so the loop condition cannot cheat.

A harness with no number beats a flattering number with a caveat, especially
since the deterministic half already yields the more actionable result.

## What this promotes

**Arc 3b — make the silent failures loud** (new, jumps ahead of Arc 4). The
benchmark baseline is its acceptance test: rows should migrate from the ☠ band
to `rejected`. Arc 1's errors-audit residue folds in here — same work from the
other end.

Sequencing changed for a reason worth keeping: a verification harness (Arc 4)
sold on catching silent meaning-drops is undercut while the primary agent
surface produces them undiagnosed.

## Verification

- `npx tsx src/agent-bench/cli.ts verify-references` — 20/20 usable.
- `npx vitest run src/agent-bench/` — 24 passed (~11s).
- Probe output byte-identical across two runs.
- One reference was rewritten during authoring: `set @aria-expanded of #panel`
  was the original and turned out to be a silent no-op — caught by
  `verify-references`, which is exactly the rot the gate exists to catch.
