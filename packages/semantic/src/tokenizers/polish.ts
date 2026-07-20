/**
 * Polish Tokenizer
 *
 * Tokenizes Polish hyperscript input.
 * Polish characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions
 * - Polish diacritics: ą, ę, ć, ń, ó, ś, ź, ż, ł
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (unlike most languages that use infinitive)
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { polishProfile } from '../generators/profiles/polish';
import { PolishMorphologicalNormalizer } from './morphology/polish-normalizer';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createPolishExtractors } from './extractors/polish-keyword';

// =============================================================================
// Polish Prepositions (used in classifyToken)
// =============================================================================

/**
 * Polish prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'do', // to, into
  'od', // from
  'z', // from, with
  'ze', // from, with (before consonant clusters)
  'w', // in
  'we', // in (before consonant clusters)
  'na', // on, for
  'po', // after, for
  'pod', // under
  'przed', // before, in front of
  'za', // behind, for
  'nad', // above
  'między', // between
  'miedzy', // between (no diacritic)
  'przez', // through, by
  'dla', // for
  'bez', // without
  'o', // about
  'przy', // at, by
  'u', // at (someone's place)
  'według', // according to
  'wedlug', // according to (no diacritic)
  'mimo', // despite
  'wśród', // among
  'wsrod', // among (no diacritic)
  'obok', // beside
  'poza', // outside, beyond
  'wokół', // around
  'wokol', // around (no diacritic)
  'przeciw', // against
  'ku', // towards
]);

// =============================================================================
// Polish Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional verb forms and synonyms
 */
const POLISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'prawda', normalized: 'true' },
  { native: 'fałsz', normalized: 'false' },
  { native: 'falsz', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'nieokreślony', normalized: 'undefined' },
  { native: 'nieokreslony', normalized: 'undefined' },

  // Positional
  { native: 'pierwszy', normalized: 'first' },
  { native: 'pierwsza', normalized: 'first' },
  { native: 'pierwsze', normalized: 'first' },
  { native: 'ostatni', normalized: 'last' },
  { native: 'ostatnia', normalized: 'last' },
  { native: 'ostatnie', normalized: 'last' },
  { native: 'następny', normalized: 'next' },
  { native: 'nastepny', normalized: 'next' },
  { native: 'poprzedni', normalized: 'previous' },
  { native: 'najbliższy', normalized: 'closest' },
  { native: 'najblizszy', normalized: 'closest' },
  { native: 'rodzic', normalized: 'parent' },

  // Events
  { native: 'kliknięcie', normalized: 'click' },
  { native: 'klikniecie', normalized: 'click' },
  { native: 'klik', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'zmiana', normalized: 'change' },
  { native: 'wysłanie', normalized: 'submit' },
  { native: 'wyslanie', normalized: 'submit' },
  { native: 'naciśnięcie', normalized: 'keydown' },
  { native: 'nacisniecie', normalized: 'keydown' },
  { native: 'klawisz', normalized: 'keydown' },
  { native: 'najechanie', normalized: 'mouseover' },
  { native: 'zjechanie', normalized: 'mouseout' },
  { native: 'rozmycie', normalized: 'blur' },
  { native: 'załadowanie', normalized: 'load' },
  { native: 'zaladowanie', normalized: 'load' },
  { native: 'przewinięcie', normalized: 'scroll' },
  { native: 'przewiniecie', normalized: 'scroll' },
  { native: 'input', normalized: 'input' },

  // References
  { native: 'mój', normalized: 'my' },
  { native: 'moj', normalized: 'my' },

  // Time units
  { native: 'sekunda', normalized: 's' },
  { native: 'sekundy', normalized: 's' },
  { native: 'sekund', normalized: 's' },
  { native: 'milisekunda', normalized: 'ms' },
  { native: 'milisekundy', normalized: 'ms' },
  { native: 'milisekund', normalized: 'ms' },
  { native: 'minuta', normalized: 'm' },
  { native: 'minuty', normalized: 'm' },
  { native: 'minut', normalized: 'm' },
  { native: 'godzina', normalized: 'h' },
  { native: 'godziny', normalized: 'h' },
  { native: 'godzin', normalized: 'h' },

  // Additional verb forms not in profile (lay/put variants)
  { native: 'połóż', normalized: 'put' },
  { native: 'poloz', normalized: 'put' },

  // Logical/conditional
  { native: 'lub', normalized: 'or' },
  { native: 'nie', normalized: 'not' },
  { native: 'jest', normalized: 'is' },
  { native: 'istnieje', normalized: 'exists' },
  { native: 'pusty', normalized: 'empty' },
  { native: 'puste', normalized: 'empty' },
  { native: 'włącznie', normalized: 'inclusive' },
  { native: 'wyłącznie', normalized: 'exclusive' },
  { native: 'znaki', normalized: 'characters' },
  { native: 'losowy', normalized: 'random' },
];

// =============================================================================
// Polish Tokenizer Implementation
// =============================================================================

export class PolishTokenizer extends BaseTokenizer {
  readonly language = 'pl';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(polishProfile, POLISH_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new PolishMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createPolishExtractors()); // Polish keywords (context-aware)
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
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // extractWord(), extractNumber() methods removed
  // Now handled by PolishKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const polishTokenizer = new PolishTokenizer();
