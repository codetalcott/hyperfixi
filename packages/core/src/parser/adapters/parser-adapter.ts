/**
 * Parser Adapter Interface
 *
 * Defines a common interface for different parser implementations,
 * enabling tree-shaking by allowing build-time parser selection.
 *
 * Tiers:
 * - Lite: Pattern-matching, 8 commands, no blocks (~300 lines)
 * - Standard: Recursive descent, 21 commands, blocks (~1,000 lines)
 * - Full: Complete parser with behaviors, semantic, i18n (~3,860 lines)
 */

import type { ASTNode } from '../../types/base-types';

/**
 * Parser capability flags for runtime feature detection
 */
export interface ParserCapabilities {
  /** Supports full expression parser with operator precedence */
  fullExpressions: boolean;

  /** Supports block commands (if/for/while/repeat/fetch) */
  blockCommands: boolean;

  /** Supports event modifiers (.once, .prevent, .debounce, .throttle) */
  eventModifiers: boolean;

  /** Supports semantic i18n parsing */
  semanticParsing: boolean;

  /** Supports behavior definitions */
  behaviors: boolean;

  /** Supports def function definitions */
  functions: boolean;

  /** Supports async/worker commands */
  asyncCommands: boolean;
}

/**
 * Result of parsing hyperscript code
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;

  /** The parsed AST node (if successful) */
  node?: ASTNode;

  /** Error information (if failed) */
  error?: {
    message: string;
    position?: number;
    line?: number;
    column?: number;
  };

  /** Warnings generated during parsing */
  warnings?: Array<{
    message: string;
    position?: number;
  }>;
}

/**
 * Parser adapter interface - all parser tiers implement this
 */
export interface ParserAdapter {
  /**
   * Parse hyperscript code into an AST
   * @param code The hyperscript code to parse
   * @returns ParseResult with success/failure and AST or error
   */
  parse(code: string): ParseResult;

  /**
   * Check if this parser supports a specific command
   * @param name Command name (e.g., 'toggle', 'add', 'fetch')
   * @returns true if the command is supported
   */
  supportsCommand(name: string): boolean;

  /**
   * Get list of supported commands
   * @returns Array of command names this parser handles
   */
  getSupportedCommands(): string[];

  /**
   * Parser capability flags for feature detection
   */
  readonly capabilities: ParserCapabilities;

  /**
   * Parser tier identifier
   */
  readonly tier: 'lite' | 'standard' | 'full';

  /**
   * Human-readable parser name/version
   */
  readonly name: string;
}

/**
 * Standard parser capabilities (hybrid-complete level)
 */
export const STANDARD_CAPABILITIES: ParserCapabilities = {
  fullExpressions: true,
  blockCommands: true,
  eventModifiers: true,
  semanticParsing: false,
  behaviors: false,
  functions: false,
  asyncCommands: true,
};

/**
 * Full parser capabilities
 */
export const FULL_CAPABILITIES: ParserCapabilities = {
  fullExpressions: true,
  blockCommands: true,
  eventModifiers: true,
  semanticParsing: true,
  behaviors: true,
  functions: true,
  asyncCommands: true,
};

/**
 * Lite parser capabilities (minimal)
 */
export const LITE_CAPABILITIES: ParserCapabilities = {
  fullExpressions: false,
  blockCommands: false,
  eventModifiers: false,
  semanticParsing: false,
  behaviors: false,
  functions: false,
  asyncCommands: false,
};

/**
 * Standard commands supported by the standard parser tier
 */
export const STANDARD_COMMANDS = [
  'toggle', 'add', 'remove', 'put', 'append', 'set', 'get', 'call',
  'log', 'send', 'trigger', 'wait', 'show', 'hide', 'transition', 'take',
  'increment', 'decrement', 'focus', 'blur', 'go', 'return',
] as const;

/**
 * Lite commands (minimal set)
 */
export const LITE_COMMANDS = [
  'toggle', 'add', 'remove', 'set', 'show', 'hide', 'wait', 'log',
] as const;

export type StandardCommand = typeof STANDARD_COMMANDS[number];
export type LiteCommand = typeof LITE_COMMANDS[number];
