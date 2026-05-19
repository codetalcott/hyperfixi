/**
 * Semantic-First Multilingual Hyperscript
 *
 * This package provides a semantic-first approach to multilingual hyperscript,
 * enabling true native-language syntax that feels natural to speakers of any language.
 *
 * Key Features:
 * - Parse hyperscript from any supported language (en, ja, ar, es)
 * - Translate between languages while preserving semantic meaning
 * - Explicit mode syntax for learning and debugging
 * - Bidirectional conversion: natural ↔ explicit ↔ natural
 *
 * @example
 * // Parse Japanese to semantic
 * const node = parse('#button の .active を 切り替え', 'ja');
 *
 * // Render in English
 * const english = render(node, 'en');
 * // → 'toggle .active on #button'
 *
 * // Render in explicit mode
 * const explicit = renderExplicit(node);
 * // → '[toggle patient:.active destination:#button]'
 *
 * // Translate directly
 * const arabic = translate('toggle .active on #button', 'en', 'ar');
 * // → 'بدّل .active على #button'
 */

// =============================================================================
// Register All Languages (Full Bundle)
// =============================================================================

// Import to register all languages. This enables tree-shaking for minimal bundles
// by importing only specific languages (e.g., './languages/en').
import './languages/_all';

// Canonical list of supported languages, derived from the language-loader's
// LANGUAGE_IMPORTERS map. Used by the public `getSupportedLanguages()` below
// so adding a language to the loader automatically extends the public API.
import { SUPPORTED_LANGUAGES } from './language-loader';

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Semantic types
  ActionType,
  SemanticRole,
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  LoopVariant,
  SemanticMetadata,
  SourcePosition,
  EventModifiers,

  // Pattern types
  LanguagePattern,
  PatternTemplate,
  PatternToken,
  LiteralPatternToken,
  RolePatternToken,
  GroupPatternToken,
  ExtractionRules,
  ExtractionRule,
  PatternConstraints,
  PatternMatchResult,
  PatternMatchError,

  // Token types
  LanguageToken,
  TokenKind,
  TokenStream,
  StreamMark,
  LanguageTokenizer,

  // Parser/Renderer interfaces
  SemanticParser,
  SemanticRenderer,
} from './types';

// =============================================================================
// Type Helpers
// =============================================================================

export {
  createSelector,
  createLiteral,
  createReference,
  createPropertyPath,
  createCommandNode,
  createEventHandler,
  createCompoundNode,
  createConditionalNode,
  createLoopNode,
} from './types';

// =============================================================================
// Patterns
// =============================================================================

export {
  getPatternsForLanguage,
  getPatternsForLanguageAndCommand,
  getSupportedLanguages as getSupportedPatternLanguages,
  getSupportedCommands,
  getPatternById,
  getPatternStats,
  getTogglePatternsForLanguage,
  getPutPatternsForLanguage,
  getEventHandlerPatternsForLanguage,
  eventNameTranslations,
  normalizeEventName,
} from './patterns';

// =============================================================================
// Tokenizers
// =============================================================================

export {
  getTokenizer,
  tokenize,
  getSupportedLanguages as getSupportedTokenizerLanguages,
  isLanguageSupported,
  registerTokenizer,
  englishTokenizer,
  japaneseTokenizer,
  koreanTokenizer,
  arabicTokenizer,
  spanishTokenizer,
  turkishTokenizer,
  chineseTokenizer,
  TokenStreamImpl,
} from './tokenizers';

// =============================================================================
// Extractors (Cross-DSL Reuse)
// =============================================================================

// Hyperscript-specific extractors
export {
  CssSelectorExtractor,
  EventModifierExtractor,
  UrlExtractor,
  VariableRefExtractor,
} from './tokenizers/extractors/index';
export { getHyperscriptExtractors } from './tokenizers/extractor-helpers';

// Generic extractors (re-exported from @lokascript/framework)
export {
  StringLiteralExtractor,
  NumberExtractor,
  IdentifierExtractor,
  OperatorExtractor,
  PunctuationExtractor,
  getDefaultExtractors,
} from './tokenizers/generic-extractors';

// Context-aware extractor system (re-exported from @lokascript/framework)
export type { TokenizerContext, ContextAwareExtractor } from './tokenizers/context-aware-extractor';
export {
  isContextAwareExtractor,
  createTokenizerContext,
} from './tokenizers/context-aware-extractor';

// Value extractor types (re-exported from @lokascript/framework)
export type { ValueExtractor, ExtractionResult } from './tokenizers/value-extractor-types';

// =============================================================================
// Parser
// =============================================================================

export {
  SemanticParserImpl,
  semanticParser,
  parse,
  canParse,
  getCommandType,
  PatternMatcher,
  patternMatcher,
  matchPattern,
  matchBest,
} from './parser';

// =============================================================================
// Explicit Mode
// =============================================================================

export {
  parseExplicit,
  isExplicitSyntax,
  SemanticRendererImpl,
  semanticRenderer,
  render,
  renderExplicit,
  toExplicit,
  fromExplicit,
  translate,
  parseAny,
  roundTrip,
  getAllTranslations,
  validateTranslation,
} from './explicit';

// =============================================================================
// Registry (for language profile and pattern access)
// =============================================================================

export {
  tryGetProfile,
  getRegisteredLanguages,
  isLanguageRegistered,
  // Note: getPatternsForLanguage and getPatternsForLanguageAndCommand
  // are already exported from './patterns'
} from './registry';

// Note: LanguageProfile and related types are already exported from './generators'
// PossessiveConfig is exported below
export type { PossessiveConfig } from './registry';

// =============================================================================
// Convenience: Main API
// =============================================================================

/**
 * Get all supported languages for parsing.
 *
 * Derived from the canonical language-loader registry, so adding a new
 * language to LANGUAGE_IMPORTERS automatically extends this list.
 */
export function getSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Version of the semantic package.
 */
export const VERSION = '0.1.0';

// =============================================================================
// Core Parser Bridge
// =============================================================================

export {
  // Thresholds
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
} from './core-bridge';

// =============================================================================
// Pattern Generators (for creating patterns programmatically)
// =============================================================================

export {
  // Language profiles
  type LanguageProfile,
  type WordOrder,
  type MarkingStrategy,
  type RoleMarker,
  type VerbConfig,
  type VerbForm,
  type KeywordTranslation,
  type TokenizationConfig,
  englishProfile,
  japaneseProfile,
  arabicProfile,
  spanishProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  portugueseProfile,
  frenchProfile,
  germanProfile,
  indonesianProfile,
  quechuaProfile,
  swahiliProfile,

  // Static all-known-profiles manifest
  KNOWN_PROFILES,

  // Command schemas
  type CommandSchema,
  type RoleSpec,
  type CommandCategory,
  toggleSchema,
  addSchema,
  removeSchema,
  putSchema,
  setSchema,
  showSchema,
  hideSchema,
  onSchema,
  triggerSchema,
  waitSchema,
  fetchSchema,
  incrementSchema,
  decrementSchema,
  appendSchema,
  prependSchema,
  commandSchemas,
  getSchema,
  getSchemasByCategory,
  getDefinedSchemas,

  // Pattern generator
  type GeneratorConfig,
  generatePattern,
  generateSimplePattern,
  generatePatternVariants,
  generatePatternsForLanguage,
  generatePatternsForCommand,
  generateAllPatterns,
  getGeneratorSummary,
  validateLanguageKeywords,

  // Schema validator
  type SchemaValidationItem,
  type SchemaValidationSeverity,
  type SchemaValidation,
  type SchemaValidationResult,
  SchemaErrorCodes,
  validateCommandSchema,
  validateAllSchemas,
  formatValidationResults,
  getValidationStats,
} from './generators';

// =============================================================================
// Validators (Per-Command Semantic Validation)
// =============================================================================

export {
  validateSemanticResult,
  validateAndAdjustConfidence,
  getSchema as getValidatorSchema,
  registerSchema,
  schemaRegistry,
  type ValidationError,
  type ValidationResult,
} from './validators';

// =============================================================================
// Cache (Performance Optimization)
// =============================================================================

export {
  SemanticCache,
  semanticCache,
  createSemanticCache,
  withCache,
  type SemanticCacheConfig,
  type CacheStats,
} from './cache';

// =============================================================================
// Unified Language Profile (Package Integration)
// =============================================================================

export {
  // Types (using aliases to avoid conflicts with existing exports)
  type UnifiedLanguageProfile,
  type UnifiedRoleMarker,
  type GrammarRule as UnifiedGrammarRule,
  type PatternMatcher as UnifiedPatternMatcher,
  type PatternTransform as UnifiedPatternTransform,
  // Utilities
  markingStrategyToAdpositionType,
  toGrammaticalMarker,
  toI18nProfile,
  isUnifiedProfile,
} from './types/unified-profile';

// =============================================================================
// Static Analysis
// =============================================================================

export {
  // Main functions
  analyze,
  analyzeAll,
  analyzeMultiple,
  // Individual checks
  checkAccessibility,
  checkPerformance,
  checkSchema,
  // Dev mode
  enableDevMode,
  disableDevMode,
  isDevModeEnabled,
  getDevModeConfig,
  devModeAnalyze,
  // Types
  type AnalysisResult,
  type AnalysisWarning,
  type AnalysisConfig,
  type WarningSeverity,
  type WarningCode,
} from './analysis';

// =============================================================================
// AST Builder (Direct Semantic-to-AST conversion)
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
// Language Loader (Lazy Loading)
// =============================================================================

export {
  // Core functions
  loadLanguage,
  loadLanguages,
  // Helpers
  canLoadLanguage,
  getLoadedLanguages,
  getUnloadedLanguages,
  // Canonical supported-language list (single source of truth)
  SUPPORTED_LANGUAGES,
  // Backward-compatible alias
  SUPPORTED_LANGUAGES as LAZY_LOAD_LANGUAGES,
  // Types
  type LoadLanguageOptions,
  type LoadLanguageResult,
  type LanguageModule,
} from './language-loader';

// =============================================================================
// Confidence Calculator (Translation Verification)
// =============================================================================

export {
  calculateTranslationConfidence,
  parseWithConfidence,
  type ConfidenceResult,
  type ParseWithConfidenceResult,
} from './utils/confidence-calculator';

// =============================================================================
// Recommended Parsing Entry Point
// =============================================================================

import { parseWithConfidence as _parseWithConfidence } from './utils/confidence-calculator';
import type { ParseWithConfidenceResult as _PWCResult } from './utils/confidence-calculator';

/**
 * Parse hyperscript code in any supported language.
 *
 * This is the recommended entry point for semantic parsing. It returns the
 * complete semantic AST (including event handler bodies, compound statements,
 * and conditionals) along with a confidence score.
 *
 * Unlike `createSemanticAnalyzer().analyze()`, this function always uses the
 * full parser, so it never loses structural information.
 *
 * @param code - Hyperscript source code in any supported language
 * @param language - ISO 639-1 language code (e.g., 'en', 'ja', 'es')
 * @returns `{ node, confidence, error }` — the parsed AST, confidence score, and any error
 *
 * @example
 * ```typescript
 * import { parseSemantic } from '@lokascript/semantic';
 *
 * const result = parseSemantic('on click toggle .active', 'en');
 * if (result.node) {
 *   console.log(result.node.kind);       // 'event-handler'
 *   console.log(result.confidence);      // 0.95
 * }
 * ```
 */
export function parseSemantic(code: string, language: string): _PWCResult {
  return _parseWithConfidence(code, language);
}

// =============================================================================
// AST Interchange Format (for downstream tools like AOT compiler)
// =============================================================================

export { fromSemanticAST } from './interchange';
export type { InterchangeNode, EventModifiers as InterchangeEventModifiers } from './interchange';
