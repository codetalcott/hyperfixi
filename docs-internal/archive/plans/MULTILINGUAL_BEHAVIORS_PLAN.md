# Multilingual behaviors — assessment + plan (correctness-first)

> **Thesis:** "multilingual behaviors" is not one feature. It is the top rung of a
> ladder whose lower rungs are cracked. An empirical spike (2026-06-14) showed the
> semantic stack **cannot parse `behavior … end` blocks in any language** (body
> dropped, `confidence: 1.0` — a silent success), and — more urgently — that the
> **renderer corrupts even single event handlers** when translating into
> high-traffic non-SVO-Latin languages (a phantom `toggle` is injected; event
> names are left in English). So the "understand code in your language" half of the
> goal is broken **today**, independent of behaviors.
>
> This plan builds **bottom-up, fidelity-gated**, and treats behaviors as the first
> consumer of a **general structural/block layer** (which also serves `def`
> functions and multi-handler programs), rather than as a one-off.
>
> Companion to [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md)
> (the fidelity framing this extends), [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md)
> (parse-rate vs fidelity), and [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md)
> (per-language structural arcs). Behaviors are the "Track 2 / out-of-scope" work
> those docs repeatedly defer — this is that track.

## 1. What the spike found (empirical, against built `dist`)

Probes run through `@lokascript/semantic`'s built `dist` (parse / translate /
buildAST), 2026-06-14:

| Surface                                        | State                                                                                                                      | Evidence                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `install Foo on #x` (consume)                  | ✅ works multilingually                                                                                                    | roles captured, clean AST                                                |
| `behavior … end` (define)                      | ❌ body dropped in **all** langs incl. EN; `confidence:1.0`; `buildAST` emits a degenerate `command`, not a `BehaviorNode` | `parse()` returns `{action:'behavior', roles:{patient:Name}, body:NONE}` |
| Multi-statement handler **parse**              | ✅ clean for SVO-Latin (es/pt/fr/de/zh)                                                                                    | round-trip fidelity 1.0                                                  |
| Multi-statement handler **render** (translate) | ❌ phantom `toggle` injected for ja/ko/tr/ar/ru; event names untranslated (`click` stays English)                          | see §2                                                                   |

**Reframe:** behavior authoring was never primarily a _translation-vocabulary_ gap
(the `behavior`/`on`/`init`/`end` keywords are already translated in all 24
profiles). It is (a) a **missing block/program parsing layer** in the semantic
stack and (b) **renderer defects** on the rung below it. The only working behavior
parse anywhere is the core _traditional_ parser's `parseBehaviorDefinition`
(`packages/core/src/parser/parser.ts`), which the multilingual path never reaches.

## 2. The acute renderer bug (highest ROI)

`translate('on click add .active to me then remove .hidden from me', 'en', <lang>)`:

```
ja: click で 切り替え .active を 追加 それから 自分 から .hidden を 削除
ar: عند click بدّل أضف .active ثم احذف .hidden من أنا
ru: при click переключить добавить .active затем удалить .hidden из я
```

`切り替え / بدّل / переключить / 토글 / değiştir` all = **toggle** — absent from the
source. In SOV it is _additive_ (`[toggle, add, remove]`); in ar/ru it is
_substitutive_, eating the real first command (`if` → `[toggle]`, fidelity 0.0).

- **Locus:** event-handler rendering in
  `packages/semantic/src/explicit/renderer.ts` (body render ~L159, pattern
  selection ~L37). These languages use the **fused event+action** event-handler
  pattern, whose action slot renders a spurious `toggle`; the real body is then
  appended. SVO-Latin uses a non-fused event pattern → clean.
- **Second defect:** event names are not routed through `eventNameTranslations` /
  `normalizeEventName` (`packages/semantic/src/patterns/event-handler.ts`) on the
  render path, so `click`/`mouseenter` stay English.

## 3. Why the gate didn't catch it — the measurement gap (Phase 0)

The fidelity harness (`packages/testing-framework/src/multilingual/fidelity.ts`)
measures **recall** (`computeFidelity`) and **role-fidelity** (`collectRoleSignature`,
R1). Neither penalizes **spurious/extra** commands, and `collectActions` is
Set-based, so it cannot even see a _duplicate_ phantom (`[toggle,toggle,put]` →
`{put,toggle}`). The phantom `toggle` lives squarely in that blind spot — the
existing test even documents it (`fidelity.test.ts`: "is recall, not precision").
**Until a precision signal exists, every later phase flies false-green.** Hence
Phase 0 is first.

## 4. The ladder

Dependency shape: **Phase 0 gates 1–4 · 1→4 · 2→3 · 5 is free-floating.**

### Phase 0 — Precision-aware fidelity harness _(gates everything)_

- Add to `fidelity.ts`, **without changing** the existing recall/role signals the
  committed baseline ratchets on:
  - `collectActionsMultiset(node)` — duplicates preserved (catches duplicate phantoms).
  - `computePrecision(reference, candidate)` — multiset fraction of candidate
    actions present in reference (penalizes spurious/extra commands).
  - `spuriousActions(reference, candidate)` — the extras, for diagnostics.
- Unit tests proving the phantom-`toggle` case scores recall 1.0 **but precision
  < 1.0**, duplicates are visible, and a faithful reorder stays precision 1.0.
- **Do NOT** wire into the CI ratchet or regenerate the baseline yet — that waits
  until handler/block corpus coverage exists (Phase 2/3) and the baseline is
  intentionally regenerated. Phase 0 ships the _capability + tests_.

### Phase 1 — Fix the renderer (the "understand" bug) _(smallest, highest ROI)_

- Remove the phantom `toggle` from event-handler rendering for fused-pattern
  languages; route event names through `eventNameTranslations`.
- Verified by the Phase-0 precision signal + lock tests. Payoff: faithful
  single-handler translation across ja/ko/tr/ar/ru — and a hard dependency of
  behavior-rendering (Phase 4).

### Phase 2 — Harden rung-2 parsing (SOV/VSO handler bodies)

- Gated by Phase 0. Isolate parser vs renderer per language; close genuine
  body-parse defects (the ja `add`→`into` class; ar/ru first-command loss).
- Outcome: inline multi-statement `_="on … "` handlers reliable in all priority
  languages — the highest-_volume_ value, and the rung behaviors stand on.

### Phase 3 — General structural/block layer

- Block-skeleton recognizer over the already-translated `behavior`/`def`/`on`/
  `init`/`end` + nested `if`/`repeat`/`for`/`while`; depth-aware `end` matching
  per language; delegate leaves to the (hardened) single-statement engine;
  assemble `BehaviorNode` / `FunctionNode` / program.
- Fix the `confidence:1.0` silent-success: a partial/dropped-body parse must lower
  confidence or emit a diagnostic.
- Behaviors are the **first consumer**; `def` functions and multi-handler scripts
  come essentially free.

> **2026-06-14: Phase 3 first slice ✅ — `behavior … end` blocks now parse.**
> New `parser/block-parser.ts` (`tryParseBehaviorBlock`) + `BehaviorSemanticNode`
> kind + `createBehaviorNode` + `buildAST` `buildBehavior` → core `BehaviorNode`.
> Hooked as **Stage 0** of `parse()` (cheap substring pre-guard; returns null fast
> for non-block input). Decomposition is **end-delimited** (depth counts only
> NESTED openers `if`/`unless`/`repeat`/`for`/`while`, NOT the handler trigger),
> which is **trigger-agnostic** — works where the trigger is `on` (SVO/VSO),
> `wenn`/when (de), the `一…就` idiom (zh), or a mid-clause SOV marker (ja/ko `で`/
> `할 때`). Each sub-block's ORIGINAL source is sliced by token position (robust for
> space-less scripts) and parsed by the single-statement engine.
>
> - **Verified** across en/es/ja/ko/ar/de/zh/tr: name + params + handler bodies
>   preserved (`[add,remove]`), multi-handler, and nested `if` inside a handler
>   depth-contained. buildAST → `{type:'behavior', name, parameters, eventHandlers}`.
> - **Honesty:** a handler whose body the engine silently drops (e.g. `.{cls}`)
>   scores the block < 0.5, not a false 1.0.
> - semantic **6032/6032**; lock test `test/behavior-block.test.ts` 12/12; typecheck
>   clean. **Baseline regenerated** — behaviors were trivially-faithful 1.0 before
>   (EN + every lang dropped the body identically); now really parsed, so the gate
>   shows true per-language fidelity. Net **improvement on priority langs**
>   (es/ja/ko/de/fr +0.012–0.014, zh/ar/he +0.008–0.010); a few non-priority langs
>   (tl −0.016, th −0.010, hi −0.009) drop as their incomplete behavior bodies
>   become honestly measured. All baseline deltas are behavior-only.
> - **2026-06-14: body-content fixes ✅.** A re-diagnosis corrected the earlier
>   "newline-body" framing — **newline/space/`then`-separated multi-command bodies
>   already parse** (`[add, remove]` for all three). The real gaps were two general
>   single-statement issues that capped real behaviors:
>   - **`remove me` / `remove it` (remove-self)** — threw, because the remove
>     `patient` only accepted `selector`. Added `reference` to its expectedTypes
>     (`command-schemas.ts`). `remove #el` / `remove .x from me` unchanged.
>   - **`.{cls}` dynamic class interpolation** — un-tokenized (the class regex
>     required a letter after `.`). Added a `.\{varName\}` branch to the CSS selector
>     extractor (`tokenizers/extractors/css-selector.ts`).
>     The real `Toggleable(cls)` / `Removable` behaviors now parse end-to-end.
>     semantic **6041/6041**; lock test `test/behavior-body-content.test.ts`;
>     gate green (baseline regen: only pl/uk `behavior-removable` shifts, fid −0.000 —
>     the richer EN reference effect; corpus impact negligible, value is correctness).
> - **2026-06-14: `def` functions ✅ + multi-command body fix.** Generalized the
>   block layer to a dispatcher (`tryParseBlock`) handling both `behavior` and
>   `def name(params) … end` (new `DefSemanticNode` + `buildAST` → core `DefNode`).
>   Key supporting fix: added `parseStatements()` (routes through
>   `parseBodyWithClauses`) — the top-level `parse()` returns on the FIRST command,
>   so a bare multi-command sequence (`add .a` ⏎ `remove .b`) was truncating to
>   `[add]`. `def` bodies AND behavior `init` blocks now use it and keep every
>   command. `def` keyword recognized via the English form (native-keyword
>   translation deferred, like event-names — fidelity-neutral); body parses
>   multilingually. semantic **6049/6049**; lock `test/def-block.test.ts`; gate
>   green (baseline regen: behavior-draggable/-removable shift ±0.004 — richer-EN
>   init effect; all behavior-scoped).
> - **Multi-handler top-level programs — DEFERRED (assessed).** Two forms: the
>   clean `end`-delimited (`on … end on … end`) is uncommon/low-value; the common
>   no-`end` feature-chain (`on click … on keyup …`) has an `on`-marker ambiguity
>   (trigger-`on` vs `toggle .x on me`) that risks single-handler parsing and needs
>   its own careful design. Tangential to behaviors (which wrap handlers in
>   `behavior…end`). Not shipped to avoid a low-value/risky version.
> - **Remaining:** native `def`/event-name keyword translations; multi-handler
>   programs (feature-chain); Phase 4 = block renderer (round-trip translation).

### Phase 4 — Block renderer + round-trip

- Faithful translation of whole behaviors/functions between languages (understand
  an arbitrary behavior, not just the curated set). Depends on Phase 1 + Phase 3.

> **2026-06-14: Phase 4 ✅ — block renderer.** The renderer was block-blind (a
> behavior rendered to just its keyword `comportamiento`, body dropped). Added
> `renderBehavior` / `renderDef` + a `keyword()` resolver to
> `packages/semantic/src/explicit/renderer.ts` (dispatched from `render()` on
> `kind`). A behavior renders to target-language source — `<behavior> Name(params)`
>
> - each handler (closed by `end`) + optional `init` + closing `end` — handlers and
>   commands via the normal (Phase-1-clean) paths; `def` similarly. **Whole behaviors
>   and functions now translate between languages and round-trip:** EN→ES
>   `comportamiento Toggleable(cls) / al click alternar .{cls} / fin / fin` →
>   re-parses to a behavior with `[toggle]`; EN→ja renders 振る舞い…終わり. semantic
>   **6049/6049**; lock `test/block-renderer.test.ts`; typecheck clean. **Gate
>   untouched** — the renderer is a separate path from the i18n transformer the gate
>   uses (parse-only), so render-only changes are gate-neutral (baseline unmodified).
>   SOV trigger cosmetics (ja `click を で`) carry over from Phase 2 but round-trip.

### Phase 5 — Curated localized metadata _(parallel, anytime)_

- Localized names / param-names / hover-docs for the 11 shipped behaviors
  (`packages/behaviors`). Pure data, zero parser risk, immediate broad
  understand-value. Independent of the ladder.
- ~~**Do not** re-localize the shipped behaviors' hyperscript `source` — they run
  **imperative JS installers**, so the `source` string is near-worthless to
  translate.~~ **Superseded (2026-06-15, behaviors consolidation — see
  [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md)):** the curated
  shipped behaviors no longer run imperative JS installers — they **compile their
  hyperscript `source`** (one runtime path). So that source _is_ now meaningful to
  translate: Toggleable/Removable translate end-to-end; the js()-core behaviors
  (ClickOutside/Clipboard/AutoDismiss) translate their trigger surface. A live
  showcase shipped at `examples/behaviors/multilingual.html`. Localized prose
  metadata (names/param-docs) still wants native review before committing.
  Authoring value remains greatest in _user-defined_ behaviors (Phase 3).

## 5. Invariants (every phase)

1. **Fidelity-gated, never parse-rate.** Parse-rate counts body-dropping parses as
   passes (see MULTILINGUAL_ROADMAP.md).
2. **No silent body-drop / no false `confidence:1.0`.**
3. **SOV/VSO honesty** — ship SVO faithful first; mark SOV/VSO explicitly until
   Phase 2 hardens them.
4. **Additive to the committed baseline** — new signals/corpus land alongside the
   existing recall + R1 ratchet; baseline regeneration is deliberate, against a
   freshly `populate`d patterns.db (see `packages/patterns-reference/CLAUDE.md`).

## 6. Status

- **2026-06-14:** spike + assessment complete; decisions locked (correctness-first
  ladder + general structural layer).
- **2026-06-14: Phase 0 ✅ complete.** Added `collectActionsMultiset`,
  `computePrecision`, `spuriousActions` to
  `packages/testing-framework/src/multilingual/fidelity.ts` (additive — the
  recall `computeFidelity` + R1 `collectRoleSignature` baseline signals are
  byte-unchanged). 9 new unit tests (17/17 in `fidelity.test.ts`) lock the
  phantom-`toggle` shapes: recall 1.0 but precision 0.75; duplicate phantom
  caught by the multiset; ar/ru substitutive case scores precision 0. Typecheck
  clean. **Not yet wired to the CI ratchet** (waits for handler/block corpus +
  deliberate baseline regen, per invariant 4).
- **2026-06-14: Phase 1 ✅ complete (phantom-`toggle`).** Root cause: the 'on'
  pattern set contains fused `<command>-event-*` patterns (e.g.
  `toggle-event-ko-sov-simple` = `<event> 할 때 토글`, prio 148) that outrank the
  pure trigger (`on-ko-generated`, prio 100); `findBestPattern` selected one to
  render a handler and emitted its trailing verb literal as a phantom command.
  Fix: `findBestPattern` (`packages/semantic/src/explicit/renderer.ts`) restricts
  event-handler rendering to pure trigger patterns (ids without the `-event-`
  fused segment). **Verified:** EN→{ja,ko,tr,ar,ru,zh,es} round-trip now scores
  **precision = recall = 1.0** on multi-statement handlers, conditionals, and
  single-command handlers (incl. the genuine `toggle` case — rendered once, not
  doubled). Regression: semantic suite 5978/5978, core multilingual 162/162, new
  lock `test/event-handler-render-no-phantom.test.ts` 17/17; typecheck clean. The
  fix is provably **recall-neutral** (removes only spurious commands), so the
  committed multilingual gate baseline cannot regress on its recall/R1 signals.
- **2026-06-15: Phase 1b ✅ complete — event-name translation.** Event names now
  render in the target language (`on click …` → es `al clic …`, ja `クリック … で`,
  ar `على النقر …`, zh `一 点击 就 …`, ko `클릭 …`). Implementation:
  `localizeEventName()` in `packages/semantic/src/patterns/event-handler.ts`
  inverts `eventNameTranslations` (English→native, first-wins); `renderer.ts`
  routes **only** the event role of an event-handler node through a new
  `renderEventName()` (other role literals untouched). The single render-path edit
  also covers behaviors/defs/multi-handler programs. Non-literal values (namespaced
  `htmx:load`, unknown/custom events) and compound `a or b` triggers pass each
  sub-name through, keeping the English `or` connector (native connectors add no
  round-trip benefit; ja/zh/ko compound stays a pre-existing known-limitation).
  - **Round-trip safety:** `eventNameTranslations` proved _aspirational_ — it lists
    natives some tokenizers never register or that re-parse as other commands (de
    `load`→`laden`→fetch; qu `submit`→`apachiy`→send; weak sw/tr handler grammars).
    A **test-locked, evidence-based denylist** keeps English for every unsafe pair
    (English always round-trips); the exhaustive case in
    `test/event-name-translation.test.ts` _proves_ every native the localizer emits
    re-parses back to the same event.
  - **Gate-neutral** (a value, not a command): the multilingual gate scores
    pre-synced patterns.db translations (i18n transformer), not the semantic
    renderer — so this changes no scored output. Re-`populate`d + `--regression`
    gate **green**, baseline byte-unchanged.
  - Regression: new lock test (15); no-phantom lock unchanged (30); full semantic
    suite 6096 passed / 9 skipped; build + typecheck clean.
- **Deferred (Phase 2):** SOV trigger-marker cosmetics (ja renders `click を で`,
  slightly non-idiomatic but round-trips correctly).
- **2026-06-14: Phase 2 in progress — doubled trigger-marker phantom fixed.**
  A precision-signal round-trip probe (12 handler shapes × 16 non-SVO-Latin langs)
  measured **85.9% clean** and surfaced a systemic defect the recall gate was
  blind to: bn/hi/th use the **same word** for the `on` trigger keyword and the
  event-role marker (bn `তে`, hi `पर`, th `เมื่อ`), so the generator emitted it
  twice (`<event> তে তে`); the duplicate re-parsed as a phantom command (`তে আমি`
  → `on me`; `เมื่อ click` → stray `click`). Root fix: `buildTokens`
  (`packages/semantic/src/generators/pattern-generator.ts`) collapses adjacent
  identical literals. Scan confirmed this touches **only the `on` patterns of
  bn/hi/th** — no other command/language has adjacent duplicate literals, and
  none are in the priority gate, so the committed baseline is untouched.
  **Result: 85.9% → 96.9%** (th 12→0 imperfect, bn 11→2). Regression: semantic
  6004/6004; lock test `event-handler-render-no-phantom.test.ts` extended to 27.
- **2026-06-14: Phase 2 tail — 2 of 4 fixed (vi, bn put); gate green.** Rung-2
  round-trip now **97.9% clean** (188/192).
  - ✅ **vi `increment`** — parser injects default `quantity: 1`; it rendered
    everywhere, and in vi the quantity marker `thêm` _is_ the `add` keyword, so
    `tăng :count thêm 1` re-parsed as increment + phantom `add`. Fix: the renderer
    omits an optional role value equal to its schema default (here `quantity == 1`),
    mirroring the existing `destination == me` skip
    (`packages/semantic/src/explicit/renderer.ts`). Recall-neutral; explicit
    non-default amounts (`by 5`) still render. Also cleans up es/ja increment output.
  - ✅ **bn `put`** — the handcrafted positional `put-bn-at-end` (prio 110)
    outranked the canonical put in **render** selection (role scoring can't see the
    position, which is baked-in literals), emitting the verbose "at end of" form for
    every plain put. Fix: `findBestPattern` penalizes positional (`-at-end` /
    `-at-start`) patterns for rendering only — parsing is priority-ordered in the
    matcher (not `findBestPattern`), so positional _input_ still matches via its
    literals. Same class as the Phase-1 `-event-` filter.
- **2026-06-14: ar/id/sw possessive arc ✅ DONE — fixed 7 languages.** Added a
  **post-nominal** possessive branch (`tryMatchPostNominalPossessiveExpression` in
  `packages/semantic/src/parser/pattern-matcher.ts`), gated on
  `possessive.markerPosition === 'after-object'` and to property-path roles (set's
  destination). It matches `<property> <possessor>` order (the mirror of the
  existing pre-nominal `<possessor> <property>`).
  - **ar/id/sw/tr**: parse-FAIL → `destination = me.textContent`.
  - **ru/pl/uk** (bonus): were silently **lossy** (possessor dropped, destination
    a bare `textContent` — recall-passing, role-fidelity-divergent) → possessor
    recovered, now matches the en reference.
  - pre-nominal langs (en/es/ms/he) unaffected; non-possessive targets
    (`set #x to "v"`) unaffected. **qu** still fails — separate possessor-first
    root cause (`noqa-pa textContent` not recognized), non-priority, left as tail.
  - **Verified:** rung-2 round-trip **97.9% → 99.5%** (only bn `wait` remains);
    semantic 6020/6020; full `--regression` gate **green**; new lock test
    `test/post-nominal-possessive.test.ts` 12/12. The gate corpus contains no
    `set`-possessive pattern, so corpus fidelity numbers are unchanged (the only
    `--save-baseline` delta was bundleSize + array formatting — **not committed**,
    gate passes against the existing baseline within tolerance).
- **Phase 2 tail — 1 deferred (non-priority):**
  - **bn `wait`** — _deep shared body-parser._ Standalone `200ms অপেক্ষা` parses
    correctly (`wait{duration:200ms}`); only the multi-clause **then-chain body**
    path drops/duplicates it (`[200ms, wait, add]`). Same "control-flow body
    parsing" cluster tracked in CORRECTNESS_RELIABILITY_PLAN; high-risk to touch
    for one non-priority edge case. (qu possessor-first possessive also remains.)
- **2026-06-15: behaviors consolidation merged (PR #430).** The shipped curated
  behaviors (Toggleable/Removable/ClickOutside/Clipboard/AutoDismiss) now compile
  their hyperscript `source` on one runtime path; Phase 1's parse/render block layer
  is exercised live by `examples/behaviors/multilingual.html` (curated bodies
  translate + round-trip 78–100% across es/ja/ar/ko/zh/de). See
  [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md).
- **Next:** native-reviewed localized metadata (Phase 5); multi-handler top-level
  programs (feature-chain, deferred in §4); supervised patterns-reference behavior
  corpus sync.
