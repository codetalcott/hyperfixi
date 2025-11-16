/**
 * Enhanced Measure Command Implementation
 * Measures DOM element dimensions and positions
 *
 * Syntax: measure [<target>] [<property>] [and set <variable>]
 *
 * IMPORTANT - Coordinate System Differences:
 * - x/y: Position relative to offsetParent (for drag/positioning within containers)
 * - left/top: Position relative to viewport (for absolute screen positioning)
 * - offsetLeft/offsetTop: Same as x/y (explicit offset positioning)
 *
 * Use x/y for draggable behaviors, left/top for viewport-based calculations
 *
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import { asHTMLElement } from '../../utils/dom-utils';

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
export class MeasureCommand
  implements CommandImplementation<MeasureCommandInput, MeasureCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'measure',
    description:
      'The measure command measures DOM element dimensions, positions, and properties. It can measure width, height, positions, and store the result in a variable.',
    examples: [
      'measure',
      'measure <#element/> width',
      'measure height and set elementHeight',
      'measure <.box/> scrollTop and set scrollPosition',
    ],
    syntax: 'measure [<target>] [<property>] [and set <variable>]',
    category: 'animation' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<MeasureCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: {}, // Measure can work with no arguments
        };
      }

      const inputObj = input as any;

      // Validate property if provided
      if (inputObj.property && typeof inputObj.property !== 'string') {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: 'Property must be a string',
              suggestions: ['Use property names like "width", "height", "top", "left"'],
            },
          ],
          suggestions: ['Use property names like "width", "height", "top", "left"'],
        };
      }

      // Validate variable name if provided
      if (inputObj.variable && typeof inputObj.variable !== 'string') {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: 'Variable name must be a string',
              suggestions: ['Use valid variable names'],
            },
          ],
          suggestions: ['Use valid variable names'],
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
          setKeyword: inputObj.setKeyword,
        },
      };
    },
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
        throw new Error(
          'No target element available - provide explicit target or ensure context.me is available'
        );
      }
      const htmlElement = asHTMLElement(context.me);
      if (!htmlElement) {
        throw new Error('context.me is not an HTMLElement');
      }
      targetElement = htmlElement;
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
    Object.assign(context, { it: measurementResult.value });

    // Return just the value (for `it` context and `put it into` commands)
    // Note: The full measurement details are available in context.it metadata if needed
    return measurementResult.value as any;
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
      if (trimmed === 'me' && context.me) return asHTMLElement(context.me);
      if (trimmed === 'it' && context.it instanceof HTMLElement) return context.it;
      if (trimmed === 'you' && context.you) return asHTMLElement(context.you);

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
    // Get computed style (used by both CSS property shorthand and default case)
    const computedStyle = getComputedStyle(element);

    // Handle CSS property shorthand syntax: *property (e.g., *opacity, *background-color)
    if (property.startsWith('*')) {
      const cssPropertyName = property.substring(1); // Remove * prefix (keep kebab-case)
      const value = computedStyle.getPropertyValue(cssPropertyName);

      // Try to parse as number
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        // Extract unit from value
        const unitMatch = value.match(/([a-zA-Z%]+)$/);
        const unit = unitMatch ? unitMatch[1] : '';
        return { value: numericValue, unit };
      }

      // Return string value as-is (for non-numeric CSS properties like colors)
      return { value: value as any, unit: '' };
    }

    const prop = property.toLowerCase();

    // Get bounding rect for position/size measurements
    const rect = element.getBoundingClientRect();

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
        // For draggable/positioning use cases, return offsetLeft (position relative to offsetParent)
        // not rect.x (position relative to viewport)
        return { value: element.offsetLeft, unit: 'px' };

      case 'y':
        // For draggable/positioning use cases, return offsetTop (position relative to offsetParent)
        // not rect.y (position relative to viewport)
        return { value: element.offsetTop, unit: 'px' };

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

  /**
   * Convert CSS property name from kebab-case to camelCase
   * Examples: 'opacity' → 'opacity', 'background-color' → 'backgroundColor'
   */
  private convertCSSProperty(property: string): string {
    // Convert kebab-case to camelCase
    return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

/**
 * Factory function to create the enhanced measure command
 */
export function createMeasureCommand(): MeasureCommand {
  return new MeasureCommand();
}

export default MeasureCommand;
