/**
 * Beep Command Tests
 * Test debugging output for expressions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import { BeepCommand } from './beep';
import type { ExecutionContext } from '../../types/core';

describe('Beep Command', () => {
  let beepCommand: BeepCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    beepCommand = new BeepCommand();
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    testElement.className = 'test-class';
    testElement.setAttribute('data-test', 'test-value');
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      locals: new Map(),
    };

    // Mock console.log to capture debug output
    originalConsoleLog = console.log;
    mockConsoleLog = vi.fn();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }

    // Restore original console.log
    console.log = originalConsoleLog;
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(beepCommand.name).toBe('beep');
      expect(beepCommand.isBlocking).toBe(false);
      expect(typeof beepCommand.syntax).toBe('string');
      expect(typeof beepCommand.description).toBe('string');
    });
  });

  describe('Basic Debugging Output', () => {
    it('should debug a simple number value', async () => {
      await beepCommand.execute(context, 42);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (42) evaluates to:',
        42,
        'of type Number'
      );
    });

    it('should debug a string value', async () => {
      await beepCommand.execute(context, 'hello world');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression ("hello world") evaluates to:',
        '"hello world"',
        'of type String'
      );
    });

    it('should debug a null value', async () => {
      await beepCommand.execute(context, null);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (null) evaluates to:',
        null,
        'of type object (null)'
      );
    });

    it('should debug an undefined value', async () => {
      await beepCommand.execute(context, undefined);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (undefined) evaluates to:',
        undefined,
        'of type undefined'
      );
    });

    it('should debug a boolean value', async () => {
      await beepCommand.execute(context, true);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (true) evaluates to:',
        true,
        'of type Boolean'
      );
    });

    it('should debug an array value', async () => {
      const testArray = [1, 2, 3];
      await beepCommand.execute(context, testArray);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression ([1,2,3]) evaluates to:',
        testArray,
        'of type Array'
      );
    });

    it('should debug an object value', async () => {
      const testObj = { foo: 'bar', count: 42 };
      await beepCommand.execute(context, testObj);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression ({"foo":"bar","count":42}) evaluates to:',
        testObj,
        'of type Object'
      );
    });

    it('should debug an element value', async () => {
      await beepCommand.execute(context, testElement);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (Element) evaluates to:',
        expect.any(Object), // Element display value may be serialized differently
        'of type HTMLElement'
      );
    });
  });

  describe('Multiple Expressions', () => {
    it('should debug multiple expressions in order', async () => {
      await beepCommand.execute(context, 42, 'hello', true);

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        1,
        '///_ BEEP! The expression (42) evaluates to:',
        42,
        'of type Number'
      );

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        2,
        '///_ BEEP! The expression ("hello") evaluates to:',
        '"hello"',
        'of type String'
      );

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        3,
        '///_ BEEP! The expression (true) evaluates to:',
        true,
        'of type Boolean'
      );
    });

    it('should handle mixed types in multiple expressions', async () => {
      const testArray = [1, 2];
      const testObj = { key: 'value' };

      await beepCommand.execute(context, testArray, null, testObj);

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        1,
        '///_ BEEP! The expression ([1,2]) evaluates to:',
        testArray,
        'of type Array'
      );

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        2,
        '///_ BEEP! The expression (null) evaluates to:',
        null,
        'of type object (null)'
      );

      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        3,
        '///_ BEEP! The expression ({"key":"value"}) evaluates to:',
        testObj,
        'of type Object'
      );
    });
  });

  describe('Complex Value Handling', () => {
    it('should debug functions', async () => {
      const testFunc = function example() {
        return 42;
      };
      await beepCommand.execute(context, testFunc);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('///_ BEEP! The expression (function example()'),
        testFunc,
        'of type Function'
      );
    });

    it('should debug dates', async () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      await beepCommand.execute(context, testDate);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (2023-01-01T00:00:00.000Z) evaluates to:',
        testDate,
        'of type Date'
      );
    });

    it('should debug regular expressions', async () => {
      const testRegex = /test\d+/gi;
      await beepCommand.execute(context, testRegex);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '///_ BEEP! The expression (/test\\d+/gi) evaluates to:',
        testRegex,
        'of type RegExp'
      );
    });

    it('should handle element collections', async () => {
      const secondElement = document.createElement('div');
      secondElement.className = 'test-class';
      document.body.appendChild(secondElement);

      try {
        const elements = [testElement, secondElement];
        await beepCommand.execute(context, elements);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          '///_ BEEP! The expression (ElementCollection) evaluates to:',
          expect.any(Object), // Element collection display may be serialized differently
          'of type ElementCollection'
        );
      } finally {
        document.body.removeChild(secondElement);
      }
    });
  });

  describe('Event Integration', () => {
    it('should trigger hyperscript:beep event with value', async () => {
      let eventTriggered = false;
      let eventValue: any;

      testElement.addEventListener('hyperscript:beep', (event: any) => {
        eventTriggered = true;
        eventValue = event.detail.value;
      });

      await beepCommand.execute(context, 'test-value');

      expect(eventTriggered).toBe(true);
      expect(eventValue).toBe('test-value');
    });

    it('should allow event cancellation', async () => {
      testElement.addEventListener('hyperscript:beep', (event: any) => {
        event.preventDefault();
      });

      await beepCommand.execute(context, 'canceled-value');

      // Should not log if event was canceled
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should trigger event for each expression in multiple beeps', async () => {
      const eventValues: any[] = [];

      testElement.addEventListener('hyperscript:beep', (event: any) => {
        eventValues.push(event.detail.value);
      });

      await beepCommand.execute(context, 'first', 'second', 'third');

      expect(eventValues).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Error Handling', () => {
    it('should handle expressions that throw errors', async () => {
      const errorObj = {
        get value() {
          throw new Error('Property access failed');
        },
      };

      await beepCommand.execute(context, errorObj);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Error: Property access failed]'),
        expect.objectContaining({ value: '[Error: Property access failed]' }),
        'of type Object'
      );
    });

    it('should work with no arguments', async () => {
      await beepCommand.execute(context);

      // Should not throw and should not log anything
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate any syntax (beep accepts any expressions)', () => {
      expect(beepCommand.validate([])).toBeNull();
      expect(beepCommand.validate([42])).toBeNull();
      expect(beepCommand.validate(['string', 42, true, null])).toBeNull();
    });
  });
});
