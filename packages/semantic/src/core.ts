/**
 * Core Entry Point (No Language Data)
 *
 * A minimal ESM entry point that exports core semantic analysis infrastructure
 * without importing any language modules. Languages must be imported separately
 * as side-effect imports that self-register with the registry.
 *
 * This enables tree-shaking for Vite/Rollup projects that only need specific
 * languages rather than the full 25-language bundle.
 *
 * @example
 * ```typescript
 * // Import core infrastructure
 * import { createSemanticAnalyzer, buildAST, isLanguageSupported } from '@lokascript/semantic/core';
 *
 * // Import only the languages you need (self-registering side effects)
 * import '@lokascript/semantic/languages/en';
 * import '@lokascript/semantic/languages/es';
 *
 * // Now use the analyzer
 * const analyzer = createSemanticAnalyzer();
 * const result = analyzer.analyze('toggle .active', 'en');
 * ```
 */

// =============================================================================
// Core Parser Bridge (SemanticAnalyzer)
// =============================================================================

export {
  // Types
  type SemanticAnalysisResult,
  type SemanticAnalyzer,
  type SemanticAnalyzerOptions,
  // Implementation
  SemanticAnalyzerImpl,
  createSemanticAnalyzer,
  // Thresholds
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  // Helpers
  shouldUseSemanticResult,
  rolesToCommandArgs,
  // Cache types
  type SemanticCacheConfig,
  type CacheStats,
} from './core-bridge';

// =============================================================================
// AST Builder
// =============================================================================

export {
  // Main builder
  ASTBuilder,
  buildAST,
  // Value converters
  convertValue,
  convertLiteral,
  convertSelector,
  convertReference,
  convertPropertyPath,
  convertExpression,
  // Command mappers
  getCommandMapper,
  registerCommandMapper,
  getRegisteredMappers,
  // Types
  type ASTNode,
  type CommandNode,
  type EventHandlerNode,
  type ConditionalNode,
  type CommandSequenceNode,
  type BlockNode,
  type ASTBuilderOptions,
  type CommandMapper,
  type CommandMapperResult,
  type BuildASTResult,
} from './ast-builder';

// =============================================================================
// Registry (Language Management)
// =============================================================================

export {
  // Query functions
  isLanguageSupported,
  isLanguageRegistered,
  getRegisteredLanguages,
  getTokenizer,
  tryGetProfile,
  getProfile,
  getPatternsForLanguage,
  getPatternsForLanguageAndCommand,
  // Registration functions (used by self-registering language modules)
  registerLanguage,
  registerPatterns,
  setPatternGenerator,
  // Profile utilities
  mergeProfiles,
} from './registry';

// Re-export profile types from registry
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './registry';

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Semantic types
  ActionType,
  SemanticRole,
  SemanticValue,
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  SemanticMetadata,
  // Pattern types
  LanguagePattern,
  PatternMatchResult,
  // Token types
  LanguageToken,
  TokenKind,
  TokenStream,
  LanguageTokenizer,
} from './types';

// Type helpers
export {
  createSelector,
  createLiteral,
  createReference,
  createPropertyPath,
  createCommandNode,
  createEventHandler,
} from './types';

// =============================================================================
// Parsing & Rendering (registry-based, no language imports)
// =============================================================================

export { parse, canParse } from './parser';
export { render, renderExplicit, translate, toExplicit, fromExplicit } from './explicit';

// =============================================================================
// Pattern Generation (for per-language bundles that need on-demand patterns)
// =============================================================================

export { generatePatternsForLanguage } from './generators/pattern-generator';

// =============================================================================
// Cache
// =============================================================================

export { SemanticCache, semanticCache, createSemanticCache, withCache } from './cache';
