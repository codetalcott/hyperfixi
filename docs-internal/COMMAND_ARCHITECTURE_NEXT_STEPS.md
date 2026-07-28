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
undercounting — those are left alone deliberately, because Arc A makes the
number derived rather than re-typed.

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
| C — output contract | **~20 live `it` divergences, *plus* `it` disagreeing between execution paths** | **none, and measurably so** — disabling the mechanism fails only its own 4 unit tests | [HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md) — **revises the plan below** |
| A — command manifest | kills ~15 of ~30 registration points | ✅ partial: verify:reference, capability-ghosts, command-tiers, bundle-manifest-consistency | gates carry the migration; manifest replaces the lists they guard |
| B — metadata single-sourcing | types see metadata; docs generated | ✅ partial: typecheck:scripts, metadataOf() throws | decorator statics invisible to TS remain the root cause |
| E — generated static bundles | 4 executors → 1 template source | ✅ partial: bundle-size ±5% + ceilings, compat matrix, parser-template drift test | drift test becomes a generator |
| F — schema-driven mappers | ~30 of 47 mappers deleted | ✅ semantic suite + ten-signal ratchet + R2 | mapper/`semantic-integration` switch duplication is data |

## The arcs — remaining sequence C → A → B → E → F (D is done)

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

### Arc C — command output contract (medium-large; highest correctness value; start here)

The wrapper-`it` class is ~20 live divergences, not a latent risk — hence ranked
ahead of the manifest.

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

### Arc A — command manifest (medium)

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

### Arc B — metadata single-sourcing (medium; verified mechanical)

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

### Arc F — semantic schema-driven mappers + scaffolder (medium)

Verified: 47 mappers in `packages/semantic/src/ast-builder/command-mappers.ts`;
~30 are mechanically identical (patient→args plus one role→modifier rename); ~10
carry real logic (go's `'back'` literal, wait's event/duration branch,
pick/swap/set/put/send/morph) plus 7 block mappers — all 47 in that one file,
registered into a single `mappers` Map. The role→preposition mapping already
exists as switches in **two** places, and the second one is **not** in this
package: each mapper, and `packages/core/src/parser/semantic-integration.ts:386`.
It is data. Add `astModifier` to `RoleSpec`, implement one generic schema-driven
mapper as the fallback, keep `registerCommandMapper` as the override, migrate
the ~30, keep the rest. Then an `add-command` scaffolder (sibling of
`packages/semantic/scripts/add-language.ts`) that stubs the core file,
registrations, schema, profile-entry TODOs, and tests — #792 proved that even a
perfect checklist gets one step missed; the checklist becomes a tool. Gates: the
semantic suite, the multilingual ten-signal ratchet, R2.

## Non-goals — keep these

The command **factory pattern** (tree-shaking works), the **decorator runtime
behavior** (only its type-invisibility is in scope, Arc B), the
**CommandNodeBuilder**, the **`MULTI_WORD_PATTERNS` table** (adding prepend was
one line), the **schema→pattern-generator pipeline** (`omitRoleVariants` solved
in one line what a schema flip would have broken across 24 languages), and the
curated-behaviors philosophy. Each proved itself under pressure in the very
session that produced this queue. The problem is the hand-maintained periphery,
not the core abstractions.

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
    command**; it wants its own PR, not a slot inside step 2.
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
