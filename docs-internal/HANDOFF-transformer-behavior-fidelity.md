# Handoff — multilingual behavior fidelity (i18n transformer nested-body arc)

> **⚠️ SUPERSEDED — WRONG DIAGNOSIS (2026-06-19). Do not follow this doc's
> root-cause.** It blames the i18n `GrammarTransformer` for "flattening nested
> `if {…}` bodies," reproduced via `MultilingualHyperscript.translate`. But
> `ml.translate` is `semantic.translate` = **parse→render**, a path the fidelity
> **gate never uses**. The gate measures `patterns.db`, populated by
> `sync:translations` → `GrammarTransformer.transform`, whose output is **faithful**
> (precision 1.000 — it does NOT flatten the nested bodies). The real defect is
> **pure recall in the SEMANTIC PARSER**: it drops the handler-body commands after
> the first nested `if`/`repeat` block. First increment fixed (semantic
> `buildEventHandler` fold-rewind + `isEndKeyword` English-`end`): removable 0.667 →
> 0.889 across SVO langs. See **MULTILINGUAL_NEXT_STEPS.md → Track 1 item 2** for the
> corrected diagnosis, the remaining increments (js-opaque for removable's `return`
> artifact; sortable's `repeat`/`wait` loop-block fold; SOV head-reorder), and how
> to reproduce the gate path correctly (`GrammarTransformer` + `maskSpans`, then
> `parseSemantic`). The historical content below is kept only for context — it was
> written as a self-contained staged-arc handoff before the diagnosis was corrected.

## Why this matters (read first)

**Multilingual behavior fidelity is a priority** (user decision, 2026-06-17). This
SUPERSEDES the older consolidation-era framing that "behavior sources are write-once
English artifacts, so don't chase their translation fidelity / scope them out of the
gate." Behavior-`*` gate patterns stay in the multilingual fidelity gate; their
lossy/degenerate instances are **real debt to FIX**. Do not propose excluding them.

## Goal

Make **`behavior-removable`** and **`behavior-sortable`** faithful (fid → 1.0) across
the non-English languages by fixing the i18n **`GrammarTransformer`**'s handling of
**nested behavior bodies**. These two patterns are **non-faithful in all 23 non-en
languages** (the highest-leverage targets); `behavior-draggable`/`behavior-resizable`
are already mostly faithful (lossy only in 8 SOV/VSO langs — don't break them).

**Acceptance (per increment):** removable/sortable `avgFidelity` rises across languages;
`--regression` gate green (no parse-rate drop >2pts; no new degenerate/lossy/precision/
role/exec regressions); baseline regenerated with `--save-baseline`; only dicts/profiles +
baseline committed (NOT `patterns.db`).

## The root cause (confirmed by triage, 2026-06-19)

The defect is in the **en→lang translation**, NOT the parser. Verified on **Spanish**
(SVO — so this is not a SOV-only issue): the English Removable source parses to 14
actions, but its **es translation is already structurally broken before parsing**:

```
comportamiento Removable(triggerEl, confirmRemoval, effect)
  al clic si confirmRemoval entonces disparar removable:before entonces si effect
    entonces disparar removable:removed entonces quitar yo de yo
  fin
  iniciar
    si triggerEl is undefined          ← "is undefined" untranslated; "set triggerEl to me" DROPPED
  fin
fin
```

### The four transformer defects (ranked)

1. **Nested `if {…}` bodies flattened into a then-chain** — _the dominant failure_. The
   `if confirmRemoval { js() … halt }` and `if effect { transition … }` bodies are
   dropped; `js()`, `halt`, `transition` vanish. The transformer's OWN comment flags this
   (`transformer.ts:~1240`: "the dominant failure for nested control-flow bodies").
2. **`init` block reordered after the handler + its body dropped** (`set triggerEl to me`
   gone; `init` should stay first).
3. **`js()` block dropped** inside behavior bodies.
4. **`is undefined` / `is null` predicate left untranslated** (a keyword/predicate gap —
   the cheapest parallel win).

This is a **known, partially-handled hard area**: `GrammarTransformer` (~2,315 lines) already
has `transformBlock` / `transformBlockBody` / `transformConditionalBody` recursion, but it
loses the second level of nesting (`if`-in-`on`-in-`behavior`).

## Reproduce (build the stack, then probe es + a SOV lang)

The multilingual dist goes stale fast — **rebuild first** (the "unreproducible baseline"
trap):

```bash
npm install                              # if cold
npm run test:multilingual:build-deps     # ordered build: intent→framework→semantic→i18n→patterns-reference→core multilingual dist
```

Then a direct translate+parse probe (run from `packages/testing-framework`, which resolves
`@hyperfixi/core`). Drop this in a scratch `_triage.mts` and `npx tsx _triage.mts`:

```ts
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
const REMOVABLE = `behavior Removable(triggerEl, confirmRemoval, effect)
  init
    if triggerEl is undefined
      set triggerEl to me
    end
  end
  on click from triggerEl
    if confirmRemoval
      js(me)
        if (!window.confirm("Are you sure?")) return "cancel";
      end
      if it is "cancel"
        halt
      end
    end
    trigger removable:before
    if effect is "fade"
      transition opacity to 0 over 300ms
    end
    trigger removable:removed
    remove me
  end
end`;
const ml = new MultilingualHyperscript();
await ml.initialize();
for (const lang of ['es', 'ja'] as const) {
  const t = await ml.translate(REMOVABLE, 'en', lang);
  console.log(lang, 'TRANSLATED:\n' + t); // <- inspect: where does the body break?
  console.log(lang, 'parse:', (await ml.parse(t, lang)) ? 'OK(maybe degenerate)' : 'NULL');
}
```

Compare the translated text to the English source. The fidelity loss is whatever the
translation dropped/flattened. (`behavior-sortable`'s source — `on pointerdown(clientY)
from me … set item to the target.closest("li") … if item is null exit … repeat until event
pointerup … end` — exhibits the same flattening.)

> **Sanity-check first:** re-confirm the baseline status is current — the snapshot lives in
> `packages/testing-framework/baselines/multilingual-priority.json` (its `timestamp`/`commit`
> fields). As of 06-17: removable/sortable non-faithful in all 23 non-en langs.

## Where to look

All in [`packages/i18n/src/grammar/transformer.ts`](../packages/i18n/src/grammar/transformer.ts):

- **`transformBlockBody`** (~L2056) — splits a block's clause vs. body, then calls
  `transformConditionalBody`. Where the init/handler ordering and body-vs-clause split happen.
- **`transformBlock`** (~L2134) — recurses through `transform()` for the block body. The
  second-level `if`-body recursion is where the nesting is lost.
- **The `if`-condition capture** (~L1235) — the "dominant failure" comment; block-style
  `if <cond>` with the body on following lines. Defect ① lives near here.
- **`js()` masking** — search `js` / caret-scope masking (~L1654 references "multi-line js
  bodies are handled with the behavior work"). Defect ③.
- **Predicate keywords** (`is undefined` / `is null`) — check the per-language profiles
  `packages/i18n/src/grammar/profiles/` + `translateWord`/`translateMultiWordValue` for the
  predicate gap. Defect ④.

Background: the semantic-parser side (block-parser) is NOT the problem here, but for context
see the behavior-block parsing in `packages/semantic/src/parser/block-parser.ts` and the prior
fidelity diagnosis in [`CORRECTNESS_RELIABILITY_PLAN.md`](CORRECTNESS_RELIABILITY_PLAN.md) §2
(control-flow body parsing is the dominant correctness cluster) — the transformer feeds it.

## Method (staged — the proven multilingual playbook)

1. **Diagnose** one defect precisely with the probe above (which function drops what). Start
   with **defect ① (nested-`if`-body preservation)** — highest impact, lifts removable AND
   sortable across all 23 langs at once. **Defect ④ (`is undefined`/`is null`)** is a cheap
   parallel proof-of-loop if you want a fast first win.
2. **Edit** `transformer.ts` (and/or i18n profiles). Keep the change minimal + well-scoped.
3. **Rebuild** what you touched: `cd packages/i18n && npx tsup`; if the parse path is involved,
   `cd packages/core && npx rollup -c` (the harness parses via `@hyperfixi/core/multilingual`).
4. **Probe** the single pattern (translate+parse, above) — confirm the body survives now.
5. **Repopulate:** from `packages/patterns-reference`, `npm run db:init:force && npm run sync:translations`.
6. **Re-baseline:** `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --save-baseline`.
7. **Verify the diff** vs HEAD baseline: removable/sortable fidelity should rise; **zero `↓`**
   elsewhere (the transformer is a hot path — watch draggable/resizable, which are already
   faithful, and the SVO langs).
8. **Restore the binary DB:** `git checkout packages/patterns-reference/data/patterns.db` — do
   NOT commit it (CI repopulates from source).

## Gotchas

- **Hot path / regression-sensitive.** `transform()` runs for EVERY translation of EVERY
  pattern in EVERY language. A change that fixes removable can regress an unrelated pattern.
  Gate on `--regression` after every increment; never skip the full re-baseline.
- The `--regression` gate **refuses a stale/unstamped `patterns.db`** — always `populate` first.
- `npx tsx`/`npx vitest` do **not** auto-rebuild stale dist — rebuild i18n (and core if needed)
  yourself, or `npm run check:fresh`. (This is exactly how the "unreproducible baseline"
  incident happened.)
- **Don't break the already-faithful behaviors.** draggable/resizable are faithful in 15 langs;
  removable/sortable share the transformer paths. Re-baseline isolates the intended flips.
- The transformer authors already attempted nested-block handling — read the existing
  `transformBlock`/`transformBlockBody`/`transformConditionalBody` before rewriting. The fix is
  likely a targeted second-level-recursion bug, not a rewrite.
- Keep each increment to one defect + one re-baseline. Don't bundle defects ①–④ — they're
  separable and each needs its own regression check.

## Definition of done (whole arc)

`behavior-removable` + `behavior-sortable` reach fid = 1.0 (or as close as the transformer
allows) across the priority languages; gate `--regression` green; baselines regenerated and
committed with the i18n source changes; `patterns.db` left uncommitted. Track per-increment
progress in [`MULTILINGUAL_NEXT_STEPS.md`](MULTILINGUAL_NEXT_STEPS.md).
