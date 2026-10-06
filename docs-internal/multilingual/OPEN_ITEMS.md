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

## 2. Open items (91): parser 45 · render 6 · vocab/owner 7 · gate 14 · product 7 · other 12 (core runtime)

Format: **ID · title**: what is broken · lines · date · gate · category · status.

### 2a. Parser correctness, semantic front-end (45)

The dominant pattern: most of these fail **in English's semantic parse**, so every
translation inherits the loss. English on hyperfixi's own runtime is unaffected because it
goes through core's parser; `translate()`, MCP `translate_code`, the corpus writer and the
non-English direct path are the exposed surfaces.

2. **P2 · Class names that begin with an event-modifier word are dropped**: `.stop*`, `.prevent*`, `.once*`, `.debounce*`, `.throttle*` do not parse. `on click toggle .stopped` renders `on click`, silently, in English and so in every language · 4449–4452 · 2026-09-26 (PR 7b) · no · parser · **probe confirmed**.
3. **P3 · A bare `if … end` (no handler) parses as an event handler**: `if true add .yes to me end` → `on true add .yes to me`, and `if p then toggle .a end` → `on p toggle .a`, in every language including English · 4461–4462, 5429–5430 · 09-26 · no · parser · **probe confirmed**.
4. **P4 · Bare `if #a and #b log "ok" end` loses its body**: English renders `if #a and #b`. The top-level and-conjunct drop, first logged in July · 4232–4233, 8273–8276 · 07-13 / 07-12 · no (input-coverage diagnostic only) · parser · **probe confirmed**.
5. **P5 · `break` / `continue` dropped by English**: `repeat 3 times break end` renders `repeat 3 times end`. The "latent-by-absence" class: no parse path in any language · 4228–4231, 8273–8277, 8322 · 07-12/13 · no (diagnostic fires) · parser · **probe confirmed**.
6. **P6 · ko bare `unless p toggle .selected` reads `p` as an event** (`on p unless then toggle …`) · 5431–5432 · 09-26 (PR 47) · no · parser · **probe confirmed**. (The pl half was fixed by PR 104.)
7. **P7 · A bare `for x in .i … end` in bn/hi/sw reads the `in` phrase as a handler** (`on x …`). The same loop inside a handler round-trips · 4433–4434 (bn render-gate side 4426–4430) · 09-25 · partial (bare-render allowlist: repeat-for-each[bn], stagger-animation[bn]) · parser · **probe confirmed** (bn, hi, sw).
8. **P8 · `scroll [<el>] up|down|left|right by <n>` is lost whole in English** (and the AOT reads neither direction nor amount) · 5007–5008, 5042 · 09-26 (PR 26/27) · no · parser · **probe confirmed** (`on click scroll down by 100` → `on click`).
9. **P9 · A possessive element target is mistranslated**: `remove #d1's children` → es `quitar hijos de #d1` reads back `remove hijos from #d1`. For a command with a source role, the `of` render reads as the source. Needs a different render, not a wider role · 5034–5036 · 09-26 (PR 27) · no · parser/render · **probe confirmed**.
10. **P10 · `default x to <li/> in #list` is lost whole** (default's value takes no selector; the class-query half was fixed by PR 35) · 5043–5045 · 09-26 · no · parser · **probe confirmed**.
11. **P11 · `make a Set` is dropped**: filed as rendering `make a`; it now renders `on click`, so worse · 4396 · 09-25 · no · parser · **probe confirmed (worse)**.
12. **P12 · `trigger "my event"` loses its quoting**: English renders `trigger my event`, es reads back `trigger my` · 4391 · 09-25 · no · parser · **probe confirmed**.
13. **P13 · A negative number after a marker**: `add 5 to -1` was filed rendering `add 5 to -`; it now renders `add 5 to - 1` (spaced) · 4392–4393 · 09-25 · no · parser · **partially fixed**, re-measure on upstream.
14. **P14 · `put it.value into #d1` renders `its.value` in English** · 4918 · 09-26 (PR 23) · no · parser/render · **probe confirmed**.
15. **P15 · `repeat it times`**: ms `ulang ia kali` reads `ia kali` as the possessive `its kali`, and qu (`chay kuti ta kutipay …`) drops the loop · 6694–6696 · 09-30 (found in PR 125) · no · parser · **probe confirmed**.
16. **P16 · `settle for <timeout>` has no duration role**: `settle for 3000` → `settle` in every language · 8610–8619 · 09-02 · yes (the `settle` row of core `grammar-schema-parity.test.ts`) · parser (schema) · **probe confirmed**.
17. **P17 · Command-name pseudo heads, semantic half**: `reset() the closest <form/>` → `on click reset (`, and `focus() on #x` the same. Core's half is done (hxi18n Arc 4) · 8688–8694 · 09-23 · no · parser · **probe confirmed**.
18. **P18 · A custom `or` leg fails**: `on click or myEvent …` throws on read-back in bn/ja/tr/zh (the render leaves `or` English in the frame: `クリック or myEvent を で`) and is dropped in it/ko/th · 5266 · 09-26 (PR 39) · no · parser/render · **probe confirmed** (ja and bn throw).
20. **P20 · ar reads a keyword after toggle's `على` as its duration**: `toggle .a on keyup` → `toggle .a for keyup` · 4881 · 09-26 (PR 22) · no · parser · **probe confirmed**.
21. **P21 · `put … at end of …` is lost in it/th**: it reads back `put "a" into fine`, th `put into` · 4813 · 09-26 (PR 19) · no · parser · **probe confirmed**.
22. **P22 · On the direct path, `put … at end of` replaces instead of appending**: buildAST writes `modifiers.into` and drops the manner · 4435–4436 · 09-25 · no · parser (buildAST) · not probed.
23. **P23 · zh reads no `if` inside `repeat forever`**: `如果` comes back untranslated · 4843 · 09-26 (PR 21) · no · parser · **probe confirmed**.
24. **P24 · bn `শেষ` (`end`, also `last`) moves a loop's `end` past the command after it** · 4842 · 09-26 · no · parser · not probed.
25. **P25 · vi loses toggle's `trên` target when a command follows without `rồi`** (hand-written; the renderer writes `rồi`, so rendered text round-trips) · 4880 · 09-26 · no · parser · rendered form OK, hand-written not probed.
26. **P26 · The trigger split reads the NEAREST command before an `on`**: `send toggle to #x on keyup log 1` → `send toggle to #x then log 1`, so the second handler merges into the first · 4882–4883 · 09-26 · no · parser · **probe confirmed**.
27. **P27 · A bare `set *opacity to 0.5` writes `1` on the direct path** (the corpus form `set my *opacity` works) · 4916–4917 · 09-26 · no · parser (buildAST) · not probed.
28. **P28 · A bare lexicon word used as a value is localized one way**: `index` and `length` in bn/ms/th/tl render native and read back native (`increment i by সূচক`). PR 58 fixed only `length of X` · 4783–4784 · 09-26 (PR 17) · no · parser/render · **probe confirmed**.
29. **P29 · ms `ada` (has/exists) not read in a condition**: `unless me has .off` → ms `saya ada .off` reads back `unless my ada.off`. The rest of the 08-28d residual (de, ja) now reads right · 247–251 · 08-28 · no · parser · **probe confirmed (ms only)**.
30. **P30 · A bottom-tested loop does not parse**: `repeat append "x" to me until true end` → `repeat append "x" to end`, in English and so everywhere (core's side was fixed per PARSER_NEXT_STEPS) · 4459–4460 · 09-26 (PR 7b) · no · parser · **probe confirmed**.
31. **P31 · hi verb-first with English `times` loses its count** (`click पर दोहराएं 3 times …`, a code-switched order; needs a reclaim like increment's amount) · 7085–7088 · 09-30 (PR 127) · no · parser · open, low value.
32. **P32 · Four view-transition deferrals**: tl loses swap's patient on the plain form; qu cannot parse `process` at all; ms mis-binds process's patient to a property-path on the tail form; the ms morph possessive fold eats `ia using` · 7636–7639, 7655–7658 · 08-01 · yes (pinned in `test/view-transition-manner.test.ts`) · parser · not probed.
33. **P33 · A wait's source is read after the run only**, so an SOV loop head that renders its source before the event (ja `… document から pointermove 待つ`) keeps its first reading only · 4557–4558 · 09-26 (PR 8d) · no · parser · not probed.
34. **P34 · A verb-final (SOV) body can still lend the head an `or` leg** (`クリック で keydown または click を 待つ`) · 4496–4497 · 09-26 (PR 8a) · no · parser · not probed.
35. **P35 · Explicit syntax cannot round-trip a spaced expression value** (`condition:x < 10`) · 4444–4446 · 09-25 · no · parser (explicit) · not probed.
36. **P36 · pt `para` / sw `kwa` read a bare for-loop's word as the destination marker**, so the loop's `end` closes its handler early · 4624–4625 · 09-26 (PR 8f) · yes (pinned in `behavior-block-openers.test.ts`) · parser · not probed.
37. **P37 · qu and tr split a trailing number off an identifier**: `behavior Demo15` defines `Demo` · 4626–4627 · 09-26 · no (the test uses letter-only names) · parser (tokenizer) · not probed.
38. **P38 · bn transformer-era verb-first wait keeps only its first event** · 4559–4561 · 09-26 · no · parser · input-only, low.
40. **P40 · de `senden` normalizes to `submit`** (last-wins keyword collision with the send verb). Harmless only because literal matching is value-based · 8104–8106 · 07-12 · no · parser (latent) · open.
41–44. **P41–P44 · pick grammar deferrals**, "still deferred (named, unchanged)" at the end of pick arc 3, with no later line:
    - **P41** `item`/`items` (loop-variable rename collision)
    - **P42** `start` endpoints (the 6-language init/default dual)
    - **P43** `match`/`matches` (needs a match-only role)
    - **P44** the `..` range separator (tokenizes as two `.`)

    All at 1675–1678 · 07-20 · no · parser · not probed. Out of corpus; English `pick items 1 to 3 from arr` renders `… of arr`.
45. **P45 · `set element's x to …` is not read as an element-scoped set**: upstream's spelling for a behavior's state (its own tested idiom, and the one that defaults a parameter so the handlers see it — `set :x` writes a different scope on both engines). en→en keeps it; every other language renders `element` as a noun with an English `'s` (zh `元素's cls`, ru `элемент's cls`) and reads it back as a dropped set or an invalid render; `set element x to …` drops in en too. Found 2026-10-03 rewriting @hyperfixi/behaviors in upstream's idioms: seven of its sources use it (none a corpus row; Sortable, a corpus row, defaults in a handler local instead). Repro: `translate("on click set element's cls to 'a'", 'en', 'zh')` and back · — · 10-03 · no (out of corpus) · parser + render · **probe confirmed**.
49. **P49 · A variable named like an event or a keyword is lost or renamed**: upstream and the engine run each as a variable. English's semantic parse drops `set input to "a"` from a handler (also `keyup`, `change`, `click`; bare, it does not parse), so every language loses it; `put "a" into input then log 1` (and `put 2 into keyup`) is lost in ar/de/fr/id/zh, `toggle .a on input` (or `on change`) in ar/de/fr/he/ja/tr. The verified render never wraps them, since `isEnglishKeyword` counts an event name as vocabulary (yet `(input)` reads right in de/fr/zh), and the value matrix's colliding names are one or two letters. `set when to 1` writes the variable as the keyword (es `establecer cuando a 1`): it reads back renamed in all 23, and runs differently from upstream in 10 (ar bn he hi ja ko ru th uk zh) · 2026-10-05 (found by P47's probes) · no · parser · probe confirmed.
50. **P50 · An event that `send`, `trigger` or `repeat until event` names stays native when the tokenizer has no keyword for it**: es `enviar dobleclic a #x` reads back `send dobleclic to #x`, so the event fires as `dobleclic`; de `mauseintreten`, ko `리사이즈`, zh `鼠标移动` the same. About 55 (language, event) pairs per command, the one-word coinages of es/pt/fr/de/ko/zh plus `unload` in id/sw; the handler head reads them all. Also: `wait for unload from #b` renders no source in es/pt/zh/fr/de/id/sw (`esperar descargar entonces …`), fr `repeat until event change from #b` reads back broken, and bn `send scroll to #x` reads `স্ক্রোল` as the scroll command · 2026-10-05 (P48's probes) · no · parser · probe confirmed.
51. **P51 · The multi-word native event names the renderer does not write are still split**: `eventNameTranslations` lists 18 of them as input forms (ar/de/id/pt/qu/sw/tr), and only a handler head joins one back, when its first word is itself an event: ar `على تمرير الماوس سجل 1` reads `on mouseover`, but with `من #b` after it `on scroll`, and in a wait `wait for scroll`; id `lepas tombol`, pt `pressionar tecla`, de `taste runter` read `on lepas`/`on pressionar`/`on taste`, sw `bonyeza chini` `on click`. The names the renderer writes are one token since P48, which `event-name-translation.test.ts` holds · 2026-10-05 (P48's probes) · no · parser · probe confirmed.

### 2b. Render / naturalness (6)

45. **R1 · Structured object-literal renderer**: brace interiors stay English (es `fetch … con {method: "POST", body: closest <form/>}`). The end state: localize option VALUES, keep KEYS, reverse both on parse. That needs the object literal parsed structurally, a parser-track change · 1217–1224 · 08-27 · yes (`value-lexicon-braces.test.ts` pins the English interior) · render · **probe confirmed** (English interior).
46. **R2 · it/pl/ru/uk `set` puts the marker on the target**: `impostare in @disabled vero`, `ustaw do @disabled prawda`, `установить в …`. They round-trip, so no gate sees it; these four are absent from `setSchema`'s destination/patient markerOverride maps · 886–891 · 08-27 · no · render · **probe + schema confirmed**.
47. **R3 · A naked URL renders quoted, which is a parse error upstream before `in new window`**: `go to /x in new window` → `go "/x" in new window` (upstream reads `"/x" in …` as the `in` operator). The fix is general URL quoting (14 corpus rows use naked URLs) · 4964–4967 · 09-26 (PR 25) · no · render · **probe confirmed**.
48. **R4 · Localizing `in` inside expressions and scopes**: renders keep English `in` · 4694 · 09-26 (PR 11) · no · render · open.
49. **R5 · ja handler head `<event> を で` (two markers)**: not idiomatic, but round-trips. A Phase-2 deferral in `MULTILINGUAL_BEHAVIORS_PLAN.md` and still seen at 298–300 · 06-14 · no · render (native) · **probe confirmed** (`クリック を で .active を 切り替え`).
50. **R6 · `render: 'canonical' | 'parse-only'` pattern flag uncommitted**: four patterns written only to read i18n output later became the render surface (go-qu-url-dest, remove-bn-full, repeat-qu, trigger-zh-ba). Each was fixed ad hoc · 486–489, 346–348, 1172–1174 · 08-27/28 · no · render (design) · open.

### 2c. Vocabulary / owner decisions / native review (7)

51. **V1 · OWNER: the other loop forms keep English words**: `repeat` in `for … in` (23 languages), `until event` (23), `while`/`until` (17), `forever` (15). Counted loops got native words in PR 131; "a separate vocabulary decision" · 7104–7106 (also 5389–5391) · 09-30 · no · vocab/owner · open, not decided.
52. **V2 · NATIVE: ru `3 раз` / uk `3 разів`** want `раза`/`рази` after 2–4. The dictionary has a single form · 7106–7108 · 09-30 · no · vocab/native · open.
53. **V3 · NATIVE: the reactive `when … changes` words in all 24 languages**, plus:
    - the fr `change`, id `berubah`, th `เปลี่ยน` change-event homographs
    - the six dictionary-vs-profile `when` head words (`V1|*|when` waiver: ja/zh/th/tl/ms/vi; zh `何时` is interrogative)
    - SOV prefix-head order

    Tracked in `packages/semantic/NATIVE_REVIEW_NEEDED.md` §"Reactive when … changes" · 1438–1441, 1478–1479 · 08-27 · no · vocab/native · open.
54. **V4 · OWNER: `hx-query` (htmx 4.0.0's sixth verb) has no localized spelling.** Decision first: does core's embedded htmx-compat layer adopt its semantics, or is this vocab-only for the upstream adapter? Absent from `KEYS.hx` in `core/src/htmx/i18n-hooks.ts` · 8621–8647 · 09-03 · no · vocab/owner · open (verified absent).
55. **V5 · Reset/empty words that cannot be fixed**: ar/sw/tl `reset` has no form that round-trips (waived); ja `empty` command has no available dictionary fix (bare `空` phantoms the hot `is empty` rows) · 8279–8288, 8309, 8316 · 07-12 · waived in `vocab-waivers.json` · vocab · open.
56. **V6 · bn `every` (`প্রতি`) is a mis-filed key in the dictionary's `events` category** (not a DOM event) · 8218–8220 · 07-14 · no · vocab hygiene · open (still at `packages/i18n/src/dictionaries/bn.ts:107`).
57. **V7 · de `warte` (the imperative) is no wait word at all** · 7089 · 09-30 · no · vocab · open.

### 2d. Gates / measurement / blind spots still described as true (14)

58. **G1 · Arc D: the `unconsumed-input` → confidence-penalty scoring change** is not done. All preconditions are met (five-step plan). Payoff: re-evaluate whether `parseInternal` Stages 0/0.5 can be deleted. `ConfidenceContext` still has no consumed/total · 4317–4333, 8345–8349 · 07-13 · n/a · gate/parser · open (verified in `confidence-model.ts`).
59. **G2 · The R2 curated subset has no non-click bare event** (e.g. `input-validation`, `on blur`), so the **wrong-event listener class** is invisible to every signal. R3 also excludes plain event names from its invariant whitelist · 8146–8156, 8185–8187 · 07-12 · no · gate · open (verified: `EXECUTION_SUBSET` lacks it).
60. **G3 · R2 cannot see event modifiers** (event-once/debounce/throttle are ineligible under the jsdom harness). Needs PATTERN_SETUP stubs, fake timers and PATTERN_TRIGGER entries ("fold into Arc G") · 8535–8547 · 07-13 · no · gate · open.
61. **G4 · R2's effect signature keys elements by document-order index**, which is fragile for innerHTML-changing patterns (template-literal-interpolation is unusable as a fixture) · 2423–2426 · 07-04 · no · gate · open.
62. **G5 · R2 rows never admitted**: `default-value` (a harness no-op) and the heterogeneous `set`-target forms (`set the *--primary-color of #theme …`, `set previous <input/>.value`, `beep!`/`breakpoint`). Some may be eligible now · 2415–2421, 2355–2357 · 07-04 · no · gate · status unknown, re-measure.
63. **G6 · Confidence is not a ratcheted signal**, so drift goes unseen (e.g. set-color-variable 1.0 → 0.79 in es/it/pl/ru/th/uk; `blur-element` 1 → 0.714) · 4311–4312, 8695–8698 · 07-13 / 09-23 · no · gate · open.
64. **G7 · Foreign renders of markup `_=` bodies are scored only by the corpus writer's `reRenderPreservesContent` guard** ("markup rows are scored by the corpus writer and by nothing else"). The English side is now in the en-reference gate (`<id>#<n>` units) · 457–458 · 08-27 · partial · gate · open.
65. **G8 · Corpus-bound gates are blind to shapes outside the corpus.** Filing after filing says "no corpus row has the shape, so every gate stayed green" (4484, 4615, 4809, 4868–4869, 5325–5326). The value matrix covers VALUE shapes only. Command/structure shapes (tell/end, scroll by, bare if, pseudo heads, loops outside the matrix) have no generated gate, which is why §2a exists · 09-25 → 09-28 · no · gate · open (the main structural gap).
66. **G9 · Bare-render allowlist, 12 pairs** (`baselines/bare-render-fidelity.json`, 3024/3036): announce-screen-reader[hi], fetch-with-headers[ja], go-back[bn,hi] (the destination marker is also the event marker, 4380–4381), morph-with-template[ja], render-template-with-data[ja], repeat-for-each[bn] + stagger-animation[bn] (`এ` event marker, 4426–4430), socket-send[bn,hi], template-literal-list-build[bn,ko] · yes (shrink-only) · gate · open.
67. **G10 · en-reference-preservation keeps 2 allowlisted units** (159/161):
    - async-block (by design)
    - behavior-draggable (benign: `init`'s optional `end` written out; an equivalence needs block depth in the gate's tokenizer)

    · 4651–4656, 4723–4727, 4787–4788 · 09-26 · yes · gate · open (benign).
68. **G11 · Stale pin: the `js(args) … end` 12-language exclusion.** The note says es/id/it/ms/pl/pt/ru/sw/th/tl/uk/vi stop at `(`. **Probe: all 12 now round-trip.** The test only asserts the OK list (`packages/semantic/test/js-block-round-trip.test.ts:141–147`), so nothing noticed the fix. Widen `ARGS_FORM_OK` to 23 · 844–847 · 08-27 · partial · gate · new finding.
69. **G12 · "Consider an absolute fidelity floor"**: averages still carry 0.02 tolerance (per-pattern flips are at 0) · 4157–4158 · 06-17 · no · gate · low, mostly superseded.
70. **G13 · Optional: split V4's vocab tier** (marker words that appear in patterns → warn, profile keywords → error) · 8117–8118 · 07-12 · no · gate · optional.
71. **G14 · Pronoun collisions (accepted limitation)**: 802 of 893 differing read-backs in the extended names oracle are a variable spelled like a value word (tl `ako`, fr `je`, id `aku`, pl `cel`, de `ich`, tr `o`). No spelling tells them apart; rename is the only fix. `findTranslationCollisions` reports them (MCP `translate_code` warns `NAME_COLLISION`) · 7143–7155, 7241–7251, 7296–7298 · 09-29 · yes (diagnostic) · other/limitation · standing.

### 2e. Product / release (7)

72. **PR1 · Community review: the badge arc**: hash-pinned "verified by native speakers" badges, `verifications.json` / `vocab-verifications.json` ledgers, `verified_native*` columns plus the sync join, the text-hash util, an agent sweep/triage harness, changeset fan-out, and a per-language status ladder. "Needs a real inflow of reviewer sign-offs first" · 8602–8608 · 08-01 · n/a · product · deferred.
73. **PR2 · Behavior boundary validator** (MCP/programmatic, rejects component-shaped behaviors). SKIPPED until third-party behavior authoring exists · 3965–3968 · 06-16 · n/a · product · deferred.
74. **PR3 · python-client CI job** (mirror of go-client). Deferred post-release; still absent from `ci.yml` · 8434–8435 · 07-13 · n/a · release/CI · open.
75. **PR4 · Bundle-diet secondary lever**: the main bundle's terser is weaker than hx-v4's (passes:1, no property mangling) · 8491–8493 · 07-14 · n/a · release · open.
76. **PR5 · htmx v4 attribute names**: hyperfixi's SSE/WS compat uses the htmx-2 `sse-connect`/`ws-connect` names, where v4 ships `hx-sse`/`hx-ws` extensions. "Worth reconciling in the htmx-compat layer" · 3986–3988 · 06-17 · no · product · open (no `hx-sse` in core/docs).
77. **PR6 · Arc B: the `derive.ts` dictionary flip**. The dictionaries are "generated/merged from semantic profiles — hand-written entries are preserved" (`generate:language-assets`), not the generated path. The ~4k-entry duplication stays and is held consistent by the V1 vocab gate. Note that 1409–1411 overstates this ("GENERATED from semantic profiles") · 8329–8334 · 07-12 · yes (vocab gate, lexicon-parity) · product/tech-debt · open.
78. ~~**PR7 · The regional `@lokascript/semantic` browser bundles do not work with the lite hyperscript adapter**~~ DONE 2026-10-04 (before C-R3, owner decision 2). Re-measured first: the "No patterns registered" failure no longer reproduced (priority and western translated on `hyperfixi-hs.js` + lite), but two other causes did: every IIFE without English (the 22 single-language ones, east-asian) parsed and then threw on `render(node, 'en')` — 'en' was not registered — and the lite adapter looked up seven fixed global names, so `LokaScriptSemanticJa` and the other single-language globals were never found. Fix: every IIFE registers English (+~2.2 KB gz) and exports `translate`; the lite adapter takes any `LokaScriptSemantic*` global. Gate: `hyperscript-adapter/test/semantic-iife-lite.test.ts` loads each built IIFE with `hyperfixi-hs.js` and the lite adapter in jsdom and runs a handler in each of its languages (fails on the old `browser-ja.ts`, and on all 28 with a no-op adapter). Original entry: `browser-priority.priority.global.js` (and, by construction, the other regional/single-language IIFEs built with `treeShaking: true`) expose no `translate` and report "No patterns registered for language 'es'" — esbuild drops the side-effect `import './languages/<lang>'` registrations the full bundle keeps (`treeShaking: false`). `hyperscript-i18n-lite.global.js`, whose README pairs it with exactly these bundles, then leaves every non-English `_` attribute untranslated. Found 2026-10-03 moving examples/hx-v4-i18n/live-multilang.html onto the engine (it loads the full `browser.global.js` instead). Repro: load `browser-priority.priority.global.js`, call `LokaScriptSemanticPriority.parse('alternar .active', 'es')` · — · 10-03 · no gate (no test loads a regional IIFE) · product/build · **probe confirmed**.

### 2f. Other: core runtime divergences from upstream (12), filed in this file

78. **C1 · Core's show/hide ignore the `with` strategy**: `visibility-base.ts` always toggles `display`, where upstream honours `opacity`/`visibility`. The multilingual text keeps the strategy; the direct path drops its effect · 4676–4678 · 09-26 (PR 10) · no · core runtime.
79. **C2 · Core's `tell` rebinds `me`** (documented divergence; upstream binds only `you`) · 4767–4768 · 09-26 · no · core runtime (documented).
80. **C3 · Core's `swap #a with #t` puts #t's content into #a**; upstream exchanges the two elements · 4879 · 09-26 · no · core runtime.
81. **C4 · Core's `put [1, 2] into #out` writes `1,2`**; upstream writes `12` · 4915 · 09-26 · no · core runtime.
82. **C5 · Core's `go` treats any string that doesn't look like a URL as a scroll target**: `go to "#frag"` and `go to "back"` throw, where upstream sets the hash or navigates · 4968–4970 · 09-26 · no · core runtime.
83. **C6 · Core's `navigate` navigates twice** (`location.assign?.(url) ?? (location.href = url)`, and `assign` returns undefined) · 4971–4972 · 09-26 · no · core runtime.
84. **C7 · Core keeps one position word, and throws on three scroll forms upstream runs**: `go to top left of #d1` scrolls to `top`, and `scroll to top left of #d1` throws. Core also throws on `scroll to #d1 in #box`, `+ 10px` and `- 5 px` · 4973–4975 (PARSER_NEXT_STEPS ~1995–2012 records related scroll divergences as deliberate/filed) · 09-26 · no · core runtime.
85. **C8 · Core's `go` reads a lone horizontal position with a `nearest` block**; upstream keeps `start` · 5009–5010 · 09-26 · no · core runtime.
86. **C9 · Core's `set .it.textContent to "y"` sets the first match only**; upstream sets every one · 5110–5111 · 09-26 · no · core runtime.
87. **C10 · Core's `empty #in1` leaves an input's value**; upstream clears it. `measure` has no oracle yet · 5142–5144 · 09-26 · no · core runtime.
88. **C11 · Core refuses `put (.item in #list).length into #out`** (`put requires arguments`) · 5159–5160 · 09-26 · no · core runtime.
89. **C12 · Core's `put my.tagName` writes `button`**; upstream (and the DOM) writes `BUTTON` · 5070 · 09-26 · no · core runtime.

---

### 2h. Naturalness: what a native reader sees (found by the 2026-09-30 product survey)

No gate measures these; the survey's scripts are the baseline (see the roadmap, M2).

- **N1 · English words in renders**: 769/3542 corpus renders (21.7%) hold an English hyperscript word, from ~a dozen constructions that leak identically in all 23 languages: loop heads (`repeat` in for/while/until/until-event, `forever` ×15, `with index`), event modifiers (`once`, `debounced at`, `throttled at`, `from elsewhere`), `I match`, positional `in`, `the X of Y`, `as T`, `on <target>`, `tell … to`, `go back` (es `ir a back` reads "go to back"), `go to url`, `do not throw`, `def`. Top words: `repeat` 155, `in` 123, `on` 92, `at` 70, `as` 69, `I`/`match` 69. · 2026-09-30 · no gate · naturalness (mostly owner vocabulary decisions; the lexicon is locked to the dictionary).
- **N2 · English event names in 10 languages**: 1912/3496 handler events stay English (he hi it ms pl ru th tl uk vi at 94–98%; sw/qu 88–89%); the retired transformer left 618. `eventNameTranslations` covers 13 languages. The lexicon's own word round-trips in 87–100% of corpus rows for he/hi/it/pl/ru/th/uk/vi; failures are keydown/keyup compounds, pl `załaduj` (read as fetch), ru/uk scroll/blur (denylist them). ms and tl lexicons hold English words themselves. · 2026-09-30 · no gate · naturalness (no decision needed for the 8).
- **N3 · `me` after a preposition is nominative in 13 languages** (80–92% of such renders): es `a yo`, pt `a eu`, it `a io`, de `zu ich`, pl `do ja`, ru `к я`, uk `до я`, tr `ben e`, ar `إلى أنا`, he `אל אני`, tl `sa ako`, hi `मैं में`, bn `আমি তে`. fr/ja/zh/id/ms/vi are fine. Needs an oblique form per marker (probably me/it/you) and a reader that takes both. · 2026-09-30 · no gate · naturalness (design + vocabulary).
- **N4 · Handler heads with two markers**: ja `クリック を で` (the transformer wrote `クリック で`; ko was moved to `클릭 할 때` for this), tr `tıklama i üzerinde` (transformer: `tıklama da`). Also R5. · no gate · naturalness.
- **N5 · Suffixes written as separate words** in tr (`ben e`, `.active i`), ko (`나 에`), bn (`আমি তে`): reads as broken in agglutinative languages. · no gate · naturalness (design question).
- **N6 · Article and marker slips**: es `al carga`/`al entrada`; he `חכה את 1s` (accusative on a duration); zh `等待 把 1s`. · no gate · naturalness.
- **N7 · he lexicon gaps** (`closest first next previous empty exists is or of at`), bn/hi `after`/`before`, qu `trigger`/`until`/`event`, th `unless`, tr `render`, bn/he/th `matches`, bn/he/th/vi `document`/`window`. · no gate · vocabulary.
- **N8 · Count-word grammar** (= V2), and a native reviewer for the count words tr `kez`/`kere`/`defa`, ja `回`/`度`, ko `번`/`회`.

### 2j. Core-only syntax the new engine drops (filed 2026-10-01)

`packages/engine` replaces core's engine and keeps two core forms (`new X()`, `toggle <element>`); the
rest are dropped. The rule (roadmap, decision 2): the reader keeps accepting a dropped form, the
renderer writes upstream's spelling. `tell X to cmd` and `with index` are done. **Since Phase C2c
(2026-10-03) English writes upstream's spelling for D1, D3, D4 and most of D5** — and for `X has .c`,
`fetch "X" do not throw` and a string `go` destination, which the direct-path-shapes gate found —
via a node rewrite before every English render (`semantic/src/explicit/upstream-spelling.ts`; each
spelling measured equal to core's original on upstream and the engine). Foreign renders keep their
words; the adapter's English is what changed. Still read and written AS WRITTEN:

- ~~**D1 · `set @a to v on X`**~~ DONE C2c: English writes `set @a of X to v`. (the `scope` role): renders `set @a to "v" on X` in English and leaves `on` English in every language. Upstream's `set @a of X to v` writes every matched element; core's writes only the FIRST, so an `of` render is right for the adapter path and wrong on core's direct path for a collection (`add [@a='v'] to X` is right on both: the tabs-aria row uses it) · 10-01 · no · render · **probe confirmed**.
- **D2 · Prefix `unless <condition> <command>`**: a flat `unless` command in the chain, so the block's extent is not in the node; upstream's `unless` is a suffix on one command. Needs the fold `if` has (`tryParseConditionalBlock`) before it can be written as `if not (…) … end`. **Measured 2026-10-03 (C2c), core vs upstream/engine, condition true:** `unless C A then B` guards A and B (= `if not (C) A then B end`); `unless C A end then B` guards A only (= `if not (C) A end then B`); `unless C A B` (no `then`) guards A only on core — upstream's block guards both, so that shape has no faithful spelling. semantic reads the first two to the SAME flat node (`unless C then A then B`), so the fold must keep the `end`. No corpus row uses prefix `unless` since 10-01; left for its own PR · 10-01 · no · parser/render · **probe confirmed**.
- ~~**D3 · `my?.a?.b`**~~ DONE C2c: English writes `my a.b`.: renders `my ?.a?.b`. A property chain is null-safe on both engines, so the render can drop the `?` · 10-01 · no · render · **probe confirmed**.
- ~~**D4 · A bare URL with a spaced `${…}`**~~ DONE C2c: English writes a backtick template and `the value of previous <input/>`. (`fetch /search?q=${my value}`) and **`previous <input/>.value`**: both render as written; upstream wants a backtick string and `the value of previous <input/>` · 10-01 · no · render · **probe confirmed**.
- **D5 · Commands semantic has a schema for and the engine has no keyword for** — PARTLY DONE C2c: English writes `call history.pushState/replaceState(null,'',X)`, `call navigator.clipboard.writeText(text)`, `put X at start of Y`, and the `swap` strategies as `put … into/before/after/at start of/at end of`, `put … into X's outerHTML`, `remove X`; `clone`, `process` and `copy <element>` are still written as read (no measured equivalent): `push`, `replace` (DECIDED 2026-10-03: dropped, no engine addition; the two pages write `call history.pushState(null, '', X)` / `replaceState`, which is what the renderer should write for a `push`/`replace` node — no corpus row has one), `copy`, `prepend`, `process`, `clone`, and core's `swap` strategies (`swap innerHTML of X with Y` reads on upstream as an exchange of two values). A translation that uses one renders English no engine but core runs · 10-01 · no · schema/owner · measured (`packages/engine/README.md`).

### 2i. User-facing docs and surfaces (found by the 2026-09-30 product survey)

- **D1 · A README quickstart is a dead button**: `packages/hyperscript-adapter/README.md:25` (`on click .active を me で 切り替え`) preprocesses to `on click on me toggle .active`, which upstream 0.9.93 parses cleanly as an empty click handler plus a handler for an event named `me`; the host-validity gate accepts it. Same class as PARSER_NEXT_STEPS L61 (`install X on me`). A cheap guard: reject a translation that yields a handler for an event named `me`/`it`/`you`.
- **D2 · lokascript.org pins 2.10.0** (source `~/projects/_hyper_min/sites/lokascript-docs`, outside this repo); its homepage pairs semantic with `hybrid-complete`, which never reads the semantic global, so it translates but cannot run non-English code. Shows hand-written code-switched examples (`on click alternar .active`), not renderer output.
- **D3 · The i18n README says "use this package to translate"** (backwards since #1001), lists 13 languages, documents a nonexistent `/lsp` export and `lokascript-translate` CLI; the package still exports `HyperscriptTranslator`/`defaultTranslator` (keyword substitution) and ships esbuild/vite/happy-dom as runtime deps.
- **D4 · Stale sizes and counts everywhere**: semantic README ("23 languages", lists 22; sizes 3–13× low), BROWSER_BUNDLES semantic sizes ~35% low and a `LokaScriptI18n.translate` snippet, vite-plugin "62–203 KB" and `grammar` = "grammar transformation", adapter/multilingual READMEs' sizes, "21"/"23"/"13" languages in 10+ places, core README's `@lokascript/core` name, `semantic` exporting `VERSION = '0.1.0'`.
- **D5 · Five `examples/multilingual/` pages pin `@lokascript/i18n@2.3.0`** and call the retired translate helpers; `error-playground.html` pins semantic@2.3.0; `showcase`/`semantic-demo` say 13 languages.
- **D6 · `apps/docs-site/`** (VitePress, never deployed) is two majors stale (`@lokascript/core`, `GrammarTransformer`, local absolute aliases, a tracked Vitest report).
- **D7 · No multilingual quick start, package chooser or limitations statement**: five-plus entry points (`hyperfixi.js`, `hyperfixi-multilingual.js` + semantic, core `MultilingualHyperscript`, the adapter and its `@hyperscript-tools/multilingual` copy, build-time `@hyperscript-tools/i18n`, the htmx-adapter).
- **S1 · VS Code extensions are not published** (Marketplace and Open VSX: not found; no workflow). Owner: publish or drop from the product story. **Partly decided 2026-10-04:** the standalone `_hyperscript` extension (`vscode-extension-hyperscript`) is retired, since upstream ships its own; the LokaScript extension's fate is still open.
- **S2 · MCP `translate_hyperscript`** is described as "pattern substitution" but calls the same `semantic.translate` as `translate_code`.
- **S3 · `@lokascript/compilation-service` has no README.**
- **S4 · Weight is ungated**: a single-language page costs ~82 KiB gz (adapter) or ~93 + ~96 KiB gz (`hyperfixi-multilingual.js` + semantic es) against 22 KB for English `hyperfixi-hx.js`; CI ceilings cover only core's bundles.
- **S5 · Semantic-built nodes carry no nested source positions**, so LSP hover/diagnostic ranges are blind to arguments in non-English code (PARSER_NEXT_STEPS L67/L68/L932).
- **S8 · vite-plugin `region: 'slavic'` and `'south-asian'` import nothing**: both are in the type, but `getLanguagesForBundleType` (`packages/vite-plugin/src/semantic-integration.ts`) has no case for them, so only English and explicitly listed languages load (found 2026-09-30; the README documents only the four regions that work). Its debug `SEMANTIC_BUNDLE_SIZES` (Jan 2025, 14–61 KB) is stale too.
- **S6 · `swap`'s strategy forms** (`swap into #t with it`, `swap innerHTML of #t with "X"`) never bind content on the semantic path; English lacks the pattern (COMMAND_ARCH L706). **S7 · `async <cmd>`**: semantic strips `async` in all 24 (PARSER L2665).

