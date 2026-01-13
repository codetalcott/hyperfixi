/**
 * Unit Tests for MorphCommand (Standalone V2)
 *
 * Tests the keyword extraction and parsing logic for the morph command.
 * Focuses on AST node inspection for 'with', 'over', and 'using' keywords.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MorphCommand } from '../swap';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// Helper to create mock AST nodes with identifier type (for keywords)
function mockIdentifier(name: string): ASTNode {
  return { type: 'identifier', name } as ASTNode;
}

// Helper to create mock AST nodes with literal type
function mockLiteral<T>(value: T): ASTNode {
  return { type: 'literal', value } as ASTNode;
}

// Helper to create mock AST nodes with selector type
function mockSelector(value: string): ASTNode {
  return { type: 'selector', value } as ASTNode;
}

// Helper to create inline mock evaluator
function inlineEvaluator(valueMap: Map<ASTNode, unknown>): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode) => valueMap.get(node) ?? null,
  } as unknown as ExpressionEvaluator;
}

// Helper to create simple evaluator that returns literal values
function simpleEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode) => {
      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.type === 'literal') return nodeObj.value;
      if (nodeObj.type === 'selector') return nodeObj.value;
      if (nodeObj.type === 'identifier') return nodeObj.name;
      return null;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Test Utilities ==========

function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;

  if (!element) {
    throw new Error(`Failed to create element from HTML: ${html}`);
  }

  document.body.appendChild(element);
  return element;
}

function cleanupElement(element: HTMLElement): void {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function createMockContext(me: HTMLElement): ExecutionContext & TypedExecutionContext {
  return {
    me,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: me,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

// ========== Tests ==========

describe('MorphCommand (Standalone V2)', () => {
  let command: MorphCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new MorphCommand();
  });

  afterEach(() => {
    testElements.forEach(el => cleanupElement(el));
    testElements = [];
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('morph');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('morph');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput - keyword extraction', () => {
    it('should parse "morph #target with content" syntax', async () => {
      const element = createTestElement('<div id="target">Original</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST: [selector:#target, identifier:with, literal:content]
      const targetNode = mockSelector('#target');
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('<div>New content</div>');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#target'],
        [contentNode, '<div>New content</div>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('target');
      expect(input.content).toBe('<div>New content</div>');
      expect(input.strategy).toBe('morph');
    });

    it('should parse "morph over #target with content" syntax', async () => {
      const element = createTestElement('<div id="outer">Original</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST: [identifier:over, selector:#outer, identifier:with, literal:content]
      const overNode = mockIdentifier('over');
      const targetNode = mockSelector('#outer');
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('<span>Replaced</span>');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#outer'],
        [contentNode, '<span>Replaced</span>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [overNode, targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('outer');
      expect(input.content).toBe('<span>Replaced</span>');
      expect(input.strategy).toBe('morphOuter');
    });

    it('should parse "using view transition" modifier', async () => {
      const element = createTestElement('<div id="animated">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST: [selector:#animated, identifier:with, literal:content, identifier:using, identifier:view, identifier:transition]
      const targetNode = mockSelector('#animated');
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('<div>Updated</div>');
      const usingNode = mockIdentifier('using');
      const viewNode = mockIdentifier('view');
      const transitionNode = mockIdentifier('transition');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#animated'],
        [contentNode, '<div>Updated</div>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        {
          args: [targetNode, withNode, contentNode, usingNode, viewNode, transitionNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.useViewTransition).toBe(true);
    });

    it('should fallback to positional args when no keywords present', async () => {
      const element = createTestElement('<div id="fallback">Original</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST: [selector:#fallback, literal:content] (no 'with' keyword)
      const targetNode = mockSelector('#fallback');
      const contentNode = mockLiteral('<p>Fallback content</p>');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#fallback'],
        [contentNode, '<p>Fallback content</p>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [targetNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('fallback');
      expect(input.content).toBe('<p>Fallback content</p>');
    });

    it('should handle case-insensitive keywords', async () => {
      const element = createTestElement('<div id="case-test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST with uppercase keywords
      const targetNode = mockSelector('#case-test');
      const withNode = mockIdentifier('WITH'); // uppercase
      const contentNode = mockLiteral('content');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#case-test'],
        [contentNode, 'content'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('case-test');
    });
  });

  describe('parseInput - error handling', () => {
    it('should throw error when no arguments provided', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = simpleEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('command requires arguments');
    });

    it('should throw error when target cannot be determined', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // Only 'with' keyword, no target before it
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('content');

      const valueMap = new Map<ASTNode, unknown>([[contentNode, 'content']]);
      const evaluator = inlineEvaluator(valueMap);

      await expect(
        command.parseInput({ args: [withNode, contentNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('could not determine target');
    });

    it('should throw error when target evaluates to invalid type', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const targetNode = mockLiteral(12345); // number, not selector
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('content');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, 12345],
        [contentNode, 'content'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      await expect(
        command.parseInput(
          { args: [targetNode, withNode, contentNode], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('target must be a selector or element');
    });
  });

  describe('parseInput - edge cases (bug regression)', () => {
    /**
     * This test verifies the fix for the bug where keywords embedded in
     * evaluated values would be incorrectly detected. For example, if a
     * variable name contained "with", the old implementation would fail.
     */
    it('should not confuse variable values with keywords', async () => {
      const element = createTestElement('<div id="real-target">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // AST: [selector:#real-target, identifier:with, identifier:variableWithKeyword]
      // The variable name contains "with" but it's not a keyword
      const targetNode = mockSelector('#real-target');
      const withKeyword = mockIdentifier('with');
      const contentVar = mockIdentifier('variableWithKeyword');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#real-target'],
        [contentVar, '<div>Content from variable</div>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [targetNode, withKeyword, contentVar], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('real-target');
      expect(input.content).toBe('<div>Content from variable</div>');
    });

    it('should handle literal nodes that look like keywords', async () => {
      const element = createTestElement('<div id="literal-test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // A literal string that happens to contain "with" should not be treated as keyword
      const targetNode = mockSelector('#literal-test');
      const withKeyword = mockIdentifier('with');
      const contentNode = mockLiteral('Replace with this content');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#literal-test'],
        [contentNode, 'Replace with this content'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      const input = await command.parseInput(
        { args: [targetNode, withKeyword, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.content).toBe('Replace with this content');
    });
  });

  describe('execute', () => {
    it('should morph target innerHTML with preserveChanges', async () => {
      const element = createTestElement('<div id="morph-exec"><p>Original</p></div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute(
        {
          targets: [element],
          content: '<p>Morphed</p>',
          strategy: 'morph',
          morphOptions: { preserveChanges: true },
          useViewTransition: false,
        },
        context
      );

      expect(element.innerHTML).toContain('Morphed');
    });

    it('should morph multiple targets', async () => {
      const el1 = createTestElement('<div class="multi-morph"><span>A</span></div>');
      const el2 = createTestElement('<div class="multi-morph"><span>B</span></div>');
      testElements.push(el1, el2);

      const context = createMockContext(el1);

      await command.execute(
        {
          targets: [el1, el2],
          content: '<span>Updated</span>',
          strategy: 'morph',
          morphOptions: { preserveChanges: true },
          useViewTransition: false,
        },
        context
      );

      expect(el1.innerHTML).toContain('Updated');
      expect(el2.innerHTML).toContain('Updated');
    });
  });

  describe('integration', () => {
    it('should complete morph end-to-end', async () => {
      const element = createTestElement('<div id="e2e"><p>Before</p></div>');
      testElements.push(element);

      const context = createMockContext(element);

      const targetNode = mockSelector('#e2e');
      const withNode = mockIdentifier('with');
      const contentNode = mockLiteral('<p>After</p>');

      const valueMap = new Map<ASTNode, unknown>([
        [targetNode, '#e2e'],
        [contentNode, '<p>After</p>'],
      ]);
      const evaluator = inlineEvaluator(valueMap);

      // Parse
      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify
      expect(element.innerHTML).toContain('After');
    });
  });
});
