/**
 * HTML Attribute Processor for Hyperscript
 * Automatically detects and processes _="" attributes on elements
 */

import { hyperscript } from '../api/hyperscript-api';
import { createContext } from '../core/context';
import type { ExecutionContext } from '../types/core';

export interface AttributeProcessorOptions {
  attributeName?: string;
  autoScan?: boolean;
  processOnlyNewElements?: boolean;
}

export class AttributeProcessor {
  private processedElements = new WeakSet<HTMLElement>();
  private options: Required<AttributeProcessorOptions>;
  private observer: MutationObserver | null = null;

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
    }

    // Set up mutation observer for new elements
    this.setupMutationObserver();
  }

  /**
   * Scan and process all elements with hyperscript attributes in the document
   */
  scanAndProcessAll(): void {
    const elements = document.querySelectorAll(`[${this.options.attributeName}]`);
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        this.processElement(element);
      }
    });
  }

  /**
   * Process a single element's hyperscript attribute
   */
  processElement(element: HTMLElement): void {
    console.log(`🔧 ATTR: Attempting to process element:`, element);
    
    // Skip if already processed and we only process new elements
    if (this.options.processOnlyNewElements && this.processedElements.has(element)) {
      console.log(`🔧 ATTR: Skipping already processed element`);
      return;
    }

    const hyperscriptCode = element.getAttribute(this.options.attributeName);
    console.log(`🔧 ATTR: Found hyperscript code:`, hyperscriptCode);
    
    if (!hyperscriptCode) {
      console.log(`🔧 ATTR: No hyperscript code found on element`);
      return;
    }

    try {
      console.log(`🔧 ATTR: Processing element with code: "${hyperscriptCode}"`);
      
      // Create execution context with the element as 'me'
      const context = createContext(element);
      console.log(`🔧 ATTR: Created context for element`);
      
      // Parse and prepare the hyperscript code
      console.log(`🔧 ATTR: About to compile hyperscript code`);
      const compilationResult = hyperscript.compile(hyperscriptCode);
      console.log(`🔧 ATTR: Compilation result:`, compilationResult);
      
      if (!compilationResult.success) {
        console.error(`🔧 ATTR: Hyperscript compilation failed for element:`, element);
        console.error(`🔧 ATTR: Code that failed:`, hyperscriptCode);
        console.error(`🔧 ATTR: Compilation errors:`, JSON.stringify(compilationResult.errors, null, 2));
        compilationResult.errors.forEach((error, i) => {
          console.error(`🔧 ATTR: Error ${i + 1}:`, error.message, `at line ${error.line}, column ${error.column}`);
        });
        return;
      }

      console.log(`🔧 ATTR: Compilation succeeded, processing handler type`);
      
      // For event handlers (on syntax), we need to parse and bind them
      if (hyperscriptCode.trim().startsWith('on ')) {
        console.log(`🔧 ATTR: Processing as event handler`);
        this.processEventHandler(element, hyperscriptCode, context);
      } else {
        console.log(`🔧 ATTR: Processing as immediate execution`);
        // For other syntax, execute immediately (like init)
        hyperscript.execute(compilationResult.ast!, context);
      }

      // Mark as processed
      this.processedElements.add(element);
    } catch (error) {
      console.error(`Error processing hyperscript attribute on element:`, element, error);
    }
  }

  /**
   * Process event handler syntax like "on click put ..."
   */
  private processEventHandler(element: HTMLElement, code: string, context: ExecutionContext): void {
    // Parse the event handler syntax
    const match = code.match(/^on\s+(\w+)(?:\s+(.+))?$/);
    if (!match) {
      console.error(`Invalid event handler syntax: ${code}`);
      return;
    }

    const [, eventType, commandCode] = match;
    
    if (!commandCode) {
      console.error(`No command specified in event handler: ${code}`);
      return;
    }

    // Add event listener with simplified command execution
    element.addEventListener(eventType, async (event) => {
      try {
        console.log(`🔧 EVENT: Executing command: "${commandCode}"`);
        
        // Update context with event information
        const eventContext = {
          ...context,
          event,
          it: event.target
        };
        
        // Use the full hyperscript API for command execution
        if ((window as any).hyperfixi?.run) {
          console.log(`🔧 EVENT: About to call hyperfixi.run with context`);
          const result = await (window as any).hyperfixi.run(commandCode, eventContext);
          console.log(`🔧 EVENT: Command execution completed:`, result);
        } else {
          throw new Error('HyperFixi run method not available for command execution');
        }
      } catch (error) {
        console.error(`🔧 EVENT: Error executing hyperscript event handler:`, error);
        console.error(`🔧 EVENT: Command was: "${commandCode}"`);
        console.error(`🔧 EVENT: Element:`, element);
      }
    });
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