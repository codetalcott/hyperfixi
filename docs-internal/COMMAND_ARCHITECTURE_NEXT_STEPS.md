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
this doc), and `runtime/runtime.ts` still says "48 commands" in three places
with several per-category group comments undercounting — those are left alone
deliberately, because Arc A makes the number derived rather than re-typed.

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
| D — target-resolution consolidation | S effort, pure refactor | ✅ suites + R2 execution subset | proven model: `attribute-target.ts` / `property-target.ts` extractions from #792 |
| C — output contract | **~20 live `it` divergences** | **none** — only 6 positive unwrap cases tested | the ungated one; it is what this document is for |
| A — command manifest | kills ~15 of ~30 registration points | ✅ partial: verify:reference, capability-ghosts, command-tiers, bundle-manifest-consistency | gates carry the migration; manifest replaces the lists they guard |
| B — metadata single-sourcing | types see metadata; docs generated | ✅ partial: typecheck:scripts, metadataOf() throws | decorator statics invisible to TS remain the root cause |
| E — generated static bundles | 4 executors → 1 template source | ✅ partial: bundle-size ±5% + ceilings, compat matrix, parser-template drift test | drift test becomes a generator |
| F — schema-driven mappers | ~30 of 47 mappers deleted | ✅ semantic suite + ten-signal ratchet + R2 | mapper/`semantic-integration` switch duplication is data |

## The arcs — recommended sequence D → C → A → B → E → F

### Arc D — target-resolution consolidation (small; start here)

Pure refactor, no behavior change, and the model is already proven (#792
extracted `commands/helpers/attribute-target.ts` and reused
`property-target.ts`; both now shared by set/append/prepend).

1. Collapse `put.ts`'s private `insertContent` (:275-311) onto
   `commands/helpers/dom-mutation.ts` — `insertContentSemantic` exists precisely
   for this and is already the append/prepend insertion path
   (`content/insertion-base.ts`), so put is the last hand-rolled copy. Deferred
   from #792. Gate: put suite + the R2 execution subset.
2. Extract set's writable-target ladder (`set.ts` parseInput :75-229 +
   `tryParseMemberExpression`) into `commands/helpers/write-target.ts` returning
   a discriminated union; consume from set and `insertion-base.ts`. Gate:
   set/append/prepend suites + Playwright `test-multiword-commands.spec.ts`
   (the element-scoped `:greeting` case).
3. Put the selector-shape asymmetry (`#id`→element, `.cls`→array — the root
   cause of append's pre-#792 silent `.cls` no-op) behind one documented
   `resolveTargetElements()` API. Contained: `evaluateSelectorSync`
   (`parser/runtime.ts:441`) has exactly one caller (:337) and is unexported,
   but it mirrors async `evaluateSelector` — migrate the pair together. Gate:
   new unit tests pinning both shapes.

### Arc C — command output contract (medium-large; highest correctness value)

The wrapper-`it` class is ~20 live divergences, not a latent risk — hence ranked
ahead of the manifest.

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
   with an event-handler `it` assertion (the #792 test shape) — **each one is a
   deliberate behavior change to `it`**, which is why the arc is sequenced in
   small PRs.
3. Delete the sniffing branches last, and decide the :121 array policy
   deliberately rather than by inheritance.

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
dead); the only live instance-side readers are `command-adapter.ts:421` (name
fallback) and **:440 — the aliases read, which is load-bearing: dropping it
silently un-registers alias keywords** — plus a cosmetic projection (:212-221)
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

Verified: 47 mappers in `ast-builder/command-mappers.ts`; ~30 are mechanically
identical (patient→args plus one role→modifier rename); ~10 carry real logic
(go's `'back'` literal, wait's event/duration branch, pick/swap/set/put/send/
morph) plus 7 block mappers. The role→preposition mapping already exists as
switches in **two** places (each mapper, and `semantic-integration.ts:386`) —
it is data. Add `astModifier` to `RoleSpec`, implement one generic schema-driven
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
- `command-adapter.ts:440` (aliases from instance metadata) is load-bearing;
  silently dropping it un-registers alias keywords.
- Decorator-installed props are `configurable: false` — never re-decorate a
  migrated class.
- The MCP server serves **stale dist** after rebuilds (Node ESM cache); a tool
  refusing with "serving STALE code" is the guard working — restart, don't
  debug.

## History

- **2026-07-28** — Queue created, from the append/prepend arc (#792: upstream
  parity, DOM preservation, ru/uk `add` mis-parse; four-implementation
  divergence and the ~30-point registration checklist measured directly) and
  the deferred-cleanups arc (#793: six-month doc-script breakage from
  untypechecked `scripts/`, generated-artifact drift across 24 languages,
  derive-don't-trust `verify:reference`). The Arc C audit figures (seven unwrap
  branches, ~20 fall-through commands, two accidental matches) were verified
  against main `6825d3d9` during the exploration for this document.
