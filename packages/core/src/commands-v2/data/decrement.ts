/**
 * DecrementCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original DecrementCommand
 */

import { DecrementCommand as DecrementCommandV1 } from '../../commands/data/decrement';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface DecrementCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced DecrementCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original DecrementCommand and adds argument parsing
 * logic that was previously in Runtime.executeEnhancedCommand() (lines 1391-1445).
 */
export class DecrementCommand extends DecrementCommandV1 {
  /**
   * Parse raw AST input into structured input object
   *
   * Decrement command syntax: "decrement <target> [by <amount>]"
   * Also supports: "decrement global <target> by <amount>"
   *
   * This mirrors Runtime.executeEnhancedCommand() logic (lines 1391-1445):
   * - Extract target from args[0] (identifier name, literal value, or evaluated)
   * - Extract scope if present (from :variable syntax or 'global' keyword)
   * - Find amount from remaining args (default: 1)
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { target, amount, scope? }
   */
  async parseInput(
    raw: DecrementCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any> {
    if (!raw.args || raw.args.length === 0) {
      return { target: undefined, amount: 1 };
    }

    // Helper to get node type
    const nodeType = (node: ASTNode): string => {
      if (!node || typeof node !== 'object') return 'unknown';
      return (node as any).type || 'unknown';
    };

    // Extract target from first argument
    const targetArg = raw.args[0];
    let target: string | number;
    let extractedScope: 'global' | 'local' | undefined;

    // Extract variable name AND scope from AST node without fully evaluating
    if (nodeType(targetArg) === 'identifier') {
      target = (targetArg as any).name;
      // Extract scope if present (from :variable syntax)
      if ((targetArg as any).scope) {
        extractedScope = (targetArg as any).scope;
      }
    } else if (nodeType(targetArg) === 'literal') {
      target = (targetArg as any).value;
    } else {
      // Fallback: evaluate if it's a complex expression (e.g., selector)
      const evaluated = await evaluator.evaluate(targetArg, context);
      // If evaluation returns an array (from selector), extract first element
      if (Array.isArray(evaluated) && evaluated.length > 0) {
        target = evaluated[0];
      } else {
        target = evaluated as string | number;
      }
    }

    // Check for "by <amount>" pattern and "global" scope marker
    let amount = 1;
    let scope: 'global' | 'local' | undefined = extractedScope;

    // Check each arg to find amount and/or global scope
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
        // Non-literal, evaluate it (could be expression for amount)
        const evaluated = await evaluator.evaluate(arg, context);
        if (typeof evaluated === 'number') {
          amount = evaluated;
        }
      }
    }

    // Return structured input for execute()
    return {
      target,
      amount,
      ...(scope && { scope }),
    };
  }

  // execute() is inherited from DecrementCommandV1 - no changes needed!
}

/**
 * Factory function for creating DecrementCommand instances
 * Maintains compatibility with existing command registration
 */
export function createDecrementCommand(): DecrementCommand {
  return new DecrementCommand();
}
