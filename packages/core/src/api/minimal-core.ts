/**
 * Minimal Core API - Zod-Free
 * 
 * This is a lightweight version of the HyperFixi API that excludes all enhanced
 * features requiring zod validation. Perfect for demos and basic usage.
 */

import { parse } from '../parser/parser';
import { MinimalRuntime } from '../runtime/minimal-runtime';
import { createContext } from '../core/context';
import type { ASTNode, ExecutionContext, ParseError } from '../types/base-types';

// ============================================================================
// Minimal API Types (no enhanced features)
// ============================================================================

export interface MinimalCompilationResult {
  success: boolean;
  ast?: ASTNode;
  errors: ParseError[];
}

export interface MinimalHyperscriptAPI {
  /**
   * Compile and execute hyperscript code in one step
   * @param code - The hyperscript code to evaluate
   * @param context - Optional execution context
   */
  evaluate(code: string, context?: ExecutionContext): Promise<unknown>;

  /**
   * Compile hyperscript code to AST
   * @param code - The hyperscript code to compile
   */
  compile(code: string): Promise<MinimalCompilationResult>;

  /**
   * Execute pre-compiled AST
   * @param ast - The compiled AST to execute
   * @param context - Optional execution context
   */
  run(ast: ASTNode, context?: ExecutionContext): Promise<unknown>;

  /**
   * Create an execution context
   * @param element - The DOM element for 'me' context (optional)
   */
  createContext(element?: HTMLElement | null): ExecutionContext;

  /**
   * Process hyperscript attributes on DOM elements
   * @param root - Root element to process (default: document.body)
   */
  processNode(root?: Element): void;
}

// ============================================================================
// Minimal Runtime Implementation
// ============================================================================

const runtime = new MinimalRuntime({ debug: false });

/**
 * Compile hyperscript code to AST
 */
async function compile(code: string): Promise<MinimalCompilationResult> {
  try {
    const parseResult = parse(code);
    
    if (parseResult.success && parseResult.ast) {
      return {
        success: true,
        ast: parseResult.ast,
        errors: []
      };
    } else {
      return {
        success: false,
        errors: parseResult.error ? [parseResult.error] : []
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        name: 'CompileError',
        message: error instanceof Error ? error.message : 'Unknown compilation error',
        line: 1,
        column: 1
      }]
    };
  }
}

/**
 * Execute compiled AST
 */
async function run(ast: ASTNode, context?: ExecutionContext): Promise<unknown> {
  try {
    const execContext = context || createContext(document.body);
    return await runtime.execute(ast, execContext);
  } catch (error) {
    console.error('HyperFixi execution error:', error);
    throw error;
  }
}

/**
 * Compile and execute in one step
 */
async function evaluate(code: string, context?: ExecutionContext): Promise<unknown> {
  const compilationResult = await compile(code);
  
  if (!compilationResult.success) {
    const errorMessages = compilationResult.errors.map(e => e.message).join(', ');
    throw new Error(`Compilation failed: ${errorMessages}`);
  }

  return await run(compilationResult.ast!, context);
}

/**
 * Process hyperscript attributes on DOM nodes
 */
function processNode(root: Element = document.body): void {
  // Find all elements with hyperscript attributes
  const elements = root.querySelectorAll('[_]');
  
  elements.forEach(async (element) => {
    const code = element.getAttribute('_');
    if (code) {
      try {
        const context = createContext(element as HTMLElement);
        await evaluate(code, context);
      } catch (error) {
        console.error(`Error processing hyperscript on element:`, element, error);
      }
    }
  });
}

// ============================================================================
// Minimal API Export
// ============================================================================

/**
 * Minimal HyperFixi API - no enhanced features, no zod dependencies
 */
export const hyperscript: MinimalHyperscriptAPI = {
  evaluate,
  compile,
  run,
  createContext,
  processNode
};

// Default export
export default hyperscript;