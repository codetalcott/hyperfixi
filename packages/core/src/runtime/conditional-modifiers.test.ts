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
import { CommandAdapterV2, type CommandWithParseInput } from './command-adapter';
import type { ExecutionContext, TypedExecutionContext } from '../types/core';
import type { ASTNode } from '../types/base-types';

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
class MockCommand implements CommandWithParseInput {
  name = 'mockCommand';
  metadata = {
    description: 'Mock command for testing',
    syntax: 'mock',
    examples: [] as string[],
  };

  executionCount = 0;

  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, any> },
    _evaluator: unknown,
    _context: ExecutionContext
  ): Promise<{ executed: boolean }> {
    return { executed: true };
  }

  async execute(_input: { executed: boolean }, _context: TypedExecutionContext): Promise<void> {
    this.executionCount++;
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
          when: { type: 'expression', value: true } as unknown as ASTNode,
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
          when: { type: 'expression', value: false } as unknown as ASTNode,
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
        type: 'expression',
        operator: 'is not',
        left: { type: 'identifier', name: 'result' },
        right: { type: 'literal', value: 'empty' },
      } as unknown as ASTNode;

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
          where: { type: 'expression', value: true } as unknown as ASTNode,
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
          where: { type: 'expression', value: false } as unknown as ASTNode,
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

      const mockCommand1 = new MockCommand();
      const mockCommand2 = new MockCommand();
      const adapter1 = new CommandAdapterV2(mockCommand1, mockEvaluator as any);
      const adapter2 = new CommandAdapterV2(mockCommand2, mockEvaluator as any);

      // Execute with 'when'
      await adapter1.execute(context, {
        args: [],
        modifiers: { when: { type: 'expression', value: true } as unknown as ASTNode },
      });

      // Execute with 'where'
      await adapter2.execute(context, {
        args: [],
        modifiers: { where: { type: 'expression', value: true } as unknown as ASTNode },
      });

      // Both should have executed
      expect(mockCommand1.executionCount).toBe(1);
      expect(mockCommand2.executionCount).toBe(1);
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
        modifiers: { when: { type: 'expression', value: 0 } as unknown as ASTNode },
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
        modifiers: { when: { type: 'expression', value: '' } as unknown as ASTNode },
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
        modifiers: { when: { type: 'expression', value: null } as unknown as ASTNode },
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
        modifiers: { when: { type: 'expression', value: 'non-empty' } as unknown as ASTNode },
      });

      expect(mockCommand.executionCount).toBe(1);
    });
  });
});
