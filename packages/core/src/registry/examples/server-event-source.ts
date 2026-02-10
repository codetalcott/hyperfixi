/**
 * Example: Server Request Event Source
 *
 * Demonstrates how to create a custom event source for server-side hyperscript.
 * This example shows the pattern for handling HTTP requests as hyperscript events.
 *
 * Usage in hyperscript:
 *   on request(GET, /api/users) respond with <json> users </json>
 *   on request(POST, /api/users) set user to request.body then respond with user
 *
 * Installation:
 *   import { eventSources } from '@hyperfixi/core/registry';
 *   import { createRequestEventSource } from './server-event-source';
 *
 *   const requestSource = createRequestEventSource();
 *   eventSources.register('request', requestSource);
 */

import type {
  EventSource,
  EventSourceSubscription,
  EventSourceSubscribeOptions,
  EventSourcePayload,
} from '../event-source-registry';
import type { ExecutionContext } from '../../types/core';

/**
 * HTTP Method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Simple request interface (framework-agnostic)
 */
export interface ServerRequest {
  method: HttpMethod;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string | string[]>;
  body: unknown;
}

/**
 * Simple response builder interface
 */
export interface ServerResponse {
  status(code: number): ServerResponse;
  header(name: string, value: string): ServerResponse;
  json(data: unknown): void;
  html(content: string): void;
  text(content: string): void;
  redirect(url: string, code?: number): void;
  send(data: unknown): void;
}

/**
 * Request handler registered via the event source
 */
export interface RequestHandler {
  method: HttpMethod | '*';
  pattern: string | RegExp;
  handler: (payload: EventSourcePayload, context: ExecutionContext) => void;
}

/**
 * Create a server request event source
 *
 * This is a factory that creates an event source for handling HTTP requests.
 * The actual request routing depends on your server framework.
 *
 * @example
 * // Express integration
 * const requestSource = createRequestEventSource();
 * eventSources.register('request', requestSource);
 *
 * app.use((req, res, next) => {
 *   requestSource.handleRequest(req, res);
 * });
 */
export function createRequestEventSource(): EventSource & {
  handleRequest(request: ServerRequest, response: ServerResponse): boolean;
} {
  const handlers: Map<string, RequestHandler> = new Map();
  let nextId = 1;

  const source: EventSource & {
    handleRequest(request: ServerRequest, response: ServerResponse): boolean;
  } = {
    name: 'request',
    description: 'HTTP request events for server-side hyperscript',
    supportedEvents: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', '*'],

    subscribe(
      options: EventSourceSubscribeOptions,
      context: ExecutionContext
    ): EventSourceSubscription {
      const id = `request_${nextId++}`;
      const method = (options.event?.toUpperCase() || '*') as HttpMethod | '*';
      const pattern = options.target || '*';

      const handler: RequestHandler = {
        method,
        pattern: typeof pattern === 'string' ? pattern : new RegExp(pattern),
        handler: options.handler,
      };

      handlers.set(id, handler);

      return {
        id,
        source: 'request',
        event: method,
        unsubscribe: () => {
          handlers.delete(id);
        },
      };
    },

    supports(event: string): boolean {
      const upper = event.toUpperCase();
      return (
        upper === 'GET' ||
        upper === 'POST' ||
        upper === 'PUT' ||
        upper === 'DELETE' ||
        upper === 'PATCH' ||
        upper === 'HEAD' ||
        upper === 'OPTIONS' ||
        upper === 'REQUEST' ||
        upper === '*'
      );
    },

    destroy(): void {
      handlers.clear();
    },

    /**
     * Handle an incoming HTTP request
     * Call this from your server framework's middleware
     *
     * @returns true if a handler matched and processed the request
     */
    handleRequest(request: ServerRequest, response: ServerResponse): boolean {
      let handled = false;

      for (const [id, handler] of handlers.entries()) {
        // Check method match
        if (handler.method !== '*' && handler.method !== request.method) {
          continue;
        }

        // Check pattern match
        let matches = false;
        if (handler.pattern === '*') {
          matches = true;
        } else if (typeof handler.pattern === 'string') {
          matches = matchPath(request.path, handler.pattern);
        } else {
          matches = handler.pattern.test(request.path);
        }

        if (matches) {
          const payload: EventSourcePayload = {
            type: request.method,
            data: {
              request,
              response,
              params: extractParams(request.path, handler.pattern),
            },
            target: null,
            meta: {
              method: request.method,
              path: request.path,
              url: request.url,
            },
          };

          // Create request context
          const requestContext: ExecutionContext = {
            me: null,
            you: null,
            it: request,
            event: null,
            locals: new Map([
              ['request', request],
              ['response', response],
              ['method', request.method],
              ['path', request.path],
              ['query', request.query],
              ['params', request.params],
              ['body', request.body],
              ['headers', request.headers],
            ]),
            globals: new Map(),
            result: undefined,
          };

          handler.handler(payload, requestContext);
          handled = true;
        }
      }

      return handled;
    },
  };

  return source;
}

/**
 * Simple path matching (supports :param patterns)
 */
function matchPath(path: string, pattern: string): boolean {
  if (pattern === '*' || pattern === path) {
    return true;
  }

  // Convert Express-style patterns to regex
  const regexPattern = pattern
    .replace(/:[^/]+/g, '([^/]+)') // :param -> capture group
    .replace(/\*/g, '.*'); // * -> wildcard

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Extract path parameters from a path
 */
function extractParams(path: string, pattern: string | RegExp): Record<string, string> {
  if (typeof pattern !== 'string' || !pattern.includes(':')) {
    return {};
  }

  const params: Record<string, string> = {};
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].slice(1);
      params[paramName] = pathParts[i] || '';
    }
  }

  return params;
}

/**
 * Example: WebSocket event source (stub for reference)
 */
export function createWebSocketEventSource(): EventSource {
  return {
    name: 'websocket',
    description: 'WebSocket connection events',
    supportedEvents: ['connect', 'disconnect', 'message', 'error'],

    subscribe(options, context): EventSourceSubscription {
      // Implementation would integrate with your WebSocket library
      return {
        id: `ws_${Date.now()}`,
        source: 'websocket',
        event: options.event,
        unsubscribe: () => {},
      };
    },

    supports(event: string): boolean {
      return ['connect', 'disconnect', 'message', 'error', 'websocket'].includes(
        event.toLowerCase()
      );
    },
  };
}

/**
 * Example: Server-Sent Events (SSE) source (stub for reference)
 */
export function createSSEEventSource(): EventSource {
  return {
    name: 'sse',
    description: 'Server-Sent Events',
    supportedEvents: ['message', 'open', 'error'],

    subscribe(options, context): EventSourceSubscription {
      // Implementation would create SSE connection
      return {
        id: `sse_${Date.now()}`,
        source: 'sse',
        event: options.event,
        unsubscribe: () => {},
      };
    },

    supports(event: string): boolean {
      return ['message', 'open', 'error', 'sse'].includes(event.toLowerCase());
    },
  };
}
