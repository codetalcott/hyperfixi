/**
 * Command Execution System for HyperScript Commands
 * Parses and executes _hyperscript-compatible commands
 */

import type { ExecutionContext } from '../types/core';
import { parseAndEvaluateExpression } from '../parser/expression-parser';

// Command implementations
import { logCommand } from './implementations/log';
import { SetCommand } from './data/index';
import { PutCommand } from './dom/put';
import { AddCommand } from './dom/add';
import { ShowCommand } from './dom/show';
import { HideCommand } from './dom/hide';
import { RenderCommand } from './templates/index';

export interface Command {
  name: string;
  execute(args: string[], context: ExecutionContext): Promise<any>;
}

// Adapter for CommandImplementation interface to Command interface
class CommandAdapter implements Command {
  constructor(private impl: any) {}

  get name() {
    return this.impl.name;
  }

  async execute(args: string[], context: ExecutionContext): Promise<any> {
    // CommandImplementation.execute takes (context, ...args)
    // Our Command interface takes (args, context)
    // Need to evaluate string arguments as expressions first
    const evaluatedArgs = [];

    // Special handling for SET command - don't evaluate the target variable name
    if (this.impl.name === 'set' && args.length >= 3 && args[1] === 'to') {
      // For "set x to value", keep "x" as string, evaluate "value"
      evaluatedArgs.push(args[0]); // Keep target as string
      evaluatedArgs.push(args[1]); // Keep "to" as string

      // Evaluate remaining arguments (the value expressions)
      for (let i = 2; i < args.length; i++) {
        try {
          const evaluated = await evaluateCommandArgument(args[i], context);
          evaluatedArgs.push(evaluated);
        } catch (error) {
          evaluatedArgs.push(args[i]);
        }
      }
    } else if (this.impl.name === 'add' && args.length >= 2) {
      // For ADD command, keep class/attribute expressions as strings
      // "add .class-name target" -> keep ".class-name" as string
      evaluatedArgs.push(args[0]); // Keep class/attribute expression as string

      // Evaluate target if provided
      for (let i = 1; i < args.length; i++) {
        try {
          const evaluated = await evaluateCommandArgument(args[i], context);
          evaluatedArgs.push(evaluated);
        } catch (error) {
          evaluatedArgs.push(args[i]);
        }
      }
    } else if (this.impl.name === 'put' && args.length >= 3) {
      // For PUT command: "put content into target"
      // Evaluate content (like variables), keep preposition as string, keep target as string for property access
      try {
        const evaluated = await evaluateCommandArgument(args[0], context);
        evaluatedArgs.push(evaluated);
      } catch (error) {
        evaluatedArgs.push(args[0]);
      }

      evaluatedArgs.push(args[1]); // Keep preposition as string
      evaluatedArgs.push(args[2]); // Keep target as string for property parsing (don't evaluate CSS selectors)

      // Handle any additional arguments
      for (let i = 3; i < args.length; i++) {
        try {
          const evaluated = await evaluateCommandArgument(args[i], context);
          evaluatedArgs.push(evaluated);
        } catch (error) {
          evaluatedArgs.push(args[i]);
        }
      }
    } else {
      // Default behavior for other commands
      for (const arg of args) {
        try {
          // Try to evaluate as expression
          const evaluated = await evaluateCommandArgument(arg, context);
          evaluatedArgs.push(evaluated);
        } catch (error) {
          // If evaluation fails, use raw string
          evaluatedArgs.push(arg);
        }
      }
    }

    return await this.impl.execute(context, ...evaluatedArgs);
  }
}

// Registry of available commands
const commandRegistry = new Map<string, Command>();

// Register built-in commands
function registerCommand(command: Command) {
  commandRegistry.set(command.name, command);
}

// Initialize command registry with hyperscript commands
registerCommand(logCommand);
registerCommand(new CommandAdapter(new SetCommand()));
registerCommand(new CommandAdapter(new PutCommand()));
registerCommand(new CommandAdapter(new AddCommand()));
registerCommand(new CommandAdapter(new ShowCommand()));
registerCommand(new CommandAdapter(new HideCommand()));
registerCommand(new CommandAdapter(new RenderCommand()));

/**
 * Parse a command string into command name and arguments
 * Handles hyperscript-specific syntax patterns like "set x to y" and "add .class to #element"
 */
function parseCommand(commandString: string): { name: string; args: string[] } {
  const trimmed = commandString.trim();

  // Handle hyperscript-specific command patterns
  if (trimmed.startsWith('set ')) {
    return parseSetCommand(trimmed);
  } else if (trimmed.startsWith('put ')) {
    return parsePutCommand(trimmed);
  } else if (trimmed.startsWith('add ')) {
    return parseAddCommand(trimmed);
  } else if (trimmed.startsWith('show ') || trimmed.startsWith('hide ')) {
    return parseShowHideCommand(trimmed);
  } else if (trimmed.startsWith('render ')) {
    return parseRenderCommand(trimmed);
  }

  // Default parsing for other commands
  const tokens = trimmed.split(/\s+/);
  const name = tokens[0];
  const args = tokens.slice(1);

  // Handle complex argument parsing for comma-separated values
  if (args.length > 0) {
    const argsString = args.join(' ');
    const parsedArgs = parseCommandArguments(argsString);
    return { name, args: parsedArgs };
  }

  return { name, args };
}

/**
 * Parse SET command: "set x to 42" -> ["set", ["x", "to", "42"]]
 */
function parseSetCommand(command: string): { name: string; args: string[] } {
  const match = command.match(/^set\s+(.+)\s+to\s+(.+)$/);
  if (match) {
    const [, target, value] = match;
    return { name: 'set', args: [target.trim(), 'to', value.trim()] };
  }

  // Fallback to simple parsing
  const tokens = command.split(/\s+/);
  return { name: tokens[0], args: tokens.slice(1) };
}

/**
 * Parse PUT command: "put 'hello' into #test" -> ["put", ["hello", "into", "#test"]]
 */
function parsePutCommand(command: string): { name: string; args: string[] } {
  // Handle various put patterns
  const patterns = [
    /^put\s+(.+)\s+into\s+(.+)$/,
    /^put\s+(.+)\s+before\s+(.+)$/,
    /^put\s+(.+)\s+after\s+(.+)$/,
    /^put\s+(.+)\s+at\s+start\s+of\s+(.+)$/,
    /^put\s+(.+)\s+at\s+end\s+of\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      const [, content, target] = match;
      const preposition =
        match[0].match(/\s+(into|before|after|at\s+start\s+of|at\s+end\s+of)\s+/)?.[1] || 'into';
      return { name: 'put', args: [content.trim(), preposition, target.trim()] };
    }
  }

  // Fallback to simple parsing
  const tokens = command.split(/\s+/);
  return { name: tokens[0], args: tokens.slice(1) };
}

/**
 * Parse ADD command: "add .class to #element" -> ["add", [".class", "to", "#element"]]
 */
function parseAddCommand(command: string): { name: string; args: string[] } {
  const match = command.match(/^add\s+(.+)\s+to\s+(.+)$/);
  if (match) {
    const [, classes, target] = match;
    return { name: 'add', args: [classes.trim(), target.trim()] };
  }

  // Handle "add .class" without target (implicit target 'me')
  const simpleMatch = command.match(/^add\s+(.+)$/);
  if (simpleMatch) {
    return { name: 'add', args: [simpleMatch[1].trim()] };
  }

  // Fallback
  const tokens = command.split(/\s+/);
  return { name: tokens[0], args: tokens.slice(1) };
}

/**
 * Parse SHOW/HIDE commands: "show #element" -> ["show", ["#element"]]
 */
function parseShowHideCommand(command: string): { name: string; args: string[] } {
  const tokens = command.split(/\s+/);
  const name = tokens[0]; // 'show' or 'hide'
  const target = tokens.slice(1).join(' '); // everything after command name
  return { name, args: [target] };
}

/**
 * Parse RENDER commands: "render #template" -> ["render", ["#template"]]
 *                        "render #template with data" -> ["render", ["#template", "with", "data"]]
 */
function parseRenderCommand(command: string): { name: string; args: string[] } {
  const withMatch = command.match(/^render\s+(.+?)\s+with\s+(.+)$/);
  if (withMatch) {
    const [, template, data] = withMatch;
    return { name: 'render', args: [template.trim(), 'with', data.trim()] };
  }

  // Simple render command: "render #template"
  const tokens = command.split(/\s+/);
  const template = tokens.slice(1).join(' '); // everything after 'render'
  return { name: 'render', args: [template] };
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
export async function executeCommand(
  commandString: string,
  context: ExecutionContext
): Promise<any> {
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
export async function evaluateCommandArgument(
  arg: string,
  context: ExecutionContext
): Promise<any> {
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
