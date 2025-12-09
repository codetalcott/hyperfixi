/**
 * Conversion Expressions for HyperScript
 * Provides deep TypeScript integration for type conversion expressions with comprehensive validation
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~2 KB savings)
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationResult,
  ExpressionMetadata,
  BaseTypedExpression,
  ValidationResult,
  EvaluationType,
} from '../../../types/base-types';
import type { ExpressionCategory, LLMDocumentation } from '../../../types/expression-types';
import { BaseExpressionImpl } from '../../base-expression';
import { isString, isNumber, isBoolean, isObject, isFunction } from '../../type-helpers';

// ============================================================================
// Converter Helper Functions (deduplication)
// ============================================================================

/** Create a standardized converter error result */
function converterError(
  name: string,
  code: string,
  message: string,
  suggestions: string[],
  type: 'runtime-error' | 'invalid-argument' | 'syntax-error' = 'runtime-error'
): EvaluationResult<never> {
  return {
    success: false,
    error: { name: `${name}ConversionError`, type, message, code, suggestions },
  };
}

/** Create a standardized success result */
function success<T>(value: T, type: string): EvaluationResult<T> {
  return { success: true, value, type };
}

/** Format error message from caught error */
function errorMsg(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
}

// ============================================================================
// Enhanced Type Conversion Registry
// ============================================================================

/**
 * Supported conversion types with strict typing
 */
export type SupportedConversionType =
  | 'Array'
  | 'Boolean'
  | 'Date'
  | 'Float'
  | 'Fragment'
  | 'HTML'
  | 'Int'
  | 'JSON'
  | 'Number'
  | 'Object'
  | 'String'
  | 'Values'
  | 'Values:Form'
  | 'Values:JSON'
  | `Fixed:${number}`
  | string;

/**
 * Enhanced type converter function with structured results
 */
export interface EnhancedTypeConverter<T = unknown> {
  (value: unknown, context: TypedExpressionContext): EvaluationResult<T>;
}

/**
 * Enhanced conversion registry with type safety
 */
export const enhancedConverters: Record<string, EnhancedTypeConverter> = {
  Array: (value: unknown, _context: TypedExpressionContext): EvaluationResult<unknown[]> => {
    try {
      if (Array.isArray(value)) return success(value, 'array');
      if (value instanceof NodeList) return success(Array.from(value), 'array');
      if (value == null) return success([], 'array');
      return success([value], 'array');
    } catch (error) {
      return converterError('Array', 'ARRAY_CONVERSION_FAILED',
        errorMsg('Failed to convert value to Array', error),
        ['Check if value is iterable', 'Ensure value is not circular reference']);
    }
  },

  String: (value: unknown, _context: TypedExpressionContext): EvaluationResult<string> => {
    try {
      if (value == null) return success('', 'string');
      if (isString(value)) return success(value as string, 'string');
      if (isObject(value)) return success(JSON.stringify(value), 'string');
      return success(String(value), 'string');
    } catch (error) {
      return converterError('String', 'STRING_CONVERSION_FAILED',
        errorMsg('Failed to convert value to String', error),
        ['Check if object has circular references', 'Ensure value is serializable']);
    }
  },

  Boolean: (value: unknown, _context: TypedExpressionContext): EvaluationResult<boolean> => {
    try {
      if (isBoolean(value)) return success(value as boolean, 'boolean');
      if (value == null) return success(false, 'boolean');
      if (isString(value)) {
        const lowerValue = (value as string).toLowerCase().trim();
        return success(lowerValue !== 'false' && lowerValue !== '0' && lowerValue !== '', 'boolean');
      }
      if (isNumber(value)) return success((value as number) !== 0 && !isNaN(value as number), 'boolean');
      return success(Boolean(value), 'boolean');
    } catch (error) {
      return converterError('Boolean', 'BOOLEAN_CONVERSION_FAILED',
        errorMsg('Failed to convert value to Boolean', error),
        ['Use explicit true/false values', 'Check for unexpected data types']);
    }
  },

  Number: (value: unknown, _context: TypedExpressionContext): EvaluationResult<number> => {
    try {
      if (isNumber(value)) return success(value as number, 'number');
      if (value == null) return success(0, 'number');
      const num = Number(value);
      if (isNaN(num)) {
        return converterError('Number', 'INVALID_NUMBER',
          `Cannot convert "${value}" to a valid number`,
          ['Check if value contains non-numeric characters', 'Use a valid numeric format'],
          'invalid-argument');
      }
      return success(num, 'number');
    } catch (error) {
      return converterError('Number', 'NUMBER_CONVERSION_FAILED',
        errorMsg('Failed to convert value to Number', error),
        ['Ensure value is convertible to number', 'Check for special characters']);
    }
  },

  Int: (value: unknown, context: TypedExpressionContext): EvaluationResult<number> => {
    const result = enhancedConverters.Number(value, context);
    if (!result.success) return result as EvaluationResult<number>;
    return success(Math.trunc(result.value as number), 'number');
  },

  Float: (value: unknown, context: TypedExpressionContext): EvaluationResult<number> => {
    const result = enhancedConverters.Number(value, context);
    if (!result.success) return result as EvaluationResult<number>;
    return success(parseFloat((result.value as number).toString()), 'number');
  },

  Date: (value: unknown, _context: TypedExpressionContext): EvaluationResult<Date> => {
    try {
      if (value instanceof Date) return success(value, 'object');
      if (value == null) return success(new Date(''), 'object');
      // Handle YYYY-MM-DD format specially to avoid timezone issues
      if (isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value as string)) {
        const [year, month, day] = (value as string).split('-').map(Number);
        return success(new Date(year, month - 1, day), 'object');
      }
      const date = new Date(value as string | number | Date);
      if (isNaN(date.getTime())) {
        return converterError('Date', 'INVALID_DATE',
          `Cannot convert "${value}" to a valid date`,
          ['Use ISO 8601 format (YYYY-MM-DD)', 'Check date string format', 'Ensure date values are valid'],
          'invalid-argument');
      }
      return success(date, 'object');
    } catch (error) {
      return converterError('Date', 'DATE_CONVERSION_FAILED',
        errorMsg('Failed to convert value to Date', error),
        ['Check date format', 'Ensure value is a valid date string or timestamp']);
    }
  },

  JSON: (value: unknown, _context: TypedExpressionContext): EvaluationResult<string> => {
    try {
      return success(JSON.stringify(value), 'string');
    } catch (error) {
      return converterError('JSON', 'JSON_STRINGIFY_FAILED',
        errorMsg('Failed to convert value to JSON', error),
        ['Check for circular references', 'Ensure all properties are serializable', 'Remove functions and undefined values']);
    }
  },

  Object: (value: unknown, _context: TypedExpressionContext): EvaluationResult<Record<string, unknown>> => {
    try {
      if (isObject(value)) return success(value as Record<string, unknown>, 'object');
      if (isString(value)) {
        try {
          return success(JSON.parse(value as string), 'object');
        } catch (parseError) {
          return converterError('Object', 'JSON_PARSE_FAILED',
            errorMsg('Cannot parse JSON string', parseError),
            ['Check JSON syntax', 'Ensure proper escaping of quotes', 'Validate JSON format'],
            'syntax-error');
        }
      }
      return success({}, 'object');
    } catch (error) {
      return converterError('Object', 'OBJECT_CONVERSION_FAILED',
        errorMsg('Failed to convert value to Object', error),
        ['Ensure value is valid JSON string or object', 'Check for syntax errors']);
    }
  },

  Values: (value: unknown, _context: TypedExpressionContext): EvaluationResult<Record<string, unknown>> => {
    try {
      if (value instanceof HTMLFormElement) {
        return success(extractFormValues(value), 'object');
      }
      if (value instanceof HTMLElement) {
        const inputs = value.querySelectorAll('input, select, textarea');
        const values: Record<string, unknown> = {};
        inputs.forEach((input: Element) => {
          const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ((htmlInput as HTMLInputElement).name) {
            const inputValue = extractInputValue(htmlInput);
            if (inputValue !== undefined) {
              values[(htmlInput as HTMLInputElement).name] = inputValue;
            }
          }
        });
        return success(values, 'object');
      }
      return success({}, 'object');
    } catch (error) {
      return converterError('FormValues', 'FORM_VALUES_EXTRACTION_FAILED',
        errorMsg('Failed to extract form values', error),
        ['Ensure element is a form or contains form inputs', 'Check form structure', 'Verify input names are set']);
    }
  },
};

// ============================================================================
// Conversion Expression Implementation
// ============================================================================

/**
 * Input schema for the 'as' conversion expression
 */
const AsExpressionInputSchema = v.object({
  value: v.any(),
  type: v.string().min(1),
});

/**
 * Enhanced implementation of the 'as' conversion expression
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class AsExpression
  extends BaseExpressionImpl<{ value: unknown; type: string }, unknown>
  implements BaseTypedExpression<unknown>
{
  readonly name = 'as';
  readonly category: ExpressionCategory = 'Conversion';
  readonly syntax = 'value as Type';
  readonly description = 'Converts values between different types using the "as" keyword';
  readonly outputType: EvaluationType = 'Any';
  readonly inputSchema = AsExpressionInputSchema;

  readonly metadata: ExpressionMetadata = {
    category: 'Conversion',
    complexity: 'medium',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: '"123" as Int',
        description: 'Convert string to integer',
        expectedOutput: 123,
      },
      {
        input: 'form as Values',
        description: 'Extract form values as object',
        expectedOutput: { name: 'John', age: '25' },
      },
      {
        input: '[1,2,3] as JSON',
        description: 'Convert array to JSON string',
        expectedOutput: '[1,2,3]',
      },
      {
        input: '"2023-12-25" as Date',
        description: 'Parse date string',
        expectedOutput: new Date(2023, 11, 25),
      },
    ],
    relatedExpressions: ['is', 'Object', 'Array'],
    performance: {
      averageTime: 1.0,
      complexity: 'O(n)',
    },
  };

  readonly documentation: LLMDocumentation = {
    summary:
      'Converts values between different types using the "as" keyword with comprehensive type safety',
    parameters: [
      {
        name: 'value',
        type: 'object',
        description: 'The value to convert',
        optional: false,
        examples: ['"123"', 'form', '[1,2,3]', 'true', 'null'],
      },
      {
        name: 'type',
        type: 'string',
        description: 'Target conversion type',
        optional: false,
        examples: [
          'Int',
          'String',
          'Boolean',
          'Array',
          'JSON',
          'Object',
          'Date',
          'Values',
          'HTML',
          'Fragment',
        ],
      },
    ],
    returns: {
      type: 'object',
      description: 'Structured result with converted value or detailed error information',
      examples: [
        '{ success: true, value: 123, type: "number" }',
        '{ success: false, error: { ... } }',
      ],
    },
    examples: [
      {
        title: 'String to number conversion',
        code: 'if my.value as Int > 100',
        explanation: 'Convert form input to integer for comparison',
        output: 'Boolean result',
      },
      {
        title: 'Form data extraction',
        code: 'put closest <form /> as Values into result',
        explanation: 'Extract all form values as structured object',
        output: '{ name: "John", age: "25", ... }',
      },
      {
        title: 'Array to JSON serialization',
        code: 'put items as JSON into storage',
        explanation: 'Convert array to JSON string for storage',
        output: '"[1,2,3]"',
      },
      {
        title: 'Date parsing with validation',
        code: 'put my.dateInput as Date into event.detail.date',
        explanation: 'Parse date input with automatic validation',
        output: 'Date object or validation error',
      },
      {
        title: 'Boolean conversion with smart parsing',
        code: 'if "false" as Boolean then hide else show',
        explanation: 'Parse string boolean values correctly',
        output: 'false (not true like naive conversion)',
      },
    ],
    seeAlso: ['is', 'Values', 'JSON', 'Array', 'Object'],
    tags: ['conversion', 'types', 'validation', 'forms', 'json', 'parsing'],
  };

  async evaluate(
    context: TypedExpressionContext,
    input: { value: unknown; type: string }
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'AsExpressionValidationError',
            type: 'validation-error',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      const { value, type } = input;

      // Handle Fixed:<precision> conversion
      if (type.startsWith('Fixed')) {
        const precisionMatch = type.match(/^Fixed:(\d+)$/);
        const precision = precisionMatch ? parseInt(precisionMatch[1], 10) : 2;
        const numberResult = enhancedConverters.Number(value, context);
        if (!numberResult.success) {
          return numberResult;
        }
        const fixed = (numberResult.value as number).toFixed(precision);
        const result = { success: true as const, value: fixed, type: 'string' as const };
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      // Check for built-in converter
      let converter = enhancedConverters[type];
      if (converter) {
        const result = converter(value, context);
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      // Check for case-insensitive matches and aliases
      const lowerType = type.toLowerCase();
      const typeAliases: Record<string, string> = {
        boolean: 'Boolean',
        bool: 'Boolean',
        string: 'String',
        str: 'String',
        number: 'Number',
        num: 'Number',
        int: 'Int',
        integer: 'Int',
        float: 'Float',
        array: 'Array',
        object: 'Object',
        obj: 'Object',
        date: 'Date',
        json: 'JSON',
      };

      const aliasedType = typeAliases[lowerType];
      if (aliasedType) {
        converter = enhancedConverters[aliasedType];
        if (converter) {
          const result = converter(value, context);
          this.trackPerformance(context, input, result, startTime);
          return result;
        }
      }

      // Unknown conversion type - return error
      const errorResult = {
        success: false as const,
        error: {
          name: 'UnknownConversionTypeError',
          type: 'validation-error' as const,
          message: `Unknown conversion type: ${type}`,
          code: 'UNKNOWN_CONVERSION_TYPE',
          suggestions: [
            'Use supported types: String, Number, Boolean, Array, Object, Date, JSON, Values',
            'Check type spelling and capitalization',
            'See documentation for complete list of conversion types',
          ],
        },
      };
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'AsExpressionError',
          type: 'runtime-error' as const,
          message: `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'CONVERSION_FAILED',
          suggestions: [
            'Check value and type compatibility',
            'Ensure value is convertible to target type',
          ],
        },
      };
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: err.message,
              suggestions: [`Expected valid input structure, got: ${err.code}`],
            })) ?? [],
          suggestions: [
            'Provide both value and type parameters',
            'Ensure type is a non-empty string',
            'Check parameter structure: { value: any, type: string }',
          ],
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed',
        ['Check input structure']
      );
    }
  }
}

// ============================================================================
// Enhanced Type Checking Expression Implementation
// ============================================================================

/**
 * Input schema for the 'is' type checking expression
 */
const IsExpressionInputSchema = v.object({
  value: v.any(),
  type: v.string().min(1),
});

/**
 * Enhanced implementation of the 'is' type checking expression
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class IsExpression
  extends BaseExpressionImpl<{ value: unknown; type: string }, boolean>
  implements BaseTypedExpression<boolean>
{
  readonly name = 'is';
  readonly category: ExpressionCategory = 'Conversion';
  readonly syntax = 'value is Type';
  readonly description = 'Checks if a value is of a specific type';
  readonly outputType: EvaluationType = 'Boolean';
  readonly inputSchema = IsExpressionInputSchema;

  readonly metadata: ExpressionMetadata = {
    category: 'Conversion',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '42 is number',
        description: 'Check if value is a number',
        expectedOutput: true,
      },
      {
        input: 'null is empty',
        description: 'Check if value is empty/null',
        expectedOutput: true,
      },
      {
        input: 'element is Element',
        description: 'Check if value is DOM element',
        expectedOutput: true,
        context: { element: '<div>...</div>' },
      },
    ],
    relatedExpressions: ['as', 'empty', 'exists'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Checks if a value is of a specific type with comprehensive type detection',
    parameters: [
      {
        name: 'value',
        type: 'object',
        description: 'The value to check',
        optional: false,
        examples: ['42', 'null', 'element', '"text"', '[]'],
      },
      {
        name: 'type',
        type: 'string',
        description: 'Type name to check against',
        optional: false,
        examples: ['number', 'string', 'boolean', 'array', 'object', 'element', 'empty', 'null'],
      },
    ],
    returns: {
      type: 'object',
      description: 'Boolean result indicating type match',
      examples: ['{ success: true, value: true, type: "boolean" }'],
    },
    examples: [
      {
        title: 'Number validation',
        code: 'if my.age is number then proceed',
        explanation: 'Check if form input is valid number',
        output: 'Boolean result',
      },
      {
        title: 'Empty check',
        code: 'if result is empty then show message',
        explanation: 'Check if result is null, undefined, or empty',
        output: 'Boolean result',
      },
      {
        title: 'Element validation',
        code: 'if target is element then addClass',
        explanation: 'Ensure target is valid DOM element before manipulation',
        output: 'Boolean result',
      },
    ],
    seeAlso: ['as', 'empty', 'exists', 'null'],
    tags: ['validation', 'types', 'checking', 'guards'],
  };

  async evaluate(
    context: TypedExpressionContext,
    input: { value: unknown; type: string }
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'IsExpressionValidationError',
            type: 'validation-error',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      const { value, type } = input;
      const lowerType = type.toLowerCase();
      let isMatch: boolean;

      switch (lowerType) {
        case 'null':
          isMatch = value === null;
          break;
        case 'undefined':
          isMatch = value === undefined;
          break;
        case 'string':
          isMatch = isString(value);
          break;
        case 'number':
          isMatch = isNumber(value) && !isNaN(value as number);
          break;
        case 'boolean':
          isMatch = isBoolean(value);
          break;
        case 'object':
          isMatch = isObject(value);
          break;
        case 'array':
          isMatch = Array.isArray(value);
          break;
        case 'function':
          isMatch = isFunction(value);
          break;
        case 'date':
          isMatch = value instanceof Date;
          break;
        case 'element':
          isMatch = value instanceof Element;
          break;
        case 'node':
          isMatch = value instanceof Node;
          break;
        case 'node-list':
          isMatch = value instanceof NodeList;
          break;
        case 'empty':
          isMatch =
            value == null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0) ||
            (isObject(value) && Object.keys(value as object).length === 0);
          break;
        default:
          // Check constructor name for custom types
          isMatch = value?.constructor?.name?.toLowerCase() === lowerType;
      }

      const result = this.success(isMatch, 'boolean');
      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<boolean>(
        'IsExpressionError',
        'type-mismatch',
        `Type check failed: ${error instanceof Error ? error.message : String(error)}`,
        'TYPE_CHECK_FAILED',
        ['Check type name spelling', 'Ensure value is accessible']
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: err.message,
              suggestions: [`Expected valid input structure, got: ${err.code}`],
            })) ?? [],
          suggestions: [
            'Provide both value and type parameters',
            'Ensure type is a non-empty string',
            'Check parameter structure: { value: any, type: string }',
          ],
        };
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed',
        ['Check input structure']
      );
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract form values with comprehensive input handling
 */
function extractFormValues(form: HTMLFormElement): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const elements = form.querySelectorAll('input, select, textarea');

  elements.forEach(element => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (input.name) {
      const value = extractInputValue(input);
      if (value !== undefined) {
        if (values[input.name] !== undefined) {
          // Multiple values for same name - convert to array
          if (!Array.isArray(values[input.name])) {
            values[input.name] = [values[input.name]];
          }
          (values[input.name] as unknown[]).push(value);
        } else {
          values[input.name] = value;
        }
      }
    }
  });

  return values;
}

/**
 * Extract value from form input with type-aware processing
 */
function extractInputValue(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): unknown {
  if (input instanceof HTMLInputElement) {
    switch (input.type) {
      case 'checkbox':
        return input.checked;
      case 'radio':
        return input.checked ? input.value : undefined;
      case 'number':
      case 'range':
        return input.valueAsNumber;
      case 'date':
      case 'datetime-local':
        return input.valueAsDate;
      case 'file':
        return input.files;
      default:
        return input.value;
    }
  }

  if (input instanceof HTMLSelectElement) {
    if (input.multiple) {
      return Array.from(input.selectedOptions).map(option => option.value);
    }
    return input.value;
  }

  return input.value;
}

// ============================================================================
// Enhanced Expression Registry
// ============================================================================

export const conversionExpressions = {
  as: new AsExpression(),
  is: new IsExpression(),
} as const;

export type ConversionExpressionName = keyof typeof conversionExpressions;

// ============================================================================
// Factory Functions
// ============================================================================

export function createAsExpression(): AsExpression {
  return new AsExpression();
}

export function createIsExpression(): IsExpression {
  return new IsExpression();
}

// Classes are already exported above with export class declarations
