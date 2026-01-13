/**
 * Time Expressions - Deep TypeScript Integration
 * Comprehensive time and duration handling with full type safety and validation
 * Enhanced for LLM code agents with maximum type safety
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  HyperScriptValue,
  EvaluationResult,
} from '../../types/command-types';
import { isNumber } from '../type-helpers';

// ============================================================================
// Enhanced Time Parsing Expression
// ============================================================================

/**
 * Enhanced time parsing expression with comprehensive validation
 */
export class TimeParsingExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'time-parse';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: [],
  };

  private readonly timeUnits = [
    { pattern: /([-\d.]+)\s*ms\b/i, multiplier: 1, name: 'milliseconds' },
    { pattern: /([-\d.]+)\s*s\b/i, multiplier: 1000, name: 'seconds' },
    { pattern: /([-\d.]+)\s*(?:m|min|minute|minutes)\b/i, multiplier: 60000, name: 'minutes' },
    { pattern: /([-\d.]+)\s*(?:h|hr|hour|hours)\b/i, multiplier: 3600000, name: 'hours' },
    { pattern: /([-\d.]+)\s*(?:d|day|days)\b/i, multiplier: 86400000, name: 'days' },
    { pattern: /([-\d.]+)\s*(?:w|week|weeks)\b/i, multiplier: 604800000, name: 'weeks' },
  ];

  async evaluate(
    _context: TypedExecutionContext,
    timeString: string,
    defaultUnit: string = 'ms'
  ): Promise<EvaluationResult<number>> {
    try {
      if (!timeString || timeString.trim() === '') {
        return {
          success: false,
          error: {
            name: 'TimeParsingError',
            type: 'runtime-error',
            message: 'Time string cannot be empty',
            code: 'EMPTY_TIME_STRING',
            suggestions: ['Provide a valid time string like "2s", "500ms", or "1 minute"'],
          },
          type: 'error',
        };
      }

      const str = timeString.trim();

      // Handle pure numbers (apply default unit)
      const pureNumber = parseFloat(str);
      if (!isNaN(pureNumber) && !str.match(/[a-zA-Z]/)) {
        const multiplier = this.getUnitMultiplier(defaultUnit);
        return {
          success: true,
          value: pureNumber * multiplier,
          type: 'number',
        };
      }

      // Parse time units
      for (const unit of this.timeUnits) {
        const match = str.match(unit.pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (isNaN(value)) {
            return {
              success: false,
              error: {
                name: 'TimeParsingError',
                type: 'invalid-argument',
                message: `Invalid numeric value in time string: "${match[1]}"`,
                code: 'INVALID_TIME_VALUE',
                suggestions: ['Use valid numeric values like "2.5s" or "10ms"'],
              },
              type: 'error',
            };
          }

          return {
            success: true,
            value: value * unit.multiplier,
            type: 'number',
          };
        }
      }

      // No valid time format found
      return {
        success: false,
        error: {
          name: 'TimeParsingError',
          type: 'invalid-argument',
          message: `Unrecognized time format: "${timeString}"`,
          code: 'INVALID_TIME_FORMAT',
          suggestions: [
            'Use formats like: 2s, 500ms, 1 minute, 2.5h, 1 day, 3 weeks',
            'Check spelling of time units',
            'Ensure numbers are properly formatted',
          ],
        },
        type: 'error',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TimeParsingError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Time parsing failed',
          code: 'TIME_PARSING_FAILED',
          suggestions: ['Check time string format and syntax'],
        },
        type: 'error',
      };
    }
  }

  private getUnitMultiplier(unit: string): number {
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
      w: 604800000,
    };
    return multipliers[unit] || 1;
  }
}

// ============================================================================
// Enhanced Duration Formatting Expression
// ============================================================================

/**
 * Duration formatting options
 */
/**
 * Enhanced duration formatting expression
 */
export class DurationFormattingExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'duration-format';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: [],
  };

  private readonly units = [
    { name: 'w', longName: 'week', value: 604800000 },
    { name: 'd', longName: 'day', value: 86400000 },
    { name: 'h', longName: 'hour', value: 3600000 },
    { name: 'm', longName: 'minute', value: 60000 },
    { name: 's', longName: 'second', value: 1000 },
  ];

  async evaluate(
    _context: TypedExecutionContext,
    milliseconds: number,
    format: string = 'default',
    maxUnits: number = 6
  ): Promise<EvaluationResult<string>> {
    try {
      if (milliseconds < 0) {
        return {
          success: false,
          error: {
            name: 'DurationFormattingError',
            type: 'runtime-error',
            message: 'Duration must be non-negative',
            code: 'NEGATIVE_DURATION',
            suggestions: [
              'Use Math.abs() to convert negative durations',
              'Ensure duration is positive',
            ],
          },
          type: 'error',
        };
      }

      const ms = Math.abs(Math.floor(milliseconds));
      const parts: string[] = [];
      let remaining = ms;
      let unitsAdded = 0;

      for (const unit of this.units) {
        if (unitsAdded >= maxUnits) break;

        const count = Math.floor(remaining / unit.value);
        if (count > 0) {
          remaining -= count * unit.value;
          unitsAdded++;

          if (format === 'long') {
            const unitName = count === 1 ? unit.longName : unit.longName + 's';
            parts.push(`${count} ${unitName}`);
          } else {
            parts.push(`${count}${unit.name}`);
          }
        }

        // Stop at seconds unless precise format
        if (unit.name === 's' && format !== 'precise') break;
      }

      // Handle milliseconds for precise format
      if (format === 'precise' && remaining > 0) {
        const lastIndex = parts.length - 1;
        if (lastIndex >= 0 && parts[lastIndex].endsWith('s')) {
          // Add decimal to seconds
          const secondsPart = parts[lastIndex];
          const seconds = parseFloat(secondsPart.replace('s', ''));
          parts[lastIndex] = `${(seconds + remaining / 1000).toFixed(1)}s`;
        } else {
          parts.push(`${remaining}ms`);
        }
      }

      if (parts.length === 0) {
        return {
          success: true,
          value: format === 'long' ? '0 seconds' : '0s',
          type: 'string',
        };
      }

      // Format output based on style
      let result: string;
      if (format === 'long') {
        result = parts.join(', ');
      } else if (format === 'short') {
        result = parts.slice(0, 2).join(' '); // Only show first 2 units
      } else {
        result = parts.join(' ');
      }

      return {
        success: true,
        value: result,
        type: 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'DurationFormattingError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Duration formatting failed',
          code: 'DURATION_FORMATTING_FAILED',
          suggestions: ['Check input parameters and format options'],
        },
        type: 'error',
      };
    }
  }
}

// ============================================================================
// Enhanced Time Arithmetic Expression
// ============================================================================

/**
 * Enhanced time arithmetic with validation
 */
export class TimeArithmeticExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'time-arithmetic';
  public readonly category = 'arithmetic' as const;
  public readonly precedence = 6;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: ['time-parse'],
  };

  async evaluate(
    context: TypedExecutionContext,
    operation: string,
    time1: HyperScriptValue,
    time2: HyperScriptValue
  ): Promise<EvaluationResult<number>> {
    try {
      const parser = new TimeParsingExpression();

      // Parse first time value
      let ms1: number;
      if (isNumber(time1)) {
        ms1 = time1 as number;
      } else {
        const result1 = await parser.evaluate(context, String(time1));
        if (!result1.success || !isNumber(result1.value)) {
          return result1;
        }
        ms1 = result1.value as number;
      }

      // Parse second time value
      let ms2: number;
      if (isNumber(time2)) {
        ms2 = time2 as number;
      } else {
        const result2 = await parser.evaluate(context, String(time2));
        if (!result2.success || !isNumber(result2.value)) {
          return result2;
        }
        ms2 = result2.value as number;
      }

      // Perform arithmetic operation
      let result: number;
      switch (operation.toLowerCase()) {
        case 'add':
        case '+':
          result = ms1 + ms2;
          break;
        case 'subtract':
        case '-':
          result = ms1 - ms2;
          break;
        case 'multiply':
        case '*':
          result = ms1 * ms2;
          break;
        case 'divide':
        case '/':
          if (ms2 === 0) {
            return {
              success: false,
              error: {
                name: 'TimeArithmeticError',
                type: 'type-mismatch',
                message: 'Division by zero is not allowed',
                code: 'DIVISION_BY_ZERO',
                suggestions: ['Ensure divisor is not zero', 'Check time values'],
              },
              type: 'error',
            };
          }
          result = ms1 / ms2;
          break;
        default:
          return {
            success: false,
            error: {
              name: 'TimeArithmeticError',
              type: 'runtime-error',
              message: `Unsupported operation: "${operation}"`,
              code: 'UNSUPPORTED_OPERATION',
              suggestions: ['Use: add, subtract, multiply, or divide', 'Check operation spelling'],
            },
            type: 'error',
          };
      }

      return {
        success: true,
        value: Math.round(result), // Round to avoid floating point precision issues
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TimeArithmeticError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Time arithmetic failed',
          code: 'TIME_ARITHMETIC_FAILED',
          suggestions: ['Check time values and operation parameters'],
        },
        type: 'error',
      };
    }
  }
}

// ============================================================================
// Expression Registry and Exports
// ============================================================================

/**
 * Enhanced time expressions registry
 */
export const enhancedTimeExpressions = {
  'time-parse': new TimeParsingExpression(),
  'duration-format': new DurationFormattingExpression(),
  'time-arithmetic': new TimeArithmeticExpression(),
} as const;

/**
 * Factory functions for creating enhanced time expressions
 */
export function createTimeParsing(): TimeParsingExpression {
  return new TimeParsingExpression();
}

export function createDurationFormatting(): DurationFormattingExpression {
  return new DurationFormattingExpression();
}

export function createTimeArithmetic(): TimeArithmeticExpression {
  return new TimeArithmeticExpression();
}

/**
 * Utility functions for time operations
 */
export async function parseTime(
  timeString: string,
  context: TypedExecutionContext,
  defaultUnit: string = 'ms'
): Promise<EvaluationResult<number>> {
  const expr = new TimeParsingExpression();
  return expr.evaluate(context, timeString, defaultUnit);
}

export async function formatDuration(
  milliseconds: number,
  context: TypedExecutionContext,
  format: string = 'default',
  maxUnits: number = 6
): Promise<EvaluationResult<string>> {
  const expr = new DurationFormattingExpression();
  return expr.evaluate(context, milliseconds, format, maxUnits);
}

export async function performTimeArithmetic(
  operation: string,
  time1: HyperScriptValue,
  time2: HyperScriptValue,
  context: TypedExecutionContext
): Promise<EvaluationResult<number>> {
  const expr = new TimeArithmeticExpression();
  return expr.evaluate(context, operation, time1, time2);
}

export default enhancedTimeExpressions;
