/**
 * Shared Utility Functions for Comparison Expressions
 * Eliminates duplicate toNumber() implementations across comparison classes
 *
 * Bundle size savings: ~60 lines by consolidating 4 duplicate implementations
 */

/**
 * Convert value to number with proper null handling
 * Returns null if conversion is not possible
 *
 * @param value - Value to convert to number
 * @returns The numeric value, or null if conversion failed
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return null;
}
