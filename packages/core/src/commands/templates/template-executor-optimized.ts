/**
 * Optimized Template Executor - Memory-Safe Template Processing
 * Addresses performance issues and prevents infinite loops
 */

import type { ExecutionContext } from '../../types/core';
import type { CompiledTemplate } from './template-compiler';

// Removed unused interface _ExecutionState

export class OptimizedTemplateExecutor {
  // Removed unused _MAX_DEPTH
  private readonly MAX_ITERATIONS = 1000;

  /**
   * Execute a compiled template in the given context
   */
  async executeTemplate(compiled: CompiledTemplate, context: ExecutionContext): Promise<string> {
    // Ensure we have a result buffer
    if (!context.meta || !Array.isArray(context.meta.__ht_template_result)) {
      throw new Error(
        'Template execution requires a context with meta.__ht_template_result buffer'
      );
    }

    const buffer = context.meta.__ht_template_result;
    buffer.length = 0; // Clear any existing content

    try {
      // Use a simplified execution strategy that avoids recursion
      await this.executeCommandsIteratively(compiled, context);

      // Return the joined buffer contents
      return buffer.join('');
    } catch (error) {
      console.warn('Template execution error:', error);

      // Fallback: try to process just the content without directives
      try {
        buffer.length = 0; // Clear any partial results
        await this.processContentOnly(compiled, context);
        return buffer.join('');
      } catch (fallbackError) {
        console.warn('Template fallback processing failed:', fallbackError);
        return '';
      }
    }
  }

  /**
   * Process only content without directives (fallback for error cases)
   */
  private async processContentOnly(
    compiled: CompiledTemplate,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    const { content, original } = compiled;

    // If we have original template content, extract non-directive lines
    if (original) {
      const lines = original.split('\n');
      let skipUntilEnd = false;
      let skipReason = '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Handle directive control flow
        if (trimmed.startsWith('@if ')) {
          // Check if condition, if false then skip until @end
          const condition = trimmed.substring(4).trim();
          const conditionResult = await this.evaluateCondition(condition, context);
          if (!conditionResult) {
            skipUntilEnd = true;
            skipReason = 'if';
          }
          continue;
        } else if (trimmed.startsWith('@repeat ')) {
          // Skip repeat blocks in fallback processing
          skipUntilEnd = true;
          skipReason = 'repeat';
          continue;
        } else if (trimmed === '@end') {
          skipUntilEnd = false;
          skipReason = '';
          continue;
        } else if (trimmed === '@else') {
          // Toggle skip state for if blocks
          if (skipReason === 'if') {
            skipUntilEnd = !skipUntilEnd;
          }
          continue;
        }

        // Skip content if we're inside a false condition or repeat block
        if (skipUntilEnd) {
          continue;
        }

        // Only process lines that are not directives
        if (!trimmed.startsWith('@') && trimmed) {
          try {
            const processedLine = await this.processContentInterpolation(line, context);
            buffer.push(processedLine);
          } catch (error) {
            // Even in fallback, be graceful - include line without interpolation
            buffer.push(line);
          }
        }
      }
    } else if (content) {
      // Fallback to processed content
      try {
        const processedContent = await this.processContentInterpolation(content, context);
        buffer.push(processedContent);
      } catch (error) {
        buffer.push(content);
      }
    }
  }

  /**
   * Execute commands iteratively to prevent stack overflow
   */
  private async executeCommandsIteratively(
    compiled: CompiledTemplate,
    context: ExecutionContext
  ): Promise<void> {
    const { commands, content } = compiled;
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // Simple approach: process commands in order, handling special cases
    let hasRepeat = false;
    let hasIf = false;

    // First pass: identify command types
    for (const command of commands) {
      if (command.startsWith('repeat in ')) {
        hasRepeat = true;
      } else if (command.startsWith('if ')) {
        hasIf = true;
      }
    }

    // Handle different template types with error resilience
    try {
      if (hasRepeat && hasIf) {
        // Complex template with both repeat and if
        await this.processComplexTemplate(commands, content, context);
      } else if (hasRepeat) {
        await this.processRepeatTemplate(commands, content, context);
      } else if (hasIf) {
        await this.processIfTemplate(commands, content, context);
      } else {
        // Simple template with just @set commands and content
        await this.processSimpleTemplate(commands, content, context);
      }
    } catch (error) {
      console.warn('Template directive processing failed:', error);
      // Continue to process content with intelligent directive handling even if main processing fails
      await this.processContentOnly(compiled, context);
    }
  }

  /**
   * Process complex templates with both @repeat and @if
   */
  private async processComplexTemplate(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // Find the repeat command
    const repeatCommand = commands.find(c => c.startsWith('repeat in '));
    if (!repeatCommand) return;

    const arrayExpr = repeatCommand.substring('repeat in '.length).trim();
    const array = this.resolveVariableOrProperty(arrayExpr, context);

    if (!Array.isArray(array)) {
      console.warn('Repeat expression did not evaluate to array:', arrayExpr);
      // When repeat fails, let the higher-level error handling deal with it
      throw new Error(`Repeat array evaluation failed: ${arrayExpr}`);
      return;
    }

    // Prevent infinite loops
    const maxItems = Math.min(array.length, this.MAX_ITERATIONS);

    // Execute for each item in the array
    for (let i = 0; i < maxItems; i++) {
      const item = array[i];

      // Create iteration context
      const iterContext = {
        ...context,
        locals: new Map(context.locals),
        it: item,
      };
      iterContext.locals?.set('it', item);

      // Process if condition within the repeat loop
      const ifCommand = commands.find(c => c.startsWith('if '));
      if (ifCommand) {
        const condition = ifCommand.substring('if '.length).trim();
        const conditionResult = await this.evaluateCondition(condition, iterContext);

        if (conditionResult) {
          // Execute if branch commands
          for (const command of commands) {
            if (
              command.startsWith('set ') &&
              !command.startsWith('if ') &&
              command !== repeatCommand
            ) {
              await this.executeSetCommand(command, iterContext);
            }
          }
        } else {
          // Handle else branch if present
          const hasElse = commands.includes('else');
          if (hasElse) {
            const elseIndex = commands.indexOf('else');
            for (let j = elseIndex + 1; j < commands.length; j++) {
              const command = commands[j];
              if (command === 'end') break;
              if (command.startsWith('set ')) {
                await this.executeSetCommand(command, iterContext);
              }
            }
          }
        }
      }

      // Process content with iteration context
      if (content.trim()) {
        const processedContent = await this.processContentInterpolation(content, iterContext);
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    }
  }

  /**
   * Process templates with @repeat commands
   */
  private async processRepeatTemplate(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // Find the repeat command
    const repeatCommand = commands.find(c => c.startsWith('repeat in '));
    if (!repeatCommand) return;

    const arrayExpr = repeatCommand.substring('repeat in '.length).trim();
    const array = this.resolveVariableOrProperty(arrayExpr, context);

    if (!Array.isArray(array)) {
      console.warn('Repeat expression did not evaluate to array:', arrayExpr);
      // When repeat fails, let the higher-level error handling deal with it
      throw new Error(`Repeat array evaluation failed: ${arrayExpr}`);
      return;
    }

    // Prevent infinite loops
    const maxItems = Math.min(array.length, this.MAX_ITERATIONS);

    // Execute for each item in the array
    for (let i = 0; i < maxItems; i++) {
      const item = array[i];

      // Create iteration context
      const iterContext = {
        ...context,
        locals: new Map(context.locals),
        it: item,
      };
      iterContext.locals?.set('it', item);

      // Execute set commands within the repeat block
      for (const command of commands) {
        if (command.startsWith('set ') && command !== repeatCommand) {
          await this.executeSetCommand(command, iterContext);
        }
      }

      // Process content with iteration context
      if (content.trim()) {
        const processedContent = await this.processContentInterpolation(content, iterContext);
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    }
  }

  /**
   * Process templates with @if commands
   */
  private async processIfTemplate(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // Find the if command
    const ifCommand = commands.find(c => c.startsWith('if '));
    if (!ifCommand) return;

    const condition = ifCommand.substring('if '.length).trim();
    const conditionResult = await this.evaluateCondition(condition, context);

    // Execute appropriate branch
    if (conditionResult) {
      // Execute if branch commands
      for (const command of commands) {
        if (command.startsWith('set ') && !command.startsWith('if ')) {
          await this.executeSetCommand(command, context);
        }
      }
    } else {
      // Handle else branch if present
      const hasElse = commands.includes('else');
      if (hasElse) {
        // Execute else branch commands (simplified)
        const elseIndex = commands.indexOf('else');
        for (let i = elseIndex + 1; i < commands.length; i++) {
          const command = commands[i];
          if (command === 'end') break;
          if (command.startsWith('set ')) {
            await this.executeSetCommand(command, context);
          }
        }
      }
    }

    // Process content
    if (content.trim()) {
      const processedContent = await this.processContentInterpolation(content, context);
      if (processedContent.trim()) {
        buffer.push(processedContent);
      }
    }
  }

  /**
   * Process simple templates with just @set and content
   */
  private async processSimpleTemplate(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // Execute all set commands
    for (const command of commands) {
      if (command.startsWith('set ')) {
        await this.executeSetCommand(command, context);
      }
    }

    // Process content
    if (content.trim()) {
      const processedContent = await this.processContentInterpolation(content, context);
      if (processedContent.trim()) {
        buffer.push(processedContent);
      }
    }
  }

  /**
   * Execute a set command
   */
  private async executeSetCommand(command: string, context: ExecutionContext): Promise<void> {
    const match = command.match(/^set\s+(\w+)\s+to\s+(.+)$/);
    if (!match) {
      console.warn('Invalid set command syntax:', command);
      return;
    }

    const [, varName, expression] = match;
    const value = await this.evaluateExpression(expression, context);

    // Set the variable in locals (create new context to avoid readonly issues)
    const newLocals = new Map(context.locals);
    newLocals.set(varName, value);
    Object.assign(context, { locals: newLocals });
  }

  /**
   * Process content interpolation (${variable} expressions)
   */
  private async processContentInterpolation(
    content: string,
    context: ExecutionContext
  ): Promise<string> {
    return content.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
      const trimmedExpr = expression.trim();

      try {
        if (trimmedExpr.startsWith('unescaped ')) {
          // Unescaped expression
          const actualExpr = trimmedExpr.substring('unescaped '.length).trim();
          const value = this.resolveVariableOrProperty(actualExpr, context);
          return String(value || '');
        } else if (trimmedExpr.startsWith('escape html ')) {
          // HTML escaped expression
          const varName = trimmedExpr.substring('escape html '.length).trim();
          const value = this.resolveVariableOrProperty(varName, context);
          return this.escapeHtml(String(value || ''));
        } else {
          // Default to HTML escaped
          const value = this.resolveVariableOrProperty(trimmedExpr, context);
          return this.escapeHtml(String(value || ''));
        }
      } catch (error) {
        console.warn('Template interpolation error:', error);
        return '';
      }
    });
  }

  /**
   * Evaluate a condition expression with safety checks
   */
  private async evaluateCondition(condition: string, context: ExecutionContext): Promise<boolean> {
    try {
      const value = this.resolveVariableOrProperty(condition, context);
      return Boolean(value);
    } catch (error) {
      console.warn('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Evaluate an expression with safety measures
   */
  private async evaluateExpression(expression: string, context: ExecutionContext): Promise<any> {
    try {
      // String concatenation (check before string literal)
      if (expression.includes(' + ')) {
        return this.evaluateStringConcatenation(expression, context);
      }

      // String literal
      if (expression.startsWith('"') && expression.endsWith('"')) {
        return expression.slice(1, -1);
      }

      // Function call
      if (expression.includes('(') && expression.includes(')')) {
        return this.evaluateFunctionCall(expression, context);
      }

      // Simple variable or property
      return this.resolveVariableOrProperty(expression, context);
    } catch (error) {
      console.warn('Expression evaluation error:', error);
      return undefined;
    }
  }

  /**
   * Evaluate string concatenation expressions
   */
  private evaluateStringConcatenation(expression: string, context: ExecutionContext): string {
    const parts = expression.split(' + ').map(part => part.trim());
    const result = parts.map(part => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return part.slice(1, -1); // String literal
      } else {
        const value = this.resolveVariableOrProperty(part, context);
        return String(value || '');
      }
    });

    return result.join('');
  }

  /**
   * Evaluate function calls with safety measures
   */
  private evaluateFunctionCall(expression: string, context: ExecutionContext): any {
    const match = expression.match(/^(\w+)\((.+)\)$/);
    if (!match) return undefined;

    const [, funcName, argExpr] = match;
    const func = context.globals?.get(funcName);

    if (typeof func !== 'function') {
      console.warn('Function not found:', funcName);
      return undefined;
    }

    try {
      const arg = this.resolveVariableOrProperty(argExpr, context);
      return func(arg);
    } catch (error) {
      console.warn('Function call error:', error);
      return undefined;
    }
  }

  /**
   * Resolve a variable or property path in the current context with safety checks
   */
  private resolveVariableOrProperty(name: string, context: ExecutionContext): any {
    // Prevent infinite resolution chains
    if (typeof name !== 'string' || name.length > 100) {
      return undefined;
    }

    // Handle property access (e.g., "it.id", "it.name", "it.active")
    if (name.includes('.')) {
      const parts = name.split('.');
      let value = this.resolveVariable(parts[0], context);

      // Limit property chain depth to prevent infinite loops
      const maxDepth = Math.min(parts.length, 5);
      for (let i = 1; i < maxDepth && value != null; i++) {
        if (typeof value === 'object') {
          value = value[parts[i]];
        } else {
          value = undefined;
          break;
        }
      }

      return value;
    }

    // Simple variable resolution
    return this.resolveVariable(name, context);
  }

  /**
   * Resolve a variable in the current context with safety checks
   */
  private resolveVariable(name: string, context: ExecutionContext): any {
    // Prevent infinite resolution chains
    if (typeof name !== 'string' || name.length > 100) {
      return undefined;
    }

    // Check locals first (Meta → Local → Element → Global order)
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
   * HTML escape utility
   */
  private escapeHtml(text: string): string {
    if (typeof text !== 'string') return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
