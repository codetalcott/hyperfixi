/**
 * TokenConsumer - Helper utilities for common token consumption patterns
 * Eliminates duplication of "parse until terminator" logic across command parsers
 */

import type { ASTNode, Token } from '../types/core';
import type { TokenType } from './tokenizer';
import { COMMAND_TERMINATORS, KEYWORDS } from './parser-constants';

/**
 * Interface for parser methods needed by TokenConsumer
 * This allows the helper to work with the Parser without direct coupling
 */
export interface ParserInterface {
  isAtEnd(): boolean;
  check(value: string): boolean;
  checkTokenType(type: TokenType): boolean;
  advance(): Token;
  peek(): Token;
  parsePrimary(): ASTNode;
  parseExpression(): ASTNode;
  isCommand(name: string): boolean;
}

/**
 * Options for parsing arguments until a terminator
 */
export interface ParseUntilOptions {
  /** Additional terminator keywords beyond the defaults */
  additionalTerminators?: string[];
  /** Whether to allow full expression parsing (default: false, uses parsePrimary) */
  allowExpressions?: boolean;
  /** Whether to check for command tokens as terminators (default: true) */
  stopAtCommands?: boolean;
  /** Custom predicate to determine if parsing should stop */
  stopWhen?: (parser: ParserInterface) => boolean;
}

/**
 * Helper class for common token consumption patterns
 *
 * @example
 * // In Parser class:
 * const consumer = new TokenConsumer(this);
 * const args = consumer.parseArgsUntilTerminator();
 *
 * @example
 * // With custom terminators:
 * const args = consumer.parseArgsUntilTerminator({
 *   additionalTerminators: ['to', 'from'],
 *   allowExpressions: true
 * });
 */
export class TokenConsumer {
  private parser: ParserInterface;

  constructor(parser: ParserInterface) {
    this.parser = parser;
  }

  /**
   * Parse arguments until we hit a terminator keyword or another command
   * This is the most common pattern in command parsing
   *
   * @param options Configuration for what to parse and when to stop
   * @returns Array of parsed AST nodes
   */
  parseArgsUntilTerminator(options: ParseUntilOptions = {}): ASTNode[] {
    const {
      additionalTerminators = [],
      allowExpressions = false,
      stopAtCommands = true,
      stopWhen,
    } = options;

    const terminators = [...COMMAND_TERMINATORS, ...additionalTerminators];

    const args: ASTNode[] = [];

    while (!this.parser.isAtEnd()) {
      // Check if we hit a terminator
      if (this.shouldStopParsing(terminators, stopAtCommands, stopWhen)) {
        break;
      }

      // Parse the next argument
      const arg = allowExpressions ? this.parser.parseExpression() : this.parser.parsePrimary();

      args.push(arg);
    }

    return args;
  }

  /**
   * Check if we should stop parsing based on terminators and other conditions
   */
  private shouldStopParsing(
    terminators: readonly string[],
    stopAtCommands: boolean,
    customStopCondition?: (parser: ParserInterface) => boolean
  ): boolean {
    // Check custom stop condition first
    if (customStopCondition && customStopCondition(this.parser)) {
      return true;
    }

    // Check if current token is a terminator
    for (const terminator of terminators) {
      if (this.parser.check(terminator)) {
        return true;
      }
    }

    // Check if current token is a command (if enabled)
    if (stopAtCommands) {
      const currentToken = this.parser.peek();
      if (this.parser.isCommand(currentToken.value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Consume optional "the" article
   * Common pattern in hyperscript: "put X into the element"
   *
   * @returns true if "the" was consumed, false otherwise
   */
  consumeOptionalThe(): boolean {
    if (this.parser.check(KEYWORDS.THE)) {
      this.parser.advance();
      return true;
    }
    return false;
  }

  /**
   * Consume optional "a" or "an" article
   * Common pattern: "make a request", "make an element"
   *
   * @returns The article that was consumed, or null
   */
  consumeOptionalArticle(): 'a' | 'an' | null {
    if (this.parser.check(KEYWORDS.A)) {
      this.parser.advance();
      return 'a';
    }
    if (this.parser.check(KEYWORDS.AN)) {
      this.parser.advance();
      return 'an';
    }
    return null;
  }

  /**
   * Parse "preposition <target>" pattern
   * Common pattern: "to <target>", "from <target>", "with <options>"
   *
   * @param preposition The preposition to look for
   * @param parseExpression Whether to parse full expression or just primary
   * @returns Object with preposition and target, or null if preposition not found
   */
  parsePrepositionTarget(
    preposition: string,
    parseExpression = false
  ): { preposition: string; target: ASTNode } | null {
    if (!this.parser.check(preposition)) {
      return null;
    }

    this.parser.advance(); // consume preposition
    const target = parseExpression ? this.parser.parseExpression() : this.parser.parsePrimary();

    return { preposition, target };
  }

  /**
   * Parse multiple optional preposition targets
   * Common pattern: "fetch url with options as json"
   *
   * @param prepositions Map of preposition keywords to whether they should parse expressions
   * @returns Record of found prepositions to their targets
   */
  parseOptionalModifiers(prepositions: Record<string, boolean>): Record<string, ASTNode> {
    const modifiers: Record<string, ASTNode> = {};

    while (!this.parser.isAtEnd()) {
      let foundPreposition = false;

      for (const [prep, parseExpr] of Object.entries(prepositions)) {
        const result = this.parsePrepositionTarget(prep, parseExpr);
        if (result) {
          modifiers[prep] = result.target;
          foundPreposition = true;
          break;
        }
      }

      // If no preposition found, stop looking for modifiers
      if (!foundPreposition) {
        break;
      }
    }

    return modifiers;
  }

  /**
   * Check if we're at a command separator (then, and, or end of input)
   *
   * @returns true if at separator or end
   */
  isAtCommandSeparator(): boolean {
    if (this.parser.isAtEnd()) return true;
    return (
      this.parser.check(KEYWORDS.THEN) ||
      this.parser.check(KEYWORDS.AND) ||
      this.parser.check(KEYWORDS.END)
    );
  }

  /**
   * Consume optional command separator (then, and)
   * Does not consume "end" as that typically closes a block
   *
   * @returns The separator that was consumed, or null
   */
  consumeOptionalSeparator(): 'then' | 'and' | null {
    if (this.parser.check(KEYWORDS.THEN)) {
      this.parser.advance();
      return 'then';
    }
    if (this.parser.check(KEYWORDS.AND)) {
      this.parser.advance();
      return 'and';
    }
    return null;
  }

  /**
   * Parse compound keyword phrase (e.g., "at start of", "at end of")
   *
   * @param keywords Array of keywords that form the phrase in order
   * @returns The complete phrase if all keywords match, null otherwise
   */
  tryParseKeywordPhrase(keywords: string[]): string | null {
    // Save current position in case we need to backtrack
    // Note: This would need to be implemented by the parser

    const matched: string[] = [];

    for (const keyword of keywords) {
      if (this.parser.check(keyword)) {
        matched.push(keyword);
        this.parser.advance();
      } else {
        // Mismatch - would need to backtrack here
        // For now, just return null
        return null;
      }
    }

    return matched.join(' ');
  }
}
