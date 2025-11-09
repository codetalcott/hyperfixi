/**
 * Tests for break command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BreakCommand } from './break';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Break Command', () => {
  let command: BreakCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new BreakCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags)
      context.flags = {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false,
      };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('break');
      expect(command.syntax).toBe('break');
      expect(command.description).toContain('break');
      expect(command.description).toContain('loop');
    });

    it('should be a control flow command', () => {
      expect(command.isBlocking).toBe(true);
    });
  });

  describe('Basic Break Functionality', () => {
    it('should set breaking flag to true', async () => {
      expect(context.flags?.breaking).toBe(false);

      await command.execute(context);

      expect(context.flags?.breaking).toBe(true);
    });

    it('should not affect other flags', async () => {
      context.flags!.async = true;
      context.flags!.halted = false;
      context.flags!.returning = false;

      await command.execute(context);

      expect(context.flags?.async).toBe(true);
      expect(context.flags?.halted).toBe(false);
      expect(context.flags?.returning).toBe(false);
      expect(context.flags?.breaking).toBe(true);
    });

    it('should return undefined', async () => {
      const result = await command.execute(context);

      expect(result).toBe(undefined);
    });
  });

  describe('Loop Integration', () => {
    it('should break out of repeat loop', async () => {
      let iterationCount = 0;
      context.flags!.breaking = false;

      // Simulate loop checking breaking flag
      for (let i = 0; i < 10; i++) {
        if (context.flags?.breaking) {
          break;
        }

        iterationCount++;

        if (i === 3) {
          await command.execute(context);
        }
      }

      expect(iterationCount).toBe(4); // 0, 1, 2, 3 then break
      expect(context.flags?.breaking).toBe(true);
    });

    it('should work with for loops', async () => {
      const executedItems: string[] = [];
      const items = ['a', 'b', 'c', 'd', 'e'];

      for (const item of items) {
        if (context.flags?.breaking) {
          break;
        }

        executedItems.push(item);

        if (item === 'c') {
          await command.execute(context);
        }
      }

      expect(executedItems).toEqual(['a', 'b', 'c']);
      expect(context.flags?.breaking).toBe(true);
    });

    it('should work with while loops', async () => {
      let counter = 0;

      while (counter < 10 && !context.flags?.breaking) {
        counter++;

        if (counter === 5) {
          await command.execute(context);
        }
      }

      expect(counter).toBe(5);
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Nested Loop Behavior', () => {
    it('should break only the innermost loop by default', async () => {
      let outerCount = 0;
      let innerCount = 0;

      // Simulate nested loop structure
      for (let i = 0; i < 3; i++) {
        outerCount++;
        context.flags!.breaking = false; // Reset for each outer iteration

        for (let j = 0; j < 5; j++) {
          if (context.flags?.breaking) {
            break;
          }

          innerCount++;

          if (j === 2) {
            await command.execute(context);
          }
        }
      }

      expect(outerCount).toBe(3); // All outer iterations complete
      expect(innerCount).toBe(9); // 3 inner loops, each stopping at position 3 (0,1,2)
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle basic break in repeat loop', async () => {
      // LSP pattern: repeat for item in items if item.invalid then break
      const items = [
        { name: 'valid1', invalid: false },
        { name: 'valid2', invalid: false },
        { name: 'invalid', invalid: true },
        { name: 'valid3', invalid: false },
      ];

      const processedItems: any[] = [];

      for (const item of items) {
        if (context.flags?.breaking) {
          break;
        }

        processedItems.push(item);

        if (item.invalid) {
          await command.execute(context);
        }
      }

      expect(processedItems).toHaveLength(3);
      expect(processedItems[2].name).toBe('invalid');
      expect(context.flags?.breaking).toBe(true);
    });

    it('should handle conditional break patterns', async () => {
      // Pattern: break when condition is met
      context.locals.set('maxItems', 3);
      let itemCount = 0;

      const items = ['a', 'b', 'c', 'd', 'e', 'f'];
      const processedItems: string[] = [];

      for (const item of items) {
        if (context.flags?.breaking) {
          break;
        }

        processedItems.push(item);
        itemCount++;

        const maxItems = context.locals.get('maxItems');
        if (itemCount >= maxItems) {
          await command.execute(context);
        }
      }

      expect(processedItems).toEqual(['a', 'b', 'c']);
      expect(context.flags?.breaking).toBe(true);
    });

    it('should work in search/find patterns', async () => {
      // Pattern: break when target found
      const searchTarget = 'target';
      const items = ['item1', 'item2', 'target', 'item4', 'item5'];
      let foundItem: string | null = null;

      for (const item of items) {
        if (context.flags?.breaking) {
          break;
        }

        if (item === searchTarget) {
          foundItem = item;
          await command.execute(context);
        }
      }

      expect(foundItem).toBe('target');
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Event Context Integration', () => {
    it('should work in event handlers with loops', async () => {
      const clickEvent = {
        type: 'click',
        target: testElement,
      } as any;
      context.event = clickEvent;

      let clickCount = 0;
      const maxClicks = 3;

      // Simulate multiple click handling with break
      for (let i = 0; i < 10; i++) {
        if (context.flags?.breaking) {
          break;
        }

        clickCount++;

        if (clickCount >= maxClicks) {
          await command.execute(context);
        }
      }

      expect(clickCount).toBe(maxClicks);
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null context gracefully', async () => {
      const nullContext = {} as ExecutionContext;

      await expect(command.execute(nullContext)).resolves.not.toThrow();
    });

    it('should initialize flags if not present', async () => {
      delete context.flags;

      await command.execute(context);

      expect(context.flags).toBeDefined();
      expect(context.flags?.breaking).toBe(true);
    });

    it('should handle context without flags property', async () => {
      const contextWithoutFlags = { ...context };
      delete (contextWithoutFlags as any).flags;

      await command.execute(contextWithoutFlags);

      expect(contextWithoutFlags.flags).toBeDefined();
      expect(contextWithoutFlags.flags?.breaking).toBe(true);
    });

    it('should not throw on repeated break calls', async () => {
      await command.execute(context);
      expect(context.flags?.breaking).toBe(true);

      await command.execute(context);
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid break calls efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        context.flags!.breaking = false;
        await command.execute(context);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should not leak memory on repeated use', async () => {
      // Create many contexts to test memory usage
      const contexts: ExecutionContext[] = [];

      for (let i = 0; i < 100; i++) {
        const ctx = createMockHyperscriptContext(testElement) as ExecutionContext;
        await command.execute(ctx);
        contexts.push(ctx);
      }

      // All should have breaking flag set
      contexts.forEach(ctx => {
        expect(ctx.flags?.breaking).toBe(true);
      });
    });
  });

  describe('Integration with Runtime', () => {
    it('should be detected by loop execution engines', async () => {
      // Simulate runtime checking break condition
      await command.execute(context);

      const shouldBreak = context.flags?.breaking;
      expect(shouldBreak).toBe(true);

      // Runtime would use this flag to exit loops
      if (shouldBreak) {
        expect(true).toBe(true); // Loop would exit here
      }
    });

    it('should work with repeat command integration', async () => {
      // This would be tested in integration with RepeatCommand
      // For now, verify flag setting works correctly

      expect(context.flags?.breaking).toBe(false);
      await command.execute(context);
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Flag Management', () => {
    it('should not interfere with other control flow flags', async () => {
      context.flags!.continuing = true;
      context.flags!.returning = true;
      context.flags!.halted = true;

      await command.execute(context);

      expect(context.flags?.continuing).toBe(true);
      expect(context.flags?.returning).toBe(true);
      expect(context.flags?.halted).toBe(true);
      expect(context.flags?.breaking).toBe(true);
    });

    it('should allow flag reset between iterations', async () => {
      await command.execute(context);
      expect(context.flags?.breaking).toBe(true);

      // Runtime would reset flag for next iteration/context
      context.flags!.breaking = false;
      expect(context.flags?.breaking).toBe(false);

      await command.execute(context);
      expect(context.flags?.breaking).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate no arguments required', () => {
      expect(command.validate([])).toBe(null);
    });

    it('should reject arguments (break takes no parameters)', () => {
      expect(command.validate(['unexpected'])).toBe('Break command takes no arguments');
    });

    it('should reject multiple arguments', () => {
      expect(command.validate(['arg1', 'arg2'])).toBe('Break command takes no arguments');
    });
  });

  describe('Documentation and Examples', () => {
    it('should demonstrate typical usage pattern', async () => {
      // Example: Process items until error condition
      const items = [
        { id: 1, valid: true },
        { id: 2, valid: true },
        { id: 3, valid: false }, // This should trigger break
        { id: 4, valid: true },
      ];

      const processedIds: number[] = [];

      for (const item of items) {
        if (context.flags?.breaking) {
          break;
        }

        processedIds.push(item.id);

        if (!item.valid) {
          await command.execute(context);
        }
      }

      expect(processedIds).toEqual([1, 2, 3]);
      expect(context.flags?.breaking).toBe(true);
    });
  });
});
