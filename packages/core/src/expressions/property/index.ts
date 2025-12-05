/**
 * Enhanced Property Access Expressions - Deep TypeScript Integration
 * Implements property access operations (my, its, possessive syntax) with comprehensive validation
 * Enhanced for LLM code agents with full type safety and context awareness
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../validation/lightweight-validators';
import type {
  ValidationResult,
  TypedExecutionContext as TypedExpressionContext,
  EvaluationType as EvaluationType,
  ExpressionMetadata as ExpressionMetadata,
  TypedResult as TypedResult,
  LLMDocumentation as LLMDocumentation,
  ExpressionCategory as ExpressionCategory,
  HyperScriptValue as HyperScriptValue,
} from '../../types/index';
import { isString, isNumber, isBoolean, isObject } from '../type-helpers';

// Define BaseTypedExpression locally for now
interface BaseTypedExpression<T> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly inputSchema: any;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;
  evaluate(context: TypedExpressionContext, input: unknown): Promise<TypedResult<T>>;
  validate(input: unknown): ValidationResult;
}

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
// My Expression (Context Property Access)
// ============================================================================

export class MyExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'my';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'my property';
  public readonly description =
    'Accesses properties of the current context element (me) with validation';
  public readonly inputSchema = PropertyAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: PropertyAccessInput
  ): Promise<TypedResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Check if 'me' context exists
      if (!context.me) {
        return {
          success: false,
          errors: [
            {
              type: 'context-error',
              message: 'No current element (me) available in context for property access',
              suggestions: [],
            },
          ],
          suggestions: [
            'Ensure this expression is used within an element context',
            'Check that the element reference is properly set',
            'Verify the expression is called from an event or command context',
          ],
        };
      }

      // Access the property
      const value = this.getPropertyValue(context.me, input.property);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: this.inferType(value),
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Check that the property name is valid',
          'Ensure the current element supports the requested property',
          'Verify the property path syntax is correct',
        ],
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
              message: `Invalid property access input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a valid property name as a string',
            'Ensure the property name is not empty',
          ],
        };
      }

      const { property } = parsed.data as { property: string };

      // Validate property name
      if (property.trim() === '') {
        return {
          isValid: false,
          errors: [
            {
              type: 'validation-error',
              message: 'Property name cannot be empty',
              suggestions: [],
            },
          ],
          suggestions: ['Provide a non-empty property name'],
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
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types'],
      };
    }
  }

  /**
   * Get property value with support for nested property paths
   */
  private getPropertyValue(target: any, propertyPath: string): HyperScriptValue {
    if (target == null) {
      return undefined;
    }

    // Handle simple property access
    if (!propertyPath.includes('.')) {
      return target[propertyPath];
    }

    // Handle nested property access (e.g., "dataset.value", "style.color")
    const parts = propertyPath.split('.');
    let current = target;

    for (const part of parts) {
      if (current == null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Infer the type of a value for result metadata
   */
  private inferType(value: unknown): EvaluationType {
    if (value === null) return 'null';
    if (value === undefined) return 'Any';
    if (isBoolean(value)) return 'boolean';
    if (isNumber(value)) return 'number';
    if (isString(value)) return 'string';
    if (Array.isArray(value)) return 'array';
    if (isObject(value)) return 'object';
    return 'Any';
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'property access',
        output: success ? 'value' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Its Expression (Generic Property Access)
// ============================================================================

export class ItsExpression implements BaseTypedExpression<HyperScriptValue> {
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
  ): Promise<TypedResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Access the property
      const value = this.getPropertyValue(input.target, input.property);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: this.inferType(value),
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Check that the target object is not null or undefined',
          'Ensure the property name is valid',
          'Verify the property path syntax is correct',
        ],
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
              message: `Invalid possessive access input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide both target and property parameters',
            'Ensure property name is a string',
          ],
        };
      }

      const { property } = parsed.data as { property: string };

      // Validate property name
      if (property.trim() === '') {
        return {
          isValid: false,
          errors: [
            {
              type: 'validation-error',
              message: 'Property name cannot be empty',
              suggestions: [],
            },
          ],
          suggestions: ['Provide a non-empty property name'],
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
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types'],
      };
    }
  }

  private getPropertyValue(target: any, propertyPath: string): HyperScriptValue {
    // Reuse the same logic as MyExpression
    const myExpr = new MyExpression();
    return myExpr['getPropertyValue'](target, propertyPath);
  }

  private inferType(value: unknown): EvaluationType {
    // Reuse the same logic as MyExpression
    const myExpr = new MyExpression();
    return myExpr['inferType'](value);
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'possessive access',
        output: success ? 'value' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Attribute Expression (@attribute syntax)
// ============================================================================

export class AttributeExpression implements BaseTypedExpression<string | null> {
  public readonly name = 'attribute';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute or element@attribute';
  public readonly description = 'Accesses HTML attributes with comprehensive DOM validation';
  public readonly inputSchema = AttributeAccessInputSchema;
  public readonly outputType: EvaluationType = 'string';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: AttributeAccessInput
  ): Promise<TypedResult<string | null>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Ensure element is a DOM element
      if (!this.isDOMElement(input.element)) {
        return {
          success: false,
          errors: [
            {
              type: 'type-mismatch',
              message: 'Target must be a DOM element for attribute access',
              suggestions: [],
            },
          ],
          suggestions: [
            'Ensure the target is a valid DOM element',
            'Check that the element reference is correct',
            'Verify the element exists in the DOM',
          ],
        };
      }

      // Access the attribute
      const value = input.element.getAttribute(input.attribute);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: value === null ? 'null' : 'string',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Check that the element supports getAttribute',
          'Ensure the attribute name is valid',
          'Verify the element is properly connected to the DOM',
        ],
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
              message: `Invalid attribute access input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide both element and attribute parameters',
            'Ensure attribute name is a string',
          ],
        };
      }

      const { attribute } = parsed.data as { attribute: string };

      // Validate attribute name
      if (attribute.trim() === '') {
        return {
          isValid: false,
          errors: [
            {
              type: 'validation-error',
              message: 'Attribute name cannot be empty',
              suggestions: [],
            },
          ],
          suggestions: ['Provide a non-empty attribute name'],
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
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types'],
      };
    }
  }

  /**
   * Check if a value is a DOM element
   */
  private isDOMElement(value: unknown): value is Element {
    return (
      value != null &&
      isObject(value) &&
      'getAttribute' in (value as object) &&
      'setAttribute' in (value as object) &&
      'nodeType' in (value as object) &&
      (value as any).nodeType === 1
    ); // Element node
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'attribute access',
        output: success ? 'string|null' : 'error',
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
