# Handoff — parse-path convergence, next session

> Written 2026-09-01, after #1034/#1035/#1036 (merged as 2c2face4, 0277c1a1,
> 4d3338a4). Paste the block after the `---`
> into a fresh session. Everything above it is orientation.

## Where the arc stands

`docs-internal/HANDOFF-parse-path-convergence.md` is still the brief and
`ENGINE_MIGRATION_PLAN.md` still the authority. **Thread A is closed.** Thread B
items 3 and 5-as-defects are closed. What remains is item 4 (blocked), item 5's
actual alias normalisation (which needs an owner decision), and four small filed
defects that need no decision at all.

Current triage (`cd packages/core && npx tsx tools/triage-parse-paths.ts`):
`same` 139 · `differ` 77 · trad-only 0 · sem-only 0 · both-fail 19, families
`semanticRoles-added` 77, `field-only-trad` 202/45, `field-only-sem` 76/48,
`marker-in-args` 13, `node-type` **12**, `position` 36/10, `value` 2, `arity` 0.

## The one habit that produced everything of value

**Every step is a measurement first, and it is allowed to falsify the step.**
On 2026-09-01 that habit falsified, in order: a queue item's cost estimate, a
queue item's whole diagnosis (`make`: the filing blamed the body loop; `log "a",
"b"` compiles fine in a body), a filing's recommended fix site *twice* (the
template literal's producer took three attempts; two plausible sites were
measured DEAD), item 5's stated payoff (below), and my own first probe result
(`scroll to last <.message/> in #chat` "threw" only because the scratch page had
no `.message` elements — *a defect measured on a page that cannot exhibit it is
not a measurement*).

It also found **three live defects hiding inside a family the queue called
"aliases"**. That is the single most transferable finding of the session:

> A difference family named after a SHAPE tells you nothing about whether the
> shapes BEHAVE the same. Execute every row before calling it a rename.

## Item 5: the stated payoff is measured FALSE — do not start from the brief's version

The brief says item 5 is "the seven `RENAME_PAIRS` … and it is what 12 of the 14
remaining `node-type` differences are". The two halves are about **different
axes** and only the second is true:

- `RENAME_PAIRS` (in `ast-vocabulary.test.ts`) is the **full parser vs the
  HYBRID parser** — the slim-bundle producer.
- The triage's `node-type` family is **traditional vs semantic**, and the hybrid
  parser takes no part in it: the tool calls
  `hyperscript.compileSync(src, { traditional })` both times.

Measured over the whole corpus:

```
semantic-only kinds : contextReference, propertyAccess
traditional-only    : functionCall
RENAME_PAIRS names among those divergent kinds  : (NONE)
RENAME_PAIRS hybrid names emitted by EITHER path: (NONE)
```

Renaming all seven pairs closes **zero** of the sites.

## What the 12 remaining `node-type` sites actually are

| transition | sites | sources |
| ---------- | ----- | ------- |
| `memberExpression -> propertyAccess` | 4 | `call element.focus()`, `copy my textContent`, `get me.parentElement`, `log me.value` |
| `identifier -> contextReference` | 4 | `empty me`, `hide me`, `select me`, `show me` |
| `possessiveExpression -> propertyAccess` | 1 | `log #target's innerHTML` |
| `string -> literal` | 1 | `go back` |
| `asExpression -> selector` | 1 | `open #popup as non-modal` |
| `string -> identifier` | 1 | `transition opacity to 0.5` |

**Two of these are already known-benign, checked rather than assumed:**

- `open #popup as non-modal` — the semantic path lifts `as non-modal` into
  `modifiers.as` and `OpenCommand` reads BOTH shapes explicitly. Working as
  designed, at the cost of three fallback branches in the command. *That is the
  real price of item 5, and it is paid in the commands, not the parser.*
- `transition opacity to 0.5` — still a shape difference, but no longer a
  behavioural one: #1036 fixed it at the CONSUMER (see below), deliberately, so
  the nodes still differ and the outcome no longer does.

~~**The other 10 have NOT been executed row by row.** Doing that is step 1, and
it is the step that found three defects last time.~~ **DONE 2026-09-01 (second
pass): all 10 behave IDENTICALLY on both paths**, observable by observable —
zero defects this time. Pinned by
`packages/core/src/parser/__tests__/node-type-alias-parity.test.ts` (20 rows,
both paths, mutation-measured), so item 5's rename work cannot silently change
behaviour while it moves node types. The family is fully dispositioned: 3 live
defects (fixed, #1036), 11 benign. Item 5 is PURE spelling normalisation now —
measurement details in `PARSER_NEXT_STEPS.md`.

## The owner decision item 5 needs

Which spelling wins, per family. This is a real decision, not a coin flip:

- `FULL_PARSER_KINDS` in `ast-vocabulary.test.ts` is a pinned vocabulary, and
  `parser/runtime.ts` currently dispatches BOTH spellings with parallel arms
  whose own comments name the work ("The core parser uses `memberExpression`, so
  this only arrives from `@lokascript/semantic`").
- `contextReference` is arguably the BETTER spelling for `me`/`it`/`you` — it
  carries information `identifier` does not — so "converge on what the
  traditional parser emits" is not automatically right.
- Whichever way it goes, it changes AST shapes across `packages/semantic`, ~9
  consumer files, the pinned vocabulary, and the AST-equivalence baseline.

Get that decided before writing code.

## Cheap, decision-free work to do FIRST — ALL FOUR DONE (PR #1038, 2026-09-01)

All four were filed with a repro and needed no owner input. All four shipped
in #1038, each mutation-measured; the `in <container>` half of item 4 stays
consumed-but-unimplemented, deliberately (no jsdom oracle — see the filing).
Kept for the record:

1. **`parseTimeToMs` is wrong by 60x for `minutes`.** It tests suffixes in the
   order `ms, seconds, s, minutes, hours, days`, and `"2minutes"` ends with `s`
   — so `debounced at 2minutes` resolves to **2000 ms, not 120000**. Reachable
   (`minutes` is in the tokenizer's TIME_UNITS). Needs a behavioural row, not a
   unit test on the function.
2. **The semantic `templateLiteral` node never sets `raw`**, and
   `interchange/from-semantic.ts` does `node.raw ?? ''` — so the interchange
   turns every template literal into an EMPTY literal. Own blast radius
   (interchange has its own gates).
3. **`MultiWordPattern` is declared twice** (`helpers/parsing-helpers.ts` and
   `parser-types.ts`), the two have always differed, and values flow between
   them structurally — so a field added to one is silently invisible on the
   other side of `getMultiWordPattern`. That is how `commaListKeywords` first
   failed to typecheck.
4. **Three `scroll` runtime divergences from upstream**, all pinned by
   `scroll-to.test.ts` and therefore deliberate-looking: the
   `behavior: 'smooth'` default (upstream leaves it unset), `inline` never being
   set (upstream maps `left`/`center`/`right` to it, not to `block`), and
   `in <container>` / `scroll <dir> by <n>` having no runtime. **Note upstream's
   own container branch produces NO observable call in jsdom** — there is no
   oracle for it, which is why the parser consumes the clause and the runtime
   does not implement it.

## Gates, and the two that bit me

Beyond the usual set. **`npm run test:check` runs TEST SUITES; a CI job can also
run bare scripts, and those are invisible to every suite.** Both round-trips
this session were that class:

- **`check-type-escapes`** (#1034) — a ratchet with a committed baseline under
  `packages/core/baselines/`. I added exactly two `as unknown as` in
  `packages/core/src/parser` with 8050 tests green. Both were avoidable; the
  right answer was to TYPE the values, not to run `check:type-escapes:update`.
  Its siblings `check-layering` and `check-semantic-boundary` are the same shape.
- **`update:sizes`** (#1036) — metadata staleness, ±2%. The drift was NOT mine:
  #1034's log already read `browser` at 2.0%, inside tolerance only by rounding,
  and my +0.2 KB tipped it. Refreshed all five drifting bundles so the next PR
  does not trip on the next one to cross. **Copy the numbers out of the CI job
  log** — never run `update:sizes:auto` locally (dist/ is untracked, and macOS
  gzip reads lower than CI Linux zlib).

CLAUDE.md now documents the whole `lint-typecheck` job as a fourth class of gate
`test:check` misses, with a copy-pasteable loop (#1035). Run it.

Allowlists carrying measured upstream verdicts, with current sizes:
`documented-examples.test.ts` **27** (holds NO parser gaps any more — only docs
defects and rows legal solely inside a feature), `shipped-sources-validity.json`
**4**, `shipped-examples-execution.json` **33**. The last two ratchet DOWN only
and derive their corpus from `git ls-files` — keep it that way.

A parser OR `packages/semantic` change needs the multilingual gate run locally
before pushing (~10 min): `npm run test:multilingual:build-deps` → `npm run
populate --prefix packages/patterns-reference` → `cd packages/testing-framework
&& npx tsx src/multilingual/cli.ts --full --bundle browser-priority
--regression`. Do not commit the regenerated `patterns.db`. Never `git stash` in
this tree.

## Traps worth carrying forward

- **A probe that edits a sibling package's `src` and runs core's tests measures
  the OLD build.** Core's vitest config aliases only `@`/`@test`, so
  `@lokascript/semantic` resolves through the workspace symlink to `dist`. Two
  separate investigations stalled on this before I rebuilt.
- **`ok: true` is not comprehension, and neither is a green mutation.** Twice
  this session a new gate row did not redden under mutation: the `scroll`
  probes in `compound-command-coverage.test.ts` (the switch's `default:` falls
  back to a parser that also consumes the tokens — just as `identifier` nodes
  that do not evaluate to their own text), and the `transition` `'undefined'`
  guard row (it threw earlier, at a different guard). Both were rewritten.
  **Mutation-test every gate you add, and read WHICH row reddens.**
- **jsdom is not an oracle for every command.** On the real 0.9.93 engine every
  `transition` row is a no-op, `*opacity` included — upstream completes through
  `transitionend`, which jsdom never fires. That is why
  `shipped-examples-execution` disqualifies `transition` outright. When upstream
  and hyperfixi both do nothing, you have measured the harness, not the code.
- **"Upstream ACCEPTs it" is not an oracle when the construct is ours.** `clear`
  is a hyperfixi extension — upstream has no such keyword and parses
  `clear :count` as something else entirely. Check that upstream is parsing the
  same CONSTRUCT before treating its verdict as one.
- **When local and CI disagree, READ THE CI LOG** — and GitHub will not release
  a job log until the whole run finishes. Wait for it rather than theorising
  against a black box. (I waited; it named the file, the number and the fix in
  one line, twice.)
- **A filing's recommended fix site ages like its diagnosis.** Grep for the
  OTHER callers before taking one.

---

MISSION: continue the parse-path convergence arc.
`docs-internal/HANDOFF-convergence-next.md` is the brief;
`docs-internal/HANDOFF-parse-path-convergence.md` and
`docs-internal/ENGINE_MIGRATION_PLAN.md` are the background and the authority.
Read this file's body first and do not re-derive what it marks as settled.

**#1034, #1035 and #1036 are landed.** Thread A is closed; Thread B items 3 and
5-as-defects are closed. Do NOT redo: `scroll`'s dedicated parser, `make`'s
comma list, spaced time units, the template-literal delimiters, the
`transition` bare-property no-op, sigil-scoped variables, or `clear`'s scope.

**Re-run the measurement before costing anything** — `cd packages/core && npx
tsx tools/triage-parse-paths.ts`. Expect `same` 139 · `differ` 77 · both-fail 19
with `node-type` 12. The tool is the authority, not this paragraph.

~~**Start with the four decision-free filings** in the body … **Then, before
any item-5 code: execute each of the 10 unchecked `node-type` rows.**~~ **Both
done 2026-09-01**: the four filings shipped as #1038 (each mutation-measured),
and all 10 rows executed IDENTICALLY on both paths — zero defects this pass,
pinned by `node-type-alias-parity.test.ts`. The `node-type` family is fully
dispositioned (3 fixed in #1036, 11 benign).

**Item 5's stated payoff is measured FALSE** — `RENAME_PAIRS` closes ZERO of the
sites, and the real work is three names, not seven pairs. With the family fully
executed it is now PURE spelling normalisation. **The only thing between here
and the code is the owner decision on which spelling wins per family** (see
"The owner decision item 5 needs" above); get that before writing any of it.

`both-fail 19` is understood and is NOT parser gaps — all 19 are the repo's own
`metadata.examples`, gated by `documented-examples.test.ts`. Do not re-open it.

A parser or `packages/semantic` change needs the multilingual gate run locally
before pushing, and the `lint-typecheck` guard scripts too — both are named in
the body, and both cost a CI round-trip this session. Do not commit the
regenerated `patterns.db`. Never `git stash` in this tree.

Every step is a measurement first, and it is allowed to falsify the step. It
falsified six written claims on 2026-09-01, including two of my own from an hour
earlier. When it does, correct the doc in the SAME PR, struck through in place.
