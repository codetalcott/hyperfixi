/**
 * Unit Tests for SendCommand (send syntax)
 *
 * Tests the send command which is an alias for trigger using "to" syntax.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SendCommand } from '../send';
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

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null) {
        // Handle context references properly
        if ('name' in node) {
          const name = (node as any).name;
          if (name === 'me') return context.me;
          if (name === 'it') return context.it;
          if (name === 'you') return context.you;
          return name;
        }
        if ('value' in node) return (node as any).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('SendCommand (send syntax)', () => {
  let command: SendCommand;

  beforeEach(() => {
    command = new SendCommand();
  });

  describe('metadata', () => {
    it('should have trigger as base name', () => {
      // SendCommand is an alias for EventDispatchCommand
      expect(command.name).toBe('trigger');
    });
  });

  describe('parseInput with send syntax', () => {
    it('should parse "send event to target" syntax', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'dataEvent' } as any,
          ],
          modifiers: { on: { type: 'identifier', name: 'me' } as any },
          commandName: 'send',
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('dataEvent');
      expect(input.mode).toBe('send');
      expect(input.targets).toHaveLength(1);
    });

    it('should parse with "to" modifier (semantic format)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'myEvent' } as any],
          modifiers: {
            to: { type: 'identifier', name: 'me' } as any,
          },
          commandName: 'send',
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('myEvent');
      expect(input.mode).toBe('send');
    });

    it('should parse send with detail', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            {
              type: 'functionCall',
              name: 'notification',
              args: [{ type: 'string', value: 'Hello' }],
            } as any,
          ],
          modifiers: { on: { type: 'identifier', name: 'me' } as any },
          commandName: 'send',
        },
        evaluator,
        context
      );

      expect(input.eventName).toBe('notification');
      expect(input.mode).toBe('send');
    });
  });

  describe('execute', () => {
    it('should dispatch event using send mode', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const eventSpy = vi.fn();
      element.addEventListener('sentEvent', eventSpy);

      const input = {
        eventName: 'sentEvent',
        targets: [element],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'send' as const,
      };

      await command.execute(input, context);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should work identically to trigger', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const eventSpy = vi.fn();
      element.addEventListener('testEvent', eventSpy);

      const input = {
        eventName: 'testEvent',
        detail: { message: 'test' },
        targets: [element],
        options: { bubbles: true, cancelable: true, composed: false },
        mode: 'send' as const,
      };

      await command.execute(input, context);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(context.it).toBeInstanceOf(Event);
    });
  });

  describe('integration', () => {
    it('should parse and execute send syntax end-to-end', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const evaluator = createMockEvaluator();
      const eventSpy = vi.fn();
      element.addEventListener('message', eventSpy);

      // Parse with send commandName
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'message' } as any,
          ],
          modifiers: { on: { type: 'identifier', name: 'me' } as any },
          commandName: 'send',
        },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      expect(input.mode).toBe('send');
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(context.it).toBeInstanceOf(Event);
    });
  });
});
