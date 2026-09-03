/**
 * Unit Tests for HistoryCommand (push-url)
 *
 * Tests the HistoryCommand which handles both push and replace URL operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryCommand, PushUrlCommand, ReplaceUrlCommand } from '../push-url';
import type { ExecutionContext, TypedExecutionContext, ExpressionNode } from '../../../types/core';
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

describe('HistoryCommand (push-url)', () => {
  let command: HistoryCommand;
  let mockPushState: ReturnType<typeof vi.fn>;
  let mockReplaceState: ReturnType<typeof vi.fn>;
  let mockDispatchEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    command = new HistoryCommand();
    mockPushState = vi.fn();
    mockReplaceState = vi.fn();
    mockDispatchEvent = vi.fn();

    global.window.history.pushState =
      mockPushState as unknown as typeof global.window.history.pushState;
    global.window.history.replaceState =
      mockReplaceState as unknown as typeof global.window.history.replaceState;
    global.window.dispatchEvent =
      mockDispatchEvent as unknown as typeof global.window.dispatchEvent;
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('push');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('history');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have navigation side effect', () => {
      expect(command.metadata.sideEffects).toContain('navigation');
    });

    it('should have replace as alias', () => {
      expect(command.metadata.aliases).toContain('replace');
    });
  });

  describe('parseInput - push mode', () => {
    it('should parse simple URL', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/path']);

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/path' }],
          modifiers: {},
          commandName: 'push',
        },
        evaluator,
        context
      );

      expect(input.url).toBe('/path');
      expect(input.mode).toBe('push');
    });

    it('should parse with title', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/page', 'Page Title']);

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/page' }],
          modifiers: {
            title: { type: 'string', value: 'Page Title' } as ASTNode as ExpressionNode,
          },
          commandName: 'push',
        },
        evaluator,
        context
      );

      expect(input.url).toBe('/page');
      expect(input.title).toBe('Page Title');
      expect(input.mode).toBe('push');
    });

    it('should default to push mode if command name not specified', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/test']);

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/test' }],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.mode).toBe('push');
    });
  });

  describe('parseInput - replace mode', () => {
    it('should detect replace mode from command name', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/replaced']);

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/replaced' }],
          modifiers: {},
          commandName: 'replace',
        },
        evaluator,
        context
      );

      expect(input.url).toBe('/replaced');
      expect(input.mode).toBe('replace');
    });
  });

  describe('execute - push mode', () => {
    it('should call pushState with URL', async () => {
      const context = createMockContext();
      const input = {
        url: '/new-path',
        mode: 'push' as const,
      };

      const output = await command.execute(input, context);

      expect(mockPushState).toHaveBeenCalledWith(null, '', '/new-path');
      expect(output.url).toBe('/new-path');
      expect(output.mode).toBe('push');
    });

    it('should update document title if provided', async () => {
      const context = createMockContext();
      const input = {
        url: '/page',
        title: 'New Title',
        mode: 'push' as const,
      };

      await command.execute(input, context);

      expect(document.title).toBe('New Title');
    });

    it('should dispatch custom event', async () => {
      const context = createMockContext();
      const input = {
        url: '/path',
        mode: 'push' as const,
      };

      await command.execute(input, context);

      expect(mockDispatchEvent).toHaveBeenCalled();
      const call = mockDispatchEvent.mock.calls[0][0];
      expect(call.type).toBe('lokascript:pushurl');
      expect(call.detail.url).toBe('/path');
    });

    it('should handle state object', async () => {
      const context = createMockContext();
      const state = { page: 1, filter: 'active' };
      const input = {
        url: '/items',
        state,
        mode: 'push' as const,
      };

      await command.execute(input, context);

      expect(mockPushState).toHaveBeenCalledWith(state, '', '/items');
    });
  });

  describe('execute - replace mode', () => {
    it('should call replaceState with URL', async () => {
      const context = createMockContext();
      const input = {
        url: '/replaced-path',
        mode: 'replace' as const,
      };

      const output = await command.execute(input, context);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/replaced-path');
      expect(mockPushState).not.toHaveBeenCalled();
      expect(output.url).toBe('/replaced-path');
      expect(output.mode).toBe('replace');
    });

    it('should dispatch replace event', async () => {
      const context = createMockContext();
      const input = {
        url: '/path',
        mode: 'replace' as const,
      };

      await command.execute(input, context);

      expect(mockDispatchEvent).toHaveBeenCalled();
      const call = mockDispatchEvent.mock.calls[0][0];
      expect(call.type).toBe('lokascript:replaceurl');
    });
  });

  describe('backwards compatibility exports', () => {
    it('should export PushUrlCommand', () => {
      expect(PushUrlCommand).toBe(HistoryCommand);
    });

    it('should export ReplaceUrlCommand', () => {
      expect(ReplaceUrlCommand).toBe(HistoryCommand);
    });
  });

  describe('integration', () => {
    it('should parse and execute push end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/new-page', 'New Page']);

      // Parse
      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/new-page' }],
          modifiers: { title: { type: 'string', value: 'New Page' } as ASTNode as ExpressionNode },
          commandName: 'push',
        },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(mockPushState).toHaveBeenCalledWith(null, '', '/new-page');
      expect(document.title).toBe('New Page');
      expect(output.url).toBe('/new-page');
      expect(output.title).toBe('New Page');
      expect(output.mode).toBe('push');
    });

    it('should parse and execute replace end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['/current']);

      // Parse
      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '/current' }],
          modifiers: {},
          commandName: 'replace',
        },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/current');
      expect(mockPushState).not.toHaveBeenCalled();
      expect(output.mode).toBe('replace');
    });
  });
});
