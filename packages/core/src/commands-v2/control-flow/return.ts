/**
 * ReturnCommand - Standalone V2 Implementation
 *
 * Returns a value from a command sequence or function
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Returns value from command sequence
 * - Terminates execution immediately
 * - Sets value in context.it and context.returnValue
 * - Throws RETURN_VALUE error for runtime to catch
 *
 * Syntax:
 *   return
 *   return <value>
 *
 * @example
 *   return
 *   return 42
 *   return user.name
 *   if found then return result else return null
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for ReturnCommand
 */
export interface ReturnCommandInput {
  /** Optional return value */
  value?: any;
}

/**
 * Output from Return command execution
 * (Never actually returned - return throws an error)
 */
export interface ReturnCommandOutput {
  returnValue: any;
  timestamp: number;
}

/**
 * ReturnCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 101 lines (simple control flow)
 * V2 Size: ~95 lines (6% reduction, all features preserved)
 */
export class ReturnCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'return';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Return a value from a command sequence or function, terminating execution',
    syntax: [
      'return',
      'return <value>',
    ],
    examples: [
      'return',
      'return 42',
      'return user.name',
      'return "success"',
      'if found then return result else return null',
    ],
    category: 'control-flow',
    sideEffects: ['control-flow', 'context-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Return can have zero or one argument (the return value).
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ReturnCommandInput> {
    // Return can have an optional value argument
    if (!raw.args || raw.args.length === 0) {
      return { value: undefined };
    }

    // Evaluate the return value
    const value = await evaluator.evaluate(raw.args[0], context);

    return { value };
  }

  /**
   * Execute the return command
   *
   * Sets the return value in context and throws a special error
   * that is caught by the runtime to terminate execution.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @throws Error with "RETURN_VALUE" message to signal return
   */
  async execute(
    input: ReturnCommandInput,
    context: TypedExecutionContext
  ): Promise<ReturnCommandOutput> {
    const { value } = input;

    // Set the return value in context if it supports it
    if ('returnValue' in context) {
      (context as any).returnValue = value;
    }

    // Also set it as the result (it)
    Object.assign(context, { it: value });

    // Throw a special return error that can be caught and handled by the runtime
    const returnError = new Error('RETURN_VALUE');
    (returnError as any).isReturn = true;
    (returnError as any).returnValue = value;
    throw returnError;
  }
}

/**
 * Factory function to create ReturnCommand instance
 */
export function createReturnCommand(): ReturnCommand {
  return new ReturnCommand();
}
