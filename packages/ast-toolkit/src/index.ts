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
  countNodeTypes
} from './visitor/index.js';

// Query engine functionality - BASIC FUNCTIONALITY
export {
  query,
  queryAll,
  parseSelector,
  queryXPath
} from './query/index.js';

// Pattern matching functionality - IN DEVELOPMENT
export {
  matchPattern,
  parsePattern,
  extractPatterns,
  matchWildcard,
  createPatternMatcher,
  applyPatternTemplate,
  createPatternTemplate
} from './pattern-matching/index.js';

// Analysis functionality - WORKING
export {
  calculateComplexity,
  detectCodeSmells,
  analyzeMetrics,
  analyzeDependencies,
  findDeadCode,
  suggestOptimizations,
  analyzePatterns
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
  SymbolKind
} from './lsp/index.js';

export const transformer = {
  // Will be implemented  
};

export const generator = {
  // Will be implemented
};

// AI-Friendly APIs functionality - WORKING  
export {
  explainCode,
  generateCodeTemplate,
  recognizeIntent,
  generateQualityInsights,
  createAIAssistant
} from './ai/index.js';

export type {
  ExplanationOptions,
  CodeExplanation,
  CodeGenerationOptions,
  CodeTemplate,
  RecognizedIntent,
  QualityInsight,
  AIAssistant
} from './ai/index.js';