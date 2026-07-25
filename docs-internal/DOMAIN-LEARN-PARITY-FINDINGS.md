# domain-learn: what the parity measurement actually found (2026-07-24)

Written while closing item 3 of `HANDOFF-learn-parity-and-markers.md`. The
decision taken was option (a) — add the drift lock, move no parse patterns — and
this records the measurements behind it, because **the brief's premise about
what blocks domain-learn parity turned out to be wrong**, and the next person to
pick this up should start from numbers rather than from that premise.

The lock is `packages/domain-learn/src/__test__/schema-renderer-parity.test.ts`.

## The brief's premise, and what replaced it

Both `HANDOFF-learn-parity-and-markers.md` and its predecessor say the blocker is
that `renderLearn` glues the SOV particle to its value with no space
(`` `${destination}${marker}` `` → `#buttonに`), which `buildPhrase` cannot
express, and that closing it needs a new `RoleSpec` field (`glueMarker: true`).

Measured over all 300 cells — 15 commands × 10 languages × {all roles, required
only} — the glue is **14 of 231 divergent cells**:

| divergence            | cells | what it is                                                       |
| --------------------- | ----- | ---------------------------------------------------------------- |
| identical             |  69   | —                                                                |
| **verb-form**         | **126** | schema writes the dictionary form, `renderLearn` the imperative  |
| marker-presence       |  43   | `renderLearn` writes a marker the schema omits                   |
| marker-vocabulary     |  22   | both write a marker, but a *different* one for the same role     |
| **role-order**        |  20   | the two disagree on which role comes first — a real defect       |
| verb-and-glue         |   9   | verb form *and* glue                                             |
| marker-absence        |   6   | the schema writes a marker `renderLearn` omits                   |
| glued-marker          |   5   | glue alone                                                       |

So `glueMarker: true` would have moved parity from 23% to about 25% and closed
nothing structural. The dominant divergence is the **verb form**, and it is not
an oversight — domain-learn is a language-*learning* DSL, so `renderLearn`
deliberately writes the commanding form from its own conjugation tables
(`agrega`, `füge hinzu`, `追加して`) while the schema renderer writes the
profile's dictionary form (`agregar`, `hinzufügen`, `追加`). No `RoleSpec` field
declares a per-language imperative, so this is not closable with schema data at
all. It is the same shape as the bdd finding in
`HANDOFF-parity-and-marker-tail.md` § "What tranches 1–2 actually found" —
lexicalization that lives in the renderer, one level up (keywords, not values).

This is that document's own lesson repeating: **run the probe for triage, but
classify with real output before deciding what a gap IS.**

## The finding that matters more than parity

`renderLearn`'s output is not parseable by domain-learn's own parser in half of
all cases. Rendering each command with every role it has, then feeding the
result back to `createLearnDSL().parse`:

```
  en 14/15    es 13/15    pt 13/15    ar 12/15    zh 12/15    fr 11/15
  ja  0/15    ko  0/15    tr  0/15    de  0/15
  TOTAL 75/150
```

Four languages are at zero. This is below the parity question entirely: the tool
shows a learner a sentence it cannot itself read back.

The causes are separable, and only one of them is the glue:

- **de — verb form alone.** All 15 German imperatives are separable-verb forms
  (`hinzufügen` → `füge hinzu`, `umschalten` → `schalte um`, `festlegen` →
  `stelle ein`) and none is listed in the profile's keyword `alternatives`.
  Confirmed by isolation: `hinzufügen .x zu #a` parses; `füge hinzu .x zu #a`
  does not. Nothing else is wrong with de — adding the alternatives would take
  it from 0/15 to near 15/15.
- **ko — verb form (14/15) plus glue.** The profile carries `추가`, the renderer
  writes `추가해`. Some are outright vocabulary drift rather than inflection:
  `toggle` is `토글` in the profile and `전환해` in the renderer; `get` is `얻`
  vs `가져와`; `fetch` is `패치` vs `가져와`.
- **ja — verb form (15/15, the `〜して` suffix) plus glue.**
- **tr — verb form (5/15) plus glue.** The tr drift is not inflection but
  **ASCII folding**: the profile carries `kaldir`, `degistir`, `goster`,
  `gonder`, `artir`; the renderer writes correct Turkish `kaldır`, `değiştir`,
  `göster`, `gönder`, `artır`. A Turkish learner typing their own language
  correctly does not parse.
- **es/fr/ar/zh/pt** are mostly fine; their residual failures are `set` (below)
  and a few vocabulary drifts where the renderer picked a different verb than
  the profile knows — es `remove` renders `elimina` while the profile knows
  `quitar`/`quita`; fr renders `supprime`; ar renders `أزل`.

Note that ko and tr fail on input far simpler than any of this: `.x 추가` and
`.x ekle` — one role, a verb, no marker and no glue — do not parse.

## Two defects pinned in the lock

Both are asserted explicitly in `schema-renderer-parity.test.ts`, so whichever
lands first is visible.

1. **`set` renders its two roles in opposite orders, in all 10 languages.** The
   schema writes `set <destination> to <patient>` (target first — the
   hyperscript shape); `renderLearn` writes `set <patient> to <destination>`.
   One of them means the wrong thing. `set` is also the single command whose en
   rendering does not re-parse. Per `HANDOFF-parity-and-marker-tail.md` § 3,
   an order disagreement is a round-trip bug, not a cosmetic one — this one just
   has no round trip left to break.
2. **ja/ko `get`/`fetch` mark their source with the PATIENT particle.** The
   schema gives `source` を / 를; `renderLearn` writes the ablative から / 에서,
   which is the correct one. Here the renderer is right and the schema is wrong —
   the mirror of this arc's usual direction — so it is a schema fix.

## Why nothing was changed

Every fix above moves domain-learn's parse patterns, and lokascript-learn ships
the DSL bridge as its renderer: 919 morphology tests plus a dsl-bridge parity
test depend on the current behaviour, and that repo is pinned to published 2.8.0.
None of this is a solo change; it is a downstream-coordinated one. The lock was
added instead, so the divergences cannot grow quietly while that is arranged.

## Suggested order when it is picked up

Cheapest and highest-value first, each independently shippable:

1. **de keyword alternatives** — pure profile data, no schema or renderer
   change, takes de from 0/15 to ~15/15. Nothing downstream renders differently.
2. **tr ASCII folding** — decide whether the profile keywords are deliberately
   folded (tokenizer constraint?) or simply wrong. If wrong, add the correct
   Turkish spellings as alternatives rather than replacing the folded ones.
3. **ja/ko imperative alternatives** — same shape as (1), larger table.
4. **`set` role order** — needs a decision about which side is right before
   anything is edited.
5. **ja/ko `get`/`fetch` source particle** — a schema fix, and the one place the
   renderer is already correct.

The glue (`glueMarker: true` on `RoleSpec`) is worth doing only if domain-learn
is meant to reach the "renderX becomes a schema-renderer wrapper" end state.
On its own it closes 14 of 231 cells and no round trip.
