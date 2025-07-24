/**
 * Take Command Implementation
 * Moves classes, attributes, and properties between elements
 */

import type { CommandImplementation, ExecutionContext } from '../../types/core.js';

export class TakeCommand implements CommandImplementation {
  name = 'take';
  syntax = 'take <property> from <source> [and put it on <target>]';
  description = 'Moves classes, attributes, and properties from one element to another';
  isBlocking = false;
  hasBody = false;
  
  async execute(context: ExecutionContext, ...args: any[]): Promise<HTMLElement> {
    const parsed = this.parseArguments(args, context);
    
    // Take the property from source
    const value = this.takeProperty(parsed.source, parsed.property);
    
    // Put it on target if specified, otherwise on context.me
    if (parsed.target) {
      this.putProperty(parsed.target, parsed.property, value);
    } else if (context.me) {
      this.putProperty(context.me, parsed.property, value);
    }
    
    // Return the target element
    return parsed.target || context.me!;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'Take command requires property and source element';
    }
    
    let i = 0;
    
    // Expect property name
    if (typeof args[i] !== 'string') {
      return 'Expected property name';
    }
    i++;
    
    // Check for minimum length after property
    if (i >= args.length) {
      return 'Take command requires property and source element';
    }
    
    // Expect "from" keyword
    if (args[i] !== 'from') {
      return 'Expected "from" keyword after property name';
    }
    i++;
    
    // Expect source element
    if (i >= args.length) {
      return 'Source element required after "from"';
    }
    i++;
    
    // Optional "and put it on" clause
    if (i < args.length) {
      if (args[i] === 'and' && i + 3 < args.length && 
          args[i + 1] === 'put' && args[i + 2] === 'it' && args[i + 3] === 'on') {
        if (i + 4 >= args.length) {
          return 'Target element required after "and put it on"';
        }
      } else {
        return 'Invalid take syntax. Expected "and put it on <target>" or end of command';
      }
    }
    
    return null;
  }

  private parseArguments(args: any[], context: ExecutionContext): TakeSpec {
    let property: string;
    let source: HTMLElement;
    let target: HTMLElement | undefined;
    
    let i = 0;
    
    // Parse property name
    property = String(args[i]);
    i++;
    
    // Skip "from" keyword
    i++; // "from"
    
    // Parse source element
    if (args[i] instanceof HTMLElement) {
      source = args[i];
    } else if (typeof args[i] === 'string') {
      source = this.resolveElement(args[i]);
    } else {
      throw new Error('Invalid source element');
    }
    i++;
    
    // Parse optional target
    if (i < args.length && args[i] === 'and' && 
        i + 3 < args.length && args[i + 1] === 'put' && 
        args[i + 2] === 'it' && args[i + 3] === 'on') {
      i += 4; // Skip "and put it on"
      
      if (args[i] instanceof HTMLElement) {
        target = args[i];
      } else if (typeof args[i] === 'string') {
        target = this.resolveElement(args[i]);
      } else {
        throw new Error('Invalid target element');
      }
    }
    
    return { property, source, target };
  }

  private takeProperty(element: HTMLElement, property: string): any {
    // Keep original case for CSS properties, but use lowercase for comparisons
    const prop = property;
    
    const lowerProp = prop.toLowerCase();
    
    // Handle CSS classes
    if (lowerProp === 'class' || lowerProp === 'classes') {
      const classes = Array.from(element.classList);
      element.className = ''; // Remove all classes
      return classes;
    }
    
    // Handle specific class
    if (prop.startsWith('.')) {
      const className = prop.substring(1);
      if (element.classList.contains(className)) {
        element.classList.remove(className);
        return className;
      }
      return null;
    }
    
    // Handle attributes
    if (prop.startsWith('@') || prop.startsWith('data-')) {
      const attrName = prop.startsWith('@') ? prop.substring(1) : prop;
      const value = element.getAttribute(attrName);
      element.removeAttribute(attrName);
      return value;
    }
    
    // Handle common attributes
    if (lowerProp === 'id') {
      const value = element.id;
      element.id = '';
      return value;
    }
    
    if (lowerProp === 'title') {
      const value = element.title;
      element.title = '';
      return value;
    }
    
    if (lowerProp === 'value' && 'value' in element) {
      const value = (element as HTMLInputElement).value;
      (element as HTMLInputElement).value = '';
      return value;
    }
    
    // Handle CSS properties  
    const camelProperty = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Check if it's a CSS property (either kebab-case or already camelCase)
    if (prop.includes('-') || camelProperty in element.style || prop in element.style) {
      let value: string;
      
      // Try camelCase first, then original property name, then kebab-case
      if (camelProperty in element.style) {
        value = (element.style as any)[camelProperty];
        (element.style as any)[camelProperty] = '';
      } else if (prop in element.style) {
        value = (element.style as any)[prop];
        (element.style as any)[prop] = '';
      } else {
        value = element.style.getPropertyValue(prop);
        element.style.removeProperty(prop);
      }
      
      return value;
    }
    
    // Handle generic attributes
    const value = element.getAttribute(property);
    if (value !== null) {
      element.removeAttribute(property);
      return value;
    }
    
    return null;
  }

  private putProperty(element: HTMLElement, property: string, value: any): void {
    if (value === null || value === undefined) {
      return; // Nothing to put
    }
    
    const prop = property;
    const lowerProp = prop.toLowerCase();
    
    // Handle CSS classes
    if (lowerProp === 'class' || lowerProp === 'classes') {
      if (Array.isArray(value)) {
        value.forEach(className => {
          if (className) element.classList.add(className);
        });
      } else if (typeof value === 'string') {
        element.className = value;
      }
      return;
    }
    
    // Handle specific class
    if (prop.startsWith('.')) {
      const className = prop.substring(1);
      if (value) {
        element.classList.add(className);
      }
      return;
    }
    
    // Handle attributes
    if (prop.startsWith('@') || prop.startsWith('data-')) {
      const attrName = prop.startsWith('@') ? prop.substring(1) : prop;
      if (value) {
        element.setAttribute(attrName, String(value));
      }
      return;
    }
    
    // Handle common attributes
    if (lowerProp === 'id') {
      element.id = String(value || '');
      return;
    }
    
    if (lowerProp === 'title') {
      element.title = String(value || '');
      return;
    }
    
    if (lowerProp === 'value' && 'value' in element) {
      (element as HTMLInputElement).value = String(value || '');
      return;
    }
    
    // Handle CSS properties
    const camelProperty = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (prop.includes('-') || camelProperty in element.style || prop in element.style) {
      if (camelProperty in element.style) {
        (element.style as any)[camelProperty] = value;
      } else if (prop in element.style) {
        (element.style as any)[prop] = value;
      } else {
        element.style.setProperty(prop, String(value));
      }
      return;
    }
    
    // Handle generic attributes
    if (value) {
      element.setAttribute(property, String(value));
    }
  }

  private resolveElement(selector: string): HTMLElement {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Take element not found: ${selector}`);
    }
    return element as HTMLElement;
  }
}

interface TakeSpec {
  property: string;
  source: HTMLElement;
  target?: HTMLElement;
}