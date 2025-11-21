/**
 * FetchCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original FetchCommand
 */

import { FetchCommand as FetchCommandV1 } from '../../commands/async/fetch';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface FetchCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced FetchCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original FetchCommand and adds argument parsing
 * logic that was previously in Runtime.buildCommandInputFromModifiers()
 * (lines 613-632).
 */
export class FetchCommand extends FetchCommandV1 {
  /**
   * Parse raw AST input into evaluated arguments
   *
   * Fetch command syntax: "fetch <url> [as <type>] [with <options>]"
   *
   * This mirrors Runtime.buildCommandInputFromModifiers() logic (lines 613-632):
   * - args[0]: URL (evaluated)
   * - modifiers.as: Response type (identifier extracted, NOT evaluated)
   * - modifiers.with: Options object (evaluated)
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { url, responseType, options }
   */
  async parseInput(
    raw: FetchCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any> {
    // Evaluate URL from first argument
    const url = raw.args.length > 0 ? await evaluator.evaluate(raw.args[0], context) : undefined;

    // Extract response type from 'as' modifier
    // Special handling: extract identifier name directly without evaluation
    let responseType: string | undefined;
    if (raw.modifiers.as) {
      const asNode = raw.modifiers.as as any;
      if (asNode.type === 'identifier') {
        // Use the identifier name as the response type (json, html, text, etc.)
        responseType = asNode.name;
      } else {
        // If it's not an identifier, evaluate it
        responseType = await evaluator.evaluate(raw.modifiers.as, context);
      }
    }

    // Evaluate options from 'with' modifier
    const options = raw.modifiers.with
      ? await evaluator.evaluate(raw.modifiers.with, context)
      : undefined;

    // Return structured input for execute()
    return { url, responseType, options };
  }

  // execute() is inherited from FetchCommandV1 - no changes needed!
}

/**
 * Factory function for creating FetchCommand instances
 * Maintains compatibility with existing command registration
 */
export function createFetchCommand(): FetchCommand {
  return new FetchCommand();
}
