/**
 * Enhanced Continue Command Implementation
 * Skips to the next iteration of the current loop
 * 
 * Syntax: continue
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';

// Input type definition (continue takes no arguments)
export interface ContinueCommandInput {
  // No input required
}

// Output type definition  
export interface ContinueCommandOutput {
  continued: true;
  timestamp: number;
}

/**
 * Enhanced Continue Command with full type safety and validation
 */
export class EnhancedContinueCommand implements CommandImplementation<
  ContinueCommandInput,
  ContinueCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'continue',
    description: 'The continue command skips the rest of the current loop iteration and continues with the next iteration. It works within repeat, for, while, and until loops.',
    examples: [
      'continue',
      'if item.isInvalid then continue',
      'unless item.isActive then continue'
    ],
    syntax: 'continue',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(_input: unknown): ValidationResult<ContinueCommandInput> {
      // Continue command accepts any input or no input
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {}
      };
    }
  };

  async execute(
    _input: ContinueCommandInput,
    _context: TypedExecutionContext
  ): Promise<ContinueCommandOutput> {
    // Throw a special continue error that can be caught and handled by loop commands
    const continueError = new Error('CONTINUE_LOOP');
    (continueError as any).isContinue = true;
    throw continueError;
  }
}

/**
 * Factory function to create the enhanced continue command
 */
export function createEnhancedContinueCommand(): EnhancedContinueCommand {
  return new EnhancedContinueCommand();
}

export default EnhancedContinueCommand;