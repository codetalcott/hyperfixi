/**
 * Measure Command Implementation
 * Measures DOM element dimensions and positions
 */

import type { CommandImplementation, ExecutionContext } from '../../types/core.js';

export class MeasureCommand implements CommandImplementation {
  name = 'measure';
  syntax = 'measure [<target>] [<property>] [and set <variable>]';
  description = 'Measures DOM element dimensions, positions, and properties';
  isBlocking = false;
  hasBody = false;
  
  async execute(context: ExecutionContext, ...args: any[]): Promise<HTMLElement | number> {
    const parsed = this.parseArguments(args, context);
    
    // Get the measurement
    const measurement = this.getMeasurement(parsed.target, parsed.property);
    
    // Set variable if specified
    if (parsed.variableName && context.locals) {
      context.locals.set(parsed.variableName, measurement);
    }
    
    // Return measurement value or target element
    return parsed.variableName ? parsed.target : measurement;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return null; // Valid to measure current element's default property
    }
    
    let i = 0;
    
    // Skip optional target
    if (args[i] instanceof HTMLElement || (typeof args[i] === 'string' && this.isTargetSelector(args[i]))) {
      i++;
    }
    
    // Skip optional property
    if (i < args.length && typeof args[i] === 'string' && this.isMeasurementProperty(args[i])) {
      i++;
    }
    
    // Check for 'and set' syntax
    if (i < args.length) {
      if (args[i] === 'and' && i + 1 < args.length && args[i + 1] === 'set') {
        if (i + 2 >= args.length) {
          return 'Variable name required after "and set"';
        }
        if (typeof args[i + 2] !== 'string') {
          return 'Variable name must be a string';
        }
      } else {
        return 'Invalid measure syntax. Expected "and set <variable>" or end of command';
      }
    }
    
    return null;
  }

  private parseArguments(args: any[], context: ExecutionContext): MeasureSpec {
    let target: HTMLElement = context.me!;
    let property: string = 'width';
    let variableName: string | undefined;
    
    let i = 0;
    
    // Parse optional target
    if (i < args.length) {
      if (args[i] instanceof HTMLElement) {
        target = args[i];
        i++;
      } else if (typeof args[i] === 'string' && this.isTargetSelector(args[i])) {
        target = this.resolveElement(args[i]);
        i++;
      }
    }
    
    // Parse optional property
    if (i < args.length && typeof args[i] === 'string' && this.isMeasurementProperty(args[i])) {
      property = args[i];
      i++;
    }
    
    // Parse optional 'and set' clause
    if (i < args.length && args[i] === 'and' && i + 1 < args.length && args[i + 1] === 'set') {
      if (i + 2 < args.length) {
        variableName = String(args[i + 2]);
      }
    }
    
    if (!target) {
      throw new Error('No target element available for measure command');
    }
    
    return { target, property, variableName };
  }

  private getMeasurement(element: HTMLElement, property: string): number {
    // Get computed styles for accurate measurements
    const computedStyle = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    switch (property.toLowerCase()) {
      case 'width':
        // For hidden elements, offsetWidth will be 0
        if (element.offsetWidth === 0 && computedStyle.display === 'none') {
          return 0;
        }
        // Fallback to computed style if getBoundingClientRect returns 0 (Happy-DOM limitation)
        return rect.width || parseFloat(computedStyle.width) || element.offsetWidth || 0;
      case 'height':  
        // For hidden elements, offsetHeight will be 0
        if (element.offsetHeight === 0 && computedStyle.display === 'none') {
          return 0;
        }
        return rect.height || parseFloat(computedStyle.height) || element.offsetHeight || 0;
      case 'top':
        return rect.top;
      case 'left':
        return rect.left;
      case 'right':
        return rect.right;
      case 'bottom':
        return rect.bottom;
      case 'x':
        return rect.x;
      case 'y':
        return rect.y;
      
      // Offset measurements
      case 'offsetwidth':
      case 'offset-width':
        // offsetWidth should be 0 for hidden elements, but fallback to computed style for visible elements
        return element.offsetWidth || (computedStyle.display !== 'none' ? parseFloat(computedStyle.width) || 0 : 0);
      case 'offsetheight':
      case 'offset-height':
        // offsetHeight should be 0 for hidden elements, but fallback to computed style for visible elements
        return element.offsetHeight || (computedStyle.display !== 'none' ? parseFloat(computedStyle.height) || 0 : 0);
      case 'offsettop':
      case 'offset-top':
        return element.offsetTop;
      case 'offsetleft':
      case 'offset-left':
        return element.offsetLeft;
      
      // Client measurements
      case 'clientwidth':
      case 'client-width':
        return element.clientWidth;
      case 'clientheight':
      case 'client-height':
        return element.clientHeight;
      case 'clienttop':
      case 'client-top':
        return element.clientTop;
      case 'clientleft':
      case 'client-left':
        return element.clientLeft;
      
      // Scroll measurements
      case 'scrollwidth':
      case 'scroll-width':
        return element.scrollWidth;
      case 'scrollheight':
      case 'scroll-height':
        return element.scrollHeight;
      case 'scrolltop':
      case 'scroll-top':
        return element.scrollTop;
      case 'scrollleft':
      case 'scroll-left':
        return element.scrollLeft;
      
      // Computed style measurements
      case 'margin-top':
        return parseFloat(computedStyle.marginTop) || 0;
      case 'margin-bottom':
        return parseFloat(computedStyle.marginBottom) || 0;
      case 'margin-left':
        return parseFloat(computedStyle.marginLeft) || 0;
      case 'margin-right':
        return parseFloat(computedStyle.marginRight) || 0;
      case 'padding-top':
        return parseFloat(computedStyle.paddingTop) || 0;
      case 'padding-bottom':
        return parseFloat(computedStyle.paddingBottom) || 0;
      case 'padding-left':
        return parseFloat(computedStyle.paddingLeft) || 0;
      case 'padding-right':
        return parseFloat(computedStyle.paddingRight) || 0;
      case 'border-top-width':
        return parseFloat(computedStyle.borderTopWidth) || 0;
      case 'border-bottom-width':
        return parseFloat(computedStyle.borderBottomWidth) || 0;
      case 'border-left-width':
        return parseFloat(computedStyle.borderLeftWidth) || 0;
      case 'border-right-width':
        return parseFloat(computedStyle.borderRightWidth) || 0;
      
      default:
        // Try to parse as a CSS property
        const cssValue = computedStyle.getPropertyValue(property);
        const numericValue = parseFloat(cssValue);
        return isNaN(numericValue) ? 0 : numericValue;
    }
  }

  private resolveElement(selector: string): HTMLElement {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Measure target not found: ${selector}`);
    }
    return element as HTMLElement;
  }

  private isTargetSelector(value: string): boolean {
    // Only consider it a target selector if it's clearly a CSS selector
    return value.startsWith('#') || value.startsWith('.') || value.includes('[') || 
           (value.includes(' ') && /^[a-zA-Z]/.test(value)) || // Compound selectors
           /^[a-zA-Z]+\s*>/.test(value) || // Child selector
           /^[a-zA-Z]+\s*\+/.test(value) || // Adjacent sibling
           /^[a-zA-Z]+\s*~/.test(value) || // General sibling
           value.includes(':'); // Pseudo selectors
  }

  private isMeasurementProperty(value: string): boolean {
    const properties = [
      'width', 'height', 'top', 'left', 'right', 'bottom', 'x', 'y',
      'offsetwidth', 'offset-width', 'offsetheight', 'offset-height',
      'offsettop', 'offset-top', 'offsetleft', 'offset-left',
      'clientwidth', 'client-width', 'clientheight', 'client-height',
      'clienttop', 'client-top', 'clientleft', 'client-left',
      'scrollwidth', 'scroll-width', 'scrollheight', 'scroll-height',
      'scrolltop', 'scroll-top', 'scrollleft', 'scroll-left',
      'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
      'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
      'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width'
    ];
    
    return properties.includes(value.toLowerCase()) || 
           value.includes('-') || // CSS property pattern
           /^[a-z]+[A-Z]/.test(value); // camelCase property pattern
  }
}

interface MeasureSpec {
  target: HTMLElement;
  property: string;
  variableName?: string;
}