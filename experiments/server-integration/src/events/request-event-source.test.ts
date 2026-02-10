/**
 * Tests for Request Event Source
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRequestEventSource,
  expressRequestToServerRequest,
  wrapExpressResponse,
  type ServerRequest,
  type ServerResponse,
  type HttpMethod,
} from './request-event-source.js';
import type { ExecutionContext } from '@hyperfixi/core';

describe('Request Event Source', () => {
  let source: ReturnType<typeof createRequestEventSource>;

  beforeEach(() => {
    source = createRequestEventSource();
  });

  describe('Basic functionality', () => {
    it('should create a request event source', () => {
      expect(source.name).toBe('request');
      expect(source.description).toBeDefined();
      expect(source.supportedEvents).toContain('GET');
      expect(source.supportedEvents).toContain('POST');
    });

    it('should support common HTTP methods', () => {
      expect(source.supports('GET')).toBe(true);
      expect(source.supports('POST')).toBe(true);
      expect(source.supports('PUT')).toBe(true);
      expect(source.supports('DELETE')).toBe(true);
      expect(source.supports('PATCH')).toBe(true);
      expect(source.supports('*')).toBe(true);
    });

    it('should not support invalid events', () => {
      expect(source.supports('INVALID')).toBe(false);
      expect(source.supports('click')).toBe(false);
    });
  });

  describe('Handler registration', () => {
    it('should register a GET handler', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      const subscription = source.subscribe(
        {
          event: 'GET',
          target: '/api/users',
          handler,
        },
        mockContext
      );

      expect(subscription.id).toBeDefined();
      expect(subscription.source).toBe('request');
      expect(subscription.event).toBe('GET');
      expect(subscription.unsubscribe).toBeInstanceOf(Function);
    });

    it('should register multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      const sub1 = source.subscribe(
        { event: 'GET', target: '/api/users', handler: handler1 },
        mockContext
      );
      const sub2 = source.subscribe(
        { event: 'POST', target: '/api/users', handler: handler2 },
        mockContext
      );

      expect(source.getHandlers()).toHaveLength(2);
      expect(sub1.id).not.toBe(sub2.id);
    });

    it('should unsubscribe a handler', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      const subscription = source.subscribe(
        { event: 'GET', target: '/api/users', handler },
        mockContext
      );
      expect(source.getHandlers()).toHaveLength(1);

      subscription.unsubscribe();
      expect(source.getHandlers()).toHaveLength(0);
    });

    it('should clear all handlers', () => {
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users', handler: vi.fn() }, mockContext);
      source.subscribe({ event: 'POST', target: '/api/users', handler: vi.fn() }, mockContext);
      expect(source.getHandlers()).toHaveLength(2);

      source.clearHandlers();
      expect(source.getHandlers()).toHaveLength(0);
    });
  });

  describe('Request handling', () => {
    it('should match and handle exact path', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users', handler }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/users',
        path: '/api/users',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should match parametrized paths', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users/:id', handler }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/users/123',
        path: '/api/users/123',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledOnce();

      // Check that params were extracted
      const callArgs = handler.mock.calls[0];
      const payload = callArgs[0];
      expect(payload.data.params).toHaveProperty('id', '123');
    });

    it('should match wildcard paths', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: '*', target: '*', handler }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/any/path',
        path: '/any/path',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should not match wrong HTTP method', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users', handler }, mockContext);

      const request: ServerRequest = {
        method: 'POST',
        url: '/api/users',
        path: '/api/users',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should not match wrong path', () => {
      const handler = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users', handler }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/posts',
        path: '/api/posts',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should match highest priority handler first', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      // Register wildcard handler first (lower priority)
      source.subscribe({ event: '*', target: '*', handler: handler1 }, mockContext);

      // Register specific handler (higher priority)
      source.subscribe({ event: 'GET', target: '/api/users', handler: handler2 }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/users',
        path: '/api/users',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      expect(handled).toBe(true);
      // Specific handler should be called, not wildcard
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler1).not.toHaveBeenCalled();
    });
  });

  describe('Context creation', () => {
    it('should create execution context with request data', () => {
      let capturedContext: ExecutionContext | null = null;

      const handler = vi.fn((payload, context) => {
        capturedContext = context;
      });

      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users/:id', handler }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/users/123?sort=name',
        path: '/api/users/123',
        query: { sort: 'name' },
        params: {},
        headers: { 'content-type': 'application/json' },
        body: null,
      };

      const response = createMockResponse();
      source.handleRequest(request, response);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.locals.get('request')).toEqual(request);
      expect(capturedContext!.locals.get('response')).toEqual(response);
      expect(capturedContext!.locals.get('method')).toBe('GET');
      expect(capturedContext!.locals.get('path')).toBe('/api/users/123');
      expect(capturedContext!.locals.get('query')).toEqual({ sort: 'name' });
      expect(capturedContext!.locals.get('params')).toHaveProperty('id', '123');
    });
  });

  describe('Error handling', () => {
    it('should continue to next handler on error', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler error');
      });
      const handler2 = vi.fn();

      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      // Both handlers match the same path
      source.subscribe({ event: 'GET', target: '/api/users', handler: handler1 }, mockContext);
      source.subscribe({ event: 'GET', target: '*', handler: handler2 }, mockContext);

      const request: ServerRequest = {
        method: 'GET',
        url: '/api/users',
        path: '/api/users',
        query: {},
        params: {},
        headers: {},
        body: null,
      };

      const response = createMockResponse();
      const handled = source.handleRequest(request, response);

      // First handler threw, so second handler SHOULD be called (fault tolerance)
      // This provides graceful degradation if a handler has an error
      expect(handled).toBe(true);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Destroy', () => {
    it('should clear all handlers on destroy', () => {
      const mockContext: ExecutionContext = {
        me: null,
        you: null,
        it: null,
        event: null,
        locals: new Map(),
        globals: new Map(),
        result: undefined,
      };

      source.subscribe({ event: 'GET', target: '/api/users', handler: vi.fn() }, mockContext);
      source.subscribe({ event: 'POST', target: '/api/users', handler: vi.fn() }, mockContext);
      expect(source.getHandlers()).toHaveLength(2);

      source.destroy();
      expect(source.getHandlers()).toHaveLength(0);
    });
  });
});

// Helper to create a mock response object
function createMockResponse(): ServerResponse {
  return {
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    json: vi.fn(),
    html: vi.fn(),
    text: vi.fn(),
    redirect: vi.fn(),
    send: vi.fn(),
  };
}
