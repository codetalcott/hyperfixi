/**
 * WebSocket integration for the htmx-compat attribute processor.
 * Implements the htmx v4 `ws-connect` / `ws-send` surface.
 *
 * Why a class (parallels {@link ./sse.ts}):
 *   WebSockets are attribute-driven, long-lived per element, and the
 *   reasonable swap shape is identical to SSE — pull a payload off the
 *   wire and apply it through the existing `hx-target` / `hx-swap`
 *   machinery. A hyperscript `send to socket` command would force
 *   imperative `_=` for a fundamentally declarative attribute.
 *
 * Differences vs SSE:
 *   - WebSocket has no native reconnect; we provide bounded exponential
 *     backoff (1s → 2s → 4s … capped at 30s, default 5 attempts).
 *   - Bidirectional: {@link WSConnection.send} writes to the socket,
 *     used to forward form/button data tagged with `ws-send`.
 *
 * Routing model for incoming messages:
 *   - If `data` parses as JSON with a `target` field, treat it as an
 *     envelope: `{ target, swap?, data }` and apply through the swap
 *     handler. Lets the server drive surgical updates without the
 *     client knowing the layout up front.
 *   - Otherwise dispatch `htmx:wsMessage` with the raw text — consumers
 *     can route however they like.
 */

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30_000;

export interface WSConnectionOptions {
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  debug?: boolean;
  /**
   * WebSocket sub-protocol(s) to negotiate. Forwarded to the
   * WebSocket constructor's `protocols` arg.
   */
  protocols?: string | string[];
}

/**
 * Envelope shape for server → client messages that should drive a swap.
 * `target` is a CSS selector or `me` / `this`; `swap` defaults to
 * `innerHTML`; `data` is the HTML/text payload.
 */
export interface WSSwapEnvelope {
  target: string;
  swap?: string;
  data: string;
}

/**
 * Two-arg shape for swap routing — mirrors {@link ./sse.ts}'s shape so
 * the processor's swap-builder can be reused for both transports.
 *
 * `envelope` provides the per-message overrides (target/swap). `rawData`
 * is the body to insert.
 */
export type WSSwapHandler = (envelope: WSSwapEnvelope, rawData: string) => void;

/** Minimal subset of `WebSocket` needed for substitution in tests. */
export interface WSEventSourceLike {
  readonly readyState: number;
  url: string;
  close(code?: number, reason?: string): void;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onclose: ((ev: { code: number; reason: string; wasClean: boolean }) => void) | null;
}

/** WebSocket constructor type. Tests inject their own. */
export type WSEventSourceCtor = new (
  url: string,
  protocols?: string | string[]
) => WSEventSourceLike;

/**
 * Per-element WebSocket connection. Opens on construction; reconnects
 * with exponential backoff on error/close until `maxAttempts` is reached.
 */
export class WSConnection {
  private socket: WSEventSourceLike | null = null;
  private destroyed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: string[] = [];
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly debug: boolean;
  private readonly protocols: string | string[] | undefined;
  private readonly WSCtor: WSEventSourceCtor;

  constructor(
    public readonly element: Element,
    public readonly url: string,
    private readonly swapHandler: WSSwapHandler,
    options: WSConnectionOptions & { WSEventSourceCtor?: WSEventSourceCtor } = {}
  ) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.debug = options.debug ?? false;
    this.protocols = options.protocols;
    this.WSCtor =
      options.WSEventSourceCtor ??
      (typeof WebSocket !== 'undefined'
        ? (WebSocket as unknown as WSEventSourceCtor)
        : (null as unknown as WSEventSourceCtor));

    if (!this.WSCtor) {
      if (this.debug && typeof console !== 'undefined') {
        console.warn('[ws] WebSocket is not available in this environment');
      }
      return;
    }

    this.open();
  }

  /** Current readyState (-1 if no socket). 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED. */
  get readyState(): number {
    return this.socket?.readyState ?? -1;
  }

  /**
   * True once `detach()` has run or the reconnect-retry budget has been
   * exhausted. A terminal state — destroyed connections don't reconnect
   * and silently drop further `send()` calls. Lets tests assert "we gave
   * up" directly rather than counting `htmx:wsClose` events.
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Send a payload over the socket. If the connection isn't OPEN yet,
   * the payload is queued and flushed on `onopen`. Returns true if the
   * payload was queued or sent.
   */
  send(payload: string | object): void {
    if (this.destroyed) return;
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(str);
    } else {
      this.outboundQueue.push(str);
    }
  }

  /** Close the socket and tear down listeners. Safe to call multiple times. */
  detach(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeSocket();
    this.dispatch('htmx:wsClose', { url: this.url, code: 1000, reason: 'detached' });
  }

  private open(): void {
    if (this.destroyed) return;
    try {
      this.socket = new this.WSCtor(this.url, this.protocols);
    } catch (err) {
      this.dispatch('htmx:wsError', { url: this.url, error: err });
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = (): void => {
      this.reconnectAttempts = 0;
      this.dispatch('htmx:wsOpen', { url: this.url });
      // Flush any queued sends now that we're OPEN.
      if (this.outboundQueue.length && this.socket) {
        for (const payload of this.outboundQueue) {
          try {
            this.socket.send(payload);
          } catch (err) {
            this.dispatch('htmx:wsError', { url: this.url, error: err });
          }
        }
        this.outboundQueue = [];
      }
    };

    this.socket.onmessage = (ev): void => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      // Try the envelope shape first. If it parses with a `target`,
      // route through swap. Otherwise dispatch a raw message event.
      const envelope = tryParseEnvelope(raw);
      if (envelope) {
        this.swapHandler(envelope, envelope.data);
      } else {
        this.dispatch('htmx:wsMessage', { url: this.url, data: raw });
      }
    };

    this.socket.onerror = (ev): void => {
      this.dispatch('htmx:wsError', { url: this.url, event: ev });
    };

    this.socket.onclose = (ev): void => {
      this.dispatch('htmx:wsClose', { url: this.url, code: ev.code, reason: ev.reason });
      this.socket = null;
      if (!this.destroyed && !ev.wasClean) {
        this.scheduleReconnect();
      }
    };
  }

  private closeSocket(): void {
    if (!this.socket) return;
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
    try {
      this.socket.close(1000, 'detached');
    } catch {
      // best-effort
    }
    this.socket = null;
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.maxAttempts) {
      if (this.debug && typeof console !== 'undefined') {
        console.warn(`[ws] giving up after ${this.maxAttempts} reconnect attempts to ${this.url}`);
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
      // Element may have detached; swallow.
    }
  }
}

/**
 * Try to parse a string as a swap envelope. Returns null for anything
 * that isn't a JSON object with a `target` string and a `data` string.
 * Permissive on extra fields — server is free to attach metadata.
 */
function tryParseEnvelope(raw: string): WSSwapEnvelope | null {
  if (!raw || raw[0] !== '{') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.target !== 'string') return null;
  if (typeof p.data !== 'string') return null;
  return {
    target: p.target,
    swap: typeof p.swap === 'string' ? p.swap : undefined,
    data: p.data,
  };
}

/**
 * Collect form values from a `ws-send` source as a plain object suitable
 * for JSON serialization. Forms emit all fields; non-form elements like a
 * button emit the button's name/value pair if present.
 *
 * Public so the processor can call it and tests can exercise it directly.
 */
export function collectWSSendPayload(source: Element): Record<string, string> {
  // Forms: serialize all enabled input/select/textarea fields.
  if (typeof HTMLFormElement !== 'undefined' && source instanceof HTMLFormElement) {
    const fd = new FormData(source);
    const out: Record<string, string> = {};
    for (const [key, value] of fd.entries()) {
      out[key] = typeof value === 'string' ? value : value.name;
    }
    return out;
  }
  // Buttons/inputs: pluck name/value if defined.
  const name = source.getAttribute('name');
  const value = (source as HTMLInputElement).value;
  if (name && value !== undefined) {
    return { [name]: String(value) };
  }
  return {};
}
