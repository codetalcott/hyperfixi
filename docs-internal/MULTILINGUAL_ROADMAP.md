# Multilingual Parse-Rate Roadmap

> Living plan for bringing all 24 languages to ~100% semantic parse rate.
> **Supersedes the analysis in issue #259** (whose 278-instance / 3-bucket
> breakdown predates the 8 PRs below and no longer matches the baseline).
> Source of truth for "what's left" is the regenerated baseline, not #259.

_Last updated: after #267 (reactive `bind` for ms/sw/th/tl)._

---

## Current state

Baseline: `packages/testing-framework/baselines/multilingual-priority.json`
(generated with `--bundle browser-priority`). Cross-language average **96.2%**.

| Rate         | Languages                                        |
| ------------ | ------------------------------------------------ |
| 100%         | en, bn, ms                                       |
| 99.4%        | de, es, hi, id, pt                               |
| 98–99%       | vi (98.7), fr/ru/uk (98.1)                       |
| 96–98%       | ja/th (97.4), zh (96.8), it/tr (96.1), qu (95.5) |
| 94–95%       | ko/pl (94.8), sw (94.2)                          |
| **laggards** | **he/ar (85.7), tl (83.8)**                      |

**142 failing pattern-instances** remain, in three tracks:

| Track                          | Instances | Nature                                                                          |
| ------------------------------ | --------- | ------------------------------------------------------------------------------- |
| **Reactive blocks/stragglers** | 35        | `live`/`when` reactive _blocks_, `socket`, and th/tl reactive stragglers        |
| **Bucket B — behaviors**       | 24        | Draggable/Sortable/Resizable/Removable not implemented (CI `continue-on-error`) |
| **Bucket C — per-language**    | 83        | Heterogeneous tokenizer/grammar gaps, concentrated in tl/ar/he                  |

---

## Shipped (issue #259 lineage)

- **#258** — reactive `bind` engine fix + Western batch (es/pt/fr/de/it).
- **#262** — Class-B `intercept`/`worker`/`eventsource` keywords (ja/ko/zh/tr/qu/bn/ar/he).
- **#263** — Class-B `bind` i18n grammar reconciliation (verb-final SOV rules; zh `把`-free custom; he custom; zh/he source markers).
- **#264** — possessive property paths for ja/ko (profile-aware possessive matcher).
- **#265** — possessive property paths for bn/qu (`bn: 'র'` marker; qu spaced `particle` + hyphen-tolerant matcher).
- **#266** — possessive property paths for tr (Turkish tokenizer word-boundary guard + spaced genitive).
- **#267** — reactive `bind` for ms/sw/th/tl (keyword + source-marker alignment).

Net: the **reactive keyword-wiring** sub-track and the **possessive property-path** gap are **complete** for every language where they applied.

---

## Remaining work

### Track 1 — Reactive blocks & stragglers (35)

Keywords already exist in every profile; the gaps are **grammar/block** level.

- **`live` blocks (14):** `live-derived-value`, `live-multiple-deps` — fr, it, pl, ru, sw, uk, vi.
  Generated text is a `live … end` block wrapping a `put` with a template literal,
  e.g. `live put \`Count: ${$count}\` into me end`. The i18n block reordering /
`extractBlockStructure` path doesn't produce parseable output for these langs.
- **`when` blocks (12):** `when-value-changes`, `when-multiple-changes` — ar, he, ja, pl, qu, tr.
  `when (#price's value * #qty's value) changes … end` — combines possessive +
  arithmetic + the `changes` trigger + a block body. Hardest of the reactive set.
- **`socket-basic` (5):** he, ru, th, uk, zh. Single pattern; likely a marker/keyword-form
  issue (the `socket` keyword exists). Quick to diagnose, possibly Class-A-style.
- **th/tl reactive stragglers (4):** `intercept-cache-strategies` (th, tl),
  `eventsource-basic` (th), `worker-basic` (th). th/tl never got the
  intercept/worker/eventsource keywords (#262 covered the 8 Class-B langs only).
  **Likely the most tractable remaining reactive work** — keyword wiring, same as #267.

**Effort:** `live`/`when` are deep block-grammar work (comparable to #263). `socket`
and th/tl stragglers are likely quick keyword/marker fixes — **do those first.**

### Track 2 — Bucket B behaviors (24)

`behavior-removable` (11), `behavior-sortable` (5), `behavior-draggable` (4),
`behavior-resizable` (4). These fail across many languages **and** are
pre-existing unimplemented behaviors (CI marks them `continue-on-error`).
This is a **runtime feature track** (implement the behavior), not a parsing/i18n
fix. Largest single pattern is `behavior-removable` (fails in 11 langs incl.
high-rate de/es/fr/it/pt) — worth checking whether it's a _parse_ issue (the
`install … removable` syntax) separable from the unimplemented-runtime issue.

### Track 3 — Bucket C per-language (83)

Heterogeneous; concentrated in **tl (25), ar (22), he (22)**. Recurring themes:

- **`set-*` family (ar+tl):** `set-attribute`, `set-style`, `set-opacity`,
  `set-transform`, `set-color-variable` (2 each). Likely one shared `set`
  style/attribute grammar issue per language → ~5-pattern win each.
- **possessive-dot (`.`):** `get-attribute-possessive-dot`,
  `method-call-possessive-dot` (ar/sw/tl). Distinct from the `'s` possessive
  already fixed — this is member-access `.` chains.
- **`caret`** (caret-var-write/on-target; ar/he/tl), **`transition-*`**
  (color/transform/opacity; ar/ko/tl), **`announce-screen-reader`** (ar/he/sw/tl).
- **event/window (he-heavy):** `event-key-combo` (5: he/ja/ko/qu/tr),
  `window-resize/keydown/scroll`, `keydown-key-is-syntax`, `event-throttle`,
  `focus-trap`, `modal-close-escape`, `repeat-until-event`/`repeat-forever`.
- **`js-inline` (ja/ko/qu/tr)**, **`fetch-*` (ko)**, **`on-custom-event-receive` (ko/qu)**.

**Approach:** pick one language (tl or ar first — biggest gap) and clear its
cluster; many of these are tokenizer/marker fixes that the harness validates per pattern.

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

---

## Suggested sequencing for fresh sessions

Each is an independent, focused PR (branch + baseline regen):

1. **th/tl reactive stragglers + `socket-basic`** — quick keyword/marker wins (~9 instances).
2. **`live` block grammar** (fr/it/pl/ru/sw/uk/vi, 14) — design the reactive-block
   reorder once; unlocks all 7 langs together.
3. **`when` block grammar** (ar/he/ja/pl/qu/tr, 12) — builds on the `live` block work +
   the `changes` trigger + possessive/arithmetic in the condition.
4. **Bucket C by language** — tl first (biggest gap), then ar, then he. Clear each
   language's `set-*` / possessive-dot / event clusters.
5. **Bucket B behaviors** — separate runtime track; scope independently.

Definition of done (unchanged from #259): all languages ≥ ~99% in the regenerated baseline.
