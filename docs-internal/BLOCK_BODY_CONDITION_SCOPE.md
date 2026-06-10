# Block-body cluster — scope, decomposition & phased plan

> **Status:** Phase 0 (`socket` keyword alignment, −9 degenerate) **SHIPPED**. The
> rest is the recommended approach, not yet implemented.
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
- **B3 — then-chain body after `fetch`/`async` drops.** `async fetch X then put Y`
  and `fetch X … then put Y` lose the trailing `put` (fr/pt emit a phantom `set`).
  The fetch/put keywords are already aligned (verified) — this is the for-loop §2c
  "then-chain body attachment," not a keyword bug.
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

### 3.2 Remaining

- **Phase 1b** — extend predicate vocabulary to the other clean languages; add
  `matches`/`exists` (for `unless I match …`, `if #x exists …`).
- **Phase 1c (transformer + ja/ko/he)** — keep predicates adjacent through the SOV
  reorder (ja/ko) and translate the `value is empty` predicate for he. This is where
  the original "transformer" work actually belongs — scoped, not the whole condition.
- **Phase 3 (B3 then-chain body)** — generalize the existing `BLOCK_BODY_ACTIONS`
  event-body recovery to then-chain/standalone positions (guarded "can only add
  parses, never break"). Shared with the deferred for-loop §2c; clears
  `async-block` / `fetch-with-headers`.

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

**Degenerate total: 92 → 83 (Phase 0) → 79 (Phase 0b) → 77 (Phase 1a).**
