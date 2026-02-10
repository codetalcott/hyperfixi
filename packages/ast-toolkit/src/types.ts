/**
 * Type definitions for AST Toolkit
 * Re-exports core types and adds toolkit-specific types
 */

// Re-export core types
export type {
  ASTNode,
  CommandNode,
  ExpressionNode,
  FeatureNode,
  StatementNode,
  Token,
  ParseResult,
  ParseError,
  ExecutionContext,
  ElementType,
  ExpressionCategory,
  EvaluationType,
} from '@hyperfixi/core';

// Import ASTNode directly for use in this file
import type { ASTNode } from '@hyperfixi/core';

// ============================================================================
// Visitor Pattern Types
// ============================================================================

export interface VisitorContext {
  /** Skip visiting children of current node */
  skip(): void;

  /** Stop traversal completely */
  stop(): void;

  /** Replace current node with another node */
  replace(node: ASTNode): void;

  /** Get the path to current node from root */
  getPath(): (string | number)[];

  /** Get parent node if exists */
  getParent(): ASTNode | null;

  /** Get current scope variables */
  getScope(): Map<string, any>;

  /** Set variable in current scope */
  setScope(key: string, value: any): void;
}

export interface VisitorHandlers {
  /** Called when entering a node */
  enter?(node: ASTNode, context: VisitorContext): void;

  /** Called when exiting a node */
  exit?(node: ASTNode, context: VisitorContext): void;

  /** Node-type specific handlers */
  [nodeType: string]: ((node: any, context: VisitorContext) => void) | undefined;
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryMatch {
  node: ASTNode;
  path: (string | number)[];
  matches: Record<string, any>;
}

export interface QuerySelector {
  type?: string;
  attribute?: string;
  value?: any;
  pseudo?: string;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  halstead: {
    vocabulary: number;
    length: number;
    difficulty: number;
    effort: number;
  };
}

export interface CodeSmell {
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: {
    start?: number;
    end?: number;
    line?: number;
    column?: number;
  };
  message: string;
  suggestion?: string;
}

export interface AnalysisResult {
  complexity: ComplexityMetrics;
  smells: CodeSmell[];
  patterns: PatternMatch[];
  dependencies: DependencyGraph;
  maintainabilityIndex: number;
  readabilityScore: number;
}

// ============================================================================
// Pattern Matching Types
// ============================================================================

export interface PatternMatch {
  type?: string;
  pattern: string;
  node: ASTNode;
  bindings: Record<string, any>;
  confidence: number;
  suggestion?: string;
}

export interface PatternTemplate {
  pattern: string;
  template: string;
  constraints?: Record<string, (node: ASTNode) => boolean> | undefined;
}

// ============================================================================
// Transformation Types
// ============================================================================

export interface TransformOptions {
  optimize?: boolean;
  minify?: boolean;
  preserveComments?: boolean;
  batchOperations?: boolean;
  batchSimilarOperations?: boolean;
  redundantClassOperations?: boolean;
}

export interface OptimizationPass {
  name: string;
  transform: (node: ASTNode, context: VisitorContext) => ASTNode | ASTNode[] | null;
  shouldRun?: ((node: ASTNode) => boolean) | undefined;
}

// ============================================================================
// Dependency Analysis Types
// ============================================================================

export interface DependencyGraph {
  nodes: Set<string>;
  edges: Map<string, Set<string>>;
  cycles: string[][];
}

export interface VariableUsage {
  name: string;
  defined: { node: ASTNode; path: (string | number)[] }[];
  used: { node: ASTNode; path: (string | number)[] }[];
  type: 'variable' | 'function' | 'element';
}

// ============================================================================
// AI/LLM Integration Types
// ============================================================================

export interface SemanticInfo {
  intent: string;
  trigger: string;
  effect: string;
  scope: 'local' | 'global' | 'element';
  tags: string[];
}

export interface SimilarityMatch {
  ast: ASTNode;
  similarity: number;
  reasons: string[];
}

export interface CodeSuggestion {
  type: 'simplification' | 'optimization' | 'refactoring' | 'modernization' | 'batch-operations';
  description: string;
  suggestion: string;
  impact: 'readability' | 'performance' | 'maintainability' | 'high' | 'medium' | 'low';
  confidence: number;
}

// ============================================================================
// Generation Types
// ============================================================================

export interface GenerationOptions {
  minify?: boolean;
  indentation?: string;
  spacing?: {
    aroundOperators?: boolean;
    afterCommas?: boolean;
    beforeBlocks?: boolean;
  };
  sourceMap?: boolean;
  sourceFileName?: string;
  outputFileName?: string;
}

export interface GenerationResult {
  code: string;
  sourceMap?: any;
}
