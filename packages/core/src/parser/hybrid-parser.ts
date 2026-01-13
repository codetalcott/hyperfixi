/**
 * Hybrid Parser - Lightweight Parser with ~85% Hyperscript Coverage
 *
 * This parser provides a good balance of features and bundle size.
 * It supports 21+ commands, block statements, event modifiers, and expressions.
 *
 * Now uses modular imports for tree-shaking support.
 * Only the parser is included - no runtime/executor overhead.
 *
 * Supported features:
 * - 21 core commands + 7 block commands
 * - Event modifiers: .once, .prevent, .stop, .debounce(N), .throttle(N)
 * - Operator precedence for expressions
 * - Positional expressions: first, last, next, previous, closest, parent
 * - Function calls and method chaining
 * - HTML selectors: <button.class#id/>
 * - i18n keyword aliases
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { hybridParser } from '@hyperfixi/core/parser/hybrid';
 *
 * const runtime = createRuntime({
 *   commands: [...],
 *   parser: hybridParser
 * });
 * ```
 */

import type { ParserInterface } from './parser-interface';
import type { ASTNode, CommandNode } from '../types/base-types';

// Import modular parser components (tree-shakeable)
import { HybridParser } from './hybrid/parser-core';
import { addCommandAliases as addAliases, addEventAliases as addEvents } from './hybrid/aliases';

/**
 * Hybrid parser implementation.
 *
 * Uses the modular HybridParser class instead of the full bundle.
 * This enables tree-shaking - only parser code is included, not runtime/executor.
 */
class HybridParserImpl implements ParserInterface {
  readonly name = 'hybrid';
  readonly supportedCommands = [
    'toggle',
    'add',
    'remove',
    'put',
    'append',
    'set',
    'get',
    'call',
    'log',
    'send',
    'trigger',
    'wait',
    'show',
    'hide',
    'transition',
    'take',
    'increment',
    'decrement',
    'focus',
    'blur',
    'go',
    'return',
    // Block commands
    'if',
    'else',
    'unless',
    'repeat',
    'for',
    'while',
    'fetch',
  ] as const;

  parse(code: string): CommandNode | ASTNode {
    const parser = new HybridParser(code);
    return parser.parse() as CommandNode | ASTNode;
  }

  parseCommands(code: string): (CommandNode | ASTNode)[] {
    const parser = new HybridParser(code);
    const result = parser.parse();
    if (Array.isArray(result)) {
      return result as (CommandNode | ASTNode)[];
    }
    return [result as CommandNode | ASTNode];
  }

  supports(syntax: string): boolean {
    // Check if the syntax starts with a supported command
    const firstWord = syntax.trim().split(/\s+/)[0]?.toLowerCase();

    // Check for event handlers
    if (firstWord === 'on' || firstWord === 'every' || firstWord === 'init') {
      return true;
    }

    // Check for supported commands
    return this.supportedCommands.includes(firstWord as (typeof this.supportedCommands)[number]);
  }
}

/**
 * Hybrid parser instance - supports ~85% of hyperscript syntax.
 *
 * Good balance between bundle size and feature coverage.
 * Now tree-shakeable - only includes parser, not runtime.
 */
export const hybridParser: ParserInterface = new HybridParserImpl();

/**
 * Factory function for creating hybrid parser instances.
 */
export function createHybridParser(): ParserInterface {
  return new HybridParserImpl();
}

/**
 * Add command aliases for i18n or custom keywords.
 */
export function addCommandAliases(aliases: Record<string, string>): void {
  addAliases(aliases);
}

/**
 * Add event aliases for i18n or custom keywords.
 */
export function addEventAliases(aliases: Record<string, string>): void {
  addEvents(aliases);
}

// Re-export parser components for direct access
export { HybridParser } from './hybrid/parser-core';
export { tokenize } from './hybrid/tokenizer';
export type { Token, TokenType } from './hybrid/tokenizer';
export type { ASTNode as HybridASTNode } from './hybrid/ast-types';
