/**
 * Test suite for the 'remove' command
 * Tests CSS class removal functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import { createContext } from '../../core/context';
import { RemoveCommand } from './remove';
import type { ExecutionContext } from '../../types/core';

describe('Remove Command', () => {
  let removeCommand: RemoveCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    removeCommand = new RemoveCommand();
    testElement = createTestElement(
      '<div id="test" class="initial-class another-class">Test Element</div>'
    );
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(removeCommand.name).toBe('remove');
      expect(removeCommand.syntax).toBe('remove <class-expression> [from <target-expression>]');
      expect(removeCommand.isBlocking).toBe(false);
      expect(removeCommand.hasBody).toBe(false);
      expect(removeCommand.implicitTarget).toBe('me');
    });
  });

  describe('Basic Class Removal', () => {
    it('should remove single class from current element', async () => {
      expect(testElement.classList.contains('initial-class')).toBe(true);

      await removeCommand.execute(context, 'initial-class');

      expect(testElement.classList.contains('initial-class')).toBe(false);
      expect(testElement.classList.contains('another-class')).toBe(true);
    });

    it('should remove multiple classes from string', async () => {
      await removeCommand.execute(context, 'initial-class another-class');

      expect(testElement.classList.contains('initial-class')).toBe(false);
      expect(testElement.classList.contains('another-class')).toBe(false);
    });

    it('should remove classes from array', async () => {
      await removeCommand.execute(context, ['initial-class', 'another-class']);

      expect(testElement.classList.contains('initial-class')).toBe(false);
      expect(testElement.classList.contains('another-class')).toBe(false);
    });

    it('should handle comma-separated classes', async () => {
      testElement.classList.add('class1', 'class2', 'class3');

      await removeCommand.execute(context, 'class1, class2, class3');

      expect(testElement.classList.contains('class1')).toBe(false);
      expect(testElement.classList.contains('class2')).toBe(false);
      expect(testElement.classList.contains('class3')).toBe(false);
    });

    it('should handle mixed delimiters', async () => {
      testElement.classList.add('class1', 'class2', 'class3', 'class4');

      await removeCommand.execute(context, 'class1 class2, class3  class4');

      expect(testElement.classList.contains('class1')).toBe(false);
      expect(testElement.classList.contains('class2')).toBe(false);
      expect(testElement.classList.contains('class3')).toBe(false);
      expect(testElement.classList.contains('class4')).toBe(false);
    });
  });

  describe('Target Selection', () => {
    it('should remove class from specific target element', async () => {
      const targetElement = createTestElement(
        '<div id="target" class="target-class">Target Element</div>'
      );
      document.body.appendChild(targetElement);

      await removeCommand.execute(context, 'target-class', targetElement);

      expect(targetElement.classList.contains('target-class')).toBe(false);
      expect(testElement.classList.contains('initial-class')).toBe(true); // Original unchanged
    });

    it('should handle null target gracefully', async () => {
      expect(async () => {
        await removeCommand.execute(context, 'initial-class', null);
      }).not.toThrow();

      // Should default to 'me' when target is null
      expect(testElement.classList.contains('initial-class')).toBe(false);
    });

    it('should handle multiple target elements', async () => {
      const elements = [
        createTestElement('<div class="multi shared-class">Element 1</div>'),
        createTestElement('<div class="multi shared-class">Element 2</div>'),
        createTestElement('<div class="multi shared-class">Element 3</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      const nodeList = document.querySelectorAll('.multi');
      await removeCommand.execute(context, 'shared-class', nodeList);

      elements.forEach(el => {
        expect(el.classList.contains('shared-class')).toBe(false);
        expect(el.classList.contains('multi')).toBe(true); // Other classes remain
      });
    });

    it('should handle CSS selector as target', async () => {
      const elements = [
        createTestElement('<div class="selector-test remove-me">Element 1</div>'),
        createTestElement('<div class="selector-test remove-me">Element 2</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      await removeCommand.execute(context, 'remove-me', '.selector-test');

      elements.forEach(el => {
        expect(el.classList.contains('remove-me')).toBe(false);
        expect(el.classList.contains('selector-test')).toBe(true);
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

      // Add classes first
      testElement.classList.add(...validClasses);

      for (const className of validClasses) {
        expect(testElement.classList.contains(className)).toBe(true);
        await removeCommand.execute(context, className);
        expect(testElement.classList.contains(className)).toBe(false);
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
        await removeCommand.execute(context, className);

        // Class list should not change for invalid names
        expect(Array.from(testElement.classList)).toEqual(initialClassList);
      }
    });

    it('should filter out empty and invalid classes from lists', async () => {
      testElement.classList.add('valid1', 'valid2', 'valid3');

      await removeCommand.execute(context, 'valid1  valid2    valid3');

      expect(testElement.classList.contains('valid1')).toBe(false);
      expect(testElement.classList.contains('valid2')).toBe(false);
      expect(testElement.classList.contains('valid3')).toBe(false);
    });
  });

  describe('Non-existent Class Handling', () => {
    it('should handle removing non-existent classes gracefully', async () => {
      const initialLength = testElement.classList.length;

      await removeCommand.execute(context, 'non-existent-class');

      expect(testElement.classList.length).toBe(initialLength);
      expect(testElement.classList.contains('initial-class')).toBe(true);
    });

    it('should handle mixed existing and non-existent classes', async () => {
      await removeCommand.execute(context, 'initial-class non-existent another-class');

      expect(testElement.classList.contains('initial-class')).toBe(false);
      expect(testElement.classList.contains('another-class')).toBe(false);
      expect(testElement.classList.length).toBe(0);
    });
  });

  describe('Event Integration', () => {
    it('should dispatch remove event when classes are removed', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:remove', (e: any) => {
        eventDetail = e.detail;
      });

      await removeCommand.execute(context, 'initial-class');

      expect(eventDetail).toBeDefined();
      expect(eventDetail.element).toBe(testElement);
      expect(eventDetail.classes).toEqual(['initial-class']);
      expect(eventDetail.command).toBe('remove');
    });

    it('should not dispatch event when no classes are actually removed', async () => {
      let eventFired = false;
      testElement.addEventListener('hyperscript:remove', () => {
        eventFired = true;
      });

      await removeCommand.execute(context, 'non-existent');

      expect(eventFired).toBe(false);
    });

    it('should include only actually removed classes in event', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:remove', (e: any) => {
        eventDetail = e.detail;
      });

      await removeCommand.execute(context, 'initial-class non-existent another-class');

      expect(eventDetail.classes).toEqual(['initial-class', 'another-class']);
      expect(eventDetail.allClasses).toEqual(['initial-class', 'non-existent', 'another-class']);
    });
  });

  describe('Error Handling', () => {
    it('should handle null class expression', async () => {
      expect(async () => {
        await removeCommand.execute(context, null);
      }).not.toThrow();

      // Should not remove any classes
      expect(testElement.classList.contains('initial-class')).toBe(true);
    });

    it('should handle undefined class expression', async () => {
      expect(async () => {
        await removeCommand.execute(context, undefined);
      }).not.toThrow();

      expect(testElement.classList.contains('initial-class')).toBe(true);
    });

    it('should handle invalid target types', async () => {
      expect(async () => {
        await removeCommand.execute(context, 'initial-class', 42 as any);
      }).not.toThrow();

      // Should fallback to 'me'
      expect(testElement.classList.contains('initial-class')).toBe(false);
    });

    it('should handle non-string class expressions', async () => {
      testElement.classList.add('123'); // Invalid class already exists somehow

      await removeCommand.execute(context, 123);

      expect(testElement.classList.contains('123')).toBe(true); // Should not be removed due to invalid name
    });
  });

  describe('Validation', () => {
    it('should validate required class argument', () => {
      const result = removeCommand.validate([]);
      expect(result).toBe('Remove command requires at least one class name');
    });

    it('should validate null class argument', () => {
      const result = removeCommand.validate([null]);
      expect(result).toBe('Remove command requires a class expression');
    });

    it('should validate undefined class argument', () => {
      const result = removeCommand.validate([undefined]);
      expect(result).toBe('Remove command requires a class expression');
    });

    it('should accept valid arguments', () => {
      expect(removeCommand.validate(['class-name'])).toBeNull();
      expect(removeCommand.validate(['class-name', 'target'])).toBeNull();
    });

    it('should reject too many arguments', () => {
      const result = removeCommand.validate(['class', 'target', 'extra']);
      expect(result).toBe('Remove command accepts at most two arguments: classes and target');
    });
  });

  describe('Integration with Add Command', () => {
    it('should work correctly after adding classes', async () => {
      // Start with clean element
      testElement.className = '';

      // Add some classes (simulating add command)
      testElement.classList.add('added1', 'added2', 'added3');

      // Remove specific classes
      await removeCommand.execute(context, 'added1 added3');

      expect(testElement.classList.contains('added1')).toBe(false);
      expect(testElement.classList.contains('added2')).toBe(true);
      expect(testElement.classList.contains('added3')).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle removing classes from many elements efficiently', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) =>
        createTestElement(`<div id="perf-${i}" class="performance-class">Element ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await removeCommand.execute(context, 'performance-class', element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms

      elements.forEach(el => {
        expect(el.classList.contains('performance-class')).toBe(false);
      });
    });

    it('should handle removing many classes from single element efficiently', async () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      testElement.classList.add(...manyClasses);

      const startTime = performance.now();
      await removeCommand.execute(context, manyClasses.join(' '));
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms

      manyClasses.forEach(className => {
        expect(testElement.classList.contains(className)).toBe(false);
      });
    });
  });
});
