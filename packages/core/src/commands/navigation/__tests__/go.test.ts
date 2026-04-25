/**
 * Unit Tests for GoCommand
 *
 * Tests the go command which provides navigation and scrolling functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoCommand } from '../go';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(valuesToReturn?: unknown[]) {
  let callCount = 0;
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (valuesToReturn) {
        return valuesToReturn[callCount++];
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('GoCommand', () => {
  let command: GoCommand;

  beforeEach(() => {
    command = new GoCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('go');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('navigation');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have navigation and scrolling side effects', () => {
      expect(command.metadata.sideEffects).toContain('navigation');
      expect(command.metadata.sideEffects).toContain('scrolling');
    });
  });

  describe('parseInput', () => {
    it('should parse go back', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['back']);

      const input = await command.parseInput(
        { args: [{ type: 'keyword', value: 'back' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.args).toEqual(['back']);
    });

    it('should parse URL navigation', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['to', 'url', 'https://example.com']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'to' },
            { type: 'keyword', value: 'url' },
            { type: 'string', value: 'https://example.com' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.args).toContain('url');
      expect(input.args).toContain('https://example.com');
    });

    it('should parse element scrolling', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['to', 'top', 'of', '#header']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'to' },
            { type: 'keyword', value: 'top' },
            { type: 'keyword', value: 'of' },
            { type: 'string', value: '#header' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.args).toContain('top');
      expect(input.args).toContain('#header');
    });

    it('should return empty args if none provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator([]);

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.args).toEqual([]);
    });
  });

  describe('execute - go back', () => {
    it('should call window.history.back', async () => {
      const context = createMockContext();
      const backSpy = vi.fn();
      global.window.history.back = backSpy;

      const input = { args: ['back'] };
      const output = await command.execute(input, context);

      expect(backSpy).toHaveBeenCalled();
      expect(output.type).toBe('back');
      expect(output.result).toBe('back');
    });

    it('should throw if no arguments provided', async () => {
      const context = createMockContext();
      const input = { args: [] };

      await expect(command.execute(input, context)).rejects.toThrow(
        'Go command requires arguments'
      );
    });
  });

  describe('execute - URL navigation', () => {
    it('should navigate to URL', async () => {
      const context = createMockContext();
      const assignSpy = vi.fn();
      global.window.location = { assign: assignSpy } as any;

      const input = { args: ['to', 'url', 'https://example.com'] };
      const output = await command.execute(input, context);

      expect(assignSpy).toHaveBeenCalledWith('https://example.com');
      expect(output.type).toBe('url');
      expect(output.result).toBe('https://example.com');
    });

    it('should handle hash URLs', async () => {
      const context = createMockContext();
      const originalHash = global.window.location.hash;

      const input = { args: ['to', 'url', '#section'] };
      await command.execute(input, context);

      // Cleanup
      global.window.location.hash = originalHash;
    });

    it('should throw on invalid URL', async () => {
      const context = createMockContext();
      const input = { args: ['to', 'url', 'not a valid url!!!'] };

      await expect(command.execute(input, context)).rejects.toThrow('Invalid URL');
    });

    it('should accept relative URLs', async () => {
      const context = createMockContext();
      const assignSpy = vi.fn();
      global.window.location = { assign: assignSpy } as any;

      const input = { args: ['to', 'url', '/page'] };
      const output = await command.execute(input, context);

      expect(assignSpy).toHaveBeenCalledWith('/page');
      expect(output.result).toBe('/page');
    });

    // Upstream _hyperscript 0.9.90: `go to /path` and `go to "https://..."`
    // without the legacy `url` keyword.
    describe('bare URL (upstream 0.9.90)', () => {
      it('should navigate to a bare absolute path', async () => {
        const context = createMockContext();
        const assignSpy = vi.fn();
        global.window.location = { assign: assignSpy } as any;

        const input = { args: ['to', '/users/42'] };
        const output = await command.execute(input, context);

        expect(assignSpy).toHaveBeenCalledWith('/users/42');
        expect(output.type).toBe('url');
        expect(output.result).toBe('/users/42');
      });

      it('should navigate to a bare https:// URL', async () => {
        const context = createMockContext();
        const assignSpy = vi.fn();
        global.window.location = { assign: assignSpy } as any;

        const input = { args: ['to', 'https://example.com/x'] };
        const output = await command.execute(input, context);

        expect(assignSpy).toHaveBeenCalledWith('https://example.com/x');
        expect(output.type).toBe('url');
      });

      it('should navigate to a bare mailto: URL', async () => {
        const context = createMockContext();
        const assignSpy = vi.fn();
        global.window.location = { assign: assignSpy } as any;

        const input = { args: ['to', 'mailto:x@example.com'] };
        const output = await command.execute(input, context);

        expect(assignSpy).toHaveBeenCalledWith('mailto:x@example.com');
        expect(output.type).toBe('url');
      });

      it('should open bare URL in a new window', async () => {
        const context = createMockContext();
        const openSpy = vi.fn(() => ({ focus: vi.fn() }));
        global.window.open = openSpy as any;

        const input = { args: ['to', '/dashboard', 'in', 'new', 'window'] };
        const output = await command.execute(input, context);

        expect(openSpy).toHaveBeenCalledWith('/dashboard', '_blank');
        expect(output.type).toBe('url');
      });

      it('should leave CSS id selectors to the scroll branch (`go to #foo`)', async () => {
        const context = createMockContext();
        const element = document.createElement('div');
        element.id = 'section';
        document.body.appendChild(element);
        const scrollSpy = vi.fn();
        element.scrollIntoView = scrollSpy;

        const input = { args: ['to', '#section'] };
        const output = await command.execute(input, context);

        expect(output.type).toBe('scroll');
        expect(scrollSpy).toHaveBeenCalled();

        document.body.removeChild(element);
      });
    });
  });

  describe('execute - element scrolling', () => {
    it('should scroll to element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'test-element';
      document.body.appendChild(element);

      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const input = { args: ['to', '#test-element'] };
      const output = await command.execute(input, context);

      expect(scrollSpy).toHaveBeenCalled();
      expect(output.type).toBe('scroll');
      expect(output.result).toBe(element);

      // Cleanup
      document.body.removeChild(element);
    });

    it('should scroll to body by default', async () => {
      const context = createMockContext();
      const scrollSpy = vi.fn();
      document.body.scrollIntoView = scrollSpy;

      const input = { args: ['to', 'top'] };
      const output = await command.execute(input, context);

      expect(output.type).toBe('scroll');
    });

    it('should handle context references (me, it)', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      context.me = element;
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const input = { args: ['to', 'me'] };
      const output = await command.execute(input, context);

      expect(scrollSpy).toHaveBeenCalled();
      expect(output.result).toBe(element);
    });
  });

  describe('integration', () => {
    it('should parse and execute go back end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['back']);
      const backSpy = vi.fn();
      global.window.history.back = backSpy;

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'keyword', value: 'back' }], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(backSpy).toHaveBeenCalled();
      expect(output.type).toBe('back');
    });

    it('should parse and execute URL navigation end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['to', 'url', '/path']);
      const assignSpy = vi.fn();
      global.window.location = { assign: assignSpy } as any;

      // Parse
      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'to' },
            { type: 'keyword', value: 'url' },
            { type: 'string', value: '/path' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(assignSpy).toHaveBeenCalledWith('/path');
      expect(output.type).toBe('url');
      expect(output.result).toBe('/path');
    });
  });
});
