/**
 * Tell Command Tests
 * Test element/behavior communication and context switching
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { TellCommand } from './tell';
import type { ExecutionContext } from '../../types/core';

describe('Tell Command', () => {
  let tellCommand: TellCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;
  let targetElement: HTMLElement;

  beforeEach(() => {
    tellCommand = new TellCommand();
    testElement = document.createElement('div');
    testElement.id = 'd1';
    testElement.classList.add('test-element');

    targetElement = document.createElement('div');
    targetElement.id = 'd2';
    targetElement.classList.add('target-element');

    document.body.appendChild(testElement);
    document.body.appendChild(targetElement);

    context = {
      me: testElement,
      locals: new Map(),
    };
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
    if (targetElement.parentNode) {
      document.body.removeChild(targetElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(tellCommand.name).toBe('tell');
      expect(tellCommand.isBlocking).toBe(false);
      expect(typeof tellCommand.syntax).toBe('string');
      expect(typeof tellCommand.description).toBe('string');
    });
  });

  describe('Basic Tell Functionality', () => {
    it('should establish new execution context for target element', async () => {
      // Mock command execution within tell context
      const mockCommand = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          // Verify that 'you' context points to target element
          expect(ctx.you).toBe(targetElement);
          expect(ctx.me).toBe(testElement); // me should remain unchanged

          // Simulate adding a class to the target
          targetElement.classList.add('told-class');
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, mockCommand);

      expect(targetElement.classList.contains('told-class')).toBe(true);
      expect(testElement.classList.contains('told-class')).toBe(false);
    });

    it('should work with CSS selector targets', async () => {
      const mockCommand = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          ctx.you?.classList.add('selector-target');
          return 'ok';
        },
      };

      await tellCommand.execute(context, '#d2', mockCommand);

      expect(targetElement.classList.contains('selector-target')).toBe(true);
    });

    it('should work with array of elements', async () => {
      const target2 = document.createElement('p');
      target2.id = 'p1';
      const target3 = document.createElement('p');
      target3.id = 'p2';
      testElement.appendChild(target2);
      testElement.appendChild(target3);

      const mockCommand = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          ctx.you?.classList.add('array-target');
          return 'ok';
        },
      };

      await tellCommand.execute(context, [target2, target3], mockCommand);

      expect(target2.classList.contains('array-target')).toBe(true);
      expect(target3.classList.contains('array-target')).toBe(true);
      expect(targetElement.classList.contains('array-target')).toBe(false);
    });

    it('should handle null targets gracefully', async () => {
      const mockCommand = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          // Should not execute when target is null
          testElement.classList.add('should-not-execute');
          return 'ok';
        },
      };

      await tellCommand.execute(context, null, mockCommand);

      expect(testElement.classList.contains('should-not-execute')).toBe(false);
    });
  });

  describe('Context References', () => {
    it('should provide you reference to target element', async () => {
      let capturedYou: any;

      const mockCommand = {
        name: 'test',
        execute: async (ctx: ExecutionContext) => {
          capturedYou = ctx.you;
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, mockCommand);

      expect(capturedYou).toBe(targetElement);
    });

    it('should provide your reference for possessive syntax', async () => {
      targetElement.setAttribute('data-test', 'target-value');
      let capturedAttribute: any;

      const mockCommand = {
        name: 'test',
        execute: async (ctx: ExecutionContext) => {
          // Simulate accessing "your @data-test"
          capturedAttribute = ctx.you?.getAttribute('data-test');
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, mockCommand);

      expect(capturedAttribute).toBe('target-value');
    });

    it('should support yourself reference for self-actions', async () => {
      const mockCommand = {
        name: 'remove',
        execute: async (ctx: ExecutionContext) => {
          // Simulate "remove yourself"
          ctx.you?.parentNode?.removeChild(ctx.you);
          return 'ok';
        },
      };

      expect(targetElement.parentNode).toBe(document.body);

      await tellCommand.execute(context, targetElement, mockCommand);

      expect(targetElement.parentNode).toBe(null);
    });

    it('should preserve original me context', async () => {
      let capturedMe: any;

      const mockCommand = {
        name: 'test',
        execute: async (ctx: ExecutionContext) => {
          capturedMe = ctx.me;
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, mockCommand);

      expect(capturedMe).toBe(testElement); // Should still be original element
    });
  });

  describe('Multiple Commands', () => {
    it('should execute multiple commands in tell context', async () => {
      const command1 = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          ctx.you?.classList.add('first-command');
          return 'ok';
        },
      };

      const command2 = {
        name: 'set',
        execute: async (ctx: ExecutionContext) => {
          if (ctx.you) {
            (ctx.you as any).customProp = 'told-value';
          }
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, command1, command2);

      expect(targetElement.classList.contains('first-command')).toBe(true);
      expect((targetElement as any).customProp).toBe('told-value');
    });

    it('should handle command execution errors gracefully', async () => {
      const goodCommand = {
        name: 'add',
        execute: async (ctx: ExecutionContext) => {
          ctx.you?.classList.add('good-command');
          return 'ok';
        },
      };

      const badCommand = {
        name: 'error',
        execute: async () => {
          throw new Error('Command failed');
        },
      };

      await expect(
        tellCommand.execute(context, targetElement, goodCommand, badCommand)
      ).rejects.toThrow('Command failed');

      // First command should have executed before error
      expect(targetElement.classList.contains('good-command')).toBe(true);
    });
  });

  describe('Context Restoration', () => {
    it('should restore original context after tell block', async () => {
      const originalYou = context.you;
      const originalIt = context.it;

      const mockCommand = {
        name: 'test',
        execute: async (ctx: ExecutionContext) => {
          // Modify context within tell
          ctx.it = targetElement;
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, mockCommand);

      // Context should be restored after tell
      expect(context.you).toBe(originalYou);
      expect(context.it).toBe(originalIt);
    });

    it('should handle nested tell commands', async () => {
      const nestedTarget = document.createElement('span');
      nestedTarget.id = 'nested';
      document.body.appendChild(nestedTarget);

      const nestedTell = new TellCommand();

      const outerCommand = {
        name: 'outer',
        execute: async (ctx: ExecutionContext) => {
          ctx.you?.classList.add('outer-told');

          // Nested tell command
          const innerCommand = {
            name: 'inner',
            execute: async (innerCtx: ExecutionContext) => {
              innerCtx.you?.classList.add('inner-told');
              return 'ok';
            },
          };

          await nestedTell.execute(ctx, nestedTarget, innerCommand);
          return 'ok';
        },
      };

      await tellCommand.execute(context, targetElement, outerCommand);

      expect(targetElement.classList.contains('outer-told')).toBe(true);
      expect(nestedTarget.classList.contains('inner-told')).toBe(true);

      document.body.removeChild(nestedTarget);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing arguments', async () => {
      await expect(tellCommand.execute(context)).rejects.toThrow(
        'Tell command requires at least 2 arguments'
      );
    });

    it('should handle invalid target selectors gracefully', async () => {
      const mockCommand = {
        name: 'test',
        execute: async () => 'ok',
      };

      // Should not throw, but also should not execute command
      await tellCommand.execute(context, '#nonexistent', mockCommand);

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      expect(tellCommand.validate([targetElement, { name: 'test' }])).toBeNull();
      expect(tellCommand.validate(['#selector', { name: 'test' }])).toBeNull();
      expect(tellCommand.validate([targetElement, { name: 'cmd1' }, { name: 'cmd2' }])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(tellCommand.validate([])).toContain('requires at least 2 arguments');
      expect(tellCommand.validate([targetElement])).toContain('requires at least 2 arguments');
    });
  });
});
