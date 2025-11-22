/**
 * BreakCommand - Standalone V2 Implementation
 *
 * Exits from the current loop
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Exits from repeat loops (for, times, while, until, forever)
 * - Execution continues after the loop
 * - Works with all loop types
 *
 * Syntax:
 *   break
 *
 * @example
 *   break
 *   if found then break
 *   repeat for item in items { if item == target then break }
 */

import type { TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator, ExecutionContext } from '../../core/expression-evaluator';

/**
 * Typed input for BreakCommand (no arguments)
 */
export interface BreakCommandInput {
  // No input required
}

/**
 * Output from Break command execution
 * (Never actually returned - break throws an error)
 */
export interface BreakCommandOutput {
  broken: true;
  timestamp: number;
}

/**
 * BreakCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 70 lines (simple control flow)
 * V2 Size: ~65 lines (7% reduction, all features preserved)
 */
export class BreakCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'break';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Exit from the current loop (repeat, for, while, until)',
    syntax: ['break'],
    examples: [
      'break',
      'if found then break',
      'unless isValid then break',
      'repeat for item in items { if item == target then break }',
    ],
    category: 'control-flow',
    sideEffects: ['control-flow'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Break command takes no arguments.
   *
   * @param _raw - Raw command node (unused)
   * @param _evaluator - Expression evaluator (unused)
   * @param _context - Execution context (unused)
   * @returns Empty input object
   */
  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<BreakCommandInput> {
    // Break takes no arguments
    return {};
  }

  /**
   * Execute the break command
   *
   * Throws a special error that is caught by loop commands.
   * This error signals to the loop handler to exit the loop.
   *
   * @param _input - Empty input
   * @param _context - Execution context (unused)
   * @throws Error with "BREAK" message to signal loop exit
   */
  async execute(
    _input: BreakCommandInput,
    _context: TypedExecutionContext
  ): Promise<BreakCommandOutput> {
    // Throw a special break error that can be caught and handled by loop commands
    const breakError = new Error('BREAK_LOOP');
    (breakError as any).isBreak = true;
    throw breakError;
  }
}

/**
 * Factory function to create BreakCommand instance
 */
export function createBreakCommand(): BreakCommand {
  return new BreakCommand();
}
