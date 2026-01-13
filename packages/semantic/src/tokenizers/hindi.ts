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
} from './base';

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
// Hindi Keywords
// =============================================================================

/**
 * Hindi command keywords mapped to their English equivalents.
 */
const HINDI_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['टॉगल', 'toggle'],
  ['बदलें', 'toggle'],
  ['बदल', 'toggle'],
  ['जोड़ें', 'add'],
  ['जोड़', 'add'],
  ['हटाएं', 'remove'],
  ['हटा', 'remove'],
  ['मिटाएं', 'remove'],

  // Commands - Content operations
  ['रखें', 'put'],
  ['रख', 'put'],
  ['डालें', 'put'],
  ['डाल', 'put'],
  ['लें', 'take'],
  ['ले', 'take'],
  ['बनाएं', 'make'],
  ['बना', 'make'],
  ['कॉपी', 'clone'],
  ['प्रतिलिपि', 'clone'],

  // Commands - Variable operations
  ['सेट', 'set'],
  ['निर्धारित', 'set'],
  ['प्राप्त', 'get'],
  ['पाएं', 'get'],
  ['बढ़ाएं', 'increment'],
  ['बढ़ा', 'increment'],
  ['घटाएं', 'decrement'],
  ['घटा', 'decrement'],
  ['लॉग', 'log'],
  ['दर्ज', 'log'],

  // Commands - Visibility
  ['दिखाएं', 'show'],
  ['दिखा', 'show'],
  ['छिपाएं', 'hide'],
  ['छिपा', 'hide'],
  ['संक्रमण', 'transition'],

  // Commands - Events
  ['पर', 'on'],
  ['जब', 'when'],

  // Commands - DOM focus
  ['फोकस', 'focus'],
  ['केंद्रित', 'focus'],
  ['धुंधला', 'blur'],

  // Commands - Navigation
  ['जाएं', 'go'],
  ['जा', 'go'],

  // Commands - Async
  ['प्रतीक्षा', 'wait'],
  ['रुकें', 'wait'],
  ['लाएं', 'fetch'],
  ['स्थिर', 'settle'],

  // Commands - Control flow
  ['अगर', 'if'],
  ['यदि', 'if'],
  ['वरना', 'else'],
  ['नहीं तो', 'else'],
  ['दोहराएं', 'repeat'],
  ['दोहरा', 'repeat'],
  ['के लिए', 'for'],
  ['जब तक', 'while'],
  ['जारी', 'continue'],
  ['रोकें', 'halt'],
  ['रोक', 'halt'],
  ['फेंकें', 'throw'],
  ['फेंक', 'throw'],
  ['कॉल', 'call'],
  ['बुलाएं', 'call'],
  ['लौटाएं', 'return'],
  ['लौटा', 'return'],

  // Commands - Advanced
  ['जेएस', 'js'],
  ['असिंक', 'async'],
  ['बताएं', 'tell'],
  ['बता', 'tell'],
  ['डिफ़ॉल्ट', 'default'],
  ['प्रारंभ', 'init'],
  ['व्यवहार', 'behavior'],

  // Control flow helpers
  ['फिर', 'then'],
  ['तब', 'then'],
  ['समाप्त', 'end'],
  ['अंत', 'end'],

  // Modifiers
  ['से पहले', 'before'],
  ['के बाद', 'after'],
  ['से', 'from'],
  ['को', 'to'],
  ['के साथ', 'with'],

  // Values
  ['सच', 'true'],
  ['सत्य', 'true'],
  ['झूठ', 'false'],
  ['असत्य', 'false'],
  ['खाली', 'null'],
  ['अपरिभाषित', 'undefined'],
  ['मैं', 'me'],
  ['यह', 'it'],
  ['परिणाम', 'result'],

  // Positional
  ['पहला', 'first'],
  ['अंतिम', 'last'],
  ['अगला', 'next'],
  ['पिछला', 'previous'],
  ['निकटतम', 'closest'],
  ['मूल', 'parent'],

  // Events
  ['क्लिक', 'click'],
  ['परिवर्तन', 'change'],
  ['जमा', 'submit'],
  ['इनपुट', 'input'],
  ['लोड', 'load'],
  ['स्क्रॉल', 'scroll'],
]);

// =============================================================================
// Hindi Tokenizer Class
// =============================================================================

export class HindiTokenizer extends BaseTokenizer {
  readonly language = 'hi';
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
        const normalized = HINDI_KEYWORDS.get(word);
        if (normalized) {
          tokens.push(createToken(word, 'keyword', createPosition(startPos, pos), normalized));
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
        const normalized = HINDI_KEYWORDS.get(word.toLowerCase());
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
    if (HINDI_KEYWORDS.has(value)) return 'keyword';
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
