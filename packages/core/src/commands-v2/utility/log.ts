/**
 * LogCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original LogCommand
 */

import { LogCommand as LogCommandV1 } from '../../commands/utility/log';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface LogCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced LogCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original LogCommand and adds argument parsing
 * logic that was previously in Runtime.executeCommand().
 */
export class LogCommand extends LogCommandV1 {
  /**
   * Parse raw AST input into evaluated arguments
   *
   * This method moves the argument evaluation logic from Runtime to the command,
   * enabling RuntimeBase to be generic and tree-shakable.
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Evaluated arguments ready for execute()
   */
  async parseInput(
    raw: LogCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    // Log command syntax: "log <expression> [<expression> ...]"
    // Evaluate all arguments to get values to log

    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate each argument using the expression evaluator
    const evaluatedArgs = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );

    return evaluatedArgs;
  }

  // execute() is inherited from LogCommandV1 - no changes needed!
}

/**
 * Factory function for creating LogCommand instances
 * Maintains compatibility with existing command registration
 */
export function createLogCommand(): LogCommand {
  return new LogCommand();
}
