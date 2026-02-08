/**
 * Enhanced Logical expressions for hyperscript
 * Handles comparison operators, boolean logic, and conditional expressions
 * Enhanced with TypeScript patterns, comprehensive validation, and LLM documentation
 *
 * Uses centralized type-helpers module for consistent type checking.
 */

import type { RuntimeValidator } from '../../validation/lightweight-validators';
import { v } from '../../validation/lightweight-validators';
import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import type { ExpressionMetadata, LLMDocumentation } from '../../types/expression-types';
import { matchesWithCache } from '../../performance/integration';
import { validateArgCount, validateTwoArgs } from '../validation-helpers';
import { isString, isObject } from '../type-helpers';
import { trackEvaluation } from '../shared';
import { compareValues } from '../shared/comparison-utils';

/** Duck-typed DOM element check for cross-realm compatibility (JSDOM/happy-dom). */
function isDOMElement(value: unknown): value is Element {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in (value as object) &&
    (value as { nodeType: number }).nodeType === 1
  );
}

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
    return validateTwoArgs(args, 'equals');
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
    return validateTwoArgs(args, 'strictEquals');
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
    return validateTwoArgs(args, 'notEquals');
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
    return validateTwoArgs(args, 'strictNotEquals');
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
    return compareValues(left, right, '<');
  },

  validate(args: unknown[]): string | null {
    return validateTwoArgs(args, 'lessThan');
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
    return compareValues(left, right, '<=');
  },

  validate(args: unknown[]): string | null {
    return validateTwoArgs(args, 'lessThanOrEqual');
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
    return compareValues(left, right, '>');
  },

  validate(args: unknown[]): string | null {
    return validateTwoArgs(args, 'greaterThan');
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
    return compareValues(left, right, '>=');
  },

  validate(args: unknown[]): string | null {
    return validateTwoArgs(args, 'greaterThanOrEqual');
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
    return validateTwoArgs(args, 'and');
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
    return validateTwoArgs(args, 'or');
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
    return validateArgCount(args, 1, 'not', 'operand');
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
    // Uses registry-based type checks
    if (isString(value)) return (value as string).length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof NodeList) return value.length === 0;
    // DOM elements should NEVER be considered empty
    if (value instanceof Node || value instanceof Element) return false;
    if (isObject(value)) return Object.keys(value as object).length === 0;
    return false;
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 1, 'isEmpty', 'value');
  },
};

export const noExpression: ExpressionImplementation = {
  name: 'no',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['no'],

  async evaluate(_context: ExecutionContext, value: unknown): Promise<boolean> {
    // The 'no' operator returns true for "absence of value":
    // - null/undefined: true (no value)
    // - false: true (boolean false is "no value" in _hyperscript)
    // - empty arrays/NodeLists: true (empty collections)
    // - everything else: false (including empty strings, 0, objects)
    if (value == null) return true;
    if (value === false) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof NodeList) return value.length === 0;
    // Strings exist even when empty - not "no value"
    if (isString(value)) return false;
    // DOM elements are real objects
    if (value instanceof Node || value instanceof Element) return false;
    // Objects with keys exist
    if (isObject(value)) return Object.keys(value as object).length === 0;
    // Numbers (including 0), true, etc. are values
    return false;
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 1, 'no', 'value');
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
    return validateArgCount(args, 1, 'isNotEmpty', 'value');
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
    return validateArgCount(args, 1, 'exists', 'value');
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
    return validateArgCount(args, 1, 'doesNotExist', 'value');
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
      if (isDOMElement(container) && isDOMElement(value)) {
        return (container as Node).contains(value as Node);
      }

      // If container is CSS selector string, resolve to element (uses registry-based type check)
      if (isString(container) && (container as string).match(/^[.#][\w-]+$/)) {
        const containerElement = document.querySelector(container as string);
        if (containerElement && isDOMElement(value)) {
          return containerElement.contains(value as Node);
        }
        if (containerElement && isString(value) && (value as string).match(/^[.#][\w-]+$/)) {
          const valueElement = document.querySelector(value as string);
          return valueElement ? containerElement.contains(valueElement) : false;
        }
      }

      // If value is CSS selector string, resolve to element (uses registry-based type check)
      if (isString(value) && (value as string).match(/^[.#][\w-]+$/) && isDOMElement(container)) {
        const valueElement = document.querySelector(value as string);
        return valueElement ? (container as Node).contains(valueElement) : false;
      }
    }

    // String containment (uses registry-based type checks)
    if (isString(container) && isString(value)) {
      return (container as string).includes(value as string);
    }

    // Array containment
    if (Array.isArray(container)) {
      return container.includes(value);
    }

    // Check for NodeList (browser environment only)
    if (typeof NodeList !== 'undefined' && container instanceof NodeList) {
      return Array.from(container).includes(value as Node);
    }

    // Check if object has property (uses registry-based type checks)
    if (isObject(container) && isString(value)) {
      return (value as string) in (container as object);
    }

    return false;
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 2, 'contains', 'container, value');
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
    return validateArgCount(args, 2, 'doesNotContain', 'container, value');
  },
};

export const startsWithExpression: ExpressionImplementation = {
  name: 'startsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['starts with', 'startsWith'],

  async evaluate(_context: ExecutionContext, str: unknown, prefix: unknown): Promise<boolean> {
    // Uses registry-based type checks
    if (!isString(str) || !isString(prefix)) {
      return false;
    }
    return (str as string).startsWith(prefix as string);
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 2, 'startsWith', 'str, prefix');
  },
};

export const endsWithExpression: ExpressionImplementation = {
  name: 'endsWith',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['ends with', 'endsWith'],

  async evaluate(_context: ExecutionContext, str: unknown, suffix: unknown): Promise<boolean> {
    // Uses registry-based type checks
    if (!isString(str) || !isString(suffix)) {
      return false;
    }
    return (str as string).endsWith(suffix as string);
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 2, 'endsWith', 'str, suffix');
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
      // Uses registry-based type check for selector
      if (element instanceof Element && isString(selector)) {
        const selectorStr = selector as string;
        // Check if it looks like a CSS selector (starts with . # : [ or is a tag name)
        if (
          selectorStr.startsWith('.') ||
          selectorStr.startsWith('#') ||
          selectorStr.startsWith(':') ||
          selectorStr.startsWith('[') ||
          /^[a-zA-Z][\w-]*$/.test(selectorStr)
        ) {
          try {
            result = matchesWithCache(element, selectorStr);
          } catch (error) {
            result = false;
          }
        } else {
          result = false;
        }
      } else if (isString(element) && isString(selector)) {
        // String pattern matching (uses registry-based type checks)
        const elementStr = element as string;
        const selectorStr = selector as string;
        try {
          // Support both string patterns and regex patterns
          const regex =
            selectorStr.startsWith('/') && selectorStr.endsWith('/')
              ? new RegExp(selectorStr.slice(1, -1))
              : new RegExp(selectorStr);
          result = regex.test(elementStr);
        } catch (error) {
          // If pattern is invalid regex, treat as literal string
          result = elementStr.includes(selectorStr);
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
    return validateArgCount(args, 2, 'matches', 'element, selector');
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
// Class/Attribute Presence Expressions
// ============================================================================

export const hasExpression: ExpressionImplementation = {
  name: 'has',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['has', 'have'],

  async evaluate(
    _context: ExecutionContext,
    element: unknown,
    selector: unknown
  ): Promise<boolean> {
    // Check class presence: "me has .active"
    if (element instanceof Element && isString(selector)) {
      const selectorStr = selector as string;
      if (selectorStr.startsWith('.')) {
        return element.classList.contains(selectorStr.slice(1));
      }
      // Check attribute presence: "me has [disabled]"
      if (selectorStr.startsWith('[') && selectorStr.endsWith(']')) {
        return element.hasAttribute(selectorStr.slice(1, -1));
      }
    }
    return false;
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 2, 'has', 'element, selector');
  },
};

export const doesNotHaveExpression: ExpressionImplementation = {
  name: 'doesNotHave',
  category: 'Logical',
  evaluatesTo: 'Boolean',
  operators: ['does not have'],

  async evaluate(context: ExecutionContext, element: unknown, selector: unknown): Promise<boolean> {
    return !(await hasExpression.evaluate(context, element, selector));
  },

  validate(args: unknown[]): string | null {
    return validateArgCount(args, 2, 'doesNotHave', 'element, selector');
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
  has: hasExpression,
  doesNotHave: doesNotHaveExpression,
} as const;

export type LogicalExpressionName = keyof typeof logicalExpressions;

// Re-export implementations for tests
export {
  AndExpression,
  OrExpression,
  NotExpression,
  createAndExpression,
  createOrExpression,
  createNotExpression,
} from './impl/index';
