/**
 * Multilingual Module
 *
 * Provides unified multilingual support by bridging the semantic
 * parsing package with the grammar transformation package.
 *
 * Key exports:
 * - MultilingualHyperscript: Unified API for all multilingual features
 * - SemanticGrammarBridge: Lower-level bridge class
 * - translate: Convenience function for simple translations
 */

import type { SemanticNode, ASTNode } from '@hyperfixi/semantic';
import {
  SemanticGrammarBridge,
  getDefaultBridge,
  translate,
  type BridgeConfig,
  type BridgeResult,
  type ParseToASTResult,
} from './bridge';

// Re-export bridge components
export {
  SemanticGrammarBridge,
  getDefaultBridge,
  translate,
  type BridgeConfig,
  type BridgeResult,
  type ParseToASTResult,
};

// Lazy-loaded semantic module
let _semanticModule: typeof import('@hyperfixi/semantic') | null = null;

async function getSemanticModule() {
  if (!_semanticModule) {
    _semanticModule = await import('@hyperfixi/semantic');
  }
  return _semanticModule;
}

/**
 * Unified Multilingual Hyperscript API
 *
 * Provides a single entry point for all multilingual features:
 * - Parse hyperscript from any supported language
 * - Translate between languages
 * - Render semantic nodes to any language
 *
 * @example
 * ```typescript
 * const ml = new MultilingualHyperscript();
 * await ml.initialize();
 *
 * // Parse Japanese input
 * const node = await ml.parse('#button の .active を 切り替え', 'ja');
 *
 * // Translate to English
 * const english = await ml.translate('toggle .active on #button', 'en', 'ja');
 *
 * // Render node to different languages
 * const arabic = await ml.render(node, 'ar');
 * ```
 */
export class MultilingualHyperscript {
  private bridge: SemanticGrammarBridge;
  private initialized = false;

  constructor(config: BridgeConfig = {}) {
    this.bridge = new SemanticGrammarBridge(config);
  }

  /**
   * Initialize the multilingual system.
   * Must be called before using parse, translate, or render.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.bridge.initialize();
    this.initialized = true;
  }

  /**
   * Check if the system is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure initialization before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Parse input text to a semantic node.
   *
   * @param input - The hyperscript text to parse
   * @param lang - The language of the input (default: 'en')
   * @returns The semantic node, or null if parsing failed
   *
   * @example
   * ```typescript
   * const node = await ml.parse('toggle .active on #button', 'en');
   * // node.action === 'toggle'
   * // node.roles has patient (.active) and destination (#button)
   * ```
   */
  async parse(input: string, lang: string = 'en'): Promise<SemanticNode | null> {
    await this.ensureInitialized();
    return this.bridge.parse(input, lang);
  }

  /**
   * Parse input directly to an AST node.
   *
   * This uses the new direct path that bypasses English text generation:
   *   Input (any language) → Semantic Parser → AST Builder → AST
   *
   * @param input - The hyperscript text to parse
   * @param lang - The language of the input (default: 'en')
   * @returns The AST node, or null if parsing failed
   *
   * @example
   * ```typescript
   * // Parse Japanese directly to AST
   * const ast = await ml.parseToAST('#button の .active を 切り替え', 'ja');
   * // ast.type === 'command'
   * // ast.name === 'toggle'
   * ```
   */
  async parseToAST(input: string, lang: string = 'en'): Promise<ASTNode | null> {
    await this.ensureInitialized();
    return this.bridge.parseToAST(input, lang);
  }

  /**
   * Parse input to AST with detailed result information.
   *
   * @param input - The hyperscript text to parse
   * @param lang - The language of the input (default: 'en')
   * @returns Detailed result including AST, confidence, and whether direct path was used
   *
   * @example
   * ```typescript
   * const result = await ml.parseToASTWithDetails('トグル .active', 'ja');
   * if (result.usedDirectPath) {
   *   // Direct AST path succeeded
   *   console.log('AST:', result.ast);
   * } else if (result.fallbackText) {
   *   // Use fallback text with core parser
   *   const ast = coreParser.parse(result.fallbackText);
   * }
   * ```
   */
  async parseToASTWithDetails(input: string, lang: string = 'en'): Promise<ParseToASTResult> {
    await this.ensureInitialized();
    return this.bridge.parseToASTWithDetails(input, lang);
  }

  /**
   * Translate hyperscript between languages.
   *
   * @param input - The hyperscript text to translate
   * @param from - Source language code
   * @param to - Target language code
   * @returns The translated text
   *
   * @example
   * ```typescript
   * // English to Japanese
   * const ja = await ml.translate('toggle .active on #button', 'en', 'ja');
   * // → '#button の .active を 切り替え'
   *
   * // Japanese to Arabic
   * const ar = await ml.translate('#button の .active を 切り替え', 'ja', 'ar');
   * // → 'بدّل .active على #button'
   * ```
   */
  async translate(input: string, from: string, to: string): Promise<string> {
    await this.ensureInitialized();
    const result = await this.bridge.transform(input, from, to);
    return result.output;
  }

  /**
   * Translate with detailed result information.
   *
   * @param input - The hyperscript text to translate
   * @param from - Source language code
   * @param to - Target language code
   * @returns Full translation result with metadata
   */
  async translateWithDetails(input: string, from: string, to: string): Promise<BridgeResult> {
    await this.ensureInitialized();
    return this.bridge.transform(input, from, to);
  }

  /**
   * Render a semantic node to a specific language.
   *
   * @param node - The semantic node to render
   * @param lang - Target language code
   * @returns The rendered hyperscript text
   *
   * @example
   * ```typescript
   * const node = await ml.parse('toggle .active', 'en');
   * const japanese = await ml.render(node, 'ja');
   * // → '.active を 切り替え'
   * ```
   */
  async render(node: SemanticNode, lang: string): Promise<string> {
    await this.ensureInitialized();
    return this.bridge.render(node, lang);
  }

  /**
   * Get all translations of input to every supported language.
   *
   * @param input - The hyperscript text to translate
   * @param from - Source language code
   * @returns Object mapping language codes to translation results
   */
  async getAllTranslations(input: string, from: string): Promise<Record<string, BridgeResult>> {
    await this.ensureInitialized();
    return this.bridge.getAllTranslations(input, from);
  }

  /**
   * Get all supported language codes.
   *
   * @returns Array of ISO 639-1 language codes
   */
  getSupportedLanguages(): string[] {
    return [
      'en', // English
      'ja', // Japanese
      'ar', // Arabic
      'es', // Spanish
      'ko', // Korean
      'zh', // Chinese
      'tr', // Turkish
      'pt', // Portuguese
      'fr', // French
      'de', // German
      'id', // Indonesian
      'qu', // Quechua
      'sw', // Swahili
    ];
  }

  /**
   * Check if a language is supported.
   *
   * @param lang - Language code to check
   * @returns True if the language is supported
   */
  isLanguageSupported(lang: string): boolean {
    return this.getSupportedLanguages().includes(lang);
  }

  /**
   * Get language information.
   *
   * @param lang - Language code
   * @returns Language details or undefined if not supported
   */
  getLanguageInfo(lang: string): LanguageInfo | undefined {
    return LANGUAGE_INFO[lang];
  }

  /**
   * Get all language information.
   */
  getAllLanguageInfo(): Record<string, LanguageInfo> {
    return { ...LANGUAGE_INFO };
  }
}

/**
 * Language information for display purposes.
 */
export interface LanguageInfo {
  /** ISO 639-1 code */
  code: string;
  /** English name */
  name: string;
  /** Native name */
  nativeName: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Word order (SVO, SOV, VSO) */
  wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS';
}

const LANGUAGE_INFO: Record<string, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', wordOrder: 'SVO' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', wordOrder: 'SOV' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', wordOrder: 'VSO' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', wordOrder: 'SVO' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', wordOrder: 'SOV' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', wordOrder: 'SVO' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', wordOrder: 'SOV' },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    wordOrder: 'SVO',
  },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', wordOrder: 'SVO' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', wordOrder: 'SVO' },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    wordOrder: 'SVO',
  },
  qu: { code: 'qu', name: 'Quechua', nativeName: 'Runasimi', direction: 'ltr', wordOrder: 'SOV' },
  sw: { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr', wordOrder: 'SVO' },
};

// =============================================================================
// Default Instance
// =============================================================================

let _defaultInstance: MultilingualHyperscript | null = null;

/**
 * Get the default MultilingualHyperscript instance.
 * Creates and initializes one if it doesn't exist.
 */
export async function getMultilingual(): Promise<MultilingualHyperscript> {
  if (!_defaultInstance) {
    _defaultInstance = new MultilingualHyperscript();
    await _defaultInstance.initialize();
  }
  return _defaultInstance;
}

/**
 * Pre-initialized default instance for convenience.
 * Note: Must call initialize() before use, or use getMultilingual() instead.
 */
export const multilingual = new MultilingualHyperscript();
