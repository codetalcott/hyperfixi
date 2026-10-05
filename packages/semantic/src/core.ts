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

// The pattern generator. The registry answers `getPatternsForLanguage` for a
// language that registered only its tokenizer and profile (every
// `languages/<code>` module) by generating that language's patterns — and the
// generator is installed by `patterns/index.ts` as a side effect, which the
// full index imports and this entry did not. So `/core` plus a language module
// registered the language and then threw "No patterns registered" on the first
// parse; nothing executed that path until the Vite plugin's emitted bundle was
// run (2026-10-03). The ESM twin of OPEN_ITEMS PR7 (the regional IIFEs).
import './patterns/index';

// =============================================================================
// Core Parser Bridge (SemanticAnalyzer)
// =============================================================================

export {
  // Thresholds
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
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

// Each language module registers its hand-crafted patterns here, through this
// entry: dist/languages/<lang>.js shares core's copy of the registry only via
// `../core` (src/patterns/handcrafted.ts).
export { registerHandcrafted } from './patterns/handcrafted';
export type { HandcraftedPatterns, HandcraftedSource } from './patterns/handcrafted';

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

// Static all-known-profiles manifest (non-deprecated successor to languageProfiles)
export { KNOWN_PROFILES } from './generators/known-profiles';
export { registerLexicon, getLexicon, getRegisteredLexicons } from './lexicon-registry';
export type { LanguageLexicon } from './generators/profiles/types';

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
  BlockCommandSemanticNode,
  ViewTransitionSemanticNode,
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
export {
  parseWithConfidence,
  type ParseWithConfidenceResult,
  type ConfidenceResult,
  calculateTranslationConfidence,
} from './utils/confidence-calculator';
export { render, renderExplicit, translate, toExplicit, fromExplicit } from './explicit';

// =============================================================================
// Pattern Generation (for per-language bundles that need on-demand patterns)
// =============================================================================

export { generatePatternsForLanguage } from './generators/pattern-generator';
// For `languages/en`, which builds English's list itself: through `../core`, its
// dist file shares these instead of inlining a second copy (the schemas, the
// generators and every language's repeat heads, ~250 KB unminified).
export { getRepeatPatternsForLanguage } from './patterns/repeat';

// =============================================================================
// Cache
// =============================================================================

export { SemanticCache, semanticCache, createSemanticCache, withCache } from './cache';
