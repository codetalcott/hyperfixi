/**
 * Multilingual roadmap — passthrough-alignment regression guards.
 *
 * The i18n grammar transformer emits certain command verbs as forms the
 * semantic profile didn't originally list. These tests lock in the alignments
 * that cleared the corresponding failing pattern-instances (see
 * docs-internal/MULTILINGUAL_ROADMAP.md):
 *
 * - Korean `fetch`: transformer emits 가져오기 ("bring/fetch"), profile primary
 *   is the loanword 패치. 가져오기 is registered as an alternative.
 * - Korean `transition`: transformer emits 전환 ("switch/transition"), profile
 *   primary is the loanword 트랜지션. 전환 is registered as an alternative
 *   (toggle uses 토글, so no collision).
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src';

describe('Korean fetch keyword alignment (가져오기)', () => {
  // Corpus-shaped event handlers from the multilingual baseline.
  const cases = [
    '/api/form 를 제출 가져오기 method:"POST" body:form 로',
    '/api/users 를 클릭 가져오기 method:"POST", body:"name=Joe" 로',
  ];

  for (const input of cases) {
    it(`parses "${input}"`, () => {
      expect(canParse(input, 'ko')).toBe(true);
      expect(parse(input, 'ko').action).toBe('on');
    });
  }
});

describe('Japanese fetch keyword alignment (フェッチ)', () => {
  // The i18n dict previously emitted 取得 for both `get` and `fetch`; the semantic
  // ja profile reads 取得 as `get` (fetch primary is フェッチ). Aligning the dict to
  // フェッチ lets ja fetch-* corpus patterns parse the real `fetch` verb. This was
  // blocked until the SOV verb-first reorder fix (PR #298): with フェッチ leading a
  // verb-first SOV body, the event + then-chain used to drop; the body is now kept
  // patient-first so フェッチ parses as fetch without losing the rest. See
  // docs-internal/MULTILINGUAL_ROADMAP.md ("fetch keyword alignment — ja").
  function bodyActions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => bodyActions(x, acc));
      else if (c && typeof c === 'object') bodyActions(c, acc);
    }
    return acc;
  }

  // Corpus-shaped transformer output (en → ja).
  const cases: Array<[string, string[]]> = [
    // fetch-basic: `on click fetch /api/data then put it into #result`
    ['/api/data を クリック で フェッチ それから それ を #result に 置く', ['fetch', 'put']],
    // fetch-with-method: `on submit fetch /api/form with method:"POST" body:form`
    ['/api/form を 送信 で フェッチ method:"POST" body:form で', ['fetch']],
  ];

  for (const [input, expected] of cases) {
    it(`parses フェッチ as fetch (not get): "${input}"`, () => {
      const a = bodyActions(parse(input, 'ja'));
      expect(a.has('on')).toBe(true);
      for (const action of expected) expect(a.has(action)).toBe(true);
      // The collision is resolved: フェッチ must not be read as `get`.
      expect(a.has('get')).toBe(false);
    });
  }
});

describe('Korean transition keyword alignment (전환)', () => {
  const cases = [
    'transform 를 클릭 전환 "scale(1.2)" 에 300ms',
    '*background-color 를 클릭 전환 "blue" 에 500ms',
  ];

  for (const input of cases) {
    it(`parses "${input}"`, () => {
      expect(canParse(input, 'ko')).toBe(true);
      expect(parse(input, 'ko').action).toBe('on');
    });
  }

  it('does not break toggle (토글) in Korean', () => {
    expect(parse('.active 를 클릭 토글', 'ko').action).toBe('on');
  });
});

describe('Custom (non-keyword) event identifiers in SOV languages', () => {
  // `on hello put 'Got it!' into me` — the custom event `hello` keeps its
  // untranslated identifier form, so the SOV event extractor must accept a bare
  // identifier in the event slot (gated by the event-marker particle for marker
  // languages, or by an immediately-following command verb for marker-less
  // Korean). See docs-internal/MULTILINGUAL_ROADMAP.md (on-custom-event-receive).
  const cases: Array<[string, string]> = [
    // Korean (no event-marker particle): `… <event-id> <verb> …`.
    ['ko', "'Got it!' 를 hello 넣다 나 에"],
    // Quechua (event-marker particle `pi`): `… <event-id> pi <verb>`.
    ['qu', "'Got it!' ta noqa man hello pi churay"],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] parses custom event "${input}"`, () => {
      expect(canParse(input, lang)).toBe(true);
      expect(parse(input, lang).action).toBe('on');
    });
  }

  it('still parses the known-event (클릭) control in Korean', () => {
    expect(parse("'Got it!' 를 클릭 넣다 나 에", 'ko').action).toBe('on');
  });

  it('does not treat a plain command body as an event handler (ko)', () => {
    // `.active 를 토글` is a bare toggle command — no event identifier present,
    // so it must remain a command, never become a phantom event handler.
    expect(parse('.active 를 토글', 'ko').action).toBe('toggle');
  });
});

describe('Trailing event clause wraps a block body (unless-condition, ar+tl)', () => {
  // SVO/VSO transforms put the event clause last: `<body> عند <event>` /
  // `<body> kapag <event>`. The per-command fused event patterns only cover
  // simple bodies, so a block body (`unless <cond> toggle …`) used to degrade to
  // a hollow standalone match. The trailing-event extractor now wraps it as a
  // real `on` handler — en-parity: `on { unless(…) ; toggle(…) }`.
  // See docs-internal/MULTILINGUAL_ROADMAP.md (unless-condition).
  const cases: Array<[string, string]> = [
    ['ar', 'إلا I match .disabled بدل .selected عند نقر'],
    ['tl', 'maliban_kung I match .disabled palitan .selected kapag click'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] wraps the unless block as an event handler`, () => {
      const node = parse(input, lang);
      expect(node.action).toBe('on');
      // Body must contain both the unless block and the toggle, not drop either.
      const body = (node as { body?: unknown[] }).body ?? [];
      expect(JSON.stringify(body)).toContain('unless');
      expect(JSON.stringify(body)).toContain('toggle');
    });
  }

  it('does not mistake a trailing destination selector for an event (ar)', () => {
    // `بدل .active على #button` ends in `<on-marker> <selector>` — the trailing
    // extractor must not treat `#button` as an event; it stays a toggle command.
    expect(parse('بدل .active على #button', 'ar').action).toBe('toggle');
  });

  it('leaves a plain command unchanged (ar)', () => {
    expect(parse('بدل .selected', 'ar').action).toBe('toggle');
  });
});

describe('Attribute selectors (@attr) in selector-expecting roles (form-disable)', () => {
  // `@disabled` tokenizes with kind `identifier` (load-bearing — bind's
  // `@property` relies on the identifier reading, expectedTypes
  // ['reference','expression']). When a role explicitly expects a `selector`
  // (add/remove/toggle patient), an `@`-identifier is an attribute selector and
  // is now accepted. This clears `add @disabled to <button/>`, which gated the
  // form-disable-on-submit body. See docs-internal/MULTILINGUAL_ROADMAP.md.
  it('parses `add @disabled to <button/>` (attribute patient)', () => {
    expect(canParse('add @disabled to <button/>', 'en')).toBe(true);
    expect(parse('add @disabled to <button/>', 'en').action).toBe('add');
  });

  it('parses `remove @disabled from me`', () => {
    expect(parse('remove @disabled from me', 'en').action).toBe('remove');
  });

  it('does not change bind, whose @property is a non-selector role', () => {
    // bind's destination is expectedTypes ['reference','expression'] — the @attr
    // conversion is gated to selector-expecting roles, so bind is untouched.
    expect(parse('$color を #pickerの 値 に バインド', 'ja').action).toBe('bind');
  });

  const formDisable: Array<[string, string]> = [
    ['ar', 'أضف @disabled إلى <button/> in me put "Submitting..." into <button/> in me عند إرسال'],
    [
      'tl',
      'idagdag @disabled sa <button/> in me put "Submitting..." into <button/> in me kapag submit',
    ],
  ];
  for (const [lang, input] of formDisable) {
    it(`[${lang}] parses the form-disable-on-submit body`, () => {
      expect(parse(input, lang).action).toBe('on');
    });
  }
});

describe('Caret-scoped variable read `^name on <element>` (caret-var-on-target)', () => {
  // `^name on #host` reads a DOM-scoped `^name` variable from a specific element.
  // The overloaded `on` made `put ^count on #host into me` fail even in English;
  // a caret-gated matcher now folds `^name on <selector>` into one expression so
  // the trailing `into me` destination still matches. The i18n transformer masks
  // the scope so the same `on` isn't mistaken for an event/command boundary.
  // See docs-internal/MULTILINGUAL_ROADMAP.md (caret-var-on-target).
  it('parses `put ^count on #host into me` (clean order, en)', () => {
    expect(canParse('put ^count on #host into me', 'en')).toBe(true);
    expect(parse('put ^count on #host into me', 'en').action).toBe('put');
  });

  it('gives the en event handler a real (non-empty) body', () => {
    const node = parse('on click put ^count on #host into me', 'en');
    expect(node.action).toBe('on');
    expect(((node as { body?: unknown[] }).body ?? []).length).toBeGreaterThan(0);
  });

  it('does not affect a selector patient with `on` destination (toggle)', () => {
    // `.active` is not a caret variable, so `on #button` stays the destination.
    expect(parse('toggle .active on #button', 'en').action).toBe('toggle');
  });

  it('still parses a caret var without a scope (`put ^count into me`)', () => {
    expect(parse('put ^count into me', 'en').action).toBe('put');
  });

  // Transformed (DB-shaped) ar/tl forms keep `^count on #host` adjacent and the
  // event clause intact, so the handler parses (the body keeps the put).
  const transformed: Array<[string, string]> = [
    ['ar', 'ضع ^count on #host إلى أنا عند نقر'],
    ['tl', 'ilagay ^count on #host sa ako kapag click'],
  ];
  for (const [lang, input] of transformed) {
    it(`[${lang}] parses the transformed caret-scope handler`, () => {
      expect(parse(input, lang).action).toBe('on');
    });
  }
});

describe('Post-event then-chain capture (command-first VSO/SOV event bodies)', () => {
  // Distinct command actions anywhere in the parsed node tree (body/statements/
  // branches), mirroring the harness fidelity signature — lets us assert that no
  // body command was silently dropped.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // A fused VSO/SOV event pattern captures the first command (`add`) but left the
  // post-event `then`-chain (`then fetch … then remove … then put …`) unconsumed
  // without a `continues` marker — collapsing the body to just `add` (a degenerate
  // parse). The body must now retain every then-chained command.
  it('[ar] keeps remove/put after the event clause (fetch-loading-state shape)', () => {
    const node = parse(
      'أضف .loading إلى أنا عند نقر ثم احذف .loading من أنا ثم ضع هو إلى #result',
      'ar'
    );
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('add')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  // No trailing then-chain → body is exactly the one captured command (unchanged
  // behavior; guards against the gate over-reaching).
  it('[ar] a lone command-first event keeps just its command', () => {
    const node = parse('بدل .active عند نقر', 'ar');
    expect(node.action).toBe('on');
    // `on` is the handler's own action; `toggle` is the lone body command.
    expect([...actions(node)].sort()).toEqual(['on', 'toggle']);
  });
});

describe('`is empty` predicate alignment (verb vs adjective)', () => {
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // The semantic profile's `empty` primary is the *verb* (vider/esvaziar/清空/…),
  // but the i18n transformer emits the *adjective* for the `is empty` emptiness
  // check (vide/vazio/空的/…). Without the adjective registered, the condition
  // predicate was silently dropped. These corpus-shaped `if … is empty …` handlers
  // must now retain the `empty` action (alongside if + body).
  const cases: Array<[string, string]> = [
    ['fr', 'sur flou si mon valeur est vide ajouter .error à moi fin'],
    ['pt', 'em desfoque se meu valor é vazio adicionar .error para eu fim'],
    ['id', 'pada blur jika saya punya nilai adalah kosong tambah .error ke saya akhir'],
    ['zh', '当 失焦 时 如果 我的 值 是 空的 把 添加 .error 到 我 结束'],
    ['pl', 'gdy rozmycie jeśli mój wartość jest pusty dodaj .error do ja koniec'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recognizes the empty predicate in a conditional`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('empty')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('add')).toBe(true);
    });
  }
});

describe('German fetch keyword alignment (abrufen vs holen)', () => {
  // Regression: the i18n de dictionary emitted `holen` for `fetch`, but `holen`
  // is the semantic de profile's `get` primary (fetch = `abrufen`). So a German
  // fetch handler transformed to `… holen …` parsed as a `get` command and the
  // `fetch` action was dropped — degenerate parses across the de fetch cluster
  // (fetch-do-not-throw, fetch-error-handling, fetch-json, fetch-with-headers).
  // The dict now emits `abrufen`, so the handler body keeps a real `fetch`.
  // See docs-internal/MULTILINGUAL_ROADMAP.md ("German fetch keyword alignment").
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('parses the transformed de fetch handler with a real fetch in the body', () => {
    // i18n GrammarTransformer output for `on click fetch /api/data then put it into #result`
    const input = 'bei klick abrufen /api/data dann setzen es zu #result';
    const node = parse(input, 'de');
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('fetch')).toBe(true);
  });

  it('still reads holen as get (disambiguation preserved)', () => {
    expect(parse('holen #x', 'de').action).toBe('get');
  });
});

describe('if/else block-body in event handlers — Track 5 Tier 1', () => {
  // A fused VSO/SVO event pattern captures a *block* command (if/unless/…) as the
  // handler action but leaves the block's condition + branch body unconsumed — and
  // those tokens are not bridged by a then-marker. Before the fix `buildEventHandler`
  // dropped them, collapsing the handler to a bare `if` (degenerate parse). It now
  // parses the remainder as body commands. Combined with the i18n `else`-split
  // transform (`<thenBranch> else <elseBranch>`), this flips `if-exists` ar/it from
  // degenerate to faithful. See docs-internal/MULTILINGUAL_ROADMAP.md (Track 5 Tier 1).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('[ar] if-exists keeps the if + branch body (was bare if)', () => {
    // i18n transform of `on click if #modal exists show #modal else make a
    // <div#modal/> put it into body end` — `else` translated to وإلا, branches split.
    const input =
      'عند نقر إذا #modal موجود اظهر #modal وإلا اصنع a <div#modal/> ثم ضع هو إلى جسم النهاية';
    const node = parse(input, 'ar');
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('if')).toBe(true);
    expect(a.has('show')).toBe(true);
    expect(a.has('make')).toBe(true);
  });

  it('[it] if-exists keeps the if + full branch body (was bare if)', () => {
    const input =
      'su clic se #modal esiste mostrare #modal altrimenti fare a <div#modal/> allora mettere esso in corpo fine';
    const node = parse(input, 'it');
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('if')).toBe(true);
    expect(a.has('show')).toBe(true);
    expect(a.has('make')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  it('[sw] an else-joined block still parses when the event is unrecognized', () => {
    // sw `blur` (poteza_macho) isn't a recognized event, so input-validation only
    // parses via the Stage-4 compound fallback. The else-split removed the `then`
    // that used to trigger it, so the fallback now also fires on an `else` keyword —
    // this guards against that regression (faithful → null).
    const input =
      'kwenye poteza_macho kama yangu thamani ni tupu ongeza .error kwa mimi sivyo ondoa .error kutoka mimi mwisho';
    const a = actions(parse(input, 'sw'));
    expect(a.has('if')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
});

describe('async modifier transparency — Track 5 Async Tier 1', () => {
  // `async` marks the *following* command for async execution — it is a modifier,
  // not a command verb. The grammar transformer reorders it as a verb, so a fused
  // event pattern captured `async` as the handler action and the real command +
  // then-chain collapsed (degenerate). The parser now strips the async keyword
  // before parsing (mirroring English, whose body parser already skips it), so the
  // following command anchors. Flips async-block ar/de/it/th/tl degenerate→faithful.
  // See docs-internal/MULTILINGUAL_ROADMAP.md (Track 5 Async Tier 1).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('[ar] async-block keeps fetch + put (async not taken as the action)', () => {
    // i18n transform of `on click async fetch /api/data then put it into me`.
    const input = 'متزامن احضر /api/data عند نقر ثم ضع هو إلى أنا';
    const a = actions(parse(input, 'ar'));
    expect(a.has('fetch')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('async')).toBe(false); // stripped, never an action
  });

  it('[tl] async-block keeps fetch + put (sabay recognized as async)', () => {
    const input = 'sabay kuhanin_mula /api/data kapag click pagkatapos ilagay ito sa ako';
    const a = actions(parse(input, 'tl'));
    expect(a.has('fetch')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('async')).toBe(false);
  });

  it('[it] async-block recovers the real command (was bare async)', () => {
    const input = 'su clic asincrono recuperare /api/data allora mettere esso in io';
    const a = actions(parse(input, 'it'));
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('async')).toBe(false);
  });

  it('does not disturb a non-async command', () => {
    expect(parse('toggle .active', 'en').action).toBe('toggle');
  });
});

describe('then/end keyword recognition for profile-only languages — Track 5', () => {
  // isThenKeyword/isEndKeyword were hardcoded maps covering 15 languages; 9 others
  // (it, ru, th, vi, he, hi, ms, pl, uk) fell back to the English literal, so their
  // native then/end (`allora`, `затем`, `แล้ว`, `rồi`, …) weren't recognized — every
  // multi-command then-chain collapsed to the first command and `end`-terminated
  // blocks didn't close. Both recognizers now fall back to the language profile's
  // then/end form for languages absent from the curated maps (curated langs stay
  // byte-identical). See docs-internal/MULTILINGUAL_ROADMAP.md (then/end recognition).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // fetch-loading-state corpus transforms — the then-chain (add → … → remove → put)
  // must survive instead of collapsing to the first command (`add`).
  const cases: Array<[string, string]> = [
    [
      'ru',
      'при клик добавить .loading в я затем загрузить /api/data затем удалить .loading из я затем положить это в #result',
    ],
    [
      'th',
      'เมื่อ คลิก เพิ่ม .loading ใน ฉัน แล้ว ดึงข้อมูล /api/data แล้ว ลบ .loading จาก ฉัน แล้ว ใส่ มัน ใน #result',
    ],
    [
      'uk',
      'при клік додати .loading в я тоді завантажити /api/data тоді видалити .loading з я тоді покласти це в #result',
    ],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recovers a multi-command then-chain (was first-command-only)`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('add')).toBe(true);
      expect(a.has('remove')).toBe(true);
      expect(a.has('put')).toBe(true);
    });
  }

  it('leaves a curated-map language (ja) then-chain unchanged', () => {
    // ja is in the curated map; its then (それから) keeps working.
    const a = actions(parse('.a を クリック で 追加 それから .b を 削除', 'ja'));
    expect(a.has('add')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
});

describe('Juxtaposed multi-command event bodies — Track 5', () => {
  // A fused event pattern captures the FIRST body command as the action; the rest
  // of the body may be then-chained, a block, OR simply juxtaposed (no `then`
  // between commands — `halt the event call validateForm() if … end`). The fused
  // branch previously only continued on a then-chain/block, dropping juxtaposed
  // commands. It now re-parses any trailing non-`end` tokens as body commands
  // (additive: parseBodyWithGrammarPatterns only appends matched commands). Flips
  // form-submit-prevent (de/it/ru/sw/th/uk/vi) + fetch-loading-state (bn/hi/it/ja/tr)
  // + others degenerate→faithful. See docs-internal/MULTILINGUAL_ROADMAP.md.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // form-submit-prevent corpus transforms — the juxtaposed `halt … call … log …`
  // body must survive instead of collapsing to the first command (`halt`).
  const cases: Array<[string, string]> = [
    [
      'de',
      'bei absenden anhalten the ereignis aufrufen validateForm() wenn ergebnis ist falsch protokollieren "Invalid form" ende',
    ],
    [
      'sw',
      'kwenye wasilisha simama the tukio ita validateForm() kama matokeo ni uongo andika "Invalid form" mwisho',
    ],
    [
      'vi',
      'khi gửi dừng lại the sự kiện gọi validateForm() nếu kết quả là sai in ra "Invalid form" kết thúc',
    ],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recovers a juxtaposed multi-command body`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('on')).toBe(true);
      expect(a.has('halt')).toBe(true);
      expect(a.has('call')).toBe(true);
      expect(a.has('log')).toBe(true);
    });
  }

  it('does not over-generate on a simple single-command handler (en)', () => {
    const a = actions(parse('on click toggle .active', 'en'));
    expect([...a].sort()).toEqual(['on', 'toggle']);
  });
});

describe('SOV verb-first event-body reorder — modifier-prefixed bodies (Track 5)', () => {
  // A leading command-modifier (async/once/debounced) used to displace the verb in
  // the i18n SOV reorder, surfacing it first (`取得 /api/data を クリック …`). The
  // semantic parser then matched the leading `<verb> <patient>` with the
  // low-priority `*-generated-verb-first` command pattern and returned a bare
  // command, dropping the event + the rest of the body (degenerate, fid 0.25).
  //
  // The transformer now lifts the modifier out and re-emits it as a leading
  // literal, keeping the body patient-first so these transform outputs parse as a
  // full event handler again. These strings are the post-fix transformer output;
  // the parser must recover every body command. See docs-internal/SOV_REORDER_SCOPE.md.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // async-block: `on click async fetch /api/data then put it into me`.
  // ko recovers the full then-chain (fetch + put); tr recovers the real verb
  // (fetch) — the trailing `put` is dropped by a separate tr then-chain (`sonra`)
  // gap, but the handler is no longer a degenerate bare-command parse. The core
  // fix is that the event + the real verb survive instead of collapsing to one
  // `*-generated-verb-first` command.
  it('[ko] async-block keeps the full fetch + put body', () => {
    const a = actions(parse('async /api/data 를 클릭 가져오기 그러면 그것 를 넣다 나 에', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('put')).toBe(true);
  });
  it('[tr] async-block recovers the event + fetch verb (no longer degenerate)', () => {
    const a = actions(parse('async /api/data i tıklama de getir sonra o i koy ben e', 'tr'));
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
  });

  // event-once: `on click once add .initialized to me call setup()`
  const onceCases: Array<[string, string]> = [
    ['ja', 'once .initialized を クリック で 追加 私 に それから setup() を 呼び出し'],
    ['ko', 'once .initialized 를 클릭 추가 나 에 그러면 setup() 를 호출'],
    ['tr', 'once .initialized i tıklama de ekle ben e sonra setup() i çağır'],
  ];
  for (const [lang, input] of onceCases) {
    it(`[${lang}] event-once keeps add + call and records the once modifier`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      const a = actions(node);
      expect(a.has('on')).toBe(true);
      expect(a.has('add')).toBe(true);
      expect(a.has('call')).toBe(true);
      const mods = node.eventModifiers as { once?: boolean } | undefined;
      expect(mods?.once).toBe(true);
    });
  }

  it('does not over-generate on a simple SOV handler (ko)', () => {
    const a = actions(parse('.active 를 클릭 토글', 'ko'));
    expect([...a].sort()).toEqual(['on', 'toggle']);
  });
});

describe('SOV put-into verb-final reorder — ko/tr/bn (Track 5)', () => {
  // ja had a `put-into` grammar rule (roleOrder patient,destination,action =
  // verb-final); ko/tr/bn did not, so `put X into Y` fell through to the generic
  // reorder that appends `destination` AFTER the verb (verb-middle), which the
  // semantic parser can't match. As a then-chain clause this silently dropped the
  // `put`. Mirroring ja's rule (gated to standalone put via a no-event predicate)
  // emits verb-final order so the clause parses. See
  // docs-internal/MULTILINGUAL_ROADMAP.md (SOV put-into reorder).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // Standalone verb-final `put it into me` (transformer output) now parses.
  const standalone: Array<[string, string]> = [
    ['tr', 'o i ben e koy'],
    ['ko', '그것 를 나 에 넣다'],
    ['bn', 'এটি কে আমি তে রাখুন'],
  ];
  for (const [lang, input] of standalone) {
    it(`[${lang}] parses verb-final "put it into me"`, () => {
      expect(parse(input, lang).action).toBe('put');
    });
  }

  // Then-chain clause recovers `put` instead of dropping it.
  const thenChain: Array<[string, string]> = [
    ['tr', 'async /api/data i tıklama de getir sonra o i ben e koy'],
    ['ko', 'async /api/data 를 클릭 가져오기 그러면 그것 를 나 에 넣다'],
    ['bn', 'async /api/data কে ক্লিক এ আনুন তারপর এটি কে আমি তে রাখুন'],
  ];
  for (const [lang, input] of thenChain) {
    it(`[${lang}] recovers fetch + put across the then-chain`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('on')).toBe(true);
      expect(a.has('fetch')).toBe(true);
      expect(a.has('put')).toBe(true);
    });
  }

  // Regression guard: an event handler whose action is `put` must keep the event
  // mid-stream (the no-event predicate excludes it from the verb-final rule), so
  // the event + body survive rather than collapsing to a bare `put`.
  it('[tr] event handler `on success put …` keeps the event (not bare put)', () => {
    const a = actions(
      parse(
        'event.detail.message i success de koy #sr-announce e sonra @role i ayarla "alert" e sonra #sr-announce de',
        'tr'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('put')).toBe(true);
  });
});

describe('SOV repeat-* loop-body reorder — ko/bn/qu (Track 5)', () => {
  // For SOV languages the i18n transformer surfaces a block loop's keyword
  // (반복/পুনরাবৃত্তি/kutipay = repeat) — or a leading `while`/`for` clause — ahead of
  // its body, so the semantic parser used to match the bare loop keyword as a
  // *standalone* command (Stage 2) and drop the event + loop variant + body
  // (degenerate). Korean is hit hardest: with no event-marker particle the
  // Stage-1 fused event pattern can't anchor. The Stage-2 gate now prefers the
  // SOV event extraction when the matched action is a block/loop action, so the
  // event is found, stripped, and the loop body re-parsed. See
  // docs-internal/SOV_REPEAT_SCOPE.md. Strings below are post-transform output
  // (en → lang); the parser must recover the event + body.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // repeat-forever: `on load repeat forever toggle .pulse wait 1s end`
  it('[ko] repeat-forever recovers the event + loop body (not bare repeat)', () => {
    const a = actions(parse('로드 반복 forever .pulse 를 토글 그러면 1s 를 대기 끝', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });

  // repeat-while: `on click repeat while #x.innerText < 10 increment #x wait 200ms end`
  it('[ko] repeat-while recovers the event + repeat + increment body', () => {
    const a = actions(
      parse(
        '동안 #counter.innerText < 10 를 클릭 반복 그러면 #counter 를 증가 그러면 200ms 끝 를 대기',
        'ko'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  // repeat-for-each: `on click repeat for item in .items add .processed to item`
  it('[ko] repeat-for-each recovers the event + repeat + add body', () => {
    const a = actions(parse('클릭 반복 item 안에 .items 그러면 .processed 를 추가 item 에', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('add')).toBe(true);
  });

  // bn repeat-while: the leading `while`-condition broke the Stage-1 fused event
  // match (the event sits after the condition), so the bare `while` won Stage 2.
  it('[bn] repeat-while recovers the event + increment body (not bare while)', () => {
    const a = actions(
      parse(
        'যতক্ষণ #counter.innerText < 10 কে ক্লিক এ পুনরাবৃত্তি তারপর #counter কে বৃদ্ধি তারপর 200ms শেষ কে অপেক্ষা',
        'bn'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  // qu: the i18n dict emitted `kutichiy` for `repeat`, but the semantic qu profile
  // reads `kutichiy` as `return` (repeat primary is `kutipay`) — a keyword
  // collision that mis-parsed every qu repeat-*. The dict now emits `kutipay`.
  it('[qu] repeat-forever parses kutipay as repeat (not return)', () => {
    const a = actions(
      parse('apakuy pi kutipay forever .pulse ta tikray chayqa 1s ta suyay tukuy', 'qu')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('return')).toBe(false);
  });
  it('[qu] repeat-while recovers the event + repeat', () => {
    const a = actions(
      parse(
        'kay_kaq #counter.innerText < 10 ta ñitiy pi kutipay chayqa #counter ta yapay chayqa 200ms tukuy ta suyay',
        'qu'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
  });
  it('[qu] repeat-for-each recovers the event + repeat', () => {
    const a = actions(
      parse('ñitiy pi kutipay item ukupi .items chayqa .processed ta item man yapay', 'qu')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
  });

  // Regression guards. The gate is scoped to block/loop actions AND only taken
  // when SOV extraction finds a real event, so the counted variant and genuine
  // standalone loops are unaffected — no phantom event handler is synthesized.
  it('[ko] counted `repeat N times` inside an event still parses faithfully', () => {
    const a = actions(parse('3 times 를 클릭 반복 그러면 "<p>Line</p>" 를 추가 나 에', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
  it('[ko] a standalone loop (no event) is not turned into an event handler', () => {
    // Transformer output for `repeat 3 times toggle .x end` (no `on …`). With no
    // event keyword the gate's SOV extraction returns null, so the parse stays a
    // bare repeat command — no phantom `on` is synthesized.
    const a = actions(parse('3 times 를 반복 그러면 .x end 를 토글', 'ko'));
    expect(a.has('on')).toBe(false);
    expect(a.has('repeat')).toBe(true);
  });
});

describe('VSO/Austronesian repeat-* mid-stream event reorder — ar/tl (Track 5)', () => {
  // The non-SOV sibling of the SOV repeat-* fix. For VSO/Austronesian the i18n
  // transformer surfaces a block loop's keyword first and places the event clause
  // right after it, marked by an `on`-marker (`كرر عند نقر …` / `ulitin kapag click
  // …` = `repeat on click …`). The trailing-event extractor (Stage 1.5) can't see
  // the event (it isn't last), so the bare loop keyword won Stage 2 and the event +
  // body dropped (degenerate). `tryMidStreamEventExtraction` strips the `<on-marker>
  // <event>` pair and parses the rest as the loop body. Strings below are
  // post-transform output (en → lang). See docs-internal/NON_SOV_REPEAT_SCOPE.md.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // repeat-while: `on click repeat while #x.innerText < 10 increment #x wait 200ms end`
  it('[ar] repeat-while recovers the event + repeat + increment + wait body', () => {
    const a = actions(
      parse(
        'كرر بينما #counter.innerText < 10 عند نقر ثم زِد #counter ثم انتظر 200ms النهاية',
        'ar'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });
  it('[tl] repeat-while recovers the event + repeat + increment body', () => {
    const a = actions(
      parse(
        'ulitin habang #counter.innerText < 10 kapag click pagkatapos dagdagan #counter pagkatapos maghintay 200ms wakas',
        'tl'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  // repeat-for-each: `on click repeat for item in .items add .processed to item`
  it('[ar] repeat-for-each recovers the event + add body (not bare repeat)', () => {
    const a = actions(parse('كرر عند نقر item في .items ثم أضف .processed إلى item', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
  it('[tl] repeat-for-each recovers the event + add body (not bare repeat)', () => {
    const a = actions(
      parse('ulitin kapag click item sa_loob .items pagkatapos idagdag .processed sa item', 'tl')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
  });

  // Regression guard: a simple VSO command (no leading block/loop keyword) doesn't
  // reach the gate, so it parses normally and is not over-wrapped.
  it('[ar] a simple toggle command is unaffected', () => {
    const a = actions(parse('بدل .active عند نقر', 'ar'));
    expect(a.has('toggle')).toBe(true);
  });
});

describe('Non-SOV repeat-* loop-body + tail residue — zh/ar/tl/ja/ko/sw (Track 5)', () => {
  // Two parser-side fixes that close the residues scoped in
  // docs-internal/NON_SOV_REPEAT_SCOPE.md. Strings below are post-transform output
  // (en → lang) from the harness pipeline (maskSpans → GrammarTransformer →
  // unmaskSpans). Both fixes are additive — they only recover commands the parser
  // previously dropped, never re-shape an already-faithful parse.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  // ── Fix 1: `end`-mid-stream tail drop ────────────────────────────────────
  // The verb-final SOV reorder puts the block-terminating `end` *between* a
  // trailing command's argument and its verb (`… 200ms 終わり を 待つ` =
  // `… 200ms end ‹patient› wait`). `parseBodyWithClauses` used to treat `end` as
  // a hard terminator and discard the post-`end` `を 待つ` / `를 대기`, dropping
  // the trailing `wait`. It now tolerates a single trailing clause after `end`,
  // merging it with the stranded pre-`end` argument.
  // repeat-while: `on click repeat while #x.innerText < 10 increment #x wait 200ms end`
  it('[ja] repeat-while recovers the trailing wait after end', () => {
    const a = actions(
      parse(
        'の間 #counter.innerText < 10 を クリック で 繰り返し それから #counter を 増加 それから 200ms 終わり を 待つ',
        'ja'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
    expect(a.has('wait')).toBe(true); // was dropped by the `end`-break
  });
  it('[ko] repeat-while recovers the trailing wait after end', () => {
    const a = actions(
      parse(
        '동안 #counter.innerText < 10 를 클릭 반복 그러면 #counter 를 증가 그러면 200ms 끝 를 대기',
        'ko'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
    expect(a.has('wait')).toBe(true); // was dropped by the `end`-break
  });

  // ── Fix 2: `for`-binding drops the `repeat` keyword ──────────────────────
  // `repeat for <var> in <coll>` loses its `for` binder keyword in transit, so
  // the bare `repeat` keyword carries no matchable variant and matchBest can't
  // anchor it. `parseClause` now emits the `repeat` action directly when matchBest
  // fails on a token whose normalized form is the repeat loop keyword.
  // repeat-for-each: `on click repeat for item in .items add .processed to item`
  it('[ar] repeat-for-each recovers the repeat keyword (was dropped)', () => {
    const a = actions(parse('كرر عند نقر item في .items ثم أضف .processed إلى item', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true); // the `for`-binding repeat keyword
    expect(a.has('add')).toBe(true);
  });
  it('[tl] repeat-for-each recovers the repeat keyword (was dropped)', () => {
    const a = actions(
      parse('ulitin kapag click item sa_loob .items pagkatapos idagdag .processed sa item', 'tl')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
  it('[zh] repeat-for-each recovers the repeat keyword (was dropped)', () => {
    const a = actions(
      parse('当 点击 时 重复 item 在 .items 那么 添加 把 .processed 到 item', 'zh')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('add')).toBe(true);
  });

  // zh repeat-forever: the last degenerate repeat-* in the corpus. Recovering the
  // leading `重复`(repeat) keyword lifts it above the 0.5 fidelity threshold
  // (deg → faithful). `on load repeat forever toggle .pulse wait 1s end`
  it('[zh] repeat-forever recovers repeat + toggle (no longer degenerate)', () => {
    const a = actions(parse('当 加载 时 重复 forever 切换 把 .pulse 那么 等待 把 1s 结束', 'zh'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true); // cleared the last degenerate repeat-*
    expect(a.has('toggle')).toBe(true);
  });

  // sw repeat-while: SVO event leads, then `rudia wakati <cond> kisha <body>`. The
  // leading `rudia`(repeat) clause between the event and the first `kisha`(then)
  // was dropped; the repeat-keyword recovery now keeps it.
  it('[sw] repeat-while recovers the leading repeat keyword', () => {
    const a = actions(
      parse(
        'kwenye bonyeza rudia wakati #counter.innerText < 10 kisha ongeza #counter kisha ngoja 200ms mwisho',
        'sw'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true); // `rudia` was dropped before
    expect(a.has('wait')).toBe(true);
  });

  // Regression guards: neither fix should over-generate on inputs that already
  // parsed faithfully.
  it('[en] a counted `repeat N times` body is unaffected (still parses as repeat)', () => {
    const a = actions(parse('on click repeat 3 times add "<p>Line</p>" to me', 'en'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
  });
  it('[en] a plain then-chain with a trailing end is unaffected', () => {
    const a = actions(parse('on click toggle .active then add .b to me', 'en'));
    expect([...a].sort()).toEqual(['add', 'on', 'toggle']);
  });
});
