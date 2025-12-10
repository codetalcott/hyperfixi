/**
 * Shared URL argument parsing for push-url and replace-url commands
 */

import type { ExecutionContext } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { validateUrl } from './url-validation';

export interface UrlCommandInput {
  url: string;
  title?: string;
  state?: Record<string, unknown>;
}

const KEYWORDS = ['url', 'with', 'title'];

export async function parseUrlArguments(
  args: ASTNode[],
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  commandName: string
): Promise<UrlCommandInput> {
  if (!args || args.length === 0) {
    throw new Error(`${commandName} command requires a URL argument`);
  }

  const evaluatedArgs: unknown[] = [];
  const argStrings: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as Record<string, unknown>;
    const argType = arg?.type || 'unknown';
    const argName = arg?.name as string | undefined;

    if (argType === 'identifier' && argName && KEYWORDS.includes(argName.toLowerCase())) {
      evaluatedArgs.push(argName.toLowerCase());
      argStrings.push(argName.toLowerCase());
    } else {
      const evaluated = await evaluator.evaluate(arg, context);
      evaluatedArgs.push(evaluated);
      if (typeof evaluated === 'string') {
        argStrings.push(evaluated.toLowerCase());
      }
    }
  }

  const urlKeywordIndex = argStrings.findIndex(s => s === 'url');
  const withIndex = argStrings.findIndex(s => s === 'with');
  const titleIndex = argStrings.findIndex(s => s === 'title');

  const debugInfo = `urlKeywordIndex=${urlKeywordIndex}, argCount=${evaluatedArgs.length}`;

  let url: string;
  if (urlKeywordIndex !== -1 && evaluatedArgs.length > urlKeywordIndex + 1) {
    url = String(evaluatedArgs[urlKeywordIndex + 1]);
  } else if (evaluatedArgs.length >= 1) {
    url = String(evaluatedArgs[0]);
  } else {
    throw new Error(`${commandName} command: URL is required. Debug: ${debugInfo}`);
  }

  let title: string | undefined;
  if (withIndex !== -1 && titleIndex !== -1 && titleIndex > withIndex) {
    if (evaluatedArgs.length > titleIndex + 1) {
      title = String(evaluatedArgs[titleIndex + 1]);
    }
  }

  const validatedUrl = validateUrl(url, commandName, debugInfo);

  return { url: validatedUrl, title };
}
