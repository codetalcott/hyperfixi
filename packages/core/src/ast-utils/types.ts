/**
 * Type definitions for AST utilities
 *
 * These types use a minimal ASTNode interface that works with any node
 * having a `type` string property. This matches the duck-typing approach
 * used throughout the visitor, query, and analysis modules.
 */

/**
 * Minimal AST node interface.
 * Works with core parser nodes, semantic nodes, and any object with `type`.
 */
export interface ASTNode {
  type: string;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
  [key: string]: any;
}

// ============================================================================
// Visitor Pattern Types
// ============================================================================

export interface VisitorContext {
  skip(): void;
  stop(): void;
  replace(node: ASTNode | ASTNode[] | null): void;
  getPath(): (string | number)[];
  getParent(): ASTNode | null;
  getScope(): Map<string, any>;
  setScope(key: string, value: any): void;
}

export interface VisitorHandlers {
  enter?(node: ASTNode, context: VisitorContext): void;
  exit?(node: ASTNode, context: VisitorContext): void;
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

export interface PatternMatch {
  type?: string;
  pattern: string;
  node: ASTNode;
  bindings: Record<string, any>;
  confidence: number;
  suggestion?: string;
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

export interface CodeSuggestion {
  type: 'simplification' | 'optimization' | 'refactoring' | 'modernization' | 'batch-operations';
  description: string;
  suggestion: string;
  impact: 'readability' | 'performance' | 'maintainability' | 'high' | 'medium' | 'low';
  confidence: number;
}

// ============================================================================
// Generator Types
// ============================================================================

export interface GeneratorOptions {
  minify?: boolean;
  indentation?: string;
  preserveRaw?: boolean;
  /** @internal */
  _indentLevel?: number;
}

export interface GeneratorResult {
  code: string;
  nodeCount: number;
}

// ============================================================================
// Documentation Types
// ============================================================================

export interface DocumentationOutput {
  title: string;
  description: string;
  eventHandlers: EventHandlerDoc[];
  behaviors: BehaviorDoc[];
  functions: FunctionDoc[];
  metrics: CodeMetrics;
  generatedAt: string;
}

export interface EventHandlerDoc {
  event: string;
  selector?: string;
  description: string;
  commands: CommandDoc[];
  source: string;
}

export interface BehaviorDoc {
  name: string;
  parameters: string[];
  description: string;
  eventHandlers: EventHandlerDoc[];
  source: string;
}

export interface FunctionDoc {
  name: string;
  parameters: string[];
  returns?: string | undefined;
  description: string;
  source: string;
}

export interface CommandDoc {
  name: string;
  description: string;
  target?: string | undefined;
}

export interface CodeMetrics {
  eventHandlerCount: number;
  behaviorCount: number;
  functionCount: number;
  commandCount: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very complex';
  cyclomaticComplexity: number;
}

export interface MarkdownOptions {
  includeSource?: boolean;
  includeMetrics?: boolean;
  includeToc?: boolean;
  headingLevel?: number;
}
