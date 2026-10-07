/**
 * Expression Tokenizer
 *
 * Tokenizes expression strings into tokens for parsing.
 * Focused on expression-level constructs, not full hyperscript syntax.
 */

import { BINARY_PHRASES } from './phrases';
import { CSS_UNITS } from '../../css-units';

// =============================================================================
// Token Types
// =============================================================================

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  TEMPLATE_LITERAL = 'TEMPLATE_LITERAL',

  // Selectors
  ID_SELECTOR = 'ID_SELECTOR',
  CLASS_SELECTOR = 'CLASS_SELECTOR',
  ATTRIBUTE_SELECTOR = 'ATTRIBUTE_SELECTOR',
  QUERY_SELECTOR = 'QUERY_SELECTOR',
  /** Bare attribute reference: `@disabled`, `@aria-selected` (value keeps the `@`). */
  ATTRIBUTE_REF = 'ATTRIBUTE_REF',

  // References
  CONTEXT_VAR = 'CONTEXT_VAR',
  IDENTIFIER = 'IDENTIFIER',

  // Operators
  OPERATOR = 'OPERATOR',
  COMPARISON = 'COMPARISON',
  LOGICAL = 'LOGICAL',
  POSSESSIVE = 'POSSESSIVE',

  // Punctuation
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  /** `|` between conversions: `value as JSONString | JSON`. */
  PIPE = 'PIPE',

  // Special
  TIME_EXPRESSION = 'TIME_EXPRESSION',
  EOF = 'EOF',
  ERROR = 'ERROR',
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line?: number;
  column?: number;
}

// =============================================================================
// Constants
// =============================================================================

const CONTEXT_VARS = new Set([
  'me',
  'my',
  'myself',
  'you',
  'your',
  'yourself',
  'it',
  'its',
  'result',
  'event',
  'target',
  'body',
  'detail',
  'window',
  'document',
]);

const LOGICAL_OPERATORS = new Set(['and', 'or', 'not', 'no']);

const BOOLEAN_LITERALS = new Set(['true', 'false', 'null', 'undefined']);

/**
 * The words that end one of core's binary comparison phrases. A selector is
 * valid right after one — `target matches .modal-backdrop`, `#d1 has .x`, `6
 * is equal to #a.textContent` — so `previousTokenAllowsSelector` treats them
 * like the symbolic comparison operators. The tokenizer kept its own list,
 * which lacked the last word of every longer phrase (`to`, `than`, `really`,
 * `equal`) and `includes`, `include` and `contain`: `6 is equal to
 * #a.textContent` read the identifier `a`, and every translation of it on the
 * direct path read a variable.
 */
const PHRASE_END_WORDS: ReadonlySet<string> = new Set(
  BINARY_PHRASES.map(phrase => phrase.slice(phrase.lastIndexOf(' ') + 1))
);

/**
 * Positional builtins whose operand is a selector (`next .dropdown-menu`,
 * `closest .modal`). A selector is valid immediately after one, and the parser
 * folds the pair into a call expression the runtime's positional expressions
 * evaluate.
 */
const POSITIONAL_KEYWORDS = new Set(['next', 'previous', 'closest', 'first', 'last']);

const TIME_UNITS = new Set([
  'ms',
  's',
  'seconds',
  'second',
  'milliseconds',
  'millisecond',
  'minutes',
  'minute',
  'hours',
  'hour',
]);

// =============================================================================
// Tokenizer
// =============================================================================

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  // Track if the previous token allows a selector
  // Selectors are only valid at the start or after operators, opening brackets, etc.
  function previousTokenAllowsSelector(): boolean {
    if (tokens.length === 0) return true;
    const prev = tokens[tokens.length - 1];
    // A keyword comparison phrase (tokenized as IDENTIFIER) is followed by a
    // selector operand: `matches .modal-backdrop`, `is .active`, `is equal to #a`.
    if (prev.type === TokenType.IDENTIFIER && PHRASE_END_WORDS.has(prev.value.toLowerCase())) {
      return true;
    }
    // A positional builtin is followed by its selector operand:
    // `next .dropdown-menu`, `closest .modal`.
    if (prev.type === TokenType.IDENTIFIER && POSITIONAL_KEYWORDS.has(prev.value.toLowerCase())) {
      return true;
    }
    // `the textContent of #d1`: the owner of an `of` access.
    if (prev.type === TokenType.IDENTIFIER && prev.value.toLowerCase() === 'of') {
      return true;
    }
    // After these token types, a selector is valid
    return [
      TokenType.OPERATOR,
      TokenType.COMPARISON,
      TokenType.LOGICAL,
      TokenType.LPAREN,
      TokenType.LBRACKET,
      TokenType.LBRACE,
      TokenType.COMMA,
      TokenType.COLON,
    ].includes(prev.type);
  }

  function peek(offset = 0): string {
    return input[pos + offset] ?? '';
  }

  function advance(): string {
    const char = input[pos];
    pos++;
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return char;
  }

  function skipWhitespace(): void {
    while (pos < input.length && /\s/.test(input[pos])) {
      advance();
    }
  }

  function readWhile(predicate: (char: string) => boolean): string {
    let result = '';
    while (pos < input.length && predicate(input[pos])) {
      result += advance();
    }
    return result;
  }

  function readString(quote: string): string {
    let result = quote;
    advance(); // consume opening quote
    while (pos < input.length && input[pos] !== quote) {
      if (input[pos] === '\\' && pos + 1 < input.length) {
        result += advance(); // backslash
        result += advance(); // escaped char
      } else {
        result += advance();
      }
    }
    if (pos < input.length) {
      result += advance(); // closing quote
    }
    return result;
  }

  function readTemplateLiteral(): string {
    let result = '`';
    advance(); // consume opening backtick
    while (pos < input.length && input[pos] !== '`') {
      if (input[pos] === '\\' && pos + 1 < input.length) {
        result += advance();
        result += advance();
      } else {
        result += advance();
      }
    }
    if (pos < input.length) {
      result += advance(); // closing backtick
    }
    return result;
  }

  function readQuerySelector(): string {
    let result = '<';
    advance(); // consume <
    while (pos < input.length) {
      result += advance();
      if (result.endsWith('/>')) {
        break;
      }
    }
    return result;
  }

  function makeToken(type: TokenType, value: string, start: number): Token {
    return {
      type,
      value,
      start,
      end: pos,
      line,
      column: column - value.length,
    };
  }

  while (pos < input.length) {
    skipWhitespace();
    if (pos >= input.length) break;

    const start = pos;
    const char = peek();

    // Possessive 's (check before string literals)
    if (char === "'" && peek(1) === 's' && !/\w/.test(peek(2))) {
      advance(); // '
      advance(); // s
      tokens.push(makeToken(TokenType.POSSESSIVE, "'s", start));
      continue;
    }

    // String literals
    if (char === '"' || char === "'") {
      const value = readString(char);
      tokens.push(makeToken(TokenType.STRING, value, start));
      continue;
    }

    // Template literals
    if (char === '`') {
      const value = readTemplateLiteral();
      tokens.push(makeToken(TokenType.TEMPLATE_LITERAL, value, start));
      continue;
    }

    // Query selectors <tag/>
    if (char === '<' && /[a-zA-Z.#\[]/.test(peek(1))) {
      const value = readQuerySelector();
      tokens.push(makeToken(TokenType.QUERY_SELECTOR, value, start));
      continue;
    }

    // ID selectors #id (only at start or after operators)
    if (char === '#' && previousTokenAllowsSelector()) {
      advance();
      const name = readWhile(c => /[\w-]/.test(c));
      tokens.push(makeToken(TokenType.ID_SELECTOR, '#' + name, start));
      continue;
    }

    // Class selectors .class (only at start or after operators)
    if (char === '.' && /[a-zA-Z_-]/.test(peek(1)) && previousTokenAllowsSelector()) {
      advance();
      const name = readWhile(c => /[\w-]/.test(c));
      tokens.push(makeToken(TokenType.CLASS_SELECTOR, '.' + name, start));
      continue;
    }

    // Bare attribute references @attr (`@disabled`, `@aria-selected`).
    // Previously the `@` fell through the unknown-character skip, so the
    // attribute name surfaced as a plain identifier and the `@` was lost.
    if (char === '@' && /[a-zA-Z_]/.test(peek(1))) {
      advance();
      const name = readWhile(c => /[\w-]/.test(c));
      tokens.push(makeToken(TokenType.ATTRIBUTE_REF, '@' + name, start));
      continue;
    }

    // Attribute selectors [@attr] or [@attr="value"] (only at start or after
    // operators). A bare `[…]` is an array in hyperscript, never a selector:
    // `[n, 2]` read as the attribute selector `[n, 2]`, which the direct path
    // queried and threw on, in every language.
    if (char === '[' && previousTokenAllowsSelector()) {
      const nextChar = peek(1);
      if (nextChar === '@') {
        let value = '';
        value += advance(); // [
        while (pos < input.length && input[pos] !== ']') {
          if (input[pos] === '"' || input[pos] === "'") {
            value += readString(input[pos]);
          } else {
            value += advance();
          }
        }
        if (pos < input.length) {
          value += advance(); // ]
        }
        tokens.push(makeToken(TokenType.ATTRIBUTE_SELECTOR, value, start));
        continue;
      }
    }

    // Array brackets [ and ]
    if (char === '[') {
      advance();
      tokens.push(makeToken(TokenType.LBRACKET, '[', start));
      continue;
    }
    if (char === ']') {
      advance();
      tokens.push(makeToken(TokenType.RBRACKET, ']', start));
      continue;
    }

    // Numbers (including time expressions like 2s, 500ms)
    if (/\d/.test(char)) {
      const num = readWhile(c => /[\d.]/.test(c));
      const unitStart = pos;
      const unit = readWhile(c => /[a-zA-Z]/.test(c));

      if (TIME_UNITS.has(unit)) {
        tokens.push(makeToken(TokenType.TIME_EXPRESSION, num + unit, start));
      } else if (CSS_UNITS.has(unit) || (!unit && input[pos] === '%')) {
        // A CSS length is one string upstream (`100px` is "100px"), so its `%`
        // is no operator: `50% x` is a length and a word, not `50 % x`.
        if (!unit) advance();
        tokens.push(makeToken(TokenType.STRING, `"${num}${unit || '%'}"`, start));
      } else {
        // Put back the unit if it's not a time unit
        pos = unitStart;
        tokens.push(makeToken(TokenType.NUMBER, num, start));
      }
      continue;
    }

    // Punctuation
    if (char === '(') {
      advance();
      tokens.push(makeToken(TokenType.LPAREN, '(', start));
      continue;
    }
    if (char === ')') {
      advance();
      tokens.push(makeToken(TokenType.RPAREN, ')', start));
      continue;
    }
    if (char === '{') {
      advance();
      tokens.push(makeToken(TokenType.LBRACE, '{', start));
      continue;
    }
    if (char === '}') {
      advance();
      tokens.push(makeToken(TokenType.RBRACE, '}', start));
      continue;
    }
    if (char === ',') {
      advance();
      tokens.push(makeToken(TokenType.COMMA, ',', start));
      continue;
    }
    if (char === ':') {
      advance();
      tokens.push(makeToken(TokenType.COLON, ':', start));
      continue;
    }
    if (char === '.') {
      advance();
      tokens.push(makeToken(TokenType.DOT, '.', start));
      continue;
    }
    if (char === '|') {
      advance();
      tokens.push(makeToken(TokenType.PIPE, '|', start));
      continue;
    }

    // Operators
    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '%') {
      advance();
      tokens.push(makeToken(TokenType.OPERATOR, char, start));
      continue;
    }

    // Comparison operators
    if (char === '=' || char === '!' || char === '<' || char === '>') {
      let op = advance();
      if (peek() === '=') {
        op += advance();
      }
      // Strict equality: `===` and `!==` are one operator.
      if ((op === '==' || op === '!=') && peek() === '=') {
        op += advance();
      }
      tokens.push(makeToken(TokenType.COMPARISON, op, start));
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(char)) {
      const word = readWhile(c => /[\w$]/.test(c));
      const lower = word.toLowerCase();

      if (CONTEXT_VARS.has(lower)) {
        tokens.push(makeToken(TokenType.CONTEXT_VAR, word, start));
      } else if (LOGICAL_OPERATORS.has(lower)) {
        tokens.push(makeToken(TokenType.LOGICAL, word, start));
      } else if (BOOLEAN_LITERALS.has(lower)) {
        tokens.push(makeToken(TokenType.BOOLEAN, word, start));
      } else {
        tokens.push(makeToken(TokenType.IDENTIFIER, word, start));
      }
      continue;
    }

    // Unknown character - skip it
    advance();
  }

  tokens.push(makeToken(TokenType.EOF, '', pos));
  return tokens;
}
