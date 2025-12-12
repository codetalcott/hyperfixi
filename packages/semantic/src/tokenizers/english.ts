/**
 * English Tokenizer
 *
 * Tokenizes English hyperscript input.
 * English uses space-separated words with prepositions.
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  isAsciiIdentifierChar,
  isSelectorStart,
  isQuote,
  isDigit,
} from './base';

// =============================================================================
// English Keywords
// =============================================================================

/**
 * English hyperscript keywords that should be recognized.
 */
const ENGLISH_KEYWORDS = new Set([
  // Commands
  'toggle', 'add', 'remove', 'put', 'set', 'get',
  'show', 'hide', 'append', 'prepend', 'take',
  'increment', 'decrement', 'wait', 'fetch', 'go',
  'trigger', 'send', 'call', 'return', 'log',
  // Event handling
  'on', 'every',
  // Control flow
  'if', 'then', 'else', 'end', 'unless',
  'repeat', 'while', 'until', 'for', 'forever', 'times',
  // Prepositions/modifiers
  'into', 'in', 'to', 'from', 'at', 'by', 'with', 'without',
  'before', 'after', 'of', 'as',
  // Logical
  'and', 'or', 'not', 'is', 'exists', 'empty',
  // References
  'me', 'my', 'you', 'your', 'it', 'its', 'the', 'a', 'an',
  'result', 'event', 'target', 'body',
  // Positional
  'first', 'last', 'next', 'previous', 'closest',
  // Misc
  'true', 'false', 'null', 'undefined',
]);

/**
 * English event names.
 */
const ENGLISH_EVENTS = new Set([
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
  'mouseenter', 'mouseleave', 'mousemove',
  'keydown', 'keyup', 'keypress',
  'input', 'change', 'submit', 'reset', 'focus', 'blur',
  'load', 'unload', 'scroll', 'resize',
  'dragstart', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
  'touchstart', 'touchmove', 'touchend', 'touchcancel',
]);

// =============================================================================
// English Tokenizer Implementation
// =============================================================================

export class EnglishTokenizer extends BaseTokenizer {
  readonly language = 'en';
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

      // Try CSS selector first (highest priority)
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

      // Try number
      if (isDigit(input[pos]) || (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))) {
        const numberToken = this.tryNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // Try variable reference (:varname)
      if (input[pos] === ':' && pos + 1 < input.length && isAsciiIdentifierChar(input[pos + 1])) {
        const varToken = this.extractVariableRef(input, pos);
        if (varToken) {
          tokens.push(varToken);
          pos = varToken.position.end;
          continue;
        }
      }

      // Try word (identifier or keyword)
      if (isAsciiIdentifierChar(input[pos])) {
        const wordToken = this.extractWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      // Try operator
      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      // Skip unknown character
      pos++;
    }

    return new TokenStreamImpl(tokens, 'en');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (ENGLISH_KEYWORDS.has(lower)) return 'keyword';
    if (ENGLISH_EVENTS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  /**
   * Extract a word (identifier or keyword) from the input.
   */
  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const kind = this.classifyToken(word);
    return createToken(
      word,
      kind,
      createPosition(startPos, pos)
    );
  }

  /**
   * Extract a variable reference (:varname) from the input.
   * In hyperscript, :x refers to a local variable named x.
   */
  private extractVariableRef(input: string, startPos: number): LanguageToken | null {
    if (input[startPos] !== ':') return null;

    let pos = startPos + 1; // Skip the colon
    let varName = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      varName += input[pos++];
    }

    if (!varName) return null;

    // Return the full :varname as a single token
    return createToken(
      ':' + varName,
      'identifier', // Variable references are identifiers
      createPosition(startPos, pos)
    );
  }

  /**
   * Try to extract an operator token.
   */
  private tryOperator(input: string, pos: number): LanguageToken | null {
    // Two-character operators
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    // Single-character operators
    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    // Punctuation
    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

/**
 * Singleton instance.
 */
export const englishTokenizer = new EnglishTokenizer();
