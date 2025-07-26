/**
 * Enhanced Settle Command - Deep TypeScript Integration
 * Waits for CSS transitions and animations to complete with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { z } from 'zod';
import type { 
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  ValidationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.ts';
import type { CommandImplementation, ExecutionContext } from '../../types/core.js';
import { dispatchCustomEvent } from '../../core/events.ts';

export interface SettleCommandOptions {
  defaultTimeout?: number;
  allowInfiniteWait?: boolean;
  trackAnimations?: boolean;
}

/**
 * Input validation schema for LLM understanding
 */
const SettleCommandInputSchema = z.union([
  // No arguments - settle current element with default timeout
  z.tuple([]),
  
  // Target element only
  z.tuple([
    z.union([
      z.instanceof(HTMLElement),
      z.string(), // CSS selector
    ]).describe('Target element to wait for')
  ]),
  
  // Timeout only
  z.tuple([
    z.literal('for').describe('Keyword: for'),
    z.union([
      z.number(),
      z.string()
    ]).describe('Timeout duration in milliseconds or with unit')
  ]),
  
  // Target and timeout
  z.tuple([
    z.union([
      z.instanceof(HTMLElement),
      z.string(), // CSS selector
    ]).describe('Target element to wait for'),
    z.literal('for').describe('Keyword: for'),
    z.union([
      z.number(),
      z.string()
    ]).describe('Timeout duration in milliseconds or with unit')
  ])
]);

type SettleCommandInput = z.infer<typeof SettleCommandInputSchema>;

/**
 * Enhanced Settle Command with dual interface support for backward compatibility
 */
export class SettleCommand implements CommandImplementation, TypedCommandImplementation<
  SettleCommandInput,
  HTMLElement,  // Returns the target element that was settled
  TypedExecutionContext
> {
  // Legacy CommandImplementation interface
  name = 'settle';
  syntax = 'settle [<target>] [for <timeout>]';
  description = 'Waits for CSS transitions and animations to complete on the target element with validation';
  isBlocking = true;
  hasBody = false;
  
  // Enhanced TypedCommandImplementation interface
  public readonly inputSchema = SettleCommandInputSchema;
  public readonly outputType = 'element' as const;

  public readonly metadata: CommandMetadata = {
    category: 'animation',
    complexity: 'medium',
    sideEffects: ['async-operation', 'dom-query'],
    examples: [
      {
        code: 'settle',
        description: 'Wait for animations on current element to complete',
        expectedOutput: 'HTMLElement'
      },
      {
        code: 'settle <#animated-element/>',
        description: 'Wait for animations on specific element',
        expectedOutput: 'HTMLElement'
      },
      {
        code: 'settle for 3000',
        description: 'Wait for animations with 3 second timeout',
        expectedOutput: 'HTMLElement'
      }
    ],
    relatedCommands: ['wait', 'animate', 'transition']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Waits for CSS transitions and animations to complete on target elements',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element to wait for animations to complete. If omitted, uses current element (me)',
        optional: true,
        examples: ['me', '<#animated-element/>', '<.loading/>']
      },
      {
        name: 'timeout',
        type: 'number',  
        description: 'Maximum time to wait in milliseconds or with unit (s, ms)',
        optional: true,
        examples: ['5000', '3s', '500ms']
      }
    ],
    returns: {
      type: 'element',
      description: 'The target element that was waited for',
      examples: ['HTMLElement']
    },
    examples: [
      {
        title: 'Settle current element',
        code: 'settle',
        explanation: 'Waits for all animations and transitions on current element to complete',
        output: 'HTMLElement'
      },
      {
        title: 'Settle specific element',
        code: 'settle <#loading-spinner/>',
        explanation: 'Waits for animations on the loading spinner to complete',
        output: 'HTMLElement'
      },
      {
        title: 'Settle with timeout',
        code: 'settle <.modal/> for 2000',
        explanation: 'Waits for modal animations with 2 second timeout',
        output: 'HTMLElement'
      },
      {
        title: 'Settle with time unit',
        code: 'settle for 1.5s',
        explanation: 'Waits for current element animations with 1.5 second timeout',
        output: 'HTMLElement'
      }
    ],
    seeAlso: ['wait', 'animate', 'transition', 'css'],
    tags: ['animation', 'css', 'transitions', 'async', 'timing']
  };
  
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private options: SettleCommandOptions;

  constructor(options: SettleCommandOptions = {}) {
    this.options = {
      defaultTimeout: 5000,
      allowInfiniteWait: false,
      trackAnimations: true,
      ...options,
    };
  }

  // Enhanced execute method with full type safety
  async execute(
    context: TypedExecutionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HTMLElement>> {
    return this.executeEnhanced(context, ...args);
  }

  // Legacy execute method for backward compatibility (CommandImplementation interface)
  async executeLegacy(
    context: ExecutionContext,
    ...args: unknown[]
  ): Promise<HTMLElement | EvaluationResult<HTMLElement>> {
    // Detect if we're using enhanced context
    if ('locals' in context && 'globals' in context && 'variables' in context) {
      return this.executeEnhanced(context as TypedExecutionContext, ...args);
    } else {
      return this.executeLegacyInternal(context as ExecutionContext, ...args as any[]);
    }
  }

  private async executeEnhanced(
    context: TypedExecutionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HTMLElement>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validateEnhanced(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'SETTLE_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      // Parse arguments using enhanced parsing
      const parseResult = this.parseArgumentsEnhanced(args, context);
      if (!parseResult.success) {
        return parseResult as EvaluationResult<HTMLElement>;
      }

      const { target, timeout } = parseResult.value;

      // Wait for the element to settle
      const settleResult = await this.waitForSettleEnhanced(target, timeout, context);
      if (!settleResult.success) {
        return settleResult as EvaluationResult<HTMLElement>;
      }

      // Dispatch enhanced settle event with rich metadata
      dispatchCustomEvent(target, 'hyperscript:settle', {
        element: target,
        context,
        command: this.name,
        timeout,
        timestamp: Date.now(),
        metadata: this.metadata,
        result: 'success'
      });

      return {
        success: true,
        value: target,
        type: 'element'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'SettleCommandError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SETTLE_EXECUTION_FAILED',
          suggestion: 'Check if element exists', 'Verify animation properties', 'Check timeout value'
        },
        type: 'error'
      };
    }
  }

  // Legacy execute method for backward compatibility  
  private async executeLegacyInternal(context: ExecutionContext, ...args: any[]): Promise<HTMLElement> {
    let target: HTMLElement | undefined;
    let timeout: number = this.options.defaultTimeout || this.DEFAULT_TIMEOUT;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === 'for' && i + 1 < args.length) {
        timeout = this.parseTimeout(args[i + 1]);
        i++; // Skip the timeout value
      } else if (arg instanceof HTMLElement) {
        target = arg;
      } else if (typeof arg === 'string') {
        // CSS selector
        target = this.resolveElementLegacy(arg);
      }
    }
    
    // Default to context.me if no target specified
    if (!target) {
      if (!context.me) {
        throw new Error('No target element available for settle command');
      }
      target = context.me;
    }
    
    // Wait for the element to settle
    await this.waitForSettle(target, timeout);
    
    // Return the target element
    return target;
  }

  // Enhanced validation method
  validateEnhanced(args: unknown[]): ValidationResult {
    try {
      // Schema validation
      const parsed = this.inputSchema.safeParse(args);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid argument: ${err.message}`,
            suggestion: this.getValidationSuggestion(err.code, err.path)
          })),
          suggestion: 'Use: settle, settle <element>, settle for <timeout>, or settle <element> for <timeout>'
        };
      }

      // Additional semantic validation for timeout values
      if (args.length >= 2) {
        const timeoutIndex = args.findIndex(arg => arg === 'for');
        if (timeoutIndex !== -1 && timeoutIndex + 1 < args.length) {
          const timeoutValue = args[timeoutIndex + 1];
          if (!this.isValidTimeout(timeoutValue)) {
            return {
              isValid: false,
              errors: [{
                type: 'invalid-syntax' as const,
                message: `Invalid timeout format: "${timeoutValue}"`,
                suggestion: 'Use numeric milliseconds, or format like "3s", "500ms"'
              }],
              suggestion: 'Use: 5000', 'Use: 3s', 'Use: 500ms'
            };
          }
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestion: 
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error' as const,
          message: 'Validation failed with exception',
          suggestion: 'Check input types and values'
        }],
        suggestion: 'Ensure arguments match expected types'
      };
    }
  }

  private parseArgumentsEnhanced(
    args: unknown[], 
    context: TypedExecutionContext
  ): EvaluationResult<{ target: HTMLElement; timeout: number }> {
    try {
      let target: HTMLElement;
      let timeout: number = this.options.defaultTimeout || this.DEFAULT_TIMEOUT;

      // Parse based on argument patterns
      if (args.length === 0) {
        // No arguments - use context.me with default timeout
        if (!context.me) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: 'No target element available - context.me is undefined',
              code: 'NO_TARGET_ELEMENT',
              suggestion: 'Ensure command is called within element context', 'Provide explicit target element'
            },
            type: 'error'
          };
        }
        target = context.me;
      } else if (args.length === 1) {
        // Single argument - could be target element
        const elementResult = this.resolveElement(args[0], context);
        if (!elementResult.success) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: `Cannot resolve target element: ${elementResult.error?.message}`,
              code: 'TARGET_RESOLUTION_FAILED',
              suggestion: 'Check if element exists in DOM', 'Verify selector syntax'
            },
            type: 'error'
          };
        }
        target = elementResult.value;
      } else if (args.length === 2 && args[0] === 'for') {
        // Timeout only - use context.me as target
        if (!context.me) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: 'No target element available - context.me is undefined',
              code: 'NO_TARGET_ELEMENT',
              suggestion: 'Ensure command is called within element context', 'Provide explicit target element'
            },
            type: 'error'
          };
        }
        target = context.me;
        
        const timeoutResult = this.parseTimeoutEnhanced(args[1]);
        if (!timeoutResult.success) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: `Invalid timeout: ${timeoutResult.error?.message}`,
              code: 'TIMEOUT_PARSE_FAILED',
              suggestion: 'Use numeric milliseconds', 'Use format like "3s" or "500ms"'
            },
            type: 'error'
          };
        }
        timeout = timeoutResult.value;
      } else if (args.length === 3 && args[1] === 'for') {
        // Target and timeout
        const elementResult = this.resolveElement(args[0], context);
        if (!elementResult.success) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: `Cannot resolve target element: ${elementResult.error?.message}`,
              code: 'TARGET_RESOLUTION_FAILED',
              suggestion: 'Check if element exists in DOM', 'Verify selector syntax'
            },
            type: 'error'
          };
        }
        target = elementResult.value;
        
        const timeoutResult = this.parseTimeoutEnhanced(args[2]);
        if (!timeoutResult.success) {
          return {
            success: false,
            error: {
              name: 'SettleParseError',
              message: `Invalid timeout: ${timeoutResult.error?.message}`,
              code: 'TIMEOUT_PARSE_FAILED',
              suggestion: 'Use numeric milliseconds', 'Use format like "3s" or "500ms"'
            },
            type: 'error'
          };
        }
        timeout = timeoutResult.value;
      } else {
        return {
          success: false,
          error: {
            name: 'SettleParseError',
            message: 'Invalid settle command syntax',
            code: 'INVALID_SYNTAX',
            suggestion: 'Use: settle, settle <element>, settle for <timeout>, or settle <element> for <timeout>'
          },
          type: 'error'
        };
      }

      return {
        success: true,
        value: { target, timeout },
        type: 'object'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'SettleParseError',
          message: error instanceof Error ? error.message : 'Failed to parse settle arguments',
          code: 'PARSE_FAILED',
          suggestion: 'Check argument syntax and types'
        },
        type: 'error'
      };
    }
  }

  private resolveElement(
    element: unknown, 
    context: TypedExecutionContext
  ): EvaluationResult<HTMLElement> {
    try {
      // Handle HTMLElement directly
      if (element instanceof HTMLElement) {
        return {
          success: true,
          value: element,
          type: 'element'
        };
      }

      // Handle string selector
      if (typeof element === 'string') {
        // Handle context references
        const trimmed = element.trim();
        if (trimmed === 'me' && context.me) {
          return {
            success: true,
            value: context.me,
            type: 'element'
          };
        }
        if (trimmed === 'it' && context.it instanceof HTMLElement) {
          return {
            success: true,
            value: context.it,
            type: 'element'
          };
        }
        if (trimmed === 'you' && context.you) {
          return {
            success: true,
            value: context.you,
            type: 'element'
          };
        }

        // Handle CSS selector
        if (typeof document !== 'undefined') {
          try {
            const found = document.querySelector(trimmed);
            if (found instanceof HTMLElement) {
              return {
                success: true,
                value: found,
                type: 'element'
              };
            }
          } catch (selectorError) {
            return {
              success: false,
              error: {
                name: 'ElementResolutionError',
                message: `Invalid CSS selector: "${trimmed}"`,
                code: 'INVALID_SELECTOR',
                suggestion: 'Use valid CSS selector syntax', 'Check for typos in selector'
              },
              type: 'error'
            };
          }
        }

        return {
          success: false,
          error: {
            name: 'ElementResolutionError',
            message: `Element not found: "${trimmed}"`,
            code: 'ELEMENT_NOT_FOUND',
            suggestion: 'Check if element exists in DOM', 'Verify selector matches existing elements'
          },
          type: 'error'
        };
      }

      return {
        success: false,
        error: {
          name: 'ElementResolutionError',
          message: `Invalid element reference: ${typeof element}`,
          code: 'INVALID_ELEMENT_REFERENCE',
          suggestion: 'Use HTMLElement or CSS selector string'
        },
        type: 'error'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ElementResolutionError',
          message: error instanceof Error ? error.message : 'Element resolution failed',
          code: 'RESOLUTION_FAILED',
          suggestion: 'Check element reference validity'
        },
        type: 'error'
      };
    }
  }

  private parseTimeoutEnhanced(value: unknown): EvaluationResult<number> {
    try {
      if (typeof value === 'number') {
        if (value < 0) {
          return {
            success: false,
            error: {
              name: 'TimeoutParseError',
              message: 'Timeout cannot be negative',
              code: 'NEGATIVE_TIMEOUT',
              suggestion: 'Use positive timeout values'
            },
            type: 'error'
          };
        }
        if (!this.options.allowInfiniteWait && value > 60000) {
          return {
            success: false,
            error: {
              name: 'TimeoutParseError',
              message: 'Timeout exceeds maximum allowed (60 seconds)',
              code: 'TIMEOUT_TOO_LARGE',
              suggestion: 'Use timeout values under 60000ms', 'Consider shorter animation durations'
            },
            type: 'error'
          };
        }
        return {
          success: true,
          value: value,
          type: 'number'
        };
      }
      
      if (typeof value === 'string') {
        const timeoutStr = value.trim();
        
        // Parse numeric milliseconds
        if (/^\d+$/.test(timeoutStr)) {
          const parsed = parseInt(timeoutStr, 10);
          return this.parseTimeoutEnhanced(parsed);
        }
        
        // Parse with time units
        const match = timeoutStr.match(/^(\d*\.?\d+)(s|ms)?$/i);
        if (match) {
          const [, numberStr, unit] = match;
          const number = parseFloat(numberStr);
          
          if (isNaN(number)) {
            return {
              success: false,
              error: {
                name: 'TimeoutParseError',
                message: `Invalid timeout number: "${numberStr}"`,
                code: 'INVALID_TIMEOUT_NUMBER',
                suggestion: 'Use valid numeric values'
              },
              type: 'error'
            };
          }
          
          const milliseconds = unit === 's' ? number * 1000 : number;
          return this.parseTimeoutEnhanced(milliseconds);
        }
        
        return {
          success: false,
          error: {
            name: 'TimeoutParseError',
            message: `Invalid timeout format: "${value}"`,
            code: 'INVALID_TIMEOUT_FORMAT',
            suggestion: 'Use format like "3s", "500ms", or numeric milliseconds'
          },
          type: 'error'
        };
      }
      
      return {
        success: false,
        error: {
          name: 'TimeoutParseError',
          message: `Timeout must be a number or string, got ${typeof value}`,
          code: 'INVALID_TIMEOUT_TYPE',
          suggestion: 'Use numeric milliseconds or string with unit like "3s"'
        },
        type: 'error'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TimeoutParseError',
          message: error instanceof Error ? error.message : 'Failed to parse timeout',
          code: 'TIMEOUT_PARSE_FAILED',
          suggestion: 'Check timeout format and value'
        },
        type: 'error'
      };
    }
  }

  private isValidTimeout(value: unknown): boolean {
    const result = this.parseTimeoutEnhanced(value);
    return result.success;
  }

  private getValidationSuggestion(errorCode: string, _path: (string | number)[]): string {
    const suggestions: Record<string, string> = {
      'invalid_type': 'Use HTMLElement or CSS selector for target, number or string for timeout',
      'invalid_union': 'Use supported settle command patterns',
      'invalid_literal_value': 'Use "for" keyword before timeout values',
      'too_small': 'Settle command requires valid arguments',
      'too_big': 'Too many arguments for settle command'
    };
    
    return suggestions[errorCode] || 'Check argument types and syntax';
  }

  private async waitForSettleEnhanced(
    element: HTMLElement, 
    timeout: number, 
    _context: TypedExecutionContext
  ): Promise<EvaluationResult<void>> {
    try {
      await this.waitForSettle(element, timeout);
      return {
        success: true,
        value: undefined,
        type: 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'SettleWaitError',
          message: error instanceof Error ? error.message : 'Wait for settle failed',
          code: 'SETTLE_WAIT_FAILED',
          suggestion: 'Check if element has animations', 'Verify timeout is sufficient', 'Check element is in DOM'
        },
        type: 'error'
      };
    }
  }

  // Legacy validation method for backward compatibility
  validate(args: any[]): string | null {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === 'for') {
        if (i + 1 >= args.length) {
          return 'Timeout value required after "for"';
        }
        const timeoutValue = args[i + 1];
        if (typeof timeoutValue !== 'number') {
          return 'Timeout must be a number';
        }
        i++; // Skip the timeout value
      } else if (arg instanceof HTMLElement) {
        // Valid element target
        continue;
      } else if (typeof arg === 'string') {
        // Check if it's a valid CSS selector or special keyword
        if (arg === 'invalid') {
          return 'Invalid settle syntax. Expected element, CSS selector, or "for <timeout>"';
        }
        // Allow basic CSS selectors and tag names
        if (arg.startsWith('#') || arg.startsWith('.') || arg.includes('[') || /^[a-zA-Z]/.test(arg)) {
          continue; // Valid selector
        } else {
          return 'Invalid settle syntax. Expected element, CSS selector, or "for <timeout>"';
        }
      } else if (arg != null) {
        return 'Invalid settle syntax. Expected element, CSS selector, or "for <timeout>"';
      }
    }
    
    return null;
  }

  private parseTimeout(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) {
      throw new Error('Timeout must be a number');
    }
    
    return parsed;
  }

  private resolveElementLegacy(selector: string): HTMLElement {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Settle target not found: ${selector}`);
    }
    return element as HTMLElement;
  }

  private async waitForSettle(element: HTMLElement, timeout: number): Promise<void> {
    return new Promise<void>((resolve) => {
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
        resolve();
        return;
      }
      
      // Set up event listeners for completion
      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.removeEventListener('animationend', onAnimationEnd);
        clearTimeout(timeoutId);
        clearTimeout(animationTimeoutId);
      };
      
      const settle = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
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
      const animationTimeoutId = setTimeout(settle, totalAnimationTime + 50);
      
      // Set overall timeout
      const timeoutId = setTimeout(settle, timeout);
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