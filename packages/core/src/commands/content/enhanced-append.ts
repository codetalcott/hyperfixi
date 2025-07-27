/**
 * Enhanced Append Command Implementation
 * The append command adds a string value to the end of another string, array, or HTML Element.
 * If no target variable is defined, then the standard result variable is used by default.
 * 
 * Syntax: append <content> [to <target>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface AppendCommandInput {
  content: any;
  target?: string | HTMLElement | any[];
  toKeyword?: 'to'; // For syntax validation
}

// Output type definition  
export interface AppendCommandOutput {
  result: any;
  targetType: 'result' | 'variable' | 'array' | 'element' | 'string';
  target?: string | HTMLElement;
}

/**
 * Enhanced Append Command with full type safety and validation
 */
export class EnhancedAppendCommand implements TypedCommandImplementation<
  AppendCommandInput,
  AppendCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'append',
    description: 'The append command adds a string value to the end of another string, array, or HTML Element. If no target variable is defined, then the standard result variable is used by default.',
    examples: [
      'append "Hello"',
      'append "World" to greeting',
      'append item to myArray',
      'append "<p>New paragraph</p>" to #content',
      'append text to me'
    ],
    syntax: 'append <content> [to <target>]',
    category: 'data' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<AppendCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Append command requires an object input',
            suggestions: 'Provide an object with content property'
          }
        };
      }

      const inputObj = input as any;

      // Validate content is present
      if (inputObj.content === undefined) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Append command requires content to append',
            suggestions: 'Provide content to append as the first argument'
          }
        };
      }

      // If target is provided, validate it
      if (inputObj.target !== undefined) {
        const target = inputObj.target;
        if (typeof target !== 'string' && 
            !(target instanceof HTMLElement) && 
            !Array.isArray(target)) {
          return {
            success: false,
            error: {
              type: 'type-mismatch',
              message: 'Target must be a string (variable name/selector), HTMLElement, or Array',
              suggestions: 'Use a variable name, CSS selector, element reference, or array'
            }
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          content: inputObj.content,
          target: inputObj.target,
          toKeyword: inputObj.toKeyword
        }
      };
    }
  };

  async execute(
    input: AppendCommandInput,
    context: TypedExecutionContext
  ): Promise<AppendCommandOutput> {
    const { content, target } = input;

    // Convert content to string for most operations
    const contentStr = content == null ? String(content) : String(content);

    // If no target specified, append to result variable (it)
    if (!target) {
      if (context.it === undefined) {
        context.it = contentStr;
      } else {
        context.it = String(context.it) + contentStr;
      }
      return {
        result: context.it,
        targetType: 'result'
      };
    }

    // Handle different target types
    if (typeof target === 'string') {
      // Check if this is a CSS selector  
      if (target.startsWith('#') || target.startsWith('.') || target.includes('[')) {
        const element = this.resolveDOMElement(target, context);
        element.innerHTML += contentStr;
        return {
          result: element,
          targetType: 'element',
          target: element
        };
      }
      
      // Check if this is a context reference
      if (target === 'me' || target === 'it' || target === 'you') {
        const contextTarget = this.resolveContextReference(target, context);
        if (contextTarget instanceof HTMLElement) {
          contextTarget.innerHTML += contentStr;
          return {
            result: contextTarget,
            targetType: 'element',
            target: contextTarget
          };
        }
      }
      
      // Handle variable operations
      const variableExists = this.variableExists(target, context);
      
      if (variableExists) {
        const currentValue = this.getVariableValue(target, context);
        
        // Special handling for arrays
        if (Array.isArray(currentValue)) {
          currentValue.push(content);
          return {
            result: currentValue,
            targetType: 'array',
            target
          };
        }
        
        // Handle strings and other types
        const newValue = (currentValue == null ? '' : String(currentValue)) + contentStr;
        this.setVariableValue(target, newValue, context);
        return {
          result: newValue,
          targetType: 'variable',
          target
        };
      } else {
        // Create new variable
        this.setVariableValue(target, contentStr, context);
        return {
          result: contentStr,
          targetType: 'variable',
          target
        };
      }
    } else if (Array.isArray(target)) {
      // Direct array target
      target.push(content);
      return {
        result: target,
        targetType: 'array',
        target
      };
    } else if (target instanceof HTMLElement) {
      // Direct element target
      target.innerHTML += contentStr;
      return {
        result: target,
        targetType: 'element',
        target
      };
    } else {
      // Handle other object types by converting to string
      const newValue = String(target) + contentStr;
      context.it = newValue;
      return {
        result: newValue,
        targetType: 'string'
      };
    }
  }

  private resolveDOMElement(selector: string, context: TypedExecutionContext): HTMLElement {
    if (typeof document === 'undefined') {
      throw new Error('DOM not available - cannot resolve element selector');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    return element as HTMLElement;
  }

  private resolveContextReference(ref: string, context: TypedExecutionContext): any {
    switch (ref) {
      case 'me':
        return context.me;
      case 'it':
        return context.it;
      case 'you':
        return context.you;
      default:
        throw new Error(`Unknown context reference: ${ref}`);
    }
  }

  private variableExists(name: string, context: TypedExecutionContext): boolean {
    return (context.locals && context.locals.has(name)) ||
           (context.globals && context.globals.has(name)) ||
           (context.variables && context.variables.has(name));
  }

  private getVariableValue(name: string, context: TypedExecutionContext): any {
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
    
    return undefined;
  }

  private setVariableValue(name: string, value: any, context: TypedExecutionContext): void {
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
 * Factory function to create the enhanced append command
 */
export function createEnhancedAppendCommand(): EnhancedAppendCommand {
  return new EnhancedAppendCommand();
}

export default EnhancedAppendCommand;