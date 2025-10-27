/**
 * Enhanced In Expression - Membership Testing and DOM Queries
 * Implements comprehensive 'in' expression functionality with TypeScript integration
 * Handles array membership, DOM element queries, and advanced filtering
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  LLMDocumentation,
  ValidationResult
} from '../../types/enhanced-core.ts';
import type {
  ValidationError,
  TypedExpressionContext
} from '../../types/base-types';
import type { TypedExpressionImplementation } from '../../types/enhanced-expressions';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for 'in' expression input validation
 */
export const InExpressionInputSchema = v.tuple([
  v.unknown().describe('Value(s) to search for (can be single value or array)'),
  v.unknown().describe('Container to search in (array, NodeList, or DOM element)')
]);

export type InExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced In Expression Implementation
// ============================================================================

/**
 * Enhanced 'in' expression for membership testing and DOM queries
 * Provides comprehensive search functionality for arrays and DOM elements
 */
export class EnhancedInExpression implements TypedExpressionImplementation<
  HyperScriptValue[]
> {
  public readonly inputSchema = InExpressionInputSchema;
  
  public readonly documentation: LLMDocumentation = {
    summary: 'Tests membership in collections and performs DOM queries with comprehensive filtering',
    parameters: [
      {
        name: 'searchValue',
        type: 'any',
        description: 'Value or array of values to search for',
        optional: false,
        examples: ['1', '[1, 3]', '<p.foo/>', '#myId']
      },
      {
        name: 'container',
        type: 'any',
        description: 'Container to search in (array, NodeList, or DOM element)',
        optional: false,
        examples: ['[1, 2, 3]', 'document', '#container', '<div/>']
      }
    ],
    returns: {
      type: 'array',
      description: 'Array of found values/elements, empty array if nothing found',
      examples: [[1], [1, 3], [], ['<p class="foo"></p>']]
    },
    examples: [
      {
        title: 'Array membership test',
        code: '1 in [1, 2, 3]',
        explanation: 'Returns [1] if 1 is found in the array',
        output: [1]
      },
      {
        title: 'Multiple value search',
        code: '[1, 3] in [1, 2, 3]',
        explanation: 'Returns [1, 3] for values found in the array',
        output: [1, 3]
      },
      {
        title: 'DOM query',
        code: '<p/> in #container',
        explanation: 'Returns array of matching <p> elements within #container',
        output: ['<p elements>']
      }
    ],
    seeAlso: ['CSS selectors', 'DOM queries', 'array methods'],
    tags: ['membership', 'search', 'dom', 'query', 'filter']
  };

  /**
   * Validate 'in' expression arguments
   */
  async validate(args: unknown[]): Promise<ValidationResult> {
    try {
      const validatedArgs = this.inputSchema.parse(args) as [unknown, unknown];
      const [searchValue, container] = validatedArgs;

      const issues: ValidationError[] = [];

      // Basic validation
      if (searchValue === undefined) {
        issues.push({
          type: 'validation-error',
          message: 'Search value cannot be undefined',
          suggestions: []
        });
      }

      if (container === undefined || container === null) {
        issues.push({
          type: 'validation-error',
          message: 'Container cannot be null or undefined',
          suggestions: []
        });
      }

      // Check for potentially expensive operations
      if (Array.isArray(searchValue) && searchValue.length > 100) {
        issues.push({
          type: 'validation-error',
          message: `Searching for ${searchValue.length} values may impact performance`,
          suggestions: []
        });
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions: issues.length > 0 ? [
          'Ensure search value and container are valid',
          'Consider breaking large searches into smaller chunks',
          'Use specific CSS selectors for DOM queries'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'syntax-error',
          message: error instanceof Error ? error.message : 'Invalid in expression arguments',
          suggestions: []
        }],
        suggestions: [
          'Provide a search value as the first argument',
          'Provide a container (array, NodeList, or DOM element) as the second argument'
        ]
      };
    }
  }

  /**
   * Evaluate 'in' expression
   */
  async evaluate(
    context: TypedExpressionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HyperScriptValue[]>> {
    try {
      // Validate input arguments
      const validationResult = await this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            type: 'validation-error',
            message: `In expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      const [searchValue, container] = this.inputSchema.parse(args) as [unknown, unknown];
      
      // Handle different container types
      if (this.isArrayLike(container)) {
        return this.searchInArray(searchValue, container);
      } else if (this.isDOMElement(container) || this.isDOMSelector(container)) {
        return await this.searchInDOM(searchValue, container, context);
      } else {
        return {
          success: false,
          error: {
            name: 'InvalidContainerError',
            type: 'type-mismatch',
            message: `Unsupported container type: ${typeof container}`,
            code: 'INVALID_CONTAINER_TYPE',
            suggestions: ['Use an array, object, or DOM element as container']
          },
          type: 'error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'InExpressionEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate in expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'IN_EXPRESSION_EVALUATION_ERROR',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Search for values in array-like containers
   */
  private searchInArray(
    searchValue: unknown,
    container: unknown
  ): EvaluationResult<HyperScriptValue[]> {
    try {
      const containerArray = Array.from(container as ArrayLike<unknown>);
      const searchValues = Array.isArray(searchValue) ? searchValue : [searchValue];
      
      const found: HyperScriptValue[] = [];
      
      for (const value of searchValues) {
        if (containerArray.includes(value)) {
          found.push(value as HyperScriptValue);
        }
      }
      
      return {
        success: true,
        value: found,
        type: 'array'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ArraySearchError',
          type: 'runtime-error',
          message: `Failed to search in array: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_SEARCH_ERROR',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Search for elements in DOM containers
   */
  private async searchInDOM(
    searchValue: unknown,
    container: unknown,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HyperScriptValue[]>> {
    try {
      // Resolve container to DOM element
      const containerElement = await this.resolveContainerElement(container, context);
      if (!containerElement.success || !containerElement.value) {
        return containerElement as unknown as EvaluationResult<HyperScriptValue[]>;
      }

      // Handle different search value types
      if (typeof searchValue === 'string') {
        return this.querySelectorInContainer(searchValue, containerElement.value);
      } else if (Array.isArray(searchValue)) {
        return this.multiQueryInContainer(searchValue, containerElement.value);
      } else {
        return {
          success: true,
          value: [],
          type: 'array'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'DOMSearchError',
          type: 'runtime-error',
          message: `Failed to search in DOM: ${error instanceof Error ? error.message : String(error)}`,
          code: 'DOM_SEARCH_ERROR',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Resolve container to a DOM element
   */
  private async resolveContainerElement(
    container: unknown,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HTMLElement>> {
    if (container instanceof HTMLElement) {
      return { success: true, value: container, type: 'element' };
    }
    
    if (typeof container === 'string') {
      // Handle CSS selector
      if (container.startsWith('#')) {
        const element = document.getElementById(container.slice(1));
        if (element) {
          return { success: true, value: element, type: 'element' };
        }
      } else if (container.startsWith('.')) {
        const element = document.querySelector(container);
        if (element instanceof HTMLElement) {
          return { success: true, value: element, type: 'element' };
        }
      } else if (container.startsWith('<') && container.endsWith('/>')) {
        // Handle element selector like <div/>
        const tagName = container.slice(1, -2);
        const element = document.querySelector(tagName);
        if (element instanceof HTMLElement) {
          return { success: true, value: element, type: 'element' };
        }
      }
    }
    
    // Try to resolve from context
    if (container === 'me' && context.me) {
      return { success: true, value: context.me, type: 'element' };
    }
    
    // Default to document if no specific container found
    return { success: true, value: document.documentElement, type: 'element' };
  }

  /**
   * Query selector in container element
   */
  private querySelectorInContainer(
    selector: string,
    container: HTMLElement
  ): EvaluationResult<HyperScriptValue[]> {
    try {
      let cssSelector = selector;
      
      // Convert hyperscript selector to CSS selector
      if (selector.startsWith('<') && selector.endsWith('/>')) {
        cssSelector = this.convertHyperscriptSelector(selector);
      }
      
      const elements = Array.from(container.querySelectorAll(cssSelector));
      return {
        success: true,
        value: elements as HyperScriptValue[],
        type: 'array'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'QuerySelectorError',
          type: 'runtime-error',
          message: `Failed to query selector '${selector}': ${error instanceof Error ? error.message : String(error)}`,
          code: 'QUERY_SELECTOR_ERROR',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Perform multiple queries in container
   */
  private multiQueryInContainer(
    selectors: unknown[],
    container: HTMLElement
  ): EvaluationResult<HyperScriptValue[]> {
    try {
      const allElements: HTMLElement[] = [];
      
      for (const selector of selectors) {
        if (typeof selector === 'string') {
          const result = this.querySelectorInContainer(selector, container);
          if (result.success) {
            allElements.push(...(result.value as HTMLElement[]));
          }
        }
      }
      
      // Remove duplicates
      const uniqueElements = Array.from(new Set(allElements));
      
      return {
        success: true,
        value: uniqueElements as HyperScriptValue[],
        type: 'array'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'MultiQueryError',
          type: 'runtime-error',
          message: `Failed to perform multi-query: ${error instanceof Error ? error.message : String(error)}`,
          code: 'MULTI_QUERY_ERROR',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Convert hyperscript selector to CSS selector
   */
  private convertHyperscriptSelector(selector: string): string {
    // Remove < and />
    let cssSelector = selector.slice(1, -2);
    
    // Handle class selectors: p.foo -> p.foo
    // Handle ID selectors: div#myId -> div#myId
    // These are already valid CSS selectors
    
    return cssSelector;
  }

  /**
   * Check if value is array-like
   */
  private isArrayLike(value: unknown): boolean {
    if (Array.isArray(value)) return true;
    if (typeof value === 'string') return true; // Strings are array-like
    if (value && typeof value === 'object' && 'length' in value) return true;
    return false;
  }

  /**
   * Check if value is a DOM element
   */
  private isDOMElement(value: unknown): boolean {
    return value instanceof HTMLElement;
  }

  /**
   * Check if value is a DOM selector string
   */
  private isDOMSelector(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return (
      value.startsWith('#') ||
      value.startsWith('.') ||
      value.startsWith('<') ||
      value === 'me' ||
      value === 'document'
    );
  }

  /**
   * Infer the type of a search result
   */
  // @ts-expect-error - Reserved for future use
  private _inferType(value: unknown): HyperScriptValueType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof HTMLElement) return 'element';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'function') return 'function';
    return 'unknown';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'InExpression',
      category: 'query' as const,
      version: '1.0.0',
      description: 'Enhanced in expression for membership testing and DOM queries',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'array membership testing',
        'multiple value search',
        'DOM element queries',
        'CSS selector support',
        'hyperscript selector conversion',
        'context-aware element resolution',
        'duplicate removal in results'
      ],
      performance: {
        complexity: 'medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'proportional to result set size'
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: false // DOM queries shouldn't be cached
      }
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced in expression
 */
export function createInExpression(): EnhancedInExpression {
  return new EnhancedInExpression();
}

/**
 * Type guard for in expression input
 */
export function isValidInExpressionInput(args: unknown[]): args is InExpressionInput {
  try {
    InExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export async function searchIn(
  searchValue: unknown,
  container: unknown,
  context: TypedExpressionContext
): Promise<EvaluationResult<HyperScriptValue[]>> {
  const expression = new EnhancedInExpression();
  return expression.evaluate(context, searchValue, container);
}

// Default exports
export { EnhancedInExpression as default };