/**
 * Tests for send command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SendCommand } from './send';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Send Command', () => {
  let command: SendCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new SendCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();

    // Mock document.dispatchEvent and element.dispatchEvent
    vi.spyOn(document, 'dispatchEvent').mockReturnValue(true);
    vi.spyOn(testElement, 'dispatchEvent').mockReturnValue(true);

    // Mock CustomEvent constructor to ensure it works properly in tests
    global.CustomEvent = vi.fn().mockImplementation((type: string, options?: any) => ({
      type,
      bubbles: options?.bubbles || false,
      cancelable: options?.cancelable || false,
      detail: options?.detail || {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('send');
      expect(command.syntax).toBe(
        'send <event-name>[(<named arguments>)] [to <expression>]\ntrigger <event-name>[(<named arguments>)] [on <expression>]'
      );
      expect(command.description).toBe(
        'The send command sends an event to the given target. Arguments can optionally be provided in a named argument list and will be passed in the event.detail object.\nYou can alternatively use the equivalent trigger syntax.'
      );
    });
  });

  describe('Basic Event Dispatch', () => {
    it('should dispatch simple event to current element', async () => {
      await command.execute(context, 'myEvent');

      expect(testElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'myEvent',
          bubbles: true,
          cancelable: true,
        })
      );
    });

    it('should dispatch event with custom name', async () => {
      await command.execute(context, 'customEvent');

      expect(testElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'customEvent',
        })
      );
    });

    it('should create CustomEvent by default', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        bubbles: options?.bubbles || false,
        cancelable: options?.cancelable || false,
        detail: options?.detail,
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'testEvent');

      expect(mockCustomEvent).toHaveBeenCalledWith('testEvent', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });
  });

  describe('Event Dispatch with Arguments', () => {
    it('should dispatch event with single named argument', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'doIt', { answer: 42 });

      expect(mockCustomEvent).toHaveBeenCalledWith('doIt', {
        bubbles: true,
        cancelable: true,
        detail: { answer: 42 },
      });
    });

    it('should dispatch event with multiple named arguments', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'userAction', {
        name: 'John',
        age: 30,
        active: true,
      });

      expect(mockCustomEvent).toHaveBeenCalledWith('userAction', {
        bubbles: true,
        cancelable: true,
        detail: { name: 'John', age: 30, active: true },
      });
    });

    it('should handle empty argument object', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'emptyArgs', {});

      expect(mockCustomEvent).toHaveBeenCalledWith('emptyArgs', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });

    it('should handle complex argument values', async () => {
      const complexData = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
        metadata: { timestamp: Date.now() },
      };

      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'complexEvent', complexData);

      expect(mockCustomEvent).toHaveBeenCalledWith('complexEvent', {
        bubbles: true,
        cancelable: true,
        detail: complexData,
      });
    });
  });

  describe('Event Target Specification - "to" syntax', () => {
    it('should dispatch event to specific element by ID', async () => {
      const targetElement = createTestElement('<div id="div1">Target</div>');
      document.body.appendChild(targetElement);

      // Create a spy that captures the event object
      const dispatchSpy = vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);

      // Mock querySelector to return our target
      vi.spyOn(document, 'querySelector').mockReturnValue(targetElement);

      const result = await command.execute(context, 'doIt', { answer: 42 }, 'to', '#div1');

      expect(document.querySelector).toHaveBeenCalledWith('#div1');
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      // Check the actual event object passed to dispatchEvent
      const eventArg = dispatchSpy.mock.calls[0][0];
      expect(eventArg).toBeDefined();
      expect(eventArg.type).toBe('doIt');
      expect(eventArg.detail).toEqual({ answer: 42 });

      document.body.removeChild(targetElement);
    });

    it('should dispatch event to specific element object', async () => {
      const targetElement = createTestElement('<div>Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);

      await command.execute(context, 'testEvent', null, 'to', targetElement);

      expect(targetElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'testEvent',
        })
      );
    });

    it('should dispatch event to multiple elements via querySelectorAll', async () => {
      const element1 = createTestElement('<form class="target">Form 1</form>');
      const element2 = createTestElement('<form class="target">Form 2</form>');

      vi.spyOn(element1, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(element2, 'dispatchEvent').mockReturnValue(true);

      const nodeList = [element1, element2];
      vi.spyOn(document, 'querySelectorAll').mockReturnValue(nodeList as any);

      await command.execute(context, 'hello', null, 'to', '<form />');

      expect(document.querySelectorAll).toHaveBeenCalledWith('form');
      expect(element1.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hello' })
      );
      expect(element2.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hello' })
      );
    });

    it('should handle non-existent targets gracefully', async () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      await expect(async () => {
        await command.execute(context, 'testEvent', null, 'to', '#nonexistent');
      }).rejects.toThrow('Target element not found: #nonexistent');
    });
  });

  describe('Event Target Specification - "on" syntax (trigger)', () => {
    it('should support "on" syntax as alias for "to"', async () => {
      const targetElement = createTestElement('<div id="target">Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(document, 'querySelector').mockReturnValue(targetElement);

      // Create trigger command variant
      const triggerCommand = new SendCommand();
      triggerCommand.name = 'trigger';

      await triggerCommand.execute(context, 'doIt', { answer: 42 }, 'on', '#target');

      expect(targetElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'doIt',
        })
      );
    });

    it('should handle "on" with current element (no target)', async () => {
      await command.execute(context, 'selfEvent', null, 'on', testElement);

      expect(testElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'selfEvent',
        })
      );
    });
  });

  describe('Event Options and Properties', () => {
    it('should set event bubbles to true by default', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        bubbles: options?.bubbles,
        cancelable: options?.cancelable,
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'bubblingEvent');

      expect(mockCustomEvent).toHaveBeenCalledWith('bubblingEvent', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });

    it('should set event cancelable to true by default', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        bubbles: options?.bubbles,
        cancelable: options?.cancelable,
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'cancelableEvent');

      expect(mockCustomEvent).toHaveBeenCalledWith('cancelableEvent', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });

    it('should preserve event detail structure', async () => {
      const eventDetail = {
        user: { name: 'Test User', id: 123 },
        action: 'click',
        timestamp: Date.now(),
      };

      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail,
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'detailedEvent', eventDetail);

      expect(mockCustomEvent).toHaveBeenCalledWith('detailedEvent', {
        bubbles: true,
        cancelable: true,
        detail: eventDetail,
      });
    });
  });

  describe('Event Types and Creation', () => {
    it('should create standard DOM events when appropriate', async () => {
      const mockEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        bubbles: options?.bubbles || false,
      }));
      global.Event = mockEvent;

      // For standard events, might use Event instead of CustomEvent
      await command.execute(context, 'click');

      // Should still work with CustomEvent for consistency
      expect(testElement.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle event name validation', async () => {
      // Test with empty event name
      await expect(async () => {
        await command.execute(context, '');
      }).rejects.toThrow('Event name cannot be empty');

      // Test with invalid characters in event name
      await expect(async () => {
        await command.execute(context, 'invalid event name');
      }).rejects.toThrow('Invalid event name format');
    });

    it('should support custom event names with special characters', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'my-custom-event');

      expect(mockCustomEvent).toHaveBeenCalledWith('my-custom-event', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });

    it('should support namespace-style event names', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'app:user:login');

      expect(mockCustomEvent).toHaveBeenCalledWith('app:user:login', {
        bubbles: true,
        cancelable: true,
        detail: {},
      });
    });
  });

  describe('Validation', () => {
    it('should validate basic send syntax', () => {
      const error = command.validate(['myEvent']);
      expect(error).toBe(null);
    });

    it('should validate send with arguments', () => {
      const error = command.validate(['myEvent', { data: 'test' }]);
      expect(error).toBe(null);
    });

    it('should validate send with target', () => {
      const error = command.validate(['myEvent', null, 'to', '#target']);
      expect(error).toBe(null);
    });

    it('should validate trigger syntax', () => {
      const error = command.validate(['myEvent', null, 'on', '#target']);
      expect(error).toBe(null);
    });

    it('should require event name', () => {
      const error = command.validate([]);
      expect(error).toBe('Send command requires an event name');
    });

    it('should validate target keyword placement', () => {
      const error = command.validate(['myEvent', null, 'invalid', '#target']);
      expect(error).toBe('Invalid send syntax. Expected "to" or "on" keyword');
    });

    it('should require target after "to" keyword', () => {
      const error = command.validate(['myEvent', null, 'to']);
      expect(error).toBe('Send command requires target after "to"');
    });

    it('should require target after "on" keyword', () => {
      const error = command.validate(['myEvent', null, 'on']);
      expect(error).toBe('Send command requires target after "on"');
    });

    it('should validate event name type', () => {
      const error = command.validate([123]);
      expect(error).toBe('Event name must be a string');
    });

    it('should validate arguments type when provided', () => {
      const error = command.validate(['myEvent', 'invalid-args']);
      expect(error).toBe('Event arguments must be an object or null');
    });
  });

  describe('Error Handling', () => {
    it('should handle event creation errors', async () => {
      // Mock CustomEvent to throw an error
      global.CustomEvent = vi.fn().mockImplementation(() => {
        throw new Error('Event creation failed');
      });

      await expect(async () => {
        await command.execute(context, 'failingEvent');
      }).rejects.toThrow('Event creation failed');
    });

    it('should handle event dispatch errors', async () => {
      vi.spyOn(testElement, 'dispatchEvent').mockImplementation(() => {
        throw new Error('Dispatch failed');
      });

      await expect(async () => {
        await command.execute(context, 'testEvent');
      }).rejects.toThrow('Dispatch failed');
    });

    it('should handle target resolution errors', async () => {
      vi.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('Query failed');
      });

      await expect(async () => {
        await command.execute(context, 'testEvent', null, 'to', '#target');
      }).rejects.toThrow('Query failed');
    });

    it('should handle null/undefined arguments gracefully', async () => {
      // Should not throw when handling null arguments
      await expect(command.execute(context, 'testEvent', null)).resolves.toBeDefined();

      // Should not throw when handling undefined arguments
      await expect(command.execute(context, 'testEvent', undefined)).resolves.toBeDefined();
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: send with arguments to specific element', async () => {
      // From LSP: on click send doIt(answer:42) to #div1
      const targetElement = createTestElement('<div id="div1">Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(document, 'querySelector').mockReturnValue(targetElement);

      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'doIt', { answer: 42 }, 'to', '#div1');

      expect(mockCustomEvent).toHaveBeenCalledWith('doIt', {
        bubbles: true,
        cancelable: true,
        detail: { answer: 42 },
      });
      expect(targetElement.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle LSP example 2: trigger syntax', async () => {
      // From LSP: on click trigger doIt(answer:42) end
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      const triggerCommand = new SendCommand();
      triggerCommand.name = 'trigger';

      await triggerCommand.execute(context, 'doIt', { answer: 42 });

      expect(mockCustomEvent).toHaveBeenCalledWith('doIt', {
        bubbles: true,
        cancelable: true,
        detail: { answer: 42 },
      });
      expect(testElement.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle LSP example 3: simple send to element', async () => {
      // From LSP: on click send hello to <form />
      const formElement = createTestElement('<form>Form</form>');
      vi.spyOn(formElement, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(document, 'querySelector').mockReturnValue(formElement);
      vi.spyOn(document, 'querySelectorAll').mockReturnValue([formElement] as any);

      await command.execute(context, 'hello', null, 'to', 'form');

      expect(formElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hello',
        })
      );
    });

    it('should handle LSP example 4: delayed send', async () => {
      // From LSP: wait 5s send hello to .target
      const targetElement = createTestElement('<div class="target">Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(document, 'querySelector').mockReturnValue(targetElement);
      vi.spyOn(document, 'querySelectorAll').mockReturnValue([targetElement] as any);

      // Simulate the send part (wait would be handled by wait command)
      await command.execute(context, 'hello', null, 'to', '.target');

      expect(targetElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hello',
        })
      );
    });

    it('should handle LSP example 5: event removal pattern', async () => {
      // From LSP: on doIt remove me (event handler)
      // The send part: on click send doIt to #event-target-3
      const targetElement = createTestElement('<div id="event-target-3">Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);
      vi.spyOn(document, 'querySelector').mockReturnValue(targetElement);

      await command.execute(context, 'doIt', null, 'to', '#event-target-3');

      expect(targetElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'doIt',
        })
      );
    });
  });

  describe('Event Propagation and Bubbling', () => {
    it('should create events that bubble by default', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => {
        return {
          type,
          bubbles: options?.bubbles,
          cancelable: options?.cancelable,
          detail: options?.detail,
        };
      });
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'bubblingEvent');

      expect(mockCustomEvent).toHaveBeenCalledWith(
        'bubblingEvent',
        expect.objectContaining({
          bubbles: true,
        })
      );
    });

    it('should create cancelable events by default', async () => {
      const mockCustomEvent = vi.fn().mockImplementation((type, options) => {
        return {
          type,
          bubbles: options?.bubbles,
          cancelable: options?.cancelable,
          detail: options?.detail,
        };
      });
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'cancelableEvent');

      expect(mockCustomEvent).toHaveBeenCalledWith(
        'cancelableEvent',
        expect.objectContaining({
          cancelable: true,
        })
      );
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with context variables in event data', async () => {
      context.locals.set('userId', 123);
      context.locals.set('action', 'click');

      const eventData = {
        userId: context.locals.get('userId'),
        action: context.locals.get('action'),
      };

      const mockCustomEvent = vi.fn().mockImplementation((type, options) => ({
        type,
        detail: options?.detail || {},
      }));
      global.CustomEvent = mockCustomEvent;

      await command.execute(context, 'userAction', eventData);

      expect(mockCustomEvent).toHaveBeenCalledWith('userAction', {
        bubbles: true,
        cancelable: true,
        detail: { userId: 123, action: 'click' },
      });
    });

    it('should work with dynamic event names', async () => {
      context.locals.set('eventType', 'customEvent');

      const eventName = context.locals.get('eventType');

      await command.execute(context, eventName);

      expect(testElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'customEvent',
        })
      );
    });

    it('should work with dynamic targets from context', async () => {
      const targetElement = createTestElement('<div class="dynamic-target">Target</div>');
      vi.spyOn(targetElement, 'dispatchEvent').mockReturnValue(true);

      context.locals.set('target', targetElement);

      const target = context.locals.get('target');

      await command.execute(context, 'dynamicEvent', null, 'to', target);

      expect(targetElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dynamicEvent',
        })
      );
    });
  });
});
