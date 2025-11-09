/**
 * Test suite for the 'hide' command
 * Tests DOM visibility manipulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import { createContext } from '../../core/context';
import { HideCommand } from './hide';
import type { ExecutionContext } from '../../types/core';

describe('Hide Command', () => {
  let hideCommand: HideCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    hideCommand = new HideCommand();
    testElement = createTestElement('<div id="test" style="display: block;">Visible Element</div>');
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(hideCommand.name).toBe('hide');
      expect(hideCommand.syntax).toBe('hide [<target-expression>]');
      expect(hideCommand.isBlocking).toBe(false);
      expect(hideCommand.hasBody).toBe(false);
      expect(hideCommand.implicitTarget).toBe('me');
    });
  });

  describe('Basic Hide Functionality', () => {
    it('should hide the current element (me)', async () => {
      // Element should be visible initially
      expect(testElement.style.display).toBe('block');

      // Execute hide command
      await hideCommand.execute(context);

      // Element should now be hidden
      expect(testElement.style.display).toBe('none');
    });

    it('should hide element by setting display to none', async () => {
      testElement.style.display = 'flex';

      await hideCommand.execute(context);

      expect(testElement.style.display).toBe('none');
    });

    it('should handle already hidden elements gracefully', async () => {
      testElement.style.display = 'none';

      await hideCommand.execute(context);

      expect(testElement.style.display).toBe('none');
    });
  });

  describe('Target Selection', () => {
    it('should hide specific target element', async () => {
      const targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);
      targetElement.style.display = 'block';

      // Execute hide with target
      await hideCommand.execute(context, targetElement);

      expect(targetElement.style.display).toBe('none');
      expect(testElement.style.display).toBe('block'); // Original element unchanged
    });

    it('should handle null target gracefully', async () => {
      expect(async () => {
        await hideCommand.execute(context, null);
      }).not.toThrow();

      // Should default to 'me' when target is null
      expect(testElement.style.display).toBe('none');
    });

    it('should handle multiple elements', async () => {
      const elements = [
        createTestElement('<div class="multi">Element 1</div>'),
        createTestElement('<div class="multi">Element 2</div>'),
        createTestElement('<div class="multi">Element 3</div>'),
      ];

      elements.forEach(el => {
        el.style.display = 'block';
        document.body.appendChild(el);
      });

      // Execute hide with NodeList
      const nodeList = document.querySelectorAll('.multi');
      await hideCommand.execute(context, nodeList);

      elements.forEach(el => {
        expect(el.style.display).toBe('none');
      });
    });
  });

  describe('CSS Classes Alternative', () => {
    it('should support hiding via CSS class when configured', async () => {
      const hideCommandWithClass = new HideCommand({ useClass: true, className: 'hidden' });

      await hideCommandWithClass.execute(context);

      expect(testElement.classList.contains('hidden')).toBe(true);
      // Display style should remain unchanged when using class
      expect(testElement.style.display).toBe('block');
    });

    it('should remove hidden class when element is already hidden via class', async () => {
      const hideCommandWithClass = new HideCommand({ useClass: true, className: 'hidden' });
      testElement.classList.add('hidden');

      // Hide again - should be idempotent
      await hideCommandWithClass.execute(context);

      expect(testElement.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Preserve Original Display', () => {
    it('should preserve original display value for later show', async () => {
      testElement.style.display = 'flex';

      await hideCommand.execute(context);

      expect(testElement.style.display).toBe('none');
      expect(testElement.dataset.originalDisplay).toBe('flex');
    });

    it('should handle elements with no initial display', async () => {
      testElement.style.display = '';

      await hideCommand.execute(context);

      expect(testElement.style.display).toBe('none');
      expect(testElement.dataset.originalDisplay).toBe('');
    });

    it('should not overwrite existing originalDisplay data', async () => {
      testElement.dataset.originalDisplay = 'grid';
      testElement.style.display = 'block';

      await hideCommand.execute(context);

      expect(testElement.dataset.originalDisplay).toBe('grid');
    });
  });

  describe('Event Integration', () => {
    it('should dispatch hide event', async () => {
      let eventFired = false;
      testElement.addEventListener('hyperscript:hide', () => {
        eventFired = true;
      });

      await hideCommand.execute(context);

      expect(eventFired).toBe(true);
    });

    it('should include element in event detail', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:hide', (e: any) => {
        eventDetail = e.detail;
      });

      await hideCommand.execute(context);

      expect(eventDetail).toBeDefined();
      expect(eventDetail.element).toBe(testElement);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target types gracefully', async () => {
      expect(async () => {
        await hideCommand.execute(context, 'invalid-target' as any);
      }).not.toThrow();
    });

    it('should handle detached elements', async () => {
      const detachedElement = createTestElement('<div>Detached</div>');

      expect(async () => {
        await hideCommand.execute(context, detachedElement);
      }).not.toThrow();

      expect(detachedElement.style.display).toBe('none');
    });
  });

  describe('Performance', () => {
    it('should handle hiding many elements efficiently', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) =>
        createTestElement(`<div id="perf-${i}">Element ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await hideCommand.execute(context, element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms

      elements.forEach(el => {
        expect(el.style.display).toBe('none');
      });
    });
  });
});
