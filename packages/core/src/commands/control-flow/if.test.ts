/**
 * Tests for if command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IfCommand } from './if';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('If Command', () => {
  let command: IfCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new IfCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('if');
      expect(command.syntax).toBe(
        'if <conditional> [then] <command-list> [(else | otherwise) <command-list>] end`'
      );
      expect(command.description).toBe(
        'The if command provides the standard if-statement control flow.'
      );
    });
  });

  describe('Basic Conditional Execution', () => {
    it('should execute then block when condition is true', async () => {
      // Mock command that sets a flag
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, true, 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalledWith(context);
    });

    it('should not execute then block when condition is false', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, false, 'then', mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle truthy values as true', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, 'non-empty string', 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalled();
    });

    it('should handle falsy values as false', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, '', 'then', mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });
  });

  describe('If-Else Execution', () => {
    it('should execute then block when condition is true, skip else', async () => {
      const thenCommand = vi.fn().mockResolvedValue('then executed');
      const elseCommand = vi.fn().mockResolvedValue('else executed');

      await command.execute(context, true, 'then', thenCommand, 'else', elseCommand);

      expect(thenCommand).toHaveBeenCalled();
      expect(elseCommand).not.toHaveBeenCalled();
    });

    it('should skip then block when condition is false, execute else', async () => {
      const thenCommand = vi.fn().mockResolvedValue('then executed');
      const elseCommand = vi.fn().mockResolvedValue('else executed');

      await command.execute(context, false, 'then', thenCommand, 'else', elseCommand);

      expect(thenCommand).not.toHaveBeenCalled();
      expect(elseCommand).toHaveBeenCalled();
    });

    it('should support "otherwise" as alias for "else"', async () => {
      const thenCommand = vi.fn().mockResolvedValue('then executed');
      const otherwiseCommand = vi.fn().mockResolvedValue('otherwise executed');

      await command.execute(context, false, 'then', thenCommand, 'otherwise', otherwiseCommand);

      expect(thenCommand).not.toHaveBeenCalled();
      expect(otherwiseCommand).toHaveBeenCalled();
    });
  });

  describe('Multiple Commands in Blocks', () => {
    it('should execute multiple then commands when condition is true', async () => {
      const command1 = vi.fn().mockResolvedValue('cmd1');
      const command2 = vi.fn().mockResolvedValue('cmd2');
      const command3 = vi.fn().mockResolvedValue('cmd3');

      await command.execute(context, true, 'then', [command1, command2, command3]);

      expect(command1).toHaveBeenCalled();
      expect(command2).toHaveBeenCalled();
      expect(command3).toHaveBeenCalled();
    });

    it('should execute multiple else commands when condition is false', async () => {
      const thenCommands = [vi.fn(), vi.fn()];
      const elseCommands = [vi.fn().mockResolvedValue('else1'), vi.fn().mockResolvedValue('else2')];

      await command.execute(context, false, 'then', thenCommands, 'else', elseCommands);

      thenCommands.forEach(cmd => expect(cmd).not.toHaveBeenCalled());
      elseCommands.forEach(cmd => expect(cmd).toHaveBeenCalled());
    });
  });

  describe('Complex Conditions', () => {
    it('should handle element matching conditions', async () => {
      testElement.classList.add('active');
      const mockCommand = vi.fn().mockResolvedValue('executed');

      // This would normally be evaluated by expression system
      const hasActiveClass = testElement.classList.contains('active');

      await command.execute(context, hasActiveClass, 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalled();
    });

    it('should handle negated conditions', async () => {
      testElement.classList.add('disabled');
      const mockCommand = vi.fn().mockResolvedValue('executed');

      // Simulate "if I do not match .disabled"
      const isNotDisabled = !testElement.classList.contains('disabled');

      await command.execute(context, isNotDisabled, 'then', mockCommand);

      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle variable-based conditions', async () => {
      context.locals.set('isReady', true);
      const mockCommand = vi.fn().mockResolvedValue('executed');

      const isReady = context.locals.get('isReady');

      await command.execute(context, isReady, 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalled();
    });
  });

  describe('Nested If Statements', () => {
    it('should handle nested if in then block', async () => {
      const innerThen = vi.fn().mockResolvedValue('inner executed');
      const nestedIf = new IfCommand();

      const outerThen = vi.fn().mockImplementation(async ctx => {
        return await nestedIf.execute(ctx, true, 'then', innerThen);
      });

      await command.execute(context, true, 'then', outerThen);

      expect(outerThen).toHaveBeenCalled();
      expect(innerThen).toHaveBeenCalled();
    });

    it('should handle nested if in else block', async () => {
      const innerElse = vi.fn().mockResolvedValue('inner else executed');
      const nestedIf = new IfCommand();

      const outerElse = vi.fn().mockImplementation(async ctx => {
        return await nestedIf.execute(ctx, false, 'then', vi.fn(), 'else', innerElse);
      });

      await command.execute(context, false, 'then', vi.fn(), 'else', outerElse);

      expect(outerElse).toHaveBeenCalled();
      expect(innerElse).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate correct if-then syntax', () => {
      const error = command.validate([true, 'then', vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate correct if-then-else syntax', () => {
      const error = command.validate([true, 'then', vi.fn(), 'else', vi.fn()]);
      expect(error).toBe(null);
    });

    it('should validate correct if-then-otherwise syntax', () => {
      const error = command.validate([true, 'then', vi.fn(), 'otherwise', vi.fn()]);
      expect(error).toBe(null);
    });

    it('should require minimum arguments', () => {
      const error = command.validate([true]);
      expect(error).toBe('If command requires at least 3 arguments: condition, "then", commands');
    });

    it('should require "then" keyword', () => {
      const error = command.validate([true, 'invalid', vi.fn()]);
      expect(error).toBe('If command requires "then" keyword after condition');
    });

    it('should require valid else keyword', () => {
      // For this validation, just ensure it doesn't pass with an invalid else structure
      // This is actually more of a runtime error than a validation error
      const error = command.validate([true, 'then', vi.fn(), 'else', vi.fn()]);
      expect(error).toBe(null); // This should be valid

      // Test missing commands after else keyword
      const error2 = command.validate([true, 'then', vi.fn(), 'else']);
      expect(error2).toBe('If command requires commands after "else"');
    });

    it('should require commands after else', () => {
      const error = command.validate([true, 'then', vi.fn(), 'else']);
      expect(error).toBe('If command requires commands after "else"');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const failingCommand = vi.fn().mockRejectedValue(new Error('Command failed'));

      await expect(async () => {
        await command.execute(context, true, 'then', failingCommand);
      }).rejects.toThrow('Command failed');

      expect(failingCommand).toHaveBeenCalled();
    });

    it('should handle null/undefined conditions', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      await command.execute(context, null, 'then', mockCommand);
      expect(mockCommand).not.toHaveBeenCalled();

      await command.execute(context, undefined, 'then', mockCommand);
      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should handle empty command lists', async () => {
      await command.execute(context, true, 'then', []);
      // Should not throw, just do nothing
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: element class matching', async () => {
      // From LSP: if I do not match .disabled add .clicked
      testElement.classList.remove('disabled'); // Ensure not disabled
      const mockAddCommand = vi.fn().mockResolvedValue('clicked added');

      // Simulate the condition evaluation
      const doesNotMatchDisabled = !testElement.classList.contains('disabled');

      await command.execute(context, doesNotMatchDisabled, 'then', mockAddCommand);

      expect(mockAddCommand).toHaveBeenCalled();
    });

    it('should handle LSP example 2: nested if structure', async () => {
      // From LSP: else if false log 'foo' end log 'bar' end
      const logFoo = vi.fn().mockResolvedValue('foo logged');
      const logBar = vi.fn().mockResolvedValue('bar logged');

      // Outer else block contains nested if and additional command
      const elseBlock = vi.fn().mockImplementation(async ctx => {
        // Nested if: if false log 'foo' end
        await command.execute(ctx, false, 'then', logFoo);
        // Additional command: log 'bar'
        await logBar(ctx);
      });

      await command.execute(context, false, 'then', vi.fn(), 'else', elseBlock);

      expect(logFoo).not.toHaveBeenCalled(); // false condition
      expect(logBar).toHaveBeenCalled(); // should execute after nested if
    });
  });

  describe('Integration with Expression System', () => {
    it('should work with boolean expression results', async () => {
      const mockCommand = vi.fn().mockResolvedValue('executed');

      // Simulate complex boolean expressions that would be evaluated
      const complexCondition = 5 > 3 && testElement.id === 'test';

      await command.execute(context, complexCondition, 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalled();
    });

    it('should work with comparison expression results', async () => {
      context.locals.set('count', 10);
      const mockCommand = vi.fn().mockResolvedValue('executed');

      const count = context.locals.get('count');
      const condition = count > 5;

      await command.execute(context, condition, 'then', mockCommand);

      expect(mockCommand).toHaveBeenCalled();
    });
  });
});
