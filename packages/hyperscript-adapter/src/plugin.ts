/**
 * _hyperscript Plugin
 *
 * Registers with _hyperscript.use() to rewrite non-English hyperscript
 * attributes into English before _hyperscript.org parses them.
 */

import { resolveLanguage } from './language-resolver';
import { preprocessToEnglish, type PreprocessorConfig } from './preprocessor';
import { installAttributeTranslator, type HyperscriptHost } from './attribute-translator';

export interface PluginOptions extends Partial<PreprocessorConfig> {
  /** Default language for all elements (overridable per-element). */
  defaultLanguage?: string;
  /** Custom attribute name for per-element language. Default: "data-lang" */
  languageAttribute?: string;
  /** Enable debug logging to console. Default: false */
  debug?: boolean;
}

/**
 * Create a _hyperscript plugin that enables multilingual hyperscript.
 *
 * @example
 * // Basic usage
 * _hyperscript.use(hyperscriptI18n());
 *
 * @example
 * // With options
 * _hyperscript.use(hyperscriptI18n({
 *   defaultLanguage: 'ja',
 *   confidenceThreshold: 0.6,
 *   debug: true,
 * }));
 */
export function hyperscriptI18n(options: PluginOptions = {}) {
  return function plugin(hs: unknown): void {
    installAttributeTranslator(hs as HyperscriptHost, (src, elt) => {
      // Resolve language
      const lang = resolveLanguageWithOptions(elt, options);

      // If English or no language detected, pass through
      if (!lang || lang === 'en') return src;

      // Preprocess to English
      const english = preprocessToEnglish(src, lang, options);

      if (english !== src) {
        if (options.debug) {
          console.log(`[hyperscript-i18n] ${lang}: "${src}" → "${english}"`);
        }
      } else {
        // Translation produced no change — likely a failure
        console.warn(
          `[hyperscript-i18n] Translation unchanged for lang="${lang}": "${src.length > 60 ? src.slice(0, 60) + '…' : src}". ` +
            'The input may not match any known pattern, or the language may not be registered. ' +
            'Original text will be passed to _hyperscript as-is.'
        );
      }

      return english;
    });
  };
}

/**
 * Resolve language with plugin options factored in.
 */
function resolveLanguageWithOptions(elt: Element, options: PluginOptions): string | null {
  // Check custom attribute name
  if (options.languageAttribute) {
    const custom = elt.getAttribute(options.languageAttribute);
    if (custom) return custom.split('-')[0].toLowerCase();
  }

  // Standard resolution
  const resolved = resolveLanguage(elt);
  if (resolved) return resolved;

  // Fall back to default language
  return options.defaultLanguage ?? null;
}

/**
 * Standalone preprocessing function for programmatic use.
 * Call this when using _hyperscript.evaluate() or _hyperscript("code") directly.
 *
 * @example
 * const english = preprocess("トグル .active", "ja");
 * _hyperscript(english);
 */
export function preprocess(
  src: string,
  lang: string,
  config: Partial<PreprocessorConfig> = {}
): string {
  if (lang === 'en') return src;
  return preprocessToEnglish(src, lang, config);
}
