/**
 * Slim Preprocessor
 *
 * Same logic as preprocessor.ts but imports from @lokascript/semantic/core
 * and uses a custom hyperscript renderer instead of the semantic package's
 * render(). This avoids importing English language data (tokenizer, patterns,
 * profile), saving ~35 KB per per-language bundle.
 *
 * Used by per-language browser bundles for tree-shaking.
 */

// Import from /core — does NOT trigger all-language registration.
// Languages are registered separately via side-effect imports in bundle entries.
import {
  parseWithConfidence,
  isLanguageRegistered,
  tryGetProfile,
} from '@lokascript/semantic/core';

import { renderToHyperscript } from './hyperscript-renderer';
import type { PreprocessorConfig } from './preprocessor';

const DEFAULT_THRESHOLD = 0.5;

const DEFAULT_CONFIG: PreprocessorConfig = {
  confidenceThreshold: DEFAULT_THRESHOLD,
  strategy: 'semantic',
  fallbackToOriginal: true,
};

function resolveThreshold(threshold: number | Record<string, number>, lang: string): number {
  if (typeof threshold === 'number') return threshold;
  return threshold[lang] ?? threshold['*'] ?? DEFAULT_THRESHOLD;
}

/**
 * Preprocess non-English hyperscript into English.
 * Identical to preprocessToEnglish in preprocessor.ts but with slim imports.
 *
 * Handles _hyperscript feature prefixes (e.g. "on click", "on every keyup")
 * by stripping them, translating only the command portion, then reassembling.
 */
export function preprocessToEnglish(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Try translating the full string first
  const fullResult = tryTranslateWithStrategies(src, lang, cfg);
  if (fullResult !== null) return fullResult;

  // If full translation failed, try stripping event/feature prefix
  const stripped = stripEventPrefix(src);
  if (stripped) {
    const translated = tryTranslateWithStrategies(stripped.commands, lang, cfg);
    if (translated !== null) return stripped.prefix + translated;
  }

  return src;
}

function tryTranslateWithStrategies(
  src: string,
  lang: string,
  cfg: PreprocessorConfig
): string | null {
  if (cfg.strategy === 'semantic' || cfg.strategy === 'auto') {
    const threshold = resolveThreshold(cfg.confidenceThreshold, lang);
    const result = trySemanticTranslation(src, lang, threshold);
    if (result !== null) return result;
  }

  if ((cfg.strategy === 'auto' || cfg.strategy === 'i18n') && cfg.i18nToEnglish) {
    const result = tryI18nTranslation(src, lang, cfg.i18nToEnglish);
    if (result !== null) return result;
  }

  return null;
}

/** Match _hyperscript event handler prefix. */
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

function trySemanticTranslation(src: string, lang: string, threshold: number): string | null {
  try {
    const statements = splitStatements(src, lang);
    if (statements.length > 1) {
      return translateCompound(statements, lang, threshold);
    }

    if (!isLanguageRegistered(lang)) return null;

    const result = parseWithConfidence(src, lang);
    if (result.confidence < threshold || !result.node) return null;

    return renderToHyperscript(result.node);
  } catch {
    return null;
  }
}

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

function splitStatements(src: string, lang: string): string[] {
  const thenWords = getThenKeywords(lang);
  // Escape regex special chars and build pattern
  const escaped = thenWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\s+(?:${escaped.join('|')})\\s+`, 'i');

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

function translateCompound(statements: string[], lang: string, threshold: number): string | null {
  const translated: string[] = [];
  for (const stmt of statements) {
    const result = trySemanticTranslation(stmt.trim(), lang, threshold);
    if (result === null) return null;
    translated.push(result);
  }
  return translated.join(' then ');
}
