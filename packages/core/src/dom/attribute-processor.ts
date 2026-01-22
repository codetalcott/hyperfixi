/**
 * HTML Attribute Processor for Hyperscript
 * Automatically detects and processes _="" attributes on elements
 */

import { hyperscript } from '../api/hyperscript-api';
import { createContext } from '../core/context';
import { debug } from '../utils/debug';

// Type declarations for window extensions used by external packages
declare global {
  interface Window {
    __hyperfixi_behaviors_ready?: Promise<void>;
  }
}

export interface AttributeProcessorOptions {
  attributeName?: string;
  autoScan?: boolean;
  processOnlyNewElements?: boolean;
}

export class AttributeProcessor {
  private processedElements = new WeakSet<HTMLElement>();
  private options: Required<AttributeProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedCount = 0;
  private readyEventDispatched = false;
  private initialized = false;

  constructor(options: AttributeProcessorOptions = {}) {
    this.options = {
      attributeName: '_',
      autoScan: true,
      processOnlyNewElements: true,
      ...options,
    };
  }

  /**
   * Initialize the attribute processor
   * This sets up automatic scanning and processing of hyperscript attributes
   */
  async init(): Promise<void> {
    debug.parse('ATTR: init() called');
    if (typeof document === 'undefined') {
      return; // Skip in non-browser environments
    }

    // Prevent double initialization
    if (this.initialized) {
      debug.parse('ATTR: Already initialized, skipping duplicate init()');
      return;
    }
    this.initialized = true;
    debug.parse('ATTR: Starting initialization...');

    // Process existing elements
    if (this.options.autoScan) {
      // Must await to ensure behaviors are defined before elements are processed
      await this.scanAndProcessAll();

      // Dispatch hyperscript:ready event after initial page processing
      this.dispatchReadyEvent();
    }

    // Set up mutation observer for new elements
    this.setupMutationObserver();
  }

  /**
   * Scan and process all elements with hyperscript attributes in the document
   */
  async scanAndProcessAll(): Promise<void> {
    // Wait for external behaviors package to register (if loaded)
    // This ensures behaviors are available before elements try to install them
    if (typeof window !== 'undefined' && window.__hyperfixi_behaviors_ready) {
      debug.parse('ATTR: Waiting for external behaviors...');
      await window.__hyperfixi_behaviors_ready;
      debug.parse('ATTR: External behaviors registered');
    }

    // Process <script type="text/hyperscript"> tags FIRST
    // This ensures behaviors are defined before elements try to install them
    const scriptTags = document.querySelectorAll('script[type="text/hyperscript"]');
    debug.parse(`ATTR: Found ${scriptTags.length} script tags`);
    for (const script of scriptTags) {
      if (script instanceof HTMLScriptElement) {
        debug.parse('ATTR: Processing script tag:', script.textContent?.substring(0, 50));
        await this.processHyperscriptTag(script);
      }
    }

    // Process elements with _ attributes AFTER behaviors are defined
    const elements = document.querySelectorAll(`[${this.options.attributeName}]`);
    debug.parse(`ATTR: Found ${elements.length} elements to process`);

    // Process elements asynchronously and wait for all to complete
    const processPromises: Promise<void>[] = [];
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        processPromises.push(this.processElementAsync(element));
      }
    });
    await Promise.all(processPromises);
    debug.parse('ATTR: All elements processed');

    // Dispatch completion event for testing
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lokascript:initialized', {
          detail: { scriptsProcessed: scriptTags.length, elementsProcessed: elements.length },
        })
      );
    }
  }

  /**
   * Process a <script type="text/hyperscript"> tag
   * Supports optional 'for' attribute to bind to specific elements
   */
  private async processHyperscriptTag(script: HTMLScriptElement): Promise<void> {
    const forSelector = script.getAttribute('for');

    if (forSelector) {
      await this.processHyperscriptTagForElements(script, forSelector);
    } else {
      await this.processHyperscriptTagGlobal(script);
    }
  }

  /**
   * Process a script tag with 'for' attribute - binds to specific elements
   * Example: <script type="text/hyperscript" for="#my-btn">on click toggle .active</script>
   */
  private async processHyperscriptTagForElements(
    script: HTMLScriptElement,
    selector: string
  ): Promise<void> {
    debug.parse(`SCRIPT: Processing hyperscript script tag with for="${selector}"`);

    const hyperscriptCode = script.textContent || script.innerHTML;
    if (!hyperscriptCode || !hyperscriptCode.trim()) {
      debug.parse('SCRIPT: No hyperscript code found in script tag');
      return;
    }

    // Resolve target elements
    const targets = document.querySelectorAll(selector);

    if (targets.length === 0) {
      console.warn(`[LokaScript] Script with for="${selector}" found no matching elements`);
      return;
    }

    try {
      debug.parse(
        `SCRIPT: Compiling for="${selector}" code:`,
        hyperscriptCode.substring(0, 50) + '...'
      );

      // Compile once, execute for each target
      const compilationResult = hyperscript.compileSync(hyperscriptCode);

      if (!compilationResult.ok) {
        debug.parse(`ATTR: Script for="${selector}" compilation failed:`, compilationResult.errors);
        console.error(
          `[LokaScript] Script for="${selector}" compilation failed:`,
          compilationResult.errors
        );
        return;
      }

      // Execute for each matched element
      for (const target of targets) {
        if (target instanceof HTMLElement) {
          const context = createContext(target); // 'me' = target element
          await hyperscript.execute(compilationResult.ast!, context);
        }
      }

      debug.parse(`SCRIPT: Executed for="${selector}" on ${targets.length} element(s)`);
    } catch (error) {
      console.error(`[LokaScript] Error processing script for="${selector}":`, error);
    }
  }

  /**
   * Process a global script tag (no 'for' attribute) - for behavior definitions
   */
  private async processHyperscriptTagGlobal(script: HTMLScriptElement): Promise<void> {
    debug.parse('SCRIPT: Processing hyperscript script tag');

    const hyperscriptCode = script.textContent || script.innerHTML;
    if (!hyperscriptCode || !hyperscriptCode.trim()) {
      debug.parse('SCRIPT: No hyperscript code found in script tag');
      return;
    }

    try {
      debug.parse('SCRIPT: Compiling script tag code:', hyperscriptCode.substring(0, 50) + '...');

      // Create execution context (no specific element for global behavior definitions)
      const context = createContext(null);

      // Compile the hyperscript code
      const compilationResult = hyperscript.compileSync(hyperscriptCode);
      debug.parse('SCRIPT: Compilation result:', compilationResult.ok ? 'SUCCESS' : 'FAILED');

      if (!compilationResult.ok) {
        debug.parse('ATTR: Script compilation failed:', compilationResult.errors);
        return;
      }

      debug.parse(
        'ATTR: Script compiled, AST type:',
        compilationResult.ast?.type,
        'name:',
        (compilationResult.ast as { name?: string })?.name
      );

      // Execute the compiled code (this will register behaviors)
      // Must await to ensure behaviors are registered before elements are processed
      await hyperscript.execute(compilationResult.ast!, context);

      debug.parse('ATTR: Script executed successfully');
    } catch (error) {
      debug.parse('ATTR: Script execution error:', (error as Error).message);
    }
  }

  /**
   * Process a single element's hyperscript attribute (sync wrapper for backwards compatibility)
   */
  processElement(element: HTMLElement): void {
    // Fire and forget - for backwards compatibility
    void this.processElementAsync(element);
  }

  /**
   * Process a single element's hyperscript attribute (async)
   */
  async processElementAsync(element: HTMLElement): Promise<void> {
    debug.parse('ATTR: Attempting to process element:', element);

    // Skip if already processed and we only process new elements
    if (this.options.processOnlyNewElements && this.processedElements.has(element)) {
      debug.parse('ATTR: Skipping already processed element');
      return;
    }

    const hyperscriptCode = element.getAttribute(this.options.attributeName);
    debug.parse('ATTR: Found hyperscript code:', hyperscriptCode);

    if (!hyperscriptCode) {
      debug.parse('ATTR: No hyperscript code found on element');
      return;
    }

    try {
      debug.parse('ATTR: Processing element with code:', hyperscriptCode);

      // Create execution context with the element as 'me'
      const context = createContext(element);
      debug.parse('ATTR: Created context for element');

      // Parse and prepare the hyperscript code
      debug.parse('ATTR: About to compile hyperscript code');
      const compilationResult = hyperscript.compileSync(hyperscriptCode);
      debug.parse('ATTR: Compilation result:', compilationResult);

      if (!compilationResult.ok) {
        debug.parse('ATTR: Hyperscript compilation failed for element:', element);
        debug.parse('ATTR: Code that failed:', hyperscriptCode);
        debug.parse('ATTR: Compilation errors:', JSON.stringify(compilationResult.errors, null, 2));
        (compilationResult.errors || []).forEach((error, i) => {
          debug.parse(
            `ATTR: Error ${i + 1}:`,
            error.message,
            `at line ${error.line}, column ${error.column}`
          );
        });
        return;
      }

      debug.parse('ATTR: Compilation succeeded, processing handler type');

      // Execute the compiled AST and WAIT for it to complete
      // This ensures behavior installation is complete before continuing
      debug.parse('ATTR: Executing compiled AST');
      await hyperscript.execute(compilationResult.ast!, context);

      // Mark as processed
      this.processedElements.add(element);
      this.processedCount++;

      // Dispatch load event on the element after successful processing
      this.dispatchLoadEvent(element);
    } catch (error) {
      debug.parse('ATTR: Error processing hyperscript attribute on element:', element, error);
    }
  }

  /**
   * Dispatch load event on an element after it has been processed
   */
  private dispatchLoadEvent(element: HTMLElement): void {
    try {
      const loadEvent = new Event('load', {
        bubbles: false, // Element-specific event
        cancelable: false,
      });
      element.dispatchEvent(loadEvent);
    } catch (error) {
      debug.parse('ATTR: Error dispatching load event on element:', element, error);
    }
  }

  /**
   * Dispatch hyperscript:ready event on the document after initial processing
   */
  private dispatchReadyEvent(): void {
    // Only dispatch once
    if (this.readyEventDispatched) {
      return;
    }

    try {
      const readyEvent = new CustomEvent('hyperscript:ready', {
        bubbles: true,
        cancelable: false,
        detail: {
          processedElements: this.processedCount,
          timestamp: Date.now(),
        },
      });
      document.dispatchEvent(readyEvent);
      this.readyEventDispatched = true;
    } catch (error) {
      debug.parse('ATTR: Error dispatching hyperscript:ready event:', error);
    }
  }

  /**
   * Set up mutation observer to process new elements
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      return; // Skip in environments without MutationObserver
    }

    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Process added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Process hyperscript script tags (including those with 'for' attribute)
            if (
              element.tagName === 'SCRIPT' &&
              element.getAttribute('type') === 'text/hyperscript'
            ) {
              this.processHyperscriptTag(element as HTMLScriptElement).catch(err => {
                debug.parse('ATTR: Error processing dynamically added script tag:', err);
              });
            }

            // Process descendant script tags
            const scriptTags = element.querySelectorAll?.('script[type="text/hyperscript"]');
            scriptTags?.forEach(script => {
              if (script instanceof HTMLScriptElement) {
                this.processHyperscriptTag(script).catch(err => {
                  debug.parse('ATTR: Error processing dynamically added script tag:', err);
                });
              }
            });

            // Process the element itself if it has hyperscript attribute
            if (element.getAttribute && element.getAttribute(this.options.attributeName)) {
              this.processElementAsync(element).catch(err => {
                debug.parse('ATTR: Error processing dynamically added element:', err);
              });
            }

            // Process any descendant elements with hyperscript attributes
            const descendants = element.querySelectorAll?.(`[${this.options.attributeName}]`);
            descendants?.forEach(descendant => {
              if (descendant instanceof HTMLElement) {
                this.processElementAsync(descendant).catch(err => {
                  debug.parse('ATTR: Error processing dynamically added element:', err);
                });
              }
            });
          }
        });
      });
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Destroy the attribute processor and clean up resources
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.initialized = false;
    this.readyEventDispatched = false;
    this.processedCount = 0;
  }

  /**
   * Reset the processor (alias for destroy, allows re-initialization)
   */
  reset(): void {
    this.destroy();
  }
}

// Create and export default instance
export const defaultAttributeProcessor = new AttributeProcessor();

// Note: Auto-initialization is handled by browser bundles (browser-bundle.ts)
// This keeps the module free of side effects for better testability
