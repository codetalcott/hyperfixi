/**
 * AsyncCommand Unit Tests
 *
 * Tests for asynchronous command execution:
 * - Sequential command execution
 * - Context propagation
 * - Error handling
 * - Duration tracking
 * - Multiple command scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AsyncCommand, createAsyncCommand, type AsyncCommandInput } from './async';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode } from '../../types/base-types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(): TypedExecutionContext {
  return {
    me: null,
    locals: new Map(),
    target: null,
    result: undefined,
    halted: false,
    it: undefined,
  };
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async node => node),
  } as unknown as ExpressionEvaluator;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('AsyncCommand', () => {
  let command: AsyncCommand;

  beforeEach(() => {
    command = new AsyncCommand();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createAsyncCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('Parsing', () => {
    it('should parse single command', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const cmd1 = { type: 'command', name: 'toggle' } as ASTNode;

      const input = await command.parseInput({ args: [cmd1], modifiers: {} }, evaluator, context);

      expect(input.commands).toHaveLength(1);
      expect(input.commands[0]).toBe(cmd1);
    });

    it('should parse multiple commands', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const cmd1 = { type: 'command', name: 'toggle' } as ASTNode;
      const cmd2 = { type: 'command', name: 'wait' } as ASTNode;
      const cmd3 = { type: 'command', name: 'log' } as ASTNode;

      const input = await command.parseInput(
        { args: [cmd1, cmd2, cmd3], modifiers: {} },
        evaluator,
        context
      );

      expect(input.commands).toHaveLength(3);
      expect(input.commands).toEqual([cmd1, cmd2, cmd3]);
    });

    it('should throw error if no commands provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('async command requires at least one command');
    });
  });

  describe('Execution', () => {
    it('should execute single command', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'result1');

      const input: AsyncCommandInput = {
        commands: [{ execute: mockExecute }],
      };

      const output = await command.execute(input, context);

      expect(output.executed).toBe(true);
      expect(output.commandCount).toBe(1);
      expect(output.results).toEqual(['result1']);
      expect(mockExecute).toHaveBeenCalledWith(context);
      expect(context.it).toBe('result1');
    });

    it('should execute multiple commands in sequence', async () => {
      const context = createMockContext();
      const executionOrder: number[] = [];

      const cmd1 = {
        execute: vi.fn(async () => {
          executionOrder.push(1);
          return 'result1';
        }),
      };
      const cmd2 = {
        execute: vi.fn(async () => {
          executionOrder.push(2);
          return 'result2';
        }),
      };
      const cmd3 = {
        execute: vi.fn(async () => {
          executionOrder.push(3);
          return 'result3';
        }),
      };

      const input: AsyncCommandInput = {
        commands: [cmd1, cmd2, cmd3],
      };

      const output = await command.execute(input, context);

      expect(executionOrder).toEqual([1, 2, 3]);
      expect(output.results).toEqual(['result1', 'result2', 'result3']);
      expect(context.it).toBe('result3');
    });

    it('should execute function commands', async () => {
      const context = createMockContext();
      const fn1 = vi.fn(async () => 'fn-result');

      const input: AsyncCommandInput = {
        commands: [fn1],
      };

      const output = await command.execute(input, context);

      expect(fn1).toHaveBeenCalledWith(context);
      expect(output.results).toEqual(['fn-result']);
    });

    it('should propagate context between commands', async () => {
      const context = createMockContext();

      const cmd1 = {
        execute: vi.fn(async (ctx: TypedExecutionContext) => {
          return 'value-from-cmd1';
        }),
      };
      const cmd2 = {
        execute: vi.fn(async (ctx: TypedExecutionContext) => {
          // Should have access to previous result via context.it
          return ctx.it;
        }),
      };

      const input: AsyncCommandInput = {
        commands: [cmd1, cmd2],
      };

      await command.execute(input, context);

      // Verify context was updated between commands
      expect(context.it).toBe('value-from-cmd1');
    });

    it('should track execution duration', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [
          {
            execute: vi.fn(async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return 'done';
            }),
          },
        ],
      };

      const output = await command.execute(input, context);

      expect(output.duration).toBeGreaterThanOrEqual(0);
      expect(typeof output.duration).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if command execution fails', async () => {
      const context = createMockContext();

      const failingCommand = {
        execute: vi.fn(async () => {
          throw new Error('Command failed');
        }),
      };

      const input: AsyncCommandInput = {
        commands: [failingCommand],
      };

      await expect(command.execute(input, context)).rejects.toThrow(
        'Async command execution failed'
      );
    });

    it('should include command position in error message', async () => {
      const context = createMockContext();

      const cmd1 = { execute: vi.fn(async () => 'ok') };
      const cmd2 = {
        name: 'failing-cmd',
        execute: vi.fn(async () => {
          throw new Error('Test error');
        }),
      };
      const cmd3 = { execute: vi.fn(async () => 'ok') };

      const input: AsyncCommandInput = {
        commands: [cmd1, cmd2, cmd3],
      };

      await expect(command.execute(input, context)).rejects.toThrow('2/3');
    });

    it('should handle invalid command types', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: ['invalid-command' as any],
      };

      await expect(command.execute(input, context)).rejects.toThrow(
        'must be a function or object with execute method'
      );
    });

    it('should stop execution on first error', async () => {
      const context = createMockContext();

      const cmd1 = { execute: vi.fn(async () => 'ok') };
      const cmd2 = {
        execute: vi.fn(async () => {
          throw new Error('Failure');
        }),
      };
      const cmd3 = { execute: vi.fn(async () => 'ok') };

      const input: AsyncCommandInput = {
        commands: [cmd1, cmd2, cmd3],
      };

      try {
        await command.execute(input, context);
      } catch (e) {
        // Expected
      }

      expect(cmd1.execute).toHaveBeenCalled();
      expect(cmd2.execute).toHaveBeenCalled();
      expect(cmd3.execute).not.toHaveBeenCalled();
    });
  });

  describe('Command Types', () => {
    it('should handle command objects with execute method', async () => {
      const context = createMockContext();
      const mockExecute = vi.fn(async () => 'result');

      const input: AsyncCommandInput = {
        commands: [{ execute: mockExecute }],
      };

      await command.execute(input, context);

      expect(mockExecute).toHaveBeenCalled();
    });

    it('should handle function commands', async () => {
      const context = createMockContext();
      const fn = vi.fn(async () => 'result');

      const input: AsyncCommandInput = {
        commands: [fn],
      };

      await command.execute(input, context);

      expect(fn).toHaveBeenCalled();
    });

    it('should handle named functions', async () => {
      const context = createMockContext();
      const namedFunction = async function myCommand() {
        return 'result';
      };

      const input: AsyncCommandInput = {
        commands: [namedFunction],
      };

      const output = await command.execute(input, context);

      expect(output.results).toEqual(['result']);
    });

    it('should handle anonymous functions', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [async () => 'result'],
      };

      const output = await command.execute(input, context);

      expect(output.results).toEqual(['result']);
    });
  });

  describe('Result Handling', () => {
    it('should collect all command results', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [
          { execute: async () => 1 },
          { execute: async () => 'two' },
          { execute: async () => ({ three: 3 }) },
        ],
      };

      const output = await command.execute(input, context);

      expect(output.results).toHaveLength(3);
      expect(output.results[0]).toBe(1);
      expect(output.results[1]).toBe('two');
      expect(output.results[2]).toEqual({ three: 3 });
    });

    it('should set context.it to last result', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [
          { execute: async () => 'first' },
          { execute: async () => 'second' },
          { execute: async () => 'last' },
        ],
      };

      await command.execute(input, context);

      expect(context.it).toBe('last');
    });

    it('should handle undefined/null results', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [
          { execute: async () => undefined },
          { execute: async () => null },
          { execute: async () => 'value' },
        ],
      };

      const output = await command.execute(input, context);

      expect(output.results).toEqual([undefined, null, 'value']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [{ execute: async () => {} }],
      };

      const output = await command.execute(input, context);

      expect(output.results).toEqual([undefined]);
    });

    it('should handle promises that resolve immediately', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: [{ execute: async () => Promise.resolve('immediate') }],
      };

      const output = await command.execute(input, context);

      expect(output.results).toEqual(['immediate']);
    });

    it('should return correct command count', async () => {
      const context = createMockContext();

      const input: AsyncCommandInput = {
        commands: Array(10)
          .fill(null)
          .map(() => ({ execute: async () => 'ok' })),
      };

      const output = await command.execute(input, context);

      expect(output.commandCount).toBe(10);
      expect(output.results).toHaveLength(10);
    });
  });
});
