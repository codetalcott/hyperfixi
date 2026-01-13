/**
 * Tagalog Tokenizer
 *
 * Tokenizes Tagalog hyperscript input.
 * Word order: VSO
 * Direction: ltr
 * Uses spaces: true
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
// Tagalog Keywords
// =============================================================================

// TODO: Add keywords from profile - these map native words to English commands
const TL_KEYWORDS: Map<string, string> = new Map([
  // Commands - copy from profile.keywords
  // ['native_word', 'toggle'],
  // ['native_word', 'add'],
  // etc.
]);

// =============================================================================
// Tagalog Tokenizer Implementation
// =============================================================================

export class TagalogTokenizer extends BaseTokenizer {
  readonly language = 'tl';
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

      // CSS selectors
      if (isSelectorStart(input[pos])) {
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
        const startPos = pos;
        pos++;
        let varName = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
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

      // Operators and punctuation
      if ('()[]{}:,;'.includes(input[pos])) {
        tokens.push(createToken(input[pos], 'operator', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // Words/identifiers
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos];
          pos++;
        }
        const kind = this.classifyToken(word);
        const normalized = TL_KEYWORDS.get(word.toLowerCase());
        tokens.push(createToken(word, kind, createPosition(startPos, pos), normalized));
        continue;
      }

      // Unknown character - skip
      pos++;
    }

    return new TokenStreamImpl(tokens, 'tl');
  }

  classifyToken(token: string): TokenKind {
    if (TL_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    return 'identifier';
  }
}

export const tagalogTokenizer = new TagalogTokenizer();
