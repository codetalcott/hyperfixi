/**
 * Request Event Source for Server-Side Hyperscript
 *
 * Enables declarative HTTP request handlers using hyperscript syntax:
 *   on request(GET, /api/users/:id) respond with user
 *   on request(POST, /api/users) set user to request.body then respond with user
 *
 * This integrates with Express to allow hyperscript code to handle HTTP routes.
 */

import type { Request, Response } from 'express';
import type {
  EventSource,
  EventSourceSubscription,
  EventSourceSubscribeOptions,
  ExecutionContext,
} from '@hyperfixi/core/registry';
import type {
  ServerEventPayload,
  ServerRequest,
  ServerResponse,
  HttpMethod,
} from '../types/server-types';

// Re-export types for backward compatibility
export type { HttpMethod, ServerRequest, ServerResponse } from '../types/server-types';

/**
 * Request handler registered via the event source
 */
export interface RequestHandler {
  id: string;
  method: HttpMethod | '*';
  pattern: string | RegExp;
  handler: (payload: ServerEventPayload, context: ExecutionContext) => void;
  priority: number; // Higher priority handlers are checked first
}

/**
 * Convert Express Request to ServerRequest
 */
export function expressRequestToServerRequest(req: Request): ServerRequest {
  return {
    method: req.method as HttpMethod,
    url: req.url,
    path: req.path,
    query: req.query as Record<string, string | string[]>,
    params: req.params,
    headers: req.headers as Record<string, string | string[]>,
    body: req.body,
    ip: req.ip,
    originalUrl: req.originalUrl,
  };
}

/**
 * Wrap Express Response as ServerResponse
 */
export function wrapExpressResponse(res: Response): ServerResponse {
  return {
    status(code: number): ServerResponse {
      res.status(code);
      return this;
    },
    header(name: string, value: string): ServerResponse {
      res.header(name, value);
      return this;
    },
    json(data: unknown): void {
      res.json(data);
    },
    html(content: string): void {
      res.type('html').send(content);
    },
    text(content: string): void {
      res.type('text').send(content);
    },
    redirect(url: string, code?: number): void {
      res.redirect(code || 302, url);
    },
    send(data: unknown): void {
      res.send(data);
    },
  };
}

/**
 * Create a request event source for server-side hyperscript
 *
 * @example
 * // Create and register the event source
 * const requestSource = createRequestEventSource();
 * registry.eventSources.register('request', requestSource);
 *
 * // Use in middleware
 * app.use((req, res, next) => {
 *   const handled = requestSource.handleRequest(
 *     expressRequestToServerRequest(req),
 *     wrapExpressResponse(res)
 *   );
 *   if (!handled) next();
 * });
 *
 * // Write hyperscript handlers
 * hyperfixi.compile(`
 *   on request(GET, /api/users/:id)
 *     set user to db.users.findById(params.id)
 *     respond with <json> user </json>
 *   end
 * `);
 */
export function createRequestEventSource(): EventSource & {
  handleRequest(request: ServerRequest, response: ServerResponse): boolean;
  getHandlers(): RequestHandler[];
  clearHandlers(): void;
} {
  const handlers = new Map<string, RequestHandler>();
  let nextId = 1;

  const source: EventSource & {
    handleRequest(request: ServerRequest, response: ServerResponse): boolean;
    getHandlers(): RequestHandler[];
    clearHandlers(): void;
  } = {
    name: 'request',
    description: 'HTTP request events for server-side hyperscript',
    supportedEvents: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', '*'],

    subscribe(
      options: EventSourceSubscribeOptions,
      context: ExecutionContext
    ): EventSourceSubscription {
      const id = `request_${nextId++}_${Date.now()}`;
      const method = (options.event?.toUpperCase() || '*') as HttpMethod | '*';
      const pattern = options.target || '*';

      // Determine priority (more specific patterns get higher priority)
      let priority = 0;
      if (typeof pattern === 'string' && pattern !== '*') {
        // Higher priority for paths with params (e.g., /api/users/:id)
        priority = pattern.includes(':') ? 100 : 50;
        // Even higher for exact matches (no wildcards or params)
        if (!pattern.includes(':') && !pattern.includes('*')) {
          priority = 150;
        }
      }

      const handler: RequestHandler = {
        id,
        method,
        pattern: typeof pattern === 'string' ? pattern : pattern,
        handler: options.handler,
        priority,
      };

      handlers.set(id, handler);

      console.log(
        `[RequestEventSource] Registered ${method} ${pattern} (id: ${id}, priority: ${priority})`
      );

      return {
        id,
        source: 'request',
        event: method,
        unsubscribe: () => {
          handlers.delete(id);
          console.log(`[RequestEventSource] Unregistered handler ${id}`);
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
      console.log('[RequestEventSource] Destroyed all handlers');
    },

    /**
     * Handle an incoming HTTP request
     * Call this from your server framework's middleware
     *
     * @returns true if a handler matched and processed the request
     */
    handleRequest(request: ServerRequest, response: ServerResponse): boolean {
      // Sort handlers by priority (highest first)
      const sortedHandlers = Array.from(handlers.values()).sort((a, b) => b.priority - a.priority);

      for (const handler of sortedHandlers) {
        // Check method match
        if (handler.method !== '*' && handler.method !== request.method) {
          continue;
        }

        // Check pattern match
        let matches = false;
        let params: Record<string, string> = {};

        if (handler.pattern === '*') {
          matches = true;
        } else if (typeof handler.pattern === 'string') {
          const matchResult = matchPath(request.path, handler.pattern);
          matches = matchResult.matches;
          params = matchResult.params;
        } else {
          matches = handler.pattern.test(request.path);
        }

        if (matches) {
          console.log(
            `[RequestEventSource] Matched ${request.method} ${request.path} -> handler ${handler.id}`
          );

          const payload: ServerEventPayload = {
            type: request.method,
            data: {
              request,
              response,
              params: { ...request.params, ...params },
            },
            target: null,
            meta: {
              method: request.method,
              path: request.path,
              url: request.url,
              handlerId: handler.id,
            },
          };

          // Create request-specific execution context
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
              ['params', { ...request.params, ...params }],
              ['body', request.body],
              ['headers', request.headers],
            ]),
            globals: new Map(),
            result: undefined,
          };

          try {
            handler.handler(payload, requestContext);
            return true;
          } catch (error) {
            console.error(`[RequestEventSource] Error executing handler ${handler.id}:`, error);
            // Continue to next handler on error
          }
        }
      }

      return false;
    },

    /**
     * Get all registered handlers (useful for debugging)
     */
    getHandlers(): RequestHandler[] {
      return Array.from(handlers.values());
    },

    /**
     * Clear all handlers (useful for testing)
     */
    clearHandlers(): void {
      handlers.clear();
    },
  };

  return source;
}

/**
 * Simple path matching with :param support
 * Returns { matches: boolean, params: Record<string, string> }
 */
function matchPath(
  path: string,
  pattern: string
): { matches: boolean; params: Record<string, string> } {
  const params: Record<string, string> = {};

  if (pattern === '*' || pattern === path) {
    return { matches: true, params };
  }

  // Convert Express-style patterns to regex
  const paramNames: string[] = [];
  const regexPattern = pattern
    .replace(/:[^/]+/g, match => {
      paramNames.push(match.slice(1)); // Remove ':'
      return '([^/]+)'; // Capture group for param
    })
    .replace(/\*/g, '.*'); // * -> wildcard

  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);

  if (!match) {
    return { matches: false, params };
  }

  // Extract param values
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1] || '';
  }

  return { matches: true, params };
}

/**
 * Default global request event source instance
 */
let defaultSource: ReturnType<typeof createRequestEventSource> | null = null;

/**
 * Get or create the default request event source
 */
export function getDefaultRequestEventSource(): ReturnType<typeof createRequestEventSource> {
  if (!defaultSource) {
    defaultSource = createRequestEventSource();
  }
  return defaultSource;
}

/**
 * Reset the default source (useful for testing)
 */
export function resetDefaultRequestEventSource(): void {
  if (defaultSource) {
    defaultSource.destroy?.();
    defaultSource = null;
  }
}
