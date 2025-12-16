/**
 * Token Predicates
 *
 * Provides predicate functions for token classification, decoupling the parser
 * from direct TokenType enum checks. This enables:
 *
 * 1. Cleaner separation between lexical tokenization and semantic classification
 * 2. Easier migration to simplified TokenKind values
 * 3. Consistent classification logic across parser and expression-parser
 *
 * Usage:
 *   // Before (tight coupling):
 *   if (token.type === TokenType.COMMAND) { ... }
 *   if (token.type === TokenType.CONTEXT_VAR || token.type === TokenType.IDENTIFIER) { ... }
 *
 *   // After (predicate-based):
 *   if (TokenPredicates.isCommand(token)) { ... }
 *   if (TokenPredicates.isIdentifierLike(token)) { ... }
 */

import type { Token } from '../types/core';
import { TokenType } from './tokenizer';
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
// ============================================================================

/**
 * Check if token is a hyperscript command (add, toggle, put, etc.)
 * Works with both COMMAND token type and IDENTIFIER tokens that are commands
 */
export function isCommand(token: Token): boolean {
  if (token.type === TokenType.COMMAND) return true;
  if (token.type === TokenType.IDENTIFIER) {
    return COMMANDS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a hyperscript keyword (if, then, else, etc.)
 * Works with both KEYWORD token type and IDENTIFIER tokens that are keywords
 */
export function isKeyword(token: Token): boolean {
  if (token.type === TokenType.KEYWORD) return true;
  if (token.type === TokenType.IDENTIFIER) {
    return TOKENIZER_KEYWORDS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a DOM event name (click, mouseenter, etc.)
 */
export function isEvent(token: Token): boolean {
  if (token.type === TokenType.EVENT) return true;
  if (token.type === TokenType.IDENTIFIER) {
    return DOM_EVENTS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a context variable (me, it, you, result, etc.)
 */
export function isContextVar(token: Token): boolean {
  if (token.type === TokenType.CONTEXT_VAR) return true;
  if (token.type === TokenType.IDENTIFIER) {
    return CONTEXT_VARS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a logical operator (and, or, not, no)
 */
export function isLogicalOperator(token: Token): boolean {
  if (token.type === TokenType.LOGICAL_OPERATOR) return true;
  if (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD) {
    return LOGICAL_OPERATORS.has(token.value.toLowerCase());
  }
  return false;
}

/**
 * Check if token is a comparison operator (is, ==, contains, etc.)
 */
export function isComparisonOperator(token: Token): boolean {
  if (token.type === TokenType.COMPARISON_OPERATOR) return true;
  // Check value for multi-word operators that may be assembled
  return COMPARISON_OPERATORS.has(token.value.toLowerCase());
}

// ============================================================================
// LEXICAL PREDICATES - What the token IS structurally
// ============================================================================

/**
 * Check if token is identifier-like (can be used as a variable/property name)
 * Includes: IDENTIFIER, CONTEXT_VAR, KEYWORD, COMMAND, EVENT
 *
 * This is the most common check in the parser - replaces patterns like:
 *   token.type === TokenType.IDENTIFIER || token.type === TokenType.CONTEXT_VAR
 */
export function isIdentifierLike(token: Token): boolean {
  return (
    token.type === TokenType.IDENTIFIER ||
    token.type === TokenType.CONTEXT_VAR ||
    token.type === TokenType.KEYWORD ||
    token.type === TokenType.COMMAND ||
    token.type === TokenType.EVENT
  );
}

/**
 * Check if token is a CSS selector (#id, .class, or query reference <selector/>)
 */
export function isSelector(token: Token): boolean {
  return (
    token.type === TokenType.ID_SELECTOR ||
    token.type === TokenType.CLASS_SELECTOR ||
    token.type === TokenType.CSS_SELECTOR ||
    token.type === TokenType.QUERY_REFERENCE
  );
}

/**
 * Check if token is a basic CSS selector (ID, class, or CSS selector, excluding query reference)
 * Use this when query references need separate handling
 */
export function isBasicSelector(token: Token): boolean {
  return (
    token.type === TokenType.ID_SELECTOR ||
    token.type === TokenType.CLASS_SELECTOR ||
    token.type === TokenType.CSS_SELECTOR
  );
}

/**
 * Check if token is a literal value (string, number, boolean, template)
 */
export function isLiteral(token: Token): boolean {
  return (
    token.type === TokenType.STRING ||
    token.type === TokenType.NUMBER ||
    token.type === TokenType.BOOLEAN ||
    token.type === TokenType.TEMPLATE_LITERAL
  );
}

/**
 * Check if token is any kind of operator
 */
export function isOperator(token: Token): boolean {
  return (
    token.type === TokenType.OPERATOR ||
    token.type === TokenType.LOGICAL_OPERATOR ||
    token.type === TokenType.COMPARISON_OPERATOR
  );
}

/**
 * Check if token is a reference (context var, global var, or identifier)
 */
export function isReference(token: Token): boolean {
  return (
    token.type === TokenType.CONTEXT_VAR ||
    token.type === TokenType.GLOBAL_VAR ||
    token.type === TokenType.IDENTIFIER
  );
}

/**
 * Check if token is a time expression (5s, 100ms, etc.)
 */
export function isTimeExpression(token: Token): boolean {
  return token.type === TokenType.TIME_EXPRESSION;
}

/**
 * Check if token is a symbol (@attribute)
 */
export function isSymbol(token: Token): boolean {
  return token.type === TokenType.SYMBOL;
}

/**
 * Check if token is a comment
 */
export function isComment(token: Token): boolean {
  return token.type === TokenType.COMMENT;
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
  return token.type === TokenType.OPERATOR && token.value === "'s";
}

/**
 * Check if token is a dot operator (property access)
 */
export function isDot(token: Token): boolean {
  return token.type === TokenType.OPERATOR && token.value === '.';
}

/**
 * Check if token is optional chaining operator (?.)
 */
export function isOptionalChain(token: Token): boolean {
  return token.type === TokenType.OPERATOR && token.value === '?.';
}

/**
 * Check if token is an opening bracket
 */
export function isOpenBracket(token: Token): boolean {
  return token.type === TokenType.OPERATOR && token.value === '[';
}

/**
 * Check if token is an opening paren
 */
export function isOpenParen(token: Token): boolean {
  return token.type === TokenType.OPERATOR && token.value === '(';
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
    token.type === TokenType.GLOBAL_VAR ||
    token.type === TokenType.SYMBOL ||
    (token.type === TokenType.OPERATOR && (token.value === '(' || token.value === '[' || token.value === '-' || token.value === '+' || token.value === '!'))
  );
}

/**
 * Check if token is a command terminator (then, and, else, end, on)
 * Used to determine where command arguments end
 */
export function isCommandTerminator(token: Token): boolean {
  const value = token.value.toLowerCase();
  return value === 'then' || value === 'and' || value === 'else' || value === 'end' || value === 'on';
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

  // Lexical predicates
  isIdentifierLike,
  isSelector,
  isBasicSelector,
  isLiteral,
  isOperator,
  isReference,
  isTimeExpression,
  isSymbol,
  isComment,

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
