/**
 * Top-level JS Feature Implementation
 * Executes JavaScript code at the top level and optionally exposes functions/values to global scope
 * Syntax: js <javascript_code> end
 */

import { FeatureImplementation, ExecutionContext } from '../types/core';

export class JSFeature implements FeatureImplementation {
  name = 'js';
  syntax = 'js <javascript_code> end';
  description = 'Execute JavaScript code at the top level with optional global exposure';

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length === 0) {
      throw new Error('JS feature requires JavaScript code to execute');
    }

    const jsCode = args[0];
    
    if (typeof jsCode !== 'string') {
      throw new Error('JavaScript code must be a string');
    }

    // Skip execution if code is empty or only whitespace
    if (!jsCode.trim()) {
      return undefined;
    }

    return this.executeJavaScript(context, jsCode);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'JS feature requires JavaScript code to execute';
    }

    if (typeof args[0] !== 'string') {
      return 'JavaScript code must be a string';
    }

    return null;
  }

  private async executeJavaScript(context: ExecutionContext, jsCode: string): Promise<any> {
    try {
      // Create a function that executes the JavaScript code
      // We use 'this' to refer to the global scope (window in browsers, global in Node)
      const jsFunction = new Function(jsCode);
      
      // Execute the function and get the result
      const result = jsFunction.call(globalThis);

      // If the result is an object (return value), expose its properties to global scope
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        this.exposeToGlobalScope(result);
      }

      // Handle async results
      if (result && typeof result.then === 'function') {
        const asyncResult = await result;
        if (asyncResult && typeof asyncResult === 'object' && !Array.isArray(asyncResult)) {
          this.exposeToGlobalScope(asyncResult);
        }
        return asyncResult;
      }

      return result;
    } catch (error: any) {
      throw new Error(`JavaScript execution error: ${error.message}`);
    }
  }

  private exposeToGlobalScope(returnObject: Record<string, any>): void {
    // Expose each property of the return object to the global scope
    for (const [key, value] of Object.entries(returnObject)) {
      (globalThis as any)[key] = value;
    }
  }
}

export default JSFeature;