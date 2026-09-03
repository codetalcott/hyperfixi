/**
 * @hyperscript-tools/i18n
 *
 * Build-time translation utilities for hyperscript code samples. Pairs with
 * @hyperscript-tools/multilingual (runtime) to give docs sites both a
 * "served pre-translated" and a "translate on the fly" path.
 */

// BREAKING (2.12): `GrammarTransformer` is no longer re-exported. It was a raw
// class from `@lokascript/i18n`'s grammar half, which this package no longer
// depends on; there is no semantic equivalent to forward, and a shim that was
// not one would be worse than its absence. `translate` / `toLocale` /
// `toEnglish` keep their signatures and are now backed by
// `@lokascript/semantic` — see ./translate.ts for what changes behaviourally.
export { translate, toLocale, toEnglish } from './translate.js';

export {
  translateHtml,
  translateHtmlToManyLangs,
  extractHyperscriptAttributes,
  checkHtmlInput,
} from './html.js';
export type { LangCode, TranslateHtmlOptions, OnInvalid } from './html.js';

export { loadValidator, validateHyperscript, formatParseCheckReport } from './validate.js';
export type { CanonicalValidate, ParseCheckReport } from './validate.js';
