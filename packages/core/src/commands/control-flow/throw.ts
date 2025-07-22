/**
 * Throw Command Implementation
 * The throw command allows you to throw an error in hyperscript
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class ThrowCommand implements CommandImplementation {
  name = 'throw';
  syntax = 'throw <expression>';
  description = 'The throw command allows you to throw an error in hyperscript, which can be caught by try-catch blocks or error handlers.';
  isBlocking = true; // Stops execution by throwing

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    // Handle null context gracefully
    if (!context) {
      const errorMessage = args.length > 0 ? String(args[0]) : 'An error occurred';
      throw new Error(errorMessage);
    }
    
    // Determine error message/object
    let errorData: any;
    
    if (args.length === 0) {
      errorData = 'An error occurred';
    } else if (args.length === 1) {
      errorData = args[0];
    } else {
      // Multiple arguments - create structured error
      errorData = {
        message: args[0] || 'An error occurred',
        details: args.slice(1)
      };
    }

    // Process error data
    const processedError = await this.processErrorData(errorData, context);

    // Create the error first
    const error = this.createError(processedError, context);
    
    // Emit error event before throwing (with the actual Error object)
    this.emitErrorEvent(error, context);

    // Throw the error
    throw error;
  }

  validate(args: any[]): string | null {
    // Throw command accepts any number of arguments (including none)
    return null;
  }

  /**
   * Process error data based on type and context
   */
  private async processErrorData(errorData: any, context: ExecutionContext): Promise<any> {
    // If it's already an Error instance, return as-is
    if (errorData instanceof Error) {
      return errorData;
    }

    // If it's an object with error-like properties
    if (errorData && typeof errorData === 'object') {
      return errorData;
    }

    // If it's a string, check if it's a variable reference
    if (typeof errorData === 'string') {
      return await this.evaluateErrorExpression(errorData, context);
    }

    // For other types, convert to string
    return String(errorData);
  }

  /**
   * Evaluate error expression (simplified)
   */
  private async evaluateErrorExpression(expr: string, context: ExecutionContext): Promise<any> {
    // Handle null context
    if (!context) {
      return expr;
    }
    
    // Handle simple variable lookups
    if (context.locals?.has(expr)) {
      return context.locals.get(expr);
    }
    
    if (context.globals?.has(expr)) {
      return context.globals.get(expr);
    }

    // Handle string concatenation expressions
    if (expr.includes('+')) {
      return await this.evaluateStringExpression(expr, context);
    }

    // Handle function calls (simplified)
    if (expr.includes('()')) {
      const funcName = expr.replace('()', '');
      if (context.locals?.has(funcName)) {
        const func = context.locals.get(funcName);
        if (typeof func === 'function') {
          return await func();
        }
      }
    }

    // Handle string literals
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    // Return as-is if no evaluation needed
    return expr;
  }

  /**
   * Evaluate string concatenation expression
   */
  private async evaluateStringExpression(expr: string, context: ExecutionContext): Promise<string> {
    // Handle null context
    if (!context) {
      return expr;
    }
    
    // Simple string concatenation evaluation
    const parts = expr.split('+').map(p => p.trim());
    let result = '';
    
    for (const part of parts) {
      let value: any;
      
      // Handle quoted strings
      if (part.startsWith('"') && part.endsWith('"')) {
        value = part.slice(1, -1);
      }
      // Handle variable references
      else if (context.locals?.has(part)) {
        value = context.locals.get(part);
      }
      else if (context.globals?.has(part)) {
        value = context.globals.get(part);
      }
      // Handle as literal
      else {
        value = part;
      }
      
      result += String(value);
    }
    
    return result;
  }

  /**
   * Create Error instance from processed data
   */
  private createError(errorData: any, context: ExecutionContext): Error {
    let error: Error;

    // If already an Error instance, enhance it with context
    if (errorData instanceof Error) {
      error = errorData;
    }
    // If object with error properties
    else if (errorData && typeof errorData === 'object') {
      if (errorData.type && this.isValidErrorType(errorData.type)) {
        // Create specific error type
        switch (errorData.type) {
          case 'TypeError':
            error = new TypeError(errorData.message || 'Type error');
            break;
          case 'ReferenceError':
            error = new ReferenceError(errorData.message || 'Reference error');
            break;
          case 'RangeError':
            error = new RangeError(errorData.message || 'Range error');
            break;
          default:
            error = new Error(errorData.message || 'An error occurred');
            break;
        }
      } else {
        error = new Error(errorData.message || JSON.stringify(errorData));
      }
      
      // Copy additional properties
      Object.keys(errorData).forEach(key => {
        if (key !== 'message' && key !== 'type') {
          (error as any)[key] = errorData[key];
        }
      });
    }
    // For primitive types
    else {
      error = new Error(String(errorData));
    }

    // Add hyperscript context information
    this.enhanceErrorWithContext(error, context);

    return error;
  }

  /**
   * Check if error type is valid
   */
  private isValidErrorType(type: string): boolean {
    return ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'ValidationError'].includes(type);
  }

  /**
   * Enhance error with hyperscript context
   */
  private enhanceErrorWithContext(error: Error, context: ExecutionContext): void {
    if (!context) {
      return;
    }
    
    // Add hyperscript-specific context
    (error as any).hyperscriptContext = {
      element: context.me,
      locals: context.locals ? Object.fromEntries(context.locals) : {},
      command: 'throw'
    };

    // Add timestamp
    (error as any).timestamp = new Date().toISOString();

    // Preserve original stack and add hyperscript info
    const originalStack = error.stack;
    if (originalStack) {
      error.stack = originalStack + '\n    at HyperScript throw command';
    }
  }

  /**
   * Emit error event before throwing
   */
  private emitErrorEvent(error: Error, context: ExecutionContext): void {
    if (!context || !context.me) return;

    try {
      const event = new CustomEvent('hyperscript:error', {
        bubbles: true,
        cancelable: false,
        detail: {
          error: error,
          command: 'throw',
          element: context.me,
          context: {
            locals: context.locals ? Object.fromEntries(context.locals) : {},
            globals: context.globals ? Object.fromEntries(context.globals) : {}
          }
        }
      });

      context.me.dispatchEvent(event);
    } catch (eventError) {
      // Don't let event emission errors prevent the throw
      console.warn('Failed to emit hyperscript:error event:', eventError);
    }
  }
}

export default ThrowCommand;