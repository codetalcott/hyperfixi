# HANDOFF — Arc F: event-modifier phrases captured ×24 (EXECUTED)

**Status: EXECUTED 2026-07-13** (same-day as Arc E's merge; nine days before the
v2.8 target, well clear of the no-baseline-moves-after-07-20 freeze).
Meter: coverage firings **556 → 487 / 3696**; the family's 69 rows
(window-resize ×23, event-debounce ×16, event-throttle ×16, event-once ×14) → **0**,
every other pattern's fired-row count bit-identical (red/green full-corpus
sweeps, `p4-red.txt`/`p4-green.txt` in the arc transcript). Eight-signal
`--regression` green **before** regeneration (all moves were improvements);
baseline regenerated + attributed anyway to lock the new marks.

## The red contract (probe matrix, fresh populate 2026-07-13)

- `once` / `debounced|throttled at Nms` parsed with `eventModifiers=null` in
  every mid-clause/final position, en INCLUDED (en-symmetric → R0/R1 blind).
  Only the input-LEADING form (SOV/VSO heads) worked, via
  `extractStandaloneModifiers`'s token-0 gate — hence 23/16/16/14, not 24×4.
- **it/th lost `once` with NO diagnostic** (silently swallowed) — true loss was
  16 rows on event-once, two of them invisible even to the meter.
- **en swallowed `on resize from window`'s from-clause silently**: pattern
  `event-en-source` extracted the `source` role and `buildEventHandler` dropped
  it on the floor. No firing, no trace — the reference itself was lossy.
- hi window-resize was a full MIS-parse: `आकार_बदलें` shattered at `_`, the
  stranded `बदलें` (toggle verb) anchored a phantom `toggle` command, the event
  slot grabbed the call target. (Baseline hi precision 0.9978 — this row.)
- ar/vi/id/sw window-resize captured the WRONG event (`change`/`toggle`) from
  the first word of a compound event name, dangling the rest.

## Mechanism (all in packages/semantic; no profile/dict edits — vocab gate untouched)

1. **Lift** — `src/parser/event-modifier-lift.ts` (pure finder) + a
   parseInternal block after the or-normalization: scan tokens (index ≥1) for
   `once|debounced|throttled…` (loanwords; ru `однажды`, uk `один_раз`
   incl. shattered, vi `một lần` in a parser-local table — OR_KEYWORDS
   precedent), require a duration literal within ≤2 connectives for
   debounce/throttle (**mid-stream never defaults a missing duration**), excise
   offset-exactly, re-parse, re-attach via `applyModifiers`. Gated on the
   re-parse yielding an event-handler → non-handler inputs byte-identical.
2. **Wrapper reclaims** — depth-1 hook in `parse()` after diagnostic hoisting,
   family-gated (handler carrying once/debounce/throttle), loop ≤4:
   - `reclaimDanglingFromTail`: dropped span == `<source-marker> <noun>`
     (profile `roleMarkers.source` or normalized `source`) → excise, re-parse
     (re-hoist! inner parses don't hoist), require strictly fewer dropped
     tokens, attach `eventModifiers.from`.
   - `reclaimEventCompoundTail` (also runs UN-gated once per top-level
     handler): dangling fragment + the token before it joins offset-exactly to
     an `eventNameTranslations` compound key whose first word IS the current
     event's source word → rebind event, retire the span. Compound keys added:
     ar `تغيير حجم`, vi `đổi kích thước` (new minimal vi section).
   - `reclaimResponseTypeTail`: span == `<as-marker> <response-word>` (the he
     `כ json` / id `sebagai json` strands the lift itself exposed — the
     excision flipped which pattern won) → excise, re-parse, set the body
     fetch's `responseType`.
   - `reclaimCapturedDestinationTail`: retire a provably-FALSE drop record
     (zh `到 我` recorded by a superseded clause attempt while the committed
     tree HAS `destination:reference=me`).
3. **Tokenizer compounds** — underscore-joined keyword recovery (the
   swahili-keyword.ts / qu `hatun_kay` precedent) ported to
   `indonesian-keyword.ts` and `hindi-keyword.ts` (hi already had the hyphen
   sibling); EXTRAS entries `ubah_ukuran`/`badilisha_ukubwa`/`आकार_बदलें` →
   `resize`. Registered-keyword-only adoption ⇒ arbitrary snake_case unchanged.
4. **Source-role threading** — `buildEventHandler` threads a pattern-extracted
   `source` into `eventModifiers.from`, **gated to source-shaped pattern ids**.
   The gate is load-bearing: ungated, the fused patterns' default-filled or
   body-swallowed `source` (`remove .active from all .tab` → source=`.tab`)
   became a live delegation filter and the R2 execution ratchet fired on 59
   curated rows (tabs-basic/tabs-content/remove-class-from-all) — caught
   mid-arc, exactly what R2 exists for.
5. **AST propagation** — `ast-builder`: `EventHandlerNode.modifiers`
   (once/debounce/throttle) now emitted (runtime-base.ts already implements
   them); non-selector `eventModifiers.from` → listener `target`.

## Probe → test mapping (locked)

- `test/event-modifier-phrase-multilingual.test.ts` — 4×24 renders verbatim
  from patterns.db: exact eventModifiers, canonical event, from-tail presence,
  zero unconsumed-input; phantom pins (`.once` selector, no-duration
  no-default, `wait 2s`, leading+mid merge, non-handler untouched).
- `test/input-coverage-stages.test.ts` § Arc F — the four en corpus rows fire
  zero with unchanged body shape; en from-capture pinned.
- `test/ast-builder.test.ts` — modifiers emitted / omitted-key / from→target.
- `test/event-name-translation.test.ts` — the localizer round-trip now covers
  the ar/vi compound keys (was the mid-arc failure that un-gated the compound
  reclaim).

## Baseline diff (regenerated, `--save-baseline` vs fresh populate, commit e9e87c5b)

- hi `avgPrecision` 0.9978 → **1.0000**, `avgRoleFidelity` 0.9907 → 0.9929
  (the phantom-toggle mis-parse fixed).
- `bundleSize` 511886 → 518711 (the lift + reclaims).
- hi window-resize per-pattern confidence 1.0 → 0.71 — honest confidence of a
  real parse replacing a vacuous mis-parse (confidence is not ratcheted).
- Nothing else moved. `--regression` exits 0.

## Named residuals (documented in the lock test header)

- th/zh window-resize: event slot still null (th shatters `ปรับขนาด` into
  `ป`+`รับ(→take)`+`ขนาด`; zh strands `调整大小`) — rows parse clean; fixing is
  event-slot work, R1-visible, pre-existing.
- qu window-resize: fused pattern silently swallows `k_iri manta` — no
  diagnostic to anchor the from-reclaim on.
- `queue` modifier: out of scope (no corpus row; runtime AST type lacks it).
- `on first click` rewrite stays reverted (init-db.ts note — SOV-lossy).

## Reusable lessons

- The Arc E "shared parser-layer over 24 pattern variants" call held again —
  zero profile/dict edits, zero generated-pattern changes.
- Wrapper-level reclaims MUST re-hoist inner-parse diagnostics or residual
  firings vanish un-counted (vacuous meter green — caught in design).
- R2 is the only signal that saw the source-threading blast radius; treat any
  eventModifiers-adjacent change as R2-sensitive.
- A "fired span" can be a FALSE record (zh `到 我`): the committed tree had the
  content. Retire-by-proof, don't suppress.
