/**
 * Reference Expressions - Deep TypeScript Integration
 * Handles me, you, it, CSS selectors, and DOM element references
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../../validation/lightweight-validators';
import type { RuntimeValidator } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExpressionContext,
  ExpressionMetadata,
} from '../../../types/expression-types';
import type {
  EvaluationResult,
  ValidationResult,
  HyperScriptValueType,
} from '../../../types/command-types';

// ============================================================================
// Me Expression
// ============================================================================

/**
 * Enhanced "me" expression - current element reference with type safety
 */
export class MeExpression
  implements TypedExpressionImplementation<undefined, HTMLElement | null, TypedExpressionContext>
{
  public readonly name = 'me' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'me';
  public readonly description = 'References the current element in the execution context';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType = 'Element' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<HTMLElement | null>> {
    try {
      // Track evaluation
      const startTime = Date.now();
      const element = context.me;

      // Add to evaluation history
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input,
        output: element,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true,
      });

      // Duck-typing for cross-realm compatibility (JSDOM vs native HTMLElement)
      const isElement = element && typeof element === 'object' && (element as any).nodeType === 1;

      return {
        success: true,
        value: isElement ? (element as HTMLElement) : null,
        type: 'element',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'MeExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "me"',
          code: 'ME_EVALUATION_FAILED',
          suggestions: [
            'Ensure element context is properly set',
            'Check if "me" is available in current scope',
          ],
        },
        type: 'error',
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // "me" takes no input, so any input is invalid
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [
          {
            type: 'type-mismatch',
            message: '"me" expression takes no arguments',
            suggestions: ['Use "me" without any parameters'],
          },
        ],
        suggestions: ['Use: me', 'Not: me(something)'],
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }
}

// ============================================================================
// You Expression
// ============================================================================

/**
 * Enhanced "you" expression - target element reference with validation
 */
export class YouExpression
  implements TypedExpressionImplementation<undefined, HTMLElement | null, TypedExpressionContext>
{
  public readonly name = 'you' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'you';
  public readonly description =
    'References the target element (usually event target or command target)';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType = 'Element' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<HTMLElement | null>> {
    try {
      const startTime = Date.now();
      const element = context.you;

      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input,
        output: element,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true,
      });

      // Duck-typing for cross-realm compatibility (JSDOM vs native HTMLElement)
      const isElement = element && typeof element === 'object' && (element as any).nodeType === 1;

      return {
        success: true,
        value: isElement ? (element as HTMLElement) : null,
        type: 'element',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'YouExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "you"',
          code: 'YOU_EVALUATION_FAILED',
          suggestions: [
            'Ensure target element is available in context',
            'Check if "you" is set by event or command',
          ],
        },
        type: 'error',
      };
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [
          {
            type: 'type-mismatch',
            message: '"you" expression takes no arguments',
            suggestions: ['Use "you" without any parameters'],
          },
        ],
        suggestions: ['Use: you', 'Not: you(something)'],
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }
}

// ============================================================================
// It Expression
// ============================================================================

/**
 * Enhanced "it" expression - context variable reference with type awareness
 */
export class ItExpression
  implements TypedExpressionImplementation<undefined, unknown, TypedExpressionContext>
{
  public readonly name = 'it' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'it';
  public readonly description =
    'References the current context variable (result of previous operation or loop item)';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType = 'Any' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<unknown>> {
    try {
      const startTime = Date.now();
      const value = context.it;

      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input,
        output: value,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        value,
        type: this.inferType(value),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ItExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "it"',
          code: 'IT_EVALUATION_FAILED',
          suggestions: [
            'Ensure "it" is set by previous operation',
            'Check if context variable is available',
          ],
        },
        type: 'error',
      };
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [
          {
            type: 'type-mismatch',
            message: '"it" expression takes no arguments',
            suggestions: ['Use "it" without any parameters'],
          },
        ],
        suggestions: ['Use: it', 'Not: it(something)'],
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }

  private inferType(value: unknown): HyperScriptValueType {
    if (value === null) return 'null';
    // Duck-typing for cross-realm compatibility (JSDOM vs native HTMLElement)
    if (value && typeof value === 'object' && (value as any).nodeType === 1) return 'element';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value as HyperScriptValueType;
  }
}

// ============================================================================
// Enhanced CSS Selector Expression
// ============================================================================

/**
 * CSS Selector input validation schema
 */
const CSSelectorInputSchema = v.object({
  selector: v.string().min(1),
  single: v.boolean().optional().default(false), // true for querySelector, false for querySelectorAll
});

type CSSSelectorInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced CSS selector expression with validation and error handling
 */
export class CSSSelectorExpression
  implements
    TypedExpressionImplementation<
      CSSSelectorInput,
      HTMLElement | HTMLElement[] | null,
      TypedExpressionContext
    >
{
  public readonly name = 'css-selector' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = '<selector/> or <selector/> (single)';
  public readonly description = 'Queries DOM elements using CSS selectors with validation';
  public readonly inputSchema = CSSelectorInputSchema;
  public readonly outputType = 'ElementList' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'medium',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: CSSSelectorInput
  ): Promise<EvaluationResult<HTMLElement | HTMLElement[] | null>> {
    try {
      const startTime = Date.now();

      // Validate CSS selector syntax
      if (!this.isValidCSSSelector(input.selector)) {
        return {
          success: false,
          error: {
            name: 'CSSSelectorError',
            type: 'invalid-argument',
            message: `Invalid CSS selector: "${input.selector}"`,
            code: 'INVALID_CSS_SELECTOR',
            suggestions: [
              'Check selector syntax',
              'Use valid CSS selector patterns like .class, #id, tag[attr]',
              'Avoid special characters that need escaping',
            ],
          },
          type: 'error',
        };
      }

      // Query DOM
      let result: HTMLElement | HTMLElement[] | null;

      if (input.single) {
        const element = document.querySelector(input.selector) as HTMLElement | null;
        result = element;
      } else {
        const elements = Array.from(document.querySelectorAll(input.selector)) as HTMLElement[];
        result = elements.length > 0 ? elements : null;
      }

      // Track evaluation
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input,
        output: result,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        value: result,
        type: Array.isArray(result) ? 'element-list' : 'element',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'CSSSelectorError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'CSS selector evaluation failed',
          code: 'CSS_SELECTOR_EVALUATION_FAILED',
          suggestions: [
            'Check if selector is valid CSS',
            'Ensure DOM is ready when query executes',
            'Verify elements exist in document',
          ],
        },
        type: 'error',
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
              type: 'type-mismatch' as const,
              message: `Invalid input: ${err.message}`,
              suggestions: this.getValidationSuggestion(err.code ?? 'unknown'),
            })) ?? [],
          suggestions: ['Provide valid CSS selector string', 'Check selector syntax'],
        };
      }

      // Additional validation
      const { selector } = parsed.data as { selector: string };

      if (!this.isValidCSSSelector(selector)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: `Invalid CSS selector syntax: "${selector}"`,
              suggestions: ['Use valid CSS selector patterns'],
            },
          ],
          suggestions: [
            'Use .class for class selectors',
            'Use #id for ID selectors',
            'Use tag for element selectors',
            'Use [attr] for attribute selectors',
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
        errors: [
          {
            type: 'runtime-error',
            message: 'Validation failed with exception',
            suggestions: ['Check input structure and types'],
          },
        ],
        suggestions: ['Ensure input matches expected format'],
      };
    }
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  private getValidationSuggestion(errorCode: string): string[] {
    const suggestions: Record<string, string> = {
      too_small: 'CSS selector cannot be empty',
      invalid_type: 'Selector must be a string',
      required: 'CSS selector is required',
    };

    return [suggestions[errorCode] || 'Check input format and types'];
  }
}

// ============================================================================
// Expression Registry and Exports
// ============================================================================

/**
 * Enhanced reference expressions registry
 */
export const referenceExpressions = {
  me: new EnhancedMeExpression(),
  you: new EnhancedYouExpression(),
  it: new EnhancedItExpression(),
  'css-selector': new EnhancedCSSSelectorExpression(),
} as const;

/**
 * Factory functions for creating enhanced reference expressions
 */
export function createMeExpression(): EnhancedMeExpression {
  return new EnhancedMeExpression();
}

export function createYouExpression(): EnhancedYouExpression {
  return new EnhancedYouExpression();
}

export function createItExpression(): EnhancedItExpression {
  return new EnhancedItExpression();
}

export function createCSSSelectorExpression(): EnhancedCSSSelectorExpression {
  return new EnhancedCSSSelectorExpression();
}

export default referenceExpressions;
