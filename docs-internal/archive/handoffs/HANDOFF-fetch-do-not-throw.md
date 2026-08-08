# Handoff — `fetch-do-not-throw`: the if-body verb-medial `set` drop (SOV #5)

> Written 2026-06-22 after landing the **phantom-throw precision strip** (the
> contained half of this cluster). This doc tees up the **remaining, harder half**:
> the if-block body collapse that drops `set` across all 5 SOV langs. It is the
> hottest, most regression-sensitive parser path (the priorities-handoff **#5**
> "dedicated arc with careful guards") — read the methodology lessons in
> [`HANDOFF-multilingual-priorities.md`](HANDOFF-multilingual-priorities.md) first
> (reproduce through `ml.parse` on the DB translation; **verify the layer
> empirically — the theorized root cause is usually wrong**).

## The pattern

```
en rawCode:  on click fetch /api/users as JSON do not throw then if it set $users to it end
en parse:    on → compound[ fetch, if(condition:it, then:[ set($users, it) ]) ]
en actions:  {on, fetch, if, set}
```

`fetch-do-not-throw` is **lossy in bn, hi, ja, ko, tr** — every one of them parses to
`{on, fetch, if}` and **drops `set`**: the `if` folds (or matches flat) with an
**empty then-branch**. By recall that is 3/4 = lossy. (qu/vi/zh etc. are faithful here;
this is an SOV-only failure.)

## What ALREADY landed (this PR) — DO NOT redo

The **phantom `throw`** is fixed. `do not throw` is a fetch error-handling OPTION, not
a command; en drops it. The SOV transform leaks the English `do` untranslated and
reorders the throw VERB out of the fetch clause (`… JSON do ではない 投げる それから …`),
so in the multi-clause body it anchored a **spurious `throw` command** (precision
defect across bn/hi/ja/ko/tr, plus phantoms in several SVO langs).

- Fix: `stripDoNotThrowModifier` in `packages/semantic/src/parser/semantic-parser.ts`
  (mirrors `stripAsyncModifier`), called right after the async strip. Removes the
  `do … throw` span before parsing, anchored on the leaked `do` literal + a
  `throw`-normalized verb within a small window (ja's negation `ではない` shatters into
  `で`/`は`/`ない`, so a 2-token window misses it — the window is 5, stopping at a
  value/conjunction).
- Result: **avgPrecision 0.9633 → 0.9645** (the phantom was in many langs' fetch
  pattern, not just the 5 lossy). Band steady (set still missing). Gate clean.
- Guard: "`do not throw` fetch modifier strip" in `multilingual-roadmap-fixes.test.ts`.

**The `set` drop is untouched and is what remains.** Removing the phantom throw did
NOT recover `set` — verified: even with `do not throw` deleted from the input, `set`
still drops. The two are independent.

## The remaining defect: the if-body verb-medial `set` collapses

### Empirical findings (instrumented — these are FACTS, not theory)

1. **It is `set`-specific, not "verb-medial in general."** In ja, verb-medial
   `toggle` (`.active を 切り替え`) and `put` (`それ を $users に 置く`) parse fine, but
   verb-medial `set` (`$users を 設定 それ に` / `.active を 設定 それ に`) **fails to
   parse at all** ("all parse stages exhausted").

2. **`set`'s role markers are INVERTED vs the default SOV map.** `setSchema`
   (`generators/command-schemas.ts`) has `markerOverride` giving the **destination**
   the accusative marker (ja `を`, ko `를`, tr `i`, bn `কে`, hi `को`) — the marker the
   default profile map assigns to **patient**. So `$users を 設定 それ に` =
   `set(destination:$users, patient:it)`, but `extractRolesFromMarkedTokens`'
   default `markerToRole` reads `を`→patient, `に`→destination (inverted). `set` and
   `put` are special-cased in `mapRoleForCommand` (the `markerRole==='patient' &&
!destination → 'destination'` swap), but that path is only reached when the role is
   already taken — verify whether it actually fires for the verb-medial set.

3. **ja/ko have NO hand-crafted set patterns** (`patterns/set.ts` has set-bn, set-hi,
   …, but no set-ja/set-ko/set-tr) — they rely on schema-generated patterns. **But bn
   and hi DO have hand-crafted set patterns and STILL drop `set` here.** So it is NOT
   a missing-pattern problem — it is the **branch/clause parsing of the verb-medial
   set in the if-body**.

4. **`parseBranch` / `parseSOVClauseByVerbAnchoring` NEVER RUN for this if-block.**
   Instrumented both (debug prints): zero output on the full ja event-handler parse.
   So `tryParseConditionalBlock` is **not folding** the if-block in the event-body
   path — the `if` is emitted FLAT (a bare `if` command, no then-branch), and the
   verb-medial `set` body is never handed to a parser that could recover it.
   - The standalone `もし それ $users を 設定 それ に 終わり` is a RED HERRING: at the
     top level it's matched as a bare `if` by Stage-2 matchBest and also never reaches
     `parseBranch`. **Always reproduce inside the event handler** (the real path).

### The likely root cause to confirm

The event-handler body for this shape is parsed by **`buildEventHandler`** — and for a
fused event match it routes the body through **`parseBodyWithGrammarPatterns`** (the
then-chain/continuation parser), NOT **`parseBodyWithClauses`** (which is where
`tryParseConditionalBlock` lives, line ~840). So the `if` block is never offered to the
folding path; it collapses to a flat `if`. **Confirm which body-parser path
fetch-do-not-throw takes** (add a temp print in `buildEventHandler`'s two branches),
then either (a) route a body containing a block opener through `parseBodyWithClauses`,
or (b) teach `parseBodyWithGrammarPatterns` to fold a trailing `if/unless … end` block.
Both must keep the verb-medial `set` recovery working in the then-branch — which is
its own sub-problem (finding #1: verb-medial `set` doesn't parse even standalone).

So this is **two nested fixes**: (A) get the if-block to a folding parser in the event
body, and (B) make the verb-medial `set` then-branch actually parse (role-marker
inversion in `parseSOVClauseByVerbAnchoring` / the generated pattern). Land them in
whichever order lets you verify each with the gate; **one defect per PR** if they
separate cleanly.

### Generalization (why it's worth the arc)

The same flat-`if`-with-dropped-body shape almost certainly explains the OTHER lossy
if-body patterns — **`if-empty`** (he, ko) and **`input-validation`** (he, ko) are
prime suspects, and any `… then if … <verb-medial-body> … end` SOV pattern. Confirm by
reproducing those after the fix; one root-cause fix may clear several.

## Reproduction harness (gate-faithful — recreate, delete after; NOT committed)

Build deps + populate first (the gate refuses a stale DB). Then a throwaway under
`packages/patterns-reference/scripts/` run with
`LSP_DB_PATH="$PWD/packages/patterns-reference/data/patterns.db" npx tsx …`:

```ts
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis as any, {
  window: dom.window,
  document: dom.window.document,
  Element: dom.window.Element,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
});
import { getAllPatterns, getTranslationsByLanguage } from '../src/index';
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
import { collectActions } from '../../testing-framework/src/multilingual/fidelity';
const ml = new MultilingualHyperscript();
await ml.initialize();
const p: any = (await getAllPatterns()).find((x: any) => x.id === 'fetch-do-not-throw');
const en = collectActions(await ml.parse(p.rawCode, 'en')); // {on, fetch, if, set}
for (const lang of ['bn', 'hi', 'ja', 'ko', 'tr']) {
  const t: any = (await getTranslationsByLanguage(lang, 2000)).find(
    (x: any) => x.codeExampleId === p.id
  );
  const acts = collectActions(await ml.parse(t.hyperscript, lang));
  console.log(
    lang,
    'missing',
    en.filter(a => !acts.includes(a)),
    '|',
    t.hyperscript
  );
}
```

For the instrumented dig: temp `console.error` in `buildEventHandler` (which body
branch), in `parseBranch` (in/out), and in `parseSOVClauseByVerbAnchoring` (verb +
extracted roles). Gate on `DBG`-style env var; restore the file from a `/tmp` backup
after (the verb-medial-set debug from this session was removed cleanly).

## Conventions (held across #445–#480)

- Branch off `main`; **one defect per PR**. Hot path → gate after EVERY change.
- Guard in `packages/semantic/test/multilingual-roadmap-fixes.test.ts`, **verified red
  without the fix** (`git stash` the src, run `-t "<title>"`, pop).
- `--regression` gate must print "No regression"; after an intentional fidelity change
  re-run with `--save-baseline` and commit the baseline. Do **not** commit
  `patterns.db` (CI re-populates — `git checkout` it). Watch **R0-recall** (set
  recovered), **R0-precision** (no NEW phantom), **R1** (set roles correct — beware the
  inverted markers), and **parse-rate** — this path touches every passing SOV lang.
- If a fix proves too broad/risky for one PR, prefer landing the narrower half and
  re-handing-off, exactly as this phantom-throw strip was split from the set drop.
