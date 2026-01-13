/**
 * Bengali Tokenizer
 *
 * Tokenizes Bengali hyperscript input.
 * Bengali is an agglutinative SOV language with:
 * - Bengali script (U+0980-U+09FF)
 * - Postposition markers (কে, তে, থেকে, etc.)
 * - Similar grammatical structure to Hindi
 * - CSS selectors are embedded ASCII
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
} from './base';

// =============================================================================
// Bengali Character Classification
// =============================================================================

/**
 * Check if character is in the Bengali script range.
 * Bengali: U+0980-U+09FF
 */
function isBengali(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x0980 && code <= 0x09ff;
}

// =============================================================================
// Bengali Postpositions
// =============================================================================

/**
 * Single-word postpositions.
 */
const SINGLE_POSTPOSITIONS = new Set(['কে', 'তে', 'থেকে', 'র', 'এর', 'দিয়ে', 'জন্য', 'পর্যন্ত']);

// =============================================================================
// Bengali Keywords
// =============================================================================

/**
 * Bengali command keywords mapped to their English equivalents.
 */
const BENGALI_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['টগল', 'toggle'],
  ['পরিবর্তন', 'toggle'],
  ['যোগ', 'add'],
  ['যোগ করুন', 'add'],
  ['সরান', 'remove'],
  ['সরিয়ে ফেলুন', 'remove'],
  ['মুছুন', 'remove'],

  // Commands - Content operations
  ['রাখুন', 'put'],
  ['রাখ', 'put'],
  ['নিন', 'take'],
  ['নে', 'take'],
  ['তৈরি করুন', 'make'],
  ['বানান', 'make'],
  ['কপি', 'clone'],
  ['প্রতিলিপি', 'clone'],

  // Commands - Variable operations
  ['সেট', 'set'],
  ['নির্ধারণ', 'set'],
  ['পান', 'get'],
  ['নিন', 'get'],
  ['বৃদ্ধি', 'increment'],
  ['বাড়ান', 'increment'],
  ['হ্রাস', 'decrement'],
  ['কমান', 'decrement'],
  ['লগ', 'log'],
  ['রেকর্ড', 'log'],

  // Commands - Visibility
  ['দেখান', 'show'],
  ['দেখাও', 'show'],
  ['লুকান', 'hide'],
  ['লুকাও', 'hide'],
  ['সংক্রমণ', 'transition'],

  // Commands - Events
  ['তে', 'on'],
  ['এ', 'on'],
  ['যখন', 'when'],

  // Commands - DOM focus
  ['ফোকাস', 'focus'],
  ['মনোযোগ', 'focus'],
  ['ঝাপসা', 'blur'],

  // Commands - Navigation
  ['যান', 'go'],
  ['যাও', 'go'],

  // Commands - Async
  ['অপেক্ষা', 'wait'],
  ['থামুন', 'wait'],
  ['আনুন', 'fetch'],
  ['স্থির', 'settle'],

  // Commands - Control flow
  ['যদি', 'if'],
  ['নতুবা', 'else'],
  ['না হলে', 'else'],
  ['পুনরাবৃত্তি', 'repeat'],
  ['বার বার', 'repeat'],
  ['জন্য', 'for'],
  ['যতক্ষণ', 'while'],
  ['চালিয়ে যান', 'continue'],
  ['থামুন', 'halt'],
  ['থামাও', 'halt'],
  ['নিক্ষেপ', 'throw'],
  ['ছুঁড়ে দিন', 'throw'],
  ['কল', 'call'],
  ['ডাকুন', 'call'],
  ['ফিরুন', 'return'],
  ['ফেরত দিন', 'return'],

  // Commands - Advanced
  ['জেএস', 'js'],
  ['অ্যাসিঙ্ক', 'async'],
  ['বলুন', 'tell'],
  ['বল', 'tell'],
  ['ডিফল্ট', 'default'],
  ['শুরু', 'init'],
  ['আচরণ', 'behavior'],

  // Control flow helpers
  ['তারপর', 'then'],
  ['তখন', 'then'],
  ['শেষ', 'end'],
  ['সমাপ্ত', 'end'],

  // Modifiers
  ['আগে', 'before'],
  ['পরে', 'after'],
  ['থেকে', 'from'],
  ['কে', 'to'],
  ['সাথে', 'with'],

  // Values
  ['সত্য', 'true'],
  ['মিথ্যা', 'false'],
  ['শূন্য', 'null'],
  ['অনির্ধারিত', 'undefined'],
  ['আমি', 'me'],
  ['এটি', 'it'],
  ['ফলাফল', 'result'],

  // Positional
  ['প্রথম', 'first'],
  ['শেষ', 'last'],
  ['পরবর্তী', 'next'],
  ['আগের', 'previous'],
  ['নিকটতম', 'closest'],
  ['মূল', 'parent'],

  // Events
  ['ক্লিক', 'click'],
  ['পরিবর্তন', 'change'],
  ['জমা', 'submit'],
  ['ইনপুট', 'input'],
  ['লোড', 'load'],
  ['স্ক্রোল', 'scroll'],
]);

// =============================================================================
// Bengali Tokenizer Class
// =============================================================================

export class BengaliTokenizer extends BaseTokenizer {
  readonly language = 'bn';
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

      // Try CSS selector first
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

      // Try URL
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number
      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Variable references (:name)
      if (input[pos] === ':') {
        const startPos = pos;
        pos++; // Skip :
        let varName = '';
        while (pos < input.length && (isAsciiIdentifierChar(input[pos]) || isBengali(input[pos]))) {
          varName += input[pos];
          pos++;
        }
        if (varName) {
          tokens.push(
            createToken(':' + varName, 'identifier', createPosition(startPos, pos), ':' + varName)
          );
          continue;
        }
        pos = startPos;
      }

      // Bengali words
      if (isBengali(input[pos])) {
        const startPos = pos;
        let word = '';

        while (pos < input.length && (isBengali(input[pos]) || input[pos] === ' ')) {
          if (input[pos] === ' ') {
            // Check if next char is Bengali (compound word)
            if (pos + 1 < input.length && isBengali(input[pos + 1])) {
              const rest = input.slice(pos);
              const compound = [' করুন', ' ফেলুন', ' দিন', ' না হলে', ' যে যান'].find(c =>
                rest.startsWith(c)
              );
              if (compound) {
                word += compound;
                pos += compound.length;
                continue;
              }
            }
            break;
          }
          word += input[pos];
          pos++;
        }

        const normalized = BENGALI_KEYWORDS.get(word);
        if (normalized) {
          tokens.push(createToken(word, 'keyword', createPosition(startPos, pos), normalized));
        } else if (SINGLE_POSTPOSITIONS.has(word)) {
          tokens.push(createToken(word, 'particle', createPosition(startPos, pos)));
        } else {
          tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
        }
        continue;
      }

      // ASCII identifiers
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos];
          pos++;
        }

        const normalized = BENGALI_KEYWORDS.get(word.toLowerCase());
        const kind: TokenKind = normalized ? 'keyword' : 'identifier';
        tokens.push(
          createToken(word, kind, createPosition(startPos, pos), normalized || word.toLowerCase())
        );
        continue;
      }

      // Operators and punctuation
      const startPos = pos;
      tokens.push(createToken(input[pos], 'operator', createPosition(startPos, pos + 1)));
      pos++;
    }

    return new TokenStreamImpl(tokens, this.language);
  }

  classifyToken(value: string): TokenKind {
    if (BENGALI_KEYWORDS.has(value)) return 'keyword';
    if (SINGLE_POSTPOSITIONS.has(value)) return 'particle';
    if (value.startsWith('.') || value.startsWith('#') || value.startsWith('[')) return 'selector';
    if (value.startsWith(':')) return 'identifier';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^-?\d/.test(value)) return 'literal';
    return 'identifier';
  }

  private extractNumber(input: string, start: number): LanguageToken | null {
    let pos = start;
    let num = '';

    if (input[pos] === '-') {
      num += '-';
      pos++;
    }

    while (pos < input.length && isDigit(input[pos])) {
      num += input[pos];
      pos++;
    }

    if (pos < input.length && input[pos] === '.') {
      num += '.';
      pos++;
      while (pos < input.length && isDigit(input[pos])) {
        num += input[pos];
        pos++;
      }
    }

    if (num === '-') {
      return null;
    }

    return createToken(num, 'literal', createPosition(start, pos));
  }
}

export const bengaliTokenizer = new BengaliTokenizer();
