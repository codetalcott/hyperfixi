# Handoff: Arc E — generated static bundles

> **Status: brief written 2026-07-29, arc NOT started.** Every figure below was
> measured against main `bd0152e7` (the #828 merge) for this document; nothing
> is inherited from the queue paragraph or from Arc A's Finding 17 numbers
> without re-measurement. Companion to
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> § Arc E, which stays pointer-only. Prior art for the target state:
> [proposals/aot-compiler-design.md](./proposals/aot-compiler-design.md)
> (§4.1 command-specific codegen, §5.1 minimal runtime). The motivating case
> and its two rejected alternatives:
> [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md)
> § Finding 17.
>
> **Read § "The premise, corrected" before writing any code.** The queue says
> "4 semi-independent executors". Measured: there are **five**, the copies
> disagree on **13 of 24 shared command rows and all 5 block rows**, and one
> divergence is a **live shipped bug** (`take` throws a DOMException in
> `hybrid-complete`/`hx` on its most basic form — probe-confirmed below). The
> divergence table in § "The harvest" is the spec the generator must satisfy;
> generating from the templates as they stand would silently flip eight
> behaviors in the shipped bundles.
>
> Baseline at the #828 merge: core `test:quick` **7636 passing / 106 skipped /
> 298 files**; language-server **227**; vite-plugin **315**. Line refs will
> drift — re-verify by symbol (`grep -n`), not by number.

## The three oracles, settled up front

The first is not a parse. State all three in every step's PR body.

**Oracle 1 — EXECUTION.** Two instruments, with a coverage gap between them
that this arc must close:

- `bundle-generator/__tests__/capability-emission.test.ts` generates a bundle
  per advertised command, imports it, runs it against jsdom, and asserts the
  observable effect (12 tests, green on main). It covers **generated** bundles
  only.
- The Playwright bundle compatibility matrix
  (`src/compatibility/browser-tests/bundle-compatibility.spec.ts`, 8 bundles)
  covers the **shipped** bundles, but at feature level (toggle, show/hide,
  counter, modals, fetch, tabs, blocks, event modifiers) — not per-command.
  `take` appears nowhere in it, which is exactly how the take bug shipped.

Finding 13 escalated from parse to execution and found three defects a parse
tree cannot express; Finding 16's rule carries verbatim: **a correct-looking
DOM effect is not evidence the command ran — assert the thing the command is
FOR.** No executor row in the handwritten bundles has per-command execution
coverage today. Step 1 fixes that before anything is generated.

**Oracle 2 — the cmdMap-equality spec.** `capability-emission.test.ts` §4
(`coreCommandKeys()` / `templateCommandKeys()`, near `:380-391`) reads BOTH
cmdMaps from source text — `parser/hybrid/parser-core.ts` and the embedded
`HYBRID_PARSER_TEMPLATE` in `bundle-generator/parser-templates.ts` — and
asserts they are identical. Verified on main: both are the **same 35 keys**.
That assertion is the spec the parser-template generator must satisfy, and it
**retires into the generator — transform it, do not delete it** (the generator
inherits the check as its own invariant; the test then asserts the committed
output matches the generator, which is strictly stronger).

**Oracle 3 — bundle size, as a GATE for this arc, not a report.**
`scripts/bundle-size-snapshot.mjs --check` (±5% vs
`scripts/bundle-snapshots/baseline.json`) plus CI's absolute ceilings
(`.github/workflows/ci.yml`, "Check size limits" step, near `:1160`):
`MAX_LITE=4000`, `MAX_HYBRID=20000` — and `hyperfixi-hybrid-complete.js` AND
`hyperfixi-hx.js` **both** check against `MAX_HYBRID`. Measured state:

| Bundle | gzip (local baseline.json, 2026-07-29) | gzip (CI, Finding 17) | Ceiling | Headroom |
| --- | --- | --- | --- | --- |
| `hyperfixi-hx.js` | 19003 | **19019** | 20000 | **~980** |
| `hyperfixi-hybrid-complete.js` | 8382 | 8411 | 20000 | ~11.6 KB |
| `hyperfixi-lite-plus.js` | 2658 | — | (none) | snapshot only |
| `hyperfixi-lite.js` | 1967 | — | 4000 | ~2 KB |

The ±5% snapshot tolerance on hx is ~950 bytes — it binds **before** the
absolute ceiling. Any step that moves hx must regenerate `baseline.json`
(`--update`) in the same PR and say why in the PR body.

## The premise, corrected — five copies, not four

The queue's "4 semi-independent executors" (full runtime classes, lite-plus,
hybrid-complete, templates) misses `browser-bundle-lite.ts` (538 lines): its
own regex parser AND its own 8-command switch (`add remove toggle put set log
send wait`), structurally a fork of the same code lite-plus carries. The five,
measured:

| # | Surface | Parser | Executes (user-facing) | Notes |
| --- | --- | --- | --- | --- |
| 1 | full runtime command classes | full AST | 59 | canonical |
| 2 | `bundle-generator/templates.ts` | `parser/hybrid` (import or embedded template) | 35 keys = 34 commands (`removeClass` is internal) → **38 advertised** via 3 `COMMAND_ALIASES` (`push-url`, `replace-url`, `trigger`) + 5 blocks | feeds `generateBundle()` and the vite-plugin |
| 3 | `browser-bundle-hybrid-complete.ts` `:335` switch | `parser/hybrid` (import) | **24** commands (26 labels; `removeClass`/`waitFor` internal; `append/prepend`, `trigger/send`, `increment/decrement` share cases) + 5 blocks | re-exported by `hyperfixi-hx.js` |
| 4 | `browser-bundle-lite-plus.ts` `:294-697` | own regex (`:112-292`) | 16 commands (advertises 19: `show`/`hide` desugar to `.hidden` add/remove, `trigger` via alias) | |
| 5 | `browser-bundle-lite.ts` | own regex | 8 commands | fork of #4's shape |

Parser-side, the two cmdMaps agree (35 = 35, gated). The near-coincidence to
not trip over: `COMMAND_IMPLEMENTATIONS` also has 35 keys, but a *different*
35 — cmdMap has `trigger` (parser alias → `parseSend('on')`, emits a `send`
node), templates have `removeClass` (executor-side internal name the parser
emits for the class form of `remove`). Any "same count" check that doesn't
compare the sets is vacuous.

**Scope correction the queue needs:** the two regex bundles (#4, #5) cannot
consume the templates — the templates are `case` bodies over hybrid-AST
`CommandNode`s, and lite/lite-plus dispatch on regex-built `LiteCommand`
objects. Executor generation applies to #2/#3 (one source feeding both). The
lite family joins at the **boot-shell** step only. The honest statement of the
arc: *the two AST executors + templates collapse to one generated source; the
regex family keeps its (much smaller) executor surface but shares the shell.*

## The harvest — measured divergences, both directions

Method: extract each `case` block from hybrid-complete's two switches
(`executeCommand :335`, `executeBlock :670`), normalize comments/whitespace,
diff against the corresponding template string. #792's lesson holds for the
third time: **copies diverge in both directions — some divergences are the
canonical copy being wrong.**

**Byte-equal after normalization (11 rows):** `remove put get call send wait
show hide focus blur return`. **Formatting/shape-only:** `transition`, `log`,
`set` (equivalent branch shape), `append`/`prepend` (shared case vs per-name
template), `increment`'s amount default (parser always supplies the literal —
`parseIncDec` emits `{type:'literal', value:1}` when `by` is absent).

### D1 — LIVE BUG: `take` throws in shipped hybrid-complete/hx (probe-confirmed)

`browser-bundle-hybrid-complete.ts:572` passes `getClassName(await
evaluate(cmd.args[0], ctx))` — the EVALUATED value. The template passes the
NODE, with a comment recording that this exact difference was Finding 16's
take defect, fixed there and **not here**. Mechanism: `parseTake`'s argument is
`parseExpression()` → a selector node; hybrid-complete's `evaluate` on a
selector returns Element(s), never the string; `getClassName(Element)` → `''`;
`querySelectorAll('.' + '')` throws. Probe (jsdom, `api.execute('take
.active', me)` with a sibling carrying `.active`): **DOMException
`SyntaxError` (invalid selector `.`)** — the command's most basic documented
form. lite-plus's `take` passes the same probe (its regex hands the class
string through). Ships in `hyperfixi-hybrid-complete.js` and `hyperfixi-hx.js`
today; invisible to the Playwright matrix (no take row) and to
capability-emission (generated bundles only).

### D2 — hybrid-complete richer than the templates (generation as-is would DROP these)

**All four rows are now DECIDED — see § "Step 2 — CLOSED" for the reasoning and
the measured before/after.** Three absorbed, one declined.

| Row | hybrid-complete has | templates have | Step 2 |
| --- | --- | --- | --- |
| `toggle`/`add`/`removeClass` | `@attr` attribute toggling (`toggle @disabled`) | classList only — `@disabled` becomes a bogus class name | **absorbed** |
| `increment`/`decrement` | style-prop branch (possessive `*opacity`) | no style branch | **absorbed** |
| `fetch` block | `via <METHOD>` + `with <options>` (FormData, RequestInit merge) | url + responseType only | **absorbed** |
| `removeClass` | sets `ctx.it` to targets | returns targets without setting `ctx.it` | **declined** — the template is the copy Arc C endorses |

### D3 — templates richer than hybrid-complete (generation closes real gaps)

| Row | templates have | hybrid-complete has |
| --- | --- | --- |
| `halt` | `halt the event` form, arg evaluation, and a real halt-execution throw when no event | bare preventDefault/stopPropagation if `ctx.event`, never halts execution |
| `go` | `go to top/bottom` → `scrollIntoView` | url/back/forward only |
| `repeat`/`for`/`while` | catch `break`/`continue` control-flow exceptions | no catch — consistent with `break`/`continue` being executor orphans there |
| loop/if bodies | `executeSequenceWithBlocks` | `executeSeqPropagateReturn` — same intent, drifted names; reconcile in the shell/runtime prelude |

### D4 — the lite family's own semantics

lite-plus **desugars** `show`/`hide` to `remove .hidden`/`add .hidden` — a
different strategy from hybrid/templates (`style.display` + `.hidden`
removal). Not a bug (documented in its header as CSS-class-convention), but a
semantic difference the boot-shell step must not accidentally "fix".

**Rule for step 2:** every D2/D3 row is a *decision*, recorded in the PR body,
not a silent side effect of choosing which copy the generator reads. The
default posture: templates absorb D2 (superset), D3 stands as-is (templates
already the better copy), D1 is fixed by generation itself once the templates
are the source — but it should not WAIT for generation (step 1).

## Step 1 — CLOSED (#830 the gate + two fixes, #829 this brief)

`compatibility/shipped-bundle-execution.test.ts` exists now (602 lines, 10
tests, 43 surfaces) and is the INCUMBENT execution gate for the handwritten
bundles — **extend it, never write a second one.** Its completeness test is a
ratchet: a name added to a bundle's `commands`/`blocks` array without a surface
FAILS. D1 (`take`) is fixed — hybrid-complete now passes the NODE, matching the
template.

The gate found **two defects beyond the one the brief predicted**, and both are
recorded here because they lived only in #830's PR body and code comments until
now — #829 merged AFTER #830, so this brief never received them. That is the
exact rot this queue exists to fight.

### S1-a — hybrid-complete's `case 'trigger':` (`:474`) is UNREACHABLE DEAD CODE

The parser emits name `'send'` for all of `send`/`trigger`/`fire` —
`parseSend(marker)` hardcodes `name: 'send'`. This is **Finding 13's mirror,
inside the handwritten bundle**: the templates' `trigger` label was deleted for
this reason and a comment left in its place (`templates.ts`, above `put`), while
hybrid-complete's identical label survived.

It was load-bearing when added (2026-07-20 audit — `trigger` really was a silent
no-op then); Finding 13's parser work killed it silently. The sharp part:
`bundle-manifest-consistency.test.ts:73-76` **PINS it with a source-text
regex** — the *gate that locks the defect in* antipattern, now measured rather
than hypothesized. Deleting the label by hand would fail that gate, so it comes
out **structurally in step 4**, when the executor is generated and the manifest
gate's source-text assumption is retired with it.

### S1-b — `for x in #t.children` iterates ONCE for an N-element collection

The coercion is `Array.isArray(items) ? items : items instanceof NodeList ?
Array.from(items) : [items]`, and an **HTMLCollection satisfies neither arm**,
so it is wrapped as a single item. Present in BOTH copies (hybrid-complete
`:700`, the `for` template) — an agreement, not a divergence, so no D2/D3 row
sees it.

This is Arc D's deliberately-deferred array-like question
(`toElementListFiltered` vs `toElementListStrict`: `put` filters a mixed array
and gates on `instanceof NodeList`; `append`/`prepend` duck-type and accept an
HTMLCollection). It is therefore a **behavior change, not a step-2 refactor**.
The step-1 gate's `for` row deliberately uses a multi-match selector
(`for x in .item`) and records the gap in its comment.

### S1-c — `return` leaked its internal token out of the public API (fixed in #830)

Unpredicted by the brief, and the reason the gate earned its keep twice in one
sitting. `return` unwinds by throwing `{type:'return', value}`. **Three of four**
sequence entry points caught it — the event-handler path, the init path, and the
generated bundles' `executeAST` — but hybrid-complete's top-level sequence path
did not, so `hyperfixi.execute('return 42')` rejected with a bare internal
object (no `message`, not an `Error`) instead of resolving to `42`. Fixed at
`browser-bundle-hybrid-complete.ts:803`.

The generalizable shape: **a control-flow signal implemented as a throw needs a
catch at EVERY entry point, and "three of four" is invisible to any gate that
exercises one path.**

## Step 2 — CLOSED: the templates are now the superset

Three of the four D2 rows absorbed, one declined. Every row was measured in
BOTH copies before anything was written (#792's rule, applied for the fourth
time) — and that is what turned row 4 around.

### The four decisions

1. **`@attr` on `toggle`/`add`/`removeClass` — ABSORBED.** Measured before:
   `toggle @disabled on #t` left the attribute untouched and added a class
   literally named `disabled`; `remove @disabled` was a silent no-op. After: all
   three match hybrid-complete exactly.
2. **Style-prop `increment`/`decrement` — ABSORBED.** Measured before:
   `increment #t's *opacity by 0.25` was a **silent no-op** — no error, no
   effect, opacity unmoved — because the possessive fell through to the
   textContent path where `toElementArray` of an evaluated style value yields no
   elements. After: 0.5 → 0.75, matching hybrid-complete.
3. **`fetch` `via`/`with` — ABSORBED.** Measured before: the template
   destructured neither, so `fetch "/api" via POST with opts` issued a plain
   **GET with no body and reported success**. That is a wrong request shape, not
   a missing feature, which is what justifies the bytes.
4. **`removeClass`'s `ctx.it` — DECLINED, and this is the row that inverted.**
   The brief's default posture ("templates absorb D2") would have adopted
   hybrid-complete's `ctx.it = targets`. Arc C's contract says the opposite:
   `remove .active from #probe` leaves `it` at its initial value, pinned in
   `runtime/__tests__/command-output-contract.test.ts`, under the rule *a
   command sets `it` iff upstream sets `result` for it*. **The template was
   already the correct copy.** Absorbing would have added a NEW divergence from
   the canonical engine inside the arc meant to remove copies.
   **Consequence for step 4:** generating hybrid-complete from the templates
   REMOVES that assignment from the shipped bundle — a deliberate behavior
   change that must be restated in step 4's PR body, not discovered there.

### S2-a — the D2 table described case BODIES; two of three absorptions needed the SHELL

The harvest's method was diffing `case` blocks, so it was structurally unable to
see helper divergence. Two absorptions turned out to be **shell** changes, both
in `bundle-generator/generator.ts`, and either one alone would have made its
template a silent no-op:

- `getClassName` sliced EVERY selector, so `@disabled` arrived as `disabled` and
  the new `raw.startsWith('@')` branch could never fire. It now passes `@`
  through unsliced, matching hybrid-complete's helper.
- `getStyleProp` **was never emitted at all** — only `isStyleProp`/
  `getStyleName`/`setStyleProp`. Now emitted behind a new `STYLE_READ_COMMANDS`
  export (a strict subset of `STYLE_COMMANDS`: `set`/`put` only ever write), so
  the very common `put`-only bundle does not carry a getter it never calls.

Generalizable: **when a divergence table is built by diffing bodies, budget for
the helpers those bodies call.** Step 3 (the shared boot shell) is where these
helpers stop being a separate surface.

### S2-b — both bundle executors diverge from Arc C's `it` contract on ≥5 more rows

Found while scoring row 4. `toggle`, `add`, `put`, `append`/`prepend` and
`transition` all self-assign `ctx.it` in BOTH bundle copies, where the canonical
runtime sets nothing (`transition` deliberately, in Arc C's close-out). Because
the two copies **agree**, no D2/D3 row sees it — the harvest's method is blind to
a shared divergence from a third party.

Deliberately NOT fixed here: it is a behavior change to generated bundles across
five rows, and **no execution gate currently asserts `it` at all** (both gates
assert DOM effects and return values). It wants its own decision, like S1-b.

### S2-c — the `'js'` output format emits invalid JavaScript for 6 of 40 templates

`stripTypes()` has no rule for the non-null assertion (`block.condition!`,
`ctx.me.parentElement!` — `if`/`repeat`/`while`/`take`), for a bare `let x: any;`
(`fetch`), or for `const promises: Promise[] = []` (`transition`). Verified
byte-identical before and after step 2, so it is **pre-existing**, and
**nothing requests `format: 'js'` today** — every consumer takes the `'ts'`
default, which is why it has never surfaced.

Step 2 deliberately did not add to it: the new fetch code writes
`{} as RequestInit`, not `: RequestInit`, because `stripTypes` removes `as Type`
casts but has no rule for a `const x: Type =` annotation. That reasoning is
recorded in the template itself so the next editor does not "tidy" it back.

### Measured cost — GENERATED bundles only

The Oracle-3 claim was verified, not assumed: no shipped bundle entry imports
`bundle-generator` (the `rollup.config.mjs` hit is a library subpath entry, not a
size-gated browser bundle). Shipped sizes are unmoved; `hyperfixi-hx.js` does not
budge, as required.

| Generated config | before | after | delta |
| --- | --- | --- | --- |
| full 35 cmds + 5 blocks | 31740 raw / 7375 gz | 34105 / 7766 | **+2365 / +391** |
| hybrid-complete-equivalent 24+5 | 25579 / 5951 | 27944 / 6345 | **+2365 / +394** |
| typical vite bundle (5+1) | 14735 / 3742 | 15395 / 3875 | +660 / +133 |
| `put` + `fetch` block only | 13738 / 3672 | 14458 / 3886 | +720 / +214 |

Unminified generator output; the shipped rollup+terser pipeline lands lower.
Note the `getClassName` `@` branch lands in EVERY generated bundle (it is an
unconditional shell helper), which is why even a `put`-only bundle moves.
Its explanatory comment was deliberately cut to one line for the same reason —
emitted shell code is shipped bytes, and the rationale belongs in `templates.ts`
and here, not in every user's bundle.

**Step 4's budget is now tighter than Finding 17 measured it.** The orphan cost
re-measures at **+1421 gz** (24+5 → 35+5 on the current templates), consistent
with Finding 17's +1433 — but step 2 adds a further **~+390 gz** to the executor
core that step 4 will generate. The `MAX_HYBRID` → 22000 recommendation still
looks adequate against `hyperfixi-hx.js`'s 19003-baseline gzip, but step 4 must
**re-measure rather than inherit** it.

### Gate

`capability-emission.test.ts` gained a `CAPABILITIES` list (7 rows) kept separate
from `SURFACES`, whose one-row-per-advertised-command completeness ratchet
depends on being exactly 1:1. `toggle` gets **both** directions, because a
`toggle` that only ever removes passes an adding-only row. Each row also asserts
the *bogus class did not appear* — the literal defect shape, not a proxy for it.

Mutation-verified, 7 for 7: reverting the `getClassName` `@` branch, deleting
either style branch, dropping `via`, dropping `with`, and un-emitting
`getStyleProp` each fail **only** the new capability test (12 other tests stay
green, so none is an incidental compile crash). The `getClassName` mutation
names exactly the four `@attr` rows.

## Step 3 — CLOSED: the shared boot shell, and the shells that were not counted

The step's own premise was the first thing to fail re-measurement, in the way
this arc keeps re-learning. The brief said four shells (hybrid-complete, lite,
lite-plus, the generator). Measured: **seven emission sites across two
packages** — the three handwritten bundles, core's
`bundle-generator/generator.ts`, and **three more in `@hyperfixi/vite-plugin`**
that no one had counted: `generator.ts`'s main shell, its separate
empty-bundle shell, and `compiled-generator.ts`'s AOT shell. The union was
taken by executing the modules and reading `Object.keys(api)`, not by reading
source — a count-only or one-side diff would have missed three of the seven.

### The measured union (this replaces the brief's step-3 sentence)

| key | hybrid-complete | lite | lite-plus | core-gen | vite main | vite empty | vite compiled |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `version` `parse` `execute` `init` `process` `commands` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (stubs) | partial |
| `blocks` | ✓ (7) | — | — | conditional | conditional | — | — |
| `run` `eval` `parserName` | — | — | — | ✓ | ✓ | ✓ | — |
| `tokenize` `evaluate` | ✓ | — | — | — | — | — | — |
| `addAliases` `addEventAliases` | ✓ | — | ✓ | — | — | — | — |
| `window._hyperscript` | — | — | — | ✓ | ✓ | ✓ | ✓ |

Two of the brief's step-3 claims were wrong: `addAliases`/`addEventAliases` are
on lite-plus too (not hybrid-complete alone), and the `compiled-generator`
shell has neither `parse` nor `execute` — `hyperfixi.execute(...)` is undefined
on an AOT-compiled vite bundle while every other bundle has it. That last one
is left filed, not fixed: it is a capability gap in the compile-mode runtime,
not a shell divergence.

### The decisions — the union was NOT unioned

Scored per family, and the rule that fell out is worth carrying: **an extra
survives where a consumer or gate witnesses it, and is removed where nothing
does.** Unioning all fourteen keys into all seven shells would have put
unrequested API into four shipped bundles and into every bundle the vite-plugin
emits — the step-2 `getClassName` comment-trim trade, at larger scale.

1. **hybrid-complete gains `run`/`eval`/`parserName`? DECLINED.** Nothing reads
   them on a handwritten bundle, and `hyperfixi-hx.js` spreads
   hybrid-complete's api wholesale (`browser-bundle-hybrid-hx.ts:171`), so any
   addition is user-visible API on **two** shipped bundles. Scoring found the
   inverse of what "dead code" would predict: `parserName` is NOT dead — it is
   read by `examples/vite-plugin-test/main.js` and
   `examples/vite-plugin-multilingual/main.js`, AND it is the regex anchor the
   vite-plugin splices semantic api props after (`generator.ts:765`,
   `/parserName: '(?:lite|hybrid)',/`). A rename there breaks the semantic
   bundle path silently.
2. **The emitted shell gains `tokenize`/`evaluate`/`addAliases`/
   `addEventAliases`? DECLINED.** Bytes in EVERY generated bundle for API
   nothing requests; `tokenize` would additionally force a parser-core import
   into a path that is deliberately self-contained.
3. **Does any hybrid bundle set `window._hyperscript`? NO — and the four that
   did, stop.** This is the step's one behavior change. Measured against
   `hyperscript.org@0.9.93`: `_hyperscript` is a **callable function**
   (`_hyperscript('1 + 1')` → `2`) carrying `evaluate`, `processNode`,
   `internals`, `config`, `addCommand`, `addFeature`. The bundle `api` is a
   plain object with none of them. On a page loading both, last-write-wins; if
   the generated bundle won, `_hyperscript(...)` threw "not a function",
   `.evaluate` was undefined, and `parse`/`process` — the only overlapping
   names — silently did something else. No shipped handwritten bundle ever did
   this and **no test in either package asserted it**, which is why it survived
   in four emitters. The convergence is toward the shipped bundles' behavior.
4. **`eval` KEPT on generated bundles.** Redundant alias of `execute` with zero
   consumers, but removing published API is a breaking change with no defect
   behind it — unlike `_hyperscript`, which actively breaks a third party.

### S3-a — the shared helper was measured, and the obvious design REJECTED

The natural reading of "one helper" is a factory that takes an options object
and returns the api. Built, measured, reverted: **+103 bytes gzip on
`hyperfixi-hybrid-complete.js`, +63 on `hyperfixi-hx.js`.** Terser inlines the
call but cannot collapse the two object literals or the property indirection
through the options bag, and since every bundle is rolled up independently the
indirection buys no sharing at runtime — it is pure overhead in four shipped
bundles.

What shipped instead shares only what is genuinely identical — the `[_]` scan
loop (`createProcessElements`) and the global install (`installBundleGlobal`) —
while each bundle keeps a flat api literal typed as `BundleShellApi<TAst>`.
Final cost: hybrid-complete **+27 gz**, hx **+22 gz**, lite +33, lite-plus +34.
The generalizable half: **the anti-drift property comes from the GATE, not from
the indirection.** Once `bundle-shell.test.ts` pins the key sets, the factory
was buying nothing the type and the test did not already buy, for 4× the bytes.

### S3-b — a gate row that measured nothing, caught by mutation testing

The first version asserted "a scan error is contained, not thrown" by feeding
each shell gibberish. Mutation testing (replace the `catch` with `throw err`)
left it **green**: neither the regex nor the hybrid parser throws
*synchronously* on malformed source — they degrade and return a node, and the
executor's rejection is an un-awaited promise. The row was exercising nothing.

Replaced with five tests against `createProcessElements` directly, injecting a
throwing parse and a throwing run. This is Finding 16's rule arriving from a
new direction: it is not enough to assert a real effect, the input must be
capable of PRODUCING the failure the assertion describes. **11 of 11 mutations
now fail their intended test and nothing else** (verified individually, so none
is an incidental compile crash).

### Gate — step 3

`compatibility/bundle-shell.test.ts` (37 tests) pins each shell's key set as
**set equality, both directions** — an ADDED key fails too, which is what makes
it a ratchet — plus what every core export is FOR (`execute` applies a DOM
effect, `init` wires elements under a root, `process` IS `init`, `blocks`
present iff the bundle has blocks) and what each witnessed extra is for
(`addAliases` makes the alias actually execute). `vite-plugin/src/
emitted-shell.test.ts` (4 tests) covers the three sites a core-side gate cannot
see. Both sides assert the `_hyperscript` absence, since neither can see the
other's emitters.

### Measured cost — SHIPPED bundles only

Only the four slim bundles moved; the six full bundles are untouched.
`baseline.json` was updated **for those four entries only** — a blanket
`--update` would have absorbed the +0.3–0.8% raw local-vs-recorded drift the
full bundles already show into the committed numbers, blinding the gate to it.

## Finding 17, restated with the arc's numbers

The shipped hybrid bundles PARSE 35 commands and EXECUTE 24. The 11 orphans —
`beep break continue copy empty exit js morph push replace throw` — cost +388
bytes gzip (hybrid-complete) / +386 (hx) in parser rules that only reach
`default:` → `Unknown command: X`. The two rejected alternatives (split the
parser; hand-add 11 cases) are recorded in the manifest brief § Finding 17 —
the second is also a fifth copy of the thing this arc deletes.

**Cost of closing it, measured fresh:** `generateBundle()` with
hybrid-complete's 24 commands + 5 blocks vs the full 35 + blocks:
**+6161 bytes raw / +1433 bytes gzip** (unminified generator output; the
shipped rollup+terser pipeline will land lower, but the order of magnitude is
right — parser rules were ~35 B/command gz, executor cases are ~130 B/command
gz). hx at 19019 + ~1.0–1.4 KB **breaches MAX_HYBRID=20000 and the ±5%
snapshot**. So the step that closes Finding 17 carries, deliberately and in
the same PR: `MAX_HYBRID` → a stated new ceiling (**recommend 22000**; also
mirrored in `pre-publish-check.yml`, which the ci.yml comment says stays
aligned), a `baseline.json --update`, and the advertised-count ripple —
hybrid-complete's `commands: [...]` array 24 → 35 drives
`compatibility/bundle-sources.ts` → `verify:reference` → `metadata.ts`
counts, all of which move together or the reference gate fails.

## The steps — one PR each, merged before the next

The queue's order (shell → generate executors → drift guards → generate parser
template) survives with one insertion at the front: the execution oracle and
the divergence decisions must land BEFORE generation, or generation is a
behavior change wearing a refactor's commit message.

**Step 1 — per-command execution gate for the SHIPPED bundles + the take fix.**
Extend the capability-emission harness pattern to `browser-bundle-
hybrid-complete.ts` and `browser-bundle-lite-plus.ts` public APIs (they are
importable modules; the probe in this brief is the seed). One row per
advertised command, asserting what the command is FOR (Finding 16). This gate
FAILS on main today at `take` — fix take in the same PR (node-not-value, the
template's shape, one line) rather than pinning a known crash. Gates: the new
suite; sizes unmoved (fix is bytes); mutation-verify the new gate (re-break
take, watch it fail).

**Step 2 — reconcile D2/D3 into the templates as the superset.** Absorb
hybrid-complete's `@attr`, style-prop inc/dec, and fetch `via`/`with` into the
templates; adopt `ctx.it` policy per row against Arc C's contract; leave D3 as
the templates already have it. Every absorbed capability gets a
capability-emission row. Affects GENERATED bundle sizes only (vite-plugin
users) — snapshot the delta in the PR body. After this step the templates are
the undisputed best copy of every row they carry.

**Step 3 — shared boot-shell helper. CLOSED — see § "Step 3 — CLOSED" above
for the measured union, the four decisions, and the two findings.** The
paragraph that stood here undercounted the shells (four; there are **seven**,
three of them in `@hyperfixi/vite-plugin`) and misattributed
`addAliases`/`addEventAliases` to hybrid-complete alone. Outcome in one line:
the union was deliberately NOT unioned — extras stay where a consumer or gate
witnesses them — the shared helper covers only the `[_]` scan loop and the
global install (the api-building factory was measured at +103 gz and
rejected), and `window._hyperscript` is gone from all four emitters that
claimed it.

**Step 4 — generate the hybrid-complete executor core; commit output with a
`--check` drift guard.** `generateBundleCode()` already emits the whole file
shape (parser import via `parserImportPath`, runtime, shell, autoInit) — this
step points it at the reconciled templates + shared shell and commits the
output as the `browser-bundle-hybrid-complete.ts` entry (script under
`scripts/`, `generate:bundles` + `generate:bundles:check`, wired into CI's
"Check generated artifacts are in sync" step beside `docs:commands:check`).
The generated output must be **prettier-idempotent** (prettier pinned 3.9.5,
no CI format gate — #828 fixed exactly this for the docs generator; a
non-idempotent generator makes its own `--check` unusable). **This is the step
that closes Finding 17** — the generated executor covers all 35 — and it
carries the deliberate ceiling/baseline/count changes bundled above, stated in
the PR body. Playwright matrix + step-1 gate + capability-emission all run
against the result.

**Step 5 — generate `HYBRID_PARSER_TEMPLATE` from `parser-core.ts` source.**
`vite-plugin/src/generator.ts:149` embeds the template; core's
`generateBundle()` imports parser-core directly — the two-copy risk is the
vite-plugin path. Generate the template from parser-core source text at build
time (or emit it as a build artifact the vite-plugin imports), and retire
Oracle 2's assertion INTO the generator per the queue. The `catch`/`finally`
drift test (`parser-template-drift.test.ts`) retires the same way.

Steps 1–2 are also independently shippable value if the arc stalls: a
per-command execution gate on shipped bundles + a fixed take + superset
templates stand on their own.

## Constraints, verification discipline, gates

Both measured constraints from the queue hold and are quantified above (§
oracles, § Finding 17). Carried discipline, verbatim from Arcs A/B:
mutation-verify every new gate including vacuous-at-landing ones; diff the
UNION of key sets (a before-side-only iteration is blind to additions — and
the trigger/removeClass near-coincidence above is where a count-only check
lies); baselines from the MERGED PARENT commit; capture a gate's exit status
before any pipe. Concurrent-session hazard: `git branch --show-current`
before starting AND committing; branch with `git checkout -b <name> main`.

Gates for every step: `npm run test:quick --prefix packages/core` (7636/106/298
at baseline), `verify:reference`, `typecheck`, `snapshot:bundle-size`
(`--check`), `docs:commands:check`, `npm test --prefix packages/language-server`
(227), `npm run test:check`, and `cd packages/core && npx playwright test
src/compatibility/` (~1112 pass in CI; locally 1102 passed / 8 skipped / 10
failed is the expected shape — behaviors-demo, i18n-htmx, swap-debug failures
are a local artifact). The queue also names `dist-charset-safety` and
`bundle-manifest-consistency` for steps that touch dist output.

## Adjacent, deliberately not taken here

Finding 15's two behavior calls (multilingual ships 52 not 59; minimal
registers 11 advertising 10) stay filed in the queue — same neighborhood,
separate decisions. F-B1 (`command-adapter.ts` shadow `CommandMetadata`) and
the `isBlocking`/`hasBody` false claims likewise. The lite family's
show/hide desugar (D4) is documented behavior, not a defect to fix in passing.
