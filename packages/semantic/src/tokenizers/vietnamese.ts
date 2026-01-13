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
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
} from './base';

// =============================================================================
// Vietnamese Character Classification
// =============================================================================

/**
 * Check if character is a Vietnamese letter (including diacritics).
 * Vietnamese uses Latin alphabet plus: ă â đ ê ô ơ ư
 * Plus tone marks on vowels: à á ả ã ạ etc.
 */
function isVietnameseLetter(char: string): boolean {
  // Base Latin letters
  if (/[a-zA-Z]/.test(char)) return true;

  // Vietnamese-specific letters and diacritics
  // Lowercase: ă â đ ê ô ơ ư and all tone variants
  // Uppercase: Ă Â Đ Ê Ô Ơ Ư and all tone variants
  return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(
    char
  );
}

/**
 * Check if character is part of a Vietnamese identifier.
 */
function isVietnameseIdentifierChar(char: string): boolean {
  return isVietnameseLetter(char) || /[0-9_-]/.test(char);
}

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
// Vietnamese Keywords
// =============================================================================

/**
 * Vietnamese command keywords mapped to their English equivalents.
 */
const VIETNAMESE_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['chuyển đổi', 'toggle'],
  ['chuyển', 'toggle'],
  ['bật tắt', 'toggle'],
  ['thêm', 'add'],
  ['bổ sung', 'add'],
  ['xóa', 'remove'],
  ['gỡ bỏ', 'remove'],
  ['loại bỏ', 'remove'],
  ['bỏ', 'remove'],

  // Commands - Content operations
  ['đặt', 'put'],
  ['để', 'put'],
  ['đưa', 'put'],
  ['thêm vào cuối', 'append'],
  ['nối', 'append'],
  ['thêm vào đầu', 'prepend'],
  ['lấy', 'take'],
  ['tạo', 'make'],
  ['tạo ra', 'make'],
  ['sao chép', 'clone'],
  ['nhân bản', 'clone'],

  // Commands - Variable operations
  ['thiết lập', 'set'],
  ['gán', 'set'],
  ['đặt giá trị', 'set'],
  ['lấy giá trị', 'get'],
  ['nhận', 'get'],
  ['tăng', 'increment'],
  ['tăng lên', 'increment'],
  ['giảm', 'decrement'],
  ['giảm đi', 'decrement'],
  ['ghi nhật ký', 'log'],
  ['in ra', 'log'],

  // Commands - Visibility
  ['hiển thị', 'show'],
  ['hiện', 'show'],
  ['ẩn', 'hide'],
  ['che', 'hide'],
  ['giấu', 'hide'],
  ['chuyển tiếp', 'transition'],

  // Commands - Events
  ['khi', 'on'],
  ['trên', 'on'],
  ['lúc', 'on'],
  ['kích hoạt', 'trigger'],
  ['gửi', 'send'],

  // Commands - DOM focus
  ['tập trung', 'focus'],
  ['mất tập trung', 'blur'],

  // Commands - Navigation
  ['đi', 'go'],
  ['đi đến', 'go'],
  ['chuyển tới', 'go'],

  // Commands - Async
  ['chờ', 'wait'],
  ['đợi', 'wait'],
  ['tải', 'fetch'],
  ['ổn định', 'settle'],

  // Commands - Control flow
  ['nếu', 'if'],
  ['không thì', 'else'],
  ['ngược lại', 'else'],
  ['lặp lại', 'repeat'],
  ['lặp', 'repeat'],
  ['với mỗi', 'for'],
  ['trong khi', 'while'],
  ['tiếp tục', 'continue'],
  ['dừng', 'halt'],
  ['dừng lại', 'halt'],
  ['ném', 'throw'],
  ['gọi', 'call'],
  ['trả về', 'return'],

  // Commands - Advanced
  ['js', 'js'],
  ['javascript', 'js'],
  ['bất đồng bộ', 'async'],
  ['nói với', 'tell'],
  ['mặc định', 'default'],
  ['khởi tạo', 'init'],
  ['hành vi', 'behavior'],
  ['cài đặt', 'install'],
  ['đo lường', 'measure'],

  // Modifiers
  ['vào', 'into'],
  ['vào trong', 'into'],
  ['trước', 'before'],
  ['trước khi', 'before'],
  ['sau', 'after'],
  ['sau khi', 'after'],
  ['rồi', 'then'],
  ['sau đó', 'then'],
  ['tiếp theo', 'then'],
  ['kết thúc', 'end'],
  ['cho đến khi', 'until'],

  // Events
  ['nhấp', 'click'],
  ['nhấp chuột', 'click'],
  ['nhấp đúp', 'dblclick'],
  ['nhập', 'input'],
  ['thay đổi', 'change'],
  ['gửi biểu mẫu', 'submit'],
  ['phím xuống', 'keydown'],
  ['phím lên', 'keyup'],
  ['chuột vào', 'mouseover'],
  ['chuột ra', 'mouseout'],
  ['tải trang', 'load'],
  ['cuộn', 'scroll'],

  // References
  ['tôi', 'me'],
  ['của tôi', 'my'],
  ['nó', 'it'],
  ['của nó', 'its'],
  ['kết quả', 'result'],
  ['sự kiện', 'event'],
  ['mục tiêu', 'target'],

  // Positional
  ['đầu tiên', 'first'],
  ['cuối cùng', 'last'],
  ['tiếp theo', 'next'],
  ['trước đó', 'previous'],

  // Logical
  ['và', 'and'],
  ['hoặc', 'or'],
  ['không', 'not'],
  ['là', 'is'],

  // Boolean
  ['đúng', 'true'],
  ['sai', 'false'],

  // Time units
  ['giây', 's'],
  ['mili giây', 'ms'],
  ['phút', 'm'],
  ['giờ', 'h'],
]);

/**
 * Multi-word phrases to match (sorted by length for greedy matching)
 */
const MULTI_WORD_PHRASES = [
  'chuyển đổi',
  'bật tắt',
  'gỡ bỏ',
  'loại bỏ',
  'thêm vào cuối',
  'thêm vào đầu',
  'tạo ra',
  'sao chép',
  'nhân bản',
  'thiết lập',
  'đặt giá trị',
  'lấy giá trị',
  'tăng lên',
  'giảm đi',
  'ghi nhật ký',
  'in ra',
  'hiển thị',
  'chuyển tiếp',
  'kích hoạt',
  'mất tập trung',
  'đi đến',
  'chuyển tới',
  'không thì',
  'ngược lại',
  'lặp lại',
  'với mỗi',
  'trong khi',
  'dừng lại',
  'trả về',
  'bất đồng bộ',
  'nói với',
  'mặc định',
  'khởi tạo',
  'cài đặt',
  'đo lường',
  'vào trong',
  'trước khi',
  'sau khi',
  'sau đó',
  'tiếp theo',
  'cho đến khi',
  'nhấp chuột',
  'nhấp đúp',
  'gửi biểu mẫu',
  'phím xuống',
  'phím lên',
  'chuột vào',
  'chuột ra',
  'tải trang',
  'của tôi',
  'của nó',
  'đầu tiên',
  'cuối cùng',
  'trước đó',
  'mili giây',
].sort((a, b) => b.length - a.length);

// =============================================================================
// Vietnamese Tokenizer Implementation
// =============================================================================

export class VietnameseTokenizer extends BaseTokenizer {
  readonly language = 'vi';
  readonly direction = 'ltr' as const;

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
    if (PREPOSITIONS.has(token.toLowerCase())) return 'particle';
    if (VIETNAMESE_KEYWORDS.has(token.toLowerCase())) return 'keyword';
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
   */
  private tryMultiWordPhrase(input: string, pos: number): LanguageToken | null {
    const remaining = input.slice(pos).toLowerCase();

    for (const phrase of MULTI_WORD_PHRASES) {
      if (remaining.startsWith(phrase)) {
        // Make sure we're at a word boundary after the phrase
        const nextChar = input[pos + phrase.length];
        if (nextChar && isVietnameseLetter(nextChar)) continue;

        const normalized = VIETNAMESE_KEYWORDS.get(phrase);
        return createToken(
          input.slice(pos, pos + phrase.length),
          normalized ? 'keyword' : 'identifier',
          createPosition(pos, pos + phrase.length),
          normalized
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

    // Check if it's a keyword
    const normalized = VIETNAMESE_KEYWORDS.get(lower);
    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    // Check if it's a preposition
    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
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

  /**
   * Try to extract an operator.
   */
  private tryOperator(input: string, pos: number): LanguageToken | null {
    const char = input[pos];
    const next = input[pos + 1];

    // Two-character operators
    if (next) {
      const twoChar = char + next;
      if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
        return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
      }
    }

    // Single-character operators
    if ('+-*/<>=!&|'.includes(char)) {
      return createToken(char, 'operator', createPosition(pos, pos + 1));
    }

    return null;
  }
}

/**
 * Singleton instance.
 */
export const vietnameseTokenizer = new VietnameseTokenizer();
