/**
 * Preprocessor
 *
 * Translates non-English hyperscript to English using the semantic parser
 * (with optional i18n fallback), so the original _hyperscript can parse it.
 */

import {
  translate,
  render,
  createSemanticAnalyzer,
  shouldUseSemanticResult,
  tryGetProfile,
  type SemanticAnalyzer,
} from '@lokascript/semantic';

export interface PreprocessorConfig {
  /**
   * Minimum confidence threshold for semantic parsing (0-1). Default: 0.5.
   * Can be a single number (applies to all languages) or a per-language map.
   * Per-language thresholds are useful because SOV languages (ja, ko, tr) produce
   * inherently lower confidence scores than SVO languages (es, fr, de).
   *
   * @example
   * // Single threshold
   * { confidenceThreshold: 0.5 }
   *
   * @example
   * // Per-language thresholds
   * { confidenceThreshold: { es: 0.7, ja: 0.1, ko: 0.05, '*': 0.5 } }
   */
  confidenceThreshold: number | Record<string, number>;
  /** Strategy: 'semantic' (default), 'i18n', or 'auto' (semantic then i18n) */
  strategy: 'semantic' | 'i18n' | 'auto';
  /** Whether to return original text on failure. Default: true */
  fallbackToOriginal: boolean;
  /** Optional i18n toEnglish function (loaded dynamically if available) */
  i18nToEnglish?: (input: string, locale: string) => string;
}

const DEFAULT_THRESHOLD = 0.5;

const DEFAULT_CONFIG: PreprocessorConfig = {
  confidenceThreshold: DEFAULT_THRESHOLD,
  strategy: 'semantic',
  fallbackToOriginal: true,
};

/**
 * Resolve the confidence threshold for a specific language.
 * Supports both a single number and a per-language map with '*' as default.
 */
function resolveThreshold(threshold: number | Record<string, number>, lang: string): number {
  if (typeof threshold === 'number') return threshold;
  return threshold[lang] ?? threshold['*'] ?? DEFAULT_THRESHOLD;
}

let analyzer: SemanticAnalyzer | null = null;

function getAnalyzer(): SemanticAnalyzer {
  if (!analyzer) {
    analyzer = createSemanticAnalyzer();
  }
  return analyzer;
}

/**
 * Preprocess non-English hyperscript into English.
 *
 * Uses the semantic parser to parse the input in the source language,
 * then renders back to English. Falls through to i18n if configured.
 */
export function preprocessToEnglish(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Strategy: semantic-only
  if (cfg.strategy === 'semantic' || cfg.strategy === 'auto') {
    const threshold = resolveThreshold(cfg.confidenceThreshold, lang);
    const result = trySemanticTranslation(src, lang, threshold);
    if (result !== null) return result;
  }

  // Strategy: i18n fallback (auto mode or i18n-only)
  if ((cfg.strategy === 'auto' || cfg.strategy === 'i18n') && cfg.i18nToEnglish) {
    const result = tryI18nTranslation(src, lang, cfg.i18nToEnglish);
    if (result !== null) return result;
  }

  // Fallback: return original
  return cfg.fallbackToOriginal ? src : src;
}

/**
 * Try semantic translation: parse in source language, render to English.
 * Returns null if confidence is below threshold.
 */
function trySemanticTranslation(src: string, lang: string, threshold: number): string | null {
  try {
    // Handle compound statements (split on "then" boundaries and newlines)
    const statements = splitStatements(src, lang);
    if (statements.length > 1) {
      return translateCompound(statements, lang, threshold);
    }

    // Check if the semantic parser can handle this
    const sem = getAnalyzer();
    if (!sem.supportsLanguage(lang)) return null;

    const result = sem.analyze(src, lang);
    if (!shouldUseSemanticResult(result, threshold)) return null;

    // Render the semantic node to English
    if (result.node) {
      return render(result.node, 'en');
    }

    // Fallback: use translate() which combines parse+render
    return translate(src, lang, 'en');
  } catch {
    return null;
  }
}

/**
 * Try i18n grammar transformation to English.
 * Returns null if the result is identical to input (no translation happened).
 */
function tryI18nTranslation(
  src: string,
  lang: string,
  toEnglish: (input: string, locale: string) => string
): string | null {
  try {
    const result = toEnglish(src, lang);
    return result !== src ? result : null;
  } catch {
    return null;
  }
}

/**
 * Get all "then" keyword forms for a language (primary + alternatives).
 * Falls back to English "then" if profile is unavailable.
 */
function getThenKeywords(lang: string): string[] {
  const keywords = ['then']; // Always include English
  const profile = tryGetProfile(lang);
  if (profile?.keywords?.then) {
    const kw = profile.keywords.then;
    if (kw.primary && kw.primary !== 'then') keywords.push(kw.primary);
    if (kw.alternatives) {
      for (const alt of kw.alternatives) {
        if (!keywords.includes(alt)) keywords.push(alt);
      }
    }
  }
  return keywords;
}

/**
 * Split a hyperscript source string into individual statements.
 * Splits on language-specific "then" keywords and newlines.
 */
function splitStatements(src: string, lang: string): string[] {
  const thenWords = getThenKeywords(lang);
  // Escape regex special chars and build pattern
  const escaped = thenWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\s+(?:${escaped.join('|')})\\s+`, 'i');

  // Split on newlines first
  const lines = src
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  const result: string[] = [];
  for (const line of lines) {
    const parts = line.split(pattern);
    result.push(...parts);
  }
  return result;
}

/**
 * Translate compound statements individually and rejoin with " then ".
 */
function translateCompound(statements: string[], lang: string, threshold: number): string | null {
  const translated: string[] = [];
  for (const stmt of statements) {
    const result = trySemanticTranslation(stmt.trim(), lang, threshold);
    if (result === null) return null; // If any part fails, fail the whole compound
    translated.push(result);
  }
  return translated.join(' then ');
}
