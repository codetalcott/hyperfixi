/**
 * AST Transformation API
 * Provides utilities for modifying, optimizing, and refactoring ASTs
 *
 * Consolidated from @lokascript/ast-toolkit.
 */

import { ASTVisitor, visit, createVisitorContext } from './visitor.js';
import type {
  ASTNode,
  VisitorHandlers,
  TransformOptions,
  OptimizationPass,
  VisitorContext,
} from './types.js';

/**
 * Helper to normalize visitor result to a single ASTNode
 */
function normalizeVisitResult(result: ASTNode | ASTNode[] | null, fallback: ASTNode): ASTNode {
  if (result === null) {
    return fallback;
  }
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0]! : fallback;
  }
  return result;
}

// ============================================================================
// Core Transformation
// ============================================================================

/**
 * Transform an AST using visitor pattern
 */
export function transform(
  ast: ASTNode,
  visitor: VisitorHandlers,
  options: TransformOptions = {}
): ASTNode {
  const transformVisitor = new ASTVisitor(visitor);
  const visitResult = transformVisitor.visit(ast, createVisitorContext());

  let result: ASTNode;
  if (visitResult === null) {
    result = ast;
  } else if (Array.isArray(visitResult)) {
    result = visitResult.length > 0 ? visitResult[0]! : ast;
  } else {
    result = visitResult;
  }

  if (options.optimize) {
    result = optimize(result, options);
  }

  if (options.minify) {
    result = minifyAST(result);
  }

  return result;
}

/**
 * Apply optimization passes to an AST
 */
export function optimize(ast: ASTNode, options: TransformOptions = {}): ASTNode {
  const passes: OptimizationPass[] = [];

  if (options.batchOperations || options.batchSimilarOperations || options.optimize) {
    passes.push(createBatchOperationsPass());
  }

  if (options.redundantClassOperations || options.optimize) {
    passes.push(createRemoveRedundantOperationsPass());
  }

  if (options.optimize) {
    passes.push(createSimplifyConditionsPass());
  }

  return applyOptimizationPasses(ast, passes);
}

/**
 * Apply a series of optimization passes
 */
export function applyOptimizationPasses(ast: ASTNode, passes: OptimizationPass[]): ASTNode {
  let result = ast;

  for (const pass of passes) {
    result = applyOptimizationPass(result, pass);
  }

  return result;
}

function applyOptimizationPass(ast: ASTNode, pass: OptimizationPass): ASTNode {
  const visitor = new ASTVisitor({
    enter(node, context) {
      if (!pass.shouldRun || pass.shouldRun(node)) {
        pass.transform(node, context);
      }
    },
  });

  return normalizeVisitResult(visitor.visit(ast, createVisitorContext()), ast);
}

// ============================================================================
// Optimization Passes
// ============================================================================

function createBatchOperationsPass(): OptimizationPass {
  return {
    name: 'batch-operations',
    transform: (node, context) => {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        const batched = batchSimilarCommands(commands);

        if (batched.length !== commands.length) {
          context.replace({ ...node, commands: batched });
        }
      }
      return node;
    },
  };
}

function createRemoveRedundantOperationsPass(): OptimizationPass {
  return {
    name: 'remove-redundant',
    transform: (node, context) => {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        const optimized = removeRedundantOperations(commands);

        if (optimized.length !== commands.length) {
          context.replace({ ...node, commands: optimized });
        }
      }
      return node;
    },
  };
}

function createSimplifyConditionsPass(): OptimizationPass {
  return {
    name: 'simplify-conditions',
    transform: (node, context) => {
      if (node.type === 'conditional' && (node as any).condition) {
        const simplified = simplifyCondition((node as any).condition);
        if (simplified !== (node as any).condition) {
          context.replace({ ...node, condition: simplified });
        }
      }
      return node;
    },
  };
}

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Normalize AST structure by removing non-standard properties
 */
export function normalize(ast: ASTNode): ASTNode {
  const visitor = new ASTVisitor({
    exit(node, context) {
      const normalized: any = {
        type: node.type,
        start: node.start,
        end: node.end,
        line: node.line,
        column: node.column,
      };

      if (node.type === 'command') {
        normalized.name = (node as any).name;
        normalized.args = (node as any).args;
        normalized.target = (node as any).target;
      } else if (node.type === 'eventHandler') {
        normalized.event = (node as any).event;
        normalized.commands = (node as any).commands;
      } else if (node.type === 'selector') {
        normalized.value = (node as any).value;
      } else if (node.type === 'identifier') {
        normalized.name = (node as any).name;
      } else if (node.type === 'literal') {
        normalized.value = (node as any).value;
      }

      context.replace(normalized);
    },
  });

  return normalizeVisitResult(visitor.visit(ast, createVisitorContext()), ast);
}

/**
 * Inline simple variable assignments
 */
export function inlineVariables(ast: ASTNode): ASTNode {
  const variables = new Map<string, any>();

  const collectVisitor = new ASTVisitor({
    enter(node) {
      if (
        (node as any).name === 'set' &&
        (node as any).variable &&
        (node as any).value &&
        isSimpleValue((node as any).value)
      ) {
        const varName = (node as any).variable.name;
        variables.set(varName, (node as any).value);
      }
    },
  });

  visit(ast, collectVisitor);

  const inlineVisitor = new ASTVisitor({
    enter(node, context) {
      if (node.type === 'identifier' && variables.has((node as any).name)) {
        context.replace(variables.get((node as any).name));
      }
    },
  });

  return normalizeVisitResult(inlineVisitor.visit(ast, createVisitorContext()), ast);
}

/**
 * Extract common expressions into variables
 */
export function extractCommonExpressions(ast: ASTNode): ASTNode {
  const expressionCounts = new Map<string, { count: number; node: ASTNode; nodes: ASTNode[] }>();

  const countVisitor = new ASTVisitor({
    enter(node) {
      if (node.type === 'binaryExpression' && isComplexExpression(node)) {
        const expr = JSON.stringify(node, ['type', 'operator', 'left', 'right', 'name', 'value']);
        if (!expressionCounts.has(expr)) {
          expressionCounts.set(expr, { count: 0, node, nodes: [] });
        }
        const entry = expressionCounts.get(expr)!;
        entry.count++;
        entry.nodes.push(node);
      }
    },
  });

  visit(ast, countVisitor);

  let varCounter = 0;
  const extractions = new Map<string, string>();
  const newCommands: any[] = [];

  for (const [expr, data] of expressionCounts) {
    if (data.count > 1) {
      const varName = `temp${++varCounter}`;
      extractions.set(expr, varName);

      newCommands.push({
        type: 'command',
        name: 'set',
        start: 0,
        end: 0,
        line: 1,
        column: 1,
        variable: { type: 'identifier', name: varName, start: 0, end: 0, line: 1, column: 1 },
        value: data.node,
      });
    }
  }

  const replaceVisitor = new ASTVisitor({
    enter(node, context) {
      if (node.type === 'binaryExpression') {
        const expr = JSON.stringify(node, ['type', 'operator', 'left', 'right', 'name', 'value']);
        if (extractions.has(expr)) {
          context.replace({
            type: 'identifier',
            name: extractions.get(expr)!,
            start: node.start ?? 0,
            end: node.end ?? 0,
            line: node.line ?? 1,
            column: node.column ?? 1,
          } as ASTNode);
        }
      }
    },
  });

  let result = normalizeVisitResult(replaceVisitor.visit(ast, createVisitorContext()), ast);

  if (newCommands.length > 0 && (result as any).commands) {
    result = {
      ...result,
      commands: [...newCommands, ...(result as any).commands],
    } as any;
  }

  return result;
}

/**
 * Create a custom optimization pass
 */
export function createOptimizationPass(config: {
  name: string;
  description?: string;
  transform: (node: ASTNode, context: VisitorContext) => ASTNode | ASTNode[] | null;
  shouldRun?: (node: ASTNode) => boolean;
}): OptimizationPass {
  return {
    name: config.name,
    transform: config.transform,
    shouldRun: config.shouldRun,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function batchSimilarCommands(commands: any[]): any[] {
  const groups = new Map<string, any[]>();
  const result: any[] = [];

  for (const cmd of commands) {
    if (cmd.name === 'add' || cmd.name === 'remove') {
      const key = `${cmd.name}:${cmd.target?.name || 'default'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(cmd);
    } else {
      for (const [, group] of groups) {
        if (group.length > 1) {
          result.push(createBatchedCommand(group));
        } else {
          result.push(...group);
        }
      }
      groups.clear();
      result.push(cmd);
    }
  }

  for (const [, group] of groups) {
    if (group.length > 1) {
      result.push(createBatchedCommand(group));
    } else {
      result.push(...group);
    }
  }

  return result;
}

function createBatchedCommand(commands: any[]): any {
  return {
    ...commands[0],
    args: commands.map(cmd => cmd.args[0]).filter(Boolean),
  };
}

function removeRedundantOperations(commands: any[]): any[] {
  const result: any[] = [];
  const operationTracker = new Map<string, { operation: string; index: number }>();

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (cmd.name === 'add' || cmd.name === 'remove') {
      const target = cmd.target?.name || 'default';
      const selector = cmd.args?.[0]?.value;
      const key = `${target}:${selector}`;

      const lastOp = operationTracker.get(key);

      if (lastOp) {
        if (
          (lastOp.operation === 'add' && cmd.name === 'remove') ||
          (lastOp.operation === 'remove' && cmd.name === 'add')
        ) {
          result.splice(lastOp.index, 1);
          for (const [_, v] of operationTracker) {
            if (v.index > lastOp.index) {
              v.index--;
            }
          }
        }
      }

      operationTracker.set(key, { operation: cmd.name, index: result.length });
      result.push(cmd);
    } else {
      result.push(cmd);
    }
  }

  return result;
}

function simplifyCondition(condition: ASTNode): ASTNode {
  if ((condition as any).operator === '&&') {
    const left = (condition as any).left;
    const right = (condition as any).right;

    if (left.type === 'literal' && left.value === true) return right;
    if (right.type === 'literal' && right.value === true) return left;
    if (left.type === 'literal' && left.value === false) return left;
    if (right.type === 'literal' && right.value === false) return right;
  }

  return condition;
}

function isSimpleValue(node: ASTNode): boolean {
  return node.type === 'literal' || node.type === 'identifier';
}

function isComplexExpression(node: ASTNode): boolean {
  return (
    node.type === 'binaryExpression' &&
    ((node as any).left?.type === 'binaryExpression' ||
      (node as any).right?.type === 'binaryExpression')
  );
}

function minifyAST(ast: ASTNode): ASTNode {
  const visitor = new ASTVisitor({
    enter(node, context) {
      const minified: any = {
        type: node.type,
      };

      for (const [key, value] of Object.entries(node)) {
        if (!['start', 'end', 'line', 'column'].includes(key)) {
          (minified as any)[key] = value;
        }
      }

      context.replace(minified);
    },
  });

  return normalizeVisitResult(visitor.visit(ast, createVisitorContext()), ast);
}
