/**
 * Unit Tests for ReplaceUrlCommand (replace-url)
 *
 * Tests the ReplaceUrlCommand re-export which delegates to HistoryCommand
 * with mode='replace'. Verifies that the re-export correctly exposes the
 * replace URL functionality: replaceState calls, title updates, event dispatch,
 * and proper return values.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplaceUrlCommand } from '../replace-url';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

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

function createMockEvaluator(valuesToReturn?: unknown[]): ExpressionEvaluator {
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
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('ReplaceUrlCommand (replace-url)', () => {
  let command: InstanceType<typeof ReplaceUrlCommand>;
  let mockReplaceState: ReturnType<typeof vi.fn>;
  let mockPushState: ReturnType<typeof vi.fn>;
  let mockDispatchEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();

    command = new ReplaceUrlCommand();
    mockReplaceState = vi.fn();
    mockPushState = vi.fn();
    mockDispatchEvent = vi.fn();

    Object.defineProperty(window, 'history', {
      value: { replaceState: mockReplaceState, pushState: mockPushState },
      writable: true,
      configurable: true,
    });

    global.window.dispatchEvent =
      mockDispatchEvent as unknown as typeof global.window.dispatchEvent;
  });

  // ---------- metadata ----------

  describe('metadata', () => {
    it('should have command name "push" (shared HistoryCommand)', () => {
      expect(command.name).toBe('push');
    });

    it('should have metadata defined', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description).toBeTruthy();
    });

    it('should include "replace" in aliases', () => {
      expect(command.metadata.aliases).toContain('replace');
    });

    it('should have syntax examples including replace variants', () => {
      expect(command.metadata.syntax).toBeInstanceOf(Array);
      const syntaxArr = Array.isArray(command.metadata.syntax)
        ? command.metadata.syntax
        : [command.metadata.syntax];
      const hasReplaceSyntax = syntaxArr.some((s: string) => s.toLowerCase().includes('replace'));
      expect(hasReplaceSyntax).toBe(true);
    });
  });

  // ---------- parseInput ----------

  describe('parseInput', () => {
    it('should detect replace mode when commandName contains "replace"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['url', '/replaced']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'url' } as unknown as ASTNode,
            { type: 'string', value: '/replaced' } as unknown as ASTNode,
          ],
          modifiers: {},
          commandName: 'replace',
        },
        evaluator,
        context
      );

      expect(input.mode).toBe('replace');
    });

    it('should detect replace mode from "replace-url" commandName', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['url', '/page']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'url' } as unknown as ASTNode,
            { type: 'string', value: '/page' } as unknown as ASTNode,
          ],
          modifiers: {},
          commandName: 'replace-url',
        },
        evaluator,
        context
      );

      expect(input.mode).toBe('replace');
      expect(input.url).toBe('/page');
    });

    it('should parse URL and title from args', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['url', '/dashboard', 'with', 'title', 'Dashboard']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'url' } as unknown as ASTNode,
            { type: 'string', value: '/dashboard' } as unknown as ASTNode,
            { type: 'keyword', value: 'with' } as unknown as ASTNode,
            { type: 'keyword', value: 'title' } as unknown as ASTNode,
            { type: 'string', value: 'Dashboard' } as unknown as ASTNode,
          ],
          modifiers: {},
          commandName: 'replace',
        },
        evaluator,
        context
      );

      expect(input.url).toBe('/dashboard');
      expect(input.title).toBe('Dashboard');
      expect(input.mode).toBe('replace');
    });
  });

  // ---------- execute - replaceState ----------

  describe('execute - replaceState', () => {
    it('should call window.history.replaceState with the URL', async () => {
      const context = createMockContext();

      await command.execute({ url: '/new-path', mode: 'replace' }, context);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/new-path');
    });

    it('should NOT call pushState', async () => {
      const context = createMockContext();

      await command.execute({ url: '/new-path', mode: 'replace' }, context);

      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('should set document.title when title is provided', async () => {
      const context = createMockContext();
      const originalTitle = document.title;

      await command.execute({ url: '/page', title: 'Updated Title', mode: 'replace' }, context);

      expect(document.title).toBe('Updated Title');

      // Restore
      document.title = originalTitle;
    });

    it('should pass state object to replaceState', async () => {
      const context = createMockContext();
      const state = { section: 'overview', tab: 2 };

      await command.execute({ url: '/details', state, mode: 'replace' }, context);

      expect(mockReplaceState).toHaveBeenCalledWith(state, '', '/details');
    });
  });

  // ---------- execute - return value ----------

  describe('execute - return value', () => {
    it('should return url and mode "replace"', async () => {
      const context = createMockContext();

      const output = await command.execute({ url: '/result-path', mode: 'replace' }, context);

      expect(output.url).toBe('/result-path');
      expect(output.mode).toBe('replace');
    });

    it('should return title when provided', async () => {
      const context = createMockContext();

      const output = await command.execute(
        { url: '/page', title: 'My Page', mode: 'replace' },
        context
      );

      expect(output.title).toBe('My Page');
      expect(output.url).toBe('/page');
      expect(output.mode).toBe('replace');
    });
  });

  // ---------- execute - event dispatch ----------

  describe('execute - event dispatch', () => {
    it('should dispatch lokascript:replaceurl event', async () => {
      const context = createMockContext();

      await command.execute({ url: '/events-test', mode: 'replace' }, context);

      expect(mockDispatchEvent).toHaveBeenCalled();
      const lokascriptCall = mockDispatchEvent.mock.calls.find(
        (call: unknown[]) => (call[0] as CustomEvent).type === 'lokascript:replaceurl'
      );
      expect(lokascriptCall).toBeDefined();
      expect((lokascriptCall![0] as CustomEvent).detail.url).toBe('/events-test');
    });

    it('should dispatch legacy hyperfixi:replaceurl event for backward compatibility', async () => {
      const context = createMockContext();

      await command.execute({ url: '/compat-test', mode: 'replace' }, context);

      const hyperfixiCall = mockDispatchEvent.mock.calls.find(
        (call: unknown[]) => (call[0] as CustomEvent).type === 'hyperfixi:replaceurl'
      );
      expect(hyperfixiCall).toBeDefined();
      expect((hyperfixiCall![0] as CustomEvent).detail.url).toBe('/compat-test');
    });
  });

  // ---------- integration ----------

  describe('integration', () => {
    it('should parse and execute replace with URL only end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['url', '/current']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'url' } as unknown as ASTNode,
            { type: 'string', value: '/current' } as unknown as ASTNode,
          ],
          modifiers: {},
          commandName: 'replace',
        },
        evaluator,
        context
      );

      const output = await command.execute(input, context);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/current');
      expect(mockPushState).not.toHaveBeenCalled();
      expect(output.url).toBe('/current');
      expect(output.mode).toBe('replace');
    });

    it('should parse and execute replace with URL and title end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['url', '/settings', 'with', 'title', 'Settings Page']);
      const originalTitle = document.title;

      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'url' } as unknown as ASTNode,
            { type: 'string', value: '/settings' } as unknown as ASTNode,
            { type: 'keyword', value: 'with' } as unknown as ASTNode,
            { type: 'keyword', value: 'title' } as unknown as ASTNode,
            { type: 'string', value: 'Settings Page' } as unknown as ASTNode,
          ],
          modifiers: {},
          commandName: 'replace-url',
        },
        evaluator,
        context
      );

      const output = await command.execute(input, context);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/settings');
      expect(mockPushState).not.toHaveBeenCalled();
      expect(document.title).toBe('Settings Page');
      expect(output.url).toBe('/settings');
      expect(output.title).toBe('Settings Page');
      expect(output.mode).toBe('replace');

      // Restore
      document.title = originalTitle;
    });
  });
});
