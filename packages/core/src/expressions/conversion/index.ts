/**
 * Conversion expressions for hyperscript
 * Handles type conversions using the 'as' keyword and built-in conversion types
 */

import type { ExecutionContext, ExpressionImplementation, EvaluationType } from '../../types/core.js';

// ============================================================================
// Built-in Conversion Types
// ============================================================================

type ConversionType = 
  | 'Array' | 'Boolean' | 'Date' | 'Float' | 'Fragment' | 'HTML' | 'Int' 
  | 'JSON' | 'Number' | 'Object' | 'String' | 'Values' 
  | 'Values:Form' | 'Values:JSON' | string; // Allow custom conversions

// ============================================================================
// Conversion Registry
// ============================================================================

export interface ConversionFunction {
  (value: any, context: ExecutionContext): any;
}

export const defaultConversions: Record<string, ConversionFunction> = {
  // Basic type conversions
  Array: (value: any) => {
    if (Array.isArray(value)) return value;
    if (value instanceof NodeList) return Array.from(value);
    if (value == null) return [];
    return [value];
  },

  String: (value: any) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },

  Boolean: (value: any) => {
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

  Number: (value: any) => {
    if (typeof value === 'number') return value;
    if (value == null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  Int: (value: any) => {
    const num = defaultConversions.Number(value);
    return Math.trunc(num);
  },

  Float: (value: any) => {
    const num = defaultConversions.Number(value);
    return parseFloat(num.toString());
  },

  Date: (value: any) => {
    if (value instanceof Date) return value;
    if (value == null) return new Date(NaN); // Returns Invalid Date 
    
    // Try to parse various date formats
    // Handle the common case where date strings are interpreted as UTC but we want local time
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // For YYYY-MM-DD format, create local date to avoid timezone issues
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day); // Month is 0-indexed
    }
    
    const date = new Date(value);
    return date; // Return the date even if invalid - let the caller handle validation
  },

  // JSON conversions
  JSON: (value: any) => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '{}';
    }
  },

  Object: (value: any) => {
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
  Fragment: (value: any) => {
    if (typeof value !== 'string') {
      value = defaultConversions.String(value);
    }
    
    const template = document.createElement('template');
    template.innerHTML = value;
    return template.content;
  },

  HTML: (value: any) => {
    if (typeof value === 'string') return value;
    if (value instanceof NodeList) {
      return Array.from(value).map(node => 
        node instanceof Element ? node.outerHTML : node.textContent || ''
      ).join('');
    }
    if (Array.isArray(value)) {
      return value.map(item => 
        item instanceof Element ? item.outerHTML : defaultConversions.String(item)
      ).join('');
    }
    if (value instanceof Element) {
      return value.outerHTML;
    }
    return defaultConversions.String(value);
  },

  // Form value conversions
  Values: (value: any, context: ExecutionContext) => {
    if (value instanceof HTMLFormElement) {
      return getFormValuesProcessed(value);
    }
    if (value instanceof HTMLElement) {
      // Try to find form values from any element
      const inputs = value.querySelectorAll('input, select, textarea');
      const values: Record<string, any> = {};
      inputs.forEach((input: Element) => {
        const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if ((htmlInput as any).name) {
          values[(htmlInput as any).name] = getInputValue(htmlInput);
        }
      });
      return values;
    }
    return {};
  },

  'Values:Form': (value: any, context: ExecutionContext) => {
    const values = defaultConversions.Values(value, context);
    return new URLSearchParams(values).toString();
  },

  'Values:JSON': (value: any, context: ExecutionContext) => {
    const values = defaultConversions.Values(value, context);
    return JSON.stringify(values);
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getFormValues(form: HTMLFormElement): Record<string, any> {
  const formData = new FormData(form);
  const values: Record<string, any> = {};
  
  for (const [key, value] of formData.entries()) {
    if (values[key] !== undefined) {
      // Multiple values for same key - convert to array
      if (!Array.isArray(values[key])) {
        values[key] = [values[key]];
      }
      values[key].push(value);
    } else {
      values[key] = value;
    }
  }
  
  return values;
}

function getFormValuesProcessed(form: HTMLFormElement): Record<string, any> {
  const values: Record<string, any> = {};
  const elements = form.querySelectorAll('input, select, textarea');
  
  elements.forEach((element) => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (input.name) {
      const value = getInputValue(input);
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

function getInputValue(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): any {
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
  
  async evaluate(context: ExecutionContext, value: any, type: string): Promise<any> {
    if (typeof type !== 'string') {
      throw new Error('Conversion type must be a string');
    }
    
    // Handle Fixed:<precision> conversion
    if (type.startsWith('Fixed')) {
      const { precision } = parseFixedPrecision(type);
      const num = defaultConversions.Number(value);
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
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'as expression requires exactly two arguments (value, type)';
    }
    if (typeof args[1] !== 'string') {
      return 'conversion type must be a string';
    }
    return null;
  }
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
  
  async evaluate(context: ExecutionContext, value: any, type: string): Promise<boolean> {
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
        return value == null || value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
      default:
        // Check constructor name for custom types
        return value?.constructor?.name?.toLowerCase() === type.toLowerCase();
    }
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'is expression requires exactly two arguments (value, type)';
    }
    if (typeof args[1] !== 'string') {
      return 'type must be a string';
    }
    return null;
  }
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
  
  async evaluate(context: ExecutionContext, expression: any): Promise<any> {
    // In hyperscript, async prevents automatic promise synchronization
    // Here we just return the value without awaiting if it's a promise
    return expression;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'async requires exactly one argument (expression)';
    }
    return null;
  }
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