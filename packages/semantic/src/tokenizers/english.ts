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
  type KeywordEntry,
} from './base';
import { englishProfile } from '../generators/profiles/english';

// =============================================================================
// English Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Event names
 * - Positional words
 * - Prepositions/modifiers
 * - Articles
 * - Synonyms with normalized forms
 * - Swap strategies
 * - British spelling aliases
 */
const ENGLISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'true', normalized: 'true' },
  { native: 'false', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'undefined', normalized: 'undefined' },

  // Positional
  { native: 'first', normalized: 'first' },
  { native: 'last', normalized: 'last' },
  { native: 'next', normalized: 'next' },
  { native: 'previous', normalized: 'previous' },
  { native: 'closest', normalized: 'closest' },

  // Events
  { native: 'click', normalized: 'click' },
  { native: 'dblclick', normalized: 'dblclick' },
  { native: 'mousedown', normalized: 'mousedown' },
  { native: 'mouseup', normalized: 'mouseup' },
  { native: 'mouseover', normalized: 'mouseover' },
  { native: 'mouseout', normalized: 'mouseout' },
  { native: 'mouseenter', normalized: 'mouseenter' },
  { native: 'mouseleave', normalized: 'mouseleave' },
  { native: 'mousemove', normalized: 'mousemove' },
  { native: 'keydown', normalized: 'keydown' },
  { native: 'keyup', normalized: 'keyup' },
  { native: 'keypress', normalized: 'keypress' },
  { native: 'input', normalized: 'input' },
  { native: 'change', normalized: 'change' },
  { native: 'submit', normalized: 'submit' },
  { native: 'reset', normalized: 'reset' },
  { native: 'load', normalized: 'load' },
  { native: 'unload', normalized: 'unload' },
  { native: 'scroll', normalized: 'scroll' },
  { native: 'resize', normalized: 'resize' },
  { native: 'dragstart', normalized: 'dragstart' },
  { native: 'drag', normalized: 'drag' },
  { native: 'dragend', normalized: 'dragend' },
  { native: 'dragenter', normalized: 'dragenter' },
  { native: 'dragleave', normalized: 'dragleave' },
  { native: 'dragover', normalized: 'dragover' },
  { native: 'drop', normalized: 'drop' },
  { native: 'touchstart', normalized: 'touchstart' },
  { native: 'touchmove', normalized: 'touchmove' },
  { native: 'touchend', normalized: 'touchend' },
  { native: 'touchcancel', normalized: 'touchcancel' },

  // Prepositions/modifiers not in profile
  { native: 'in', normalized: 'in' },
  { native: 'to', normalized: 'to' },
  { native: 'at', normalized: 'at' },
  { native: 'by', normalized: 'by' },
  { native: 'with', normalized: 'with' },
  { native: 'without', normalized: 'without' },
  { native: 'of', normalized: 'of' },
  { native: 'as', normalized: 'as' },

  // Event handling keywords
  { native: 'every', normalized: 'every' },
  { native: 'upon', normalized: 'upon' },

  // Control flow helpers not in profile
  { native: 'unless', normalized: 'unless' },
  { native: 'forever', normalized: 'forever' },
  { native: 'times', normalized: 'times' },

  // Logical
  { native: 'and', normalized: 'and' },
  { native: 'or', normalized: 'or' },
  { native: 'not', normalized: 'not' },
  { native: 'is', normalized: 'is' },
  { native: 'exists', normalized: 'exists' },
  { native: 'empty', normalized: 'empty' },

  // References not in profile
  { native: 'my', normalized: 'my' },
  { native: 'your', normalized: 'your' },
  { native: 'its', normalized: 'its' },
  { native: 'the', normalized: 'the' },
  { native: 'a', normalized: 'a' },
  { native: 'an', normalized: 'an' },

  // Swap strategies
  { native: 'delete', normalized: 'delete' },
  { native: 'innerHTML', normalized: 'innerHTML' },
  { native: 'outerHTML', normalized: 'outerHTML' },
  { native: 'beforebegin', normalized: 'beforebegin' },
  { native: 'afterend', normalized: 'afterend' },
  { native: 'beforeend', normalized: 'beforeend' },
  { native: 'afterbegin', normalized: 'afterbegin' },

  // Command synonyms with normalized forms
  { native: 'flip', normalized: 'toggle' },
  { native: 'switch', normalized: 'toggle' },
  { native: 'increase', normalized: 'increment' },
  { native: 'decrease', normalized: 'decrement' },
  { native: 'display', normalized: 'show' },
  { native: 'reveal', normalized: 'show' },
  { native: 'conceal', normalized: 'hide' },

  // British spelling aliases
  { native: 'colour', normalized: 'color' },
  { native: 'grey', normalized: 'gray' },
  { native: 'centre', normalized: 'center' },
  { native: 'behaviour', normalized: 'behavior' },
  { native: 'initialise', normalized: 'initialize' },
  { native: 'favourite', normalized: 'favorite' },
];

// =============================================================================
// English Tokenizer Implementation
// =============================================================================

export class EnglishTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(englishProfile, ENGLISH_EXTRAS);
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

      // Try CSS selector first (highest priority)
      // But check if this is a property access or method call first
      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
          continue;
        }

        // Check for property access pattern: identifier.identifier or identifier.method()
        // When the previous token is an identifier or keyword AND there's no whitespace,
        // treat . as property accessor. With whitespace (e.g., "add .active"), it's a selector.
        if (input[pos] === '.') {
          const lastToken = tokens[tokens.length - 1];
          // Property access requires NO whitespace between tokens (e.g., "obj.prop")
          // CSS selectors have whitespace (e.g., "add .active")
          const hasWhitespaceBefore = lastToken && lastToken.position.end < pos;
          const isPropertyAccess =
            lastToken &&
            !hasWhitespaceBefore &&
            (lastToken.kind === 'identifier' ||
              lastToken.kind === 'keyword' ||
              lastToken.kind === 'selector');

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
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
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

    // O(1) Map lookup for normalized form (for synonyms like flip→toggle)
    const keywordEntry = this.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Check for natural class syntax: "{identifier} class" → ".{identifier}"
    // This allows "toggle the active class" to work like "toggle the .active"
    if (kind === 'identifier') {
      const classConversion = this.tryConvertToClassSelector(input, pos, word);
      if (classConversion) {
        return classConversion.token;
      }
    }

    return createToken(
      word,
      kind,
      createPosition(startPos, pos),
      normalized // Will be undefined if not a synonym, which is fine
    );
  }

  /**
   * Try to convert an identifier followed by "class" to a class selector.
   * E.g., "active class" → ".active"
   *
   * This enables natural English syntax like:
   * - "toggle the active class" → "toggle .active"
   * - "add the visible class" → "add .visible"
   */
  private tryConvertToClassSelector(
    input: string,
    pos: number,
    word: string
  ): { token: LanguageToken; endPos: number } | null {
    let checkPos = pos;

    // Skip whitespace
    while (checkPos < input.length && /\s/.test(input[checkPos])) {
      checkPos++;
    }

    // Check if next word is "class"
    if (input.slice(checkPos, checkPos + 5).toLowerCase() === 'class') {
      // Make sure "class" is a complete word (not "className" etc.)
      const afterClass = checkPos + 5;
      if (afterClass >= input.length || !isAsciiIdentifierChar(input[afterClass])) {
        // Convert to class selector
        const selectorValue = '.' + word;
        // Note: we DON'T consume "class" here - let the noise word handling in
        // pattern-matcher skip it. This keeps the token stream cleaner.
        return {
          token: createToken(selectorValue, 'selector', createPosition(pos - word.length, pos)),
          endPos: pos,
        };
      }
    }

    return null;
  }
}

/**
 * Singleton instance.
 */
export const englishTokenizer = new EnglishTokenizer();
