/**
 * HTML Attribute Processor for Hyperscript
 * Automatically detects and processes _="" attributes on elements
 */

import { hyperscript } from '../api/hyperscript-api';
import { createContext } from '../core/context';
import { debug } from '../utils/debug';

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
    console.log('[HyperFixi] AttributeProcessor.init() called');
    if (typeof document === 'undefined') {
      return; // Skip in non-browser environments
    }

    // Prevent double initialization
    if (this.initialized) {
      console.log('[HyperFixi] Already initialized, skipping');
      debug.parse('ATTR: Already initialized, skipping duplicate init()');
      return;
    }
    this.initialized = true;
    console.log('[HyperFixi] Starting initialization...');

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
    const dbg = ((window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || []);

    // Wait for external behaviors package to register (if loaded)
    // This ensures behaviors are available before elements try to install them
    if (typeof window !== 'undefined' && (window as any).__hyperfixi_behaviors_ready) {
      dbg.push('Waiting for external behaviors...');
      await (window as any).__hyperfixi_behaviors_ready;
      dbg.push('External behaviors registered');
    }

    // Process <script type="text/hyperscript"> tags FIRST
    // This ensures behaviors are defined before elements try to install them
    const scriptTags = document.querySelectorAll('script[type="text/hyperscript"]');
    dbg.push('Found ' + scriptTags.length + ' script tags');
    for (const script of scriptTags) {
      if (script instanceof HTMLScriptElement) {
        dbg.push(
          'Processing script tag: ' +
            (script.textContent?.substring(0, 50) || '').replace(/\n/g, ' ')
        );
        await this.processHyperscriptTag(script);
        dbg.push('Script tag processed');
      }
    }
    dbg.push('All script tags processed');

    // Process elements with _ attributes AFTER behaviors are defined
    const elements = document.querySelectorAll(`[${this.options.attributeName}]`);
    dbg.push(`Found ${elements.length} elements with _ attribute`);
    debug.parse(`SCAN: Found ${elements.length} elements to process`);

    // Process elements asynchronously and wait for all to complete
    const processPromises: Promise<void>[] = [];
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        const code = element.getAttribute(this.options.attributeName);
        dbg.push(`Processing element: ${element.tagName} with code: ${code?.substring(0, 40)}`);
        processPromises.push(this.processElementAsync(element));
      }
    });
    await Promise.all(processPromises);
    dbg.push('All elements processed');
    debug.parse('SCAN: All elements processed');
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
      console.warn(`[HyperFixi] Script with for="${selector}" found no matching elements`);
      return;
    }

    try {
      debug.parse(
        `SCRIPT: Compiling for="${selector}" code:`,
        hyperscriptCode.substring(0, 50) + '...'
      );

      // Compile once, execute for each target
      const compilationResult = hyperscript.compile(hyperscriptCode);

      if (!compilationResult.success) {
        const dbg = ((window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || []);
        dbg.push(
          `Script for="${selector}" COMPILE FAILED: ` + JSON.stringify(compilationResult.errors)
        );
        console.error(
          `[HyperFixi] Script for="${selector}" compilation failed:`,
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
      console.error(`[HyperFixi] Error processing script for="${selector}":`, error);
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
      const compilationResult = hyperscript.compile(hyperscriptCode);
      debug.parse('SCRIPT: Compilation result:', compilationResult.success ? 'SUCCESS' : 'FAILED');

      if (!compilationResult.success) {
        const dbg = ((window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || []);
        dbg.push('Script COMPILE FAILED: ' + JSON.stringify(compilationResult.errors));
        return;
      }

      const dbg = ((window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || []);
      dbg.push(
        'Script compiled, AST type: ' +
          compilationResult.ast?.type +
          ', name: ' +
          (compilationResult.ast as any)?.name
      );

      // Execute the compiled code (this will register behaviors)
      // Must await to ensure behaviors are registered before elements are processed
      await hyperscript.execute(compilationResult.ast!, context);

      dbg.push('Script executed successfully');
    } catch (error) {
      const dbg = ((window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || []);
      dbg.push('Script execution ERROR: ' + (error as Error).message);
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
      const compilationResult = hyperscript.compile(hyperscriptCode);
      debug.parse('ATTR: Compilation result:', compilationResult);

      if (!compilationResult.success) {
        debug.parse('ATTR: Hyperscript compilation failed for element:', element);
        debug.parse('ATTR: Code that failed:', hyperscriptCode);
        debug.parse('ATTR: Compilation errors:', JSON.stringify(compilationResult.errors, null, 2));
        compilationResult.errors.forEach((error, i) => {
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
              void this.processHyperscriptTag(element as HTMLScriptElement);
            }

            // Process descendant script tags
            const scriptTags = element.querySelectorAll?.('script[type="text/hyperscript"]');
            scriptTags?.forEach(script => {
              if (script instanceof HTMLScriptElement) {
                void this.processHyperscriptTag(script);
              }
            });

            // Process the element itself if it has hyperscript attribute
            if (element.getAttribute && element.getAttribute(this.options.attributeName)) {
              this.processElement(element);
            }

            // Process any descendant elements with hyperscript attributes
            const descendants = element.querySelectorAll?.(`[${this.options.attributeName}]`);
            descendants?.forEach(descendant => {
              if (descendant instanceof HTMLElement) {
                this.processElement(descendant);
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
  }
}

// Create and export default instance
export const defaultAttributeProcessor = new AttributeProcessor();

// Auto-initialize when DOM is ready
console.log('[HyperFixi] attribute-processor.ts loaded, document:', typeof document);
if (typeof document !== 'undefined') {
  console.log('[HyperFixi] Setting up auto-init, readyState:', document.readyState);
  (window as any).__hyperfixi_debug = (window as any).__hyperfixi_debug || [];
  (window as any).__hyperfixi_debug.push('Module loaded, readyState: ' + document.readyState);
  if (document.readyState === 'loading') {
    console.log('[HyperFixi] Adding DOMContentLoaded listener');
    (window as any).__hyperfixi_debug.push('Adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('[HyperFixi] DOMContentLoaded fired, calling init()');
      (window as any).__hyperfixi_debug.push('DOMContentLoaded fired');
      await defaultAttributeProcessor.init();
      console.log('[HyperFixi] init() completed');
      (window as any).__hyperfixi_debug.push('init() completed');
    });
  } else {
    // DOM is already ready
    console.log('[HyperFixi] DOM already ready, calling init() immediately');
    (window as any).__hyperfixi_debug.push('DOM already ready, calling init()');
    defaultAttributeProcessor.init().then(() => {
      console.log('[HyperFixi] init() completed');
      (window as any).__hyperfixi_debug.push('init() completed');
    });
  }
}
