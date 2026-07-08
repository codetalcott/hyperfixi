/**
 * `socket <Name> <url> [on message [as <type>] <commands> end]` — named
 * WebSocket feature (upstream _hyperscript socket extension).
 *
 * Grammar note: upstream's socket feature has ONE trailing `end` — the
 * message handler's body closes the whole feature — and supports a single
 * `on message` handler. `parseCommandListUntilEnd()` consumes that `end`, so
 * a handler-less socket needs its own explicit `end`.
 *
 * The connection is registered under `<Name>` in the shared globals map, so
 * `ChatSocket` resolves in expressions and `send X to ChatSocket` works via
 * the connection's EventTarget duck-typing.
 */

import type {
  ASTNode,
  ExecutionContext,
  FeatureParserCtx,
  HandlerBlock,
  RuntimeLike,
  Token,
} from './types';
import type { BackoffOptions, WebSocketCtor, WebSocketLike } from './connections';
import { getRealtimeConfig, realtime } from './connections';
import { parseUrlExpression } from './url';

export interface SocketFeatureNode extends ASTNode {
  type: 'socketFeature';
  name: string;
  url: string;
  handler?: HandlerBlock;
}

/**
 * Parse `socket <Name> <url> [on message [as <type>] <commands> end]`.
 * The `socket` keyword has already been consumed by the parser dispatcher.
 */
export function parseSocketFeature(ctx: unknown, token: unknown): ASTNode | null {
  const p = ctx as FeatureParserCtx;
  const tok = token as Token;
  try {
    const name = p.advance().value;
    const url = parseUrlExpression(p);
    if (!url) {
      p.addError(`Expected a URL after 'socket ${name}'`);
      return null;
    }

    let handler: HandlerBlock | undefined;
    if (p.check('on')) {
      p.advance();
      const event = p.advance().value;
      let as: string | undefined;
      if (p.check('as')) {
        p.advance();
        as = p.advance().value;
      }
      // Consumes the feature's single trailing `end`.
      const body = p.parseCommandListUntilEnd();
      handler = { event, as, body };
    } else {
      p.consume('end', "Expected 'end' to close socket feature");
    }

    return {
      type: 'socketFeature',
      name,
      url,
      handler,
      start: tok?.start ?? 0,
      end: p.getPosition().end,
      line: tok?.line,
      column: tok?.column,
    } as SocketFeatureNode;
  } catch (error) {
    p.addError(error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Parse a payload the way upstream does: JSON when possible, else raw text. */
export function coerceMessageData(raw: string, as?: string): unknown {
  if (as === 'string' || as === 'text' || as === 'raw') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const DEFAULT_BACKOFF: Required<BackoffOptions> = {
  maxAttempts: 5,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

/**
 * Named WebSocket connection: reconnect with exponential backoff, outbound
 * queue flushed on open, warn-and-inert when no WebSocket constructor exists
 * (jsdom-less/server environments must not throw at install time).
 *
 * The EventTarget duck-typing (`addEventListener`/`dispatchEvent`) lets the
 * core `send`/`trigger` command target the connection by name:
 * `send hello to ChatSocket` transmits `"hello"`; with args,
 * `send msg(x: 1) to ChatSocket` transmits `{"type":"msg","detail":{"x":1}}`.
 */
export class SocketConnection {
  private ws: WebSocketLike | null = null;
  private attempts = 0;
  private destroyed = false;
  private queue: string[] = [];
  private readonly options: Required<BackoffOptions>;

  constructor(
    public readonly url: string,
    private readonly onMessage: (data: string) => void,
    options: BackoffOptions & { WebSocketCtor?: WebSocketCtor } = {}
  ) {
    this.options = { ...DEFAULT_BACKOFF, ...options };
    this.WebSocketCtor =
      options.WebSocketCtor ?? (globalThis as { WebSocket?: WebSocketCtor }).WebSocket;
    this.open();
  }

  private readonly WebSocketCtor: WebSocketCtor | undefined;

  private open(): void {
    if (this.destroyed) return;
    if (!this.WebSocketCtor) {
      if (typeof console !== 'undefined') {
        console.warn(`[realtime] WebSocket is not available; socket '${this.url}' is inert.`);
      }
      return;
    }
    let ws: WebSocketLike;
    try {
      ws = new this.WebSocketCtor(this.url);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn(`[realtime] Failed to open socket '${this.url}':`, error);
      }
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      const pending = this.queue.splice(0);
      for (const payload of pending) ws.send(payload);
    };
    ws.onmessage = ev => this.onMessage(ev.data);
    ws.onclose = ev => {
      this.ws = null;
      if (!this.destroyed && !ev?.wasClean) this.scheduleReconnect();
    };
    ws.onerror = () => {
      /* onclose follows and handles reconnect */
    };
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.attempts >= this.options.maxAttempts) return;
    const delay = Math.min(
      this.options.baseBackoffMs * 2 ** this.attempts,
      this.options.maxBackoffMs
    );
    this.attempts++;
    const timer = setTimeout(() => this.open(), delay);
    (timer as { unref?: () => void }).unref?.();
  }

  /** Queue-aware send; objects are JSON-stringified. */
  send(payload: string | object): void {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    // readyState 1 === OPEN
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(data);
    } else {
      this.queue.push(data);
    }
  }

  /** Terminal close: no reconnects after this. */
  detach(): void {
    this.destroyed = true;
    try {
      this.ws?.close();
    } catch {
      /* already closed */
    }
    this.ws = null;
  }

  // — EventTarget duck-typing so `send <event> to <SocketName>` routes here —
  addEventListener(): void {
    /* satisfies the trigger command's duck-type check */
  }
  removeEventListener(): void {
    /* symmetry */
  }
  dispatchEvent(event: { type: string; detail?: unknown }): boolean {
    // `send hello to Sock` arrives with an empty detail object — transmit the
    // bare event name. Only a send with real args gets the JSON envelope.
    const detail = event.detail;
    const hasDetail =
      detail !== undefined &&
      detail !== null &&
      (typeof detail !== 'object' || Object.keys(detail as object).length > 0);
    this.send(hasDetail ? JSON.stringify({ type: event.type, detail }) : event.type);
    return true;
  }
}

/**
 * Create the socketFeature evaluator bound to a runtime reference (captured
 * by the plugin at install time).
 */
export function makeEvaluateSocketFeature(
  runtime: RuntimeLike
): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return function evaluateSocketFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const n = node as SocketFeatureNode;
    const owner = (context.me as Element) ?? null;
    const cfg = getRealtimeConfig();

    const onMessage = (raw: string): void => {
      const handler = n.handler;
      if (!handler) return;
      const data = coerceMessageData(raw, handler.as);
      const handlerCtx: ExecutionContext = {
        me: owner,
        you: null,
        it: data,
        result: data,
        locals: new Map<string, unknown>([['message', data]]),
        globals: context.globals,
      };
      void runtime
        .execute({ type: 'CommandSequence', commands: handler.body } as ASTNode, handlerCtx)
        .catch(error => {
          if (typeof console !== 'undefined') {
            console.error(`[realtime] socket '${n.name}' message handler error:`, error);
          }
        });
    };

    const conn = new SocketConnection(n.url, onMessage, {
      ...cfg.socketOptions,
      WebSocketCtor: cfg.WebSocketCtor,
    });

    context.globals?.set(n.name, conn);
    realtime.register(n.name, conn, owner);

    if (owner) {
      const cleanup = (): void => {
        conn.detach();
        context.globals?.delete(n.name);
        realtime.unregister(n.name);
      };
      runtime.getCleanupRegistry?.()?.registerCustom(owner, cleanup, 'realtime-socket');
      context.registerCleanup?.(owner, cleanup, 'realtime-socket');
    }
    return undefined;
  };
}
