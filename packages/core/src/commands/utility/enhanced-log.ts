/**
 * Enhanced Log Command Implementation
 * Outputs values to the console for debugging and inspection
 * 
 * Syntax: log <value1> <value2> ...
 * 
 * Modernized with TypedCommandImplementation interface and Zod validation
 */

import { v, type RuntimeValidator } from '../../validation/lightweight-validators';
import type { TypedCommandImplementation } from '../../types/core';
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

type LogCommandInputType = z.infer<typeof LogCommandInputSchema>;

// Output type definition  
export interface LogCommandOutput {
  values: unknown[];
  loggedAt: Date;
}

/**
 * Enhanced Log Command with full type safety and validation
 */
export class EnhancedLogCommand implements TypedCommandImplementation<LogCommandInputType, LogCommandOutput> {
  name = 'log' as const;
  inputSchema = LogCommandInputSchema;
  
  async execute(
    input: LogCommandInputType,
    context: TypedExecutionContext
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
        success: true,
        data: validInput
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            message: `Invalid LOG command input: ${error.message}`,
            suggestions: [
              'log "message"',
              'log variable',
              'log value1 value2 value3'
            ]
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `LOG command validation failed: ${error.message}`,
          suggestions: []
        }
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