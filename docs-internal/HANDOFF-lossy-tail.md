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

The committed baseline is authoritative (`timestamp`/`commit` stamp each regen).

> **Update 2026-06-27 (lossy tail CLEARED — lossy 10 → 0; the band is empty).** All ten
> remaining lossy passes were fixed this session. The "hard residue / hottest-path body-parse"
> framing held in only ONE case (ko if-folding); the rest were the same _localized-alignment_
> family the doc kept declaring "exhausted" — the methodology lesson (theorized cause is wrong
> until `ml.parse` corrects it) held on every single one. Fixes, each grounded + guarded
> (`multilingual-roadmap-fixes.test.ts`, fail-without-fix verified):
>
> - **ar `measure`** (behavior-draggable, behavior-resizable): the dict emits the undiacritized
>   imperative `قس`, the profile only knew `قياس`/`قِس`. Added `قس` to the profile measure
>   alternatives (pruned the now-stale `ar:measure:قس` lexicon-emit-mismatch entry). NOT the
>   loop-body fold the doc theorized.
> - **qu `repeat`** (behavior-draggable): NOT a missing `tryParseLoopBlock`. A verb-final `wait`
>   (`suyay`) greedily anchored its match AT the clause-final loop keyword `kutipay`, swallowing
>   it — so matchBest _succeeded_ and the bare-`repeat` recovery (gated on matchBest failing)
>   never fired. `parseClause` now rejects a non-`repeat` match anchored at the repeat keyword.
> - **ar/sw `on`** (repeat-until-event): NOT loop-body — the multi-token event name dropped the
>   whole handler. ar spaces events (`فأرة أسفل`=mousedown) and the leading `ف` was stripped as a
>   `then` proclitic; the ar `tokenizeWithExtractors` override now runs `tryMultiWordKeyword`
>   first. sw underscore-joins events (`panya_shuka`); the sw keyword reader now joins a `_` run
>   when it resolves to a registered keyword.
> - **hi `clear`** (keydown-key-is-syntax): `साफ़-करें` (a `-करें` compound) split on the hyphen.
>   The hi keyword reader now joins a `-` run when it resolves to a registered keyword. (The Arc-4
>   "SOV event-anchor mis-anchor" theory was wrong — it was a hyphen tokenization split.)
> - **ms `scroll`** (last-in-collection): the dict keeps `scroll` English; the profile only knew
>   `tatal`/`skrol`. Added `scroll` to the profile alternatives (cf. `push`).
> - **vi `put`** (input-mirror): the possessive patient `của tôi giá trị` (my value) broke the
>   match because `giá trị` (value) wasn't a registered token (only `đặt giá trị`=set was).
>   Registered `giá trị`=value; longest-first keeps `đặt giá trị`=set.
> - **ko `add`** (if-empty, input-validation): the ONE genuine hottest-path fix. The SOV transform
>   splits the verb-final `is empty` predicate so the then-branch verb (`추가`=add) lands DIRECTLY
>   after the copula `이다`(is); the conditional fold's copula guard swallowed it. ja/bn escaped
>   only because their copula isn't lexed as a single `is` token. The condition-split now fires
>   after a copula when a real SOV command-verb keyword opens there (gated to SOV + verb-lookup
>   hit, so SVO `X is empty <cmd>` is byte-identical — verified on en).
>
> Gate: `--regression` green (3695/3696, R2 1.0), baseline regenerated (lossy 0, degenerate 0,
> avgFidelity 1.0000, avgPrecision 0.9709, avgRoleFidelity 0.8447). Full semantic suite green
> (6205). **What's left is no longer a lossy band** — only the R1/SOV role-fidelity burn-down
> (Arc 4, avgRoleFidelity 0.845, hi 0.757 the laggard) and the deferred `tr window-resize`
> hard-fail (3695/3696). Both are separate dimensions, not lossy passes.

> **Update 2026-06-27 (session wrap — lossy 32 → 18; the clean alignments are harvested).**
> Five fixes landed this session, all of the _localized-alignment_ kind (a marker, keyword,
> tokenizer rule, or homonym):
>
> - **#495 — th `trigger`/`send`** (Arc 1): th was the only SVO profile with a
>   `roleMarkers.event` (`เมื่อ`); dropped it → 4 th behaviors faithful (32→28).
> - **#497 — `set-color-variable`** (Arc 3): per-language `of`-possessive markers
>   (`OF_POSSESSIVE_MARKERS`: ms `daripada`/sw `ya`/vi `của`/zh `的`) → ms/sw/vi/zh faithful (28→24).
> - **#498 — `get-value`** (de/pl/zh): de profile `erhalten`; pl dict `pobierz`→`uzyskaj`
>   (get/fetch homonym); zh `get-zh-ba` pattern + drop `获得` from `fetch-zh-ba`; **bonus** zh
>   dict `take` `获取`→`拿取` (cleared `take-class-from-siblings` too) (24→20).
> - **#499 — `form-submit-prevent`** (he/zh): per-language `markerOptional` on the `call`
>   patient role (the function-call patient is unmarked in a multi-command body) (20→18).
>
> **What's left (lossy 18) is qualitatively different — the parser body-parse family**, which
> this doc and the priorities handoff reserve for **dedicated sessions**: control-flow body
> parsing (`unless-condition`) + the loop-body arc (`repeat`/`measure`/`repeat-until-event`) +
> a singleton tail. Take each FRESH and ground from scratch (the methodology lesson held all
> session — every theorized cause was wrong until `ml.parse` corrected it). Regenerate the
> leverage map + signals below from the committed baseline before starting.

> **Update 2026-06-27 (next session — lossy 18 → 15; `unless-condition` cleared).** Sequence
> item 3 (`unless-condition` qu/vi/zh) is **DONE**. The "control-flow body-parse / how that path
> scopes the `unless … end` body" framing was — as the doc warned — **the trap**: the en
> reference parses `unless I match .disabled` as a **flat sibling statement** (just a `condition`,
> no nested body), so there is no body to scope. `ml.parse` showed **three unrelated
> keyword/transform causes**, one per language:
>
> - **vi** — semantic profile `unless` primary was `trừ_khi` (underscore) but the transformer
>   emits the spaced `trừ khi`; the bare `khi` (=on/when) was mis-read as a second event handler.
>   Profile primary → `trừ khi` (the BaseTokenizer multi-word matcher catches it longest-first).
> - **qu** — quechua profile had **no `unless`** at all, and the dict's `mana_sichus` `_`-split to
>   `mana`(=false)+`sichus`(=if), so the clause parsed as **`if`**. Added
>   `unless: 'mana sichus'` (spaced, multi-word) + realigned the i18n dict to `mana sichus`
>   (transformer keeps the phrase contiguous clause-final).
> - **zh** — purely a **transform** artifact: `parseEventHandler` swept the whole `unless` tail
>   into one `patient` blob, so the BA particle `把` landed ahead of the _condition_
>   (`除非 把 I match …`, `unless` dropped) instead of on the toggle patient. The existing
>   **Hebrew-only** `tryTransformEventWithUnlessGuard` (which routes the guard through the
>   standalone block path) was the same את/把 object-marker artifact — widened to `{he, zh}`.
>
> Guards: semantic `multilingual-roadmap-fixes.test.ts` (vi/qu/zh parse) + i18n `grammar.test.ts`
> (zh/he marker placement, qu dict form), both verified fail-without-fix; pruned two now-stale
> `lexicon-emit-mismatch` allowlist entries (`qu:unless`, `vi:unless`). `--regression` green,
> baseline regenerated. **What's left (15) is the loop-body family + singleton tail** — unchanged
> below.

> **Update 2026-06-27 (singleton-tail sweep — lossy 15 → 10; the clean keyword/marker band is
> exhausted).** Three more PRs cleared every remaining singleton that was a _localized-alignment_
> defect (a dict keyword, a tokenizer split, or a missing per-language role marker) — the same
> family as #495–#499:
>
> - **#502 — vi `render`** (render-template-with-data, morph-with-template): the i18n dict mapped
>   _both_ `show` and `render` to `hiển thị`, which the profile reads as `show`. Realigned the dict
>   `render`→`kết xuất` (the profile's render primary). lossy 15→13.
> - **#503 — qu `append`** (append-content): dict `qhipaman_yapay` `_`-split to `qhipaman`+`yapay`(=add),
>   so append parsed as `add`. Realigned to the single-token append primary `qatichiy` (same
>   `_`-split family as qu `unless`/`until`). lossy 13→12.
> - **#504 — zh `tell`** (tell-command, tell-other-element): the transformer fronts tell's target
>   with the BA particle (`告诉 把 #modal`), which the generated zh tell pattern didn't expect.
>   Added `zh: '把'` to `tellSchema`'s destination `markerOverride` (mirrors the existing `he: 'את'`).
>   lossy 12→10. **zh is now clear of the lossy band.**
>
> **What's left (10) is all the hard residue — no clean keyword/marker fix remains.** Grounding (via
> `ml.parse`) of the survivors confirms each is a hottest-path body-parse / SOV-anchor defect, not a
> dict tweak: hi `keydown-key-is-syntax` mis-anchors `साफ़-करें`(clear) as a fronted-event `on` (the
> SOV event-anchor arc, Arc 4); ko `if-empty`/`input-validation` drop the `if` block (control-flow
> body-parse); the ar/qu/sw loop-body cluster needs the `tryParseLoopBlock` fold (Arc 2); vi
> `input-mirror` is a possessive-`my value` role drop. Each is its own dedicated session per the
> arcs below — **do NOT bundle them as singletons.**

| Signal                        | Value (lossy band CLEARED — #506)                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| parse rate                    | **3695 / 3696** (1 hard fail: `tr window-resize`)                                       |
| degenerate (fid < 0.5)        | **0** ✅                                                                                |
| lossy (0.5 ≤ fid < 1.0)       | **0** ✅ (was 10; #506 cleared the loop-body + ko if-fold + role/structural singletons) |
| faithful (fid = 1.0)          | **3695** — every parsing pattern                                                        |
| avgFidelity (R0-recall)       | **1.000**                                                                               |
| avgPrecision (R0 trust floor) | **0.971**                                                                               |
| avgRoleFidelity (R1)          | **0.845 — the laggard** (hi 0.757 · bn 0.784 · qu 0.785)                                |

### The lossy leverage map — EMPTY (lossy → 0, #506)

> **Every entry below is DONE — the lossy band is empty.** #506 cleared the last 10: the
> loop-body family (Arc 2 — ar `measure`, qu `repeat`, ar/sw `repeat-until-event`), the ko
> if-fold (`if-empty`/`input-validation`), and the role/structural singletons (`last-in-collection`
> ms, `input-mirror` vi, `keydown-key-is-syntax` hi — the last turned out to be a **hyphen
> tokenization split**, not the Arc-4 SOV event-anchor it was filed under). See the top
> "lossy tail CLEARED" note for the per-fix grounding. The historical map is kept for provenance.

```text
✅ unless-condition          → #501 (qu/vi/zh; keyword + transform; NOT body-parse)
✅ behavior-draggable (ar,qu)→ #506 (ar measure; qu repeat — parseClause repeat-keyword guard)
✅ behavior-resizable (ar)   → #506 (ar measure: profile alt قس)
✅ repeat-until-event (ar,sw)→ #506 (multi-token event name: ar multi-word, sw `_`-join)
✅ if-empty(ko) · input-validation(ko) → #506 (SOV copula-split condition fold)
✅ keydown-key-is-syntax(hi) → #506 (hi `-`-compound `साफ़-करें` join; NOT an Arc-4 anchor)
✅ last-in-collection(ms)    → #506 (profile `scroll` alt)
✅ input-mirror(vi)          → #506 (register `giá trị`=value)
✅ render-template-with-data(vi) · morph-with-template(vi) → #502 (render→kết xuất)
✅ append-content(qu)        → #503 (append→qatichiy)
✅ tell-command(zh) · tell-other-element(zh) → #504 (tellSchema zh:把)
```

Confirm the band is still empty (the authoritative check) with:

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

## Arc 1 — th behaviors: `trigger`/`send` (event-category commands) don't parse [DONE — #495]

> **DONE (2026-06-27, #495 — lossy 32 → 28).** Root cause confirmed as predicted: th was the
> only SVO profile carrying a `roleMarkers.event` (`เมื่อ`, the temporal "when/on" marker), so
> `trigger`/`send` generated `ทริกเกอร์ เมื่อ {event}` while the transformer emits the unmarked
> object `ทริกเกอร์ {event}`. Fix: drop `roleMarkers.event` from the th profile (handlers keep
> `เมื่อ` via `eventHandler.eventMarker`). All four th behaviors faithful, zero regressions. The
> grounding below is kept for provenance.
>
> **Sibling dead-end — qu/bn/hi standalone `trigger` (investigated 2026-06-27, NOT shipped).**
> `trigger foo` also throws standalone in qu/bn/hi (same family: their `roleMarkers.event` is a
> LOCATIVE — qu `pi`, bn `তে`, hi `पर` — but the transformer emits the ACCUSATIVE object marker
> qu `ta` / bn `কে` / hi `को`, the same value as `patient`, exactly as ja を / ko 을 / tr do). BUT
> this is **gate-invisible**: bn/hi behaviors are already faithful (their in-body trigger parses
> via a different path), and qu's only behavior loss is `repeat`, not `trigger`. Setting
> `roleMarkers.event = patient` was tried: it cleanly fixes **bn** but **qu** (with a destination)
> still throws and **hi** still mis-parses as `on` — they tangle with the SOV event-anchor path
> (the hottest, most regression-sensitive parser code). A half-working change to that path for
> **zero gate gain** is a bad trade — reverted. Revisit only as part of a deliberate SOV
> event-anchor arc (Arc 4 / Track 3), not as a singleton.

**Original grounding (the recommended-next-arc framing, now resolved):** th is the **only**
language lossy across **all four** behaviors, and the loss is a **single root cause**.

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

## Arc 2 — behavior loop-body: SOV `repeat`-block fold (qu) + ar `measure` [DONE — #506]

> **DONE (2026-06-27, #506).** All four loop-body lossy passes cleared — and the
> `tryParseLoopBlock`-fold framing below was **wrong** (the methodology lesson again):
>
> - **qu `repeat`** was NOT a missing fold. A verb-final `wait` (`suyay`) greedily anchored its
>   match AT the clause-final loop keyword `kutipay`, so `matchBest` _succeeded_ and the bare-`repeat`
>   recovery (gated on matchBest failing) never fired. Fix: `parseClause` now rejects a non-`repeat`
>   match anchored at the repeat keyword. (The qu `until` `_`-split prerequisite below was real but,
>   as predicted, not sufficient alone.)
> - **ar `measure`** was a dict↔profile keyword gap: the dict emits the undiacritized `قس`, the
>   profile only knew `قياس`/`قِس`. Added `قس` to the profile measure alternatives. NOT a loop-body fold.
> - **ar/sw `repeat-until-event`** was a multi-token event-name drop, not loop-body: ar spaces events
>   (`فأرة أسفل`) and the leading `ف` was stripped as a `then` proclitic; sw underscore-joins them
>   (`panya_shuka`). Fixed in the ar/sw tokenizer keyword readers.
>
> Guards in `multilingual-roadmap-fixes.test.ts` (fail-without-fix verified). The grounding below is
> kept for provenance — note its central hypothesis did not survive contact with `ml.parse`.

This is the loop-body family — `behavior-draggable` (ar drops `measure`, **qu drops `repeat`**),
`behavior-resizable` (ar drops `measure`), `repeat-until-event` (ar/sw). The handoff says this
arc **deserves a dedicated session** (intricate, regression-sensitive parser work).

**qu `repeat` — GROUNDED (2026-06-27).** qu `behavior-draggable` drops exactly `repeat` (fid
0.875): the SOV verb-final `repeat until event pointerup from document` loop head renders as
`hayk_akama ruway pointerup ta qillqa manta kutipay` (`kutipay` = repeat, clause-FINAL). The body
commands (`wait`/`add`/`trigger`) are recovered, but the `repeat` loop NODE is never created.
Root cause: **`parseBodyWithClauses` has no loop-block fold** — it folds `if`/`unless` (via
`tryParseConditionalBlock`) and `js` blocks, but a `repeat … end` block is handled only by
depth-aware `end` tracking, so for an SOV verb-final opener the body flattens and `repeat` drops.
The real fix is a `tryParseLoopBlock` analogous to the conditional fold (emit a loop node wrapping
the body when the clause opens a `repeat`/`while`/`for` block) — **Arc-2-scale, MEDIUM risk**
(`parseBodyWithClauses` is on the hottest body-parse path).

> **Prerequisite sub-fix (found, not yet shipped):** the i18n qu dict emits `until: 'hayk_akama'`,
> which the qu tokenizer splits on `_` (`hayk`/`_`/`a`/`kama`) — only `kama` survives as `until`.
> Aligning the dict to single-token `until: 'kama'` (the profile's primary) cleans the loop head
> but **does not, alone, recover `repeat`** (verified — still fid 0.875: the missing fold is the
> real blocker). Do both together in the dedicated session. (Many other qu dict words also carry
> `_`; only the ones the profile expects single-token matter — same family as ru/uk install, tr
> resize, hi append.)

**ar `measure` — hypothesis, NOT re-verified this session.** ar `behavior-draggable`/`resizable`
drop `measure` (`measure width`/`x`/`y`) inside the loop body. Start: `PATTERN=behavior-resizable
LANGS=ar`, confirm the missing action is `measure` NOW (it was 0.667→0.889 after the #493 paren
fix), then isolate `measure width` in ar (tokenize + parse standalone). **Re-localize before
trusting the `measure` framing.**

**Risk:** MEDIUM (loop-body / hottest body-parse path). **Value:** the loop-block fold likely
clears qu `repeat` + helps ar/sw `repeat-until-event`; the ar `measure` fix clears ar draggable +
resizable.

---

## Arc 3 — `set-color-variable` (ms,sw,vi,zh) [DONE — #497]

> **DONE (2026-06-27, #497 — lossy 28→24).** Not the CSS-var shape theorized: the `set` target
> is an **"of"-possessive property path** (`*--primary-color of #theme`), and the `of` connector
> the transformer emits (ms `daripada`, sw `ya`, vi `của`, zh `的`) tokenizes as a bare
> identifier/particle that `isOfPossessiveMarker` didn't recognize (it only knew en `of`, tl `ng`,
> `source`-normalized ar `من`) → the property-path never matched and `set` dropped. Fix: an
> `OF_POSSESSIVE_MARKERS` per-language map in `pattern-matcher.ts`, gated to property-path roles.
> (The leaked English `the` was a red herring — already handled by `ENGLISH_NOISE_WORDS`.)
>
> **Also DONE this session (the non-behavior cluster sweep):**
>
> - **`get-value` (de/pl/zh) — #498.** Three causes: de profile missing `erhalten`; pl dict
>   `pobierz` is the FETCH primary (emit `uzyskaj`); zh `获得` claimed by `fetch-zh-ba` + no
>   ba-tolerant get pattern (`get-zh-ba`). Bonus: zh dict `take` `获取`→`拿取` cleared
>   `take-class-from-siblings` too.
> - **`form-submit-prevent` (he/zh) — #499.** The `call` patient is a function-call expression,
>   emitted unmarked in a multi-command body but the he/zh object marker (`את`/`把`) was required.
>   Fix: per-language `markerOptional` (RoleSpec) `{ he, zh }` on the call patient.

---

## Arc 4 — R1 / SOV role-fidelity burn-down (Track 3) [LARGER ARC]

avgRoleFidelity **0.845** is the laggard (hi 0.757 · bn 0.784 · qu 0.785 · ja 0.795 · ko 0.806 ·
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

The localized-alignment band is **done** (lossy 32 → 18):

1. ~~**Arc 1 (th `trigger`/`send`)**~~ **DONE (#495)**. (qu/bn/hi-trigger sibling investigated +
   intentionally NOT shipped — see the Arc 1 dead-end note.)
2. ~~**Arc 3 (`set-color-variable`)**~~ **DONE (#497)**; **`get-value`** (#498) + **`form-submit-prevent`**
   (#499) also cleared — see the Arc 3 DONE block.

3. ~~**`unless-condition` (qu,vi,zh)**~~ **DONE** (lossy 18 → 15). NOT body-parse, as the framing
   warned — three independent keyword/transform causes: vi profile `trừ_khi`→`trừ khi`; qu added
   `unless: 'mana sichus'` + dict realign; zh widened the Hebrew-only `tryTransformEventWithUnlessGuard`
   to `{he, zh}` (the `把`/את object-marker on the swept condition blob). See the 2026-06-27 update
   block at the top.

The singleton-tail keyword/marker realigns are **done** (#502 vi render, #503 qu append, #504 zh
tell), and **#506 cleared the final 10** — the loop-body family, the ko if-fold, and the
role/structural singletons. **The lossy band is empty.** Items 4–5 and 7 are kept struck-through
for provenance:

4. ~~**Arc 2 (loop-body)**~~ **DONE (#506)** — NOT the theorized `tryParseLoopBlock` fold: qu
   `repeat` was a `parseClause` greedy-anchor bug, ar `measure` a profile keyword alt, ar/sw
   `repeat-until-event` a multi-token event-name drop. See the Arc 2 DONE block.
5. ~~**Control-flow if-folding** (`if-empty`, `input-validation` — ko)~~ **DONE (#506)** — the one
   genuine hottest-path fix: the SOV transform lands the then-branch verb (`추가`=add) directly after
   the copula `이다`(is), so the condition-split now fires after a copula when a real SOV
   command-verb opens there (SVO `X is empty <cmd>` byte-identical).
6. ~~**Residual singletons**~~ **DONE (#506)** — `last-in-collection` (ms; profile `scroll` alt),
   `input-mirror` (vi; registered `giá trị`=value), and `keydown-key-is-syntax` (hi; a `-`-compound
   `साफ़-करें` tokenization split — **NOT** the Arc-4 SOV anchor it was filed under).

**Only two items remain — both separate dimensions, NOT lossy passes:**

- **Arc 4 (R1/SOV role-fidelity, avgRoleFidelity 0.845)** — the ONLY remaining fidelity dimension
  and the highest-headroom multilingual work. Laggards hi 0.757 · bn 0.784 · qu 0.785. The
  convergent SOV event-anchor arc; **HIGH risk** (hottest, most regression-sensitive parser path) —
  and `--regression` won't flag R1 drift until someone drives it, so guard R0/precision/parse-rate
  carefully in a dedicated session. (The qu/bn/hi-trigger residue lives here too — gate-invisible,
  see the Arc 1 dead-end note.)
- **`tr window-resize`** — the lone parse hard-fail (3695/3696), explicitly deferred as lowest-ROI
  (see Deferred / out of scope above).
