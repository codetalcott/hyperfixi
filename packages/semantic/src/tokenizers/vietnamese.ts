/**
 * Vietnamese Tokenizer
 *
 * Tokenizes Vietnamese hyperscript input.
 * Vietnamese is an isolating (analytic) language with:
 * - SVO word order (like English)
 * - Latin script with extensive diacritics (tone marks)
 * - No verb conjugation or noun declension
 * - Space-separated syllables (can be multi-syllable words)
 * - Prepositions for grammatical roles
 *
 * Vietnamese diacritics:
 * - Tone marks: à á ả ã ạ (and similar for other vowels)
 * - Vowel modifications: ă â ê ô ơ ư đ
 *
 * Examples:
 *   chuyển đổi .active  → toggle .active
 *   thêm .highlight     → add .highlight
 *   hiển thị #modal     → show #modal
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
} from './base';
import { vietnameseProfile } from '../generators/profiles/vietnamese';

// =============================================================================
// Vietnamese Character Classification
// =============================================================================

// Vietnamese letters include Latin alphabet plus special characters and tone marks
const { isLetter: isVietnameseLetter, isIdentifierChar: isVietnameseIdentifierChar } =
  createLatinCharClassifiers(
    /[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/
  );

// =============================================================================
// Vietnamese Prepositions
// =============================================================================

/**
 * Vietnamese prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'trong', // in, inside
  'ngoài', // outside
  'trên', // on, above
  'dưới', // under, below
  'vào', // into
  'ra', // out
  'đến', // to
  'từ', // from
  'với', // with
  'cho', // for, to
  'bởi', // by
  'qua', // through
  'trước', // before
  'sau', // after
  'giữa', // between
  'bên', // beside
  'theo', // according to, along
  'về', // about, towards
  'tới', // to, towards
  'lên', // up
  'xuống', // down
]);

// =============================================================================
// Vietnamese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Multi-word phrases not in profile
 * - Additional synonyms
 */
const VIETNAMESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'đúng', normalized: 'true' },
  { native: 'sai', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'không xác định', normalized: 'undefined' },

  // Positional
  { native: 'đầu tiên', normalized: 'first' },
  { native: 'cuối cùng', normalized: 'last' },
  { native: 'tiếp theo', normalized: 'next' },
  { native: 'trước đó', normalized: 'previous' },
  { native: 'gần nhất', normalized: 'closest' },
  { native: 'cha', normalized: 'parent' },

  // Events
  { native: 'nhấp', normalized: 'click' },
  { native: 'nhấp chuột', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'nhấp đúp', normalized: 'dblclick' },
  { native: 'nhập', normalized: 'input' },
  { native: 'thay đổi', normalized: 'change' },
  { native: 'gửi biểu mẫu', normalized: 'submit' },
  { native: 'phím xuống', normalized: 'keydown' },
  { native: 'phím lên', normalized: 'keyup' },
  { native: 'chuột vào', normalized: 'mouseover' },
  { native: 'chuột ra', normalized: 'mouseout' },
  { native: 'tải trang', normalized: 'load' },
  { native: 'cuộn', normalized: 'scroll' },

  // References - possessive forms
  { native: 'của tôi', normalized: 'my' },
  { native: 'của nó', normalized: 'its' },

  // Time units
  { native: 'giây', normalized: 's' },
  { native: 'mili giây', normalized: 'ms' },
  { native: 'phút', normalized: 'm' },
  { native: 'giờ', normalized: 'h' },

  // Additional multi-word phrases not in profile
  { native: 'thêm vào cuối', normalized: 'append' },
  { native: 'nhân bản', normalized: 'clone' },
  { native: 'tạo ra', normalized: 'make' },
  { native: 'đặt giá trị', normalized: 'set' },
  { native: 'ghi nhật ký', normalized: 'log' },
  { native: 'chuyển tới', normalized: 'go' },
  { native: 'ngược lại', normalized: 'else' },
  { native: 'lặp', normalized: 'repeat' },

  // Logical/conditional
  { native: 'hoặc', normalized: 'or' },
  { native: 'không', normalized: 'not' },
  { native: 'là', normalized: 'is' },
  { native: 'tồn tại', normalized: 'exists' },
  { native: 'rỗng', normalized: 'empty' },

  // English synonyms
  { native: 'javascript', normalized: 'js' },
];

// =============================================================================
// Vietnamese Tokenizer Implementation
// =============================================================================

export class VietnameseTokenizer extends BaseTokenizer {
  readonly language = 'vi';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(vietnameseProfile, VIETNAMESE_EXTRAS);
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

      // Try CSS selector first (ASCII-based, highest priority)
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
        const numberToken = this.extractVietnameseNumber(input, pos);
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

      // Try operator
      const opToken = this.tryOperator(input, pos);
      if (opToken) {
        tokens.push(opToken);
        pos = opToken.position.end;
        continue;
      }

      // Try multi-word phrase first (before single words)
      const phraseToken = this.tryMultiWordPhrase(input, pos);
      if (phraseToken) {
        tokens.push(phraseToken);
        pos = phraseToken.position.end;
        continue;
      }

      // Try Vietnamese word
      if (isVietnameseLetter(input[pos])) {
        const wordToken = this.extractVietnameseWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'vi');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  /**
   * Try to match a multi-word phrase.
   * Multi-word phrases are included in profileKeywords and sorted longest-first.
   */
  private tryMultiWordPhrase(input: string, pos: number): LanguageToken | null {
    // Check against multi-word entries in profileKeywords (sorted longest-first)
    for (const entry of this.profileKeywords) {
      // Only check multi-word phrases (contain space)
      if (!entry.native.includes(' ')) continue;

      const phrase = entry.native;
      const candidate = input.slice(pos, pos + phrase.length).toLowerCase();
      if (candidate === phrase.toLowerCase()) {
        // Make sure we're at a word boundary after the phrase
        const nextChar = input[pos + phrase.length];
        if (nextChar && isVietnameseLetter(nextChar)) continue;

        return createToken(
          input.slice(pos, pos + phrase.length),
          'keyword',
          createPosition(pos, pos + phrase.length),
          entry.normalized
        );
      }
    }

    return null;
  }

  /**
   * Extract a Vietnamese word (single syllable/word).
   */
  private extractVietnameseWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isVietnameseIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check if it's a preposition first
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup for exact keyword match
    const keywordEntry = this.lookupKeyword(lower);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    // Return as identifier
    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  /**
   * Extract a number, including time unit suffixes.
   */
  private extractVietnameseNumber(input: string, startPos: number): LanguageToken | null {
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

    // Check for time units (Vietnamese or standard)
    if (pos < input.length) {
      const remaining = input.slice(pos).toLowerCase();
      // Vietnamese time units (with space after number)
      if (remaining.startsWith(' mili giây') || remaining.startsWith(' miligiây')) {
        number += 'ms';
        pos += remaining.startsWith(' mili giây') ? 10 : 9;
      } else if (remaining.startsWith(' giây')) {
        number += 's';
        pos += 5;
      } else if (remaining.startsWith(' phút')) {
        number += 'm';
        pos += 5;
      } else if (remaining.startsWith(' giờ')) {
        number += 'h';
        pos += 4;
      }
      // Standard time units (s, ms, m, h) - no space
      else if (remaining.startsWith('ms')) {
        number += 'ms';
        pos += 2;
      } else if (remaining[0] === 's' && !isVietnameseLetter(remaining[1] || '')) {
        number += 's';
        pos += 1;
      } else if (
        remaining[0] === 'm' &&
        remaining[1] !== 's' &&
        !isVietnameseLetter(remaining[1] || '')
      ) {
        number += 'm';
        pos += 1;
      } else if (remaining[0] === 'h' && !isVietnameseLetter(remaining[1] || '')) {
        number += 'h';
        pos += 1;
      }
    }

    if (!number) return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

/**
 * Singleton instance.
 */
export const vietnameseTokenizer = new VietnameseTokenizer();
