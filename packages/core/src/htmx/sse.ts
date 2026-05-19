/**
 * Server-Sent Events (SSE) integration for the htmx-compat attribute
 * processor. Implements the htmx v4 `sse-connect` / `sse-swap` surface.
 *
 * Why a class (not a hyperscript command):
 *   SSE is attribute-driven, lives the lifetime of the element it's
 *   attached to, and the swap behavior reuses the htmx-compat
 *   `applySwap`-style machinery. A hyperscript `connect to <url>` command
 *   would force callers into an imperative `_=` body just to wire an
 *   `sse-connect` attribute — wrong ergonomic shape. The processor
 *   constructs an SSEConnection per element and routes named events
 *   through the existing swap machinery directly.
 *
 * Reliability model: native `EventSource` already reconnects on transient
 * network failure. We add a bounded exponential-backoff cap on top so a
 * dead server doesn't busy-loop a browser tab — after `maxAttempts` the
 * connection is closed and `htmx:sseError` fires. Callers can re-open by
 * removing and re-adding the `sse-connect` attribute.
 */

/** Default max reconnect attempts before giving up. */
const DEFAULT_MAX_ATTEMPTS = 5;
/** Default base backoff (ms) before first retry. Doubled on each subsequent. */
const DEFAULT_BASE_BACKOFF_MS = 1000;
/** Hard cap on backoff between retries (ms). Prevents pathological waits. */
const DEFAULT_MAX_BACKOFF_MS = 30_000;

export interface SSEConnectionOptions {
  /** Maximum reconnect attempts after the native retry quota is exhausted. */
  maxAttempts?: number;
  /** Initial backoff delay (ms). Subsequent attempts double up to `maxBackoffMs`. */
  baseBackoffMs?: number;
  /** Upper bound on backoff delay (ms). */
  maxBackoffMs?: number;
  /** Verbose logging. */
  debug?: boolean;
}

/**
 * Callback invoked when an SSE event matches an `sse-swap="<name>"`
 * attribute. Receives the event name and `data` payload; the caller is
 * responsible for routing into the existing swap machinery (honors
 * `hx-target`, `hx-swap`).
 */
export type SSESwapHandler = (eventName: string, data: string) => void;

interface DispatchTarget {
  /** Element that bears `sse-connect`. SSE events bubble from this element. */
  source: Element;
}

/**
 * Convenience for `EventSource` exposing only what we need. Lets tests
 * stub the constructor without pulling in `lib.dom.d.ts` minutiae. The
 * shape matches the browser's `EventSource` interface 1:1.
 */
export interface SSEEventSourceLike {
  readonly readyState: number;
  url: string;
  close(): void;
  addEventListener(
    type: string,
    listener: (this: SSEEventSourceLike, ev: { data: string; type: string }) => void
  ): void;
  removeEventListener(
    type: string,
    listener: (this: SSEEventSourceLike, ev: { data: string; type: string }) => void
  ): void;
  onerror: ((ev: Event) => void) | null;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: { data: string; type: string }) => void) | null;
}

/** EventSource constructor type. Tests substitute their own. */
export type SSEEventSourceCtor = new (
  url: string,
  init?: { withCredentials?: boolean }
) => SSEEventSourceLike;

/**
 * Per-element SSE connection. Construct once when an element bearing
 * `sse-connect` is processed; `detach()` when the element leaves the DOM.
 *
 * The constructor opens the EventSource immediately. Named-event listeners
 * for `sse-swap="<names>"` are registered via {@link listenFor}.
 */
export class SSEConnection {
  private source: SSEEventSourceLike | null = null;
  private listeners = new Map<string, (ev: { data: string; type: string }) => void>();
  private destroyed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly debug: boolean;
  private readonly EventSourceCtor: SSEEventSourceCtor;

  constructor(
    public readonly element: Element,
    public readonly url: string,
    private readonly swapHandler: SSESwapHandler,
    options: SSEConnectionOptions & { EventSourceCtor?: SSEEventSourceCtor } = {}
  ) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.debug = options.debug ?? false;
    // Fall back to the global `EventSource` if no injection. The cast is
    // safe because the constructor signature is identical.
    this.EventSourceCtor =
      options.EventSourceCtor ??
      (typeof EventSource !== 'undefined'
        ? (EventSource as unknown as SSEEventSourceCtor)
        : (null as unknown as SSEEventSourceCtor));

    if (!this.EventSourceCtor) {
      // Most non-browser environments. Don't throw — log and stay inert
      // so tests in jsdom-without-EventSource don't blow up at module load.
      if (this.debug && typeof console !== 'undefined') {
        console.warn('[sse] EventSource is not available in this environment');
      }
      return;
    }

    this.open();
  }

  /**
   * Add a listener for a named SSE event that should trigger a swap.
   * `sse-swap="message"` calls this with `'message'`, then incoming
   * `event: message\ndata: ...` lines invoke {@link swapHandler}.
   *
   * Multiple distinct names on the same element are supported (comma-
   * separated `sse-swap` value).
   */
  listenFor(eventName: string): void {
    if (this.destroyed) return;
    if (this.listeners.has(eventName)) return;
    const listener = (ev: { data: string; type: string }): void => {
      this.swapHandler(ev.type, ev.data);
    };
    this.listeners.set(eventName, listener);
    if (this.source) {
      this.source.addEventListener(eventName, listener);
    }
  }

  /**
   * Close the EventSource and detach all listeners. Safe to call multiple
   * times. After detach, the connection cannot be reopened — construct a
   * fresh SSEConnection if you need to reconnect.
   */
  detach(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeSource();
    this.dispatch('htmx:sseClose', { url: this.url });
  }

  /** Current readyState of the underlying EventSource, or -1 if closed/never opened. */
  get readyState(): number {
    return this.source?.readyState ?? -1;
  }

  private open(): void {
    if (this.destroyed) return;
    try {
      this.source = new this.EventSourceCtor(this.url);
    } catch (err) {
      this.dispatch('htmx:sseError', { url: this.url, error: err });
      this.scheduleReconnect();
      return;
    }

    this.source.onopen = (): void => {
      this.reconnectAttempts = 0;
      this.dispatch('htmx:sseOpen', { url: this.url });
    };

    this.source.onmessage = (ev): void => {
      // The default `message` event — separate from named events.
      // Dispatch as `htmx:sseMessage` so consumers can observe untyped
      // streams without subscribing to a specific `sse-swap` name.
      this.dispatch('htmx:sseMessage', { url: this.url, data: ev.data });
    };

    this.source.onerror = (ev): void => {
      // EventSource auto-reconnects internally on transient errors. We
      // only step in if the connection enters CLOSED state, meaning the
      // browser has given up.
      this.dispatch('htmx:sseError', { url: this.url, event: ev });
      // readyState 2 === CLOSED. The literal avoids a hard dep on the
      // ambient EventSource type for environments where it's absent.
      if (this.source && this.source.readyState === 2) {
        this.closeSource();
        this.scheduleReconnect();
      }
    };

    // Re-attach any named listeners that were registered before open.
    for (const [name, listener] of this.listeners) {
      this.source.addEventListener(name, listener);
    }
  }

  private closeSource(): void {
    if (!this.source) return;
    // Detach our own listeners so the EventSource is fully orphaned.
    for (const [name, listener] of this.listeners) {
      try {
        this.source.removeEventListener(name, listener);
      } catch {
        // happy-dom / mocks may not support removeEventListener fully.
      }
    }
    this.source.onopen = null;
    this.source.onmessage = null;
    this.source.onerror = null;
    try {
      this.source.close();
    } catch {
      // best-effort
    }
    this.source = null;
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.maxAttempts) {
      if (this.debug && typeof console !== 'undefined') {
        console.warn(`[sse] giving up after ${this.maxAttempts} reconnect attempts to ${this.url}`);
      }
      this.detach();
      return;
    }
    const delay = Math.min(
      this.baseBackoffMs * Math.pow(2, this.reconnectAttempts),
      this.maxBackoffMs
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private dispatch(name: string, detail: object): void {
    if (typeof CustomEvent === 'undefined') return;
    try {
      const event = new CustomEvent(name, { detail, bubbles: true, cancelable: false });
      this.element.dispatchEvent(event);
    } catch {
      // Element may have been removed mid-flight; swallow.
    }
  }
}

/** Type guard for use sites that only care about the dispatch surface. */
export function isSSEDispatchTarget(value: unknown): value is DispatchTarget {
  return typeof value === 'object' && value !== null && 'source' in value;
}
