/**
 * Simplified Integration tests for hyperscript expressions
 * Tests core expression combinations that work reliably
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement, createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

// Import all expression categories
import { referencesExpressions } from './references/index';
import { logicalExpressions } from './logical/index';
import { conversionExpressions } from './conversion/index';
import { positionalExpressions } from './positional/index';
import { propertiesExpressions } from './properties/index';
import { specialExpressions } from './special/index';

describe('Expression Integration Tests - Core Combinations', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    context = createMockHyperscriptContext();

    // Create test DOM structure
    document.body.innerHTML = `
      <div id="container" class="test-container">
        <form id="test-form" class="form">
          <button id="btn1" class="primary" data-value="10">Button 1</button>
          <button id="btn2" class="secondary" data-value="20">Button 2</button>
          <input id="input1" name="username" type="text" value="john" />
          <input id="input2" name="age" type="number" value="25" />
          <input id="checkbox1" name="active" type="checkbox" checked />
        </form>
        <p id="text1" class="content">Hello World</p>
        <p id="text2" class="content hidden">Hidden Content</p>
      </div>
    `;

    testElement = document.getElementById('btn1')!;
    context.me = testElement;
    context.it = { name: 'test', values: [1, 2, 3, 4, 5] };
  });

  describe('Property Access Chains', () => {
    it('should handle "my data-value as Int"', async () => {
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      expect(intValue).toBe(10);
    });

    it('should handle "my className contains primary"', async () => {
      const className = await propertiesExpressions.my.evaluate(context, 'className');
      const result = await logicalExpressions.contains.evaluate(context, className, 'primary');
      expect(result).toBe(true);
    });

    it('should handle "#container\'s children length"', async () => {
      const container = await propertiesExpressions.idReference.evaluate(context, 'container');
      const children = await propertiesExpressions.possessive.evaluate(
        context,
        container,
        'children'
      );
      const length = await propertiesExpressions.possessive.evaluate(context, children, 'length');
      expect(length).toBeGreaterThan(0);
    });
  });

  describe('Form Value Processing', () => {
    it('should handle form as Values', async () => {
      const form = await propertiesExpressions.idReference.evaluate(context, 'test-form');
      const formValues = await conversionExpressions.as.evaluate(context, form, 'Values');

      expect(formValues.username).toBe('john');
      expect(formValues.age).toBe(25);
      expect(formValues.active).toBe(true);
    });

    it('should handle form as Values:JSON', async () => {
      const form = await propertiesExpressions.idReference.evaluate(context, 'test-form');
      const jsonValues = await conversionExpressions.as.evaluate(context, form, 'Values:JSON');

      const parsed = JSON.parse(jsonValues);
      expect(parsed.username).toBe('john');
      expect(parsed.age).toBe(25);
      expect(parsed.active).toBe(true);
    });

    it('should check if form values contain username', async () => {
      const form = await propertiesExpressions.idReference.evaluate(context, 'test-form');
      const formValues = await conversionExpressions.as.evaluate(context, form, 'Values');
      const hasUsername = await logicalExpressions.contains.evaluate(
        context,
        formValues,
        'username'
      );

      expect(hasUsername).toBe(true);
    });
  });

  describe('Collection Operations', () => {
    it('should handle "first of it\'s values"', async () => {
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const first = await positionalExpressions.first.evaluate(context, values);
      expect(first).toBe(1);
    });

    it('should handle "last of it\'s values > 3"', async () => {
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const last = await positionalExpressions.last.evaluate(context, values);
      const result = await logicalExpressions.greaterThan.evaluate(context, last, 3);
      expect(result).toBe(true); // 5 > 3
    });

    it('should handle "it\'s values at -1 == 5"', async () => {
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const lastValue = await positionalExpressions.at.evaluate(context, -1, values);
      const result = await logicalExpressions.equals.evaluate(context, lastValue, 5);
      expect(result).toBe(true);
    });
  });

  describe('CSS Selector Integration', () => {
    it('should handle "all buttons by selector"', async () => {
      const buttons = await referencesExpressions.elementWithSelector.evaluate(context, 'button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].id).toBe('btn1');
      expect(buttons[1].id).toBe('btn2');
    });

    it('should handle "buttons with primary class"', async () => {
      const primaryButtons = await referencesExpressions.elementWithSelector.evaluate(
        context,
        'button.primary'
      );
      expect(primaryButtons).toHaveLength(1);
      expect(primaryButtons[0].id).toBe('btn1');
    });

    it('should handle "first button text content"', async () => {
      const buttons = await referencesExpressions.elementWithSelector.evaluate(context, 'button');
      const firstButton = await positionalExpressions.first.evaluate(context, buttons);
      const textContent = await propertiesExpressions.possessive.evaluate(
        context,
        firstButton,
        'textContent'
      );
      expect(textContent).toBe('Button 1');
    });
  });

  describe('Mathematical Operations', () => {
    it('should handle "(my data-value as Int + 5) * 2"', async () => {
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      const sum = await specialExpressions.addition.evaluate(context, intValue, 5);
      const result = await specialExpressions.multiplication.evaluate(context, sum, 2);
      expect(result).toBe(30); // (10 + 5) * 2
    });

    it('should handle "it\'s values length mod 3"', async () => {
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const length = await propertiesExpressions.possessive.evaluate(context, values, 'length');
      const result = await specialExpressions.modulo.evaluate(context, length, 3);
      expect(result).toBe(2); // 5 mod 3 = 2
    });
  });

  describe('Logical Combinations', () => {
    it('should handle "my data-value as Int > 5 and my className contains primary"', async () => {
      // Check data-value > 5
      const dataValue = await propertiesExpressions.my.evaluate(context, 'data-value');
      const intValue = await conversionExpressions.as.evaluate(context, dataValue, 'Int');
      const greaterThan5 = await logicalExpressions.greaterThan.evaluate(context, intValue, 5);

      // Check className contains 'primary'
      const className = await propertiesExpressions.my.evaluate(context, 'className');
      const hasPrimary = await logicalExpressions.contains.evaluate(context, className, 'primary');

      // Combine with AND
      const result = await logicalExpressions.and.evaluate(context, greaterThan5, hasPrimary);
      expect(result).toBe(true);
    });

    it('should handle "my matches .primary"', async () => {
      const result = await logicalExpressions.matches.evaluate(context, context.me, '.primary');
      expect(result).toBe(true);
    });

    it('should handle type checking combinations"', async () => {
      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const isArray = await conversionExpressions.is.evaluate(context, values, 'array');
      const isEmpty = await logicalExpressions.isEmpty.evaluate(context, values);
      const notEmpty = await logicalExpressions.not.evaluate(context, isEmpty);
      const result = await logicalExpressions.and.evaluate(context, isArray, notEmpty);
      expect(result).toBe(true);
    });
  });

  describe('String Template and Interpolation', () => {
    it('should handle string interpolation', async () => {
      const template = 'Button: $name, Value: $value';
      const result = await specialExpressions.stringLiteral.evaluate(context, template);
      expect(result).toBe('Button: [name], Value: [value]');
    });

    it('should handle template literals', async () => {
      const template = 'Result: ${1 + 2 * 3}';
      const result = await specialExpressions.stringLiteral.evaluate(context, template);
      expect(result).toBe('Result: [1 + 2 * 3]');
    });
  });

  describe('Global Reference Access', () => {
    it('should access window and document', async () => {
      const windowObj = await referencesExpressions.window.evaluate(context);
      const documentObj = await referencesExpressions.document.evaluate(context);

      expect(windowObj).toBe(window);
      expect(documentObj).toBe(document);

      const location = await propertiesExpressions.possessive.evaluate(
        context,
        windowObj,
        'location'
      );
      expect(location).toBe(window.location);
    });
  });

  describe('Complex Real-World Patterns', () => {
    it('should validate form data comprehensively', async () => {
      // Get form and convert to values
      const form = await propertiesExpressions.idReference.evaluate(context, 'test-form');
      const formValues = await conversionExpressions.as.evaluate(context, form, 'Values');

      // Check multiple conditions
      const hasUsername = await logicalExpressions.contains.evaluate(
        context,
        formValues,
        'username'
      );
      const usernameNotEmpty = await logicalExpressions.not.evaluate(
        context,
        formValues.username === ''
      );
      const ageValid = await logicalExpressions.greaterThan.evaluate(context, formValues.age, 0);
      const isActive = formValues.active;

      // Combine all conditions
      const step1 = await logicalExpressions.and.evaluate(context, hasUsername, usernameNotEmpty);
      const step2 = await logicalExpressions.and.evaluate(context, step1, ageValid);
      const result = await logicalExpressions.and.evaluate(context, step2, isActive);

      expect(result).toBe(true);
    });

    it('should filter content by criteria', async () => {
      // Get all content elements
      const contentElements = await referencesExpressions.elementWithSelector.evaluate(
        context,
        '.content'
      );

      // Filter for visible elements (not .hidden)
      let visibleCount = 0;
      for (const element of contentElements) {
        const hasHidden = await logicalExpressions.matches.evaluate(context, element, '.hidden');
        const isVisible = await logicalExpressions.not.evaluate(context, hasHidden);
        if (isVisible) visibleCount++;
      }

      expect(visibleCount).toBe(1); // Only text1 is visible
    });

    it('should handle navigation between elements', async () => {
      // Get next button from current context
      const nextButton = await positionalExpressions.next.evaluate(context, 'button');
      expect(nextButton?.id).toBe('btn2');

      // Get previous button from btn2
      const btn2 = await propertiesExpressions.idReference.evaluate(context, 'btn2');
      const prevButton = await positionalExpressions.previous.evaluate(
        context,
        'button',
        btn2 as HTMLElement
      );
      expect(prevButton?.id).toBe('btn1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing elements gracefully', async () => {
      const missing = await referencesExpressions.elementWithSelector.evaluate(
        context,
        '.nonexistent'
      );
      expect(missing).toEqual([]);

      const first = await positionalExpressions.first.evaluate(context, missing);
      expect(first).toBeNull();
    });

    it('should handle null property access', async () => {
      const result = await propertiesExpressions.possessive.evaluate(context, null, 'property');
      expect(result).toBeUndefined();
    });

    it('should handle type conversion errors', async () => {
      const result = await conversionExpressions.as.evaluate(context, 'invalid-number', 'Int');
      expect(result).toBe(0); // Fallback to 0
    });

    it('should handle empty collections', async () => {
      const emptyArray: any[] = [];
      const first = await positionalExpressions.first.evaluate(context, emptyArray);
      const last = await positionalExpressions.last.evaluate(context, emptyArray);

      expect(first).toBeNull();
      expect(last).toBeNull();
    });
  });

  describe('Performance with Large Data', () => {
    it('should handle large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      context.it = { values: largeArray };

      const values = await propertiesExpressions.its.evaluate(context, 'values');
      const first = await positionalExpressions.first.evaluate(context, values);
      const last = await positionalExpressions.last.evaluate(context, values);
      const middle = await positionalExpressions.at.evaluate(context, 500, values);

      expect(first).toBe(0);
      expect(last).toBe(999);
      expect(middle).toBe(500);
    });
  });
});
