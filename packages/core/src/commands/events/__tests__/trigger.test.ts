/**
 * Unit Tests for EventDispatchCommand (trigger syntax)
 *
 * Tests the trigger command which dispatches events on elements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventDispatchCommand } from '../trigger';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const element = document.createElement('div');
  return {
    me: element,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: element,
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
      if (typeof node === 'object' && node !== null) {
        if ('name' in node) return (node as any).name;
        if ('value' in node) return (node as any).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('EventDispatchCommand (trigger)', () => {
  let command: EventDispatchCommand;

  beforeEach(() => {
    command = new EventDispatchCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('trigger');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('event');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have event-dispatch side effect', () => {
      expect(command.metadata.sideEffects).toContain('event-dispatch');
    });

    it('should have send as alias', () => {
      expect(command.metadata.aliases).toContain('send');
    });
  });

  describe('parseInput', () => {
    it('should parse simple event name', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'click' } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('click');
      expect(input.mode).toBe('trigger');
    });

    it('should parse event with detail', async () => {
      const context = createMockContext();
      // Provide enough values: one for detail evaluation, one for target evaluation
      const evaluator = createMockEvaluator([{ count: 42 }, context.me]);

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'functionCall',
              name: 'customEvent',
              args: [{ type: 'object', value: { count: 42 } }],
            } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('customEvent');
      expect(input.detail).toEqual({ count: 42 });
    });

    it('should parse with "on" modifier (semantic format)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'click' } as any],
          modifiers: {
            on: { type: 'identifier', name: 'me' } as any,
          },
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('click');
      expect(input.targets).toHaveLength(1);
    });

    it('should default to context.me if no target specified', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'myEvent' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.targets).toEqual([context.me]);
    });

    it('should throw if no event name provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('trigger command requires an event name');
    });
  });

  describe('execute', () => {
    it('should dispatch event on target', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const eventSpy = vi.fn();
      element.addEventListener('testEvent', eventSpy);

      const input = {
        eventName: 'testEvent',
        targets: [element],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'trigger' as const,
      };

      await command.execute(input, context);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch event with detail', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      let capturedEvent: CustomEvent | null = null;
      element.addEventListener('dataEvent', (e: Event) => {
        capturedEvent = e as CustomEvent;
      });

      const input = {
        eventName: 'dataEvent',
        detail: { value: 'test', count: 42 },
        targets: [element],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'trigger' as const,
      };

      await command.execute(input, context);

      expect(capturedEvent).toBeDefined();
      expect(capturedEvent!.detail).toEqual({ value: 'test', count: 42 });
    });

    it('should set context.it to dispatched event', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const input = {
        eventName: 'myEvent',
        targets: [element],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'trigger' as const,
      };

      await command.execute(input, context);

      expect(context.it).toBeInstanceOf(Event);
      expect((context.it as Event).type).toBe('myEvent');
    });

    it('should dispatch to multiple targets', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      el1.addEventListener('multi', spy1);
      el2.addEventListener('multi', spy2);

      const input = {
        eventName: 'multi',
        targets: [el1, el2],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'trigger' as const,
      };

      await command.execute(input, context);

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });

  describe('named parameter handling', () => {
    it('should produce object detail for single named parameter', async () => {
      const context = createMockContext();
      // The evaluator returns {category: 'ui-components'} for the objectLiteral arg
      const evaluator = createMockEvaluator([{ category: 'ui-components' }, context.me]);

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'functionCall',
              name: 'filterByCategory',
              args: [
                {
                  type: 'objectLiteral',
                  properties: [
                    {
                      key: { type: 'identifier', name: 'category' },
                      value: { type: 'string', value: 'ui-components' },
                    },
                  ],
                },
              ],
            } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('filterByCategory');
      expect(input.detail).toEqual({ category: 'ui-components' });
    });

    it('should still return raw value for single positional parameter', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['some-value', context.me]);

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'functionCall',
              name: 'myEvent',
              args: [{ type: 'string', value: 'some-value' }],
            } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('myEvent');
      expect(input.detail).toBe('some-value');
    });

    it('should handle callExpression node type from main parser', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator([{ count: 42 }, context.me]);

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'callExpression',
              callee: { type: 'identifier', name: 'dataEvent' },
              arguments: [{ type: 'object', value: { count: 42 } }],
            } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('dataEvent');
      expect(input.detail).toEqual({ count: 42 });
    });

    it('should merge multiple named parameters into detail object', async () => {
      const context = createMockContext();
      // Two objectLiteral args evaluate to individual objects, then merged
      const evaluator = createMockEvaluator([{ category: 'ui' }, { priority: 'high' }, context.me]);

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'functionCall',
              name: 'filterEvent',
              args: [
                {
                  type: 'objectLiteral',
                  properties: [
                    {
                      key: { type: 'identifier', name: 'category' },
                      value: { type: 'string', value: 'ui' },
                    },
                  ],
                },
                {
                  type: 'objectLiteral',
                  properties: [
                    {
                      key: { type: 'identifier', name: 'priority' },
                      value: { type: 'string', value: 'high' },
                    },
                  ],
                },
              ],
            } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('filterEvent');
      expect(input.detail).toEqual({ category: 'ui', priority: 'high' });
    });
  });

  describe('integration', () => {
    it('should parse and execute end-to-end', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const evaluator = createMockEvaluator();
      const eventSpy = vi.fn();
      element.addEventListener('testClick', eventSpy);

      // Parse
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'testClick' } as any,
            { type: 'keyword', name: 'on' } as any,
            { type: 'identifier', name: 'me' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(context.it).toBeInstanceOf(Event);
      expect((context.it as Event).type).toBe('testClick');
    });
  });
});
