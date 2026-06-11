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

describe('qu/sw increment keyword alignment (yapachiy / ongezeko)', () => {
  // The i18n dictionaries collapsed `add` and `increment` onto the same word
  // (qu yapay, sw ongeza), so the transformer emitted the add-word for increment
  // and the semantic parser read it as `add` — capping qu/sw repeat-while at 0.75
  // (increment counted as the wrong action). The dicts now emit the profile's
  // distinct increment primary (qu yapachiy, sw ongezeko). qu additionally needed
  // a handcrafted SOV pattern (`{patient} ta yapachiy`) mirroring add-qu-sov — the
  // generated SOV pattern didn't anchor the verb-final order. See the recommended
  // follow-up to docs-internal/NON_SOV_REPEAT_SCOPE.md.
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

  // qu is SOV: `increment #counter` → `#counter ta yapachiy`.
  it('[qu] reads yapachiy as increment in verb-final SOV order (not add)', () => {
    const a = actions(parse('#counter ta yapachiy', 'qu'));
    expect(a.has('increment')).toBe(true);
    expect(a.has('add')).toBe(false);
  });
  it('[qu] reads yapachiy as increment in verb-first order', () => {
    const a = actions(parse('yapachiy #counter', 'qu'));
    expect(a.has('increment')).toBe(true);
  });
  // qu add must still read as add (no collision introduced).
  it('[qu] yapay still reads as add', () => {
    const a = actions(parse('#counter ta yapay', 'qu'));
    expect(a.has('add')).toBe(true);
    expect(a.has('increment')).toBe(false);
  });

  // sw is SVO: `increment #counter` → `ongezeko #counter`.
  it('[sw] reads ongezeko as increment (not add)', () => {
    const a = actions(parse('ongezeko #counter', 'sw'));
    expect(a.has('increment')).toBe(true);
    expect(a.has('add')).toBe(false);
  });
  it('[sw] ongeza still reads as add', () => {
    const a = actions(parse('ongeza #counter', 'sw'));
    expect(a.has('add')).toBe(true);
    expect(a.has('increment')).toBe(false);
  });

  // End-to-end: qu/sw repeat-while now recovers increment (was add), reaching 1.0.
  it('[qu] repeat-while recovers increment via yapachiy', () => {
    const a = actions(
      parse(
        'kay_kaq #counter.innerText < 10 ta ñitiy pi kutipay chayqa #counter ta yapachiy chayqa 200ms tukuy ta suyay',
        'qu'
      )
    );
    expect(a.has('increment')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });
  it('[sw] repeat-while recovers increment via ongezeko', () => {
    const a = actions(
      parse(
        'kwenye bonyeza rudia wakati #counter.innerText < 10 kisha ongezeko #counter kisha ngoja 200ms mwisho',
        'sw'
      )
    );
    expect(a.has('increment')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });
});

describe('zh wait BA-marked duration (等待 把 {duration})', () => {
  // The i18n transformer runs `wait 1s` through its generic argument parser,
  // which defaults the first argument to the `patient` role and so marks it with
  // the BA particle `把` — emitting `等待 把 1s`. The generated `等待 {duration}`
  // pattern has no `把`, so the marked form didn't parse and the trailing `wait`
  // dropped (the last zh `repeat-forever` residue: 0.67 → 1.0). A handcrafted
  // `wait-zh-ba` pattern now tolerates the `把`. The deeper transformer fix (don't
  // mark a duration as a fronted patient) is scoped in docs-internal/ZH_BLOCK_BODY_SCOPE.md.
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

  it('[zh] parses the BA-marked duration `等待 把 1s` as wait', () => {
    const a = actions(parse('等待 把 1s', 'zh'));
    expect(a.has('wait')).toBe(true);
  });
  it('[zh] still parses the unmarked `等待 1s` as wait (generated pattern)', () => {
    const a = actions(parse('等待 1s', 'zh'));
    expect(a.has('wait')).toBe(true);
  });
  // repeat-forever: `on load repeat forever toggle .pulse wait 1s end` — the last
  // zh repeat-* residue. Now recovers the full {on, repeat, toggle, wait} body.
  it('[zh] repeat-forever recovers the trailing wait (was dropped)', () => {
    const a = actions(parse('当 加载 时 重复 forever 切换 把 .pulse 那么 等待 把 1s 结束', 'zh'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('toggle')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });
});

describe('zh then-connective 那么 recognized (aligns with i18n)', () => {
  // The i18n package deliberately maps 那么 → `then` (parser-integration.test.ts
  // asserts `zhKeywords.resolve('那么')` === 'then'), and the grammar transformer
  // emits 那么 for `then`. The semantic zh profile previously listed only 然后/接着,
  // so `isThenKeyword('那么','zh')` was false — the parser recognized 然后 but not
  // 那么. Today the matchBest clause-loop recovers commands either way (so this was
  // a latent consistency gap, not an observable parse bug), but 那么 is now a
  // first-class then-alternative in the profile so the two packages agree and the
  // recovery no longer leans on the fallback. See docs-internal/ZH_BLOCK_BODY_SCOPE.md.
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

  // 那么 and 然后 must behave identically as then-connectives in an event body.
  const body = (sep: string) =>
    `当 点击 时 切换 把 .active ${sep} 添加 把 .b 到 我 ${sep} 移除 把 .c 从 我`;
  it('[zh] 那么 joins a multi-command event body (toggle + add + remove)', () => {
    const a = actions(parse(body('那么'), 'zh'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
  it('[zh] 那么 and 然后 recover the same commands', () => {
    const na = [...actions(parse(body('那么'), 'zh'))].sort();
    const ran = [...actions(parse(body('然后'), 'zh'))].sort();
    expect(na).toEqual(ran);
  });
  // Guard: 那么 as an if/then consequence connective still parses (not swallowed).
  it('[zh] if/then with 那么 still recovers the consequence command', () => {
    const a = actions(parse('如果 真 那么 切换 把 .active', 'zh'));
    expect(a.has('toggle')).toBe(true);
  });
});

describe('zh fetch in event block (抓取 把 {source} [的 {responseType}])', () => {
  // The i18n zh dict emitted `获取` for `fetch`, but the semantic zh profile reads
  // 获取 as `get` (its `fetch` primary is 抓取), so a transformed `fetch` parsed as
  // `get` / didn't anchor. The dict now emits 抓取. The transformer also runs the
  // URL through its generic argument parser, marking it with the BA particle `把`
  // (and emitting `的` for `as`), so a handcrafted `fetch-zh-ba` pattern tolerates
  // the `把`/no-marker source and the `的`/作为 responseType. The trailing `put`
  // (emitted `把 X 放置 到 Y`) recovers via the realigned `put-zh-ba` pattern (its
  // verb 放置 + separate 到 marker). See docs-internal/ZH_BLOCK_BODY_SCOPE.md (#3).
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
  function roles(node: unknown): Record<string, unknown> {
    const rec = (node as Record<string, unknown>) ?? {};
    const r = rec.roles;
    if (r instanceof Map) return Object.fromEntries(r);
    return (r as Record<string, unknown>) ?? {};
  }

  it('[zh] parses BA-marked `抓取 把 /api/data` as fetch with source', () => {
    const node = parse('抓取 把 /api/data', 'zh');
    expect(actions(node).has('fetch')).toBe(true);
    expect((roles(node).source as { value?: string })?.value).toBe('/api/data');
  });
  it('[zh] still parses 从-marked `抓取 从 /api/data` as fetch', () => {
    expect(actions(parse('抓取 从 /api/data', 'zh')).has('fetch')).toBe(true);
  });
  it('[zh] parses the `as json` form `抓取 把 /api/data 的 json` (responseType)', () => {
    const node = parse('抓取 把 /api/data 的 json', 'zh');
    expect(actions(node).has('fetch')).toBe(true);
    expect((roles(node).responseType as { raw?: string })?.raw).toBe('json');
  });
  // The trailing put in the BA-split form `把 它 放置 到 #result` must recover.
  it('[zh] parses BA-split put `把 它 放置 到 #result` as put', () => {
    expect(actions(parse('把 它 放置 到 #result', 'zh')).has('put')).toBe(true);
  });
  // Full event block: `on click fetch /api/data then put it into #result` →
  // `当 点击 时 抓取 把 /api/data 那么 把 它 放置 到 #result`. Recovers {on, fetch, put}.
  it('[zh] event block recovers {on, fetch, put} (was degenerate {on})', () => {
    const a = actions(parse('当 点击 时 抓取 把 /api/data 那么 把 它 放置 到 #result', 'zh'));
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  // Same BA-split shape for `set X to Y` → `把 X 设置 到 Y` (verb 设置 + separate
  // 到 marker). This was the residual zh degenerate in `template-literal-list-build`;
  // realigning set-zh-ba to the split form lifts that pattern above the 0.5
  // fidelity threshold (zh cleared from the degenerate list). See #2 in the scope doc.
  it('[zh] parses BA-split set `把 $html 设置 到 ""` as set', () => {
    expect(actions(parse('把 $html 设置 到 ""', 'zh')).has('set')).toBe(true);
  });
  it('[zh] still parses merged `把 x 设置为 5` and bare `设置 x 为 5` as set', () => {
    expect(actions(parse('把 x 设置为 5', 'zh')).has('set')).toBe(true);
    expect(actions(parse('设置 x 为 5', 'zh')).has('set')).toBe(true);
  });
});

describe('he set: accusative-fronted form (קבע את {destination} על {patient})', () => {
  // The i18n grammar transformer emits `קבע את {destination} על {patient}` for
  // `set X to Y` — `את` is the direct-object marker on the variable being set, and
  // `על` ("on"/"to") introduces the value. The generated pattern used the bare
  // profile markers in the opposite arrangement, so the transformed `set` dropped
  // (degenerate he in template-literal-list-build / fetch-json / fetch-do-not-throw).
  // A handcrafted set-he-full pattern maps the accusative form to the correct set
  // roles (destination = the var, patient = the value). See ZH_BLOCK_BODY_SCOPE.md (#2).
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
  function roles(node: unknown): Record<string, unknown> {
    const rec = (node as Record<string, unknown>) ?? {};
    const r = rec.roles;
    if (r instanceof Map) return Object.fromEntries(r);
    return (r as Record<string, unknown>) ?? {};
  }

  it('[he] parses `קבע את $html על ""` as set with correct destination/patient', () => {
    const node = parse('קבע את $html על ""', 'he');
    expect(actions(node).has('set')).toBe(true);
    const r = roles(node);
    expect((r.destination as { value?: string })?.value).toBe('$html');
    expect((r.patient as { value?: string })?.value).toBe('');
  });
  it('[he] parses a property-path target `קבע את #list.innerHTML על $html`', () => {
    const node = parse('קבע את #list.innerHTML על $html', 'he');
    expect(actions(node).has('set')).toBe(true);
    expect((roles(node).destination as { type?: string })?.type).toBe('property-path');
  });
  it('[he] event-block `set` recovers (was the degenerate template-literal residue)', () => {
    // on click set $x to "" → כ-לחיצה ... קבע את $x על ""
    const a = actions(parse('ב לחיצה קבע את $x על "" אז קבע את #out על $x', 'he'));
    expect(a.has('on')).toBe(true);
    expect(a.has('set')).toBe(true);
  });
});

describe('qu / sw set: keyword realignment (set verb ≠ put verb)', () => {
  // The i18n dicts mapped `set` to the *put* verb (qu churay, sw weka), which the
  // semantic profiles read as `put` — so a transformed `set` parsed as `put` (or
  // dropped). Realigned to the real set verbs (qu churanay, sw seti). qu then parses
  // via its generated SOV pattern (`{dest} ta {patient} man churanay`); sw needs a
  // handcrafted `seti {dest} kwa {patient}` (canonical roles). Same family as the zh
  // fetch keyword realign. See ZH_BLOCK_BODY_SCOPE.md (#2 sweep).
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
  function roles(node: unknown): Record<string, unknown> {
    const rec = (node as Record<string, unknown>) ?? {};
    const r = rec.roles;
    if (r instanceof Map) return Object.fromEntries(r);
    return (r as Record<string, unknown>) ?? {};
  }

  it('[qu] parses `$html ta "" man churanay` as set (not put) with canonical roles', () => {
    const node = parse('$html ta "" man churanay', 'qu');
    expect(actions(node).has('set')).toBe(true);
    const r = roles(node);
    expect((r.destination as { value?: string })?.value).toBe('$html');
    expect((r.patient as { value?: string })?.value).toBe('');
  });
  it('[sw] parses `seti $html kwa ""` as set (not put) with canonical roles', () => {
    const node = parse('seti $html kwa ""', 'sw');
    expect(actions(node).has('set')).toBe(true);
    const r = roles(node);
    expect((r.destination as { value?: string })?.value).toBe('$html');
    expect((r.patient as { value?: string })?.value).toBe('');
  });
  it('[sw] handles a property-path target `seti #list.innerHTML kwa $html`', () => {
    const node = parse('seti #list.innerHTML kwa $html', 'sw');
    expect(actions(node).has('set')).toBe(true);
    expect((roles(node).destination as { type?: string })?.type).toBe('property-path');
  });
});

describe('vi set: vào-marked form (gán {destination} vào {patient})', () => {
  // The i18n transformer emits `gán {destination} vào {patient}` for `set X to Y`
  // (`vào` is vi's destination/"into" marker; the variable being set leads). The
  // existing set-vi-full used a different marker (`thành`) and non-canonical roles
  // (var → `patient`), so the transformed `set` dropped (degenerate vi in
  // template-literal-list-build). A set-vi-vao pattern matches the transform and
  // assigns the canonical roles. See ZH_BLOCK_BODY_SCOPE.md (#2 sweep).
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
  function roles(node: unknown): Record<string, unknown> {
    const rec = (node as Record<string, unknown>) ?? {};
    const r = rec.roles;
    if (r instanceof Map) return Object.fromEntries(r);
    return (r as Record<string, unknown>) ?? {};
  }

  it('[vi] parses `gán $html vào ""` as set with correct destination/patient', () => {
    const node = parse('gán $html vào ""', 'vi');
    expect(actions(node).has('set')).toBe(true);
    const r = roles(node);
    expect((r.destination as { value?: string })?.value).toBe('$html');
    expect((r.patient as { value?: string })?.value).toBe('');
  });
  it('[vi] parses a property-path target `gán #list.innerHTML vào $html`', () => {
    const node = parse('gán #list.innerHTML vào $html', 'vi');
    expect(actions(node).has('set')).toBe(true);
    expect((roles(node).destination as { type?: string })?.type).toBe('property-path');
  });
  it('[vi] event-block `set` recovers (was the degenerate template-literal residue)', () => {
    const a = actions(parse('khi nhấp gán $x vào "" rồi gán #out vào $x', 'vi'));
    expect(a.has('on')).toBe(true);
    expect(a.has('set')).toBe(true);
  });
});

describe('ms (Malay) profile: event handler + set + fetch', () => {
  // ms had no i18n grammar profile, so the transformer threw "Unknown target locale:
  // ms" and no Malay could be generated (the baseline's 100% was English fallbacks).
  // Adding malayProfile (mirrors Indonesian) with the `apabila` event head — matching
  // the semantic ms event-handler pattern — plus handcrafted ms set (`tetapkan … ke`)
  // and fetch (`ambil_dari …`) patterns lifts ms to ~97% real parsing with 0
  // degenerate passes. See ZH_BLOCK_BODY_SCOPE.md (#2 sweep / ms profile).
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

  it('[ms] parses an `apabila`-headed event handler with a body command', () => {
    const a = actions(parse('apabila click togol .active', 'ms'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
  it('[ms] parses `tetapkan $x ke 5` as set with canonical roles', () => {
    const node = parse('tetapkan $x ke 5', 'ms');
    expect(actions(node).has('set')).toBe(true);
    const r = node && (node as { roles?: unknown }).roles;
    const roles = r instanceof Map ? Object.fromEntries(r) : (r as Record<string, unknown>);
    expect((roles.destination as { value?: string })?.value).toBe('$x');
  });
  it('[ms] parses `ambil_dari /api/data` as fetch (marker-less source)', () => {
    expect(actions(parse('ambil_dari /api/data', 'ms')).has('fetch')).toBe(true);
  });
  it('[ms] event block recovers {on, fetch}', () => {
    const a = actions(parse('apabila submit ambil_dari /api/data', 'ms'));
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
  });
});

describe('VSO (ar/tl) mid-stream event after a plain leading command', () => {
  // VSO (verb-initial) languages front the verb, so the i18n transformer renders an
  // `on click` handler as `<command> … on click then <body>` — the event clause
  // sits mid-stream after the first command. The parser matched the leading command
  // as a bare standalone (dropping the event + then-chain body): ar/tl `tabs-*`,
  // `accordion-exclusive`, `halt-*`, `copy-to-clipboard`, `form-submit-prevent`,
  // `take-class-from-siblings`. The mid-stream event extractor (already used for the
  // VSO loop path) now also fires on a plain leading command, gated to wordOrder
  // VSO. See ZH_BLOCK_BODY_SCOPE.md / FOR_LOOP_BLOCK_BODY_DESIGN.md context.
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

  it('[ar] recovers {on, remove, add} from a mid-stream event (tabs-basic)', () => {
    const a = actions(parse('احذف .active من .tab عند نقر ثم أضف .active إلى أنا', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
  it('[tl] recovers {on, remove, add} from a mid-stream event (tabs-basic)', () => {
    const a = actions(
      parse('alisin .active mula sa .tab kapag click pagkatapos idagdag .active sa ako', 'tl')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
  it('[ar] recovers {on, halt, toggle} (halt-propagation)', () => {
    const a = actions(parse('أوقف the حدث عند نقر ثم بدل .active', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('halt')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
});

describe('focus command keyword alignment (de/fr/pl/pt/sw)', () => {
  // first-in-parent (`on click focus first <input/> in closest <form/>`) was a
  // degenerate pass in de/fr/pl/pt/sw. Root cause: the i18n `commands` dictionaries
  // were MISSING a `focus` entry, so the transformer fell back to the event-noun
  // form (de `fokus`, fr `focus`, pt `foco`, sw `zingatia`, pl `fokus`) — which the
  // semantic command parser does not recognize (the profile primaries are verbs:
  // fokussieren / focaliser / focar / lenga / skup). The whole `focus …` body
  // dropped, leaving only `{on}` (fidelity 0.33). Spanish was unaffected only
  // because its event-focus word (enfocar) happens to equal its profile primary.
  // Fix: add `focus` to each `commands` dict = the profile primary verb, so the
  // transformer emits a word the parser parses. Clears all 5 (degenerate→faithful,
  // 0.33 → 0.67), un-masks focus in focus-element, and lifts avgFidelity in each.
  // See docs-internal/MULTILINGUAL_ROADMAP.md ("focus keyword alignment").
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

  // Corpus-shaped transformer output (en → lang) for first-in-parent.
  const cases: Array<[string, string]> = [
    ['de', 'bei klick fokussieren erste <input/> in nächste <form/>'],
    ['fr', 'sur clic focaliser premier <input/> en plusproche <form/>'],
    ['pl', 'gdy kliknięcie skup pierwszy <input/> w najbliższy <form/>'],
    ['pt', 'em clique focar primeiro <input/> dentro mais_próximo <form/>'],
    ['sw', 'kwenye bonyeza lenga kwanza <input/> ndani karibu_zaidi <form/>'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers {on, focus} (first-in-parent)`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('on')).toBe(true);
      expect(a.has('focus')).toBe(true);
    });
  }
});

describe('socket command keyword alignment (9 native-primary languages)', () => {
  // socket-basic (`socket ChatSocket ws://localhost:8080 on message put it into
  // #chat end`) was a degenerate pass in ar/bn/hi/ja/ko/pt/qu/sw/tr. Root cause:
  // `socket` (a newer streaming command) had NO entry in the i18n `commands`
  // dictionaries — only en — so the transformer emitted the English literal
  // `socket`. These 9 languages use a NATIVE socket primary in their semantic
  // profile (ja ソケット, ko 소켓, pt soquete, …) that doesn't list the English word,
  // so the `socket` command dropped (fid 0.00). fr/de/es/tl were unaffected because
  // their profile primary already IS `socket`. Fix: add `socket` = the profile
  // native primary to each of the 9 `commands` dicts (and the streaming commands to
  // the derive.ts COMMAND_KEYWORDS allowlist so a regen stays in sync). Clears all 9
  // (degenerate → faithful 1.0; the EN reference for this pattern is just {socket}).
  // Same root-cause family as the focus keyword alignment. See
  // docs-internal/MULTILINGUAL_ROADMAP.md ("socket keyword alignment") and
  // docs-internal/BLOCK_BODY_CONDITION_SCOPE.md (Phase 0).
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

  // Corpus-shaped transformer output (en → lang) for socket-basic, now carrying the
  // native socket primary instead of the English literal. SOV languages front the
  // name/url and put the verb mid-stream; the recovery is order-independent.
  const cases: Array<[string, string]> = [
    ['ar', 'مقبس ChatSocket ws://localhost:8080 ثم عند message ثم ضع هو إلى #chat end'],
    ['bn', 'ChatSocket ws://localhost:8080 কে সকেট তারপর message এ তারপর এটি কে #chat end তে রাখুন'],
    ['hi', 'ChatSocket ws://localhost:8080 को सॉकेट फिर message पर फिर यह को रखें #chat end में'],
    ['ja', 'ChatSocket ws://localhost:8080 を ソケット それから message で それから それ を #chat end に 置く'],
    ['ko', 'ChatSocket ws://localhost:8080 를 소켓 그러면 message 그러면 그것 를 #chat end 에 넣다'],
    ['pt', 'soquete ChatSocket ws://localhost:8080 então em message então colocar isso para #chat end'],
    ['qu', 'ChatSocket ws://localhost:8080 ta tinkina chayqa message pi chayqa chay ta #chat end man churay'],
    ['sw', 'soketi ChatSocket ws://localhost:8080 kisha kwenye message kisha weka hiyo kwa #chat end'],
    ['tr', 'ChatSocket ws://localhost:8080 i soket sonra message de sonra o i #chat end e koy'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers the socket command`, () => {
      expect(actions(parse(input, lang as 'ja')).has('socket')).toBe(true);
    });
  }
});

describe('eventsource / worker profile entries (hi, tl) — Phase 0b', () => {
  // eventsource-basic and worker-basic were degenerate passes in hi and tl. Root
  // cause: unlike socket (a missing i18n DICT entry), these languages' semantic
  // PROFILES had no `eventsource`/`worker` entry at all (the other 22 carry an
  // English-literal primary that matches the transformer's English emission, since
  // no language has an i18n dict entry for these streaming commands). So the
  // generated pattern didn't exist and the command dropped. Fix: add the profile
  // entries (English primary — the transformer emits the English literal — with a
  // native transliteration as alternative for hi). Clears all 4 (degenerate →
  // faithful 1.0; the EN reference for each is just {eventsource}/{worker}). See
  // docs-internal/BLOCK_BODY_CONDITION_SCOPE.md (Phase 0b).
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

  // Corpus-shaped transformer output (en → lang).
  const cases: Array<[string, string, string]> = [
    [
      'hi',
      'eventsource',
      'ChatStream को eventsource /events से फिर message पर फिर यह को रखें #messages end में',
    ],
    [
      'tl',
      'eventsource',
      'eventsource ChatStream mula sa /events pagkatapos kapag message pagkatapos ilagay ito sa #messages end',
    ],
    ['hi', 'worker', 'Calculator def add(a, b) को worker फिर a + b समाप्त समाप्त को लौटाएं'],
    ['tl', 'worker', 'worker Calculator def add(a, b) pagkatapos ibalik a + b wakas wakas'],
  ];

  for (const [lang, command, input] of cases) {
    it(`[${lang}] recovers the ${command} command`, () => {
      expect(actions(parse(input, lang as 'hi')).has(command)).toBe(true);
    });
  }
});

describe('`is empty` predicate keywords (de/sw) — block-body Phase 1a', () => {
  // if-empty (`on blur if my value is empty …`) was degenerate in de,he,ja,ko,sw.
  // Root cause (B1 in BLOCK_BODY_CONDITION_SCOPE.md): control-flow PREDICATES weren't
  // recognized in non-English — only the Spanish profile carried the predicate
  // vocabulary (`is`/`empty`-adjective/`exists`), so only es parsed `is empty`
  // conditionals. The other profiles had `empty` only as the *command* ("empty the
  // element") and no `is` keyword. Fix (Phase 1a): mirror the Spanish predicate
  // vocabulary into the profiles where the translated predicate is adjacent and
  // recognizable — de (`ist leer`) and sw (`ni tupu`): add `is` and the empty
  // ADJECTIVE as an alternative of the empty keyword. The `empty` predicate is now
  // recovered, lifting de/sw if-empty 0.40 → 0.60 (degenerate → faithful). he (the
  // transformer leaves `value is empty` in English) and ja/ko (SOV reorder splits
  // `is`…`empty`) are harder and deferred — see §3 of the scope doc.
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

  // Corpus-shaped transformer output (en → lang) for if-empty.
  const cases: Array<[string, string]> = [
    [
      'de',
      'bei unscharf wenn mein wert ist leer hinzufügen .error zu ich dann setzen "Required" zu nächste .error-message ende',
    ],
    [
      'sw',
      'kwenye poteza_macho kama yangu thamani ni tupu ongeza .error kwa mimi kisha weka "Required" kwa ijayo .error-message mwisho',
    ],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers the empty predicate`, () => {
      expect(actions(parse(input, lang as 'de')).has('empty')).toBe(true);
    });
  }
});

describe('id toggle keyword alignment (unless-condition) — block-body Phase 1b', () => {
  // unless-condition (`on click unless I match .disabled toggle .selected`) was
  // degenerate in id. Probing the "condition" cluster revealed this one is NOT a
  // predicate/conditional issue at all but a hidden `toggle` keyword mismatch: the
  // i18n id dict emitted `ganti` while the semantic indonesian profile's toggle
  // primary is `alihkan` (`ganti` is already swap's alternative there, so it can't
  // be re-used for toggle). So `alihkan`/`ganti` … `toggle` dropped and only `{on}`
  // survived (fid 0.33). Aligning the dict `toggle: 'ganti' → 'alihkan'` lets the
  // body recover past the (still-English) `I match .disabled` predicate: on,toggle
  // (0.33 → 0.67, degenerate → faithful). Same keyword-gap family as focus/socket.
  // The genuinely-hard remaining unless/if cases — he (English predicate) and ja/ko
  // (SOV reorder collapse) — are deeper parser work, see BLOCK_BODY_CONDITION_SCOPE.md.
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

  it('[id] recovers toggle in unless-condition (alihkan)', () => {
    // Corpus-shaped transformer output (en → id).
    const a = actions(parse('pada klik kecuali I match .disabled alihkan .selected', 'id'));
    expect(a.has('toggle')).toBe(true);
  });
});

describe('qu/tl get keyword alignment (get-value) — block-body quick win', () => {
  // get-value (`on click get #input.value then log it`) was degenerate in qu and
  // tl — a masked dict↔profile mismatch (same family as id toggle / focus / socket),
  // NOT a structural bug. The i18n dicts emitted a word the semantic profile's `get`
  // primary doesn't claim:
  //   qu: dict `get: 'chaskiy'` had no profile entry at all (the transformed `get`
  //       dropped; only {on, copy} survived — fid 0.33).
  //   tl: dict `get: 'kuhanin'` is the base of fetch's `kuhanin_mula`, so `get`
  //       dropped (only {log} survived — fid 0.33).
  // Aligning each dict to its profile `get` primary (qu `taripay`, tl `kunin`) lets
  // the body recover: qu {on, get, copy} (0.33 → 0.67), tl {on, get, log} (0.33 → 1.0)
  // — both degenerate → faithful. Degenerate total 76 → 74 (−2), gate green.
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

  it('[qu] recovers get with the profile primary (taripay)', () => {
    // Corpus-shaped transformer output (en → qu), get-value.
    const a = actions(parse('#input.value ta ñitiy pi taripay chayqa chay ta qillqay', 'qu'));
    expect(a.has('get')).toBe(true);
  });

  it('[tl] recovers get with the profile primary (kunin)', () => {
    // Corpus-shaped transformer output (en → tl, VSO), get-value.
    const a = actions(parse('kunin #input.value kapag click pagkatapos itala ito', 'tl'));
    expect(a.has('get')).toBe(true);
  });
});

describe('fr/pt marker-less fetch (async-block / fetch-with-headers) — block-body B3', () => {
  // async-block (`on click async fetch /api/data then put it into me`) and
  // fetch-with-headers were degenerate in fr/pt. The keywords ARE aligned, but for
  // `fetch <url>` (no `from`) the transformer emits a marker-less `récupérer
  // /api/data` / `buscar /api/data`, while the generated pattern requires a `de`
  // source marker (`chercher de …` / `buscar de …`) — so `fetch` dropped and the
  // body collapsed to a phantom `set` (degenerate {on, set}, fid 0.33). A handcrafted
  // fr/pt fetch pattern tolerating the optional `de` + responseType (mirrors fetch-ms /
  // fetch-zh-ba) recovers `fetch`: {on, fetch, set} — fid 0.67, degenerate → faithful
  // (the phantom `set` from `put it into me`'s `à`/`para` marker is harmless to the
  // 0.50 floor). Degenerate total 74 → 70 (−4), gate green.
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

  it('[fr] bare marker-less fetch parses (récupérer /url)', () => {
    expect(actions(parse('récupérer /api/data', 'fr')).has('fetch')).toBe(true);
  });

  it('[pt] bare marker-less fetch parses (buscar /url)', () => {
    expect(actions(parse('buscar /api/data', 'pt')).has('fetch')).toBe(true);
  });

  it('[fr] recovers fetch in async-block', () => {
    // Corpus-shaped transformer output (en → fr), async-block.
    const a = actions(parse('sur clic asynchrone récupérer /api/data alors mettre ça à moi', 'fr'));
    expect(a.has('fetch')).toBe(true);
  });

  it('[pt] recovers fetch in async-block', () => {
    // Corpus-shaped transformer output (en → pt), async-block.
    const a = actions(
      parse('em clique assíncrono buscar /api/data então colocar isso para eu', 'pt')
    );
    expect(a.has('fetch')).toBe(true);
  });
});

describe('marker-less fetch fidelity (es/pl/id/sw/he) — recover dropped fetch', () => {
  // Extends the fr/pt marker-less fetch fix to more languages whose generated fetch
  // pattern requires a source marker (`buscar de …`, `pobierz z …`, …) the transformer
  // doesn't emit for `fetch <url>`. Before the fix these dropped `fetch` and parsed
  // {on, put} (~0.67 — a faithful-but-incomplete pass, not degenerate, so invisible to
  // the degenerate metric). The handcrafted pattern (optional source marker +
  // responseType) recovers `fetch`. avgFidelity ↑ es/he/id/pl +3.4pt, sw +0.6pt
  // (sw event-debounce also flips degenerate → faithful, −1). id additionally accepts
  // the dict verb `ambil` (profile primary `muat`); he accepts the `את` accusative
  // particle (`הבא את /url`) the transformer inserts where the pattern expects `מ`.
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

  // Corpus-shaped transformer output (en → lang), fetch-basic.
  const cases: Array<[string, string]> = [
    ['es', 'en clic buscar /api/data entonces poner ello a #result'],
    ['pl', 'gdy kliknięcie pobierz /api/data wtedy umieść to do #result'],
    ['id', 'pada klik ambil /api/data lalu taruh itu ke #result'],
    ['sw', 'kwenye bonyeza leta /api/data kisha weka hiyo kwa #result'],
    ['he', 'ב לחיצה הבא את /api/data אז שים את זה על #result'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recovers fetch in fetch-basic`, () => {
      expect(actions(parse(input, lang as 'es')).has('fetch')).toBe(true);
    });
  }
});

describe('de `if` keyword alignment (wenn→falls) — conditional wrapper (A1)', () => {
  // The biggest correctness gap is control-flow body parsing; the first tractable
  // slice is a dict↔profile mismatch (id-toggle family). The i18n de dict emitted
  // `wenn` for `if`, but German `wenn` is the profile's `when` keyword (German `wenn`
  // = both "if" and "when"), so a transformed `if` resolved to `when` and the `if`
  // wrapper never formed (`if` + the conditional body dropped). Aligning the dict to
  // the profile's `if` primary (`falls`) forms the conditional: 8 de patterns moved
  // lossy → faithful (input-validation, if-condition, if-matches, event-key-combo,
  // window-keydown, window-scroll, modal-close-backdrop, fetch-error-handling),
  // avgFidelity +0.017, 0 regressions. The other if-dropping languages (reorder-split
  // predicate, he English predicate) remain the deep structural track.
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

  it('[de] forms the if wrapper with `falls` (input-validation → faithful)', () => {
    // Corpus-shaped transformer output (en → de), input-validation.
    const a = actions(
      parse(
        'bei unscharf falls mein wert ist leer hinzufügen .error zu ich sonst entfernen .error von ich ende',
        'de'
      )
    );
    expect(a.has('if')).toBe(true);
  });

  it('[de] the colliding `wenn` resolves to `when`, not `if` (root-cause guard)', () => {
    // `wenn` is the profile's `when` keyword, so the conditional does not form — this
    // is why the dict had to emit `falls`.
    const a = actions(
      parse(
        'bei unscharf wenn mein wert ist leer hinzufügen .error zu ich sonst entfernen .error von ich ende',
        'de'
      )
    );
    expect(a.has('if')).toBe(false);
  });
});

describe('`unless` keyword profile completion (de/es/fr/id/ms/sw) — conditional (A1)', () => {
  // The conditional-keyword sweep found `unless` MISSING from 18 semantic profiles —
  // the i18n dict emits a native unless word (`wennnicht`, `menos`, `saufsi`, …) the
  // profile didn't recognize, so the `unless` wrapper never formed (`unless` dropped,
  // unless-condition lossy). Adding `unless` to the profile (normalized 'unless')
  // recovers it. 6 languages where the predicate is adjacent enough flip
  // unless-condition lossy → faithful (de/es/fr/id/ms/sw), +avgFidelity, 0 regressions.
  // The SOV/VSO + multi-word-keyword languages need deeper reorder/tokenizer work.
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

  // Corpus-shaped transformer output (en → lang), unless-condition.
  const cases: Array<[string, string]> = [
    ['de', 'bei klick wennnicht I match .disabled umschalten .selected'],
    ['es', 'en clic menos I match .disabled alternar .selected'],
    ['fr', 'sur clic saufsi I match .disabled basculer .selected'],
    ['sw', 'kwenye bonyeza isipokuwa I match .disabled badilisha .selected'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recovers unless in unless-condition`, () => {
      expect(actions(parse(input, lang as 'es')).has('unless')).toBe(true);
    });
  }
});

describe('temporal `in` must not swallow a locative `in <scope>` (first-in-parent / B1)', () => {
  // `focus first <input/> in closest <form/>`: the `in closest <form/>` scope was
  // greedily matched by the temporal `in {duration}` idiom (used for `in 2s toggle …`),
  // emitting a phantom `wait`. This corrupted the *English reference* parse
  // ({focus, on, wait}) and made first-in-parent / focus-trap read as lossy in every
  // other language (they correctly parse {focus, on}). A `duration` slot now rejects
  // positional/scope keywords (closest/first/…). +23 languages first-in-parent
  // lossy → faithful, 0 regressions.
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

  it('[en] focus first … in closest … parses {focus, on} (no phantom wait)', () => {
    const a = actions(parse('on click focus first <input/> in closest <form/>', 'en'));
    expect(a.has('focus')).toBe(true);
    expect(a.has('wait')).toBe(false);
  });

  it('[en] the real temporal `in <duration>` idiom still emits wait', () => {
    expect(actions(parse('in 2s toggle .active', 'en')).has('wait')).toBe(true);
  });
});

describe('positional destination — `put X into next <sel>` (B1)', () => {
  // A positional query (`next .y` = `next <selector>`) is captured as an `expression`
  // value. Destination roles restricted to `['selector','reference']` (the generated
  // and handcrafted put patterns) rejected it, so `put X into next .y` dropped the
  // command. Making `expression` type-compatible with selector/reference (like
  // `property-path`) recovers it — fr/pt/id flip if-empty lossy→faithful; +9 langs
  // avgFidelity, 0 regressions. (de `nächste`→`closest` and sw `ijayo` were separate
  // positional-keyword bugs — fixed and locked in the next describe block.)
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

  const cases: Array<[string, string]> = [
    ['es', 'poner "X" a siguiente .y'],
    ['fr', 'mettre "X" à suivant .y'],
    ['pt', 'colocar "X" para próximo .y'],
    ['id', 'taruh "X" ke berikutnya .y'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] put with a positional destination keeps put`, () => {
      expect(actions(parse(input, lang as 'es')).has('put')).toBe(true);
    });
  }

  it('[en] a positional destination still works (regression guard)', () => {
    expect(actions(parse('put "X" into next .y', 'en')).has('put')).toBe(true);
  });
});

describe('de/sw positional keywords — nächste→next, ijayo (B1)', () => {
  // The de/sw tail of the put-positional cluster (#337). Two tokenizer bugs made
  // `put X into next <sel>` fail to parse at all (not just drop the command):
  // - de: GERMAN_EXTRAS listed `nächste` twice (next, then closest). The keyword
  //   map is keyed by native word and insertion is last-wins, so `closest`
  //   shadowed `next` — and `closest` is not in POSITIONAL_KEYWORDS, so
  //   tryMatchPositionalExpression never fired. Removing the duplicate restores
  //   `nächste`→`next`; the locative `in nächste <form/>` scope guard accepts
  //   `next` too (POSITIONAL_OR_SCOPE_KEYWORDS), so first-in-parent is unaffected.
  // - sw: the i18n dict emits `ijayo` for `next` but the tokenizer only knew
  //   `ifuatayo` — `ijayo` is now an additional native variant.
  // de if-empty flips lossy→faithful (avgFid 0.9408→0.9422); sw if-empty recovers
  // `put` (avgFid 0.9339→0.9352); all other languages byte-identical, gate green.
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

  it('[de] put with a nächste (next) destination keeps put', () => {
    expect(actions(parse('setzen "X" zu nächste .y', 'de')).has('put')).toBe(true);
  });

  it('[sw] put with an ijayo (next) destination keeps put', () => {
    expect(actions(parse('weka "X" kwa ijayo .y', 'sw')).has('put')).toBe(true);
  });

  it('[sw] the previously-known ifuatayo variant still works', () => {
    expect(actions(parse('weka "X" kwa ifuatayo .y', 'sw')).has('put')).toBe(true);
  });

  it('[de] locative scope `in nächste <form/>` still parses (first-in-parent guard)', () => {
    const a = actions(parse('bei klick fokussieren erste <input/> in nächste <form/>', 'de'));
    expect(a.has('focus')).toBe(true);
    expect(a.has('on')).toBe(true);
    expect(a.has('wait')).toBe(false);
  });

  it('[de] if-empty then-chain recovers put (corpus-shaped)', () => {
    const a = actions(
      parse(
        'bei unscharf wenn mein wert ist leer hinzufügen .error zu ich dann setzen "Required" zu nächste .error-message ende',
        'de'
      )
    );
    expect(a.has('put')).toBe(true);
  });

  it('[sw] if-empty then-chain recovers put (corpus-shaped)', () => {
    const a = actions(
      parse(
        'kwenye poteza_macho kama yangu thamani ni tupu ongeza .error kwa mimi kisha weka "Required" kwa ijayo .error-message mwisho',
        'sw'
      )
    );
    expect(a.has('put')).toBe(true);
  });
});

describe('zh verb-first 把 tolerance — set/send/trigger (Track C)', () => {
  // For `on click set X to Y` handlers the i18n transformer fronts the verb and
  // marks the LEADING argument with the BA particle (`当 点击 时 设置 把 X 到 Y`):
  // its generic argument parser defaults the leading argument to the patient
  // role and zh marks patient with 把 — even when the leading argument is
  // semantically the destination (set) or event (send/trigger). The generated
  // patterns place no 把 there, and the existing -zh-ba handcrafted patterns
  // cover only the BA-FIRST shape (`把 X 设置 到 Y`), so the verb-first emission
  // failed to parse and the body dropped across ~20 zh corpus patterns (the
  // set-*/send-*/trigger slice of zh's lossy band). New handcrafted patterns
  // (set-zh-vba, send-zh-ba, trigger-zh-ba) tolerate the verb-first 把:
  // zh avgFidelity 0.8916 → 0.9582 (+6.7pt), 20 patterns lossy → faithful,
  // 0 regressions. add/toggle were never affected (their leading argument IS
  // the patient). zh `tell` fails even unmarked — a separate pattern gap, not
  // BA tolerance; left tracked.
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

  // Corpus-shaped transformer emissions (en → zh).
  const cases: Array<[string, string, string]> = [
    ['set-attribute', 'set', '当 点击 时 设置 把 @disabled 到 真'],
    ['set-text-basic', 'set', '当 点击 时 设置 把 #output.innerText 到 "Hello World"'],
    ['set-style', 'set', '当 点击 时 设置 把 我的 *background 到 "red"'],
    ['send-event', 'send', '当 点击 时 发送 把 refresh 到 #widget'],
    ['socket-send', 'send', '当 点击 时 发送 把 "hello" 到 ChatSocket'],
    ['trigger-event', 'trigger', '当 加载 时 触发 把 init'],
  ];
  for (const [pattern, action, input] of cases) {
    it(`[zh] ${pattern} recovers ${action} (verb-first 把)`, () => {
      const a = actions(parse(input, 'zh'));
      expect(a.has(action)).toBe(true);
      expect(a.has('on')).toBe(true);
    });
  }

  it('[zh] unmarked set still parses (regression guard)', () => {
    expect(actions(parse('设置 @disabled 到 真', 'zh')).has('set')).toBe(true);
  });

  it('[zh] BA-first set still parses via set-zh-ba (regression guard)', () => {
    expect(actions(parse('把 @disabled 设置 到 真', 'zh')).has('set')).toBe(true);
  });

  it('[zh] unmarked send/trigger still parse (regression guard)', () => {
    expect(actions(parse('发送 refresh 到 #widget', 'zh')).has('send')).toBe(true);
    expect(actions(parse('触发 init', 'zh')).has('trigger')).toBe(true);
  });
});

describe('append/swap dict keyword alignment (B2a)', () => {
  // The B2 content cluster's keyword-mismatch tail (same family as focus/socket/
  // get/toggle): the i18n dicts emitted a word the semantic profile reads as a
  // DIFFERENT action — or doesn't know at all — so `append`/`swap` dropped:
  // - append parsed as `add` (the dict word IS the add-verb): es añadir,
  //   fr ajouter, it aggiungere, ko 추가, tr ekle
  // - append unrecognized (whole command dropped): id tambah_akhir (splits),
  //   sw ongezaMwisho
  // - swap parsed as `toggle`: ar بدّل; qu rantin_tikray (splits; tikray is
  //   toggle's word)
  // Realigning each dict to the profile primary recovers the true action; all 9
  // flip append-/swap-content lossy → faithful (cross-lang avgFidelity
  // 0.9347 → 0.9360), 0 regressions. Deferred (different mechanisms): the
  // compound-split append group (bn/hi/ms/pl/ru/uk — underscore/space compounds
  // tokenize apart and the embedded add-verb wins), the missing standalone
  // `swap X with Y` pattern (event-body recovery is what parses it today),
  // he `swap` (את particle), zh `swap` (把/用 markers).
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

  // Corpus-shaped transformer emissions with the realigned dict words.
  const appendCases: Array<[string, string]> = [
    ['es', 'en clic anexar "<li>Item</li>" a #list'],
    ['fr', 'sur clic annexer "<li>Item</li>" à #list'],
    ['it', 'su clic accodare "<li>Item</li>" in #list'],
    ['ko', '"<li>Item</li>" 를 클릭 덧붙이다 #list 에'],
    ['tr', '"<li>Item</li>" i tıklama de iliştir #list e'],
    ['id', 'pada klik sisipkan "<li>Item</li>" ke #list'],
    ['sw', 'kwenye bonyeza ambatanisha "<li>Item</li>" kwa #list'],
  ];
  for (const [lang, input] of appendCases) {
    it(`[${lang}] append-content parses the real append action`, () => {
      const a = actions(parse(input, lang as 'es'));
      expect(a.has('append')).toBe(true);
      expect(a.has('add')).toBe(false);
    });
  }

  const swapCases: Array<[string, string]> = [
    ['ar', 'استبدل #a عند نقر بـ#b'],
    ['qu', "#a ta ñitiy pi t'inkuy #b wan"],
  ];
  for (const [lang, input] of swapCases) {
    it(`[${lang}] swap-content parses the real swap action`, () => {
      const a = actions(parse(input, lang as 'ar'));
      expect(a.has('swap')).toBe(true);
      expect(a.has('toggle')).toBe(false);
    });
  }
});

describe('ru/uk scroll command verb + positional query (last-in-collection)', () => {
  // Two stacked gaps kept ru/uk last-in-collection lossy:
  // 1. The dicts had `scroll` only in the EVENTS section (прокрутка — the noun,
  //    correct for `on scroll`), no commands entry — so the transformer fell
  //    back to the noun for the scroll COMMAND, which the parser doesn't read
  //    as a verb (#321 focus family). Fixed by adding commands
  //    scroll: прокрутить (ru) / прокрутити (uk).
  // 2. The tokenizers carried only the feminine/neuter gendered positional
  //    variants — the masculine nominative forms the dict emits (последний /
  //    останній) were never listed, so `last <sel> in <scope>` couldn't form
  //    (fixed in the ru/uk positional-extras PR; enforced by
  //    positional-keyword-drift.test.ts).
  // With both in place last-in-collection parses the full {on, scroll}
  // reference in ru and uk (lossy → faithful, avgFidelity 0.9650 → 0.9683 each).
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

  // Corpus-shaped transformer emissions with the realigned command verb.
  it('[ru] last-in-collection recovers scroll', () => {
    const a = actions(parse('при клик прокрутить в последний <.message/> в #chat', 'ru'));
    expect(a.has('scroll')).toBe(true);
    expect(a.has('on')).toBe(true);
  });

  it('[uk] last-in-collection recovers scroll', () => {
    const a = actions(parse('при клік прокрутити в останній <.message/> у #chat', 'uk'));
    expect(a.has('scroll')).toBe(true);
    expect(a.has('on')).toBe(true);
  });
});
