/**
 * Enhanced Transition Command Implementation
 * Animates CSS properties with transitions
 * 
 * Syntax: transition [<target>] <property> to <value> [over <duration>] [with <timing-function>]
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';
import { asHTMLElement } from '../../utils/dom-utils';

// Input type definition
export interface TransitionCommandInput {
  target?: string | HTMLElement; // Target element (defaults to me)
  property: string; // CSS property to animate
  value: string | number; // Target value
  duration?: number | string; // Duration in milliseconds or with unit
  timingFunction?: string; // Timing function (ease, linear, etc.)
  toKeyword?: 'to'; // Syntax support
  overKeyword?: 'over'; // Syntax support
  withKeyword?: 'with'; // Syntax support
}

// Output type definition
export interface TransitionCommandOutput {
  element: HTMLElement;
  property: string;
  fromValue: string;
  toValue: string;
  duration: number;
  completed: boolean;
}

/**
 * Enhanced Transition Command with full type safety and validation
 */
export class EnhancedTransitionCommand implements CommandImplementation<
  TransitionCommandInput,
  TransitionCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'transition',
    description: 'The transition command animates CSS properties using CSS transitions. It smoothly changes a property from its current value to a new value over a specified duration.',
    examples: [
      'transition opacity to 0.5',
      'transition <#box/> left to 100px over 500ms',
      'transition background-color to red over 1s with ease-in-out',
      'transition width to 200px'
    ],
    syntax: 'transition [<target>] <property> to <value> [over <duration>] [with <timing-function>]',
    category: 'animation' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<TransitionCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Transition command requires property and value',
            suggestions: ['Provide CSS property and target value']
          }],
          suggestions: ['Provide CSS property and target value']
        };
      }

      const inputObj = input as any;

      if (!inputObj.property || typeof inputObj.property !== 'string') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Transition command requires a CSS property',
            suggestions: ['Provide a CSS property name like "opacity", "width", "left"']
          }],
          suggestions: ['Provide a CSS property name like "opacity", "width", "left"']
        };
      }

      if (inputObj.value === undefined) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Transition command requires a target value',
            suggestions: ['Provide a target value for the CSS property']
          }],
          suggestions: ['Provide a target value for the CSS property']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          target: inputObj.target,
          property: inputObj.property,
          value: inputObj.value,
          duration: inputObj.duration,
          timingFunction: inputObj.timingFunction,
          toKeyword: inputObj.toKeyword,
          overKeyword: inputObj.overKeyword,
          withKeyword: inputObj.withKeyword
        }
      };
    }
  };

  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    const { target, value, duration: durationInput, timingFunction } = input;
    let { property } = input;

    // Handle CSS property prefix (*property means use the actual CSS property name)
    // In _hyperscript, * prefix indicates to use the property as-is
    if (property.startsWith('*')) {
      property = property.substring(1); // Remove the * prefix
    }

    // Convert camelCase to kebab-case for CSS properties
    property = property.replace(/([A-Z])/g, '-$1').toLowerCase();

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
      const htmlElement = asHTMLElement(context.me);
      if (!htmlElement) {
        throw new Error('context.me is not an HTMLElement');
      }
      targetElement = htmlElement;
    }

    // Parse duration
    const duration = this.parseDuration(durationInput || 300);

    // Get current value before transition
    const fromValue = getComputedStyle(targetElement).getPropertyValue(property);

    // Set up transition
    const originalTransition = targetElement.style.transition;
    const transitionProperty = `${property} ${duration}ms ${timingFunction || 'ease'}`;
    targetElement.style.transition = originalTransition 
      ? `${originalTransition}, ${transitionProperty}`
      : transitionProperty;

    // Apply the new value
    const toValue = String(value);
    targetElement.style.setProperty(property, toValue);

    // Wait for transition to complete
    const completed = await this.waitForTransition(targetElement, property, duration);

    // Clean up transition
    targetElement.style.transition = originalTransition;

    // Set the result in context
    Object.assign(context, { it: targetElement });

    return {
      element: targetElement,
      property,
      fromValue,
      toValue,
      duration,
      completed
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

  private parseDuration(value: number | string): number {
    if (typeof value === 'number') {
      return Math.max(0, value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Parse numeric milliseconds
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      
      // Parse with time units
      const match = trimmed.match(/^(\d*\.?\d+)(s|ms)?$/i);
      if (match) {
        const [, numberStr, unit] = match;
        const number = parseFloat(numberStr);
        
        if (!isNaN(number)) {
          return unit === 's' ? number * 1000 : number;
        }
      }
    }

    return 300; // Default duration
  }

  private async waitForTransition(
    element: HTMLElement, 
    property: string, 
    duration: number
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let completed = false;
      
      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.removeEventListener('transitioncancel', onTransitionCancel);
        clearTimeout(timeoutId);
      };
      
      const finish = (wasCompleted: boolean) => {
        if (!completed) {
          completed = true;
          cleanup();
          resolve(wasCompleted);
        }
      };
      
      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target === element && event.propertyName === property) {
          finish(true);
        }
      };
      
      const onTransitionCancel = (event: TransitionEvent) => {
        if (event.target === element && event.propertyName === property) {
          finish(false);
        }
      };
      
      // Listen for transition events
      element.addEventListener('transitionend', onTransitionEnd);
      element.addEventListener('transitioncancel', onTransitionCancel);
      
      // Set timeout as fallback
      const timeoutId = setTimeout(() => finish(true), duration + 50);
    });
  }
}

/**
 * Factory function to create the enhanced transition command
 */
export function createEnhancedTransitionCommand(): EnhancedTransitionCommand {
  return new EnhancedTransitionCommand();
}

export default EnhancedTransitionCommand;