/**
 * Enhanced Log Command Implementation
 * Outputs values to the console for debugging and inspection
 * 
 * Syntax: log <value1> <value2> ...
 * 
 * Modernized with CommandImplementation interface and Zod validation
 */

import { v } from '../../validation/lightweight-validators';
import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/enhanced-core';
import type { UnifiedValidationResult } from '../../types/unified-types';

/**
 * Zod schema for LOG command input validation
 */
export const LogCommandInputSchema = v.object({
  values: v.array(v.unknown()).describe('Values to log to console')
}).describe('LOG command input parameters');

// Input type definition
export interface LogCommandInput {
  values: unknown[];
}

type LogCommandInputType = any; // Inferred from RuntimeValidator

// Output type definition  
export interface LogCommandOutput {
  values: unknown[];
  loggedAt: Date;
}

/**
 * Enhanced Log Command with full type safety and validation
 */
export class EnhancedLogCommand implements CommandImplementation<LogCommandInputType, LogCommandOutput, TypedExecutionContext> {
  name = 'log' as const;
  inputSchema = LogCommandInputSchema;

  metadata = {
    name: 'log',
    description: 'Log values to the console',
    examples: ['log "message"', 'log variable', 'log value1 value2 value3'],
    syntax: 'log <values...>',
    category: 'utility',
    version: '1.0.0'
  };

  validation = {
    validate: (input: unknown) => this.validate(input)
  };

  async execute(
    input: LogCommandInputType,
    _context: TypedExecutionContext
  ): Promise<LogCommandOutput> {
    const { values } = input;
    
    // If no values, just log empty
    if (values.length === 0) {
      console.log();
    } else {
      // Log all values
      console.log(...values);
    }
    
    return {
      values,
      loggedAt: new Date()
    };
  }
  
  validate(input: unknown): UnifiedValidationResult<LogCommandInputType> {
    try {
      const validInput = this.inputSchema.parse(input);
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: validInput
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        return {
          isValid: false,
          errors: [{
            type: 'validation-error',
            code: 'VALIDATION_ERROR',
            message: `Invalid LOG command input: ${error.message}`,
            path: '',
            suggestions: []
          }],
          suggestions: [
            'log "message"',
            'log variable',
            'log value1 value2 value3'
          ]
        };
      }

      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          code: 'VALIDATION_ERROR',
          message: `LOG command validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: '',
          suggestions: []
        }],
        suggestions: []
      };
    }
  }
}

/**
 * Factory function to create a new EnhancedLogCommand instance
 */
export function createEnhancedLogCommand(): EnhancedLogCommand {
  return new EnhancedLogCommand();
}

// Export command instance for direct use
export const enhancedLogCommand = createEnhancedLogCommand();