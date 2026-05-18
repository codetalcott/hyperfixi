/**
 * Languages with complete (non-placeholder) dictionaries.
 *
 * Shared by `translation-validation.test.ts` and `schema-alignment.test.ts`
 * so a new dictionary only needs to be added in one place to enter the test
 * matrix.
 *
 * This is intentionally distinct from `@lokascript/semantic`'s
 * `SUPPORTED_LANGUAGES`: a language can be loadable by the semantic parser
 * (e.g. `tr` / Turkish) yet not be "complete" by i18n's definition if its
 * dictionary is missing newer Phase command/comparator entries. When a
 * dictionary catches up to en.ts, add its code here to enable the full
 * test sweep.
 */
export const COMPLETE_LANGUAGES = [
  'en',
  'es',
  'ja',
  'ko',
  'ar',
  'id',
  'pt',
  'it',
  'vi',
  'qu',
  'sw',
  'pl',
  'ru',
  'zh',
  'hi',
  'bn',
  'de',
  'th',
  'fr',
  'uk',
  'tl',
  'ms',
] as const;

export type CompleteLanguage = (typeof COMPLETE_LANGUAGES)[number];
