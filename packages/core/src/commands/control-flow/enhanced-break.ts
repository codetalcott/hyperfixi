/**
 * Enhanced Break Command Implementation
 * Exits from the current loop
 * 
 * Syntax: break
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition (break takes no arguments)
export interface BreakCommandInput {
  // No input required
}

// Output type definition  
export interface BreakCommandOutput {
  broken: true;
  timestamp: number;
}

/**
 * Enhanced Break Command with full type safety and validation
 */
export class EnhancedBreakCommand implements TypedCommandImplementation<
  BreakCommandInput,
  BreakCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'break',
    description: 'The break command exits from the current loop (repeat, for, while, until). Execution continues after the loop.',
    examples: [
      'break',
      'if found then break',
      'unless isValid then break'
    ],
    syntax: 'break',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(_input: unknown): ValidationResult<BreakCommandInput> {
      // Break command accepts any input or no input
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {}
      };
    }
  };

  async execute(
    _input: BreakCommandInput,
    _context: TypedExecutionContext
  ): Promise<BreakCommandOutput> {
    // Throw a special break error that can be caught and handled by loop commands
    const breakError = new Error('BREAK_LOOP');
    (breakError as any).isBreak = true;
    throw breakError;
  }
}

/**
 * Factory function to create the enhanced break command
 */
export function createEnhancedBreakCommand(): EnhancedBreakCommand {
  return new EnhancedBreakCommand();
}

export default EnhancedBreakCommand;