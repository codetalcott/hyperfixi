/**
 * ConditionalCommand (if/unless) Unit Tests
 *
 * Comprehensive tests for if/unless conditional execution:
 * - Basic if/else conditions
 * - Unless mode (inverted logic)
 * - Condition evaluation
 * - Branch execution tracking
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionalCommand, createConditionalCommand, type ConditionalCommandInput } from './if';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode } from '../../types/base-types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(): TypedExecutionContext {
  return {
    me: null,
    locals: new Map([['_runtimeExecute', vi.fn(async () => 'executed')]]),
    target: null,
    result: undefined,
    halted: false,
    it: undefined,
  };
}

function createMockEvaluator(returnValue: any = true): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async () => returnValue),
  } as unknown as ExpressionEvaluator;
}

function createMockBlock(commands: any[] = []): ASTNode {
  return {
    type: 'block',
    commands,
  } as ASTNode;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('ConditionalCommand', () => {
  let command: ConditionalCommand;

  beforeEach(() => {
    command = new ConditionalCommand();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createConditionalCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('If Mode - Parsing', () => {
    it('should parse basic if condition with then branch', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;
      const thenBlock = createMockBlock([{ type: 'command' }]);

      const input = await command.parseInput(
        { args: [conditionNode, thenBlock], modifiers: {}, commandName: 'if' },
        evaluator,
        context
      );

      expect(input.mode).toBe('if');
      expect(input.condition).toBe(true);
      expect(input.thenCommands).toBeDefined();
    });

    it('should parse if-else with both branches', async () => {
      const evaluator = createMockEvaluator(false);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: false } as ASTNode;
      const thenBlock = createMockBlock([{ type: 'command', name: 'then-cmd' }]);
      const elseBlock = createMockBlock([{ type: 'command', name: 'else-cmd' }]);

      const input = await command.parseInput(
        { args: [conditionNode, thenBlock, elseBlock], modifiers: {}, commandName: 'if' },
        evaluator,
        context
      );

      expect(input.mode).toBe('if');
      expect(input.thenCommands).toBeDefined();
      expect(input.elseCommands).toBeDefined();
    });

    it('should parse if with modifier syntax (then/else modifiers)', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;
      const thenBlock = createMockBlock();
      const elseBlock = createMockBlock();

      const input = await command.parseInput(
        {
          args: [conditionNode],
          modifiers: { then: thenBlock, else: elseBlock },
          commandName: 'if',
        },
        evaluator,
        context
      );

      expect(input.mode).toBe('if');
      expect(input.thenCommands).toBe(thenBlock);
      expect(input.elseCommands).toBe(elseBlock);
    });

    it('should throw error if no condition provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {}, commandName: 'if' }, evaluator, context)
      ).rejects.toThrow('if command requires a condition');
    });

    it('should throw error if no then branch provided', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;

      await expect(
        command.parseInput(
          { args: [conditionNode], modifiers: {}, commandName: 'if' },
          evaluator,
          context
        )
      ).rejects.toThrow('if command requires "then" branch');
    });
  });

  describe('Unless Mode - Parsing', () => {
    it('should parse unless command with inverted logic', async () => {
      const evaluator = createMockEvaluator(false);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: false } as ASTNode;
      const commandNode = { type: 'command', name: 'show' } as ASTNode;

      const input = await command.parseInput(
        { args: [conditionNode, commandNode], modifiers: {}, commandName: 'unless' },
        evaluator,
        context
      );

      expect(input.mode).toBe('unless');
      expect(input.condition).toBe(false);
      expect(input.thenCommands).toEqual([commandNode]);
    });

    it('should throw error if unless has no commands', async () => {
      const evaluator = createMockEvaluator(true);
      const context = createMockContext();

      const conditionNode = { type: 'boolean', value: true } as ASTNode;

      await expect(
        command.parseInput(
          { args: [conditionNode], modifiers: {}, commandName: 'unless' },
          evaluator,
          context
        )
      ).rejects.toThrow('unless command requires a condition and at least one command');
    });
  });

  describe('Execution - If Mode', () => {
    it('should execute then branch when condition is true', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'then-result');
      context.locals.set('_runtimeExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);

      expect(output.mode).toBe('if');
      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('then');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute else branch when condition is false', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'else-result');
      context.locals.set('_runtimeExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command', name: 'then' }]),
        elseCommands: createMockBlock([{ type: 'command', name: 'else' }]),
      };

      const output = await command.execute(input, context);

      expect(output.mode).toBe('if');
      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('else');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute neither branch when condition is false and no else', async () => {
      const context = createMockContext();

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);

      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('none');
    });

    it('should evaluate truthy values as true', async () => {
      const context = createMockContext();

      const truthyValues = [1, 'non-empty', {}, [], -1];

      for (const value of truthyValues) {
        const input: ConditionalCommandInput = {
          mode: 'if',
          condition: value,
          thenCommands: createMockBlock(),
        };

        const output = await command.execute(input, context);
        expect(output.conditionResult).toBe(true);
        expect(output.executedBranch).toBe('then');
      }
    });

    it('should evaluate falsy values as false', async () => {
      const context = createMockContext();

      const falsyValues = [0, '', null, undefined, false];

      for (const value of falsyValues) {
        const input: ConditionalCommandInput = {
          mode: 'if',
          condition: value,
          thenCommands: createMockBlock(),
        };

        const output = await command.execute(input, context);
        expect(output.conditionResult).toBe(false);
        expect(output.executedBranch).toBe('none');
      }
    });
  });

  describe('Execution - Unless Mode', () => {
    it('should execute commands when condition is false (inverted logic)', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'result');
      context.locals.set('_runtimeExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);

      expect(output.conditionResult).toBe(false);
      expect(output.executedBranch).toBe('then');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should NOT execute commands when condition is true', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn();
      context.locals.set('_runtimeExecute', mockExecute);

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);

      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('none');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should update context.it with result in unless mode', async () => {
      const context = createMockContext();
      const expectedResult = 'unless-result';
      context.locals.set(
        '_runtimeExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'unless',
        condition: false,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      await command.execute(input, context);

      expect(context.it).toBe(expectedResult);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty blocks', async () => {
      const context = createMockContext();

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([]),
      };

      const output = await command.execute(input, context);
      expect(output.executedBranch).toBe('then');
    });

    it('should handle complex condition expressions', async () => {
      const context = createMockContext();
      context.locals.set('x', 10);
      context.locals.set('y', 5);

      // Simulate a complex condition (x > y)
      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: 10 > 5,
        thenCommands: createMockBlock(),
      };

      const output = await command.execute(input, context);
      expect(output.conditionResult).toBe(true);
      expect(output.executedBranch).toBe('then');
    });

    it('should handle array of commands', async () => {
      const context = createMockContext();

      const cmd1 = { execute: vi.fn(async () => 'cmd1') };
      const cmd2 = { execute: vi.fn(async () => 'cmd2') };

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: [cmd1, cmd2],
      };

      const output = await command.execute(input, context);

      expect(output.executedBranch).toBe('then');
      expect(cmd1.execute).toHaveBeenCalled();
      expect(cmd2.execute).toHaveBeenCalled();
    });
  });

  describe('Return Values', () => {
    it('should return result from then branch', async () => {
      const context = createMockContext();
      const expectedResult = { value: 42 };
      context.locals.set(
        '_runtimeExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: true,
        thenCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);
      expect(output.result).toBe(expectedResult);
    });

    it('should return result from else branch', async () => {
      const context = createMockContext();
      const expectedResult = { value: 99 };
      context.locals.set(
        '_runtimeExecute',
        vi.fn(async () => expectedResult)
      );

      const input: ConditionalCommandInput = {
        mode: 'if',
        condition: false,
        thenCommands: createMockBlock(),
        elseCommands: createMockBlock([{ type: 'command' }]),
      };

      const output = await command.execute(input, context);
      expect(output.result).toBe(expectedResult);
    });
  });
});
