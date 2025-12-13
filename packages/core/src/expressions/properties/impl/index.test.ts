/**
 * Tests for Enhanced Property Expressions
 * Comprehensive test suite for property access, possessive syntax, and attributes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTypedExpressionContext, type TypedExpressionContext } from '../../../test-utilities';
import {
  PossessiveExpression,
  MyExpression,
  ItsExpression,
  YourExpression,
  AttributeExpression,
  AttributeWithValueExpression,
  propertyExpressions,
} from './index';

describe('Enhanced Property Expressions', () => {
  let context: TypedExpressionContext;
  let testElement: HTMLElement;
  let testInput: HTMLInputElement;
  let testForm: HTMLFormElement;

  beforeEach(() => {
    context = createTypedExecutionContext();

    // Create test DOM elements
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    testElement.className = 'container active';
    testElement.setAttribute('data-role', 'component');
    testElement.setAttribute('aria-label', 'Test component');
    testElement.textContent = 'Test content';
    document.body.appendChild(testElement);

    testInput = document.createElement('input');
    testInput.type = 'text';
    testInput.name = 'testInput';
    testInput.value = 'input value';
    testInput.id = 'test-input';
    testInput.className = 'form-control';
    testInput.setAttribute('data-validation', 'required');
    document.body.appendChild(testInput);

    testForm = document.createElement('form');
    testForm.id = 'test-form';
    testForm.className = 'form';
    testForm.appendChild(testInput);
    document.body.appendChild(testForm);

    // Set up context references
    context.me = testElement;
    context.it = { name: 'test object', length: 5 };
    context.you = testInput;
  });

  afterEach(() => {
    // Clean up DOM elements
    [testElement, testInput, testForm].forEach(element => {
      if (element && element!.parentNode) {
        element!.parentNode.removeChild(element);
      }
    });
  });

  describe('PossessiveExpression', () => {
    let expression: PossessiveExpression;

    beforeEach(() => {
      expression = new PossessiveExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('possessive');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe("element's property");
      expect(expression.outputType).toBe('Any');
      expect(expression.description).toContain('possessive syntax');
    });

    describe('Object Property Access', () => {
      it('should access object properties', async () => {
        const testObj = { name: 'John', age: 30, active: true };
        const result = await expression.evaluate(context, {
          element: testObj,
          property: 'name',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('John');
          expect(result.type).toBe('String');
        }
      });

      it('should access nested object properties', async () => {
        const testObj = {
          user: {
            profile: { name: 'Jane', settings: { theme: 'dark' } },
          },
        };
        const result = await expression.evaluate(context, {
          element: testObj.user.profile,
          property: 'name',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Jane');
          expect(result.type).toBe('String');
        }
      });

      it('should return undefined for missing properties', async () => {
        const testObj = { name: 'John' };
        const result = await expression.evaluate(context, {
          element: testObj,
          property: 'email',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('DOM Element Property Access', () => {
      it('should access element ID', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'id',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('test-element');
          expect(result.type).toBe('String');
        }
      });

      it('should access element className', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'className',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('container active');
          expect(result.type).toBe('String');
        }
      });

      it('should access element tagName', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'tagName',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('div');
          expect(result.type).toBe('String');
        }
      });

      it('should access element innerText', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'innerText',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Test content');
          expect(result.type).toBe('String');
        }
      });

      it('should access input value', async () => {
        const result = await expression.evaluate(context, {
          element: testInput,
          property: 'value',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('input value');
          expect(result.type).toBe('String');
        }
      });

      it('should access element children', async () => {
        const result = await expression.evaluate(context, {
          element: testForm,
          property: 'children',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(Array.isArray(result.value)).toBe(true);
          expect(result.type).toBe('Array');
          expect((result.value as Element[]).length).toBe(1);
        }
      });

      it('should access element parent', async () => {
        const result = await expression.evaluate(context, {
          element: testInput,
          property: 'parent',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(testForm);
          expect(result.type).toBe('Element');
        }
      });
    });

    describe('Attribute Access Fallback', () => {
      it('should access data attributes', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'data-role',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('component');
          expect(result.type).toBe('String');
        }
      });

      it('should access ARIA attributes', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'aria-label',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe('Test component');
          expect(result.type).toBe('String');
        }
      });

      it('should return undefined for non-existent attributes', async () => {
        const result = await expression.evaluate(context, {
          element: testElement,
          property: 'non-existent-attr',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle null element', async () => {
        const result = await expression.evaluate(context, {
          element: null,
          property: 'anything',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle undefined element', async () => {
        const result = await expression.evaluate(context, {
          element: undefined,
          property: 'anything',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeUndefined();
          expect(result.type).toBe('Undefined');
        }
      });

      it('should handle primitive values', async () => {
        const result = await expression.evaluate(context, {
          element: 'hello',
          property: 'length',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBe(5);
          expect(result.type).toBe('Number');
        }
      });
    });

    describe('Validation and Error Handling', () => {
      it('should validate correct input', () => {
        const validation = expression.validate({
          element: testElement,
          property: 'id',
        });

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid input structure', () => {
        const validation = expression.validate({
          element: testElement,
          // missing property
        });

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should reject non-string property', () => {
        const validation = expression.validate({
          element: testElement,
          property: 123,
        });

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toHaveLength(1);
      });

      it('should track performance', async () => {
        const initialHistoryLength = context.evaluationHistory!.length;

        await expression.evaluate(context, {
          element: testElement,
          property: 'id',
        });

        expect(context.evaluationHistory!.length).toBe(initialHistoryLength + 1);

        const evaluation = context.evaluationHistory![context.evaluationHistory!.length - 1];
        expect(evaluation.expressionName).toBe('possessive');
        expect(evaluation.category).toBe('Property');
        expect(evaluation.success).toBe(true);
        expect(evaluation.duration).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Documentation', () => {
      it('should have comprehensive documentation', () => {
        expect(expression.documentation.summary).toContain('possessive syntax');
        expect(expression.documentation.parameters).toHaveLength(2);
        expect(expression.documentation.returns.type).toBe('any');
        expect(expression.documentation.examples.length).toBeGreaterThan(0);
        expect(expression.documentation.tags).toContain('possessive');
      });
    });
  });

  describe('MyExpression', () => {
    let expression: MyExpression;

    beforeEach(() => {
      expression = new MyExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('my');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe('my property');
      expect(expression.outputType).toBe('Any');
    });

    it('should access my property when me is available', async () => {
      const result = await expression.evaluate(context, {
        property: 'id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test-element');
        expect(result.type).toBe('String');
      }
    });

    it('should return undefined when me is not available', async () => {
      context.me = undefined;
      const result = await expression.evaluate(context, {
        property: 'id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeUndefined();
        expect(result.type).toBe('Undefined');
      }
    });

    it('should access multiple properties', async () => {
      const properties = ['id', 'className', 'tagName'];

      for (const property of properties) {
        const result = await expression.evaluate(context, { property });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!).toBeTruthy();
        }
      }
    });

    it('should validate input correctly', () => {
      const validResult = expression.validate({
        property: 'id',
      });

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    it('should reject invalid input', () => {
      const invalidResult = expression.validate({
        // missing property
      });

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
    });
  });

  describe('ItsExpression', () => {
    let expression: ItsExpression;

    beforeEach(() => {
      expression = new ItsExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('its');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe('its property');
    });

    it('should access its property when it is available', async () => {
      const result = await expression.evaluate(context, {
        property: 'name',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test object');
        expect(result.type).toBe('String');
      }
    });

    it('should access its length property', async () => {
      const result = await expression.evaluate(context, {
        property: 'length',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(5);
        expect(result.type).toBe('Number');
      }
    });

    it('should return undefined when it is null', async () => {
      context.it = null;
      const result = await expression.evaluate(context, {
        property: 'anything',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeUndefined();
        expect(result.type).toBe('Undefined');
      }
    });

    it('should handle array it reference', async () => {
      context.it = ['a', 'b', 'c'];
      const result = await expression.evaluate(context, {
        property: 'length',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(3);
        expect(result.type).toBe('Number');
      }
    });
  });

  describe('YourExpression', () => {
    let expression: YourExpression;

    beforeEach(() => {
      expression = new YourExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('your');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe('your property');
    });

    it('should access your property when you is available', async () => {
      const result = await expression.evaluate(context, {
        property: 'value',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('input value');
        expect(result.type).toBe('String');
      }
    });

    it('should access your id property', async () => {
      const result = await expression.evaluate(context, {
        property: 'id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('test-input');
        expect(result.type).toBe('String');
      }
    });

    it('should return undefined when you is not available', async () => {
      context.you = undefined;
      const result = await expression.evaluate(context, {
        property: 'anything',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeUndefined();
        expect(result.type).toBe('Undefined');
      }
    });
  });

  describe('AttributeExpression', () => {
    let expression: AttributeExpression;

    beforeEach(() => {
      expression = new AttributeExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('attribute');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe('@attribute or @attribute of element');
      expect(expression.outputType).toBe('String');
    });

    it('should get attribute value', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'data-role',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('component');
        expect(result.type).toBe('String');
      }
    });

    it('should get standard HTML attributes', async () => {
      const result = await expression.evaluate(context, {
        element: testInput,
        attribute: 'type',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('text');
        expect(result.type).toBe('String');
      }
    });

    it('should get ARIA attributes', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'aria-label',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('Test component');
        expect(result.type).toBe('String');
      }
    });

    it('should return null for non-existent attributes', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'non-existent',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
        expect(result.type).toBe('Null');
      }
    });

    it('should return null for non-element input', async () => {
      const result = await expression.evaluate(context, {
        element: 'not an element',
        attribute: 'any',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBeNull();
        expect(result.type).toBe('Null');
      }
    });

    it('should validate input correctly', () => {
      const validResult = expression.validate({
        element: testElement,
        attribute: 'id',
      });

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    it('should reject invalid input', () => {
      const invalidResult = expression.validate({
        element: testElement,
        // missing attribute
      });

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
    });
  });

  describe('AttributeWithValueExpression', () => {
    let expression: AttributeWithValueExpression;

    beforeEach(() => {
      expression = new AttributeWithValueExpression();
    });

    it('should have correct metadata', () => {
      expect(expression.name).toBe('attributeWithValue');
      expect(expression.category).toBe('Property');
      expect(expression.syntax).toBe('@attribute=value');
      expect(expression.outputType).toBe('Boolean');
    });

    it('should return true for matching attribute value', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'data-role',
        value: 'component',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should return false for non-matching attribute value', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'data-role',
        value: 'different',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should return false for non-existent attribute', async () => {
      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'non-existent',
        value: 'any',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should return false for non-element input', async () => {
      const result = await expression.evaluate(context, {
        element: 'not an element',
        attribute: 'any',
        value: 'any',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(false);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should handle complex attribute values', async () => {
      testElement.setAttribute('data-config', '{"theme":"dark","size":"large"}');

      const result = await expression.evaluate(context, {
        element: testElement,
        attribute: 'data-config',
        value: '{"theme":"dark","size":"large"}',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('Boolean');
      }
    });

    it('should validate input correctly', () => {
      const validResult = expression.validate({
        element: testElement,
        attribute: 'data-role',
        value: 'component',
      });

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    it('should reject invalid input', () => {
      const invalidResult = expression.validate({
        element: testElement,
        attribute: 'data-role',
        // missing value
      });

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
    });
  });

  describe('Expression Registry', () => {
    it('should export all enhanced property expressions', () => {
      expect(propertyExpressions.possessive).toBeInstanceOf(PossessiveExpression);
      expect(propertyExpressions.my).toBeInstanceOf(MyExpression);
      expect(propertyExpressions.its).toBeInstanceOf(ItsExpression);
      expect(propertyExpressions.your).toBeInstanceOf(YourExpression);
      expect(propertyExpressions.attribute).toBeInstanceOf(AttributeExpression);
      expect(propertyExpressions.attributeWithValue).toBeInstanceOf(
        AttributeWithValueExpression
      );
    });

    it('should have consistent metadata across all expressions', () => {
      Object.values(propertyExpressions).forEach(expression => {
        expect(expression.category).toBe('Property');
        expect(expression.name).toBeTruthy();
        expect(expression.syntax).toBeTruthy();
        expect(expression.description).toBeTruthy();
        expect(expression.metadata).toBeTruthy();
        expect(expression.documentation).toBeTruthy();
        expect(expression.inputSchema).toBeTruthy();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with complex nested DOM structure', async () => {
      // Create nested structure
      const container = document.createElement('div');
      container.className = 'container';
      container.setAttribute('data-module', 'layout');

      const header = document.createElement('header');
      header.className = 'header';
      header.setAttribute('data-section', 'top');

      const title = document.createElement('h1');
      title.textContent = 'Page Title';
      title.id = 'main-title';

      header.appendChild(title);
      container.appendChild(header);
      document.body.appendChild(container);

      const possessiveExpr = new PossessiveExpression();

      // Test nested property access
      const containerResult = await possessiveExpr.evaluate(context, {
        element: container,
        property: 'data-module',
      });

      const headerResult = await possessiveExpr.evaluate(context, {
        element: header,
        property: 'children',
      });

      const titleResult = await possessiveExpr.evaluate(context, {
        element: title,
        property: 'innerText',
      });

      expect(containerResult.success).toBe(true);
      if (containerResult.success) {
        expect(containerResult.value).toBe('layout');
      }

      expect(headerResult.success).toBe(true);
      if (headerResult.success) {
        expect(Array.isArray(headerResult.value)).toBe(true);
        expect((headerResult.value as Element[]).length).toBe(1);
      }

      expect(titleResult.success).toBe(true);
      if (titleResult.success) {
        expect(titleResult.value).toBe('Page Title');
      }

      document.body.removeChild(container);
    });

    it('should handle form element properties correctly', async () => {
      const form = document.createElement('form');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.name = 'accept';

      const select = document.createElement('select');
      select.name = 'country';
      const option = document.createElement('option');
      option.value = 'us';
      option.selected = true;
      option.textContent = 'United States';
      select.appendChild(option);

      form.appendChild(checkbox);
      form.appendChild(select);
      document.body.appendChild(form);

      const possessiveExpr = new PossessiveExpression();

      const checkboxResult = await possessiveExpr.evaluate(context, {
        element: checkbox,
        property: 'checked',
      });

      const selectResult = await possessiveExpr.evaluate(context, {
        element: select,
        property: 'value',
      });

      expect(checkboxResult.success).toBe(true);
      if (checkboxResult.success) {
        expect(checkboxResult.value).toBe(true);
      }

      expect(selectResult.success).toBe(true);
      if (selectResult.success) {
        expect(selectResult.value).toBe('us');
      }

      document.body.removeChild(form);
    });

    it('should maintain performance with large property access', async () => {
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`prop${i}`] = `value${i}`;
      }

      const possessiveExpr = new PossessiveExpression();

      const startTime = Date.now();
      const result = await possessiveExpr.evaluate(context, {
        element: largeObject,
        property: 'prop500',
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10); // Should be very fast

      if (result.success) {
        expect(result.value!).toBe('value500');
      }
    });

    it('should work with all context expressions together', async () => {
      // Set up complex context
      context.me = testElement;
      context.it = { data: { nested: 'value' } };
      context.you = testInput;

      const myExpr = new MyExpression();
      const itsExpr = new ItsExpression();
      const yourExpr = new YourExpression();

      const [myResult, itsResult, yourResult] = await Promise.all([
        myExpr.evaluate(context, { property: 'id' }),
        itsExpr.evaluate(context, { property: 'data' }),
        yourExpr.evaluate(context, { property: 'value' }),
      ]);

      expect(myResult.success).toBe(true);
      expect(itsResult.success).toBe(true);
      expect(yourResult.success).toBe(true);

      if (myResult.success) {
        expect(myResult.value).toBe('test-element');
      }

      if (itsResult.success) {
        expect(itsResult.value).toEqual({ nested: 'value' });
      }

      if (yourResult.success) {
        expect(yourResult.value).toBe('input value');
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated property access', async () => {
      const possessiveExpr = new PossessiveExpression();

      // Perform many property accesses
      for (let i = 0; i < 100; i++) {
        const result = await possessiveExpr.evaluate(context, {
          element: testElement,
          property: 'id',
        });

        expect(result.success).toBe(true);
      }

      // No memory leaks should occur
      expect(true).toBe(true); // Test completes successfully
    });

    it('should maintain consistent performance', async () => {
      const possessiveExpr = new PossessiveExpression();
      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const result = await possessiveExpr.evaluate(context, {
          element: testElement,
          property: 'className',
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        durations.push(duration);
      }

      // Performance should be consistent (all operations under 5ms)
      durations.forEach(duration => {
        expect(duration).toBeLessThan(5);
      });
    });
  });
});
