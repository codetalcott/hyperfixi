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
  resolveAnyPropertyTarget,
  readPropertyTarget,
  writePropertyTarget,
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
      expect(isPropertyAccessNode({ type: 'propertyOfExpression', property: { name: 'x' } })).toBe(
        false
      );
      expect(isPropertyAccessNode(null)).toBe(false);
      expect(isPropertyAccessNode(undefined)).toBe(false);
      expect(isPropertyAccessNode('string')).toBe(false);
    });

    it('should return false if property is not a string', () => {
      expect(isPropertyAccessNode({ type: 'propertyAccess', object: {}, property: 123 })).toBe(
        false
      );
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

describe('readPropertyTarget', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.id = 'test-read';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  it('should read textContent property', () => {
    testElement.textContent = 'Hello World';
    const target: PropertyTarget = { element: testElement, property: 'textContent' };

    expect(readPropertyTarget(target)).toBe('Hello World');
  });

  it('should read innerHTML property', () => {
    testElement.innerHTML = '<span>Test</span>';
    const target: PropertyTarget = { element: testElement, property: 'innerHTML' };

    expect(readPropertyTarget(target)).toBe('<span>Test</span>');
  });

  it('should read value property on input', () => {
    const input = document.createElement('input');
    input.value = 'test value';
    document.body.appendChild(input);

    const target: PropertyTarget = { element: input, property: 'value' };

    expect(readPropertyTarget(target)).toBe('test value');

    document.body.removeChild(input);
  });

  it('should read boolean properties (disabled)', () => {
    const button = document.createElement('button');
    button.disabled = true;
    document.body.appendChild(button);

    const target: PropertyTarget = { element: button, property: 'disabled' };

    expect(readPropertyTarget(target)).toBe(true);

    document.body.removeChild(button);
  });

  it('should read boolean properties (checked)', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    document.body.appendChild(checkbox);

    const target: PropertyTarget = { element: checkbox, property: 'checked' };

    expect(readPropertyTarget(target)).toBe(true);

    document.body.removeChild(checkbox);
  });

  it('should read hidden property', () => {
    testElement.hidden = true;
    const target: PropertyTarget = { element: testElement, property: 'hidden' };

    expect(readPropertyTarget(target)).toBe(true);
  });

  it('should read CSS computed style with *property syntax', () => {
    // Set inline style first
    testElement.style.opacity = '0.5';
    const target: PropertyTarget = { element: testElement, property: '*opacity' };

    const result = readPropertyTarget(target);
    expect(result).toBe('0.5');
  });

  it('should read CSS computed display style', () => {
    testElement.style.display = 'flex';
    const target: PropertyTarget = { element: testElement, property: '*display' };

    const result = readPropertyTarget(target);
    expect(result).toBe('flex');
  });

  it('should read CSS computed color style', () => {
    testElement.style.color = 'red';
    const target: PropertyTarget = { element: testElement, property: '*color' };

    const result = readPropertyTarget(target);
    // Note: computed style may normalize to rgb format
    expect(result).toBeTruthy();
  });

  it('should read CSS hyphenated property with *property syntax', () => {
    testElement.style.backgroundColor = 'blue';
    const target: PropertyTarget = { element: testElement, property: '*background-color' };

    const result = readPropertyTarget(target);
    // Computed style normalizes to rgb format
    expect(result).toBeTruthy();
  });
});

describe('writePropertyTarget', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.id = 'test-write';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  it('should write textContent property', () => {
    const target: PropertyTarget = { element: testElement, property: 'textContent' };

    writePropertyTarget(target, 'New Content');

    expect(testElement.textContent).toBe('New Content');
  });

  it('should write innerHTML property', () => {
    const target: PropertyTarget = { element: testElement, property: 'innerHTML' };

    writePropertyTarget(target, '<em>Emphasized</em>');

    expect(testElement.innerHTML).toBe('<em>Emphasized</em>');
  });

  it('should write value property on input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const target: PropertyTarget = { element: input, property: 'value' };

    writePropertyTarget(target, 'new input value');

    expect(input.value).toBe('new input value');

    document.body.removeChild(input);
  });

  it('should write boolean properties (disabled)', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const target: PropertyTarget = { element: button, property: 'disabled' };

    writePropertyTarget(target, true);
    expect(button.disabled).toBe(true);

    writePropertyTarget(target, false);
    expect(button.disabled).toBe(false);

    document.body.removeChild(button);
  });

  it('should write hidden property', () => {
    const target: PropertyTarget = { element: testElement, property: 'hidden' };

    writePropertyTarget(target, true);
    expect(testElement.hidden).toBe(true);

    writePropertyTarget(target, false);
    expect(testElement.hidden).toBe(false);
  });

  it('should write CSS inline style with *property syntax', () => {
    const target: PropertyTarget = { element: testElement, property: '*opacity' };

    writePropertyTarget(target, '0.5');

    expect(testElement.style.opacity).toBe('0.5');
  });

  it('should write CSS display style with *property syntax', () => {
    const target: PropertyTarget = { element: testElement, property: '*display' };

    writePropertyTarget(target, 'flex');

    expect(testElement.style.display).toBe('flex');
  });

  it('should write CSS hyphenated property with *property syntax', () => {
    const target: PropertyTarget = { element: testElement, property: '*background-color' };

    writePropertyTarget(target, 'red');

    expect(testElement.style.backgroundColor).toBe('red');
  });

  it('should write and read CSS style round-trip', () => {
    const target: PropertyTarget = { element: testElement, property: '*opacity' };

    writePropertyTarget(target, '0.7');
    const result = readPropertyTarget(target);

    expect(result).toBe('0.7');
  });
});

describe('resolveAnyPropertyTarget', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.id = 'any-target';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  it('should resolve propertyOfExpression nodes', async () => {
    const node: PropertyOfExpressionNode = {
      type: 'propertyOfExpression',
      property: { type: 'identifier', name: 'innerHTML' },
      target: { type: 'idSelector', value: '#any-target' } as any,
    };

    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(node as any, evaluator as any, context);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(testElement);
    expect(result!.property).toBe('innerHTML');
  });

  it('should resolve propertyAccess nodes', async () => {
    const node: PropertyAccessNode = {
      type: 'propertyAccess',
      object: { type: 'idSelector', value: '#any-target' } as any,
      property: 'textContent',
    };

    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(node as any, evaluator as any, context);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(testElement);
    expect(result!.property).toBe('textContent');
  });

  it('should resolve possessiveExpression nodes with @attribute syntax', async () => {
    const node = {
      type: 'possessiveExpression',
      object: { type: 'idSelector', value: '#any-target' },
      property: { type: 'identifier', name: '@hidden' },
    };

    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(node as any, evaluator as any, context);

    expect(result).not.toBeNull();
    expect(result!.element).toBe(testElement);
    expect(result!.property).toBe('@hidden');
  });

  it('should return null for possessiveExpression with plain property', async () => {
    // Plain properties like 'hidden' should NOT be intercepted as property targets
    // in possessive expressions — they are normal property access (returns value)
    const node = {
      type: 'possessiveExpression',
      object: { type: 'idSelector', value: '#any-target' },
      property: { type: 'identifier', name: 'hidden' },
    };

    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(node as any, evaluator as any, context);

    expect(result).toBeNull();
  });

  it('should return null for unsupported node types', async () => {
    const node = {
      type: 'literal',
      value: 'not a property target',
    };

    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(node as any, evaluator as any, context);
    expect(result).toBeNull();
  });

  it('should return null for null node', async () => {
    const evaluator = createMockEvaluator();
    const context = createMockContext();

    const result = await resolveAnyPropertyTarget(null as any, evaluator as any, context);
    expect(result).toBeNull();
  });
});
