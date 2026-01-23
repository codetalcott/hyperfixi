/**
 * Unit Tests for MeasureCommand (Standalone V2)
 *
 * Tests DOM element measurement functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeasureCommand } from '../measure';
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
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        const name = (node as any).name;
        // Resolve context variables
        if (name === 'me') return context.me;
        if (name === 'it') return context.it;
        if (name === 'you') return context.you;
        return name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

function createMockElement(): HTMLElement {
  const element = document.createElement('div');

  // Mock getBoundingClientRect
  element.getBoundingClientRect = vi.fn(() => ({
    width: 200,
    height: 100,
    top: 50,
    left: 30,
    right: 230,
    bottom: 150,
    x: 30,
    y: 50,
    toJSON: () => ({}),
  }));

  // Mock dimension properties
  Object.defineProperties(element, {
    offsetWidth: { get: () => 200, configurable: true },
    offsetHeight: { get: () => 100, configurable: true },
    clientWidth: { get: () => 190, configurable: true },
    clientHeight: { get: () => 90, configurable: true },
    scrollWidth: { get: () => 200, configurable: true },
    scrollHeight: { get: () => 100, configurable: true },
    offsetTop: { get: () => 10, configurable: true },
    offsetLeft: { get: () => 20, configurable: true },
    scrollTop: { get: () => 5, configurable: true },
    scrollLeft: { get: () => 3, configurable: true },
  });

  return element;
}

// ========== Tests ==========

describe('MeasureCommand (Standalone V2)', () => {
  let command: MeasureCommand;

  beforeEach(() => {
    command = new MeasureCommand();

    // Mock getComputedStyle
    global.getComputedStyle = vi.fn((el: Element) => {
      return {
        getPropertyValue: (prop: string) => {
          if (prop === 'width') return '200px';
          if (prop === 'font-size') return '16px';
          if (prop === 'margin-top') return '10px';
          return '';
        },
      } as CSSStyleDeclaration;
    });
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('measure');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have data-mutation side effect', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
    });

    it('should have correct category', () => {
      expect(command.metadata.category).toBe('animation');
    });
  });

  describe('parseInput', () => {
    it('should parse with no arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.target).toBeUndefined();
      expect(input.property).toBeUndefined();
    });

    it('should parse single property argument', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'height' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.property).toBe('height');
    });

    it('should parse target and property arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '#target' } as any,
            { type: 'identifier', name: 'width' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe('#target');
      expect(input.property).toBe('width');
    });

    it('should parse "me" as target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = document.createElement('div');
      context.me = element;

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'me' } as any,
            { type: 'identifier', name: 'height' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe(element);
      expect(input.property).toBe('height');
    });

    it('should parse "it" as target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = document.createElement('div');
      context.it = element;

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'it' } as any,
            { type: 'identifier', name: 'width' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.target).toBe(element);
      expect(input.property).toBe('width');
    });

    it('should parse set modifier for variable storage', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'width' } as any],
          modifiers: { set: { type: 'identifier', name: 'myWidth' } as any },
        },
        evaluator,
        context
      );

      expect(input.property).toBe('width');
      expect(input.variable).toBe('myWidth');
    });
  });

  describe('getMeasurement - dimensions', () => {
    it('should measure width', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'width');

      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
    });

    it('should measure height', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'height');

      expect(result.value).toBe(100);
      expect(result.unit).toBe('px');
    });

    it('should measure clientWidth', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'clientWidth');

      expect(result.value).toBe(190);
      expect(result.unit).toBe('px');
    });

    it('should measure client-width with hyphen', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'client-width');

      expect(result.value).toBe(190);
      expect(result.unit).toBe('px');
    });

    it('should measure offsetWidth', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'offsetWidth');

      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
    });

    it('should measure scrollWidth', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'scrollWidth');

      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
    });
  });

  describe('getMeasurement - position', () => {
    it('should measure top position', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'top');

      expect(result.value).toBe(50);
      expect(result.unit).toBe('px');
    });

    it('should measure left position', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'left');

      expect(result.value).toBe(30);
      expect(result.unit).toBe('px');
    });

    it('should measure x position', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'x');

      expect(result.value).toBe(20);
      expect(result.unit).toBe('px');
    });

    it('should measure y position', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'y');

      expect(result.value).toBe(10);
      expect(result.unit).toBe('px');
    });

    it('should measure offsetTop', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'offsetTop');

      expect(result.value).toBe(10);
      expect(result.unit).toBe('px');
    });

    it('should measure scrollTop', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'scrollTop');

      expect(result.value).toBe(5);
      expect(result.unit).toBe('px');
    });
  });

  describe('getMeasurement - CSS properties', () => {
    it('should measure CSS property with * prefix', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, '*width');

      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
    });

    it('should measure font-size CSS property', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'font-size');

      expect(result.value).toBe(16);
      expect(result.unit).toBe('px');
    });

    it('should return 0 for invalid property', () => {
      const element = createMockElement();

      const result = (command as any).getMeasurement(element, 'nonexistent');

      expect(result.value).toBe(0);
      expect(result.unit).toBe('px');
    });
  });

  describe('execute', () => {
    it('should measure width by default', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      const result = await command.execute({}, context);

      expect(result.property).toBe('width');
      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
    });

    it('should measure specified property', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      const result = await command.execute({ property: 'height' }, context);

      expect(result.property).toBe('height');
      expect(result.value).toBe(100);
      expect(result.unit).toBe('px');
    });

    it('should store value in variable when specified', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      const result = await command.execute({ property: 'width', variable: 'myWidth' }, context);

      expect(context.locals.get('myWidth')).toBe(200);
      expect(result.stored).toBe(true);
    });

    it('should set context.it to measured value', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      await command.execute({ property: 'height' }, context);

      expect(context.it).toBe(100);
    });

    it('should use correct target element', async () => {
      const context = createMockContext();
      const element = createMockElement();
      document.body.appendChild(element);
      element.id = 'target';

      const result = await command.execute({ target: '#target', property: 'width' }, context);

      expect(result.element).toBe(element);
      expect(result.value).toBe(200);

      document.body.removeChild(element);
    });

    it('should return wasAsync as false', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      const result = await command.execute({}, context);

      expect(result.wasAsync).toBe(false);
    });

    it('should return result equal to value', async () => {
      const context = createMockContext();
      const element = createMockElement();
      context.me = element;

      const result = await command.execute({ property: 'width' }, context);

      expect(result.result).toBe(result.value);
      expect(result.result).toBe(200);
    });
  });

  describe('integration', () => {
    it('should work end-to-end for simple measurement', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = createMockElement();
      context.me = element;

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'width' } as any],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result.value).toBe(200);
      expect(result.unit).toBe('px');
      expect(context.it).toBe(200);
    });

    it('should work end-to-end with variable storage', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = createMockElement();
      context.me = element;

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'height' } as any],
          modifiers: { set: { type: 'identifier', name: 'h' } as any },
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result.value).toBe(100);
      expect(context.locals.get('h')).toBe(100);
      expect(result.stored).toBe(true);
    });

    it('should work end-to-end with target and property', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = createMockElement();
      document.body.appendChild(element);
      element.id = 'target';

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '#target' } as any,
            { type: 'identifier', name: 'scrollTop' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result.element).toBe(element);
      expect(result.property).toBe('scrollTop');
      expect(result.value).toBe(5);

      document.body.removeChild(element);
    });
  });
});
