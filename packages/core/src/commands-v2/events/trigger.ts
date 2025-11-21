/**
 * TriggerCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original TriggerCommand
 */

import { TriggerCommand as TriggerCommandV1 } from '../../commands/events/trigger';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface TriggerCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced TriggerCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original TriggerCommand and adds argument parsing
 * logic that was previously in Runtime.executeCommand().
 */
export class TriggerCommand extends TriggerCommandV1 {
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
    raw: TriggerCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    // Trigger command syntax: "trigger <event-name> [on <target>]"
    // Evaluate arguments to get event name and target

    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate each argument using the expression evaluator
    const evaluatedArgs = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );

    return evaluatedArgs;
  }

  // execute() is inherited from TriggerCommandV1 - no changes needed!
}

/**
 * Factory function for creating TriggerCommand instances
 * Maintains compatibility with existing command registration
 */
export function createTriggerCommand(): TriggerCommand {
  return new TriggerCommand();
}
