/**
 * PutCommand Unit Tests
 *
 * Comprehensive tests for content insertion:
 * - Insert positions (into, before, after, at start of, at end of)
 * - Property targeting (#elem's innerHTML)
 * - Variable assignment (put value into myVar)
 * - HTML vs text content
 * - Element insertion
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PutCommand, createPutCommand, type PutCommandInput } from './put';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode, ExpressionNode } from '../../types/base-types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockElement(id: string = 'test'): HTMLElement {
  const element = document.createElement('div');
  element.id = id;
  element.innerHTML = '<span>Original</span>';
  // Add to document so querySelector works
  document.body.appendChild(element);
  return element;
}

function createMockContext(element?: HTMLElement): TypedExecutionContext {
  const mockElement = element || createMockElement();
  return {
    me: mockElement,
    you: null,
    locals: new Map(),
    globals: new Map(),
    result: undefined,
    halted: false,
    it: undefined,
  };
}

function createMockEvaluator(returnValues: Map<ASTNode, unknown> = new Map()): ExpressionEvaluator {
  return {
    evaluate: vi.fn(async (node: ASTNode) => {
      if (returnValues.has(node)) {
        return returnValues.get(node);
      }

      const nodeObj = node as Record<string, unknown>;

      if (nodeObj.type === 'selector' && typeof nodeObj.value === 'string') {
        return nodeObj.value;
      }

      if (nodeObj.type === 'string' || nodeObj.type === 'literal') {
        return nodeObj.value;
      }

      if (nodeObj.type === 'identifier') {
        if (nodeObj.name === 'me') return null;
        return nodeObj.name;
      }

      return null;
    }),
  } as unknown as ExpressionEvaluator;
}

function cleanupDocument(): void {
  document.body.innerHTML = '';
}

// =============================================================================
// Test Suite
// =============================================================================

describe('PutCommand', () => {
  let command: PutCommand;

  beforeEach(() => {
    command = new PutCommand();
  });

  afterEach(() => {
    cleanupDocument();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createPutCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('Parsing - Basic Syntax', () => {
    it('should parse basic put into syntax', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Hello World' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.value).toBe('Hello World');
      expect(input.position).toBe('replace');
      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('target');
    });

    it('should throw error if no arguments provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('put requires arguments');
    });

    it('should throw error if content missing', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const intoNode = { type: 'literal', value: 'into' } as ASTNode;

      await expect(
        command.parseInput({ args: [intoNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('put requires content');
    });
  });

  describe('Parsing - Position Keywords', () => {
    it('should map "into" to replace position', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Content' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.position).toBe('replace');
    });

    it('should map "before" to beforebegin position', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Content' } as ASTNode;
      const beforeNode = { type: 'literal', value: 'before' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, beforeNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.position).toBe('beforebegin');
    });

    it('should map "after" to afterend position', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Content' } as ASTNode;
      const afterNode = { type: 'literal', value: 'after' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, afterNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.position).toBe('afterend');
    });

    it('should map "at start of" to afterbegin position', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Content' } as ASTNode;
      const atStartNode = { type: 'literal', value: 'at start of' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, atStartNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.position).toBe('afterbegin');
    });

    it('should map "at end of" to beforeend position', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Content' } as ASTNode;
      const atEndNode = { type: 'literal', value: 'at end of' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, atEndNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.position).toBe('beforeend');
    });
  });

  describe('Parsing - Modifier Syntax', () => {
    it('should parse semantic parser format with into modifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const targetNode = { type: 'expression', value: '#target' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [contentNode], modifiers: { into: targetNode } },
        evaluator,
        context
      );

      expect(input.value).toBe('Hello');
      expect(input.position).toBe('replace');
      expect(input.targets).toHaveLength(1);
    });

    it('should parse semantic parser format with before modifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const targetNode = { type: 'expression', value: '#target' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [contentNode], modifiers: { before: targetNode } },
        evaluator,
        context
      );

      expect(input.position).toBe('beforebegin');
    });

    it('should parse semantic parser format with after modifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(createMockElement('target'));

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const targetNode = { type: 'expression', value: '#target' } as ExpressionNode;

      const input = await command.parseInput(
        { args: [contentNode], modifiers: { after: targetNode } },
        evaluator,
        context
      );

      expect(input.position).toBe('afterend');
    });
  });

  describe('Parsing - Target Resolution', () => {
    it('should resolve "me" as context.me', async () => {
      const evaluator = createMockEvaluator();
      const element = createMockElement('target');
      const context = createMockContext(element);

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const meNode = { type: 'identifier', name: 'me' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, meNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toContain(element);
    });

    it('should throw error if no elements found for selector', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const targetNode = { type: 'selector', value: '#nonexistent' } as ASTNode;

      await expect(
        command.parseInput(
          { args: [contentNode, intoNode, targetNode], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('No elements');
    });

    it('should resolve "me\'s textContent" as a property-write target', async () => {
      // Regression for item 1 in htmx-v4-reactive-streaming.md follow-ups:
      // `put X into me's textContent` used to evaluate me's textContent to the
      // element's current text and try to use that as a querySelectorAll selector.
      const element = createMockElement('textContent-target');
      const context = createMockContext(element);
      const targetNode = {
        type: 'possessiveExpression',
        object: { type: 'identifier', name: 'me' },
        property: { type: 'identifier', name: 'textContent' },
      } as unknown as ASTNode;
      const evaluator = createMockEvaluator(new Map([[targetNode.object as ASTNode, element]]));

      const contentNode = { type: 'string', value: 'Hello world' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([element]);
      expect(input.memberPath).toBe('textContent');
      expect(input.position).toBe('replace');
    });

    it('should resolve "#el\'s innerHTML" as a property-write target', async () => {
      const element = createMockElement('innerHTML-target');
      const context = createMockContext(element);
      const targetNode = {
        type: 'possessiveExpression',
        object: { type: 'idSelector', value: '#innerHTML-target' },
        property: { type: 'identifier', name: 'innerHTML' },
      } as unknown as ASTNode;
      const evaluator = createMockEvaluator(new Map([[targetNode.object as ASTNode, element]]));

      const contentNode = { type: 'string', value: '<b>x</b>' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([element]);
      expect(input.memberPath).toBe('innerHTML');
    });
  });

  describe('Parsing - Variable Assignment', () => {
    it('should detect variable assignment from identifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const varNode = { type: 'identifier', name: 'myVar' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, varNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.variableName).toBe('myVar');
      expect(input.targets).toEqual([]);
    });

    it('should detect variable assignment from literal', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const contentNode = { type: 'string', value: 42 } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const varNode = { type: 'literal', value: 'count' } as ASTNode;

      const input = await command.parseInput(
        { args: [contentNode, intoNode, varNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.variableName).toBe('count');
    });
  });

  describe('Execution - Content Insertion', () => {
    it('should insert text content with replace position', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: 'New Content',
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.textContent).toBe('New Content');
    });

    it('should insert HTML content with replace position', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: '<strong>Bold</strong>',
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.innerHTML).toBe('<strong>Bold</strong>');
    });

    it('should insert HTMLElement with replace position', async () => {
      const context = createMockContext();
      const target = createMockElement('target');
      const newElement = document.createElement('p');
      newElement.textContent = 'Paragraph';

      const input: PutCommandInput = {
        value: newElement,
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.querySelector('p')).toBe(newElement);
      expect(target.textContent).toBe('Paragraph');
    });

    it('should insert content before element', async () => {
      const context = createMockContext();
      const parent = document.createElement('div');
      const target = createMockElement('target');
      parent.appendChild(target);
      document.body.appendChild(parent);

      const input: PutCommandInput = {
        value: '<span>Before</span>',
        targets: [target],
        position: 'beforebegin',
      };

      await command.execute(input, context);

      expect(parent.innerHTML).toContain('<span>Before</span>');
      expect(parent.firstElementChild?.tagName).toBe('SPAN');
    });

    it('should insert content after element', async () => {
      const context = createMockContext();
      const parent = document.createElement('div');
      const target = createMockElement('target');
      parent.appendChild(target);
      document.body.appendChild(parent);

      const input: PutCommandInput = {
        value: '<span>After</span>',
        targets: [target],
        position: 'afterend',
      };

      await command.execute(input, context);

      expect(parent.innerHTML).toContain('<span>After</span>');
      expect(parent.lastElementChild?.tagName).toBe('SPAN');
    });

    it('should insert content at start of element', async () => {
      const context = createMockContext();
      const target = createMockElement('target');
      target.innerHTML = '<span>Existing</span>';

      const input: PutCommandInput = {
        value: '<strong>First</strong>',
        targets: [target],
        position: 'afterbegin',
      };

      await command.execute(input, context);

      expect(target.firstElementChild?.tagName).toBe('STRONG');
      expect(target.firstElementChild?.textContent).toBe('First');
    });

    it('should insert content at end of element', async () => {
      const context = createMockContext();
      const target = createMockElement('target');
      target.innerHTML = '<span>Existing</span>';

      const input: PutCommandInput = {
        value: '<strong>Last</strong>',
        targets: [target],
        position: 'beforeend',
      };

      await command.execute(input, context);

      expect(target.lastElementChild?.tagName).toBe('STRONG');
      expect(target.lastElementChild?.textContent).toBe('Last');
    });

    it('should handle multiple targets', async () => {
      const context = createMockContext();
      const target1 = createMockElement('target1');
      const target2 = createMockElement('target2');

      const input: PutCommandInput = {
        value: 'Shared Content',
        targets: [target1, target2],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target1.textContent).toBe('Shared Content');
      expect(target2.textContent).toBe('Shared Content');
    });
  });

  describe('Execution - Property Setting', () => {
    it('should set element property via memberPath', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: 'custom-value',
        targets: [target],
        position: 'replace',
        memberPath: 'className',
      };

      await command.execute(input, context);

      expect(target.className).toBe('custom-value');
    });

    it('should set nested property via dot notation', async () => {
      const context = createMockContext();
      const target = createMockElement('target') as any;
      // Create a nested object for testing
      target.customData = { nested: { value: null } };

      const input: PutCommandInput = {
        value: 'test-value',
        targets: [target],
        position: 'replace',
        memberPath: 'customData.nested',
      };

      await command.execute(input, context);

      expect(target.customData.nested).toBe('test-value');
    });

    it('should throw error if property path does not exist', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: 'value',
        targets: [target],
        position: 'replace',
        memberPath: 'nonexistent.property',
      };

      await expect(command.execute(input, context)).rejects.toThrow('Property path');
    });
  });

  describe('Execution - Variable Assignment', () => {
    it('should assign value to variable in context.locals', async () => {
      const context = createMockContext();

      const input: PutCommandInput = {
        value: 42,
        targets: [],
        position: 'replace',
        variableName: 'myVar',
      };

      const result = await command.execute(input, context);

      expect(context.locals.get('myVar')).toBe(42);
      expect(result).toBeUndefined();
    });

    it('should assign value to context property', async () => {
      const context = createMockContext() as any;

      const input: PutCommandInput = {
        value: 'Hello',
        targets: [],
        position: 'replace',
        variableName: 'greeting',
      };

      await command.execute(input, context);

      expect(context.greeting).toBe('Hello');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value as empty string', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: null,
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.textContent).toBe('');
    });

    it('should handle undefined value as empty string', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: undefined,
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.textContent).toBe('');
    });

    it('should convert numbers to strings', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: 123,
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.textContent).toBe('123');
    });

    it('should insert text without HTML interpretation if no tags', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: 'Plain text with < and > symbols',
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      // Should be inserted as text, not HTML
      expect(target.textContent).toContain('<');
      expect(target.textContent).toContain('>');
    });

    it('should handle empty string value', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: PutCommandInput = {
        value: '',
        targets: [target],
        position: 'replace',
      };

      await command.execute(input, context);

      expect(target.textContent).toBe('');
    });
  });

  describe('Return Values', () => {
    it('should return array of affected targets', async () => {
      const context = createMockContext();
      const target1 = createMockElement('target1');
      const target2 = createMockElement('target2');

      const input: PutCommandInput = {
        value: 'Content',
        targets: [target1, target2],
        position: 'replace',
      };

      const result = await command.execute(input, context);

      expect(result).toEqual([target1, target2]);
    });

    it('should return undefined for variable assignment', async () => {
      const context = createMockContext();

      const input: PutCommandInput = {
        value: 42,
        targets: [],
        position: 'replace',
        variableName: 'myVar',
      };

      const result = await command.execute(input, context);

      expect(result).toBeUndefined();
    });
  });

  describe('Parsing - Element Reference Targets', () => {
    it('should resolve HTMLElement from complex expression evaluation', async () => {
      const targetElement = createMockElement('resolved-target');
      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      // Simulate a complex expression node (e.g., "the first <.selector/> in me")
      const complexNode = { type: 'positionalExpression', operator: 'first' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(complexNode, targetElement);
      returnValues.set(contentNode, 'Hello');

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [contentNode, intoNode, complexNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toContain(targetElement);
      expect(input.variableName).toBeUndefined();
    });

    it('should resolve array of HTMLElements from expression evaluation', async () => {
      const el1 = createMockElement('el1');
      const el2 = createMockElement('el2');
      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const complexNode = { type: 'queryExpression', selector: '.items' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(complexNode, [el1, el2]);
      returnValues.set(contentNode, 'Hello');

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [contentNode, intoNode, complexNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(2);
      expect(input.targets).toContain(el1);
      expect(input.targets).toContain(el2);
    });

    it('should resolve identifier holding element reference as DOM target', async () => {
      const targetElement = createMockElement('var-target');
      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const varNode = { type: 'identifier', name: 'myElement' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(varNode, targetElement);
      returnValues.set(contentNode, 'Hello');

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [contentNode, intoNode, varNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toContain(targetElement);
      expect(input.variableName).toBeUndefined();
    });

    it('should fall back to variable assignment when identifier holds non-element', async () => {
      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const varNode = { type: 'identifier', name: 'myVar' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(varNode, 'just a string');
      returnValues.set(contentNode, 'Hello');

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [contentNode, intoNode, varNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.variableName).toBe('myVar');
      expect(input.targets).toEqual([]);
    });

    it('should fall back to variable assignment when identifier is null', async () => {
      const contentNode = { type: 'string', value: 42 } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const varNode = { type: 'identifier', name: 'newVar' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(varNode, null);
      returnValues.set(contentNode, 42);

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext();

      const input = await command.parseInput(
        { args: [contentNode, intoNode, varNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.variableName).toBe('newVar');
    });

    it('should fall through to context.me when expression evaluates to null', async () => {
      const meElement = createMockElement('me-element');
      const contentNode = { type: 'string', value: 'Hello' } as ASTNode;
      const intoNode = { type: 'literal', value: 'into' } as ASTNode;
      const complexNode = { type: 'positionalExpression', operator: 'first' } as ASTNode;

      const returnValues = new Map<ASTNode, unknown>();
      returnValues.set(complexNode, null);
      returnValues.set(contentNode, 'Hello');

      const evaluator = createMockEvaluator(returnValues);
      const context = createMockContext(meElement);

      const input = await command.parseInput(
        { args: [contentNode, intoNode, complexNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toContain(meElement);
    });

    it('should set context.it to assigned value after variable assignment', async () => {
      const context = createMockContext();
      (context as any).it = 'previous-value';

      const input: PutCommandInput = {
        value: 42,
        targets: [],
        position: 'replace',
        variableName: 'myVar',
      };

      await command.execute(input, context);

      expect(context.locals.get('myVar')).toBe(42);
      expect((context as any).it).toBe(42);
    });
  });
});
