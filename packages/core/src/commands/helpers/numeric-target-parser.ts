/**
 * Shared Parser for Numeric Target Commands (increment/decrement)
 *
 * Extracts common parsing logic to eliminate duplication between
 * increment and decrement commands.
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface NumericTargetRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Typed input after parsing
 */
export interface NumericTargetInput {
  target: string | HTMLElement | number;
  property?: string;
  scope?: 'global' | 'local';
  amount: number;
}

/**
 * Helper to get node type safely
 */
function getNodeType(node: ASTNode): string {
  if (!node || typeof node !== 'object') return 'unknown';
  return (node as any).type || 'unknown';
}

/**
 * Parse raw AST input into structured NumericTargetInput
 *
 * This is the shared parser for increment/decrement commands.
 * Both commands have identical parsing logic - only the execute
 * operation differs (+ vs -).
 *
 * @param raw - Raw AST input from parser
 * @param evaluator - Expression evaluator
 * @param context - Execution context
 * @param commandName - Command name for error messages
 * @returns Parsed input with target, amount, and optional scope
 */
export async function parseNumericTargetInput(
  raw: NumericTargetRawInput,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  commandName: string
): Promise<NumericTargetInput> {
  if (!raw.args || raw.args.length === 0) {
    throw new Error(`${commandName} command requires a target`);
  }

  // Extract target from first argument
  const targetArg = raw.args[0];
  let target: string | number;
  let extractedScope: 'global' | 'local' | undefined;

  // Extract variable name AND scope from AST node without fully evaluating
  const nodeType = getNodeType(targetArg);

  if (nodeType === 'identifier') {
    target = (targetArg as any).name;
    if ((targetArg as any).scope) {
      extractedScope = (targetArg as any).scope;
    }
  } else if (nodeType === 'literal') {
    target = (targetArg as any).value;
  } else {
    const evaluated = await evaluator.evaluate(targetArg, context);
    if (Array.isArray(evaluated) && evaluated.length > 0) {
      target = evaluated[0];
    } else {
      target = evaluated as string | number;
    }
  }

  // Check for "by <amount>" pattern and "global" scope marker
  let amount = 1;
  let scope: 'global' | 'local' | undefined = extractedScope;

  for (let i = 1; i < raw.args.length; i++) {
    const arg = raw.args[i];
    if (arg && (arg as any).type === 'literal') {
      const literalValue = (arg as any).value;
      if (literalValue === 'global') {
        scope = 'global';
      } else if (typeof literalValue === 'number') {
        amount = literalValue;
      }
    } else if (arg && (arg as any).type !== 'literal') {
      const evaluated = await evaluator.evaluate(arg, context);
      if (typeof evaluated === 'number') {
        amount = evaluated;
      }
    }
  }

  return {
    target,
    amount,
    ...(scope && { scope }),
  };
}
