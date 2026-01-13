/**
 * Token Predicates (Phase 8: TokenKind-only)
 *
 * Provides predicate functions for token classification using TokenKind.
 * Semantic classification is done via value-based checks against keyword sets.
 *
 * This eliminates the need for TokenType - all tokens have lexical `kind` only.
 * The parser uses these predicates for context-aware semantic classification.
 */

import type { Token } from '../types/core';
import { TokenKind } from './tokenizer';
import {
  COMMANDS,
  CONTEXT_VARS,
  LOGICAL_OPERATORS,
  COMPARISON_OPERATORS,
  DOM_EVENTS,
  TOKENIZER_KEYWORDS,
} from './parser-constants';

// ============================================================================
// SEMANTIC PREDICATES - What the token MEANS in hyperscript context
// These check TokenKind + value for semantic classification
// ============================================================================

/**
 * Check if token is a hyperscript command (add, toggle, put, etc.)
 */
export function isCommand(token: Token): boolean {
  if (token.kind !== TokenKind.IDENTIFIER) return false;
  return COMMANDS.has(token.value.toLowerCase());
}

/**
 * Check if token is a hyperscript keyword (if, then, else, etc.)
 */
export function isKeyword(token: Token): boolean {
  if (token.kind !== TokenKind.IDENTIFIER) return false;
  return TOKENIZER_KEYWORDS.has(token.value.toLowerCase());
}

/**
 * Check if token is a DOM event name (click, mouseenter, etc.)
 */
export function isEvent(token: Token): boolean {
  if (token.kind !== TokenKind.IDENTIFIER) return false;
  return DOM_EVENTS.has(token.value.toLowerCase());
}

/**
 * Check if token is a context variable (me, it, you, result, etc.)
 */
export function isContextVar(token: Token): boolean {
  if (token.kind !== TokenKind.IDENTIFIER) return false;
  return CONTEXT_VARS.has(token.value.toLowerCase());
}

/**
 * Check if token is a logical operator (and, or, not, no)
 */
export function isLogicalOperator(token: Token): boolean {
  // Check operator kind first
  if (token.kind === TokenKind.OPERATOR) {
    return LOGICAL_OPERATORS.has(token.value.toLowerCase());
  }
  // Also check identifiers that may be logical operators
  if (token.kind === TokenKind.IDENTIFIER) {
    return LOGICAL_OPERATORS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a comparison operator (is, ==, contains, etc.)
 */
export function isComparisonOperator(token: Token): boolean {
  // Check operator kind first
  if (token.kind === TokenKind.OPERATOR) {
    return COMPARISON_OPERATORS.has(token.value.toLowerCase());
  }
  // Also check identifiers and value for keyword operators
  return COMPARISON_OPERATORS.has(token.value.toLowerCase());
}

// ============================================================================
// LEXICAL PREDICATES - What the token IS structurally (pure TokenKind checks)
// ============================================================================

/**
 * Check if token is identifier-like (any word token)
 * In TokenKind-only mode, this is simply checking for IDENTIFIER kind
 */
export function isIdentifierLike(token: Token): boolean {
  return token.kind === TokenKind.IDENTIFIER;
}

/**
 * Check if token is a CSS selector (#id, .class, or query reference <selector/>)
 */
export function isSelector(token: Token): boolean {
  return token.kind === TokenKind.SELECTOR;
}

/**
 * Check if token is a basic CSS selector (#id or .class) - NOT query references
 * Query references (<selector/>) should be matched separately with isQueryReference
 */
export function isBasicSelector(token: Token): boolean {
  if (token.kind !== TokenKind.SELECTOR) return false;
  // Exclude query references (they start with '<')
  return !token.value.startsWith('<');
}

/**
 * Check if token is a literal value (string, number, template)
 */
export function isLiteral(token: Token): boolean {
  return (
    token.kind === TokenKind.STRING ||
    token.kind === TokenKind.NUMBER ||
    token.kind === TokenKind.TEMPLATE
  );
}

/**
 * Check if token is any kind of operator
 */
export function isOperator(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR;
}

/**
 * Check if token is a reference (identifier that could be a variable)
 */
export function isReference(token: Token): boolean {
  return token.kind === TokenKind.IDENTIFIER;
}

/**
 * Check if token is a time expression (5s, 100ms, etc.)
 */
export function isTimeExpression(token: Token): boolean {
  return token.kind === TokenKind.TIME;
}

/**
 * Check if token is a symbol (@attribute)
 */
export function isSymbol(token: Token): boolean {
  return token.kind === TokenKind.SYMBOL;
}

/**
 * Check if token is a comment
 */
export function isComment(token: Token): boolean {
  return token.kind === TokenKind.COMMENT;
}

// ============================================================================
// SPECIFIC TYPE PREDICATES - For distinguishing within lexical categories
// These use value-based checks for semantic distinctions
// ============================================================================

/**
 * Check if token is specifically a plain identifier (not a command, keyword, etc.)
 */
export function isIdentifier(token: Token): boolean {
  if (token.kind !== TokenKind.IDENTIFIER) return false;
  // Not a command, keyword, event, or context var
  const lowerValue = token.value.toLowerCase();
  return (
    !COMMANDS.has(lowerValue) &&
    !TOKENIZER_KEYWORDS.has(lowerValue) &&
    !DOM_EVENTS.has(lowerValue) &&
    !CONTEXT_VARS.has(lowerValue)
  );
}

/**
 * Check if token is a string literal
 */
export function isString(token: Token): boolean {
  return token.kind === TokenKind.STRING;
}

/**
 * Check if token is a number literal
 */
export function isNumber(token: Token): boolean {
  return token.kind === TokenKind.NUMBER;
}

/**
 * Check if token is a boolean literal (true/false) or null/undefined
 */
export function isBoolean(token: Token): boolean {
  // Booleans (and null/undefined) are lexically identifiers with specific values
  if (token.kind === TokenKind.IDENTIFIER) {
    const v = token.value;
    return v === 'true' || v === 'false' || v === 'null' || v === 'undefined';
  }
  return false;
}

/**
 * Check if token is a template literal
 */
export function isTemplateLiteral(token: Token): boolean {
  return token.kind === TokenKind.TEMPLATE;
}

/**
 * Check if token is a query reference (<selector/>)
 */
export function isQueryReference(token: Token): boolean {
  // Query references are selectors that start with '<'
  return token.kind === TokenKind.SELECTOR && token.value.startsWith('<');
}

/**
 * Check if token is an ID selector (#id)
 */
export function isIdSelector(token: Token): boolean {
  return token.kind === TokenKind.SELECTOR && token.value.startsWith('#');
}

/**
 * Check if token is a class selector (.class)
 */
export function isClassSelector(token: Token): boolean {
  return token.kind === TokenKind.SELECTOR && token.value.startsWith('.');
}

/**
 * Check if token is a CSS selector (not ID or class)
 */
export function isCssSelector(token: Token): boolean {
  if (token.kind !== TokenKind.SELECTOR) return false;
  // CSS selectors don't start with # or .
  return !token.value.startsWith('#') && !token.value.startsWith('.');
}

/**
 * Check if token is a global variable ($var)
 */
export function isGlobalVar(token: Token): boolean {
  // Global vars are identifiers starting with $
  return token.kind === TokenKind.IDENTIFIER && token.value.startsWith('$');
}

/**
 * Check if token is a basic operator (not logical/comparison)
 */
export function isBasicOperator(token: Token): boolean {
  if (token.kind !== TokenKind.OPERATOR) return false;
  // Exclude logical and comparison operators
  const lowerValue = token.value.toLowerCase();
  return !LOGICAL_OPERATORS.has(lowerValue) && !COMPARISON_OPERATORS.has(lowerValue);
}

// ============================================================================
// VALUE PREDICATES - Check specific token values
// ============================================================================

/**
 * Check if token has a specific value (case-insensitive)
 */
export function hasValue(token: Token, value: string): boolean {
  return token.value.toLowerCase() === value.toLowerCase();
}

/**
 * Check if token has one of the specified values (case-insensitive)
 */
export function hasValueIn(token: Token, values: readonly string[]): boolean {
  const lowerValue = token.value.toLowerCase();
  return values.some(v => v.toLowerCase() === lowerValue);
}

/**
 * Check if token is a specific operator value
 */
export function isOperatorValue(token: Token, value: string): boolean {
  return isOperator(token) && token.value === value;
}

/**
 * Check if token is the possessive operator ('s)
 */
export function isPossessive(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR && token.value === "'s";
}

/**
 * Check if token is a dot operator (property access)
 */
export function isDot(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR && token.value === '.';
}

/**
 * Check if token is optional chaining operator (?.)
 */
export function isOptionalChain(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR && token.value === '?.';
}

/**
 * Check if token is an opening bracket
 */
export function isOpenBracket(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR && token.value === '[';
}

/**
 * Check if token is an opening paren
 */
export function isOpenParen(token: Token): boolean {
  return token.kind === TokenKind.OPERATOR && token.value === '(';
}

// ============================================================================
// COMPOUND PREDICATES - Common combinations
// ============================================================================

/**
 * Check if token can start an expression
 * Used for determining expression boundaries
 */
export function canStartExpression(token: Token): boolean {
  return (
    isIdentifierLike(token) ||
    isSelector(token) ||
    isLiteral(token) ||
    token.kind === TokenKind.SYMBOL ||
    (token.kind === TokenKind.OPERATOR &&
      (token.value === '(' ||
        token.value === '[' ||
        token.value === '-' ||
        token.value === '+' ||
        token.value === '!'))
  );
}

/**
 * Check if token is a command terminator (then, and, else, end, on)
 * Used to determine where command arguments end
 */
export function isCommandTerminator(token: Token): boolean {
  const value = token.value.toLowerCase();
  return (
    value === 'then' || value === 'and' || value === 'else' || value === 'end' || value === 'on'
  );
}

// ============================================================================
// NAMESPACE EXPORT - For convenient importing
// ============================================================================

export const TokenPredicates = {
  // Semantic predicates
  isCommand,
  isKeyword,
  isEvent,
  isContextVar,
  isLogicalOperator,
  isComparisonOperator,

  // Lexical predicates (grouped)
  isIdentifierLike,
  isSelector,
  isBasicSelector,
  isLiteral,
  isOperator,
  isReference,
  isTimeExpression,
  isSymbol,
  isComment,

  // Specific type predicates (individual)
  isIdentifier,
  isString,
  isNumber,
  isBoolean,
  isTemplateLiteral,
  isQueryReference,
  isIdSelector,
  isClassSelector,
  isCssSelector,
  isGlobalVar,
  isBasicOperator,

  // Value predicates
  hasValue,
  hasValueIn,
  isOperatorValue,
  isPossessive,
  isDot,
  isOptionalChain,
  isOpenBracket,
  isOpenParen,

  // Compound predicates
  canStartExpression,
  isCommandTerminator,
};

export default TokenPredicates;
