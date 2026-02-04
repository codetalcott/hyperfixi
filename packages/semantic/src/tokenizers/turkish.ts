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

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createLatinCharClassifiers,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type KeywordEntry,
  type TimeUnitMapping,
} from './base';
import { TurkishMorphologicalNormalizer } from './morphology/turkish-normalizer';
import { turkishProfile } from '../generators/profiles/turkish';

// =============================================================================
// Turkish Character Classification
// =============================================================================

const { isLetter: isTurkishLetter } = createLatinCharClassifiers(/[a-zA-ZçÇğĞıİöÖşŞüÜ]/);

// =============================================================================
// Turkish Particles and Postpositions
// =============================================================================

/**
 * Turkish postpositions (come after the noun they modify).
 */
const POSTPOSITIONS = new Set([
  'ile', // with
  'için', // for
  'kadar', // until, as far as
  'gibi', // like
  // 'sonra' removed — classified as keyword('then') for hyperscript clause chaining
  'önce', // before
  'üzerinde', // on, above
  'altında', // under
  'içinde', // inside
  'dışında', // outside
  'arasında', // between
  'karşı', // against, towards
  'göre', // according to
  'rağmen', // despite
  'doğru', // towards
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
 * Extra keywords not covered by the profile.
 *
 * SIMPLIFIED: Following the Tagalog/Hindi model of minimal EXTRAS.
 * Command synonyms and diacritic-free variants should be in profile alternatives,
 * not duplicated here. Only includes:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - References not in profile
 * - Logical operators
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

  // Positional
  { native: 'ilk', normalized: 'first' },
  { native: 'son', normalized: 'last' },
  { native: 'sonraki', normalized: 'next' },
  { native: 'önceki', normalized: 'previous' },
  { native: 'onceki', normalized: 'previous' },
  { native: 'en_yakın', normalized: 'closest' },
  { native: 'en_yakin', normalized: 'closest' },
  { native: 'ebeveyn', normalized: 'parent' },

  // Events
  { native: 'tıklama', normalized: 'click' },
  { native: 'tiklama', normalized: 'click' },
  { native: 'tık', normalized: 'click' },
  { native: 'tik', normalized: 'click' },
  { native: 'giriş', normalized: 'input' },
  { native: 'giris', normalized: 'input' },
  { native: 'değişim', normalized: 'change' },
  { native: 'degisim', normalized: 'change' },
  { native: 'odak', normalized: 'focus' },
  { native: 'bulanık', normalized: 'blur' },
  { native: 'bulanik', normalized: 'blur' },
  { native: 'fare üzerinde', normalized: 'mouseover' },
  { native: 'fare uzerinde', normalized: 'mouseover' },
  { native: 'fare dışında', normalized: 'mouseout' },
  { native: 'fare disinda', normalized: 'mouseout' },
  { native: 'kaydır', normalized: 'scroll' },
  { native: 'kaydir', normalized: 'scroll' },
  { native: 'tuş_bas', normalized: 'keydown' },
  { native: 'tus_bas', normalized: 'keydown' },
  { native: 'tuş_bırak', normalized: 'keyup' },
  { native: 'tus_birak', normalized: 'keyup' },

  // References (possessive forms not in profile)
  { native: 'benim', normalized: 'my' },
  { native: 'onun', normalized: 'its' },

  // Time units
  { native: 'saniye', normalized: 's' },
  { native: 'milisaniye', normalized: 'ms' },
  { native: 'dakika', normalized: 'm' },
  { native: 'saat', normalized: 'h' },

  // Then/conjunction (clause chaining)
  { native: 'sonra', normalized: 'then' },
  { native: 'ardından', normalized: 'then' },
  { native: 'ardindan', normalized: 'then' },
  { native: 'daha sonra', normalized: 'then' },

  // Logical
  { native: 've', normalized: 'and' },
  { native: 'veya', normalized: 'or' },
  { native: 'değil', normalized: 'not' },
  { native: 'degil', normalized: 'not' },

  // Note: Command synonyms and diacritic-free variants should be in profile alternatives.
  // Event triggers (üzerinde, olduğunda) should be in profile as 'on' alternatives.
];

// =============================================================================
// Turkish Time Units
// =============================================================================

/**
 * Turkish time unit patterns for number parsing.
 * Sorted by length (longest first) to ensure correct matching.
 * Includes abbreviations (dk, sa) commonly used in Turkish.
 */
const TURKISH_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'milisaniye', suffix: 'ms', length: 10, caseInsensitive: true },
  { pattern: 'dakika', suffix: 'm', length: 6, caseInsensitive: true },
  { pattern: 'saniye', suffix: 's', length: 6, caseInsensitive: true },
  { pattern: 'saat', suffix: 'h', length: 4, caseInsensitive: true },
  { pattern: 'dk', suffix: 'm', length: 2, checkBoundary: true }, // Common abbreviation for dakika
  { pattern: 'sa', suffix: 'h', length: 2, checkBoundary: true }, // Common abbreviation for saat
];

// =============================================================================
// Turkish Tokenizer Implementation
// =============================================================================

export class TurkishTokenizer extends BaseTokenizer {
  readonly language = 'tr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(turkishProfile, TURKISH_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new TurkishMorphologicalNormalizer();
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // Try CSS selector first (ASCII-based)
      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
          continue;
        }

        // Check for property access (obj.prop) vs CSS selector (.active)
        if (this.tryPropertyAccess(input, pos, tokens)) {
          pos++;
          continue;
        }

        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // Try string literal
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Try URL (/path, ./path, http://, etc.)
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number (including Turkish time units)
      if (isDigit(input[pos])) {
        const numberToken = this.extractTurkishNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Try variable reference (:varname)
      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Try multi-word phrases first (e.g., "üzerine gelme", "fare üzerinde")
      const phraseToken = this.tryMultiWordPhrase(input, pos);
      if (phraseToken) {
        tokens.push(phraseToken);
        pos = phraseToken.position.end;
        continue;
      }

      // Try Turkish word
      if (isTurkishLetter(input[pos])) {
        const wordToken = this.extractTurkishWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'tr');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (POSTPOSITIONS.has(lower)) return 'particle';
    if (CASE_SUFFIXES.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
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

  /**
   * Try to match multi-word phrases that function as single units.
   * Multi-word phrases are included in profileKeywords and sorted longest-first,
   * so they'll be matched before their constituent words.
   *
   * Examples: "üzerine gelme" (hover), "fare üzerinde" (mouseover)
   */
  private tryMultiWordPhrase(input: string, pos: number): LanguageToken | null {
    // Check against multi-word entries in profileKeywords (sorted longest-first)
    for (const entry of this.profileKeywords) {
      // Only check multi-word phrases (contain space)
      if (!entry.native.includes(' ')) continue;

      const phrase = entry.native;
      const candidate = input.slice(pos, pos + phrase.length).toLowerCase();
      if (candidate === phrase.toLowerCase()) {
        // Check word boundary
        const nextPos = pos + phrase.length;
        if (
          nextPos >= input.length ||
          isWhitespace(input[nextPos]) ||
          !isTurkishLetter(input[nextPos])
        ) {
          return createToken(
            input.slice(pos, pos + phrase.length),
            'keyword',
            createPosition(pos, nextPos),
            entry.normalized
          );
        }
      }
    }

    return null;
  }

  /**
   * Extract a Turkish word.
   * Uses morphological normalization to handle verb conjugations.
   */
  private extractTurkishWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    // Extract Turkish letters (including special chars)
    while (pos < input.length && (isTurkishLetter(input[pos]) || input[pos] === '_')) {
      word += input[pos++];
    }

    if (!word) return null;

    const lowerWord = word.toLowerCase();

    // Check if it's a case suffix (particle) first
    // This prevents roleMarker keywords from overriding particle classification
    if (CASE_SUFFIXES.has(lowerWord)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // Check if it's a postposition
    if (POSTPOSITIONS.has(lowerWord)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(lowerWord);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Try morphological normalization for conjugated forms
    const morphToken = this.tryMorphKeywordMatch(lowerWord, startPos, pos);
    if (morphToken) return morphToken;

    // Not a keyword or recognized form, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Turkish time unit suffixes.
   */
  private extractTurkishNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, TURKISH_TIME_UNITS, {
      allowSign: false,
      skipWhitespace: true,
    });
  }
}

/**
 * Singleton instance.
 */
export const turkishTokenizer = new TurkishTokenizer();
