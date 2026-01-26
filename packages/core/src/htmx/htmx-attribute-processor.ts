/**
 * HtmxAttributeProcessor
 *
 * Scans DOM for elements with hx-* and fx-* attributes and translates them
 * to hyperscript syntax for execution by the LokaScript runtime.
 *
 * Supports both htmx-style (hx-*) and fixi-style (fx-*) attributes:
 * - htmx: hx-get, hx-post, hx-target, hx-swap, hx-trigger, etc.
 * - fixi: fx-action, fx-method, fx-target, fx-swap, fx-trigger, fx-ignore
 *
 * Fixi-specific features:
 * - Request dropping (anti-double-submit) - new requests are dropped if one is pending
 * - fx-ignore attribute - prevents processing on element and descendants
 * - Full fixi event lifecycle: fx:init, fx:config, fx:before, fx:after, fx:error, fx:finally, fx:swapped
 */

import { translateToHyperscript, type HtmxConfig } from './htmx-translator.js';

// ============================================================================
// Lifecycle Event Types
// ============================================================================

/**
 * Detail for htmx:configuring event
 * Fired after attributes are collected but before translation.
 * Cancel to prevent processing.
 */
export interface HtmxConfiguringEventDetail {
  config: HtmxConfig;
  element: Element;
}

/**
 * Detail for htmx:beforeRequest event
 * Fired before hyperscript execution starts.
 * Cancel to prevent execution.
 */
export interface HtmxBeforeRequestEventDetail {
  element: Element;
  url: string | undefined;
  method: string;
}

/**
 * Detail for htmx:afterSettle event
 * Fired after hyperscript execution completes successfully.
 */
export interface HtmxAfterSettleEventDetail {
  element: Element;
  target: string | undefined;
}

/**
 * Detail for htmx:error event
 * Fired when hyperscript execution fails.
 */
export interface HtmxErrorEventDetail {
  element: Element;
  error: Error;
}

// ============================================================================
// Fixi Event Types
// ============================================================================

/**
 * Detail for fx:init event
 * Fired when processing begins on an element with fx-action.
 * Cancel to prevent initialization.
 */
export interface FxInitEventDetail {
  element: Element;
  options: EventListenerOptions;
}

/**
 * Detail for fx:config event
 * Fired before request. Matches fixi's cfg object structure.
 * Cancel to prevent the request.
 */
export interface FxConfigEventDetail {
  cfg: {
    trigger: string;
    method: string;
    action: string | undefined;
    headers: Record<string, string>;
    target: string | undefined;
    swap: string;
    body: FormData | null;
    drop: number; // Number of outstanding requests
    transition: boolean | ((callback: () => void) => void);
    preventTrigger: boolean;
    signal: AbortSignal;
    confirm?: () => Promise<boolean>;
  };
  element: Element;
}

/**
 * Detail for fx:after event
 * Fired after response received, before swap.
 * Can modify cfg.text to transform swapped content.
 */
export interface FxAfterEventDetail {
  cfg: FxConfigEventDetail['cfg'] & {
    response: Response | null;
    text: string;
  };
  element: Element;
}

/**
 * Detail for fx:finally event
 * Always fires, regardless of success or error.
 */
export interface FxFinallyEventDetail {
  element: Element;
  success: boolean;
}

// ============================================================================
// Processor Options
// ============================================================================

export interface HtmxProcessorOptions {
  /** Process existing elements on initialization */
  processExisting?: boolean;
  /** Watch for new elements via MutationObserver */
  watchMutations?: boolean;
  /** Log translations for debugging */
  debug?: boolean;
  /** Custom root element to scan (defaults to document.body) */
  root?: Element;
  /** Enable fixi-style request dropping (drop new requests if one is pending) */
  requestDropping?: boolean;
  /** Dispatch fixi-compatible events (fx:*) in addition to htmx events */
  fixiEvents?: boolean;
}

/** htmx attributes to scan for */
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

/** fixi attributes to scan for */
const FIXI_ATTRS = ['fx-action', 'fx-method', 'fx-trigger', 'fx-target', 'fx-swap', 'fx-ignore'];
const FIXI_REQUEST_ATTR = 'fx-action';

/** Combined attributes for MutationObserver */
const ALL_ATTRS = [...HTMX_ALL_ATTRS, ...FIXI_ATTRS];

/** Build CSS selector for elements with any hx-* or fx-* attribute */
const HTMX_SELECTOR = HTMX_REQUEST_ATTRS.map(attr => `[${attr}]`).join(', ') + ', [hx-on\\:]';
const FIXI_SELECTOR = `[${FIXI_REQUEST_ATTR}]`;
const COMBINED_SELECTOR = `${HTMX_SELECTOR}, ${FIXI_SELECTOR}`;

export class HtmxAttributeProcessor {
  private options: Required<HtmxProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedElements = new WeakSet<Element>();
  private executeCallback: ((code: string, element: Element) => Promise<void>) | null = null;

  /** Track pending requests per element for request dropping (fixi behavior) */
  private pendingRequests = new WeakMap<Element, AbortController>();

  constructor(options: HtmxProcessorOptions = {}) {
    this.options = {
      processExisting: options.processExisting ?? true,
      watchMutations: options.watchMutations ?? true,
      debug: options.debug ?? false,
      root:
        options.root ??
        (typeof document !== 'undefined' ? document.body : (null as unknown as Element)),
      requestDropping: options.requestDropping ?? true, // Enable by default for fixi compatibility
      fixiEvents: options.fixiEvents ?? true, // Enable by default
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

    if (
      this.options.watchMutations &&
      typeof MutationObserver !== 'undefined' &&
      this.options.root
    ) {
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
   * Scan for elements with hx-* or fx-* attributes
   * Excludes elements with fx-ignore or inside fx-ignore containers
   */
  scanForHtmxElements(root?: Element): Element[] {
    const searchRoot = root ?? this.options.root;
    if (!searchRoot) return [];

    // Skip if root is inside fx-ignore
    if (searchRoot.closest?.('[fx-ignore]')) {
      return [];
    }

    const elements = Array.from(searchRoot.querySelectorAll(COMBINED_SELECTOR));

    // Also check the root element itself
    if (searchRoot.matches?.(COMBINED_SELECTOR)) {
      elements.unshift(searchRoot);
    }

    // Filter out elements inside fx-ignore containers
    return elements.filter(el => !el.closest('[fx-ignore]'));
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
   * Collect all fx-* attributes from an element into a config object
   * Maps fixi's simpler API to HtmxConfig structure
   */
  collectFxAttributes(element: Element): HtmxConfig {
    const config: HtmxConfig = {};

    // fx-action is the URL (required for fixi)
    const action = element.getAttribute('fx-action');
    if (action) {
      config.url = action;
    }

    // fx-method specifies HTTP verb (default: GET)
    const method = element.getAttribute('fx-method');
    config.method = (method?.toUpperCase() || 'GET') as HtmxConfig['method'];

    // fx-target is CSS selector for swap location
    const target = element.getAttribute('fx-target');
    if (target) {
      config.target = target;
    }

    // fx-swap is insertion mechanism (default: outerHTML for fixi)
    const swap = element.getAttribute('fx-swap');
    config.swap = swap || 'outerHTML';

    // fx-trigger is the event type
    const trigger = element.getAttribute('fx-trigger');
    if (trigger) {
      config.trigger = trigger;
    }

    return config;
  }

  /**
   * Check if an element uses fixi-style attributes
   */
  private isFxElement(element: Element): boolean {
    return element.hasAttribute('fx-action');
  }

  /**
   * Process a single element (supports both hx-* and fx-* attributes)
   */
  processElement(element: Element): void {
    if (this.processedElements.has(element)) {
      return;
    }

    // Detect if this is a fixi-style or htmx-style element
    const isFx = this.isFxElement(element);
    const config = isFx ? this.collectFxAttributes(element) : this.collectAttributes(element);
    const prefix = isFx ? 'fx' : 'htmx';

    // Skip if no meaningful config
    if (!config.url && !config.onHandlers && !config.boost) {
      return;
    }

    // Dispatch fx:init event for fixi elements (cancelable)
    if (isFx && this.options.fixiEvents) {
      const initEvent = new CustomEvent<FxInitEventDetail>('fx:init', {
        detail: { element, options: {} },
        bubbles: true,
        cancelable: true,
      });
      if (!element.dispatchEvent(initEvent)) {
        if (this.options.debug) {
          console.log('[fx-compat] Processing cancelled by fx:init handler');
        }
        return;
      }
    }

    // Dispatch htmx:configuring / fx:config event (cancelable)
    const configuringEvent = new CustomEvent<HtmxConfiguringEventDetail>('htmx:configuring', {
      detail: { config, element },
      bubbles: true,
      cancelable: true,
    });
    if (!element.dispatchEvent(configuringEvent)) {
      if (this.options.debug) {
        console.log(`[${prefix}-compat] Processing cancelled by htmx:configuring handler`);
      }
      return;
    }

    // Also dispatch fx:config for fixi elements
    if (isFx && this.options.fixiEvents) {
      const fxConfigEvent = new CustomEvent<FxConfigEventDetail>('fx:config', {
        detail: {
          cfg: {
            trigger: config.trigger || 'click',
            method: config.method || 'GET',
            action: config.url,
            headers: {},
            target: config.target,
            swap: config.swap || 'outerHTML',
            body: null,
            drop: this.pendingRequests.has(element) ? 1 : 0,
            transition: true,
            preventTrigger: true,
            signal: new AbortController().signal,
          },
          element,
        },
        bubbles: true,
        cancelable: true,
      });
      if (!element.dispatchEvent(fxConfigEvent)) {
        if (this.options.debug) {
          console.log('[fx-compat] Processing cancelled by fx:config handler');
        }
        return;
      }
    }

    const hyperscript = translateToHyperscript(config, element);

    if (this.options.debug) {
      console.log(`[${prefix}-compat] Translated:`, {
        element: element.tagName,
        config,
        hyperscript,
      });
    }

    this.processedElements.add(element);

    // Execute the generated hyperscript
    if (this.executeCallback && hyperscript) {
      // Request dropping for fixi elements (anti-double-submit)
      if (isFx && this.options.requestDropping && this.pendingRequests.has(element)) {
        if (this.options.debug) {
          console.log('[fx-compat] Request dropped - pending request exists');
        }
        return;
      }

      // Track pending request for fixi elements
      const controller = new AbortController();
      if (isFx && this.options.requestDropping) {
        this.pendingRequests.set(element, controller);
      }

      // Store the generated code on the element for inspection
      const dataAttr = isFx ? 'data-fx-generated' : 'data-hx-generated';
      element.setAttribute(dataAttr, hyperscript);

      // Dispatch htmx:beforeRequest / fx:before event (cancelable)
      const beforeRequestEvent = new CustomEvent<HtmxBeforeRequestEventDetail>(
        'htmx:beforeRequest',
        {
          detail: {
            element,
            url: config.url,
            method: config.method || 'GET',
          },
          bubbles: true,
          cancelable: true,
        }
      );
      if (!element.dispatchEvent(beforeRequestEvent)) {
        if (this.options.debug) {
          console.log(`[${prefix}-compat] Execution cancelled by htmx:beforeRequest handler`);
        }
        this.pendingRequests.delete(element);
        return;
      }

      // Also dispatch fx:before for fixi elements
      if (isFx && this.options.fixiEvents) {
        const fxBeforeEvent = new CustomEvent('fx:before', {
          detail: { element, url: config.url, method: config.method || 'GET' },
          bubbles: true,
          cancelable: true,
        });
        if (!element.dispatchEvent(fxBeforeEvent)) {
          if (this.options.debug) {
            console.log('[fx-compat] Execution cancelled by fx:before handler');
          }
          this.pendingRequests.delete(element);
          return;
        }
      }

      // Track success for fx:finally
      let wasSuccessful = true;

      this.executeCallback(hyperscript, element)
        .then(() => {
          // Dispatch fx:after for fixi elements (cancelable, before swap)
          if (isFx && this.options.fixiEvents) {
            const fxAfterEvent = new CustomEvent<FxAfterEventDetail>('fx:after', {
              detail: {
                cfg: {
                  trigger: config.trigger || 'click',
                  method: config.method || 'GET',
                  action: config.url,
                  headers: {},
                  target: config.target,
                  swap: config.swap || 'outerHTML',
                  body: null,
                  drop: 0,
                  transition: true,
                  preventTrigger: true,
                  signal: controller.signal,
                  response: null,
                  text: '',
                },
                element,
              },
              bubbles: true,
              cancelable: true,
            });
            if (!element.dispatchEvent(fxAfterEvent)) {
              if (this.options.debug) {
                console.log('[fx-compat] Swap cancelled by fx:after handler');
              }
              return; // Skip swap if cancelled
            }
          }

          // Dispatch htmx:afterSettle / fx:swapped event
          element.dispatchEvent(
            new CustomEvent<HtmxAfterSettleEventDetail>('htmx:afterSettle', {
              detail: { element, target: config.target },
              bubbles: true,
            })
          );

          // Also dispatch fx:swapped for fixi elements
          if (isFx && this.options.fixiEvents) {
            element.dispatchEvent(
              new CustomEvent('fx:swapped', {
                detail: { element, target: config.target },
                bubbles: true,
              })
            );
          }
        })
        .catch(error => {
          wasSuccessful = false;
          console.error(`[${prefix}-compat] Execution error:`, error);

          // Dispatch htmx:error / fx:error event
          const errorObj = error instanceof Error ? error : new Error(String(error));
          element.dispatchEvent(
            new CustomEvent<HtmxErrorEventDetail>('htmx:error', {
              detail: { element, error: errorObj },
              bubbles: true,
            })
          );

          // Also dispatch fx:error for fixi elements
          if (isFx && this.options.fixiEvents) {
            element.dispatchEvent(
              new CustomEvent('fx:error', {
                detail: { element, error: errorObj },
                bubbles: true,
              })
            );
          }
        })
        .finally(() => {
          // Clean up pending request tracking
          this.pendingRequests.delete(element);

          // Dispatch fx:finally for fixi elements (always fires)
          if (isFx && this.options.fixiEvents) {
            element.dispatchEvent(
              new CustomEvent<FxFinallyEventDetail>('fx:finally', {
                detail: { element, success: wasSuccessful },
                bubbles: true,
              })
            );
          }

          // Dispatch fx:inited after processing complete (no bubble)
          if (isFx && this.options.fixiEvents) {
            element.dispatchEvent(
              new CustomEvent('fx:inited', {
                detail: { element },
                bubbles: false, // fx:inited does not bubble
              })
            );
          }
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
    this.observer = new MutationObserver(mutations => {
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
          if (attrName && (ALL_ATTRS.includes(attrName) || attrName.startsWith('hx-on:'))) {
            // Re-process element if htmx or fixi attributes changed
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
        attributeFilter: ALL_ATTRS,
      });
    }
  }

  /**
   * Manually trigger processing of an element (useful for testing)
   * Supports both htmx and fixi elements
   */
  manualProcess(element: Element): string {
    const isFx = this.isFxElement(element);
    const config = isFx ? this.collectFxAttributes(element) : this.collectAttributes(element);
    return translateToHyperscript(config, element);
  }

  /**
   * Check if there's a pending request for an element
   */
  hasPendingRequest(element: Element): boolean {
    return this.pendingRequests.has(element);
  }

  /**
   * Abort a pending request for an element
   */
  abortPendingRequest(element: Element): boolean {
    const controller = this.pendingRequests.get(element);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(element);
      return true;
    }
    return false;
  }
}

// Export constants for external use
export { FIXI_ATTRS, HTMX_ALL_ATTRS as HTMX_ATTRS };

export { translateToHyperscript, type HtmxConfig } from './htmx-translator.js';
