/**
 * Unit Tests for TakeCommand (Standalone V2)
 *
 * Tests property/class/attribute transfer between elements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TakeCommand } from '../take';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as any).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('TakeCommand (Standalone V2)', () => {
  let command: TakeCommand;

  beforeEach(() => {
    command = new TakeCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('take');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have dom-mutation and property-transfer side effects', () => {
      expect(command.metadata.sideEffects).toContain('dom-mutation');
      expect(command.metadata.sideEffects).toContain('property-transfer');
    });

    it('should have correct category', () => {
      expect(command.metadata.category).toBe('animation');
    });
  });

  describe('parseInput', () => {
    it('should parse basic take syntax', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'class' } as any,
            { type: 'identifier', name: 'from' } as any,
            { type: 'literal', value: '#source' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.property).toBe('class');
      expect(input.source).toBe('#source');
      expect(input.target).toBeUndefined();
    });

    it('should parse take with explicit target', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '@data-value' } as any,
            { type: 'identifier', name: 'from' } as any,
            { type: 'literal', value: '#source' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'identifier', name: 'put' } as any,
            { type: 'identifier', name: 'it' } as any,
            { type: 'identifier', name: 'on' } as any,
            { type: 'literal', value: '#target' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.property).toBe('@data-value');
      expect(input.source).toBe('#source');
      expect(input.target).toBe('#target');
    });

    it('should parse take with target from modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '.active' } as any,
            { type: 'identifier', name: 'from' } as any,
            { type: 'literal', value: '#source' } as any,
          ],
          modifiers: { on: { type: 'literal', value: '#target' } as any },
        },
        evaluator,
        context
      );

      expect(input.property).toBe('.active');
      expect(input.target).toBe('#target');
    });

    it('should throw error when missing from keyword', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          {
            args: [
              { type: 'literal', value: 'class' } as any,
              { type: 'identifier', name: 'to' } as any,
              { type: 'literal', value: '#source' } as any,
            ],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow('take syntax: take <property> from <source>');
    });

    it('should throw error when too few arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          {
            args: [{ type: 'literal', value: 'class' } as any],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow('take requires property, "from", and source');
    });
  });

  describe('takeProperty - classes', () => {
    it('should take all classes', () => {
      const element = document.createElement('div');
      element.className = 'foo bar baz';

      const result = (command as any).takeProperty(element, 'class');

      expect(result).toEqual(['foo', 'bar', 'baz']);
      expect(element.className).toBe('');
    });

    it('should take all classes using "classes" keyword', () => {
      const element = document.createElement('div');
      element.className = 'foo bar';

      const result = (command as any).takeProperty(element, 'classes');

      expect(result).toEqual(['foo', 'bar']);
      expect(element.className).toBe('');
    });

    it('should take single class with dot notation', () => {
      const element = document.createElement('div');
      element.classList.add('foo', 'bar');

      const result = (command as any).takeProperty(element, '.foo');

      expect(result).toBe('foo');
      expect(element.classList.contains('foo')).toBe(false);
      expect(element.classList.contains('bar')).toBe(true);
    });

    it('should return null when class not found', () => {
      const element = document.createElement('div');

      const result = (command as any).takeProperty(element, '.nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('takeProperty - attributes', () => {
    it('should take attribute with @ notation', () => {
      const element = document.createElement('div');
      element.setAttribute('data-value', 'test');

      const result = (command as any).takeProperty(element, '@data-value');

      expect(result).toBe('test');
      expect(element.hasAttribute('data-value')).toBe(false);
    });

    it('should take data attribute directly', () => {
      const element = document.createElement('div');
      element.setAttribute('data-id', '123');

      const result = (command as any).takeProperty(element, 'data-id');

      expect(result).toBe('123');
      expect(element.hasAttribute('data-id')).toBe(false);
    });

    it('should take id attribute', () => {
      const element = document.createElement('div');
      element.id = 'test-id';

      const result = (command as any).takeProperty(element, 'id');

      expect(result).toBe('test-id');
      expect(element.id).toBe('');
    });

    it('should take title attribute', () => {
      const element = document.createElement('div');
      element.title = 'Test Title';

      const result = (command as any).takeProperty(element, 'title');

      expect(result).toBe('Test Title');
      expect(element.title).toBe('');
    });

    it('should take value from input element', () => {
      const element = document.createElement('input');
      element.value = 'test value';

      const result = (command as any).takeProperty(element, 'value');

      expect(result).toBe('test value');
      expect(element.value).toBe('');
    });
  });

  describe('takeProperty - styles', () => {
    it('should take style property with camelCase', () => {
      const element = document.createElement('div');
      element.style.backgroundColor = 'red';

      const result = (command as any).takeProperty(element, 'background-color');

      expect(result).toBe('red');
      expect(element.style.backgroundColor).toBe('');
    });

    it('should take style property directly', () => {
      const element = document.createElement('div');
      element.style.color = 'blue';

      const result = (command as any).takeProperty(element, 'color');

      expect(result).toBe('blue');
      expect(element.style.color).toBe('');
    });
  });

  describe('takeProperty - generic', () => {
    it('should take generic attribute without hyphen', () => {
      const element = document.createElement('div');
      element.setAttribute('customattr', 'custom value');

      const result = (command as any).takeProperty(element, 'customattr');

      expect(result).toBe('custom value');
      expect(element.hasAttribute('customattr')).toBe(false);
    });

    it('should return null when attribute not found', () => {
      const element = document.createElement('div');

      const result = (command as any).takeProperty(element, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('putProperty - classes', () => {
    it('should put array of classes', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'class', ['foo', 'bar']);

      expect(element.classList.contains('foo')).toBe(true);
      expect(element.classList.contains('bar')).toBe(true);
    });

    it('should put single class string', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'classes', 'foo bar');

      expect(element.className).toBe('foo bar');
    });

    it('should put class with dot notation', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, '.active', 'active');

      expect(element.classList.contains('active')).toBe(true);
    });

    it('should skip null values', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'class', null);

      expect(element.className).toBe('');
    });

    it('should skip undefined values', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'class', undefined);

      expect(element.className).toBe('');
    });
  });

  describe('putProperty - attributes', () => {
    it('should put attribute with @ notation', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, '@data-value', 'test');

      expect(element.getAttribute('data-value')).toBe('test');
    });

    it('should put data attribute directly', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'data-id', '123');

      expect(element.getAttribute('data-id')).toBe('123');
    });

    it('should put id attribute', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'id', 'new-id');

      expect(element.id).toBe('new-id');
    });

    it('should put title attribute', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'title', 'New Title');

      expect(element.title).toBe('New Title');
    });

    it('should put value on input element', () => {
      const element = document.createElement('input');

      (command as any).putProperty(element, 'value', 'new value');

      expect(element.value).toBe('new value');
    });
  });

  describe('putProperty - styles', () => {
    it('should put style property with camelCase', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'background-color', 'red');

      expect(element.style.backgroundColor).toBe('red');
    });

    it('should put style property directly', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'color', 'blue');

      expect(element.style.color).toBe('blue');
    });
  });

  describe('putProperty - generic', () => {
    it('should put generic attribute without hyphen', () => {
      const element = document.createElement('div');

      (command as any).putProperty(element, 'customattr', 'custom value');

      expect(element.getAttribute('customattr')).toBe('custom value');
    });
  });

  describe('execute', () => {
    it('should transfer class from source to target', async () => {
      const context = createMockContext();
      const source = document.createElement('div');
      const target = document.createElement('div');
      source.className = 'foo bar';
      document.body.appendChild(source);
      document.body.appendChild(target);
      source.id = 'source';
      target.id = 'target';

      const result = await command.execute(
        {
          property: 'class',
          source: '#source',
          target: '#target',
        },
        context
      );

      expect(source.className).toBe('');
      expect(target.classList.contains('foo')).toBe(true);
      expect(target.classList.contains('bar')).toBe(true);
      expect(result.targetElement).toBe(target);
      expect(result.property).toBe('class');

      document.body.removeChild(source);
      document.body.removeChild(target);
    });

    it('should transfer attribute from source to target', async () => {
      const context = createMockContext();
      const source = document.createElement('div');
      const target = document.createElement('div');
      source.setAttribute('data-value', 'test');
      document.body.appendChild(source);
      document.body.appendChild(target);
      source.id = 'source';
      target.id = 'target';

      const result = await command.execute(
        {
          property: '@data-value',
          source: '#source',
          target: '#target',
        },
        context
      );

      expect(source.hasAttribute('data-value')).toBe(false);
      expect(target.getAttribute('data-value')).toBe('test');
      expect(result.value).toBe('test');

      document.body.removeChild(source);
      document.body.removeChild(target);
    });

    it('should default target to context.me when not specified', async () => {
      const context = createMockContext();
      const source = document.createElement('div');
      const target = document.createElement('div');
      source.className = 'active';
      context.me = target;
      document.body.appendChild(source);
      source.id = 'source';

      const result = await command.execute(
        {
          property: 'class',
          source: '#source',
        },
        context
      );

      expect(source.className).toBe('');
      expect(target.classList.contains('active')).toBe(true);
      expect(result.targetElement).toBe(target);

      document.body.removeChild(source);
    });
  });

  describe('integration', () => {
    it('should work end-to-end for class transfer', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const source = document.createElement('div');
      const target = document.createElement('div');
      source.className = 'foo bar';
      document.body.appendChild(source);
      document.body.appendChild(target);
      source.id = 'source';
      target.id = 'target';

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'class' } as any,
            { type: 'identifier', name: 'from' } as any,
            { type: 'literal', value: '#source' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'identifier', name: 'put' } as any,
            { type: 'identifier', name: 'it' } as any,
            { type: 'identifier', name: 'on' } as any,
            { type: 'literal', value: '#target' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(source.className).toBe('');
      expect(target.classList.contains('foo')).toBe(true);
      expect(target.classList.contains('bar')).toBe(true);
      expect(result.targetElement).toBe(target);

      document.body.removeChild(source);
      document.body.removeChild(target);
    });

    it('should work end-to-end for attribute transfer', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const source = document.createElement('div');
      const target = document.createElement('div');
      source.setAttribute('data-id', '123');
      document.body.appendChild(source);
      document.body.appendChild(target);
      source.id = 'source';
      target.id = 'target';

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: '@data-id' } as any,
            { type: 'identifier', name: 'from' } as any,
            { type: 'literal', value: '#source' } as any,
            { type: 'identifier', name: 'and' } as any,
            { type: 'identifier', name: 'put' } as any,
            { type: 'identifier', name: 'it' } as any,
            { type: 'identifier', name: 'on' } as any,
            { type: 'literal', value: '#target' } as any,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(source.hasAttribute('data-id')).toBe(false);
      expect(target.getAttribute('data-id')).toBe('123');
      expect(result.value).toBe('123');

      document.body.removeChild(source);
      document.body.removeChild(target);
    });
  });
});
