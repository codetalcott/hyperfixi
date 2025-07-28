/**
 * Enhanced Render Command Implementation
 * Processes HTML template elements with data interpolation and hyperscript directives
 * 
 * Syntax: render <template> [with <data>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';
import type { UnifiedValidationResult } from '../../types/unified-types';

// Input type definition
export interface RenderCommandInput {
  template: string | HTMLTemplateElement; // Template to render
  data?: any; // Data context for interpolation
  withKeyword?: 'with'; // Syntax support
}

// Output type definition
export interface RenderCommandOutput {
  element: HTMLElement;
  template: string;
  data?: any;
  rendered: boolean;
  interpolated: boolean;
}

/**
 * Enhanced Render Command with full type safety and validation
 */
export class EnhancedRenderCommand implements TypedCommandImplementation<
  RenderCommandInput,
  RenderCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'render',
    description: 'The render command processes HTML template elements with optional data interpolation and hyperscript directives. It creates DOM elements from templates.',
    examples: [
      'render <#userTemplate/>',
      'render <#listTemplate/> with users',
      'render myTemplate with { name: "John", age: 30 }',
      'render <template/> with data'
    ],
    syntax: 'render <template> [with <data>]',
    category: 'templates' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): UnifiedValidationResult<RenderCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Render command requires a template',
            suggestions: ['Provide template element or selector']
          }],
          suggestions: ['Provide template element or selector']
        };
      }

      const inputObj = input as any;

      if (!inputObj.template) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Render command requires a template argument',
            suggestions: ['Provide template element or CSS selector']
          }],
          suggestions: ['Provide template element or CSS selector']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          template: inputObj.template,
          data: inputObj.data,
          withKeyword: inputObj.withKeyword
        }
      };
    }
  };

  async execute(
    input: RenderCommandInput,
    context: TypedExecutionContext
  ): Promise<RenderCommandOutput> {
    const { template, data } = input;

    // Resolve template element
    const templateElement = await this.resolveTemplate(template, context);
    if (!templateElement) {
      throw new Error(`Template not found: ${template}`);
    }

    // Clone template content
    const content = templateElement.content?.cloneNode(true) as DocumentFragment;
    if (!content) {
      throw new Error('Template has no content to render');
    }

    let interpolated = false;

    // Perform data interpolation if data is provided
    if (data) {
      interpolated = this.interpolateData(content, data);
    }

    // Create wrapper element for the rendered content
    const wrapper = document.createElement('div');
    wrapper.appendChild(content);

    // Get the first element child as the result
    const renderedElement = wrapper.firstElementChild as HTMLElement || wrapper;

    // Set the result in context
    context.it = renderedElement;

    return {
      element: renderedElement,
      template: typeof template === 'string' ? template : template.id || 'template',
      data,
      rendered: true,
      interpolated
    };
  }

  private async resolveTemplate(
    template: string | HTMLTemplateElement,
    context: TypedExecutionContext
  ): Promise<HTMLTemplateElement | null> {
    if (template instanceof HTMLTemplateElement) {
      return template;
    }

    if (typeof template === 'string') {
      const trimmed = template.trim();
      
      // Handle context references
      if (trimmed === 'it' && context.it instanceof HTMLTemplateElement) {
        return context.it;
      }

      // Handle CSS selector
      if (typeof document !== 'undefined') {
        try {
          const found = document.querySelector(trimmed);
          return found instanceof HTMLTemplateElement ? found : null;
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  private interpolateData(content: DocumentFragment, data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    let interpolated = false;
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        const interpolatedText = this.interpolateText(textContent, data);
        if (interpolatedText !== textContent) {
          node.textContent = interpolatedText;
          interpolated = true;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Interpolate attributes
        for (const attr of Array.from(element.attributes)) {
          const interpolatedValue = this.interpolateText(attr.value, data);
          if (interpolatedValue !== attr.value) {
            attr.value = interpolatedValue;
            interpolated = true;
          }
        }
      }
    }

    return interpolated;
  }

  private interpolateText(text: string, data: any): string {
    // Simple template interpolation: {{property}} or ${property}
    return text.replace(/\{\{([^}]+)\}\}|\$\{([^}]+)\}/g, (match, prop1, prop2) => {
      const prop = (prop1 || prop2).trim();
      
      // Handle nested properties like user.name
      const value = this.getNestedProperty(data, prop);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedProperty(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}

/**
 * Factory function to create the enhanced render command
 */
export function createEnhancedRenderCommand(): EnhancedRenderCommand {
  return new EnhancedRenderCommand();
}

export default EnhancedRenderCommand;