/**
 * Semantic Integration
 *
 * Handles semantic bundle selection and integration layer generation.
 * Used when multilingual semantic support is enabled.
 */

import type { HyperfixiPluginOptions } from './types';
import { REGIONS, type SupportedLanguage } from './language-keywords';

/**
 * Multilingual command aliases.
 * Maps non-English command keywords to their English equivalents.
 */
const MULTILINGUAL_COMMAND_ALIASES: Partial<Record<SupportedLanguage, Record<string, string>>> = {
  ja: {
    'トグル': 'toggle', '切り替え': 'toggle',
    '追加': 'add', '削除': 'remove',
    '表示': 'show', '隠す': 'hide', '非表示': 'hide',
    '設定': 'set', 'セット': 'set',
    '増加': 'increment', '減少': 'decrement',
    'ログ': 'log', '出力': 'log',
  },
  ko: {
    '토글': 'toggle', '전환': 'toggle',
    '추가': 'add', '제거': 'remove', '삭제': 'remove',
    '표시': 'show', '숨기다': 'hide',
    '설정': 'set', '증가': 'increment', '감소': 'decrement',
    '로그': 'log',
  },
  zh: {
    '切换': 'toggle', '添加': 'add', '移除': 'remove', '删除': 'remove',
    '显示': 'show', '隐藏': 'hide',
    '设置': 'set', '设定': 'set',
    '增加': 'increment', '减少': 'decrement',
    '日志': 'log', '记录': 'log',
  },
  ar: {
    'بدّل': 'toggle', 'بدل': 'toggle',
    'أضف': 'add', 'اضف': 'add',
    'أزل': 'remove', 'ازل': 'remove', 'احذف': 'remove',
    'أظهر': 'show', 'اظهر': 'show',
    'أخفِ': 'hide', 'اخف': 'hide',
    'ضع': 'set', 'اضع': 'set',
    'زِد': 'increment', 'أنقص': 'decrement',
  },
  es: {
    'alternar': 'toggle',
    'añadir': 'add', 'agregar': 'add',
    'quitar': 'remove', 'eliminar': 'remove',
    'mostrar': 'show', 'ocultar': 'hide', 'esconder': 'hide',
    'establecer': 'set', 'fijar': 'set',
    'incrementar': 'increment', 'decrementar': 'decrement',
  },
  pt: {
    'alternar': 'toggle',
    'adicionar': 'add', 'remover': 'remove',
    'mostrar': 'show', 'esconder': 'hide', 'ocultar': 'hide',
    'definir': 'set',
    'incrementar': 'increment', 'decrementar': 'decrement',
  },
  fr: {
    'basculer': 'toggle',
    'ajouter': 'add', 'supprimer': 'remove', 'retirer': 'remove',
    'afficher': 'show', 'montrer': 'show',
    'cacher': 'hide', 'masquer': 'hide',
    'définir': 'set',
    'incrémenter': 'increment', 'décrémenter': 'decrement',
  },
  de: {
    'umschalten': 'toggle',
    'hinzufügen': 'add', 'entfernen': 'remove', 'löschen': 'remove',
    'anzeigen': 'show', 'zeigen': 'show',
    'verbergen': 'hide', 'verstecken': 'hide',
    'setzen': 'set', 'festlegen': 'set',
    'erhöhen': 'increment', 'verringern': 'decrement',
  },
  tr: {
    'değiştir': 'toggle', 'değistir': 'toggle',
    'ekle': 'add', 'kaldır': 'remove', 'kaldir': 'remove', 'sil': 'remove',
    'göster': 'show', 'gizle': 'hide', 'sakla': 'hide',
    'ayarla': 'set', 'belirle': 'set',
    'arttır': 'increment', 'azalt': 'decrement',
  },
  id: {
    'alih': 'toggle', 'beralih': 'toggle',
    'tambah': 'add', 'hapus': 'remove', 'buang': 'remove',
    'tampilkan': 'show', 'sembunyikan': 'hide',
    'atur': 'set', 'tetapkan': 'set',
    'tambahkan': 'increment', 'kurangi': 'decrement',
  },
  sw: {
    'badilisha': 'toggle',
    'ongeza': 'add', 'ondoa': 'remove', 'futa': 'remove',
    'onyesha': 'show', 'ficha': 'hide',
    'weka': 'set', 'sanidi': 'set',
    'ongezea': 'increment', 'punguza': 'decrement',
  },
  qu: {
    'tikray': 'toggle',
    'yapay': 'add', 'qichuy': 'remove', 'pichay': 'remove',
    'rikuchiy': 'show', 'pakay': 'hide',
    'churay': 'set',
    'pisiyachiy': 'decrement',
  },
};

/**
 * Get multilingual command aliases for detected languages.
 * Used by compile mode to configure the compiler with the right aliases.
 */
export function getMultilingualCommandAliases(
  languages: Set<SupportedLanguage>
): Record<string, string> {
  const aliases: Record<string, string> = {};

  for (const lang of languages) {
    const langAliases = MULTILINGUAL_COMMAND_ALIASES[lang];
    if (langAliases) {
      Object.assign(aliases, langAliases);
    }
  }

  return aliases;
}

/**
 * Generate code to add multilingual command aliases to HybridParser.
 */
function generateMultilingualAliases(languages: Set<SupportedLanguage>): string {
  const aliases: Record<string, string> = {};

  for (const lang of languages) {
    const langAliases = MULTILINGUAL_COMMAND_ALIASES[lang];
    if (langAliases) {
      Object.assign(aliases, langAliases);
    }
  }

  if (Object.keys(aliases).length === 0) {
    return `
// No multilingual aliases needed - just pass through
function preprocessMultilingual(code) { return code; }
`;
  }

  // Generate code to add aliases to HybridParser via addCommandAliases
  const aliasEntries = Object.entries(aliases)
    .map(([key, val]) => `  '${key}': '${val}'`)
    .join(',\n');

  // Build regex pattern to match multilingual keywords
  // Escape special regex characters in keys
  const escapedKeys = Object.keys(aliases)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return `
// Multilingual command aliases for HybridParser fallback
const MULTILINGUAL_ALIASES = {
${aliasEntries}
};

// Register multilingual aliases with the parser
addCommandAliases(MULTILINGUAL_ALIASES);

// Preprocessing regex to translate multilingual keywords to English
// The HybridParser tokenizer only accepts ASCII identifiers, so we need
// to translate non-ASCII keywords before parsing.
const MULTILINGUAL_KEYWORD_REGEX = new RegExp('(^|\\\\s)(${escapedKeys})(?=\\\\s|\\\\.|$)', 'g');

/**
 * Preprocess multilingual code to replace non-ASCII keywords with English equivalents.
 * This is needed because HybridParser's tokenizer only accepts ASCII identifiers.
 */
function preprocessMultilingual(code) {
  return code.replace(MULTILINGUAL_KEYWORD_REGEX, (match, prefix, keyword) => {
    const english = MULTILINGUAL_ALIASES[keyword];
    return english ? prefix + english : match;
  });
}
`;
}

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
 *
 * Note: For ES module usage (Vite, Rollup, etc.), we always use the main entry
 * '@hyperfixi/semantic' which has proper ES module exports. The regional bundles
 * (browser/en, browser/western, etc.) are IIFE format for direct <script> tag
 * inclusion only.
 *
 * Bundle size optimization for ES modules is achieved through tree-shaking by
 * the bundler, not through pre-built regional bundles.
 */
export function getSemanticBundleImport(_bundleType: SemanticBundleType): string {
  // All ES module imports use the main entry which has named exports
  // The regional bundles are IIFE format only (for <script> tags)
  // Note: bundleType is kept for API compatibility but not used for ES modules
  return '@hyperfixi/semantic';
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

  // Generate multilingual command aliases for HybridParser fallback
  const aliasesCode = generateMultilingualAliases(config.languages);

  code += `
const semanticAnalyzer = createSemanticAnalyzer();
const SUPPORTED_SEMANTIC_LANGUAGES = ['${languages}', 'en'];
const SEMANTIC_CONFIDENCE_THRESHOLD = 0.7;

${aliasesCode}

/**
 * Parse hyperscript using semantic parser with auto-language detection.
 * Tries each supported language until one returns a high-confidence result.
 * Falls back to HybridParser if none match.
 *
 * @param code - The hyperscript code to parse
 * @param lang - Optional language hint. If provided, tries this language first.
 */
function parseWithSemantic(code, lang = null) {
  // Determine languages to try: specified lang first, then others
  let languagesToTry = [...SUPPORTED_SEMANTIC_LANGUAGES];
  if (lang && !languagesToTry.includes(lang)) {
    languagesToTry.unshift(lang);
  } else if (lang) {
    // Move specified lang to front
    languagesToTry = [lang, ...languagesToTry.filter(l => l !== lang)];
  }

  // Try each language until one succeeds
  for (const tryLang of languagesToTry) {
    if (!isLanguageSupported(tryLang)) continue;
    try {
      const result = semanticAnalyzer.analyze(code, tryLang);
      if (result && result.confidence >= SEMANTIC_CONFIDENCE_THRESHOLD) {
        // buildAST returns {ast, warnings} - extract the ast
        const buildResult = buildAST(result.node);
        const ast = buildResult.ast;

        // Semantic parser doesn't fully handle event handlers - fallback to HybridParser
        // Event handlers like "on click toggle .active" produce incomplete AST
        if (ast && ast.type === 'command' && ast.name === 'on') {
          break; // Fallback to HybridParser
        }

        return ast;
      }
    } catch (e) {
      // Continue trying other languages
    }
  }

  // Fallback to HybridParser for event handlers and unrecognized patterns
  // Preprocess to translate non-ASCII keywords to English (tokenizer only accepts ASCII)
  const preprocessedCode = preprocessMultilingual(code);
  return new HybridParser(preprocessedCode).parse();
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
