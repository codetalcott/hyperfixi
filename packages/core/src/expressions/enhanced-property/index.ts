/**
 * Enhanced Property Access Expressions - Deep TypeScript Integration
 * Implements property access operations (my, its, possessive syntax) with comprehensive validation
 * Enhanced for LLM code agents with full type safety and context awareness
 */

import { z } from 'zod';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  ExpressionCategory,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  TypedResult,
  LLMDocumentation,
  HyperScriptValueType
} from '../../types/base-types.js';

// ============================================================================
// Input Schemas
// ============================================================================

const PropertyAccessInputSchema = z.object({
  property: z.string().describe('Property name to access')
}).strict();

const PossessiveAccessInputSchema = z.object({
  target: z.unknown().describe('Target object to access property from'),
  property: z.string().describe('Property name to access')
}).strict();

const AttributeAccessInputSchema = z.object({
  element: z.unknown().describe('DOM element to access attribute from'),
  attribute: z.string().describe('Attribute name to access')
}).strict();

type PropertyAccessInput = z.infer<typeof PropertyAccessInputSchema>;
type PossessiveAccessInput = z.infer<typeof PossessiveAccessInputSchema>;
type AttributeAccessInput = z.infer<typeof AttributeAccessInputSchema>;

// ============================================================================
// Enhanced My Expression (Context Property Access)
// ============================================================================

export class EnhancedMyExpression implements TypedExpressionImplementation<PropertyAccessInput, HyperScriptValue> {
  public readonly name = 'my';
  public readonly category: ExpressionCategory = 'Properties';
  public readonly syntax = 'my property';
  public readonly description = 'Accesses properties of the current context element (me) with validation';
  public readonly inputSchema = PropertyAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Properties',
    complexity: 'simple',
    sideEffects: [],
    dependencies: ['me'],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'my id',
        description: 'Get the id attribute of the current element',
        expectedOutput: 'button-1'
      },
      {
        input: 'my className',
        description: 'Get the CSS classes of the current element',
        expectedOutput: 'btn btn-primary'
      },
      {
        input: 'my dataset.value',
        description: 'Access data attributes through dataset',
        expectedOutput: '42'
      }
    ],
    relatedExpressions: ['its', 'possessive', 'attribute'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties and attributes of the current context element (me) with comprehensive validation',
    parameters: [
      {
        name: 'property',
        type: 'string',
        description: 'Property name to access from the current element',
        optional: false,
        examples: ['id', 'className', 'textContent', 'dataset.value', 'style.color']
      }
    ],
    returns: {
      type: 'any',
      description: 'Value of the specified property, or undefined if not found',
      examples: ['"button-1"', '"btn btn-primary"', '"Hello World"', '42', 'undefined']
    },
    examples: [
      {
        title: 'Element ID access',
        code: 'my id',
        explanation: 'Get the id attribute of the current element',
        output: '"submit-button"'
      },
      {
        title: 'CSS class access',
        code: 'my className',
        explanation: 'Get the CSS class string of the current element',
        output: '"btn btn-primary active"'
      },
      {
        title: 'Text content access',
        code: 'my textContent',
        explanation: 'Get the text content of the current element',
        output: '"Click me!"'
      },
      {
        title: 'Data attribute access',
        code: 'my dataset.userId',
        explanation: 'Access data-user-id attribute through dataset',
        output: '"12345"'
      },
      {
        title: 'Style property access',
        code: 'my style.display',
        explanation: 'Get computed style property value',
        output: '"block"'
      }
    ],
    seeAlso: ['its', 'possessive syntax', 'attribute access', 'element properties'],
    tags: ['property', 'context', 'element', 'attribute', 'my']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PropertyAccessInput
  ): Promise<EvaluationResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Check if 'me' context exists
      if (!context.me) {
        return {
          success: false,
          errors: [{
            type: 'context-error',
            message: 'No current element (me) available in context for property access'
          }],
          suggestions: [
            'Ensure this expression is used within an element context',
            'Check that the element reference is properly set',
            'Verify the expression is called from an event or command context'
          ]
        };
      }

      // Access the property
      const value = this.getPropertyValue(context.me, input.property);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: this.inferType(value)
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Check that the property name is valid',
          'Ensure the current element supports the requested property',
          'Verify the property path syntax is correct'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid property access input: ${err.message}`
          })),
          suggestions: [
            'Provide a valid property name as a string',
            'Ensure the property name is not empty'
          ]
        };
      }

      const { property } = parsed.data;

      // Validate property name
      if (property.trim() === '') {
        return {
          isValid: false,
          errors: [{
            type: 'validation-error',
            message: 'Property name cannot be empty'
          }],
          suggestions: ['Provide a non-empty property name']
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
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
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
    if (value === null) return 'Null';
    if (value === undefined) return 'Any';
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'string') return 'String';
    if (Array.isArray(value)) return 'Array';
    if (typeof value === 'object') return 'Object';
    return 'Any';
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'property access',
        output: success ? 'value' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Its Expression (Generic Property Access)
// ============================================================================

export class EnhancedItsExpression implements TypedExpressionImplementation<PossessiveAccessInput, HyperScriptValue> {
  public readonly name = 'its';
  public readonly category: ExpressionCategory = 'Properties';
  public readonly syntax = 'target its property';
  public readonly description = 'Generic possessive property access with comprehensive validation';
  public readonly inputSchema = PossessiveAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Properties',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'element its id',
        description: 'Get the id property of an element',
        expectedOutput: 'form-1'
      },
      {
        input: 'user its name',
        description: 'Access object property',
        expectedOutput: 'John Doe',
        context: { locals: new Map([['user', { name: 'John Doe' }]]) }
      }
    ],
    relatedExpressions: ['my', 'possessive', 'property'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Generic possessive property access for any object or element with validation',
    parameters: [
      {
        name: 'target',
        type: 'any',
        description: 'Target object or element to access property from',
        optional: false,
        examples: ['element', 'user', 'window', 'document']
      },
      {
        name: 'property',
        type: 'string',
        description: 'Property name to access from the target',
        optional: false,
        examples: ['id', 'name', 'length', 'dataset.value']
      }
    ],
    returns: {
      type: 'any',
      description: 'Value of the specified property, or undefined if not found',
      examples: ['"form-1"', '"John Doe"', '42', 'undefined']
    },
    examples: [
      {
        title: 'Element property access',
        code: 'button its textContent',
        explanation: 'Get the text content of a button element',
        output: '"Submit"'
      },
      {
        title: 'Object property access',
        code: 'user its email',
        explanation: 'Access a property of a JavaScript object',
        output: '"john@example.com"'
      },
      {
        title: 'Array length access',
        code: 'items its length',
        explanation: 'Get the length property of an array',
        output: '5'
      },
      {
        title: 'Nested property access',
        code: 'config its api.baseUrl',
        explanation: 'Access nested object properties',
        output: '"https://api.example.com"'
      }
    ],
    seeAlso: ['my', 'possessive syntax', 'object properties'],
    tags: ['property', 'possessive', 'object', 'access', 'its']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: PossessiveAccessInput
  ): Promise<EvaluationResult<HyperScriptValue>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Access the property
      const value = this.getPropertyValue(input.target, input.property);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: this.inferType(value)
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Check that the target object is not null or undefined',
          'Ensure the property name is valid',
          'Verify the property path syntax is correct'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid possessive access input: ${err.message}`
          })),
          suggestions: [
            'Provide both target and property parameters',
            'Ensure property name is a string'
          ]
        };
      }

      const { property } = parsed.data;

      // Validate property name
      if (property.trim() === '') {
        return {
          isValid: false,
          errors: [{
            type: 'validation-error',
            message: 'Property name cannot be empty'
          }],
          suggestions: ['Provide a non-empty property name']
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
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private getPropertyValue(target: any, propertyPath: string): HyperScriptValue {
    // Reuse the same logic as MyExpression
    const myExpr = new EnhancedMyExpression();
    return myExpr['getPropertyValue'](target, propertyPath);
  }

  private inferType(value: unknown): EvaluationType {
    // Reuse the same logic as MyExpression
    const myExpr = new EnhancedMyExpression();
    return myExpr['inferType'](value);
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'possessive access',
        output: success ? 'value' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Attribute Expression (@attribute syntax)
// ============================================================================

export class EnhancedAttributeExpression implements TypedExpressionImplementation<AttributeAccessInput, string | null> {
  public readonly name = 'attribute';
  public readonly category: ExpressionCategory = 'Properties';
  public readonly syntax = '@attribute or element@attribute';
  public readonly description = 'Accesses HTML attributes with comprehensive DOM validation';
  public readonly inputSchema = AttributeAccessInputSchema;
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Properties',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['String', 'Null'],
    examples: [
      {
        input: '@data-value',
        description: 'Get data attribute from current element',
        expectedOutput: '42'
      },
      {
        input: 'button@disabled',
        description: 'Check if button has disabled attribute',
        expectedOutput: null
      }
    ],
    relatedExpressions: ['my', 'its', 'property'],
    performance: {
      averageTime: 0.05,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses HTML attributes from DOM elements with proper null handling',
    parameters: [
      {
        name: 'element',
        type: 'Element',
        description: 'DOM element to access attribute from (or current element if not specified)',
        optional: false,
        examples: ['button', 'input', 'div', 'me']
      },
      {
        name: 'attribute',
        type: 'string',
        description: 'HTML attribute name to access',
        optional: false,
        examples: ['id', 'class', 'data-value', 'disabled', 'href']
      }
    ],
    returns: {
      type: 'string | null',
      description: 'Attribute value as string, or null if attribute does not exist',
      examples: ['"submit-button"', '"btn btn-primary"', '"42"', 'null']
    },
    examples: [
      {
        title: 'Data attribute access',
        code: '@data-user-id',
        explanation: 'Get data-user-id attribute from current element',
        output: '"12345"'
      },
      {
        title: 'Class attribute access',
        code: 'button@class',
        explanation: 'Get class attribute from a button element',
        output: '"btn btn-primary"'
      },
      {
        title: 'Boolean attribute check',
        code: 'input@disabled',
        explanation: 'Check if input has disabled attribute',
        output: '""'
      },
      {
        title: 'Missing attribute',
        code: '@nonexistent',
        explanation: 'Access non-existent attribute returns null',
        output: 'null'
      }
    ],
    seeAlso: ['my', 'DOM attributes', 'element properties'],
    tags: ['attribute', 'DOM', 'element', 'HTML', '@']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: AttributeAccessInput
  ): Promise<EvaluationResult<string | null>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Ensure element is a DOM element
      if (!this.isDOMElement(input.element)) {
        return {
          success: false,
          errors: [{
            type: 'type-mismatch',
            message: 'Target must be a DOM element for attribute access'
          }],
          suggestions: [
            'Ensure the target is a valid DOM element',
            'Check that the element reference is correct',
            'Verify the element exists in the DOM'
          ]
        };
      }

      // Access the attribute
      const value = input.element.getAttribute(input.attribute);

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value,
        type: value === null ? 'Null' : 'String'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Check that the element supports getAttribute',
          'Ensure the attribute name is valid',
          'Verify the element is properly connected to the DOM'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid attribute access input: ${err.message}`
          })),
          suggestions: [
            'Provide both element and attribute parameters',
            'Ensure attribute name is a string'
          ]
        };
      }

      const { attribute } = parsed.data;

      // Validate attribute name
      if (attribute.trim() === '') {
        return {
          isValid: false,
          errors: [{
            type: 'validation-error',
            message: 'Attribute name cannot be empty'
          }],
          suggestions: ['Provide a non-empty attribute name']
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
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  /**
   * Check if a value is a DOM element
   */
  private isDOMElement(value: unknown): value is Element {
    return value != null && 
           typeof value === 'object' && 
           'getAttribute' in value && 
           'setAttribute' in value &&
           'nodeType' in value &&
           (value as any).nodeType === 1; // Element node
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'attribute access',
        output: success ? 'string|null' : 'error',
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

export function createEnhancedMyExpression(): EnhancedMyExpression {
  return new EnhancedMyExpression();
}

export function createEnhancedItsExpression(): EnhancedItsExpression {
  return new EnhancedItsExpression();
}

export function createEnhancedAttributeExpression(): EnhancedAttributeExpression {
  return new EnhancedAttributeExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedPropertyExpressions = {
  my: createEnhancedMyExpression(),
  its: createEnhancedItsExpression(),
  attribute: createEnhancedAttributeExpression()
} as const;