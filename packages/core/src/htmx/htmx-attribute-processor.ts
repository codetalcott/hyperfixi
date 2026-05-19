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

import { translateToHyperscript, resolveHxTarget, type HtmxConfig } from './htmx-translator.js';
import { getParserExtensionRegistry } from '../parser/extensions.js';
import { SSEConnection, type SSEEventSourceCtor } from './sse.js';
import {
  WSConnection,
  collectWSSendPayload,
  type WSEventSourceCtor,
  type WSSwapEnvelope,
} from './ws.js';

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
  /**
   * Override the `EventSource` constructor used for `sse-connect`. Mainly
   * for tests in happy-dom / jsdom which lack a real EventSource — inject
   * a small mock here. In production this is left undefined and the
   * global `EventSource` is used.
   */
  eventSourceCtor?: SSEEventSourceCtor;
  /**
   * Override the `WebSocket` constructor used for `ws-connect`. Same
   * intent as `eventSourceCtor` — happy-dom/jsdom may not provide a
   * usable WebSocket. Leave undefined in production to use the global.
   */
  wsEventSourceCtor?: WSEventSourceCtor;
}

/** htmx attributes to scan for */
const HTMX_REQUEST_ATTRS = ['hx-get', 'hx-post', 'hx-put', 'hx-patch', 'hx-delete'];
/**
 * Attributes that make an element discoverable even without a request URL.
 * `hx-live` translates to a reactive `live ... end` block. `sse-connect`
 * opens a long-lived EventSource handled outside the htmx translation
 * path entirely (see {@link HtmxAttributeProcessor.attachSSE}).
 */
const HTMX_STANDALONE_ATTRS = ['hx-live', 'sse-connect', 'ws-connect'];
/**
 * SSE attributes consumed by the SSE attachment path. `sse-swap` is not
 * standalone — it names events on a connection opened by `sse-connect`,
 * which can be on the same element or an ancestor.
 */
const SSE_ATTRS = ['sse-connect', 'sse-swap'];
/**
 * WS attributes. `ws-send` is not standalone — it tags an element inside
 * a `ws-connect` subtree as an outbound message source (form/button).
 */
const WS_ATTRS = ['ws-connect', 'ws-send'];
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
  ...HTMX_STANDALONE_ATTRS,
  'sse-swap',
  'ws-send',
];

/** fixi attributes to scan for */
const FIXI_ATTRS = ['fx-action', 'fx-method', 'fx-trigger', 'fx-target', 'fx-swap', 'fx-ignore'];
const FIXI_REQUEST_ATTR = 'fx-action';

/** Combined attributes for MutationObserver */
const ALL_ATTRS = [...HTMX_ALL_ATTRS, ...FIXI_ATTRS];

/** Build CSS selector for elements with any hx-* or fx-* attribute */
const HTMX_DISCOVERY_ATTRS = [...HTMX_REQUEST_ATTRS, ...HTMX_STANDALONE_ATTRS];
const HTMX_SELECTOR = HTMX_DISCOVERY_ATTRS.map(attr => `[${attr}]`).join(', ') + ', [hx-on\\:]';
const FIXI_SELECTOR = `[${FIXI_REQUEST_ATTR}]`;
const COMBINED_SELECTOR = `${HTMX_SELECTOR}, ${FIXI_SELECTOR}`;

// ============================================================================
// Lifecycle Event Name Constants
// ============================================================================

/** htmx lifecycle event names */
const HTMX_EVENTS = {
  CONFIGURING: 'htmx:configuring',
  BEFORE_REQUEST: 'htmx:beforeRequest',
  AFTER_SETTLE: 'htmx:afterSettle',
  ERROR: 'htmx:error',
} as const;

/** fixi lifecycle event names */
const FX_EVENTS = {
  INIT: 'fx:init',
  CONFIG: 'fx:config',
  BEFORE: 'fx:before',
  AFTER: 'fx:after',
  SWAPPED: 'fx:swapped',
  ERROR: 'fx:error',
  FINALLY: 'fx:finally',
  INITED: 'fx:inited',
} as const;

/**
 * Build a swap-snippet template for an SSE/WS connection. The template is a
 * closure that takes a JSON-stringified data literal and returns the
 * hyperscript snippet to execute. Splitting build (config-time, once per
 * element) from invocation (event-time, possibly many times per second)
 * lets the processor cache the template per element and skip the
 * resolveHxTarget call + ternary chain on each event.
 */
function buildSSESwapTemplate(config: HtmxConfig): (dataLit: string) => string {
  const target = config.target ?? 'me';
  const swap = config.swap ?? 'innerHTML';
  // Resolve `hx-target` using the same resolver as the request-cycle path
  // (htmx-translator.ts). Handles `this`/`me`, `closest <sel>`, `find <sel>`,
  // `next <sel>`, `previous <sel>`, and plain CSS selectors uniformly.
  const t = resolveHxTarget(target);
  switch (swap) {
    case 'outerHTML':
      return d => `set ${t}'s outerHTML to ${d}`;
    case 'beforebegin':
      return d => `put ${d} before ${t}`;
    case 'afterend':
      return d => `put ${d} after ${t}`;
    case 'afterbegin':
      return d => `put ${d} at start of ${t}`;
    case 'beforeend':
      return d => `put ${d} at end of ${t}`;
    case 'none':
      return () => '';
    case 'delete':
      return () => `remove ${t}`;
    default:
      return d => `put ${d} into ${t}`;
  }
}

export class HtmxAttributeProcessor {
  private options: Required<HtmxProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedElements = new WeakSet<Element>();
  private executeCallback: ((code: string, element: Element) => Promise<void>) | null = null;

  /** Track pending requests per element for request dropping (fixi behavior) */
  private pendingRequests = new WeakMap<Element, AbortController>();

  /**
   * Track open SSE connections per element. WeakMap won't let us iterate
   * for `destroy()` — we mirror onto a Set for cleanup. `WeakMap` first so
   * lookups stay O(1) during processing.
   */
  private sseConnections = new WeakMap<Element, SSEConnection>();
  private sseConnectionsSet = new Set<SSEConnection>();

  /** Same pattern for WS connections. */
  private wsConnections = new WeakMap<Element, WSConnection>();
  private wsConnectionsSet = new Set<WSConnection>();
  /** Listeners installed on ws-send sources, for cleanup on detach. */
  private wsSendListeners = new WeakMap<Element, () => void>();

  /**
   * Per-element swap template cache. Each SSE/WS event re-reads
   * `hx-target` / `hx-swap` so dynamic attribute changes are honored; the
   * template (closure over the resolved target + swap strategy) is then
   * looked up by `${target}|${swap}` signature. Cache hits skip
   * resolveHxTarget + the swap-strategy ternary on high-frequency feeds;
   * misses re-build only when the attributes actually change.
   */
  private swapTemplateCache = new WeakMap<
    Element,
    { sig: string; build: (dataLit: string) => string }
  >();

  /** Build (or look up) the swap-snippet template for this element. */
  private getSwapTemplate(element: Element, config: HtmxConfig): (dataLit: string) => string {
    const sig = `${config.target ?? 'me'}|${config.swap ?? 'innerHTML'}`;
    const cached = this.swapTemplateCache.get(element);
    if (cached && cached.sig === sig) return cached.build;
    const build = buildSSESwapTemplate(config);
    this.swapTemplateCache.set(element, { sig, build });
    return build;
  }

  /** Optional EventSource constructor override (tests inject a mock). */
  private eventSourceCtor: SSEEventSourceCtor | undefined;
  /** Optional WebSocket constructor override (tests inject a mock). */
  private wsEventSourceCtor: WSEventSourceCtor | undefined;

  /**
   * Helper to dispatch lifecycle events with consistent options
   * Returns true if event was not cancelled, false if cancelled
   */
  private dispatchLifecycleEvent<T extends object>(
    element: Element,
    name: string,
    detail: T,
    options: { cancelable?: boolean; bubbles?: boolean; debugPrefix?: string } = {}
  ): boolean {
    const event = new CustomEvent(name, {
      detail,
      bubbles: options.bubbles ?? true,
      cancelable: options.cancelable ?? true,
    });
    const dispatched = element.dispatchEvent(event);
    if (!dispatched && this.options.debug) {
      const prefix = options.debugPrefix ?? 'htmx';
      console.log(`[${prefix}-compat] ${name} cancelled`);
    }
    return dispatched;
  }

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
      // Fold `eventSourceCtor` into options via a no-op `undefined` so the
      // Required<> mapping above stays consistent without changing every
      // existing call site.
      eventSourceCtor: options.eventSourceCtor as SSEEventSourceCtor,
      wsEventSourceCtor: options.wsEventSourceCtor as WSEventSourceCtor,
    };
    this.eventSourceCtor = options.eventSourceCtor;
    this.wsEventSourceCtor = options.wsEventSourceCtor;
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
    for (const conn of this.sseConnectionsSet) {
      conn.detach();
    }
    this.sseConnectionsSet.clear();
    for (const conn of this.wsConnectionsSet) {
      conn.detach();
    }
    this.wsConnectionsSet.clear();
    this.executeCallback = null;
  }

  /**
   * Open an SSE connection for an element bearing `sse-connect`. Idempotent:
   * if a connection already exists for this element, the existing one is
   * returned. Named-event subscriptions are added per `sse-swap` value.
   *
   * Routing model: incoming events whose `type` matches an `sse-swap` name
   * on the element (comma-separated values supported) are wrapped in a
   * tiny hyperscript snippet — `set :it to <data> then <swap command>` —
   * and run via the same `executeCallback` that processes `_=`. This reuses
   * the existing swap machinery (`hx-target`, `hx-swap`) for free.
   *
   * Returns null in environments without `EventSource` and no test
   * override (typically non-browser).
   */
  attachSSE(element: Element): SSEConnection | null {
    const existing = this.sseConnections.get(element);
    if (existing) return existing;

    const url = element.getAttribute('sse-connect');
    if (!url) return null;

    const swapHandler = (eventName: string, data: string): void => {
      // Build a tiny hyperscript snippet that surfaces the event payload
      // through the normal swap flow. We re-derive target/swap on each
      // event so dynamic attribute changes are honored; the swap-template
      // closure is cached per element keyed by the attribute pair.
      const config: HtmxConfig = {
        url: undefined,
        method: 'GET',
        target: element.getAttribute('hx-target') ?? undefined,
        swap: element.getAttribute('hx-swap') ?? 'innerHTML',
      };
      const swapHs = this.getSwapTemplate(element, config)(JSON.stringify(data));
      if (!swapHs) return;
      // Dispatch a recognizable event so consumers can observe pre-swap.
      this.dispatchLifecycleEvent(
        element,
        'htmx:sseMessage',
        { url, event: eventName, data },
        { cancelable: false }
      );
      if (this.executeCallback) {
        void this.executeCallback(swapHs, element).catch(err => {
          if (typeof console !== 'undefined') {
            console.error('[sse-compat] swap execution failed:', err);
          }
        });
      }
    };

    const conn = new SSEConnection(element, url, swapHandler, {
      EventSourceCtor: this.eventSourceCtor,
      debug: this.options.debug,
    });
    this.sseConnections.set(element, conn);
    this.sseConnectionsSet.add(conn);

    // Subscribe to each named event listed in sse-swap (comma-separated).
    const swapAttr = element.getAttribute('sse-swap');
    if (swapAttr) {
      for (const name of swapAttr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)) {
        conn.listenFor(name);
      }
    }

    return conn;
  }

  /**
   * Get the SSE connection for an element, if one is open.
   * Returns null if no `sse-connect` was processed for this element.
   */
  getSSEConnection(element: Element): SSEConnection | null {
    return this.sseConnections.get(element) ?? null;
  }

  /**
   * Detach an element's SSE connection. Idempotent. Used internally by
   * MutationObserver on node removal; safe to call manually too.
   */
  detachSSE(element: Element): void {
    const conn = this.sseConnections.get(element);
    if (!conn) return;
    conn.detach();
    this.sseConnections.delete(element);
    this.sseConnectionsSet.delete(conn);
  }

  /**
   * Walk a removed subtree and detach any SSE connections found. Called
   * from the MutationObserver when nodes are removed.
   */
  private detachSSESubtree(root: Element): void {
    this.detachSSE(root);
    if (typeof root.querySelectorAll !== 'function') return;
    const descendants = root.querySelectorAll('[sse-connect]');
    for (const el of descendants) this.detachSSE(el);
  }

  /**
   * Open a WebSocket for an element bearing `ws-connect`. Idempotent.
   * Wires up `ws-send` listeners on descendant forms/buttons in the same
   * subtree so submit/click events serialize and forward over the socket.
   */
  attachWS(element: Element): WSConnection | null {
    const existing = this.wsConnections.get(element);
    if (existing) return existing;

    const url = element.getAttribute('ws-connect');
    if (!url) return null;

    const swapHandler = (envelope: WSSwapEnvelope, _rawData: string): void => {
      // Build a fresh swap snippet per envelope so per-message overrides
      // (envelope.target / envelope.swap) are honored. The template-cache
      // lookup keys off (target|swap) so repeated envelopes with the same
      // shape hit a cached closure.
      const config: HtmxConfig = {
        url: undefined,
        method: 'GET',
        target: envelope.target,
        swap: envelope.swap ?? element.getAttribute('hx-swap') ?? 'innerHTML',
      };
      const swapHs = this.getSwapTemplate(element, config)(JSON.stringify(envelope.data));
      if (!swapHs) return;
      this.dispatchLifecycleEvent(
        element,
        'htmx:wsMessage',
        { url, envelope, data: envelope.data },
        { cancelable: false }
      );
      if (this.executeCallback) {
        void this.executeCallback(swapHs, element).catch(err => {
          if (typeof console !== 'undefined') {
            console.error('[ws-compat] swap execution failed:', err);
          }
        });
      }
    };

    const conn = new WSConnection(element, url, swapHandler, {
      WSEventSourceCtor: this.wsEventSourceCtor,
      debug: this.options.debug,
    });
    this.wsConnections.set(element, conn);
    this.wsConnectionsSet.add(conn);

    // Wire up any `ws-send` descendants. We attach a single listener per
    // source element. The ancestor walk lets `ws-send` be placed
    // anywhere inside the connection element's subtree.
    this.wireWSSendDescendants(element, conn);

    return conn;
  }

  /**
   * Install submit/click listeners on every `[ws-send]` element under the
   * given connection root. The listener serializes the source's payload
   * via {@link collectWSSendPayload} and forwards as JSON over the socket.
   *
   * Idempotent per source — repeated calls don't stack listeners.
   */
  private wireWSSendDescendants(root: Element, conn: WSConnection): void {
    if (typeof root.querySelectorAll !== 'function') return;
    const sources: Element[] = [];
    if (root.matches?.('[ws-send]')) sources.push(root);
    for (const el of root.querySelectorAll('[ws-send]')) sources.push(el);

    for (const source of sources) {
      if (this.wsSendListeners.has(source)) continue;
      // Choose event: form → submit, anything else → click.
      const eventName = source.tagName === 'FORM' ? 'submit' : 'click';
      const listener = (ev: Event): void => {
        // Forms shouldn't navigate when ws-send is the action.
        if (eventName === 'submit') ev.preventDefault();
        const payload = collectWSSendPayload(source);
        conn.send(payload);
      };
      source.addEventListener(eventName, listener);
      this.wsSendListeners.set(source, () => source.removeEventListener(eventName, listener));
    }
  }

  /** Get the WS connection for an element, if open. */
  getWSConnection(element: Element): WSConnection | null {
    return this.wsConnections.get(element) ?? null;
  }

  /** Detach an element's WS connection. Idempotent. */
  detachWS(element: Element): void {
    const conn = this.wsConnections.get(element);
    if (!conn) return;
    conn.detach();
    this.wsConnections.delete(element);
    this.wsConnectionsSet.delete(conn);
    // Drop ws-send listeners under this subtree too. If the element
    // itself was a ws-send source, that's covered by the next loop's
    // descendant walk too via `root.matches`.
    if (typeof element.querySelectorAll === 'function') {
      const sources: Element[] = [];
      if (element.matches?.('[ws-send]')) sources.push(element);
      for (const el of element.querySelectorAll('[ws-send]')) sources.push(el);
      for (const source of sources) {
        const cleanup = this.wsSendListeners.get(source);
        if (cleanup) {
          cleanup();
          this.wsSendListeners.delete(source);
        }
      }
    }
  }

  private detachWSSubtree(root: Element): void {
    this.detachWS(root);
    if (typeof root.querySelectorAll !== 'function') return;
    const descendants = root.querySelectorAll('[ws-connect]');
    for (const el of descendants) this.detachWS(el);
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

    // hx-live (v4 reactive expression — hyperscript body)
    const hxLive = element.getAttribute('hx-live');
    if (hxLive) {
      config.hxLive = hxLive;
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

    // SSE attachment runs independently of the request-translation path. An
    // element can bear ONLY `sse-connect` (no hx-get/post/etc.) and still
    // be valid — we open the stream and route named events through swap.
    // Elements with both `sse-connect` and request attrs get both paths
    // wired: SSE first (long-lived), then htmx translation (event-driven).
    if (element.hasAttribute('sse-connect')) {
      this.attachSSE(element);
      // Don't mark processed here — fall through so any hx-* attrs on the
      // same element still get translated.
    }
    // WS attachment: same parallel-path model as SSE. `ws-send` listeners
    // are wired on descendants by attachWS().
    if (element.hasAttribute('ws-connect')) {
      this.attachWS(element);
    }

    // Detect if this is a fixi-style or htmx-style element
    const isFx = this.isFxElement(element);
    const config = isFx ? this.collectFxAttributes(element) : this.collectAttributes(element);
    const prefix = isFx ? 'fx' : 'htmx';

    // Skip if no meaningful config
    if (!config.url && !config.onHandlers && !config.boost && !config.hxLive) {
      // sse-connect already handled above; no-op fall-through is correct.
      return;
    }

    // hx-live emits a `live ... end` block, which requires @hyperfixi/reactivity
    // to be installed on the runtime. If the `live` feature isn't registered,
    // strip hxLive from the config and log a clear error — let other attributes
    // on the element still process.
    if (config.hxLive) {
      const registry = getParserExtensionRegistry();
      if (!registry.hasFeature('live')) {
        if (typeof console !== 'undefined') {
          console.error(
            `[${prefix}-compat] hx-live requires @hyperfixi/reactivity to be installed. ` +
              `Install it via \`installPlugin(runtime, reactivityPlugin)\`, or use the ` +
              `hyperfixi-hx-v4 bundle which auto-installs it. Element:`,
            element
          );
        }
        delete config.hxLive;
        // If hxLive was the only reason this element was processed, skip now
        // to avoid running the empty-translate code path below.
        if (!config.url && !config.onHandlers && !config.boost) {
          return;
        }
      }
    }

    // Dispatch fx:init event for fixi elements (cancelable)
    if (isFx && this.options.fixiEvents) {
      if (
        !this.dispatchLifecycleEvent<FxInitEventDetail>(
          element,
          FX_EVENTS.INIT,
          { element, options: {} },
          { debugPrefix: 'fx' }
        )
      ) {
        return;
      }
    }

    // Dispatch htmx:configuring event (cancelable)
    if (
      !this.dispatchLifecycleEvent<HtmxConfiguringEventDetail>(
        element,
        HTMX_EVENTS.CONFIGURING,
        { config, element },
        { debugPrefix: prefix }
      )
    ) {
      return;
    }

    // Also dispatch fx:config for fixi elements
    if (isFx && this.options.fixiEvents) {
      const fxConfigDetail: FxConfigEventDetail = {
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
      };
      if (
        !this.dispatchLifecycleEvent(element, FX_EVENTS.CONFIG, fxConfigDetail, {
          debugPrefix: 'fx',
        })
      ) {
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

      // Dispatch htmx:beforeRequest event (cancelable)
      if (
        !this.dispatchLifecycleEvent<HtmxBeforeRequestEventDetail>(
          element,
          HTMX_EVENTS.BEFORE_REQUEST,
          { element, url: config.url, method: config.method || 'GET' },
          { debugPrefix: prefix }
        )
      ) {
        this.pendingRequests.delete(element);
        return;
      }

      // Also dispatch fx:before for fixi elements
      if (isFx && this.options.fixiEvents) {
        if (
          !this.dispatchLifecycleEvent(
            element,
            FX_EVENTS.BEFORE,
            { element, url: config.url, method: config.method || 'GET' },
            { debugPrefix: 'fx' }
          )
        ) {
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
            const fxAfterDetail: FxAfterEventDetail = {
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
            };
            if (
              !this.dispatchLifecycleEvent(element, FX_EVENTS.AFTER, fxAfterDetail, {
                debugPrefix: 'fx',
              })
            ) {
              return; // Skip swap if cancelled
            }
          }

          // Dispatch htmx:afterSettle event (non-cancelable)
          this.dispatchLifecycleEvent<HtmxAfterSettleEventDetail>(
            element,
            HTMX_EVENTS.AFTER_SETTLE,
            { element, target: config.target },
            { cancelable: false }
          );

          // Also dispatch fx:swapped for fixi elements
          if (isFx && this.options.fixiEvents) {
            this.dispatchLifecycleEvent(
              element,
              FX_EVENTS.SWAPPED,
              { element, target: config.target },
              { cancelable: false, debugPrefix: 'fx' }
            );
          }
        })
        .catch(error => {
          wasSuccessful = false;
          console.error(`[${prefix}-compat] Execution error:`, error);

          // Dispatch htmx:error event (non-cancelable)
          const errorObj = error instanceof Error ? error : new Error(String(error));
          this.dispatchLifecycleEvent<HtmxErrorEventDetail>(
            element,
            HTMX_EVENTS.ERROR,
            { element, error: errorObj },
            { cancelable: false }
          );

          // Also dispatch fx:error for fixi elements
          if (isFx && this.options.fixiEvents) {
            this.dispatchLifecycleEvent(
              element,
              FX_EVENTS.ERROR,
              { element, error: errorObj },
              { cancelable: false, debugPrefix: 'fx' }
            );
          }
        })
        .finally(() => {
          // Clean up pending request tracking
          this.pendingRequests.delete(element);

          // Dispatch fx:finally for fixi elements (always fires)
          if (isFx && this.options.fixiEvents) {
            this.dispatchLifecycleEvent<FxFinallyEventDetail>(
              element,
              FX_EVENTS.FINALLY,
              { element, success: wasSuccessful },
              { cancelable: false, debugPrefix: 'fx' }
            );
          }

          // Dispatch fx:inited after processing complete (no bubble)
          if (isFx && this.options.fixiEvents) {
            this.dispatchLifecycleEvent(
              element,
              FX_EVENTS.INITED,
              { element },
              { cancelable: false, bubbles: false, debugPrefix: 'fx' }
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

        // Handle removed nodes — close any SSE/WS connections that were
        // open on the removed subtree so EventSource/WebSocket don't leak
        // after the element is gone. We walk descendants too because a
        // single removed parent may carry many connections.
        for (const node of mutation.removedNodes) {
          if (node instanceof Element) {
            this.detachSSESubtree(node);
            this.detachWSSubtree(node);
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
export { FIXI_ATTRS, HTMX_ALL_ATTRS as HTMX_ATTRS, SSE_ATTRS, WS_ATTRS };

export { translateToHyperscript, type HtmxConfig } from './htmx-translator.js';
export { SSEConnection, type SSEEventSourceCtor, type SSEEventSourceLike } from './sse.js';
export {
  WSConnection,
  collectWSSendPayload,
  type WSEventSourceCtor,
  type WSEventSourceLike,
  type WSSwapEnvelope,
} from './ws.js';
