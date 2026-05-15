/**
 * Test for CSS selectors with special characters (dashes, colons)
 *
 * From official test suite failures:
 * ❌ classRef.js - dashed class ref works: Expected "div", got []
 * ❌ classRef.js - colon class ref works: Unexpected token: :
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateExpressionFromSource } from '../parser/runtime';
import type { ExecutionContext } from '../types/core';

describe('CSS Selectors with Special Characters', () => {
  let context: ExecutionContext;
  let dashedDiv: HTMLElement;
  let colonDiv: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';

    // Create element with dashed class name
    dashedDiv = document.createElement('div');
    dashedDiv.className = 'my-class';
    dashedDiv.textContent = 'Dashed';
    document.body.appendChild(dashedDiv);

    // Create element with colon class name (used in some CSS frameworks)
    colonDiv = document.createElement('div');
    colonDiv.className = 'foo:bar';
    colonDiv.textContent = 'Colon';
    document.body.appendChild(colonDiv);

    context = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
    };
  });

  describe('Dashed Class Names', () => {
    it('should recognize .my-class as a class selector', async () => {
      const result = await evaluateExpressionFromSource('.my-class', context);

      expect(result).toBeDefined();
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(dashedDiv);
    });

    it('should work with query ref <.my-class/>', async () => {
      const result = await evaluateExpressionFromSource('<.my-class/>', context);

      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(dashedDiv);
    });
  });

  describe('Colon Class Names', () => {
    it('should recognize .foo:bar as a class selector', async () => {
      const result = await evaluateExpressionFromSource('.foo:bar', context);

      expect(result).toBeDefined();
      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(colonDiv);
    });

    it('should work with query ref <.foo:bar/>', async () => {
      const result = await evaluateExpressionFromSource('<.foo:bar/>', context);

      const arrayResult = Array.from(result);
      expect(arrayResult).toHaveLength(1);
      expect(arrayResult[0]).toBe(colonDiv);
    });
  });

  describe('Multiple Special Characters', () => {
    it('should handle class with multiple dashes', async () => {
      const multiDash = document.createElement('div');
      multiDash.className = 'my-special-class-name';
      document.body.appendChild(multiDash);

      const result = await evaluateExpressionFromSource('.my-special-class-name', context);
      const arrayResult = Array.from(result);
      expect(arrayResult).toContain(multiDash);
    });

    it('should handle BEM-style classes (block__element--modifier)', async () => {
      const bemDiv = document.createElement('div');
      bemDiv.className = 'block__element--modifier';
      document.body.appendChild(bemDiv);

      const result = await evaluateExpressionFromSource('.block__element--modifier', context);
      const arrayResult = Array.from(result);
      expect(arrayResult).toContain(bemDiv);
    });
  });
});
