/**
 * Quechua Tokenizer
 *
 * Tokenizes Quechua (Runasimi) hyperscript input.
 * Quechua characteristics:
 * - SOV word order
 * - Agglutinative/polysynthetic morphology
 * - Postpositions (suffixes)
 * - Case suffixes: -ta (accusative), -man (allative), -manta (ablative), etc.
 * - Evidential markers
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { quechuaProfile } from '../generators/profiles/quechua';
import { quechuaMorphologicalNormalizer } from './morphology/quechua-normalizer';
import { NumberExtractor, OperatorExtractor, PunctuationExtractor } from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createQuechuaKeywordExtractor } from './extractors/quechua-keyword';
import type { ValueExtractor, ExtractionResult } from './value-extractor-types';

// =============================================================================
// Quechua-Specific String Literal Extractor
// =============================================================================

/**
 * Custom string literal extractor for Quechua.
 * Only accepts double quotes (") to avoid conflicts with apostrophes in words
 * like "ñit'iy" (glottalized sounds).
 */
class QuechuaStringLiteralExtractor implements ValueExtractor {
  readonly name = 'quechua-string-literal';

  canExtract(input: string, position: number): boolean {
    return input[position] === '"';
  }

  extract(input: string, position: number): ExtractionResult | null {
    const quote = input[position];
    let value = quote;
    let pos = position + 1;

    while (pos < input.length) {
      const char = input[pos];
      if (char === quote) {
        value += char;
        return { value, length: value.length };
      }
      if (char === '\\' && pos + 1 < input.length) {
        value += char + input[pos + 1];
        pos += 2;
      } else {
        value += char;
        pos++;
      }
    }

    return null; // Unclosed string
  }
}

// =============================================================================
// Quechua Suffixes (used in classifyToken)
// =============================================================================

const SUFFIXES = new Set([
  '-ta', // accusative (direct object)
  '-man', // allative (to, towards)
  '-manta', // ablative (from)
  '-pi', // locative (at, in)
  '-wan', // comitative/instrumental (with)
  '-paq', // benefactive (for)
  '-kama', // limitative (until, up to)
  '-rayku', // causative (because of)
  '-hina', // simulative (like, as)
  // Standalone (unhyphenated) forms — used when written as separate words
  'ta',
  'man',
  'manta',
  'pi',
  'wan',
  'paq',
  'kama',
  'hina',
  'pa',
]);

// =============================================================================
// Quechua Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const QUECHUA_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'arí', normalized: 'true' },
  { native: 'ari', normalized: 'true' },
  { native: 'manan', normalized: 'false' },
  { native: 'mana', normalized: 'false' },
  { native: "ch'usaq", normalized: 'null' },
  { native: 'chusaq', normalized: 'null' },
  { native: 'mana riqsisqa', normalized: 'undefined' },

  // Positional
  { native: 'ñawpaq', normalized: 'first' },
  { native: 'nawpaq', normalized: 'first' },
  { native: 'qhipa', normalized: 'last' },
  { native: 'hamuq', normalized: 'next' },
  { native: 'ñawpaq kaq', normalized: 'previous' },
  { native: 'ñawpaq_kaq', normalized: 'previous' },
  { native: 'aswan qayllaqa', normalized: 'closest' },
  { native: 'tayta', normalized: 'parent' },

  // Events
  { native: 'llikllay', normalized: 'click' },
  { native: 'ñitiy', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'yaykuy', normalized: 'input' },
  { native: 'llave uray', normalized: 'keydown' },
  { native: 'llave hawa', normalized: 'keyup' },
  { native: 'mausiri yayku', normalized: 'mouseover' },
  { native: 'mausiri lluqsi', normalized: 'mouseout' },
  { native: 'qhaway', normalized: 'focus' },
  { native: 'mana qhaway', normalized: 'blur' },
  { native: 'kargay', normalized: 'load' },
  { native: 'muyuy', normalized: 'scroll' },

  // References
  { native: 'ñuqa', normalized: 'me' },
  { native: 'nuqa', normalized: 'me' },
  { native: 'ñuqap', normalized: 'my' },
  { native: 'nuqap', normalized: 'my' },
  { native: 'chay', normalized: 'it' },
  { native: 'chaymi', normalized: 'it' },
  { native: 'lluqsiy', normalized: 'result' },
  { native: 'ruway', normalized: 'event' },
  { native: 'maypi', normalized: 'target' },

  // Time units
  { native: 'sikundu', normalized: 's' },
  { native: 'segundu', normalized: 's' },
  { native: 'waranqa sikundu', normalized: 'ms' },
  { native: 'minutu', normalized: 'm' },
  { native: 'ura', normalized: 'h' },
  { native: 'hora', normalized: 'h' },

  // Event triggers (on)
  { native: 'chaypim', normalized: 'on' },
  { native: 'kaypi', normalized: 'on' },

  // Control flow helpers
  { native: 'chayqa', normalized: 'then' },
  { native: 'chaymanta', normalized: 'then' },
  { native: 'chaymantataq', normalized: 'then' },
  { native: 'hinaspa', normalized: 'then' },
  { native: 'tukukuy', normalized: 'end' },
  { native: 'puchukay', normalized: 'end' },
  { native: 'kaykama', normalized: 'until' },

  // Command overrides
  { native: 'yapay', normalized: 'add' }, // Profile may have this as 'append'
  { native: "t'ikray", normalized: 'toggle' },
  { native: 'tikray', normalized: 'toggle' },

  // DOM focus
  { native: 'qhawachiy', normalized: 'focus' },
  { native: 'mana qhawachiy', normalized: 'blur' },

  // Suffix modifiers
  { native: '-manta', normalized: 'from' },
];

// =============================================================================
// Quechua Tokenizer Implementation
// =============================================================================

export class QuechuaTokenizer extends BaseTokenizer {
  readonly language = 'qu';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(quechuaProfile, QUECHUA_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(quechuaMorphologicalNormalizer);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new QuechuaStringLiteralExtractor()); // Strings (double quotes only)
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(createQuechuaKeywordExtractor()); // Quechua keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (SUFFIXES.has(lower)) return 'particle';
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
    if (token.startsWith('"')) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  // trySuffix(), splitSelectorSuffix(), tryMultiWordKeyword(), extractWord(), extractNumber() methods removed
  // Now handled by QuechuaKeywordExtractor (context-aware)
}

export const quechuaTokenizer = new QuechuaTokenizer();
