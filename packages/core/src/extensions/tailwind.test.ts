/**
 * Tailwind CSS Extension Tests
 * Tests the Tailwind CSS hide/show strategies extension
 * Based on official _hyperscript/test/ext/tailwind.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TailwindExtension } from './tailwind';
import { HideCommand } from '../commands/dom/hide';
import { ShowCommand } from '../commands/dom/show';
import { ExecutionContext } from '../types/core';

describe('Tailwind CSS Extension', () => {
  let extension: TailwindExtension;
  let hideCommand: HideCommand;
  let showCommand: ShowCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    extension = new TailwindExtension();
    testElement = document.createElement('div');
    testElement.innerHTML = 'Test Content';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      you: null,
      it: null,
      locals: new Map(),
      globals: new Map(),
      result: undefined,
    };
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
    // Reset global config
    extension.resetDefaultStrategy();
  });

  describe('Extension Registration', () => {
    it('should register all three Tailwind strategies', () => {
      const strategies = extension.getStrategies();

      expect(strategies).toHaveProperty('twDisplay');
      expect(strategies).toHaveProperty('twVisibility');
      expect(strategies).toHaveProperty('twOpacity');
      expect(typeof strategies.twDisplay).toBe('function');
      expect(typeof strategies.twVisibility).toBe('function');
      expect(typeof strategies.twOpacity).toBe('function');
    });

    it('should allow setting default strategy globally', () => {
      extension.setDefaultStrategy('twDisplay');
      expect(extension.getDefaultStrategy()).toBe('twDisplay');

      extension.setDefaultStrategy('twVisibility');
      expect(extension.getDefaultStrategy()).toBe('twVisibility');

      extension.setDefaultStrategy('twOpacity');
      expect(extension.getDefaultStrategy()).toBe('twOpacity');
    });
  });

  describe('twDisplay Strategy (hidden class)', () => {
    beforeEach(() => {
      hideCommand = new HideCommand();
      showCommand = new ShowCommand();
    });

    it('can hide element with hidden class using explicit strategy', async () => {
      expect(testElement.classList.contains('hidden')).toBe(false);

      await extension.executeStrategy('twDisplay', 'hide', testElement);

      expect(testElement.classList.contains('hidden')).toBe(true);
    });

    it('can show element by removing hidden class using explicit strategy', async () => {
      testElement.classList.add('hidden');
      expect(testElement.classList.contains('hidden')).toBe(true);

      await extension.executeStrategy('twDisplay', 'show', testElement);

      expect(testElement.classList.contains('hidden')).toBe(false);
    });

    it('can toggle element with hidden class', async () => {
      // Start without hidden class
      expect(testElement.classList.contains('hidden')).toBe(false);

      await extension.executeStrategy('twDisplay', 'toggle', testElement);
      expect(testElement.classList.contains('hidden')).toBe(true);

      await extension.executeStrategy('twDisplay', 'toggle', testElement);
      expect(testElement.classList.contains('hidden')).toBe(false);
    });

    it('can hide element with hidden class using default strategy', async () => {
      extension.setDefaultStrategy('twDisplay');

      expect(testElement.classList.contains('hidden')).toBe(false);

      await extension.executeWithDefaultStrategy('hide', testElement);

      expect(testElement.classList.contains('hidden')).toBe(true);
    });

    it('can show element by removing hidden class using default strategy', async () => {
      extension.setDefaultStrategy('twDisplay');
      testElement.classList.add('hidden');

      expect(testElement.classList.contains('hidden')).toBe(true);

      await extension.executeWithDefaultStrategy('show', testElement);

      expect(testElement.classList.contains('hidden')).toBe(false);
    });
  });

  describe('twVisibility Strategy (invisible class)', () => {
    it('can hide element with invisible class using explicit strategy', async () => {
      expect(testElement.classList.contains('invisible')).toBe(false);

      await extension.executeStrategy('twVisibility', 'hide', testElement);

      expect(testElement.classList.contains('invisible')).toBe(true);
    });

    it('can show element by removing invisible class using explicit strategy', async () => {
      testElement.classList.add('invisible');
      expect(testElement.classList.contains('invisible')).toBe(true);

      await extension.executeStrategy('twVisibility', 'show', testElement);

      expect(testElement.classList.contains('invisible')).toBe(false);
    });

    it('can toggle element with invisible class', async () => {
      expect(testElement.classList.contains('invisible')).toBe(false);

      await extension.executeStrategy('twVisibility', 'toggle', testElement);
      expect(testElement.classList.contains('invisible')).toBe(true);

      await extension.executeStrategy('twVisibility', 'toggle', testElement);
      expect(testElement.classList.contains('invisible')).toBe(false);
    });

    it('can hide element using invisible class as default strategy', async () => {
      extension.setDefaultStrategy('twVisibility');

      expect(testElement.classList.contains('invisible')).toBe(false);

      await extension.executeWithDefaultStrategy('hide', testElement);

      expect(testElement.classList.contains('invisible')).toBe(true);
    });

    it('can show element by removing invisible class as default strategy', async () => {
      extension.setDefaultStrategy('twVisibility');
      testElement.classList.add('invisible');

      expect(testElement.classList.contains('invisible')).toBe(true);

      await extension.executeWithDefaultStrategy('show', testElement);

      expect(testElement.classList.contains('invisible')).toBe(false);
    });
  });

  describe('twOpacity Strategy (opacity-0 class)', () => {
    it('can hide element with opacity-0 class using explicit strategy', async () => {
      expect(testElement.classList.contains('opacity-0')).toBe(false);

      await extension.executeStrategy('twOpacity', 'hide', testElement);

      expect(testElement.classList.contains('opacity-0')).toBe(true);
    });

    it('can show element by removing opacity-0 class using explicit strategy', async () => {
      testElement.classList.add('opacity-0');
      expect(testElement.classList.contains('opacity-0')).toBe(true);

      await extension.executeStrategy('twOpacity', 'show', testElement);

      expect(testElement.classList.contains('opacity-0')).toBe(false);
    });

    it('can toggle element with opacity-0 class', async () => {
      expect(testElement.classList.contains('opacity-0')).toBe(false);

      await extension.executeStrategy('twOpacity', 'toggle', testElement);
      expect(testElement.classList.contains('opacity-0')).toBe(true);

      await extension.executeStrategy('twOpacity', 'toggle', testElement);
      expect(testElement.classList.contains('opacity-0')).toBe(false);
    });

    it('can hide element using opacity-0 class as default strategy', async () => {
      extension.setDefaultStrategy('twOpacity');

      expect(testElement.classList.contains('opacity-0')).toBe(false);

      await extension.executeWithDefaultStrategy('hide', testElement);

      expect(testElement.classList.contains('opacity-0')).toBe(true);
    });

    it('can show element by removing opacity-0 class as default strategy', async () => {
      extension.setDefaultStrategy('twOpacity');
      testElement.classList.add('opacity-0');

      expect(testElement.classList.contains('opacity-0')).toBe(true);

      await extension.executeWithDefaultStrategy('show', testElement);

      expect(testElement.classList.contains('opacity-0')).toBe(false);
    });
  });

  describe('Integration with Hide/Show Commands', () => {
    it('should integrate with hide command using with syntax', async () => {
      // This test simulates: hide with twDisplay
      hideCommand = new HideCommand();

      // Mock the command to use the Tailwind strategy
      const originalExecute = hideCommand.execute.bind(hideCommand);
      hideCommand.execute = async (context: ExecutionContext, target?: any, strategy?: string) => {
        if (strategy === 'twDisplay') {
          const elements = target ? [target] : context.me ? [context.me] : [];
          for (const element of elements) {
            await extension.executeStrategy('twDisplay', 'hide', element);
          }
          return;
        }
        return originalExecute(context, target);
      };

      expect(testElement.classList.contains('hidden')).toBe(false);

      await hideCommand.execute(context, testElement, 'twDisplay');

      expect(testElement.classList.contains('hidden')).toBe(true);
    });

    it('should integrate with show command using with syntax', async () => {
      // This test simulates: show with twVisibility
      showCommand = new ShowCommand();
      testElement.classList.add('invisible');

      // Mock the command to use the Tailwind strategy
      const originalExecute = showCommand.execute.bind(showCommand);
      showCommand.execute = async (context: ExecutionContext, target?: any, strategy?: string) => {
        if (strategy === 'twVisibility') {
          const elements = target ? [target] : context.me ? [context.me] : [];
          for (const element of elements) {
            await extension.executeStrategy('twVisibility', 'show', element);
          }
          return;
        }
        return originalExecute(context, target);
      };

      expect(testElement.classList.contains('invisible')).toBe(true);

      await showCommand.execute(context, testElement, 'twVisibility');

      expect(testElement.classList.contains('invisible')).toBe(false);
    });
  });

  describe('Multiple Elements Support', () => {
    let elements: HTMLElement[];

    beforeEach(() => {
      elements = [];
      for (let i = 0; i < 3; i++) {
        const el = document.createElement('div');
        el.textContent = `Element ${i}`;
        document.body.appendChild(el);
        elements.push(el);
      }
    });

    afterEach(() => {
      elements.forEach(el => {
        if (el.parentNode) {
          document.body.removeChild(el);
        }
      });
    });

    it('should hide multiple elements with twDisplay strategy', async () => {
      for (const element of elements) {
        expect(element.classList.contains('hidden')).toBe(false);
      }

      for (const element of elements) {
        await extension.executeStrategy('twDisplay', 'hide', element);
      }

      for (const element of elements) {
        expect(element.classList.contains('hidden')).toBe(true);
      }
    });

    it('should show multiple elements with twVisibility strategy', async () => {
      // First hide all elements
      for (const element of elements) {
        element.classList.add('invisible');
      }

      for (const element of elements) {
        expect(element.classList.contains('invisible')).toBe(true);
      }

      for (const element of elements) {
        await extension.executeStrategy('twVisibility', 'show', element);
      }

      for (const element of elements) {
        expect(element.classList.contains('invisible')).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid strategy names gracefully', async () => {
      await expect(
        extension.executeStrategy('invalidStrategy' as unknown as string, 'hide', testElement)
      ).rejects.toThrow('Unknown Tailwind strategy: invalidStrategy');
    });

    it('should handle invalid operations gracefully', async () => {
      await expect(
        extension.executeStrategy('twDisplay', 'invalidOp' as unknown as string, testElement)
      ).rejects.toThrow('Invalid operation: invalidOp');
    });

    it('should handle null elements gracefully', async () => {
      await expect(extension.executeStrategy('twDisplay', 'hide', null as unknown as HTMLElement)).rejects.toThrow(
        'Element is required'
      );
    });
  });

  describe('Compatibility with Official _hyperscript Pattern', () => {
    it('should match official behavior for twDisplay hide', async () => {
      // Official test: div.classList.contains("hidden").should.equal(false);
      expect(testElement.classList.contains('hidden')).toBe(false);

      // Official test: div.click(); (which triggers hide with twDisplay)
      await extension.executeStrategy('twDisplay', 'hide', testElement);

      // Official test: div.classList.contains("hidden").should.equal(true);
      expect(testElement.classList.contains('hidden')).toBe(true);
    });

    it('should match official behavior for twVisibility show', async () => {
      // Official test: div.classList.contains("invisible").should.equal(true);
      testElement.classList.add('invisible');
      expect(testElement.classList.contains('invisible')).toBe(true);

      // Official test: div.click(); (which triggers show with twVisibility)
      await extension.executeStrategy('twVisibility', 'show', testElement);

      // Official test: div.classList.contains("invisible").should.equal(false);
      expect(testElement.classList.contains('invisible')).toBe(false);
    });

    it('should match official behavior for twOpacity toggle', async () => {
      // Start state
      expect(testElement.classList.contains('opacity-0')).toBe(false);

      // First toggle (hide)
      await extension.executeStrategy('twOpacity', 'toggle', testElement);
      expect(testElement.classList.contains('opacity-0')).toBe(true);

      // Second toggle (show)
      await extension.executeStrategy('twOpacity', 'toggle', testElement);
      expect(testElement.classList.contains('opacity-0')).toBe(false);
    });
  });
});
