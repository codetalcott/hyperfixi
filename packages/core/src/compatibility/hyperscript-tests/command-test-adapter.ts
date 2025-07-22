/**
 * _hyperscript Command Test Adapter
 * Runs official _hyperscript command tests against our existing implementation
 */

import type { ExecutionContext } from '../../types/core.js';
import { parseAndEvaluateExpression } from '../../parser/expression-parser.js';

// Import our existing command implementations
import { executeCommand } from '../../commands/command-executor.js';

/**
 * Create a _hyperscript-compatible command execution environment
 */
export function createHyperScriptCommandAdapter() {
  
  // Main adapter function that mimics _hyperscript behavior
  const adapter = async function(script: string, context?: any): Promise<any> {
    // Convert _hyperscript context to our ExecutionContext
    const executionContext: ExecutionContext = {
      me: context?.me || null,
      you: context?.you || null,
      it: context?.it || context?.result || null,
      result: context?.result || null,
      locals: new Map(Object.entries(context?.locals || {})),
      globals: new Map(Object.entries(context?.globals || {}))
    };

    // Add direct context properties as locals
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (!['me', 'you', 'it', 'result', 'locals', 'globals'].includes(key)) {
          executionContext.locals.set(key, value);
        }
      }
    }

    try {
      // Try to parse as expression first
      if (isExpression(script)) {
        return await parseAndEvaluateExpression(script, executionContext);
      }
      
      // Otherwise, treat as command
      return await executeCommand(script, executionContext);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  // Add _hyperscript-compatible methods
  (adapter as any).evaluate = adapter;
  (adapter as any).processNode = function(node: Node) {
    // Mock for now - would implement full DOM processing
    console.warn('processNode not fully implemented');
  };

  return adapter;
}

/**
 * Determine if a script string is an expression vs a command
 */
function isExpression(script: string): boolean {
  const trimmed = script.trim();
  
  // Commands typically start with known command words
  const commandStarters = [
    'put', 'set', 'add', 'remove', 'show', 'hide', 'toggle',
    'if', 'repeat', 'wait', 'call', 'send', 'make', 'log',
    'increment', 'decrement', 'fetch', 'throw', 'return',
    'break', 'continue', 'halt', 'go'
  ];
  
  const firstWord = trimmed.split(/\s+/)[0];
  
  // If it starts with a command word, treat as command
  if (commandStarters.includes(firstWord)) {
    return false;
  }
  
  // If it has typical command syntax (e.g., "on click"), treat as command
  if (trimmed.startsWith('on ')) {
    return false;
  }
  
  // Otherwise, treat as expression
  return true;
}

/**
 * Test utilities that _hyperscript command tests expect
 */
export const commandTestUtils = {
  // Execute hyperscript code (commands or expressions)
  evalHyperScript: async function(src: string, ctx?: any) {
    const adapter = createHyperScriptCommandAdapter();
    return await adapter(src, ctx);
  },

  // Execute command specifically
  executeCommand: async function(commandStr: string, ctx?: any) {
    const executionContext: ExecutionContext = {
      me: ctx?.me || null,
      you: ctx?.you || null,
      it: ctx?.it || ctx?.result || null,
      result: ctx?.result || null,
      locals: new Map(Object.entries(ctx?.locals || {})),
      globals: new Map(Object.entries(ctx?.globals || {}))
    };

    if (ctx) {
      for (const [key, value] of Object.entries(ctx)) {
        if (!['me', 'you', 'it', 'result', 'locals', 'globals'].includes(key)) {
          executionContext.locals.set(key, value);
        }
      }
    }

    return await executeCommand(commandStr, executionContext);
  },

  // Get parse error for invalid syntax
  getParseErrorFor: function(src: string, ctx?: any): string {
    try {
      const adapter = createHyperScriptCommandAdapter();
      adapter(src, ctx);
    } catch (e: any) {
      return e.message;
    }
    return "";
  },

  // DOM utilities that command tests use
  make: function(htmlStr: string): Element {
    const range = document.createRange();
    const fragment = range.createContextualFragment(htmlStr);
    const workArea = getOrCreateWorkArea();
    let child: Element | null = null;
    
    while (fragment.children.length > 0) {
      child = fragment.children[0] as Element;
      // Process any _hyperscript attributes
      processHyperscriptAttributes(child);
      workArea.appendChild(child);
    }
    
    return child!;
  },

  clearWorkArea: function(): void {
    const workArea = document.getElementById('work-area');
    if (workArea) {
      workArea.innerHTML = '';
    }
  },

  getWorkArea: function(): Element {
    return getOrCreateWorkArea();
  },

  byId: function(id: string): Element | null {
    return document.getElementById(id);
  },

  // Promise utilities for async tests
  promiseAnIntIn: function(millis: number): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(42), millis);
    });
  },

  promiseValueBackIn: function(value: any, millis: number): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(value), millis);
    });
  },

  // Assertion helpers
  startsWith: function(str: string, expected: string): void {
    if (!str || str.indexOf(expected) !== 0) {
      throw new Error(`Expected string '${str}' to start with '${expected}'`);
    }
  }
};

/**
 * Get or create the work area div
 */
function getOrCreateWorkArea(): Element {
  let workArea = document.getElementById('work-area');
  if (!workArea) {
    workArea = document.createElement('div');
    workArea.id = 'work-area';
    workArea.style.display = 'none'; // Hide by default
    document.body.appendChild(workArea);
  }
  return workArea;
}

/**
 * Process _hyperscript attributes on an element
 */
function processHyperscriptAttributes(element: Element): void {
  // Look for _ attribute (main _hyperscript attribute)
  const hyprescriptAttr = element.getAttribute('_');
  if (hyprescriptAttr) {
    // For now, just store it - full processing would require complete parser integration
    element.setAttribute('data-hyperscript-processed', 'pending');
    console.log('Found _hyperscript attribute:', hyprescriptAttr);
  }
  
  // Process child elements recursively
  for (const child of Array.from(element.children)) {
    processHyperscriptAttributes(child);
  }
}