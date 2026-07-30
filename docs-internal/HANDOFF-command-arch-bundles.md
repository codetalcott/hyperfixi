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

| Row | hybrid-complete has | templates have |
| --- | --- | --- |
| `toggle`/`add`/`removeClass` | `@attr` attribute toggling (`toggle @disabled`) | classList only — `@disabled` becomes a bogus class name |
| `increment`/`decrement` | style-prop branch (possessive `*opacity`) | no style branch |
| `fetch` block | `via <METHOD>` + `with <options>` (FormData, RequestInit merge) | url + responseType only |
| `removeClass` | sets `ctx.it` to targets | returns targets without setting `ctx.it` |

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

**Step 3 — shared boot-shell helper.** The queue says the shells "differ only
in their commands/blocks arrays and alias-registration identity" — measured,
they also differ in: `tokenize`/`evaluate` exports and `addAliases`/
`addEventAliases` (hybrid-complete has them; the generator's emitted shell
does not), `run`/`eval`/`parserName` and the `window._hyperscript` global
(generator has them; the handwritten shells do not). Decide the union surface
once, in one helper consumed by the generator and both handwritten families
(lite/lite-plus join here). `hyperfixi-hx.js` imports hybrid-complete's
default export (`browser-bundle-hybrid-hx.ts:35`) — its API surface is a
consumer to keep green.

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
