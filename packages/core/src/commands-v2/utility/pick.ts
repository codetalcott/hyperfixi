/**
 * PickCommand - Standalone V2 Implementation
 *
 * Selects a random element from a collection
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Random selection from array
 * - Direct item list or array-based picking
 * - Result stored in context.it
 * - Index tracking
 *
 * Syntax:
 *   pick <item1>, <item2>, ...
 *   pick from <array>
 *
 * @example
 *   pick "red", "green", "blue"
 *   pick from colors
 *   pick 1, 2, 3, 4, 5
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for PickCommand
 */
export interface PickCommandInput {
  /** Direct item list */
  items?: any[];
  /** Array to pick from */
  array?: any[];
}

/**
 * Output from pick command execution
 */
export interface PickCommandOutput {
  selectedItem: any;
  selectedIndex: number;
  sourceLength: number;
  sourceType: 'items' | 'array';
}

/**
 * PickCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 195 lines
 * V2 Target: ~165 lines (inline utilities, standalone)
 */
export class PickCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'pick';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Select a random element from a collection',
    syntax: ['pick <item1>, <item2>, ...', 'pick from <array>'],
    examples: [
      'pick "red", "green", "blue"',
      'pick from colors',
      'pick 1, 2, 3, 4, 5',
      'pick from document.querySelectorAll(".option")',
    ],
    category: 'utility',
    sideEffects: ['random-selection'],
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
  ): Promise<PickCommandInput> {
    // Check for "from" modifier (pick from array)
    if (raw.modifiers?.from) {
      const array = await evaluator.evaluate(raw.modifiers.from, context);

      if (!Array.isArray(array)) {
        throw new Error('pick from requires an array');
      }

      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }

      return { array };
    }

    // Direct item list (pick item1, item2, ...)
    if (raw.args.length === 0) {
      throw new Error('pick command requires items to choose from');
    }

    const items = await Promise.all(
      raw.args.map((arg) => evaluator.evaluate(arg, context))
    );

    return { items };
  }

  /**
   * Execute the pick command
   *
   * Selects a random item from the collection.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Pick operation result
   */
  async execute(
    input: PickCommandInput,
    context: TypedExecutionContext
  ): Promise<PickCommandOutput> {
    const { items, array } = input;

    // Determine source
    const sourceArray = items || array!;
    const sourceType: 'items' | 'array' = items ? 'items' : 'array';

    // Pick random index
    const selectedIndex = Math.floor(Math.random() * sourceArray.length);
    const selectedItem = sourceArray[selectedIndex];

    // Set result in context
    Object.assign(context, { it: selectedItem });

    return {
      selectedItem,
      selectedIndex,
      sourceLength: sourceArray.length,
      sourceType,
    };
  }
}

/**
 * Factory function to create PickCommand instance
 */
export function createPickCommand(): PickCommand {
  return new PickCommand();
}
