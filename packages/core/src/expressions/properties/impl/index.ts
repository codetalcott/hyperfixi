/**
 * Property Expressions for HyperScript
 * Provides deep TypeScript integration for property access, possessive syntax, and attributes
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~5 KB savings)
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  EvaluationResult,
} from '../../../types/base-types';
import { evaluationToHyperScriptType } from '../../../types/base-types';
import type { ExpressionCategory } from '../../../types/expression-types';
import { BaseExpressionImpl } from '../../base-expression';

// ============================================================================
// Input Schemas
// ============================================================================

const PropertyAccessInputSchema = v
  .object({
    element: v.unknown().describe('Element or object to access property from'),
    property: v.string().describe('Property name to access'),
  })
  .strict();

const AttributeAccessInputSchema = v
  .object({
    element: v.unknown().describe('Element to access attribute from'),
    attribute: v.string().describe('Attribute name to access'),
  })
  .strict();

const ContextPropertyInputSchema = v
  .object({
    property: v.string().describe('Property name to access from context'),
  })
  .strict();

const AttributeWithValueInputSchema = v
  .object({
    element: v.unknown().describe('Element to check attribute value'),
    attribute: v.string().describe('Attribute name to check'),
    value: v.string().describe('Expected attribute value'),
  })
  .strict();

type PropertyAccessInput = any; // Inferred from RuntimeValidator
type AttributeAccessInput = any; // Inferred from RuntimeValidator
type ContextPropertyInput = any; // Inferred from RuntimeValidator
type AttributeWithValueInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Possessive Expression (element's property)
// ============================================================================

export class PossessiveExpression
  extends BaseExpressionImpl<PropertyAccessInput, unknown>
  implements BaseTypedExpression<unknown>
{
  public readonly name = 'possessive';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = "element's property";
  public readonly description = 'Access object or element properties using possessive syntax';
  public readonly inputSchema = PropertyAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PropertyAccessInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      const value = this.getProperty(input.element, input.property);
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: evaluationToHyperScriptType[this.inferResultType(value)],
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'PossessiveExpressionError',
        'runtime-error',
        `Property access failed: ${error instanceof Error ? error.message : String(error)}`,
        'PROPERTY_ACCESS_FAILED'
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
              message: `Invalid possessive input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide element and property parameters', 'Ensure property is a string'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }

  private getProperty(element: unknown, property: string): unknown {
    if (element == null) {
      return undefined;
    }

    // Handle DOM elements with special property handling
    if (element instanceof Element) {
      return this.getElementProperty(element, property);
    }

    // Handle regular object property access
    if (typeof element === 'object') {
      return (element as any)[property];
    }

    // Handle primitive values
    return (element as any)[property];
  }

  private getElementProperty(element: Element, property: string): unknown {
    // Handle special DOM properties
    switch (property.toLowerCase()) {
      case 'id':
        return element.id;
      case 'classname':
      case 'class':
        return element.className;
      case 'tagname':
        return element.tagName.toLowerCase();
      case 'innertext':
        return element.textContent?.trim();
      case 'innerhtml':
        return element.innerHTML;
      case 'outerhtml':
        return element.outerHTML;
      case 'value':
        return (element as any).value;
      case 'checked':
        return (element as any).checked;
      case 'disabled':
        return (element as any).disabled;
      case 'selected':
        return (element as any).selected;
      case 'hidden':
        return (element as any).hidden;
      case 'style':
        return getComputedStyle(element);
      case 'children':
        return Array.from(element.children);
      case 'parent':
        return element.parentElement;
      case 'firstchild':
        return element.firstElementChild;
      case 'lastchild':
        return element.lastElementChild;
      case 'nextsibling':
        return element.nextElementSibling;
      case 'previoussibling':
        return element.previousElementSibling;
      default:
        // Try as attribute first
        if (element.hasAttribute(property)) {
          return element.getAttribute(property);
        }

        // Try as regular property
        return (element as any)[property];
    }
  }

  private inferResultType(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof HTMLElement) return 'Element';
    return 'Object';
  }
}

// ============================================================================
// My Expression (my property)
// ============================================================================

export class MyExpression
  extends BaseExpressionImpl<ContextPropertyInput, unknown>
  implements BaseTypedExpression<unknown>
{
  public readonly name = 'my';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'my property';
  public readonly description = 'Access properties of the current context element (me)';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ContextPropertyInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      if (!context.me) {
        const result = this.success(undefined, 'undefined');
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      const possessiveExpr = new PossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.me,
        property: input.property,
      });

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'MyExpressionError',
        'runtime-error',
        `My property access failed: ${error instanceof Error ? error.message : String(error)}`,
        'MY_PROPERTY_ACCESS_FAILED'
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
              message: `Invalid my input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }
}

// ============================================================================
// Its Expression (its property)
// ============================================================================

export class ItsExpression
  extends BaseExpressionImpl<ContextPropertyInput, unknown>
  implements BaseTypedExpression<unknown>
{
  public readonly name = 'its';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'its property';
  public readonly description = 'Access properties of the it reference in context';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ContextPropertyInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      if (context.it == null) {
        const result = this.success(undefined, 'undefined');
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      const possessiveExpr = new PossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.it,
        property: input.property,
      });

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'ItsExpressionError',
        'runtime-error',
        `Its property access failed: ${error instanceof Error ? error.message : String(error)}`,
        'ITS_PROPERTY_ACCESS_FAILED'
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
              message: `Invalid its input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }
}

// ============================================================================
// Your Expression (your property)
// ============================================================================

export class YourExpression
  extends BaseExpressionImpl<ContextPropertyInput, unknown>
  implements BaseTypedExpression<unknown>
{
  public readonly name = 'your';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'your property';
  public readonly description = 'Access properties of the you reference in context';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ContextPropertyInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      if (!context.you) {
        const result = this.success(undefined, 'undefined');
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      const possessiveExpr = new PossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.you,
        property: input.property,
      });

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'YourExpressionError',
        'runtime-error',
        `Your property access failed: ${error instanceof Error ? error.message : String(error)}`,
        'YOUR_PROPERTY_ACCESS_FAILED'
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
              message: `Invalid your input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }
}

// ============================================================================
// Attribute Expression (@attribute)
// ============================================================================

export class AttributeExpression
  extends BaseExpressionImpl<AttributeAccessInput, string | null>
  implements BaseTypedExpression<string | null>
{
  public readonly name = 'attribute';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute or @attribute of element';
  public readonly description = 'Access HTML attributes of DOM elements';
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
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      if (!(input.element instanceof Element)) {
        const result = this.success(null, 'null');
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      const value = input.element.getAttribute(input.attribute);
      const result: EvaluationResult<string | null> = {
        success: true,
        value,
        type: value === null ? 'null' : 'string',
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<string | null>(
        'AttributeExpressionError',
        'runtime-error',
        `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`,
        'ATTRIBUTE_ACCESS_FAILED'
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
              message: `Invalid attribute input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide element and attribute parameters', 'Ensure attribute is a string'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }
}

// ============================================================================
// Enhanced Attribute With Value Expression (@attribute=value)
// ============================================================================

export class AttributeWithValueExpression
  extends BaseExpressionImpl<AttributeWithValueInput, boolean>
  implements BaseTypedExpression<boolean>
{
  public readonly name = 'attributeWithValue';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute=value';
  public readonly description = 'Check if element has attribute with specific value';
  public readonly inputSchema = AttributeWithValueInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: AttributeWithValueInput
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

      if (!(input.element instanceof Element)) {
        const result = this.success(false, 'boolean');
        this.trackPerformance(context, input, result, startTime);
        return result;
      }

      const actualValue = input.element.getAttribute(input.attribute);
      const value = actualValue === input.value;
      const result = this.success(value, 'boolean');

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<boolean>(
        'AttributeWithValueExpressionError',
        'runtime-error',
        `Attribute value check failed: ${error instanceof Error ? error.message : String(error)}`,
        'ATTRIBUTE_VALUE_CHECK_FAILED'
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
              message: `Invalid attribute with value input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide element, attribute, and value parameters',
            'Ensure attribute and value are strings',
          ],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure(
        'runtime-error',
        'Validation failed with exception',
        ['Check input structure and types']
      );
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createPossessiveExpression(): PossessiveExpression {
  return new PossessiveExpression();
}

export function createMyExpression(): MyExpression {
  return new MyExpression();
}

export function createItsExpression(): ItsExpression {
  return new ItsExpression();
}

export function createYourExpression(): YourExpression {
  return new YourExpression();
}

export function createAttributeExpression(): AttributeExpression {
  return new AttributeExpression();
}

export function createAttributeWithValueExpression(): AttributeWithValueExpression {
  return new AttributeWithValueExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const propertyExpressions = {
  possessive: createPossessiveExpression(),
  my: createMyExpression(),
  its: createItsExpression(),
  your: createYourExpression(),
  attribute: createAttributeExpression(),
  attributeWithValue: createAttributeWithValueExpression(),
} as const;

export type PropertyExpressionName = keyof typeof propertyExpressions;
