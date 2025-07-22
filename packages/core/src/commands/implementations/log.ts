/**
 * LOG Command Implementation
 * Outputs values to the console for debugging and inspection
 */

import type { ExecutionContext } from '../../types/core.js';
import { parseAndEvaluateExpression } from '../../parser/expression-parser.js';

export interface Command {
  name: string;
  execute(args: string[], context: ExecutionContext): Promise<any>;
}

export const logCommand: Command = {
  name: 'log',
  
  async execute(args: string[], context: ExecutionContext): Promise<any> {
    // If no arguments, just log empty
    if (args.length === 0) {
      console.log();
      return;
    }
    
    // Evaluate all arguments and log them
    const evaluatedArgs = [];
    
    for (const arg of args) {
      try {
        const result = await parseAndEvaluateExpression(arg, context);
        evaluatedArgs.push(result);
      } catch (error) {
        // If evaluation fails, log the raw argument
        evaluatedArgs.push(arg);
      }
    }
    
    // Log all evaluated arguments
    console.log(...evaluatedArgs);
    
    return evaluatedArgs.length === 1 ? evaluatedArgs[0] : evaluatedArgs;
  }
};