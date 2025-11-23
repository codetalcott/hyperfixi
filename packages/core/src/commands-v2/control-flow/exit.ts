/**
 * ExitCommand - Standalone V2 Implementation
 *
 * Exits early from an event handler or behavior without returning a value
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Early termination of event handlers
 * - No return value (unlike return command)
 * - Throws EXIT_COMMAND error caught by runtime
 * - Useful for conditional early exits
 *
 * Syntax:
 *   exit
 *
 * @example
 *   exit
 *   if no draggedItem exit
 *   if condition is false exit
 *   on click if disabled exit
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for ExitCommand
 */
export interface ExitCommandInput {
  // Exit takes no parameters
}

/**
 * Output from Exit command execution
 */
export interface ExitCommandOutput {
  exited: boolean;
  timestamp: number;
}

/**
 * ExitCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by having zero external dependencies.
 *
 * V1 Size: 77 lines (minimal command)
 * V2 Target: ~80 lines (similar size, standalone pattern)
 */
export class ExitCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'exit';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Immediately terminate execution of the current event handler or behavior',
    syntax: ['exit'],
    examples: [
      'exit',
      'if no draggedItem exit',
      'if condition is false exit',
      'on click if disabled exit',
    ],
    category: 'control-flow',
    sideEffects: ['control-flow'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Exit command takes no arguments, so parseInput is trivial.
   *
   * @param raw - Raw command node (unused for exit)
   * @param evaluator - Expression evaluator (unused)
   * @param context - Execution context (unused)
   * @returns Empty input object
   */
  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<ExitCommandInput> {
    // Exit command takes no arguments
    return {};
  }

  /**
   * Execute the exit command
   *
   * Throws an EXIT_COMMAND error to signal early termination.
   * Similar to return but without a value.
   *
   * The error is caught by the runtime and stops execution
   * of the current command sequence without propagating further.
   *
   * @param input - Empty input object
   * @param context - Execution context (unused)
   * @returns Never returns - always throws
   * @throws Error with EXIT_COMMAND message
   */
  async execute(
    _input: ExitCommandInput,
    _context: TypedExecutionContext
  ): Promise<ExitCommandOutput> {
    // Throw special exit error
    const exitError = new Error('EXIT_COMMAND');
    (exitError as any).isExit = true;
    (exitError as any).returnValue = undefined;
    (exitError as any).timestamp = Date.now();

    throw exitError;
  }
}

/**
 * Factory function to create ExitCommand instance
 */
export function createExitCommand(): ExitCommand {
  return new ExitCommand();
}
