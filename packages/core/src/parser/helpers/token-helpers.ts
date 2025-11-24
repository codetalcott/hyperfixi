/**
 * Token Helper Utilities
 *
 * This module provides type definitions and utility functions for token stream navigation.
 * Core token methods (advance, peek, etc.) remain in the Parser class and are exposed
 * through the ParserContext interface for command parsers to use.
 *
 * @module parser/helpers/token-helpers
 */

import type { Token } from '../../types/core';
import { TokenType } from '../tokenizer';

/**
 * TokenStreamState - Represents the current state of token stream navigation
 *
 * This is used internally by the Parser class to track position in the token stream.
 */
export interface TokenStreamState {
  /** Array of tokens being parsed */
  tokens: Token[];
  /** Current position in the token stream (index) */
  current: number;
}

/**
 * TokenNavigator - Interface for token stream navigation methods
 *
 * This interface defines the contract for token navigation that will be
 * provided through ParserContext to command parsers.
 */
export interface TokenNavigator {
  /** Consume and return the current token, advancing the position */
  advance(): Token;

  /** Look at the current token without consuming it */
  peek(): Token;

  /** Get the previously consumed token */
  previous(): Token;

  /** Check if current token matches a value */
  check(value: string): boolean;

  /** Check if current token matches a type */
  checkTokenType(type: TokenType): boolean;

  /** Match and consume if current token matches any of the given types */
  match(...types: Array<string | TokenType>): boolean;

  /** Match and consume if current token matches the given token type */
  matchTokenType(type: TokenType): boolean;

  /** Match and consume if current token is an operator with the given value */
  matchOperator(operator: string): boolean;

  /** Check if at end of token stream */
  isAtEnd(): boolean;

  /** Consume expected token or add error */
  consume(expected: string | TokenType, message: string): Token;
}

/**
 * Higher-level token utility functions
 */

/**
 * Check if the next token (without consuming) matches the expected value
 *
 * This is a non-consuming look-ahead utility.
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param expected - Expected token value
 * @returns True if next token matches
 */
export function peekMatches(tokens: Token[], current: number, expected: string): boolean {
  if (current >= tokens.length) return false;
  return tokens[current].value === expected;
}

/**
 * Check if next token matches expected type
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param expectedType - Expected token type
 * @returns True if next token matches type
 */
export function peekMatchesType(tokens: Token[], current: number, expectedType: TokenType): boolean {
  if (current >= tokens.length) return false;
  return tokens[current].type === expectedType;
}

/**
 * Look ahead N tokens without consuming
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param offset - Number of tokens to look ahead (1 = next token, 2 = token after next, etc.)
 * @returns Token at offset, or dummy EOF token if past end
 */
export function peekAhead(tokens: Token[], current: number, offset: number = 1): Token {
  const index = current + offset;
  if (index >= tokens.length) {
    // Return dummy EOF token
    return {
      type: 'EOF',
      value: '',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
    };
  }
  return tokens[index];
}

/**
 * Check if we're at the last token
 *
 * @param tokens - Token array
 * @param current - Current position
 * @returns True if current token is the last one
 */
export function isLastToken(tokens: Token[], current: number): boolean {
  return current === tokens.length - 1;
}

/**
 * Count remaining tokens
 *
 * @param tokens - Token array
 * @param current - Current position
 * @returns Number of tokens remaining (including current)
 */
export function remainingTokens(tokens: Token[], current: number): number {
  return Math.max(0, tokens.length - current);
}

/**
 * Get token at specific index (with bounds checking)
 *
 * @param tokens - Token array
 * @param index - Token index
 * @returns Token at index, or dummy EOF token if out of bounds
 */
export function getTokenAt(tokens: Token[], index: number): Token {
  if (index < 0 || index >= tokens.length) {
    return {
      type: 'EOF',
      value: '',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
    };
  }
  return tokens[index];
}

/**
 * Check if current token is a keyword from a specific set
 *
 * @param token - Token to check
 * @param keywords - Array of keyword strings to match against
 * @returns True if token value matches any keyword
 */
export function isKeyword(token: Token | undefined, keywords: string[]): boolean {
  if (!token) return false;
  return keywords.some((kw) => token.value === kw || token.value.toLowerCase() === kw);
}

/**
 * Find next occurrence of token with specific value
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param value - Token value to find
 * @returns Index of next occurrence, or -1 if not found
 */
export function findNextToken(tokens: Token[], current: number, value: string): number {
  for (let i = current; i < tokens.length; i++) {
    if (tokens[i].value === value) {
      return i;
    }
  }
  return -1;
}

/**
 * Find next occurrence of token with specific type
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param type - Token type to find
 * @returns Index of next occurrence, or -1 if not found
 */
export function findNextTokenType(tokens: Token[], current: number, type: TokenType): number {
  for (let i = current; i < tokens.length; i++) {
    if (tokens[i].type === type) {
      return i;
    }
  }
  return -1;
}

/**
 * Collect tokens until a specific value is found (non-consuming)
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param until - Token value to stop at
 * @returns Array of tokens before the stop value
 */
export function getTokensUntil(tokens: Token[], current: number, until: string): Token[] {
  const result: Token[] = [];
  for (let i = current; i < tokens.length; i++) {
    if (tokens[i].value === until) {
      break;
    }
    result.push(tokens[i]);
  }
  return result;
}

/**
 * Check if current position is at a sequence of tokens
 *
 * @param tokens - Token array
 * @param current - Current position
 * @param sequence - Array of token values to match
 * @returns True if tokens at current position match the sequence
 */
export function matchesSequence(tokens: Token[], current: number, sequence: string[]): boolean {
  if (current + sequence.length > tokens.length) {
    return false;
  }

  for (let i = 0; i < sequence.length; i++) {
    if (tokens[current + i].value !== sequence[i]) {
      return false;
    }
  }

  return true;
}
