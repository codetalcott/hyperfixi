/**
 * Enhanced Halt Command Implementation
 * Stops execution of the current command sequence
 * 
 * Syntax: halt
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';

// Input type definition (halt takes no arguments)
export interface HaltCommandInput {
  // No input required
}

// Output type definition  
export interface HaltCommandOutput {
  halted: true;
  timestamp: number;
}

/**
 * Enhanced Halt Command with full type safety and validation
 */
export class EnhancedHaltCommand implements CommandImplementation<
  HaltCommandInput,
  HaltCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'halt',
    description: 'The halt command stops execution of the current command sequence. It provides a way to immediately terminate processing without throwing an error.',
    examples: [
      'halt',
      'if error then halt',
      'unless user.isValid then halt'
    ],
    syntax: 'halt',
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
        data: {}
      };
    }
  };

  async execute(
    _input: HaltCommandInput,
    context: TypedExecutionContext
  ): Promise<HaltCommandOutput> {
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
export function createEnhancedHaltCommand(): EnhancedHaltCommand {
  return new EnhancedHaltCommand();
}

export default EnhancedHaltCommand;