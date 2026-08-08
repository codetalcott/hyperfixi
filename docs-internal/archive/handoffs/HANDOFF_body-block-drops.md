# Handoff: `eventsource` / `socket` / `worker` / `live` / `intercept` drop their whole body at confidence 1.0

> ## STATUS (2026-07-09) — RESOLVED, all five fixed
>
> **Landed in two PRs.** All five commands now fold into a `feature` semantic node
> that captures the body, in all 24 languages. `--diagnose-coverage` firing rate
> **158 (4.3%) → 38 (1.0%)**; every remaining firing is `bind` (unrelated — see the
> bottom of this note). Multilingual `--regression` exits 0, with R1 role-fidelity up
> in all 24 languages and R0-precision up for the SOV six.
>
> - **PR 1** — `live`, `eventsource`, `socket`, `intercept`.
> - **PR 2** — `worker`, plus SOV verb-final `def` support and an sw lexicon fix.
>
> **`Multilingual Validation` is now a required status check on `main`** (the
> branch-protection gap noted at the bottom of this doc — closed).
>
> **Two corrections to the analysis below — read before trusting it:**
>
> 1. **"The actual lead" (§ below) is a misreading.** `OPENER_ACTIONS` in
>    `block-parser.ts:30` is a **depth-tracking** list for balancing nested `end`s
>    while segmenting a body — *not* a dispatch list. `tryParseBlock` dispatches only
>    on `behavior`/`def`; `if`/`repeat` bodies are attached by **folds** inside
>    `parseBodyWithClauses` (`tryParseConditionalBlock`, `consumeJsBlock`). Deriving
>    the "opener set" from `hasBody` would not have worked. The fold is the pattern to
>    copy. (The doc's underlying observation stands: `hasBody` is declared in
>    `command-schemas.ts` and read nowhere in `packages/semantic`. It is still unread —
>    the fold keys off an explicit `FEATURE_ACTIONS` list, since the `hasBody` set also
>    contains `on`/`js`/`tell`/`behavior`/`init`/`async`/`compound`.)
>
> 2. **The corpus translations for these commands were themselves broken**, which the
>    doc does not mention and which dominates the ratchet risk. The English seeds were
>    single-line, and the i18n `GrammarTransformer` flattened them — stranding `end`
>    mid-stream and untranslated in SOV, and scrambling `intercept` in *every* language.
>    Because every language dropped the body **identically**, all seven corpus rows were
>    recorded **faithful (fid 1.0)** in the baseline — *phantom* fidelity. Fixing English
>    alone would have collapsed 17+ languages to degenerate. Fix: rewrite the seeds
>    multi-line in `init-db.ts` (the transformer translates block bodies line-by-line);
>    **no transformer change was needed.**
>
> **Also found:** the committed baseline was **stale**. It was generated at
> `a851e783`, before PR #627 (`a7d6136f`), whose parser changes lowered `avgRoleFidelity`
> by ~0.006 in every language. That drop sat under the 0.02 ratchet tolerance and was
> never regenerated. Verified by measuring pristine `main`'s parser against the committed
> DB: es R1 = 0.98536, while the baseline recorded 0.99155. The regenerated baseline
> absorbs this pre-existing drift. **Isolated effect of this change** (same DB, old vs
> new parser): R1 **+0.0004** (4 more patterns scored, all at 1.000), R0-precision
> **+0.0119** for the SOV six (ja/ko/tr/qu reach exactly 1.000000).
>
> **PR 2 (`worker`) — two things it turned up that were not predicted:**
>
> 1. **The SOV verb-final `def` guard cannot just be "a patient marker precedes the
>    keyword."** `worker`'s own ja body is `Calculator を worker … add(a, b) を def …`,
>    whose *body-level* `def` is also marker-preceded — so a loose guard makes
>    `tryParseBlock` claim the entire worker block as a `def` named `Calculator`. The
>    head must be CONTIGUOUS: name + balanced params + exactly one marker + keyword
>    (expected index 2, actual 10 → rejected). See `sovHeadKeywordIndex`.
> 2. **A live sw lexicon gap, surfaced only once `return` finally had to parse.** The
>    i18n dict emitted `rudi` ("go back") while the semantic profile reads
>    `rudisha`/`rejea` — so sw could not parse its own `return`, and its `worker` body
>    dropped (fidelity 1/3 → degenerate). Fixed by realigning the dict to `rudisha`
>    (kept clear of `rudia` = `repeat`) and pruning `sw:return:rudi` from
>    `lexicon-emit-mismatch.test.ts`'s allowlist, which self-prunes. This is the LIVE
>    category that test documents; the corpus never exercised it before.
>
> `worker` body segments route to `parsers.statement` (→ `parseInternal` → Stage 0 →
> `tryParseBlock` → `parseDefBlock`). Note `parseStatements` skips Stage 0, so
> `parsers.body` would NOT reach the def machinery. Its segments are sliced THROUGH
> their `end` (a `def` owns its terminator); handler segments are not.
>
> **Unrelated, still open:** `bind` accounts for 31 of the 56 remaining `unconsumed-input`
> firings — a `then`-chain of two `bind`s where the pattern matches the first and drops
> the rest, plus a `de #picker` source-clause drop.

## Context

This is the direct follow-on to PR #627 (`a7d6136f`, merged 2026-07-09), which fixed
`fetch`'s `with { ... }` clause being silently dropped, and — more importantly — landed a
**diagnostic** for the root cause: the semantic parser scores *role coverage* (how many of
the pattern's own roles were filled) and never *input coverage* (how much of the input was
consumed). A pattern that fills its roles reports confidence 1.0 while ignoring a trailing
clause.

That diagnostic immediately found the next instance of the same bug, and it is worse.

## The bug

Five commands parse to a bare keyword and discard their **entire body**, at confidence 1.0,
with zero roles captured. Verified against merged `main`:

| source | action | conf | roles | body |
|---|---|---|---|---|
| `eventsource ChatStream from /events on message put it into #messages end end` | eventsource | 1.0 | none | dropped (11 tokens) |
| `socket ChatSocket ws://localhost:8080 on message put it into #chat end` | socket | 1.0 | none | dropped (11 tokens) |
| `worker Calculator def add(a, b) return a + b end end` | worker | 1.0 | none | dropped (14 tokens) |
| `live total = price * quantity` | live | 1.0 | none | dropped |
| `intercept fetch on /api/users then log it end` | intercept | 1.0 | none | dropped |

Reproduce (semantic `dist/` must be fresh — `npm run build --prefix packages/semantic`):

```js
import { parseSemantic } from './packages/semantic/dist/index.js';
const { node, confidence } = parseSemantic(
  'eventsource ChatStream from /events on message put it into #messages end end', 'en');
node.roles.size;        // 0
confidence;             // 1
node.diagnostics.filter(d => d.code === 'unconsumed-input');  // names the dropped span
```

**Do not assert on "does it parse".** It parses. It parses at 1.0. Assert on
`node.roles`, on the presence of the body in the built AST, and — for the ones with a runtime
— on the observed DOM/network effect.

## Why confidence is 1.0

`scoreRoleCoverage` (`packages/semantic/src/parser/confidence-model.ts:169`) ends with:

```ts
return maxScore > 0 ? score / maxScore : 1;
```

These five schemas declare `roles: []` (`packages/semantic/src/generators/command-schemas.ts`,
~line 800–860), so `maxScore === 0` and coverage is **hard-coded to 1**. They are exactly the
five schemas that already print `SCHEMA_NO_REQUIRED_ROLES` on every semantic import — that
warning has been telling us this for a while.

## The actual lead

All five declare **`hasBody: true`** in their schema. Eighteen schemas do. And:

```bash
grep -rn "hasBody" packages/semantic/src | grep -v command-schemas.ts   # → nothing
```

**`hasBody` is declared and never read anywhere in `packages/semantic`.** Meanwhile Stage 0's
block parser hardcodes its own list:

```ts
// packages/semantic/src/parser/block-parser.ts:30
const OPENER_ACTIONS = ['if', 'unless', 'repeat', 'for', 'while'] as const;
```

`if/unless/repeat/for/while` are handled; `live/eventsource/socket/worker/intercept` are not,
so they fall through Stage 0, match a bare-keyword pattern at Stage 2, and their body is eaten.
(`on`, `js`, `tell`, `behavior`, `init`, `async`, `compound` also declare `hasBody` and are
handled by other dedicated paths — check each before assuming.)

The obvious move is to derive Stage 0's opener set from `hasBody` rather than a hardcoded
literal. **Verify that before committing to it** — `behavior` and `on` have bespoke handling
(`tryParseBlock` / `tryParseProgram`), and `js`/`tell` are on core's `skipSemanticParsing` list,
so a naive `hasBody`-derived set may capture commands that are already handled elsewhere and
regress them.

## Suggested shape

1. Reproduce the table above. Confirm `roles.size === 0` and `confidence === 1` for all five.
2. Decide the opener set: derive from `hasBody`, minus the actions with dedicated paths.
   Write down *why* each exclusion is safe.
3. Make Stage 0 (`tryParseBlock`) parse `<keyword> <name?> <head...> <body> end` for the five,
   attaching the body the way `if`/`repeat` already do. Match the existing node shape — check
   `packages/semantic/src/ast-builder/command-mappers.ts` for what each mapper expects.
4. Give each of the five at least one real role (`patient` for the name, `source` for the URL)
   so `maxScore > 0` and confidence stops being vacuously 1. **This changes their confidence**,
   which the baseline records — see the ratchet section below.
5. Re-run the coverage sweep and watch the firing rate fall from 4.3%.

## Measure before and after

The sweep is read-only; it never gates and never writes a baseline:

```bash
npm run test:multilingual:build-deps                      # ordered build (required)
npm run populate --prefix packages/patterns-reference     # fresh patterns.db
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --diagnose-coverage
```

Baseline measurement from PR #627 (2026-07-09, `browser-priority`, 3696 rows):
**158 fire = 4.3%** — SVO ~4.5–5.8%, the SOV six ~1.9%. The English 7 are these five commands.

Known limitation to keep in mind: the `unconsumed-input` diagnostic covers **only the Stage-2
plain-command path**. Event-handler / compound / SOV / VSO stages re-tokenize sub-segments and
expose no single consumed count, so e.g. `on submit fetch /api/form with method:"POST" body:form`
reports `unconsumed=no` even though the `with` clause is dropped. Extending coverage to those
stages is a legitimate sub-task, and would raise the 4.3% number.

## The ratchet — read this before you touch confidence

`packages/testing-framework/baselines/multilingual-priority.json` gates CI on six signals.
Two constraints bite here:

- **R1 role-fidelity scores every language against the English reference parse.** If English
  starts capturing roles on `eventsource` and the other 23 languages don't, **their** R1 drops
  and the ratchet fires. Adding roles to these schemas is therefore an all-24-languages change,
  or it must be shown that no corpus row exercises them per-language. (This is exactly why
  PR #627 deferred the 23-language `fetch … with` patterns — see
  `docs-internal/MULTILINGUAL_NEXT_STEPS.md`.)
- Regenerate the baseline **only** against a freshly `populate`d `patterns.db`
  (`--save-baseline`), and **do not commit** the regenerated `patterns.db` itself.

Run the gate and check the *real* exit code — `tail`/`grep` in a pipeline masks it:

```bash
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression > /tmp/gate.log 2>&1
echo "exit=$?"
```

## Definition of done

- The five commands capture their body; the built AST contains the body commands.
- Their confidence is no longer vacuously 1.0 (i.e. `maxScore > 0`), or the `roles: []` +
  `maxScore === 0 → 1` shortcut is addressed head-on with a documented rationale.
- `--diagnose-coverage` firing rate drops materially from 4.3%, and the remaining firings are
  inspected and explained (benign residue vs. real drops).
- `SCHEMA_NO_REQUIRED_ROLES` no longer prints for whichever schemas you gave roles.
- Multilingual `--regression` gate exits 0, or the baseline is regenerated with the fidelity
  delta explained in the PR body.

## Verify (compiling proves nothing)

```bash
npm run test:check --prefix packages/semantic
npm run test:check --prefix packages/core
npm test --prefix packages/i18n && npm test --prefix packages/mcp-server
npm run test:run --prefix packages/hyperscript-adapter     # generated from command-schemas!
npm run typecheck --prefix packages/semantic
```

## Traps (each of these cost real time in #627)

- **`command-schemas.ts` has downstream code generators.** `packages/hyperscript-adapter`
  derives `src/generated/syntax-table.ts` from it (`npm run generate:syntax`). Adding a role to
  a schema breaks its tests until you regenerate. `grep -rl "command-schemas\|commandSchemas"
  packages/*/src` finds every consumer: core, hyperscript-adapter, i18n, mcp-server, semantic.
  Run all of them. CI's `Unit Tests` job will catch you otherwise.
- **English patterns lived in two files.** The registered `en` language module uses
  `packages/semantic/src/patterns/en.ts`; `patterns/languages/en/*.ts` is only reached by the
  non-registered `buildPatternsForLanguage()` fallback. `fetch` was de-duplicated in #627;
  other commands may still be duplicated. Verify a new pattern by matching with `parseSemantic`,
  **not** with `getPatternsForLanguage`.
- **`matchBest` sorts by priority first, then confidence — never by tokens consumed.** A short
  high-priority pattern beats a longer one that consumes the whole input.
- **`tokensConsumed` is a lie on the success path.** `parseWithConfidence`
  (`packages/semantic/src/utils/confidence-calculator.ts:138`) returns the *whole input's* token
  count, and `node: null` otherwise. Don't build anything on it.
- **A green suite proves nothing here.** Four separate bugs in this area were green for the
  wrong reason. Prove a new test fails without the fix before believing it passes with it.
- Editing a workspace package's `src` makes its `dist` stale; `pretest` rebuilds mid-run and a
  suite can flap once. `npx vitest` / `npx tsx` skip the freshness hooks entirely — rebuild
  first, or you are scoring code that isn't in your checkout.
- `packages/core` tests use happy-dom; run via repo scripts (esbuild daemon hang, exit 124 is
  treated as success).

## Also open (lower priority, documented in MULTILINGUAL_NEXT_STEPS.md)

- **Part 2b**: 23-language `fetch … with { }` patterns + naked-named-arg capture
  (`with method:"POST" body:form`, which is what the corpus actually uses — the brace fold
  never fires on it). All-or-nothing, per the R1 constraint above.
- **The scoring change**: turning `unconsumed-input` into a confidence penalty. Preconditions
  are listed in `MULTILINGUAL_NEXT_STEPS.md`. Fixing the `roles: []` commands first is a stated
  precondition, because a zero-required-role schema scores 1.0 unconditionally and would swing
  hardest under a coverage penalty. If it lands, re-evaluate whether Stages 0 / 0.5 of
  `parseInternal` can be simplified — they exist only because this signal was missing.
- ~~**Branch protection gap**~~ — **CLOSED.** `Multilingual Validation` is now a required
  status check on `main`, alongside `Build All Packages`, `Lint & Typecheck`, `Unit Tests`,
  and `Export Validation` (`strict: true` preserved). This is what let #627's ~0.006 R1
  drift merge unnoticed. Safe for doc-only PRs: `ci.yml` deliberately carries no
  workflow-level `paths-ignore`, so the workflow always runs and the job's `if:
  needs.changes.outputs.code == 'true'` skip reports a completed check run with
  conclusion `skipped`, which branch protection treats as passing. (A workflow-level
  path filter would instead leave the check "Expected" forever.)
