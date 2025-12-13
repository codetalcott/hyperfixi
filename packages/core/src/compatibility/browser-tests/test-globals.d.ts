/**
 * Type declarations for browser test globals
 * These globals are injected by the test HTML pages
 */

import type { ASTNode } from '../../types';

declare global {
  /**
   * Global hyperfixi object available in browser context
   */
  const hyperfixi: {
    /**
     * Evaluate hyperscript code and return the result
     */
    evalHyperScript: (code: string, context?: any) => Promise<any>;
    /**
     * Parse hyperscript code into an AST
     */
    parse: (code: string) => ASTNode;
    /**
     * Other runtime methods
     */
    [key: string]: any;
  };

  /**
   * Shorthand for hyperfixi.evalHyperScript
   */
  function evalHyperScript(code: string, context?: any): Promise<any>;

  /**
   * Create DOM elements from HTML string (test helper)
   */
  function make(html: string): HTMLElement;

  /**
   * Clear the test work area (test helper)
   */
  function clearWorkArea(): void;

  /**
   * Get the test work area element (test helper)
   */
  function getWorkArea(): HTMLElement;

  /**
   * _hyperscript compatibility - global _hyperscript object
   */
  const _hyperscript: any;
}

export {};
