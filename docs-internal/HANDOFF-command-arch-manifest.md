# HANDOFF — command-arch Arc A: the command manifest

> **Arc brief, written 2026-07-28.** Detail for Arc A of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc).
> Format follows [HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md)
> (Arc C, complete) and [HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md)
> (Arc D, complete).
>
> **Status: STEPS 1–3 LANDED (the audit-as-gate, the manifest, then the four
> mechanical consumers). Next action: step 4 (the decision-bearing consumers,
> one PR each — start with 4.1, the live LSP false negative).** Baseline for
> step 4 is **7827** (step 3 added 3 tests to the audit file).
>
> **This brief REVISES the queue doc's Arc A plan — specifically its migration
> ORDER and its manifest SHAPE.** Three of the paragraph's claims were measured
> rather than inherited, and two did not survive. Read
> [What changed](#what-changed-vs-the-queue-docs-plan) before following the
> queue's wording.

## Verified state (measured 2026-07-28 on `b69bc035`; re-stamped after step 3, `051dd47e`)

Line refs will drift — re-verify by symbol (`grep -n`), not by number.
Baseline when the arc opened: **7795 passing, 128 skipped, 298 files**
(`npm run test:quick --prefix packages/core`). Current: **7827 / 128 / 300**.

> **Claims 1 and 2 below describe the PRE-step-3 code and are kept as the
> record of what made those lists safe to migrate. Two of them no longer
> describe the tree:** the 59 flat `registry.register(create<X>Command())` calls
> are now one manifest loop (Claim 1), and `parser-constants.COMMANDS` is now
> derived rather than merely agreeing (Claim 2's first row). Claims 3 and 4 and
> Findings 5–10 are still live.

### What the registry actually holds

`new Runtime().getRegistry().getCommandNames()` → **59 names**:

```text
add append async beep blur break breakpoint call clear close continue copy
decrement default empty exit fetch focus get go halt hide if increment install
js log make measure morph open pick prepend process pseudo-command push put
remove render repeat replace reset return scroll select send set settle show
start swap take tell throw toggle transition trigger unless wait
```

This is the arc's source of truth. Every list below is scored against it.

### Claim 1 — "59 flat registration calls" — VERIFIED, and they are perfectly uniform

`runtime/runtime.ts` holds exactly 59 `registry.register(create<X>Command());`
calls. Grepping for any line that does *not* match
`registry.register\(create[A-Za-z]*Command\(\)\);` returns **zero** results: no
arguments, no conditionals, no non-factory registrations. The uniformity the
queue assumed is real, and this is the single most mechanical migration target
in the arc.

### Claim 2 — the four "core" lists already agree

| List | Size | vs registry |
| ---- | ---- | ----------- |
| `parser/parser-constants.ts` `COMMANDS` | 59 | `pseudo-command` missing; `for` extra |
| `commands/index.ts` factory aliases | 59 | exact (modulo alias-name spelling) |
| `reference/index.ts` | 59 | exact (modulo alias-name spelling) |
| `runtime/runtime.ts` registrations | 59 | exact |

Both `COMMANDS` deltas are explainable, not rot: `for` is a control-flow keyword
with no command implementation, and `pseudo-command` is **added at registration
time** (see Finding 3). These four are genuinely in sync and are the arc's
low-risk targets.

### Claim 3 — "both already ghost-tested, so the tests carry the migration" — FALSE in the direction that matters

Both named gates are **one-directional**. They compute
`list.filter(isGhost)` and assert `[]` — i.e. they catch a list naming a command
that does not exist, and are structurally blind to a list *omitting* a command
that does. Measured by mutation, not by reading:

| Mutation | Result |
| -------- | ------ |
| drop `'trigger'` from `template-capabilities.AVAILABLE_COMMANDS` | **all 31 bundle-generator + manifest-consistency tests PASS** |
| drop `'toggle'` from `command-tiers.HYPERSCRIPT_COMMANDS` | **all 5 command-tiers tests PASS** |
| drop `'toggle'` from `template-capabilities.AVAILABLE_COMMANDS` | 2 tests fail — but via `bundle-generator/validation.test.ts`, a **hardcoded 16-name spot-check** (`expect(AVAILABLE_COMMANDS).toContain('toggle')` …), not via `capability-ghosts.test.ts` |

`trigger` was chosen deliberately: it is a real, registered, shipped command, and
it is the exact command `bundle-manifest-consistency.test.ts` was written about
(the 2026-07-20 silent no-op). Removing it from the capability list is invisible
to every gate in the repo.

**So the ghost tests carry half the migration — the ghost half.** The omission
half is unguarded, which matters enormously because:

### Claim 3, continued — those two lists are ALREADY wrong

Scored against the 59-name registry:

| List | Size | Registered but ABSENT | Present but NOT registered |
| ---- | ---- | --------------------- | -------------------------- |
| LSP tiers (`HYPERSCRIPT_COMMANDS` + `LOKASCRIPT_ONLY_COMMANDS`) | 45 | **23** | 9 — all features (`behavior`, `def`, `init`, `on`, `eventsource`, `socket`, `worker`) + `for`/`while`; legitimately allowlisted by the ghost test's `FEATURES` set |
| `template-capabilities` (`AVAILABLE_COMMANDS` + `FULL_RUNTIME_ONLY_COMMANDS`) | 50 | **12** | 3 — `push-url`/`replace-url` (aliases) + `removeClass` (allowlisted) |
| `lsp-metadata.ts` `COMMAND_KEYWORDS` | 58 | **6** | 5 — `else`/`for`/`while` (keywords) + **`pushUrl`/`replaceUrl`, genuine ghosts** |

The 23 absent from the LSP tiers:
`async, beep, blur, break, breakpoint, clear, close, continue, copy, empty,
focus, open, pick, pseudo-command, push, render, replace, reset, scroll, select,
start, swap, unless`.

The 12 absent from template-capabilities:
`breakpoint, clear, close, fetch, open, pseudo-command, render, repeat, reset,
scroll, select, start`.

Both files' own doc comments state a **partition** intent — template-capabilities
"documents which commands … are available in generated lite bundles versus those
that require the full runtime"; command-tiers defines "which features are
hyperscript … [or] LokaScript extensions". A command in neither list is
unclassified against a contract that says every command has a class.

**Consequence, measured per consumer — and they differ, which is why these are
two separate PRs and not one:**

- **template-capabilities: latent, not live.** `vite-plugin/src/generator.ts:785`
  reads `!isAvailableCommand(cmd) && !COMMAND_IMPLEMENTATIONS[cmd]` → treats an
  unclassified command as unsupported → falls back to the full runtime. The
  fallback is conservative and correct-by-default, so the 12 gaps cost bundle
  size, not correctness. (Note the second escape hatch, `COMMAND_IMPLEMENTATIONS`
  keyed by name: a command can be "available" via a list the capability file does
  not know about. Two lists, one fact — the queue's own disease.)
- **LSP tiers: a live false negative.** `detectLokascriptFeatures()` loops
  `LOKASCRIPT_ONLY_COMMANDS` and warns "'X' command is a LokaScript extension".
  A LokaScript-only command missing from that list produces **no warning**, so a
  user writing code that will not run on original \_hyperscript is told nothing.
  Several of the 23 (`empty`, `clear`, `open`, `close`, `select`, `reset`,
  `swap`, `push`, `replace`, `focus`, `blur`, `copy`, `unless`) are extensions on
  the Arc C upstream survey's reading.

### Claim 4 — "verify:reference derives what it claims" — TRUE but far narrower than the queue implies

`scripts/verify-reference-data.ts` reads exactly **three** files:
`commands/index.ts` (factory aliases, by regex over `create<X>Command as <y>`),
`reference/index.ts` (command entries), and `metadata.ts` (`packageInfo.commands`
+ per-bundle `commandCount`). It genuinely derives the two list-publishing
bundles' counts from their own `commands: [...]` arrays — that part of the
queue's claim holds.

**It never reads** `runtime/runtime.ts`'s registration block,
`parser-constants.COMMANDS`, `lsp-metadata.ts`, `template-capabilities.ts`, or
the LSP tier lists. A command exported, referenced, and counted but **never
registered** passes `verify:reference` clean. Its scope is 3 of the ~20 places.

### Finding 5 — a new ghost class, in a list the queue does not name — **FIXED**

> **Landed as the standalone pre-arc PR** (branch
> `fix/lsp-metadata-url-command-ghosts`), the way `unless` landed ahead of Arc C.
> The two entries became `'push'` / `'replace'` — a **rename, not a deletion**:
> deleting would have dropped LSP completions for a real shipped command and
> then re-added them at step 4.3. Because the rename also fills two of the six
> gaps below, **step 4.3's gap count is now 4**, not 6.
>
> The PR also added `packages/core/src/lsp-metadata.test.ts` — a **bidirectional**
> gate, since writing another one-directional ghost test would have reproduced
> the exact defect Claim 3 documents. Mutation-verified both ways: re-introducing
> `pushUrl` fails it, and dropping `toggle` fails it (the direction
> `capability-ghosts` and `command-tiers` cannot see). Step 1's audit should
> absorb it.

`lsp-metadata.ts` `COMMAND_KEYWORDS` advertised **`pushUrl`** and
**`replaceUrl`**. Neither parses:

```text
REJECTS  pushUrl "/x"        PARSES  push url "/x"
REJECTS  replaceUrl "/x"     PARSES  replace url "/x"
```

This is precisely the `transfer` class that motivated `command-tiers.test.ts`,
alive in a sibling list that had **no ghost test**. `COMMAND_KEYWORDS` feeds
`ALL_KEYWORDS` (`lsp-metadata.ts:212`), which `language-server/src/server.ts:1544`
uses as its canonical keyword list — so the LSP offered two completions the engine
rejects. Six registered commands (`process`, `pseudo-command`, `push`, `replace`,
`scroll`, `start`) were missing from the same list; **`push` and `replace` are now
present**, leaving `process`, `pseudo-command`, `scroll`, `start`.

### Finding 6 — registration already mutates the parser's command set

`command-adapter.ts` `register()` does `COMMANDS.add(name)` (and again per
`metadata.aliases`). Measured:

```text
static COMMANDS size before any Runtime:   59
toggle parses with no Runtime constructed: true
has 'pseudo-command' statically:           false
COMMANDS size AFTER new Runtime():         60
has 'pseudo-command' after:                true
```

So `parser-constants.COMMANDS` is a **static seed** that the parser uses
standalone, which registration then augments. A derive-from-registration
precedent already exists in the codebase — the manifest work should invert its
direction (manifest seeds both, rather than runtime patching the parser at
construction time), and step 3 should not treat the static list as an
independent hand-maintained copy without accounting for the mutation.

### Finding 7 — "aliases" names two different mechanisms; do not conflate them in the manifest

1. **Consolidation aliases** — `metadata.aliases` on the implementation class,
   registered by `command-adapter.ts:440` (the risk register's load-bearing
   line). Four exist: `push-url`→`replace`, `if`→`unless`, `trigger`→`send`,
   `increment`→`decrement`. One implementation, several real command names.
   These are in the registry and parse correctly.
2. **Synonym aliases** — `COMMAND_ALIASES`, eleven entries
   (`flip`, `switch`, `display`, `reveal`, `conceal`, `increase`, `decrease`,
   `fire`, `dispatch`, `navigate`, `goto`).

**The synonym aliases work only in the slim bundles.** Measured against the full
parser, with canonical controls:

```text
PARSES   toggle .active on me      REJECTS  flip .active on me
PARSES   show me                   REJECTS  reveal me
PARSES   trigger foo               REJECTS  fire foo
PARSES   go to #x                  REJECTS  goto #x
```

`hyperfixi-hybrid-complete.js` (7.7 KB) and `hyperfixi-lite-plus.js` accept
`flip`/`fire`/`goto`; `hyperfixi.js` (310 KB) rejects them. **The small bundle
has a feature the big one lacks**, inverting the documented "start as small as
you can; upgrade when you hit a missing feature" rule in the root CLAUDE.md.
This is the #792 pattern a third time — copies diverging from the canonical, with
the canonical the poorer one.

The table itself is duplicated (`parser/hybrid/aliases.ts` and an inline copy at
`browser-bundle-lite-plus.ts:54`). **The two copies are currently identical** —
eleven entries each, verbatim — so this is duplication that has not yet drifted,
not a live inconsistency. Nothing compares them.

Reconciling the full parser to the slim bundles (or deciding the synonyms are
slim-only by design) is a **behavior change, not a refactor** — it belongs in its
own PR with its own decision, exactly like Arc D's
`toElementListFiltered`/`toElementListStrict` follow-up. It is recorded here
because the manifest's `aliases` field is where the question will surface.

### Finding 8 — upstream-vs-extension is not derivable

The queue's manifest shape includes an "upstream-vs-extension flag". That fact is
recorded **nowhere in the codebase except the LSP tier lists themselves** —
searching `reference/index.ts`, `metadata.ts`, and `lsp-metadata.ts` for
upstream/extension markers finds only prose inside description strings. The
manifest therefore cannot *derive* this field; it must **absorb** the tier lists
as its source, and the 23 unclassified commands have no value to absorb. That is
a per-command judgment call (against the upstream \_hyperscript checkout, the same
oracle Arc C step 2 used), not a migration.

### Finding 9 — a factory-carrying manifest breaks tree-shaking, measured

The queue's proposed shape is "name, category, **factory**, parser kind,
multiword keywords, bundle tier, upstream-vs-extension flag, aliases". The
`factory` field is measurably harmful. Two manifests, four commands each,
consumer using **only the names**, bundled with esbuild `--bundle --minify`:

| Manifest shape | Consumer output |
| -------------- | --------------- |
| data-only (`{name, category}`) | **177 bytes** |
| factory-carrying (`{name, category, factory}`) | **38,395 bytes** |

An object literal that references the factory pins it, so nothing can be shaken.
At four commands that is 38 KB; at 59 it is the whole command set pulled into
any bundle that merely wants the name list. Since the point of the manifest is
that slim-bundle-facing consumers (`template-capabilities`, the bundle
generator, the LSP tiers) read it, **the manifest must be data-only.** If a
factory map is wanted, it is a separate module imported only by
`runtime/runtime.ts`, which already imports all 59 anyway (61 import lines, 58 of
them per-command deep imports).

### Finding 10 — `category` has two sources, and they disagree on 2 of 59 (measured in step 2)

The step-1 knock-ons asked step 2 to measure this rather than assume it.
Measured: **57 of 59 agree**. The two that do not are `send` and `trigger` —
`'events'` in `reference/index.ts`, `'event'` in the `@command` decorator.

It is not a typo. There are **two independent `CommandCategory` unions**, and
they differ in exactly two members:

```text
reference/index.ts         …| 'events' |…              (no 'storage')
types/command-metadata.ts  …| 'event'  | 'storage' |…
```

`'event'` is the only spelling the decorator union will accept, so
`events/trigger.ts` could not have used `'events'` — each file is internally
consistent and the two were simply never compared. Nothing in the repo compared
them before the step-2 audit section.

The manifest follows the **decorator/registry** union, because the manifest
mirrors what the engine serves. The reference-side divergence is pinned in the
audit as `CATEGORY_DOC_DISAGREEMENTS`, which also asserts *which* spelling each
side holds — so a half-finished reconciliation fails rather than silently
re-pointing the row. Reconciling the unions is a rename touching the LSP and the
docs surface, so it is deferred out of the arc alongside Finding 7.

### Finding 11 — the manifest's DATA payload does not tree-shake either (measured in step 3)

Finding 9 ruled out a `factory` field because referencing a factory pins the
implementation. The same hazard exists one level down, and step 3 hit it: a
consumer that wants only the command NAMES cannot get them via
`COMMAND_MANIFEST.map(e => e.name)`, because the `.map()` references the entries
and every entry's `category` / `tier` / `upstreamOrExtension` / `multiword`
survives into the bundle.

Measured when `parser-constants.COMMANDS` was first derived that way. Deltas are
against the same commit built without the change (the committed
`baseline.json` has its own accumulated drift, so the gate's percentages are not
the measurement):

| Bundle | via `COMMAND_MANIFEST.map()` | via `COMMAND_NAMES` |
| ------ | ---------------------------- | ------------------- |
| `hyperfixi-hx.js` (68.5 KB raw) | **+4.8 KB (+7.5% — FAILS the ±5% gate)** | +0.0 KB |
| `hyperfixi-minimal.js` | +4.9 KB | +0.0 KB |
| `hyperfixi.js` / `hx-v4` | +5.2 KB | +5.2 KB |

`hyperfixi-hx.js` is the sharp case: an 18 KB-gzip hybrid-parser bundle with no
command registry at all, which reaches `parser-constants.ts` and would have
carried the classification data for 59 commands it cannot execute. The fix is a
second literal in `manifest.ts` — `COMMAND_NAMES` — asserted equal to
`COMMAND_MANIFEST.map(e => e.name)` **as an ordered list**, so it is a shape
split rather than a hand-maintained copy. The last row is the honest cost and is
correct: only the bundles that construct `Runtime` carry the rich array, and
they are the ones that need it.

**Knock-on for step 4.** Both remaining consumers want the RICH entries, not the
names: 4.1 needs `upstreamOrExtension`, 4.2 needs whatever field the capability
partition lands in. Before pointing either at `COMMAND_MANIFEST`, check whether
that consumer reaches a shipped browser bundle — `template-capabilities.ts` is
imported by `bundle-generator/`, which is build-time, but
`vite-plugin/src/generator.ts` reading it does not make it browser-side and this
should be **measured, not assumed**. `npm run snapshot:bundle-size --prefix
packages/core` is the instrument; the ±5% tolerance on the small bundles is
tight enough that 4.8 KB fails it.

## What changed vs. the queue doc's plan

The queue says: consumers migrate "lowest-risk first — template-capabilities
lists and LSP tier lists (both already ghost-tested, so the tests carry the
migration), then `parser-constants` `COMMANDS`, bundle name arrays, the runtime
registration block …, and finally `packageInfo.commands` as a derived value."

**The ordering is inverted, for two measured reasons.**

1. The tests do **not** carry those two migrations (Claim 3). They catch ghosts;
   they cannot see an omission, which is the failure mode a migration actually
   produces.
2. Those two lists are not merely unmigrated, they are **already wrong** by 23
   and 12 entries. Pointing them at a manifest is not a substitution that
   preserves behavior — it is a decision about what 35 unclassified commands
   should be, and for the LSP tiers it changes user-visible warnings.

The genuinely mechanical targets are the ones the queue sequences **last**: the
59 uniform registration calls and the four 59-entry lists that already agree
exactly (Claims 1 and 2). Those are true substitutions.

**And the manifest shape changes** (Finding 9): data-only, with any factory map
kept in a separate module.

**Revised destination:** unchanged in intent — one manifest as the
registry-of-record — but reached by *gate first, mechanical consumers second,
decision-bearing consumers last*, which is the reverse of the queue's reading of
"lowest-risk".

## The steps

### Step 1 — the audit, as a test (the arc's gate)

Per Claim 3 this is the landing that makes everything after it safe, and it is
the step the queue's plan omitted entirely (it assumed the gate already existed).

`packages/core/src/runtime/__tests__/command-manifest-audit.test.ts`, modelled on
Arc C's `command-output-contract.test.ts`:

1. **Derive the registry list** from `new Runtime().getRegistry().getCommandNames()`.
2. **Score every hand-maintained list against it in BOTH directions** — the four
   core lists, both capability lists, both tier lists, `COMMAND_KEYWORDS`, and
   the per-bundle `commands: [...]` arrays.
3. **Every divergence is an explicit, commented allowlist entry**, never a
   snapshot blob. A snapshot of ~20 lists will be re-blessed on first failure;
   `TIER_UNCLASSIFIED = new Set([...23 names])` with a reason per group will not.
   Model: Arc C's `PATH_DISAGREEMENTS`.
4. **Assert the counts** (23 / 12 / 6 / 2 ghosts) so a later step must move them
   deliberately.

Expect step 1 to land RED-adjacent, documenting current behavior including the
wrong parts, with a comment on each wrong row naming the step that fixes it.
This is Arc C step 1's shape and it worked.

### Step 2 — the manifest, data-only, gated, consumed by nobody

`packages/core/src/commands/manifest.ts`: `name`, `category`, `tier`,
`upstreamOrExtension`, `consolidationAliasOf`, `multiword` — **no factory
references** (Finding 9). One test asserting the manifest's name set equals the
registry's, both directions.

Zero consumers means zero behavioral risk, and it makes the manifest real and
gated before anything depends on it. `upstreamOrExtension` starts as the tier
lists' current content plus `unknown` for the 23 — the classification is step 4's
work, not a blocker here.

Step-1 knock-ons for this step (2026-07-28):

- **Reuse the audit's fixtures, don't re-derive.** The step-1 gate
  (`runtime/__tests__/command-manifest-audit.test.ts`) already has the
  registry-derivation, the `ghostsIn`/`gapsIn` helpers, the `SPELLINGS`
  normalization map, and the `TIER_UNCLASSIFIED` set. The manifest's name-set
  test belongs in or beside that file, keyed on the same derivation.
- **Couple the `unknown`s to the audit.** Assert the manifest's
  `upstreamOrExtension === 'unknown'` set equals the audit's
  `TIER_UNCLASSIFIED` — then step 4.1 must move both together and the two
  cannot drift apart (the disease this arc exists to cure).
- **`category` has two candidate sources; measure their agreement before
  choosing.** `reference/index.ts`'s `category:` fields (validated by
  `verify-reference-data.ts` against its 13-name list) and the
  `@command({ category })` decorator statics. Nothing currently compares them.
  A disagreement is a finding worth recording here, not silently resolving.
- **`consolidationAliasOf` means Finding 7's FIRST mechanism only** — the four
  `metadata.aliases` registered by `command-adapter.ts:440`, which back real
  command names. Not the eleven slim-bundle synonyms (`COMMAND_ALIASES`),
  whose divergence is deferred out of the arc.

Verify with `npm run snapshot:bundle-size --prefix packages/core`
(`scripts/bundle-size-snapshot.mjs --check`, ±5% vs
`scripts/bundle-snapshots/baseline.json`) that importing the manifest anywhere
costs nothing. **The command name matters:** this brief previously said
`npm run bundle-size`, which does not exist in any package.json — a session
that ran it, saw it fail, and shrugged would skip the exact guard Finding 9
makes this step exist to satisfy.

### Step 3 — migrate the mechanical consumers — **DONE**

The four already-agreeing lists (Claim 2), one PR:
`parser-constants.COMMANDS` seed, `commands/index.ts`, the `reference/index.ts`
cross-check, and the 59 registration calls. Account for Finding 6 — the static
`COMMANDS` seed and the registration-time `COMMANDS.add` are two halves of one
mechanism, so the manifest should feed both rather than the runtime patching the
parser at construction.

**Tree-shaking constraint (verified, Finding 9):** slim bundles keep explicit
per-bundle factory imports. Manifest-*checked*, not manifest-driven, wherever
shaking matters. `runtime/runtime.ts` is the exception — it already imports all
59, so a manifest-driven registration loop there costs nothing.

**As landed**, two of the four are driven and two are checked:

| Consumer | Result |
| -------- | ------ |
| `parser-constants.COMMANDS` | **driven** — `new Set([...COMMAND_NAMES, 'for'])`; `for` is the one parser-only keyword |
| `runtime.ts` registration | **driven** — one loop over the manifest; a private `COMMAND_FACTORIES` map supplies the factory per name |
| `commands/index.ts` | **checked** — re-export statements cannot be generated without pinning all 59 |
| `reference/index.ts` + `metadata.ts` counts | **checked** — the manifest is now `verify:reference`'s spine |

The loop registers the **55** rows without `consolidationAliasOf`; the other
four names arrive from their primary's `metadata.aliases`. The pre-step-3 block
did call `createDecrementCommand()` and its three siblings, but those calls were
**redundant, not load-bearing** — `createDecrementCommand` is
`createFactory(NumericModifyCommand)`, the same class whose `name` is
`'increment'`, so the call re-registered `increment` over the entry the previous
line had just made. Verified by a before/after registry oracle: identical names,
classes, `metadata.aliases`, categories, and shared-implementation pairs; the
only differences are `getCommandNames()` enumeration order (now alphabetical)
and the seed gaining `pseudo-command`.

### Step 4 — the decision-bearing consumers, one PR each

Each carries an explicit classification decision for its gaps, and each flips its
step-1 audit rows so the diff is the review artifact:

1. **LSP tiers** (23 unclassified; live false negative). Classify against a
   `_hyperscript` checkout — the Arc C step-2 oracle. **Step-2 knock-on:** the
   classification has a typed home already — `CommandMetadata` declares
   `compatibility?: 'standard' | 'lokascript-extension' | 'experimental'` and
   `@meta` forwards it, but **all 59 commands leave it unset** (measured). So
   Finding 8's "recorded nowhere but the tier lists" is right, and the sharper
   statement is that the slot exists and is vacant. Populating it as the
   classification lands would let `upstreamOrExtension` become *derived* rather
   than absorbed, and would put the fact on the implementation where the other
   per-command metadata already lives. Whichever way it goes, the manifest's
   `unknown` set and the audit's `TIER_UNCLASSIFIED` are asserted equal — both
   move in the same diff or the gate fails.
2. **template-capabilities** (**13** unclassified, not 12 — see the 2026-07-28
   step-1 status entry; latent). 10 rows have no classification at all
   (`CAPABILITY_UNCLASSIFIED` in the audit); `if`/`repeat`/`fetch` are
   classified only as blocks (`CAPABILITY_BLOCK_ONLY`) and need an explicit
   blocks-count-as-classified decision. Also decide the
   `COMMAND_IMPLEMENTATIONS` second-list overlap.
   **Step-2 knock-on — do NOT derive these lists from the manifest's `tier`.**
   The manifest's `tier` mirrors `reference/index.ts`'s `availability` (which
   prebuilt bundle first ships a command; `verify:reference` already checks the
   chain `lite(7) ⊂ lite-plus(17) ⊂ hybrid(31) ⊂ full(59)`). That is a
   **different fact** from the capability lists ("can the generator emit it into
   a lite bundle"). Measured under the natural mapping `full` ↔
   full-runtime-only, they disagree on **16 of 59** rows: `beep`, `copy`, `js`,
   `take`, `exit`, `halt`, `morph`, `return`, `throw`, `transition` are `full`
   yet generator-available; `async`, `fetch`, `if`, `make`, `repeat`, `swap` are
   `hybrid` yet absent from the capability lists entirely. Two facts, not one
   fact stored twice — the manifest will need a second field for this, not a
   reuse of `tier`.
3. **`COMMAND_KEYWORDS`** (**4** gaps — `process`, `pseudo-command`, `scroll`,
   `start`; the two ghosts landed separately per Finding 5, and that rename
   closed `push`/`replace`). The gaps are already an explicit `KEYWORD_GAPS`
   allowlist in `lsp-metadata.test.ts` with a stale-entry check, so closing one
   means deleting its line there — fold that gate into step 1's audit.
4. **`packageInfo.commands`** as a derived value. **Step-3 knock-on: the
   `runtime/runtime.ts` half of the docstring fix is already done.** All six
   "48 commands" mentions and every undercounting per-category group comment
   ("DOM Commands (11)" above 15 registrations, "Phase 6-5 Commands (6)" above
   7) were in or immediately around the registration block step 3 replaced, so
   leaving them would have meant shipping stale prose beside freshly-written
   code. What remains for 4.4 is the actual derivation: `metadata.ts`'s
   `packageInfo.commands` and the full-runtime bundles' `commandCount` are still
   hand-typed numbers, checked against the manifest by `verify:reference` (step
   3) but not computed from it. Other files still carrying stale counts —
   `compatibility/browser-bundle-modular.ts`, `parser/parser-interface.ts`,
   `parser/full-parser.ts` — were untouched, being outside step 3's diff.

### Deferred out of the arc, deliberately

- **The synonym-alias divergence** (Finding 7) — a behavior change wanting its
  own decision, like Arc D's element-list follow-up.
- **The `COMMAND_ALIASES` duplication** — real, but not yet drifted; it should
  fold into the manifest only once Finding 7 is decided.
- **The two `CommandCategory` unions** (found in step 2, see Finding 10). A
  rename with LSP and docs reach; pinned by the audit meanwhile.

## Gates, per step

| Step | Suites | Command |
| ---- | ------ | ------- |
| all | quick validation (baseline **7827** after step 3; was 7824 after step 2, 7814 after step 1, 7800 after the Finding 5 fix, 7795 before it) | `npm run test:quick --prefix packages/core` |
| all | the reference gate | `npm run verify:reference --prefix packages/core` |
| 1 | the new audit test itself | added in the step-1 PR |
| 2, 3 | bundle size — the tree-shaking guard | `npm run snapshot:bundle-size --prefix packages/core` (`--check`, ±5% vs `scripts/bundle-snapshots/baseline.json`) |
| 3 | parser + runtime + LSP | `npm test --prefix packages/core -- --run src/parser/ src/runtime/` and `npm test --prefix packages/language-server` |
| 3, 4 | Playwright bundle compatibility matrix | `cd packages/core && npx playwright test src/compatibility/` (MUST run from packages/core) |
| 4 | `npm run test:check` (the cross-package gate) | catches language-server / vite-plugin consumers |

`multilingual-validation` is **not** expected to fire — this arc adds and removes
no commands and touches no semantic surface. If it does, something out of scope
was touched.

## Non-goals (Arc A specifically)

- **The command output contract** — Arc C, done. Do not reopen `it`/`result`.
- **The decorator statics** (Arc B) — the manifest is a sibling of
  `metadata`, not a replacement. Arc B makes metadata type-visible; Arc A makes
  the *set* derived. They meet, but not in this arc.
- **The four executors** (Arc E) and **semantic mappers** (Arc F).
- **Command input parsing.** `COMPOUND_COMMANDS` (22 entries) and
  `MULTI_WORD_PATTERNS` are parser data; the manifest may record `multiword` but
  must not try to own the parse.
- **`send`/`trigger` self-assigning the dispatched Event** — Arc C's one recorded
  open sibling, tracked in the queue doc.

## Session handling

- **One PR per step, merged into main before the next starts.** Stacked PRs get
  zero CI and still report clean (`ci.yml` fires only on PRs into main/develop).
- **Branch from an explicit base:** `git checkout -b <name> main`. Concurrent
  sessions move HEAD and `git status` cannot see an inherited commit — that put a
  foreign commit into #805. `git show --stat` before pushing if the file count
  surprises you.
- **Prefer a fresh session per step**; this file is the continuity mechanism.
- **Start-of-session protocol:** (1) read the queue doc's Arc A paragraph + this
  file; (2) `git log --oneline -5`; (3) re-verify anchors by symbol; (4) cold
  tree → `npm install` first (`npm run build` is NOT dependency-ordered, root
  CLAUDE.md § Cold start); (5) baseline `npm run test:quick --prefix packages/core`
  BEFORE editing.
- **End-of-session protocol:** update the Status log below. If a step changes a
  later step's plan, edit that step's section here — this file is authoritative
  for the arc, per the queue's pointer-only rule.
- Core vitest wraps in `timeout 120`; **exit code 124 = success** (esbuild daemon
  hang, known issue).

## Risk register (arc-specific; the general one is in the queue doc)

- **The ghost tests cannot see an omission.** Claim 3 is the single most
  important line in this brief. Never read a green `capability-ghosts` or
  `command-tiers` as evidence that a list migration preserved its contents — it
  is evidence only that the list contains no ghosts. Step 1's audit is the only
  instrument that sees the other direction.
- **`command-adapter.ts:440`** (aliases from instance metadata) is load-bearing;
  silently dropping it un-registers alias keywords — and per Finding 7 it backs
  four *real command names* (`replace`, `unless`, `send`, `decrement`), not
  cosmetic synonyms. Breaking it removes commands.
- **A `factory` field in the manifest defeats tree-shaking** (Finding 9,
  measured: 177 B → 38 KB at four commands). Guard with the bundle-size snapshot,
  not by inspection.
- **Registration mutates `COMMANDS`** (Finding 6). Still true after step 3, but
  the symptom moved: the built-in 59 are now in the seed from the start, so a
  Runtime construction no longer changes the count. What still mutates it is
  registration of anything the manifest does not name — a plugin, a custom
  bundle, a command a test registers. A test that reads
  `parser-constants.COMMANDS` after such a registration sees the extra entries.
  Read the list from source text, or snapshot it before — `capability-ghosts.test.ts`
  imports the live Set and is exposed to this ordering, and the audit snapshots
  `STATIC_SEED` before its own Runtime for the same reason.
- `export { X } from './f'` creates **no local binding** — import then export
  when moving registration points.
- tsup multi-entry `splitting: false` **forks singletons** — verify at dist
  level, not just via test-config aliases.
- The MCP server serves **stale dist** after rebuilds; a tool refusing with
  "serving STALE code" is the guard working — restart, don't debug.

## Status log

- 2026-07-28 — brief written; arc not started. Baseline 7795 passing on main
  `b69bc035`. The exploration ran five experiments worth not repeating:
  (a) the registry-vs-every-list diff (the 23/12/6 tables); (b) the **mutation
  test** that disproved "the tests carry the migration" — dropping `trigger`
  from `AVAILABLE_COMMANDS` and `toggle` from the tier lists, both silent;
  (c) parse probes proving `pushUrl`/`replaceUrl` are ghosts and the eleven
  synonym aliases are slim-bundle-only, both with canonical controls;
  (d) the static-vs-registration `COMMANDS` measurement (59 → 60); (e) the
  esbuild tree-shaking measurement that rules out a `factory` field
  (177 B vs 38,395 B). All run against `b69bc035` with a clean tree and reverted.
  Next action: the `pushUrl`/`replaceUrl` ghost fix as a standalone PR
  (Finding 5), then step 1.
- 2026-07-28 — **Finding 5 ghost fix landed** (branch
  `fix/lsp-metadata-url-command-ghosts`, off `d6e3ba18`). `COMMAND_KEYWORDS`'
  `pushUrl`/`replaceUrl` → `push`/`replace`; new bidirectional gate
  `packages/core/src/lsp-metadata.test.ts` (5 tests). Re-verified the ghost by
  probe before touching anything (`push url "/x"` parses, `pushUrl "/x"` does
  not; registry = 59, has `push`+`replace`, not `pushUrl`/`replaceUrl`), and
  mutation-verified the new gate in both directions. Gates: core 7800 passing /
  128 skipped / 300 files, `verify:reference` clean (59 = 59), `typecheck`
  clean, `test:check` exit 0 across all packages, language-server 223 passing
  against the rebuilt core dist. Two knock-on edits to this brief: step 4.3 is
  now **4** gaps not 6, and the step baseline is 7800.
  Next action: step 1 (the audit-as-gate).
- 2026-07-28 — **Step 1 landed** (branch `test/command-manifest-audit`, off
  `46f187b3`): `packages/core/src/runtime/__tests__/command-manifest-audit.test.ts`,
  19 tests scoring every hand-maintained list against
  `new Runtime().getRegistry().getCommandNames()` in both directions — the four
  core lists (exact, modulo the four alias spellings in a shared `SPELLINGS`
  map), the LSP tier lists (read from language-server source text to avoid a
  package cycle), the capability lists, `COMMAND_KEYWORDS`, and the nine
  per-bundle `commands: [...]` arrays (zero ghosts; counts pinned). Absorbed and
  deleted `lsp-metadata.test.ts`. Landed GREEN, not red: every divergence is an
  explicit allowlist row naming its fixing step, and the headline counts test
  pins 23 (step 4.1) + 10 + 3 (step 4.2) + 4 (step 4.3). **One measured
  correction to this brief:** the Claim 3 table's "12" for template-capabilities
  is actually **13** — the table counted `if` as classified, but `if` sits in
  neither command list, exactly like `repeat`/`fetch` (all three are only in
  `AVAILABLE_BLOCKS`, split out as `CAPABILITY_BLOCK_ONLY`). Mutation-verified
  the three directions the old gates could not see: dropping `trigger` from
  `AVAILABLE_COMMANDS`, dropping `toggle` from `HYPERSCRIPT_COMMANDS`, and
  re-introducing `pushUrl` each fail the audit (the first two were measured
  SILENT pre-step-1). Also pinned: Finding 6's seed mutation and Claim 1's
  registration-call uniformity. Gates: core 7814 passing / 128 skipped / 300
  files, `verify:reference` clean, `typecheck` clean, prettier/oxlint clean.
  Next action: step 2 (the manifest, data-only, gated, consumed by nobody).
- 2026-07-28 — post-step-1 brief maintenance (docs-only PR): the step-2/3
  bundle-size gate was named **`npm run bundle-size`, which does not exist** in
  any package.json — corrected to `npm run snapshot:bundle-size --prefix
  packages/core` in the step-2 section and the gates table (verified: runs
  clean on `5fa21dd4`, all bundles within tolerance). Step 2's section also
  absorbed the step-1 knock-ons: reuse the audit's fixtures, couple the
  manifest's `unknown` set to `TIER_UNCLASSIFIED`, measure the two `category`
  sources (reference vs decorator) before choosing one, and
  `consolidationAliasOf` = the four `metadata.aliases` only.
- 2026-07-28 — **Step 2 landed** (branch `feat/command-manifest`, off
  `b83c26dc`): `packages/core/src/commands/manifest.ts`, 59 data-only entries
  (`name`, `category`, `tier`, `upstreamOrExtension`, `consolidationAliasOf?`,
  `multiword`), plus a 10-test §7 added to the step-1 audit file. **Imported by
  nobody** — verified by grep across all packages, which is the step's whole
  point. Every import in the manifest is `import type`, so it erases to one
  array literal; there is no `factory` field and the audit asserts the entry
  key set structurally, so Finding 9 is guarded by shape as well as by the
  bundle-size snapshot.
  Each field is a **checked mirror**, never a fresh copy: `category` vs the
  registry's `metadata.category`, `tier` vs `reference/index.ts` `availability`,
  `multiword` vs `COMPOUND_COMMANDS` (22, zero ghosts), `consolidationAliasOf`
  vs *implementation identity* (the four shared instances — `decrement`→
  `increment`, `replace`→`push`, `send`→`trigger`, `unless`→`if` — derived by
  identity rather than by re-reading `metadata.aliases`, since sharing one
  instance is what `command-adapter.ts` actually establishes), and
  `upstreamOrExtension` vs the LSP tier lists. The knock-on coupling is in
  place: the manifest's `unknown` set is asserted **equal** to the audit's
  `TIER_UNCLASSIFIED`, so step 4.1 must move both in one diff.
  The §7 gate was mutation-verified in 11 directions, all caught: dropping an
  entry (the omission direction Claim 3 says the old gates are blind to — 6
  failures), duplicating one, reordering one, a wrong `category`, a wrong
  `tier`, a dropped `multiword`, a wrong alias target, a removed alias,
  reintroducing a `factory` field, and classifying an `unknown` without touching
  `TIER_UNCLASSIFIED`. (One self-correction found by the mutation run: a
  duplicated entry **collapses** in a name-keyed Map, so the Map's size cannot
  see it — the array-length assertion is what rules it out.)
  Two measurements the brief asked for, both recorded above as **Finding 10**
  (the two `CommandCategory` unions; 57/59 agree) and as step-4 knock-ons
  (`metadata.compatibility` is a typed-but-empty slot on all 59 → step 4.1;
  `tier` and the capability lists are two different facts disagreeing on 16/59
  rows → step 4.2 must not derive one from the other).
  Gates: core **7824** passing / 128 skipped / 300 files, `verify:reference`
  clean (59 = 59, availability chain valid), `typecheck` clean, prettier +
  oxlint clean, and `npm run snapshot:bundle-size` — the Finding 9 guard — all
  10 bundles within tolerance.
  Next action: step 3 (the four mechanical consumers, one PR).
- 2026-07-28 — **Step 3 landed** (branch `feat/command-manifest-consumers`, off
  `051dd47e`): the four mechanical consumers migrated, two driven and two
  checked — see the table in the step-3 section. `parser-constants.COMMANDS` is
  `new Set([...COMMAND_NAMES, 'for'])`; `runtime.ts`'s 59 registration calls are
  one loop over the manifest against a private 55-entry `COMMAND_FACTORIES` map;
  `verify:reference` scores `commands/index.ts` AND `reference/index.ts` against
  the manifest instead of against each other (they used to be compared pairwise,
  so an omission shared by both passed clean).
  **Behavior preserved, measured not assumed:** a before/after registry oracle
  (name → class, `metadata.aliases`, category, shared-implementation groups)
  came back identical. The only two differences are intended —
  `getCommandNames()` enumeration order is now alphabetical rather than
  registration order (consumers sort it or use it for an error string), and the
  static parser seed gained `pseudo-command`, which is Finding 6's disagreement
  closing by construction. It is unreachable as a token anyway (`-` is not an
  identifier character), so nothing parses differently.
  **One measured constraint the brief did not anticipate, recorded above as
  Finding 11:** deriving the seed as `COMMAND_MANIFEST.map(e => e.name)` shipped
  the whole rich array into `hyperfixi-hx.js` — +4.8 KB raw, **+7.5%, a real
  failure of the ±5% bundle-size gate** on a bundle with no command registry at
  all. Finding 9's hazard one level down. Fixed with a `COMMAND_NAMES` literal
  asserted equal to the entries as an ORDERED list. Step 4's consumers want the
  rich entries, so this must be re-measured there, not assumed.
  Two knock-ons outside `packages/core`: `language-server`'s
  `command-tiers.test.ts` read core's `COMMANDS` literal by regex and now reads
  `COMMAND_NAMES` from the manifest (the better anchor — `COMMANDS` is the
  parser's set and carries `for`, while the file's title claims to check what
  the engine executes); and step 4.4's `runtime.ts` docstring half is already
  done (see that step).
  The §2 gate was mutation-verified in **11** directions, all caught: a deleted
  manifest entry, a deleted `COMMAND_NAMES` row with entries intact, a reordered
  `COMMAND_NAMES`, a removed `COMMAND_FACTORIES` entry, a miswired one
  (`toggle: createAddCommand`), a stray `registry.register()` outside the loop,
  `parser-constants` reverted to a hand-written literal that happens to match
  today, a dropped `commands/index.ts` factory export, a renamed
  `reference/index.ts` entry, a deleted `COMMANDS.add` in `command-adapter.ts`
  (Finding 6's mechanism), and a manifest name the LSP tiers still advertise.
  Gates: core **7827** passing / 128 skipped / 300 files; `verify:reference`
  clean (59 = 59); `snapshot:bundle-size` all 10 within tolerance; parser +
  runtime 1873 passing; language-server 223 passing; Playwright
  `src/compatibility/` 1111 passed / 8 skipped; typecheck, prettier, oxlint
  clean.
  **Note for step 4 on what the gate can no longer see:** the registry is now
  DERIVED from the manifest, so "manifest names == registry names" is close to a
  tautology. Two assertions carry that weight instead and must not be softened
  into derivations — the hardcoded 59-name list in audit §1, and the new
  per-command factory-identity test (each factory builds a command that calls
  itself what the manifest calls it, and each alias row resolves to its
  primary's instance with the alias declared in its `metadata.aliases`).
  Next action: step 4.1 (LSP tiers — 23 unclassified, the arc's one live defect).
