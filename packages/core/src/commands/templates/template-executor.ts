/**
 * Template Executor - Phase 2 of Template Processing
 * Executes compiled templates with proper hyperscript command integration
 */

import type { ExecutionContext } from '../../types/core';
import type { CompiledTemplate } from './template-compiler';

export class TemplateExecutor {
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
      // Execute the compiled template using a simplified command interpreter
      await this.executeCommands(compiled.commands, compiled.content, context);

      // Return the joined buffer contents
      return buffer.join('');
    } catch (error) {
      console.warn('Template execution error:', error);
      return '';
    }
  }

  /**
   * Execute template commands in sequence with integrated content processing
   */
  private async executeCommands(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    // If there are no commands, just process the content
    if (commands.length === 0) {
      if (content.trim()) {
        const processedContent = await this.processContentInterpolation(content, context);
        buffer.push(processedContent);
      }
      return;
    }

    // For templates with commands, we need to interleave command execution with content processing
    // This is a simplified approach - in a full implementation, we'd need the original template structure

    // First, execute all standalone commands (like @set)
    for (const command of commands) {
      if (command.startsWith('set ')) {
        await this.executeSetCommand(command, context);
      }
    }

    // Then handle block commands like @repeat
    await this.executeBlockCommands(commands, content, context);
  }

  /**
   * Execute block commands with proper content integration
   */
  private async executeBlockCommands(
    commands: string[],
    content: string,
    context: ExecutionContext
  ): Promise<void> {
    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) return;

    let commandIndex = 0;

    while (commandIndex < commands.length) {
      const command = commands[commandIndex];

      if (command.startsWith('repeat in ')) {
        // Handle repeat command with content integration
        const { nextIndex } = await this.executeRepeatWithContent(
          command,
          commands,
          commandIndex,
          content,
          context
        );
        commandIndex = nextIndex;
      } else if (command.startsWith('if ')) {
        // Handle if command with content integration
        const { nextIndex } = await this.executeIfWithContent(
          command,
          commands,
          commandIndex,
          content,
          context
        );
        commandIndex = nextIndex;
      } else {
        commandIndex++;
      }
    }

    // If no block commands were found, just process the content
    if (!commands.some(cmd => cmd.startsWith('repeat ') || cmd.startsWith('if '))) {
      if (content.trim()) {
        const processedContent = await this.processContentInterpolation(content, context);
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    }
  }

  /**
   * Execute a repeat command with content integration
   */
  private async executeRepeatWithContent(
    command: string,
    commands: string[],
    startIndex: number,
    templateContent: string,
    context: ExecutionContext
  ): Promise<{ nextIndex: number }> {
    const arrayExpr = command.substring('repeat in '.length).trim();
    const array = this.resolveVariable(arrayExpr, context);

    if (!Array.isArray(array)) {
      console.warn('Repeat expression did not evaluate to array:', arrayExpr);
      return this.skipToMatchingEnd(commands, startIndex);
    }

    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) {
      return this.skipToMatchingEnd(commands, startIndex);
    }

    // Find the matching @end
    const { nextIndex, blockCommands } = this.extractBlock(commands, startIndex);

    // Execute for each item in the array
    for (const item of array) {
      // Create iteration context
      const iterContext = {
        ...context,
        locals: new Map(context.locals),
        it: item,
      };
      iterContext.locals?.set('it', item);

      // Execute block commands for this iteration
      for (const blockCommand of blockCommands) {
        if (blockCommand.startsWith('set ')) {
          await this.executeSetCommand(blockCommand, iterContext);
        }
        // Skip other commands to prevent infinite loops for now
      }

      // Process the template content with the iteration context
      if (templateContent.trim()) {
        const processedContent = await this.processContentInterpolation(
          templateContent,
          iterContext
        );
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    }

    return { nextIndex };
  }

  /**
   * Execute an if command with content integration
   */
  private async executeIfWithContent(
    command: string,
    commands: string[],
    startIndex: number,
    templateContent: string,
    context: ExecutionContext
  ): Promise<{ nextIndex: number }> {
    const condition = command.substring('if '.length).trim();
    const conditionResult = await this.evaluateCondition(condition, context);

    const { nextIndex, blockCommands, elseCommands } = this.extractIfBlock(commands, startIndex);

    const buffer = context.meta?.__ht_template_result;
    if (!Array.isArray(buffer)) {
      return { nextIndex };
    }

    if (conditionResult) {
      // Execute if branch commands
      for (const blockCommand of blockCommands) {
        if (blockCommand.startsWith('set ')) {
          await this.executeSetCommand(blockCommand, context);
        }
      }

      // Process content with if branch context
      if (templateContent.trim()) {
        const processedContent = await this.processContentInterpolation(templateContent, context);
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    } else if (elseCommands.length > 0) {
      // Execute else branch commands
      for (const elseCommand of elseCommands) {
        if (elseCommand.startsWith('set ')) {
          await this.executeSetCommand(elseCommand, context);
        }
      }

      // Process content with else branch context
      if (templateContent.trim()) {
        const processedContent = await this.processContentInterpolation(templateContent, context);
        if (processedContent.trim()) {
          buffer.push(processedContent);
        }
      }
    }

    return { nextIndex };
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
   * Extract block commands between current position and matching @end
   */
  private extractBlock(
    commands: string[],
    startIndex: number
  ): {
    nextIndex: number;
    blockCommands: string[];
    blockContent: string;
  } {
    const blockCommands: string[] = [];
    let nestLevel = 1;
    let currentIndex = startIndex + 1;

    while (currentIndex < commands.length && nestLevel > 0) {
      const command = commands[currentIndex];

      if (command.startsWith('repeat ') || command.startsWith('if ')) {
        nestLevel++;
        blockCommands.push(command);
      } else if (command === 'end') {
        nestLevel--;
        if (nestLevel > 0) {
          blockCommands.push(command);
        }
      } else {
        blockCommands.push(command);
      }

      currentIndex++;
    }

    return {
      nextIndex: currentIndex,
      blockCommands,
      blockContent: '', // Content extraction would be more complex
    };
  }

  /**
   * Extract if/else block commands
   */
  private extractIfBlock(
    commands: string[],
    startIndex: number
  ): {
    nextIndex: number;
    blockCommands: string[];
    elseCommands: string[];
    blockContent: string;
    elseContent: string;
  } {
    const blockCommands: string[] = [];
    const elseCommands: string[] = [];
    let nestLevel = 1;
    let currentIndex = startIndex + 1;
    let inElse = false;

    while (currentIndex < commands.length && nestLevel > 0) {
      const command = commands[currentIndex];

      if (command.startsWith('if ')) {
        nestLevel++;
      } else if (command === 'else' && nestLevel === 1) {
        inElse = true;
        currentIndex++;
        continue;
      } else if (command === 'end') {
        nestLevel--;
        if (nestLevel === 0) break;
      }

      if (inElse) {
        elseCommands.push(command);
      } else {
        blockCommands.push(command);
      }

      currentIndex++;
    }

    return {
      nextIndex: currentIndex + 1,
      blockCommands,
      elseCommands,
      blockContent: '',
      elseContent: '',
    };
  }

  /**
   * Skip to matching @end
   */
  private skipToMatchingEnd(commands: string[], startIndex: number): { nextIndex: number } {
    let nestLevel = 1;
    let currentIndex = startIndex + 1;

    while (currentIndex < commands.length && nestLevel > 0) {
      const command = commands[currentIndex];

      if (command.startsWith('repeat ') || command.startsWith('if ')) {
        nestLevel++;
      } else if (command === 'end') {
        nestLevel--;
      }

      currentIndex++;
    }

    return { nextIndex: currentIndex };
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
        if (trimmedExpr.startsWith('escape html ')) {
          // HTML escaped expression
          const varName = trimmedExpr.substring('escape html '.length).trim();
          const value = this.resolveVariable(varName, context);
          return this.escapeHtml(String(value || ''));
        } else {
          // Unescaped expression
          const value = this.resolveVariable(trimmedExpr, context);
          return String(value || '');
        }
      } catch (error) {
        console.warn('Template interpolation error:', error);
        return '';
      }
    });
  }

  /**
   * Evaluate a condition expression
   */
  private async evaluateCondition(condition: string, context: ExecutionContext): Promise<boolean> {
    try {
      // Simple condition evaluation for testing
      if (condition.includes('.')) {
        // Property access like 'it.active'
        const parts = condition.split('.');
        let value = this.resolveVariable(parts[0], context);

        for (let i = 1; i < parts.length; i++) {
          if (value && typeof value === 'object') {
            value = value[parts[i]];
          } else {
            value = undefined;
            break;
          }
        }

        return Boolean(value);
      } else {
        // Simple variable
        const value = this.resolveVariable(condition, context);
        return Boolean(value);
      }
    } catch (error) {
      console.warn('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Evaluate an expression
   */
  private async evaluateExpression(expression: string, context: ExecutionContext): Promise<any> {
    try {
      // String literal
      if (expression.startsWith('"') && expression.endsWith('"')) {
        return expression.slice(1, -1);
      }

      // Function call
      if (expression.includes('(')) {
        const match = expression.match(/^(\w+)\((.+)\)$/);
        if (match) {
          const [, funcName, argExpr] = match;
          const func = context.globals?.get(funcName);
          if (typeof func === 'function') {
            const arg = await this.evaluateExpression(argExpr, context);
            return func(arg);
          }
        }
      }

      // Nested function calls
      if (expression.includes('(') && expression.split('(').length > 2) {
        // Handle nested calls like transform(capitalize(name))
        return await this.evaluateNestedFunctionCall(expression, context);
      }

      // Simple variable
      return this.resolveVariable(expression, context);
    } catch (error) {
      console.warn('Expression evaluation error:', error);
      return undefined;
    }
  }

  /**
   * Evaluate nested function calls
   */
  private async evaluateNestedFunctionCall(
    expression: string,
    context: ExecutionContext
  ): Promise<any> {
    // Simple recursive evaluation for nested function calls
    // This is a simplified implementation for testing

    // Find innermost function call first
    const innerMatch = expression.match(/(\w+)\(([^()]+)\)/);
    if (innerMatch) {
      const [fullMatch, funcName, argExpr] = innerMatch;
      const func = context.globals?.get(funcName);

      if (typeof func === 'function') {
        const arg = await this.evaluateExpression(argExpr, context);
        const result = func(arg);

        // Replace the inner call with its result and continue
        const remainingExpr = expression.replace(fullMatch, JSON.stringify(result));

        if (remainingExpr !== expression) {
          return await this.evaluateExpression(remainingExpr, context);
        }

        return result;
      }
    }

    return this.resolveVariable(expression, context);
  }

  /**
   * Resolve a variable in the current context
   */
  private resolveVariable(name: string, context: ExecutionContext): any {
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
