/**
 * Enhanced Render Command Implementation
 * Renders templates with @if, @else, and @repeat directives
 * 
 * Syntax: render <template> [with (<variables>)]
 * 
 * Integrates with the enhanced template directive system
 */

import { v, z } from '../../validation/lightweight-validators';
import type { TypedCommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';
import type { UnifiedValidationResult } from '../../types/unified-types';
import { EnhancedIfDirective } from './directives/enhanced-if';
import { EnhancedElseDirective } from './directives/enhanced-else';
import { EnhancedRepeatDirective } from './directives/enhanced-repeat';

/**
 * Zod schema for RENDER command input validation
 */
export const RenderCommandInputSchema = v.object({
  template: v.union([
    z.instanceof(HTMLTemplateElement),
    v.string().min(1),
  ]).describe('Template element or template string to render'),
  
  variables: z.record(v.string(), v.unknown()).optional().describe('Variables to pass to template context'),
  
  withKeyword: v.literal('with').optional().describe('Syntax keyword "with"'),
}).describe('RENDER command input parameters');

// Input type definition
export interface RenderCommandInput {
  template: HTMLTemplateElement | string;
  variables?: Record<string, unknown>;
  withKeyword?: 'with'; // For syntax validation
}

// Output type definition  
export interface RenderCommandOutput {
  rendered: string;
  templateSource: string;
  variablesUsed: string[];
  directivesProcessed: string[];
}

/**
 * Enhanced Render Command with full type safety and validation
 */
export class EnhancedRenderCommand implements TypedCommandImplementation<
  RenderCommandInput,
  RenderCommandOutput,
  TypedExecutionContext
> {
  public readonly name = 'render' as const;
  public readonly syntax = 'render <template> [with (<variables>)]';
  public readonly description = 'The render command processes templates with @if, @else, and @repeat directives, supporting variable interpolation and HTML escaping.';
  public readonly inputSchema = RenderCommandInputSchema;
  public readonly outputType = 'object' as const;
  
  public readonly metadata = {
    category: 'template' as const,
    complexity: 'high' as const,
    sideEffects: ['template-rendering', 'context-modification'] as const,
    examples: [
      {
        code: 'render myTemplate',
        description: 'Render a template with current context',
        expectedOutput: 'RenderCommandOutput'
      },
      {
        code: 'render myTemplate with (name: "Alice", items: [1,2,3])',
        description: 'Render template with specific variables',
        expectedOutput: 'RenderCommandOutput'
      },
      {
        code: 'render "<template>Hello ${name}!</template>" with (name: "World")',
        description: 'Render inline template string',
        expectedOutput: 'RenderCommandOutput'
      },
      {
        code: 'render template with (items: data) then put result into #output',
        description: 'Render template and place result in element',
        expectedOutput: 'RenderCommandOutput'
      }
    ],
    relatedCommands: ['put', 'set', 'get'],
    version: '2.0.0'
  };

  // Template directive instances
  private readonly ifDirective = new EnhancedIfDirective();
  private readonly elseDirective = new EnhancedElseDirective();
  private readonly repeatDirective = new EnhancedRepeatDirective();

  /**
   * Validate input using Zod schema
   */
  validate(input: unknown): UnifiedValidationResult<RenderCommandInput> {
    try {
      const result = RenderCommandInputSchema.safeParse(input);
      
      if (result.success) {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: result.data as RenderCommandInput
        };
      } else {
        // Convert Zod errors to our format
        const errors = result.error?.errors.map(err => ({
          type: 'validation-error' as const,
          message: `${Array.isArray(err.path) ? err.path.join('.') : ''}: ${err.message}`,
          suggestions: this.generateSuggestions(err.code ?? 'unknown', err.path ?? [])
        })) ?? [];

        const suggestions = errors.flatMap(err => err.suggestions);

        return {
          isValid: false,
          errors,
          suggestions
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: ['Check input format and try again']
        }],
        suggestions: ['Check input format and try again']
      };
    }
  }

  /**
   * Generate helpful suggestions based on Zod validation errors
   */
  private generateSuggestions(errorCode: string, path: (string | number)[]): string[] {
    const suggestions: string[] = [];
    
    if (path.includes('template')) {
      suggestions.push('Provide a template: HTMLTemplateElement or template string');
      suggestions.push('Examples: myTemplate, "<template>Hello ${name}!</template>"');
    }
    
    if (path.includes('variables')) {
      suggestions.push('Provide variables as object: { key: value }');
      suggestions.push('Examples: { name: "Alice", count: 42 }');
    }
    
    if (errorCode === 'invalid_type') {
      suggestions.push('Check the data type of your input');
    }
    
    if (errorCode === 'too_small') {
      suggestions.push('Template must not be empty');
    }

    // Add general syntax suggestions
    if (suggestions.length === 0) {
      suggestions.push('Use syntax: render <template> [with (<variables>)]');
      suggestions.push('See examples in command metadata');
    }
    
    return suggestions;
  }

  async execute(
    context: TypedExecutionContext,
    input: RenderCommandInput | string | string[]
  ): Promise<Element | null> {
    console.log('🎨 Enhanced RENDER command executing with:', { input, contextMe: context.me?.id });
    
    // Handle legacy argument formats from command executor
    let normalizedInput: RenderCommandInput;
    
    if (typeof input === 'string') {
      // Single string argument - probably template name
      normalizedInput = { template: input };
    } else if (Array.isArray(input)) {
      // Array arguments from command executor: ['tmpl', 'with', 'data'] or ['tmpl']
      if (input.length >= 3 && input[1] === 'with') {
        normalizedInput = { 
          template: input[0] as string, 
          variables: this.parseVariables(input[2] as string, context),
          withKeyword: 'with'
        };
      } else {
        normalizedInput = { template: input[0] as string };
      }
    } else {
      // Already properly formatted input or HTMLTemplateElement
      if (input instanceof HTMLTemplateElement) {
        normalizedInput = { template: input };
      } else {
        normalizedInput = input as RenderCommandInput;
      }
    }
    
    let { template, variables } = normalizedInput;
    const directivesProcessed: string[] = [];
    const variablesUsed: string[] = [];

    // Resolve template from context if it's a variable name
    if (typeof template === 'string' && !template.includes('<') && !template.startsWith('#') && !template.startsWith('.')) {
      // This might be a variable name, try to resolve it from context
      const resolvedTemplate = this.resolveVariable(template, context);
      if (resolvedTemplate && (typeof resolvedTemplate === 'string' || resolvedTemplate instanceof HTMLTemplateElement)) {
        template = resolvedTemplate;
      }
    }

    // Extract template content
    const templateContent = this.extractTemplateContent(template);
    console.log('📄 Template content extracted:', templateContent);

    // Create template execution context
    const templateContext = this.createTemplateContext(context, variables || {});

    // Process template with directives
    const rendered = await this.processTemplate(templateContent, templateContext, directivesProcessed, variablesUsed);

    // Create a DOM element with the rendered content for _hyperscript compatibility
    const resultElement = document.createElement('div');
    resultElement.innerHTML = rendered;
    
    // If there's only one child element, return it directly (cleaner for single elements)
    const content = resultElement.children.length === 1 ? resultElement.firstElementChild : resultElement;
    
    // Set result in context.it for chaining
    Object.assign(context, { it: content });

    // For _hyperscript compatibility, return the DOM element directly
    // The test infrastructure expects to access .textContent/.innerHTML properties
    return content;
  }

  /**
   * Extract content from template element or string
   */
  private extractTemplateContent(template: HTMLTemplateElement | string): string {
    if (typeof template === 'string') {
      // Handle template string - extract content from <template> tags if present
      const templateMatch = template.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      if (templateMatch) {
        return templateMatch[1];
      }
      return template;
    }

    // Handle HTMLTemplateElement
    if (template instanceof HTMLTemplateElement) {
      return template.innerHTML;
    }

    // Fallback for template-like objects with innerHTML property
    if (template && typeof template === 'object' && 'innerHTML' in template) {
      return (template as any).innerHTML;
    }

    // Fallback for template-like objects with textContent property
    if (template && typeof template === 'object' && 'textContent' in template) {
      return (template as any).textContent;
    }

    throw new Error('Invalid template format');
  }

  /**
   * Create template execution context with variables
   */
  private createTemplateContext(context: TypedExecutionContext, variables: Record<string, unknown>) {
    const templateContext = {
      ...context,
      templateBuffer: [] as string[],
      templateDepth: 0,
      iterationContext: undefined,
      conditionalContext: undefined,
      templateMeta: {
        templateName: 'render-command-template',
        compiledAt: Date.now(),
        executionStartTime: Date.now(),
        directiveStack: []
      },
      locals: new Map([
        ...Array.from(context.locals.entries()),
        ...Object.entries(variables)
      ])
    };

    return templateContext;
  }

  /**
   * Process template content with directive parsing and execution
   */
  private async processTemplate(
    content: string,
    context: any,
    directivesProcessed: string[],
    variablesUsed: string[]
  ): Promise<string> {
    // Parse and execute directives in the template
    const result = await this.parseAndExecuteDirectives(content, context, directivesProcessed);
    
    // Track variables used
    const variables = this.extractVariablesFromContent(content);
    variablesUsed.push(...variables);

    return result;
  }

  /**
   * Parse and execute template directives
   */
  private async parseAndExecuteDirectives(
    content: string,
    context: any,
    directivesProcessed: string[]
  ): Promise<string> {
    // Simple directive parser - looks for @repeat, @if, @else, @end patterns
    const lines = content.split('\n');
    const result: string[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.startsWith('@repeat ')) {
        // Process @repeat directive
        const { nextIndex, renderedContent } = await this.processRepeatDirective(
          lines, i, context, directivesProcessed
        );
        result.push(renderedContent);
        i = nextIndex;
        directivesProcessed.push('@repeat');
      } else if (line.startsWith('@if ')) {
        // Process @if directive
        const { nextIndex, renderedContent } = await this.processIfDirective(
          lines, i, context, directivesProcessed
        );
        result.push(renderedContent);
        i = nextIndex;
        directivesProcessed.push('@if');
      } else if (line === '@else') {
        // @else is handled within @if processing
        i++;
      } else if (line === '@end') {
        // @end is handled within directive processing
        i++;
      } else {
        // Regular content line - process variable interpolation
        const processedLine = this.processVariableInterpolation(line, context);
        if (processedLine.trim() || line === '') {
          result.push(processedLine);
        }
        i++;
      }
    }

    return result.join('\n');
  }

  /**
   * Process @repeat directive block
   */
  private async processRepeatDirective(
    lines: string[],
    startIndex: number,
    context: any,
    _directivesProcessed: string[]
  ): Promise<{ nextIndex: number; renderedContent: string }> {
    const repeatLine = lines[startIndex].trim();
    
    // Parse repeat expression: "@repeat in <collection>"
    const repeatMatch = repeatLine.match(/^@repeat\s+in\s+(.+)$/);
    if (!repeatMatch) {
      throw new Error(`Invalid @repeat syntax: ${repeatLine}`);
    }

    const collectionExpr = repeatMatch[1];
    const collection = this.evaluateExpression(collectionExpr, context);

    // Find matching @end
    const { endIndex, blockContent } = this.extractDirectiveBlock(lines, startIndex + 1, '@end');

    // Execute repeat directive
    const repeatInput = {
      collection,
      templateContent: blockContent.join('\n')
    };

    const repeatResult = await this.repeatDirective.executeTemplate(context, repeatInput, repeatInput.templateContent);
    
    if (!repeatResult.success) {
      throw new Error(`@repeat directive failed: ${repeatResult.error?.message}`);
    }

    return {
      nextIndex: endIndex + 1,
      renderedContent: repeatResult.value || ''
    };
  }

  /**
   * Process @if directive block with optional @else
   */
  private async processIfDirective(
    lines: string[],
    startIndex: number,
    context: any,
    directivesProcessed: string[]
  ): Promise<{ nextIndex: number; renderedContent: string }> {
    const ifLine = lines[startIndex].trim();
    
    // Parse if expression: "@if <condition>"
    const ifMatch = ifLine.match(/^@if\s+(.+)$/);
    if (!ifMatch) {
      throw new Error(`Invalid @if syntax: ${ifLine}`);
    }

    const conditionExpr = ifMatch[1];
    const condition = this.evaluateExpression(conditionExpr, context);

    // Find @else or @end
    const { endIndex, blockContent, elseContent } = this.extractIfElseBlock(lines, startIndex + 1);

    // Execute if directive
    const ifInput = {
      condition,
      templateContent: blockContent.join('\n')
    };

    // Create conditional context
    const conditionalContext = {
      ...context,
      conditionalContext: {
        conditionMet: Boolean(condition),
        elseAllowed: !Boolean(condition),
        branchExecuted: Boolean(condition)
      }
    };

    const ifResult = await this.ifDirective.executeTemplate(conditionalContext, ifInput, ifInput.templateContent);
    
    if (!ifResult.success) {
      throw new Error(`@if directive failed: ${ifResult.error?.message}`);
    }

    let renderedContent = ifResult.value || '';

    // Execute @else if condition was false and else content exists
    if (!condition && elseContent.length > 0) {
      const elseInput = {
        templateContent: elseContent.join('\n')
      };

      const elseContext = {
        ...context,
        conditionalContext: {
          conditionMet: false,
          elseAllowed: true,
          branchExecuted: false
        }
      };

      const elseResult = await this.elseDirective.executeTemplate(elseContext, elseInput, elseInput.templateContent);
      
      if (elseResult.success) {
        renderedContent = elseResult.value || '';
        directivesProcessed.push('@else');
      }
    }

    return {
      nextIndex: endIndex + 1,
      renderedContent
    };
  }

  /**
   * Extract directive block content between start and @end
   */
  private extractDirectiveBlock(
    lines: string[],
    startIndex: number,
    endKeyword: string
  ): { endIndex: number; blockContent: string[] } {
    const blockContent: string[] = [];
    let nestLevel = 1;
    let i = startIndex;

    while (i < lines.length && nestLevel > 0) {
      const line = lines[i].trim();
      
      if (line.startsWith('@repeat ') || line.startsWith('@if ')) {
        nestLevel++;
        blockContent.push(lines[i]);
      } else if (line === endKeyword) {
        nestLevel--;
        if (nestLevel > 0) {
          blockContent.push(lines[i]);
        }
      } else {
        blockContent.push(lines[i]);
      }
      
      i++;
    }

    return {
      endIndex: i - 1,
      blockContent
    };
  }

  /**
   * Extract if/else block with proper @else handling
   */
  private extractIfElseBlock(
    lines: string[],
    startIndex: number
  ): { endIndex: number; blockContent: string[]; elseContent: string[] } {
    const blockContent: string[] = [];
    const elseContent: string[] = [];
    let nestLevel = 1;
    let i = startIndex;
    let inElse = false;

    while (i < lines.length && nestLevel > 0) {
      const line = lines[i].trim();
      
      if (line.startsWith('@if ')) {
        nestLevel++;
      } else if (line === '@else' && nestLevel === 1) {
        inElse = true;
        i++;
        continue;
      } else if (line === '@end') {
        nestLevel--;
        if (nestLevel === 0) break;
      }
      
      if (inElse) {
        elseContent.push(lines[i]);
      } else {
        blockContent.push(lines[i]);
      }
      
      i++;
    }

    return {
      endIndex: i,
      blockContent,
      elseContent
    };
  }

  /**
   * Process variable interpolation in content
   */
  private processVariableInterpolation(content: string, context: any): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        const trimmedExpr = expression.trim();
        
        if (trimmedExpr.startsWith('unescaped ')) {
          // Unescaped expression
          const varName = trimmedExpr.substring('unescaped '.length).trim();
          const value = this.evaluateExpression(varName, context);
          return String(value || '');
        } else {
          // HTML escaped expression (default)
          const value = this.evaluateExpression(trimmedExpr, context);
          return this.escapeHtml(String(value || ''));
        }
      } catch (error) {
        console.warn(`Template interpolation error for ${expression}:`, error);
        return match; // Return original if evaluation fails
      }
    });
  }

  /**
   * Evaluate expression in context
   */
  private evaluateExpression(expression: string, context: any): unknown {
    // Handle literals
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    if (expression === 'null') return null;
    if (expression === 'undefined') return undefined;
    
    // Handle numbers
    const num = Number(expression);
    if (!isNaN(num)) return num;
    
    // Handle arrays
    if (expression.startsWith('[') && expression.endsWith(']')) {
      try {
        return JSON.parse(expression);
      } catch {
        // Fall through to variable resolution
      }
    }
    
    // Handle string literals
    if ((expression.startsWith('"') && expression.endsWith('"')) ||
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }

    // Handle property access
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let current = this.resolveVariable(parts[0], context);
      
      for (let i = 1; i < parts.length && current != null; i++) {
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[parts[i]];
        } else {
          return undefined;
        }
      }
      
      return current;
    }
    
    // Simple variable resolution
    return this.resolveVariable(expression, context);
  }

  /**
   * Resolve variable from context
   */
  private resolveVariable(name: string, context: any): unknown {
    // Check locals first
    if (context.locals?.has(name)) {
      return context.locals.get(name);
    }
    
    // Check context variables
    if (name === 'me') return context.me;
    if (name === 'it') return context.it;
    if (name === 'you') return context.you;
    if (name === 'result') return context.result;
    
    // Check globals
    if (context.globals?.has(name)) {
      return context.globals.get(name);
    }
    
    return undefined;
  }

  /**
   * Extract variables referenced in content
   */
  private extractVariablesFromContent(content: string): string[] {
    const variables: Set<string> = new Set();
    const regex = /\$\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const expression = match[1].trim();
      
      // Extract base variable name
      if (expression.includes('.')) {
        variables.add(expression.split('.')[0]);
      } else if (expression.startsWith('unescaped ')) {
        const varName = expression.substring('unescaped '.length).trim();
        if (varName.includes('.')) {
          variables.add(varName.split('.')[0]);
        } else {
          variables.add(varName);
        }
      } else {
        variables.add(expression);
      }
    }
    
    return Array.from(variables);
  }

  /**
   * Parse variables from command line syntax like "(x: x)" or "data"
   */
  private parseVariables(variableExpr: string, context: any): Record<string, unknown> {
    // Handle parenthetical syntax: "(x: x, y: y)"
    if (variableExpr.startsWith('(') && variableExpr.endsWith(')')) {
      const inner = variableExpr.slice(1, -1);
      const pairs = inner.split(',').map(pair => pair.trim());
      const variables: Record<string, unknown> = {};
      
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
          const key = pair.substring(0, colonIndex).trim();
          const value = pair.substring(colonIndex + 1).trim();
          variables[key] = this.resolveVariable(value, context);
        }
      }
      
      return variables;
    }
    
    // Handle simple variable reference: "data"
    const resolved = this.resolveVariable(variableExpr, context);
    if (resolved && typeof resolved === 'object') {
      return resolved as Record<string, unknown>;
    }
    
    return {};
  }

  /**
   * HTML escape utility
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * Factory function to create the enhanced render command
 */
export function createEnhancedRenderCommand(): EnhancedRenderCommand {
  return new EnhancedRenderCommand();
}

export default EnhancedRenderCommand;