/**
 * Semantic Integration
 *
 * Handles semantic bundle selection and integration layer generation.
 * Used when multilingual semantic support is enabled.
 */

import type { HyperfixiPluginOptions } from './types';
import { REGIONS, type SupportedLanguage } from './language-keywords';

/**
 * Semantic bundle types available.
 */
export type SemanticBundleType =
  | 'en'
  | 'es'
  | 'tr'
  | 'es-en'
  | 'western'
  | 'east-asian'
  | 'priority'
  | 'all';

/**
 * Semantic configuration resolved from options and detected languages.
 */
export interface SemanticConfig {
  /** Whether semantic parsing is enabled */
  enabled: boolean;

  /** Which semantic bundle to use */
  bundleType: SemanticBundleType | null;

  /** All languages to support (detected + explicit) */
  languages: Set<SupportedLanguage>;

  /** Whether grammar transformation is enabled */
  grammarEnabled: boolean;
}

/**
 * Resolve semantic configuration from plugin options and detected languages.
 */
export function resolveSemanticConfig(
  options: HyperfixiPluginOptions,
  detectedLanguages: Set<string>
): SemanticConfig {
  // Check if grammar is enabled (which implies semantic)
  const grammarEnabled = options.grammar ?? false;

  // Determine if semantic is enabled
  let semanticEnabled = grammarEnabled; // grammar implies semantic
  if (options.semantic === true || options.semantic === 'auto') {
    semanticEnabled = true;
  } else if (options.semantic === 'en') {
    semanticEnabled = true;
  } else if (options.semantic === false) {
    semanticEnabled = false;
  }

  // If not enabled, return early
  if (!semanticEnabled) {
    return {
      enabled: false,
      bundleType: null,
      languages: new Set(),
      grammarEnabled: false,
    };
  }

  // Collect all languages
  const languages = new Set<SupportedLanguage>();

  // Add detected languages
  for (const lang of detectedLanguages) {
    languages.add(lang as SupportedLanguage);
  }

  // Add explicitly configured languages
  if (options.languages) {
    for (const lang of options.languages) {
      languages.add(lang as SupportedLanguage);
    }
  }

  // Add extra languages
  if (options.extraLanguages) {
    for (const lang of options.extraLanguages) {
      languages.add(lang as SupportedLanguage);
    }
  }

  // Determine bundle type
  let bundleType = selectBundleType(options, languages);

  return {
    enabled: true,
    bundleType,
    languages,
    grammarEnabled,
  };
}

/**
 * Select the optimal semantic bundle type based on options and languages.
 */
function selectBundleType(
  options: HyperfixiPluginOptions,
  languages: Set<SupportedLanguage>
): SemanticBundleType {
  // If explicit region is set, use it
  if (options.region) {
    return options.region as SemanticBundleType;
  }

  // If semantic is 'en', use English-only bundle
  if (options.semantic === 'en') {
    return 'en';
  }

  // If explicit languages are set, find optimal bundle
  if (options.languages?.length) {
    return selectOptimalBundle(new Set(options.languages as SupportedLanguage[]));
  }

  // Use detected languages
  if (languages.size === 0) {
    // No languages detected, default to English
    return 'en';
  }

  return selectOptimalBundle(languages);
}

/**
 * Select the smallest bundle that covers all specified languages.
 */
export function selectOptimalBundle(languages: Set<SupportedLanguage>): SemanticBundleType {
  if (languages.size === 0) {
    return 'en';
  }

  const langArray = [...languages];

  // Check single-language bundles
  if (langArray.length === 1) {
    const lang = langArray[0];
    if (lang === 'en') return 'en';
    if (lang === 'es') return 'es';
    if (lang === 'tr') return 'tr';
    // Other single languages need regional bundles
  }

  // Check if en + es covers it (common bilingual case)
  if (langArray.length === 2 && langArray.includes('en') && langArray.includes('es')) {
    return 'es-en';
  }

  // Check if all languages fit in western bundle
  if (langArray.every((l) => REGIONS.western.includes(l))) {
    return 'western';
  }

  // Check if all languages fit in east-asian bundle
  if (langArray.every((l) => REGIONS['east-asian'].includes(l))) {
    return 'east-asian';
  }

  // Check if all languages fit in priority bundle
  if (langArray.every((l) => REGIONS.priority.includes(l))) {
    return 'priority';
  }

  // Need full bundle
  return 'all';
}

/**
 * Estimated bundle sizes (gzip) for each semantic bundle type.
 * Used for debug logging to help users understand size impact.
 */
export const SEMANTIC_BUNDLE_SIZES: Record<SemanticBundleType, { raw: string; gzip: string }> = {
  en: { raw: '80 KB', gzip: '~20 KB' },
  es: { raw: '63 KB', gzip: '~16 KB' },
  tr: { raw: '65 KB', gzip: '~17 KB' },
  'es-en': { raw: '101 KB', gzip: '~25 KB' },
  western: { raw: '124 KB', gzip: '~30 KB' },
  'east-asian': { raw: '97 KB', gzip: '~24 KB' },
  priority: { raw: '226 KB', gzip: '~48 KB' },
  all: { raw: '315 KB', gzip: '~61 KB' },
};

/**
 * Get the estimated size for a semantic bundle type.
 */
export function getSemanticBundleSize(bundleType: SemanticBundleType): { raw: string; gzip: string } {
  return SEMANTIC_BUNDLE_SIZES[bundleType] ?? SEMANTIC_BUNDLE_SIZES.all;
}

/**
 * Get the import path for a semantic bundle type.
 */
export function getSemanticBundleImport(bundleType: SemanticBundleType): string {
  switch (bundleType) {
    case 'en':
      return '@hyperfixi/semantic/browser/en';
    case 'es':
      return '@hyperfixi/semantic/browser/es';
    case 'tr':
      return '@hyperfixi/semantic/browser/tr';
    case 'es-en':
      return '@hyperfixi/semantic/browser/es-en';
    case 'western':
      return '@hyperfixi/semantic/browser/western';
    case 'east-asian':
      return '@hyperfixi/semantic/browser/east-asian';
    case 'priority':
      return '@hyperfixi/semantic/browser/priority';
    case 'all':
    default:
      return '@hyperfixi/semantic';
  }
}

/**
 * Generate the semantic integration layer code.
 * This is injected into the generated bundle when semantic is enabled.
 */
export function generateSemanticIntegrationCode(config: SemanticConfig): string {
  if (!config.enabled || !config.bundleType) {
    return '';
  }

  const bundleImport = getSemanticBundleImport(config.bundleType);
  const languages = [...config.languages].join("', '");

  let code = `
// =============================================================================
// SEMANTIC PARSER INTEGRATION
// =============================================================================

import {
  createSemanticAnalyzer,
  buildAST,
  isLanguageSupported,
} from '${bundleImport}';
`;

  if (config.grammarEnabled) {
    code += `
import { GrammarTransformer, translate } from '@hyperfixi/i18n';

const grammarTransformer = new GrammarTransformer();
`;
  }

  code += `
const semanticAnalyzer = createSemanticAnalyzer();
const SUPPORTED_SEMANTIC_LANGUAGES = ['${languages}'];
const SEMANTIC_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Parse hyperscript using semantic parser with fallback to HybridParser.
 */
function parseWithSemantic(code, lang = 'en') {
  // Only use semantic for supported languages
  if (isLanguageSupported(lang)) {
    try {
      const result = semanticAnalyzer.analyze(code, lang);
      if (result && result.confidence >= SEMANTIC_CONFIDENCE_THRESHOLD) {
        return buildAST(result.node);
      }
    } catch (e) {
      // Fallback to HybridParser on error
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[hyperfixi] Semantic parse failed, falling back:', e);
      }
    }
  }
  // Fallback to HybridParser
  return new HybridParser(code).parse();
}
`;

  if (config.grammarEnabled) {
    code += `
/**
 * Translate hyperscript between languages.
 */
function translateHyperscript(code, fromLang, toLang) {
  return translate(code, fromLang, toLang);
}
`;
  }

  return code;
}

/**
 * Get the list of exports to add when semantic is enabled.
 */
export function getSemanticExports(config: SemanticConfig): string[] {
  const exports: string[] = [];

  if (config.enabled) {
    exports.push('parseWithSemantic');
    exports.push('SUPPORTED_SEMANTIC_LANGUAGES');
  }

  if (config.grammarEnabled) {
    exports.push('translateHyperscript');
    exports.push('grammarTransformer');
  }

  return exports;
}
