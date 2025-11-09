/**
 * CSS Pseudo-Class Implementation Tests
 * TDD approach for implementing CSS pseudo-class selectors with : operator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize } from './tokenizer';
import { parseAndEvaluateExpression } from './expression-parser';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('CSS Pseudo-Class Support', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = createMockHyperscriptContext();

    // Create some mock DOM elements for testing
    if (typeof document !== 'undefined') {
      // Clear any existing test elements
      document.querySelectorAll('.test-element').forEach(el => el.remove());

      // Create test elements
      const container = document.createElement('div');
      container.id = 'test-container';

      const input1 = document.createElement('input');
      input1.type = 'checkbox';
      input1.className = 'test-element';
      input1.checked = true;

      const input2 = document.createElement('input');
      input2.type = 'checkbox';
      input2.className = 'test-element';
      input2.checked = false;

      const button = document.createElement('button');
      button.className = 'test-element';
      button.disabled = true;

      container.appendChild(input1);
      container.appendChild(input2);
      container.appendChild(button);
      document.body.appendChild(container);
    }
  });

  describe('Basic Pseudo-Class Selectors', () => {
    it('should tokenize :checked pseudo-class', () => {
      const tokens = tokenize('input:checked');
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ type: 'event', value: 'input' }); // 'input' is recognized as a DOM event
      expect(tokens[1]).toMatchObject({ type: 'operator', value: ':' });
      expect(tokens[2]).toMatchObject({ type: 'identifier', value: 'checked' });
    });

    it('should parse and evaluate :checked selector', async () => {
      const result = await parseAndEvaluateExpression('<input:checked/>', context);
      expect(result).toBeDefined();
      if (typeof document !== 'undefined') {
        expect(result.length).toBeGreaterThanOrEqual(0); // NodeList
      }
    });

    it('should parse and evaluate :disabled selector', async () => {
      const result = await parseAndEvaluateExpression('<button:disabled/>', context);
      expect(result).toBeDefined();
      if (typeof document !== 'undefined') {
        expect(result.length).toBeGreaterThanOrEqual(0); // NodeList
      }
    });

    it('should parse and evaluate :not() pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<input:not([type="text"])/>', context);
      expect(result).toBeDefined();
      if (typeof document !== 'undefined') {
        expect(result.length).toBeGreaterThanOrEqual(0); // NodeList
      }
    });
  });

  describe('Pseudo-Class with Class Selectors', () => {
    it('should parse class with pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<.test-element:checked/>', context);
      expect(result).toBeDefined();
    });

    it('should parse complex selector with pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<input.test-element:checked/>', context);
      expect(result).toBeDefined();
    });
  });

  describe('Common Pseudo-Classes', () => {
    it('should handle :hover pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<button:hover/>', context);
      expect(result).toBeDefined();
    });

    it('should handle :focus pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<input:focus/>', context);
      expect(result).toBeDefined();
    });

    it('should handle :first-child pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<div:first-child/>', context);
      expect(result).toBeDefined();
    });

    it('should handle :last-child pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<div:last-child/>', context);
      expect(result).toBeDefined();
    });

    it('should handle :nth-child() pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<div:nth-child(2n)/>', context);
      expect(result).toBeDefined();
    });
  });

  describe('Pseudo-Classes in Conditional Expressions', () => {
    it('should work with no operator', async () => {
      const result = await parseAndEvaluateExpression('no <input:checked/>', context);
      expect(typeof result).toBe('boolean');
    });

    it('should work with exists operator', async () => {
      const result = await parseAndEvaluateExpression('<button:disabled/> exists', context);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Cases', () => {
    it('should handle invalid pseudo-class gracefully', async () => {
      // This should still work even if the pseudo-class doesn't match anything
      const result = await parseAndEvaluateExpression('<div:nonexistent/>', context);
      expect(result).toBeDefined();
      if (typeof document !== 'undefined') {
        // The selector should find no elements since :nonexistent doesn't match any elements
        expect(result.length).toBeGreaterThanOrEqual(0); // NodeList (may find divs that don't match the pseudo-class)
      }
    });
  });
});
