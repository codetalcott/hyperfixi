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

**Status: landed 2026-08-24** (PR #914) — see
[HANDOFF-agent-era-arc1-2.md](./HANDOFF-agent-era-arc1-2.md). Server-level MCP
`instructions` carry the loop; loop-tool descriptions cross-reference each
other; failed compile/validate results append a repair hint; the five
MCP-sampling tools are opt-in behind `LOKASCRIPT_MCP_LLM_TOOLS=1`. **Residue:**
the full agent-optimized-errors audit (does every coded error path name its
fix?) — folded into Arc 3, whose benchmark measures exactly this. Original
work items:

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

**Status: landed 2026-08-24** (PR #914) — see
[HANDOFF-agent-era-arc1-2.md](./HANDOFF-agent-era-arc1-2.md). Root `AGENTS.md`
(loop + worked repair example + ground rules; routes contributor agents to
CLAUDE.md), README "For LLM Agents" section and subtitle, mcp-server README
headline. The separate `docs/AGENTS.md` was dropped as a would-drift third
copy. Original deliverables:

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

**Status: harness landed 2026-08-24; the A/B number is deliberately NOT
claimed yet** — see [HANDOFF-agent-era-arc3.md](./HANDOFF-agent-era-arc3.md)
and `packages/testing-framework/src/agent-bench/`.

What shipped: 20 natural-language tasks with verified reference
implementations, a scorer that separates *parses* from *behaves* (jsdom effect
signature vs the reference, sharing R2's effect-signature primitives), an
agent-driven A/B protocol, and a deterministic plausible-phrasing probe that
needs no generator. The probe is baselined and ratcheted both directions at
tolerance 0.

**The finding reframes the arc — and Arc 1's premise.** Of 37 plausible
phrasings: **97% parse, 49% behave correctly, and exactly one failure produced
a diagnostic.** Half the phrasings parse clean at confidence 1.0 and misbehave
(10 of them do nothing at all). The validate/repair loop cannot move any of
those rows — it is never told anything is wrong. So the loop's ceiling is set
not by how good the repair guidance is but by how much of the failure mass is
*visible*, and today most of it is not. The highest-value next work is
therefore **making these failures loud** (an unconsumed-token / no-op-command
diagnostic), not further loop polish — see the new Arc 3b below.

**Why no A/B number is committed:** the tasks and references were authored in
the same session that would have generated the candidates, so a one-shot score
from it would measure recall of just-written answers. A harness with no number
beats a flattering number with a caveat. `score` is implemented and ready for a
generator that has not seen the directory. Original work items:

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

## Arc 3b — Make the silent failures loud

**Status: COMPLETE for the diagnosable set, 2026-08-24 (two slices)** — see
[HANDOFF-agent-era-arc3b.md](./HANDOFF-agent-era-arc3b.md). The unconsumed-token
family turned out to be a **propagation bug, not a parser gap**: the semantic
parser had flagged dropped tokens all along (warning-severity `unconsumed-input`
on the node, hoisted from any depth) and `CompilationService.normalize()` never
read node diagnostics. Lifting them into the response (as `UNCONSUMED_INPUT`
with a repair suggestion) moved **11 of the 18 silent rows into the visible
band** — silent share 49% → 19% — with zero parser change, so the multilingual
ratchets are untouched. **Slice 2 (same day) closed the remaining five real
gaps** via Gate 4 of the compilation-service validation pipeline
(`validation/inert-shapes.ts`): four narrow fingerprint checks
(`INERT_QUANTIFIER_TARGET`, `HALF_PARSED_CONDITION`,
`UNSUPPORTED_QUERY_LITERAL`, `INERT_PROPERTY_WRITE`), warnings only, still no
parser change — the filed "will touch parser/builder territory" caution was
falsified a second time: every fingerprint is visible in the IR the parse
already produces. Probe: silent band 49% → 19% → **5%**, and the remaining two
rows are valid-code-different-intent (`add .hidden to #menu`, `on mouseover`)
— by design not diagnosable; **the parser-gap silent band is zero**. What
remains of this arc is upstream polish, not gaps: the underlying tokenizer
quirks (`all` consumed as identifier while `every` is dropped; `has`
mis-tokenized as a class) could be fixed at the source someday, but with
warnings in place that is PARSER_NEXT_STEPS material, not agent-era work.
Original queue (promoted out of Arc 3's findings): Arc 3 measured that ~half of plausible phrasings misbehave
*without any diagnostic*, which bounds every loop-based story. Each family below
is a candidate diagnostic; the benchmark's ratcheted baseline is the acceptance
test (rows should migrate from the ☠ band to `rejected`, which the loop already
handles well):

- **Unconsumed-token diagnostic.** `add .x #el` silently rebinds the destination
  to `me` instead of reporting that `#el` was never consumed. Likely the single
  highest-yield fix — it covers the omitted-marker and plural-emphasis families
  (`to all .y`, `to every .y`) at once.
- **No-op-command diagnostic.** A command that parses to a shape which provably
  cannot affect anything (`set @attr of #el`, `set the innerHTML of #el`,
  `remove .x from all .y`, `remove element #el`, `if #el has class .x`) should
  warn rather than execute to nothing.
- **Attribute-write spelling convergence.** Three spellings, one works. Either
  accept `of`/`on` forms or reject them — silently no-op'ing is the worst option.
- Fold in Arc 1's residue here: the agent-optimized-errors audit (does every
  coded error path name its fix?) is the same work seen from the other end.

## Arc 4 — Extract the verification harness (no new package)

**Status: landed 2026-08-24** — see
[HANDOFF-agent-era-arc4.md](./HANDOFF-agent-era-arc4.md). **Reshaped before
starting, at the owner's direction:** the original plan was a standalone
`@lokascript/fidelity` package; with 27 packages already published across
three scopes (and twelve just deleted in #909), a 28th for a not-yet-existing
external audience would add list-maintenance cost and install-time confusion
for no present consumer. The extraction happened *without* a package:

- **Scorers → `@lokascript/semantic/fidelity`** (subpath export, flat entry
  like `./core`; CJS+ESM+d.ts). Moved verbatim from testing-framework, which
  now re-exports through a shim — so the ratchet suite exercises the extracted
  module and the two cannot drift. Pure functions over parsed node trees: no
  corpus, no baseline, no DOM.
- **Pairwise API → `CompilationService.scoreFidelity()`** beside `diff()`:
  normalize reference + candidate (any input format, sides may be in
  different languages), score with the extracted primitives. Returns
  actionRecall / multisetRecall / precision / roleFidelity / valueRecall plus
  the exact missing/spurious actions, missing role signatures, and lost
  invariant values (`toggle.destination=#panel`), and a `faithful` flag.
- **Agent surface → `score_fidelity` MCP tool** beside `diff_behaviors`,
  named in the server's MCP instructions and AGENTS.md: diff answers
  identical-or-not, scoring answers how-faithful-and-what-drifted — including
  for the intent-mismatch residue Arc 3b's diagnostics cannot see.

**A standalone package is deferred until a named external consumer exists.**
The subpath boundary makes later promotion mechanical; the reverse (retiring
a published package with dependents) is not. Execution equivalence (the
R2-style jsdom check) deliberately stays in testing-framework where jsdom
already lives — production consumers should not inherit browser-automation
dependencies for structural scoring.

Not done from the original filing, by choice: the two-string path already
needs no patterns.db (confirmed — the scorers never did); publishing
methodology docs beyond FIDELITY.md's new import pointer is positioning work,
not extraction work.

## Arc 5 — The review surface (human-in-the-loop)

**Status: slice 1 (the verified-translation badge) landed 2026-08-24** — see
[HANDOFF-agent-era-arc5.md](./HANDOFF-agent-era-arc5.md).
`CompilationService.translate()` now scores every rendering against its source
via `scoreFidelity()` (cross-language) and attaches the report as
`verification` — advisory, opt-out via `verify: false`, never flips `ok`.
`verification.faithful === true` is the claim "this rendering is structurally
exact", carried automatically by the `translate_code` MCP tool, whose
description now tells agents to present it alongside translations shown to a
user. This is the differentiator named in the original filing: LLM translation
cannot make this claim; ours is measured per call.

**Slice 2 — the editor command — landed 2026-08-24 (same PR series):**
the design below shipped as filed. `lokascript/translateWithVerification` on
the language server (handler probes the possibly-shimmed semantic package and
degrades cleanly in hyperscript-mode builds; 5 unit tests), the
`LokaScript: Show in My Language` command in `lokascript-vscode` (selection or
current line → QuickPick of the 24 languages or the `lokascript.reviewLanguage`
setting → Markdown preview beside the editor with the fidelity badge), and
`scoreNodes` relocated into `@lokascript/semantic/fidelity` so the service and
the server share one scorer. Both extension server-bundles needed a
longest-match alias for the fidelity subpath (the root `@lokascript/semantic`
alias/shim was swallowing it). Editor-host (integration) testing remains a
gap by repo-wide precedent — the handler is unit-tested; the command layer is
typecheck+bundle-verified. Original design note: the VSCode
extension is an LSP client (language features come from
`@lokascript/language-server`), and the server has no translation surface
today. "Show this handler in my language" therefore means: a custom LSP
request (working name `lokascript/translateWithVerification`) on the language
server backed by the same service call, an extension command rendering the
translation + badge (hover or virtual document), and editor-host testing this
repo does not yet have. A real multi-package feature — slice it when the
editor surface is the priority, don't half-ship it from the data layer.
Original deliverables:

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

## Standing deferrals (each with a named trigger)

Deliberately not done, so they don't rot as vague intentions. Each waits on a
concrete trigger, not a mood:

- **The A/B benchmark run** (Arc 3): implemented end to end, no number
  committed — the tasks/references were authored by the same session that
  would have generated candidates. **Trigger:** a generator that has not seen
  `src/agent-bench/`.
- **Standalone `@lokascript/fidelity` package** (Arc 4): the
  `@lokascript/semantic/fidelity` subpath is the promotion-ready seam.
  **Trigger:** a named external consumer.
- **Remote/HTTP transport for mcp-server** — the one salvageable idea from
  `@lokascript/mcp-multilingual-intent` (private, moved out with the domain
  family in #909, tag `moved/domain-family`; its five tools are all subsumed
  by today's mcp-server and its Siren-bridge architecture is obsolete now
  that MCP has native streamable HTTP). A hosted endpoint would let agent
  platforms connect without spawning a local stdio process — as a transport
  option on the EXISTING server, never a second server package.
  **Trigger:** demand for a hosted endpoint (e.g. on hyperfixi.org).

## Sequencing

Arcs 1 + 2 first (small, compound everything), Arc 3 as soon as 1 stabilizes
(its number feeds Arc 2's docs), Arc 4 second wave (the differentiator),
Arcs 5–6 as traction dictates. **Revised after Arc 3 landed:** Arc 3b jumps
the queue ahead of Arc 4 — a verification harness sold on catching silent
meaning-drops is undercut by a primary agent surface that produces them
undiagnosed, and Arc 3b's fixes are small and locally testable. Nothing here blocks the standing
correctness queues — they continue on their own merits and this track free-rides
on every fidelity improvement they land.
