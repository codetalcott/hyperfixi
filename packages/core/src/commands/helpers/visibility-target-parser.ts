/**
 * Shared Parser for Visibility Commands (show/hide)
 *
 * Extracts common parsing logic to eliminate duplication.
 */

import type { ASTNode, ExecutionContext, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveTargetsFromArgs } from './element-resolution';

/**
 * Raw input from RuntimeBase
 */
export interface VisibilityRawInput {
  args: ASTNode[];
  modifiers: Record<string, ExpressionNode>;
}

/**
 * Typed input for visibility commands
 */
export interface VisibilityInput {
  targets: HTMLElement[];
}

/**
 * Parse raw AST input for show/hide commands
 *
 * @param raw - Raw AST input from parser
 * @param evaluator - Expression evaluator
 * @param context - Execution context
 * @param commandName - Command name for error messages
 * @returns Parsed input with resolved target elements
 */
export async function parseVisibilityInput(
  raw: VisibilityRawInput,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  commandName: string
): Promise<VisibilityInput> {
  const targets = await resolveTargetsFromArgs(raw.args, evaluator, context, commandName);
  return { targets };
}
