/**
 * Shared URL argument parsing for push-url and replace-url commands
 */

import type { ExecutionContext, ExpressionNode } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { validateUrl } from './url-validation';

export interface UrlCommandInput {
  url: string;
  title?: string;
  state?: Record<string, unknown>;
}

export async function parseUrlArguments(
  raw: { args: ASTNode[]; modifiers?: Record<string, ExpressionNode> },
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  commandName: string
): Promise<UrlCommandInput> {
  // The parser emits `args: [url]` and `modifiers.title` (Arc 3 step 5);
  // the `url` / `with title` words never reach here.
  const { args, modifiers } = raw;
  if (!args || args.length === 0) {
    throw new Error(`${commandName} command requires a URL argument`);
  }
  const url = String(await evaluator.evaluate(args[0], context));
  const title = modifiers?.title
    ? String(await evaluator.evaluate(modifiers.title, context))
    : undefined;

  const validatedUrl = validateUrl(url, commandName, `argCount=${args.length}`);

  return { url: validatedUrl, title };
}
