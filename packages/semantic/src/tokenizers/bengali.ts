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
  createUnicodeRangeClassifier,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
  type KeywordEntry,
} from './base';
import { bengaliProfile } from '../generators/profiles/bengali';

// =============================================================================
// Bengali Character Classification
// =============================================================================

/** Check if character is in the Bengali script range (U+0980-U+09FF). */
const isBengali = createUnicodeRangeClassifier([[0x0980, 0x09ff]]);

// =============================================================================
// Bengali Postpositions
// =============================================================================

/**
 * Single-word postpositions.
 */
const SINGLE_POSTPOSITIONS = new Set([
  'কে',
  'তে',
  'থেকে',
  'র',
  'এর',
  'দিয়ে',
  'জন্য',
  'পর্যন্ত',
  'এ', // locative "at/on/in" — marks events (ক্লিক এ = "on click")
  'মধ্যে', // "in/within"
]);

// =============================================================================
// Bengali Extras (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the Bengali profile.
 * Profile provides: commands, references, possessives, roleMarkers
 * Extras provide: values, positional, events, modifiers
 */
const BENGALI_EXTRAS: KeywordEntry[] = [
  // Values
  { native: 'সত্য', normalized: 'true' },
  { native: 'মিথ্যা', normalized: 'false' },
  { native: 'শূন্য', normalized: 'null' },
  { native: 'অনির্ধারিত', normalized: 'undefined' },

  // Positional
  { native: 'প্রথম', normalized: 'first' },
  // Note: 'শেষ' means both 'end' and 'last' in Bengali - profile has it as 'end'
  { native: 'পরবর্তী', normalized: 'next' },
  { native: 'আগের', normalized: 'previous' },
  { native: 'নিকটতম', normalized: 'closest' },
  { native: 'মূল', normalized: 'parent' },

  // Events
  { native: 'ক্লিক', normalized: 'click' },
  { native: 'জমা', normalized: 'submit' },
  { native: 'ইনপুট', normalized: 'input' },
  { native: 'লোড', normalized: 'load' },
  { native: 'স্ক্রোল', normalized: 'scroll' },

  // Additional modifiers not in profile
  { native: 'কে', normalized: 'to' },
  { native: 'সাথে', normalized: 'with' },
];

// =============================================================================
// Bengali Tokenizer Class
// =============================================================================

export class BengaliTokenizer extends BaseTokenizer {
  readonly language = 'bn';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(bengaliProfile, BENGALI_EXTRAS);
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

      // Try CSS selector first
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

        // Extract word without including spaces (let parser handle multi-word patterns)
        while (pos < input.length && isBengali(input[pos])) {
          word += input[pos];
          pos++;
        }

        // Postpositions take priority — they are grammatical particles, not keywords
        if (SINGLE_POSTPOSITIONS.has(word)) {
          tokens.push(createToken(word, 'particle', createPosition(startPos, pos)));
        } else {
          // Check if it's a keyword (O(1) Map lookup)
          const keywordEntry = this.lookupKeyword(word);
          if (keywordEntry) {
            tokens.push(
              createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized)
            );
          } else {
            tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
          }
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

        // Check if it's a known keyword (O(1) Map lookup)
        const keywordEntry = this.lookupKeyword(word);
        const kind: TokenKind = keywordEntry ? 'keyword' : 'identifier';
        tokens.push(
          createToken(
            word,
            kind,
            createPosition(startPos, pos),
            keywordEntry?.normalized || word.toLowerCase()
          )
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
    if (this.isKeyword(value)) {
      return 'keyword';
    }
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
