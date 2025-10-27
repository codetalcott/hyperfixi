/**
 * Enhanced Trigger Command - Deep TypeScript Integration
 * The trigger command is a specialized event dispatcher using "trigger X on Y" syntax
 * Simpler alternative to send command with cleaner syntax for event triggering
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core';
import type { TypedResult } from '../../types/base-types';
import type { UnifiedValidationResult } from '../../types/unified-types';
import { asHTMLElement } from '../../utils/dom-utils';

/**
 * Input validation schema for LLM understanding
 */
const TriggerCommandInputSchema = v.tuple([
  v.string().min(1), // Event name (required)
  v.union([
    v.literal('on'),
    v.any() // Event data or 'on' keyword
  ]).optional(),
  v.union([
    v.custom((value: unknown) => value instanceof HTMLElement),
    v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
    v.string(), // CSS selector or context reference
    v.null(),
    v.undefined()
  ]).optional() // Target element(s)
]).rest(); // Allow additional arguments

type TriggerCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Trigger Command with full type safety for LLM agents
 */
export class TriggerCommand implements TypedCommandImplementation<
  TriggerCommandInput,
  CustomEvent,  // Returns the triggered event
  TypedExecutionContext
> {
  public readonly name = 'trigger' as const;
  public readonly syntax = 'trigger <event-name> [<data>] on <target>';
  public readonly description = 'Triggers custom events on target elements using clean "trigger X on Y" syntax';
  public readonly inputSchema = TriggerCommandInputSchema;
  public readonly outputType = 'event' as const;
  
  public readonly metadata: CommandMetadata = {
    category: 'Event',
    complexity: 'simple',
    sideEffects: ['event-emission'],
    examples: [
      {
        code: 'trigger click on <#button/>',
        description: 'Trigger click event on button element',
        expectedOutput: {}
      },
      {
        code: 'trigger customEvent {data: "test"} on me',
        description: 'Trigger custom event with data on current element',
        expectedOutput: {}
      },
      {
        code: 'trigger dataLoaded on <.components/>',
        description: 'Trigger dataLoaded event on all component elements',
        expectedOutput: {}
      }
    ],
    relatedCommands: ['send', 'on', 'dispatch']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Triggers custom events on HTML elements using clean "trigger X on Y" syntax',
    parameters: [
      {
        name: 'eventName',
        type: 'string',
        description: 'Name of the event to trigger',
        optional: false,
        examples: ['click', 'customEvent', 'dataLoaded', 'userAction']
      },
      {
        name: 'eventData',
        type: 'object',
        description: 'Optional data to include in event.detail',
        optional: true,
        examples: ['{data: "value"}', '{count: 5}', 'null']
      },
      {
        name: 'onKeyword',
        type: 'string',
        description: 'Keyword "on" indicating target specification',
        optional: false,
        examples: ['on']
      },
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to trigger event on',
        optional: false,
        examples: ['me', '<#modal/>', '<.buttons/>', 'document']
      }
    ],
    returns: {
      type: 'event',
      description: 'The CustomEvent that was triggered',
      examples: [{}]
    },
    examples: [
      {
        title: 'Simple event trigger',
        code: 'on click trigger customEvent on <#target/>',
        explanation: 'When clicked, triggers a customEvent on the target element',
        output: {}
      },
      {
        title: 'Event with data payload',
        code: 'trigger userAction {action: "save", id: 123} on me',
        explanation: 'Triggers userAction event with data on current element',
        output: {}
      },
      {
        title: 'Multiple target triggering',
        code: 'trigger dataLoaded on <.widgets/>',
        explanation: 'Triggers dataLoaded event on all elements with widgets class',
        output: {}
      }
    ],
    seeAlso: ['send', 'on', 'addEventListener', 'dispatchEvent'],
    tags: ['events', 'custom-events', 'trigger', 'dispatch']
  };

  async execute(
    context: TypedExecutionContext,
    ...args: TriggerCommandInput
  ): Promise<TypedResult<CustomEvent>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
                        type: 'validation-error',
                        message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'TRIGGER_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }
      
      // Parse arguments using "trigger eventName [data] on target" pattern
      const parseResult = this.parseArguments(args);
      if (!parseResult.success) {
        return {
          success: false,
          error: {
                        type: 'syntax-error',
                        message: parseResult.error || 'Failed to parse arguments',
            code: 'ARGUMENT_PARSE_FAILED',
            suggestions: [ 'Use: trigger eventName on target', 'Use: trigger eventName data on target']
          },
          type: 'error'
        };
      }
      
      const { eventName = '', eventData, target } = parseResult;
      
      // Resolve target elements
      const targetResult = await this.resolveTargetElements(target, context);
      if (!targetResult.success) {
        return {
          success: false,
          error: {
                        type: 'runtime-error',
                        message: targetResult.error || 'Failed to resolve target elements',
            code: 'TARGET_RESOLUTION_FAILED',
            suggestions: [ 'Check if target elements exist', 'Verify selector syntax']
          },
          type: 'error'
        };
      }
      
      const targetElements = targetResult.elements;
      
      if (!targetElements) {
        return {
          success: false,
          error: {
                        type: 'missing-argument',
                        message: 'No target elements found',
            code: 'NO_TARGET_ELEMENTS',
            suggestions: ['Check if target elements exist', 'Verify selector syntax']
          },
          type: 'error'
        };
      }
      
      // Create and trigger the event
      const eventResult = await this.createAndTriggerEvent(
        eventName,
        eventData,
        targetElements,
        context
      );
      
      if (!eventResult.success) {
        return {
          success: false,
          error: {
                        type: 'runtime-error',
                        message: eventResult.error || 'Failed to trigger event',
            code: 'EVENT_TRIGGER_FAILED',
            suggestions: [ 'Check if target elements are valid', 'Verify event name format']
          },
          type: 'error'
        };
      }
      
      const event = eventResult.event;
      
      // Store result in context
      Object.assign(context, { it: event });
      
      return {
        success: true,
        ...(event && { value: event }),
        type: 'event'
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
                    type: 'runtime-error',
                    message: error instanceof Error ? error.message : 'Unknown error',
          code: 'TRIGGER_EXECUTION_FAILED',
          suggestions: [ 'Check event name and arguments', 'Verify target elements exist']
        },
        type: 'error'
      };
    }
  }

  private parseArguments(args: any[]): {
    success: boolean;
    eventName?: string;
    eventData?: any;
    target?: any;
    error?: string;
  } {
    try {
      const [eventName, ...rest] = args;
      
      // Find 'on' keyword position
      let onIndex = -1;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === 'on') {
          onIndex = i;
          break;
        }
      }
      
      if (onIndex === -1) {
        return {
          success: false,
          error: 'Trigger command requires "on" keyword to specify target'
        };
      }
      
      // Everything before 'on' is event data, everything after is target
      const dataArgs = rest.slice(0, onIndex);
      const target = rest[onIndex + 1];
      
      // Parse event data (single object or null)
      let eventData: any = {};
      if (dataArgs.length === 1) {
        const data = dataArgs[0];
        if (data !== null && data !== undefined) {
          if (typeof data === 'object' && !Array.isArray(data)) {
            eventData = data;
          } else {
            eventData = { data };
          }
        }
      } else if (dataArgs.length > 1) {
        // Multiple data arguments - combine into object
        eventData = { args: dataArgs };
      }
      
      return {
        success: true,
        eventName,
        eventData,
        target
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse arguments'
      };
    }
  }
  
  private async resolveTargetElements(
    target: any,
    context: TypedExecutionContext
  ): Promise<{
    success: boolean;
    elements?: HTMLElement[];
    error?: string;
  }> {
    try {
      if (!target) {
        return {
          success: false,
          error: 'Trigger command requires a target after "on" keyword'
        };
      }
      
      const targetElements = this.resolveTargets(target, context);
      
      if (targetElements.length === 0) {
        return {
          success: false,
          error: 'No valid target elements found'
        };
      }
      
      return {
        success: true,
        elements: targetElements
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve target elements'
      };
    }
  }
  
  private async createAndTriggerEvent(
    eventName: string,
    eventData: any,
    targetElements: HTMLElement[],
    context: TypedExecutionContext
  ): Promise<{
    success: boolean;
    event?: CustomEvent;
    error?: string;
  }> {
    try {
      // Create the event
      const event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail: eventData || {}
      });
      
      let triggeredCount = 0;
      const errors: string[] = [];
      
      for (const element of targetElements) {
        try {
          element.dispatchEvent(event);
          triggeredCount++;
          
          // Dispatch enhanced trigger event with rich metadata
          const triggerEvent = new CustomEvent('hyperscript:trigger', {
            detail: {
              element,
              context,
              command: this.name,
              eventName,
              eventData,
              timestamp: Date.now(),
              metadata: this.metadata,
              result: 'success'
            }
          });
          element.dispatchEvent(triggerEvent);
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to trigger on element: ${errorMsg}`);
        }
      }
      
      // If no elements were successfully triggered, return error
      if (triggeredCount === 0) {
        return {
          success: false,
          error: errors.length > 0 ? errors.join(', ') : 'No events were triggered'
        };
      }
      
      return {
        success: true,
        event
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create or trigger event'
      };
    }
  }

  private resolveTargets(target: any, context: TypedExecutionContext): HTMLElement[] {
    // If target is already an element, return it
    if (target instanceof HTMLElement) {
      return [target];
    }

    // If target is a NodeList or array of elements
    if (target instanceof NodeList) {
      return Array.from(target) as HTMLElement[];
    }
    if (Array.isArray(target)) {
      return target.filter(item => item instanceof HTMLElement);
    }

    // If target is a string, resolve it
    if (typeof target === 'string') {
      // Handle context references
      if (target === 'me' && context.me) {
        const htmlElement = asHTMLElement(context.me);
        return htmlElement ? [htmlElement] : [];
      } else if (target === 'you' && context.you) {
        const htmlElement = asHTMLElement(context.you);
        return htmlElement ? [htmlElement] : [];
      } else if (target === 'it' && context.it instanceof HTMLElement) {
        return [context.it];
      }

      // Handle variable references
      const variable = this.getVariableValue(target, context);
      if (variable instanceof HTMLElement) {
        return [variable];
      }
      if (variable instanceof NodeList) {
        return Array.from(variable) as HTMLElement[];
      }
      if (Array.isArray(variable)) {
        return variable.filter(item => item instanceof HTMLElement);
      }

      // Handle CSS selectors
      if (this.isCSSSelector(target)) {
        const elements = this.querySelectorAll(target);
        if (elements.length === 0) {
          throw new Error(`Target element not found: ${target}`);
        }
        return elements;
      }

      // If it's a tag selector like <form />
      if (target.startsWith('<') && target.endsWith('/>')) {
        const tagName = target.slice(1, -2).split(/[\s\.#]/)[0];
        return this.querySelectorAll(tagName);
      }
    }

    throw new Error(`Unable to resolve target: ${target}`);
  }

  private getVariableValue(name: string, context: TypedExecutionContext): any {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }

    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }

    return undefined;
  }

  private isCSSSelector(selector: string): boolean {
    // Common patterns for CSS selectors
    return selector.startsWith('#') || 
           selector.startsWith('.') || 
           selector.includes('[') || 
           selector.includes(':') ||
           /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector); // Simple tag selector
  }

  private querySelectorAll(selector: string): HTMLElement[] {
    try {
      if (typeof document !== 'undefined') {
        // For single element selectors like #id, use querySelector first
        if (selector.startsWith('#') && !selector.includes(' ')) {
          const element = document.querySelector(selector);
          return element ? [element as HTMLElement] : [];
        }
        
        const elements = document.querySelectorAll(selector);
        return Array.from(elements) as HTMLElement[];
      }
      
      return [];
    } catch (error) {
      throw new Error(`Invalid CSS selector: ${selector}`);
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Basic argument validation
      if (args.length < 3) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Trigger command requires at least: eventName, "on", target',
            suggestions: ['Use: trigger eventName on target']
          }],
          suggestions: [ 'Use: trigger "click" on element', 'Use: trigger "custom" data on target']
        };
      }
      
      const [eventName] = args;
      if (typeof eventName !== 'string') {
        return {
          isValid: false,
          errors: [{
            type: 'type-mismatch',
            message: 'Event name must be a string',
            suggestions: ['Use a string for the event name']
          }],
          suggestions: [ 'Use quotes around event name', 'Example: trigger "click" on element']
        };
      }
      
      if (!eventName.trim()) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Event name cannot be empty',
            suggestions: ['Provide a valid event name']
          }],
          suggestions: ['Use meaningful event names like "click", "custom", etc.']
        };
      }
      
      // Check for 'on' keyword
      let hasOnKeyword = false;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === 'on') {
          hasOnKeyword = true;
          
          // Check if target exists after 'on'
          if (i === args.length - 1) {
            return {
              isValid: false,
              errors: [{
                type: 'missing-argument',
                message: 'Trigger command requires target after "on"',
                suggestions: ['Specify target element after "on" keyword']
              }],
              suggestions: [ 'Use: trigger event on <#element/>', 'Use: trigger event on me']
            };
          }
          break;
        }
      }
      
      if (!hasOnKeyword) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: 'Trigger command requires "on" keyword to specify target',
            suggestions: ['Use "on" keyword before target specification']
          }],
          suggestions: [ 'Use: trigger eventName on target', 'Use: trigger eventName data on target']
        };
      }
      
      return {
        isValid: true,
        errors: [],
        suggestions: []
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: ['Check input types and values']
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 5KB
 * @llm-description Type-safe trigger command for event dispatching with clean "trigger X on Y" syntax
 */
export function createTriggerCommand(): TriggerCommand {
  return new TriggerCommand();
}

// Default export for convenience
export default TriggerCommand;