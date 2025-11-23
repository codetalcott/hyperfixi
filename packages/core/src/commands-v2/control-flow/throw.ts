/**
 * ThrowCommand - Standalone V2 Implementation
 *
 * Throws an error with a specified message, terminating execution
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Throw errors with custom messages
 * - Support Error objects or strings
 * - Immediate execution termination
 * - Error propagation up call stack
 *
 * Syntax:
 *   throw <message>
 *
 * @example
 *   throw "Invalid input"
 *   if not valid then throw "Validation failed"
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for ThrowCommand
 */
export interface ThrowCommandInput {
  /** Error message or Error object to throw */
  message: string | Error | any;
}

/**
 * Output from throw command (never returned as throw always throws)
 */
export interface ThrowCommandOutput {
  error: Error;
}

/**
 * ThrowCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 127 lines
 * V2 Target: ~110 lines (inline utilities, standalone)
 */
export class ThrowCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'throw';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Throw an error with a specified message',
    syntax: ['throw <message>'],
    examples: [
      'throw "Invalid input"',
      'throw new Error("Custom error")',
      'if not valid then throw "Validation failed"',
    ],
    category: 'control-flow',
    sideEffects: ['error-throwing', 'execution-termination'],
  };

  /**
   * Parse raw AST nodes into typed command input
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
  ): Promise<ThrowCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('throw command requires a message or error object');
    }

    // First arg is the message/error
    const message = await evaluator.evaluate(raw.args[0], context);

    return {
      message,
    };
  }

  /**
   * Execute the throw command
   *
   * Throws an error, immediately terminating execution.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Never returns (always throws)
   */
  async execute(
    input: ThrowCommandInput,
    _context: TypedExecutionContext
  ): Promise<ThrowCommandOutput> {
    const { message } = input;

    // Create appropriate error object
    let errorToThrow: Error;

    if (message instanceof Error) {
      // Use the error directly
      errorToThrow = message;
    } else if (typeof message === 'string') {
      // Create a new error with the message
      errorToThrow = new Error(message);
    } else {
      // Convert other types to string for error message
      errorToThrow = new Error(String(message));
    }

    // Throw the error (execution stops here)
    throw errorToThrow;
  }
}

/**
 * Factory function to create ThrowCommand instance
 */
export function createThrowCommand(): ThrowCommand {
  return new ThrowCommand();
}
