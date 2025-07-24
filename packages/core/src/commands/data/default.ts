/**
 * Default Command Implementation
 * The default command sets values only if they don't already exist
 * Supports variables, attributes, and properties like the set command
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class DefaultCommand implements CommandImplementation {
  name = 'default';
  syntax = 'default <expression> to <expression>';
  description = 'The default command sets a value only if it doesn\'t already exist.';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('Default command requires at least 3 arguments');
    }

    // Handle property assignment syntax: default element property to value
    if (args.length === 4 && args[2] === 'to') {
      const [elementRef, propertyPath, keyword, value] = args;
      
      // Resolve the element reference (e.g., "my" -> context.me)
      const resolvedElement = this.resolveTarget(elementRef, context);
      return this.defaultElementProperty(resolvedElement, propertyPath, value);
    }
    
    // Standard syntax: default var to value
    const [target, keyword, value] = args;
    
    if (keyword !== 'to') {
      throw new Error('Default command requires "to" keyword');
    }

    if (typeof target === 'string') {
      // Handle attribute syntax: @attr or @data-attr
      if (target.startsWith('@')) {
        const attrName = target.substring(1);
        return this.defaultAttribute(context.me, attrName, value);
      }
      
      // Check for possessive expressions like "my innerHTML", "my textContent", etc.
      const possessiveMatch = target.match(/^(my|its?|your?)\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        
        let targetElement: any;
        if (possessive === 'my' && context.me) {
          targetElement = context.me;
        } else if (possessive === 'its' || possessive === 'it') {
          targetElement = context.it;
        } else if (possessive === 'your' || possessive === 'you') {
          targetElement = context.you;
        }
        
        if (targetElement) {
          return this.defaultElementProperty(targetElement, property, value);
        } else {
          throw new Error(`Context reference '${possessive}' is not available`);
        }
      }
      
      // Handle property access syntax like "me.prop"
      if (target.includes('.')) {
        const [elementRef, ...propertyParts] = target.split('.');
        const propertyPath = propertyParts.join('.');
        const resolvedElement = this.resolveTarget(elementRef, context);
        return this.defaultElementProperty(resolvedElement, propertyPath, value);
      }
      
      // Handle variable assignment or $ prefixed global variables
      if (target.startsWith('$')) {
        return this.defaultGlobalVariable(context, target, value);
      } else {
        return this.defaultLocalVariable(context, target, value);
      }
    } else {
      throw new Error(`Invalid default target: ${target}`);
    }
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'Default command requires at least 3 arguments';
    }
    
    // Handle property assignment syntax: default element property to value
    if (args.length === 4 && args[2] === 'to') {
      return null;
    }
    
    // Handle standard syntax
    if (args.length === 3 && args[1] !== 'to') {
      return 'Invalid default syntax. Expected "to" keyword';
    }
    
    return null;
  }

  private defaultLocalVariable(context: ExecutionContext, name: string, value: any): any {
    // Initialize locals if not present
    if (!context.locals) {
      context.locals = new Map();
    }
    
    // Only set if variable doesn't exist
    if (!context.locals.has(name)) {
      context.locals.set(name, value);
      return value;
    }
    
    // Return existing value
    return context.locals.get(name);
  }

  private defaultGlobalVariable(context: ExecutionContext, name: string, value: any): any {
    if (!context.globals) {
      context.globals = new Map();
    }
    
    // Only set if global doesn't exist
    if (!context.globals.has(name)) {
      context.globals.set(name, value);
      return value;
    }
    
    // Return existing value
    return context.globals.get(name);
  }

  private defaultAttribute(element: HTMLElement | null, attrName: string, value: any): any {
    if (!element) {
      throw new Error('Cannot set attribute on null element');
    }
    
    // Only set if attribute doesn't exist
    const existingValue = element.getAttribute(attrName);
    if (existingValue === null) {
      element.setAttribute(attrName, String(value));
      return value;
    }
    
    // Return existing value
    return existingValue;
  }

  private defaultElementProperty(target: any, propertyPath: string, value: any): any {
    if (target == null) {
      throw new Error('Cannot set property on null or undefined target');
    }

    const pathParts = propertyPath.split('.');
    let current = target;
    
    // Navigate to the parent of the final property, creating objects as needed
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current[part] == null) {
        // Property doesn't exist, so we need to set defaults all the way down
        current[part] = {};
      }
      current = current[part];
    }
    
    const finalProperty = pathParts[pathParts.length - 1];
    
    // Check if the final property already exists
    const hasProperty = finalProperty in current;
    const currentValue = current[finalProperty];
    
    // Only set if property doesn't exist or is undefined
    if (!hasProperty || currentValue === undefined) {
      try {
        // Handle special cases for DOM properties
        if (target instanceof HTMLElement && pathParts.length === 1) {
          if (finalProperty === 'disabled' || finalProperty === 'checked' || finalProperty === 'selected') {
            if (value) {
              target.setAttribute(finalProperty, String(value));
            } else {
              target.removeAttribute(finalProperty);
            }
          } else if (finalProperty.startsWith('data-')) {
            target.setAttribute(finalProperty, String(value));
          } else {
            target[finalProperty] = value;
          }
        } else {
          current[finalProperty] = value;
        }
        return value;
      } catch (error) {
        // If setting fails, try as attribute for DOM elements
        if (target instanceof HTMLElement && pathParts.length === 1) {
          target.setAttribute(finalProperty, String(value));
          return value;
        } else {
          throw error;
        }
      }
    }
    
    // Return existing value
    return currentValue;
  }

  private resolveTarget(target: any, context: ExecutionContext): any {
    // If target is already resolved, use it directly
    if (target instanceof HTMLElement || (typeof target === 'object' && target !== null)) {
      return target;
    }
    
    // If target is a string, treat as CSS selector or context reference
    if (typeof target === 'string') {
      if ((target === 'me' || target === 'my') && context.me) {
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
}

export default DefaultCommand;