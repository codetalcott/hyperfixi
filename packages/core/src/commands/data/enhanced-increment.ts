/**
 * Enhanced Increment Command Implementation  
 * Increases the value of a variable or element property by a specified amount
 * 
 * Syntax: increment <target> [by <number>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface IncrementCommandInput {
  target: string | HTMLElement | number;
  property?: string;
  scope?: 'global' | 'local';
  amount?: number;
  byKeyword?: 'by'; // For syntax validation
}

// Output type definition  
export interface IncrementCommandOutput {
  oldValue: number;
  newValue: number;
  target: string | HTMLElement;
}

/**
 * Enhanced Increment Command with full type safety and validation
 */
export class EnhancedIncrementCommand implements TypedCommandImplementation<
  IncrementCommandInput,
  IncrementCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'increment',
    description: 'The increment command adds to an existing variable, property, or attribute. It defaults to adding the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then incremented by the specified amount.',
    examples: [
      'increment counter',
      'increment counter by 5',
      'increment global score by 10',
      'increment element.value by 2',
      'increment me.scrollTop by 100'
    ],
    syntax: 'increment <target> [by <number>]',
    category: 'data' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<IncrementCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Increment command requires an object input',
            suggestions: 'Provide an object with target property'
          }
        };
      }

      const inputObj = input as any;

      // Validate target is present
      if (!inputObj.target) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Increment command requires a target',
            suggestions: 'Provide a target variable, element, or property to increment'
          }
        };
      }

      // Validate target type
      const target = inputObj.target;
      if (typeof target !== 'string' && typeof target !== 'number' && 
          !(target instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Target must be a string (variable name), number, or HTMLElement',
            suggestions: 'Use a variable name like "counter" or an element reference'
          }
        };
      }

      // Validate amount if provided
      if (inputObj.amount !== undefined) {
        const amount = inputObj.amount;
        if (typeof amount !== 'number' && 
            (typeof amount !== 'string' || isNaN(parseFloat(amount)))) {
          return {
            success: false,
            error: {
              type: 'type-mismatch',
              message: 'Amount must be a number',
              suggestions: 'Provide a numeric value like 1, 5, or 10.5'
            }
          };
        }
      }

      // Validate scope if provided
      if (inputObj.scope !== undefined && 
          inputObj.scope !== 'global' && inputObj.scope !== 'local') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Scope must be "global" or "local"',
            suggestions: 'Use "global" or "local" scope, or omit for default behavior'
          }
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          target: inputObj.target,
          property: inputObj.property,
          scope: inputObj.scope,
          amount: inputObj.amount || 1,
          byKeyword: inputObj.byKeyword
        }
      };
    }
  };

  async execute(
    input: IncrementCommandInput, 
    context: TypedExecutionContext
  ): Promise<IncrementCommandOutput> {
    const { target, property, scope, amount = 1 } = input;

    // Get current value
    const currentValue = this.getCurrentValue(target, property, scope, context);
    
    // Perform increment
    const newValue = this.performIncrement(currentValue, amount);
    
    // Set the new value
    this.setTargetValue(target, property, scope, newValue, context);
    
    // Update context
    context.it = newValue;
    
    return {
      oldValue: currentValue,
      newValue,
      target
    };
  }

  private getCurrentValue(
    target: string | HTMLElement | number, 
    property: string | undefined, 
    scope: string | undefined, 
    context: TypedExecutionContext
  ): number {
    // Handle direct numeric values
    if (typeof target === 'number') {
      return target;
    }
    
    // Handle HTMLElement
    if (target instanceof HTMLElement) {
      if (property) {
        // Get element property or attribute
        if (property.startsWith('data-') || 
            ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)) {
          const value = target.getAttribute(property);
          return this.convertToNumber(value);
        } else {
          const value = (target as any)[property];
          return this.convertToNumber(value);
        }
      } else {
        // Use element's text content or value
        const value = (target as any).value || target.textContent;
        return this.convertToNumber(value);
      }
    }
    
    // Handle string (variable name or element reference)
    if (typeof target === 'string') {
      // Handle scoped variables
      if (scope === 'global') {
        const value = this.getVariableValue(target, context, 'global');
        return this.convertToNumber(value);
      }
      
      // Handle element property references (e.g., "me.value", "element.scrollTop")
      if (target.includes('.')) {
        return this.getElementProperty(target, context);
      }
      
      // Handle context references
      if (target === 'me' && context.me) {
        return this.convertToNumber((context.me as any).value || 0);
      } else if (target === 'it') {
        return this.convertToNumber(context.it || 0);
      } else if (target === 'you' && context.you) {
        return this.convertToNumber((context.you as any).value || 0);
      }
      
      // Get variable value
      const value = this.getVariableValue(target, context);
      return this.convertToNumber(value);
    }
    
    return this.convertToNumber(target);
  }

  private performIncrement(currentValue: number, incrementBy: number): number {
    // If current value is NaN, preserve NaN
    if (isNaN(currentValue)) {
      return NaN;
    }
    
    // Handle special cases for incrementBy
    if (!isFinite(incrementBy)) {
      incrementBy = 1;
    }
    
    return currentValue + incrementBy;
  }

  private setTargetValue(
    target: string | HTMLElement | number, 
    property: string | undefined, 
    scope: string | undefined, 
    newValue: number, 
    context: TypedExecutionContext
  ): void {
    // Handle HTMLElement
    if (target instanceof HTMLElement) {
      if (property) {
        // Set element property or attribute
        if (property.startsWith('data-') || 
            ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)) {
          target.setAttribute(property, String(newValue));
        } else {
          (target as any)[property] = newValue;
        }
      } else {
        // Set element's text content or value
        if ('value' in target) {
          (target as any).value = String(newValue);
        } else {
          target.textContent = String(newValue);
        }
      }
      return;
    }
    
    // Handle string (variable name or element reference)
    if (typeof target === 'string') {
      // Handle scoped variables
      if (scope === 'global') {
        this.setVariableValue(target, newValue, context, 'global');
        return;
      }
      
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
    }
  }

  private getElementProperty(propertyPath: string, context: TypedExecutionContext): number {
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

  private setElementProperty(propertyPath: string, value: number, context: TypedExecutionContext): void {
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
      return parsed; // Return NaN if invalid string to preserve test expectations
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
      // Return NaN for objects that can't be converted
      return NaN;
    }
    
    return 0;
  }

  private getVariableValue(name: string, context: TypedExecutionContext, preferredScope?: string): any {
    // If preferred scope is specified, check that first
    if (preferredScope === 'global' && context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }
    
    // Check local variables first (unless global is preferred)
    if (preferredScope !== 'global' && context.locals && context.locals.has(name)) {
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
    
    // Check local variables as fallback
    if (preferredScope === 'global' && context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }
    
    // Return undefined if not found (will be converted to 0)
    return undefined;
  }

  private setVariableValue(name: string, value: number, context: TypedExecutionContext, preferredScope?: string): void {
    // If preferred scope is specified, handle it
    if (preferredScope === 'global') {
      if (!context.globals) {
        context.globals = new Map();
      }
      context.globals.set(name, value);
      return;
    }
    
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
}

/**
 * Factory function to create the enhanced increment command
 */
export function createEnhancedIncrementCommand(): EnhancedIncrementCommand {
  return new EnhancedIncrementCommand();
}

export default EnhancedIncrementCommand;