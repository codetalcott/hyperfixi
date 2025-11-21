/**
 * WaitCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original WaitCommand
 */

import { WaitCommand as WaitCommandV1 } from '../../commands/async/wait';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface WaitCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced WaitCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original WaitCommand and adds argument parsing
 * logic that was previously in Runtime.executeCommand().
 */
export class WaitCommand extends WaitCommandV1 {
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
    raw: WaitCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    // Wait command syntax: "wait <duration> [ms|s]"
    // Evaluate arguments to get duration values
    //
    // This mirrors Runtime.executeCommand() logic (lines 1697-1702):
    //   const waitArgs = await Promise.all(
    //     rawArgs.map((arg: ASTNode) => this.execute(arg, context))
    //   );

    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate each argument using the expression evaluator
    const evaluatedArgs = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );

    return evaluatedArgs;
  }

  // execute() is inherited from WaitCommandV1 - no changes needed!
}

/**
 * Factory function for creating WaitCommand instances
 * Maintains compatibility with existing command registration
 */
export function createWaitCommand(): WaitCommand {
  return new WaitCommand();
}
