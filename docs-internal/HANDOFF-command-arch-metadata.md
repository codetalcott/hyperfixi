# Handoff: Arc B — metadata single-sourcing

> **Status: brief written 2026-07-29, arc NOT started.** Every figure below was
> measured against main `973ee1c5` for this document; nothing is inherited from
> the queue paragraph. Companion to
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> § Arc B, which stays pointer-only. Prior art for the decorator toolchain:
> [HANDOFF_vitest-oxc-decorators.md](./HANDOFF_vitest-oxc-decorators.md).
>
> **Read § "The premise, corrected" before writing any code.** The arc's stated
> motivation — "tsc rejecting a mis-shaped metadata literal is the point" — is
> **already true for 52 of 55 implementations**, mutation-verified. The arc still
> has real value, but it is not the value the queue paragraph claims, and
> mis-stating it would send step 1 after a gate that already exists.

## The two oracles, settled up front

Neither is a parse. State them in every step's PR body.

**Oracle 1 — the type system.** `tsc --noEmit -p packages/core/tsconfig.json`.
Mutation-verified in both directions (§ "The premise, corrected"), so the arc
knows exactly which mis-shapes it newly catches and which were already caught.

**Oracle 2 — the registry oracle**, for behavior preservation. A dump of every
fact the decorator statics feed into registration: registered names, constructor
identity, name source (own vs prototype), instance-vs-static metadata presence,
category, aliases, compatibility, `isBlocking`/`hasBody`, syntax shape/count,
example count, adapter name, shared-implementation groups, and alias→instance
identity. **Diff the JSON before and after each step.** Script and baseline in
§ "Oracle 2: the registry oracle".

Finding 16's rule carries verbatim: a green suite is not evidence the statics
moved correctly. 52 of 55 implementations are reached only through
`impl.metadata`, and the suite passes with that read intact but wrong.

## The premise, corrected

Four mutation probes, run against main `973ee1c5` (temporary file under
`packages/core/src/`, `npx tsc --noEmit -p tsconfig.json`, reverted after):

| Probe | Expectation from the queue paragraph | Measured |
| --- | --- | --- |
| Read a decorated class's static: `ToggleCommand.metadata.description` | invisible | **`TS2339: Property 'metadata' does not exist on type 'typeof ToggleCommand'`** — confirmed |
| Typo a field inside `@meta({ descriptionn: … })` | silently accepted | **`TS2561: … 'descriptionn' does not exist in type 'MetaConfig'`** — **already caught** |
| Read an undecorated class's static: `InstallCommand.metadata.description` | n/a | **no error** — it is a real class field |
| Bogus `category` **and** bogus `sideEffects` in an undecorated `static readonly metadata = {…} as const` | n/a | **no error at all** — completely unchecked |

So the honest statement of what Arc B buys:

1. **The static becomes visible.** `@meta` installs it with
   `Object.defineProperty`, and a class decorator that returns the original class
   cannot widen its type — the root cause, already written down verbatim in
   `scripts/generate-command-docs.ts:84-93`. This is why `metadataOf()` exists and
   why `scripts/` typechecking stayed off for six months. **This is the real prize.**
2. **The three undecorated classes get checked for the first time.**
   `install`, `pseudo-command`, `render` use a bare
   `static readonly metadata = {…} as const` with **no contextual type**, so an
   invalid category and a nonsense side-effect are both accepted today (probe 4).
   These three are the only rows where "tsc rejects a mis-shaped literal" is a
   *new* gate.
3. **The 48 `declare readonly metadata: CommandMetadata` assertions stop being
   lies.** `declare` asserts a shape the compiler never verifies; the decorator
   fills it at runtime. Visible-but-unverified is not the same as checked.

What Arc B does **not** buy: type-checking of the 52 decorated literals.
`meta(config: MetaConfig)` types its parameter, so object-literal freshness
already catches typos and bad enum values there. Do not sell step 1 on that.

This is the arc's own premise failing the lesson the queue records five times
over — **score the rows already there**. It is recorded here rather than quietly
fixed because the next arc will be tempted by the same shortcut.

## The target shape already exists in-tree, three times

`install.ts:66-99`, `pseudo-command.ts:63-90`, `render.ts:61-88` are **not**
decorated. Each is already written in the end-state shape the arc proposes,
*including the instance bridge that keeps `command-adapter.ts:440` working*:

```ts
export class InstallCommand {
  readonly name = 'install';                    // own property, not prototype
  static readonly metadata = { … } as const;    // the static, type-VISIBLE
  get metadata() { return InstallCommand.metadata; }   // the instance bridge
}
```

This is a working reference implementation, not a design sketch. Two things to
take from it:

- **The instance bridge is a `get metadata()` returning the static.** The queue
  offered "instance field/getter, or point both adapter sites at
  `impl.constructor.metadata`". The getter is already proven in-tree on 3 of 59
  registered commands, needs no adapter change, and is what makes hybrid
  migration states safe. **Prefer it.** Re-pointing the adapter is a second,
  optional change that should not ride along with the mechanical migration.
- **`as const` is the wrong half of the job** and is precisely why these three
  are unchecked. It preserves literal types and validates nothing.
  `commandMeta()` must do both.

### `commandMeta()` — signature verified

`commandMeta()` does not exist yet; Arc B creates it. This signature was probed
against the real `CommandMetadata` and does everything required:

```ts
type MetaInput = Omit<CommandMetadata, 'version'> & { version?: string };

export function commandMeta<const T extends MetaInput>(m: T): T {
  return m;
}
```

Measured behaviour (same probe run, all four cases in one file):

| Case | Result |
| --- | --- |
| Valid literal, then `const x: 'a' = ok.syntax[0]` | **no error** — `const T` preserves literal types, so nothing `as const` gave up is lost |
| `descriptionn:` typo | `TS2561` ✓ |
| `category: 'not-a-category'` | `TS2322: not assignable to type 'CommandCategory'` ✓ |
| `sideEffects: ['nonsense']` | `TS2322: not assignable to type 'CommandSideEffect'` ✓ |

The `const` type parameter is load-bearing: without it the literal widens to
`string[]` and the arc trades checking for inference instead of getting both.

## Census — measured, not inherited

| Fact | Value |
| --- | --- |
| Registered command names | **59** |
| Distinct implementation classes | **55** |
| — decorated (`@command` + `@meta`) | **52** |
| — undecorated (`static readonly metadata`) | **3** (install, pseudo-command, render) |
| Shared-implementation groups | **4** |
| Alias keywords from `metadata.aliases` | **4** (`unless`, `trigger`, `replace`, `decrement`) |
| `name` from prototype (`@command` defineProperty) | 56 rows |
| `name` from an own property | 3 rows (the undecorated classes) |
| Rows with `metadata.compatibility` set | **0 of 59** |
| Files declaring `declare readonly metadata` | 48 |
| Files declaring `declare readonly name` | 48 |
| Total `metadata.examples` strings across 59 rows | **202** |

Counting note: `grep -rl '@command('` returns 53 files, two of which are false
positives — `validation/command-pattern-validator.ts` and
`commands/decorators/index.ts` both mention the decorators in **docstrings**.
Match `^@command(` at line start, or count constructors from the registry.

The four shared-implementation groups:

| Class | Registered as |
| --- | --- |
| `ConditionalCommand` | `if`, `unless` |
| `EventDispatchCommand` | `send`, `trigger` |
| `HistoryCommand` | `push`, `replace` |
| `NumericModifyCommand` | `decrement`, `increment` |

## Anchors — re-verified 2026-07-29, by symbol

`packages/core/src/commands/decorators/index.ts`:

| Symbol | Line | What it does |
| --- | --- | --- |
| `COMMAND_NAME` / `COMMAND_CATEGORY` / `COMMAND_METADATA` | 65-67 | module-private symbols; **zero external readers** (re-verified) |
| `defineProperty(target.prototype, 'name', …)` | 114 | prototype `name`, `writable: false` |
| `defineProperty(target, 'metadata', …)` | 184 | the static, `configurable: false` |
| `defineProperty(target.prototype, 'metadata', {get})` | 192 | the instance getter, `configurable: false` |
| `getCommandName` / `getCommandCategory` / `getCommandMetadata` | 212 / 222 / 232 | **dead exported getters** — re-verified zero readers repo-wide |

`packages/core/src/runtime/command-adapter.ts`:

| Line | Read | Status |
| --- | --- | --- |
| 212 | `this.impl.metadata?.name` | name fallback, cosmetic getter |
| 217-220 | `syntax` / `description` / `examples` | the cosmetic projection |
| **421** | `impl.name \|\| impl.metadata?.name` | name fallback at registration |
| **440** | `impl.metadata?.aliases` | **LOAD-BEARING** — dropping it silently un-registers `unless`, `trigger`, `replace`, `decrement` |

`compatibility?` is declared at `types/command-metadata.ts:305`, unset on all 59.

## New findings this measurement produced

### F-B1 — there are TWO `CommandMetadata` interfaces, and the load-bearing reader uses the loose one

> **CLOSED 2026-08-01. Read the correction below before acting on anything in
> this section.** The experiment this section asks for was run (swap the shadow
> type for the canonical one, typecheck) and it falsifies three of the four
> claims:
>
> - **`:421` does not error.** Its signature is `register(impl: any)` — the
>   parameter's `any`, not the index signature, is what defeats checking there.
>   The erroring sites are `:207` and `:211`.
> - **Not contained to one file.** 7 of the 9 errors are in
>   `registry/examples/server-commands.ts` + `registry/multilingual/examples.ts`
>   (`category: 'server'`, absent from the canonical union) — i.e. it drags in
>   F-B2, which is deliberately pinned.
> - **The behavior question is vacuous in-tree.** All 55 command classes carry a
>   top-level `name`, so the `metadata.name` fallback is dead for everything
>   that ships (it is exercised only by `runtime.test.ts`'s third-party-shape
>   test).
>
> What the experiment DID find is larger and is filed fresh in
> COMMAND_ARCHITECTURE_NEXT_STEPS.md: `CommandWithParseInput` declares
> `validate?(): ValidationResult<unknown>` while all 59 commands implement a
> boolean type guard, and `register(impl: any)` + `COMMAND_FACTORIES: () => unknown`
> are what hide it. Latent (nothing calls `validateCommand()`), owner decision.

`command-adapter.ts:54-60` declares its **own** `CommandMetadata`:

```ts
export interface CommandMetadata {
  description?: string;
  examples?: string[];          // MUTABLE — the real one is readonly
  syntax?: string | string[];   // MUTABLE
  aliases?: string[];           // MUTABLE
  [extra: string]: unknown;     // <- swallows everything
}
```

Consequences the arc must plan around:

- **`impl.metadata?.name` typechecks only because of the index signature.** The
  real `CommandMetadata` has **no `name` field** (checked). So :421's fallback
  reads a property the canonical type does not declare — and narrowing the
  adapter to the real type turns that line into a type error. That is the type
  system biting correctly; decide whether the fallback survives (it is the only
  path for a V1 command carrying `metadata.name`) before the compiler forces it.
- **`readonly` vs mutable will bite.** The canonical type's arrays are `readonly`;
  the adapter's are not. `readonly string[]` is not assignable to `string[]`.
- The adapter's copy is **exported but imported by nobody** (verified), so
  narrowing it is contained to one file — no cross-package ripple.

This is a third instance of the dual-type-definition pattern already recorded for
`ASTNode`/`ExpressionMetadata`. Do not attempt a global consolidation inside Arc
B; note it and keep the blast radius at one file.

### F-B2 — a third `CommandCategory` union

The manifest audit already pins two (`types/command-metadata.ts` vs
`reference/index.ts`, differing on `'event'`/`'events'` and `'storage'` —
`command-manifest-audit.test.ts:815-826`). Relevant to Arc B because
`commandMeta()` forces a choice of which union the literals are checked against.
**Use the `types/command-metadata.ts` union** — it is what the decorator and
registry already serve, and what the manifest mirrors. Do not reconcile the
unions here; that is a rename with LSP and docs reach, deliberately pinned.

### F-B3 — `generate-command-docs.ts` is a 21st hand-maintained list, 16 short, gated by nothing

The prose half of the arc is in worse shape than the queue says.

| Fact | Value |
| --- | --- |
| Entries in the generator's `COMMANDS` table | **43** |
| Registered commands missing from it | **16** |
| Ghosts in it | 0 |
| `commands.json` entries | 43 — in sync with the generator |
| npm script that runs it | **none** |
| CI step that runs or `--check`s it | **none** |
| Manifest-audit coupling | **none** |

The 16 missing: `blur`, `breakpoint`, `clear`, `close`, `empty`, `focus`,
`morph`, `open`, `process`, `push`, `replace`, `reset`, `scroll`, `select`,
`start`, `swap`.

Precise statement of the defect: #793 fixed **drift of the output** (`commands.json`
was regenerated and matches the table), but nothing checks the **input**. So
`docs/commands/commands.json` documents 43 of 59 commands and always will. This
is the exact shape the queue's opening paragraph describes — *a list that
describes code, that nothing compares to the code* — and it is the one instance
Arc A did not sweep, because the generator is invisible to `verify:reference`.

Because the entries are `{ name, class }` pairs, making the static type-visible
is what lets this table be **replaced by the manifest plus a factory map** rather
than re-typed. Sequence it accordingly (step 4).

### F-B4 — the harvest: 16 dead `metadata.examples` across 12 commands

Probed all 202 example strings against the real parser, asserting **at least one
real command node** — `success: true` is not evidence (4.1 / 4.3 / Finding 14;
reuse `commandNodesIn()` from `command-manifest-audit.test.ts:626`).

**16 examples reach no command node, across 12 commands.** This is a
*different* set from the five Arc C recorded, because it is a *different oracle*:
Arc C adapted each snippet to a fixture and ran it to **execution**; this probes
the **raw example string** at parse level. Only `process` and `pseudo-command`
appear in both. Arc C's other three (`async`, `default`, `take`) parse cleanly
standalone — their failures are execution-level only.

| Command | Dead example | Parser says |
| --- | --- | --- |
| `pseudo-command` | all 4 (`foo() on me`, `setAttribute("foo","bar") on me`, `reload() the location of the window`, `getElementById("d1") from the document`) | `Unexpected token: on/the/from (missing operator between values?)` |
| `repeat` | both (`repeat for item in items { log item }`, `repeat 5 times { log "hello" }`) | `Expected "end" to close repeat block` |
| `break` | `repeat for item in items { if item == target then break }` | same |
| `continue` | `repeat for item in items { if item.skip then continue; process item }` | same |
| `if` | `unless user.isLoggedIn showLoginForm` | `Expected command after if condition in single-line form` |
| `unless` | same string (shared `ConditionalCommand`) | same |
| `toggle` | `toggle .loading for 2s` | `Expected variable name after "for"` |
| `wait` | `wait for click or 1s` | `Expected event name after "for"` |
| `settle` | `settle for 3000` | `Expected variable name after "for"` |
| `tell` | `tell closest <form/> submit` | `tell command requires at least one command after the target` |
| `start` | `start view transition using "slide" then put result into #panel end` | `Expected "end" to close repeat block` |
| `process` | `process partials in it using view transition` | `Transition command requires a CSS property` |

### F-B4a — the harvest, triaged against the upstream engine

The split was **not** left for the arc. All 16 were run on the real
`hyperscript.org` engine (`node_modules/hyperscript.org/dist/_hyperscript.esm.js`
via `hs.parse(src).errors`, the loader at
`packages/testing-framework/src/multilingual/canonical-validity.ts:70-82`) —
4.1's oracle, and the only one that can tell a bad example from a missing
feature. Candidate corrected forms were then re-probed against hyperfixi's own
parser. Both result sets are below, so step 3 has concrete edits rather than a
triage task.

**Real parser gaps — upstream ACCEPTS, hyperfixi rejects. File, do not fix here.**

| Example | Upstream | hyperfixi |
| --- | --- | --- |
| `toggle .loading for 2s` | **accepts** | `Expected variable name after "for"` |
| `wait for click or 1s` | **accepts** | `Expected event name after "for"` |

Both are documented upstream syntax on shipped, documented commands. Filed in
[PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md).

**Bad example text — upstream rejects them too. Fix in the same file (Finding 12
treatment).** Corrected forms verified to reach real command nodes:

| Command | Dead example | Verified replacement | Parses to |
| --- | --- | --- | --- |
| `repeat` | `repeat 5 times { log "hello" }` | `repeat 5 times log "hello" end` | `repeat, log` |
| `repeat` | `repeat for item in items { log item }` | `repeat for item in items log item end` | `repeat, log` |
| `break` | `repeat … { if item == target then break }` | `repeat for item in items if item == target then break end end` | `repeat, if, break` |
| `continue` | `repeat … { if item.skip then continue; … }` | same shape as `break` above | — |
| `settle` | `settle for 3000` | `settle` (upstream accepts bare `settle`) | `settle` |
| `pseudo-command` | all 4 | re-author against the real grammar | — |

`pseudo-command`'s four are the clearest case: **upstream rejects all four
identically** (`Unexpected Token : on` / `the` / `from`), so they are not a
hyperfixi defect at all — the examples are not valid top-level syntax in either
engine, which independently corroborates Arc C's "no top-level form parses".

The brace-block `repeat … { … }` form is a syntax **neither engine has ever
had** — upstream says `Expected 'end' but found '{'`, hyperfixi says
`Expected "end" to close repeat block`. Four examples authored in an invented
syntax, one of them duplicated through a shared class.

**Needs its own decision — the upstream oracle cannot arbitrate.** These sit on
LokaScript extensions (`unless`, `process`, `start`) or a non-upstream form, so
upstream's rejection carries no information:

| Row | Finding |
| --- | --- |
| `if` + `unless` (one shared string) | Upstream rejects `unless user.isLoggedIn showLoginForm` **and** the `then` form — upstream has `unless` only as a *trailing statement modifier*, which is exactly why the audit lists it in `EXTENSIONS`. hyperfixi accepts `unless user.isLoggedIn then showLoginForm end` (`unless`). The example is misplaced as much as malformed: it is an **`unless` example living on the `if` row**, via the shared `ConditionalCommand`. Splitting per-name metadata is a shape question, not an example fix. |
| `start` | `start view transition using "slide" end` parses (`start`); the failing example's `then put result into #panel end` tail is what breaks. Trim the tail, or establish whether the `then` form should work. |
| `process` | `process partials in it` parses (`process`); the `using view transition` tail breaks it, and it fails with **`Transition command requires a CSS property`** — the tail is being routed into another command. Routing bug, not a syntax gap. |
| `tell` | `tell #modal show end` parses (`tell, show`), but `tell closest <form/> submit end` still fails with `tell command requires at least one command after the target` — `submit` is a method, not a command, so this wants the pseudo-command path. Related to the already-filed `tell`-wrapper defect; needs its own triage. |

Two secondary observations from the same probe, worth recording so a future gate
does not trip on them:

- **`increment`/`decrement` examples parse to a `set` command node**, all four,
  both rows. The parser desugars them. A gate asserting "an example reaches its
  own command" must allow this row explicitly, or it will read as a defect.
- **`beep` parses to a node named `beep!`** — registered name and parse-node name
  differ by the bang. (`EXTENSIONS` in the audit already notes upstream spells it
  `beep!`.)
- **An error position is being reported past the end of the input**: three rows
  report `column 78` for strings 37 and 69 characters long. Cosmetic, but it is a
  stale/leaked position and it made triage slower. Note it in
  `PARSER_NEXT_STEPS.md`; do not chase it inside this arc.

## The `compatibility` decision — decided here, so the arc does not have to

Arc A left `compatibility` unset on all 59 deliberately, so Arc B could copy 59
**finished** values. The domains do not line up, and that is now a decision:

| Manifest (`upstreamOrExtension`) | Decorator union (`compatibility`) |
| --- | --- |
| `upstream` — **51 rows** | `'standard'` |
| `extension` — **8 rows** | `'lokascript-extension'` |
| — *(no counterpart)* | `'experimental'` |

**Decision: map `upstream → 'standard'`, `extension → 'lokascript-extension'`,
and keep `'experimental'` in the union as an allowlisted third state that no
command occupies today.**

Rationale: dropping `'experimental'` narrows an exported public type for no
present benefit, and the state is genuinely meaningful for a future command. The
risk of keeping it is that it becomes an escape hatch from the coupling — which is
what the coupling mechanism has to prevent.

**Couple it with the `TIER_UNCLASSIFIED`-equality trick**, in
`runtime/__tests__/command-manifest-audit.test.ts`, which already holds the two
halves this needs (`EXTENSIONS`, a named 8-entry set, and `TIER_COUNTS =
{ upstream: 51, extension: 8 }`):

- Assert, for all 59 registered commands, that `metadata.compatibility` equals
  the projection of `EXTENSIONS` membership. Set equality both directions, not
  filter-and-assert-empty.
- Hold an explicit `COMPATIBILITY_EXPERIMENTAL = new Set<string>([])` at size 0.
  A command marked `'experimental'` then fails the projection **and** has to be
  added here with a reason in the same diff — the same discipline that made the
  23 tier rows reviewable.
- Keep asserting the counts. A count alone lets two rows swap sides; a list alone
  lets a row leave silently. The audit already learned this.

The eight extensions, for the record: `async`, `beep`, `copy`, `prepend`,
`process`, `push`, `replace`, `unless`.

## Oracle 2: the registry oracle

Run before and after every step; diff the JSON. From `packages/core`, with a
scratch file outside the package (do not leave it in `src/` — it would be
typechecked and collected):

```ts
import { Runtime } from './src/runtime/runtime';
const registry: any = new Runtime().getRegistry();
const names: string[] = [...registry.getCommandNames()].sort();
const impls: Map<string, any> = registry.implementations;
// per name: ctor.name, name source (own vs proto), instance metadata present,
// static metadata present, category, aliases, compatibility, isBlocking,
// hasBody, syntax kind+count, example count, adapter name
// then: shared-implementation groups, and alias -> same-instance identity
```

Baseline recorded 2026-07-29 on `973ee1c5`:

- 59 registered / 55 distinct implementations / 4 shared groups (table above)
- **every** alias resolves to the *same instance* as its primary (`same=true`
  for all 8 pairs, counting both directions of each shared row)
- name source: 56 prototype, 3 own
- instance metadata present: **59/59**; static metadata present: **59/59**
- `compatibility`: `undefined` on all 59

That last row is the one to watch hardest: the migration's whole risk is a class
whose static moves but whose instance read silently returns `undefined`. Both
columns are 59/59 today; they must still be 59/59 after every step.

## Steps — one PR each, merged before the next

**Step 0 (this PR).** The brief. Docs-only.

**Step 1 — `commandMeta()` + the three undecorated classes — ✅ DONE.**
`commandMeta` lives in `commands/decorators/index.ts` (that module's imports are
all type-only, so it carries zero runtime weight and adds no module edge — every
command file already imports from it). `install`, `pseudo-command` and `render`
are converted from `as const` to `commandMeta({…})`.

**The predicted defects did not exist.** This brief expected the conversion to
surface real problems in three literals nothing had ever checked; typecheck came
back clean on the first run. All three were already valid. Recorded because a
prediction that fails is worth as much as one that lands — the *unchecked* state
was real and measured, the *broken* state was an assumption.

The gate is real, not vacuous. Mutation-verified at the real call sites, each
reverted after:

| Mutation in `install.ts` | Result |
| --- | --- |
| `category: 'behaviorz'` | `TS2820: not assignable to type 'CommandCategory'. Did you mean "behaviors"?` |
| `sideEffects: ['behavior-instalation', …]` | `TS2820: not assignable to type 'CommandSideEffect'` |
| `descriptio:` | `TS2561: … does not exist in type 'CommandMetaInput'` |

Two decisions settled here, both load-bearing for step 3:

- **`commandMeta` is pure identity — it fills NO defaults.** `@meta` defaults
  `isBlocking`/`hasBody` to `false` and stamps `version: '1.0.0'`; the three
  converted classes carried none of those fields, so filling them would have
  flipped `undefined → false` on three commands as a side effect of a refactor.
  A test pins their absence. **Step 3 has to decide this deliberately for the 52**,
  because those *do* currently get the defaults from `@meta` — either `@meta`
  keeps stamping them, or the literals become explicit. Do not let it happen by
  omission.
- **`category` belongs IN the literal.** `CommandMetaInput` requires it, because a
  static whose *type* omits `category` cannot serve `metadata.category` — which
  is exactly what the manifest audit's §7 reads. Consequence for step 3: the 52
  decorated literals gain a `category:` line each, and `@command` keeps owning
  `name`. Mechanical and diff-visible, which is the point.

Gate added: `commands/decorators/__tests__/command-meta.test.ts`, 10 tests. It
deliberately does **not** unit-test `commandMeta`'s runtime behaviour (it returns
its argument; the gate is `typecheck`). What it pins is the **bridge invariant**
step 3 depends on — every registered command serves the *same object* through its
static and its instance, both are defined, and the set of commands with an *own*
`name` property is exactly the three converted classes (so a fourth conversion,
or a decoration of one of these, fails loudly). Mutation-verified: deleting
`RenderCommand`'s `get metadata()` fails 3 of the 10.

Registry oracle: **byte-identical** before and after.

**Step 2 — the coupling for `compatibility`, before any values are copied — ✅ DONE.**
Landed as §9 of `runtime/__tests__/command-manifest-audit.test.ts`, five tests,
while the expected state is still "unset on all 59". The audit goes 39 → 44.

Because the projection test is **vacuous over values today**, it was
mutation-verified rather than trusted — and the three outcomes are the design,
not an accident:

| Mutation | What fired |
| --- | --- |
| `copy` (an extension) marked `'standard'` — **wrong side** | projection test **+** the allowlist test |
| `copy` marked `'lokascript-extension'` — **correct** | **only** the allowlist test |
| `copy` marked `'experimental'` | the experimental guard **+** the allowlist test |
| a row added to `EXTENSIONS` (re-partitioning the registry) | §3's existing 51/8 split **+** two of §9's tests |

The middle row is the one that matters: populating a value *correctly* is allowed
by the projection but still fails the row-moving assertion, so **step 3 cannot
populate silently** — it has to empty `COMPATIBILITY_UNSET` in the same diff.
That is the `TIER_UNCLASSIFIED` discipline, and it now demonstrably works in both
directions before there is anything to bless.

`COMPATIBILITY_UNSET` is seeded as `new Set(REGISTRY)` rather than 59 literal
names — it cannot be satisfied by accident either way: populating 58 of 59 and
emptying the set fails (measured 1 ≠ 0), and populating 58 while leaving the set
whole fails too (1 ≠ 59).

**Finding — every check here must be value-based, never key-presence.**
`'compatibility' in metadata` is measurably a *different question* from
`metadata.compatibility === undefined`: `@meta` assigns the key unconditionally,
so **56** commands carry it holding `undefined`, while the **3** `commandMeta`
classes omit it entirely. A key-presence check therefore splits the registry 56/3
and reads as a classification when it is an artifact of how each class declares
its metadata. Pre-existing (step 1's registry oracle was byte-identical), and
recorded in §9's docstring so the next reader does not re-introduce it. Step 3
should expect this asymmetry to disappear as the 52 gain real values.

**Step 3 — migrate the 52 decorated classes — ✅ DONE.** All 52 moved to
`static readonly metadata = commandMeta({…})` + `get metadata()`, `@meta` removed
from every call site, `category` folded into the literal, and `compatibility`
populated on all **55** literals against step 2's live gate.

**The arc's goal is delivered and proven.** `ToggleCommand.metadata.description`
was `TS2339` before this step and now typechecks, with
`ToggleCommand.metadata.category` narrowing to the literal `'dom'`.

**`@meta` is now completely dead** — zero call sites, zero importers. So are
`MetaConfig` and the `COMMAND_METADATA` symbol, and `metadataOf()`'s reason for
existing is gone. Step 4 removes them; step 3 deliberately does not, to keep the
migration diff separable from the deletion diff.

The shape was uniform enough to script: all 51 files matched a single canonical
layout (`@meta({…})` → `@command({name, category})` → `class X`), with `swap.ts`
(two decorated classes) the only structural exception.

**Two things the type system caught that `defineProperty` had hidden:**

- **18 errors, one cause** — the four base classes (`ContentInsertionCommand`,
  `ControlFlowSignalBase`, `DOMModificationBase`, `VisibilityCommandBase`)
  declared `metadata` as a `declare readonly` **property**, and a subclass may not
  override a property with an accessor (`TS2611`, plus `TS4114` wanting
  `override`). Nine subclasses. Fixed by making the base member
  `abstract readonly metadata: CommandMetadata` — which is also the honest
  declaration, since the unchecked `declare` was itself the shape this arc exists
  to remove. Invisible before, because the runtime `defineProperty` simply
  shadowed the declaration.
- **A shared implementation cannot carry two `compatibility` values.**
  `ConditionalCommand` is registered as both `if` (upstream → `'standard'`) and
  `unless` (extension → `'lokascript-extension'`), and both names resolve to the
  same instance — which is precisely how `command-adapter.ts:440` registers the
  alias. The class carries `'standard'` (matching `if`, the primary and upstream
  name) and `unless` is pinned in §9's `COMPATIBILITY_ALIAS_DIVERGENCE`. Checked
  **derived, not hand-listed**: of the four shared groups only this one straddles
  the tier line, so a future consolidated alias across it fails loudly. Splitting
  metadata per registered name would fix it and is architectural — pinned, the way
  Arc A pinned the two category unions.

**Two gate rows MOVED deliberately, and are left as assertions rather than
deleted** so they read as decisions:

- Step 1's test asserting the three converted classes carry **no**
  `isBlocking`/`hasBody`/`version` is **inverted** — they now carry them, because
  `commandMeta` fills `@meta`'s defaults, which is what keeps the *fifty-two*
  byte-identical. The larger preservation won.
- `COMPATIBILITY_UNSET` goes from the whole registry to **empty**, which step 2's
  gate forced: populating a value correctly still failed the row-moving assertion
  until this set moved in the same diff.

**Registry oracle diff.** Two intended changes, and PR #826's description stated
only the first — corrected here, since this file is the durable record:

1. **3 rows on `hasBody`+`isBlocking`** — `install`, `pseudo-command`, `render`,
   from `commandMeta` gaining the defaults. This was the predicted diff.
2. **59 rows gaining `compatibility`** — the population itself, which is the whole
   point of the step and is gated by §9. The #826 text said the diff was "exactly
   the predicted 3 rows" because the oracle snapshot behind that sentence was
   taken **before** the population ran, so it was measuring the migration alone.
   The claim was true of what it measured and incomplete about the step.

Registered count, distinct implementations, all four shared-implementation groups,
and every alias identity: **identical**.

> **Two cautions about the oracle itself, both earned here. The instrument needed
> more debugging than the migration did.**
>
> **1. Diff the UNION of both key sets.** The first diff reported **0 rows
> changed** and was WRONG: it iterated only the *before* row's keys, so a field
> that was **added** was structurally invisible. That is this arc's own central
> disease — a one-directional check that reads as green — reproduced inside the
> instrument built to catch it. The corrected diff found the 3 rows immediately.
>
> **2. Take the baseline from the merged parent commit.** A snapshot is only a
> baseline for the tree that produced it. Step 4a diffed against a step-3 snapshot
> taken mid-step and showed **59** changed rows; against merged `main` the same
> code showed **0**, which is the true answer for a pure deletion. A mid-step
> baseline silently folds the earlier step's unfinished work into the later step's
> diff.
>
> Note the two interact usefully: 4a's `0` is trustworthy *because* the same
> instrument had just produced a non-zero result on a different comparison. A gate
> that has never been seen to fail is not known to work.

- Registry oracle diff is the behaviour-preservation instrument. Names, classes,
  aliases, categories, shared-implementation groups, and both metadata-presence
  columns.
- The **factory-identity test** must stay a direct assertion — each factory's
  command calls itself what the manifest calls it, and each alias resolves to the
  primary instance. **Do not soften it into a derivation.** It carries weight the
  manifest-vs-registry equality no longer can, precisely because both sides would
  then read from the same statics.
- Probe every class's `syntax:` and `examples:` while touching it; apply the
  F-B4 split.
- `configurable: false` means a hybrid state is fine but re-decoration is
  impossible. Never leave a class both decorated and statically assigned.
- **Measure the bundle, do not assume.** Metadata text **does** ship: ~25.3 KB
  raw of `description`/`syntax`/`examples` literals across 433 matches in
  `dist/hyperfixi.js`. The slim bundles are clean (no metadata strings in
  `hyperfixi-hx.js`, `-hybrid-complete.js`, `-minimal.js`, `-standard.js`), which
  is what protects the thin hybrid headroom — **verify that still holds after the
  change**, because a class field is reachable differently from a
  `defineProperty` side effect and could defeat the shaking that keeps them out.

**Step 4 splits**, following Arc A's own 4.1–4.4 precedent: the deletions are
mechanical and verifiable, the prose half is a different kind of work.

**Step 4a — retire the dead surface — ✅ DONE.** Step 3 made all of this dead;
this deletes it.

- `meta()`, `MetaConfig`, all three module-private symbols (`COMMAND_NAME`,
  `COMMAND_CATEGORY`, `COMMAND_METADATA`), `ClassWithSymbols`, and the three dead
  exported getters — gone.
- **`@command` reduces to name-only.** With `meta()` deleted, nothing read
  `COMMAND_CATEGORY`, so `CommandConfig.category` would have been a parameter
  accepted on 52 call sites that goes nowhere — worse than duplication, because it
  reads as authoritative. Removed from the interface and from every call site;
  `@command`'s only job is now the prototype `name` it advertises. The category
  lives in the class's own literal, where §7 already gates it against the manifest.
- **`metadataOf()` deleted, and the type now does its job.** `CommandClass` in
  `scripts/generate-command-docs.ts` became
  `(abstract new (...args: never[]) => object) & { readonly metadata: CommandMetadata }`,
  so the table simply *requires* the static. Mutation-verified: adding a class with
  no metadata is now **`TS2322` at compile time** where it used to be a runtime
  throw. That is the arc's thesis paying off in the exact place that motivated it.

**Two findings for 4b, both about the generated artifact:**

1. **The generator is not prettier-idempotent.** It emits unpadded markdown
   tables; the committed `REFERENCE.md` is prettier-formatted, so a fresh run
   produces a **252-line diff that is pure column padding**. Content was verified
   identical — after `prettier --write` the entire diff collapsed to one line.
   This is the exact failure mode #793 fixed elsewhere and the reason
   "prettier-idempotent generators" is in the design principles. **4b must make the
   generator emit prettier-formatted output**, or every regeneration will look like
   a rewrite and reviewers will stop reading it.
2. **The `Generated:` timestamp defeats a naive `--check` gate.** After padding is
   accounted for, the *only* remaining diff is
   `> Generated: <ISO timestamp>` — which changes on every run. A `--check` that
   diffs the whole file would fail 100% of the time. 4b must either drop the
   timestamp or exclude it from the comparison.

`commands.json` was deliberately NOT regenerated here: it still lacks the
`compatibility` field the metadata now carries, which is 4b's business along with
the `--check` gate. Regenerating it in 4a would have shipped an artifact change
with no gate to keep it honest.

**Step 4b — the prose — ✅ DONE.**

- **The generator now covers all 59** (was 43). The 16 previously-undocumented
  commands: `blur`, `breakpoint`, `clear`, `close`, `empty`, `focus`, `morph`,
  `open`, `process`, `push`, `replace`, `reset`, `scroll`, `select`, `start`,
  `swap`. The import block and table were regenerated from the manifest order, so
  the file no longer holds a hand-curated subset.
- **The gate F-B3 said did not exist:**
  `src/commands/__tests__/docs-coverage.test.ts`, 7 tests. The table must name
  exactly `COMMAND_NAMES` **in the same order**, carry no duplicate rows, and match
  what the runtime actually registers (asked directly, not through the manifest —
  the whole point is comparing a docs list to the *code*). Mutation-verified in
  four directions: dropping `toggle` fails 2 tests, duplicating a row fails 3,
  reintroducing the timestamp fails its guard, removing the `prettier.format` call
  fails its guard.
- **Both 4a blockers fixed, and each is now itself gated.** The generator formats
  its output with prettier (so regenerating is a no-op, not a re-flow) and emits
  **no timestamp** (so `--check` means "content drifted" and nothing else).
  Idempotence verified by running it twice and getting an identical diffstat, and
  `prettier --check` is clean on both artifacts — so the pre-commit hook will not
  fight the gate.
- **`npm run docs:commands` / `docs:commands:check`** added, and the check joins
  the existing "Check generated artifacts are in sync" CI step, which already
  carries exactly this reasoning for two other generators. `--check` failure
  mutation-verified in both directions (perturbed artifact; dropped table row).
- **`commands.json` and `REFERENCE.md` regenerated** — now 59 commands each, and
  carrying the `compatibility` field the metadata gained in step 3.

**One thing the plan asked for that was already done.** The queue named
"completeness tests for `reference/index.ts` and `lsp-metadata.ts` first (cheap)"
as 4b's opening move. **Arc A already built both** — the manifest audit's §2
asserts `reference/index.ts` "documents exactly the registered set" and §5 gates
`COMMAND_KEYWORDS`/`HOVER_DOCS` in both directions. Writing them again would have
added a second place to maintain and no new check, so `docs-coverage.test.ts`
records the non-duplication instead. Measured before writing — the same "score the
rows already there" check that corrected this arc's premise in the brief.

What 4b substituted for that freed effort: a **prose ratchet** on the metadata
itself (non-empty description, ≥1 syntax form, ≥1 example, all 59 passing today).
It guards the thing `commandMeta` structurally cannot — `''` is a perfectly good
`string`, so the type system will never object to an empty description, while the
generator will happily publish it.

~~**Still open from F-B1, deliberately not folded in:** narrowing
`command-adapter.ts`'s shadow `CommandMetadata` and settling `:421`'s name
fallback.~~ **CLOSED 2026-08-01 — see the correction banner at § F-B1.** `:421`
does not depend on the shadow type at all (`register(impl: any)`), the narrowing
drags in the pinned F-B2 union, and the fallback is dead for every command that
ships. The real defect the measurement surfaced — `CommandWithParseInput`'s
`validate` signature matching none of the 59 commands — is filed in the queue.

## Gate couplings that must move in the same diff

- `runtime/__tests__/command-manifest-audit.test.ts` **§7** asserts manifest
  `category` against `getImplementation(name)?.metadata?.category` — an
  **instance** read. It moves if the read path changes.
- The **factory-identity test** — keep it a direct assertion (above).
- `validation/command-pattern-validator.ts` reads `instance.metadata` and checks
  for `description`/`syntax`/`examples`/`category` presence plus a
  `sideEffects` + `examples.length >= 2` quality tier (`:80-107`, `:176-207`).
- The cosmetic projection at `command-adapter.ts:212-221`.
- If `compatibility` gets populated: the audit's tier-coupling assertions
  (`EXTENSIONS`, `TIER_COUNTS`, `TIER_UNCLASSIFIED`).

## Gates and measured baselines

Run from the repo root unless noted. **Baselines measured 2026-07-29 on
`973ee1c5`**, macOS, after `npm run build --prefix packages/core`.

| Gate | Baseline |
| --- | --- |
| `npm run typecheck --prefix packages/core` | clean (**this arc's first oracle**) |
| `npm run test:check --prefix packages/core` | **295 passed / 1 skipped (296 files); 7610 passed / 106 skipped (7716)** |
| `npm test --prefix packages/core` | identical to the above — cross-checked |
| `npm run verify:reference --prefix packages/core` | run before pushing |
| `npm run snapshot:bundle-size --prefix packages/core` | all 10 bundles **+0.0%**, "all bundles within tolerance" |
| `npm test --prefix packages/language-server` | **227 passed (5 files)** ✓ matches the cited figure |
| `npm test --prefix packages/vite-plugin` | **315 passed (11 files)** ✓ matches the cited figure |
| `npm run test:check` (all packages) | fully green in the main tree |
| `cd packages/core && npx playwright test src/compatibility/` | ~1111 passed / 8 skipped; 10 known-local failures (behaviors-demo, i18n-htmx, swap-debug) are a local artifact, green in CI |

> **The core baseline is 7610 / 106 / 296, not the 7847 / 128 / 301 carried into
> this session.** Verified two independent ways (`test:check` and `npm test`, same
> numbers), and the gap is **not** silent collection loss: 300 `*.test.ts` files
> exist under `src/`, 295 collect, 1 is skipped (`performance/command-benchmarks.test.ts`),
> and the remainder are named in `vitest.config.ts`'s `exclude` block. Use the
> measured figure. If a later run reads 7847, something changed that this brief
> cannot see — find out what before treating it as the baseline.

Bundle ceilings (CI, `.github/workflows/ci.yml:1160-1161`): `MAX_LITE=4000`,
`MAX_HYBRID=20000`. `hyperfixi-hx.js` measures **19019 bytes gzip** — **981 bytes
of headroom**. Metadata strings do not currently reach that bundle; keep it that
way.

## Notes carried in, verified or corrected

- `capability-emission.test.ts` now **executes** generated bundles; it writes a
  `.generated` dir under `bundle-generator/__tests__/` during runs
  (`:235`, `:287`) and self-cleans. Confirmed.
- Prettier is pinned **3.9.5** at the root (installed: 3.9.5); no CI format gate,
  so run `format:check:src` by hand. Note `packages/core` still declares
  `prettier: ^3.0.0` rather than the pin — cosmetic, not this arc's business.
- The bundle-size baseline was re-measured 2026-07-29 (#820) and reads +0.0%
  across all ten bundles here. Confirmed.
- The tree is at **`973ee1c5`**, two commits ahead of the `f2511a97` cited at
  session start (`d3a86631` #821 and `973ee1c5` #822 landed after).

## One flag examined, and NOT acted on

The claim that `multilingual` sits at 1.6% of `update:sizes`' 2% band **does not
reproduce here.** A fresh `npm run update:sizes --prefix packages/core` reports
`multilingual` at **✓** (no drift), and the largest drift of any bundle is
**0.3%** (`hybrid-hx-v4` and `browser`; `standard` 0.1%). So there is no measured
case for relaxing the band, and relaxing a gate on an unreproduced number is the
wrong trade.

Two things that *are* true and worth keeping in view:

- The step **is** blocking CI — `.github/workflows/ci.yml:1104-1105`. The root
  `CLAUDE.md` does describe it as a gate ("fails only when metadata is stale
  enough to mislead", plus the instruction to take numbers from the CI job log),
  so the "documented as run by hand" premise does not hold up against the text.
- **Gzip is platform-dependent and CI is the authority.** A local macOS run reads
  ~2 KB lower on the full bundles than CI's Linux zlib, so a bundle can sit near
  the band on CI while reading ✓ locally. **If the 1.6% figure came from a CI job
  log, that is the number that matters** — recheck it there before dismissing
  this, and if it holds, the fix is a band change argued from the CI measurement,
  in its own PR, not folded into Arc B.
