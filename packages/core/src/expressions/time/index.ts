

/**
 * Enhanced Time Expressions - Deep TypeScript Integration
 * Comprehensive time and duration handling with full type safety and validation
 * Enhanced for LLM code agents with maximum type safety
 */

import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  HyperScriptValue,
  EvaluationResult,
  LLMDocumentation
} from '../../types/command-types';

// ============================================================================
// Enhanced Time Parsing Expression
// ============================================================================

/**
 * Enhanced time parsing expression with comprehensive validation
 */
export class EnhancedTimeParsingExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'time-parse';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: []
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Parses hyperscript time literals into milliseconds with comprehensive validation',
    parameters: [
      {
        name: 'timeString',
        type: 'string',
        description: 'Time string in hyperscript format (2s, 500ms, 1 minute, etc.)',
        optional: false,
        examples: ['2s', '500ms', '1 minute', '2.5h', '1 day', '3 weeks']
      },
      {
        name: 'defaultUnit',
        type: 'string',
        description: 'Default unit to use for pure numbers',
        optional: true,
        defaultValue: 'ms',
        examples: ['ms', 's', 'm', 'h', 'd', 'w']
      }
    ],
    returns: {
      type: 'number',
      description: 'Time duration in milliseconds',
      examples: ['2000', '500', '60000', '9000000', '86400000', '1814400000']
    },
    examples: [
      {
        title: 'Seconds conversion',
        code: 'parseTime("2s")',
        explanation: 'Convert 2 seconds to milliseconds',
        output: 2000
      },
      {
        title: 'Milliseconds',
        code: 'parseTime("500ms")',
        explanation: 'Parse milliseconds directly',
        output: 500
      },
      {
        title: 'Long format',
        code: 'parseTime("1 minute")',
        explanation: 'Handle long time format',
        output: 60000
      },
      {
        title: 'Decimal values',
        code: 'parseTime("2.5h")',
        explanation: 'Support decimal time values',
        output: 9000000
      }
    ],
    seeAlso: ['time-format', 'time-add', 'time-subtract'],
    tags: ['time', 'parsing', 'duration', 'conversion']
  };

  private readonly timeUnits = [
    { pattern: /([-\d.]+)\s*ms\b/i, multiplier: 1, name: 'milliseconds' },
    { pattern: /([-\d.]+)\s*s\b/i, multiplier: 1000, name: 'seconds' },
    { pattern: /([-\d.]+)\s*(?:m|min|minute|minutes)\b/i, multiplier: 60000, name: 'minutes' },
    { pattern: /([-\d.]+)\s*(?:h|hr|hour|hours)\b/i, multiplier: 3600000, name: 'hours' },
    { pattern: /([-\d.]+)\s*(?:d|day|days)\b/i, multiplier: 86400000, name: 'days' },
    { pattern: /([-\d.]+)\s*(?:w|week|weeks)\b/i, multiplier: 604800000, name: 'weeks' }
  ];

  async evaluate(_context: TypedExecutionContext, timeString: string, defaultUnit: string = 'ms'): Promise<EvaluationResult<number>> {
    try {
      if (!timeString || timeString.trim() === '') {
        return {
          success: false,
          error: {
            name: 'TimeParsingError',
            type: 'runtime-error',
            message: 'Time string cannot be empty',
            code: 'EMPTY_TIME_STRING',
            suggestions: ['Provide a valid time string like "2s", "500ms", or "1 minute"']
          },
          type: 'error'
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
          type: 'number'
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
                suggestions: ['Use valid numeric values like "2.5s" or "10ms"']
              },
              type: 'error'
            };
          }

          return {
            success: true,
            value: value * unit.multiplier,
            type: 'number'
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
            'Ensure numbers are properly formatted'
          ]
        },
        type: 'error'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TimeParsingError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Time parsing failed',
          code: 'TIME_PARSING_FAILED',
          suggestions: ['Check time string format and syntax']
        },
        type: 'error'
      };
    }
  }

  private getUnitMultiplier(unit: string): number {
    const multipliers: Record<string, number> = {
      'ms': 1,
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000,
      'w': 604800000
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
export class EnhancedDurationFormattingExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'duration-format';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: []
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Formats milliseconds into readable duration strings with various format options',
    parameters: [
      {
        name: 'milliseconds',
        type: 'number',
        description: 'Duration in milliseconds to format',
        optional: false,
        examples: ['2000', '90000', '3661000', '86400000']
      },
      {
        name: 'format',
        type: 'string',
        description: 'Output format style',
        optional: true,
        defaultValue: 'default',
        examples: ['default', 'long', 'short', 'precise']
      },
      {
        name: 'maxUnits',
        type: 'number',
        description: 'Maximum number of time units to display',
        optional: true,
        defaultValue: 6,
        examples: ['1', '2', '3']
      }
    ],
    returns: {
      type: 'string',
      description: 'Formatted duration string',
      examples: ['2s', '1m 30s', '1 hour 1 minute 1 second', '1d', '2.5s']
    },
    examples: [
      {
        title: 'Default format',
        code: 'formatDuration(2000)',
        explanation: 'Format 2 seconds in default style',
        output: '2s'
      },
      {
        title: 'Long format',
        code: 'formatDuration(90000, "long")',
        explanation: 'Format 1.5 minutes in long style',
        output: '1 minute 30 seconds'
      },
      {
        title: 'Short format',
        code: 'formatDuration(3661000, "short")',
        explanation: 'Format 1h 1m 1s showing only first 2 units',
        output: '1h 1m'
      },
      {
        title: 'Precise format',
        code: 'formatDuration(2500, "precise")',
        explanation: 'Include milliseconds for precise timing',
        output: '2.5s'
      }
    ],
    seeAlso: ['time-parse', 'time-add', 'time-subtract'],
    tags: ['time', 'formatting', 'duration', 'display']
  };

  private readonly units = [
    { name: 'w', longName: 'week', value: 604800000 },
    { name: 'd', longName: 'day', value: 86400000 },
    { name: 'h', longName: 'hour', value: 3600000 },
    { name: 'm', longName: 'minute', value: 60000 },
    { name: 's', longName: 'second', value: 1000 }
  ];

  async evaluate(_context: TypedExecutionContext, milliseconds: number, format: string = 'default', maxUnits: number = 6): Promise<EvaluationResult<string>> {
    try {
      if (milliseconds < 0) {
        return {
          success: false,
          error: {
            name: 'DurationFormattingError',
            type: 'runtime-error',
            message: 'Duration must be non-negative',
            code: 'NEGATIVE_DURATION',
            suggestions: ['Use Math.abs() to convert negative durations', 'Ensure duration is positive']
          },
          type: 'error'
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
          type: 'string'
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
        type: 'string'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'DurationFormattingError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Duration formatting failed',
          code: 'DURATION_FORMATTING_FAILED',
          suggestions: ['Check input parameters and format options']
        },
        type: 'error'
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
export class EnhancedTimeArithmeticExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'time-arithmetic';
  public readonly category = 'arithmetic' as const;
  public readonly precedence = 6;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: ['time-parse']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs arithmetic operations on time durations with automatic parsing',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'Arithmetic operation to perform',
        optional: false,
        examples: ['add', 'subtract', 'multiply', 'divide']
      },
      {
        name: 'time1',
        type: 'string | number',
        description: 'First time value (string or milliseconds)',
        optional: false,
        examples: ['2s', '1000', '1 minute', '90000']
      },
      {
        name: 'time2',
        type: 'string | number',
        description: 'Second time value (string or milliseconds)',
        optional: false,
        examples: ['500ms', '500', '30s', '30000']
      }
    ],
    returns: {
      type: 'number',
      description: 'Result of time arithmetic in milliseconds',
      examples: ['2500', '1500', '180000', '2000']
    },
    examples: [
      {
        title: 'Add durations',
        code: 'timeArithmetic("add", "2s", "500ms")',
        explanation: 'Add 2 seconds and 500 milliseconds',
        output: 2500
      },
      {
        title: 'Subtract durations',
        code: 'timeArithmetic("subtract", "1 minute", "30s")',
        explanation: 'Subtract 30 seconds from 1 minute',
        output: 30000
      },
      {
        title: 'Multiply duration',
        code: 'timeArithmetic("multiply", "1s", 2)',
        explanation: 'Multiply 1 second by 2',
        output: 2000
      }
    ],
    seeAlso: ['time-parse', 'duration-format'],
    tags: ['time', 'arithmetic', 'calculation', 'duration']
  };

  async evaluate(context: TypedExecutionContext, operation: string, time1: HyperScriptValue, time2: HyperScriptValue): Promise<EvaluationResult<number>> {
    try {
      const parser = new EnhancedTimeParsingExpression();
      
      // Parse first time value
      let ms1: number;
      if (typeof time1 === 'number') {
        ms1 = time1;
      } else {
        const result1 = await parser.evaluate(context, String(time1));
        if (!result1.success || typeof result1.value !== 'number') {
          return result1;
        }
        ms1 = result1.value;
      }

      // Parse second time value
      let ms2: number;
      if (typeof time2 === 'number') {
        ms2 = time2;
      } else {
        const result2 = await parser.evaluate(context, String(time2));
        if (!result2.success || typeof result2.value !== 'number') {
          return result2;
        }
        ms2 = result2.value;
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
                suggestions: ['Ensure divisor is not zero', 'Check time values']
              },
              type: 'error'
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
              suggestions: ['Use: add, subtract, multiply, or divide', 'Check operation spelling']
            },
            type: 'error'
          };
      }

      return {
        success: true,
        value: Math.round(result), // Round to avoid floating point precision issues
        type: 'number'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TimeArithmeticError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Time arithmetic failed',
          code: 'TIME_ARITHMETIC_FAILED',
          suggestions: ['Check time values and operation parameters']
        },
        type: 'error'
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
  'time-parse': new EnhancedTimeParsingExpression(),
  'duration-format': new EnhancedDurationFormattingExpression(),
  'time-arithmetic': new EnhancedTimeArithmeticExpression()
} as const;

/**
 * Factory functions for creating enhanced time expressions
 */
export function createEnhancedTimeParsing(): EnhancedTimeParsingExpression {
  return new EnhancedTimeParsingExpression();
}

export function createEnhancedDurationFormatting(): EnhancedDurationFormattingExpression {
  return new EnhancedDurationFormattingExpression();
}

export function createEnhancedTimeArithmetic(): EnhancedTimeArithmeticExpression {
  return new EnhancedTimeArithmeticExpression();
}

/**
 * Utility functions for time operations
 */
export async function parseTime(timeString: string, context: TypedExecutionContext, defaultUnit: string = 'ms'): Promise<EvaluationResult<number>> {
  const expr = new EnhancedTimeParsingExpression();
  return expr.evaluate(context, timeString, defaultUnit);
}

export async function formatDuration(milliseconds: number, context: TypedExecutionContext, format: string = 'default', maxUnits: number = 6): Promise<EvaluationResult<string>> {
  const expr = new EnhancedDurationFormattingExpression();
  return expr.evaluate(context, milliseconds, format, maxUnits);
}

export async function performTimeArithmetic(operation: string, time1: HyperScriptValue, time2: HyperScriptValue, context: TypedExecutionContext): Promise<EvaluationResult<number>> {
  const expr = new EnhancedTimeArithmeticExpression();
  return expr.evaluate(context, operation, time1, time2);
}

export default enhancedTimeExpressions;