/**
 * Tests for positional expressions
 * Covering first, last, next, previous, and numeric position expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../../test-setup';
import {
  positionalExpressions,
  findNextElementInDOM,
  findPreviousElementInDOM,
  getElementPosition,
} from './index';
import type { ExecutionContext } from '../../types/core';

describe('Positional Expressions', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();
  });

  describe('Array/Collection Positional Expressions', () => {
    describe('first expression', () => {
      it('should get first element from array', async () => {
        const array = [1, 2, 3, 4, 5];
        const result = await positionalExpressions.first.evaluate(context, array);
        expect(result).toBe(1);
      });

      it('should get first element from context.it when no argument provided', async () => {
        context.it = ['a', 'b', 'c'];
        const result = await positionalExpressions.first.evaluate(context);
        expect(result).toBe('a');
      });

      it('should handle empty arrays', async () => {
        const result = await positionalExpressions.first.evaluate(context, []);
        expect(result).toBeNull();
      });

      it('should handle NodeList', async () => {
        document.body.innerHTML = '<div><span>1</span><span>2</span><span>3</span></div>';
        const nodeList = document.querySelectorAll('span');
        const result = await positionalExpressions.first.evaluate(context, nodeList);
        expect(result.textContent).toBe('1');
      });

      it('should handle DOM element children', async () => {
        const container = createTestElement('<div><span>First</span><span>Second</span></div>');
        const result = await positionalExpressions.first.evaluate(context, container);
        expect(result.textContent).toBe('First');
      });

      it('should handle strings', async () => {
        const result = await positionalExpressions.first.evaluate(context, 'hello');
        expect(result).toBe('h');
      });

      it('should handle null/undefined', async () => {
        expect(await positionalExpressions.first.evaluate(context, null)).toBeNull();
        expect(await positionalExpressions.first.evaluate(context, undefined)).toBeNull();
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.first.validate!([])).toBeNull();
        expect(positionalExpressions.first.validate!([1])).toBeNull();
        expect(positionalExpressions.first.validate!([1, 2])).toContain('at most one argument');
      });
    });

    describe('last expression', () => {
      it('should get last element from array', async () => {
        const array = [1, 2, 3, 4, 5];
        const result = await positionalExpressions.last.evaluate(context, array);
        expect(result).toBe(5);
      });

      it('should get last element from context.it when no argument provided', async () => {
        context.it = ['a', 'b', 'c'];
        const result = await positionalExpressions.last.evaluate(context);
        expect(result).toBe('c');
      });

      it('should handle empty arrays', async () => {
        const result = await positionalExpressions.last.evaluate(context, []);
        expect(result).toBeNull();
      });

      it('should handle NodeList', async () => {
        document.body.innerHTML = '<div><span>1</span><span>2</span><span>3</span></div>';
        const nodeList = document.querySelectorAll('span');
        const result = await positionalExpressions.last.evaluate(context, nodeList);
        expect(result.textContent).toBe('3');
      });

      it('should handle DOM element children', async () => {
        const container = createTestElement('<div><span>First</span><span>Last</span></div>');
        const result = await positionalExpressions.last.evaluate(context, container);
        expect(result.textContent).toBe('Last');
      });

      it('should handle strings', async () => {
        const result = await positionalExpressions.last.evaluate(context, 'hello');
        expect(result).toBe('o');
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.last.validate!([])).toBeNull();
        expect(positionalExpressions.last.validate!([1])).toBeNull();
        expect(positionalExpressions.last.validate!([1, 2])).toContain('at most one argument');
      });
    });

    describe('at expression', () => {
      it('should get element at specific index', async () => {
        const array = ['a', 'b', 'c', 'd'];
        expect(await positionalExpressions.at.evaluate(context, 0, array)).toBe('a');
        expect(await positionalExpressions.at.evaluate(context, 1, array)).toBe('b');
        expect(await positionalExpressions.at.evaluate(context, 3, array)).toBe('d');
      });

      it('should handle negative indices', async () => {
        const array = ['a', 'b', 'c', 'd'];
        expect(await positionalExpressions.at.evaluate(context, -1, array)).toBe('d');
        expect(await positionalExpressions.at.evaluate(context, -2, array)).toBe('c');
        expect(await positionalExpressions.at.evaluate(context, -4, array)).toBe('a');
      });

      it('should use context.it when no collection provided', async () => {
        context.it = [10, 20, 30];
        const result = await positionalExpressions.at.evaluate(context, 1);
        expect(result).toBe(20);
      });

      it('should handle out-of-bounds indices', async () => {
        const array = ['a', 'b', 'c'];
        expect(await positionalExpressions.at.evaluate(context, 5, array)).toBeNull();
        expect(await positionalExpressions.at.evaluate(context, -5, array)).toBeNull();
      });

      it('should handle NodeList', async () => {
        document.body.innerHTML = '<div><span>0</span><span>1</span><span>2</span></div>';
        const nodeList = document.querySelectorAll('span');
        const result = await positionalExpressions.at.evaluate(context, 1, nodeList);
        expect(result.textContent).toBe('1');
      });

      it('should handle DOM element children', async () => {
        const container = createTestElement(
          '<div><span>0</span><span>1</span><span>2</span></div>'
        );
        const result = await positionalExpressions.at.evaluate(context, 2, container);
        expect(result.textContent).toBe('2');
      });

      it('should handle strings', async () => {
        expect(await positionalExpressions.at.evaluate(context, 0, 'hello')).toBe('h');
        expect(await positionalExpressions.at.evaluate(context, 4, 'hello')).toBe('o');
        expect(await positionalExpressions.at.evaluate(context, -1, 'hello')).toBe('o');
      });

      it('should throw error for non-number index', async () => {
        await expect(
          positionalExpressions.at.evaluate(context, 'invalid' as any, [])
        ).rejects.toThrow('Index must be a number');
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.at.validate!([0])).toBeNull();
        expect(positionalExpressions.at.validate!([0, []])).toBeNull();
        expect(positionalExpressions.at.validate!([])).toContain('1-2 arguments');
        expect(positionalExpressions.at.validate!([0, [], 'extra'])).toContain('1-2 arguments');
        expect(positionalExpressions.at.validate!(['invalid'])).toContain('must be a number');
      });
    });
  });

  describe('DOM Relative Positional Expressions', () => {
    beforeEach(() => {
      // Create a test DOM structure
      document.body.innerHTML = `
        <div id="container">
          <div class="item" id="item1">Item 1</div>
          <div class="item" id="item2">Item 2</div>
          <div class="item" id="item3">Item 3</div>
          <span class="other" id="other1">Other 1</span>
          <div class="item" id="item4">Item 4</div>
        </div>
      `;
    });

    describe('next expression', () => {
      it('should get next sibling element when no selector', async () => {
        const item1 = document.getElementById('item1')!;
        context.me = item1;

        const result = await positionalExpressions.next.evaluate(context);
        expect(result.id).toBe('item2');
      });

      it('should find next element with selector', async () => {
        const item2 = document.getElementById('item2')!;
        context.me = item2;

        const result = await positionalExpressions.next.evaluate(context, '.item');
        expect(result.id).toBe('item3');
      });

      it('should handle explicit fromElement', async () => {
        const item1 = document.getElementById('item1')!;
        const item2 = document.getElementById('item2')!;

        const result = await positionalExpressions.next.evaluate(context, undefined, item1);
        expect(result.id).toBe('item2');
      });

      it('should return null when no next element', async () => {
        const item4 = document.getElementById('item4')!;
        context.me = item4;

        const result = await positionalExpressions.next.evaluate(context);
        expect(result).toBeNull();
      });

      it('should return null when context.me is null', async () => {
        context.me = null;
        const result = await positionalExpressions.next.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.next.validate!([])).toBeNull();
        expect(positionalExpressions.next.validate!(['selector'])).toBeNull();
        expect(positionalExpressions.next.validate!(['selector', document.body])).toBeNull();
        expect(
          positionalExpressions.next.validate!(['selector', document.body, 'extra'])
        ).toContain('at most 2 arguments');
        expect(positionalExpressions.next.validate!([123])).toContain('must be a string');
        expect(positionalExpressions.next.validate!(['selector', 'not-element'])).toContain(
          'must be an Element'
        );
      });
    });

    describe('previous expression', () => {
      it('should get previous sibling element when no selector', async () => {
        const item2 = document.getElementById('item2')!;
        context.me = item2;

        const result = await positionalExpressions.previous.evaluate(context);
        expect(result.id).toBe('item1');
      });

      it('should find previous element with selector', async () => {
        const item3 = document.getElementById('item3')!;
        context.me = item3;

        const result = await positionalExpressions.previous.evaluate(context, '.item');
        expect(result.id).toBe('item2');
      });

      it('should handle explicit fromElement', async () => {
        const item3 = document.getElementById('item3')!;

        const result = await positionalExpressions.previous.evaluate(context, undefined, item3);
        expect(result.id).toBe('item2');
      });

      it('should return null when no previous element', async () => {
        const item1 = document.getElementById('item1')!;
        context.me = item1;

        const result = await positionalExpressions.previous.evaluate(context);
        expect(result).toBeNull();
      });

      it('should return null when context.me is null', async () => {
        context.me = null;
        const result = await positionalExpressions.previous.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.previous.validate!([])).toBeNull();
        expect(positionalExpressions.previous.validate!(['selector'])).toBeNull();
        expect(positionalExpressions.previous.validate!(['selector', document.body])).toBeNull();
        expect(
          positionalExpressions.previous.validate!(['selector', document.body, 'extra'])
        ).toContain('at most 2 arguments');
        expect(positionalExpressions.previous.validate!([123])).toContain('must be a string');
        expect(positionalExpressions.previous.validate!(['selector', 'not-element'])).toContain(
          'must be an Element'
        );
      });
    });

    describe('nextWithin expression', () => {
      it('should find next element within container', async () => {
        const item2 = document.getElementById('item2')!;
        context.me = item2;

        const result = await positionalExpressions.nextWithin.evaluate(
          context,
          '.item',
          '#container'
        );
        expect(result.id).toBe('item3');
      });

      it('should respect container boundaries', async () => {
        // Create nested structure
        document.body.innerHTML = `
          <div id="outer">
            <div id="inner">
              <div class="target" id="target1">Target 1</div>
            </div>
            <div class="target" id="target2">Target 2</div>
          </div>
        `;

        const target1 = document.getElementById('target1')!;
        context.me = target1;

        // Should not find target2 because it's outside the inner container
        const result = await positionalExpressions.nextWithin.evaluate(
          context,
          '.target',
          '#inner'
        );
        expect(result).toBeNull();
      });

      it('should return null when no container found', async () => {
        const item1 = document.getElementById('item1')!;
        context.me = item1;

        const result = await positionalExpressions.nextWithin.evaluate(
          context,
          '.item',
          '.nonexistent'
        );
        expect(result).toBeNull();
      });

      it('should validate arguments', () => {
        expect(positionalExpressions.nextWithin.validate!(['selector', 'container'])).toBeNull();
        expect(
          positionalExpressions.nextWithin.validate!(['selector', 'container', document.body])
        ).toBeNull();
        expect(positionalExpressions.nextWithin.validate!(['selector'])).toContain('2-3 arguments');
        expect(
          positionalExpressions.nextWithin.validate!([
            'selector',
            'container',
            document.body,
            'extra',
          ])
        ).toContain('2-3 arguments');
        expect(positionalExpressions.nextWithin.validate!([123, 'container'])).toContain(
          'selector must be a string'
        );
        expect(positionalExpressions.nextWithin.validate!(['selector', 123])).toContain(
          'withinSelector must be a string'
        );
        expect(
          positionalExpressions.nextWithin.validate!(['selector', 'container', 'not-element'])
        ).toContain('must be an Element');
      });
    });

    describe('previousWithin expression', () => {
      it('should find previous element within container', async () => {
        const item3 = document.getElementById('item3')!;
        context.me = item3;

        const result = await positionalExpressions.previousWithin.evaluate(
          context,
          '.item',
          '#container'
        );
        expect(result.id).toBe('item2');
      });

      it('should respect container boundaries', async () => {
        // Create nested structure
        document.body.innerHTML = `
          <div id="outer">
            <div class="target" id="target1">Target 1</div>
            <div id="inner">
              <div class="target" id="target2">Target 2</div>
            </div>
          </div>
        `;

        const target2 = document.getElementById('target2')!;
        context.me = target2;

        // Should not find target1 because it's outside the inner container
        const result = await positionalExpressions.previousWithin.evaluate(
          context,
          '.target',
          '#inner'
        );
        expect(result).toBeNull();
      });

      it('should return null when no container found', async () => {
        const item3 = document.getElementById('item3')!;
        context.me = item3;

        const result = await positionalExpressions.previousWithin.evaluate(
          context,
          '.item',
          '.nonexistent'
        );
        expect(result).toBeNull();
      });

      it('should validate arguments', () => {
        expect(
          positionalExpressions.previousWithin.validate!(['selector', 'container'])
        ).toBeNull();
        expect(
          positionalExpressions.previousWithin.validate!(['selector', 'container', document.body])
        ).toBeNull();
        expect(positionalExpressions.previousWithin.validate!(['selector'])).toContain(
          '2-3 arguments'
        );
        expect(
          positionalExpressions.previousWithin.validate!([
            'selector',
            'container',
            document.body,
            'extra',
          ])
        ).toContain('2-3 arguments');
        expect(positionalExpressions.previousWithin.validate!([123, 'container'])).toContain(
          'selector must be a string'
        );
        expect(positionalExpressions.previousWithin.validate!(['selector', 123])).toContain(
          'withinSelector must be a string'
        );
        expect(
          positionalExpressions.previousWithin.validate!(['selector', 'container', 'not-element'])
        ).toContain('must be an Element');
      });
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="container">
          <div class="item" id="item1">Item 1</div>
          <div class="item" id="item2">Item 2</div>
          <div class="other" id="other1">Other 1</div>
          <div class="item" id="item3">Item 3</div>
        </div>
      `;
    });

    describe('findNextElementInDOM', () => {
      it('should find next matching element', () => {
        const item1 = document.getElementById('item1')!;
        const result = findNextElementInDOM(item1, '.item');
        expect(result?.id).toBe('item2');
      });

      it('should return null when no next element found', () => {
        const item3 = document.getElementById('item3')!;
        const result = findNextElementInDOM(item3, '.item');
        expect(result).toBeNull();
      });
    });

    describe('findPreviousElementInDOM', () => {
      it('should find previous matching element', () => {
        const item3 = document.getElementById('item3')!;
        const result = findPreviousElementInDOM(item3, '.item');
        expect(result?.id).toBe('item2');
      });

      it('should return null when no previous element found', () => {
        const item1 = document.getElementById('item1')!;
        const result = findPreviousElementInDOM(item1, '.item');
        expect(result).toBeNull();
      });
    });

    describe('getElementPosition', () => {
      it('should return different positions for different elements', () => {
        const item1 = document.getElementById('item1')!;
        const item2 = document.getElementById('item2')!;

        const pos1 = getElementPosition(item1);
        const pos2 = getElementPosition(item2);

        expect(pos1).not.toBe(pos2);
        expect(typeof pos1).toBe('number');
        expect(typeof pos2).toBe('number');
      });
    });
  });

  describe('Expression Metadata', () => {
    it('should have correct categories', () => {
      Object.values(positionalExpressions).forEach(expr => {
        expect(expr.category).toBe('Reference');
      });
    });

    it('should have appropriate evaluation types', () => {
      expect(positionalExpressions.first.evaluatesTo).toBe('Any');
      expect(positionalExpressions.last.evaluatesTo).toBe('Any');
      expect(positionalExpressions.at.evaluatesTo).toBe('Any');
      expect(positionalExpressions.next.evaluatesTo).toBe('Element');
      expect(positionalExpressions.previous.evaluatesTo).toBe('Element');
      expect(positionalExpressions.nextWithin.evaluatesTo).toBe('Element');
      expect(positionalExpressions.previousWithin.evaluatesTo).toBe('Element');
    });

    it('should have correct operator definitions', () => {
      expect(positionalExpressions.first.operators).toContain('first');
      expect(positionalExpressions.last.operators).toContain('last');
      expect(positionalExpressions.at.operators).toContain('at');
      expect(positionalExpressions.next.operators).toContain('next');
      expect(positionalExpressions.previous.operators).toContain('previous');
      expect(positionalExpressions.previous.operators).toContain('prev');
    });
  });
});
