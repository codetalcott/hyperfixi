/**
 * @lokascript/hyperscript-adapter
 *
 * Multilingual adapter plugin for the original _hyperscript.
 * Enables writing hyperscript in any of 24 supported languages.
 *
 * @example
 * import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';
 * _hyperscript.use(hyperscriptI18n());
 *
 * @example
 * // With options
 * _hyperscript.use(hyperscriptI18n({
 *   defaultLanguage: 'ja',
 *   debug: true,
 * }));
 *
 * @example
 * // Standalone preprocessing (for _hyperscript.evaluate() calls)
 * import { preprocess } from '@lokascript/hyperscript-adapter';
 * const english = preprocess('トグル .active', 'ja');
 * _hyperscript(english);
 */

export {
  hyperscriptI18n,
  preprocess,
  resetTranslationWarnings,
  type PluginOptions,
} from './plugin';
export { preprocessToEnglish, type PreprocessorConfig } from './preprocessor';
export { resolveLanguage } from './language-resolver';
