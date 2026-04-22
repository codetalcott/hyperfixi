/**
 * _hyperscript API Compatibility Layer
 * Provides evalHyperScript() function that matches the original _hyperscript API
 */

import { parseAndEvaluateExpression } from '../parser/expression-parser';
import { Parser } from '../parser/parser';
import { Runtime } from '../runtime/runtime';
import { tokenize } from '../parser/tokenizer';
import { COMMANDS } from '../parser/parser-constants';
import { setGlobal } from '../parser/extensions';
import type { ExecutionContext } from '../types/core';
import type { SemanticAnalyzerInterface } from '../parser/types';
import {
  createSemanticAnalyzer,
  DEFAULT_CONFIDENCE_THRESHOLD,
  type SemanticAnalyzer,
} from '@lokascript/semantic';

// Singleton semantic analyzer instance (lazy-initialized)
let semanticAnalyzerInstance: SemanticAnalyzer | null = null;

/**
 * Get or create the singleton semantic analyzer instance.
 * Lazy initialization to avoid overhead if not used.
 */
function getSemanticAnalyzer(): SemanticAnalyzerInterface {
  if (!semanticAnalyzerInstance) {
    semanticAnalyzerInstance = createSemanticAnalyzer();
  }
  return semanticAnalyzerInstance as unknown as SemanticAnalyzerInterface;
}

/**
 * Context interface matching _hyperscript's expected format
 */
export interface HyperScriptContext {
  /** The current element (equivalent to 'me') */
  me?: any;
  /** Local variables scope */
  locals?: Record<string, any>;
  /** The current result (equivalent to 'it') */
  it?: any;
  /** Result from previous operation (also equivalent to 'it') */
  result?: any;
  /** Target element for operations (equivalent to 'you') */
  you?: any;
  /** Global variables scope */
  globals?: Record<string, any>;
  /** ISO 639-1 language code for semantic parsing. Default: 'en' */
  language?: string;
}

/**
 * Converts _hyperscript context format to our internal ExecutionContext format
 */
function convertContext(
  hyperScriptContext?: HyperScriptContext | ExecutionContext
): ExecutionContext {
  // If it's already an ExecutionContext, return as-is
  if (
    hyperScriptContext &&
    typeof (hyperScriptContext as any).locals === 'object' &&
    (hyperScriptContext as any).locals instanceof Map
  ) {
    return hyperScriptContext as ExecutionContext;
  }

  const context: ExecutionContext = {
    me: hyperScriptContext?.me || null,
    you: hyperScriptContext?.you || null,
    it: (hyperScriptContext as any)?.it || hyperScriptContext?.result,
    result: hyperScriptContext?.result,
    locals: new Map(),
    globals: new Map(),
    halted: false,
    returned: false,
    broke: false,
    continued: false,
    async: false,
  };

  if (!hyperScriptContext) {
    return context;
  }

  // Handle structured format with locals/globals properties
  if (hyperScriptContext.locals && typeof hyperScriptContext.locals === 'object') {
    for (const [key, value] of Object.entries(hyperScriptContext.locals)) {
      context.locals.set(key, value);
    }
  }

  if (hyperScriptContext.globals && typeof hyperScriptContext.globals === 'object') {
    // Handle both Map and plain object globals
    if (hyperScriptContext.globals instanceof Map) {
      for (const [key, value] of hyperScriptContext.globals) {
        setGlobal(context, key, value);
      }
    } else {
      for (const [key, value] of Object.entries(hyperScriptContext.globals)) {
        setGlobal(context, key, value);
      }
    }
  }

  // Handle plain object format - treat unknown properties as locals
  // This supports calling evalHyperScript('expr', { var1: 'value1', var2: 'value2' })
  const knownProperties = new Set(['me', 'you', 'it', 'result', 'locals', 'globals', 'language']);
  for (const [key, value] of Object.entries(hyperScriptContext)) {
    if (!knownProperties.has(key) && typeof value !== 'undefined') {
      context.locals.set(key, value);
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
  context?: HyperScriptContext | ExecutionContext
): Promise<any> {
  // Handle empty input
  if (!script || script.trim() === '') {
    throw new Error('Cannot evaluate empty script');
  }

  try {
    // Convert context
    const executionContext = convertContext(context);

    // Extract language from context (default to 'en' for English)
    const language = (context as HyperScriptContext)?.language || 'en';

    // Determine if this is a command or expression
    if (isCommand(script)) {
      // Use the new runtime system for commands with semantic parsing
      return await executeAsCommand(script, executionContext, language);
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
  const trimmed = script.trim().toLowerCase();

  // Known command patterns (more specific matching)
  const commandPatterns = [
    /^set\s+.+\s+to\s+.+/, // set x to y
    /^put\s+.+\s+(into|before|after)\s+.+/, // put x into y
    /^add\s+.+(\s+to\s+.+)?/, // add .class or add .class to #element
    /^remove\s+.+(\s+from\s+.+)?/, // remove .class or remove .class from #element
    /^show\s+.+/, // show #element
    /^hide\s+.+/, // hide #element
    /^toggle\s+.+/, // toggle .class
    /^log\s+.*/, // log "message" (can have no args)
    /^wait\s+.+/, // wait 1s
    /^call\s+.+/, // call function()
    /^send\s+.+/, // send event
    /^make\s+.+/, // make <div/>
    /^increment\s+.+/, // increment counter
    /^decrement\s+.+/, // decrement counter
    /^fetch\s+.+/, // fetch /api/data
    /^throw\s+.+/, // throw error
    /^return\s+.+/, // return value
    /^break/, // break
    /^continue/, // continue
    /^halt/, // halt
    /^go\s+.+/, // go to #section
    /^if\s+.+/, // if condition
    /^repeat\s+.+/, // repeat for x in list
    /^on\s+.+/, // on click
    /^render\s+.+/, // render #template or render #template with data
  ];

  // Check specific patterns first
  if (commandPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }

  // Fallback: check if the first word is a known command from the authoritative COMMANDS set.
  // This ensures newly added commands are recognized without needing regex patterns.
  const firstWord = trimmed.split(/\s/)[0];
  if (firstWord && COMMANDS.has(firstWord)) {
    return true;
  }

  return false;
}

/**
 * Execute script as a command using full parser + runtime with semantic analysis
 */
async function executeAsCommand(
  script: string,
  context: ExecutionContext,
  language: string = 'en'
): Promise<any> {
  // Tokenize
  const tokens = tokenize(script);

  // Parse with full parser, using semantic analyzer for multilingual support
  const parser = new Parser(tokens, {
    semanticAnalyzer: getSemanticAnalyzer(),
    language,
    semanticConfidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  });
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
  context?: HyperScriptContext | ExecutionContext
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
  context?: HyperScriptContext | ExecutionContext
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
