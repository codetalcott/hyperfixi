/**
 * Hindi Tokenizer
 *
 * Tokenizes Hindi hyperscript input.
 * Hindi is a fusional SOV language with:
 * - Devanagari script (U+0900-U+097F)
 * - Postposition markers (को, में, पर, से, etc.)
 * - Verb conjugations with stem + suffix patterns
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
  type KeywordEntry,
} from './base';
import { hindiProfile } from '../generators/profiles/hindi';

// =============================================================================
// Hindi Character Classification
// =============================================================================

/**
 * Check if character is in the Devanagari script range.
 * Devanagari: U+0900-U+097F
 * Devanagari Extended: U+A8E0-U+A8FF
 */
function isDevanagari(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0900 && code <= 0x097f) || (code >= 0xa8e0 && code <= 0xa8ff);
}

/**
 * Check if character is Hindi (Devanagari or common punctuation).
 */
function isHindi(char: string): boolean {
  return isDevanagari(char);
}

// =============================================================================
// Hindi Postpositions
// =============================================================================

/**
 * Single-word postpositions.
 */
const SINGLE_POSTPOSITIONS = new Set(['को', 'में', 'पर', 'से', 'का', 'की', 'के', 'तक', 'ने']);

// =============================================================================
// Hindi Extras (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the Hindi profile.
 * Profile provides: commands, references, possessives, roleMarkers
 * Extras provide: values, positional, events, modifiers
 */
const HINDI_EXTRAS: KeywordEntry[] = [
  // Values
  { native: 'सच', normalized: 'true' },
  { native: 'सत्य', normalized: 'true' },
  { native: 'झूठ', normalized: 'false' },
  { native: 'असत्य', normalized: 'false' },
  { native: 'खाली', normalized: 'null' },
  { native: 'अपरिभाषित', normalized: 'undefined' },

  // Positional
  { native: 'पहला', normalized: 'first' },
  { native: 'अंतिम', normalized: 'last' },
  { native: 'अगला', normalized: 'next' },
  { native: 'पिछला', normalized: 'previous' },
  { native: 'निकटतम', normalized: 'closest' },
  { native: 'मूल', normalized: 'parent' },

  // Events
  { native: 'क्लिक', normalized: 'click' },
  { native: 'परिवर्तन', normalized: 'change' },
  { native: 'जमा', normalized: 'submit' },
  { native: 'इनपुट', normalized: 'input' },
  { native: 'लोड', normalized: 'load' },
  { native: 'स्क्रॉल', normalized: 'scroll' },

  // Additional modifiers not in profile
  { native: 'को', normalized: 'to' },
  { native: 'के साथ', normalized: 'with' },
];

// =============================================================================
// Hindi Tokenizer Class
// =============================================================================

export class HindiTokenizer extends BaseTokenizer {
  readonly language = 'hi';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(hindiProfile, HINDI_EXTRAS);
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
        while (pos < input.length && (isAsciiIdentifierChar(input[pos]) || isHindi(input[pos]))) {
          varName += input[pos];
          pos++;
        }
        if (varName) {
          tokens.push(
            createToken(':' + varName, 'identifier', createPosition(startPos, pos), ':' + varName)
          );
          continue;
        }
        // Lone colon - put back
        pos = startPos;
      }

      // Devanagari words
      if (isHindi(input[pos])) {
        const startPos = pos;
        let word = '';

        while (pos < input.length && (isHindi(input[pos]) || input[pos] === ' ')) {
          // Allow spaces for compound words but stop at double spaces
          if (input[pos] === ' ') {
            // Check if next char is Hindi (compound postposition)
            if (pos + 1 < input.length && isHindi(input[pos + 1])) {
              // Check if it forms a known compound
              const rest = input.slice(pos);
              const compound = [
                ' के लिए',
                ' के साथ',
                ' के बाद',
                ' से पहले',
                ' नहीं तो',
                ' जब तक',
                ' के बारे में',
              ].find(c => rest.startsWith(c));
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

        // Check if it's a keyword
        const keywordEntry = this.profileKeywords.find(
          k => k.native === word || k.native.toLowerCase() === word.toLowerCase()
        );
        if (keywordEntry) {
          tokens.push(
            createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized)
          );
        } else if (SINGLE_POSTPOSITIONS.has(word)) {
          // It's a particle
          tokens.push(createToken(word, 'particle', createPosition(startPos, pos)));
        } else {
          // Unknown Hindi word - treat as identifier
          tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
        }
        continue;
      }

      // ASCII identifiers (for mixed content)
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos];
          pos++;
        }

        // Check if it's a known keyword
        const keywordEntry = this.profileKeywords.find(
          k => k.native.toLowerCase() === word.toLowerCase()
        );
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
    if (
      this.profileKeywords.some(
        k => k.native === value || k.native.toLowerCase() === value.toLowerCase()
      )
    ) {
      return 'keyword';
    }
    if (SINGLE_POSTPOSITIONS.has(value)) return 'particle';
    if (value.startsWith('.') || value.startsWith('#') || value.startsWith('[')) return 'selector';
    if (value.startsWith(':')) return 'identifier';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^-?\d/.test(value)) return 'literal';
    return 'identifier';
  }

  /**
   * Extract a number from the input.
   */
  private extractNumber(input: string, start: number): LanguageToken | null {
    let pos = start;
    let num = '';

    // Handle negative sign
    if (input[pos] === '-') {
      num += '-';
      pos++;
    }

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      num += input[pos];
      pos++;
    }

    // Decimal part
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

// =============================================================================
// Export
// =============================================================================

export const hindiTokenizer = new HindiTokenizer();
