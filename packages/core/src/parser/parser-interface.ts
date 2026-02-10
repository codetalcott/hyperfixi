/**
 * Parser Interface - Abstraction for Tree-Shakeable Parser Selection
 *
 * This interface enables pluggable parsers for tree-shaking.
 * Different parsers have different capabilities and bundle sizes:
 *
 * - **regexParser**: ~5KB, 8 commands, simple syntax only
 * - **hybridParser**: ~7KB, 21+ commands, ~85% hyperscript coverage
 * - **fullParser**: ~180KB, 48 commands, 100% hyperscript coverage
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { hybridParser } from '@hyperfixi/core/parser/hybrid';
 * import { toggle, add } from '@hyperfixi/core/commands';
 *
 * const runtime = createRuntime({
 *   commands: [toggle(), add()],
 *   parser: hybridParser
 * });
 * ```
 */

import type { ASTNode, CommandNode } from '../types/base-types';

/**
 * Parser interface for tree-shakeable parser selection.
 *
 * All parsers must implement this interface to be usable with
 * the modular runtime factory.
 */
export interface ParserInterface {
  /**
   * Parse a hyperscript command string into an AST node.
   *
   * @param code The hyperscript code to parse
   * @returns The parsed command node
   * @throws Error if parsing fails
   */
  parse(code: string): CommandNode | ASTNode;

  /**
   * Parse multiple commands or a feature definition.
   *
   * @param code The hyperscript code to parse
   * @returns Array of parsed command nodes
   */
  parseCommands?(code: string): (CommandNode | ASTNode)[];

  /**
   * Check if this parser supports a particular syntax.
   *
   * This is useful for parser fallback chains where a smaller
   * parser might handle simple syntax and fall back to a larger
   * parser for complex syntax.
   *
   * @param syntax The syntax to check
   * @returns true if this parser can handle the syntax
   */
  supports?(syntax: string): boolean;

  /**
   * Get the list of commands this parser supports.
   *
   * Useful for documentation and debugging.
   */
  readonly supportedCommands?: readonly string[];

  /**
   * Parser name for debugging and logging.
   */
  readonly name: string;
}

/**
 * Parser factory function type.
 *
 * Parsers can be provided as factory functions for lazy initialization.
 */
export type ParserFactory = () => ParserInterface;

/**
 * Check if an object implements the ParserInterface.
 */
export function isParserInterface(obj: unknown): obj is ParserInterface {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'parse' in obj &&
    typeof (obj as ParserInterface).parse === 'function' &&
    'name' in obj &&
    typeof (obj as ParserInterface).name === 'string'
  );
}
