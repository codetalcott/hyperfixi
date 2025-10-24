/**
 * Enhanced Reference Expressions - Deep TypeScript Integration
 * Handles me, you, it, CSS selectors, and DOM element references
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExpressionContext,
  ExpressionMetadata
} from '../../types/enhanced-expressions';
import type { EvaluationResult, ValidationResult, LLMDocumentation, HyperScriptValueType } from '../../types/enhanced-core';

// ============================================================================
// Enhanced Me Expression
// ============================================================================

/**
 * Enhanced "me" expression - current element reference with type safety
 */
export class EnhancedMeExpression implements TypedExpressionImplementation<
  undefined,
  HTMLElement | null,
  TypedExpressionContext
> {
  public readonly name = 'me' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'me';
  public readonly description = 'References the current element in the execution context';
  public readonly inputSchema = v.undefined();
  public readonly outputType = 'Element' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Element', 'Null'],
    examples: [
      {
        input: 'me',
        description: 'Get the current element',
        expectedOutput: null, // Will be an HTMLElement in practice
        context: { me: null } // Simplified for example
      },
      {
        input: 'me.className',
        description: 'Access current element properties',
        expectedOutput: 'button active',
        context: { me: null }
      }
    ],
    relatedExpressions: ['you', 'it', 'my', 'myself'],
    performance: {
      averageTime: 0.001,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'References the current HTML element in the execution context',
    parameters: [],
    returns: {
      type: 'Element',
      description: 'The current HTMLElement, or null if no element is set',
      examples: ['<div>', '<button>', 'null']
    },
    examples: [
      {
        title: 'Basic element reference',
        code: 'me',
        explanation: 'Returns the current element that the hyperscript is attached to',
        output: '<div _="...">Current Element</div>'
      },
      {
        title: 'Property access',
        code: 'me.textContent',
        explanation: 'Access properties of the current element',
        output: 'Current Element'
      },
      {
        title: 'Method calls',
        code: 'me.classList.add("active")',
        explanation: 'Call methods on the current element',
        output: undefined
      },
      {
        title: 'In event handlers',
        code: 'on click add .clicked to me',
        explanation: 'Use "me" to reference the element receiving the event',
        output: undefined
      }
    ],
    seeAlso: ['you', 'it', 'my', 'target'],
    tags: ['context', 'element', 'reference', 'dom']
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
        success: true
      });

      return {
        success: true,
        value: (element instanceof HTMLElement ? element : null),
        type: 'element'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'MeExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "me"',
          code: 'ME_EVALUATION_FAILED',
          suggestions: ['Ensure element context is properly set', 'Check if "me" is available in current scope']
        },
        type: 'error'
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // "me" takes no input, so any input is invalid
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [{
          type: 'type-mismatch',
          message: '"me" expression takes no arguments',
          suggestions: ['Use "me" without any parameters']
        }],
        suggestions: ['Use: me', 'Not: me(something)']
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: []
    };
  }
}

// ============================================================================
// Enhanced You Expression
// ============================================================================

/**
 * Enhanced "you" expression - target element reference with validation
 */
export class EnhancedYouExpression implements TypedExpressionImplementation<
  undefined,
  HTMLElement | null,
  TypedExpressionContext
> {
  public readonly name = 'you' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'you';
  public readonly description = 'References the target element (usually event target or command target)';
  public readonly inputSchema = v.undefined();
  public readonly outputType = 'Element' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Element', 'Null'],
    examples: [
      {
        input: 'you',
        description: 'Get the target element',
        expectedOutput: null,
        context: { you: null }
      },
      {
        input: 'you.value',
        description: 'Access target element properties',
        expectedOutput: 'input value',
        context: { you: null }
      }
    ],
    relatedExpressions: ['me', 'it', 'target', 'your'],
    performance: {
      averageTime: 0.001,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'References the target element in the current context, often the event target or command target',
    parameters: [],
    returns: {
      type: 'Element',
      description: 'The target HTMLElement, or null if no target is set',
      examples: ['<input>', '<button>', 'null']
    },
    examples: [
      {
        title: 'Event target reference',
        code: 'on click from <button/> log you.textContent',
        explanation: 'In this context, "you" refers to the clicked button',
        output: 'Button Text'
      },
      {
        title: 'Command target',
        code: 'send myEvent to <input/> then log you.value',
        explanation: 'Here "you" refers to the input element that received the event',
        output: 'input value'
      },
      {
        title: 'Form validation',
        code: 'if you.value is empty then add .error to you',
        explanation: 'Validate and style the target element',
        output: undefined
      }
    ],
    seeAlso: ['me', 'it', 'target', 'your'],
    tags: ['context', 'element', 'reference', 'target', 'event']
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
        success: true
      });

      return {
        success: true,
        value: (element instanceof HTMLElement ? element : null),
        type: 'element'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'YouExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "you"',
          code: 'YOU_EVALUATION_FAILED',
          suggestions: ['Ensure target element is available in context', 'Check if "you" is set by event or command']
        },
        type: 'error'
      };
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [{
          type: 'type-mismatch',
          message: '"you" expression takes no arguments',
          suggestions: ['Use "you" without any parameters']
        }],
        suggestions: ['Use: you', 'Not: you(something)']
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: []
    };
  }
}

// ============================================================================
// Enhanced It Expression
// ============================================================================

/**
 * Enhanced "it" expression - context variable reference with type awareness
 */
export class EnhancedItExpression implements TypedExpressionImplementation<
  undefined,
  unknown,
  TypedExpressionContext
> {
  public readonly name = 'it' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = 'it';
  public readonly description = 'References the current context variable (result of previous operation or loop item)';
  public readonly inputSchema = v.undefined();
  public readonly outputType = 'Any' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'it',
        description: 'Get the current context variable',
        expectedOutput: 'some value',
        context: { it: 'some value' }
      },
      {
        input: 'it.length',
        description: 'Access properties of context variable',
        expectedOutput: 5,
        context: { it: 'hello' }
      }
    ],
    relatedExpressions: ['me', 'you', 'result', 'its'],
    performance: {
      averageTime: 0.001,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'References the current context variable, typically the result of the previous operation or current loop iteration',
    parameters: [],
    returns: {
      type: 'Any',
      description: 'The current context value, which can be any type',
      examples: ['string', '42', 'true', '["array", "values"]', '{"object": "data"}']
    },
    examples: [
      {
        title: 'Command result reference',
        code: 'get /api/data then put it into #output',
        explanation: '"it" contains the result of the fetch operation',
        output: '{"data": "from api"}'
      },
      {
        title: 'Loop iteration',
        code: 'for item in items put it into .container',
        explanation: '"it" refers to each item during loop iteration',
        output: 'current item'
      },
      {
        title: 'Chained operations',
        code: 'get my.value then increment it then set my.value to it',
        explanation: '"it" carries the value through the operation chain',
        output: undefined
      },
      {
        title: 'Conditional logic',
        code: 'if it > 10 then add .large else add .small',
        explanation: 'Use "it" in conditional expressions',
        output: undefined
      }
    ],
    seeAlso: ['me', 'you', 'result', 'its'],
    tags: ['context', 'variable', 'reference', 'result', 'iteration']
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
        success: true
      });

      return {
        success: true,
        value,
        type: this.inferType(value)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ItExpressionError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Failed to evaluate "it"',
          code: 'IT_EVALUATION_FAILED',
          suggestions: ['Ensure "it" is set by previous operation', 'Check if context variable is available']
        },
        type: 'error'
      };
    }
  }

  validate(input: unknown): ValidationResult {
    if (input !== undefined) {
      return {
        isValid: false,
        errors: [{
          type: 'type-mismatch',
          message: '"it" expression takes no arguments',
          suggestions: ['Use "it" without any parameters']
        }],
        suggestions: ['Use: it', 'Not: it(something)']
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: []
    };
  }

  private inferType(value: unknown): HyperScriptValueType {
    if (value === null) return 'null';
    if (value instanceof HTMLElement) return 'element';
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
  single: v.boolean().optional().default(false) // true for querySelector, false for querySelectorAll
});

type CSSSelectorInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced CSS selector expression with validation and error handling
 */
export class EnhancedCSSSelectorExpression implements TypedExpressionImplementation<
  CSSSelectorInput,
  HTMLElement | HTMLElement[] | null,
  TypedExpressionContext
> {
  public readonly name = 'css-selector' as const;
  public readonly category = 'Reference' as const;
  public readonly syntax = '<selector/> or <selector/> (single)';
  public readonly description = 'Queries DOM elements using CSS selectors with validation';
  public readonly inputSchema = CSSelectorInputSchema;
  public readonly outputType = 'ElementList' as const;

  public readonly metadata: ExpressionMetadata = {
    category: 'Reference',
    complexity: 'medium',
    sideEffects: ['dom-query'],
    dependencies: [],
    returnTypes: ['Element', 'ElementList', 'Null'],
    examples: [
      {
        input: '<.button/>',
        description: 'Select all elements with class "button"',
        expectedOutput: [], // HTMLElement[]
      },
      {
        input: '<#main/>',
        description: 'Select element with id "main"',
        expectedOutput: null, // HTMLElement
      }
    ],
    relatedExpressions: ['closest', 'first', 'last'],
    performance: {
      averageTime: 0.5,
      complexity: 'O(n)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Queries DOM elements using CSS selectors with comprehensive validation and error handling',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        description: 'Valid CSS selector string',
        optional: false,
        examples: ['.class', '#id', 'div', '[data-value]', '.class > .child']
      },
      {
        name: 'single',
        type: 'boolean',
        description: 'Whether to return single element (true) or all matches (false)',
        optional: true,
        examples: ['true', 'false']
      }
    ],
    returns: {
      type: 'ElementList | Element | Null',
      description: 'Matching DOM elements, single element, or null if no matches',
      examples: ['[<div>, <span>]', '<button>', 'null']
    },
    examples: [
      {
        title: 'Class selector',
        code: '<.button/>',
        explanation: 'Select all elements with class "button"',
        output: '[HTMLElement, HTMLElement]'
      },
      {
        title: 'ID selector',
        code: '<#navbar/>',
        explanation: 'Select element with id "navbar"',
        output: 'HTMLElement'
      },
      {
        title: 'Attribute selector',
        code: '<[data-role="tab"]/>',
        explanation: 'Select elements with specific data attribute',
        output: '[HTMLElement]'
      },
      {
        title: 'Complex selector',
        code: '<.container .item:first-child/>',
        explanation: 'Select first child items within containers',
        output: '[HTMLElement]'
      }
    ],
    seeAlso: ['closest', 'first', 'last', 'me', 'you'],
    tags: ['dom', 'selector', 'query', 'css']
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
              'Avoid special characters that need escaping'
            ]
          },
          type: 'error'
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
        success: true
      });

      return {
        success: true,
        value: result,
        type: Array.isArray(result) ? 'element-list' : 'element'
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
            'Verify elements exist in document'
          ]
        },
        type: 'error'
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
            type: 'type-mismatch' as const,
            message: `Invalid input: ${err.message}`,
            suggestions: this.getValidationSuggestion(err.code ?? 'unknown')
          })) ?? [],
          suggestions: ['Provide valid CSS selector string', 'Check selector syntax']
        };
      }

      // Additional validation
      const { selector } = parsed.data as { selector: string };
      
      if (!this.isValidCSSSelector(selector)) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: `Invalid CSS selector syntax: "${selector}"`,
            suggestions: ['Use valid CSS selector patterns']
          }],
          suggestions: [
            'Use .class for class selectors',
            'Use #id for ID selectors', 
            'Use tag for element selectors',
            'Use [attr] for attribute selectors'
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
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: ['Check input structure and types']
        }],
        suggestions: ['Ensure input matches expected format']
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
      'too_small': 'CSS selector cannot be empty',
      'invalid_type': 'Selector must be a string',
      'required': 'CSS selector is required'
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
export const enhancedReferenceExpressions = {
  me: new EnhancedMeExpression(),
  you: new EnhancedYouExpression(),
  it: new EnhancedItExpression(),
  'css-selector': new EnhancedCSSSelectorExpression()
} as const;

/**
 * Factory functions for creating enhanced reference expressions
 */
export function createEnhancedMeExpression(): EnhancedMeExpression {
  return new EnhancedMeExpression();
}

export function createEnhancedYouExpression(): EnhancedYouExpression {
  return new EnhancedYouExpression();
}

export function createEnhancedItExpression(): EnhancedItExpression {
  return new EnhancedItExpression();
}

export function createEnhancedCSSSelectorExpression(): EnhancedCSSSelectorExpression {
  return new EnhancedCSSSelectorExpression();
}

export default enhancedReferenceExpressions;