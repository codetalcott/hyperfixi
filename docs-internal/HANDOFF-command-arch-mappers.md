# HANDOFF — Arc F: schema-driven semantic mappers + the add-command scaffolder

**Status: brief only — no implementation has started.** Written 2026-07-30 from
fresh measurement at `a7005d81` (#773, the 13-major Dependabot bump; #836/#837
beneath it). All numbers below were re-measured this session under the NEW deps,
not inherited. Queue entry: `COMMAND_ARCHITECTURE_NEXT_STEPS.md` § Arc F (:413).
Arcs A–E are closed; F is the last settled arc (order D→C→A→B→E→F).

## Baselines (fresh, this session, at a7005d81 with new node_modules)

| Gate | Result |
| --- | --- |
| `npm run test:multilingual:build-deps` | exit 0 (ordered build, cold tree) |
| `npm run populate --prefix packages/patterns-reference` | 18 statements, done |
| semantic suite (`test:check`) | **6793 passed / 10 skipped / 105 files** (pre-majors note said ~6500) |
| ten-signal ratchet (`--full --bundle browser-priority --regression`) | **GREEN** — "No regression vs baseline" |
| core `test:quick` | not re-run this session; CI's push-build at a7005d81 verified green 2026-07-31. Re-run before the first core-touching step (expect 7702/106/300). |

## The queue's premise, scored (every arc's numbers drifted; F's did too)

| Queue claim | Fresh measurement |
| --- | --- |
| 47 mappers, 1301 lines, `mappers` Map :1216, `registerCommandMapper` :1292 | **Exact** — all four verified by symbol. (The package CLAUDE.md says "46" — that's the drifted one.) |
| ~30 mechanically identical, ~10 real logic, 7 block mappers | **Re-scored: 29 strictly mechanical + 14 coalescing + 4 real logic** (see census). The queue's real-logic list (go, wait, pick, swap, set, put, send, morph) overcounts: set/swap/send are fixed-shape declarative, morph is a coalesce. Only **wait, put, go, pick** actually branch. |
| role→preposition switch in TWO places | **THREE.** Each mapper; core's `semantic-integration.ts` switch (now **:368**, drifted from :386); and `buildGenericCommand`/`roleToModifierKey` in `packages/semantic/src/ast-builder/index.ts:287-341` — a third, cruder copy that 24 schema-backed actions already fall through to. |
| `astModifier` exists nowhere | **Confirmed** — zero hits as a schema field. (Only an unrelated local variable `astModifiers` in `ast-builder/index.ts:423`.) |
| add `astModifier` to RoleSpec | **Premise fails on 14 of 47 mappers.** A per-RoleSpec field cannot express coalescing fallback chains (`destination ?? patient`), arg ORDER (swap's `[patient, source]`), or set's arg/modifier inversion. The descriptor must be **command-level**, not role-level. See Design. |

## Census (all 47 scored individually, this session)

**File:** `packages/semantic/src/ast-builder/command-mappers.ts`. Registered
into one `Map`; `getCommandMapper` is consulted only by
`ASTBuilder.buildCommand` (`ast-builder/index.ts:247`).

**29 strictly mechanical** — fixed role→args + fixed role→modifier key(s),
including empty-arg and multi-arg-ordered shapes:

> toggle, add, remove, set, log, append, prepend, take, trigger, send, on,
> transition, call, return, halt, throw, swap, make, default, js, async, if,
> unless, for, while, continue, init, behavior, install

Notable shapes a descriptor must express: **set** routes destination→args and
patient→`modifiers.to` + scope→`modifiers.on` (the inversion); **swap** orders
args `[patient, source]` and sets two modifiers; **send** maps
patient→`modifiers.detail` (a runtime-contract key, not a preposition).

**14 coalescing** — mechanical PLUS a first-present-of fallback chain:

> show, hide (`destination ?? patient` → args, duration→`with`), increment,
> decrement (`destination ?? patient`, quantity→`by`), get (`source ?? patient`),
> focus, blur, settle, tell (`destination ?? patient`), repeat
> (`quantity ?? patient`), morph (`source ?? destination` → args, patient→`on`),
> clone (`source ?? patient`, destination→`into`), measure (patient→args,
> `destination ?? source`→`of`), fetch (source→args, `style ?? method`→`with`,
> responseType→`as`, patient→`body`, isBlocking)

**4 real logic — keep as custom mappers:**

- **wait** — branches event-vs-duration; event→`modifiers.for` + source→`from` + isBlocking; else duration→args.
- **put** — dynamic preposition from the `manner ?? method` role's literal value (default `into`).
- **go** — injects literal `'back'` / `'url'` args; positional-args-only runtime contract.
- **pick** — variant dispatch (count/regex/range) + range-surface splitting into `rangeStart`/`rangeEnd`/`rangeMode`.

**Block mappers are a non-category.** `ASTBuilder.build` dispatches
`conditional`/`loop`/`compound`/`event-handler`/`behavior`/`def`/`feature` node
kinds to their own builders (`index.ts:156-175`) — bodies NEVER route through
command mappers. The if/unless/repeat/for/while/continue/init mappers only fire
for degenerate bare-command parses. Migrating them is low-risk.

**isBlocking flags:** wait, fetch, settle (and the `set` of `createCommandNode`
options). The descriptor needs a boolean for this.

## Facts the queue didn't know

1. **71 schemas = 71 ActionType members** (exact match, both counted this
   session). Mappers cover 47; the other **24 actions fall through to
   `buildGenericCommand`**: beep, bind, break, breakpoint, clear, close,
   compound, copy, else, empty, eventsource, exit, intercept, live, open,
   process, push, render, replace, reset, scroll, select, socket, worker.
   Its blanket mapping (destination→`on`, duration→`for`, method→`via`,
   condition→`if`) is wrong for several (e.g. any command whose destination
   reads `to`/`into`). Replacing THIS fallback with the schema-driven generic
   mapper is the arc's structural win — but changing the 24's output is a
   **behavior change**, so it's staged separately from the byte-parity migration
   (step 4 below).

2. **Two live semantic→AST paths, different logic.** (a) Core's compile path:
   `SemanticIntegrationAdapter.parseWithSemantics` flattens single-command
   parses to `{name, roles}` and runs the `buildCommandNode` switch
   (`semantic-integration.ts:340-430` + dedicated builders for
   set/repeat/for/if/unless). Multi-command kinds are deliberately dropped to
   the traditional parser (`createSemanticAdapter`, :946). (b) The semantic
   package's `buildAST` (browser bundles, public-api, testing-framework) runs
   the 47 mappers. **Same input can build different ASTs per path.** Measured
   likely divergence: core's switch hardcodes put's destination→`into` and
   doesn't read `manner`, so `put X before Y` through the core path likely
   builds a put-INTO — the exact latent bug the putMapper comment records
   having fixed on the other path. **Write the failing test first** when you
   get to step 5; don't assume.

3. **Schema roles and mapper reads have drifted.** show's schema declares
   `patient`+`style`; showMapper reads `destination`/`patient`/`duration`
   (never `style`). toggle's schema lacks `duration`; toggleMapper reads it
   (→`for`). The parser can emit roles the schema never declared
   (normalizeCommandRoles relabels, reclaims). Therefore the generic mapper
   must consume the DESCRIPTOR's role list, not `schema.roles`, and each
   command's migration must reconcile the two sets explicitly. Do not "clean
   up" the schema role lists mid-migration — that changes pattern generation
   for 24 languages.

4. **The modifier key is (mostly) the en surface marker.** en profile defaults:
   destination→`on`, source→`from`, style→`with`, responseType→`as`,
   method→`via`; `markerOverride.en` covers the rest (send destination `to`;
   put `into` + variants `before`/`after` already schema-encoded via
   `methodCarrier`). Exceptions are runtime-contract keys that were never
   prepositions: send's `detail`, fetch's `body`, pick's
   `variant`/`count`/`regex`/`range*`. This is why the descriptor should be
   **authored explicitly but gate-checked against the marker data** (see
   Design) — derive-don't-trust, in gate form.

5. **Test coverage before migration: 19 of 47 mappers have direct unit
   describes** (`test/command-mappers.test.ts`, 34 tests: toggle, add, remove,
   set, show, hide, increment, decrement, wait, log, put, fetch, trigger,
   send, go, transition, halt, throw, return + registry). `ast-builder.test.ts`
   (68 tests) and the corpus cover the rest indirectly. The parity harness
   (step 1) is the real migration oracle, not the existing suite.

6. **`registerCommandMapper` is public API** — exported through semantic's
   index/browser bundles and declared in
   `packages/types-browser/src/semantic-api.ts:166`. Keep name and signature.
   No external callers found in the monorepo.

## Design

### Descriptor: command-level `ast` on CommandSchema (not RoleSpec.astModifier)

```ts
/** In command-schemas.ts — co-located with the schema it describes. */
export interface AstShape {
  /** Roles routed to args, in order. An inner array is a first-present-of chain. */
  readonly args?: ReadonlyArray<SemanticRole | ReadonlyArray<SemanticRole>>;
  /** Modifier key → role (or first-present-of chain). Keys are the AST contract. */
  readonly modifiers?: Readonly<Record<string, SemanticRole | ReadonlyArray<SemanticRole>>>;
  readonly isBlocking?: boolean;
}
```

- Expresses all 43 migratable mappers: chains cover the 14 coalescers; array
  order covers swap; set's inversion is just `{ args: ['destination'], modifiers: { to: 'patient', on: 'scope' } }`.
- Generic mapper: one function reading `AstShape`, built on the existing
  `createCommandNode`/`convertRoleValue` helpers so output is byte-identical.
- Resolution order in `buildCommand`: explicit mapper (Map) → schema `ast`
  descriptor → `buildGenericCommand` (unchanged legacy fallback). After step 4
  the legacy fallback should be dead code for every schema-backed action;
  delete it or leave it as the unknown-action safety net (recommend: keep,
  it's 50 lines, but add a comment that no shipped action reaches it).
- `registerCommandMapper` stays the override, unchanged.
- **Consistency gate** (new test in `schema-consistency.test.ts` style): for
  every descriptor modifier key, assert key === the role's en marker
  (`markerOverride.en ?? en profile roleMarkers[role].primary`) unless the
  (command, role) pair is in a small named exemption map (send.detail,
  fetch.body, pick.*, …). This pins the "modifier = en preposition" invariant
  so marker fixes and descriptor edits can't drift apart silently.
  **Mutation-verify this gate** (change one descriptor key, confirm it fails
  THAT command only) — E's lesson, twice-earned.

### Why not RoleSpec.astModifier (the queue's shape)

Scored and rejected: role-level fields can't express coalescing (14/47),
arg order (swap), or arg-vs-modifier routing per command (set). It would also
scatter one command's AST contract across its role entries instead of stating
it in one place. The queue's own instinct ("It is data") survives; the data's
shape moves up one level.

## Plan

Branch per step off main (`git checkout -b <name> main`), one PR each, merged
sequentially — never stacked (zero-CI trap). `git branch --show-current`
before starting AND before committing.

**Step 1 — descriptor + generic mapper + parity harness (no behavior change).**
Add `AstShape`, the generic mapper, the resolution hook, the consistency gate,
and a **parity test**: for each command to be migrated, build synthetic
`CommandSemanticNode`s covering every role subset the old mapper reads
(present/absent per role, both members of each chain), and assert
old-mapper output deep-equals descriptor output. Pilot-migrate ~5 commands
spanning the shapes (add, set, swap, show, fetch). The old mapper functions
move into the parity test as fixtures when their Map entry is deleted.
Gates: semantic suite, ratchet, R2.

**Step 2 — migrate the remaining mechanical 24 (29 − 5 pilots).** Pure
deletion + descriptor authoring, parity-tested. Gates: same.

**Step 3 — migrate the remaining coalescers.** Same method. After this the
Map holds exactly wait, put, go, pick (+ the interface/registry plumbing);
`command-mappers.ts` should shrink from 1301 lines to roughly the 4 custom
mappers + helpers.

**Step 4 — descriptors for (some of) the 24 fallback actions.** This is an
**intentional behavior change** per action (fixing the blanket `on`/`for`
guesses), so: pick the actions with real corpus presence first (scroll, bind,
live, copy…), run the ratchet expecting movement, and if fidelity IMPROVES
regenerate the baseline (`--save-baseline` against a fresh populate; commit
baseline, never patterns.db). Actions with no corpus coverage can wait.

**Step 5 (recommend: file as its own change, not in-arc) — core switch dedupe.**
`semantic-integration.ts`'s `buildCommandNode` switch + its set/repeat/if
builders are core-side duplicates operating on core-local types. First write
the put-before divergence test (fact 2); if confirmed, either port descriptor
reading into core (couples core to semantic's schema module — check the
dependency direction builds clean) or fix the switch's put/manner case
minimally and file the dedupe. Core gates apply: test:quick, verify:reference,
typecheck + typecheck:scripts, docs:commands:check, generate:bundles:check,
snapshot:bundle-size --check, test:check, language-server, Playwright
src/compatibility/ if dist moves.

**Step 6 — the add-command scaffolder.** Sibling of
`packages/semantic/scripts/add-language.ts` (1203 lines; its proven shape:
parseArgs → per-file string templates → index-updater functions; add
`--dry-run`). The step list is EMPIRICAL: derive it from #792's 43-file
footprint (`git show 166ce7bb --stat`) minus surfaces Arc E made generated
(parser-templates.ts, hybrid-complete executor switches — the scaffolder
instead RUNS `npm run generate:bundles`) plus the steps #792 measured as
missable: `metadata.ts` counts (the one the checklist lost), reference/LSP
entries, `COMMANDS` set, bundle template-capabilities, semantic
schema + ActionType + `AstShape` + per-language profile keyword TODOs, tests.
The scaffolder ENDS by printing the residual manual checklist (schema roles,
24-language keywords, docs) — the checklist becomes a tool, but the tool also
carries the checklist. Verify each generated stub against the gates that
police it (verify:reference, docs:commands:check, check:test-list) by
scaffolding a throwaway command in a worktree and running them.

## Traps (carry-forward + new)

- **Positions**: semantic RoleSpec sorts ASCENDING; i18n/framework profiles
  sort DESCENDING. Descriptor `args` order is its own explicit list — do not
  derive it from svoPosition.
- **`semanticRoles` attachment** happens in `buildCommand` AFTER the mapper
  returns (`index.ts:270-278`) — descriptor output must not duplicate it.
- Don't commit a regenerated `patterns.db`; populate before any gate; the
  multilingual CLI refuses stale dists — that refusal is the guard working.
- MCP tools refusing "serving STALE code" after rebuilds = restart the server.
- `export { X } from './f'` creates no local binding (registry moves).
- tsup `splitting: false` forks singletons — verify at dist level if entry
  points change.
- Capture exit status before any pipe; mutation-verify behavior, not comments.

## Open decisions for the owner

1. **Descriptor location**: on `CommandSchema` (recommended — one source file,
   the consistency gate lives beside `schema-consistency.test.ts`) vs a
   standalone table in `command-mappers.ts`. Recommendation: CommandSchema
   field, optional (`ast?: AstShape`), so schema-less descriptors are
   impossible and the 24 fallback actions are visibly descriptor-less.
2. **Step 4 scope**: which of the 24 fallback actions get descriptors now.
   Recommendation: only corpus-present ones, measured by the ratchet run.
3. **Step 5 placement**: in-arc or filed. Recommendation: file it; Arc F's
   gates are semantic-stack, and the core switch drags in the full core gate
   set for what is really its own divergence-bug fix.
