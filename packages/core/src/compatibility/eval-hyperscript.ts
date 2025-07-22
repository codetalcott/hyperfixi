/**
 * _hyperscript API Compatibility Layer
 * Provides evalHyperScript() function that matches the original _hyperscript API
 */

import { parseAndEvaluateExpression } from '../parser/expression-parser.js';
import { Parser } from '../parser/parser.js';
import { Runtime } from '../runtime/runtime.js';
import { tokenize } from '../parser/tokenizer.js';
import type { ExecutionContext } from '../types/core.js';

/**
 * Context interface matching _hyperscript's expected format
 */
export interface HyperScriptContext {
  /** The current element (equivalent to 'me') */
  me?: any;
  /** Local variables scope */
  locals?: Record<string, any>;
  /** Result from previous operation (equivalent to 'it') */
  result?: any;
  /** Target element for operations (equivalent to 'you') */
  you?: any;
  /** Global variables scope */
  globals?: Record<string, any>;
}

/**
 * Converts _hyperscript context format to our internal ExecutionContext format
 */
function convertContext(hyperScriptContext?: HyperScriptContext): ExecutionContext {
  const context: ExecutionContext = {
    me: hyperScriptContext?.me || null,
    you: hyperScriptContext?.you || null,
    it: hyperScriptContext?.result,
    result: hyperScriptContext?.result,
    locals: new Map(),
    globals: new Map(),
    parent: null,
    halted: false,
    returned: false,
    broke: false,
    continued: false,
    async: false
  };

  // Convert locals object to Map
  if (hyperScriptContext?.locals) {
    for (const [key, value] of Object.entries(hyperScriptContext.locals)) {
      context.locals.set(key, value);
    }
  }

  // Convert globals object to Map
  if (hyperScriptContext?.globals) {
    for (const [key, value] of Object.entries(hyperScriptContext.globals)) {
      context.globals.set(key, value);
    }
  }

  return context;
}

/**
 * Main compatibility function that matches _hyperscript's evalHyperScript() API
 * 
 * @param expression - Hyperscript expression string to evaluate
 * @param context - Optional context object with me, locals, result, etc.
 * @returns The result of evaluating the expression
 * 
 * @example
 * ```typescript
 * // Simple expression
 * evalHyperScript('5 + 3') // returns 8
 * 
 * // With context
 * evalHyperScript('my value', { me: { value: 42 } }) // returns 42
 * 
 * // With locals
 * evalHyperScript('foo', { locals: { foo: 'bar' } }) // returns 'bar'
 * ```
 */
export async function evalHyperScript(
  script: string, 
  context?: HyperScriptContext
): Promise<any> {
  // Handle empty input
  if (!script || script.trim() === '') {
    throw new Error('Cannot evaluate empty script');
  }

  try {
    // Convert context
    const executionContext = convertContext(context);
    
    // Determine if this is a command or expression
    if (isCommand(script)) {
      // Use full parser + runtime for commands
      return await executeAsCommand(script, executionContext);
    } else {
      // Use expression parser for expressions
      const result = await parseAndEvaluateExpression(script, executionContext);
      return result;
    }
  } catch (error) {
    // Match _hyperscript error handling behavior
    if (error instanceof Error) {
      throw new Error(`HyperScript evaluation error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Determine if input is a command vs an expression
 */
function isCommand(script: string): boolean {
  const trimmed = script.trim();
  
  // Known command starters
  const commandStarters = [
    'put', 'set', 'add', 'remove', 'show', 'hide', 'toggle',
    'if', 'repeat', 'wait', 'call', 'send', 'make', 'log',
    'increment', 'decrement', 'fetch', 'throw', 'return',
    'break', 'continue', 'halt', 'go', 'on'
  ];
  
  const firstWord = trimmed.split(/\s+/)[0];
  return commandStarters.includes(firstWord.toLowerCase());
}

/**
 * Execute script as a command using full parser + runtime
 */
async function executeAsCommand(script: string, context: ExecutionContext): Promise<any> {
  // Tokenize
  const tokens = tokenize(script);
  
  // Parse with full parser
  const parser = new Parser(tokens);
  const parseResult = parser.parse();
  
  if (!parseResult.success || !parseResult.node) {
    throw new Error(`Parse error: ${parseResult.error?.message || 'Unknown parse error'}`);
  }
  
  // Execute with runtime
  const runtime = new Runtime();
  const result = await runtime.execute(parseResult.node, context);
  return result;
}

/**
 * Async version of evalHyperScript for expressions that require async evaluation
 */
export async function evalHyperScriptAsync(
  expression: string,
  context?: HyperScriptContext
): Promise<any> {
  // Handle empty expressions
  if (!expression || expression.trim() === '') {
    throw new Error('Cannot evaluate empty expression');
  }

  try {
    // Convert context and evaluate
    const executionContext = convertContext(context);
    const result = await parseAndEvaluateExpression(expression, executionContext);
    return result;
  } catch (error) {
    // Match _hyperscript error handling behavior
    if (error instanceof Error) {
      throw new Error(`HyperScript evaluation error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Utility function to check if an expression is likely to be async
 * This helps determine whether to use sync or async evaluation
 */
export function isAsyncExpression(expression: string): boolean {
  // Simple heuristics for detecting async expressions
  const asyncKeywords = ['fetch', 'wait', 'settle', 'async', 'promise'];
  const lowerExpression = expression.toLowerCase();
  
  return asyncKeywords.some(keyword => lowerExpression.includes(keyword));
}

/**
 * Smart evalHyperScript that automatically chooses sync or async based on expression
 */
export async function evalHyperScriptSmart(
  expression: string,
  context?: HyperScriptContext
): Promise<any> {
  if (isAsyncExpression(expression)) {
    return evalHyperScriptAsync(expression, context);
  } else {
    // Try sync first, fall back to async if needed
    try {
      return evalHyperScript(expression, context);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Async expressions not yet supported')) {
        return evalHyperScriptAsync(expression, context);
      }
      throw error;
    }
  }
}