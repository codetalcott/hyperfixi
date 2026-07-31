# Command architecture — next steps

> **Entry point, written 2026-07-28.** The standing queue for structural work on
> the command layer: how commands are registered, described, executed, and
> propagated into `it`/`result`. Counterpart to
> [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md) (the `packages/core/src/parser/`
> track) and [MULTILINGUAL_NEXT_STEPS.md](./MULTILINGUAL_NEXT_STEPS.md) (the
> semantic/i18n track). Read it before adding, removing, or restructuring a
> command surface.
>
> **Pointer-only by design.** Never restate a repro or a migration diff here —
> per-arc detail belongs in a `HANDOFF-command-arch-<topic>.md` brief written
> when the arc starts. One paragraph per arc below; the linked source is
> authoritative.
>
> **Not scoped to a release.** Nothing below is release-blocking. Tying arcs to
> a version means either the version slips and this lies, or they defer and this
> rots — which is exactly how `PARSER_FIX_STATUS.md` died. Arcs land one PR at a
> time, whenever they land.

## Why this queue exists

The 2026-07-28 session (PR #792 append/prepend, PR #793 doc-scripts/drift
guards) measured the command layer's two structural diseases directly:

**The command set is described in ~20 hand-maintained places.** Adding `prepend`
touched ~30 files, and an exhaustive, explicitly-verified plan still missed one
(`metadata.ts` counts — the `verify:reference` CI gate caught it). The deletion
side is worse: `persist`/`bind` ghosts survived **six months** in untypechecked
`scripts/`, the LSP tier lists (offering completions the runtime rejects,
including `transfer`, which never existed anywhere), and the bundle-generator
capability lists. Six independent rot instances, one cause: *lists that describe
code, that nothing compares to the code*. Exhibit: when this doc was written the
actual count was 59, the root CLAUDE.md said 58 (corrected in the same commit as
this doc), and `runtime/runtime.ts` still says "48 commands" in **six** places
(:3, :10, :135, :164, :168, :178) with several per-category group comments
undercounting — those were left alone deliberately, because Arc A makes the
number derived rather than re-typed. **Arc A did exactly that**: all six, and
the undercounting group comments, went with step 3's registration loop, and
`packageInfo.commands` plus the full-runtime `commandCount`s are now computed
from the manifest (step 4.4). `grep "48 commands" packages/core/src` returns
nothing today. The paragraph is kept because the *shape* it describes is the
point, and Findings 15 and 17 are the same shape recurring elsewhere.

**The command set is executed in 4 semi-independent implementations.** Full
runtime classes, the lite-plus inline executor, the hybrid-complete inline
executor, and the bundle-generator template strings. For `append`, the three
"copies" used `insertAdjacentHTML` correctly while the **canonical class** was
the one destroying target DOM with `innerHTML +=`. Duplication does not merely
risk staleness — it hides which implementation is the truth.

And one finding from the audit for this very document: **~20 of the 52 decorated
commands return wrapper objects that match no `unwrapCommandResult` branch**
(`runtime-base.ts:75-124`; a second copy of the propagation loop lives at
`dom/attribute-processor.ts:494`). After `wait`, `go`, `transition`, `settle`,
`take`, `throw`, `halt`, and others, `it` is an internal wrapper object, not a
value. `default` and `measure` match branches only by key-name accident, and the
unconditional `val[0]` collapse at :121 silently truncates `toggle`/`put`'s
element lists. The existing tests (`runtime.test.ts:950-986`) cover six positive
cases and no fall-throughs.

What the same session proved *works*: every data-driven surface took a one-line
change (`MULTI_WORD_PATTERNS`, the opt-in `COMMAND_IMPLEMENTATIONS` keyed by
name, the schema→pattern-generator pipeline, whose `omitRoleVariants` did in one
line what would otherwise have rewritten 24 languages of patterns). The arcs
below generalize the remediation patterns #792/#793 established: derive-don't-
trust (`verify:reference` now derives bundle counts), prettier-idempotent
generators with `--check` CI gates, `typecheck:scripts`, and ghost tests.

## Design principles

- **Derive, don't trust.** Any count or list that describes code is computed
  from it, or gated against it. Hand-maintained copies rot on a six-month clock.
- **Data over duplicated code.** Where a per-command fact is data (a preposition,
  a tier, an alias), it lives in one table; code consumes the table.
- **Audit first.** Each arc's step 1 lands the authoritative inventory *as a
  test* — the audit is the first gate, and migration ratchets it down.
- **Every arc lands with a gate.** A refactor that doesn't leave a mechanism
  behind will un-refactor itself by the next vocabulary sweep.
- **One PR per arc stage, merged sequentially.** Stacked PRs get zero CI
  (`ci.yml` fires only on PRs into main/develop) and still report clean.

## Read this before starting anything below

| Arc | Value | Gate today | Detail |
| --- | ----- | ---------- | ------ |
| ~~D — target-resolution consolidation~~ | **DONE** (#796/#797/#798) | ✅ + 36 new tests pinning the rung order and both selector shapes | [HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md) — now a record, not a plan |
| ~~C — output contract~~ | **DONE** (#801/#802/#803/#805/#806) | ✅ the per-command `it` audit, both execution paths, 45 of 59 commands | [HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md) — now a record, not a plan |
| ~~A — command manifest~~ | **DONE** (#811/#813/#814/#815/#817/#818/#819) | ✅ the 19-test bidirectional audit + the manifest's §7; classification debt is **0** | [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md) — now a record, not a plan |
| ~~B — metadata single-sourcing~~ | **DONE** (#823/#824/#825/#826/#827/#828) | ✅ the 7-test docs-coverage gate + §9's compatibility coupling + the static/instance bridge invariant; `metadataOf()` deleted, its check now `TS2322` | [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md) — now a record, not a plan |
| ~~E — generated static bundles~~ | **DONE** (#829/#830/#831/#832/#835/#836) | ✅ `generate:bundles:check` in CI's generated-artifacts step; hybrid-complete's executor switches AND `HYBRID_PARSER_TEMPLATE` are both generated | [HANDOFF-command-arch-bundles.md](./HANDOFF-command-arch-bundles.md) — now a record, not a plan |
| ~~F — schema-driven mappers + scaffolder~~ | **DONE** (#838/#839/#840) — 43 of 47 mappers deleted, 1301 → 448 lines | ✅ `check:mapper-parity` (332-case oracle, byte-identical regeneration) + `ast-shape-consistency` + semantic suite + ten-signal ratchet | [HANDOFF-command-arch-mappers.md](./HANDOFF-command-arch-mappers.md) — now a record, not a plan |

## The arcs — all six are done (D → C → A → B → E → F)

### Arc D — target-resolution consolidation — ✅ DONE 2026-07-28

Landed as #796 (put's `insertContent` collapse), #797 (the writable-target rung
ladder → `commands/helpers/write-target.ts`), #798 (the selector-shape rule →
`commands/helpers/target-elements.ts`). Detail, per-step outcomes, and the
decisions it recorded live in
[HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md).

Two things later arcs should carry forward:

- **Arc C step 3 has its ratchet now.** D step 3 landed alone (C had not
  started), so `unwrapCommandResult`'s `:121` array collapse is untouched — but
  the `#id`→element / `.cls`→collection rule it depends on is now a single
  definition with both shapes pinned by tests, through both the sync and the
  async evaluator. C step 3 decides the `:121` policy *against* a pinned rule
  instead of inheriting an implicit one.
- **One follow-up left open, deliberately.** put and append/prepend coerce a
  value to an element list *differently* — put filters a mixed array, they
  reject it; put gates array-likes on `instanceof NodeList`, they duck-type and
  accept an HTMLCollection. Both differences are observable, so reconciling them
  is a behavior change, not a refactor. They now sit side by side in
  `target-elements.ts` as `toElementListFiltered` / `toElementListStrict`, both
  tested. Deciding whether they should agree wants its own change.

### Arc C — command output contract — ✅ DONE 2026-07-28

Landed as #801 (step 0, one propagation call site), #802 (step 1, the audit),
#803 (step 2 spec) + #805 (the `unless` fix step 2 surfaced), and #806 (step 3,
the deletion). Detail and per-step outcomes live in
[HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md).

Three things later arcs should carry forward:

- **`it` and `result` are now ONE slot**, resolved through either name (upstream's
  model). Commands self-assign `it`; nothing propagates from a command's return
  value any more. If you add a command that should set `it`, self-assign it —
  there is no longer a runtime mechanism that will infer it from your output shape.
- **The audit test is the gate.** `runtime/__tests__/command-output-contract.test.ts`
  records what `it` holds after every registered command on BOTH execution paths,
  and ratchets the registry list in both directions. A new command must be given a
  row or a documented skip.
- **Decided (#808):** `settle`/`transition` no longer self-assign — upstream
  parity, removed while #806's both-paths state was still unreleased (the only
  moment it was free). The command-set rule is uniform: **a command sets `it`
  iff upstream sets `result` for it** — with ONE recorded exception still open:
  **send/trigger** self-assign the dispatched Event (`trigger.ts`,
  `(context as any).it = event`) where upstream sets nothing. Different
  usefulness profile (post-dispatch `defaultPrevented` is not re-derivable), so
  it wants its own decision; nothing else in the command set diverges.

Superseded plan, kept for the record:

> **Read [HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md)
> first — it REVISES steps 2 and 3 below.** The brief's exploration measured
> that `it` is set by **two** independent mechanisms: command self-assignment
> (which works on every execution path) and the `unwrapCommandResult` loop
> (which runs only in event-handler bodies, not in `then`-joined sequences). All
> seven sniffing branches turned out to be redundant with self-assignment, so
> the destination moved from "migrate ~25 commands to the envelope" to **delete
> the propagation loop** — the envelope is read only by the mechanism that
> doesn't run everywhere, so migrating to it preserves the path disagreement
> rather than fixing it. The brief is authoritative; the steps below are kept
> for the record.

0. **Collapse the two propagation call sites first.** `unwrapCommandResult` is
   called independently from `runtime-base.ts:1756` and
   `dom/attribute-processor.ts:494`. Deleting sniffing branches (step 3) while
   two copies of the loop exist is precisely the *duplication hides which
   implementation is the truth* disease this queue's preamble names — sitting
   inside the arc meant to cure it. Cheap and mechanical, and it makes every
   later step land once instead of twice.
1. **Audit first**: a test that instantiates every registered command, catalogs
   its execute-output shape against the seven sniffing branches
   (`result+wasAsync` / `result+executed` / `lastResult+type` /
   `conditionResult+executedBranch` / lone `value` / `value+target+targetType` /
   `data+status+headers`), and snapshots the classification. Today's ~20
   fall-throughs, the two accidental matches, and the :121 array collapse become
   visible and ratchetable in one landing.
2. Migrate command-by-command: either the `{ target?, value, targetType }`
   envelope (set's shape — `content/insertion-base.ts:66` documents the pattern
   #792 adopted for append/prepend) or a void return for commands that should
   not touch `it` at all (e.g. `wait`; upstream doesn't set result there). The
   per-command decision is recorded in the audit snapshot. Each migration ships
   with an event-handler `it` assertion (the #792 test shape). **Each one is a
   deliberate behavior change to `it`** — but read that phrase with its blast
   radius attached, because on its own it reads scarier than the work is: for
   the ~20 fall-throughs `it` currently holds a wrapper *nothing can usefully
   consume* (what reads `{ halted, timestamp, eventHalted }`?). The genuinely
   observable changes are the few whose wrapper happens to be readable, plus the
   two accidental matches. Small sequential PRs are for reviewability — not
   because each one carries real user-visible risk. That is what makes this arc
   safe to sequence this early.
3. Delete the sniffing branches, and decide the :121 array policy deliberately
   rather than by inheritance. **`:121` is not a tail-end cleanup — it is Arc D
   step 3's defect from the other end.** The selector-shape asymmetry
   (`#id`→element, `.cls`→array) is what makes the collapse fire, so
   `toggle .a on .items` silently leaves `it` as the *first* element: the same
   shape as append's pre-#792 `.cls` no-op.
   **Pairing resolved (2026-07-28):** Arc D step 3 landed WITHOUT this — D
   reached step 3 before C started, so it shipped the shape-pinning tests and
   left `:121` alone. That is the easier position to decide from, not a missed
   opportunity: the rule now has one definition (`resolveTargetElements` in
   `commands/helpers/target-elements.ts`) with both shapes pinned by
   `commands/helpers/__tests__/target-elements.test.ts` and
   `parser/__tests__/selector-shape.test.ts`. Read those two files first —
   they state what `it` *should* hold for each shape, which is exactly the
   question this step has to answer.

### Arc A — command manifest — ✅ DONE 2026-07-28/29

Landed as #811 (step 1, the audit-as-gate), #813 (step 2, the data-only
manifest), #814 (step 3, the four mechanical consumers), then the four
decision-bearing consumers: #815 (4.1, LSP tiers vs the published engine), #817
(4.2, capability lists vs the generator), #818 (4.3, `COMMAND_KEYWORDS` vs the
parser), #819 (4.4, `packageInfo.commands` derived). Detail, per-step outcomes
and all seventeen findings live in
[HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md).

**Classification debt is zero** — every registered command is classified in
every list, and each of the four `*_UNCLASSIFIED`/`*_GAPS` sets is an empty set
the audit holds at 0.

Things later arcs should carry forward:

- **Arc B can copy 59 *finished* values.** 4.1 deliberately decided NOT to
  populate `metadata.compatibility`, leaving `upstreamOrExtension` absorbed from
  the tier lists. Waiting cost Arc B nothing and gained it a settled column —
  it could not have copied 23 rows reading `'unknown'`.
- **`tier` and the capability lists are two different facts** that disagree on
  16 of 59 rows. Neither may be derived from the other; anything wanting "can
  the generator emit this" needs its own field.
- **Three follow-ups are open and named**, each a behavior call with its
  measurement already in hand: Finding 17 (below, under Arc E), and Finding 15's
  two — `multilingual` ships 52 commands rather than the full 59, and `minimal`
  registers 11 while advertising 10.

**The original plan paragraph is kept below for the record.** Two of its three
claims did not survive measurement, and that is the reason it is worth keeping:
it is the record of what a plausible-sounding plan got wrong.

> **Read [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md)
> first — it REVISES the migration ORDER and the manifest SHAPE below.** The
> exploration measured three of this paragraph's claims. Two did not survive.
> (a) "both already ghost-tested, so the tests carry the migration" is **false in
> the direction that matters**: both gates only filter *for* ghosts, so dropping
> a real command from either list is silent (measured by mutation — `trigger`
> from `AVAILABLE_COMMANDS`, `toggle` from the tier lists, both green). And those
> two lists are **already wrong** by 23 and 12 entries against the registry, so
> migrating them is a per-command classification decision, not a substitution —
> making them the arc's *last* targets, not its first. The genuinely mechanical
> ones are the four 59-entry lists that already agree exactly, sequenced last
> below. (b) A `factory` field in the manifest **defeats tree-shaking**: measured
> 177 B → 38,395 B for a names-only consumer at four commands. The manifest must
> be data-only. The paragraph below is kept for the record.

One `packages/core/src/commands/manifest.ts` as the registry-of-record: name,
category, factory, parser kind, multiword keywords, bundle tier,
upstream-vs-extension flag, aliases. Consumers migrate **one at a time**,
lowest-risk first — template-capabilities lists and LSP tier lists (both already
ghost-tested, so the tests carry the migration), then `parser-constants`
`COMMANDS`, bundle name arrays, the runtime registration block (59 flat
`registry.register(createXCommand())` calls at `runtime/runtime.ts:181-265`),
and finally `packageInfo.commands` as a derived value. Tree-shaking constraint:
slim bundles keep explicit per-bundle factory imports — manifest-*checked*, not
manifest-driven, where shaking matters. Fix the drifted "48/58/59" docstrings as
derived values land. Gates already in place: `verify:reference`,
`capability-ghosts.test.ts`, `command-tiers.test.ts`,
`bundle-manifest-consistency.test.ts`.

### Arc B — metadata single-sourcing — ✅ DONE 2026-07-29

Landed as #823 (the brief), #824 (`commandMeta()` + the three undecorated
classes), #825 (the `compatibility` coupling, before any values existed), #826
(all 52 decorated classes migrated), #827 (`@meta` and `metadataOf()` deleted),
and #828 (the docs generator, 43 → 59, with its coverage gate). Detail, per-step
outcomes, and all findings live in
[HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md).

**The arc's goal is delivered**: decorator statics are type-visible —
`ToggleCommand.metadata.category` narrows to `'dom'` where every read used to be
`TS2339` — and the workarounds that invisibility forced (`metadataOf()`, the three
dead getters, script typechecking staying off) are gone. The decorator module went
257 → 179 lines while *gaining* `commandMeta`.

Things later arcs should carry forward:

- **The arc's own stated motivation was wrong, and measuring caught it.** `@meta`
  already type-checked its 52 literals; the defects were the invisible *static* and
  three literals checked by nothing. A plan's premise deserves the same scoring as
  its rows.
- **A gate never seen to fail is not known to work.** Step 2 landed a gate that was
  vacuous over values and mutation-verified it anyway; step 3's oracle then reported
  a false `0` because it iterated one side's keys only. Diff the UNION, and take
  baselines from the MERGED PARENT commit — a mid-step snapshot made a pure deletion
  look like 59 changed rows.
- **Two structural facts the type system surfaced** that `defineProperty` had
  hidden: base classes cannot declare `metadata` as a property if subclasses supply
  a getter (18 errors, 9 subclasses), and a **shared implementation cannot carry two
  `compatibility` values** — `ConditionalCommand` is both `if` (upstream) and
  `unless` (extension), pinned in §9 derived from the shared groups.

**The original plan paragraph is kept below for the record.**

> **Superseded — this is what the plan said before the arc ran.**


> **Read [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md)
> first — it CORRECTS this paragraph's stated motivation.** "Making metadata
> visible to the type system" is right; the implied corollary that tsc does not
> currently reject a mis-shaped metadata literal is **false for 52 of 55
> implementations** (`meta(config: MetaConfig)` types its parameter, so a typoed
> field is already `TS2561` — mutation-verified with a misspelled field name).
> The static really is invisible
> (`TS2339`, also mutation-verified), and that — plus **three undecorated classes
> whose metadata is checked by nothing at all** — is the arc's actual payoff.
> The brief also settles the `compatibility` domain mismatch, records the
> verified `commandMeta()` signature, and adds four findings: a **second
> `CommandMetadata` interface** in `command-adapter.ts` that the load-bearing
> reader uses, a third `CommandCategory` union, `generate-command-docs.ts` as a
> **21st hand-maintained list that is 16 commands short and gated by nothing**,
> and **16 dead `metadata.examples` across 12 commands** (a different set from
> Arc C's five, because it is a different oracle).

Replace `@meta`'s runtime `defineProperty` statics with
`static readonly metadata = commandMeta({...})`, making metadata visible to the
type system (the invisibility is why `scripts/` typechecking stayed off for six
months, and why `metadataOf()` exists). Verified 2026-07-28: the three decorator
symbols are module-private with zero external readers (the exported getters are
dead); the only live instance-side readers are
`packages/core/src/runtime/command-adapter.ts:421` (name fallback) and **:440 —
the aliases read, which is load-bearing: dropping it silently un-registers alias
keywords** — plus a cosmetic projection (:212-221)
and `command-pattern-validator`. Keep instance `.metadata` working via an
instance field/getter, or point the two adapter sites at
`impl.constructor.metadata`. Current props are `configurable: false`: hybrid
migration states are fine, re-decoration is impossible. Then single-source the
prose: completeness tests for `reference/index.ts` and `lsp-metadata.ts` first
(cheap), full generation from the classes second (the #793 idempotent-generator
plus `--check` pattern), and `generate-command-docs --check` in CI so
`commands.json` cannot rot silently again. Prior art:
[HANDOFF_vitest-oxc-decorators.md](./HANDOFF_vitest-oxc-decorators.md).

### Arc E — generated static bundles (medium-large)

> **ARC E CLOSED — all five steps shipped (#830, #831, #832, the step-4 PR
> #835, and the step-5 PR).** The remaining paragraph below is kept as the
> arc's original statement; its work is done.
> Finding 17 is shut: `browser-bundle-hybrid-complete.ts`'s `executeCommand` and
> `executeBlock` switch bodies are GENERATED from `bundle-generator/templates.ts`
> by `packages/core/scripts/generate-bundles.ts` and guarded by
> `generate:bundles:check` in CI. The bundle executes all 38 advertised names,
> not 24. **Step 5 closed the last hand copy**: `HYBRID_PARSER_TEMPLATE` is
> generated from `parser/hybrid/{aliases,tokenizer,parser-core}.ts` by the same
> script — the hand copy was measured BEHIND the real parser on five parse
> capabilities (`@attr`, `'s`, fetch `via`/`with`, `values of`, KEYWORDS), all
> shipped invisibly in vite-embedded bundles because nothing executed the
> template. An AST-equivalence corpus in `parser-template-drift.test.ts` now
> does. Current facts for whoever works nearby: hx is **21997 gz against
> `MAX_HYBRID=24000`** (raised in step 4; `morphlex` via the `morph` case is
> +2057 of that); executor generation covers the CASE BODIES ONLY; the parser's
> EMITTED-name set is not `cmdMap`'s key set (`waitFor`/`removeClass`), the
> check that found step 2's and step 5's gaps alike. `LITE_PARSER_TEMPLATE` and
> the lite-family regex parsers stay hand-maintained by design (no canonical
> twin to generate from). A parked adjacent: the tier-appropriate mini-morph
> (brief § "Parked"), which would reclaim ~1.5 KB gz of step 4's carry.
>
> **Brief written 2026-07-29 —
> [HANDOFF-command-arch-bundles.md](./HANDOFF-command-arch-bundles.md).**
> It re-measured this paragraph and two of its claims did not survive: there are
> **five** executor copies (not four — `browser-bundle-lite.ts` is its own),
> and the two regex bundles structurally *cannot* consume the AST templates, so
> the arc's scope is the two AST executors + templates → one source, with the
> lite family joining at the boot-shell step only. It also found a **live
> shipped bug** (`take` throws in `hybrid-complete`/`hx`, probe-confirmed) and
> that the copies disagree on 8 real rows in *both* directions. Follow the
> brief's step order — it inserts an execution gate + divergence reconciliation
> ahead of the four steps named below, because generating from unreconciled
> templates is a behavior change wearing a refactor's commit message.

The split is clean, verified: `browser-bundle-lite-plus.ts` is parser (:112-292),
executor (:294-697), and a ~92-line boot shell; `browser-bundle-hybrid-complete.ts`
already imports its parser from `parser/hybrid/*` and keeps a near-identical
~95-line shell — half the target state already demonstrated. Steps: shared
boot-shell helper (the shells differ only in their `commands`/`blocks` arrays
and alias-registration identity) → generate the executor cores from the
bundle-generator templates (`generateBundleCode`) → commit outputs with `--check`
drift guards → generate `HYBRID_PARSER_TEMPLATE` from `parser-core.ts` source
instead of hand-maintaining a string copy (its drift test retires into the
generator). This makes the #792 finding — copies diverging from the canonical in
*both* directions — structurally impossible. Gates: bundle-size snapshot (±5% +
absolute ceilings), the Playwright bundle compatibility matrix,
`dist-charset-safety`, `bundle-manifest-consistency`. Prior art:
[proposals/aot-compiler-design.md](./proposals/aot-compiler-design.md).

> **Arc E now has a concrete, measured motivating case — Finding 17** in
> [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md).
> Closing Finding 13 (the 14 unreachable capability case labels) put eleven
> restored command rules into `parser/hybrid/parser-core.ts`, which serves BOTH
> the generated bundles (38 commands via `COMMAND_IMPLEMENTATIONS`) and the
> handwritten `browser-bundle-hybrid-complete.ts` (**24** cases in its own
> `switch`). So the shipped hybrid bundles now PARSE 35 commands and EXECUTE
> 24, paying +388 bytes gzip (hybrid-complete) and +386 (hx) for rules they
> cannot run. That is exactly the "4 executors → 1 template source" problem this
> arc exists to remove: generating the executor cores from the same templates
> would close the gap instead of documenting it.
>
> **Two constraints for whoever starts this.** (1) `hyperfixi-hx.js` is at
> **19019 bytes gzip against `MAX_HYBRID=20000`** — ~980 bytes of headroom, and
> generating executors makes bundles grow before they shrink, so budget a
> deliberate ceiling change rather than discovering one. (2) The "generate
> `HYBRID_PARSER_TEMPLATE` from `parser-core.ts`" step is now *more* valuable
> and *better specified*: the two copies were measured to disagree (the template
> had `empty` and no `halt`, parser-core the reverse), they were reconciled by
> hand, and `capability-emission.test.ts` §4 asserts their cmdMaps are
> identical — that assertion is the spec the generator must satisfy, and it
> retires into the generator exactly as this arc describes.

### Arc F — semantic schema-driven mappers + scaffolder — **CLOSED** (#838, #839, #840)

Landed 2026-07-31. Brief and full record:
[HANDOFF-command-arch-mappers.md](./HANDOFF-command-arch-mappers.md).

`CommandSchema` gained an optional `ast: AstShape` descriptor and
`buildFromAstShape` reads it, so a command whose semantic-roles → AST mapping is
data needs no mapper function. Resolution is **registry → descriptor →
`buildGenericCommand`**, leaving `registerCommandMapper` as the override.
`command-mappers.ts` went **1301 → 448 lines**: 43 of 47 mappers are now
declarative. The four that remain branch on a role's *value* rather than its
presence, which no declarative shape expresses — `wait` (event vs duration flips
the node shape), `put` (preposition from a literal), `go` (injects `'back'`/
`'url'` args), `pick` (variant dispatch + range splitting).

Step 6 shipped `packages/core/scripts/add-command.ts`.

**Four premises in the paragraph this replaces were wrong, and measurement
caught each** — the sixth consecutive arc whose plan needed re-scoring:

- "~30 mechanical / ~10 real logic / 7 block mappers" → **29 mechanical, 14
  coalescing, 4 real logic**. `set`/`swap`/`send`/`morph` are declarative; the
  "block mappers" are a non-category, since `ASTBuilder.build` dispatches those
  node kinds to their own builders and bodies never reach a command mapper.
- "switches in **two** places" → **three**. `buildGenericCommand`'s
  `roleToModifierKey` is the third, and 24 schema-backed actions fall through to
  it. (`semantic-integration.ts`'s switch had also drifted from `:386` to `:368`.)
- "Add `astModifier` to `RoleSpec`" → **impossible for 14 of 47.** A role-level
  field cannot express coalescing chains (`destination ?? patient`), arg order
  (`swap`), or `set`'s arg/modifier inversion. The descriptor is command-level.
- "Replacing the fallback is the arc's structural win" (step 4) → **it is 2
  commands, not 24.** Comparing the blanket mapping against each true-fallback
  schema's own en markers: 12 are already correct, and only `scroll`
  (destination emits `on`, marker is `to`) and `open` (style emits `with`,
  marker is `as`) are wrong. Step 4 is therefore a small targeted behavior fix,
  still open, and wants its own PR with ratchet evidence.

**The parity oracle is the reusable artifact.**
`packages/semantic/scripts/gen-mapper-parity.ts` records what all 47
mapper-backed actions emit across a matrix of role subsets (332 cases), gated by
`check:mapper-parity` in CI's generated-artifacts step. Regenerating it after
migrating 43 commands produced a **byte-identical** fixture — a far stronger
claim than "the tests pass". Two traps that would have made it vacuous, both hit
for real: role-sensitivity discovery by "drop one role from all-present" is
blind to the losing member of a coalescing chain (it under-reported
blur/show/morph/measure/fetch), and keying the fixture off the mapper registry
— which shrinks as commands migrate — would have let it stay green by testing
less each step.

## Non-goals — keep these

The command **factory pattern** (tree-shaking works), the **decorator runtime
behavior** (only its type-invisibility is in scope, Arc B), the
**CommandNodeBuilder**, the **`MULTI_WORD_PATTERNS` table** (adding prepend was
one line), the **schema→pattern-generator pipeline** (`omitRoleVariants` solved
in one line what a schema flip would have broken across 24 languages), and the
curated-behaviors philosophy. Each proved itself under pressure in the very
session that produced this queue. The problem is the hand-maintained periphery,
not the core abstractions.

## Open, filed rather than folded in

- **~~Arc F step 4~~ — `scroll` and `default` LANDED; `open` deferred with a
  measured reason.** Arc F migrated 43 of 47 mappers to schema `ast`
  descriptors; the 24 actions with no mapper still fall through to
  `buildGenericCommand`'s blanket mapping (`destination`→`on`, `duration`→`for`,
  `source`→args, `method`→`via`, `style`→`with`, and `condition`/`event`/`goal`
  in NEITHER list so they are dropped). Measured against each true-fallback
  schema's own English markers, **12 of 14 are already correct and only two are
  wrong** — the arc's brief had guessed this would be its structural win, and it
  is not.
  - **`scroll` — DONE.** `commands/navigation/scroll-to.ts` `parseInput` reads
    **only `raw.args`** and throws when it is empty, so the destination had to
    become an ARG (re-keying the modifier `on`→`to` would have fixed nothing).
    Shipped as `ast: { args: ['destination'] }`.
  - **`default` — DONE.** Not on the step-4 list at all (it already had a
    descriptor); it was the `default.to` `drift` exemption. Inverted to
    `ast: { args: ['destination'], modifiers: { to: 'patient' } }`, matching
    DefaultCommand's `args[0]`-is-target / `modifiers.to`-is-value contract, and
    the exemption was pruned.
  - **`open` — DEFERRED, and the one-line fix in this entry was wrong.** The
    proposed `ast: { args: ['patient'], modifiers: { as: 'style' } }` is
    **inert**: no en pattern binds `style` for the documented surface. Measured
    2026-07-31 — `openSchema` gives `style` `svoPosition: 1` and `patient` `2`,
    so the generated en pattern is `open [as {style}] [{patient}]` and only the
    un-English `open as modal #dlg` binds the role; `open #dlg as non-modal`
    (OpenCommand's own documented example) parses to `patient` alone, and
    `translate(…, 'en', 'ja')` drops the variant from the rendered output too.
    Making it live needs (a) the two positions swapped so the marker follows the
    target — a 24-language pattern-shape change, so ratchet evidence — and
    (b) the captured value to survive: `non-modal` tokenizes to the *expression*
    `non - modal`, which `convertValue` routes through the expression parser
    into a subtraction node, where `open.ts`'s `normalized === 'non-modal'`
    string compare can never match. (a) without (b) turns a silent default into
    a wrong value. **No corpus row exercises the `open` command**, so the
    ratchet cannot be the evidence here — vitest behavior tests must be.
  Caveat on the original measurement, now demonstrated rather than hypothetical:
  it only inspects roles a schema DECLARES, and says nothing about whether the
  parser ever BINDS them.
  **Correction to this entry's own evidence claim:** it named `window-scroll`
  and `modal-open` as the corpus rows for `scroll`/`open`. Neither is: they are
  `on scroll from window …` (an event) and `… add .modal-open to body` (a class
  name). The rows that do exercise these commands are `last-in-collection`
  (`scroll to last <.message/> in #chat`), `default-value` (`default my
  @data-count to "0"`), and `swap-content` (`swap #a with #b`).


- **Core's `semantic-integration.ts` switch is a SECOND semantic→AST
  implementation, and it has already drifted from the first.** Measured
  2026-07-31 during Arc F step 1, by running both paths over the same semantic
  parse. For `put "x" before #out` (roles `patient`/`destination`/`manner`):
  `buildAST` emits `modifiers: { before: #out }`; `buildCommandNode`
  (`semantic-integration.ts:340-430`) emits `modifiers: { into: #out, manner:
  'before' }` — it hardcodes put's destination to `into` and never reads
  `manner`, so the positional put becomes an INTO plus a `manner` modifier
  `PutCommand` does not read. Same for `after` and `at end of`; plain `into`
  agrees.
  **Latent FOR `put` ONLY — NOT latent in general (upgraded 2026-07-31).** The
  original framing generalized from the one command it measured. `put` does sit
  in `parser.ts`'s `skipSemanticParsing` list (`:3461-3487`), so the live
  English path never reaches the switch for `put`; the canonical non-English
  renderings of a positional put also come back without the `manner` role
  (`translate('put "x" before #out', 'en', ko|ja|es|de)` renders a plain
  put-into), so they do not reach it either. But the list holds only 24 command
  names, and **`default` and `scroll` are not among them** — so for those the
  switch IS the live English path, and it is the blanket
  `destination`→`modifiers.on` mapping (`:378-393`) that runs, not
  `buildGenericCommand` and not the schema descriptor.
  Measured end-to-end through `hyperscript.eval` in jsdom, on `main` at
  `a9025a36`:

  | source (plain English) | default path | `{ traditional: true }` |
  | ---------------------- | ------------ | ----------------------- |
  | `scroll to #header` | throws `scroll command requires a target` | works |
  | `scroll to last <.message/> in #chat` (corpus row) | throws | works |
  | `default :x to 0` | throws `default command requires a value` | throws `Invalid target type: undefined` |
  | `default my @data-count to "0"` (corpus row) | throws | throws `Invalid target type: object` |
  | `open #dlg as non-modal` | opens **modal** (variant lost) | opens modal |

  So the queue's thesis holds harder than the entry claimed: a duplicated
  implementation, silently diverged, held safe by a hand-maintained list — and
  for two commands the list does not in fact hold it safe.
  **Consequence for the descriptor work:** the `scroll`/`default` descriptor fix
  landed on `buildAST`, which is the semantic-bundle/multilingual path. It does
  **not** reach `hyperscript.eval`'s English path, because that path is this
  switch. Option (b) — core delegates to `buildAST` — is therefore no longer
  merely a dedupe: it is what makes those fixes reach users, and it promotes
  this item from cleanup to the highest-value follow-up. (a) is a
  re-divergence by construction; (c) is refuted for `default`/`scroll`.
  Not folded into Arc F: Arc F's gates are semantic-stack, while this is a
  core-side behavior fix dragging the full core gate set. Detail:
  [HANDOFF-command-arch-mappers.md](./HANDOFF-command-arch-mappers.md) § fact 2.

- **`DefaultCommand` EVALUATES its target, so `default` is broken on both
  execution paths.** Independent of the AST-shape defect above, and not fixed by
  it. `commands/data/default.ts` `parseInput` does `target = await
  evaluator.evaluate(raw.args[0])` and then `execute` branches on
  `typeof target === 'string'` — but the target is a *name*, not a value, and
  evaluating an unset variable yields `undefined` (exactly the case `default`
  exists to handle). Measured against DefaultCommand's own documented examples,
  traditional path: `default myVar to "fallback"` → `Invalid target type:
  undefined`; `default @data-theme to "light"` → `Invalid target type: object`;
  `set myVar2 to 1 then default myVar2 to 9` → `Invalid target type: number`.
  Only `default my innerHTML to "No content"` works, and only because the
  possessive path happens to round-trip through a string.
  `SetCommand` shows the correct shape: it resolves the target **symbolically
  from the raw AST node** (`firstArg.name`, then `resolveWriteTarget`) and never
  evaluates it. The existing unit tests miss all of this because they inject a
  mock evaluator that returns `node.value ?? node.name` — i.e. the very
  name-preserving behavior the real evaluator does not have. Any fix should land
  with an end-to-end test through `hyperscript.eval`, not a mocked one.

- **`swap`'s AST builder reads roles its schema never binds.** The builder
  consumes `source`/`style` and emits `on` for destination; `swapSchema`
  declares `method`/`destination`/`patient` and marks destination `of`. So
  `swap innerHTML of #t with <p>` parses `method: innerHTML` and then drops it
  — the strategy never reaches the AST. Arc F step 1 migrated the behavior
  verbatim (a faithful migration must not change output) and pinned both
  divergences as `kind: 'drift'` entries in
  `packages/semantic/test/ast-shape-consistency.test.ts`, which fails if they
  are silently "fixed" or silently widened. The repair is a behavior change and
  wants its own PR with R2/R3 evidence.

- **`command-adapter.ts` declares its own `CommandMetadata`, and the load-bearing
  reader uses it.** `:54-60` defines a loose shape with an
  `[extra: string]: unknown` index signature — which is the only reason
  `impl.metadata?.name` at `:421` typechecks, since the canonical
  `types/command-metadata.ts` interface has **no `name` field**. Narrowing the
  adapter to the canonical type turns `:421` into a type error, and `readonly` vs
  mutable arrays will bite as well. Contained to one file (the shadow type is
  exported but imported by nobody). It is a **behavior** question — that fallback
  is the only path for a V1 command carrying `metadata.name` — so it wants its own
  change rather than a slot inside a refactor. Third instance of the
  dual-type-definition pattern (see also `ASTNode`/`ExpressionMetadata`). Detail:
  [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md) § F-B1.

- **`metadata.isBlocking` / `hasBody` publish false claims for ≥7 commands.**
  Neither field is authored anywhere — every value comes from `@meta`'s (now
  `commandMeta`'s) `?? false` default — and nothing in production reads them. But
  they ARE published: `packages/core/docs/commands/commands.json` carries
  `isBlocking: false`, `hasBody: false`, `version: '1.0.0'` on 40 of its 43
  entries, with **zero variance**. So the shipped docs state that `wait`, `fetch`,
  `settle` and `transition` do not block, and that `if`, `repeat` and `tell` take
  no body. All false.
  Arc B step 3 deliberately PRESERVED the boilerplate rather than fixing or
  deleting it, to keep the migration a refactor (decision recorded in
  [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md)).
  Authoring the two booleans truthfully is ~59 judgment calls with its own review
  surface, and `version` is meaningless per-command — worth its own change.
  Note there may be derivable sources: `COMPOUND_COMMANDS` and the parser's
  `CommandNode.isBlocking` already encode part of this, so check before hand-
  authoring 59 rows. Discovered by Arc B while measuring what should happen to
  `@meta`'s defaults — the queue's "score the rows already there" lesson again.

## Risk register

- `export { X } from './f'` creates **no local binding** — import then export
  when moving registration points.
- tsup multi-entry `splitting: false` **forks singletons** — verify at dist
  level, not just via test-config aliases.
- **Stacked PRs get zero CI** and still report clean — arcs merge sequentially.
- `runtime/command-adapter.ts:440` (aliases from instance metadata) is load-bearing;
  silently dropping it un-registers alias keywords.
- Decorator-installed props are `configurable: false` — never re-decorate a
  migrated class.
- The MCP server serves **stale dist** after rebuilds (Node ESM cache); a tool
  refusing with "serving STALE code" is the guard working — restart, don't
  debug.

## History

- **2026-07-29** — **Arc B step 4b landed, closing the arc.** The command-docs
  generator now covers all **59** commands (was 43), and the gate F-B3 said did
  not exist is `packages/core/src/commands/__tests__/docs-coverage.test.ts`: the
  table must name exactly `COMMAND_NAMES` in the same order, carry no duplicates,
  and match what the runtime registers — asked of the runtime directly, because the
  point of the file is comparing a docs list to the CODE. The sixteen commands that
  had been silently undocumented: `blur`, `breakpoint`, `clear`, `close`, `empty`,
  `focus`, `morph`, `open`, `process`, `push`, `replace`, `reset`, `scroll`,
  `select`, `start`, `swap`.
  - **Both 4a blockers fixed and each now gated**: the generator formats with
    prettier (regeneration is a no-op, not a re-flow) and emits no timestamp
    (`--check` means "content drifted"). `npm run docs:commands{,:check}` added, the
    check joined the existing "Check generated artifacts are in sync" CI step, and
    failure was mutation-verified in both directions.
  - **One planned item was already done, and measuring beat building it.** The plan
    opened 4b with "completeness tests for `reference/index.ts` and
    `lsp-metadata.ts` (cheap)" — **Arc A had already built both** (§2 and §5 of the
    manifest audit, both directions). Rewriting them would have added a second
    place to maintain and no new check; the non-duplication is recorded in the new
    test file instead. That freed effort went into a **prose ratchet** guarding
    what `commandMeta` structurally cannot: `''` is a perfectly good `string`, so
    the type system will never object to an empty description while the generator
    will happily publish it.
- **2026-07-29** — **Arc B step 4a landed**: the dead surface step 3 created is
  deleted. `meta()`, `MetaConfig`, all three module-private symbols,
  `ClassWithSymbols` and the three dead exported getters are gone; `@command`
  reduces to **name-only** (with `meta()` deleted nothing read `COMMAND_CATEGORY`,
  so `CommandConfig.category` would have been a parameter accepted on 52 call
  sites that goes nowhere — worse than duplication, because it reads as
  authoritative); and **`metadataOf()` is deleted with the type doing its job** —
  the docs-generator table now *requires* `readonly metadata: CommandMetadata`, so
  a class without it is **TS2322 at compile time** where it used to be a runtime
  throw. That is the arc's thesis paying off in the exact place that motivated it.
  - **Two findings about the generated artifact, both for 4b.** The generator is
    **not prettier-idempotent** — it emits unpadded markdown tables, so a fresh run
    produced a **252-line diff that was pure column padding** (content verified
    identical; after `prettier --write` the whole diff collapsed to one line). And
    the `Generated:` ISO timestamp is then the *only* remaining difference, so a
    `--check` gate diffing the whole file would fail 100% of the time. 4b must fix
    both or the gate is unusable and regenerations will read as rewrites.
- **2026-07-29** — **Arc B step 3 landed**: all 52 decorated classes migrated to
  `static readonly metadata = commandMeta({…})` + `get metadata()`, `@meta`
  removed from every call site, and `compatibility` populated on all 55 literals.
  **The arc's goal is delivered**: `ToggleCommand.metadata` was `TS2339` and now
  typechecks, with `.category` narrowing to `'dom'`. `@meta`, `MetaConfig`, the
  `COMMAND_METADATA` symbol and `metadataOf()`'s reason for existing are all dead
  — step 4 deletes them, kept separate from the migration diff.
  - **The type system found 18 errors with one cause, invisible before.** The four
    base classes declared `metadata` as a `declare readonly` PROPERTY, and a
    subclass cannot override a property with an accessor (TS2611/TS4114) — nine
    subclasses. The runtime `defineProperty` had simply shadowed the declaration.
    Fixed by `abstract readonly metadata`, which is also the honest declaration.
  - **A shared implementation cannot carry two `compatibility` values.**
    `ConditionalCommand` is registered as both `if` (upstream) and `unless`
    (extension) and both names resolve to the same instance. It carries
    `'standard'`; `unless` is pinned in §9, **derived** from the shared groups
    rather than hand-listed, so a future alias across the tier line fails loudly.
  - **Two gate rows moved deliberately and were left as assertions, not deleted**:
    step 1's "no defaults on the three" is INVERTED (the 52's byte-identity was
    the larger preservation), and `COMPATIBILITY_UNSET` went from the whole
    registry to empty — which step 2's gate forced into the same diff.
  - Registry oracle diff was **exactly the predicted 3 rows**. Slim bundles
    +0.0% (`hyperfixi-hx.js` byte-identical at 19019, headroom intact); full
    bundles +0.1% gzip for the new field.
  - **The verification instrument had the arc's own disease.** The first oracle
    diff said "0 rows changed" and was wrong: it iterated only the BEFORE row's
    keys, so an ADDED field was structurally invisible. Diff the union of both key
    sets. A one-directional check that reads as green — the exact thing this queue
    exists to catch, reproduced in the tool used to catch it.
- **2026-07-29** — **Arc B step 2 landed**: the `compatibility` coupling, as §9 of
  the manifest audit (39 → 44 tests), while the expected state is still "unset on
  all 59" — so the gate is proven before it has values to bless.
  - **A vacuous gate was mutation-verified instead of trusted**, and the three
    outcomes are the design: a **wrong** value trips the projection, a
    **correct** value trips *only* the row-moving allowlist (so step 3 cannot
    populate silently — it must empty `COMPATIBILITY_UNSET` in the same diff),
    and `'experimental'` trips its own guard. Re-partitioning `EXTENSIONS` fires
    §3's existing 51/8 split as well, so the two sections are genuinely coupled.
  - **Key-presence is not the same question as value.** `@meta` assigns
    `compatibility` unconditionally, so 56 commands carry the key holding
    `undefined` while the 3 `commandMeta` classes omit it entirely — a
    `'compatibility' in md` check splits the registry 56/3 and reads as a
    classification when it is an artifact of declaration style. Every §9 check
    asks for the value.
- **2026-07-29** — **Arc B step 1 landed**: `commandMeta()` plus the three
  undecorated classes (`install`, `pseudo-command`, `render`). Per-step detail in
  [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md).
  - **The brief's predicted defects did not exist.** It expected the conversion to
    surface real problems in three literals nothing had ever checked; typecheck was
    clean on the first run. The *unchecked* state was measured and real; the
    *broken* state was an assumption. Worth recording — a failed prediction is
    cheap here and expensive one arc later.
  - **The new gate was mutation-verified rather than assumed**, at the real call
    sites: a bad `category` → TS2820, a nonsense `sideEffects` entry → TS2820, a
    misspelled field → TS2561. And the *runtime* gate too — deleting
    `RenderCommand`'s `get metadata()` fails 3 of the new file's 10 tests.
  - **Two decisions step 3 must not inherit by omission.** `commandMeta` is pure
    identity and fills **no** defaults (so the three classes' `undefined`
    `isBlocking`/`hasBody` did not silently become `false`) — but the 52 decorated
    classes *do* get those defaults from `@meta`, so step 3 has to choose
    deliberately. And `category` belongs **in** the literal, because a static whose
    type omits it cannot serve `metadata.category`, which the audit's §7 reads.
  - Core 7610 → **7620** with every increment a new test and none changed;
    registry oracle **byte-identical**; all ten bundles **+0.0%**.
- **2026-07-29** — **Arc B brief written**
  ([HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md)), arc
  not started. Measured against main `973ee1c5`.
  - **The arc's own premise failed the queue's five-times-paid lesson.** "Score
    the rows already there" applies to motivations too: `@meta(config: MetaConfig)`
    types its parameter, so the 52 decorated literals are **already** checked
    (`TS2561` on a misspelled field, mutation-verified). What is actually broken is
    narrower and different — the **static** is invisible (`TS2339`), and the
    **three undecorated classes** (`install`, `pseudo-command`, `render`) are
    checked by nothing at all (a bogus `category` *and* a bogus `sideEffects` entry
    both accepted). Selling step 1 on "tsc will now reject bad metadata" would have
    built a gate that mostly existed.
  - **The target shape already exists in-tree, three times** — those same three
    classes are written as `static readonly metadata = {…} as const` plus a
    `get metadata()` bridge, which is the proposed end state including the
    mechanism that keeps `command-adapter.ts:440` working. A working reference
    implementation, not a design sketch. Their `as const` is exactly why they are
    unchecked, which is what `commandMeta()` fixes; its signature is verified in
    the brief (`<const T extends MetaInput>` — keeps literal types, catches typos,
    bad categories, and bad side-effects).
  - **Two `CommandMetadata` interfaces**, and the load-bearing reader uses the
    loose one: `command-adapter.ts:54-60` declares its own with an
    `[extra: string]: unknown` index signature, which is the only reason
    `impl.metadata?.name` typechecks — the canonical type has **no `name` field**.
    Narrowing it turns :421 into a type error, and `readonly` vs mutable arrays
    will bite. Contained to one file (exported, imported by nobody). Third
    instance of the dual-type-definition pattern.
  - **`generate-command-docs.ts` is a 21st hand-maintained list: 43 entries
    against a 59-command registry, gated by nothing** — no npm script, no CI
    step, no audit coupling, 16 commands missing. #793 fixed drift of the
    *output* (`commands.json` matches the table); nothing checks the *input*.
    The one instance Arc A did not sweep, because the generator is invisible to
    `verify:reference`.
  - **A named harvest, non-empty as predicted: 16 dead `metadata.examples`
    across 12 commands** — and a *different* set from Arc C's five, because it is
    a different oracle (raw string at parse level vs adapted snippet at
    execution). Splits cleanly into examples authored in syntax the language never
    had (the brace-block `repeat … { … }` in three commands; an `unless` example
    on `if`) and real parser gaps to file (`toggle .loading for 2s`,
    `wait for click or 1s` — both upstream syntax, check the published engine
    first). Also: `increment`/`decrement` examples parse to a `set` node, so a
    future "example reaches its own command" gate must allowlist that row.
  - **`compatibility`'s domain mismatch is decided in the brief**, not left to
    the arc: `upstream → 'standard'`, `extension → 'lokascript-extension'`,
    `'experimental'` kept as an allowlisted third state at size 0, coupled via
    the `TIER_UNCLASSIFIED`-equality trick against the audit's existing
    `EXTENSIONS` set and `TIER_COUNTS`.
- **2026-07-29** — **Arc A CLOSED**, and its recommended follow-on (Finding 13,
  the 14 unreachable capability case labels) closed with it. Both records are in
  [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md); the
  queue rows above are updated to match.
  - **The arc's repeated lesson, which paid five times running: score the rows
    that are already classified, not only the gaps you were sent for.** 4.1
    found 5 of 7 tier entries wrong; 4.2 found 14 of 38 capability rows dead;
    4.3's 58 incumbents came back clean but the sweep found three dead LSP hover
    examples; 4.4's named work was two correct lines while three advertised
    bundle counts beside it were false; Finding 13's fix found `take` broken at
    execution, `morph` throwing ReferenceError, and `trigger` still mis-targeted
    after its alias landed. Same structural cause every time — **a fact pinned
    in one place and advertised in another, with nothing comparing the two.**
  - **Each step must state its ORACLE, and the choice keeps changing the
    answer.** 4.1 asked the published engine, 4.2 the generator, 4.3 the parser,
    4.4 the manifest, Finding 13 **execution** (the first needing a built
    artifact). Escalating 4.2's parse-level check to execution is what exposed
    three defects a parse tree cannot express — including a half-fix the
    parse-level gate would have called green.
  - **A correct-looking effect is not evidence the command ran** (Finding 16).
    Where a fallback can produce the same end state, a check on that end state
    measures the fallback: mutation-testing showed `morph` passing a markup
    assertion with its morphlex import deleted. Assert what a command is *for*.
    This is the third costume of 4.1's `success: true` trap.
- **2026-07-28** — **Arc A brief written**
  ([HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md)), arc
  not started. Five measurements, two of which changed the plan.
  - **The ghost gates do not carry the migration.** `capability-ghosts` and
    `command-tiers` both compute `list.filter(isGhost)` and assert `[]` — they
    catch a list naming a command that doesn't exist and are structurally blind
    to a list *omitting* one that does. Proved by mutation: dropping `'trigger'`
    from `AVAILABLE_COMMANDS` leaves all 31 bundle-generator tests green;
    dropping `'toggle'` from the LSP tiers leaves all 5 tier tests green. (The
    one failure `toggle` does produce comes from a **hardcoded 16-name
    spot-check** in `bundle-generator/validation.test.ts`, not from the ghost
    test.) So Arc A needs an audit-as-gate step the queue's plan never had.
  - **The two "lowest-risk" lists are already wrong**, by **23** (LSP tiers) and
    **12** (template-capabilities) entries against the 59-name registry, plus 6
    in `lsp-metadata.COMMAND_KEYWORDS`. Both files' doc comments claim a
    partition. Migrating them is a classification decision, not a substitution —
    they move to the END of the order, and the four already-agreeing 59-entry
    lists (parser `COMMANDS`, `commands/index`, `reference/index`, the 59 uniform
    registration calls) become the mechanical first targets.
  - **A `factory` field in the manifest defeats tree-shaking** — measured with
    esbuild: a names-only consumer costs **177 B** with a data-only manifest and
    **38,395 B** when the manifest references factories, at four commands. The
    manifest must be data-only; any factory map is a separate module.
  - Two findings outside the arc's own scope, both recorded in the brief:
    `lsp-metadata.COMMAND_KEYWORDS` carries **genuine ghosts** (`pushUrl`,
    `replaceUrl` — neither parses; the engine takes `push url`/`replace url`) in
    a list with no ghost test, recommended as a standalone PR ahead of the arc
    the way `unless` preceded Arc C; and the **eleven synonym aliases**
    (`flip`, `fire`, `goto`, …) parse in hybrid-complete and lite-plus but are
    **rejected by the full parser** — the 7.7 KB bundle has a feature the 310 KB
    one lacks, inverting the documented upgrade path. The #792 pattern a third
    time.
  - Verified as claimed: the 59 registration calls really are perfectly uniform
    (zero non-matching lines), and `verify:reference` really does derive the
    list-publishing bundles' counts — though it reads only 3 files and never
    sees the registration block, `parser-constants`, or any LSP/capability list.
- **2026-07-28** — **Arc C's last open item closed (#808):** settle/transition
  self-assigns removed for upstream parity, while the #806 state was still
  unreleased and the removal therefore free. Command-set rule now uniform
  (`it` iff upstream sets `result`); the send/trigger sibling is recorded above
  as the one deliberate open question.
- **2026-07-28** — **Arc C complete** (#801 → #802 → #803 → #805 → #806, merged
  sequentially into main, full CI matrix on each). The seven-branch
  `unwrapCommandResult` propagation is gone; command self-assignment is the sole
  `it` mechanism, and it runs on every execution path. All 14 known-wrong audit
  rows flipped and the defect list is empty; four commands (`settle`, `pick`,
  `render`, `transition`) converged because the loop had been overwriting a value
  they had already set correctly. **No command was migrated** — the step-2
  decision table predicted that, and it held.
  Two findings worth carrying: (a) the loop wrote `result` as well as `it`, and
  commands write only `it`, so the deletion would have silently broken
  `put result into …` inside handlers — fixed by making `it`/`result` one slot
  resolved through either name (upstream's model) rather than by touching ~20
  commands; (b) `get` is invisible to the immediately-following command
  (`get 42 then put it into #probe` → empty, but works with any command in
  between). Verified pre-existing on main, pinned as a KNOWN DEFECT test, not
  fixed — it wants its own triage.
- **2026-07-28** — **Arc C steps 0 and 1 landed** (#801, #802), and **step 2
  specified** against an upstream-parity pass. Two findings that belong outside
  the arc as well as in it:
  - **`unless` never executes its body.** `control-flow/if.ts` `parseInput`
    gives `unless` an *array* (`raw.args.slice(1)`) where `if` gets the block
    *node* (`raw.args[1]`); `executeCommands` returns any entry without an
    `.execute` method verbatim, which a parsed AST node is, so the body is
    skipped and the node lands in `it` via an `unless`-only self-assign.
    Verified: `unless false then add .ran to #probe end` adds nothing.
    `unless.test.ts` is green because it feeds **mocks carrying `.execute()`** —
    a shape the parser never produces. **A live bug in a shipped, documented
    command**; it wants its own PR, not a slot inside step 2. **FIXED in #805**
    (same day): unless now takes the parser's block node exactly as `if` does,
    the executor fall-throughs that returned bodies unexecuted now execute, and
    the end-to-end describe in `unless.test.ts` is the regression gate. The
    hybrid parser never had the bug (it desugars `unless` to `if not(...)`) —
    the canonical class was the broken copy, the #792 pattern again.
  - **Five commands' own documented `metadata.examples` do not parse** (`async`,
    `default`, `process`, `pseudo-command`, `take`) — found because the step-1
    audit drew its snippets from `metadata.examples` rather than hand-authoring
    them. Skipped in the audit with their error text; candidates for
    [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md).

  Step 2 itself turned out to be nearly empty: fourteen of the fifteen defect
  rows need no per-command change, because their sequence-path value is already
  upstream-correct and step 3's deletion converges them. Table in the brief.
- **2026-07-28** — **Arc C brief written**
  ([HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md)),
  arc not started. Two measurements changed the plan. (a) `it` is set by two
  independent mechanisms, and the queue described only one: commands
  self-assign `context.it` (copied back by the adapter at
  `command-adapter.ts:338`, works on **every** path), while
  `unwrapCommandResult` runs **only** in event-handler bodies and the lazy
  attribute stub — `executeCommandSequenceWithResult` (`runtime-base.ts:824`,
  the `then`-joined path `hyperscript.eval` takes) never unwraps. So `it`
  already **disagrees between execution paths** for 18 of 29 probed commands,
  and for `settle`/`pick` the loop demonstrably *overwrites a correct value the
  command had already set*. All seven sniffing branches were then verified
  redundant — every branch owner also self-assigns. (b) Stubbing
  `unwrapCommandResult` to return `undefined` and running the full core suite
  fails **only its own 4 unit tests**: 7735 pass. The gate isn't merely thin,
  it is absent, which is why step 1's audit has to assert on `it` end-to-end
  through both paths rather than on the function in isolation. The queue's
  "21 distinct output types / ~25 commands" figure was independently
  corroborated, as were both accidental matches (`measure` on `result`+`wasAsync`,
  `default` on `value`+`target`+`targetType`); one new near-miss found —
  `RepeatCommandOutput.lastResult` is optional, so a `repeat` with no body
  result falls through with its whole wrapper.
- **2026-07-28** — **Arc D complete** (#796 → #797 → #798, merged sequentially
  into main; full CI matrix on each, including the ten-signal multilingual
  ratchet). Three rules that existed in two or three places each now have one
  definition: content insertion (`dom-mutation.ts`, put joined append/prepend),
  the writable-target rung ORDER (`write-target.ts`, shared by set and
  append/prepend), and the selector shape rule plus the query contract
  (`target-elements.ts`, shared by the sync and async evaluators, put, and
  append/prepend). Command files net-shrank (put −46, insertion-base −29, set
  −4); the core suite went 7702 → 7738 with **every** increment a new test
  rather than a changed one — 11 rung-order cases, 20 shape/coercion cases, 5
  sync-vs-async wiring cases.
  Two findings worth carrying: (a) the step-2 ladders overlapped **less** than
  the brief's anchors implied — #792 had already shared the attribute and
  property *rungs*, so what was actually duplicated was the ORDER, which is why
  `resolveWriteTarget` takes opt-in rung flags rather than merging the two
  evaluated-value tails; (b) the step-3 "duplicated" element-list coercion was
  **not** duplicated — put filters a mixed array where append/prepend reject it,
  and they detect array-likes differently, both observable. That divergence is
  preserved, documented, tested, and left as the arc's one open decision.
- **2026-07-28** — Queue created, from the append/prepend arc (#792: upstream
  parity, DOM preservation, ru/uk `add` mis-parse; four-implementation
  divergence and the ~30-point registration checklist measured directly) and
  the deferred-cleanups arc (#793: six-month doc-script breakage from
  untypechecked `scripts/`, generated-artifact drift across 24 languages,
  derive-don't-trust `verify:reference`). The Arc C audit figures (seven unwrap
  branches, ~20 fall-through commands, two accidental matches) were verified
  against main `6825d3d9` during the exploration for this document.
- **2026-07-28** — Re-verified against main `e0d01c09` (a read-only pass over
  every line reference and count in this doc). All figures held; two were
  understated and are now corrected. The `runtime.ts` "48 commands" docstrings
  are **six**, not three. The Arc C fall-through set measured by classifying
  every command's declared execute-output type against the seven branches is
  **21 distinct output types** — ~25 commands, since `signal-base` backs
  break/continue/exit and `push-url` backs push-url/replace-url. "~20" is left
  in the prose above as the deliberately round figure; 25 is the number the
  step-1 audit test should expect to catalog. The same pass added Arc C step 0
  and the Arc C↔D `:121` pairing, and qualified Arc C's "gate today" (R2 does
  cover the DOM-visible half of an `it`-propagation change; it just cannot see
  `it` holding a wrapper, since nothing asserts on `it`).
