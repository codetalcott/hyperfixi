/**
 * Fixed Template Processor - handles line breaks and directives properly
 * Replaces the complex compiler/executor approach with a simpler direct processor
 */

import type { ExecutionContext } from '../../types/core.js';

export interface TemplateSection {
  type: 'content' | 'repeat' | 'if';
  content: string;
  condition?: string;
  variable?: string;
  children?: TemplateSection[];
  elseChildren?: TemplateSection[];
}

export class FixedTemplateProcessor {
  
  /**
   * Process template with proper line break and directive handling
   */
  async processTemplate(template: string, context: ExecutionContext): Promise<string> {
    const sections = this.parseTemplate(template);
    const result = await this.renderSections(sections, context);
    return result;
  }

  /**
   * Parse template into structured sections
   */
  private parseTemplate(template: string): TemplateSection[] {
    const lines = template.split('\n');
    return this.parseLines(lines, 0, lines.length).sections;
  }

  /**
   * Parse lines into sections recursively
   */
  private parseLines(lines: string[], start: number, end: number): { sections: TemplateSection[]; nextIndex: number } {
    const sections: TemplateSection[] = [];
    let i = start;

    while (i < end) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('@repeat ')) {
        const repeatMatch = trimmed.match(/^@repeat in (.+)$/);
        if (repeatMatch) {
          const variable = repeatMatch[1];
          const { sections: children, nextIndex } = this.parseLines(lines, i + 1, end);
          sections.push({
            type: 'repeat',
            content: '',
            variable,
            children
          });
          i = nextIndex;
        } else {
          i++;
        }
      } else if (trimmed.startsWith('@if ')) {
        const ifMatch = trimmed.match(/^@if (.+)$/);
        if (ifMatch) {
          const condition = ifMatch[1];
          const ifBlock = this.parseIfBlock(lines, i);
          sections.push({
            type: 'if',
            content: '',
            condition,
            children: ifBlock.ifChildren,
            elseChildren: ifBlock.elseChildren
          });
          i = ifBlock.nextIndex;
        } else {
          i++;
        }
      } else if (trimmed === '@end') {
        return { sections, nextIndex: i + 1 };
      } else if (trimmed === '@else') {
        // @else should only be encountered within @if blocks
        return { sections, nextIndex: i };
      } else if (trimmed.startsWith('@set ')) {
        // Skip @set processing here (will be handled during rendering)
        i++;
      } else {
        // Regular content line
        sections.push({
          type: 'content',
          content: line,
        });
        i++;
      }
    }

    return { sections, nextIndex: i };
  }

  /**
   * Parse @if/@else/@end block properly
   */
  private parseIfBlock(lines: string[], startIndex: number): {
    ifChildren: TemplateSection[];
    elseChildren?: TemplateSection[];
    nextIndex: number;
  } {
    let i = startIndex + 1; // Skip the @if line
    let elseIndex = -1;
    let endIndex = -1;
    let nestLevel = 1;

    // Find @else and @end positions
    while (i < lines.length && nestLevel > 0) {
      const trimmed = lines[i].trim();
      
      if (trimmed.startsWith('@if ')) {
        nestLevel++;
      } else if (trimmed === '@else' && nestLevel === 1) {
        elseIndex = i;
      } else if (trimmed === '@end') {
        nestLevel--;
        if (nestLevel === 0) {
          endIndex = i;
        }
      }
      i++;
    }

    // Parse if section
    const ifEndIndex = elseIndex >= 0 ? elseIndex : endIndex;
    const ifChildren = this.parseLines(lines, startIndex + 1, ifEndIndex).sections;

    // Parse else section if present
    let elseChildren: TemplateSection[] | undefined;
    if (elseIndex >= 0) {
      elseChildren = this.parseLines(lines, elseIndex + 1, endIndex).sections;
    }

    return {
      ifChildren,
      elseChildren,
      nextIndex: endIndex + 1
    };
  }

  /**
   * Render sections to final output
   */
  private async renderSections(sections: TemplateSection[], context: ExecutionContext): Promise<string> {
    const results: string[] = [];

    for (const section of sections) {
      if (section.type === 'content') {
        const processed = this.processInterpolation(section.content, context);
        results.push(processed);
      } else if (section.type === 'repeat' && section.variable && section.children) {
        const repeatResult = await this.renderRepeat(section.variable, section.children, context);
        if (repeatResult !== '') {
          results.push(repeatResult);
        }
      } else if (section.type === 'if' && section.condition && section.children) {
        const ifResult = await this.renderIf(section.condition, section.children, section.elseChildren, context);
        if (ifResult !== '') {
          results.push(ifResult);
        }
      }
    }

    return results.join('\n');
  }

  /**
   * Render @repeat directive
   */
  private async renderRepeat(variable: string, children: TemplateSection[], context: ExecutionContext): Promise<string> {
    const array = this.resolveVariable(variable, context);
    if (!Array.isArray(array)) {
      console.warn('Repeat variable is not an array:', variable);
      return '';
    }

    if (array.length === 0) {
      return '';
    }

    const results: string[] = [];
    for (const item of array) {
      // Create iteration context
      const iterContext = {
        ...context,
        locals: new Map(context.locals),
        it: item
      };
      iterContext.locals?.set('it', item);

      // Render children with iteration context
      const childResult = await this.renderSections(children, iterContext);
      results.push(childResult);
    }

    return results.join('\n');
  }

  /**
   * Render @if directive with @else support
   */
  private async renderIf(condition: string, ifChildren: TemplateSection[], elseChildren: TemplateSection[] | undefined, context: ExecutionContext): Promise<string> {
    const conditionValue = this.evaluateCondition(condition, context);
    
    if (conditionValue) {
      // Render the if part
      return await this.renderSections(ifChildren, context);
    } else if (elseChildren) {
      // Render the else part
      return await this.renderSections(elseChildren, context);
    } else {
      // No else block
      return '';
    }
  }

  /**
   * Process string interpolation (${variable})
   */
  private processInterpolation(content: string, context: ExecutionContext): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const trimmed = expression.trim();
      
      if (trimmed.startsWith('unescaped ')) {
        const varName = trimmed.substring('unescaped '.length).trim();
        const value = this.resolveVariable(varName, context);
        return this.valueToString(value);
      } else {
        const value = this.resolveVariable(trimmed, context);
        return this.escapeHtml(this.valueToString(value));
      }
    });
  }

  /**
   * Resolve variable from context
   */
  private resolveVariable(name: string, context: ExecutionContext): any {
    // Check for array literals like [1, 2, 3]
    if (name.startsWith('[') && name.endsWith(']')) {
      try {
        return JSON.parse(name);
      } catch {
        return [];
      }
    }

    // Check context variables
    if (name === 'it') return context.it;
    if (context.locals?.has(name)) return context.locals.get(name);
    if (context.globals?.has(name)) return context.globals.get(name);
    if (context.variables?.has(name)) return context.variables.get(name);
    
    return undefined;
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(condition: string, context: ExecutionContext): boolean {
    // Handle boolean literals directly
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Handle numeric literals  
    if (/^\d+$/.test(condition)) {
      return parseInt(condition, 10) !== 0;
    }
    
    // Handle string literals
    if ((condition.startsWith('"') && condition.endsWith('"')) ||
        (condition.startsWith("'") && condition.endsWith("'"))) {
      const str = condition.slice(1, -1);
      return str.length > 0;
    }
    
    // Resolve as variable
    const value = this.resolveVariable(condition, context);
    return Boolean(value);
  }

  /**
   * Process @set command
   */
  private async processSetCommand(command: string, context: ExecutionContext): Promise<void> {
    const match = command.match(/^(\w+)\s+to\s+(.+)$/);
    if (match) {
      const [, varName, expression] = match;
      const value = this.resolveVariable(expression, context);
      if (!context.locals) context.locals = new Map();
      context.locals.set(varName, value);
    }
  }

  /**
   * Convert value to string with proper null/undefined handling
   */
  private valueToString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    return String(value);
  }

  /**
   * Escape HTML content
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}