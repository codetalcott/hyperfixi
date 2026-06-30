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
 * All English swap patterns.
 */
export const swapPatternsEn: LanguagePattern[] = [swapElementEnglish, swapSimpleEnglish];
