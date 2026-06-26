# Handoff — the 2 remaining priority degenerate singletons (ko window-scroll, tl behavior-resizable)

> Written 2026-06-26, after `he unless-condition` (PR #490) and `tr default-value`
> (PR #491) cleared two of the four degenerates. Read
> [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md) +
> [`HANDOFF-multilingual-priorities.md`](HANDOFF-multilingual-priorities.md) first for
> the full Tracks 1–5 narrative and the gate workflow; this doc is the **ready-to-resume,
> grounded** scope for the two degenerates that remain. Both diagnoses below were verified
> empirically through `ml.parse` (per the methodology lesson — the theorized root cause is
> usually wrong).

## Where we are (after PR #490 + #491, browser-priority)

The committed baseline (`packages/testing-framework/baselines/multilingual-priority.json`,
`timestamp`/`commit` stamp each regen) is authoritative — regenerate the leverage map from
it (the one-liner in `HANDOFF-multilingual-priorities.md` "How to resume"). At the time of
writing: **parse-rate 3695/3696**, **degenerate 2**, lossy 32.

```
DEGENERATE (fid < 0.5):
  window-scroll       ko   ← #1 below
  behavior-resizable  tl   ← #2 below
```

`he` and `tr` are now fully faithful. The lossy band is unchanged (still the qu/vi/zh
`unless-condition` tail, the `set-color-variable`/`get-value` singletons, the behavior
draggable/resizable lossy tail in ar/th/qu, etc. — see the baseline).

## The gate workflow (unchanged — how #490/#491 were validated)

1. `nvm use` (Node 24). On a fresh node_modules, `npm rebuild better-sqlite3` first
   (the committed build may be for the wrong NODE_MODULE_VERSION).
2. Build + populate (the gate REFUSES a stale dist or stale DB):
   ```
   npm run test:multilingual:build-deps   # or rebuild the touched packages + build:multilingual-dist in core
   npm run populate --prefix packages/patterns-reference
   ```
3. Gate: `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression`
   (must print "✓ No regression"). After an INTENTIONAL fidelity change: `--save-baseline`.
4. Commit src + test + baseline; **`git checkout -- packages/patterns-reference/data/patterns.db`**
   (CI repopulates — never commit it). One defect per PR, branch off main. Guards: i18n →
   `grammar.test.ts`; semantic → `multilingual-roadmap-fixes.test.ts`; **verify the guard fails
   without the fix** (`git stash` the src, run `-t "<title>"`, pop).

Gate-faithful repro (throwaway under `packages/patterns-reference/scripts/`, delete after —
NOT committed): the template is in `HANDOFF-multilingual-priorities.md` "Gate-faithful repro".
jsdom is required (`@hyperfixi/core` touches the DOM at import); the package is CJS so wrap
top-level await in an `async function main(){…}; main()`. A direct
`GrammarTransformer.transform(raw)` + `ml.parse(text, lang)` probe (no DB) is faster for
ablation and matched the gate exactly for both fixes this session.

---

## 1. ko `window-scroll` — SOV `from <source>` handler-head (NOT the if/else body)

**Pattern:** `on scroll from window if window.scrollY > 100 add .sticky to #header else remove .sticky from #header end`
(en reference action set = `{on, if, add, remove}`).

**Current:** ko parses to **`{scroll}`** only — fully degenerate.
ko transform: `스크롤 할 때 창 에서 만약 window.scrollY > 100 .sticky 를 추가 #header 에 아니면 .sticky 를 제거 #header 에서 끝`.

**Empirical localization (ablation, 2026-06-26 — verified via `ml.parse`):**

| variant                                                                       | ko result                              |
| ----------------------------------------------------------------------------- | -------------------------------------- |
| full (`from window` + if/else)                                                | `{scroll}` — degenerate                |
| **drop `from window`**, keep if/else                                          | `{on, if, add, remove}` — **FAITHFUL** |
| `from window`, drop the `if` (`on scroll from window add .sticky to #header`) | `{scroll}` — degenerate                |
| drop `from window`, drop `else`                                               | `{on, if, add, remove}` — faithful     |
| `on click … if/else … end` (no from, non-scroll event)                        | faithful                               |

**So the if/else block body is a red herring — it parses fine in ko.** The sole blocker is
the **`from <source>` modifier on the SOV handler head**. The transform renders it as
`스크롤 할 때 창 에서` = `scroll <event-marker 할때> window <source-marker 에서>`. With the
trailing `from`-source present, the parser fails to recognize the event-handler head and falls
back to anchoring `스크롤` (scroll) as the **scroll command** (a real command — 스크롤 — so it
shadows the event). Without the from-source, `스크롤 할 때` recognizes as `on scroll` and the
body parses.

**This is the SOV analogue of the merged VSO from-first handler-head fix** ("Increment 6 —
VSO from-first event-handler head" in `MULTILINGUAL_NEXT_STEPS.md`, `semantic-parser.ts`,
which fixed ar/tl by moving a leading `from <source>` to AFTER the event before re-parsing).
For SOV the from-source renders _after_ the event marker (`<event> 할때 <source> 에서`), so the
mirror fix is in the SOV event-extraction path: teach the handler-head recognition /
`trySOVEventExtraction` (+ `SOV_EVENT_MARKERS`, `semantic-parser.ts`) to consume a trailing
`<source> 에서` (from-source) adjacent to the event marker, so `스크롤` anchors as the event,
not the scroll command.

**Start here:** reproduce the full vs drop-from-window variants above through `ml.parse`,
then dump the parse tree / `parseWithConfidence` diagnostics for the full case to see exactly
where `스크롤` anchors (event vs command pattern). Confirm the `에서` source-marker is the SOV
source marker and whether the event-extraction fallback even runs when position-0 is a
command-homonym event word.

**Risk:** MEDIUM–HIGH. This edits the SOV handler-head / event-anchor path — the hottest,
most regression-sensitive parser code (every passing SOV language). Guard R0/precision/
parse-rate carefully; the handoff repeatedly flags this convergent SOV arc as deserving a
dedicated session, not a tail-end increment. The win is bounded (1 degenerate) but the fix
likely also helps other SOV `from <source>` handlers (e.g. `on input from #x …` shapes) —
check the lossy tail for collateral upside, and watch for collateral regressions.

**Whether this generalizes beyond ko:** the same from-source-after-event shape exists in every
SOV lang (ja/ko/tr/qu/hi/bn). window-scroll is only _degenerate_ in ko in the current corpus,
but a fix here should be validated across all SOV langs (the gate does this automatically).

---

## 2. tl `behavior-resizable` — the heavy Experimental-3 behavior arc

**Pattern:** `install Resizable(...)` — the behavior `source` is the rich async component
(`packages/behaviors/src/schemas/resizable.schema.ts`):

```
behavior Resizable(minWidth, minHeight, maxWidth, maxHeight)
  on pointerdown(clientX, clientY) from me
    halt the event
    trigger resizable:start
    measure width            set startWidth to it
    measure height           set startHeight to it
    set startX to clientX    set startY to clientY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or pointerup(clientX, clientY) from document
      set newWidth to startWidth + clientX - startX
      ... 4× nested `if … then set … end` clamps ...
      set my *width to newWidth + "px"
      set my *height to newHeight + "px"
      trigger resizable:resize
    end
    trigger resizable:end
  end
end
```

**Why it's its own arc, not a singleton fix.** This is one of the **Experimental-3** behaviors
(Draggable/Sortable/Resizable) — the loop-body / `measure` / `repeat until event` / VSO-head
family tracked in `MULTILINGUAL_NEXT_STEPS.md` **Track 1 item 4** ("Behavior faithful-pass
tail") and `HANDOFF-multilingual-priorities.md` **#4**. Behaviors are a stated **user
priority**. tl is the VSO/Austronesian profile — the same family as the merged VSO from-first
handler-head work (Increment 6), and `behavior-resizable` is _also_ lossy in ar/th and the
draggable/resizable cluster is lossy in ar/qu/th. The two recurring sub-defects the priorities
handoff calls out (verify before trusting):

- the **`measure` command** dropping inside the loop body (ar draggable/resizable);
- a **th-wide** body-parse/tokenizer issue (th is lossy across all four behaviors).

**Start here:** run the gate-faithful repro with `PATTERN=behavior-resizable`, `LANGS=tl,ar,th`,
and diff the missing actions per lang. Expect the loss to be inside the `repeat until event
pointerup … end` loop body (the `measure`/`wait`/`set my *width` cluster) and/or the
`on pointerdown(...) from me` VSO handler head. A `measure` / loop-body fix would likely move
several behaviors at once (draggable + resizable across ar/qu/th), so scope it as the behavior
loop-body arc, not a tl-only patch. Cross-reference the merged sortable/draggable increments in
`MULTILINGUAL_NEXT_STEPS.md` (the loop-block fold + VSO from-first head are already done — build
on them).

**Risk:** MEDIUM (behavior body-parse), but **higher value** than ko window-scroll because
behaviors are a user priority and the fix likely clears multiple lossy behavior passes too.

---

## Recommended sequence

Both are independent. Suggested order by value-vs-risk:

1. **tl `behavior-resizable`** first — higher value (behaviors = user priority; the
   `measure`/loop-body fix likely clears draggable/resizable lossy in ar/qu/th too), and it
   builds directly on the already-merged behavior increments.
2. **ko `window-scroll`** second — the SOV from-source handler-head arc. Bounded win but
   regression-sensitive (hottest SOV path); give it a dedicated session with careful
   R0/precision/parse-rate guards, as the priorities handoff prescribes for the SOV
   event-anchor work.

After these two, the priority degenerate band is **empty**; remaining work is the lossy tail
(Track 4) and the R1/SOV role-fidelity burn-down (Track 3 / #5).
