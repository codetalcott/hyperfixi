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
import { parse, canParse, getTokenizer } from '../src';

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

  /** Walk all conditional nodes and collect their condition raw strings. */
  function conditionRaws(node: unknown, acc: string[] = []): string[] {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    const roles = rec.roles;
    if (roles instanceof Map) {
      const cond = roles.get('condition') as { raw?: string; value?: unknown } | undefined;
      if (cond) acc.push(String(cond.raw ?? cond.value ?? ''));
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => conditionRaws(x, acc));
      else if (c && typeof c === 'object') conditionRaws(c, acc);
    }
    return acc;
  }

  /** Predicate survives either as a folded condition word (normalized
   * `empty`/`null` — the en-reference shape) or as the flat-compromise
   * `empty` command action. */
  function predicateRetained(node: unknown, a: Set<string>): boolean {
    if (a.has('empty')) return true;
    return conditionRaws(node).some(raw => /\b(empty|null)\b/i.test(raw));
  }

  // The semantic profile's `empty` primary is the *verb* (vider/esvaziar/清空/…),
  // but the i18n transformer emits the *adjective* for the `is empty` emptiness
  // check (vide/vazio/空的/…). Without the adjective registered, the condition
  // predicate was silently dropped. The predicate must survive in one of two
  // shapes: since the cross-language conditional fold (buildEventHandler routes
  // a fused `if` action through tryParseConditionalBlock), languages whose
  // copula normalizes to `is` fold the predicate INTO the condition expression
  // (`me valore is empty` — the en-reference shape, see the [en] case in the
  // is-empty cluster below); languages whose copula does not normalize keep the
  // older flat compromise where the adjective parses as the `empty` COMMAND.
  // Either way it must not silently vanish.
  const cases: Array<[string, string]> = [
    ['fr', 'sur flou si mon valeur est vide ajouter .error à moi fin'],
    ['pt', 'em desfoque se meu valor é vazio adicionar .error para eu fim'],
    ['id', 'pada blur jika saya punya nilai adalah kosong tambah .error ke saya akhir'],
    ['zh', '当 失焦 时 如果 我的 值 是 空的 把 添加 .error 到 我 结束'],
    ['pl', 'gdy rozmycie jeśli mój wartość jest pusty dodaj .error do ja koniec'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] recognizes the empty predicate in a conditional`, () => {
      const node = parse(input, lang);
      const a = actions(node);
      expect(a.has('if')).toBe(true);
      expect(a.has('add')).toBe(true);
      expect(predicateRetained(node, a)).toBe(true);
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

describe('SOV verb-final behavior declaration opener — ja/ko/qu/tr (behavior-removable/sortable)', () => {
  // In SOV the `behavior` verb is reordered to the end of the declaration line,
  // after the name + its object marker: `Foo(x) を behavior` (ja), `를` (ko),
  // `ta` (qu), `i` (tr). tryParseBlock only recognized the keyword-LED form
  // (`behavior Foo …`), so the SOV declaration was never routed to
  // parseBehaviorBlock — the whole block fell through to single-statement
  // parsing (kind=compound/event-handler, the `behavior` node + init lost). This
  // was the dominant cause of behavior-removable/sortable degeneracy in
  // ja/ko/qu/tr. tryParseBlock now also detects a `behavior` keyword past index 0
  // with a PascalCase name at index 0, and parseBehaviorBlock takes the keyword
  // index so the name leads and the body starts past the (verb-final) keyword.
  // Transformer output of `behavior Foo(x) init … on click add .a to me end end`.
  const sovBehaviors: Array<[string, string]> = [
    [
      'ja',
      'Foo(x) を behavior\n    init\n        もし x である 未定義\n            x を 設定 私 に\n        終わり\n    終わり\n    クリック で\n        .a を 追加 私 に\n    終わり\n終わり',
    ],
    [
      'ko',
      'Foo(x) 를 behavior\n    init\n        만약 x 이다 정의안됨\n            x 를 설정 나 에\n        끝\n    끝\n    클릭 할 때\n        .a 를 추가 나 에\n    끝\n끝',
    ],
    [
      'qu',
      'Foo(x) ta behavior\n    init\n        sichus x kanqa mana_riqsisqa\n            x ta noqa man churanay\n        tukuy\n    tukuy\n    ñitiy pi\n        .a ta noqa man yapay\n    tukuy\ntukuy',
    ],
    [
      'tr',
      'Foo(x) i behavior\n    init\n        eğer x dir tanımsız\n            x i ayarla ben e\n        son\n    son\n    tıklama de\n        .a i ekle ben e\n    son\nson',
    ],
  ];
  for (const [lang, input] of sovBehaviors) {
    it(`[${lang}] SOV verb-final declaration parses as a behavior block`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      // Routed to parseBehaviorBlock — recognized as a behavior, not a stray
      // compound/event-handler with the keyword stranded.
      expect(node.kind).toBe('behavior');
      expect(node.name).toBe('Foo');
      // The handler (with its `add`) is recovered, not swallowed by the head.
      const handlers = node.eventHandlers as Array<unknown> | undefined;
      expect(Array.isArray(handlers) && handlers.length).toBeGreaterThan(0);
    });
  }
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
    [
      'bn',
      'ChatSocket ws://localhost:8080 কে সকেট তারপর message এ তারপর এটি কে #chat end তে রাখুন',
    ],
    ['hi', 'ChatSocket ws://localhost:8080 को सॉकेट फिर message पर फिर यह को रखें #chat end में'],
    [
      'ja',
      'ChatSocket ws://localhost:8080 を ソケット それから message で それから それ を #chat end に 置く',
    ],
    [
      'ko',
      'ChatSocket ws://localhost:8080 를 소켓 그러면 message 그러면 그것 를 #chat end 에 넣다',
    ],
    [
      'pt',
      'soquete ChatSocket ws://localhost:8080 então em message então colocar isso para #chat end',
    ],
    [
      'qu',
      'ChatSocket ws://localhost:8080 ta tinkina chayqa message pi chayqa chay ta #chat end man churay',
    ],
    [
      'sw',
      'soketi ChatSocket ws://localhost:8080 kisha kwenye message kisha weka hiyo kwa #chat end',
    ],
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
    // id dict realigned fetch ambil→muat (ambil is take's word; once the fused
    // take-event pattern came alive it claimed every ambil-fetch — the de
    // holen/abrufen class). The emission is now muat.
    ['id', 'pada klik muat /api/data lalu taruh itu ke #result'],
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

describe('compound-split append — ru/uk dict realign + pl handcrafted collision (B2b)', () => {
  // The compound-split tail of the B2a append cluster. Three languages where
  // append-content stayed lossy AFTER the B2a realigns, for two reasons:
  // - ru/uk: dict and profile AGREED on an underscore compound
  //   (добавить_в_конец / додати_в_кінець), but the tokenizer splits it and the
  //   embedded add-verb wins — the same splitting that broke ms tambah_hujung.
  //   Realigned the dicts to the profiles' single-word ALTERNATIVE
  //   (дописать / дописати), which parses as append directly.
  // - pl: dict, profile, and tokenizer all agree dołącz = append — but the
  //   HANDCRAFTED add-pl-full/add-pl-simple patterns listed dołącz/dolacz as
  //   add-verb alternatives (predating the profile's append entry), and the
  //   higher-priority handcrafted match shadowed the generated append pattern.
  //   Removed the stale alternatives.
  // pl/ru/uk append-content lossy → faithful; cross-lang avgFidelity
  // 0.9392 → 0.9397; 0 regressions. Remaining compound-split append languages
  // (bn শেষে যোগ, hi जोड़ें_अंत) got new single-word native vocabulary in the
  // B2c follow-up below; ms tambah_hujung turned out fine (the ms tokenizer's
  // word-chars include '_', so the compound matches whole).
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
    ['ru', 'при клик дописать "<li>Item</li>" в #list'],
    ['uk', 'при клік дописати "<li>Item</li>" в #list'],
    ['pl', 'gdy kliknięcie dołącz "<li>Item</li>" do #list'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] append-content parses the real append action`, () => {
      const a = actions(parse(input, lang as 'ru'));
      expect(a.has('append')).toBe(true);
      expect(a.has('add')).toBe(false);
    });
  }

  it('[pl] plain add still parses (regression guard)', () => {
    expect(actions(parse('dodaj .highlight do #item', 'pl')).has('add')).toBe(true);
  });
});

describe('Generated swap patterns match the transformer emission shape (swap pattern gap)', () => {
  // The swap-content mystery: NO generated swap pattern matched any transformer
  // output, in any language. swapSchema's destination carried the profile's
  // destination preposition (es `intercambiar en #a`), but the i18n transformer
  // emits the element-swap shape with an UNMARKED destination and a with-marked
  // patient (`intercambiar #a con #b` — en source `swap #a with #b`). The
  // faithful languages only survived via side paths: de/ru/sw/th/uk/vi through
  // the fused `swap-event-*-vso` pattern (their event-marker emission happens to
  // match the pattern's primary), it through event-handler-it-full's {action}
  // role (the captured verb becomes the command node directly). Languages whose
  // handcrafted event pattern captures only {event} (es/fr/pl/id/ms/zh) or whose
  // generic on-pattern wins (pt/he) re-parse the body with command patterns —
  // where the dead generated swap pattern failed, silently dropping `swap`.
  //
  // Fix: swapSchema destination/patient markerOverride now mirror the emission
  // shape for SVO languages — bare destination after the verb (he marks it את,
  // zh 把) and the language's with-word before the patient. Flips swap-content
  // lossy → faithful in es/fr/he/id/ms/pl/pt/zh (8 instances, avgFidelity
  // +0.0033 each); 0 regressions. Deferred (separate mechanisms): hi (dict emits
  // बदलें, which parses as toggle — keyword-collision family), SOV/VSO languages
  // (already faithful via fused event patterns; sovPosition order unchanged).
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

  // Standalone bodies (then-chain / event-body re-parse shape). These parsed as
  // NOTHING before the fix — the generated pattern could never match.
  const standalone: Array<[string, string]> = [
    ['es', 'intercambiar #a con #b'],
    ['fr', 'échanger #a avec #b'],
    ['pt', 'trocar #a com #b'],
    ['pl', 'zamień #a z #b'],
    ['id', 'tukar #a dengan #b'],
    ['ms', 'tukar_tempat #a dengan #b'],
    ['he', 'החלף את #a עם #b'],
    ['zh', '交换 把 #a 用 #b'],
  ];
  for (const [lang, input] of standalone) {
    it(`[${lang}] standalone "swap X with Y" parses as swap`, () => {
      expect(parse(input, lang as 'es').action).toBe('swap');
    });
  }

  // Full corpus emissions (en: `on click swap #a with #b`) — the handler body
  // must keep the swap action (this is the lossy→faithful flip).
  const fullHandlers: Array<[string, string]> = [
    ['es', 'en clic intercambiar #a con #b'],
    ['fr', 'sur clic échanger #a avec #b'],
    ['pt', 'em clique trocar #a com #b'],
    ['pl', 'gdy kliknięcie zamień #a z #b'],
    ['id', 'pada klik tukar #a dengan #b'],
    ['ms', 'apabila click tukar_tempat #a dengan #b'],
    ['he', 'ב לחיצה החלף את #a עם #b'],
    ['zh', '当 点击 时 交换 把 #a 用 #b'],
  ];
  for (const [lang, input] of fullHandlers) {
    it(`[${lang}] swap-content handler keeps the swap action`, () => {
      const a = actions(parse(input, lang as 'es'));
      expect(a.has('on')).toBe(true);
      expect(a.has('swap')).toBe(true);
    });
  }

  // Regression guards.
  it('[pt] alternar still parses as toggle (trocar belongs to swap now)', () => {
    expect(parse('alternar .active', 'pt').action).toBe('toggle');
    // trocar is the pt profile/dict swap primary — the stale toggle reading is gone.
    expect(parse('trocar .visible', 'pt').action).toBe('swap');
  });

  it('[en] the en swap forms are unchanged', () => {
    expect(parse('swap #a with #b', 'en').action).toBe('swap');
    const a = actions(parse('on click swap #a with #b', 'en'));
    expect(a.has('on')).toBe(true);
    expect(a.has('swap')).toBe(true);
  });

  it('[de/ru] previously-faithful fused-event languages stay faithful', () => {
    for (const [lang, input] of [
      ['de', 'bei klick tauschen #a mit #b'],
      ['ru', 'при клик поменять #a с #b'],
    ] as Array<[string, string]>) {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('on')).toBe(true);
      expect(a.has('swap')).toBe(true);
    }
  });
});

describe('bn/hi single-word append + hi swap vocabulary (B2c)', () => {
  // The compound-split tail of the B2 append/swap clusters that needed NEW
  // native vocabulary (not a realign — neither side had a workable word):
  // - bn append 'শেষে যোগ' (multi-word): শেষে reads as `end`, যোগ as `add`,
  //   so bn append-content always parsed as add. New primary: জুড়ুন
  //   (attach/join, imperative — matches the রাখুন/নিন verb style).
  // - hi append 'जोड़ें_अंत' (underscore compound): splits, embedded जोड़ें
  //   (`add`) wins. New primary: संलग्न (attach/append).
  // - hi swap: dict emitted bare बदलें, a TOGGLE alternative; the profile's
  //   'बदलें_स्थान' compound splits to the same collision. New primary:
  //   विनिमय (exchange). This was the last lossy swap-content — the command
  //   is now faithful in 23/23 languages.
  // Profile + dict updated together (the tokenizers auto-register profile
  // keywords). bn +1 / hi +2 patterns lossy → faithful; 0 regressions.
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

  // Corpus-shaped transformer emissions with the new vocabulary.
  it('[bn] append-content parses the real append action (was add)', () => {
    const a = actions(parse('"<li>Item</li>" কে ক্লিক এ জুড়ুন #list তে', 'bn'));
    expect(a.has('append')).toBe(true);
    expect(a.has('add')).toBe(false);
  });

  it('[hi] append-content parses the real append action (was add)', () => {
    const a = actions(parse('"<li>Item</li>" को क्लिक पर संलग्न #list में', 'hi'));
    expect(a.has('append')).toBe(true);
    expect(a.has('add')).toBe(false);
  });

  it('[hi] swap-content parses the real swap action (was toggle)', () => {
    const a = actions(parse('#a को क्लिक पर विनिमय #b से', 'hi'));
    expect(a.has('swap')).toBe(true);
    expect(a.has('toggle')).toBe(false);
  });

  // Regression guards: the plain add/toggle verbs are untouched.
  it('[bn] plain add still parses (যোগ)', () => {
    expect(actions(parse('.highlight কে ক্লিক এ যোগ #item তে', 'bn')).has('add')).toBe(true);
  });
  it('[hi] plain add and toggle still parse (जोड़ें / टॉगल)', () => {
    expect(actions(parse('.highlight को क्लिक पर जोड़ें #item में', 'hi')).has('add')).toBe(true);
    expect(actions(parse('.active को क्लिक पर टॉगल', 'hi')).has('toggle')).toBe(true);
  });
});

describe('it focus verb + pt halt/break cross-map (focus-trap residuals)', () => {
  // Two dict-side residuals surfaced by the #349 span-mask fix (which exposed
  // the focus-trap body to translation for the first time):
  // - it: the dict's COMMANDS section had no focus verb, so the transformer
  //   fell back to the EVENTS noun (fuoco) — the #321/#344 noun-where-verb
  //   family. The generated focus patterns match the profile primary literal
  //   (focalizzare), so the command dropped. Added commands focus: focalizzare.
  // - pt: halt/break were CROSS-MAPPED (dict break: parar / halt: interromper,
  //   while profile+tokenizer read parar=halt, interromper=break). Every halt
  //   emission parsed as break — poisoning dropdown-toggle, halt-propagation,
  //   if-matches, window-keydown (all lossy → faithful, pt avgFidelity
  //   0.9300 → 0.9411) plus the focus-trap tail.
  // it/pt focus-trap 0.5 → 0.75 (the remaining 0.25 is the dropped `if`, the
  // M2 body-parse mechanism — tracked separately).
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

  it('[it] the transformed focus-trap body keeps focus + halt', () => {
    const a = actions(
      parse(
        'su keydown[key=="Tab"] da .modal se obiettivo corrisponde ultimo <button/> in .modal focalizzare primo <button/> in .modal allora fermare fine',
        'it'
      )
    );
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[pt] the transformed focus-trap body keeps focus + halt (parar)', () => {
    const a = actions(
      parse(
        'em keydown[key=="Tab"] de .modal se alvo corresponde último <button/> dentro .modal focar primeiro <button/> dentro .modal então parar fim',
        'pt'
      )
    );
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[pt] halt-propagation shape parses parar as halt (was break)', () => {
    const a = actions(parse('em clique parar the evento', 'pt'));
    expect(a.has('halt')).toBe(true);
    expect(a.has('break')).toBe(false);
  });

  it('[it] the focus EVENT still works via the noun (fuoco unchanged in events)', () => {
    const a = actions(parse('su fuoco aggiungere .active a io', 'it'));
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
});

describe('eventMarker emission alignment — fused patterns come alive (es/fr/it/pt/pl/id/ms)', () => {
  // The generalization of the #346 swap recovery split: the i18n transformer
  // leads event handlers with the profile's eventHandler.KEYWORD word (es en,
  // fr sur, it su, pt em, pl gdy, id pada, ms apabila), but the generated
  // fused `<cmd>-event-<lang>-vso` patterns anchor on eventHandler.EVENTMARKER,
  // which didn't include it — so every fused event pattern was DEAD in these
  // languages (ms generated none at all: no eventMarker). Bodies fell to
  // handcrafted event patterns + re-parse, which drops if-blocks and other
  // structures. Adding the emission word as an eventMarker alternative (and
  // giving ms an eventMarker) brought the whole fused family alive:
  // if-exists/if-condition/if-matches (pl), tell-command/tell-other-element +
  // modal-close-backdrop (all 6), caret-var-on-target (fr/pt), get-value/
  // hide-with-transition (ms) flip lossy → faithful. 26 pattern-instances,
  // +0.0084..+0.0120 avgFidelity each, 1 within-tolerance regression
  // (ms make-toast-element — transformer emission shape change, follow-up).
  //
  // Surfaced collision (bundled, #345 precedent): id dict emitted ambil for
  // fetch, but ambil is take's word — dead while the fused take pattern
  // couldn't match, every id fetch became take once it could (the de
  // holen/abrufen class). id dict realigned fetch → muat (profile primary).
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

  // The if-recovery this unlocks: a fused if-event pattern now anchors the
  // handler, keeping the if + branch + juxtaposed tail (was {focus,halt,on}
  // with if dropped, or worse).
  const ifCases: Array<[string, string]> = [
    ['es', 'en clic si objetivo coincide .x enfocar #y entonces detener fin'],
    ['fr', 'sur clic si cible correspond .x focaliser #y alors stopper fin'],
    ['pt', 'em clique se alvo corresponde .x focar #y então parar fim'],
    ['pl', 'gdy kliknięcie jeśli cel pasuje .x skup #y wtedy zatrzymaj koniec'],
    ['id', 'pada klik jika target cocok .x fokus #y lalu berhenti akhir'],
    ['ms', 'apabila klik jika sasaran sepadan .x fokus #y kemudian henti tamat'],
  ];
  for (const [lang, input] of ifCases) {
    it(`[${lang}] emission-led if handler keeps if + branch + tail`, () => {
      const a = actions(parse(input, lang as 'es'));
      expect(a.has('on')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('focus')).toBe(true);
      expect(a.has('halt')).toBe(true);
    });
  }

  // id fetch realign: muat is fetch, ambil stays take.
  it('[id] fetch-basic emission parses fetch + put (muat)', () => {
    const a = actions(parse('pada klik muat /api/data lalu taruh itu ke #result', 'id'));
    expect(a.has('fetch')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('take')).toBe(false);
  });
  it('[id] ambil still parses as take', () => {
    const a = actions(parse('pada klik ambil .item dari #list', 'id'));
    expect(a.has('take')).toBe(true);
    expect(a.has('fetch')).toBe(false);
  });

  // Regression guards: simple handlers parse the same action set as before
  // (now via fused patterns), and then-chains stay complete.
  it('[es] simple toggle handler unchanged', () => {
    expect([...actions(parse('en clic alternar .active', 'es'))].sort()).toEqual(['on', 'toggle']);
  });
  it('[es] fetch-loading-state then-chain stays complete', () => {
    const a = actions(
      parse(
        'en clic añadir .loading a mí entonces buscar /api/data entonces quitar .loading de mí entonces poner ello a #result',
        'es'
      )
    );
    expect(a.has('add')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('put')).toBe(true);
  });
});

describe('event-head tolerance — bracket key-filter + source clause (focus-trap)', () => {
  // The fused `<cmd>-event-*-vso` patterns (alive since the #351 eventMarker
  // alignment) expect the wrapped command's verb right after the `{event}`
  // role. But the tokenizer splits `keydown[key=="Tab"]` into TWO tokens
  // (`keydown` + a `[key=="Tab"]` selector), and the corpus emission also
  // carries a source clause (`von .modal` / `de .modal`). Either one broke the
  // fused match, so focus-trap fell to the plain event pattern whose body
  // re-parse drops the `if` wrapper (0.75). The matcher's event role now
  // consumes a trailing `[…]` selector (folded back onto the event value —
  // mirroring the bracket-filter skip in the SOV/mid-stream extractors) and a
  // `<source-marker> <element>` pair (skipped when the pattern explicitly
  // expects the marker next, so handcrafted `… von {source}` patterns keep
  // working). focus-trap flips lossy → faithful in 11 languages
  // (de/es/fr/he/id/it/ms/pt/ru/th/vi, + it blur-element), lossy 337 → 325,
  // 0 regressions. sw (mwisho→end condition polysemy), tr (SOV head shape),
  // and ar (VSO if-before-event reorder) are separate mechanisms, tracked.
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

  // Corpus-shaped transformer output (en → lang), focus-trap:
  // `on keydown[key=="Tab"] from .modal if target matches last <button/> in
  //  .modal focus first <button/> in .modal halt end`
  const corpus: Array<[string, string]> = [
    [
      'de',
      'bei keydown[key=="Tab"] von .modal falls ziel passt letzte <button/> in .modal fokussieren erste <button/> in .modal dann anhalten ende',
    ],
    [
      'it',
      'su keydown[key=="Tab"] da .modal se obiettivo corrisponde ultimo <button/> in .modal focalizzare primo <button/> in .modal allora fermare fine',
    ],
    [
      'es',
      'en keydown[key=="Tab"] de .modal si objetivo coincide último <button/> en .modal enfocar primero <button/> en .modal entonces detener fin',
    ],
    [
      'fr',
      'sur keydown[key=="Tab"] de .modal si cible correspond dernier <button/> en .modal focaliser premier <button/> en .modal alors stopper fin',
    ],
    [
      'pt',
      'em keydown[key=="Tab"] de .modal se alvo corresponde último <button/> dentro .modal focar primeiro <button/> dentro .modal então parar fim',
    ],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] focus-trap keeps the if wrapper (was {focus,halt,on})`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('on')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('focus')).toBe(true);
      expect(a.has('halt')).toBe(true);
    });
  }

  // Each head element alone used to break the fused match (the bisect).
  it('[de] the bracket filter alone no longer breaks the fused if-event match', () => {
    const a = actions(
      parse(
        'bei keydown[key=="Tab"] falls ziel passt letzte <button/> in .modal fokussieren erste <button/> in .modal dann anhalten ende',
        'de'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
  });
  it('[de] the source clause alone no longer breaks the fused if-event match', () => {
    const a = actions(
      parse(
        'bei klick von .modal falls ziel passt letzte <button/> in .modal fokussieren erste <button/> in .modal dann anhalten ende',
        'de'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
  });

  // Regression guards.
  it('[de] the handcrafted `bei {event} von {source}` pattern still parses', () => {
    // The source-clause consumption is gated on the next pattern token, so the
    // explicit-source handcrafted pattern (or its base sibling) still wins and
    // the handler keeps its body.
    const a = actions(parse('bei klick von .modal umschalten .active', 'de'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on keydown[key=="Tab"] from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['focus', 'halt', 'if', 'on']);
  });
  it('[es] a simple unfiltered handler is unaffected', () => {
    expect([...actions(parse('en clic alternar .active', 'es'))].sort()).toEqual(['on', 'toggle']);
  });
});

describe('sw positional keywords — wamwisho (last) / kwanza / iliyopita', () => {
  // The sw tail of the focus-trap campaign. The i18n sw dict emitted 'mwisho'
  // for positional `last`, but 'mwisho' is the END keyword (block terminator;
  // the keyword map is last-wins), so `… inafanana mwisho <button/>` read as a
  // premature block-end and the whole branch body dropped (focus-trap stuck at
  // {if,on} after #352 fixed the event head). The dict now emits the distinct
  // concatenated adjective 'wamwisho' (wa mwisho — the saufsi/wennnicht/enyakın
  // single-token class), which the tokenizer reads as `last`. Bundled (same
  // dict↔tokenizer realign mechanism, #338 ijayo class): 'kwanza' → first and
  // 'iliyopita' → previous tokenizer entries replace the dead multi-word
  // 'wa kwanza'/'wa mwisho' entries. sw focus-trap + input-clear flip
  // lossy → faithful (sw avgFidelity 0.9408 → 0.9474); three KNOWN_DRIFT
  // entries removed (sw:first, sw:last, sw:previous — the list only shrinks).
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

  it('[sw] focus-trap keeps the full body (was {if,on} — mwisho killed the branch)', () => {
    // Corpus-shaped transformer output (en → sw) with the realigned emission.
    const a = actions(
      parse(
        'kwenye keydown[key=="Tab"] kutoka .modal kama lengo inafanana wamwisho <button/> ndani .modal lenga kwanza <button/> ndani .modal kisha simama mwisho',
        'sw'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[sw] the root cause stays locked: mwisho in the condition kills the branch', () => {
    // 'mwisho' is the block terminator — this is WHY the dict had to emit
    // wamwisho. If this starts passing, the polysemy was resolved another way
    // and the dict emission can be reconsidered.
    const a = actions(
      parse(
        'kwenye bonyeza kama lengo inafanana mwisho <button/> ndani .modal lenga kwanza <button/> ndani .modal kisha simama mwisho',
        'sw'
      )
    );
    expect(a.has('focus')).toBe(false);
  });

  it('[sw] mwisho still terminates a block (end reading unchanged)', () => {
    // repeat-while corpus shape — trailing mwisho is the real end.
    const a = actions(
      parse(
        'kwenye bonyeza rudia wakati #counter.innerText < 10 kisha ongezeko #counter kisha ngoja 200ms mwisho',
        'sw'
      )
    );
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });

  it('[sw] put into a wamwisho (last) destination keeps put', () => {
    expect(actions(parse('weka "X" kwa wamwisho .y', 'sw')).has('put')).toBe(true);
  });

  it('[sw] put into an iliyopita (previous) destination keeps put', () => {
    expect(actions(parse('weka "X" kwa iliyopita .y', 'sw')).has('put')).toBe(true);
  });

  it('[sw] first-in-parent still parses (kwanza now a real positional)', () => {
    const a = actions(
      parse('kwenye bonyeza lenga kwanza <input/> ndani karibu_zaidi <form/>', 'sw')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('focus')).toBe(true);
  });
});

describe('event-head source clause — profile markers, both orders (focus-trap pl/uk/zh/bn/hi)', () => {
  // The #352 event-head tolerance recognized a source clause only by token
  // normalization (`normalized === 'source'`) and only in the prepositional
  // order directly after the event role. But the source markers normalize
  // inconsistently across tokenizers (pl z / uk з → 'style'!; ja から, ko 에서,
  // bn থেকে, hi से, zh 从 carry no normalization), and SOV emissions are
  // postpositional AND put the clause after the event-marker literal
  // (`keydown[…] de .modal den eğer …`), out of the event role's reach.
  //
  // matchTokenSequence now opens a 2-pattern-token window after the event role
  // in which a source clause — recognized via the profile's roleMarkers.source
  // (primary + alternatives, honoring its position) — is consumed before a
  // literal the clause would otherwise block. Gated: only when the upcoming
  // literal does NOT match the stream position (a pattern with an explicit
  // `von {source}` slot is untouched), and a failed match still resets the
  // stream. focus-trap flips lossy → faithful in pl/uk/zh/bn/hi (lossy
  // 323 → 318, 0 regressions). tr's head now matches too (its remaining drop
  // is the son/end polysemy — next PR); ja/ko have no fused if pattern to
  // anchor (the A3 SOV slice); tl is the trailing-event path; ar is the VSO
  // reorder. All tracked.
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

  // Corpus-shaped transformer output (en → lang), focus-trap.
  const corpus: Array<[string, string]> = [
    [
      'pl',
      'gdy keydown[key=="Tab"] z .modal jeśli cel pasuje ostatni <button/> w .modal skup pierwszy <button/> w .modal wtedy zatrzymaj koniec',
    ],
    [
      'uk',
      'при keydown[key=="Tab"] з .modal якщо ціль відповідає останній <button/> у .modal сфокусувати перший <button/> у .modal тоді зупинити кінець',
    ],
    [
      'zh',
      '当 keydown[key=="Tab"] 从 .modal 如果 目标 匹配 最后一个 <button/> 在 .modal 聚焦 把 第一个 <button/> 在 .modal 那么 停止 结束',
    ],
    [
      'bn',
      'keydown[key=="Tab"] এ .modal থেকে যদি লক্ষ্য matches শেষ <button/> এ .modal প্রথম <button/> এ .modal কে ফোকাস তারপর থামুন শেষ',
    ],
    [
      'hi',
      'keydown[key=="Tab"] पर .modal से अगर लक्ष्य मेल_खाता अंतिम <button/> में .modal पहला <button/> में .modal को फोकस फिर रोकें समाप्त',
    ],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] focus-trap keeps the if wrapper (source clause consumed)`, () => {
      const a = actions(parse(input, lang as 'pl'));
      expect(a.has('on')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('focus')).toBe(true);
      expect(a.has('halt')).toBe(true);
    });
  }

  // tr: the postpositional clause after the event-marker literal now parses —
  // the fused if pattern anchors (the body's son/end drop is a separate
  // mechanism, locked when the dict realign lands).
  it('[tr] the SOV head with postpositional source anchors the fused if pattern', () => {
    const a = actions(
      parse(
        'keydown[key=="Tab"] de .modal den eğer hedef eşleşir ilk <button/> içinde .modal ilk <button/> içinde .modal i odak sonra durdur son',
        'tr'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  // Regression guards.
  it('[pl] a handler without a source clause is unchanged', () => {
    const a = actions(parse('gdy kliknięcie przełącz .active', 'pl'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
  it('[de] the explicit-source handcrafted pattern still parses', () => {
    const a = actions(parse('bei klick von .modal umschalten .active', 'de'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on keydown[key=="Tab"] from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['focus', 'halt', 'if', 'on']);
  });
});

describe('tr positional last — sonuncu (son doubles as the end keyword)', () => {
  // The tr twin of the sw wamwisho fix. The tr dict emitted 'son' for BOTH the
  // END keyword and positional `last`; the parser's end-recognizers match by
  // value, so a positional condition (`eşleşir son <button/>`) terminated the
  // enclosing block mid-condition and the branch body dropped (focus-trap
  // stuck at {if,on} after #354 anchored the SOV head). The dict now emits
  // 'sonuncu' ("the last one") for positional last; 'son' stays the block
  // terminator. tr focus-trap flips lossy → faithful (0.9443 → 0.9476); every
  // other language byte-identical.
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

  it('[tr] focus-trap keeps the full body (was {if,on} — son killed the branch)', () => {
    // Corpus-shaped transformer output (en → tr) with the realigned emission.
    const a = actions(
      parse(
        'keydown[key=="Tab"] de .modal den eğer hedef eşleşir sonuncu <button/> içinde .modal ilk <button/> içinde .modal i odak sonra durdur son',
        'tr'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[tr] the root cause stays locked: son in the condition kills the branch', () => {
    // 'son' is matched by the end-recognizers by value — this is WHY the dict
    // had to emit sonuncu for positional last.
    const a = actions(
      parse(
        'keydown[key=="Tab"] de .modal den eğer hedef eşleşir son <button/> içinde .modal ilk <button/> içinde .modal i odak sonra durdur son',
        'tr'
      )
    );
    expect(a.has('focus')).toBe(false);
  });

  it('[tr] trailing then-chains with body verbs still parse (end reading unchanged)', () => {
    // event-once shape from the SOV reorder lock tests — unchanged behavior.
    const a = actions(
      parse('once .initialized i tıklama de ekle ben e sonra setup() i çağır', 'tr')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('call')).toBe(true);
  });

  it('[tr] put into a sonuncu (last) destination keeps put', () => {
    expect(actions(parse('o i sonuncu .y e koy', 'tr')).has('put')).toBe(true);
  });
});

describe('possessive property is never a normalized structural keyword (ms make-toast)', () => {
  // ms make-toast-element went faithful→0.67 in #351 (accepted within
  // tolerance) — once ms had an eventMarker, the fused make pattern anchored
  // and the body re-parse hit `letak 'Saved!' ke ia kemudian …`. The
  // possessive matcher read `ia kemudian` as "its kemudian" (ms `ia` = it/its;
  // `kemudian` passed the structural-keyword check because that check used the
  // raw VALUE against an English set) — forming a phantom property-path whose
  // destination type-check failed the whole put pattern. The body's put
  // silently dropped whenever ANY clause followed it. The check now also
  // rejects a property token whose NORMALIZED form is structural
  // (kemudian→then, tamat→end). ms make-toast-element lossy → faithful
  // (0.9357 → 0.9379); every other language byte-identical.
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

  it('[ms] make-toast-element keeps the put (was dropped by the phantom possessive)', () => {
    // Corpus-shaped transformer output (en → ms).
    const a = actions(
      parse(
        "apabila click buat a <div.toast/> kemudian letak 'Saved!' ke ia kemudian letak ia di tamat daripada badan",
        'ms'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('make')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  it('[ms] a then-chained put with an it-destination keeps later clauses', () => {
    const a = actions(
      parse(
        "apabila click buat a <div.toast/> kemudian letak 'Saved!' ke ia kemudian togol .x",
        'ms'
      )
    );
    expect(a.has('put')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });

  it('[en] a real possessive property still parses (my value)', () => {
    const a = actions(parse('put my value into #out', 'en'));
    expect(a.has('put')).toBe(true);
  });

  it('[ms] a real ia-possessive property still parses', () => {
    // `ia innerHTML` — identifier property, unaffected by the structural gate.
    const a = actions(parse('letak ia innerHTML ke #out', 'ms'));
    expect(a.has('put')).toBe(true);
  });
});

describe('generated if/unless condition accepts reference + selector conditions (universal if drop)', () => {
  // The single largest lossy cluster (#357): every non-en language dropped the
  // `if` from body clauses like `si ello establecer $users a ello fin`
  // (fetch-do-not-throw, 22 langs) and `si resultado es falso registrar …`
  // (form-submit-prevent, 22 langs). The en handcrafted if/unless patterns
  // accept condition expectedTypes ['expression','reference','selector'], but
  // ifSchema/unlessSchema — the source of every GENERATED `if-<lang>-*` /
  // `unless-<lang>-*` pattern — declared ['expression'] only. A bare reference
  // condition (`ello`/`it`/`оно`) failed the role type-check, the if pattern
  // never matched inside parseClause, and the clause's tokens were skipped
  // until the next verb — keeping the body command but silently losing the
  // wrapper. Widening the two schemas to mirror the en handcrafted set flips
  // fetch-do-not-throw to 17/22 and form-submit-prevent to 19/22 faithful
  // (avgFidelity 0.9495 → 0.9525, lossy 316 → 275, 0 regressions).
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

  it('[es] fetch-do-not-throw keeps the if wrapper (reference condition `ello`)', () => {
    // Corpus-shaped transformer output (en → es).
    const a = actions(
      parse(
        'en clic buscar /api/users como JSON do no lanzar entonces si ello establecer $users a ello fin',
        'es'
      )
    );
    expect(a.has('fetch')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[es] form-submit-prevent keeps the if wrapper (expression condition)', () => {
    const a = actions(
      parse(
        'en enviar detener the evento llamar validateForm() si resultado es falso registrar "Invalid form" fin',
        'es'
      )
    );
    expect(a.has('halt')).toBe(true);
    expect(a.has('call')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('log')).toBe(true);
  });

  it('[ru] the if wrapper survives a reference condition in a then-chain', () => {
    const a = actions(
      parse(
        'при клик получать /api/users как JSON do не бросать затем если оно установить $users в оно конец',
        'ru'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse('on click fetch /api/users as JSON do not throw then if it set $users to it end', 'en')
    );
    expect([...a].sort()).toEqual(['fetch', 'if', 'on', 'set']);
  });

  it('[es] a simple expression condition still parses (no regression)', () => {
    const a = actions(parse('en clic si $x > 5 alternar .active fin', 'es'));
    expect(a.has('if')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
});

describe('generated for-loop accepts identifier loop vars + the dict in-connective', () => {
  // template-literal-list-build was lossy in ALL 23 non-en languages — the only
  // live `for` pattern was the en handcrafted one. forSchema generated
  // per-language patterns, but two mismatches kept them dead: (1) the patient
  // (loop var) declared expectedTypes ['reference'] while the transformer emits
  // a bare identifier (`para item en $items` — `item` tokenizes as an
  // expression), and (2) the source marker came from the profile's source
  // roleMarker (es `de`) while the i18n dicts translate the for-loop's `in`
  // connective (es `en`, pl `w`, ru `в`). Widened the patient to
  // ['reference','expression'] and added a per-language markerOverride table
  // aligned to the dict emissions. 17/23 languages flip faithful (avgFidelity
  // 0.9525 → 0.9541, lossy 275 → 258, 0 regressions). bn/hi/ja/ko/qu/tr remain:
  // their SOV emissions put the for-keyword clause-FINAL
  // (`item में $items को के_लिए`) — a different mechanism (SOV loop-head
  // reorder), tracked.
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

  // Corpus-shaped transformer output (en → lang), template-literal-list-build.
  const corpus: Array<[string, string]> = [
    [
      'es',
      'en clic establecer $html a "" entonces para item en $items entonces establecer $html a $html + `<li>${item.name}</li>` fin entonces establecer #list.innerHTML a $html',
    ],
    [
      'pl',
      'gdy kliknięcie ustaw $html do "" wtedy dla item w $items wtedy ustaw $html do $html + `<li>${item.name}</li>` koniec wtedy ustaw #list.innerHTML do $html',
    ],
    [
      'ru',
      'при клик установить $html в "" затем для item в $items затем установить $html в $html + `<li>${item.name}</li>` конец затем установить #list.innerHTML в $html',
    ],
    [
      'vi',
      'khi nhấp gán $html vào "" rồi với mỗi item trong $items rồi gán $html vào $html + `<li>${item.name}</li>` kết thúc rồi gán #list.innerHTML vào $html',
    ],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] template-literal-list-build keeps the for loop (was {on,set})`, () => {
      const a = actions(parse(input, lang as 'es'));
      expect(a.has('on')).toBe(true);
      expect(a.has('for')).toBe(true);
      expect(a.has('set')).toBe(true);
    });
  }

  it('[es] a bare for-loop with an identifier variable parses standalone', () => {
    const a = actions(parse('para item en $items registrar item fin', 'es'));
    expect(a.has('for')).toBe(true);
  });

  it('[es] a reference loop variable keeps working', () => {
    const a = actions(parse('para $x en $items registrar $x fin', 'es'));
    expect(a.has('for')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on click set $html to "" then for item in $items set $html to $html + `<li>${item.name}</li>` end then set #list.innerHTML to $html',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['for', 'on', 'set']);
  });
});

describe('empty-predicate adjective is a profile keyword alternative (is-empty cluster)', () => {
  // if-empty + input-validation dropped the `empty` action in 11 languages.
  // The `is empty` predicate is recovered through profile.keywords.empty —
  // languages that worked (es vacío, pl pusty, de leer, pt vazio, zh 空的)
  // list the predicate ADJECTIVE the dict emits as a keyword alternative;
  // the failing ones listed only the command VERB (ru опустошить, it svuotare,
  // uk спорожнити). A tokenizer entry alone is NOT sufficient — it had
  // 'vuoto'→empty in the tokenizer and still dropped the predicate. Added the
  // dict-emitted adjective as a keywords.empty alternative for ar فارغ,
  // bn খালি, hi खाली, it vuoto, ms kosong, ru пустой, th ว่าง, tl walang_laman,
  // tr boş, uk порожній, vi trống. if-empty 9/23 → 19/23 faithful,
  // input-validation similar (avgFidelity 0.9541 → 0.9554, lossy 258 → 236,
  // 0 regressions). Residuals tracked: he (possessive untranslated),
  // ja/ko (SOV blur-verb hijack), qu (the dict emits no empty word at all),
  // sw (event-head drop, separate).
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

  // Corpus-shaped transformer output (en → lang), if-empty:
  // `on blur if my value is empty add .error to me put "Required" into next
  //  .error-message end`
  const corpus: Array<[string, string]> = [
    [
      'ru',
      'при размыть если мой значение есть пустой добавить .error в я затем положить "Required" в следующий .error-message конец',
    ],
    [
      'it',
      'su sfuocatura se mio valore è vuoto aggiungere .error in io allora mettere "Required" in prossimo .error-message fine',
    ],
    [
      'vi',
      'khi mất tập trung nếu của tôi giá trị là trống thêm .error vào tôi rồi đặt "Required" vào tiếp theo .error-message kết thúc',
    ],
    [
      'uk',
      'при розмиття якщо мій значення є порожній додати .error в я тоді покласти "Required" в наступний .error-message кінець',
    ],
  ];
  /** Walk all conditional nodes and collect their condition raw strings. */
  function conditionRaws(node: unknown, acc: string[] = []): string[] {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    const roles = rec.roles;
    if (roles instanceof Map) {
      const cond = roles.get('condition') as { raw?: string; value?: unknown } | undefined;
      if (cond) acc.push(String(cond.raw ?? cond.value ?? ''));
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => conditionRaws(x, acc));
      else if (c && typeof c === 'object') conditionRaws(c, acc);
    }
    return acc;
  }

  for (const [lang, input] of corpus) {
    it(`[${lang}] if-empty keeps the empty predicate (was dropped)`, () => {
      const node = parse(input, lang as 'ru');
      const a = actions(node);
      expect(a.has('on')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('add')).toBe(true);
      // The predicate survives either folded into the condition expression
      // (normalized `is empty` — the en-reference shape; it/vi since the
      // cross-language conditional fold) or as the flat-compromise `empty`
      // command (ru/uk, whose copula doesn't normalize to `is`). Either way
      // it must not silently vanish.
      const retained =
        a.has('empty') || conditionRaws(node).some(raw => /\b(empty|null)\b/i.test(raw));
      expect(retained).toBe(true);
    });
  }

  it('[ru] the empty COMMAND verb still parses (опустошить unchanged)', () => {
    const a = actions(parse('опустошить #list', 'ru'));
    expect(a.has('empty')).toBe(true);
  });

  it('[en] folds the if into a conditional; `is empty` is the condition, not a spurious `empty` command', () => {
    // The en if/unless conditional fold (semantic-parser.tryParseConditionalBlock)
    // captures `my value is empty` as the condition EXPRESSION and nests the body
    // under a conditional node. Previously the predicate adjective `empty` matched
    // the `empty` COMMAND primary and surfaced as a spurious top-level action; it
    // is now correctly part of the condition, so the reference action set is
    // {on, if, add, put} with no bogus `empty`.
    const node = parse(
      'on blur if my value is empty add .error to me put "Required" into next .error-message end',
      'en'
    ) as Record<string, unknown>;
    const a = actions(node);
    expect(a.has('if')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('empty')).toBe(false);

    // The then-branch nests under a conditional whose condition carries the predicate.
    const handler = node as { body?: Array<Record<string, unknown>> };
    const conditional = handler.body?.find(n => n.kind === 'conditional');
    expect(conditional).toBeDefined();
    const cond = (conditional!.roles as Map<string, { raw?: string }>).get('condition');
    expect(cond?.raw).toContain('empty');
    expect(Array.isArray(conditional!.thenBranch)).toBe(true);
  });
});

describe('ja particle reading must not split a longer keyword (もし → も+し)', () => {
  // The documented Track-A diagnosis ("the SOV generators never emit an
  // if-event variant for ja") was wrong: if-event-ja-sov(-simple/-temporal…)
  // are all generated. They could never anchor because the ja TOKENIZER never
  // produced an if token — JapaneseParticleExtractor runs before the keyword
  // extractor and read the も of もし as the standalone "also" particle,
  // splitting the conditional into も[particle] + し[identifier]. The particle
  // extractor now defers when an exact 2..4-char profile keyword starts at the
  // same position (checked via TokenizerContext.isKeyword — the hook reserved
  // for exactly this). One fix, two ja failure modes: もし anchors the fused
  // if-event patterns, AND the ぼかし(blur-event)-as-verb hijack disappears
  // because the higher-priority event pattern can now outrank the bare verb
  // match. ja if-condition/if-matches/if-exists flip faithful (avgFidelity
  // 0.9554 → 0.9566, lossy 236 → 228, degenerate 67 → 65, 0 regressions).
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

  it('[ja] もし tokenizes as the if keyword, not も+し', () => {
    const t = getTokenizer('ja');
    const tok = t.tokenize('もし $x').peek() as { value: string; normalized?: string };
    expect(tok.value).toBe('もし');
    expect(tok.normalized).toBe('if');
  });

  it('[ja] the fused if-event head anchors (was: no pattern at all)', () => {
    const a = actions(
      parse(
        'クリック で もし 私の 値 である 追加 .error を 空 私 に それから "Required" を 次 .error-message に 置く 終わり',
        'ja'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('add')).toBe(true);
  });

  it('[ja] the blur-event head no longer hijacks the handler into a bare blur verb', () => {
    // if-empty corpus shape — used to parse as {blur} via blur-ja-generated.
    const a = actions(
      parse(
        'ぼかし で もし 私の 値 である 追加 .error を 空 私 に それから "Required" を 次 .error-message に 置く 終わり',
        'ja'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('blur')).toBe(false);
  });

  it('[ja] genuine particles still tokenize (を/に roles unchanged)', () => {
    const a = actions(parse('.active を 切り替え', 'ja'));
    expect(a.has('toggle')).toBe(true);
  });
});

describe('unless keyword exists in profiles the dicts emit for (pl/it/ru/uk/th)', () => {
  // unless-condition was lossy in 14 languages because their profiles had NO
  // keywords.unless at all — generatePatternsForLanguage skips a command with
  // no keyword, so no unless-<lang>/unless-event-<lang> pattern existed
  // (ms/sw/tl, which had the keyword, were the working proof). Added the
  // keyword aligned to what each dict emits, realigning dicts where the
  // emission could never tokenize as one word: pl chyba, th 'unless'
  // (passthrough), it 'a meno che'→salvo (multi-word splits), ru
  // если_не→кроме / uk якщо_не→крім (Cyrillic word extractors break at '_',
  // so underscore compounds split — если matched first and read as if).
  // NOT added: ko 아니면 (it is ko's else/otherwise word — adding it flipped
  // ko if-condition/if-exists/if-matches faithful→lossy, caught by the R0
  // ratchet warning and reverted), ja/tr/hi/qu (their SOV emissions put the
  // unless word clause-FINAL where no generated pattern can anchor — tracked).
  // vi keeps a dead trừ_khi profile entry documenting intent (the vi word
  // extractor splits at '_' too; multi-word unless needs tokenizer work).
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

  // Corpus-shaped transformer output (en → lang), unless-condition:
  // `on click unless I match .disabled toggle .selected`
  const corpus: Array<[string, string]> = [
    ['pl', 'gdy kliknięcie chyba I match .disabled przełącz .selected'],
    ['it', 'su clic salvo I match .disabled commutare .selected'],
    ['ru', 'при клик кроме I match .disabled переключить .selected'],
    ['uk', 'при клік крім I match .disabled перемкнути .selected'],
    ['th', 'เมื่อ คลิก unless I match .disabled สลับ .selected'],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] unless-condition keeps the unless wrapper (was {on,toggle})`, () => {
      const a = actions(parse(input, lang as 'pl'));
      expect(a.has('on')).toBe(true);
      expect(a.has('unless')).toBe(true);
      expect(a.has('toggle')).toBe(true);
    });
  }

  it('[ko] 아니면 must NOT read as unless (it is the else word — R0 caught the flip)', () => {
    // ko if-exists shape: 만약(if) … 아니면(else) …. If 아니면 ever becomes an
    // unless keyword again, the else-branch poisons and if-exists drops to lossy.
    const a = actions(
      parse(
        '클릭 만약 #modal 존재 #modal 를 표시 아니면 a <div#modal/> 를 생성 그러면 그것 를 본문 에 넣다 끝',
        'ko'
      )
    );
    expect(a.has('unless')).toBe(false);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(parse('on click unless I match .disabled toggle .selected', 'en'));
    expect([...a].sort()).toEqual(['on', 'toggle', 'unless']);
  });
});

describe('positional put (before/after) for the 8 languages without variants', () => {
  // put-after/put-before were lossy in exactly de/fr/he/id/ms/pt/sw/zh — the
  // languages whose handcrafted/generated put patterns cover only the
  // into-destination form (en/es/pl/ru/uk/vi carry their own before/after
  // variants). The transformer emits `<verb> {patient} <pos-word> {dest}`
  // (he inserts the את patient marker; zh fronts 把). Added a table-driven
  // builder mirroring the put-es-after shape for the 8.
  //
  // zh needed one more mechanism: 之后 was in the parser's curated zh
  // then-keyword set, so `放置 把 X 之后 Y` split at 之后 and the put dropped
  // even with the pattern present. The zh transformer emits 那么 for then
  // (now in the set) and 之后 only as positional after — removed from the set.
  // Side effect: zh behavior-* go null-parse → degenerate (bodies now split
  // at 那么), a strict improvement. lossy 223 → 207, avgFidelity
  // 0.9571 → 0.9586, 0 regressions.
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

  // Corpus-shaped transformer output (en → lang), put-after:
  // `on click put "<p>New</p>" after me`
  const corpus: Array<[string, string]> = [
    ['de', 'bei klick setzen "<p>New</p>" nach ich'],
    ['fr', 'sur clic mettre "<p>New</p>" après moi'],
    ['he', 'ב לחיצה שים את "<p>New</p>" אחרי אני'],
    ['id', 'pada klik taruh "<p>New</p>" setelah saya'],
    ['ms', 'apabila click letak "<p>New</p>" selepas saya'],
    ['pt', 'em clique colocar "<p>New</p>" depois eu'],
    ['sw', 'kwenye bonyeza weka "<p>New</p>" baada mimi'],
    ['zh', '当 点击 时 放置 把 "<p>New</p>" 之后 我'],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] put-after keeps the put (was {on})`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('on')).toBe(true);
      expect(a.has('put')).toBe(true);
    });
  }

  it('[zh] put-before works symmetrically', () => {
    const a = actions(parse('当 点击 时 放置 把 "<p>New</p>" 之前 我', 'zh'));
    expect(a.has('put')).toBe(true);
  });

  it('[zh] 那么 then-chains still split (replacement for the removed 之后)', () => {
    const a = actions(parse('当 点击 时 设置 把 $x 到 "1" 那么 切换 .active', 'zh'));
    expect(a.has('set')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });

  it('[de] the into-destination put is unchanged', () => {
    const a = actions(parse('bei klick setzen "x" zu #out', 'de'));
    expect(a.has('on')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(parse('on click put "<p>New</p>" after me', 'en'));
    expect([...a].sort()).toEqual(['on', 'put']);
  });
});

describe('qu patient-first SOV variants for add/remove/put (Track C core)', () => {
  // The qu transformer emits PATIENT-first SOV for marked two-role commands
  // (`.highlight ta noqa manta qichuy`, `.modal-open ta kurku man yapay`,
  // `chay ta noqa man churay`) but the handcrafted qu patterns were
  // source/dest-FIRST only ({source} manta {patient} ta qichuy) and put had
  // no qu patterns at all — so every marked remove (9 patterns: tabs-*,
  // modal-close-button, dropdown-close-outside, …), add (modal-open,
  // repeat-for-each) and then-tail put (if-exists, fetch-with-headers)
  // dropped its command. Added patient-first variants at priority 96
  // (above the source-first 95 forms, below the simple 100 forms).
  // qu lossy 30 → 19 across the session (avgFidelity 0.9586 → 0.9599 global,
  // lossy 207 → 196, degen 68 → 67, 0 regressions).
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

  it('[qu] tabs-basic keeps remove + add (was {on} + spurious from)', () => {
    // Corpus-shaped transformer output (en → qu).
    const a = actions(
      parse('.active ta .tab manta ñitiy pi qichuy chayqa .active ta noqa man yapay', 'qu')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('add')).toBe(true);
  });

  it('[qu] modal-close-button keeps the remove tail', () => {
    const a = actions(
      parse('kaylla .modal ta ñitiy pi pakay chayqa .modal-open ta kurku manta qichuy', 'qu')
    );
    expect(a.has('hide')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });

  it('[qu] a then-tail put with marked destination parses', () => {
    expect(actions(parse('chay ta noqa man churay', 'qu')).has('put')).toBe(true);
  });

  it('[qu] the source-first order still parses (both orders valid SOV)', () => {
    const a = actions(parse('noqa manta .highlight ta qichuy', 'qu'));
    expect(a.has('remove')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(parse('on click remove .active from .tab add .active to me', 'en'));
    expect([...a].sort()).toEqual(['add', 'on', 'remove']);
  });
});

describe('qu log emits qillqakuy (qillqay is the copy verb)', () => {
  // The qu dict emitted qillqay for BOTH log and copy; the semantic qu
  // profile reads qillqay as copy (log primary is qillqakuy), so every
  // transformed log parsed as copy — log-value/log-element/get-value/
  // optional-chaining-possessive/form-submit-prevent all lossy. Realigned
  // the dict to qillqakuy (same dict↔profile class as the set/churanay
  // realign documented in the dict). Bundled (same PR): the two stale qu
  // set-* overrides in fix-translations.sql — written for an old spacing bug
  // and frozen with the pre-realign churay verb — were pruned; the live
  // transformer now emits parseable churanay forms (the overrides were
  // re-stomping the fix on every populate). qu lossy 19 → 12
  // (avgFidelity 0.9599 → 0.9608 global, lossy 196 → 189).
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

  it('[qu] a transformed log parses as log, not copy', () => {
    // Corpus-shaped (en → qu): `on click log "Button clicked!"`.
    const a = actions(parse('"Button clicked!" ta ñitiy pi qillqakuy', 'qu'));
    expect(a.has('log')).toBe(true);
    expect(a.has('copy')).toBe(false);
  });

  it('[qu] the root cause stays locked: qillqay reads as copy', () => {
    // qillqay is the profile copy primary — this is WHY the dict had to move.
    const a = actions(parse('"x" ta ñitiy pi qillqay', 'qu'));
    expect(a.has('log')).toBe(false);
  });

  it('[qu] get-value keeps the log tail (was {copy,get,on})', () => {
    const a = actions(parse('#input.value ta ñitiy pi taripay chayqa chay ta qillqakuy', 'qu'));
    expect(a.has('get')).toBe(true);
    expect(a.has('log')).toBe(true);
  });

  it('[qu] set-text-basic parses set from the live transformer emission', () => {
    // The pruned fix-translations.sql override used to stomp this back to
    // churay (put) on every populate.
    const a = actions(parse('#output.innerText ta "Hello World" man ñitiy pi churanay', 'qu'));
    expect(a.has('on')).toBe(true);
    expect(a.has('set')).toBe(true);
  });
});

describe('fused-event body walker recovers verb-mid SOV clauses (then-tail set/put drops)', () => {
  // When a fused `*-event-<lang>-sov-*` pattern anchors the handler, the
  // trailing then-chain is parsed by parseBodyWithGrammarPatterns — which only
  // tried pattern matches and SKIPPED everything else. The SOV grammar
  // transformer puts the verb BETWEEN roles for two-role then-tail clauses
  // (`#name.innerText を 設定 その.name に` — patient, VERB, value) — an order no
  // command pattern covers. parseClause (the stage-3 SOV-extraction body path)
  // already recovers these via parseSOVClauseByVerbAnchoring; the fused-pattern
  // body walker now mirrors that fallback per clause, firing ONLY when nothing
  // in the clause matched a pattern (additive — a clause with any pattern match
  // is unchanged). Cleared 10 instances across bn/ja/qu/tr (fetch-json ×4,
  // announce-screen-reader ×2, form-disable-on-submit ×2, bn breakpoint-command,
  // qu repeat-for-each): avgFidelity 0.9608 → 0.9617, lossy 189 → 179,
  // 0 regressions. Also the precondition for the ko event-marker track: with
  // 할 때 emitted, ko then-tails route through this same walker.
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
  it('[ja] fetch-json keeps the then-tail set (was {fetch,on})', () => {
    const a = actions(
      parse(
        '/api/user を クリック で フェッチ json それから #name.innerText を 設定 その.name に',
        'ja'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[tr] form-disable-on-submit keeps the then-tail put (was {add,on})', () => {
    const a = actions(
      parse(
        '@disabled i gönder de ekle <button/> in me e sonra "Submitting..." i <button/> in me e koy',
        'tr'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  it('[bn] announce-screen-reader keeps put + set (was {on,put})', () => {
    const a = actions(
      parse(
        'event.detail.message কে success এ রাখুন #sr-announce তে তারপর @role কে সেট "alert" তে তারপর #sr-announce এ',
        'bn'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[qu] fetch-json keeps the then-tail set (was {fetch,on})', () => {
    const a = actions(
      parse(
        '/api/user ta ñitiy pi apamuy json hina chayqa #name.innerText ta chaypaq.name man churanay',
        'qu'
      )
    );
    expect(a.has('fetch')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse('on click fetch /api/user as json then set #name.innerText to it.name', 'en')
    );
    expect([...a].sort()).toEqual(['fetch', 'on', 'set']);
  });
});

describe('ko event marker 할 때 — fused patterns anchor, custom events confirmed', () => {
  // The i18n koreanProfile was the only SOV profile with NO event-role marker
  // (ja emits で, tr de/da), so every ko handler emitted a bare event name the
  // fused *-event-ko-sov-* patterns (which expect 할 때) could never anchor.
  // Three pieces, one mechanism (the marker end-to-end):
  //  1. i18n profile marker { form: '할 때', role: 'event' } — handlers now emit
  //     `클릭 할 때`, and the fused patterns + the #366 body walker carry the
  //     then-tails.
  //  2. i18n insertMarkers suppresses the event marker for SELECTOR-shaped
  //     "events": `set @role to "alert" on #sr-announce` splits at the locative
  //     `on` (set/put are deliberately NOT in ON_TARGET_COMMANDS) and the
  //     dangling `on #sr-announce` parses as a headless pseudo-handler — the
  //     marker turned that into a spurious mid-stream `#sr-announce 할 때`
  //     anchor (this also stripped ja's `#sr-announce で`).
  //  3. semantic trySOVEventExtraction consumes the OPTIONAL two-token 할 때
  //     phrase (할 identifier + 때 keyword — invisible to the single-token
  //     marker check) and lets it confirm a custom identifier event the way
  //     ja's で does. Never required: bare-event ko keeps parsing.
  // ko 0.9307 → 0.9574, lossy 9 → 6, degen 7 → 5 (caret-var-increment,
  // increment-by-amount, increment-counter, decrement-counter, wait-for-event
  // fixed; if-empty/input-validation degenerate → lossy). Global avgFidelity
  // 0.9617 → 0.9629, lossy 179 → 176, degenerate 67 → 65, 0 regressions.
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

  // Corpus-shaped transformer output (en → ko).
  it('[ko] increment-counter anchors the handler on 클릭 할 때 (was {increment})', () => {
    const a = actions(parse('#counter 를 클릭 할 때 증가', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  it('[ko] wait-for-event keeps the handler (was {wait})', () => {
    const a = actions(parse('클릭 할 때 대기 transitionend', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('wait')).toBe(true);
  });

  it('[ko] a custom identifier event is confirmed by the marker phrase (announce-screen-reader)', () => {
    const a = actions(
      parse(
        'event.detail.message 를 success 할 때 넣다 #sr-announce 에 그러면 @role 를 설정 "alert" 에 그러면 #sr-announce',
        'ko'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[ko] fetch-json keeps the then-tail set through the fused pattern + body walker', () => {
    const a = actions(
      parse(
        '/api/user 를 클릭 할 때 가져오기 json 로 그러면 #name.innerText 를 설정 그것의.name 에',
        'ko'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('fetch')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[ko] if-exists keeps the else-branch put (the 4th probe flip, now locked)', () => {
    const a = actions(
      parse(
        '클릭 할 때 만약 #modal 존재 #modal 를 보이다 아니면 a <div#modal/> 를 만들다 그러면 그것 를 바디 에 넣다 끝',
        'ko'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('show')).toBe(true);
    expect(a.has('make')).toBe(true);
    expect(a.has('put')).toBe(true);
    // The locked #361 guard still holds: 아니면 is else, never unless.
    expect(a.has('unless')).toBe(false);
  });

  it('[ko] marker-less events still parse (pre-marker emissions, hand-written input)', () => {
    // The phrase is OPTIONAL: the fetch keyword-alignment corpus shape (no 할 때).
    const a = actions(parse('/api/form 를 제출 가져오기 method:"POST" body:form 로', 'ko'));
    expect(a.has('on')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['on', 'put', 'set']);
  });
});

describe('tl/ar VSO event recovery — mis-listed keywords + midstream-on-no-match (Track B)', () => {
  // Three small pieces clearing the tl/ar focus-trap/modal-close/breakpoint
  // cluster (7 instances, 0 regressions; avgFidelity 0.9629 → 0.9641):
  //
  // 1. ar آخر removed from the end-keyword set (curated parser set + profile
  //    alternatives). آخر is ar's positional `last`; listing it as `end` made
  //    parseBodyWithClauses chop every clause at a positional last, so the
  //    ar focus-trap if-branch body (focus/halt) vanished. النهاية — the form
  //    the i18n dict actually emits for end — replaces it. Same collision
  //    class as tr son/sonuncu (locked earlier).
  // 2. tl 'kung' (= IF) removed from the kapag-alternatives of the
  //    event-tl-kapag patterns. if-first emissions (`kung <cond> kapag <event>
  //    …`) matched the EVENT pattern with event=<cond fragment>, eating the
  //    if-clause. With kung gone, Stage 2 matches `if` (a block action) and
  //    the existing midstream-loop extraction builds handler+if correctly —
  //    the §10-planned Stage-1.5 reorder turned out unnecessary.
  // 3. Stage 2.5: tryMidStreamEventExtraction now also runs for VSO when
  //    Stage 2 found NO command (`itago pinakamalapit .modal kapag click …` —
  //    hide-closest has no tl pattern; `breakpoint kapag click …` — not a
  //    command keyword). Gated to single-line input: a multi-line behavior
  //    block legitimately contains on-marked events in its body and must not
  //    be flattened into one handler (ar behavior-removable caught this).
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
  it('[ar] focus-trap keeps the if-branch body (آخر no longer chops the clause)', () => {
    const a = actions(
      parse(
        'إذا هدف يطابق آخر <button/> في .modal من .modal عند keydown[key=="Tab"] ثم تركيز أول <button/> في .modal ثم أوقف النهاية',
        'ar'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[tl] focus-trap: kung anchors if, kapag anchors the event (was event=cond fragment)', () => {
    const a = actions(
      parse(
        'kung target tumutugma huli <button/> sa_loob .modal mula sa .modal kapag keydown[key=="Tab"] pagkatapos ituon una <button/> sa_loob .modal pagkatapos huminto wakas',
        'tl'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('if')).toBe(true);
    expect(a.has('focus')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });

  it('[tl] modal-close-button recovers the handler around an unmatched leading command', () => {
    const a = actions(
      parse(
        'itago pinakamalapit .modal kapag click pagkatapos alisin .modal-open mula sa katawan',
        'tl'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });

  it('[ar] modal-close-button recovers the handler likewise', () => {
    const a = actions(parse('اخف الأقرب .modal عند نقر ثم احذف .modal-open من جسم', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });

  it('[tl] breakpoint-command keeps the handler (breakpoint is not a command keyword)', () => {
    const a = actions(parse('breakpoint kapag click pagkatapos itakda $x sa 42', 'tl'));
    expect(a.has('on')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[ar] a multi-line behavior block is NOT flattened by the new stage (single-line guard)', () => {
    // Reduced behavior-removable shape. The guard's contract: the multi-line
    // block must never be swallowed into a single on-handler (a parse failure
    // here is acceptable — the full corpus block parses via the behavior path).
    let flattenedToHandler = false;
    try {
      const a = actions(
        parse(
          'behavior Removable(t)\n    من t عند نقر\n        احذف أنا\n    النهاية\nالنهاية',
          'ar'
        )
      );
      flattenedToHandler = a.has('on');
    } catch {
      // not parseable as a single statement — fine, the behavior path owns it
    }
    expect(flattenedToHandler).toBe(false);
  });

  it('[en] the en reference parses are unchanged', () => {
    const a = actions(parse('on click hide closest .modal remove .modal-open from body', 'en'));
    expect(a.has('on')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
});

describe('SOV clause-final for-loop anchors via verb-anchoring (#358 tail)', () => {
  // #358's markerOverride table fixed the SVO for-loops; the six SOV languages
  // emit the for-keyword clause-FINAL (`item の中 $items を ために`) — an order
  // no generated pattern covers, so parseClause dropped the whole loop clause.
  // `for` is no longer skipped in buildVerbLookup: the verb-anchoring fallback
  // (which only fires when nothing else in the clause matched) anchors on the
  // trailing for-word. Plus dict↔profile realigns where the dict emitted a
  // word the profile reads as something else (the #361/#364 class):
  //   ko 동안 → 각각  (동안 is WHILE — the profile comment already warned)
  //   qu rayku → sapankaq  (rayku doubles as `by`)
  //   hi के_लिए → हेतु  (splits at `_` in the word extractor; new profile alt)
  // bn জন্য and tr için needed no realign — verb-anchoring matches by token
  // VALUE, so their particle-kind for-words anchor as-is.
  // Fixed template-literal-list-build in bn/ja/ko/qu/tr (avgFidelity
  // 0.9641 → 0.9646, lossy 171 → 166, 0 regressions). hi remains: a generated
  // into-pattern matches `में …` first, so the clause never reaches the
  // fallback (separate mechanism, tracked in the handoff).
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

  // Corpus-shaped transformer output (en → lang), template-literal-list-build.
  const corpus: Array<[string, string]> = [
    [
      'ja',
      '$html を クリック で 設定 "" に それから item の中 $items を ために それから $html を 設定 $html + `<li>${item.name}</li>` 終わり に それから #list.innerHTML を 設定 $html に',
    ],
    [
      'tr',
      '$html i tıklama de ayarla "" e sonra item içinde $items i için sonra $html i ayarla $html + `<li>${item.name}</li>` son e sonra #list.innerHTML i ayarla $html e',
    ],
    [
      'ko',
      '$html 를 클릭 할 때 설정 "" 에 그러면 item 안에 $items 를 각각 그러면 $html 를 설정 $html + `<li>${item.name}</li>` 끝 에 그러면 #list.innerHTML 를 설정 $html 에',
    ],
    [
      'bn',
      '$html কে ক্লিক এ সেট "" তে তারপর item এ $items কে জন্য তারপর $html কে সেট $html + `<li>${item.name}</li>` শেষ তে তারপর #list.innerHTML কে সেট $html তে',
    ],
    [
      'qu',
      '$html ta "" man ñitiy pi churanay chayqa item ukupi $items ta sapankaq chayqa $html ta $html + `<li>${item.name}</li>` tukuy man churanay chayqa #list.innerHTML ta $html man churanay',
    ],
  ];
  for (const [lang, input] of corpus) {
    it(`[${lang}] template-literal-list-build keeps the for loop (was {on,set})`, () => {
      const a = actions(parse(input, lang as 'ja'));
      expect(a.has('on')).toBe(true);
      expect(a.has('for')).toBe(true);
      expect(a.has('set')).toBe(true);
    });
  }

  it('[ko] 동안 still reads as while, not for (the realign reason stays locked)', () => {
    // The ko profile reads 동안 as WHILE; the dict realign (동안 → 각각) exists
    // because emitting 동안 for `for` could never anchor a for-loop.
    const a = actions(parse('item 안에 $items 를 동안 그러면 $html 를 설정 $html 에', 'ko'));
    expect(a.has('for')).toBe(false);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on click set $html to "" then for item in $items set $html to $html + `<li>${item.name}</li>` end then set #list.innerHTML to $html',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['for', 'on', 'set']);
  });
});

describe('marker-less fetch recovery for the fetch-loading-state/event-debounce cluster', () => {
  // The dict fetch verbs already matched their profiles (de abrufen, th
  // ดึงข้อมูล, it recuperare …) — the §10 "fetch drops mid then-chain"
  // diagnosis pointed at the chain, but the probe showed the BARE clause
  // (`abrufen /api/data`) failing standalone: for `fetch <url>` (no `from`)
  // the transformer emits NO source marker, while the generated
  // fetch-<lang>-generated pattern requires one. The fetch-fr/fetch-pt
  // markerlessFetch shape already existed for exactly this; extended the
  // table to de/ru/uk/it/vi/th/ar/tl. Fixed event-debounce AND
  // fetch-loading-state in all 8 (16 instances — ar/tl despite their
  // jumbled debounce-fronted emissions): avgFidelity 0.9646 → 0.9658,
  // lossy 166 → 150, 0 regressions.
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

  // Corpus-shaped transformer output (en → lang), fetch-loading-state:
  // `on click add .loading to me fetch /api/data then remove .loading from me
  //  put it into #result`
  const loadingState: Array<[string, string]> = [
    [
      'de',
      'bei klick hinzufügen .loading zu ich dann abrufen /api/data dann entfernen .loading von ich dann setzen es zu #result',
    ],
    [
      'ru',
      'при клик добавить .loading в я затем загрузить /api/data затем удалить .loading из я затем положить это в #result',
    ],
    [
      'th',
      'เมื่อ คลิก เพิ่ม .loading ใน ฉัน แล้ว ดึงข้อมูล /api/data แล้ว ลบ .loading จาก ฉัน แล้ว ใส่ มัน ใน #result',
    ],
  ];
  for (const [lang, input] of loadingState) {
    it(`[${lang}] fetch-loading-state keeps the mid-chain fetch (was {add,on,put,remove})`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('fetch')).toBe(true);
      expect(a.has('add')).toBe(true);
      expect(a.has('remove')).toBe(true);
      expect(a.has('put')).toBe(true);
    });
  }

  // event-debounce: `on input debounced at 300ms fetch /api/search?q=${my value}
  //  as json then put it into #results`
  const debounce: Array<[string, string]> = [
    [
      'it',
      'su input debounced a 300ms recuperare /api/search?q=${my value} come json allora mettere esso in #results',
    ],
    [
      'uk',
      'при введення debounced в 300ms завантажити /api/search?q=${my value} як json тоді покласти це в #results',
    ],
    [
      'vi',
      'khi nhập debounced tại 300ms tải /api/search?q=${my value} như json rồi đặt nó vào #results',
    ],
  ];
  for (const [lang, input] of debounce) {
    it(`[${lang}] event-debounce keeps the fetch (was {on,put})`, () => {
      const a = actions(parse(input, lang as 'it'));
      expect(a.has('on')).toBe(true);
      expect(a.has('fetch')).toBe(true);
      expect(a.has('put')).toBe(true);
    });
  }

  it('[de] the bare marker-less clause parses standalone (the probe shape)', () => {
    expect(actions(parse('abrufen /api/data', 'de')).has('fetch')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on click add .loading to me fetch /api/data then remove .loading from me put it into #result',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['add', 'fetch', 'on', 'put', 'remove']);
  });
});

describe('set patterns must not claim put verbs (de setzen / fr mettre / pt colocar)', () => {
  // The handcrafted set-de/fr/pt patterns listed the language's PUT verb as a
  // set-verb alternative (de setze + ['setzen','stellen'], fr définir +
  // ['mettre'], pt definir + ['colocar']). The dicts emit DISTINCT verbs
  // (set: festlegen/définir/definir; put: setzen/mettre/colocar), so every
  // transformed put parsed as set — with roles swapped — across four whole
  // clusters: if-exists, async-block, fetch-with-headers, when-value-changes
  // (12 instances, all three languages each). Removing the put verbs from the
  // set alternatives restores the split; genuine set forms (setze/définir/
  // definir heads) are untouched. Same mis-listed-keyword class as tl kung
  // (#368) and ko 아니면 (#361). avgFidelity → +12 instances, 0 regressions.
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

  // Corpus-shaped then-tail clauses (en `put it into body`).
  it('[de] setzen parses as put, not set', () => {
    const a = actions(parse('setzen es zu körper', 'de'));
    expect(a.has('put')).toBe(true);
    expect(a.has('set')).toBe(false);
  });

  it('[fr] mettre parses as put, not set', () => {
    const a = actions(parse('mettre ça à corps', 'fr'));
    expect(a.has('put')).toBe(true);
    expect(a.has('set')).toBe(false);
  });

  it('[pt] colocar parses as put, not set', () => {
    const a = actions(parse('colocar isso para corpo', 'pt'));
    expect(a.has('put')).toBe(true);
    expect(a.has('set')).toBe(false);
  });

  // Genuine set forms keep parsing as set.
  const setForms: Array<[string, string]> = [
    ['de', 'setze $x auf 5'],
    ['fr', 'définir $x à 5'],
    ['pt', 'definir $x para 5'],
  ];
  for (const [lang, input] of setForms) {
    it(`[${lang}] the genuine set head still parses as set`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('set')).toBe(true);
    });
  }

  it('[de] if-exists keeps the else-branch put (was {if,make,on,set,show})', () => {
    const a = actions(
      parse(
        'bei klick falls #modal existiert zeigen #modal sonst erstellen a <div#modal/> dann setzen es zu körper ende',
        'de'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('make')).toBe(true);
    expect(a.has('put')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(
      parse(
        'on click if #modal exists show #modal else make a <div#modal/> put it into body end',
        'en'
      )
    );
    expect([...a].sort()).toEqual(['if', 'make', 'on', 'put', 'show']);
  });
});

describe('dict↔profile realigns: clear (8 langs), command blur (5), pt unless salvo', () => {
  // Three sweeps of the same class — the dict emitted a word the semantic
  // profile reads as a DIFFERENT action (or could not read at all):
  //  1. clear: de löschen / pl wyczyść / vi xóa / id hapus / ms padam /
  //     sw futa / ar امسح are all REMOVE words in their profiles, so
  //     keydown-key-is-syntax (`on keyup[key=='Escape'] clear me`) parsed
  //     clear-as-remove in 8 languages; he had no clear entry at all
  //     (untranslated). Dicts realigned to the profile clear verbs
  //     (bereinigen/zeruj/tẩy/bersihkan/bersihkan/safisha/نظّف/נקה).
  //  2. blur: de/fr/pt/pl/sw dicts had blur only in the EVENTS section, so
  //     the COMMAND `blur me` fell back to the event word, which no profile
  //     reads as the verb (blur-element ×5; sw's event word also blocked
  //     if-empty/input-validation). commands.blur added (see grammar.test.ts).
  //  3. pt unless: dict+profile agreed on a_menos, but the pt word extractor
  //     splits at `_` (a + _ + menos — the #361 underscore class), so the
  //     keyword never tokenized. Realigned to salvo (the it precedent).
  // Combined: avgFidelity 0.9669 → ~0.9685, −16 instances, 0 regressions.
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

  // Corpus-shaped post-realign emissions (en → lang), keydown-key-is-syntax.
  const clearCases: Array<[string, string]> = [
    ['de', 'bei keyup[key=="Escape"] bereinigen ich'],
    ['pl', 'gdy keyup[key=="Escape"] zeruj ja'],
    ['vi', 'khi keyup[key=="Escape"] tẩy tôi'],
    ['id', 'pada keyup[key=="Escape"] bersihkan saya'],
    ['ms', 'apabila keyup[key=="Escape"] bersihkan saya'],
    ['sw', 'kwenye keyup[key=="Escape"] safisha mimi'],
    ['ar', 'عند keyup[key=="Escape"] نظّف أنا'],
    ['he', 'ב keyup[key=="Escape"] נקה את אני'],
  ];
  for (const [lang, input] of clearCases) {
    it(`[${lang}] keydown-key-is-syntax parses clear, not remove`, () => {
      const a = actions(parse(input, lang as 'de'));
      expect(a.has('on')).toBe(true);
      expect(a.has('clear')).toBe(true);
      expect(a.has('remove')).toBe(false);
    });
  }

  it('[de] löschen still parses as remove (the realign reason stays locked)', () => {
    const a = actions(parse('bei klick löschen .active von ich', 'de'));
    expect(a.has('remove')).toBe(true);
  });

  it('[pt] unless-condition parses the unless wrapper via salvo (was {on,toggle})', () => {
    const a = actions(parse('em clique salvo I match .disabled alternar .selected', 'pt'));
    expect(a.has('on')).toBe(true);
    expect(a.has('unless')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(parse("on keyup[key=='Escape'] clear me", 'en'));
    expect([...a].sort()).toEqual(['clear', 'on']);
  });
});

describe('auditor realign batch 1 — trigger/take/render/settle/morph/make (17 rows, 7 dicts)', () => {
  // First yield of the lexicon auditor (test/lexicon-emit-mismatch.test.ts):
  // cross-checking every dict emission against what the semantic side reads
  // mapped most of the remaining lossy mass to mechanical realigns —
  // pl wywołaj→wyzwól / ru вызвать→запустить / uk викликати→запустити
  // (trigger read as CALL), qu hurquy / tl kunin / tr al (take read as
  // remove/get), id tampilkan / qu rikuchiy / tl ipakita (render read as
  // show), id stabil / tl ayusin / qu tiyay (settle read by nothing),
  // morph ×4, sw fanya→tengeneza (make read by nothing). Cleared
  // trigger-event ×3, take-class-from-siblings ×2, render/settle/morph
  // templates ×3 langs each, sw if-exists/make-element/make-toast-element:
  // avgFidelity 0.9690 → 0.9709, lossy 122 → 105, 0 regressions.
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

  // Corpus-shaped post-realign emissions (en → lang).
  const cases: Array<[string, string, string[]]> = [
    ['pl', 'gdy załaduj wyzwól init', ['on', 'trigger']],
    ['ru', 'при загрузка запустить инициализировать', ['on', 'trigger']],
    ['tl', 'kumuha .active mula sa .tab-button kapag click pagkatapos para_sa ako', ['on', 'take']],
    ['tr', '.active i tıklama de tut .tab-button den sonra ben i için', ['on', 'take']],
    [
      'id',
      'pada klik olah #user-list dengan users: $data lalu taruh itu ke #container',
      ['on', 'render', 'put'],
    ],
    [
      'qu',
      '.animate ta ñitiy pi yapay chayqa tiyakuy chayqa .animate ta qichuy',
      ['on', 'add', 'settle', 'remove'],
    ],
    [
      'sw',
      'kwenye bonyeza tengeneza a <div.card/> kisha weka hiyo kwa #container',
      ['on', 'make', 'put'],
    ],
  ];
  for (const [lang, input, expected] of cases) {
    it(`[${lang}] realigned emission parses {${expected.join(',')}}`, () => {
      const a = actions(parse(input, lang as 'pl'));
      for (const act of expected) expect(a.has(act), `missing ${act}`).toBe(true);
    });
  }

  it('[tr] al still reads as get (why the take dict row had to move)', () => {
    // The tr profile comment already warned: al was removed from take to
    // avoid colliding with get. The dict emitting al for take was the bug.
    const a = actions(parse('#input.value i tıklama de al', 'tr'));
    expect(a.has('take')).toBe(false);
  });
});

describe('he accusative את — send/trigger/wait tolerate the marked object', () => {
  // The transformer inserts את (the accusative particle) after EVERY verb;
  // ~40 generated he patterns embed it before {patient}, but send/trigger/
  // wait name their object slot event/duration, so THEIR generated patterns
  // are marker-less (`שלח {event}`) and the whole he tail dropped
  // (send-event, send-event-to-form, send-with-detail, socket-send,
  // trigger-event, wait-then — 6 instances). Handcrafted את-marked variants
  // added (send-he-et / trigger-he-et / wait-he-et — the send-zh-ba shape).
  // ALSO: the he tokenizer no longer maps את to the 'you' reference (the
  // feminine-you homonym) — the transformer emits את exclusively as the
  // object marker, and the you-reading polluted role capture.
  // NOTE for future work: do NOT drop את from the token stream — that breaks
  // the ~40 generated patterns embedding it (probed and reverted).
  // avgFidelity 0.9709 → 0.9717, lossy 105 → 99, 0 regressions — the
  // parsing-track ship line (≥0.97 AND lossy<100) is reached.
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

  // Corpus-shaped transformer output (en → he).
  const cases: Array<[string, string, string]> = [
    ['send-event', 'ב לחיצה שלח את refresh על #widget', 'send'],
    ['socket-send', 'ב לחיצה שלח את "hello" על ChatSocket', 'send'],
    ['trigger-event', 'ב load הפעל את init', 'trigger'],
    ['wait-then', 'ב לחיצה חכה את 2s אז הסר את אני', 'wait'],
  ];
  for (const [name, input, action] of cases) {
    it(`[he] ${name} keeps the ${action} (was {on})`, () => {
      const a = actions(parse(input, 'he'));
      expect(a.has('on')).toBe(true);
      expect(a.has(action)).toBe(true);
    });
  }

  it('[he] את-marked generated patterns still work (toggle/put-after guards)', () => {
    expect(actions(parse('ב לחיצה מתג את .active', 'he')).has('toggle')).toBe(true);
    expect(actions(parse('ב לחיצה שים את "<p>New</p>" אחרי אני', 'he')).has('put')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const a = actions(parse('on click send refresh to #widget', 'en'));
    expect([...a].sort()).toEqual(['on', 'send']);
  });
});

describe('event-wrapper destination injection — wrappers defer to the command schema (R2 #376)', () => {
  // The SOV/VSO event-handler wrapper generators (also reused by SVO) hardcoded
  // `destination: { fromRole: 'destination', default: me }` into EVERY wrapped
  // command's extraction — including show/hide/increment/decrement, whose
  // schemas have no destination role at all. buildAST's show/hide/increment
  // mappers fill the args slot with `destination ?? patient`, so the fabricated
  // `destination:me` beat the real patient and the runtime acted on the clicked
  // element instead of the named selector in ~18 languages (R2's 0.412 shelf).
  // Recall-based R1 scores extra roles 1.0, which is how this survived five
  // sessions invisible. Wrappers now defer to the wrapped schema via
  // eventHandlerDestinationExtraction(): no destination role → no extraction;
  // a declared destination role keeps the schema's own default (toggle/add/
  // remove keep default me — benign, those mappers route it to modifiers).
  // R2 0.5141 → 0.7801, failing instances 190 → 86, ar joins he/zh at 1.000.
  function bodyRoles(node: unknown): Map<string, unknown> {
    const rec = node as Record<string, unknown> | null;
    const body = rec?.body as unknown;
    const first = Array.isArray(body) ? body[0] : body;
    const roles = (first as Record<string, unknown> | undefined)?.roles;
    return roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
  }

  // Corpus-shaped wrapped commands whose schema has NO destination role:
  // the parse must carry the patient and must NOT fabricate destination:me.
  const noDestCases: Array<[string, string, string]> = [
    ['es', 'en clic mostrar #modal', '#modal'],
    ['de', 'bei klick zeigen #modal', '#modal'],
    ['ru', 'при клик увеличить #counter', '#counter'],
    ['it', 'su clic nascondere #modal', '#modal'],
  ];
  for (const [lang, input, patient] of noDestCases) {
    it(`[${lang}] "${input}" keeps patient ${patient} and gains no destination`, () => {
      const roles = bodyRoles(parse(input, lang as 'es'));
      expect((roles.get('patient') as { value?: unknown })?.value).toBe(patient);
      expect(roles.has('destination')).toBe(false);
    });
  }

  it('[es] a schema WITH a destination role still captures a surface destination', () => {
    // toggle declares destination (default me); the captured #menu must win.
    const roles = bodyRoles(parse('en clic alternar .open a #menu', 'es'));
    expect((roles.get('patient') as { value?: unknown })?.value).toBe('.open');
    expect((roles.get('destination') as { value?: unknown })?.value).toBe('#menu');
  });

  it('[en] the en reference parse is unchanged', () => {
    const roles = bodyRoles(parse('on click show #modal', 'en'));
    expect((roles.get('patient') as { value?: unknown })?.value).toBe('#modal');
    expect(roles.has('destination')).toBe(false);
  });
});

describe('ko literal quoting — the SOV fallback path strips quote chars (R2 #377)', () => {
  // `"Done!" 를 클릭 넣다 나 에` parsed with patient literal `"Done!"` — quote
  // characters INCLUDED — so the runtime wrote `"Done!"` into the DOM where
  // en wrote `Done!`. The ko tokenizer correctly emits the token as
  // kind=literal; the bug was in semantic-parser's own tokenToSemanticValue /
  // tokensToSemanticValue (the particle-based SOV fallback path), which
  // wrapped the RAW value in createLiteral without stripping quotes — unlike
  // pattern-matcher's parseLiteralValue, which every other language's parse
  // path goes through. Both sites now strip symmetric quotes and tag
  // dataType string. ko execution 0.588 → 0.647.
  function firstBody(node: unknown): Record<string, unknown> {
    const rec = node as Record<string, unknown>;
    const body = rec?.body as unknown;
    return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
  }
  function role(node: unknown, name: string): { value?: unknown; dataType?: string } {
    const cmd = firstBody(node);
    const roles = cmd?.roles as Map<string, unknown>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) ?? {}) as { value?: unknown; dataType?: string };
  }

  it('[ko] put-content-basic patient literal has no quote chars (was "\\"Done!\\"")', () => {
    const p = role(parse('"Done!" 를 클릭 넣다 나 에', 'ko'), 'patient');
    expect(p.value).toBe('Done!');
    expect(p.dataType).toBe('string');
  });

  it('[ko] single-quoted literal strips too', () => {
    const p = role(parse("'OK' 를 클릭 넣다 나 에", 'ko'), 'patient');
    expect(p.value).toBe('OK');
  });

  it('[en] the en reference parse is unchanged', () => {
    const p = role(parse('on click put "Done!" into me', 'en'), 'patient');
    expect(p.value).toBe('Done!');
    expect(p.dataType).toBe('string');
  });
});

describe('event-wrapper source groups — remove-from captures across word orders (R2 #378)', () => {
  // The event-handler wrappers had NO source slot at all: `remove X from Y`
  // translations either silently dropped the from-phrase (SVO/VSO — the
  // pattern matched and the trailing `de .items` was lossy-discarded) or
  // leaked it past the matched span, where the SOV verb-anchoring fallback
  // read the から particle as a verb and fabricated a bogus `from` command
  // that threw Unknown command at runtime (after the remove had already
  // acted on the wrong target). Wrappers now emit an optional source-phrase
  // group via eventHandlerSourceGroup() — schema-deferring like the #376
  // destination fix, position-aware (prepositions precede the value,
  // postpositional particles follow it). R2 0.7826 → 0.8721; de/es/fr/pt/
  // sw/tr join ar/he/zh at 1.000.
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }

  // Corpus-shaped remove-class-from-all (en → lang).
  const cases: Array<[string, string]> = [
    ['es', 'en clic quitar .active de .items'],
    ['de', 'bei klick entfernen .active von .items'],
    ['ru', 'при клик удалить .active из .items'],
    ['ja', '.active を クリック で 削除 .items から'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] remove captures source .items (was dropped or a bogus command)`, () => {
      const cmds = commands(parse(input, lang as 'es'));
      const remove = cmds.find(c => c.action === 'remove');
      expect(remove, 'remove command present').toBeTruthy();
      expect(role(remove!, 'patient')).toBe('.active');
      expect(role(remove!, 'source')).toBe('.items');
    });
  }

  it('[ja] no fabricated from/into command in the multi-command body', () => {
    const cmds = commands(
      parse('.active を クリック で 削除 .tab から それから .active を 追加 私 に', 'ja')
    );
    expect(cmds.map(c => c.action).sort()).toEqual(['add', 'remove']);
    const remove = cmds.find(c => c.action === 'remove')!;
    expect(role(remove, 'source')).toBe('.tab');
  });

  it('[en] the en reference parse is unchanged', () => {
    const cmds = commands(parse('on click remove .active from .items', 'en'));
    expect(cmds).toHaveLength(1);
    expect(role(cmds[0], 'source')).toBe('.items');
  });
});

describe('event-wrapper trailing destination — SOV post-verb to-phrase captures (R2 #379)', () => {
  // The destination twin of the #378 source fix: the grammar transformer
  // emits `add X to Y`'s to-phrase AFTER the verb (`追加 #item に`), but the
  // SOV wrappers' only destination group sat before the patient, so the
  // trailing phrase leaked past the matched span and the verb-anchoring
  // fallback read the に particle as a bogus `into` command, while the
  // schema default filled destination=me — add acted on the clicked element
  // instead of #item. The SOV wrappers now also emit a trailing
  // (post-verb) destination group via eventHandlerDestinationGroup().
  // bn 0.882 → 1.000 (10 languages now perfect), ja 0.824 → 0.941.
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }

  // Corpus-shaped add-class-to-other (en → lang).
  const cases: Array<[string, string]> = [
    ['ja', '.selected を クリック で 追加 #item に'],
    ['bn', '.selected কে ক্লিক এ যোগ #item তে'],
    ['hi', '.selected को क्लिक पर जोड़ें #item में'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] add captures trailing destination #item (was default me + bogus into)`, () => {
      const cmds = commands(parse(input, lang as 'ja'));
      const add = cmds.find(c => c.action === 'add');
      expect(add, 'add command present').toBeTruthy();
      expect(role(add!, 'patient')).toBe('.selected');
      expect(role(add!, 'destination')).toBe('#item');
      expect(
        cmds.some(c => c.action === 'into'),
        'no fabricated into command'
      ).toBe(false);
    });
  }

  it('[en] the en reference parse is unchanged', () => {
    const cmds = commands(parse('on click add .selected to #item', 'en'));
    expect(cmds).toHaveLength(1);
    expect(role(cmds[0], 'destination')).toBe('#item');
  });
});

describe('set.ts role-convention realign — goal/target conventions → en convention (R2 #380)', () => {
  // Handcrafted set patterns carried THREE role conventions: most languages
  // use {destination}+{patient} (what setMapper reads: destination→args,
  // patient→modifiers.to), but bn/it/pl/ru/th/uk used {patient}+{goal} and
  // vi used {target}+{value}. setMapper ignores goal/target/value entirely,
  // so the property path landed in modifiers.to, args came out EMPTY, and
  // the runtime set nothing — set-style/set-text/set-inner-html failed at
  // execution in every goal-convention language whose corpus matched these
  // patterns. All realigned to the en convention; the mapper is untouched.
  // pl/ru/uk 0.824 → 1.000 (13 perfect languages), mean 0.8900 → 0.9130.
  function firstBody(node: unknown): Record<string, unknown> {
    const rec = node as Record<string, unknown>;
    const body = rec?.body as unknown;
    return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
  }
  function roleType(node: unknown, name: string): string | undefined {
    const cmd = firstBody(node);
    const roles = cmd?.roles as Map<string, { type?: string }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { type?: string } | undefined)?.type;
  }

  // Corpus-shaped set-text-possessive-dot (en → lang).
  const cases: Array<[string, string]> = [
    ['ru', 'при клик установить мой.textContent в "Done!"'],
    ['uk', 'при клік встановити мій.textContent в "Done!"'],
    ['pl', 'gdy kliknięcie ustaw mój.textContent do "Done!"'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] set captures destination=property-path + patient=value (was patient+goal)`, () => {
      const parsed = parse(input, lang as 'ru');
      expect(roleType(parsed, 'destination')).toBe('property-path');
      expect(roleType(parsed, 'patient')).toBe('literal');
      const cmd = firstBody(parsed);
      const roles = cmd.roles as Map<string, unknown>;
      const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
      expect(m.has('goal'), 'no goal role').toBe(false);
    });
  }

  it('[en] the en reference parse is unchanged', () => {
    const parsed = parse('on click set my.textContent to "Done!"', 'en');
    expect(roleType(parsed, 'destination')).toBe('property-path');
    expect(roleType(parsed, 'patient')).toBe('literal');
  });
});

describe('Fused {action} event patterns re-parse the body clause for roles (R2 it/th)', () => {
  // The handcrafted fused event patterns (`su {event} {action}` it,
  // `เมื่อ {event} {action}` th, and the bn family) capture only the body
  // VERB as a positional role — the body's arguments trail unconsumed and the
  // handler body came out as a command with ZERO roles, while the en
  // reference re-parses the same clause through the command patterns and
  // captures everything. buildEventHandler now retries: when the captured
  // action produced a role-less command, the [verb..clause-boundary] span is
  // re-parsed with the command patterns and swapped in — but only when the
  // re-parse yields a single command with the SAME action and ≥1 role, so a
  // body whose standalone pattern is missing (it blur/transition, th
  // breakpoint/put) keeps the zero-roled action instead of degenerating to
  // nothing. Companion marker fixes: set-it-full gains the transformer's
  // value marker `in`; set-th-simple swaps a broken positional patient for
  // the ใน marker group every th corpus emission carries.
  // it/th 0.824 → 1.000 (15 perfect languages), qu 0.412 → 0.765,
  // mean 0.9130 → 0.9437.
  function firstBody(node: unknown): Record<string, unknown> {
    const rec = node as Record<string, unknown>;
    const body = rec?.body as unknown;
    return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
  }
  function rolesOf(
    cmd: Record<string, unknown> | undefined
  ): Map<string, { type?: string; value?: unknown }> {
    const roles = cmd?.roles as Map<string, { type?: string; value?: unknown }>;
    return roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
  }
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

  // Corpus-shaped set-text-possessive-dot (en: on click set my.textContent to "Done!").
  const fused: Array<[string, string]> = [
    ['it', 'su clic impostare mio.textContent in "Done!"'],
    ['th', 'เมื่อ คลิก ตั้ง ของฉัน.textContent ใน "Done!"'],
  ];
  for (const [lang, input] of fused) {
    it(`[${lang}] fused event-handler body re-parses with destination + patient (was zero roles)`, () => {
      const roles = rolesOf(firstBody(parse(input, lang as 'it')));
      expect(roles.get('destination')?.type).toBe('property-path');
      expect(roles.get('patient')?.value).toBe('Done!');
    });
  }

  // Standalone bodies (then-chain / continuation re-parse shape).
  it('[it] standalone set with the transformer marker `in` captures the patient', () => {
    const roles = rolesOf(parse('impostare mio.textContent in "Done!"', 'it') as never);
    expect(roles.get('destination')?.type).toBe('property-path');
    expect(roles.get('patient')?.value).toBe('Done!');
  });
  it('[th] standalone set with the ใน marker captures the patient (was bogus positional)', () => {
    const roles = rolesOf(parse('ตั้ง ของฉัน.textContent ใน "Done!"', 'th') as never);
    expect(roles.get('destination')?.type).toBe('property-path');
    expect(roles.get('patient')?.value).toBe('Done!');
  });

  // Fallback guard: a body verb with no matching standalone pattern keeps its
  // zero-roled action (the retry must never degenerate an action to nothing).
  it('[it] blur body without a standalone pattern keeps the blur action', () => {
    expect(actions(parse('su keydown[key=="Escape"] sfuocatura io', 'it')).has('blur')).toBe(true);
  });
  it('[th] breakpoint + then-chain keeps both actions', () => {
    const a = actions(parse('เมื่อ คลิก จุดพัก แล้ว ตั้ง $x ใน 42', 'th'));
    expect(a.has('breakpoint')).toBe(true);
    expect(a.has('set')).toBe(true);
  });

  it('[en] the en reference parse is unchanged', () => {
    const roles = rolesOf(firstBody(parse('on click set my.textContent to "Done!"', 'en')));
    expect(roles.get('destination')?.type).toBe('property-path');
    expect(roles.get('patient')?.value).toBe('Done!');
  });
});

describe('ko set patient marker realign — schema 으로 → dict 에 (R2 ko)', () => {
  // setSchema's ko patient markerOverride said 으로 ("x 를 10 으로 설정"), but
  // the ko dict translates set's `to` as 에 — every ko corpus emission is
  // `{destination} 를 {event} 할 때 설정 {value} 에`. No generated set pattern
  // could match, so the rows fell to the particle fallback, which read 를 as
  // patient and 에 as destination — roles INVERTED vs the en reference (and
  // the possessive destination stayed a raw literal instead of a
  // property-path), so setMapper wrote nothing at runtime. Zero ko corpus
  // rows use 으로; the override now matches the dict. ko 0.824 → 1.000
  // (16 perfect languages), mean 0.9437 → 0.9514.
  function firstBody(node: unknown): Record<string, unknown> {
    const rec = node as Record<string, unknown>;
    const body = rec?.body as unknown;
    return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
  }
  function rolesOf(
    cmd: Record<string, unknown> | undefined
  ): Map<string, { type?: string; value?: unknown }> {
    const roles = cmd?.roles as Map<string, { type?: string; value?: unknown }>;
    return roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
  }

  // Corpus-shaped set trio (en: on click set my.X to "...").
  const cases: Array<[string, string]> = [
    ['set-text', '내.textContent 를 클릭 할 때 설정 "Done!" 에'],
    ['set-style', '내 *background 를 클릭 할 때 설정 "red" 에'],
  ];
  for (const [name, input] of cases) {
    it(`[ko] ${name} matches the generated SOV wrapper with en-convention roles (was inverted fallback)`, () => {
      const parsed = parse(input, 'ko');
      const cmd = firstBody(parsed);
      expect(cmd.action).toBe('set');
      const roles = rolesOf(cmd);
      expect(roles.get('destination')?.type).toBe('property-path');
      expect(roles.get('patient')?.type).toBe('literal');
    });
  }

  it('[en] the en reference parse is unchanged', () => {
    const roles = rolesOf(firstBody(parse('on click set my.textContent to "Done!"', 'en')));
    expect(roles.get('destination')?.type).toBe('property-path');
    expect(roles.get('patient')?.value).toBe('Done!');
  });
});

describe('Possessive-dot passthrough heads assemble property-paths (R2 id/ms/vi)', () => {
  // The dot-notation transformer can't prefix a multi-word possessive onto
  // `my.X` heads, so the id dict ('saya punya') and vi dict ('của tôi') leave
  // the corpus heads as literal English `my.textContent`; the ms dict emits
  // the single-token saya_punya.X, which the ms profile never listed. In all
  // three, the possessive matcher found no keyword, the head parsed as a raw
  // expression instead of property-path(me.X), and the runtime set nothing
  // (set-text/set-inner-html/set-style failed at execution). The profiles now
  // recognize the emitted forms (id/vi: `my` passthrough, ms: saya_punya), so
  // the matcher assembles the en-identical property-path.
  function firstBody(node: unknown): Record<string, unknown> {
    const rec = node as Record<string, unknown>;
    const body = rec?.body as unknown;
    return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
  }
  function rolesOf(
    cmd: Record<string, unknown> | undefined
  ): Map<string, { type?: string; value?: unknown }> {
    const roles = cmd?.roles as Map<string, { type?: string; value?: unknown }>;
    return roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
  }

  // Corpus-shaped set-text-possessive-dot (en: on click set my.textContent to "Done!").
  const cases: Array<[string, string]> = [
    ['id', 'pada klik atur my.textContent ke "Done!"'],
    ['ms', 'apabila click tetapkan saya_punya.textContent ke "Done!"'],
    ['vi', 'khi nhấp gán my.textContent vào "Done!"'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] possessive-dot head parses as property-path(me.textContent) (was raw expression)`, () => {
      const cmd = firstBody(parse(input, lang as 'id'));
      expect(cmd.action).toBe('set');
      const roles = rolesOf(cmd);
      const dest = roles.get('destination') as
        | { type?: string; object?: { value?: string }; property?: string }
        | undefined;
      expect(dest?.type).toBe('property-path');
      expect(dest?.object?.value).toBe('me');
      expect(dest?.property).toBe('textContent');
      expect(roles.get('patient')?.value).toBe('Done!');
    });
  }

  it('[en] the en reference parse is unchanged', () => {
    const cmd = firstBody(parse('on click set my.textContent to "Done!"', 'en'));
    const roles = rolesOf(cmd);
    expect((roles.get('destination') as { type?: string } | undefined)?.type).toBe('property-path');
    expect(roles.get('patient')?.value).toBe('Done!');
  });
});

describe('tl source marker emission realign — grammar `mula sa` → dict/profile mula_sa (R2 tl)', () => {
  // Three-way drift, with the i18n grammar profile as the odd one out: its
  // source marker was the spaced 'mula sa' while both the tl dict and the
  // semantic profile use the underscore convention mula_sa (like every other
  // multi-word tl form: kuhanin_mula, idagdag_sa_simula, galing_sa). The
  // spaced emission produced two tokens the generated patterns' single
  // mula_sa literal could never match, so `alisin X mula sa Y` lost its
  // source phrase and the remove schema's default fabricated source=me —
  // remove-class-from-all and tabs-basic removed .active from the handler
  // element instead of the real targets. The grammar profile now emits
  // mula_sa. tl 0.882 → 1.000 (19/23 perfect), mean 0.9770 → 0.9821.
  function commands(node: unknown, acc: Array<Record<string, unknown>> = []) {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'command') acc.push(rec);
    for (const f of ['body', 'statements', 'commands']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => commands(x, acc));
    }
    return acc;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }

  it('[tl] remove-class-from-all captures the real source (was default me)', () => {
    const cmds = commands(parse('alisin .active mula_sa .items kapag click', 'tl'));
    const remove = cmds.find(c => c.action === 'remove');
    expect(remove, 'remove command present').toBeTruthy();
    expect(role(remove!, 'patient')).toBe('.active');
    expect(role(remove!, 'source')).toBe('.items');
  });

  it('[tl] tabs-basic keeps remove source + add destination', () => {
    const cmds = commands(
      parse('alisin .active mula_sa .tab kapag click pagkatapos idagdag .active sa ako', 'tl')
    );
    const remove = cmds.find(c => c.action === 'remove');
    const add = cmds.find(c => c.action === 'add');
    expect(role(remove!, 'source')).toBe('.tab');
    expect(role(add!, 'destination')).toBe('me');
  });

  it('[en] the en reference parse is unchanged', () => {
    const cmds = commands(parse('on click remove .active from .items', 'en'));
    expect(role(cmds[0], 'source')).toBe('.items');
  });
});

describe("qu curated apostrophe rows — ñit'iy keyword + event-source wrapper steal (R2 qu)", () => {
  // Two qu execution killers, both hit the six curated fix-translations.sql
  // rows (the linguistically-correct glottalized forms):
  //
  // 1. The tokenizer keyword table only listed the dict's ñitiy, so the
  //    curated ñit'iy fell to the regular word-walk, which breaks at any
  //    position where a known keyword starts — including the injected
  //    English-passthrough `it` INSIDE ñit'iy (ñ + it + 'iy). The event came
  //    out as literal "'iy" and the whole clause collapsed. ñit'iy is now a
  //    keyword (patterns/event-handler.ts already mapped it to click).
  //
  // 2. The hand-crafted event-qu-source wrapper ({event} pi {source} manta
  //    {body}) misclaimed a body command's own from-phrase sitting after the
  //    event in qu SOV order, and the non-action buildEventHandler path
  //    discards wrapper roles other than `event` — so the manta phrase was
  //    lost either way and remove acted on `me`. The wrapper is removed; the
  //    qu from-elsewhere rows put the source phrase before the event, so
  //    nothing legitimate matched it.
  function commands(node: unknown, acc: Array<Record<string, unknown>> = []) {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'command') acc.push(rec);
    for (const f of ['body', 'statements', 'commands']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => commands(x, acc));
    }
    return acc;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }
  function eventOf(node: unknown): unknown {
    const rec = node as Record<string, unknown>;
    const roles = rec?.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get('event') as { value?: unknown } | undefined)?.value;
  }

  it("[qu] ñit'iy tokenizes as one click keyword (no ñ + it + 'iy split)", () => {
    const tokens = getTokenizer('qu').tokenize("ñit'iy pi .highlight ta yapay").tokens;
    const first = tokens[0] as { value: string; normalized?: string };
    expect(first.value).toBe("ñit'iy");
    expect(first.normalized).toBe('click');
  });

  it("[qu] add-class-basic curated row: event click + add patient (was event \"'iy\")", () => {
    const node = parse("ñit'iy pi .highlight ta yapay", 'qu');
    expect(eventOf(node)).toBe('click');
    const add = commands(node).find(c => c.action === 'add');
    expect(role(add!, 'patient')).toBe('.highlight');
  });

  it("[qu] toggle-class-on-other curated row keeps destination (t'ikray verb)", () => {
    const node = parse("ñit'iy pi #menu pa .open ta t'ikray", 'qu');
    expect(eventOf(node)).toBe('click');
    const toggle = commands(node).find(c => c.action === 'toggle');
    expect(role(toggle!, 'patient')).toBe('.open');
  });

  it('[qu] remove-class-from-all keeps the manta source (was stolen by event-qu-source)', () => {
    const node = parse("ñit'iy pi .items manta .active ta qichuy", 'qu');
    expect(eventOf(node)).toBe('click');
    const remove = commands(node).find(c => c.action === 'remove');
    expect(role(remove!, 'patient')).toBe('.active');
    expect(role(remove!, 'source')).toBe('.items');
  });

  it('[qu] the dict ñitiy form still parses identically', () => {
    const node = parse('ñitiy pi .items manta .active ta qichuy', 'qu');
    expect(eventOf(node)).toBe('click');
    const remove = commands(node).find(c => c.action === 'remove');
    expect(role(remove!, 'source')).toBe('.items');
  });
});

describe('qu word-walk keyword breaks require a word boundary (systemic #387 follow-up)', () => {
  // #387 fixed one live instance (ñit'iy) by adding it as a keyword, but the
  // hazard was systemic: the keyword table injects English canonical reference
  // words (me, it, you, …) for EVERY language, and the qu word-walk broke at
  // any position where a known keyword merely starts (raw startsWith). Any
  // unknown space-delimited word with an embedded fallback split mid-word.
  // The walk now uses isKeywordStartAtBoundary (framework base-tokenizer) with
  // isQuechuaLetter, so a break needs the match to end at a word boundary —
  // and the longest-keyword scan at word start applies the same guard, so a
  // keyword prefix no longer steals the front of a longer word (ñit'iyq).
  function values(input: string): string[] {
    return getTokenizer('qu')
      .tokenize(input)
      .tokens.map((t: { value: string }) => t.value);
  }

  it('[qu] unknown word with embedded English fallback "it" stays whole', () => {
    expect(values('umitaq')).toEqual(['umitaq']);
  });

  it('[qu] unknown word with embedded English fallback "me" stays whole', () => {
    expect(values('umema')).toEqual(['umema']);
  });

  it("[qu] keyword-prefix word ñit'iyq stays whole (no click + stray q)", () => {
    expect(values("ñit'iyq")).toEqual(["ñit'iyq"]);
  });

  it('[qu] mid-sentence: embedded-fallback word is one token, clause still parses', () => {
    expect(values('.active ta umitaq man yapay')).toEqual([
      '.active',
      'ta',
      'umitaq',
      'man',
      'yapay',
    ]);
  });

  it('[qu] agglutinated case suffix still splits at the word boundary', () => {
    // Boundary-ending keyword breaks are load-bearing: wasita → wasi + ta
    expect(values('wasita')).toEqual(['wasi', 'ta']);
  });
});

describe('id increment dict realign — tambahkan (parses as add) → naikkan (R2 id)', () => {
  // The id dict emitted tambahkan for increment, but tambahkan is the id
  // semantic profile's `add` ALTERNATIVE — increment-counter parsed as
  // add(#counter) and execution diverged (the #373 keyword-collision family;
  // its allowlist row is pruned in the same PR). The dict now emits naikkan,
  // the profile's increment alternative.
  function firstCommand(node: unknown): Record<string, unknown> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'command') return rec;
    for (const f of ['body', 'statements', 'commands']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const r = firstCommand(x);
          if (r) return r;
        }
      }
    }
    return undefined;
  }

  it('[id] increment-counter emission parses as increment, not add', () => {
    const cmd = firstCommand(parse('pada klik naikkan #counter', 'id'));
    expect(cmd?.action).toBe('increment');
  });

  it('[id] tambahkan still parses as add (the profile alternative is untouched)', () => {
    const cmd = firstCommand(parse('tambahkan .highlight', 'id'));
    expect(cmd?.action).toBe('add');
  });
});

describe('en if/unless conditional fold (parsing track reopen — §2 dominant cluster)', () => {
  // The semantic parser's body assembly (parseBodyWithClauses →
  // tryParseConditionalBlock) folds an English-order `if <cond> [then] <body>
  // [else <body>] [end]` into a ConditionalSemanticNode: the full condition is
  // captured (previously truncated to its first token) and the then/else branches
  // nest (previously flattened into sibling commands). This is the §2 dominant
  // cluster that manifests in English itself and blocked R2 control-flow
  // expansion. `unless` is intentionally NOT folded (a conditional node is always
  // action `if`; folding `unless` would relabel its action and desync the
  // cross-language action-set comparison).
  function findConditional(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'conditional') return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const found = findConditional(x);
          if (found) return found;
        }
      }
    }
    return null;
  }
  const condText = (c: Record<string, unknown>): string =>
    ((c.roles as Map<string, { raw?: string }>).get('condition')?.raw ?? '') as string;
  const branchActions = (branch: unknown): string[] =>
    Array.isArray(branch)
      ? (branch as Array<Record<string, unknown>>).map(n => String(n.action))
      : [];

  it('if-condition: full condition + nested then/else branches', () => {
    const c = findConditional(
      parse('on click if I match .active then remove .active else add .active end', 'en')
    );
    expect(c).not.toBeNull();
    expect(condText(c!)).toBe('I match .active');
    expect(branchActions(c!.thenBranch)).toEqual(['remove']);
    expect(branchActions(c!.elseBranch)).toEqual(['add']);
  });

  it('if-matches: no explicit `then` — condition ends at the first command verb', () => {
    const c = findConditional(
      parse('on click if I match .disabled halt else toggle .active end', 'en')
    );
    expect(condText(c!)).toBe('I match .disabled');
    expect(branchActions(c!.thenBranch)).toEqual(['halt']);
    expect(branchActions(c!.elseBranch)).toEqual(['toggle']);
  });

  it('if-exists: else branch keeps a juxtaposed multi-command body', () => {
    const c = findConditional(
      parse(
        'on click if #modal exists show #modal else make a <div#modal/> put it into body end',
        'en'
      )
    );
    expect(condText(c!)).toBe('#modal exists');
    expect(branchActions(c!.thenBranch)).toEqual(['show']);
    expect(branchActions(c!.elseBranch)).toEqual(['make', 'put']);
  });

  it('is-empty copula guard: `empty` after `is` stays in the condition, not the then-branch', () => {
    const c = findConditional(
      parse('on blur if my value is empty add .error to me else remove .error from me end', 'en')
    );
    expect(condText(c!)).toBe('my value is empty');
    expect(branchActions(c!.thenBranch)).toEqual(['add']);
    expect(branchActions(c!.elseBranch)).toEqual(['remove']);
  });

  it('no `else`, no `end`: whole remainder is the then-branch', () => {
    const c = findConditional(
      parse('on click if target matches .modal-backdrop hide .modal-backdrop end', 'en')
    );
    expect(condText(c!)).toBe('target matches .modal-backdrop');
    expect(branchActions(c!.thenBranch)).toEqual(['hide']);
    expect(c!.elseBranch).toBeUndefined();
  });

  it('unless is NOT folded (keeps its flat parse / `unless` action label)', () => {
    const c = findConditional(
      parse('on click unless I match .disabled toggle .selected', 'en')
    );
    expect(c).toBeNull();
  });
});

describe('en positional-phrase patients — closest <sel> and the-led positionals (R2 wave 3)', () => {
  // `hide closest .modal` / `show the next <div.tab-panel/>` previously
  // DROPPED at the semantic parse: `closest` was not a positional-expression
  // lead keyword (only first/last/next/previous/random), and skipNoiseWords
  // only skipped `the` before selectors/identifiers — never before a
  // positional keyword. Both forms now capture the whole phrase as a single
  // expression value, which the expression parser folds to the positional
  // call shape the core runtime evaluates (see the #400 fold).
  function roles(node: unknown): Map<string, { type?: string; raw?: string; value?: string }> {
    return (node as { roles: Map<string, { type?: string; raw?: string; value?: string }> })
      .roles;
  }

  it('hide closest .modal captures the patient as a positional expression', () => {
    const node = parse('hide closest .modal', 'en') as Record<string, unknown>;
    expect(node).toBeTruthy();
    expect(node.action).toBe('hide');
    const patient = roles(node).get('patient');
    expect(patient?.type).toBe('expression');
    expect(patient?.raw).toBe('closest .modal');
  });

  it('show the next <div.tab-panel/> skips the article and captures the positional', () => {
    const node = parse('show the next <div.tab-panel/>', 'en') as Record<string, unknown>;
    expect(node).toBeTruthy();
    expect(node.action).toBe('show');
    const patient = roles(node).get('patient');
    expect(patient?.type).toBe('expression');
    expect(patient?.raw).toBe('next <div.tab-panel/>');
  });

  it('toggle … on closest .card captures the destination as a positional expression', () => {
    // Previously the destination captured the bare literal `closest` and the
    // selector stranded (closest-ancestor / accordion-toggle corpus rows).
    const node = parse('on click toggle .expanded on closest .card', 'en') as {
      body?: Array<Record<string, unknown>>;
    };
    const toggle = node.body?.find(n => n.action === 'toggle');
    expect(toggle).toBeDefined();
    const dest = roles(toggle).get('destination');
    expect(dest?.type).toBe('expression');
    expect(dest?.raw).toBe('closest .card');
  });

  it('a juxtaposed following command is not swallowed as the positional source clause', () => {
    // modal-close-button: `hide closest .modal remove .modal-open from body` —
    // the optional `<marker> <selector>` source clause must not consume the
    // next clause's verb (`remove`) as a locative marker. Guarded by the
    // schema-action keyword set (language-independent: tokenizers normalize
    // every language's verbs to these forms).
    const node = parse('on click hide closest .modal remove .modal-open from body', 'en') as {
      body?: Array<Record<string, unknown>>;
    };
    const stmts =
      node.body?.flatMap(n =>
        n.kind === 'compound' ? (n.statements as Array<Record<string, unknown>>) : [n]
      ) ?? [];
    const actions = stmts.map(s => s.action);
    expect(actions).toContain('hide');
    expect(actions).toContain('remove');
    const hide = stmts.find(s => s.action === 'hide')!;
    expect(roles(hide).get('patient')?.raw).toBe('closest .modal');
    const remove = stmts.find(s => s.action === 'remove')!;
    expect(roles(remove).get('patient')?.value).toBe('.modal-open');
  });

  it('tabs-content parses all four commands including the article-led show', () => {
    // §10.5: the en reference was lossy (show dropped), which made 13
    // faithful languages read as failers. All four commands now survive.
    const node = parse(
      'on click remove .active from .tab add .active to me hide .tab-panel show the next <div.tab-panel/>',
      'en'
    ) as { body?: Array<Record<string, unknown>> };
    const stmts =
      node.body?.flatMap(n =>
        n.kind === 'compound' ? (n.statements as Array<Record<string, unknown>>) : [n]
      ) ?? [];
    expect(stmts.map(s => s.action)).toEqual(['remove', 'add', 'hide', 'show']);
    const show = stmts.find(s => s.action === 'show')!;
    expect(roles(show).get('patient')?.raw).toBe('next <div.tab-panel/>');
  });

  // Cross-language positional NORMALIZATION (R2 wave 5). The captured `raw` is
  // evaluated by the core's English positional expression parser, so a
  // source-language positional keyword (`cercano`/`次`/`التالي`) must surface in
  // the raw as its normalized English form — otherwise the runtime errors,
  // drops to `me`, or matches every element (same idiom as the conditional
  // fold's joinTokenText). Selectors are code and keep their surface value.
  // This is what cleared tabs-content (22→0), dropdown-toggle (13→0), and most
  // of accordion/modal-close-button/closest-ancestor in the execution sweep.
  const positionalCases: Array<[string, string, string]> = [
    ['es', 'mostrar siguiente <div.tab-panel/>', 'next <div.tab-panel/>'],
    ['de', 'zeigen the nächste <div.tab-panel/>', 'next <div.tab-panel/>'],
    ['ja', '次 <div.tab-panel/> を 表示', 'next <div.tab-panel/>'],
    ['ko', '다음 <div.tab-panel/> 를 보이다', 'next <div.tab-panel/>'],
    ['ar', 'اظهر التالي <div.tab-panel/>', 'next <div.tab-panel/>'],
    ['es', 'ocultar cercano .modal', 'closest .modal'],
    ['ar', 'اخف الأقرب .modal', 'closest .modal'],
  ];
  for (const [lang, input, expectedRaw] of positionalCases) {
    it(`[${lang}] positional keyword normalizes to English in the captured raw`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      const patient = roles(node).get('patient');
      expect(patient?.type).toBe('expression');
      expect(patient?.raw).toBe(expectedRaw);
    });
  }
});

describe('body reference dict↔profile alignment (R2 wave 6)', () => {
  // The semantic profile's `references.body` word MUST equal the word the i18n
  // dict emits (the corpus-canonical surface form), or the parser never maps the
  // translated body word to the `body` contextReference and the source/
  // destination role falls back to `me`. Three profiles carried the literal
  // English placeholder `'body'` (ru/tl/uk) and three more disagreed with the
  // dict on a real word (ar الجسم≠جسم, ko 본문≠바디 — 본문 means "main text",
  // wrong for the DOM body; id tubuh≠badan). Aligned profile→dict; this cleared
  // ar/id/ru/tl on modal-close-button + modal-open in the execution sweep.
  // (qu kurku/ukhu is a separate underscore-tokenization issue — the dict emits
  //  mana_chayqa/kurku which the qu tokenizer splits; tracked, not fixed here.)
  function roles(node: unknown): Map<string, { type?: string; value?: unknown; raw?: unknown }> {
    return (node as { roles: Map<string, { type?: string; value?: unknown; raw?: unknown }> }).roles;
  }
  // [lang, corpus-shaped `remove .x from <body-word>`, expected source value]
  const bodyCases: Array<[string, string]> = [
    ['ar', 'احذف .modal-open من جسم'],
    ['id', 'hapus .modal-open dari badan'],
    ['ru', 'удалить .modal-open из тело'],
    ['tl', 'alisin .modal-open mula_sa katawan'],
    ['uk', 'видалити .modal-open з тіло'],
  ];
  for (const [lang, input] of bodyCases) {
    it(`[${lang}] the dict's body word resolves to the body reference (not me)`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      const source = roles(node).get('source');
      expect(source?.value).toBe('body');
    });
  }

  it('[id] lainnya is recognized as else so if-exists nests (else-branch does not flatten into then)', () => {
    // The id dict emits `lainnya` for else but the profile only had `selainnya`,
    // so the else-branch flattened into then. With the condition true (the modal
    // exists), the flattened make+put-into-body then executed and produced a
    // spurious effect. `lainnya` is now a profile else alternative.
    const node = parse(
      'pada klik jika #modal ada tampilkan #modal lainnya buat a <div#modal/> lalu taruh itu ke badan akhir',
      'id'
    ) as { body?: Array<Record<string, unknown>> };
    const conditional = node.body?.find(n => n.kind === 'conditional') as
      | { thenBranch?: unknown[]; elseBranch?: unknown[] }
      | undefined;
    expect(conditional).toBeDefined();
    expect(conditional!.thenBranch?.length).toBe(1); // show #modal only
    expect(conditional!.elseBranch?.length).toBe(2); // make + put, NOT flattened into then
  });
});

describe('en at-end-of positional put — at end of / at start of (R2 make-toast-element)', () => {
  function roles(node: unknown): Map<string, { type?: string; raw?: string; value?: unknown }> {
    return (node as { roles: Map<string, { type?: string; raw?: string; value?: unknown }> })
      .roles;
  }

  it("put 'x' at end of #out captures destination + the whole position phrase", () => {
    const node = parse("put 'x' at end of #out", 'en') as Record<string, unknown>;
    expect(node).toBeTruthy();
    expect(node.action).toBe('put');
    expect(roles(node).get('destination')?.value).toBe('#out');
    expect(roles(node).get('manner')?.value).toBe('at end of');
  });

  it("put 'x' at start of #out captures the at-start-of form", () => {
    const node = parse("put 'x' at start of #out", 'en') as Record<string, unknown>;
    expect(node).toBeTruthy();
    expect(roles(node).get('manner')?.value).toBe('at start of');
  });

  it('the position noun `end` does not terminate an event body clause', () => {
    // parseBodyWithClauses treats `end` as the block terminator; in
    // `put it at end of body` it is the position noun. The sandwich guard
    // (previous clause token `at`, following token `of`) keeps the clause
    // intact — previously the body parsed EMPTY.
    const node = parse("on click put 'a' at end of #x", 'en') as {
      body?: Array<Record<string, unknown>>;
    };
    expect(node.body?.length).toBe(1);
    expect(node.body?.[0].action).toBe('put');
    expect(roles(node.body![0]).get('manner')?.value).toBe('at end of');
  });

  it('a real block-terminating end still terminates (guard is sandwich-gated)', () => {
    const node = parse(
      'on click if I match .active then add .x to me end',
      'en'
    ) as { body?: Array<Record<string, unknown>> };
    const conditional = node.body?.find(n => n.kind === 'conditional');
    expect(conditional).toBeDefined();
  });

  it('make-toast-element parses all three commands including the at-end-of put', () => {
    const node = parse(
      "on click make a <div.toast/> then put 'Saved!' into it then put it at end of body",
      'en'
    ) as { body?: Array<Record<string, unknown>> };
    const stmts =
      node.body?.flatMap(n =>
        n.kind === 'compound' ? (n.statements as Array<Record<string, unknown>>) : [n]
      ) ?? [];
    expect(stmts.map(s => s.action)).toEqual(['make', 'put', 'put']);
    const lastPut = stmts[2];
    expect(roles(lastPut).get('destination')?.value).toBe('body');
    expect(roles(lastPut).get('manner')?.value).toBe('at end of');
  });
});

describe('cross-language at-end-of positional put (R2 wave 8 — make-toast-element)', () => {
  // en carries a handcrafted `put {patient} at end of {destination}` pattern; the
  // i18n transformer translates that three-word position phrase verbatim into
  // every other language, but no non-en language had a counterpart, so the third
  // clause of make-toast-element (`put it at end of body`) either dropped
  // entirely (SOV/VSO — the made toast was never attached → empty effect) or the
  // generic into-put grabbed the `end` word as the destination. PUT_AT_END
  // (patterns/put.ts) records the per-language surface words for the verb +
  // `at`/`end`/`of` so the generated pattern reconstructs the en shape with
  // `manner: 'at end of'`; the destination is the language's dict-canonical body
  // word, which already resolves to the `body` contextReference. This cleared
  // make-toast-element in 17 languages in the execution sweep (23→6 failing).
  // Parse-level fidelity is unchanged: the dropped third command is a duplicate
  // `put` action, so action-set fidelity was already 1.0 — exactly the
  // lossy-but-faithful gap R2 execution fidelity exists to catch.
  function roles(node: unknown): Map<string, { type?: string; value?: unknown }> {
    return (node as { roles: Map<string, { type?: string; value?: unknown }> }).roles;
  }
  // [lang, the corpus-shaped third clause `put 'x' <at> end <of> body`]. SOV
  // languages (ja/ko/tr) place the verb last after an object marker; he leaves
  // `at`/`of` untranslated; vi's `kết thúc` is a single multi-word token.
  const atEndCases: Array<[string, string]> = [
    ['es', "poner 'x' en fin de cuerpo"],
    ['fr', "mettre 'x' à fin de corps"],
    ['pt', "colocar 'x' em fim de corpo"],
    ['it', "mettere 'x' a fine di corpo"],
    ['de', "setzen 'x' bei ende von körper"],
    ['sw', "weka 'x' katika mwisho ya mwili"],
    ['id', "taruh 'x' di akhir dari badan"],
    ['vi', "đặt 'x' tại kết thúc của body"],
    ['pl', "umieść 'x' przy koniec z body"],
    ['ru', "положить 'x' у конец из тело"],
    ['th', "ใส่ 'x' ที่ จบ ของ บอดี้"],
    ['tl', "ilagay 'x' sa wakas ng katawan"],
    ['ar', "ضع 'x' عند النهاية من جسم"],
    ['he', "שים את 'x' at סוף of גוף"],
    ['ja', "'x' で 終わり の ボディ を 置く"],
    ['ko', "'x' 에 끝 의 바디 를 넣다"],
    ['tr', "'x' de son nin gövde i koy"],
  ];
  for (const [lang, input] of atEndCases) {
    it(`[${lang}] put at end of body parses as a put with manner 'at end of' + body destination`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      expect(node.action).toBe('put');
      expect(roles(node).get('manner')?.value).toBe('at end of');
      expect(roles(node).get('destination')?.value).toBe('body');
    });
  }
});

describe('trailing post-verb source clause in fused-event bodies (R2 wave 9 — modal-close-button)', () => {
  // modal-close-button's body is `hide closest .modal then remove .modal-open
  // from body`. The grammar transformer emits the from-phrase AFTER the verb —
  // SOV `... .modal-open を 削除 ボディ から`, SVO th `... ลบ .modal-open จาก
  // บอดี้` — and the per-command remove pattern (which ends at the verb) never
  // claims it. Because the fused event pattern captures the first command (hide)
  // as the action, the trailing `remove …` clause is parsed by
  // parseBodyWithGrammarPatterns, which used to skip `<body-word> <from-marker>`
  // and leave the schema's `me` default, so `.modal-open` was removed from the
  // clicked button instead of the document body (no effect). tryAttachTrailingSource
  // now reclaims the trailing source (postpositional or prepositional, per the
  // profile's source-marker position) — the body-clause twin of the #379
  // event-wrapper trailing source group. Cleared 6 languages in the execution
  // sweep (modal-close-button 10→4). Fires only when the matched command's schema
  // declares a source role that is currently absent or the defaulted `me`.
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }

  // Corpus modal-close-button translations: `hide closest .modal then remove
  // .modal-open from body`. bn/hi/ja/ko/tr trail a postpositional `<body>
  // <from-marker>`; th a prepositional `<from-marker> <body>` after the verb.
  const cases: Array<[string, string]> = [
    ['ja', '最も近い .modal を クリック で 隠す それから .modal-open を 削除 ボディ から'],
    ['ko', '가장가까운 .modal 를 클릭 할 때 숨기다 그러면 .modal-open 를 제거 바디 에서'],
    ['bn', 'নিকটতম .modal কে ক্লিক এ লুকান তারপর .modal-open কে সরান বডি থেকে'],
    ['hi', 'निकटतम .modal को क्लिक पर छिपाएं फिर .modal-open को हटाएं बॉडी से'],
    ['tr', 'enyakın .modal i tıklama de gizle sonra .modal-open i kaldır gövde den'],
    ['th', 'เมื่อ คลิก ซ่อน ใกล้สุด .modal แล้ว ลบ .modal-open จาก บอดี้'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] the trailing post-verb remove captures source = body (was the me default)`, () => {
      const remove = commands(parse(input, lang as 'ja')).find(c => c.action === 'remove');
      expect(remove, 'remove command present').toBeTruthy();
      expect(role(remove!, 'patient')).toBe('.modal-open');
      expect(role(remove!, 'source')).toBe('body');
    });
  }

  it('[ja] a genuinely captured source is not overwritten (accordion remove keeps .accordion-item)', () => {
    // accordion-exclusive's `remove .open from .accordion-item` captures its
    // source through the existing path; the trailing-source reclaim must not
    // touch it (the guard returns early on a non-`me` existing source).
    const input =
      '.open を クリック で 削除 .accordion-item から それから .open を 追加 最も近い .accordion-item に';
    const remove = commands(parse(input, 'ja')).find(c => c.action === 'remove');
    expect(remove).toBeTruthy();
    expect(role(remove!, 'source')).toBe('.accordion-item');
  });

  it('[en] the en reference parse is unchanged (no trailing source phrase to reclaim)', () => {
    const cmds = commands(parse('on click hide closest .modal remove .modal-open from body', 'en'));
    const remove = cmds.find(c => c.action === 'remove');
    expect(remove).toBeTruthy();
    expect(role(remove!, 'source')).toBe('body');
  });
});

describe('trailing post-verb destination clause in fused-event bodies (R2 wave 10 — modal-open)', () => {
  // The destination twin of wave 9. modal-open's body is `show #modal then add
  // .modal-open to body`. The grammar transformer emits the to-phrase AFTER the
  // verb — SOV `.modal-open を 追加 ボディ に`, SVO th `เพิ่ม .modal-open ใน บอดี้`
  // — which the per-command add pattern (ending at the verb) never claims, so the
  // class is added to the clicked button (the `me` default) instead of the
  // document body. tryAttachTrailingRole now reclaims the trailing destination as
  // well as the source. The destination value is matched STRICTLY (selectors +
  // DOM reference words only, never a bare identifier): the to-markers (ja に,
  // ko 에, …) are common, so admitting arbitrary identifiers would let the reclaim
  // eat tokens a later command needs. This is why `add .open to closest
  // .accordion-item` is untouched — `closest` is a keyword, not a value — and is
  // left for the positional path. Cleared modal-open in 6 languages (7→1).
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  function role(cmd: Record<string, unknown>, name: string): unknown {
    const roles = cmd.roles as Map<string, { value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    return (m.get(name) as { value?: unknown } | undefined)?.value;
  }

  // Corpus modal-open translations: `show #modal then add .modal-open to body`.
  const cases: Array<[string, string]> = [
    ['ja', '#modal を クリック で 表示 それから .modal-open を 追加 ボディ に'],
    ['ko', '#modal 를 클릭 보이다 그러면 .modal-open 를 추가 바디 에'],
    ['bn', '#modal কে ক্লিক এ দেখান তারপর .modal-open কে যোগ বডি তে'],
    ['hi', '#modal को क्लिक पर दिखाएं फिर .modal-open को जोड़ें बॉडी में'],
    ['tr', '#modal i tıklama de göster sonra .modal-open i ekle gövde e'],
    ['th', 'เมื่อ คลิก แสดง #modal แล้ว เพิ่ม .modal-open ใน บอดี้'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] the trailing post-verb add captures destination = body (was the me default)`, () => {
      const add = commands(parse(input, lang as 'ja')).find(c => c.action === 'add');
      expect(add, 'add command present').toBeTruthy();
      expect(role(add!, 'patient')).toBe('.modal-open');
      expect(role(add!, 'destination')).toBe('body');
    });
  }

  it('[ja] a positional-phrase destination is NOT mis-captured (accordion add stays off body)', () => {
    // accordion-exclusive's `add .open to closest .accordion-item` trails a
    // positional phrase (`最も近い .accordion-item に`). The strict destination
    // matcher rejects the leading `closest` keyword, so the reclaim does not fire
    // and never assigns `body` — the positional destination is handled elsewhere.
    const input =
      '.open を クリック で 削除 .accordion-item から それから .open を 追加 最も近い .accordion-item に';
    const add = commands(parse(input, 'ja')).find(c => c.action === 'add');
    expect(add).toBeTruthy();
    expect(role(add!, 'destination')).not.toBe('body');
  });

  it('[en] the en reference parse is unchanged', () => {
    const add = commands(parse('on click show #modal add .modal-open to body', 'en')).find(
      c => c.action === 'add'
    );
    expect(add).toBeTruthy();
    expect(role(add!, 'destination')).toBe('body');
  });
});

describe('trailing post-verb POSITIONAL destination (R2 wave 11 — accordion-exclusive)', () => {
  // accordion-exclusive's body is `remove .open from .accordion-item then add
  // .open to closest .accordion-item`. The to-phrase trails the add verb as a
  // POSITIONAL phrase — SOV `… 最も近い .accordion-item に` (closest + selector +
  // to-marker) — which neither the per-command add pattern nor wave 10's single-
  // token reclaim claimed, so the destination defaulted to `me` (the class landed
  // on the clicked button instead of the closest .accordion-item). tryAttachTrailingRole
  // now also reclaims a `<positional-keyword> <selector> <marker>` destination,
  // building the same `{ type: 'expression', raw: 'closest .accordion-item' }` the
  // English reference produces (normalized positional keyword + selector surface)
  // so the core's positional evaluator resolves it identically. Cleared
  // accordion-exclusive in 5 languages (8→3) plus toggle-aria-expanded's
  // `next .panel` destination as a ride-along.
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  function destRaw(cmd: Record<string, unknown>): unknown {
    const roles = cmd.roles as Map<string, { raw?: unknown; value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    const d = m.get('destination') as { raw?: unknown; value?: unknown } | undefined;
    return d?.raw ?? d?.value;
  }

  // tr is a real execution win too, but its corpus `closest` surface form jitters
  // across populates (`en yakın` / `enyakın` / `en_yakın`), so it is left out of
  // this parse-level lock to keep the test decoupled from corpus jitter. The four
  // cases below use single-token `closest` words that never jitter.
  const cases: Array<[string, string]> = [
    ['ja', '.open を クリック で 削除 .accordion-item から それから .open を 追加 最も近い .accordion-item に'],
    ['ko', '.open 를 클릭 제거 .accordion-item 에서 그러면 .open 를 추가 가장가까운 .accordion-item 에'],
    ['hi', '.open को क्लिक पर हटाएं .accordion-item से फिर .open को जोड़ें निकटतम .accordion-item में'],
    ['bn', '.open কে ক্লিক এ সরান .accordion-item থেকে তারপর .open কে যোগ নিকটতম .accordion-item তে'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] the trailing positional destination resolves to closest .accordion-item`, () => {
      const add = commands(parse(input, lang as 'ja')).find(c => c.action === 'add');
      expect(add, 'add command present').toBeTruthy();
      expect(destRaw(add!)).toBe('closest .accordion-item');
    });
  }

  it('[en] the en reference parse is unchanged', () => {
    const add = commands(
      parse('on click remove .open from .accordion-item add .open to closest .accordion-item', 'en')
    ).find(c => c.action === 'add');
    expect(add).toBeTruthy();
    expect(destRaw(add!)).toBe('closest .accordion-item');
  });
});

describe('`matches` comparison-operator normalization (R2 wave 12 — modal-close-backdrop)', () => {
  // modal-close-backdrop's body is `if target matches .modal-backdrop hide
  // .modal-backdrop end`. The fold (tryParseConditionalBlock) already produced the
  // right structure (condition + then-`hide`) in every language, but the condition
  // raw is reconstructed from the token stream via joinTokenText, which only
  // normalizes `kind === 'keyword'` tokens. The translated `matches` operator
  // (`일치` / `соответствует` / `відповідає`) was an IDENTIFIER — no profile defined
  // `matches` — so the raw stayed `target 일치 .modal-backdrop`, which the core
  // expression parser (English operators only) can't evaluate; the condition was
  // unevaluable and modal-close-backdrop dropped its then-branch at runtime.
  // Adding `matches` to the ko/ru/uk profiles makes it tokenize as a keyword so the
  // raw normalizes to the en-identical `target matches .modal-backdrop`. Parse-level
  // action set is unchanged (still if + hide); only execution fidelity moved (the
  // lossy-but-faithful gap R2 exists to catch). Cleared modal-close-backdrop in ko,
  // ru, uk (6→3 failing; only hi/qu/zh remain, each blocked by a separate bug —
  // hi `मेल_खाता` underscore-split, qu `punta`→`pun`/`ta` split, zh compound-collapse).
  function findConditional(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'conditional') return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const found = findConditional(x);
          if (found) return found;
        }
      }
    }
    return null;
  }
  const condText = (c: Record<string, unknown>): string =>
    ((c.roles as Map<string, { raw?: string }>).get('condition')?.raw ?? '') as string;

  // The corpus surface form per language (freshly populated). `matches` is the only
  // word being keyword-ified here; it appears in exactly two patterns
  // (modal-close-backdrop, focus-trap), both as the comparison operator.
  const cases: Array<[string, string]> = [
    ['ko', '클릭 할 때 만약 대상 일치 .modal-backdrop .modal-backdrop 를 숨기다 끝'],
    ['ru', 'при клик если цель соответствует .modal-backdrop скрыть .modal-backdrop конец'],
    ['uk', 'при клік якщо ціль відповідає .modal-backdrop сховати .modal-backdrop кінець'],
    // zh joined the club once the `当…时` circumfix fix (S2 wave 1) let its body
    // fold at all; `匹配`→matches was the second half (S2 wave 2).
    ['zh', '当 点击 时 如果 目标 匹配 .modal-backdrop 隐藏 把 .modal-backdrop 结束'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] the folded condition normalizes to en-identical \`target matches .modal-backdrop\``, () => {
      const c = findConditional(parse(input, lang as 'ko'));
      expect(c, 'conditional folded').not.toBeNull();
      expect(condText(c!)).toBe('target matches .modal-backdrop');
    });
  }

  it('[en] the en reference condition is unchanged', () => {
    const c = findConditional(
      parse('on click if target matches .modal-backdrop hide .modal-backdrop end', 'en')
    );
    expect(c).not.toBeNull();
    expect(condText(c!)).toBe('target matches .modal-backdrop');
  });
});

describe('de `nächstgelegene` → closest disambiguation (R2 wave 13)', () => {
  // German `nächste` is genuinely ambiguous (next/nearest). The de i18n dict
  // emitted it for BOTH `next` and `closest`, and the german tokenizer
  // deliberately normalizes `nächste`→next (last-wins; a second closest entry
  // would shadow the positional-capable `next`). So a translated `closest .X`
  // surfaced as `next .X` (or, where next isn't positional in that slot, dropped
  // to `me`) and the wrong element was targeted at runtime. The dict now emits
  // the unambiguous `nächstgelegene` ("nearest-located") for closest, and the
  // tokenizer maps it →closest — distinct word, no shadowing of next. Cleared de
  // on accordion-exclusive, closest-ancestor, modal-close-button (de now 0
  // execution failures). Parse-level unchanged (the captured positional `raw`
  // text the runtime reads moved from `next`/`me` to `closest .X`, not the
  // action set). Hand-built minimal de inputs (decoupled from corpus jitter).
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  const roleRaw = (cmd: Record<string, unknown>, role: string): unknown => {
    const roles = cmd.roles as Map<string, { raw?: unknown; value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    const d = m.get(role) as { raw?: unknown; value?: unknown } | undefined;
    return d?.raw ?? d?.value;
  };

  it('toggle destination captures `closest .card` (closest-ancestor shape)', () => {
    const toggle = commands(parse('bei klick umschalten .expanded zu nächstgelegene .card', 'de')).find(
      c => c.action === 'toggle'
    );
    expect(toggle, 'toggle present').toBeTruthy();
    expect(roleRaw(toggle!, 'destination')).toBe('closest .card');
  });

  it('hide patient captures `closest .modal` (modal-close-button shape)', () => {
    const hide = commands(parse('bei klick verstecken nächstgelegene .modal', 'de')).find(
      c => c.action === 'hide'
    );
    expect(hide, 'hide present').toBeTruthy();
    expect(roleRaw(hide!, 'patient')).toBe('closest .modal');
  });

  it('`nächste` still normalizes to next (no shadowing regression)', () => {
    // The positional-capable `next` reading must survive: a distinct closest word
    // means `nächste` is untouched. `put X into next .y` keeps next.
    const put = commands(parse('bei klick setzen "x" in nächste .panel', 'de')).find(
      c => c.action === 'put'
    );
    expect(put, 'put present').toBeTruthy();
    expect(String(roleRaw(put!, 'destination'))).toContain('next');
  });
});

describe('sw/qu `_`-joined positional/conditional surface words (R2 wave 14)', () => {
  // The sw and qu tokenizers split on `_`, so a dict word joined with an
  // underscore tokenizes as `word`/`_`/`word` and never matches its keyword.
  // Two instances cleared by emitting a clean single-token surface form (the
  // established `enyakın` pattern), aligning dict → tokenizer/profile:
  //  - sw closest: `karibu_zaidi` → `karibu` (natural Swahili "near/close", which
  //    the tokenizer already maps to closest; R2 wave 16 — wave 14 first used the
  //    fused `karibuzaidi`, since corrected to the natural single word). The stray
  //    `_ zaidi` had broken positional `closest <sel>` capture, so the destination
  //    defaulted to `me`. Cleared sw accordion-exclusive, closest-ancestor, AND
  //    modal-close-button (`hide closest .modal`).
  //  - qu else: `mana_chayqa` → `manachus` (the profile's existing else word).
  //    The old form tokenized as `mana`(false)/`_`/`chayqa`(then), so no else
  //    keyword formed and qu conditionals never split their else branch. Cleared
  //    qu if-matches, if-condition.
  function commands(node: unknown): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    const walk = (c: unknown) => {
      if (!c || typeof c !== 'object') return;
      const rec = c as Record<string, unknown>;
      if (typeof rec.action === 'string' && !['on', 'compound'].includes(rec.action as string))
        out.push(rec);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
        const ch = rec[f];
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      }
    };
    walk(node);
    return out;
  }
  const roleRaw = (cmd: Record<string, unknown>, role: string): unknown => {
    const roles = cmd.roles as Map<string, { raw?: unknown; value?: unknown }>;
    const m = roles instanceof Map ? roles : new Map(Object.entries((roles as object) ?? {}));
    const d = m.get(role) as { raw?: unknown; value?: unknown } | undefined;
    return d?.raw ?? d?.value;
  };
  function findConditional(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'conditional') return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) { const f2 = findConditional(x); if (f2) return f2; }
    }
    return null;
  }
  const branchActions = (branch: unknown): string[] =>
    Array.isArray(branch) ? (branch as Array<Record<string, unknown>>).map(n => String(n.action)) : [];

  it('[sw] toggle destination captures `closest .card` (natural `karibu`)', () => {
    const toggle = commands(parse('kwenye bonyeza badilisha .expanded kwa karibu .card', 'sw')).find(
      c => c.action === 'toggle'
    );
    expect(toggle, 'toggle present').toBeTruthy();
    expect(roleRaw(toggle!, 'destination')).toBe('closest .card');
  });

  it('[qu] if-matches folds with the else branch (manachus)', () => {
    const c = findConditional(
      parse('ñitiy pi sichus I match .disabled sayay manachus .active ta tikray tukuy', 'qu')
    );
    expect(c, 'conditional folded').not.toBeNull();
    expect(branchActions(c!.thenBranch)).toEqual(['halt']);
    expect(branchActions(c!.elseBranch)).toEqual(['toggle']);
  });
});

describe('hi `मेल खाता` matches operator (R2 wave 15 → natural-form migration)', () => {
  // hi modal-close-backdrop combined the wave-12 (matches not in the profile) and
  // wave-14 (`_`-split) failures: the hi dict emitted `मेल_खाता` for matches, which
  // the hi tokenizer split into मेल/_/खाता, AND no hi profile entry mapped it to
  // `matches`. wave-15 used a concatenated `मेलखाता` (parsed, but unnatural). Now
  // that the base tokenizer matches multi-word profile keywords, this uses the
  // NATURAL spaced `मेल खाता` — condition normalizes to en-identical
  // `target matches .modal-backdrop`.
  function findConditional(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'conditional') return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) { const r = findConditional(x); if (r) return r; }
    }
    return null;
  }
  const condText = (c: Record<string, unknown>): string =>
    ((c.roles as Map<string, { raw?: string }>).get('condition')?.raw ?? '') as string;
  const patientText = (c: Record<string, unknown>): unknown => {
    const t = (c.thenBranch as Array<Record<string, unknown>>)?.[0];
    const roles = t?.roles as Map<string, { value?: unknown; raw?: unknown }>;
    return roles?.get('patient')?.value ?? roles?.get('patient')?.raw;
  };

  it('[hi] folds with en-identical `target matches .modal-backdrop` + clean hide patient', () => {
    const c = findConditional(
      parse('क्लिक पर अगर लक्ष्य मेल खाता .modal-backdrop .modal-backdrop को छिपाएं समाप्त', 'hi')
    );
    expect(c, 'conditional folded').not.toBeNull();
    expect(condText(c!)).toBe('target matches .modal-backdrop');
    expect(patientText(c!)).toBe('.modal-backdrop');
  });
});

describe('generalized multi-word keyword tokenization (base-tokenizer)', () => {
  // The base tokenizer now matches the longest space-containing profile keyword
  // at a word boundary BEFORE the per-language extractors (profile-driven, not a
  // per-language hardcoded list). Natural spaced multi-word keywords tokenize as
  // ONE keyword across all languages — replacing the underscore/concatenation
  // workarounds. Marker/modifier concepts are excluded (handled positionally),
  // so e.g. id `ke dalam` (into) stays split and the destination marker `ke`
  // survives for the put pattern.
  const norm = (lang: string, text: string): string[] => {
    const toks = getTokenizer(lang as 'en').tokenize(text).tokens as Array<{
      value: string;
      normalized?: string;
    }>;
    return toks.map(t => t.normalized ?? t.value);
  };

  // Command verbs / control-flow / event names: one keyword, correct normalized.
  const oneKeyword: Array<[string, string, string]> = [
    ['es', 'tecla abajo', 'keydown'],
    ['he', 'כל עוד', 'while'],
    ['he', 'ברירת מחדל', 'default'],
    ['bn', 'তৈরি করুন', 'make'],
    ['bn', 'চালিয়ে যান', 'continue'],
    ['tr', 'üzerine gelme', 'hover'],
    ['qu', 'mana waqtalla', 'async'],
    ['vi', 'chuyển đổi', 'toggle'],
    ['vi', 'với mỗi', 'for'],
    ['hi', 'के लिए', 'for'],
    ['hi', 'मेल खाता', 'matches'], // natural spaced matches (no more मेलखाता concat)
    // Task #10 Phase B: `before`/`after`/`until` are pattern literals (matched by
    // `matchLiteralToken` via value/normalized), not role markers, so they were
    // removed from MARKER_CONCEPT_NORMALIZEDS and now tokenize as ONE base keyword
    // — the profile-driven replacement for the hindi/vietnamese hardcoded compound
    // lists deleted in Phase C.
    ['hi', 'से पहले', 'before'],
    ['hi', 'के बाद', 'after'],
    ['vi', 'trước khi', 'before'],
    ['vi', 'sau khi', 'after'],
    ['vi', 'cho đến khi', 'until'],
    // Task #10 Phase C: vi wait/exit gained spaced alternatives so the base
    // mechanism covers them and the vietnamese extractor list could be retired.
    ['vi', 'chờ đợi', 'wait'],
    ['vi', 'thoát ra', 'exit'],
  ];
  for (const [lang, phrase, want] of oneKeyword) {
    it(`[${lang}] "${phrase}" → single keyword \`${want}\``, () => {
      expect(norm(lang, phrase)).toEqual([want]);
    });
  }

  it('[id] marker concept `ke dalam` (into) stays split so the `ke` destination marker survives', () => {
    // `into` is a positional marker concept — excluded from multi-word matching.
    // The destination roleMarker `ke` must remain a separate token for the put pattern.
    const toks = norm('id', 'ke dalam');
    expect(toks[0]).toBe('destination'); // `ke` → destination marker
    expect(toks).not.toEqual(['into']);
  });

  // Task #10 Phase C: the per-language hardcoded compound allowlists are gone.
  // The base tokenizer's `tryMultiWordKeyword` covers every non-marker phrase; the
  // few genuine marker phrases with no profile keyword keep a minimal extractor.
  describe('Task #10 Phase C — hardcoded compound lists retired', () => {
    it('[hi] before/after/while/for/else come from the base mechanism (keyword extractor allowlist deleted)', () => {
      // These were in HindiKeywordExtractor's deleted compound array; the base
      // `tryMultiWordKeyword` now emits them as one keyword with the right normalized.
      expect(norm('hi', 'से पहले')).toEqual(['before']);
      expect(norm('hi', 'के बाद')).toEqual(['after']);
      expect(norm('hi', 'जब तक')).toEqual(['while']);
      expect(norm('hi', 'के लिए')).toEqual(['for']);
      expect(norm('hi', 'नहीं तो')).toEqual(['else']);
    });

    it('[hi] `के साथ`/`के बारे में` (no profile keyword) still match as one token via HindiParticleExtractor', () => {
      // These two marker/relational phrases are NOT profile keywords, so the base
      // mechanism cannot emit them — the trimmed HindiParticleExtractor keeps them.
      const withToks = getTokenizer('hi').tokenize('के साथ #x').tokens as Array<{ value: string }>;
      expect(withToks[0].value).toBe('के साथ');
      const aboutToks = getTokenizer('hi').tokenize('के बारे में #x').tokens as Array<{
        value: string;
      }>;
      expect(aboutToks[0].value).toBe('के बारे में');
    });

    it('[vi] the retired ~80-entry list is covered by the base mechanism', () => {
      // A representative spread across categories that used to live in the extractor.
      expect(norm('vi', 'chuyển đổi')).toEqual(['toggle']);
      expect(norm('vi', 'hiển thị')).toEqual(['show']);
      expect(norm('vi', 'với mỗi')).toEqual(['for']);
      expect(norm('vi', 'trước khi')).toEqual(['before']);
      expect(norm('vi', 'cho đến khi')).toEqual(['until']);
    });

    it('[vi] `vào trong` (into) and `sự kiện` (event) stay one token via the trimmed extractor', () => {
      // The only two phrases the base mechanism MUST exclude (marker concepts).
      expect(norm('vi', 'vào trong')).toEqual(['into']);
      expect(norm('vi', 'sự kiện')).toEqual(['event']);
    });
  });

  it('[hi] modal-close-backdrop folds with natural `मेल खाता` matches', () => {
    const c = (function find(n: unknown): Record<string, unknown> | null {
      if (!n || typeof n !== 'object') return null;
      const r = n as Record<string, unknown>;
      if (r.kind === 'conditional') return r;
      for (const f of ['body', 'thenBranch', 'elseBranch']) {
        const ch = r[f];
        if (Array.isArray(ch)) for (const x of ch) { const got = find(x); if (got) return got; }
      }
      return null;
    })(parse('क्लिक पर अगर लक्ष्य मेल खाता .modal-backdrop .modal-backdrop को छिपाएं समाप्त', 'hi'));
    expect(c).not.toBeNull();
    const cond = (c!.roles as Map<string, { raw?: string }>).get('condition')?.raw;
    expect(cond).toBe('target matches .modal-backdrop');
  });
});

describe('zh circumfix `当 {event} 时` event wrapper (S2 — fused-event compound-collapse)', () => {
  // The zh i18n transformer wraps every event handler in the `当…时` (when…then)
  // circumfix: `当 点击 时 <body>`. The hand-crafted event patterns only covered
  // the leading `当` (`event-zh-standard` = `当 {event}`), so the trailing `时`
  // leaked into the body. For a single-command body that is harmless — parseClause
  // skips the stray `时` — but it stopped the conditional fold from firing:
  // `parseBodyWithClauses` folds a leading `if`/`unless` ONLY at clause-start
  // (`currentClauseTokens.length === 0`), and the orphaned `时` pushed the `如果`
  // off clause-start, so the whole `if … end` block collapsed into a flat
  // `compound` (the §7n/§7r zh "compound-collapse"; the condition was lost and the
  // then/else branches flattened into siblings). Adding the circumfix pattern
  // `当 {event} 时 {body}` (priority 106, above `event-zh-standard`) consumes the
  // `时` so the body starts cleanly at `如果` and the fold runs. Cleared zh
  // if-condition, if-exists, if-matches (execution 32→29); modal-close-backdrop
  // also folds now but stays failing until zh gets a `matches` operator (next).
  function findConditional(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'conditional') return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const found = findConditional(x);
          if (found) return found;
        }
      }
    }
    return null;
  }
  const actionsOf = (c: Record<string, unknown>, branch: 'thenBranch' | 'elseBranch'): string[] =>
    ((c[branch] as Array<{ action?: string }> | undefined) ?? []).map(n => n.action ?? '');

  it('[zh] if-condition folds into a conditional with then=[remove] else=[add]', () => {
    const c = findConditional(
      parse('当 点击 时 如果 I match .active 那么 移除 把 .active 否则 添加 把 .active 结束', 'zh')
    );
    expect(c, 'conditional folded (not a flat compound)').not.toBeNull();
    expect(actionsOf(c!, 'thenBranch')).toEqual(['remove']);
    expect(actionsOf(c!, 'elseBranch')).toEqual(['add']);
  });

  it('[zh] if-matches folds into a conditional with then=[halt] else=[toggle]', () => {
    const c = findConditional(
      parse('当 点击 时 如果 I match .disabled 停止 否则 切换 把 .active 结束', 'zh')
    );
    expect(c, 'conditional folded').not.toBeNull();
    expect(actionsOf(c!, 'thenBranch')).toEqual(['halt']);
    expect(actionsOf(c!, 'elseBranch')).toEqual(['toggle']);
  });

  it('[zh] if-exists folds with the make+put else branch', () => {
    const c = findConditional(
      parse(
        '当 点击 时 如果 #modal 存在 显示 把 #modal 否则 制作 把 a <div#modal/> 那么 把 它 放置 到 主体 结束',
        'zh'
      )
    );
    expect(c, 'conditional folded').not.toBeNull();
    expect(actionsOf(c!, 'thenBranch')).toEqual(['show']);
    expect(actionsOf(c!, 'elseBranch')).toEqual(['make', 'put']);
  });

  it('[zh] a simple (non-conditional) `当…时` body still parses — the 时 is consumed, not leaked', () => {
    const node = parse('当 点击 时 切换 把 .active', 'zh') as { body?: Array<{ action?: string }> };
    const body = node.body ?? [];
    expect(body.map(n => n.action)).toEqual(['toggle']);
  });
});

describe('ms put-with-`ia` — marker keyword after a pronoun (S2 — make-element)', () => {
  // `letak ia ke #container` (put it into #container) dropped its whole put while
  // `letak itu ke #container` (put that …) parsed, with near-identical tokens. `ia`
  // (it) tokenizes as a possessive base, and the possessive matcher greedily read
  // the FOLLOWING role-marker `ke` as the possessive's property — `ke` normalizes
  // to the concept `destination`, which the structural-keyword guard (English
  // surface prepositions only) didn't catch. So `ia ke` became the phantom
  // possessive `it.ke`, the literal `ke` then failed, and the put dropped (the §10
  // ms put-with-`ia` bug; same for `saya`=me). The fix rejects a possessive
  // property head whose normalized form is a role-marker concept
  // (destination/source/…). Cleared ms make-element (execution 28→27).
  const roleOf = (
    n: { roles?: Map<string, { type?: string; value?: unknown }> },
    role: string
  ): { type?: string; value?: unknown } | undefined => n.roles?.get(role);

  it('[ms] `letak ia ke #container` parses as put it→#container (was dropped)', () => {
    const n = parse('letak ia ke #container', 'ms') as {
      action?: string;
      roles?: Map<string, { type?: string; value?: unknown }>;
    };
    expect(n.action).toBe('put');
    expect(roleOf(n, 'patient')).toMatchObject({ type: 'reference', value: 'it' });
    expect(roleOf(n, 'destination')).toMatchObject({ type: 'selector', value: '#container' });
  });

  it('[ms] `letak saya ke #container` parses as put me→#container', () => {
    const n = parse('letak saya ke #container', 'ms') as {
      action?: string;
      roles?: Map<string, { type?: string; value?: unknown }>;
    };
    expect(n.action).toBe('put');
    expect(roleOf(n, 'patient')).toMatchObject({ type: 'reference', value: 'me' });
  });

  it('[ms] make-element body is make + put (the trailing put is reclaimed)', () => {
    const n = parse(
      'apabila click buat a <div.card/> kemudian letak ia ke #container',
      'ms'
    ) as { body?: Array<{ action?: string }> };
    expect((n.body ?? []).map(c => c.action)).toEqual(['make', 'put']);
  });

  it('[en] a genuine possessive property head is still read as a property-path (no regression)', () => {
    const n = parse('put my value into #x', 'en') as {
      roles?: Map<string, { type?: string }>;
    };
    expect(n.roles?.get('patient')?.type).toBe('property-path');
  });
});

describe('per-language `at end of` position noun (S2 — zh make-toast)', () => {
  // make-toast's third clause is `put it at end of body`, which ATTACHES the made
  // toast (without it the div is detached → no effect). The zh PUT_AT_END pattern
  // (`放置 把 {patient} 在 结束 的 {destination}`) parses it fine STANDALONE, but
  // inside the then-chained body the clause splitter chopped it: zh `结束` (end)
  // tokenizes as a `keyword`, so parseBodyWithClauses' `end`-terminator break
  // fired mid-phrase. The position-noun guard that suppresses that break only knew
  // the English `at … of` sandwich; generalizing it to the per-language at/of
  // words (zh `在 … 的`, via PUT_AT_END) keeps the `结束` from terminating the
  // clause. Cleared zh make-toast (execution 27→26).
  it('[zh] make-toast keeps all three clauses (make, put, put-at-end)', () => {
    const node = parse(
      "当 点击 时 制作 把 a <div.toast/> 那么 把 'Saved!' 放置 到 它 那么 放置 把 它 在 结束 的 主体",
      'zh'
    ) as { body?: Array<{ kind?: string; action?: string; statements?: Array<{ action?: string }> }> };
    // The body is a then-chained compound; flatten its statements.
    const flat = (node.body ?? []).flatMap(n =>
      n.kind === 'compound' ? (n.statements ?? []) : [n]
    );
    expect(flat.map(n => n.action)).toEqual(['make', 'put', 'put']);
  });

  it('[zh] the `结束` inside `在 结束 的` is the position noun, not a block end', () => {
    const n = parse('放置 把 它 在 结束 的 主体', 'zh') as {
      action?: string;
      roles?: Map<string, { value?: unknown }>;
    };
    expect(n.action).toBe('put');
    expect(n.roles?.get('manner')).toMatchObject({ value: 'at end of' });
  });

  it('[ms] `letak ia di tamat daripada badan` parses (at-end connective not eaten as possessive)', () => {
    // `di` is the ms at-end connective (a bare identifier, no normalized concept),
    // so the possessive matcher used to read `ia di` as the phantom possessive
    // `it.di` and drop the put. Rejecting at-end connective property heads keeps
    // `ia` a bare patient. This is make-toast's attaching third clause.
    const n = parse('letak ia di tamat daripada badan', 'ms') as {
      action?: string;
      roles?: Map<string, { type?: string; value?: unknown }>;
    };
    expect(n.action).toBe('put');
    expect(n.roles?.get('patient')).toMatchObject({ type: 'reference', value: 'it' });
    expect(n.roles?.get('manner')).toMatchObject({ value: 'at end of' });
  });
});

describe('hi set-family marker alignment (S6 — fronted target before event)', () => {
  // hi fronts set's TARGET before the event: `मेरा.textContent को क्लिक पर सेट
  // "Done!" में`. The transformer marks the target with को and the value with में
  // — INVERTED from the hi profile defaults (destination=में, patient=को) — but the
  // set schema had no `hi` markerOverride, so the generated hi set patterns carried
  // the swapped markers, matched no corpus, and the whole set-family fell to the
  // `event-hi-bare` fallback (which captured the fronted target as the EVENT).
  // Adding markerOverride.hi = {destination:'को', patient:'में'} lets the existing
  // `set-event-hi-sov-2role-dest-first` pattern match. Cleared hi set-text,
  // set-inner-html, set-style, set-attribute (execution 25→21).
  const setBody = (code: string) => {
    const n = parse(code, 'hi') as { body?: Array<{ action?: string; roles?: Map<string, { type?: string; value?: unknown; object?: unknown; property?: unknown }> }> };
    return (n.body ?? [])[0];
  };

  it('[hi] set-text: destination=me.textContent property-path, patient="Done!"', () => {
    const cmd = setBody('मेरा.textContent को क्लिक पर सेट "Done!" में');
    expect(cmd?.action).toBe('set');
    expect(cmd?.roles?.get('destination')).toMatchObject({ type: 'property-path', property: 'textContent' });
    expect(cmd?.roles?.get('patient')).toMatchObject({ type: 'literal', value: 'Done!' });
  });

  it('[hi] set-style: destination=me.*background property-path, patient="red"', () => {
    const cmd = setBody('मेरा *background को क्लिक पर सेट "red" में');
    expect(cmd?.action).toBe('set');
    expect(cmd?.roles?.get('destination')).toMatchObject({ type: 'property-path' });
    expect(cmd?.roles?.get('patient')).toMatchObject({ type: 'literal', value: 'red' });
  });

  it('[hi] set-attribute: destination=@disabled, patient=true', () => {
    const cmd = setBody('@disabled को क्लिक पर सेट सच में') as
      | { action?: string; roles?: Map<string, { raw?: string; value?: unknown }> }
      | undefined;
    expect(cmd?.action).toBe('set');
    expect(cmd?.roles?.get('destination')?.raw).toBe('@disabled');
    expect(cmd?.roles?.get('patient')?.value).toBe('true');
  });
});

describe('hi verb-medial put in fused event bodies (S6 — make-element/make-toast)', () => {
  // The hi transformer emits put VERB-MEDIAL inside a fused event body's
  // then-clause: `… बनाएं फिर यह को रखें #container में` — रखें sits BETWEEN the
  // patient and the destination, unlike the standalone verb-FINAL
  // `{patient} को {destination} में रखें`. No hi put pattern covered that order, so
  // the clause fell to `put-hi-bare` (`रखें {patient}`), which grabbed the
  // DESTINATION (#container) as the patient and defaulted the destination to `me`.
  // Adding `put-hi-verb-medial` (`{patient} को रखें {destination} में`) restores
  // the roles. Cleared hi make-element + make-toast (execution 21→19).
  const bodyOf = (code: string) => {
    const n = parse(code, 'hi') as {
      body?: Array<{ action?: string; roles?: Map<string, { type?: string; value?: unknown }> }>;
    };
    return n.body ?? [];
  };

  it('[hi] make-element: put it→#container (was patient=#container, dest=me)', () => {
    const body = bodyOf('a <div.card/> को क्लिक पर बनाएं फिर यह को रखें #container में');
    expect(body.map(c => c.action)).toEqual(['make', 'put']);
    const put = body[1];
    expect(put?.roles?.get('patient')).toMatchObject({ type: 'reference', value: 'it' });
    expect(put?.roles?.get('destination')).toMatchObject({ type: 'selector', value: '#container' });
  });

  it('[hi] make-toast: make + put(Saved!→it) + put(it→body, at end of)', () => {
    const body = bodyOf(
      "a <div.toast/> को क्लिक पर बनाएं फिर 'Saved!' को रखें यह में फिर यह पर समाप्त का बॉडी को रखें"
    );
    expect(body.map(c => c.action)).toEqual(['make', 'put', 'put']);
    expect(body[1]?.roles?.get('patient')).toMatchObject({ type: 'literal', value: 'Saved!' });
    expect(body[1]?.roles?.get('destination')).toMatchObject({ type: 'reference', value: 'it' });
    expect(body[2]?.roles?.get('manner')).toMatchObject({ value: 'at end of' });
  });
});

describe('qu reference alignment to dict surface forms (qu tokenizer arc, wave 1)', () => {
  // The qu semantic profile carried formal/alternate spellings (me=ñuqa,
  // target=ñawpaqman, body=ukhu, it=pay) that appear in ZERO corpus rows — the
  // i18n dict emits noqa/punta/kurku/chay. So the put destination (`noqa man`),
  // the matches-condition target (`punta` — which the tokenizer then SPLIT into
  // `pun`+`ta`-accusative because it wasn't a known word), and the DOM body
  // (`kurku`) never resolved. Aligning references to the dict forms (§7l) fixed
  // all four — and made `punta` tokenize whole, so the "accusative over-stripping"
  // was really an unknown-word artifact. Cleared modal-open, modal-close-button,
  // modal-close-backdrop, put-content-basic (execution 19→15).
  const firstBody = (code: string) => {
    const n = parse(code, 'qu') as {
      body?: Array<{ action?: string; roles?: Map<string, { type?: string; value?: unknown; raw?: string }> }>;
    };
    return n.body ?? [];
  };

  it('[qu] put-content: `noqa man` resolves the destination to me', () => {
    const put = firstBody('"Done!" ta noqa man ñitiy pi churay').find(c => c.action === 'put');
    expect(put?.roles?.get('destination')).toMatchObject({ value: 'me' });
  });

  it('[qu] modal-open: `kurku man` resolves the add destination to body', () => {
    const add = firstBody('#modal ta ñitiy pi rikuchiy chayqa .modal-open ta kurku man yapay').find(
      c => c.action === 'add'
    );
    expect(add?.roles?.get('destination')).toMatchObject({ value: 'body' });
  });

  it('[qu] modal-close-button: `kurku manta` resolves the remove source to body', () => {
    const remove = firstBody(
      'kaylla .modal ta ñitiy pi pakay chayqa .modal-open ta kurku manta qichuy'
    ).find(c => c.action === 'remove');
    expect(remove?.roles?.get('source')).toMatchObject({ value: 'body' });
  });

  it('[qu] modal-close-backdrop: `punta` tokenizes whole (target), not pun+ta', () => {
    const node = parse('ñitiy pi sichus punta tupan .modal-backdrop .modal-backdrop ta pakay tukuy', 'qu');
    const cond = (function find(n: unknown): Record<string, unknown> | null {
      if (!n || typeof n !== 'object') return null;
      const r = n as Record<string, unknown>;
      if (r.kind === 'conditional') return r;
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
        const c = r[f];
        if (Array.isArray(c)) for (const x of c) { const got = find(x); if (got) return got; }
      }
      return null;
    })(node);
    expect(cond).not.toBeNull();
    const raw = (cond!.roles as Map<string, { raw?: string }>).get('condition')?.raw ?? '';
    expect(raw.startsWith('target ')).toBe(true);
  });
});

describe('qu `cheqaq` → true boolean literal (qu arc wave 2 — set-attribute)', () => {
  // The qu tokenizer EXTRAS mapped only arí/ari ("yes") to `true`, but the i18n
  // dict emits `cheqaq` ("true/correct") — set-attribute `@disabled ta cheqaq man
  // …`. So the value tokenized as a bare identifier and `set @disabled to
  // <undefined>` ran. Adding cheqaq→true to the tokenizer aligns it. Cleared qu
  // set-attribute (execution 15→14).
  it('[qu] set-attribute: cheqaq resolves to the boolean true', () => {
    const n = parse('@disabled ta cheqaq man ñitiy pi churanay', 'qu') as {
      body?: Array<{ action?: string; roles?: Map<string, { value?: unknown }> }>;
    };
    const set = (n.body ?? []).find(c => c.action === 'set');
    expect(set?.roles?.get('patient')?.value).toBe('true');
  });
});

describe('qu make-toast: single-quote strings + fused-body at-end (qu arc wave 3)', () => {
  // make-toast qu (`… 'Saved!' ta chay man churay … chay pi tukuy pa kurku ta
  // churay`) needed three fixes: (1) the qu string extractor only accepted `"`,
  // so the single-quoted `'Saved!'` tokenized as `'Saved`+`!`+`'` — now `'` is
  // accepted (safe: Quechua apostrophes are mid-word, never at a token start);
  // (2) the fused make-event body routes through parseBodyWithGrammarPatterns,
  // whose `end`-keyword break lacked the isAtEndPositionNoun guard, so `tukuy`
  // (end) chopped the attaching at-end put — guard mirrored from
  // parseBodyWithClauses; (3) `case 'qu'` in getPutPatternsForLanguage didn't
  // spread `...atEnd`, so PUT_AT_END never generated `put-qu-at-end`. Cleared qu
  // make-toast (execution 14→13) — qu fully clear.
  it('[qu] single-quoted string `\x27Saved!\x27` tokenizes as one string literal', () => {
    const toks = getTokenizer('qu').tokenize("'Saved!' ta").tokens;
    expect(toks[0]?.value).toBe("'Saved!'");
  });

  it('[qu] make-toast parses make + put(Saved!→it) + put(it→body, at end of)', () => {
    const n = parse(
      "a <div.toast/> ta ñitiy pi ruray chayqa 'Saved!' ta chay man churay chayqa chay pi tukuy pa kurku ta churay",
      'qu'
    ) as {
      body?: Array<{ action?: string; roles?: Map<string, { value?: unknown; raw?: string }> }>;
    };
    const body = n.body ?? [];
    expect(body.map(c => c.action)).toEqual(['make', 'put', 'put']);
    // The single-quoted literal now tokenizes whole (was `'Saved`+`!`+`'`); the
    // put captures it as an expression whose raw carries the Saved! text.
    const p1 = body[1]?.roles?.get('patient');
    expect(String(p1?.raw ?? p1?.value)).toContain('Saved!');
    expect(body[1]?.roles?.get('destination')).toMatchObject({ value: 'it' });
    expect(body[2]?.roles?.get('patient')).toMatchObject({ value: 'it' });
    expect(body[2]?.roles?.get('destination')).toMatchObject({ value: 'body' });
    expect(body[2]?.roles?.get('manner')).toMatchObject({ value: 'at end of' });
  });
});

describe('uk make-toast: apostrophe-as-letter no longer eats string quotes (R2 tails batch)', () => {
  // The Ukrainian CyrillicKeywordExtractor's char class includes the apostrophe
  // because it is an internal Ukrainian letter (п'ять, об'єкт). canExtract
  // therefore matched the OPENING quote of a string literal, so `'Saved!'`
  // tokenized as `'Saved` + `!` + `'`. That scrambled the make-toast fused body
  // (make + put + put): the trailing `put it at end of body` lost its position
  // role and threw `put requires content and position` at runtime. The fix
  // rejects a LEADING apostrophe in canExtract (an apostrophe is never
  // word-initial in Ukrainian); internal apostrophes still tokenize via the
  // extract loop's isIdentifierChar. Cleared uk make-toast (execution −1).
  it('[uk] single-quoted string `\x27Saved!\x27` tokenizes as one string literal', () => {
    const toks = getTokenizer('uk')!.tokenize("покласти 'Saved!' в це").tokens;
    const lit = toks.find(t => t.value.startsWith("'"));
    expect(lit?.value).toBe("'Saved!'");
  });

  it('[uk] internal apostrophe (п\x27ять, об\x27єкт) still tokenizes whole (no regression)', () => {
    const toks = getTokenizer('uk')!.tokenize("п'ять об'єкт").tokens;
    expect(toks.map(t => t.value)).toEqual(["п'ять", "об'єкт"]);
  });

  it('[uk] make-toast parses make + put(Saved!→it) + put(it→body, at end of)', () => {
    const n = parse(
      "при клік створити a <div.toast/> тоді покласти 'Saved!' в це тоді покласти це в кінець з тіло",
      'uk'
    ) as {
      body?: Array<{ action?: string; roles?: Map<string, { value?: unknown; raw?: string }> }>;
    };
    const body = n.body ?? [];
    expect(body.map(c => c.action)).toEqual(['make', 'put', 'put']);
    const p1 = body[1]?.roles?.get('patient');
    expect(String(p1?.raw ?? p1?.value)).toContain('Saved!');
    expect(body[1]?.roles?.get('destination')).toMatchObject({ value: 'it' });
    expect(body[2]?.roles?.get('patient')).toMatchObject({ value: 'it' });
    expect(body[2]?.roles?.get('destination')).toMatchObject({ value: 'body' });
    expect(body[2]?.roles?.get('manner')).toMatchObject({ value: 'at end of' });
  });
});

describe('it remove `da X` is the source, not destination (R2 tails batch)', () => {
  // The hand-crafted remove-it-full/simple patterns labeled the trailing
  // `da {X}` group as `destination`. The removeMapper reads `source` ONLY, so
  // `rimuovere .modal-open da corpo` silently removed from `me` (#btn) instead
  // of body — the body effect vanished (it modal-close-button R2 cell). Every
  // other language's remove pattern uses `source`; aligned it to match.
  it('[it] `rimuovere .modal-open da corpo` resolves source=body', () => {
    const n = parse('rimuovere .modal-open da corpo', 'it') as {
      action?: string;
      roles?: Map<string, { value?: unknown }>;
    };
    expect(n.action).toBe('remove');
    expect(n.roles?.get('source')).toMatchObject({ value: 'body' });
    expect(n.roles?.get('destination')).toBeUndefined();
  });

  it('[it] bare `rimuovere .x` defaults source=me (not destination)', () => {
    const n = parse('rimuovere .highlight', 'it') as {
      roles?: Map<string, { value?: unknown }>;
    };
    expect(n.roles?.get('source')).toMatchObject({ value: 'me' });
  });
});

describe('th add destination: positional phrase captured (R2 tails batch)', () => {
  // The hand-crafted th add patterns were redundant and harmful: add-th-simple
  // (no destination) was priority 100, ABOVE add-th-with-dest (95), so it
  // shadowed the destination clause; and add-th-with-dest used a fixed
  // `position: 3` extraction that grabs a single token, dropping multi-token
  // positional destinations like `ใกล้สุด .accordion-item` (closest
  // .accordion-item). Removing them lets the generated marker-based pattern
  // route the destination through tryMatchPositionalExpression — exactly like
  // English. Clears th accordion-exclusive.
  it('[th] add `ใน ใกล้สุด .accordion-item` → destination closest expression', () => {
    const n = parse(
      'เมื่อ คลิก เพิ่ม .open ใน ใกล้สุด .accordion-item',
      'th'
    ) as { body?: Array<{ action?: string; roles?: Map<string, { type?: string; raw?: string }> }> };
    const add = (n.body ?? []).find(c => c.action === 'add');
    expect(add?.roles?.get('destination')).toMatchObject({
      type: 'expression',
      raw: 'closest .accordion-item',
    });
  });

  it('[th] plain-selector and bare add destinations still resolve', () => {
    const withDest = parse('เพิ่ม .selected ใน #item', 'th') as {
      roles?: Map<string, { value?: unknown }>;
    };
    expect(withDest.roles?.get('destination')).toMatchObject({ value: '#item' });
    const bare = parse('เพิ่ม .highlight', 'th') as { roles?: Map<string, { value?: unknown }> };
    expect(bare.roles?.get('destination')).toMatchObject({ value: 'me' });
  });
});

// =============================================================================
// R2 structural tails — batch 2 (10 → 5 execution cells). Each cell is a distinct
// per-language mechanism; see docs-internal/STRUCTURAL_ARCS_ROADMAP.md.
// =============================================================================

import { buildAST } from '../src';

/** Collect command names (the AST action set) by walking the built AST. */
function astActions(node: unknown, acc: string[] = []): string[] {
  if (!node || typeof node !== 'object') return acc;
  const rec = node as Record<string, unknown>;
  if (typeof rec.name === 'string' && (rec.type === 'command' || rec.type === 'eventHandler')) {
    acc.push(rec.name);
  }
  for (const k of Object.keys(rec)) astActions(rec[k], acc);
  return acc;
}

/** Find the first built-AST command node with the given name. */
function findAstCommand(node: unknown, name: string): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const rec = node as Record<string, unknown>;
  if (rec.name === name && rec.type === 'command') return rec;
  for (const k of Object.keys(rec)) {
    const r = findAstCommand(rec[k], name);
    if (r) return r;
  }
  return null;
}

describe('tr set-attribute — doğru-as-particle + dative allomorph (R2 batch 2)', () => {
  // Two bugs dropped the value of `set @attr to true`: (1) `doğru` ("true") was a
  // POSTPOSITION ("towards") classified before the keyword check, so it tokenized
  // as kind='particle' which tokenToSemanticValue can't convert; (2) the dative
  // allomorph `ya` (the i18n transformer's vowel-harmony form) wasn't a marker
  // alternative. Both fixed → set-event-tr-sov-2role matches.
  const corpus = 'tıklama da @disabled i doğru ya ayarla';

  it('[tr] doğru tokenizes as a value, not a postposition particle', () => {
    const toks = getTokenizer('tr').tokenize('doğru').tokens;
    expect(toks[0].kind).not.toBe('particle');
    expect(toks[0].normalized).toBe('true');
  });

  it('[tr] set @disabled to true captures destination + value', () => {
    const ast = buildAST(parse(corpus, 'tr'));
    const set = findAstCommand(ast.ast, 'set');
    expect(set).not.toBeNull();
    const roles = set!.semanticRoles as Record<string, { type?: string; attributeName?: string }>;
    expect(roles.destination).toMatchObject({ type: 'attributeAccess', attributeName: 'disabled' });
    expect(roles.event).toBeUndefined(); // not the role-scrambling SOV fallback
  });
});

describe('ja put-content-basic — event-last SOV two-role wrapper (R2 batch 2)', () => {
  // `"Done!" を 私 に 置く クリック で` places the event phrase AFTER the verb.
  // Without the event-last variant it fell to the bare command pattern (runs at
  // execute() time, before the click → invisible).
  const corpus = '"Done!" を 私 に 置く クリック で';

  it('[ja] parses as an event handler, not a bare command', () => {
    const node = parse(corpus, 'ja') as { kind?: string; metadata?: { patternId?: string } };
    expect(node.kind).toBe('event-handler');
    expect(node.metadata?.patternId).toContain('event-last');
  });

  it('[ja] put captures patient "Done!" and destination me', () => {
    const ast = buildAST(parse(corpus, 'ja'));
    const put = findAstCommand(ast.ast, 'put');
    const roles = put!.semanticRoles as Record<string, { value?: unknown; name?: string }>;
    expect(roles.patient).toMatchObject({ value: 'Done!' });
    expect(roles.destination).toMatchObject({ name: 'me' });
  });
});

describe('id set-style — two-word possessive connector `punya` (R2 batch 2)', () => {
  // The id dict renders "my" as `saya punya` ("I have"); the connector `punya`
  // sits between the possessor (saya→me) and the property and must be skipped.
  const corpus = 'pada klik atur saya punya *background ke "red"';

  it('[id] set my *background captures the property-path destination', () => {
    const ast = buildAST(parse(corpus, 'id'));
    const set = findAstCommand(ast.ast, 'set');
    expect(set).not.toBeNull();
    const roles = set!.semanticRoles as Record<string, { type?: string; property?: string }>;
    expect(roles.destination).toMatchObject({ type: 'propertyAccess', property: '*background' });
  });

  it('[id] single-word possessor (saya *background) still works', () => {
    const set = findAstCommand(buildAST(parse('atur saya *background ke "red"', 'id')).ast, 'set');
    expect(set).not.toBeNull();
  });
});

describe('tr if-matches — condition not truncated at an operator (R2 batch 2)', () => {
  // In SOV the then-verb is clause-final, so `match .disabled durdur` spuriously
  // matched a verb-last halt pattern and truncated the condition `I match
  // .disabled` to just `I`. CONDITION_OPERATORS guards against truncating at a
  // condition operator.
  const corpus = 'tıklama de eğer I match .disabled durdur yoksa .active i değiştir son';

  it('[tr] condition captures the full matches expression', () => {
    const ast = buildAST(parse(corpus, 'tr'));
    const ifn = findAstCommand(ast.ast, 'if');
    const cond = (ifn!.args as Array<{ type?: string; operator?: string }>)[0];
    expect(cond).toMatchObject({ type: 'binaryExpression', operator: 'matches' });
  });

  it('[tr] then=halt, else=toggle preserved', () => {
    expect(astActions(buildAST(parse(corpus, 'tr')).ast)).toEqual(
      expect.arrayContaining(['halt', 'toggle'])
    );
  });
});

describe('hi halt-propagation — leaked `the` before a fronted patient (R2 batch 2)', () => {
  // hi fronts the halt patient: `the घटना को क्लिक पर रोकें फिर …`. The leaked
  // English article made the patient role grab only `the`, so the halt lost its
  // patient (a bare halt stops the handler). skipNoiseWords now skips a leaked
  // `the` before `the <ref-noun> <marker>`.
  const corpus = 'the घटना को क्लिक पर रोकें फिर .active को टॉगल';

  it('[hi] halt keeps its patient (the event) so the handler continues', () => {
    const ast = buildAST(parse(corpus, 'hi'));
    const halt = findAstCommand(ast.ast, 'halt');
    expect((halt!.args as unknown[]).length).toBeGreaterThan(0); // NOT a bare halt
    expect(astActions(ast.ast)).toEqual(expect.arrayContaining(['halt', 'toggle']));
  });

  it('[tr] the skip is gated to a following marker — form-submit-prevent keeps 4 actions', () => {
    // `the olay çağır …` (the event call …) — ref noun followed by a VERB, not a
    // marker, so `the` is NOT skipped (the §7y regression is avoided).
    const fsp =
      'the olay çağır validateForm() i gönder de durdur eğer sonuç dir yanlış "Invalid form" i kaydet son';
    const acts = astActions(buildAST(parse(fsp, 'tr')).ast);
    expect(acts).toEqual(expect.arrayContaining(['halt', 'call', 'if', 'log']));
  });

  it('[en] authored `the` before a reference noun is untouched', () => {
    // en is excluded from the skip — `halt the event` still parses (the en
    // reference must stay byte-identical).
    const halt = findAstCommand(buildAST(parse('halt the event', 'en')).ast, 'halt');
    expect((halt!.args as unknown[]).length).toBeGreaterThan(0);
  });
});

describe('S1 tabs-aria — `set @attr to V on <scope>` scope capture (band inversion)', () => {
  // The en reference itself was lossy: both sets dropped their `on <scope>`
  // modifier, so the visible effect was just `aria-selected=true on #btn`. The
  // scope role (setSchema) + passthrough `on` marker make the en reference, and
  // every translation, write aria-selected to the scope. The strings below are
  // the i18n transformer's tabs-aria output per word order (verified at parse
  // conf 1.00) — they lock the per-word-order scope capture that cleared the
  // cluster. See STRUCTURAL_ARCS_ROADMAP.md (S1) and CORRECTNESS_RELIABILITY_PLAN.md §7bb.

  /** The `on <scope>` of a set command lands on modifiers.on AND semanticRoles.scope. */
  function setScopeOf(code: string, lang: string): { mod?: unknown; role?: unknown } {
    const set = findAstCommand(buildAST(parse(code, lang)).ast, 'set');
    expect(set, `no set command parsed for [${lang}] ${code}`).not.toBeNull();
    const mods = (set!.modifiers ?? {}) as Record<string, unknown>;
    const roles = (set!.semanticRoles ?? {}) as Record<string, unknown>;
    return { mod: mods.on, role: roles.scope };
  }

  it('[en] standalone `set @attr to "false" on .tab` captures scope=.tab', () => {
    const { mod, role } = setScopeOf('set @aria-selected to "false" on .tab', 'en');
    expect(mod).toMatchObject({ value: '.tab' });
    expect(role).toMatchObject({ value: '.tab' });
  });

  it('[en] `on me` scope captures the me reference', () => {
    const { mod } = setScopeOf('set @aria-selected to "true" on me', 'en');
    expect(mod).toMatchObject({ name: 'me' });
  });

  // SVO (es) — verb-first, scope appended at the clause end.
  it('[es] `establecer @attr a "false" on .tab` captures scope=.tab', () => {
    const { role } = setScopeOf('establecer @aria-selected a "false" on .tab', 'es');
    expect(role).toMatchObject({ value: '.tab' });
  });

  // SOV event-handler set — verb-MEDIAL, scope trails (the appended optional
  // `[on {scope}]` group on the fused dest-first pattern).
  it('[ja] event-handler set (verb-medial) captures the trailing scope', () => {
    const { role } = setScopeOf('@aria-selected を クリック で 設定 "false" に on .tab', 'ja');
    expect(role).toMatchObject({ value: '.tab' });
  });

  // SOV standalone then-clause set — emitted verb-LAST with scope before the
  // verb (transformSetWithScope reposition) → generated command pattern.
  it('[ja] standalone set (verb-last) captures scope=me', () => {
    const { mod } = setScopeOf('@aria-selected を "true" に on 私 設定', 'ja');
    expect(mod).toMatchObject({ name: 'me' });
  });

  it('[ko] standalone set (verb-last) captures scope=.tab', () => {
    const { role } = setScopeOf('@aria-selected 를 "false" 에 on .tab 설정', 'ko');
    expect(role).toMatchObject({ value: '.tab' });
  });

  // qu — `{dest} {patient} {event} {verb}` event order: the event is extracted
  // and the body matched as a verb-LAST command, so the scope sits before the
  // clause-final verb.
  it('[qu] event-handler set with clause-final verb captures the scope', () => {
    const { role } = setScopeOf('@aria-selected ta "false" man ñitiy pi on .tab churanay', 'qu');
    expect(role).toMatchObject({ value: '.tab' });
  });

  it('[en] a scope-less set is unaffected (no on modifier)', () => {
    const { mod, role } = setScopeOf('set @disabled to true', 'en');
    expect(mod).toBeUndefined();
    expect(role).toBeUndefined();
  });
});

describe('Multi-statement handler body with a js-bearing nested if (behavior-removable shape)', () => {
  // The removable/sortable behaviors put a nested `if … end` (containing a
  // `js(…) … end` block) FIRST in the handler body, then trailing commands
  // (`trigger …`, `remove me`). Two bugs dropped everything after the nested
  // block in non-English languages:
  //   1. buildEventHandler's fold-rewind only recognized a TOP-LEVEL conditional,
  //      but parseBodyWithClauses wraps a multi-clause body in a `compound` — so
  //      the fold was missed and the flat path dropped the trailing commands.
  //   2. isEndKeyword rejected the English literal `end` for curated languages
  //      (es `fin`, ja `終わり`, …). A masked `js(…) … end` block restores its
  //      terminator as English `end`, so the conditional's depth tracker counted
  //      the js body's `if` (+1) but not the js `end` (−1), unbalancing depth and
  //      over-consuming the rest of the body into the conditional.
  // These inputs mirror what the i18n GrammarTransformer emits for the Removable
  // handler (the js body is masked, so its `end` stays English). Guards the
  // `trigger`/`remove` recall that drove behavior-removable's lossy band.
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

  it('[es] keeps trigger + remove after the js-bearing if (was dropped)', () => {
    const input = [
      'en clic de triggerEl',
      '  si confirmRemoval',
      '    js(me)',
      '      if (!window.confirm("Are you sure?")) return "cancel";',
      '    end',
      '    si ello es "cancel"',
      '      detener',
      '    fin',
      '  fin',
      '  disparar removable:before',
      '  si effect es "fade"',
      '    transición opacity a 0 300ms',
      '  fin',
      '  disparar removable:removed',
      '  quitar yo',
      'fin',
    ].join('\n');
    const node = parse(input, 'es');
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('if')).toBe(true);
    expect(a.has('halt')).toBe(true);
    expect(a.has('trigger')).toBe(true); // disparar — dropped before the fix
    expect(a.has('remove')).toBe(true); // quitar — dropped before the fix
  });

  it('[de] keeps trigger + remove after the js-bearing if (English js `end`)', () => {
    // de end keyword is `ende`; the js block keeps the English `end`. Without the
    // universal-`end` recognition the depth tracker would over-consume here too.
    const input = [
      'bei klick von triggerEl',
      '  falls confirmRemoval',
      '    js(me)',
      '      if (!window.confirm("Are you sure?")) return "cancel";',
      '    end',
      '    falls es ist "cancel"',
      '      anhalten',
      '    ende',
      '  ende',
      '  auslösen removable:before',
      '  falls effect ist "fade"',
      '    übergang opacity zu 0 300ms',
      '  ende',
      '  auslösen removable:removed',
      '  entfernen ich',
      'ende',
    ].join('\n');
    const node = parse(input, 'de');
    expect(node.action).toBe('on');
    const a = actions(node);
    expect(a.has('trigger')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });

  it('[en] reference keeps the full body (unchanged baseline behavior)', () => {
    const input = [
      'on click from triggerEl',
      '  if confirmRemoval',
      '    js(me)',
      '      if (!window.confirm("Are you sure?")) return "cancel";',
      '    end',
      '    if it is "cancel"',
      '      halt',
      '    end',
      '  end',
      '  trigger removable:before',
      '  if effect is "fade"',
      '    transition opacity to 0 over 300ms',
      '  end',
      '  trigger removable:removed',
      '  remove me',
      'end',
    ].join('\n');
    const a = actions(parse(input, 'en'));
    expect(a.has('trigger')).toBe(true);
    expect(a.has('remove')).toBe(true);
    expect(a.has('halt')).toBe(true);
  });
});

describe('js(…) … end blocks are opaque to the body parser (no phantom JS-body commands)', () => {
  // A `js(…) … end` block's body is raw JavaScript. When the block is nested in a
  // handler/conditional body, the clause loop used to split it at its internal
  // `end` and re-parse the JS body through the command patterns, emitting phantom
  // `return`/`if`/… commands. behavior-removable's `js(me) … if (…) return "cancel";
  // … end` injected a spurious `return` into the EN reference action set — which
  // translations (whose js body is masked) could never reproduce, capping removable
  // at fidelity 0.889. The body parser now consumes the whole block as one opaque
  // `js` command, so the JS body never reaches the command patterns. A STANDALONE
  // js block already parsed clean (the main parser stops after the first command);
  // this guards the NESTED case.
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

  const NESTED_JS = [
    'on click',
    '  if confirmRemoval',
    '    js(me)',
    '      if (!window.confirm("Are you sure?")) return "cancel";',
    '    end',
    '    if it is "cancel"',
    '      halt',
    '    end',
    '  end',
    '  remove me',
    'end',
  ].join('\n');

  it('[en] does not extract `return` from a nested js body', () => {
    const a = actions(parse(NESTED_JS, 'en'));
    expect(a.has('js')).toBe(true); // the block itself is captured
    expect(a.has('return')).toBe(false); // …but its raw-JS body is opaque
    expect(a.has('halt')).toBe(true); // real commands after the js block survive
    expect(a.has('remove')).toBe(true);
  });

  it('[es] keeps the js block opaque too (keyword survives translation)', () => {
    // The i18n transformer masks the js body, so the keyword stays English `js`.
    const input = [
      'en clic',
      '  si confirmRemoval',
      '    js(me)',
      '      if (!window.confirm("Are you sure?")) return "cancel";',
      '    end',
      '    si ello es "cancel"',
      '      detener',
      '    fin',
      '  fin',
      '  quitar yo',
      'fin',
    ].join('\n');
    const a = actions(parse(input, 'es'));
    expect(a.has('js')).toBe(true);
    expect(a.has('return')).toBe(false);
    expect(a.has('halt')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
});

describe('Block depth tracking ignores marker/opener homonyms (pt `para`, sw)', () => {
  // The behavior-body splitter tracks `if/unless/repeat/for/while` openers vs `end`
  // to find where the init block and each handler begin. Some languages reuse a
  // block-keyword's surface form for a role marker: Portuguese `para` is BOTH the
  // `for` loop keyword AND the dative "to" marker, so `set triggerEl to me` →
  // `definir triggerEl para eu` had its marker `para` mis-counted as a `for` opener
  // — the depth never returned to 0 at the init's `end`, so the init segment
  // swallowed the whole `on click` handler (eventHandlers empty; trigger/remove
  // dropped). pt/sw behavior-removable were the only SVO languages still lossy
  // (0.625) after the js-opacity fix. The opener check now trusts the tokenizer's
  // normalized role (`destination`) over the colliding surface form.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['initBlock', 'eventHandlers', 'body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('[pt] init block with `set X para me` does not swallow the handler', () => {
    // `para` (set's "to" marker) collides with pt `for`; before the fix it opened a
    // phantom block and the handler was lost.
    const input = [
      'behavior Removable(triggerEl)',
      '  init',
      '    se triggerEl é indefinido',
      '      definir triggerEl para eu',
      '    fim',
      '  fim',
      '  em clique de triggerEl',
      '    disparar removable:before',
      '    remover eu',
      '  fim',
      'fim',
    ].join('\n');
    const node = parse(input, 'pt');
    expect(node.action).toBe('behavior');
    const handlers = (node as { eventHandlers?: unknown[] }).eventHandlers ?? [];
    expect(handlers.length).toBe(1); // the `on click` handler is recognized
    const a = actions(node);
    expect(a.has('set')).toBe(true); // init body survives
    expect(a.has('trigger')).toBe(true); // handler body survives…
    expect(a.has('remove')).toBe(true); // …including the trailing remove
  });

  it('[sw] init block with `seti X kwa me` keeps the handler separate', () => {
    const input = [
      'behavior Removable(triggerEl)',
      '  init',
      '    kama triggerEl ni haijafafanuliwa',
      '      seti triggerEl kwa mimi',
      '    mwisho',
      '  mwisho',
      '  kwenye bonyeza kutoka triggerEl',
      '    chochea removable:before',
      '    ondoa mimi',
      '  mwisho',
      'mwisho',
    ].join('\n');
    const node = parse(input, 'sw');
    expect(node.action).toBe('behavior');
    const handlers = (node as { eventHandlers?: unknown[] }).eventHandlers ?? [];
    expect(handlers.length).toBe(1);
    const a = actions(node);
    expect(a.has('trigger')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });
});

describe('VSO from-first event-handler head — ar/tl (behavior-removable/sortable)', () => {
  // In VSO the handler's `from <source>` clause is fronted ahead of the
  // `on <event>` marker: `on click from triggerEl` → `من triggerEl عند نقر` (ar) /
  // `mula_sa triggerEl kapag click` (tl). No event pattern anchors on the leading
  // source marker, so the whole handler + body dropped (ar/tl behavior-removable
  // were degenerate; the bare `on click` form parsed fine). The parser now detects
  // a leading source marker + a following `on`-marker (VSO-gated), moves the
  // from-clause to after the event, and re-parses the normalized
  // `on <event> from <source>` order. Strings below are post-transform output of
  // `on click from triggerEl / add .a to me / end`.
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
    ['ar', 'من triggerEl عند نقر\n    أضف .a إلى أنا\nالنهاية'],
    ['tl', 'mula_sa triggerEl kapag click\n    idagdag .a sa ako\nwakas'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] VSO from-first head parses as an event handler with its body`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      expect(node.kind).toBe('event-handler');
      const a = actions(node);
      expect(a.has('on')).toBe(true);
      expect(a.has('add')).toBe(true); // body recovered, not dropped with the head
    });
  }

  // Regression guard: a VSO handler with NO from-clause (bare `on click`) must
  // still parse via the normal event path — the reorder only fires on a leading
  // source marker, so this is untouched.
  it('[ar] bare `on click` head (no from-clause) is unaffected', () => {
    const a = actions(parse('عند نقر\n    أضف .a إلى أنا\nالنهاية', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('add')).toBe(true);
  });
});

describe('Depth-aware end: command after a nested block in SOV bodies (A2b)', () => {
  // `parseBodyWithClauses` terminated the WHOLE body at the first `end` *keyword*
  // it scanned. That was harmless when nested blocks were folded as units — but
  // the fold guards only fire at a clause boundary (pending clause empty). In
  // SOV/VSO the event-handler pattern leaves the leading `from <source>` clause
  // unconsumed at the head of the body (removable: `triggerEl 에서` / `triggerEl
  // から`), so the pending clause is non-empty at the first nested opener, the
  // fold never fires, and the first nested block's `end` truncated the body —
  // dropping every command after it (`trigger`/`remove` after the conditional).
  // The SOV/VSO analogue of the #452/#453 fused-body fixes. The parser now tracks
  // nested-block opener depth (if/unless/while/for/repeat) and treats `end` as
  // block content while inside one. Strings below are post-transform output of
  // the behavior-removable `on click from triggerEl` handler (two nested ifs with
  // a `trigger` between them and a trailing `trigger`/`remove`).
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
    [
      'ko',
      '클릭 할 때 triggerEl 에서\n    만약 confirmRemoval\n        만약 그것 이다 "cancel"\n            정지\n        끝\n    끝\n    removable:before 를 트리거\n    만약 effect 이다 "fade"\n        opacity 를 전환 0 에 300ms\n    끝\n    removable:removed 를 트리거\n    나 를 제거\n끝',
    ],
    [
      'ja',
      'クリック で triggerEl から\n    もし confirmRemoval\n        もし それ である "cancel"\n            停止\n        終わり\n    終わり\n    removable:before を 引き金\n    もし effect である "fade"\n        opacity を 遷移 0 に 300ms\n    終わり\n    removable:removed を 引き金\n    私 を 削除\n終わり',
    ],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] keeps trigger + remove after the nested if blocks (were dropped)`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      expect(node.kind).toBe('event-handler');
      const a = actions(node);
      expect(a.has('on')).toBe(true);
      expect(a.has('if')).toBe(true);
      // The commands after the first nested `end` — previously truncated away.
      expect(a.has('trigger')).toBe(true);
      expect(a.has('remove')).toBe(true);
    });
  }

  // Regression guard: a single-clause body with no nested block must be byte
  // -identical to before — the depth counter only changes behavior when an `end`
  // is encountered while inside an accumulated opener.
  it('[ko] a plain single-command body is unaffected', () => {
    const a = actions(parse('클릭 할 때\n    .active 를 토글\n끝', 'ko'));
    expect(a.has('on')).toBe(true);
    expect(a.has('toggle')).toBe(true);
  });
});

describe('Verb-medial SOV command head in a conditional body (A2a init `set` drop)', () => {
  // The behavior `init` block `if triggerEl is undefined / set triggerEl to me /
  // end` dropped its `set` in SOV: tryParseConditionalBlock's condition/then split
  // located the then-branch via tokensBeginCommand (bare matchBest), which can't
  // recognise an SOV *verb-medial* command (`triggerEl 를 설정 나 에` = `set
  // triggerEl to me` — matchBest anchors on a selector/typed role, not a bare
  // variable). So the `set` clause was absorbed into the condition and lost. The
  // split now also recognises a verb-medial command head (sovCommandStartsAt). The
  // then-branch parser already handled `set` once it received it. Strings below are
  // the post-transform behavior with the init block + an unrelated handler.
  function initActions(node: unknown): Set<string> {
    const acc = new Set<string>();
    const walk = (n: unknown): void => {
      if (!n || typeof n !== 'object') return;
      const rec = n as Record<string, unknown>;
      if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
        const c = rec[f];
        if (Array.isArray(c)) c.forEach(walk);
        else if (c && typeof c === 'object') walk(c);
      }
    };
    const ib = (node as Record<string, unknown> | null)?.initBlock;
    (Array.isArray(ib) ? ib : [ib]).forEach(walk);
    return acc;
  }

  const cases: Array<[string, string]> = [
    [
      'ko',
      'Foo(triggerEl) 를 behavior\n    init\n        만약 triggerEl 이다 정의안됨\n            triggerEl 를 설정 나 에\n        끝\n    끝\n    클릭 할 때\n        .x 를 토글\n    끝\n끝',
    ],
    [
      'tr',
      'Foo(triggerEl) i behavior\n    init\n        eğer triggerEl dir tanımsız\n            triggerEl i ayarla ben e\n        son\n    son\n    tıklama de\n        .x i değiştir\n    son\nson',
    ],
    [
      'bn',
      'Foo(triggerEl) কে আচরণ\n    শুরু\n        যদি triggerEl হয় অনির্ধারিত\n            triggerEl কে সেট আমি তে\n        শেষ\n    শেষ\n    ক্লিক এ\n        .x কে টগল\n    শেষ\nশেষ',
    ],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] init keeps the verb-medial \`set\` in the if body (was dropped)`, () => {
      const node = parse(input, lang) as Record<string, unknown>;
      expect(node).toBeTruthy();
      expect(node.kind).toBe('behavior');
      const a = initActions(node);
      expect(a.has('if')).toBe(true); // the conditional still folds
      expect(a.has('set')).toBe(true); // …and its verb-medial body survives
    });
  }

  // Regression guard: a conditional whose then-branch is a SELECTOR-patient
  // command (matchBest already recognises it) is unchanged — the SOV path only
  // adds recognition, never removes the matchBest one.
  it('[ko] selector-patient then-branch still parses (unaffected)', () => {
    const node = parse('클릭 할 때\n  만약 confirmRemoval\n    .y 를 토글\n  끝\n끝', 'ko') as Record<
      string,
      unknown
    >;
    const acc = new Set<string>();
    const walk = (n: unknown): void => {
      if (!n || typeof n !== 'object') return;
      const rec = n as Record<string, unknown>;
      if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
        const c = rec[f];
        if (Array.isArray(c)) c.forEach(walk);
        else if (c && typeof c === 'object') walk(c);
      }
    };
    walk(node);
    expect(acc.has('toggle')).toBe(true);
  });
});
