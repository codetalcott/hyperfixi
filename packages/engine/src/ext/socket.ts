/**
 * Upstream's `socket` extension (`src/ext/socket.js`, 0.9.93): a WebSocket as a named feature.
 *
 *   socket Chat ws://example.com/chat [with timeout 5000]
 *     [on message [as JSON] <commands>]
 *   end
 *
 * `Chat` is defined on the element, or globally for a script tag; `MyApp.chat` defines it in a
 * namespace. It has `Chat.raw` (the WebSocket), `dispatchEvent` (so `send ping(n: 1) to Chat`
 * sends `{"type":"ping","n":1}`), and `Chat.rpc.f(…)`: it sends `{iid, function, args}` and
 * returns a promise for the reply's `return` (or its `throw`), which times out after the
 * socket's timeout (10 s unless `with timeout`); `.noTimeout` and `.timeout(ms)` change that
 * for one call. In `on message`, `message` (and `it`) is the data, parsed with `as JSON`. A
 * relative URL (`/chat`) takes the page's host, as `wss:` on an https page. Upstream's tests for
 * it (`test/features/socket.js`) are in the gate.
 *
 * Two differences from upstream, which its tests do not see: the WebSocket opens when the
 * feature is installed, not when it is parsed, so a parse alone (`_hyperscript.parse`, an
 * editor, a gate) opens nothing; and with `as JSON` a message that is JSON `0`, `false` or
 * `null` is that value, where upstream reports it as not JSON.
 */
import type { Cmd, Feature } from '../ast';
import type { Module } from '../engine';
import {
  assignToNamespace,
  commandList,
  dotOrColonPath,
  evalStatic,
  expr,
  makeContext,
  runList,
  urlOrExpression,
} from '../kit';

export interface SocketFeature extends Feature {
  type: 'socketFeature';
  name: string;
  url: string;
  timeout: number;
  json: boolean;
  messageHandler?: Cmd[];
}

/** An RPC call's reply waits here, by its `iid`. */
type Pending = Record<string, { resolve: (value: unknown) => void; reject: (e: unknown) => void }>;

/** What a proxy answers instead of making a call: a promise's methods, and `JSON.stringify`'s. */
const PROXY_BLACKLIST = ['then', 'catch', 'length', 'toJSON'];

const genUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/** A path with no scheme (`/chat`) is on the page's own host. */
function parseUrl(url: string): string {
  if (!url.startsWith('/')) return url;
  const host = location.hostname + (location.port ? ':' + location.port : '');
  if (location.protocol === 'https:') return 'wss://' + host + url;
  if (location.protocol === 'http:') return 'ws://' + host + url;
  return url;
}

export const socket: Module = g => {
  g.features.socket = (p, start) => {
    const name = dotOrColonPath(p) ?? p.err('Expected dotOrColonPath');
    const url = String(evalStatic(urlOrExpression(p)));
    let timeout = 10000;
    if (p.match('with')) {
      p.req('timeout');
      timeout = Number(evalStatic(expr(p)));
    }
    let json = false;
    let messageHandler: Cmd[] | undefined;
    if (p.match('on')) {
      p.req('message');
      if (p.match('as')) {
        if (!p.match('JSON')) p.req('json');
        json = true;
      }
      messageHandler = commandList(p);
    }
    const namespace = name.split('.');
    const socketName = namespace.pop() ?? name;

    const feature: SocketFeature = {
      type: 'socketFeature',
      name,
      url,
      timeout,
      json,
      messageHandler,
      start,
      end: p.endPos(),
      install: target => {
        const pending: Pending = {};
        let ws: WebSocket | null = open();

        function open(): WebSocket {
          const created = new WebSocket(parseUrl(url));
          created.onmessage = receive;
          // Closed: the next call opens a new one.
          created.addEventListener('close', () => (ws = null));
          return created;
        }

        const proxy = (wait: number): object =>
          new Proxy(
            {},
            {
              get: (_, property) => {
                if (PROXY_BLACKLIST.includes(String(property))) return null;
                if (property === 'noTimeout') return proxy(-1);
                if (property === 'timeout') return (ms: unknown) => proxy(parseInt(String(ms)));
                return (...args: unknown[]) => {
                  const iid = genUUID();
                  ws ??= open();
                  ws.send(JSON.stringify({ iid, function: property, args }));
                  const reply = new Promise(
                    (resolve, reject) => (pending[iid] = { resolve, reject })
                  );
                  if (wait >= 0)
                    setTimeout(() => {
                      pending[iid]?.reject('Timed out');
                      delete pending[iid];
                    }, wait);
                  return reply;
                };
              },
            }
          );

        const socketObject = {
          raw: ws,
          dispatchEvent(evt: Event) {
            const detail = (evt as CustomEvent).detail ?? {};
            // Not the event's: what hyperscript itself adds to an event it sends.
            delete detail.sender;
            delete detail._namedArgList_;
            ws?.send(JSON.stringify({ type: evt.type, ...detail }));
          },
          rpc: proxy(timeout),
        };

        function receive(evt: MessageEvent): void {
          const data: unknown = evt.data;
          let parsed: unknown;
          try {
            parsed = JSON.parse(String(data));
          } catch {
            // Not JSON.
          }
          const reply = parsed as { iid?: string; throw?: unknown; return?: unknown } | undefined;
          if (reply?.iid && pending[reply.iid]) {
            if (reply.throw) pending[reply.iid].reject(reply.throw);
            else pending[reply.iid].resolve(reply.return);
            delete pending[reply.iid];
          }
          if (!messageHandler) return;
          if (json && parsed === undefined)
            throw new Error('Received non-JSON message from socket: ' + String(data));
          const message = json ? parsed : data;
          const ctx = makeContext(socketObject, feature, socketObject, null);
          ctx.locals.message = message;
          ctx.result = message;
          Promise.resolve(runList(messageHandler, ctx)).catch(error => console.error(error));
        }

        assignToNamespace(target, namespace, socketName, socketObject);
      },
    };
    return feature;
  };
};
