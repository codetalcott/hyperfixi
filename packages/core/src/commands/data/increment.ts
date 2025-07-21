/**
 * Increment Command Implementation  
 * Increases the value of a variable or element property by a specified amount
 * 
 * Syntax: increment <target> [by <number>]
 * 
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class IncrementCommand implements CommandImplementation {
  name = 'increment';
  syntax = 'increment <target> [by <number>]';
  description = 'The increment command increases the value of a variable or element property by a specified amount (default 1).';
  isBlocking = false;
  hasBody = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length === 0) {
      throw new Error('Increment command requires a target');
    }

    const [target, byKeyword, amount] = args;
    
    // Determine increment amount
    let incrementBy = 1; // Default increment
    if (byKeyword === 'by' && typeof amount !== 'undefined') {
      if (typeof amount === 'number') {
        incrementBy = amount;
      } else if (typeof amount === 'string') {
        const parsed = parseFloat(amount);
        if (!isNaN(parsed)) {
          incrementBy = parsed;
        } else {
          // Try to resolve from context
          const resolved = this.resolveValue(amount, context);
          if (typeof resolved === 'number') {
            incrementBy = resolved;
          } else {
            throw new Error(`Invalid increment amount: ${amount}`);
          }
        }
      } else {
        // Try to resolve from context
        const resolved = this.resolveValue(amount, context);
        if (typeof resolved === 'number') {
          incrementBy = resolved;
        } else {
          throw new Error(`Invalid increment amount: ${amount}`);
        }
      }
    }

    // Handle different target types
    const currentValue = this.getCurrentValue(target, context);
    const newValue = this.performIncrement(currentValue, incrementBy);
    
    // Set the new value
    this.setTargetValue(target, newValue, context);
    
    // Set result in context
    context.it = newValue;
    
    return newValue;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'Increment command requires a target';
    }

    if (args.length === 1) {
      // Just target, this is valid (increment by 1)
      return null;
    }

    if (args.length >= 2) {
      // Should have "by" keyword if more than one argument
      if (args[1] !== 'by') {
        return 'Increment command with amount requires "by" keyword';
      }
      
      if (args.length === 2) {
        return 'Increment command requires amount after "by" keyword';
      }
    }

    return null;
  }

  private getCurrentValue(target: any, context: ExecutionContext): number {
    // Handle direct values
    if (typeof target === 'number') {
      return target;
    }
    
    if (typeof target === 'string') {
      // Check for element property references (e.g., "me.value", "element.scrollTop")
      if (target.includes('.')) {
        return this.getElementProperty(target, context);
      }
      
      // Check context references
      if (target === 'me' && context.me) {
        return this.convertToNumber((context.me as any).value || 0);
      } else if (target === 'it') {
        return this.convertToNumber(context.it || 0);
      } else if (target === 'you' && context.you) {
        return this.convertToNumber((context.you as any).value || 0);
      }
      
      // Try to get variable value
      const value = this.getVariableValue(target, context);
      return this.convertToNumber(value);
    }
    
    // Handle object/element references  
    if (target && typeof target === 'object') {
      if (target instanceof HTMLElement) {
        return this.convertToNumber(target.textContent || '0');
      }
      // For objects, try to convert to number
      return this.convertToNumber(target);
    }
    
    return this.convertToNumber(target);
  }

  private performIncrement(currentValue: number, incrementBy: number): number {
    // Handle special cases
    if (!isFinite(currentValue)) {
      currentValue = 0;
    }
    if (!isFinite(incrementBy)) {
      incrementBy = 1;
    }
    
    return currentValue + incrementBy;
  }

  private setTargetValue(target: any, newValue: number, context: ExecutionContext): void {
    if (typeof target === 'string') {
      // Handle element property references
      if (target.includes('.')) {
        this.setElementProperty(target, newValue, context);
        return;
      }
      
      // Handle context references
      if (target === 'me' && context.me) {
        (context.me as any).value = newValue;
        return;
      } else if (target === 'it') {
        context.it = newValue;
        return;
      } else if (target === 'you' && context.you) {
        (context.you as any).value = newValue;
        return;
      }
      
      // Set variable value
      this.setVariableValue(target, newValue, context);
    } else if (target instanceof HTMLElement) {
      target.textContent = String(newValue);
    }
  }

  private getElementProperty(propertyPath: string, context: ExecutionContext): number {
    const parts = propertyPath.split('.');
    const elementRef = parts[0];
    const property = parts[1];
    
    let element: any = null;
    
    // Resolve element reference
    if (elementRef === 'me') {
      element = context.me;
    } else if (elementRef === 'it') {
      element = context.it;
    } else if (elementRef === 'you') {
      element = context.you;
    } else {
      // Try to resolve as variable
      element = this.getVariableValue(elementRef, context);
    }
    
    if (!element) {
      return 0;
    }
    
    // Get property value
    const value = element[property];
    return this.convertToNumber(value);
  }

  private setElementProperty(propertyPath: string, value: number, context: ExecutionContext): void {
    const parts = propertyPath.split('.');
    const elementRef = parts[0];
    const property = parts[1];
    
    let element: any = null;
    
    // Resolve element reference
    if (elementRef === 'me') {
      element = context.me;
    } else if (elementRef === 'it') {
      element = context.it;
    } else if (elementRef === 'you') {
      element = context.you;
    } else {
      // Try to resolve as variable
      element = this.getVariableValue(elementRef, context);
    }
    
    if (element) {
      element[property] = value;
    }
  }

  private convertToNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'number') {
      return isFinite(value) ? value : 0;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    if (Array.isArray(value)) {
      return value.length;
    }
    
    if (typeof value === 'object') {
      // Try to get length or valueOf
      if ('length' in value && typeof value.length === 'number') {
        return value.length;
      }
      if (typeof value.valueOf === 'function') {
        const result = value.valueOf();
        if (typeof result === 'number') {
          return result;
        }
      }
      return 0;
    }
    
    return 0;
  }

  private getVariableValue(name: string, context: ExecutionContext): any {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }
    
    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }
    
    // Check general variables  
    if (context.variables && context.variables.has(name)) {
      return context.variables.get(name);
    }
    
    // Return undefined if not found (will be converted to 0)
    return undefined;
  }

  private setVariableValue(name: string, value: number, context: ExecutionContext): void {
    // If variable exists in local scope, update it
    if (context.locals && context.locals.has(name)) {
      context.locals.set(name, value);
      return;
    }
    
    // If variable exists in global scope, update it
    if (context.globals && context.globals.has(name)) {
      context.globals.set(name, value);
      return;
    }
    
    // If variable exists in general variables, update it
    if (context.variables && context.variables.has(name)) {
      context.variables.set(name, value);
      return;
    }
    
    // Create new local variable
    if (!context.locals) {
      context.locals = new Map();
    }
    context.locals.set(name, value);
  }

  private resolveValue(value: any, context: ExecutionContext): any {
    if (typeof value === 'string') {
      return this.getVariableValue(value, context);
    }
    return value;
  }
}

export default IncrementCommand;