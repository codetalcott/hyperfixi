# Block-body cluster — scope, decomposition & phased plan

> **Status:** Phase 0 (`socket`, −9), Phase 0b (`eventsource`/`worker`, −4), Phase 1a
> (`is empty` vocab for de/sw, −2), Phase 1b (id toggle alignment, −1),
> `get-value` qu/tl keyword alignment (−2), B3 fr/pt marker-less `fetch` (−4), and the
> es/pl/id/sw/he marker-less-`fetch` fidelity sweep (sw `event-debounce` −1, +avgFidelity)
> **SHIPPED** — degenerate **92 → 69**. **Every** remaining degenerate instance now has
> a diagnosis: §3.3 (he/ja/ko conditions) and §3.4 (full inventory of the
> previously-undescribed 17 — masked-keyword quick wins vs deep block/SOV work).
> **`hi bind` was reclassified from "likely-quick" to structural after a measure-first
> probe (see §3.4).**
>
> **Prereq reading:** `MULTILINGUAL_ROADMAP.md` → Shipped; `FOR_LOOP_BLOCK_BODY_DESIGN.md`
> (the proven measure-first / decompose / phase playbook this reuses);
> `ZH_BLOCK_BODY_SCOPE.md`.

## 0. The reframe — "block-body" is three different problems

A pass-by-pattern count of the committed baseline's 92 degenerate instances (before
Phase 0) shows the label "block-body" hides three unrelated tracks:

| Bucket                           | Instances | What it actually is                                                                                                             |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Behaviors** (Bucket B)         | 46        | Unimplemented runtime behaviors (`behavior … end`). Not parsing, not i18n. CI `continue-on-error`.                              |
| **Newer-feature blocks**         | ~24       | `socket/eventsource/worker Name … on X … end` + reactivity (bind/live/intercept). Keyword/profile gaps + nested-handler blocks. |
| **True control-flow block-body** | ~13       | `if` / `unless` / `fetch…then` / `async…end` bodies. **This is the documented cluster.**                                        |

The behaviors are a separate runtime track. The other two are addressed below.

## 1. The true control-flow block-body cluster

Members (committed baseline): `if-empty` (5: de,he,ja,ko,sw), `input-validation`
(2: ja,ko), `unless-condition` (2: he,id), `async-block` (2: fr,pt),
`fetch-with-headers` (2: fr,pt). Probe (en → lang, action sets vs the EN reference)
isolates a **stack** of mechanisms, with one dominant shared root cause:

- **B1 (dominant) — control-flow _condition expressions_ aren't translated/recognized
  in non-English.** `my value is empty` and `I match .disabled` survive as English
  (he: `…שלי value is empty`, `I match .disabled`) or mangle, so the `if`/`unless`
  header never forms and `if`/`unless`/`empty`/`match` all drop. This is the
  **condition analog** of the for-loop spike's header problem (transformer §2a +
  per-language patterns §2b).
- **B2 — the transformer injects a spurious `then`/marker into the block header.**
  de `if-empty` renders `wenn mein wert ist **dann** leer` — a `dann` ("then")
  inside the predicate. Same bug family as the for-loop §2a loop-variable marking.
- **B3 — `fetch`/`put` body after `then`/`async` drops. SHIPPED (fr/pt, −4).** The
  earlier note ("keywords aligned, just then-chain attachment") was **disproved by a
  measure-first probe**: the real blocker is a **marker-less `fetch` pattern gap**. For
  `fetch <url>` (no `from`) the transformer emits a marker-less `récupérer /api/data` /
  `buscar /api/data`, but the generated pattern requires a `de` source marker
  (`chercher de …`), so `fetch` dropped and the body collapsed to a phantom `set`
  (degenerate `{on, set}`, fid 0.33). A handcrafted fr/pt fetch pattern tolerating the
  optional `de` + responseType (mirrors `fetch-ms` / `fetch-zh-ba`) recovers `fetch`:
  `{on, fetch, set}` — fid 0.67, degenerate → faithful (recovering `fetch` clears the
  0.50 floor; the phantom `set` from `put it into me`'s `à`/`para` marker and the
  `then`-chain attachment are **not** needed for the flip). Locked by
  `multilingual-roadmap-fixes.test.ts` ("fr/pt marker-less fetch").
- **B4 (secondary) — `put X into <positional>` destination drop and SOV reorder
  edges.** Low count; absorbed once B1–B3 land.

**Key measurement caveat (carried from the for-loop spike):** the EN reference is
often shallow — `if-empty` EN credits only `{add, empty, if, on, put}`, and
`socket-basic` EN credits only `{socket}`. Fixing a body parse may not move the
_metric_ even when correct, so **measure the action set directly**, not just the
gate's pass/fail.

## 2. Phase 0 — newer-feature keyword/profile gaps (cheap, high count)

These are the focus-keyword family again — emit a word the parser doesn't recognize —
and dominate the count, so they come first (and de-noise the degenerate list so the
real B1 cluster is visible).

### 2.0 `socket` — SHIPPED (this arc, −9)

`socket` (a streaming command) had **no entry in the i18n `commands` dictionaries**
(only `en`), so the transformer emitted the English literal `socket`. The 9 degenerate
languages (ar,bn,hi,ja,ko,pt,qu,sw,tr) use a **native** socket primary in their
semantic profile (`ソケット`, `소켓`, `soquete`, …) that doesn't list the English word —
mismatch, `socket` dropped (fid 0.00). fr/de/es/tl were unaffected because their
profile primary already _is_ `socket`.

**Fix:** add `socket` = the profile native primary to each of the 9 `commands` dicts,
plus `socket`/`eventsource`/`worker` to the `derive.ts` `COMMAND_KEYWORDS` allowlist
(they postdated it, so a `generate:language-assets` regen would otherwise re-drop
them). **−9 degenerate (92 → 83), gate green, 0 regressions** (baseline diff = 9
removals, 0 additions, no parse-rate drops); all 9 reach fid 1.0. Locked by
`multilingual-roadmap-fixes.test.ts` ("socket command keyword alignment").

### 2b `eventsource` / `worker` (hi, tl) — SHIPPED (Phase 0b, −4)

Different mechanism from socket: hi/tl semantic **profiles** had **no
`eventsource`/`worker` entry at all** (the other 22 languages carry an English-literal
primary that matches the transformer's English emission — no language has an i18n dict
entry for these streaming commands — so they parse). The generated pattern didn't
exist, so the command dropped. **Fix (semantic-side):** add the profile entries for
hi/tl (English primary, since the transformer emits the English literal; native
transliteration as alternative for hi). **−4 degenerate (83 → 79), gate green, 0
regressions** (baseline diff = 4 removals, 0 additions, no parse-rate drops); all 4
reach fid 1.0 (EN reference is just `{eventsource}`/`{worker}`). Locked by
`multilingual-roadmap-fixes.test.ts` ("eventsource / worker profile entries").

### 2c `install-behavior` (hi, ru, uk — deferred, NOT a clean keyword gap)

Probed and found harder than a keyword gap — left for a dedicated fix:

- **ru/uk — genuine lexical collision.** `установить`/`встановити` mean both **"set"
  and "install"**; the semantic `set` profile claims the bare word as its primary, so
  `install` was deliberately disambiguated to the compound `установить_пакет` /
  `встановити_пакет`. The i18n dict maps `install`→the bare word, so the transformer
  emits `установить`, which the parser resolves to **`set`**. Aligning the dict to the
  compound (`установить_пакет`) was tried and **still resolves to `set`** — the
  underscore-compound isn't tokenized/normalized as a unit (the Russian normalizer
  likely reduces it back to `установить`). Needs tokenizer/morphology work or a
  handcrafted `install` pattern, not a dict edit. Reverted.
- **hi — SOV pattern gap.** `इंस्टॉल` already matches the profile primary, yet
  `Draggable को इंस्टॉल` parses to `{into, on}` — the SOV `{patient} को {verb}` install
  form isn't anchored (no generated/handcrafted SOV install pattern). Distinct from the
  ru/uk collision.

3 instances; tracked here, not bundled with the clean Phase 0b win.

## 3. Phases 1–3 — the B1 condition campaign

> **Plan revised after the Phase 1 measure-first probe (see §3.0).** The original
> hypothesis was "transformer-first." Probing showed the transformer is **necessary
> but not sufficient** — the real blocker is the **semantic profile's predicate
> vocabulary**, and the fix is replicating the Spanish profile (the only one that
> ever parsed predicates), not rewriting the transformer.

### 3.0 What the probe found (the actual mechanism)

`if my value is empty …` / `unless I match .disabled …` parse fully in **Spanish**
(`si mi valor está vacío …` → `{add, empty, if, on}`) but in **no other language**.
Why: `spanish.ts` is the **only** profile carrying the **predicate vocabulary** —
`is: 'es'`, `empty: 'vacío'` (the _adjective_), `exists: 'existe'`. Every other profile
has `empty` only as the **command** ("empty the element") and **no `is` keyword**, so
the predicate never forms and the `if`/`unless` wrapper is lost (the body still
recovers via event-extraction, which is why most languages stay _faithful_ — only
de/he/ja/ko/sw fall below 0.50). Critically, **even a hand-cleaned, correctly-ordered
translated predicate doesn't parse** without these keywords — so this is a
**profile-vocabulary** fix, not a transformer fix. (B2's spurious-`then` is real but
secondary; B3 is independent.)

### 3.1 Phase 1a — `is empty` predicate vocabulary (de/sw) — SHIPPED (−2)

Mirror the Spanish predicate vocabulary into the profiles where the translated
predicate is **adjacent and recognizable**: **de** (`ist leer`) and **sw** (`ni tupu`)
— add `is` and the empty **adjective** as an alternative of the `empty` keyword.
`empty` is now recovered, lifting **de/sw `if-empty` 0.40 → 0.60 (degenerate →
faithful)**; **degenerate total 79 → 77 (−2)**, gate green, 0 regressions (incl. the
common Swahili copula `ni`, recognized only in predicate position). Locked by
`multilingual-roadmap-fixes.test.ts` ("`is empty` predicate keywords"). **Deferred
within B1:** **he** (the transformer leaves `value is empty` in **English** — needs a
transformer/dict fix first) and **ja/ko** (SOV reorder **splits** `is`…`empty`, so even
with keywords the predicate isn't adjacent — needs the reorder to keep predicates
intact). These are the next Phase 1b/1c increments.

### 3.2 Phase 1b — `unless-condition` was a hidden toggle keyword mismatch (id) — SHIPPED (−1)

Probing the remaining "condition" cluster turned up a surprise: **id `unless-condition`
isn't a predicate/conditional bug at all.** Even `pada klik ganti .selected` (a _plain_
`on click toggle` with no conditional) recovered only `{on}` — the i18n id dict emitted
`ganti` for toggle while the semantic indonesian profile's toggle primary is `alihkan`
(`ganti` is already `swap`'s alternative there, so it can't double as toggle). With
toggle unrecognized, the body dropped and only `{on}` survived (fid 0.33). Aligning the
dict `toggle: 'ganti' → 'alihkan'` lets the body recover **past** the still-English
`I match .disabled` predicate: `{on, toggle}` (0.33 → 0.67, degenerate → faithful).
**−1 (77 → 76)**, gate green, 0 regressions. Same keyword-gap family as focus/socket —
a reminder to **check for a masked keyword mismatch before assuming a hard parser bug**.
Locked by `multilingual-roadmap-fixes.test.ts` ("id toggle keyword alignment").

### 3.3 Remaining — the genuinely-hard cases

The 6 still-degenerate B1 instances all need deeper parser/transformer work (no masked
keyword wins left — verified):

- **he `unless-condition` / `if-empty`** — the transformer leaves the predicate in
  **English** (`I match .disabled`, `value is empty`); needs predicate-operator/reference
  translation (`I`→me-word, `match`→matches-word, `value is empty`) plus profile
  `matches` vocabulary.
- **ja/ko `if-empty` / `input-validation`** — the SOV reorder doesn't just split the
  predicate, it **collapses the whole event handler to a bare `blur`** (fid 0.00). The
  conditional event-handler + SOV-reordered body needs dedicated parser work — the
  highest-risk item, and the one place the original "transformer/reorder" framing still
  holds.
- **Phase 3 (B3 fetch/put body) — SHIPPED (fr/pt, −4).** Probed and found it was **not**
  a then-chain-attachment problem but a **marker-less `fetch` pattern gap** (see B3 in
  §1). Adding handcrafted fr/pt fetch patterns (optional `de` marker + responseType,
  mirroring `fetch-ms`) recovered `fetch` in `async-block` and `fetch-with-headers`,
  flipping all 4 instances 0.33 → 0.67 (degenerate → faithful). The phantom `set` (from
  `put`'s `into`→`à`/`para` transformer marker, which matches `set` not `put`) and the
  then-chain attachment remain, but are not needed for the flip and are not pursued.

## 3.4 Remaining-work inventory (every degenerate instance has a diagnosis)

The 76 still-degenerate instances break down as: **46 behaviors** (§0, separate Track 2
runtime work), **13 already-scoped** (B1 conditions §3.3, B3 then-chain §3.3,
install-behavior §2c), and **17 that were previously only lumped or undescribed** —
inventoried here from a measure-first probe so none is a black box. All EN references in
this group are shallow (1–4 actions), so recovering the dropped command(s) is usually
enough to clear the 0.50 floor.

### Likely-quick (masked keyword gap/mismatch — the focus/socket/id-toggle family)

| Pattern     | Lang(s) | Diagnosis (one-line)                                                                               |
| ----------- | ------- | -------------------------------------------------------------------------------------------------- |
| `get-value` | qu      | **SHIPPED (−1).** dict `get: chaskiy` had no profile entry → `get` dropped. Aligned to `taripay`.  |
| `get-value` | tl      | **SHIPPED (−1).** dict `get: kuhanin` = base of fetch's `kuhanin_mula` → `get` dropped. → `kunin`. |

`get-value` qu/tl were a clean dict↔profile alignment (id-toggle family): qu {on, copy}
→ {on, get, copy} (0.33 → 0.67), tl {log} → {on, get, log} (0.33 → 1.0), both degenerate
→ faithful. **Degenerate 76 → 74 (−2)**, `--regression` gate green, **0 regressions**
(baseline diff = qu/tl get-value removals only, 0 additions, no parse-rate drops). Locked
by `multilingual-roadmap-fixes.test.ts` ("qu/tl get keyword alignment").

### Structural — `hi bind` (×4): NOT a keyword win (reclassified after probing)

§3.4 originally listed `hi bind` as "add the dict/profile entry." A measure-first probe
proved the keyword add is **necessary but not sufficient** — hi bind is a multi-layer
SOV/transformer structural case, the same track as he/ja/ko §3.3:

| Pattern       | Lang | Diagnosis (probed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bind-*` (×4) | hi   | Needs **all** of: i18n dict `bind` + an i18n hi `bind-to` SOV-reorder rule (hi profile has none, unlike bn/ja/ko) + a semantic profile entry + a `bind` source-marker in the schema + a constraint on the greedy hi-unique `event-hi-bare` pattern (it grabs a leading `$var` as a phantom event, shadowing the SOV-final verb) + **possessive `'s` translation** (hi leaves `#picker's` English where bn/ja/ko emit র/の/의, so 2 of the 4 fail on the possessive source). Without the possessive layer, those 2 flip degenerate-pass → **parse failure** (parse-rate regression). The deep, coupled work belongs to the §3.3 SOV-reorder track, not a quick win. |

### Lexical collision (hard — same shape as ru/uk install §2c)

| Pattern         | Lang | Diagnosis                                                                                                                                                                                  |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `default-value` | tr   | `yükle` means **both** `load` (event) and `install` (command); `on load …` resolves to the install command. Needs disambiguation/tokenizer work, not a dict edit. (EN ref is just `{on}`.) |

### Block/structural parsing (genuinely hard — the deep parser track)

| Pattern                      | Lang(s) | Diagnosis                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `live-derived-value`         | hi      | `live` keyword **is** aligned (`लाइव`) but the `live … end` block still drops it — block-body parse.                                                                                                                                                                                                                                    |
| `live-multiple-deps`         | hi      | Same `live … end` block parse.                                                                                                                                                                                                                                                                                                          |
| `intercept-cache-strategies` | hi      | `intercept` unrecognized **and** a very large multi-clause `intercept … end` block — keyword + block.                                                                                                                                                                                                                                   |
| `event-debounce`             | ar,tl   | **sw SHIPPED** (the marker-less-`fetch` sweep recovered `fetch`, clearing the floor). ar/tl remain: a bare/unquoted URL with `${…}` interpolation (`/api/search?q=${my value}`) fails to tokenize in ar/tl, so the VSO-mid-stream `fetch` drops. (The `debounced` modifier is fronted but not the blocker — the clean-URL body parses.) |
| `focus-trap`                 | pt      | nested conditional + `last`/`first <button/>` positionals + `matches` predicate; `focus` stays English inside the condition (B1-adjacent + positional).                                                                                                                                                                                 |
| `modal-close-escape`         | qu      | SOV/VSO `on keydown[…] from window` event head reorder + multi-command body (`hide`/`remove`) drop.                                                                                                                                                                                                                                     |
| `window-scroll`              | ko      | SOV reorder collapses the `on scroll … if … else … end` handler to a bare `scroll` (same class as ja/ko if-empty, §3.3).                                                                                                                                                                                                                |
| `announce-screen-reader`     | ja      | SOV event head (`on success`) reorder + `@role` attr + trailing `set` drop.                                                                                                                                                                                                                                                             |

**Net (updated after probing):** the get-value qu/tl pair (−2) **shipped** as a clean
keyword alignment. `hi bind` (×4) was probed and **reclassified as structural** (above) —
it joins the deep condition/block/SOV-reorder track (§3.3), not the quick-win set. So no
masked-keyword quick wins remain in this group; everything left is the SOV-reorder/block
track (§3.3), the tr `default-value` collision (§2c family), or behaviors (46, Track 2).

## 4. Risks & validation (every phase)

- **Over-generation is recall-blind.** Each phase needs the new-vs-stashed-old A/B on
  the **same DB** — fidelity alone will not show a phantom command. This is the check
  that gated the focus and socket fixes (with/without diff must be pure removals or
  intended additions).
- **EN-reference shallowness** (§1) — measure action sets directly.
- **Baseline:** an intentional fidelity change means regenerating the committed
  baseline once, with a clean A/B confirming only the intended rows move; per repo
  convention `patterns.db` is _not_ committed (CI re-populates).

## 5. Sequencing recommendation

1. **Phase 0** — done (`socket`, −9). Cheapest, largest single win.
2. **Phase 0b** — done (`eventsource`/`worker` hi/tl profile entries, −4).
   `install-behavior` (−3) was probed and **deferred** (§2c) — a lexical
   set/install collision (ru/uk) + an SOV pattern gap (hi), not a clean keyword fix.
3. **Phases 1–3** — the B1 condition campaign (~13 instances), multi-PR, transformer-
   first. Expect modest headline-metric movement due to EN-reference shallowness — a
   reason to treat Phase 0/0b as the priority and the condition work as a deliberate,
   gated arc rather than a quick win.

**Degenerate total: 92 → 83 (Phase 0) → 79 (Phase 0b) → 77 (Phase 1a) → 76 (Phase 1b)
→ 74 (get-value qu/tl) → 70 (B3 fr/pt marker-less fetch) → 69 (es/pl/id/sw/he
marker-less-fetch fidelity sweep; sw event-debounce).**
