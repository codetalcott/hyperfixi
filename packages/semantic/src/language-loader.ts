/**
 * Language Loader
 *
 * Provides lazy loading capabilities for language modules.
 * Languages can be loaded:
 * 1. Via dynamic import from package subpath
 * 2. From a URL (for CDN usage)
 * 3. From a pre-loaded module object
 *
 * @example
 * ```typescript
 * import { loadLanguage, parse } from '@hyperfixi/semantic/browser/lazy';
 *
 * // Load Japanese on demand
 * await loadLanguage('ja');
 *
 * // Now parsing works for Japanese
 * parse('トグル .active', 'ja');
 * ```
 */

import {
  registerLanguage,
  registerPatterns,
  isLanguageRegistered,
  type LanguageProfile,
} from './registry';
import type { LanguageTokenizer, LanguagePattern } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for loading a language.
 */
export interface LoadLanguageOptions {
  /**
   * URL to fetch the language module from (for CDN usage).
   * The module should export: tokenizer, profile, patterns (or buildPatterns)
   */
  url?: string;

  /**
   * Pre-loaded module object.
   * Use this if you've already imported the module.
   */
  module?: LanguageModule;

  /**
   * Skip loading if the language is already registered.
   * Defaults to true.
   */
  skipIfRegistered?: boolean;
}

/**
 * A language module that can be registered with the semantic parser.
 */
export interface LanguageModule {
  /** The language tokenizer */
  tokenizer: LanguageTokenizer;

  /** The language profile for pattern generation */
  profile: LanguageProfile;

  /** Pre-built patterns (optional) */
  patterns?: LanguagePattern[];

  /** Function to build patterns lazily (optional) */
  buildPatterns?: () => LanguagePattern[];
}

/**
 * Result of a language loading operation.
 */
export interface LoadLanguageResult {
  /** The language code that was loaded */
  code: string;

  /** Whether the language was newly loaded (false if already registered) */
  loaded: boolean;

  /** Error message if loading failed */
  error?: string;
}

// =============================================================================
// Language Module Import Map
// =============================================================================

/**
 * Map of language codes to their module import functions.
 * This enables dynamic imports without bundling all languages.
 *
 * Most languages use the registry's pattern generator (set via setPatternGenerator).
 * English has special hand-crafted patterns that are explicitly registered.
 */
const LANGUAGE_IMPORTERS: Record<string, () => Promise<LanguageModule>> = {
  en: async () => {
    // English has special hand-crafted patterns
    const { englishTokenizer } = await import('./tokenizers/english');
    const { englishProfile } = await import('./generators/profiles/english');
    const { buildEnglishPatterns } = await import('./patterns/en');
    return {
      tokenizer: englishTokenizer,
      profile: englishProfile,
      buildPatterns: buildEnglishPatterns,
    };
  },
  es: async () => {
    const { spanishTokenizer } = await import('./tokenizers/spanish');
    const { spanishProfile } = await import('./generators/profiles/spanish');
    return { tokenizer: spanishTokenizer, profile: spanishProfile };
  },
  ja: async () => {
    const { japaneseTokenizer } = await import('./tokenizers/japanese');
    const { japaneseProfile } = await import('./generators/profiles/japanese');
    return { tokenizer: japaneseTokenizer, profile: japaneseProfile };
  },
  ar: async () => {
    const { arabicTokenizer } = await import('./tokenizers/arabic');
    const { arabicProfile } = await import('./generators/profiles/arabic');
    return { tokenizer: arabicTokenizer, profile: arabicProfile };
  },
  ko: async () => {
    const { koreanTokenizer } = await import('./tokenizers/korean');
    const { koreanProfile } = await import('./generators/profiles/korean');
    return { tokenizer: koreanTokenizer, profile: koreanProfile };
  },
  zh: async () => {
    const { chineseTokenizer } = await import('./tokenizers/chinese');
    const { chineseProfile } = await import('./generators/profiles/chinese');
    return { tokenizer: chineseTokenizer, profile: chineseProfile };
  },
  tr: async () => {
    const { turkishTokenizer } = await import('./tokenizers/turkish');
    const { turkishProfile } = await import('./generators/profiles/turkish');
    return { tokenizer: turkishTokenizer, profile: turkishProfile };
  },
  pt: async () => {
    const { portugueseTokenizer } = await import('./tokenizers/portuguese');
    const { portugueseProfile } = await import('./generators/profiles/portuguese');
    return { tokenizer: portugueseTokenizer, profile: portugueseProfile };
  },
  fr: async () => {
    const { frenchTokenizer } = await import('./tokenizers/french');
    const { frenchProfile } = await import('./generators/profiles/french');
    return { tokenizer: frenchTokenizer, profile: frenchProfile };
  },
  de: async () => {
    const { germanTokenizer } = await import('./tokenizers/german');
    const { germanProfile } = await import('./generators/profiles/german');
    return { tokenizer: germanTokenizer, profile: germanProfile };
  },
  id: async () => {
    const { indonesianTokenizer } = await import('./tokenizers/indonesian');
    const { indonesianProfile } = await import('./generators/profiles/indonesian');
    return { tokenizer: indonesianTokenizer, profile: indonesianProfile };
  },
  qu: async () => {
    const { quechuaTokenizer } = await import('./tokenizers/quechua');
    const { quechuaProfile } = await import('./generators/profiles/quechua');
    return { tokenizer: quechuaTokenizer, profile: quechuaProfile };
  },
  sw: async () => {
    const { swahiliTokenizer } = await import('./tokenizers/swahili');
    const { swahiliProfile } = await import('./generators/profiles/swahili');
    return { tokenizer: swahiliTokenizer, profile: swahiliProfile };
  },
  bn: async () => {
    const { bengaliTokenizer } = await import('./tokenizers/bengali');
    const { bengaliProfile } = await import('./generators/profiles/bengali');
    return { tokenizer: bengaliTokenizer, profile: bengaliProfile };
  },
  hi: async () => {
    const { hindiTokenizer } = await import('./tokenizers/hindi');
    const { hindiProfile } = await import('./generators/profiles/hindi');
    return { tokenizer: hindiTokenizer, profile: hindiProfile };
  },
  it: async () => {
    const { italianTokenizer } = await import('./tokenizers/italian');
    const { italianProfile } = await import('./generators/profiles/italian');
    return { tokenizer: italianTokenizer, profile: italianProfile };
  },
  ms: async () => {
    const { malayTokenizer } = await import('./tokenizers/ms');
    const { malayProfile } = await import('./generators/profiles/ms');
    return { tokenizer: malayTokenizer, profile: malayProfile };
  },
  pl: async () => {
    const { polishTokenizer } = await import('./tokenizers/polish');
    const { polishProfile } = await import('./generators/profiles/polish');
    return { tokenizer: polishTokenizer, profile: polishProfile };
  },
  ru: async () => {
    const { russianTokenizer } = await import('./tokenizers/russian');
    const { russianProfile } = await import('./generators/profiles/russian');
    return { tokenizer: russianTokenizer, profile: russianProfile };
  },
  th: async () => {
    const { thaiTokenizer } = await import('./tokenizers/thai');
    const { thaiProfile } = await import('./generators/profiles/thai');
    return { tokenizer: thaiTokenizer, profile: thaiProfile };
  },
  tl: async () => {
    const { tagalogTokenizer } = await import('./tokenizers/tl');
    const { tagalogProfile } = await import('./generators/profiles/tl');
    return { tokenizer: tagalogTokenizer, profile: tagalogProfile };
  },
  uk: async () => {
    const { ukrainianTokenizer } = await import('./tokenizers/ukrainian');
    const { ukrainianProfile } = await import('./generators/profiles/ukrainian');
    return { tokenizer: ukrainianTokenizer, profile: ukrainianProfile };
  },
  vi: async () => {
    const { vietnameseTokenizer } = await import('./tokenizers/vietnamese');
    const { vietnameseProfile } = await import('./generators/profiles/vietnamese');
    return { tokenizer: vietnameseTokenizer, profile: vietnameseProfile };
  },
};

/**
 * List of all supported language codes.
 */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_IMPORTERS);

// =============================================================================
// Core Loading Functions
// =============================================================================

/**
 * Register a language module with the semantic parser.
 */
function registerModule(code: string, module: LanguageModule): void {
  // Register tokenizer and profile
  registerLanguage(code, module.tokenizer, module.profile);

  // Register patterns
  if (module.patterns) {
    registerPatterns(code, module.patterns);
  } else if (module.buildPatterns) {
    registerPatterns(code, module.buildPatterns());
  }
}

/**
 * Load a language from a URL.
 * The URL should return a JavaScript module that exports a LanguageModule.
 */
async function loadFromUrl(code: string, url: string): Promise<LanguageModule> {
  try {
    // Fetch the module
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    // Get the module text and create a blob URL
    const text = await response.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      // Dynamic import from blob URL
      const module = await import(/* @vite-ignore */ blobUrl);

      // Validate module structure
      if (!module.tokenizer || !module.profile) {
        throw new Error(`Invalid language module: missing tokenizer or profile`);
      }

      return module as LanguageModule;
    } finally {
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    throw new Error(
      `Failed to load language '${code}' from ${url}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load a single language.
 *
 * @param code - The language code (e.g., 'en', 'ja', 'es')
 * @param options - Loading options
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * // Load from package
 * await loadLanguage('ja');
 *
 * // Load from CDN
 * await loadLanguage('ko', {
 *   url: 'https://cdn.example.com/hyperfixi-semantic-ko.js'
 * });
 *
 * // Load from pre-loaded module
 * await loadLanguage('en', { module: myEnglishModule });
 * ```
 */
export async function loadLanguage(
  code: string,
  options: LoadLanguageOptions = {}
): Promise<LoadLanguageResult> {
  const { url, module, skipIfRegistered = true } = options;

  // Check if already registered
  if (skipIfRegistered && isLanguageRegistered(code)) {
    return { code, loaded: false };
  }

  try {
    let languageModule: LanguageModule;

    if (module) {
      // Use provided module directly
      languageModule = module;
    } else if (url) {
      // Load from URL
      languageModule = await loadFromUrl(code, url);
    } else {
      // Dynamic import from package
      const importer = LANGUAGE_IMPORTERS[code];
      if (!importer) {
        throw new Error(`Unknown language: ${code}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
      }
      languageModule = await importer();
    }

    // Register the module
    registerModule(code, languageModule);

    return { code, loaded: true };
  } catch (error) {
    return {
      code,
      loaded: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load multiple languages in parallel.
 *
 * @param codes - Array of language codes to load
 * @param options - Loading options (applied to all languages)
 * @returns Array of results for each language
 *
 * @example
 * ```typescript
 * // Load multiple languages
 * const results = await loadLanguages(['en', 'es', 'ja']);
 *
 * // Check results
 * for (const result of results) {
 *   if (result.error) {
 *     console.error(`Failed to load ${result.code}: ${result.error}`);
 *   }
 * }
 * ```
 */
export async function loadLanguages(
  codes: string[],
  options: Omit<LoadLanguageOptions, 'module'> = {}
): Promise<LoadLanguageResult[]> {
  return Promise.all(codes.map(code => loadLanguage(code, options)));
}

/**
 * Check if a language can be loaded (is supported).
 */
export function canLoadLanguage(code: string): boolean {
  return code in LANGUAGE_IMPORTERS;
}

/**
 * Get list of languages that are currently loaded.
 */
export function getLoadedLanguages(): string[] {
  return SUPPORTED_LANGUAGES.filter(isLanguageRegistered);
}

/**
 * Get list of languages that are not yet loaded.
 */
export function getUnloadedLanguages(): string[] {
  return SUPPORTED_LANGUAGES.filter(code => !isLanguageRegistered(code));
}
