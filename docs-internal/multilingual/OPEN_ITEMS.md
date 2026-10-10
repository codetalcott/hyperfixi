# Multilingual open items

> Stamped 2026-09-30 at `4f65ddaae` (PR 131). The queue behind
> [`MULTILINGUAL_NEXT_STEPS.md`](../MULTILINGUAL_NEXT_STEPS.md) (the roadmap): every item still open when
> the old 8,740-line queue was archived, plus what the 2026-09-30 product survey found. Each has an ID
> the roadmap uses.
>
> **Line numbers** (`· 4765–4767 ·`) point into the ARCHIVED queue:
> `git show archived/multilingual-next-steps-2026-09-30:docs-internal/MULTILINGUAL_NEXT_STEPS.md`.
> "probe confirmed" means re-measured on 2026-09-30 by translating the example into the language and
> back (`translate(src,'en',L)` → `translate(out,L,'en')`); "not probed" means no later fix is recorded
> and nobody re-measured it. Re-measure before costing any item: a filing's diagnosis ages.
>
> **Maintenance:** a PR that fixes an item deletes its line (the PR body keeps the story). A new filing
> gets the next ID in its section and one line: what breaks, a repro, the date, whether a gate pins it.

## 2. Open items (76 in 2a–2e): parser 39 · render 6 · vocab/owner 8 · gate 14 · product 9

Plus the unnumbered sections: naturalness N1–N8 (2h), core-only syntax U2 and U5 (2j), and user docs and
surfaces (2i, 11). Counts re-checked 2026-10-07 at `2124e1561`.

Format: **ID · title**: what is broken · lines · date · gate · category · status.

### 2a. Parser correctness, semantic front-end (39)

The dominant pattern: most of these fail **in English's semantic parse**, so every
translation inherits the loss. English on a page is unaffected, because `@hyperfixi/engine` reads
it directly; `translate()`, MCP `translate_code`, the corpus writer and the adapter (non-English
on a page) are the exposed surfaces. Since 4.2.0 (M1's fail-loud) those surfaces refuse a translation
that would lose part of a script. Of the M1-scope items re-probed on 2026-10-07, P9 was still
silent; the others marked *refused* are loud.

1. **P2 · Class names that begin with an event-modifier word are dropped**: `.stop*`, `.prevent*`, `.once*`, `.debounce*`, `.throttle*` do not parse. `on click toggle .stopped` leaves `.stop ped` unread, in English and so in every language · 4449–4452 · 2026-09-26 (PR 7b) · no · parser · **refused** (2026-10-07).
2. **P6 · ko bare `unless p toggle .selected` reads `p` as an event** (`on p unless then toggle …`) · 5431–5432 · 09-26 (PR 47) · no · parser · **refused** (2026-10-07).
3. **P7 · A bare `for x in .i … end` in bn/hi/sw reads the `in` phrase as a handler** (`on x …`). The same loop inside a handler round-trips · 4433–4434 (bn render-gate side 4426–4430) · 09-25 · partial (bare-render allowlist: repeat-for-each[bn], stagger-animation[bn]) · parser · **refused** (2026-10-07).
4. **P8 · `scroll [<el>] up|down|left|right by <n>` is lost whole in English** · 5007–5008, 5042 · 09-26 (PR 26/27) · yes (command-shape LOUD family `scroll-by`) · parser + vocabulary · **refused**: the direction words have no dictionary entry in any language, an owner vocabulary decision (M1 step 3, 2026-10-07).
5. **P9 · A possessive element target is mistranslated**: `remove #d1's children` → es `quitar children de #d1` reads back `remove children from #d1` (the property stays English since 2026-10-07; the `de` still reads as the source). For a command with a source role, the `of` render reads as the source. Needs a different render, not a wider role · 5034–5036 · 09-26 (PR 27) · no · parser/render · **still silent** (2026-10-07).
6. **P10 · `default x to <li/> in #list` is lost whole** (default's value takes no selector; the class-query half was fixed by PR 35) · 5043–5045 · 09-26 · no · parser · **refused** (2026-10-07).
7. **P11 · `make a Set` is dropped**: filed as rendering `make a`; it now renders `on click`, so worse · 4396 · 09-25 · no · parser · **refused** (2026-10-07).
8. **P13 · A negative number after a marker**: `add 5 to -1` was filed rendering `add 5 to -`; it now renders `add 5 to - 1` (spaced) · 4392–4393 · 09-25 · no · parser · **partially fixed**, re-measure on upstream.
9. **P15 · `repeat it times`**: ms `ulang ia kali` reads `ia kali` as the possessive `its kali`, and qu (`chay kuti ta kutipay …`) drops the loop · 6694–6696 · 09-30 (found in PR 125) · no · parser · **refused** (2026-10-07).
10. **P16 · `settle for <timeout>` has no duration role**: `settle for 3000` → `settle` in every language · 8610–8619 · 09-02 · no (its row in core's `grammar-schema-parity.test.ts` went with core's engine, #1368) · parser (schema) · left M1: the engine rejects the source; **refused** (2026-10-07).
11. **P17 · Command-name pseudo heads, semantic half**: `reset() the closest <form/>` → `on click reset (`, and `focus() on #x` the same. Core's half is done (hxi18n Arc 4) · 8688–8694 · 09-23 · no · parser · left M1: the engine rejects the source; **refused** (2026-10-07).
12. **P18 · A custom `or` leg fails**: `on click or myEvent …` throws on read-back in bn/ja/tr/zh (the render leaves `or` English in the frame: `クリック or myEvent を で`) and is dropped in it/ko/th · 5266 · 09-26 (PR 39) · no · parser/render · **refused** (2026-10-07).
13. **P21 · `put … at end of …` is lost in it/th**: it reads back `put "a" into fine`, th `put into` · 4813 · 09-26 (PR 19) · no · parser · **refused** (2026-10-07).
14. **P23 · zh reads no `if` inside `repeat forever`**: `如果` comes back untranslated · 4843 · 09-26 (PR 21) · no · parser · **refused** (2026-10-07).
15. **P24 · bn `শেষ` (`end`, also `last`) moves a loop's `end` past the command after it** · 4842 · 09-26 · no · parser · not probed.
16. **P25 · vi loses toggle's `trên` target when a command follows without `rồi`** (hand-written; the renderer writes `rồi`, so rendered text round-trips) · 4880 · 09-26 · no · parser · rendered form OK, hand-written not probed.
17. **P26 · The trigger split reads the NEAREST command before an `on`**: `send toggle to #x on keyup log 1` → `send toggle to #x then log 1`, so the second handler merges into the first · 4882–4883 · 09-26 · no · parser · **refused** (2026-10-07).
18. **P29 · ms `ada` (has/exists) not read in a condition**: `unless me has .off` → ms `saya ada .off` reads back `unless my ada.off`. The rest of the 08-28d residual (de, ja) now reads right · 247–251 · 08-28 · no · parser · **refused** (2026-10-07).
19. **P31 · hi verb-first with English `times` loses its count** (`click पर दोहराएं 3 times …`, a code-switched order; needs a reclaim like increment's amount) · 7085–7088 · 09-30 (PR 127) · no · parser · open, low value.
20. **P32 · Four view-transition deferrals**: tl loses swap's patient on the plain form; qu cannot parse `process` at all; ms mis-binds process's patient to a property-path on the tail form; the ms morph possessive fold eats `ia using` · 7636–7639, 7655–7658 · 08-01 · yes (pinned in `test/view-transition-manner.test.ts`) · parser · not probed.
21. **P33 · A wait's source is read after the run only**, so an SOV loop head that renders its source before the event (ja `… document から pointermove 待つ`) keeps its first reading only · 4557–4558 · 09-26 (PR 8d) · no · parser · not probed.
22. **P34 · A verb-final (SOV) body can still lend the head an `or` leg** (`クリック で keydown または click を 待つ`) · 4496–4497 · 09-26 (PR 8a) · no · parser · not probed.
23. **P35 · Explicit syntax cannot round-trip a spaced expression value** (`condition:x < 10`) · 4444–4446 · 09-25 · no · parser (explicit) · not probed.
24. **P36 · pt `para` / sw `kwa` read a bare for-loop's word as the destination marker**, so the loop's `end` closes its handler early · 4624–4625 · 09-26 (PR 8f) · yes (pinned in `behavior-block-openers.test.ts`) · parser · not probed.
25. **P37 · qu and tr split a trailing number off an identifier**: `behavior Demo15` defines `Demo` · 4626–4627 · 09-26 · no (the test uses letter-only names) · parser (tokenizer) · not probed.
26. **P38 · bn transformer-era verb-first wait keeps only its first event** · 4559–4561 · 09-26 · no · parser · input-only, low.
27. **P40 · A word that is both an event name and a command verb reads one way**: de `senden` normalizes to `submit` (last-wins keyword collision with the send verb; harmless only because literal matching is value-based). es/pt `enviar`, zh `发送`, tr `gönder`, qu `apachiy`/`kachay` and sw `tuma` are both `submit` and `send`, de `laden` and qu `apamuy` both `load` and `fetch`, qu `tikray` both `change` and `toggle`; each is an input-only table name, and written as a command's event it reads as the verb (`enviar enviar a #x` → `send send to #x`; found 2026-10-06 by P50's hand-written-name test) · 8104–8106 · 07-12 · no · parser · open.
29–32. **P41–P44 · pick grammar deferrals**, "still deferred (named, unchanged)" at the end of pick arc 3, with no later line:
    - **P41** `item`/`items` (loop-variable rename collision)
    - **P42** `start` endpoints (the 6-language init/default dual)
    - **P43** `match`/`matches` (needs a match-only role)
    - **P44** the `..` range separator (tokenizes as two `.`)

    All at 1675–1678 · 07-20 · no · parser · not probed. Out of corpus; English `pick items 1 to 3 from arr` renders `… of arr`.
28. **P52 · A custom event in a foreign `wait` with no source reads as a time wait**: the renderer writes no `for`, so es `esperar myEvent o 2s` reads back `wait myEvent or 2s` (a time expression) where English keeps `wait for myEvent or 2s`; with a source the event is read (P50). Upstream reads every non-number leg after `wait for` as an event. Repro: `translate("on click wait for myEvent then log 1", 'en', 'es')` and back · 2026-10-06 (P50's probes) · no · parser/render · **refused** (2026-10-07).
29. **P53 · A variable named `if` or `end` breaks the block it stands in**: upstream and the engine run each as a variable (`set if to 1`, `put end into #out`), but the block readers match the English spelling of `if`/`end` in every language, so ja `if を 1 に 設定` reads `if … end`. Measured by the value matrix with both names added: `if` fails 6 of its 12 cells (93 pairs: ja/qu/tr/hi/bn/ko, and `not if` in English's own round trip), `end` all 12 (505 pairs, every language); both are left out of its `KEYWORD_NAMES`. Repro: `translate("on click set if to 1", 'en', 'ja')` and back · 2026-10-06 (P49's matrix run) · no · parser · **refused** (2026-10-07).
30. **P55 · A hand-written foreign word inside a literal runs as a name**: es `establecer x a [verdadero, n]` (or `{a: verdadero}`) reads back with `verdadero` as a variable, silently. Since #1417 the renderer writes literal interiors as written, so only hand-written text has it. The reader could refuse a literal holding the language's own words, as kept clauses do · 2026-10-07 · no · parser · probe confirmed.
31. **P56 · halt's modes after a word**: `halt default` and `halt the event's bubbling|default` are refused in all 24 lanes. `default` is also a command, and the rule that keeps `call` out of `halt call f()` (C5) skips it; a halt-only reading would carry both · 2026-10-07 (M1 step 3) · yes (LOUD `halt-modes`) · parser · refused.
32. **P57 · Collection expressions**: upstream 0.9.93's `<q/> in #box where it matches .a`, `… mapped to its textContent`, `repeat for x in :items where …` are refused in all 24 lanes (semantic's reader has no `where` / `mapped to`) · 2026-10-07 (M1 step 3) · yes (LOUD `collection-expressions`) · parser · refused.
33. **P58 · `at end of` inside a behavior's or a def's body**: `behavior B on click put "x" at end of me end` and the def form are refused; the block parser's `end` tests lack the position check the handler path has (`at end of`, `at the end of`) · 2026-10-07 (M1 step 3) · no · parser · probe confirmed.
34. **P59 · `wait for reset from #b` loses its source in English**: the English reader takes `reset` (a command too) for the command, so `on click wait for reset from #b then log 1` is refused en → en (invariant: `#b`); the engine reads it. No translation can carry a native `reset` event through `wait for` until this is fixed, so every language's `reset` is denylisted (M2 N2) · 10-08 · command-event-names.test.ts (once `reset` renders) · parser · open.

### 2b. Render / naturalness (6)

36. **R1 · Structured object-literal renderer**: brace interiors stay English (es `fetch … con {method: "POST", body: closest <form/>}`). The end state: localize option VALUES, keep KEYS, reverse both on parse. That needs the object literal parsed structurally, a parser-track change · 1217–1224 · 08-27 · yes (`value-lexicon-braces.test.ts` pins the English interior) · render · **probe confirmed** (English interior).
37. **R2 · it/pl/ru/uk `set` puts the marker on the target**: `impostare in @disabled vero`, `ustaw do @disabled prawda`, `установить в …`. They round-trip, so no gate sees it; these four are absent from `setSchema`'s destination/patient markerOverride maps · 886–891 · 08-27 · no · render · **probe + schema confirmed**.
38. **R3 · A naked URL renders quoted, which is a parse error upstream before `in new window`**: `go to /x in new window` → `go "/x" in new window` (upstream reads `"/x" in …` as the `in` operator). The fix is general URL quoting (14 corpus rows use naked URLs) · 4964–4967 · 09-26 (PR 25) · no · render · **probe confirmed**.
39. **R4 · Localizing `in` inside expressions and scopes**: renders keep English `in` · 4694 · 09-26 (PR 11) · no · render · open.
40. **R5 · ja handler head `<event> を で` (two markers)**: not idiomatic, but round-trips. A Phase-2 deferral in `MULTILINGUAL_BEHAVIORS_PLAN.md` and still seen at 298–300 · 06-14 · no · render (native) · **probe confirmed** (`クリック を で .active を 切り替え`).
41. **R6 · `render: 'canonical' | 'parse-only'` pattern flag uncommitted**: four patterns written only to read i18n output later became the render surface (go-qu-url-dest, remove-bn-full, repeat-qu, trigger-zh-ba). Each was fixed ad hoc · 486–489, 346–348, 1172–1174 · 08-27/28 · no · render (design) · open.

### 2c. Vocabulary / owner decisions / native review (8)

43. **V2 · NATIVE: ru `3 раз` / uk `3 разів`** want `раза`/`рази` after 2–4. The dictionary has a single form · 7106–7108 · 09-30 · no · vocab/native · open.
44. **V3 · NATIVE: the reactive `when … changes` words in all 24 languages**, plus:
    - the fr `change`, id `berubah`, th `เปลี่ยน` change-event homographs
    - the six dictionary-vs-profile `when` head words (`V1|*|when` waiver: ja/zh/th/tl/ms/vi; zh `何时` is interrogative)
    - SOV prefix-head order

    Tracked in `packages/semantic/NATIVE_REVIEW_NEEDED.md` §"Reactive when … changes" · 1438–1441, 1478–1479 · 08-27 · no · vocab/native · open.
45. **V4 · OWNER: `hx-query` (htmx 4.0.0's sixth verb) has no localized spelling.** Core's htmx-compat layer, whose semantics the original question was about, retired in Phase C3 (#1350), so only the vocabulary is left: `KEYS.hx` in `packages/htmx-adapter/scripts/gen-htmx-vocab.mjs` (moved there from core's `i18n-hooks.ts`) lacks `query`, so no `vocab/<lang>.js` maps a localized name to it · 8621–8647 · 09-03 · no · vocab/owner · open (verified absent 2026-10-06).
46. **V5 · Reset/empty words that cannot be fixed**: ar/sw/tl `reset` has no form that round-trips (waived); ja `empty` command has no available dictionary fix (bare `空` phantoms the hot `is empty` rows) · 8279–8288, 8309, 8316 · 07-12 · waived in `vocab-waivers.json` · vocab · open.
47. **V6 · bn `every` (`প্রতি`) is a mis-filed key in the dictionary's `events` category** (not a DOM event) · 8218–8220 · 07-14 · no · vocab hygiene · open (still at `packages/i18n/src/dictionaries/bn.ts:107`).
48. **V7 · de `warte` (the imperative) is no wait word at all** · 7089 · 09-30 · no · vocab · open.
49. **V8 · de separable-verb imperatives are not read**: `füge hinzu`, `schalte um`, `lege fest`, `rufe ab` are multi-word, which a one-token keyword cannot express, and `get` and `fetch` would both be `rufe ab`. Decide the multi-word representation first. The es/pt/fr/ko/ar imperatives were done 2026-07-25 (`1fe571f3`, `25e2c3cc`) · `HANDOFF-imperative-forms.md` (archived 2026-10-06) · 07-25 · no · vocab · open.

### 2d. Gates / measurement / blind spots still described as true (14)

50. **G1 · Arc D: the `unconsumed-input` → confidence-penalty scoring change** is not done. All preconditions are met (five-step plan). Payoff: re-evaluate whether `parseInternal` Stages 0/0.5 can be deleted. `ConfidenceContext` still has no consumed/total · 4317–4333, 8345–8349 · 07-13 · n/a · gate/parser · open (verified in `confidence-model.ts`).
51. **G2 · The R2 curated subset has no non-click bare event** (e.g. `input-validation`, `on blur`), so the **wrong-event listener class** is invisible to every signal. R3 also excludes plain event names from its invariant whitelist · 8146–8156, 8185–8187 · 07-12 · no · gate · open (verified: `EXECUTION_SUBSET` lacks it).
52. **G3 · R2 cannot see event modifiers** (event-once/debounce/throttle are ineligible under the jsdom harness). Needs PATTERN_SETUP stubs, fake timers and PATTERN_TRIGGER entries ("fold into Arc G") · 8535–8547 · 07-13 · no · gate · open.
53. **G4 · R2's effect signature keys elements by document-order index**, which is fragile for innerHTML-changing patterns (template-literal-interpolation is unusable as a fixture) · 2423–2426 · 07-04 · no · gate · open.
54. **G5 · R2 rows never admitted**: `default-value` (a harness no-op) and the heterogeneous `set`-target forms (`set the *--primary-color of #theme …`, `set previous <input/>.value`, `beep!`/`breakpoint`). Some may be eligible now · 2415–2421, 2355–2357 · 07-04 · no · gate · status unknown, re-measure.
55. **G6 · Confidence is not a ratcheted signal**, so drift goes unseen (e.g. set-color-variable 1.0 → 0.79 in es/it/pl/ru/th/uk; `blur-element` 1 → 0.714) · 4311–4312, 8695–8698 · 07-13 / 09-23 · no · gate · open.
56. **G7 · Foreign renders of markup `_=` bodies are scored only by the corpus writer's `reRenderPreservesContent` guard** ("markup rows are scored by the corpus writer and by nothing else"). The English side is now in the en-reference gate (`<id>#<n>` units) · 457–458 · 08-27 · partial · gate · open.
57. **G8 · Shapes outside every gate's input.** The command-shape gate (#1401) now reads 1,135 authored scripts (upstream's 0.9.93 tests, core's reference and hover examples) in 24 lanes, and the value matrix covers value shapes. A shape in neither is unmeasured; the roadmap's rule 4 widens them only toward shapes users write · 09-25 → 10-07 · yes (command-shapes) · gate · mostly closed.
58. **G9 · Bare-render allowlist, 12 pairs** (`baselines/bare-render-fidelity.json`, 2978/2990 on 2026-10-06): announce-screen-reader[hi], fetch-formdata[hi], go-back[bn,hi] (the destination marker is also the event marker, 4380–4381), morph-with-template[ja], render-template-with-data[ja], repeat-for-each[bn] + stagger-animation[bn] (`এ` event marker, 4426–4430), socket-send[bn,hi], template-literal-list-build[bn,ko] · yes (shrink-only) · gate · open.
59. **G10 · en-reference-preservation keeps 1 allowlisted unit** (162/163 on 2026-10-06): async-block, by design (the front end strips `async`). behavior-draggable's entry was pruned in #1338, which rewrote the behavior in upstream's idioms · 4651–4656, 4723–4727, 4787–4788 · 09-26 · yes · gate · open (by design).
60. **G11 · Stale pin: the `js(args) … end` 12-language exclusion.** The note says es/id/it/ms/pl/pt/ru/sw/th/tl/uk/vi stop at `(`. **Probe: all 12 now round-trip.** The test only asserts the OK list (`packages/semantic/test/js-block-round-trip.test.ts:141–147`), so nothing noticed the fix. Widen `ARGS_FORM_OK` to 23 · 844–847 · 08-27 · partial · gate · new finding.
61. **G12 · "Consider an absolute fidelity floor"**: averages still carry 0.02 tolerance (per-pattern flips are at 0) · 4157–4158 · 06-17 · no · gate · low, mostly superseded.
62. **G13 · Optional: split V4's vocab tier** (marker words that appear in patterns → warn, profile keywords → error) · 8117–8118 · 07-12 · no · gate · optional.
63. **G14 · Pronoun collisions (accepted limitation)**: 802 of 893 differing read-backs in the extended names oracle are a variable spelled like a value word (tl `ako`, fr `je`, id `aku`, pl `cel`, de `ich`, tr `o`). No spelling tells them apart; rename is the only fix. `findTranslationCollisions` reports them (MCP `translate_code` warns `NAME_COLLISION`) · 7143–7155, 7241–7251, 7296–7298 · 09-29 · yes (diagnostic) · other/limitation · standing.

### 2e. Product / release (9)

64. **PR1 · Community review: the badge arc**: hash-pinned "verified by native speakers" badges, `verifications.json` / `vocab-verifications.json` ledgers, `verified_native*` columns plus the sync join, the text-hash util, an agent sweep/triage harness, changeset fan-out, and a per-language status ladder. "Needs a real inflow of reviewer sign-offs first" · 8602–8608 · 08-01 · n/a · product · deferred.
65. **PR2 · Behavior boundary validator** (MCP/programmatic, rejects component-shaped behaviors). SKIPPED until third-party behavior authoring exists · 3965–3968 · 06-16 · n/a · product · deferred.
66. **PR3 · python-client CI job** (mirror of go-client). Deferred post-release; still absent from `ci.yml` · 8434–8435 · 07-13 · n/a · release/CI · open.
67. **PR5 · htmx v4 attribute names**: the htmx adapter's vocabulary localizes the htmx-2 extension names (`KEYS.sse` `connect`/`swap`, `KEYS.ws` `connect`/`send` in `packages/htmx-adapter/scripts/gen-htmx-vocab.mjs`), where htmx 4 ships `hx-sse`/`hx-ws`. Core's SSE/WS compat layer, where this was filed, retired in Phase C3 · 3986–3988 · 06-17 · no · product · open (re-checked 2026-10-06).
68. **PR6 · Arc B: the `derive.ts` dictionary flip**. The dictionaries are "generated/merged from semantic profiles — hand-written entries are preserved" (`generate:language-assets`), not the generated path. The ~4k-entry duplication stays and is held consistent by the V1 vocab gate. Note that 1409–1411 overstates this ("GENERATED from semantic profiles") · 8329–8334 · 07-12 · yes (vocab gate, lexicon-parity) · product/tech-debt · open.
69. **PR8 · OWNER: approaching upstream.** When to offer the multilingual tools and the MCP server to hyperscript.org (Big Sky), and whether together or the MCP server first. The material is `docs-internal/hyperscript-org-offer/` (not sent; refreshed against 4.1.0 on 2026-10-06, #1400) and `~/projects/ideas/hypermedia-systems-outreach-draft.md`; the owner holds both until the code is ready · `HYPERSCRIPT_TOOLS_NEXT_STEPS.md` §6 (archived 2026-10-06) · 08-27 · n/a · product/owner · open.
70. **PR9 · Arc 6: generalize via the framework** (`createMultilingualDSL` + `DomainRegistry`; `@lokascript/domains` is the proof of concept): a tutorial-grade guide and one non-UI example domain, only if the agent-facing arcs show traction · `AGENT_ERA_ROADMAP.md` (archived 2026-10-06) · 08-25 · n/a · product · deferred.
71. **PR10 · A standalone `@lokascript/fidelity` package**: `@lokascript/semantic/fidelity` is the seam. Trigger: a named external consumer · `AGENT_ERA_ROADMAP.md` · 08-25 · n/a · product · deferred.
72. **PR11 · A remote/HTTP transport for the MCP server**, as an option on the existing server (MCP has native streamable HTTP). Trigger: demand for a hosted endpoint · `AGENT_ERA_ROADMAP.md` · 08-25 · n/a · product · deferred.

---

### 2h. Naturalness: what a native reader sees (found by the 2026-09-30 product survey)

No gate measures these; the survey's scripts are the baseline (see the roadmap, M2).

- **N1 · English words in renders**: 769/3542 corpus renders (21.7%) hold an English hyperscript word, from ~a dozen constructions that leak identically in all 23 languages: loop heads (`repeat` in for/while/until/until-event, `forever` ×15, `with index`), event modifiers (`once`, `debounced at`, `throttled at`, `from elsewhere`), `I match`, positional `in`, `the X of Y`, `as T`, `on <target>`, `tell … to`, `go back` (es `ir a back` reads "go to back"), `go to url`, `do not throw`, `def`. Top words: `repeat` 155, `in` 123, `on` 92, `at` 70, `as` 69, `I`/`match` 69. · 2026-09-30 · gate: english-leaks (words; 18.9% of corpus renders on 2026-10-08) · naturalness (mostly owner vocabulary decisions; the lexicon is locked to the dictionary; the decisions are rows of `VOCABULARY_SHEET.md`, 2026-10-08; rows done: A1–A5, A7–A10, B1–B7; the words target is met in every language, 2026-10-10).
- **N2 · English event names**: done for he hi it pl qu ru th uk vi (M2, 2026-10-08): each lexicon's own word renders where a hand-written one reads back; the rest are denylisted with reasons (coined compounds, `_`-joined words, collisions; a native word is a vocabulary call). Left: 17 older denylist entries in ar de fr id sw tr zh whose table word differs from the lexicon's (de `taste runter` / `taste unten`): reorder and let `event-name-translation.test.ts` judge each; ms and tl lexicons hold English event words. · gate: english-leaks (`event:`, 0 in both halves) + `native-event-names.test.ts` (a lexicon event word renders or is denylisted) · naturalness.
- **N3 · `me` after a preposition is nominative in 13 languages** (80–92% of such renders): es `a yo`, pt `a eu`, it `a io`, de `zu ich`, pl `do ja`, ru `к я`, uk `до я`, tr `ben e`, ar `إلى أنا`, he `אל אני`, tl `sa ako`, hi `मैं में`, bn `আমি তে`. fr/ja/zh/id/ms/vi are fine. Needs an oblique form per marker (probably me/it/you) and a reader that takes both. · 2026-09-30 · gate: english-leaks (`case:me`) · naturalness (design + vocabulary). The reader half is done (2026-10-10): de `mir`/`mich`, pt `mim`, pl `mnie`/`mną`, ru `меня`/`мне`/`мной`, uk `мене`/`мені`/`мною` and hi `मुझ`/`मुझे` read as `me` (es `mí`, it `me`, tl `akin` already did; each was a variable or refused before). Renders still write the nominative. Since 2026-10-10 the gate also counts `it` beside a marker (`case:it`: fr `dans il`, de `zu es`, ru `к это`, tr `o e`, …) and a nominative pronoun as an unmarked object (`case:me-object`, `case:it-object`: de `messen ich`, es `poner ello`): corpus 9.0% → 13.4% of renders, shapes 16.4% → 18.9% (the rules per language: `CASE_RULES` in `english-leaks.ts`).
- **N4 · Handler heads with two markers**: ja `クリック を で` (the transformer wrote `クリック で`; ko was moved to `클릭 할 때` for this), tr `tıklama i üzerinde` (transformer: `tıklama da`). Also R5. · no gate · naturalness.
- **N5 · Suffixes written as separate words** in tr (`ben e`, `.active i`), ko (`나 에`), bn (`আমি তে`): reads as broken in agglutinative languages. · no gate · naturalness (design question).
- **N6 · Article and marker slips**: es `al carga`/`al entrada`; he `חכה את 1s` (accusative on a duration); zh `等待 把 1s`. · no gate · naturalness.
- **N7 · lexicon gaps**: bn/hi `after`/`before`, qu `trigger`/`until`/`event`, th `unless`, tr `render`, bn/th `matches`; qu `lluqsiy` is both `exit` (profile) and `result` (lexicon), so a condition `the result is …` reads as `exit` and is refused (`if`, and `when` since M2). · no gate · vocabulary.
- **N8 · Count-word grammar** (= V2), and a native reviewer for the count words tr `kez`/`kere`/`defa`, ja `回`/`度`, ko `번`/`회`.
- **N9 · English kept as written by M1**: a clause no pattern models (`take … giving`, `render into`), upstream's `on` head forms (`elsewhere`, `mutation of …`), scope words (`element x`), `catch`/`finally`, bracket interiors and call arguments, and property names no reader brings back (`my children`) appear in English inside foreign renders (4.2.0, #1417). Each was a refused or lost translation before; native forms need vocabulary (policy 5) and, for brackets, a reader that de-localizes inside them. Modeled since, in each language's own words: `transition … from … to` (#1425) and `add/remove/hide/show … when <condition>` (the profile's word for `when`, M2) · gate: english-leaks, command-shape half (contexts `clause`, `bracket`, `call`, `property`; kept clauses never occur in the corpus) · naturalness.

### 2j. Core-only syntax the engine drops (filed 2026-10-01)

`packages/engine` keeps two core forms (`new X()`, `toggle <element>`) and drops the rest. The rule
(roadmap, policy 2): the reader keeps accepting a dropped form, and English writes upstream's spelling.
Since Phase C2c (2026-10-03) it does, through a node rewrite before every English render
(`semantic/src/explicit/upstream-spelling.ts`, each spelling measured equal on upstream and the engine),
for `set @a … on X`, `my?.a`, a bare URL with a spaced `${…}`, `previous <input/>.value`, `X has .c`,
`fetch … do not throw`, a string `go` destination and most of core's extra commands; `tell X to cmd` and
`with index` were done before. Foreign renders keep their words. (These IDs were D1–D5 until 2026-10-06,
which clashed with 2i's.) Still read and written as written:

- **U2 · Prefix `unless <condition> <command>`**: a flat `unless` command in the chain, so the block's extent is not in the node; upstream's `unless` is a suffix on one command. Needs the fold `if` has (`tryParseConditionalBlock`) before it can be written as `if not (…) … end`. **Measured 2026-10-03 (C2c), core vs upstream/engine, condition true:** `unless C A then B` guards A and B (= `if not (C) A then B end`); `unless C A end then B` guards A only (= `if not (C) A end then B`); `unless C A B` (no `then`) guards A only on core — upstream's block guards both, so that shape has no faithful spelling. semantic reads the first two to the SAME flat node (`unless C then A then B`), so the fold must keep the `end`. No corpus row uses prefix `unless` since 10-01; left for its own PR · 10-01 · no · parser/render · **probe confirmed**.
- **U5 · Commands semantic has a schema for and the engine has no keyword for** — PARTLY DONE C2c: English writes `call history.pushState/replaceState(null,'',X)`, `call navigator.clipboard.writeText(text)`, `put X at start of Y`, and the `swap` strategies as `put … into/before/after/at start of/at end of`, `put … into X's outerHTML`, `remove X`; `clone`, `process` and `copy <element>` are still written as read (no measured equivalent): `push`, `replace` (DECIDED 2026-10-03: dropped, no engine addition; the two pages write `call history.pushState(null, '', X)` / `replaceState`, which is what the renderer should write for a `push`/`replace` node — no corpus row has one), `copy`, `prepend`, `process`, `clone`, and core's `swap` strategies (`swap innerHTML of X with Y` reads on upstream as an exchange of two values). A translation that uses one renders English no engine but core runs · 10-01 · no · schema/owner · measured (`packages/engine/README.md`).

### 2i. User-facing docs and surfaces (found by the 2026-09-30 product survey)

- **D5 · Five `examples/multilingual/` pages pin `@lokascript/i18n@2.3.0`** and call the retired translate helpers; `error-playground.html` pins semantic@2.3.0; `showcase`/`semantic-demo` say 13 languages.
- **D6 · `apps/docs-site/`** (VitePress, never deployed) is two majors stale (`@lokascript/core`, `GrammarTransformer`, local absolute aliases, a tracked Vitest report).
- **D7 · No multilingual quick start, package chooser or limitations statement**: the entry points are the adapter (the lite build beside a semantic bundle, or a per-language or regional bundle), its `@hyperscript-tools/multilingual` copy, build-time `@hyperscript-tools/i18n`, the Vite plugin, and the htmx adapter (`hyperfixi-multilingual.js` and core's `MultilingualHyperscript` retired in 4.0). Entry points re-listed 2026-10-06; whether the 4.0 docs now give a chooser is not re-checked.
- **D8 · README examples run only for the adapter**: `packages/hyperscript-adapter/test/readme-examples.test.ts` executes that README's examples (3.2.0); no other package's README examples are executed, so they can rot silently (left from the roadmap's M0 exit, 2026-09-30).
- **S1 · VS Code extensions are not published** (Marketplace and Open VSX: not found; no workflow). Owner: publish or drop from the product story. **Partly decided 2026-10-04:** the standalone `_hyperscript` extension (`vscode-extension-hyperscript`) is retired, since upstream ships its own; the LokaScript extension's fate is still open.
- **S3 · `@lokascript/compilation-service` has no README.**
- **S4 · Weight is ungated**: a single-language page loads the engine (34 KB gz) and a per-language adapter bundle (`hyperscript-i18n-de.global.js` 116 KB gz in 4.1.0), or the lite adapter beside a semantic bundle; CI's size ceiling and size snapshot cover only `hyperfixi.js` (re-checked 2026-10-06). The owner question is in the roadmap's §4.
- **S5 · Semantic-built nodes carry no nested source positions**, so LSP hover/diagnostic ranges are blind to arguments in non-English code (PARSER_NEXT_STEPS L67/L68/L932).
- **S8 · vite-plugin `region: 'slavic'` and `'south-asian'` import nothing**: both are in the type, but `getLanguagesForBundleType` (`packages/vite-plugin/src/semantic-integration.ts`) has no case for them, so only English and explicitly listed languages load (found 2026-09-30; the README documents only the four regions that work). Its debug `SEMANTIC_BUNDLE_SIZES` (Jan 2025, 14–61 KB) is stale too.
- **S7 · `async <cmd>`**: semantic strips `async` in all 24 (PARSER L2665).

