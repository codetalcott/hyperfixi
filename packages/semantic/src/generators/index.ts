/**
 * Pattern Generators
 *
 * Provides tools for generating language-specific patterns from
 * high-level schemas and language profiles.
 */

// Language profiles
export {
  type LanguageProfile,
  type WordOrder,
  type MarkingStrategy,
  type RoleMarker,
  type VerbConfig,
  type KeywordTranslation,
  type TokenizationConfig,
  englishProfile,
  japaneseProfile,
  arabicProfile,
  spanishProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  languageProfiles,
  getProfile,
  getSupportedLanguages,
  isLanguageSupported,
} from './language-profiles';

// Command schemas
export {
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
  goSchema,
  incrementSchema,
  decrementSchema,
  appendSchema,
  prependSchema,
  logSchema,
  sendSchema,
  // Tier 2: Content & variable operations
  takeSchema,
  makeSchema,
  cloneSchema,
  getCommandSchema,
  // Tier 3: Control flow & DOM
  callSchema,
  returnSchema,
  focusSchema,
  blurSchema,
  // Registry functions
  commandSchemas,
  getSchema,
  getSchemasByCategory,
  getDefinedSchemas,
} from './command-schemas';

// Pattern generator
export {
  type GeneratorConfig,
  generatePattern,
  generateSimplePattern,
  generatePatternVariants,
  generatePatternsForLanguage,
  generatePatternsForCommand,
  generateAllPatterns,
  getGeneratorSummary,
  validateLanguageKeywords,
} from './pattern-generator';
