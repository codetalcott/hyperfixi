/**
 * RenderCommand - Standalone V2 Implementation
 *
 * Renders templates with @if, @else, and @repeat directives
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining template directive logic.
 *
 * Features:
 * - Template content extraction
 * - Variable interpolation (${variable})
 * - @if/@else conditional rendering
 * - @repeat iteration
 * - HTML escaping
 * - Template context management
 *
 * Syntax:
 *   render <template>
 *   render <template> with <variables>
 *   render <template> with (key: value, ...)
 *
 * @example
 *   render myTemplate
 *   render myTemplate with (name: "Alice", items: [1,2,3])
 *   render "<template>Hello ${name}!</template>" with (name: "World")
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for RenderCommand
 */
export interface RenderCommandInput {
  /** Template element or string */
  template: unknown;
  /** Variables to pass to template context */
  variables?: Record<string, unknown>;
}

/**
 * Output from render command execution
 */
export interface RenderCommandOutput {
  element: Element | null;
  rendered: string;
  directivesProcessed: string[];
}

/**
 * RenderCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining directive logic.
 *
 * V1 Size: 776 lines
 * V2 Target: ~420 lines (inline directives, standalone)
 */
export class RenderCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'render';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Render templates with @if, @else, and @repeat directives',
    syntax: [
      'render <template>',
      'render <template> with <variables>',
      'render <template> with (key: value, ...)',
    ],
    examples: [
      'render myTemplate',
      'render myTemplate with (name: "Alice")',
      'render "<template>Hello ${name}!</template>" with (name: "World")',
      'render template with (items: data)',
    ],
    category: 'templates',
    sideEffects: ['dom-creation', 'template-execution'],
  } as const;

  /**
   * Instance accessor for metadata (backward compatibility)
   */
  get metadata() {
    return RenderCommand.metadata;
  }

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RenderCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('render command requires a template');
    }

    // First arg is template
    const template = await evaluator.evaluate(raw.args[0], context);

    // Optional: "with <variables>" (args[1] = 'with', args[2] = variables)
    let variables: Record<string, unknown> | undefined;

    if (raw.args.length >= 3) {
      const withKeyword = await evaluator.evaluate(raw.args[1], context);
      if (withKeyword === 'with') {
        const vars = await evaluator.evaluate(raw.args[2], context);
        if (vars && typeof vars === 'object') {
          variables = vars as Record<string, unknown>;
        }
      }
    }

    // Check "with" modifier
    if (!variables && raw.modifiers?.with) {
      const vars = await evaluator.evaluate(raw.modifiers.with, context);
      if (vars && typeof vars === 'object') {
        variables = vars as Record<string, unknown>;
      }
    }

    return {
      template,
      variables,
    };
  }

  /**
   * Execute the render command
   *
   * Renders template with variables and directives.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Rendered DOM element
   */
  async execute(
    input: RenderCommandInput,
    context: TypedExecutionContext
  ): Promise<RenderCommandOutput> {
    const { template, variables = {} } = input;

    // Extract template content
    const templateContent = this.extractTemplateContent(template, context);

    // Create template context with variables
    const templateContext = this.createTemplateContext(context, variables);

    // Process template with directives
    const directivesProcessed: string[] = [];
    const rendered = await this.processTemplate(
      templateContent,
      templateContext,
      directivesProcessed
    );

    // Create DOM element from rendered content
    const resultElement = this.createDOMElement(rendered);

    // Set result in context for chaining
    Object.assign(context, { it: resultElement });

    return {
      element: resultElement,
      rendered,
      directivesProcessed,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Extract content from template
   *
   * @param template - Template element or string
   * @param context - Execution context
   * @returns Template content string
   */
  private extractTemplateContent(template: unknown, context: TypedExecutionContext): string {
    // Handle HTMLTemplateElement
    if (template instanceof HTMLTemplateElement) {
      return template.innerHTML;
    }

    // Handle string template
    if (typeof template === 'string') {
      let templateStr: string = template;

      // If it's a variable name, try to resolve from context
      if (!templateStr.includes('<') && !templateStr.includes('$')) {
        const resolved = this.resolveVariable(templateStr, context);
        if (resolved instanceof HTMLTemplateElement) {
          return resolved.innerHTML;
        }
        if (typeof resolved === 'string') {
          templateStr = resolved;
        }
      }

      // Extract content from <template> tags if present
      const templateMatch = templateStr.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      if (templateMatch) {
        return templateMatch[1];
      }

      return templateStr;
    }

    // Handle object with innerHTML
    if (template && typeof template === 'object' && 'innerHTML' in template) {
      return (template as any).innerHTML;
    }

    throw new Error('Invalid template format');
  }

  /**
   * Create template execution context
   *
   * @param context - Execution context
   * @param variables - Template variables
   * @returns Template context
   */
  private createTemplateContext(
    context: TypedExecutionContext,
    variables: Record<string, unknown>
  ): any {
    return {
      ...context,
      locals: new Map([...Array.from(context.locals.entries()), ...Object.entries(variables)]),
    };
  }

  /**
   * Process template with directives
   *
   * @param content - Template content
   * @param context - Template context
   * @param directivesProcessed - Array to track processed directives
   * @returns Rendered content
   */
  private async processTemplate(
    content: string,
    context: any,
    directivesProcessed: string[]
  ): Promise<string> {
    const lines = content.split('\n');
    const result: string[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();

      if (line.startsWith('@repeat ')) {
        // Process @repeat directive
        const { nextIndex, rendered } = await this.processRepeatDirective(lines, i, context);
        result.push(rendered);
        i = nextIndex;
        directivesProcessed.push('@repeat');
      } else if (line.startsWith('@if ')) {
        // Process @if directive
        const { nextIndex, rendered } = await this.processIfDirective(
          lines,
          i,
          context,
          directivesProcessed
        );
        result.push(rendered);
        i = nextIndex;
        directivesProcessed.push('@if');
      } else if (line === '@else' || line === '@end') {
        // Skip - handled by directive processing
        i++;
      } else {
        // Regular content line with variable interpolation
        const processed = this.processVariableInterpolation(line, context);
        result.push(processed);
        i++;
      }
    }

    return result.join('\n');
  }

  /**
   * Process @repeat directive
   *
   * @param lines - Template lines
   * @param startIndex - Start index
   * @param context - Template context
   * @returns Next index and rendered content
   */
  private async processRepeatDirective(
    lines: string[],
    startIndex: number,
    context: any
  ): Promise<{ nextIndex: number; rendered: string }> {
    const repeatLine = lines[startIndex].trim();

    // Parse: "@repeat in <collection>"
    const match = repeatLine.match(/^@repeat\s+in\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid @repeat syntax: ${repeatLine}`);
    }

    const collectionExpr = match[1];
    const collection = this.evaluateExpression(collectionExpr, context);

    // Find matching @end
    const { endIndex, blockContent } = this.extractDirectiveBlock(lines, startIndex + 1);

    // Execute repeat for each item
    const results: string[] = [];
    if (Array.isArray(collection)) {
      for (const item of collection) {
        // Create iteration context with item
        const iterationContext = {
          ...context,
          locals: new Map([...context.locals.entries(), ['it', item]]),
        };

        // Process block content for this item
        const rendered = await this.processTemplate(blockContent.join('\n'), iterationContext, []);
        results.push(rendered);
      }
    }

    return {
      nextIndex: endIndex + 1,
      rendered: results.join('\n'),
    };
  }

  /**
   * Process @if directive with optional @else
   *
   * @param lines - Template lines
   * @param startIndex - Start index
   * @param context - Template context
   * @param directivesProcessed - Directives tracker
   * @returns Next index and rendered content
   */
  private async processIfDirective(
    lines: string[],
    startIndex: number,
    context: any,
    directivesProcessed: string[]
  ): Promise<{ nextIndex: number; rendered: string }> {
    const ifLine = lines[startIndex].trim();

    // Parse: "@if <condition>"
    const match = ifLine.match(/^@if\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid @if syntax: ${ifLine}`);
    }

    const conditionExpr = match[1];
    const condition = Boolean(this.evaluateExpression(conditionExpr, context));

    // Find @else or @end
    const { endIndex, blockContent, elseContent } = this.extractIfElseBlock(lines, startIndex + 1);

    // Execute appropriate branch
    let rendered = '';
    if (condition) {
      // Execute if block
      rendered = await this.processTemplate(blockContent.join('\n'), context, []);
    } else if (elseContent.length > 0) {
      // Execute else block
      rendered = await this.processTemplate(elseContent.join('\n'), context, []);
      directivesProcessed.push('@else');
    }

    return {
      nextIndex: endIndex + 1,
      rendered,
    };
  }

  /**
   * Extract directive block content
   *
   * @param lines - Template lines
   * @param startIndex - Start index
   * @returns End index and block content
   */
  private extractDirectiveBlock(
    lines: string[],
    startIndex: number
  ): { endIndex: number; blockContent: string[] } {
    const blockContent: string[] = [];
    let nestLevel = 1;
    let i = startIndex;

    while (i < lines.length && nestLevel > 0) {
      const line = lines[i].trim();

      if (line.startsWith('@repeat ') || line.startsWith('@if ')) {
        nestLevel++;
        blockContent.push(lines[i]);
      } else if (line === '@end') {
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
      blockContent,
    };
  }

  /**
   * Extract if/else block with @else handling
   *
   * @param lines - Template lines
   * @param startIndex - Start index
   * @returns End index, if block, and else block
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
      elseContent,
    };
  }

  /**
   * Process variable interpolation
   *
   * @param content - Content with ${variable} placeholders
   * @param context - Template context
   * @returns Processed content
   */
  private processVariableInterpolation(content: string, context: any): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        const trimmedExpr = expression.trim();

        // Handle unescaped expressions
        if (trimmedExpr.startsWith('unescaped ')) {
          const varName = trimmedExpr.substring('unescaped '.length).trim();
          const value = this.evaluateExpression(varName, context);
          return String(value || '');
        }

        // Default: HTML escaped
        const value = this.evaluateExpression(trimmedExpr, context);
        return this.escapeHtml(String(value || ''));
      } catch (error) {
        console.warn(`Template interpolation error for ${expression}:`, error);
        return match;
      }
    });
  }

  /**
   * Evaluate expression in context
   *
   * @param expression - Expression string
   * @param context - Template context
   * @returns Evaluated value
   */
  private evaluateExpression(expression: string, context: any): unknown {
    // Handle literals
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    if (expression === 'null') return null;
    if (expression === 'undefined') return undefined;

    // Handle numbers
    const num = Number(expression);
    if (!isNaN(num) && expression.trim() !== '') return num;

    // Handle arrays
    if (expression.startsWith('[') && expression.endsWith(']')) {
      try {
        return JSON.parse(expression);
      } catch {
        // Fall through
      }
    }

    // Handle string literals
    if (
      (expression.startsWith('"') && expression.endsWith('"')) ||
      (expression.startsWith("'") && expression.endsWith("'"))
    ) {
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
   *
   * @param name - Variable name
   * @param context - Template context
   * @returns Variable value
   */
  private resolveVariable(name: string, context: any): unknown {
    // Check locals
    if (context.locals?.has(name)) {
      return context.locals.get(name);
    }

    // Check context properties
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
   * HTML escape utility
   *
   * @param text - Text to escape
   * @returns Escaped HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Create DOM element from rendered HTML
   *
   * @param html - Rendered HTML
   * @returns DOM element
   */
  private createDOMElement(html: string): Element | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    // Return first child if only one element, otherwise return container
    return container.children.length === 1 ? container.firstElementChild : container;
  }
}

/**
 * Factory function to create RenderCommand instance
 */
export function createRenderCommand(): RenderCommand {
  return new RenderCommand();
}
