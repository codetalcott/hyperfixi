/**
 * `fetch … as <type>`: the response-type words, and each language's `as` marker
 * around them. Read by the trailing-role attach, the event handler's trailing
 * reclaim and the tail reclaims.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * they were the parser class's static fields.
 */

/**
 * Known `fetch … as <type>` response-type words. Untranslated loanwords in
 * every corpus language (the transformer localizes the `as` marker, never the
 * word), so a value-set gate is language-invariant. Used by the trailing
 * response-type reclaim in {@link buildEventHandler}: core's supported
 * conversions (json/text/html/response + binary forms), and the engine's
 * other names for them (`Object` is JSON, `String` is text) and its built-in
 * conversions (`fetch /test as Number`, upstream's suite; the engine's
 * `RESPONSE_TYPES` and `conversions`).
 */
export const RESPONSE_TYPE_WORDS = new Set([
  'json',
  'text',
  'html',
  'xml',
  'blob',
  'arraybuffer',
  'formdata',
  'response',
  'object',
  'string',
  'number',
  'int',
  'float',
  'fragment',
]);

/**
 * Per-language `as`-marker surfaces for the post-style responseType attach
 * below. The semantic profiles carry no responseType role marker outside en
 * (the generated patterns never needed one), so these come from the corpus
 * renders — the ground truth for marker surfaces (fetch-with-headers ×24).
 * Prepositional: `<marker> JSON` (es `como JSON`, zh `的 JSON`, ar `كـ JSON`).
 * Postpositional sequences: `JSON <marker…>` (ko `JSON 로`, hi `JSON के रूप
 * में`); ja/bn render the response word bare.
 */
export const AS_MARKERS_BEFORE: Record<string, readonly string[]> = {
  en: ['as'],
  es: ['como'],
  fr: ['comme'],
  pt: ['como'],
  it: ['come'],
  de: ['als'],
  id: ['sebagai'],
  ms: ['sebagai', 'sbg'],
  sw: ['kuwa', 'kama'],
  th: ['เป็น'],
  vi: ['như'],
  tl: ['bilang'],
  he: ['כ'],
  ar: ['كـ'],
  pl: ['jako'],
  ru: ['как'],
  uk: ['як'],
  zh: ['的', '作为', '当作'],
};

export const AS_MARKERS_AFTER: Record<string, readonly (readonly string[])[]> = {
  ko: [['로'], ['으로']],
  qu: [['hina']],
  tr: [['olarak']],
  hi: [['के', 'रूप', 'में']],
};
