/**
 * _hyperscript Plugin
 *
 * Registers with _hyperscript.use() to rewrite non-English hyperscript
 * attributes into English before _hyperscript.org parses them.
 */

import { resolveLanguage } from './language-resolver';
import { preprocessToEnglish, type PreprocessorConfig } from './preprocessor';
import { installAttributeTranslator, type HyperscriptHost } from './attribute-translator';
import {
  acceptedByHost,
  warnRejectedOnce,
  resetHostValidationWarnings,
  type HyperscriptParseHost,
} from './host-validate';

export interface PluginOptions extends Partial<PreprocessorConfig> {
  /** Default language for all elements (overridable per-element). */
  defaultLanguage?: string;
  /** Custom attribute name for per-element language. Default: "data-lang" */
  languageAttribute?: string;
  /** Enable debug logging to console. Default: false */
  debug?: boolean;
  /**
   * Validate rendered English on the HOST parser before committing the
   * rewrite; on rejection, fall back to the original text (so parse errors
   * name the author's code, not generated English). Default: true.
   * No-op on host builds that expose no `parse()`.
   */
  validateWithHost?: boolean;
}

/** Languages already warned about an unchanged translation this page load.
 *  Unchanged output is common and often legitimate (canonical-English
 *  hyperscript under a non-en lang scope), so warning per element per
 *  processNode was pure noise — mirror htmx-adapter's warn-once-per-lang
 *  convention and leave per-element detail to `debug: true`. */
const warnedUnchangedLang = new Set<string>();

/** Reset the warn-once state (unchanged + host-rejected). Mainly for tests. */
export function resetTranslationWarnings(): void {
  warnedUnchangedLang.clear();
  resetHostValidationWarnings();
}

function warnUnchangedOnce(lang: string, src: string): void {
  if (warnedUnchangedLang.has(lang)) return;
  warnedUnchangedLang.add(lang);
  console.warn(
    `[hyperscript-i18n] Translation unchanged for lang="${lang}": "${src.length > 60 ? src.slice(0, 60) + '…' : src}". ` +
      'This is fine if the source is already canonical English; otherwise the input may not match ' +
      'any known pattern, or the language may not be registered. Original text is passed to ' +
      '_hyperscript as-is. Further elements in this language stay quiet — enable { debug: true } ' +
      'for per-element detail.'
  );
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
    const host = hs as HyperscriptHost & HyperscriptParseHost;
    installAttributeTranslator(host, (src, elt) => {
      // Resolve language
      const lang = resolveLanguageWithOptions(elt, options);

      // If English or no language detected, pass through
      if (!lang || lang === 'en') return src;

      // Preprocess to English
      const english = preprocessToEnglish(src, lang, options);

      if (english !== src) {
        // Validity gate: the host parser is the consumer of this rewrite —
        // if it rejects the English, committing it would only trade a
        // translation gap for a parse error naming code the author never
        // wrote. Fall back to the original text instead.
        if (options.validateWithHost !== false && !acceptedByHost(host, english)) {
          if (options.debug) {
            console.log(
              `[hyperscript-i18n] ${lang}: host rejected "${english}" — keeping "${src}"`
            );
          } else {
            warnRejectedOnce(lang, src, english);
          }
          return src;
        }
        if (options.debug) {
          console.log(`[hyperscript-i18n] ${lang}: "${src}" → "${english}"`);
        }
      } else if (options.debug) {
        console.log(`[hyperscript-i18n] ${lang}: unchanged "${src}"`);
      } else {
        warnUnchangedOnce(lang, src);
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
