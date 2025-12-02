/**
 * Conversion expressions for hyperscript
 * Handles type conversions using the 'as' keyword and built-in conversion types
 */

import type { ExecutionContext, ExpressionImplementation } from '../../types/core';

// ============================================================================
// Conversion Registry
// ============================================================================

export interface ConversionFunction {
  (value: unknown, context?: ExecutionContext): unknown;
}

export const defaultConversions: Record<string, ConversionFunction> = {
  // Basic type conversions
  Array: (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (value instanceof NodeList) return Array.from(value);
    if (value == null) return [];
    return [value];
  },

  String: (value: unknown) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },

  Boolean: (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (value == null) return false; // null and undefined are falsy
    if (typeof value === 'string') {
      // Handle special string cases
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') return false;
      return true; // Any other non-empty string is truthy
    }
    if (typeof value === 'number') {
      return value !== 0 && !isNaN(value); // 0 and NaN are falsy
    }
    // For objects, arrays, etc. - use JavaScript truthiness
    return Boolean(value);
  },

  Number: (value: unknown) => {
    if (typeof value === 'number') return value;
    if (value == null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  Math: (value: unknown) => {
    if (typeof value === 'number') return value;
    if (value == null) return 0;

    // Convert to string for expression evaluation
    const expression = String(value).trim();
    if (!expression) return 0;

    try {
      // Simple mathematical expression evaluator
      // Handle basic arithmetic with proper precedence
      return evaluateMathExpression(expression);
    } catch (error) {
      console.warn('Math conversion failed:', error);
      return 0;
    }
  },

  Int: (value: unknown) => {
    const num = defaultConversions.Number(value) as number;
    return Math.trunc(num);
  },

  Float: (value: unknown) => {
    const num = defaultConversions.Number(value) as number;
    return parseFloat(num.toString());
  },

  Date: (value: unknown) => {
    if (value instanceof Date) return value;
    if (value == null) return new Date(NaN); // Returns Invalid Date

    // Try to parse various date formats
    // Handle the common case where date strings are interpreted as UTC but we want local time
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // For YYYY-MM-DD format, create local date to avoid timezone issues
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day); // Month is 0-indexed
    }

    // Date constructor accepts string | number | Date
    const date = new Date(value as string | number | Date);
    return date; // Return the date even if invalid - let the caller handle validation
  },

  // JSON conversions
  JSON: (value: unknown) => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '{}';
    }
  },

  Object: (value: unknown) => {
    if (typeof value === 'object' && value !== null) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return {};
      }
    }
    return {};
  },

  // HTML/DOM conversions
  Fragment: (value: unknown) => {
    if (typeof value !== 'string') {
      value = defaultConversions.String(value);
    }

    const template = document.createElement('template');
    template.innerHTML = String(value);
    return template.content;
  },

  HTML: (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value instanceof NodeList) {
      return Array.from(value)
        .map(node => (node instanceof Element ? node.outerHTML : node.textContent || ''))
        .join('');
    }
    if (Array.isArray(value)) {
      return value
        .map(item => (item instanceof Element ? item.outerHTML : defaultConversions.String(item)))
        .join('');
    }
    if (value instanceof Element) {
      return value.outerHTML;
    }
    return defaultConversions.String(value);
  },

  // Form value conversions
  Values: (value: unknown, _context?: ExecutionContext) => {
    if (value instanceof HTMLFormElement) {
      return getFormValuesProcessed(value);
    }
    if (value instanceof HTMLElement) {
      // Try to find form values from any element
      const inputs = value.querySelectorAll('input, select, textarea');
      const values: Record<string, unknown> = {};
      inputs.forEach((input: Element) => {
        const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if ((htmlInput as HTMLInputElement).name) {
          values[(htmlInput as HTMLInputElement).name] = getInputValue(htmlInput);
        }
      });
      return values;
    }
    return {};
  },

  'Values:Form': (value: unknown, context?: ExecutionContext) => {
    const values = defaultConversions.Values(value, context);
    return new URLSearchParams(values as Record<string, string>).toString();
  },

  'Values:JSON': (value: unknown, context?: ExecutionContext) => {
    const values = defaultConversions.Values(value, context);
    return JSON.stringify(values);
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safe mathematical expression evaluator
 * Handles basic arithmetic with proper operator precedence
 */
function evaluateMathExpression(expression: string): number {
  // Remove whitespace
  expression = expression.replace(/\s/g, '');

  // Basic security check - only allow numbers, operators, parentheses, and decimal points
  if (!/^[0-9+\-*/().]+$/.test(expression)) {
    throw new Error('Invalid characters in math expression');
  }

  // Use Function constructor for safe evaluation (safer than eval)
  // This creates a function that returns the expression result
  try {
    const result = new Function(`"use strict"; return (${expression})`)();

    // Ensure result is a finite number
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Expression did not evaluate to a finite number');
    }

    return result;
  } catch (error) {
    throw new Error(
      `Math expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getFormValues(form: HTMLFormElement): Record<string, unknown> {
  const formData = new FormData(form);
  const values: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (values[key] !== undefined) {
      // Multiple values for same key - convert to array
      if (!Array.isArray(values[key])) {
        values[key] = [values[key]];
      }
      (values[key] as unknown[]).push(value);
    } else {
      values[key] = value;
    }
  }

  return values;
}

function getFormValuesProcessed(form: HTMLFormElement): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const elements = form.querySelectorAll('input, select, textarea');

  elements.forEach(element => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (input.name) {
      const value = getInputValue(input);
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

function getInputValue(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): unknown {
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

function parseFixedPrecision(type: string): { precision?: number } {
  const match = type.match(/^Fixed(?::(\d+))?$/);
  if (match) {
    return { precision: match[1] ? parseInt(match[1], 10) : 2 };
  }
  return {};
}

// ============================================================================
// Main Conversion Expression
// ============================================================================

export const asExpression: ExpressionImplementation = {
  name: 'as',
  category: 'Conversion',
  evaluatesTo: 'Any',
  precedence: 20,
  associativity: 'Left',
  operators: ['as'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [value, type] = args;
    if (typeof type !== 'string') {
      throw new Error('Conversion type must be a string');
    }

    // Handle Fixed:<precision> conversion
    if (type.startsWith('Fixed')) {
      const { precision } = parseFixedPrecision(type);
      const num = defaultConversions.Number(value) as number;
      return num.toFixed(precision || 2);
    }

    // Check for built-in conversion (case-sensitive first)
    let converter = defaultConversions[type];
    if (converter) {
      return converter(value, context);
    }

    // Check for case-insensitive matches and common aliases
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
      converter = defaultConversions[aliasedType];
      if (converter) {
        return converter(value, context);
      }
    }

    // Check for custom conversions in global config
    // This would be extended later to support _hyperscript.config.conversions

    // Fallback: return original value
    console.warn(`Unknown conversion type: ${type}`);
    return value;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'as expression requires exactly two arguments (value, type)';
    }
    if (typeof args[1] !== 'string') {
      return 'conversion type must be a string';
    }
    return null;
  },
};

// ============================================================================
// Type Checking Expressions
// ============================================================================

export const isExpression: ExpressionImplementation = {
  name: 'is',
  category: 'Conversion',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['is a', 'is an'],

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<boolean> {
    const [value, type] = args;
    if (typeof type !== 'string') {
      throw new Error('Type check requires a string type');
    }

    switch (type.toLowerCase()) {
      case 'null':
        return value === null;
      case 'undefined':
        return value === undefined;
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      case 'function':
        return typeof value === 'function';
      case 'date':
        return value instanceof Date;
      case 'element':
        return value instanceof Element;
      case 'node':
        return value instanceof Node;
      case 'nodelist':
        return value instanceof NodeList;
      case 'empty':
        return (
          value == null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && Object.keys(value).length === 0)
        );
      default:
        // Check constructor name for custom types
        return value?.constructor?.name?.toLowerCase() === type.toLowerCase();
    }
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'is expression requires exactly two arguments (value, type)';
    }
    if (typeof args[1] !== 'string') {
      return 'type must be a string';
    }
    return null;
  },
};

// ============================================================================
// Async Expression (prevents synchronization)
// ============================================================================

export const asyncExpression: ExpressionImplementation = {
  name: 'async',
  category: 'Conversion',
  evaluatesTo: 'Any',
  precedence: 25,
  associativity: 'Right',
  operators: ['async'],

  async evaluate(_context: ExecutionContext, expression: unknown): Promise<unknown> {
    // In hyperscript, async prevents automatic promise synchronization
    // Here we just return the value without awaiting if it's a promise
    return expression;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'async requires exactly one argument (expression)';
    }
    return null;
  },
};

// ============================================================================
// Export all conversion expressions
// ============================================================================

export const conversionExpressions = {
  as: asExpression,
  is: isExpression,
  async: asyncExpression,
} as const;

export type ConversionExpressionName = keyof typeof conversionExpressions;

// Export utility functions for testing
export { getFormValues, getFormValuesProcessed, getInputValue, parseFixedPrecision };

// Re-export enhanced implementations for tests
export {
  EnhancedAsExpression,
  createAsExpression,
} from './impl/index';
