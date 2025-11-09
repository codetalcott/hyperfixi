/**
 * CSS Selector Enhancement Tests (TDD)
 * Test complex CSS selector patterns to ensure 100% compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseAndEvaluateExpression } from '../parser/expression-parser';
import type { ExecutionContext } from '../types/core';

describe('CSS Selector Enhancement (TDD)', () => {
  let context: ExecutionContext;
  let testContainer: HTMLElement;

  beforeEach(() => {
    // Create test DOM structure
    testContainer = document.createElement('div');
    testContainer.innerHTML = `
      <form id="test-form">
        <input type="text" name="username" class="form-control" data-testid="username-input">
        <input type="password" name="password" class="form-control" data-testid="password-input">
        <input type="text" name="email" class="form-control" disabled data-testid="email-input">
        <input type="submit" value="Submit" class="btn btn-primary">
        <button type="button" class="btn btn-secondary">Cancel</button>
      </form>
      <div class="container">
        <p class="text-primary">Primary text</p>
        <p class="text-secondary">Secondary text</p>
      </div>
    `;
    document.body.appendChild(testContainer);

    context = {
      me: testContainer,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      parent: null,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };
  });

  afterEach(() => {
    // Clean up
    if (testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });

  describe('Query Reference Expressions (<selector/>)', () => {
    it('should return NodeList for simple element selector', async () => {
      const result = await parseAndEvaluateExpression('<input/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(4); // All input elements
    });

    it('should return NodeList for attribute selector', async () => {
      const result = await parseAndEvaluateExpression('<[type="text"]/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(2); // Username and email inputs (not disabled email)
    });

    it('should return NodeList for complex CSS selector with :not()', async () => {
      const result = await parseAndEvaluateExpression(
        '<input[type="text"]:not([disabled])/>',
        context
      );
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1); // Text inputs that are not disabled (username only)
    });

    it('should return NodeList for class selector with pseudo-class', async () => {
      const result = await parseAndEvaluateExpression('<.form-control:not([disabled])/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(2); // Form controls that are not disabled
    });

    it('should return NodeList for descendant combinator', async () => {
      const result = await parseAndEvaluateExpression('<form input[type="text"]/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(2); // Text inputs inside form (username and email)
    });

    it('should return NodeList for multiple attribute selectors', async () => {
      const result = await parseAndEvaluateExpression(
        '<input[type="text"][name="username"]/>',
        context
      );
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1); // Username input specifically
    });

    it('should return empty NodeList for non-matching selector', async () => {
      const result = await parseAndEvaluateExpression('<div.nonexistent/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(0);
    });
  });

  describe('Bracket Attribute Selectors ([attr])', () => {
    it('should return NodeList for simple attribute existence', async () => {
      const result = await parseAndEvaluateExpression('[data-testid]', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(3); // Elements with data-testid
    });

    it('should return NodeList for attribute value match', async () => {
      const result = await parseAndEvaluateExpression('[data-testid="username-input"]', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1); // Username input
    });

    it('should return NodeList for attribute contains match', async () => {
      const result = await parseAndEvaluateExpression('[class*="form"]', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(3); // Elements with "form" in class
    });
  });

  describe('CSS Selector vs Query Reference Distinction', () => {
    it('should distinguish between #id (single element) and <#id/> (NodeList)', async () => {
      // Direct ID selector should return single element
      const singleResult = await parseAndEvaluateExpression('#test-form', context);
      expect(singleResult).toBeInstanceOf(HTMLElement);
      expect(singleResult.id).toBe('test-form');

      // Query reference should return NodeList
      const listResult = await parseAndEvaluateExpression('<#test-form/>', context);
      expect(listResult).toBeInstanceOf(NodeList);
      expect(listResult.length).toBe(1);
      expect(listResult[0].id).toBe('test-form');
    });

    it('should distinguish between .class (array) and <.class/> (NodeList)', async () => {
      // Direct class selector should return array
      const arrayResult = await parseAndEvaluateExpression('.form-control', context);
      expect(Array.isArray(arrayResult)).toBe(true);
      expect(arrayResult.length).toBe(3);

      // Query reference should return NodeList
      const listResult = await parseAndEvaluateExpression('<.form-control/>', context);
      expect(listResult).toBeInstanceOf(NodeList);
      expect(listResult.length).toBe(3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty query reference gracefully', async () => {
      // This should probably throw an error for invalid syntax
      await expect(parseAndEvaluateExpression('</>', context)).rejects.toThrow();
    });

    it('should handle invalid CSS selector gracefully', async () => {
      // Invalid CSS selector should return empty NodeList, not throw
      const result = await parseAndEvaluateExpression('<[invalid-css-syntax]/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(0);
    });

    it('should handle complex nested selectors', async () => {
      const result = await parseAndEvaluateExpression('<form input:first-of-type/>', context);
      expect(result).toBeInstanceOf(NodeList);
      expect(result.length).toBe(1); // First input in form
    });
  });
});
