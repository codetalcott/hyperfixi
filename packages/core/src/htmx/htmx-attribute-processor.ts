/**
 * HtmxAttributeProcessor
 *
 * Scans DOM for elements with hx-* attributes and translates them
 * to hyperscript syntax for execution by the HyperFixi runtime.
 *
 * This implements Option B from the htmx compatibility plan:
 * core subset of htmx attributes covering ~80% of use cases.
 */

import { translateToHyperscript, type HtmxConfig } from './htmx-translator.js';

export interface HtmxProcessorOptions {
  /** Process existing elements on initialization */
  processExisting?: boolean;
  /** Watch for new elements via MutationObserver */
  watchMutations?: boolean;
  /** Log translations for debugging */
  debug?: boolean;
  /** Custom root element to scan (defaults to document.body) */
  root?: Element;
}

/** Attributes to scan for */
const HTMX_REQUEST_ATTRS = ['hx-get', 'hx-post', 'hx-put', 'hx-patch', 'hx-delete'];
const HTMX_ALL_ATTRS = [
  ...HTMX_REQUEST_ATTRS,
  'hx-target',
  'hx-swap',
  'hx-trigger',
  'hx-confirm',
  'hx-boost',
  'hx-vals',
  'hx-headers',
  'hx-push-url',
  'hx-replace-url',
];

/** Build CSS selector for elements with any hx-* attribute */
const HTMX_SELECTOR = HTMX_REQUEST_ATTRS.map((attr) => `[${attr}]`).join(', ') + ', [hx-on\\:]';

export class HtmxAttributeProcessor {
  private options: Required<HtmxProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedElements = new WeakSet<Element>();
  private executeCallback: ((code: string, element: Element) => Promise<void>) | null = null;

  constructor(options: HtmxProcessorOptions = {}) {
    this.options = {
      processExisting: options.processExisting ?? true,
      watchMutations: options.watchMutations ?? true,
      debug: options.debug ?? false,
      root: options.root ?? (typeof document !== 'undefined' ? document.body : (null as unknown as Element)),
    };
  }

  /**
   * Initialize the processor
   * @param executeCallback Function to execute generated hyperscript
   */
  init(executeCallback: (code: string, element: Element) => Promise<void>): void {
    this.executeCallback = executeCallback;

    if (this.options.processExisting && this.options.root) {
      this.processSubtree(this.options.root);
    }

    if (this.options.watchMutations && typeof MutationObserver !== 'undefined' && this.options.root) {
      this.startObserver();
    }
  }

  /**
   * Stop watching for mutations and cleanup
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.executeCallback = null;
  }

  /**
   * Scan for elements with hx-* attributes
   */
  scanForHtmxElements(root?: Element): Element[] {
    const searchRoot = root ?? this.options.root;
    if (!searchRoot) return [];

    const elements = Array.from(searchRoot.querySelectorAll(HTMX_SELECTOR));

    // Also check the root element itself
    if (searchRoot.matches?.(HTMX_SELECTOR)) {
      elements.unshift(searchRoot);
    }

    return elements;
  }

  /**
   * Collect all hx-* attributes from an element into a config object
   */
  collectAttributes(element: Element): HtmxConfig {
    const config: HtmxConfig = {};

    // Check request method attributes
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const url = element.getAttribute(`hx-${method}`);
      if (url) {
        config.method = method.toUpperCase() as HtmxConfig['method'];
        config.url = url;
        break;
      }
    }

    // Target element
    const target = element.getAttribute('hx-target');
    if (target) {
      config.target = target;
    }

    // Swap strategy
    const swap = element.getAttribute('hx-swap');
    if (swap) {
      config.swap = swap;
    }

    // Trigger event
    const trigger = element.getAttribute('hx-trigger');
    if (trigger) {
      config.trigger = trigger;
    }

    // Confirmation dialog
    const confirm = element.getAttribute('hx-confirm');
    if (confirm) {
      config.confirm = confirm;
    }

    // Boost mode
    const boost = element.getAttribute('hx-boost');
    if (boost === 'true') {
      config.boost = true;
    }

    // Additional values (JSON)
    const vals = element.getAttribute('hx-vals');
    if (vals) {
      config.vals = vals;
    }

    // Custom headers (JSON)
    const headers = element.getAttribute('hx-headers');
    if (headers) {
      config.headers = headers;
    }

    // URL management
    const pushUrl = element.getAttribute('hx-push-url');
    if (pushUrl) {
      config.pushUrl = pushUrl === 'true' ? true : pushUrl;
    }

    const replaceUrl = element.getAttribute('hx-replace-url');
    if (replaceUrl) {
      config.replaceUrl = replaceUrl === 'true' ? true : replaceUrl;
    }

    // Collect hx-on:* event handlers
    const onHandlers: Record<string, string> = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith('hx-on:')) {
        const event = attr.name.slice(6); // Remove 'hx-on:' prefix
        onHandlers[event] = attr.value;
      }
    }
    if (Object.keys(onHandlers).length > 0) {
      config.onHandlers = onHandlers;
    }

    return config;
  }

  /**
   * Process a single element
   */
  processElement(element: Element): void {
    if (this.processedElements.has(element)) {
      return;
    }

    const config = this.collectAttributes(element);

    // Skip if no meaningful htmx config
    if (!config.url && !config.onHandlers && !config.boost) {
      return;
    }

    const hyperscript = translateToHyperscript(config, element);

    if (this.options.debug) {
      console.log('[htmx-compat] Translated:', {
        element: element.tagName,
        config,
        hyperscript,
      });
    }

    this.processedElements.add(element);

    // Execute the generated hyperscript
    if (this.executeCallback && hyperscript) {
      // Store the generated code on the element for inspection
      element.setAttribute('data-hx-generated', hyperscript);

      this.executeCallback(hyperscript, element).catch((error) => {
        console.error('[htmx-compat] Execution error:', error);
      });
    }
  }

  /**
   * Process all elements in a subtree
   */
  processSubtree(root: Element): void {
    const elements = this.scanForHtmxElements(root);
    for (const element of elements) {
      this.processElement(element);
    }
  }

  /**
   * Start MutationObserver for dynamic elements
   */
  private startObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            this.processSubtree(node);
          }
        }

        // Handle attribute changes
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          const attrName = mutation.attributeName;
          if (attrName && HTMX_ALL_ATTRS.some((a) => attrName === a || attrName.startsWith('hx-on:'))) {
            // Re-process element if htmx attributes changed
            this.processedElements.delete(mutation.target);
            this.processElement(mutation.target);
          }
        }
      }
    });

    if (this.options.root) {
      this.observer.observe(this.options.root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: HTMX_ALL_ATTRS,
      });
    }
  }

  /**
   * Manually trigger processing of an element (useful for testing)
   */
  manualProcess(element: Element): string {
    const config = this.collectAttributes(element);
    return translateToHyperscript(config, element);
  }
}

export { translateToHyperscript, type HtmxConfig } from './htmx-translator.js';
