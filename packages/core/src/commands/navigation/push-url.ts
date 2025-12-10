/**
 * PushUrlCommand - Decorated Implementation
 *
 * Push URL to browser history (htmx 4 pattern).
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   push url "/path"
 *   push url "/page" with title "Page Title"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory } from '../decorators';
import { parseUrlArguments, type UrlCommandInput } from '../helpers/url-argument-parser';

/**
 * Typed input for PushUrlCommand
 */
export interface PushUrlCommandInput extends UrlCommandInput {}

/**
 * Output from push url command
 */
export interface PushUrlCommandOutput {
  url: string;
  title?: string;
}

/**
 * PushUrlCommand - Push URL to browser history
 *
 * Before: 175 lines
 * After: ~65 lines (63% reduction)
 */
@meta({
  description: 'Push URL to browser history without page reload',
  syntax: ['push url <url>', 'push url <url> with title <title>'],
  examples: ['push url "/page/2"', 'push url "/search" with title "Search Results"'],
  sideEffects: ['navigation'],
})
@command({ name: 'push', category: 'navigation' })
export class PushUrlCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PushUrlCommandInput> {
    return parseUrlArguments(raw.args, evaluator, context, 'push url');
  }

  async execute(
    input: PushUrlCommandInput,
    _context: TypedExecutionContext
  ): Promise<PushUrlCommandOutput> {
    const { url, title, state } = input;

    window.history.pushState(state || null, '', url);

    if (title) {
      document.title = title;
    }

    window.dispatchEvent(new CustomEvent('hyperfixi:pushurl', {
      detail: { url, title, state },
    }));

    return { url, title };
  }
}

export const createPushUrlCommand = createFactory(PushUrlCommand);
export default PushUrlCommand;
