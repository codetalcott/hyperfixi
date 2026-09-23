/**
 * Unit Tests for IncrementCommand (Standalone V2)
 *
 * Adapted from V1 tests - comprehensive coverage of all increment behaviors
 * Fixed to use correct args format (not modifiers)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NumericModifyCommand as IncrementCommand } from '../increment';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('input');
  meElement.id = 'test-element';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator() {
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

describe('IncrementCommand (Standalone V2)', () => {
  let command: IncrementCommand;
  let context: ExecutionContext & TypedExecutionContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    command = new IncrementCommand();
    context = createMockContext();
    evaluator = createMockEvaluator();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('increment');
    });

    it('should have metadata with description', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('modify');
    });

    it('should have syntax examples', () => {
      expect(command.metadata.syntax).toBeInstanceOf(Array);
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
    });

    it('should have usage examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.some(ex => ex.includes('increment'))).toBe(true);
    });

    it('should have correct side effects', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
      expect(command.metadata.sideEffects).toContain('context-modification');
    });
  });

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('requires a target');
    });

    it('should parse variable name from identifier', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('counter');
      expect(input.amount).toBe(1); // default
    });

    it('should parse amount from args', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('counter');
      expect(input.amount).toBe(5);
    });

    it('should detect operation as increment', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
          commandName: 'increment',
        },
        evaluator,
        context
      );

      expect(input.operation).toBe('increment');
    });
  });

  describe('execute - Basic Variable Increment', () => {
    it('should increment local variable by 1 (default)', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('counter')).toBe(6);
    });

    it('should increment local variable by specified amount', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 2 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('counter')).toBe(7);
    });

    it('should increment global variable by 1 (default)', async () => {
      context.globals.set('globalCounter', 10);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'globalCounter', scope: 'global' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.globals.get('globalCounter')).toBe(11);
    });

    it('should increment global variable by specified amount', async () => {
      context.globals.set('globalCounter', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'globalCounter', scope: 'global' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.globals.get('globalCounter')).toBe(15);
    });
  });

  describe('execute - Null/Undefined Variable Handling', () => {
    it('should initialize null variable to 0 then increment by 1', async () => {
      context.locals.set('nullVar', null);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'nullVar' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('nullVar')).toBe(1);
    });

    it('should initialize undefined variable to 0 then increment by 1', async () => {
      context.locals.set('undefinedVar', undefined);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'undefinedVar' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('undefinedVar')).toBe(1);
    });

    it('should initialize new variable to 0 then increment by 1', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'newVariable' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('newVariable')).toBe(1);
    });

    it('should initialize null variable to 0 then increment by specified amount', async () => {
      context.locals.set('nullVar', null);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'nullVar' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('nullVar')).toBe(5);
    });

    it('should initialize new variable to 0 then increment by specified amount', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'newVariable' } as any,
            { type: 'literal', value: 10 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('newVariable')).toBe(10);
    });
  });

  describe('execute - Decimal and Negative Values', () => {
    it('should handle decimal increment amounts', async () => {
      context.locals.set('value', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: 2.5 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(12.5);
    });

    it('should handle negative increment (decrement)', async () => {
      context.locals.set('value', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: -3 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(7);
    });

    it('should handle incrementing from negative value', async () => {
      context.locals.set('value', -5);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: 3 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(-2);
    });
  });

  describe('execute - Context Updates', () => {
    it('should set context.it to the new value', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.it).toBe(6);
    });

    it('should return the new value', async () => {
      context.locals.set('counter', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(15);
    });
  });

  describe('integration', () => {
    it('should work end-to-end for local variable', async () => {
      context.locals.set('myCounter', 100);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'myCounter' } as any,
            { type: 'literal', value: 25 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(125);
      expect(context.locals.get('myCounter')).toBe(125);
      expect(context.it).toBe(125);
    });

    it('should work end-to-end for global variable', async () => {
      context.globals.set('score', 500);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'score', scope: 'global' } as any,
            { type: 'literal', value: 100 } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(600);
      expect(context.globals.get('score')).toBe(600);
    });
  });

  describe('execute - property of an element (the multilingual front-end shape)', () => {
    // Core's parser desugars `increment X` to `set X to X + 1`, so it never
    // hands this command a property access. The semantic (multilingual)
    // front-end does: `increment the textContent of the previous <output/>` in
    // any of 23 languages arrives as a possessive/propertyOf/member node. The
    // command evaluated it to its VALUE and then wrote the result to no
    // property, so the counter ran and never changed.
    let out: HTMLElement;
    const owner: ASTNode = { type: 'selector', value: '#out' };
    const textContent: ASTNode = { type: 'identifier', name: 'textContent' };
    const elementEvaluator = {
      evaluate: async (node: ASTNode) => (node === owner ? out : undefined),
    } as unknown as ExpressionEvaluator;

    beforeEach(() => {
      out = document.createElement('output');
      out.textContent = '5';
    });

    const shapes: Array<[string, ASTNode]> = [
      [
        'possessiveExpression',
        { type: 'possessiveExpression', object: owner, property: textContent },
      ],
      [
        'propertyOfExpression',
        { type: 'propertyOfExpression', target: owner, property: textContent },
      ],
      [
        'memberExpression',
        { type: 'memberExpression', object: owner, property: textContent, computed: false },
      ],
    ];

    for (const [name, target] of shapes) {
      it(`writes back through a ${name} target`, async () => {
        const input = await command.parseInput(
          { args: [target], modifiers: {}, commandName: 'increment' },
          elementEvaluator,
          context
        );
        expect(input.target).toBe(out);
        expect(input.property).toBe('textContent');
        await command.execute(input, context);
        expect(out.textContent).toBe('6');
      });
    }

    it('applies a `by` amount and decrements', async () => {
      const input = await command.parseInput(
        {
          args: [shapes[0][1]],
          modifiers: { by: { type: 'literal', value: 2 } },
          commandName: 'decrement',
        },
        elementEvaluator,
        context
      );
      await command.execute(input, context);
      expect(out.textContent).toBe('3');
    });

    it('a computed member is not a property name, and keeps the old path', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'memberExpression', object: owner, property: textContent, computed: true },
          ],
          modifiers: {},
        },
        elementEvaluator,
        context
      );
      expect(input.property).toBeUndefined();
    });
  });
});
