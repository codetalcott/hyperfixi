/**
 * Preprocessor
 *
 * Translates non-English hyperscript to English using the semantic parser
 * (with optional i18n fallback), so the original _hyperscript can parse it.
 */

import {
  translate,
  render,
  parseSemantic,
  isLanguageRegistered,
  tryGetProfile,
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

/**
 * Preprocess non-English hyperscript into English.
 *
 * Uses the semantic parser to parse the input in the source language,
 * then renders back to English. Falls through to i18n if configured.
 *
 * Handles _hyperscript feature prefixes (e.g. "on click", "on every keyup")
 * by stripping them, translating only the command portion, then reassembling.
 */
export function preprocessToEnglish(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  // English→English is identity; skip semantic parsing which may mangle the input
  if (lang === 'en') return src;

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Try translating the full string first
  const fullResult = tryTranslateWithStrategies(src, lang, cfg);
  if (fullResult !== null) return fullResult;

  // If full translation failed, try stripping event/feature prefix.
  // _hyperscript attributes often contain "on <event> <commands>" — the semantic
  // parser only understands command syntax, not event declarations.
  const stripped = stripEventPrefix(src);
  if (stripped) {
    const translated = tryTranslateWithStrategies(stripped.commands, lang, cfg);
    if (translated !== null) return stripped.prefix + translated;
  }

  // Fallback: return original
  return cfg.fallbackToOriginal ? src : src;
}

/**
 * Try all configured translation strategies on the input.
 * Returns null if none succeed.
 */
function tryTranslateWithStrategies(
  src: string,
  lang: string,
  cfg: PreprocessorConfig
): string | null {
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

  return null;
}

/**
 * Match _hyperscript event handler prefix: "on [every] <event>[filter][.modifiers] "
 *
 * Examples:
 *   "on click toggle .active"            → prefix: "on click ", commands: "toggle .active"
 *   "on every click toggle .active"      → prefix: "on every click ", commands: "toggle .active"
 *   "on click.debounce(300) toggle .x"   → prefix: "on click.debounce(300) ", commands: "toggle .x"
 *   "on keyup[key=='Enter'] set x to 1"  → prefix: "on keyup[key=='Enter'] ", commands: "set x to 1"
 *   "on click from body toggle .active"  → prefix: "on click from body ", commands: "toggle .active"
 */
const EVENT_PREFIX_RE =
  /^(on\s+(?:every\s+)?[\w-]+(?:\[.*?\])?(?:\.[\w-]+(?:\([^)]*\))?)*(?:\s+from\s+\S+)?(?:\s+queue\s+\w+)?\s+)/;

function stripEventPrefix(src: string): { prefix: string; commands: string } | null {
  const match = src.match(EVENT_PREFIX_RE);
  if (!match) return null;
  const prefix = match[1];
  const commands = src.slice(prefix.length);
  if (!commands) return null;
  return { prefix, commands };
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
    if (!isLanguageRegistered(lang)) return null;

    const result = parseSemantic(src, lang);
    if (result.confidence < threshold || !result.node) {
      // If we got SOME confidence but no node, fall back to translate()
      if (result.confidence >= threshold) {
        return translate(src, lang, 'en');
      }
      return null;
    }

    // Render the semantic node to English
    return render(result.node, 'en');
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
