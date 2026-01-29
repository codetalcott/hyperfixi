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
    トグル: 'toggle',
    切り替え: 'toggle',
    追加: 'add',
    削除: 'remove',
    表示: 'show',
    隠す: 'hide',
    非表示: 'hide',
    設定: 'set',
    セット: 'set',
    増加: 'increment',
    減少: 'decrement',
    ログ: 'log',
    出力: 'log',
  },
  ko: {
    토글: 'toggle',
    전환: 'toggle',
    추가: 'add',
    제거: 'remove',
    삭제: 'remove',
    표시: 'show',
    숨기다: 'hide',
    설정: 'set',
    증가: 'increment',
    감소: 'decrement',
    로그: 'log',
  },
  zh: {
    切换: 'toggle',
    添加: 'add',
    移除: 'remove',
    删除: 'remove',
    显示: 'show',
    隐藏: 'hide',
    设置: 'set',
    设定: 'set',
    增加: 'increment',
    减少: 'decrement',
    日志: 'log',
    记录: 'log',
  },
  ar: {
    بدّل: 'toggle',
    بدل: 'toggle',
    أضف: 'add',
    اضف: 'add',
    أزل: 'remove',
    ازل: 'remove',
    احذف: 'remove',
    أظهر: 'show',
    اظهر: 'show',
    أخفِ: 'hide',
    اخف: 'hide',
    ضع: 'set',
    اضع: 'set',
    زِد: 'increment',
    أنقص: 'decrement',
  },
  es: {
    alternar: 'toggle',
    añadir: 'add',
    agregar: 'add',
    quitar: 'remove',
    eliminar: 'remove',
    mostrar: 'show',
    ocultar: 'hide',
    esconder: 'hide',
    establecer: 'set',
    fijar: 'set',
    incrementar: 'increment',
    decrementar: 'decrement',
  },
  pt: {
    alternar: 'toggle',
    adicionar: 'add',
    remover: 'remove',
    mostrar: 'show',
    esconder: 'hide',
    ocultar: 'hide',
    definir: 'set',
    incrementar: 'increment',
    decrementar: 'decrement',
  },
  fr: {
    basculer: 'toggle',
    ajouter: 'add',
    supprimer: 'remove',
    retirer: 'remove',
    afficher: 'show',
    montrer: 'show',
    cacher: 'hide',
    masquer: 'hide',
    définir: 'set',
    incrémenter: 'increment',
    décrémenter: 'decrement',
  },
  de: {
    umschalten: 'toggle',
    hinzufügen: 'add',
    entfernen: 'remove',
    löschen: 'remove',
    anzeigen: 'show',
    zeigen: 'show',
    verbergen: 'hide',
    verstecken: 'hide',
    setzen: 'set',
    festlegen: 'set',
    erhöhen: 'increment',
    verringern: 'decrement',
  },
  tr: {
    değiştir: 'toggle',
    değistir: 'toggle',
    ekle: 'add',
    kaldır: 'remove',
    kaldir: 'remove',
    sil: 'remove',
    göster: 'show',
    gizle: 'hide',
    sakla: 'hide',
    ayarla: 'set',
    belirle: 'set',
    arttır: 'increment',
    azalt: 'decrement',
  },
  id: {
    alih: 'toggle',
    beralih: 'toggle',
    tambah: 'add',
    hapus: 'remove',
    buang: 'remove',
    tampilkan: 'show',
    sembunyikan: 'hide',
    atur: 'set',
    tetapkan: 'set',
    tambahkan: 'increment',
    kurangi: 'decrement',
  },
  sw: {
    badilisha: 'toggle',
    ongeza: 'add',
    ondoa: 'remove',
    futa: 'remove',
    onyesha: 'show',
    ficha: 'hide',
    weka: 'set',
    sanidi: 'set',
    ongezea: 'increment',
    punguza: 'decrement',
  },
  qu: {
    tikray: 'toggle',
    yapay: 'add',
    qichuy: 'remove',
    pichay: 'remove',
    rikuchiy: 'show',
    pakay: 'hide',
    churay: 'set',
    pisiyachiy: 'decrement',
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
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
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
 * Single-language bundles are available for all 25 languages with semantic tokenizers.
 */
export type SemanticBundleType =
  // Single-language bundles (all 25 languages)
  | 'ar'
  | 'bn'
  | 'de'
  | 'en'
  | 'es'
  | 'es-MX'
  | 'fr'
  | 'he'
  | 'hi'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'pl'
  | 'pt'
  | 'qu'
  | 'ru'
  | 'sw'
  | 'th'
  | 'tl'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh'
  // Regional bundles
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
 * All languages that have single-language ESM modules available.
 * These can be selected as individual bundle types for optimal tree-shaking.
 */
const SINGLE_LANGUAGE_BUNDLES: readonly string[] = [
  'ar',
  'bn',
  'de',
  'en',
  'es',
  'es-MX',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

/**
 * Select the smallest bundle that covers all specified languages.
 */
export function selectOptimalBundle(languages: Set<SupportedLanguage>): SemanticBundleType {
  if (languages.size === 0) {
    return 'en';
  }

  const langArray = [...languages];

  // Check single-language bundles (all 13 languages have individual bundles)
  if (langArray.length === 1) {
    const lang = langArray[0];
    if (SINGLE_LANGUAGE_BUNDLES.includes(lang)) {
      return lang as SemanticBundleType;
    }
  }

  // Check if en + es covers it (common bilingual case)
  if (langArray.length === 2 && langArray.includes('en') && langArray.includes('es')) {
    return 'es-en';
  }

  // Check if all languages fit in western bundle
  if (langArray.every(l => REGIONS.western.includes(l))) {
    return 'western';
  }

  // Check if all languages fit in east-asian bundle
  if (langArray.every(l => REGIONS['east-asian'].includes(l))) {
    return 'east-asian';
  }

  // Check if all languages fit in priority bundle
  if (langArray.every(l => REGIONS.priority.includes(l))) {
    return 'priority';
  }

  // Need full bundle
  return 'all';
}

/**
 * Estimated bundle sizes for each semantic bundle type.
 * Used for debug logging to help users understand size impact.
 * Sizes measured from minified bundles (January 2025).
 */
export const SEMANTIC_BUNDLE_SIZES: Record<SemanticBundleType, { raw: string; gzip: string }> = {
  // Single-language bundles (all 25 languages)
  ar: { raw: '66 KB', gzip: '~17 KB' },
  bn: { raw: '56 KB', gzip: '~14 KB' },
  de: { raw: '57 KB', gzip: '~14 KB' },
  en: { raw: '82 KB', gzip: '~20 KB' },
  es: { raw: '64 KB', gzip: '~16 KB' },
  'es-MX': { raw: '64 KB', gzip: '~16 KB' },
  fr: { raw: '57 KB', gzip: '~14 KB' },
  he: { raw: '56 KB', gzip: '~14 KB' },
  hi: { raw: '56 KB', gzip: '~14 KB' },
  id: { raw: '57 KB', gzip: '~14 KB' },
  it: { raw: '57 KB', gzip: '~14 KB' },
  ja: { raw: '67 KB', gzip: '~17 KB' },
  ko: { raw: '69 KB', gzip: '~18 KB' },
  ms: { raw: '56 KB', gzip: '~14 KB' },
  pl: { raw: '56 KB', gzip: '~14 KB' },
  pt: { raw: '56 KB', gzip: '~14 KB' },
  qu: { raw: '56 KB', gzip: '~14 KB' },
  ru: { raw: '56 KB', gzip: '~14 KB' },
  sw: { raw: '56 KB', gzip: '~14 KB' },
  th: { raw: '56 KB', gzip: '~14 KB' },
  tl: { raw: '56 KB', gzip: '~14 KB' },
  tr: { raw: '73 KB', gzip: '~18 KB' },
  uk: { raw: '56 KB', gzip: '~14 KB' },
  vi: { raw: '56 KB', gzip: '~14 KB' },
  zh: { raw: '58 KB', gzip: '~15 KB' },
  // Regional bundles
  'es-en': { raw: '99 KB', gzip: '~25 KB' },
  western: { raw: '127 KB', gzip: '~30 KB' },
  'east-asian': { raw: '99 KB', gzip: '~24 KB' },
  priority: { raw: '231 KB', gzip: '~48 KB' },
  all: { raw: '324 KB', gzip: '~61 KB' },
};

/**
 * Get the estimated size for a semantic bundle type.
 */
export function getSemanticBundleSize(bundleType: SemanticBundleType): {
  raw: string;
  gzip: string;
} {
  return SEMANTIC_BUNDLE_SIZES[bundleType] ?? SEMANTIC_BUNDLE_SIZES.all;
}

/**
 * Languages that have per-language ESM subpath exports in @lokascript/semantic.
 * These can be imported individually: `import '@lokascript/semantic/languages/en'`
 *
 * All 25 languages with semantic tokenizers now have individual ESM modules.
 */
const LANGUAGES_WITH_ESM_EXPORTS = new Set([
  'ar',
  'bn',
  'de',
  'en',
  'es',
  'es-MX',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
]);

/**
 * Get the import path for a semantic bundle type.
 *
 * For ES module usage (Vite, Rollup, etc.), we use '@lokascript/semantic/core'
 * which provides the core analyzer infrastructure without any language data.
 * Languages are imported separately as side-effect imports for tree-shaking.
 *
 * If any required language lacks an ESM subpath export, we fall back to the
 * full '@lokascript/semantic' entry which includes all languages.
 */
export function getSemanticBundleImport(_bundleType: SemanticBundleType): string {
  // Core entry provides createSemanticAnalyzer, buildAST, isLanguageSupported
  // without bundling any language data (~20 KB vs ~102 KB gzip)
  return '@lokascript/semantic/core';
}

/**
 * Resolve the set of language codes that need ESM imports for a given bundle type
 * and config languages.
 */
export function getLanguagesForBundleType(
  bundleType: SemanticBundleType,
  configLanguages: Set<SupportedLanguage>
): Set<string> {
  const languages = new Set<string>(configLanguages);

  // Expand regional bundle types to their constituent languages
  switch (bundleType) {
    case 'western':
      REGIONS.western.forEach(l => languages.add(l));
      break;
    case 'east-asian':
      REGIONS['east-asian'].forEach(l => languages.add(l));
      break;
    case 'priority':
      REGIONS.priority.forEach(l => languages.add(l));
      break;
    case 'all':
      REGIONS.all.forEach(l => languages.add(l));
      break;
    case 'es-en':
      languages.add('en');
      languages.add('es');
      break;
    default:
      // Single language bundle type (e.g., 'en', 'ja') - add it
      if (typeof bundleType === 'string' && bundleType.length <= 3) {
        languages.add(bundleType);
      }
      break;
  }

  // Always ensure English is included as fallback
  languages.add('en');

  return languages;
}

/**
 * Check if all languages in the set have ESM subpath exports available.
 * @deprecated Use filterToAvailableLanguages() instead. This function used an
 * all-or-nothing approach that caused fallback to the full bundle when any
 * language lacked ESM exports. The new approach imports available languages
 * individually and skips unavailable ones.
 */
export function canUseCorePlusLanguages(languages: Set<string>): boolean {
  for (const lang of languages) {
    if (!LANGUAGES_WITH_ESM_EXPORTS.has(lang)) {
      return false;
    }
  }
  return true;
}

/**
 * Filter a set of languages to only those with ESM subpath exports.
 * Languages without exports (e.g., 'it', 'ru', 'hi') are excluded since
 * they don't have semantic parser modules in @lokascript/semantic.
 *
 * Always ensures 'en' is included as a fallback.
 */
export function filterToAvailableLanguages(languages: Set<string>): Set<string> {
  const available = new Set<string>();
  for (const lang of languages) {
    if (LANGUAGES_WITH_ESM_EXPORTS.has(lang)) {
      available.add(lang);
    }
  }
  // Always ensure English is included
  available.add('en');
  return available;
}

/**
 * Generate the semantic integration layer code.
 * This is injected into the generated bundle when semantic is enabled.
 *
 * Always uses '@lokascript/semantic/core' for the analyzer infrastructure and
 * individual '@lokascript/semantic/languages/<lang>' imports for each
 * required language. Languages without ESM exports are skipped (they don't
 * have semantic parser modules). This avoids importing the full
 * '@lokascript/semantic' index (1 MB source) for multi-language scenarios.
 */
export function generateSemanticIntegrationCode(config: SemanticConfig): string {
  if (!config.enabled || !config.bundleType) {
    return '';
  }

  // Resolve all languages needed for this bundle type
  const resolvedLanguages = getLanguagesForBundleType(config.bundleType, config.languages);

  // Filter to only languages with ESM subpath exports.
  // Languages like 'it', 'ru', 'hi' don't have semantic parser modules
  // and would previously cause fallback to the full @lokascript/semantic
  // index (1 MB source). Now we always use core + per-language imports.
  const availableLanguages = filterToAvailableLanguages(resolvedLanguages);

  const languages = [...config.languages].join("', '");

  let code = `
// =============================================================================
// SEMANTIC PARSER INTEGRATION
// =============================================================================

// Core infrastructure (no language data bundled)
import {
  createSemanticAnalyzer,
  buildAST,
  isLanguageSupported,
} from '@lokascript/semantic/core';

// Register required languages (self-registering side-effect imports)
`;
  // Sort for deterministic output
  const sortedLangs = [...availableLanguages].sort();
  for (const lang of sortedLangs) {
    code += `import '@lokascript/semantic/languages/${lang}';\n`;
  }

  if (config.grammarEnabled) {
    code += `
import { GrammarTransformer, translate } from '@lokascript/i18n';

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
