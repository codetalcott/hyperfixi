/**
 * Full Parser - Complete Hyperscript Parser with 100% Coverage
 *
 * This is the largest parser (~180KB) but supports all 48 commands
 * and 100% of the official _hyperscript syntax.
 *
 * Use this parser when you need full hyperscript compatibility.
 * For smaller bundles, consider hybridParser or regexParser.
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { fullParser } from '@hyperfixi/core/parser/full';
 *
 * const runtime = createRuntime({
 *   commands: [...],
 *   parser: fullParser
 * });
 * ```
 */

import { Parser } from './parser';
import { tokenize } from './tokenizer';
import type { ParserInterface } from './parser-interface';
import type { ASTNode, CommandNode } from '../types/base-types';

/**
 * Full parser implementation.
 *
 * Wraps the complete Parser class with the ParserInterface.
 */
class FullParserImpl implements ParserInterface {
  readonly name = 'full';
  readonly supportedCommands = [
    // DOM
    'hide',
    'show',
    'add',
    'remove',
    'toggle',
    'put',
    'make',
    'swap',
    'morph',
    // Async
    'wait',
    'fetch',
    // Data
    'set',
    'get',
    'increment',
    'decrement',
    'bind',
    'persist',
    'default',
    // Utility
    'log',
    'tell',
    'copy',
    'pick',
    'beep',
    // Events
    'trigger',
    'send',
    // Navigation
    'go',
    'push-url',
    'replace-url',
    // Control Flow
    'if',
    'unless',
    'repeat',
    'break',
    'continue',
    'halt',
    'return',
    'exit',
    'throw',
    // Execution
    'call',
    'pseudo',
    // Content
    'append',
    // Animation
    'transition',
    'measure',
    'settle',
    'take',
    // Advanced
    'js',
    'async',
    // Behaviors
    'install',
    // Templates
    'render',
  ] as const;

  parse(code: string): CommandNode | ASTNode {
    const tokens = tokenize(code);
    const parser = new Parser(tokens, undefined, code);
    const result = parser.parse();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.ast as CommandNode | ASTNode;
  }

  parseCommands(code: string): (CommandNode | ASTNode)[] {
    const result = this.parse(code);
    if (Array.isArray(result)) {
      return result;
    }
    return [result];
  }

  supports(_syntax: string): boolean {
    // Full parser supports everything
    return true;
  }
}

/**
 * Full parser instance - supports 100% of hyperscript syntax.
 *
 * This is the largest parser but provides complete compatibility.
 */
export const fullParser: ParserInterface = new FullParserImpl();

/**
 * Factory function for creating full parser instances.
 *
 * Useful when you need a fresh parser instance.
 */
export function createFullParser(): ParserInterface {
  return new FullParserImpl();
}
