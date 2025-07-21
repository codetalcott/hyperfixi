/**
 * Tests for halt command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HaltCommand } from './halt';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Halt Command', () => {
  let command: HaltCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;
  let mockEvent: Event;

  beforeEach(() => {
    command = new HaltCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags) context.flags = {
      halted: false,
      breaking: false,
      continuing: false,
      returning: false,
      async: false
    };
    
    // Create a mock event with preventDefault and stopPropagation
    mockEvent = {
      type: 'mousedown',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
    } as any;
    
    context.event = mockEvent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('halt');
      expect(command.syntax).toBe('halt [the event[\'s]] (bubbling|default) | halt');
      expect(command.description).toBe('The halt command prevents an event from bubbling and/or from performing its default action.');
    });

    it('should be a control flow command', () => {
      expect(command.isBlocking).toBe(true);
    });
  });

  describe('Basic Halt Functionality', () => {
    it('should halt both bubbling and default when called with no arguments', async () => {
      await command.execute(context);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true);
    });

    it('should halt both bubbling and default and exit with plain "halt"', async () => {
      const result = await command.execute(context);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true);
      expect(result).toBeUndefined(); // Command exits
    });

    it('should handle missing event gracefully', async () => {
      context.event = undefined;
      
      await command.execute(context);
      
      expect(context.flags?.halted).toBe(true);
    });
  });

  describe('Halt the Event Forms', () => {
    it('should halt both bubbling and default with "halt the event"', async () => {
      await command.execute(context, 'the', 'event');
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution
    });

    it('should halt only bubbling with "halt the event\'s bubbling"', async () => {
      await command.execute(context, 'the', 'event\'s', 'bubbling');
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution
    });

    it('should halt only default with "halt the event\'s default"', async () => {
      await command.execute(context, 'the', 'event\'s', 'default');
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution
    });

    it('should support "halt the event bubbling" without possessive', async () => {
      await command.execute(context, 'the', 'event', 'bubbling');
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false);
    });

    it('should support "halt the event default" without possessive', async () => {
      await command.execute(context, 'the', 'event', 'default');
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false);
    });
  });

  describe('Short Form Halt Commands', () => {
    it('should halt bubbling only and exit with "halt bubbling"', async () => {
      await command.execute(context, 'bubbling');
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true); // Exit execution
    });

    it('should halt default only and exit with "halt default"', async () => {
      await command.execute(context, 'default');
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true); // Exit execution
    });
  });

  describe('Event Property Access and Validation', () => {
    it('should work with events that support preventDefault', async () => {
      const clickEvent = {
        type: 'click',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        cancelable: true
      } as any;
      context.event = clickEvent;

      await command.execute(context, 'default');
      
      expect(clickEvent.preventDefault).toHaveBeenCalled();
    });

    it('should work with events that support stopPropagation', async () => {
      const keyEvent = {
        type: 'keydown',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true
      } as any;
      context.event = keyEvent;

      await command.execute(context, 'bubbling');
      
      expect(keyEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle non-cancelable events gracefully', async () => {
      const nonCancelableEvent = {
        type: 'focus',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        cancelable: false
      } as any;
      context.event = nonCancelableEvent;

      await expect(
        command.execute(context, 'default')
      ).resolves.not.toThrow();
    });

    it('should handle non-bubbling events gracefully', async () => {
      const nonBubblingEvent = {
        type: 'focus',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: false
      } as any;
      context.event = nonBubblingEvent;

      await expect(
        command.execute(context, 'bubbling')
      ).resolves.not.toThrow();
    });
  });

  describe('Event Method Safety', () => {
    it('should handle events without preventDefault method', async () => {
      const eventWithoutPreventDefault = {
        type: 'custom',
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true
        // No preventDefault method
      } as any;
      context.event = eventWithoutPreventDefault;

      await expect(
        command.execute(context, 'default')
      ).resolves.not.toThrow();
    });

    it('should handle events without stopPropagation method', async () => {
      const eventWithoutStopPropagation = {
        type: 'custom',
        preventDefault: vi.fn(),
        bubbles: true,
        cancelable: true
        // No stopPropagation method
      } as any;
      context.event = eventWithoutStopPropagation;

      await expect(
        command.execute(context, 'bubbling')
      ).resolves.not.toThrow();
    });

    it('should handle completely custom events', async () => {
      const customEvent = {
        type: 'totally-custom',
        customProperty: 'test'
        // No standard event methods
      } as any;
      context.event = customEvent;

      await expect(
        command.execute(context)
      ).resolves.not.toThrow();
      
      expect(context.flags?.halted).toBe(true);
    });
  });

  describe('Execution Flow Control', () => {
    it('should set halted flag to true when used as exit form', async () => {
      expect(context.flags?.halted).toBe(false);
      
      await command.execute(context);
      
      expect(context.flags?.halted).toBe(true);
    });

    it('should not set halted flag when using continue forms', async () => {
      expect(context.flags?.halted).toBe(false);
      
      await command.execute(context, 'the', 'event');
      
      expect(context.flags?.halted).toBe(false);
    });

    it('should preserve other execution flags', async () => {
      context.flags!.breaking = true;
      context.flags!.returning = false;
      
      await command.execute(context);
      
      expect(context.flags?.breaking).toBe(true);
      expect(context.flags?.returning).toBe(false);
      expect(context.flags?.halted).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate no arguments (basic halt)', () => {
      const error = command.validate([]);
      expect(error).toBe(null);
    });

    it('should validate short form "halt bubbling"', () => {
      const error = command.validate(['bubbling']);
      expect(error).toBe(null);
    });

    it('should validate short form "halt default"', () => {
      const error = command.validate(['default']);
      expect(error).toBe(null);
    });

    it('should validate "halt the event"', () => {
      const error = command.validate(['the', 'event']);
      expect(error).toBe(null);
    });

    it('should validate "halt the event\'s bubbling"', () => {
      const error = command.validate(['the', 'event\'s', 'bubbling']);
      expect(error).toBe(null);
    });

    it('should validate "halt the event\'s default"', () => {
      const error = command.validate(['the', 'event\'s', 'default']);
      expect(error).toBe(null);
    });

    it('should validate "halt the event bubbling"', () => {
      const error = command.validate(['the', 'event', 'bubbling']);
      expect(error).toBe(null);
    });

    it('should validate "halt the event default"', () => {
      const error = command.validate(['the', 'event', 'default']);
      expect(error).toBe(null);
    });

    it('should reject invalid first argument', () => {
      const error = command.validate(['invalid']);
      expect(error).toBe('Invalid halt syntax. Expected "bubbling", "default", or "the"');
    });

    it('should reject incomplete "the" form', () => {
      const error = command.validate(['the']);
      expect(error).toBe('Incomplete halt syntax. Expected "the event"');
    });

    it('should reject invalid event syntax', () => {
      const error = command.validate(['the', 'invalid']);
      expect(error).toBe('Invalid event syntax. Expected "event"');
    });

    it('should reject invalid possessive form', () => {
      const error = command.validate(['the', 'event\'s', 'invalid']);
      expect(error).toBe('Invalid event property. Expected "bubbling" or "default"');
    });

    it('should reject too many arguments', () => {
      const error = command.validate(['the', 'event', 'bubbling', 'extra']);
      expect(error).toBe('Too many arguments for halt command');
    });

    it('should handle edge case argument combinations', () => {
      const error1 = command.validate(['the', 'event', 'invalid']);
      expect(error1).toBe('Invalid event property. Expected "bubbling" or "default"');
      
      const error2 = command.validate(['the', 'event\'s']);
      expect(error2).toBe('Incomplete possessive syntax. Expected property after "event\'s"');
    });
  });

  describe('Error Handling', () => {
    it('should handle null context gracefully', async () => {
      const nullContext = {} as ExecutionContext;
      
      await expect(
        command.execute(nullContext)
      ).resolves.not.toThrow();
    });

    it('should handle context without flags', async () => {
      delete context.flags;
      
      await expect(
        command.execute(context)
      ).resolves.not.toThrow();
    });

    it('should handle preventDefault throwing error', async () => {
      mockEvent.preventDefault = vi.fn().mockImplementation(() => {
        throw new Error('preventDefault failed');
      });

      await expect(
        command.execute(context, 'default')
      ).resolves.not.toThrow();
      
      // Should still set other flags appropriately
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });

    it('should handle stopPropagation throwing error', async () => {
      mockEvent.stopPropagation = vi.fn().mockImplementation(() => {
        throw new Error('stopPropagation failed');
      });

      await expect(
        command.execute(context, 'bubbling')
      ).resolves.not.toThrow();
      
      // Should still handle default correctly
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: prevent text selection', async () => {
      // From LSP: on mousedown halt the event -- prevent text selection...
      const mousedownEvent = {
        type: 'mousedown',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true
      } as any;
      context.event = mousedownEvent;

      await command.execute(context, 'the', 'event');
      
      expect(mousedownEvent.preventDefault).toHaveBeenCalled();
      expect(mousedownEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution for other stuff
    });

    it('should handle typical form prevention pattern', async () => {
      // Common pattern: halt the event's default (prevent form submission)
      const submitEvent = {
        type: 'submit',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true
      } as any;
      context.event = submitEvent;

      await command.execute(context, 'the', 'event\'s', 'default');
      
      expect(submitEvent.preventDefault).toHaveBeenCalled();
      expect(submitEvent.stopPropagation).not.toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution
    });

    it('should handle typical bubbling prevention pattern', async () => {
      // Common pattern: halt the event's bubbling (stop event propagation)
      const clickEvent = {
        type: 'click',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true
      } as any;
      context.event = clickEvent;

      await command.execute(context, 'the', 'event\'s', 'bubbling');
      
      expect(clickEvent.preventDefault).not.toHaveBeenCalled();
      expect(clickEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(false); // Continue execution
    });

    it('should handle halt as flow control (exit command equivalent)', async () => {
      // Pattern: use halt to stop execution completely
      await command.execute(context);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true); // Stop execution
    });
  });

  describe('Integration with Event Handlers', () => {
    it('should work in click handler context', async () => {
      const clickEvent = {
        type: 'click',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true,
        target: testElement
      } as any;
      context.event = clickEvent;

      await command.execute(context, 'the', 'event');
      
      expect(clickEvent.preventDefault).toHaveBeenCalled();
      expect(clickEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should work in form handler context', async () => {
      const submitEvent = {
        type: 'submit',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true,
        target: testElement
      } as any;
      context.event = submitEvent;

      await command.execute(context, 'default');
      
      expect(submitEvent.preventDefault).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true); // Exit after preventing default
    });

    it('should work in keydown handler context', async () => {
      const keyEvent = {
        type: 'keydown',
        key: 'Enter',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true
      } as any;
      context.event = keyEvent;

      await command.execute(context, 'bubbling');
      
      expect(keyEvent.stopPropagation).toHaveBeenCalled();
      expect(context.flags?.halted).toBe(true); // Exit after stopping bubbling
    });
  });

  describe('Complex Event Scenarios', () => {
    it('should handle custom events with additional properties', async () => {
      const customEvent = {
        type: 'custom-event',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true,
        detail: { customData: 'test' },
        timestamp: Date.now()
      } as any;
      context.event = customEvent;

      await command.execute(context, 'the', 'event');
      
      expect(customEvent.preventDefault).toHaveBeenCalled();
      expect(customEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle events in different phases', async () => {
      const eventInBubblePhase = {
        type: 'click',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        eventPhase: 3, // Event.BUBBLING_PHASE
        bubbles: true,
        cancelable: true
      } as any;
      context.event = eventInBubblePhase;

      await command.execute(context, 'bubbling');
      
      expect(eventInBubblePhase.stopPropagation).toHaveBeenCalled();
    });

    it('should work with events that have been modified', async () => {
      const modifiedEvent = {
        type: 'click',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        bubbles: true,
        cancelable: true,
        defaultPrevented: true // Already prevented
      } as any;
      context.event = modifiedEvent;

      // Should still call preventDefault even if already prevented
      await command.execute(context, 'default');
      
      expect(modifiedEvent.preventDefault).toHaveBeenCalled();
    });
  });
});