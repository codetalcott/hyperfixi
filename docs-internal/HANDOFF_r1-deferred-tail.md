# Handoff: the R1 deferred tail (en-reference defects + render geometry)

> **RESOLVED 2026-07-11** (branch `fix/r1-deferred-tail`). All in-scope
> families cleared; F deferred per this doc's own reasoning. avgRoleFidelity:
> ja 0.9938 → **0.9978**, bn 0.9938 / tr 0.9927 → **0.9962**, ko 0.9905 →
> **0.9946**, qu 0.9792 → **0.9936**, hi 0.9883 → **0.9907**. Sweeps green
> after every increment (3696/3696, R2 1.0, R3 loss only swap-content F6);
> baseline regenerated + audited per increment; `--regression` green at arc
> end. Per-family ledger:
>
> | family | outcome | how |
> | ------ | ------- | --- |
> | E — event-debounce `${}` URL (×6) | **fixed** (4199a0dd) | extractUrl carries `${…}` spans (balanced braces; unclosed keeps legacy cut). Realignment surfaced two masked co-causes, fixed in-increment: the SOV `debounced at 300ms` head stranded `at 300ms` junk (identifier-preposition skip added), and fused matches captured native event words raw (buildEventHandler canonicalizes exact eventNameTranslations hits; tr got boyutlandırma/kaydırma tokenizer keywords). en + all six capture the full URL as source:literal AND responseType:expression |
> | H — form-submit-prevent halt/call (×6 + tr call) | **fixed** (19020c54) | sovHaltCallFusedRule (per-SOV-profile custom render) splits the swept patient blob at the call verb; both commands verb-final, joined by the then-connective. halt.patient:reference everywhere, tr call aligned, row confidence 0.5→1.0 |
> | G — focus-trap condition/operand boundary (ja/ko/qu) | **fixed** (c5c884cc) | option (a) + a tokenizer alignment the probe surfaced: transformBlockBody emits the then-connective at the clause/body seam (razor-gated: SOV + positional-headed branch + no existing then — the fold's isThenKeyword boundary, #636 guards untouched); ja/ko/qu containment words (の中/안에/ukupi) registered as whole `in` keywords (split fragments broke the generated focus pattern; qu's stranded `pi` read as event marker). Bonus: whole ukupi realigned qu last-in-collection scroll |
> | qu tail — go/scroll/put ×2/toggle/window-resize call | **fixed** (299bb27a; scroll under G) | single-quoted strings classify literal (put ×2 byte-identical to en); toggle-qu-patient-first-dest covers the #636 verb-final order (destination:expression="next .panel", byte-identical); go-qu-url-dest re-types the fronted url pair expression via ExtractionRule.transform (documented-but-unwired field, now honored in applyExtractionRules); interior `_` allowed in the qu keyword extractor's longest-first scan → k_iri/hatun_kay tokenize whole (window-resize: event literal:resize, clean call.patient:expression) |
> | F — pick-text-range (×6) | **deferred** | per this doc's reasoning: the en reference is degenerate (first word only; pickSchema models no range roles) — the fix raises the en denominator for all 24 languages, the most expensive row for ×6. Recorded in NEXT_STEPS § 2026-07-11b |
> | qu on.event ×2 (announce, on-custom) | **out of scope** | reactive/event-anchor class, per this doc; G's probe did not explain them (en types the custom event expression, qu literal) |
> | swap-content | **out of scope** | F6 wontfix, unchanged |
>
> Residual per-language misses: ja 1 (pick) · bn/tr 2 (pick, swap) · ko 3
> (pick, on.event ×2) · qu 4 (pick, swap, on.event ×2) · hi 5 (pick, swap,
> on.event ×3).

> **For a fresh session.** Read this, then CLAUDE.md ("Multilingual parse rate ≠
> fidelity" and "Running the multilingual `--regression` gate locally"), then
> `docs-internal/HANDOFF_r1-role-fidelity.md` (RESOLVED — this arc picks up its
> "Family D outcomes" deferrals; its method and traps carry over verbatim) and
> `docs-internal/HANDOFF_transformer-rendering.md` (RESOLVED — the per-command
> i18n `rules` mechanism Family H below needs). Branch from `main` **after PR
> #637 merges** (it landed the whole R1 arc: the `--triage-r1` tool, the
> trailing-reclaim machinery, and the 2026-07-11 baseline this doc's numbers
> come from).
>
> Working-tree note: `docs-internal/HANDOFF_top-level-command-sequences.md`
> is a SEPARATE arc (top-level program truncation, #632's follow-up) — it may
> still be untracked; don't fold it into this one. `patterns.db` is a local
> `populate` artifact — never commit it; re-run `populate` before any probe.

## Why this arc

After the R1 arc (PR #637), the SOV six sit at: bn/ja **0.9938**, tr
**0.9927**, ko **0.9905**, hi **0.9883**, qu **0.9792** avgRoleFidelity. The
remaining misses are NOT parse-side pattern gaps — the R1 arc burned those
down. What's left splits into two sub-arcs with **opposite disciplines**:

- **Sub-arc 1 (en-reference defects, Families E/F):** the en reference parse
  itself is broken on these rows, so every language "misses" against a junk
  denominator. Fixing them **moves the denominator for all 24 languages** —
  the R1/R3 dip-then-realign discipline applies (see Method).
- **Sub-arc 2 (render geometry, Families G/H):** the i18n transformer
  scrambles the SOV render so badly no scoped parse-side fix is honest.
  These are i18n per-command-rule fixes (the #636 mechanism), which
  re-render corpus rows — the corpus-rewrite discipline applies.

Run `--triage-r1 --languages qu,ko,ja,tr,bn,hi` first (tool:
`packages/testing-framework/src/multilingual/tools/triage-r1.ts`); the
2026-07-11 residual is reproduced verbatim below so you can diff.

## The families (2026-07-11 probes, verbatim — all pre-probed, trust these)

### Family E — event-debounce: `${}` splits the URL token (×6, en-side)

- Missing `fetch.source:literal`; captured instead `fetch.source:expression`.
- **en's own capture is truncated**: `on input debounced at 300ms fetch
  /api/search?q=${my value} as json …` → `fetch-en-simple
  source:literal="/api/search?q=${my"` — the URL token ends at the WHITESPACE
  inside `${my value}`. ja gets `fetch-ja-sov source:expression="}"` (junk).
- Root: the URL extractor (`packages/semantic/src/tokenizers/extractors/url.ts`)
  does not carry `${…}` interpolation spans. Fix there: when a `${` opens
  inside a URL candidate, consume through the matching `}` (whitespace
  included) before resuming the usual terminator scan.
- This changes the **en value** → expect the R3 all-language realignment
  (the "en-firestorm" — here it is the INTENDED signal, not a bug). After the
  extractor fix, re-probe en + all six: the SOV sides should capture the same
  full URL through their existing fetch patterns (`fetch-<lang>-sov` /
  fused); if a language still junks, fix ITS side in the same increment —
  never land the en-side change alone across a sweep boundary.
- Check collateral: grep the corpus for other `${…}`-in-URL rows (patterns.db
  `SELECT code_example_id FROM pattern_translations WHERE language='en' AND
  hyperscript LIKE '%${%'`) — every hit realigns in the same increment.

### Family F — pick-text-range: pick's roles are unmodeled (×6, en-side)

- Missing `pick.patient:expression`; captured instead `pick.patient:literal`
  (+ qu extras).
- **en's own capture is degenerate**: `on click pick characters 0 to 5 of
  #note` → `pick-en-generated patient:expression="characters"` — the first
  WORD only. The range (`0 to 5`) and source (`#note`) are dropped because
  `pickSchema` (`packages/semantic/src/generators/command-schemas.ts`) doesn't
  model them.
- Proper fix: extend pickSchema (e.g. patient = the unit word, quantity/
  endQuantity or a range role, source = `of`-marked) + transformer render
  check + SOV pattern variants. **This RAISES the en denominator** — all 24
  languages dip on this row until each captures the new roles; budget the
  whole 24-language realignment or don't start it. The ja render is already
  scrambled (`characters 0 を クリック で 選択 5 の #note に` — range split
  around the verb), so expect i18n rule work too. This is the most expensive
  row in the tail for ×6 — consider deferring again unless pick matters for
  a demo; if deferred, say so in NEXT_STEPS with this reasoning.

### Family G — focus-trap: the focus operand leaks into the if-condition (ja/ko/qu)

- Missing `focus.patient:expression`; captured instead `reference`(ja) /
  `selector`(ko/qu) — the schema default / a fragment.
- en: `if target matches last <button/> in .modal focus first <button/> in
  .modal halt end` → `focus patient:expression="first <button/> in .modal"`.
- ja probe: `conditional-ja-folded condition:expression="対象 一致する last
  <button/> の 中 .modal first <button/> の"` — the condition consumed the
  focus operand's HEAD; focus got `patient:reference=me`. ko/qu same shape
  (`patient:selector=".modal"` — the tail fragment).
- Root: SOV renders have **no boundary marker** between the if-condition and
  the branch's first command operand (the verb is clause-final, so operand
  runs abut). The conditional fold (`conditional-<lang>-folded` machinery)
  over-consumes. Options, in preferred order: (a) i18n rule to render a
  boundary the fold already respects; (b) a condition-END heuristic gated to
  the corpus shape (a positional keyword `first/last` + tag-selector run at
  the condition tail belongs to the NEXT command when a focus-class verb
  closes the clause) — this abuts the event-anchor guard machinery (the
  hottest path; #636 curated-end guards live there — do not weaken), so probe
  exhaustively and keep the gate razor-thin.

### Family H — form-submit-prevent: fused-clause scramble (×6 + tr/qu call)

- Missing `halt.patient:reference` ×6; tr also `call.patient:expression`
  (captured instead `call.patient:reference`); qu window-resize
  `call.patient:expression` is the same root exercised elsewhere.
- en: `on submit halt the event call validateForm() if result is false log
  "Invalid form" end` → `halt patient:reference=event` + `call
  patient:expression=validateForm()`.
- ja probe: `the イベント 呼び出し validateForm() を 送信 で 停止 もし…` —
  `the イベント` (halt's operand) is stranded clause-INITIAL, far from 停止;
  halt captured ZERO roles. tr probe: `the olay çağır validateForm() i gönder
  de durdur …` — call got `patient:reference=event` and halt got
  `patient:expression=validateForm()` — **the two commands' operands are
  swapped**.
- Root is the TRANSFORMER: two juxtaposed commands (`halt the event` +
  `call validateForm()`) are interleaved across the fused event clause.
  Fix render-side with per-command `rules` in the i18n profiles
  (`packages/i18n/src/grammar/profiles/index.ts` — the tr
  `wait-oblique-verb-final` / `repeat-until-event-verb-final` rules from #636
  are the template): keep `halt <patient>` adjacent and verb-final. A corpus
  re-render follows — the corpus-rewrite discipline (attribute every
  per-language delta; keep the pre-arc shape parseable with a legacy
  tolerance if any pattern anchored on it).

### qu-only tail (probe before choosing; some may be one-liners)

- `go.destination:expression` + `scroll.destination:expression` — qu routes
  go-url/last-in-collection through the verb-anchoring FALLBACK (not the
  fused `*-sov-simple` patterns the other five match), so the R1-arc's
  `tryAttachTrailingExpressionRole` reclaim never fires. Probe why the qu
  fused patterns miss (marker? verb form?) — teaching the reclaim the
  fallback path is the wrong layer; fixing the qu fused-pattern match is
  scoped.
- `put.patient:literal` ×2 (make-toast-element, on-custom-event-receive;
  captured instead `expression`), `toggle.destination:expression`
  (toggle-aria-expanded; captured instead `literal`), `call.patient` on
  window-resize (three junk roles captured — see Family H).
- `on.event:expression` ×2 (announce-screen-reader, on-custom-event-receive)
  — reactive-head adjacent; treat as out of scope like ko/hi's unless a
  Family G probe happens to explain them.

### Explicitly OUT of scope (unchanged decisions)

- **swap-content** (`swap.destination:selector`, bn/hi/qu/tr): F6 wontfix
  (NEXT_STEPS § R3 families item 6) — do not chase without reopening it.
- **ko/hi reactive `on.event` rows** (when-value-changes,
  when-multiple-changes, window-resize): event-anchor guard machinery.

## Residual triage (2026-07-11, the exact starting ledger)

bn 4: E, H, F, swap. ja 4: E, G, H, F. tr 5: E, F, H(halt+call), swap.
ko 6: E, G, H, F, on.event ×2. hi 7: E, H, F, swap, on.event ×3.
qu 13: E, G, H(+window-resize call), F, swap, go, scroll, put ×2, toggle,
on.event ×2.

## Where the code lives

- URL extractor: `packages/semantic/src/tokenizers/extractors/url.ts`
  (registered via `getHyperscriptExtractors`, `extractor-helpers.ts`).
- pickSchema: `packages/semantic/src/generators/command-schemas.ts`.
- i18n per-command rules: `packages/i18n/src/grammar/profiles/index.ts`
  (tr rules block ~525–562 is the #636 template; each SOV profile has its
  own `rules` array).
- Conditional fold: `conditional-<lang>-folded` — grep
  `packages/semantic/src/patterns/` + the fold site in
  `semantic-parser.ts`; probe before touching (Family G's warning).
- The R1 arc's reclaim machinery (reuse, don't duplicate):
  `tryAttachTrailingStyle`, `tryAttachTrailingExpressionRole`,
  `tryAttachTrailingRole` in
  `packages/semantic/src/parser/semantic-parser.ts`; pattern builders
  `verbFinalOrRunWait` (wait.ts), `sovForBindingHead` (repeat.ts),
  `set-qu-oblique-source` (set.ts).
- Locks: `packages/semantic/test/multilingual-roadmap-fixes.test.ts` — the
  R1 arc's describes ("R1 Family A/B/C/D…") show the current conventions
  (self-contained describe, `collect`/`role`/`first` helpers, corpus-shaped
  strings).

## Method

Inherited from the R1 + transformer-rendering arcs (probe full bodies, scoped
fixes, per-family verification cycle, `--save-baseline` + line-by-line audit
at the end, never commit patterns.db), PLUS the en-side discipline for
Families E/F:

1. An en-reference change moves the denominator for all 24 languages at
   once. Fix en AND every language's capture **in the same increment** —
   never land the en side alone. Mid-increment R1/R3 drops on the touched
   rows are expected; the increment is done when the full sweep shows the
   row realigned everywhere (or the residue is per-language triaged).
2. The regression gate compares against the COMMITTED baseline — an en
   enrichment will show as drops until `--save-baseline` at the increment
   end. Read the sweep, don't trust the gate mid-increment; regenerate the
   baseline per increment, audit the diff (every changed number must map to
   the increment), commit baseline only.
3. Families G/H re-render corpus rows (i18n changes): rebuild i18n + all
   downstream (`test:multilingual:build-deps`), `populate`, and attribute
   every per-language delta in the sweep before locking.

Verification cycle (identical to the R1 arc):

```bash
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --triage-r1 --languages qu,ko,ja,tr,bn,hi
npx tsx src/multilingual/cli.ts --full --bundle browser-priority   # read EVERY signal
npm test --prefix packages/semantic -- --run test/multilingual-roadmap-fixes.test.ts
```

## Traps

- All of the R1 + transformer-rendering arcs' traps: prettier in lint-staged
  bumps src mtimes AT COMMIT — rebuild before any post-commit sweep or
  `--save-baseline` (it refuses on stale dists; `--triage-r1` only WARNS);
  tsx probes need `process.exit(0)`; probes run with cwd inside the package.
- **Full-body probes, not fragments**: in the R1 arc, the bare qu/bn/hi
  for-head fragments parsed through a different path than the same head
  inside the corpus body (locks had to use full rows). R1 scores the in-body
  shape — probe and lock that.
- The trailing reclaims (`tryAttachTrailingStyle`/`ExpressionRole`) fire at
  BOTH the fused-event and parseClause sites — a new pattern that consumes
  tokens the reclaims used to see changes their behavior; re-run the R1
  Family A/D locks after any fetch/render/js/go/scroll-adjacent change.
- ko's 로 doubles as style AND as-marker; ja `で` as style AND event marker;
  the reclaims' response-word and action gates encode this — extend the
  gates, don't remove them.
- Never weaken the #636 curated-end guards (`matchRoleToken` ~564–580,
  `isStrayTerminator`) — Family G work is adjacent to them.

## Definition of done

- Family E cleared in all six (+ en's URL capture whole; R3 realigned — no
  row of the touched patterns below 1.0 in any language).
- Family H cleared for the six (halt.patient:reference everywhere; tr/qu
  call rows aligned); G cleared for ja/ko/qu or deferred with a probe-backed
  reason; F fixed-or-deferred with reasoning recorded in NEXT_STEPS.
- qu-only tail triaged: each row fixed or per-entry deferred (documented).
- No drops in any other signal at increment ends; `--regression` green
  against the regenerated baseline; unit locks per family; baseline
  audited + committed (never patterns.db); this handoff marked resolved;
  NEXT_STEPS updated.
