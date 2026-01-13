/**
 * Additional Tests for SetCommand (New Features)
 *
 * Tests the restored V1 features:
 * - Object literals: set { x: 1, y: 2 } on element
 * - "the X of Y" syntax: set the property of element to value
 * - CSS property shorthand: set *property to value
 *
 * These tests validate the discriminated union pattern implementation
 * that enables SetCommand to handle multiple input types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SetCommand } from '../set';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types.ts';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-element';
  meElement.textContent = 'Initial';

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
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Object Literal Tests ==========

describe('SetCommand - Object Literal Support', () => {
  let command: SetCommand;

  beforeEach(() => {
    command = new SetCommand();
  });

  describe('parseInput - Object Literal Syntax', () => {
    it('should parse object literal: set { x: 1 } on me', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async (node: any) => {
          if (node.value) return node.value;
          return node;
        },
      } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: { textContent: 'Hello', title: 'World' } }],
          modifiers: { on: { type: 'expression', value: context.me } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('object-literal');
      if (input.type === 'object-literal') {
        expect(input.properties).toEqual({ textContent: 'Hello', title: 'World' });
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should parse object literal with multiple properties', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: { id: 'new-id', className: 'active', textContent: 'Text' } },
          ],
          modifiers: { on: { type: 'expression', value: context.me } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('object-literal');
      if (input.type === 'object-literal') {
        expect(input.properties).toHaveProperty('id', 'new-id');
        expect(input.properties).toHaveProperty('className', 'active');
        expect(input.properties).toHaveProperty('textContent', 'Text');
      }
    });

    it('should default to context.me if no "on" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: { textContent: 'Default' } }],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('object-literal');
      if (input.type === 'object-literal') {
        expect(input.targets).toEqual([context.me]);
      }
    });
  });

  describe('execute - Object Literal', () => {
    it('should set multiple properties on single element', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        {
          type: 'object-literal',
          properties: { textContent: 'Updated', title: 'Tooltip', id: 'updated-id' },
          targets: [element],
        },
        context
      );

      expect(element!.textContent).toBe('Updated');
      expect((element as HTMLElement).title).toBe('Tooltip');
      expect(element!.id).toBe('updated-id');
    });

    it('should set properties on multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');

      await command.execute(
        {
          type: 'object-literal',
          properties: { textContent: 'Same', className: 'shared' },
          targets: [el1, el2],
        },
        context
      );

      expect(el1.textContent).toBe('Same');
      expect(el1.className).toBe('shared');
      expect(el2.textContent).toBe('Same');
      expect(el2.className).toBe('shared');
    });

    it('should update context.it with properties object', async () => {
      const context = createMockContext();
      const props = { textContent: 'Test' };

      await command.execute(
        {
          type: 'object-literal',
          properties: props,
          targets: [context.me as HTMLElement],
        },
        context
      );

      expect(context.it).toBe(props);
    });
  });

  describe('validate - Object Literal', () => {
    it('should validate correct object-literal input', () => {
      const element = document.createElement('div');
      const input = {
        type: 'object-literal' as const,
        properties: { textContent: 'test' },
        targets: [element],
      };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject object-literal without properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'object-literal' as const,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject object-literal with null properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'object-literal' as const,
        properties: null,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject object-literal with empty targets array', () => {
      const input = {
        type: 'object-literal' as const,
        properties: { x: 1 },
        targets: [],
      };
      expect(command.validate(input)).toBe(false);
    });
  });
});

// ========== "the X of Y" Syntax Tests ==========

describe('SetCommand - "the X of Y" Syntax', () => {
  let command: SetCommand;

  beforeEach(() => {
    command = new SetCommand();
  });

  describe('parseInput - "the X of Y" Syntax', () => {
    it('should parse "the textContent of me"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'the textContent of me' }],
          modifiers: { to: { type: 'expression', value: 'New Text' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.element).toBe(context.me);
        expect(input.property).toBe('textContent');
        expect(input.value).toBe('New Text');
      }
    });

    it('should parse "the innerHTML of it"', async () => {
      const context = createMockContext();
      const itElement = document.createElement('div');
      context.it = itElement;
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'the innerHTML of it' }],
          modifiers: { to: { type: 'expression', value: '<strong>Bold</strong>' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.element).toBe(itElement);
        expect(input.property).toBe('innerHTML');
      }
    });

    it('should parse "the title of #test-element"', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('div');
      targetElement.id = 'target-el';
      document.body.appendChild(targetElement);
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'the title of #target-el' }],
          modifiers: { to: { type: 'expression', value: 'Title Text' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.element).toBe(targetElement);
        expect(input.property).toBe('title');
        expect(input.value).toBe('Title Text');
      }

      // Cleanup
      document.body.removeChild(targetElement);
    });

    it('should handle case-insensitive "THE" keyword', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'THE textContent OF me' }],
          modifiers: { to: { type: 'expression', value: 'Case' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('property');
      if (input.type === 'property') {
        expect(input.property).toBe('textContent');
      }
    });

    it('should treat incomplete "the X" pattern as variable name', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // "the property" (without "of Y") is treated as a variable name, not an error
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'the property' }], // Missing "of Y"
          modifiers: { to: { type: 'expression', value: 'value' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('variable');
      if (input.type === 'variable') {
        expect(input.name).toBe('the property');
        expect(input.value).toBe('value');
      }
    });
  });

  describe('execute - "the X of Y" (via property type)', () => {
    it('should set property via "the X of Y" pattern', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        {
          type: 'property',
          element,
          property: 'textContent',
          value: 'Set via pattern',
        },
        context
      );

      expect(element!.textContent).toBe('Set via pattern');
    });
  });
});

// ========== CSS Property Shorthand Tests ==========

describe('SetCommand - CSS Property Shorthand', () => {
  let command: SetCommand;

  beforeEach(() => {
    command = new SetCommand();
  });

  describe('parseInput - CSS Shorthand (*property)', () => {
    it('should parse *opacity', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*opacity' }],
          modifiers: { to: { type: 'expression', value: '0.5' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('style');
      if (input.type === 'style') {
        expect(input.element).toBe(context.me);
        expect(input.property).toBe('opacity');
        expect(input.value).toBe('0.5');
      }
    });

    it('should parse *background-color', async () => {
      const context = createMockEvaluator();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*background-color' }],
          modifiers: { to: { type: 'expression', value: 'blue' } },
        },
        evaluator,
        createMockContext()
      );

      expect(input.type).toBe('style');
      if (input.type === 'style') {
        expect(input.property).toBe('background-color');
        expect(input.value).toBe('blue');
      }
    });

    it('should parse *color with "on" modifier', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('div');
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*color' }],
          modifiers: {
            to: { type: 'expression', value: 'red' },
            on: { type: 'expression', value: targetElement },
          },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('style');
      if (input.type === 'style') {
        expect(input.element).toBe(targetElement);
        expect(input.property).toBe('color');
      }
    });

    it('should convert value to string for styles', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*width' }],
          modifiers: { to: { type: 'expression', value: 100 } }, // Number value
        },
        evaluator,
        context
      );

      expect(input.type).toBe('style');
      if (input.type === 'style') {
        expect(input.value).toBe('100'); // Converted to string
      }
    });
  });

  describe('execute - CSS Property', () => {
    it('should set inline style property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        {
          type: 'style',
          element,
          property: 'opacity',
          value: '0.7',
        },
        context
      );

      expect((element as HTMLElement).style.opacity).toBe('0.7');
    });

    it('should set kebab-case style property', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        {
          type: 'style',
          element,
          property: 'background-color',
          value: 'green',
        },
        context
      );

      expect((element as HTMLElement).style.backgroundColor).toBe('green');
    });

    it('should set multiple style properties', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute(
        {
          type: 'style',
          element,
          property: 'color',
          value: 'red',
        },
        context
      );

      await command.execute(
        {
          type: 'style',
          element,
          property: 'font-size',
          value: '16px',
        },
        context
      );

      expect((element as HTMLElement).style.color).toBe('red');
      expect((element as HTMLElement).style.fontSize).toBe('16px');
    });

    it('should update context.it when setting style', async () => {
      const context = createMockContext();

      await command.execute(
        {
          type: 'style',
          element: context.me as HTMLElement,
          property: 'opacity',
          value: '0.5',
        },
        context
      );

      expect(context.it).toBe('0.5');
    });
  });

  describe('validate - Style Input', () => {
    it('should validate correct style input', () => {
      const element = document.createElement('div');
      const input = {
        type: 'style' as const,
        element,
        property: 'opacity',
        value: '0.5',
      };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject style input with non-HTMLElement', () => {
      const input = {
        type: 'style' as const,
        element: 'not-element',
        property: 'opacity',
        value: '0.5',
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject style input with empty property', () => {
      const element = document.createElement('div');
      const input = {
        type: 'style' as const,
        element,
        property: '',
        value: '0.5',
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject style input with non-string value', () => {
      const element = document.createElement('div');
      const input = {
        type: 'style' as const,
        element,
        property: 'opacity',
        value: 0.5, // Should be string
      };
      expect(command.validate(input)).toBe(false);
    });
  });
});

// ========== Integration Tests ==========

describe('SetCommand - Integration (New Features)', () => {
  let command: SetCommand;

  beforeEach(() => {
    command = new SetCommand();
  });

  it('should set object literal end-to-end', async () => {
    const context = createMockContext();
    const evaluator = createMockEvaluator();

    const input = await command.parseInput(
      {
        args: [{ type: 'literal', value: { textContent: 'Object', id: 'obj-id' } }],
        modifiers: {},
      },
      evaluator,
      context
    );

    expect(command.validate(input)).toBe(true);

    await command.execute(input, context);

    expect(context.me!.textContent).toBe('Object');
    expect(context.me!.id).toBe('obj-id');
  });

  it('should set "the X of Y" end-to-end', async () => {
    const context = createMockContext();
    const evaluator = createMockEvaluator();

    const input = await command.parseInput(
      {
        args: [{ type: 'literal', value: 'the title of me' }],
        modifiers: { to: { type: 'expression', value: 'Title' } },
      },
      evaluator,
      context
    );

    expect(command.validate(input)).toBe(true);

    await command.execute(input, context);

    expect((context.me as HTMLElement).title).toBe('Title');
  });

  it('should set CSS property end-to-end', async () => {
    const context = createMockContext();
    const evaluator = createMockEvaluator();

    const input = await command.parseInput(
      {
        args: [{ type: 'literal', value: '*opacity' }],
        modifiers: { to: { type: 'expression', value: '0.8' } },
      },
      evaluator,
      context
    );

    expect(command.validate(input)).toBe(true);

    await command.execute(input, context);

    expect((context.me as HTMLElement).style.opacity).toBe('0.8');
  });
});
