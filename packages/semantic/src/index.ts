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

// Render-vocabulary registry. The lexicons themselves live in separate
// `lexicons/{code}` modules so parse-only consumers can drop them; this entry
// pulls them in via `languages/_all` above (see ./lexicon-registry.ts).
export {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  registerLexicon,
  getLexicon,
  getRegisteredLexicons,
} from './lexicon-registry';
export type { LanguageLexicon } from './generators/profiles/types';

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
  WaitAlternative,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  LoopVariant,
  BlockCommandSemanticNode,
  ViewTransitionSemanticNode,
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  PatternMatchResult,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  PatternMatchError,

  // Token types
  LanguageToken,
  TokenKind,
  TokenStream,
  StreamMark,
  LanguageTokenizer,

  // Parser/Renderer interfaces
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  SemanticParser,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  createCompoundNode,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  createConditionalNode,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  createLoopNode,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  isBlockCommand,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  isViewTransitionBlock,
} from './types';

// =============================================================================
// Patterns
// =============================================================================

export {
  getPatternsForLanguage,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getPatternsForLanguageAndCommand,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getSupportedLanguages as getSupportedPatternLanguages,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getSupportedCommands,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getPatternById,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getPatternStats,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getTogglePatternsForLanguage,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getPutPatternsForLanguage,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getEventHandlerPatternsForLanguage,
  eventNameTranslations,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  normalizeEventName,
  localizeEventName,
  getEventLocalizationDenylist,
} from './patterns';

// =============================================================================
// Tokenizers
// =============================================================================

export {
  getTokenizer,
  tokenize,
  getSupportedLanguages as getSupportedTokenizerLanguages,
  isLanguageSupported,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  registerTokenizer,
  englishTokenizer,
  japaneseTokenizer,
  koreanTokenizer,
  arabicTokenizer,
  spanishTokenizer,
  turkishTokenizer,
  chineseTokenizer,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
export {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getHyperscriptExtractors,
} from './tokenizers/extractor-helpers';

// Generic extractors (re-exported from @lokascript/framework)
export {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  StringLiteralExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  NumberExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  IdentifierExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  OperatorExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  PunctuationExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getDefaultExtractors,
} from './tokenizers/generic-extractors';

// Context-aware extractor system (re-exported from @lokascript/framework)
export type {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  TokenizerContext,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  ContextAwareExtractor,
} from './tokenizers/context-aware-extractor';
export {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  isContextAwareExtractor,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. Import it from `@lokascript/framework`. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  createTokenizerContext,
} from './tokenizers/context-aware-extractor';

// Value extractor types (re-exported from @lokascript/framework)
export type { ValueExtractor, ExtractionResult } from './tokenizers/value-extractor-types';

// =============================================================================
// Parser
// =============================================================================

export {
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  SemanticParserImpl,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  semanticParser,
  parse,
  canParse,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getCommandType,
  fillSchemaDefaults,
  getSOVEventMarkers,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  PatternMatcher,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  patternMatcher,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  matchPattern,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  matchBest,
} from './parser';

// =============================================================================
// Explicit Mode
// =============================================================================

export {
  parseExplicit,
  isExplicitSyntax,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  SemanticRendererImpl,
  semanticRenderer,
  render,
  renderExplicit,
  toExplicit,
  fromExplicit,
  translate,
  LossyTranslationError,
  findTranslationLoss,
  type TranslateOptions,
  type TranslationLoss,
  type TranslationLossKind,
  parseAny,
  roundTrip,
  getAllTranslations,
  getAllTranslationsWithStatus,
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

/** Version of the semantic package (src/version.ts, rewritten at each release). */
export { VERSION } from './version';

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
  italianProfile,
  polishProfile,
  russianProfile,
  ukrainianProfile,
  hindiProfile,
  bengaliProfile,
  vietnameseProfile,
  hebrewProfile,
  thaiProfile,
  malayProfile,
  tagalogProfile,

  // Static all-known-profiles manifest
  KNOWN_PROFILES,

  // Query helpers over the manifest (for mcp-server/LSP/domain bridges)
  getKeywordTranslations,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getRoleMarkers,

  // Command schemas
  type CommandSchema,
  type RoleSpec,
  type AstShape,
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getSchemasByCategory,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getDefinedSchemas,

  // Pattern generator
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type GeneratorConfig,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generatePattern,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generateSimplePattern,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generatePatternVariants,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generatePatternsForLanguage,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generatePatternsForCommand,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  generateAllPatterns,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getGeneratorSummary,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  validateLanguageKeywords,

  // Schema validator
  type SchemaValidationItem,
  type SchemaValidationSeverity,
  type SchemaValidation,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type SchemaValidationResult,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  validateAndAdjustConfidence,
  getSchema as getValidatorSchema,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  registerSchema,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type UnifiedLanguageProfile,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type UnifiedRoleMarker,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type GrammarRule as UnifiedGrammarRule,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type PatternMatcher as UnifiedPatternMatcher,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  type PatternTransform as UnifiedPatternTransform,
  // Utilities
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  markingStrategyToAdpositionType,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  toGrammaticalMarker,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  toI18nProfile,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertValue,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertLiteral,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertSelector,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertReference,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertPropertyPath,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  convertExpression,
  // Command mappers
  getCommandMapper,
  resolveCommandMapper,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getSchemaMapper,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  buildFromAstShape,
  registerCommandMapper,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. `@lokascript/semantic/core` still exports it. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  loadLanguages,
  // Helpers
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  canLoadLanguage,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getLoadedLanguages,
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  getUnloadedLanguages,
  // Canonical supported-language list (single source of truth)
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
  SUPPORTED_LANGUAGES,
  // Backward-compatible alias
  /** @deprecated No known consumer; will be removed from the root export in 8.0. See docs-internal/SEMANTIC_ROOT_EXPORTS.md. */
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

// =============================================================================
// Name Collisions (a variable spelled like a word of the language)
// =============================================================================

export { findNameCollisions, findTranslationCollisions, nameCollision } from './name-collisions';
export type { NameCollision, NameCollisionFinding } from './name-collisions';
