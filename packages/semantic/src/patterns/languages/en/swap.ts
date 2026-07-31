/**
 * English Swap Patterns
 *
 * Hand-crafted patterns for swap command without prepositions.
 */

import type { LanguagePattern } from '../../../types';

/**
 * English: "swap <strategy> <target>" without prepositions.
 * Examples:
 * - swap delete #item
 * - swap innerHTML #target
 * - swap outerHTML me
 */
export const swapSimpleEnglish: LanguagePattern = {
  id: 'swap-en-handcrafted',
  language: 'en',
  command: 'swap',
  priority: 110, // Higher than generated patterns
  template: {
    format: 'swap {method} {destination}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'method' },
      { type: 'role', role: 'destination' },
    ],
  },
  extraction: {
    method: { position: 1 },
    destination: { position: 2 },
  },
};

/**
 * English element-swap: "swap {destination} with {patient}" (`swap #a with #b`).
 *
 * The method-less, `with`-marked element-swap shape. Without it the method form
 * above greedily binds `#a`→method and the word `with`→destination and drops `#b`.
 * Priority 120 > 110, and the required `with` literal means it only fires on this
 * shape (the `swap innerHTML #target` form has no `with`). Mirrors `swapElementEnglish`
 * in patterns/en.ts (the registered path); kept in sync so both builders agree.
 */
export const swapElementEnglish: LanguagePattern = {
  id: 'swap-en-element',
  language: 'en',
  command: 'swap',
  priority: 120,
  template: {
    format: 'swap {destination} with {patient}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'destination' },
      { type: 'literal', value: 'with' },
      { type: 'role', role: 'patient' },
    ],
  },
  extraction: {},
};

/**
 * English strategy-swap with an explicit `of`: `swap innerHTML of #t with "X"`.
 *
 * `SwapCommand`'s own documented surface, and the shape `swap {method}
 * {destination}` (110) mis-binds: it takes `innerHTML`→method and the bare word
 * `of`→destination, dropping the target AND the content. Priority 140 — above
 * every other swap pattern — and the two required literals mean it fires on
 * this shape alone.
 */
export const swapStrategyOfEnglish: LanguagePattern = {
  id: 'swap-en-strategy-of',
  language: 'en',
  command: 'swap',
  priority: 140,
  template: {
    format: 'swap {method} of {destination} with {patient}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'method' },
      { type: 'literal', value: 'of' },
      { type: 'role', role: 'destination' },
      { type: 'literal', value: 'with' },
      { type: 'role', role: 'patient' },
    ],
  },
  extraction: {},
};

/**
 * English strategy-swap without `of`: `swap into #t with it`, `swap over #modal
 * with c`, `swap beforebegin #t with it`.
 *
 * Same defect as above minus the `of`: the 110 pattern bound method+destination
 * and the `with` content was never captured, so the runtime received a two-arg
 * node and swapped in nothing.
 *
 * Priority 130 sits below the `of` form and above the method-less element swap
 * (120), which is what keeps `swap #a with #b` on its own pattern: this one
 * needs FOUR slots after the verb (method, destination, `with`, patient) and
 * `#a with #b` supplies three, so it cannot match.
 */
export const swapStrategyEnglish: LanguagePattern = {
  id: 'swap-en-strategy',
  language: 'en',
  command: 'swap',
  priority: 130,
  template: {
    format: 'swap {method} {destination} with {patient}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'method' },
      { type: 'role', role: 'destination' },
      { type: 'literal', value: 'with' },
      { type: 'role', role: 'patient' },
    ],
  },
  extraction: {},
};

/**
 * All English swap patterns.
 *
 * Ordered most-specific first, matching descending priority. `patterns/en.ts`
 * — the list the registered `en` language module actually builds — imports this
 * array rather than redeclaring it; it used to carry a hand-synced copy of the
 * two originals, so a pattern added to only one side had no runtime effect.
 */
export const swapPatternsEn: LanguagePattern[] = [
  swapStrategyOfEnglish,
  swapStrategyEnglish,
  swapElementEnglish,
  swapSimpleEnglish,
];
