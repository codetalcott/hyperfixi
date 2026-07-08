/**
 * `eventsource <Name> [from <url>] (on <event> [as <type>] <commands> end)* end`
 * — named Server-Sent-Events feature (upstream _hyperscript eventsource
 * extension).
 *
 * Grammar note: unlike socket, each handler block closes with its own `end`
 * (consumed by `parseCommandListUntilEnd()`), and the feature closes with a
 * final `end` — the corpus pattern's `… end end`.
 */

import type {
  ASTNode,
  ExecutionContext,
  FeatureParserCtx,
  HandlerBlock,
  RuntimeLike,
  Token,
} from './types';
import type { BackoffOptions, EventSourceCtor, EventSourceLike } from './connections';
import { getRealtimeConfig, realtime } from './connections';
import { coerceMessageData } from './socket';
import { parseUrlExpression } from './url';

export interface EventSourceFeatureNode extends ASTNode {
  type: 'eventsourceFeature';
  name: string;
  url?: string;
  handlers: HandlerBlock[];
}

/**
 * Parse the eventsource feature. The `eventsource` keyword has already been
 * consumed by the parser dispatcher.
 */
export function parseEventSourceFeature(ctx: unknown, token: unknown): ASTNode | null {
  const p = ctx as FeatureParserCtx;
  const tok = token as Token;
  try {
    const name = p.advance().value;

    let url: string | undefined;
    if (p.check('from')) {
      p.advance();
      url = parseUrlExpression(p) ?? undefined;
      if (!url) {
        p.addError(`Expected a URL after 'eventsource ${name} from'`);
        return null;
      }
    }

    const handlers: HandlerBlock[] = [];
    while (p.check('on')) {
      p.advance();
      const eventToken = p.advance();
      const event = eventToken.kind === 'string' ? eventToken.value.slice(1, -1) : eventToken.value;
      let as: string | undefined;
      if (p.check('as')) {
        p.advance();
        as = p.advance().value;
      }
      // Consumes this handler's `end`.
      const body = p.parseCommandListUntilEnd();
      handlers.push({ event, as, body });
    }

    p.consume('end', "Expected 'end' to close eventsource feature");

    return {
      type: 'eventsourceFeature',
      name,
      url,
      handlers,
      start: tok?.start ?? 0,
      end: p.getPosition().end,
      line: tok?.line,
      column: tok?.column,
    } as EventSourceFeatureNode;
  } catch (error) {
    p.addError(error instanceof Error ? error.message : String(error));
    return null;
  }
}

const DEFAULT_BACKOFF: Required<BackoffOptions> = {
  maxAttempts: 5,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

/**
 * Named EventSource connection. Browsers auto-reconnect an EventSource; we
 * only reopen manually (with backoff) when the source reaches CLOSED
 * (readyState 2). Warn-and-inert when no EventSource constructor exists.
 */
export class ESConnection {
  private es: EventSourceLike | null = null;
  private attempts = 0;
  private destroyed = false;
  private readonly listeners: Array<{ event: string; fn: (ev: { data: string }) => void }> = [];
  private readonly options: Required<BackoffOptions>;
  private readonly EventSourceCtor: EventSourceCtor | undefined;

  constructor(
    public readonly url: string,
    options: BackoffOptions & { EventSourceCtor?: EventSourceCtor } = {}
  ) {
    this.options = { ...DEFAULT_BACKOFF, ...options };
    this.EventSourceCtor =
      options.EventSourceCtor ?? (globalThis as { EventSource?: EventSourceCtor }).EventSource;
    this.open();
  }

  /** Register a named-event listener (re-attached on every reopen). */
  listenFor(event: string, fn: (ev: { data: string }) => void): void {
    this.listeners.push({ event, fn });
    this.es?.addEventListener(event, fn);
  }

  private open(): void {
    if (this.destroyed) return;
    if (!this.EventSourceCtor) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[realtime] EventSource is not available; eventsource '${this.url}' is inert.`
        );
      }
      return;
    }
    let es: EventSourceLike;
    try {
      es = new this.EventSourceCtor(this.url);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn(`[realtime] Failed to open eventsource '${this.url}':`, error);
      }
      this.scheduleReopen();
      return;
    }
    this.es = es;
    for (const { event, fn } of this.listeners) es.addEventListener(event, fn);
    es.onerror = () => {
      // readyState 2 === CLOSED: the browser gave up; reopen with backoff.
      if (es.readyState === 2) {
        this.es = null;
        this.scheduleReopen();
      }
    };
  }

  private scheduleReopen(): void {
    if (this.destroyed || this.attempts >= this.options.maxAttempts) return;
    const delay = Math.min(
      this.options.baseBackoffMs * 2 ** this.attempts,
      this.options.maxBackoffMs
    );
    this.attempts++;
    const timer = setTimeout(() => this.open(), delay);
    (timer as { unref?: () => void }).unref?.();
  }

  /** Terminal close: no reopens after this. */
  detach(): void {
    this.destroyed = true;
    try {
      this.es?.close();
    } catch {
      /* already closed */
    }
    this.es = null;
  }
}

/** Create the eventsourceFeature evaluator bound to a runtime reference. */
export function makeEvaluateEventSourceFeature(
  runtime: RuntimeLike
): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return function evaluateEventSourceFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const n = node as EventSourceFeatureNode;
    const owner = (context.me as Element) ?? null;
    const cfg = getRealtimeConfig();

    const conn = new ESConnection(n.url ?? '', {
      ...cfg.eventSourceOptions,
      EventSourceCtor: cfg.EventSourceCtor,
    });

    for (const handler of n.handlers) {
      conn.listenFor(handler.event, ev => {
        const data = coerceMessageData(ev.data, handler.as);
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
              console.error(`[realtime] eventsource '${n.name}' handler error:`, error);
            }
          });
      });
    }

    context.globals?.set(n.name, conn);
    realtime.register(n.name, conn, owner);

    if (owner) {
      const cleanup = (): void => {
        conn.detach();
        context.globals?.delete(n.name);
        realtime.unregister(n.name);
      };
      runtime.getCleanupRegistry?.()?.registerCustom(owner, cleanup, 'realtime-eventsource');
      context.registerCleanup?.(owner, cleanup, 'realtime-eventsource');
    }
    return undefined;
  };
}
