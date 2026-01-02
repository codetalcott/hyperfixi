/**
 * Full Parser Adapter
 *
 * Wraps the complete HyperFixi parser (~3,860 lines) with the ParserAdapter interface.
 * This adapter enables build-time parser selection while preserving all features:
 * - 43+ commands including htmx-like commands
 * - Behavior definitions
 * - Function definitions (def)
 * - Semantic i18n integration
 * - Full expression parser with operator precedence
 * - Block commands with complex control flow
 */

import type { ParserAdapter, ParseResult, ParserCapabilities } from './parser-adapter';
import { FULL_CAPABILITIES } from './parser-adapter';
import { Parser } from '../parser';
import { tokenize } from '../tokenizer';
import { COMMANDS } from '../parser-constants';
import type { ParserOptions } from '../types';

/**
 * Full parser capabilities - all features enabled
 */
const capabilities: ParserCapabilities = FULL_CAPABILITIES;

/**
 * All commands supported by the full parser
 */
const FULL_COMMANDS = Array.from(COMMANDS);

/**
 * Full Parser implementing ParserAdapter interface
 *
 * This wraps the existing Parser class without modifying its internals.
 * Use createFullParser() for tree-shakeable instantiation.
 */
export class FullParser implements ParserAdapter {
  readonly tier = 'full' as const;
  readonly name = 'HyperFixi Full Parser v1.0';
  readonly capabilities = capabilities;

  private options?: ParserOptions;

  constructor(options?: ParserOptions) {
    this.options = options;
  }

  /**
   * Parse hyperscript code into an AST
   */
  parse(code: string): ParseResult {
    try {
      // Handle empty input
      if (!code || code.trim() === '') {
        return {
          success: false,
          error: {
            message: 'Cannot parse empty input',
            position: 0,
            line: 1,
            column: 1,
          },
          warnings: [],
        };
      }

      // Tokenize the input (keywords handled by Parser constructor)
      const tokens = tokenize(code);

      // Create parser and parse
      const parser = new Parser(tokens, this.options, code);
      const result = parser.parse();

      // Map to ParseResult interface
      if (result.success && result.node) {
        return {
          success: true,
          node: result.node,
          warnings: result.warnings?.map((w) => ({
            message: w.message,
          })),
        };
      } else {
        return {
          success: false,
          node: result.node,
          error: result.error
            ? {
                message: result.error.message,
                position: result.error.position,
                line: result.error.line,
                column: result.error.column,
              }
            : {
                message: 'Unknown parse error',
                position: 0,
              },
          warnings: result.warnings?.map((w) => ({
            message: w.message,
          })),
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          message: `Parser error: ${message}`,
          position: 0,
        },
        warnings: [],
      };
    }
  }

  /**
   * Check if a command is supported
   */
  supportsCommand(name: string): boolean {
    return COMMANDS.has(name.toLowerCase());
  }

  /**
   * Get list of all supported commands
   */
  getSupportedCommands(): string[] {
    return FULL_COMMANDS;
  }
}

/**
 * Factory function for tree-shakeable parser instantiation
 *
 * @param options - Optional parser configuration
 * @returns ParserAdapter instance
 *
 * @example
 * ```typescript
 * import { createFullParser } from './adapters/parser-full';
 *
 * const parser = createFullParser();
 * const result = parser.parse('on click toggle .active');
 *
 * if (result.success) {
 *   console.log('AST:', result.node);
 * }
 * ```
 */
export function createFullParser(options?: ParserOptions): ParserAdapter {
  return new FullParser(options);
}

/**
 * Re-export capabilities for external use
 */
export { FULL_CAPABILITIES };
