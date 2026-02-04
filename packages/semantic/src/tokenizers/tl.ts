/**
 * Tagalog Tokenizer
 *
 * Tokenizes Tagalog hyperscript input.
 * Word order: VSO
 * Direction: ltr
 * Uses spaces: true
 *
 * This tokenizer derives keywords from the Tagalog profile (single source of truth)
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
import { tagalogProfile } from '../generators/profiles/tl';

// =============================================================================
// Tagalog-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 */
const TAGALOG_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'totoo', normalized: 'true' },
  { native: 'mali', normalized: 'false' },
  { native: 'wala', normalized: 'null' },
  { native: 'hindi_tinukoy', normalized: 'undefined' },

  // Positional
  { native: 'una', normalized: 'first' },
  { native: 'huli', normalized: 'last' },
  { native: 'susunod', normalized: 'next' },
  { native: 'nakaraan', normalized: 'previous' },
  { native: 'pinakamalapit', normalized: 'closest' },
  { native: 'magulang', normalized: 'parent' },

  // Events
  { native: 'pindot', normalized: 'click' },
  { native: 'pagbabago', normalized: 'change' },
  { native: 'isumite', normalized: 'submit' },
  { native: 'input', normalized: 'input' },
  { native: 'karga', normalized: 'load' },
  { native: 'mag_scroll', normalized: 'scroll' },
];

// =============================================================================
// Tagalog Tokenizer Implementation
// =============================================================================

export class TagalogTokenizer extends BaseTokenizer {
  readonly language = 'tl';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(tagalogProfile, TAGALOG_EXTRAS);
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

    return new TokenStreamImpl(tokens, 'tl');
  }

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    if (
      token.startsWith('.') ||
      token.startsWith('#') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith(':')) return 'identifier';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^-?\d/.test(token)) return 'literal';
    return 'identifier';
  }
}

export const tagalogTokenizer = new TagalogTokenizer();
