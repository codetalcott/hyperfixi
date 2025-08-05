/**
 * Compatibility Adapter for Official _hyperscript Test Suite
 * Bridges our implementation with their testing expectations
 */

import type { ExecutionContext } from '../types/core';
import { parseAndEvaluateExpression } from '../parser/expression-parser';

// Create a DOM element with hyperscript processing (simplified for testing)
export function make(htmlString: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  const element = template.content.firstChild as HTMLElement;
  
  if (!element) {
    throw new Error(`Invalid HTML: ${htmlString}`);
  }
  
  // Add to work area for testing
  const workArea = getWorkArea();
  workArea.appendChild(element);
  
  return element;
}

// Clear the test work area
export function clearWorkArea(): void {
  const workArea = getWorkArea();
  workArea.innerHTML = '';
}

// Get or create test work area
function getWorkArea(): HTMLElement {
  let workArea = document.getElementById('work-area');
  if (!workArea) {
    workArea = document.createElement('div');
    workArea.id = 'work-area';
    workArea.style.display = 'none'; // Hidden during tests
    document.body.appendChild(workArea);
  }
  return workArea;
}

// Core compatibility function - evaluate hyperscript expressions
export async function evalHyperScript(
  expressionSource: string, 
  contextOptions?: {
    me?: HTMLElement;
    locals?: Record<string, any>;
    globals?: Record<string, any>;
    it?: any;
    you?: HTMLElement;
  }
): Promise<any> {
  // Create execution context compatible with their expectations
  const context: ExecutionContext = {
    me: contextOptions?.me || null,
    you: contextOptions?.you || null,
    it: contextOptions?.it,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    halted: false,
    returned: false,
    broke: false,
    continued: false,
    async: false
  };
  
  // Set up context variables (avoid readonly mutations)
  if (contextOptions?.locals) {
    Object.assign(context, { locals: new Map(Object.entries(contextOptions.locals)) });
  }
  
  if (contextOptions?.globals) {
    Object.assign(context, { globals: new Map(Object.entries(contextOptions.globals)) });
  }
  
  if (contextOptions?.it !== undefined) {
    Object.assign(context, { it: contextOptions.it });
  }
  
  if (contextOptions?.you) {
    context.you = contextOptions.you;
  }
  
  try {
    // Check if this is a command (starts with command keywords)
    const commandKeywords = ['set', 'put', 'add', 'remove', 'hide', 'show', 'toggle', 'render', 'increment', 'decrement', 'log'];
    const trimmedSource = expressionSource.trim();
    const isCommand = commandKeywords.some(keyword => trimmedSource.toLowerCase().startsWith(keyword + ' '));
    
    if (isCommand) {
      // Use the command execution system
      const { Runtime } = await import('../runtime/runtime');
      const { hyperscript } = await import('../api/hyperscript-api');
      
      // Parse and execute as a command using the full hyperscript system
      const result = await hyperscript.run(expressionSource, context);
      return result;
    } else {
      // Parse and evaluate as an expression using our integrated parser
      const result = await parseAndEvaluateExpression(expressionSource, context);
      return result;
    }
  } catch (error) {
    // Convert our errors to match their expectations
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Expression evaluation failed: ${error}`);
  }
}

// Synchronous version for simple expressions (matches their API)
export function evalHyperScriptSync(
  expressionSource: string,
  contextOptions?: {
    me?: HTMLElement;
    locals?: Record<string, any>;
    globals?: Record<string, any>;
    it?: any;
    you?: HTMLElement;
  }
): any {
  // For testing purposes, we'll wrap the async call
  let result: any;
  let error: any;
  let completed = false;
  
  evalHyperScript(expressionSource, contextOptions)
    .then(value => {
      result = value;
      completed = true;
    })
    .catch(err => {
      error = err;
      completed = true;
    });
  
  // Simple spin wait for testing (not recommended for production)
  const start = Date.now();
  while (!completed && Date.now() - start < 5000) {
    // Wait for async completion
  }
  
  if (error) {
    throw error;
  }
  
  if (!completed) {
    throw new Error('Expression evaluation timeout');
  }
  
  return result;
}

// Get parse errors (for testing error conditions)
export function getParseErrorFor(source: string): string | null {
  try {
    evalHyperScriptSync(source);
    return null; // No error
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// Compatibility utilities for their test patterns
export const testUtils = {
  make,
  clearWorkArea,
  evalHyperScript,
  evalHyperScriptSync,
  getParseErrorFor
};

// Create global _hyperscript-style function for compatibility
export function createHyperscriptCompat() {
  return {
    // Main evaluation function
    evaluate: evalHyperScript,
    
    // DOM utilities
    make,
    clearWorkArea,
    
    // Error handling
    getParseErrorFor,
    
    // Version info
    version: '1.0.0-hyperfixi',
    
    // Feature detection
    features: {
      expressions: true,
      commands: false, // Not yet implemented
      parser: false,   // Not yet implemented
      events: false    // Not yet implemented
    }
  };
}

// Default export for easy importing
export default {
  evalHyperScript,
  evalHyperScriptSync,
  make,
  clearWorkArea,
  getParseErrorFor,
  testUtils,
  createHyperscriptCompat
};