/**
 * Enhanced Logical expressions for hyperscript
 * Handles comparison operators, boolean logic, and conditional expressions
 * Enhanced with TypeScript patterns, comprehensive validation, and LLM documentation
 */

import type { RuntimeValidator } from '../../validation/lightweight-validators';
import { v } from '../../validation/lightweight-validators';
import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import type { ExpressionMetadata, LLMDocumentation } from '../../types/expression-types';
import { matchesWithCache } from '../../performance/integration';

// ============================================================================
// Enhanced Expression Interface
// ============================================================================

/**
 * Enhanced expression implementation with metadata and LLM documentation
 */
interface EnhancedExpressionImplementation extends ExpressionImplementation {
  metadata?: ExpressionMetadata;
  documentation?: LLMDocumentation;
  inputSchema?: RuntimeValidator<unknown>;
}

/**
 * Enhanced evaluation tracking
 */
function trackEvaluation<T>(
  expression: ExpressionImplementation,
  context: ExecutionContext,
  args: unknown[],
  result: T,
  startTime: number,
  success: boolean = true,
  error?: Error
): T {
  // Add evaluation tracking if context supports it
  if ('evaluationHistory' in context && Array.isArray(context.evaluationHistory)) {
    (
      context as unknown as {
        evaluationHistory: Array<{
          expressionName: string;
          category: string;
          input: unknown;
          output: unknown;
          timestamp: number;
          duration: number;
          success: boolean;
          error?: Error;
        }>;
      }
    ).evaluationHistory.push({
      expressionName: expression.name,
      category: expression.category,
      input: args,
      output: result,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success,
      ...(error !== undefined && { error }),
    });
  }
  return result;
}

// ============================================================================
// Enhanced Input Schemas
// ============================================================================

const ComparisonInputSchema = v.tuple([v.unknown(), v.unknown()]);
const PatternMatchingInputSchema = v.tuple([v.unknown(), v.string()]);

// ============================================================================
// Comparison Operators
// ============================================================================

export const equalsExpression: EnhancedExpressionImplementation = {
  name: 'equals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['is', '==', 'equals'],

  async evaluate(context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    const startTime = Date.now();
    try {
      // Hyperscript uses loose equality for 'is' and strict equality for other operators
      const result = left == right;
      return trackEvaluation(this, context, [left, right], result, startTime);
    } catch (error) {
      trackEvaluation(
        this,
        context,
        [left, right],
        false,
        startTime,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'equals requires exactly two arguments (left, right)';
    }
    return null;
  },

  inputSchema: ComparisonInputSchema,

  metadata: {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'value is 5',
        description: 'Check if value equals 5 using loose equality',
        expectedOutput: true,
        context: { result: 5 },
      },
      {
        input: '"5" == 5',
        description: 'String "5" equals number 5 with type coercion',
        expectedOutput: true,
      },
    ],
    relatedExpressions: ['strictEquals', 'notEquals'],
    performance: {
      averageTime: 0.001,
      complexity: 'O(1)',
    },
  },

  documentation: {
    summary: 'Compares two values for loose equality, allowing type coercion',
    parameters: [
      {
        name: 'left',
        type: 'unknown',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['5', '"hello"', 'true', 'null'],
      },
      {
        name: 'right',
        type: 'unknown',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['5', '"hello"', 'true', 'null'],
      },
    ],
    returns: {
      type: 'Boolean',
      description: 'True if values are loosely equal, false otherwise',
      examples: ['true', 'false'],
    },
    examples: [
      {
        title: 'Basic equality check',
        code: 'if my.value is 10',
        explanation: 'Check if element value equals 10',
        output: 'Boolean result',
      },
      {
        title: 'Type coercion',
        code: 'if "5" == 5',
        explanation: 'String "5" equals number 5 with automatic type conversion',
        output: 'true',
      },
      {
        title: 'Null checks',
        code: 'if value is null',
        explanation: 'Check if value is null or undefined',
        output: 'Boolean result',
      },
    ],
    seeAlso: ['strictEquals', 'notEquals', 'matches'],
    tags: ['comparison', 'equality', 'logic', 'type-coercion'],
  },
};

export const strictEqualsExpression: ExpressionImplementation = {
  name: 'strictEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['==='],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return left === right;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'strictEquals requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const notEqualsExpression: ExpressionImplementation = {
  name: 'notEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['!=', 'is not', 'does not equal'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return left != right;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'notEquals requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const strictNotEqualsExpression: ExpressionImplementation = {
  name: 'strictNotEquals',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 10,
  associativity: 'Left',
  operators: ['!=='],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return left !== right;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'strictNotEquals requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const lessThanExpression: ExpressionImplementation = {
  name: 'lessThan',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['<', 'is less than'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return (left as any) < (right as any);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'lessThan requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const lessThanOrEqualExpression: ExpressionImplementation = {
  name: 'lessThanOrEqual',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['<=', 'is less than or equal to'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return (left as any) <= (right as any);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'lessThanOrEqual requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const greaterThanExpression: ExpressionImplementation = {
  name: 'greaterThan',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['>', 'is greater than'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return (left as any) > (right as any);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'greaterThan requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const greaterThanOrEqualExpression: ExpressionImplementation = {
  name: 'greaterThanOrEqual',
  category: 'Comparison',
  evaluatesTo: 'Boolean',
  precedence: 12,
  associativity: 'Left',
  operators: ['>=', 'is greater than or equal to'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<boolean> {
    return (left as any) >= (right as any);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'greaterThanOrEqual requires exactly two arguments (left, right)';
    }
    return null;
  },
};

// ============================================================================
// Boolean Logic Operators
// ============================================================================

export const andExpression: EnhancedExpressionImplementation = {
  name: 'and',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 6,
  associativity: 'Left',
  operators: ['and', '&&'],

  async evaluate(context: ExecutionContext, left: unknown, right: unknown): Promise<any> {
    const startTime = Date.now();
    try {
      // Return the first falsy value, or the last value if all are truthy
      // This matches JavaScript && behavior: returns actual values, not booleans
      const result = left && right;
      return trackEvaluation(this, context, [left, right], result, startTime);
    } catch (error) {
      trackEvaluation(
        this,
        context,
        [left, right],
        false,
        startTime,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'and requires exactly two arguments (left, right)';
    }
    return null;
  },

  inputSchema: ComparisonInputSchema,

  metadata: {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'true and false',
        description: 'Logical AND of boolean values',
        expectedOutput: false,
      },
      {
        input: 'name and age',
        description: 'Both name and age must be truthy',
        expectedOutput: true,
        context: {
          variables: new Map<string, unknown>([
            ['name', 'John'],
            ['age', 25],
          ]),
        },
      },
    ],
    relatedExpressions: ['or', 'not'],
    performance: {
      averageTime: 0.001,
      complexity: 'O(1)',
    },
  },

  documentation: {
    summary: 'Logical AND operation that returns true only if both operands are truthy',
    parameters: [
      {
        name: 'left',
        type: 'unknown',
        description: 'Left operand (evaluated for truthiness)',
        optional: false,
        examples: ['true', 'name', '5', '"hello"'],
      },
      {
        name: 'right',
        type: 'unknown',
        description: 'Right operand (evaluated for truthiness)',
        optional: false,
        examples: ['false', 'age', '0', '""'],
      },
    ],
    returns: {
      type: 'Boolean',
      description: 'True if both operands are truthy, false otherwise',
      examples: ['true', 'false'],
    },
    examples: [
      {
        title: 'Form validation',
        code: 'if name and email',
        explanation: 'Check if both name and email have values',
        output: 'Boolean result',
      },
      {
        title: 'Multiple conditions',
        code: 'if age > 18 and hasLicense',
        explanation: 'Combine multiple conditions',
        output: 'Boolean result',
      },
      {
        title: 'Short-circuit evaluation',
        code: 'if element and element.value',
        explanation: 'Check element exists before accessing properties',
        output: 'Boolean result',
      },
    ],
    seeAlso: ['or', 'not', 'exists'],
    tags: ['logic', 'boolean', 'conditions', 'validation'],
  },
};

export const orExpression: ExpressionImplementation = {
  name: 'or',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 5,
  associativity: 'Left',
  operators: ['or', '||'],

  async evaluate(_context: ExecutionContext, left: unknown, right: unknown): Promise<any> {
    // Return the first truthy value, or the last value if all are falsy
    // This matches JavaScript || behavior: returns actual values, not booleans
    return left || right;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'or requires exactly two arguments (left, right)';
    }
    return null;
  },
};

export const notExpression: ExpressionImplementation = {
  name: 'not',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  precedence: 15,
  associativity: 'Right',
  operators: ['not', '!'],

  async evaluate(_context: ExecutionContext, operand: unknown): Promise<boolean> {
    // Convert to boolean using truthy/falsy rules
    return !operand;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'not requires exactly one argument (operand)';
    }
    return null;
  },
};

// ============================================================================
// Type Checking Expressions
// ============================================================================

export const isEmptyExpression: ExpressionImplementation = {
  name: 'isEmpty',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['is empty', 'isEmpty'],

  async evaluate(_context: ExecutionContext, value: unknown): Promise<boolean> {
    if (value == null) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof NodeList) return value.length === 0;
    // DOM elements should NEVER be considered empty
    if (value instanceof Node || value instanceof Element) return false;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'isEmpty requires exactly one argument (value)';
    }
    return null;
  },
};

export const noExpression: ExpressionImplementation = {
  name: 'no',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['no'],

  async evaluate(_context: ExecutionContext, value: unknown): Promise<boolean> {
    // The 'no' operator should return true for empty/null/undefined values
    // but false for actual values including false and 0
    if (value == null) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof NodeList) return value.length === 0;
    // DOM elements (Node, Element, HTMLElement) should NEVER be considered empty
    // They are real, tangible objects with properties on the prototype chain
    if (value instanceof Node || value instanceof Element) return false;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    // For primitives like false, 0, etc., they are actual values so return false
    return false;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'no requires exactly one argument (value)';
    }
    return null;
  },
};

export const isNotEmptyExpression: ExpressionImplementation = {
  name: 'isNotEmpty',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['is not empty', 'isNotEmpty'],

  async evaluate(context: ExecutionContext, value: unknown): Promise<boolean> {
    return !(await isEmptyExpression.evaluate(context, value));
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'isNotEmpty requires exactly one argument (value)';
    }
    return null;
  },
};

export const existsExpression: ExpressionImplementation = {
  name: 'exists',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['exists'],

  async evaluate(_context: ExecutionContext, value: unknown): Promise<boolean> {
    return value != null;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'exists requires exactly one argument (value)';
    }
    return null;
  },
};

export const doesNotExistExpression: ExpressionImplementation = {
  name: 'doesNotExist',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['does not exist', 'doesNotExist'],

  async evaluate(_context: ExecutionContext, value: unknown): Promise<boolean> {
    return value == null;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'doesNotExist requires exactly one argument (value)';
    }
    return null;
  },
};

// ============================================================================
// String/Pattern Matching Expressions
// ============================================================================

export const containsExpression: ExpressionImplementation = {
  name: 'contains',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['contains', 'includes', 'include'],

  async evaluate(_context: ExecutionContext, container: unknown, value: unknown): Promise<boolean> {
    // Handle DOM element containment first
    if (container && value) {
      // If both are DOM elements, check containment
      if ((container as any).nodeType === 1 && (value as any).nodeType === 1) {
        return (container as Node).contains(value as Node);
      }

      // If container is CSS selector string, resolve to element
      if (typeof container === 'string' && container.match(/^[.#][\w-]+$/)) {
        const containerElement = document.querySelector(container);
        if (containerElement && (value as any).nodeType === 1) {
          return containerElement.contains(value as Node);
        }
        if (containerElement && typeof value === 'string' && value.match(/^[.#][\w-]+$/)) {
          const valueElement = document.querySelector(value);
          return valueElement ? containerElement.contains(valueElement) : false;
        }
      }

      // If value is CSS selector string, resolve to element
      if (
        typeof value === 'string' &&
        value.match(/^[.#][\w-]+$/) &&
        (container as any).nodeType === 1
      ) {
        const valueElement = document.querySelector(value);
        return valueElement ? (container as Node).contains(valueElement) : false;
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
      return Array.from(container).includes(value as Node);
    }

    // Check if object has property
    if (typeof container === 'object' && container !== null && typeof value === 'string') {
      return value in container;
    }

    return false;
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'contains requires exactly two arguments (container, value)';
    }
    return null;
  },
};

export const doesNotContainExpression: ExpressionImplementation = {
  name: 'doesNotContain',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['does not contain', 'doesNotContain', 'does not include', 'doesNotInclude'],

  async evaluate(context: ExecutionContext, container: unknown, value: unknown): Promise<boolean> {
    return !(await containsExpression.evaluate(context, container, value));
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'doesNotContain requires exactly two arguments (container, value)';
    }
    return null;
  },
};

export const startsWithExpression: ExpressionImplementation = {
  name: 'startsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['starts with', 'startsWith'],

  async evaluate(_context: ExecutionContext, str: unknown, prefix: unknown): Promise<boolean> {
    if (typeof str !== 'string' || typeof prefix !== 'string') {
      return false;
    }
    return str.startsWith(prefix);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'startsWith requires exactly two arguments (str, prefix)';
    }
    return null;
  },
};

export const endsWithExpression: ExpressionImplementation = {
  name: 'endsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['ends with', 'endsWith'],

  async evaluate(_context: ExecutionContext, str: unknown, suffix: unknown): Promise<boolean> {
    if (typeof str !== 'string' || typeof suffix !== 'string') {
      return false;
    }
    return str.endsWith(suffix);
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'endsWith requires exactly two arguments (str, suffix)';
    }
    return null;
  },
};

export const matchesExpression: EnhancedExpressionImplementation = {
  name: 'matches',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['matches'],

  async evaluate(context: ExecutionContext, element: unknown, selector: unknown): Promise<boolean> {
    const startTime = Date.now();
    try {
      let result: boolean;

      // If it's a DOM element and selector is a CSS selector, use CSS matching with cache
      if (element instanceof Element && typeof selector === 'string') {
        // Check if it looks like a CSS selector (starts with . # : [ or is a tag name)
        if (
          selector.startsWith('.') ||
          selector.startsWith('#') ||
          selector.startsWith(':') ||
          selector.startsWith('[') ||
          /^[a-zA-Z][\w-]*$/.test(selector)
        ) {
          try {
            result = matchesWithCache(element, selector);
          } catch (error) {
            result = false;
          }
        } else {
          result = false;
        }
      } else if (typeof element === 'string' && typeof selector === 'string') {
        // String pattern matching
        try {
          // Support both string patterns and regex patterns
          const regex =
            selector.startsWith('/') && selector.endsWith('/')
              ? new RegExp(selector.slice(1, -1))
              : new RegExp(selector);
          result = regex.test(element);
        } catch (error) {
          // If pattern is invalid regex, treat as literal string
          result = element.includes(selector);
        }
      } else {
        result = false;
      }

      return trackEvaluation(this, context, [element, selector], result, startTime);
    } catch (error) {
      trackEvaluation(
        this,
        context,
        [element, selector],
        false,
        startTime,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },

  validate(args: unknown[]): string | null {
    if (args.length !== 2) {
      return 'matches requires exactly two arguments (element, selector)';
    }
    return null;
  },

  inputSchema: PatternMatchingInputSchema,

  metadata: {
    category: 'Logical',
    complexity: 'medium',
    sideEffects: ['dom-query'],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'element matches ".active"',
        description: 'Check if element has active class',
        expectedOutput: true,
      },
      {
        input: 'text matches "/^hello/"',
        description: 'Check if text starts with "hello" using regex',
        expectedOutput: true,
        context: { variables: new Map([['text', 'hello world']]) },
      },
    ],
    relatedExpressions: ['contains', 'startsWith', 'endsWith'],
    performance: {
      averageTime: 0.5,
      complexity: 'O(n)',
    },
  },

  documentation: {
    summary: 'Tests if element matches CSS selector or string matches regex pattern',
    parameters: [
      {
        name: 'element',
        type: 'Element | string',
        description: 'DOM element or string to test',
        optional: false,
        examples: ['<div>', '"hello world"', 'me', 'target'],
      },
      {
        name: 'selector',
        type: 'string',
        description: 'CSS selector or regex pattern to match against',
        optional: false,
        examples: ['".active"', '"#navbar"', '"/^hello/"', '"\\\\d+"'],
      },
    ],
    returns: {
      type: 'Boolean',
      description: 'True if element matches selector/pattern',
      examples: ['true', 'false'],
    },
    examples: [
      {
        title: 'CSS class matching',
        code: 'if me matches ".active"',
        explanation: 'Check if current element has "active" class',
        output: 'Boolean result',
      },
      {
        title: 'Attribute matching',
        code: 'if target matches "[data-role=\\"button\\"]"',
        explanation: 'Check if element has specific data attribute',
        output: 'Boolean result',
      },
      {
        title: 'Regex pattern matching',
        code: 'if email matches "/^[^@]+@[^@]+\\\\.[^@]+$/"',
        explanation: 'Validate email format with regex',
        output: 'Boolean result',
      },
      {
        title: 'Complex CSS selector',
        code: 'if element matches ".card:hover .button"',
        explanation: 'Match complex CSS selector with pseudo-classes',
        output: 'Boolean result',
      },
    ],
    seeAlso: ['contains', 'startsWith', 'endsWith', 'querySelector'],
    tags: ['pattern', 'css', 'regex', 'validation', 'dom'],
  },
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

// Re-export enhanced implementations for tests
export {
  EnhancedAndExpression,
  EnhancedOrExpression,
  EnhancedNotExpression,
  createAndExpression,
  createOrExpression,
  createNotExpression,
} from './impl/index';
