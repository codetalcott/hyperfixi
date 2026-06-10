# Multilingual Parse-Rate Roadmap

> Living plan for bringing all 24 languages to ~100% semantic parse rate.
> **Supersedes the analysis in issue #259** (whose 278-instance / 3-bucket
> breakdown predates the 8 PRs below and no longer matches the baseline).
> Source of truth for "what's left" is the regenerated baseline, not #259.

_Last updated: Track 5 **`is empty` predicate vocabulary — de/sw (block-body Phase 1a)** — the first increment of the B1 condition campaign, and a **revision of the plan**: the measure-first probe showed the original "transformer-first" hypothesis was wrong. `if my value is empty …` parses fully in **Spanish only** (`si mi valor está vacío …` → `{add,empty,if,on}`) because `spanish.ts` is the **only** profile carrying the **predicate vocabulary** (`is`, `empty` as the adjective, `exists`). Every other profile has `empty` only as the command and no `is` keyword, so the predicate never forms — and a hand-cleaned correctly-ordered translated predicate **still** doesn't parse, proving it's a **profile-vocabulary** gap, not a transformer one. Fix: mirror the Spanish predicate vocabulary into the profiles where the translated predicate is **adjacent** — de (`ist leer`) and sw (`ni tupu`): add `is` + the empty adjective as an `empty`-keyword alternative. **Degenerate total 79 → 77 (−2)** (de/sw `if-empty` 0.40 → 0.60, degenerate → faithful), `--regression` gate green, **0 regressions** (baseline diff = 2 removals, 0 additions, no parse-rate drops; the common Swahili copula `ni` only matches in predicate position). Deferred within B1: **he** (transformer leaves `value is empty` in English) and **ja/ko** (SOV reorder splits `is`…`empty`) — the next 1b/1c increments, scoped in [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md) §3. Locked by `multilingual-roadmap-fixes.test.ts` ("`is empty` predicate keywords")._

_Earlier: Track 5 **`eventsource` / `worker` profile entries (block-body Phase 0b)** — `eventsource-basic` and `worker-basic` parsed degenerate in **hi and tl** (4 instances). Different mechanism from socket (Phase 0): unlike a missing i18n DICT entry, hi/tl semantic **profiles** had **no `eventsource`/`worker` entry at all** (the other 22 languages carry an English-literal primary that matches the transformer's English emission, since no language has an i18n dict entry for these streaming commands), so the generated pattern didn't exist and the command dropped. Fix (semantic-side): add the profile entries for hi/tl (English primary — the transformer emits the English literal — native transliteration as alternative for hi). **Degenerate total 83 → 79 (−4), `--regression` gate green, 0 regressions** (baseline diff = 4 removals, 0 additions, no parse-rate drops); all 4 reach fid 1.0 (EN reference is just `{eventsource}`/`{worker}`). The third newer-feature item, `install-behavior` (hi/ru/uk, 3 instances), was probed and **deferred** — not a clean keyword gap but a lexical `set`/`install` collision (ru/uk: `установить`/`встановити` mean both, and the dict→compound `установить*пакет`realign still resolves to`set`because the underscore-compound isn't tokenized as a unit) plus an SOV`install`pattern gap (hi). Scoped in [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md) §2c. Locked by`multilingual-roadmap-fixes.test.ts` ("eventsource / worker profile entries")._

_Earlier: Track 5 **`socket` command keyword alignment (Phase 0 of the block-body cluster)** — `socket-basic` (`socket ChatSocket ws://localhost:8080 on message put it into #chat end`) parsed degenerate in **9 languages** (ar,bn,hi,ja,ko,pt,qu,sw,tr). Root cause: `socket` (a newer streaming command) had **no entry in the i18n `commands` dictionaries** — only `en` — so the transformer emitted the English literal, which these 9 don't recognize because their semantic profile uses a **native** socket primary (`ソケット`, `소켓`, `soquete`, …). fr/de/es/tl were unaffected (their profile primary already *is* `socket`). Fix: add `socket` = the profile native primary to the 9 `commands` dicts, plus `socket`/`eventsource`/`worker` to the `derive.ts` `COMMAND_KEYWORDS` allowlist (they postdated it, so a regen would re-drop them). **Degenerate total 92 → 83 (−9), `--regression` gate green, 0 regressions** (baseline diff = 9 removals, 0 additions, no parse-rate drops); all 9 reach fid 1.0 (the EN reference for this pattern is just `{socket}`). This is the same keyword-gap family as `focus`; it is **Phase 0** of the block-body decomposition in [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md), which reframes the cluster (46 behaviors / ~24 newer-feature gaps / ~13 true control-flow bodies) and lays out the remaining phases (eventsource/worker profile gaps; the B1 `is empty`/`I match` condition campaign). Locked by `multilingual-roadmap-fixes.test.ts` ("socket command keyword alignment")._

_Earlier: Track 5 **`focus` command keyword alignment (de/fr/pl/pt/sw)** — the shared root cause behind the `first-in-parent` degenerate cluster. `on click focus first <input/> in closest <form/>` parsed degenerate `{on}` (fid 0.33) in all 5. Root cause: the i18n **`commands` dictionaries were missing a `focus` entry**, so the transformer fell back to the event-noun form (de `fokus`, fr `focus`, pt `foco`, sw `zingatia`, pl `fokus`) — which the semantic command parser does not recognize (the profile primaries are verbs: `fokussieren` / `focaliser` / `focar` / `lenga` / `skup`). The whole `focus …` body dropped. Spanish was unaffected only because its event-focus word (`enfocar`) coincidentally equals its profile primary; `focus-element` (`on click focus #input`, 2-action EN reference) hid the same drop under the 0.50 fidelity floor. Fix: add `focus` = the profile-primary verb to each of the 5 `commands` dicts, so the transformer emits a word the parser parses. **Degenerate total 97 → 92 (−5), `--regression` gate green, 0 regressions** (the baseline degenerate diff is 5 removals + 0 additions); `first-in-parent` degenerate→faithful (0.33 → 0.67) in all 5, focus un-masked in `focus-element`, avgFidelity ↑ de 0.911→0.917 / fr 0.888→0.893 / pl 0.896→0.901 / pt 0.873→0.879 / sw 0.909→0.914; baseline regenerated. The paired probe target **`if-empty` is a DIFFERENT root cause** — not a keyword gap (its `on/if/add/put` verbs are all present in the dicts) but the documented hard block-body cluster (`put`+positional-destination drop after a non-`into` marker, the `is empty` predicate, SOV `on blur` collapse in ja/ko) — left tracked, not force-unified. Locked by `multilingual-roadmap-fixes.test.ts` ("focus command keyword alignment")._

_Earlier: Track 5 **VSO (ar/tl) mid-stream event after a plain leading command** — a single language-agnostic-but-VSO-gated parser fix clearing a whole cluster. Verb-initial languages front the verb, so the i18n transformer renders an `on click` handler as `<command> … on click then <body>` — the event clause sits **mid-stream after the first command**, e.g. ar `احذف .active من .tab عند نقر ثم أضف …` / tl `alisin .active mula sa .tab kapag click pagkatapos …` (= `remove .active from .tab on click then add …`). The parser matched the leading command as a bare standalone and dropped the event + then-chain body (only `{remove}`). The existing `tryMidStreamEventExtraction` (already used for the VSO **loop** path) now also fires on a **plain leading command**, gated to `wordOrder === 'VSO'` (ar, tl) — in event-first SVO/SOV languages a plain command is never an event-mid-stream form, and running the extractor there mis-fires on incidental `on`+event token pairs (an un-gated first cut regressed ja/bn/he/de). Cleared the ar/tl cluster: `accordion-exclusive`, `tabs-basic`, `tabs-content`, `copy-to-clipboard`, `form-submit-prevent`, `halt-propagation`, `take-class-from-siblings`, + ar/tl from `modal-close-escape`. **Degenerate total 112 → 97 (−15), 0 regressions, no over-generation** (the with/without diff is all deletions); ar/tl avgFidelity 0.888 → 0.934 / 0.896 → 0.937; baseline regenerated. Locked by `multilingual-roadmap-fixes.test.ts` ("VSO (ar/tl) mid-stream event after a plain leading command")._

_Earlier: Track 5 **`ms` (Malay) grammar profile** — ms had no i18n grammar profile (`Unknown target locale: ms`), so its baseline 100% parse rate was an English-fallback artifact. Added `malayProfile` (mirrors Indonesian, but the event head is `apabila` not `pada`) + handcrafted ms `set`/`fetch`; real ms 37% → 97% (149/154), 0 degenerate; baseline regenerated. See [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md)._

_Earlier: Track 5 **zh `fetch`-in-event-block (#3) + `set`/`put` BA-split realign** — the last zh block-body residue. `on click fetch /api/data then put it into #result` → `当 点击 时 抓取 把 /api/data 那么 把 它 放置 到 #result` parsed degenerate `{on}` (fid 0.33). Four pattern/dict-side pieces (the transformer role model stays untouched — re-marking `fetch`'s marker-bearing `source` primary over-generates a phantom `on` in marker-less languages, see #1): (1) **dict realign** `dictionaries/zh.ts` `fetch: '获取'→'抓取'` (the semantic zh profile reads `获取` as `get`); (2) a **`fetch-zh-ba`** pattern (`packages/semantic/src/patterns/fetch.ts`) tolerating the transformer's BA marker (`把`, optional) on the `source` URL, mirroring `wait-zh-ba`; (3) its optional `的 {responseType}` group for the `as json` form; (4) a **`put-zh-ba` realign** — the trailing put (`把 X 放置 到 Y`, verb 放置 + separate 到 marker) was dropping because the pattern expected the merged verb `放到`; now the marker is an optional group so both forms match. A follow-on **#2-sweep `set-zh-ba` realign** (same BA-split shape, `把 X 设置 到 Y`) recovered the two `set`s in `template-literal-list-build`, clearing zh's last degenerate pass. **`{on}` 0.33 → `{on,fetch,put}` 1.0; zh degenerate passes → 0; degenerate total 132 → 124, `--regression` gate green, 0 regressions, zh parse rate ↑.** The one residue left in `template-literal-list-build` (the `for item in $items … end` loop) is structural and cross-language (he/ms/qu/sw/vi too — zh `for`-loops don't parse at all), tracked in the block-body arc. Locked by `multilingual-roadmap-fixes.test.ts` ("zh fetch in event block"). Scoped in [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md)._

_Earlier: Track 5 **zh transformer role model — literal/measure primary marking (#1)** — the architectural root cause behind the `wait` BA-marking slice. The transformer's generic argument parser defaulted a command's leading argument to the `patient` role, so a duration/measure primary got a spurious object marker (`等待 把 1s` zh, `1s を 待つ` ja, `1s 를 대기` ko). A new `applyPrimaryRole` step (i18n `transformer.ts`) now re-assigns that value to the command's true primary role when the role is a literal/measure role (`duration`/`quantity`) **and** the target has no marker for it — so it only ever removes a spurious marker. Scoped to **command statements** (not event handlers — Korean's marker-less event head relies on the leading object marker as the handler cue) and to **markerless literal primaries** (marker-bearing primaries like `fetch`→source / `send`→event are untouched; re-marking event primaries in Korean over-generated a phantom `on`). Primary-role data is a local `COMMAND_PRIMARY_ROLES` map (i18n `constants.ts`) kept in sync with the semantic schemas by `command-primary-roles.test.ts`. **`wait` now emits grammatical `等待 1s`/`待つ 1s`/`대기 1s`**; `--regression` gate green (3679/3696, degenerate 132, **0 regressions**), avgFidelity **he ↑ / hi ↑**, all others neutral. The `wait-zh-ba` pattern is retained as an inert defensive fallback. Locked by the i18n grammar suite ("Duration / literal-primary marking") + `command-primary-roles.test.ts`. The remaining zh `fetch`-in-event-block (#3) was re-probed and is **not** unblocked — a distinct keyword (`获取`→`抓取`) + source-marking + block-body track. Scoped in [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md)._
_Earlier: Track 5 **zh `那么` then-connective recognition** — a consistency fix. The i18n package deliberately treats `那么` as `then` (transformer emits it; `parser-integration.test.ts` asserts `zhKeywords.resolve('那么') === 'then'`), but the semantic zh profile listed only `然后`/`接着`, so `isThenKeyword('那么','zh')` was false. Added `那么` to the profile's `then.alternatives` so the two packages agree. Investigation showed this was a **latent consistency gap, not an observable parse bug** — `parseClause`'s matchBest loop and the event-body re-parse already recovered commands around an unrecognized `那么` (the "split on the wrong keyword" framing was overstated; standalone single-command-only behavior is a general limitation, English included). **Zero behavioral change** (full `browser-priority` regen identical: 3679/3696, degenerate 132, no regression; if/then-consequence parsing unaffected). Locked by `multilingual-roadmap-fixes.test.ts` ("zh then-connective 那么 recognized"). The remaining zh work — the transformer `把` role-model (#1) and `fetch`-in-event-block (#3) — stays scoped in [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md)._
_Earlier: Track 5 **zh `wait` BA-marked duration** — the last zh `repeat-*` residue. The i18n transformer emits `等待 把 1s` for `wait 1s`: its generic argument parser defaults the first argument to the `patient` role, and zh marks `patient` with the BA particle `把`. The generated `等待 {duration}` pattern has no `把`, so the marked form didn't parse and the trailing `wait` dropped (zh `repeat-forever` body `… 那么 等待 把 1s 结束`). A handcrafted `wait-zh-ba` pattern (`packages/semantic/src/patterns/wait.ts`) now tolerates the optional `把`, mirroring `toggle-zh-ba`. **zh `repeat-forever` 0.67 → 1.0** (full `{on,repeat,toggle,wait}` body); avgFidelity zh 0.794 → 0.808; parse rate unchanged (3679/3696), 0 regressions. (Earlier notes called this a "zh SVO pattern gap / `等待 1s`" — that was a probe artifact; bare `等待 1s` always parsed, the `把` was the real blocker.) The deeper root cause — the transformer marking a duration as a fronted patient — plus the `那么`/`然后` then-keyword mismatch are scoped in [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md). Locked by `multilingual-roadmap-fixes.test.ts` ("zh wait BA-marked duration")._
_Earlier: Track 5 **qu/sw `increment` keyword alignment** — the i18n dictionaries collapsed `add` and `increment` onto one word (qu `yapay`, sw `ongeza`), so the transformer emitted the add-word for increment and the parser read it as `add` (capping qu/sw `repeat-while` at 0.75). The dicts now emit the profile's distinct increment primary (qu `yapachiy`, sw `ongezeko`); qu additionally needed a handcrafted SOV pattern (`{patient} ta yapachiy`) mirroring `add-qu-sov`, since the generated SOV pattern didn't anchor the verb-final order. **qu/sw `repeat-while` 0.75 → 1.0**, avgFidelity qu 0.796→0.809, sw 0.843→0.856, parse rate unchanged (3679/3696), 0 regressions (zero faithful→degenerate flips). Locked by `multilingual-roadmap-fixes.test.ts` ("qu/sw increment keyword alignment")._
_Earlier: Track 5 **Non-SOV `repeat-*` loop-body + tail residue** — two parser-side fixes closed the structural remainder scoped in [NON_SOV_REPEAT_SCOPE.md](NON_SOV_REPEAT_SCOPE.md). (1) The **`end`-mid-stream tail merge** (`parseBodyWithClauses`): the verb-final SOV reorder strands a trailing command's argument before `end` and its verb after (`… 200ms 終わり を 待つ`), so the `end`-break dropped the trailing `wait`; `end` now tolerates a single trailing clause (collect to the next then/end boundary, merge with the stranded pre-`end` argument). (2) The **`for`-binding `repeat`-keyword recovery** (`parseClause`): the transformer drops the `for` binder (`repeat for x in y` → `repeat x in y`) so the bare `repeat` has no matchable variant; when matchBest fails on a `repeat`-normalized token the clause now emits the `repeat` action directly. **Degenerate passes 135 → 132 (−3), parse rate 3678 → 3679 (+1 he), 0 regressions** (gate green; zero faithful→degenerate flips). Cleared the last degenerate `repeat-*` (zh `repeat-forever`, deg→0.67 faithful) + sw `repeat-until-event` + bonus `focus-trap` (sw/tr); for-each ar/tl/zh 0.67→1.0; while ja/ko/tr 0.75→1.0, qu 0.50→0.75; sw while 0.50→0.75. Deferred residue (separate keyword tracks): zh `wait` SVO pattern gap (`等待 1s`), qu/sw `add`-vs-`increment` overlap. See [NON_SOV_REPEAT_SCOPE.md](NON_SOV_REPEAT_SCOPE.md)._
_Earlier: Track 5 **VSO/Austronesian `repeat-*` mid-stream event reorder** — the non-SOV sibling of the SOV repeat-\* fix. For VSO/Austronesian the i18n transformer surfaces the loop keyword first and places the event clause mid-stream, marked by an `on`-marker (`كرر عند نقر …` / `ulitin kapag click …` = `repeat on click …`). The trailing-event extractor (Stage 1.5) can't see it (the event isn't last), so the bare loop keyword won Stage 2 and the event + body dropped (degenerate). `tryMidStreamEventExtraction` strips the `<on-marker> <event>` pair and re-parses the rest as the loop body; the block/loop gate now tries it after SOV extraction. **Degenerate passes 141 → 135 (−6), 0 regressions, parse rate unchanged** (3678/3696). Cleared `repeat-for-each`/`repeat-while` (ar+tl) + bonus `focus-trap`/`window-keydown` (ar — same mid-stream-event shape). avgFidelity ar 0.866→0.883, tl 0.884→0.894. Remaining repeat residue (zh circumfix block-body, the `for`-binding `repeat`-keyword drop, the `wait`-after-`end` tail) scoped in [NON_SOV_REPEAT_SCOPE.md](NON_SOV_REPEAT_SCOPE.md)._
_Earlier: Track 5 **SOV `repeat-*` loop-body reorder** — for SOV languages the i18n transformer surfaces a block loop's keyword (반복/পুনরাবৃত্তি/kutipay) — or a leading `while`/`for` clause — ahead of its body, so the parser matched the bare loop keyword as a standalone command (Stage 2) and dropped the event + variant + body (degenerate). Korean (no event-marker particle) was hit hardest. The Stage-2 gate now prefers SOV event extraction (Stage 3) when the matched action is a block/loop action, recovering the event + loop body; and the qu `repeat` dict keyword was realigned (`kutichiy`→`kutipay`; `kutichiy` is the profile's `return` primary). **Degenerate passes 148 → 141 (−7), 0 regressions, parse rate unchanged** (3678/3696). Cleared `repeat-forever`/`repeat-while`/`repeat-for-each` for ko (+ `stagger-animation` bonus), `repeat-while` for bn, `repeat-while`/`repeat-for-each` for qu. avgFidelity ko 0.889→0.903, bn 0.952→0.956, qu 0.782→0.794. See [SOV_REPEAT_SCOPE.md](SOV_REPEAT_SCOPE.md)._
_Earlier: Track 5 **juxtaposed multi-command event bodies** — a fused event pattern captured only the FIRST body command as the action; a then-chain/block continued, but a **juxtaposed** body (`halt the event call validateForm() if … end` — no `then` between commands) was dropped. `buildEventHandler` now re-parses any trailing non-`end` tokens as body commands (additive; `parseBodyWithGrammarPatterns` only appends matched commands). **Degenerate passes 179 → 159 (−20), 0 regressions, parse rate unchanged** (3679/3696). Cleared `form-submit-prevent` (de/it/ru/sw/th/uk/vi), `fetch-loading-state` (bn/hi/it/ja/tr), plus `fetch-error-handling`/`fetch-with-headers` (ja), `render-template-with-data` (qu/tl/vi), `repeat-forever`/`stagger-animation` (qu), `window-scroll` (th)._
_Earlier: Track 5 **then/end keyword recognition for 9 profile-only languages** (it, ru, th, vi, he, hi, ms, pl, uk). `isThenKeyword`/`isEndKeyword` were hardcoded maps covering only 15 langs; the other 9 fell back to the English literal, so their native then/end (`allora`, `затем`, …) weren't recognized — multi-command then-chains collapsed to the first command and `end`-blocks didn't close. Both now fall back to the profile's form. **Parse rate +7** (he/it/pl behaviors now parse — `end` recognized; he/it/pl jump toward 100%), **+4 fidelity** (`fetch-loading-state` ru/th/vi/uk degenerate→faithful), **0 regressions** (gate green). Degenerate nets 176 → 179 (−4 fetch-loading-state, +7 newly-parsing Bucket B behaviors)._
_Earlier: Track 5 **Async Tier 1 — `async` modifier transparency** (degenerate **181 → 176**, −5: `async-block` ar/de/it/th/tl)._
_Earlier: after Track 5 **Tier 1 — if/else block-body in event handlers** (degenerate passes **219 → 181**, −38 degenerate→faithful, 0 fidelity regressions). Cleared `if-exists` entirely (ar+it flipped, the named Tier 1 target) and lifted `if-empty`/`input-validation`/`unless-condition` across 13 languages. Before that: German `fetch` keyword alignment, caret-scope masking, @attr-in-selector-role, trailing-event block-wrap, custom-event SOV, property-path patient, (parse-rate) Tier 1, Track 4, Track 1 (reactive) complete._

---

## Current state

Baseline: `packages/testing-framework/baselines/multilingual-priority.json`
(generated with `--bundle browser-priority`). Cross-language average **99.05%**
(up from 97.5% before Phase 1; Phases 1–4 + Track 4 + qu `install` + passthrough
batch + Tier 1 + property-path patient + custom-event SOV + trailing-event
block-wrap + @attr-in-selector-role + caret-scope masking + event-block from-source:
+69 instances). **24 failing pattern-instances remain — all of them Bucket B
behaviors. Every non-behavior pattern now parses in all 24 priority languages.**

| Rate | Languages                                          |
| ---- | -------------------------------------------------- |
| 100% | en, bn, hi, ja, ko, ms, qu, ru, th, tl, tr, uk, vi |
| 99%  | de/es/fr/id/pt (99.4), ar (99.4), sw (98.7)        |
| 97%  | it/pl/zh (97.4), he (97.4)                         |

The sub-100% languages now fail **only** Bucket B behaviors (below); their
non-behavior parse rate is 100%.

**0 non-behavior failing pattern-instances remain** (plus 24 Bucket B behaviors):

| Track                         | Instances | Nature                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------- |
| **Bucket B — behaviors**      | 24        | Draggable/Sortable/Resizable/Removable defs don't parse (CI `continue-on-error`) |
| **Deep per-language grammar** | 0         | — cleared —                                                                      |

The remaining 24 are all `behavior-removable` (11: ar,de,es,fr,he,id,it,pl,pt,sw,zh),
`behavior-sortable` (5: he,it,pl,sw,zh), `behavior-draggable` (4: he,it,pl,zh),
`behavior-resizable` (4: he,it,pl,zh) — a **runtime** track (unimplemented
behaviors), not a parsing/i18n track. See Track 2.

> **Custom-event SOV cleared `on-custom-event-receive` (ko+qu) and, as a side
> effect, `window-resize` (qu+tr).** The SOV event extractor now accepts a bare
> (non-keyword) identifier in the event slot, gated by the event-marker particle
> (ja/tr/qu/bn) or an immediately-following command verb (ko). The qu/tr resize
> words (`hatun_kay` / `boyut_değiştir`) are real events absent from the native
> event dictionary, so they fell out for free. **+4 instances, 0 regressions**
> (full `browser-priority` regen). See Shipped → "Custom-event SOV slot".

> **The clean tokenizer token-split vein is now largely worked out** (Phases 1 & 4
> cleared `@`/`*`/`^`; Tier 1 the tag-less `<.class/>` selector). Every remaining
> non-behavior failure needs per-pattern transformer/parser/grammar work (see
> "Why the rest is hard"). There is no longer a uniform fix that clears a whole
> cluster.

---

## Shipped

### Track 5 — `is empty` predicate vocabulary, de/sw (block-body Phase 1a, −2)

- **de/sw `if-empty` 0.40 → 0.60 (degenerate → faithful)**; **degenerate total 79 → 77
  (−2)**; `--regression` gate green, **0 regressions** (baseline diff = 2 removals, 0
  additions, no parse-rate drops); baseline regenerated.
- **Root cause (B1, plan-revising).** `if my value is empty …` parses fully in
  **Spanish only** — `spanish.ts` is the **only** profile carrying the predicate
  vocabulary (`is: 'es'`, `empty: 'vacío'` as the _adjective_, `exists`). Every other
  profile has `empty` only as the **command** ("empty the element") and no `is`
  keyword, so the predicate never forms and the `if` wrapper is lost (the body still
  recovers via event-extraction — why most languages stay faithful and only
  de/he/ja/ko/sw fall below 0.50). A hand-cleaned, correctly-ordered translated
  predicate **still** doesn't parse without these keywords, proving the original
  "transformer-first" Phase 1 hypothesis wrong: this is a **profile-vocabulary** fix.
- **Fix.** Mirror the Spanish predicate vocabulary into the profiles where the
  translated predicate is **adjacent** — de (`ist leer`) and sw (`ni tupu`): add `is`
  and the empty **adjective** as an alternative of the `empty` keyword. The Swahili
  copula `ni` is common but only matches in predicate position (no regressions). Locked
  by `multilingual-roadmap-fixes.test.ts` ("`is empty` predicate keywords").
- **Deferred within B1:** **he** (transformer leaves `value is empty` in English) and
  **ja/ko** (SOV reorder splits `is`…`empty`) — the next 1b/1c increments. See
  [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md) §3.

### Track 5 — `eventsource` / `worker` profile entries (block-body Phase 0b, −4)

- **`eventsource-basic` + `worker-basic` degenerate → faithful (fid 1.0) in hi and tl**
  (4 instances); **degenerate total 83 → 79 (−4)**; `--regression` gate green, **0
  regressions** (baseline diff = 4 removals, 0 additions, no parse-rate drops); baseline
  regenerated.
- **Root cause.** Different from socket (Phase 0, a missing i18n _dict_ entry): hi/tl
  semantic **profiles** (`packages/semantic/src/generators/profiles/{hindi,tl}.ts`) had
  **no `eventsource`/`worker` entry**. No language has an i18n dict entry for these
  streaming commands, so the transformer emits the English literal; the other 22
  languages parse it via an English-literal profile primary, but hi/tl had nothing to
  match, so the command dropped.
- **Fix.** Add the profile entries for hi/tl (English primary, native transliteration as
  alternative for hi). Locked by `multilingual-roadmap-fixes.test.ts`
  ("eventsource / worker profile entries").
- **Deferred:** `install-behavior` (hi/ru/uk, 3 instances) — a lexical `set`/`install`
  collision (ru/uk) + an SOV `install` pattern gap (hi), not a clean keyword fix. See
  [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md) §2c.

### Track 5 — `socket` command keyword alignment (Phase 0 of the block-body cluster, −9)

- **`socket-basic` degenerate → faithful (fid 1.0) in 9 languages** (ar,bn,hi,ja,ko,pt,qu,sw,tr);
  **degenerate total 92 → 83 (−9)**; `--regression` gate green, **0 regressions**
  (baseline diff = 9 removals, 0 additions, no parse-rate drops); baseline regenerated.
- **Root cause.** `socket` (a newer streaming command) had **no entry in the i18n
  `commands` dictionaries** (`packages/i18n/src/dictionaries/*.ts`) — only `en`. The
  transformer emitted the English literal `socket`; the 9 languages use a **native**
  socket primary in their semantic profile (`ソケット`/`소켓`/`soquete`/`مقبس`/…) that
  doesn't list the English word, so the `socket` command dropped (fid 0.00).
  fr/de/es/tl were unaffected because their profile primary already _is_ `socket`.
- **Fix.** Add `socket` = the profile native primary to each of the 9 `commands` dicts,
  - `socket`/`eventsource`/`worker` to the `derive.ts` `COMMAND_KEYWORDS` allowlist
    (they postdated the list, so a `generate:language-assets` regen would re-drop the
    hand-added entries). Same keyword-gap family as the `focus` alignment. Locked by
    `multilingual-roadmap-fixes.test.ts` ("socket command keyword alignment").
- **Context.** This is **Phase 0** of the block-body decomposition scoped in
  [BLOCK_BODY_CONDITION_SCOPE.md](BLOCK_BODY_CONDITION_SCOPE.md): the "block-body
  cluster" is really 46 unimplemented behaviors + ~24 newer-feature keyword/profile
  gaps (socket done; eventsource/worker hi/tl + install-behavior next) + ~13 true
  control-flow bodies (the `is empty`/`I match` condition campaign, Phases 1–3).

### Track 5 — `focus` command keyword alignment (first-in-parent → faithful, de/fr/pl/pt/sw)

- **`first-in-parent` 0.33 → 0.67** (degenerate → faithful) in de, fr, pl, pt, sw;
  **degenerate total 97 → 92 (−5)**; `--regression` gate green, **0 regressions**
  (baseline degenerate diff = 5 removals, 0 additions); avgFidelity ↑ in all 5
  (de 0.911→0.917, fr 0.888→0.893, pl 0.896→0.901, pt 0.873→0.879, sw 0.909→0.914);
  baseline regenerated.
- **Root cause.** The i18n `commands` dictionaries
  (`packages/i18n/src/dictionaries/{de,fr,pl,pt,sw}.ts`) had **no `focus` entry**.
  The grammar transformer therefore fell back to the event-noun form (de `fokus`,
  fr `focus`, pt `foco`, sw `zingatia`, pl `fokus`) for the `focus` _command_ —
  none of which the semantic command parser recognizes, since the profile primaries
  are verbs (`fokussieren` / `focaliser` / `focar` / `lenga` / `skup`). So
  `on click focus first <input/> in closest <form/>` dropped its entire `focus …`
  body, parsing degenerate `{on}`. Spanish was unaffected only because its
  event-focus word `enfocar` coincidentally equals its profile primary; the same
  drop was present-but-masked in `focus-element` (2-action EN reference → 0.50,
  exactly at the fidelity floor).
- **Fix.** Add `focus` = the profile-primary verb to each of the 5 `commands`
  dicts. The transformer now emits a verb the parser parses; the trailing
  `first … in closest …` positional/scope is gracefully ignored (the EN reference
  itself only yields `{focus, on, wait}`, so `{on, focus}` clears the 0.50 floor).
  Same root-cause family as the qu/sw `increment` and zh `fetch` keyword
  alignments. Locked by `multilingual-roadmap-fixes.test.ts`
  ("focus command keyword alignment").
- **Paired probe — `if-empty` is NOT the same root cause.** `if-empty`
  (`on blur if my value is empty add .error to me put "Required" into next
.error-message end`) is degenerate in de/he/ja/ko/sw, but its command verbs
  (`on/if/add/put`) are all present in the dicts — it is the documented hard
  block-body cluster, not a keyword gap: `put`+positional-destination drops after
  the non-`into` marker (de `setzen … zu nächste …`), the `is empty` predicate, and
  the SOV `on blur` collapse to a bare `blur` in ja/ko. Left tracked under the
  block-body arc; deliberately not force-unified with the focus fix.

### Track 5 — zh `wait` BA-marked duration (zh repeat-forever → 1.0)

- **zh `repeat-forever` 0.67 → 1.0** (now recovers the full `{on, repeat, toggle, wait}`
  body); avgFidelity zh 0.794 → 0.808; parse rate unchanged (3679/3696), 0 regressions
  (full `browser-priority` regen + `--regression` gate green; zh the only language moved).
- **Root cause.** The i18n transformer emits `等待 把 1s` for `wait 1s`: its generic
  argument parser (`transformer.ts` ~L910/973) defaults the first argument to the
  `patient` role, and zh marks `patient` with the BA particle `把`
  (`profiles/index.ts`). The generated semantic pattern is `等待 {duration}` (no `把`),
  so the marked form didn't match — the trailing `wait` in
  `… 那么 等待 把 1s 结束` was dropped.
- **Fix.** Handcrafted `wait-zh-ba` pattern (`packages/semantic/src/patterns/wait.ts`,
  registered in `builders.ts`) tolerating the optional `把` before the duration —
  mirrors the existing `toggle-zh-ba` convention and the qu increment handcrafted fix.
  Contained and low-risk; the unmarked `等待 1s` keeps using the generated pattern.
- **Deeper follow-up (deferred).** The transformer over-applies `把` to non-patient
  arguments (a duration is not a BA object — `等待 把 1s` is ungrammatical zh; the
  transformer's own example table lists `等待 2秒`). Teaching it to honor the schema
  `primaryRole` is an architecturally significant change to the i18n role model;
  plus the `那么`/`然后` then-keyword mismatch. Both scoped in
  [ZH_BLOCK_BODY_SCOPE.md](ZH_BLOCK_BODY_SCOPE.md). Locked by
  `multilingual-roadmap-fixes.test.ts` ("zh wait BA-marked duration").

### Track 5 — qu/sw `increment` keyword alignment (yapachiy / ongezeko, qu/sw repeat-while → 1.0)

- **qu/sw `repeat-while` 0.75 → 1.0**; avgFidelity qu 0.796 → 0.809, sw 0.843 → 0.856;
  parse rate unchanged (3679/3696), 0 regressions (full `browser-priority` regen +
  `--regression` gate green, zero faithful→degenerate flips, no other language's
  avgFidelity moved).
- **Root cause (two layers).** The i18n dictionaries (`packages/i18n/src/dictionaries/{qu,sw}.ts`)
  mapped both `add` and `increment` to the same word (qu `yapay`, sw `ongeza`) — they
  generate-merge from the semantic profiles but hand-written/existing entries take
  priority, so the stale collapse survived even though the profiles already
  distinguish `increment` (qu `yapachiy`, sw `ongezeko`). The transformer therefore
  emitted the add-word for increment and the parser read it as `add`.
- **Fix.** (1) Aligned the qu/sw dict `increment` entries to the profile primaries
  (`yapachiy` / `ongezeko`). (2) sw (SVO, verb-first) then parses `ongezeko #counter`
  via the existing generated pattern. (3) qu (SOV, verb-final) needed a handcrafted
  `increment-qu-sov` pattern (`{patient} ta yapachiy`) + verb-first variant in
  `packages/semantic/src/patterns/increment.ts`, mirroring the existing `add-qu-sov`
  — the generated SOV pattern didn't anchor the `{patient} ta <verb>` order (which is
  why `add` already carried a handcrafted SOV pattern). Locked by
  `multilingual-roadmap-fixes.test.ts` ("qu/sw increment keyword alignment").

### Track 5 — Non-SOV `repeat-*` loop-body + tail residue (zh/ar/tl/ja/ko/qu/sw, −3 degenerate)

- **Degenerate passes 135 → 132 (−3), parse rate 3678 → 3679 (+1 he), 0 regressions.**
  Full `browser-priority` regen + `--regression` gate green; zero faithful→degenerate
  flips, every avgFidelity delta non-negative. Cleared the last degenerate `repeat-*`
  (zh `repeat-forever`, 0.33→0.67 faithful) + sw `repeat-until-event` + bonus
  `focus-trap` (sw/tr). avgFidelity up across the touched langs (e.g. ja 0.909→0.917,
  ko 0.833→0.843, ar 0.883→0.888, tl 0.880→0.888, zh 0.785→0.794, sw 0.866→0.873).
- **Two parser-side fixes** (`packages/semantic/src/parser/semantic-parser.ts`; no
  transformer change — the transforms were already in a recoverable order):
  1. **`end`-mid-stream tail merge** (`parseBodyWithClauses`). The verb-final SOV
     reorder places the block-terminating `end` _between_ a trailing command's
     argument and its verb (`… それから 200ms 終わり を 待つ` =
     `… then 200ms end ‹patient› wait`); the naive `end`-break discarded the post-`end`
     `を 待つ`, dropping the trailing `wait`. The break now tolerates a single trailing
     clause: collect the post-`end` tokens up to the next then/end boundary and parse
     them, merging with the pre-`end` tokens when those parsed to nothing on their own
     (the stranded-argument case). Gated to one trailing clause so a genuine
     nested-block close can't swallow arbitrary following content. Recovered the
     trailing `wait` for ja/ko/tr (→1.0) and qu (→0.75); cleared `focus-trap` (tr).
  2. **`for`-binding `repeat`-keyword recovery** (`parseClause`). The transformer drops
     the `for` binder keyword (`repeat for x in y` → `repeat x in y`), leaving the bare
     `repeat` with no matchable variant so matchBest can't anchor it (the `repeat`
     action was silently dropped — ar/tl/zh `repeat-for-each`; ko escaped only because
     SOV puts the keyword last). When matchBest fails on a token whose normalized form
     is `repeat`, the clause parser now emits the `repeat` action directly. Lifted
     for-each ar/tl/zh to 1.0, cleared the zh `repeat-forever` degenerate, and recovered
     sw's leading `rudia`(repeat) clause (sw while 0.50→0.75).
- **Deferred (separate keyword-alignment tracks):** the zh `wait` SVO pattern gap
  (`等待 1s` parses to nothing — zh `repeat-forever` is faithful at 0.67 but not 1.0),
  and the qu/sw `add`-vs-`increment` keyword overlap. Both are dictionary work, not
  the structural reorder. Locked by `multilingual-roadmap-fixes.test.ts`
  ("Non-SOV repeat-\* loop-body + tail residue — zh/ar/tl/ja/ko/sw"). See
  [NON_SOV_REPEAT_SCOPE.md](NON_SOV_REPEAT_SCOPE.md).

### Track 5 — VSO/Austronesian `repeat-*` mid-stream event reorder (ar/tl, −6 degenerate)

- **Degenerate passes 141 → 135 (−6), 0 regressions, parse rate unchanged**
  (3678/3696). Full `browser-priority` regen + `--regression` gate green; every flip
  is degenerate→faithful, zero faithful→degenerate. Cleared `repeat-for-each` and
  `repeat-while` (ar+tl) **plus bonus `focus-trap` and `window-keydown` (ar)** — same
  mid-stream-event shape. avgFidelity ar 0.866→0.883, tl 0.884→0.894; all other
  languages byte-identical.
- **Root cause (the non-SOV sibling of the SOV repeat-\* fix).** For VSO/Austronesian
  the i18n transformer surfaces a block loop's keyword first and places the event
  clause **mid-stream**, marked by an `on`-marker (`كرر عند نقر …` /
  `ulitin kapag click …` = `repeat on click …`). Unlike SOV (no marker / event-marker
  particle) and unlike the trailing-event SVO/VSO case (event last), the event sits
  right after the leading loop keyword. `tryTrailingEventExtraction` (Stage 1.5)
  requires the event to be the final token, so it missed it; the bare loop keyword won
  Stage 2 and the event + variant + body dropped (degenerate). `repeat-forever` already
  worked for ar/tl because _its_ event reorders to the **end** (caught by Stage 1.5).
- **Fix (parser, additive).** New `tryMidStreamEventExtraction` scans for an
  `on`-marker (`normalized === 'on'`) immediately followed by a known event keyword,
  strips that pair, and parses everything else (leading loop keyword + for/while clause
  - then-chain body) as the handler body. Wired into the same block/loop Stage-2 gate
    added for the SOV fix, _after_ SOV extraction returns null — so it's reached only when
    Stage 2 matched a bare block/loop action (already a degenerate parse) and only fires
    on a real on-marked event whose body parses. Simple commands never reach it.
- **Honest scope.** ar/tl `repeat-for-each` land at 0.67 (the `for <var> in <coll>`
  binder doesn't re-yield a `repeat` action — a shared gap with ko, tracked as #2 in the
  follow-up). The remaining degenerate `repeat-*` is **zh `repeat-forever`** (circumfix
  `当…时` event + a zh block-body collapse — a different layer), plus the `wait`-after-`end`
  tail residue across SOV. All scoped in [NON_SOV_REPEAT_SCOPE.md](NON_SOV_REPEAT_SCOPE.md).
- Locked by `multilingual-roadmap-fixes.test.ts` ("VSO/Austronesian repeat-\* mid-stream
  event reorder — ar/tl": ar/tl recover the event + loop body; a simple VSO command is
  unaffected).

### Track 5 — SOV `repeat-*` loop-body reorder (ko/bn/qu, −7 degenerate)

- **Degenerate passes 148 → 141 (−7), 0 regressions, parse rate unchanged**
  (3678/3696). Full `browser-priority` regen + `--regression` gate green; every
  flip is degenerate→faithful, zero faithful→degenerate, zero parse-success ↑/↓.
  Cleared `repeat-forever`/`repeat-while`/`repeat-for-each` (ko) + the
  `stagger-animation` repeat body (ko bonus), `repeat-while` (bn),
  `repeat-while`/`repeat-for-each` (qu). avgFidelity ko 0.889→0.903, bn
  0.952→0.956, qu 0.782→0.794; all other languages byte-identical.
- **Root cause (two layers — parser was the real blocker, mirroring the if/else
  fix).** (1) For SOV the i18n transformer surfaces a block loop's keyword
  (`반복`/`পুনরাবৃত্তি`/`kutipay` = repeat) — or a leading `while <cond>` / `for <x> in
<y>` clause — ahead of its body. The semantic parser matched the bare loop
  keyword as a **standalone command** at Stage 2 (`{ action: 'repeat'/'while',
roles: {} }`) and returned before the SOV event-extraction (Stage 3) could run,
  dropping the event + variant + body. **Korean is hit hardest:** with no
  event-marker particle the Stage-1 fused event pattern can't anchor, so the bare
  loop keyword always won. bn/qu fail only on the `while`/`for` variants, where the
  leading condition clause pushes the event mid-stream and breaks the Stage-1
  match. (2) The qu i18n dict emitted `kutichiy` for `repeat`, but `kutichiy` is the
  semantic qu profile's **`return`** primary (repeat = `kutipay`) — a keyword
  collision that mis-parsed every qu `repeat-*` independent of the reorder.
- **Fix (two parts, both additive).**
  1. **Parser (`semantic-parser.ts`, Stage 2 gate).** When the Stage-2 command
     match's action is a block/loop action (`BLOCK_BODY_ACTIONS` = if/unless/while/
     repeat/for), try `trySOVEventExtraction` (Stage 3) first; use its event-handler
     result when it finds a real event whose body parses, else fall back to the bare
     command. Gated to block/loop actions and only taken when SOV extraction finds an
     event, so the counted variant (`repeat N times`) and genuine standalone loops
     (no event → SOV extraction returns null) are unaffected — no phantom event
     handler is synthesized. ja/tr already recovered these via Stage-1 (their event
     marker anchors the fused pattern) and are untouched.
  2. **qu keyword alignment (passthrough).** i18n qu dict `repeat: 'kutichiy'` →
     `'kutipay'` (the semantic repeat primary). Collision-free: `kutichiy` stays
     `return`'s word. Mirrors the qu `install` and de `fetch` dict realignments.
- **Honest scope.** ko `repeat-forever` lands at 0.67 (the `반복` keyword + English
  `forever` don't re-assemble into a `repeat` node, but the event + body recover) and
  qu `repeat-while` at 0.50 (the body `yapay`=add vs `increment`, and a `tukuy`=end
  landing mid-stream drops the trailing `wait` — the same then-chain-tail residue
  ja/tr show at 0.75). All are ≥0.5 (faithful). Non-SOV `repeat-*` degenerates
  (`ar`/`tl` VSO, `zh` SVO, `sw`) are separate word-order issues, out of scope.
- Locked by `multilingual-roadmap-fixes.test.ts` ("SOV repeat-\* loop-body reorder":
  ko/bn/qu recover the event + loop body; counted variant unaffected; a no-event loop
  never becomes an event handler; qu `kutipay` parses as `repeat` not `return`) and
  `grammar.test.ts` (qu emits `kutipay`, not `kutichiy`). See
  [SOV_REPEAT_SCOPE.md](SOV_REPEAT_SCOPE.md).

### Track 5 — SOV put-into verb-final reorder (ko/tr/bn, +fidelity)

- **tr `avgFidelity` 0.908 → 0.928, bn 0.935 → 0.952, 0 regressions, degenerate
  count unchanged (148).** `--regression` gate green. ja had a `put-into` grammar
  rule (`roleOrder: patient, destination, action` = verb-final); ko/tr/bn did not,
  so `put X into Y` fell through to the generic reorder, which appends `destination`
  **after** the verb (verb-middle `X i koy Y e`). The semantic parser only matches
  verb-final put, so as a then-chain clause (`… then put it into me`) the `put`
  silently dropped. Mirrored ja's rule into ko/tr/bn, **gated to standalone put via
  a `predicate: parsed => !parsed.roles.has('event')`** so an event handler whose
  action is `put` (`on success put …`) keeps the event mid-stream instead of being
  verb-finalized (which would strand the event — caught as an
  `announce-screen-reader` regression mid-implementation and fixed by the predicate).
- The degenerate count is unchanged because the affected then-chain patterns were
  already above the 50% threshold after the SOV reorder fix; this recovers the
  dropped `put` (higher fidelity), it doesn't cross the degenerate line. ko is inert
  for the current corpus (its body-clause parser already tolerated verb-middle put)
  but the rule is kept for correctness/consistency. **qu** is excluded: it emits
  verb-final already yet still fails to parse (a separate qu pattern/marker issue).
- Locked by `multilingual-roadmap-fixes.test.ts` ("SOV put-into verb-final reorder")
  - i18n `grammar.test.ts` ("SOV put-into verb-final reorder").

### Track 5 — SOV verb-first event-body reorder (−9 degenerate)

- **Degenerate passes 159 → 150 (−9), 0 regressions, parse rate unchanged.** Full
  `browser-priority` regen + `--regression` gate green; the `event-once`,
  `async-block`, and `event-debounce` SOV instances (ja/ko/tr/bn/qu) recover their
  body commands instead of collapsing to a bare `*-generated-verb-first` command.
- The i18n transformer (`tryTransformEventWithModifierBody`) lifts a leading body
  modifier (`async`/`once`/`debounced`/`throttled`) out of the event handler so the
  real verb isn't mis-rooted, keeps the body patient-first (recoverable by the
  parser's SOV event-extraction), and re-emits the modifier as a leading literal the
  parser strips pre-parse. **Gated to SOV** — SVO/VSO/V2/other are byte-identical.
- See [SOV_REORDER_SCOPE.md](SOV_REORDER_SCOPE.md). Locked by
  `multilingual-roadmap-fixes.test.ts` ("SOV verb-first event-body reorder") +
  i18n `grammar.test.ts` ("SOV modifier-prefixed event body reorder").

### Track 5 — fetch keyword alignment: ja (−2 degenerate, +fidelity)

- **ja `取得`→`フェッチ` shipped.** Degenerate passes 150 → 148 (−2:
  `fetch-do-not-throw`, `fetch-json`), ja `avgFidelity` 0.859 → 0.893, parse rate
  unchanged, `--regression` gate green. The i18n dict emitted `取得` for both `get`
  and `fetch`; the semantic ja profile reads `取得` as `get` (fetch primary is
  `フェッチ`), so ja fetch-\* patterns parsed the wrong verb. The edit was blocked
  until the SOV verb-first reorder fix (above): with `フェッチ` leading a verb-first
  SOV body the event + then-chain used to drop; the body is now patient-first, so
  `フェッチ` parses as `fetch` without losing the rest. Locked by
  `multilingual-roadmap-fixes.test.ts` ("Japanese fetch keyword alignment").
- **zh `获取`→`抓取` — ✅ now shipped (see the latest entry, #3).** Originally
  deferred because the dict realign alone was inert: `抓取` still dropped `fetch`
  inside the event-handler block body (`fetch-basic` degenerate `{on}`), blocked
  behind the zh block-body parse gap. That gap is now closed by the `fetch-zh-ba`
  (BA-source / `responseType`) + `put-zh-ba` split-verb patterns, so the dict edit
  landed alongside them. zh `fetch-basic` / `fetch-json` are no longer degenerate.

### Track 5 — juxtaposed multi-command event bodies (−20 degenerate)

- **Degenerate passes 179 → 159 (−20), 0 regressions, parse rate unchanged** (3679/3696).
  Full `browser-priority` regen + `--regression` gate green; 20 degenerate→faithful, 0
  faithful→degenerate, 0 parse-down. The semantic role-extraction suite passes (fidelity is
  recall-based and wouldn't catch _over_-generation; the suite confirms none).
- **Root cause.** When a fused event pattern captures the first body command as the action,
  the remaining body commands may be then-chained (`… then …` — Root B, shipped), a block
  (if/else — Tier 1, shipped), or simply **juxtaposed** (`on submit halt the event call
validateForm() if … end` — no `then` between `halt`/`call`/`if`). The action-branch only
  continued on a then-chain or block, so juxtaposed commands were dropped and the handler
  collapsed to `{halt, on}` (degenerate). English handles juxtaposed bodies because it goes
  through `parseBodyWithClauses` (a matchBest loop), not the fused action-branch.
- **Fix (one line, generalizing).** The three prior special cases (`hasContinuesMarker`,
  `hasTrailingThenChain`, `hasBlockBody`) are subsumed by `hasTrailingBody` = any non-`end`
  token trails the captured action. `parseBodyWithGrammarPatterns` then appends every command
  it matches and skips the rest, so an already-consumed simple handler is unchanged and stray
  role words never become spurious commands (verified: a single-command handler still yields
  exactly `{on, toggle}`).
- **Impact.** Cleared `form-submit-prevent` (de/it/ru/sw/th/uk/vi — ar/tl stay 0.20, VSO
  event-mid), `fetch-loading-state` (bn/hi/it/ja/tr), `fetch-error-handling`/`fetch-with-headers`
  (ja), `render-template-with-data` (qu/tl/vi), `repeat-forever`/`stagger-animation` (qu),
  `window-scroll` (th).
- Locked by `multilingual-roadmap-fixes.test.ts` ("Juxtaposed multi-command event bodies":
  de/sw/vi recover halt+call+log; a simple handler doesn't over-generate).

### Track 5 — then/end keyword recognition for 9 profile-only languages

- **Parse rate +7, fidelity +4, 0 regressions** (full `browser-priority` regen + `--regression`
  gate green). `isThenKeyword`/`isEndKeyword` were hardcoded `Record<lang, Set>` maps covering
  only **15** languages (en, ja, ar, es, ko, zh, tr, pt, fr, de, id, tl, bn, qu, sw); the other
  **9** (it, ru, th, vi, he, hi, ms, pl, uk) hit the `|| en` fallback, so their native then/end
  (`allora`/`затем`/`แล้ว`/`rồi`/`fine`/`koniec`/…) were never recognized.
- **Two consequences, both fixed.** (1) Multi-command **then-chains collapsed to the first
  command** (`fetch-loading-state` parsed as `{add, on}` in it/ru/th/vi/…). (2) `end`-terminated
  **blocks didn't close** in those langs, so e.g. behavior definitions failed to parse outright.
- **Fix (parser, additive, conservative).** A shared `profileKeywordMatches(lang, key, value)`
  helper checks the language profile's keyword (primary + alternatives). `isThenKeyword`/
  `isEndKeyword` now: keep the curated map verbatim for the 15 mapped langs (**byte-identical**),
  and for the rest fall back to the profile's `then`/`end` form + the English literal. `isElseKeyword`
  refactored onto the same helper. Every profile carries `then`/`end`/`else`, so this generalizes
  to all 24 langs without hand-maintaining each map.
- **Impact.** Fidelity: `fetch-loading-state` **ru/th/vi/uk** degenerate→faithful (+4). Parse rate:
  **he/it/pl** behaviors (`behavior-draggable`/`-sortable`/`-resizable`) now parse — he +0.6%,
  it +1.9%, pl +1.9% (it/pl cross ~99%). Those 7 are Bucket B (degenerate by nature — a separate
  runtime track), so they're fail→degenerate **parse-rate wins**, not fidelity regressions; the
  degenerate count nets 176 → 179. **Zero faithful→degenerate, zero parse-down.**
- **Honest scope.** `fetch-loading-state` it/ja/bn/hi/tr stay degenerate for _other_ reasons (it's
  fused `event-handler-it-full` quirk; SOV event-mid then-chain for ja/bn/hi/tr) — separate work.
- Locked by `multilingual-roadmap-fixes.test.ts` ("then/end keyword recognition": ru/th/uk recover
  the multi-command chain; ja curated chain unchanged).

### Track 5 Async Tier 1 — `async` modifier transparency (−5 degenerate)

- **Fidelity, not parse rate**: degenerate passes **181 → 176** (−5 degenerate→faithful:
  `async-block` **ar, de, it, th, tl**), **0 regressions, parse rate unchanged** (3672/3696).
  Confirmed by a full `browser-priority` regen + `--regression` gate (every flip is
  degenerate→faithful; zero parse-success ↑/↓; zero faithful→degenerate).
- **Root cause.** `async` is a command **modifier** (`async fetch … then …` runs the
  following command asynchronously), not a verb — English never surfaces it as an action.
  But the i18n transformer treats it as a verb and reorders it by word order (leading in
  VSO, after the event in SVO, verb-final in SOV). A fused event pattern then captured
  `async` as the handler **action**, and the real command + the `then`-chain collapsed to
  a degenerate parse (`async-block` was degenerate in 13 langs).
- **Fix (parser, additive).** `parse()` strips the transparent `async` keyword before
  tokenizing (a new `stripAsyncModifier`, mirroring the existing `extractStandaloneModifiers`
  for once/debounce/throttle), so the following command anchors as the action. Matched
  against the profile's `async` form (primary + alternatives) + the English literal the
  transformer passes through; gated to the async token, so non-async inputs are
  byte-identical. tl needed a one-line passthrough-alignment (`sabay` added as a tl semantic
  `async` alternative — the i18n tl dict emits `sabay`).
- **Honest scope — fragments by word order, like the if-block arc.** This clears the
  **VSO/SVO/V2** slice only. Still degenerate (Async Tier 2): **SOV** (ja*, ko, bn, qu, tr)
  — the event sits mid-stream and the then-chain isn't recovered even with `async` gone;
  **zh** (deeper block-body gap, same one blocking the deferred zh fetch fix); **fr/pt**
  (a separate fetch-in-event gap — `récupérer`/`buscar` drop even *without* `async`, despite
  being registered fetch keywords); **ms** (no grammar profile, English passthrough doesn't
  parse). `async` execution semantics are **not yet preserved** (stripped, English-parity) —
  re-surfacing them is Tier 2. (*ja `async-block` was already faithful at 0.67.)
- **Unblocks** the deferred **ja/zh `fetch` keyword alignment** (correcting ja's dict
  regressed `async-block`/ja before this) — now a clean follow-up once the SOV then-chain
  is handled.
- Locked by `multilingual-roadmap-fixes.test.ts` ("async modifier transparency": ar/tl keep
  fetch+put, it recovers the real command, `async` never an action, non-async unaffected).

### Track 5 Tier 1 — if/else block-body in event handlers (−38 degenerate)

- **Fidelity, not parse rate**: degenerate passes **219 → 181** (−38 degenerate→faithful),
  **0 fidelity regressions, parse rate unchanged** (3672/3696). Confirmed by a full
  `browser-priority` regen + the `--regression` gate (every flip is degenerate→faithful;
  zero faithful→degenerate; zero parse-success ↑/↓). avgFidelity rose for
  ar/bn/he/hi/it/qu/ru/sw/th/tl/tr/uk/vi, none fell.
- **Named target cleared.** `if-exists` (the Tier 1 target — ar+it fully shredded to
  `[on, if]` at 0.40) is now **gone from the degenerate list entirely**: ar → 0.80,
  it → 1.0. Because the fix is at the parser/transform layer (not per-pattern), it also
  lifted the rest of the if-block cluster — **`if-empty`, `input-validation`,
  `unless-condition`** — from degenerate to faithful across 13 languages.
- **Root cause (two layers).**
  1. **Parser (`buildEventHandler`).** A fused VSO/SVO event pattern (`if-event-ar-vso`,
     `event-handler-it-full`, …) captures a **block** command (`if`/`unless`/…) as the
     handler _action_, but — unlike a simple command — the block's condition + branch body
     are **not** bridged by a then-marker (`on click if <cond> show … else … end`). The
     handler body collapsed to a bare `if` and every branch command was dropped (degenerate).
  2. **Transformer (`transformConditionalBody`).** The if-block body was reordered as one
     stream, so `else` rode along glued to a selector-led clause (`#modal else` → marked a
     selector → left **untranslated**) with a spurious `then` inserted around it.
- **Fix (three parts, all additive).**
  1. **Parser** — when the fused action is a block keyword (`if`/`unless`/`while`/`repeat`/
     `for`) and trailing non-`end` tokens remain, parse them as body commands and append as
     siblings (mirrors how the English event-body path flattens an if/else block; the
     condition tokens and `else` are skipped as non-commands). Gated to block actions, so
     simple-command handlers are byte-identical.
  2. **Transformer** — split the if-block body at a **top-level** (depth-aware) `else` into
     a then-branch and an else-branch, transform each independently, and translate `else`
     (ar `وإلا`, it `altrimenti`, ja `そうでなければ`, ko `아니면`, de `sonst`, …).
  3. **Compound-fallback gate** — the Stage-4 fallback fired only on a then-keyword. The
     else-split removed the `then` that some handlers leaned on when their **event isn't
     recognized** (sw `blur`=`poteza_macho`, so `input-validation` only ever parsed via the
     fallback). The gate now also fires on an `else` keyword (profile-derived
     `isElseKeyword`), preventing a faithful→null regression there.
- **Honest scope.** ar `if-exists` is 0.80 not 1.0: `put it into body` (`ضع هو إلى جسم`)
  is a separate ar `put` gap. ja/ko if-exists stay 0.80 (they drop the `if` wrapper — an
  SOV conditional-parse gap, untouched here). The `is <pred>` conditional class (Tier 2)
  is still the bigger, per-language effort.
- Locked by `multilingual-roadmap-fixes.test.ts` ("if/else block-body in event handlers":
  ar/it if-exists keep the if + branch body; sw else-joined block still parses) and
  `grammar.test.ts` ("if/else block-body — else split + translation": ar/it/ja translate
  `else`, no English `else` leaks, else-less body unchanged).

### German `fetch` keyword alignment — fidelity (de fetch cluster, +4 faithful)

- **Fidelity, not parse rate**: de degenerate passes **11 → 7** (−4 degenerate→faithful),
  de avgFidelity **0.8424 → 0.8707**, cross-lang degenerate total **223 → 219**.
  **0 new failures, 0 fidelity regressions, parse rate unchanged** (3672/3696). The
  4: `fetch-do-not-throw`, `fetch-error-handling`, `fetch-json`, `fetch-with-headers`
  (all de). Confirmed by a full `browser-priority` regen + `--regression` gate
  (only de's degenerate set shrinks; every other language byte-identical on
  rate/degen/avgFidelity).
- **Root cause (passthrough-alignment).** The i18n de dictionary mapped
  `fetch` → `holen`, but `holen` is the semantic de profile's **`get`** primary
  (semantic `fetch` = `abrufen`). So `fetch /api/data` transformed to `holen …`,
  which the semantic parser read as a `get` command — the `fetch` action was
  **dropped** from every de fetch handler, collapsing the body to a degenerate
  parse. (`get`/`fetch` are distinct hyperscript commands, so this is a genuine
  lost-command drop, not a metric artifact.)
- **Fix.** One-line i18n de dict edit: `fetch: 'holen'` → `fetch: 'abrufen'` (the
  semantic fetch primary). Collision-free: `holen` stays the `get` word, `abrufen`
  was unused. Adding `holen` as a semantic fetch _alternative_ was rejected — it
  would collide with `get`. Mirrors the qu `install` collision fix (change the
  emitting dict, not the semantic side, when the verbatim token is already taken).
- **Honest scope — de only.** A systematic scan of all 24 langs (i18n `fetch`
  emission vs semantic `fetch` primary/alternatives) found the same collision in
  **ja** (`取得`, also its `get` word; semantic fetch = `フェッチ`) and **zh**
  (`获取`, its `get` word; semantic fetch = `抓取`), plus an inert mismatch in **id**
  (`ambil` vs semantic `muat`). de was shippable cleanly; ja and zh were **not**
  and are deferred (see Track 5 → "fetch keyword alignment — ja/zh deferred"):
  correcting ja's dict exposes the **`async-block` command-first transform-ordering**
  bug (with `フェッチ` leading the SOV body, the trailing event + `put` drop —
  `async-block`/ja regresses 0.67→0.33), and zh's `抓取` still fails to parse as
  `fetch` inside the event-handler block body (a deeper block-body gap), so the
  zh keyword fix is inert for the metric.
- Locked by `grammar.test.ts` (de emits `abrufen`, not `holen`) and
  `multilingual-roadmap-fixes.test.ts` (the transformed de fetch handler keeps a
  real `fetch` in its body; `holen` still reads as `get`).

### `is empty` predicate alignment — fidelity Root A partial (avgFidelity, 5 langs)

- **avgFidelity up for fr/id/pl/pt/zh (~+0.0026 each, +0.0006 cross-lang), 0 new
  failures, 0 fidelity regressions, degenerate count unchanged (223).** Each `if …
is empty …` handler in these languages now parses faithfully (`add,empty,if,on`)
  instead of dropping the condition predicate (`add,if,on`).
- **Root cause (recurring, per-language).** The semantic profile's `empty` keyword
  primary is the **verb** ("to empty/clear" — `vider`/`esvaziar`/`清空`/…), but the
  i18n transformer emits the **adjective** for the `is empty` emptiness check
  (`vide`/`vazio`/`空的`/…). The adjective was unregistered, so the predicate was
  dropped from the condition. Only `es` (`vacío`) was already aligned.
- **Fix.** Add the adjective as an `alternatives` entry on each profile's `empty`
  mapping (additive — the verb/clear-command still works; no collisions). 5 one-line
  profile edits.
- **Honest scope.** This is a **partial Root A** win and deliberately does **not**
  move the degenerate-pass count: these patterns were already ≥0.5 fidelity (above
  the degenerate threshold), so the fix lifts them 0.75→1.0 (avgFidelity) without
  clearing a degenerate pass. See the Track-5 note below — the tracked degenerate
  cases are the _fully-collapsed_ (<0.5) ones, which need deeper per-language work.
  Languages it/ru/uk/vi/th/sw also drop `empty` but additionally lose the body
  command, so the predicate alignment alone doesn't make them faithful (separate gap).
- Locked by `multilingual-roadmap-fixes.test.ts` ("`is empty` predicate alignment").

### Post-event then-chain capture — fidelity Root B (+9 faithful, first Track-5 fix)

- **Fidelity, not parse rate**: degenerate passes **232 → 223** (−9 degenerate→faithful),
  **0 new failures, 0 fidelity regressions, parse rate unchanged** (3672/3696). Locked
  by the fidelity ratchet (`--regression`). The 9: `fetch-loading-state` (ar, de, qu,
  sw, tl), `fetch-basic` (de, ja), `its-value-possessive-dot` (de, ja).
- **Root cause (semantic parser).** A fused VSO/SOV event pattern matches a
  command-first handler (`<cmd> on <event> then <cmd>…` — e.g. ar `أضف .loading …
عند نقر ثم احذف … ثم ضع …`) and captures the _first_ command, but the trailing
  `then`-chain is left unconsumed _without_ a `continues` marker. `buildEventHandler`
  only parsed the remainder when `continues:'then'` was captured, so the body
  collapsed to that first command and **every post-event command was silently dropped**
  — a non-null but degenerate parse.
- **Fix.** In `buildEventHandler`'s grammar-transformed branch, also parse the
  remainder when the next unconsumed token is a then-keyword (`hasTrailingThenChain`),
  not only when `continues` was captured. Additive and tightly gated: a lone
  command-first event (no trailing `then`) is unchanged, and only successfully-parsed
  commands are appended, so it can lift fidelity but never break an existing parse
  (confirmed: 0 regressions across the full 24-language corpus + 5313 semantic tests).
- **Honest caveat.** This is Root B only. Root A (the i18n transformer scrambling SOV
  `if … is …` conditions — `if-empty`/`input-validation`, the largest cluster) is
  untouched and is the next Track-5 target. `fetch-loading-state`/ar is now 0.80 not
  1.0 (its inner `fetch` body command is a separate AR-pattern gap).
- Locked by `multilingual-roadmap-fixes.test.ts` ("Post-event then-chain capture":
  ar body keeps remove/put; a lone command-first event keeps just its command).

### Event-block `from`-source routing — `focus-trap` tr (+1, completes the non-behavior track)

- **1 instance, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  tr `focus-trap` flips `↑`, zero `↓`).** tr 99.4→100. **This was the last
  non-behavior failure** — every non-behavior pattern now parses in all 24
  priority languages.
- **Root cause.** `on keydown[key=="Tab"] from .modal if … end` is an event handler
  with a guard, a `from <source>`, and an `if…end` block body. `tryTransformEventWithBlockBody`
  explicitly **excluded** event heads carrying `from`, so focus-trap fell to the
  generic path, which shredded the if-block across the handler's roles and left its
  inner keywords (`in`/`focus`/`first`/positional) **untranslated**. 23 languages
  still scraped a (degenerate) non-null parse from that garbage; tr's specific
  scramble didn't, so it failed.
- **Fix.** Route `from`-source heads through the block-body path **for SVO/SOV
  targets** — mask the block, emit the event clause (incl. the translated
  `from <source>`, which `parseEventHandler` reorders) first, then the transformed
  block. The block body's keywords now translate properly. **VSO targets (ar, tl)
  stay on the existing path**: there the event-first emission with a `from`-source
  reorders incorrectly and regressed `focus-trap`/`window-keydown` (confirmed by a
  full regen of the un-gated version: −4 in ar/tl), while the existing path already
  parses them. So the `from`-exclusion is now scoped to `wordOrder === 'VSO'`.
- **Honest caveat.** focus-trap parses **degenerately in all 24 languages** (the
  if-block body still isn't a clean focus/halt parse everywhere); this fix lifts tr
  to the same non-null parity the other 23 already had, rather than inventing a new
  hollow pass. A fully clean focus-trap (no leaked keywords, real block body across
  all langs) is a separate, larger transformer project.
- Locked by `grammar.test.ts` (tr routes through the block path — `odak` translated,
  event leads; ar stays on the existing path without throwing).

### Caret-scope masking — `caret-var-on-target` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  ar/tl `caret-var-on-target` flip `↑`, zero `↓`; no stale-DB artifact this time).**
  ar 98.7→99.4, tl 99.4→100.
- **Root cause (two sides).** `on click put ^count on #host into me` failed even in
  **English**: `^count on #host` reads a DOM-scoped `^count` variable from a
  specific element, but the **overloaded `on`** broke both layers. (1) The semantic
  `put` pattern had no notion of `^var on <selector>`, so the inner `on` left
  `into me` unmatched → NULL (the full handler only "passed" with a hollow
  empty body). (2) The i18n transformer's splitter/event-parser read the inner
  `on` as an event/command boundary, mangling the output (`ضع ^count عند نقر ثم في
أنا عند #host` — spurious `then`, scope stranded at the end, event lost).
- **Fix (two parts).**
  1. **Semantic matcher (`tryMatchCaretScopeExpression`).** Folds `^name on
<selector>` into one expression value, gated to `^`-prefixed identifier tokens
     followed by an `on`-marker (matched by raw value `on` or normalized
     `destination`, cross-language) and a selector — so `toggle .active on #button`
     (class-selector patient) is untouched. The trailing `into me` destination then
     matches; the en handler gets a real body.
  2. **Transformer masking.** `maskCaretScopes` hides the ` on <selector>` scope
     behind an opaque sentinel attached to `^name` before any split/reorder (the
     same shape as the js-block / string-literal masks), then `restoreCaretScopes`
     puts it back verbatim. The command reorders as if the patient were a single
     value; the event clause survives and `^count on #host` stays adjacent. `on`
     is kept English (passthrough-alignment — the matcher accepts it everywhere).
- Locked by `multilingual-roadmap-fixes.test.ts` (clean-en parse, real-body guard,
  `toggle … on #button` + scope-less `put` guards, ar/tl transformed forms) and
  `grammar.test.ts` (transform keeps the scope adjacent + event, no leftover
  sentinel, normal commands undisturbed). Only one corpus pattern carries a
  caret-scope, so the change is inherently narrow.

### `@attr` in selector roles — `form-disable-on-submit` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  ar/tl `form-disable-on-submit` flip `↑`, zero `↓`).** ar 98.1→98.7, tl 98.7→99.4.
- **Root cause.** `@disabled` tokenizes with kind **`identifier`**, not `selector`
  — and that kind is **load-bearing**: roles like bind's `@property`
  (expectedTypes `['reference','expression']`) rely on the identifier reading.
  Phase 1 kept `@attr`/`*style` as one token (fixing the `set` family) but left
  the kind as `identifier`, so `add`/`remove`/`toggle`, whose patient is
  `expectedTypes: ['selector']`, reject it: `add @disabled` failed outright (and
  `toggle @disabled` only "passed" via a permissive hand pattern that captured
  nothing). That bad `add @disabled` clause gated the whole form-disable body.
- **Fix.** In `matchRoleToken` (`pattern-matcher.ts`), when the candidate token is
  an `@`-prefixed `identifier` **and the role explicitly expects a `selector`**,
  convert it to an attribute selector. Gated on `expectedTypes.includes('selector')`
  so non-selector `@`-roles (bind's `@property`, etc.) are untouched. Combined with
  the trailing-event wrapper (below), the ar/tl form-disable body now parses.
- **A global token-kind reclassification was tried first and rejected** — making
  `@attr` a `selector` kind everywhere regressed 43 patterns (bind/js-inline/when/
  live/transition families read `@x` as a non-selector). The role-gated value
  conversion is the surgical version: provably additive (the new branch only fires
  for `@`-identifiers in selector roles; every other input hits byte-identical
  code), confirmed by an A/B probe (same DB, build toggled — flips only form-disable).
- **Methodology note.** The committed baseline can disagree with a fresh-DB harness
  run by tens of patterns (a flaky undercount surfaced here at 3624 vs 3669). Trust
  a controlled A/B probe over a single full-suite run; verify regressions against
  the committed baseline. Locked by `multilingual-roadmap-fixes.test.ts`
  (`add @disabled`, `remove @disabled`, a bind non-regression guard, and the ar/tl
  form-disable bodies).

### Trailing-event block-wrap — `unless-condition` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (full `browser-priority` regen: exactly
  ar/tl `unless-condition` flip `↑`, zero `↓`).** ar 97.4→98.1, tl 98.1→98.7.
- **Root cause.** SVO/VSO transforms put the event clause at the very end
  (`<body> عند <event>` / `<body> kapag <event>`). The per-command _fused_ event
  patterns (`toggle-event-ar-vso-…`) only cover simple bodies, so a **block** body
  (`unless <cond> toggle …`) wasn't wrapped and degraded to a hollow standalone
  command. Two gaps: ar/tl didn't recognize `unless` at all (ar `إلا إذا`
  **splits**, with `إذا`→`if`; tl `maliban_kung` was an unrecognized identifier),
  and there was no generic block+trailing-event wrapper.
- **Fix (two parts).**
  1. **Keyword.** Added `unless` to the ar/tl semantic profiles as a single token
     (`إلا` / `maliban_kung`); the i18n ar dict now emits single-token `إلا` (the
     two-word `إلا إذا` is split by the tokenizer). `keyword-collisions.test.ts`
     clean.
  2. **Parser — `tryTrailingEventExtraction` (new stage 1.5).** Recognizes a
     trailing `<on-marker> <event>` (gated to a recognized event keyword in the
     final position, so a trailing destination selector like `على #button` is
     never mistaken for an event), strips it, and parses the preceding tokens as
     the handler body. It runs only after the dedicated event patterns fail and
     returns null (falling through to the command stage unchanged) unless it finds
     a genuine trailing event whose body parses — so structurally it can only add
     parses, never break one. Result is en-parity: `on { unless(…) ; toggle(…) }`.
- Locked by `semantic/test/multilingual-roadmap-fixes.test.ts` (ar+tl block-wrap
  asserting the body keeps both `unless` and `toggle`, plus guards that a trailing
  destination selector and a plain command are left untouched).

### Custom-event SOV slot — `on-custom-event-receive` ko+qu (+ window-resize qu+tr) (+4)

- **4 instances, 0 regressions, avg 99.05% (full `browser-priority` regen: exactly
  ko/qu `on-custom-event-receive` + qu/tr `window-resize` flip `↑`, zero `↓`).**
  ko 99.4→100, qu 98.7→100, tr 98.7→99.4.
- **Root cause.** `trySOVEventExtraction` (the stage-3 fallback in
  `semantic-parser.ts`) only recognized built-in event keywords
  (`click`/`submit`/…) in the event slot. A custom event keeps its untranslated
  source identifier after the grammar transform — `on hello put 'Got it!' into me`
  → ko `'Got it!' 를 hello 넣다 나 에`, qu `… hello pi churay` — so `hello`
  surfaced as a bare `identifier` token and never filled the event slot; the whole
  handler failed (stages 1 & 2 already can't anchor a mid-stream event).
- **Fix.** A second pass accepts a bare identifier in the event slot, gated by the
  same structural cue the built-in path uses so a stray content identifier is never
  mistaken for an event: marker languages (ja/tr/qu/bn) require the event-marker
  particle right after the identifier (`hello pi`); marker-less Korean requires the
  identifier to sit immediately before the body's command verb (`hello 넣다`). The
  existing body re-parse is the final guard. Runs only after the event- and
  command-pattern stages already failed.
- **Bonus.** `window-resize` (qu/tr) flipped too: the qu/tr resize words
  (`hatun_kay` / `boyut_değiştir`) are the real event, just absent from the native
  event dictionary — the same gate now accepts them. (The `debounced at 200ms`
  modifier is still dropped, but the metric is non-null parse.)
- Locked by `semantic/test/multilingual-roadmap-fixes.test.ts` (ko+qu custom event,
  the 클릭 control, and a guard that a plain command body never becomes a phantom
  event handler).

### Investigated, then shipped — the full non-behavior track

> Every item once tracked in this section has now graduated to **Shipped**:
> `unless-condition`, `form-disable-on-submit`, `caret-var-on-target` (all ar+tl),
> and `focus-trap` (tr). With them, **all non-behavior pattern-instances parse in
> all 24 priority languages.** The remaining failures are exclusively Bucket B
> behaviors (Track 2 — a runtime track, not parsing/i18n). One enduring lesson
> recorded along the way: the `<selector> in <scope>` matcher once scoped here was
> **not** the form-disable blocker (`in me` was already tolerated; the real gate
> was `@attr` patient classification), and `focus-trap`'s positional
> `<sel> in <scope>` already parsed in command context — a reminder to verify the
> true blocker with a probe before building.

### Property-path patient — fused-dot member access (+2)

- **2 instances, 0 regressions, avg 99.00% → 99.05%.** he 97.4→97.4 (announce was
  he's last non-behavior; he/sw both clear it). Cleared `announce-screen-reader`
  (he+sw). Confirmed by a full `browser-priority` baseline regen (exactly these 2
  flip `↑`, zero `↓`).
- **Root cause.** `put event.detail.message into #x` fails even in **English** at
  the bare-command level: the tokenizer fuses the dotted path into a base token +
  `.`-prefixed _selector_ tokens (`event` + `.detail` + `.message`, since `.foo`
  looks like a class selector), and `tryMatchPropertyAccessExpression` only knew the
  un-fused `base . identifier` operator form. Added a fused-dot branch that folds a
  chain of `.prop` selectors into the property path.
- **The lever was NOT he/sw `set`.** Investigation found announce's `set …` clause
  and the `set … on <target>` mis-split are both _tolerated_ inside the event-handler
  compound (like `toggle .active on #host`, which already passes in he despite the
  split). The only hard blocker was the property-path patient in the `put` clause —
  so the he/sw `set`-marker alignment originally scoped for this item was unnecessary
  and was dropped (no baseline impact, avoids the `weka`=put verb-collision risk).
- **Regression guard.** The fused-dot branch is gated to identifier/reference bases
  (`PROPERTY_ACCESS_BASES`) so a command verb + class selector (`toggle .active`,
  AR `بدل .active`, the proclitic `وبدل .active`) is never swallowed as a property
  path. Locked by `semantic/test/multilingual-property-path-patient.test.ts`.

### Tier 1 parser features — positional / of-possessive / member-access (+6)

- **6 instances, 0 regressions, avg 98.84% → 99.00%.** ar 95.5→97.4, tl 96.1→98.1.
  Confirmed by a full `browser-priority` baseline regen (exactly these 6 flip `↑`,
  zero `↓`). Cleared `last-in-collection`, `set-color-variable`, `input-clear` (all ar+tl).
- **Unlike the passthrough batch, these are genuine parser features** — each fails
  even in English at the bare-command level (English only "passed" them via the
  degenerate empty-body event-handler match). VSO langs (ar/tl) require a parseable
  body, so the features had to be built for real; English gains real parsing too.
- **Tag-less query selector tokenization** (`css-selector.ts`). `<.message/>` /
  `<#id/>` / `<[attr]/>` split into `<` + `.message` + `/>`; the tag name is now
  optional in the extractor regex (lookahead still rejects `a < b`). Shared across
  all 24 languages.
- **Positional query expression** (`pattern-matcher.ts` `tryMatchPositionalExpression`).
  Matches `<positional> <selector> [<marker> <source>]` (`last <.message/> in #chat`,
  AR `آخر <.message/> في #chat`, TL `huli <.message/> sa_loob #chat`) as a single
  expression. Triggered only when the role starts with a positional keyword
  (first/last/next/previous/random), so other roles are untouched. `scroll`'s
  destination role gained `expression` in its expected types. Also folds a trailing
  `.prop` member access (`previous <input/>.value`).
- **`of`-possessive `set`** (`pattern-matcher.ts` `tryMatchOfPossessiveExpression`).
  `set <prop> of <owner> to <value>` (`*--primary-color of #theme`, AR `… من …`,
  TL `… ng …`) → property-path. **Gated to roles that opt into `property-path`** —
  only `set`'s destination does — so the `of`/source marker can never shadow a real
  source role on other commands (`get data from #input` is unaffected). The leaked
  untranslated `the` is absorbed by the existing `skipNoiseWords`.
- **tl `scroll` keyword alignment.** Transformer emits English `scroll`; semantic tl
  primary is `iscroll`. Added `scroll` as a tl alternative (passthrough-alignment).
- Locked by `semantic/test/multilingual-tier1-features.test.ts` (16 cases across
  en/ar/tl + regression guards).

### Passthrough-alignment batch — or-events + fetch/transition keywords (+11)

- **11 instances, 0 regressions, avg 98.54% → 98.84%.** ar 94.8→95.5, tl 92.9→96.1,
  ko 96.1→99.4. Confirmed by a full `browser-priority` baseline regen (exactly these
  11 patterns flip `↑`, zero `↓`).
- **`multiple-events` (ar, tl) — transformer fix.** `on click or keypress[…] toggle .active`
  hoisted `or keypress` ahead of the command because `parseEventHandler` read `or` as the
  action verb. Fixed by folding `or`-conjoined events into the event role value
  (`EVENT_CONJUNCTIONS`) so `<event1> or <event2>` translates and reorders as one event
  clause that lands at the end (VSO). The semantic parser already accepted the event-or
  clause at the end — only the i18n transformer needed the fix.
- **`fetch` (ko ×3) — keyword alignment.** The i18n ko dict emits `가져오기` for `fetch`,
  but the semantic ko profile's primary is the loanword `패치` (chosen to avoid colliding
  with `get`=얻다). `가져오기` ("bring/fetch") doesn't collide with `얻다`, so it's now a
  semantic `fetch` alternative. Cleared `fetch-with-method`, `fetch-with-method-body`,
  `fetch-formdata`.
- **`transition` (ko ×2, tl ×4) — keyword alignment.** ko: profile primary is loanword
  `트랜지션`; transformer emits `전환` ("switch/transition") — added as a semantic
  alternative (toggle uses `토글`, no collision). tl: transformer emitted `baguhin`, which
  is the semantic tl verb for **morph**; the semantic tl `transition` verb is `lumipat`,
  so the i18n tl dict now emits `lumipat` (morph keeps `baguhin_hugis`). Cleared
  `transition-color`/`transition-transform` (both), plus tl `transition-opacity` and
  `fade-out-remove`.
- **Why this batch and not the rest.** These were the failures where either the i18n
  transformer leaked the wrong token (the recurring **passthrough-alignment** lever) or a
  pure structural reorder bug existed — verifiable as single keyword/transformer edits with
  zero parser-surface change. The remaining 19 each need genuine parser/profile structure
  work (VSO requires a _parseable_ body — unlike en/ko, which pass via degenerate empty-body
  matches — so `set`-of-possessive, positional `last … in`, member-access, `unless` blocks,
  custom-event SOV slots, event modifiers, and he/sw `set`-pattern gaps must each be built
  out). Locked by `grammar.test.ts` (or-events + tl transition) and
  `semantic/test/multilingual-roadmap-fixes.test.ts` (ko fetch + transition).

### qu `install` keyword-collision fix — `install-behavior` (+1)

- **1 instance, 0 regressions, avg 98.51% → 98.54%.** qu 98.1% → 98.7%.
- **Root cause (passthrough-alignment).** The i18n qu dictionary mapped
  `install` → `churay`, but `churay` is also qu for `put`/`set`, and the semantic
  qu profile expects `install` = `tarpuy` (`churay` = `put` there). So
  `install Draggable` transformed to `Draggable ta churay`, which the semantic
  parser read as a malformed `put` (no destination) and rejected. Changed the
  i18n qu dict to emit `tarpuy` (the specific "install/plant" verb already in the
  semantic profile) — this both aligns the two systems and removes the
  put/set/install overload. Verified `Draggable ta tarpuy` parses as `install`.
  Locked by a Quechua case in `grammar.test.ts`.
- **Reusable finding — the keyword-mismatch diagnostic.** A scan comparing each
  i18n dict's command verbs against the semantic profile's primary+alternatives
  surfaces many mismatches, but **most are latent** (the command isn't in the
  test corpus, or the parse survives via normalization/word-order). The qu
  `install` case was special: an _active collision_ (one i18n form, three
  commands) **and** in the corpus **and** failing. When mining this list for more
  wins, cross-reference against the actual failing patterns first.

### issue #259 lineage (pre-this-arc)

- **#258** — reactive `bind` engine fix + Western batch (es/pt/fr/de/it).
- **#262** — Class-B `intercept`/`worker`/`eventsource` keywords (ja/ko/zh/tr/qu/bn/ar/he).
- **#263** — Class-B `bind` i18n grammar reconciliation (verb-final SOV rules; zh `把`-free custom; he custom; zh/he source markers).
- **#264** — possessive property paths for ja/ko (profile-aware possessive matcher).
- **#265** — possessive property paths for bn/qu (`bn: 'র'` marker; qu spaced `particle` + hyphen-tolerant matcher).
- **#266** — possessive property paths for tr (Turkish tokenizer word-boundary guard + spaced genitive).
- **#267** — reactive `bind` for ms/sw/th/tl (keyword + source-marker alignment).

### Track 1 reactive — complete (#269–#271), + Hebrew events (#272)

- **#269** — reactive stragglers: th/tl `intercept`/`worker`/`eventsource` keyword
  wiring + `socket-basic` for he/ru/th/uk/zh (English `socket` alias — the transformer
  emits `socket` verbatim and these profiles only carried the native form). **9 instances.**
- **#270** — `live` blocks (fr/it/pl/ru/sw/uk/vi). Not deep block-grammar after all:
  the i18n transformer emitted a `live` form the semantic profile didn't list
  (fr `vif`, it `vivo`, …). Added each as a semantic alternative; for sw/vi the
  emitted form was multi-token (tokenizer-splitting) so the i18n dict was changed to
  a single-token form (sw `mubashara`, vi `live`). **14 instances.**
- **#271** — `when` blocks (ar/he/ja/pl/qu/tr). `when <cond> changes <body> end`
  parses as an event-handler whose leading `when` conjunction must be recognized:
  pl pattern keyed on `gdy` vs emitted `kiedy`; qu/ar/he/tr had no/incomplete
  event-handler patterns (added prefix `{when} {event} {body}` patterns); ja needed
  the dict `when` form `とき`→`時` (`とき` starts with the particle `と`, which the
  char-tokenizer's particle extractor ate). **12 instances.**
- **#272** — Hebrew DOM event-name recognition. The he tokenizer knew Hebrew event
  names but not the English `load`/`resize`/`scroll`/`keydown`/`mousedown`/`mouseup`
  the transformer passes through verbatim. Registered them as he tokenizer extras.
  **14 instances** — he 85.7% → 94.8%, no longer a laggard.

Net so far this arc: **49 instances**, avg **96.2% → 97.5%**. The recurring winning
move was **passthrough-alignment**: when the i18n transformer emits a token verbatim
(English, or a form not in the profile), register that exact token on the semantic
side rather than "fixing" the transformer.

### Phase 1 — `@attr` / `*style` tokenizer fix (ar/tl `set-*` family)

- **17 instances, 0 regressions, avg 97.5% → 97.9%.** ar 87.0% → 92.9%, tl 84.4% → 89.6%.
- **One-line root cause, shared fix.** The semantic tokenizer's `CssSelectorExtractor`
  (`packages/semantic/src/tokenizers/extractors/css-selector.ts`) handled `# . [ <`
  but not `@` or `*`, so `@disabled` / `*opacity` / `*--primary-color` split into
  `@`+`disabled` etc. and never filled a role (exactly the bug the `$greeting`
  `variable-ref` extractor was written to avoid). Extended the extractor to keep
  `@[a-zA-Z_][\w-]*` and `*(?:--)?[a-zA-Z_][\w-]*` as single selector tokens.
  The `*` regex requires a letter/`_`/`--` immediately after `*`, so multiplication
  (`a * b`, `2 * 3`) and globs (`*.css`, `/api/*`) — always space/`.`-delimited in the
  corpus — are never mis-extracted.
- This is shared across all 24 languages but only flips ar/tl (every other language
  either passed already or routes `set` through a hand-crafted pattern / a different
  command). Cleared: `set-attribute`, `set-style`, `set-opacity`, `set-transform`,
  `default-value`, `tabs-aria`, `toggle-visibility`, `announce-screen-reader` (both
  ar/tl), plus a bonus ar `transition-color` (uses `*background-color`).
- **Roadmap note corrected:** the earlier "degenerate empty-body match" / "needs
  per-language @attr handling" framing was wrong. en parses the body fine; the bug was
  purely tokenizer-level token-splitting, fixable once in the shared extractor.
- **Still failing (→ Phase 4):** `set-color-variable` (`set the *--x of #y …` —
  untranslated article `the` + `of`-possessive) and `input-clear`
  (`<input/>.value` member access on a selector).

### Phase 2 — `js-inline` block masking (ja/ko/qu/tr)

- **4 instances, 0 regressions, avg 97.9% → 98.05%.**
- **Root cause:** the i18n transformer parsed `on click js console.log("from js") end`
  as one statement with action `js` and the JS body + `end` as the patient role, then
  reordered it — hoisting the raw JS ahead of the event
  (`console.log(...) 終わり を クリック で JS実行`).
- **Fix (`transformer.ts` → `tryTransformJsBlock`):** intercept `[on <event>] js <raw js> end`
  at the top of `transform()`, before any splitting. The raw JS body is masked behind an
  opaque placeholder so the surrounding event-handler head reorders normally; the
  placeholder is then replaced with `<translated js> <verbatim body> <translated end>`.
  Single-line only for now (multi-line js bodies — e.g. behavior `js(me) … end` — are
  handled with the Phase 5 behavior work). Locked in by a grammar.test.ts case.
- Correct output, e.g. ja: `クリック で JS実行 console.log("from js") 終わり`.

### Phase 3a — event guards + English DOM event passthrough

- **3 instances, 0 regressions, avg 98.05% → 98.13%.** sw `blur-element`,
  `focus-trap`, `keydown-key-is-syntax`.
- **Two coordinated fixes:**
  1. **i18n transformer** — the tokenizer split event guards on internal spaces
     (`keyup[key is 'Escape']` → `keyup[key` / `is` / `'Escape']`, mis-reading
     `is` as the action verb), and `translateMultiWordValue` translated keywords
     _inside_ `[...]` (`is` → sw `ni`). Made `tokenize()` bracket-aware and mask
     `[...]` guard spans from translation (verbatim, private-use sentinels).
  2. **framework base tokenizer** — registered the standard English DOM event
     names (`keyup`/`keydown`/`resize`/…) as universal `!has`-guarded fallbacks in
     `initializeKeywordsFromProfile`. The transformer passes these through
     verbatim (no native dictionary form), so non-English token streams treated
     them as bare identifiers and guarded handlers failed. Generalizes the
     per-language Hebrew registration from #272 to all 24 languages at once.
- **Verified safe:** full semantic suite (5260 pass; only the environmental
  `build-artifacts` `.d.ts` checks fail) and all 759 framework tests pass.
- **Remaining Phase 3 (deferred — genuinely deep, heterogeneous):**
  `event-key-combo` (ja/ko/qu/tr) and `repeat-until-event` (hi) need
  **event-handler-body block masking** (`if…end` / `repeat…end` inside a handler
  reorder into the role soup); `window-resize` (qu/tr) needs **event-modifier**
  handling (`from window debounced at 200ms`); `multiple-events` (ar) needs
  **`or`-conjoined events** in VSO; `on-custom-event-receive` (ko/qu) needs
  custom-event + `put…into me` reorder; `focus-trap` (tr) needs the body-block
  work too. Each is a separate transformer enhancement, not a shared fix.

### Phase 4 — caret variable token-split (ar/tl)

- **2 instances, 0 regressions, avg 98.13% → 98.19%.** ar/tl `caret-var-write`.
- **Root cause:** the `variable-ref` extractor kept `:local` / `$global` together
  but not `^caret`, so `^count` split into `^` + `count` and never filled a role
  (same class as Phase 1's `@`/`*`). Added `^` (identifier-start required, so the
  XOR operator `a ^ b` is never mis-extracted). Locked by a variable-ref.test.ts
  case. `caret-var-on-target` still fails — its `… on #host into me` destination
  reorders (separate issue, below).

### Track 4 — Scattered per-language remainder (deferred, ~deep)

After Phases 1–4 the non-behavior failures left are all genuinely deep, each its
own transformer/parser project (no shared lever remains):

> **`transition-*` / `window-resize` (the "modifier" cluster):** attempted and
> found to need a deliberate refactor (the `*style` patient is a selector the
> transition schema rejects; the `duration` role lands after the event clause).
> Full design in **[TRANSITION_MODIFIER_REFACTOR_PLAN.md](TRANSITION_MODIFIER_REFACTOR_PLAN.md)**
> — slated for its own session.

- **method-call / member-access — DONE (+5).** `my.value.toUpperCase()` /
  `my.getAttribute("data-id")` (ar/sw/tl). The possessive-dot matcher
  (`tryMatchPossessiveExpression`) expected the trailing call as a single `(...)`
  token, but the tokenizer splits it into `(` / args / `)`. Changed it to consume
  the call by balanced-paren count. The diagnostic detour: the bare semantic
  `parse()` fails this even in en, but the harness wraps in an event handler
  (`on input …`) whose body path parses it — so en passed all along and the fix
  was purely making ar/sw/tl's possessive path consume the split parens. Locked by
  possessive-value-fillers.test.ts.
- **event-handler block body — DONE (+5).** `event-key-combo` (ja/ko/qu/tr) +
  `repeat-until-event` (hi). `on <event> {if|repeat|…} … end` had its block body
  shredded across the event handler's roles by `parseEventHandler`. Added
  `tryTransformEventWithBlockBody` (i18n): mask the block, reorder the event head,
  transform the block as a self-contained unit (`transformBlockBody`), and emit
  **event-clause first, then block** — even in verb-first (VSO) languages, since
  the semantic parser only matches a block body after the event. Event heads with
  a `from <source>` modifier are excluded (the source/event ordering differs by
  word order and the existing path already parses them) — this keeps
  `window-keydown` / `focus-trap` unregressed. Locked by a grammar.test.ts case.
- **Still open here:** `focus-trap` (tr), `window-resize` (qu/tr) — event-block
  bodies _with_ a `from <source>` clause; need event-first + source ordering for
  VSO. `multiple-events` (ar) needs `or`-conjoined events.
- **put before/after — DONE (+2, tl).** Only tl failed (ar/es/en parse). Two
  causes: (1) tl's destination role-marker had no before/after alternatives, so
  the generated put pattern couldn't match a before/after target — added `bago`
  (before) / `matapos` (after) as destination alternatives, mirroring Arabic's
  قبل/بعد. (2) the i18n tl dict emitted `pagkatapos` for positional "after", which
  is _also_ tl "then" — switched it to the unambiguous `matapos` (matching the
  semantic profile). Locked by tagalog-idioms.test.ts.
- **`transition-*` `over <dur>` modifier** (ko/tl) — `over 500ms` modifier is
  dropped/misplaced in word-order reorder.
- **`scroll to last <sel> in …`** (last-in-collection; ar/tl) — `scroll to` +
  positional `last` + `in` source structure. (Tag-less `<.class/>` query selectors
  also tokenize whole now would help, but the structure is the real blocker.)
- **`unless <cond>`** (ar/tl) — the condition (`I match .disabled`) keeps English
  `I`/`match` and the `unless` block isn't reassembled.
- **`put … before/after`** (tl) — `after` → `pagkatapos` collides with `then`.
- **caret-var-on-target, announce-screen-reader (he/sw), set-color-variable,
  input-clear, form-disable-on-submit, multiple-events** — destination/compound
  reorder + article/`of`-possessive + `or`-events (see Phase 3 notes).

---

## Remaining work

### Track 5 — Parse fidelity (parse rate ≠ faithful) — NEW, tracked

The non-behavior parse rate hit 100% (all 24 priority languages), but that metric
counts a **non-null** parse, not a **faithful** one. A complex pattern can parse
non-null while dropping most of the source's commands. The clearest example is
`focus-trap`: nominally green in 24 languages, but the `if/focus/halt` body
collapses to a bare `if` / stray `from` in most — faithfully parsed in ~1 (English).

A structural **fidelity** signal now makes this visible
(`packages/testing-framework/src/multilingual/fidelity.ts`): for each translation,
the fraction of the English reference parse's command actions that survive (recall,
word-order agnostic). Passes below 50% fidelity are **degenerate passes**.

**Current state (committed baseline carries `avgFidelity` / `degeneratePasses`):**
~**159 degenerate-pass instances across ~47 patterns** (was 232; −9 from the
post-event then-chain fix, −4 from the de fetch keyword alignment, −38 from the
Tier 1 if/else block-body fix, −5 from the Async Tier 1 `async`-modifier fix,
−4/+7 from the then/end keyword fix (−4 `fetch-loading-state` faithful, +7 Bucket B
behaviors that now _parse_ — a parse-rate win), −20 from the juxtaposed
multi-command body fix — all below).
Triage (`packages/testing-framework/tools/fidelity-triage.ts`)
confirmed the signal is **real** — these are genuinely dropped commands, not a
metric artifact — and isolated **two roots**: (A) the i18n **transformer** scrambles
SOV `if <subj> is <pred>` conditions, interleaving the following command into the
condition so the translated _text_ is broken (`if-empty`/ja, `input-validation`/ko
→ 0.00); (B) the semantic **parser** drops the post-event `then`-chain in
command-first (VSO/SOV) event bodies (`fetch-loading-state`/ar → 0.40). Root B is
**fixed** (below); Root A is partially addressed (the `is empty` predicate
alignment, below) but the bulk remains. The remaining clusters:

> **Key triage insight (don't expect quick degenerate-count wins from Root A).**
> Root A is **not one fix** — conditional parsing breaks _differently per language_
> and across three layers (i18n transformer / semantic profile keywords / parser
> condition-boundary), e.g. **de** `wenn`→`if` collides with `when` (and tests assert
> `wenn`); **fr/pt/id/zh/pl** drop the `empty` adjective predicate (fixed); **ar/ja/ko**
> fully collapse (transformer scrambles SOV `if <subj> is <pred>` _and_ the parser
> doesn't parse SOV conditional bodies). Crucially, the **degenerate-pass count only
> moves on the fully-collapsed (<0.5) cases** (ar/ja/ko/de) — the "close" cases
> (fr/pt/… at 0.75) lift avgFidelity but stay above the 0.5 threshold. And part of
> the `if-*` signal is **metric-entangled**: even the English reference shallow-parses
> `is empty` as the `empty` _command_, so the predicate match is convention, not deep
> fidelity. Net: Root A is a sustained, multi-PR, per-language effort; the big
> degenerate-count wins require the hard SOV transformer + parser conditional work.

The remaining clusters:

| Cluster                     | Examples (langs)                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| control-flow blocks         | `if-empty` (5), `unless-condition` (2) — `if-exists` (0) + most `if-empty`/`input-validation` cleared by Tier 1                        |
| fetch lifecycle / state     | `fetch-loading-state` (9), `fetch-with-headers` (5), `fetch-json` (4), `fetch-do-not-throw` (3)                                        |
| async / streaming           | `async-block` (8 — was 13, ar/de/it/th/tl cleared by Async Tier 1; SOV+zh+fr/pt+ms remain), `socket-basic` (9), `eventsource`/`worker` |
| validation / forms          | `input-validation` (2 — was 14, cleared by Tier 1), `form-submit-prevent` (9)                                                          |
| positional / possessive-dot | `first-in-parent` (5), `its-value-possessive-dot` (4)                                                                                  |
| event modifiers / behaviors | `event-debounce`/`event-once`, `behavior-*` (degenerate in the langs where they parse)                                                 |

**How it's tracked (ratchet, not crash-project).** The `--regression` CI gate fails
when a **faithful** baseline pass becomes a **degenerate** pass (tolerance 3, mirroring
the parse-rate ±2pt tolerance). This prevents backsliding without demanding the 232 be
fixed at once. Improvements (fail → degenerate-pass, or degenerate → faithful) never
fail the gate. After an _intentional_ fidelity change, regenerate the baseline.

**How to resolve (gradually, after triage).**

1. **Validate the signal first.** Fidelity is a heuristic (action-set recall). Before
   "fixing" a cluster, confirm low scores mean genuinely lost commands, not a metric
   artifact (a language that legitimately uses fewer command nodes, or an English
   reference that itself parses oddly). Spot-check a sample per cluster.
2. **Highest leverage = block-body transform.** Most degenerate clusters share one
   root: the i18n transformer shreds/mistranslates a block body (the same class of bug
   the trailing-event wrapper #283, caret-mask #285, and focus-trap from-source #286
   each chipped at). A general "faithful block-body transform" (mask block → reorder
   head → transform body as a unit → translate inner keywords) would lift many clusters
   at once. Validate with the fidelity signal + a full regen (watch for the usual
   stale-DB / flaky-harness traps — see Gotchas). **See the validated spike below —
   the hypothesis holds structurally but lands in tiers, not one PR.**
3. **Prioritize by language-count × value.** After Tier 1 + Async Tier 1, the biggest
   remaining are `socket-basic`/9, `form-submit-prevent`/9, and `fetch-loading-state`/9.
   `async-block` is down to 8 (Async Tier 1 cleared the VSO/SVO/V2 slice; SOV+zh+fr/pt
   are Async Tier 2). The if-block cluster is mostly cleared — residue is the SOV
   `is <pred>` / ja-ko `if`-wrapper class (Tier 2).

**Spike finding (validated, this session) — the if-block shred is one root but**
**fragments by word order + condition shape; build it in tiers.** A controlled
spike (replicating the harness `maskSpans → GrammarTransformer → parse` pipeline on
`if-empty`/`if-exists`/`input-validation` across ja/ko (SOV), ar (VSO), de (V2),
it (SVO)) confirmed the transformer flattens the whole `if … end` into one token
stream and reorders the body **into** the condition. But the damage is _not_ uniform,
so a single transform won't clear all conditional clusters cleanly:

- **`if <subj> exists` (if-exists, 13).** SOV ja/ko/de are already near-faithful
  (~0.83 — only the `if` wrapper is lost; body `show/make/put` survives). **Only
  VSO/SVO (ar, it) fully shred** to `[on, if]`. Also `else` leaks **untranslated**
  here (`#modal else を 表示`) even though it _is_ translated in input-validation
  (`そうでなければ`) — a structure-dependent else-handling inconsistency.
  → **Tier 1 — SHIPPED** (see Shipped → "Track 5 Tier 1"). The real blocker turned
  out to be the **parser**, not just the transform: a fused event pattern captured
  `if` as the action and dropped the whole block body. Fixed in `buildEventHandler`
  (parse the trailing block body) + the i18n `else`-split/translation + an `else`-aware
  compound-fallback gate. `if-exists` cleared (ar 0.40→0.80, it 0.40→1.0) and the fix
  generalized to `if-empty`/`input-validation`/`unless-condition` across 13 langs
  (−38 degenerate total).
- **`if <subj> is <pred>` (if-empty 16, input-validation 14).** Harder. SOV ja/ko
  **fully collapse** (only the event leaks as a bare command) because the transformer
  strands the **predicate** (`空`/empty) _after_ the verb and interleaves the body
  into the condition; ar/it keep only `[on, if]`; de keeps `[on, add]` (drops
  `if`+`empty`, plus `wenn`→if collides with `when`, asserted by tests).
  → **Tier 2 (partially overtaken by Tier 1):** the if-block parser fix already
  cleared the **SVO/VSO** slice (ar/it/ru/uk/… `if-empty`+`input-validation` flipped
  to faithful), so the residue is the **SOV ja/ko fully-collapse** case + **de**. It
  still needs keeping the SOV `<subj> is <pred>` condition **contiguous** (predicate
  not pushed past the verb), the ja/ko `if`-wrapper recovery, and per-language keyword
  fixes (de `wenn`/`when`; the `is empty` adjective — partially shipped). Remaining
  degenerate: `if-empty` (de,he,ja,ko,sw), `input-validation` (ja,ko).
- **`async-block` (13) is a separate root** — `async` is a command _modifier_ the
  transformer mis-reorders as a verb, not an if-block. **Async Tier 1 SHIPPED**
  (see Shipped): the parser now strips the transparent `async` keyword, clearing the
  VSO/SVO/V2 slice (ar/de/it/th/tl, −5). SOV (ja/ko/bn/qu/tr) + zh + fr/pt remain
  (Async Tier 2). Don't fold it into the if-block transform. **The SOV remainder
  (verb-first event body) is scoped as its own project — see
  [SOV_REORDER_SCOPE.md](SOV_REORDER_SCOPE.md).**

Net: the block-body transform is worth building, but as an **if/else conditional
masking transform** delivered in two tiers (if-exists-class, then is-pred-class),
not one sweep. Tier 1 (`if-exists` ar/it via if/else mask + `else` translation) is
the recommended first PR of the arc.

**fetch keyword alignment — ja shipped, zh still deferred.** The de fetch fix
found the same i18n-emits-the-get-word collision in **ja** (`取得`) and **zh**
(`获取`).

- **ja — SHIPPED** (see Shipped → "fetch keyword alignment: ja"). The SOV
  verb-first reorder fix removed the `async-block`/ja blocker (`フェッチ` now leads a
  **patient-first** SOV body, not a verb-first one), so the `取得`→`フェッチ` dict edit
  landed clean: −2 degenerate, ja `avgFidelity` 0.859→0.893, 0 regressions.
- **zh — still deferred (inert).** `抓取` is the correct semantic fetch primary, but
  it still fails to parse as `fetch` _inside the event-handler block body_ (confirmed
  post-fix: `fetch-basic` stays degenerate `{on}`), so the dict edit is inert for the
  metric until the zh block-body parse gap is closed. (`id` has an inert `ambil`/`muat`
  mismatch with no corpus fetch patterns — latent, lowest priority.)

Diagnostic for the next session: a 24-lang scan comparing each i18n `fetch`
emission against the semantic profile's fetch primary/alternatives isolates these
in seconds (the de PR's investigation). Cross-reference the live degenerate list
before investing — most keyword mismatches are inert.

Definition of done for this track: degenerate-pass count trends toward 0 with avg
fidelity → 1.0, gated by the ratchet so it never grows.

### Track 2 — Bucket B behaviors (24)

`behavior-removable` (11), `behavior-sortable` (5), `behavior-draggable` (4),
`behavior-resizable` (4). These fail across many languages **and** are
pre-existing unimplemented behaviors (CI marks them `continue-on-error`).
This is a **runtime feature track** (implement the behavior), not a parsing/i18n
fix. Largest single pattern is `behavior-removable` (fails in 11 langs incl.
high-rate de/es/fr/it/pt) — worth checking whether it's a _parse_ issue (the
`install … removable` syntax) separable from the unimplemented-runtime issue.

### Track 3 — Deep per-language grammar

> **Historical analysis below; the live remainder is the 11 in "Current state".**
> The Tier 1 batch cleared `last-in-collection`, `set-color-variable`, and
> `input-clear` (ar+tl); the passthrough batch cleared `multiple-events`,
> `fetch`, and `transition`. The notes here are kept as a record of approaches.

- **`set-*` family (ar+tl): DONE.** Phase 1 fixed the `@attr` / `*style`
  token-splitting in the shared `CssSelectorExtractor`; Tier 1 then cleared the two
  stragglers — `set-color-variable` (the `of`-possessive `set` matcher, with the
  leaked `the` absorbed by `skipNoiseWords`) and `input-clear` (member-access on a
  queried element). See Shipped → Tier 1.
- **possessive-dot (`.`):** `get-attribute-possessive-dot`,
  `method-call-possessive-dot` (ar/sw/tl) — member-access `.` chains.
- **`caret`** (caret-var-write/on-target; ar/tl), **`transition-*`**
  (color/opacity/transform; ar/ko/tl), **`announce-screen-reader`** (ar/he/sw/tl —
  uses `set @role` + a compound body).
- **`js-inline` (ja/ko/qu/tr):** the transformer **mangles** the `js … end` block,
  reordering the JS source (`console.log(...) 終わり を クリック で JS実行`). The
  block body needs masking from word-order transformation.
- **`event-key-combo` (ja/ko/qu/tr):** complex SOV event + `keydown[key=="…"]` +
  conditional. `put-before`/`put-after` (tl) hit a keyword collision
  (`after`→`pagkatapos`, which is also tl's `then`).

**Approach if resumed:** these are individual transformer/parser fixes, not a
cluster sweep. Highest tractability-to-value is probably **`js-inline` block masking**
(one transformer fix, 4 langs) — but verify it's not just another degenerate match
first. The `set-*` family is the biggest count but the lowest value (best case is
en-parity degenerate matching).

### Why the rest is hard (investigation notes, this arc)

- The harness's success criterion is **non-null parse**, so some en patterns "pass"
  with a **degenerate empty-body** event-handler match (`set-@`/`*`). Replicating that
  for other langs is legitimate by the metric but low-value and fiddly.
- `@attr` / `*style` tokens are not handled by the language tokenizers in event-handler
  bodies; a simple-var body (`set $x to true`) parses where `set @disabled to true` does not.
- VSO/SOV event-handlers put the event at the end / reorder the body; combined with
  unparseable body tokens, the whole handler match fails (not just the body).

---

## Playbook (proven this session)

1. **Edit source** (semantic profiles `packages/semantic/src/generators/profiles/{lang}.ts`,
   schema `command-schemas.ts`, and/or i18n `packages/i18n/src/grammar/{transformer,profiles/index}.ts`).
2. **Rebuild** the packages you touched: `cd packages/<pkg> && npx tsup` (i18n, semantic),
   and `cd packages/core && npx rollup -c` (rebuilds `dist/multilingual` — needed because
   the harness parses via `@hyperfixi/core/multilingual`).
3. **Probe** before the full run — transform + parse a single pattern:
   ```js
   import { GrammarTransformer } from '@lokascript/i18n'; // (langs WITH grammar profile)
   import { parse } from '@lokascript/semantic'; // raw parse (no confidence gate)
   ```
   For langs WITHOUT an i18n grammar profile (currently **ms** — check
   `profiles` export in `i18n/src/grammar/profiles/index.ts`), generated text comes from
   keyword substitution derived from the **semantic** profile, not the transformer.
4. **Repopulate** the DB: from `packages/patterns-reference`, run
   `npm run db:init:force && npm run sync:translations` (skip `seed:llm` — it needs
   network and doesn't affect the harness's `pattern_translations`).
5. **Regenerate baseline:**
   `npm run test:multilingual --prefix packages/testing-framework -- --full --bundle browser-priority --save-baseline`
6. **Verify** the diff vs `HEAD` baseline: only intended langs/patterns flip, **zero `↓`**.
7. **Restore the binary DB** before committing: `git checkout packages/patterns-reference/data/patterns.db`
   — **do not commit it** (CI repopulates from source; committing semantic/i18n source is sufficient).
8. Run `npm test --prefix packages/i18n` and the semantic suite (the
   `build-artifacts.test.ts` `.d.ts` failures are environmental — they pass in CI).

---

## Gotchas (hard-won — read before resuming)

- **Verify via `MultilingualHyperscript.parse()` returning non-null**, not semantic's
  `parse()` confidence — that's the harness's success criterion.
- **Align the `bind` (and any reactive) source `markerOverride` to what the i18n
  transformer _emits_, not the dictionary's "to".** `add` has no override (permissive
  default); `bind` carries explicit per-language markers that silently reject a
  mismatched marker. Lessons: de `zu`, it `in`, sw `kwa` (not `kwenye`), ms `to`
  (no grammar profile → English prepositions survive), th `ใน`.
- **Stale-DB / baseline catch-up:** a committed baseline can lag source because CI's
  `multilingual-validation` gates on _regressions only_ (improvements pass silently).
  Always `db:init:force` + regen to see true state; a refresh alone can flip already-fixed
  patterns (seen with vi in #262-era, qu in #265-era).
- **Possessive `'s`** is handled by `tryMatchPossessiveSelectorExpression` in
  `pattern-matcher.ts`: it reads the profile's `possessive.marker` (particle/punctuation),
  restricts the property to an _identifier_ (so `#button の .active` isn't mis-read),
  and strips a leading hyphen for agglutinative markers (qu `-pa`). Non-Latin markers
  (の/의/র) split off the selector automatically; **Latin markers must be spaced**
  (`'particle'` type in the i18n `POSSESSIVE_MARKERS`, e.g. qu/tr) or they glue to the selector.
- **Turkish tokenizer** greedily prefix-matched short suffix markers (`de`/`te`/…) inside
  content words (`değer`→`de`+`ğer`); fixed with a word-boundary guard in
  `tokenizers/extractors/turkish-keyword.ts`. Watch for similar in other agglutinative langs.
- **Keyword collisions:** run `packages/semantic/test/keyword-collisions.test.ts` after
  adding keywords (caught tr `bağla`=bind/connect, bn `যুক্ত`). When no collision-free
  native verb exists, keep the English form as primary (tr/qu `bind`).
- **Don't run `generate:language-assets`** for focused batches — it syncs all drift into
  one unreviewable diff. Hand-edit the specific entries.
- **Passthrough-alignment (the #269–#272 winning move):** when the transformer emits a
  token verbatim — English (`socket`, `load`), or a dictionary form the semantic profile
  doesn't list (`vif`, `kiedy`) — register **that exact token** on the semantic side
  (profile alternative, tokenizer extra, or event-handler pattern literal). Don't "fix"
  the transformer. Probe the actual transform output first; assumptions about what it
  emits are often wrong.
- **Char-tokenizer particle greediness (ja/th/zh):** a keyword that starts with a
  particle (ja `とき` starts with `と`) gets eaten by the particle extractor. Prefer a
  single-token form with no leading particle (ja `時`), set via the i18n dict.
- **Multi-token keywords don't tokenize (vi/sw and most char-langs):** the tokenizer
  splits on hyphen/space, so `trực tiếp` / `moja_kwa_moja` never match. Use a single-token
  emitted form (English loanword, or a one-word native synonym already in the profile).
- **Degenerate empty-body matches:** an en pattern can "pass" (non-null) while its body is
  unparsed (`set @attr` inside `on click …`). Before chasing such a pattern in another
  language, check whether en actually parses the body — if not, the win is hollow.

---

## Suggested sequencing for fresh sessions

Track 1 (reactive) is **done** (#269–#271); Hebrew events done (#272); `js-inline`
block masking is **done** (Phase 2 — the old item 1 here was stale). What remains is
**not** quick — almost everything left is structural SOV/VSO body reordering. Pick
deliberately:

1. **Bucket B behaviors** (24, biggest lever) — separate **runtime** track. Note
   `behavior-removable`'s `raw_code` is the behavior _definition source_, which
   contains a **multi-line `js(me) … end`** block; Phase 2 only masked single-line
   `js`, so this needs multi-line-js masking inside `behavior` defs (deferred
   "Phase 5"). Not a cheap parse win.
2. **`transition-*`** (ko/tl, ~6) — **deeper than the refactor plan claimed** (see
   the ⚠️ update at the top of `TRANSITION_MODIFIER_REFACTOR_PLAN.md`): needs new
   post-verb-role SOV/VSO event-handler pattern variants, not a marker tweak.
   Multi-session, low ROI.
3. **`set-*` family** (ar/tl, ~10) — biggest non-behavior count but lowest value
   (en-parity degenerate match) and needs `@attr`/`*style` token handling in
   event-handler bodies.
4. **Scattered per-language** (caret, possessive-dot, announce, unless, multiple-events)
   — one pattern at a time; expect tokenizer/transformer work per item.
5. **SOV `repeat-*` loop bodies** (ko/bn/qu, ~6) — block loops
   (`repeat forever/while/for … end`) collapse to a bare `repeat` command in SOV: the
   loop keyword is matched standalone and the variant + body + event drop. ko is worst
   (no event-marker particle); ja/tr mostly recover. The loop sibling of the (shipped)
   verb-first event-body and if/else block-body work. **Scoped as its own project — see
   [SOV_REPEAT_SCOPE.md](SOV_REPEAT_SCOPE.md).** Includes a separable quick win: qu's
   `kutichiy` (repeat) keyword collision.

**Structural finding — custom events in SOV (`on-custom-event-receive`, ko/qu).**
`on hello put X into me` parses in SVO (en/es) but fails in ko: `on click …` passes
(`'Got it!' 를 클릭 넣다 나 에`) while `on hello …` fails (`… hello 넣다 …`) — the
_only_ difference is the event token. The SOV event-handler pattern's `{event}` slot
matches a **recognized event keyword** (클릭) but not an arbitrary identifier
(`hello`); SVO works because the leading `on`/`en` marker disambiguates. Fixing it
means letting the SOV `{event}` slot accept a bare identifier (over-match risk) — a
parser change, not a keyword fix.

**Keyword-mismatch mining (low-risk wins, mostly latent).** A diagnostic comparing
each i18n dict verb to the semantic profile's primary+alternatives surfaces dozens
of mismatches, but most are inert (untested command, or parse survives anyway). The
qu `install` win was the rare case that was an _active collision_ AND in the corpus
AND failing. Cross-reference any candidate against the live failing-pattern list
before investing.

Definition of done (unchanged from #259): all languages ≥ ~99% in the regenerated baseline.
Realistically the next ~10–15 points of parse-rate require the deep work above, not
more keyword wiring.
