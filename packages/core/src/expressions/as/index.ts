/**
 * Enhanced As Expression - Type Conversion and Casting
 * Implements comprehensive 'as' expression functionality with TypeScript integration
 * Handles type conversions like 'value as String', 'data as JSON', 'form as Values'
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionImplementation,
  LLMDocumentation,
  TypedExecutionContext
} from '../../types/command-types';
import type { ValidationResult, ValidationError } from '../../types/base-types';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for 'as' expression input validation
 */
export const AsExpressionInputSchema = v.tuple([
  v.unknown().describe('Value to convert'),
  v.string().describe('Target type for conversion')
]);

export type AsExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Type Conversion Definitions
// ============================================================================

/**
 * Supported conversion types
 */
export const SUPPORTED_CONVERSION_TYPES = {
  // Basic types
  'string': true,
  'number': true,
  'int': true,
  'integer': true,
  'float': true,
  'boolean': true,
  'bool': true,
  'array': true,
  'date': true,
  
  // Object/JSON conversions
  'json': true,
  'object': true,
  
  // HTML/DOM conversions
  'html': true,
  'fragment': true,
  
  // Form processing
  'values': true,
  'values:form': true,
  'values:json': true,
  
  // Numeric formatting
  'fixed': true
} as const;

// ============================================================================
// Enhanced As Expression Implementation
// ============================================================================

/**
 * Enhanced 'as' expression for type conversion and casting
 * Supports all _hyperscript conversion types with comprehensive error handling
 */
export class EnhancedAsExpression implements TypedExpressionImplementation<
  HyperScriptValue
> {
  public readonly name = 'as';
  public readonly category = 'conversion' as const;
  public readonly precedence = 5; // Medium precedence for type conversion
  public readonly associativity = 'left' as const;
  public readonly outputType = 'object' as const;
  
  public readonly analysisInfo = {
    isPure: true, // Type conversion is pure
    canThrow: false, // We handle errors gracefully
    complexity: 'O(n)' as const, // May need to process complex data
    dependencies: ['type-conversion']
  };

  public readonly inputSchema = AsExpressionInputSchema;
  
  public readonly documentation: LLMDocumentation = {
    summary: 'Converts values between different types using comprehensive type conversion system',
    parameters: [
      {
        name: 'value',
        type: 'object',
        description: 'Value to convert to target type',
        optional: false,
        examples: ['42', '"hello"', 'formElement', '[1, 2, 3]', 'null']
      },
      {
        name: 'targetType',
        type: 'string',
        description: 'Target type for conversion',
        optional: false,
        examples: ['String', 'Int', 'JSON', 'Values', 'HTML', 'Boolean', 'Fixed:2']
      }
    ],
    returns: {
      type: 'object',
      description: 'Converted value in target type format',
      examples: ['"42"', '42', '{"key": "value"}', 'true', '<div>content</div>']
    },
    examples: [
      {
        title: 'String conversion',
        code: '42 as String',
        explanation: 'Converts number to string representation',
        output: '"42"'
      },
      {
        title: 'Integer conversion',
        code: '"10.7" as Int',
        explanation: 'Converts string to integer (truncated)',
        output: '10'
      },
      {
        title: 'JSON conversion',
        code: 'object as JSON',
        explanation: 'Converts object to JSON string',
        output: '{"name": "value"}'
      },
      {
        title: 'Form values extraction',
        code: 'form as Values',
        explanation: 'Extracts form data as key-value object',
        output: '{"name": "John", "email": "john@example.com"}'
      }
    ],
    seeAlso: ['type conversion', 'form processing', 'JSON serialization', 'HTML generation'],
    tags: ['conversion', 'casting', 'type', 'form', 'json', 'html']
  };

  /**
   * Validate 'as' expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      this.inputSchema.parse(args);
      
      const [_value, targetType] = args as AsExpressionInput;
      const errors: ValidationError[] = [];
      
      // Validate target type
      if (typeof targetType !== 'string' || targetType.length === 0) {
        errors.push({
          type: 'type-mismatch',
          message: 'Target type must be a non-empty string',
          suggestions: ['Provide a valid type like "String", "Int", "JSON", or "Values"']
        });
      } else {
        // Check if type is supported
        const normalizedType = this.normalizeTypeName(targetType);
        if (!this.isValidConversionType(normalizedType)) {
          errors.push({
            type: 'runtime-error',
            message: `Conversion type "${targetType}" is not supported`,
            suggestions: ['Use supported types: String, Int, JSON, Values, HTML, Boolean, Fixed, etc.']
          });
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        suggestions: [
          'Basic types: String, Int, Boolean, Array',
          'Special types: JSON, HTML, Values, Fixed:N',
          'Form processing: Values, Values:Form, Values:JSON'
        ]
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'missing-argument',
          message: error instanceof Error ? error.message : 'Invalid as expression arguments',
          suggestions: ['Provide value and target type']
        }],
        suggestions: [
          'Use format: value as TargetType',
          'Ensure both value and type are provided'
        ]
      };
    }
  }

  /**
   * Evaluate 'as' expression
   */
  evaluate(
    context: TypedExecutionContext,
    ...args: HyperScriptValue[]
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Validate input arguments
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return Promise.resolve({
          success: false,
          error: {
            name: 'AsExpressionValidationError',
            type: 'validation-error',
            message: `As expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'AS_EXPRESSION_VALIDATION_ERROR',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        });
      }

      const [value, targetType] = this.inputSchema.parse(args) as [unknown, string];
      
      // Perform type conversion
      const convertedValue = this.convertValue(value, targetType, context);
      
      return Promise.resolve({
        success: true,
        value: convertedValue,
        type: this.inferValueType(convertedValue)
      });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: {
          name: 'AsExpressionConversionError',
          type: 'runtime-error',
          message: `Failed to convert value: ${error instanceof Error ? error.message : String(error)}`,
          code: 'AS_EXPRESSION_CONVERSION_ERROR',
          suggestions: ['Check value is convertible to target type', 'Ensure target type is valid']
        },
        type: 'error'
      });
    }
  }

  /**
   * Convert value to target type
   */
  private convertValue(
    value: unknown,
    targetType: string,
    _context: TypedExecutionContext
  ): HyperScriptValue {
    // Handle null values - most conversions preserve null
    if (value === null || value === undefined) {
      const type = this.normalizeTypeName(targetType);
      // Some conversions return specific values for null
      if (type === 'array') return [];
      if (type === 'string') return null; // _hyperscript returns null, not empty string
      if (type === 'boolean') return false;
      return null;
    }

    const normalizedType = this.normalizeTypeName(targetType);
    
    switch (normalizedType) {
      case 'string':
        return this.convertToString(value);
      
      case 'number':
      case 'float':
        return this.convertToNumber(value);
      
      case 'int':
      case 'integer':
        return this.convertToInteger(value);
      
      case 'boolean':
      case 'bool':
        return this.convertToBoolean(value);
      
      case 'array':
        return this.convertToArray(value);
      
      case 'date':
        return this.convertToDate(value);
      
      case 'json':
        return this.convertToJSON(value);
      
      case 'object':
        return this.convertToObject(value);
      
      case 'html':
        return this.convertToHTML(value);
      
      case 'fragment':
        return this.convertToFragment(value);
      
      case 'values':
        return this.extractFormValues(value);
      
      case 'values:form':
        return this.extractFormValuesAsForm(value);
      
      case 'values:json':
        return this.extractFormValuesAsJSON(value);
      
      default:
        // Handle Fixed:N format
        if (normalizedType.startsWith('fixed')) {
          return this.convertToFixed(value, targetType);
        }
        
        throw new Error(`Unsupported conversion type: ${targetType}`);
    }
  }

  /**
   * Convert to string
   */
  private convertToString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (Array.isArray(value)) return value.join(',');
    if (value instanceof Element) return value.outerHTML;
    return String(value);
  }

  /**
   * Convert to number
   */
  private convertToNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return null;
  }

  /**
   * Convert to integer
   */
  private convertToInteger(value: unknown): number | null {
    const num = this.convertToNumber(value);
    return num === null ? null : Math.trunc(num);
  }

  /**
   * Convert to boolean
   */
  private convertToBoolean(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0 && !isNaN(value);
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true; // Objects and other truthy values
  }

  /**
   * Convert to array
   */
  private convertToArray(value: unknown): unknown[] {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    if (value instanceof NodeList) return Array.from(value);
    if (value instanceof FileList) return Array.from(value);
    return [value]; // Wrap single values
  }

  /**
   * Convert to Date
   */
  private convertToDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Special handling for YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(value + 'T00:00:00');
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'number') return new Date(value);
    return null;
  }

  /**
   * Convert to JSON string
   */
  private convertToJSON(value: unknown): string | null {
    if (value === null || value === undefined) return 'null';
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  /**
   * Convert to object (parse JSON)
   */
  private convertToObject(value: unknown): HyperScriptValue {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value as HyperScriptValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as HyperScriptValue;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Convert to HTML string
   */
  private convertToHTML(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Element) return value.outerHTML;
    if (Array.isArray(value)) {
      return value.map(item => 
        item instanceof Element ? item.outerHTML : String(item)
      ).join('');
    }
    if (value instanceof NodeList) {
      return Array.from(value).map(node => 
        node instanceof Element ? node.outerHTML : String(node)
      ).join('');
    }
    return String(value);
  }

  /**
   * Convert to DocumentFragment
   */
  private convertToFragment(value: unknown): DocumentFragment | null {
    if (value === null || value === undefined) return null;
    
    const fragment = document.createDocumentFragment();
    
    if (typeof value === 'string') {
      const temp = document.createElement('div');
      temp.innerHTML = value;
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
    } else if (value instanceof Element) {
      fragment.appendChild(value.cloneNode(true));
    } else if (Array.isArray(value)) {
      value.forEach(item => {
        if (item instanceof Element) {
          fragment.appendChild(item.cloneNode(true));
        }
      });
    }
    
    return fragment;
  }

  /**
   * Extract form values as object
   */
  private extractFormValues(value: unknown): Record<string, unknown> | null {
    if (!this.isFormElement(value) && !this.isElement(value)) return null;
    
    const element = value as Element;
    const values: Record<string, unknown> = {};
    
    // Handle form element directly
    if (element.tagName === 'FORM') {
      const formData = new FormData(element as HTMLFormElement);
      formData.forEach((val, key) => {
        if (values[key]) {
          // Handle multiple values (checkboxes, multi-select)
          if (Array.isArray(values[key])) {
            (values[key] as unknown[]).push(val);
          } else {
            values[key] = [values[key], val];
          }
        } else {
          values[key] = val;
        }
      });
      return values;
    }
    
    // Handle individual form elements
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const htmlInput = input as HTMLInputElement;
      const name = htmlInput.name;
      if (!name) return;
      
      if (htmlInput.type === 'checkbox') {
        values[name] = htmlInput.checked;
      } else if (htmlInput.type === 'radio') {
        if (htmlInput.checked) {
          values[name] = htmlInput.value;
        }
      } else {
        values[name] = htmlInput.value;
      }
    });
    
    return values;
  }

  /**
   * Extract form values as form-encoded string  
   */
  private extractFormValuesAsForm(value: unknown): string | null {
    const values = this.extractFormValues(value);
    if (!values) return null;
    
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(val));
      }
    });
    
    return params.toString();
  }

  /**
   * Extract form values as JSON string
   */
  private extractFormValuesAsJSON(value: unknown): string | null {
    const values = this.extractFormValues(value);
    if (!values) return null;
    
    try {
      return JSON.stringify(values);
    } catch {
      return null;
    }
  }

  /**
   * Convert to fixed-precision string
   */
  private convertToFixed(value: unknown, targetType: string): string | null {
    const num = this.convertToNumber(value);
    if (num === null) return null;
    
    // Extract precision from Fixed:N format
    const match = targetType.match(/fixed:?(\d+)?/i);
    const precision = match && match[1] ? parseInt(match[1]) : 2;
    
    return num.toFixed(precision);
  }

  /**
   * Normalize type name to standard format
   */
  private normalizeTypeName(typeName: string): string {
    return typeName.toLowerCase().trim();
  }

  /**
   * Check if conversion type is valid
   */
  private isValidConversionType(typeName: string): boolean {
    if (SUPPORTED_CONVERSION_TYPES[typeName as keyof typeof SUPPORTED_CONVERSION_TYPES]) {
      return true;
    }
    // Check for Fixed:N format
    return /^fixed:?\d*$/.test(typeName);
  }

  /**
   * Check if value is a form element
   */
  private isFormElement(value: unknown): boolean {
    return value instanceof HTMLFormElement;
  }

  /**
   * Check if value is an element
   */
  private isElement(value: unknown): boolean {
    return value instanceof Element;
  }

  /**
   * Infer TypeScript type from value
   */
  private inferValueType(value: unknown): HyperScriptValueType {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Element) return 'element';
    if (value instanceof DocumentFragment) return 'fragment';
    if (value instanceof Date) return 'object';
    if (typeof value === 'function') return 'function';
    return 'object';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'AsExpression',
      category: 'conversion' as const,
      version: '1.0.0',
      description: 'Enhanced type conversion and casting with comprehensive support for _hyperscript conversion types',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'basic type conversion (String, Int, Boolean)',
        'numeric conversions with precision (Fixed:N)',
        'JSON serialization and parsing',
        'HTML generation and fragment creation',
        'form data extraction (Values, Values:Form, Values:JSON)',
        'array and date conversions',
        'null-safe conversion handling',
        'element and NodeList processing'
      ],
      supportedTypes: Object.keys(SUPPORTED_CONVERSION_TYPES),
      performance: {
        complexity: 'low to medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'minimal to moderate'
      },
      capabilities: {
        contextAware: false, // Type conversion doesn't need context
        supportsAsync: true,
        sideEffects: false,
        cacheable: true
      }
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced as expression
 */
export function createAsExpression(): EnhancedAsExpression {
  return new EnhancedAsExpression();
}

/**
 * Type guard for as expression input
 */
export function isValidAsExpressionInput(args: unknown[]): args is AsExpressionInput {
  try {
    AsExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export function evaluateAs(
  value: HyperScriptValue,
  targetType: string,
  context: TypedExecutionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new EnhancedAsExpression();
  return expression.evaluate(context, value, targetType);
}

// Default exports
export { EnhancedAsExpression as default };