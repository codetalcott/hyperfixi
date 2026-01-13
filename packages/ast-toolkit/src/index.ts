/**
 * HyperFixi AST Toolkit
 * Advanced AST analysis and manipulation tools for hyperscript
 */

// Re-export all types
export type * from './types.js';

// Core visitor pattern functionality - WORKING
export {
  ASTVisitor,
  visit,
  findNodes,
  findFirst,
  getAncestors,
  createTypeCollector,
  measureDepth,
  countNodeTypes,
} from './visitor/index.js';

// Query engine functionality - BASIC FUNCTIONALITY
export { query, queryAll, parseSelector, queryXPath } from './query/index.js';

// Pattern matching functionality - IN DEVELOPMENT
export {
  matchPattern,
  parsePattern,
  extractPatterns,
  matchWildcard,
  createPatternMatcher,
  applyPatternTemplate,
  createPatternTemplate,
} from './pattern-matching/index.js';

// Analysis functionality - WORKING
export {
  calculateComplexity,
  detectCodeSmells,
  analyzeMetrics,
  analyzeDependencies,
  findDeadCode,
  suggestOptimizations,
  analyzePatterns,
} from './analyzer/index.js';

// LSP Integration functionality - WORKING
export {
  astToLSPDiagnostics,
  astToLSPCompletions,
  astToLSPHover,
  astToLSPSymbols,
  createASTEnhancedLSPHandlers,
  createLSPIntegration,
  setDocumentAST,
  clearDocumentAST,
  DEFAULT_LSP_CONFIG,
  DiagnosticSeverity,
  CompletionItemKind,
  SymbolKind,
} from './lsp/index.js';

// Transformer functionality - WORKING
export {
  transform,
  optimize,
  applyOptimizationPasses,
  normalize,
  inlineVariables,
  extractCommonExpressions,
  createOptimizationPass,
} from './transformer/index.js';

// Code Generator functionality - WORKING
export {
  generate,
  generateWithMetadata,
  generateCommand,
  generateExpression,
  minify,
  format,
} from './generator/index.js';

export type { GeneratorOptions, GeneratorResult } from './generator/index.js';

// AI-Friendly APIs functionality - WORKING
export {
  explainCode,
  generateCodeTemplate,
  recognizeIntent,
  recognizeIntentAsync,
  generateQualityInsights,
  createAIAssistant,
  isEnhancedIntentRecognitionAvailable,
} from './ai/index.js';

export type {
  ExplanationOptions,
  CodeExplanation,
  CodeGenerationOptions,
  CodeTemplate,
  RecognizedIntent,
  QualityInsight,
  AIAssistant,
} from './ai/index.js';

// Semantic Analysis functionality - WORKING
export {
  extractIntents,
  calculateSimilarity,
  generateVariations,
  extractSemanticPatterns,
  analyzeSemantics,
} from './semantic/index.js';

export type {
  SemanticIntent,
  CodeSimilarity,
  CodeVariation,
  SemanticAnalysis,
  SemanticPattern,
  SemanticRelationship,
  SemanticComplexity,
} from './semantic/index.js';

// Performance Optimization functionality - WORKING
export {
  benchmarkOperation,
  benchmarkASTOperations,
  calculateComplexityOptimized,
  analyzeMetricsOptimized,
  findNodesOptimized,
  processASTsBatch,
  setPerformanceConfig,
  getPerformanceConfig,
  analyzePerformance,
  getCacheStats,
  clearAllCaches,
  formatBenchmarkResults,
  formatOptimizationSuggestions,
} from './performance/index.js';

export type {
  BenchmarkResult,
  PerformanceConfig,
  OptimizationSuggestion,
} from './performance/index.js';

// MCP Server functionality - WORKING
export {
  createASTToolkitMCPServer,
  createMCPServerWithHandlers,
  ASTToolkitMCPServer,
} from './mcp/index.js';

export type {
  InitializeRequest,
  InitializeResult,
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ListResourcesRequest,
  ListResourcesResult,
  ReadResourceRequest,
  ReadResourceResult,
  Tool,
  Resource,
  MCPRequest,
  MCPResult,
  MCPMessage,
} from './mcp/types.js';

// Documentation Generator functionality - WORKING
export {
  generateDocumentation,
  generateMarkdown,
  generateHTML,
  generateJSON,
} from './documentation/index.js';

export type {
  DocumentationOutput,
  EventHandlerDoc,
  BehaviorDoc,
  FunctionDoc,
  CommandDoc,
  CodeMetrics,
  MarkdownOptions,
} from './documentation/index.js';
