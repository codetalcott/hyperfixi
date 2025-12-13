/**
 * ReplaceUrlCommand - Decorated Implementation
 *
 * Replace current URL in browser history (htmx 4 pattern).
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   replace url "/path"
 *   replace url "/page" with title "Page Title"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';
import { parseUrlArguments, type UrlCommandInput } from '../helpers/url-argument-parser';

/**
 * Typed input for ReplaceUrlCommand
 */
export interface ReplaceUrlCommandInput extends UrlCommandInput {}

/**
 * Output from replace url command
 */
export interface ReplaceUrlCommandOutput {
  url: string;
  title?: string;
}

/**
 * ReplaceUrlCommand - Replace URL in browser history
 *
 * Before: 175 lines
 * After: ~65 lines (63% reduction)
 */
@meta({
  description: 'Replace current URL in browser history without page reload',
  syntax: ['replace url <url>', 'replace url <url> with title <title>'],
  examples: ['replace url "/search?q=test"', 'replace url "/page" with title "Updated Page"'],
  sideEffects: ['navigation'],
})
@command({ name: 'replace', category: 'navigation' })
export class ReplaceUrlCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ReplaceUrlCommandInput> {
    return parseUrlArguments(raw.args, evaluator, context, 'replace url');
  }

  async execute(
    input: ReplaceUrlCommandInput,
    _context: TypedExecutionContext
  ): Promise<ReplaceUrlCommandOutput> {
    const { url, title, state } = input;

    window.history.replaceState(state || null, '', url);

    if (title) {
      document.title = title;
    }

    window.dispatchEvent(new CustomEvent('hyperfixi:replaceurl', {
      detail: { url, title, state },
    }));

    return { url, title };
  }
}

export const createReplaceUrlCommand = createFactory(ReplaceUrlCommand);
export default ReplaceUrlCommand;
