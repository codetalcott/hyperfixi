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

    it('batches commands with identical explicit #id targets', () => {
      const target = { type: 'selector', value: '#other' } as SelectorNode;
      const ast = eventHandler([
        classCmdWithTarget('add', 'active', target),
        classCmdWithTarget('add', 'visible', target),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);

      const batch = result.body![0] as BatchedClassOpsNode;
      expect(batch.type).toBe('batchedClassOps');
      expect(batch.target).toBe("document.getElementById('other')");
      expect(batch.adds).toEqual(['active', 'visible']);
    });

    it('does not batch when one has explicit target and one does not', () => {
      const target = { type: 'selector', value: '#other' } as SelectorNode;
      const ast = eventHandler([classCmd('add', 'a'), classCmdWithTarget('add', 'b', target)]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(2);
      // Different targets: implicit me vs explicit #other
      expect(result.body![0].type).toBe('command');
      expect(result.body![1].type).toBe('command');
    });

    it('does not batch commands with different explicit targets', () => {
      const ast = eventHandler([
        classCmdWithTarget('add', 'a', { type: 'selector', value: '#foo' } as SelectorNode),
        classCmdWithTarget('add', 'b', { type: 'selector', value: '#bar' } as SelectorNode),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(2);
      expect(result.body![0].type).toBe('command');
      expect(result.body![1].type).toBe('command');
    });

    it('batches mixed implicit and explicit in separate groups', () => {
      const target = { type: 'selector', value: '#box' } as SelectorNode;
      const ast = eventHandler([
        classCmd('add', 'a'),
        classCmd('add', 'b'),
        classCmdWithTarget('add', 'c', target),
        classCmdWithTarget('add', 'd', target),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(2);

      const batch1 = result.body![0] as BatchedClassOpsNode;
      expect(batch1.target).toBe('_ctx.me');
      expect(batch1.adds).toEqual(['a', 'b']);

      const batch2 = result.body![1] as BatchedClassOpsNode;
      expect(batch2.target).toBe("document.getElementById('box')");
      expect(batch2.adds).toEqual(['c', 'd']);
    });

    it('does not batch a class target, which each command queries again', () => {
      // A batch resolved `.panel` once, as `document.querySelector` (the first
      // match); both engines act on every match, queried per command.
      const target = { type: 'selector', value: '.panel' } as SelectorNode;
      const ast = eventHandler([
        classCmdWithTarget('add', 'a', target),
        classCmdWithTarget('add', 'b', target),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body!.map(node => node.type)).toEqual(['command', 'command']);
    });

    it("reads the target from core's slot (`add … to`, `remove … from`, `toggle … on`)", () => {
      const d1 = { type: 'selector', value: '#d1' } as SelectorNode;
      const inSlot = (name: 'add' | 'remove' | 'toggle', cls: string, slot: string) => ({
        ...classCmd(name, cls),
        modifiers: { [slot]: d1 },
      });
      const ast = eventHandler([
        inSlot('add', 'a', 'to'),
        inSlot('remove', 'b', 'from'),
        inSlot('toggle', 'c', 'on'),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);
      const batch = result.body![0] as BatchedClassOpsNode;
      expect(batch.target).toBe("document.getElementById('d1')");
      expect([batch.adds, batch.removes, batch.toggles]).toEqual([['a'], ['b'], ['c']]);
    });

    it('batches a written `me` with an implicit one', () => {
      const me = { type: 'identifier', value: 'me' } as ASTNode;
      const ast = eventHandler([classCmd('add', 'a'), classCmdWithTarget('add', 'b', me)]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(1);
      expect((result.body![0] as BatchedClassOpsNode).target).toBe('_ctx.me');
    });

    it('splits a run where two kinds of op meet one class', () => {
      // A batch adds, then removes, then toggles: `toggle .a then add .a` leaves
      // .a on in source order, and took it off batched.
      const ast = eventHandler([
        classCmd('add', 'x'),
        classCmd('toggle', 'a'),
        classCmd('add', 'a'),
        classCmd('add', 'y'),
      ]);

      const result = pass.transform(ast, analysis) as EventHandlerNode;
      expect(result.body).toHaveLength(2);
      const [first, second] = result.body as BatchedClassOpsNode[];
      expect([first.adds, first.toggles]).toEqual([['x'], ['a']]);
      expect([second.adds, second.toggles]).toEqual([['a', 'y'], []]);
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
