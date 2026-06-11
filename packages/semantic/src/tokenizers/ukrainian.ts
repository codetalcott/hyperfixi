/**
 * Ukrainian Tokenizer
 *
 * Tokenizes Ukrainian hyperscript input.
 * Ukrainian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions (в/у for 'in', з/із/зі for 'with/from')
 * - Cyrillic alphabet with unique letters (і, ї, є, ґ)
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (infinitive also common)
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { UkrainianMorphologicalNormalizer } from './morphology/ukrainian-normalizer';
import { ukrainianProfile } from '../generators/profiles/ukrainian';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createUkrainianExtractors } from './extractors/cyrillic-keyword';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// =============================================================================
// Ukrainian Prepositions (used in classifyToken)
// =============================================================================

/**
 * Ukrainian prepositions (similar to Russian but with unique letters і, ї, є, ґ).
 * Note: Ukrainian uses 'в/у' for 'in', 'з/із/зі' for 'with/from'.
 */
const PREPOSITIONS = new Set([
  'в', // in
  'у', // in
  'на', // on
  'з', // with, from
  'із', // with (variant)
  'зі', // with (before consonant clusters)
  'до', // to
  'від', // from
  'о', // about
  'об', // about (before vowels)
  'при', // at, during
  'для', // for
  'під', // under
  'над', // above
  'перед', // in front of
  'між', // between
  'через', // through
  'без', // without
  'по', // along, by
  'за', // behind, for
  'про', // about
  'після', // after
  'навколо', // around
  'проти', // against
  'замість', // instead of
  'крім', // except
  'серед', // among
  'к', // to (less common)
]);

// =============================================================================
// Ukrainian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Time units (секунда, хвилина, година with inflections)
 * - Additional gendered forms
 *
 * All other keywords (positional, events, commands, logical operators)
 * are now in the profile.
 */
const UKRAINIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals (not in profile - generic across all languages)
  { native: 'істина', normalized: 'true' },
  { native: 'правда', normalized: 'true' },
  { native: 'хибність', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'невизначено', normalized: 'undefined' },

  // Time units (not in profile - handled by number parser)
  { native: 'секунда', normalized: 's' },
  { native: 'секунди', normalized: 's' },
  { native: 'секунд', normalized: 's' },
  { native: 'мілісекунда', normalized: 'ms' },
  { native: 'мілісекунди', normalized: 'ms' },
  { native: 'мілісекунд', normalized: 'ms' },
  { native: 'хвилина', normalized: 'm' },
  { native: 'хвилини', normalized: 'm' },
  { native: 'хвилин', normalized: 'm' },
  { native: 'година', normalized: 'h' },
  { native: 'години', normalized: 'h' },
  { native: 'годин', normalized: 'h' },

  // Positional (masculine nominative — the forms the i18n dict emits; the
  // gendered variants below predate these but the base forms were never
  // listed, so `останній <.message/> в #chat` never formed a positional
  // query — see positional-keyword-drift.test.ts)
  { native: 'перший', normalized: 'first' },
  { native: 'останній', normalized: 'last' },
  { native: 'наступний', normalized: 'next' },
  { native: 'попередній', normalized: 'previous' },
  { native: 'найближчий', normalized: 'closest' },
  { native: 'батьківський', normalized: 'parent' },
  { native: 'випадковий', normalized: 'random' },

  // Gendered forms (additional variants)
  { native: 'перша', normalized: 'first' }, // feminine
  { native: 'перше', normalized: 'first' }, // neuter
  { native: 'остання', normalized: 'last' }, // feminine
  { native: 'останнє', normalized: 'last' }, // neuter
  { native: 'наступна', normalized: 'next' }, // feminine
  { native: 'попередня', normalized: 'previous' }, // feminine
  { native: 'порожня', normalized: 'empty' }, // feminine
  { native: 'порожнє', normalized: 'empty' }, // neuter
  { native: 'моя', normalized: 'my' }, // feminine
  { native: 'моє', normalized: 'my' }, // neuter
  { native: 'мої', normalized: 'my' }, // plural
];

// =============================================================================
// Ukrainian Tokenizer Implementation
// =============================================================================

export class UkrainianTokenizer extends BaseTokenizer {
  readonly language = 'uk';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(ukrainianProfile, UKRAINIAN_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new UkrainianMorphologicalNormalizer());

    // Register extractors (order matters: specific before generic)
    this.registerExtractors([
      ...getHyperscriptExtractors(), // CSS, URL, property access, variable refs, event modifiers
      ...createUkrainianExtractors(), // Ukrainian keywords with morphology
      new StringLiteralExtractor(),
      new NumberExtractor(),
      new AsciiIdentifierExtractor(), // ASCII identifiers (for mixed content)
      new OperatorExtractor(),
      new PunctuationExtractor(),
    ]);
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // Check event modifiers BEFORE selectors (.once vs .active)
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }
}

export const ukrainianTokenizer = new UkrainianTokenizer();
