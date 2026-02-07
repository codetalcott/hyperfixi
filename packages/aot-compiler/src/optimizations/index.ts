/**
 * Optimization Passes
 *
 * AST optimization passes that run before code generation.
 */

import type {
  ASTNode,
  CommandNode,
  OptimizationPass,
  OptimizedAST,
  AnalysisResult,
  BinaryExpressionNode,
  LiteralNode,
  RepeatNode,
  SelectorNode,
  SequenceNode,
} from '../types/aot-types.js';

// =============================================================================
// CONSTANT FOLDING PASS
// =============================================================================

/**
 * Evaluates constant expressions at compile time.
 *
 * Examples:
 *   5 + 3 → 8
 *   "hello" & " world" → "hello world"
 *   true and false → false
 */
export class ConstantFoldingPass implements OptimizationPass {
  readonly name = 'constant-folding';

  shouldRun(analysis: AnalysisResult): boolean {
    // Run if there are pure expressions
    return analysis.expressions.pure.length > 0;
  }

  transform(ast: ASTNode, _analysis: AnalysisResult): ASTNode {
    return this.foldNode(ast);
  }

  private foldNode(node: ASTNode): ASTNode {
    if (!node) return node;

    // Process children first (bottom-up)
    const processed = this.processChildren(node);

    // Try to fold binary expressions
    if (processed.type === 'binary') {
      return this.foldBinary(processed as BinaryExpressionNode);
    }

    return processed;
  }

  private processChildren(node: ASTNode): ASTNode {
    const result: Record<string, unknown> = { ...node };

    for (const key of Object.keys(node)) {
      const value = node[key];

      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          item && typeof item === 'object' && 'type' in item ? this.foldNode(item as ASTNode) : item
        );
      } else if (value && typeof value === 'object' && 'type' in value) {
        result[key] = this.foldNode(value as ASTNode);
      }
    }

    return result as ASTNode;
  }

  private foldBinary(node: BinaryExpressionNode): ASTNode {
    const left = node.left;
    const right = node.right;

    // Both must be literals to fold
    if (left.type !== 'literal' || right.type !== 'literal') {
      return node;
    }

    const leftVal = (left as LiteralNode).value;
    const rightVal = (right as LiteralNode).value;

    let result: unknown;

    switch (node.operator) {
      // Arithmetic
      case '+':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal + rightVal;
        }
        break;
      case '-':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal - rightVal;
        }
        break;
      case '*':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal * rightVal;
        }
        break;
      case '/':
        if (typeof leftVal === 'number' && typeof rightVal === 'number' && rightVal !== 0) {
          result = leftVal / rightVal;
        }
        break;
      case '%':
        if (typeof leftVal === 'number' && typeof rightVal === 'number' && rightVal !== 0) {
          result = leftVal % rightVal;
        }
        break;

      // String concatenation
      case '&':
        result = String(leftVal) + String(rightVal);
        break;

      // Logical
      case 'and':
      case '&&':
        result = leftVal && rightVal;
        break;
      case 'or':
      case '||':
        result = leftVal || rightVal;
        break;

      // Comparison
      case 'is':
      case '==':
        result = leftVal === rightVal;
        break;
      case 'is not':
      case '!=':
        result = leftVal !== rightVal;
        break;
      case '<':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal < rightVal;
        }
        break;
      case '>':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal > rightVal;
        }
        break;
      case '<=':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal <= rightVal;
        }
        break;
      case '>=':
        if (typeof leftVal === 'number' && typeof rightVal === 'number') {
          result = leftVal >= rightVal;
        }
        break;
    }

    if (result !== undefined) {
      return {
        type: 'literal',
        value: result,
      } as LiteralNode;
    }

    return node;
  }
}

// =============================================================================
// SELECTOR CACHING PASS
// =============================================================================

/**
 * Identifies selectors that are used multiple times and marks them for caching.
 *
 * This pass adds metadata to selector nodes that the code generator can use
 * to generate cached selector lookups.
 */
export class SelectorCachingPass implements OptimizationPass {
  readonly name = 'selector-caching';

  shouldRun(analysis: AnalysisResult): boolean {
    // Run if there are multiple selector usages
    return analysis.expressions.selectors.some(s => s.usages.length > 1 && s.canCache);
  }

  transform(ast: ASTNode, analysis: AnalysisResult): ASTNode {
    // Build set of selectors to cache
    const selectorsToCache = new Set<string>();

    for (const info of analysis.expressions.selectors) {
      if (info.usages.length > 1 && info.canCache) {
        selectorsToCache.add(info.selector);
      }
    }

    if (selectorsToCache.size === 0) {
      return ast;
    }

    // Mark selector nodes for caching
    return this.markSelectors(ast, selectorsToCache);
  }

  private markSelectors(node: ASTNode, toCache: Set<string>): ASTNode {
    if (!node) return node;

    // Mark selector nodes
    if (node.type === 'selector') {
      const selector = (node as SelectorNode).value;
      if (toCache.has(selector)) {
        return {
          ...node,
          _cached: true,
          _cacheKey: this.generateCacheKey(selector),
        };
      }
      return node;
    }

    // Process children
    const result: Record<string, unknown> = { ...node };

    for (const key of Object.keys(node)) {
      const value = node[key];

      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          item && typeof item === 'object' && 'type' in item
            ? this.markSelectors(item as ASTNode, toCache)
            : item
        );
      } else if (value && typeof value === 'object' && 'type' in value) {
        result[key] = this.markSelectors(value as ASTNode, toCache);
      }
    }

    return result as ASTNode;
  }

  private generateCacheKey(selector: string): string {
    // Generate a short cache key from the selector
    return (
      '_sel_' +
      selector
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 20)
    );
  }
}

// =============================================================================
// DEAD CODE ELIMINATION PASS
// =============================================================================

/**
 * Removes unreachable code after halt, exit, return, or throw.
 */
export class DeadCodeEliminationPass implements OptimizationPass {
  readonly name = 'dead-code-elimination';

  shouldRun(analysis: AnalysisResult): boolean {
    // Run if there are control flow statements
    return analysis.controlFlow.canThrow;
  }

  transform(ast: ASTNode, _analysis: AnalysisResult): ASTNode {
    return this.eliminateDeadCode(ast) as ASTNode;
  }

  private eliminateDeadCode(node: ASTNode | ASTNode[]): ASTNode | ASTNode[] {
    if (!node) return node;

    // Process arrays (command sequences)
    if (Array.isArray(node)) {
      return this.eliminateFromArray(node);
    }

    // Process body arrays in nodes
    const result: Record<string, unknown> = { ...node };

    for (const key of ['body', 'thenBranch', 'elseBranch']) {
      const value = node[key];
      if (Array.isArray(value)) {
        result[key] = this.eliminateFromArray(value as ASTNode[]);
      }
    }

    // Process children
    for (const key of Object.keys(node)) {
      if (['body', 'thenBranch', 'elseBranch'].includes(key)) continue;

      const value = node[key];
      if (value && typeof value === 'object' && 'type' in value) {
        result[key] = this.eliminateDeadCode(value as ASTNode);
      }
    }

    return result as ASTNode;
  }

  private eliminateFromArray(nodes: ASTNode[]): ASTNode[] {
    const result: ASTNode[] = [];

    for (const node of nodes) {
      const processed = this.eliminateDeadCode(node);
      result.push(processed as ASTNode);

      // Check if this terminates execution
      if (this.isTerminator(node)) {
        // Everything after this is dead code
        break;
      }
    }

    return result;
  }

  private isTerminator(node: ASTNode): boolean {
    if (node.type === 'command') {
      return ['halt', 'exit', 'return', 'throw'].includes((node as CommandNode).name);
    }
    return false;
  }
}

// =============================================================================
// LOOP UNROLLING PASS
// =============================================================================

/**
 * Unrolls small fixed-count loops.
 *
 * Example:
 *   repeat 3 times add .active end
 * Becomes:
 *   add .active
 *   add .active
 *   add .active
 */
export class LoopUnrollingPass implements OptimizationPass {
  readonly name = 'loop-unrolling';

  private maxUnrollCount = 5;

  shouldRun(analysis: AnalysisResult): boolean {
    return analysis.controlFlow.hasLoops;
  }

  transform(ast: ASTNode, _analysis: AnalysisResult): ASTNode {
    return this.unrollLoops(ast);
  }

  private unrollLoops(node: ASTNode): ASTNode {
    if (!node) return node;

    // Check if this is an unrollable repeat
    if (node.type === 'repeat') {
      const unrolled = this.tryUnroll(node);
      if (unrolled) {
        return unrolled;
      }
    }

    // Process children
    const result: Record<string, unknown> = { ...node };

    for (const key of Object.keys(node)) {
      const value = node[key];

      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          item && typeof item === 'object' && 'type' in item
            ? this.unrollLoops(item as ASTNode)
            : item
        );
      } else if (value && typeof value === 'object' && 'type' in value) {
        result[key] = this.unrollLoops(value as ASTNode);
      }
    }

    return result as ASTNode;
  }

  private tryUnroll(node: ASTNode): ASTNode | null {
    const repeatNode = node as RepeatNode;

    // Must have a fixed numeric count
    if (typeof repeatNode.count !== 'number') {
      return null;
    }

    const count = repeatNode.count;
    const body = repeatNode.body ?? [];

    // Don't unroll if too many iterations
    if (count > this.maxUnrollCount) {
      return null;
    }

    // Don't unroll if body is too large
    if (body.length > 3) {
      return null;
    }

    // Don't unroll if body uses 'index' variable
    if (this.usesIndex(body)) {
      return null;
    }

    // Unroll: create sequence of body copies
    const unrolled: ASTNode[] = [];
    for (let i = 0; i < count; i++) {
      unrolled.push(...this.cloneBody(body));
    }

    return {
      type: 'sequence',
      commands: unrolled,
      _unrolled: true,
    } as SequenceNode;
  }

  private usesIndex(nodes: ASTNode[]): boolean {
    for (const node of nodes) {
      if (this.nodeUsesIndex(node)) {
        return true;
      }
    }
    return false;
  }

  private nodeUsesIndex(node: ASTNode): boolean {
    if (!node) return false;

    // Check identifiers
    if (node.type === 'identifier') {
      if (node.value === 'index' || node.value === ':index') {
        return true;
      }
    }
    if (node.type === 'variable') {
      if (node.name === 'index' || node.name === ':index') {
        return true;
      }
    }

    // Check children
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            if (this.nodeUsesIndex(item as ASTNode)) {
              return true;
            }
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        if (this.nodeUsesIndex(value as ASTNode)) {
          return true;
        }
      }
    }

    return false;
  }

  private cloneBody(nodes: ASTNode[]): ASTNode[] {
    return JSON.parse(JSON.stringify(nodes));
  }
}

// =============================================================================
// OPTIMIZATION PIPELINE
// =============================================================================

/**
 * Runs all optimization passes on an AST.
 */
export class OptimizationPipeline {
  private passes: OptimizationPass[] = [
    new ConstantFoldingPass(),
    new SelectorCachingPass(),
    new DeadCodeEliminationPass(),
    new LoopUnrollingPass(),
  ];

  /**
   * Run all applicable optimizations on the AST.
   */
  optimize(ast: ASTNode, analysis: AnalysisResult, level: 0 | 1 | 2 = 2): OptimizedAST {
    if (level === 0) {
      return ast as OptimizedAST;
    }

    let current = ast;
    const appliedOptimizations: string[] = [];

    const passesToRun =
      level === 1
        ? this.passes.slice(0, 2) // Basic: constant folding and selector caching
        : this.passes; // Full: all passes

    for (const pass of passesToRun) {
      if (pass.shouldRun(analysis)) {
        current = pass.transform(current, analysis);
        appliedOptimizations.push(pass.name);
      }
    }

    return {
      ...current,
      _optimizations: appliedOptimizations,
    } as OptimizedAST;
  }

  /**
   * Add a custom optimization pass.
   */
  addPass(pass: OptimizationPass): void {
    this.passes.push(pass);
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Create a default optimization pipeline.
 */
export function createOptimizer(): OptimizationPipeline {
  return new OptimizationPipeline();
}

/**
 * Optimize an AST with default settings.
 */
export function optimize(
  ast: ASTNode,
  analysis: AnalysisResult,
  level: 0 | 1 | 2 = 2
): OptimizedAST {
  const pipeline = new OptimizationPipeline();
  return pipeline.optimize(ast, analysis, level);
}

export default OptimizationPipeline;
