# Multilingual accuracy & reliability — next steps

> **Entry point, written 2026-06-16.** This is the _current_ forward-looking plan.
> The detailed session logs live in
> [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md) (§7a–§7cc, §11),
> [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md),
> [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md),
> [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md) and
> [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md). Read this first,
> then dive into those for the per-arc detail.

## Where we are (2026-06-21 baseline · post #470 / #472 · `browser-priority`)

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp` + `commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                         | Value                    | Notes                                                  |
| ------------------------------ | ------------------------ | ------------------------------------------------------ |
| parse rate                     | **3695 / 3696 (99.97%)** | 1 hard fail (`tr window-resize`); was 8                |
| degenerate passes (fid < 0.5)  | **9**                    | was 29 — `behavior-sortable` cluster cleared           |
| lossy passes (0.5 ≤ fid < 1.0) | **53**                   | was 94                                                 |
| faithful (fid = 1.0)           | **~3633**                | was ~3565                                              |
| avgFidelity (R0-recall)        | **0.993**                | was 0.985                                              |
| avgPrecision (R0 trust floor)  | **0.962**                | hi 0.837 is the outlier (next-lowest ja ~0.91)         |
| avgRoleFidelity (R1)           | **0.837**                | **still the laggard** (hi 0.717 · qu 0.770 · bn 0.780) |
| avgExecutionFidelity (R2)      | **1.000**                | curated subset fully reproduces en DOM effects         |

The six-signal ratchet gate is fully wired (parse-rate · degenerate · R0-recall ·
R0-precision · R1 · R2) — see CLAUDE.md "Multilingual parse rate ≠ fidelity".
**Direction now: stop adding gate signals; spend them down.**

> **Update 2026-06-29m (Arc B R1 — repeat-until-event recovery; mean R1 0.9451 → 0.9457 (+0.0007),
> 12 langs, ZERO regressions. Broader than the SOV-only scope predicted — it generalizes to
> SVO/VSO.)** The fused event-handler captures the repeat verb but leaves the until-event clause
> `{event-kw} {event} {obj-marker} {until-marker}` (ja `繰り返し イベント マウス解放 を まで`, de
> `wiederholen bis ereignis mausoben`) unconsumed → the loop defaulted to `loopType:reference=me`
> AND the span broke into PHANTOM `event`/`until` body commands. **Fix (`buildEventHandler`,
> alongside the 2026-06-29l forever recovery, as an else-branch): when the token after the repeat
> verb is the event-kw (`normalized==='event'`), capture the NEXT token as `event:literal`, set
> `loopType:literal="until-event"` (matching the en reference), drop the SOV default-patient leak,
> and CONSUME the span to the next clause boundary (then/end/EOF) so the phantoms can't form.** The
> body (increment/wait, after the boundary) is still recovered by the trailing path. This is the
> targeted-recovery approach again (NOT the #537 re-parse — same `preservesFused`/length guards
> would block it). **Gains: bn/ja/ko +0.0019 (both roles), ar/de/fr/it/ms/pl/th/tl/vi +0.0010 —
> the recovery fires for any lang whose repeat-until-event routes through the fused-action path,
> not just SOV.** R0 1.000 / precision flat (the phantom `event`/`until` removal is also a latent
> precision win) / R2 1.000 / parse-rate 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts`
> "repeat-until-event recovery" (5 cases incl. SVO de + VSO ar; failing-without-fix verified).
> **DEFERRED — tr/hi/qu** (NOT in the gain set): they route their repeat-until-event through a
> different (compound/traditional) parse path that doesn't reach the fused-action recovery, AND
> their event token is the #535-class underscore-split compound (`fare_bırak` / `माउस_ऊपर` /
> `rat_huqariy`; qu's until-marker `hayk_akama` is also split, and qu's mousedown `rat_ñitiy`
> mis-captures as the `click` event). A separate slice: fuse those compounds (dict + tokenizer)
> AND route their until-event through the recovery (or a SOV until-event HEAD pattern for the
> traditional path).
>
> **Update 2026-06-29l (Arc B R1 — SOV repeat-forever loop-keyword recovery; mean R1 0.9448 →
> 0.9451 (+0.0003), all 6 SOV langs (bn/hi/ja/ko/qu/tr) +0.0011, ZERO regressions. Lifts the SOV
> laggards directly.)** The verb-first SOV loop head `{repeat-verb} forever <body>` (ja `繰り返し
forever .pulse を 切り替え`) has its `forever` DROPPED by the fused SOV event pattern, so the loop
> defaults to `loopType:reference="me"` (the normalizeCommandRoles default-patient→primaryRole leak)
> while en is `loopType:literal="forever"`. **Grounding showed the general #537 re-parse mechanism
> does NOT fit here** — it fights two load-bearing guards: `preservesFused` (fused `reference` vs
> re-parse `literal` loopType) and `reparsed.length===1` (forever juxtaposes its body, no `then`).
> **So a CONTAINED fix instead** (`buildEventHandler`, at the fused-capture site): when the action
> is `repeat` and the token immediately after the verb is a `forever` keyword (en `forever` / native
> hi `हमेशा` / bn `চিরকাল`, all normalized to `forever` — recognized since #527), set
> `loopType:literal="forever"` AND **drop the SOV default-patient leak** (`delete roles.patient` —
> else, with loopType now occupied, it surfaces as a phantom `patient:reference=me` the en reference
> lacks; verified the phantom appears without the delete). The body (toggle/wait) is still recovered
> by the trailing-body path. **All 6 SOV langs match en's `repeat{loopType:literal="forever"}`
> exactly; SVO (es) unchanged (different path).** R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts` "SOV repeat-forever loop-keyword recovery"
> (6 cases asserting loopType + no-phantom-patient + body-survives; failing-without-fix verified).
>
> **DEFERRED — SOV `repeat until event` (the other half of this slice).** Grounded as a genuine
> dedicated arc, NOT contained: (1) the until head `{verb} {event-kw} {event} {marker} {until}`
> (ja `繰り返し イベント マウス解放 を まで`) currently breaks into PHANTOM `event` + `until` commands
> (ja/ko/bn) or fails outright (tr/hi/qu), so it needs a SOV until-event HEAD pattern; (2) capturing
> it via the fused-body re-parse fights the SAME `preservesFused` reference-vs-literal guard as
> forever did (fused `loopType:reference=me` → re-parse `loopType:literal="until-event"`) — needs a
> principled relaxation allowing a default `reference:me` loopType to be replaced; (3) the event
> token itself is an underscore-split compound for tr/hi/qu/bn (`fare_bırak` / `माउस_ऊपर` /
> `rat_huqariy` / mouseup) — the #535-class fuse fix, per-lang. A multi-part arc.
>
> **Update 2026-06-29k (Arc B R1 — block-body-guard HEAD-only exception UNLOCKS in-handler
> repeat-times for the event-first langs; mean R1 0.9440 → 0.9448 (+0.0008), 11 langs +0.0017,
> ZERO regressions. The largest win of this continuation; delivers the unlock predicted in 2026-06-29j.)**
> #530/#532's fused-body re-parse SKIPS block-body actions (`repeat`/`if`/`for`/`while`/`unless`)
> because re-parsing `[verb..boundary]` would swallow their inline body (the #530 repeat-forever
> regression). But the counted-loop HEAD (`repeat {n} times`) is HEAD-ONLY — it stops after the
> count word — so for the event-first langs whose corpus `repeat-times` puts the loop in the FUSED
> event body (`en clic repetir 3 times entonces …` → fused `repeat{loopType:literal=3}`, the number
> mistyped as loopType, body dropped), the HEAD re-parse recovers `quantity:literal` +
> `loopType:literal="times"` without a body. **Fix (`buildEventHandler`, semantic-parser.ts): allow
> `repeat` to ENTER the re-parse block, and gate the swap on the re-parse matching a HEAD-ONLY
> pattern (`patternId` matches `/^repeat-.*-times$/`).** The body-swallowing GENERATED repeat (which
> matches `repetir forever alternar .pulse` → `quantity:literal="toggle"`, swallowing the toggle) is
> NOT a `-times` pattern, so the repeat-forever hazard stays excluded — VERIFIED: es/de in-handler
> repeat-forever keep `loopType="forever"` + the toggle body survives. **11 langs gain
> (de/es/fr/id/it/pl/pt/ru/sw/th/uk +0.0017); R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696.** Guard: `multilingual-roadmap-fixes.test.ts` "Counted-loop HEAD patterns" gained 4
> in-handler cases + a repeat-forever hazard guard (failing-without-fix verified). **Residual:** vi
> (two-word verb `lặp lại`) — the verb-finder lands mid-verb so the HEAD doesn't match in-handler;
> ms net-neutral. SOV repeat-times (fronted count) still needs its own HEAD structure. The
> general block-body-HEAD-exception now also positions the SOV `repeat forever`/until-event capture
> (same mechanism, a HEAD-only SOV loop pattern) as the next repeat-cluster slice.
>
> **Update 2026-06-29j (Arc B R1 — `{verb} {quantity} times` counted-loop HEAD patterns for
> verb-first langs; mean R1 0.9435 → 0.9440 (+0.0004), ar/tl +0.0017, he/zh +0.0034, ZERO
> regressions. + a sharp scoping finding on the event-first majority.)** Mirrors the en
> `repeat {quantity} times` HEAD pattern (#521) for verb-first languages: a new per-language
> module (`packages/semantic/src/patterns/repeat.ts`, wired into `builders.ts`) emits
> `{verb} [marker] {quantity} {countWord}` (priority 110 > the generated positional repeat's 100),
> capturing `quantity:literal` + defaulting `loopType:literal="times"` and STOPPING after the count
> word so the body parses separately. The count word is taken verbatim from the corpus (most langs
> leave English `times`; th `ครั้ง`, vi `lần`, tl `beses`). Covers all verb-first langs
> (es/de/fr/it/pt/ru/uk/pl/ar/he/id/ms/sw/th/vi/tl/zh).
>
> **GROUNDING FINDING (sharp, load-bearing for the next session): only the verb-first-INPUT langs
> gain — ar/he/tl/zh.** The corpus `repeat-times` is always `on click repeat N times …`, i.e. the
> repeat sits in the EVENT-HANDLER BODY. For ar/he/tl/zh the repeat verb is at/near the input head,
> so it reaches the standalone command path and the HEAD pattern fires. For the event-first majority
> (es/de/fr/it/pt/ru/uk/pl/id/ms/sw/th/vi) the repeat is captured by the fused/generated
> event-handler body path, and **`repeat` is a BLOCK_BODY_ACTION whose fused-body re-parse is
> deliberately SKIPPED** (#530/#532's block-body guard — re-parsing a block-body clause would
> swallow its inline body). VERIFIED: es STANDALONE `repetir 3 times …` captures
> `quantity:literal`+`loopType:literal` perfectly, but es IN-HANDLER `en clic repetir 3 times …`
> still yields the phantom `loopType:literal=3`. So the event-first langs' HEAD patterns are correct
>
> - forward-looking but inert until the block-body unlock lands. **The unlock = a HEAD-only-aware
>   refinement of the block-body guard: allow the fused-body re-parse for a block-body action when the
>   re-parse is HEAD-only (consumes only up to the count/loop-keyword, leaving the body) — then the
>   repeat HEAD pattern fires in-handler and ~13 more langs gain `repeat.quantity:literal` +
>   `repeat.loopType:literal="times"`.** That is the next high-leverage repeat-cluster slice (also
>   unblocks the SOV `repeat forever`/until-event drops). R0 1.000 / precision flat / R2 1.000 /
>   parse-rate 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts` "Counted-loop HEAD patterns"
>   (5 cases incl. the es standalone-vs-in-handler distinction; failing-without-fix verified).
>   **Also deferred:** SOV langs (ja/ko/tr/hi/bn/qu) front the count ahead of a clause-final verb —
>   a different HEAD structure.
>
> **Update 2026-06-29i (Arc B R1 — ru/uk FUSED event keywords (the underscore-split follow-up to
> 2026-06-29h); mean R1 0.9434 → 0.9435 (+0.0001), ru/uk +0.0010 each, ZERO regressions.)** The
> ru/uk i18n dicts emitted UNDERSCORE compounds for several events (`мышь_вниз` mousedown,
> `изменение_размера` resize, …) which the semantic tokenizer SPLITS on `_` (→ `мышь`+`_`+`вниз`),
> so the event typed as a bare expression — the on.event residue flagged in 2026-06-29h. **Fix
> (the #510 tr-resize route, two-package): the i18n dict now emits the FUSED form (`мышьвниз` /
> `изменениеразмера`; uk `мишавниз` / `змінарозміру`), registered in the ru/uk tokenizer EXTRAS.**
> Covers the two underscore-event patterns in the priority corpus — `repeat-until-event`
> (mousedown) and `window-resize` (resize) — so it completes BOTH the resize family (ru/uk were the
> non-Latin gap from 2026-06-29g) and mousedown. R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696. Guards: `grammar.test.ts` "ru/uk fused … event keywords" (dict emits fused, no `_`) +
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained 4 ru/uk cases. **Latent
> (not in priority corpus, same fix when they get coverage):** the OTHER ru/uk underscore events
> (dblclick/mouseenter/mouseleave/mousemove/keydown/keyup/keypress/touchstart) are still
> underscore forms in the dict. **The `on.event` event-keyword-alignment seam is now essentially
> exhausted** — the remaining `on.event` misses are singletons (hi default-value/load) or the
> repeat until-event `repeat.event`/`repeat.loopType` capture (the repeat-cluster arc).
>
> **Update 2026-06-29h (Arc B R1 — `mousedown`/`mouseup` event-keyword alignment (continues
> 2026-06-29g); mean R1 0.9433 → 0.9434 (+0.0002), es/pt/ja/ko +0.0010 each, ZERO regressions.)**
> The `repeat-until-event` pattern (`on mousedown repeat until event mouseup …`) has TWO events:
> the handler event (`on mousedown`) and the loop until-event (`repeat until event mouseup`). The
> i18n dict emits native forms the profiles/tokenizers never listed (es `ratónabajo`/`ratónarriba`,
> pt `mouseBaixo`/`mouseCima`, ja `マウス押下`/`マウス解放`, ko `마우스다운`/`마우스업`), so the HANDLER
> event typed as `expression` instead of en's `on.event:literal="mousedown"`. **Fix: register
> `mousedown`/`mouseup` — es/pt via profile keyword, ja/ko via tokenizer EXTRAS (non-Latin, derive
> events in the tokenizer not the profile).** This lifts `on.event:literal` for all four (+0.0010
> each); precision flat, no new phantoms (ja's pre-existing `event.event` node from the
> until-event is unchanged). **The loop until-event (`repeat.event:literal="mouseup"`) is STILL
> dropped** — that's the separate repeat-cluster residue (the verb-final/SOV `repeat until event`
> structure drops the event), not this fix. R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696 unchanged. Guard: `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained
> 4 mousedown cases (all 4 fail without the fix). **Remaining `on.event` residue:** ru/uk
> `mousedown`/`mouseup` SPLIT the underscore-compound (`мышь_вниз` → `мышь`+`_`+`вниз`) — a
> single-token tokenizer fix (same class as #510 tr `boyut_değiştir`); and the bigger
> `repeat.event`/`repeat.loopType` until-event capture is the repeat-cluster arc.
>
> **Update 2026-06-29g (Arc B R1 — `resize` event-keyword alignment (the 2026-06-28m audit
> follow-up); mean R1 0.9427 → 0.9433 (+0.0006), de/es/fr/it/pl/pt +0.0023 each, ZERO
> regressions.)** Re-grounding the post-#532 leverage map (NB: a raw-`parse()` map OVER-states any
> role with a schema DEFAULT — increment.quantity / wait.duration / repeat.quantity show phantom
> misses the gate's `fillSchemaDefaults` pass cancels; the genuinely-real non-behavior residues are
> halt.patient §7y, set.destination role-swap, send.destination call-split, ko/tr fetch) surfaced
> `on.event:literal` (24×). The dominant clean slice is the **`resize` event** in `window-resize`:
> the i18n dict emits a native verb (de `größeändern`, es/pt `redimensionar`, fr `redimensionner`,
> it `ridimensiona`, pl `zmieńrozmiar`) that the profiles never listed as the `resize` event, so
> it tokenized as a bare `identifier` → `event:expression` instead of en's `event:literal="resize"`.
> Exactly the 2026-06-28m mechanism. **Fix: add a `resize` event keyword to the 6 space-using Latin
> profiles** (`generators/profiles/{german,spanish,french,italian,polish,portuguese}.ts`). `resize`
> has no command homonym, so precision is flat (verified per-lang). **de/es/fr/it/pl/pt +0.0023;
> R0 1.000 / precision flat / R2 1.000 / parse-rate 3696/3696 unchanged.** Guard:
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained 6 resize cases
> (failing-without-fix verified: all 6 fail). **Remaining `on.event` residue (follow-up):** zh/ja/ko
> `resize` (`调整大小`/`マウス…`) need tokenizer EXTRAS (non-Latin, derive events in the tokenizer not
> the profile); `mousedown`/`mouseup` (repeat-until-event) align for es/pt/ja/ko but ru/uk SPLIT the
> underscore-compound (`мышь_вниз` → 3 tokens — a single-token tokenizer fix, same class as #510 tr).
>
> **Update 2026-06-29f (Arc B R1 — verb-FIRST event-head excision extends #530 to ar/tl; mean
> R1 0.9422 → 0.9427 (+0.0005), ar +0.0059 · tl +0.0059, ZERO regressions. ko/tr GROUNDED as a
> deeper, separate fix and DEFERRED.)** #530's fused-body re-parse skipped verb-FIRST fused
> patterns (`…-vso-verb-first`) outright (its guard #2): there the event head sits BETWEEN the
> verb and the trailing secondary clause, so the `[verb..clause-boundary]` slice RE-INCLUDES it
> and the standalone re-parse drops everything after the event. ar `fetch-event-ar-vso-verb-first`
> is exactly this: `احضر /api/user عند نقر كـjson` (`fetch /api/user on click as-json`) keeps
> `source` but drops `as {responseType}`. **Fix (in `buildEventHandler`, semantic-parser.ts):
> stop skipping verb-first; instead EXCISE the event head from the clause before re-parsing —
> the event TOKEN (located by `token.normalized === captured-event`, e.g. نقر→"click") plus an
> immediately-preceding `on`-marker keyword (`عند`, `kind==='keyword' && normalized==='on'`).** The
> standalone `fetch-ar` (markerlessFetch, `كـ` as-marker) then recovers `responseType:expression`.
> Excision is a NO-OP for every non-verb-first order (the event isn't inside `[verb..boundary]`),
> so the proven #530 path is byte-identical; and if the event token can't be located the swap is
> skipped (re-parsing with the event still inside is the #530 hazard). The block-body skip and the
> superset + strictly-more-roles guards are unchanged (qu's fronted-patient rail still holds).
> **tl (Tagalog, also verb-first VSO via `fetch-event-tl-vso-verb-first` + `fetch-tl`) gained
> identically — a bonus the handoff didn't predict.** R0 1.000 / precision flat / R2 1.000 /
> parse-rate unchanged; semantic suite green. Guard: `multilingual-roadmap-fixes.test.ts`
> "Fused event-handler body re-parses secondary role clauses" gained 2 ar responseType cases +
> 1 ar no-tail control (the 2 responseType cases fail without the fix; verified by stash).
>
> **ko/tr deferred — grounding corrected the handoff.** The handoff theorized ko/tr just need
> the clause "re-assembled from non-contiguous parts (fronted patient + verb + tail, minus the
> front event)". A standalone probe of the event-excised re-assembly disproved it: ko
> `/api/user 를 가져오기 json 로` and tr `getir /api/user json olarak` STILL parse to `source:literal`
> only — no responseType. Cause: the SOV standalone fetch pattern (`sovFetch`, `patterns/fetch.ts`
> ~L256) **deliberately OMITS responseType** ("its SOV surface marker varies per language: ja none,
> ko 로, tr olarak, hi के रूप में"). So ko/tr need TWO coordinated changes, not just a re-parse: (1)
> extend `sovFetch` with an optional trailing `{responseType} {asMarker}` clause per language, AND
> (2) SOV non-contiguous re-assembly in the fused body (the fronted source is BEFORE the event,
> outside `[verb..boundary]`). The superset guard keeps them regression-free today (the
> `[verb..boundary]`-only re-parse drops the fronted source → fails the superset check → no swap).
> A dedicated follow-up; (1) is the prerequisite and carries its own standalone-parse regression risk.
>
> **Update 2026-06-29e (Arc B R1 — fused-body fix LANDED; mean R1 0.9390 → 0.9422 (+0.0032),
> 13 langs +0.0059, ZERO regressions. The largest R1 win of the campaign since the URL fix.)**
> Supersedes 2026-06-29d (which reverted a single-site attempt): the fix DOES live in the
> action-fused re-parse (`buildEventHandler`), the earlier attempt just had the wrong VERB-finder.
> es fetch uses `fetch-event-es-vso` (verb-MEDIAL: `<event> buscar /api/user`), so the verb is NOT
> `all[pos-1]` (that's the already-consumed `source`); the original re-parse only checked pos-1, so
> it never fired. **Fix: find the verb by scanning BACK from the consumed region for the token whose
> normalized form is the captured action, reconstruct `[verb..clause-boundary]`, re-parse it through
> the command patterns, and swap in the richer node** — capturing the dropped secondary clauses
> (fetch's `as {responseType}` ×63, and more across the fetch family). Three guards make it
> zero-regression (each found via the gate / a clean before-after diff):
>
> 1. **block-body actions** (`repeat`/`if`/`for`/`while`/`unless`) skipped — their inline body is in
>    the same clause (`repeat forever toggle .pulse then …`), so re-parsing would SWALLOW the body
>    command (regressed repeat-forever in 17 langs on the first gate run).
> 2. **verb-FIRST fused patterns** (`…-vso-verb-first`, ar/ko/tr) skipped — the event head sits
>    BETWEEN the verb and the tail, so `[verb..boundary]` would re-include it (a separate residue).
> 3. **SUPERSET check** — swap only if every fused role reappears with the SAME value-type (mapping
>    the fused generic `patient` → the command's primaryRole, since `normalizeCommandRoles` relabels
>    later). This is the verb-FINAL SOV rail: qu `#score ta ñitiy pi yapachiy 10` has the patient
>    FRONTED (not in `[verb..boundary]`), so re-parsing `yapachiy 10` fills a DEFAULT `patient:me`;
>    the superset check rejects that swap (selector≠reference) and keeps the real `patient:selector`
>    (caught a qu −0.0017 on the second gate run; this guard zeroed it).
>
> **Result: de/es/fr/it/ms/pl/pt/ru/sw/th/uk/vi +0.0059, id +0.0028; R0 1.000 / precision 0.9743→
> 0.9744 (UP) / R2 1.000 / parse-rate unchanged.** semantic 6327 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "Fused event-handler body re-parses secondary role clauses"
> (6 cases incl. the qu superset rail + the repeat block-body rail; failing-without-fix verified —
> the 4 fetch cases fail). **Remaining fused-body residue (follow-ups):** verb-FIRST langs
> (ar/ko/tr) still drop secondary clauses (guard #2 — needs the event excised from the clause);
> `trigger.event` namespaced events and SOV `repeat` loop-keyword capture are still open (different
> shapes). The general lesson HELD: aligning the BODY parse toward the standalone Stage-2 parse is
> the right direction; the care is all in the three guards.
>
> **Update 2026-06-29d (Arc B R1 — fused-body fix ATTEMPTED (one bounded, gate-guarded cycle)
> and REVERTED; NO PR. Sharper scope for the next session.)** Implemented the "re-parse the full
> clause when it yields STRICTLY MORE roles than the fused capture" change at the action-fused
> re-parse site (`buildEventHandler`, semantic-parser.ts ~line 958, the original `roles.length===0`
> gate → `> Object.keys(roles).length`). Targeted verification showed **zero effect** on
> `fetch.responseType` in ANY language — so it was reverted (no benefit, delicate path). The reason
> sharpens the #528 picture: **the fused-body residue is MULTI-PATH, not one site.** Two distinct
> body parsers drop roles:
>
> 1. **action-fused path** (`buildEventHandler` line 930+, VSO/SOV fused `<cmd>-event-<lang>-vso`) —
>    the site I patched; but fetch in these langs doesn't even reach the swap (the re-parse via
>    `parseClause` doesn't recover responseType either).
> 2. **`parseBodyWithClauses` / `parseClause`** (line 1094 / 1295, the SVO/"traditional" body path) —
>    THIS is where es/de/fr fetch lose responseType. Proof: `parse('buscar /api/user como json …',
'es')` (no `on click` head, → `parseInternal` Stage 2) keeps `responseType`, but the SAME text
>    WITH the `en clic` head (→ `parseBodyWithClauses`) drops it. So `parseClause` uses a DEGRADED
>    matcher vs the full Stage-2 parse — the optional trailing `[como {responseType}]` group of the
>    hand-crafted `fetch-es` [105] pattern is not captured in the body path.
>
> The correct fix is to make the body-clause parser capture the SAME roles a standalone Stage-2
> parse of the identical clause would — likely by routing each split clause through the full
> command-match path rather than the trimmed `parseClause`. Both body paths carry load-bearing
> special-cases (§2 conditional fold, §452/§453 fused-body, js-block opacity, positional-`end`-noun,
> trailing-`unless` guard, verb-split), so this is a **dedicated arc with the full six-signal gate**,
> NOT a quick patch. (`forever` (#527) landed cleanly precisely because it rides the GENERATED
> repeat pattern's primary `loopType` slot — a primary role the body path DOES capture — whereas
> responseType/method/namespaced-event are SECONDARY clauses the body path trims.)
>
> **Update 2026-06-29c (Arc B R1 — KEY INSIGHT: the fused event-handler BODY path is a SHARED
> root cause of multiple residues; characterized, not yet fixed. NO PR — direction for the next
> session.)** Re-grounding after #527 (the forever win) put `fetch.responseType:expression` (63×,
> fetch-json / fetch-error-handling / fetch-do-not-throw) near the top of the non-behavior
> residues. It looked like a clean translation-side gap (EN captures `responseType`, every
> translation drops it) — the same winning direction as forever. But grounding revealed it is
> **the same fused-event-body problem that sank `trigger.event`** (2026-06-29 entry):
>
> - es **standalone** `buscar /api/user como json` → `fetch{source:literal, responseType:expression}`
>   ✓ (the hand-crafted `fetch-es` [105] pattern `buscar [de] {source} [como {responseType}]`
>   captures it perfectly; de/fr identical with `als`/`comme`).
> - es **inside an event handler** `en clic buscar /api/user como json entonces …` →
>   `fetch{source:literal}` ✗ — the `como json` responseType is DROPPED.
>
> Root cause: the fused VSO event-handler pattern (`<cmd>-event-<lang>-vso`, generated in
> `generators/event-handlers-vso.ts`) captures only the wrapped command's PRIMARY arg (a generic
> `{patient}`, relabelled to the command's primaryRole by `normalizeCommandRoles`) and leaves every
> SECONDARY role clause (`as {responseType}`, `via {method}`, fetch's whole tail; trigger's
> namespaced event; …) unconsumed. `buildEventHandler`'s re-parse only re-runs the full command
> patterns when the captured node has ZERO roles (semantic-parser.ts ~line 958) — fetch captured
> `source`, so the tail is handed to `parseBodyWithGrammarPatterns`, which finds no command in
> `como json` and drops it. So a command with ≥1 captured role but unconsumed secondary clauses
> loses those clauses **only in event-handler bodies** (the dominant corpus shape).
>
> **This single mechanism blocks: `trigger.event` (namespaced/identifier event), `fetch.responseType`
> (63×), and the SOV `repeat` loop-keyword capture (ja/ko/tr/bn/hi — the verb-first `繰り返し
{loopType}` pattern exists at prio 80 but the fused body never applies it).** A correct general
> fix — re-parse the FULL captured clause (verb → clause boundary) through the command patterns
> whenever a full re-parse yields MORE roles than the fused capture, not only when it yields zero —
> would unlock all three at once. It is DELICATE (the zero-role gate exists to avoid disrupting
> already-complete fused captures; the §2/§7y special-cases around it are load-bearing), so it
> wants a dedicated arc with the full six-signal gate, not a tail-of-session patch. **This is the
> highest-leverage next target — but a real arc, not a quick win.** (Behaviors remain the other
> large block, off-limits pending the source-migration. The remaining clean-ish vocab slices —
> `repeat N times` per-language HEAD pattern for `quantity:literal`, zh `重复 forever` HEAD pattern —
> are smaller and word-order-specific.)
>
> **Update 2026-06-29b (Arc B R1 — `repeat forever` loop-keyword recognition; mean R1
> 0.9382 → 0.9390 (+0.0008), 17 langs +0.0011, ZERO regressions).** The cleanest slice of the
> `repeat.loopType:literal` residue (123×). The i18n dict never translated `forever`, so the
> corpus leaves it the English word in most langs (`repetir forever`, `繰り返し forever`) and a
> native word in a few (ru `всегда`, vi `mãi mãi`, tl `magpakailanman`, ms `selamanya`, th
> `ตลอดไป`, bn `চিরকাল`, hi `हमेशा`). Unrecognized, the bare word typed `loopType:expression`
> (SVO) / `loopType:reference=me` (SOV) instead of EN's `:literal`. Fix: add the **corpus word**
> (English or native — taken verbatim from the corpus, so no guessing) as a `forever` keyword in
> each profile (`generators/profiles/*.ts`), next to `while`/`until`. The generated repeat
> pattern then types it `:literal`, matching EN — translations moving TOWARD the correct EN
> reference (the opposite of the abandoned `trigger.event` direction; this is why it is a clean
> win). **17 SVO/VSO langs gain (ar/de/es/fr/he/id/it/ms/pl/pt/qu/ru/sw/th/tl/uk/vi +0.0011); R0
> 1.000 / precision 0.9743 / R2 1.000 / parse-rate unchanged.** semantic 6321 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "repeat forever loop keyword recognized" (7 cases,
> failing-without-fix verified: 6 fail). **Excluded zh** (its generated repeat greedily grabs the
> body verb after `forever` as a phantom `quantity:literal` → a within-tolerance lossy flip; needs
> a HEAD-only `重复 forever` pattern — follow-up). **SOV langs ja/ko/tr/bn/hi recognize the keyword
> but their fused/SOV repeat pattern still drops it** (`loopType:reference=me` unchanged — no gain,
> no regression); capturing it is the SOV follow-up. **Next slices of the repeat residue:**
> `repeat N times` needs a per-language HEAD-only `repeat {quantity} times` pattern (the generated
> pattern grabs `N` as loopType, dropping `quantity:literal` — the `times` keyword alone doesn't
> restructure it); the for-each `repeat for X in Y` is the two-sided EN-phantom + SOV problem.
>
> **Update 2026-06-29 (Arc B R1 — `trigger.event:literal` investigated and ABANDONED as
> net-negative; NO PR. Negative result, documented so it is not re-attempted.)** Re-grounding
> the leverage map on fresh main (post-#525, mean R1 0.9382) ranked the top remaining
> `action.role:valueType` recall misses (aggregate over all 24 langs × all patterns):
> `repeat.event:literal` **138×**, `repeat.loopType:literal` **123×**, `halt.patient:reference`
> **74×**, `repeat.source:expression` **69×** (all behaviors), … `trigger.event:literal` **15×**,
> `if.condition:reference` 14×, `bind.source:property-path` 14×. The repeat cluster dominates but
> is the known two-sided for-each/until-event SOV work; behaviors (sortable 105 / draggable 81 /
> resizable 75 missed entries — the top three patterns) are off-limits (known-hard, migration
> pending). `trigger.event:literal` (15×) looked like the cleanest single-mechanism win, so it
> was the chosen target.
>
> **Root cause (correctly grounded):** `trigger init` — EN tokenizes `init` as a KEYWORD (it
> collides with the `init`-block keyword) → `tokenToSemanticValue` keyword branch → `createLiteral`
> → `trigger.event:literal`. All 15 other langs tokenize the (foreign) `init` as an `identifier`
> → `{type:'expression'}` → `:expression`. A pure value-type mismatch. The fused event-handler
> body path (`trigger-event-<lang>-vso`) captures the arg under the generic `patient` role, which
> `normalizeCommandRoles` relabels to `event` (send/trigger→event) — so the single correct
> coercion site is `normalizeCommandRoles` on the FINAL tree (the matchRoleToken role-site only
> covers standalone commands, NOT the fused body — verified: standalone `disparar init` coerced
> but `en cargar disparar init` did not).
>
> **Why it was abandoned (net-NEGATIVE R1 at every scoping, verified against a byte-identical
> clean-main baseline regen — so the deltas are real, not noise):**
>
> - Broad coerce (any non-`on` command event, simple identifier → literal): **mean R1 −0.0022, ALL
>   23 langs drop.** Cause: `send-with-detail` (`send update(value:42)`) — EN splits event=`update`
>   (simple → coerced literal) + detail, but every translation captures the whole call
>   `update(value:42)` as one expression (a call, never coerced). EN→literal vs translation→
>   expression = fresh 23-lang mismatch.
> - Scope to `trigger` only: **mean R1 −0.0007** (4 SOV gains, 19 drops). The drops are behaviors:
>   EN keeps the NAMESPACED `trigger draggable:start` → `:expression` (the `:` excludes it from the
>   simple-identifier regex), but translations STRIP the namespace to a bare `draggable` (a known
>   behaviors-migration parse gap) → simple → coerced to literal → mismatch.
> - Scope to `trigger` AND exclude inside-behavior nodes (`inBehavior` flag): **STILL mean R1
>   −0.0002** (15 gains, 8 persistent drops: ms/ru/th/tl/uk/vi −0.0015, bn/hi −0.0005). The drops
>   keep migrating as the scope narrows — other per-pattern translation event quirks beyond
>   behaviors. Not converging to a clean win.
>
> **Lesson (the load-bearing one):** R1 is recall of EN's role signature, so making the EN
> reference MORE correct (event name → literal) DROPS R1 wherever the translations parse the event
> differently (namespace-stripped, captured-as-call, left-as-identifier). Unlike the URL/event-
> keyword/bind wins — which aligned a translation-side TOKENIZER/DICT gap toward an already-correct
> EN reference — `trigger.event` would move the EN reference AWAY from buggy translations. The real
> fix is upstream **translation-side** event parsing (preserve the `:namespace` in behavior trigger
> events; split `update(value:42)` into event+detail like EN), which belongs to the behaviors-source
> migration, not an R1 coercion. **Deprioritize `trigger.event`** until those land. (The reusable
> insight: a value-type coercion is only a clean R1 win when EN is the OUTLIER that translations
> already agree against — here EN was the _correct_ one and translations disagreed in many ways.)
>
> **Other findings from this re-grounding (for the next session):** (1) The EN for-each reference
> `repeat for item in .items` produces a PHANTOM `event:literal=in` (the `in` iteration keyword
> mis-captured as an event) AND drops `.items` entirely — same greedy-generated-repeat bug PR #521
> fixed for `times`/`forever`. Removing the phantom is a candidate but measured net-zero (drops the
> `event` miss but the cleanest HEAD-only pattern that consumes `in .items` adds a `source`/
> `destination` miss the translations don't match — the two-sided for-each problem). (2) The
> `repeat.loopType:literal` (123×) residue is a **loop-keyword vocab gap**: the corpus leaves
> `forever`/`times` UNTRANSLATED in most langs (es `repetir forever`, ja `繰り返し forever`) — the
> es i18n dict has `while`/`until` but NOT `forever`/`times`, and `repeat-while` consequently parses
> `loopType:literal=while` correctly while `repeat-forever` degenerates to `loopType:reference=me`.
> Fixing it is two-sided (i18n dict + semantic profile per lang + corpus regen) — the real next big
> lever, but a dedicated multi-file arc.
>
> **Update 2026-06-28n (Arc B R1 — URL tokenization in 14 tokenizers; mean R1 0.9259 → 0.9382
> (+0.0122), the LARGEST single-PR win of the campaign by ~3×, 14 langs +0.0137–0.0218, ZERO
> regressions).** Re-grounding after #524 found the biggest remaining residue was
> **`fetch.source:literal` (188×, 19 langs)** — and it was a one-line-per-tokenizer gap, not a
> per-pattern problem. A fetch source URL (`/api/data`) tokenized as a bare `identifier` in 14
> space-using langs → the role typed `expression`, mismatching the en reference's `literal`.
> Root cause: those 14 tokenizers' `classifyToken` (`tokenizers/*.ts`) **lacked the
> `startsWith('/')|'./'|'http' → 'url'` line** that en/fr/hi/ja/ko/zh/ar/bn/qu/tr already
> carried (the working vs broken split matched the URL-line presence EXACTLY). Added the line to
> de/he/id/it/ms/pl/pt/ru/es/sw/th/tl/uk/vi. Lifts `fetch.source` across fetch-basic/-json/
> -with-method/event-debounce. **14 langs +0.0137–0.0218 (de/es/he/id/it/ms/pt/sw/th/tl/vi
> +0.0218; pl/ru/uk +0.0137); R0 1.000 / R2 1.000 / parse-rate 3696/3696 / precision all
> unchanged.** semantic 6314 green. Guard: `multilingual-roadmap-fixes.test.ts` "URL tokenization
> across space-using langs" (15 cases; failing-without-fix verified: 14 fail). **Method lesson
> (recurring this arc): the biggest R1 levers keep being shared mechanism gaps (a missing
> tokenizer line, a broken en reference, a dict/profile misalignment) masquerading as 188 separate
> drops — re-grounding the top aggregate drop to its single root cause each time has paid off far
> better than per-pattern fixes.** Remaining big aggregate drops (next candidates): `repeat.event`
> / `repeat.loopType` (the two-sided for-each/until-event SOV work, ~132+116×), `halt.patient:
reference` (70×, form-submit-prevent + behaviors), `set.destination:property-path` (47×, the
> trailing-`from` SOV role-swap), `send.destination:reference` (42×).
>
> **Update 2026-06-28m (Arc B R1 — cross-language event-keyword alignment sweep; mean R1
> 0.9218 → 0.9259 (+0.0041), the biggest single-PR MEAN win of the campaign, 8 langs +, ZERO
> regressions).** Grounding the new laggard (uk, after the bind cluster closed) found a
> **systemic dict/profile misalignment**: the i18n dict emits one event word but the semantic
> profile/tokenizer lists a different one, so the unrecognized word tokenized as a bare
> `identifier` and the event role typed as `expression` instead of `literal` (the `on.event`
> R1 residue). A sweep across the 6 common events found 10 misaligned (lang, event) pairs:
> **submit** uk `надсилання`; **load** es `cargar` / fr `charger` / it `carica` / ru `загрузка`
> / uk `завантаження` / ja `読み込み` (6 langs!); **change** fr `changer`; **input** pl `wejście`
> / id `masukan`. Fix: register each i18n-emitted form as an event alternative in the semantic
> profile (`generators/profiles/*.ts`) — or, for ja, the tokenizer EXTRAS
> (`tokenizers/japanese.ts`, which derives events there, not from the profile). `load` is purely
> an event (no command-collision risk); the verb forms (`cargar`/`charger`/`changer`) sit
> alongside existing verb alternatives (`modifier`, `someter`), so no precision hit (verified:
> precision flat in every lang). **uk +0.0200 (the laggard), es/fr/it/ru +0.0110, id/pl +0.0115,
> ja +0.0076; R0 1.000 / R2 1.000 / parse-rate 3696/3696 unchanged.** semantic 6299 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" (10 cases, failing-without-fix
> verified: all 10 fail). **Method lesson: a single language dominating the worst-pattern list
> across UNRELATED patterns (uk in 6) signals a systemic per-language cause, not 6 one-offs —
> grounding the common role-diff (`on.event:literal`→`expression`) found it in one pass.** A
> broader audit of i18n-emitted-vs-profile event words across ALL 24 langs (beyond the 6 events
> swept here) is a cheap follow-up — the same probe (`ev-sweep`) extends to keydown/keyup/focus/
> mouseover/etc.
>
> **Update 2026-06-28l (Arc B R1 — English split-`'s` possessive capture; hi CROSSES 0.90
> (0.8899 → 0.9034), 7 langs +0.0068, mean 0.9195 → 0.9218, ZERO regressions).** Completing the
> bind cluster surfaced ANOTHER **broken en reference**: `bind $color to #picker's value` parsed
> the source as a bare `#picker` selector, **dropping `'s value`** — because the en tokenizer
> splits the possessive clitic `'s` into two tokens (`'` + `s`) after a selector, which the
> single-token `'s` check in `tryMatchSelectorPropertyExpression`/`tryMatchPossessiveSelectorExpression`
> (pattern-matcher.ts) missed. ja/ko/qu/bn/tr/zh keep their possessive (の/의/…) whole and captured
> the full property-path, so the en reference dropping it capped `bind-explicit-property` /
> `bind-non-form-display` (en `bind.source:selector` vs SOV `property-path`). Two-line fix in the
> possessive matcher: (1) recognize the split `'` + `s` pair as the English possessive; (2) accept
> a `keyword` property after the English `'s` (vi's `value` → `giá trị` is a single KEYWORD token,
> not an identifier — without this vi REGRESSED -0.0034 as the only lang still capturing a bare
> selector; the keyword case lifted vi back to parity → zero net regression). **hi 0.8899 → 0.9034
> (crosses 0.90 — the first SOV lang to clear it!), ja/ko/qu/bn/tr/zh +0.0068 each, mean +0.0024;
> hi precision +0.0065; R0 1.000 / R2 1.000 / parse-rate 3696/3696 unchanged.** ALSO clears the
> hi bind-explicit-property/non-form-display (the possessive source now matches the bind pattern →
> the #522 bare-event command-peek succeeds → bind, not phantom-on). semantic 6289 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "English split `'s` possessive captures the property" (4
> cases; failing-without-fix verified: 3 fail). **The bind cluster is now fully closed** (all 4
> patterns faithful across SOV langs). Methodology note: the vi -0.0034 was UNDER the 0.02 gate
> tolerance (gate would have passed) but was caught by a manual per-lang A/B diff — re-grounding
> before shipping matters even when the gate is green.
>
> **Update 2026-06-28k (Arc B R1 — hi `bind` two-part fix; hi 0.8764 → 0.8899 (+0.0135),
> the biggest single-LANGUAGE jump of the campaign, + hi precision +0.0075).** The doc's
> "bind is fragile, defer" framing was RIGHT about the mechanism but the fix turned out
> tractable with a tight gate. Two coordinated fixes (mirrors the doc's "two-part" prediction):
>
> 1. **i18n — hindiProfile `bind-to` verb-final rule.** ja/ko/zh/tr/bn already carried a
>    `bind-to` rule; **hi was the only SOV gap**, so the transformer emitted bind VERB-MEDIAL
>    (`$greeting को bind #name-input में`), which the generated verb-final SOV bind pattern
>    (`{destination} को {source} में bind`) never matched. The rule (roleOrder
>    `['patient','destination','action']`, like put-into/set-to) emits verb-final
>    `$greeting को #name-input में bind`.
> 2. **semantic — bare-event guard: prefer a command over a phantom REFERENCE event.** Even
>    verb-final, the fronted `$greeting` (a `$variable` **reference**) was grabbed by the
>    `event-<lang>-bare` pattern as the event → a phantom `on` handler (the bind.\* rf=0.00).
>    A reference can NEVER be an event name. Extended the existing bare-event guard
>    (`semantic-parser.ts`, the same one that handles the unknown-event SOV case): when the
>    bare capture is a `reference`, SOV extraction finds no real event, AND a command matches
>    the full stream (rewind via `tokens.reset(eventStart)` since matchBest re-consumes the
>    winner), prefer the command. Tightly gated — fires ONLY on a reference mis-anchor with a
>    matching command, so real bare events (`.active को क्लिक पर टॉगल`, custom identifiers) are
>    byte-identical (verified: 3 regression guards + gate).
>
> Result: **hi bind-auto-detect + bind-two-way 0.00 → 1.00** (the two with a simple `#selector`
> source). **hi-only** in the gate (ja/ko/qu/bn/tr already parsed bind via their existing rules);
> hi R1 +0.0135, **hi precision +0.0075** (the phantom-`on` command is gone), R0-recall 1.000 /
> R2 1.000 / parse-rate 3696/3696 unchanged, **zero regressions** (no other lang moved). Mean R1
> 0.9189 → 0.9195. semantic 6285 + i18n 893 green. Guards: `grammar.test.ts` "bind-to verb-final"
>
> - `multilingual-roadmap-fixes.test.ts` "SOV bind: bare-event guard prefers a command" (both
>   failing-without-fix verified). **Remaining bind residue (deferred, NOT hi-specific):**
>   `bind-explicit-property` / `bind-non-form-display` have a **possessive source** (`#picker's
value`, `#status's textContent`) that caps EVERY SOV lang at 0.50 (ja/ko/qu/bn/tr drop
>   `bind.source`; hi can't match the English-`'s` possessive at all → stays 0.00). That's a
>   possessive-source value-typing fix, cross-language, separate arc.
>
> **Update 2026-06-28j (Arc B R1 — en `repeat N times` / `repeat forever` HEAD-only
> patterns; R1 0.9164 → 0.9189, the biggest single R1 win yet, ALL 23 langs +).** The single
> largest R1 residue (`repeat.event:literal` 42× + `repeat.loopType:literal` 39×, all SOV langs)
> was grounded to a **broken en REFERENCE**, not an SOV deficiency — the same shape as the
> `halt the event` fix. The generated positional `repeat` pattern greedily captured the loop
> BODY into bogus roles: `repeat 3 times add "…" to me` → `loopType=3, quantity="times",
event="add"` (the body verb!), and the `add` command was **dropped entirely**. NO other
> language reproduces that `repeat.event:literal` garbage — they all DROP it (verified across
> hi/ja/ko/qu/bn/tr AND es/fr/de/pt/zh/it/ru) — so it dragged R1 down in every language. Fix:
> two **head-only handcrafted en patterns** (`repeat {n} times`, `repeat forever`, priority 110)
> that match ONLY the loop head and leave the body for the clause loop to parse — mirroring the
> existing `repeat until event {event}` pattern (the Explore-agent map confirmed: a head-only
> pattern at priority > the generated 100 lets the next clause-loop iteration recover the body
> as a sibling command). **+0.0011–0.0028 per lang, EVERY language up, mean 0.9164 → 0.9189;
> R0-recall 1.000 / precision 0.972 / R2 1.000 / parse-rate 3696/3696 all unchanged.** R2-safe
> by construction (no `repeat-*` pattern is in `EXECUTION_SUBSET`). Two facets made it land
> zero-regression: (a) en's own `add "<htmlLiteral>" to me` body ALSO fails to parse (an
> es-style add-literal gap), so `repeat-times` en gains NO body role → no regression for the
> SVO body-droppers; (b) `toggle .pulse` (selector patient) DOES parse, so `repeat-forever` en
> gains `toggle.*` which the SOV langs already capture → pure recall gain. Guard:
> `multilingual-roadmap-fixes.test.ts` "en repeat HEAD-only patterns" (3 cases, failing-without-fix
> verified: 2 fail). semantic 6280 + i18n 892 green.
>
> **Grounded-but-DEFERRED (this session re-grounded all three; the doc's old framing was partly
> wrong — re-read before coding):**
>
> - **`repeat for {var} in {coll}` / `stagger-animation` — the messy two-sided case (NOT shipped).**
>   A head-only `repeat-en-for-each` pattern was prototyped and **dropped**: it's net-zero on R1
>   (removing the en `event="in"` garbage is exactly offset by a NEW `repeat.source:selector`
>   guaranteed-drop no lang captures) and showed per-pattern noise on stagger (it/ru/uk to 0.38).
>   The real for-each gap is the **loopType value-TYPE disagreement**: en emits
>   `repeat.loopType:literal` ("for") while SOV emits `repeat.loopType:reference` (the loop var) —
>   a genuine two-sided alignment, lower ROI.
> - **`bind` (4 hi patterns) — CONFIRMED fragile, the doc was RIGHT.** Probed all three verb-final
>   hi forms (untranslated `bind`, translated `बाइंड`/`बांधें`): every one still produces a phantom
>   `on` handler (`actions=[bind, on]`, `bind.destination:literal`) vs ja's clean
>   `bind.destination:reference, bind.source:selector`. ja/ko/qu/bn/tr all parse the identical
>   token shape at r=1.00; hi alone mis-anchors the fronted `$greeting` as an event. Needs the
>   fragile SOV event-anchor work (HANDOFF-sov-event-anchor.md). hi-only, ~8 role-sig entries.
> - **`set.destination:property-path` (26×) — NOT clean value-typing; it's a ROLE-SWAP.** The
>   `two-way-binding` residue (`set #x.innerText to "…" + my value`, with a trailing `from #y`
>   source clause) parses in SOV with destination↔patient SWAPPED and a spurious `style` role —
>   because the trailing `from #firstName` source clause + the complex `+` value disrupt the SOV
>   set role assignment. A MINIMAL `set #x.innerText to "y"` types destination as property-path
>   correctly in all of en/hi/ja/ko — so it's the trailing-source-clause SOV reorder, not value
>   classification. Fragile (same family as bind's event-anchor).
>
> **Update 2026-06-28i (Arc B R1 — `set-to` verb-final rule; R1 0.9143 → 0.9164, the
> biggest single R1 win, all 5 SOV laggards +).** The `set` cluster — initially mis-diagnosed
> as a two-sided, intractable role-model problem (a tested `applySetRoleSwap` regressed SVO
> because the transformer's "backwards" set labels are load-bearing for SVO marker placement) —
> turned out to be the **same word-order issue as put/bind**: NO profile carried a `set`
> rule, so ja/ko/bn/tr/hi emitted set VERB-MEDIAL (`X को सेट Y में`), which the verb-final
> generated SOV set pattern (its `markerOverride` already aligns को→destination / में→value)
> never matched → set parsed to no/swapped roles. Added a `set-to` verb-final rule
> (`roleOrder: ['patient','destination','action']`) to the 5 SOV profiles — NO role change, SVO
> untouched. **+0.0073–0.0117 per laggard (ja +0.010, tr +0.012, ko +0.009, bn +0.010,
> hi +0.007); R0-recall 1.000 / precision 0.972 / R2 unchanged.** The rule carries an
> **inline-if guard**: a set whose value sweeps up a trailing `end` (`if … then set X to Y end`,
> destination parsed as `"minWidth end"`) is left verb-medial — verb-final reorder would push
> the set verb past `end` and drop the `if` (caught as a bn behavior-resizable faithful→lossy
> flip, then fixed). i18n suite 892 + semantic 6277 green; gate clean. Guard: `grammar.test.ts`
> "SOV Transformation — set-to verb-final" (5 verb-final + 5 inline-if cases, failing-without-fix
> verified). Lesson (again): test the put-style word-order rule FIRST before theorizing a deeper
> role-model fix — the swap was a red herring. Remaining set residue: finer value-type typing
> (property-path / @attr) at rf 0.5–0.75.
>
> **Update 2026-06-28h (Arc B R1 — hi `put-into` word-order rule; hi 0.8669, zero
> regressions).** Grounding the worst laggard (hi) after the `halt` fix surfaced a contained
> bug: the **hindiProfile was missing the `put-into` grammar rule** that every other SOV
> profile (ja/ko/tr/bn) carries. Without it, `put X into Y` fell through to a verb-MID default
> (`X को रखें Y में`) which the semantic parser mis-read (destination/patient swap/mistype —
> the put.\* R1 residue). Added the rule (mirrors ja's, `roleOrder:
['patient','destination','action']`) → hi emits the verb-final `X को Y में रखें` and parses
> faithfully. **hi-only** (other SOV langs already had it; qu works via its default),
> **hi 0.8646 → 0.8669 (+0.0023)**, R0/precision/R2 unchanged, i18n suite 882 + semantic 6277
> green. Guard: `grammar.test.ts` "Hindi Transformation (SOV) — put-into verb-final"
> (failing-without-fix verified).
>
> **Grounded-but-deferred next R1 arcs (re-ground before coding; all bigger/riskier):**
>
> - **`set` — FIXED 2026-06-28i (set-to verb-final rule; see the dated note above).** Was the
>   biggest cluster (~18 hi entries, 5 SOV langs). The first instinct — swap set's
>   patient↔destination labels on the en parse — was tested and REVERTED because it regressed
>   SVO (the "backwards" labels are load-bearing for SVO marker placement). The real cause was
>   the **same as put/bind: no profile had a `set` word-order rule, so ja/ko/bn/tr/hi emitted
>   set VERB-MEDIAL** (`X को सेट Y में`) which the verb-final generated SOV set pattern (whose
>   markerOverride already aligns को→dest / में→value) never matched. A `set-to` verb-final rule
>   on the 5 profiles fixed it (no role change, no SVO touch). The remaining set residue is
>   finer value-type typing (property-path / @attr) at rf 0.5–0.75.
> - **`bind` (4 hi patterns, rf 0.00) — two-part, hi-only.** hindiProfile also lacks a
>   `bind-to` rule (verb-mid); ADDING it fixes word order BUT the verb-final hi bind then still
>   mis-parses — the fronted `$greeting` is anchored as a bare `on` event (`को#name-input`
>   smushed into a literal destination): the **SOV event-anchor** path
>   (HANDOFF-sov-event-anchor.md). ja/ko parse the identical token shape correctly. Needs the
>   fragile event-anchor work; deferred.
> - **`repeat` (~24 hi entries, ALL langs) — deepest.** The **en reference itself is garbage**:
>   the schema positional pattern stuffs `repeat 3 times add …` into
>   `loopType=3, quantity="times", event="add"` (body verb captured as `event`); the AST mapper
>   reads `quantity`, so even execution is wrong. SOV side equally broken
>   (`loopType:reference="me"`). Two-sided structural rewrite (handcrafted per-form patterns
>   like the existing `until-event` ones, en + SOV) + re-baseline. Highest reward, highest risk.
>
> **Update 2026-06-28g (Arc B R1 — `halt the event` article skip; avgRoleFidelity
> 0.9125 → 0.9142, all 23 langs +, zero regressions).** First convergent burn-down of
> the R1 value-type residue. Grounding the `halt.patient` cluster (the most consistent
> cross-language signature: en `halt the event` → `patient:literal="the"`) showed the **en
> reference itself was wrong** — it captured the article `the` and dropped the event, so every
> faithful translation mismatched it. One defect, two facets in `skipNoiseWords`
> (`pattern-matcher.ts`):
>
> - **en:** `event` tokenizes as a `keyword` (not selector/identifier), so the existing
>   article-skip missed it. Added an en case: skip `the` before a valid reference word
>   (`isValidReference`) → `patient:reference="event"`. (`the default`, a non-reference, stays
>   `literal`; bare `halt` unchanged.)
> - **SVO/VSO:** the transformer leaks an untranslated `the` before the translated event word
>   (`the evento entonces …`); the pre-existing non-en skip only fired before a SOV **particle**,
>   so these kept `patient:expression="the"`. Extended the non-en skip to also fire before a
>   **clause boundary** (then/and/or/end/EOF) — but **never before a command verb**, preserving
>   the §7y guard (tr form-submit-prevent's `the olay çağır …` keeps `the`; body parse intact).
>
> Result: en + all 23 priority langs now agree on `halt.patient:reference` for halt-propagation.
> **avgRoleFidelity +0.0014–0.0029/lang** (SOV laggards hi/ja/ko/qu/bn/tr +0.0025–0.0029; every
> SVO/VSO +0.0014–0.0015), **R0-recall 1.000 and R0-precision 0.972 both unchanged**, semantic
> suite 6262 pass, gate `--regression` green. Guard: `multilingual-roadmap-fixes.test.ts`
> "`halt the event` skips the leaked article" (15 cases incl. the §7y verb-after invariant +
> `the default`/bare-`halt` controls; verified failing-without-fix: 8 fail). Remaining R1
> residue (now hi 0.8646 the laggard): the **`repeat` loop-role garbage** (en reference itself
> mis-parses `repeat N times`/`for X in Y` — body verb captured as `repeat.event`, biggest
> cluster, two-sided en+SOV structural fix) and the **SVO `halt the event` → still `expression`
> for VSO verb-after forms**. See HANDOFF-r1-value-type-residue.md.
>
> **Update 2026-06-28f (R2 wave 8 — VSO ar/tl/uk fixed; put-before/after JOIN R2; the
> wave-5 worklist is CLOSED). subset 40 → 42.** The last residual from 2026-06-28e — `ar`,
> `tl`, `uk`, whose put is captured inline by the generated fused VSO event pattern (position
> word consumed as a plain destination marker → manner dropped → content inserted INTO the
> target) — is FIXED with handcrafted higher-priority (160) VSO put-before/after EVENT
> patterns (`vsoPositionalPutPatterns` in `event-handler.ts`): ar/tl verb-first
> (`{verb} {patient} <posWord> {dest} <evMarker> {event}`), uk event-first
> (`<evMarker> {event} {verb} {patient} <posWord> {dest}`). They match the position word as
> an explicit literal and record `manner`; the into-form stays on the generated pattern (its
> `في`/`sa`/`в` marker); the `-before`/`-after` id triggers the renderer's positional penalty
> so RENDER still prefers the into-form. **All 23 langs now match en for BOTH put-before and
> put-after; both join `EXECUTION_SUBSET` (40 → 42); R2 stays 1.000.** ar/tl/uk avgRoleFidelity
> +0.0027–0.0041, zero regressions; semantic suite 6262 pass; gate --regression green. Guard:
> the "Positional put `before`/`after`" block now covers all 14 langs (28 cases) + a wave-8
> execution lock (ar reproduces the en before/after offset). **The wave-5 R2 worklist (9
> divergences) is now fully closed**: 6 were stale-DB artifacts (#514), `multiple-events`
> (#515), put-before/after SVO+SOV (#516) + VSO (this). R2 subset 33 → 42.
>
> **Update 2026-06-28e (positional put `before`/`after` — 11 of 14 langs fixed; R1
> +0.004–0.008; VSO ar/tl/uk residual).** The last two wave-5 R2 divergences (`put-after`
> /`put-before`, `put "<p>New</p>" before/after me`) are a multi-family arc. The unifying
> root cause: the position word (`before`/`after` + translations) was not captured as the
> put command's `manner` role (what the AST-mapper turns into the DOM-insert modifier) —
> instead it was rendered into the destination (it/vi), mis-read as a `before`/`after`
> COMMAND in SOV (ja/ko/hi/bn/tr/qu), or split as a then-clause (tr `sonra` / bn `পরে`
> collided with `then`). A parallel **workflow** (5 family-design agents) produced the
> per-language pattern specs; implemented centrally:
>
> - **SVO (it, vi, ru, pl, th)** — handcrafted/priority-tuned put-before/after capturing
>   `manner` (it/vi added; ru/pl bumped; th added).
> - **SOV (ja, ko, tr)** — new verb-final put generators (`{patient} <posWord> {dest} … {verb}`),
>   priority 105 so the matcher wins before the SOV verb-anchoring fallback; **(hi, bn)** added
>   to their existing put functions.
> - **Tokenizer/collision fixes** — tr `sonra`→after (dropped the stale `sonra`→then EXTRA +
>   moved `then` to `ardından` in the dict & then-set); bn `পরে` removed from the then-set; qu
>   `ñawpaqpi`/`qhepapi` as single position-word tokens.
> - **Renderer** — extended the existing `-at-end`/`-at-start` render-only penalty to
>   `-before`/`-after` so the canonical into-form still wins RENDER selection (parse stays
>   priority-ordered) — a latent parser-vs-renderer priority conflict the high-priority
>   positional patterns exposed.
>
> Result: **11 of 14 langs** now parse `put before/after me` with `manner` captured;
> **avgRoleFidelity +0.004–0.008** across bn/hi/it/ja/ko/pl/qu/ru/th/tr/vi + precision gains,
> **zero regressions**, R2 still 1.000. Guard: `multilingual-roadmap-fixes.test.ts`
> "Positional put `before`/`after`" (22 cases, verified failing without the fix).
>
> **Residual blocking the R2 entry: `ar`, `tl`, `uk` (VSO).** Their put is captured INLINE by
> the generated fused VSO event pattern (`put-event-{ar,tl}-vso-verb-first-2role`,
> `put-event-uk-vso-2role`) — the position word (قبل/بعد, bago/matapos, до/після) is a
> destination-marker ALTERNATIVE, so it's consumed as the "into" marker and `manner` is lost
> (inserts INTO me → `+p[2]` + `Δ#btn` instead of before/after). Unlike SVO/SOV there is no
> body re-parse to reach a command-stage put-before pattern. Fixing it needs the VSO
> event-handler GENERATOR (`event-handlers-vso.ts`) to capture `manner` when the destination
> marker is a position word (or handcrafted high-priority VSO put-before/after `on` patterns).
> Once ar/tl/uk match, `put-before`/`put-after` can join `EXECUTION_SUBSET` (40 → 42).
>
> **Update 2026-06-28d (R2 wave 7 — multiple-events fixed; subset 39 → 40).** The first
> of the three genuinely-divergent wave-5 candidates is FIXED. `multiple-events`
> (`on click or keypress[key=="Enter"] toggle .active`) diverged in 7 languages
> (ja, ko, it, hi, tr, bn, qu): English handled the `or` multi-event conjunction in
> `buildEventHandler` (`extractOrConjunctionEvents`), but the per-language pattern paths did
> not — the SVO "full" patterns captured the translated `or` (`o`/`또는`/…) as a **phantom
> body command** (it → runtime "Unknown command: or"), and the SOV Stage-3 fallback mangled
> the clause (ko folded `또는keypress…할때` into an invalid CSS selector). Three root causes,
> all semantic-side:
>
> - **Tokenizer (ja)** — `または` (or) mis-split into `また`(→**and**!) + `は` because the
>   profile's `and` primary `また` is a 2-char prefix of the 3-char `または`. Added
>   `または`→`or` to the ja tokenizer EXTRAS so longest-match keeps it whole.
> - **OR_KEYWORDS (hi/bn)** — `या`/`অথবা` tokenize as bare identifiers; added their surface
>   forms to `OR_KEYWORDS` so the pre-pass detects them (qu `utaq` was already present).
> - **Parser (the unifier)** — a scoped **or-clause excision pre-pass** in `parseInternal`
>   (mirrors the VSO from-first normalization): excise `<or-word> <known-event> [filter]`,
>   re-parse the single-event handler every language already handles, then re-attach the
>   second event as `additionalEvents`. **Gated on a KNOWN event after the or-word**, so it
>   can NEVER fire on `or` inside an expression (`when $a or $b changes`, `($count or 0)`,
>   `if a or b` — the post-`or` token there is a variable/number, not an event; all three
>   verified untouched).
>
> Result: all 23 langs now match the en click effect; **R2 stays 1.000 (subset 39 → 40)**.
> Bonus, ZERO regressions: removing the phantom `or` lifts **avgPrecision** +0.0022 (it, bn,
> qu, tr) and the clean multi-event parse lifts **avgRoleFidelity** +0.0017 (bn, hi, ja, ko,
> qu, tr). Guards: `multilingual-roadmap-fixes.test.ts` "Multi-event \`or\` conjunction"
> (verified failing without the fix). **Two wave-5 divergences remain**: `put-after` /
> `put-before` (positional `put … after/before me`, 14 langs each, multiple root causes —
> `before`/`after` parsed as a command in SOV, position role lost in it/vi, wrong insert
> offset in ar/tl/uk).
>
> **Update 2026-06-28c (R2 wave 6 — subset 33 → 39; the wave-5 worklist was stale).**
> Re-grounding the wave-5 R2 worklist against a **freshly `populate`d** patterns.db (the
> committed db snapshot lags the current dicts) found that **six of its nine** candidates
> already match the en DOM effect in **all 23 priority languages** — their recorded
> divergences were artifacts of the stale committed db (e.g. its ms `next-element` carried an
> untranslated `to next`; a fresh populate emits `ke seterusnya`, which executes identically to
> en). Those six joined `EXECUTION_SUBSET` with **no parser/dict fix** (R2 stays **1.000**,
> subset 33 → 39): `next-element`, `toggle-aria-expanded`, `set-opacity`, `set-transform`,
> `accordion-toggle`, `caret-var-on-target`. The wave-5 worklist counts (next-element 1,
> toggle-aria-expanded 2, set-opacity 4, set-transform 4, accordion-toggle 6,
> caret-var-on-target 23) are all corrected to **0** here. **Methodology lesson (again):** the
> session-12 probe that built the worklist scored a STALE committed db — always `npm run
populate` before grounding R2. The **three genuinely-divergent** candidates remain the
> next-wave R2 worklist (re-grounded fresh-db divergent-lang counts):
>
> - **`multiple-events`** (7: ja, ko, it, hi, tr, bn, qu) — `on click or keypress[…]`: the `or`
>   multi-event separator isn't recognized (it: "Unknown command: or"; ko: the `또는keypress…`
>   run collapses into an invalid CSS selector; ja/hi/tr/bn/qu silently produce no effect).
> - **`put-after`** / **`put-before`** (14 each) — positional `put "<p>New</p>" after/before me`:
>   most langs error ("Unknown command: after", "put requires content and position", "put
>   requires arguments"); the few that execute (ar/vi/tl/uk) insert at the wrong offset (an
>   extra `Δ#btn` + `+p[2]` vs the en `+p[1]`).
>
> Each must be FIXED (not just recorded) before joining the subset, or it drops R2 below 1.0.
>
> **Update 2026-06-28b (R1 default-fill → 0.908; R2 wave 5).** Two more fixes:
>
> - **R1 schema default-fill (#512).** After Arc 4, the dominant remaining R1 drop was
>   DEFAULTED roles: the SVO pattern path materializes a schema role's `default` when
>   absent (toggle/add destination → me, increment/decrement quantity → 1) so en carries
>   it, but the SOV paths drop it (both default identically at runtime — a measurement
>   false-positive). A `fillSchemaDefaults` MEASUREMENT pass (parse-validator, on en +
>   every translation; NOT in `parse()`, which would pollute the renderer) lifts
>   **avgRoleFidelity 0.872 → 0.908** (per-SOV ~+0.04). R0/precision/R2 unchanged.
> - **R2 execution wave 5 (#513).** Added `remove-element` (`remove me`) — the only one
>   of ten fixture-eligible candidates that matched the en effect in **all 23 languages**,
>   so **avgExecutionFidelity stays 1.000** (subset 32 → 33). The other nine eligible
>   candidates have real per-language EXECUTION gaps (parse-faithful but executes
>   differently — exactly what R2 catches) and are the **grounded next-wave worklist**:
>   `next-element` (1 lang: ms) · `toggle-aria-expanded` (2: id,ms) · `set-opacity` (4) ·
>   `set-transform` (4) · `multiple-events` (6) · `accordion-toggle` (6) · `put-after` (14) ·
>   `put-before` (14) · `caret-var-on-target` (23, all). Each must be FIXED (not just
>   recorded) before it can join the subset without dropping R2 below 1.0 — the next
>   correctness arc beyond structural fidelity.
>
> Current authoritative state: parse rate **3696/3696 (100%)**, degenerate **0**, lossy
> **0**, avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.908**, R2
> **1.000** (33-pattern curated subset). Remaining R1 headroom (hi 0.852 · ja 0.880 the
> laggards) is per-command value-type mismatches (`set.destination:property-path`,
> `repeat` loop roles, `halt.patient` literal-vs-reference) — harder/structural, lower ROI.

> **Update 2026-06-28 (Arc 4 R1 landed + parse rate 100%).** Two follow-on fixes shipped:
>
> - **Arc 4 — SOV role-fidelity (#508).** A schema-driven primary-role normalization
>   (`normalizeCommandRoles` in `semantic-parser.ts`) relabels an SOV-fronted spurious
>   `patient` to the command's schema `primaryRole` for commands with no patient role
>   (fetch→source, wait→duration, send/trigger→event). **avgRoleFidelity 0.845 → 0.872**;
>   per-SOV-lang ~+0.04 (hi 0.757→0.801, bn 0.784→0.831, qu 0.785→0.826, ja/ko/tr similar).
>   R0/precision/execution + degenerate/lossy all unchanged; gate green, guarded.
> - **tr `window-resize` (#510).** The lone parse hard-fail, cleared: the i18n dict's
>   `boyut_değiştir` split on `_` → `değiştir`→`toggle` homonym destroyed the resize event; a
>   single-token `boyutlandırma` keeps it whole. **Parse rate 3695/3696 → 3696/3696 (100%)** —
>   zero failing patterns across all 24 priority languages. (Grounding corrected the handoff:
>   the fronted `debounced at 200ms` modifier was NOT a second blocker — the parser tolerates it.)
>
> Current authoritative state: parse rate **3696/3696 (100%)**, degenerate **0**, lossy **0**,
> avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.872**, R2 **1.000**.
> The 2026-06-21 table below is superseded. **R1/SOV role-fidelity is the only open headroom**
> (laggards now hi 0.801 · qu 0.826 · bn 0.831): the dominant patient→primaryRole mistype is
> fixed, and the remaining R1 drops are per-command value-TYPE mismatches (e.g.
> `send.destination` selector-vs-reference, `repeat` loop roles, `set.destination` property-path
> in SOV) — a smaller, lower-priority follow-on, not a single convergent defect. See Track 3.

> **Update 2026-06-27 (lossy tail CLEARED — both correctness bands now empty).** The
> degenerate band (→0, #492/#493) and the **lossy band (53 → 0, #495–#506)** are now BOTH
> empty: **every one of the 3695/3696 parsing patterns is faithful** (fid = 1.0). The lossy
> tail fell across a session-long sweep — th `trigger`/`send` (#495) · per-language
> `of`-possessive markers (#497) · `get-value` de/pl/zh (#498) · `form-submit-prevent` he/zh
> (#499) · `unless-condition` qu/vi/zh (#501) · vi `render` (#502) · qu `append` (#503) · zh
> `tell` (#504) · the ar/qu/sw loop-body + ko if-fold residue (#506) — almost all
> _localized-alignment_ fixes (a dict keyword, tokenizer split, or per-language role marker),
> with the methodology lesson holding throughout (the theorized "hottest-path body-parse" cause
> was wrong on all but the ko if-fold). Authoritative baseline (commit `12018416`,
> `browser-priority`): parse rate **3695/3696**, degenerate **0**, lossy **0**, faithful
> **3695**, avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.845** (still the
> laggard — hi 0.757 · bn 0.784 · qu 0.785 · ja 0.795 · ko 0.806), R2 **1.000**. The
> 2026-06-21 table below is superseded. **What remains is no longer a lossy band** — only the
> **R1/SOV role-fidelity burn-down (Track 3 / the convergent SOV event-anchor arc)** and the
> deferred **`tr window-resize`** hard-fail. Per-fix grounding + the remaining arcs are in
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md).

> **Update 2026-06-26 (priority degenerate band → 0).** The last two priority
> degenerates are cleared (see
> [`HANDOFF-remaining-degenerate-singletons.md`](HANDOFF-remaining-degenerate-singletons.md)):
> **ko `window-scroll`** (semantic Stage-2 command-homonym event-head guard —
> `hasSOVEventMarkerHead`; the if/else body was a red herring, the blocker was Stage 2
> short-circuiting on the `스크롤` scroll-command homonym) and **tl `behavior-resizable`**
> (i18n tokenizer keeping an attached `(arg, list)` atomic so the VSO from-first reorder
> stops splitting `pointerdown(clientX, clientY)`; collateral: ar resizable 0.667→0.889).
> Priority gate: **degenerate 2 → 0**, lossy unchanged (32), parse-rate 3695/3696, zero
> regressions. Remaining multilingual work is the **lossy tail (Track 4)** and the **R1/SOV
> role-fidelity burn-down (Track 3)**, scoped (with Arc 1 — th `trigger`/`send` — empirically
> grounded) in the successor handoff
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md). Note: the th lossy tail is NOT a
> "th-wide body-parse" issue as earlier theorized — it is th dropping the `event`-category
> commands (`trigger`/`send`) specifically; and the ar residual is narrower than the
> `measure`-drop framing now that #493 cleared the handler-head mangling (re-localize first).

> **Update 2026-06-17 (PR #445, behavior-removable he/zh).** The two he/zh
> `behavior-removable` hard fails are fixed (null → lossy: he 0.556, zh 0.667).
> Root cause was two stacked bugs: (1) the i18n transformer inserted a
> pre-positioned object marker before the behavior name in he/zh
> (`behavior את Removable` / `behavior 把 Removable`), which broke the semantic
> block parser's `tokens[1]` name detection; (2) `parseConditional` dropped the
> condition of block-style `if <cond>` (no inline `then`) in **all** non-English
> languages. The condition fix is cross-language, so it rippled positively:
> `behavior-removable` degen→lossy in 7 other langs, and draggable/resizable
> collapsed from ~23 → 8–9 non-faithful each. Zero regressions; avgFidelity and
> avgRoleFidelity up in every language. **All 8 remaining hard fails are now
> reactivity (Track 2).**

> **Update 2026-06-21 (PRs #470 + #472, `behavior-sortable` residuals — all three
> cleared).** The three remaining `behavior-sortable` residuals tracked in
> `HANDOFF-sov-sortable-residuals.md` (now complete) are fixed; `behavior-sortable`
> is faithful in every priority language except `th` (a pre-existing lossy, not one
> of the three). **Two of the three handoff diagnoses were wrong** — the real causes
> were simpler and both semantic-side:
>
> - **#470 — `exit`/`end` keyword collision (ja degenerate, de lossy).** The i18n
>   dict emits the `exit` command as a word the semantic end-keyword set ALSO listed
>   (ja `終了`, de `beenden`, ko `종료`; the real `end` is 終わり/ende/끝). Inside an
>   `if … exit … end` block the `exit` token decremented the body parser's
>   block-depth one step early, so the block's real `end` terminated the WHOLE
>   handler body — dropping every command after a following nested block. This was
>   the actual cause of "defect C — de (V2) sortable body" (NOT a V2 body-parse bug)
>   and of ja's degeneracy (the A2a verb-medial `set` it was blamed on survives via
>   `ml.parse` — it was never the gate blocker). Fix: `isEndKeyword` (ja/ko/de) +
>   the ja profile `end` alternatives no longer read the `exit` emission as `end`.
> - **#472 — ar VSO from-first `wait` clause (ar lossy).** The handoff guessed an
>   i18n-transformer mask-split / doubled clause; the real cause is the **ar
>   tokenizer** splitting `وثيقة` (document) at the proclitic `و` (`and`) → `و` +
>   `ثيقة`, where the spurious `and` conjunction became a clause boundary that
>   dropped the command — plus the generated `wait {duration}` pattern not anchoring
>   when the post-verb token is the source particle `من`. Fix: keep `وثيقة` whole
>   (proclitic-extractor `NON_PROCLITIC_WORDS`) + a hand-crafted `wait-ar-from-first`
>   pattern. The i18n transformer/dict output was clean — no transformer change.
>
> Net (priority gate): degenerate **10→9** (ja sortable was the only sortable
> degenerate), lossy **55→53**, parse-rate unchanged (3695/3696), zero regressions;
> guards in `multilingual-roadmap-fixes.test.ts`. The A2a/A2b SOV reorder defects the
> handoff theorized for sortable turned out NOT to gate it; whether they remain real
> for other patterns is untested (no longer sortable-blocking).

## The leverage map (what's actually non-faithful) — 2026-06-17

> **Snapshot — superseded by the 2026-06-21 baseline** (degenerate 9, lossy 53; see the
> "Where we are" table + the #470/#472 note above). The per-pattern counts below are the
> 2026-06-17 figures; in particular `behavior-sortable` (then 9 degen + 14 lossy) is now
> faithful in every priority lang but `th`. Kept as the historical cluster analysis.

Of the **131** non-faithful instances (29 degenerate + 94 lossy + 8 hard-fail),
two clusters dominate:

| Cluster                                                                         | degenerate | lossy | hard-fail |  total |   share |
| ------------------------------------------------------------------------------- | ---------: | ----: | --------: | -----: | ------: |
| **Behaviors** (removable/sortable/resizable/draggable + install)                |         18 |    47 |         0 | **65** | **50%** |
| **Reactivity** (bind-\* / live-\* / two-way / computed / intercept / window-\*) |          8 |     0 |         8 | **16** |     12% |
| **Control-flow** (`unless-condition` + then-chain bodies)                       |          1 |    10 |         0 |     11 |      8% |
| Long tail (get-value, tell-\*, set-color-variable, …)                           |          2 |    37 |         0 |     39 |     30% |

Per-pattern: `behavior-removable` 6 degen + 17 lossy (was 13 degen + 8 lossy + 2 hard) ·
`behavior-sortable` 9 degen + 14 lossy · `unless-condition` 1 degen + 8 lossy ·
`behavior-resizable` 1 degen + 8 lossy (was 21 lossy + 2 degen — the block-`if` fix) ·
`behavior-draggable` 8 lossy (was 23 lossy). **Hard fails were all reactivity** (ms `bind-*`×4,
sw `two-way-binding`/`computed-value`/`input-char-count`, tr `window-resize`); **PRs #446 + #447
cleared ms+sw (7 of 8)** — only `tr window-resize` remains (parse rate now **3695/3696**). See
the Track 2 increment notes below.

> **Read the behavior share through the implementation lens.** ~56 of the 94 behavior
> instances are the **Experimental 3** (Draggable/Sortable/Resizable) — the _only_ three
> behaviors implemented in **imperative JS** (`imperativeInstaller`) instead of compiled
> hyperscript `source`; the other 8 are source-compiled (audited 2026-06-16). But all three
> already ship a complete, faithful hyperscript `source` (e.g. `draggableSchema.source` is a
> real `repeat until event pointerup` / `wait for pointermove or pointerup` / `measure` impl).
> So this is a **runtime-capability** question, not a lane question — see Track 1.

## Plan — ranked by leverage

### Track 1 (top priority) — Behaviors: curate the showcase, fix the curated bug, harden the _system_

**The goal is not comprehensiveness.** We are not shipping a large behavior library —
the priority is **getting the behavior _system_ right**: a clear path for the user
community and LLM agents to write and install new behaviors, with the curated set as a
showcase of _what a behavior is_ and _what kinds hyperfixi enables_. The product decision
already exists in [`packages/behaviors/src/curation.ts`](../packages/behaviors/src/curation.ts):

- **Curated 5 (the supported story):** Toggleable, **Removable**, ClickOutside, Clipboard,
  AutoDismiss — real `on event → DOM action` inline scripts (the demonstration of "what is a behavior").
- **Optional 3:** FocusTrap, ScrollReveal, Tabs — primitives / nice-to-haves.
- **Experimental 3:** Draggable, Sortable, Resizable — labeled "stateful async components."
  **But each already ships a complete hyperscript `source`** and is the _only_ tier still
  executed via an **imperative JS** `install()` that bypasses that source. So the label is
  provisional: the boundary test is operational, not philosophical (see item 1).

**Constraint (user, 2026-06-16): no behavior may be implemented in imperative JS — all must
compile from hyperscript `source` (single source of truth).** Audit (2026-06-16): only
Draggable/Sortable/Resizable violate this (`imperativeInstaller`); the other 8 are clean.

The fix is to **eliminate imperative JS first**, then align curation, then invest in the system:

> **Status: item 1 DONE (2026-06-16, branch `feat/behaviors-no-imperative-js`).** Draggable /
> Sortable / Resizable now compile from `source`; `imperativeInstaller` under behaviors/ = 0.
> Required: parser CSS-interp whitespace fix (merged #440), `repeat until event … from <target>`
> resolution fix (core `repeat.ts`), and three source-idiom swaps (Resizable `*width`, Sortable
> `target.closest("li")`, `or pointerup` in the inner waits). Three runtime bugs surfaced en route
> — see **Runtime correctness follow-ups** below. Items 2 (`behavior-removable`) and 3 (the system)
> remain.

1. **Resolve the Experimental 3 to hyperscript `source` — fix-vs-cut is per-behavior and
   runtime-driven, not a blanket cut.** Each already has real source; the imperative installer
   exists because the runtime historically couldn't execute the source's advanced features.
   So, per behavior: (a) run its `source` and see what the runtime drops — Draggable needs
   `repeat until event pointerup`, `wait for pointermove or pointerup from document`, `measure
x/y`, and dynamic `add { left: ${…}px }` style templating; (b) if the runtime executes it,
   **delete the imperative `install()` and route through `source`** (same path as the curated 8)
   — this both honors the no-imperative-JS rule _and_ makes the multilingual fidelity follow for
   free (parse of one source); (c) **cut only** the behavior whose source genuinely can't execute
   without a runtime feature too costly to add — and even then, prefer fixing the feature, since
   it's likely shared (`repeat-until-event` is already a tracked gate pattern). Start with
   Draggable (we had it working before; richest source) as the bellwether for Sortable/Resizable.
2. ~~**Fix `behavior-removable` — it is CURATED, so its failures are real bugs.**~~ **DONE**
   (2026-06-17, PR #445). Was the only behavior with **hard** parse failures (he/zh null parse).
   Two stacked bugs, both fixed: (a) the i18n transformer inserted a pre-positioned object marker
   before the behavior name in he/zh (`behavior את Removable` / `behavior 把 Removable`), breaking
   the semantic block parser's `tokens[1]` name detection — fixed by `resolveNameTokenIndex`
   skipping a leading patient-marker token ([`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts));
   (b) `parseConditional` dropped the condition of block-style `if <cond>` (no inline `then`) in
   **all** non-English languages — fixed in [`transformer.ts`](../packages/i18n/src/grammar/transformer.ts).
   he/zh now parse 154/154 (lossy: he 0.556, zh 0.667). The condition fix is cross-language, so it
   rippled: `behavior-removable` degen→lossy in 7 other langs, draggable/resizable ~23 → 8–9
   non-faithful each, avgFidelity + avgRoleFidelity up everywhere, zero regressions. It is still
   6 degen + 17 lossy (the body sub-parse drops `trigger`/`remove`/`halt` after the conditionals) —
   a faithful pass is future headroom, not a regression. Remaining behavior debt is now
   `behavior-sortable` (9 degen + 14 lossy) and the Experimental-3 source execution (item 1).

   > **Multilingual behavior fidelity is a PRIORITY (user, 2026-06-17).** The faithful-pass
   > headroom above is the next behavior arc, not optional.
   >
   > **⚠️ DIAGNOSIS CORRECTION (2026-06-19).** The earlier triage above — and
   > [`HANDOFF-transformer-behavior-fidelity.md`](HANDOFF-transformer-behavior-fidelity.md) — blamed
   > the **i18n `GrammarTransformer`** ("nested `if {…}` bodies flattened into a then-chain"). That
   > was reproduced via `MultilingualHyperscript.translate`, which is **`semantic.translate` =
   > parse→render**, a path the **fidelity gate does not use**. The gate measures the translations in
   > `patterns.db`, populated by `sync:translations` → the **i18n `GrammarTransformer.transform`**,
   > whose output is in fact **faithful** (precision **1.000** in every language — no flattening, no
   > dropped `js()`/`halt`/`transition`). The real loss is **pure recall in the SEMANTIC PARSER**:
   > parsing the (faithful) translation drops the handler-body commands that follow the first nested
   > `if`/`repeat` block — exactly the "body sub-parse drops `trigger`/`remove`/`halt` after the
   > conditionals" line above. **It is a parser bug, not a transformer bug.** Do NOT spend effort on
   > `transformer.ts` for this; the HANDOFF doc is superseded.
   >
   > **Increment DONE (2026-06-19, semantic parser).** Two stacked bugs in
   > [`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts) `buildEventHandler`:
   > (a) the fused-pattern **fold-rewind guard** only saw a TOP-LEVEL conditional, but
   > `parseBodyWithClauses` wraps a multi-statement body in a `compound` — so the fold was missed and
   > the flat path dropped every command after the SECOND `end` (`trigger removable:removed`,
   > `remove me`); fixed to look inside the single-`compound` wrapper. (b) `isEndKeyword` rejected the
   > **English literal `end`** for curated langs (es `fin`, ja `終わり`, …), but a masked `js(…) … end`
   > block restores its terminator as English `end` → the conditional's depth tracker counted the js
   > body's `if` (+1) but not the js `end` (−1), unbalancing depth so the conditional over-consumed
   > the rest of the body; fixed to accept English `end` universally. Result: **behavior-removable
   > 0.667 → 0.889** across the clean SVO/other langs (es/fr/de/zh/it/id/ms/vi/ru/pl/he), per-language
   > avgFidelity +0.0014–0.0022, avgRoleFidelity up everywhere, **gate green, zero regressions**,
   > 6098 semantic tests pass. Regression guards in
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > ("Multi-statement handler body with a js-bearing nested if").
   >
   > **Increment 2 DONE (2026-06-19, PR pending — js-block opacity).** Removed removable's last
   > non-SOV gap: the en reference parsed a phantom `return` (and a surplus `if`) from inside the raw
   > `js(me) … if (…) return "cancel"; … end` body — masked in translations, so they could never
   > match it (capped removable at 0.889). A standalone `js(…) … end` already parsed clean (the main
   > parser stops after the first command), but **nested** in a handler/conditional body the clause
   > loop split the block at its internal `end` and re-parsed the JS body through the command
   > patterns. Fix: `parseBodyWithClauses` now consumes a `js(…) … end` block as one opaque `js`
   > command (`consumeJsBlock` — first `end` closes it, same heuristic as the i18n js-mask), built
   > directly so the JS body never reaches `matchBest`. Applies to en + every translation (the `js`
   > keyword survives translation verbatim). Result: **behavior-removable now FAITHFUL (1.0) in 11
   > languages** (es/fr/de/it/id/ms/zh/vi/ru/pl/he); priority gate **lossy 93→84, degenerate 24→22**,
   > avgFidelity + avgRoleFidelity up, precision flat, **zero regressions** across all 8 js-using
   > behaviors; 6101 semantic tests pass. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "js(…) … end blocks are opaque to the body parser".
   >
   > **Still open (each its own increment):** (1) **`behavior-sortable`** is unmoved — its loss is
   > `repeat`/`wait` inside a `repeat until event pointerup … end` block, BUT triage (2026-06-19)
   > shows the real blocker is the i18n transformer rendering `trigger sortable:start on me` as
   > `disparar sortable:start entonces en yo` (a spurious `then` + a stray `en yo` = "on me") right
   > before the loop block — the exact `trigger … on me` artifact `ON_TARGET_COMMANDS`
   > ([`transformer.ts`](../packages/i18n/src/grammar/transformer.ts)) deliberately leaves split. So
   > sortable is a **coupled transformer+parser** arc (clean the `trigger … on me` rendering AND
   > teach the body parser the loop-block fold), not a single-defect fix. (2) **SOV/VSO degeneracy**
   > (ja/ko/tr/qu/ar/tl) on both behaviors is the behavior-head/`init` reorder, a separate structural
   > problem (removable still degenerate in ar/qu/tl/tr). (3) ~~**pt/sw removable** lose `on`/`remove`/
   > `trigger` even as SVO~~ **DONE** (see Increment 3 below).
   >
   > **Increment 3 DONE (2026-06-19, PR pending — block-parser marker/opener homonym).** pt/sw were
   > the only SVO languages still lossy (0.625) on removable. Root cause: `parseBehaviorBlock`'s
   > depth tracker mis-counted the Portuguese dative marker `para` ("to", from `set triggerEl to me`
   > → `definir triggerEl para eu`) as the `for` LOOP opener — they share the surface form `para` in
   > pt — so depth never returned to 0 at the init's `end` and the init segment swallowed the entire
   > `on click` handler (`eventHandlers` empty; trigger/remove dropped). The tokenizer had already
   > resolved the ambiguity (it normalizes the marker to its role `destination`, not `for`); the
   > opener check ([`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts) `isBlockOpener`)
   > now trusts that normalized role over the colliding surface form. A token with no normalized form
   > (a raw js-body `if`) still falls back to the surface match, preserving js-block depth balance.
   > Result: **pt + sw removable now FAITHFUL (1.0)** → removable faithful in **13** languages;
   > priority gate lossy 84→80, degenerate 22→20, avgFidelity + avgRoleFidelity up, precision flat,
   > zero regressions; 6103 semantic tests pass. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "Block depth tracking ignores marker/opener homonyms".
   >
   > **Increment 4 DONE (2026-06-19, PR pending — sortable `trigger … on me` rendering).** The
   > "coupled transformer+parser" framing was **half wrong**: an isolation probe (replicating the
   > gate path — `maskSpans → GrammarTransformer → unmaskSpans`, then `ml.parse`) showed the parser
   > already folds a clean `repeat until event … end` block in a handler body (the SVO loss was NOT
   > a parser gap). The **sole** cause was the i18n transformer: `trigger X on me` / `send X on me`
   > were not in `ON_TARGET_COMMANDS`, so `splitOnCommandBoundaries` split at the locative `on`
   > (`trigger sortable:start` | `on me`) and the line-join re-inserted the target `then`
   > (`disparar sortable:start entonces en yo`); the dangling `then` glued the FOLLOWING
   > `repeat until event …` loop into a then-chain and dropped `repeat`/`wait`. Fix: add
   > `trigger`/`send` to `ON_TARGET_COMMANDS` ([`transformer.ts`](../packages/i18n/src/grammar/transformer.ts))
   > so `on <target>` stays attached (also flows through the SVO `buildArgumentModifierMap`
   > event→destination remap). The old "destabilises the parser" comment was stale (predated the
   > #452–#454 body increments). Result: **behavior-sortable lossy → FAITHFUL (1.0) in 13 SVO/other
   > languages** (es/fr/he/id/it/ms/pl/pt/ru/sw/uk/vi/zh); ko degenerate→lossy; bn/hi/th lossy→0.889.
   > Priority gate **lossy 80→68, degenerate 20→19**, parse-rate unchanged (3695/3696), avgFidelity +
   > avgRoleFidelity up, precision flat, **zero regressions**; 846 i18n tests pass + 8 new guards.
   > Guard: [`grammar.test.ts`](../packages/i18n/src/grammar/grammar.test.ts) "trigger/send `on
<target>` keeps its target — no spurious then (behavior-sortable)". removable byte-identical
   > (its `trigger removable:before/removed` carry no `on <target>`).
   >
   > **SOV/VSO arc — fully mapped (2026-06-19 deep diagnosis).** The handoff lumped this as one
   > "behavior-head/`init` reorder," but isolation probing (each command parsed alone, then the
   > init/handler sub-structures) shows it is **five separable defects**, NOT a deep SOV verb-final
   > gap. Every plain SOV handler command (`set`/`trigger`/`remove`/`add`/`halt`, chained, and
   > `trigger X on me`) parses faithfully — the loss is in **opener routing** + **control-flow body
   > parsing**, the documented dominant cluster:
   >
   > - **A — SOV behavior-final opener** (ja/ko/qu/tr): the `behavior` verb reorders block-final
   >   (`Foo(x) を behavior`), so `tryParseBlock` never routed it to `parseBehaviorBlock` →
   >   kind=compound/event-handler, behavior+init lost. **DONE (Increment 5 below).**
   > - **A2a — bare-`if` body command drop** (ja/ko/qu/tr): a standalone `if cond / cmd / end`
   >   (the behavior `init`) drops its body command (`set`). Root cause: `tryParseConditionalBlock`'s
   >   condition/then split (semantic-parser.ts) finds the then-branch via `tokensBeginCommand`,
   >   which (using bare `matchBest`) fails on a SOV verb-final command with a **bare-identifier
   >   patient** (`x を 設定 …`) — a selector patient (`.a を 追加 …`) is recognized, so `add` survives
   >   but `set` is swallowed into the condition. OPEN. **Prototype tried + rejected (2026-06-19):** a
   >   gated SOV copula-split (re-partition `condTokens` after the copula's predicate) is **clean
   >   (zero gate regressions)** but only recovers **ko** — `이다` normalizes to `is`, but ja `である`
   >   tokenizes to `で`+`ある` (and `で` IS the event marker — can't treat as copula), tr `dir`/qu
   >   `kanqa` don't normalize to a copula. Real fix needs per-language SOV copula normalization OR
   >   scan-from-end verb-final then-branch detection — materially larger/riskier than defect A.
   > - **A2b — command after a nested block dropped** (ja/ko/qu/tr): the SOV analogue of the
   >   merged #452/#453 fixes — the command right after a nested `if … end` in a handler body is
   >   dropped (`trigger removable:before`). `parseBodyWithClauses` SOV path. OPEN.
   > - **B — VSO/Austronesian handler-head** (ar/tl): opener IS recognized but the handler head
   >   leads with `from <target>` before the `on <event>` marker, so the handler isn't recognized.
   >   **DONE (Increment 6 below).**
   > - **C — de (V2) sortable body collapse**: opener + handler recognized, but the V2-reordered
   >   pointerdown body drops most commands. A separate V2 body-parse defect. OPEN.
   >
   > Plus sortable's **SOV trigger-drop tail** (bn/hi/th/ko miss `trigger`) — same A2b family.
   > Making ja/ko/qu/tr faithful needs **A + A2a + A2b** (sequenced); B and C are smaller arcs.
   >
   > **Increment 5 DONE (2026-06-19, PR pending — SOV behavior-final opener, defect A).**
   > [`tryParseBlock`](../packages/semantic/src/parser/block-parser.ts) now also detects a
   > `behavior` keyword past index 0 with a PascalCase name at index 0 (the SOV verb-final
   > declaration `Foo(x) <marker> behavior`), and `parseBehaviorBlock` takes the keyword index so
   > the name leads and the body starts past the (verb-final) keyword. ja/ko/qu/tr now parse as
   > `kind=behavior`: removable qu/tr **degenerate→lossy** (0.625), ja/ko lossy 0.5→0.625; sortable
   > qu→0.889, ko/tr→0.778, qu/tr **degenerate→lossy**. Priority gate **degenerate 19→15**, lossy
   > 68→65, parse-rate unchanged (3695/3696), execution 1.0, **zero regressions**; 6109 semantic
   > tests pass (+4 guards). NOT yet faithful — the residual is A2a (init `set`) + A2b (handler
   > `trigger`/`remove` after the nested blocks), the next two increments. ja sortable + ar/de/tl
   > unaffected by A (their causes are A2b-heavy / B / C). Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "SOV verb-final behavior declaration opener".
   >
   > **Increment 6 DONE (2026-06-19, PR pending — VSO from-first handler-head, defect B).** The VSO
   > transform fronts a handler's `from <source>` clause ahead of the `on <event>` marker
   > (`on click from triggerEl` → ar `من triggerEl عند نقر`, tl `mula_sa triggerEl kapag click`), so
   > no event pattern anchored on the leading source marker and the whole handler + body dropped
   > (the bare `on click` form parsed fine). The parse entry
   > ([`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts)) now detects a
   > leading `source`-marker + a following `on`-marker (VSO-gated), moves the from-clause to AFTER
   > the event, and re-parses the normalized `on <event> from <source>` order (the order the SVO
   > event path already handles). The source is moved, not dropped, so role-fidelity is intact.
   > **removable ar+tl → FAITHFUL (1.0)** (were degenerate); **sortable tl → FAITHFUL**, sortable ar
   > degenerate→lossy 0.889 (residual: `wait` inside the repeat loop — A2b). Priority gate
   > **degenerate 15→11**, lossy 65→66 (the one ar-sortable flip), parse-rate unchanged (3695/3696),
   > execution 1.0, **zero regressions**; 6112 semantic tests pass (+3 guards). de sortable (C) +
   > ja/ko/qu/tr (A2a/A2b) unaffected. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "VSO from-first event-handler head".
   >
   > **Still open after Increment 6 (as understood 2026-06-19):** **A2a** (SOV bare-`if` body
   > `set`), **A2b** (SOV/VSO command after a nested block — the sortable ar `wait` + bn/hi/th/ko
   > trigger-tail + ja sortable), **C** (de V2 sortable body).
   >
   > **⚠️ SUPERSEDED for `behavior-sortable` (2026-06-21, PRs #470 + #472 — see the dated note at
   > the top of this file).** The sortable items above were misattributed. ja-sortable-degenerate
   > and de-sortable-lossy ("defect C") were BOTH the `exit`/`end` keyword collision (`終了`/`beenden`
   > read as `end`), not the A2a/A2b SOV reorders or a V2 body-parse — fixed in `isEndKeyword` (#470).
   > ar-sortable-`wait` was the ar tokenizer splitting `وثيقة` at the `و` proclitic + a missing
   > from-first `wait` pattern (#472), not the transformer. `behavior-sortable` is now faithful in
   > all priority langs but `th`. **A2a/A2b/C were never the gate blockers for sortable**; whether
   > A2a/A2b remain real defects for OTHER patterns (e.g. bn/hi/th/ko trigger-tail on other
   > behaviors) is untested — re-triage before assuming they're open.

3. **The actual priority — the authoring + install system for community & LLM agents:**
   - ~~**Authoring guide**~~ **DONE** (2026-06-16): `packages/behaviors/AUTHORING.md` — the
     canonical "what is a behavior / boundary test / how to write one / install + resolver /
     agent checklist" doc, for humans _and_ agents. Stale `core/BEHAVIORS.md` +
     `SORTABLE_BEHAVIOR_GUIDE.md` (old imperative architecture) replaced with redirects.
   - **Install path:** the resolver hook already works (`install X` → `_hyperscript.behaviors.resolve(X)`
     → compile-on-first-use, `packages/behaviors/src/behavior-resolver.ts`) — now documented in
     AUTHORING.md §7 as the public extension point.
   - **LLM-agent path (boundary _validator_) — SKIPPED for now** (decision 2026-06-16: too heavy
     for this stage of adoption). AUTHORING.md §9 already gives agents a boundary checklist; an
     MCP/programmatic validator that _enforces_ it (reject component-shaped behaviors) is deferred
     until adoption justifies the weight. Revisit when there's real third-party behavior authoring.

**Layer:** runtime (execute the Experimental-3 source + the Removable parse bug) + product
curation + DX/tooling (the system). **Owner docs:** `packages/behaviors/AUTHORING.md`,
MULTILINGUAL_BEHAVIORS_PLAN.md, BEHAVIORS_CONSOLIDATION_PLAN.md. **Audit cmd:** grep
`imperativeInstaller` under `packages/behaviors/src/behaviors/` — must reach 0.

### Track 2 — Reactivity: bring the multilingual parse path up to the runtime

> **htmx v4 syntax verified (2026-06-17, against four.htmx.org).** htmx v4 reactivity is the
> **`hx-live` extension only** — a JS-expression body re-run via a document-wide
> `MutationObserver` + `input`/`change` events + post-swap, with a `q()` selector proxy and
> `debounce`/`timeout`/`trigger`/`take`/`nextFrame` scope helpers — plus the separate `hx-sse`
> / `hx-ws` streaming extensions. **htmx v4 has NO `hx-bind`, `hx-computed`, two-way binding,
> or signals.** So of the gate's reactivity patterns, only **`live`** descends from htmx v4
> (`hx-live` → hyperfixi's `live … end`, with a hyperscript body instead of upstream's JS — a
> documented divergence). **`bind` / `computed` / `two-way` are hyperfixi-native reactivity
> DSL, not htmx v4.** The old "reactivity (htmx v4)" framing conflated the two; corrected here.
> (Possible follow-up unrelated to the gate: hyperfixi's SSE/WS compat uses the htmx-2-era
> `sse-connect`/`ws-connect` attribute names; htmx v4 ships these as the `hx-sse`/`hx-ws`
> extensions. Worth reconciling in the htmx-compat layer, but out of scope for the parse path.)

**Decision (settled): reactivity is in scope and must be supported in the multilingual path.**
This is a parser/profile build-out, not an exclusion.

> **Increment 1 DONE (2026-06-17, PR #446).**
> Recon disproved the "all 8 are reactive block shapes" framing: the 8 hard fails split three
> ways. Cleared the clean half:
>
> - **ms `bind`×4 (hard-fail → parse).** `bindSchema` source `markerOverride` had `ms:'to'`
>   (stale comment "no i18n grammar profile") but ms gained the Malay grammar profile, so the
>   transformer emits the dative `ke`. Pattern expected `to`, text had `ke` → NULL. Fixed
>   `ms:'to'`→`'ke'` (mirrors `id`) in `command-schemas.ts`.
> - **hi `bind`×4 + `intercept` (degenerate → faithful/improved).** The hi profile was missing
>   `bind` and `intercept` keywords entirely (English-literal emission, like `worker`/
>   `eventsource`); added them + a hi `bind` source marker (`में`).
>
> Result: parse rate **3688 → 3692/3696**, degenerate **29 → 24**, hi avgFidelity **+0.033**,
> gate green, **zero regressions**. Semantic suite 6099 green.

> **Increment 2 DONE (2026-06-17, PR pending — `feat/track2-sw-input-event`).** Cleared the
> sw `input` cluster (3 hard-fails: `input-char-count` / `two-way-binding` / `computed-value`).
> Root cause was NOT an event×`set` interaction (my first guess) but a dict↔tokenizer mismatch:
> the i18n transformer emits the Swahili `ingizo` for the `input` event, but the sw tokenizer
> only listed the English literal `input`, so `ingizo` tokenized as a bare **identifier**. After
> the homonymous on/into marker `kwenye` (normalized to `destination`), an unknown event +
> `set`-body became ambiguous → NULL (recognized events like `bonyeza`→click parsed fine; same
> handler with `add`/`put` survived). Fix: add `{ native: 'ingizo', normalized: 'input' }` to
> `tokenizers/swahili.ts` (same dict↔profile-alignment family as id `toggle`, qu/tl `get`).
> Result: sw 151 → 154/154, parse rate **3692 → 3695/3696**, gate green, zero regressions (sw
> precision −0.0012, within tolerance — the computed-value complex-expr phantom). Semantic 6099 green.

**Remaining: 1 hard fail + hi block cluster — precise diagnoses (deferred, each its own arc):**

1. **tr `window-resize` (the last hard-fail).** Two stacked issues. (a) The sw-style event-name
   gap, but worse: the i18n transformer emits `boyut_değiştir` for `resize`, and the tr tokenizer
   **splits on `_`** → `boyut` / `_` / `değiştir`, where `değiştir` alone normalizes to **`toggle`**
   (collision). So the resize event is destroyed, not just unrecognized. The click form
   (`tıklama`, single token) parses identically, so a single-token resize recognition is the core
   fix — but it needs the underscore-split resolved (cf. the `enyakın` fused-token fix), likely an
   i18n-side single-word resize emission + tr tokenizer entry. (b) Independently, the `debounced
at 200ms` event modifier is left untranslated and fronted by the SOV reorder. Both needed for
   the full gate pattern. 1 hard-fail, ~2 fixes — lower ROI than the hi block cluster.

   > **Data point (2026-06-21, ru/uk install-behavior).** The same underscore-split bit ru/uk
   > `install`: the profile's disambiguator `установить_пакет` / `встановити_пакет` was inert
   > because the ru/uk tokenizer splits on `_` → `установить` → `set` (install ≡ set homonym),
   > so `install-behavior` was degenerate. **Resolved WITHOUT touching the tokenizer** by giving
   > install a distinct single-token loanword (`инсталлировать` / `інсталювати`) in both the
   > semantic profile + i18n dict (degenerate 6 → 4, zero regressions). For tr `window-resize`,
   > the equivalent single-token route would be a non-underscore resize keyword that doesn't
   > collide with `toggle` — likely cleaner than teaching the tr tokenizer to keep `_`-compounds
   > whole. The `debounced at 200ms` modifier is the separate, harder half.

2. **hi `live-derived-value` / `live-multiple-deps` (degenerate); also `intercept` blocks.** The
   genuine **reactive block-shape** work: `live`/`intercept` (and `eventsource`/`socket`/
   `worker`) are `bareKeyword` blocks (`hasBody:true`), but `block-parser.ts` only handles
   `behavior`/`def`. In non-English the `live … end` / `intercept … end` block parses as a bare
   `on`, dropping the block action. Teach the block layer the bareKeyword block shape (mirrors
   the behavior/`def` structural layer).

**Layer:** (1) sw semantic parser/tokenizer · (2) i18n transformer (SOV event reorder + modifier
xlate) · (3) semantic block-parser (bareKeyword blocks). Start with (1) — most leverage, cleanest
scope.

> **Increment DONE (2026-06-21 — reactivity degenerate cluster, hi live + ms socket).**
> The "teach `block-parser.ts` the bareKeyword block shape" diagnosis above was
> **wrong** (methodology lesson #2 — verify the layer empirically). es/ja/zh already
> parse `live … end` / `socket … end` as a single `command` (the bareKeyword pattern
> matches at the command stage; `collectActions` doesn't descend into the body, so the
> dropped body costs no fidelity). The two degenerate causes were per-language and in
> two **different** layers:
>
> - **hi `live-derived-value` + `live-multiple-deps` (semantic parser).** The hi
>   bare-event pattern `event-hi-bare` (`{event}`, priority 80) runs at Stage 1 —
>   before the command stage — and its single event role anchored the fronted `लाइव`
>   (live) keyword, so the block parsed as a bare `on` + `put`, dropping `live`. Fix:
>   the event-anchor guard (`pattern-matcher.tokenLooksLikeEvent`) now rejects a token
>   whose normalized form is a bareKeyword block action (`live`/`socket`/`eventsource`/
>   `worker`/`intercept`, derived from the schemas), so it falls through to the command
>   stage where the `live` pattern wins. Same guard family as the existing selector/URL
>   rejection.
> - **ms `socket-basic` (i18n dict).** The ms dictionary was missing the `socket`
>   command entry, so the transformer emitted English `socket`; the semantic ms profile
>   expects native `soket`, so the token tokenized as a bare identifier and `put`
>   (`letak`) won as the head. Fix: add `socket: 'soket'` to the ms dictionary (mirrors
>   ja `socket: ソケット`). (The full `generate-i18n-dictionaries` regen would also pull
>   in 7 unrelated stale ms derived entries incl. a `replace`/`replaceUrl` collision —
>   deferred as a separate ms-dict resync.)
>
> Net (priority gate): degenerate **9 → 6**, hi avgFidelity 0.980 → 0.993 + avgPrecision
> 0.837 → 0.850, ms avgFidelity/avgPrecision +0.007, zero regressions; 6134 semantic +
> 855 i18n tests pass. Guards: `multilingual-roadmap-fixes.test.ts` "bareKeyword block
> keyword is not mis-anchored as a bare event (hi live)" + `grammar.test.ts` "Malay
> socket command translates to native soket" (both verified failing without the fix).
> The remaining reactivity item is `intercept`/`eventsource`/`worker` block coverage if a
> future corpus exercises them in a SOV/bare-event language — the same guard now protects
> them, but they're untested in the priority corpus.

### Track 3 — R1 role-fidelity burn-down (the untouched dimension)

**Why:** avgRoleFidelity **0.833** is the laggard, and it has _never had a dedicated
campaign_ — it drifted up incidentally from 0.7505 (first measured, #365) to 0.833 as a
side effect of other work. The worst languages are the hard SOV/reorder set:
**hi 0.683 · qu 0.770 · bn 0.780 · ko 0.788 · ja/tr 0.793**. R1 measures
`action.role:valueType` recall — a parse that keeps the verb but drops or mistypes a role.

**Action:** triage R1 on hi/qu/bn first (worst three). For each, dump the role-signature
diff vs the en reference per pattern and find the recurring mistype/drop (likely a
marker→role mapping or a value-type classification in the per-language profile). This is
profile/parser work — but targeting _roles_, not _presence_. New `--regression` won't flag
drift here until someone drives it; this is greenfield headroom.

> **Triage DONE (2026-06-17) — the dominant cause is STRUCTURAL SOV, not dict-alignment.**
> A per-pattern role-signature diff (`action.role:valueType` recall vs en) across hi/qu/bn
> found the same two signals dominate all three: **`on.event:literal`** (hi 22×) and
> **`fetch.source:literal`** (hi/qu/bn **13× each**), with `repeat.loopType`/`repeat.event`
> (~7× each lang) and `halt.patient:literal` (6×) behind them. These are **not** independent
> dict gaps — they trace to ONE SOV root cause: when the SOV reorder fronts a **literal or
> expression** (a URL, a `fn()` call), the parser mistakes it for the **event** (hi parses
> `fetch /api/data` → `/api/data को लाएं` as `on /api/data … fetch`; `on click call myFunction()`
> → `myFunction()` becomes the event), or fails to match the bare SOV command at all (qu
> `/api/data ta apamuy` and bn `/api/data কে আনুন` return **NULL**). The control case proves it:
> when the fronted element is a **selector** (`on click toggle .active` → `.active को क्लिक पर
टॉगल`) the parse is **R1-perfect**. So selector-fronted SOV works; literal/expression-fronted
> SOV is mis-anchored. This is the **same structural frontier** as the deferred `tr
window-resize` hard-fail and the SOV behavior reorders — NOT the R0 dict-alignment family.
>
> **Implication for sequencing.** The biggest remaining multilingual headroom — the last
> reactivity hard-fail (tr), the hi/qu/bn R1 laggard, and the SOV `fetch` NULLs — **converges on
> one arc: SOV bare-command / event-anchor disambiguation** (don't treat a fronted
> literal/expression as an event; match the bare `<obj> <marker> <verb>` SOV command for the
> qu/bn NULL cases). One focused structural fix could move all three at once — but it edits the
> hottest, most regression-sensitive parser path (every SOV language currently passing), so it
> deserves a dedicated arc with careful R0/precision/parse-rate guards, not a tail-end increment.
> The quick dict-alignment R1 wins are largely already harvested by the R0 arcs; what's left here
> is structural.

### Track 4 — Control-flow + long-tail lossy

> **DONE (2026-06-27) — the lossy band is empty (lossy → 0).** `unless-condition` (#501; three
> independent keyword/transform causes, NOT body-parse as framed) and the full long-tail
> (`fetch-do-not-throw` #481, `get-value` #498, `tell-*` #504, `set-color-variable` #497, `render`
> #502, `append` #503, the ar/qu/sw loop-body + ko if-fold residue #506) are all faithful. No
> control-flow / long-tail lossy passes remain in the priority corpus. Per-fix grounding:
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md).

**Why:** `unless-condition` (8 lossy + 1 degen) is the largest non-behavior lossy pattern;
the docs' long-standing diagnosis is **control-flow body parsing** (`if`/`unless` headers +
then-chain `put`/`set` bodies collapsing). The rest is a singleton long tail
(`get-value` 4, `tell-*` 4, `set-color-variable` 4 — `fetch-do-not-throw` 5→0, cleared by the
fused-event if-block fold, PR #481).

**Action:** opportunistic, lower ROI than Tracks 1–2. Take `unless-condition` as the
representative and fix the enclosing block/then-chain collapse; the tail is per-pattern.
Defer the per-language R2 structural arcs (STRUCTURAL_ARCS_ROADMAP.md) — explicitly the
lowest-ROI remaining parse work.

### Track 5 — Reliability hygiene (do alongside, not after)

1. **Refresh stale headline numbers in the detailed docs.** _Partly done 2026-06-17:_ this
   file + a dated snapshot note added to CORRECTNESS_RELIABILITY_PLAN.md §1 and
   MULTILINGUAL_ROADMAP.md "Remaining work" pointing at the 06-17 baseline
   (lossy **94** / avgFidelity **0.985** / degenerate **29**). The prose bodies of those two
   docs still carry their original session-era figures inline — left as historical context,
   superseded by the dated snapshot + the baseline JSON (the authoritative source).
2. **Make `populate` deterministic.** CLAUDE.md flags the "minor residual jitter" on a few
   boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02 avg).
   A deterministic populate lets us tighten those tolerances toward 0 and trust the gate more.
3. **Consider an absolute fidelity floor**, not just a ratchet — once a language clears a
   threshold, ratchet the floor upward so it can't silently backslide within tolerance.
4. **hi precision follow-up.** hi avgPrecision **0.815** is a clear outlier (next-lowest ja ~0.91).
   The 2026-06-15 marker-disambiguation fix lifted it +0.016; more phantom-command sources
   remain in the hi profile. (Largely subsumed by Track 2 — the hi degenerate cluster is reactivity.)

## Runtime correctness follow-ups (core `_hyperscript`-compat — surfaced during Track 1a)

These are general core-runtime bugs (not multilingual) found while making the behavior
sources execute. The behaviors shipped via working idioms, so none are blocking — but each
is a real `_hyperscript` compatibility gap worth its own focused fix + test.

1. ~~**Top-level `on event(args)` doesn't bind event args.**~~ **DONE** (branch
   `fix/runtime-event-args-and-style`). The top-level parser emitted the destructure names as
   an untyped `params` field the runtime never read; now emits `args` (the field the runtime
   binds from + the behavior parser already uses). `on click(button)` etc. now bind.
2. ~~**`set my style.X` resolves to the read-only _computed_ style.**~~ **DONE** (same branch).
   The set member-assignment path now targets the writable inline `element.style` for
   `.style.<prop>` writes (reads unchanged). `set my style.width to "50px"` works; the
   Resizable `*width` idiom remains valid (not retrofitted — `*prop` is equally canonical).
3. **`closest <X/> to Y` positional returns null.** The positional `the closest <li/> to the
target` idiom yields null even when a match exists (`target.closest("li")` works). Lower
   priority — workaround is clean. Fix: the `closest <selector/> to <expr>` evaluator.

## Recommended sequence

1. ~~**Track 1a — eliminate imperative JS**~~ **DONE** (PRs #440–#442): Draggable/Sortable/Resizable
   compile from `source`; `imperativeInstaller` → 0. Runtime follow-ups #1 (event-args) + #2 (inline
   style) also **DONE** (#442); #3 (`closest`) deferred.
2. ~~**Track 1b — authoring guide**~~ **DONE** (#443, `packages/behaviors/AUTHORING.md`). The
   boundary **validator** is **skipped** for this stage (see item 3 above).
3. ~~**`behavior-removable` he/zh**~~ **DONE** (2026-06-17, PR #445). See Track 1 item 2.
4. ~~**Track 2 — reactivity in the multilingual parse path**~~ **7 of 8 hard-fails DONE**
   (PRs #446 ms `bind`×4 + hi keywords, #447 sw `input` event). Parse rate **3688 → 3695/3696**.
   Only `tr window-resize` remains — deferred as **structural SOV** (see Track 2 increment notes).
   The hi `live`/`intercept` bareKeyword block-shape work is the remaining genuine block-parser arc.
5. **Track 3 — R1 role-fidelity** triaged (2026-06-17): the laggard (hi 0.683 / qu 0.770 / bn 0.780)
   is **dominated by structural SOV mis-anchoring**, not dict-alignment (see the Track 3 triage
   note) — `on.event:literal` + `fetch.source:literal` are the top drops and both trace to "fronted
   literal/expression mistaken for the event / bare SOV command not matched."
6. **The convergent next arc — SOV bare-command / event-anchor disambiguation.** `tr window-resize`,
   the hi/qu/bn R1 laggard, and the SOV `fetch` NULLs are **one structural problem**. A focused arc
   here is now the highest-leverage remaining parser work — but it's regression-sensitive (hottest
   SOV path), so guard R0/precision/parse-rate carefully. Alternative if smaller wins are preferred:
   **Track 4** lossy long-tail (94 lossy ≫ the 1 remaining hard-fail).

> **Increment DONE (2026-06-17 — SOV event-anchor / bare-command).** The structural root cause
> (a fronted **literal / expression / URL** mis-anchored as the handler event in SOV reorders) is
> fixed. Five changes, all semantic-side, gate green (`--regression` exit 0), **zero regressions**:
>
> - **Event-anchor guard** ([`pattern-matcher.ts`](../packages/semantic/src/parser/pattern-matcher.ts)
>   `tokenLooksLikeEvent`) — the `event` role of an event-HANDLER pattern (`command === 'on'`) now
>   rejects selectors / URLs / `#@*`-punctuation / string-number literals, so a fronted `/api/data`
>   can't anchor a bare-event pattern. Scoped to `on` (send/trigger payloads keep literal events) and
>   parens-tolerant (the `when (<expr>) changes` reactive patterns capture an expression in `event`).
> - **Bare-call fold** (same file, `tryMatchBareCallExpression`) — folds `name(args)` (parens tokenize
>   as identifiers in the multilingual tokenizers) into one expression so a verb-final SOV role
>   captures `myFunction()` whole instead of stranding `( )`. Skipped for the `event` role
>   (`on pointerdown(clientX, clientY)` destructures params, not a call) and for DECLARATION commands
>   (`behavior`/`def`/`install` — `Draggable(dragHandle)` is a signature; folding it let a single-command
>   pattern shadow the faithful `behavior … end` block parse).
> - **SOV `fetch` command patterns** ([`patterns/fetch.ts`](../packages/semantic/src/patterns/fetch.ts)
>   `sovFetch`, ja/ko/tr/hi/qu/bn) — verb-final `{source} [<patient-marker>] <verb>` mapping the
>   patient-marked URL to `source` (the transformer marks `fetch <url>` with the object marker; mirrors
>   `fetch-zh-ba`). Standalone SOV `fetch /api/data` was NULL in all five marker langs → now faithful
>   (`fetch.source:literal`).
> - **qu/tr URL tokenization** (`classifyToken` in tokenizers/quechua.ts + turkish.ts) — `/path` → `url`
>   (was `identifier`→`expression`), so `fetch.source` types match the en `literal` reference.
> - **hi added to `SOV_EVENT_MARKERS`** (`पर`, [`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts))
>   — hi was the only priority SOV lang without a Stage-3 SOV event-extraction fallback, so its
>   patient-first 2-role event handlers (e.g. `append-content` `{patient} को {event} पर {verb}
{destination} में`) had survived only via the now-removed bare-event mis-anchor. The fallback is
>   additive (Stage 3 runs only after Stages 1–2 fail; known-event gate + body re-parse).
>
> **Result:** **hi avgRoleFidelity 0.683 → 0.713 (+0.030)** — the worst R1 laggard, driven by the
> `on.event:literal` cluster (hi had no SOV fallback). hi avgPrecision +0.010, global avgPrecision
> +0.0015, avgFidelity flat, parse rate **3695/3696** (unchanged; the corpus fetch was already
> non-null — these are fidelity gains). Baseline regenerated. Semantic unit suite 6098 green.
> One unit test (`commands-scroll-push-replace-process` hi `replace`) added `hi` to its skip set: its
> hand-crafted `बदलें_यूआरएल` input underscore-splits (same root cause as the already-skipped tr/qu
> `_url` forms) and had only "passed" via the degenerate string-literal-as-event crutch the guard removes.
>
> **Still open (out of this increment):**
>
> - **`tr window-resize`** — the lone remaining hard-fail (still 3695/3696). Compounded: (1) the i18n
>   transformer emits `boyut_değiştir` for `resize`, which the tr tokenizer splits on `_` →
>   `değiştir`(→`toggle` collision); (2) the `debounced at 200ms` modifier is left untranslated and
>   fronted. Deferred — it needs an i18n single-token-resize emission + tr tokenizer fused-token entry
>   (cf. `enyakın`) **and** modifier translation, a high-risk multi-part change to the hottest path for
>   the single lowest-ROI pattern.
> - **Complex multi-clause SOV `fetch` — ✅ R0 set-drop resolved (PR #481, #480).**
>   `fetch-do-not-throw` (`fetch … as JSON do not throw then if it set $users to it end`) is now
>   **faithful in all priority langs** (was lossy in bn/hi/ja/ko/tr). #480 stripped the phantom
>   `throw`; #481 made the fused-event body **fold its trailing `if … end` block** and recover the
>   verb-medial `set` in the then-branch (`parseBodyWithGrammarPatterns`), and scoped the
>   verb-anchoring particle guard to known role markers so the `set`-value marker (`に`) no longer
>   anchors a phantom `into`. The same root-cause fold also cleared `fetch-error-handling`,
>   `form-disable-on-submit`, `modal-close-escape` (1→0 each) and `take-class-from-siblings` (2→1).
>   Any remaining qu/bn `fetch.source` **role-typing** slice (R1 — mis-typed `fetch.patient` via
>   verb-anchoring) is a separate matter; the `fetch`→`source` verb-anchoring remap tried earlier
>   proved **inert** on the corpus and was dropped.

Re-baseline (`--save-baseline`) after each intentional fidelity change, regenerate against a
freshly `populate`d DB, and commit only the dicts/profiles + baseline (not `patterns.db`).
