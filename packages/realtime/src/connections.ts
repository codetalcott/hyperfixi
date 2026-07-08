/**
 * Connection registry + dependency injection for the realtime plugin.
 *
 * `realtime` is a process-level singleton (precedent: `reactive` in
 * @hyperfixi/reactivity, `behaviorRegistry` in core) tracking every live
 * connection by name and by owning element, so tests and consumers can tear
 * connections down explicitly.
 *
 * `configureRealtime` injects constructors/options — tests pass fake
 * WebSocket/EventSource classes; production leaves the defaults
 * (`globalThis.WebSocket` / `globalThis.EventSource`).
 */

export interface Detachable {
  detach(): void;
}

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  readyState: number;
  onopen: ((ev?: unknown) => void) | null;
  onclose: ((ev?: { wasClean?: boolean }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
}

export type WebSocketCtor = new (url: string) => WebSocketLike;

export interface EventSourceLike {
  addEventListener(type: string, listener: (ev: { data: string }) => void): void;
  close(): void;
  readyState: number;
  onerror: ((ev?: unknown) => void) | null;
}

export type EventSourceCtor = new (url: string) => EventSourceLike;

export interface BackoffOptions {
  /** Give up after this many consecutive failed (re)connect attempts. */
  maxAttempts?: number;
  /** First reconnect delay in ms; doubles each attempt. */
  baseBackoffMs?: number;
  /** Ceiling for the reconnect delay in ms. */
  maxBackoffMs?: number;
}

export interface RealtimeConfig {
  WebSocketCtor?: WebSocketCtor;
  EventSourceCtor?: EventSourceCtor;
  socketOptions?: BackoffOptions;
  eventSourceOptions?: BackoffOptions;
}

const config: RealtimeConfig = {};

/** Inject constructors/options (tests) or reset with no argument. */
export function configureRealtime(next?: RealtimeConfig): void {
  config.WebSocketCtor = next?.WebSocketCtor;
  config.EventSourceCtor = next?.EventSourceCtor;
  config.socketOptions = next?.socketOptions;
  config.eventSourceOptions = next?.eventSourceOptions;
}

export function getRealtimeConfig(): RealtimeConfig {
  return config;
}

class RealtimeRegistry {
  private byName = new Map<string, Detachable>();
  private byElement = new Map<Element, Detachable[]>();

  register(name: string, connection: Detachable, owner: Element | null | undefined): void {
    // A re-executed feature (e.g. re-processed element) replaces its
    // predecessor rather than leaking it.
    this.byName.get(name)?.detach();
    this.byName.set(name, connection);
    if (owner) {
      const list = this.byElement.get(owner) ?? [];
      list.push(connection);
      this.byElement.set(owner, list);
    }
  }

  get(name: string): Detachable | undefined {
    return this.byName.get(name);
  }

  unregister(name: string): void {
    this.byName.delete(name);
  }

  /** Detach every connection owned by an element (explicit teardown). */
  stopElement(element: Element): void {
    const list = this.byElement.get(element);
    if (!list) return;
    for (const conn of list) conn.detach();
    this.byElement.delete(element);
    for (const [name, conn] of this.byName) {
      if (list.includes(conn)) this.byName.delete(name);
    }
  }

  /** Detach everything (test teardown). */
  closeAll(): void {
    for (const conn of this.byName.values()) conn.detach();
    this.byName.clear();
    this.byElement.clear();
  }
}

export const realtime = new RealtimeRegistry();
