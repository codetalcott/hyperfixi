/**
 * HTML Attribute Processor for Hyperscript
 * Automatically detects and processes _="" attributes on elements
 */

import { hyperscript } from '../api/hyperscript-api';
import { createContext } from '../core/context';
import { unwrapCommandResult } from '../runtime/runtime-base';
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
  /** Enable lazy parsing for event-driven attributes. Defers compilation until first event dispatch. (default: false) */
  lazyParsing?: boolean;
  /** Process elements in batches, yielding to the browser between batches. (default: false) */
  chunkedProcessing?: boolean;
  /** Number of elements to process per batch when chunkedProcessing is enabled. (default: 16) */
  chunkSize?: number;
}

// =============================================================================
// Lazy Parsing Constants
// =============================================================================

/** Regex to extract event type from hyperscript code: "on click ...", "on mouseover ..." */
const EVENT_REGEX = /^on\s+(\w+)/;

/** Events that must be processed immediately (cannot be deferred).
 * Note: `init` is a standalone block keyword, not an event name, so it's not listed here.
 * Non-event code (no "on" prefix) is always processed eagerly via a separate check. */
const IMMEDIATE_EVENTS = new Set([
  'load', // Fires at registration time
  'mutation', // MutationObserver setup needed immediately
  'intersection', // IntersectionObserver setup needed immediately
  'appear', // Visibility observer
  'every', // Interval setup
]);

// =============================================================================
// Chunked Processing Utilities
// =============================================================================

/**
 * Yield to the browser event loop so rendering and input can be processed.
 * Uses scheduler.yield() when available (modern browsers), else setTimeout(0).
 */
function yieldToBrowser(): Promise<void> {
  if (
    typeof globalThis !== 'undefined' &&
    'scheduler' in globalThis &&
    typeof (globalThis as any).scheduler?.yield === 'function'
  ) {
    return (globalThis as any).scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

export class AttributeProcessor {
  private processedElements = new WeakSet<HTMLElement>();
  private options: Required<AttributeProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedCount = 0;
  private readyEventDispatched = false;
  private initialized = false;
  /** Elements with lazy stubs registered (not yet fully parsed) */
  private lazyElements = new WeakSet<HTMLElement>();

  constructor(options: AttributeProcessorOptions = {}) {
    this.options = {
      attributeName: '_',
      autoScan: true,
      processOnlyNewElements: true,
      lazyParsing: false,
      chunkedProcessing: false,
      chunkSize: 16,
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

    if (this.options.lazyParsing) {
      // Lazy path: register lightweight stubs for event-driven attributes.
      // Elements that need eager processing (on init, on load, non-event, multi-handler)
      // return promises that we collect and await.
      debug.parse('ATTR: Using lazy parsing mode');
      const eagerPromises: Promise<void>[] = [];
      elements.forEach(element => {
        if (element instanceof HTMLElement) {
          const promise = this.processElementLazy(element);
          if (promise) {
            eagerPromises.push(promise);
          }
        }
      });
      if (eagerPromises.length > 0) {
        await Promise.all(eagerPromises);
      }
    } else if (this.options.chunkedProcessing) {
      // Chunked path: process in batches, yielding to browser between chunks
      debug.parse(`ATTR: Using chunked processing (chunkSize=${this.options.chunkSize})`);
      await this.processElementsChunked(elements);
    } else {
      // Default eager path: process all elements in parallel
      const processPromises: Promise<void>[] = [];
      elements.forEach(element => {
        if (element instanceof HTMLElement) {
          processPromises.push(this.processElementAsync(element));
        }
      });
      await Promise.all(processPromises);
    }
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
        console.warn(
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
        console.warn('[LokaScript] Script compilation failed:', compilationResult.errors);
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
      console.error('[LokaScript] Script execution error:', error);
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

    // Mark as processed BEFORE the async compile+execute to prevent
    // double-registration from MutationObserver race conditions.
    // When an element with _="..." is appended to the DOM, both the
    // MutationObserver and an explicit processNode() call may invoke
    // processElementAsync concurrently. Without early marking, both
    // calls pass the processedElements check and register duplicate
    // event handlers (e.g., toggle fires twice, canceling itself).
    this.processedElements.add(element);
    this.processedCount++;

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
        console.warn(
          '[LokaScript] Compilation failed for _= attribute:',
          compilationResult.errors,
          element
        );
        return;
      }

      debug.parse('ATTR: Compilation succeeded, processing handler type');

      // Execute the compiled AST and WAIT for it to complete
      // This ensures behavior installation is complete before continuing
      debug.parse('ATTR: Executing compiled AST');
      await hyperscript.execute(compilationResult.ast!, context);

      // Dispatch load event on the element after successful processing
      this.dispatchLoadEvent(element);
    } catch (error) {
      console.error('[LokaScript] Error processing _= attribute:', error, element);
    }
  }

  /**
   * Process elements in batches, yielding to the browser between chunks.
   * This prevents long main-thread blocking when many elements need processing.
   */
  private async processElementsChunked(elements: NodeListOf<Element>): Promise<void> {
    const chunkSize = this.options.chunkSize;
    const htmlElements: HTMLElement[] = [];
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        htmlElements.push(el);
      }
    });

    for (let i = 0; i < htmlElements.length; i += chunkSize) {
      const chunk = htmlElements.slice(i, i + chunkSize);

      // Process chunk in parallel (same as default eager path, but bounded)
      const promises = chunk.map(el => this.processElementAsync(el));
      await Promise.all(promises);

      // Yield to browser between chunks (skip for last chunk)
      if (i + chunkSize < htmlElements.length) {
        await yieldToBrowser();
      }
    }
  }

  /**
   * Register a lightweight stub listener for an event-driven attribute.
   * On first event, synchronously compiles and installs the real handler, then
   * executes the handler body with the original trusted event (preserving isTrusted
   * and user activation for security-sensitive APIs like clipboard).
   * Non-event attributes and immediate events fall back to eager processing.
   * @returns A promise if the element needs eager processing, or null if lazy-registered.
   */
  private processElementLazy(element: HTMLElement): Promise<void> | null {
    const code = element.getAttribute(this.options.attributeName);
    if (!code) return null;

    const match = code.match(EVENT_REGEX);

    // Not an event handler, or is an immediate event, or has multiple handlers -> eager
    if (!match || IMMEDIATE_EVENTS.has(match[1]) || this.hasMultipleHandlers(code)) {
      return this.processElementAsync(element);
    }

    const eventType = match[1];
    debug.parse(`ATTR: Lazy-registering stub for "${eventType}" on element`);

    // One-shot stub: on first event, compile synchronously and execute directly.
    // This avoids re-dispatching synthetic events (which lose isTrusted).
    const stubListener = async (event: Event) => {
      this.lazyElements.delete(element);

      try {
        // Synchronous compile within the trusted event callback.
        // compileSync() is fully synchronous for English code, preserving
        // user activation for security-sensitive APIs (clipboard, fullscreen, etc.)
        const result = hyperscript.compileSync(code);
        if (!result.ok || !result.ast) {
          console.warn('[LokaScript] Lazy compilation failed:', result.errors, element);
          return;
        }

        // Install the real handler for future events.
        // execute() for eventHandler ASTs calls addEventListener() synchronously
        // (before its first internal await), so the handler is active immediately.
        const context = createContext(element);
        void hyperscript.execute(result.ast, context);

        // Execute the handler body for the current (trusted) event.
        // The real handler installed above won't fire for this event (per DOM spec:
        // listeners added during dispatch are not invoked for the current event).
        const ast = result.ast as any;
        if (ast.type === 'eventHandler' && ast.commands?.length > 0) {
          if (ast.modifiers?.prevent) event.preventDefault();
          if (ast.modifiers?.stop) event.stopPropagation();

          const eventContext = createContext(element);
          eventContext.locals.set('event', event);
          eventContext.locals.set('target', event.target);
          (eventContext as any).event = event;

          for (const command of ast.commands) {
            const cmdResult = await hyperscript.execute(command, eventContext);
            const val = unwrapCommandResult(cmdResult);
            if (val !== undefined) {
              Object.assign(eventContext, { it: val, result: val });
            }
          }
        }

        this.dispatchLoadEvent(element);
      } catch (err) {
        console.error('[LokaScript] Error in lazy handler on first event:', err, element);
      }
    };

    element.addEventListener(eventType, stubListener, { once: true });
    this.lazyElements.add(element);
    this.processedElements.add(element); // Prevent re-processing via mutation observer
    this.processedCount++;
    return null;
  }

  /**
   * Check if hyperscript code contains multiple event handlers.
   * e.g., "on click add .a on mouseover add .b" should be processed eagerly.
   * Distinguishes handler-start "on click" from preposition "on me" / "on navigator.clipboard".
   */
  private hasMultipleHandlers(code: string): boolean {
    // Pronouns and targets that follow the preposition "on", not event names
    const TARGET_WORDS = new Set(['me', 'it', 'its', 'my', 'you', 'yourself']);
    let count = 0;
    const regex = /\bon\s+(\w+)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      const word = m[1];
      // Skip property-access targets: "on navigator.clipboard", "on document.body"
      if (code[m.index + m[0].length] === '.') continue;
      // Skip hyperscript pronouns: "on me", "on it"
      if (TARGET_WORDS.has(word)) continue;
      count++;
      if (count > 1) return true;
    }
    return false;
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
                console.error('[LokaScript] Error processing dynamically added script tag:', err);
              });
            }

            // Process descendant script tags
            const scriptTags = element.querySelectorAll?.('script[type="text/hyperscript"]');
            scriptTags?.forEach(script => {
              if (script instanceof HTMLScriptElement) {
                this.processHyperscriptTag(script).catch(err => {
                  console.error('[LokaScript] Error processing dynamically added script tag:', err);
                });
              }
            });

            // Process the element itself if it has hyperscript attribute
            if (element.getAttribute && element.getAttribute(this.options.attributeName)) {
              this.processElementAsync(element).catch(err => {
                console.error('[LokaScript] Error processing dynamically added element:', err);
              });
            }

            // Process any descendant elements with hyperscript attributes
            const descendants = element.querySelectorAll?.(`[${this.options.attributeName}]`);
            descendants?.forEach(descendant => {
              if (descendant instanceof HTMLElement) {
                this.processElementAsync(descendant).catch(err => {
                  console.error('[LokaScript] Error processing dynamically added element:', err);
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
    this.lazyElements = new WeakSet<HTMLElement>();
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
