/**
 * Fetch Command Tests
 * Comprehensive tests for HTTP requests and lifecycle events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { FetchCommand } from './fetch';
import type { TypedExecutionContext } from '../../types/command-types';

// Mock global fetch
global.fetch = vi.fn();

describe('Fetch Command', () => {
  let fetchCommand: FetchCommand;
  let context: TypedExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    fetchCommand = new FetchCommand();
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      locals: new Map(),
      result: undefined,
      globals: new Map(),
      variables: new Map(),
      it: undefined,
      you: undefined,
      event: undefined,
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'permissive' as const,
      evaluationHistory: [],
    } as TypedExecutionContext;

    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(fetchCommand.name).toBe('fetch');
      expect(typeof fetchCommand.syntax).toBe('string');
      expect(typeof fetchCommand.description).toBe('string');
      expect(fetchCommand.metadata.category).toBe('Communication');
    });

    it('should have comprehensive examples', () => {
      expect(fetchCommand.metadata.examples).toHaveLength(5);
      expect(fetchCommand.metadata.examples[0].code).toBe('fetch /api/data');
    });

    it('should have LLM documentation', () => {
      expect(fetchCommand.documentation.summary).toBeTruthy();
      expect(fetchCommand.documentation.parameters.length).toBeGreaterThan(0);
    });
  });

  describe('Basic Fetch', () => {
    it('should fetch data as text by default', async () => {
      const mockResponse = new Response('Hello World', {
        status: 200,
        statusText: 'OK',
      });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/data' };
      const result = await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          sender: testElement,
          signal: expect.any(AbortSignal),
        })
      );
      expect(result.success).toBe(true);
      expect(result.value.status).toBe(200);
      expect(result.value.data).toBe('Hello World');
    });

    it('should handle JSON response type', async () => {
      const mockData = { name: 'John', age: 30 };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
      });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/user', responseType: 'json' as const };
      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(true);
      expect(result.value.data).toEqual(mockData);
    });

    it('should handle HTML response type', async () => {
      const mockHTML = '<div id="test">Content</div>';
      const mockResponse = new Response(mockHTML, { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/page', responseType: 'html' as const };
      const result = await fetchCommand.execute(context, input);

      expect(result.value.data).toBeInstanceOf(HTMLElement);
      expect((result.value.data as HTMLElement).id).toBe('test');
    });

    it('should handle response type for raw response', async () => {
      const mockResponse = new Response('data', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/raw', responseType: 'response' as const };
      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(true);
      expect(result.value.data).toBeInstanceOf(Response);
    });
  });

  describe('HTTP Methods', () => {
    it('should handle POST request', async () => {
      const mockResponse = new Response('{"success":true}', { status: 201 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: '/api/save',
        responseType: 'json' as const,
        options: {
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        },
      };

      const result = await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/save',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.value.status).toBe(201);
    });

    it('should handle PUT request', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: '/api/update/1',
        options: { method: 'PUT' },
      };

      await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/update/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should handle DELETE request', async () => {
      const mockResponse = new Response('', { status: 204 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: '/api/delete/1',
        options: { method: 'DELETE' },
      };

      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(true);
      expect(result.value.status).toBe(204);
    });
  });

  describe('Headers and Options', () => {
    it('should send custom headers', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: '/api/protected',
        options: {
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom': 'value',
          },
        },
      };

      await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/protected',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom': 'value',
          },
        })
      );
    });

    it('should support all fetch options', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: '/api/data',
        options: {
          method: 'GET',
          mode: 'cors' as RequestMode,
          credentials: 'include' as RequestCredentials,
          cache: 'no-cache' as RequestCache,
        },
      };

      await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          mode: 'cors',
          credentials: 'include',
          cache: 'no-cache',
        })
      );
    });
  });

  describe('Lifecycle Events', () => {
    it('should fire beforeRequest event', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      let eventFired = false;
      testElement.addEventListener('fetch:beforeRequest', (e: any) => {
        eventFired = true;
        expect(e.detail.sender).toBe(testElement);
        expect(e.detail.headers).toBeDefined();
      });

      const input = { url: '/api/data' };
      await fetchCommand.execute(context, input);

      expect(eventFired).toBe(true);
    });

    it('should fire legacy hyperscript:beforeFetch event', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      let eventFired = false;
      testElement.addEventListener('hyperscript:beforeFetch', () => {
        eventFired = true;
      });

      const input = { url: '/api/data' };
      await fetchCommand.execute(context, input);

      expect(eventFired).toBe(true);
    });

    it('should fire afterResponse event', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      let eventFired = false;
      testElement.addEventListener('fetch:afterResponse', (e: any) => {
        eventFired = true;
        expect(e.detail.response).toBeInstanceOf(Response);
      });

      const input = { url: '/api/data' };
      await fetchCommand.execute(context, input);

      expect(eventFired).toBe(true);
    });

    it('should fire afterRequest event with result', async () => {
      const mockResponse = new Response('Success', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      let eventFired = false;
      testElement.addEventListener('fetch:afterRequest', (e: any) => {
        eventFired = true;
        expect(e.detail.result).toBe('Success');
      });

      const input = { url: '/api/data' };
      await fetchCommand.execute(context, input);

      expect(eventFired).toBe(true);
    });

    it('should fire error event on failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      let eventFired = false;
      testElement.addEventListener('fetch:error', (e: any) => {
        eventFired = true;
        expect(e.detail.reason).toContain('Network error');
      });

      const input = { url: '/api/fail' };

      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
      expect(eventFired).toBe(true);
    });

    it('should allow headers modification in beforeRequest event', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      testElement.addEventListener('fetch:beforeRequest', (e: any) => {
        e.detail.headers['X-Auth-Token'] = 'secret123';
      });

      const input = { url: '/api/protected' };
      await fetchCommand.execute(context, input);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': 'secret123',
          }),
        })
      );
    });
  });

  describe('Abort and Timeout', () => {
    it('should support abort via fetch:abort event', async () => {
      let abortCalled = false;
      (global.fetch as any).mockImplementationOnce((_url: string, options: any) => {
        // Simulate abort
        options.signal.addEventListener('abort', () => {
          abortCalled = true;
        });

        // Fire abort event
        testElement.dispatchEvent(new CustomEvent('fetch:abort'));

        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      });

      const input = { url: '/api/slow' };

      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(false);
      expect(abortCalled).toBe(true);
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockImplementationOnce((_url: string, options: any) => {
        return new Promise(resolve => {
          options.signal.addEventListener('abort', () => {
            resolve(new Response('Aborted', { status: 0 }));
          });

          // Simulate long request
          setTimeout(() => resolve(new Response('OK')), 10000);
        });
      });

      const input = {
        url: '/api/slow',
        options: { timeout: 100 },
      };

      const promise = fetchCommand.execute(context, input);

      // Fast-forward time
      vi.advanceTimersByTime(100);

      await promise;

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should return descriptive error on fetch failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const input = { url: '/api/fail' };

      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Fetch failed for /api/fail: Network timeout');
    });

    it('should handle JSON parse errors', async () => {
      const mockResponse = new Response('not json', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/data', responseType: 'json' as const };

      const result = await fetchCommand.execute(context, input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      const mockResponse = new Response('', { status: 204 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/delete' };
      const result = await fetchCommand.execute(context, input);

      expect(result.value.data).toBe('');
      expect(result.success).toBe(true);
      expect(result.value.status).toBe(204);
    });

    it('should handle HTML with multiple elements', async () => {
      const mockHTML = '<div>One</div><div>Two</div><div>Three</div>';
      const mockResponse = new Response(mockHTML, { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/page', responseType: 'html' as const };
      const result = await fetchCommand.execute(context, input);

      expect(result.value.data).toBeInstanceOf(DocumentFragment);
    });

    it('should clean up abort listener', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const input = { url: '/api/data' };
      await fetchCommand.execute(context, input);

      // Dispatch abort after fetch completes - should not cause issues
      testElement.dispatchEvent(new CustomEvent('fetch:abort'));

      // If cleanup didn't work, this might cause problems
      expect(true).toBe(true); // Just checking no errors thrown
    });

    it('should report accurate duration', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(new Response('OK', { status: 200 }));
          }, 100);
        });
      });

      const input = { url: '/api/data' };
      const promise = fetchCommand.execute(context, input);

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.duration).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });

    it('should handle fetch without context.me', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const contextWithoutMe = {
        locals: new Map(),
        result: undefined,
        globals: new Map(),
        variables: new Map(),
        it: undefined,
        you: undefined,
        event: undefined,
        expressionStack: [],
        evaluationDepth: 0,
        validationMode: 'permissive' as const,
        evaluationHistory: [],
      } as TypedExecutionContext;

      const input = { url: '/api/data' };
      const result = await fetchCommand.execute(contextWithoutMe, input);

      expect(result.success).toBe(true);
      expect(result.value.status).toBe(200);
      // Events won't fire, but fetch should still work
    });
  });
});
