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
  SelectorNode,
  AnalysisResult,
  OptimizationPass,
  BatchedClassOpsNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from '../types/aot-types.js';

// Commands eligible for batching
const CLASS_COMMANDS = new Set(['add', 'remove', 'toggle']);

/**
 * Extract a class name from a command node if it's a simple class operation.
 * Returns null if the command is not a simple class add/remove/toggle.
 */
function extractClassOp(
  node: ASTNode
): { command: 'add' | 'remove' | 'toggle'; className: string; hasExplicitTarget: boolean } | null {
  if (node.type !== 'command') return null;

  const cmd = node as CommandNode;
  if (!CLASS_COMMANDS.has(cmd.name)) return null;

  const args = cmd.args ?? [];
  if (args.length === 0) return null;

  const arg = args[0];
  if (arg.type !== 'selector') return null;

  const selector = (arg as SelectorNode).value;
  if (!selector.startsWith('.')) return null;

  const className = selector.slice(1);
  if (!className) return null;

  return {
    command: cmd.name as 'add' | 'remove' | 'toggle',
    className,
    hasExplicitTarget: !!cmd.target,
  };
}

/**
 * Check if two commands target the same element.
 * Currently only batches commands that both target implicit `me` (no explicit target).
 */
function isSameTarget(a: ASTNode, b: ASTNode): boolean {
  if (a.type !== 'command' || b.type !== 'command') return false;
  const cmdA = a as CommandNode;
  const cmdB = b as CommandNode;
  // Both must have no explicit target (both use implicit _ctx.me)
  return !cmdA.target && !cmdB.target;
}

/**
 * Create a BatchedClassOpsNode from a run of class commands.
 */
function createBatchNode(run: ASTNode[]): BatchedClassOpsNode {
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
    target: '_ctx.me',
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

  function flushRun() {
    if (currentRun.length >= 2) {
      result.push(createBatchNode(currentRun));
    } else if (currentRun.length === 1) {
      result.push(currentRun[0]);
    }
    currentRun = [];
  }

  for (const node of nodes) {
    const op = extractClassOp(node);
    if (op && !op.hasExplicitTarget) {
      // This is a class op on implicit me
      if (currentRun.length > 0 && isSameTarget(currentRun[0], node)) {
        currentRun.push(node);
      } else {
        flushRun();
        currentRun = [node];
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
