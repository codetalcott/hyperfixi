/**
 * Test suite for the 'toggle' command
 * Tests DOM visibility toggling functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import { createContext } from '../../core/context';
import { ToggleCommand } from './toggle';
import type { ExecutionContext } from '../../types/core';

describe('Toggle Command', () => {
  let toggleCommand: ToggleCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    toggleCommand = new ToggleCommand();
    testElement = createTestElement('<div id="test" style="display: block;">Visible Element</div>');
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(toggleCommand.name).toBe('toggle');
      expect(toggleCommand.syntax).toBe('toggle [<target-expression>]');
      expect(toggleCommand.isBlocking).toBe(false);
      expect(toggleCommand.hasBody).toBe(false);
      expect(toggleCommand.implicitTarget).toBe('me');
    });
  });

  describe('Basic Toggle Functionality', () => {
    it('should hide visible element', async () => {
      // Element should be visible initially
      expect(testElement.style.display).toBe('block');

      // Execute toggle command
      await toggleCommand.execute(context);

      // Element should now be hidden
      expect(testElement.style.display).toBe('none');
    });

    it('should show hidden element', async () => {
      // Hide element first
      testElement.style.display = 'none';

      // Execute toggle command
      await toggleCommand.execute(context);

      // Element should now be visible
      expect(testElement.style.display).not.toBe('none');
    });

    it('should toggle back and forth multiple times', async () => {
      // Start visible
      expect(testElement.style.display).toBe('block');

      // Toggle to hidden
      await toggleCommand.execute(context);
      expect(testElement.style.display).toBe('none');

      // Toggle back to visible
      await toggleCommand.execute(context);
      expect(testElement.style.display).toBe('block');

      // Toggle to hidden again
      await toggleCommand.execute(context);
      expect(testElement.style.display).toBe('none');
    });
  });

  describe('Display Value Preservation', () => {
    it('should preserve original display values when toggling', async () => {
      // Start with flex display
      testElement.style.display = 'flex';

      // Toggle to hidden
      await toggleCommand.execute(context);
      expect(testElement.style.display).toBe('none');

      // Toggle back to visible - should restore flex
      await toggleCommand.execute(context);
      expect(testElement.style.display).toBe('flex');
    });

    it('should handle grid display correctly', async () => {
      testElement.style.display = 'grid';

      await toggleCommand.execute(context); // Hide
      expect(testElement.style.display).toBe('none');

      await toggleCommand.execute(context); // Show
      expect(testElement.style.display).toBe('grid');
    });

    it('should handle inline-block display correctly', async () => {
      testElement.style.display = 'inline-block';

      await toggleCommand.execute(context); // Hide
      expect(testElement.style.display).toBe('none');

      await toggleCommand.execute(context); // Show
      expect(testElement.style.display).toBe('inline-block');
    });
  });

  describe('Target Selection', () => {
    it('should toggle specific target element', async () => {
      const targetElement = createTestElement('<div id="target">Target Element</div>');
      document.body.appendChild(targetElement);
      targetElement.style.display = 'block';

      // Execute toggle with target
      await toggleCommand.execute(context, targetElement);

      expect(targetElement.style.display).toBe('none');
      expect(testElement.style.display).toBe('block'); // Original element unchanged
    });

    it('should handle null target gracefully', async () => {
      expect(async () => {
        await toggleCommand.execute(context, null);
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

      // Execute toggle with NodeList
      const nodeList = document.querySelectorAll('.multi');
      await toggleCommand.execute(context, nodeList);

      elements.forEach(el => {
        expect(el.style.display).toBe('none');
      });

      // Toggle again to show
      await toggleCommand.execute(context, nodeList);

      elements.forEach(el => {
        expect(el.style.display).toBe('block');
      });
    });
  });

  describe('CSS Classes Alternative', () => {
    it('should support toggling via CSS class when configured', async () => {
      const toggleCommandWithClass = new ToggleCommand({ useClass: true, className: 'hidden' });

      // Element should be visible initially
      expect(testElement.classList.contains('hidden')).toBe(false);

      // Toggle to hidden
      await toggleCommandWithClass.execute(context);
      expect(testElement.classList.contains('hidden')).toBe(true);

      // Toggle back to visible
      await toggleCommandWithClass.execute(context);
      expect(testElement.classList.contains('hidden')).toBe(false);
    });

    it('should handle elements that start with hidden class', async () => {
      const toggleCommandWithClass = new ToggleCommand({ useClass: true, className: 'hidden' });
      testElement.classList.add('hidden');

      // Toggle to visible
      await toggleCommandWithClass.execute(context);
      expect(testElement.classList.contains('hidden')).toBe(false);

      // Toggle back to hidden
      await toggleCommandWithClass.execute(context);
      expect(testElement.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Visibility Detection', () => {
    it('should detect elements hidden by display: none', async () => {
      testElement.style.display = 'none';

      await toggleCommand.execute(context);

      expect(testElement.style.display).not.toBe('none');
    });

    it('should detect elements hidden by class', async () => {
      const toggleCommandWithClass = new ToggleCommand({ useClass: true, className: 'hidden' });
      testElement.classList.add('hidden');

      await toggleCommandWithClass.execute(context);

      expect(testElement.classList.contains('hidden')).toBe(false);
    });

    it('should handle elements with computed visibility hidden', async () => {
      // Add CSS to make element invisible via computed styles
      const style = document.createElement('style');
      style.textContent = '.invisible { visibility: hidden; }';
      document.head.appendChild(style);

      testElement.classList.add('invisible');

      await toggleCommand.execute(context);

      // Should treat invisible elements as hidden and try to show
      expect(testElement.style.display).toBe('block');

      // Cleanup
      document.head.removeChild(style);
    });
  });

  describe('Event Integration', () => {
    it('should dispatch toggle event with action details', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:toggle', (e: any) => {
        eventDetail = e.detail;
      });

      await toggleCommand.execute(context);

      expect(eventDetail).toBeDefined();
      expect(eventDetail.element).toBe(testElement);
      expect(eventDetail.action).toBe('hide'); // Was visible, so action is hide
      expect(eventDetail.visible).toBe(false);
    });

    it('should dispatch correct action when showing hidden element', async () => {
      testElement.style.display = 'none';

      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:toggle', (e: any) => {
        eventDetail = e.detail;
      });

      await toggleCommand.execute(context);

      expect(eventDetail.action).toBe('show'); // Was hidden, so action is show
      expect(eventDetail.visible).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target types gracefully', async () => {
      expect(async () => {
        await toggleCommand.execute(context, 'invalid-target' as any);
      }).not.toThrow();
    });

    it('should handle detached elements', async () => {
      const detachedElement = createTestElement('<div>Detached</div>');

      expect(async () => {
        await toggleCommand.execute(context, detachedElement);
      }).not.toThrow();

      expect(detachedElement.style.display).toBe('none');
    });
  });

  describe('Integration with Hide/Show Commands', () => {
    it('should properly integrate with hide command state', async () => {
      // Manually hide element using hide command approach
      testElement.dataset.originalDisplay = 'flex';
      testElement.style.display = 'none';

      // Toggle should show and restore original display
      await toggleCommand.execute(context);

      expect(testElement.style.display).toBe('flex');
    });

    it('should maintain state consistency across multiple toggles', async () => {
      testElement.style.display = 'grid';

      // Multiple toggles should maintain state correctly
      await toggleCommand.execute(context); // Hide
      expect(testElement.style.display).toBe('none');
      expect(testElement.dataset.originalDisplay).toBe('grid');

      await toggleCommand.execute(context); // Show
      expect(testElement.style.display).toBe('grid');
      expect(testElement.dataset.originalDisplay).toBeUndefined();

      await toggleCommand.execute(context); // Hide again
      expect(testElement.style.display).toBe('none');
      expect(testElement.dataset.originalDisplay).toBe('grid');
    });
  });

  describe('Performance', () => {
    it('should handle toggling many elements efficiently', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) =>
        createTestElement(`<div id="perf-${i}">Element ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await toggleCommand.execute(context, element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Should complete in under 300ms

      elements.forEach(el => {
        expect(el.style.display).toBe('none');
      });
    });
  });
});
