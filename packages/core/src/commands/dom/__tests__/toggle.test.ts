/**
 * Unit Tests for ToggleCommand (Standalone V2)
 *
 * Tests all toggle types: classes, attributes, CSS properties, properties,
 * dialogs, details, selects, and classes-between.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToggleCommand } from '../toggle';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
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

describe('ToggleCommand (Standalone V2)', () => {
  let command: ToggleCommand;

  beforeEach(() => {
    command = new ToggleCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('toggle');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have DOM mutation side effect', () => {
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });

    it('should have correct category', () => {
      expect(command.metadata.category).toBe('dom');
    });
  });

  describe('parseInput - validation', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('toggle command requires an argument');
    });
  });

  describe('parseInput - classes', () => {
    it('should parse class toggle with dot notation', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.active' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      if (input.type === 'classes') {
        expect(input.classes).toContain('active');
      }
    });

    it('should parse class toggle without dot', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'active' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      if (input.type === 'classes') {
        expect(input.classes).toContain('active');
      }
    });

    it('should parse multiple classes', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.active .visible' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      if (input.type === 'classes') {
        expect(input.classes).toContain('active');
        expect(input.classes).toContain('visible');
      }
    });

    it('should parse class toggle with duration modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.active' } as any],
          modifiers: { for: { type: 'literal', value: '2s' } as any },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      if (input.type === 'classes') {
        expect(input.duration).toBe(2000);
      }
    });

    it('should parse class toggle with until event modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.active' } as any],
          modifiers: { until: { type: 'literal', value: 'click' } as any },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      if (input.type === 'classes') {
        expect(input.untilEvent).toBe('click');
      }
    });
  });

  describe('parseInput - attributes', () => {
    it('should parse attribute toggle with @ notation', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@disabled' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('disabled');
      }
    });

    it('should parse attribute toggle from attributeAccess AST node (real parser output)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Real parser creates attributeAccess nodes for @attr tokens
      const input = await command.parseInput(
        {
          args: [{ type: 'attributeAccess', attributeName: 'disabled' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('disabled');
      }
    });

    it('should parse attributeAccess node with target via on keyword', async () => {
      const context = createMockContext();
      const targetBtn = document.createElement('button');
      targetBtn.id = 'target-btn';
      document.body.appendChild(targetBtn);

      const evaluator = createMockEvaluator();

      try {
        const input = await command.parseInput(
          {
            args: [
              { type: 'attributeAccess', attributeName: 'required' } as any,
              { type: 'identifier', name: 'on' } as any,
              { type: 'selector', value: '#target-btn' } as any,
            ],
            modifiers: {},
          },
          evaluator,
          context
        );

        expect(input.type).toBe('attribute');
        if (input.type === 'attribute') {
          expect(input.name).toBe('required');
        }
      } finally {
        document.body.removeChild(targetBtn);
      }
    });

    it('should parse attribute toggle with bracket notation', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '[@aria-hidden]' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('aria-hidden');
      }
    });

    it('should parse attribute toggle with value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '[@data-status="active"]' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-status');
        expect(input.value).toBe('active');
      }
    });
  });

  describe('parseInput - CSS properties', () => {
    it('should parse display property toggle', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*display' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('css-property');
      if (input.type === 'css-property') {
        expect(input.property).toBe('display');
      }
    });

    it('should parse visibility property toggle', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*visibility' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('css-property');
      if (input.type === 'css-property') {
        expect(input.property).toBe('visibility');
      }
    });

    it('should parse opacity property toggle', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '*opacity' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('css-property');
      if (input.type === 'css-property') {
        expect(input.property).toBe('opacity');
      }
    });
  });

  describe('parseInput - classes-between', () => {
    it('should parse toggle between two classes', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'between' } as any,
            { type: 'literal', value: '.classA' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'literal', value: '.classB' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes-between');
      if (input.type === 'classes-between') {
        expect(input.classA).toBe('classA');
        expect(input.classB).toBe('classB');
      }
    });

    it('should strip dots from class names in between syntax', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'between' } as any,
            { type: 'literal', value: '.foo' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'literal', value: '.bar' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.type).toBe('classes-between');
      if (input.type === 'classes-between') {
        expect(input.classA).toBe('foo');
        expect(input.classB).toBe('bar');
      }
    });
  });

  describe('execute - classes', () => {
    it('should toggle class on element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      const result = await command.execute(
        {
          type: 'classes',
          classes: ['active'],
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('active')).toBe(true);
      expect(result).toEqual([element]);
    });

    it('should toggle class off when already present', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.classList.add('active');

      await command.execute(
        {
          type: 'classes',
          classes: ['active'],
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('active')).toBe(false);
    });

    it('should toggle multiple classes', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'classes',
          classes: ['active', 'visible'],
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('active')).toBe(true);
      expect(element.classList.contains('visible')).toBe(true);
    });

    it('should toggle classes on multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');

      await command.execute(
        {
          type: 'classes',
          classes: ['active'],
          targets: [el1, el2],
        },
        context
      );

      expect(el1.classList.contains('active')).toBe(true);
      expect(el2.classList.contains('active')).toBe(true);
    });

    it('should return empty array when no valid classes', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      // Mock resolveDynamicClasses returning empty array
      const result = await command.execute(
        {
          type: 'classes',
          classes: [],
          targets: [element],
        },
        context
      );

      expect(result).toEqual([element]);
    });
  });

  describe('execute - attributes', () => {
    it('should toggle attribute on element', async () => {
      const context = createMockContext();
      const element = document.createElement('button');

      await command.execute(
        {
          type: 'attribute',
          name: 'disabled',
          targets: [element],
        },
        context
      );

      expect(element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle attribute off when already present', async () => {
      const context = createMockContext();
      const element = document.createElement('button');
      element.setAttribute('disabled', '');

      await command.execute(
        {
          type: 'attribute',
          name: 'disabled',
          targets: [element],
        },
        context
      );

      expect(element.hasAttribute('disabled')).toBe(false);
    });

    it('should toggle attribute with value', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'attribute',
          name: 'data-status',
          value: 'active',
          targets: [element],
        },
        context
      );

      expect(element.getAttribute('data-status')).toBe('active');
    });

    it('should toggle attribute on multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('button');
      const el2 = document.createElement('button');

      await command.execute(
        {
          type: 'attribute',
          name: 'disabled',
          targets: [el1, el2],
        },
        context
      );

      expect(el1.hasAttribute('disabled')).toBe(true);
      expect(el2.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('execute - CSS properties', () => {
    it('should toggle display property', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'css-property',
          property: 'display',
          targets: [element],
        },
        context
      );

      expect(element.style.display).toBeTruthy();
    });

    it('should toggle visibility property', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'css-property',
          property: 'visibility',
          targets: [element],
        },
        context
      );

      expect(element.style.visibility).toBeTruthy();
    });

    it('should toggle opacity property', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'css-property',
          property: 'opacity',
          targets: [element],
        },
        context
      );

      expect(element.style.opacity).toBeTruthy();
    });
  });

  describe('execute - classes-between', () => {
    it('should switch from classA to classB', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.classList.add('foo');

      await command.execute(
        {
          type: 'classes-between',
          classA: 'foo',
          classB: 'bar',
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('foo')).toBe(false);
      expect(element.classList.contains('bar')).toBe(true);
    });

    it('should switch from classB to classA', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.classList.add('bar');

      await command.execute(
        {
          type: 'classes-between',
          classA: 'foo',
          classB: 'bar',
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('bar')).toBe(false);
      expect(element.classList.contains('foo')).toBe(true);
    });

    it('should add classA when neither present', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        {
          type: 'classes-between',
          classA: 'foo',
          classB: 'bar',
          targets: [element],
        },
        context
      );

      expect(element.classList.contains('foo')).toBe(true);
      expect(element.classList.contains('bar')).toBe(false);
    });

    it('should toggle classes-between on multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.classList.add('foo');
      el2.classList.add('bar');

      await command.execute(
        {
          type: 'classes-between',
          classA: 'foo',
          classB: 'bar',
          targets: [el1, el2],
        },
        context
      );

      expect(el1.classList.contains('foo')).toBe(false);
      expect(el1.classList.contains('bar')).toBe(true);
      expect(el2.classList.contains('bar')).toBe(false);
      expect(el2.classList.contains('foo')).toBe(true);
    });
  });

  describe('execute - popover', () => {
    it('should call togglePopover on popover elements', async () => {
      const context = createMockContext();
      const el = document.createElement('div');
      el.setAttribute('popover', '');
      document.body.appendChild(el);

      if (typeof el.togglePopover === 'function') {
        const spy = vi.spyOn(el, 'togglePopover');
        await command.execute({ type: 'popover', targets: [el] }, context);
        expect(spy).toHaveBeenCalled();
      }

      document.body.removeChild(el);
    });

    it('should toggle multiple popover elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.setAttribute('popover', 'manual');
      el2.setAttribute('popover', 'manual');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      if (typeof el1.togglePopover === 'function') {
        const spy1 = vi.spyOn(el1, 'togglePopover');
        const spy2 = vi.spyOn(el2, 'togglePopover');
        await command.execute({ type: 'popover', targets: [el1, el2] }, context);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
      }

      document.body.removeChild(el1);
      document.body.removeChild(el2);
    });

    it('should not throw when togglePopover throws', async () => {
      const context = createMockContext();
      const el = document.createElement('div');
      el.setAttribute('popover', '');
      document.body.appendChild(el);

      if (typeof el.togglePopover === 'function') {
        vi.spyOn(el, 'togglePopover').mockImplementation(() => {
          throw new DOMException('Invalid state', 'InvalidStateError');
        });
        await expect(
          command.execute({ type: 'popover', targets: [el] }, context)
        ).resolves.toBeDefined();
      }

      document.body.removeChild(el);
    });
  });

  describe('parseInput - popover (explicit as popover)', () => {
    it('should parse "as popover" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const div = document.createElement('div');
      div.id = 'my-popover';
      document.body.appendChild(div);

      try {
        const input = await command.parseInput(
          {
            args: [{ type: 'literal', value: '#my-popover' } as any],
            modifiers: { as: { type: 'literal', value: 'popover' } as any },
          },
          evaluator,
          context
        );

        expect(input.type).toBe('popover');
        if (input.type === 'popover') {
          expect(input.targets).toHaveLength(1);
          expect(input.targets[0]).toBe(div);
        }
      } finally {
        document.body.removeChild(div);
      }
    });
  });

  describe('integration', () => {
    it('should work end-to-end for class toggle', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = document.createElement('div');

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '.active' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Mock context.me to be the element
      context.me = element;

      const result = await command.execute(input, context);

      expect(result[0].classList.contains('active')).toBe(true);
    });

    it('should work end-to-end for attribute toggle', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = document.createElement('button');

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: '@disabled' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      context.me = element;

      const result = await command.execute(input, context);

      expect(result[0].hasAttribute('disabled')).toBe(true);
    });

    it('should work end-to-end for classes-between', async () => {
      const element = document.createElement('div');
      element.classList.add('foo');

      const context = createMockContext();
      context.me = element; // Set before parseInput so targets resolve correctly
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'between' } as any,
            { type: 'literal', value: '.foo' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'literal', value: '.bar' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result[0].classList.contains('foo')).toBe(false);
      expect(result[0].classList.contains('bar')).toBe(true);
    });
  });
});
