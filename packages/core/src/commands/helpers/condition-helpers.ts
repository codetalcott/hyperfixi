/**
 * Condition Helpers - Shared utilities for condition evaluation
 *
 * Used by: if, repeat, unless commands
 *
 * These utilities handle:
 * - Evaluating conditions to boolean (truthiness)
 * - Handling context references (me, it, you)
 * - Variable lookup and evaluation
 *
 * Bundle size savings: ~40 lines per command using these helpers
 */

import type { ExecutionContext } from '../../types/core';
import { getVariableValue } from './variable-access';

/**
 * Evaluate a condition value to boolean
 *
 * Handles various condition types:
 * - Booleans: return directly
 * - Functions: truthy (but don't call)
 * - Promises: error (must be awaited)
 * - Strings: context references or variable lookup
 * - Other: JavaScript truthiness
 *
 * @param condition - Condition value to evaluate
 * @param context - Execution context
 * @returns Boolean result
 * @throws Error if condition is a Promise (async conditions not supported)
 */
export function evaluateCondition(condition: unknown, context: ExecutionContext): boolean {
  // Handle boolean directly
  if (typeof condition === 'boolean') {
    return condition;
  }

  // Handle functions (truthy, but don't call them)
  if (typeof condition === 'function') {
    return true;
  }

  // Handle Promises (error - must be awaited)
  if (condition instanceof Promise) {
    throw new Error(
      'Condition must be awaited - use await in the condition expression'
    );
  }

  // Handle string conditions (variable names or literal strings)
  if (typeof condition === 'string') {
    // Check context references
    if (condition === 'me') return Boolean(context.me);
    if (condition === 'it') return Boolean(context.it);
    if (condition === 'you') return Boolean(context.you);

    // Try variable lookup
    const value = getVariableValue(condition, context);

    // If variable exists, use its truthiness
    if (value !== undefined) {
      return Boolean(value);
    }

    // Otherwise, non-empty string is truthy
    return Boolean(condition);
  }

  // For numbers, objects, etc., use JavaScript truthiness
  return Boolean(condition);
}

/**
 * Check if a value is truthy (simple version)
 *
 * Simplified truthiness check without context lookup.
 *
 * @param value - Value to check
 * @returns Boolean result
 */
export function isTruthy(value: unknown): boolean {
  return Boolean(value);
}
