/**
 * GoCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original GoCommand
 */

import { GoCommand as GoCommandV1 } from '../../commands/navigation/go';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface GoCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced GoCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original GoCommand and adds argument parsing
 * logic for evaluating navigation arguments.
 */
export class GoCommand extends GoCommandV1 {
  /**
   * Parse raw AST input into evaluated arguments
   *
   * Go command syntax patterns:
   * - "go back" - Browser history navigation
   * - "go to url <url> [in new window]" - URL navigation
   * - "go to [position] [of] <element> [offset] [behavior]" - Element scrolling
   *
   * The Runtime doesn't have special parsing for go command, so we evaluate
   * all arguments normally. The GoCommand's execute method handles the
   * complex pattern matching internally.
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Array of evaluated arguments for execute(context, ...args)
   */
  async parseInput(
    raw: GoCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate all arguments - the GoCommand handles complex pattern matching
    const evaluatedArgs = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );

    return evaluatedArgs;
  }

  // execute() is inherited from GoCommandV1 - no changes needed!
}

/**
 * Factory function for creating GoCommand instances
 * Maintains compatibility with existing command registration
 */
export function createGoCommand(): GoCommand {
  return new GoCommand();
}
