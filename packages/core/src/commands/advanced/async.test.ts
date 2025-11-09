/**
 * Async Command Tests
 * Test asynchronous command execution patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { AsyncCommand } from './async';
import type { ExecutionContext } from '../../types/core';

describe('Async Command', () => {
  let asyncCommand: AsyncCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    asyncCommand = new AsyncCommand();
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      locals: new Map(),
    };
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(asyncCommand.name).toBe('async');
      expect(asyncCommand.isBlocking).toBe(false);
      expect(typeof asyncCommand.syntax).toBe('string');
      expect(typeof asyncCommand.description).toBe('string');
    });
  });

  describe('Asynchronous Execution', () => {
    it('should execute single command asynchronously', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'ok';
        },
      };

      // Execute async command
      const result = asyncCommand.execute(context, mockCommand);

      // Command should not have executed yet (async)
      expect(executed).toBe(false);

      // Wait for async execution to complete
      await result;

      // Now command should be executed
      expect(executed).toBe(true);
    });

    it('should execute multiple commands asynchronously in sequence', async () => {
      const execOrder: number[] = [];

      const command1 = {
        name: 'cmd1',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          execOrder.push(1);
          return 'cmd1';
        },
      };

      const command2 = {
        name: 'cmd2',
        execute: async () => {
          execOrder.push(2);
          return 'cmd2';
        },
      };

      const command3 = {
        name: 'cmd3',
        execute: async () => {
          execOrder.push(3);
          return 'cmd3';
        },
      };

      // Execute async commands
      const result = asyncCommand.execute(context, command1, command2, command3);

      // Commands should not have executed yet
      expect(execOrder).toEqual([]);

      // Wait for completion
      await result;

      // Commands should execute in order
      expect(execOrder).toEqual([1, 2, 3]);
    });

    it('should not block synchronous execution flow', async () => {
      let asyncExecuted = false;
      let syncExecuted = false;

      const slowAsyncCommand = {
        name: 'slow',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          asyncExecuted = true;
          return 'slow-done';
        },
      };

      // Start async execution
      const asyncPromise = asyncCommand.execute(context, slowAsyncCommand);

      // Simulate synchronous code after async command
      syncExecuted = true;

      // Sync should execute immediately
      expect(syncExecuted).toBe(true);
      expect(asyncExecuted).toBe(false);

      // Wait for async to complete
      await asyncPromise;
      expect(asyncExecuted).toBe(true);
    });

    it('should preserve execution context in async commands', async () => {
      let capturedContext: ExecutionContext | null = null;

      const contextCommand = {
        name: 'context-test',
        execute: async (ctx: ExecutionContext) => {
          capturedContext = ctx;
          return 'context-captured';
        },
      };

      await asyncCommand.execute(context, contextCommand);

      expect(capturedContext).not.toBe(null);
      expect(capturedContext?.me).toBe(testElement);
      expect(capturedContext?.locals).toBe(context.locals);
    });
  });

  describe('Error Handling', () => {
    it('should handle async command errors gracefully', async () => {
      const errorCommand = {
        name: 'error-cmd',
        execute: async () => {
          throw new Error('Async command failed');
        },
      };

      await expect(asyncCommand.execute(context, errorCommand)).rejects.toThrow(
        'Async command failed'
      );
    });

    it('should handle errors in command sequence', async () => {
      const execOrder: number[] = [];

      const command1 = {
        name: 'cmd1',
        execute: async () => {
          execOrder.push(1);
          return 'cmd1';
        },
      };

      const errorCommand = {
        name: 'error',
        execute: async () => {
          execOrder.push(2);
          throw new Error('Command 2 failed');
        },
      };

      const command3 = {
        name: 'cmd3',
        execute: async () => {
          execOrder.push(3);
          return 'cmd3';
        },
      };

      await expect(asyncCommand.execute(context, command1, errorCommand, command3)).rejects.toThrow(
        'Command 2 failed'
      );

      // First command should execute, third should not
      expect(execOrder).toEqual([1, 2]);
    });

    it('should throw error for missing commands', async () => {
      await expect(asyncCommand.execute(context)).rejects.toThrow(
        'Async command requires at least one command to execute'
      );
    });
  });

  describe('Integration with Event System', () => {
    it('should allow async commands to trigger events', async () => {
      let eventTriggered = false;

      // Add event listener
      testElement.addEventListener('custom-event', () => {
        eventTriggered = true;
      });

      const eventCommand = {
        name: 'trigger',
        execute: async (ctx: ExecutionContext) => {
          // Simulate triggering an event
          const event = new CustomEvent('custom-event');
          ctx.me?.dispatchEvent(event);
          return 'event-triggered';
        },
      };

      await asyncCommand.execute(context, eventCommand);

      expect(eventTriggered).toBe(true);
    });

    it('should work with wait-like commands in async context', async () => {
      let waited = false;

      const waitCommand = {
        name: 'wait',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          waited = true;
          return 'wait-complete';
        },
      };

      const startTime = Date.now();
      await asyncCommand.execute(context, waitCommand);
      const endTime = Date.now();

      expect(waited).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(15); // Allow some timing variance
    });
  });

  describe('DOM Manipulation in Async Context', () => {
    it('should allow DOM modifications in async commands', async () => {
      const domCommand = {
        name: 'add-class',
        execute: async (ctx: ExecutionContext) => {
          ctx.me?.classList.add('async-class');
          return 'class-added';
        },
      };

      expect(testElement.classList.contains('async-class')).toBe(false);

      await asyncCommand.execute(context, domCommand);

      expect(testElement.classList.contains('async-class')).toBe(true);
    });

    it('should handle complex DOM operations asynchronously', async () => {
      const complexCommand = {
        name: 'complex-dom',
        execute: async (ctx: ExecutionContext) => {
          // Simulate complex DOM operation
          await new Promise(resolve => setTimeout(resolve, 10));

          if (ctx.me) {
            ctx.me.innerHTML = '<span>Async Content</span>';
            ctx.me.setAttribute('data-async', 'true');
            ctx.me.classList.add('async-modified');
          }

          return 'complex-complete';
        },
      };

      await asyncCommand.execute(context, complexCommand);

      expect(testElement.innerHTML).toBe('<span>Async Content</span>');
      expect(testElement.getAttribute('data-async')).toBe('true');
      expect(testElement.classList.contains('async-modified')).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      const mockCommand = { name: 'test', execute: async () => 'ok' };

      expect(asyncCommand.validate([mockCommand])).toBeNull();
      expect(asyncCommand.validate([mockCommand, mockCommand])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(asyncCommand.validate([])).toContain('requires at least one command');
      expect(asyncCommand.validate([null])).toContain('must be command objects');
      expect(asyncCommand.validate([{}])).toContain('must be command objects');
      expect(asyncCommand.validate([{ execute: () => {} }])).toContain('must be command objects');
    });
  });
});
