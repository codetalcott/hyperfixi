/**
 * SetCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original SetCommand
 */

import { SetCommand as SetCommandV1 } from '../../commands/data/set';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface SetCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced SetCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original SetCommand and adds argument parsing
 * logic that was previously in CommandAdapter (lines 126-218).
 */
export class SetCommand extends SetCommandV1 {
  /**
   * Parse raw AST input into structured input object
   *
   * Set command syntax patterns:
   * - "set <target> to <value>"
   * - "set global <target> to <value>"
   * - "set @attribute to <value>"
   * - "set my property to <value>"
   * - "set the property of selector to <value>"
   *
   * This mirrors CommandAdapter logic (lines 126-218):
   * - Extract target from args[0] (may be simple string, scoped var, or AST node)
   * - Extract scope if present (global/local)
   * - Extract value from modifiers.to or args[1]
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { target, value, toKeyword, scope }
   */
  async parseInput(
    raw: SetCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any> {
    if (!raw.args || raw.args.length === 0) {
      return {
        target: undefined,
        value: undefined,
        toKeyword: 'to' as const,
        scope: undefined,
      };
    }

    // Extract target node (first argument)
    const targetNode = raw.args[0];

    // Evaluate target to get the actual target value
    // This handles: variables, attributes (@attr), possessives (my property), etc.
    const evaluatedTarget = await evaluator.evaluate(targetNode, context);

    // Extract scope from target node if present
    let scope: 'global' | 'local' | undefined;
    if (targetNode && typeof targetNode === 'object') {
      const node = targetNode as any;

      // Check for _isScoped marker from runtime
      if (node._isScoped) {
        scope = node.scope;
      }
      // Check for scope property in AST
      else if ('scope' in node) {
        scope = node.scope;
      }
    }

    // Extract value from 'to' modifier or second argument
    let value: any;
    if (raw.modifiers.to) {
      // Value is in the 'to' modifier
      value = await evaluator.evaluate(raw.modifiers.to, context);
    } else if (raw.args.length >= 2) {
      // Fallback: value is second argument
      value = await evaluator.evaluate(raw.args[1], context);
    } else {
      value = undefined;
    }

    // Return structured input for execute()
    return {
      target: evaluatedTarget,
      value: value,
      toKeyword: 'to' as const,
      scope: scope,
    };
  }

  // execute() is inherited from SetCommandV1 - no changes needed!
}

/**
 * Factory function for creating SetCommand instances
 * Maintains compatibility with existing command registration
 */
export function createSetCommand(): SetCommand {
  return new SetCommand();
}
