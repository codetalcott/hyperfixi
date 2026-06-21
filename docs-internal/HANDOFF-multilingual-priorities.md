# Handoff — remaining multilingual fidelity priorities

> Written 2026-06-21, after the `behavior-sortable` residuals landed on `main`
> (PRs **#470** exit/end collision, **#472** ar from-first `wait`). Read
> [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md) first for the full
> Tracks 1–5 narrative; this doc is the **ready-to-resume, concrete** scope for the
> priority items that remain, with the _current_ (not 2026-06-17) leverage map.

## Where we are (2026-06-21 `browser-priority` baseline)

`packages/testing-framework/baselines/multilingual-priority.json` is authoritative
(its `timestamp`/`commit` stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                        | Value                         |
| ----------------------------- | ----------------------------- |
| parse rate                    | **3695 / 3696** (1 hard fail) |
| degenerate (fid < 0.5)        | **9**                         |
| lossy (0.5 ≤ fid < 1.0)       | **53**                        |
| faithful                      | **~3633**                     |
| avgFidelity (R0-recall)       | 0.993                         |
| avgPrecision (R0 trust floor) | 0.962 — hi 0.837 outlier      |
| avgRoleFidelity (R1)          | **0.837 — the laggard**       |
| avgExecutionFidelity (R2)     | 1.000                         |

**The complete current non-faithful set** (regenerate with the script in "How to
resume" — do NOT trust these counts after more work lands):

```
HARD FAIL (parse null):
  window-resize           tr

DEGENERATE (fid < 0.5):
  install-behavior        ru, uk
  live-derived-value      hi
  live-multiple-deps      hi
  socket-basic            ms
  unless-condition        he
  window-scroll           ko
  behavior-resizable      tl
  default-value           tr

LOSSY (top, by lang-count):
  unless-condition (8)    bn,hi,ja,ko,qu,tr,vi,zh
  fetch-do-not-throw (5)  bn,hi,ja,ko,tr
  get-value (4)           de,he,pl,zh
  set-color-variable (4)  ms,sw,vi,zh
  behavior-draggable (3)  ar,qu,th
  behavior-resizable (2)  ar,th
  repeat-until-event (2)  ar,sw
  …singletons: form-submit-prevent, if-empty, input-validation, tell-*, etc.
```

## ⚠️ Methodology lessons from the sortable arc (read before diagnosing anything)

The sortable handoff got **two of three root causes wrong**, and the cost was real
debugging time chasing the wrong layer. Bake these in:

1. **The gate path is `ml.parse` on the DB translation — NOT raw `parse`.** The
   parse-validator calls `MultilingualHyperscript.parse(pattern.hyperscript, lang)`
   (`@hyperfixi/core/multilingual`) over the `patterns.db` translations, then scores
   with `collectActions` (recall over the en reference's _distinct_ actions,
   `packages/testing-framework/src/multilingual/fidelity.ts`). A raw
   `parse(text, lang)` from `@lokascript/semantic` **diverges** — e.g. ja sortable's
   `set` dropped under raw `parse` but survives under `ml.parse`, which sent the
   prior author chasing a non-existent "verb-medial set (A2a)" bug. **Always
   reproduce through the gate-faithful path** (harness below) before forming a
   diagnosis.
2. **Verify the layer empirically; the theorized root cause is often wrong.** "de V2
   body-parse (defect C)" was actually the `exit`/`end` keyword collision (a
   one-line keyword-set bug). "ar transformer mask-split" was actually the ar
   _tokenizer_ splitting `وثيقة` at the `و` proclitic — the transformer output was
   clean. Tokenize the failing clause and print the parse tree before blaming the
   transformer or the parser.
3. **Fidelity = recall of distinct en actions.** Precision (phantom commands) and R1
   (role types) are separate ratchet signals. A pattern can be "faithful" (recall
   1.0) while leaking a spurious command (precision) — check `spuriousActions` if
   precision is the concern.

## The priority items (each its own arc)

### 1. Reactivity bareKeyword block-shape — `live` / `intercept` / `socket` (Track 2)

**Current:** hi `live-derived-value` + `live-multiple-deps` **degenerate**; ms
`socket-basic` **degenerate** (3 of the 9 degenerate). The doc's diagnosis (likely
correct, but VERIFY per lesson 2): `live`/`intercept`/`eventsource`/`socket`/`worker`
are `bareKeyword` blocks (`hasBody: true`), but `block-parser.ts` only structurally
handles `behavior`/`def`. In non-English a `live … end` block parses as a bare `on`,
dropping the block action. Teach the block layer the bareKeyword-block shape (mirror
the `behavior`/`def` layer). Bounded, clears 3 degenerate, structural not per-lang.
**Highest-ROI degenerate cleanup.**

### 2. `install-behavior` degenerate in ru/uk (Track 1 — behaviors are a user PRIORITY)

**Current:** `install-behavior` **degenerate** in ru + uk (the other 2 of the
"behaviors" degenerate, alongside tl `behavior-resizable`). Likely a block-opener /
marker-homonym issue in `block-parser.ts` (cf. the merged pt `para` fix — a dative
marker colliding with the `for` loop opener; ru/uk may have an analogous
`install`/declaration collision). Start by tokenizing the ru/uk `install …`
translation and checking `isBlockOpener` / the declaration routing. Small, bounded,
and behavior-facing.

### 3. `unless-condition` — biggest single lossy cluster (Track 4)

**Current:** **8 lossy** (bn,hi,ja,ko,qu,tr,vi,zh) **+ degenerate in he** — the
largest non-behavior correctness debt. Long-standing diagnosis: control-flow body
parsing — `unless`/`if` headers + then-chain `put`/`set` bodies collapsing. Note
`unless` is deliberately NOT folded by `tryParseConditionalBlock` (folding would
relabel its action `unless`→`if` and desync the action-set comparison — see the
comment there), so its body goes through the flat per-clause path. The fix likely
lives in how the flat path scopes the `unless … end` body across SOV/SVO. Take
`unless-condition` as representative; the he degenerate is the sharpest repro.

### 4. Behavior faithful-pass tail — draggable / resizable + th/ar/qu (Track 1)

**Current:** `behavior-draggable` lossy in ar/qu/th; `behavior-resizable` degenerate
in tl and lossy in ar/th; `behavior-removable`/`behavior-sortable` lossy in th. Two
recurring sub-defects (verify): (a) the **`measure` command** drops in ar/draggable
(and likely resizable) — `measure x` / `measure y` inside the loop body; (b) `th` is
lossy across all four behaviors (a th-specific body-parse or tokenizer issue worth one
focused look — th is the only lang where all four behaviors are non-faithful).
`repeat-until-event` (ar/sw lossy) is the same loop-body family. The `measure` /
loop-body fix would likely move several at once.

### 5. R1 role-fidelity burn-down — the laggard dimension (Track 3)

**Current:** avgRoleFidelity **0.837**; worst **hi 0.717 · qu 0.770 · bn 0.780 · ko
0.790 · ja 0.793 · tr 0.797** — the hard SOV/reorder set. R1 measures
`action.role:valueType` recall vs the en reference (a parse that keeps the verb but
drops/mistypes a role). Triaged in the doc as dominated by **structural SOV mis-
anchoring** (a fronted literal/URL mistaken for the event), NOT dict-alignment; one
increment already lifted hi 0.683→0.717. The remaining work is the **convergent SOV
bare-command / event-anchor arc**, which also owns `fetch-do-not-throw` (5 lossy,
complex multi-clause SOV `fetch … as JSON do not throw then if …`). **This edits the
hottest, most regression-sensitive parser path (every passing SOV lang), so it
deserves a dedicated arc with careful R0/precision/parse-rate guards** — not a
tail-end increment. New `--regression` runs won't flag R1 drift until someone drives
it; greenfield headroom.

### 6. Reliability hygiene (do alongside, Track 5)

- **Make `populate` deterministic.** CLAUDE.md flags "minor residual jitter" on a few
  boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02
  avg). Deterministic populate → tighten tolerances toward 0 → trust the gate more.
- **Absolute fidelity floor**, not just a ratchet: once a lang clears a threshold,
  ratchet the floor up so it can't silently backslide within tolerance.
- **hi precision 0.837** is the clear outlier (next ja 0.909) — phantom-command
  sources in the hi profile; partly subsumed by the R1/SOV arc.

> **Lower priority / known-hard, not in the ranked set:** `tr window-resize` (the
> lone hard-fail) — compounded i18n underscore-split (`boyut_değiştir` → `değiştir`
> collides with `toggle`) + an untranslated `debounced at 200ms` modifier; high-risk
> multi-part change to the hottest path for the single lowest-ROI pattern. `ko
window-scroll` / `tr default-value` degenerate are isolated singletons. The
> singleton lossy tail (`get-value`, `set-color-variable`, `tell-*`, …) is per-pattern
> mop-up — defer behind the clusters above.

## How to resume (gate-faithful repro + the gate)

**Build deps first** so `@lokascript/*` and `@hyperfixi/core` dist are fresh, and
**populate** so the DB translations match:

```bash
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
```

**Gate-faithful repro** (throwaway under `packages/patterns-reference/scripts/`, run
with `LSP_DB_PATH="$PWD/packages/patterns-reference/data/patterns.db" npx tsx …`,
delete after — NOT committed). This replicates the gate exactly: DB translation +
`ml.parse` + `collectActions`. jsdom is needed because `@hyperfixi/core` touches the
DOM at import.

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

const PATTERN = process.env.PATTERN ?? 'unless-condition';
const ml = new MultilingualHyperscript();
await ml.initialize();
const p: any = (await getAllPatterns()).find((x: any) => x.id === PATTERN);
const enActs = collectActions(await ml.parse(p.rawCode, 'en'));
for (const lang of (process.env.LANGS ?? 'hi,ja,ko,qu,tr').split(',')) {
  const t: any = (await getTranslationsByLanguage(lang, 2000)).find(
    (x: any) => x.codeExampleId === p.id
  );
  const acts = collectActions(await ml.parse(t.hyperscript, lang));
  console.log(
    lang,
    'missing',
    enActs.filter(a => !acts.includes(a)),
    '| text:',
    t.hyperscript
  );
}
```

Aggregate the **current** leverage map straight from the baseline JSON (the block in
"Where we are" was produced this way — re-run it after each landing):

```bash
node -e "const b=require('./packages/testing-framework/baselines/multilingual-priority.json');
const d={},l={};for(const [L,x] of Object.entries(b.languages)){if(L==='en')continue;
for(const p of x.degeneratePasses||[])(d[p]=d[p]||[]).push(L);for(const p of x.lossyPasses||[])(l[p]=l[p]||[]).push(L);}
const f=o=>Object.entries(o).sort((a,b)=>b[1].length-a[1].length).map(([p,ls])=>p+' ('+ls.length+'): '+ls.join(',')).join('\n');
console.log('DEGEN\n'+f(d)+'\n\nLOSSY\n'+f(l));"
```

**Gate** (reproducible locally; refuses to run against a stale/unstamped DB):

```bash
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# after an INTENTIONAL fidelity change: re-run with --save-baseline and commit the baseline
```

## Conventions (held across #445–#472)

- Branch off `main`; **one defect per PR**; stacked PRs if a later arc depends on an
  earlier one — but **retarget a stacked child to `main` BEFORE deleting the
  parent's branch** (deleting the base auto-_closes_ the child; #471 hit this and had
  to be reopened as #472).
- Add a guard to
  [`packages/semantic/test/multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
  and **verify it fails without the fix** (`git stash` the src, run `-t "<title>"`,
  pop). Use hand-written corpus-shaped transformer output + `parse` (the file's
  established style) — but cross-check the real outcome through the gate-faithful
  `ml.parse` repro above.
- **Zero-regression bar:** the gate must print "No regression" with no
  within-tolerance flips.
- Do **not** commit `patterns.db` (CI re-populates — `git checkout` it before
  committing); commit only src + test + baseline. Regenerate the baseline against a
  freshly `populate`d DB.

## Recommended sequence

Highest leverage / cleanest first:

1. **Reactivity bareKeyword block-shape (#1)** — clears 3 degenerate, bounded, structural.
2. **`install-behavior` ru/uk (#2)** — small, behavior-facing (user priority), likely a marker-homonym.
3. **`unless-condition` (#3)** — biggest single lossy cluster (8+1).
4. **Behavior faithful-pass tail (#4)** — the `measure`/loop-body + th sweep moves several at once.
5. **R1 / SOV event-anchor arc (#5)** — highest absolute headroom but regression-sensitive; dedicate an arc with R0/precision guards.
6. **Reliability hygiene (#6)** — fold in alongside (deterministic populate unlocks tighter ratchets).
