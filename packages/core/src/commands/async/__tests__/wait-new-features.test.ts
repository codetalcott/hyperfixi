/**
 * Unit Tests for WaitCommand - New Features (V1 Feature Restoration)
 *
 * Tests the three missing V1 features:
 * 1. Race conditions: wait for click or 1s
 * 2. Event destructuring: wait for mousemove(clientX, clientY)
 * 3. Custom event sources: wait for load from <iframe/>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaitCommand } from '../wait';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

/** Test context with guaranteed non-null me */
interface TestContext extends ExecutionContext, TypedExecutionContext {
  me: HTMLElement;
}

function createMockContext(): TestContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-element';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as TestContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  };
}

// ========== Race Condition Tests ==========

describe('WaitCommand - Race Conditions', () => {
  let command: WaitCommand;

  beforeEach(() => {
    command = new WaitCommand();
  });

  describe('parseInput - race conditions', () => {
    it('should parse "wait for click or 1s"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'click' },
            or: { value: '1s' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('race');
      expect((input as { conditions: unknown[] }).conditions).toHaveLength(2);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].type).toBe('event');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].eventName).toBe('click');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].type).toBe('time');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].milliseconds).toBe(1000);
    });

    it('should parse "wait 2s or for click"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: '2s' }],
          modifiers: {
            or: { value: 'click' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('race');
      expect((input as { conditions: unknown[] }).conditions).toHaveLength(2);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].type).toBe('time');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].milliseconds).toBe(2000);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].type).toBe('event');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].eventName).toBe('click');
    });

    it('should parse "wait for click or keypress"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'click' },
            or: { value: 'keypress' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('race');
      expect((input as { conditions: unknown[] }).conditions).toHaveLength(2);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].type).toBe('event');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].eventName).toBe('click');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].type).toBe('event');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].eventName).toBe('keypress');
    });

    it('should parse "wait 500ms or 1s" (multiple time conditions)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: '500ms' }],
          modifiers: {
            or: { value: '1s' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('race');
      expect((input as { conditions: unknown[] }).conditions).toHaveLength(2);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].type).toBe('time');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].milliseconds).toBe(500);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].type).toBe('time');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].milliseconds).toBe(1000);
    });

    it('should parse race condition with event destructuring', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'mousemove(clientX, clientY)' },
            or: { value: '2s' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('race');
      expect((input as { conditions: unknown[] }).conditions).toHaveLength(2);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].type).toBe('event');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].eventName).toBe('mousemove');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[0].destructure).toEqual(['clientX', 'clientY']);
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].type).toBe('time');
      expect((input as { conditions: Array<Record<string, unknown>> }).conditions[1].milliseconds).toBe(2000);
    });

    it('should throw error if race condition has less than 2 conditions', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          {
            args: [],
            modifiers: {
              or: { value: '1s' },
            },
          },
          evaluator,
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('execute - race conditions', () => {
    it('should resolve when event fires first', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'race',
          conditions: [
            { type: 'event', eventName: 'click', target: element },
            { type: 'time', milliseconds: 1000 },
          ],
        },
        context
      );

      // Trigger event immediately
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 10);

      const output = await waitPromise;

      expect(output.type).toBe('event');
      expect(output.result).toBeInstanceOf(Event);
      expect((output.result as Event).type).toBe('click');
      expect(output.duration).toBeLessThan(100);
    });

    it('should resolve when time expires first', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'race',
          conditions: [
            { type: 'event', eventName: 'click', target: element },
            { type: 'time', milliseconds: 50 },
          ],
        },
        context
      );

      // Don't trigger event - let time expire

      const output = await waitPromise;

      expect(output.type).toBe('time');
      expect(output.result).toBe(50);
      expect(output.duration).toBeGreaterThanOrEqual(45);
    });

    it('should update context.it with winning result', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'race',
          conditions: [
            { type: 'event', eventName: 'click', target: element },
            { type: 'time', milliseconds: 1000 },
          ],
        },
        context
      );

      // Trigger event
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 10);

      await waitPromise;

      expect(context.it).toBeInstanceOf(Event);
      expect((context.it as Event).type).toBe('click');
    });

    it('should handle race between multiple events', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'race',
          conditions: [
            { type: 'event', eventName: 'click', target: element },
            { type: 'event', eventName: 'keypress', target: element },
          ],
        },
        context
      );

      // Trigger keypress first
      setTimeout(() => {
        element.dispatchEvent(new Event('keypress'));
      }, 10);

      const output = await waitPromise;

      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('keypress');
    });

    it('should return duration for race condition', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'race',
          conditions: [
            { type: 'time', milliseconds: 50 },
            { type: 'event', eventName: 'click', target: element },
          ],
        },
        context
      );

      const output = await waitPromise;

      expect(output.duration).toBeGreaterThanOrEqual(45);
      expect(output.duration).toBeLessThan(100);
    });
  });

  // validate method removed in decorator refactor
  // describe('validate - race conditions', () => {
  //   it('should validate correct race input', () => {
  //     const input = {
  //       type: 'race' as const,
  //       conditions: [
  //         { type: 'time' as const, milliseconds: 100 },
  //         { type: 'event' as const, eventName: 'click' },
  //       ],
  //     };
  //     expect(command.validate(input)).toBe(true);
  //   });

  //   it('should reject race input with less than 2 conditions', () => {
  //     const input = {
  //       type: 'race' as const,
  //       conditions: [{ type: 'time' as const, milliseconds: 100 }],
  //     };
  //     expect(command.validate(input)).toBe(false);
  //   });

  //   it('should reject race input with non-array conditions', () => {
  //     const input = {
  //       type: 'race' as const,
  //       conditions: 'not an array' as any,
  //     };
  //     expect(command.validate(input)).toBe(false);
  //   });

  //   it('should reject race input with invalid nested conditions', () => {
  //     const input = {
  //       type: 'race' as const,
  //       conditions: [
  //         { type: 'time' as const, milliseconds: 100 },
  //         { type: 'invalid' as any, foo: 'bar' },
  //       ],
  //     };
  //     expect(command.validate(input)).toBe(false);
  //   });

  //   it('should validate race with multiple valid conditions', () => {
  //     const input = {
  //       type: 'race' as const,
  //       conditions: [
  //         { type: 'time' as const, milliseconds: 100 },
  //         { type: 'event' as const, eventName: 'click' },
  //         { type: 'event' as const, eventName: 'keypress' },
  //       ],
  //     };
  //     expect(command.validate(input)).toBe(true);
  //   });
  // });

  describe('integration - race conditions', () => {
    it('should wait for click or 1s end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'click' },
            or: { value: '1s' },
          },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger event quickly
      setTimeout(() => {
        context.me.dispatchEvent(new Event('click'));
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('click');
      expect(output.duration).toBeLessThan(100);
    });

    it('should wait 500ms or for click end-to-end (time wins)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: '50ms' }],
          modifiers: {
            or: { value: 'click' },
          },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute (don't trigger event)
      const output = await command.execute(input, context);

      // Verify
      expect(output.type).toBe('time');
      expect(output.result).toBe(50);
      expect(output.duration).toBeGreaterThanOrEqual(45);
    });
  });
});

// ========== Event Destructuring Tests ==========

describe('WaitCommand - Event Destructuring', () => {
  let command: WaitCommand;

  beforeEach(() => {
    command = new WaitCommand();
  });

  describe('parseInput - event destructuring', () => {
    it('should parse "wait for mousemove(clientX, clientY)"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'mousemove(clientX, clientY)' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('mousemove');
      expect((input as { destructure: string[] }).destructure).toEqual(['clientX', 'clientY']);
    });

    it('should parse "wait for keydown(key, code)"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'keydown(key, code)' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('keydown');
      expect((input as { destructure: string[] }).destructure).toEqual(['key', 'code']);
    });

    it('should parse single property destructuring', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'scroll(scrollY)' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('scroll');
      expect((input as { destructure: string[] }).destructure).toEqual(['scrollY']);
    });

    it('should parse multiple properties with spaces', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'click(clientX, clientY, button)' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('click');
      expect((input as { destructure: string[] }).destructure).toEqual(['clientX', 'clientY', 'button']);
    });

    it('should handle destructuring without spaces', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'mousemove(clientX,clientY)' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('mousemove');
      expect((input as { destructure: string[] }).destructure).toEqual(['clientX', 'clientY']);
    });

    it('should parse event without destructuring normally', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'click' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('click');
      expect((input as { destructure?: string[] }).destructure).toBeUndefined();
    });
  });

  describe('execute - event destructuring', () => {
    it('should set destructured properties as locals', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'mousemove',
          target: element,
          destructure: ['clientX', 'clientY'],
        },
        context
      );

      // Trigger event with properties
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 200,
        });
        element.dispatchEvent(event);
      }, 10);

      await waitPromise;

      // Verify locals were set
      expect(context.locals.get('clientX')).toBe(100);
      expect(context.locals.get('clientY')).toBe(200);
    });

    it('should set single destructured property', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'scroll',
          target: element,
          destructure: ['scrollY'],
        },
        context
      );

      // Trigger event with property
      setTimeout(() => {
        const event = new Event('scroll');
        Object.defineProperty(event, 'scrollY', { value: 500 });
        element.dispatchEvent(event);
      }, 10);

      await waitPromise;

      // Verify local was set
      expect(context.locals.get('scrollY')).toBe(500);
    });

    it('should handle keyboard event destructuring', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'keydown',
          target: element,
          destructure: ['key', 'code', 'ctrlKey'],
        },
        context
      );

      // Trigger keyboard event
      setTimeout(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          ctrlKey: true,
        });
        element.dispatchEvent(event);
      }, 10);

      await waitPromise;

      // Verify locals were set
      expect(context.locals.get('key')).toBe('Enter');
      expect(context.locals.get('code')).toBe('Enter');
      expect(context.locals.get('ctrlKey')).toBe(true);
    });

    it('should handle missing properties gracefully', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'click',
          target: element,
          destructure: ['nonExistent', 'alsoMissing'],
        },
        context
      );

      // Trigger event without those properties
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 10);

      await waitPromise;

      // Verify locals were not set
      expect(context.locals.has('nonExistent')).toBe(false);
      expect(context.locals.has('alsoMissing')).toBe(false);
    });

    it('should update context.it with event', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'mousemove',
          target: element,
          destructure: ['clientX', 'clientY'],
        },
        context
      );

      // Trigger event
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 200,
        });
        element.dispatchEvent(event);
      }, 10);

      await waitPromise;

      // Verify context.it was set
      expect(context.it).toBeInstanceOf(MouseEvent);
      expect((context.it as MouseEvent).clientX).toBe(100);
      expect((context.it as MouseEvent).clientY).toBe(200);
    });

    it('should not set locals if destructure is undefined', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting without destructuring
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'click',
          target: element,
        },
        context
      );

      // Trigger event
      setTimeout(() => {
        const event = new MouseEvent('click', {
          clientX: 100,
          clientY: 200,
        });
        element.dispatchEvent(event);
      }, 10);

      await waitPromise;

      // Verify no locals were set
      expect(context.locals.has('clientX')).toBe(false);
      expect(context.locals.has('clientY')).toBe(false);
    });
  });

  // validate method removed in decorator refactor
  // describe('validate - event destructuring', () => {
  //   it('should validate event input with destructure', () => {
  //     const input = {
  //       type: 'event' as const,
  //       eventName: 'mousemove',
  //       destructure: ['clientX', 'clientY'],
  //     };
  //     expect(command.validate(input)).toBe(true);
  //   });

  //   it('should validate event input without destructure', () => {
  //     const input = {
  //       type: 'event' as const,
  //       eventName: 'click',
  //     };
  //     expect(command.validate(input)).toBe(true);
  //   });

  //   it('should reject event input with non-array destructure', () => {
  //     const input = {
  //       type: 'event' as const,
  //       eventName: 'click',
  //       destructure: 'not an array' as any,
  //     };
  //     expect(command.validate(input)).toBe(false);
  //   });

  //   it('should reject event input with non-string properties in destructure', () => {
  //     const input = {
  //       type: 'event' as const,
  //       eventName: 'click',
  //       destructure: ['valid', 123, 'alsoValid'] as any,
  //     };
  //     expect(command.validate(input)).toBe(false);
  //   });

  //   it('should validate event input with empty destructure array', () => {
  //     const input = {
  //       type: 'event' as const,
  //       eventName: 'click',
  //       destructure: [],
  //     };
  //     expect(command.validate(input)).toBe(true);
  //   });
  // });

  describe('integration - event destructuring', () => {
    it('should wait for mousemove with destructuring end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'mousemove(clientX, clientY)' } },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger event
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 250,
        });
        context.me.dispatchEvent(event);
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect((output.result as MouseEvent).clientX).toBe(150);
      expect((output.result as MouseEvent).clientY).toBe(250);
      expect(context.locals.get('clientX')).toBe(150);
      expect(context.locals.get('clientY')).toBe(250);
    });

    it('should wait for keydown with destructuring end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: { for: { value: 'keydown(key, code)' } },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger event
      setTimeout(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
        });
        context.me.dispatchEvent(event);
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect(context.locals.get('key')).toBe('a');
      expect(context.locals.get('code')).toBe('KeyA');
    });
  });
});

// ========== Custom Event Sources Tests ==========

describe('WaitCommand - Custom Event Sources', () => {
  let command: WaitCommand;

  beforeEach(() => {
    command = new WaitCommand();
  });

  describe('parseInput - custom event sources', () => {
    it('should parse "wait for load from <iframe/>"', async () => {
      const context = createMockContext();
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='load') return 'load';
            if ((node as unknown as { value: unknown }).value ==='<iframe/>') return iframe;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'load' },
            from: { value: '<iframe/>' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('load');
      expect((input as { target: EventTarget }).target).toBe(iframe);

      document.body.removeChild(iframe);
    });

    it('should parse "wait for click from #other-element"', async () => {
      const context = createMockContext();
      const otherElement = document.createElement('button');
      otherElement.id = 'other-element';
      document.body.appendChild(otherElement);

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='click') return 'click';
            if ((node as unknown as { value: unknown }).value ==='#other-element') return otherElement;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'click' },
            from: { value: '#other-element' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('click');
      expect((input as { target: EventTarget }).target).toBe(otherElement);

      document.body.removeChild(otherElement);
    });

    it('should parse "wait for message from window"', async () => {
      const context = createMockContext();

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='message') return 'message';
            if ((node as unknown as { value: unknown }).value ==='window') return window;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'message' },
            from: { value: 'window' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('message');
      expect((input as { target: EventTarget }).target).toBe(window);
    });

    it('should default to context.me if no from modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'click' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('click');
      expect((input as { target: EventTarget }).target).toBe(context.me);
    });

    it('should throw error if from value is not an EventTarget', async () => {
      const context = createMockContext();

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='click') return 'click';
            if ((node as unknown as { value: unknown }).value ==='invalid') return 'not an EventTarget';
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      await expect(
        command.parseInput(
          {
            args: [{ value: 'placeholder' }],
            modifiers: {
              for: { value: 'click' },
              from: { value: 'invalid' },
            },
          },
          evaluator,
          context
        )
      ).rejects.toThrow('target must be an EventTarget');
    });

    it('should combine custom source with destructuring', async () => {
      const context = createMockContext();
      const customElement = document.createElement('div');
      document.body.appendChild(customElement);

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='mousemove(clientX, clientY)') {
              return 'mousemove(clientX, clientY)';
            }
            if ((node as unknown as { value: unknown }).value ==='customElement') return customElement;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'mousemove(clientX, clientY)' },
            from: { value: 'customElement' },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('mousemove');
      expect((input as { target: EventTarget }).target).toBe(customElement);
      expect((input as { destructure: string[] }).destructure).toEqual(['clientX', 'clientY']);

      document.body.removeChild(customElement);
    });
  });

  describe('execute - custom event sources', () => {
    it('should wait for event on custom target', async () => {
      const context = createMockContext();
      const customElement = document.createElement('button');
      document.body.appendChild(customElement);

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'click',
          target: customElement,
        },
        context
      );

      // Trigger event on custom element
      setTimeout(() => {
        customElement.dispatchEvent(new Event('click'));
      }, 10);

      const output = await waitPromise;

      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('click');
      expect((output.result as Event).target).toBe(customElement);

      document.body.removeChild(customElement);
    });

    it('should not fire when event happens on wrong element', async () => {
      const context = createMockContext();
      const customElement = document.createElement('button');
      const wrongElement = document.createElement('button');
      document.body.appendChild(customElement);
      document.body.appendChild(wrongElement);

      // Start waiting on custom element
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'click',
          target: customElement,
        },
        context
      );

      // Trigger event on wrong element
      setTimeout(() => {
        wrongElement.dispatchEvent(new Event('click'));
      }, 10);

      // Trigger on correct element after delay
      setTimeout(() => {
        customElement.dispatchEvent(new Event('click'));
      }, 50);

      const output = await waitPromise;

      // Should wait for correct element
      expect(output.duration).toBeGreaterThanOrEqual(45);
      expect((output.result as Event).target).toBe(customElement);

      document.body.removeChild(customElement);
      document.body.removeChild(wrongElement);
    });

    it('should handle window as event target', async () => {
      const context = createMockContext();

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'customEvent',
          target: window,
        },
        context
      );

      // Trigger event on window
      setTimeout(() => {
        window.dispatchEvent(new Event('customEvent'));
      }, 10);

      const output = await waitPromise;

      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('customEvent');
    });

    it('should update context.it with event from custom target', async () => {
      const context = createMockContext();
      const customElement = document.createElement('div');
      document.body.appendChild(customElement);

      // Start waiting
      const waitPromise = command.execute(
        {
          type: 'event',
          eventName: 'custom',
          target: customElement,
        },
        context
      );

      // Trigger event
      setTimeout(() => {
        customElement.dispatchEvent(new Event('custom'));
      }, 10);

      await waitPromise;

      expect(context.it).toBeInstanceOf(Event);
      expect((context.it as Event).type).toBe('custom');
      expect((context.it as Event).target).toBe(customElement);

      document.body.removeChild(customElement);
    });
  });

  describe('integration - custom event sources', () => {
    it('should wait for load from iframe end-to-end', async () => {
      const context = createMockContext();
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='load') return 'load';
            if ((node as unknown as { value: unknown }).value ==='<iframe/>') return iframe;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'load' },
            from: { value: '<iframe/>' },
          },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger load event on iframe
      setTimeout(() => {
        iframe.dispatchEvent(new Event('load'));
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('load');
      expect((output.result as Event).target).toBe(iframe);

      document.body.removeChild(iframe);
    });

    it('should combine custom source with destructuring end-to-end', async () => {
      const context = createMockContext();
      const customElement = document.createElement('div');
      document.body.appendChild(customElement);

      const evaluator = {
        evaluate: async (node: ASTNode, context: ExecutionContext) => {
          if (typeof node === 'object' && 'value' in node) {
            if ((node as unknown as { value: unknown }).value ==='mousemove(clientX, clientY)') {
              return 'mousemove(clientX, clientY)';
            }
            if ((node as unknown as { value: unknown }).value ==='customElement') return customElement;
          }
          return (node as unknown as { value: unknown }).value;
        },
      };

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: 'placeholder' }],
          modifiers: {
            for: { value: 'mousemove(clientX, clientY)' },
            from: { value: 'customElement' },
          },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger event on custom element
      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 300,
          clientY: 400,
        });
        customElement.dispatchEvent(event);
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect((output.result as MouseEvent).clientX).toBe(300);
      expect((output.result as MouseEvent).clientY).toBe(400);
      expect((output.result as Event).target).toBe(customElement);
      expect(context.locals.get('clientX')).toBe(300);
      expect(context.locals.get('clientY')).toBe(400);

      document.body.removeChild(customElement);
    });
  });
});
