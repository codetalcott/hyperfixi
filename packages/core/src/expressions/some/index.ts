/**
 * Some Expression - Existence and Non-emptiness Check
 * Implements comprehensive 'some' expression functionality with TypeScript integration
 * Handles existence checking for values, arrays, and DOM query results
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  EvaluationResult,
  TypedExpressionImplementation,
  ValidationResult,
  TypedExecutionContext,
} from '../../types/command-types';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for 'some' expression input validation
 */
export const SomeExpressionInputSchema = v.tuple([
  v.unknown().describe('Value to check for existence/non-emptiness'),
]);

export type SomeExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Some Expression Implementation
// ============================================================================

/**
 * Enhanced 'some' expression for existence and non-emptiness checking
 * Provides comprehensive existence testing for values, arrays, and DOM elements
 */
export class SomeExpression implements TypedExpressionImplementation<boolean> {
  public readonly name = 'some';
  public readonly category = 'logical' as const;
  public readonly precedence = 8; // Medium precedence for existence checks
  public readonly associativity = 'left' as const;
  public readonly outputType = 'boolean' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries are not pure
    canThrow: false,
    complexity: 'O(n)' as const, // May need to query DOM
    dependencies: ['DOM'],
  };

  public readonly inputSchema = SomeExpressionInputSchema;

  

  /**
   * Validate 'some' expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      this.inputSchema.parse(args);

      // 'Some' expressions are always valid as any value can be tested
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
            type: 'missing-argument',
            message: error instanceof Error ? error.message : 'Invalid some expression arguments',
            suggestions: ['Provide a value to test for existence'],
          },
        ],
        suggestions: [
          'Provide a single value to test',
          'Any value type is acceptable for existence testing',
        ],
      };
    }
  }

  /**
   * Evaluate 'some' expression
   */
  async evaluate(
    context: TypedExecutionContext,
    ...args: HyperScriptValue[]
  ): Promise<EvaluationResult<boolean>> {
    try {
      // Validate input arguments
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'SomeExpressionValidationError',
            type: 'validation-error',
            message: `Some expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'SOME_EXPRESSION_VALIDATION_ERROR',
            suggestions: validationResult.suggestions,
          },
          type: 'error',
        };
      }

      const [value] = this.inputSchema.parse(args) as [unknown];

      // Evaluate existence/non-emptiness
      const exists = await this.evaluateExistence(value, context);

      return {
        success: true,
        value: exists,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'SomeExpressionEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate some expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'SOME_EXPRESSION_EVALUATION_ERROR',
          suggestions: ['Check the input value', 'Ensure the value is evaluable'],
        },
        type: 'error',
      };
    }
  }

  /**
   * Evaluate existence/non-emptiness of a value
   */
  private async evaluateExistence(
    value: unknown,
    context: TypedExecutionContext
  ): Promise<boolean> {
    // Handle null and undefined - they don't exist
    if (value === null || value === undefined) {
      return false;
    }

    // Handle arrays - check if non-empty
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Handle array-like objects (NodeList, etc.)
    if (this.isArrayLike(value)) {
      const length = (value as ArrayLike<unknown>).length;
      return length > 0;
    }

    // Handle DOM selector strings
    if (typeof value === 'string' && this.isDOMSelector(value)) {
      return await this.evaluateDOMSelector(value, context);
    }

    // Handle empty string - considered non-existent in hyperscript context
    if (value === '') {
      return false;
    }

    // All other values exist
    return true;
  }

  /**
   * Check if value is array-like
   */
  private isArrayLike(value: unknown): boolean {
    if (Array.isArray(value)) return true;
    if (value && typeof value === 'object' && 'length' in value) return true;
    return false;
  }

  /**
   * Check if string looks like a DOM selector
   */
  private isDOMSelector(value: string): boolean {
    // Check for CSS selectors: .class, #id
    if (value.startsWith('.') || value.startsWith('#')) return true;

    // Check for hyperscript element selectors: <element/>
    if (value.startsWith('<') && value.endsWith('/>')) return true;

    // Check for simple HTML element names (not arbitrary strings)
    // Only treat as selector if it's a known HTML element name
    const htmlElementNames = [
      'a',
      'abbr',
      'address',
      'area',
      'article',
      'aside',
      'audio',
      'b',
      'base',
      'bdi',
      'bdo',
      'blockquote',
      'body',
      'br',
      'button',
      'canvas',
      'caption',
      'cite',
      'code',
      'col',
      'colgroup',
      'data',
      'datalist',
      'dd',
      'del',
      'details',
      'dfn',
      'dialog',
      'div',
      'dl',
      'dt',
      'em',
      'embed',
      'fieldset',
      'figcaption',
      'figure',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'head',
      'header',
      'hr',
      'html',
      'i',
      'iframe',
      'img',
      'input',
      'ins',
      'kbd',
      'label',
      'legend',
      'li',
      'link',
      'main',
      'map',
      'mark',
      'meta',
      'meter',
      'nav',
      'noscript',
      'object',
      'ol',
      'optgroup',
      'option',
      'output',
      'p',
      'param',
      'picture',
      'pre',
      'progress',
      'q',
      'rp',
      'rt',
      'ruby',
      's',
      'samp',
      'script',
      'section',
      'select',
      'small',
      'source',
      'span',
      'strong',
      'style',
      'sub',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'template',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'time',
      'title',
      'tr',
      'track',
      'u',
      'ul',
      'var',
      'video',
      'wbr',
    ];

    if (htmlElementNames.includes(value.toLowerCase())) return true;

    return false;
  }

  /**
   * Evaluate DOM selector to see if it matches any elements
   */
  private evaluateDOMSelector(selector: string, context: TypedExecutionContext): Promise<boolean> {
    try {
      let cssSelector = selector;

      // Convert hyperscript selector to CSS selector
      if (selector.startsWith('<') && selector.endsWith('/>')) {
        cssSelector = this.convertHyperscriptSelector(selector);
      }

      // Use context.me as search root if available, otherwise search from document
      const searchRoot: Element | Document = context.me || document;

      // Query for elements
      const elements = searchRoot.querySelectorAll(cssSelector);
      return Promise.resolve(elements.length > 0);
    } catch (_error) {
      // If selector is invalid, treat as non-existent
      return Promise.resolve(false);
    }
  }

  /**
   * Convert hyperscript selector to CSS selector
   */
  private convertHyperscriptSelector(selector: string): string {
    // Remove < and />
    // For <div/> we want to remove the first < and the last />
    // selector.slice(1, -2) removes 1 char from start and 2 chars from end
    const cssSelector = selector.slice(1, selector.length - 2);

    // Handle class selectors: p.foo -> p.foo
    // Handle ID selectors: div#myId -> div#myId
    // These are already valid CSS selectors

    return cssSelector;
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'SomeExpression',
      category: 'utility' as const,
      version: '1.0.0',
      description:
        'Enhanced existence and non-emptiness checking for values, arrays, and DOM elements',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'null/undefined detection',
        'empty array detection',
        'array-like object checking',
        'DOM selector evaluation',
        'hyperscript selector support',
        'context-aware DOM queries',
        'empty string handling',
      ],
      performance: {
        complexity: 'low',
        averageExecutionTime: '< 2ms',
        memoryUsage: 'minimal',
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: false, // DOM queries shouldn't be cached
      },
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced some expression
 */
export function createSomeExpression(): EnhancedSomeExpression {
  return new EnhancedSomeExpression();
}

/**
 * Type guard for some expression input
 */
export function isValidSomeExpressionInput(args: unknown[]): args is SomeExpressionInput {
  try {
    SomeExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export function evaluateSome(
  value: HyperScriptValue,
  context: TypedExecutionContext
): Promise<EvaluationResult<boolean>> {
  const expression = new EnhancedSomeExpression();
  return expression.evaluate(context, value);
}

// Default exports
export { EnhancedSomeExpression as default };
