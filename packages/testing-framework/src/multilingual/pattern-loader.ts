/**
 * Pattern Loader - Queries patterns database for test cases
 */

import {
  getAllPatterns,
  getTranslationsByLanguage,
  getVerifiedTranslations,
  getHighConfidenceTranslations,
  getPatternStats,
  type Pattern,
  type Translation,
} from '@hyperfixi/patterns-reference';
import type { LanguageCode, PatternTranslation, TestConfig, SamplingStrategy } from './types';

/**
 * Load patterns for testing based on configuration
 */
export async function loadPatterns(config: TestConfig): Promise<PatternTranslation[]> {
  const languages = config.languages || (await getAllLanguages());
  const results: PatternTranslation[] = [];

  for (const language of languages) {
    const translations = await loadTranslationsForLanguage(language, config);
    results.push(...translations);
  }

  // Apply sampling if in quick mode
  if (config.mode === 'quick') {
    const limit = config.quickModeLimit || 10;
    return samplePatterns(results, { type: 'stratified', perCategory: limit });
  }

  return results;
}

/**
 * Load translations for a specific language
 */
async function loadTranslationsForLanguage(
  language: LanguageCode,
  config: TestConfig
): Promise<PatternTranslation[]> {
  let translations: Translation[];

  // Query based on configuration
  if (config.verifiedOnly) {
    translations = await getVerifiedTranslations(language, 1000);
  } else if (config.confidenceThreshold !== undefined) {
    // Get high confidence for all languages, then filter
    const allTranslations = await getHighConfidenceTranslations(config.confidenceThreshold, 1000);
    translations = allTranslations.filter(t => t.language === language);
  } else {
    translations = await getTranslationsByLanguage(language, 1000);
  }

  // Convert to PatternTranslation format
  return translations.map(t => mapToPatternTranslation(t));
}

/**
 * Map Translation to PatternTranslation
 */
function mapToPatternTranslation(translation: Translation): PatternTranslation {
  return {
    codeExampleId: translation.codeExampleId,
    language: translation.language as LanguageCode,
    hyperscript: translation.hyperscript,
    wordOrder: translation.wordOrder,
    confidence: translation.confidence,
    verifiedParses: translation.verifiedParses,
    roleAlignmentScore: ((translation as any).roleAlignmentScore ?? 0) as number,
  };
}

/**
 * Get all supported languages from database
 */
async function getAllLanguages(): Promise<LanguageCode[]> {
  const stats = await getPatternStats();
  return Object.keys(stats.byLanguage) as LanguageCode[];
}

/**
 * Sample patterns based on strategy
 */
function samplePatterns(
  patterns: PatternTranslation[],
  strategy: SamplingStrategy
): PatternTranslation[] {
  switch (strategy.type) {
    case 'all':
      return patterns;

    case 'first':
      return patterns.slice(0, strategy.count);

    case 'random':
      return shuffleArray([...patterns]).slice(0, strategy.count);

    case 'stratified': {
      // Group by language and sample from each
      const byLanguage = new Map<LanguageCode, PatternTranslation[]>();
      for (const pattern of patterns) {
        const lang = pattern.language;
        if (!byLanguage.has(lang)) {
          byLanguage.set(lang, []);
        }
        byLanguage.get(lang)!.push(pattern);
      }

      const sampled: PatternTranslation[] = [];
      for (const langPatterns of byLanguage.values()) {
        sampled.push(...langPatterns.slice(0, strategy.perCategory));
      }
      return sampled;
    }

    default:
      return patterns;
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j] as T;
    array[j] = temp as T;
  }
  return array;
}

/**
 * Get pattern statistics for reporting
 */
export async function getPatternStatistics() {
  return await getPatternStats();
}

/**
 * Load patterns by category
 */
export async function loadPatternsByCategory(
  categories: string[],
  languages: LanguageCode[]
): Promise<PatternTranslation[]> {
  const results: PatternTranslation[] = [];

  for (const language of languages) {
    const translations = await getTranslationsByLanguage(language, 1000);

    // Filter by category (would need to join with patterns table in real implementation)
    // For now, return all translations
    results.push(...translations.map(t => mapToPatternTranslation(t)));
  }

  return results;
}

/**
 * Count patterns by language
 */
export async function countPatternsByLanguage(): Promise<Record<LanguageCode, number>> {
  const stats = await getPatternStats();
  const counts: Record<string, number> = {};

  for (const [lang, data] of Object.entries(stats.byLanguage)) {
    counts[lang] = data.count;
  }

  return counts as Record<LanguageCode, number>;
}
