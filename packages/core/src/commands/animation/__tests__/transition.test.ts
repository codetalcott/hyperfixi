/**
 * Unit Tests for TransitionCommand (Standalone V2)
 *
 * Tests CSS transition animation functionality including:
 * - Metadata (name, description, syntax, sideEffects)
 * - parseInput (property, target, modifiers, CSS keywords)
 * - execute (property handling, transition flow, CSS keywords, context)
 * - Integration (parseInput -> execute)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransitionCommand } from '../transition';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// Mock event-waiting helper before any imports that use it
vi.mock('../../helpers/event-waiting', () => ({
  waitForTransitionEnd: vi.fn().mockResolvedValue({ completed: true, cancelled: false }),
}));

// Import the mocked module for assertions
import { waitForTransitionEnd } from '../../helpers/event-waiting';

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
        return (node as Record<string, unknown>).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as Record<string, unknown>).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('TransitionCommand (Standalone V2)', () => {
  let command: TransitionCommand;

  beforeEach(() => {
    command = new TransitionCommand();
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: vi.fn().mockReturnValue('0px'),
    } as unknown as CSSStyleDeclaration);
    vi.mocked(waitForTransitionEnd).mockClear();
    vi.mocked(waitForTransitionEnd).mockResolvedValue({ completed: true, cancelled: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ====================================================================
  // Metadata
  // ====================================================================

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('transition');
    });

    it('should have description mentioning CSS transitions', () => {
      expect(command.metadata).toBeDefined();
      const desc = command.metadata.description.toLowerCase();
      expect(desc).toMatch(/animate|css transitions/);
    });

    it('should have syntax defined', () => {
      const syntax = command.metadata.syntax;
      const syntaxStr = Array.isArray(syntax) ? syntax.join(' ') : syntax;
      expect(syntaxStr).toContain('transition');
    });

    it('should have style-change and timing side effects', () => {
      expect(command.metadata.sideEffects).toContain('style-change');
      expect(command.metadata.sideEffects).toContain('timing');
    });
  });

  // ====================================================================
  // parseInput
  // ====================================================================

  describe('parseInput', () => {
    it('should parse property from first argument', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'opacity' } as unknown as ASTNode],
          modifiers: { to: { type: 'literal', value: '0.5' } as unknown as any },
        },
        evaluator,
        context
      );

      expect(input.property).toBe('opacity');
      expect(input.value).toBe('0.5');
    });

    it('should parse target + property when first arg is a selector', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '#box' } as unknown as ASTNode,
            { type: 'identifier', name: 'opacity' } as unknown as ASTNode,
          ],
          modifiers: { to: { type: 'literal', value: '1' } as unknown as any },
        },
        evaluator,
        context
      );

      expect(input.target).toBe('#box');
      expect(input.property).toBe('opacity');
    });

    it('should throw on empty args', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('transition requires property and value');
    });

    it('should throw when no property is provided', async () => {
      const context = createMockContext();
      // Evaluator that returns an empty string for the first argument
      const evaluator = {
        evaluate: async () => '',
      } as unknown as ExpressionEvaluator;

      await expect(
        command.parseInput(
          {
            args: [{ type: 'literal', value: '' } as unknown as ASTNode],
            modifiers: { to: { type: 'literal', value: 'red' } as unknown as any },
          },
          evaluator,
          context
        )
      ).rejects.toThrow('transition requires a CSS property');
    });

    it('should throw when "to" modifier is missing', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          {
            args: [{ type: 'identifier', name: 'opacity' } as unknown as ASTNode],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow('transition requires "to <value>"');
    });

    it('should parse "over" duration and "with" timing modifiers', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'left' } as unknown as ASTNode],
          modifiers: {
            to: { type: 'literal', value: '100px' } as unknown as any,
            over: { type: 'literal', value: '500ms' } as unknown as any,
            with: { type: 'identifier', name: 'ease-in-out' } as unknown as any,
          },
        },
        evaluator,
        context
      );

      expect(input.property).toBe('left');
      expect(input.value).toBe('100px');
      expect(input.duration).toBe('500ms');
      expect(input.timingFunction).toBe('ease-in-out');
    });

    it('should handle CSS keyword "initial" that evaluates to undefined', async () => {
      const context = createMockContext();
      // Evaluator that returns undefined for identifier nodes (simulates unresolved variable)
      const evaluator = {
        evaluate: async (node: ASTNode, _ctx: ExecutionContext) => {
          const n = node as Record<string, unknown>;
          if (n.type === 'identifier' && n.name === 'initial') {
            return undefined; // CSS keyword not defined as a variable
          }
          if ('value' in n) return n.value;
          if ('name' in n) return n.name;
          return node;
        },
      } as unknown as ExpressionEvaluator;

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'opacity' } as unknown as ASTNode],
          modifiers: {
            to: { type: 'identifier', name: 'initial' } as unknown as any,
          },
        },
        evaluator,
        context
      );

      expect(input.value).toBe('initial');
    });
  });

  // ====================================================================
  // execute - property handling
  // ====================================================================

  describe('execute - property handling', () => {
    it('should strip leading * from property', async () => {
      const context = createMockContext();

      const result = await command.execute({ property: '*opacity', value: '0.5' }, context);

      expect(result.property).toBe('opacity');
    });

    it('should convert camelCase to kebab-case', async () => {
      const context = createMockContext();

      const result = await command.execute({ property: 'backgroundColor', value: 'red' }, context);

      expect(result.property).toBe('background-color');
    });

    it('should set transition style on element', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute({ property: 'opacity', value: '0.5' }, context);

      // waitForTransitionEnd is called, so transition was set.
      // After execute, original transition is restored; verify the mock was called
      // with the correct element.
      expect(waitForTransitionEnd).toHaveBeenCalledWith(element, 'opacity', expect.any(Number));
    });
  });

  // ====================================================================
  // execute - transition flow
  // ====================================================================

  describe('execute - transition flow', () => {
    it('should get fromValue via getComputedStyle', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const result = await command.execute({ property: 'opacity', value: '1' }, context);

      expect(window.getComputedStyle).toHaveBeenCalledWith(element);
      expect(result.fromValue).toBe('0px'); // mocked getPropertyValue returns '0px'
    });

    it('should set property value on the element', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      const setPropertySpy = vi.spyOn(element.style, 'setProperty');

      await command.execute({ property: 'opacity', value: '0.5' }, context);

      expect(setPropertySpy).toHaveBeenCalledWith('opacity', '0.5');
    });

    it('should call waitForTransitionEnd with correct arguments', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      await command.execute({ property: 'opacity', value: '0.5', duration: 500 }, context);

      expect(waitForTransitionEnd).toHaveBeenCalledWith(element, 'opacity', 500);
    });

    it('should restore original transition after completion', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;
      element.style.transition = 'color 1s ease';

      await command.execute({ property: 'opacity', value: '0.5' }, context);

      expect(element.style.transition).toBe('color 1s ease');
    });

    it('should return result with element, property, fromValue, toValue, duration, completed', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const result = await command.execute(
        { property: 'opacity', value: '0.5', duration: 400 },
        context
      );

      expect(result).toEqual({
        element,
        property: 'opacity',
        fromValue: '0px',
        toValue: '0.5',
        duration: 400,
        completed: true,
      });
    });
  });

  // ====================================================================
  // execute - CSS keywords
  // ====================================================================

  describe('execute - CSS keywords', () => {
    it('should handle "initial" by removing inline then getting computed value', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      // Simulate an existing inline style
      element.style.setProperty('opacity', '0.3');

      // Mock getComputedStyle to return different values:
      // First call: gets fromValue (returns '0.3')
      // Second call: after removing inline, gets stylesheet value (returns '1')
      const getPropertyValueMock = vi
        .fn()
        .mockReturnValueOnce('0.3') // fromValue
        .mockReturnValueOnce('1'); // computed value after inline removal

      vi.mocked(window.getComputedStyle).mockReturnValue({
        getPropertyValue: getPropertyValueMock,
      } as unknown as CSSStyleDeclaration);

      const result = await command.execute({ property: 'opacity', value: 'initial' }, context);

      // The toValue should be the computed value after inline removal ('1')
      expect(result.toValue).toBe('1');
      expect(result.fromValue).toBe('0.3');
    });

    it('should remove inline style after transition when using CSS keyword', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      element.style.setProperty('opacity', '0.3');

      const getPropertyValueMock = vi
        .fn()
        .mockReturnValueOnce('0.3') // fromValue
        .mockReturnValueOnce('1'); // computed value after inline removal

      vi.mocked(window.getComputedStyle).mockReturnValue({
        getPropertyValue: getPropertyValueMock,
      } as unknown as CSSStyleDeclaration);

      const removePropertySpy = vi.spyOn(element.style, 'removeProperty');

      await command.execute({ property: 'opacity', value: 'initial' }, context);

      // removeProperty should be called: once during keyword handling, once after transition
      // The final call removes the inline style so the stylesheet takes over
      const removeOpacityCalls = removePropertySpy.mock.calls.filter(call => call[0] === 'opacity');
      expect(removeOpacityCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ====================================================================
  // execute - context
  // ====================================================================

  describe('execute - context', () => {
    it('leaves context.it untouched — upstream parity', async () => {
      // DELIBERATE CHANGE (Arc C close-out). Upstream's transition sets no
      // result; same reasoning as settle. The element still surfaces on the
      // command output.
      const context = createMockContext();
      const element = context.me as HTMLElement;

      expect(context.it).toBeUndefined();

      const result = await command.execute({ property: 'opacity', value: '1' }, context);

      expect(result.element).toBe(element);
      expect(context.it).toBeUndefined();
    });

    it('should use default duration of 300ms when not specified', async () => {
      const context = createMockContext();
      const element = context.me as HTMLElement;

      const result = await command.execute({ property: 'opacity', value: '1' }, context);

      expect(result.duration).toBe(300);
      expect(waitForTransitionEnd).toHaveBeenCalledWith(element, 'opacity', 300);
    });
  });

  // ====================================================================
  // integration (parseInput -> execute)
  // ====================================================================

  describe('integration', () => {
    it('should end-to-end transition a simple property', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = context.me as HTMLElement;

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'opacity' } as unknown as ASTNode],
          modifiers: {
            to: { type: 'literal', value: '0' } as unknown as any,
          },
        },
        evaluator,
        context
      );

      expect(input.property).toBe('opacity');
      expect(input.value).toBe('0');

      const result = await command.execute(input, context);

      expect(result.element).toBe(element);
      expect(result.property).toBe('opacity');
      expect(result.toValue).toBe('0');
      expect(result.duration).toBe(300);
      expect(result.completed).toBe(true);
      expect(context.it).toBeUndefined(); // no self-assign — upstream parity
    });

    it('should end-to-end transition with target, duration, and timing', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Create and append a target element so resolveElement can find it
      const targetEl = document.createElement('div');
      targetEl.id = 'transition-target';
      document.body.appendChild(targetEl);

      try {
        const input = await command.parseInput(
          {
            args: [
              { type: 'literal', value: '#transition-target' } as unknown as ASTNode,
              { type: 'identifier', name: 'backgroundColor' } as unknown as ASTNode,
            ],
            modifiers: {
              to: { type: 'literal', value: 'red' } as unknown as any,
              over: { type: 'literal', value: 500 } as unknown as any,
              with: { type: 'identifier', name: 'ease-in-out' } as unknown as any,
            },
          },
          evaluator,
          context
        );

        expect(input.target).toBe('#transition-target');
        expect(input.property).toBe('backgroundColor');
        expect(input.value).toBe('red');
        expect(input.duration).toBe(500);
        expect(input.timingFunction).toBe('ease-in-out');

        const result = await command.execute(input, context);

        expect(result.element).toBe(targetEl);
        expect(result.property).toBe('background-color');
        expect(result.toValue).toBe('red');
        expect(result.duration).toBe(500);
        expect(result.completed).toBe(true);
        expect(context.it).toBeUndefined(); // no self-assign — upstream parity

        expect(waitForTransitionEnd).toHaveBeenCalledWith(targetEl, 'background-color', 500);
      } finally {
        document.body.removeChild(targetEl);
      }
    });
  });
});
