/**
 * Minimal Attribute Processor - Tree-Shakeable
 *
 * Lightweight DOM attribute processor that doesn't import hyperscript-api
 * This allows Rollup to tree-shake unused commands from bundles.
 */

import type { ExecutionContext } from '../types/base-types';
import { createContext } from '../core/context';

/**
 * Minimal runtime interface (duck-typing)
 */
export interface MinimalRuntime {
  execute(code: string, context?: ExecutionContext): Promise<any>;
  parse(code: string): any;
}

/**
 * Tree-shakeable attribute processor
 * Scans and executes _="" attributes without importing full Runtime
 */
export class MinimalAttributeProcessor {
  private runtime: MinimalRuntime;
  private observer: MutationObserver | null = null;

  constructor(runtime: MinimalRuntime) {
    this.runtime = runtime;
  }

  /**
   * Initialize DOM scanning for _="" attributes
   * Scans existing elements and watches for new ones
   */
  init(): void {
    if (typeof document === 'undefined') {
      return; // Not in browser environment
    }

    // Process existing elements
    this.scanDocument();

    // Watch for new elements with MutationObserver
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processElement(node as Element);
              this.scanElement(node as Element);
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === '_') {
          const target = mutation.target as Element;
          this.processElement(target);
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['_']
    });
  }

  /**
   * Stop watching for changes
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Scan entire document for _="" attributes
   */
  private scanDocument(): void {
    this.scanElement(document.body);
  }

  /**
   * Scan element and its descendants for _="" attributes
   */
  private scanElement(root: Element): void {
    const elements = root.querySelectorAll('[_]');
    elements.forEach(el => this.processElement(el));
  }

  /**
   * Process a single element with _="" attribute
   */
  private processElement(element: Element): void {
    const code = element.getAttribute('_');
    if (!code) return;

    // Create context with element as 'me'
    const context = createContext({ me: element });

    // Execute hyperscript code
    this.runtime.execute(code, context).catch((error) => {
      console.error('[HyperFixi] Error executing _="" attribute:', error);
      console.error('Element:', element);
      console.error('Code:', code);
    });
  }
}

/**
 * Create a default minimal attribute processor instance
 */
export function createMinimalAttributeProcessor(runtime: MinimalRuntime): MinimalAttributeProcessor {
  return new MinimalAttributeProcessor(runtime);
}
