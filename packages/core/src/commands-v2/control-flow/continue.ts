/**
 * ContinueCommand - Standalone V2 Implementation
 *
 * Skips to the next iteration of the current loop
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Skips remaining commands in current iteration
 * - Continues with next iteration in repeat loops
 * - Works with all loop types (for, times, while, until, forever)
 *
 * Syntax:
 *   continue
 *
 * @example
 *   continue
 *   if item.isInvalid then continue
 *   repeat for item in items { if item.skip then continue; process item }
 */

import type { TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator, ExecutionContext } from '../../core/expression-evaluator';

/**
 * Typed input for ContinueCommand (no arguments)
 */
export interface ContinueCommandInput {
  // No input required
}

/**
 * Output from Continue command execution
 * (Never actually returned - continue throws an error)
 */
export interface ContinueCommandOutput {
  continued: true;
  timestamp: number;
}

/**
 * ContinueCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 71 lines (simple control flow)
 * V2 Size: ~65 lines (8% reduction, all features preserved)
 */
export class ContinueCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'continue';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Skip to the next iteration of the current loop',
    syntax: ['continue'],
    examples: [
      'continue',
      'if item.isInvalid then continue',
      'unless item.isActive then continue',
      'repeat for item in items { if item.skip then continue; process item }',
    ],
    category: 'control-flow',
    sideEffects: ['control-flow'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Continue command takes no arguments.
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
  ): Promise<ContinueCommandInput> {
    // Continue takes no arguments
    return {};
  }

  /**
   * Execute the continue command
   *
   * Throws a special error that is caught by loop commands.
   * This error signals to the loop handler to skip to next iteration.
   *
   * @param _input - Empty input
   * @param _context - Execution context (unused)
   * @throws Error with "CONTINUE" message to signal iteration skip
   */
  async execute(
    _input: ContinueCommandInput,
    _context: TypedExecutionContext
  ): Promise<ContinueCommandOutput> {
    // Throw a special continue error that can be caught and handled by loop commands
    const continueError = new Error('CONTINUE_LOOP');
    (continueError as any).isContinue = true;
    throw continueError;
  }
}

/**
 * Factory function to create ContinueCommand instance
 */
export function createContinueCommand(): ContinueCommand {
  return new ContinueCommand();
}
