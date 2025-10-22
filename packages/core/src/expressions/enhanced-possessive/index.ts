/**
 * Enhanced Possessive Expression - Property and Attribute Access
 * Implements comprehensive possessive expression functionality with TypeScript integration
 * Handles 'my property', 'element's attribute', style access, and attribute bracket notation
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionImplementation,
  LLMDocumentation,
  TypedExecutionContext
} from '../../types/enhanced-core.ts';
import type { ValidationResult, ValidationError } from '../../types/base-types';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for possessive expression input validation
 */
export const PossessiveExpressionInputSchema = v.tuple([
  v.unknown().describe('Object/element to access property from'),
  v.string().describe('Property/attribute name to access')
]);

export type PossessiveExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Possessive Expression Implementation
// ============================================================================

/**
 * Enhanced possessive expression for property and attribute access
 * Supports style properties (*property), attribute brackets ([@attr]), and possessive chaining
 */
export class EnhancedPossessiveExpression implements TypedExpressionImplementation<
  HyperScriptValue
> {
  public readonly name = 'possessive';
  public readonly category = 'object' as const;
  public readonly precedence = 10; // High precedence for property access
  public readonly associativity = 'left' as const;
  public readonly outputType = 'object' as const;
  
  public readonly analysisInfo = {
    isPure: false, // Property access can have side effects
    canThrow: false, // We handle errors gracefully
    complexity: 'O(1)' as const, // Direct property access
    dependencies: ['object-properties']
  };

  public readonly inputSchema = PossessiveExpressionInputSchema;
  
  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties, attributes, and styles from objects and DOM elements using possessive syntax',
    parameters: [
      {
        name: 'object',
        type: 'object',
        description: 'Object or element to access property from',
        optional: false,
        examples: ['element', 'my', 'its', '#selector', '.class']
      },
      {
        name: 'property',
        type: 'string',
        description: 'Property, attribute, or style name to access',
        optional: false,
        examples: ['value', '@data-foo', '*color', '[@data-attr]', '*computed-width']
      }
    ],
    returns: {
      type: 'object',
      description: 'Property value, attribute string, or style value',
      examples: ['string', 'number', 'boolean', 'array', 'CSSStyleDeclaration']
    },
    examples: [
      {
        title: 'Simple property access',
        code: "element's value",
        explanation: 'Returns the value property of element',
        output: 'Property value'
      },
      {
        title: 'Attribute access',
        code: "element's @data-foo",
        explanation: 'Returns data-foo attribute value',
        output: 'Attribute value'
      },
      {
        title: 'Style property access',
        code: "element's *color",
        explanation: 'Returns CSS color property value',
        output: 'rgb(255, 0, 0)'
      },
      {
        title: 'Bracket attribute notation',
        code: "element's [@data-name]",
        explanation: 'Returns attribute using bracket notation',
        output: 'Attribute value'
      }
    ],
    seeAlso: ['property access', 'DOM attributes', 'CSS styles', 'object properties'],
    tags: ['possessive', 'property', 'attribute', 'style', 'dom']
  };

  /**
   * Validate possessive expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      this.inputSchema.parse(args);
      
      const [_object, property] = args as PossessiveExpressionInput;
      const errors: ValidationError[] = [];
      
      // Validate property string format (this check runs after Zod parsing)
      // If we get here, the second argument should be validated by Zod as a string
      if (typeof property !== 'string' || property.length === 0) {
        errors.push({
          type: 'type-mismatch',
          message: 'Property name must be a non-empty string',
          suggestions: ['Provide a valid property name like "value", "@data-foo", or "*color"']
        });
      }
      
      // Check for potentially dangerous property access
      if (typeof property === 'string') {
        const dangerousProps = ['__proto__', 'constructor', 'prototype'];
        if (dangerousProps.includes(property)) {
          errors.push({
            type: 'security-warning',
            message: `Accessing "${property}" property may be unsafe`,
            suggestions: ['Avoid accessing prototype chain properties for security']
          });
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        suggestions: [
          'Use @ prefix for attributes: @data-foo',
          'Use * prefix for styles: *color',
          'Use bracket notation for complex attributes: [@data-name]'
        ]
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'missing-argument',
          message: error instanceof Error ? error.message : 'Invalid possessive expression arguments',
          suggestions: ['Provide object and property name']
        }],
        suggestions: [
          'Provide both object and property arguments',
          'Use string property names'
        ]
      };
    }
  }

  /**
   * Evaluate possessive expression
   */
  async evaluate(
    context: TypedExecutionContext,
    ...args: HyperScriptValue[]
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Validate input arguments
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'PossessiveExpressionValidationError',
            type: 'validation-error',
            message: `Possessive expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'POSSESSIVE_EXPRESSION_VALIDATION_ERROR',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      const [object, property] = this.inputSchema.parse(args);
      
      // Access property from object
      const value = await this.accessProperty(object, property, context);
      
      return {
        success: true,
        value,
        type: this.inferValueType(value)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PossessiveExpressionEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate possessive expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'POSSESSIVE_EXPRESSION_EVALUATION_ERROR',
          suggestions: ['Check object and property exist', 'Ensure property is accessible']
        },
        type: 'error'
      };
    }
  }

  /**
   * Access property from object with comprehensive syntax support
   */
  private async accessProperty(
    object: unknown,
    property: string,
    context: TypedExecutionContext
  ): Promise<HyperScriptValue> {
    // Handle null/undefined objects
    if (object === null || object === undefined) {
      return null;
    }

    // Handle array/multiple element access
    if (Array.isArray(object)) {
      const results = await Promise.all(
        object.map(item => this.accessProperty(item, property, context))
      );
      return results;
    }

    // Handle style property access (*property)
    if (property.startsWith('*')) {
      return this.accessStyleProperty(object, property.slice(1));
    }

    // Handle bracket attribute notation ([@attribute])
    if (property.startsWith('[@') && property.endsWith(']')) {
      const attrName = property.slice(2, -1);
      return this.accessAttribute(object, attrName);
    }

    // Handle attribute access (@attribute)
    if (property.startsWith('@')) {
      return this.accessAttribute(object, property.slice(1));
    }

    // Handle regular property access
    return this.accessObjectProperty(object, property);
  }

  /**
   * Access style property from element
   */
  private accessStyleProperty(object: unknown, styleProp: string): HyperScriptValue {
    if (!this.isElement(object)) {
      return null;
    }

    const element = object as Element;
    
    // Handle computed styles for certain properties
    if (styleProp.startsWith('computed-')) {
      const computedProp = styleProp.slice(9); // Remove 'computed-' prefix
      const styles = globalThis.getComputedStyle(element);
      return styles.getPropertyValue(computedProp) || null;
    }

    // Access style property directly
    const htmlElement = element as HTMLElement;
    if (htmlElement.style) {
      const styleValue = htmlElement.style.getPropertyValue(styleProp);
      return styleValue || null;
    }

    return null;
  }

  /**
   * Access attribute from element
   */
  private accessAttribute(object: unknown, attrName: string): HyperScriptValue {
    if (!this.isElement(object)) {
      return null;
    }

    const element = object as Element;
    return element.getAttribute(attrName);
  }

  /**
   * Access regular object property
   */
  private accessObjectProperty(object: unknown, property: string): HyperScriptValue {
    if (typeof object !== 'object' || object === null) {
      return null;
    }

    // Handle DOM elements
    if (this.isElement(object)) {
      const element = object as Element & Record<string, unknown>;
      
      // Special handling for common DOM properties
      if (property in element) {
        const value = element[property];
        
        // Handle methods by binding them to the element
        if (typeof value === 'function') {
          return value.bind(element);
        }
        
        return value as HyperScriptValue;
      }
    }

    // Handle regular objects
    const obj = object as Record<string, unknown>;
    return (obj[property] ?? null) as HyperScriptValue;
  }

  /**
   * Check if value is a DOM element
   */
  private isElement(value: unknown): boolean {
    return value instanceof Element;
  }

  /**
   * Infer TypeScript type from value
   */
  private inferValueType(value: unknown): HyperScriptValueType {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Element) return 'element';
    if (typeof value === 'function') return 'function';
    return 'object';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'PossessiveExpression',
      category: 'property-access' as const,
      version: '1.0.0',
      description: 'Enhanced property and attribute access with comprehensive syntax support',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'object property access',
        'DOM attribute access (@attr)',
        'CSS style property access (*style)',
        'bracket attribute notation ([@attr])',
        'array/multiple element handling',
        'computed style access (*computed-prop)',
        'method binding for DOM elements',
        'null-safe property access'
      ],
      performance: {
        complexity: 'low to medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'minimal to moderate'
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: true // Property access is generally cacheable
      }
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced possessive expression
 */
export function createPossessiveExpression(): EnhancedPossessiveExpression {
  return new EnhancedPossessiveExpression();
}

/**
 * Type guard for possessive expression input
 */
export function isValidPossessiveExpressionInput(args: unknown[]): args is PossessiveExpressionInput {
  try {
    PossessiveExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export function evaluatePossessive(
  object: HyperScriptValue,
  property: string,
  context: TypedExecutionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new EnhancedPossessiveExpression();
  return expression.evaluate(context, object, property);
}

// Default exports
export { EnhancedPossessiveExpression as default };