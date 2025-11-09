/**
 * Enhanced Send Command - Deep TypeScript Integration
 * The send command sends an event to the given target. Arguments can optionally be provided
 * in a named argument list and will be passed in the event.detail object.
 * You can alternatively use the equivalent trigger syntax.
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';
import { asHTMLElement } from '../../utils/dom-utils';

/**
 * Input validation schema for LLM understanding
 */
const SendCommandInputSchema = v
  .tuple([
    v.string().min(1), // Event name (required)
    v.any().optional(), // Event detail/arguments (optional)
    v.union([v.literal('to'), v.literal('on')]).optional(), // Target keyword
    v
      .union([
        v.custom((value: unknown) => value instanceof HTMLElement),
        v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
        v.string(), // CSS selector or context reference
        v.null(),
        v.undefined(),
      ])
      .optional(), // Target element(s)
  ])
  .rest(); // Allow additional arguments

type SendCommandInput = any; // Inferred from RuntimeValidator

/**
 * Enhanced Send Command with full type safety for LLM agents
 */
export class SendCommand
  implements
    TypedCommandImplementation<
      SendCommandInput,
      CustomEvent, // Returns the dispatched event
      TypedExecutionContext
    >
{
  public readonly name = 'send' as const;
  public readonly syntax =
    'send <event-name>[(<named arguments>)] [to <expression>]\ntrigger <event-name>[(<named arguments>)] [on <expression>]';
  public readonly description = 'Sends custom events to target elements with optional data payload';
  public readonly inputSchema = SendCommandInputSchema;
  public readonly outputType = 'event' as const;

  public readonly metadata: CommandMetadata = {
    category: 'Event',
    complexity: 'medium',
    sideEffects: ['event-emission'],
    examples: [
      {
        code: 'send click to <#button/>',
        description: 'Send click event to button element',
        expectedOutput: {},
      },
      {
        code: 'send customEvent {data: "test"} to me',
        description: 'Send custom event with data to current element',
        expectedOutput: {},
      },
      {
        code: 'trigger dataLoaded on <.components/>',
        description: 'Trigger dataLoaded event on all component elements',
        expectedOutput: {},
      },
    ],
    relatedCommands: ['trigger', 'on', 'dispatch'],
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Dispatches custom events to HTML elements with optional data payload',
    parameters: [
      {
        name: 'eventName',
        type: 'string',
        description: 'Name of the event to dispatch',
        optional: false,
        examples: ['click', 'customEvent', 'dataLoaded', 'userAction'],
      },
      {
        name: 'eventDetail',
        type: 'object',
        description: 'Optional data to include in event.detail',
        optional: true,
        examples: ['{data: "value"}', '{count: 5}', 'null'],
      },
      {
        name: 'targetKeyword',
        type: 'string',
        description: 'Keyword indicating target specification',
        optional: true,
        examples: ['to', 'on'],
      },
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to send event to. If omitted, sends to current element (me)',
        optional: true,
        examples: ['me', '<#modal/>', '<.buttons/>', 'document'],
      },
    ],
    returns: {
      type: 'event',
      description: 'The CustomEvent that was dispatched',
      examples: [{}],
    },
    examples: [
      {
        title: 'Simple event dispatch',
        code: 'on click send customEvent to <#target/>',
        explanation: 'When clicked, sends a customEvent to the target element',
        output: {},
      },
      {
        title: 'Event with data payload',
        code: 'send userAction {action: "save", id: 123} to me',
        explanation: 'Sends userAction event with data to current element',
        output: {},
      },
      {
        title: 'Trigger syntax alternative',
        code: 'trigger dataLoaded on <.widgets/>',
        explanation: 'Alternative trigger syntax - sends dataLoaded to all widgets',
        output: {},
      },
    ],
    seeAlso: ['trigger', 'on', 'addEventListener', 'dispatchEvent'],
    tags: ['events', 'custom-events', 'dispatch', 'communication'],
  };

  async execute(
    context: TypedExecutionContext,
    ...args: SendCommandInput
  ): Promise<EvaluationResult<CustomEvent>> {
    try {
      // Runtime validation for type safety
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'SEND_VALIDATION_FAILED',
            suggestions: validationResult.suggestions,
          },
          type: 'error',
        };
      }

      const [eventName, ...rest] = args;

      // Parse arguments for event details and target
      const parseResult = this.parseArguments(rest);
      if (!parseResult.success) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'syntax-error',
            message: parseResult.error || 'Failed to parse arguments',
            code: 'ARGUMENT_PARSE_FAILED',
            suggestions: ['Check argument syntax', 'Use proper to/on keyword placement'],
          },
          type: 'error',
        };
      }

      const { eventDetail, target } = parseResult;

      // Resolve target elements
      const targetResult = await this.resolveTargetElements(target, context);
      if (!targetResult.success) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'runtime-error',
            message: targetResult.error || 'Failed to resolve target elements',
            code: 'TARGET_RESOLUTION_FAILED',
            suggestions: ['Check if target elements exist', 'Verify selector syntax'],
          },
          type: 'error',
        };
      }

      const targetElements = targetResult.elements || [];

      // Create and dispatch the event
      const eventResult = await this.createAndDispatchEvent(
        eventName,
        eventDetail,
        targetElements,
        context
      );

      if (!eventResult.success) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'runtime-error',
            message: eventResult.error || 'Failed to dispatch event',
            code: 'EVENT_DISPATCH_FAILED',
            suggestions: ['Check if target elements are valid', 'Verify event name format'],
          },
          type: 'error',
        };
      }

      const event = eventResult.event;

      // Store result in context
      Object.assign(context, { it: event });

      return {
        success: true,
        ...(event && { value: event }),
        type: 'event',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SEND_EXECUTION_FAILED',
          suggestions: ['Check event name and arguments', 'Verify target elements exist'],
        },
        type: 'error',
      };
    }
  }

  private parseArguments(args: any[]): {
    success: boolean;
    eventDetail?: any;
    target?: any;
    error?: string;
  } {
    try {
      let eventDetail: any = {};
      let target: any = null;

      // Find target keyword position
      let targetKeywordIndex = -1;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === 'to' || args[i] === 'on') {
          targetKeywordIndex = i;
          target = args[i + 1];
          break;
        }
      }

      // Parse event detail arguments (everything before the target keyword)
      const detailArgs = targetKeywordIndex >= 0 ? args.slice(0, targetKeywordIndex) : args;

      for (const arg of detailArgs) {
        if (arg === null || arg === undefined) {
          continue; // Skip null/undefined arguments
        }

        if (typeof arg === 'object' && !Array.isArray(arg)) {
          eventDetail = { ...eventDetail, ...arg };
        } else if (typeof arg === 'string' && arg.includes(':')) {
          // Parse name:value pairs
          const [key, value] = arg.split(':');
          eventDetail[key] = this.parseValue(value);
        }
        // Skip other types of arguments that aren't event details
      }

      return {
        success: true,
        eventDetail,
        target,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse arguments',
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
      let targetElements: HTMLElement[] = [];

      if (target) {
        targetElements = this.resolveTargets(target, context);
      } else {
        // Default to current element (me)
        if (context.me) {
          const htmlElement = asHTMLElement(context.me);
          if (!htmlElement) {
            return {
              success: false,
              error: 'context.me is not an HTMLElement',
            };
          }
          targetElements = [htmlElement];
        } else {
          return {
            success: false,
            error: 'No target element available for event dispatch',
          };
        }
      }

      if (targetElements.length === 0) {
        return {
          success: false,
          error: 'No valid target elements found',
        };
      }

      return {
        success: true,
        elements: targetElements,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve target elements',
      };
    }
  }

  private async createAndDispatchEvent(
    eventName: string,
    eventDetail: any,
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
        detail: Object.keys(eventDetail).length > 0 ? eventDetail : {},
      });

      let dispatchedCount = 0;
      const errors: string[] = [];

      for (const element of targetElements) {
        try {
          element.dispatchEvent(event);
          dispatchedCount++;

          // Dispatch enhanced send event with rich metadata
          const sendEvent = new CustomEvent('hyperscript:send', {
            detail: {
              element,
              context,
              command: this.name,
              eventName,
              eventDetail,
              timestamp: Date.now(),
              metadata: this.metadata,
              result: 'success',
            },
          });
          element.dispatchEvent(sendEvent);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to dispatch to element: ${errorMsg}`);
        }
      }

      // If no elements were successfully dispatched to, return error
      if (dispatchedCount === 0) {
        return {
          success: false,
          error: errors.length > 0 ? errors.join(', ') : 'No events were dispatched',
        };
      }

      return {
        success: true,
        event,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create or dispatch event',
      };
    }
  }

  validate(args: unknown[]): UnifiedValidationResult {
    try {
      // Basic argument validation
      if (args.length === 0) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Send command requires an event name',
              suggestions: ['Provide an event name as the first argument'],
            },
          ],
          suggestions: ['Use: send "eventName" to target', 'Use: trigger "eventName" on target'],
        };
      }

      const [eventName] = args;
      if (typeof eventName !== 'string') {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: 'Event name must be a string',
              suggestions: ['Use a string for the event name'],
            },
          ],
          suggestions: ['Use quotes around event name', 'Example: send "click" to element'],
        };
      }

      if (!eventName.trim()) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Event name cannot be empty',
              suggestions: ['Provide a valid event name'],
            },
          ],
          suggestions: ['Use meaningful event names like "click", "custom", etc.'],
        };
      }

      // Validate event name format
      if (eventName.includes(' ')) {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Event name cannot contain spaces',
              suggestions: ['Use camelCase or kebab-case for event names'],
            },
          ],
          suggestions: ['Use "customEvent" instead of "custom event"'],
        };
      }

      // Check for proper keyword usage
      let toIndex = -1;
      let onIndex = -1;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === 'to') {
          toIndex = i;
        } else if (args[i] === 'on') {
          onIndex = i;
        }
      }

      // Can't have both 'to' and 'on'
      if (toIndex !== -1 && onIndex !== -1) {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Cannot use both "to" and "on" keywords in the same send command',
              suggestions: ['Use either "to" or "on", not both'],
            },
          ],
          suggestions: ['Use "send event to target"', 'Use "trigger event on target"'],
        };
      }

      // If 'to' or 'on' is used, must have a target
      if (toIndex !== -1 && toIndex === args.length - 1) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Send command requires target after "to"',
              suggestions: ['Specify target element after "to" keyword'],
            },
          ],
          suggestions: ['Use: send event to <#element/>', 'Use: send event to me'],
        };
      }
      if (onIndex !== -1 && onIndex === args.length - 1) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Send command requires target after "on"',
              suggestions: ['Specify target element after "on" keyword'],
            },
          ],
          suggestions: ['Use: trigger event on <#element/>', 'Use: trigger event on me'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error',
            message: 'Validation failed with exception',
            suggestions: ['Check input types and values'],
          },
        ],
        suggestions: ['Ensure arguments match expected types'],
      };
    }
  }

  private parseValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try to parse as null/undefined
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Return as string (removing quotes if present)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
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
    return (
      selector.startsWith('#') ||
      selector.startsWith('.') ||
      selector.includes('[') ||
      selector.includes(':') ||
      /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector)
    ); // Simple tag selector
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

      // In test environment, try to use mock document
      if ((global as any).document) {
        if (
          selector.startsWith('#') &&
          !selector.includes(' ') &&
          (global as any).document.querySelector
        ) {
          const element = (global as any).document.querySelector(selector);
          return element ? [element as HTMLElement] : [];
        }

        if ((global as any).document.querySelectorAll) {
          const elements = (global as any).document.querySelectorAll(selector);
          return Array.from(elements);
        }
      }

      return [];
    } catch (error) {
      // If the error message includes 'Query failed', preserve it
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Query failed')) {
        throw error;
      }
      throw new Error(`Invalid CSS selector: ${selector}`);
    }
  }
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 6KB
 * @llm-description Type-safe send command for custom event dispatching with validation
 */
export function createSendCommand(): SendCommand {
  return new SendCommand();
}

// Default export for convenience
export default SendCommand;
