/**
 * Wait Command Implementation
 * Provides timing and event-based waiting functionality
 * 
 * Syntax:
 * - wait <time expression>
 * - wait for <event> [from <source>] [or <time expression>]
 * - wait for <event>(prop1, prop2) [from <source>] [or ...]
 * 
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class WaitCommand implements CommandImplementation {
  name = 'wait';
  syntax = 'wait (<time expression> | for (<event> [from <source>]) [or ...] )';
  description = 'The wait command allows you to wait for an event to occur or for a fixed amount of time, supporting time delays and event-driven execution.';
  isBlocking = true; // Wait commands block execution until resolved
  hasBody = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length === 0) {
      throw new Error('Wait command requires arguments');
    }

    const firstArg = args[0];

    // Handle structured object arguments from tests
    if (typeof firstArg === 'object' && firstArg !== null) {
      if (firstArg.type === 'timeout') {
        return this.waitForTime([firstArg], context);
      } else if (firstArg.type === 'event') {
        return this.waitForEvent([firstArg], context);
      } else if (firstArg.type === 'mixed') {
        return this.waitForMixedEventTimeout(firstArg, context);
      }
    }

    // Check if this is an event-based wait
    if (args[0] === 'for') {
      return this.waitForEvent(args.slice(1), context);
    }

    // Otherwise, it's a time-based wait
    return this.waitForTime(args, context);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'Wait command requires arguments';
    }

    if (args[0] === 'for') {
      // Event-based wait validation
      if (args.length < 2) {
        return 'Wait for command requires an event name';
      }
      
      // Basic event name validation
      const eventName = args[1];
      if (typeof eventName !== 'string' || !eventName.trim()) {
        return 'Event name must be a non-empty string';
      }
    } else {
      // Time-based wait validation
      const timeExpression = args[0];
      if (typeof timeExpression !== 'number' && typeof timeExpression !== 'string') {
        return 'Time expression must be a number or string';
      }
    }

    return null;
  }

  private async waitForTime(args: any[], context: ExecutionContext): Promise<void> {
    const timeExpression = args[0];
    
    // Handle structured object format from tests
    if (typeof timeExpression === 'object' && timeExpression.type === 'timeout') {
      const timeMs = timeExpression.value || 0;
      if (timeMs < 0) {
        throw new Error('Wait time cannot be negative');
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, timeMs);
      });
    }

    // Handle regular time expressions
    const timeMs = this.parseTimeExpression(timeExpression, context);
    
    if (timeMs < 0) {
      throw new Error('Wait time cannot be negative');
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeMs);
    });
  }

  private async waitForEvent(args: any[], context: ExecutionContext): Promise<any> {
    // Handle structured object format from tests  
    if (args.length === 1 && typeof args[0] === 'object' && args[0].type === 'event') {
      const eventObj = args[0];
      const eventSpec = {
        events: [{ eventName: eventObj.eventName, source: eventObj.source || null, destructure: eventObj.destructure || [] }],
        timeout: null
      };
      return this.executeEventWait(eventSpec, context);
    }

    const eventSpec = this.parseEventSpecification(args);
    return this.executeEventWait(eventSpec, context);
  }

  private async waitForMixedEventTimeout(config: any, context: ExecutionContext): Promise<any> {
    const eventSpec = {
      events: [{ eventName: config.eventName, source: config.source || null, destructure: config.destructure || [] }],
      timeout: config.timeout || null
    };
    return this.executeEventWait(eventSpec, context);
  }

  private async executeEventWait(eventSpec: any, context: ExecutionContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const listeners: Array<{ element: HTMLElement | Document; event: string; handler: EventListener }> = [];
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        
        // Remove all event listeners
        listeners.forEach(({ element, event, handler }) => {
          element.removeEventListener(event, handler);
        });
        
        // Clear timeout if exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      // Set up timeout if specified
      if (eventSpec.timeout !== null) {
        timeoutId = setTimeout(() => {
          cleanup();
          resolve(null); // Timeout resolves with null
        }, eventSpec.timeout);
      }

      // Set up event listeners
      eventSpec.events.forEach(({ eventName, source, destructure }) => {
        const target = this.resolveEventSource(source, context);
        
        const handler = (event: Event) => {
          cleanup();
          
          // Handle event destructuring
          if (destructure && destructure.length > 0) {
            const result: any = {};
            destructure.forEach(prop => {
              result[prop] = (event as any)[prop];
            });
            context.it = result;
            resolve(result);
          } else {
            context.it = event;
            resolve(event);
          }
        };

        target.addEventListener(eventName, handler);
        listeners.push({ element: target, event: eventName, handler });
      });
    });
  }

  private parseEventSpecification(args: any[]): {
    events: Array<{ eventName: string; source: string | null; destructure: string[] }>;
    timeout: number | null;
  } {
    const result = {
      events: [] as Array<{ eventName: string; source: string | null; destructure: string[] }>,
      timeout: null as number | null
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === 'or') {
        i++;
        // Check if next argument is a time expression
        if (i < args.length) {
          const nextArg = args[i];
          if (typeof nextArg === 'number' || typeof nextArg === 'string') {
            // Try to parse as time
            try {
              result.timeout = this.parseTimeExpression(nextArg, null as any);
              i++;
              continue;
            } catch {
              // Not a valid time expression, continue parsing as event
            }
          }
          // Continue parsing as another event
          continue;
        }
      } else if (typeof arg === 'string' && arg !== 'from') {
        // This is an event name
        const eventName = this.parseEventName(arg);
        const destructure = this.parseEventDestructuring(arg);
        
        let source: string | null = null;
        
        // Check for 'from' keyword
        if (i + 1 < args.length && args[i + 1] === 'from' && i + 2 < args.length) {
          source = args[i + 2];
          i += 2; // Skip 'from' and source
        }
        
        result.events.push({ eventName, source, destructure });
      }
      
      i++;
    }

    return result;
  }

  private parseEventName(eventSpec: string): string {
    // Extract event name from event(prop1, prop2) syntax
    const parenIndex = eventSpec.indexOf('(');
    if (parenIndex !== -1) {
      return eventSpec.substring(0, parenIndex);
    }
    return eventSpec;
  }

  private parseEventDestructuring(eventSpec: string): string[] {
    // Extract properties from event(prop1, prop2) syntax
    const match = eventSpec.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(prop => prop.trim());
    }
    return [];
  }

  private parseTimeExpression(timeExpr: any, context: ExecutionContext | null): number {
    if (typeof timeExpr === 'number') {
      return timeExpr; // Already in milliseconds
    }

    if (typeof timeExpr === 'string') {
      // Handle different time formats
      const trimmed = timeExpr.trim().toLowerCase();
      
      // Check for units
      if (trimmed.endsWith('ms') || trimmed.endsWith('milliseconds')) {
        const num = parseFloat(trimmed.replace(/ms|milliseconds/g, ''));
        return isNaN(num) ? 0 : num;
      }
      
      if (trimmed.endsWith('s') || trimmed.endsWith('seconds')) {
        const num = parseFloat(trimmed.replace(/s|seconds/g, ''));
        return isNaN(num) ? 0 : num * 1000;
      }
      
      if (trimmed.endsWith('minutes') || trimmed.endsWith('min')) {
        const num = parseFloat(trimmed.replace(/minutes|min/g, ''));
        return isNaN(num) ? 0 : num * 60000;
      }
      
      // Try to parse as plain number (defaults to milliseconds)
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        return num;
      }
      
      // Try to resolve from context variables if context available
      if (context) {
        const variable = this.getVariableValue(trimmed, context);
        if (typeof variable === 'number') {
          return variable;
        }
        if (typeof variable === 'string') {
          return this.parseTimeExpression(variable, context);
        }
      }
    }

    throw new Error(`Invalid time expression: ${timeExpr}`);
  }

  private resolveEventSource(source: string | null, context: ExecutionContext): HTMLElement | Document {
    if (!source) {
      // Default to current element
      return context.me || document;
    }

    // Handle special source references
    if (source === 'document') {
      return document;
    }
    if (source === 'window') {
      return document; // Events from window are often captured on document
    }
    if (source === 'me' && context.me) {
      return context.me;
    }
    if (source === 'it' && context.it instanceof HTMLElement) {
      return context.it;
    }
    if (source === 'you' && context.you) {
      return context.you;
    }

    // Try to resolve from context variables
    const variable = this.getVariableValue(source, context);
    if (variable instanceof HTMLElement) {
      return variable;
    }

    // Try to resolve as CSS selector
    if (typeof document !== 'undefined') {
      const element = document.querySelector(source);
      if (element instanceof HTMLElement) {
        return element;
      }
    }

    // Default to document if resolution fails
    return context.me || document;
  }

  private getVariableValue(name: string, context: ExecutionContext): any {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }

    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }

    // Check general variables
    if (context.variables && context.variables.has(name)) {
      return context.variables.get(name);
    }

    return undefined;
  }
}

export default WaitCommand;