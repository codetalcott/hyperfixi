/**
 * Enhanced Pattern Matching Expressions - TypeScript Integration
 * Implements pattern matching (matches, contains, in) with type safety
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExpressionContext,
  ExpressionCategory,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult
} from '../../../types/expression-types';
import type { 
  EvaluationResult,
  LLMDocumentation
} from '../../../types/command-types';

// ============================================================================
// Input Schemas
// ============================================================================

const PatternMatchInputSchema = v.object({
  value: v.unknown().describe('Value to test against pattern'),
  pattern: v.union([v.string(), v.instanceof(RegExp)]).describe('Pattern to match (string or regex)')
}).strict();

const ContainsInputSchema = v.object({
  container: v.unknown().describe('Container to search in (array, string, or object)'),
  item: v.unknown().describe('Item to search for')
}).strict();

const InInputSchema = v.object({
  item: v.unknown().describe('Item to search for'),
  container: v.unknown().describe('Container to search in (array, string, or object)')
}).strict();

type PatternMatchInput = any; // Inferred from RuntimeValidator
type ContainsInput = any; // Inferred from RuntimeValidator
type InInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Matches Expression
// ============================================================================

export class EnhancedMatchesExpression implements TypedExpressionImplementation<PatternMatchInput, boolean> {
  public readonly name = 'matches';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'value matches pattern';
  public readonly description = 'Pattern matching with CSS selectors and regular expressions';
  public readonly inputSchema = PatternMatchInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'medium',
    sideEffects: ['dom-query'], // For CSS selector matching
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'element matches .active',
        description: 'CSS selector matching',
        expectedOutput: true
      },
      {
        input: '"hello@example.com" matches /\\S+@\\S+\\.\\S+/',
        description: 'Email regex validation',
        expectedOutput: true
      },
      {
        input: '"hello world" matches "hello"',
        description: 'String contains matching',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['contains', 'in', 'querySelector'],
    performance: {
      averageTime: 0.5,
      complexity: 'O(n)' // Depends on pattern complexity
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Tests if a value matches a pattern using CSS selectors, regular expressions, or string matching',
    parameters: [
      {
        name: 'value',
        type: 'any',
        description: 'Value to test against the pattern',
        optional: false,
        examples: ['element', '"email@example.com"', '"hello world"', 'user.name']
      },
      {
        name: 'pattern',
        type: 'string | RegExp',
        description: 'Pattern to match against (CSS selector, regex, or substring)',
        optional: false,
        examples: ['.active', '/\\d+/', '"hello"', '#container > .item']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if value matches pattern, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'CSS selector matching',
        code: 'element matches .active',
        explanation: 'Check if element has "active" class',
        output: 'true'
      },
      {
        title: 'Email validation',
        code: 'email matches /\\S+@\\S+\\.\\S+/',
        explanation: 'Validate email format with regex',
        output: 'true'
      },
      {
        title: 'String substring matching',
        code: '"hello world" matches "world"',
        explanation: 'Check if string contains substring',
        output: 'true'
      },
      {
        title: 'Complex CSS selector',
        code: 'element matches "#main .content > .item:first-child"',
        explanation: 'Test against complex CSS selector',
        output: 'false'
      },
      {
        title: 'Number pattern matching',
        code: 'phoneNumber matches /^\\d{3}-\\d{3}-\\d{4}$/',
        explanation: 'Validate phone number format',
        output: 'true'
      }
    ],
    seeAlso: ['contains', 'in', 'querySelector', 'regular expressions'],
    tags: ['pattern', 'matching', 'css', 'regex', 'validation']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PatternMatchInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0]
        };
      }

      let result: boolean;

      // Handle different pattern types
      if (input.pattern instanceof RegExp) {
        // Regular expression matching
        result = this.matchRegex(input.value, input.pattern);
      } else if (typeof input.pattern === 'string') {
        // Determine pattern type
        if (this.isCSSSelector(input.pattern)) {
          // CSS selector matching
          result = this.matchCSSSelector(input.value, input.pattern);
        } else {
          // String substring matching
          result = this.matchString(input.value, input.pattern);
        }
      } else {
        throw new Error('Unsupported pattern type');
      }

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Pattern matching failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid matches input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide value and pattern',
            'Use string or RegExp for pattern'
          ]
        };
      }

      // Additional validation for pattern
      const { pattern } = parsed.data as { value: unknown; pattern: string | RegExp };
      
      if (typeof pattern === 'string') {
        // Validate CSS selector syntax if it looks like a selector
        if (this.isCSSSelector(pattern) && !this.isValidCSSSelector(pattern)) {
          return {
            isValid: false,
            error: {
              type: 'syntax-error',
              message: `Invalid CSS selector: ${pattern}`,
              suggestions: []
            },
            suggestions: [
              'Check CSS selector syntax',
              'Use valid selector patterns like .class, #id, tag[attr]'
            ],
            errors: []
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private matchRegex(value: unknown, pattern: RegExp): boolean {
    const stringValue = String(value);
    return pattern.test(stringValue);
  }

  private matchCSSSelector(value: unknown, selector: string): boolean {
    // For CSS selector matching, value should be an HTMLElement
    if (!(value instanceof HTMLElement)) {
      return false;
    }

    try {
      return value.matches(selector);
    } catch (error) {
      // Invalid CSS selector
      return false;
    }
  }

  private matchString(value: unknown, pattern: string): boolean {
    const stringValue = String(value);
    return stringValue.includes(pattern);
  }

  private isCSSSelector(pattern: string): boolean {
    // Simple heuristic to detect CSS selectors
    return /^[.#[]/.test(pattern) || // Starts with . # or [
           /[>+~]/.test(pattern) ||   // Contains combinators
           /:/.test(pattern);         // Contains pseudo-selectors
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'pattern matching',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Contains Expression
// ============================================================================

export class EnhancedContainsExpression implements TypedExpressionImplementation<ContainsInput, boolean> {
  public readonly name = 'contains';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'container contains item';
  public readonly description = 'Tests if a container (array, string, object) contains an item';
  public readonly inputSchema = ContainsInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '[1, 2, 3] contains 2',
        description: 'Array contains value',
        expectedOutput: true
      },
      {
        input: '"hello world" contains "world"',
        description: 'String contains substring',
        expectedOutput: true
      },
      {
        input: 'user contains "name"',
        description: 'Object contains property',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['matches', 'in', 'includes'],
    performance: {
      averageTime: 0.2,
      complexity: 'O(n)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Tests if a container (array, string, or object) contains a specific item or property',
    parameters: [
      {
        name: 'container',
        type: 'array | string | object',
        description: 'Container to search in',
        optional: false,
        examples: ['[1, 2, 3]', '"hello world"', 'user', 'items']
      },
      {
        name: 'item',
        type: 'any',
        description: 'Item to search for',
        optional: false,
        examples: ['2', '"world"', '"name"', 'value']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if container contains item, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Array membership',
        code: '[1, 2, 3] contains 2',
        explanation: 'Check if array contains specific value',
        output: 'true'
      },
      {
        title: 'String substring',
        code: '"hello world" contains "world"',
        explanation: 'Check if string contains substring',
        output: 'true'
      },
      {
        title: 'Object property',
        code: 'user contains "email"',
        explanation: 'Check if object has property',
        output: 'true'
      },
      {
        title: 'Case-sensitive string search',
        code: '"Hello World" contains "hello"',
        explanation: 'String search is case-sensitive',
        output: 'false'
      }
    ],
    seeAlso: ['matches', 'in', 'includes', 'hasOwnProperty'],
    tags: ['contains', 'membership', 'search', 'array', 'string', 'object']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ContainsInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0]
        };
      }

      let result: boolean;

      if (Array.isArray(input.container)) {
        // Array contains item
        result = input.container.includes(input.item);
      } else if (typeof input.container === 'string') {
        // String contains substring
        const itemStr = String(input.item);
        result = input.container.includes(itemStr);
      } else if (typeof input.container === 'object' && input.container !== null) {
        // Object contains property
        const itemStr = String(input.item);
        result = itemStr in input.container;
      } else {
        result = false;
      }

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Contains operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid contains input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide container and item',
            'Ensure container is array, string, or object'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'contains operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced In Expression
// ============================================================================

export class EnhancedInExpression implements TypedExpressionImplementation<InInput, boolean> {
  public readonly name = 'in';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'item in container';
  public readonly description = 'Tests if an item is in a container (reverse of contains)';
  public readonly inputSchema = InInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '2 in [1, 2, 3]',
        description: 'Value in array',
        expectedOutput: true
      },
      {
        input: '"world" in "hello world"',
        description: 'Substring in string',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['contains', 'matches'],
    performance: {
      averageTime: 0.2,
      complexity: 'O(n)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Tests if an item is present in a container (array, string, or object) - reverse syntax of contains',
    parameters: [
      {
        name: 'item',
        type: 'any',
        description: 'Item to search for',
        optional: false,
        examples: ['2', '"world"', '"name"', 'value']
      },
      {
        name: 'container',
        type: 'array | string | object',
        description: 'Container to search in',
        optional: false,
        examples: ['[1, 2, 3]', '"hello world"', 'user', 'items']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if item is in container, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Array membership',
        code: '2 in [1, 2, 3]',
        explanation: 'Check if value is in array',
        output: 'true'
      },
      {
        title: 'String substring',
        code: '"world" in "hello world"',
        explanation: 'Check if substring is in string',
        output: 'true'
      },
      {
        title: 'Object property',
        code: '"email" in user',
        explanation: 'Check if property is in object',
        output: 'true'
      }
    ],
    seeAlso: ['contains', 'matches', 'includes'],
    tags: ['in', 'membership', 'search', 'array', 'string', 'object']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: InInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0]
        };
      }

      // Delegate to contains expression with swapped parameters
      const containsExpr = new EnhancedContainsExpression();
      const containsResult = await containsExpr.evaluate(context, {
        container: input.container,
        item: input.item
      });

      this.trackPerformance(context, startTime, containsResult.success, containsResult.success ? containsResult.value : undefined);

      return containsResult;

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `In operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid in input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide item and container',
            'Ensure container is array, string, or object'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'in operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedMatchesExpression(): EnhancedMatchesExpression {
  return new EnhancedMatchesExpression();
}

export function createEnhancedContainsExpression(): EnhancedContainsExpression {
  return new EnhancedContainsExpression();
}

export function createEnhancedInExpression(): EnhancedInExpression {
  return new EnhancedInExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedPatternMatchingExpressions = {
  matches: createEnhancedMatchesExpression(),
  contains: createEnhancedContainsExpression(),
  in: createEnhancedInExpression()
} as const;