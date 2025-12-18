/**
 * HistoryCommand - Consolidated Push/Replace URL Implementation
 *
 * Handles both push and replace URL operations via unified command.
 * Uses Stage 3 decorators with alias support.
 *
 * Syntax:
 *   push url "/path"
 *   push url "/page" with title "Page Title"
 *   replace url "/path"
 *   replace url "/page" with title "Page Title"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';
import { parseUrlArguments, type UrlCommandInput } from '../helpers/url-argument-parser';

/**
 * History operation mode
 */
export type HistoryMode = 'push' | 'replace';

/**
 * Typed input for HistoryCommand
 */
export interface HistoryCommandInput extends UrlCommandInput {
  mode: HistoryMode;
}

/**
 * Output from history command
 */
export interface HistoryCommandOutput {
  url: string;
  title?: string;
  mode: HistoryMode;
}

/**
 * HistoryCommand - Unified push/replace URL handler
 *
 * Consolidates PushUrlCommand and ReplaceUrlCommand into single implementation.
 * Registered under both 'push' and 'replace' names via aliases.
 */
@meta({
  description: 'Modify browser history URL without page reload',
  syntax: [
    'push url <url>',
    'push url <url> with title <title>',
    'replace url <url>',
    'replace url <url> with title <title>',
  ],
  examples: [
    'push url "/page/2"',
    'push url "/search" with title "Search Results"',
    'replace url "/search?q=test"',
    'replace url "/page" with title "Updated Page"',
  ],
  sideEffects: ['navigation'],
  aliases: ['replace'],
})
@command({ name: 'push', category: 'navigation' })
export class HistoryCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode>; commandName?: string },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HistoryCommandInput> {
    // Detect mode from command name
    const mode: HistoryMode = raw.commandName?.toLowerCase().includes('replace') ? 'replace' : 'push';
    const baseInput = await parseUrlArguments(raw.args, evaluator, context, `${mode} url`);
    return { ...baseInput, mode };
  }

  async execute(
    input: HistoryCommandInput,
    _context: TypedExecutionContext
  ): Promise<HistoryCommandOutput> {
    const { url, title, state, mode } = input;

    if (mode === 'push') {
      window.history.pushState(state || null, '', url);
    } else {
      window.history.replaceState(state || null, '', url);
    }

    if (title) {
      document.title = title;
    }

    const eventName = mode === 'push' ? 'hyperfixi:pushurl' : 'hyperfixi:replaceurl';
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: { url, title, state },
    }));

    return { url, title, mode };
  }
}

// Backwards compatibility exports
export { HistoryCommand as PushUrlCommand };
export { HistoryCommand as ReplaceUrlCommand };

// Type aliases for backwards compatibility
export type PushUrlCommandInput = HistoryCommandInput;
export type ReplaceUrlCommandInput = HistoryCommandInput;
export type PushUrlCommandOutput = HistoryCommandOutput;
export type ReplaceUrlCommandOutput = HistoryCommandOutput;

// Factory functions
export const createHistoryCommand = createFactory(HistoryCommand);
export const createPushUrlCommand = createFactory(HistoryCommand);
export const createReplaceUrlCommand = createFactory(HistoryCommand);

export default HistoryCommand;
