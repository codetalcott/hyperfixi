/**
 * Thai Tokenizer
 *
 * Tokenizes Thai hyperscript input.
 * Thai is an isolating SVO language with:
 * - Thai script (U+0E00-U+0E7F)
 * - No spaces between words (like Chinese/Japanese)
 * - Prepositions for grammatical marking
 * - CSS selectors are embedded ASCII
 *
 * This tokenizer derives keywords from the Thai profile (single source of truth)
 * with extras for literals, positional words, and event names.
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import type { KeywordEntry } from './base';
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
} from './base';
import { thaiProfile } from '../generators/profiles/thai';

// =============================================================================
// Thai Character Classification
// =============================================================================

/** Check if character is in the Thai script range (U+0E00-U+0E7F). */
const isThai = createUnicodeRangeClassifier([[0x0e00, 0x0e7f]]);

// =============================================================================
// Thai-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 * - Additional modifiers (when, to, with)
 */
const THAI_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'จริง', normalized: 'true' },
  { native: 'เท็จ', normalized: 'false' },
  { native: 'ว่าง', normalized: 'null' },
  { native: 'ไม่กำหนด', normalized: 'undefined' },

  // Positional
  { native: 'แรก', normalized: 'first' },
  { native: 'สุดท้าย', normalized: 'last' },
  { native: 'ถัดไป', normalized: 'next' },
  { native: 'ก่อนหน้า', normalized: 'previous' },
  { native: 'ใกล้สุด', normalized: 'closest' },
  { native: 'ต้นทาง', normalized: 'parent' },

  // Events
  { native: 'คลิก', normalized: 'click' },
  { native: 'เปลี่ยนแปลง', normalized: 'change' },
  { native: 'ส่ง', normalized: 'submit' },
  { native: 'อินพุต', normalized: 'input' },
  { native: 'โหลด', normalized: 'load' },
  { native: 'เลื่อน', normalized: 'scroll' },

  // Additional modifiers
  { native: 'เวลา', normalized: 'when' },
  { native: 'ไปยัง', normalized: 'to' },
  { native: 'ด้วย', normalized: 'with' },
  { native: 'และ', normalized: 'and' },
];

// =============================================================================
// Thai Tokenizer Class
// =============================================================================

export class ThaiTokenizer extends BaseTokenizer {
  readonly language = 'th';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(thaiProfile, THAI_EXTRAS);
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace (Thai can have spaces for readability)
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // Try CSS selector first
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

      // Try URL
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Try number (use base class method)
      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.tryNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Variable references (:name)
      if (input[pos] === ':') {
        const startPos = pos;
        pos++;
        let varName = '';
        while (pos < input.length && (isAsciiIdentifierChar(input[pos]) || isThai(input[pos]))) {
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

      // Thai text - try profile keyword matching (longest match first)
      if (isThai(input[pos])) {
        const startPos = pos;

        // Try to match keywords from profile (longest first, greedy matching)
        const keywordToken = this.tryProfileKeyword(input, pos);
        if (keywordToken) {
          tokens.push(keywordToken);
          pos = keywordToken.position.end;
          continue;
        }

        // Unknown Thai word - read until non-Thai or known keyword
        let word = '';
        while (pos < input.length && isThai(input[pos])) {
          // Check if we're at the start of a known keyword
          if (word.length > 0 && this.isKeywordStart(input, pos)) {
            break;
          }
          word += input[pos];
          pos++;
        }
        if (word) {
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
        tokens.push(
          createToken(word, 'identifier', createPosition(startPos, pos), word.toLowerCase())
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
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(value)) return 'keyword';
    if (
      value.startsWith('.') ||
      value.startsWith('#') ||
      value.startsWith('[') ||
      value.startsWith('*') ||
      value.startsWith('<')
    )
      return 'selector';
    if (value.startsWith(':')) return 'identifier';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^-?\d/.test(value)) return 'literal';
    return 'identifier';
  }
}

export const thaiTokenizer = new ThaiTokenizer();
