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

  constructor(options: AttributeProcessorOptions = {}) {
    this.options = {
      attributeName: '_',
      autoScan: true,
      processOnlyNewElements: true,
      ...options
    };
  }

  /**
   * Initialize the attribute processor
   * This sets up automatic scanning and processing of hyperscript attributes
   */
  init(): void {
    if (typeof document === 'undefined') {
      return; // Skip in non-browser environments
    }

    // Process existing elements
    if (this.options.autoScan) {
      this.scanAndProcessAll();

      // Dispatch hyperscript:ready event after initial page processing
      this.dispatchReadyEvent();
    }

    // Set up mutation observer for new elements
    this.setupMutationObserver();
  }

  /**
   * Scan and process all elements with hyperscript attributes in the document
   */
  scanAndProcessAll(): void {
    // Process elements with _ attributes
    const elements = document.querySelectorAll(`[${this.options.attributeName}]`);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        this.processElement(element);
      }
    });

    // Process <script type="text/hyperscript"> tags
    const scriptTags = document.querySelectorAll('script[type="text/hyperscript"]');
    scriptTags.forEach(script => {
      if (script instanceof HTMLScriptElement) {
        this.processHyperscriptTag(script);
      }
    });
  }

  /**
   * Process a <script type="text/hyperscript"> tag
   */
  private processHyperscriptTag(script: HTMLScriptElement): void {
    debug.parse('SCRIPT: Processing hyperscript script tag');

    const hyperscriptCode = script.textContent || script.innerHTML;
    if (!hyperscriptCode || !hyperscriptCode.trim()) {
      debug.parse('SCRIPT: No hyperscript code found in script tag');
      return;
    }

    try {
      debug.parse('SCRIPT: Compiling hyperscript code from script tag:', hyperscriptCode.substring(0, 100));

      // Create execution context (no specific element for global behavior definitions)
      const context = createContext(null);

      // Compile the hyperscript code
      const compilationResult = hyperscript.compile(hyperscriptCode);

      if (!compilationResult.success) {
        console.error(`🔧 SCRIPT: Hyperscript compilation failed for script tag`);
        console.error(`🔧 SCRIPT: Code that failed:`, hyperscriptCode);
        console.error(`🔧 SCRIPT: Compilation errors:`, JSON.stringify(compilationResult.errors, null, 2));
        compilationResult.errors?.forEach((error: any, i: number) => {
          console.error(`🔧 SCRIPT: Error ${i + 1}:`, error.message, `at line ${error.line}, column ${error.column}`);
        });
        return;
      }

      debug.parse('SCRIPT: Compilation succeeded, executing...');

      // Execute the compiled code (this will register behaviors)
      hyperscript.execute(compilationResult.ast!, context);

      debug.parse('SCRIPT: Script tag processing complete');
    } catch (error) {
      console.error(`Error processing hyperscript script tag:`, error);
    }
  }

  /**
   * Process a single element's hyperscript attribute
   */
  processElement(element: HTMLElement): void {
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
        console.error(`🔧 ATTR: Hyperscript compilation failed for element:`, element);
        console.error(`🔧 ATTR: Code that failed:`, hyperscriptCode);
        console.error(`🔧 ATTR: Compilation errors:`, JSON.stringify(compilationResult.errors, null, 2));
        compilationResult.errors.forEach((error, i) => {
          console.error(`🔧 ATTR: Error ${i + 1}:`, error.message, `at line ${error.line}, column ${error.column}`);
        });
        return;
      }

      debug.parse('ATTR: Compilation succeeded, processing handler type');

      // Execute the compiled AST regardless of whether it's an event handler or immediate execution
      // The runtime will handle event handlers properly by registering them
      debug.parse('ATTR: Executing compiled AST');
      hyperscript.execute(compilationResult.ast!, context);

      // Mark as processed
      this.processedElements.add(element);
      this.processedCount++;

      // Dispatch load event on the element after successful processing
      this.dispatchLoadEvent(element);
    } catch (error) {
      console.error(`Error processing hyperscript attribute on element:`, element, error);
    }
  }

  /**
   * Dispatch load event on an element after it has been processed
   */
  private dispatchLoadEvent(element: HTMLElement): void {
    try {
      const loadEvent = new Event('load', {
        bubbles: false, // Element-specific event
        cancelable: false
      });
      element.dispatchEvent(loadEvent);
    } catch (error) {
      console.error(`Error dispatching load event on element:`, element, error);
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
          timestamp: Date.now()
        }
      });
      document.dispatchEvent(readyEvent);
      this.readyEventDispatched = true;
    } catch (error) {
      console.error(`Error dispatching hyperscript:ready event:`, error);
    }
  }

  /**
   * Set up mutation observer to process new elements
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      return; // Skip in environments without MutationObserver
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Process added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
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
      subtree: true
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
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      defaultAttributeProcessor.init();
    });
  } else {
    // DOM is already ready
    defaultAttributeProcessor.init();
  }
}