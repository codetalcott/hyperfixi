/**
 * Command Execution System for HyperScript Commands
 * Parses and executes _hyperscript-compatible commands
 */

import type { ExecutionContext } from '../types/core.js';
import { parseAndEvaluateExpression } from '../parser/expression-parser.js';

// Command implementations
import { logCommand } from './implementations/log.js';

export interface Command {
  name: string;
  execute(args: string[], context: ExecutionContext): Promise<any>;
}

// Registry of available commands
const commandRegistry = new Map<string, Command>();

// Register built-in commands
function registerCommand(command: Command) {
  commandRegistry.set(command.name, command);
}

// Initialize command registry
registerCommand(logCommand);

/**
 * Parse a command string into command name and arguments
 */
function parseCommand(commandString: string): { name: string; args: string[] } {
  const trimmed = commandString.trim();
  const tokens = trimmed.split(/\s+/);
  const name = tokens[0];
  const args = tokens.slice(1);
  
  // Handle complex argument parsing for comma-separated values
  if (args.length > 0) {
    const argsString = args.join(' ');
    // Split on commas but respect quotes and parentheses
    const parsedArgs = parseCommandArguments(argsString);
    return { name, args: parsedArgs };
  }
  
  return { name, args };
}

/**
 * Parse command arguments, handling commas, quotes, and expressions
 */
function parseCommandArguments(argsString: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenCount = 0;
  let i = 0;
  
  while (i < argsString.length) {
    const char = argsString[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === '(') {
      parenCount++;
      current += char;
    } else if (!inQuotes && char === ')') {
      parenCount--;
      current += char;
    } else if (!inQuotes && char === ',' && parenCount === 0) {
      // Split on comma
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

/**
 * Execute a command with the given context
 */
export async function executeCommand(commandString: string, context: ExecutionContext): Promise<any> {
  try {
    const { name, args } = parseCommand(commandString);
    
    const command = commandRegistry.get(name);
    if (!command) {
      throw new Error(`Unknown command: ${name}`);
    }
    
    return await command.execute(args, context);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Command execution error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Evaluate an expression argument in the given context
 */
export async function evaluateCommandArgument(arg: string, context: ExecutionContext): Promise<any> {
  return await parseAndEvaluateExpression(arg, context);
}

/**
 * Get list of available commands
 */
export function getAvailableCommands(): string[] {
  return Array.from(commandRegistry.keys());
}

/**
 * Register a new command (for extensibility)
 */
export function registerExternalCommand(command: Command): void {
  registerCommand(command);
}