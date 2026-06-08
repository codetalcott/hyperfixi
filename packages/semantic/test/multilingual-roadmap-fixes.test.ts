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
    ['tl', 'idagdag @disabled sa <button/> in me put "Submitting..." into <button/> in me kapag submit'],
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
