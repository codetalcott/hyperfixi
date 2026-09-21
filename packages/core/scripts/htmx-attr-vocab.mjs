/**
 * Hand-authored htmx attribute vocabulary, per language.
 *
 * `gen-htmx-vocab.mjs` consults this table FIRST, then falls back to the
 * semantic profile (`keywords[key].primary`, then `references[key]`).
 *
 * Why a table and not more profile keywords: the profile is the hyperscript
 * COMMAND vocabulary, and most htmx attribute names are not hyperscript
 * commands. Adding them there makes them tokenizer keywords — and the natural
 * words are already taken: ja `削除` and es `eliminar` (hx-delete) are the
 * `remove` command's words in those profiles. An attribute name only has to
 * be unique among attribute names, so it lives here instead. Same split as
 * loka-js (`scripts/fx-vocab.mjs` holds attrs; the profile holds events).
 *
 * Conventions (shared with loka-js — keep the families consistent):
 *   - Keys are canonical suffixes from the generator's key lists; values are
 *     the localized SUFFIX (no `hx-` prefix). One name per key: core's
 *     embedded orchestrator inverts attrs canonical → localized and keeps a
 *     single name, so aliases are not representable yet.
 *   - Identity is omitted. A key absent here (and from the profile) means
 *     authors write the canonical English attribute.
 *   - Attribute names are lowercased by the HTML parser: no uppercase (`url`,
 *     not `URL`), no whitespace.
 *   - `reviewed` is true only after a native-speaker review. `lowConfidence`
 *     lists the keys a reviewer should look at first, with the reason.
 *
 * Adding a language: add an entry, run `npm run generate:htmx-vocab --prefix
 * packages/core`, then `npm run sync-htmx-vocab --prefix packages/vite-plugin`.
 * The generator throws on an unknown key, a name that collides with another
 * attribute in the same language, or a name that is not a valid attribute name.
 */

/**
 * @typedef {{
 *   reviewed: boolean,
 *   hx?: Record<string, string>,
 *   sse?: Record<string, string>,
 *   ws?: Record<string, string>,
 *   lowConfidence?: Record<string, string>,
 * }} HtmxAttrVocab
 */

/** @type {Record<string, HtmxAttrVocab>} */
export const HTMX_ATTR_VOCAB = {
  ja: {
    reviewed: false,
    hx: {
      // HTTP verbs are written as-is (POST/DELETE) in Japanese prose; these
      // follow the existing semantic rendering of hx-get (取得), not the
      // method token.
      post: '投稿',
      delete: '削除',
      // Verbal nouns — the attribute holds a message / names an element.
      confirm: '確認',
      indicator: 'インジケーター',
      include: '含める',
      boost: 'ブースト',
      // `プッシュ` is the profile's `push` (hyperscript `push url`), kept
      // identical so the attribute and the command read the same.
      'push-url': 'プッシュ-url',
    },
    lowConfidence: {
      post: '投稿 is "post (content)"; 送信 is the alternative but is already the `submit` event in this vocab',
    },
  },

  es: {
    reviewed: false,
    hx: {
      // publicar / eliminar match loka-js's rexi globals for the same verbs.
      post: 'publicar',
      delete: 'eliminar',
      confirm: 'confirmar',
      indicator: 'indicador',
      include: 'incluir',
      boost: 'impulsar',
      // `empujar` is the profile's `push` (hyperscript `push url`).
      'push-url': 'empujar-url',
    },
    lowConfidence: {
      boost: 'impulsar vs potenciar — Spanish htmx writing mostly leaves "boost" untranslated',
      'push-url':
        'empujar is the profile\'s `push`, a calque; Spanish describes pushState as "añadir al historial"',
    },
  },
};
