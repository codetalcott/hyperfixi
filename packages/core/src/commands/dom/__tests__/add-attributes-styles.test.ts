/**
 * Unit Tests for AddCommand Attributes & Styles (Feature Restoration)
 *
 * Tests the restored V1 features: attributes and inline styles
 * Ensures 100% _hyperscript compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AddCommand } from '../add';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.id = 'test-element';

  return {
    me: meElement,
    you: null,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      return node;
    },
  };
}

// ========== Tests ==========

describe('AddCommand - Attribute Support (Feature Restoration)', () => {
  let command: AddCommand;

  beforeEach(() => {
    command = new AddCommand();
  });

  describe('parseInput - attribute syntax detection', () => {
    it('should detect bracket attribute syntax: [@data-test="value"]', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: '[@data-test="value"]' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-test');
        expect(input.value).toBe('value');
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should detect direct @ syntax: @data-value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: '@data-value' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-value');
        expect(input.value).toBe('');
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should parse attribute with single quotes', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: "[@aria-label='Test Label']" }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('aria-label');
        expect(input.value).toBe('Test Label');
      }
    });

    it('should parse attribute without value: [@disabled]', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: '[@disabled]' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('disabled');
        expect(input.value).toBe('');
      }
    });
  });

  describe('execute - attribute manipulation', () => {
    it('should add data attribute to element', () => {
      const context = createMockContext();
      const element = document.createElement('div');

      command.execute(
        { type: 'attribute', name: 'data-test', value: 'test-value', targets: [element] },
        context
      );

      expect(element.getAttribute('data-test')).toBe('test-value');
    });

    it('should add ARIA attribute', () => {
      const context = createMockContext();
      const element = document.createElement('button');

      command.execute(
        { type: 'attribute', name: 'aria-label', value: 'Click me', targets: [element] },
        context
      );

      expect(element.getAttribute('aria-label')).toBe('Click me');
    });

    it('should add boolean attribute with empty value', () => {
      const context = createMockContext();
      const element = document.createElement('input');

      command.execute(
        { type: 'attribute', name: 'disabled', value: '', targets: [element] },
        context
      );

      expect(element.hasAttribute('disabled')).toBe(true);
      expect(element.getAttribute('disabled')).toBe('');
    });

    it('should add attribute to multiple elements', () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');

      command.execute(
        { type: 'attribute', name: 'data-group', value: 'test', targets: [el1, el2, el3] },
        context
      );

      expect(el1.getAttribute('data-group')).toBe('test');
      expect(el2.getAttribute('data-group')).toBe('test');
      expect(el3.getAttribute('data-group')).toBe('test');
    });

    it('should overwrite existing attribute value', () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.setAttribute('data-value', 'old');

      command.execute(
        { type: 'attribute', name: 'data-value', value: 'new', targets: [element] },
        context
      );

      expect(element.getAttribute('data-value')).toBe('new');
    });
  });

  describe('validate - attribute input', () => {
    it('should validate correct attribute input', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute' as const, name: 'data-test', value: 'test', targets: [element] };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject attribute input without name', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute' as const, value: 'test', targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject attribute input with empty name', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute' as const, name: '', value: 'test', targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject attribute input without value', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute' as const, name: 'data-test', targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should accept attribute input with empty string value', () => {
      const element = document.createElement('div');
      const input = { type: 'attribute' as const, name: 'disabled', value: '', targets: [element] };
      expect(command.validate(input)).toBe(true);
    });
  });
});

describe('AddCommand - Style Support (Feature Restoration)', () => {
  let command: AddCommand;

  beforeEach(() => {
    command = new AddCommand();
  });

  describe('parseInput - style syntax detection', () => {
    it('should detect object literal styles: { opacity: "0.5" }', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: { opacity: '0.5', color: 'red' } }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.styles).toEqual({ opacity: '0.5', color: 'red' });
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should detect CSS property shorthand: *opacity', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: '*opacity' }, { value: '0.5' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.styles).toEqual({ opacity: '0.5' });
      }
    });

    it('should detect CSS property with dash: *background-color', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ value: '*background-color' }, { value: 'blue' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.styles).toEqual({ 'background-color': 'blue' });
      }
    });

    it('should throw error if *property has no value argument', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          { args: [{ value: '*opacity' }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('add *property requires a value argument');
    });
  });

  describe('execute - style manipulation', () => {
    it('should add single inline style', () => {
      const context = createMockContext();
      const element = document.createElement('div');

      command.execute(
        { type: 'styles', styles: { opacity: '0.5' }, targets: [element] },
        context
      );

      expect(element.style.opacity).toBe('0.5');
    });

    it('should add multiple inline styles', () => {
      const context = createMockContext();
      const element = document.createElement('div');

      command.execute(
        { type: 'styles', styles: { opacity: '0.8', color: 'red', 'font-size': '16px' }, targets: [element] },
        context
      );

      expect(element.style.opacity).toBe('0.8');
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    it('should handle kebab-case property names', () => {
      const context = createMockContext();
      const element = document.createElement('div');

      command.execute(
        { type: 'styles', styles: { 'background-color': 'blue', 'margin-top': '10px' }, targets: [element] },
        context
      );

      expect(element.style.backgroundColor).toBe('blue');
      expect(element.style.marginTop).toBe('10px');
    });

    it('should add styles to multiple elements', () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');

      command.execute(
        { type: 'styles', styles: { opacity: '0.7', display: 'block' }, targets: [el1, el2] },
        context
      );

      expect(el1.style.opacity).toBe('0.7');
      expect(el1.style.display).toBe('block');
      expect(el2.style.opacity).toBe('0.7');
      expect(el2.style.display).toBe('block');
    });

    it('should overwrite existing style values', () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.style.opacity = '0.3';

      command.execute(
        { type: 'styles', styles: { opacity: '0.9' }, targets: [element] },
        context
      );

      expect(element.style.opacity).toBe('0.9');
    });
  });

  describe('validate - style input', () => {
    it('should validate correct styles input', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, styles: { opacity: '0.5' }, targets: [element] };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject styles input without styles object', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with null styles', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, styles: null as unknown as Record<string, string>, targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with array styles', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, styles: ['opacity', '0.5'] as unknown as Record<string, string>, targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with empty styles object', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, styles: {}, targets: [element] };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with non-string values', () => {
      const element = document.createElement('div');
      const input = { type: 'styles' as const, styles: { opacity: 0.5 } as unknown as Record<string, string>, targets: [element] };
      expect(command.validate(input)).toBe(false);
    });
  });
});
