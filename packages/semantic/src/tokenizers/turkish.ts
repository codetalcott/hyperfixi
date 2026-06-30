/**
 * Turkish Tokenizer
 *
 * Tokenizes Turkish hyperscript input.
 * Turkish is challenging because:
 * - Highly agglutinative (many suffixes attach to words)
 * - Strict vowel harmony rules
 * - Postpositions instead of prepositions
 * - No grammatical gender
 * - Word order is typically SOV
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { TurkishMorphologicalNormalizer } from './morphology/turkish-normalizer';
import { turkishProfile } from '../generators/profiles/turkish';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createTurkishKeywordExtractor } from './extractors/turkish-keyword';

// =============================================================================
// Turkish Prepositions (used in classifyToken)
// =============================================================================

/**
 * Turkish postpositions (come after the noun they modify).
 */
const POSTPOSITIONS = new Set([
  'ile', // with
  'için', // for
  'kadar', // until, as far as
  'gibi', // like
  'önce', // before
  'üzerinde', // on, above
  'altında', // under
  'içinde', // inside
  'dışında', // outside
  'arasında', // between
  'karşı', // against, towards
  'göre', // according to
  'rağmen', // despite
  // NOTE: 'doğru' ("towards") is intentionally NOT a postposition here. It
  // collides with the boolean literal `doğru` ("true"), which the i18n dict
  // emits for `set @attr to true`. classifyToken checks POSTPOSITIONS before
  // isKeyword, so listing it here misclassified the value as kind='particle'
  // — and tokenToSemanticValue has no `particle` case, so the set patient role
  // rejected it (set-attribute fell to the role-scrambling SOV fallback). The
  // postpositional "towards" sense is not a hyperscript construct; the value
  // sense is. See STRUCTURAL_ARCS_ROADMAP.md (tr set-attribute).
  'boyunca', // along, throughout
]);

/**
 * Turkish case suffixes (attach to nouns).
 * These are often used as particles in semantic parsing.
 */
const CASE_SUFFIXES = new Set([
  'de',
  'da',
  'te',
  'ta', // locative (at, in)
  'den',
  'dan',
  'ten',
  'tan', // ablative (from)
  'e',
  'a',
  'ye',
  'ya', // dative (to)
  'i',
  'ı',
  'u',
  'ü', // accusative (object)
  'in',
  'ın',
  'un',
  'ün', // genitive (of)
  'le',
  'la',
  'yle',
  'yla', // instrumental (with)
]);

// =============================================================================
// Turkish Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Time units (saniye, dakika, saat with suffixes)
 * - Then disambiguation (sonra)
 *
 * All other keywords (positional, events, commands, logical operators,
 * multi-word phrases) are now in the profile.
 */
const TURKISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'doğru', normalized: 'true' },
  { native: 'dogru', normalized: 'true' },
  { native: 'yanlış', normalized: 'false' },
  { native: 'yanlis', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'boş', normalized: 'null' },
  { native: 'bos', normalized: 'null' },
  { native: 'tanımsız', normalized: 'undefined' },
  { native: 'tanimsiz', normalized: 'undefined' },

  // Positional (not in profile)
  { native: 'ilk', normalized: 'first' },
  { native: 'son', normalized: 'last' },
  { native: 'sonuncu', normalized: 'last' }, // i18n dict emission ('son' doubles as end)
  { native: 'sonraki', normalized: 'next' },
  { native: 'önceki', normalized: 'previous' },
  { native: 'onceki', normalized: 'previous' },
  // Fused single token — the tokenizer splits on '_', so the old 'en_yakın'
  // entries were dead. The i18n dict emits the fused superlative.
  { native: 'enyakın', normalized: 'closest' },
  { native: 'enyakin', normalized: 'closest' },
  { native: 'ebeveyn', normalized: 'parent' },

  // Complex event names (multi-word events not in profile)
  { native: 'fare üzerinde', normalized: 'mouseover' },
  { native: 'fare uzerinde', normalized: 'mouseover' },
  { native: 'fare dışında', normalized: 'mouseout' },
  { native: 'fare disinda', normalized: 'mouseout' },
  // Fused mousedown/mouseup (dict emits these WITHOUT `_` since the tokenizer
  // splits on it — see tr.ts events note). repeat-until-event / handler events.
  { native: 'farebas', normalized: 'mousedown' },
  { native: 'farebırak', normalized: 'mouseup' },
  { native: 'farebirak', normalized: 'mouseup' },
  { native: 'kaydır', normalized: 'scroll' },
  { native: 'kaydir', normalized: 'scroll' },
  { native: 'tuş_bas', normalized: 'keydown' },
  { native: 'tus_bas', normalized: 'keydown' },
  { native: 'tuş_bırak', normalized: 'keyup' },
  { native: 'tus_birak', normalized: 'keyup' },

  // Time units
  { native: 'saniye', normalized: 's' },
  { native: 'milisaniye', normalized: 'ms' },
  { native: 'dakika', normalized: 'm' },
  { native: 'saat', normalized: 'h' },
];

// =============================================================================
// Turkish Tokenizer Implementation
// =============================================================================

export class TurkishTokenizer extends BaseTokenizer {
  readonly language = 'tr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(turkishProfile, TURKISH_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new TurkishMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(createTurkishKeywordExtractor()); // Turkish keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (POSTPOSITIONS.has(lower)) return 'particle';
    if (CASE_SUFFIXES.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // URLs/paths before selectors (./path vs .class) — matches the other
    // tokenizers (hindi/japanese/…). Without this `/api/data` fell through to
    // `identifier` → `expression`, breaking the `fetch.source:literal` R1 match.
    if (
      token.startsWith('/') ||
      token.startsWith('./') ||
      token.startsWith('../') ||
      token.startsWith('http')
    )
      return 'url';
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

  // tryMultiWordPhrase(), extractTurkishWord(), extractTurkishNumber() methods removed
  // Now handled by TurkishKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const turkishTokenizer = new TurkishTokenizer();
