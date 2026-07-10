# Handoff: the transformer-rendering arc (SOV reorder stranding)

> **RESOLVED 2026-07-10** (branch `fix/transformer-sov-reorder-stranding`).
> All five scoreboard rows cleared: the four `behavior-sortable` R3 rows
> (qu ×2, tr ×2), the qu `behavior-resizable` multiset row, plus the bn
> repeat-while cosmetic render. Outcomes + mechanism notes:
> `docs-internal/MULTILINGUAL_NEXT_STEPS.md` § "R3-discovered value-bug
> families" item 7 and § "Colon-event-names follow-ups" item 2. One planning
> note for posterity: the blanket fix this handoff gestured at (extending the
> tr/bn `canonicalOrder` wholesale) re-renders the entire corpus into shapes
> the semantic parser's generated patterns + reclaim tolerances weren't built
> for (R3 went 12→39 rows) — the landed fix is per-command i18n `rules`
> (wait/repeat-until), the trailing-`end` strip, two new semantic patterns,
> and the curated-end role-value guard. The section below is kept as the
> original problem statement.
>
> **For a fresh session.** Read this, then CLAUDE.md ("Multilingual parse rate ≠
> fidelity" and "Running the multilingual `--regression` gate locally"), then
> `docs-internal/MULTILINGUAL_NEXT_STEPS.md` § "R3-discovered value-bug
> families" (item 7 re-filed here) and § "Colon-event-names follow-ups"
> (item 2, the qu behavior-resizable side-quest — same family). Branch from
> `main` **after PR #635** (`fix/r3-value-bug-families`) merges — the `it.fails`
> locks, the parser tolerances, and the triage below all land there.

## Why this arc

The i18n `GrammarTransformer`'s SOV/agglutinative reorder sometimes renders
fragments **outside their clause**: a wait verb emitted mid-line or first in a
verb-final language, a from-phrase stranded after the verb, a block terminator
dropped inside the *following* clause's object phrase. The parser then either
captures the stranded fragment as a role VALUE (junk trigger events) or is
forced to carry tolerance code for grammatically wrong input.

Two prior arcs bounded the blast radius parser-side (#633/#634 markers, #635
value-bug families) and **deliberately re-filed the rendering defects here**
instead of adding more parser tolerance — the guard-encrusted loop/wait/fused
machinery is the wrong place to absorb what is a rendering bug. This arc fixes
the renderer.

Every defect below was verified by parsing the actual patterns.db corpus text
and dumping roles + `metadata.patternId` (2026-07-10, PR #635 session). The
malformed lines are quoted verbatim.

## The defects (three shapes, one family)

The en reference for behavior-sortable lines 15–17 (from
`sqlite3 packages/patterns-reference/data/patterns.db "SELECT raw_code FROM
code_examples WHERE id='behavior-sortable'"`):

```
repeat until event pointerup from document
  wait for pointermove(clientY) or pointerup(clientY) from document
  trigger sortable:move on me
```

### (a) Or-run wait lines rendered verb-first / verb-medial (tr, qu)

- **tr** (SOV — verb should be final):
  `bekle pointermove(clientY) veya pointerup(clientY) belge den`
  — `bekle` (wait) is **first**, the or-run and from-phrase stranded after it.
  Consequence: the next line's trigger captures the stranded `belge`
  (document) as its event → R3 row `tr: missing trigger.event=sortable:move`.
- **qu**: `qillqa manta suyay pointermove(clientY) utaq pointerup(clientY)`
  — `suyay` (wait) is **medial**, the or-run stranded post-verb.
  Consequence: the middle trigger glues the whole stranded run into its event
  (`(clientY)utaqpointerup(clientY)sortable:move`) → R3 rows `qu: missing
  trigger.event=sortable:move, trigger.event=sortable:start`.
- Contrast: the same languages render *simple* wait lines fine (`200ms কে
  অপেক্ষা`-style verb-final). The trigger is the **or-run + from-phrase**
  combination — suspect the reorder can't place a multi-argument
  `wait for X or Y from Z` and bails to en order (tr) or half-reorders (qu).

### (b) From-phrases postposed after the verb (tr)

- tr repeat header: `kadar olay pointerup i tekrarla belge den`
  (en: `repeat until event pointerup from document`) — `belge den` (from
  document) strands **after** `tekrarla` (repeat). Feeds the same junk-capture
  as (a); also the loop-end slicing puts tr's missed `remove.patient` next to
  the stranded junk.

### (c) Block terminators rendered inside the following clause's object phrase (bn, qu, tr)

- **bn repeat-while**: `… তারপর 200ms শেষ কে অপেক্ষা` — the terminator শেষ
  (end) sits between the duration and wait's object marker. It belongs after
  the verb: `… 200ms কে অপেক্ষা শেষ`, exactly how bn renders
  repeat-until-event / repeat-forever / stagger-animation. (The parser now
  tolerates this — see "Parser-tolerance interplay" — but the render is still
  wrong.)
- **qu behavior-resizable**: the inline-if's inner set's verb-final tail
  `man churanay` renders **after** `tukuy` (end):
  `sichus newWidth < minWidth chayqa newWidth ta minWidth tukuy man churanay`.
  The conditional fold eats up to `tukuy` and strands the tail — the two style
  sets (`noqaq *width/*height …`) drop; 10 of en's 12 sets parse. This is the
  open side-quest of the colon-event arc (NEXT_STEPS § follow-ups item 2),
  assessed there as "the `end` belongs after the verb — transformer/corpus
  rendering bug, not parser tolerance".
- **tr behavior-sortable**: the loop's `son` (end) lands directly before the
  `remove` line's patient, whose positional reading then prefixes it —
  `remove.patient="last .{dragClass}"` vs en `.{dragClass}` → R3 row
  `tr: missing remove.patient=.{dragClass}`.

### Known-affected rows (the current scoreboard)

- R3 report (`Role values (R3)` console section): `behavior-sortable` qu ×2 +
  tr ×2 — the ONLY non-wontfix rows left after #635 (swap-content ×8 is the
  documented F6 wontfix; do not chase those).
- Multiset-recall: qu `behavior-resizable` (10/12 sets) — the one sub-1.0 row.
- Cosmetic-but-wrong renders the parser now tolerates: bn repeat-while (c).
- **Check siblings before declaring done:** behavior-draggable has the same
  `repeat until event pointerup from document` + or-run wait shape (with
  clientX AND clientY). It doesn't flag today — verify whether its tr/qu
  renders are clean or merely masked, and whether fixing (a)/(b) changes them.

## Where the code lives

- **Renderer:** `packages/i18n/src/grammar/transformer.ts`
  (`GrammarTransformer`). Known internals from prior arcs: line-by-line
  translation (a block construct written single-line in the seed scrambles —
  #627 arc); `BLOCK_HEAD_KEYWORDS` (line ~562) only covers
  `live`/`when`/`unless`; `applyPrimaryRole` ~1337–1363;
  `COMMAND_PRIMARY_ROLES` in `packages/i18n/src/constants.ts`. **The
  wait/or-run/from-phrase reorder path has NOT been explored — start there.**
  Suspect the semantic-role segmentation of `wait for X or Y from Z` (three
  phrases) and `repeat until event E from S`.
- **Profiles/word order:** `packages/i18n/src/grammar/profiles/` (tr, qu, bn).
- **Corpus pipeline:** `packages/patterns-reference/scripts/sync-translations.ts`
  builds each translation via `new GrammarTransformer('en', language)` (cached,
  line ~125). `npm run populate --prefix packages/patterns-reference` re-renders
  patterns.db from the dicts + transformer — **that is how a transformer fix
  reaches the corpus**.
- **Direct probe without populate:** in `packages/i18n`, transform a single en
  line with `GrammarTransformer` (see `grammar.test.ts` conventions), or use
  `MultilingualHyperscript.translate(en, 'en', 'tr')` from
  `@hyperfixi/core/multilingual`. Iterate at this level; only populate when the
  render looks right.

## The locks, and the fixture subtlety when flipping them

All in `packages/semantic/test/multilingual-roadmap-fixes.test.ts`:

1. § "R3 value-bug families" → `describe('F7: …')`:
   `it.fails('[qu] behavior-sortable: all three trigger events by VALUE …')`
   and `it.fails('[tr] behavior-sortable: sortable:move + bare remove patient …')`,
   plus a **passing** guard (`[qu/tr] … command-level actions all survive`)
   that must stay green.
2. § "colon-qualified event names …":
   `it.fails('[qu] behavior-resizable: the two style sets still drop …')`, with
   its passing sibling asserting `set >= 10` / triggers-by-value.

**CRITICAL:** these fixtures hard-code the *current malformed* corpus text.
Fixing the transformer changes patterns.db but NOT the fixtures — the
`it.fails` will keep expected-failing on the old text and will NOT flip by
themselves. The flip procedure is:

1. Fix transformer → ordered build → `populate`.
2. Re-pull the qu/tr sortable + qu resizable renders from patterns.db
   (`SELECT hyperscript FROM pattern_translations WHERE code_example_id=… AND
   language=…`).
3. Replace the fixtures with the NEW renders, convert `it.fails` → `it`
   (and raise the resizable sibling's `set` floor from `>= 10` to `toBe(12)`).
4. Decide whether to keep a copy of the OLD malformed text as a parser
   tolerance lock (recommended for the bn repeat-while shape — see below) or
   drop it.

## Parser-tolerance interplay (#635 — do not undo)

PR #635 added parser tolerances that must SURVIVE this arc (they're locked by
unit tests pinned to the old corpus shapes, which remain valid inputs):

- `processGroup` (semantic-parser.ts) skips stray block terminators in SOV
  value groups (bn `200ms শেষ কে`), with a selector lookahead preserving
  positional-`last` (`শেষ <li/>`, `son .item`).
- `matchRoleToken` (pattern-matcher.ts) rejects keyword-kind `then` / a
  non-positional `end` as any role value.
- The F3 fused-path trailing-destination reclaim and `in`-qualifier handling.

Fixing the renders makes these tolerances *less exercised*, not wrong. Note
one interaction: tr's `remove.patient="last .{dragClass}"` is produced BY the
positional lookahead tolerating the stranded `son` — once the render is fixed,
the prefix disappears on the new corpus, while the old-text tests keep passing
as tolerance locks.

## Method

1. **Probe the render, not the parse, first**: for each defect, transform the
   en line directly (GrammarTransformer / translate) and iterate until the
   output is verb-final with the from-phrase/or-run inside the clause and the
   terminator after the verb. Add i18n unit tests in
   `packages/i18n/src/grammar/grammar.test.ts` conventions for each fixed shape
   (tr/qu wait+or+from, tr repeat-until-from, bn trailing-end-in-body, qu
   inline-if verb-final tail before `tukuy`).
2. **Then re-render + re-parse**: ordered build →
   `npm run populate --prefix packages/patterns-reference` → probe the parsed
   corpus bodies per language (throwaway `.mts` inside
   `packages/testing-framework` or `packages/semantic`, walk
   body/statements/thenBranch/elseBranch/branches/eventHandlers/initBlock,
   print `role=value(type)` + `metadata.patternId`, `process.exit(0)`, delete
   before commit).
3. **Sweep**: full sweep WITHOUT `--regression` (redirect to a file, check
   `$?`, never pipe to `tail`); the R3 `behavior-sortable` rows and the
   multiset qu `behavior-resizable` row must vanish and **no new rows appear
   in ANY signal** — a corpus re-render moves every language's text, so read
   the whole report (parse-rate, precision, R0/R1/R2), not just R3.
4. Flip the locks per the fixture procedure above; flip/retire the NEXT_STEPS
   entries (§ R3 families item 7, § colon-event follow-ups item 2, and the F2
   rendering note); mark this handoff resolved.
5. `--regression` green → `--save-baseline` on the freshly populated db →
   `npx prettier --write baselines/multilingual-priority.json` → audit the
   baseline diff line-by-line (only attributable fields may move) → commit
   baseline, **never patterns.db**.

## Traps (inherited + arc-specific)

- **Corpus rewrites couple to the fidelity baseline** (memory:
  corpus-rewrites-couple-to-fidelity): a transformer change re-renders EVERY
  pattern in that language, not just the target rows. Expect mixed per-language
  deltas and attribute each; "fixing en-reference-adjacent noise makes some
  numbers go down honestly" applies here too. Resweep and inspect
  lossy/degenerate/exec — never trust exit 0 alone.
- **The transformer translates line-by-line** — reorder logic is per-line, but
  defect (c) manifests as a terminator landing inside the *next* phrase of the
  SAME line's rendering (`… wait 200ms end` is one en line). Check where the
  trailing `end` is attached during segmentation before assuming cross-line
  handling.
- Sequence strictly: src → `npm run test:multilingual:build-deps` → `populate`
  → sweep. The gate and `--save-baseline` REFUSE on any guarded package whose
  `src/` is newer than dist; `git stash` (including lint-staged's backup
  stashes during commit) bumps mtimes — rebuild after committing, before
  sweeping.
- After touching **i18n**, rebuild i18n AND everything downstream in the
  ordered chain (populate consumes the built transformer). `semantic/dist`
  resolves `@lokascript/framework` at runtime — same rebuild rule if framework
  is touched.
- tsx probes hang without `process.exit(0)`; probes must run with cwd inside
  the package whose src they import.
- ko/ja curated `isEndKeyword` sets deliberately EXCLUDE the exit/end
  collision words, and bn's excludes শেষ (dual-use positional `last`) — if the
  fix changes which terminator word is emitted, re-check
  `semantic-parser.ts` `isEndKeyword`/`isBlockEndToken` alignment.

## Definition of done

- tr/qu behavior-sortable wait + repeat-header lines render verb-final with
  from-phrase/or-run inside the clause; bn repeat-while renders `200ms কে
  অপেক্ষা শেষ`; qu resizable renders `man churanay` before `tukuy`.
- i18n unit tests lock each fixed rendering shape.
- The four R3 behavior-sortable rows and the qu resizable multiset row are
  gone; the ONLY remaining R3 rows are swap-content ×8 (F6 wontfix). qu/tr/bn
  avgValueRecall rise accordingly; no other signal drops.
- All three `it.fails` locks flipped to hard asserts on refreshed fixtures
  (resizable `set` count 12); old-shape parser-tolerance tests retained.
- NEXT_STEPS updated (items retired with outcomes); this handoff marked
  resolved in its header; baseline regenerated + prettier'd + committed.
