/**
 * IncrementCommand - Decorated Implementation
 *
 * Increases the value of a variable or element property by a specified amount.
 * Uses Stage 3 TypeScript decorators for reduced boilerplate.
 *
 * Syntax:
 * - increment counter
 * - increment counter by 5
 * - increment global score by 10
 */

import type { ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory } from '../decorators';
import {
  parseNumericTargetInput,
  type NumericTargetRawInput,
  type NumericTargetInput,
} from '../helpers/numeric-target-parser';

// Re-export for backward compatibility
export type { NumericTargetInput as IncrementCommandInput };

import {
  getCurrentNumericValue,
  setTargetValue,
} from '../helpers/variable-access';

/**
 * IncrementCommand - Adds to variable/property values
 *
 * Before: 163 lines
 * After: ~50 lines (69% reduction)
 */
@meta({
  description: 'Increment a variable or property by a specified amount (default: 1)',
  syntax: 'increment <target> [by <number>]',
  examples: ['increment counter', 'increment counter by 5', 'increment me.scrollTop by 100'],
  sideEffects: ['data-mutation', 'context-modification'],
})
@command({ name: 'increment', category: 'data' })
export class IncrementCommand {
  /**
   * Parse raw AST input into structured input object
   */
  async parseInput(
    raw: NumericTargetRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<NumericTargetInput> {
    return parseNumericTargetInput(raw, evaluator, context, 'increment');
  }

  /**
   * Execute the increment command
   */
  async execute(input: NumericTargetInput, context: ExecutionContext): Promise<number> {
    const { target, property, scope, amount = 1 } = input;

    // Get current value using shared helper
    const currentValue = getCurrentNumericValue(target, property, scope, context);

    // Perform increment (preserve NaN if current value is NaN)
    let newValue: number;
    if (isNaN(currentValue)) {
      newValue = NaN;
    } else {
      const incrementBy = isFinite(amount) ? amount : 1;
      newValue = currentValue + incrementBy;
    }

    // Set the new value using shared helper
    setTargetValue(target, property, scope, newValue, context);

    // Update context
    Object.assign(context, { it: newValue });

    return newValue;
  }
}

/**
 * Factory function for creating IncrementCommand instances
 */
export const createIncrementCommand = createFactory(IncrementCommand);

export default IncrementCommand;
