/**
 * Translation Operations API
 *
 * Provides functions to query and manage translations.
 */

import { getDatabase } from '../database/connection';
import type {
  Translation,
  VerificationResult,
  WordOrder,
  TranslationMethod,
  ConnectionOptions,
} from '../types';

// =============================================================================
// Database Row Types
// =============================================================================

interface PatternTranslationRow {
  id: number;
  code_example_id: string;
  language: string;
  hyperscript: string;
  word_order: string;
  translation_method: string;
  confidence: number;
  verified_parses: number;
  verified_executes: number;
  role_alignment_score: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get a translation for a pattern in a specific language.
 */
export async function getTranslation(
  patternId: string,
  language: string,
  options?: ConnectionOptions
): Promise<Translation | null> {
  const db = getDatabase({ ...options, readonly: true });
  const row = db
    .prepare(
      `
    SELECT * FROM pattern_translations
    WHERE code_example_id = ? AND language = ?
  `
    )
    .get(patternId, language) as PatternTranslationRow | undefined;

  return row ? mapRowToTranslation(row) : null;
}

/**
 * Get all translations for a pattern.
 */
export async function getAllTranslations(
  patternId: string,
  options?: ConnectionOptions
): Promise<Translation[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT * FROM pattern_translations
    WHERE code_example_id = ?
    ORDER BY language
  `
    )
    .all(patternId) as PatternTranslationRow[];

  return rows.map(mapRowToTranslation);
}

/**
 * Get translations by language.
 */
export async function getTranslationsByLanguage(
  language: string,
  limit: number = 100,
  options?: ConnectionOptions
): Promise<Translation[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT * FROM pattern_translations
    WHERE language = ?
    ORDER BY confidence DESC
    LIMIT ?
  `
    )
    .all(language, limit) as PatternTranslationRow[];

  return rows.map(mapRowToTranslation);
}

/**
 * Get verified translations (successfully parsed).
 */
export async function getVerifiedTranslations(
  language: string,
  limit: number = 100,
  options?: ConnectionOptions
): Promise<Translation[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT * FROM pattern_translations
    WHERE language = ? AND verified_parses = 1
    ORDER BY confidence DESC
    LIMIT ?
  `
    )
    .all(language, limit) as PatternTranslationRow[];

  return rows.map(mapRowToTranslation);
}

/**
 * Get high-confidence translations.
 */
export async function getHighConfidenceTranslations(
  minConfidence: number = 0.8,
  limit: number = 100,
  options?: ConnectionOptions
): Promise<Translation[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT * FROM pattern_translations
    WHERE confidence >= ? AND verified_parses = 1
    ORDER BY confidence DESC
    LIMIT ?
  `
    )
    .all(minConfidence, limit) as PatternTranslationRow[];

  return rows.map(mapRowToTranslation);
}

/**
 * Verify a translation parses correctly.
 * Note: This requires @hyperfixi/semantic to be available.
 */
export async function verifyTranslation(
  translation: Translation,
  options?: ConnectionOptions
): Promise<VerificationResult> {
  let parseSuccess = false;
  let errorMessage: string | null = null;
  let confidence = translation.confidence;

  try {
    // Dynamic import to avoid bundling issues
    const { canParse, parse } = await import('@hyperfixi/semantic');

    if (canParse(translation.hyperscript, translation.language)) {
      parse(translation.hyperscript, translation.language);
      parseSuccess = true;
    } else {
      errorMessage = 'canParse returned false';
    }
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  // Update database
  const db = getDatabase(options);
  db.prepare(
    `
    UPDATE pattern_translations
    SET verified_parses = ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(parseSuccess ? 1 : 0, translation.id);

  // Record test result
  db.prepare(
    `
    INSERT INTO pattern_tests
      (code_example_id, language, test_date, parse_success, error_message)
    VALUES (?, ?, datetime('now'), ?, ?)
  `
  ).run(translation.codeExampleId, translation.language, parseSuccess ? 1 : 0, errorMessage);

  return {
    translation,
    parseSuccess,
    executeSuccess: false, // Not implemented yet
    errorMessage,
    confidence,
    testedAt: new Date(),
  };
}

/**
 * Get translation statistics by language.
 */
export async function getTranslationStats(
  options?: ConnectionOptions
): Promise<Record<string, { total: number; verified: number; avgConfidence: number }>> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare(
      `
    SELECT
      language,
      COUNT(*) as total,
      SUM(verified_parses) as verified,
      AVG(confidence) as avg_confidence
    FROM pattern_translations
    GROUP BY language
  `
    )
    .all() as { language: string; total: number; verified: number; avg_confidence: number }[];

  const stats: Record<string, { total: number; verified: number; avgConfidence: number }> = {};
  for (const row of rows) {
    stats[row.language] = {
      total: row.total,
      verified: row.verified,
      avgConfidence: row.avg_confidence || 0,
    };
  }

  return stats;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map database row to Translation type.
 */
function mapRowToTranslation(row: PatternTranslationRow): Translation {
  return {
    id: row.id,
    codeExampleId: row.code_example_id,
    language: row.language,
    hyperscript: row.hyperscript,
    wordOrder: row.word_order as WordOrder,
    translationMethod: row.translation_method as TranslationMethod,
    confidence: row.confidence,
    verifiedParses: row.verified_parses === 1,
    verifiedExecutes: row.verified_executes === 1,
    roleAlignmentScore: row.role_alignment_score ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get word order for a language.
 */
export function getWordOrder(language: string): WordOrder {
  const wordOrders: Record<string, WordOrder> = {
    en: 'SVO',
    es: 'SVO',
    fr: 'SVO',
    pt: 'SVO',
    id: 'SVO',
    sw: 'SVO',
    zh: 'SVO',
    ja: 'SOV',
    ko: 'SOV',
    tr: 'SOV',
    qu: 'SOV',
    ar: 'VSO',
    de: 'V2',
  };
  return wordOrders[language] || 'SVO';
}
