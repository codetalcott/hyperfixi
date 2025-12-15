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
  isUrlStart,
  isPossessiveMarker,
} from './base';

// =============================================================================
// English Keywords
// =============================================================================

/**
 * English hyperscript keywords that should be recognized.
 */
const ENGLISH_KEYWORDS = new Set([
  // Commands - Class/Attribute operations
  'toggle', 'add', 'remove',
  // Commands - Content operations
  'put', 'append', 'prepend', 'take', 'make', 'clone', 'swap', 'morph',
  // Swap strategies
  'delete', 'innerHTML', 'outerHTML', 'beforebegin', 'afterend', 'beforeend', 'afterbegin',
  // Commands - Variable operations
  'set', 'get', 'increment', 'decrement', 'log',
  // Commands - Visibility
  'show', 'hide', 'transition',
  // Commands - Events
  'on', 'trigger', 'send',
  // Commands - DOM focus
  'focus', 'blur',
  // Commands - Navigation
  'go',
  // Commands - Async
  'wait', 'fetch', 'settle',
  // Commands - Control flow
  'if', 'else', 'repeat', 'for', 'while', 'continue', 'halt', 'throw', 'call', 'return',
  // Commands - Advanced
  'js', 'async', 'tell', 'default', 'init', 'behavior',
  // Event handling
  'every', 'when', 'upon',
  // Control flow helpers
  'then', 'end', 'unless', 'until', 'forever', 'times',
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
  // Command synonyms (developer-friendly alternatives)
  'flip', 'switch', 'increase', 'decrease', 'display', 'reveal', 'conceal',
  // British spelling aliases
  'colour', 'grey', 'centre', 'behaviour', 'initialise', 'favourite',
]);

/**
 * English command synonyms - maps alternative terms to standard commands.
 * Used for beginner-friendly syntax.
 */
const ENGLISH_SYNONYMS: Record<string, string> = {
  // Toggle synonyms
  'flip': 'toggle',
  'switch': 'toggle',
  // Increment/Decrement synonyms
  'increase': 'increment',
  'decrease': 'decrement',
  // Show/Hide synonyms
  'display': 'show',
  'reveal': 'show',
  'conceal': 'hide',
  // British spelling aliases
  'colour': 'color',
  'grey': 'gray',
  'centre': 'center',
  'behaviour': 'behavior',
  'initialise': 'initialize',
  'favourite': 'favorite',
};

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
      // But check if this is a property access or method call first
      if (isSelectorStart(input[pos])) {
        // Check for property access pattern: identifier.identifier or identifier.method()
        // When the previous token is an identifier or keyword AND there's no whitespace,
        // treat . as property accessor. With whitespace (e.g., "add .active"), it's a selector.
        if (input[pos] === '.') {
          const lastToken = tokens[tokens.length - 1];
          // Property access requires NO whitespace between tokens (e.g., "obj.prop")
          // CSS selectors have whitespace (e.g., "add .active")
          const hasWhitespaceBefore = lastToken && lastToken.position.end < pos;
          const isPropertyAccess = lastToken &&
            !hasWhitespaceBefore &&
            (lastToken.kind === 'identifier' || lastToken.kind === 'keyword' || lastToken.kind === 'selector');

          if (isPropertyAccess) {
            // Tokenize . as property accessor
            tokens.push(createToken('.', 'operator', createPosition(pos, pos + 1)));
            pos++;
            continue;
          }

          // Check for method call pattern at start: .identifier(
          const methodStart = pos + 1;
          let methodEnd = methodStart;
          while (methodEnd < input.length && isAsciiIdentifierChar(input[methodEnd])) {
            methodEnd++;
          }
          // If followed by (, this is a method call, not a class selector
          if (methodEnd < input.length && input[methodEnd] === '(') {
            // Tokenize . as property accessor
            tokens.push(createToken('.', 'operator', createPosition(pos, pos + 1)));
            pos++;
            continue;
          }
        }

        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // Try string literal (but not possessive markers)
      if (isQuote(input[pos])) {
        // Check for possessive 's marker first
        if (input[pos] === "'" && isPossessiveMarker(input, pos)) {
          // Tokenize 's as a possessive marker
          tokens.push(createToken("'s", 'punctuation', createPosition(pos, pos + 2)));
          pos += 2;
          continue;
        }
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
      if (isDigit(input[pos]) || (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))) {
        const numberToken = this.tryNumber(input, pos);
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
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  /**
   * Extract a word (identifier or keyword) from the input.
   * Handles namespaced event names like "draggable:start".
   */
  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    // Check for namespaced event name pattern: word:word (e.g., draggable:start)
    // This is different from variable references (:varname) which start with colon
    if (pos < input.length && input[pos] === ':') {
      const colonPos = pos;
      pos++; // consume colon
      let namespace = '';
      while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
        namespace += input[pos++];
      }
      // Only treat as namespaced event if there's text after the colon
      if (namespace) {
        word = word + ':' + namespace;
      } else {
        // No text after colon, revert to just the word
        pos = colonPos;
      }
    }

    const kind = this.classifyToken(word);
    const lower = word.toLowerCase();
    const normalized = ENGLISH_SYNONYMS[lower];
    return createToken(
      word,
      kind,
      createPosition(startPos, pos),
      normalized // Will be undefined if not a synonym, which is fine
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
