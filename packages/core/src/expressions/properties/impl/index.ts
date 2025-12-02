/**
 * Property Expressions for HyperScript
 * Provides deep TypeScript integration for property access, possessive syntax, and attributes
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

export class PossessiveExpression implements BaseTypedExpression<unknown> {
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

      const result = this.getProperty(input.element, input.property);

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)],
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid possessive input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide element and property parameters', 'Ensure property is a string'],
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

  private inferResultType(result: unknown): EvaluationType {
    if (result === undefined) return 'Undefined';
    if (result === null) return 'Null';
    if (typeof result === 'string') return 'String';
    if (typeof result === 'number') return 'Number';
    if (typeof result === 'boolean') return 'Boolean';
    if (Array.isArray(result)) return 'Array';
    if (result instanceof HTMLElement) return 'Element';
    return 'Object';
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
        input: 'possessive property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// My Expression (my property)
// ============================================================================

export class MyExpression implements BaseTypedExpression<unknown> {
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
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined',
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.me,
        property: input.property,
      });

      this.trackPerformance(
        context,
        startTime,
        result.success,
        result.success ? result.value : undefined
      );

      return result;
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `My property access failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid my input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
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
        input: 'my property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Its Expression (its property)
// ============================================================================

export class ItsExpression implements BaseTypedExpression<unknown> {
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
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined',
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.it,
        property: input.property,
      });

      this.trackPerformance(
        context,
        startTime,
        result.success,
        result.success ? result.value : undefined
      );

      return result;
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Its property access failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid its input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
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
        input: 'its property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Your Expression (your property)
// ============================================================================

export class YourExpression implements BaseTypedExpression<unknown> {
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
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined',
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.you,
        property: input.property,
      });

      this.trackPerformance(
        context,
        startTime,
        result.success,
        result.success ? result.value : undefined
      );

      return result;
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Your property access failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid your input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide property parameter', 'Ensure property is a string'],
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
        input: 'your property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Attribute Expression (@attribute)
// ============================================================================

export class AttributeExpression implements BaseTypedExpression<string | null> {
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
        this.trackPerformance(context, startTime, true, null);
        return {
          success: true,
          value: null,
          type: 'null',
        };
      }

      const result = input.element.getAttribute(input.attribute);

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: result === null ? 'null' : 'string',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid attribute input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide element and attribute parameters', 'Ensure attribute is a string'],
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
        input: 'attribute access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Attribute With Value Expression (@attribute=value)
// ============================================================================

export class AttributeWithValueExpression implements BaseTypedExpression<boolean> {
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
        this.trackPerformance(context, startTime, true, false);
        return {
          success: true,
          value: false,
          type: 'boolean',
        };
      }

      const actualValue = input.element.getAttribute(input.attribute);
      const result = actualValue === input.value;

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
          message: `Attribute value check failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid attribute with value input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide element, attribute, and value parameters',
            'Ensure attribute and value are strings',
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
        input: 'attribute value check',
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

export function createPossessiveExpression(): EnhancedPossessiveExpression {
  return new EnhancedPossessiveExpression();
}

export function createMyExpression(): EnhancedMyExpression {
  return new EnhancedMyExpression();
}

export function createItsExpression(): EnhancedItsExpression {
  return new EnhancedItsExpression();
}

export function createYourExpression(): EnhancedYourExpression {
  return new EnhancedYourExpression();
}

export function createAttributeExpression(): EnhancedAttributeExpression {
  return new EnhancedAttributeExpression();
}

export function createAttributeWithValueExpression(): EnhancedAttributeWithValueExpression {
  return new EnhancedAttributeWithValueExpression();
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
