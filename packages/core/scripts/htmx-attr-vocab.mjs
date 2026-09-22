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
      // The rest of the book's listings (beyond Contact.app). Nouns, as the
      // es entries: the attribute names a thing.
      vals: 'valores',
      // `seleção` is the noun; the profile's `selecionar` does not follow
      // (adapter-only keys take no profile fallback).
      select: 'seleção',
      // The swap primary + the untranslated `oob` suffix, like `empurrar-url`.
      'swap-oob': 'troca-oob',
      sync: 'sincronização',
    },
    sse: { swap: 'troca' },
    events: {
      // The DOM `search` event: Contact.app's search box.
      search: 'buscar',
    },
    lowConfidence: {
      search: 'buscar vs pesquisar — both current; buscar matches the es choice',
      vals: 'valores is generic, as in es',
      'swap-oob': 'oob is left as-is, like url in empurrar-url; a reviewer may prefer a different shape',
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
      // The rest of the book's listings (beyond Contact.app). Sino-Korean
      // nouns, like 확인 / 포함 above.
      vals: '값',
      // 선택 is the noun; the profile's 고르기 does not follow (adapter-only
      // keys take no profile fallback).
      select: '선택',
      // The swap primary + the untranslated `oob` suffix, like `푸시-url`.
      'swap-oob': '교체-oob',
      sync: '동기화',
    },
    sse: { swap: ['교체', '스왑'] },
    events: {
      // The DOM `search` event: Contact.app's search box.
      search: '검색',
    },
    lowConfidence: {
      post: '게시 is "post (content)"; 전송 is the alternative but reads as send/submit',
      vals: '값 is the bare word for "value(s)"; Korean does not mark plural, which is fine for an attribute',
      'swap-oob': 'oob is left as-is, like url in 푸시-url; a reviewer may prefer a different shape',
    },
  },

  // The second wave (2026-09-22): the four languages the companion adds after
  // ja/es/pt/ko. None is reviewed. Where loka-js authored a fixi noun for
  // trigger/swap (fx-auslöser, fx-déclencheur, fx-tetikleyici, fx-替换) it
  // leads here for the same reason as ja/es: the attribute names a thing, and
  // the families are taught side by side. The profile's word follows as an
  // alias automatically.
  tr: {
    reviewed: false,
    hx: {
      // loka-js fx-tetikleyici (noun); the profile's imperative `tetikle` is the alias.
      trigger: 'tetikleyici',
      // loka-js fx-değiştirme ("replacing"); the profile's `takas` (barter) is
      // the alias. loka-js's second form `değişim` is NOT taken: it is the
      // dictionary's `change` event word, and hx-değişim="değişim" would be
      // a trap.
      swap: 'değiştirme',
      post: 'gönder',
      delete: 'sil',
      confirm: 'onayla',
      boost: 'hızlandır',
      // `itele` is the profile's `push` (hyperscript `push url`).
      'push-url': 'itele-url',
      indicator: 'gösterge',
      include: 'içer',
      vals: 'değerler',
      // Noun; the profile's `select` (vurgula, "highlight") is text selection
      // and does not follow.
      select: 'seçim',
      'swap-oob': 'değiştirme-oob',
      sync: 'eşitle',
    },
    sse: { swap: 'değiştirme' },
    events: {
      // Noun, like the dictionary's tıklama (click) / değişim (change).
      search: 'arama',
    },
    lowConfidence: {
      post: 'gönder is "send"; yayınla ("publish") would match es/pt publicar. ws-send is already ws-gönder',
      'push-url': "itele is the profile's `push`, a calque; a Turkish reviewer may prefer geçmiş-url (history)",
      include: 'içer vs dahil-et — dahil et is the UI phrase but needs a hyphen',
      sync: 'eşitle vs senkronize-et',
      boost: 'hızlandır ("speed up"); Turkish htmx writing may leave boost untranslated',
    },
  },

  de: {
    reviewed: false,
    hx: {
      // HTML lowercases attribute names, so the profile's `Ziel` shipped as
      // `hx-Ziel` — a name no parsed attribute can ever match. The lowercase
      // form leads; `hx-Ziel` stays as the (unreachable) alias.
      target: 'ziel',
      // loka-js fx-auslöser (noun); the profile's infinitive `auslösen` is the alias.
      trigger: 'auslöser',
      // loka-js fx-ersetzung ("replacement", the htmx sense) + fx-tausch; the
      // profile's `austauschen` is the alias.
      swap: ['ersetzung', 'tausch'],
      post: 'posten',
      delete: 'löschen',
      confirm: 'bestätigen',
      boost: 'beschleunigen',
      // NOT the profile's `push` (drücken, "press"): "press url" is a
      // mis-calque. verlauf = browser history, which is what the attribute
      // touches.
      'push-url': 'verlauf-url',
      indicator: 'indikator',
      include: 'einbeziehen',
      vals: 'werte',
      // Noun; the profile's `select` (markieren, "highlight") is text
      // selection and does not follow.
      select: 'auswahl',
      'swap-oob': 'ersetzung-oob',
      sync: 'synchronisieren',
    },
    sse: { swap: ['ersetzung', 'tausch'] },
    events: {
      // Verb, like the dictionary's ändern (change) / laden (load).
      search: 'suchen',
    },
    lowConfidence: {
      post: 'posten is colloquial; senden collides in sense with ws-senden; German htmx writing keeps "POST"',
      'push-url': 'verlauf-url is a paraphrase, not the profile word; schieben-url is the literal alternative',
      boost: 'beschleunigen ("speed up"); German htmx writing mostly leaves boost untranslated',
      sync: 'synchronisieren is long; abgleich (noun) is the alternative',
    },
  },

  fr: {
    reviewed: false,
    hx: {
      // loka-js fx-déclencheur (noun); the profile's infinitive `déclencher` is the alias.
      trigger: 'déclencheur',
      // loka-js fx-remplacement (the htmx sense) + fx-échange; the profile's
      // `échanger` is the alias.
      swap: ['remplacement', 'échange'],
      post: 'publier',
      delete: 'supprimer',
      confirm: 'confirmer',
      // French developers say "booster"; it is a conjugable French verb.
      boost: 'booster',
      // `pousser` is the profile's `push` (hyperscript `push url`), as es empujar-url.
      'push-url': 'pousser-url',
      indicator: 'indicateur',
      include: 'inclure',
      vals: 'valeurs',
      // Noun; the profile's `sélectionner` does not follow (adapter-only key).
      select: 'sélection',
      'swap-oob': 'remplacement-oob',
      sync: 'synchronisation',
    },
    sse: { swap: ['remplacement', 'échange'] },
    events: {
      // Verb, like the dictionary's changer (change) / charger (load).
      search: 'rechercher',
    },
    lowConfidence: {
      'push-url': "pousser is the profile's `push`, a calque; French describes pushState as \"ajouter à l'historique\"",
      sync: 'synchronisation (noun) vs synchroniser (verb) — the fr attrs are mostly verbs',
    },
  },

  zh: {
    reviewed: false,
    hx: {
      // loka-js fx-替换 ("replace", what a hypermedia swap does); the
      // profile's 交换 (exchange) is the alias. Same reasoning as ja 置換.
      swap: ['替换', '交换'],
      post: '发布',
      delete: '删除',
      confirm: '确认',
      boost: '增强',
      // `推送` is the profile's `push` (hyperscript `push url`), as ja プッシュ-url.
      'push-url': '推送-url',
      indicator: '指示器',
      include: '包含',
      vals: '值',
      // The profile's `select` happens to be 选择 too, but adapter-only keys
      // take no profile fallback, so it is authored here.
      select: '选择',
      'swap-oob': '替换-oob',
      sync: '同步',
    },
    sse: { swap: ['替换', '交换'] },
    events: {
      search: '搜索',
    },
    lowConfidence: {
      post: '发布 is "publish/post (content)"; 提交 ("submit") is the alternative',
      boost: '增强 ("enhance") follows Chinese htmx write-ups; a reviewer may prefer 加速',
    },
  },

  // The third wave (2026-09-22): the remaining 15 languages, so every language
  // the profiles cover offers the full book-listing set as a hook for readers.
  // No readership signal drove the order; the hope is that the hooks create
  // it. Every entry is Claude-drafted and unreviewed — the review invitation
  // on the docs site is the path to fixing them. Where loka-js authored a
  // fixi noun for trigger/swap/target it leads, as in the earlier waves; the
  // profile's word follows as an alias. `events` also fills trigger heads the
  // dictionaries leave as English passthrough or as multi-word phrases
  // (hyphen-joined here: a head may contain hyphens, as `contacts-updated`
  // shows). Languages whose dictionary already names the six heads the book
  // uses get only `search`.
  ar: {
    reviewed: false,
    hx: {
      // loka-js fx-محفز (noun); the profile's تشغيل ("run") is the alias.
      trigger: 'محفز',
      // loka-js fx-تبديل; the profile's imperative استبدل is the alias.
      swap: 'تبديل',
      post: 'انشر',
      delete: 'احذف',
      confirm: 'تأكيد',
      boost: 'تعزيز',
      'push-url': 'ادفع-url',
      indicator: 'مؤشر',
      include: 'تضمين',
      vals: 'قيم',
      select: 'اختيار',
      'swap-oob': 'تبديل-oob',
      sync: 'مزامنة',
    },
    sse: { swap: 'تبديل' },
    events: {
      search: 'بحث',
      // The dictionary's "مفتاح أعلى" is two words; hyphen-joined here.
      keyup: 'مفتاح-أعلى',
      mouseenter: 'دخول-الفأرة',
    },
    lowConfidence: {
      post: 'انشر ("publish"); أرسل is already ws-send',
      keyup: 'hyphen-join of the dictionary phrase, unreviewed',
      mouseenter: 'coinage',
    },
  },

  bn: {
    reviewed: false,
    hx: {
      post: 'পোস্ট',
      delete: 'মুছুন',
      confirm: 'নিশ্চিত',
      boost: 'বুস্ট',
      // `পুশ` is the profile's `push`.
      'push-url': 'পুশ-url',
      indicator: 'সূচক',
      include: 'অন্তর্ভুক্ত',
      vals: 'মান',
      select: 'নির্বাচন',
      'swap-oob': 'বদল-oob',
      sync: 'সিঙ্ক',
    },
    events: { search: 'খোঁজ', mouseenter: 'মাউস-প্রবেশ' },
    lowConfidence: {
      post: 'পোস্ট (loanword); Bengali developer writing keeps POST',
      sync: 'সিঙ্ক (loanword) vs সমন্বয়',
      mouseenter: 'coinage',
    },
  },

  he: {
    reviewed: false,
    hx: {
      // loka-js fx-מפעיל (noun); the profile's imperative הפעל is the alias.
      trigger: 'מפעיל',
      // loka-js fx-החלפה (noun); the profile's imperative החלף is the alias.
      swap: 'החלפה',
      post: 'פרסם',
      delete: 'מחק',
      confirm: 'אישור',
      boost: 'האצה',
      // `דחוף` is the profile's `push`.
      'push-url': 'דחוף-url',
      indicator: 'מחוון',
      include: 'כלול',
      vals: 'ערכים',
      select: 'בחירה',
      'swap-oob': 'החלפה-oob',
      sync: 'סנכרון',
    },
    sse: { swap: 'החלפה' },
    events: {
      search: 'חיפוש',
      keyup: 'שחרור-מקש',
      load: 'טעינה',
      mouseenter: 'כניסת-עכבר',
    },
    lowConfidence: {
      'push-url': "דחוף is the profile's `push`, a calque",
      keyup: 'coinage',
      mouseenter: 'coinage',
    },
  },

  hi: {
    reviewed: false,
    hx: {
      // loka-js fx-अदला-बदली; the profile's विनिमय ("exchange") is the alias.
      swap: 'अदला-बदली',
      post: 'पोस्ट',
      delete: 'हटाएं',
      confirm: 'पुष्टि',
      boost: 'बूस्ट',
      // NOT the profile's `push` (धकेलें, "shove"); the loanword, as bn.
      'push-url': 'पुश-url',
      indicator: 'संकेतक',
      include: 'शामिल',
      vals: 'मान',
      select: 'चयन',
      'swap-oob': 'अदला-बदली-oob',
      sync: 'सिंक',
    },
    sse: { swap: 'अदला-बदली' },
    events: { search: 'खोज' },
    lowConfidence: {
      post: 'पोस्ट (loanword); Hindi developer writing keeps POST',
      'push-url': 'पुश (loanword) rather than the profile\'s धकेलें',
    },
  },

  id: {
    reviewed: false,
    hx: {
      // The profile's `target` is the English identity; sasaran is the
      // common Indonesian word (ms uses it too).
      target: 'sasaran',
      // loka-js fx-pemicu (noun); the profile's `picu` is the alias.
      trigger: 'pemicu',
      post: 'kirim',
      delete: 'hapus',
      confirm: 'konfirmasi',
      boost: 'percepat',
      // `dorong` is the profile's `push`.
      'push-url': 'dorong-url',
      indicator: 'indikator',
      include: 'sertakan',
      vals: 'nilai',
      select: 'pilihan',
      'swap-oob': 'tukar-oob',
      sync: 'sinkron',
    },
    events: { search: 'cari' },
    lowConfidence: {
      target: 'sasaran vs leaving target (loka-js keeps the identity)',
      post: 'kirim ("send"); ws-send is already ws-kirim. terbitkan ("publish") is the alternative',
    },
  },

  it: {
    reviewed: false,
    hx: {
      // loka-js fx-attivatore (noun); the profile's `scatenare` is the alias.
      trigger: 'attivatore',
      // loka-js fx-scambio (noun); the profile's `scambiare` is the alias.
      swap: 'scambio',
      // The profile's obiettivo leads; loka-js's destinazione is an alias.
      target: ['obiettivo', 'destinazione'],
      post: 'pubblicare',
      delete: 'eliminare',
      confirm: 'confermare',
      boost: 'potenziare',
      // `spingere` is the profile's `push`.
      'push-url': 'spingere-url',
      indicator: 'indicatore',
      include: 'includere',
      vals: 'valori',
      select: 'selezione',
      'swap-oob': 'scambio-oob',
      sync: 'sincronizzazione',
    },
    sse: { swap: 'scambio' },
    events: { search: 'cercare' },
    lowConfidence: {
      boost: 'potenziare; Italian htmx writing mostly leaves boost untranslated',
      'push-url': "spingere is the profile's `push`, a calque",
    },
  },

  ms: {
    reviewed: false,
    hx: {
      // loka-js fx-pencetus (noun); the profile's `cetuskan` is the alias.
      trigger: 'pencetus',
      // loka-js fx-tukar; the profile's `tukar_tempat` is the alias.
      swap: 'tukar',
      post: 'hantar',
      delete: 'padam',
      confirm: 'sahkan',
      boost: 'percepat',
      // `tolak` is the profile's `push`.
      'push-url': 'tolak-url',
      indicator: 'penunjuk',
      include: 'sertakan',
      vals: 'nilai',
      select: 'pilihan',
      'swap-oob': 'tukar-oob',
      sync: 'segerak',
    },
    sse: { swap: 'tukar' },
    // The ms dictionary leaves every event as English passthrough.
    events: {
      click: 'klik',
      keyup: 'lepas-kekunci',
      change: 'ubah',
      load: 'muat',
      mouseenter: 'tetikus-masuk',
      search: 'cari',
    },
    lowConfidence: {
      post: 'hantar ("send"); ws-send is already ws-hantar',
      keyup: 'coinage',
      mouseenter: 'coinage',
    },
  },

  pl: {
    reviewed: false,
    hx: {
      // loka-js fx-wyzwalacz (noun); the profile's imperative `wyzwól` is the alias.
      trigger: 'wyzwalacz',
      // loka-js fx-zamiana (noun); the profile's imperative `zamień` is the alias.
      swap: 'zamiana',
      post: 'opublikuj',
      delete: 'usuń',
      confirm: 'potwierdź',
      boost: 'przyspiesz',
      // The profile has no `push`; historia = browser history, as de verlauf-url.
      'push-url': 'historia-url',
      indicator: 'wskaźnik',
      include: 'dołącz',
      vals: 'wartości',
      select: 'wybór',
      'swap-oob': 'zamiana-oob',
      sync: 'synchronizacja',
    },
    sse: { swap: 'zamiana' },
    events: { search: 'szukaj' },
    lowConfidence: {
      'push-url': 'historia-url is a paraphrase; wypchnij-url is the literal alternative',
    },
  },

  qu: {
    reviewed: false,
    hx: {
      // The profile's t'inkuy has an apostrophe, which the HTML parser
      // tolerates but this table forbids; tikray ("turn over") leads and
      // t'inkuy stays the alias.
      swap: 'tikray',
      post: 'apachiy',
      delete: 'pichay',
      confirm: 'takyachiy',
      boost: 'utqhaychiy',
      // `tanqay` is the profile's `push`.
      'push-url': 'tanqay-url',
      indicator: 'rikuchiq',
      include: 'yapay',
      vals: 'chanikuna',
      select: 'akllay',
      'swap-oob': 'tikray-oob',
      sync: 'kuskachay',
    },
    sse: { swap: 'tikray' },
    events: { search: 'maskay' },
    lowConfidence: {
      post: 'every qu entry is a draft by a non-speaker; apachiy ("send off") for post',
      swap: 'tikray vs the profile\'s t\'inkuy',
      boost: 'utqhaychiy ("make fast") is a derivation',
      sync: 'kuskachay ("bring together") is a derivation',
    },
  },

  ru: {
    reviewed: false,
    hx: {
      // loka-js fx-триггер; the profile's `инициировать` is the alias.
      trigger: 'триггер',
      // loka-js fx-обмен (noun); the profile's `поменять` is the alias.
      swap: 'обмен',
      post: 'опубликовать',
      delete: 'удалить',
      confirm: 'подтвердить',
      boost: 'ускорить',
      // The profile has no `push`; история = browser history.
      'push-url': 'история-url',
      indicator: 'индикатор',
      include: 'включить',
      vals: 'значения',
      select: 'выбор',
      'swap-oob': 'обмен-oob',
      sync: 'синхронизация',
    },
    sse: { swap: 'обмен' },
    events: { search: 'поиск' },
    lowConfidence: {
      'push-url': 'история-url is a paraphrase',
      swap: 'обмен ("exchange") follows loka-js; замена ("replacement") is the htmx sense',
    },
  },

  sw: {
    reviewed: false,
    hx: {
      // loka-js fx-kichocheo (noun); the profile's `chochea` is the alias.
      trigger: 'kichocheo',
      // loka-js fx-badilisha; the profile's `badilishana` is the alias.
      swap: 'badilisha',
      post: 'chapisha',
      delete: 'futa',
      confirm: 'thibitisha',
      boost: 'harakisha',
      // `sukuma` is the profile's `push`.
      'push-url': 'sukuma-url',
      indicator: 'kiashiria',
      include: 'jumuisha',
      vals: 'thamani',
      select: 'uteuzi',
      'swap-oob': 'badilisha-oob',
      sync: 'sawazisha',
    },
    sse: { swap: 'badilisha' },
    events: { search: 'tafuta' },
    lowConfidence: {
      boost: 'harakisha ("hasten")',
      select: 'uteuzi (noun) vs chagua (verb)',
    },
  },

  th: {
    reviewed: false,
    hx: {
      // The profile's สลับที่ leads; loka-js's สลับ is an alias.
      swap: ['สลับที่', 'สลับ'],
      post: 'โพสต์',
      delete: 'ลบ',
      confirm: 'ยืนยัน',
      boost: 'เร่ง',
      // `ดัน` is the profile's `push`.
      'push-url': 'ดัน-url',
      indicator: 'ตัวบ่งชี้',
      include: 'รวม',
      vals: 'ค่า',
      select: 'เลือก',
      'swap-oob': 'สลับที่-oob',
      sync: 'ซิงค์',
    },
    sse: { swap: ['สลับที่', 'สลับ'] },
    events: { search: 'ค้นหา', mouseenter: 'เมาส์เข้ามา' },
    lowConfidence: {
      post: 'โพสต์ (loanword); Thai developer writing keeps POST',
      mouseenter: 'coinage',
    },
  },

  tl: {
    reviewed: false,
    hx: {
      // loka-js fx-pampukaw; the profile's `palitawin` is the alias.
      trigger: 'pampukaw',
      // loka-js fx-palit; the profile's `palitan_pwesto` is the alias.
      swap: 'palit',
      // `target` stays English: the everyday Tagalog word IS target, and
      // loka-js keeps the identity too.
      post: 'ilathala',
      delete: 'burahin',
      confirm: 'kumpirmahin',
      boost: 'pabilisin',
      // `itulak` is the profile's `push`.
      'push-url': 'itulak-url',
      indicator: 'indikador',
      include: 'isama',
      vals: 'halaga',
      select: 'pilian',
      'swap-oob': 'palit-oob',
      sync: 'pagsabay',
    },
    sse: { swap: 'palit' },
    // The tl dictionary leaves every event as English passthrough.
    events: {
      click: 'pindot',
      keyup: 'bitaw-tiklado',
      change: 'pagbabago',
      load: 'karga',
      mouseenter: 'pasok-mouse',
      search: 'hanap',
    },
    lowConfidence: {
      post: 'ilathala ("publish"); ipadala is already ws-send',
      click: 'pindot ("press") vs the loanword klik',
      keyup: 'coinage',
      mouseenter: 'coinage',
      sync: 'pagsabay ("doing together") is a derivation',
    },
  },

  uk: {
    reviewed: false,
    hx: {
      // loka-js fx-тригер; the profile's `ініціювати` is the alias.
      trigger: 'тригер',
      // loka-js fx-обмін (noun); the profile's `поміняти` is the alias.
      swap: 'обмін',
      post: 'опублікувати',
      delete: 'видалити',
      confirm: 'підтвердити',
      boost: 'прискорити',
      // The profile has no `push`; історія = browser history.
      'push-url': 'історія-url',
      indicator: 'індикатор',
      include: 'включити',
      vals: 'значення',
      select: 'вибір',
      'swap-oob': 'обмін-oob',
      sync: 'синхронізація',
    },
    sse: { swap: 'обмін' },
    events: { search: 'пошук' },
    lowConfidence: {
      'push-url': 'історія-url is a paraphrase',
      swap: 'обмін ("exchange") follows loka-js; заміна ("replacement") is the htmx sense',
    },
  },

  vi: {
    reviewed: false,
    hx: {
      // Hyphen-joined, the vi convention (trực-tiếp, kết-nối).
      post: 'đăng',
      delete: 'xóa',
      confirm: 'xác-nhận',
      boost: 'tăng-tốc',
      // `đẩy` is the profile's `push`.
      'push-url': 'đẩy-url',
      indicator: 'chỉ-báo',
      include: 'bao-gồm',
      vals: 'giá-trị',
      select: 'chọn',
      'swap-oob': 'hoán-đổi-oob',
      sync: 'đồng-bộ',
    },
    // The vi dictionary leaves keyup/change/mouseenter as English passthrough.
    events: {
      search: 'tìm-kiếm',
      keyup: 'nhả-phím',
      change: 'thay-đổi',
      mouseenter: 'chuột-vào',
    },
    lowConfidence: {
      select: 'chọn (verb) vs lựa-chọn (noun)',
      keyup: 'nhả-phím, hyphen-joined',
    },
  },
};
