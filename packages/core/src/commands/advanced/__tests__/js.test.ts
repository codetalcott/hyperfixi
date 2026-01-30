/**
 * Unit Tests for JsCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on inline JavaScript execution with hyperscript context access.
 *
 * Note: JsCommand uses `new Function()` internally. Tests use safe,
 * side-effect-free code like `return 1 + 2` or `return me.tagName`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JsCommand } from '../js';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext & TypedExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-element';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

/**
 * Helper to build a literal AST node for code strings
 */
function codeLiteral(value: string): ASTNode & { value: string } {
  return { type: 'literal', value } as ASTNode & { value: string };
}

/**
 * Helper to build an arrayLiteral AST node for parameter names
 */
function paramsArrayLiteral(
  names: string[]
): ASTNode & { elements: Array<ASTNode & { value: string }> } {
  return {
    type: 'arrayLiteral',
    elements: names.map(name => ({ type: 'literal', value: name }) as ASTNode & { value: string }),
  } as ASTNode & { elements: Array<ASTNode & { value: string }> };
}

// ========== Tests ==========

describe('JsCommand (Standalone V2)', () => {
  let command: JsCommand;

  beforeEach(() => {
    command = new JsCommand();
  });

  // ================================================================
  // 1. metadata
  // ================================================================

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('js');
    });

    it('should have a description mentioning JavaScript or inline', () => {
      expect(command.metadata).toBeDefined();
      const desc = command.metadata.description.toLowerCase();
      expect(desc).toContain('javascript');
    });

    it('should have syntax documentation', () => {
      const syntax = command.metadata.syntax;
      const syntaxArr = Array.isArray(syntax) ? syntax : [syntax];
      expect(syntaxArr.length).toBeGreaterThan(0);
      expect(syntaxArr.some(s => s.includes('js'))).toBe(true);
    });

    it('should have examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should declare code-execution and data-mutation side effects', () => {
      expect(command.metadata.sideEffects).toBeDefined();
      expect(command.metadata.sideEffects).toContain('code-execution');
      expect(command.metadata.sideEffects).toContain('data-mutation');
    });
  });

  // ================================================================
  // 2. parseInput
  // ================================================================

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('js command requires JavaScript code');
    });

    it('should parse code from a literal node', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [codeLiteral('return 1 + 2')], modifiers: {} },
        evaluator,
        context
      );

      expect(input.code).toBe('return 1 + 2');
      expect(input.parameters).toBeUndefined();
    });

    it('should parse parameters from an arrayLiteral node', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [codeLiteral('return x + y'), paramsArrayLiteral(['x', 'y'])],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.code).toBe('return x + y');
      expect(input.parameters).toEqual(['x', 'y']);
    });

    it('should handle code as a string value on a non-literal node', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Node with value but type !== 'literal' falls into the else-if branch
      const nonLiteralNode = { type: 'expression', value: 'return 42' } as unknown as ASTNode;

      const input = await command.parseInput(
        { args: [nonLiteralNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.code).toBe('return 42');
    });

    it('should throw when code node has no usable value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Node with no value property at all
      const emptyNode = { type: 'identifier' } as unknown as ASTNode;

      await expect(
        command.parseInput({ args: [emptyNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('js command requires JavaScript code');
    });
  });

  // ================================================================
  // 3. execute - basic execution
  // ================================================================

  describe('execute - basic execution', () => {
    it('should execute simple JS code', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: 'return 1 + 2' }, context);

      expect(output.result).toBe(3);
    });

    it('should return executed:true on successful execution', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: 'return "hello"' }, context);

      expect(output.executed).toBe(true);
    });

    it('should return the correct codeLength', async () => {
      const code = 'return 1 + 2';
      const context = createMockContext();
      const output = await command.execute({ code }, context);

      expect(output.codeLength).toBe(code.length);
    });

    it('should return preserveArrayResult:true', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: 'return [1,2,3]' }, context);

      expect(output.preserveArrayResult).toBe(true);
    });
  });

  // ================================================================
  // 4. execute - return values
  // ================================================================

  describe('execute - return values', () => {
    it('should capture the return value of executed code', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: 'return "test-result"' }, context);

      expect(output.result).toBe('test-result');
    });

    it('should set context.it for non-undefined results', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: 'return 42' }, context);

      expect(output.result).toBe(42);
      expect((context as unknown as Record<string, unknown>).it).toBe(42);
    });

    it('should NOT set context.it when result is undefined', async () => {
      const sentinel = 'previous-value';
      const context = createMockContext({ it: sentinel });

      // Code that does not return anything (implicit undefined)
      await command.execute({ code: 'var x = 1' }, context);

      // context.it should remain the sentinel value
      expect((context as unknown as Record<string, unknown>).it).toBe(sentinel);
    });
  });

  // ================================================================
  // 5. execute - context access
  // ================================================================

  describe('execute - context access', () => {
    it('should provide me to executed code', async () => {
      const meEl = document.createElement('span');
      meEl.id = 'me-element';
      const context = createMockContext({ me: meEl });

      const output = await command.execute({ code: 'return me.tagName' }, context);

      expect(output.result).toBe('SPAN');
    });

    it('should provide it to executed code', async () => {
      const context = createMockContext({ it: 'previous-result' });

      const output = await command.execute({ code: 'return it' }, context);

      expect(output.result).toBe('previous-result');
    });

    it('should provide locals to executed code', async () => {
      const locals = new Map<string, unknown>([['counter', 10]]);
      const context = createMockContext({ locals });

      const output = await command.execute({ code: 'return locals.get("counter")' }, context);

      expect(output.result).toBe(10);
    });

    it('should provide parameter values resolved from locals', async () => {
      const locals = new Map<string, unknown>([['myParam', 'from-locals']]);
      const context = createMockContext({ locals });

      const output = await command.execute(
        { code: 'return myParam', parameters: ['myParam'] },
        context
      );

      expect(output.result).toBe('from-locals');
    });

    it('should resolve parameters from variables when not in locals', async () => {
      const variables = new Map<string, unknown>([['myVar', 'from-variables']]);
      const context = createMockContext({ variables });

      const output = await command.execute(
        { code: 'return myVar', parameters: ['myVar'] },
        context
      );

      expect(output.result).toBe('from-variables');
    });
  });

  // ================================================================
  // 6. execute - error handling
  // ================================================================

  describe('execute - error handling', () => {
    it('should throw a descriptive error on invalid JS code', async () => {
      const context = createMockContext();

      await expect(command.execute({ code: 'return {{{' }, context)).rejects.toThrow(
        'JavaScript execution failed:'
      );
    });

    it('should skip empty code and return executed:false', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: '' }, context);

      expect(output.executed).toBe(false);
      expect(output.result).toBeUndefined();
    });

    it('should skip whitespace-only code and return executed:false', async () => {
      const context = createMockContext();
      const output = await command.execute({ code: '   \n\t  ' }, context);

      expect(output.executed).toBe(false);
      expect(output.result).toBeUndefined();
    });
  });

  // ================================================================
  // 7. execute - async
  // ================================================================

  describe('execute - async', () => {
    it('should handle code returning a Promise', async () => {
      const context = createMockContext();

      const output = await command.execute({ code: 'return Promise.resolve(99)' }, context);

      expect(output.result).toBe(99);
      expect(output.executed).toBe(true);
    });

    it('should await Promise results and set context.it', async () => {
      const context = createMockContext();

      const output = await command.execute(
        { code: 'return Promise.resolve("async-value")' },
        context
      );

      expect(output.result).toBe('async-value');
      expect((context as unknown as Record<string, unknown>).it).toBe('async-value');
    });
  });

  // ================================================================
  // 8. integration
  // ================================================================

  describe('integration', () => {
    it('end-to-end: parseInput then execute with simple code', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [codeLiteral('return 2 * 3')], modifiers: {} },
        evaluator,
        context
      );

      const output = await command.execute(input, context);

      expect(output.result).toBe(6);
      expect(output.executed).toBe(true);
      expect(output.codeLength).toBe('return 2 * 3'.length);
      expect(output.preserveArrayResult).toBe(true);
    });

    it('end-to-end: parseInput then execute with parameters', async () => {
      const locals = new Map<string, unknown>([
        ['x', 10],
        ['y', 20],
      ]);
      const context = createMockContext({ locals });
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [codeLiteral('return x + y'), paramsArrayLiteral(['x', 'y'])],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.parameters).toEqual(['x', 'y']);

      const output = await command.execute(input, context);

      expect(output.result).toBe(30);
      expect(output.executed).toBe(true);
      expect(output.parameters).toEqual(['x', 'y']);
      expect((context as unknown as Record<string, unknown>).it).toBe(30);
    });
  });
});
