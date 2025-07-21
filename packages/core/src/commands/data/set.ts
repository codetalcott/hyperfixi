/**
 * Set Command Implementation
 * The set command allows you to set a value of a variable, property or the DOM.
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class SetCommand implements CommandImplementation {
  name = 'set';
  syntax = 'set <expression> to <expression>\n  set <object literal> on <expression>';
  description = 'The set command allows you to set a value of a variable, property or the DOM.';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('Set command requires at least 3 arguments');
    }

    // Handle global variable syntax: set global varName to value
    if (args[0] === 'global' && args.length >= 4) {
      const [, varName, keyword, value] = args;
      if (keyword !== 'to') {
        throw new Error('Set command requires "to" keyword');
      }
      
      this.setGlobalVariable(context, varName, value);
      return value;
    }

    // Handle object literal syntax: set { prop: val } on target
    if (typeof args[0] === 'object' && args[0] !== null && args[1] === 'on') {
      const [objectLiteral, , target, property] = args;
      
      let resolvedTarget = this.resolveTarget(target, context);
      
      // If property is specified (like 'style'), drill down
      if (property && typeof property === 'string') {
        resolvedTarget = this.drillDownProperty(resolvedTarget, property);
      }
      
      // Set all properties from the object literal
      this.setObjectProperties(resolvedTarget, objectLiteral);
      return objectLiteral;
    }

    // Handle standard syntax: set var to value or set target.property to value
    
    // Check for property assignment syntax: set element property to value
    if (args.length === 4 && args[2] === 'to') {
      const [element, propertyPath, keyword, value] = args;
      this.setElementProperty(element, propertyPath, value);
      return value;
    }
    
    // Standard syntax: set var to value
    const [target, keyword, value] = args;
    
    if (keyword !== 'to') {
      throw new Error('Set command requires "to" keyword');
    }

    if (typeof target === 'string') {
      // Handle variable assignment or $ prefixed global variables
      if (target.startsWith('$')) {
        this.setGlobalVariable(context, target, value);
      } else {
        this.setLocalVariable(context, target, value);
      }
    } else {
      throw new Error(`Invalid set target: ${target}`);
    }

    return value;
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'Set command requires at least 3 arguments';
    }
    
    // Handle global syntax
    if (args[0] === 'global' && args.length >= 4) {
      if (args[2] !== 'to') {
        return 'Set global syntax requires "to" keyword';
      }
      return null;
    }
    
    // Handle object literal syntax
    if (typeof args[0] === 'object' && args[0] !== null && args[1] === 'on') {
      return null;
    }
    
    // Handle property assignment syntax: set element property to value
    if (args.length === 4 && args[2] === 'to') {
      return null;
    }
    
    // Handle standard syntax
    if (args.length === 3 && args[1] !== 'to') {
      return 'Invalid set syntax. Expected "to" or object literal with "on"';
    }
    
    return null;
  }

  private setLocalVariable(context: ExecutionContext, name: string, value: any): void {
    if (!context.locals) {
      context.locals = new Map();
    }
    context.locals.set(name, value);
  }

  private setGlobalVariable(context: ExecutionContext, name: string, value: any): void {
    if (!context.globals) {
      context.globals = new Map();
    }
    context.globals.set(name, value);
  }

  private setElementProperty(target: any, propertyPath: string, value: any): void {
    if (target == null) {
      throw new Error('Cannot set property on null or undefined target');
    }

    const pathParts = propertyPath.split('.');
    let current = target;
    
    // Navigate to the parent of the final property
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current[part] == null) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const finalProperty = pathParts[pathParts.length - 1];
    
    try {
      // Handle special cases for DOM properties
      if (target instanceof HTMLElement) {
        if (finalProperty === 'disabled' || finalProperty === 'checked' || finalProperty === 'selected') {
          if (value) {
            target.setAttribute(finalProperty, String(value));
          } else {
            target.removeAttribute(finalProperty);
          }
        } else if (finalProperty.startsWith('data-')) {
          target.setAttribute(finalProperty, String(value));
        } else {
          // Try to set as property first, fallback to attribute
          try {
            current[finalProperty] = value;
          } catch (e) {
            // If property is read-only, ignore silently
            if (finalProperty === 'tagName' || finalProperty === 'nodeName') {
              // These are read-only, ignore
              return;
            }
            target.setAttribute(finalProperty, String(value));
          }
        }
      } else {
        current[finalProperty] = value;
      }
    } catch (error) {
      // If setting fails, try as attribute for DOM elements
      if (target instanceof HTMLElement) {
        target.setAttribute(finalProperty, String(value));
      } else {
        throw error;
      }
    }
  }

  private setObjectProperties(target: any, objectLiteral: Record<string, any>): void {
    for (const [key, value] of Object.entries(objectLiteral)) {
      if (target instanceof HTMLElement) {
        // Handle special DOM properties
        if (key === 'disabled' || key === 'checked' || key === 'selected') {
          // Set as property first, then as attribute for consistency
          try {
            (target as any)[key] = value;
          } catch (e) {
            // Fallback to attribute
          }
          
          if (value) {
            target.setAttribute(key, String(value));
          } else {
            target.removeAttribute(key);
          }
        } else if (key.startsWith('data-')) {
          target.setAttribute(key, String(value));
        } else if (key in target) {
          try {
            (target as any)[key] = value;
          } catch (e) {
            target.setAttribute(key, String(value));
          }
        } else {
          target.setAttribute(key, String(value));
        }
      } else {
        target[key] = value;
      }
    }
  }

  private resolveTarget(target: any, context: ExecutionContext): any {
    // If target is already resolved, use it directly
    if (target instanceof HTMLElement || (typeof target === 'object' && target !== null)) {
      return target;
    }
    
    // If target is a string, treat as CSS selector or context reference
    if (typeof target === 'string') {
      if (target === 'me' && context.me) {
        return context.me;
      } else if (target === 'it' && context.it) {
        return context.it;
      } else if (target === 'you' && context.you) {
        return context.you;
      } else if (target.startsWith('#') || target.startsWith('.') || target.includes('[')) {
        const element = document.querySelector(target);
        if (!element) {
          throw new Error(`Target element not found: ${target}`);
        }
        return element;
      }
    }
    
    return target;
  }

  private drillDownProperty(target: any, propertyPath: string): any {
    const parts = propertyPath.split('.');
    let current = target;
    
    for (const part of parts) {
      if (current[part] == null) {
        current[part] = {};
      }
      current = current[part];
    }
    
    return current;
  }
}

export default SetCommand;