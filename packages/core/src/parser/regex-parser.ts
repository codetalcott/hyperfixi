/**
 * Regex Parser - Minimal Parser for Smallest Bundle Size
 *
 * This is the smallest parser (~5KB) but only supports 8 basic commands.
 * Use this when you need the absolute minimum bundle size and only
 * use simple hyperscript patterns.
 *
 * Supported commands:
 * - add, remove, toggle (DOM class manipulation)
 * - put (content insertion)
 * - set (variable assignment)
 * - log (debugging)
 * - send (event dispatch)
 * - wait (async timing)
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { regexParser } from '@hyperfixi/core/parser/regex';
 *
 * const runtime = createRuntime({
 *   commands: [toggle(), add(), remove()],
 *   parser: regexParser
 * });
 * ```
 */

import type { ParserInterface } from './parser-interface';
import type { ASTNode, CommandNode } from '../types/base-types';

// Import the lite bundle API
import liteApi from '../compatibility/browser-bundle-lite';

/**
 * Regex parser implementation.
 *
 * Wraps the lite bundle's regex-based parser with the ParserInterface.
 */
class RegexParserImpl implements ParserInterface {
  readonly name = 'regex';
  readonly supportedCommands = [
    'add',
    'remove',
    'toggle',
    'put',
    'set',
    'log',
    'send',
    'wait',
  ] as const;

  parse(code: string): CommandNode | ASTNode {
    const result = liteApi.parse(code);

    // Convert lite parser result to AST format
    if ('event' in result) {
      // Event handler
      return {
        type: 'eventHandler',
        event: result.event,
        filter: result.filter,
        commands: result.commands.map(cmd => this.convertCommand(cmd)),
      } as ASTNode;
    }

    // Command sequence
    if (Array.isArray(result)) {
      if (result.length === 1) {
        return this.convertCommand(result[0]);
      }
      return {
        type: 'sequence',
        commands: result.map(cmd => this.convertCommand(cmd)),
      } as ASTNode;
    }

    return this.convertCommand(result);
  }

  private convertCommand(cmd: { name: string; args: string[]; target?: string }): CommandNode {
    return {
      type: 'command',
      name: cmd.name,
      args: cmd.args.map(arg => ({
        type: 'literal',
        value: arg,
      })),
      ...(cmd.target && {
        target: {
          type: 'selector',
          value: cmd.target,
        },
      }),
    } as CommandNode;
  }

  parseCommands(code: string): (CommandNode | ASTNode)[] {
    const result = this.parse(code);
    if (result.type === 'sequence' && 'commands' in result) {
      return (result as any).commands;
    }
    return [result];
  }

  supports(syntax: string): boolean {
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
 * Regex parser instance - smallest parser, supports 8 commands.
 *
 * Use for minimal bundle size when you only need basic functionality.
 */
export const regexParser: ParserInterface = new RegexParserImpl();

/**
 * Factory function for creating regex parser instances.
 */
export function createRegexParser(): ParserInterface {
  return new RegexParserImpl();
}
