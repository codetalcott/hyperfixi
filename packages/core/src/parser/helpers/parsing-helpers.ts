/**
 * Parsing Helper Utilities
 *
 * This module provides utility functions for command parsing and pattern matching.
 * These are pure functions that don't depend on Parser class state.
 *
 * @module parser/helpers/parsing-helpers
 */

import type { Token } from '../../types/core';

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
