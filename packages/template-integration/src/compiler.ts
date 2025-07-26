import {
  ComponentDefinition,
  ComponentRegistry,
  createRegistry,
  validateComponent,
  extractTemplateVariables,
  generateMetadata,
} from '@hyperfixi/component-schema';

import {
  TemplateNode,
  TemplateOptions,
  TemplateContext,
  CompilationResult,
  CompilationWarning,
  HyperscriptBlock,
  ComponentInstance,
  TemplateError,
  DirectiveHandler,
} from './types';

import { TemplateParser } from './parser';

/**
 * Template compiler that processes parsed templates with component integration
 */
export class TemplateCompiler {
  private parser: TemplateParser;
  private registry: ComponentRegistry;
  private directives: Map<string, DirectiveHandler> = new Map();
  private options: TemplateOptions;

  constructor(options: TemplateOptions = {}) {
    this.options = {
      minify: false,
      sourceMaps: false,
      target: 'browser',
      development: false,
      ...options,
    };

    this.parser = new TemplateParser(this.options);
    this.registry = createRegistry('memory');

    // Register built-in directives
    this.registerBuiltinDirectives();
  }

  /**
   * Compile template string to executable code
   */
  async compile(template: string, options?: TemplateOptions): Promise<CompilationResult> {
    const startTime = performance.now();
    const compileOptions = { ...this.options, ...options };
    
    try {
      // Parse template into AST
      const parseStartTime = performance.now();
      const nodes = this.parser.parse(template);
      const parseTime = performance.now() - parseStartTime;

      // Extract hyperscript blocks
      const hyperscriptBlocks = this.parser.extractHyperscriptBlocks(nodes);

      // Process nodes and compile
      const compilationContext = {
        variables: new Set<string>(),
        components: new Map<string, ComponentDefinition>(),
        css: new Set<string>(),
        javascript: new Set<string>(),
        warnings: [] as CompilationWarning[],
      };

      const compiledHtml = await this.compileNodes(nodes, compilationContext);
      const compiledHyperscript = await this.compileHyperscript(hyperscriptBlocks, compilationContext);

      const compileTime = performance.now() - parseTime - parseStartTime;
      const totalTime = performance.now() - startTime;

      return {
        html: compileOptions.minify ? this.minifyHtml(compiledHtml) : compiledHtml,
        hyperscript: compiledHyperscript,
        components: Array.from(compilationContext.components.values()),
        css: Array.from(compilationContext.css),
        javascript: Array.from(compilationContext.javascript),
        variables: Array.from(compilationContext.variables),
        warnings: compilationContext.warnings,
        performance: {
          parseTime,
          compileTime,
          totalTime,
        },
      };

    } catch (error) {
      if (error instanceof TemplateError) {
        throw error;
      }

      const templateError = new Error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`) as TemplateError;
      templateError.type = 'compile';
      throw templateError;
    }
  }

  /**
   * Render compiled template with context
   */
  async render(compiled: CompilationResult, context: TemplateContext = {}): Promise<string> {
    let html = compiled.html;

    // Substitute template variables
    if (context.variables) {
      html = this.substituteVariables(html, context.variables);
    }

    // Process component instances
    for (const component of compiled.components) {
      html = await this.renderComponentInstances(html, component, context);
    }

    return html;
  }

  /**
   * Register component in the compiler's registry
   */
  async registerComponent(component: ComponentDefinition): Promise<void> {
    const validation = validateComponent(component);
    if (!validation.valid) {
      throw new Error(`Invalid component: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    await this.registry.register(component);
  }

  /**
   * Add custom directive handler
   */
  addDirective(name: string, handler: DirectiveHandler): void {
    this.directives.set(name, handler);
  }

  /**
   * Compile template nodes recursively
   */
  private async compileNodes(
    nodes: TemplateNode[], 
    context: CompilationContext
  ): Promise<string> {
    let html = '';

    for (const node of nodes) {
      html += await this.compileNode(node, context);
    }

    return html;
  }

  /**
   * Compile single template node
   */
  private async compileNode(
    node: TemplateNode, 
    context: CompilationContext
  ): Promise<string> {
    switch (node.type) {
      case 'text':
        return this.escapeHtml(node.content || '');

      case 'element':
        return await this.compileElement(node, context);

      case 'directive':
        return await this.compileDirective(node, context);

      case 'component':
        return await this.compileComponent(node, context);

      case 'hyperscript':
        return await this.compileHyperscriptElement(node, context);

      default:
        context.warnings.push({
          type: 'invalid-hyperscript',
          message: `Unknown node type: ${node.type}`,
          ...(node.location && { location: node.location }),
        });
        return '';
    }
  }

  /**
   * Compile HTML element
   */
  private async compileElement(
    node: TemplateNode, 
    context: CompilationContext
  ): Promise<string> {
    if (!node.tagName) {
      return '';
    }

    let html = `<${node.tagName}`;

    // Add attributes
    if (node.attributes) {
      for (const [name, value] of Object.entries(node.attributes)) {
        // Skip directive attributes (they've been processed)
        if (this.isDirectiveAttribute(name)) {
          continue;
        }

        html += ` ${name}`;
        if (value) {
          html += `="${this.escapeAttribute(value)}"`;
        }
      }
    }

    // Check if self-closing
    if (this.isSelfClosingTag(node.tagName)) {
      html += ' />';
      return html;
    }

    html += '>';

    // Add children
    if (node.children) {
      html += await this.compileNodes(node.children, context);
    }

    html += `</${node.tagName}>`;
    return html;
  }

  /**
   * Compile template directive
   */
  private async compileDirective(
    node: TemplateNode, 
    context: CompilationContext
  ): Promise<string> {
    if (!node.directive) {
      return '';
    }

    const handler = this.directives.get(node.directive.name);
    if (!handler) {
      context.warnings.push({
        type: 'invalid-hyperscript',
        message: `Unknown directive: ${node.directive.name}`,
        ...(node.location && { location: node.location }),
      });
      return '';
    }

    try {
      const processedNodes = await handler.process(node.directive, {});
      return await this.compileNodes(processedNodes, context);
    } catch (error) {
      context.warnings.push({
        type: 'invalid-hyperscript',
        message: `Directive processing failed: ${error instanceof Error ? error.message : String(error)}`,
        ...(node.location && { location: node.location }),
      });
      return '';
    }
  }

  /**
   * Compile component instance
   */
  private async compileComponent(
    node: TemplateNode, 
    context: CompilationContext
  ): Promise<string> {
    if (!node.component) {
      return '';
    }

    const component = node.component;
    context.components.set(component.id, component);

    // Add component dependencies
    if (component.dependencies?.css) {
      component.dependencies.css.forEach(css => context.css.add(css));
    }

    if (component.dependencies?.javascript) {
      component.dependencies.javascript.forEach(js => context.javascript.add(js));
    }

    // Extract template variables
    const variables = extractTemplateVariables(component.hyperscript, component.template?.html);
    variables.forEach(variable => context.variables.add(variable));

    // Render component template
    let html = component.template?.html || '';

    // Process component children
    if (node.children) {
      const childrenHtml = await this.compileNodes(node.children, context);
      html = html.replace(/\{\{children\}\}/g, childrenHtml);
    }

    return html;
  }

  /**
   * Compile element with hyperscript
   */
  private async compileHyperscriptElement(
    node: TemplateNode, 
    context: CompilationContext
  ): Promise<string> {
    // Process hyperscript and extract variables
    if (node.hyperscript) {
      const code = Array.isArray(node.hyperscript) 
        ? node.hyperscript.join(' ') 
        : node.hyperscript;

      const variables = extractTemplateVariables(code);
      variables.forEach(variable => context.variables.add(variable));
    }

    // Compile as regular element
    return await this.compileElement(node, context);
  }

  /**
   * Compile hyperscript blocks
   */
  private async compileHyperscript(
    blocks: HyperscriptBlock[], 
    context: CompilationContext
  ): Promise<string[]> {
    const compiled: string[] = [];

    for (const block of blocks) {
      try {
        // Add variables to context
        block.variables.forEach(variable => context.variables.add(variable));

        // Add component dependencies
        for (const componentId of block.components) {
          const component = await this.registry.get(componentId);
          if (component) {
            context.components.set(componentId, component);
          } else {
            context.warnings.push({
              type: 'missing-component',
              message: `Component not found: ${componentId}`,
              ...(block.location && { location: block.location }),
            });
          }
        }

        // For now, just pass through the hyperscript code
        // In a full implementation, this would compile to JavaScript
        compiled.push(block.code);

      } catch (error) {
        context.warnings.push({
          type: 'invalid-hyperscript',
          message: `Failed to compile hyperscript: ${error instanceof Error ? error.message : String(error)}`,
          ...(block.location && { location: block.location }),
        });
      }
    }

    return compiled;
  }

  /**
   * Substitute template variables in HTML
   */
  private substituteVariables(html: string, variables: Record<string, any>): string {
    let result = html;

    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
      const stringValue = this.valueToString(value);
      result = result.replace(pattern, stringValue);
    }

    return result;
  }

  /**
   * Render component instances in HTML
   */
  private async renderComponentInstances(
    html: string, 
    component: ComponentDefinition, 
    context: TemplateContext
  ): Promise<string> {
    const componentPattern = new RegExp(`<${component.id}([^>]*)>([\\s\\S]*?)<\\/${component.id}>`, 'g');
    
    return html.replace(componentPattern, (match, attributes, content) => {
      // Parse component attributes for variable values
      const instanceVariables = this.parseComponentAttributes(attributes);
      
      // Merge with context variables
      const mergedVariables = { ...context.variables, ...instanceVariables };

      // Substitute variables in component template
      let componentHtml = component.template?.html || '';
      componentHtml = this.substituteVariables(componentHtml, mergedVariables);

      // Replace content slot
      componentHtml = componentHtml.replace(/\{\{children\}\}/g, content);

      return componentHtml;
    });
  }

  /**
   * Parse component attributes for variables
   */
  private parseComponentAttributes(attributeString: string): Record<string, any> {
    const variables: Record<string, any> = {};
    const attrPattern = /(\w+)=["']([^"']+)["']/g;

    let match;
    while ((match = attrPattern.exec(attributeString)) !== null) {
      const [, name, value] = match;
      variables[name] = this.parseAttributeValue(value);
    }

    return variables;
  }

  /**
   * Parse attribute value to appropriate type
   */
  private parseAttributeValue(value: string): any {
    // Try to parse as JSON first
    if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || /^\d+$/.test(value)) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to string
      }
    }

    return value;
  }

  /**
   * Convert value to string for template substitution
   */
  private valueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return this.escapeHtml(value);
    }

    if (typeof value === 'object') {
      return this.escapeHtml(JSON.stringify(value));
    }

    return this.escapeHtml(String(value));
  }

  /**
   * Register built-in directive handlers
   */
  private registerBuiltinDirectives(): void {
    // If directive
    // Helper function for expression evaluation
    const evaluateExpression = (expr: string, context: TemplateContext): boolean => {
      // Basic expression evaluation (would be more sophisticated in practice)
      if (context.variables && expr in context.variables) {
        return Boolean(context.variables[expr]);
      }
      return false;
    };

    this.addDirective('if', {
      async process(directive, context) {
        // Simple conditional logic
        const condition = evaluateExpression(directive.expression, context);
        if (condition) {
          return directive.children || [];
        }
        return [];
      }
    });

    // Component directive
    const registry = this.registry; // Capture registry in closure
    this.addDirective('component', {
      async process(directive, context) {
        const componentId = directive.expression;
        const component = await registry.get(componentId);
        
        if (!component) {
          return [];
        }

        return [{
          type: 'component' as const,
          component,
          children: directive.children || [],
        }];
      }
    });
  }

  /**
   * Utility methods
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, char => htmlEscapes[char] ?? char);
  }

  private escapeAttribute(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private isDirectiveAttribute(name: string): boolean {
    const directivePatterns = [
      /^v-/,    // Vue-style
      /^x-/,    // Alpine-style
      /^hf-/,   // HyperFixi-style
      /^_$/,    // Hyperscript attribute
      /^data-hyperscript$/,
      /^hx-script$/,
    ];

    return directivePatterns.some(pattern => pattern.test(name));
  }

  private isSelfClosingTag(tagName: string): boolean {
    const selfClosingTags = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return selfClosingTags.includes(tagName.toLowerCase());
  }

  private minifyHtml(html: string): string {
    return html
      .replace(/\\s+/g, ' ')              // Collapse whitespace
      .replace(/> </g, '><')             // Remove space between tags
      .replace(/^\\s+|\\s+$/g, '')       // Trim
      .replace(/<!--[\\s\\S]*?-->/g, ''); // Remove comments
  }
}

interface CompilationContext {
  variables: Set<string>;
  components: Map<string, ComponentDefinition>;
  css: Set<string>;
  javascript: Set<string>;
  warnings: CompilationWarning[];
}