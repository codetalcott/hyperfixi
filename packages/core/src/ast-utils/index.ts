/**
 * AST Utilities
 *
 * General-purpose AST analysis, traversal, and transformation tools.
 * Consolidated from @lokascript/ast-toolkit.
 */

// Types
export type {
  ASTNode as ASTUtilNode,
  VisitorContext,
  VisitorHandlers,
  QueryMatch,
  ComplexityMetrics,
  CodeSmell,
  AnalysisResult,
  PatternMatch,
  TransformOptions,
  OptimizationPass,
  DependencyGraph,
  VariableUsage,
  CodeSuggestion,
  GeneratorOptions,
  GeneratorResult,
  DocumentationOutput,
  EventHandlerDoc,
  BehaviorDoc,
  FunctionDoc,
  CommandDoc,
  CodeMetrics,
  MarkdownOptions,
} from './types.js';

// Visitor
export {
  ASTVisitor,
  visit,
  findNodes,
  findFirst,
  getAncestors,
  createTypeCollector,
  measureDepth,
  countNodeTypes,
  createVisitorContext,
} from './visitor.js';

// Analysis
export {
  calculateComplexity,
  detectCodeSmells,
  analyzeMetrics,
  analyzeDependencies,
  findDeadCode,
  suggestOptimizations,
  analyzePatterns,
} from './analyzer.js';

// Generator
export {
  generate,
  generateWithMetadata,
  generateCommand,
  generateExpression,
  minify,
  format,
} from './generator.js';

// Documentation
export {
  generateDocumentation,
  generateMarkdown,
  generateHTML,
  generateJSON,
} from './documentation.js';

// Query
export { query, queryAll, parseSelector, queryXPath } from './query.js';

// Transformer
export {
  transform,
  optimize,
  applyOptimizationPasses,
  normalize,
  inlineVariables,
  extractCommonExpressions,
  createOptimizationPass,
} from './transformer.js';
