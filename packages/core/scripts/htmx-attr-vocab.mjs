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
 * It also LEADS the profile where the profile's word is right for a
 * hyperscript command but wrong for an attribute name. ja `引き金` is the
 * trigger of a gun; es `disparar` is an infinitive that reads as a command,
 * where the attribute names a thing. loka-js's terminology reviews settled
 * these for the fixi family (`fx-トリガー`, `fx-disparador`), and the two
 * families are taught side by side, so the audited form is the primary here
 * too. Nothing is lost: the generator appends the profile word after the
 * authored names, so it stays a parse alias for pages already written with it.
 *
 * Conventions (shared with loka-js — keep the families consistent):
 *   - Keys are canonical suffixes from the generator's key lists; values are
 *     the localized SUFFIX (no `hx-` prefix) — a string, or
 *     `[primary, ...aliases]`. The primary is the form to teach; aliases only
 *     have to keep parsing. Never remove a shipped name: demote it.
 *   - Identity is omitted. A key absent here (and from the profile) means
 *     authors write the canonical English attribute.
 *   - Attribute names are lowercased by the HTML parser: no uppercase (`url`,
 *     not `URL`), no whitespace.
 *   - `reviewed` is true only after a native-speaker review. `lowConfidence`
 *     lists the keys a reviewer should look at first, with the reason.
 *   - `events` holds trigger heads (canonical DOM event → localized name, or
 *     `[primary, ...aliases]`) that the i18n dictionaries do not name. A
 *     dictionary event must also be in the semantic profile's lexicon
 *     (i18n's lexicon-parity test), so an htmx-only head lives here. Only
 *     real DOM events: htmx's own trigger words (`revealed`, `every`,
 *     `intersect`) are trigger syntax, like `delay:`, and stay English.
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
 *   events?: Record<string, string | string[]>,
 *   lowConfidence?: Record<string, string>,
 * }} HtmxAttrVocab
 */

/** @type {Record<string, HtmxAttrVocab>} */
export const HTMX_ATTR_VOCAB = {
  ja: {
    reviewed: false,
    hx: {
      // loka-js Japanese terminology review (2026-07-28): トリガー is the
      // developer's word; 置換 is what Japanese htmx write-ups use for DOM
      // replacement, while スワップ means memory/financial swapping and is
      // kept only for authors coming from English. The profile's 引き金 / 交換
      // follow as aliases automatically.
      trigger: 'トリガー',
      swap: ['置換', 'スワップ'],
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
      // The rest of the book's listings (beyond Contact.app). `値` is the
      // plain word for a value; hx-vals holds extra request values.
      vals: '値',
      // 選択 is the noun (a selection). Adapter-only keys take no profile
      // fallback (the profile's `select` is text selection), so 選ぶ does
      // not follow as an alias.
      select: '選択',
      // Compound: the swap primary + the untranslated `oob` suffix, the same
      // shape as `プッシュ-url`.
      'swap-oob': '置換-oob',
      sync: '同期',
    },
    sse: { swap: ['置換', 'スワップ'] },
    events: {
      // The DOM `search` event (input type=search): the book's search box
      // uses `hx-trigger="search, keyup delay:200ms changed"`.
      search: '検索',
    },
    lowConfidence: {
      post: '投稿 is "post (content)"; 送信 is the alternative but is already the `submit` event in this vocab',
      vals: '値 is generic; 追加値 ("extra values") was considered but is a coinage',
      'swap-oob': 'oob is left as-is, like url in プッシュ-url; a reviewer may prefer 帯域外 or a different shape',
    },
  },

  es: {
    reviewed: false,
    hx: {
      // loka-js reviewed fixi attrs: nouns, because the attribute names a
      // thing (the trigger, the swap strategy). The profile's infinitives
      // disparar / intercambiar follow as aliases automatically.
      trigger: 'disparador',
      swap: 'intercambio',
      // publicar / eliminar match loka-js's rexi globals for the same verbs.
      post: 'publicar',
      delete: 'eliminar',
      confirm: 'confirmar',
      indicator: 'indicador',
      include: 'incluir',
      boost: 'impulsar',
      // `empujar` is the profile's `push` (hyperscript `push url`).
      'push-url': 'empujar-url',
      // The rest of the book's listings (beyond Contact.app). Nouns, as
      // above: the attribute names a thing.
      vals: 'valores',
      // `selección` is the noun. Adapter-only keys take no profile fallback
      // (the profile's `select` is text selection), so `seleccionar` does
      // not follow as an alias.
      select: 'selección',
      // Compound: the swap primary + the untranslated `oob` suffix, the same
      // shape as `empujar-url`.
      'swap-oob': 'intercambio-oob',
      sync: 'sincronización',
    },
    sse: { swap: 'intercambio' },
    events: {
      // The DOM `search` event (input type=search). Verb, like the
      // dictionary's cambiar / cargar / enfocar.
      search: 'buscar',
    },
    lowConfidence: {
      boost: 'impulsar vs potenciar — Spanish htmx writing mostly leaves "boost" untranslated',
      'push-url':
        'empujar is the profile\'s `push`, a calque; Spanish describes pushState as "añadir al historial"',
      search: 'buscar (verb, matching cambiar/cargar) vs búsqueda (noun, matching entrada/envío) — the dictionary mixes both',
      'swap-oob': 'oob is left as-is, like url in empujar-url; a reviewer may prefer a different shape',
    },
  },

  // pt-BR usage leads, pt-PT forms are aliases — the same policy as loka-js,
  // which registers variants as aliases rather than a separate locale.
  pt: {
    reviewed: false,
    hx: {
      // loka-js: `gatilho` is the established noun (SQL triggers, DOM
      // triggers); `destino` is the commoner word for a request target in pt
      // prose; `troca` is the noun of the profile's `trocar`.
      trigger: 'gatilho',
      target: ['alvo', 'destino'],
      swap: 'troca',
      post: 'publicar',
      // `excluir` is the pt-BR interface verb for delete; pt-PT says
      // `eliminar`.
      delete: ['excluir', 'eliminar'],
      confirm: 'confirmar',
      indicator: 'indicador',
      include: 'incluir',
      boost: 'impulsionar',
      // `empurrar` is the profile's `push` (hyperscript `push url`).
      'push-url': 'empurrar-url',
    },
    sse: { swap: 'troca' },
    events: {
      // The DOM `search` event: Contact.app's search box.
      search: 'buscar',
    },
    lowConfidence: {
      search: 'buscar vs pesquisar — both current; buscar matches the es choice',
      delete: 'regional split: excluir (pt-BR) leads, eliminar (pt-PT) is the alias',
      boost: 'impulsionar — Portuguese htmx writing mostly leaves "boost" untranslated',
      'push-url': "empurrar is the profile's `push`, a calque of the History API verb",
    },
  },

  ko: {
    reviewed: false,
    hx: {
      // loka-js settled record ko:fx-swap — 스왑 is the finance sense or the
      // two-variable exchange, bidirectional either way; a hypermedia swap
      // REPLACES, so 교체 leads. The profile's 교환 follows as an alias.
      swap: ['교체', '스왑'],
      // 대상 (the profile's word) stays primary; 타겟 is loka-js's primary —
      // what developers type — so pages move between the families unchanged.
      target: ['대상', '타겟'],
      // HTTP verbs stay in Latin script in Korean prose ("POST 요청"); these
      // follow the semantic rendering the existing hx-get (얻다) uses.
      post: '게시',
      delete: '삭제',
      // Verbal nouns — the attribute holds a message / names an element.
      confirm: '확인',
      indicator: '인디케이터',
      include: '포함',
      boost: '부스트',
      // `푸시` is the profile's `push` (hyperscript `push url`).
      'push-url': '푸시-url',
    },
    sse: { swap: ['교체', '스왑'] },
    events: {
      // The DOM `search` event: Contact.app's search box.
      search: '검색',
    },
    lowConfidence: {
      post: '게시 is "post (content)"; 전송 is the alternative but reads as send/submit',
    },
  },
};
