/**
 * Template Compiler - Two-Phase Template Processing
 * Based on official _hyperscript template.js implementation
 *
 * Phase 1: Compilation - converts templates to hyperscript commands
 * Phase 2: Execution - runs compiled commands in template context
 */

import type { ExecutionContext } from '../../types/core';

export interface CompiledTemplate {
  /** Hyperscript commands extracted from @ lines */
  commands: string[];
  /** Template content with interpolation expressions */
  content: string;
  /** Template result buffer append calls */
  contentCalls: string[];
  /** Original template for debugging */
  original: string;
}

export class TemplateCompiler {
  /**
   * Phase 1: Compile template into hyperscript commands and content calls
   */
  compileTemplate(template: string): CompiledTemplate {
    const lines = template.split('\n');
    const commands: string[] = [];
    const contentCalls: string[] = [];
    let processedContent = '';

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('@')) {
        // Handle @ directives
        if (trimmedLine.startsWith('@repeat ') || trimmedLine.startsWith('@if ')) {
          // Block directives - process entire block recursively
          const {
            commands: blockCommands,
            content: blockContent,
            nextIndex,
          } = this.processBlockDirective(lines, i);
          commands.push(...blockCommands);

          // Add content from within the block
          if (blockContent.trim()) {
            processedContent += blockContent + '\n';
          }

          i = nextIndex;
        } else if (trimmedLine.startsWith('@else') || trimmedLine.startsWith('@end')) {
          // Block control - add as command
          commands.push(trimmedLine.substring(1)); // Remove @
          i++;
        } else {
          // Standalone directive (like @set)
          const command = trimmedLine.substring(1); // Remove @
          commands.push(command);
          i++;
        }
      } else if (trimmedLine) {
        // Regular content line - process for template buffer
        const processedLine = this.processContentForBuffer(line);
        processedContent += processedLine + '\n';
        contentCalls.push(
          `call meta.__ht_template_result.push("${this.escapeForString(processedLine)}")`
        );
        i++;
      } else {
        // Empty line - preserve
        processedContent += '\n';
        i++;
      }
    }

    return {
      commands,
      content: processedContent.trim(),
      contentCalls,
      original: template,
    };
  }

  /**
   * Process block directives like @repeat and @if
   */
  private processBlockDirective(
    lines: string[],
    startIndex: number
  ): { commands: string[]; content: string; nextIndex: number } {
    const startLine = lines[startIndex].trim();
    const command = startLine.substring(1); // Remove @
    const commands: string[] = [command];

    // Find matching @end
    let endIndex = startIndex + 1;
    let nestLevel = 1;
    const blockType = startLine.split(' ')[0].substring(1); // 'repeat' or 'if'

    while (endIndex < lines.length && nestLevel > 0) {
      const line = lines[endIndex].trim();
      if (
        line.startsWith(`@${blockType}`) ||
        (blockType === 'if' && line.startsWith('@repeat')) ||
        (blockType === 'repeat' && line.startsWith('@if'))
      ) {
        nestLevel++;
      } else if (line === '@end') {
        nestLevel--;
      }
      endIndex++;
    }

    if (nestLevel > 0) {
      throw new Error(`Missing @end directive for @${blockType}`);
    }

    // Extract and recursively process content between start and end
    const contentLines = lines.slice(startIndex + 1, endIndex - 1);
    let processedContent = '';

    // Recursively process the block content to extract nested @ directives
    let i = 0;
    while (i < contentLines.length) {
      const line = contentLines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('@')) {
        if (trimmedLine.startsWith('@repeat ') || trimmedLine.startsWith('@if ')) {
          // Nested block directive
          const {
            commands: nestedCommands,
            content: nestedContent,
            nextIndex,
          } = this.processBlockDirective(contentLines, i);
          commands.push(...nestedCommands);
          processedContent += nestedContent + '\n';
          i = nextIndex;
        } else if (trimmedLine.startsWith('@else') || trimmedLine.startsWith('@end')) {
          // Control directive
          commands.push(trimmedLine.substring(1));
          i++;
        } else {
          // Standalone directive like @set
          commands.push(trimmedLine.substring(1));
          i++;
        }
      } else {
        // Regular content
        processedContent += this.processContentForBuffer(line) + '\n';
        i++;
      }
    }

    // Add closing @end command
    commands.push('end');

    return { commands, content: processedContent.trim(), nextIndex: endIndex };
  }

  /**
   * Process content lines for template interpolation and HTML escaping
   */
  private processContentForBuffer(content: string): string {
    // Handle ${} interpolation with automatic HTML escaping
    return content.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
      const trimmedExpr = expression.trim();

      // Check for "unescaped" prefix
      if (trimmedExpr.startsWith('unescaped ')) {
        const actualExpr = trimmedExpr.substring('unescaped '.length).trim();
        return `\${${actualExpr}}`;
      } else {
        // Automatic HTML escaping
        return `\${escape html ${trimmedExpr}}`;
      }
    });
  }

  /**
   * Escape string content for inclusion in hyperscript string literals
   */
  private escapeForString(content: string): string {
    return content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Phase 2: Create template execution context with result buffer
   */
  createTemplateExecutionContext(baseContext: ExecutionContext): ExecutionContext {
    const templateResultBuffer: string[] = [];

    return {
      ...baseContext,
      meta: {
        ...(baseContext.meta || {}),
        __ht_template_result: templateResultBuffer,
      },
    };
  }

  /**
   * Phase 2: Execute compiled template in template context
   */
  async executeCompiledTemplate(
    compiled: CompiledTemplate,
    templateContext: ExecutionContext
  ): Promise<string> {
    // For now, create a simple command executor for testing
    // TODO: Replace with proper hyperscript evaluator integration
    const buffer = templateContext.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return '';

    // Execute commands with basic interpretation for testing
    for (const command of compiled.commands) {
      try {
        await this.executeBasicCommand(command, templateContext);
      } catch (error) {
        console.warn(`Template command execution failed: ${command}`, error);
      }
    }

    // Add content directly to buffer for now
    if (compiled.content.trim()) {
      const processedContent = await this.processContentWithContext(
        compiled.content,
        templateContext
      );
      if (processedContent.trim()) {
        buffer.push(processedContent);
      }
    }

    // Join and return the template result buffer
    return buffer.join('');
  }

  /**
   * Basic command executor for testing (temporary implementation)
   */
  private async executeBasicCommand(command: string, context: ExecutionContext): Promise<void> {
    // Handle repeat command for testing
    if (command.startsWith('repeat in ')) {
      const arrayName = command.substring('repeat in '.length).trim();
      const array = context.locals?.get(arrayName);
      if (Array.isArray(array)) {
        // For testing, we need to simulate processing each item
        // This is simplified - real implementation would need proper loop handling
        const buffer = context.meta?.__ht_template_result;
        if (Array.isArray(buffer)) {
          // Process each item in the array
          for (const item of array) {
            // Set current iterator value
            context.locals?.set('it', item);

            // For testing purposes, we'll simulate the content generation here
            // In real implementation, this would be handled by the command execution flow
          }
        }
      }
    }

    // Handle set command for testing
    if (command.startsWith('set ')) {
      const match = command.match(/^set\s+(\w+)\s+to\s+(.+)$/);
      if (match) {
        const [, varName, expression] = match;

        // Simple expression evaluation for testing
        let value: any;
        if (expression === 'it') {
          value = context.locals?.get('it');
        } else if (expression.includes('(')) {
          // Function call - mock for testing
          const funcMatch = expression.match(/^(\w+)\((.+)\)$/);
          if (funcMatch) {
            const [, funcName, arg] = funcMatch;
            const func = context.globals?.get(funcName);
            if (typeof func === 'function') {
              const argValue = arg === 'it' ? context.locals?.get('it') : arg;
              value = func(argValue);
            }
          }
        } else {
          value = expression;
        }

        context.locals?.set(varName, value);
      }
    }
  }

  /**
   * Process content with context interpolation (temporary implementation)
   */
  private async processContentWithContext(
    content: string,
    context: ExecutionContext
  ): Promise<string> {
    return content
      .replace(/\$\{escape html (\w+)\}/g, (_match, varName) => {
        const value = context.locals?.get(varName);
        return this.escapeHtml(String(value || ''));
      })
      .replace(/\$\{(\w+)\}/g, (_match, varName) => {
        const value = context.locals?.get(varName);
        return String(value || '');
      });
  }

  /**
   * Simple HTML escaping
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
   * Complete two-phase template processing (convenience method)
   */
  async processTemplate(template: string, baseContext: ExecutionContext): Promise<string> {
    // Phase 1: Compile
    const compiled = this.compileTemplate(template);

    // Phase 2: Execute
    const templateContext = this.createTemplateExecutionContext(baseContext);
    const result = await this.executeCompiledTemplate(compiled, templateContext);

    return result;
  }
}
