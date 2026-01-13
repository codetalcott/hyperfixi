/**
 * PickCommand - Decorated Implementation
 *
 * Selects a random element from a collection.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   pick <item1>, <item2>, ...
 *   pick from <array>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for PickCommand
 */
export interface PickCommandInput {
  items?: unknown[];
  array?: unknown[];
}

/**
 * Output from pick command execution
 */
export interface PickCommandOutput {
  selectedItem: unknown;
  selectedIndex: number;
  sourceLength: number;
  sourceType: 'items' | 'array';
}

/**
 * PickCommand - Selects random element from collection
 *
 * Before: 167 lines
 * After: ~75 lines (55% reduction)
 */
@meta({
  description: 'Select a random element from a collection',
  syntax: ['pick <item1>, <item2>, ...', 'pick from <array>'],
  examples: ['pick "red", "green", "blue"', 'pick from colors', 'pick 1, 2, 3, 4, 5'],
  sideEffects: ['random-selection'],
})
@command({ name: 'pick', category: 'utility' })
export class PickCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PickCommandInput> {
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

    if (raw.args.length === 0) {
      throw new Error('pick command requires items to choose from');
    }

    const items = await Promise.all(raw.args.map(arg => evaluator.evaluate(arg, context)));
    return { items };
  }

  async execute(
    input: PickCommandInput,
    context: TypedExecutionContext
  ): Promise<PickCommandOutput> {
    const { items, array } = input;
    const sourceArray = items || array!;
    const sourceType: 'items' | 'array' = items ? 'items' : 'array';

    const selectedIndex = Math.floor(Math.random() * sourceArray.length);
    const selectedItem = sourceArray[selectedIndex];

    Object.assign(context, { it: selectedItem });

    return { selectedItem, selectedIndex, sourceLength: sourceArray.length, sourceType };
  }
}

export const createPickCommand = createFactory(PickCommand);
export default PickCommand;
