/**
 * NumericModifyCommand - Consolidated Increment/Decrement Implementation
 *
 * Modifies the value of a variable or element property by a specified amount.
 * Uses Stage 3 TypeScript decorators with alias support.
 *
 * Syntax:
 * - increment counter
 * - increment counter by 5
 * - decrement counter
 * - decrement counter by 5
 */

import type { TypedExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import {
  parseNumericTargetInput,
  type NumericTargetRawInput,
  type NumericTargetInput,
} from '../helpers/numeric-target-parser';
import { getCurrentNumericValue, setTargetValue } from '../helpers/variable-access';

/**
 * Operation type for numeric modification
 */
export type NumericOperation = 'increment' | 'decrement';

/**
 * Extended input with operation mode
 */
export interface NumericModifyInput extends NumericTargetInput {
  operation: NumericOperation;
}

// Re-export for backward compatibility
export type { NumericTargetInput as IncrementCommandInput };
export type { NumericTargetInput as DecrementCommandInput };

/**
 * NumericModifyCommand - Adds or subtracts from variable/property values
 *
 * Consolidates IncrementCommand and DecrementCommand into single implementation.
 * Registered under both 'increment' and 'decrement' names via aliases.
 */
@meta({
  description: 'Modify a variable or property by a specified amount (default: 1)',
  syntax: ['increment <target> [by <number>]', 'decrement <target> [by <number>]'],
  examples: [
    'increment counter',
    'increment counter by 5',
    'decrement counter',
    'decrement counter by 5',
  ],
  sideEffects: ['data-mutation', 'context-modification'],
  aliases: ['decrement'],
})
@command({ name: 'increment', category: 'data' })
export class NumericModifyCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  /**
   * Parse raw AST input into structured input object
   */
  async parseInput(
    raw: NumericTargetRawInput & { commandName?: string },
    evaluator: ExpressionEvaluator,
    context: TypedExecutionContext
  ): Promise<NumericModifyInput> {
    // Detect operation from command name
    const operation: NumericOperation =
      raw.commandName?.toLowerCase() === 'decrement' ? 'decrement' : 'increment';
    const baseInput = await parseNumericTargetInput(raw, evaluator, context, operation);
    return { ...baseInput, operation };
  }

  /**
   * Execute the numeric modification command
   */
  async execute(input: NumericModifyInput, context: TypedExecutionContext): Promise<number> {
    const { target, property, scope, amount = 1, operation = 'increment' } = input;

    // Get current value using shared helper
    const currentValue = getCurrentNumericValue(target, property, scope, context);

    // Perform operation (preserve NaN if current value is NaN)
    let newValue: number;
    if (isNaN(currentValue)) {
      newValue = NaN;
    } else {
      const delta = isFinite(amount) ? amount : 1;
      newValue = operation === 'increment' ? currentValue + delta : currentValue - delta;
    }

    // Set the new value using shared helper
    setTargetValue(target, property, scope, newValue, context);

    // Update context
    Object.assign(context, { it: newValue });

    return newValue;
  }
}

// Backwards compatibility exports
export { NumericModifyCommand as IncrementCommand };
export { NumericModifyCommand as DecrementCommand };

// Factory functions
export const createNumericModifyCommand = createFactory(NumericModifyCommand);
export const createIncrementCommand = createFactory(NumericModifyCommand);
export const createDecrementCommand = createFactory(NumericModifyCommand);

export default NumericModifyCommand;
