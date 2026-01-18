/**
 * Arabic Tokenizer
 *
 * Tokenizes Arabic hyperscript input.
 * Arabic is challenging because:
 * - Right-to-left (RTL) text direction
 * - Prefix prepositions that attach to words (بـ, لـ, كـ)
 * - Root-pattern morphology
 * - CSS selectors are LTR islands within RTL text
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createUnicodeRangeClassifier,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type KeywordEntry,
  type TimeUnitMapping,
} from './base';
import { ArabicMorphologicalNormalizer } from './morphology/arabic-normalizer';
import { arabicProfile } from '../generators/profiles/arabic';

// =============================================================================
// Arabic Character Classification
// =============================================================================

/** Check if character is Arabic (includes all Arabic Unicode blocks). */
const isArabic = createUnicodeRangeClassifier([
  [0x0600, 0x06ff], // Arabic
  [0x0750, 0x077f], // Arabic Supplement
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb50, 0xfdff], // Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
]);

// =============================================================================
// Arabic Prefixes and Prepositions
// =============================================================================

/**
 * Arabic prefix prepositions that attach to the following word.
 * These are marked with trailing hyphen in patterns to indicate attachment.
 */
const ATTACHED_PREFIXES = new Set([
  'بـ', // bi- (with, by)
  'لـ', // li- (to, for)
  'كـ', // ka- (like, as)
  'وـ', // wa- (and)
]);

/**
 * Arabic proclitic conjunctions and prefixes that attach directly to the following word.
 * These are separated during tokenization for proper list/coordination handling.
 *
 * Single-character proclitics (و, ف) are emitted as separate conjunction tokens
 * to support polysyndetic coordination (A وB وC).
 *
 * Attached prefixes (بـ, لـ, كـ) are prepositions that attach to words.
 * Multi-proclitic sequences (ولـ, وبـ, فلـ, etc.) are split into components.
 *
 * @see NATIVE_REVIEW_NEEDED.md for implementation details
 */
const PROCLITICS = new Map<string, { normalized: string; type: 'conjunction' | 'preposition' }>([
  // Conjunctions (single character)
  ['و', { normalized: 'and', type: 'conjunction' }], // wa - conjunction "and"
  ['ف', { normalized: 'then', type: 'conjunction' }], // fa - conjunction "then/so"

  // Attached prefix prepositions
  ['ب', { normalized: 'with', type: 'preposition' }], // bi- (with, by)
  ['ل', { normalized: 'to', type: 'preposition' }], // li- (to, for)
  ['ك', { normalized: 'like', type: 'preposition' }], // ka- (like, as)

  // Multi-proclitic sequences (conjunction + preposition)
  ['ول', { normalized: 'and-to', type: 'conjunction' }], // wa + li-
  ['وب', { normalized: 'and-with', type: 'conjunction' }], // wa + bi-
  ['وك', { normalized: 'and-like', type: 'conjunction' }], // wa + ka-
  ['فل', { normalized: 'then-to', type: 'conjunction' }], // fa + li-
  ['فب', { normalized: 'then-with', type: 'conjunction' }], // fa + bi-
  ['فك', { normalized: 'then-like', type: 'conjunction' }], // fa + ka-
]);

/**
 * Arabic temporal markers (event trigger keywords) with formality and confidence tracking.
 *
 * Formality levels:
 * - 'formal': Modern Standard Arabic (MSA) - preferred in written/formal contexts
 * - 'neutral': Common in both MSA and dialects
 * - 'dialectal': Informal/colloquial - common in spoken Arabic
 *
 * Confidence reflects how reliably the marker indicates an event trigger ("on" event).
 * Formal markers have higher confidence due to standardization.
 */
interface TemporalMarkerMetadata {
  readonly normalized: string;
  readonly formality: 'formal' | 'neutral' | 'dialectal';
  readonly confidence: number;
  readonly description: string;
}

const TEMPORAL_MARKERS = new Map<string, TemporalMarkerMetadata>([
  [
    'عندما',
    {
      normalized: 'on',
      formality: 'formal',
      confidence: 0.95,
      description: 'when (formal MSA)',
    },
  ],
  [
    'حينما',
    {
      normalized: 'on',
      formality: 'formal',
      confidence: 0.93,
      description: 'when/whenever (formal)',
    },
  ],
  [
    'عند',
    {
      normalized: 'on',
      formality: 'neutral',
      confidence: 0.88,
      description: 'at/when (neutral)',
    },
  ],
  [
    'حين',
    {
      normalized: 'on',
      formality: 'neutral',
      confidence: 0.85,
      description: 'when/time (neutral)',
    },
  ],
  [
    'لمّا',
    {
      normalized: 'on',
      formality: 'dialectal',
      confidence: 0.7,
      description: 'when (dialectal, with shadda)',
    },
  ],
  [
    'لما',
    {
      normalized: 'on',
      formality: 'dialectal',
      confidence: 0.68,
      description: 'when (dialectal, no diacritic)',
    },
  ],
  [
    'لدى',
    {
      normalized: 'on',
      formality: 'neutral',
      confidence: 0.82,
      description: 'at/with (temporal)',
    },
  ],
]);

/**
 * Arabic standalone prepositions.
 * Note: Temporal markers (عند, لدى, etc.) are NOT in this set - they're handled
 * separately in TEMPORAL_MARKERS with formality metadata.
 */
const PREPOSITIONS = new Set([
  'في', // fī (in)
  'على', // ʿalā (on)
  'من', // min (from)
  'إلى', // ilā (to)
  'الى', // ilā (alternative spelling)
  // 'عند' removed - it's a temporal marker with metadata
  'مع', // maʿa (with)
  'عن', // ʿan (about, from)
  'قبل', // qabl (before)
  'بعد', // baʿd (after)
  'بين', // bayn (between)
]);

// =============================================================================
// Arabic Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Temporal conjunctions
 * - Additional synonyms and spelling variants
 */
const ARABIC_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'صحيح', normalized: 'true' },
  { native: 'خطأ', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'فارغ', normalized: 'null' },
  { native: 'غير معرف', normalized: 'undefined' },

  // Positional
  { native: 'الأول', normalized: 'first' },
  { native: 'أول', normalized: 'first' },
  { native: 'الأخير', normalized: 'last' },
  { native: 'آخر', normalized: 'last' },
  { native: 'التالي', normalized: 'next' },
  { native: 'السابق', normalized: 'previous' },
  { native: 'الأقرب', normalized: 'closest' },
  { native: 'الأب', normalized: 'parent' },

  // Events
  { native: 'النقر', normalized: 'click' },
  { native: 'نقر', normalized: 'click' },
  { native: 'الإدخال', normalized: 'input' },
  { native: 'إدخال', normalized: 'input' },
  { native: 'التغيير', normalized: 'change' },
  { native: 'تغيير', normalized: 'change' },
  { native: 'الإرسال', normalized: 'submit' },
  { native: 'إرسال', normalized: 'submit' },
  { native: 'التركيز', normalized: 'focus' },
  { native: 'فقدان التركيز', normalized: 'blur' },
  { native: 'ضغط', normalized: 'keydown' },
  { native: 'رفع', normalized: 'keyup' },
  { native: 'تمرير الفأرة', normalized: 'mouseover' },
  { native: 'مغادرة الفأرة', normalized: 'mouseout' },
  { native: 'تحميل', normalized: 'load' },
  { native: 'تمرير', normalized: 'scroll' },

  // References
  { native: 'أنا', normalized: 'me' },
  { native: 'هو', normalized: 'it' },
  { native: 'هي', normalized: 'it' },
  { native: 'النتيجة', normalized: 'result' },
  { native: 'الحدث', normalized: 'event' },
  { native: 'الهدف', normalized: 'target' },

  // Time units
  { native: 'ثانية', normalized: 's' },
  { native: 'ثواني', normalized: 's' },
  { native: 'ملي ثانية', normalized: 'ms' },
  { native: 'دقيقة', normalized: 'm' },
  { native: 'دقائق', normalized: 'm' },
  { native: 'ساعة', normalized: 'h' },
  { native: 'ساعات', normalized: 'h' },

  // Note: Temporal markers (عندما, حينما, etc.) are in TEMPORAL_MARKERS map
  // with formality metadata, not in ARABIC_EXTRAS

  // Additional spelling variants (without diacritics)
  { native: 'بدل', normalized: 'toggle' },
  { native: 'غير', normalized: 'toggle' },
  { native: 'اضف', normalized: 'add' },
  { native: 'ازل', normalized: 'remove' },
  { native: 'اضع', normalized: 'put' },
  { native: 'يضع', normalized: 'put' },
  { native: 'اجعل', normalized: 'put' },
  { native: 'عين', normalized: 'set' },
  { native: 'زد', normalized: 'increment' },
  { native: 'ارفع', normalized: 'increment' },
  { native: 'انقص', normalized: 'decrement' },
  { native: 'قلل', normalized: 'decrement' },
  { native: 'سجل', normalized: 'log' },
  { native: 'اظهر', normalized: 'show' },
  { native: 'اعرض', normalized: 'show' },
  { native: 'اخف', normalized: 'hide' },
  { native: 'اخفي', normalized: 'hide' },
  { native: 'شغل', normalized: 'trigger' },
  { native: 'ارسل', normalized: 'send' },
  { native: 'ركز', normalized: 'focus' },
  { native: 'شوش', normalized: 'blur' },
  { native: 'اذا', normalized: 'if' },
  { native: 'لو', normalized: 'if' },
  { native: 'والا', normalized: 'else' },
  { native: 'توقف', normalized: 'halt' },
  { native: 'انسخ', normalized: 'clone' },

  // Control flow helpers
  { native: 'إذن', normalized: 'then' },
  { native: 'فإن', normalized: 'then' },
  { native: 'نهاية', normalized: 'end' },

  // Modifiers
  { native: 'قبل', normalized: 'before' },
  { native: 'بعد', normalized: 'after' },
];

// =============================================================================
// Arabic Time Units
// =============================================================================

/**
 * Arabic time unit patterns for number parsing.
 * Sorted by length (longest first) to ensure correct matching.
 * Arabic allows space between number and unit (ملي ثانية = millisecond).
 */
const ARABIC_TIME_UNITS: readonly TimeUnitMapping[] = [
  { pattern: 'ملي ثانية', suffix: 'ms', length: 9, caseInsensitive: false },
  { pattern: 'ملي_ثانية', suffix: 'ms', length: 8, caseInsensitive: false },
  { pattern: 'دقائق', suffix: 'm', length: 5, caseInsensitive: false },
  { pattern: 'دقيقة', suffix: 'm', length: 5, caseInsensitive: false },
  { pattern: 'ثواني', suffix: 's', length: 5, caseInsensitive: false },
  { pattern: 'ثانية', suffix: 's', length: 5, caseInsensitive: false },
  { pattern: 'ساعات', suffix: 'h', length: 5, caseInsensitive: false },
  { pattern: 'ساعة', suffix: 'h', length: 4, caseInsensitive: false },
];

// =============================================================================
// Arabic Tokenizer Implementation
// =============================================================================

export class ArabicTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(arabicProfile, ARABIC_EXTRAS);
    // Set morphological normalizer for prefix/suffix stripping
    this.normalizer = new ArabicMorphologicalNormalizer();
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

      // Try CSS selector first (LTR island in RTL text)
      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
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

      // Try number
      if (isDigit(input[pos])) {
        const numberToken = this.extractArabicNumber(input, pos);
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

      // Try Arabic preposition (multi-word first)
      const prepToken = this.tryPreposition(input, pos);
      if (prepToken) {
        tokens.push(prepToken);
        pos = prepToken.position.end;
        continue;
      }

      // Try Arabic word (with proclitic detection)
      if (isArabic(input[pos])) {
        // Check for proclitic conjunction (و or ف) attached to following word
        const procliticResult = this.tryProclitic(input, pos);
        if (procliticResult) {
          tokens.push(procliticResult.conjunction);
          pos = procliticResult.conjunction.position.end;
          // Continue to let the next iteration extract the remaining word
          continue;
        }

        const wordToken = this.extractArabicWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Try ASCII word (for mixed content)
      if (isAsciiIdentifierChar(input[pos])) {
        const asciiToken = this.extractAsciiWord(input, pos);
        if (asciiToken) {
          tokens.push(asciiToken);
          pos = asciiToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'ar');
  }

  classifyToken(token: string): TokenKind {
    if (PREPOSITIONS.has(token)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Try to match an Arabic preposition.
   */
  private tryPreposition(input: string, pos: number): LanguageToken | null {
    // Check prepositions from longest to shortest
    const sortedPreps = Array.from(PREPOSITIONS).sort((a, b) => b.length - a.length);

    for (const prep of sortedPreps) {
      if (input.slice(pos, pos + prep.length) === prep) {
        // Check that it's a standalone word (followed by space or non-Arabic)
        const nextPos = pos + prep.length;
        if (nextPos >= input.length || isWhitespace(input[nextPos]) || !isArabic(input[nextPos])) {
          return createToken(prep, 'particle', createPosition(pos, nextPos));
        }
      }
    }
    return null;
  }

  /**
   * Try to extract a proclitic (conjunction or preposition) that's attached to the following word.
   *
   * Arabic proclitics attach directly to words without space:
   * - والنقر → و + النقر (and + the-click)
   * - فالتبديل → ف + التبديل (then + the-toggle)
   * - بالنقر → ب + النقر (with + the-click)
   * - ولالنقر → و + ل + النقر (and + to + the-click)
   *
   * This enables:
   * - Polysyndetic coordination: A وB وC
   * - Attached prepositions: بالنقر (with-the-click)
   * - Multi-proclitic sequences: ولالنقر (and-to-the-click)
   *
   * Returns null if:
   * - Not a proclitic character/sequence
   * - Proclitic is standalone (followed by space)
   * - Remaining word is too short (< 2 chars, to avoid false positives)
   *
   * @see NATIVE_REVIEW_NEEDED.md for implementation rationale
   */
  private tryProclitic(input: string, pos: number): { conjunction: LanguageToken } | null {
    // Try multi-character proclitics first (longest match)
    // Check 2-character sequences (ول, وب, فل, فب, etc.)
    if (pos + 2 <= input.length) {
      const twoChar = input.slice(pos, pos + 2);
      const twoCharEntry = PROCLITICS.get(twoChar);
      if (twoCharEntry) {
        // Check if there's a following Arabic character (proclitic must be attached)
        const nextPos = pos + 2;
        if (nextPos < input.length && isArabic(input[nextPos])) {
          // Count remaining Arabic characters to ensure meaningful word follows
          let remainingLength = 0;
          let checkPos = nextPos;
          while (checkPos < input.length && isArabic(input[checkPos])) {
            remainingLength++;
            checkPos++;
          }

          // Require at least 2 characters after proclitic to avoid false positives
          if (remainingLength >= 2) {
            const tokenKind =
              twoCharEntry.type === 'conjunction'
                ? ('conjunction' as const)
                : ('particle' as const);
            return {
              conjunction: createToken(
                twoChar,
                tokenKind,
                createPosition(pos, nextPos),
                twoCharEntry.normalized
              ),
            };
          }
        }
      }
    }

    // Try single-character proclitics
    const char = input[pos];
    const entry = PROCLITICS.get(char);

    if (!entry) return null;

    // Check if there's a following Arabic character (proclitic must be attached)
    const nextPos = pos + 1;
    if (nextPos >= input.length || !isArabic(input[nextPos])) {
      return null; // Standalone conjunction or end of input
    }

    // Count remaining Arabic characters to ensure meaningful word follows
    let remainingLength = 0;
    let checkPos = nextPos;
    while (checkPos < input.length && isArabic(input[checkPos])) {
      remainingLength++;
      checkPos++;
    }

    // Require at least 2 characters after proclitic to avoid false positives
    // (e.g., وو could be a typo, and short roots need protection)
    if (remainingLength < 2) {
      return null;
    }

    const tokenKind =
      entry.type === 'conjunction' ? ('conjunction' as const) : ('particle' as const);
    return {
      conjunction: createToken(char, tokenKind, createPosition(pos, nextPos), entry.normalized),
    };
  }

  /**
   * Extract an Arabic word.
   * Uses morphological normalization to handle prefix/suffix variations.
   * Attaches metadata for temporal markers (formality, confidence).
   */
  private extractArabicWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    // Check for attached prefix
    for (const prefix of ATTACHED_PREFIXES) {
      const basePrefix = prefix.replace('ـ', '');
      if (input.slice(pos, pos + basePrefix.length) === basePrefix) {
        // This is a prefix - extract it separately
        // For now, include it in the word
      }
    }

    // Extract Arabic characters
    while (pos < input.length && (isArabic(input[pos]) || input[pos] === 'ـ')) {
      word += input[pos++];
    }

    if (!word) return null;

    // Check if it's a temporal marker (with formality metadata)
    const temporalMarker = TEMPORAL_MARKERS.get(word);
    if (temporalMarker) {
      const token = createToken(
        word,
        'keyword',
        createPosition(startPos, pos),
        temporalMarker.normalized
      );
      return {
        ...token,
        metadata: {
          temporalFormality: temporalMarker.formality,
          temporalConfidence: temporalMarker.confidence,
        },
      };
    }

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(word);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Check if it's a preposition (with metadata for disambiguation)
    if (PREPOSITIONS.has(word)) {
      const token = createToken(word, 'particle', createPosition(startPos, pos));
      return {
        ...token,
        metadata: {
          prepositionValue: word,
        },
      };
    }

    // Try morphological normalization for conjugated/inflected forms
    const morphToken = this.tryMorphKeywordMatch(word, startPos, pos);
    if (morphToken) return morphToken;

    // Not a keyword or recognized form, return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract an ASCII word.
   */
  private extractAsciiWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including Arabic time unit suffixes.
   * Arabic allows space between number and unit.
   */
  private extractArabicNumber(input: string, startPos: number): LanguageToken | null {
    return this.tryNumberWithTimeUnits(input, startPos, ARABIC_TIME_UNITS, {
      allowSign: false,
      skipWhitespace: true,
    });
  }
}

/**
 * Singleton instance.
 */
export const arabicTokenizer = new ArabicTokenizer();
