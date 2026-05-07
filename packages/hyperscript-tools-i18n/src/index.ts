/**
 * @hyperscript-tools/i18n
 *
 * Build-time translation utilities for hyperscript code samples. Pairs with
 * @hyperscript-tools/multilingual (runtime) to give docs sites both a
 * "served pre-translated" and a "translate on the fly" path.
 */

export { translate, toLocale, toEnglish, GrammarTransformer } from '@lokascript/i18n';

export { translateHtml, translateHtmlToManyLangs } from './html.js';
export type { LangCode, TranslateHtmlOptions } from './html.js';
