/**
 * Test suite for Wait Command with comprehensive LSP-integrated patterns
 * Tests timing, events, async behavior and Promise handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import type { ExecutionContext } from '../../types/core';
import { WaitCommand } from './wait';

// Mock timers
vi.useFakeTimers();

describe('Wait Command with LSP Integration', () => {
  let command: WaitCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    command = new WaitCommand();
    testElement = createTestElement('<div id="test-element">Test Element</div>');
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
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  describe('Command Metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('wait');
      expect(command.syntax).toBe('wait (<time expression> | for (<event> [from <source>]) [or ...] )');
      expect(command.isBlocking).toBe(true);
      expect(command.hasBody).toBe(false);
      expect(command.implicitTarget).toBe('me');
    });

    it('should have correct description from LSP', () => {
      expect(command.description).toContain('wait for an event to occur or for a fixed amount of time');
    });
  });

  describe('Time-based Waiting - LSP Examples', () => {
    it('should wait for numeric milliseconds (10 = 10ms)', async () => {
      const startTime = Date.now();
      const waitPromise = command.execute(context, 10);
      
      // Fast-forward time
      await vi.advanceTimersByTimeAsync(10);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should wait for milliseconds with "ms" suffix (100 ms)', async () => {
      const waitPromise = command.execute(context, '100ms');
      
      await vi.advanceTimersByTimeAsync(100);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should wait for milliseconds with full word (100 milliseconds)', async () => {
      const waitPromise = command.execute(context, '100 milliseconds');
      
      await vi.advanceTimersByTimeAsync(100);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should wait for seconds with "s" suffix (1 s = 1000ms)', async () => {
      const waitPromise = command.execute(context, '1s');
      
      await vi.advanceTimersByTimeAsync(1000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should wait for seconds with full word (1 seconds = 1000ms)', async () => {
      const waitPromise = command.execute(context, '1 seconds');
      
      await vi.advanceTimersByTimeAsync(1000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    // LSP Example: "on htmx:afterRequest wait 2s then put '' into #messages"
    it('should handle LSP example: wait 2s', async () => {
      const waitPromise = command.execute(context, '2s');
      
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    // LSP Example: "on load wait 2s then remove me"
    it('should handle LSP example: wait 2s for element removal', async () => {
      const waitPromise = command.execute(context, '2s');
      
      // Simulate the wait completing
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    // LSP Example: "on load wait 2s then transition my opacity to 0 then remove me"
    it('should handle LSP example: wait 2s before transition', async () => {
      const waitPromise = command.execute(context, '2s');
      
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    // LSP Example: "on click wait 5s send hello to .target"
    it('should handle LSP example: wait 5s before sending event', async () => {
      const waitPromise = command.execute(context, '5s');
      
      await vi.advanceTimersByTimeAsync(5000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    // LSP Example from repeat: "wait 2s" in loop
    it('should handle LSP example: wait 2s in repeat loop', async () => {
      const waitPromise = command.execute(context, '2s');
      
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should support dynamic timeouts with parentheses', async () => {
      // LSP Example: "wait for click or (config.clickTimeout) ms"
      context.locals.set('config', { clickTimeout: 300 });
      
      const waitPromise = command.execute(context, { type: 'timeout', value: 300, unit: 'ms' });
      
      await vi.advanceTimersByTimeAsync(300);
      await waitPromise;
      
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('Event-based Waiting - LSP Examples', () => {
    it('should wait for single event', async () => {
      const waitPromise = command.execute(context, { type: 'event', eventName: 'click' });
      
      // Simulate event
      testElement.click();
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect((result as Event).type).toBe('click');
    });

    // LSP Example: "wait for load or 1s"
    it('should handle LSP example: wait for load or timeout', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'load' }],
        timeout: { value: 1000, unit: 'ms' }
      });
      
      // Simulate load event firing
      const loadEvent = new Event('load');
      testElement.dispatchEvent(loadEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect((result as Event).type).toBe('load');
    });

    it('should handle timeout when event does not fire', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'load' }],
        timeout: { value: 1000, unit: 'ms' }
      });
      
      // Don't fire event, let timeout occur
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await waitPromise;
      // Should return timeout result, not an Event
      expect(result).not.toBeInstanceOf(Event);
    });

    // LSP Example: "wait for transitionend"
    it('should handle LSP example: wait for transitionend', async () => {
      const waitPromise = command.execute(context, { type: 'event', eventName: 'transitionend' });
      
      // Simulate transition end
      const transitionEvent = new Event('transitionend');
      testElement.dispatchEvent(transitionEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect((result as Event).type).toBe('transitionend');
    });

    // LSP Example: "wait for mousemove(clientX, clientY) or mouseup(clientX, clientY) from document"
    it('should handle LSP example: wait for mouse events with destructuring', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [
          { eventName: 'mousemove', destructure: ['clientX', 'clientY'], source: document },
          { eventName: 'mouseup', destructure: ['clientX', 'clientY'], source: document }
        ]
      });
      
      // Simulate mousemove event
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 200 });
      document.dispatchEvent(mouseMoveEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(MouseEvent);
      expect((result as MouseEvent).type).toBe('mousemove');
      expect((result as MouseEvent).clientX).toBe(100);
      expect((result as MouseEvent).clientY).toBe(200);
    });

    it('should handle multiple event options (or clause)', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [
          { eventName: 'click' },
          { eventName: 'keydown' }
        ]
      });
      
      // Fire the second event
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      testElement.dispatchEvent(keyEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(KeyboardEvent);
      expect((result as KeyboardEvent).type).toBe('keydown');
    });

    it('should handle events from different sources', async () => {
      const otherElement = createTestElement('<div id="other">Other</div>');
      document.body.appendChild(otherElement);
      
      const waitPromise = command.execute(context, {
        type: 'event',
        eventName: 'click',
        source: otherElement
      });
      
      // Fire event on other element
      otherElement.click();
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect((result as Event).target).toBe(otherElement);
    });
  });

  describe('Event Destructuring', () => {
    it('should destructure event properties into local variables', async () => {
      const waitPromise = command.execute(context, {
        type: 'event',
        eventName: 'click',
        destructure: ['clientX', 'clientY']
      });
      
      // Simulate click with coordinates
      const clickEvent = new MouseEvent('click', { clientX: 150, clientY: 250 });
      testElement.dispatchEvent(clickEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(MouseEvent);
      
      // Check that variables were set in context
      expect(context.locals.get('clientX')).toBe(150);
      expect(context.locals.get('clientY')).toBe(250);
    });

    it('should handle destructuring with keyboard events', async () => {
      const waitPromise = command.execute(context, {
        type: 'event',
        eventName: 'keydown',
        destructure: ['key', 'code']
      });
      
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
      testElement.dispatchEvent(keyEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(KeyboardEvent);
      expect(context.locals.get('key')).toBe('Enter');
      expect(context.locals.get('code')).toBe('Enter');
    });
  });

  describe('Mixed Timeout and Events - LSP Examples', () => {
    // LSP Example: "wait for click or (config.clickTimeout) ms"
    it('should handle LSP example: event or dynamic timeout', async () => {
      context.locals.set('config', { clickTimeout: 500 });
      
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'click' }],
        timeout: { value: 500, unit: 'ms' }
      });
      
      // Fire click before timeout
      setTimeout(() => {
        testElement.click();
      }, 200);
      
      await vi.advanceTimersByTimeAsync(200);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect((result as Event).type).toBe('click');
    });

    // LSP Example: "Fail if the thing doesn't load after 1s"
    it('should handle LSP example: load timeout check', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'load' }],
        timeout: { value: 1, unit: 's' }
      });
      
      // Let timeout occur without load event
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await waitPromise;
      // Result should not be an Event (timeout occurred)
      expect(result).not.toBeInstanceOf(Event);
      
      // Context should have result available for subsequent if check
      expect(context.result).not.toBeInstanceOf(Event);
    });

    it('should set context.result appropriately for mixed waits', async () => {
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'load' }],
        timeout: { value: 100, unit: 'ms' }
      });
      
      const loadEvent = new Event('load');
      testElement.dispatchEvent(loadEvent);
      
      const result = await waitPromise;
      expect(result).toBeInstanceOf(Event);
      expect(context.result).toBeInstanceOf(Event);
    });
  });

  describe('Async Behavior and Context', () => {
    it('should be asynchronous and not block execution', async () => {
      const executionOrder: string[] = [];
      
      // Start wait
      const waitPromise = command.execute(context, '100ms').then(() => {
        executionOrder.push('wait-complete');
      });
      
      // This should execute immediately
      executionOrder.push('after-wait-start');
      
      // Complete the wait
      await vi.advanceTimersByTimeAsync(100);
      await waitPromise;
      
      expect(executionOrder).toEqual(['after-wait-start', 'wait-complete']);
    });

    it('should preserve context during wait', async () => {
      context.locals.set('beforeWait', 'value');
      
      const waitPromise = command.execute(context, '50ms');
      
      await vi.advanceTimersByTimeAsync(50);
      await waitPromise;
      
      expect(context.locals.get('beforeWait')).toBe('value');
    });

    it('should handle Promise rejections gracefully', async () => {
      // Mock a failing timer
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        setTimeout(() => callback(new Error('Timer failed')), delay);
        return 123;
      });
      
      try {
        await expect(command.execute(context, '100ms')).rejects.toThrow();
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('Command Validation', () => {
    it('should validate time expressions', () => {
      expect(command.validate(['100ms'])).toBeNull();
      expect(command.validate(['2s'])).toBeNull();
      expect(command.validate(['5 seconds'])).toBeNull();
      expect(command.validate([500])).toBeNull();
      expect(command.validate(['invalid'])).toBe('Invalid time expression: invalid');
    });

    it('should validate event expressions', () => {
      expect(command.validate([{ type: 'event', eventName: 'click' }])).toBeNull();
      expect(command.validate([{ type: 'event', eventName: '' }])).toBe('Event name cannot be empty');
      expect(command.validate([{ type: 'event' }])).toBe('Event configuration missing eventName');
    });

    it('should validate mixed expressions', () => {
      expect(command.validate([{
        type: 'mixed',
        events: [{ eventName: 'click' }],
        timeout: { value: 1000, unit: 'ms' }
      }])).toBeNull();
      
      expect(command.validate([{
        type: 'mixed',
        events: [],
        timeout: { value: 1000, unit: 'ms' }
      }])).toBe('Mixed wait must include at least one event');
    });

    it('should require at least one argument', () => {
      expect(command.validate([])).toBe('Wait command requires a time expression or event specification');
    });

    it('should reject too many arguments', () => {
      expect(command.validate(['1s', 'extra', 'args'])).toBe('Wait command accepts at most one argument');
    });
  });

  describe('Time Unit Parsing', () => {
    it('should parse various time formats correctly', () => {
      const timeTests = [
        { input: 100, expected: 100 },
        { input: '100ms', expected: 100 },
        { input: '100 ms', expected: 100 },
        { input: '100 milliseconds', expected: 100 },
        { input: '2s', expected: 2000 },
        { input: '2 s', expected: 2000 },
        { input: '2 seconds', expected: 2000 },
        { input: '1 second', expected: 1000 },
        { input: '0.5s', expected: 500 },
        { input: '1.5 seconds', expected: 1500 }
      ];

      timeTests.forEach(({ input, expected }) => {
        const parsed = command.parseTimeExpression(input);
        expect(parsed).toBe(expected);
      });
    });

    it('should handle edge cases in time parsing', () => {
      expect(command.parseTimeExpression('0ms')).toBe(0);
      expect(command.parseTimeExpression('0')).toBe(0);
      expect(() => command.parseTimeExpression('-100ms')).toThrow('Time value cannot be negative');
      expect(() => command.parseTimeExpression('not-a-time')).toThrow('Invalid time expression');
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up event listeners after event fires', async () => {
      const addEventListenerSpy = vi.spyOn(testElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(testElement, 'removeEventListener');
      
      const waitPromise = command.execute(context, { type: 'event', eventName: 'click' });
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
      
      testElement.click();
      await waitPromise;
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
    });

    it('should clean up multiple event listeners', async () => {
      const addEventListenerSpy = vi.spyOn(testElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(testElement, 'removeEventListener');
      
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [
          { eventName: 'click' },
          { eventName: 'keydown' }
        ]
      });
      
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      
      testElement.click();
      await waitPromise;
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
    });

    it('should clean up on timeout', async () => {
      const addEventListenerSpy = vi.spyOn(testElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(testElement, 'removeEventListener');
      
      const waitPromise = command.execute(context, {
        type: 'mixed',
        events: [{ eventName: 'click' }],
        timeout: { value: 100, unit: 'ms' }
      });
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
      
      await vi.advanceTimersByTimeAsync(100);
      await waitPromise;
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event sources', async () => {
      await expect(command.execute(context, {
        type: 'event',
        eventName: 'click',
        source: null as any
      })).rejects.toThrow('Invalid event source');
    });

    it('should handle malformed event configurations', async () => {
      await expect(command.execute(context, {
        type: 'event'
      } as any)).rejects.toThrow('Event configuration missing eventName');
    });

    it('should emit error events on failures', async () => {
      const errorHandler = vi.fn();
      testElement.addEventListener('hyperscript:error', errorHandler);

      try {
        await command.execute(context, 'invalid-time');
      } catch (e) {
        // Expected to throw
      }

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hyperscript:error',
          detail: expect.objectContaining({
            command: 'wait',
            error: expect.any(Error)
          })
        })
      );
    });
  });

  describe('Integration with Context Result', () => {
    it('should set context.result to event when event fires', async () => {
      const waitPromise = command.execute(context, { type: 'event', eventName: 'click' });
      
      const clickEvent = new MouseEvent('click');
      testElement.dispatchEvent(clickEvent);
      
      await waitPromise;
      
      expect(context.result).toBeInstanceOf(Event);
      expect((context.result as Event).type).toBe('click');
    });

    it('should set context.result appropriately for timeouts', async () => {
      const waitPromise = command.execute(context, '100ms');
      
      await vi.advanceTimersByTimeAsync(100);
      await waitPromise;
      
      // For time-based waits, result should indicate successful completion
      expect(context.result).toBeDefined();
    });
  });
});