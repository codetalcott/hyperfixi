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

// Import to register all 13 languages. This enables tree-shaking for minimal bundles
// by importing only specific languages (e.g., './languages/en').
import './languages/_all';

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
  getAllPatterns,
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
 */
export function getSupportedLanguages(): string[] {
  return ['en', 'ja', 'ar', 'es', 'ko', 'zh', 'tr', 'pt', 'fr', 'de', 'id', 'qu', 'sw'];
}

/**
 * Version of the semantic package.
 */
export const VERSION = '0.1.0';

// =============================================================================
// Core Parser Bridge
// =============================================================================

export {
  // Types
  type SemanticAnalysisResult,
  type SemanticAnalyzer,
  // Implementation
  SemanticAnalyzerImpl,
  createSemanticAnalyzer,
  // Thresholds
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  // Helpers
  shouldUseSemanticResult,
  rolesToCommandArgs,
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
  languageProfiles,
  getProfile,
  getSupportedLanguages as getGeneratorLanguages,
  isLanguageSupported as isGeneratorLanguageSupported,

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
