/**
 * Test suite for the 'show' command
 * Tests DOM visibility restoration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '../../test-setup';
import { createContext } from '../../core/context';
import { ShowCommand } from './show';
import type { ExecutionContext } from '../../types/core';

describe('Show Command', () => {
  let showCommand: ShowCommand;
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    showCommand = new ShowCommand();
    testElement = createTestElement('<div id="test" style="display: none;">Hidden Element</div>');
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Command Properties', () => {
    it('should have correct command properties', () => {
      expect(showCommand.name).toBe('show');
      expect(showCommand.syntax).toBe('show [<target-expression>]');
      expect(showCommand.isBlocking).toBe(false);
      expect(showCommand.hasBody).toBe(false);
      expect(showCommand.implicitTarget).toBe('me');
    });
  });

  describe('Basic Show Functionality', () => {
    it('should show the current element (me)', async () => {
      // Element should be hidden initially
      expect(testElement.style.display).toBe('none');

      // Execute show command
      await showCommand.execute(context);

      // Element should now be visible
      expect(testElement.style.display).not.toBe('none');
    });

    it('should restore original display value when available', async () => {
      testElement.dataset.originalDisplay = 'flex';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('flex');
    });

    it('should default to block when no original display stored', async () => {
      testElement.style.display = 'none';
      delete testElement.dataset.originalDisplay;

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('block');
    });

    it('should handle already visible elements gracefully', async () => {
      testElement.style.display = 'block';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('block');
    });
  });

  describe('Original Display Restoration', () => {
    it('should restore flex display', async () => {
      testElement.dataset.originalDisplay = 'flex';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('flex');
    });

    it('should restore inline-block display', async () => {
      testElement.dataset.originalDisplay = 'inline-block';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('inline-block');
    });

    it('should restore grid display', async () => {
      testElement.dataset.originalDisplay = 'grid';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('grid');
    });

    it('should handle empty original display gracefully', async () => {
      testElement.dataset.originalDisplay = '';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('block');
    });
  });

  describe('Target Selection', () => {
    it('should show specific target element', async () => {
      const targetElement = createTestElement(
        '<div id="target" style="display: none;">Target Element</div>'
      );
      document.body.appendChild(targetElement);

      // Execute show with target
      await showCommand.execute(context, targetElement);

      expect(targetElement.style.display).toBe('block');
      expect(testElement.style.display).toBe('none'); // Original element unchanged
    });

    it('should handle null target gracefully', async () => {
      expect(async () => {
        await showCommand.execute(context, null);
      }).not.toThrow();

      // Should default to 'me' when target is null
      expect(testElement.style.display).not.toBe('none');
    });

    it('should handle multiple elements', async () => {
      const elements = [
        createTestElement('<div class="multi" style="display: none;">Element 1</div>'),
        createTestElement('<div class="multi" style="display: none;">Element 2</div>'),
        createTestElement('<div class="multi" style="display: none;">Element 3</div>'),
      ];

      elements.forEach(el => document.body.appendChild(el));

      // Execute show with NodeList
      const nodeList = document.querySelectorAll('.multi');
      await showCommand.execute(context, nodeList);

      elements.forEach(el => {
        expect(el.style.display).toBe('block');
      });
    });
  });

  describe('CSS Classes Alternative', () => {
    it('should support showing via CSS class removal when configured', async () => {
      const showCommandWithClass = new ShowCommand({ useClass: true, className: 'hidden' });
      testElement.classList.add('hidden');

      await showCommandWithClass.execute(context);

      expect(testElement.classList.contains('hidden')).toBe(false);
    });

    it('should handle elements without hidden class gracefully', async () => {
      const showCommandWithClass = new ShowCommand({ useClass: true, className: 'hidden' });

      expect(async () => {
        await showCommandWithClass.execute(context);
      }).not.toThrow();

      expect(testElement.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Event Integration', () => {
    it('should dispatch show event', async () => {
      let eventFired = false;
      testElement.addEventListener('hyperscript:show', () => {
        eventFired = true;
      });

      await showCommand.execute(context);

      expect(eventFired).toBe(true);
    });

    it('should include element in event detail', async () => {
      let eventDetail: any = null;
      testElement.addEventListener('hyperscript:show', (e: any) => {
        eventDetail = e.detail;
      });

      await showCommand.execute(context);

      expect(eventDetail).toBeDefined();
      expect(eventDetail.element).toBe(testElement);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target types gracefully', async () => {
      expect(async () => {
        await showCommand.execute(context, 'invalid-target' as any);
      }).not.toThrow();
    });

    it('should handle detached elements', async () => {
      const detachedElement = createTestElement('<div style="display: none;">Detached</div>');

      expect(async () => {
        await showCommand.execute(context, detachedElement);
      }).not.toThrow();

      expect(detachedElement.style.display).toBe('block');
    });
  });

  describe('Integration with Hide Command', () => {
    it('should properly restore element hidden by hide command', async () => {
      // Simulate hide command setting original display
      testElement.style.display = 'grid';
      testElement.dataset.originalDisplay = 'grid';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.style.display).toBe('grid');
    });

    it('should clean up originalDisplay data after showing', async () => {
      testElement.dataset.originalDisplay = 'flex';
      testElement.style.display = 'none';

      await showCommand.execute(context);

      expect(testElement.dataset.originalDisplay).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle showing many elements efficiently', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) =>
        createTestElement(`<div id="perf-${i}" style="display: none;">Element ${i}</div>`)
      );

      elements.forEach(el => document.body.appendChild(el));

      const startTime = performance.now();

      for (const element of elements) {
        await showCommand.execute(context, element);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms

      elements.forEach(el => {
        expect(el.style.display).toBe('block');
      });
    });
  });
});
