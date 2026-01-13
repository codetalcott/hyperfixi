/**
 * Reference Expressions - Deep TypeScript Integration
 * Handles me, you, it, CSS selectors, and DOM element references
 * Enhanced for LLM code agents with full type safety
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~3 KB savings)
 */

import { v } from '../../../validation/lightweight-validators';
import type { RuntimeValidator } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExpressionContext,
  ExpressionMetadata,
  ExpressionCategory,
} from '../../../types/expression-types';
import type {
  EvaluationResult,
  ValidationResult,
  HyperScriptValueType,
  EvaluationType,
} from '../../../types/command-types';
import { BaseExpressionImpl } from '../../base-expression';

// ============================================================================
// Me Expression
// ============================================================================

/**
 * Enhanced "me" expression - current element reference with type safety
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class MeExpression
  extends BaseExpressionImpl<undefined, HTMLElement | null>
  implements TypedExpressionImplementation<undefined, HTMLElement | null, TypedExpressionContext>
{
  public readonly name = 'me' as const;
  public readonly category: ExpressionCategory = 'Reference';
  public readonly syntax = 'me';
  public readonly description = 'References the current element in the execution context';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType: EvaluationType = 'Element';

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<HTMLElement | null>> {
    const startTime = Date.now();

    try {
      const element = context.me;

      // Duck-typing for cross-realm compatibility (JSDOM vs native HTMLElement)
      const value = this.isElement(element) ? (element as HTMLElement) : null;
      const result = this.success(value, 'element');

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<HTMLElement | null>(
        'MeExpressionError',
        'runtime-error',
        error instanceof Error ? error.message : 'Failed to evaluate "me"',
        'ME_EVALUATION_FAILED',
        ['Ensure element context is properly set', 'Check if "me" is available in current scope']
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return this.validationFailure('type-mismatch', '"me" expression takes no arguments', [
        'Use "me" without any parameters',
      ]);
    }
    return this.validationSuccess();
  }
}

// ============================================================================
// You Expression
// ============================================================================

/**
 * Enhanced "you" expression - target element reference with validation
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class YouExpression
  extends BaseExpressionImpl<undefined, HTMLElement | null>
  implements TypedExpressionImplementation<undefined, HTMLElement | null, TypedExpressionContext>
{
  public readonly name = 'you' as const;
  public readonly category: ExpressionCategory = 'Reference';
  public readonly syntax = 'you';
  public readonly description =
    'References the target element (usually event target or command target)';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType: EvaluationType = 'Element';

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<HTMLElement | null>> {
    const startTime = Date.now();

    try {
      const element = context.you;
      const value = this.isElement(element) ? (element as HTMLElement) : null;
      const result = this.success(value, 'element');

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<HTMLElement | null>(
        'YouExpressionError',
        'runtime-error',
        error instanceof Error ? error.message : 'Failed to evaluate "you"',
        'YOU_EVALUATION_FAILED',
        [
          'Ensure target element is available in context',
          'Check if "you" is set by event or command',
        ]
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return this.validationFailure('type-mismatch', '"you" expression takes no arguments', [
        'Use "you" without any parameters',
      ]);
    }
    return this.validationSuccess();
  }
}

// ============================================================================
// It Expression
// ============================================================================

/**
 * Enhanced "it" expression - context variable reference with type awareness
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class ItExpression
  extends BaseExpressionImpl<undefined, unknown>
  implements TypedExpressionImplementation<undefined, unknown, TypedExpressionContext>
{
  public readonly name = 'it' as const;
  public readonly category: ExpressionCategory = 'Reference';
  public readonly syntax = 'it';
  public readonly description =
    'References the current context variable (result of previous operation or loop item)';
  public readonly inputSchema = v.undefined() as RuntimeValidator<undefined>;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: undefined
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const value = context.it;
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: this.inferType(value),
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'ItExpressionError',
        'runtime-error',
        error instanceof Error ? error.message : 'Failed to evaluate "it"',
        'IT_EVALUATION_FAILED',
        ['Ensure "it" is set by previous operation', 'Check if context variable is available']
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return this.validationFailure('type-mismatch', '"it" expression takes no arguments', [
        'Use "it" without any parameters',
      ]);
    }
    return this.validationSuccess();
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
 * Now extends BaseExpressionImpl for reduced bundle size
 */
export class CSSSelectorExpression
  extends BaseExpressionImpl<CSSSelectorInput, HTMLElement | HTMLElement[] | null>
  implements
    TypedExpressionImplementation<
      CSSSelectorInput,
      HTMLElement | HTMLElement[] | null,
      TypedExpressionContext
    >
{
  public readonly name = 'css-selector' as const;
  public readonly category: ExpressionCategory = 'Reference';
  public readonly syntax = '<selector/> or <selector/> (single)';
  public readonly description = 'Queries DOM elements using CSS selectors with validation';
  public readonly inputSchema = CSSelectorInputSchema;
  public readonly outputType: EvaluationType = 'ElementList';

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'medium',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: CSSSelectorInput
  ): Promise<EvaluationResult<HTMLElement | HTMLElement[] | null>> {
    const startTime = Date.now();

    try {
      // Validate CSS selector syntax
      if (!this.isValidCSSSelector(input.selector)) {
        const errorResult = this.failure<HTMLElement | HTMLElement[] | null>(
          'CSSSelectorError',
          'invalid-argument',
          `Invalid CSS selector: "${input.selector}"`,
          'INVALID_CSS_SELECTOR',
          [
            'Check selector syntax',
            'Use valid CSS selector patterns like .class, #id, tag[attr]',
            'Avoid special characters that need escaping',
          ]
        );
        this.trackPerformance(context, input, errorResult, startTime);
        return errorResult;
      }

      // Query DOM
      let value: HTMLElement | HTMLElement[] | null;

      if (input.single) {
        const element = document.querySelector(input.selector) as HTMLElement | null;
        value = element;
      } else {
        const elements = Array.from(document.querySelectorAll(input.selector)) as HTMLElement[];
        value = elements.length > 0 ? elements : null;
      }

      const result: EvaluationResult<HTMLElement | HTMLElement[] | null> = {
        success: true,
        value,
        type: Array.isArray(value) ? 'element-list' : 'element',
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<HTMLElement | HTMLElement[] | null>(
        'CSSSelectorError',
        'runtime-error',
        error instanceof Error ? error.message : 'CSS selector evaluation failed',
        'CSS_SELECTOR_EVALUATION_FAILED',
        [
          'Check if selector is valid CSS',
          'Ensure DOM is ready when query executes',
          'Verify elements exist in document',
        ]
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
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
        return this.validationFailure(
          'syntax-error',
          `Invalid CSS selector syntax: "${selector}"`,
          [
            'Use .class for class selectors',
            'Use #id for ID selectors',
            'Use tag for element selectors',
            'Use [attr] for attribute selectors',
          ]
        );
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Ensure input matches expected format',
      ]);
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
  me: new MeExpression(),
  you: new YouExpression(),
  it: new ItExpression(),
  'css-selector': new CSSSelectorExpression(),
} as const;

/**
 * Factory functions for creating reference expressions
 */
export function createMeExpression(): MeExpression {
  return new MeExpression();
}

export function createYouExpression(): YouExpression {
  return new YouExpression();
}

export function createItExpression(): ItExpression {
  return new ItExpression();
}

export function createCSSSelectorExpression(): CSSSelectorExpression {
  return new CSSSelectorExpression();
}

export default referenceExpressions;
