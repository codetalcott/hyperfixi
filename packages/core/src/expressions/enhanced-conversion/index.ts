/**
 * Enhanced Conversion Expressions for HyperScript
 * Provides deep TypeScript integration for type conversion expressions with comprehensive validation
 */

import { z } from 'zod';
import type { 
  TypedExpressionContext, 
  TypedResult, 
  TypedError,
  ExpressionMetadata,
  LLMDocumentation,
  ValidationResult,
  BaseTypedExpression
} from '../../types/enhanced-expressions.js';

// ============================================================================
// Enhanced Type Conversion Registry
// ============================================================================

/**
 * Supported conversion types with strict typing
 */
export type SupportedConversionType = 
  | 'Array' | 'Boolean' | 'Date' | 'Float' | 'Fragment' | 'HTML' | 'Int' 
  | 'JSON' | 'Number' | 'Object' | 'String' | 'Values' 
  | 'Values:Form' | 'Values:JSON' | `Fixed:${number}` | string;

/**
 * Enhanced type converter function with structured results
 */
export interface EnhancedTypeConverter<T = any> {
  (value: any, context: TypedExpressionContext): TypedResult<T>;
}

/**
 * Enhanced conversion registry with type safety
 */
export const enhancedConverters: Record<string, EnhancedTypeConverter> = {
  Array: (value: any): TypedResult<any[]> => {
    try {
      if (Array.isArray(value)) {
        return { success: true, value, type: 'array' };
      }
      if (value instanceof NodeList) {
        return { success: true, value: Array.from(value), type: 'array' };
      }
      if (value == null) {
        return { success: true, value: [], type: 'array' };
      }
      return { success: true, value: [value], type: 'array' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ArrayConversionError',
          message: `Failed to convert value to Array: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_CONVERSION_FAILED',
          suggestions: ['Check if value is iterable', 'Ensure value is not circular reference']
        }
      };
    }
  },

  String: (value: any): TypedResult<string> => {
    try {
      if (value == null) {
        return { success: true, value: '', type: 'string' };
      }
      if (typeof value === 'string') {
        return { success: true, value, type: 'string' };
      }
      if (typeof value === 'object') {
        const result = JSON.stringify(value);
        return { success: true, value: result, type: 'string' };
      }
      return { success: true, value: String(value), type: 'string' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringConversionError',
          message: `Failed to convert value to String: ${error instanceof Error ? error.message : String(error)}`,
          code: 'STRING_CONVERSION_FAILED',
          suggestions: ['Check if object has circular references', 'Ensure value is serializable']
        }
      };
    }
  },

  Boolean: (value: any): TypedResult<boolean> => {
    try {
      if (typeof value === 'boolean') {
        return { success: true, value, type: 'boolean' };
      }
      if (value == null) {
        return { success: true, value: false, type: 'boolean' };
      }
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') {
          return { success: true, value: false, type: 'boolean' };
        }
        return { success: true, value: true, type: 'boolean' };
      }
      if (typeof value === 'number') {
        return { success: true, value: value !== 0 && !isNaN(value), type: 'boolean' };
      }
      return { success: true, value: Boolean(value), type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'BooleanConversionError',
          message: `Failed to convert value to Boolean: ${error instanceof Error ? error.message : String(error)}`,
          code: 'BOOLEAN_CONVERSION_FAILED',
          suggestions: ['Use explicit true/false values', 'Check for unexpected data types']
        }
      };
    }
  },

  Number: (value: any): TypedResult<number> => {
    try {
      if (typeof value === 'number') {
        return { success: true, value, type: 'number' };
      }
      if (value == null) {
        return { success: true, value: 0, type: 'number' };
      }
      const num = Number(value);
      if (isNaN(num)) {
        return {
          success: false,
          error: {
            name: 'NumberConversionError',
            message: `Cannot convert "${value}" to a valid number`,
            code: 'INVALID_NUMBER',
            suggestions: ['Check if value contains non-numeric characters', 'Use a valid numeric format']
          }
        };
      }
      return { success: true, value: num, type: 'number' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'NumberConversionError',
          message: `Failed to convert value to Number: ${error instanceof Error ? error.message : String(error)}`,
          code: 'NUMBER_CONVERSION_FAILED',
          suggestions: ['Ensure value is convertible to number', 'Check for special characters']
        }
      };
    }
  },

  Int: (value: any): TypedResult<number> => {
    const numberResult = enhancedConverters.Number(value);
    if (!numberResult.success) {
      return numberResult;
    }
    return { success: true, value: Math.trunc(numberResult.value), type: 'number' };
  },

  Float: (value: any): TypedResult<number> => {
    const numberResult = enhancedConverters.Number(value);
    if (!numberResult.success) {
      return numberResult;
    }
    return { success: true, value: parseFloat(numberResult.value.toString()), type: 'number' };
  },

  Date: (value: any): TypedResult<Date> => {
    try {
      if (value instanceof Date) {
        return { success: true, value, type: 'object' };
      }
      if (value == null) {
        return { success: true, value: new Date(NaN), type: 'object' };
      }
      
      // Handle YYYY-MM-DD format specially to avoid timezone issues
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return { success: true, value: date, type: 'object' };
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          success: false,
          error: {
            name: 'DateConversionError',
            message: `Cannot convert "${value}" to a valid date`,
            code: 'INVALID_DATE',
            suggestions: ['Use ISO 8601 format (YYYY-MM-DD)', 'Check date string format', 'Ensure date values are valid']
          }
        };
      }
      return { success: true, value: date, type: 'object' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'DateConversionError',
          message: `Failed to convert value to Date: ${error instanceof Error ? error.message : String(error)}`,
          code: 'DATE_CONVERSION_FAILED',
          suggestions: ['Check date format', 'Ensure value is a valid date string or timestamp']
        }
      };
    }
  },

  JSON: (value: any): TypedResult<string> => {
    try {
      const jsonString = JSON.stringify(value);
      return { success: true, value: jsonString, type: 'string' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'JSONConversionError',
          message: `Failed to convert value to JSON: ${error instanceof Error ? error.message : String(error)}`,
          code: 'JSON_STRINGIFY_FAILED',
          suggestions: ['Check for circular references', 'Ensure all properties are serializable', 'Remove functions and undefined values']
        }
      };
    }
  },

  Object: (value: any): TypedResult<Record<string, any>> => {
    try {
      if (typeof value === 'object' && value !== null) {
        return { success: true, value, type: 'object' };
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return { success: true, value: parsed, type: 'object' };
        } catch (parseError) {
          return {
            success: false,
            error: {
              name: 'ObjectConversionError',
              message: `Cannot parse JSON string: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              code: 'JSON_PARSE_FAILED',
              suggestions: ['Check JSON syntax', 'Ensure proper escaping of quotes', 'Validate JSON format']
            }
          };
        }
      }
      return { success: true, value: {}, type: 'object' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ObjectConversionError',
          message: `Failed to convert value to Object: ${error instanceof Error ? error.message : String(error)}`,
          code: 'OBJECT_CONVERSION_FAILED',
          suggestions: ['Ensure value is valid JSON string or object', 'Check for syntax errors']
        }
      };
    }
  },

  Values: (value: any, context: TypedExpressionContext): TypedResult<Record<string, any>> => {
    try {
      if (value instanceof HTMLFormElement) {
        const formValues = extractFormValues(value);
        return { success: true, value: formValues, type: 'object' };
      }
      if (value instanceof HTMLElement) {
        const inputs = value.querySelectorAll('input, select, textarea');
        const values: Record<string, any> = {};
        inputs.forEach((input: Element) => {
          const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ((htmlInput as any).name) {
            const inputValue = extractInputValue(htmlInput);
            if (inputValue !== undefined) {
              values[(htmlInput as any).name] = inputValue;
            }
          }
        });
        return { success: true, value: values, type: 'object' };
      }
      return { success: true, value: {}, type: 'object' };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormValuesConversionError',
          message: `Failed to extract form values: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FORM_VALUES_EXTRACTION_FAILED',
          suggestions: ['Ensure element is a form or contains form inputs', 'Check form structure', 'Verify input names are set']
        }
      };
    }
  }
};

// ============================================================================
// Enhanced Conversion Expression Implementation
// ============================================================================

/**
 * Input schema for the 'as' conversion expression
 */
const AsExpressionInputSchema = z.object({
  value: z.any(),
  type: z.string().min(1, 'Conversion type cannot be empty')
});

/**
 * Enhanced implementation of the 'as' conversion expression
 */
export class EnhancedAsExpression implements BaseTypedExpression<any> {
  readonly name = 'as';
  readonly category = 'Conversion';
  readonly syntax = 'value as Type';
  readonly outputType = 'Any';
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
        expectedOutput: 123
      },
      {
        input: 'form as Values',
        description: 'Extract form values as object',
        expectedOutput: { name: 'John', age: '25' },
        context: { form: '<form with inputs>' }
      },
      {
        input: '[1,2,3] as JSON',
        description: 'Convert array to JSON string',
        expectedOutput: '[1,2,3]'
      },
      {
        input: '"2023-12-25" as Date',
        description: 'Parse date string',
        expectedOutput: new Date(2023, 11, 25)
      }
    ],
    relatedExpressions: ['is', 'Object', 'Array'],
    performance: {
      averageTime: 1.0,
      complexity: 'O(n) for complex types, O(1) for primitives'
    }
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Converts values between different types using the "as" keyword with comprehensive type safety',
    parameters: [
      {
        name: 'value',
        type: 'any',
        description: 'The value to convert',
        optional: false,
        examples: ['"123"', 'form', '[1,2,3]', 'true', 'null']
      },
      {
        name: 'type',
        type: 'string',
        description: 'Target conversion type',
        optional: false,
        examples: ['Int', 'String', 'Boolean', 'Array', 'JSON', 'Object', 'Date', 'Values', 'HTML', 'Fragment']
      }
    ],
    returns: {
      type: 'TypedResult<T>',
      description: 'Structured result with converted value or detailed error information',
      examples: ['{ success: true, value: 123, type: "number" }', '{ success: false, error: { ... } }']
    },
    examples: [
      {
        title: 'String to number conversion',
        code: 'if my.value as Int > 100',
        explanation: 'Convert form input to integer for comparison',
        output: 'Boolean result'
      },
      {
        title: 'Form data extraction',
        code: 'put closest <form /> as Values into result',
        explanation: 'Extract all form values as structured object',
        output: '{ name: "John", age: "25", ... }'
      },
      {
        title: 'Array to JSON serialization',
        code: 'put items as JSON into storage',
        explanation: 'Convert array to JSON string for storage',
        output: '"[1,2,3]"'
      },
      {
        title: 'Date parsing with validation',
        code: 'put my.dateInput as Date into event.detail.date',
        explanation: 'Parse date input with automatic validation',
        output: 'Date object or validation error'
      },
      {
        title: 'Boolean conversion with smart parsing',
        code: 'if "false" as Boolean then hide else show',
        explanation: 'Parse string boolean values correctly',
        output: 'false (not true like naive conversion)'
      }
    ],
    seeAlso: ['is', 'Values', 'JSON', 'Array', 'Object'],
    tags: ['conversion', 'types', 'validation', 'forms', 'json', 'parsing']
  };

  async evaluate(context: TypedExpressionContext, input: { value: any; type: string }): Promise<TypedResult<any>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'AsExpressionValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const { value, type } = input;

      // Handle Fixed:<precision> conversion
      if (type.startsWith('Fixed')) {
        const precisionMatch = type.match(/^Fixed:(\d+)$/);
        const precision = precisionMatch ? parseInt(precisionMatch[1], 10) : 2;
        const numberResult = enhancedConverters.Number(value);
        if (!numberResult.success) {
          return numberResult;
        }
        const fixed = numberResult.value.toFixed(precision);
        const result = { success: true as const, value: fixed, type: 'string' as const };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Check for built-in converter
      let converter = enhancedConverters[type];
      if (converter) {
        const result = converter(value, context);
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Check for case-insensitive matches and aliases
      const lowerType = type.toLowerCase();
      const typeAliases: Record<string, string> = {
        'boolean': 'Boolean',
        'bool': 'Boolean',
        'string': 'String',
        'str': 'String',
        'number': 'Number',
        'num': 'Number',
        'int': 'Int',
        'integer': 'Int',
        'float': 'Float',
        'array': 'Array',
        'object': 'Object',
        'obj': 'Object',
        'date': 'Date',
        'json': 'JSON'
      };

      const aliasedType = typeAliases[lowerType];
      if (aliasedType) {
        converter = enhancedConverters[aliasedType];
        if (converter) {
          const result = converter(value, context);
          this.trackEvaluation(context, input, result, startTime);
          return result;
        }
      }

      // Unknown conversion type - return error
      const errorResult = {
        success: false as const,
        error: {
          name: 'UnknownConversionTypeError',
          message: `Unknown conversion type: ${type}`,
          code: 'UNKNOWN_CONVERSION_TYPE',
          suggestions: [
            'Use supported types: String, Number, Boolean, Array, Object, Date, JSON, Values',
            'Check type spelling and capitalization',
            'See documentation for complete list of conversion types'
          ]
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;

    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'AsExpressionError',
          message: `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'CONVERSION_FAILED',
          suggestions: ['Check value and type compatibility', 'Ensure value is convertible to target type']
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message,
            code: err.code
          })),
          suggestions: [
            'Provide both value and type parameters',
            'Ensure type is a non-empty string',
            'Check parameter structure: { value: any, type: string }'
          ]
        };
      }
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        suggestions: ['Check input structure']
      };
    }
  }

  private trackEvaluation(
    context: TypedExpressionContext,
    input: any,
    result: TypedResult<any>,
    startTime: number
  ): void {
    context.evaluationHistory.push({
      expressionName: this.name,
      category: this.category,
      input,
      output: result.success ? result.value : result.error,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: result.success
    });
  }
}

// ============================================================================
// Enhanced Type Checking Expression Implementation
// ============================================================================

/**
 * Input schema for the 'is' type checking expression
 */
const IsExpressionInputSchema = z.object({
  value: z.any(),
  type: z.string().min(1, 'Type name cannot be empty')
});

/**
 * Enhanced implementation of the 'is' type checking expression
 */
export class EnhancedIsExpression implements BaseTypedExpression<boolean> {
  readonly name = 'is';
  readonly category = 'Conversion';
  readonly syntax = 'value is Type';
  readonly outputType = 'Boolean';
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
        expectedOutput: true
      },
      {
        input: 'null is empty',
        description: 'Check if value is empty/null',
        expectedOutput: true
      },
      {
        input: 'element is Element',
        description: 'Check if value is DOM element',
        expectedOutput: true,
        context: { element: '<div>...</div>' }
      }
    ],
    relatedExpressions: ['as', 'empty', 'exists'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Checks if a value is of a specific type with comprehensive type detection',
    parameters: [
      {
        name: 'value',
        type: 'any',
        description: 'The value to check',
        optional: false,
        examples: ['42', 'null', 'element', '"text"', '[]']
      },
      {
        name: 'type',
        type: 'string',
        description: 'Type name to check against',
        optional: false,
        examples: ['number', 'string', 'boolean', 'array', 'object', 'element', 'empty', 'null']
      }
    ],
    returns: {
      type: 'TypedResult<boolean>',
      description: 'Boolean result indicating type match',
      examples: ['{ success: true, value: true, type: "boolean" }']
    },
    examples: [
      {
        title: 'Number validation',
        code: 'if my.age is number then proceed',
        explanation: 'Check if form input is valid number',
        output: 'Boolean result'
      },
      {
        title: 'Empty check',
        code: 'if result is empty then show message',
        explanation: 'Check if result is null, undefined, or empty',
        output: 'Boolean result'
      },
      {
        title: 'Element validation',
        code: 'if target is element then addClass',
        explanation: 'Ensure target is valid DOM element before manipulation',
        output: 'Boolean result'
      }
    ],
    seeAlso: ['as', 'empty', 'exists', 'null'],
    tags: ['validation', 'types', 'checking', 'guards']
  };

  async evaluate(context: TypedExpressionContext, input: { value: any; type: string }): Promise<TypedResult<boolean>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'IsExpressionValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
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
          isMatch = typeof value === 'string';
          break;
        case 'number':
          isMatch = typeof value === 'number' && !isNaN(value);
          break;
        case 'boolean':
          isMatch = typeof value === 'boolean';
          break;
        case 'object':
          isMatch = typeof value === 'object' && value !== null;
          break;
        case 'array':
          isMatch = Array.isArray(value);
          break;
        case 'function':
          isMatch = typeof value === 'function';
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
        case 'nodelist':
          isMatch = value instanceof NodeList;
          break;
        case 'empty':
          isMatch = value == null || value === '' || 
                   (Array.isArray(value) && value.length === 0) ||
                   (typeof value === 'object' && Object.keys(value).length === 0);
          break;
        default:
          // Check constructor name for custom types
          isMatch = value?.constructor?.name?.toLowerCase() === lowerType;
      }

      const result = { success: true as const, value: isMatch, type: 'boolean' as const };
      this.trackEvaluation(context, input, result, startTime);
      return result;

    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'IsExpressionError',
          message: `Type check failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'TYPE_CHECK_FAILED',
          suggestions: ['Check type name spelling', 'Ensure value is accessible']
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message,
            code: err.code
          })),
          suggestions: [
            'Provide both value and type parameters',
            'Ensure type is a non-empty string',
            'Check parameter structure: { value: any, type: string }'
          ]
        };
      }
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        suggestions: ['Check input structure']
      };
    }
  }

  private trackEvaluation(
    context: TypedExpressionContext,
    input: any,
    result: TypedResult<boolean>,
    startTime: number
  ): void {
    context.evaluationHistory.push({
      expressionName: this.name,
      category: this.category,
      input,
      output: result.success ? result.value : result.error,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: result.success
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract form values with comprehensive input handling
 */
function extractFormValues(form: HTMLFormElement): Record<string, any> {
  const values: Record<string, any> = {};
  const elements = form.querySelectorAll('input, select, textarea');
  
  elements.forEach((element) => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (input.name) {
      const value = extractInputValue(input);
      if (value !== undefined) {
        if (values[input.name] !== undefined) {
          // Multiple values for same name - convert to array
          if (!Array.isArray(values[input.name])) {
            values[input.name] = [values[input.name]];
          }
          values[input.name].push(value);
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
function extractInputValue(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): any {
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

export const enhancedConversionExpressions = {
  as: new EnhancedAsExpression(),
  is: new EnhancedIsExpression()
} as const;

export type EnhancedConversionExpressionName = keyof typeof enhancedConversionExpressions;

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedAsExpression(): EnhancedAsExpression {
  return new EnhancedAsExpression();
}

export function createEnhancedIsExpression(): EnhancedIsExpression {
  return new EnhancedIsExpression();
}

// Classes are already exported above with export class declarations