/**
 * _hyperscript Compatible API
 * 
 * This module provides the main _hyperscript API object that matches
 * the original _hyperscript interface for drop-in compatibility.
 */

import { Lexer } from './tokenizer';
import { HyperscriptParser, parseHyperscript } from './hyperscript-parser';
import type { ExecutionContext } from './types/core';

/**
 * Configuration object for _hyperscript
 */
export interface HyperscriptConfig {
  attributes: string;
  defaultTransition: string;
  disableSelector: string;
  hideShowStrategies: Record<string, any>;
  conversions: Record<string, (value: any, context?: ExecutionContext) => any>;
}

/**
 * Internal APIs exposed for testing and advanced usage
 */
export interface HyperscriptInternals {
  lexer: typeof Lexer;
  parser: typeof HyperscriptParser;
  runtime: any; // Will be implemented next
}

/**
 * Main _hyperscript API object
 */
export interface HyperscriptAPI {
  // Core methods
  processNode(element: Element): void;
  process(element: Element): void; // Alias for processNode for HTMX compatibility
  evaluate(src: string, ctx?: any): Promise<any>;
  parse(src: string): any;
  
  // Configuration
  config: HyperscriptConfig;
  
  // Internal access for testing
  internals: HyperscriptInternals;
  
  // Extension points
  addFeature(keyword: string, definition: any): void;
  addCommand(keyword: string, definition: any): void;
  addLeafExpression(keyword: string, definition: any): void;
  addIndirectExpression(keyword: string, definition: any): void;
  
  // Browser integration
  browserInit(): void;
}

/**
 * Default configuration matching _hyperscript defaults
 */
const defaultConfig: HyperscriptConfig = {
  attributes: "_, script, data-script",
  defaultTransition: "all 500ms ease-in",
  disableSelector: "[disable-scripting]",
  hideShowStrategies: {},
  conversions: {
    // Type conversion functions will be added here
    String: (value: any) => String(value),
    Number: (value: any) => Number(value),
    Int: (value: any) => parseInt(String(value), 10),
    Float: (value: any) => parseFloat(String(value)),
    Boolean: (value: any) => Boolean(value),
    JSON: (value: any) => JSON.stringify(value),
    Object: (value: any) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return value;
    }
  }
};

/**
 * Create the main _hyperscript API object
 */
export function createHyperscriptAPI(): HyperscriptAPI {
  const api: HyperscriptAPI = {
    processNode(_element: Element): void {
      // TODO: Implement DOM node processing
      console.warn('processNode not yet implemented');
    },
    process(element: Element): void {
      // Alias for processNode for HTMX API compatibility
      return api.processNode(element);
    },

    async evaluate(_src: string, _ctx?: any): Promise<any> {
      // TODO: Implement expression evaluation
      console.warn('evaluate not yet implemented');
      return null;
    },

    parse(src: string): any {
      const result = parseHyperscript(src);
      if (result.success) {
        return result.result;
      } else {
        throw new Error(`Parse error: ${result.error?.message || 'Unknown parse error'}`);
      }
    },

    config: { ...defaultConfig },

    internals: {
      lexer: Lexer,
      parser: HyperscriptParser,
      runtime: null // Will be set when runtime is implemented
    },

    addFeature(_keyword: string, _definition: any): void {
      // TODO: Implement feature registration
      console.warn('addFeature not yet implemented');
    },

    addCommand(_keyword: string, _definition: any): void {
      // TODO: Implement command registration
      console.warn('addCommand not yet implemented');
    },

    addLeafExpression(_keyword: string, _definition: any): void {
      // TODO: Implement leaf expression registration
      console.warn('addLeafExpression not yet implemented');
    },

    addIndirectExpression(_keyword: string, _definition: any): void {
      // TODO: Implement indirect expression registration
      console.warn('addIndirectExpression not yet implemented');
    },

    browserInit(): void {
      // TODO: Implement browser initialization
      if (typeof document !== 'undefined') {
        // Process existing elements with hyperscript attributes
        console.warn('browserInit not yet implemented');
      }
    }
  };

  return api;
}

/**
 * Global _hyperscript API instance
 */
export const _hyperscript = createHyperscriptAPI();

// For compatibility, also expose as global if in browser
if (typeof globalThis !== 'undefined') {
  (globalThis as any)._hyperscript = _hyperscript;
}

export default _hyperscript;