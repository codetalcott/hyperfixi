/**
 * Enhanced Property Expressions for HyperScript
 * Provides deep TypeScript integration for property access, possessive syntax, and attributes
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  LLMDocumentation,
  EvaluationResult
} from '../../../types/base-types';
import { evaluationToHyperScriptType } from '../../../types/base-types';
import type { ExpressionCategory } from '../../../types/expression-types';

// ============================================================================
// Input Schemas
// ============================================================================

const PropertyAccessInputSchema = v.object({
  element: v.unknown().describe('Element or object to access property from'),
  property: v.string().describe('Property name to access')
}).strict();

const AttributeAccessInputSchema = v.object({
  element: v.unknown().describe('Element to access attribute from'),
  attribute: v.string().describe('Attribute name to access')
}).strict();

const ContextPropertyInputSchema = v.object({
  property: v.string().describe('Property name to access from context')
}).strict();

const AttributeWithValueInputSchema = v.object({
  element: v.unknown().describe('Element to check attribute value'),
  attribute: v.string().describe('Attribute name to check'),
  value: v.string().describe('Expected attribute value')
}).strict();

type PropertyAccessInput = any; // Inferred from RuntimeValidator
type AttributeAccessInput = any; // Inferred from RuntimeValidator
type ContextPropertyInput = any; // Inferred from RuntimeValidator
type AttributeWithValueInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Possessive Expression (element's property)
// ============================================================================

export class EnhancedPossessiveExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'possessive';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = "element's property";
  public readonly description = 'Access object or element properties using possessive syntax';
  public readonly inputSchema = PropertyAccessInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: "user's name",
        description: 'Get name property from user object',
        expectedOutput: 'John'
      },
      {
        input: "element's className",
        description: 'Get className from DOM element',
        expectedOutput: 'active button'
      },
      {
        input: "form's elements",
        description: 'Get form elements collection',
        expectedOutput: 'HTMLFormControlsCollection'
      }
    ],
    relatedExpressions: ['my', 'its', 'your', 'of'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties of objects or DOM elements using possessive syntax',
    parameters: [
      {
        name: 'element',
        type: 'object | Element',
        description: 'The object or element to access property from',
        optional: false,
        examples: ['user', 'document.body', 'myForm', 'element']
      },
      {
        name: 'property',
        type: 'string',
        description: 'The property name to access',
        optional: false,
        examples: ['name', 'className', 'value', 'id', 'children']
      }
    ],
    returns: {
      type: 'any',
      description: 'The value of the requested property, or undefined if not found',
      examples: ['\"John\"', 'HTMLElement', '42', 'true', 'undefined']
    },
    examples: [
      {
        title: 'Object property access',
        code: "user's name",
        explanation: 'Get the name property from user object',
        output: '\"John Doe\"'
      },
      {
        title: 'DOM element property',
        code: "button's disabled",
        explanation: 'Check if button is disabled',
        output: 'false'
      },
      {
        title: 'Element attribute access',
        code: "input's value",
        explanation: 'Get current value of input element',
        output: '\"hello world\"'
      },
      {
        title: 'CSS class access',
        code: "div's className",
        explanation: 'Get CSS classes of element',
        output: '\"container active\"'
      }
    ],
    seeAlso: ['my', 'its', 'your', 'of', '@'],
    tags: ['property', 'possessive', 'object', 'element', 'access']
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
          error: validation.errors[0]
        };
      }

      const result = this.getProperty(input.element, input.property);
      
      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)]
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Property access failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid possessive input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide element and property parameters',
            'Ensure property is a string'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
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

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'possessive property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced My Expression (my property)
// ============================================================================

export class EnhancedMyExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'my';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'my property';
  public readonly description = 'Access properties of the current context element (me)';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: ['context-me'],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'my id',
        description: 'Get ID of current element',
        expectedOutput: 'button-123'
      },
      {
        input: 'my className',
        description: 'Get CSS classes of current element',
        expectedOutput: 'btn btn-primary'
      }
    ],
    relatedExpressions: ['possessive', 'its', 'your'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties of the current element (me) in the execution context',
    parameters: [
      {
        name: 'property',
        type: 'string',
        description: 'The property name to access from the current element',
        optional: false,
        examples: ['id', 'className', 'value', 'checked', 'disabled']
      }
    ],
    returns: {
      type: 'any',
      description: 'The value of the requested property from the current element',
      examples: ['\"button-123\"', 'true', '\"hello\"', 'HTMLElement']
    },
    examples: [
      {
        title: 'Element ID',
        code: 'my id',
        explanation: 'Get the ID attribute of the current element',
        output: '\"submit-button\"'
      },
      {
        title: 'Input value',
        code: 'my value',
        explanation: 'Get the current value of an input element',
        output: '\"user input text\"'
      },
      {
        title: 'CSS classes',
        code: 'my className',
        explanation: 'Get all CSS classes of the current element',
        output: '\"btn btn-primary active\"'
      }
    ],
    seeAlso: ['possessive', 'its', 'your', 'me'],
    tags: ['property', 'context', 'current', 'element', 'me']
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
          error: validation.errors[0]
        };
      }

      if (!context.me) {
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined'
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.me,
        property: input.property
      });

      this.trackPerformance(context, startTime, result.success, 
        result.success ? result.value : undefined);

      return result;

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `My property access failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid my input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide property parameter',
            'Ensure property is a string'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'my property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Its Expression (its property)
// ============================================================================

export class EnhancedItsExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'its';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'its property';
  public readonly description = 'Access properties of the it reference in context';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: ['context-it'],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'its length',
        description: 'Get length property of it reference',
        expectedOutput: 5
      }
    ],
    relatedExpressions: ['possessive', 'my', 'your'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties of the "it" reference in the execution context',
    parameters: [
      {
        name: 'property',
        type: 'string',
        description: 'The property name to access from the it reference',
        optional: false,
        examples: ['length', 'name', 'value', 'id']
      }
    ],
    returns: {
      type: 'any',
      description: 'The value of the requested property from the it reference',
      examples: ['5', '\"array item\"', 'true']
    },
    examples: [
      {
        title: 'Array length',
        code: 'its length',
        explanation: 'Get length of array referenced by it',
        output: '3'
      },
      {
        title: 'Object property',
        code: 'its name',
        explanation: 'Get name property of object referenced by it',
        output: '\"John\"'
      }
    ],
    seeAlso: ['possessive', 'my', 'your', 'it'],
    tags: ['property', 'context', 'reference', 'it']
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
          error: validation.errors[0]
        };
      }

      if (context.it == null) {
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined'
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.it,
        property: input.property
      });

      this.trackPerformance(context, startTime, result.success, 
        result.success ? result.value : undefined);

      return result;

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Its property access failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid its input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide property parameter',
            'Ensure property is a string'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'its property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Your Expression (your property)
// ============================================================================

export class EnhancedYourExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'your';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = 'your property';
  public readonly description = 'Access properties of the you reference in context';
  public readonly inputSchema = ContextPropertyInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: ['context-you'],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'your value',
        description: 'Get value from you reference',
        expectedOutput: 'target value'
      }
    ],
    relatedExpressions: ['possessive', 'my', 'its'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses properties of the "you" reference in the execution context',
    parameters: [
      {
        name: 'property',
        type: 'string',
        description: 'The property name to access from the you reference',
        optional: false,
        examples: ['value', 'id', 'className', 'checked']
      }
    ],
    returns: {
      type: 'any',
      description: 'The value of the requested property from the you reference',
      examples: ['\"target element\"', 'true', '42']
    },
    examples: [
      {
        title: 'Target element value',
        code: 'your value',
        explanation: 'Get value of element referenced by you',
        output: '\"form input\"'
      },
      {
        title: 'Target element ID',
        code: 'your id',
        explanation: 'Get ID of element referenced by you',
        output: '\"target-element\"'
      }
    ],
    seeAlso: ['possessive', 'my', 'its', 'you'],
    tags: ['property', 'context', 'reference', 'you', 'target']
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
          error: validation.errors[0]
        };
      }

      if (!context.you) {
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined'
        };
      }

      const possessiveExpr = new EnhancedPossessiveExpression();
      const result = await possessiveExpr.evaluate(context, {
        element: context.you,
        property: input.property
      });

      this.trackPerformance(context, startTime, result.success, 
        result.success ? result.value : undefined);

      return result;

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Your property access failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid your input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide property parameter',
            'Ensure property is a string'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'your property access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Attribute Expression (@attribute)
// ============================================================================

export class EnhancedAttributeExpression implements BaseTypedExpression<string | null> {
  public readonly name = 'attribute';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute or @attribute of element';
  public readonly description = 'Access HTML attributes of DOM elements';
  public readonly inputSchema = AttributeAccessInputSchema;
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['String', 'Null'],
    examples: [
      {
        input: '@data-id',
        description: 'Get data-id attribute',
        expectedOutput: 'user-123'
      },
      {
        input: '@class',
        description: 'Get class attribute',
        expectedOutput: 'btn btn-primary'
      }
    ],
    relatedExpressions: ['possessive', 'attributeWithValue'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Retrieves HTML attribute values from DOM elements',
    parameters: [
      {
        name: 'element',
        type: 'Element',
        description: 'The DOM element to access attribute from',
        optional: false,
        examples: ['document.getElementById("btn")', 'targetElement', 'me']
      },
      {
        name: 'attribute',
        type: 'string',
        description: 'The attribute name to access',
        optional: false,
        examples: ['id', 'class', 'data-value', 'aria-label', 'href']
      }
    ],
    returns: {
      type: 'string | null',
      description: 'The attribute value, or null if attribute does not exist',
      examples: ['\"button-123\"', '\"btn primary\"', 'null']
    },
    examples: [
      {
        title: 'Data attribute',
        code: '@data-id',
        explanation: 'Get data-id attribute value',
        output: '\"user-123\"'
      },
      {
        title: 'ARIA attribute',
        code: '@aria-label',
        explanation: 'Get accessibility label',
        output: '\"Close dialog\"'
      },
      {
        title: 'Standard attribute',
        code: '@href',
        explanation: 'Get link URL',
        output: '\"https://example.com\"'
      }
    ],
    seeAlso: ['possessive', '@=', 'className', 'id'],
    tags: ['attribute', 'DOM', 'element', 'HTML', 'data']
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
          error: validation.errors[0]
        };
      }

      if (!(input.element instanceof Element)) {
        this.trackPerformance(context, startTime, true, null);
        return {
          success: true,
          value: null,
          type: 'null'
        };
      }

      const result = input.element.getAttribute(input.attribute);
      
      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: result === null ? 'null' : 'string'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Attribute access failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid attribute input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide element and attribute parameters',
            'Ensure attribute is a string'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'attribute access',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Attribute With Value Expression (@attribute=value)
// ============================================================================

export class EnhancedAttributeWithValueExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'attributeWithValue';
  public readonly category: ExpressionCategory = 'Property';
  public readonly syntax = '@attribute=value';
  public readonly description = 'Check if element has attribute with specific value';
  public readonly inputSchema = AttributeWithValueInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Property',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '@data-state="active"',
        description: 'Check if data-state equals active',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['attribute', 'possessive'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Checks if a DOM element has an attribute with a specific value',
    parameters: [
      {
        name: 'element',
        type: 'Element',
        description: 'The DOM element to check',
        optional: false,
        examples: ['button', 'input', 'me']
      },
      {
        name: 'attribute',
        type: 'string',
        description: 'The attribute name to check',
        optional: false,
        examples: ['data-state', 'class', 'type']
      },
      {
        name: 'value',
        type: 'string',
        description: 'The expected attribute value',
        optional: false,
        examples: ['active', 'btn-primary', 'submit']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if attribute equals the expected value, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'State checking',
        code: '@data-state="loading"',
        explanation: 'Check if element is in loading state',
        output: 'true'
      },
      {
        title: 'Type validation',
        code: '@type="submit"',
        explanation: 'Check if input is submit type',
        output: 'false'
      }
    ],
    seeAlso: ['@', 'possessive', 'matches'],
    tags: ['attribute', 'validation', 'comparison', 'DOM']
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
          error: validation.errors[0]
        };
      }

      if (!(input.element instanceof Element)) {
        this.trackPerformance(context, startTime, true, false);
        return {
          success: true,
          value: false,
          type: 'boolean'
        };
      }

      const actualValue = input.element.getAttribute(input.attribute);
      const result = actualValue === input.value;
      
      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Attribute value check failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid attribute with value input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide element, attribute, and value parameters',
            'Ensure attribute and value are strings'
          ]
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
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types'],
        errors: []
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'attribute value check',
        output: success ? output : 'error',
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

export function createEnhancedPossessiveExpression(): EnhancedPossessiveExpression {
  return new EnhancedPossessiveExpression();
}

export function createEnhancedMyExpression(): EnhancedMyExpression {
  return new EnhancedMyExpression();
}

export function createEnhancedItsExpression(): EnhancedItsExpression {
  return new EnhancedItsExpression();
}

export function createEnhancedYourExpression(): EnhancedYourExpression {
  return new EnhancedYourExpression();
}

export function createEnhancedAttributeExpression(): EnhancedAttributeExpression {
  return new EnhancedAttributeExpression();
}

export function createEnhancedAttributeWithValueExpression(): EnhancedAttributeWithValueExpression {
  return new EnhancedAttributeWithValueExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const propertyExpressions = {
  possessive: createEnhancedPossessiveExpression(),
  my: createEnhancedMyExpression(),
  its: createEnhancedItsExpression(),
  your: createEnhancedYourExpression(),
  attribute: createEnhancedAttributeExpression(),
  attributeWithValue: createEnhancedAttributeWithValueExpression()
} as const;

export type PropertyExpressionName = keyof typeof propertyExpressions;