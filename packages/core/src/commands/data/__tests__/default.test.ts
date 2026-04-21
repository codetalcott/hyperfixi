/**
 * Unit Tests for DefaultCommand (Standalone V2)
 *
 * Comprehensive coverage of default command behaviors:
 * - Sets values only if they don't already exist
 * - Handles 4 target types: variable, attribute, element property, element value
 * - Returns { target, value, wasSet, existingValue?, targetType } output
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultCommand } from '../default';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
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
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as any).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('DefaultCommand (Standalone V2)', () => {
  let command: DefaultCommand;
  let context: ExecutionContext & TypedExecutionContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    command = new DefaultCommand();
    context = createMockContext();
    evaluator = createMockEvaluator();
  });

  // ========== metadata ==========

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('default');
    });

    it('should have metadata with description containing "doesn\'t already exist"', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description).toContain("doesn't already exist");
    });

    it('should have syntax defined as an array', () => {
      expect(command.metadata.syntax).toBeDefined();
      expect(Array.isArray(command.metadata.syntax)).toBe(true);
      expect(command.metadata.syntax).toContain('default <expression> to <expression>');
    });

    it('should have usage examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
      expect(command.metadata.examples).toContain('default myVar to "fallback"');
      expect(command.metadata.examples).toContain('default @data-theme to "light"');
      expect(command.metadata.examples).toContain('default my innerHTML to "No content"');
    });

    it('should have correct side effects', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });
  });

  // ========== parseInput ==========

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('default command requires a target');
    });

    it('should throw error when no value provided', async () => {
      await expect(
        command.parseInput(
          { args: [{ type: 'literal', value: 'myVar' } as any], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('default command requires a value (use "to <value>")');
    });

    it('should parse target and value from "to" modifier', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'myVar' } as any],
          modifiers: { to: { type: 'literal', value: 'fallback' } as any },
        },
        evaluator,
        context
      );

      expect(input).toEqual({ target: 'myVar', value: 'fallback' });
    });

    it('should parse target and value from second arg', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'myVar' } as any, { type: 'literal', value: 42 } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input).toEqual({ target: 'myVar', value: 42 });
    });
  });

  // ========== execute - Variable Defaults ==========

  describe('execute - Variable Defaults', () => {
    it('should set variable when it is undefined', async () => {
      const result = await command.execute({ target: 'counter', value: 10 }, context);

      expect(result.wasSet).toBe(true);
      expect(result.value).toBe(10);
      expect(result.target).toBe('counter');
    });

    it('should skip when variable already has a value', async () => {
      context.locals.set('counter', 5);

      const result = await command.execute({ target: 'counter', value: 10 }, context);

      expect(result.wasSet).toBe(false);
      expect(result.existingValue).toBe(5);
    });

    it('should return wasSet:true with targetType variable when setting', async () => {
      const result = await command.execute({ target: 'newVar', value: 'hello' }, context);

      expect(result.wasSet).toBe(true);
      expect(result.targetType).toBe('variable');
    });

    it('should return wasSet:false with targetType variable when skipping', async () => {
      context.locals.set('existingVar', 'already set');

      const result = await command.execute({ target: 'existingVar', value: 'new value' }, context);

      expect(result.wasSet).toBe(false);
      expect(result.targetType).toBe('variable');
    });

    it('should set context.it to the value when variable is set', async () => {
      expect(context.it).toBeUndefined();

      await command.execute({ target: 'myVar', value: 'set-value' }, context);

      expect(context.it).toBe('set-value');
    });

    // Nullish-check semantics — matches upstream _hyperscript 0.9.90+
    // Falsy-but-defined values (0, false, '') are preserved; only null/undefined trigger set.
    describe('nullish-check semantics (upstream 0.9.90)', () => {
      it('should NOT overwrite a variable set to 0', async () => {
        context.locals.set('count', 0);
        const result = await command.execute({ target: 'count', value: 42 }, context);
        expect(result.wasSet).toBe(false);
        expect(result.existingValue).toBe(0);
      });

      it('should NOT overwrite a variable set to false', async () => {
        context.locals.set('flag', false);
        const result = await command.execute({ target: 'flag', value: true }, context);
        expect(result.wasSet).toBe(false);
        expect(result.existingValue).toBe(false);
      });

      it('should NOT overwrite a variable set to an empty string', async () => {
        context.locals.set('label', '');
        const result = await command.execute({ target: 'label', value: 'fallback' }, context);
        expect(result.wasSet).toBe(false);
        expect(result.existingValue).toBe('');
      });

      it('should overwrite a variable set to null', async () => {
        context.locals.set('maybe', null);
        const result = await command.execute({ target: 'maybe', value: 'value' }, context);
        expect(result.wasSet).toBe(true);
      });

      it('should overwrite when variable is undefined', async () => {
        const result = await command.execute({ target: 'brand-new', value: 'value' }, context);
        expect(result.wasSet).toBe(true);
      });
    });
  });

  // ========== execute - Attribute Defaults ==========

  describe('execute - Attribute Defaults', () => {
    it('should set attribute when it does not exist', async () => {
      const result = await command.execute({ target: '@data-theme', value: 'light' }, context);

      expect(result.wasSet).toBe(true);
      expect((context.me as HTMLElement).getAttribute('data-theme')).toBe('light');
    });

    it('should skip when attribute already exists', async () => {
      (context.me as HTMLElement).setAttribute('data-theme', 'dark');

      const result = await command.execute({ target: '@data-theme', value: 'light' }, context);

      expect(result.wasSet).toBe(false);
      expect(result.existingValue).toBe('dark');
    });

    it('should return targetType "attribute"', async () => {
      const result = await command.execute({ target: '@data-mode', value: 'edit' }, context);

      expect(result.targetType).toBe('attribute');
      expect(result.target).toBe('@data-mode');
    });

    it('should throw when no element context (me is null)', async () => {
      const noMeContext = createMockContext({ me: null as any });

      await expect(
        command.execute({ target: '@data-theme', value: 'light' }, noMeContext)
      ).rejects.toThrow('No element context available for attribute default');
    });
  });

  // ========== execute - Element Property Defaults ==========

  describe('execute - Element Property Defaults', () => {
    it('should set property via possessive "my innerHTML"', async () => {
      // Ensure innerHTML is empty so isEmpty returns true
      (context.me as HTMLElement).innerHTML = '';

      const result = await command.execute(
        { target: 'my innerHTML', value: 'No content' },
        context
      );

      expect(result.wasSet).toBe(true);
      expect((context.me as HTMLElement).innerHTML).toBe('No content');
    });

    it('should skip when property already has a value', async () => {
      (context.me as HTMLElement).innerHTML = '<p>Existing</p>';

      const result = await command.execute(
        { target: 'my innerHTML', value: 'No content' },
        context
      );

      expect(result.wasSet).toBe(false);
      expect(result.existingValue).toBe('<p>Existing</p>');
    });

    it('should return targetType "property"', async () => {
      (context.me as HTMLElement).innerHTML = '';

      const result = await command.execute({ target: 'my innerHTML', value: 'fallback' }, context);

      expect(result.targetType).toBe('property');
      expect(result.target).toBe('my innerHTML');
    });
  });

  // ========== execute - Element Value Defaults ==========

  describe('execute - Element Value Defaults', () => {
    it('should set value on HTMLElement (input)', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = '';

      const result = await command.execute({ target: input, value: 'default text' }, context);

      expect(result.wasSet).toBe(true);
      expect(input.value).toBe('default text');
    });

    it('should skip when element already has a value', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'existing text';

      const result = await command.execute({ target: input, value: 'default text' }, context);

      expect(result.wasSet).toBe(false);
      expect(result.existingValue).toBe('existing text');
    });

    it('should return targetType "element"', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = '';

      const result = await command.execute({ target: input, value: 'fallback' }, context);

      expect(result.targetType).toBe('element');
      expect(result.target).toBe('element');
    });
  });

  // ========== integration ==========

  describe('integration', () => {
    it('should work end-to-end: parse and execute variable default', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'count' } as any],
          modifiers: { to: { type: 'literal', value: 0 } as any },
        },
        evaluator,
        context
      );

      expect(input).toEqual({ target: 'count', value: 0 });

      const result = await command.execute(input, context);

      expect(result.wasSet).toBe(true);
      expect(result.targetType).toBe('variable');
      expect(result.value).toBe(0);
      expect(context.it).toBe(0);
    });

    it('should work end-to-end: parse and execute attribute default', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@data-theme' } as any],
          modifiers: { to: { type: 'literal', value: 'light' } as any },
        },
        evaluator,
        context
      );

      expect(input).toEqual({ target: '@data-theme', value: 'light' });

      const result = await command.execute(input, context);

      expect(result.wasSet).toBe(true);
      expect(result.targetType).toBe('attribute');
      expect(result.target).toBe('@data-theme');
      expect((context.me as HTMLElement).getAttribute('data-theme')).toBe('light');
      expect(context.it).toBe('light');
    });
  });
});
