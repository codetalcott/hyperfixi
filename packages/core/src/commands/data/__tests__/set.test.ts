/**
 * Unit Tests for SetCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on core set patterns: variables, attributes, properties.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SetCommand } from '../set';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types.ts';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
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
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as ExpressionEvaluator;
}

// ========== Tests ==========

describe('SetCommand (Standalone V2)', () => {
  let command: SetCommand;

  beforeEach(() => {
    command = new SetCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('set');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('set');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have data category and side effects', () => {
      expect(command.metadata.category).toBe('data');
      expect(command.metadata.sideEffects).toContain('state-mutation');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });
  });

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('set command requires a target');
    });

    it('should throw error when no value provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          { args: [{ type: 'literal', value: 'myVar' }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('set command requires a value');
    });

    it('should parse variable assignment with "to" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'myVar' }],
          modifiers: { to: { type: 'expression', value: 'test value' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('variable');
      if (input.type === 'variable') {
        expect(input.name).toBe('myVar');
        expect(input.value).toBe('test value');
      }
    });

    it('should parse attribute assignment', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@data-theme' }],
          modifiers: { to: { type: 'expression', value: 'dark' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-theme');
        expect(input.value).toBe('dark');
      }
    });

    it('should parse property assignment with possessive "my"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'my textContent' }],
          modifiers: { to: { type: 'expression', value: 'Hello World' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.element).toBe(context.me);
        expect(input.property).toBe('textContent');
        expect(input.value).toBe('Hello World');
      }
    });

    it('should parse property assignment with possessive "its"', async () => {
      const context = createMockContext();
      const itElement = document.createElement('span');
      context.it = itElement;
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'its innerHTML' }],
          modifiers: { to: { type: 'expression', value: '<strong>Bold</strong>' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.element).toBe(itElement);
        expect(input.property).toBe('innerHTML');
        expect(input.value).toBe('<strong>Bold</strong>');
      }
    });

    it('should parse value from second argument if no "to" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'count' },
            { type: 'literal', value: 42 },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('variable');
      if (input.type === 'variable') {
        expect(input.name).toBe('count');
        expect(input.value).toBe(42);
      }
    });

    it('should parse number value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'count' }],
          modifiers: { to: { type: 'expression', value: 42 } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('variable');
      if (input.type === 'variable') {
        expect(input.value).toBe(42);
      }
    });

    it('should parse boolean value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'isActive' }],
          modifiers: { to: { type: 'expression', value: true } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('variable');
      if (input.type === 'variable') {
        expect(input.value).toBe(true);
      }
    });
  });

  describe('execute - variables', () => {
    it('should set variable in locals', async () => {
      const context = createMockContext();

      const output = await command.execute(
        { type: 'variable', name: 'myVar', value: 'test value' },
        context
      );

      expect(context.locals.get('myVar')).toBe('test value');
      expect(output.target).toBe('myVar');
      expect(output.value).toBe('test value');
      expect(output.targetType).toBe('variable');
    });

    it('should set number variable', async () => {
      const context = createMockContext();

      await command.execute({ type: 'variable', name: 'count', value: 42 }, context);

      expect(context.locals.get('count')).toBe(42);
    });

    it('should set boolean variable', async () => {
      const context = createMockContext();

      await command.execute({ type: 'variable', name: 'isActive', value: true }, context);

      expect(context.locals.get('isActive')).toBe(true);
    });

    it('should update context.it when setting variable', async () => {
      const context = createMockContext();

      await command.execute({ type: 'variable', name: 'myVar', value: 'test' }, context);

      expect(context.it).toBe('test');
    });

    it('should set special variable "result"', async () => {
      const context = createMockContext();

      await command.execute({ type: 'variable', name: 'result', value: 'computed' }, context);

      expect(context.locals.get('result')).toBe('computed');
      expect(context.result).toBe('computed');
    });

    it('should set special variable "it"', async () => {
      const context = createMockContext();

      await command.execute({ type: 'variable', name: 'it', value: 'value' }, context);

      expect(context.locals.get('it')).toBe('value');
      expect(context.it).toBe('value');
    });
  });

  describe('execute - attributes', () => {
    it('should set attribute on me element', async () => {
      const context = createMockContext();

      const output = await command.execute(
        {
          type: 'attribute',
          element: context.me as HTMLElement,
          name: 'data-theme',
          value: 'dark',
        },
        context
      );

      expect(context.me!.getAttribute('data-theme')).toBe('dark');
      expect(output.target).toBe('@data-theme');
      expect(output.value).toBe('dark');
      expect(output.targetType).toBe('attribute');
    });

    it('should set aria attribute', async () => {
      const context = createMockContext();

      await command.execute(
        {
          type: 'attribute',
          element: context.me as HTMLElement,
          name: 'aria-label',
          value: 'Close button',
        },
        context
      );

      expect(context.me!.getAttribute('aria-label')).toBe('Close button');
    });

    it('should convert value to string for attributes', async () => {
      const context = createMockContext();

      await command.execute(
        { type: 'attribute', element: context.me as HTMLElement, name: 'data-count', value: 42 },
        context
      );

      expect(context.me!.getAttribute('data-count')).toBe('42');
    });

    it('should update context.it when setting attribute', async () => {
      const context = createMockContext();

      await command.execute(
        {
          type: 'attribute',
          element: context.me as HTMLElement,
          name: 'data-value',
          value: 'test',
        },
        context
      );

      expect(context.it).toBe('test');
    });
  });

  describe('execute - properties', () => {
    it('should set textContent property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const output = await command.execute(
        { type: 'property', element, property: 'textContent', value: 'Hello World' },
        context
      );

      expect(element!.textContent).toBe('Hello World');
      expect(output.target).toBe(element);
      expect(output.value).toBe('Hello World');
      expect(output.targetType).toBe('property');
    });

    it('should set innerHTML property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'innerHTML', value: '<strong>Bold</strong>' },
        context
      );

      expect(element!.innerHTML).toBe('<strong>Bold</strong>');
    });

    it('should set innerText property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'innerText', value: 'Plain text' },
        context
      );

      expect((element as HTMLElement).innerText).toBe('Plain text');
    });

    it('should set id property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'id', value: 'new-id' },
        context
      );

      expect(element!.id).toBe('new-id');
    });

    it('should set className property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'className', value: 'active selected' },
        context
      );

      expect(element!.className).toBe('active selected');
    });

    it('should set value property on input element', async () => {
      const context = createMockContext();
      const input = document.createElement('input');

      await command.execute(
        { type: 'property', element: input, property: 'value', value: 'user input' },
        context
      );

      expect(input.value).toBe('user input');
    });

    it('should set style property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'color', value: 'red' },
        context
      );

      expect((element as HTMLElement).style.color).toBe('red');
    });

    it('should set style property with hyphen', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'background-color', value: 'blue' },
        context
      );

      expect((element as HTMLElement).style.backgroundColor).toBe('blue');
    });

    it('should set generic property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'title', value: 'Element title' },
        context
      );

      expect((element as HTMLElement).title).toBe('Element title');
    });

    it('should update context.it when setting property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        { type: 'property', element, property: 'textContent', value: 'test' },
        context
      );

      expect(context.it).toBe('test');
    });
  });

  describe('validate', () => {
    it('should validate correct variable input', () => {
      const input = { type: 'variable', name: 'myVar', value: 'test' };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct attribute input', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute', element, name: 'data-theme', value: 'dark' };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct property input', () => {
      const element = document.createElement('div');
      const input = { type: 'property', element, property: 'textContent', value: 'text' };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate input with undefined value', () => {
      const input = { type: 'variable', name: 'myVar', value: undefined };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate input with null value', () => {
      const input = { type: 'variable', name: 'myVar', value: null };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject null input', () => {
      expect(command.validate(null)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(command.validate('not an object')).toBe(false);
      expect(command.validate(123)).toBe(false);
      expect(command.validate(true)).toBe(false);
    });

    it('should reject input without type', () => {
      expect(command.validate({ name: 'myVar', value: 'test' })).toBe(false);
    });

    it('should reject input with invalid type', () => {
      expect(command.validate({ type: 'unknown', name: 'test', value: 'test' })).toBe(false);
      expect(command.validate({ type: 123, name: 'test', value: 'test' })).toBe(false);
    });

    it('should reject variable input without name', () => {
      expect(command.validate({ type: 'variable', value: 'test' })).toBe(false);
    });

    it('should reject property input without element', () => {
      expect(command.validate({ type: 'property', property: 'test', value: 'test' })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should set variable end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'count' }],
          modifiers: { to: { type: 'expression', value: 10 } },
        },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify
      expect(context.locals.get('count')).toBe(10);
      expect(output.targetType).toBe('variable');
      expect(context.it).toBe(10);
    });

    it('should set attribute end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@data-theme' }],
          modifiers: { to: { type: 'expression', value: 'dark' } },
        },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify
      expect(context.me!.getAttribute('data-theme')).toBe('dark');
      expect(output.targetType).toBe('attribute');
      expect(context.it).toBe('dark');
    });

    it('should set property end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'my textContent' }],
          modifiers: { to: { type: 'expression', value: 'Hello' } },
        },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify
      expect(context.me!.textContent).toBe('Hello');
      expect(output.targetType).toBe('property');
      expect(context.it).toBe('Hello');
    });

    it('should handle complex workflow', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Step 1: Set variable
      const input1 = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'greeting' }],
          modifiers: { to: { type: 'expression', value: 'Hello' } },
        },
        evaluator,
        context
      );
      await command.execute(input1, context);
      expect(context.locals.get('greeting')).toBe('Hello');

      // Step 2: Set property
      const input2 = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'my textContent' }],
          modifiers: { to: { type: 'expression', value: 'World' } },
        },
        evaluator,
        context
      );
      await command.execute(input2, context);
      expect(context.me!.textContent).toBe('World');

      // Step 3: Set attribute
      const input3 = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@data-status' }],
          modifiers: { to: { type: 'expression', value: 'complete' } },
        },
        evaluator,
        context
      );
      await command.execute(input3, context);
      expect(context.me!.getAttribute('data-status')).toBe('complete');

      // Verify all are still set
      expect(context.locals.get('greeting')).toBe('Hello');
      expect(context.me!.textContent).toBe('World');
      expect(context.me!.getAttribute('data-status')).toBe('complete');
    });
  });
});
