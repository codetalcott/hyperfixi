/**
 * Test suite for the 'add' command
 * Tests CSS class addition functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import { createContext } from '../../core/context';
import { AddCommand } from './add';
import type { ExecutionContext } from '../../types/core';

describe('Add Command', () => {
  let addCommand: AddCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    addCommand = new AddCommand();
    testElement = createTestElement('<div id="test">Test Element</div>');
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(addCommand.name).toBe('add');
      expect(addCommand.syntax).toBe('add <class-expression> [to <target-expression>]');
      expect(addCommand.isBlocking).toBe(false);
      expect(addCommand.hasBody).toBe(false);
      expect(addCommand.implicitTarget).toBe('me');
    });
  });

  describe('Basic Class Addition', () => {
    it('should add single class to current element', async () => {
      await addCommand.execute(context, 'test-class');

      expect(testElement.classList.contains('test-class')).toBe(true);
    });

    it('should add multiple classes from string', async () => {
      await addCommand.execute(context, 'class1 class2 class3');

      expect(testElement.classList.contains('class1')).toBe(true);
      expect(testElement.classList.contains('class2')).toBe(true);
      expect(testElement.classList.contains('class3')).toBe(true);
    });

    it('should add classes from array', async () => {
      await addCommand.execute(context, ['class1', 'class2', 'class3']);

      expect(testElement.classList.contains('class1')).toBe(true);
      expect(testElement.classList.contains('class2')).toBe(true);
      expect(testElement.classList.contains('class3')).toBe(true);
    });

    it('should handle comma-separated classes', async () => {
      await addCommand.execute(context, 'class1, class2, class3');

      expect(testElement.classList.contains('class1')).toBe(true);
      expect(testElement.classList.contains('class2')).toBe(true);
      expect(testElement.classList.contains('class3')).toBe(true);
    });

    it('should handle mixed delimiters', async () => {
      await addCommand.execute(context, 'class1 class2, class3  class4');

      expect(testElement.classList.contains('class1')).toBe(true);
      expect(testElement.classList.contains('class2')).toBe(true);
      expect(testElement.classList.contains('class3')).toBe(true);
      expect(testElement.classList.contains('class4')).toBe(true);
    });
  });

  describe('Target Selection', () => {
    it('should add class to specific target element', async () => {
      const targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);

      await addCommand.execute(context, 'target-class', targetElement);

      expect(targetElement.classList.contains('target-class')).toBe(true);
      expect(testElement.classList.contains('target-class')).toBe(false);
    });

    it('should handle null target gracefully', async () => {
      expect(async () => {
        await addCommand.execute(context, 'test-class', null);
      }).not.toThrow();

      // Should default to 'me' when target is null
      expect(testElement.classList.contains('test-class')).toBe(true);
    });

    it('should handle multiple target elements', async () => {
      const elements = [
        createTestElement('<div class="multi">Element 1</div>'),
        createTestElement('<div class="multi">Element 2</div>'),
        createTestElement('<div class="multi">Element 3</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      const nodeList = document.querySelectorAll('.multi');
      await addCommand.execute(context, 'shared-class', nodeList);

      elements.forEach(el => {
        expect(el.classList.contains('shared-class')).toBe(true);
      });
    });

    it('should handle CSS selector as target', async () => {
      const elements = [
        createTestElement('<div class="selector-test">Element 1</div>'),
        createTestElement('<div class="selector-test">Element 2</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      await addCommand.execute(context, 'selector-class', '.selector-test');

      elements.forEach(el => {
        expect(el.classList.contains('selector-class')).toBe(true);
      });
    });
  });

  describe('Class Name Validation', () => {
    it('should accept valid CSS class names', async () => {
      const validClasses = [
        'valid-class',
        'valid_class',
        'validClass',
        'a',
        '_underscore',
        '-hyphen',
        'class123',
      ];

      for (const className of validClasses) {
        await addCommand.execute(context, className);
        expect(testElement.classList.contains(className)).toBe(true);
      }
    });

    it('should reject invalid CSS class names', async () => {
      const invalidClasses = [
        '123invalid', // starts with number
        '', // empty
        '   ', // whitespace only
      ];

      for (const className of invalidClasses) {
        const initialClassList = Array.from(testElement.classList);
        await addCommand.execute(context, className);

        // Class list should not change for invalid names
        expect(Array.from(testElement.classList)).toEqual(initialClassList);
      }
    });

    it('should filter out empty and invalid classes from lists', async () => {
      await addCommand.execute(context, 'valid1  valid2    valid3');

      expect(testElement.classList.contains('valid1')).toBe(true);
      expect(testElement.classList.contains('valid2')).toBe(true);
      expect(testElement.classList.contains('valid3')).toBe(true);
      expect(testElement.classList.length).toBe(3);
    });
  });

  describe('Duplicate Handling', () => {
    it('should not add duplicate classes', async () => {
      testElement.classList.add('existing-class');
      const initialLength = testElement.classList.length;

      await addCommand.execute(context, 'existing-class');

      expect(testElement.classList.length).toBe(initialLength);
      expect(testElement.classList.contains('existing-class')).toBe(true);
    });

    it('should handle mixed new and existing classes', async () => {
      testElement.classList.add('existing');

      await addCommand.execute(context, 'existing new-class');

      expect(testElement.classList.contains('existing')).toBe(true);
      expect(testElement.classList.contains('new-class')).toBe(true);
    });
  });

  describe('Event Integration', () => {
    it('should dispatch add event when classes are added', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:add', (e: any) => {
        eventDetail = e.detail;
      });

      await addCommand.execute(context, 'event-class');

      expect(eventDetail).toBeDefined();
      expect(eventDetail.element).toBe(testElement);
      expect(eventDetail.classes).toEqual(['event-class']);
      expect(eventDetail.command).toBe('add');
    });

    it('should not dispatch event when no classes are actually added', async () => {
      testElement.classList.add('existing');

      let eventFired = false;
      testElement.addEventListener('hyperscript:add', () => {
        eventFired = true;
      });

      await addCommand.execute(context, 'existing');

      expect(eventFired).toBe(false);
    });

    it('should include only actually added classes in event', async () => {
      testElement.classList.add('existing');

      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:add', (e: any) => {
        eventDetail = e.detail;
      });

      await addCommand.execute(context, 'existing new-class another-new');

      expect(eventDetail.classes).toEqual(['new-class', 'another-new']);
      expect(eventDetail.allClasses).toEqual(['existing', 'new-class', 'another-new']);
    });
  });

  describe('Error Handling', () => {
    it('should handle null class expression', async () => {
      expect(async () => {
        await addCommand.execute(context, null);
      }).not.toThrow();

      // Should not add any classes
      expect(testElement.classList.length).toBe(0);
    });

    it('should handle undefined class expression', async () => {
      expect(async () => {
        await addCommand.execute(context, undefined);
      }).not.toThrow();

      expect(testElement.classList.length).toBe(0);
    });

    it('should handle invalid target types', async () => {
      expect(async () => {
        await addCommand.execute(context, 'test-class', 42 as any);
      }).not.toThrow();

      // Should fallback to 'me'
      expect(testElement.classList.contains('test-class')).toBe(true);
    });

    it('should handle non-string class expressions', async () => {
      await addCommand.execute(context, 123);

      expect(testElement.classList.contains('123')).toBe(false); // Invalid class name
    });
  });

  describe('Validation', () => {
    it('should validate required class argument', () => {
      const result = addCommand.validate([]);
      expect(result).toBe('Add command requires at least one class name');
    });

    it('should validate null class argument', () => {
      const result = addCommand.validate([null]);
      expect(result).toBe('Add command requires a class expression');
    });

    it('should validate undefined class argument', () => {
      const result = addCommand.validate([undefined]);
      expect(result).toBe('Add command requires a class expression');
    });

    it('should accept valid arguments', () => {
      expect(addCommand.validate(['class-name'])).toBeNull();
      expect(addCommand.validate(['class-name', 'target'])).toBeNull();
    });

    it('should reject too many arguments', () => {
      const result = addCommand.validate(['class', 'target', 'extra']);
      expect(result).toBe('Add command accepts at most two arguments: classes and target');
    });
  });

  describe('Performance', () => {
    it('should handle adding classes to many elements efficiently', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) =>
        createTestElement(`<div id="perf-${i}">Element ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await addCommand.execute(context, 'performance-class', element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms

      elements.forEach(el => {
        expect(el.classList.contains('performance-class')).toBe(true);
      });
    });

    it('should handle adding many classes to single element efficiently', async () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`).join(' ');

      const startTime = performance.now();
      await addCommand.execute(context, manyClasses);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms

      expect(testElement.classList.length).toBe(100);
    });
  });
});
