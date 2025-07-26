/**
 * Test suite for Fetch Command with Event Integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import type { ExecutionContext } from '../../types/core';
import { FetchCommand } from './fetch';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Fetch Command with Event Integration', () => {
  let command: FetchCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    command = new FetchCommand();
    testElement = createTestElement('<div id="test-element"></div>');
    document.body.appendChild(testElement);
    
    context = {
      me: testElement,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      flags: { halted: false, breaking: false, continuing: false, returning: false, async: false },
    };

    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Command Metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('fetch');
      expect(command.syntax).toBe('fetch <url-expression> [as <type>] [into <target>]');
      expect(command.isBlocking).toBe(true);
      expect(command.hasBody).toBe(false);
      expect(command.implicitTarget).toBe('me');
    });
  });

  describe('Basic Fetch Execution', () => {
    it('should execute simple fetch request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn().mockResolvedValue('<div>Response content</div>'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await command.execute(context, 'https://example.com/api');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'GET',
          credentials: 'same-origin',
        })
      );
      expect(result).toBe('<div>Response content</div>');
    });

    it('should handle JSON responses', async () => {
      const responseData = { message: 'success', data: [1, 2, 3] };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(responseData),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await command.execute(context, 'https://example.com/api', { format: 'json' });

      expect(result).toEqual(responseData);
    });

    it('should handle POST requests with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: vi.fn().mockResolvedValue('Created'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await command.execute(context, 'https://example.com/api', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Event Integration', () => {
    it('should emit fx:config event before request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Response'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const configHandler = vi.fn();
      testElement.addEventListener('fx:config', configHandler);

      await command.execute(context, 'https://example.com/api');

      expect(configHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:config',
          detail: expect.objectContaining({
            config: expect.objectContaining({
              url: 'https://example.com/api',
              method: 'GET',
            }),
          }),
        })
      );
    });

    it('should emit fx:before event before request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Response'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const beforeHandler = vi.fn();
      testElement.addEventListener('fx:before', beforeHandler);

      await command.execute(context, 'https://example.com/api');

      expect(beforeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:before',
          detail: expect.objectContaining({
            config: expect.objectContaining({
              url: 'https://example.com/api',
            }),
          }),
        })
      );
    });

    it('should emit fx:after event after successful response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Response'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const afterHandler = vi.fn();
      testElement.addEventListener('fx:after', afterHandler);

      await command.execute(context, 'https://example.com/api');

      expect(afterHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:after',
          detail: expect.objectContaining({
            config: expect.objectContaining({
              result: 'Response',
              response: mockResponse,
            }),
          }),
        })
      );
    });

    it('should emit fx:error event on request failure', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      const errorHandler = vi.fn();
      testElement.addEventListener('fx:error', errorHandler);

      await expect(command.execute(context, 'https://example.com/api')).rejects.toThrow('Network error');

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:error',
          detail: expect.objectContaining({
            error,
            command: expect.objectContaining({
              name: 'fetch',
            }),
          }),
        })
      );
    });

    it('should emit fx:finally event regardless of outcome', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Response'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const finallyHandler = vi.fn();
      testElement.addEventListener('fx:finally', finallyHandler);

      await command.execute(context, 'https://example.com/api');

      expect(finallyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:finally',
          detail: expect.objectContaining({
            config: expect.objectContaining({
              url: 'https://example.com/api',
            }),
          }),
        })
      );
    });

    it('should cancel request if fx:config event is prevented', async () => {
      const configHandler = vi.fn((event) => event.preventDefault());
      testElement.addEventListener('fx:config', configHandler);

      const result = await command.execute(context, 'https://example.com/api');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should cancel request if fx:before event is prevented', async () => {
      const beforeHandler = vi.fn((event) => event.preventDefault());
      testElement.addEventListener('fx:before', beforeHandler);

      const result = await command.execute(context, 'https://example.com/api');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('DOM Integration', () => {
    it('should update target element with response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<p>New content</p>'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const targetElement = createTestElement('<div id="target"></div>');
      document.body.appendChild(targetElement);

      await command.execute(context, 'https://example.com/api', {
        target: targetElement,
      });

      expect(targetElement.innerHTML).toBe('<p>New content</p>');
    });

    it('should emit fx:swapped event after DOM update', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<p>New content</p>'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const swappedHandler = vi.fn();
      testElement.addEventListener('fx:swapped', swappedHandler);

      await command.execute(context, 'https://example.com/api', {
        target: testElement,
      });

      expect(swappedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fx:swapped',
          detail: expect.objectContaining({
            config: expect.objectContaining({
              result: '<p>New content</p>',
            }),
          }),
        })
      );
    });

    it('should handle different placement strategies', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('<span>Appended</span>'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      testElement.innerHTML = '<p>Original</p>';

      await command.execute(context, 'https://example.com/api', {
        target: testElement,
        placement: 'append',
      });

      expect(testElement.innerHTML).toBe('<p>Original</p><span>Appended</span>');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Not found'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(command.execute(context, 'https://example.com/notfound')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      await expect(command.execute(context, 'https://example.com/api')).rejects.toThrow('Failed to fetch');
    });

    it('should emit hyperscript:error events on errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const errorHandler = vi.fn();
      testElement.addEventListener('hyperscript:error', errorHandler);

      await expect(command.execute(context, 'https://example.com/api')).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hyperscript:error',
          detail: expect.objectContaining({
            command: 'fetch',
            error: expect.any(Error),
          }),
        })
      );
    });
  });

  describe('Validation', () => {
    it('should validate command arguments', () => {
      expect(command.validate([])).toBe('Fetch command requires a URL');
      expect(command.validate(['https://example.com'])).toBeNull();
      expect(command.validate(['https://example.com', {}])).toBeNull();
      expect(command.validate(['https://example.com', {}, 'extra'])).toBe('Fetch command accepts at most two arguments: URL and options');
    });

    it('should validate URL argument type', () => {
      expect(command.validate([123])).toBe('Fetch command URL must be a string or function');
      expect(command.validate([{}])).toBe('Fetch command URL must be a string or function');
      expect(command.validate([() => 'https://example.com'])).toBeNull();
    });
  });
});