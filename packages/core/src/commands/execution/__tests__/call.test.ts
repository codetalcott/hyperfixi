/**
 * Unit Tests for CallCommand (Decorated Implementation)
 *
 * Comprehensive coverage of call command behaviors:
 * - Evaluates an expression and stores the result in context.it / context.result
 * - Handles function results (calls them), Promise results (awaits them), plain values
 * - Uses __evaluator from context.locals during execute phase
 * - parseInput stores raw AST node (deferred evaluation)
 * - GetCommand extends CallCommand with name 'get'
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallCommand, GetCommand } from '../call';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Record<string, unknown> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-element';

  const mockEvaluator = {
    evaluate: vi.fn(async (node: any, _ctx: any) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return node.value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return node.name;
      }
      return node;
    }),
  };

  const locals = new Map<string, any>();
  locals.set('__evaluator', mockEvaluator);

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals,
    globals: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      return node;
    },
  } as ExpressionEvaluator;
}

// ========== Tests ==========

describe('CallCommand', () => {
  let command: CallCommand;
  let context: ExecutionContext & TypedExecutionContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    command = new CallCommand();
    context = createMockContext();
    evaluator = createMockEvaluator();
  });

  // ==========================================================================
  // 1. Metadata
  // ==========================================================================

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('call');
    });

    it('should have metadata description containing evaluate or expression', () => {
      expect(command.metadata).toBeDefined();
      const desc = command.metadata.description.toLowerCase();
      expect(desc).toContain('evaluate');
      expect(desc).toContain('expression');
    });

    it('should have syntax defined', () => {
      expect(command.metadata.syntax).toBeDefined();
      const syntax = Array.isArray(command.metadata.syntax)
        ? command.metadata.syntax
        : [command.metadata.syntax];
      const joined = syntax.join(' ');
      expect(joined).toContain('call');
    });

    it('should have correct side effects', () => {
      expect(command.metadata.sideEffects).toContain('function-execution');
      expect(command.metadata.sideEffects).toContain('context-mutation');
    });
  });

  // ==========================================================================
  // 2. parseInput
  // ==========================================================================

  describe('parseInput', () => {
    it('should throw error when no arguments provided', () => {
      // parseInput throws synchronously before returning a Promise
      expect(() => command.parseInput({ args: [], modifiers: {} }, evaluator, context)).toThrow(
        'call command requires an expression'
      );
    });

    it('should store raw AST node without evaluating it', async () => {
      const astNode = { type: 'identifier', name: 'myFunction' } as any;

      const input = await command.parseInput(
        { args: [astNode], modifiers: {} },
        evaluator,
        context
      );

      // The raw AST node is stored directly, not evaluated
      expect(input.expression).toBe(astNode);
      expect(input.expression).toEqual({ type: 'identifier', name: 'myFunction' });
    });

    it('should default alias to call', async () => {
      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 42 } as any], modifiers: {} },
        evaluator,
        context
      );

      expect(input.alias).toBe('call');
    });
  });

  // ==========================================================================
  // 3. execute - value expressions
  // ==========================================================================

  describe('execute - value expressions', () => {
    it('should evaluate expression via __evaluator and return value', async () => {
      const input = { expression: { type: 'literal', value: 'hello' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(output.result).toBe('hello');
      expect(output.expressionType).toBe('value');
    });

    it('should set context.it to the evaluated value', async () => {
      const input = { expression: { type: 'literal', value: 42 }, alias: 'call' as const };

      await command.execute(input, context);

      expect(context.it).toBe(42);
    });

    it('should set context.result to the evaluated value', async () => {
      const input = { expression: { type: 'literal', value: 'data' }, alias: 'call' as const };

      await command.execute(input, context);

      expect(context.result).toBe('data');
    });
  });

  // ==========================================================================
  // 4. execute - function expressions
  // ==========================================================================

  describe('execute - function expressions', () => {
    it('should call function result and capture return value', async () => {
      const fn = vi.fn(() => 'function-result');

      // Override __evaluator to return a function
      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => fn);

      const input = { expression: { type: 'functionRef' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(fn).toHaveBeenCalledOnce();
      expect(output.result).toBe('function-result');
      expect(output.expressionType).toBe('function');
    });

    it('should set context.it to function return value', async () => {
      const fn = () => 'fn-value';

      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => fn);

      const input = { expression: { type: 'functionRef' }, alias: 'call' as const };

      await command.execute(input, context);

      expect(context.it).toBe('fn-value');
      expect(context.result).toBe('fn-value');
    });

    it('should return expressionType function for function results', async () => {
      const fn = () => 123;

      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => fn);

      const input = { expression: { type: 'functionRef' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(output.expressionType).toBe('function');
      expect(output.wasAsync).toBe(false);
    });
  });

  // ==========================================================================
  // 5. execute - async
  // ==========================================================================

  describe('execute - async', () => {
    it('should handle evaluator returning async result', async () => {
      // Since execute() awaits evaluator.evaluate(), a Promise result from the
      // evaluator gets fully resolved. The resolved value is treated as a plain value.
      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => 'async-value');

      const input = { expression: { type: 'promiseExpr' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(output.result).toBe('async-value');
      expect(context.it).toBe('async-value');
      expect(context.result).toBe('async-value');
    });

    it('should handle function returning Promise', async () => {
      const asyncFn = vi.fn(() => Promise.resolve('async-fn-result'));

      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => asyncFn);

      const input = { expression: { type: 'functionRef' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(asyncFn).toHaveBeenCalledOnce();
      expect(output.result).toBe('async-fn-result');
      expect(output.expressionType).toBe('function');
      expect(output.wasAsync).toBe(true);
    });

    it('should set wasAsync true when function returns Promise', async () => {
      const asyncFn = vi.fn(() => Promise.resolve(99));

      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async () => asyncFn);

      const input = { expression: { type: 'functionRef' }, alias: 'call' as const };

      const output = await command.execute(input, context);

      expect(output.wasAsync).toBe(true);
      expect(output.result).toBe(99);
      expect(context.it).toBe(99);
      expect(output.expressionType).toBe('function');
    });
  });

  // ==========================================================================
  // 6. execute - error handling
  // ==========================================================================

  describe('execute - error handling', () => {
    it('should throw when __evaluator is not in context.locals', async () => {
      // Create context without __evaluator
      const contextWithoutEvaluator = createMockContext();
      (contextWithoutEvaluator as any).locals = new Map();

      const input = { expression: { type: 'literal', value: 42 }, alias: 'call' as const };

      await expect(command.execute(input, contextWithoutEvaluator)).rejects.toThrow(
        '[CALL.execute] No evaluator available in context'
      );
    });
  });

  // ==========================================================================
  // 7. Integration
  // ==========================================================================

  describe('integration', () => {
    it('should work end-to-end: parseInput then execute with value', async () => {
      const astNode = { type: 'literal', value: 'resolved-value' } as any;

      // Parse phase: stores raw AST node
      const input = await command.parseInput(
        { args: [astNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.expression).toBe(astNode);
      expect(input.alias).toBe('call');

      // Execute phase: evaluator resolves the node
      const output = await command.execute(input, context);

      expect(output.result).toBe('resolved-value');
      expect(output.expressionType).toBe('value');
      expect(output.wasAsync).toBe(false);
      expect(context.it).toBe('resolved-value');
      expect(context.result).toBe('resolved-value');
    });

    it('should work end-to-end: parseInput then execute with function', async () => {
      const fn = vi.fn(() => 'computed');
      const astNode = { type: 'functionCall', value: fn } as any;

      // Override __evaluator to return the function from the AST node
      const mockEvaluator = context.locals.get('__evaluator') as any;
      mockEvaluator.evaluate = vi.fn(async (node: any) => {
        if (typeof node === 'object' && node !== null && 'value' in node) {
          return node.value;
        }
        return node;
      });

      // Parse phase
      const input = await command.parseInput(
        { args: [astNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.expression).toBe(astNode);

      // Execute phase: evaluator returns the function, which gets called
      const output = await command.execute(input, context);

      expect(fn).toHaveBeenCalledOnce();
      expect(output.result).toBe('computed');
      expect(output.expressionType).toBe('function');
      expect(context.it).toBe('computed');
      expect(context.result).toBe('computed');
    });
  });
});

// ==========================================================================
// GetCommand (extends CallCommand)
// ==========================================================================

describe('GetCommand', () => {
  let getCommand: GetCommand;

  beforeEach(() => {
    getCommand = new GetCommand();
  });

  it('should have name get', () => {
    expect(getCommand.name).toBe('get');
  });

  it('should have metadata with description', () => {
    expect(getCommand.metadata).toBeDefined();
    expect(getCommand.metadata.description.toLowerCase()).toContain('evaluate');
  });

  it('should inherit parseInput from CallCommand', () => {
    expect(getCommand.parseInput).toBeDefined();
    expect(typeof getCommand.parseInput).toBe('function');
  });

  it('should inherit execute from CallCommand', () => {
    expect(getCommand.execute).toBeDefined();
    expect(typeof getCommand.execute).toBe('function');
  });
});
