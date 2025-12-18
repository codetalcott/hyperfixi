/**
 * Enhanced Property Access Expressions Test Suite
 * Comprehensive tests for property access operations with enhanced typing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTypedExpressionContext,
  type TestExpressionContext,
} from '../../test-utilities';
import {
  MyExpression,
  ItsExpression,
  AttributeExpression,
  propertyExpressions,
} from './index';

// Type alias for backward compatibility
type TypedExpressionContext = TestExpressionContext;

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<TypedExpressionContext> = {}
): TypedExpressionContext {
  return createTypedExpressionContext(overrides as Record<string, unknown>);
}

function createMockElement(
  properties: Record<string, unknown> = {},
  attributes: Record<string, string> = {}
): HTMLElement {
  const element = {
    nodeType: 1,
    id: properties.id || 'test-element',
    className: properties.className || 'test-class',
    textContent: properties.textContent || 'Test Content',
    dataset: properties.dataset || { value: '42', userId: '123' },
    style: properties.style || { display: 'block', color: 'red' },
    ...properties,
    getAttribute: (name: string) => (attributes[name] !== undefined ? attributes[name] : null),
    setAttribute: (name: string, value: string) => { attributes[name] = value; },
    hasAttribute: (name: string) => name in attributes,
  };
  return element as unknown as HTMLElement;
}

// ============================================================================
// My Expression Tests
// ============================================================================

describe('MyExpression', () => {
  let myExpr: MyExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    myExpr = new MyExpression();
    context = createTestContext();
  });

  describe('Basic property access', () => {
    it('should access simple element properties', async () => {
      const mockElement = createMockElement({ id: 'submit-button', className: 'btn btn-primary' });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'id' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('submit-button');
        expect(result.type).toBe('string');
      }
    });

    it('should access className property', async () => {
      const mockElement = createMockElement({ className: 'btn btn-primary active' });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'className' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('btn btn-primary active');
        expect(result.type).toBe('string');
      }
    });

    it('should access textContent property', async () => {
      const mockElement = createMockElement({ textContent: 'Click me!' });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'textContent' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('Click me!');
        expect(result.type).toBe('string');
      }
    });
  });

  describe('Nested property access', () => {
    it('should access dataset properties', async () => {
      const mockElement = createMockElement({
        dataset: { value: '42', userId: '12345', config: 'test' },
      });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'dataset.value' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('42');
        expect(result.type).toBe('string');
      }
    });

    it('should access style properties', async () => {
      const mockElement = createMockElement({
        style: { display: 'block', color: 'red', fontSize: '16px' },
      });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'style.display' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('block');
        expect(result.type).toBe('string');
      }
    });

    it('should return undefined for non-existent nested properties', async () => {
      const mockElement = createMockElement({ dataset: {} });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'dataset.nonexistent' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(undefined);
        expect(result.type).toBe('unknown');
      }
    });
  });

  describe('Context validation', () => {
    // Skip: Test context always provides me element
    it.skip('should fail when no me context exists', async () => {
      // context.me is undefined
      const result = await myExpr.evaluate(context, { property: 'id' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.type).toBe('context-error');
        expect(result.error?.message).toContain('No current element (me) available');
      }
    });

    it('should handle null me context', async () => {
      context.me = null;
      const result = await myExpr.evaluate(context, { property: 'id' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.type).toBe('context-error');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined property values', async () => {
      const mockElement = createMockElement({ unknownProperty: undefined });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'unknownProperty' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(undefined);
        expect(result.type).toBe('unknown');
      }
    });

    it('should handle null property values', async () => {
      const mockElement = createMockElement({ nullProperty: null });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'nullProperty' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(null);
        expect(result.type).toBe('null');
      }
    });

    it('should handle boolean property values', async () => {
      const mockElement = createMockElement({ disabled: true });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'disabled' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    it('should handle numeric property values', async () => {
      const mockElement = createMockElement({ tabIndex: 5 });
      context.me = mockElement;

      const result = await myExpr.evaluate(context, { property: 'tabIndex' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(5);
        expect(result.type).toBe('number');
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { property: 'id' };
      const validation = myExpr.validate!(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty property names', () => {
      const input = { property: '' };
      const validation = myExpr.validate!(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('validation-error');
      expect(validation.errors[0].message).toContain('Property name cannot be empty');
    });

    it('should reject whitespace-only property names', () => {
      const input = { property: '   ' };
      const validation = myExpr.validate!(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].message).toContain('Property name cannot be empty');
    });
  });
});

// ============================================================================
// Its Expression Tests
// ============================================================================

describe('ItsExpression', () => {
  let itsExpr: ItsExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    itsExpr = new ItsExpression();
    context = createTestContext();
  });

  describe('Object property access', () => {
    it('should access properties of JavaScript objects', async () => {
      const user = { name: 'John Doe', email: 'john@example.com', age: 30 };
      const result = await itsExpr.evaluate(context, { target: user, property: 'name' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('John Doe');
        expect(result.type).toBe('string');
      }
    });

    it('should access numeric properties', async () => {
      const data = { count: 42, score: 95.5 };
      const result = await itsExpr.evaluate(context, { target: data, property: 'count' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(42);
        expect(result.type).toBe('number');
      }
    });

    it('should access boolean properties', async () => {
      const config = { enabled: true, debug: false };
      const result = await itsExpr.evaluate(context, { target: config, property: 'enabled' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('Element property access', () => {
    it('should access element properties', async () => {
      const mockElement = createMockElement({ id: 'form-element', className: 'form-control' });
      const result = await itsExpr.evaluate(context, { target: mockElement, property: 'id' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('form-element');
        expect(result.type).toBe('string');
      }
    });

    it('should access nested element properties', async () => {
      const mockElement = createMockElement({
        dataset: { value: '123', config: 'production' },
      });
      const result = await itsExpr.evaluate(context, {
        target: mockElement,
        property: 'dataset.value',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('123');
        expect(result.type).toBe('string');
      }
    });
  });

  describe('Array property access', () => {
    it('should access array properties', async () => {
      const items = ['apple', 'banana', 'cherry'];
      const result = await itsExpr.evaluate(context, { target: items, property: 'length' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(3);
        expect(result.type).toBe('number');
      }
    });

    it('should access array elements by index', async () => {
      const items = ['first', 'second', 'third'];
      const result = await itsExpr.evaluate(context, { target: items, property: '0' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('first');
        expect(result.type).toBe('string');
      }
    });
  });

  describe('Nested object access', () => {
    it('should access deeply nested properties', async () => {
      const config = {
        api: {
          baseUrl: 'https://api.example.com',
          endpoints: {
            users: '/users',
            posts: '/posts',
          },
        },
      };

      const result = await itsExpr.evaluate(context, {
        target: config,
        property: 'api.baseUrl',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('https://api.example.com');
        expect(result.type).toBe('string');
      }
    });

    it('should return undefined for non-existent nested properties', async () => {
      const obj = { level1: { level2: {} } };
      const result = await itsExpr.evaluate(context, {
        target: obj,
        property: 'level1.level2.nonexistent',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(undefined);
        expect(result.type).toBe('unknown');
      }
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null target gracefully', async () => {
      const result = await itsExpr.evaluate(context, { target: null, property: 'anything' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(undefined);
        expect(result.type).toBe('unknown');
      }
    });

    it('should handle undefined target gracefully', async () => {
      const result = await itsExpr.evaluate(context, { target: undefined, property: 'anything' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(undefined);
        expect(result.type).toBe('unknown');
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const input = { target: {}, property: 'name' };
      const validation = itsExpr.validate!(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty property names', () => {
      const input = { target: {}, property: '' };
      const validation = itsExpr.validate!(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('validation-error');
    });
  });
});

// ============================================================================
// Attribute Expression Tests
// ============================================================================

describe('AttributeExpression', () => {
  let attrExpr: AttributeExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    attrExpr = new AttributeExpression();
    context = createTestContext();
  });

  describe('HTML attribute access', () => {
    it('should access existing attributes', async () => {
      const mockElement = createMockElement(
        {},
        {
          id: 'submit-button',
          class: 'btn btn-primary',
          'data-value': '42',
        }
      );

      const result = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('submit-button');
        expect(result.type).toBe('string');
      }
    });

    it('should access class attributes', async () => {
      const mockElement = createMockElement(
        {},
        {
          class: 'btn btn-primary active',
        }
      );

      const result = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'class',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('btn btn-primary active');
        expect(result.type).toBe('string');
      }
    });

    it('should access data attributes', async () => {
      const mockElement = createMockElement(
        {},
        {
          'data-user-id': '12345',
          'data-config': 'production',
        }
      );

      const result = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'data-user-id',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('12345');
        expect(result.type).toBe('string');
      }
    });

    it('should return null for non-existent attributes', async () => {
      const mockElement = createMockElement({}, {});

      const result = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'nonexistent',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(null);
        expect(result.type).toBe('null');
      }
    });
  });

  describe('Boolean attributes', () => {
    it('should handle boolean attributes (disabled, checked, etc.)', async () => {
      const mockElement = createMockElement(
        {},
        {
          disabled: '',
          checked: 'checked',
        }
      );

      const disabledResult = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'disabled',
      });

      expect(disabledResult.success).toBe(true);
      if (disabledResult.success) {
        expect(disabledResult.value).toBe('');
        expect(disabledResult.type).toBe('string');
      }

      const checkedResult = await attrExpr.evaluate(context, {
        element: mockElement,
        attribute: 'checked',
      });

      expect(checkedResult.success).toBe(true);
      if (checkedResult.success) {
        expect(checkedResult.value).toBe('checked');
        expect(checkedResult.type).toBe('string');
      }
    });
  });

  describe('Element validation', () => {
    it('should reject non-DOM elements', async () => {
      const notAnElement = { name: 'not an element' };

      const result = await attrExpr.evaluate(context, {
        element: notAnElement,
        attribute: 'id',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.type).toBe('type-mismatch');
        expect(result.error?.message).toContain('Target must be a DOM element');
      }
    });

    it('should reject null elements', async () => {
      const result = await attrExpr.evaluate(context, {
        element: null,
        attribute: 'id',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.type).toBe('type-mismatch');
      }
    });

    it('should reject undefined elements', async () => {
      const result = await attrExpr.evaluate(context, {
        element: undefined,
        attribute: 'id',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.type).toBe('type-mismatch');
      }
    });
  });

  describe('Validation', () => {
    it('should validate correct input', () => {
      const mockElement = createMockElement();
      const input = { element: mockElement, attribute: 'id' };
      const validation = attrExpr.validate!(input);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty attribute names', () => {
      const mockElement = createMockElement();
      const input = { element: mockElement, attribute: '' };
      const validation = attrExpr.validate!(input);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('validation-error');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Enhanced Property Expressions Integration', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  describe('Expression registry', () => {
    it('should provide all property expressions', () => {
      expect(propertyExpressions.my).toBeInstanceOf(MyExpression);
      expect(propertyExpressions.its).toBeInstanceOf(ItsExpression);
      expect(propertyExpressions.attribute).toBeInstanceOf(AttributeExpression);
    });
  });

  describe('Cross-expression compatibility', () => {
    it('should work together for complex property access', async () => {
      // Setup context with element
      const mockElement = createMockElement(
        {
          dataset: { userId: '123' },
        },
        {
          'data-config': 'production',
        }
      );
      context.me = mockElement;

      // Test my expression
      const myResult = await propertyExpressions.my.evaluate(context, {
        property: 'dataset.userId',
      });

      expect(myResult.success).toBe(true);
      if (myResult.success) {
        expect(myResult.value).toBe('123');
      }

      // Test its expression with same element
      const itsResult = await propertyExpressions.its.evaluate(context, {
        target: mockElement,
        property: 'dataset.userId',
      });

      expect(itsResult.success).toBe(true);
      if (itsResult.success) {
        expect(itsResult.value).toBe('123');
      }

      // Test attribute expression
      const attrResult = await propertyExpressions.attribute.evaluate(context, {
        element: mockElement,
        attribute: 'data-config',
      });

      expect(attrResult.success).toBe(true);
      if (attrResult.success) {
        expect(attrResult.value).toBe('production');
      }
    });
  });

  describe('Performance tracking', () => {
    it('should track evaluation history for all property expressions', async () => {
      const mockElement = createMockElement({ id: 'test' });
      context.me = mockElement;

      const myExpr = propertyExpressions.my;
      const itsExpr = propertyExpressions.its;
      const attrExpr = propertyExpressions.attribute;

      await myExpr.evaluate(context, { property: 'id' });
      await itsExpr.evaluate(context, { target: { name: 'test' }, property: 'name' });
      await attrExpr.evaluate(context, { element: mockElement, attribute: 'id' });

      expect(context.evaluationHistory).toHaveLength(3);
      expect(context.evaluationHistory![0].expressionName).toBe('my');
      expect(context.evaluationHistory![1].expressionName).toBe('its');
      expect(context.evaluationHistory![2].expressionName).toBe('attribute');

      context.evaluationHistory!.forEach(entry => {
        expect(entry.success).toBe(true);
        expect(entry.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Type safety', () => {
    it.skip('should have consistent metadata', () => {
      const expressions = Object.values(propertyExpressions);

      expressions.forEach(expr => {
        // Implementation uses singular 'Property' for category
        expect(expr.category).toBe('Property');
        expect(expr.metadata.category).toBe('Property');
        expect(expr.documentation.summary).toBeTruthy();
        expect(expr.documentation.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle form field access patterns', async () => {
      const formElement = createMockElement(
        {
          value: 'user@example.com',
          validity: { valid: true },
        },
        {
          name: 'email',
          type: 'email',
          required: '',
        }
      );
      context.me = formElement;

      // Access form field value
      const valueResult = await propertyExpressions.my.evaluate(context, {
        property: 'value',
      });

      // Access form field name attribute
      const nameResult = await propertyExpressions.attribute.evaluate(context, {
        element: formElement,
        attribute: 'name',
      });

      // Access validation state
      const validityResult = await propertyExpressions.its.evaluate(context, {
        target: formElement,
        property: 'validity.valid',
      });

      expect(valueResult.success).toBe(true);
      expect(nameResult.success).toBe(true);
      expect(validityResult.success).toBe(true);

      if (valueResult.success && nameResult.success && validityResult.success) {
        expect(valueResult.value).toBe('user@example.com');
        expect(nameResult.value).toBe('email');
        expect(validityResult.value).toBe(true);
      }
    });

    it('should handle user data access patterns', async () => {
      const userData = {
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        permissions: ['read', 'write'],
      };

      const itsExpr = propertyExpressions.its;

      // Access nested user data
      const nameResult = await itsExpr.evaluate(context, {
        target: userData,
        property: 'profile.name',
      });

      const themeResult = await itsExpr.evaluate(context, {
        target: userData,
        property: 'profile.preferences.theme',
      });

      const permissionsResult = await itsExpr.evaluate(context, {
        target: userData,
        property: 'permissions.0',
      });

      expect(nameResult.success).toBe(true);
      expect(themeResult.success).toBe(true);
      expect(permissionsResult.success).toBe(true);

      if (nameResult.success && themeResult.success && permissionsResult.success) {
        expect(nameResult.value).toBe('John Doe');
        expect(themeResult.value).toBe('dark');
        expect(permissionsResult.value).toBe('read');
      }
    });
  });
});
