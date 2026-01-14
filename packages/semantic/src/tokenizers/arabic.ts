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
 * Arabic proclitic conjunctions that attach directly to the following word.
 * These are separated during tokenization for proper list/coordination handling.
 *
 * Unlike ATTACHED_PREFIXES which are kept with the word, proclitics are
 * emitted as separate tokens to support polysyndetic coordination (A وB وC).
 *
 * @see NATIVE_REVIEW_NEEDED.md for implementation details
 */
const PROCLITICS = new Map<string, string>([
  ['و', 'and'], // wa - conjunction "and"
  ['ف', 'then'], // fa - conjunction "then/so"
]);

/**
 * Arabic standalone prepositions.
 */
const PREPOSITIONS = new Set([
  'في', // fī (in)
  'على', // ʿalā (on)
  'من', // min (from)
  'إلى', // ilā (to)
  'الى', // ilā (alternative spelling)
  'عند', // ʿinda (at, when)
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

  // Temporal conjunctions (for "on" event)
  { native: 'عندما', normalized: 'on' },
  { native: 'حينما', normalized: 'on' },
  { native: 'لمّا', normalized: 'on' },
  { native: 'لما', normalized: 'on' },
  { native: 'حين', normalized: 'on' },
  { native: 'لدى', normalized: 'on' },

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
   * Try to extract a proclitic conjunction (و or ف) that's attached to the following word.
   *
   * Arabic proclitics attach directly to words without space:
   * - والنقر → و + النقر (and + the-click)
   * - فالتبديل → ف + التبديل (then + the-toggle)
   *
   * This enables polysyndetic coordination: A وB وC
   *
   * Returns null if:
   * - Not a proclitic character
   * - Proclitic is standalone (followed by space)
   * - Remaining word is too short (< 2 chars, to avoid false positives)
   *
   * @see NATIVE_REVIEW_NEEDED.md for implementation rationale
   */
  private tryProclitic(input: string, pos: number): { conjunction: LanguageToken } | null {
    const char = input[pos];
    const normalized = PROCLITICS.get(char);

    if (!normalized) return null;

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

    return {
      conjunction: createToken(char, 'conjunction', createPosition(pos, nextPos), normalized),
    };
  }

  /**
   * Extract an Arabic word.
   * Uses morphological normalization to handle prefix/suffix variations.
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

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(word);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Check if it's a preposition
    if (PREPOSITIONS.has(word)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
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
   */
  private extractArabicNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    // Skip any whitespace before time unit
    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    // Check for Arabic time units
    const remaining = input.slice(unitPos);
    if (remaining.startsWith('ملي ثانية') || remaining.startsWith('ملي_ثانية')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('ملي ثانية') ? 9 : 8);
    } else if (remaining.startsWith('ثانية') || remaining.startsWith('ثواني')) {
      number += 's';
      pos = unitPos + (remaining.startsWith('ثانية') ? 5 : 5);
    } else if (remaining.startsWith('دقيقة') || remaining.startsWith('دقائق')) {
      number += 'm';
      pos = unitPos + 5;
    } else if (remaining.startsWith('ساعة') || remaining.startsWith('ساعات')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('ساعة') ? 4 : 5);
    }

    if (!number) return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

/**
 * Singleton instance.
 */
export const arabicTokenizer = new ArabicTokenizer();
