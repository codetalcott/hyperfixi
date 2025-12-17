/**
 * Enhanced Pattern Matching Expressions - TypeScript Integration
 * Implements pattern matching (matches, contains, in) with type safety
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~100 lines savings)
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  ExpressionCategory,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
} from '../../../types/expression-types';
import type { EvaluationResult } from '../../../types/command-types';
import { isString } from '../../type-helpers';
import { BaseExpressionImpl } from '../../base-expression';

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
// Shared Helper Functions
// ============================================================================

/**
 * Check if item is contained in container (array, string, or object)
 * Shared between ContainsExpression and InExpression
 */
function checkContainment(container: unknown, item: unknown): boolean {
  if (Array.isArray(container)) {
    return container.includes(item);
  } else if (typeof container === 'string') {
    return container.includes(String(item));
  } else if (typeof container === 'object' && container !== null) {
    return String(item) in container;
  }
  return false;
}

// ============================================================================
// Matches Expression
// ============================================================================

export class MatchesExpression extends BaseExpressionImpl<PatternMatchInput, boolean> {
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
        return { success: false, error: validation.errors[0] };
      }

      let result: boolean;

      if (input.pattern instanceof RegExp) {
        result = input.pattern.test(String(input.value));
      } else if (typeof input.pattern === 'string') {
        if (this.isCSSSelector(input.pattern)) {
          result = this.matchCSSSelector(input.value, input.pattern);
        } else {
          result = String(input.value).includes(input.pattern);
        }
      } else {
        throw new Error('Unsupported pattern type');
      }

      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<boolean>(
        'MatchesError',
        'runtime-error',
        `Pattern matching failed: ${error instanceof Error ? error.message : String(error)}`,
        'PATTERN_MATCH_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid matches input',
          ['Provide value and pattern', 'Use string or RegExp for pattern']
        );
      }

      const { pattern } = parsed.data as { value: unknown; pattern: string | RegExp };
      if (isString(pattern) && this.isCSSSelector(pattern as string) && !this.isValidCSSSelector(pattern as string)) {
        return this.validationFailure(
          'syntax-error',
          `Invalid CSS selector: ${pattern}`,
          ['Check CSS selector syntax', 'Use valid selector patterns like .class, #id, tag[attr]']
        );
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', ['Check input structure and types']);
    }
  }

  private matchCSSSelector(value: unknown, selector: string): boolean {
    if (!this.isElement(value)) return false;
    try {
      return (value as Element).matches(selector);
    } catch {
      return false;
    }
  }

  private isCSSSelector(pattern: string): boolean {
    return /^[.#[]/.test(pattern) || /[>+~]/.test(pattern) || /:/.test(pattern);
  }

  private isValidCSSSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Contains Expression
// ============================================================================

export class ContainsExpression extends BaseExpressionImpl<ContainsInput, boolean> {
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
        return { success: false, error: validation.errors[0] };
      }

      const result = checkContainment(input.container, input.item);
      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<boolean>(
        'ContainsError',
        'runtime-error',
        `Contains operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'CONTAINS_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid contains input',
          ['Provide container and item', 'Ensure container is array, string, or object']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', ['Check input structure and types']);
    }
  }
}

// ============================================================================
// In Expression
// ============================================================================

export class InExpression extends BaseExpressionImpl<InInput, boolean> {
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
        return { success: false, error: validation.errors[0] };
      }

      // Use shared containment check directly (no need to create ContainsExpression)
      const result = checkContainment(input.container, input.item);
      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<boolean>(
        'InError',
        'runtime-error',
        `In operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'IN_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid in input',
          ['Provide item and container', 'Ensure container is array, string, or object']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', ['Check input structure and types']);
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
