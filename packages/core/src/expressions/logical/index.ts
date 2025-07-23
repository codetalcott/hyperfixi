/**
 * Logical expressions for hyperscript
 * Handles comparison operators, boolean logic, and conditional expressions
 */

import type { ExecutionContext, ExpressionImplementation, EvaluationType } from '../../types/core.js';
import { matchesWithCache } from '../../performance/integration.js';

// ============================================================================
// Comparison Operators
// ============================================================================

export const equalsExpression: ExpressionImplementation = {
  name: 'equals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['is', '==', 'equals'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    // Hyperscript uses loose equality for 'is' and strict equality for other operators
    return left == right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'equals requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const strictEqualsExpression: ExpressionImplementation = {
  name: 'strictEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['==='],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left === right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'strictEquals requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const notEqualsExpression: ExpressionImplementation = {
  name: 'notEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['!=', 'is not', 'does not equal'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left != right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'notEquals requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const strictNotEqualsExpression: ExpressionImplementation = {
  name: 'strictNotEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['!=='],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left !== right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'strictNotEquals requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const lessThanExpression: ExpressionImplementation = {
  name: 'lessThan',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['<', 'is less than'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left < right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'lessThan requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const lessThanOrEqualExpression: ExpressionImplementation = {
  name: 'lessThanOrEqual',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['<=', 'is less than or equal to'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left <= right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'lessThanOrEqual requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const greaterThanExpression: ExpressionImplementation = {
  name: 'greaterThan',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['>', 'is greater than'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left > right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'greaterThan requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const greaterThanOrEqualExpression: ExpressionImplementation = {
  name: 'greaterThanOrEqual',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['>=', 'is greater than or equal to'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    return left >= right;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'greaterThanOrEqual requires exactly two arguments (left, right)';
    }
    return null;
  }
};

// ============================================================================
// Boolean Logic Operators
// ============================================================================

export const andExpression: ExpressionImplementation = {
  name: 'and',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 6,
  associativity: 'Left',
  operators: ['and', '&&'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    // Convert to boolean using truthy/falsy rules
    return Boolean(left) && Boolean(right);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'and requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const orExpression: ExpressionImplementation = {
  name: 'or',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 5,
  associativity: 'Left',
  operators: ['or', '||'],
  
  async evaluate(context: ExecutionContext, left: any, right: any): Promise<boolean> {
    // Convert to boolean using truthy/falsy rules
    return Boolean(left) || Boolean(right);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'or requires exactly two arguments (left, right)';
    }
    return null;
  }
};

export const notExpression: ExpressionImplementation = {
  name: 'not',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 15,
  associativity: 'Right',
  operators: ['not', '!'],
  
  async evaluate(context: ExecutionContext, operand: any): Promise<boolean> {
    // Convert to boolean using truthy/falsy rules
    return !Boolean(operand);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'not requires exactly one argument (operand)';
    }
    return null;
  }
};

// ============================================================================
// Type Checking Expressions
// ============================================================================

export const isEmptyExpression: ExpressionImplementation = {
  name: 'isEmpty',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['is empty', 'isEmpty'],
  
  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    if (value == null) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof NodeList) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'isEmpty requires exactly one argument (value)';
    }
    return null;
  }
};

export const noExpression: ExpressionImplementation = {
  name: 'no',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['no'],
  
  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    // The 'no' operator is equivalent to 'is empty' according to hyperscript docs
    return await isEmptyExpression.evaluate(context, value);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'no requires exactly one argument (value)';
    }
    return null;
  }
};

export const isNotEmptyExpression: ExpressionImplementation = {
  name: 'isNotEmpty',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['is not empty', 'isNotEmpty'],
  
  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    return !(await isEmptyExpression.evaluate(context, value));
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'isNotEmpty requires exactly one argument (value)';
    }
    return null;
  }
};

export const existsExpression: ExpressionImplementation = {
  name: 'exists',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['exists'],
  
  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    return value != null;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'exists requires exactly one argument (value)';
    }
    return null;
  }
};

export const doesNotExistExpression: ExpressionImplementation = {
  name: 'doesNotExist',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['does not exist', 'doesNotExist'],
  
  async evaluate(context: ExecutionContext, value: any): Promise<boolean> {
    return value == null;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 1) {
      return 'doesNotExist requires exactly one argument (value)';
    }
    return null;
  }
};

// ============================================================================
// String/Pattern Matching Expressions
// ============================================================================

export const containsExpression: ExpressionImplementation = {
  name: 'contains',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['contains', 'includes', 'include'],
  
  async evaluate(context: ExecutionContext, container: any, value: any): Promise<boolean> {
    // Handle DOM element containment first
    if (container && value) {
      // If both are DOM elements, check containment
      if (container.nodeType === 1 && value.nodeType === 1) {
        return container.contains(value);
      }
      
      // If container is CSS selector string, resolve to element
      if (typeof container === 'string' && container.match(/^[.#][\w-]+$/)) {
        const containerElement = document.querySelector(container);
        if (containerElement && value.nodeType === 1) {
          return containerElement.contains(value);
        }
        if (containerElement && typeof value === 'string' && value.match(/^[.#][\w-]+$/)) {
          const valueElement = document.querySelector(value);
          return valueElement ? containerElement.contains(valueElement) : false;
        }
      }
      
      // If value is CSS selector string, resolve to element
      if (typeof value === 'string' && value.match(/^[.#][\w-]+$/) && container.nodeType === 1) {
        const valueElement = document.querySelector(value);
        return valueElement ? container.contains(valueElement) : false;
      }
    }
    
    // String containment
    if (typeof container === 'string' && typeof value === 'string') {
      return container.includes(value);
    }
    
    // Array containment
    if (Array.isArray(container)) {
      return container.includes(value);
    }
    
    // Check for NodeList (browser environment only)
    if (typeof NodeList !== 'undefined' && container instanceof NodeList) {
      return Array.from(container).includes(value);
    }
    
    // Check if object has property
    if (typeof container === 'object' && container !== null && typeof value === 'string') {
      return value in container;
    }
    
    return false;
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'contains requires exactly two arguments (container, value)';
    }
    return null;
  }
};

export const doesNotContainExpression: ExpressionImplementation = {
  name: 'doesNotContain',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['does not contain', 'doesNotContain', 'does not include', 'doesNotInclude'],
  
  async evaluate(context: ExecutionContext, container: any, value: any): Promise<boolean> {
    return !(await containsExpression.evaluate(context, container, value));
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'doesNotContain requires exactly two arguments (container, value)';
    }
    return null;
  }
};

export const startsWithExpression: ExpressionImplementation = {
  name: 'startsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['starts with', 'startsWith'],
  
  async evaluate(context: ExecutionContext, str: any, prefix: any): Promise<boolean> {
    if (typeof str !== 'string' || typeof prefix !== 'string') {
      return false;
    }
    return str.startsWith(prefix);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'startsWith requires exactly two arguments (str, prefix)';
    }
    return null;
  }
};

export const endsWithExpression: ExpressionImplementation = {
  name: 'endsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['ends with', 'endsWith'],
  
  async evaluate(context: ExecutionContext, str: any, suffix: any): Promise<boolean> {
    if (typeof str !== 'string' || typeof suffix !== 'string') {
      return false;
    }
    return str.endsWith(suffix);
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'endsWith requires exactly two arguments (str, suffix)';
    }
    return null;
  }
};

export const matchesExpression: ExpressionImplementation = {
  name: 'matches',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['matches'],
  
  async evaluate(context: ExecutionContext, element: any, selector: any): Promise<boolean> {
    // If it's a DOM element and selector is a CSS selector, use CSS matching with cache
    if (element instanceof Element && typeof selector === 'string') {
      // Check if it looks like a CSS selector (starts with . # : [ or is a tag name)
      if (selector.startsWith('.') || selector.startsWith('#') || selector.startsWith(':') || 
          selector.startsWith('[') || /^[a-zA-Z][\w-]*$/.test(selector)) {
        try {
          return matchesWithCache(element, selector);
        } catch (error) {
          return false;
        }
      }
    }
    
    // Otherwise, treat as string pattern matching
    if (typeof element !== 'string' || typeof selector !== 'string') {
      return false;
    }
    
    try {
      // Support both string patterns and regex patterns
      const regex = selector.startsWith('/') && selector.endsWith('/') 
        ? new RegExp(selector.slice(1, -1))
        : new RegExp(selector);
      return regex.test(element);
    } catch (error) {
      // If pattern is invalid regex, treat as literal string
      return element.includes(selector);
    }
  },
  
  validate(args: any[]): string | null {
    if (args.length !== 2) {
      return 'matches requires exactly two arguments (element, selector)';
    }
    return null;
  }
};

// ============================================================================
// Export all logical expressions
// ============================================================================

export const logicalExpressions = {
  equals: equalsExpression,
  strictEquals: strictEqualsExpression,
  notEquals: notEqualsExpression,
  strictNotEquals: strictNotEqualsExpression,
  lessThan: lessThanExpression,
  lessThanOrEqual: lessThanOrEqualExpression,
  greaterThan: greaterThanExpression,
  greaterThanOrEqual: greaterThanOrEqualExpression,
  and: andExpression,
  or: orExpression,
  not: notExpression,
  no: noExpression,
  isEmpty: isEmptyExpression,
  isNotEmpty: isNotEmptyExpression,
  exists: existsExpression,
  doesNotExist: doesNotExistExpression,
  contains: containsExpression,
  doesNotContain: doesNotContainExpression,
  startsWith: startsWithExpression,
  endsWith: endsWithExpression,
  matches: matchesExpression,
} as const;

export type LogicalExpressionName = keyof typeof logicalExpressions;