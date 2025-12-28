/**
 * PropertyTarget Utility Tests
 *
 * Tests for the shared 'x of y' pattern handling primitive.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PropertyTarget,
  PropertyOfExpressionNode,
  PropertyAccessNode,
  isPropertyOfExpressionNode,
  isPropertyAccessNode,
  isPropertyTargetString,
  resolvePropertyTargetFromString,
  resolvePropertyTargetFromNode,
  resolvePropertyTargetFromAccessNode,
  togglePropertyTarget,
} from '../property-target';

import type { ExecutionContext } from '../../../types/base-types';

function createMockContext(me?: HTMLElement, it?: unknown, you?: HTMLElement): ExecutionContext {
  return {
    me: me ?? null,
    it,
    you: you ?? null,
    result: undefined,
    globals: new Map<string, unknown>(),
    locals: new Map<string, unknown>(),
  } as ExecutionContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: unknown, _context: unknown) => {
      const n = node as Record<string, unknown>;
      if (n.type === 'idSelector' || n.type === 'selector') {
        const selector = (n.value || n.selector) as string;
        return document.querySelector(selector);
      }
      if (n.type === 'identifier') {
        const name = n.name as string;
        if (name === 'me') return (_context as { me?: unknown }).me;
        if (name === 'it') return (_context as { it?: unknown }).it;
        if (name === 'you') return (_context as { you?: unknown }).you;
      }
      return n.value;
    },
  };
}

describe('PropertyTarget Detection', () => {
  describe('isPropertyOfExpressionNode', () => {
    it('should return true for valid propertyOfExpression nodes', () => {
      const node: PropertyOfExpressionNode = {
        type: 'propertyOfExpression',
        property: { type: 'identifier', name: 'innerHTML' },
        target: { type: 'idSelector', value: '#target' } as any,
      };
      expect(isPropertyOfExpressionNode(node)).toBe(true);
    });

    it('should return false for non-propertyOfExpression nodes', () => {
      expect(isPropertyOfExpressionNode({ type: 'identifier', name: 'foo' })).toBe(false);
      expect(isPropertyOfExpressionNode({ type: 'literal', value: 'bar' })).toBe(false);
      expect(isPropertyOfExpressionNode(null)).toBe(false);
      expect(isPropertyOfExpressionNode(undefined)).toBe(false);
      expect(isPropertyOfExpressionNode('string')).toBe(false);
    });

    it('should return false if property is missing', () => {
      expect(isPropertyOfExpressionNode({ type: 'propertyOfExpression', target: {} })).toBe(false);
    });
  });

  describe('isPropertyAccessNode', () => {
    it('should return true for valid propertyAccess nodes', () => {
      const node: PropertyAccessNode = {
        type: 'propertyAccess',
        object: { type: 'idSelector', value: '#target' } as any,
        property: 'innerHTML',
      };
      expect(isPropertyAccessNode(node)).toBe(true);
    });

    it('should return false for non-propertyAccess nodes', () => {
      expect(isPropertyAccessNode({ type: 'identifier', name: 'foo' })).toBe(false);
      expect(isPropertyAccessNode({ type: 'propertyOfExpression', property: { name: 'x' } })).toBe(false);
      expect(isPropertyAccessNode(null)).toBe(false);
      expect(isPropertyAccessNode(undefined)).toBe(false);
      expect(isPropertyAccessNode('string')).toBe(false);
    });

    it('should return false if property is not a string', () => {
      expect(isPropertyAccessNode({ type: 'propertyAccess', object: {}, property: 123 })).toBe(false);
      expect(isPropertyAccessNode({ type: 'propertyAccess', object: {} })).toBe(false);
    });
  });

  describe('isPropertyTargetString', () => {
    it('should return true for "the X of Y" strings', () => {
      expect(isPropertyTargetString('the innerHTML of #target')).toBe(true);
      expect(isPropertyTargetString('the value of me')).toBe(true);
      expect(isPropertyTargetString('the textContent of it')).toBe(true);
      expect(isPropertyTargetString('THE innerHTML OF #target')).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      expect(isPropertyTargetString('innerHTML')).toBe(false);
      expect(isPropertyTargetString('the innerHTML')).toBe(false);
      expect(isPropertyTargetString('set x to y')).toBe(false);
      expect(isPropertyTargetString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isPropertyTargetString(123)).toBe(false);
      expect(isPropertyTargetString(null)).toBe(false);
      expect(isPropertyTargetString(undefined)).toBe(false);
      expect(isPropertyTargetString({})).toBe(false);
    });
  });
});

describe('PropertyTarget Resolution', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.id = 'test-target';
    testElement.textContent = 'initial content';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('resolvePropertyTargetFromString', () => {
    it('should resolve "the X of #id" pattern', () => {
      const context = createMockContext();
      const result = resolvePropertyTargetFromString('the innerHTML of #test-target', context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
      expect(result!.property).toBe('innerHTML');
    });

    it('should resolve "the X of me" pattern', () => {
      const context = createMockContext(testElement);
      const result = resolvePropertyTargetFromString('the textContent of me', context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
      expect(result!.property).toBe('textContent');
    });

    it('should resolve "the X of it" pattern', () => {
      const context = createMockContext(undefined, testElement);
      const result = resolvePropertyTargetFromString('the value of it', context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
      expect(result!.property).toBe('value');
    });

    it('should return null for invalid selector', () => {
      const context = createMockContext();
      const result = resolvePropertyTargetFromString('the innerHTML of #nonexistent', context);
      expect(result).toBeNull();
    });

    it('should return null for invalid pattern', () => {
      const context = createMockContext();
      const result = resolvePropertyTargetFromString('not a valid pattern', context);
      expect(result).toBeNull();
    });
  });

  describe('resolvePropertyTargetFromNode', () => {
    it('should resolve propertyOfExpression nodes', async () => {
      const node: PropertyOfExpressionNode = {
        type: 'propertyOfExpression',
        property: { type: 'identifier', name: 'innerHTML' },
        target: { type: 'idSelector', value: '#test-target' } as any,
      };

      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const result = await resolvePropertyTargetFromNode(node, evaluator as any, context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
      expect(result!.property).toBe('innerHTML');
    });

    it('should handle array results (take first element)', async () => {
      const node: PropertyOfExpressionNode = {
        type: 'propertyOfExpression',
        property: { type: 'identifier', name: 'textContent' },
        target: { type: 'selector', value: 'div' } as any,
      };

      const evaluator = { evaluate: async () => [testElement] };
      const context = createMockContext();

      const result = await resolvePropertyTargetFromNode(node, evaluator as any, context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
    });

    it('should return null for non-element targets', async () => {
      const node: PropertyOfExpressionNode = {
        type: 'propertyOfExpression',
        property: { type: 'identifier', name: 'innerHTML' },
        target: { type: 'literal', value: 'not an element' } as any,
      };

      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const result = await resolvePropertyTargetFromNode(node, evaluator as any, context);
      expect(result).toBeNull();
    });
  });

  describe('resolvePropertyTargetFromAccessNode', () => {
    it('should resolve propertyAccess nodes from semantic parser', async () => {
      const node: PropertyAccessNode = {
        type: 'propertyAccess',
        object: { type: 'idSelector', value: '#test-target' } as any,
        property: 'innerHTML',
      };

      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const result = await resolvePropertyTargetFromAccessNode(node, evaluator as any, context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
      expect(result!.property).toBe('innerHTML');
    });

    it('should handle array results (take first element)', async () => {
      const node: PropertyAccessNode = {
        type: 'propertyAccess',
        object: { type: 'selector', value: 'div' } as any,
        property: 'textContent',
      };

      const evaluator = { evaluate: async () => [testElement] };
      const context = createMockContext();

      const result = await resolvePropertyTargetFromAccessNode(node, evaluator as any, context);

      expect(result).not.toBeNull();
      expect(result!.element).toBe(testElement);
    });

    it('should return null for non-element targets', async () => {
      const node: PropertyAccessNode = {
        type: 'propertyAccess',
        object: { type: 'literal', value: 'not an element' } as any,
        property: 'innerHTML',
      };

      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const result = await resolvePropertyTargetFromAccessNode(node, evaluator as any, context);
      expect(result).toBeNull();
    });

    it('should return null if property is empty', async () => {
      const node: PropertyAccessNode = {
        type: 'propertyAccess',
        object: { type: 'idSelector', value: '#test-target' } as any,
        property: '',
      };

      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const result = await resolvePropertyTargetFromAccessNode(node, evaluator as any, context);
      expect(result).toBeNull();
    });
  });
});

describe('togglePropertyTarget', () => {
  let testElement: HTMLElement;
  let target: PropertyTarget;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.id = 'test-el';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  it('should toggle hidden property (boolean)', () => {
    target = { element: testElement, property: 'hidden' };

    expect(testElement.hidden).toBe(false);

    const result1 = togglePropertyTarget(target);
    expect(result1).toBe(true);
    expect(testElement.hidden).toBe(true);

    const result2 = togglePropertyTarget(target);
    expect(result2).toBe(false);
    expect(testElement.hidden).toBe(false);
  });

  it('should toggle disabled on button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    target = { element: button, property: 'disabled' };

    expect(button.disabled).toBe(false);

    togglePropertyTarget(target);
    expect(button.disabled).toBe(true);

    togglePropertyTarget(target);
    expect(button.disabled).toBe(false);

    document.body.removeChild(button);
  });

  it('should toggle checked on checkbox', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    document.body.appendChild(checkbox);

    target = { element: checkbox, property: 'checked' };

    expect(checkbox.checked).toBe(false);

    togglePropertyTarget(target);
    expect(checkbox.checked).toBe(true);

    togglePropertyTarget(target);
    expect(checkbox.checked).toBe(false);

    document.body.removeChild(checkbox);
  });

  it('should toggle numeric property (1 ↔ 0)', () => {
    // tabIndex is a numeric property
    testElement.tabIndex = 5;
    target = { element: testElement, property: 'tabIndex' };

    // Non-zero → 0
    const result1 = togglePropertyTarget(target);
    expect(result1).toBe(0);
    expect(testElement.tabIndex).toBe(0);

    // 0 → 1
    const result2 = togglePropertyTarget(target);
    expect(result2).toBe(1);
    expect(testElement.tabIndex).toBe(1);
  });

  it('should toggle string property (value ↔ empty, with restore)', () => {
    testElement.title = 'Hello World';
    target = { element: testElement, property: 'title' };

    // First toggle: save and clear
    const result1 = togglePropertyTarget(target);
    expect(result1).toBe('');
    expect(testElement.title).toBe('');

    // Second toggle: restore
    const result2 = togglePropertyTarget(target);
    expect(result2).toBe('Hello World');
    expect(testElement.title).toBe('Hello World');
  });
});
