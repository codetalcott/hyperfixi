/**
 * Tests for reference expressions
 * Covering me, you, it, CSS selectors, and element references
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../../test-setup';
import { referenceExpressions } from './index';
import type { ExecutionContext } from '../../types/core';

describe('Reference Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;
  let targetElement: HTMLElement;

  beforeEach(() => {
    // Create test DOM structure
    document.body.innerHTML = `
      <div id="container" class="test-container">
        <div id="source" class="source-element">Source</div>
        <div id="target" class="target-element">Target</div>
        <div class="shared-class">Item 1</div>
        <div class="shared-class">Item 2</div>
      </div>
    `;

    testElement = document.getElementById('source')!;
    targetElement = document.getElementById('target')!;

    // Create execution context
    context = createMockHyperscriptContext();
    context.me = testElement;
    context.you = targetElement;
    context.it = 'test-value';
    context.result = 'test-result';
  });

  describe('Core Reference Variables', () => {
    describe('me expression', () => {
      it('should return the current element', async () => {
        const result = await referenceExpressions.me.evaluate(context);
        expect(result).toBe(testElement);
      });

      it('should return null when no current element', async () => {
        context.me = null;
        const result = await referenceExpressions.me.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate without arguments', () => {
        const error = referenceExpressions.me.validate!([]);
        expect(error).toBeNull();
      });
    });

    describe('you expression', () => {
      it('should return the target element', async () => {
        const result = await referenceExpressions.you.evaluate(context);
        expect(result).toBe(targetElement);
      });

      it('should return null when no target element', async () => {
        context.you = null;
        const result = await referenceExpressions.you.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate without arguments', () => {
        const error = referenceExpressions.you.validate!([]);
        expect(error).toBeNull();
      });
    });

    describe('it expression', () => {
      it('should return the current result value', async () => {
        const result = await referenceExpressions.it.evaluate(context);
        expect(result).toBe('test-value');
      });

      it('should handle different data types', async () => {
        context.it = { key: 'value' };
        const result = await referenceExpressions.it.evaluate(context);
        expect(result).toEqual({ key: 'value' });
      });

      it('should return undefined when not set', async () => {
        context.it = undefined;
        const result = await referenceExpressions.it.evaluate(context);
        expect(result).toBeUndefined();
      });

      it('should validate without arguments', () => {
        const error = referenceExpressions.it.validate!([]);
        expect(error).toBeNull();
      });
    });

    describe('result expression', () => {
      it('should return the result value', async () => {
        const result = await referenceExpressions.result.evaluate(context);
        expect(result).toBe('test-result');
      });

      it('should validate without arguments', () => {
        const error = referenceExpressions.result.validate!([]);
        expect(error).toBeNull();
      });
    });
  });

  describe('CSS Selector Expressions', () => {
    describe('querySelector expression', () => {
      it('should find element by ID selector', async () => {
        const result = await referenceExpressions.querySelector.evaluate(context, '#target');
        expect(result).toBe(targetElement);
        expect(result?.id).toBe('target');
      });

      it('should find element by class selector', async () => {
        const result = await referenceExpressions.querySelector.evaluate(
          context,
          '.target-element'
        );
        expect(result).toBe(targetElement);
      });

      it('should return null for non-existent selector', async () => {
        const result = await referenceExpressions.querySelector.evaluate(context, '#nonexistent');
        expect(result).toBeNull();
      });

      it('should search from document regardless of context.me', async () => {
        context.me = document.getElementById('container')!;
        const result = await referenceExpressions.querySelector.evaluate(context, '#target');
        expect(result).toBe(targetElement);
      });

      it('should search from document when context.me is null', async () => {
        context.me = null;
        const result = await referenceExpressions.querySelector.evaluate(context, '#target');
        expect(result).toBe(targetElement);
      });

      it('should validate selector argument', () => {
        expect(referenceExpressions.querySelector.validate!(['#test'])).toBeNull();
        expect(referenceExpressions.querySelector.validate!([])).toContain('exactly one argument');
        expect(referenceExpressions.querySelector.validate!(['#test', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.querySelector.validate!([123])).toContain('must be a string');
      });

      it('should throw error for non-string selector', async () => {
        await expect(
          referenceExpressions.querySelector.evaluate(context, 123 as any)
        ).rejects.toThrow('querySelector requires a string selector');
      });
    });

    describe('querySelectorAll expression', () => {
      it('should find all elements by class selector', async () => {
        const result = await referenceExpressions.querySelectorAll.evaluate(
          context,
          '.shared-class'
        );
        expect(result).toHaveLength(2);
        expect(result[0].textContent).toBe('Item 1');
        expect(result[1].textContent).toBe('Item 2');
      });

      it('should return empty array for non-existent selector', async () => {
        const result = await referenceExpressions.querySelectorAll.evaluate(
          context,
          '.nonexistent'
        );
        expect(result).toEqual([]);
      });

      it('should search from document and find all matching elements', async () => {
        const result = await referenceExpressions.querySelectorAll.evaluate(context, 'div');
        expect(result.length).toBeGreaterThan(0);
        // Should find at least the container and nested divs
        expect(result.some(el => el.id === 'container')).toBe(true);
      });

      it('should validate selector argument', () => {
        expect(referenceExpressions.querySelectorAll.validate!(['.test'])).toBeNull();
        expect(referenceExpressions.querySelectorAll.validate!([])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.querySelectorAll.validate!(['.test', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.querySelectorAll.validate!([123])).toContain(
          'must be a string'
        );
      });

      it('should throw error for non-string selector', async () => {
        await expect(
          referenceExpressions.querySelectorAll.evaluate(context, 123 as any)
        ).rejects.toThrow('querySelectorAll requires a string selector');
      });
    });
  });

  describe('ID and Class Reference Expressions', () => {
    describe('getElementById expression', () => {
      it('should find element by ID', async () => {
        const result = await referenceExpressions.getElementById.evaluate(context, 'target');
        expect(result).toBe(targetElement);
        expect(result?.id).toBe('target');
      });

      it('should return null for non-existent ID', async () => {
        const result = await referenceExpressions.getElementById.evaluate(context, 'nonexistent');
        expect(result).toBeNull();
      });

      it('should validate ID argument', () => {
        expect(referenceExpressions.getElementById.validate!(['test'])).toBeNull();
        expect(referenceExpressions.getElementById.validate!([])).toContain('exactly one argument');
        expect(referenceExpressions.getElementById.validate!(['test', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.getElementById.validate!([123])).toContain('must be a string');
      });

      it('should throw error for non-string ID', async () => {
        await expect(
          referenceExpressions.getElementById.evaluate(context, 123 as any)
        ).rejects.toThrow('getElementById requires a string ID');
      });
    });

    describe('getElementsByClassName expression', () => {
      it('should find elements by class name', async () => {
        const result = await referenceExpressions.getElementsByClassName.evaluate(
          context,
          'shared-class'
        );
        expect(result).toHaveLength(2);
        expect(result[0].textContent).toBe('Item 1');
        expect(result[1].textContent).toBe('Item 2');
      });

      it('should return empty array for non-existent class', async () => {
        const result = await referenceExpressions.getElementsByClassName.evaluate(
          context,
          'nonexistent'
        );
        expect(result).toEqual([]);
      });

      it('should search from document and find all elements with class', async () => {
        const result = await referenceExpressions.getElementsByClassName.evaluate(
          context,
          'shared-class'
        );
        expect(result).toHaveLength(2);
        expect(result[0].textContent).toBe('Item 1');
        expect(result[1].textContent).toBe('Item 2');
      });

      it('should validate className argument', () => {
        expect(referenceExpressions.getElementsByClassName.validate!(['test'])).toBeNull();
        expect(referenceExpressions.getElementsByClassName.validate!([])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.getElementsByClassName.validate!(['test', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.getElementsByClassName.validate!([123])).toContain(
          'must be a string'
        );
      });

      it('should throw error for non-string className', async () => {
        await expect(
          referenceExpressions.getElementsByClassName.evaluate(context, 123 as any)
        ).rejects.toThrow('getElementsByClassName requires a string class name');
      });
    });
  });

  describe('Traversal Expressions', () => {
    describe('closest expression', () => {
      it('should find closest matching ancestor', async () => {
        context.me = testElement;
        const result = await referenceExpressions.closest.evaluate(context, '#container');
        expect(result?.id).toBe('container');
      });

      it('should return null when no matching ancestor', async () => {
        context.me = testElement;
        const result = await referenceExpressions.closest.evaluate(context, '.nonexistent');
        expect(result).toBeNull();
      });

      it('should return null when context.me is null', async () => {
        context.me = null;
        const result = await referenceExpressions.closest.evaluate(context, '#container');
        expect(result).toBeNull();
      });

      it('should validate selector argument', () => {
        expect(referenceExpressions.closest.validate!(['#test'])).toBeNull();
        expect(referenceExpressions.closest.validate!([])).toContain('exactly one argument');
        expect(referenceExpressions.closest.validate!(['#test', 'extra'])).toContain(
          'exactly one argument'
        );
        expect(referenceExpressions.closest.validate!([123])).toContain('must be a string');
      });

      it('should throw error for non-string selector', async () => {
        await expect(referenceExpressions.closest.evaluate(context, 123 as any)).rejects.toThrow(
          'closest requires a string selector'
        );
      });
    });

    describe('parent expression', () => {
      it('should return parent element', async () => {
        context.me = testElement;
        const result = await referenceExpressions.parent.evaluate(context);
        expect(result?.id).toBe('container');
      });

      it('should return null when no parent', async () => {
        // Test with document.documentElement which has no parent element
        context.me = document.documentElement;
        const result = await referenceExpressions.parent.evaluate(context);
        expect(result).toBeNull();
      });

      it('should return null when context.me is null', async () => {
        context.me = null;
        const result = await referenceExpressions.parent.evaluate(context);
        expect(result).toBeNull();
      });

      it('should validate without arguments', () => {
        expect(referenceExpressions.parent.validate!()).toBeNull();
      });
    });
  });

  describe('StyleRef Expressions', () => {
    beforeEach(() => {
      // Create a test element with inline styles
      testElement.style.color = 'red';
      testElement.style.textAlign = 'center';
      testElement.style.width = '10px';
      // height is not set, so it should be empty string for inline style
    });

    describe('basic styleRef expression', () => {
      it('should get inline style properties', async () => {
        const colorResult = await referenceExpressions.styleRef.evaluate(context, 'color');
        expect(colorResult).toBe('red');

        const textAlignResult = await referenceExpressions.styleRef.evaluate(context, 'text-align');
        expect(textAlignResult).toBe('center');

        const widthResult = await referenceExpressions.styleRef.evaluate(context, 'width');
        expect(widthResult).toBe('10px');
      });

      it('should return undefined for unset inline properties', async () => {
        const heightResult = await referenceExpressions.styleRef.evaluate(context, 'height');
        expect(heightResult).toBeUndefined();

        const badPropResult = await referenceExpressions.styleRef.evaluate(context, 'bad-prop');
        expect(badPropResult).toBeUndefined();
      });

      it('should get computed style properties with computed- prefix', async () => {
        const computedColorResult = await referenceExpressions.styleRef.evaluate(
          context,
          'computed-color'
        );
        expect(computedColorResult).toBe('red'); // Happy-DOM returns inline value as is

        const computedTextAlignResult = await referenceExpressions.styleRef.evaluate(
          context,
          'computed-text-align'
        );
        expect(computedTextAlignResult).toBe('center');

        const computedWidthResult = await referenceExpressions.styleRef.evaluate(
          context,
          'computed-width'
        );
        expect(computedWidthResult).toBe('10px');
      });

      it('should return empty string for unset computed properties', async () => {
        const computedHeightResult = await referenceExpressions.styleRef.evaluate(
          context,
          'computed-height'
        );
        expect(computedHeightResult).toBe(''); // Happy-DOM returns empty for unset properties

        const computedBadPropResult = await referenceExpressions.styleRef.evaluate(
          context,
          'computed-bad-prop'
        );
        expect(computedBadPropResult).toBe('');
      });

      it('should work with explicit element parameter', async () => {
        const explicitResult = await referenceExpressions.styleRef.evaluate(
          context,
          'color',
          testElement
        );
        expect(explicitResult).toBe('red');
      });

      it('should return undefined when no target element', async () => {
        context.me = null;
        const result = await referenceExpressions.styleRef.evaluate(context, 'color');
        expect(result).toBeUndefined();
      });

      it('should validate arguments correctly', () => {
        expect(referenceExpressions.styleRef.validate!(['color'])).toBeNull();
        expect(referenceExpressions.styleRef.validate!(['color', testElement])).toBeNull();
        expect(referenceExpressions.styleRef.validate!([])).toContain('requires 1-2 arguments');
        expect(referenceExpressions.styleRef.validate!(['color', testElement, 'extra'])).toContain(
          'requires 1-2 arguments'
        );
        expect(referenceExpressions.styleRef.validate!([123])).toContain('must be a string');
        expect(referenceExpressions.styleRef.validate!(['color', 'not-element'])).toContain(
          'must be an HTMLElement'
        );
      });

      it('should throw error for non-string property', async () => {
        await expect(referenceExpressions.styleRef.evaluate(context, 123 as any)).rejects.toThrow(
          'StyleRef requires a string property name'
        );
      });
    });

    describe('possessive styleRef expression', () => {
      it('should get style properties with possessive syntax', async () => {
        const myColorResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'color'
        );
        expect(myColorResult).toBe('red');

        const myTextAlignResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'text-align'
        );
        expect(myTextAlignResult).toBe('center');

        const myWidthResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'width'
        );
        expect(myWidthResult).toBe('10px');
      });

      it('should work with its possessor using result context', async () => {
        context.result = testElement;
        const itsHeightResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'its',
          'height'
        );
        expect(itsHeightResult).toBeUndefined();

        const itsBadPropResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'its',
          'bad-prop'
        );
        expect(itsBadPropResult).toBeUndefined();
      });

      it('should get computed style properties with possessive syntax', async () => {
        const myComputedColorResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'computed-color'
        );
        expect(myComputedColorResult).toBe('red'); // Happy-DOM returns inline value as is

        const myComputedTextAlignResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'computed-text-align'
        );
        expect(myComputedTextAlignResult).toBe('center');

        const myComputedWidthResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'my',
          'computed-width'
        );
        expect(myComputedWidthResult).toBe('10px');
      });

      it('should handle computed style for its possessor', async () => {
        context.result = testElement;
        const itsComputedHeightResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'its',
          'computed-height'
        );
        expect(itsComputedHeightResult).toBe(''); // Happy-DOM returns empty for unset properties

        const itsComputedBadPropResult = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'its',
          'computed-bad-prop'
        );
        expect(itsComputedBadPropResult).toBe('');
      });

      it('should return undefined for invalid possessor', async () => {
        const result = await referenceExpressions.possessiveStyleRef.evaluate(
          context,
          'invalid',
          'color'
        );
        expect(result).toBeUndefined();
      });

      it('should validate arguments correctly', () => {
        expect(referenceExpressions.possessiveStyleRef.validate!(['my', 'color'])).toBeNull();
        expect(
          referenceExpressions.possessiveStyleRef.validate!(['its', 'computed-width'])
        ).toBeNull();
        expect(referenceExpressions.possessiveStyleRef.validate!([])).toContain(
          'requires exactly 2 arguments'
        );
        expect(referenceExpressions.possessiveStyleRef.validate!(['my'])).toContain(
          'requires exactly 2 arguments'
        );
        expect(
          referenceExpressions.possessiveStyleRef.validate!(['my', 'color', 'extra'])
        ).toContain('requires exactly 2 arguments');
        expect(referenceExpressions.possessiveStyleRef.validate!([123, 'color'])).toContain(
          'possessor must be a string'
        );
        expect(referenceExpressions.possessiveStyleRef.validate!(['my', 123])).toContain(
          'property must be a string'
        );
      });

      it('should throw error for non-string arguments', async () => {
        await expect(
          referenceExpressions.possessiveStyleRef.evaluate(context, 123 as any, 'color')
        ).rejects.toThrow('Possessive styleRef requires possessor and property strings');
        await expect(
          referenceExpressions.possessiveStyleRef.evaluate(context, 'my', 123 as any)
        ).rejects.toThrow('Possessive styleRef requires possessor and property strings');
      });
    });

    describe('of styleRef expression', () => {
      it('should get style properties with of syntax', async () => {
        const colorOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'color',
          'me'
        );
        expect(colorOfMeResult).toBe('red');

        const textAlignOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'text-align',
          'me'
        );
        expect(textAlignOfMeResult).toBe('center');

        const widthOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'width',
          'me'
        );
        expect(widthOfMeResult).toBe('10px');
      });

      it('should work with it reference using result context', async () => {
        context.result = testElement;
        const heightOfItResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'height',
          'it'
        );
        expect(heightOfItResult).toBeUndefined();

        const badPropOfItResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'bad-prop',
          'it'
        );
        expect(badPropOfItResult).toBeUndefined();
      });

      it('should get computed style properties with of syntax', async () => {
        const computedColorOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'computed-color',
          'me'
        );
        expect(computedColorOfMeResult).toBe('red'); // Happy-DOM returns inline value as is

        const computedTextAlignOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'computed-text-align',
          'me'
        );
        expect(computedTextAlignOfMeResult).toBe('center');

        const computedWidthOfMeResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'computed-width',
          'me'
        );
        expect(computedWidthOfMeResult).toBe('10px');
      });

      it('should handle computed style for it reference', async () => {
        context.result = testElement;
        const computedHeightOfItResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'computed-height',
          'it'
        );
        expect(computedHeightOfItResult).toBe(''); // Happy-DOM returns empty for unset properties

        const computedBadPropOfItResult = await referenceExpressions.ofStyleRef.evaluate(
          context,
          'computed-bad-prop',
          'it'
        );
        expect(computedBadPropOfItResult).toBe('');
      });

      it('should return undefined for invalid reference', async () => {
        const result = await referenceExpressions.ofStyleRef.evaluate(context, 'color', 'invalid');
        expect(result).toBeUndefined();
      });

      it('should validate arguments correctly', () => {
        expect(referenceExpressions.ofStyleRef.validate!(['color', 'me'])).toBeNull();
        expect(referenceExpressions.ofStyleRef.validate!(['computed-width', 'it'])).toBeNull();
        expect(referenceExpressions.ofStyleRef.validate!([])).toContain(
          'requires exactly 2 arguments'
        );
        expect(referenceExpressions.ofStyleRef.validate!(['color'])).toContain(
          'requires exactly 2 arguments'
        );
        expect(referenceExpressions.ofStyleRef.validate!(['color', 'me', 'extra'])).toContain(
          'requires exactly 2 arguments'
        );
        expect(referenceExpressions.ofStyleRef.validate!([123, 'me'])).toContain(
          'property must be a string'
        );
        expect(referenceExpressions.ofStyleRef.validate!(['color', 123])).toContain(
          'reference must be a string'
        );
      });

      it('should throw error for non-string arguments', async () => {
        await expect(
          referenceExpressions.ofStyleRef.evaluate(context, 123 as any, 'me')
        ).rejects.toThrow('Of styleRef requires property and reference strings');
        await expect(
          referenceExpressions.ofStyleRef.evaluate(context, 'color', 123 as any)
        ).rejects.toThrow('Of styleRef requires property and reference strings');
      });
    });
  });

  describe('Expression Metadata', () => {
    it('should have correct categories', () => {
      Object.values(referenceExpressions).forEach(expr => {
        expect(expr.category).toBe('Reference');
      });
    });

    it('should have correct evaluation types', () => {
      expect(referenceExpressions.me.evaluatesTo).toBe('Element');
      expect(referenceExpressions.you.evaluatesTo).toBe('Element');
      expect(referenceExpressions.it.evaluatesTo).toBe('Any');
      expect(referenceExpressions.result.evaluatesTo).toBe('Any');
      expect(referenceExpressions.querySelector.evaluatesTo).toBe('Element');
      expect(referenceExpressions.querySelectorAll.evaluatesTo).toBe('Array');
      expect(referenceExpressions.getElementById.evaluatesTo).toBe('Element');
      expect(referenceExpressions.getElementsByClassName.evaluatesTo).toBe('Array');
      expect(referenceExpressions.closest.evaluatesTo).toBe('Element');
      expect(referenceExpressions.parent.evaluatesTo).toBe('Element');
      expect(referenceExpressions.styleRef.evaluatesTo).toBe('String');
      expect(referenceExpressions.possessiveStyleRef.evaluatesTo).toBe('String');
      expect(referenceExpressions.ofStyleRef.evaluatesTo).toBe('String');
    });
  });
});
