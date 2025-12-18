/**
 * Hyperscript Tokenizer
 * Performs lexical analysis and token classification based on hyperscript-lsp database
 */

import type { Token } from '../types/core';
import {
  COMMANDS,
  CONTEXT_VARS,
  LOGICAL_OPERATORS,
  COMPARISON_OPERATORS,
  DOM_EVENTS,
  TOKENIZER_KEYWORDS,
} from './parser-constants';

// Re-export Token for use in other parser files
export type { Token } from '../types/core';

// ============================================================================
// PHASE 5: Simplified TokenKind Enum (10 values vs 24 TokenType values)
// ============================================================================
// TokenKind represents lexical categories - what the token IS structurally.
// TokenType represents semantic categories - what the token MEANS in hyperscript.
// The parser uses predicates (token-predicates.ts) for semantic classification.

/**
 * Simplified lexical token categories.
 *
 * This enum represents pure lexical categories without semantic classification.
 * The tokenizer can output both TokenKind (lexical) and TokenType (semantic)
 * during the migration period.
 *
 * @example
 * // 'toggle' has:
 * //   kind: TokenKind.IDENTIFIER (it's a word-like token)
 * //   type: TokenType.COMMAND (it's semantically a command)
 */
export enum TokenKind {
  /** Any word-like token (commands, keywords, events, identifiers, context vars) */
  IDENTIFIER = 'identifier',
  /** Quoted strings (single, double, or backtick) */
  STRING = 'string',
  /** Numeric literals (integers, floats) */
  NUMBER = 'number',
  /** CSS selectors (#id, .class, <query/>) */
  SELECTOR = 'selector',
  /** All operators (+, -, *, /, ==, 's, etc.) */
  OPERATOR = 'operator',
  /** Time expressions (5s, 100ms, 2h) */
  TIME = 'time',
  /** Template literals with interpolation */
  TEMPLATE = 'template',
  /** Comments (-- or //) */
  COMMENT = 'comment',
  /** Attribute symbols (@attr) */
  SYMBOL = 'symbol',
  /** Unrecognized tokens */
  UNKNOWN = 'unknown',
}

/**
 * Map TokenType to TokenKind for dual-output mode.
 * This enables gradual migration from semantic to lexical classification.
 */
export function getTokenKind(tokenType: TokenType): TokenKind {
  switch (tokenType) {
    // All word-like tokens map to IDENTIFIER
    case TokenType.KEYWORD:
    case TokenType.COMMAND:
    case TokenType.EXPRESSION:
    case TokenType.CONTEXT_VAR:
    case TokenType.GLOBAL_VAR:
    case TokenType.EVENT:
    case TokenType.IDENTIFIER:
      return TokenKind.IDENTIFIER;

    // Literals
    case TokenType.STRING:
      return TokenKind.STRING;
    case TokenType.NUMBER:
      return TokenKind.NUMBER;
    case TokenType.BOOLEAN:
      return TokenKind.IDENTIFIER; // Booleans are lexically identifiers with value 'true', 'false', etc.
    case TokenType.TEMPLATE_LITERAL:
      return TokenKind.TEMPLATE;

    // Selectors
    case TokenType.CSS_SELECTOR:
    case TokenType.ID_SELECTOR:
    case TokenType.CLASS_SELECTOR:
    case TokenType.QUERY_REFERENCE:
      return TokenKind.SELECTOR;

    // Operators
    case TokenType.OPERATOR:
    case TokenType.LOGICAL_OPERATOR:
    case TokenType.COMPARISON_OPERATOR:
      return TokenKind.OPERATOR;

    // Special types
    case TokenType.TIME_EXPRESSION:
      return TokenKind.TIME;
    case TokenType.COMMENT:
      return TokenKind.COMMENT;
    case TokenType.SYMBOL:
      return TokenKind.SYMBOL;

    // Objects and arrays are complex - treat as unknown for now
    case TokenType.OBJECT_LITERAL:
    case TokenType.ARRAY_LITERAL:
    case TokenType.UNKNOWN:
    default:
      return TokenKind.UNKNOWN;
  }
}

// ============================================================================
// LEGACY: TokenType Enum (24 values) - Will be deprecated after migration
// ============================================================================

// Token types based on hyperscript language elements
// Note: Reduced from 28 to 24 values by removing unused types (FEATURE, PROPERTY_ACCESS, WHITESPACE, NEWLINE)
export enum TokenType {
  // Language elements
  KEYWORD = 'keyword',
  COMMAND = 'command',
  EXPRESSION = 'expression',

  // Literals
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  TEMPLATE_LITERAL = 'template_literal',

  // Selectors and references
  CSS_SELECTOR = 'css_selector',
  ID_SELECTOR = 'id_selector',
  CLASS_SELECTOR = 'class_selector',
  QUERY_REFERENCE = 'query_reference',

  // Context variables
  CONTEXT_VAR = 'context_var',
  GLOBAL_VAR = 'global_var',

  // Events
  EVENT = 'event',

  // Operators
  OPERATOR = 'operator',
  LOGICAL_OPERATOR = 'logical_operator',
  COMPARISON_OPERATOR = 'comparison_operator',

  // Special constructs
  TIME_EXPRESSION = 'time_expression',
  OBJECT_LITERAL = 'object_literal',
  ARRAY_LITERAL = 'array_literal',
  SYMBOL = 'symbol',

  // Structural
  COMMENT = 'comment',

  // Unknown
  IDENTIFIER = 'identifier',
  UNKNOWN = 'unknown',
}

// Sets are imported from parser-constants.ts (single source of truth)
// Local aliases for tokenizer-specific sets
const KEYWORDS = TOKENIZER_KEYWORDS;
const MATHEMATICAL_OPERATORS = new Set(['+', '-', '*', '/', 'mod']);
const TIME_UNITS = new Set(['ms', 's', 'seconds', 'minutes', 'hours', 'days']);

// ============================================================================
// FEATURE FLAGS - For gradual migration to predicate-based classification
// ============================================================================

/**
 * When enabled, the tokenizer returns IDENTIFIER for all word-like tokens
 * instead of classifying them as COMMAND, KEYWORD, EVENT, CONTEXT_VAR, etc.
 *
 * This defers semantic classification to the parser, which uses predicate
 * functions from token-predicates.ts for context-aware classification.
 *
 * Benefits:
 * - Cleaner separation between lexical and semantic analysis
 * - Parser can make context-dependent classification decisions
 * - Enables migration to simplified TokenKind enum
 *
 * @see token-predicates.ts for predicate functions
 */
let DEFER_IDENTIFIER_CLASSIFICATION = false;

/**
 * Enable deferred identifier classification (for testing/migration)
 */
export function enableDeferredClassification(): void {
  DEFER_IDENTIFIER_CLASSIFICATION = true;
}

/**
 * Disable deferred identifier classification (default behavior)
 */
export function disableDeferredClassification(): void {
  DEFER_IDENTIFIER_CLASSIFICATION = false;
}

/**
 * Check if deferred classification is enabled
 */
export function isDeferredClassificationEnabled(): boolean {
  return DEFER_IDENTIFIER_CLASSIFICATION;
}

// ============================================================================
// PHASE 5: Dual Output Mode (TokenType + TokenKind)
// ============================================================================

/**
 * When enabled, tokens include both `type` (TokenType) and `kind` (TokenKind).
 * This allows gradual migration to TokenKind-based predicates.
 *
 * When disabled (default), tokens only include `type` for backward compatibility.
 */
let EMIT_TOKEN_KIND = false;

/**
 * Enable dual output mode (emit both type and kind)
 */
export function enableDualOutput(): void {
  EMIT_TOKEN_KIND = true;
}

/**
 * Disable dual output mode (default behavior)
 */
export function disableDualOutput(): void {
  EMIT_TOKEN_KIND = false;
}

/**
 * Check if dual output mode is enabled
 */
export function isDualOutputEnabled(): boolean {
  return EMIT_TOKEN_KIND;
}

export interface Tokenizer {
  input: string;
  position: number;
  line: number;
  column: number;
  tokens: Token[];
}

export function createTokenizer(): Tokenizer {
  return {
    input: '',
    position: 0,
    line: 1,
    column: 1,
    tokens: [],
  };
}

export function tokenize(input: string): Token[] {
  const tokenizer = createTokenizer();
  tokenizer.input = input;

  const inputLength = input.length; // Cache length for performance

  while (tokenizer.position < inputLength) {
    skipWhitespace(tokenizer);

    if (tokenizer.position >= inputLength) break;

    const char = input[tokenizer.position];

    // Handle comments
    if (char === '-' && peek(tokenizer, 1) === '-') {
      tokenizeComment(tokenizer);
      continue;
    }

    // Handle strings, but check for possessive syntax first
    if (char === '"') {
      tokenizeString(tokenizer);
      continue;
    }

    if (char === "'" || char === "'") {
      // Check if this is possessive syntax (apostrophe followed by 's')
      const nextChar = peek(tokenizer, 1);
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      // Phase 8: Use TokenKind for possessive detection instead of TokenType
      const isPossessive =
        nextChar === 's' &&
        prevToken &&
        (prevToken.kind === TokenKind.IDENTIFIER ||
          prevToken.kind === TokenKind.SELECTOR ||
          // Support possessive after array/object literals and parenthesized expressions
          prevToken.value === ']' ||
          prevToken.value === ')' ||
          prevToken.value === '}');

      if (isPossessive) {
        // Directly create the "'s" token without compound operator interference
        const start = tokenizer.position;
        advance(tokenizer); // consume apostrophe
        advance(tokenizer); // consume 's'
        addToken(tokenizer, TokenType.OPERATOR, "'s", start);
      } else {
        // Tokenize as string
        tokenizeString(tokenizer);
      }
      continue;
    }

    // Handle template literals (backticks)
    if (char === '`') {
      tokenizeTemplateLiteral(tokenizer);
      continue;
    }

    // Handle query reference syntax (<selector/>) vs comparison operators
    if (char === '<') {
      // Look ahead to see if this is actually a query reference (ends with />)
      // vs a comparison operator like "< 10"
      if (looksLikeQueryReference(tokenizer)) {
        tokenizeQueryReference(tokenizer);
      } else {
        // Treat as comparison operator
        tokenizeOperator(tokenizer);
      }
      continue;
    }

    // Handle CSS selectors (but only when not preceded by an identifier/expression)
    if (char === '#') {
      tokenizeCSSSelector(tokenizer);
      continue;
    }

    if (char === '.') {
      // Check if this is the range operator (..)
      const nextChar = peek(tokenizer, 1);
      if (nextChar === '.') {
        // Tokenize as range operator
        const start = tokenizer.position;
        advance(tokenizer); // consume first '.'
        advance(tokenizer); // consume second '.'
        addToken(tokenizer, TokenType.OPERATOR, '..', start);
        continue;
      }

      // Check if this is a CSS selector or a member access operator
      // It's a CSS selector if it's at the start or follows whitespace/operators
      // Phase 8: Use TokenKind for CSS selector context detection
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
      // Keywords that can precede CSS selectors (not member access)
      const SELECTOR_CONTEXT_KEYWORDS = new Set(['from', 'to', 'into', 'on', 'in', 'at']);
      // Commands like add, remove, toggle can be followed by class selectors
      const isCommandContext = prevToken &&
        prevToken.kind === TokenKind.IDENTIFIER &&
        COMMANDS.has(prevToken.value.toLowerCase());
      // Keywords like 'from' can also be followed by class selectors
      const isKeywordContext = prevToken &&
        prevToken.kind === TokenKind.IDENTIFIER &&
        SELECTOR_CONTEXT_KEYWORDS.has(prevToken.value.toLowerCase());
      const isCSSSelectorContext =
        !prevToken ||
        (prevToken.kind === TokenKind.OPERATOR &&
          // Exclude closing parens and brackets which indicate method calls or array access
          prevToken.value !== ')' &&
          prevToken.value !== ']') ||
        isCommandContext || // Commands like add, remove, toggle allow class selectors
        isKeywordContext || // Keywords like from, to allow class selectors
        prevToken.value === '(' ||
        prevToken.value === '[' ||
        prevToken.value === '{' ||
        prevToken.value === ',' ||
        prevToken.value === ';';

      if (isCSSSelectorContext && isAlpha(peek(tokenizer))) {
        tokenizeCSSSelector(tokenizer);
        continue;
      }
      // Otherwise, fall through to operator handling
    }

    // Handle symbols
    if (char === '@') {
      tokenizeSymbol(tokenizer);
      continue;
    }

    // Handle object literals - emit individual tokens for proper parsing
    if (char === '{') {
      addToken(tokenizer, TokenType.OPERATOR, '{');
      advance(tokenizer);
      continue;
    }

    // Handle closing brace for objects
    if (char === '}') {
      addToken(tokenizer, TokenType.OPERATOR, '}');
      advance(tokenizer);
      continue;
    }

    if (char === '[') {
      // Determine if this is array literal, member access, or event condition
      const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];

      // Check for event handler condition syntax
      const isEventCondition =
        prevToken &&
        (prevToken.kind === TokenType.EVENT ||
          (prevToken.kind === TokenType.IDENTIFIER && DOM_EVENTS.has(prevToken.value))) &&
        tokenizer.tokens.length >= 2 &&
        tokenizer.tokens[tokenizer.tokens.length - 2]?.value === 'on';

      const isMemberAccess =
        prevToken &&
        (prevToken.kind === TokenType.IDENTIFIER ||
          prevToken.kind === TokenType.CONTEXT_VAR ||
          prevToken.value === ')' ||
          prevToken.value === ']') &&
        !isEventCondition; // Don't treat as member access if it's an event condition

      if (isMemberAccess) {
        // Treat as member access operator
        addToken(tokenizer, TokenType.OPERATOR, '[');
        advance(tokenizer);
      } else {
        // Treat as array literal or event condition bracket
        if (isEventCondition) {
          // For event conditions, just add the bracket as a simple token
          addToken(tokenizer, TokenType.SYMBOL, '[');
          advance(tokenizer);
        } else {
          // For array literals, tokenize individual brackets instead of whole array
          // This allows the parser to handle array structure properly
          addToken(tokenizer, TokenType.OPERATOR, '[');
          advance(tokenizer);
        }
      }
      continue;
    }

    // Handle closing bracket for arrays
    if (char === ']') {
      addToken(tokenizer, TokenType.OPERATOR, ']');
      advance(tokenizer);
      continue;
    }

    // Handle global variables ($identifier)
    if (char === '$') {
      const nextChar = peek(tokenizer, 1);
      // Check if followed by an identifier character
      if (
        (nextChar >= 'a' && nextChar <= 'z') ||
        (nextChar >= 'A' && nextChar <= 'Z') ||
        nextChar === '_'
      ) {
        tokenizeGlobalVariable(tokenizer);
        continue;
      }
      // Otherwise fall through to operator handling
    }

    // Handle operators
    if (isOperatorChar(char)) {
      tokenizeOperator(tokenizer);
      continue;
    }

    // Handle numbers and time expressions - optimized path
    if (char >= '0' && char <= '9') {
      // Faster than isDigit
      tokenizeNumberOrTime(tokenizer);
      continue;
    }

    // Handle identifiers, keywords, commands, etc. - optimized path
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_') {
      tokenizeIdentifier(tokenizer);
      continue;
    }

    // Unknown character - consume it
    addToken(tokenizer, TokenType.UNKNOWN, char);
    advance(tokenizer);
  }

  //   tokenCount: tokenizer.tokens.length,
  //   tokens: tokenizer.tokens.map(t => ({ type: t.type, value: t.value }))
  // });

  return tokenizer.tokens;
}

function peek(tokenizer: Tokenizer, offset: number = 1): string {
  const pos = tokenizer.position + offset;
  return pos < tokenizer.input.length ? tokenizer.input[pos] : '';
}

function advance(tokenizer: Tokenizer): string {
  const char = tokenizer.input[tokenizer.position];
  tokenizer.position++;

  if (char === '\n') {
    tokenizer.line++;
    tokenizer.column = 1;
  } else if (char === '\r') {
    // Handle \r\n and standalone \r
    const nextChar =
      tokenizer.position < tokenizer.input.length ? tokenizer.input[tokenizer.position] : '';
    if (nextChar === '\n') {
      // \r\n - advance past the \n as well
      tokenizer.position++;
    }
    tokenizer.line++;
    tokenizer.column = 1;
  } else {
    tokenizer.column++;
  }

  return char;
}

function skipWhitespace(tokenizer: Tokenizer): void {
  const input = tokenizer.input;
  const inputLength = input.length;

  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    // Optimized whitespace check - most common first
    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      advance(tokenizer);
    } else {
      break;
    }
  }
}

function addToken(
  tokenizer: Tokenizer,
  type: TokenType,
  value: string,
  start?: number,
  end?: number
): void {
  const tokenStart = start ?? tokenizer.position - value.length;
  const tokenEnd = end ?? tokenizer.position;

  // Calculate the column at the start of the token
  let tokenColumn = tokenizer.column - value.length;
  if (start !== undefined) {
    // If start is explicitly provided, calculate column based on line breaks
    tokenColumn = 1;
    let lastNewlinePos = -1;
    for (let i = 0; i < start; i++) {
      if (tokenizer.input[i] === '\n' || tokenizer.input[i] === '\r') {
        lastNewlinePos = i;
      }
    }
    tokenColumn = start - lastNewlinePos;
  }

  // Phase 8: TokenKind-only output - semantic classification moved to predicates
  const token: import('../types/core').Token = {
    kind: getTokenKind(type),
    value,
    start: tokenStart,
    end: tokenEnd,
    line: getLineAtPosition(tokenizer, tokenStart),
    column: tokenColumn,
  };

  tokenizer.tokens.push(token);
}

function getLineAtPosition(tokenizer: Tokenizer, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < tokenizer.input.length; i++) {
    const char = tokenizer.input[i];
    if (char === '\n') {
      line++;
    } else if (char === '\r') {
      line++;
      // Skip \n if it's part of \r\n
      if (i + 1 < tokenizer.input.length && tokenizer.input[i + 1] === '\n') {
        i++;
      }
    }
  }
  return line;
}

function tokenizeComment(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';

  // Skip '--'
  advance(tokenizer);
  advance(tokenizer);

  // Read until end of line
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (char === '\n') break;
    value += advance(tokenizer);
  }

  addToken(tokenizer, TokenType.COMMENT, '--' + value, start);
}

function tokenizeString(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const quote = advance(tokenizer); // consume opening quote
  let value = quote;

  while (tokenizer.position < tokenizer.input.length) {
    const char = advance(tokenizer);
    value += char;

    if (char === quote) break; // closing quote
    if (char === '\\') {
      // Handle escape sequences
      if (tokenizer.position < tokenizer.input.length) {
        value += advance(tokenizer);
      }
    }
  }

  addToken(tokenizer, TokenType.STRING, value, start);
}

function tokenizeTemplateLiteral(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  advance(tokenizer); // consume opening backtick
  let value = '';

  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];

    if (char === '`') {
      advance(tokenizer); // consume closing backtick
      break;
    }

    if (char === '\\') {
      // Handle escape sequences
      advance(tokenizer); // consume backslash
      if (tokenizer.position < tokenizer.input.length) {
        const escaped = advance(tokenizer);
        // Handle common escape sequences
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '`':
            value += '`';
            break;
          default:
            value += escaped;
        }
      }
    } else {
      value += advance(tokenizer);
    }
  }

  // Check if we reached EOF without closing backtick
  if (tokenizer.position >= tokenizer.input.length && !tokenizer.input.endsWith('`')) {
    throw new Error(
      `Unterminated template literal at line ${tokenizer.line}, column ${tokenizer.column - value.length}`
    );
  }

  addToken(tokenizer, TokenType.TEMPLATE_LITERAL, value, start);
}

function tokenizeCSSSelector(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const prefix = advance(tokenizer); // # or .
  let value = prefix;

  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (isAlphaNumeric(char) || char === '-' || char === '_' || char === ':') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }

  const type = prefix === '#' ? TokenType.ID_SELECTOR : TokenType.CLASS_SELECTOR;
  addToken(tokenizer, type, value, start);
}

function tokenizeQueryReference(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';

  // Consume opening '<'
  value += advance(tokenizer);

  // Read until closing '/>'
  while (tokenizer.position < tokenizer.input.length - 1) {
    const char = tokenizer.input[tokenizer.position];
    const nextChar = tokenizer.input[tokenizer.position + 1];

    value += advance(tokenizer);

    // Check for closing '/>'
    if (char === '/' && nextChar === '>') {
      value += advance(tokenizer); // consume '>'
      break;
    }
  }

  addToken(tokenizer, TokenType.QUERY_REFERENCE, value, start);
}

function tokenizeSymbol(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = advance(tokenizer); // consume @

  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (isAlphaNumeric(char) || char === '_' || char === '-') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }

  addToken(tokenizer, TokenType.SYMBOL, value, start);
}

function tokenizeOperator(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  let value = '';

  // Handle possessive operator first ('s)
  const char = tokenizer.input[tokenizer.position];
  if ((char === "'" || char === "'") && peek(tokenizer, 1) === 's') {
    value = "'s";
    advance(tokenizer); // consume apostrophe
    advance(tokenizer); // consume 's'
    addToken(tokenizer, TokenType.OPERATOR, value, start);
    return;
  }

  // Handle multi-character operators
  const twoChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 2);
  const threeChar = tokenizer.input.substring(tokenizer.position, tokenizer.position + 3);

  if (['===', '!=='].includes(threeChar)) {
    value = threeChar;
    advance(tokenizer);
    advance(tokenizer);
    advance(tokenizer);
  } else if (
    ['==', '!=', '<=', '>=', '&&', '||', '**', '~=', '|=', '^=', '$=', '*=', '?.'].includes(twoChar)
  ) {
    value = twoChar;
    advance(tokenizer);
    advance(tokenizer);
  } else {
    value = advance(tokenizer);
  }

  // Determine the correct token type
  let type = TokenType.OPERATOR;
  if (COMPARISON_OPERATORS.has(value)) {
    type = TokenType.COMPARISON_OPERATOR;
  } else if (['&&', '||'].includes(value)) {
    type = TokenType.LOGICAL_OPERATOR;
  } else if (MATHEMATICAL_OPERATORS.has(value)) {
    type = TokenType.OPERATOR;
  }

  addToken(tokenizer, type, value, start);
}

function tokenizeNumberOrTime(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const input = tokenizer.input;
  const inputLength = input.length;
  let value = '';

  // Read digits - optimized
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    if (char >= '0' && char <= '9') {
      value += advance(tokenizer);
    } else {
      break;
    }
  }

  // Handle decimal (but not range operator ..)
  if (
    tokenizer.position < inputLength &&
    input[tokenizer.position] === '.' &&
    // Don't consume '.' if it's part of the range operator '..'
    !(
      tokenizer.position + 1 < inputLength &&
      input[tokenizer.position + 1] === '.'
    )
  ) {
    value += advance(tokenizer);
    while (tokenizer.position < inputLength) {
      const char = input[tokenizer.position];
      if (char >= '0' && char <= '9') {
        value += advance(tokenizer);
      } else {
        break;
      }
    }
  }

  // Handle scientific notation (e.g., 1e10, 2.5E-3)
  if (tokenizer.position < inputLength) {
    const expChar = input[tokenizer.position];
    if (expChar === 'e' || expChar === 'E') {
      const nextChar = tokenizer.position + 1 < inputLength ? input[tokenizer.position + 1] : '';
      const afterSign = tokenizer.position + 2 < inputLength ? input[tokenizer.position + 2] : '';

      // Check if this is actually an exponent (followed by optional +/- and digits)
      const hasDigitAfterE = nextChar >= '0' && nextChar <= '9';
      const hasSignThenDigit = (nextChar === '+' || nextChar === '-') && (afterSign >= '0' && afterSign <= '9');

      if (hasDigitAfterE || hasSignThenDigit) {
        value += advance(tokenizer); // consume 'e' or 'E'

        // Consume optional sign
        if (input[tokenizer.position] === '+' || input[tokenizer.position] === '-') {
          value += advance(tokenizer);
        }

        // Consume exponent digits
        while (tokenizer.position < inputLength) {
          const char = input[tokenizer.position];
          if (char >= '0' && char <= '9') {
            value += advance(tokenizer);
          } else {
            break;
          }
        }
      }
    }
  }

  // Check for time unit - optimized
  const unitStart = tokenizer.position;
  let unit = '';
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
      unit += advance(tokenizer);
    } else {
      break;
    }
  }

  if (TIME_UNITS.has(unit)) {
    addToken(tokenizer, TokenType.TIME_EXPRESSION, value + unit, start);
  } else {
    // Reset position if not a time unit
    tokenizer.position = unitStart;
    addToken(tokenizer, TokenType.NUMBER, value, start);
  }
}

function tokenizeIdentifier(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const input = tokenizer.input;
  const inputLength = input.length;
  let value = '';

  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    // Optimized character checking - avoid function calls
    // Include ':' to support namespaced event names like "draggable:start"
    if (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_' ||
      char === '-'
    ) {
      value += advance(tokenizer);
    } else {
      break;
    }
  }

  // Check for multi-word operators starting with this identifier
  const compound = tryTokenizeCompoundOperator(tokenizer, value, start);
  if (compound) {
    return; // Compound operator was handled
  }

  // Classify the identifier
  const type = classifyIdentifier(value);
  addToken(tokenizer, type, value, start);
}

function tokenizeGlobalVariable(tokenizer: Tokenizer): void {
  const start = tokenizer.position;
  const input = tokenizer.input;
  const inputLength = input.length;

  // Consume the '$' prefix
  advance(tokenizer);

  let value = '$';

  // Read the identifier part
  while (tokenizer.position < inputLength) {
    const char = input[tokenizer.position];
    if (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_'
    ) {
      value += advance(tokenizer);
    } else {
      break;
    }
  }

  addToken(tokenizer, TokenType.GLOBAL_VAR, value, start);
}

function tryTokenizeCompoundOperator(
  tokenizer: Tokenizer,
  firstWord: string,
  start: number
): boolean {
  const lowerFirst = firstWord.toLowerCase();
  const originalPosition = tokenizer.position;

  // Never treat 's as part of a compound operator - it's possessive syntax
  if (firstWord === "'s" || firstWord === "'s") {
    return false;
  }

  // Don't create compound operators that would interfere with possessive syntax
  // Check if we just tokenized something that could be followed by 's (possessive)
  const prevToken = tokenizer.tokens[tokenizer.tokens.length - 1];
  if (
    prevToken &&
    (prevToken.kind === 'identifier' ||
      prevToken.kind === 'id_selector' ||
      prevToken.kind === 'class_selector' ||
      prevToken.kind === 'context_var')
  ) {
    const nextChar =
      tokenizer.position < tokenizer.input.length ? tokenizer.input[tokenizer.position] : '';
    if (nextChar === "'" || nextChar === "'") {
      // This might be possessive syntax, don't create compound operators
      return false;
    }
  }

  // Skip whitespace to find next word
  skipWhitespace(tokenizer);

  // Peek at the next identifier
  let nextWord = '';
  while (tokenizer.position < tokenizer.input.length) {
    const char = tokenizer.input[tokenizer.position];
    if (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_' ||
      char === '-'
    ) {
      nextWord += advance(tokenizer);
    } else {
      break;
    }
  }

  if (nextWord) {
    const lowerNext = nextWord.toLowerCase();
    const compound = `${lowerFirst} ${lowerNext}`;

    // Check for compound prepositions (e.g., "at start of", "at the start of")
    const compoundPrep = tryBuildCompoundPreposition(tokenizer, lowerFirst, lowerNext, start);
    if (compoundPrep) {
      return true; // Compound preposition was handled
    }

    // Try to build longest possible compound operator
    const longestCompound = tryBuildLongestCompound(tokenizer, lowerFirst, lowerNext);
    if (longestCompound) {
      addToken(tokenizer, TokenType.COMPARISON_OPERATOR, longestCompound, start);
      return true;
    }

    // Check two-word operators
    if (COMPARISON_OPERATORS.has(compound)) {
      addToken(tokenizer, TokenType.COMPARISON_OPERATOR, compound, start);
      return true;
    }
  }

  // Check single-word operators
  if (COMPARISON_OPERATORS.has(lowerFirst)) {
    tokenizer.position = originalPosition; // Reset position
    addToken(tokenizer, TokenType.COMPARISON_OPERATOR, firstWord, start);
    return true;
  }

  // No compound operator found, reset position
  tokenizer.position = originalPosition;
  return false;
}

function tryBuildCompoundPreposition(
  tokenizer: Tokenizer,
  firstWord: string,
  secondWord: string,
  start: number
): boolean {
  const lowerFirst = firstWord.toLowerCase();
  const lowerSecond = secondWord.toLowerCase();

  // Handle "at start of", "at end of", "at the start of", "at the end of"
  if (lowerFirst === 'at') {
    // Save position before trying to read more words
    const afterSecondWord = tokenizer.position;

    // Check for "at the start/end of" pattern
    if (lowerSecond === 'the') {
      skipWhitespace(tokenizer);
      let thirdWord = '';
      while (tokenizer.position < tokenizer.input.length) {
        const char = tokenizer.input[tokenizer.position];
        if (
          (char >= 'a' && char <= 'z') ||
          (char >= 'A' && char <= 'Z') ||
          (char >= '0' && char <= '9') ||
          char === '_' ||
          char === '-'
        ) {
          thirdWord += advance(tokenizer);
        } else {
          break;
        }
      }

      const lowerThird = thirdWord.toLowerCase();
      if (lowerThird === 'start' || lowerThird === 'end') {
        // Now look for "of"
        skipWhitespace(tokenizer);
        let fourthWord = '';
        while (tokenizer.position < tokenizer.input.length) {
          const char = tokenizer.input[tokenizer.position];
          if (
            (char >= 'a' && char <= 'z') ||
            (char >= 'A' && char <= 'Z') ||
            (char >= '0' && char <= '9') ||
            char === '_' ||
            char === '-'
          ) {
            fourthWord += advance(tokenizer);
          } else {
            break;
          }
        }

        const lowerFourth = fourthWord.toLowerCase();
        if (lowerFourth === 'of') {
          const compound = `at the ${lowerThird} of`;
          addToken(tokenizer, TokenType.KEYWORD, compound, start);
          return true;
        }
      }
      // Didn't match pattern, reset
      tokenizer.position = afterSecondWord;
      return false;
    }

    // Check for "at start of" or "at end of" (without "the")
    if (lowerSecond === 'start' || lowerSecond === 'end') {
      skipWhitespace(tokenizer);
      let thirdWord = '';
      while (tokenizer.position < tokenizer.input.length) {
        const char = tokenizer.input[tokenizer.position];
        if (
          (char >= 'a' && char <= 'z') ||
          (char >= 'A' && char <= 'Z') ||
          (char >= '0' && char <= '9') ||
          char === '_' ||
          char === '-'
        ) {
          thirdWord += advance(tokenizer);
        } else {
          break;
        }
      }

      const lowerThird = thirdWord.toLowerCase();
      if (lowerThird === 'of') {
        const compound = `at ${lowerSecond} of`;
        addToken(tokenizer, TokenType.KEYWORD, compound, start);
        return true;
      }
      // Didn't match pattern, reset
      tokenizer.position = afterSecondWord;
      return false;
    }
  }

  return false;
}

function classifyIdentifier(value: string): TokenType {
  const lowerValue = value.toLowerCase();

  // ============================================================================
  // DEFERRED CLASSIFICATION MODE
  // When enabled, return IDENTIFIER for semantic tokens (commands, keywords, etc.)
  // Parser uses token-predicates.ts for context-aware classification instead.
  //
  // We still classify:
  // - BOOLEAN literals (true, false, null, undefined) - literal values
  // - LOGICAL_OPERATOR (and, or, not) - needed for expression precedence
  // - COMPARISON_OPERATOR - needed for expression parsing
  // - OPERATOR - structural operators
  // ============================================================================
  if (DEFER_IDENTIFIER_CLASSIFICATION) {
    // Operators still need classification for expression parsing
    if (lowerValue === 'include' || lowerValue === 'includes') {
      return TokenType.COMPARISON_OPERATOR;
    }
    if (LOGICAL_OPERATORS.has(lowerValue)) {
      return TokenType.LOGICAL_OPERATOR;
    }
    if (MATHEMATICAL_OPERATORS.has(value) || MATHEMATICAL_OPERATORS.has(lowerValue)) {
      return TokenType.OPERATOR;
    }
    if (COMPARISON_OPERATORS.has(lowerValue)) {
      return TokenType.COMPARISON_OPERATOR;
    }
    // Boolean literals are values, not identifiers
    if (['true', 'false', 'null', 'undefined'].includes(lowerValue)) {
      return TokenType.BOOLEAN;
    }
    // Everything else becomes IDENTIFIER - parser will classify semantically
    return TokenType.IDENTIFIER;
  }

  // ============================================================================
  // LEGACY CLASSIFICATION MODE (default)
  // Full semantic classification at tokenization time
  // ============================================================================

  // Special case for include/includes to ensure they're treated as comparison operators
  if (lowerValue === 'include' || lowerValue === 'includes') {
    return TokenType.COMPARISON_OPERATOR;
  }

  // Check more specific types first
  if (LOGICAL_OPERATORS.has(lowerValue)) {
    return TokenType.LOGICAL_OPERATOR;
  }

  if (MATHEMATICAL_OPERATORS.has(value) || MATHEMATICAL_OPERATORS.has(lowerValue)) {
    return TokenType.OPERATOR;
  }

  if (COMPARISON_OPERATORS.has(lowerValue)) {
    return TokenType.COMPARISON_OPERATOR;
  }

  // Special case: 'I' (uppercase only) is a _hyperscript alias for 'me'
  // We check the original value to avoid conflict with lowercase 'i' used in loops
  if (value === 'I') {
    return TokenType.CONTEXT_VAR;
  }

  if (CONTEXT_VARS.has(lowerValue)) {
    return TokenType.CONTEXT_VAR;
  }

  if (COMMANDS.has(lowerValue)) {
    return TokenType.COMMAND;
  }

  if (DOM_EVENTS.has(lowerValue)) {
    return TokenType.EVENT;
  }

  if (['true', 'false', 'null', 'undefined'].includes(lowerValue)) {
    return TokenType.BOOLEAN; // Using BOOLEAN for all literal values including null/undefined
  }

  if (KEYWORDS.has(lowerValue)) {
    return TokenType.KEYWORD;
  }

  return TokenType.IDENTIFIER;
}

// Helper functions
function isAlpha(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

function isAlphaNumeric(char: string): boolean {
  return /[a-zA-Z0-9]/.test(char);
}

function looksLikeQueryReference(tokenizer: Tokenizer): boolean {
  // Look ahead to see if this pattern matches <.../>
  // A query reference should contain valid selector characters and end with />
  let pos = tokenizer.position + 1; // Start after <
  let foundValidContent = false;

  while (pos < tokenizer.input.length) {
    const char = tokenizer.input[pos];

    // If we find />, this is likely a query reference
    if (char === '/' && pos + 1 < tokenizer.input.length && tokenizer.input[pos + 1] === '>') {
      return foundValidContent; // Only return true if we found some content between < and />
    }

    // If we find content that looks like selector syntax
    // Note: CSS attribute selectors use operators like *=, ^=, $=, ~=, |=
    if (
      isAlphaNumeric(char) ||
      char === '.' ||
      char === '#' ||
      char === '[' ||
      char === ']' ||
      char === ':' ||
      char === '-' ||
      char === '_' ||
      char === ' ' ||
      char === '=' ||
      char === '"' ||
      char === "'" ||
      char === '(' ||
      char === ')' ||
      char === '*' || // For [attr*="value"]
      char === '^' || // For [attr^="value"]
      char === '$' || // For [attr$="value"]
      char === '~' || // For [attr~="value"]
      char === '|' || // For [attr|="value"]
      char === '>' || // For child combinator
      char === '+' || // For adjacent sibling combinator
      char === ',' // For multiple selectors
    ) {
      foundValidContent = true;
      pos++;
    } else if (char === ' ' || char === '\t') {
      // Skip whitespace
      pos++;
    } else {
      // Found invalid character for query reference, probably comparison
      return false;
    }

    // If we've gone too far without finding />, it's probably not a query reference
    if (pos - tokenizer.position > 50) {
      return false;
    }
  }

  // Reached end without finding />, not a query reference
  return false;
}

/**
 * Try to build the longest possible compound operator starting with two given words
 * Returns the compound operator string if found, null otherwise
 */
function tryBuildLongestCompound(
  tokenizer: Tokenizer,
  firstWord: string,
  secondWord: string
): string | null {
  const originalPosition = tokenizer.position;
  let compound = `${firstWord} ${secondWord}`;
  let compoundEndPosition = tokenizer.position; // Track position of last valid compound
  const words = [firstWord, secondWord];

  // Keep adding words until we can't find any more or reach a reasonable limit
  const maxWords = 8; // Reasonable upper bound

  while (words.length < maxWords) {
    // Skip whitespace and try to read next word
    skipWhitespace(tokenizer);

    if (tokenizer.position >= tokenizer.input.length) {
      break;
    }

    let nextWord = '';

    while (tokenizer.position < tokenizer.input.length) {
      const char = tokenizer.input[tokenizer.position];
      // Only include alphabetic characters for compound operator words
      // Exclude numbers to avoid consuming the right operand
      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
        nextWord += advance(tokenizer);
      } else {
        break;
      }
    }

    if (!nextWord) {
      break;
    }

    // Add the word and check if this compound exists
    words.push(nextWord.toLowerCase());
    const newCompound = words.join(' ');

    // If this compound exists, update our candidate
    if (COMPARISON_OPERATORS.has(newCompound)) {
      compound = newCompound;
      compoundEndPosition = tokenizer.position; // Save position after this valid compound
      // Continue looking for longer compounds
    } else {
      // This compound doesn't exist, but maybe a longer one does
      // Continue checking in case we have patterns like "is greater than or equal to"
      // where "is greater than" exists but we want the longer form
    }
  }

  // Check if we found a valid compound
  if (COMPARISON_OPERATORS.has(compound) && compound !== `${firstWord} ${secondWord}`) {
    // Found a compound longer than 2 words - reset position to end of the compound
    tokenizer.position = compoundEndPosition;
    return compound;
  }

  // Reset position and return null
  tokenizer.position = originalPosition;
  return null;
}

function isOperatorChar(char: string): boolean {
  return "+-*/^%=!<>&|(){}[],.;:?''~$".includes(char);
}
