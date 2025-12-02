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
  ValidationResult,
} from '../../../types/expression-types';
import type { EvaluationResult, LLMDocumentation } from '../../../types/command-types';

// ============================================================================
// Input Schemas
// ============================================================================

const PatternMatchInputSchema = v
  .object({
    value: v.unknown().describe('Value to test against pattern'),
    pattern: v
      .union([v.string(), v.instanceof(RegExp)])
      .describe('Pattern to match (string or regex)'),
  })
  .strict();

const ContainsInputSchema = v
  .object({
    container: v.unknown().describe('Container to search in (array, string, or object)'),
    item: v.unknown().describe('Item to search for'),
  })
  .strict();

const InInputSchema = v
  .object({
    item: v.unknown().describe('Item to search for'),
    container: v.unknown().describe('Container to search in (array, string, or object)'),
  })
  .strict();

type PatternMatchInput = any; // Inferred from RuntimeValidator
type ContainsInput = any; // Inferred from RuntimeValidator
type InInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Matches Expression
// ============================================================================

export class MatchesExpression
  implements TypedExpressionImplementation<PatternMatchInput, boolean>
{
  public readonly name = 'matches';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'value matches pattern';
  public readonly description = 'Pattern matching with CSS selectors and regular expressions';
  public readonly inputSchema = PatternMatchInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'medium',
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
          error: validation.errors[0],
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
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Pattern matching failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
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
              type: 'type-mismatch',
              message: `Invalid matches input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide value and pattern', 'Use string or RegExp for pattern'],
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
              suggestions: [],
            },
            suggestions: [
              'Check CSS selector syntax',
              'Use valid selector patterns like .class, #id, tag[attr]',
            ],
            errors: [],
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: [],
        },
        suggestions: ['Check input structure and types'],
        errors: [],
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
    return (
      /^[.#[]/.test(pattern) || // Starts with . # or [
      /[>+~]/.test(pattern) || // Contains combinators
      /:/.test(pattern)
    ); // Contains pseudo-selectors
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'pattern matching',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Contains Expression
// ============================================================================

export class ContainsExpression
  implements TypedExpressionImplementation<ContainsInput, boolean>
{
  public readonly name = 'contains';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'container contains item';
  public readonly description = 'Tests if a container (array, string, object) contains an item';
  public readonly inputSchema = ContainsInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
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
          error: validation.errors[0],
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
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Contains operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
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
              type: 'type-mismatch',
              message: `Invalid contains input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide container and item',
            'Ensure container is array, string, or object',
          ],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: [],
        },
        suggestions: ['Check input structure and types'],
        errors: [],
      };
    }
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'contains operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// In Expression
// ============================================================================

export class InExpression implements TypedExpressionImplementation<InInput, boolean> {
  public readonly name = 'in';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'item in container';
  public readonly description = 'Tests if an item is in a container (reverse of contains)';
  public readonly inputSchema = InInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
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
          error: validation.errors[0],
        };
      }

      // Delegate to contains expression with swapped parameters
      const containsExpr = new ContainsExpression();
      const containsResult = await containsExpr.evaluate(context, {
        container: input.container,
        item: input.item,
      });

      this.trackPerformance(
        context,
        startTime,
        containsResult.success,
        containsResult.success ? containsResult.value : undefined
      );

      return containsResult;
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `In operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
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
              type: 'type-mismatch',
              message: `Invalid in input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide item and container',
            'Ensure container is array, string, or object',
          ],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: [],
        },
        suggestions: ['Check input structure and types'],
        errors: [],
      };
    }
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'in operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMatchesExpression(): MatchesExpression {
  return new MatchesExpression();
}

export function createContainsExpression(): ContainsExpression {
  return new ContainsExpression();
}

export function createInExpression(): InExpression {
  return new InExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedPatternMatchingExpressions = {
  matches: createMatchesExpression(),
  contains: createContainsExpression(),
  in: createInExpression(),
} as const;
