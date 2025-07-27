/**
 * Enhanced Measure Command Implementation
 * Measures DOM element dimensions and positions
 * 
 * Syntax: measure [<target>] [<property>] [and set <variable>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface MeasureCommandInput {
  target?: string | HTMLElement; // Target element (defaults to me)
  property?: string; // Property to measure (width, height, etc.)
  variable?: string; // Variable to store result
  andKeyword?: 'and'; // Syntax support
  setKeyword?: 'set'; // Syntax support
}

// Output type definition
export interface MeasureCommandOutput {
  element: HTMLElement;
  property: string;
  value: number;
  unit: string;
  stored?: boolean;
}

/**
 * Enhanced Measure Command with full type safety and validation
 */
export class EnhancedMeasureCommand implements TypedCommandImplementation<
  MeasureCommandInput,
  MeasureCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'measure',
    description: 'The measure command measures DOM element dimensions, positions, and properties. It can measure width, height, positions, and store the result in a variable.',
    examples: [
      'measure',
      'measure <#element/> width',
      'measure height and set elementHeight',
      'measure <.box/> scrollTop and set scrollPosition'
    ],
    syntax: 'measure [<target>] [<property>] [and set <variable>]',
    category: 'animation' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<MeasureCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: {} // Measure can work with no arguments
        };
      }

      const inputObj = input as any;

      // Validate property if provided
      if (inputObj.property && typeof inputObj.property !== 'string') {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Property must be a string',
            suggestions: 'Use property names like "width", "height", "top", "left"'
          }
        };
      }

      // Validate variable name if provided
      if (inputObj.variable && typeof inputObj.variable !== 'string') {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Variable name must be a string',
            suggestions: 'Use valid variable names'
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
          variable: inputObj.variable,
          andKeyword: inputObj.andKeyword,
          setKeyword: inputObj.setKeyword
        }
      };
    }
  };

  async execute(
    input: MeasureCommandInput,
    context: TypedExecutionContext
  ): Promise<MeasureCommandOutput> {
    const { target, property, variable } = input;

    // Resolve target element (default to context.me)
    let targetElement: HTMLElement;
    if (target) {
      const resolved = await this.resolveElement(target, context);
      if (!resolved) {
        throw new Error(`Target element not found: ${target}`);
      }
      targetElement = resolved;
    } else {
      if (!context.me) {
        throw new Error('No target element available - provide explicit target or ensure context.me is available');
      }
      targetElement = context.me;
    }

    // Default property to 'width' if not specified
    const measureProperty = property || 'width';

    // Get the measurement
    const measurementResult = this.getMeasurement(targetElement, measureProperty);

    // Store in variable if specified
    if (variable) {
      if (context.locals) {
        context.locals.set(variable, measurementResult.value);
      }
    }

    // Set the result in context
    context.it = measurementResult.value;

    return {
      element: targetElement,
      property: measureProperty,
      value: measurementResult.value,
      unit: measurementResult.unit,
      stored: !!variable
    };
  }

  private async resolveElement(
    element: string | HTMLElement,
    context: TypedExecutionContext
  ): Promise<HTMLElement | null> {
    if (element instanceof HTMLElement) {
      return element;
    }

    if (typeof element === 'string') {
      const trimmed = element.trim();
      
      // Handle context references
      if (trimmed === 'me' && context.me) return context.me;
      if (trimmed === 'it' && context.it instanceof HTMLElement) return context.it;
      if (trimmed === 'you' && context.you) return context.you;

      // Handle CSS selector
      if (typeof document !== 'undefined') {
        try {
          const found = document.querySelector(trimmed);
          return found instanceof HTMLElement ? found : null;
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  private getMeasurement(element: HTMLElement, property: string): { value: number; unit: string } {
    const prop = property.toLowerCase();
    
    // Get bounding rect for position/size measurements
    const rect = element.getBoundingClientRect();
    const computedStyle = getComputedStyle(element);

    switch (prop) {
      case 'width':
        return { value: rect.width, unit: 'px' };
      
      case 'height':
        return { value: rect.height, unit: 'px' };
      
      case 'top':
        return { value: rect.top, unit: 'px' };
      
      case 'left':
        return { value: rect.left, unit: 'px' };
      
      case 'right':
        return { value: rect.right, unit: 'px' };
      
      case 'bottom':
        return { value: rect.bottom, unit: 'px' };
      
      case 'x':
        return { value: rect.x, unit: 'px' };
      
      case 'y':
        return { value: rect.y, unit: 'px' };
      
      case 'clientwidth':
      case 'client-width':
        return { value: element.clientWidth, unit: 'px' };
      
      case 'clientheight':
      case 'client-height':
        return { value: element.clientHeight, unit: 'px' };
      
      case 'offsetwidth':
      case 'offset-width':
        return { value: element.offsetWidth, unit: 'px' };
      
      case 'offsetheight':
      case 'offset-height':
        return { value: element.offsetHeight, unit: 'px' };
      
      case 'scrollwidth':
      case 'scroll-width':
        return { value: element.scrollWidth, unit: 'px' };
      
      case 'scrollheight':
      case 'scroll-height':
        return { value: element.scrollHeight, unit: 'px' };
      
      case 'scrolltop':
      case 'scroll-top':
        return { value: element.scrollTop, unit: 'px' };
      
      case 'scrollleft':
      case 'scroll-left':
        return { value: element.scrollLeft, unit: 'px' };
      
      case 'offsettop':
      case 'offset-top':
        return { value: element.offsetTop, unit: 'px' };
      
      case 'offsetleft':
      case 'offset-left':
        return { value: element.offsetLeft, unit: 'px' };

      // CSS property measurements
      default:
        const cssValue = computedStyle.getPropertyValue(property);
        const numericValue = parseFloat(cssValue);
        
        if (!isNaN(numericValue)) {
          // Extract unit from CSS value
          const unitMatch = cssValue.match(/([a-zA-Z%]+)$/);
          const unit = unitMatch ? unitMatch[1] : 'px';
          return { value: numericValue, unit };
        }
        
        // Return 0 if cannot parse
        return { value: 0, unit: 'px' };
    }
  }
}

/**
 * Factory function to create the enhanced measure command
 */
export function createEnhancedMeasureCommand(): EnhancedMeasureCommand {
  return new EnhancedMeasureCommand();
}

export default EnhancedMeasureCommand;