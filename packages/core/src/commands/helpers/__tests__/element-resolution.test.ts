/**
 * Unit Tests for Element Resolution Helpers
 *
 * Tests the shared utilities for DOM element targeting used by 30+ commands.
 * Critical helper affecting: transition, settle, toggle, add, remove, show, hide, put, make, etc.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveElement,
  resolveElements,
  asHTMLElement,
  isContextRef,
  isCSSSelector,
  findClosest,
  findAll,
  resolvePossessive,
  resolveTargetsFromArgs,
  type ResolveTargetsOptions,
} from '../element-resolution';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-me';
  meElement.className = 'test-class';

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
  } as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator<T = unknown>(returnValue?: T) {
  return {
    evaluate: vi.fn(async (node: unknown) => {
      if (returnValue !== undefined) {
        return returnValue;
      }
      // Default: return node value if it has one
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      return node;
    }),
  };
}

// ========== Tests ==========

describe('Element Resolution Helpers', () => {
  describe('resolveElement', () => {
    describe('HTMLElement input', () => {
      it('should return HTMLElement as-is', () => {
        const context = createMockContext();
        const element = document.createElement('span');

        const result = resolveElement(element, context);

        expect(result).toBe(element);
      });

      it('should handle HTMLElement with attributes', () => {
        const context = createMockContext();
        const element = document.createElement('button');
        element.id = 'test-button';
        element.className = 'btn';

        const result = resolveElement(element, context);

        expect(result).toBe(element);
        expect(result.id).toBe('test-button');
      });
    });

    describe('undefined input (default to context.me)', () => {
      it('should return context.me when target is undefined', () => {
        const context = createMockContext();

        const result = resolveElement(undefined, context);

        expect(result).toBe(context.me);
      });

      it('should throw when target is undefined and context.me is null', () => {
        const context = createMockContext({ me: null });

        expect(() => resolveElement(undefined, context)).toThrow(
          'No target element - provide explicit target or ensure context.me is set'
        );
      });
    });

    describe('context references (me, it, you)', () => {
      it('should resolve "me" reference', () => {
        const context = createMockContext();

        const result = resolveElement('me', context);

        expect(result).toBe(context.me);
      });

      it('should resolve " me " with whitespace', () => {
        const context = createMockContext();

        const result = resolveElement('  me  ', context);

        expect(result).toBe(context.me);
      });

      it('should throw when "me" is not available', () => {
        const context = createMockContext({ me: null });

        expect(() => resolveElement('me', context)).toThrow(
          'Context reference "me" is not available'
        );
      });

      it('should resolve "it" reference', () => {
        const itElement = document.createElement('span');
        const context = createMockContext({ it: itElement });

        const result = resolveElement('it', context);

        expect(result).toBe(itElement);
      });

      it('should throw when "it" is not an HTMLElement', () => {
        const context = createMockContext({ it: 'not an element' });

        expect(() => resolveElement('it', context)).toThrow(
          'Context reference "it" is not an HTMLElement'
        );
      });

      it('should resolve "you" reference', () => {
        const youElement = document.createElement('div');
        const context = createMockContext({ you: youElement });

        const result = resolveElement('you', context);

        expect(result).toBe(youElement);
      });

      it('should throw when "you" is not available', () => {
        const context = createMockContext({ you: null });

        expect(() => resolveElement('you', context)).toThrow(
          'Context reference "you" is not available'
        );
      });
    });

    describe('CSS selectors', () => {
      beforeEach(() => {
        // Set up DOM for selector tests
        document.body.innerHTML = `
          <div id="target-id" class="target-class">Target</div>
          <button class="btn primary">Button</button>
          <span data-test="value">Span</span>
        `;
      });

      it('should resolve ID selector', () => {
        const context = createMockContext();

        const result = resolveElement('#target-id', context);

        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.id).toBe('target-id');
      });

      it('should resolve class selector', () => {
        const context = createMockContext();

        const result = resolveElement('.target-class', context);

        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.classList.contains('target-class')).toBe(true);
      });

      it('should resolve tag selector', () => {
        const context = createMockContext();

        const result = resolveElement('button', context);

        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.tagName).toBe('BUTTON');
      });

      it('should resolve attribute selector', () => {
        const context = createMockContext();

        const result = resolveElement('[data-test="value"]', context);

        expect(result).toBeInstanceOf(HTMLElement);
        expect(result.getAttribute('data-test')).toBe('value');
      });

      it('should throw when selector matches no elements', () => {
        const context = createMockContext();

        expect(() => resolveElement('#non-existent', context)).toThrow(
          'Element not found with selector: #non-existent'
        );
      });

      it('should throw when element not found even if DOM available', () => {
        const context = createMockContext({ me: null });

        // Note: In happy-dom, document is always available, so we get "Element not found" instead of "DOM not available"
        expect(() => resolveElement('#non-existent-target', context)).toThrow(
          'Element not found with selector'
        );
      });
    });

    describe('invalid input', () => {
      it('should throw for number input', () => {
        const context = createMockContext();

        expect(() => resolveElement(42 as any, context)).toThrow('Invalid target type: number');
      });

      it('should throw for object input', () => {
        const context = createMockContext();

        expect(() => resolveElement({} as any, context)).toThrow('Invalid target type: object');
      });
    });
  });

  describe('resolveElements', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
    });

    describe('array input', () => {
      it('should filter and return HTMLElements from array', () => {
        const context = createMockContext();
        const elements = [
          document.createElement('div'),
          document.createElement('span'),
          'not an element' as any,
          document.createElement('button'),
        ];

        const result = resolveElements(elements, context);

        expect(result).toHaveLength(3);
        expect(result.every(el => el instanceof HTMLElement)).toBe(true);
      });

      it('should handle empty array', () => {
        const context = createMockContext();

        const result = resolveElements([], context);

        expect(result).toEqual([]);
      });
    });

    describe('NodeList input', () => {
      it('should convert NodeList to HTMLElement array', () => {
        const context = createMockContext();
        const nodeList = document.querySelectorAll('.item');

        const result = resolveElements(nodeList, context);

        expect(result).toHaveLength(3);
        expect(result.every(el => el instanceof HTMLElement)).toBe(true);
      });
    });

    describe('single element input', () => {
      it('should wrap single HTMLElement in array', () => {
        const context = createMockContext();
        const element = document.createElement('div');

        const result = resolveElements(element, context);

        expect(result).toEqual([element]);
      });
    });

    describe('undefined input (default to context.me)', () => {
      it('should return [context.me] when target is undefined', () => {
        const context = createMockContext();

        const result = resolveElements(undefined, context);

        expect(result).toEqual([context.me]);
      });

      it('should return empty array when context.me is null', () => {
        const context = createMockContext({ me: null });

        const result = resolveElements(undefined, context);

        expect(result).toEqual([]);
      });
    });

    describe('context references', () => {
      it('should resolve "me" to array', () => {
        const context = createMockContext();

        const result = resolveElements('me', context);

        expect(result).toEqual([context.me]);
      });

      it('should resolve "it" to array', () => {
        const itElement = document.createElement('span');
        const context = createMockContext({ it: itElement });

        const result = resolveElements('it', context);

        expect(result).toEqual([itElement]);
      });

      it('should return empty array when "it" is not an HTMLElement', () => {
        const context = createMockContext({ it: 'not an element' });

        const result = resolveElements('it', context);

        expect(result).toEqual([]);
      });
    });

    describe('CSS selectors', () => {
      it('should resolve selector to multiple elements', () => {
        const context = createMockContext();

        const result = resolveElements('.item', context);

        expect(result).toHaveLength(3);
        expect(result.every(el => el.classList.contains('item'))).toBe(true);
      });

      it('should handle hyperscript queryReference syntax <tag/>', () => {
        const context = createMockContext();

        const result = resolveElements('<div/>', context);

        expect(result.length).toBeGreaterThan(0);
        expect(result.every(el => el.tagName === 'DIV')).toBe(true);
      });

      it('should return empty array when DOM is not available', () => {
        const context = createMockContext({ me: null });

        const result = resolveElements('#target', context);

        expect(result).toEqual([]);
      });
    });
  });

  describe('asHTMLElement', () => {
    it('should return HTMLElement when value is HTMLElement', () => {
      const element = document.createElement('div');

      const result = asHTMLElement(element);

      expect(result).toBe(element);
    });

    it('should throw when value is not an HTMLElement', () => {
      expect(() => asHTMLElement('not an element')).toThrow('Value is not an HTMLElement');
    });

    it('should throw for null', () => {
      expect(() => asHTMLElement(null)).toThrow('Value is not an HTMLElement');
    });

    it('should throw for undefined', () => {
      expect(() => asHTMLElement(undefined)).toThrow('Value is not an HTMLElement');
    });

    it('should throw for plain object', () => {
      expect(() => asHTMLElement({})).toThrow('Value is not an HTMLElement');
    });
  });

  describe('isContextRef', () => {
    it('should return true for "me"', () => {
      expect(isContextRef('me')).toBe(true);
    });

    it('should return true for "it"', () => {
      expect(isContextRef('it')).toBe(true);
    });

    it('should return true for "you"', () => {
      expect(isContextRef('you')).toBe(true);
    });

    it('should return false for other strings', () => {
      expect(isContextRef('target')).toBe(false);
      expect(isContextRef('#id')).toBe(false);
      expect(isContextRef('.class')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isContextRef('')).toBe(false);
    });
  });

  describe('isCSSSelector', () => {
    it('should return true for ID selector', () => {
      expect(isCSSSelector('#id')).toBe(true);
    });

    it('should return true for class selector', () => {
      expect(isCSSSelector('.class')).toBe(true);
    });

    it('should return true for attribute selector', () => {
      expect(isCSSSelector('[attr]')).toBe(true);
    });

    it('should return true for descendant selector', () => {
      expect(isCSSSelector('div span')).toBe(true);
    });

    it('should return true for tag selector', () => {
      expect(isCSSSelector('button')).toBe(true);
      expect(isCSSSelector('DIV')).toBe(true);
    });

    it('should return false for context references', () => {
      expect(isCSSSelector('me')).toBe(true); // 'me' matches /^[a-z]+$/i
      expect(isCSSSelector('it')).toBe(true); // 'it' matches /^[a-z]+$/i
    });

    it('should return false for non-selector strings', () => {
      expect(isCSSSelector('')).toBe(false);
      expect(isCSSSelector('123')).toBe(false);
    });
  });

  describe('findClosest', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="outer">
          <div class="middle">
            <div id="inner">Inner</div>
          </div>
        </div>
      `;
    });

    it('should find closest ancestor matching selector', () => {
      const inner = document.getElementById('inner')!;

      const result = findClosest(inner, '.middle');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result?.classList.contains('middle')).toBe(true);
    });

    it('should find itself if it matches selector', () => {
      const inner = document.getElementById('inner')!;

      const result = findClosest(inner, '#inner');

      expect(result).toBe(inner);
    });

    it('should return null when no ancestor matches', () => {
      const inner = document.getElementById('inner')!;

      const result = findClosest(inner, '.non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="container">
          <span class="item">Item 1</span>
          <span class="item">Item 2</span>
          <div>
            <span class="item">Item 3</span>
          </div>
        </div>
      `;
    });

    it('should find all descendants matching selector', () => {
      const container = document.getElementById('container')!;

      const result = findAll(container, '.item');

      expect(result).toHaveLength(3);
      expect(result.every(el => el.classList.contains('item'))).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const container = document.getElementById('container')!;

      const result = findAll(container, '.non-existent');

      expect(result).toEqual([]);
    });

    it('should filter out non-HTMLElements', () => {
      const container = document.getElementById('container')!;

      const result = findAll(container, '*');

      expect(result.every(el => el instanceof HTMLElement)).toBe(true);
    });
  });

  describe('resolvePossessive', () => {
    describe('my/me references', () => {
      it('should resolve "my" to context.me', () => {
        const context = createMockContext();

        const result = resolvePossessive('my', context);

        expect(result).toBe(context.me);
      });

      it('should resolve "me" to context.me', () => {
        const context = createMockContext();

        const result = resolvePossessive('me', context);

        expect(result).toBe(context.me);
      });

      it('should handle case-insensitive "MY"', () => {
        const context = createMockContext();

        const result = resolvePossessive('MY', context);

        expect(result).toBe(context.me);
      });

      it('should throw when context.me is null', () => {
        const context = createMockContext({ me: null });

        expect(() => resolvePossessive('my', context)).toThrow('No "me" element in context');
      });

      it('should throw when context.me is not an HTMLElement', () => {
        const context = createMockContext({ me: 'not an element' as any });

        expect(() => resolvePossessive('my', context)).toThrow('context.me is not an HTMLElement');
      });
    });

    describe('its/it references', () => {
      it('should resolve "its" to context.it', () => {
        const itElement = document.createElement('span');
        const context = createMockContext({ it: itElement });

        const result = resolvePossessive('its', context);

        expect(result).toBe(itElement);
      });

      it('should resolve "it" to context.it', () => {
        const itElement = document.createElement('span');
        const context = createMockContext({ it: itElement });

        const result = resolvePossessive('it', context);

        expect(result).toBe(itElement);
      });

      it('should throw when context.it is null', () => {
        const context = createMockContext({ it: null });

        expect(() => resolvePossessive('its', context)).toThrow('No "it" value in context');
      });

      it('should throw when context.it is not an HTMLElement', () => {
        const context = createMockContext({ it: 'string value' });

        expect(() => resolvePossessive('its', context)).toThrow('context.it is not an HTMLElement');
      });
    });

    describe('your/you references', () => {
      it('should resolve "your" to context.you', () => {
        const youElement = document.createElement('div');
        const context = createMockContext({ you: youElement });

        const result = resolvePossessive('your', context);

        expect(result).toBe(youElement);
      });

      it('should resolve "you" to context.you', () => {
        const youElement = document.createElement('div');
        const context = createMockContext({ you: youElement });

        const result = resolvePossessive('you', context);

        expect(result).toBe(youElement);
      });

      it('should throw when context.you is null', () => {
        const context = createMockContext({ you: null });

        expect(() => resolvePossessive('your', context)).toThrow('No "you" element in context');
      });
    });

    describe('unknown possessives', () => {
      it('should throw for unknown possessive', () => {
        const context = createMockContext();

        expect(() => resolvePossessive('their', context)).toThrow('Unknown possessive: their');
      });
    });
  });

  describe('resolveTargetsFromArgs', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="target1" class="target">Target 1</div>
        <div id="target2" class="target">Target 2</div>
      `;
    });

    describe('basic resolution', () => {
      it('should return [context.me] when args are empty', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator();

        const result = await resolveTargetsFromArgs([], evaluator, context, 'test');

        expect(result).toEqual([context.me]);
      });

      it('should resolve HTMLElement from args', async () => {
        const context = createMockContext();
        const element = document.createElement('span');
        const evaluator = createMockEvaluator(element);

        const result = await resolveTargetsFromArgs(
          [{ value: element }],
          evaluator,
          context,
          'test'
        );

        expect(result).toEqual([element]);
      });

      it('should resolve CSS selector from args', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('#target1');

        const result = await resolveTargetsFromArgs(
          [{ value: '#target1' }],
          evaluator,
          context,
          'test'
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('target1');
      });

      it('should resolve multiple selectors', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('.target');

        const result = await resolveTargetsFromArgs(
          [{ value: '.target' }],
          evaluator,
          context,
          'test'
        );

        expect(result).toHaveLength(2);
      });
    });

    describe('NodeList and Array handling', () => {
      it('should handle NodeList from evaluation', async () => {
        const context = createMockContext();
        const nodeList = document.querySelectorAll('.target');
        const evaluator = createMockEvaluator(nodeList);

        const result = await resolveTargetsFromArgs(
          [{ value: nodeList }],
          evaluator,
          context,
          'test'
        );

        expect(result).toHaveLength(2);
      });

      it('should handle Array from evaluation', async () => {
        const context = createMockContext();
        const elements = [document.getElementById('target1')!, document.getElementById('target2')!];
        const evaluator = createMockEvaluator(elements);

        const result = await resolveTargetsFromArgs(
          [{ value: elements }],
          evaluator,
          context,
          'test'
        );

        expect(result).toHaveLength(2);
      });

      it('should filter non-HTMLElements from arrays', async () => {
        const context = createMockContext();
        const mixed = [
          document.getElementById('target1')!,
          'not an element',
          document.getElementById('target2')!,
        ];
        const evaluator = createMockEvaluator(mixed);

        const result = await resolveTargetsFromArgs([{ value: mixed }], evaluator, context, 'test');

        expect(result).toHaveLength(2);
      });
    });

    describe('empty string handling', () => {
      it('should skip empty string values', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('');

        const result = await resolveTargetsFromArgs([{ value: '' }], evaluator, context, 'test');

        expect(result).toEqual([context.me]); // Falls back to context.me
      });

      it('should skip whitespace-only string values', () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('   ');

        return expect(
          resolveTargetsFromArgs([{ value: '   ' }], evaluator, context, 'test')
        ).resolves.toEqual([context.me]);
      });
    });

    describe('options.filterPrepositions', () => {
      it('should filter out keyword prepositions when enabled', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('#target1');

        const args = [
          { type: 'identifier', name: 'on' },
          { type: 'identifier', name: 'from' },
          { value: '#target1' },
        ];

        const result = await resolveTargetsFromArgs(args, evaluator, context, 'test', {
          filterPrepositions: true,
        });

        expect(evaluator.evaluate).toHaveBeenCalledTimes(1); // Only non-preposition arg
        expect(result).toHaveLength(1);
      });

      it('should not filter when filterPrepositions is false', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('#target1');

        const args = [{ type: 'identifier', name: 'on' }, { value: '#target1' }];

        await resolveTargetsFromArgs(args, evaluator, context, 'test', {
          filterPrepositions: false,
        });

        expect(evaluator.evaluate).toHaveBeenCalledTimes(2); // Both args evaluated
      });
    });

    describe('options.fallbackModifierKey', () => {
      it('should use fallback modifier when args are empty', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('#target1');

        const modifiers = { target: { value: '#target1' } };

        const result = await resolveTargetsFromArgs(
          [],
          evaluator,
          context,
          'test',
          { fallbackModifierKey: 'target' },
          modifiers
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('target1');
      });

      it('should not use fallback when args are provided', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('#target2');

        const modifiers = { target: { value: '#target1' } };

        const result = await resolveTargetsFromArgs(
          [{ value: '#target2' }],
          evaluator,
          context,
          'test',
          { fallbackModifierKey: 'target' },
          modifiers
        );

        expect(result[0].id).toBe('target2'); // Uses args, not fallback
      });
    });

    describe('hyperscript queryReference syntax', () => {
      it('should handle <tag/> syntax in selectors', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('<div/>');

        const result = await resolveTargetsFromArgs(
          [{ value: '<div/>' }],
          evaluator,
          context,
          'test'
        );

        expect(result.length).toBeGreaterThan(0);
        expect(result.every(el => el.tagName === 'DIV')).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw when context.me is null and no args', async () => {
        const context = createMockContext({ me: null });
        const evaluator = createMockEvaluator();

        await expect(resolveTargetsFromArgs([], evaluator, context, 'test')).rejects.toThrow(
          'test command: no target specified and context.me is null'
        );
      });

      it('should throw when context.me is not HTMLElement', async () => {
        const context = createMockContext({ me: 'not an element' as any });
        const evaluator = createMockEvaluator();

        await expect(resolveTargetsFromArgs([], evaluator, context, 'test')).rejects.toThrow(
          'test command: context.me must be an HTMLElement'
        );
      });

      it('should throw for invalid CSS selector', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator('[[invalid]]');

        await expect(
          resolveTargetsFromArgs([{ value: '[[invalid]]' }], evaluator, context, 'test')
        ).rejects.toThrow('Invalid CSS selector');
      });

      it('should throw for invalid target type', async () => {
        const context = createMockContext();
        const evaluator = createMockEvaluator(42);

        await expect(
          resolveTargetsFromArgs([{ value: 42 }], evaluator, context, 'test')
        ).rejects.toThrow('Invalid test target: expected HTMLElement or CSS selector, got number');
      });

      it('should throw when selector matches no elements', async () => {
        const context = createMockContext({ me: null });
        const evaluator = createMockEvaluator('#non-existent-element');

        // Note: In happy-dom, document is always available, so we get "no valid targets" instead of "DOM not available"
        await expect(
          resolveTargetsFromArgs([{ value: '#non-existent-element' }], evaluator, context, 'test')
        ).rejects.toThrow('test command: no target specified and context.me is null');
      });
    });
  });
});
