/**
 * Parsing Helper Utilities
 *
 * This module provides utility functions for command parsing and pattern matching.
 * These are pure functions that don't depend on Parser class state.
 *
 * @module parser/helpers/parsing-helpers
 */

import type { Token, ASTNode } from '../../types/core';
import type { ParserContext } from '../parser-types';
import { KEYWORDS } from '../parser-constants';

/**
 * MultiWordPattern - Local type for command syntax patterns
 *
 * Different from parser-types.ts MultiWordPattern which is for type checking.
 * This version includes syntax string for pattern matching.
 */
export interface MultiWordPattern {
  command: string;
  keywords: string[];
  syntax: string;
}

/**
 * Multi-word command patterns
 *
 * These patterns define which keywords indicate modifiers for specific commands.
 * Used for commands like "append X to Y", "fetch URL as json", etc.
 */
export const MULTI_WORD_PATTERNS: MultiWordPattern[] = [
  { command: 'append', keywords: ['to'], syntax: 'append <value> [to <target>]' },
  { command: 'fetch', keywords: ['as', 'with'], syntax: 'fetch <url> [as <type>] [with <options>]' },
  { command: 'make', keywords: ['a', 'an'], syntax: 'make (a|an) <type>' },
  { command: 'send', keywords: ['to'], syntax: 'send <event> to <target>' },
  { command: 'throw', keywords: [], syntax: 'throw <error>' },
];

/**
 * Parsing Utility Functions
 */

/**
 * Get multi-word pattern for a command
 *
 * Looks up the pattern definition for commands that use multi-word syntax
 * (e.g., "append X to Y", "fetch URL as json")
 *
 * @param commandName - Command name to look up
 * @returns Pattern definition or null if not a multi-word command
 */
export function getMultiWordPattern(commandName: string): MultiWordPattern | null {
  return MULTI_WORD_PATTERNS.find(p => p.command === commandName.toLowerCase()) || null;
}

/**
 * Check if token is one of the specified keywords
 *
 * Performs case-insensitive keyword matching against a list of valid keywords.
 * Used for validating command modifiers and syntax markers.
 *
 * @param token - Token to check (can be undefined)
 * @param keywords - Array of valid keyword strings
 * @returns True if token value matches any keyword (case-insensitive)
 */
export function isKeyword(token: Token | undefined, keywords: string[]): boolean {
  if (!token) return false;
  return keywords.some(kw => token.value === kw || token.value.toLowerCase() === kw);
}

// ============================================================================
// Command Argument Parsing Helpers
// ============================================================================

/**
 * Default command boundary keywords
 *
 * These keywords signal the end of a command's arguments and should stop
 * argument collection. Used by isCommandBoundary and parseArgumentsUntilBoundary.
 */
export const DEFAULT_BOUNDARY_KEYWORDS = [
  KEYWORDS.THEN,
  KEYWORDS.AND,
  KEYWORDS.ELSE,
  KEYWORDS.END,
] as const;

/**
 * Check if parser is at a command boundary
 *
 * A command boundary is reached when:
 * - At end of token stream
 * - Current token is a control flow keyword (then, and, else, end)
 * - Current token matches any additional boundary keywords
 * - Current token is a command token type
 *
 * This helper eliminates the repeated boundary check pattern found in 15+ places:
 * ```typescript
 * !ctx.isAtEnd() &&
 * !ctx.check(KEYWORDS.THEN) &&
 * !ctx.check(KEYWORDS.AND) &&
 * !ctx.check(KEYWORDS.ELSE) &&
 * !ctx.check(KEYWORDS.END)
 * ```
 *
 * @param ctx - Parser context
 * @param additionalBoundaries - Additional keywords that signal a boundary (e.g., 'from', 'on', 'to')
 * @returns True if at a command boundary, false if more arguments can be parsed
 *
 * @example
 * // Basic usage - check standard boundaries
 * while (!isCommandBoundary(ctx)) {
 *   args.push(ctx.parsePrimary());
 * }
 *
 * @example
 * // With additional boundaries for specific commands
 * while (!isCommandBoundary(ctx, [KEYWORDS.FROM, KEYWORDS.TO])) {
 *   args.push(ctx.parsePrimary());
 * }
 */
export function isCommandBoundary(
  ctx: ParserContext,
  additionalBoundaries: string[] = []
): boolean {
  // Check end of stream
  if (ctx.isAtEnd()) {
    return true;
  }

  // Check default boundary keywords
  for (const keyword of DEFAULT_BOUNDARY_KEYWORDS) {
    if (ctx.check(keyword)) {
      return true;
    }
  }

  // Check additional boundaries
  for (const keyword of additionalBoundaries) {
    if (ctx.check(keyword)) {
      return true;
    }
  }

  // Check if current token is a command
  if (ctx.checkIsCommand()) {
    return true;
  }

  return false;
}

/**
 * Parse arguments until a command boundary is reached
 *
 * Collects AST nodes by repeatedly calling ctx.parsePrimary() until a
 * command boundary is detected. This eliminates the repeated pattern:
 * ```typescript
 * const args: ASTNode[] = [];
 * while (!ctx.isAtEnd() && !ctx.check(KEYWORDS.THEN) && ...) {
 *   args.push(ctx.parsePrimary());
 * }
 * ```
 *
 * @param ctx - Parser context
 * @param additionalBoundaries - Additional keywords that signal a boundary
 * @param maxArgs - Optional maximum number of arguments to collect
 * @returns Array of parsed AST nodes
 *
 * @example
 * // Parse all arguments until standard boundaries
 * const args = parseArgumentsUntilBoundary(ctx);
 *
 * @example
 * // Parse arguments with custom boundaries
 * const args = parseArgumentsUntilBoundary(ctx, [KEYWORDS.FROM, KEYWORDS.WITH]);
 *
 * @example
 * // Parse at most 2 arguments
 * const args = parseArgumentsUntilBoundary(ctx, [], 2);
 */
export function parseArgumentsUntilBoundary(
  ctx: ParserContext,
  additionalBoundaries: string[] = [],
  maxArgs?: number
): ASTNode[] {
  const args: ASTNode[] = [];

  while (!isCommandBoundary(ctx, additionalBoundaries)) {
    // Check max args limit
    if (maxArgs !== undefined && args.length >= maxArgs) {
      break;
    }

    args.push(ctx.parsePrimary());
  }

  return args;
}

/**
 * Parse a single argument if not at boundary
 *
 * Convenience helper for parsing exactly one argument when available.
 * Returns undefined if already at a command boundary.
 *
 * @param ctx - Parser context
 * @param additionalBoundaries - Additional keywords that signal a boundary
 * @returns Parsed AST node or undefined if at boundary
 *
 * @example
 * const classArg = parseOneArgument(ctx, [KEYWORDS.FROM]);
 * if (classArg) {
 *   args.push(classArg);
 * }
 */
export function parseOneArgument(
  ctx: ParserContext,
  additionalBoundaries: string[] = []
): ASTNode | undefined {
  if (isCommandBoundary(ctx, additionalBoundaries)) {
    return undefined;
  }
  // Use parseExpression to handle binary expressions like 'last <li/> in #items'
  return ctx.parseExpression();
}

/**
 * Check and consume a keyword, adding it to args
 *
 * Common pattern for handling preposition keywords like 'from', 'to', 'with'.
 * If the keyword is found, it's consumed and an identifier node is added to args.
 *
 * @param ctx - Parser context
 * @param keyword - Keyword to check for
 * @param args - Array to add the keyword identifier to
 * @returns True if keyword was found and consumed
 *
 * @example
 * // Handle 'from' keyword
 * if (consumeKeywordToArgs(ctx, KEYWORDS.FROM, args)) {
 *   // 'from' was found and added to args
 *   const target = parseOneArgument(ctx);
 *   if (target) args.push(target);
 * }
 */
export function consumeKeywordToArgs(
  ctx: ParserContext,
  keyword: string,
  args: ASTNode[]
): boolean {
  if (ctx.check(keyword)) {
    ctx.advance(); // consume keyword
    args.push(ctx.createIdentifier(keyword));
    return true;
  }
  return false;
}

/**
 * Check and consume one of several keywords, adding it to args
 *
 * Like consumeKeywordToArgs but accepts multiple keywords.
 * Useful for commands that accept alternative prepositions (e.g., 'from' or 'on').
 *
 * @param ctx - Parser context
 * @param keywords - Array of keywords to check for
 * @param args - Array to add the keyword identifier to
 * @returns The keyword that was found and consumed, or null if none matched
 *
 * @example
 * // Handle 'from' or 'on' keyword
 * const preposition = consumeOneOfKeywordsToArgs(ctx, [KEYWORDS.FROM, KEYWORDS.ON], args);
 * if (preposition) {
 *   const target = parseOneArgument(ctx);
 *   if (target) args.push(target);
 * }
 */
export function consumeOneOfKeywordsToArgs(
  ctx: ParserContext,
  keywords: string[],
  args: ASTNode[]
): string | null {
  for (const keyword of keywords) {
    if (ctx.check(keyword)) {
      ctx.advance(); // consume keyword
      args.push(ctx.createIdentifier(keyword));
      return keyword;
    }
  }
  return null;
}
