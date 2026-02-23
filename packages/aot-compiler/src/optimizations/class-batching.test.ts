/**
 * Class Batching Optimization Pass Tests
 */

import { describe, it, expect } from 'vitest';
import { ClassBatchingPass } from './class-batching.js';
import type {
  ASTNode,
  AnalysisResult,
  CommandNode,
  SelectorNode,
  EventHandlerNode,
  BatchedClassOpsNode,
} from '../types/aot-types.js';

// =============================================================================
// HELPERS
// =============================================================================

function createAnalysis(commandsUsed: string[] = []): AnalysisResult {
  return {
    commandsUsed: new Set(commandsUsed),
    variables: { locals: new Map(), globals: new Map(), contextVars: new Set() },
    expressions: { pure: [], dynamic: [], selectors: [] },
    controlFlow: {
      hasAsync: false,
      hasLoops: false,
      hasConditionals: false,
      canThrow: false,
      maxNestingDepth: 0,
    },
    dependencies: { domQueries: [], eventTypes: [], behaviors: [], runtimeHelpers: [] },
    warnings: [],
  };
}

function classCmd(name: 'add' | 'remove' | 'toggle', className: string): CommandNode {
  return {
    type: 'command',
    name,
    args: [{ type: 'selector', value: `.${className}` } as SelectorNode],
  };
}

function classCmdWithTarget(
  name: 'add' | 'remove' | 'toggle',
  className: string,
  target: ASTNode
): CommandNode {
  return {
    type: 'command',
    name,
    args: [{ type: 'selector', value: `.${className}` } as SelectorNode],
    target,
  };
}

function otherCmd(name: string): CommandNode {
  return { type: 'command', name, args: [] };
}

function eventHandler(body: ASTNode[]): EventHandlerNode {
  return { type: 'event', event: 'click', body };
}

// =============================================================================
// TESTS
// =============================================================================

describe('ClassBatchingPass', () => {
  const pass = new ClassBatchingPass();

  describe('shouldRun', () => {
    it('returns true when add is used', () => {
      expect(pass.shouldRun(createAnalysis(['add']))).toBe(true);
    });

    it('returns true when remove is used', () => {
      expect(pass.shouldRun(createAnalysis(['remove']))).toBe(true);
    });

    it('returns true when toggle is used', () => {
      expect(pass.shouldRun(createAnalysis(['toggle']))).toBe(true);
    });

    it('returns false when no class commands are used', () => {
      expect(pass.shouldRun(createAnalysis(['set', 'put']))).toBe(false);
    });

    it('returns false with empty commands', () => {
      expect(pass.shouldRun(createAnalysis())).toBe(false);
    });
  });

  describe('transform', () => {
    const analysis = createAnalysis(['add', 'remove', 'toggle']);

    it('batches two consecutive add commands on implicit me', () => {
      const ast = eventHandler([classCmd('add', 'active'), classCmd('add', 'visible')]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);

      const batch = result.body![0] as BatchedClassOpsNode;
      expect(batch.type).toBe('batchedClassOps');
      expect(batch.target).toBe('_ctx.me');
      expect(batch.adds).toEqual(['active', 'visible']);
      expect(batch.removes).toEqual([]);
      expect(batch.toggles).toEqual([]);
    });

    it('batches mixed add/remove/toggle on implicit me', () => {
      const ast = eventHandler([
        classCmd('add', 'active'),
        classCmd('remove', 'hidden'),
        classCmd('toggle', 'selected'),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);

      const batch = result.body![0] as BatchedClassOpsNode;
      expect(batch.adds).toEqual(['active']);
      expect(batch.removes).toEqual(['hidden']);
      expect(batch.toggles).toEqual(['selected']);
    });

    it('breaks batch on non-class command', () => {
      const ast = eventHandler([
        classCmd('add', 'a'),
        classCmd('add', 'b'),
        otherCmd('wait'),
        classCmd('add', 'c'),
        classCmd('add', 'd'),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(3);

      // First batch: a, b
      const batch1 = result.body![0] as BatchedClassOpsNode;
      expect(batch1.type).toBe('batchedClassOps');
      expect(batch1.adds).toEqual(['a', 'b']);

      // Middle: wait command
      expect((result.body![1] as CommandNode).name).toBe('wait');

      // Second batch: c, d
      const batch2 = result.body![2] as BatchedClassOpsNode;
      expect(batch2.type).toBe('batchedClassOps');
      expect(batch2.adds).toEqual(['c', 'd']);
    });

    it('does not batch single class command', () => {
      const ast = eventHandler([classCmd('add', 'active')]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);
      expect(result.body![0].type).toBe('command');
    });

    it('does not batch commands with explicit targets', () => {
      const target = { type: 'selector', value: '#other' } as SelectorNode;
      const ast = eventHandler([
        classCmdWithTarget('add', 'active', target),
        classCmdWithTarget('add', 'visible', target),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      // Both should remain as individual commands (not batched)
      expect(result.body).toHaveLength(2);
      expect(result.body![0].type).toBe('command');
      expect(result.body![1].type).toBe('command');
    });

    it('does not batch when one has explicit target and one does not', () => {
      const target = { type: 'selector', value: '#other' } as SelectorNode;
      const ast = eventHandler([classCmd('add', 'a'), classCmdWithTarget('add', 'b', target)]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(2);
      expect(result.body![0].type).toBe('command');
      expect(result.body![1].type).toBe('command');
    });

    it('preserves non-class commands', () => {
      const ast = eventHandler([otherCmd('set'), otherCmd('put'), otherCmd('log')]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(3);
      result.body!.forEach(node => expect(node.type).toBe('command'));
    });

    it('handles empty body', () => {
      const ast = eventHandler([]);
      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(0);
    });

    it('batches inside if-then branches', () => {
      const ast: ASTNode = {
        type: 'event',
        event: 'click',
        body: [
          {
            type: 'if',
            condition: { type: 'literal', value: true },
            thenBranch: [classCmd('add', 'a'), classCmd('add', 'b')],
          },
        ],
      };

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      const ifNode = result.body![0] as { thenBranch: ASTNode[] };
      expect(ifNode.thenBranch).toHaveLength(1);
      expect(ifNode.thenBranch[0].type).toBe('batchedClassOps');
    });

    it('batches three consecutive remove commands', () => {
      const ast = eventHandler([
        classCmd('remove', 'x'),
        classCmd('remove', 'y'),
        classCmd('remove', 'z'),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);

      const batch = result.body![0] as BatchedClassOpsNode;
      expect(batch.removes).toEqual(['x', 'y', 'z']);
      expect(batch.adds).toEqual([]);
      expect(batch.toggles).toEqual([]);
    });
  });
});
