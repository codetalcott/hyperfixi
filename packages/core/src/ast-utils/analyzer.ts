/**
 * AST Analysis Suite
 * Provides complexity analysis, code smell detection, and optimization suggestions.
 *
 * Extracted from @lokascript/ast-toolkit during consolidation.
 */

import { ASTVisitor, visit, measureDepth } from './visitor.js';
import type {
  ASTNode,
  ComplexityMetrics,
  CodeSmell,
  AnalysisResult,
  DependencyGraph,
  CodeSuggestion,
  PatternMatch,
} from './types.js';

// ============================================================================
// Complexity Analysis
// ============================================================================

export function calculateComplexity(ast: ASTNode): ComplexityMetrics {
  return {
    cyclomatic: calculateCyclomaticComplexity(ast),
    cognitive: calculateCognitiveComplexity(ast),
    halstead: calculateHalsteadMetrics(ast),
  };
}

function calculateCyclomaticComplexity(ast: ASTNode): number {
  let complexity = 1;
  const visitor = new ASTVisitor({
    enter(node) {
      if (isDecisionNode(node)) complexity++;
    },
  });
  visit(ast, visitor);
  return complexity;
}

function calculateCognitiveComplexity(ast: ASTNode): number {
  let complexity = 0;
  let depth = 0;
  const visitor = new ASTVisitor({
    enter(node) {
      if (isNestingNode(node)) depth++;
      if (isDecisionNode(node)) complexity += 1 + depth;
    },
    exit(node) {
      if (isNestingNode(node)) depth--;
    },
  });
  visit(ast, visitor);
  return complexity;
}

function calculateHalsteadMetrics(ast: ASTNode): ComplexityMetrics['halstead'] {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let totalOperators = 0;
  let totalOperands = 0;

  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).operator) {
        operators.add((node as any).operator);
        totalOperators++;
      }
      if ((node as any).name) {
        operands.add((node as any).name);
        totalOperands++;
      }
      if ((node as any).value !== undefined) {
        operands.add(String((node as any).value));
        totalOperands++;
      }
      if (node.type && ['command', 'conditional', 'binaryExpression'].includes(node.type)) {
        operators.add(node.type);
        totalOperators++;
      }
    },
  });
  visit(ast, visitor);

  const vocabulary = operators.size + operands.size;
  const length = totalOperators + totalOperands;
  const difficulty =
    vocabulary > 0 ? (operators.size / 2) * (totalOperands / Math.max(operands.size, 1)) : 0;
  const effort = difficulty * length;

  return { vocabulary, length, difficulty, effort };
}

function isDecisionNode(node: ASTNode): boolean {
  return (
    ['conditional', 'binaryExpression', 'logicalExpression'].includes(node.type) ||
    ((node as any).operator && ['&&', '||', '?'].includes((node as any).operator))
  );
}

function isNestingNode(node: ASTNode): boolean {
  return ['conditional', 'loop', 'function', 'block'].includes(node.type);
}

// ============================================================================
// Code Smell Detection
// ============================================================================

export function detectCodeSmells(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  smells.push(...detectExcessiveNesting(ast));
  smells.push(...detectDuplicateCode(ast));
  smells.push(...detectLongCommandChains(ast));
  smells.push(...detectComplexConditions(ast));
  return smells;
}

function detectExcessiveNesting(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const maxDepth = 3;
  const currentDepth = measureDepth(ast);

  if (currentDepth > maxDepth) {
    smells.push({
      type: 'excessive-nesting',
      severity: 'high',
      location: {
        ...(ast.start !== undefined && { start: ast.start }),
        ...(ast.end !== undefined && { end: ast.end }),
        ...(ast.line !== undefined && { line: ast.line }),
        ...(ast.column !== undefined && { column: ast.column }),
      },
      message: `Nesting depth of ${currentDepth} exceeds recommended maximum of ${maxDepth}`,
      suggestion: 'Consider extracting nested logic into separate functions or using early returns',
    });
  }
  return smells;
}

function detectDuplicateCode(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const nodeStrings = new Map<string, ASTNode[]>();

  const visitor = new ASTVisitor({
    enter(node) {
      if (node.type === 'command' || node.type === 'conditional') {
        const nodeString = JSON.stringify(node, ['type', 'name', 'value', 'operator']);
        if (!nodeStrings.has(nodeString)) nodeStrings.set(nodeString, []);
        nodeStrings.get(nodeString)!.push(node);
      }
    },
  });
  visit(ast, visitor);

  for (const [, nodes] of nodeStrings) {
    if (nodes.length > 1) {
      const firstNode = nodes[0]!;
      smells.push({
        type: 'duplicate-code',
        severity: 'medium',
        location: {
          ...(firstNode.start !== undefined && { start: firstNode.start }),
          ...(firstNode.end !== undefined && { end: firstNode.end }),
          ...(firstNode.line !== undefined && { line: firstNode.line }),
          ...(firstNode.column !== undefined && { column: firstNode.column }),
        },
        message: `Duplicate code found (${nodes.length} occurrences)`,
        suggestion: 'Consider extracting common logic into a reusable function',
      });
    }
  }
  return smells;
}

function detectLongCommandChains(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const maxCommands = 5;

  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        if (commands.length > maxCommands) {
          smells.push({
            type: 'long-command-chain',
            severity: 'medium',
            location: {
              ...(node.start !== undefined && { start: node.start }),
              ...(node.end !== undefined && { end: node.end }),
              ...(node.line !== undefined && { line: node.line }),
              ...(node.column !== undefined && { column: node.column }),
            },
            message: `Command chain with ${commands.length} commands exceeds recommended maximum of ${maxCommands}`,
            suggestion: 'Consider breaking into smaller, focused handlers',
          });
        }
      }
    },
  });
  visit(ast, visitor);
  return smells;
}

function detectComplexConditions(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const visitor = new ASTVisitor({
    enter(node) {
      if (node.type === 'conditional' && (node as any).condition) {
        const conditionComplexity = calculateExpressionComplexity((node as any).condition);
        if (conditionComplexity > 3) {
          smells.push({
            type: 'complex-condition',
            severity: 'medium',
            location: {
              ...(node.start !== undefined && { start: node.start }),
              ...(node.end !== undefined && { end: node.end }),
              ...(node.line !== undefined && { line: node.line }),
              ...(node.column !== undefined && { column: node.column }),
            },
            message: `Condition complexity of ${conditionComplexity} is too high`,
            suggestion: 'Consider extracting condition logic into named variables',
          });
        }
      }
    },
  });
  visit(ast, visitor);
  return smells;
}

function calculateExpressionComplexity(expr: ASTNode): number {
  let complexity = 1;
  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).operator && ['&&', '||', '!'].includes((node as any).operator)) {
        complexity++;
      }
    },
  });
  visit(expr, visitor);
  return complexity;
}

// ============================================================================
// Dependency Analysis
// ============================================================================

export function analyzeDependencies(ast: ASTNode): DependencyGraph {
  const nodes = new Set<string>();
  const edges = new Map<string, Set<string>>();

  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).name === 'set' && (node as any).variable) {
        const varName = (node as any).variable.name;
        nodes.add(varName);

        if ((node as any).value) {
          const deps = extractDependencies((node as any).value);
          if (!edges.has(varName)) edges.set(varName, new Set());
          deps.forEach(dep => {
            nodes.add(dep);
            edges.get(varName)!.add(dep);
          });
        }
      }
    },
  });
  visit(ast, visitor);

  const cycles = detectCycles(nodes, edges);
  return { nodes, edges, cycles };
}

function extractDependencies(valueNode: ASTNode): string[] {
  const deps: string[] = [];
  const visitor = new ASTVisitor({
    enter(node) {
      if (node.type === 'identifier') deps.push((node as any).name);
    },
  });
  visit(valueNode, visitor);
  return deps;
}

function detectCycles(nodes: Set<string>, edges: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = edges.get(node) || new Set();
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path]);
    }
    recursionStack.delete(node);
  }

  for (const node of nodes) {
    if (!visited.has(node)) dfs(node, []);
  }
  return cycles;
}

// ============================================================================
// Dead Code Detection
// ============================================================================

export function findDeadCode(ast: ASTNode): Array<{
  type: 'unused-variable' | 'unreachable-code';
  name?: string;
  location: { start?: number; end?: number; line?: number; column?: number };
  message: string;
}> {
  const deadCode: Array<{
    type: 'unused-variable' | 'unreachable-code';
    name?: string;
    location: { start?: number; end?: number; line?: number; column?: number };
    message: string;
  }> = [];

  const definedVars = new Set<string>();
  const usedVars = new Set<string>();
  const varDefinitions = new Map<string, ASTNode>();
  const definitionIdentifiers = new Set<string>();

  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).name === 'set' && (node as any).variable) {
        const varName = (node as any).variable.name;
        definedVars.add(varName);
        varDefinitions.set(varName, node);
        definitionIdentifiers.add(varName);
      }
      if (node.type === 'identifier' && (node as any).name) {
        const name = (node as any).name;
        if (!definitionIdentifiers.has(name)) usedVars.add(name);
      }
    },
  });
  visit(ast, visitor);

  for (const varName of definedVars) {
    if (!usedVars.has(varName)) {
      const defNode = varDefinitions.get(varName)!;
      deadCode.push({
        type: 'unused-variable',
        name: varName,
        location: {
          ...(defNode.start !== undefined && { start: defNode.start }),
          ...(defNode.end !== undefined && { end: defNode.end }),
          ...(defNode.line !== undefined && { line: defNode.line }),
          ...(defNode.column !== undefined && { column: defNode.column }),
        },
        message: `Variable '${varName}' is defined but never used`,
      });
    }
  }

  let afterHalt = false;
  const visitor2 = new ASTVisitor({
    enter(node) {
      if ((node as any).name === 'halt' || (node as any).name === 'throw') {
        afterHalt = true;
      } else if (afterHalt && node.type === 'command') {
        deadCode.push({
          type: 'unreachable-code',
          location: {
            ...(node.start !== undefined && { start: node.start }),
            ...(node.end !== undefined && { end: node.end }),
            ...(node.line !== undefined && { line: node.line }),
            ...(node.column !== undefined && { column: node.column }),
          },
          message: 'Unreachable code after halt/throw statement',
        });
      }
    },
  });
  visit(ast, visitor2);

  return deadCode;
}

// ============================================================================
// Optimization Suggestions
// ============================================================================

export function suggestOptimizations(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  suggestions.push(...suggestBatchOperations(ast));
  suggestions.push(...suggestSimplifyConditionals(ast));
  return suggestions;
}

function suggestBatchOperations(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        const sameCmdGroups = groupConsecutiveSameCommands(commands);
        for (const group of sameCmdGroups) {
          if (group.length >= 3 && group[0].name === 'add' && sameTarget(group)) {
            suggestions.push({
              type: 'batch-operations',
              description: 'Group class operations',
              suggestion: `Combine multiple add operations: add ${group.map((c: any) => c.args[0].value).join(' ')} to ${group[0].target?.name || 'target'}`,
              impact: 'high',
              confidence: 0.9,
            });
          }
        }
      }
    },
  });
  visit(ast, visitor);
  return suggestions;
}

function suggestSimplifyConditionals(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  const complexity = calculateComplexity(ast);

  if (complexity.cognitive > 3 || complexity.cyclomatic > 3) {
    suggestions.push({
      type: 'simplification',
      description: 'Simplify complex conditionals',
      suggestion: 'Break down complex conditional logic into smaller, named functions',
      impact: 'maintainability',
      confidence: 0.8,
    });
  }
  return suggestions;
}

function groupConsecutiveSameCommands(commands: any[]): any[][] {
  const groups: any[][] = [];
  let currentGroup: any[] = [];

  for (const cmd of commands) {
    if (currentGroup.length === 0 || cmd.name === currentGroup[0].name) {
      currentGroup.push(cmd);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [cmd];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

function sameTarget(commands: any[]): boolean {
  if (commands.length === 0) return true;
  const firstTarget = commands[0].target?.name;
  return commands.every((cmd: any) => cmd.target?.name === firstTarget);
}

// ============================================================================
// Pattern Analysis
// ============================================================================

export function analyzePatterns(ast: ASTNode): PatternMatch[] {
  const patterns: PatternMatch[] = [];

  if (ast.type === 'eventHandler') {
    patterns.push({
      type: 'event-handler',
      pattern: 'event-handler',
      node: ast,
      bindings: { event: (ast as any).event },
      confidence: 0.9,
      suggestion: 'Consider using event delegation for multiple similar handlers',
    });
  }

  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        const toggleCommands = commands.filter((cmd: any) => cmd.name === 'toggle');
        if (toggleCommands.length >= 2) {
          patterns.push({
            type: 'toggle-pair',
            pattern: 'toggle-pair',
            node,
            bindings: {
              count: toggleCommands.length,
              targets: toggleCommands.map((cmd: any) => cmd.target?.name || cmd.target?.value),
            },
            confidence: 0.85,
            suggestion: 'Consider using a single toggle with multiple targets',
          });
        }
      }
    },
  });
  visit(ast, visitor);
  return patterns;
}

// ============================================================================
// Comprehensive Analysis
// ============================================================================

export function analyzeMetrics(ast: ASTNode): AnalysisResult {
  const complexity = calculateComplexity(ast);
  const smells = detectCodeSmells(ast);
  const patterns = analyzePatterns(ast);
  const dependencies = analyzeDependencies(ast);
  const maintainabilityIndex = calculateMaintainabilityIndex(complexity, smells);
  const readabilityScore = calculateReadabilityScore(ast, smells);

  return { complexity, smells, patterns, dependencies, maintainabilityIndex, readabilityScore };
}

function calculateMaintainabilityIndex(complexity: ComplexityMetrics, smells: CodeSmell[]): number {
  let score = 100;
  score -= Math.min(complexity.cyclomatic * 2, 30);
  score -= Math.min(complexity.cognitive, 20);
  const highSeveritySmells = smells.filter(s => s.severity === 'high').length;
  const mediumSeveritySmells = smells.filter(s => s.severity === 'medium').length;
  score -= highSeveritySmells * 15;
  score -= mediumSeveritySmells * 8;
  return Math.max(0, Math.min(100, score));
}

function calculateReadabilityScore(ast: ASTNode, smells: CodeSmell[]): number {
  let score = 100;
  const depth = measureDepth(ast);
  const excessDepth = Math.max(0, depth - 3);
  score -= Math.min(excessDepth * 5, 25);
  const longChains = smells.filter(s => s.type === 'long-command-chain').length;
  score -= longChains * 10;
  const complexConditions = smells.filter(s => s.type === 'complex-condition').length;
  score -= complexConditions * 12;
  return Math.max(0, Math.min(100, score));
}
