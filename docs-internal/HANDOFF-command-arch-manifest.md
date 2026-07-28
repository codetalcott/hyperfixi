# HANDOFF — command-arch Arc A: the command manifest

> **Arc brief, written 2026-07-28.** Detail for Arc A of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc).
> Format follows [HANDOFF-command-arch-output-contract.md](./HANDOFF-command-arch-output-contract.md)
> (Arc C, complete) and [HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md)
> (Arc D, complete).
>
> **Status: BRIEF WRITTEN, ARC NOT STARTED.** Next action: step 1 PR.
>
> **This brief REVISES the queue doc's Arc A plan — specifically its migration
> ORDER and its manifest SHAPE.** Three of the paragraph's claims were measured
> rather than inherited, and two did not survive. Read
> [What changed](#what-changed-vs-the-queue-docs-plan) before following the
> queue's wording.

## Verified state (2026-07-28, main `b69bc035`, working tree clean)

Line refs will drift — re-verify by symbol (`grep -n`), not by number.
Baseline for the arc: **7795 passing, 128 skipped, 298 files** (`npm run test:quick --prefix packages/core`).

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

### Finding 5 — a new ghost class, in a list the queue does not name

`lsp-metadata.ts` `COMMAND_KEYWORDS` advertises **`pushUrl`** and
**`replaceUrl`**. Neither parses:

```text
REJECTS  pushUrl "/x"        PARSES  push url "/x"
REJECTS  replaceUrl "/x"     PARSES  replace url "/x"
```

This is precisely the `transfer` class that motivated `command-tiers.test.ts`,
alive in a sibling list that has **no ghost test**. `COMMAND_KEYWORDS` feeds
`ALL_KEYWORDS` (`lsp-metadata.ts:212`), which `language-server/src/server.ts:1544`
uses as its canonical keyword list — so the LSP offers two completions the engine
rejects. Six registered commands (`process`, `pseudo-command`, `push`, `replace`,
`scroll`, `start`) are missing from the same list.

**Recommend fixing the two ghosts as their own small PR ahead of the arc**, the
way `unless` was landed ahead of Arc C: it is a live LSP defect that is only
incidentally Arc A's, and the arc's audit will otherwise carry it as a red row
for several PRs.

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

Verify with `npm run bundle-size` (`scripts/bundle-size-snapshot.mjs --check`,
±5%) that importing the manifest anywhere costs nothing.

### Step 3 — migrate the mechanical consumers

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

### Step 4 — the decision-bearing consumers, one PR each

Each carries an explicit classification decision for its gaps, and each flips its
step-1 audit rows so the diff is the review artifact:

1. **LSP tiers** (23 unclassified; live false negative). Classify against a
   `_hyperscript` checkout — the Arc C step-2 oracle.
2. **template-capabilities** (12 unclassified; latent). Also decide the
   `COMMAND_IMPLEMENTATIONS` second-list overlap.
3. **`COMMAND_KEYWORDS`** (6 gaps) — assuming the two ghosts already landed
   separately per Finding 5.
4. **`packageInfo.commands`** as a derived value; fix the drifted "48/58/59"
   docstrings (`runtime/runtime.ts` has "48 commands" in **six** places, plus
   undercounting per-category group comments — e.g. "DOM Commands (11)" above 15
   registrations, "Phase 6-5 Commands (6)" above 7) as the derived values land.

### Deferred out of the arc, deliberately

- **The synonym-alias divergence** (Finding 7) — a behavior change wanting its
  own decision, like Arc D's element-list follow-up.
- **The `COMMAND_ALIASES` duplication** — real, but not yet drifted; it should
  fold into the manifest only once Finding 7 is decided.

## Gates, per step

| Step | Suites | Command |
| ---- | ------ | ------- |
| all | quick validation (baseline **7795**) | `npm run test:quick --prefix packages/core` |
| all | the reference gate | `npm run verify:reference --prefix packages/core` |
| 1 | the new audit test itself | added in the step-1 PR |
| 2, 3 | bundle size — the tree-shaking guard | `npm run bundle-size` (`--check`, ±5% vs `baseline.json`) |
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
- **Registration mutates `COMMANDS`** (Finding 6). A test that reads
  `parser-constants.COMMANDS` *after* any test in the same file constructed a
  Runtime sees 60, not 59. Read the list from source text, or assert before
  construction — `capability-ghosts.test.ts` imports the live Set and is exposed
  to this ordering.
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
