/**
 * AST Analysis Suite
 * Provides complexity analysis, code smell detection, and optimization suggestions
 */

import { findNodes, ASTVisitor, visit, measureDepth, countNodeTypes } from '../visitor/index.js';
import type { 
  ASTNode, 
  ComplexityMetrics, 
  CodeSmell, 
  AnalysisResult, 
  DependencyGraph, 
  VariableUsage,
  CodeSuggestion,
  PatternMatch
} from '../types.js';

// ============================================================================
// Complexity Analysis
// ============================================================================

/**
 * Calculate complexity metrics for an AST
 */
export function calculateComplexity(ast: ASTNode): ComplexityMetrics {
  const cyclomaticComplexity = calculateCyclomaticComplexity(ast);
  const cognitiveComplexity = calculateCognitiveComplexity(ast);
  const halsteadMetrics = calculateHalsteadMetrics(ast);
  
  return {
    cyclomatic: cyclomaticComplexity,
    cognitive: cognitiveComplexity,
    halstead: halsteadMetrics
  };
}

function calculateCyclomaticComplexity(ast: ASTNode): number {
  let complexity = 1; // Base complexity
  
  const visitor = new ASTVisitor({
    enter(node) {
      // Decision points that increase complexity
      if (isDecisionNode(node)) {
        complexity++;
      }
    }
  });
  
  visit(ast, visitor);
  return complexity;
}

function calculateCognitiveComplexity(ast: ASTNode): number {
  let complexity = 0;
  let depth = 0;
  
  const visitor = new ASTVisitor({
    enter(node) {
      if (isNestingNode(node)) {
        depth++;
      }
      
      if (isDecisionNode(node)) {
        complexity += 1 + depth; // Base + nesting penalty
      }
    },
    exit(node) {
      if (isNestingNode(node)) {
        depth--;
      }
    }
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
        const op = (node as any).operator;
        operators.add(op);
        totalOperators++;
      }
      
      if ((node as any).name) {
        const name = (node as any).name;
        operands.add(name);
        totalOperands++;
      }
      
      if ((node as any).value !== undefined) {
        const value = String((node as any).value);
        operands.add(value);
        totalOperands++;
      }
      
      // Count node types as operators
      if (node.type && ['command', 'conditional', 'binaryExpression'].includes(node.type)) {
        operators.add(node.type);
        totalOperators++;
      }
    }
  });
  
  visit(ast, visitor);
  
  const vocabulary = operators.size + operands.size;
  const length = totalOperators + totalOperands;
  const difficulty = vocabulary > 0 ? (operators.size / 2) * (totalOperands / Math.max(operands.size, 1)) : 0;
  const effort = difficulty * length;
  
  return {
    vocabulary,
    length,
    difficulty,
    effort
  };
}

function isDecisionNode(node: ASTNode): boolean {
  return ['conditional', 'binaryExpression', 'logicalExpression'].includes(node.type) ||
         ((node as any).operator && ['&&', '||', '?'].includes((node as any).operator));
}

function isNestingNode(node: ASTNode): boolean {
  return ['conditional', 'loop', 'function', 'block'].includes(node.type);
}

// ============================================================================
// Code Smell Detection
// ============================================================================

/**
 * Detect code smells in an AST
 */
export function detectCodeSmells(ast: ASTNode): CodeSmell[] {
  const smells: CodeSmell[] = [];
  
  // Check for excessive nesting
  smells.push(...detectExcessiveNesting(ast));
  
  // Check for duplicate code
  smells.push(...detectDuplicateCode(ast));
  
  // Check for long command chains
  smells.push(...detectLongCommandChains(ast));
  
  // Check for complex conditions
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
        start: ast.start,
        end: ast.end,
        line: ast.line,
        column: ast.column
      },
      message: `Nesting depth of ${currentDepth} exceeds recommended maximum of ${maxDepth}`,
      suggestion: 'Consider extracting nested logic into separate functions or using early returns'
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
        if (!nodeStrings.has(nodeString)) {
          nodeStrings.set(nodeString, []);
        }
        nodeStrings.get(nodeString)!.push(node);
      }
    }
  });
  
  visit(ast, visitor);
  
  for (const [nodeString, nodes] of nodeStrings) {
    if (nodes.length > 1) {
      smells.push({
        type: 'duplicate-code',
        severity: 'medium',
        location: {
          start: nodes[0].start,
          end: nodes[0].end,
          line: nodes[0].line,
          column: nodes[0].column
        },
        message: `Duplicate code found (${nodes.length} occurrences)`,
        suggestion: 'Consider extracting common logic into a reusable function'
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
              start: node.start,
              end: node.end,
              line: node.line,
              column: node.column
            },
            message: `Command chain with ${commands.length} commands exceeds recommended maximum of ${maxCommands}`,
            suggestion: 'Consider breaking into smaller, focused handlers'
          });
        }
      }
    }
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
              start: node.start,
              end: node.end,
              line: node.line,
              column: node.column
            },
            message: `Condition complexity of ${conditionComplexity} is too high`,
            suggestion: 'Consider extracting condition logic into named variables'
          });
        }
      }
    }
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
    }
  });
  
  visit(expr, visitor);
  return complexity;
}

// ============================================================================
// Dependency Analysis
// ============================================================================

/**
 * Analyze variable dependencies in an AST
 */
export function analyzeDependencies(ast: ASTNode): DependencyGraph {
  const nodes = new Set<string>();
  const edges = new Map<string, Set<string>>();
  const variableUsage = new Map<string, VariableUsage>();
  
  // Collect variable definitions and usages
  const visitor = new ASTVisitor({
    enter(node, context) {
      // Variable definition (set command)
      if ((node as any).name === 'set' && (node as any).variable) {
        const varName = (node as any).variable.name;
        nodes.add(varName);
        
        if (!variableUsage.has(varName)) {
          variableUsage.set(varName, {
            name: varName,
            defined: [],
            used: [],
            type: 'variable'
          });
        }
        
        variableUsage.get(varName)!.defined.push({
          node,
          path: context.getPath()
        });
        
        // Check dependencies in the value
        if ((node as any).value) {
          const deps = extractDependencies((node as any).value);
          if (!edges.has(varName)) {
            edges.set(varName, new Set());
          }
          deps.forEach(dep => {
            nodes.add(dep);
            edges.get(varName)!.add(dep);
          });
        }
      }
      
      // Variable usage
      if (node.type === 'identifier') {
        const varName = (node as any).name;
        if (variableUsage.has(varName)) {
          variableUsage.get(varName)!.used.push({
            node,
            path: context.getPath()
          });
        }
      }
    }
  });
  
  visit(ast, visitor);
  
  // Detect cycles
  const cycles = detectCycles(nodes, edges);
  
  return { nodes, edges, cycles };
}

function extractDependencies(valueNode: ASTNode): string[] {
  const deps: string[] = [];
  
  const visitor = new ASTVisitor({
    enter(node) {
      if (node.type === 'identifier') {
        deps.push((node as any).name);
      }
    }
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
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }
  
  return cycles;
}

// ============================================================================
// Dead Code Detection
// ============================================================================

/**
 * Find dead code in an AST
 */
export function findDeadCode(ast: ASTNode): Array<{
  type: 'unused-variable' | 'unreachable-code';
  name?: string;
  location: { start: number; end: number; line: number; column: number };
  message: string;
}> {
  const deadCode: Array<{
    type: 'unused-variable' | 'unreachable-code';
    name?: string;
    location: { start: number; end: number; line: number; column: number };
    message: string;
  }> = [];
  
  // Find unused variables
  const deps = analyzeDependencies(ast);
  for (const [varName, usage] of Object.entries({})) {
    // This would need proper variable usage tracking
    // Simplified for now
  }
  
  // Find unused variables using a simpler approach
  const definedVars = new Set<string>();
  const usedVars = new Set<string>();
  const varDefinitions = new Map<string, ASTNode>();
  
  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).name === 'set' && (node as any).variable) {
        const varName = (node as any).variable.name;
        definedVars.add(varName);
        varDefinitions.set(varName, node);
      }
      
      if (node.type === 'identifier' && (node as any).name) {
        usedVars.add((node as any).name);
      }
    }
  });
  
  visit(ast, visitor);
  
  // Check for unused variables
  for (const varName of definedVars) {
    if (!usedVars.has(varName)) {
      const defNode = varDefinitions.get(varName)!;
      deadCode.push({
        type: 'unused-variable',
        name: varName,
        location: {
          start: defNode.start,
          end: defNode.end,
          line: defNode.line,
          column: defNode.column
        },
        message: `Variable '${varName}' is defined but never used`
      });
    }
  }
  
  // Find unreachable code (after halt, throw, etc.)
  let afterHalt = false;
  const visitor2 = new ASTVisitor({
    enter(node) {
      if ((node as any).name === 'halt' || (node as any).name === 'throw') {
        afterHalt = true;
      } else if (afterHalt && node.type === 'command') {
        deadCode.push({
          type: 'unreachable-code',
          location: {
            start: node.start,
            end: node.end,
            line: node.line,
            column: node.column
          },
          message: 'Unreachable code after halt/throw statement'
        });
      }
    }
  });
  
  visit(ast, visitor2);
  
  return deadCode;
}

// ============================================================================
// Optimization Suggestions
// ============================================================================

/**
 * Suggest optimizations for an AST
 */
export function suggestOptimizations(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  
  // Suggest batching similar operations
  suggestions.push(...suggestBatchOperations(ast));
  
  // Suggest simplifying nested conditionals
  suggestions.push(...suggestSimplifyConditionals(ast));
  
  // Suggest removing redundant operations
  suggestions.push(...suggestRemoveRedundant(ast));
  
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
              suggestion: `Combine multiple add operations: add ${group.map(c => c.args[0].value).join(' ')} to ${group[0].target?.name || 'target'}`,
              impact: 'high',
              confidence: 0.9
            });
          }
        }
      }
    }
  });
  
  visit(ast, visitor);
  return suggestions;
}

function suggestSimplifyConditionals(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  const complexity = calculateComplexity(ast);
  
  if (complexity.cognitive > 10) {
    suggestions.push({
      type: 'simplification',
      description: 'Simplify complex conditionals',
      suggestion: 'Break down complex conditional logic into smaller, named functions',
      impact: 'maintainability',
      confidence: 0.8
    });
  }
  
  return suggestions;
}

function suggestRemoveRedundant(ast: ASTNode): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  
  // This would analyze for redundant operations
  // Simplified implementation
  
  return suggestions;
}

function groupConsecutiveSameCommands(commands: any[]): any[][] {
  const groups: any[][] = [];
  let currentGroup: any[] = [];
  
  for (const cmd of commands) {
    if (currentGroup.length === 0 || cmd.name === currentGroup[0].name) {
      currentGroup.push(cmd);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [cmd];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

function sameTarget(commands: any[]): boolean {
  if (commands.length === 0) return true;
  const firstTarget = commands[0].target?.name;
  return commands.every(cmd => cmd.target?.name === firstTarget);
}

// ============================================================================
// Pattern Analysis
// ============================================================================

/**
 * Analyze patterns in an AST
 */
export function analyzePatterns(ast: ASTNode): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  
  // Detect event handler patterns
  if (ast.type === 'eventHandler') {
    patterns.push({
      pattern: 'event-handler',
      node: ast,
      bindings: { event: (ast as any).event },
      confidence: 0.9
    });
  }
  
  // Detect toggle patterns
  const visitor = new ASTVisitor({
    enter(node) {
      if ((node as any).commands && Array.isArray((node as any).commands)) {
        const commands = (node as any).commands;
        const toggleCommands = commands.filter((cmd: any) => cmd.name === 'toggle');
        
        if (toggleCommands.length >= 2) {
          patterns.push({
            pattern: 'toggle-pair',
            node,
            bindings: { 
              count: toggleCommands.length,
              targets: toggleCommands.map((cmd: any) => cmd.target?.name || cmd.target?.value)
            },
            confidence: 0.85
          });
        }
      }
    }
  });
  
  visit(ast, visitor);
  
  return patterns;
}

// ============================================================================
// Complete Analysis
// ============================================================================

/**
 * Perform comprehensive analysis of an AST
 */
export function analyzeMetrics(ast: ASTNode): AnalysisResult {
  const complexity = calculateComplexity(ast);
  const smells = detectCodeSmells(ast);
  const patterns = analyzePatterns(ast);
  const dependencies = analyzeDependencies(ast);
  
  // Calculate maintainability index (0-100)
  const maintainabilityIndex = calculateMaintainabilityIndex(complexity, smells);
  
  // Calculate readability score (0-100)
  const readabilityScore = calculateReadabilityScore(ast, smells);
  
  return {
    complexity,
    smells,
    patterns,
    dependencies,
    maintainabilityIndex,
    readabilityScore
  };
}

function calculateMaintainabilityIndex(complexity: ComplexityMetrics, smells: CodeSmell[]): number {
  let score = 100;
  
  // Penalize high complexity
  score -= Math.min(complexity.cyclomatic * 2, 30);
  score -= Math.min(complexity.cognitive, 20);
  
  // Penalize code smells
  const highSeveritySmells = smells.filter(s => s.severity === 'high').length;
  const mediumSeveritySmells = smells.filter(s => s.severity === 'medium').length;
  
  score -= highSeveritySmells * 15;
  score -= mediumSeveritySmells * 8;
  
  return Math.max(0, Math.min(100, score));
}

function calculateReadabilityScore(ast: ASTNode, smells: CodeSmell[]): number {
  let score = 100;
  
  // Penalize deep nesting
  const depth = measureDepth(ast);
  score -= Math.min(depth * 5, 25);
  
  // Penalize long command chains
  const longChains = smells.filter(s => s.type === 'long-command-chain').length;
  score -= longChains * 10;
  
  // Penalize complex conditions
  const complexConditions = smells.filter(s => s.type === 'complex-condition').length;
  score -= complexConditions * 12;
  
  return Math.max(0, Math.min(100, score));
}