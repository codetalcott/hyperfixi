/**
 * Enhanced @repeat Directive - Deep TypeScript Integration
 * Implements iteration template rendering with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

// import { v } from '../../../validation/lightweight-validators'; // Currently unused
import type {
  EnhancedTemplateDirective,
  TemplateExecutionContext,
  RepeatDirectiveInput,
  TemplateDirectiveType,
  TemplateRenderStrategy,
  TemplateLLMDocumentation,
} from '../../../types/template-types.ts';
import { RepeatDirectiveInputSchema } from '../../../types/template-types';
import type { EvaluationResult, ExpressionMetadata } from '../../../types/base-types';
import type {
  ValidationResult,
  ValidationError,
} from '../../../types/unified-types.ts';
import type { HyperScriptValue } from '../../../types/command-types.ts';
import { TemplateContextUtils } from '../template-context';

/**
 * Enhanced @repeat directive with full type safety for LLM agents
 */
export class RepeatDirective implements TemplateDirective<RepeatDirectiveInput, string> {
  public readonly name = '@repeat' as const;
  public readonly category = 'Template';
  public readonly syntax = '@repeat in <collection>';
  public readonly outputType = 'String' as const;
  public readonly inputSchema = RepeatDirectiveInputSchema;

  // Template-specific properties
  public readonly directiveType: TemplateDirectiveType = '@repeat';
  public readonly renderStrategy: TemplateRenderStrategy = 'iterate';
  public readonly createsScope = true;
  public readonly allowsNesting = true;
  public readonly allowedNext: TemplateDirectiveType[] = ['@end'];

  public readonly metadata: ExpressionMetadata = {
    category: 'Template',
    complexity: 'medium',
    sideEffects: ['template-rendering', 'context-scoping'],
    dependencies: [],
    returnTypes: ['String'],
    examples: [
      {
        input: '@repeat in items\n<li>${it.name}</li>\n@end',
        description: 'Generate list items for each item in collection',
        expectedOutput: '<li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li>',
      },
      {
        input:
          '@repeat in users\n<div class="user">\n  <h3>${it.name}</h3>\n  <p>${it.email}</p>\n</div>\n@end',
        description: 'Create user cards from user collection',
        expectedOutput: '<div class="user">\n  <h3>John</h3>\n  <p>john@example.com</p>\n</div>',
      },
      {
        input:
          '@repeat in products\n@if it.inStock\n<span class="available">${it.name} - $${it.price}</span>\n@end\n@end',
        description: 'Conditionally render products that are in stock',
        expectedOutput: '<span class="available">Widget - $29.99</span>',
      },
    ],
    relatedExpressions: ['@if', 'collection access', 'it context'],
    performance: {
      averageTime: 2.5,
      complexity: 'O(n)',
    },
  };

  public readonly documentation: TemplateLLMDocumentation = {
    summary:
      'Iterates over a collection and renders template content for each item with scoped context',
    parameters: [
      {
        name: 'collection',
        type: 'object',
        description: 'Array or iterable collection to iterate over',
        optional: false,
        examples: ['items', 'users', 'products', '[1, 2, 3]', 'document.querySelectorAll(".item")'],
      },
      {
        name: 'iteratorVariable',
        type: 'string',
        description: 'Variable name for current item (defaults to "it")',
        optional: true,
        examples: ['it', 'item', 'user', 'product'],
      },
      {
        name: 'templateContent',
        type: 'string',
        description: 'Template content to render for each item',
        optional: false,
        examples: ['<li>${it.name}</li>', '${it} - ${index}', '<div>${item.title}</div>'],
      },
    ],
    returns: {
      type: 'object',
      description: 'Structured result with concatenated rendered content from all iterations',
      examples: ['{ success: true, value: "<li>Item 1</li><li>Item 2</li>", type: "string" }'],
    },
    examples: [
      {
        title: 'Simple list rendering',
        code: '@repeat in items\n<li>${it}</li>\n@end',
        explanation: 'Creates HTML list items for each item in the collection',
        output: '<li>Apple</li><li>Banana</li><li>Cherry</li>',
      },
      {
        title: 'Object collection with properties',
        code: '@repeat in users\n<div class="user-card">\n  <h4>${it.name}</h4>\n  <p>${it.email}</p>\n</div>\n@end',
        explanation: 'Renders user cards accessing object properties',
        output: '<div class="user-card">\n  <h4>Alice</h4>\n  <p>alice@example.com</p>\n</div>',
      },
      {
        title: 'Nested iteration with conditionals',
        code: '@repeat in categories\n<section>\n  <h3>${it.name}</h3>\n  @repeat in it.items\n  @if it.featured\n  <div class="featured-item">${it.title}</div>\n  @end\n  @end\n</section>\n@end',
        explanation: 'Nested loops with conditional rendering',
        output:
          '<section>\n  <h3>Electronics</h3>\n  <div class="featured-item">Laptop</div>\n</section>',
      },
      {
        title: 'Index and position access',
        code: '@repeat in items\n<div class="item-${index}">\n  ${index + 1}. ${it.name}\n  @if first\n    <span class="first">First Item</span>\n  @end\n  @if last\n    <span class="last">Last Item</span>\n  @end\n</div>\n@end',
        explanation: 'Access iteration index and position information',
        output:
          '<div class="item-0">\n  1. First Item\n  <span class="first">First Item</span>\n</div>',
      },
    ],
    patterns: [
      {
        name: 'Table Rows',
        template:
          '<table>\n@repeat in data\n<tr>\n  <td>${it.id}</td>\n  <td>${it.name}</td>\n  <td>${it.value}</td>\n</tr>\n@end\n</table>',
        context: {
          data: [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
          ],
        },
        expectedOutput:
          '<table>\n<tr>\n  <td>1</td>\n  <td>Item 1</td>\n  <td>100</td>\n</tr>\n<tr>\n  <td>2</td>\n  <td>Item 2</td>\n  <td>200</td>\n</tr>\n</table>',
        explanation: 'Generate table rows from data collection',
      },
      {
        name: 'Card Layout',
        template:
          '<div class="card-grid">\n@repeat in products\n<div class="card">\n  <img src="${it.image}" alt="${it.name}">\n  <h3>${it.name}</h3>\n  <p class="price">$${it.price}</p>\n</div>\n@end\n</div>',
        context: { products: [{ name: 'Widget', price: 29.99, image: 'widget.jpg' }] },
        expectedOutput:
          '<div class="card-grid">\n<div class="card">\n  <img src="widget.jpg" alt="Widget">\n  <h3>Widget</h3>\n  <p class="price">$29.99</p>\n</div>\n</div>',
        explanation: 'Create product cards in a grid layout',
      },
      {
        name: 'Navigation Menu',
        template:
          '<nav>\n<ul class="menu">\n@repeat in menuItems\n<li class="menu-item ${it.active ? "active" : ""}">\n  <a href="${it.url}">${it.label}</a>\n  @if it.children\n  <ul class="submenu">\n    @repeat in it.children\n    <li><a href="${it.url}">${it.label}</a></li>\n    @end\n  </ul>\n  @end\n</li>\n@end\n</ul>\n</nav>',
        context: { menuItems: [{ label: 'Home', url: '/', active: true, children: null }] },
        expectedOutput:
          '<nav>\n<ul class="menu">\n<li class="menu-item active">\n  <a href="/">Home</a>\n</li>\n</ul>\n</nav>',
        explanation: 'Generate hierarchical navigation menu',
      },
    ],
    combinations: [
      {
        directives: ['@repeat', '@if'],
        description: 'Conditional item rendering',
        example: '@repeat in items\n@if it.visible\n<div>${it.name}</div>\n@end\n@end',
        useCase: 'Only render items that meet certain conditions',
      },
      {
        directives: ['@repeat', '@repeat'],
        description: 'Nested iteration',
        example:
          '@repeat in categories\n<h2>${it.name}</h2>\n@repeat in it.items\n<p>${it.title}</p>\n@end\n@end',
        useCase: 'Render nested data structures like categories and items',
      },
    ],
    troubleshooting: [
      {
        error: 'Collection is not iterable',
        cause: 'Provided collection is not an array or iterable object',
        solution: 'Ensure collection is an array, NodeList, or other iterable',
        prevention: 'Validate collection type before template execution',
      },
      {
        error: 'Undefined variable in iteration',
        cause: "Accessing properties that don't exist on iteration items",
        solution: 'Check item structure and use conditional access patterns',
        prevention: 'Use @if checks before accessing object properties',
      },
      {
        error: 'Infinite loop or performance issues',
        cause: 'Very large collections or complex nested templates',
        solution: 'Consider pagination, virtualization, or template optimization',
        prevention: 'Monitor collection sizes and template complexity',
      },
    ],
    seeAlso: ['@if', '@else', 'it context', 'collection operations', 'template interpolation'],
    tags: ['iteration', 'template', 'rendering', 'collection', 'loop', 'context'],
  };

  /**
   * Main evaluation method for expressions
   */
  async evaluate(
    context: TemplateExecutionContext,
    input: RepeatDirectiveInput
  ): Promise<EvaluationResult<string>> {
    return this.executeTemplate(context, input, input.templateContent);
  }

  /**
   * Enhanced template execution method
   */
  async executeTemplate(
    context: TemplateExecutionContext,
    input: RepeatDirectiveInput,
    templateContent: string
  ): Promise<EvaluationResult<string>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'RepeatDirectiveValidationError',
            type: 'validation-error',
            message: validation.errors[0]?.message || 'Invalid @repeat directive input',
            code: 'REPEAT_VALIDATION_FAILED',
            suggestions: validation.suggestions || [
              'Ensure collection and templateContent are provided',
              'Check collection is iterable (array, NodeList, etc.)',
              'Verify template content is valid',
            ],
          },
        };
      }

      // Validate template context
      const contextValidation = this.validateTemplateContext(context, input);
      if (!contextValidation.isValid) {
        return {
          success: false,
          error: {
            name: 'RepeatDirectiveContextError',
            type: 'invalid-argument',
            message: contextValidation.errors[0]?.message || 'Invalid template context',
            code: 'REPEAT_CONTEXT_INVALID',
            suggestions: contextValidation.suggestions || ['Check template context structure'],
          },
        };
      }

      // Validate collection is iterable
      const collection = input.collection;
      const iterableValidation = this.validateIterable(collection);
      if (!iterableValidation.isValid) {
        return {
          success: false,
          error: {
            name: 'RepeatDirectiveCollectionError',
            type: 'invalid-argument',
            message: iterableValidation.errors[0]?.message || 'Collection is not iterable',
            code: 'REPEAT_COLLECTION_INVALID',
            suggestions: iterableValidation.suggestions || [
              'Provide an array or iterable collection',
            ],
          },
        };
      }

      // Convert to array for consistent iteration
      const items = this.toArray(collection);
      const results: string[] = [];

      // Iterate through items
      for (let index = 0; index < items.length; index++) {
        const item = items[index];

        // Create iteration context
        const iterationContext = this.createIterationContext(
          context,
          collection,
          index,
          item,
          input.iteratorVariable
        );

        // Render template content for this iteration
        const iterationResult = await this.renderTemplateContent(templateContent, iterationContext);

        if (iterationResult.trim()) {
          results.push(iterationResult);
        }
      }

      // Join all results with newlines to preserve template structure
      const finalResult = results.join('\n');

      // Track evaluation
      this.trackEvaluation(context, input, finalResult, startTime);

      return {
        success: true,
        value: finalResult,
        type: 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'RepeatDirectiveError',
          type: 'runtime-error',
          message: `@repeat directive execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'REPEAT_EXECUTION_FAILED',
          suggestions: [
            'Check collection is valid and iterable',
            'Verify template content syntax',
            'Ensure all referenced variables exist in context',
          ],
        },
      };
    }
  }

  /**
   * Validate input according to schema
   */
  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid @repeat directive: ${err.message}`,
              suggestions: [
                `Expected { collection: any, templateContent: string }, got: ${typeof input}`,
              ],
            })) ?? [],
          suggestions: [
            'Provide collection and templateContent',
            'Ensure collection is an array or iterable',
            'Check @repeat directive syntax: @repeat in <collection>',
          ],
        };
      }

      // Additional semantic validation
      const data = parsed.data as any;
      const { collection: _collection, templateContent } = data;

      if (!templateContent.trim()) {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Template content cannot be empty',
              suggestions: ['Provide content to render for each iteration'],
            },
          ],
          suggestions: ['Add content between @repeat and @end directives'],
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
            suggestions: ['Check @repeat directive input structure'],
          },
        ],
        suggestions: ['Ensure input matches expected format'],
      };
    }
  }

  /**
   * Validate template context and input
   */
  validateTemplateContext(
    context: TemplateExecutionContext,
    _input: RepeatDirectiveInput
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check template buffer exists
    if (!Array.isArray(context.templateBuffer)) {
      errors.push({
        type: 'runtime-error',
        message: 'Template buffer not initialized',
        suggestions: ['Ensure template context is properly created'],
      });
    }

    // Check nesting depth
    if (context.templateDepth > 10) {
      errors.push({
        type: 'runtime-error',
        message: `Template nesting too deep (${context.templateDepth})`,
        suggestions: ['Reduce template nesting complexity'],
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.length > 0 ? ['Fix template context issues'] : [],
    };
  }

  /**
   * Validate that collection is iterable
   */
  private validateIterable(collection: unknown): ValidationResult {
    // Check for null/undefined
    if (collection == null) {
      return {
        isValid: false,
        errors: [
          {
            type: 'validation-error',
            message: 'Collection is null or undefined',
            suggestions: ['Provide a valid array or iterable collection'],
          },
        ],
        suggestions: ['Check collection exists before template execution'],
      };
    }

    // Check for array
    if (Array.isArray(collection)) {
      return { isValid: true, errors: [], suggestions: [] };
    }

    // Check for array-like objects (NodeList, HTMLCollection, etc.)
    if (
      typeof collection === 'object' &&
      'length' in collection &&
      typeof (collection as any).length === 'number'
    ) {
      return { isValid: true, errors: [], suggestions: [] };
    }

    // Check for iterables (Set, Map, etc.)
    if (typeof collection === 'object' && Symbol.iterator in collection) {
      return { isValid: true, errors: [], suggestions: [] };
    }

    return {
      isValid: false,
      errors: [
        {
          type: 'validation-error',
          message: `Collection type ${typeof collection} is not iterable`,
          suggestions: ['Provide an array, NodeList, or other iterable collection'],
        },
      ],
      suggestions: [
        'Convert to array using Array.from()',
        'Ensure collection implements iteration protocol',
        'Check collection structure and type',
      ],
    };
  }

  /**
   * Convert collection to array for consistent iteration
   */
  private toArray(collection: unknown): unknown[] {
    if (Array.isArray(collection)) {
      return collection;
    }

    // Handle array-like objects
    if (typeof collection === 'object' && collection != null && 'length' in collection) {
      return Array.from(collection as ArrayLike<unknown>);
    }

    // Handle iterables
    if (typeof collection === 'object' && collection != null && Symbol.iterator in collection) {
      return Array.from(collection as Iterable<unknown>);
    }

    // Fallback: wrap in array
    return [collection];
  }

  /**
   * Create iteration context for current item
   */
  private createIterationContext(
    context: TemplateExecutionContext,
    collection: HyperScriptValue,
    currentIndex: number,
    currentItem: HyperScriptValue,
    iteratorVariable?: string
  ): TemplateExecutionContext {
    const items = this.toArray(collection);
    const totalItems = items.length;
    const varName = iteratorVariable || 'it';

    const newContext = {
      ...context,
      it: currentItem,
      iterationContext: {
        collection,
        currentIndex,
        currentItem,
        totalItems,
      },

      // Increase template depth
      templateDepth: context.templateDepth + 1,

      // Add iteration variables to locals
      locals: new Map([
        ...Array.from(context.locals.entries()),
        [varName, currentItem],
        ['index', currentIndex],
        ['item', currentItem],
        ['first', currentIndex === 0],
        ['last', currentIndex === totalItems - 1],
        ['length', totalItems],
      ]),
    };

    return newContext as TemplateExecutionContext;
  }

  /**
   * Render template content with interpolation
   */
  private async renderTemplateContent(
    templateContent: string,
    context: TemplateExecutionContext
  ): Promise<string> {
    // Simple interpolation for ${variable} expressions
    return templateContent.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        // Simple variable resolution from context
        const variables = TemplateContextUtils.extractVariables(context);

        // Handle simple property access (e.g., it.name, item.price)
        const value = this.resolveExpression(expression.trim(), variables);
        return String(value ?? '');
      } catch (error) {
        console.warn(`Template interpolation error for ${expression}:`, error);
        return match; // Return original if evaluation fails
      }
    });
  }

  /**
   * Simple expression resolver for template interpolation
   */
  private resolveExpression(expression: string, variables: Record<string, unknown>): unknown {
    // Handle simple variable access
    if (variables.hasOwnProperty(expression)) {
      return variables[expression];
    }

    // Handle property access (e.g., it.name, item.price)
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let current = variables[parts[0]];

      for (let i = 1; i < parts.length && current != null; i++) {
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[parts[i]];
        } else {
          return undefined;
        }
      }

      return current;
    }

    // Handle array length
    if (expression.endsWith('.length')) {
      const varName = expression.slice(0, -7);
      const value = variables[varName];
      if (Array.isArray(value)) {
        return value.length;
      }
    }

    // Handle arithmetic expressions (simple addition for index + 1)
    if (expression.includes(' + ')) {
      const parts = expression.split(' + ');
      if (parts.length === 2) {
        const left = this.resolveExpression(parts[0].trim(), variables);
        const right = this.resolveExpression(parts[1].trim(), variables);
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        }
      }
    }

    // Handle numeric literals
    const num = Number(expression);
    if (!isNaN(num)) {
      return num;
    }

    return undefined;
  }

  /**
   * Track evaluation for debugging and performance
   */
  private trackEvaluation(
    context: TemplateExecutionContext,
    input: RepeatDirectiveInput,
    result: string,
    startTime: number
  ): void {
    if (context.evaluationHistory) {
      const items = this.toArray(input.collection);
      (context.evaluationHistory as any).push({
        expressionName: this.name,
        category: this.category,
        input: { ...input, collectionSize: items.length },
        output: `${result.length} characters, ${items.length} iterations`,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true,
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create enhanced @repeat directive instance
 */
export function createRepeatDirective(): RepeatDirective {
  return new RepeatDirective();
}

export default RepeatDirective;
