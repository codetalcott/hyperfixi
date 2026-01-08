/**
 * Tests for when/where conditional modifiers
 *
 * These modifiers allow any command to be conditionally executed:
 *   show #element when <condition>
 *   hide #element where <condition>
 *
 * Both 'when' and 'where' are treated as identical conditional guards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandAdapterV2 } from './command-adapter';
import type { ExecutionContext, TypedExecutionContext } from '../types/core';
import type { ASTNode, ExpressionNode } from '../types/base-types';
import type { CommandImplementation, CommandMetadata } from '../commands/decorators';

// ========== Test Utilities ==========

function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;
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

// Mock command that tracks execution
class MockCommand implements CommandImplementation<{ executed: boolean }, void, TypedExecutionContext> {
  name = 'mockCommand';
  metadata: CommandMetadata = {
    description: 'Mock command for testing',
    syntax: 'mock',
    examples: [],
    sideEffects: [],
  };

  executionCount = 0;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: unknown,
    _context: ExecutionContext
  ): Promise<{ executed: boolean }> {
    return { executed: true };
  }

  async execute(_input: { executed: boolean }, _context: TypedExecutionContext): Promise<void> {
    this.executionCount++;
  }

  validate(input: unknown): input is { executed: boolean } {
    return typeof input === 'object' && input !== null && 'executed' in input;
  }
}

// ========== Tests ==========

describe('when/where conditional modifiers', () => {
  let testElements: HTMLElement[] = [];
  let mockCommand: MockCommand;

  beforeEach(() => {
    mockCommand = new MockCommand();
  });

  afterEach(() => {
    testElements.forEach((el) => cleanupElement(el));
    testElements = [];
  });

  describe('when modifier', () => {
    it('should execute command when condition is true', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // Mock evaluator that returns true for the condition
      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(true),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      // Execute with when modifier set to true condition
      await adapter.execute(context, {
        args: [],
        modifiers: {
          when: { type: 'literal', value: true } as ExpressionNode,
        },
      });

      expect(mockCommand.executionCount).toBe(1);
    });

    it('should skip command when condition is false', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // Mock evaluator that returns false for the condition
      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(false),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      // Execute with when modifier set to false condition
      const result = await adapter.execute(context, {
        args: [],
        modifiers: {
          when: { type: 'literal', value: false } as ExpressionNode,
        },
      });

      expect(mockCommand.executionCount).toBe(0);
      expect(result).toBeUndefined();
    });

    it('should evaluate expression for condition', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      // Mock evaluator that evaluates the expression
      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(true),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      const conditionExpr = {
        type: 'binaryExpression',
        operator: 'is not',
        left: { type: 'identifier', name: 'result' },
        right: { type: 'literal', value: 'empty' },
      } as ExpressionNode;

      await adapter.execute(context, {
        args: [],
        modifiers: { when: conditionExpr },
      });

      // Verify the evaluator was called with the condition expression
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith(conditionExpr, context);
      expect(mockCommand.executionCount).toBe(1);
    });
  });

  describe('where modifier', () => {
    it('should execute command when condition is true', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(true),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: {
          where: { type: 'literal', value: true } as ExpressionNode,
        },
      });

      expect(mockCommand.executionCount).toBe(1);
    });

    it('should skip command when condition is false', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(false),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      const result = await adapter.execute(context, {
        args: [],
        modifiers: {
          where: { type: 'literal', value: false } as ExpressionNode,
        },
      });

      expect(mockCommand.executionCount).toBe(0);
      expect(result).toBeUndefined();
    });
  });

  describe('when and where equivalence', () => {
    it('should treat when and where identically', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(true),
      };

      const adapter1 = new CommandAdapterV2(new MockCommand(), mockEvaluator as any);
      const adapter2 = new CommandAdapterV2(new MockCommand(), mockEvaluator as any);

      // Execute with 'when'
      await adapter1.execute(context, {
        args: [],
        modifiers: { when: { type: 'literal', value: true } as ExpressionNode },
      });

      // Execute with 'where'
      await adapter2.execute(context, {
        args: [],
        modifiers: { where: { type: 'literal', value: true } as ExpressionNode },
      });

      // Both should have executed
      expect((adapter1 as any).impl.executionCount).toBe(1);
      expect((adapter2 as any).impl.executionCount).toBe(1);
    });
  });

  describe('no modifier', () => {
    it('should execute command normally without when/where', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue('some value'),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: {},
      });

      expect(mockCommand.executionCount).toBe(1);
    });
  });

  describe('falsy values', () => {
    it('should skip when condition evaluates to 0', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(0),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: { when: { type: 'literal', value: 0 } as ExpressionNode },
      });

      expect(mockCommand.executionCount).toBe(0);
    });

    it('should skip when condition evaluates to empty string', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(''),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: { when: { type: 'literal', value: '' } as ExpressionNode },
      });

      expect(mockCommand.executionCount).toBe(0);
    });

    it('should skip when condition evaluates to null', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue(null),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: { when: { type: 'literal', value: null } as ExpressionNode },
      });

      expect(mockCommand.executionCount).toBe(0);
    });

    it('should execute when condition evaluates to truthy value', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);

      const mockEvaluator = {
        evaluate: vi.fn().mockResolvedValue('non-empty'),
      };

      const adapter = new CommandAdapterV2(mockCommand, mockEvaluator as any);

      await adapter.execute(context, {
        args: [],
        modifiers: { when: { type: 'literal', value: 'non-empty' } as ExpressionNode },
      });

      expect(mockCommand.executionCount).toBe(1);
    });
  });
});
