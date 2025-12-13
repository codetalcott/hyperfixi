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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type CreateTokenOptions,
} from './base';
import { ArabicMorphologicalNormalizer } from './morphology/arabic-normalizer';

// =============================================================================
// Arabic Character Classification
// =============================================================================

/**
 * Check if character is Arabic.
 */
function isArabic(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||  // Arabic
         (code >= 0x0750 && code <= 0x077F) ||  // Arabic Supplement
         (code >= 0x08A0 && code <= 0x08FF) ||  // Arabic Extended-A
         (code >= 0xFB50 && code <= 0xFDFF) ||  // Arabic Presentation Forms-A
         (code >= 0xFE70 && code <= 0xFEFF);    // Arabic Presentation Forms-B
}

// =============================================================================
// Arabic Prefixes and Prepositions
// =============================================================================

/**
 * Arabic prefix prepositions that attach to the following word.
 * These are marked with trailing hyphen in patterns to indicate attachment.
 */
const ATTACHED_PREFIXES = new Set([
  'بـ',  // bi- (with, by)
  'لـ',  // li- (to, for)
  'كـ',  // ka- (like, as)
  'وـ',  // wa- (and)
]);

/**
 * Arabic standalone prepositions.
 */
const PREPOSITIONS = new Set([
  'في',     // fī (in)
  'على',    // ʿalā (on)
  'من',     // min (from)
  'إلى',    // ilā (to)
  'الى',    // ilā (alternative spelling)
  'عند',    // ʿinda (at, when)
  'مع',     // maʿa (with)
  'عن',     // ʿan (about, from)
  'قبل',    // qabl (before)
  'بعد',    // baʿd (after)
  'بين',    // bayn (between)
]);

// =============================================================================
// Arabic Keywords
// =============================================================================

/**
 * Arabic command keywords mapped to their English equivalents.
 */
const ARABIC_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['بدّل', 'toggle'],
  ['بدل', 'toggle'],
  ['غيّر', 'toggle'],
  ['غير', 'toggle'],
  ['أضف', 'add'],
  ['اضف', 'add'],
  ['زِد', 'add'],
  ['أزل', 'remove'],
  ['ازل', 'remove'],
  ['احذف', 'remove'],
  ['امسح', 'remove'],
  // Commands - Content operations
  ['ضع', 'put'],
  ['اضع', 'put'],
  ['يضع', 'put'],
  ['اجعل', 'put'],
  ['ألحق', 'append'],
  ['سبق', 'prepend'],
  ['خذ', 'take'],
  ['اصنع', 'make'],
  ['أنشئ', 'make'],
  ['استنسخ', 'clone'],
  ['انسخ', 'clone'],
  // Commands - Variable operations
  ['اضبط', 'set'],
  ['عيّن', 'set'],
  ['عين', 'set'],
  ['حدد', 'set'],
  ['احصل', 'get'],
  ['زِد', 'increment'],
  ['زد', 'increment'],
  ['ارفع', 'increment'],
  ['أنقص', 'decrement'],
  ['انقص', 'decrement'],
  ['قلل', 'decrement'],
  ['سجّل', 'log'],
  ['سجل', 'log'],
  // Commands - Visibility
  ['أظهر', 'show'],
  ['اظهر', 'show'],
  ['اعرض', 'show'],
  ['أخفِ', 'hide'],
  ['اخفِ', 'hide'],
  ['اخف', 'hide'],
  ['اخفي', 'hide'],
  ['انتقال', 'transition'],
  ['انتقل', 'transition'],
  // Commands - Events
  ['على', 'on'],
  ['عند', 'on'],
  ['لدى', 'on'],
  ['حين', 'on'],
  ['تشغيل', 'trigger'],
  ['شغّل', 'trigger'],
  ['شغل', 'trigger'],
  ['أطلق', 'trigger'],
  ['فعّل', 'trigger'],
  ['أرسل', 'send'],
  ['ارسل', 'send'],
  // Commands - DOM focus
  ['تركيز', 'focus'],
  ['ركز', 'focus'],
  ['ضبابية', 'blur'],
  ['شوش', 'blur'],
  // Commands - Navigation
  ['اذهب', 'go'],
  // Commands - Async
  ['انتظر', 'wait'],
  ['احضر', 'fetch'],
  ['جلب', 'fetch'],
  ['استقر', 'settle'],
  // Commands - Control flow
  ['إذا', 'if'],
  ['اذا', 'if'],
  ['لو', 'if'],
  ['وإلا', 'else'],
  ['والا', 'else'],
  ['كرر', 'repeat'],
  ['لكل', 'for'],
  ['بينما', 'while'],
  ['واصل', 'continue'],
  ['أوقف', 'halt'],
  ['توقف', 'halt'],
  ['ارم', 'throw'],
  ['ارمِ', 'throw'],
  ['استدع', 'call'],
  ['اتصل', 'call'],
  ['نادِ', 'call'],
  ['ارجع', 'return'],
  ['عُد', 'return'],
  // Commands - Advanced
  ['جافاسكربت', 'js'],
  ['js', 'js'],
  ['متزامن', 'async'],
  ['أخبر', 'tell'],
  ['افتراضي', 'default'],
  ['تهيئة', 'init'],
  ['بدء', 'init'],
  ['سلوك', 'behavior'],
  // Modifiers
  ['في', 'into'],
  ['إلى', 'into'],
  ['قبل', 'before'],
  ['بعد', 'after'],
  // Control flow helpers
  ['إذن', 'then'],
  ['فإن', 'then'],
  ['نهاية', 'end'],
  ['حتى', 'until'],
  // Events (for event name recognition)
  ['النقر', 'click'],
  ['نقر', 'click'],
  ['الإدخال', 'input'],
  ['إدخال', 'input'],
  ['التغيير', 'change'],
  ['تغيير', 'change'],
  ['الإرسال', 'submit'],
  ['إرسال', 'submit'],
  ['ضغط', 'keydown'],
  ['تحميل', 'load'],
  ['تمرير', 'scroll'],
  // References
  ['أنا', 'me'],
  ['هو', 'it'],
  ['هي', 'it'],
  ['النتيجة', 'result'],
  ['الحدث', 'event'],
  ['الهدف', 'target'],
  // Positional
  ['الأول', 'first'],
  ['الأخير', 'last'],
  ['التالي', 'next'],
  ['السابق', 'previous'],
  // Time units
  ['ثانية', 's'],
  ['ثواني', 's'],
  ['ملي ثانية', 'ms'],
  ['دقيقة', 'm'],
  ['دقائق', 'm'],
  ['ساعة', 'h'],
  ['ساعات', 'h'],
  // Boolean
  ['صحيح', 'true'],
  ['خطأ', 'false'],
]);

// =============================================================================
// Arabic Tokenizer Implementation
// =============================================================================

export class ArabicTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  /** Morphological normalizer for Arabic prefix/suffix stripping */
  private morphNormalizer = new ArabicMorphologicalNormalizer();

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

      // Try Arabic word
      if (isArabic(input[pos])) {
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
    if (ARABIC_KEYWORDS.has(token)) return 'keyword';
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
          return createToken(
            prep,
            'particle',
            createPosition(pos, nextPos)
          );
        }
      }
    }
    return null;
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

    // Check if this is a known keyword (exact match)
    const normalized = ARABIC_KEYWORDS.get(word);

    if (normalized) {
      return createToken(
        word,
        'keyword',
        createPosition(startPos, pos),
        normalized
      );
    }

    // Check if it's a preposition
    if (PREPOSITIONS.has(word)) {
      return createToken(
        word,
        'particle',
        createPosition(startPos, pos)
      );
    }

    // Try morphological normalization for conjugated/inflected forms
    const morphResult = this.morphNormalizer.normalize(word);

    if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
      // Check if the stem is a known keyword
      const stemNormalized = ARABIC_KEYWORDS.get(morphResult.stem);

      if (stemNormalized) {
        const tokenOptions: CreateTokenOptions = {
          normalized: stemNormalized,
          stem: morphResult.stem,
          stemConfidence: morphResult.confidence,
        };

        return createToken(
          word,
          'keyword',
          createPosition(startPos, pos),
          tokenOptions
        );
      }
    }

    // Not a keyword or recognized form, return as identifier
    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
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

    return createToken(
      word,
      'identifier',
      createPosition(startPos, pos)
    );
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

    return createToken(
      number,
      'literal',
      createPosition(startPos, pos)
    );
  }
}

/**
 * Singleton instance.
 */
export const arabicTokenizer = new ArabicTokenizer();
