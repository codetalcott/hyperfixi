/**
 * Enhanced Set Command Implementation
 * Sets variables and element properties to specified values
 * 
 * Syntax: set <target> to <value>
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface SetCommandInput {
  target: string | HTMLElement;
  value: any;
  toKeyword?: 'to'; // For syntax validation
  scope?: 'global' | 'local';
}

// Output type definition  
export interface SetCommandOutput {
  target: string | HTMLElement;
  oldValue: any;
  newValue: any;
  targetType: 'variable' | 'element-property' | 'element-attribute' | 'context';
}

/**
 * Enhanced Set Command with full type safety and validation
 */
export class EnhancedSetCommand implements TypedCommandImplementation<
  SetCommandInput,
  SetCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'set',
    description: 'The set command assigns values to variables, element properties, or context references. It supports both local and global scope assignment.',
    examples: [
      'set counter to 0',
      'set global theme to "dark"',
      'set me.className to "active"',
      'set #myElement.value to "Hello World"',
      'set result to user.name'
    ],
    syntax: 'set <target> to <value>',
    category: 'data' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<SetCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Set command requires an object input',
            suggestion: 'Provide an object with target and value properties'
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
            message: 'Set command requires a target to set',
            suggestion: 'Provide a variable name, element reference, or property path'
          }
        };
      }

      // Validate target type
      if (typeof inputObj.target !== 'string' && !(inputObj.target instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Target must be a string (variable/property name) or HTMLElement',
            suggestion: 'Use a variable name like "counter" or element reference'
          }
        };
      }

      // Validate value is present (can be any type including null/undefined)
      if (!('value' in inputObj)) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Set command requires a value to assign',
            suggestion: 'Provide the value to assign to the target'
          }
        };
      }

      // Validate scope if provided
      if (inputObj.scope !== undefined && 
          inputObj.scope !== 'global' && inputObj.scope !== 'local') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Scope must be "global" or "local"',
            suggestion: 'Use "global" or "local" scope, or omit for default behavior'
          }
        };
      }

      return {
        success: true,
        data: {
          target: inputObj.target,
          value: inputObj.value,
          toKeyword: inputObj.toKeyword,
          scope: inputObj.scope
        }
      };
    }
  };

  async execute(
    input: SetCommandInput,
    context: TypedExecutionContext
  ): Promise<SetCommandOutput> {
    const { target, value, scope } = input;

    let oldValue: any;
    let targetType: 'variable' | 'element-property' | 'element-attribute' | 'context';

    if (target instanceof HTMLElement) {
      // Direct element assignment
      oldValue = target.textContent;
      target.textContent = String(value);
      targetType = 'element-property';
    } else if (typeof target === 'string') {
      // Handle different string target types
      if (target.includes('.')) {
        // Property/attribute access (e.g., "me.className", "element.value")
        const result = this.setPropertyPath(target, value, context);
        oldValue = result.oldValue;
        targetType = result.targetType;
      } else if (target === 'me' || target === 'it' || target === 'you' || target === 'result') {
        // Context references
        oldValue = this.getContextValue(target, context);
        this.setContextValue(target, value, context);
        targetType = 'context';
      } else {
        // Variable assignment
        oldValue = this.getVariableValue(target, context, scope);
        this.setVariableValue(target, value, context, scope);
        targetType = 'variable';
      }
    } else {
      // Fallback for other types
      oldValue = undefined;
      context.it = value;
      targetType = 'context';
    }

    return {
      target,
      oldValue,
      newValue: value,
      targetType
    };
  }

  private setPropertyPath(path: string, value: any, context: TypedExecutionContext): { oldValue: any; targetType: 'element-property' | 'element-attribute' } {
    const parts = path.split('.');
    const objectRef = parts[0];
    const propertyName = parts[1];

    let targetObject: any;

    // Resolve the target object
    if (objectRef === 'me') {
      targetObject = context.me;
    } else if (objectRef === 'it') {
      targetObject = context.it;
    } else if (objectRef === 'you') {
      targetObject = context.you;
    } else {
      // Try to resolve as variable
      targetObject = this.getVariableValue(objectRef, context);
    }

    if (!targetObject) {
      throw new Error(`Cannot resolve target object: ${objectRef}`);
    }

    const oldValue = targetObject[propertyName];

    // Check if this is an element attribute (starts with data- or common attributes)
    if (targetObject instanceof HTMLElement && 
        (propertyName.startsWith('data-') || 
         ['id', 'class', 'title', 'alt', 'src', 'href', 'value'].includes(propertyName))) {
      targetObject.setAttribute(propertyName, String(value));
      return { oldValue, targetType: 'element-attribute' };
    } else {
      // Regular property assignment
      targetObject[propertyName] = value;
      return { oldValue, targetType: 'element-property' };
    }
  }

  private getContextValue(ref: string, context: TypedExecutionContext): any {
    switch (ref) {
      case 'me': return context.me;
      case 'it': return context.it;
      case 'you': return context.you;
      case 'result': return context.it; // result is an alias for it
      default: return undefined;
    }
  }

  private setContextValue(ref: string, value: any, context: TypedExecutionContext): void {
    switch (ref) {
      case 'me':
        context.me = value;
        break;
      case 'it':
      case 'result':
        context.it = value;
        break;
      case 'you':
        context.you = value;
        break;
    }
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
    
    return undefined;
  }

  private setVariableValue(name: string, value: any, context: TypedExecutionContext, preferredScope?: string): void {
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
 * Factory function to create the enhanced set command
 */
export function createEnhancedSetCommand(): EnhancedSetCommand {
  return new EnhancedSetCommand();
}

export default EnhancedSetCommand;