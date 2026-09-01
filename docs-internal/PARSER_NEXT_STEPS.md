# Core parser — next steps

> **Entry point, written 2026-07-27.** Standing queue for the **core parser**
> track (`packages/core/src/parser/`), the counterpart to
> [MULTILINGUAL_NEXT_STEPS.md](MULTILINGUAL_NEXT_STEPS.md). Read this first, then
> the linked HANDOFF for per-defect detail.
>
> **Pointer-only by design.** Never restate a repro or a diagnosis here — that is
> what the HANDOFF docs are for, and duplicated detail is the first thing to rot.
> One line per item; the linked source is authoritative.
>
> Not scoped to a release. Nothing below is release-blocking; these are
> correctness papercuts in a shipped parser. Tying them to a version means either
> the version slips and this lies, or they defer and this rots — which is exactly
> how [PARSER_FIX_STATUS.md](PARSER_FIX_STATUS.md) died (its name promised an
> index, it delivered a six-month-old snapshot of one already-fixed defect).

## Read this before triaging anything below

**Which entries are load-bearing.** Two of these are protected by a gate that
fails loudly on its own; the rest can be lost entirely. Know which you are
looking at before deciding what to work on — and do **not** "tidy up" the gated
ones, because the gate *is* the tracking mechanism.

| Item | Severity | Gate | Detail |
| ---- | -------- | ---- | ------ |
| **Or-join filters have no per-event representation** | low — `on click or keypress[key=='Enter']` runs keypress unfiltered (upstream filters that leg); single-event filters ARE enforced | ✅ KNOWN GAP test | `packages/core/src/api/event-filter-execution.test.ts`; the runtime-side note at the `applicableCondition` site in `runtime-base.ts` |
| ~~**`tell` never consumes a terminating `end`**~~ | **FIXED 2026-08-01** — tell consumes its own `end`; the real damage was nested (post-`end` commands escaped `if`/`repeat` bodies), not the filed "no block form" | ✅ `tell-to-and-end.test.ts` | history below |
| ~~**`tell <target> to <command>` drops the `tell` wrapper**~~ | **FIXED 2026-08-01** — optional `to` consumed after the target (deliberate superset; upstream rejects the form, but hyperfixi's error recovery turned the throw into the silent retarget) | ✅ `tell-to-and-end.test.ts` (mutation-verified both halves) | history below |
| **`set <idref> to <value>` / js property-path args no-op** | medium — silent no-effect on shipped pages | ✅ execution-gate allowlist entries | families 1/6 in [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md) |
| ~~**`for <duration>` tail rejected on `toggle` / `wait`**~~ | **BOTH FIXED** — toggle via `parseTemporalTail` (2026-07-31); wait via #850's duration alternatives in the `for` loop (`wait for click or 1s` races event vs timeout) — **the table below still listed the wait half as open a day after it shipped** | ✅ `wait-event-or-duration.test.ts` + toggle temporal tests | history below |
| ~~**`transition` rejects a POSSESSIVE property target**~~ | **FIXED 2026-07-31** — optional leading target in `parseTransitionCommand` (all four shapes), emitting the `[target, property]` args the runtime already discriminated on | e2e tests, both paths | `packages/core/src/commands/animation/__tests__/transition-target.test.ts`; history below |
| ~~**`process partials … using view transition` mis-parses**~~ | **FIXED 2026-07-31** — `parseProcessCommand` + dispatch case, runtime raw-keyword rewrite, `process` added to `skipSemanticParsing`; the same unconsumed tail was also fixed on `swap` | ✅ COMPOUND_COMMANDS coverage gate | `packages/core/src/parser/__tests__/compound-command-coverage.test.ts`; history below |
| ~~**`take <class> from <source>` rejected**~~ | **FIXED 2026-07-31** — `parseTakeCommand` + runtime rewrite (upstream ownership-transfer semantics), `take` added to `skipSemanticParsing` with its toggle/add/remove siblings | e2e tests, both paths | `packages/core/src/commands/animation/__tests__/take-from-for.test.ts`; history below |
| **`as <type>` is dropped from `set`'s value** (semantic parser) | medium — `set ^user to attrs.data as JSON` parses, and the conversion lands in NO role: the parse keeps `patient: expression "attrs.data"` and `as JSON` appears nowhere. Because both sides of every comparison are equally truncated, the row scores **faithful in all 23 languages** — the same vacuous-reference shape as #970 `unless` and #971 `when … changes`, and the fifth of that family. | ⚠️ NONE directly. The corpus writer now refuses to translate such a body (`reRenderPreservesContent`, `patterns-reference/src/sync/markup-attributes.ts`), so `component-with-attrs` stays English in 23 languages and is visible as 23 rows in the `i18n-kept-rows` baseline — an indirect, shrink-only signal, not a test. | Found 2026-08-27 while burning down the kept-row ratchet. Repro: `render(parseSemantic('set ^user to attrs.data as JSON','en').node,'en')` → `set ^user to attrs.data`. Compare `asExpression` handling on the value side of `set` with the working `put … as …` path. |
| ~~**`js(...) … end` bodies are not lexed as an OPAQUE span**~~ | **FIXED 2026-08-27** — and NOT in the base tokenizer: the opaque-span mechanism already existed (`consumeJsBlock`), and the filing's prescription would have duplicated it. What was missing was everything around it — the body was re-spaced by a `join(' ')` rebuild, the closing `end` was only emitted when a sibling followed, a pre-posed patient marker (he `את`, zh `把`) was swallowed into the body, the verb-FINAL SOV shape was never recognized, and the body was run through `localizeValueInterior`, i.e. the JavaScript itself was translated. Cleared 19 kept rows (js-inline ×3 + behavior-removable ×16), zero newly kept. | ✅ `js-block-round-trip.test.ts` (79 assertions), plus the two render allowlists and the kept-row ratchet | `MULTILINGUAL_NEXT_STEPS.md` 2026-08-27m. **Residual:** `js(args) … end` still stops at the `(` in twelve languages (es, id, it, ms, pl, pt, ru, sw, th, tl, uk, vi) — pinned as an exclusion list in that test file. |
| `and` is not a command separator anywhere | low — consistent everywhere, so no surprise | ✅ 2 `KNOWN GAP` tests | `packages/core/src/parser/__tests__/then-as-separator.test.ts` |
| `sortable-list.html` recovers with errors | low — one shipped example | ✅ allowlist ratchet | `packages/testing-framework/baselines/shipped-sources-validity.json` |
| **19 documented command examples do not parse** | medium — every one is advertised by the command's own `metadata.examples`, so it reaches the LSP, the generated docs and `commands.json`. **Re-triaged 2026-08-31** (the count was 15 here and the framing was wrong): 4 are harness artifacts that parse fine inside a feature, 4 are brace-block `repeat` docs defects that MISPARSE when wrapped, 3 name a non-command, 5 are declared-but-unimplemented syntax, 2 are a real parser bug, 1 is a bare-only `then` seam. | ✅ `documented-examples.test.ts` (ratchets both ways, pins each failure MODE) | the "19 documented `metadata.examples`" section below |
| **`install X on <selector>` does not parse** | medium — `install Draggable on me` and `install Draggable on the first <div/>` BOTH parse; `on #box` and `on <#box/>` do not, and a plain selector is the form the command's own `syntax` line shows | ✅ allowlisted in `documented-examples.test.ts` | found 2026-08-31 in the 19-example triage |
| **`show <x> in <scope> when <cond>` drops both clauses** | **medium-high — upstream ACCEPTS it and we silently truncate.** `examples/behaviors/recipes.html` ships it, and shows every blockquote where upstream filters. The highest-value open parser gap: real, with an oracle, on a shipped page. | ✅ allowlist entry in `shipped-sources-validity.json` carrying the measured upstream verdict | found 2026-08-31 once the parser began reporting discarded input |
| **`recovered` false-positives on single-line `if`** | medium — blocks using `recovered` as a gate signal. `if x > 5 then add .active` parses CORRECTLY and still reports `Expected 'end' after if block`; 11 corpus sources are in this state, and it predates the diagnostics work. Measured: strengthening `documented-examples.test.ts` to reject `recovered` takes it from 19 to 27 failures, **all 8 additions being this false positive**. | ⚠️ NONE — it is noise IN a signal, so no gate can see it | found 2026-08-31 while measuring whether the new gate could be strengthened |
| ~~**A dropped handler body is silently discarded**~~ | **REPORTED 2026-08-31** — `on click qqqq` compiled to `ok: true` with an EMPTY handler and zero diagnostics; a typo gave you a handler that silently does nothing. Five sites across TWO functions now record it via `recovered`. | ✅ `then-as-separator.test.ts` pins one diagnostic; `shipped-sources-validity.json` carries the four shipped sources it exposed | section below |
| ~~**Semantic-first parsing breaks `and` in a command's arguments inside a handler**~~ | **FIXED 2026-08-30** — one word. `and` was in `skipToCommandBoundary()`'s boundary list and is not a command separator anywhere in this engine. The analyzer had already reported `tokensConsumed: 4` at confidence 1 for `log 1 and 2`; the resync stopped at the `and` anyway. | ✅ `packages/core/src/parser/__tests__/semantic-resync-and.test.ts` (14 assertions, mutation-verified: restoring the word reddens 8) | section below |

### ~~`and` in a semantically-parsed command's arguments~~ — FIXED (2026-08-30)

**Live in the shipped default configuration** (`config.semantic === true`).
Found by ENGINE_MIGRATION_PLAN Arc 1 step 5, which diffed every corpus source
parsed with semantic-first against the same source parsed traditionally.

```text
hyperscript.compileSync('on click log 1 and 2')
  -> ok: false, "Unexpected token: 2"
hyperscript.compileSync('on click log 1 and 2', { traditional: true })
  -> ok: true
```

Measured shape:

| Source | Result |
| ------ | ------ |
| `on click log 1 and 2` | **FAIL** `Unexpected token: 2` |
| `on click log "a" and "b"` | **FAIL** `Unexpected token: "b"` |
| `on click log 5 is between 1 and 10` | **FAIL** `Unexpected token: 10` |
| `log 5 is between 1 and 10` (no handler) | ok |
| `on click if 5 is between 1 and 10 then add .x end` | ok |
| `on click log 5 is between 1 and 10 then log "x"` | ok |
| `on click toggle .a and .b` | ok — `toggle` is on the skip list |
| `on click set x to 1 and 2` | ok — `set` is on the skip list |

So it is **not** about `between`, and not about any one command. The mechanism:

1. `parseCommandCore` tries the semantic analyzer first for every command NOT
   in its 27-entry `skipSemanticParsing` list.
2. The analyzer matches a PREFIX of the argument (`log 1`) and reports success.
   Its `unconsumed-input` diagnostic — which `multilingual/bridge.ts` already
   knows to read — is not consulted here.
3. `skipToCommandBoundary()` then advances the token stream until it hits one of
   `then`/`and`/`else`/`end`. It stops at the `and`.
4. The handler's statement loop resumes there and tries to parse `2` as a new
   command.

The three passing rows are the same mechanism seen from the other side: the
skip-list commands never enter step 1, and `… then log "x"` gives step 4
something it can parse.

**Blast radius** is the 28 generic-loop commands plus every other command absent
from the skip list — `log`, `call`, `get`, `append`, `prepend`, `throw`,
`return`, `beep` among them.

**Why nothing caught it.** The multilingual gates all run through
`patterns.db` rows, whose English side is authored to parse; the core suite
tests handlers and tests `and`, but never a handler-wrapped, semantically-parsed
command with `and` in its arguments. It needed a differential measurement of
the two parse paths over one corpus, which is what Arc 1 step 5 is.

**FIXED the same day — and by neither of the two fixes proposed below.**

`and` had no business in `skipToCommandBoundary()`'s boundary list in the first
place: it is not a command separator anywhere in this engine, which
`then-as-separator.test.ts` already pins as a KNOWN GAP. The analyzer had been
telling the truth all along — `tokensConsumed: 4` at confidence 1 for
`log 1 and 2` — and the resync stopped at the `and` regardless. Deleting the
word is the entire fix.

Verified: a 14-assertion regression gate (mutation-verified — restoring the word
reddens 8 of 14), the full core suite, the multilingual `--regression` gate run
locally across all eleven signals with **no regression** and average confidence
UP in several languages, plus the testing-framework and hyperscript-adapter
suites.

The reasoning is recorded because it is reusable: both proposed fixes below were
sound, and both were unnecessary, because neither had asked whether the boundary
list itself was right. The band-aid warning stands regardless.

**Do not band-aid this by adding `log` to `skipSemanticParsing`.** That list is
already 27 entries of the same avoidance, and the next command with an `and`
argument would need entry 29. The fixes considered before the real cause was
found, cheapest first:

1. **Reject a semantic match that leaves input unconsumed.** The diagnostic
   already exists (`unconsumed-input`); `trySemanticParse` ignores it. Smallest
   change, and it fixes the class rather than the instance.
2. **ENGINE_MIGRATION_PLAN Arc 1 step 6** — delete the in-loop semantic attempt
   and `skipToCommandBoundary` entirely, making the front-end fall back
   whole-program rather than mid-token-stream. That is the real fix, and this
   defect is now its concrete motivating case. Note step 5 also measured that
   this step is NOT free: semantic-first currently produces a different English
   AST for **105 of 214** corpus sources that both paths parse.

### Documented command examples the parser rejects (2026-08-30)

Found by `packages/core/src/parser/__tests__/ast-vocabulary.test.ts`
(ENGINE_MIGRATION_PLAN Arc 0 step 3), which parses every registered command's
own `metadata.examples` to build its corpus and therefore had to account for
the ones that do not parse. **19 rows, 18 unique sources**, pinned in that test
in both directions — a newly-broken example fails it, and so does one fixed
without pruning its row.

Nothing else looks at this. `verify:reference` checks that examples EXIST and
that counts are derived; `docs:commands:check` checks the generated
`commands.json` matches the metadata. Neither parses the example. So these have
been shipping into the LSP's completions, `docs/commands/commands.json` and the
generated command docs as advertised syntax.

**Four are documentation defects, not parser gaps** — hyperscript has never had
C-style block braces, so these examples are simply wrong and the fix is to
rewrite them:

```text
break     | repeat for item in items { if item == target then break }
continue  | repeat for item in items { if item.skip then continue; process item }
repeat    | repeat 5 times { log "hello" }
repeat    | repeat for item in items { log item }
```

**The other fifteen are parser gaps.** Each is syntax a command's own metadata
advertises and the parser rejects; several look upstream-valid and want
measuring against the real engine (`loadCanonicalParser()`) before being
treated as ours to fix:

```text
if        | unless user.isLoggedIn showLoginForm          (same source, two commands)
unless    | unless user.isLoggedIn showLoginForm
install   | install Draggable on #box
install   | install Sortable(axis: "y") on .list
pseudo-command | foo() on me
pseudo-command | getElementById("d1") from the document
pseudo-command | reload() the location of the window
pseudo-command | setAttribute("foo", "bar") on me
render    | render myTemplate with (name: "Alice")
render    | render "<template>Hello ${name}!</template>" with (name: "World")
render    | render template with (items: data)
settle    | settle for 3000
start     | start view transition using "slide" then put result into #panel end
take      | take @data-value from <.source/> and put it on <#target/>
tell      | tell closest <form/> submit
```

Groups worth triaging together, in rough order of how much they look like one
defect each:

- **`pseudo-command` (4 rows)** — every one of its documented forms fails, all
  with the same shape: `Unexpected token: <preposition>`. The command exists to
  support `method() on target`, so the parser and the metadata disagree about
  the command's entire surface. Start here.
- **`render … with (…)` (3 rows)** — all three fail at `Expected ')' after
  arguments`, i.e. the named-argument block is unparsed. One defect.
- **`install … on <target>` (2 rows)** — `on` is being taken as an event
  handler (`Expected event name after 'on'`). Upstream `_hyperscript` accepts
  `install Behavior on <expr>`; measure before assuming.
- **`unless <cond> <command>` (2 rows, 1 source)** — the single-line form
  reports `Expected command after if condition in single-line form`. Note the
  bare `unless` single-line form is ALSO the shape whose body was silently a
  no-op until Arc C (`HANDOFF-command-arch-output-contract.md`), so tread
  carefully: this is a third bug in the same construct.
- **The four singletons** (`settle for 3000`, `start view transition … end`,
  `take … from <.source/>`, `tell closest <form/> submit`) — the last two use
  the `<selector/>` query-literal form, which suggests one shared cause rather
  than two.

### Why the gated entries need no doc to survive

- **`and`** — the two `KNOWN GAP` tests assert the *current, wrong* shape. Anyone
  who fixes the pratt parser breaks them immediately and is forced to decide
  deliberately. That is the intended design; the tests are not stale assertions.
- **`sortable-list.html`** — the allowlist key embeds `sha1(source)`, and
  assertion 3 of the shipped-sources gate **fails** when an allowlisted source
  goes clean. The list can only ratchet down. It cannot be silently forgotten.
- **The execution-gate entries** (`set <idref>` / js-path no-ops) — same
  mechanism as `sortable-list.html`: their allowlist keys in
  `packages/testing-framework/baselines/shipped-examples-execution.json` embed a
  source hash, and the gate's stale-entry assertion fails when a divergence
  converges, forcing the entry's removal in the fixing change. This is not
  theoretical: the event-filter fix (History) triggered exactly that assertion
  and shrank the baseline 46 → 45 in the same change.
- **Or-join filters** — the KNOWN GAP test pins the current unfiltered behavior
  of BOTH legs; per-event condition representation flips both halves, so the
  fix is forced to be deliberate and visible.

The last ungated entries (both `tell` rows) closed 2026-08-01 with their own
gate — and re-measuring the queue while closing them found the `wait for click
or 1s` half of the `for <duration>` row had ALREADY shipped in #850 a day
before, gated by `wait-event-or-duration.test.ts`, while this table still
listed it as open. (Third stale filing caught this way; check `git log` on the
parser file before costing any row here.) **Every row in the table above is
either FIXED or protected by a gate that fails on its own.** The document went
from tracking nothing to tracking one row on 2026-08-30, which is what it is
for.

### ~~`tell <target> to <command>` — the measured shape~~ — BOTH tell rows FIXED (2026-08-01)

Both fixed in `parseTellCommand`, gated by
`packages/core/src/parser/__tests__/tell-to-and-end.test.ts` (13 rows, both
halves mutation-verified: reverting the `to` consumption reddens 6, reverting
the `end` consumption reddens 3).

- **The dropped wrapper**: parseTellCommand now consumes an optional `to`
  after the target. Upstream REJECTS the form loudly (`Expected 'end' but
  found 'to'` — measured on the real engine), but hyperfixi could not throw
  its way to safety: `parseCommandWithErrorRecovery` swallows any
  command-parser throw inside handler bodies and the stranded body re-parses
  as top-level commands, which was the whole silent-retarget mechanism.
  Consuming the word is the only fix the recovery machinery cannot un-fix,
  and is a deliberate superset of upstream grammar (pick's legacy forms
  precedent). The bare form went from a loud failure to working.
- **The missing terminator**: tell now CONSUMES a directly-following `end`,
  matching upstream's `requireToken("end")`. Re-measuring first showed the
  filed severity was half-wrong in an interesting way: at handler level the
  leftover `end` was absorbed harmlessly (every filed-adjacent row already
  matched upstream structurally), but inside a block it mis-attributed
  everything after it — `on click if true tell #modal show end log "x" end`
  gave the leftover `end` to the IF, so `log` escaped the conditional and ran
  unconditionally; the `repeat` twin ran its trailing command once instead of
  per-iteration. Both nested rows measured VALID upstream with the command
  INSIDE the block. One residue, deliberate: `if true tell #m show end log
  "x"` (a single `end` where two closings are needed) now records a
  recoverable "Expected 'end' after if block" diagnostic while building the
  upstream-matching tree — stricter than upstream's silence, and arguably
  more honest about the ambiguous source.

`parseCommandWithErrorRecovery`'s throw-swallowing itself remains: ANY
command parser that throws inside a handler body still degrades silently
(tell was just its worst client). That is a general machinery question, not a
tell defect, and is NOT tracked elsewhere — if another silent command-drop
surfaces, start there.

Original filing kept below for the record.

Both `tell` rows are in `parseTellCommand`, but they are separate defects: the
one above is a missing terminator, this one is a **dropped wrapper**, and this
one is the more dangerous because it is silent and the failing form is the one
people write. Measured 2026-07-29 against `packages/core/src/parser/parser.ts`:

| Source | Result |
| ------ | ------ |
| `on click tell #modal to show` | `success: true`, **0 errors**, commands `["show"]` — no `tell` node, so `show` runs against the handler's `me`, not `#modal` |
| `on click tell .items to add .x` | `success: true`, 0 errors, commands `["add"]` — same |
| `on click tell #modal to show then log "after"` | `["show", "log"]` — the rest of the sequence survives, so nothing looks wrong |
| `tell #modal to show` (bare, no handler) | `success: false`, 1 error — fails loudly |
| `on click tell #modal show` (no `to`) | `["tell", "show"]` — **correct** |

The bare form failing loudly is why this reads as harmless if probed casually;
inside an event handler — the normal way to write it — it parses clean and
silently retargets. Note also that a caller cannot distinguish this from a
correct parse: `success` is `true` and the error list is empty, which is step
4.1's and 4.3's trap (`success: true` is not evidence of a command) in a third
engine.

Not fixed by Arc A, deliberately: it is a behavior change to the parser with its
own tests, and folding it into a classification step would have buried that
step's review artifact.

### ~~`for <duration>` on `toggle` / `wait` — the measured shape~~ — BOTH FIXED

The wait half shipped in **#850** (`c74fb184`, 2026-07-31): the `for` loop's
alternatives now accept a duration (time literal, bare number, parenthesized
expression) alongside event names, so `wait for click or 1s` is the
event-vs-timeout race upstream means, and `WaitCommand`'s `race` input already
executed it. Gated by
`packages/core/src/commands/async/__tests__/wait-event-or-duration.test.ts`.
This table listed the half as open for a day after it shipped — re-measure
before costing (the row below is the historical record).

Measured 2026-07-29. Each source was parsed on hyperfixi and on the real
`hyperscript.org` engine (`hs.parse(src).errors`, the loader at
`packages/testing-framework/src/multilingual/canonical-validity.ts:70-82`).
**Upstream accepts both; hyperfixi rejects both.** Each is the command's own
`metadata.examples` entry, so the shipped documentation advertises a form the
shipped parser refuses:

| Source | Upstream | hyperfixi |
| ------ | -------- | --------- |
| ~~`toggle .loading for 2s`~~ | accepts | **FIXED** — was `Expected variable name after "for"` |
| ~~`wait for click or 1s`~~ | accepts | **FIXED (#850)** — was `Expected event name after "for"` |

Both errors read as a `for`-tail being parsed as the start of a loop/event
construct rather than as a duration modifier, but the two commands take different
paths. **Measured 2026-07-31: they do NOT share a cause**, so the "confirm they
share a cause" instruction resolves to *no*:

- **`toggle`** — `parseToggleCommand` returned after the optional `on <target>`
  and never consumed the tail, so the next parse round read `for` as a `for`
  LOOP. Fixed by `parseTemporalTail`, which emits `modifiers.for` /
  `modifiers.until` (where `parseTemporalModifiers` reads them). The same sweep
  found `toggle .a until click` parsing while *silently dropping* the tail, and
  that the whole `commands/helpers/temporal-modifiers.ts` reversion machinery was
  unreachable — `for 2s` and `until` appeared in exactly two files, both source.
- **`wait`** — a different function and a different shape.
  `parseWaitCommand`'s event branch is a `do…while` over `or`-separated event
  names; `1s` is a number token, `isIdentifierLike` is false, and it throws
  `Expected event name after "for"`. The fix is to accept a time expression as an
  alternative inside that or-chain, and it shares no code with the toggle path.
  Still open.

**The semantic-side half of `toggle … for` is NOT done, and was reverted after
measurement rather than shipped.** `toggleSchema.ast` already declares
`for: 'duration'`; making it live needs a `duration` role on the schema. That
was tried, and the measurement is worth keeping:

- With `markerOverride: { en: 'for' }` alone, **16 semantic tests fail** —
  including plain `#button の .active を 切り替え`, which stops parsing entirely.
  Cause: SOV languages get `[{destination} に] {patient} を [{duration}] 切り替え`
  with a **marker-less optional slot** — the same hazard class as R3 family F1
  (the connective swallowed as `increment.quantity`).
- Adding `ja: '間'`, `ko: '동안'` clears all 16, and the full semantic suite plus a
  24-language `toggle .active [on #btn]` round-trip probe go green. (The two
  probe misses, bn and hi, are **pre-existing on main** — verified by stash.)
- But the role also changes what the i18n transformer RENDERS, and that is where
  it fails: on main every language drops the `2s` (tr renders `.loading değiştir`);
  with the role, **tr renders `.loading 2s değiştir`, which the tr parser then
  rejects** — a new round-trip failure. 9 more languages (bn/es/hi/it/pl/qu/ru/
  th/uk/vi/zh) still drop the duration in rendering, so support would be partial.
- **The corpus ratchet is blind to all of it** (green, nothing moved): no corpus
  row uses `toggle … for`, so R1–R5 never see the form. The unit tests caught the
  16; the round-trip probe caught tr.

So the remaining work is a per-language `duration` marker table for `toggle` plus
the transformer's rendering of it — a multilingual arc with no gate today. Whoever
takes it should add a `toggle … for` corpus row FIRST, so the ratchet stops being
blind, then do the markers.

#### CLOSED (2026-07-31, round 3): shipped WITHOUT a marker table — `valueShape` is the anchor

The round-2 brief below concluded "the marker is the only anchor available."
That was true of the levers `RoleSpec` had; round 3 added the missing lever and
the arc shipped without per-language markers or i18n transformer work:

- **`valueShape: 'time'` on the duration role**, enforced in the CONFIDENCE
  model: a shape-anchored role counts toward `scoreRoleCoverage` only when
  captured. The es/pl/vi regression's measured root cause was never spurious
  capture — the uncaptured optional slot weighed into the score DENOMINATOR,
  dropping `toggle-*-generated` from 1.0 to 0.69 so the same-priority hand
  pattern (0.82, wrong destination markers) won and the destination defaulted
  to `me`. Fix the scoring and the marker-less slot is safe.
- A matcher-side token guard (refuse non-time tokens at capture) was built,
  probed and REMOVED as unfireable — `expectedTypes` plus the positional
  assembler's next-token gating already refuse every constructible non-time
  capture. Recorded in `RoleSpec.valueShape`'s doc so it can be reinstated
  WITH a failing test if a future shape makes capture possible.
- en `for` + ja `間` / ko `동안` markers stand (the SOV mid-pattern hazard is
  real; dropping them fails 17 tests). The other 21 languages bind their
  stored corpus rows' unmarked trailing `2s` directly.
- Landed with the `toggle-class-temporary` corpus row (155th pattern, parses
  faithfully in all 24, R4 clean), the `toggle.for` exemption prune, and a
  baseline regeneration whose diff is uniformly positive (`avgRoleFidelity`
  up in every language; no `roleLossyPatterns` set changed).

The historical brief below is kept because its measurements are what forced
each design turn.

#### Round-2 re-measurement (2026-07-31) — the shape is confirmed, five details corrected

Round 2 re-ran every step above, then BUILT the change end to end and reverted
it. **The arc's original scoping is right: this needs a per-language duration
marker table plus the i18n rendering that emits it.** What changed is the
reasoning — including two points an intermediate filing got wrong. All measured:

1. **The schema half costs ONE test, not 16.** Adding

   ```ts
   { role: 'duration', required: false, expectedTypes: ['literal'],
     svoPosition: 3, sovPosition: 3,
     markerOverride: { en: 'for', ja: '間', ko: '동안' } }
   ```

   breaks only `ast-shape-consistency`'s `toggle.for ← duration` — the exemption
   becoming orphaned, which is the gate working as designed. The "16 tests"
   figure is the en-marker-ONLY variant; dropping ja/ko reproduces it exactly
   (17 failures: those 16 plus one new).

2. **Measure the STORED translations, not `translate()`.** The gate scores the
   corpus rows in `patterns.db`, which come from i18n's `GrammarTransformer`
   (`sync-translations.ts`). Those keep the duration as an UNMARKED trailing
   token in all 24 languages (bn adds its `জন্য` postposition). `translate()` is
   the SEMANTIC package's renderer and behaves differently — reading it produced
   the earlier claim that 11 languages "drop the duration", which is not what
   the gate sees. With the schema role added, all 24 stored rows parse to a
   single `toggle` with `duration=2s`, the corpus reaches 3720/3720, R3 stays
   1.0, and **R4 reports no invalid pair**.

3. **But a marker-LESS duration slot is not safe — and that is the blocker.**
   Both available shapes fail, and the gate hides both:

   - `required: false` (an optional slot inside the main pattern) silently costs
     **es/pl/vi** their SECOND toggle's positional destination on
     `toggle-aria-expanded`: `toggle.destination:expression` → `:reference`,
     i.e. `next .panel` becomes `me`. R1's 0.02 tolerance swallows the 0.0013
     delta, so `--regression` goes GREEN. Found with `tools/triage-r1.ts`,
     which names the pattern.
   - `required: true` + `omitRoleVariants: ['duration']` — the shape
     `transitionSchema`'s `goal` NOTE recommends for exactly this hazard — is
     WORSE: es then swallows `siguiente .panel` INTO duration
     (`toggle.duration:reference`).

   `expectedTypes: ['literal']` does not constrain the slot in either shape (it
   bound `:reference` and `:expression` values regardless), and `RoleSpec` has
   no value-shape lever — only `expectedTypes`, `markerOverride`,
   `markerOptional`. The marker is the only thing that can anchor it.

   **Do not reason from `transition` to `toggle`.** transitionSchema gets away
   with an en-only duration marker because its required `to {goal}` phrase sits
   between patient and duration and anchors the parse. `toggle` has no anchor.

4. **The bn "homonym blocker" was mis-diagnosed** (by the filing directly above
   this one, now superseded). bn's `for` LOOP keyword is indeed `জন্য`, but the
   bn tokenizer classifies the `জন্য` in `2s জন্য` as a **particle**, not that
   keyword. The phantom `for` command was an unconsumed-TAIL artifact
   (confidence 0.7, no `patternId`) — the duration role consumes the tail and it
   disappears. There is no bn-specific work, and the corpus row does NOT need to
   be sequenced behind a bn fix.

5. **The corpus row is ready** (`toggle-class-temporary`, `on click toggle
   .loading for 2s`) and must land WITH the marker work, not before it: alone
   the ratchet cannot see the form, and with a marker-less role it HIDES the
   es/pl/vi regression above.

Remaining work, unchanged in shape from the original brief: a per-language
`duration` marker for `toggle` in `command-schemas.ts`; the i18n transformer
taught to RENDER that marker (otherwise the stored translations stop matching
the pattern); the corpus row; the `toggle.for` exemption prune (the gate forces
it); a regenerated baseline. Two gates the usual set misses apply here — the
generated `syntax-table.ts` drift check (the schema restages `toggle: […
['duration','for']]`, and `derive-syntax.test.ts` also hand-asserts toggle's
entry) and vocab consistency.

### `transition` and `take` — two upstream-valid forms we reject (2026-07-31)

Both surfaced from #847's reachability probe, which fed one English surface per
reachable command to both AST paths. Neither is a semantic-vs-traditional
divergence: both paths fail identically, so this is the shared parser. Every
form below is `VALID` on the real `hyperscript.org` engine (`hs.parse(src).errors`
→ `[]`).

**`transition`'s property target cannot be possessive** — **FIXED 2026-07-31.**
The bare form worked; adding ANY possessor broke it, with two different
messages. The measured table, for history:

| source | hyperfixi (before) |
| ------ | ------------------ |
| `transition *opacity to 0 over 200ms` | **works** — writes `style="opacity: 0"` |
| `transition my *opacity to 0 over 200ms` | `Expected "to" keyword after property in transition command` |
| `transition its *opacity to 0` | same |
| `transition #a's *opacity to 0 over 200ms` | `Transition command requires a CSS property` |
| `transition #a *opacity to 0 over 200ms` | same — **a fourth row the original filing missed** (space-separated target, the shape `measure` already accepts) |

The brief's read was right: two adjacent gaps, and the differing messages were
the tell. `my`/`its` were consumed AS the property (so the real property sat
where `to` was expected), while a leading selector matched neither branch and
left property null. `parseTransitionCommand` now takes an optional leading
target — mirroring `parseMeasureCommand`'s detection, extended with the
possessive forms — and decomposes what `parsePrimary` returns
(`possessiveExpression` for `#a's *opacity`, `memberExpression` for
`my *opacity`) rather than re-parsing the property.

The RUNTIME was never the blocker: `TransitionCommand.parseInput` has always
discriminated a `[target, property]` two-arg shape, so that branch was simply
unreachable. Making it reachable exposed one real hole, now closed with a
regression test: an explicit target that did not resolve (`#nope`, or `its`
with `it` unset) fell through to `String(undefined)` and transitioned a CSS
property literally named `"undefined"` — a silent no-op reporting success. Two
args now means `[target, property]` by construction, and an unresolvable target
throws.

**`take <class> from <source>` is rejected outright** — **FIXED 2026-07-31.**
The measured table, for history:

| source | hyperfixi (before) |
| ------ | ------------------ |
| `take .active from .tab` | `take requires property, "from", and source` (semantic) / `take syntax: take <property> from <source>` (traditional) |
| `take .active for me` | `Expected "in" after variable name in for loop` |
| `take .active from .tab for me` | same |

Turned out to be THREE separable defects, none of them what the messages said:
(1) `take` was in `COMPOUND_COMMANDS` with no case in `parseCompoundCommand`,
so it fell to `parseRegularCommand`, which cannot consume a `for` tail — same
class as #846, fixed with a dedicated `parseTakeCommand` (the brief's
`parseTemporalTail` suggestion was close but wrong in one detail: take's `for`
is a RECIPIENT expression, not a duration; the tail-consumption mechanism is
the same, the modifier's meaning is not). (2) `TakeCommand.parseInput`
*evaluated* the `from` keyword identifier — a variable lookup returning
undefined — so the flat-args shape ALWAYS threw, and it never read the
semantic path's `modifiers.from` shape at all; both messages described exactly
the syntax that was supplied because both AST shapes were rejected. (3) On the
auto path the semantic match consumed `take .active` at confidence 0.82–1.0
and left `for me` unconsumed for the next round — `take` now sits on
`parseCommandCore`'s `skipSemanticParsing` list with its siblings
toggle/add/remove (same `.class`/`@attr` prefix-dropping reason, plus the
unmodeled `for` clause). Execution now follows upstream ownership-transfer
semantics for the class variant (remove from EVERY source element — or every
current holder when `from` is absent — then add to the recipient, default
`me`); the takeSchema `source` default of `me` was removed for the same reason
(bare `take .active` parsed as a near-no-op "take from me"). The non-class
value-transfer forms keep hyperfixi's semantics. e2e both paths:
`packages/core/src/commands/animation/__tests__/take-from-for.test.ts`.
The semantic schema's `recipient` role SHIPPED 2026-07-31 (see
MULTILINGUAL_NEXT_STEPS.md): the en reference for `take-class-from-siblings` no
longer drops `for me`, and 14 of 24 languages capture it. `take` nonetheless
STAYS on `skipSemanticParsing` — the semantic slot is reference-typed
(`for me`), so upstream's element-EXPRESSION recipients still need the
traditional parser.
Still open, deliberately: upstream's `with <classRef>` / `giving <expr>`
replacement forms (error rather than mis-parse) and the `and put it on` tail
(never parseable — pre-existing, programmatic-AST only).

Two adjacent diagnostics found in the same sweep, both cosmetic and neither
worth its own arc — fold them into whichever change touches this area:

- **An error position is reported past the end of the input.** Three of the
  sweep's rows report `column 78` for source strings 37 and 69 characters long.
  **STILL OPEN** — not reproduced by the `start`/`repeat`/`for` rows probed on
  2026-07-31 (those are thrown `Error`s with no position, so they report
  `column 1`). Whoever picks this up needs the original sweep's three rows;
  the column-78 path is somewhere else.
- ~~**`start` reports a `repeat` error.**~~ **FIXED 2026-07-31** (folded into the
  transition-target PR). `parseCommandListUntilEnd` hard-coded `repeat` in its
  message because that was its only caller when the message was written; it now
  takes a `construct` parameter (default `repeat`, so `repeat`'s own callers are
  unchanged). `start view transition` now reports `Expected "end" to close start
  view transition block`, and `for` reports its own name too — it had silently
  been claiming `repeat` as well, which the original filing did not notice.

- ~~**`process partials in it using view transition` mis-parses.**~~ **FIXED
  2026-07-31.** The filing was right about the root cause — `process` was in
  `COMPOUND_COMMANDS` with no case in `parseCompoundCommand`, so it fell to
  `parseRegularCommand`, whose arg loop stops at the `transition` COMMAND
  token and left the tail to be re-parsed as a fresh `transition` command —
  and right that it was the identical root cause `take` had (#859). Measuring
  it turned up **three** more things the filing did not predict:

  1. The bare form was broken too. `process partials in it` parsed to the
     single arg `[partials]` — the generic loop also stops at `in` — so the
     content never reached the runtime and it threw
     `process command expects "partials" keyword`, naming the one keyword it
     HAD been given. (The command-output-contract skip row recorded exactly
     that error and read it as "suspected parse defect, needs triage".)
  2. `ProcessPartialsCommand.parseInput` EVALUATED every arg and string-matched
     the results, so a `partials` identifier resolved as a variable lookup
     (undefined) and dropped out of the comparison — the same antipattern #859
     rewrote in `TakeCommand.parseInput`. Fixing the parser alone would not
     have fixed the command.
  3. **`swap` has a dispatch case and was broken anyway.**
     `swap … with X using view transition` is declared by `SwapCommand`'s own
     commandMeta and already read by its `parseInput`, but `parseSwapCommand`
     never consumed the tail — so it failed with the same transition error.
     Both now share one `consumeViewTransitionTail` helper.

  **Audit of the rest of `COMPOUND_COMMANDS`** (requested by the original
  filing, done in the same PR — every member probed on both paths against its
  own documented syntax):

  | Member | Dispatch case | Outcome |
  | ------ | ------------- | ------- |
  | `process` | added here | was broken twice over (above) |
  | `swap` | had one | tail unconsumed — fixed here |
  | `show`, `hide`, `push`, `replace` | none | **fine.** Their declared syntax (`show [<target>]`, `push url <url> [with title <title>]`) contains no boundary token, so the generic arg loop consumes all of it. |
  | `add` | none reaching the dispatcher | **fine.** Intercepted in `parseCommandCore` before dispatch, and measured working through the second entry point (`createCommandFromIdentifier`, e.g. nested in `tell`) where that interception does NOT run. |
  | all others | have one | parse their documented syntax on both paths |

  Two of twenty-two members were in the defective state before anyone looked,
  and `swap` shows a dispatch case is not sufficient either — so the
  correspondence is now guarded behaviourally rather than by inspection:
  `packages/core/src/parser/__tests__/compound-command-coverage.test.ts` probes
  every member's documented syntax on both paths and ratchets its probe table
  against `COMPOUND_COMMANDS` in both directions. It is deliberately not a
  set-coverage assertion over the switch's case labels — the realistic mutation
  (delete a case) has to FAIL the gate, and `swap` proves a label-derived check
  would have passed while the command was broken.

### The semantic parser never builds a loop node (2026-08-28)

`LoopSemanticNode` is declared in `packages/semantic/src/types.ts`, `createLoopNode`
exports it, `ast-builder/index.ts` has a `case 'loop'`, the package CLAUDE.md
documents it — and **nothing constructs one**. `repeat … end`, `for … end`,
`while … end` and `tell … end` all reach the renderer as a FLAT compound:
`[repeat-header, stmt, stmt, …]`, with the block's extent gone.

Two consequences, both measured:

- **The body is unrecoverable.** A statement after the loop's `end` is
  indistinguishable from one inside it. `repeat until event X … end` followed by
  `remove .x from me` parses to one flat chain, and the English re-render puts the
  `remove` inside the loop.
- **At the TOP level the body is dropped entirely.** `repeat until event pointerup
  from document / trigger m on me / end / remove .x from me` re-renders as just
  `repeat until event pointerup from document`. Handler-wrapped input keeps the
  body (the compound path), so no corpus row exposes this — every corpus row is
  handler-wrapped.

The renderer now closes each header with an `end` (#992), which makes the
round-trip stable and the output canonical, but it closes them all at the TAIL —
the only rendering faithful to what the parser actually captured. Restoring the
true extent means building a real loop node with a body, mirroring
`tryParseConditionalBlock` → `createConditionalNode`. That is the fix; this entry
is the brief.

### ~~Role markers bind as roles in the traditional→interchange path~~ — FIXED (2026-08-30)

Found while measuring Arc 1 step 4 of `ENGINE_MIGRATION_PLAN.md`; **pre-existing
on `main`, verified against `main`'s converter, and unchanged by that step.**

`toggle .active on #panel`, parsed traditionally and converted with `fromCoreAST`,
yields:

```
roles: { patient: selector '.active', destination: identifier 'on' }
```

The `destination` is the MARKER WORD, and `#panel` — the thing it marks — appears
in `args` but in no role at all. The traditional parser leaves prepositions in
`args`; schema-driven inference binds positionally and so takes `on` for the first
unbound role. (The semantic parse of the same source keeps prepositions OUT of
`args` and binds `#panel` correctly — this is one concrete instance of the
`args`-shape difference step 5 measured across 107 of 216 sources.)

**It reaches generated code.** `aot-compiler`'s `command-transforms.ts` reads
`node.roles` in two dozen places, so any AOT build of a marker-bearing command
compiles against the marker string.

**FIXED via candidate 1** (teach the inference to skip role markers), and the
reason this entry said to WAIT — "option 2 would delete the fix" — was measured
FALSE. Convergence never touches these rows: `toggle`, `add`, `remove`, `put`,
`take`, `trigger` and `set` are all on `parseCommandCore`'s `skipSemanticParsing`
list, so only ONE parser ever runs for them and the two paths already agree. The
defect is in what BOTH paths hand the interchange converter, which is why the
parse-path triage could not see it (see the methodological note below).

**Measured scope** (audit over every documented command example, traditional
parse → `fromCoreAST` with the schema inferrer): **9 commands** bound a role to a
bare marker word, not the one this entry named. Dispositions after scoring each
row rather than assuming:

| command | binding | disposition |
| ------- | ------- | ----------- |
| `toggle` | `destination="on"` | FIXED — `argSkipTokens: ['on']` |
| `trigger` | `destination="on"` | FIXED — `argSkipTokens: ['on']` |
| `remove` | `source="from"` | FIXED — `argSkipTokens: ['from']` |
| `take` | `source="from"` | FIXED — `argSkipTokens: ['from']` |
| `halt` | `patient="the"` | FIXED — `argSkipTokens: ['the']`; the runtime's `'the'` sentinel reads `raw.args` and is untouched |
| `set` | `patient="to"` | FIXED in core — see below |
| `swap` | `method="over"` | **NOT a defect** — `over` is swapSchema's `methodCarrier` doing its job. Scored, not assumed. |
| `morph` | `patient="over"` | LEFT — semantic cannot parse it either (confidence 0), so there is no oracle for the right shape. Deeper defect. |
| `pick` | `patient="from"` | LEFT — same: semantic returns `patient="source"` with an unconsumed-input warning. Both paths wrong. |

`argSkipTokens` was already the mechanism (`scrollSchema` is its precedent) and
is read by exactly one function, `inferRolesFromSchema` — so this changes
interchange `roles` only. Runtime behaviour is untouched: the commands read
`raw.args`, which still carries the markers.

**`set` needed a second fix, in core.** `from-core.ts` has an explicit `case
'set'` whose own comment says it exists only for the marker-less legacy form
`set :var value` — but it intercepted BOTH forms and took `args[1]` blindly,
which for the canonical form is the `to` KEYWORD. So `set myVar to "value"`
inferred `patient="to"` and dropped the value, and the traditional parser
desugars `increment counter` into the same shape, so it was wrong there too. The
case now delegates the canonical form to the injected schema inferrer. (Its
stated legacy form, `set :legacy 42`, does not parse at all — `ok:false` — so
that branch is guarding a surface the parser rejects. Left in place; worth a
separate look.)

**The methodological note, which is the durable part.** This defect was invisible
to `tools/triage-parse-paths.ts`, because that tool measures where the two parse
paths DIFFER — and here they agree, both wrongly. A convergence triage cannot
see a defect both sides share. Same blind-spot class as the bare-surface gate
and the corpus-wrapper lesson: the measurement's denominator is the thing to
check first.

### ~~Semantic-first silently truncates a command's arguments~~ — FIXED same day (2026-08-30)

**Live, in the DEFAULT configuration, with `ok: true` and no warning.** The same
class as the `and` bug #1013 fixed — and **#1013 did not close it**, because the
mechanism does not need an `and`.

`config.semantic` defaults true, so for the 32 commands NOT on
`parseCommandCore`'s 27-entry `skipSemanticParsing` list, the analyzer runs
first. When it matches a **prefix** of the arguments at high confidence,
`skipToCommandBoundary()` advances past the remaining tokens and they are
discarded:

```
hyperscript.compileSync('on click log "a" is not "b"')
  → ok=true · parser='semantic' · errors=[] · warnings=[]
  → log "a"                        the comparison is GONE

hyperscript.compileSync('on click log 5 is between 1 and 10')   → log 5
hyperscript.compileSync('on click log 1 + 2 * 3 and true or false')
  → log (1 + 2 * 3)                `and true or false` is GONE
hyperscript.compileSync('beep! myValue')
  → name 'beep', args []           the argument AND the `!` are GONE
```

`{ traditional: true }` parses all of them correctly.

**Why no suite caught it.** `if`, `set`, `put`, `add`, `toggle`, `fetch` and the
other 21 skip-list commands take the traditional path, so every natural test of
a comparison — `if "a" is not "b" then …`, `set :r to 5 is between 1 and 10` —
is correct. The bug needs a comparison or a multi-token expression in the
arguments of a command that is NOT on the list. `log` is the obvious one.

**Measured scope**: 8 engine-corpus sources (indices 20, 21, 22, 25, 26, 41, 42,
134) lose structure this way — comparisons, `between`, `as` conversions, and
`beep!`'s arguments. Reproduce with
`packages/core/tools/triage-parse-paths.ts` (`--kind=node-type`, `--kind=arity`,
`--kind=value`, and the STRUCTURE LOSS section of the summary).

**The resync is not the sole cause, and `tokensConsumed` cannot fix it.**
Measured against the real analyzer wiring (`createSemanticAdapter` with semantic's
`parseSemantic`/`buildAST`, the same objects `hyperscript-api.ts` passes):

| input | confidence | tokensConsumed | roles the analyzer returned |
| ----- | ---------- | -------------- | --------------------------- |
| `log "a" is not "b"` | **1.0** | 5 (= the whole input) | `{patient: literal "a"}` |
| `log 5 is between 1 and 10` | **1.0** | 7 (= the whole input) | `{patient: literal 5}` |
| `beep! myValue` | **0.5** | 3 (input is 2 words) | `{}` — empty |

So the analyzer **claims full confidence and full consumption while returning a
node that models a fraction of the input**. `skipToCommandBoundary()` is
innocent: it skips exactly what the analyzer said it consumed. Driving the
resync off `tokensConsumed` — the obvious fix, and the one this entry proposed
before it was measured — would change nothing, because that number is already
the whole input. It is input length, not comprehension.

Note `beep!` separately: confidence **0.5 is exactly `DEFAULT_CONFIDENCE_THRESHOLD`**,
so a parse that bound NO roles at all is accepted at the boundary, and
`tokensConsumed` (3) exceeds the input's word count (2).

**DECIDED AND IMPLEMENTED: fix 2 — the engine verifies rather than trusts** —
and the verification data turned out to already arrive on the node. Semantic's
`describeUnconsumedInput` attaches an `unconsumed-input` warning DIAGNOSTIC to
exactly the truncating parses (measured: present on every truncating case,
absent on every good one, markers included), with a written comment saying it
exists so a caller can act on it. Core's adapter simply never looked. Two
changes, both in core, semantic untouched:

1. **The coverage gate** (`createSemanticAdapter` in
   `parser/semantic-integration.ts`): a parse whose node carries an
   `unconsumed-input` warning is rejected, and the traditional parser takes the
   command.
2. **The resync made exact** (`parseCommandCore`): fixing the gate EXPOSED a
   second cooperating defect — `skipToCommandBoundary()` stopped at any command
   word, so `call element.focus()` (fully consumed, faithfully parsed) was cut
   at `focus` and `focus()` re-parsed as a phantom second command; pre-gate that
   phantom was silently adopted, post-gate its rejection failed the compile.
   Under the gate an adoption means the analyzer consumed the remainder IN FULL
   (a multi-command remainder parses as `compound`, which the gate's
   single-command check also rejects; a trailing `end`/`then` is unconsumed
   input), so the resync is exactly "the rest of the token stream" —
   **`skipToCommandBoundary` and its keyword list are deleted**, closing the
   class #1013 fixed one word of.

Measured over the engine corpus (both paths, 233 sources), before → after:
same **107 → 135**, structure-lost-by-semantic **10 → 2** (the survivors are
shape differences, not truncations: `go … url` modifiers, `open … as` — the
`as`-tail is bound to no role but the matcher consumes it, so no diagnostic
fires; it stays a real residual). The two `render … with (…)` "semantic-only"
parses were measured to be truncations too (`style: "("`, named args dropped) —
they now FAIL honestly on both paths. The full multilingual `--regression` gate
runs green. Pinned by
`src/parser/__tests__/semantic-adoption-coverage.test.ts` (default-vs-traditional
agreement, the phantom-split case, handler-final `end`, the honest render
failure).

The fix also closed two OTHER pinned defects, both of which turned out to be
this class wearing different clothes — their pins now assert the fixed
behavior: **`get` invisible to the NEXT command** (runtime.test.ts — the `get`
head of a then-chain was adopted from a semantic prefix-parse while the rest of
the chain parsed traditionally, and the result slot did not survive the seam)
and **pick's parenthesized-source mangling** (element-collection.test.ts — the
`identifier "("` collapse now falls back to the traditional parse on the
default path). A third pin was measuring the bug as a feature: the delegation
suite's `live #out` row passed by comparing two identically-truncated,
role-less nodes; it is now a refusal pin.

**Fix 1 — pricing input coverage into the confidence SCORE — stays parked**, in
semantic, exactly where its own `describeUnconsumedInput` comment parked it:
behind the `--diagnose-coverage` sweep, because it moves the multilingual
baseline across all 24 languages. It is no longer needed for this class; it
remains the right long-term answer for consumers that read confidence raw
(the number still reports 1.0 on a prefix-parse — only core's adoption now
compensates). Related trap for anyone touching this area:
`parseWithConfidence`'s `tokensConsumed` is **input length, not comprehension**
(when the full parser succeeds it reports `tokenize(input).length` verbatim) —
a fix keyed on it was proposed here and measured dead the same day.

Unmeasured: whether the same truncation corrupts the multilingual corpus. Every
row there is `render(parse_en(en), L)`, so a truncating en parse would move all
24 languages together — the R3 "firestorm means suspect the en parse" inversion.

### ~~A command node spans its LAST ARGUMENT, not the command~~ — FIXED (2026-08-31)

Found while scoping the convergence queue's "positions" item, whose stated
premise was that the traditional parser is the position ORACLE. It is — for
**133 of 183** documented single-command examples. The other 50 started late.

The generic command path ended with:

```ts
const pos = this.getPosition();   // ← the PREVIOUS token = the last argument
return { type: 'command', …, start: pos.start, end: pos.end };
```

So `log "hello"` reported `start 4, end 11` — the span of `"hello"` — instead
of `0..11`. One site, and it explains every affected row: **19 commands**
(`log`, `get`, `call`, `clear`, `copy`, `settle`, `blur`, `close`, `open`,
`render`, `reset`, `return`, `scroll`, `select`, `empty`, `default`, `async`,
`beep!`, `focus`), which is exactly the set that reaches the generic path
rather than a specialized parser — which is why `toggle` and `add` were always
correct and `log` never was.

These are the spans LSP hover and diagnostic ranges use, and that any error
quoting a source span reads.

**Fix**: the start is the command keyword (`commandToken`), the end is wherever
argument parsing stopped. Measured after: **183 correct, 0 late.**

**It moved the AST-equivalence baseline, and that was verified rather than
assumed.** 71 fingerprints changed; a single-file swap against `main`'s parser
over the whole corpus showed **160 identical · 73 position-only · 0
structural**, so the baseline regeneration is earned rather than a gate
re-blessed to go green. Pinned by `command-span.test.ts` (mutation-verified,
with a non-vacuity guard on its own sweep).

### Semantic-built nodes carry no NESTED positions (2026-08-31)

`@lokascript/semantic`'s `buildAST` emits no position fields: nested argument
nodes come back with `start`/`end`/`line`/`column` **undefined**, and the
command node's `start: 0, end: 0, line: 1` is `normalizeBuiltNode`'s
placeholder, not data.

The COMMAND level is fixed (see the convergence brief's item 4): the parser now
stamps `[commandToken.start, lastConsumedToken.end]`, which is exact because the
adoption coverage gate guarantees the analyzer consumed the whole remainder. The
two parse paths now agree on command spans, and the `position` family across the
corpus fell from **242 sites / 79 sources to 38 / 12**.

The residual 38 are all NESTED, and they cannot be fixed the same way. There is
no single offset to apply:

- most nested nodes have no positions at all, so there is nothing to shift;
- the ones that DO arrive come from the adapter's `parseExpressionString`, which
  parses each role value as its own substring — their offsets are relative to
  that value, not to the source (`call myFunction()` reports `callee.start = 0`
  where the traditional parser reports 5).

So this needs the semantic parser to track real spans through pattern matching
and role capture, and to report them on the built node — a `packages/semantic`
change, not a core one. Reproduce the residual with
`packages/core/tools/triage-parse-paths.ts --kind=position`.

Consumers affected: LSP hover and diagnostic ranges are command-accurate now but
argument-blind on the semantic path.

### ~~`hide <button/>` / `show <button/>` drop their target~~ — FIXED (2026-08-31)

Both parsed to a command with **no arguments at all** — the query reference was
discarded in silence.

`parseRegularCommand`'s argument loop gated on `ctx.checkSelector()`, which
covers only BASIC selectors (`#id`, `.class`, css). A QUERY REFERENCE
(`<button/>`) matched none of its predicates, so the loop broke on its first
argument and returned an empty command. `clear <textarea/>` was unaffected only
because `clear` is not a `COMPOUND_COMMANDS` member and therefore takes
`parseCommandCore`'s loop, which calls `parseExpression()` outright.

Fix: `checkAnySelector()`, which is exactly "any selector INCLUDING query
reference" and was already on `ParserContext`.

**The existing gate had two holes, and the second is the instructive one.**
`compound-command-coverage.test.ts` probes each COMPOUND_COMMANDS member's
documented syntax — but (a) its `hide`/`show` probes were only `hide me` /
`hide #modal`, and (b) it asserted only that the source parses to **exactly one
correctly-named command**. A dropped ARGUMENT satisfies that completely. So even
adding the query-literal probe would not have caught this without also asserting
that the command carries a payload (args OR modifiers OR target — compound
parsers legitimately route to all three). Both holes are now closed, and the
gate names the failure: `hide <button/>: parsed to a payload-less hide`.

**A test-infrastructure hazard this exposed, worth knowing before it bites
again.** Fixing the parser made one test file OOM at 4 GB, and the run still
summarised as PASSING: its 27 tests came back `pending` (listed, never run,
because the worker died) and vitest's JSON reported `success: true`. Finding it
took diffing per-file test STATUSES against a reverted run.

The cause was the mock, not the parser: `__test-utils__/parser-context-mock.ts`
has a `parsePrimary` that does NOT advance the token position, and the affected
test stubbed `checkSelector` — the predicate the code no longer calls — so the
mock's default `checkAnySelector` answered true forever. Production arg loops
terminate because parsing an argument consumes it; under that mock they cannot.
The hazard is now documented at the mock. **When production code changes WHICH
predicate a consumption loop calls, every mock stubbing the old one must
follow — or the loop becomes infinite.**

### ~~`hide <button/>` THROWS on the default path~~ — FIXED (2026-08-31)

Live, user-visible, in the DEFAULT configuration, on a source that is one of the
repo's own documented command examples:

```
await hyperscript.eval('hide <button/>', ctx)
  → SyntaxError: Invalid selector <button/>
```

`{ traditional: true }` hides both buttons correctly. Verified pre-existing —
reproduced with the `hide`/`show` argument fix reverted, and the semantic path
does not go through the code that fix touched.

**Why it happens, and why it is not a one-line strip.** The same `<…/>` syntax
means two different things in hyperscript, and the two producers resolve the
ambiguity differently:

- `make <div.card/>` — **creation markup**. `packages/semantic`'s
  `value-converters.ts` deliberately carries it verbatim on `raw`, with a
  comment saying MakeCommand must use the markup rather than querySelector it.
- `hide <button/>` — a **query literal**, i.e. `querySelectorAll('button')`.

The traditional parser distinguishes them with `fromQuery: true` on the selector
node plus a STRIPPED value (`button`), which `parser/runtime.ts` reads in
`resolveTargetElements(elements, selector, node.fromQuery)`. The semantic path
emits neither — value and `raw` are both the literal `<button/>` — so the
runtime hands `<button/>` to the DOM and it throws.

**So a fix has to decide where the disambiguation lives**, and that is a
boundary question rather than a typo:

1. **In `packages/semantic`** — emit query-shaped selectors for every command
   except the creation-markup consumers. Most correct (the value is wrong at the
   source), but it needs the converter to know the command, and it moves the
   multilingual baseline.
2. **In core's adapter** — apply core's own selector convention (strip +
   `fromQuery`) when converting a front-end node, keyed on the command.
   `buildCommandNode` has the command name, so it can. Contained, and arguably
   the adapter's job: it already stamps the core-required fields semantic does
   not emit.
3. **In core's runtime** — treat a `<…>`-wrapped selector value as a query at
   resolution time. Smallest, but it papers over a wrong AST rather than fixing
   it, and would mis-handle `make`.

~~Option 2 looks right~~, and should be measured against the multilingual gate
either way. ~~Do NOT fix this by stripping `<`/`/>` unconditionally — that breaks
`make`, which is the case the existing `raw` carve-out exists for.~~

**Fixed in `packages/semantic`'s `convertSelector` — option 1, and the filing
above was wrong about option 2 AND about why option 1 was hard. Both were
measured, not argued.**

- **Option 2 (core's adapter) does not fix the bug.** Core's
  `semantic-integration.ts` is only ONE of `buildAST`'s consumers.
  `browser-bundle-multilingual.ts`, `browser-bundle-semantic-complete.ts` and
  the R2 `execution-validator` call `buildAST` directly and never touch the
  adapter, so an adapter-side fix leaves them throwing. Measured: with the bug
  in place, `buildAST` + `runtime.execute` throws `Invalid selector <button/>`
  for `hide <button/>` **and** for `add .x to <button/>` (whose core default
  path is fine, because `add` is on `skipSemanticParsing`) **and** in every
  language (`숨기기 <button/>` [ko] throws identically).
- **Option 1 does NOT need the converter to know the command**, which was the
  filing's stated reason for rejecting it. The core AST separates the two
  meanings with one shape and no command-awareness — which is exactly what the
  TRADITIONAL parser already does at `parser.ts`'s `matchQueryReference()`
  branch, for `make` and `hide` alike:

  | field            | value        | who reads it |
  | ---------------- | ------------ | ------------ |
  | `value`/`selector` | `button`   | `resolveTargetElements` → `querySelectorAll` |
  | `fromQuery`      | `true`       | the evaluator, to return the whole collection even for `<#id/>` |
  | `raw`            | `<button/>`  | `MakeCommand.parseInput`, which reads it FIRST and CREATES an element |

  So an unconditional strip is only wrong if you also drop `raw`. `make` keeps
  working because `raw` keeps the markup — verified by execution, not by
  reading: `make a <div.card/>` builds `<div class="card"></div>` through
  `buildAST` after the fix.

The converter now mirrors `matchQueryReference()` exactly (`slice(1, -2).trim()`),
gated on a trailing `/>` rather than on a leading `<` alone — a bare `<` or `<=`
is classified as a *selector* by every tokenizer (the `startsWith('<')` test sits
above their operator list), and stripping those would corrupt them.

**Effect.** `hide`/`show`/`add … to <button/>` execute on the default path and
through every `buildAST` consumer, in all 24 languages. The parse-path triage's
`value` family fell 9 → 3 and `field-only-trad:fromQuery` 6 → 0, which closes the
query-literal half of the convergence arc's item 3 as that brief predicted. The
multilingual gate is unmoved (3744/3744, R2/R3 1.0000, no regression on any of
the eleven signals) — the corpus renders `<button/>` from the semantic IR, which
this does not touch; only the AST-BUILD direction changed.

**An unrelated gate caught it independently, which is the useful part.** The
`agent-bench` plausible-phrasing ratchet moved `on click add .modal-open to
<body/>` from `warned-wrong` to `correct` (behaveCorrectly 18 → 19). That gate
scores DOM effects for phrasings an agent would plausibly emit, and it was the
only signal in the repo that had this surface under measurement at all — none of
the eleven multilingual ratchets, and no core test, covered it.

### A trailing `on <target>` splits into a phantom event handler (2026-08-31)

Found while measuring the convergence arc's `implicit-me` family, not by the
triage tool — and half of it is a defect **both paths share**, so the triage
reports those rows as `same`.

`transition opacity to 0.5 on me` parses on the traditional path as TWO
statements: the `transition` command, plus an `eventHandler` with
`event: "me"` and an empty body. Upstream 0.9.93 accepts the surface (measured
against the vendored engine), and the semantic path gets it right —
`modifiers.on = contextReference me` — so the default configuration is fine and
only `{ traditional: true }` is affected.

`settle on me` is the sharper one: **both** hyperfixi paths split it, and
upstream's `settleCommand` carries an `onExpr` field, so upstream models the
on-target as part of the command. That is a real both-paths defect with a real
oracle.

Measured over 14 trailing-`on` surfaces, all upstream-VALID:

| surface | traditional | semantic | oracle |
| ------- | ----------- | -------- | ------ |
| `transition opacity to 0.5 on me` | splits | ok | semantic |
| `settle on me` | splits | splits | upstream `settleCommand.onExpr` |
| `toggle/remove .a on #d`, `focus/blur on …`, `trigger/send foo on #d` | ok | ok | — |
| `show/hide #d on me`, `measure #d on me`, `increment x on me` | splits | splits | **unknown — no oracle yet** |

The last row is deliberately not called a defect: upstream's `parse(s, 'command')`
stops at one command without complaining about unconsumed input, and
`hideCommand` has no on-expr field, so `on me` there may legitimately be a
following FEATURE rather than part of the command. Establishing the oracle means
a full-program parse and comparing the feature list — not done.

**`install X on <target>` is the sharpest instance, added 2026-08-31**, and it
arrived here by way of a filing that had it backwards (see the correction in the
documented-examples triage above). Upstream's `install` is a FEATURE with the
grammar `install <behavior-path> [(args…)]` and NO on-target clause, so every
`install X on …` surface is a docs defect. What makes it belong here is what
hyperfixi does with the two that get through:

| source | hyperfixi | diagnostics |
| ------ | --------- | ----------- |
| `install Draggable on me` | `install` (on the CURRENT element) + `eventHandler{event: "me", commands: []}` | **none** |
| `install Draggable on the first <div/>` | `install` + `eventHandler{event: "the"}` swallowing `first <div/>` | **none** |
| `install Draggable on #box` | `ok: false`, "Unexpected token after event handlers: #box" | 1 |

An event handler bound to an event named `me`, with an empty body, reported as a
clean parse. That is the #1026 class — a typo giving you a handler that silently
does nothing — one level up: #1026 covers a bad COMMAND inside a body, not a bad
EVENT NAME at the top of a feature. A plausible general rule, not yet
implemented: an `eventHandler` whose event name is a context word or a known
non-event AND whose body is empty is a diagnostic, not a parse.

Not on the convergence queue, and not urgent: the two originally-confirmed rows
are a non-default path and a command whose bare form works. Filed so the
measurement is not re-derived.

### ~~A dropped handler body is silently discarded~~ — REPORTED (2026-08-31)

**`on click qqqq` compiles to `ok: true` with an EMPTY handler, no error, no
warning, `recovered: undefined`.** A typo in a command name gives the user a
handler that does nothing, silently. This is the same class as the semantic
truncation fixed on 2026-08-30 — but that fix was on the semantic adoption
path only, and these are the TRADITIONAL parser's own recovery paths, which
have no coverage gate at all. **The class is not closed.**

Three failure modes, all `success: true` with zero diagnostics:

| input | result |
| ----- | ------ |
| `on click qqqq` | `commands: []` — empty handler |
| `on click unless x showLoginForm` | `commands: []` — empty handler |
| `on click tell #f submit` | `commands: []` — empty handler |
| `on click log "a" @@@ ###` | `log "a"`, tail dropped |
| `log }}} broken {{{` (bare) | `log` with args `[identifier "}"]`, rest dropped |
| `on click repeat 3 times { log "x" }` | parses, **runs the body ONCE instead of 3×** |
| `on click repeat for item in [1,2] { log item }` | parses, **logs one empty string** |

The last two are the worst: not a dropped tail but a silent WRONG ANSWER on a
surface the repo's own docs recommend (all five of `repeat`'s `syntax` lines use
brace blocks).

~~**Three sites, all in `parser.ts`'s `parseCommandListUntilTerminator`:**~~
**Corrected: FIVE sites across TWO functions, and the three below were the wrong
ones.** `parseCommandListUntilTerminator` parses BLOCK bodies (`repeat … end`);
the handler body — which is where every case in the table above lives — is
parsed by `parseEventHandler`, which carries its own copies of the same
give-up paths. Wiring only the three below fixed `repeat 3 times qqqq end` and
left every row in the table untouched, which is how the error was caught.
The original three, which are real but were not the defect:

1. `if (!parsedCommand) { break; }` — the body loop gives up with `commands`
   empty and records nothing.
2. The `catch` above it does `this.error = savedError`, deliberately DISCARDING
   the parse error, and never pushes to `this.errors`.
3. The inner `while (… ) { this.advance(); }` loop — commented
   `⚠️ Skipping unexpected token` — walks past anything it cannot place.

The bare-command argument loop has the same shape (hence `log }}} broken {{{`).

**The two that actually mattered, in `parseEventHandler`:** its own
skip-unexpected-tokens loop, and its three give-up branches — the
`break; // No more commands`, the two `break; // Not a command pattern` after an
expression parses but is not a command (this is `on click qqqq`), and the
`parseCommandWithErrorRecovery()` call sites that discard a `null` return
without a word (this is `on click unless x showLoginForm`).

**FIXED 2026-08-31.** All five sites now call a `recordDropped` helper that
pushes onto `this.errors` WITHOUT touching the singular `this.error`, so the
result is `success: true` + `recovered: true` — the shape `parse()` already
documents for a recovered parse, which keeps every caller that tolerates
recovery working.

**A filter the first cut needed.** Two kinds of token are walked past
legitimately and must not be reported: a structural `end` (`on click add .a to
me end` parses perfectly and was flagged) and COMMENTS. Measured against the
shipped-examples corpus, **5 of the first 9 flagged sources were false
positives** from exactly those two. `recordDroppedRange` filters both.

**What it surfaced immediately** — four shipped sources losing user code in
silence, none of them new, none previously visible:

| source | upstream | what is lost |
| ------ | -------- | ------------ |
| `examples/behaviors/recipes.html` | **ACCEPTS** | the whole `in the next <div/> when <cond>` clause — so it shows every blockquote where upstream filters. **A real hyperfixi parser defect.** |
| `examples/swap-and-morph/swap-morph.html` | rejects (differently) | `.item:last-child` split at the `:` |
| `packages/core/docs/EXAMPLES.md` | rejects | the `try` keyword AND its entire `catch` branch — a docs example about error handling, shipping without error handling |
| `packages/core/docs/README.md` | rejects | `formToJSON(me)`'s arguments |

All four are allowlisted in `shipped-sources-validity.json` with their measured
upstream verdicts. (A FIFTH was measured and withdrawn: the Spanish
`on click alternar .active on me` came from `examples/vite-plugin-multilingual/`,
which is GITIGNORED — it existed only in the working tree, so the entry passed
locally and failed CI as a stale entry. The gate now restricts its walk to
`git ls-files`, closing a 183-vs-173 local/CI denominator gap that had nothing
to do with this change; the sibling execution gate had done so since #862.) The recipes.html row also **corrected a misdiagnosis** in the
execution gate's baseline, which had recorded it as a "show/hide strategy"
difference "pending investigation" — it was this dropped clause all along.

**Still open, and it blocks using `recovered` as a gate: a PRE-EXISTING false
positive.** `if x > 5 then add .active` parses CORRECTLY and yet reports
`recovered: true` with `Expected 'end' after if block` — on `main`, before this
change. Eleven corpus sources are in that state, all the single-line
`if`/`unless` family. Until that is cleaned, `recovered` carries noise and the
documented-examples gate cannot be strengthened to read it (measured: doing so
would take that gate's failure list from 19 to 27, and 8 of the 8 additions are
this false positive).

**The signal already exists and is simply not raised.** `ParseResult.recovered`
(added by #784) is set in exactly one place, `Parser.parse()`, iff
`this.errors` is non-empty — and the recovery paths above restore the SINGULAR
`this.error` without ever pushing to the plural array. So the fix is to push a
diagnostic at those three sites rather than to invent a mechanism.

**Blast radius is the reason this is filed rather than fixed in the same
change.** `compileSync` maps `parseResult.errors` onto its own `errors`, so
raising them turns a large number of currently-silent parses into
diagnostics-carrying ones. That reaches the shipped-sources allowlist ratchet,
the language server, and every consumer that treats a non-empty `errors` as
failure. Measure how many corpus and `examples/**` sources newly report
`recovered` BEFORE choosing between "raise an error" and "raise a warning".

Gate: `packages/core/src/parser/__tests__/documented-examples.test.ts` pins the
19 affected documented examples. It deliberately CANNOT see the dropped-tail and
misparse modes — its last test pins that blind spot, and is designed to fail
once this defect is fixed.

### 19 documented `metadata.examples` do not parse (2026-08-31)

Found by asking what the parse-path convergence triage's **`both-fail 19`** (19
corpus sources neither path parses) actually were — a bucket that arc had never
opened. All 19 are `metadata.examples` strings, i.e. this repo's own documented
examples, shipped in docs, MCP `get_command_docs`, and LSP hover.

**A methodology warning first, because it inverted the answer.** Checked with a
naive `_hyperscript.parse(src)` in a try/catch, **all 19 read as
upstream-VALID**. Checked with the repo's own oracle — `parse(src).errors`,
which also folds in the tokenizer's throw channel — **all 19 invert to
upstream-rejected**. That is the exact trap `canonical-validity.ts` documents in
its own header ("the split channel misclassified 38/64 residual pairs as valid
in a try/catch-only harness"). Use `loadCanonicalParser()`; never
`try { hs.parse(x) }`.

The 19, after triage (bare vs wrapped in `on click …`, both engines):

| class | n | rows |
| ----- | - | ---- |
| **harness artifact** — only legal inside a feature, both engines agree wrapped | 4 | `pseudo-command` ×4 |
| **docs defect, brace blocks** — and a silent MISPARSE when wrapped | 4 | `repeat` ×2, `break`, `continue` |
| **docs defect, names a non-command** | 3 | `unless … showLoginForm` ×2, `tell … submit` |
| **declared in `syntax`, unimplemented** | 5 | `render … with (…)` ×3, `settle for <t>`, `take … and put it on …` |
| **real parser bug** | 2 | `install X on <selector>` ×2 |
| **bare-only `then` seam** | 1 | `start view transition using "…" then …` |

Two worth acting on beyond the docs:

- ~~**`install X on <selector>` is a parser bug, not a docs defect.**~~ —
  **MEASURED WRONG (2026-08-31); it is the reverse.** Upstream's `install` is a
  FEATURE whose entire grammar is `install <behavior-path> [(args…)]` — there is
  no on-target clause — and it rejects `on #box` / `on .list` / `on <#box/>`
  with "Expected event name", the same complaint hyperfixi makes. **The two
  forms that "parse" are the broken ones**: `install Draggable on me` returns
  `ok: true` with ZERO diagnostics and yields the install (on the current
  element, NOT on `me`) plus a phantom `eventHandler` for an event named `me`
  with an empty body. So the row that ERRORS is the honest one. Detail on the
  phantom-handler half is folded into that entry below.
- **`repeat`'s brace form is documented in all FIVE of its `syntax` lines** and
  is not hyperscript in either engine. `repeat … end` is the real form. This is
  the docs defect the 2026-07-29 sweep recorded as "being fixed in the arc's own
  diff" (see History) — **it was not fixed**; that claim is stale.

### ~~`show`/`hide` drop an `in <scope>` qualifier and a `when` filter~~ — FIXED (2026-08-31)

Upstream `hyperscript.org` ACCEPTS
`show <blockquote/> in the next <div/> when its textContent contains my value`.
hyperfixi kept the `show` and discarded BOTH clauses, so the shipped
`examples/behaviors/recipes.html` search box showed **every** blockquote where
upstream filters them. Allowlisted in `shipped-sources-validity.json` since
#1026 made the drop visible; that entry is now gone.

**Cause: the third `COMPOUND_COMMANDS`-member-with-no-dispatch-case**, after
`take` (#859) and `process`. `show` and `hide` fell through
`parseCompoundCommand`'s `default:` to `parseRegularCommand`, whose argument
loop is a sequence of `parsePrimary()` calls — one operand each, no operators.
Three drops followed from the one cause:

| source | kept | dropped |
| ------ | ---- | ------- |
| `show <blockquote/> in the next <div/>` | `<blockquote/>` | the whole `in` scope operator — and `log <blockquote/> in the next <div/>` parses it correctly, because `log` reaches `parseCommandCore`'s `parseExpression()` loop |
| `show <li/> when <cond>` | `<li/>`, plus the bare word `when` as an ARGUMENT | the condition — and swallowing `when` is what hid it from `Parser.parseCommand`'s central `when`/`where` capture |
| `show #modal with *opacity` | `#modal` | the strategy |

Fix: `parseShowHideCommand` (dom-commands.ts) parses the target with
`parseExpression()` and consumes the `with <strategy>` tail; `when`/`where` is
deliberately LEFT for the central capture rather than re-implemented locally.
Strategies are carried (`modifiers.with`, the name with any `*` stripped, as
upstream stores it) but still not honoured — that is the separate filed
"show/hide style role is uncaptured in EVERY language including en" gap.

**The runtime half is not optional, and it is where the semantics differ.**
`when` on show/hide is a per-element FILTER: upstream's `implicitLoopWhen` shows
what matches and HIDES the rest, binding each element to `it`/`its` while it
tests. `CommandAdapterV2`'s generic `when` guard is the opposite — one
evaluation, skip the command if falsy — so routing the modifier through it would
have left a correct-looking AST and a page that still never filters. The command
now declares `ownsConditionalModifier` and the adapter defers.

Measured against the real engine with the input pre-filled (which the
shipped-examples gate cannot do — it dispatches the page as shipped, and the
shipped input is empty): for `code`, `zzz` and `programmer` hyperfixi's hide set
is **byte-identical to upstream's**. The only residual divergence is hyperfixi's
`show` marker class on the elements it shows, which is that gate's existing
show/hide-strategy family (30+ entries) and is pinned by four assertions in
`show.test.ts`.

**Gate lesson, mutation-measured.** Adding the shipped source to
`compound-command-coverage.test.ts`'s probes did NOT redden it when the dispatch
case was deleted: a dropped TAIL still yields exactly one correctly-named
command WITH payload, so every assertion the gate had passed. The gate now also
re-compiles each probe wrapped in `on click …`, because the parser only REPORTS
unplaced input from inside a handler body (#1026 wired the five sites there) —
bare, the same source reports nothing. With that check the mutation fails four
rows. **The payload assertion added by the `hide <button/>` fix above was one
generation too weak, and only mutation testing said so.**

### `show` restores a cleared display as `block`, where upstream removes the property (2026-08-31)

Found while adding the `when` filter above, which makes it reachable on a
shipped page for the first time: a `show … when <search>` re-run un-hides
whatever started matching again.

`hideElement` memoises `data-original-display` as `''` for an element with no
inline display; `showElement` then restores `originalDisplay || defaultDisplay`,
so the `''` falls through to `'block'`. Upstream's display strategy does
`element.style.removeProperty('display')` in that case. For a `<blockquote>`
the two are visually identical; for an inline element hyperfixi's version
changes the layout.

**Not a stray — it is explicitly pinned**, by `show.test.ts`'s "should use
defaultDisplay when originalDisplay is empty string". Measured: changing
`showElement` to remove the property reddens that ONE test and nothing else in
the 7,990-test core suite. So it is a one-line fix behind a deliberate
assertion, which is an owner decision rather than a papercut — left alone, and
asserted as-is in `show-hide-when.test.ts` so the behaviour is at least
recorded where the filter lives.

### ~~`if <cond> then <cmd>` reports a missing `end` it does not need~~ — FIXED (2026-08-31)

`if x > 5 then add .active` — `IfCommand`'s own documented example — parsed
**completely correctly** and then reported `Expected 'end' after if block`. The
AST was right; only the diagnostic was wrong, which is why nothing caught it:
`ok`/`success` both stayed true and no structural assertion could see it.

Upstream's rule is one line, and hyperfixi was missing half of it:

```js
if (parser.hasMore() && !nestedIfStmt) parser.requireToken("end");
```

Measured on the vendored 0.9.93 engine: `if x > 5 then add .active`,
`if 1 is 1 then log 'a' then log 'b'` and `on click if x > 5 then add .active`
all ACCEPT, while `on click if x then add .a` + a following `on mouseover …`
is rejected by BOTH engines. `end` is now required exactly when input follows.

**It blocked a gate, which is why it mattered more than a stray message.**
`documented-examples.test.ts` could not begin asserting on `errors` while nine
of its own rows carried this false positive. It cost two tests that had PINNED
the strictness — "Deliberate strictness: upstream tolerates an unterminated
`if/then` at the end of a handler and we do not. That is a separate decision" —
which is exactly the deferral this closes, visibly, in the same commit.

Not changed, and pre-existing on both sides of the fix: inside a `def`/`behavior`
the if-block still consumes the enclosing `end` (`def f()\n if x then log 1\nend`
→ "Expected 'end' after function definition"), where upstream accepts. Measured
identical before and after, so it is a separate defect with its own cause.

### The documented-examples gate now reads `errors`, and found 11 more (2026-08-31)

With the false positive above gone, `documented-examples.test.ts` asserts a
CLEAN parse rather than a merely successful one — closing the two blind spots
its own docblock confessed ("adding a garbage example to a real command does NOT
redden this gate"). Both closures are mutation-tested.

Two mechanical points, both measured rather than assumed:

- **The wrapped parse became a REQUIREMENT, not a fallback.** #1026 wired the
  discarded-input diagnostic into five sites, all inside a handler body, so bare
  `log "a" ####` still comes back clean while `on click log "a" ####` reports
  the drop. A gate that stops at the bare parse cannot see the class it was
  strengthened to see. **This is the same hole, found the same week, as the one
  in `compound-command-coverage.test.ts`** — worth treating as a general rule:
  *a parse-quality assertion on a bare command source is measuring the wrong
  shape.*
- **`empty-body` is now unreachable**, because a wrapped parse yielding no
  commands always reports the body it discarded. The branch is kept: it is the
  right answer if a silently-empty handler body ever returns, which is precisely
  the #1026 regression.

**The allowlist GREW, 19 → 30**, which is the opposite of what that docblock
predicted ("the allowlist below collapses to the genuine feature gaps"). Eleven
examples had been losing content in silence. Each carries the real
`hyperscript.org` verdict, because that is what decides whose defect it is:

| n | class | rows |
| - | ----- | ---- |
| 8 | **docs defect** — upstream rejects it too | `blur on <input/>`, `focus on <input/>`, `async <a> <b>` ×3, `log x y z`, `log "Result:" result`, `pick "red", "green", "blue"` |
| 3 | **parser gap** — upstream ACCEPTS | ~~`scroll to me smoothly`~~, ~~`transition left to 100px over 500ms`~~, ~~`make a URL from "/path/", "…"`~~ — **all three FIXED** |

Two of those are worth acting on next:

- ~~**`transition left to 100px over 500ms` loses its duration**~~ — **FIXED
  the same day**; see the entry below. The guess that "a plain
  `transition left to 100px` is likely affected too" was right, and it was the
  bigger half: the VALUE was losing its unit, not just the tail.
- ~~**`scroll to me smoothly` drops `smoothly`**~~ — **FIXED**; see the entry
  below. Same shape as the `transition` row in the way that matters: the
  documented example named the MILD half. The dropped adverb changed nothing
  observable on `smoothly` (the runtime already defaulted to smooth), while
  `instantly` was INVERTED and every `scroll to <pos> of <target>` form threw.
- ~~**`make a URL from "/path/", "https://…"` does not parse inside a handler at
  all**~~ — **FIXED**; see the entry below. **Its stated diagnosis was wrong.**
  "A comma-separated argument list that survives at top level and dies in a body
  points at the body loop, not at `make`" — measured: `log "a", "b"` and
  `call foo("a", "b")` both compile fine inside a handler. The body loop is
  innocent; it IS `make`.

**And it corrects a claim in the convergence brief.** That brief lists rows
45/82 (`blur on <input/>`) as "a third defect belonging to neither path's
design". As a DOCUMENTED EXAMPLE it is a docs defect: upstream rejects it, and
with nearly the same complaint hyperfixi makes ("Expected event name" vs
"Expected event name after 'on'"). What shape the two parse paths give the
construct when it *does* appear is a separate, still-open question.

### ~~`transition <prop> to <value>` drops the value's CSS unit~~ — FIXED (2026-08-31)

`transition left to 100px` — TransitionCommand's own documented example, and a
source `hyperscript.org` accepts — parsed to `to: 100`. The `px` was discarded,
so the command animated to a **unitless length**, which is not a CSS value at
all. `transition *width to 50%` lost its `%` the same way, and the `over`
duration slot had the same limit.

**The engine already had the feature.** `Parser.tryParseStringPostfix` mirrors
upstream's `StringPostfixExpression` over the 15 CSS length units and `%`, and
`log 100px` / `set x to 100px` both build a `stringPostfix` node. Only
`parseTransitionCommand` did not — it read its value with `parsePrimary()`,
which stops at the literal and never reaches the pratt postfix. Upstream parses
the same slot with `requireElement("expression")`. The fix is two calls.

So this was **not** the tokenizer gap it looked like from the outside. Worth
recording as a triage lesson: `100px` being two tokens is true of upstream too,
and the first hypothesis (add CSS units to the tokenizer, next to `TIME_UNITS`)
would have added a second, competing mechanism for something the expression
layer already did correctly everywhere else.

Two things hid it for years: bare, the parser had no channel to report the
dropped token (that arrived in #1026, and only inside a handler body), and the
source is a documented EXAMPLE, which nothing parsed until #1025. It surfaced as
one of the three parser gaps the strengthened `documented-examples` gate found,
and its allowlist entry dropped straight off again — the first row that gate has
ratcheted DOWN.

**The `over` half needed its own behavioural row.** Measured: reverting only the
duration to `parsePrimary` left every other row in the new test file green,
because `500ms` and `1s` arrive as ONE token. `over 2 * delay` is what proves it
— which is exactly the "a mutation must redden the behavioural row" discipline
catching an unproven change in its author's own diff.

~~Still open, and adjacent: **`over 500 ms` (with a space) drops the `ms`.**~~ —
**FIXED**, see the time-postfix entry below. The diagnosis in this paragraph was
right: it is the same shape as the string-postfix gap, one layer over.

### ~~`make a URL from "/a", "/b"` dies inside a handler~~ — FIXED, and the filing blamed the wrong thing (2026-09-01)

The filing said: *"A comma-separated argument list that survives at top level
and dies in a body points at the body loop, not at `make`."* **Measured, that is
backwards.** `log "a", "b"` and `call foo("a", "b")` both compile clean inside a
handler; `make a Set from "a", "b"` fails there exactly like the URL row. The
body loop is innocent. It is `make`.

**And "does not parse inside a handler" was the symptom, not the defect.** Bare,
the source reported `ok: true` — while silently discarding everything after the
first comma. `make` is parsed by `parseMultiWordCommand`, whose modifier loop
reads one `parseExpression()` per keyword, and the comma is not an operator. So
`from` took `"/path/"` and left `, "https://…"`; bare that is invisible (the
parser reports discarded input only from inside a handler body, #1026), and
inside a handler the remainder is re-read as a statement and the whole handler
fails to compile. Same source, two very different-looking symptoms, one cause.

Upstream spells the list explicitly —
`do { args.push(requireElement("expression")) } while (parser.matchOpToken(","))`
— so the fix is a `commaListKeywords` opt-in on the pattern, **not** a generic
comma rule: `append "x" to #a, #b` is rejected by the canonical engine too
(`Unexpected Token : ,`), and collecting commas for every multi-word modifier
would have made hyperfixi accept syntax upstream refuses. Only `make`'s `from`
has the opt-in; a test pins that `append`'s comma stays rejected.

**Fixing the parse was not enough — the example still did nothing.** `make a URL
from …` then threw `Constructor 'class URL { … }' not found or is not a
function`, at every arity. `parseInput` EVALUATES the type expression and the
real evaluator resolves a global like `URL` or `Date` to the class object, while
`createClassInstance` did `String(className)` and looked that up by name — so
the "name" was the class's entire source text. `make.test.ts` could not see it:
its rows pass a MOCK evaluator returning the STRING `'URL'`, which is the one
input shape the name lookup handles. *A unit test can pin the mechanism while
the real path bypasses it* — again.

Both halves are mutation-tested in
`src/commands/dom/__tests__/make-constructor-args.test.ts`, and the two-argument
form now yields `pathname` and `origin` byte-identical to the 0.9.93 engine in
jsdom. Allowlist 28 → **27**; the AST-equivalence baseline moved on that one
corpus source, `ok:` → `ok:`.

**One incidental find, filed not fixed:** `MultiWordPattern` is declared TWICE
(`helpers/parsing-helpers.ts` and `parser-types.ts`), the two have always
differed (`syntax` vs `minArgs`/`maxArgs`, none of them read), and the values
flow between them structurally — so a field added to one is silently invisible
on the other side of `getMultiWordPattern`. That is how `commaListKeywords`
first failed to typecheck. Part of the known duplicate-type divergence.

### ~~`over 500 ms` (spaced) drops the unit~~ — FIXED (2026-09-01)

The tokenizer joins `500ms` into one TIME token, so the unspaced form always
worked; the spaced form had nothing to match upstream's `TimeExpression` (a
POSTFIX over `s` / `seconds` / `ms` / `milliseconds`) and the unit was simply
discarded. **`wait 2 s` therefore waited two MILLISECONDS** — a 1000× error on
syntax `hyperscript.org` accepts, and the reason this is not cosmetic.

The filing's diagnosis held: same shape as the string-postfix gap one layer
over, and the mechanism already existed (`tryParseStringPostfix`, mirroring
upstream's `StringPostfixExpression`). Only the unit set was missing.

Three decisions, each measured rather than assumed:

- **The node is a `stringPostfix`, evaluating to the string `"500ms"`** —
  upstream's TimeExpression evaluates to a NUMBER of ms. Matching hyperfixi's own
  JOINED token matters more: its literal carries `"500ms"` and every duration
  consumer here already parses that string (`_parseDurationComponents` accepts
  all four spellings). The tests pin the two spellings to the same VALUE.
- **The postfix requires a numeric root**, which upstream does not do. Upstream
  matches `s`/`ms` after any expression, so `log a s` is the string `"as"`
  there. `s` and `ms` are ordinary variable names and hyperfixi's generic
  command-argument loops parse expressions in sequence far more often than
  upstream's hand-written command parsers do, so the unrestricted form would
  silently fuse two arguments. Pinned, and mutation-tested by removing the guard.
- **`minutes`/`hours`/`days` stay unspaced-only.** Upstream rejects `wait 2
  minutes` AND `wait 2minutes`; hyperfixi accepts the joined form as an
  extension. Widening the spaced set would invent syntax rather than close a gap.

**Still open, found while measuring this:** `parseTimeToMs` (parser-internal,
used only by `debounced at` / `throttled at`) tests suffixes in the order
`ms, seconds, s, minutes, hours, days` — and `"2minutes"` ends with `s`, so
`debounced at 2minutes` resolves to **2000 ms, not 120000**. Reachable (`minutes`
is in the tokenizer's TIME_UNITS) and wrong by 60×. Not fixed here: it is a
different surface from the expression postfix and wants its own behavioural row.

### ~~A template literal's `value` carried its BACKTICKS on the semantic path~~ — FIXED (2026-09-01)

Thread B item 3. The convergence triage's `value` family was three sites and
this was the only one not marked inert; it read like an AST-shape nicety
(`"t ${1}"` vs `` "`t ${1}`" ``). It was not. The delimiters were being
**printed**: `log \`t ${1}\`` logged `` `t 1` `` on the default path and `t 1`
on the traditional one, because the evaluator interpolates the value it is given
and emits whatever comes out.

Narrow by construction — `put` and `set` are on `skipSemanticParsing`, so only
commands that reach the semantic path could show it, and both were measured
correct before and after.

**The producer took three attempts to find, and the first two were plausible.**
Recording them because the pattern generalises:

1. **core's `semanticValueToExpression`** (`semantic-integration.ts`) builds a
   `templateLiteral` for any literal containing `${…}`. Patching it changed
   NOTHING — that branch never fires for this source. *Drop each piece of the
   fix and re-measure*, again.
2. **`packages/semantic`'s top-level `parse`** returns `null` for both
   `log \`t ${1}\`` and its handler-wrapped form, so `buildAST` was not the
   route either.
3. The live producer is **the semantic package's expression parser**
   (`ast-builder/expression-parser/parser.ts`), reached from core through the
   built `dist`. Tagging its SOURCE proved nothing until the package was
   rebuilt — core's vitest config aliases only `@`/`@test`, so
   `@lokascript/semantic` resolves through the workspace symlink to `dist`.
   **A probe that edits a sibling package's `src` and runs core's tests measures
   the OLD build.**

Fixed at the producer rather than at the consumer, because
`interchange/from-semantic.ts` reads `raw` and nothing else in that package
reads `value`. The `value` family is now the two INERT `settle` rows only.

**Found while checking that, filed not fixed:** the same node never SETS `raw`,
and `from-semantic.ts` does `node.raw ?? ''` — so the interchange turns every
template literal into an EMPTY literal. Separate defect, separate blast radius
(interchange output has its own gates).

### Three live defects were hiding inside the `node-type` family (2026-09-01)

Thread B item 5 is "alias normalisation", and the 14 `node-type` sites read as
spellings needing a rename. Executing each one found **three** live defects on
the DEFAULT parse path, in three different commands. The lesson generalises past
this arc: *a difference family named after a SHAPE tells you nothing about
whether the shapes behave the same.*

#### 1. `transition <property>` was a silent no-op for a bare CSS property

Filed as `string -> identifier` on `transition opacity to 0.5`. The traditional
parser emits `string{value:'opacity'}`, which evaluates to its own text; the
semantic parser emits `identifier{name:'opacity'}`, which evaluates to
**undefined**. `parseInput` did `String(firstArg)`, so the property became the
literal string `"undefined"` — truthy, so the existing guard passed it — and the
command animated a CSS property that cannot exist. No error, no effect.

| source | traditional | semantic (DEFAULT) |
| ------ | ----------- | ------------------ |
| `transition opacity to 0.5` | `0.5` | **no-op** |
| `transition color to red` | `red` | **no-op** |
| `transition my opacity to 0.5` | `0.5` | **no-op** |
| `transition *opacity to 0.5` | `0.5` | `0.5` |
| `transition left to 100px` | `100px` | `100px` |

The three that worked are the tell: `*opacity` is a SELECTOR token because of
the sigil and `left` is a KEYWORD token, so both reach the runtime as strings
either way. Only a bare, non-keyword CSS property — the idiomatic form, and the
command's own documented syntax — was broken.

Fixed at the CONSUMER, deliberately: `transition` is the only command that needs
a property NAME out of an expression slot, transitionSchema admits `expression`
there on purpose (a literal-only patient dropped the unquoted form in every
language — see its role comment), and every runtime consumer goes through
`parseInput`. The `!property` guard now also rejects `'undefined'`/`'null'`,
which is the whole `String(<nothing>)` class this file had already been bitten
by once for the TARGET slot.

**jsdom cannot oracle this against upstream.** Run on the real 0.9.93 engine,
*every* row above is a no-op, `*opacity` included: upstream's transition
completes through `transitionend`, which jsdom never fires. That is exactly why
`shipped-examples-execution` disqualifies `transition` outright. The oracle here
is hyperfixi's own traditional path.

#### 2. A sigil-scoped variable read as `undefined` in the LAST command of a handler

Filed as `identifier -> contextReference`, six sites. `packages/semantic`'s
`convertReference` turned EVERY reference into a `contextReference`, sigil and
all: `:count` became
`{ type: 'contextReference', contextType: ':count', name: ':count' }`. But
`ContextType` is a closed union of `me`/`it`/`you`/`event`/… that never
contained a sigil form — so the cast was a lie — and core's
`evaluateContextReference` has no case for it and returns `undefined`.

**Core parses a command sequence traditionally and hands only the final
remainder to the semantic analyzer**, so it is the LAST command of a handler
that gets the semantic node. That is what made it both easy to miss and easy to
misattribute:

```
set :v to 5 then log :v then log :v   →  ["5", "5", undefined]
set $v to 5 then log $v then log $v   →  ["5", "5", undefined]
set  v to 5 then log  v then log  v   →  ["5", "5", "5"]      (unscoped: fine)
```

So `on click increment :count then log :count` produced `undefined` while every
earlier command in the same handler was fine. `default` was hit harder — it was
neither preserving an existing value nor applying its default:

```
default :x to 0 then log :x                   before: undefined  after: 0
set :x to 7 then default :x to 0 then log :x  before: undefined  after: 7
```

Fixed at the producer, which is also where it was WRONG rather than merely
different: `convertReference` now emits the scoped identifier the traditional
parser emits (`:name` strips the sigil and tags `scope: 'element'`; `$name`
keeps its sigil and carries no scope — those are two different conventions and
both are the traditional parser's, matched exactly). A real context reference is
still a context reference, which is why **only 2 of the 6 sites closed**: the
other four are `me` on `empty`/`hide`/`select`/`show`, genuine aliases and the
actual item-5 work.

`node-type` **14 → 12**.

#### 3. `clear :count` was a no-op on the TRADITIONAL path

Found in the same measurement, on the opposite path, and fixed alongside because
the two together are what make the paths agree. `clear` wrote
`context.locals.set(name, null)` directly, ignoring the `scope` its node
carries — so an element-scoped `:count` was never cleared (`log :count` still
read 5). `clear $g` and `clear x` worked, which is why it survived: only the
element scope is a genuinely separate store. It now writes through
`setVariableValue`, the helper `set` already uses.

`clear` is a hyperfixi EXTENSION — upstream has no `clear` keyword at all and
parses `clear :count` as something else — so "upstream ACCEPTs it" is not an
oracle here. Internal consistency with `set`/`get` is.

#### And one that is NOT a defect, checked rather than assumed

`open #popup as non-modal` (`asExpression -> selector`) looked like content
loss: the semantic path drops the `asExpression` and the traditional path keeps
it. It does not — the semantic path lifts `as non-modal` into `modifiers.as`,
and `OpenCommand` already reads BOTH shapes explicitly. Working as designed, at
the cost of a runtime that carries three fallback branches because the two paths
disagree. That is the real price of item 5, and it is paid in the commands, not
in the parser.

### The 10 remaining `node-type` rows executed — ALL benign, the family is fully dispositioned (2026-09-01, second pass)

Step 1 of the convergence brief (`HANDOFF-convergence-next.md`): execute the 10
`node-type` sites the first pass left unchecked, because that exact step found
three live defects in the other 4. This time it found **zero** — all 10 behave
IDENTICALLY on both parse paths, observable by observable, in jsdom:

| row | observable, same on both paths |
| --- | ------------------------------ |
| `call element.focus()` | activeElement becomes the target |
| `copy my textContent` | clipboard receives the text |
| `get me.parentElement` | resolves the parent (BODY) |
| `log me.value` | logs the input's value |
| `empty me` / `hide me` / `show me` | innerHTML `''` / display `none` / restored |
| `select me` | input contents selected `[0,2]` |
| `log #target's innerHTML` | logs through the possessive |
| `go back` | `history.back()` called once |

With #1036's three fixes and the two checked-benign rows (`open … as
non-modal`, `transition opacity to 0.5`), **all 14 original sites are now
dispositioned**: 3 live defects (fixed), 11 benign. Thread B item 5 is
therefore PURE spelling normalisation — there is no behavioural repair hiding
anywhere in the family — and needs only the owner decision on which spelling
wins per family before any code.

Pinned by `src/parser/__tests__/node-type-alias-parity.test.ts` (20 rows, both
paths, observables not parse shapes), so the rename work cannot silently
change behaviour while it moves node types. Mutation-measured: nulling the
`propertyAccess` dispatch arm in `parser/runtime.ts` reddens 4 auto-path rows,
nulling `contextReference` reddens 3. The `empty/hide/show/select me` rows
survive the second mutation — those commands fall back to implicit `me` when
an evaluated target is `undefined`, so their behaviour CANNOT break through
that arm; the rows still pin the end-to-end surface the fallback serves.

### Thread B item 5 EXECUTED — the vocabulary converged on the core spellings, and the convergence found a live `body` defect (2026-09-01, third pass)

The owner delegated the spelling decision ("think about the naming issue,
then proceed with your recommended approach"). **Decision: converge the
semantic emitters on the traditional/core vocabulary**, not the other way:

- The engine-migration direction makes core the canonical engine; the
  semantic front-end is an adapter INTO core's AST, and adapters speak the
  host's vocabulary.
- Blast radius: semantic's emission sites are few (value-converters, the
  expression parser, one mapper); core's vocabulary is baked into the
  parser, evaluators, hybrid bundles, the pinned vocabulary and the
  AST-equivalence baseline — renaming core's emissions would move every
  fingerprint.
- On `contextReference` being "arguably better": nothing in core USES the
  extra information — `evaluateContextReference` resolves through the same
  machinery as identifier-`me`, and the info is recoverable from the name.
  If the typed-AST arc later wants a richer node, it renames ONE converged
  vocabulary instead of two.

**What changed** (all emitter-side, in `packages/semantic`):

- `convertReference` → `identifier{name}` always (possessive surfaces
  normalise to their base word; the sigil branches from #1036 unchanged).
- `convertPropertyPath` → the traditional parser's NESTED
  `memberExpression` chain (one link per dotted-path segment, `property` an
  identifier node, `computed: false`) — measured byte-identical to trad for
  `me.value`, `my @data-count`, `event.detail.message`. A possessive
  surface (`value.access === 'possessive'`) emits `possessiveExpression` —
  EXCEPT a pronoun-base object (`me`/`it`/`you`), which can only be the
  space form `my`/`its`/`your` + property and folds to memberExpression
  exactly as trad does (`copy my textContent`, measured; `event's detail` /
  `bob's name` keep possessiveExpression on both paths, also measured).
- The expression parser: CONTEXT_VAR → `identifier`; dot access → nested
  memberExpression; `[index]` → computed memberExpression (trad-exact; the
  old flat form stringified an identifier index, silently reading `a[i]` as
  `a.i`); the possessive space-form fold re-gated by identifier NAME and
  emitting the base word.
- The `go` mapper's structural keywords `back`/`url` → `string` nodes (the
  spelling parseGoCommand emits; string nodes evaluate to their own text).

`ContextReferenceNode` / `PropertyAccessNode` stay in the type union marked
LEGACY, and core's dispatch arms for them stay until measured dead — they
serve hand-built ASTs (buildAST is public API). Fixture regenerated
(`mapper-parity.json`: exactly 2 literal→string + 1
contextReference→identifier). The AST-equivalence gate pins the TRADITIONAL
parse only (`parse(source, {})`), so it correctly did not move.

**Result:** `node-type` **12 → 2** — only the two checked-benign real
disagreements remain (`asExpression→selector` on `open … as non-modal`,
`string→identifier` on `transition opacity to 0.5`, both dispositioned in
#1036). The memberExpression→possessiveExpression residual this change
briefly created on `copy my textContent` was closed by the pronoun-base
rule above rather than documented — the "equal difference under a new name"
trap, caught by re-running the triage.

**And the convergence found a live defect, as every pass of this arc has:**
converging `body` on `identifier` exposed that the TRADITIONAL path had
never resolved bare `body` — only the semantic path's contextReference arm
did — so `add .modal-open to body` classed the BUTTON (implicit-me
fallback) on the traditional path, and started doing so on BOTH paths after
convergence. The **agent-bench phrasing ratchet** is what caught it
(`correct → warned-wrong` on the `<body/>` phrasing, whose effect stopped
matching the reference's). Upstream RESERVES `body` and resolves it from
its Context to `document.body`. Fixed in `evaluateIdentifier` (async + sync
mirrors), placed AFTER the locals/globals lookups so a user binding named
`body` still shadows — hyperfixi stays lenient where upstream reserves the
word. Pinned in `node-type-alias-parity.test.ts` (both paths + the shadow
row), mutation-measured.

### Thread B item 5's stated payoff is FALSE — the seven `RENAME_PAIRS` close ZERO node-type differences

The convergence brief says item 5 is *"the seven `RENAME_PAIRS` Arc 0 pinned
(`binaryExpression`/`binary`, `eventHandler`/`event`, …) … and it is what 12 of
the 14 remaining `node-type` differences are."* **The two halves of that
sentence are about different axes**, and only the second is true.

- `RENAME_PAIRS` (in `ast-vocabulary.test.ts`) is the **full parser vs the
  HYBRID parser** — the slim-bundle producer. `binaryExpression`/`binary`,
  `memberExpression`/`member`, and so on.
- The triage's `node-type` family is **traditional vs semantic**, and the
  hybrid parser takes no part in it at all: the tool calls
  `hyperscript.compileSync(src, { traditional })` both times.

Measured over the whole corpus, collecting every node kind each path emits:

```
semantic-only kinds : contextReference, propertyAccess
traditional-only    : functionCall
RENAME_PAIRS names among those divergent kinds : (NONE)
RENAME_PAIRS hybrid names emitted by EITHER path: (NONE)
```

So renaming all seven pairs moves **zero** of the 14 sites. `memberExpression`
does appear in a transition — but as `memberExpression → propertyAccess`, and
its RENAME_PAIRS partner is `member`; renaming it would leave
`member → propertyAccess`, an equal difference under a new name.

**The real convergence vocabulary gap is THREE names, not seven pairs**, and the
12 alias sites are exactly two families:

| transition | sites | what it is |
| ---------- | ----- | ---------- |
| `identifier → contextReference` | 6 | semantic emits a dedicated node for `me`/`it`/`you` |
| `memberExpression → propertyAccess` | 4 | one meaning, two spellings |
| `possessiveExpression → propertyAccess` | 1 | two traditional spellings collapsing to one |
| `string → literal` | 1 | one meaning, two spellings |
| `asExpression → selector` | 1 | **not an alias** — a real disagreement |
| `string → identifier` | 1 | **not an alias** — a real disagreement |

`parser/runtime.ts` already carries the parallel arms, and its own comments name
the work: *"The core parser uses `memberExpression`, so this only arrives from
`@lokascript/semantic`"* and *"The traditional parser emits these as `identifier`
nodes … but the semantic→AST builder emits dedicated `contextReference` nodes."*
Pick one spelling per family and those duplicate arms collapse. That is the
actual step, and it is smaller and better-defined than the brief's version —
but it changes AST shapes across `packages/semantic`, 9 consumer files, and the
AST-equivalence baseline, so it wants its own PR.

### The triage tool's `marker-in-args` family was under-counting

Not a parser defect — a MEASUREMENT one, found because the `scroll` fix tripped
it. `identName()` recognised a marker only on an `identifier` node, but the
flat-token-list parsers deliberately emit their structural keywords as `string`
nodes (an unbound identifier does not evaluate to its own text, and those
runtimes match by text). So `go to url "…"` had been misfiled under `arity`
since `parseGoCommand` was written, reporting a bare count instead of the
markers `["to","url"]`, and `scroll to #top` joined it the moment `scroll` got
the same treatment.

With `identName` widened, `marker-in-args` reads **13** (12 before this session,
+1 for the corrected `scroll` row) and **`arity` is now EMPTY** — no source in
the corpus has an unexplained arity difference. Same lesson as the gates: *a
family that inspects one node type is blind to a parser that emits another.*

### ~~`scroll to me smoothly` drops `smoothly`~~ — FIXED, and the filing named the mild half (2026-09-01)

`scroll` was not a `COMPOUND_COMMANDS` member, so it fell to
`parseCommandCore`'s generic argument loop, which continues only across a fixed
set of continuation keywords (`into from to with by at before after over`).
`scroll` now has a dedicated parser (`parseScrollCommand`) mirroring upstream's
`_parseScrollModifiers`, emitting the flat token list `parseGoCommand` already
builds and `commands/navigation/scroll-to.ts` already consumes.

**Executing it against the real 0.9.93 engine — rather than reading the parse —
is what showed the filing understated the defect.** Both engines were run in
jsdom with `scrollIntoView` stubbed, on `scroll`'s own documented examples:

| source | upstream | hyperfixi BEFORE | after |
| ------ | -------- | ---------------- | ----- |
| `scroll to me smoothly` | `behavior:'smooth'` | `behavior:'smooth'` | unchanged |
| `scroll to me instantly` | `behavior:'instant'` | **`behavior:'smooth'`** | `'instant'` |
| `scroll to bottom of #chat` | `block:'end'` on `#chat` | **THREW** `target element not found` | `block:'end'` |
| `scroll to middle of #chat` | `block:'center'` | **THREW** | `block:'center'` |
| `scroll to the right of #chat` | `#chat`, `inline:'end'` | **THREW** | `#chat` (inline still unmapped) |

So the row the gate found — `smoothly` — was the one shape whose dropped token
changed NOTHING observable, because ScrollCommand's default is
`smooth = !args.includes('instantly')`. The same drop on `instantly` inverted
the request, and the sibling positional forms were dead outright. **A
parse-level filing describes a parse-level symptom; only execution ranks it.**

**The obvious cheaper fix is measured wrong.** Adding `scroll` to
`COMPOUND_COMMANDS` with NO dispatch case routes it to `parseRegularCommand`,
whose `checkIdentifierLike()` loop *does* consume `instantly` and `bottom`/`of`
as arguments — the parse looks complete and reports no discarded input. It is
still broken: `parseRegularCommand` emits them as `identifier` nodes, an unbound
identifier does not evaluate to its own text, and ScrollCommand matches these
words by text. Mutation-measured with the case deleted: `instantly` scrolls
smoothly, `bottom of` scrolls to `start`, `the right of` throws. **The dedicated
parser's `string` nodes are the entire difference**, and that difference is
invisible to every parse-shape assertion.

That is also why `compound-command-coverage.test.ts` was not enough here, and
why `src/commands/navigation/__tests__/scroll-parse.test.ts` exists: deleting the
dispatch case leaves the coverage gate GREEN (mutation-measured) and reddens 5
execution rows in the new file. The parse rows there are worth keeping too —
11 of 15 rows fail against the pre-change parser — but the behavioural five are
the ones that carry the claim.

**One early probe result was wrong, and the page was why.** The first sweep
reported `scroll to last <.message/> in #chat` (a multilingual corpus row) as
throwing on both sides. It resolves fine on both paths; it threw only because
the scratch page had no `.message` elements. A defect measured on a page that
cannot exhibit it is not a measurement.

**Deliberately NOT changed — three runtime divergences from upstream, filed:**

1. **`behavior` default.** hyperfixi always sets `behavior:'smooth'` when no
   adverb is given; upstream leaves it unset (browser default `auto`), so
   `scroll to #top` force-animates here and does not upstream. Pinned by
   `scroll-to.test.ts`, so it is a decision, not a slip — same handling #1028
   gave `show`'s `data-original-display` restore.
2. **`inline` is never set**, and the HORIZONTAL position word is mapped to
   `block`. Upstream always sets `inline` (default `nearest`) and maps
   `left`/`center`/`right` to it — so `scroll to center of #chat` means
   `inline:'center'` upstream and `block:'center'` here.
3. **`in <container>` and `scroll <dir> by <n> [px]` have no runtime.** The
   parser now consumes both (the container clause so it cannot corrupt the
   target; the by-form is declined outright and keeps the generic path), but
   ScrollCommand models neither `scrollTo`-relative-to-a-container nor
   `scrollBy`. Note upstream's own container branch produced no observable call
   in jsdom, so **there is no oracle for it** — which is why it was consumed
   rather than implemented.

Gates moved: `documented-examples` allowlist 29 → **28** (second row to ratchet
DOWN); AST-equivalence baseline moved on exactly the 3 scroll corpus sources,
all `ok:` → `ok:` (structure, not validity); manifest `multiword` count 22 → 23.
`shipped-sources-validity` (4) and `shipped-examples-execution` (33) unmoved —
no shipped page uses `scroll`.

The top-line triage is unchanged (`same` 139 · `differ` 77): both parse paths
were broken identically and are fixed together, which is precisely the class a
convergence triage cannot see.

## Notes

**The `examples/**` execution gap is CLOSED** (2026-07-27): the shipped-examples
execution gate runs every eligible `_=` handler on both hyperfixi and the real
`hyperscript.org` engine in jsdom and ratchets on DOM-effect divergence —
upstream as the behavioral oracle, the R4 pattern applied to behavior. It is
what would have caught the #785 defect on *behaviour* rather than on a
diagnostic. Design, current numbers, the divergence families, and the
harness lessons: [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md).
Its first sweep produced two bug candidates: the unmet-event-filter defect
(**fixed** — see History) and the `set <idref>` / js-path no-ops row above.

**Expression-first condition parsing** is the deferred follow-on from the `if`
family (see History). #786 replaced the raw "is this token spelled like a
command?" test with a positional approximation (`isBodyCommandStart`: first-token
exemption, operand rule, chain rule), which fixed every measured shape — but it is
still a heuristic. The residual it leaves is LOW and known: a command-word in a
mid-condition position that is neither first nor operator-preceded (e.g. after a
possessive, `if x's set is 3` + newline body) can still mislead the form scans.
The real fix parses the condition via `parseExpression()` from token zero and
classifies the form from what follows — viable, since the pratt parser accepts
command-word operands (`add is 3` parses cleanly). Fold the residual into that
work rather than extending `OPERAND_INTRODUCERS` piecemeal. Detail + the
regression episode that motivates it:
[HANDOFF-command-word-in-if-condition.md](HANDOFF-command-word-in-if-condition.md).

## History

- **2026-07-29** — two entries added from the Arc B examples sweep: the
  `for <duration>` family above, and the diagnostics beside it. Found by probing
  all 202 `metadata.examples` strings against the parser and then triaging the
  16 failures on the upstream engine — the same oracle discipline as R4. Only 2
  of the 16 were parser gaps; 10 were examples authored in syntax **neither**
  engine has ever accepted (notably a brace-block `repeat … { … }` form in four
  places), which is a docs defect and is being fixed in the arc's own diff, not
  here. Triage table:
  [HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md) § F-B4a.
- **2026-07-27** — event filters enforced: `on keydown[key=='Escape']` ran on
  ANY key because the runtime never read `EventHandlerNode.condition` (parsed,
  typed, documented, never consumed). The gate's first finding, fixed the same
  day; the fix triggered the gate's stale-entry ratchet, shrinking its baseline
  46 → 45 in the same change — the loop's first full cycle. Filters resolve
  bare identifiers from the event (upstream semantics), run after arg
  destructuring, and gate SINGLE-event handlers only (or-join legs need
  per-event conditions — the new table row). Coverage:
  `packages/core/src/api/event-filter-execution.test.ts`.
- **2026-07-27** — shipped-examples execution gate landed: `examples/**`
  handlers executed on both engines in jsdom, DOM-effect divergence ratcheted
  against `hyperscript.org` as the behavioral oracle. 46 divergences baselined
  in six families; two promoted to bug-candidate rows above. Brief:
  [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md).
- **2026-07-27 (#786, repair commit)** — command-name words in `if`/`unless`
  conditions (`if log is 3 add .a` died with "Expected condition"; in a handler
  the `if` vanished and its body ran unconditionally, `ok: true`). Fixed by
  replacing the spelling test with command **position** (`isBodyCommandStart` +
  an unguarded first condition parse). The same commit repaired **five
  upstream-valid shapes the two entries below had regressed vs main** — their
  bounds were built on the same broken classifier, and every gate stayed green
  through it because no in-repo source uses command-word conditions. The
  `hasThen` bound became the command-CHAIN rule (same-line then-joined bodies
  bind; a command starting a later line breaks the chain). Full episode:
  [HANDOFF-command-word-in-if-condition.md](HANDOFF-command-word-in-if-condition.md).
- **2026-07-27** — the `hasThen` residual of the entry below: a single-line `if`
  whose FOLLOWING line carried a body `then` was still swallowed, because that
  lookahead crosses newlines. First bounded at the first command — over-corrected,
  see the entry above — and settled as the chain rule; the `commandToken.line`
  bound #785 considered stays rejected, since a header `then` may sit on the line
  after the condition.
- **2026-07-27** — implicit-multiline `if` swallowing the following line into its
  block. The lookahead answered the "FIRST command's line" question correctly and
  then kept walking, so the second command overrode the answer; it is now bounded
  to the `if`'s own line once that first command is found, which preserves the
  same-line `else`/`end` hunt the missing `break` exists for. Brief:
  [HANDOFF-implicit-multiline-if.md](HANDOFF-implicit-multiline-if.md) (read its
  RESOLVED header — one residual stays open, at the top of the table above).
- **#785** (2026-07-27) — `then` as a command separator in `if`/`unless`, `def` /
  `init` / `catch` / `finally`, and `tell` bodies; `--` comments in `if` bodies;
  shipped-sources allowlist 4 → 1. Brief:
  [HANDOFF-if-block-then-separator.md](HANDOFF-if-block-then-separator.md)
  (carries two corrections to its own original triage — read its header).
- **#784** — shipped-sources validity gate + `ParseResult.recovered`. Brief:
  [HANDOFF-parse-success-and-doc-examples.md](HANDOFF-parse-success-and-doc-examples.md).
- 2026-01-30 — behavior parameters shadowing command names. **Resolved**;
  archived at [PARSER_FIX_STATUS.md](PARSER_FIX_STATUS.md).
