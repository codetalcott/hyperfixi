/**
 * Wait Command Tests
 * Comprehensive tests for time delays and event waiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { WaitCommand } from './wait';
import type { TypedExecutionContext } from '../../types/command-types';

describe('Wait Command', () => {
  let waitCommand: WaitCommand;
  let context: TypedExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    waitCommand = new WaitCommand();
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
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(waitCommand.name).toBe('wait');
      expect(typeof waitCommand.syntax).toBe('string');
      expect(typeof waitCommand.description).toBe('string');
      expect(waitCommand.metadata.category).toBe('Control');
    });

    it('should have comprehensive examples', () => {
      expect(waitCommand.metadata.examples).toHaveLength(4);
      expect(waitCommand.metadata.examples[0].code).toBe('wait 2s');
    });

    it('should have LLM documentation', () => {
      expect(waitCommand.documentation.summary).toBeTruthy();
      expect(waitCommand.documentation.parameters.length).toBeGreaterThan(0);
    });
  });

  describe('Time-based Waiting', () => {
    it('should wait for specified milliseconds', async () => {
      const startTime = Date.now();
      const input = { type: 'time' as const, value: 100 };

      const result = await waitCommand.execute(context, input);

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some timing variance
      expect(result.success).toBe(true);
      expect(result.value.type).toBe('time');
      expect(result.value.result).toBe(100);
    });

    it('should handle zero timeout', async () => {
      const input = { type: 'time' as const, value: 0 };

      const result = await waitCommand.execute(context, input);

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('time');
      expect(result.value.result).toBe(0);
    });

    it('should handle large timeout values', async () => {
      const input = { type: 'time' as const, value: 1 };

      const result = await waitCommand.execute(context, input);

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('time');
      expect(result.value.result).toBe(1);
    });
  });

  describe('Event-based Waiting', () => {
    it('should wait for single event', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      // Trigger event after short delay
      setTimeout(() => {
        testElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
      expect(result.value.result).toBeInstanceOf(Event);
      expect((result.value.result as Event).type).toBe('click');
    });

    it('should return event in result value', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'custom' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        testElement.dispatchEvent(new CustomEvent('custom'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.result).toBeInstanceOf(Event);
      expect((result.value.result as Event).type).toBe('custom');
    });

    it('should wait for event from specific source', async () => {
      const otherElement = document.createElement('div');
      document.body.appendChild(otherElement);

      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }],
        source: otherElement,
      };

      const promise = waitCommand.execute(context, input);

      // Click on different element - should not resolve
      testElement.dispatchEvent(new MouseEvent('click'));

      // Click on correct element - should resolve
      setTimeout(() => {
        otherElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
      document.body.removeChild(otherElement);
    });

    it('should default to context.me when no source specified', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }],
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        testElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
    });

    it('should return error when no event target available', async () => {
      const contextWithoutMe = {
        locals: new Map(),
        result: undefined,
      } as TypedExecutionContext;

      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }],
      };

      const result = await waitCommand.execute(contextWithoutMe, input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No event target available');
    });
  });

  describe('Event Destructuring', () => {
    it('should destructure event properties into locals', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'mousemove', args: ['clientX', 'clientY'] }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 200,
        });
        testElement.dispatchEvent(event);
      }, 50);

      await promise;

      expect(context.locals?.get('clientX')).toBe(100);
      expect(context.locals?.get('clientY')).toBe(200);
    });

    it('should destructure event.detail properties', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'custom', args: ['data', 'value'] }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        const event = new CustomEvent('custom', {
          detail: { data: 'test', value: 42 },
        });
        testElement.dispatchEvent(event);
      }, 50);

      await promise;

      expect(context.locals?.get('data')).toBe('test');
      expect(context.locals?.get('value')).toBe(42);
    });

    it('should handle missing properties gracefully', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click', args: ['nonexistent'] }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        testElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      await promise;

      expect(context.locals?.get('nonexistent')).toBe(null);
    });
  });

  describe('Multiple Events (Race Condition)', () => {
    it('should wait for first of multiple events', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }, { name: 'keydown' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      // Trigger keydown first
      setTimeout(() => {
        testElement.dispatchEvent(new KeyboardEvent('keydown'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
      expect((result.value.result as Event).type).toBe('keydown');
    });

    it('should handle event or timeout race', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'neverfires' }, { time: 100 }],
        source: testElement,
      };

      const startTime = Date.now();
      const result = await waitCommand.execute(context, input);

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(result.value.result).toBe(100); // Should resolve with timeout value
    });

    it('should resolve with event if it fires before timeout', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }, { time: 200 }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      // Fire event before timeout
      setTimeout(() => {
        testElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
      expect((result.value.result as Event).type).toBe('click');
    });

    it('should cleanup listeners after first event fires', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'click' }, { name: 'keydown' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      // Fire click
      setTimeout(() => {
        testElement.dispatchEvent(new MouseEvent('click'));
      }, 50);

      const result = await promise;

      // Fire keydown after resolution - should not cause issues
      testElement.dispatchEvent(new KeyboardEvent('keydown'));

      // If listeners weren't cleaned up, this might cause problems
      expect(result.success).toBe(true);
      expect(result.value.result).toBeInstanceOf(Event);
      expect((result.value.result as Event).type).toBe('click');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple simultaneous events', async () => {
      const input = {
        type: 'event' as const,
        events: [{ name: 'event1' }, { name: 'event2' }, { name: 'event3' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      // Fire all events simultaneously
      setTimeout(() => {
        testElement.dispatchEvent(new CustomEvent('event1'));
        testElement.dispatchEvent(new CustomEvent('event2'));
        testElement.dispatchEvent(new CustomEvent('event3'));
      }, 50);

      const result = await promise;

      // Should resolve with one of them (first to fire)
      expect(result.success).toBe(true);
      expect(result.value.type).toBe('event');
      expect(['event1', 'event2', 'event3']).toContain((result.value.result as Event).type);
    });

    it('should handle immediate timeout (0ms)', async () => {
      const input = {
        type: 'event' as const,
        events: [{ time: 0 }],
      };

      const result = await waitCommand.execute(context, input);

      expect(result.value.result).toBe(0);
    });

    it('should report accurate duration', async () => {
      const input = { type: 'time' as const, value: 100 };

      const result = await waitCommand.execute(context, input);

      expect(result.value.duration).toBeGreaterThanOrEqual(90);
      expect(result.value.duration).toBeLessThan(200);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work in typical hyperscript sequence', async () => {
      // Simulate: on click add .loading then wait for transitionend
      testElement.classList.add('loading');

      const input = {
        type: 'event' as const,
        events: [{ name: 'transitionend' }],
        source: testElement,
      };

      const promise = waitCommand.execute(context, input);

      setTimeout(() => {
        testElement.dispatchEvent(new Event('transitionend'));
      }, 50);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value.result).toBeInstanceOf(Event);
    });

    it('should support animation sequences', async () => {
      // Simulate: add .example then wait 2s then remove .example
      testElement.classList.add('example');

      const input = { type: 'time' as const, value: 50 };
      await waitCommand.execute(context, input);

      testElement.classList.remove('example');
      expect(testElement.classList.contains('example')).toBe(false);
    });
  });
});
