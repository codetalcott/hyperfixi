/**
 * Fetch Command Unit Tests
 *
 * Comprehensive tests for FetchCommand implementation:
 * - URL parsing and validation
 * - Response type handling (text, json, html, blob, arrayBuffer)
 * - Request options (method, headers, body, credentials)
 * - Lifecycle events (beforeRequest, afterResponse, afterRequest, error)
 * - Error handling and timeouts
 * - Abort signal support
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FetchCommand, createFetchCommand, type FetchCommandInput } from './fetch';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode, ExpressionNode } from '../../types/base-types';

// =============================================================================
// Test Setup & Mocks
// =============================================================================

// Mock globals
const originalFetch = global.fetch;
const originalAbortController = global.AbortController;

// Mock fetch response helper
function createMockResponse(data: any, options: Partial<Response> = {}): Response {
  const defaultOptions = {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    url: 'https://example.com',
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return {
    ...mergedOptions,
    ok: mergedOptions.status >= 200 && mergedOptions.status < 300,
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    json: () => Promise.resolve(typeof data === 'string' ? JSON.parse(data) : data),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    clone: function () {
      return this;
    },
  } as unknown as Response;
}

// Mock context helper
function createMockContext(element: HTMLElement | null = null): TypedExecutionContext {
  const listeners = new Map<string, Array<(...args: any[]) => void>>();

  const mockElement =
    element ||
    ({
      addEventListener: (event: string, handler: any, options?: any) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(handler);
      },
      removeEventListener: (event: string, handler: any) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(handler);
          if (index > -1) eventListeners.splice(index, 1);
        }
      },
      dispatchEvent: (event: Event) => {
        const eventListeners = listeners.get(event.type);
        if (eventListeners) {
          eventListeners.forEach(handler => handler(event));
        }
        return true;
      },
    } as unknown as HTMLElement);

  return {
    me: mockElement,
    you: null,
    locals: new Map(),
    globals: new Map(),
    result: undefined,
    halted: false,
    it: undefined,
  };
}

// Mock evaluator helper
function createMockEvaluator(urlValue: any = ''): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async (node: ASTNode) => {
      // If the node has a 'name' property, return it (for response type nodes like 'json', 'html', etc.)
      if ('name' in node && typeof node.name === 'string') {
        return node.name;
      }
      // Otherwise return the URL value
      return urlValue;
    }),
  } as unknown as ExpressionEvaluator;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('FetchCommand', () => {
  let command: FetchCommand;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    command = new FetchCommand();

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof global.fetch;

    // Mock AbortController
    global.AbortController = class {
      signal = {};
      abort = vi.fn();
    } as any;

    // Don't mock DOMParser - let happy-dom provide its implementation
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.AbortController = originalAbortController;
    vi.clearAllMocks();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createFetchCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('URL Parsing', () => {
    it('should parse simple string URL', async () => {
      const evaluator = createMockEvaluator('https://api.example.com/data');
      const urlNode = { type: 'string', value: 'https://api.example.com/data' } as ASTNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.url).toBe('https://api.example.com/data');
    });

    it('should throw error if URL is empty', async () => {
      const evaluator = createMockEvaluator('');
      const urlNode = { type: 'string', value: '' } as ASTNode;
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [urlNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('URL must be a non-empty string');
    });

    it('should throw error if URL is not a string', async () => {
      const evaluator = createMockEvaluator(123);
      const urlNode = { type: 'number', value: 123 } as ASTNode;
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [urlNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('URL must be a non-empty string');
    });

    it('should throw error if no URL provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('fetch requires a URL');
    });

    it('should handle relative URLs', async () => {
      const evaluator = createMockEvaluator('/api/users');
      const urlNode = { type: 'string', value: '/api/users' } as ASTNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.url).toBe('/api/users');
    });
  });

  describe('Response Type Parsing', () => {
    it('should default to text response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.responseType).toBe('text');
    });

    it('should parse "json" response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'json' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('json');
    });

    it('should parse "html" response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'html' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('html');
    });

    it('should parse "blob" response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'blob' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('blob');
    });

    it('should parse "arrayBuffer" response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'arraybuffer' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('arrayBuffer');
    });

    it('should parse "response" response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'response' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('response');
    });

    it('should throw error for invalid response type', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'invalid' } as ExpressionNode;
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [urlNode], modifiers: { as: asNode } }, evaluator, context)
      ).rejects.toThrow('invalid response type');
    });

    it('should be case-insensitive for response types', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'JSON' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('json');
    });

    it('should parse "Object" as json alias (_hyperscript compatibility)', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'Object' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('json');
    });

    it('should parse "object" (lowercase) as json alias', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const asNode = { type: 'expression', name: 'object' } as ExpressionNode;
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        evaluator,
        context
      );

      expect(input.responseType).toBe('json');
    });
  });

  describe('Request Options Parsing', () => {
    it('should parse method option', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      // Mock with options
      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return { method: 'post' };
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { with: withNode } },
        optionsEvaluator,
        context
      );

      expect(input.options.method).toBe('POST');
    });

    it('should parse headers option', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return { headers: { 'Content-Type': 'application/json' } };
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { with: withNode } },
        optionsEvaluator,
        context
      );

      expect(input.options.headers).toBeInstanceOf(Headers);
      expect((input.options.headers as Headers).get('Content-Type')).toBe('application/json');
    });

    it('should parse body option as string', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return { body: 'test data' };
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { with: withNode } },
        optionsEvaluator,
        context
      );

      expect(input.options.body).toBe('test data');
    });

    it('should parse body option as JSON object', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return { body: { key: 'value' } };
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { with: withNode } },
        optionsEvaluator,
        context
      );

      expect(input.options.body).toBe('{"key":"value"}');
    });

    it('should handle credentials option', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return { credentials: 'include' };
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [urlNode], modifiers: { with: withNode } },
        optionsEvaluator,
        context
      );

      expect(input.options.credentials).toBe('include');
    });

    it('should throw error if with modifier is not an object', async () => {
      const evaluator = createMockEvaluator('https://example.com');
      const urlNode = { type: 'string' } as ASTNode;
      const context = createMockContext();

      const optionsEvaluator = {
        evaluate: vi.fn(async (node: any) => {
          if (node.type === 'string') return 'https://example.com';
          return 'invalid';
        }),
      } as unknown as ExpressionEvaluator;

      const withNode = { type: 'expression' } as ExpressionNode;

      await expect(
        command.parseInput(
          { args: [urlNode], modifiers: { with: withNode } },
          optionsEvaluator,
          context
        )
      ).rejects.toThrow('"with" options must be an object');
    });
  });

  describe('Execution - Response Handling', () => {
    it('should fetch and return text by default', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('Hello World');
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(result.data).toBe('Hello World');
      expect(result.status).toBe(200);
      expect(context.it).toBe('Hello World');
    });

    it('should fetch and parse JSON', async () => {
      const input: FetchCommandInput = {
        url: 'https://api.example.com/data',
        responseType: 'json',
        options: {},
      };

      const jsonData = { name: 'Test', value: 123 };
      const mockResponse = createMockResponse(jsonData);
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.data).toEqual(jsonData);
      expect(context.it).toEqual(jsonData);
    });

    it('should fetch and parse HTML', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/page',
        responseType: 'html',
        options: {},
      };

      const htmlString = '<div>Test</div>';
      const mockResponse = createMockResponse(htmlString);
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.data).toBeDefined();
    });

    it('should fetch and return blob', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/image.png',
        responseType: 'blob',
        options: {},
      };

      const mockResponse = createMockResponse('binary data');
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should fetch and return arrayBuffer', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/data.bin',
        responseType: 'arrayBuffer',
        options: {},
      };

      const mockResponse = createMockResponse('binary');
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should return raw response object', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'response',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.data).toBe(mockResponse);
    });
  });

  // Upstream _hyperscript 0.9.90: `fetch` throws on non-2xx by default.
  // Opt out with `do not throw` or by asking for the raw `Response`.
  describe('Throw-on-non-2xx (upstream 0.9.90)', () => {
    it('should throw on 500 when throwOnError is true', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/api',
        responseType: 'json',
        options: {},
        throwOnError: true,
      };

      const mockResponse = createMockResponse(
        { error: 'boom' },
        {
          status: 500,
          statusText: 'Internal Server Error',
        }
      );
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      await expect(command.execute(input, context)).rejects.toThrow(/HTTP 500/);
    });

    it('should throw on 404 when throwOnError is true', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/missing',
        responseType: 'text',
        options: {},
        throwOnError: true,
      };

      const mockResponse = createMockResponse('not found', {
        status: 404,
        statusText: 'Not Found',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      await expect(command.execute(input, context)).rejects.toThrow(/HTTP 404/);
    });

    it('should NOT throw on 200 when throwOnError is true', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/ok',
        responseType: 'json',
        options: {},
        throwOnError: true,
      };

      const mockResponse = createMockResponse({ ok: true });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);
      expect(result.data).toEqual({ ok: true });
    });

    it('should NOT throw on 500 when throwOnError is false (do not throw)', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/api',
        responseType: 'json',
        options: {},
        throwOnError: false,
      };

      const mockResponse = createMockResponse(
        { error: 'boom' },
        {
          status: 500,
          statusText: 'Internal Server Error',
        }
      );
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);
      expect(result.status).toBe(500);
      expect(result.data).toEqual({ error: 'boom' });
    });

    it('should attach the Response to the thrown error', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com/api',
        responseType: 'json',
        options: {},
        throwOnError: true,
      };

      const mockResponse = createMockResponse(null, { status: 503, statusText: 'Unavailable' });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      try {
        await command.execute(input, context);
        expect.fail('expected throw');
      } catch (e) {
        const err = e as Error & { response?: Response };
        expect(err.response).toBe(mockResponse);
      }
    });
  });

  // Upstream _hyperscript 0.9.90: `parseInput` wires `throwOnError` from the
  // `doNotThrow` modifier and the response type.
  describe('parseInput wiring for throwOnError', () => {
    it('should set throwOnError=true by default', async () => {
      const urlNode = { type: 'literal', value: 'https://example.com' } as unknown as ASTNode;
      const input = await command.parseInput(
        { args: [urlNode], modifiers: {} },
        createMockEvaluator('https://example.com'),
        createMockContext()
      );
      expect(input.throwOnError).toBe(true);
    });

    it('should set throwOnError=false when doNotThrow modifier is present', async () => {
      const urlNode = { type: 'literal', value: 'https://example.com' } as unknown as ASTNode;
      const doNotThrowNode = { type: 'literal', value: true } as unknown as ExpressionNode;
      const input = await command.parseInput(
        { args: [urlNode], modifiers: { doNotThrow: doNotThrowNode } },
        createMockEvaluator('https://example.com'),
        createMockContext()
      );
      expect(input.throwOnError).toBe(false);
    });

    it('should set throwOnError=false when `as Response` escape is used', async () => {
      const urlNode = { type: 'literal', value: 'https://example.com' } as unknown as ASTNode;
      const asNode = { type: 'identifier', name: 'response' } as unknown as ExpressionNode;
      const input = await command.parseInput(
        { args: [urlNode], modifiers: { as: asNode } },
        createMockEvaluator('https://example.com'),
        createMockContext()
      );
      expect(input.responseType).toBe('response');
      expect(input.throwOnError).toBe(false);
    });
  });

  describe('Lifecycle Events', () => {
    it('should dispatch fetch:beforeRequest event', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const element = document.createElement('div');
      const context = createMockContext(element);

      let beforeRequestFired = false;
      element.addEventListener('fetch:beforeRequest', () => {
        beforeRequestFired = true;
      });

      await command.execute(input, context);

      expect(beforeRequestFired).toBe(true);
    });

    it('should dispatch fetch:afterResponse event', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const element = document.createElement('div');
      const context = createMockContext(element);

      let afterResponseFired = false;
      element.addEventListener('fetch:afterResponse', () => {
        afterResponseFired = true;
      });

      await command.execute(input, context);

      expect(afterResponseFired).toBe(true);
    });

    it('should dispatch fetch:afterRequest event on success', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const element = document.createElement('div');
      const context = createMockContext(element);

      let afterRequestFired = false;
      element.addEventListener('fetch:afterRequest', () => {
        afterRequestFired = true;
      });

      await command.execute(input, context);

      expect(afterRequestFired).toBe(true);
    });

    it('should dispatch fetch:error event on failure', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      const element = document.createElement('div');
      const context = createMockContext(element);

      let errorEventFired = false;
      let errorDetail: any;
      element.addEventListener('fetch:error', (e: any) => {
        errorEventFired = true;
        errorDetail = e.detail;
      });

      await expect(command.execute(input, context)).rejects.toThrow();
      expect(errorEventFired).toBe(true);
      expect(errorDetail.reason).toContain('Network error');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on network failure', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      const context = createMockContext();

      await expect(command.execute(input, context)).rejects.toThrow('Fetch failed');
    });

    it('should handle abort errors specially', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const context = createMockContext();

      await expect(command.execute(input, context)).rejects.toThrow('Fetch aborted');
    });

    it('should clean up abort listener on completion', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const element = document.createElement('div');
      const context = createMockContext(element);

      const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

      await command.execute(input, context);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('fetch:abort', expect.any(Function));
    });
  });

  describe('Result Structure', () => {
    it('should include status and statusText', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data', {
        status: 201,
        statusText: 'Created',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.status).toBe(201);
      expect(result.statusText).toBe('Created');
    });

    it('should include response headers', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      const mockResponse = createMockResponse('data', { headers });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.headers).toBeInstanceOf(Headers);
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include response URL', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data', {
        url: 'https://example.com/redirected',
      });
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(result.url).toBe('https://example.com/redirected');
    });

    it('should include duration', async () => {
      const input: FetchCommandInput = {
        url: 'https://example.com',
        responseType: 'text',
        options: {},
      };

      const mockResponse = createMockResponse('data');
      mockFetch.mockResolvedValue(mockResponse);

      const context = createMockContext();
      const result = await command.execute(input, context);

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
