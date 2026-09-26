/**
 * Class Batching Optimization Pass
 *
 * Detects consecutive classList.add/remove/toggle commands targeting the same
 * element and merges them into a single BatchedClassOpsNode. This reduces DOM
 * mutations by leveraging the varargs form of classList.add() and classList.remove().
 *
 * Example:
 *   add .active on me → then add .visible on me → then add .highlighted on me
 * Becomes:
 *   _ctx.me.classList.add('active', 'visible', 'highlighted')  // 1 mutation instead of 3
 */

import type {
  ASTNode,
  CommandNode,
  EventHandlerNode,
  IdentifierNode,
  SelectorNode,
  AnalysisResult,
  OptimizationPass,
  BatchedClassOpsNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from '../types/aot-types.js';

// Commands eligible for batching, each with the slot core's parser puts its
// target in (`add … to`, `remove … from`, `toggle … on`).
const TARGET_SLOTS: ReadonlyMap<string, string> = new Map([
  ['add', 'to'],
  ['remove', 'from'],
  ['toggle', 'on'],
]);

type ClassOp = { command: 'add' | 'remove' | 'toggle'; className: string };

/**
 * Extract a class name from a command node if it's a simple class operation.
 * Returns null if the command is not a simple class add/remove/toggle.
 */
function extractClassOp(node: ASTNode): ClassOp | null {
  if (node.type !== 'command') return null;

  const cmd = node as CommandNode;
  if (!TARGET_SLOTS.has(cmd.name)) return null;

  const args = cmd.args ?? [];
  if (args.length === 0) return null;

  const arg = args[0];
  if (arg.type !== 'selector') return null;

  const selector = (arg as SelectorNode).value;
  if (!selector.startsWith('.')) return null;

  const className = selector.slice(1);
  if (!className) return null;

  return { command: cmd.name as ClassOp['command'], className };
}

/**
 * The node a class command acts on: its `target`, or the slot core's parser and
 * semantic's buildAST put it in. Reading only `target`, which neither sets,
 * batched `add .a to #d1 then add .b to #d1` onto me.
 */
function classTarget(cmd: CommandNode): ASTNode | undefined {
  if (cmd.target) return cmd.target;
  const slot = cmd.modifiers?.[TARGET_SLOTS.get(cmd.name)!];
  return slot && typeof slot === 'object' && 'type' in slot ? (slot as ASTNode) : undefined;
}

/**
 * What a run of class commands can share: `me` (implicit or written) or one id.
 * Null for any other target, which is never batched. A class or query target
 * names every match, and both engines query it again for each command, so a
 * class the first command removes changes what the next one reaches (`remove
 * .item from .item then add .b to .item` adds .b to nothing).
 */
function batchTargetKey(cmd: CommandNode): string | null {
  const target = classTarget(cmd);
  if (!target) return 'me';
  if (target.type === 'identifier' && (target as IdentifierNode).value === 'me') return 'me';
  if (target.type === 'selector' && /^#[\w-]+$/.test((target as SelectorNode).value)) {
    return (target as SelectorNode).value;
  }
  return null;
}

/** The JavaScript for a run's target (see batchTargetKey). */
function resolveTarget(key: string): string {
  return key === 'me' ? '_ctx.me' : `document.getElementById('${key.slice(1)}')`;
}

/**
 * Whether adding `op` to a run would reorder it. A batch applies its adds, then
 * its removes, then its toggles, which keeps the source order only while no
 * class meets two kinds of op: `toggle .a then add .a` leaves .a on, and
 * add-first took it off.
 */
function reordersClass(run: ASTNode[], op: ClassOp): boolean {
  return run.some(node => {
    const other = extractClassOp(node)!;
    return other.command !== op.command && other.className === op.className;
  });
}

/**
 * Create a BatchedClassOpsNode from a run of class commands on one target.
 */
function createBatchNode(run: ASTNode[], targetKey: string): BatchedClassOpsNode {
  const adds: string[] = [];
  const removes: string[] = [];
  const toggles: string[] = [];

  for (const node of run) {
    const op = extractClassOp(node)!;
    switch (op.command) {
      case 'add':
        adds.push(op.className);
        break;
      case 'remove':
        removes.push(op.className);
        break;
      case 'toggle':
        toggles.push(op.className);
        break;
    }
  }

  return {
    type: 'batchedClassOps',
    target: resolveTarget(targetKey),
    adds,
    removes,
    toggles,
  };
}

/**
 * Process a body array, batching consecutive class operations on the same target.
 */
function batchBody(nodes: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  let currentRun: ASTNode[] = [];
  let runKey = '';

  function flushRun() {
    if (currentRun.length >= 2) {
      result.push(createBatchNode(currentRun, runKey));
    } else if (currentRun.length === 1) {
      result.push(currentRun[0]);
    }
    currentRun = [];
  }

  for (const node of nodes) {
    const op = extractClassOp(node);
    const key = op && batchTargetKey(node as CommandNode);
    if (op && key) {
      // A class op: it joins the run if it shares the target and keeps the order
      if (currentRun.length > 0 && key === runKey && !reordersClass(currentRun, op)) {
        currentRun.push(node);
      } else {
        flushRun();
        currentRun = [node];
        runKey = key;
      }
    } else {
      flushRun();
      result.push(node);
    }
  }

  flushRun();
  return result;
}

/**
 * Recursively walk the AST and batch class operations in all body arrays.
 */
function walkAndBatch(node: ASTNode): ASTNode {
  switch (node.type) {
    case 'event': {
      const event = node as EventHandlerNode;
      if (event.body && event.body.length > 0) {
        return { ...event, body: batchBody(event.body).map(walkAndBatch) };
      }
      return node;
    }
    case 'if': {
      const ifNode = node as IfNode;
      const result: Record<string, unknown> = { ...ifNode };
      result.thenBranch = batchBody(ifNode.thenBranch).map(walkAndBatch);
      if (ifNode.elseBranch) {
        result.elseBranch = batchBody(ifNode.elseBranch).map(walkAndBatch);
      }
      if (ifNode.elseIfBranches) {
        result.elseIfBranches = ifNode.elseIfBranches.map(branch => ({
          condition: branch.condition,
          body: batchBody(branch.body).map(walkAndBatch),
        }));
      }
      return result as ASTNode;
    }
    case 'repeat': {
      const repeat = node as RepeatNode;
      return { ...repeat, body: batchBody(repeat.body).map(walkAndBatch) } as ASTNode;
    }
    case 'foreach': {
      const forEach = node as ForEachNode;
      return { ...forEach, body: batchBody(forEach.body).map(walkAndBatch) } as ASTNode;
    }
    case 'while': {
      const whileNode = node as WhileNode;
      return { ...whileNode, body: batchBody(whileNode.body).map(walkAndBatch) } as ASTNode;
    }
    default:
      return node;
  }
}

/**
 * Optimization pass that batches consecutive class manipulation commands
 * targeting the same element into single compound DOM operations.
 */
export class ClassBatchingPass implements OptimizationPass {
  readonly name = 'class-batching';

  shouldRun(analysis: AnalysisResult): boolean {
    // Only run if at least one class manipulation command is used
    return (
      analysis.commandsUsed.has('add') ||
      analysis.commandsUsed.has('remove') ||
      analysis.commandsUsed.has('toggle')
    );
  }

  transform(ast: ASTNode, _analysis: AnalysisResult): ASTNode {
    return walkAndBatch(ast);
  }
}
