# Handoff — the multilingual lossy tail (degenerate band now empty)

> Written 2026-06-27, after `ko window-scroll` (PR #492) and `tl behavior-resizable`
> (PR #493) cleared the last two priority **degenerates** — the priority degenerate band is
> now **0**. This is the successor to the now-complete
> [`HANDOFF-remaining-degenerate-singletons.md`](HANDOFF-remaining-degenerate-singletons.md);
> read [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md) (Tracks 1–5) +
> [`HANDOFF-multilingual-priorities.md`](HANDOFF-multilingual-priorities.md) for the full
> narrative. This doc is the **ready-to-resume scope for the remaining lossy band**. Arc 1
> (th behaviors) is **empirically grounded** through `ml.parse`; arcs 2–4 are scoped with
> hypotheses to **verify first** (see the methodology lessons — the theorized root cause is
> usually wrong).

## Where we are (browser-priority, baseline `multilingual-priority.json`)

The committed baseline is authoritative (`timestamp`/`commit` stamp each regen). At the time
of writing (stamp `84bcac01`, post #492/#493):

| Signal                        | Value                                                    |
| ----------------------------- | -------------------------------------------------------- |
| parse rate                    | **3695 / 3696** (1 hard fail: `tr window-resize`)        |
| degenerate (fid < 0.5)        | **0** ✅                                                 |
| lossy (0.5 ≤ fid < 1.0)       | **32**                                                   |
| avgFidelity (R0-recall)       | 0.997                                                    |
| avgPrecision (R0 trust floor) | 0.970                                                    |
| avgRoleFidelity (R1)          | **0.842 — the laggard** (hi 0.750 · qu 0.779 · bn 0.784) |

### The lossy leverage map (regenerate from the baseline — do NOT trust after more lands)

```
behaviors (loop-body family):
  behavior-draggable (3)   ar,qu,th
  behavior-resizable (2)   ar,th
  repeat-until-event (2)   ar,sw
  behavior-removable (1)   th
  behavior-sortable  (1)   th
non-behavior clusters:
  set-color-variable (4)   ms,sw,vi,zh   ← biggest non-behavior cluster
  get-value          (3)   de,pl,zh
  unless-condition   (3)   qu,vi,zh      ← was the biggest; he cleared in #490
  form-submit-prevent(2)   he,zh
singletons:
  keydown-key-is-syntax(hi), if-empty(ko), input-validation(ko), last-in-collection(ms),
  append-content(qu), input-mirror(vi), morph-with-template(vi),
  render-template-with-data(vi), take-class-from-siblings(zh), tell-command(zh),
  tell-other-element(zh)
```

Regenerate the map (the authoritative version) with:

```bash
node -e "const b=require('./packages/testing-framework/baselines/multilingual-priority.json');
const l={};for(const [L,x] of Object.entries(b.languages)){if(L==='en')continue;
for(const p of x.lossyPasses||[])(l[p]=l[p]||[]).push(L);}
console.log(Object.entries(l).sort((a,b)=>b[1].length-a[1].length).map(([p,ls])=>p+' ('+ls.length+'): '+ls.join(',')).join('\n'));"
```

## ⚠️ Methodology lessons (read before diagnosing — reinforced AGAIN this session)

Both degenerate diagnoses in the prior handoff were **wrong**, and so were **three** th
sub-hypotheses this session. The gate-faithful `ml.parse` repro caught every one before code
was written. Bake these in:

1. **Reproduce through the gate path (`ml.parse` on the DB translation), not raw `parse`.**
   The parse-validator calls `MultilingualHyperscript.parse(translation, lang)`
   (`@hyperfixi/core/multilingual`) over the `patterns.db` translations and scores recall of
   the en reference's distinct actions (`collectActions`, `testing-framework/.../fidelity.ts`).
2. **Verify the LAYER empirically.** This session: ko was theorized as a `trySOVEventExtraction`
   gap — it was actually **Stage 2 short-circuiting** on a command-homonym (the extractor already
   worked). tl was theorized as the loop-body/`measure` arc — it was actually the **i18n
   tokenizer not tracking `()`**. For the th cluster below, the colon-split of `resizable:start`,
   the known-vs-custom event, and the destination marker were ALL ruled out as red herrings.
3. **Tokenize + parse the failing clause in isolation.** A standalone-command probe (`parse(clause,
lang)`) + a `GrammarTransformer.transform(en)` probe localize transform-vs-parser in minutes.

## The gate workflow (unchanged — how #492/#493 were validated)

1. `nvm use` (Node 24). On fresh node_modules, `npm rebuild better-sqlite3` first.
2. Build + populate (the gate REFUSES a stale dist or stale DB):
   `npm run test:multilingual:build-deps` then
   `npm run populate --prefix packages/patterns-reference`.
3. Gate: `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle
browser-priority --regression` (must print "✓ No regression"). After an INTENTIONAL fidelity
   change: `--save-baseline`.
4. Commit src + test + baseline; **`git checkout -- packages/patterns-reference/data/patterns.db`**
   (CI repopulates — never commit it). One defect per PR, branch off main. Guards: i18n →
   `grammar.test.ts`; semantic → `multilingual-roadmap-fixes.test.ts`; **verify the guard fails
   without the fix** (`git stash` the src, run `-t "<title>"`, pop). Stacked PR? Rebase the child
   onto main after the parent squash-merges (the squash SHA differs, so the child's parent commit
   must be dropped — `git rebase --empty=drop origin/main`) and retarget before deleting the parent.

**Gate-faithful repro** (throwaway under `packages/patterns-reference/scripts/`, delete after).
Note `@hyperfixi/core` touches the DOM at import (needs jsdom); patterns-reference is CJS (`.ts`
ext + `async function main(){…}; main()`); semantic is ESM (`"type":"module"`, so inline a tiny
`collectActions` rather than cross-importing the testing-framework `.ts`). Template:

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
// inline collectActions: walk action + [body,statements,thenBranch,elseBranch,branches,
//   eventHandlers,initBlock], skip 'compound'.
// run: LSP_DB_PATH="$PWD/.../patterns.db" PATTERN=behavior-resizable LANGS=th npx tsx <file>
```

---

## Arc 1 — th behaviors: `trigger`/`send` (event-category commands) don't parse [GROUNDED]

**This is the recommended next arc.** th is the **only** language lossy across **all four**
behaviors, and the loss is a **single root cause**.

**Verified (2026-06-27, via `ml.parse` + standalone `parse`):**

| behavior           | th missing | th fid |
| ------------------ | ---------- | ------ |
| behavior-draggable | `trigger`  | 0.875  |
| behavior-removable | `trigger`  | 0.875  |
| behavior-resizable | `trigger`  | 0.889  |
| behavior-sortable  | `trigger`  | 0.900  |

Every behavior drops exactly **`trigger`**. Localization:

- The th `trigger` **keyword is fine**: `ทริกเกอร์` tokenizes as `[keyword] normalized="trigger"`
  (th profile `thai.ts:82`, `trigger: { primary: 'ทริกเกอร์', … }`), and the transform is clean
  (`trigger resizable:start` → `ทริกเกอร์ resizable:start`).
- The th `trigger` **command pattern fails to match**: `ทริกเกอร์ foo` THROWS standalone
  ("Could not parse input in th"), while es `disparar foo` → `action=trigger`.
- It is a **whole category**, not one verb: `ส่ง foo` (`send`) ALSO throws in th. trigger + send
  share `category: 'event'`, `primaryRole: 'event'` (`command-schemas.ts` `triggerSchema`).
- **Red herrings ruled out** (do not chase these): (a) the colon in `resizable:start` splitting to
  `resizable` + `:start` — **es splits it identically and still parses**; (b) known vs custom event
  — `ทริกเกอร์ คลิก` (known `click`) throws too; (c) the destination marker — `ทริกเกอร์ foo ใน ฉัน`
  (`trigger foo on me`) throws too.
- th profile is **SVO / preposition-marking / `usesSpaces: false`** (Thai has no inter-word
  spaces) — the leading suspect for why the SVO `event`-role pattern generates/matches for es but
  not th.

**Start here:** find the pattern source the PARSER actually consults for th `trigger`/`send`
(`getGeneratedPatternsForLanguage('th')` returned 0 in a quick probe — the live patterns come
through `buildPatternsForLanguage` / the matcher's loader; trace it), and diff why an es trigger
pattern matches `disparar foo` but no th pattern matches `ทริกเกอร์ foo`. Prime suspect: the
`event`-category SVO pattern generation interacting with `usesSpaces:false`, or a missing th
`event`-role marker. Because `send` is hit too, a fix should be validated on any th `send`-using
pattern, not just the four behaviors.

**Risk:** LOW–MEDIUM (th-contained; behaviors are a user priority). **Value:** clears **4 lossy**
in one fix (and likely th `send`).

---

## Arc 2 — behavior loop-body `measure` drop (ar) [VERIFY FIRST]

**Hypothesis (from the priorities handoff — NOT yet re-verified this session):** `behavior-draggable`
(ar) + `behavior-resizable` (ar) drop the **`measure`** command (`measure width` / `measure
height` / `measure x/y`) inside the `repeat until event pointerup … end` loop body;
`repeat-until-event` (ar/sw) is the same loop-body family. A `measure`/loop-body fix would likely
move several at once.

**Start here:** `PATTERN=behavior-resizable LANGS=ar` through the repro and confirm the missing
action is `measure` (the prior handoff's note; ar resizable was 0.667→0.889 after the #493 paren
fix, so re-check what it drops NOW). Then isolate `measure width` in ar — tokenize + parse it
standalone, and check the ar `measure` keyword/pattern the same way Arc 1 localized th `trigger`.
The tl paren fix (#493) already cleared the ar handler-head mangling, so the residual is narrower
than the priorities handoff assumed — **re-localize before trusting the `measure` framing.**

**Risk:** MEDIUM (behavior body-parse). **Value:** likely clears ar draggable + resizable (+ maybe
`repeat-until-event`).

---

## Arc 3 — `set-color-variable` (ms,sw,vi,zh) [VERIFY FIRST]

**The biggest non-behavior lossy cluster (4).** Likely one shared defect: setting a CSS custom
property (a `set` whose target/value is a `--var` / `*--color`-style property) across these four
langs. **Verify the layer** (transform vs parser) before assuming — this is exactly the shape that
fooled the ko/tl diagnoses.

**Start here:** `PATTERN=set-color-variable LANGS=ms,sw,vi,zh`; dump the missing action and the
translation text; tokenize the failing `set` clause. Check whether the CSS-var token survives the
i18n transform and how the semantic `set` pattern types it.

**Risk:** unknown until diagnosed. **Value:** up to 4 lossy in one fix.

---

## Arc 4 — R1 / SOV role-fidelity burn-down (Track 3) [LARGER ARC]

avgRoleFidelity **0.842** is the laggard (hi 0.750 · qu 0.779 · bn 0.784 · ja 0.795 · ko 0.802 ·
tr 0.807 — the SOV/reorder set). R1 measures `action.role:valueType` recall — a parse that keeps
the verb but drops/mistypes a role. The Track 3 triage (see `MULTILINGUAL_NEXT_STEPS.md`) found the
dominant cause is **structural SOV mis-anchoring** (a fronted literal/expression mistaken for the
event), NOT dict-alignment — the same convergent **SOV event-anchor arc**. The ko `window-scroll`
fix (#492) is a recent example of this family (a Stage-2 guard on the hottest SOV path).

**This edits the hottest, most regression-sensitive parser path (every passing SOV lang).** Give
it a dedicated arc with careful R0/precision/parse-rate guards — not a tail-end increment. New
`--regression` runs won't flag R1 drift until someone drives it; greenfield headroom.

**Risk:** HIGH (hottest path). **Value:** highest absolute headroom, but open-ended.

---

## Deferred / out of scope

- **`tr window-resize`** — the lone parse hard-fail (3695/3696). Compounded i18n underscore-split
  (`boyut_değiştir` → `değiştir` collides with `toggle`) + an untranslated `debounced at 200ms`
  modifier; a high-risk multi-part change to the hottest path for the single lowest-ROI pattern.
- **`populate` determinism (Track 5 hygiene).** CLAUDE.md flags "minor residual jitter" on a few
  boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02 avg). A
  deterministic populate lets the tolerances tighten toward 0 — fold in opportunistically.
- The singleton long tail (`get-value`, `tell-*`, `keydown-key-is-syntax`, `if-empty`, …) is
  per-pattern mop-up — defer behind the clusters above.

## Recommended sequence

1. **Arc 1 (th `trigger`/`send`)** — grounded, bounded, behavior-priority, clears 4 lossy.
2. **Arc 2 (ar `measure`)** — re-localize, then likely clears ar draggable + resizable.
3. **Arc 3 (`set-color-variable`)** — biggest non-behavior cluster; diagnose first.
4. **Arc 4 (R1/SOV)** — dedicate a guarded session; highest headroom, highest risk.
