/**
 * Language Detector for prism-hyperfixi.
 *
 * Detects the primary language in hyperscript code by analyzing keywords.
 * Uses keyword matching to determine which language dictionary best matches
 * the code content.
 */

import type { LanguageDetectionResult } from './types';
import { getAllKeywords, getSupportedLanguages } from './pattern-generator';
import { isNonLatinLanguage } from './token-definitions';

/**
 * Score result for a language.
 */
interface LanguageScore {
  language: string;
  score: number;
  matchedKeywords: string[];
}

/**
 * Check if a keyword exists in code.
 * Uses word boundaries for Latin scripts, simple includes for non-Latin.
 */
function keywordExistsInCode(code: string, keyword: string, isNonLatin: boolean): boolean {
  if (isNonLatin) {
    // Non-Latin: Simple substring match (characters are unambiguous)
    return code.includes(keyword);
  } else {
    // Latin: Use word boundary regex to avoid false positives
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    return pattern.test(code);
  }
}

/**
 * Detect the primary language in hyperscript code.
 *
 * Algorithm:
 * 1. For each supported non-English language, count matching keywords
 * 2. Rank languages by match count
 * 3. Return the highest-scoring language (default to 'en' if no matches)
 *
 * @param code The hyperscript code to analyze
 * @returns Detection result with language, confidence, and alternatives
 */
export function detectLanguage(code: string): LanguageDetectionResult {
  const languages = getSupportedLanguages().filter(lang => lang !== 'en');
  const englishKeywords = new Set(getAllKeywords('en'));
  const scores: LanguageScore[] = [];

  for (const lang of languages) {
    const isNonLatin = isNonLatinLanguage(lang);
    const keywords = getAllKeywords(lang);
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      // Skip very short keywords (less than 2 chars) for Latin to reduce false positives
      if (!isNonLatin && keyword.length < 2) {
        continue;
      }

      // Skip keywords identical to English — untranslated entries shouldn't
      // count as evidence for a non-English language
      if (!isNonLatin && englishKeywords.has(keyword)) {
        continue;
      }

      if (keywordExistsInCode(code, keyword, isNonLatin)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      scores.push({
        language: lang,
        score: matchedKeywords.length,
        matchedKeywords,
      });
    }
  }

  // If no non-English keywords found, assume English
  if (scores.length === 0) {
    return {
      language: 'en',
      confidence: 1.0,
      matchedKeywords: [],
      alternatives: [],
    };
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const primary = scores[0];
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  // Calculate confidence as proportion of total matches
  const confidence = totalScore > 0 ? primary.score / totalScore : 0;

  return {
    language: primary.language,
    confidence,
    matchedKeywords: primary.matchedKeywords,
    alternatives: scores.slice(1, 4).map(s => ({
      language: s.language,
      confidence: totalScore > 0 ? s.score / totalScore : 0,
    })),
  };
}

/**
 * Check if a language code is valid.
 */
export function isValidLanguage(languageCode: string): boolean {
  return languageCode === 'en' || getSupportedLanguages().includes(languageCode);
}

/**
 * Get the best language for highlighting, considering detection or forced language.
 *
 * @param code The code to analyze
 * @param forcedLanguage Optional language to force (if valid)
 * @returns The language code to use for highlighting
 */
export function getHighlightLanguage(code: string, forcedLanguage?: string): string {
  // If a valid language is forced, use it
  if (forcedLanguage && forcedLanguage !== 'auto' && isValidLanguage(forcedLanguage)) {
    return forcedLanguage;
  }

  // Otherwise, detect from code
  const result = detectLanguage(code);
  return result.language;
}
