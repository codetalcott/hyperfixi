/**
 * English Pick Patterns
 *
 * Hand-crafted patterns for the canonical hyperscript `pick` command, whose
 * grammar is (hyperscript.org@0.9.93 PickCommand):
 *
 *   pick [the]
 *     first  <count>            (of|from) <root>
 *     last   <count>            (of|from) <root>
 *     random [<count>]          (of|from) <root>
 *     (item|items|character|characters) <range> (of|from) <root>
 *         range: [at|from] (start|<expr>) [(to|..) (end|<expr>)] [inclusive|exclusive]
 *     match   [of] <re> [| flags] (of|from) <root>
 *     matches [of] <re> [| flags] (of|from) <root>
 *
 * The schema-generated fallback (`pick {patient} [from {source}]`, priority 100)
 * models the wrong command ("random element from a collection") and silently
 * dropped everything after the first word — the en reference of the corpus row
 * `pick characters 0 to 5 of #note` truncated to `pick characters` and was the
 * sole entry in the canonical-validity allowlist. These handcrafted patterns
 * park the variant word in `method` and the range/count/regex in `patient`, so
 * the surface round-trips verbatim through the renderer and the pick AST mapper
 * can reconstruct the core command's modifiers.
 *
 * The variant word MUST ride a role (not a pattern literal): render pattern
 * selection is role-scored (`findBestPattern`), so a literal `characters` would
 * be indistinguishable from `first`/`last` at render time. `method` is reused
 * here exactly as `swap` reuses it for its strategy word.
 *
 * Priority invariant: this pattern MUST stay above the generated fallback
 * (100). The generated pattern still legitimately handles the legacy
 * `pick X from Y` array form (no `method`), protected at render time by the
 * −50 missing-`method` penalty in findBestPattern.
 *
 * Deferred (not corpus-exercised; behavior unchanged from today):
 *  - `match`/`matches` (`pick match [of] <re> of <root>`). Its two-`of` surface
 *    needs a distinct pattern, but that pattern's role set (method+patient+
 *    source) is IDENTICAL to the variant pattern's, and render selection
 *    (`findBestPattern`) scores by role PRESENCE, not value — so whichever has
 *    the higher priority renders BOTH, dropping one `of` from one of them.
 *    Distinguishing them needs a match-only role (a renderer change), so match
 *    is deferred with the rest of the follow-on variants; today it falls to the
 *    generated pattern (degenerate, unchanged).
 *  - bare `pick random of X` (no count): a patient-less pattern would outscore
 *    the generated pattern for legacy `pick X from Y` nodes at render time
 *    (findBestPattern has no penalty for node roles a pattern LACKS) and emit a
 *    spurious `pick random of Y`.
 *  - regex `| flags`, and a leading `at`/`from` range prefix.
 *
 * Arc 2 (24-language vocabulary) dispositions — probe-driven, 2026-07-20:
 *  - `character`/`characters` and `start` are registered per language in the
 *    tokenizer EXTRAS + i18n dicts (the corpus pick row uses `characters`).
 *    Arc 3 closed the qu gap with native-first `sanampa`. `inclusive`/
 *    `exclusive` likewise, for the 20 languages with a confident technical
 *    term; hi/qu/sw remain DEFERRED (uncertain vocab, not corpus-exercised)
 *    — see docs-internal/HANDOFF_pick-text-range-arc2.md.
 *  - `item`/`items` are DEFERRED entirely. Probe: adding `item` to a dict's
 *    `expressions` renames the loop variable in the corpus rows
 *    `repeat for item in .items …` (item → its translation), a non-pick-row
 *    movement. No corpus pick row uses `item(s)` (all use `characters`), so the
 *    collision buys nothing in arc 2; revisit in arc 3 if a pick row needs it.
 *  - En itself gets NO new EXTRAS/dict entries: `characters`/`item(s)`/mode
 *    words ride as identifiers through this pattern and the range assembler
 *    already matches `inclusive`/`exclusive`/`start`/`end` by value. Turning
 *    them into en keywords would only risk this pattern's identifier path.
 *  - The foreign range separator LANDED in arc 3 (was deferred here):
 *    per-language separator words live in PICK_RANGE_SEPARATORS_BY_LANG
 *    (pattern-matcher.ts), value-matched because they normalize to
 *    `destination`; the fold now synthesizes canonical English (`0 a 5` →
 *    `0 to 5`) so this pattern, the mapper's `to`-split, and the en render
 *    are language-agnostic. The foreign variant patterns (the analogues of
 *    this one) live in patterns/pick.ts — verb-initial and verb-final
 *    factories, co-evolved with the i18n sovPickRangeRule renders.
 *  - The range-endpoint keywords `start`/`end` stay en-only: `start` is not
 *    corpus-exercised (the pick rows use numeric endpoints 0/5) and 6 native
 *    start words already mean `init` (hi/bn/id/ms/sw) or `default` (qu) — a
 *    dual even the arc-3 patterns don't need to take on. `end` needs no
 *    registration (block-end already normalizes; the assembler accepts a
 *    mid-fold keyword `end`). Arc 1's en `start to end` support is tested in
 *    pick-command.test.ts.
 */

import type { LanguagePattern } from '../../../types';

/**
 * English: `pick <variant> <range|count|index> (of|from) <root>`.
 *
 * Covers the corpus range row (`pick characters 0 to 5 of #note`, patient folded
 * to `0 to 5` by the pick-range assembler) plus `first N` / `last N` / `random N`
 * counts and single-index `item(s)`/`character(s)` for free.
 */
export const pickVariantEnglish: LanguagePattern = {
  id: 'pick-en-variant',
  language: 'en',
  command: 'pick',
  priority: 110,
  template: {
    format: 'pick {method} {patient} of {source}',
    tokens: [
      { type: 'literal', value: 'pick' },
      // Variant word: `characters`/`items`/`match` tokenize as identifiers
      // (expression), `first`/`last`/`random` as keywords.
      { type: 'role', role: 'method', expectedTypes: ['literal', 'expression'] },
      // Range/count/index. The pick-range assembler folds `<a> to <b>
      // [inclusive|exclusive]` into one expression value here; a lone count
      // (`3`) is captured as a single literal.
      { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'of', alternatives: ['from'] },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
    ],
  },
  extraction: {
    method: { position: 1 },
    patient: { position: 2 },
    source: { marker: 'of', markerAlternatives: ['from'] },
  },
};

/**
 * All English pick patterns.
 */
export const pickPatternsEn: LanguagePattern[] = [pickVariantEnglish];
