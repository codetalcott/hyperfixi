/**
 * Swahili Tokenizer
 *
 * Tokenizes Swahili (Kiswahili) hyperscript input.
 * Swahili characteristics:
 * - SVO word order
 * - Agglutinative morphology
 * - Noun class prefixes (m-, wa-, ki-, vi-, etc.)
 * - Verb prefixes for subject/object agreement
 * - No grammatical gender, but noun classes
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { swahiliProfile } from '../generators/profiles/swahili';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createSwahiliExtractors } from './extractors/swahili-keyword';

// =============================================================================
// Swahili Prepositions (used in classifyToken)
// =============================================================================

/**
 * Swahili prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'kwa', // to, for, with, by
  'na', // and, with
  'katika', // in, at
  'kwenye', // on, at
  'kutoka', // from
  'hadi', // until, to
  'mpaka', // until, up to
  'kabla', // before
  'baada', // after
  'wakati', // during, when
  'bila', // without
  'kuhusu', // about
  'karibu', // near
  'mbele', // in front of
  'nyuma', // behind
  'ndani', // inside
  'nje', // outside
  'juu', // above, on
  'chini', // below, under
  'kati', // between
]);

// =============================================================================
// Swahili Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Noun class possessive variants
 */
const SWAHILI_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'kweli', normalized: 'true' },
  { native: 'uongo', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  // 'tupu' also means the null literal, but it is claimed by 'empty' below
  // (the `ni tupu` is-empty predicate, #325). Keyword-map insertion is
  // last-wins, so a second entry here would be dead code — see
  // tokenizer-keyword-injectivity.test.ts.
  { native: 'haijafafanuliwa', normalized: 'undefined' },

  // Positional
  { native: 'wa kwanza', normalized: 'first' },
  { native: 'wa mwisho', normalized: 'last' },
  { native: 'ifuatayo', normalized: 'next' },
  { native: 'ijayo', normalized: 'next' }, // i18n dict emits 'ijayo' for next
  { native: 'iliyotangulia', normalized: 'previous' },
  { native: 'karibu', normalized: 'closest' },
  { native: 'mzazi', normalized: 'parent' },

  // Events
  { native: 'bonyeza', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'ganti', normalized: 'change' }, // Use 'ganti' instead of 'badilisha' to avoid conflict
  { native: 'wasilisha', normalized: 'submit' },
  { native: 'bonyeza kitufe', normalized: 'keydown' },
  { native: 'sogeza juu', normalized: 'mouseover' },
  { native: 'sogeza nje', normalized: 'mouseout' },
  { native: 'fifia', normalized: 'blur' },
  { native: 'pakia', normalized: 'load' },
  { native: 'sukuma', normalized: 'scroll' },
  { native: 'input', normalized: 'input' },

  // References
  { native: 'yangu', normalized: 'my' },
  { native: 'wangu', normalized: 'my' },
  { native: 'changu', normalized: 'my' },
  { native: 'langu', normalized: 'my' },

  // Time units
  { native: 'sekunde', normalized: 's' },
  { native: 'millisekunde', normalized: 'ms' },
  { native: 'dakika', normalized: 'm' },
  { native: 'saa', normalized: 'h' },

  // Logical/conditional
  { native: 'au', normalized: 'or' },
  { native: 'si', normalized: 'not' },
  { native: 'ni', normalized: 'is' },
  { native: 'ipo', normalized: 'exists' },
  { native: 'tupu', normalized: 'empty' },
];

// =============================================================================
// Swahili Tokenizer Implementation
// =============================================================================

export class SwahiliTokenizer extends BaseTokenizer {
  readonly language = 'sw';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(swahiliProfile, SWAHILI_EXTRAS);
    // Swahili has morphological normalization but no normalizer is set yet
    // If SwahiliMorphologicalNormalizer exists, uncomment:
    // this.setNormalizer(new SwahiliMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createSwahiliExtractors()); // Swahili keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // Check for event modifiers before CSS selectors
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
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  // extractWord(), extractNumber() methods removed
  // Now handled by SwahiliKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const swahiliTokenizer = new SwahiliTokenizer();
