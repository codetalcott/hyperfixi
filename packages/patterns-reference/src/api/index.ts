/**
 * Patterns Reference API
 *
 * Re-exports all API functions for querying patterns, translations, and LLM examples.
 */

// Patterns
export {
  getPatternById,
  getPatternsByCategory,
  getPatternsByCommand,
  searchPatterns,
  getAllPatterns,
  getPatternStats,
} from './patterns';

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
} from './translations';

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
} from './llm';
