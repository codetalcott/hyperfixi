/**
 * @hyperscript-tools/multilingual
 *
 * Write original _hyperscript in 24 languages — Japanese, Korean, Spanish,
 * Arabic, Chinese, Turkish, and more.
 *
 * This is a convenience re-export of @lokascript/hyperscript-adapter for the
 * @hyperscript-tools ecosystem.
 *
 * @example
 * // Register as a _hyperscript plugin
 * import { hyperscriptI18n } from '@hyperscript-tools/multilingual';
 * _hyperscript.use(hyperscriptI18n());
 *
 * @example
 * // Set a default language (e.g. Japanese)
 * _hyperscript.use(hyperscriptI18n({ defaultLanguage: 'ja' }));
 *
 * @example
 * // Standalone preprocessing
 * import { preprocess } from '@hyperscript-tools/multilingual';
 * const english = preprocess('トグル .active', 'ja');
 * _hyperscript(english); // → 'toggle .active'
 */

export {
  hyperscriptI18n,
  preprocess,
  preprocessToEnglish,
  resolveLanguage,
  type PluginOptions,
  type PreprocessorConfig,
} from '@lokascript/hyperscript-adapter';
