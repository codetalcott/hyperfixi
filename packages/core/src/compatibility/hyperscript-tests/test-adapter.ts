/**
 * _hyperscript Test Adapter
 * Runs official _hyperscript tests against hyperfixi implementation
 */

import type { ExecutionContext } from '../../types/core.js';
import { parseAndEvaluateExpression } from '../../parser/expression-parser.js';

// Mock the global _hyperscript function that tests expect
export function createHyperScriptTestAdapter() {
  // Replicate _hyperscript's global function signature
  const hyperfixiAdapter = async function(src: string, ctx?: any): Promise<any> {
    // Convert _hyperscript context format to our ExecutionContext
    const context: ExecutionContext = {
      me: ctx?.me || null,
      you: ctx?.you || null, 
      it: ctx?.it || ctx?.result || null,
      result: ctx?.result || null,
      locals: new Map(Object.entries(ctx?.locals || {})),
      globals: new Map(Object.entries(ctx?.globals || {}))
    };

    // Add any direct properties as locals (common pattern in _hyperscript tests)
    if (ctx) {
      for (const [key, value] of Object.entries(ctx)) {
        if (!['me', 'you', 'it', 'result', 'locals', 'globals'].includes(key)) {
          context.locals.set(key, value);
        }
      }
    }

    try {
      return await parseAndEvaluateExpression(src, context);
    } catch (error) {
      // Match _hyperscript error handling
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  // Add any additional methods that _hyperscript tests might expect
  (hyperfixiAdapter as any).processNode = function(node: Node) {
    // Placeholder - would implement DOM processing
    console.warn('processNode not implemented yet');
  };

  (hyperfixiAdapter as any).evaluate = hyperfixiAdapter;

  return hyperfixiAdapter;
}

// Test utilities that _hyperscript tests expect
export const testUtils = {
  evalHyperScript: async function(src: string, ctx?: any) {
    const adapter = createHyperScriptTestAdapter();
    return await adapter(src, ctx);
  },

  getParseErrorFor: function(src: string, ctx?: any): string {
    try {
      const adapter = createHyperScriptTestAdapter();
      adapter(src, ctx);
    } catch (e: any) {
      return e.message;
    }
    return "";
  },

  // Mock DOM utilities that tests use
  byId: function(id: string): Element | null {
    return document.getElementById(id);
  },

  make: function(htmlStr: string): Element {
    const range = document.createRange();
    const fragment = range.createContextualFragment(htmlStr);
    const workArea = document.createElement('div');
    workArea.id = 'work-area';
    if (!document.getElementById('work-area')) {
      document.body.appendChild(workArea);
    }
    const wa = document.getElementById('work-area')!;
    let child: Element | null = null;
    while (fragment.children.length > 0) {
      child = fragment.children[0] as Element;
      // TODO: Process hyperscript attributes when we implement command system
      wa.appendChild(child);
    }
    return child!;
  },

  clearWorkArea: function(): void {
    const workArea = document.getElementById('work-area');
    if (workArea) {
      workArea.innerHTML = '';
    }
  },

  getWorkArea: function(): Element | null {
    return document.getElementById('work-area');
  },

  // Promise utilities used in async tests
  promiseAnIntIn: function(millis: number): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(42);
      }, millis);
    });
  },

  promiseValueBackIn: function(value: any, millis: number): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, millis);
    });
  },

  // Assertion helpers
  startsWith: function(str: string, expected: string): void {
    if (!str || str.indexOf(expected) !== 0) {
      throw new Error(`Expected string '${str}' to start with '${expected}'`);
    }
  }
};