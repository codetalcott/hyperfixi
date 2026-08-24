# Agent-era repositioning — roadmap

> **Entry point, written 2026-08-24.** The standing plan for repositioning the
> project as development shifts from human authors to LLM agents. Counterpart to
> [MULTILINGUAL_NEXT_STEPS.md](./MULTILINGUAL_NEXT_STEPS.md) (fidelity/accuracy
> track), [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md) (core parser track) and
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (command layer track). Those queues are about making the engine *correct*;
> this one is about who the engine is *for*.
>
> **Pointer-only by design.** One paragraph per arc; when an arc starts, write a
> `HANDOFF-agent-era-<topic>.md` brief with the detail and link it here.
>
> **Not scoped to a release.** Arcs land one PR at a time, whenever they land.

## The strategic read this queue encodes

Decided 2026-08-24. As agents take over code authoring, the project's founding
pitch — *humans who don't read English can write hyperscript in their own
language* — erodes: an LLM is natively multilingual, so a Korean developer can
prompt an agent in Korean and never look at the code. But three assets get
**more** valuable in an agent world, and all three already exist here in some
form:

1. **A small, verifiable DSL is a better agent target than raw JS.** An agent
   emitting hyperscript fails loudly and cheaply (compile check, confidence
   score, structured errors) where free-form JS fails in unbounded ways. The
   MCP server (`packages/mcp-server`) already exposes the loop:
   `compile_hyperscript` / `validate_and_compile` / `lse_validate_and_feedback`
   / `get_code_fixes`, backed by the patterns DB as a verified vocabulary.
2. **Deterministic verification of probabilistic output.** The 11-signal
   fidelity machinery ([docs/FIDELITY.md](../docs/FIDELITY.md),
   `packages/testing-framework/src/multilingual/fidelity.ts`) is exactly the
   shape of tooling the agent era needs: it can say "this generated/translated
   code is structurally faithful" without another LLM in the loop. Today it is
   an internal CI gate; its agent-era form is a library and MCP tool others
   call.
3. **Humans stop writing code before they stop reading it.** The bottleneck in
   agent-driven development is *review*, and reviewers increasingly aren't
   professional programmers. Deterministic render-into-my-language
   (`translate_hyperscript`, `explain_in_language`) is a review surface — and
   unlike LLM translation it ships with a provable fidelity score.

So the repositioning: **agent target** (generate → validate → repair loop),
**verification harness** (fidelity scoring as a product), **review surface**
(in-locale rendering for the human in the loop) — layered on the same stack.
The 24-language authoring demos become evidence for the fidelity engineering,
not the product itself.

### What this queue deliberately does NOT do

- **No new languages.** 24 is a proof, not a funnel; language 25 optimizes the
  eroding use case.
- **No chasing the fidelity tail beyond the named deferrals.** The R1/R3
  residue queue in MULTILINGUAL_NEXT_STEPS.md stands on its own merits; this
  track doesn't add pressure to it.
- **No new human-authoring UX** (editors, playgrounds, syntax sugar aimed at
  hand-writers). Existing surfaces stay maintained; they don't grow.

---

## Arc 1 — Sharpen the agent-facing MCP surface

**Status: not started.** The MCP server was built as "all tools for
everything" (~30 tools: hyperscript, IR, debug, LSP bridge, LLM sampling,
grail). An agent integrating today faces an undifferentiated list with no
narrative. Work items:

- **Curate a minimal "agent loop" profile**: the generate → `validate_and_compile`
  → structured-feedback → repair → `translate_hyperscript`/render cycle,
  surfaced as the server's headline (tool descriptions, README, server
  instructions). Everything else is secondary.
- **Agent-optimized errors.** Audit the failure paths of the loop tools: every
  refusal/error should name the fix, ideally with a corrected snippet (the
  `error-fixes.ts` / `get_code_fixes` machinery already points this way). An
  error an agent can act on mechanically is the product.
- **Demote what dilutes.** The generic LLM-sampling tools (`ask_claude`,
  `summarize_content`, `analyze_content`) compete with the host agent's own
  abilities and blur the story. Decide: remove, or move behind an opt-in flag.
- **Success signal:** an agent given only the MCP server and a natural-language
  UI task completes the loop without reading this repo's source.

## Arc 2 — `AGENTS.md` / agent-integration docs as the front door

**Status: not started.** Neither `AGENTS.md` nor `llms.txt` exists at the repo
root, and no doc shows an end-to-end agent loop. Deliverables:

- Root **`AGENTS.md`** (the convention agents actually read): what the DSL is,
  why an agent should emit it instead of JS, the MCP loop with a complete
  worked example (emit → validate → structured error → repair → pass), and
  pointers into `docs/`.
- **`docs/AGENTS.md`** (or a section in README) as the human-readable version
  of the same story, written before any new code — the doc *is* the
  positioning, and writing it first exposes gaps in Arc 1's tool surface.
- **README positioning pass**: lead with the agent loop and the fidelity
  guarantee; move 24-language authoring demos down to "how it works" evidence.
  Cheap, high-leverage, compound with everything else.

## Arc 3 — Eval the loop like an agent product

**Status: not started.** The claim "constrained DSL + validate/repair loop
beats free-form generation" needs a number. Build a small benchmark:

- N natural-language UI tasks (seed from the gallery examples and the
  patterns corpus — both already have known-good references).
- Measure: valid-parse rate and behavior-correct rate (score with the jsdom
  execution validator — the R2 machinery in
  `packages/testing-framework/src/multilingual/validators/`) for (a) one-shot
  generation, (b) generation with the validate/feedback loop.
- The headline number ("first-try X% → with loop Y%") goes in `AGENTS.md` and
  the README. If the number is bad, that's Arc 1 feedback, not a reason to
  bury it.
- Keep it cheap and reproducible: a script under `packages/testing-framework`
  (or a sibling), runnable with any MCP-capable agent; **not** a CI gate
  (LLM-in-the-loop = nondeterministic; this repo's gates stay deterministic).

## Arc 4 — Extract the verification harness as a standalone package

**Status: not started.** The largest build in this queue. Today the fidelity
scorers live inside `packages/testing-framework`, coupled to the multilingual
CLI, the corpus, and patterns.db provenance. Carve out a package (working name
`@lokascript/fidelity`) exposing the primitives with a clean API:

- **Inputs**: two code strings — reference + candidate, each in any supported
  language (or an intent structure via `packages/intent`).
- **Outputs**: a scored, explainable report — action recall/precision (R0),
  role fidelity (R1), value recall (R3), multiset recall, optional execution
  equivalence (R2, jsdom) and canonical validity (R4, round-trip).
- **Constraints from day one**: no patterns.db dependency for the two-string
  path; deterministic; documented blind spots (the en-reference caveat from
  FIDELITY.md carries over — say so, don't hide it).
- **Expose through MCP** as `score_fidelity` / `verify_equivalence` — "did the
  agent's edit preserve behavior?" answered cheaply and deterministically is a
  question every agent harness wants.
- The internal CI gate then consumes the package (testing-framework becomes a
  consumer, not the home), which is also the forcing function that keeps the
  public API honest.
- **Prereq check**: how much of `fidelity.ts` assumes the corpus/baseline
  shape? Write the HANDOFF brief with that measurement before starting.

## Arc 5 — The review surface (human-in-the-loop)

**Status: not started.** Package the existing translate/explain tools into
something a reviewer touches:

- **"Show this in my language"** as a first-class flow: a VSCode extension
  command (`packages/vscode-extension`), and an MCP tool agents call to
  *present* their diffs to the user in-locale.
- **Verified-translation badge**: every rendered translation ships with its
  Arc-4 fidelity score, so the surface can say "this Korean rendering is
  structurally exact (fid 1.0)" — the claim LLM translation cannot make. This
  is the differentiator; without the score it's just translation.
- Sequenced after Arc 4 (the badge needs the extracted scorer), though the
  VSCode plumbing can start earlier against the internal API.

## Arc 6 — Generalize via the framework (the long bet)

**Status: not started; deliberately last.** `createMultilingualDSL` +
`DomainRegistry` (`packages/framework`) generalize the whole stack: define a
schema → get a parser, validator, multilingual surface, and MCP tools. The
`@lokascript/domains` repo is the proof of concept. Deliverables, **only if
Arcs 1–4 show traction**:

- A tutorial-grade guide ("your domain DSL, agent-targetable and verifiable,
  in an afternoon").
- One compelling non-UI example domain, built in public.

---

## Sequencing

Arcs 1 + 2 first (small, compound everything), Arc 3 as soon as 1 stabilizes
(its number feeds Arc 2's docs), Arc 4 second wave (the differentiator),
Arcs 5–6 as traction dictates. Nothing here blocks the standing
correctness queues — they continue on their own merits and this track free-rides
on every fidelity improvement they land.
