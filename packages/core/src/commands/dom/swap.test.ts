/**
 * SwapCommand & MorphCommand Unit Tests
 *
 * Comprehensive tests for DOM swapping with morphing support:
 * - Swap strategies (morph, innerHTML, outerHTML, insert positions, delete)
 * - MorphCommand alias functionality
 * - Target resolution (selectors, elements)
 * - Content extraction (strings, HTML elements)
 * - View transition support
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SwapCommand,
  MorphCommand,
  createSwapCommand,
  createMorphCommand,
  type SwapCommandInput,
} from './swap';
import type { TypedExecutionContext } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { ASTNode } from '../../types/base-types';

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

function createMockContext(elements: HTMLElement[] = []): TypedExecutionContext {
  const mockElement = elements[0] || createMockElement();
  return {
    me: mockElement,
    locals: new Map(),
    target: null,
    result: undefined,
    halted: false,
    it: undefined,
  };
}

// Cleanup helper
function cleanupDocument(): void {
  document.body.innerHTML = '';
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

      if (nodeObj.type === 'identifier') {
        if (nodeObj.name === 'it') return '<div>New Content</div>';
        return nodeObj.name;
      }

      if (nodeObj.type === 'string' || nodeObj.type === 'literal') {
        return nodeObj.value;
      }

      return null;
    }),
  } as unknown as ExpressionEvaluator;
}

// =============================================================================
// SwapCommand Tests
// =============================================================================

describe('SwapCommand', () => {
  let command: SwapCommand;

  beforeEach(() => {
    command = new SwapCommand();
  });

  afterEach(() => {
    cleanupDocument();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createSwapCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('Parsing - Basic Syntax', () => {
    it('should parse basic swap with selector and content', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'identifier', name: 'it' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('morph');
      expect(input.targets).toHaveLength(1);
      expect(input.content).toBe('<div>New Content</div>');
    });

    it('should throw error if no arguments provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('swap: command requires arguments');
    });

    it('should throw error if cannot parse arguments', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const singleArg = { type: 'identifier', name: 'target' } as ASTNode;

      await expect(
        command.parseInput({ args: [singleArg], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('could not parse arguments');
    });
  });

  describe('Parsing - Swap Strategies', () => {
    it('should parse innerHTML strategy with "swap into" syntax', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const intoNode = { type: 'identifier', name: 'into' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [intoNode, targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('innerHTML');
      expect(input.content).toBe('<p>Content</p>');
    });

    it('should parse outerHTML strategy with "swap over" syntax', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const overNode = { type: 'identifier', name: 'over' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<div>New</div>' } as ASTNode;

      const input = await command.parseInput(
        { args: [overNode, targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('outerHTML');
    });

    it('should parse delete strategy', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const deleteNode = { type: 'identifier', name: 'delete' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;

      const input = await command.parseInput(
        { args: [deleteNode, targetNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('delete');
      expect(input.content).toBeNull();
    });

    it('should parse strategy keywords (beforeBegin, afterEnd, etc.)', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const strategies = ['beforeBegin', 'afterBegin', 'beforeEnd', 'afterEnd'];

      for (const strategyName of strategies) {
        const strategyNode = { type: 'identifier', name: strategyName } as ASTNode;
        const ofNode = { type: 'identifier', name: 'of' } as ASTNode;
        const targetNode = { type: 'selector', value: '#target' } as ASTNode;
        const withNode = { type: 'identifier', name: 'with' } as ASTNode;
        const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

        const input = await command.parseInput(
          { args: [strategyNode, ofNode, targetNode, withNode, contentNode], modifiers: {} },
          evaluator,
          context
        );

        expect(input.strategy).toBe(strategyName);
      }
    });
  });

  describe('Parsing - View Transition', () => {
    it('should detect "using view transition" modifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;
      const usingNode = { type: 'identifier', name: 'using' } as ASTNode;
      const viewNode = { type: 'identifier', name: 'view' } as ASTNode;
      const transitionNode = { type: 'identifier', name: 'transition' } as ASTNode;

      const input = await command.parseInput(
        {
          args: [targetNode, withNode, contentNode, usingNode, viewNode, transitionNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.useViewTransition).toBe(true);
    });

    it('should not set view transition if modifier incomplete', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;
      const usingNode = { type: 'identifier', name: 'using' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode, usingNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.useViewTransition).toBe(false);
    });
  });

  describe('Parsing - Target Resolution', () => {
    it('should accept HTMLElement as target directly', async () => {
      const evaluator = createMockEvaluator();
      const element = createMockElement('direct');
      const context = createMockContext([element]);

      const returnValues = new Map();
      const targetNode = { type: 'identifier', name: 'elem' } as ASTNode;
      returnValues.set(targetNode, element);
      const evaluatorWithElement = createMockEvaluator(returnValues);

      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluatorWithElement,
        context
      );

      expect(input.targets).toContain(element);
      expect(input.targets).toHaveLength(1);
    });

    it('should throw error if no elements found for selector', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext(); // No elements in context

      const targetNode = { type: 'selector', value: '#nonexistent' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      await expect(
        command.parseInput(
          { args: [targetNode, withNode, contentNode], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('no elements found');
    });
  });

  describe('Parsing - Binary Expression (strategy of target)', () => {
    it('should parse binary expression with "of" operator', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = {
        type: 'binaryExpression',
        operator: 'of',
        left: { type: 'identifier', name: 'innerHTML' },
        right: { type: 'selector', value: '#target' },
      } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('innerHTML');
      expect(input.targets).toHaveLength(1);
    });
  });

  describe('Execution', () => {
    it('should execute swap with morph strategy', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: SwapCommandInput = {
        targets: [target],
        content: '<div>New Content</div>',
        strategy: 'morph',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute swap with view transition', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: SwapCommandInput = {
        targets: [target],
        content: '<div>New Content</div>',
        strategy: 'morph',
        morphOptions: { preserveChanges: true },
        useViewTransition: true,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute swap with multiple targets', async () => {
      const context = createMockContext();
      const target1 = createMockElement('target1');
      const target2 = createMockElement('target2');

      const input: SwapCommandInput = {
        targets: [target1, target2],
        content: '<div>New Content</div>',
        strategy: 'innerHTML',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute delete strategy', async () => {
      const context = createMockContext();
      const target = createMockElement('target');
      const parent = document.createElement('div');
      parent.appendChild(target);

      const input: SwapCommandInput = {
        targets: [target],
        content: null,
        strategy: 'delete',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });
  });
});

// =============================================================================
// MorphCommand Tests
// =============================================================================

describe('MorphCommand', () => {
  let command: MorphCommand;

  beforeEach(() => {
    command = new MorphCommand();
  });

  afterEach(() => {
    cleanupDocument();
  });

  describe('Factory Function', () => {
    it('should create command instance via factory', () => {
      const cmd = createMorphCommand();
      expect(cmd).toBeDefined();
      expect(typeof cmd.execute).toBe('function');
    });
  });

  describe('Parsing - Basic Syntax', () => {
    it('should parse basic morph with selector and content', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'identifier', name: 'it' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('morph');
      expect(input.targets).toHaveLength(1);
      expect(input.content).toBe('<div>New Content</div>');
    });

    it('should throw error if no arguments provided', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('morph: command requires arguments');
    });

    it('should throw error if cannot determine target', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      await expect(
        command.parseInput({ args: [contentNode], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('could not determine target');
    });
  });

  describe('Parsing - MorphOuter Strategy', () => {
    it('should parse "morph over" syntax as morphOuter', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const overNode = { type: 'identifier', name: 'over' } as ASTNode;
      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<div>New</div>' } as ASTNode;

      const input = await command.parseInput(
        { args: [overNode, targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('morphOuter');
      expect(input.content).toBe('<div>New</div>');
    });

    it('should use morph strategy if no "over" keyword', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<div>New</div>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('morph');
    });
  });

  describe('Parsing - View Transition', () => {
    it('should detect "using view transition" modifier', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;
      const usingNode = { type: 'identifier', name: 'using' } as ASTNode;
      const viewNode = { type: 'identifier', name: 'view' } as ASTNode;
      const transitionNode = { type: 'identifier', name: 'transition' } as ASTNode;

      const input = await command.parseInput(
        {
          args: [targetNode, withNode, contentNode, usingNode, viewNode, transitionNode],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.useViewTransition).toBe(true);
    });
  });

  describe('Parsing - Target Types', () => {
    it('should accept string selector as target', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].id).toBe('target');
    });

    it('should accept HTMLElement as target directly', async () => {
      const element = createMockElement('direct');
      const context = createMockContext([element]);

      const returnValues = new Map();
      const targetNode = { type: 'identifier', name: 'elem' } as ASTNode;
      returnValues.set(targetNode, element);
      const evaluatorWithElement = createMockEvaluator(returnValues);

      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluatorWithElement,
        context
      );

      expect(input.targets).toContain(element);
    });

    it('should throw error if target is not selector or element', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext();

      const returnValues = new Map();
      const targetNode = { type: 'number', value: 42 } as ASTNode;
      returnValues.set(targetNode, 42);
      const evaluatorWithNumber = createMockEvaluator(returnValues);

      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      await expect(
        command.parseInput(
          { args: [targetNode, withNode, contentNode], modifiers: {} },
          evaluatorWithNumber,
          context
        )
      ).rejects.toThrow('target must be a selector or element');
    });
  });

  describe('Parsing - Fallback Syntax', () => {
    it('should parse fallback syntax without "with" keyword', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const contentNode = { type: 'string', value: '<p>Content</p>' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.strategy).toBe('morph');
      expect(input.targets).toHaveLength(1);
      expect(input.content).toBe('<p>Content</p>');
    });
  });

  describe('Execution', () => {
    it('should execute morph without view transition', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: SwapCommandInput = {
        targets: [target],
        content: '<div>New Content</div>',
        strategy: 'morph',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute morph with view transition', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: SwapCommandInput = {
        targets: [target],
        content: '<div>New Content</div>',
        strategy: 'morph',
        morphOptions: { preserveChanges: true },
        useViewTransition: true,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute morphOuter strategy', async () => {
      const context = createMockContext();
      const target = createMockElement('target');

      const input: SwapCommandInput = {
        targets: [target],
        content: '<div>Replacement</div>',
        strategy: 'morphOuter',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });

    it('should execute morph with multiple targets', async () => {
      const context = createMockContext();
      const target1 = createMockElement('target1');
      const target2 = createMockElement('target2');

      const input: SwapCommandInput = {
        targets: [target1, target2],
        content: '<div>New Content</div>',
        strategy: 'morph',
        morphOptions: { preserveChanges: true },
        useViewTransition: false,
      };

      await expect(command.execute(input, context)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null content gracefully', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'null', value: null } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.content).toBeNull();
    });

    it('should handle empty content string', async () => {
      const evaluator = createMockEvaluator();
      const context = createMockContext([createMockElement('target')]);

      const targetNode = { type: 'selector', value: '#target' } as ASTNode;
      const withNode = { type: 'identifier', name: 'with' } as ASTNode;
      const contentNode = { type: 'string', value: '' } as ASTNode;

      const input = await command.parseInput(
        { args: [targetNode, withNode, contentNode], modifiers: {} },
        evaluator,
        context
      );

      expect(input.content).toBe('');
    });
  });
});
