/**
 * SendCommand V2 - Enhanced with parseInput() for RuntimeBase
 * Non-destructive wrapper that extends the original SendCommand
 */

import { SendCommand as SendCommandV1 } from '../../commands/events/send';
import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface SendCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Enhanced SendCommand with parseInput() method for tree-shakable RuntimeBase
 *
 * This wrapper extends the original SendCommand and adds argument parsing
 * logic that was previously in Runtime.buildCommandInputFromModifiers() (lines 641-646).
 */
export class SendCommand extends SendCommandV1 {
  /**
   * Parse raw AST input into evaluated arguments
   *
   * Send command syntax: "send <event-name> [<event-detail>] [to <target>]"
   * Alternative syntax: "trigger <event-name> [on <target>]"
   *
   * This mirrors Runtime.buildCommandInputFromModifiers() logic (lines 641-646):
   * - args[0]: event name (evaluated)
   * - modifiers.to: target element (evaluated)
   * - Rest of args: event detail and additional arguments (evaluated)
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Array of evaluated arguments for execute(context, ...args)
   */
  async parseInput(
    raw: SendCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    if (!raw.args || raw.args.length === 0) {
      return [];
    }

    // Evaluate event name (first argument)
    const eventName = await evaluator.evaluate(raw.args[0], context);

    // Evaluate remaining arguments (event detail, etc.)
    const restArgs = [];
    for (let i = 1; i < raw.args.length; i++) {
      const evaluated = await evaluator.evaluate(raw.args[i], context);
      restArgs.push(evaluated);
    }

    // Evaluate target from 'to' or 'on' modifier
    if (raw.modifiers.to) {
      const target = await evaluator.evaluate(raw.modifiers.to, context);
      restArgs.push('to', target);
    } else if (raw.modifiers.on) {
      const target = await evaluator.evaluate(raw.modifiers.on, context);
      restArgs.push('on', target);
    }

    // Return args for execute(context, ...args)
    return [eventName, ...restArgs];
  }

  // execute() is inherited from SendCommandV1 - no changes needed!
}

/**
 * Factory function for creating SendCommand instances
 * Maintains compatibility with existing command registration
 */
export function createSendCommand(): SendCommand {
  return new SendCommand();
}
