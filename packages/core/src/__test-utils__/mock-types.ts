/**
 * Type-safe mock utilities for testing
 * Provides properly typed mock objects to replace 'as any' casts
 */

/**
 * Generic mock function with call tracking
 */
export interface MockFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  calls: TArgs[];
  lastCall?: TArgs;
  returnValue?: TReturn;
  callCount: number;
}

/**
 * Create a mock function with call tracking
 */
export function createMockFunction<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  implementation?: (...args: TArgs) => TReturn
): MockFunction<TArgs, TReturn> {
  const calls: TArgs[] = [];
  let returnValue: TReturn | undefined;

  const fn = ((...args: TArgs) => {
    calls.push(args);
    const result = implementation ? implementation(...args) : returnValue;
    return result as TReturn;
  }) as MockFunction<TArgs, TReturn>;

  fn.calls = calls;
  Object.defineProperty(fn, 'lastCall', {
    get() {
      return calls[calls.length - 1];
    },
  });
  Object.defineProperty(fn, 'callCount', {
    get() {
      return calls.length;
    },
  });
  fn.returnValue = returnValue;

  return fn;
}

/**
 * Mock WebSocket API for testing
 */
export interface MockWebSocketAPI {
  postMessage<T extends Record<string, unknown> = Record<string, unknown>>(
    data: T,
    transferables?: Transferable[]
  ): void;
  addEventListener(event: string, handler: EventListener): void;
  removeEventListener(event: string, handler: EventListener): void;
  close(): void;
  readyState: number;
  url: string;
}

/**
 * Create a mock WebSocket
 */
export function createMockWebSocket(url = 'ws://localhost:8080'): MockWebSocketAPI {
  const listeners = new Map<string, EventListener[]>();

  return {
    postMessage<T extends Record<string, unknown>>(data: T, _transferables?: Transferable[]): void {
      const handlers = listeners.get('message') || [];
      handlers.forEach(handler => {
        handler(new MessageEvent('message', { data }));
      });
    },
    addEventListener(event: string, handler: EventListener): void {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(handler);
    },
    removeEventListener(event: string, handler: EventListener): void {
      const handlers = listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    },
    close(): void {
      const handlers = listeners.get('close') || [];
      handlers.forEach(handler => {
        handler(new Event('close'));
      });
    },
    readyState: 1, // OPEN
    url,
  };
}

/**
 * Mock EventSource API for testing
 */
export interface MockEventSourceAPI {
  simulateMessage<T = string>(
    data: T,
    eventType?: 'message' | 'open' | 'error',
    lastEventId?: string
  ): void;
  addEventListener(event: string, handler: EventListener): void;
  removeEventListener(event: string, handler: EventListener): void;
  close(): void;
  readyState: number;
  url: string;
}

/**
 * Create a mock EventSource
 */
export function createMockEventSource(url = '/events'): MockEventSourceAPI {
  const listeners = new Map<string, EventListener[]>();

  return {
    simulateMessage<T>(
      data: T,
      eventType: 'message' | 'open' | 'error' = 'message',
      lastEventId?: string
    ): void {
      const handlers = listeners.get(eventType) || [];
      handlers.forEach(handler => {
        if (eventType === 'message') {
          handler(new MessageEvent('message', { data, lastEventId }));
        } else {
          handler(new Event(eventType));
        }
      });
    },
    addEventListener(event: string, handler: EventListener): void {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(handler);
    },
    removeEventListener(event: string, handler: EventListener): void {
      const handlers = listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    },
    close(): void {
      const handlers = listeners.get('close') || [];
      handlers.forEach(handler => {
        handler(new Event('close'));
      });
    },
    readyState: 1, // OPEN
    url,
  };
}

/**
 * Mock Worker API for testing
 */
export interface MockWorkerAPI {
  postMessage<T = unknown>(message: T, transfer?: Transferable[]): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/**
 * Create a mock Worker
 */
export function createMockWorker(): MockWorkerAPI {
  const listeners = new Map<string, EventListener[]>();

  return {
    postMessage<T>(message: T, _transfer?: Transferable[]): void {
      const handlers = listeners.get('message') || [];
      handlers.forEach(handler => {
        handler(new MessageEvent('message', { data: message }));
      });
    },
    addEventListener(type: string, listener: EventListener): void {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type)!.push(listener);
    },
    removeEventListener(type: string, listener: EventListener): void {
      const handlers = listeners.get(type);
      if (handlers) {
        const index = handlers.indexOf(listener);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    },
    terminate(): void {
      listeners.clear();
    },
    onmessage: null,
    onerror: null,
  };
}

/**
 * Mock Express Response for testing
 */
export interface MockExpressResponse<T = unknown> {
  json(data: T): this;
  send(data: T): this;
  status(code: number): this;
  header(name: string, value: string): this;
  contentType(type: string): this;
  getStatusCode(): number;
  getData(): T | undefined;
  getHeaders(): Record<string, string>;
}

/**
 * Create a mock Express response
 */
export function createMockExpressResponse<T = unknown>(): MockExpressResponse<T> {
  let statusCode = 200;
  let data: T | undefined;
  const headers: Record<string, string> = {};

  const response: MockExpressResponse<T> = {
    json(newData: T): MockExpressResponse<T> {
      data = newData;
      headers['Content-Type'] = 'application/json';
      return response;
    },
    send(newData: T): MockExpressResponse<T> {
      data = newData;
      return response;
    },
    status(code: number): MockExpressResponse<T> {
      statusCode = code;
      return response;
    },
    header(name: string, value: string): MockExpressResponse<T> {
      headers[name] = value;
      return response;
    },
    contentType(type: string): MockExpressResponse<T> {
      headers['Content-Type'] = type;
      return response;
    },
    getStatusCode(): number {
      return statusCode;
    },
    getData(): T | undefined {
      return data;
    },
    getHeaders(): Record<string, string> {
      return { ...headers };
    },
  };

  return response;
}

/**
 * Mock Express Request for testing
 */
export interface MockExpressRequest<T = unknown> {
  method: string;
  url: string;
  body: T;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  get(header: string): string | undefined;
}

/**
 * Create a mock Express request
 */
export function createMockExpressRequest<T = unknown>(
  options: Partial<MockExpressRequest<T>> = {}
): MockExpressRequest<T> {
  const request: MockExpressRequest<T> = {
    method: options.method || 'GET',
    url: options.url || '/',
    body: options.body as T,
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    get(header: string): string | undefined {
      return request.headers[header.toLowerCase()];
    },
  };

  return request;
}
