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
  createSemanticAnalyzer,
  shouldUseSemanticResult,
  parse,
  type SemanticAnalyzer,
} from '@lokascript/semantic/core';

import { renderToHyperscript } from './hyperscript-renderer';
import type { PreprocessorConfig } from './preprocessor';

const DEFAULT_CONFIG: PreprocessorConfig = {
  confidenceThreshold: 0.5,
  strategy: 'semantic',
  fallbackToOriginal: true,
};

let analyzer: SemanticAnalyzer | null = null;

function getAnalyzer(): SemanticAnalyzer {
  if (!analyzer) {
    analyzer = createSemanticAnalyzer();
  }
  return analyzer;
}

/**
 * Preprocess non-English hyperscript into English.
 * Identical to preprocessToEnglish in preprocessor.ts but with slim imports.
 */
export function preprocessToEnglish(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (cfg.strategy === 'semantic' || cfg.strategy === 'auto') {
    const result = trySemanticTranslation(src, lang, cfg.confidenceThreshold);
    if (result !== null) return result;
  }

  if ((cfg.strategy === 'auto' || cfg.strategy === 'i18n') && cfg.i18nToEnglish) {
    const result = tryI18nTranslation(src, lang, cfg.i18nToEnglish);
    if (result !== null) return result;
  }

  return src;
}

function trySemanticTranslation(src: string, lang: string, threshold: number): string | null {
  try {
    const statements = splitStatements(src);
    if (statements.length > 1) {
      return translateCompound(statements, lang, threshold);
    }

    const sem = getAnalyzer();
    if (!sem.supportsLanguage(lang)) return null;

    const result = sem.analyze(src, lang);
    if (!shouldUseSemanticResult(result, threshold)) return null;

    if (result.node) {
      return renderToHyperscript(result.node);
    }

    // Fallback: parse then render via custom renderer
    const node = parse(src, lang);
    return renderToHyperscript(node);
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

function splitStatements(src: string): string[] {
  const lines = src
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  const result: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+then\s+/i);
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
