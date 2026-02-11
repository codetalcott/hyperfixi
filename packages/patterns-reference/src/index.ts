/**
 * @hyperfixi/patterns-reference
 *
 * Queryable patterns database for hyperscript with multilingual translations
 * and LLM support for few-shot learning.
 *
 * @example
 * ```typescript
 * import { createPatternsReference } from '@hyperfixi/patterns-reference';
 *
 * const ref = createPatternsReference();
 *
 * // Query patterns
 * const pattern = await ref.getPatternById('toggle-class-basic');
 * const patterns = await ref.searchPatterns('toggle');
 *
 * // Get translations
 * const translation = await ref.getTranslation('toggle-class-basic', 'ja');
 *
 * // Get LLM examples
 * const examples = await ref.getLLMExamples('toggle a class on click');
 *
 * // Clean up
 * ref.close();
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Pattern types
  Pattern,
  ClassifiedPattern,
  ComplexityLevel,
  EngineCompat,

  // Translation types
  Translation,
  VerificationResult,
  WordOrder,
  TranslationMethod,

  // LLM types
  LLMExample,

  // Language documentation types
  Command,
  Expression,
  ExpressionOperator,
  Keyword,
  Feature,
  SpecialSymbol,
  LanguageElement,
  LanguageElementType,
  LanguageDocsStats,

  // API types
  PatternsReference,
  SearchOptions,
  TestOptions,
  PatternStats,

  // Sync types
  SyncOptions,
  SyncResult,
  ValidationOptions,
  ValidationResult,
  DiscoveryResult,

  // Connection types
  ConnectionOptions,
} from './types';

// =============================================================================
// Database
// =============================================================================

export {
  getDatabase,
  closeDatabase,
  resetConnection,
  isConnected,
  getCurrentDbPath,
} from './database/connection';

// =============================================================================
// API
// =============================================================================

// Patterns
export {
  getPatternById,
  getPatternsByCategory,
  getPatternsByCommand,
  searchPatterns,
  getAllPatterns,
  getPatternStats,
} from './api/patterns';

// Translations
export {
  getTranslation,
  getAllTranslations,
  getTranslationsByLanguage,
  getVerifiedTranslations,
  getHighConfidenceTranslations,
  verifyTranslation,
  getTranslationStats,
  getWordOrder,
} from './api/translations';

// LLM
export {
  getLLMExamples,
  getExamplesByCommand,
  getHighQualityExamples,
  getMostUsedExamples,
  buildFewShotContext,
  addLLMExample,
  updateQualityScore,
  getLLMStats,
} from './api/llm';

// Language Documentation
export {
  // Commands
  getCommandByName,
  getAllCommands,
  searchCommands,
  // Expressions
  getExpressionByName,
  getAllExpressions,
  getExpressionsByCategory,
  // Keywords
  getKeywordByName,
  getAllKeywords,
  // Features
  getFeatureByName,
  getAllFeatures,
  // Special Symbols
  getSpecialSymbolByName,
  getAllSpecialSymbols,
  // Unified search
  searchLanguageElements,
  // Statistics
  getLanguageDocsStats,
} from './api/language-docs';

// =============================================================================
// Sync (placeholders - run via CLI scripts)
// =============================================================================

export {
  syncTranslations,
  validateAllTranslations,
  discoverPatterns,
  seedLLMExamples,
} from './sync';

// =============================================================================
// Adapters (for cross-package integration)
// =============================================================================

export {
  // Unified adapter factory
  createLLMAdapter,
  // Sync interface (backward compat with packages/core/src/context/llm-examples-query.ts)
  findRelevantExamples,
  findExamplesByCommand,
  buildFewShotContextSync,
  trackExampleUsage,
  getLLMExampleStats,
  isDatabaseAvailable,
  // Types
  type LLMExampleRecord,
} from './adapters/llm-adapter';

// =============================================================================
// Registry Integration (for @lokascript/semantic)
// =============================================================================

export {
  // Patterns provider
  DatabasePatternsProvider,
  createPatternsProvider,
  getDefaultProvider,
  resetDefaultProvider,
  // Types
  type PatternsSource,
  type PatternEntry,
} from './registry/patterns-provider';

// =============================================================================
// Semantic Bridge
// =============================================================================

export {
  // Initialization
  initializeSemanticIntegration,
  uninitializeSemanticIntegration,
  isSemanticIntegrationInitialized,
  getBridgeProvider,
  // Query helpers
  queryPatterns,
  queryPatternsForCommand,
  getSupportedLanguages,
  // Types
  type SemanticIntegrationOptions,
  type IntegrationResult,
} from './semantic-bridge';

// =============================================================================
// Factory
// =============================================================================

import type { PatternsReference, ConnectionOptions } from './types';
import * as patterns from './api/patterns';
import * as translations from './api/translations';
import * as llm from './api/llm';
import { getDatabase, closeDatabase } from './database/connection';

/**
 * Create a PatternsReference instance.
 *
 * This provides a unified API for querying patterns, translations,
 * and LLM examples from the hyperscript-lsp database.
 *
 * @param options - Connection options (dbPath, readonly)
 * @returns PatternsReference instance
 */
export function createPatternsReference(options?: ConnectionOptions): PatternsReference {
  // Initialize database connection
  getDatabase(options);

  return {
    // Patterns
    getPatternById: id => patterns.getPatternById(id, options),
    getPatternsByCategory: category => patterns.getPatternsByCategory(category, options),
    getPatternsByCommand: command => patterns.getPatternsByCommand(command, options),
    searchPatterns: (query, searchOptions) =>
      patterns.searchPatterns(query, searchOptions, options),

    // Translations
    getTranslation: (patternId, language) =>
      translations.getTranslation(patternId, language, options),
    getAllTranslations: patternId => translations.getAllTranslations(patternId, options),
    verifyTranslation: translation => translations.verifyTranslation(translation, options),

    // LLM
    getLLMExamples: (prompt, language, limit) =>
      llm.getLLMExamples(prompt, language, limit, options),

    // Stats
    getStats: () => patterns.getPatternStats(options),

    // Connection
    close: closeDatabase,
  };
}

/**
 * Version of the package.
 */
export const VERSION = '0.1.0';
