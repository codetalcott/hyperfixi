/**
 * Malay Tokenizer
 *
 * Tokenizes Malay hyperscript input.
 * Word order: SVO
 * Direction: ltr
 * Uses spaces: true
 *
 * This tokenizer derives keywords from the Malay profile (single source of truth)
 * with extras for literals, positional words, and event names.
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import type { KeywordEntry } from './base';
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
import { malayProfile } from '../generators/profiles/ms';

// =============================================================================
// Malay-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 */
const MALAY_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'benar', normalized: 'true' },
  { native: 'salah', normalized: 'false' },
  { native: 'kosong', normalized: 'null' },
  { native: 'tak_tentu', normalized: 'undefined' },

  // Positional
  { native: 'pertama', normalized: 'first' },
  { native: 'terakhir', normalized: 'last' },
  { native: 'seterusnya', normalized: 'next' },
  { native: 'sebelumnya', normalized: 'previous' },
  { native: 'terdekat', normalized: 'closest' },
  { native: 'induk', normalized: 'parent' },

  // Events
  { native: 'klik', normalized: 'click' },
  { native: 'berubah', normalized: 'change' },
  { native: 'hantar', normalized: 'submit' },
  { native: 'input', normalized: 'input' },
  { native: 'muat', normalized: 'load' },
  { native: 'tatal', normalized: 'scroll' },
];

// =============================================================================
// Malay Tokenizer Implementation
// =============================================================================

export class MalayTokenizer extends BaseTokenizer {
  readonly language = 'ms';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(malayProfile, MALAY_EXTRAS);
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

      // CSS selectors
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

      // String literals
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Numbers
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

      // URLs
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Variable references (:name)
      if (input[pos] === ':') {
        const varToken = this.tryVariableRef(input, pos);
        if (varToken) {
          tokens.push(varToken);
          pos = varToken.position.end;
          continue;
        }
      }

      // Operators and punctuation
      if ('()[]{}:,;'.includes(input[pos])) {
        tokens.push(createToken(input[pos], 'operator', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // Words/identifiers - try profile keyword matching first
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;

        // Try to match keywords from profile (longest first)
        const keywordToken = this.tryProfileKeyword(input, pos);
        if (keywordToken) {
          tokens.push(keywordToken);
          pos = keywordToken.position.end;
          continue;
        }

        // Unknown word - read until non-identifier
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos];
          pos++;
        }
        if (word) {
          tokens.push(createToken(word, 'identifier', createPosition(startPos, pos)));
        }
        continue;
      }

      // Unknown character - skip
      pos++;
    }

    return new TokenStreamImpl(tokens, 'ms');
  }

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('.') || token.startsWith('#') || token.startsWith('[')) return 'selector';
    if (token.startsWith(':')) return 'identifier';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^-?\d/.test(token)) return 'literal';
    return 'identifier';
  }
}

export const malayTokenizer = new MalayTokenizer();
