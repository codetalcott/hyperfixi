/**
 * Enhanced Halt Command Implementation
 * Stops execution of the current command sequence
 *
 * Syntax: halt
 *
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import { debug } from '../../utils/debug';

// Input type definition
export interface HaltCommandInput {
  target?: unknown; // Can be 'the event' or other targets
}

// Output type definition
export interface HaltCommandOutput {
  halted: true;
  timestamp: number;
  eventHalted?: boolean;
}

/**
 * Enhanced Halt Command with full type safety and validation
 *
 * Supports two modes:
 * 1. `halt` - Stops command execution
 * 2. `halt the event` - Prevents default event behavior without stopping execution
 */
export class HaltCommand implements CommandImplementation<
  HaltCommandInput,
  HaltCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'halt',
    description: 'The halt command stops execution or prevents event defaults. Use "halt" to stop command sequence, or "halt the event" to preventDefault() without stopping.',
    examples: [
      'halt',
      'halt the event',
      'if error then halt',
      'unless user.isValid then halt'
    ],
    syntax: 'halt [the event]',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(_input: unknown): ValidationResult<HaltCommandInput> {
      // Halt command accepts any input or no input
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: _input as HaltCommandInput || {}
      };
    }
  };

  async execute(
    input: HaltCommandInput,
    context: TypedExecutionContext
  ): Promise<HaltCommandOutput> {
    // Check if we're halting an event (from "halt the event")
    // Input can be:
    // 1. The event object directly
    // 2. { target: 'the' } - from command adapter detecting "halt the event" pattern
    // 3. The string "the" - use context.event

    debug.command('HALT: Received input:', {
      input,
      inputType: typeof input,
      hasContextEvent: !!context.event
    });

    // If input is "the" or {target: "the"} (from "halt the event"), use context.event
    let targetToHalt;
    if ((input as any)?.target === 'the' && context.event) {
      targetToHalt = context.event;
      debug.command('HALT: Using event from context (via {target: "the"})');
    } else if ((input as any) === 'the' && context.event) {
      targetToHalt = context.event;
      debug.command('HALT: Using event from context (via raw "the")');
    } else {
      targetToHalt = (input as any)?.target || input;
    }

    // If target is an event object, prevent its default behavior
    if (targetToHalt && typeof targetToHalt === 'object' && 'preventDefault' in targetToHalt) {
      const event = targetToHalt as Event;
      event.preventDefault();
      event.stopPropagation();

      debug.command('HALT: Event default prevented and propagation stopped');

      // Return normally - don't stop command execution
      return {
        halted: true,
        timestamp: Date.now(),
        eventHalted: true
      };
    }

    // Note: We do NOT automatically halt the event just because context.event exists.
    // Only halt the event if explicitly specified via "halt the event" syntax,
    // which will set input.target to the event object.
    // Plain "halt" command should always stop execution, not prevent the event.

    // This is a regular "halt" command to stop execution
    debug.command('HALT: Stopping command execution');

    // Set a halt flag in the context if it supports it
    if ('halted' in context) {
      (context as any).halted = true;
    }

    // Throw a special halt error that can be caught and handled by the runtime
    const haltError = new Error('HALT_EXECUTION');
    (haltError as any).isHalt = true;
    throw haltError;
  }
}

/**
 * Factory function to create the enhanced halt command
 */
export function createHaltCommand(): HaltCommand {
  return new HaltCommand();
}

export default HaltCommand;