/**
 * Enhanced Settle Command Implementation
 * Waits for CSS transitions and animations to complete
 * 
 * Syntax: settle [<target>] [for <timeout>]
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import { asHTMLElement } from '../../utils/dom-utils';

// Input type definition
export interface SettleCommandInput {
  target?: string | HTMLElement; // Target element (defaults to me)
  timeout?: number | string; // Timeout in milliseconds or with unit
  forKeyword?: 'for'; // Syntax support
}

// Output type definition
export interface SettleCommandOutput {
  element: HTMLElement;
  settled: boolean;
  timeout: number;
  duration: number;
}

/**
 * Enhanced Settle Command with full type safety and validation
 */
export class SettleCommand implements CommandImplementation<
  SettleCommandInput,
  SettleCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'settle',
    description: 'The settle command waits for CSS transitions and animations to complete on the target element. It monitors animation and transition events to determine when the element has settled.',
    examples: [
      'settle',
      'settle <#animated-element/>',
      'settle for 3000',
      'settle <.loading/> for 5s'
    ],
    syntax: 'settle [<target>] [for <timeout>]',
    category: 'animation' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<SettleCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: true,
        errors: [],
        suggestions: [],
          data: {} // Settle can work with no arguments
        };
      }

      const inputObj = input as any;

      // Validate timeout if provided
      if (inputObj.timeout !== undefined) {
        if (typeof inputObj.timeout === 'string') {
          const trimmed = inputObj.timeout.trim();
          if (!/^\d*\.?\d+(s|ms)?$/i.test(trimmed)) {
            return {
              isValid: false,
              errors: [{
                type: 'syntax-error',
                message: 'Invalid timeout format',
                suggestions: ['Use format like "3s", "500ms", or numeric milliseconds']
              }],
              suggestions: ['Use format like "3s", "500ms", or numeric milliseconds']
            };
          }
        } else if (typeof inputObj.timeout === 'number') {
          if (inputObj.timeout < 0) {
            return {
              isValid: false,
              errors: [{
                type: 'syntax-error',
                message: 'Timeout cannot be negative',
                suggestions: ['Use positive timeout values']
              }],
              suggestions: ['Use positive timeout values']
            };
          }
        } else {
          return {
            isValid: false,
            errors: [{
              type: 'type-mismatch',
              message: 'Timeout must be a number or string',
              suggestions: ['Use numeric milliseconds or string with unit like "3s"']
            }],
            suggestions: ['Use numeric milliseconds or string with unit like "3s"']
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          target: inputObj.target,
          timeout: inputObj.timeout,
          forKeyword: inputObj.forKeyword
        }
      };
    }
  };

  async execute(
    input: SettleCommandInput,
    context: TypedExecutionContext
  ): Promise<SettleCommandOutput> {
    const { target, timeout: timeoutInput } = input;

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

    // Parse timeout
    const timeout = this.parseTimeout(timeoutInput || 5000);

    // Wait for element to settle
    const startTime = Date.now();
    const settled = await this.waitForSettle(targetElement, timeout);
    const duration = Date.now() - startTime;

    // Set the result in context
    Object.assign(context, { it: targetElement });

    return {
      element: targetElement,
      settled,
      timeout,
      duration
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

  private parseTimeout(value: number | string): number {
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

    return 5000; // Default timeout
  }


  private async waitForSettle(element: HTMLElement, timeout: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      
      // Get computed styles to check for transitions/animations
      const computedStyle = getComputedStyle(element);
      const transitionDurations = this.parseDurations(computedStyle.transitionDuration);
      const transitionDelays = this.parseDurations(computedStyle.transitionDelay);
      const animationDurations = this.parseDurations(computedStyle.animationDuration);
      const animationDelays = this.parseDurations(computedStyle.animationDelay);
      
      // Calculate total time for transitions
      const maxTransitionTime = this.calculateMaxTime(transitionDurations, transitionDelays);
      const maxAnimationTime = this.calculateMaxTime(animationDurations, animationDelays);
      const totalAnimationTime = Math.max(maxTransitionTime, maxAnimationTime);
      
      // If no animations/transitions, settle immediately
      if (totalAnimationTime <= 0) {
        resolve(true);
        return;
      }
      
      // Set up event listeners for completion
      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.removeEventListener('animationend', onAnimationEnd);
        clearTimeout(timeoutId);
        clearTimeout(animationTimeoutId);
      };
      
      const settle = (wasTimeout = false) => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(!wasTimeout);
        }
      };
      
      const onTransitionEnd = (event: Event) => {
        if (event.target === element) {
          settle();
        }
      };
      
      const onAnimationEnd = (event: Event) => {
        if (event.target === element) {
          settle();
        }
      };
      
      // Listen for completion events
      element.addEventListener('transitionend', onTransitionEnd);
      element.addEventListener('animationend', onAnimationEnd);
      
      // Set timeout based on computed animation time (with small buffer)
      const animationTimeoutId = setTimeout(() => settle(), totalAnimationTime + 50);
      
      // Set overall timeout
      const timeoutId = setTimeout(() => settle(true), timeout);
    });
  }

  private parseDurations(durationString: string): number[] {
    if (!durationString || durationString === 'none') {
      return [0];
    }
    
    return durationString.split(',').map(duration => {
      const value = parseFloat(duration.trim());
      if (isNaN(value)) return 0;
      
      // Convert seconds to milliseconds
      if (duration.includes('s') && !duration.includes('ms')) {
        return value * 1000;
      }
      return value;
    });
  }

  private calculateMaxTime(durations: number[], delays: number[]): number {
    let maxTime = 0;
    
    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i] || 0;
      const delay = delays[i] || 0;
      const totalTime = duration + delay;
      maxTime = Math.max(maxTime, totalTime);
    }
    
    return maxTime;
  }
}

/**
 * Factory function to create the enhanced settle command
 */
export function createSettleCommand(): SettleCommand {
  return new SettleCommand();
}

export default SettleCommand;