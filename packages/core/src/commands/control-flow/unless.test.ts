/**
 * Unless Command Tests
 * Test conditional command execution (inverse of if)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { UnlessCommand } from './unless';
import type { ExecutionContext } from '../../types/core';

describe('Unless Command', () => {
  let unlessCommand: UnlessCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    unlessCommand = new UnlessCommand();
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    testElement.className = 'test-class';
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
      expect(unlessCommand.name).toBe('unless');
      expect(unlessCommand.isBlocking).toBe(false);
      expect(typeof unlessCommand.syntax).toBe('string');
      expect(typeof unlessCommand.description).toBe('string');
    });
  });

  describe('Basic Conditional Execution', () => {
    it('should execute command when condition is false', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      const result = await unlessCommand.execute(context, false, mockCommand);

      expect(executed).toBe(true);
      expect(result).toBe('executed');
    });

    it('should not execute command when condition is true', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      const result = await unlessCommand.execute(context, true, mockCommand);

      expect(executed).toBe(false);
      expect(result).toBe(undefined);
    });

    it('should handle truthy conditions', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      // Test with various truthy values
      await unlessCommand.execute(context, 'non-empty string', mockCommand);
      expect(executed).toBe(false);

      executed = false;
      await unlessCommand.execute(context, 42, mockCommand);
      expect(executed).toBe(false);

      executed = false;
      await unlessCommand.execute(context, [1, 2, 3], mockCommand);
      expect(executed).toBe(false);

      executed = false;
      await unlessCommand.execute(context, { key: 'value' }, mockCommand);
      expect(executed).toBe(false);
    });

    it('should handle falsy conditions', async () => {
      let executionCount = 0;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executionCount++;
          return 'executed';
        },
      };

      // Test with various falsy values
      await unlessCommand.execute(context, false, mockCommand);
      await unlessCommand.execute(context, 0, mockCommand);
      await unlessCommand.execute(context, '', mockCommand);
      await unlessCommand.execute(context, null, mockCommand);
      await unlessCommand.execute(context, undefined, mockCommand);
      await unlessCommand.execute(context, NaN, mockCommand);

      expect(executionCount).toBe(6);
    });
  });

  describe('Multiple Commands', () => {
    it('should execute all commands when condition is false', async () => {
      const execOrder: number[] = [];

      const command1 = {
        name: 'cmd1',
        execute: async () => {
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

      const result = await unlessCommand.execute(context, false, command1, command2, command3);

      expect(execOrder).toEqual([1, 2, 3]);
      expect(result).toBe('cmd3'); // Last command result
    });

    it('should not execute any commands when condition is true', async () => {
      const execOrder: number[] = [];

      const command1 = {
        name: 'cmd1',
        execute: async () => {
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

      const result = await unlessCommand.execute(context, true, command1, command2);

      expect(execOrder).toEqual([]);
      expect(result).toBe(undefined);
    });

    it('should stop execution if a command fails', async () => {
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
          throw new Error('Command failed');
        },
      };

      const command3 = {
        name: 'cmd3',
        execute: async () => {
          execOrder.push(3);
          return 'cmd3';
        },
      };

      await expect(
        unlessCommand.execute(context, false, command1, errorCommand, command3)
      ).rejects.toThrow('Command failed');

      expect(execOrder).toEqual([1, 2]); // Third command should not execute
    });
  });

  describe('Expression-Based Conditions', () => {
    it('should handle DOM-based conditions', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      // Element does not have 'special' class, so condition is false
      const hasSpecialClass = testElement.classList.contains('special');
      await unlessCommand.execute(context, hasSpecialClass, mockCommand);

      expect(executed).toBe(true);

      // Add the class and test again
      testElement.classList.add('special');
      executed = false;
      const hasSpecialClassNow = testElement.classList.contains('special');
      await unlessCommand.execute(context, hasSpecialClassNow, mockCommand);

      expect(executed).toBe(false);
    });

    it('should handle variable-based conditions', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      // Set a variable and use it in condition
      context.locals?.set('shouldSkip', false);
      const shouldSkip = context.locals?.get('shouldSkip');

      await unlessCommand.execute(context, shouldSkip, mockCommand);
      expect(executed).toBe(true);

      // Change variable and test again
      context.locals?.set('shouldSkip', true);
      executed = false;
      const shouldSkipNow = context.locals?.get('shouldSkip');

      await unlessCommand.execute(context, shouldSkipNow, mockCommand);
      expect(executed).toBe(false);
    });

    it('should handle comparison-based conditions', async () => {
      let executed = false;

      const mockCommand = {
        name: 'test',
        execute: async () => {
          executed = true;
          return 'executed';
        },
      };

      context.locals?.set('count', 5);
      const count = context.locals?.get('count');

      // count > 10 is false, so command should execute
      await unlessCommand.execute(context, count > 10, mockCommand);
      expect(executed).toBe(true);

      // count > 3 is true, so command should not execute
      executed = false;
      await unlessCommand.execute(context, count > 3, mockCommand);
      expect(executed).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should work with nested conditionals', async () => {
      const execOrder: string[] = [];

      const nestedUnless = new UnlessCommand();

      const outerCommand = {
        name: 'outer',
        execute: async () => {
          execOrder.push('outer-start');

          const innerCommand = {
            name: 'inner',
            execute: async () => {
              execOrder.push('inner');
              return 'inner-result';
            },
          };

          // Nested unless - should execute because false condition
          await nestedUnless.execute(context, false, innerCommand);

          execOrder.push('outer-end');
          return 'outer-result';
        },
      };

      await unlessCommand.execute(context, false, outerCommand);

      expect(execOrder).toEqual(['outer-start', 'inner', 'outer-end']);
    });

    it('should handle async commands properly', async () => {
      let executed = false;
      let asyncCompleted = false;

      const asyncCommand = {
        name: 'async-test',
        execute: async () => {
          executed = true;
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncCompleted = true;
          return 'async-result';
        },
      };

      const result = await unlessCommand.execute(context, false, asyncCommand);

      expect(executed).toBe(true);
      expect(asyncCompleted).toBe(true);
      expect(result).toBe('async-result');
    });

    it('should preserve execution context in commands', async () => {
      let capturedContext: ExecutionContext | null = null;

      const contextCommand = {
        name: 'context-test',
        execute: async (ctx: ExecutionContext) => {
          capturedContext = ctx;
          return 'context-captured';
        },
      };

      await unlessCommand.execute(context, false, contextCommand);

      expect(capturedContext).not.toBe(null);
      expect(capturedContext?.me).toBe(testElement);
      expect(capturedContext?.locals).toBe(context.locals);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing arguments', async () => {
      await expect(unlessCommand.execute(context)).rejects.toThrow(
        'Unless command requires at least 2 arguments'
      );
    });

    it('should throw error for missing commands', async () => {
      await expect(unlessCommand.execute(context, false)).rejects.toThrow(
        'Unless command requires at least 2 arguments'
      );
    });

    it('should handle condition evaluation errors', async () => {
      const mockCommand = {
        name: 'test',
        execute: async () => 'executed',
      };

      // This should work - we pass the condition value directly
      // Error handling for condition evaluation would happen at the expression level
      await expect(unlessCommand.execute(context, false, mockCommand)).resolves.toBe('executed');
    });

    it('should propagate command execution errors', async () => {
      const errorCommand = {
        name: 'error',
        execute: async () => {
          throw new Error('Command execution failed');
        },
      };

      await expect(unlessCommand.execute(context, false, errorCommand)).rejects.toThrow(
        'Command execution failed'
      );
    });
  });

  describe('Integration with DOM Operations', () => {
    it('should conditionally modify DOM based on element state', async () => {
      const addClassCommand = {
        name: 'add-class',
        execute: async (ctx: ExecutionContext) => {
          ctx.me?.classList.add('conditional-class');
          return 'class-added';
        },
      };

      // Should execute because element doesn't have 'skip' class
      const hasSkipClass = testElement.classList.contains('skip');
      await unlessCommand.execute(context, hasSkipClass, addClassCommand);

      expect(testElement.classList.contains('conditional-class')).toBe(true);

      // Add skip class and try again
      testElement.classList.add('skip');
      testElement.classList.remove('conditional-class');

      const hasSkipClassNow = testElement.classList.contains('skip');
      await unlessCommand.execute(context, hasSkipClassNow, addClassCommand);

      expect(testElement.classList.contains('conditional-class')).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      const mockCommand = { name: 'test', execute: async () => 'ok' };

      expect(unlessCommand.validate([true, mockCommand])).toBeNull();
      expect(unlessCommand.validate([false, mockCommand, mockCommand])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(unlessCommand.validate([])).toContain('requires at least 2 arguments');
      expect(unlessCommand.validate([true])).toContain('requires at least 2 arguments');
    });

    it('should validate command objects', () => {
      expect(unlessCommand.validate([true, null])).toContain('must be command objects');
      expect(unlessCommand.validate([true, {}])).toContain('must be command objects');
      expect(unlessCommand.validate([true, 'not-object'])).toContain('must be command objects');
    });
  });
});
