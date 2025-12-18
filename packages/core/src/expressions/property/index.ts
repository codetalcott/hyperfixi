/**
 * Enhanced Property Access Expressions - Deep TypeScript Integration
 * Implements property access operations (my, its, possessive syntax) with comprehensive validation
 * Enhanced for LLM code agents with full type safety and context awareness
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~100 lines savings)
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../validation/lightweight-validators';
import type {
  ValidationResult,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  EvaluationResult,
  ExpressionCategory,
} from '../../types/base-types';
import type { HyperScriptValue } from '../../types/command-types';
import { BaseExpressionImpl } from '../base-expression';

// ============================================================================
// Input Schemas
// ============================================================================

const PropertyAccessInputSchema = v
  .object({
    property: v.string().describe('Property name to access'),
  })
  .strict();

const PossessiveAccessInputSchema = v
  .object({
    target: v.unknown().describe('Target object to access property from'),
    property: v.string().describe('Property name to access'),
  })
  .strict();

const AttributeAccessInputSchema = v
  .object({
    element: v.unknown().describe('DOM element to access attribute from'),
    attribute: v.string().describe('Attribute name to access'),
  })
  .strict();

type PropertyAccessInput = any; // Inferred from RuntimeValidator
type PossessiveAccessInput = any; // Inferred from RuntimeValidator
type AttributeAccessInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Shared Helper Functions
// ============================================================================

/**
 * Get property value with support for nested property paths
 * Shared between MyExpression and ItsExpression
 */
function getPropertyValue(target: unknown, propertyPath: string): HyperScriptValue {
  if (target == null) return undefined;

  // Handle simple property access
  if (!propertyPath.includes('.')) {
    return (target as Record<string, unknown>)[propertyPath] as HyperScriptValue;
  }

  // Handle nested property access (e.g., "dataset.value", "style.color")
  const parts = propertyPath.split('.');
  let current: unknown = target;

  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current as HyperScriptValue;
}

// ============================================================================
// My Expression (Context Property Access)
// ============================================================================

export class MyExpression extends BaseExpressionImpl<PropertyAccessInput, HyperScriptValue> {
  public readonly name = 'my';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'my property';
  public readonly description = 'Accesses properties of the current context element (me) with validation';
  public readonly inputSchema = PropertyAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PropertyAccessInput
  ): Promise<EvaluationResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      if (!context.me) {
        return {
          success: false,
          error: { type: 'context-error', message: 'No current element (me) available in context for property access', suggestions: ['Ensure this expression is used within an element context', 'Check that the element reference is properly set'] },
        };
      }

      const value = getPropertyValue(context.me, input.property);
      this.trackSimple(context, startTime, true, value);
      // Return 'unknown' for undefined to match HyperScriptValueType
      const resultType = value === undefined ? 'unknown' : this.inferType(value);
      return { success: true, value, type: resultType };
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return {
        success: false,
        error: { type: 'runtime-error', message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`, suggestions: ['Check that the property name is valid', 'Ensure the current element supports the requested property'] },
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid property access input',
          ['Provide a valid property name as a string', 'Ensure the property name is not empty']
        );
      }

      const { property } = parsed.data as { property: string };
      if (property.trim() === '') {
        return this.validationFailure('validation-error', 'Property name cannot be empty', ['Provide a non-empty property name']);
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', ['Check input structure and types']);
    }
  }
}

// ============================================================================
// Its Expression (Generic Property Access)
// ============================================================================

export class ItsExpression extends BaseExpressionImpl<PossessiveAccessInput, HyperScriptValue> {
  public readonly name = 'its';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'target its property';
  public readonly description = 'Generic possessive property access with comprehensive validation';
  public readonly inputSchema = PossessiveAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PossessiveAccessInput
  ): Promise<EvaluationResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      const value = getPropertyValue(input.target, input.property);
      this.trackSimple(context, startTime, true, value);
      // Return 'unknown' for undefined to match HyperScriptValueType
      const resultType = value === undefined ? 'unknown' : this.inferType(value);
      return { success: true, value, type: resultType };
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return {
        success: false,
        error: { type: 'runtime-error', message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`, suggestions: ['Check that the target object is not null or undefined', 'Ensure the property name is valid'] },
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid possessive access input',
          ['Provide both target and property parameters', 'Ensure property name is a string']
        );
      }

      const { property } = parsed.data as { property: string };
      if (property.trim() === '') {
        return this.validationFailure('validation-error', 'Property name cannot be empty', ['Provide a non-empty property name']);
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', ['Check input structure and types']);
    }
  }
}

// ============================================================================
// Attribute Expression (@attribute syntax)
// ============================================================================

export class AttributeExpression extends BaseExpressionImpl<AttributeAccessInput, string | null> {
  public readonly name = 'attribute';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute or element@attribute';
  public readonly description = 'Accesses HTML attributes with comprehensive DOM validation';
  public readonly inputSchema = AttributeAccessInputSchema;
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: AttributeAccessInput
  ): Promise<EvaluationResult<string | null>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      // Use inherited isElement from BaseExpressionImpl
      if (!this.isElement(input.element)) {
        return {
          success: false,
          error: { type: 'type-mismatch', message: 'Target must be a DOM element for attribute access', suggestions: ['Ensure the target is a valid DOM element', 'Check that the element reference is correct'] },
        };
      }

      const value = (input.element as Element).getAttribute(input.attribute);
      this.trackSimple(context, startTime, true, value);
      return { success: true, value, type: value === null ? 'null' : 'string' };
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return {
        success: false,
        error: { type: 'runtime-error', message: `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`, suggestions: ['Check that the element supports getAttribute', 'Ensure the attribute name is valid'] },
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid attribute access input',
          ['Provide both element and attribute parameters', 'Ensure attribute name is a string']
        );
      }

      const { attribute } = parsed.data as { attribute: string };
      if (attribute.trim() === '') {
        return this.validationFailure('validation-error', 'Attribute name cannot be empty', ['Provide a non-empty attribute name']);
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

export function createMyExpression(): MyExpression {
  return new MyExpression();
}

export function createItsExpression(): ItsExpression {
  return new ItsExpression();
}

export function createAttributeExpression(): AttributeExpression {
  return new AttributeExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const propertyExpressions = {
  my: createMyExpression(),
  its: createItsExpression(),
  attribute: createAttributeExpression(),
} as const;
