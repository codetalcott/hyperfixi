/**
 * Server-Specific Types
 *
 * Type-safe exports for Node.js server environments.
 * These types guarantee HTTP request/response APIs are used correctly.
 *
 * Usage:
 *   import type { ServerEventPayload, ServerEventHandler } from '@lokascript/server-integration';
 *
 * Benefits:
 * - Full type safety for HTTP request/response
 * - Better IntelliSense in server code
 * - Compile-time errors if browser APIs (Element, Event) used in server
 */

import type {
  EventSourcePayload,
  EventSourceHandler,
  EventSourceSubscription,
  EventSource,
  ExecutionContext,
} from '@lokascript/core/registry';

/**
 * HTTP Method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | '*';

/**
 * Framework-agnostic HTTP request interface
 *
 * Abstracts differences between Express, Koa, Fastify, Hono, etc.
 */
export interface ServerRequest {
  method: HttpMethod;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string | string[]>;
  body: unknown;
  ip?: string;
  originalUrl?: string;
}

/**
 * Framework-agnostic HTTP response interface
 *
 * Provides a consistent API across different HTTP frameworks.
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
 * Server-specific event payload
 *
 * Guarantees:
 * - target is object (generic context object, not Element)
 * - nativeEvent is never (not available in Node.js)
 * - data contains request and response objects
 *
 * @example
 * const payload: ServerEventPayload = {
 *   type: 'request',
 *   data: {
 *     request: { method: 'GET', path: '/api/users' },
 *     response: responseBuilder,
 *     params: { id: '123' },
 *   },
 *   target: null,  // ✅ Can be any object or null
 *   // nativeEvent: event,  // ❌ TypeScript error - not available
 * };
 */
export interface ServerEventPayload extends EventSourcePayload<'node'> {
  /**
   * HTTP request/response data
   */
  data: {
    /** Incoming HTTP request */
    request: ServerRequest;

    /** Response builder */
    response: ServerResponse;

    /** Route parameters extracted from URL pattern */
    params?: Record<string, string>;

    /** Additional context data */
    [key: string]: unknown;
  };

  /**
   * Generic context object (not a DOM Element)
   */
  target?: object | null;

  /**
   * Native events don't exist in Node.js
   * This field is never and will cause TypeScript error if accessed
   */
  nativeEvent?: never;
}

/**
 * Server-specific event handler
 *
 * Handler function that receives ServerEventPayload.
 * Guarantees HTTP request/response APIs are available.
 *
 * @example
 * const handler: ServerEventHandler = (payload, context) => {
 *   const { request, response } = payload.data;
 *
 *   response
 *     .status(200)
 *     .header('Content-Type', 'application/json')
 *     .json({ success: true });
 *
 *   // ❌ TypeScript error - nativeEvent not available
 *   // payload.nativeEvent.preventDefault();
 * };
 */
export type ServerEventHandler = EventSourceHandler<'node'>;

/**
 * Server event source interface
 *
 * Event source for HTTP requests, WebSocket connections, etc.
 *
 * @example
 * const requestSource: ServerEventSource = {
 *   name: 'request',
 *   description: 'HTTP request handler',
 *
 *   subscribe(options, context) {
 *     const handler = (req: ServerRequest, res: ServerResponse) => {
 *       const payload: ServerEventPayload = {
 *         type: options.event,
 *         data: { request: req, response: res },
 *         target: null,
 *       };
 *       options.handler(payload, context);
 *     };
 *
 *     // Register with HTTP framework
 *     app.use(handler);
 *
 *     return {
 *       id: 'request_1',
 *       source: 'request',
 *       event: options.event,
 *       unsubscribe: () => {
 *         // Cleanup
 *       },
 *     };
 *   },
 * };
 */
export interface ServerEventSource extends Omit<EventSource, 'subscribe'> {
  /**
   * Subscribe to server events
   *
   * @param options Subscription options with server-specific handler
   * @param context Execution context
   * @returns Subscription for cleanup
   */
  subscribe(
    options: {
      event: string;
      handler: ServerEventHandler;
      target?: string | RegExp;
      options?: Record<string, unknown>;
    },
    context: ExecutionContext
  ): EventSourceSubscription;
}

/**
 * Type guard to check if a payload is a server event payload
 *
 * Narrows the type from EventSourcePayload to ServerEventPayload.
 * Useful for universal code that needs to branch based on environment.
 *
 * @param payload Event source payload of any environment
 * @returns true if payload is from server environment
 *
 * @example
 * function handleEvent(payload: EventSourcePayload) {
 *   if (isServerPayload(payload)) {
 *     // ✅ Type is narrowed to ServerEventPayload
 *     const { request, response } = payload.data;
 *     response.status(200).json({ ok: true });
 *   }
 * }
 */
export function isServerPayload(payload: EventSourcePayload): payload is ServerEventPayload {
  return (
    typeof payload.data === 'object' &&
    payload.data !== null &&
    'request' in payload.data &&
    'response' in payload.data
  );
}

/**
 * Type guard to check if an event source is a server event source
 *
 * Narrows the type from EventSource to ServerEventSource.
 *
 * @param source Event source of any type
 * @returns true if source is for server environment
 *
 * @example
 * function registerSource(source: EventSource) {
 *   if (isServerEventSource(source)) {
 *     // ✅ Type is narrowed to ServerEventSource
 *     source.subscribe({ event: 'GET', handler: serverHandler }, context);
 *   }
 * }
 */
export function isServerEventSource(_source: EventSource): boolean {
  // Note: This only checks the runtime environment, not the source type itself.
  // ServerEventSource has a different subscribe signature than EventSource,
  // so we can't use a type predicate here. Cast manually if needed.
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}

/**
 * Assert that code is running in server environment
 *
 * Throws an error if not in Node.js environment.
 * Useful for server-only functions.
 *
 * @throws {Error} if not in server environment
 *
 * @example
 * function handleHTTPRequest(payload: ServerEventPayload) {
 *   assertServerEnvironment();
 *   const { request, response } = payload.data;
 *   response.json({ ok: true });
 * }
 */
export function assertServerEnvironment(): asserts this is { process: NodeJS.Process } {
  if (!isServerEventSource({} as EventSource)) {
    throw new Error(
      'This function requires a Node.js server environment. ' +
        'DOM APIs (Element, Event) are not available.'
    );
  }
}
