/**
 * Halt Command Implementation
 * The halt command prevents an event from bubbling and/or from performing its default action.
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class HaltCommand implements CommandImplementation {
  name = 'halt';
  syntax = 'halt [the event[\'s]] (bubbling|default) | halt';
  description = 'The halt command prevents an event from bubbling and/or from performing its default action.';
  isBlocking = true; // Control flow command

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    // Initialize flags if not present
    if (!context.flags) {
      context.flags = {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false
      };
    }

    const event = context.event;
    
    // Handle different argument patterns
    if (args.length === 0) {
      // Form: halt (both bubbling and default, then exit)
      this.preventEventDefault(event);
      this.stopEventPropagation(event);
      context.flags.halted = true;
      return;
    }

    if (args.length === 1) {
      const arg = args[0];
      if (arg === 'bubbling') {
        // Form: halt bubbling (stop bubbling and exit)
        this.stopEventPropagation(event);
        context.flags.halted = true;
        return;
      } else if (arg === 'default') {
        // Form: halt default (prevent default and exit)
        this.preventEventDefault(event);
        context.flags.halted = true;
        return;
      }
    }

    if (args.length === 2) {
      const [first, second] = args;
      if (first === 'the' && second === 'event') {
        // Form: halt the event (both bubbling and default, continue execution)
        this.preventEventDefault(event);
        this.stopEventPropagation(event);
        return;
      }
    }

    if (args.length === 3) {
      const [first, second, third] = args;
      
      if (first === 'the' && second === 'event') {
        // Form: halt the event bubbling/default (continue execution)
        if (third === 'bubbling') {
          this.stopEventPropagation(event);
          return;
        } else if (third === 'default') {
          this.preventEventDefault(event);
          return;
        }
      } else if (first === 'the' && second === 'event\'s') {
        // Form: halt the event's bubbling/default (continue execution)
        if (third === 'bubbling') {
          this.stopEventPropagation(event);
          return;
        } else if (third === 'default') {
          this.preventEventDefault(event);
          return;
        }
      }
    }

    // If we get here, the arguments didn't match any valid pattern
    throw new Error(`Invalid halt syntax: ${args.join(' ')}`);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      // Basic halt is valid
      return null;
    }

    if (args.length === 1) {
      const arg = args[0];
      if (arg === 'bubbling' || arg === 'default') {
        return null;
      }
      if (arg === 'the') {
        return 'Incomplete halt syntax. Expected "the event"';
      }
      return 'Invalid halt syntax. Expected "bubbling", "default", or "the"';
    }

    if (args.length === 2) {
      const [first, second] = args;
      if (first === 'the' && second === 'event') {
        return null;
      }
      if (first === 'the' && second === 'event\'s') {
        return 'Incomplete possessive syntax. Expected property after "event\'s"';
      }
      if (first === 'the' && second !== 'event') {
        return 'Invalid event syntax. Expected "event"';
      }
      return 'Invalid halt syntax. Expected "the event"';
    }

    if (args.length === 3) {
      const [first, second, third] = args;
      
      if (first !== 'the') {
        return 'Invalid halt syntax. Expected "the event"';
      }
      
      if (second === 'event') {
        if (third !== 'bubbling' && third !== 'default') {
          return 'Invalid event property. Expected "bubbling" or "default"';
        }
        return null;
      } else if (second === 'event\'s') {
        if (third !== 'bubbling' && third !== 'default') {
          return 'Invalid event property. Expected "bubbling" or "default"';
        }
        return null;
      } else {
        return 'Invalid event syntax. Expected "event"';
      }
    }

    return 'Too many arguments for halt command';
  }

  private preventEventDefault(event: Event | undefined): void {
    if (event && typeof event.preventDefault === 'function') {
      try {
        event.preventDefault();
      } catch (error) {
        // Silently handle errors in preventDefault
        // Some events may not support prevention or may throw errors
      }
    }
  }

  private stopEventPropagation(event: Event | undefined): void {
    if (event && typeof event.stopPropagation === 'function') {
      try {
        event.stopPropagation();
      } catch (error) {
        // Silently handle errors in stopPropagation
        // Some events may not support stopping propagation or may throw errors
      }
    }
  }
}

export default HaltCommand;