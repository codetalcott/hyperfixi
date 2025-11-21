/**
 * MakeCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original MakeCommand
 */

import { MakeCommand as MakeCommandV1 } from '../../commands/creation/make';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface MakeCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced MakeCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original MakeCommand and adds argument parsing
 * logic that was previously in Runtime.buildCommandInputFromModifiers() (lines 634-639).
 */
export class MakeCommand extends MakeCommandV1 {
  /**
   * Parse raw AST input into structured input object
   *
   * Make command syntax: "make (a|an) <element-type>"
   *
   * This mirrors Runtime.buildCommandInputFromModifiers() logic (lines 634-639):
   * - args[0]: element type (evaluated)
   * - modifiers.a or modifiers.an: article indicator
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { type, article }
   */
  async parseInput(
    raw: MakeCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any> {
    // Evaluate element type from first argument
    const type = raw.args.length > 0 ? await evaluator.evaluate(raw.args[0], context) : undefined;

    // Check for 'a' or 'an' article modifier
    const article = raw.modifiers.a || raw.modifiers.an;

    // Return structured input for execute()
    return {
      type,
      article: article ? 'a' : undefined,
    };
  }

  // execute() is inherited from MakeCommandV1 - no changes needed!
}

/**
 * Factory function for creating MakeCommand instances
 * Maintains compatibility with existing command registration
 */
export function createMakeCommand(): MakeCommand {
  return new MakeCommand();
}
