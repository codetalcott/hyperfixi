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
| **`tell` never consumes a terminating `end`** | medium — no real `tell … end` block form; upstream requires one | **none** | comment at `packages/core/src/parser/command-parsers/utility-commands.ts` (the `ELSE`/`END` break in `parseTellCommand`) |
| **`tell <target> to <command>` drops the `tell` wrapper** | medium — **silent wrong target** on the form users actually write | **none** | see the measured table below; found by Arc A step 4.3 (Finding 14 in [HANDOFF-command-arch-manifest.md](./HANDOFF-command-arch-manifest.md)), re-verified 2026-07-29 |
| **`set <idref> to <value>` / js property-path args no-op** | medium — silent no-effect on shipped pages | ✅ execution-gate allowlist entries | families 1/6 in [HANDOFF-shipped-examples-execution.md](HANDOFF-shipped-examples-execution.md) |
| **`for <duration>` tail rejected on `toggle` / `wait`** | medium — two upstream-valid forms on shipped, documented commands; both are the command's OWN documented example | **none** | see the measured table below; found by the Arc B examples sweep ([HANDOFF-command-arch-metadata.md](./HANDOFF-command-arch-metadata.md) § F-B4a) |
| **`transition` rejects a POSSESSIVE property target** | medium — upstream-valid, and it is the form the docs and the corpus use | **none** | see the measured table below; found by #847's reachability probe |
| **`take <class> from <source>` rejected** | medium — upstream-valid classic hyperscript on a shipped command | **none** | see the measured table below; found by #847's reachability probe |
| `and` is not a command separator anywhere | low — consistent everywhere, so no surprise | ✅ 2 `KNOWN GAP` tests | `packages/core/src/parser/__tests__/then-as-separator.test.ts` |
| `sortable-list.html` recovers with errors | low — one shipped example | ✅ allowlist ratchet | `packages/testing-framework/baselines/shipped-sources-validity.json` |

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

The ungated ones (both `tell` entries) have no such mechanism. **They are what
this document is for.**

### `tell <target> to <command>` — the measured shape

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

### `for <duration>` on `toggle` / `wait` — the measured shape

Measured 2026-07-29. Each source was parsed on hyperfixi and on the real
`hyperscript.org` engine (`hs.parse(src).errors`, the loader at
`packages/testing-framework/src/multilingual/canonical-validity.ts:70-82`).
**Upstream accepts both; hyperfixi rejects both.** Each is the command's own
`metadata.examples` entry, so the shipped documentation advertises a form the
shipped parser refuses:

| Source | Upstream | hyperfixi |
| ------ | -------- | --------- |
| ~~`toggle .loading for 2s`~~ | accepts | **FIXED** — was `Expected variable name after "for"` |
| `wait for click or 1s` | accepts | `Expected event name after "for"` |

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

**`transition`'s property target cannot be possessive.** The bare form works;
adding ANY possessor breaks it, with two different messages:

| source | hyperfixi (both paths) |
| ------ | ---------------------- |
| `transition *opacity to 0 over 200ms` | **works** — writes `style="opacity: 0"` |
| `transition my *opacity to 0 over 200ms` | `Expected "to" keyword after property in transition command` |
| `transition its *opacity to 0` | same |
| `transition #a's *opacity to 0 over 200ms` | `Transition command requires a CSS property` |

The `my`/`its` and the `#a's` forms fail at different points, so this is likely
two adjacent gaps rather than one. Note the possessive form is what
`TransitionCommand`'s own surface area implies and what the multilingual corpus
renders, so the working bare form is the narrower case.

**`take <class> from <source>` is rejected outright**, and its `for` tail is the
`toggle`/`wait` bug again:

| source | hyperfixi |
| ------ | --------- |
| `take .active from .tab` | `take requires property, "from", and source` (semantic) / `take syntax: take <property> from <source>` (traditional) |
| `take .active for me` | `Expected "in" after variable name in for loop` |
| `take .active from .tab for me` | same |

The first is the interesting one: both messages describe the syntax that was
just supplied. The `for`-tail rows are the same defect class #846 fixed for
`toggle` — an unconsumed `for` read as a loop head by the next parse round — so
whoever fixes `take` should reuse `parseTemporalTail`.

Two adjacent diagnostics found in the same sweep, both cosmetic and neither
worth its own arc — fold them into whichever change touches this area:

- **An error position is reported past the end of the input.** Three of the
  sweep's rows report `column 78` for source strings 37 and 69 characters long.
- **`start` reports a `repeat` error.** `start view transition` (no terminator)
  fails with `Expected "end" to close repeat block`; `start view transition using
  "slide" end` parses. The message names the wrong construct, which cost real
  triage time. The same wrong-construct routing shows on `process partials in it
  using view transition`, which fails with `Transition command requires a CSS
  property`.

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
