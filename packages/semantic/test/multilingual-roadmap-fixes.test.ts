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
import { parse, canParse, getTokenizer, fillSchemaDefaults } from '../src';

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

describe('unless-condition guard parses (qu, vi, zh — unless keyword recognized)', () => {
  // Three distinct keyword-recognition fixes that each restored `unless` to the
  // `unless-condition` body parse (was a dropped `unless`, fid 0.667):
  //  - vi: profile `unless` primary was `trừ_khi` (underscore) but the transformer
  //    emits the spaced `trừ khi`; the bare `khi` (=on) was mistaken for a second
  //    event handler. Profile primary → `trừ khi` (multi-word match).
  //  - qu: profile had no `unless`; the dict's `mana_sichus` split to
  //    `mana`(=false)+`sichus`(=if) and the clause parsed as `if`. Added
  //    `unless: 'mana sichus'` (spaced, multi-word) + dict aligned to `mana sichus`.
  //  - zh: the i18n transformer now keeps the unless condition marker-free
  //    (`除非 I match .disabled 切换 把 .selected`, not `除非 把 I match …`); this
  //    locks that the parser recovers the full body from the corrected form.
  // See docs-internal/HANDOFF-lossy-tail.md (unless-condition arc).
  const cases: Array<[string, string]> = [
    ['vi', 'khi nhấp trừ khi I match .disabled chuyển đổi .selected'],
    ['qu', 'I match .disabled tikray .selected ta ñitiy pi mana sichus'],
    ['zh', '当 点击 时 除非 I match .disabled 切换 把 .selected'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers on + unless + toggle from the unless guard`, () => {
      const node = parse(input, lang);
      expect(node.action).toBe('on');
      const body = JSON.stringify((node as { body?: unknown[] }).body ?? []);
      expect(body).toContain('unless');
      expect(body).toContain('toggle');
    });
  }
});

describe('vi render keyword alignment (kết xuất, not the show-colliding hiển thị)', () => {
  // The i18n vi dict emitted `render: 'hiển thị'`, but `hiển thị` is also vi `show`
  // and the semantic profile reads it as `show` (render primary is `kết xuất`). So
  // `render #x with …` parsed as `show` and the `render` action dropped
  // (render-template-with-data, morph-with-template — fid 0.5/0.667). Dict realigned
  // to `kết xuất`. See docs-internal/HANDOFF-lossy-tail.md (render cluster).
  const cases: Array<[string, string]> = [
    ['kết xuất #user-list với users: $data rồi đặt nó vào #container', 'put'],
    ['kết xuất #row với row: $data rồi biến đổi #target vào nó', undefined as unknown as string],
  ];

  for (const [body, alsoExpect] of cases) {
    it(`parses kết xuất as render: "${body.slice(0, 28)}…"`, () => {
      const node = parse(`khi nhấp ${body}`, 'vi');
      expect(node.action).toBe('on');
      const dumped = JSON.stringify((node as { body?: unknown[] }).body ?? []);
      expect(dumped).toContain('render');
      expect(dumped).not.toContain('"show"');
      if (alsoExpect) expect(dumped).toContain(alsoExpect);
    });
  }
});

describe('qu append keyword alignment (qatichiy, not the _-splitting qhipaman_yapay)', () => {
  // The i18n qu dict emitted `append: 'qhipaman_yapay'`, which the qu tokenizer
  // `_`-splits to `qhipaman`+`yapay`(=add) so `append-content` parsed as `add`
  // (fid 0.5). Realigned the dict to the profile's single-token append primary
  // `qatichiy`. See docs-internal/HANDOFF-lossy-tail.md (singleton tail).
  it('parses qatichiy as append (not add) in an SOV event body', () => {
    const node = parse('"<li>Item</li>" ta #list man ñitiy pi qatichiy', 'qu');
    expect(node.action).toBe('on');
    const dumped = JSON.stringify((node as { body?: unknown[] }).body ?? []);
    expect(dumped).toContain('append');
    expect(dumped).not.toContain('"add"');
  });
});

describe('zh tell BA-marked target (告诉 把 #el — tellSchema markerOverride zh:把)', () => {
  // tell's target is unmarked in en, but object-marking targets front it with their
  // accusative/BA particle: he את (handled), zh 把 (`告诉 把 #modal`). The generated
  // zh tell pattern didn't expect 把, so the token broke the match and `tell`
  // dropped (tell-command, tell-other-element — fid 0.5/0.75). Added `zh: '把'` to
  // tellSchema's destination markerOverride. See docs-internal/HANDOFF-lossy-tail.md.
  const cases: Array<[string, string[]]> = [
    ['当 点击 时 告诉 把 #modal 到 显示', ['tell']],
    ['当 点击 时 告诉 把 #panel 那么 添加 把 .open 那么 等待 把 200ms 那么 添加 把 .visible', ['tell', 'add', 'wait']],
  ];

  for (const [input, expected] of cases) {
    it(`recovers tell from "${input.slice(0, 20)}…"`, () => {
      const node = parse(input, 'zh');
      expect(node.action).toBe('on');
      const dumped = JSON.stringify((node as { body?: unknown[] }).body ?? []);
      for (const e of expected) expect(dumped).toContain(e);
    });
  }
});

describe('ko if-empty: command verb directly after copula in a split SOV predicate', () => {
  // The SOV transform splits a verb-final `is empty` predicate so a then-branch
  // command verb lands DIRECTLY after the copula (ko `… 내 값 이다 추가 .error 를 … 비어있는`
  // = my value IS add .error … empty). The conditional fold's copula guard swallowed
  // `추가`(add) into the condition and dropped it (if-empty/input-validation ko, fid
  // 0.75 — ja/bn escaped only because their copula isn't lexed as a single `is`). The
  // split now fires after a copula when a real SOV command-verb keyword opens here.
  // See docs-internal/HANDOFF-lossy-tail.md (control-flow if-folding).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers'])
      {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('[ko] if-empty recovers the add buried after the copula', () => {
    const a = actions(
      parse(
        '블러 할 때 만약 내 값 이다 추가 .error 를 비어있는 나 에 그러면 "Required" 를 다음 .error-message 에 넣다 끝',
        'ko'
      )
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('add')).toBe(true); // was swallowed into the condition
    expect(a.has('put')).toBe(true);
  });

  it('[ko] input-validation recovers add (if/else body)', () => {
    const a = actions(
      parse('블러 할 때 만약 내 값 이다 추가 .error 를 비어있는 나 에 아니면 .error 를 제거 나 에서 끝', 'ko')
    );
    expect(a.has('if')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('remove')).toBe(true);
  });

  it('[en] a normal `is empty` predicate is unaffected (no phantom empty command)', () => {
    const a = actions(
      parse(
        'on blur if my value is empty add .error to me put "Required" into next .error-message end',
        'en'
      )
    );
    expect(a.has('add')).toBe(true);
    expect(a.has('put')).toBe(true);
    expect(a.has('empty')).toBe(false); // copula guard still protects SVO predicate
  });
});

describe('hi hyphen-compound keyword (साफ़-करें = clear) tokenizes as one keyword', () => {
  // Several hi profile/dict command keywords are `<verb>-करें` compounds joined by a
  // hyphen (`साफ़-करें`=clear). The keyword reader stopped at `-`, splitting it into
  // three tokens; the command verb never matched and the action dropped
  // (keydown-key-is-syntax hi: `clear` lost, fid 0.5). The reader now joins a `-`
  // run when it resolves to a registered keyword. See docs-internal/HANDOFF-lossy-tail.md.
  it('parses साफ़-करें as clear (keydown-key-is-syntax)', () => {
    const node = parse("मैं को keyup[key is 'Escape'] पर साफ़-करें", 'hi') as Record<string, unknown>;
    expect(node.action).toBe('on');
    const dumped = JSON.stringify((node as { body?: unknown[] }).body ?? []);
    expect(dumped).toContain('clear');
  });

  it('a hyphenated selector (.error-message) is NOT fused into a keyword', () => {
    // The join is gated to Devanagari runs that resolve to a REGISTERED keyword, so
    // a `.error-message` CSS selector (handled by the selector extractor) stays one
    // selector token rather than being mangled by hyphen handling.
    const tk = getTokenizer('hi');
    const raw = tk.tokenize('रखें .error-message में') as unknown;
    const toks = (Array.isArray(raw) ? raw : (raw as { tokens: unknown[] }).tokens) as Array<{
      value: string;
      kind: string;
    }>;
    expect(toks.some(t => t.value === '.error-message' && t.kind === 'selector')).toBe(true);
  });
});

describe('ms scroll keyword alignment (English `scroll` form the dict emits)', () => {
  // The i18n ms dict keeps the scroll command in English (`scroll: 'scroll'`), but
  // the semantic ms profile only knew `tatal`/`skrol`, so the generated scroll
  // pattern never matched the emitted `scroll ke …` and the command dropped
  // (last-in-collection ms, fid 0.5). Added `scroll` to the profile alternatives.
  it('parses the English scroll form (last-in-collection)', () => {
    const node = parse('apabila click scroll ke terakhir <.message/> dalam #chat', 'ms') as Record<
      string,
      unknown
    >;
    expect(node.action).toBe('on');
    expect(JSON.stringify((node as { body?: unknown[] }).body ?? [])).toContain('scroll');
  });
});

describe('vi value reference (giá trị) tokenizes as one token for possessive patient', () => {
  // `value` is `giá trị` (two words) in vi; only `đặt giá trị`(=set) was registered,
  // so a standalone `giá trị` split into two identifiers and the possessive patient
  // `của tôi giá trị`(=my value) broke the `put` match, dropping it (input-mirror vi,
  // fid 0.5). Registered `giá trị`=value; longest-first keeps `đặt giá trị`=set intact.
  it('parses put my value (input-mirror)', () => {
    const node = parse('khi nhập đặt của tôi giá trị vào #preview', 'vi') as Record<string, unknown>;
    expect(node.action).toBe('on');
    expect(JSON.stringify((node as { body?: unknown[] }).body ?? [])).toContain('put');
  });

  it('the longer đặt giá trị still tokenizes as set (not over-shadowed)', () => {
    const tk = getTokenizer('vi');
    const raw = tk.tokenize('đặt giá trị của #x thành 5') as unknown;
    const toks = (Array.isArray(raw) ? raw : (raw as { tokens: unknown[] }).tokens) as Array<{
      value: string;
      normalized?: string;
    }>;
    expect(toks[0]?.value).toBe('đặt giá trị');
    expect(toks[0]?.normalized).toBe('set');
  });
});

describe('Multi-token event names anchor the event handler (ar multi-word, sw underscore)', () => {
  // The i18n dicts emit DOM mouse/key event names as MULTI-token forms: ar spaces
  // them (`فأرة أسفل`=mousedown) and sw underscore-joins them (`panya_shuka`). Neither
  // tokenized as one event token — worse, ar stripped the leading `ف` as a `then`
  // proclitic — so the `عند`/`kwenye <event>` handler never anchored and the WHOLE
  // handler dropped (repeat-until-event ar+sw: `on` lost, fid 0.75). Fixes: the ar
  // tokenizeWithExtractors override now runs tryMultiWordKeyword first; the sw
  // identifier reader keeps `_` inside a word. See docs-internal/HANDOFF-lossy-tail.md.
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers'])
      {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('[ar] on mousedown (فأرة أسفل) anchors the handler', () => {
    const a = actions(parse('عند فأرة أسفل ثم زِد #counter', 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  it('[ar] repeat-until-event recovers the on handler (was dropped)', () => {
    const a = actions(
      parse('عند فأرة أسفل كرر حتى حدث فأرة أعلى ثم زِد #counter ثم انتظر 100ms النهاية', 'ar')
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  it('[sw] on mousedown (panya_shuka) anchors the handler', () => {
    const a = actions(parse('kwenye panya_shuka kisha ongezeko #counter', 'sw'));
    expect(a.has('on')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });

  it('[sw] repeat-until-event recovers the on handler (was dropped)', () => {
    const a = actions(
      parse(
        'kwenye panya_shuka rudia hadi tukio panya_juu kisha ongezeko #counter kisha ngoja 100ms mwisho',
        'sw'
      )
    );
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
  });
});

describe('qu repeat loop-keyword swallow guard (verb-final wait eats the loop kw)', () => {
  // An SOV verb-final loop head renders `repeat until event <ev> from <src>` with
  // the loop keyword (qu kutipay) clause-FINAL, immediately followed by the loop
  // body's first command whose verb is ALSO verb-final (qu `suyay` = wait). The
  // `wait` pattern greedily anchored AT `kutipay` and consumed it as part of its
  // argument run, so matchBest succeeded as `wait` and the `repeat` loop keyword
  // was swallowed — the loop node never formed (behavior-draggable qu, fid 0.875).
  // parseClause now rejects a NON-repeat match anchored at the repeat keyword and
  // emits the bare repeat instead. See docs-internal/HANDOFF-lossy-tail.md (Arc 2).
  function actions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers'])
      {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => actions(x, acc));
      else if (c && typeof c === 'object') actions(c, acc);
    }
    return acc;
  }

  it('recovers repeat when a verb-final wait follows the clause-final loop keyword', () => {
    const a = actions(
      parse(
        'Foo(h) ta behavior\n' +
          '    h manta pointerdown(clientX, clientY) pi\n' +
          '        x ta tupuy\n' +
          '        hayk_akama ruway pointerup ta qillqa manta kutipay\n' +
          '            suyay pointermove(clientX, clientY) utaq qillqa manta pointerup(clientX, clientY)\n' +
          '            .x ta yapay\n' +
          '        tukuy\n' +
          '    tukuy\n' +
          'tukuy',
        'qu'
      )
    );
    expect(a.has('repeat')).toBe(true); // was swallowed by the verb-final wait
    expect(a.has('wait')).toBe(true);
    expect(a.has('add')).toBe(true);
    expect(a.has('measure')).toBe(true);
  });

  it('a genuine counted `repeat N times` keeps its variant match (not over-triggered)', () => {
    // The swallow-guard fires only when matchBest anchors a NON-repeat command at
    // the repeat keyword. A real `repeat N times` match (command === 'repeat') must
    // be left untouched — confirm it still yields the repeat action and was matched
    // by the generated repeat pattern, not rewritten to a bare guard-emitted node.
    const node = parse('repeat 3 times toggle .x end', 'en') as Record<string, unknown>;
    expect(node.action).toBe('repeat');
    const meta = node.metadata as { patternId?: string } | undefined;
    expect(meta?.patternId).toContain('repeat-en');
  });
});

describe('ar measure keyword alignment (undiacritized قس)', () => {
  // The semantic ar profile listed measure as قياس/قِس (the kasra-diacritized
  // imperative), but the i18n dict + real Arabic prose emit it undiacritized as
  // قس. So `قس width`/`قس x` parsed to null and the whole `measure` command
  // dropped from the event-handler body (behavior-draggable, behavior-resizable
  // — fid 0.875/0.889). Added قس to the profile measure alternatives.
  // See docs-internal/HANDOFF-lossy-tail.md (Arc 2 — ar measure).
  for (const clause of ['قس width', 'قس x', 'قس height']) {
    it(`parses "${clause}" as measure`, () => {
      const node = parse(clause, 'ar');
      expect(node?.action).toBe('measure');
    });
  }

  it('recovers measure inside an ar behavior event body', () => {
    const node = parse(
      'من أنا عند pointerdown\n        قس width\n        اضبط startWidth إلى هو',
      'ar'
    );
    expect(node.action).toBe('on');
    const dumped = JSON.stringify((node as { body?: unknown[] }).body ?? []);
    expect(dumped).toContain('measure');
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

describe('fused-event trailing `if … end` folds + verb-medial set (fetch-do-not-throw, SOV)', () => {
  // `on click fetch /api/users as JSON do not throw then if it set $users to it end`.
  // A fused SOV event pattern captures `fetch` as the handler action and routes the
  // trailing `then if … end` through parseBodyWithGrammarPatterns — where a
  // schema-generated bare-`if` pattern (`if-ja-generated-verb-first`, `if-tr-generated`)
  // swallowed the whole block as a flat `if` with an empty then-branch, dropping the
  // verb-medial `set`. The body walker now folds that `if … end` block (mirroring
  // parseBodyWithClauses), recovering the `set` in its then-branch. Flips
  // fetch-do-not-throw bn/hi/ja/ko/tr lossy→faithful (and generalizes to
  // fetch-error-handling, form-disable-on-submit, modal-close-escape). See
  // docs-internal/HANDOFF-fetch-do-not-throw.md.
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

  // Corpus-shaped transformer output (en → lang) for fetch-do-not-throw.
  const cases: Array<[string, string]> = [
    ['bn', '/api/users কে ক্লিক এ আনুন JSON do না নিক্ষেপ তারপর যদি এটি $users কে সেট এটি তে শেষ'],
    [
      'hi',
      '/api/users को क्लिक पर लाएं JSON do नहीं फेंकें फिर के रूप में अगर यह $users को सेट यह में समाप्त',
    ],
    ['ja', '/api/users を クリック で フェッチ JSON do ではない 投げる それから もし それ $users を 設定 それ に 終わり'],
    ['ko', '/api/users 를 클릭 할 때 가져오기 JSON do 아니 던지다 그러면 로 만약 그것 $users 를 설정 그것 에 끝'],
    ['tr', '/api/users i tıklama de getir JSON do değil fırlat sonra olarak eğer o $users i ayarla o e son'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] folds the if-block and keeps fetch + if + set`, () => {
      const node = parse(input, lang);
      expect(node.action).toBe('on');
      const a = actions(node);
      expect(a.has('fetch')).toBe(true);
      expect(a.has('if')).toBe(true);
      expect(a.has('set')).toBe(true); // the recovered verb-medial then-branch set
      // Precision: the `do not throw` strip leaves no phantom `throw`, and the set's
      // value marker (ja に / ko 에) must not anchor a phantom `into` command.
      expect(a.has('throw')).toBe(false);
      expect(a.has('into')).toBe(false);
    });
  }

  it('[tr] a non-marker clause-final loop keyword (`için`) still anchors `for`', () => {
    // The verb-anchoring particle guard that suppresses the phantom `into` is scoped
    // to KNOWN role markers (markerToRole), NOT all particles — else a clause-final
    // loop keyword like tr `için` (a particle, but not a role marker) would be
    // skipped and the `for` dropped (the template-literal-list-build regression caught
    // by the multilingual gate). Corpus shape of `on click set $total to 0 then for
    // item in $items set $total to $total end`.
    const input =
      '$total i tıklama de ayarla 0 e sonra item içinde $items i için $total i ayarla $total son';
    const a = actions(parse(input, 'tr'));
    expect(a.has('for')).toBe(true);
    expect(a.has('set')).toBe(true);
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

describe('en repeat HEAD-only patterns: counted / forever loops keep their body (R1)', () => {
  // The generated positional `repeat` pattern greedily captured the loop BODY into
  // bogus roles: `repeat 3 times add … to me` → loopType=3, quantity="times",
  // event="add" (the body verb!), and the `add` command was dropped entirely. No
  // other language reproduces that `repeat.event:literal` garbage (they all drop
  // it), so it was a pure en-reference defect dragging R1 down in every language.
  // Two head-only handcrafted patterns (`repeat {n} times`, `repeat forever`,
  // priority 110) now match only the loop HEAD and leave the body for the clause
  // loop — mirroring `repeat until event {event}`. en + all 23 langs +0.0011–0.0028
  // avgRoleFidelity, zero regressions. See docs-internal/MULTILINGUAL_NEXT_STEPS.md.
  function find(node: unknown, action: string): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null;
    const n = node as Record<string, unknown>;
    if (n.action === action) return n;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const hit = find(x, action);
          if (hit) return hit;
        }
      } else if (c && typeof c === 'object') {
        const hit = find(c, action);
        if (hit) return hit;
      }
    }
    return null;
  }
  function roleKeys(node: Record<string, unknown> | null): string[] {
    if (!node) return [];
    const roles = node.roles;
    if (roles instanceof Map) return [...roles.keys()].map(String);
    if (roles && typeof roles === 'object') return Object.keys(roles as object);
    return [];
  }
  function acts(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const n = node as Record<string, unknown>;
    if (typeof n.action === 'string') acc.add(n.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = n[f];
      if (Array.isArray(c)) c.forEach(x => acts(x, acc));
      else if (c && typeof c === 'object') acts(c, acc);
    }
    return acc;
  }

  it('`repeat 3 times` captures the count as quantity, NOT the body verb as event', () => {
    const node = parse('on click repeat 3 times add ".x" to me', 'en');
    const repeat = find(node, 'repeat');
    expect(repeat).not.toBeNull();
    const keys = roleKeys(repeat);
    // The defining fix: no bogus `event` role swallowing the body verb.
    expect(keys).not.toContain('event');
    expect(keys).toContain('loopType');
    expect(keys).toContain('quantity');
    const roles = repeat!.roles as Map<string, { value?: unknown }>;
    expect(roles.get('loopType')?.value).toBe('times');
    expect(roles.get('quantity')?.value).toBe(3);
  });

  it('`repeat forever` keeps its body command (toggle survives, not eaten as quantity)', () => {
    const node = parse('on load repeat forever toggle .pulse wait 1s end', 'en');
    const a = acts(node);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('toggle')).toBe(true); // body verb recovered (was swallowed before)
    const repeat = find(node, 'repeat');
    expect(roleKeys(repeat)).not.toContain('event');
    const roles = repeat!.roles as Map<string, { value?: unknown }>;
    expect(roles.get('loopType')?.value).toBe('forever');
  });

  it('does not shadow the `repeat until event` head pattern (control)', () => {
    const node = parse('on mousedown repeat until event mouseup increment #counter end', 'en');
    const a = acts(node);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('increment')).toBe(true);
    const repeat = find(node, 'repeat');
    const roles = repeat!.roles as Map<string, { value?: unknown }>;
    expect(roles.get('loopType')?.value).toBe('until-event');
    expect(roles.get('event')?.value).toBe('mouseup');
  });
});

describe('SOV bind: bare-event guard prefers a command over a phantom reference event', () => {
  // The verb-final SOV bind (`$greeting को #name-input में bind`) LEADS with a `$variable`
  // reference, which the `event-<lang>-bare` pattern grabbed as the event → a phantom `on`
  // handler (the bind.* rf=0.00 residue). A `$variable` reference can NEVER be an event name
  // (events are bare identifiers like click/keyup). When the bare-event mis-anchored on a
  // reference, SOV extraction found no real event, AND a command matches the full stream, the
  // parser now rewinds and prefers the command. hi bind-auto-detect/two-way 0.00 → 1.00; hi
  // R1 +0.0135, precision +0.0075, zero regressions. Pairs with the hindiProfile `bind-to`
  // verb-final i18n rule. See docs-internal/MULTILINGUAL_NEXT_STEPS.md.
  it('[hi] verb-final bind parses as bind, not a phantom on-handler', () => {
    const node = parse('$greeting को #name-input में bind', 'hi') as Record<string, unknown>;
    expect(node.action).toBe('bind');
    const roles = node.roles as Map<string, { value?: unknown }>;
    expect(roles.get('destination')?.value).toBe('$greeting');
    expect(roles.get('source')?.value).toBe('#name-input');
  });

  it('[hi] translated bind verb (बांधें) also parses as bind', () => {
    expect((parse('$greeting को #name-input में बांधें', 'hi') as { action?: string }).action).toBe(
      'bind'
    );
  });

  // Regression guards — the fix must NOT over-reach beyond the reference mis-anchor:
  it('[hi] a real bare-event handler still anchors the event (no over-reach)', () => {
    // `.active को क्लिक पर टॉगल` = "on click toggle .active" — a genuine event handler.
    expect((parse('.active को क्लिक पर टॉगल', 'hi') as { action?: string }).action).toBe('on');
  });
  it('[hi] event-led handler with a known event is untouched', () => {
    expect((parse('click पर टॉगल .active', 'hi') as { action?: string }).action).toBe('on');
  });
  it('[en] plain SVO bind is unaffected', () => {
    expect((parse('bind $greeting to #name-input', 'en') as { action?: string }).action).toBe(
      'bind'
    );
  });
});

describe('English split `\'s` possessive captures the property (bind-explicit-property R1)', () => {
  // The en tokenizer splits the clitic `'s` into `'` + `s` after a selector
  // (`#picker's value` → `#picker ' s value`), so the single-token `'s` check in
  // tryMatchPossessiveSelectorExpression missed it and the property was DROPPED —
  // capturing only the bare `#picker` selector. ja/ko/… keep their possessive (の/의)
  // whole and captured the full property-path, so the en reference dropping it capped
  // bind-explicit-property / bind-non-form-display across SOV langs at 0.50 (hi 0.00).
  // The split pair is now recognized, AND a keyword property (vi `value` → `giá trị`,
  // a single keyword token) is accepted. hi crosses 0.90; ja/ko/qu/bn/tr/zh +0.0068.
  function source(node: unknown): { type?: string; property?: string } | undefined {
    const n = node as { roles?: unknown };
    const roles =
      n.roles instanceof Map
        ? n.roles
        : new Map(Object.entries((n.roles as object) ?? {}));
    return roles.get('source') as { type?: string; property?: string } | undefined;
  }
  it("[en] `#picker's value` is a property-path source, not a bare selector", () => {
    const node = parse("bind $color to #picker's value", 'en') as { action?: string };
    expect(node.action).toBe('bind');
    const src = source(node);
    expect(src?.type).toBe('property-path');
    expect(src?.property).toBe('value');
  });
  it("[en] `#status's textContent` is a property-path source", () => {
    expect(source(parse("bind $message to #status's textContent", 'en'))?.type).toBe(
      'property-path'
    );
  });
  it('[vi] a keyword property (giá trị) is captured as property-path (no en mismatch)', () => {
    expect(source(parse("bind $color vào #picker's giá trị", 'vi'))?.type).toBe('property-path');
  });
  it('[en] a plain `#selector` source (no possessive) stays a selector', () => {
    expect(source(parse('bind $greeting to #name-input', 'en'))?.type).toBe('selector');
  });
});

describe('Event-keyword alignment: i18n-emitted event words recognized (on.event:literal)', () => {
  // The i18n dict emits event words the semantic profiles/tokenizer did not list, so
  // the event role typed as a bare `expression` instead of `literal` — the on.event R1
  // residue (uk especially, the laggard). submit uk `надсилання`; load es `cargar` /
  // fr `charger` / it `carica` / ru `загрузка` / uk `завантаження` / ja `読み込み`;
  // change fr `changer`; input pl `wejście` / id `masukan`. Each is now a recognized
  // event alternative (load is purely an event → no command collision). uk +0.0200,
  // es/fr/it/ru +0.0110, id/pl +0.0115, ja +0.0076; mean R1 +0.0041, zero regressions.
  function eventType(text: string, lang: string): string | undefined {
    const node = parse(text, lang) as { roles?: unknown };
    const roles =
      node.roles instanceof Map
        ? node.roles
        : new Map(Object.entries((node.roles as object) ?? {}));
    return (roles.get('event') as { type?: string } | undefined)?.type;
  }
  const cases: Array<[string, string, string]> = [
    ['uk', 'submit', 'при надсилання перемкнути .x'],
    ['es', 'load', 'en cargar alternar .x'],
    ['fr', 'load', 'sur charger basculer .x'],
    ['it', 'load', 'su carica commutare .x'],
    ['ru', 'load', 'при загрузка переключить .x'],
    ['uk', 'load', 'при завантаження перемкнути .x'],
    ['ja', 'load', '.x を 読み込み で 切り替え'],
    ['fr', 'change', 'sur changer basculer .x'],
    ['pl', 'input', 'gdy wejście przełącz .x'],
    ['id', 'input', 'pada masukan alihkan .x'],
    // resize (window-resize): dict emits a native verb the profiles didn't list as
    // an event → it typed as expression. Registered as the resize event in the 6
    // space-using Latin profiles (de/es/fr/it/pl/pt). resize has no command homonym.
    ['de', 'resize', 'bei größeändern umschalten .x'],
    ['es', 'resize', 'en redimensionar alternar .x'],
    ['fr', 'resize', 'sur redimensionner basculer .x'],
    ['it', 'resize', 'su ridimensiona commutare .x'],
    ['pl', 'resize', 'gdy zmieńrozmiar przełącz .x'],
    ['pt', 'resize', 'em redimensionar alternar .x'],
    // mousedown (repeat-until-event handler event): dict emits a native form the
    // profiles/tokenizers didn't list → the handler event typed as expression.
    // es/pt via profile keyword; ja/ko via tokenizer EXTRAS (non-Latin).
    ['es', 'mousedown', 'en ratónabajo alternar .x'],
    ['pt', 'mousedown', 'em mouseBaixo alternar .x'],
    ['ja', 'mousedown', '.x を マウス押下 で 切り替え'],
    ['ko', 'mousedown', '.x 를 마우스다운 할 때 토글'],
    // ru/uk FUSED event forms: the i18n dict emits underscore compounds
    // (мышь_вниз) that the tokenizer splits, breaking event recognition; the dict
    // now emits the fused form (мышьвниз) which is registered in the tokenizer
    // EXTRAS. Covers mousedown (repeat-until-event) and resize (window-resize).
    ['ru', 'mousedown', 'при мышьвниз переключить .x'],
    ['ru', 'resize', 'при изменениеразмера переключить .x'],
    ['uk', 'mousedown', 'при мишавниз перемкнути .x'],
    ['uk', 'resize', 'при змінарозміру перемкнути .x'],
  ];
  for (const [lang, ev, text] of cases) {
    it(`[${lang}] ${ev} event (i18n-emitted word) types as literal`, () => {
      expect(eventType(text, lang)).toBe('literal');
    });
  }
});

describe('URL tokenization across space-using langs (fetch.source:literal)', () => {
  // 14 tokenizers' classifyToken lacked the `/`-prefixed URL check (en/fr/hi/ja/… had
  // it), so a fetch source like `/api/data` fell through to `identifier` and the role
  // typed as `expression` — mismatching the en reference's `fetch.source:literal`, the
  // single biggest R1 residue (188× across fetch-basic/-json/-with-method/event-debounce
  // in 14 space-using langs). Added `startsWith('/')|'./'|'http'` → 'url' to each. Mean
  // R1 +0.0122 (the campaign's biggest single-PR win); 14 langs +0.0137–0.0218.
  function firstKind(lang: string, text: string): string | undefined {
    const raw = getTokenizer(lang).tokenize(text) as unknown;
    const toks = (Array.isArray(raw) ? raw : (raw as { tokens: unknown[] }).tokens) as Array<{
      kind: string;
    }>;
    return toks[0]?.kind;
  }
  const langs = ['es', 'de', 'pt', 'it', 'ru', 'uk', 'pl', 'vi', 'id', 'ms', 'sw', 'th', 'tl', 'he'];
  for (const lang of langs) {
    it(`[${lang}] /api/data tokenizes as a url (not a bare identifier)`, () => {
      expect(firstKind(lang, '/api/data')).toBe('url');
    });
  }
  it('[en] control: /api/data is still a url', () => {
    expect(firstKind('en', '/api/data')).toBe('url');
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
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers the empty predicate`, () => {
      expect(actions(parse(input, lang as 'de')).has('empty')).toBe(true);
    });
  }

  it('[sw] recovers the empty predicate inside the folded condition', () => {
    // Originally locked as a flat `empty` ACTION sibling — the truncated-if-era
    // shape. The mid-clause if fold (parseClause hook, if.condition en-noise
    // sweep) now folds this into a conditional whose condition carries the
    // NORMALIZED predicate (`… is empty`) — which still exercises the Phase 1a
    // vocabulary (`ni`→is, `tupu`→empty): without it the predicate would not
    // normalize. The corpus if-empty (`kwenye blur kama …`) folds identically
    // in en/de/sw, so this is the faithful shape, not a regression.
    const node = parse(
      'kwenye poteza_macho kama yangu thamani ni tupu ongeza .error kwa mimi kisha weka "Required" kwa ijayo .error-message mwisho',
      'sw'
    );
    function findIf(n: unknown): Record<string, any> | null {
      if (!n || typeof n !== 'object') return null;
      const rec = n as Record<string, any>;
      if (rec.action === 'if') return rec;
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
        const c = rec[f];
        if (Array.isArray(c)) {
          for (const x of c) {
            const hit = findIf(x);
            if (hit) return hit;
          }
        }
      }
      return null;
    }
    const ifNode = findIf(node);
    expect(ifNode).not.toBeNull();
    const cond = ifNode!.roles instanceof Map ? ifNode!.roles.get('condition') : undefined;
    expect(cond?.type).toBe('expression');
    expect(String(cond?.raw ?? '')).toContain('empty');
    // The predicate no longer leaks as a spurious flat `empty` action.
    expect(actions(node).has('empty')).toBe(false);
  });
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

describe('Juxtaposed verb-medial SOV command in a body (parseClause gap recovery)', () => {
  // A verb-medial SOV command (`triggerEl を 設定 私 に` = `set triggerEl to me`)
  // doesn't match matchBest. When JUXTAPOSED before a matchable command (`set X to
  // me` then `toggle .y`, no `then` between), the matchBest loop skipped the whole
  // `set` and the all-or-nothing whole-clause fallback never fired (a later command
  // matched), so `set` was dropped. parseClause now recovers verb-medial commands
  // from each skipped run, in order. (This also clears the behavior-sortable
  // SOV `trigger … on me` tail.) Strings below are post-transform.
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

  const jux: Array<[string, string]> = [
    ['ko', '클릭 할 때\n    triggerEl 를 설정 나 에\n    .x 를 토글\n끝'],
    ['ja', 'クリック で\n    triggerEl を 設定 私 に\n    .x を 切り替え\n終わり'],
    ['tr', 'tıklama de\n    triggerEl i ayarla ben e\n    .x i değiştir\nson'],
  ];
  for (const [lang, input] of jux) {
    it(`[${lang}] keeps the juxtaposed verb-medial \`set\` before \`toggle\` (was dropped)`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('set')).toBe(true); // the verb-medial command, previously skipped
      expect(a.has('toggle')).toBe(true); // the matchBest command still there
    });
  }

  // Regression guard: a clause that is a SINGLE verb-final command (no matchBest
  // hit) must still go through the whole-clause fallback, not the per-gap path —
  // the per-gap recovery could fragment it. `call updateScrollPosition()` is the
  // canonical case (the event-throttle body).
  const verbFinal: Array<[string, string]> = [
    ['ko', '스크롤 할 때\n    updateScrollPosition() 를 호출\n끝'],
    ['tr', 'kaydır de\n    updateScrollPosition() i çağır\nson'],
  ];
  for (const [lang, input] of verbFinal) {
    it(`[${lang}] a single verb-final \`call\` body still parses (whole-clause path)`, () => {
      const a = actions(parse(input, lang));
      expect(a.has('call')).toBe(true);
    });
  }
});

describe('Quechua word reader does not split native words at English fallbacks (init)', () => {
  // The qu word reader broke a word at any embedded keyword-at-boundary, which
  // includes the English canonical fallbacks (me/it/you/…) injected into every
  // language's keyword table: `init` → `in` + `it`. The behavior `init` block
  // keyword was therefore never recognised (the block-parser saw `in`), so the
  // whole init body — `if triggerEl is undefined / set triggerEl to me / end` —
  // was treated as a handler and dropped (qu behavior-removable/sortable lost the
  // init `set`). The reader now breaks only on real Quechua case-marker suffixes.
  function tokens(input: string): string[] {
    const r = getTokenizer('qu').tokenize(input) as unknown;
    const arr = Array.isArray(r) ? r : ((r as { tokens?: unknown[] }).tokens ?? []);
    return (arr as Array<{ value: string }>).map(t => t.value);
  }

  it('tokenizes `init` as a single word (was `in` + `it`)', () => {
    expect(tokens('init')).toEqual(['init']);
  });

  it('still splits a real agglutinated case marker (`triggerElta` → stem + `ta`)', () => {
    expect(tokens('triggerElta')).toEqual(['triggerEl', 'ta']);
  });

  it('recovers the behavior `init` block body (if + set)', () => {
    const input =
      'Foo(triggerEl) ta behavior\n    init\n        sichus triggerEl kanqa mana_riqsisqa\n            triggerEl ta noqa man churanay\n        tukuy\n    tukuy\n    ñitiy pi\n        .x ta tikray\n    tukuy\ntukuy';
    const node = parse(input, 'qu') as Record<string, unknown>;
    expect(node.kind).toBe('behavior');
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
    const ib = node.initBlock;
    (Array.isArray(ib) ? ib : [ib]).forEach(walk);
    expect(acc.has('if')).toBe(true);
    expect(acc.has('set')).toBe(true);
  });
});

describe('exit/end keyword collision does not collapse the handler body (ja/de)', () => {
  // The i18n dict emits the `exit` command as a word that the semantic end-keyword
  // set ALSO listed: ja `exit: 終了` (end set had 終了; real end is 終わり), de
  // `exit: beenden` (hardcoded end set had beenden; real end is ende). Inside an
  // `if … exit … end` block the `exit` token therefore decremented the body
  // parser's block depth one too early, so the block's real `end` was seen at
  // depth 0 and terminated the WHOLE handler body — dropping every command after a
  // following nested block (behavior-sortable: ja degenerate, de lossy — the
  // post-`repeat` `remove`/`trigger`). Fix: the exit emission is no longer read as
  // an `end` keyword (semantic-parser.isEndKeyword + ja profile end alternatives).
  function bodyActions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => bodyActions(x, acc));
      else if (c && typeof c === 'object') bodyActions(c, acc);
    }
    return acc;
  }

  // Corpus-shaped (behavior-sortable handler): `on pointerdown(clientY) from me /
  // set item … / if item is null / exit / end / halt … / add … / repeat until … /
  // … / end / remove … / trigger … end`. The post-`repeat` `remove`/`trigger`
  // must survive — they were dropped while exit doubled as an end keyword.
  const cases: Array<[string, string]> = [
    [
      'ja',
      'pointerdown(clientY) で 私 から\n    item を 設定 the target.closest("li") に\n    もし item である null\n        終了\n    終わり\n    the イベント を 停止\n    .active を 追加 item に\n    まで イベント pointerup を 繰り返し ドキュメント から\n        move を 引き金 私 に\n    終わり\n    .active を 削除 item から\n    done を 引き金 私 に\n終わり',
    ],
    [
      'de',
      'bei pointerdown(clientY) von ich\n    festlegen item zu the target.closest("li")\n    falls item ist null\n        beenden\n    ende\n    anhalten the ereignis\n    hinzufügen .active zu item\n    wiederholen bis ereignis pointerup von dokument\n        auslösen move zu ich\n    ende\n    entfernen .active von item\n    auslösen done zu ich\nende',
    ],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] keeps commands after the if/exit/end block + nested loop`, () => {
      const a = bodyActions(parse(input, lang));
      expect(a.has('on')).toBe(true);
      // The post-`repeat` commands — the ones the collision dropped.
      expect(a.has('remove')).toBe(true);
      expect(a.has('trigger')).toBe(true);
      // The pre-loop body also survives.
      for (const action of ['halt', 'add', 'repeat']) expect(a.has(action)).toBe(true);
    });
  }
});

describe('Arabic VSO from-first wait clause parses (behavior-sortable)', () => {
  // VSO fronts a `wait for <events> from <source>` clause's source ahead of the
  // events: `wait for pointermove or pointerup from document` → `انتظر من وثيقة
  // pointermove أو pointerup` (`wait from document …`). Two breaks: (1) the ar
  // tokenizer split وثيقة (document) into the proclitic و (`and`) + ثيقة, and the
  // spurious `and` conjunction became a clause boundary that dropped the command;
  // (2) the generated `wait {duration}` pattern can't anchor when the token after
  // the verb is the source particle من. Fix: keep وثيقة whole (proclitic extractor
  // NON_PROCLITIC_WORDS) + a hand-crafted `wait-ar-from-first` pattern.
  function bodyActions(node: unknown, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.add(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => bodyActions(x, acc));
      else if (c && typeof c === 'object') bodyActions(c, acc);
    }
    return acc;
  }

  it('document (وثيقة) tokenizes as one identifier, not و + ثيقة', () => {
    const r = getTokenizer('ar').tokenize('من وثيقة') as unknown;
    const arr = Array.isArray(r) ? r : ((r as { tokens?: unknown[] }).tokens ?? []);
    const values = (arr as Array<{ value: string }>).map(t => t.value);
    expect(values).toEqual(['من', 'وثيقة']);
  });

  it('recovers the fronted-source wait inside a repeat-until-event loop', () => {
    const input =
      'من أنا عند pointerdown\n    كرر حتى حدث pointerup من وثيقة\n        انتظر من وثيقة pointermove(clientY) أو pointerup(clientY)\n        تشغيل move إلى أنا\n    النهاية\nالنهاية';
    const a = bodyActions(parse(input, 'ar'));
    expect(a.has('on')).toBe(true);
    expect(a.has('repeat')).toBe(true);
    expect(a.has('wait')).toBe(true);
    expect(a.has('trigger')).toBe(true);
  });
});

describe('bareKeyword block keyword is not mis-anchored as a bare event (hi live)', () => {
  // `live`/`socket`/`eventsource`/`worker`/`intercept` are body-bearing block
  // keywords that FRONT their construct (`live put … end`). In hi the bare-event
  // pattern (`event-hi-bare`, priority 80) runs at Stage 1 — before the command
  // stage — and its single `{event}` role matched the fronted `लाइव` (live)
  // keyword, so the block parsed as a bare `on` + `put` and the `live` action was
  // dropped (degenerate: hi live-derived-value / live-multiple-deps). es/ja/zh had
  // no such greedy bare-event pattern, so they reached the command stage and kept
  // `live`. Fix: the event-anchor guard (pattern-matcher.tokenLooksLikeEvent) now
  // rejects a token whose normalized form is a bareKeyword block action, so the
  // input falls through to the command stage where the `live` pattern wins.
  // Corpus-shaped (the i18n transformer output stored in patterns.db).
  const cases: Array<[string, string]> = [
    ['hi', 'लाइव `Count: ${$count}` को रखें मैं में समाप्त'],
    ['hi', 'लाइव `${$price * $quantity}` को रखें #total में समाप्त'],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] keeps the live block action (not a bare event-handler)`, () => {
      const node = parse(input, lang) as { kind?: string; action?: string };
      expect(node.kind).toBe('command');
      expect(node.action).toBe('live');
    });
  }

  // Guard the un-regression: a genuine bare event (an event NAME, not a block
  // keyword) must still anchor the bare-event pattern.
  it('[hi] a genuine bare event name still parses as an event-handler', () => {
    const node = parse('क्लिक पर टॉगल .active', 'hi') as { kind?: string };
    expect(node.kind).toBe('event-handler');
  });
});

describe('ru/uk install keyword is distinct from set (install-behavior)', () => {
  // ru "install" and "set" are homonyms (установить). The profile tried to
  // disambiguate install as `установить_пакет`, but the ru/uk tokenizer splits on
  // `_`, so it tokenized back to `установить` → `set`, dropping the install action
  // (install-behavior degenerate in ru/uk). Fix: install uses the single-token
  // loanword `инсталлировать` (ru) / `інсталювати` (uk), distinct from set.
  const installCases: Array<[string, string]> = [
    ['ru', 'инсталлировать Draggable'],
    ['uk', 'інсталювати Draggable'],
  ];
  for (const [lang, input] of installCases) {
    it(`[${lang}] parses the install command (not set)`, () => {
      const node = parse(input, lang) as { kind?: string; action?: string };
      expect(node.kind).toBe('command');
      expect(node.action).toBe('install');
    });
  }

  // Un-regression: the set primary (установить/встановити) must still parse as set.
  const setCases: Array<[string, string]> = [
    ['ru', 'установить :x в 5'],
    ['uk', 'встановити :x в 5'],
  ];
  for (const [lang, input] of setCases) {
    it(`[${lang}] still parses set (install change did not shadow it)`, () => {
      const node = parse(input, lang) as { action?: string };
      expect(node.action).toBe('set');
    });
  }
});

describe('Turkish unless keyword alignment (değilse)', () => {
  // The i18n dict emits `unless` → değilse, but the tr semantic profile had no
  // `unless` keyword, so the negated-conditional clause was silently dropped on
  // parse-back: `unless-condition` was *lossy* in tr (the `unless` action
  // vanished, leaving a bare `toggle` under the event — recall 0.67 vs the en
  // reference's {on, toggle, unless}). Registering değilse=unless lets the
  // trailing SOV marker tokenize as a single `unless` keyword and the clause is
  // recovered (tr unless-condition → faithful 1.0).
  //
  // değilse tokenizes cleanly (one Latin word) — unlike the other lossy langs,
  // whose markers shatter on the `_` join (hi جब_تک_नہیں, vi trừ_khi → khi=on),
  // collide with a particle (ja でなければ split by the で marker) or with `else`
  // (ko 아니면 = else), or fail structurally with a front marker (zh 除非 mid-`把`).
  // Those remain lossy — see docs-internal/HANDOFF-unless-condition-tokenizer.md.
  //
  // Corpus-shaped SOV transformer output from the multilingual baseline
  // (`on click unless I match .disabled toggle .selected`):
  const input = 'I match .disabled değiştir .selected i tıklama de değilse';

  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  it('recovers the unless clause (değilse) alongside the toggle body', () => {
    expect(canParse(input, 'tr')).toBe(true);
    const actions = new Set(collectActions(parse(input, 'tr')));
    // Without değilse=unless this set is {on, toggle} — the guard goes red.
    expect(actions.has('toggle')).toBe(true);
    expect(actions.has('unless')).toBe(true);
  });
});

describe('Trailing SOV `unless` guard recovery (unless-condition, ko/bn/ja)', () => {
  // tr (above) tokenizes its trailing `unless` marker cleanly but only RECALLED
  // the action via a structurally-wrong parse (toggle.patient = the condition's
  // .disabled, unless carrying a bogus event role). The deeper defect: the
  // negated-conditional marker renders CLAUSE-FINAL under the verb-final reorder
  // (ko `… 토글 .selected 를 아니라면`) — or leaks the English literal at the tail
  // (bn) — with its condition FRONTED ahead of the guarded command. The
  // leading-fold path (tryParseConditionalBlock) only fires on a *leading* marker,
  // so the trailing marker was dropped and its fronted condition orphaned:
  // `unless-condition` was lossy (recall 0.67, a bare `toggle` under the event).
  // parseClause now detects a trailing `unless` marker, parses the body without it,
  // and re-emits `unless` carrying the fronted condition recovered from the clause
  // head — en-parity `[unless(cond), toggle]`, with the toggle patient kept correct
  // (a *structural* fix, not a bare action-name recovery). ko additionally needed
  // its profile + i18n dict `unless` keyword disambiguated from `else` (아니면 →
  // 아니라면) so the marker tokenizes as `unless` rather than `else`. ja needed its
  // marker moved off the `で` particle (でなければ → ない限り): `で` is peeled by the
  // particle extractor and shatters the marker, but `ない限り` starts with `な` (not a
  // particle) so it tokenizes as a single `unless` token — then the guard recovers it.
  // See docs-internal/HANDOFF-unless-condition-tokenizer.md.
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  // Corpus-shaped transformer output from the multilingual baseline for
  // `on click unless I match .disabled toggle .selected`:
  const cases: Array<[string, string]> = [
    ['ko', 'I match .disabled 토글 .selected 를 클릭 할 때 아니라면'],
    ['bn', 'I match .disabled টগল .selected কে ক্লিক এ unless'],
    ['ja', 'I match .disabled 切り替え .selected を クリック で ない限り'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] recovers the trailing unless clause alongside the toggle body`, () => {
      expect(canParse(input, lang)).toBe(true);
      const actions = new Set(collectActions(parse(input, lang)));
      // Without the trailing-guard recovery this set is {on, toggle} — guard red.
      expect(actions.has('toggle')).toBe(true);
      expect(actions.has('unless')).toBe(true);
    });
  }

  it('[ko] is structural: the recovered unless keeps its fronted condition and the toggle its patient', () => {
    // `roles` is a Map — a plain JSON.stringify would drop its contents, so use a
    // Map-aware replacer to assert on the captured role values.
    const ser = (o: unknown) =>
      JSON.stringify(o, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : v));
    const json = ser(parse('I match .disabled 토글 .selected 를 클릭 할 때 아니라면', 'ko'));
    expect(json).toContain('"action":"unless"');
    expect(json).toContain('.disabled'); // fronted condition selector preserved
    expect(json).toContain('.selected'); // toggle patient preserved (not the condition's)
  });
});

describe('Bare-event mis-anchor guard (hi unless-condition — SOV event-anchor #5)', () => {
  // hi's SOV reorder fronts the (untranslated) condition `I match .disabled` ahead of
  // the real `<event> पर` trigger. The bare-event pattern `event-hi-bare` ({event} at
  // position 0) anchored on `I`, burying the real `क्लिक पर` (on click) mid-body where
  // it couldn't be recovered — the `unless` action dropped and the body mis-anchored
  // (`unless-condition` was lossy in hi, and hi's avgRoleFidelity was the worst at
  // 0.717). The event-anchor guard now rejects a bare-event capture that ISN'T a known
  // event when SOV extraction can recover a real mid-stream event, so `क्लिक` becomes
  // the event and the trailing-`unless` guard recovers the clause. The hi `unless`
  // marker also had to move from the shattering underscore form `जब_तक_नहीं` to the
  // spaced `जब तक नहीं` so it tokenizes as a single `unless` token (longest-first
  // multi-word match beats the `जब तक`=while prefix). See
  // docs-internal/HANDOFF-unless-condition-tokenizer.md.
  const input = 'I match .disabled टॉगल .selected को क्लिक पर जब तक नहीं';
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  it('anchors on the real event (click), not the fronted condition (I)', () => {
    const node = parse(input, 'hi') as Record<string, unknown>;
    expect(node.action).toBe('on');
    const ser = (o: unknown) =>
      JSON.stringify(o, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : v));
    const evJson = ser(node.roles);
    // Without the guard the event is the fronted `I`; with it, the real `click`.
    expect(evJson).toContain('click');
    expect(evJson).not.toContain('"I"');
  });

  it('recovers both toggle and unless once the event anchors correctly', () => {
    const actions = new Set(collectActions(parse(input, 'hi')));
    expect(actions.has('toggle')).toBe(true);
    expect(actions.has('unless')).toBe(true); // was dropped (lossy) before the guard
  });
});

describe('Verb-split reserves the fronted condition (trailing-unless body patient — SOV #5)', () => {
  // With a trailing-`unless` guard the body command's verb is verb-medial
  // (`… टॉगल .selected को`). A patient-BEFORE-verb pattern (hi `toggle-hi-simple`)
  // would grab the fronted condition's trailing `.disabled` as the toggle patient,
  // stranding the real को-marked `.selected`. The verb-split reserves everything
  // before the first command-verb keyword as the condition, so the body binds the
  // real `.selected`. This is a *value* correctness fix the valueType-based R1 metric
  // undercounts — yet it's a real execution bug: tr previously toggled `.disabled`
  // (the wrong class), now `.selected`; hi's patient went expression→selector. The
  // unless condition also captures the full `I match .disabled`, not a truncated `I`.
  const findRole = (node: unknown, action: string, role: string): unknown => {
    let found: unknown;
    const walk = (n: unknown) => {
      if (found !== undefined || !n || typeof n !== 'object') return;
      const rec = n as Record<string, unknown>;
      if (rec.action === action) {
        const roles = rec.roles instanceof Map ? rec.roles : new Map(Object.entries(rec.roles ?? {}));
        if (roles.has(role)) {
          found = roles.get(role);
          return;
        }
      }
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
        const c = rec[f];
        if (Array.isArray(c)) c.forEach(walk);
        else if (c && typeof c === 'object') walk(c);
      }
    };
    walk(node);
    return found;
  };

  // Corpus-shaped transformer output (`on click unless I match .disabled toggle .selected`).
  const cases: Array<[string, string]> = [
    ['hi', 'I match .disabled टॉगल .selected को क्लिक पर जब तक नहीं'],
    ['ko', 'I match .disabled 토글 .selected 를 클릭 할 때 아니라면'],
    ['tr', 'I match .disabled değiştir .selected i tıklama de değilse'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] toggle binds the marked .selected, not the condition's .disabled`, () => {
      const node = parse(input, lang);
      const patient = findRole(node, 'toggle', 'patient') as { value?: string } | undefined;
      expect(patient?.value).toBe('.selected');
      // The fronted condition is reserved on the unless, not consumed by the body.
      const cond = findRole(node, 'unless', 'condition') as { raw?: string } | undefined;
      expect(cond?.raw).toContain('.disabled');
    });
  }
});

describe('Hebrew leading `unless` guard (he unless-condition degenerate → faithful)', () => {
  // he is SVO with a clause-LEADING unless marker (unlike the trailing-SOV ko/bn/ja
  // cases above). `on click unless I match .disabled toggle .selected` was DEGENERATE
  // in he: the i18n transformer left `unless` English and emitted a fronted accusative
  // את ahead of the condition while the toggle lost its own את, collapsing the body.
  // Two-part fix: (1) the i18n transformer routes the inline unless guard through the
  // standalone block path (condition marker-free, toggle keeps את — grammar.test.ts
  // guards that); (2) the he semantic profile gains `unless: אלא` so the leading
  // marker recognizes as `unless` and the schema-generated `unless {condition}`
  // pattern anchors. This guard covers (2): without `unless: אלא` in the he profile
  // the action set drops to {on, toggle} (אלא parses as an unknown identifier).
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  // Corpus-shaped transformer output for `on click unless I match .disabled toggle .selected`.
  const input = 'ב לחיצה אלא I match .disabled מתג את .selected';

  it('[he] recovers the unless guard alongside the toggle body', () => {
    expect(canParse(input, 'he')).toBe(true);
    const actions = new Set(collectActions(parse(input, 'he')));
    // Without `unless: אלא` in the he profile this set is {on, toggle} — guard red.
    expect(actions.has('on')).toBe(true);
    expect(actions.has('toggle')).toBe(true);
    expect(actions.has('unless')).toBe(true);
  });
});

describe('Turkish load/install homonym disambiguation (tr default-value degenerate → faithful)', () => {
  // `on load default my @data-count to "0"` was DEGENERATE in tr. The i18n dict
  // emits yükle for the `load` event (and kur for install), but the tr profile's
  // install primary was ALSO yükle. Under the SOV reorder the event surfaces
  // mid-stream as `yükle de` (on load); the parser read that yükle as the `install`
  // command and the whole `on load` handler dropped (parse anchored on install,
  // {on} lost). Fix: register `load: yükle` as a tr event and move install's primary
  // to kur (the form the dict already emits for install), freeing yükle for `load`.
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  // Corpus-shaped transformer output for `on load default my @data-count to "0"`.
  const input = 'benim @data-count i yükle de varsayılan "0" e';

  it('[tr] recovers the on-load handler (not mis-anchored as install)', () => {
    const actions = new Set(collectActions(parse(input, 'tr')));
    // Before the fix the parse anchored on `install` and lost {on}.
    expect(actions.has('on')).toBe(true);
    expect(actions.has('install')).toBe(false);
  });

  it('[tr] install still parses via kur — freeing yükle does not regress install', () => {
    // `install Draggable` → SOV reorder → `Draggable i kur` (the dict emits kur).
    const actions = new Set(collectActions(parse('Draggable i kur', 'tr')));
    expect(actions.has('install')).toBe(true);
  });
});

describe('`do not throw` fetch modifier strip (fetch-do-not-throw phantom-throw)', () => {
  // `do not throw` is a fetch error-handling OPTION ("don't throw on error"), not a
  // command — en drops it (no `throw` action). The SOV grammar transform leaks the
  // English `do` untranslated and reorders the throw VERB out of the fetch clause, so
  // in the multi-clause body (`… 投げる それから もし …`) it anchored a SPURIOUS
  // `throw` command — a precision defect in bn/hi/ja/ko/tr (and a phantom in several
  // SVO langs too). stripDoNotThrowModifier removes the `do … throw` span before
  // parsing, anchored on the leaked `do` + a `throw`-normalized verb within a small
  // window (ja's negation `ではない` shatters into `で`/`は`/`ない`). The if-body `set`
  // drop is a SEPARATE, deferred recall defect — see the fetch-do-not-throw arc
  // handoff (docs-internal/HANDOFF-fetch-do-not-throw.md).
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  it('[ja] drops the `do … 投げる` modifier — no phantom throw, fetch kept', () => {
    const actions = new Set(
      collectActions(
        parse(
          '/api/users を クリック で フェッチ JSON do ではない 投げる それから もし それ $users を 設定 それ に 終わり',
          'ja'
        )
      )
    );
    expect(actions.has('fetch')).toBe(true);
    expect(actions.has('throw')).toBe(false); // was a phantom throw before the strip
  });

  it('[en] is unaffected — `do not throw` never produced a throw', () => {
    const actions = new Set(
      collectActions(
        parse('on click fetch /api/users as JSON do not throw then if it set it to it end', 'en')
      )
    );
    expect(actions.has('fetch')).toBe(true);
    expect(actions.has('throw')).toBe(false);
  });

  it('does not strip a genuine `throw` command (no leaked `do`)', () => {
    const actions = new Set(collectActions(parse("throw 'boom'", 'en')));
    expect(actions.has('throw')).toBe(true);
  });
});

describe('Hebrew get/tell accusative marker tolerance (he get/tell att, Defect 2)', () => {
  // The i18n transformer marks get's source and tell's destination with the Hebrew
  // accusative את (`קבל את #input.value`, `אמור את #modal`), but the generated he
  // patterns had no `he` markerOverride for those roles — so the `את` token broke the
  // match and `get`/`tell` were dropped (get-value / tell-command / tell-other-element
  // lossy). Adding `he: 'את'` to the get-source and tell-destination markerOverride
  // (mirroring ja を / ko 를 / bn কে / qu ta) lets the generated pattern expect it.
  const collect = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collect(x, acc));
      else if (c && typeof c === 'object') collect(c, acc);
    }
    return acc;
  };

  it('[he] get with accusative את: `קבל את #input.value` is recognized', () => {
    const actions = new Set(collect(parse('ב לחיצה קבל את #input.value אז רשום את זה', 'he')));
    expect(actions.has('get')).toBe(true);
    expect(actions.has('log')).toBe(true);
  });

  it('[he] tell with accusative את: `אמור את #modal` is recognized', () => {
    const actions = new Set(collect(parse('ב לחיצה אמור את #modal על הראה', 'he')));
    expect(actions.has('tell')).toBe(true);
  });
});

describe('Korean command-homonym event head (ko window-scroll degenerate → faithful)', () => {
  // `on scroll from window if … add … else remove … end` was DEGENERATE in ko ({scroll}).
  // ko's event word `스크롤` is ALSO the `scroll` command. With no single-token event
  // marker, ko's Stage-1 fused event pattern can't anchor once the `from window` clause
  // (`창 에서`) splits the handler head — so Stage 2 matched `스크롤` as the scroll command
  // (absorbing `from window` as a role) and returned before the SOV extraction stage, losing
  // the whole if/else body. Fix: when Stage 2 matches a command whose action is a known-event
  // homonym AND the input carries an SOV event-marker head (`스크롤 할 때` = "on scroll"),
  // prefer SOV extraction (hasSOVEventMarkerHead gate). The body itself always parsed — a
  // non-homonym event (`클릭 … 창 에서 …`) was already faithful via the same path.
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  // Corpus-shaped transformer output for
  // `on scroll from window if window.scrollY > 100 add .sticky to #header else remove .sticky from #header end`.
  const input =
    '스크롤 할 때 창 에서 만약 window.scrollY > 100 .sticky 를 추가 #header 에 아니면 .sticky 를 제거 #header 에서 끝';

  it('[ko] anchors `스크롤` as the event, not the scroll command', () => {
    const actions = new Set(collectActions(parse(input, 'ko')));
    // Before the fix the parse anchored on the scroll command and lost the if/else body.
    expect(actions.has('on')).toBe(true);
    expect(actions.has('if')).toBe(true);
    expect(actions.has('add')).toBe(true);
    expect(actions.has('remove')).toBe(true);
    expect(actions.has('scroll')).toBe(false);
  });

  it('[ko] a genuine bare scroll command (no event-marker head) is untouched', () => {
    // `스크롤 #panel` has no `할 때` head, so hasSOVEventMarkerHead is false and the guard
    // does not fire — the scroll command still parses as `scroll`.
    const node = parse('스크롤 #panel', 'ko');
    expect(node.action).toBe('scroll');
  });
});

describe('Thai event-argument is unmarked (th trigger/send — behavior lossy → faithful)', () => {
  // th was the only SVO profile carrying a `roleMarkers.event` (`เมื่อ`, the temporal
  // "when/on" marker). The generated `trigger`/`send` command pattern therefore expected
  // `ทริกเกอร์ เมื่อ {event}`, but the transformer emits an UNMARKED object `ทริกเกอร์
  // {event}` — so the pattern never matched and `trigger`/`send` were dropped. This made th
  // the only language lossy across ALL FOUR behaviors (draggable/removable/resizable/
  // sortable), each missing exactly `trigger`. Fix: drop `roleMarkers.event` so th matches
  // its SVO peers (es/zh/id/…); `เมื่อ` stays on the event-HANDLER head via
  // `eventHandler.eventMarker`, which is unaffected.
  it('[th] `trigger <event>` parses (namespaced event arg)', () => {
    expect(parse('ทริกเกอร์ resizable:start', 'th').action).toBe('trigger');
  });

  it('[th] `send <event>` parses', () => {
    expect(parse('ส่ง foo', 'th').action).toBe('send');
  });

  it('[th] event HANDLER still parses (eventHandler.eventMarker untouched)', () => {
    // `on click toggle .active` → th. Removing the role marker must not break the head.
    expect(parse('เมื่อ คลิก สลับ .active', 'th').action).toBe('on');
  });
});

describe('Per-language `of`-possessive markers (set-color-variable ms/sw/vi/zh lossy → faithful)', () => {
  // `on click set the *--primary-color of #theme to "#ff6600"` dropped its `set` in
  // ms/sw/vi/zh: the set target is an "of"-possessive property path
  // (`*--primary-color of #theme`), but `isOfPossessiveMarker` only recognized EN `of`,
  // TL `ng`, and tokens normalized to `of`/`source` (ar `من`). The transformer emits the
  // `of` connector as a possessive particle / genitive linker that tokenizes as a bare
  // identifier/particle — ms `daripada`, sw `ya`, vi `của`, zh `的` — so the property-path
  // never matched and `set` was lost (fid 0.5). Fix: OF_POSSESSIVE_MARKERS per language.
  const collectActions = (node: unknown, acc: string[] = []): string[] => {
    if (!node || typeof node !== 'object') return acc;
    const rec = node as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
      else if (c && typeof c === 'object') collectActions(c, acc);
    }
    return acc;
  };

  // Corpus-shaped transformer output for `on click set the *--primary-color of #theme to "…"`.
  const cases: Record<string, string> = {
    ms: 'apabila click tetapkan the *--primary-color daripada #theme ke "#ff6600"',
    sw: 'kwenye bonyeza seti the *--primary-color ya #theme kwa "#ff6600"',
    vi: 'khi nhấp gán the *--primary-color của #theme vào "#ff6600"',
    zh: '当 点击 时 设置 把 the *--primary-color 的 #theme 到 "#ff6600"',
  };

  for (const [lang, input] of Object.entries(cases)) {
    it(`[${lang}] recovers the set across the of-possessive target`, () => {
      const actions = new Set(collectActions(parse(input, lang)));
      expect(actions.has('set')).toBe(true); // was dropped before the fix
      expect(actions.has('on')).toBe(true);
    });
  }

  it('[en] of-possessive is unaffected (control)', () => {
    const actions = new Set(
      collectActions(parse('on click set the *--primary-color of #theme to "#ff6600"', 'en'))
    );
    expect(actions.has('set')).toBe(true);
    expect(actions.has('on')).toBe(true);
  });

  it('a real `from` source role is NOT misread as an of-possessive', () => {
    // ms `daripada` is gated to property-path roles; an ordinary `get … from #x` is fine.
    expect(parse('seti #x kwa "y"', 'sw').action).toBe('set'); // plain set, no of-marker
  });
});

describe('get keyword alignment de/pl/zh (get-value lossy → faithful)', () => {
  // `on click get #input.value then log it` dropped its `get` in de/pl/zh:
  // - de: the i18n dict emits `erhalten`, but the de profile get was holen/bekommen only
  //   → `erhalten` unrecognized, get dropped. Fix: add `erhalten` to the de get alts.
  // - pl: the i18n dict emitted `pobierz` for get, but `pobierz` is the pl profile's FETCH
  //   primary → every get parsed as fetch. Fix: dict emits `uzyskaj` (pl get primary).
  // - zh: `fetch-zh-ba` listed `获得` (the zh dict's get word) as a fetch alt, AND the
  //   generated zh get pattern didn't tolerate the BA marker `把` → `获得 把 #x` mis-parsed
  //   as fetch. Fix: drop `获得` from fetch-zh-ba + a `get-zh-ba` pattern (mirrors it).
  it('[de] `erhalten` is recognized as get', () => {
    expect(parse('erhalten #input.value', 'de').action).toBe('get');
  });

  it('[pl] `uzyskaj` parses as get (not fetch)', () => {
    expect(parse('uzyskaj #input.value', 'pl').action).toBe('get');
  });

  it('[zh] `获得 把 #x` parses as get, not fetch', () => {
    expect(parse('获得 把 #input.value', 'zh').action).toBe('get');
  });

  it('[zh] real fetch (`抓取 把 …`) is unaffected by removing 获得 from fetch-zh-ba', () => {
    expect(parse('抓取 把 /api/data', 'zh').action).toBe('fetch');
  });
});

describe('Optional call patient marker he/zh (form-submit-prevent lossy → faithful)', () => {
  // `call validateForm()` dropped in he/zh: the function-call patient is an expression,
  // not a definite DOM object, so the transformer emits it UNMARKED in a multi-command
  // body (`קרא validateForm()` / `调用 validateForm()`), but the he/zh patient roleMarker
  // (את / 把) made the generated call pattern REQUIRE it → no match, `call` lost. Fix:
  // markerOptional { he, zh } on the call patient role → the marker is an optional group,
  // so both the unmarked (body) and marked forms parse. Scoped to he/zh (SOV call already
  // parsed; leaving their marker required avoids relaxing role typing).
  it('[he] unmarked function-call patient parses (`קרא validateForm()`)', () => {
    expect(parse('קרא validateForm()', 'he').action).toBe('call');
  });

  it('[zh] unmarked function-call patient parses (`调用 validateForm()`)', () => {
    expect(parse('调用 validateForm()', 'zh').action).toBe('call');
  });
});

describe('SOV primary-role normalization (Arc 4 — fronted patient → schema primaryRole; R1)', () => {
  // When an SOV/V2 reorder fronts a command's leading object, the fused-event path
  // binds it to the generic `patient` role. For commands with NO `patient` role and
  // a distinct primaryRole (fetch→source, wait→duration, send/trigger→event), this
  // is a pure R1 role MISTYPE — the command and the value's TYPE are right, only the
  // role NAME is wrong (`fetch.source` was missing 13× per SOV language). The
  // normalization relabels the spurious `patient` to the schema primaryRole, lifting
  // avgRoleFidelity ~+0.04 across hi/bn/qu/ja/ko/tr with zero R0/precision regressions.
  // See normalizeCommandRoles in semantic-parser.ts.

  // First command node with the given action anywhere in the tree → its roles map.
  function findRoles(node: any, action: string): Map<string, any> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    if (node.action === action && node.roles instanceof Map) return node.roles;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
      const child = node[f];
      if (Array.isArray(child)) {
        for (const c of child) {
          const r = findRoles(c, action);
          if (r) return r;
        }
      }
    }
    return undefined;
  }

  // Corpus-shaped SOV translations: the fronted URL must land in `source`, never the
  // spurious `patient` (fetch schema has no patient role).
  const fetchCases: Array<[string, string]> = [
    ['hi', '/api/data को क्लिक पर लाएं फिर यह को रखें #result में'],
    ['ja', '/api/data を クリック で フェッチ それから それ を #result に 置く'],
    ['ko', '/api/data 를 클릭 할 때 가져오기 그러면 그것 를 #result 에 넣다'],
    ['qu', '/api/data ta ñitiy pi apamuy chayqa chay ta #result man churay'],
  ];
  for (const [lang, input] of fetchCases) {
    it(`[${lang}] fronted fetch URL → fetch.source (not patient)`, () => {
      const roles = findRoles(parse(input, lang), 'fetch');
      expect(roles).toBeDefined();
      expect(roles!.has('source')).toBe(true);
      expect(roles!.has('patient')).toBe(false);
    });
  }

  it('[hi] fronted wait duration → wait.duration (not patient)', () => {
    const roles = findRoles(parse('2s को क्लिक पर प्रतीक्षा फिर मैं को हटाएं', 'hi'), 'wait');
    expect(roles?.has('duration')).toBe(true);
    expect(roles?.has('patient')).toBe(false);
  });

  it('[ja] fronted send payload → send.event (not patient)', () => {
    const roles = findRoles(parse('"hello" を クリック で 送る ChatSocket に', 'ja'), 'send');
    expect(roles?.has('event')).toBe(true);
    expect(roles?.has('patient')).toBe(false);
  });

  // Control: a command that legitimately HAS a patient role (primaryRole === patient)
  // keeps it — the normalization is gated to primaryRole !== patient, so toggle/add/etc
  // are never touched.
  it('[ja] toggle keeps its patient role (schema primaryRole IS patient — not remapped)', () => {
    const roles = findRoles(parse('.active を クリック で トグル', 'ja'), 'toggle');
    expect(roles?.has('patient')).toBe(true);
  });

  // Control: en SVO is unaffected (the standard pattern assigns source directly; the
  // normalization is a no-op because there is no spurious patient).
  it('[en] SVO fetch is unchanged (source, no patient)', () => {
    const roles = findRoles(parse('on click fetch /api/data', 'en'), 'fetch');
    expect(roles?.has('source')).toBe(true);
    expect(roles?.has('patient')).toBe(false);
  });
});

describe('tr resize single-token event keyword (window-resize NULL → faithful)', () => {
  // `boyut_değiştir` split on `_` in the tr tokenizer → `boyut` + `değiştir`, and
  // `değiştir` normalizes to `toggle` (homonym), destroying the resize event — the
  // lone tr parse hard-fail. The non-underscore `boyutlandırma` (and the verb stem
  // `boyutlandır`) keep the event token whole and resolve to the `resize` event.
  // The window-resize corpus shape (en reference:
  // `on resize from window debounced at 200ms call adjustLayout()`).
  const corpus = 'debounced at 200ms adjustLayout() i boyutlandırma de çağır pencere den';

  it('[tr] window-resize parses as a resize event handler (was the lone tr hard-fail)', () => {
    const node: any = parse(corpus, 'tr');
    expect(node.action).toBe('on');
    expect(node.roles.get('event')?.value).toBe('resize');
  });

  it('[tr] resize keyword no longer mis-parses as the `toggle` homonym (call body, no toggle)', () => {
    const node: any = parse(corpus, 'tr');
    const actions = (node.body || []).map((b: any) => b.action);
    expect(actions).toContain('call');
    expect(actions).not.toContain('toggle');
  });
});

describe('Schema default-role fill (Tier 2b — SOV drops defaulted roles; R1)', () => {
  // The generated SVO pattern materializes a schema role's `default` when the role is
  // absent (toggle/add destination → me, increment/decrement quantity → 1), so the en
  // parse carries it — but the SOV fused-event / extraction paths dropped it (en
  // `increment.quantity:literal` vs SOV nothing), a false-positive in R1 role-recall
  // (both default identically at runtime). `fillSchemaDefaults` is the
  // fidelity-MEASUREMENT normalization the harness applies before collecting role
  // signatures (R1 0.872 → 0.908). It is NOT applied in `parse()` — that would make
  // the renderer emit the defaults and break round-trips — so we apply it explicitly
  // here, exactly as the parse-validator does.
  function rolesOf(input: string, lang: string, action: string): Map<string, any> | undefined {
    const node: any = fillSchemaDefaults(parse(input, lang) as any);
    function find(n: any): Map<string, any> | undefined {
      if (!n || typeof n !== 'object') return undefined;
      if (n.action === action && n.roles instanceof Map) return n.roles;
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
        const c = n[f];
        if (Array.isArray(c)) {
          for (const x of c) {
            const r = find(x);
            if (r) return r;
          }
        }
      }
      return undefined;
    }
    return find(node);
  }

  it('[ja] increment fills the quantity default (1), matching en', () => {
    expect(rolesOf('#counter を クリック で 増加', 'ja', 'increment')?.get('quantity')?.value).toBe(1);
  });

  it('[ja] toggle fills the destination default (me) when no target is given', () => {
    expect(rolesOf('.active を クリック で 切り替え', 'ja', 'toggle')?.get('destination')?.value).toBe(
      'me'
    );
  });

  it('[en] increment also carries the quantity default (en/candidate symmetry)', () => {
    expect(rolesOf('on click increment #counter', 'en', 'increment')?.get('quantity')?.value).toBe(1);
  });

  // Control: an EXPLICIT role value is never clobbered by its schema default.
  it('[ja] explicit remove source (#foo) is not overwritten by the me default', () => {
    expect(rolesOf('.x を クリック で 削除 #foo から', 'ja', 'remove')?.get('source')?.value).toBe(
      '#foo'
    );
  });

  // The default-fill is a MEASUREMENT pass only — `parse()` must NOT materialize it
  // (else the renderer emits phantom default tokens and round-trips break).
  it('[ja] parse() alone does NOT fill the increment quantity default', () => {
    const r = (() => {
      const n: any = parse('#counter を クリック で 増加', 'ja');
      function find(x: any): Map<string, any> | undefined {
        if (!x || typeof x !== 'object') return undefined;
        if (x.action === 'increment' && x.roles instanceof Map) return x.roles;
        for (const f of ['body', 'statements', 'eventHandlers']) {
          const c = x[f];
          if (Array.isArray(c)) for (const y of c) { const z = find(y); if (z) return z; }
        }
        return undefined;
      }
      return find(n);
    })();
    expect(r?.has('quantity')).toBe(false);
  });
});

describe('Multi-event `or` conjunction in handler heads (multiple-events, R2)', () => {
  // `on click or keypress[key=="Enter"] toggle .active` lists two events. en
  // handled it (extractOrConjunctionEvents); the per-language pattern paths did
  // not — the SVO "full" patterns captured the translated `or` (`o`/`또는`/…) as a
  // phantom body command (it → "Unknown command: or" at runtime) and the SOV
  // Stage-3 fallback mangled the clause (ko folded `또는keypress…할때` into an
  // invalid CSS selector). A scoped pre-pass now excises `<or-word> <event>[filter]`
  // and re-parses the single-event handler every language already handles, then
  // re-attaches the extra event. See execution-validator.ts wave 7.
  function bodyActions(node: any, acc = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return acc;
    if (typeof node.action === 'string' && node.action !== 'compound') acc.add(node.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = node[f];
      if (Array.isArray(c)) c.forEach((x: any) => bodyActions(x, acc));
      else if (c && typeof c === 'object') bodyActions(c, acc);
    }
    return acc;
  }

  // Corpus-shaped multiple-events translations (en → lang). Each must parse to a
  // single-event toggle handler — toggle present, NO phantom `or` command.
  const cases: Array<[string, string]> = [
    ['en', 'on click or keypress[key=="Enter"] toggle .active'],
    ['it', 'su clic o keypress[key=="Enter"] commutare .active'],
    ['ja', '.active を クリック または keypress[key=="Enter"] で 切り替え'],
    ['ko', '.active 를 클릭 또는 keypress[key=="Enter"] 할 때 토글'],
    ['hi', '.active को क्लिक या keypress[key=="Enter"] पर टॉगल'],
    ['tr', '.active i tıklama veya keypress[key=="Enter"] de değiştir'],
    ['bn', '.active কে ক্লিক অথবা keypress[key=="Enter"] এ টগল'],
    ['qu', '.active ta ñitiy utaq keypress[key=="Enter"] pi tikray'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] parses to a single-event toggle handler (no phantom 'or' command)`, () => {
      const node = parse(input, lang);
      expect(node.action).toBe('on');
      const actions = bodyActions(node);
      expect(actions.has('toggle')).toBe(true);
      expect(actions.has('or')).toBe(false);
      // The second event is preserved (moved to additionalEvents), not dropped.
      const extra = (node as any).additionalEvents?.map((e: any) => e.value) ?? [];
      expect(extra).toContain('keypress');
    });
  }

  it('[ja] `または` tokenizes as a single `or` keyword, not `また`(and) + `は`', () => {
    const tk = getTokenizer('ja')!;
    const toks = (tk.tokenize('または keypress') as any).tokens.map((t: any) => t.normalized ?? t.value);
    expect(toks).toContain('or');
    expect(toks).not.toContain('and');
  });

  // Control: `or` inside an EXPRESSION must NEVER be excised (the post-`or` token
  // is a variable/number, not an event), so no phantom additionalEvents appear.
  it('[en] `or` in a condition is untouched (if I match .a or I match .b)', () => {
    const node = parse('on click if I match .a or I match .b then toggle .x end', 'en');
    expect(node.action).toBe('on');
    expect((node as any).additionalEvents ?? []).toHaveLength(0);
    expect(bodyActions(node).has('if')).toBe(true);
  });

  it('[en] `or` in a value default is untouched (set $count to ($count or 0) + 1)', () => {
    const node = parse('on click set $count to ($count or 0) + 1', 'en');
    expect(node.action).toBe('on');
    expect((node as any).additionalEvents ?? []).toHaveLength(0);
    expect(bodyActions(node).has('set')).toBe(true);
  });
});

describe('Positional put `before`/`after` captures manner (put-before/put-after, R2 worklist)', () => {
  // `put X before/after me` must parse with roles { patient, destination:me,
  // manner:'before'/'after' } so the put AST-mapper inserts the content relative to
  // the target (English's DOM effect). Each language's position word was previously
  // dropped (rendered into the destination, mis-read as a `before`/`after` COMMAND
  // in SOV, or split as a then-clause for tr `sonra` / bn `পরে`), losing the
  // position. Corpus translations (en → lang) of `on click put "<p>New</p>"
  // before/after me`. ar/tl/uk (VSO) are NOT here — the fused VSO event pattern
  // still drops manner (tracked separately).
  function findPut(node: any): any {
    if (!node || typeof node !== 'object') return undefined;
    if (node.action === 'put') return node;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = node[f];
      if (Array.isArray(c)) for (const x of c) { const r = findPut(x); if (r) return r; }
      else if (c && typeof c === 'object') { const r = findPut(c); if (r) return r; }
    }
    return undefined;
  }
  const role = (put: any, r: string) => {
    const v = put?.roles instanceof Map ? put.roles.get(r) : put?.roles?.[r];
    return v?.value ?? v;
  };

  const before: Array<[string, string]> = [
    ['ja', '"<p>New</p>" 前に 私 を クリック で 置く'],
    ['ko', '"<p>New</p>" 전에 나 를 클릭 할 때 넣다'],
    ['hi', '"<p>New</p>" से पहले मैं को क्लिक पर रखें'],
    ['bn', '"<p>New</p>" আগে আমি কে ক্লিক এ রাখুন'],
    ['tr', '"<p>New</p>" önce ben i tıklama de koy'],
    ['qu', '"<p>New</p>" ñawpaqpi noqa ta ñitiy pi churay'],
    ['it', 'su clic mettere "<p>New</p>" prima io'],
    ['vi', 'khi nhấp đặt "<p>New</p>" trước tôi'],
    ['ru', 'при клик положить "<p>New</p>" до я'],
    ['pl', 'gdy kliknięcie umieść "<p>New</p>" przed ja'],
    ['th', 'เมื่อ คลิก ใส่ "<p>New</p>" ก่อน ฉัน'],
    // VSO (ar/tl verb-first, uk event-first): the handcrafted put-event-<lang>-vso-before
    // pattern out-ranks the generated fused pattern (which drops manner).
    ['ar', 'ضع "<p>New</p>" قبل أنا عند نقر'],
    ['tl', 'ilagay "<p>New</p>" bago ako kapag click'],
    ['uk', 'при клік покласти "<p>New</p>" до я'],
  ];
  const after: Array<[string, string]> = [
    ['ja', '"<p>New</p>" 後に 私 を クリック で 置く'],
    ['ko', '"<p>New</p>" 후에 나 를 클릭 할 때 넣다'],
    ['hi', '"<p>New</p>" के बाद मैं को क्लिक पर रखें'],
    ['bn', '"<p>New</p>" পরে আমি কে ক্লিক এ রাখুন'],
    ['tr', '"<p>New</p>" sonra ben i tıklama de koy'],
    ['qu', '"<p>New</p>" qhepapi noqa ta ñitiy pi churay'],
    ['it', 'su clic mettere "<p>New</p>" dopo io'],
    ['vi', 'khi nhấp đặt "<p>New</p>" sau tôi'],
    ['ru', 'при клик положить "<p>New</p>" после я'],
    ['pl', 'gdy kliknięcie umieść "<p>New</p>" po ja'],
    ['th', 'เมื่อ คลิก ใส่ "<p>New</p>" หลัง ฉัน'],
    ['ar', 'ضع "<p>New</p>" بعد أنا عند نقر'],
    ['tl', 'ilagay "<p>New</p>" matapos ako kapag click'],
    ['uk', 'при клік покласти "<p>New</p>" після я'],
  ];

  for (const [lang, code] of before) {
    it(`[${lang}] put-before captures manner=before + destination`, () => {
      const put = findPut(parse(code, lang));
      expect(put, `no put command parsed for ${lang}`).toBeTruthy();
      expect(role(put, 'manner')).toBe('before');
      expect(role(put, 'destination')).toBeTruthy();
    });
  }
  for (const [lang, code] of after) {
    it(`[${lang}] put-after captures manner=after + destination`, () => {
      const put = findPut(parse(code, lang));
      expect(put, `no put command parsed for ${lang}`).toBeTruthy();
      expect(role(put, 'manner')).toBe('after');
      expect(role(put, 'destination')).toBeTruthy();
    });
  }
});

describe('`halt the event` skips the leaked article → patient:reference (halt.patient R1)', () => {
  // `halt the event` parses with patient = the `event` REFERENCE, never the
  // article. Two facets of one defect, both in skipNoiseWords (pattern-matcher):
  //   - en: `event` tokenizes as a keyword (not selector/identifier), so the
  //     existing article-skip missed it and the role captured `the` itself
  //     (patient:literal="the", the event dropped). en was the odd reference that
  //     every faithful translation mismatched.
  //   - SVO/VSO: the i18n transformer leaves `the` untranslated before the
  //     translated event word (`the evento entonces …`). The pre-existing
  //     non-en skip only fired before a SOV particle, so these kept
  //     patient:expression="the". Extending it to a clause boundary (then/end/
  //     EOF) — but NOT a following command verb — skips the leaked article.
  // Net: en + all 23 priority langs now agree on halt.patient:reference for
  // halt-propagation (avgRoleFidelity +0.0014–0.0029/lang, zero regressions).
  function findHalt(node: any): any {
    if (!node || typeof node !== 'object') return undefined;
    if (node.action === 'halt') return node;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers', 'initBlock']) {
      const c = node[f];
      if (Array.isArray(c)) for (const x of c) { const r = findHalt(x); if (r) return r; }
      else if (c && typeof c === 'object') { const r = findHalt(c); if (r) return r; }
    }
    return undefined;
  }
  const patientType = (halt: any): string | undefined => {
    const v = halt?.roles instanceof Map ? halt.roles.get('patient') : halt?.roles?.patient;
    return v?.type;
  };
  function actions(node: any): string[] {
    const acc = new Set<string>();
    (function w(x: any) {
      if (!x || typeof x !== 'object') return;
      if (typeof x.action === 'string' && x.action !== 'compound') acc.add(x.action);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers', 'initBlock']) {
        const c = x[f];
        if (Array.isArray(c)) c.forEach(w);
        else if (c && typeof c === 'object') w(c);
      }
    })(node);
    return [...acc].sort();
  }

  // halt-propagation corpus translations (en → lang): `... halt the event then
  // toggle .active`. The ref noun is followed by a clause boundary (`then` / its
  // translation), so the leaked article is skipped and patient is the event ref.
  const haltEventCases: Array<[string, string]> = [
    ['en', 'on click halt the event then toggle .active'],
    ['es', 'en clic detener the evento entonces alternar .active'],
    ['fr', 'sur clic stopper the événement alors basculer .active'],
    ['de', 'bei klick anhalten the ereignis dann umschalten .active'],
    ['ru', 'при клик остановить the событие затем переключить .active'],
    ['uk', 'при клік зупинити the подія тоді перемкнути .active'],
    ['pl', 'gdy kliknięcie zatrzymaj the zdarzenie wtedy przełącz .active'],
    ['zh', '当 点击 时 停止 把 the 事件 那么 切换 把 .active'],
    ['hi', 'the घटना को क्लिक पर रोकें फिर .active को टॉगल'],
    ['ja', 'the イベント を クリック で 停止 それから .active を 切り替え'],
    ['ko', 'the 이벤트 를 클릭 할 때 정지 그러면 .active 를 토글'],
  ];
  for (const [lang, code] of haltEventCases) {
    it(`[${lang}] halt the event → patient:reference (article skipped)`, () => {
      const halt = findHalt(parse(code, lang));
      expect(halt, `no halt command parsed for ${lang}`).toBeTruthy();
      expect(patientType(halt)).toBe('reference');
    });
  }

  // §7y guard, now SOV-scoped: when a command VERB directly follows the ref
  // noun in an SOV language, the leaked article must NOT be skipped — skipping
  // it breaks the fragile SOV/agglutinative body parse (tr form-submit-prevent:
  // `the olay çağır …` = "the event call …"). The patient stays non-reference
  // and the whole command sequence survives.
  it('[tr] §7y: SOV — verb after ref noun → article NOT skipped, body intact', () => {
    const node = parse(
      'the olay çağır validateForm() i gönder de durdur eğer sonuç dir yanlış "Invalid form" i kaydet son',
      'tr'
    );
    const halt = findHalt(node);
    expect(halt, 'no halt parsed for tr').toBeTruthy();
    expect(patientType(halt)).not.toBe('reference');
    // Body parse must survive (the §7y regression dropped commands).
    expect(actions(node)).toEqual(['call', 'halt', 'if', 'log', 'on']);
  });

  // SVO verb-boundary (R1 residue halt sweep): in a verb-first language the
  // command verb after the ref noun IS a clause boundary (it opens the next
  // juxtaposed body command), so the article is skipped, the patient is the
  // event reference — and the body still survives intact.
  it('[es] SVO — verb after ref noun IS a boundary: patient is the event reference, body intact', () => {
    const node = parse(
      'en enviar detener the evento llamar validateForm() si resultado es falso registrar "Invalid form" fin',
      'es'
    );
    const halt = findHalt(node);
    expect(halt, 'no halt parsed for es').toBeTruthy();
    expect(patientType(halt)).toBe('reference');
    expect(actions(node)).toEqual(['call', 'halt', 'if', 'log', 'on']);
  });

  // Controls: a non-reference keyword after `the` keeps the article (no skip),
  // and a bare `halt` has no patient at all.
  it('[en] `halt the default` keeps the article (default is not a reference)', () => {
    const halt = findHalt(parse('halt the default', 'en'));
    expect(patientType(halt)).toBe('literal');
  });
  it('[en] bare `halt` has no patient role', () => {
    const halt = findHalt(parse('on click halt', 'en'));
    expect(halt).toBeTruthy();
    const hasPatient = halt.roles instanceof Map ? halt.roles.has('patient') : !!halt.roles?.patient;
    expect(hasPatient).toBe(false);
  });
});

describe('repeat forever loop keyword recognized (repeat.loopType:literal R1)', () => {
  // The i18n dict never translated `forever`, so the corpus leaves it as the English
  // word in most langs (`repetir forever`) and a native word in a few (ru `всегда`,
  // vi `mãi mãi`, tl `magpakailanman`, …). Unrecognized, it typed `loopType:expression`
  // (SVO) instead of EN's `:literal` — the repeat.loopType R1 residue. Adding the
  // corpus word as a `forever` keyword in each profile lets the generated repeat
  // pattern type it as a literal, matching EN (17 SVO/VSO langs +0.0011, zero
  // regression). SOV langs (ja/ko/tr/bn/hi) don't yet capture it (their fused/SOV
  // repeat pattern drops the loop keyword — a separate follow-up), and zh is excluded
  // (its generated repeat greedily grabs the body verb as a phantom `quantity`).
  function repeatLoopType(node: unknown): string | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const rec = node as Record<string, unknown>;
    if (rec.action === 'repeat') {
      const roles = rec.roles instanceof Map ? rec.roles : undefined;
      const lt = roles?.get('loopType') as { type?: string } | undefined;
      if (lt) return lt.type;
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const r = repeatLoopType(x);
          if (r) return r;
        }
      } else if (c && typeof c === 'object') {
        const r = repeatLoopType(c);
        if (r) return r;
      }
    }
    return undefined;
  }

  // Real corpus `repeat-forever` texts (head + body), spanning English-word and
  // native-word forms, SVO and VSO, single- and multi-word keywords.
  for (const [lang, src] of [
    ['es', 'en cargar repetir forever alternar .pulse entonces esperar 1s fin'],
    ['de', 'bei laden wiederholen forever umschalten .pulse dann warten 1s ende'],
    ['ar', 'عند تحميل كرر forever بدل .pulse ثم انتظر 1s النهاية'],
    ['ru', 'при загрузка повторить всегда переключить .pulse затем ждать 1s конец'],
    ['tl', 'kapag load ulitin magpakailanman palitan .pulse pagkatapos maghintay 1s wakas'],
    ['vi', 'khi tải lặp lại mãi mãi chuyển đổi .pulse rồi chờ 1s kết thúc'],
  ] as [string, string][]) {
    it(`[${lang}] repeat forever → loopType is a literal`, () => {
      expect(repeatLoopType(parse(src, lang))).toBe('literal');
    });
  }

  it('[en] repeat forever stays a literal (reference unchanged)', () => {
    expect(repeatLoopType(parse('on load repeat forever toggle .pulse wait 1s end', 'en'))).toBe(
      'literal'
    );
  });
});

describe('Fused event-handler body re-parses secondary role clauses (fetch.responseType R1)', () => {
  // A fused event-handler pattern captures the wrapped command's VERB + PRIMARY arg
  // and drops every SECONDARY role clause: `<event> fetch /api as json` keeps
  // `source` but loses the `as {responseType}` tail — even though a STANDALONE parse
  // of the same clause keeps it. buildEventHandler now re-parses [verb..clause
  // boundary] (finding the verb by scanning BACK, so verb-MEDIAL fused captures like
  // fetch-event-<lang>-vso are handled) and swaps in the richer node when it is the
  // SAME command, a SUPERSET of the fused roles (never replacing a real role with a
  // defaulted one), with strictly MORE roles. Guards: block-body actions
  // (repeat/if/for/while) are skipped (their inline body must not be swallowed),
  // verb-FIRST fused patterns are skipped (the event head sits inside the clause).
  function commandSig(node: unknown, action: string): string[] | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const rec = node as Record<string, unknown>;
    if (rec.action === action && rec.roles instanceof Map) {
      return [...rec.roles.entries()].map(([k, v]) => {
        const t =
          v !== null && typeof v === 'object' && typeof (v as { type?: unknown }).type === 'string'
            ? (v as { type: string }).type
            : typeof v;
        return `${k}:${t}`;
      });
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches', 'eventHandlers']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const r = commandSig(x, action);
          if (r) return r;
        }
      } else if (c && typeof c === 'object') {
        const r = commandSig(c, action);
        if (r) return r;
      }
    }
    return undefined;
  }

  // fetch in an event handler keeps its `as {responseType}` tail (the 63× residue),
  // across SVO (es/it/pt/sw) and the native-`as`-word langs (de `als`, fr `comme`,
  // ru `как`). Real corpus fetch-json texts (head: `on click fetch … as json then …`).
  for (const [lang, src] of [
    ['es', 'en clic buscar /api/user como json entonces establecer #x a su.name'],
    ['de', 'bei klick abrufen /api/user als json dann festlegen #x zu sein.name'],
    ['fr', 'sur clic récupérer /api/user comme json alors définir #x à son.name'],
    ['ru', 'при клик загрузить /api/user как json затем установить #x в его.name'],
  ] as [string, string][]) {
    it(`[${lang}] fetch in event handler keeps responseType`, () => {
      const sig = commandSig(parse(src, lang), 'fetch');
      expect(sig).toBeTruthy();
      expect(sig).toContain('responseType:expression');
      expect(sig).toContain('source:literal');
    });
  }

  // VERB-FIRST excision (ar): `fetch-event-ar-vso-verb-first` puts the event head
  // `عند نقر` (on click) BETWEEN the verb and the `كـ {responseType}` tail, so the
  // [verb..boundary] slice re-includes it. #530 skipped verb-first patterns; now we
  // EXCISE the event token + its preceding `on`-marker keyword before re-parsing, so
  // the standalone `fetch-ar` pattern recovers responseType. Corpus fetch-json /
  // fetch-error-handling texts (head: verb-first `fetch /api on click as-json …`).
  for (const src of [
    'احضر /api/user عند نقر كـjson ثم اضبط #name.innerText إلى له.name',
    'احضر /api/data عند نقر كـjson ثم إذا له.error ضع له.error إلى #error وإلا ضع له.data إلى #result النهاية',
  ]) {
    it(`[ar] verb-first fetch keeps responseType (event head excised): "${src.slice(0, 28)}…"`, () => {
      const sig = commandSig(parse(src, 'ar'), 'fetch');
      expect(sig).toBeTruthy();
      expect(sig).toContain('responseType:expression');
      expect(sig).toContain('source:literal');
    });
  }

  // Verb-first excision must NOT fire when there is no secondary tail to reclaim:
  // bare `fetch /api on click` keeps a single `source` role, never a phantom.
  it('[ar] verb-first fetch without a tail keeps exactly source:literal', () => {
    const sig = commandSig(parse('احضر /api/data عند نقر ثم ضع هو إلى #result', 'ar'), 'fetch');
    expect(sig).toEqual(['source:literal']);
  });

  // Superset guard: verb-FINAL SOV (qu) — the fronted patient `#score` is NOT in the
  // [verb..boundary] clause, so the re-parse fills a DEFAULT patient; the superset
  // check must REJECT that swap and keep the real `patient:selector`.
  it('[qu] verb-final increment keeps the fronted patient:selector (no default-swap)', () => {
    const sig = commandSig(parse('#score ta ñitiy pi yapachiy 10', 'qu'), 'increment');
    expect(sig).toContain('patient:selector');
  });

  // Block-body guard: the loop body command must survive (not be swallowed into repeat).
  it('[es] repeat-forever keeps its toggle body command (block body not swallowed)', () => {
    const node = parse('en cargar repetir forever alternar .pulse entonces esperar 1s fin', 'es');
    expect(commandSig(node, 'toggle')).toBeTruthy();
    expect(commandSig(node, 'repeat')).toBeTruthy();
  });
});

describe('Counted-loop HEAD patterns: `{verb} {quantity} times` (repeat.quantity:literal)', () => {
  // Mirrors the en `repeat {quantity} times` HEAD pattern (#521) for verb-first
  // languages. Captures quantity:literal + loopType:literal="times", stopping after
  // the count word so the body is parsed separately. Without it the generated
  // positional repeat grabs the NUMBER as loopType and drops quantity.
  function repeatRoles(node: unknown): string[] | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const rec = node as Record<string, unknown>;
    if (rec.action === 'repeat' && rec.roles instanceof Map) {
      return [...rec.roles.entries()].map(([k, v]) => {
        const t =
          v !== null && typeof v === 'object' && typeof (v as { type?: unknown }).type === 'string'
            ? (v as { type: string }).type
            : typeof v;
        return `${k}:${t}`;
      });
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const r = repeatRoles(x);
          if (r) return r;
        }
      } else if (c && typeof c === 'object') {
        const r = repeatRoles(c);
        if (r) return r;
      }
    }
    return undefined;
  }

  // Verb-FIRST-input langs (the repeat reaches the standalone command path): the
  // corpus repeat-times texts gain quantity:literal + loopType:literal="times".
  for (const [lang, src] of [
    ['ar', 'كرر 3 times عند نقر ثم أضف "<p>Line</p>" إلى أنا'],
    ['he', 'ב לחיצה חזור את 3 times אז הוסף את "<p>Line</p>" על אני'],
    ['tl', 'ulitin 3 beses kapag click pagkatapos idagdag "<p>Line</p>" sa ako'],
    ['zh', '当 点击 时 重复 把 3 times 那么 添加 把 "<p>Line</p>" 到 我'],
  ] as [string, string][]) {
    it(`[${lang}] repeat-times captures quantity:literal + loopType:literal`, () => {
      const roles = repeatRoles(parse(src, lang));
      expect(roles).toBeTruthy();
      expect(roles).toContain('quantity:literal');
      expect(roles).toContain('loopType:literal');
    });
  }

  // The HEAD pattern is HEAD-only: a STANDALONE counted loop captures the count and
  // leaves the body for the clause loop (es, the verb is the clause head).
  it('[es] standalone repeat-times captures quantity:literal (HEAD-only)', () => {
    const roles = repeatRoles(parse('repetir 3 times agregar "<p>x</p>" a yo', 'es'));
    expect(roles).toContain('quantity:literal');
    expect(roles).toContain('loopType:literal');
  });

  // Two-word verb (vi `lặp lại`) tokenizes as ONE fused keyword token, so the HEAD
  // pattern must match the verb as a single literal (not split on whitespace).
  // Verified both standalone and in-handler (the latter via the block-body HEAD
  // re-parse swapping in the `repeat-vi-times` match). Without the fix vi fell
  // through to the generated positional repeat → loopType:literal=3, no quantity.
  it('[vi] standalone two-word-verb repeat-times captures quantity:literal', () => {
    const roles = repeatRoles(parse('lặp lại 3 lần', 'vi'));
    expect(roles).toContain('quantity:literal');
    expect(roles).toContain('loopType:literal');
  });
  it('[vi] in-handler two-word-verb repeat-times captures quantity:literal', () => {
    const roles = repeatRoles(parse('khi nhấp lặp lại 3 lần rồi thêm "<p>Line</p>" vào tôi', 'vi'));
    expect(roles).toContain('quantity:literal');
    expect(roles).toContain('loopType:literal');
  });

  // IN-EVENT-HANDLER (event-first langs): the repeat sits in the fused-event body
  // and `repeat` is a BLOCK_BODY_ACTION, so the fused-body re-parse is normally
  // skipped. The block-body guard now makes an exception for a HEAD-ONLY counted
  // loop (re-parse matched a `repeat-<lang>-times` pattern), recovering quantity +
  // loopType="times" without swallowing the body. Corpus repeat-times texts.
  for (const [lang, src] of [
    ['es', 'en clic repetir 3 times entonces agregar "<p>x</p>" a yo'],
    ['de', 'bei klick wiederholen 3 times dann hinzufügen "<p>x</p>" zu ich'],
    ['ru', 'при клик повторить 3 times затем добавить "<p>x</p>" в я'],
    ['it', 'su clic ripetere 3 times allora aggiungere "<p>x</p>" in io'],
  ] as [string, string][]) {
    it(`[${lang}] in-handler repeat-times captures quantity:literal (block-body HEAD exception)`, () => {
      const roles = repeatRoles(parse(src, lang));
      expect(roles).toContain('quantity:literal');
      expect(roles).toContain('loopType:literal');
    });
  }

  // HAZARD GUARD: repeat-FOREVER in a handler must NOT trigger the block-body
  // exception (its re-parse matches the body-swallowing generated pattern, not a
  // `-times` HEAD) — loopType stays "forever" and the toggle body survives (#530).
  it('[es] in-handler repeat-forever keeps loopType="forever" + body (not swallowed)', () => {
    const node = parse('en cargar repetir forever alternar .pulse entonces esperar 1s fin', 'es');
    const roles = repeatRoles(node);
    expect(roles).toContain('loopType:literal');
    expect(roles).not.toContain('quantity:literal'); // no swallowed body verb
    const hasToggle = (n: unknown): boolean => {
      if (!n || typeof n !== 'object') return false;
      const r = n as Record<string, unknown>;
      if (r.action === 'toggle') return true;
      return ['body', 'statements', 'thenBranch', 'elseBranch'].some(f => {
        const c = r[f];
        return Array.isArray(c) ? c.some(hasToggle) : !!c && typeof c === 'object' && hasToggle(c);
      });
    };
    expect(hasToggle(node)).toBe(true); // body survives
  });
});

describe('SOV repeat-times fronted-count HEAD (`{quantity} {countWord} {marker} {verb}`)', () => {
  // SOV langs front the count ahead of a clause-final verb (ja `3 times を 繰り返し`),
  // so the verb-first HEAD pattern can't apply. A verb-LAST HEAD pattern
  // (`repeat-<lang>-times`, repeat.ts) captures quantity:literal + loopType:literal=
  // "times", matching the en reference. Without it the generated positional repeat
  // mis-binds the fronted count to loopType:literal=3 (ja/ko/tr) or drops it entirely
  // (hi/bn). Inside the event handler the event is stripped first, so the body clause
  // re-parse sees the bare 4-token count phrase and the HEAD fires.
  function repeatRoles(node: unknown): string[] | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const rec = node as Record<string, unknown>;
    if (rec.action === 'repeat' && rec.roles instanceof Map) {
      return [...rec.roles.entries()].map(([k, v]) => {
        const t =
          v !== null && typeof v === 'object' && typeof (v as { type?: unknown }).type === 'string'
            ? (v as { type: string }).type
            : typeof v;
        return `${k}:${t}`;
      });
    }
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const r = repeatRoles(x);
          if (r) return r;
        }
      } else if (c && typeof c === 'object') {
        const r = repeatRoles(c);
        if (r) return r;
      }
    }
    return undefined;
  }

  // Corpus repeat-times translations (`on click repeat 3 times add "<p>Line</p>" to me`).
  // Before the fix: ja/ko/tr captured loopType:literal (the number) but NOT
  // quantity:literal; hi/bn/qu produced a roleless or absent repeat node — so the
  // quantity:literal assertion fails without the fix for all six. (qu uses the
  // patient-first SOV order with the `ta` marker and the `kutipay` repeat verb —
  // the FRESHLY-populated corpus form; the older committed db lagged with the
  // `return` verb `kutichiy`, but CI re-populates so the qu HEAD fires.)
  for (const [lang, src] of [
    ['ja', '3 times を クリック で 繰り返し それから "<p>Line</p>" を 追加 私 に'],
    ['ko', '3 times 를 클릭 반복 그러면 "<p>Line</p>" 를 추가 나 에'],
    ['tr', '3 times i tıklama de tekrarla sonra "<p>Line</p>" i ekle ben e'],
    ['hi', '3 times को क्लिक पर दोहराएं फिर "<p>Line</p>" को जोड़ें मैं में'],
    ['bn', '3 বার কে ক্লিক এ পুনরাবৃত্তি তারপর "<p>Line</p>" কে যোগ আমি তে'],
    ['qu', '3 times ta ñitiy pi kutipay chayqa "<p>Line</p>" ta noqa man yapay'],
  ] as [string, string][]) {
    it(`[${lang}] fronted-count repeat-times captures quantity:literal + loopType:literal`, () => {
      const roles = repeatRoles(parse(src, lang));
      expect(roles).toBeTruthy();
      expect(roles).toContain('quantity:literal');
      expect(roles).toContain('loopType:literal');
    });
  }

  // Standalone (event stripped) body clause — the HEAD fires directly.
  it('[ja] standalone fronted-count repeat-times captures quantity:literal', () => {
    const roles = repeatRoles(parse('3 times を 繰り返し', 'ja'));
    expect(roles).toContain('quantity:literal');
    expect(roles).toContain('loopType:literal');
  });
});

describe('SOV repeat-forever loop-keyword recovery (loopType:literal="forever")', () => {
  // The verb-first SOV loop head `{repeat-verb} forever <body>` (ja `繰り返し forever
  // .pulse を 切り替え`) has its `forever` dropped by the fused SOV event pattern →
  // loopType defaults to reference:me. buildEventHandler now recovers the trailing
  // `forever` keyword (en `forever` / native hi हमेशा / bn চিরকাল) as
  // loopType:literal="forever" and drops the SOV default-patient leak, matching the
  // en reference `repeat{loopType:literal="forever"}` (no patient). Body survives.
  function repeatNode(node: unknown): Record<string, unknown> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const r = node as Record<string, unknown>;
    if (r.action === 'repeat' && r.roles instanceof Map) return r;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = r[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const m = repeatNode(x);
          if (m) return m;
        }
      } else if (c && typeof c === 'object') {
        const m = repeatNode(c);
        if (m) return m;
      }
    }
    return undefined;
  }
  function hasAction(n: unknown, act: string): boolean {
    if (!n || typeof n !== 'object') return false;
    const r = n as Record<string, unknown>;
    if (r.action === act) return true;
    return ['body', 'statements', 'thenBranch', 'elseBranch'].some(f => {
      const c = r[f];
      return Array.isArray(c)
        ? c.some(x => hasAction(x, act))
        : !!c && typeof c === 'object' && hasAction(c, act);
    });
  }
  // Real corpus repeat-forever texts (head: `on <event> repeat forever toggle .pulse wait 1s end`).
  for (const [lang, src] of [
    ['ja', '読み込み で 繰り返し forever .pulse を 切り替え それから 待つ 1s 終わり'],
    ['ko', '로드 할 때 반복 forever .pulse 를 토글 그러면 대기 1s 끝'],
    ['tr', 'yükle de tekrarla forever .pulse i değiştir ardından bekle 1s son'],
    ['hi', 'लोड पर दोहराएं हमेशा .pulse को टॉगल फिर प्रतीक्षा 1s समाप्त'],
    ['bn', 'লোড এ পুনরাবৃত্তি চিরকাল .pulse কে টগল তারপর 1s কে অপেক্ষা শেষ'],
    ['qu', 'apakuy pi kutipay forever .pulse ta tikray chayqa suyay 1s tukuy'],
  ] as [string, string][]) {
    it(`[${lang}] repeat-forever → loopType:literal="forever", no phantom patient, body survives`, () => {
      const node = parse(src, lang);
      const rep = repeatNode(node);
      expect(rep).toBeTruthy();
      const roles = rep!.roles as Map<string, { type?: string; value?: unknown }>;
      expect(roles.get('loopType')).toMatchObject({ type: 'literal', value: 'forever' });
      expect(roles.has('patient')).toBe(false); // no SOV default-patient leak
      expect(hasAction(node, 'toggle')).toBe(true); // body survives
    });
  }
});

describe('repeat-until-event recovery (event:literal + loopType:literal="until-event")', () => {
  // The fused event-handler captures the repeat verb but leaves the `until-event`
  // clause (`{event-kw} {event} {obj-marker} {until-marker}`) unconsumed → the loop
  // defaults to loopType:reference=me AND the span breaks into phantom `event`/`until`
  // body commands. buildEventHandler now recovers it: capture the event after the
  // event-kw as event:literal, set loopType:literal="until-event", drop the SOV
  // default-patient leak, and consume the span (so the phantoms can't form). Matches
  // the en reference `repeat{event:literal, loopType:literal="until-event"}`.
  function repeatRolesUE(node: unknown): Map<string, { type?: string }> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const r = node as Record<string, unknown>;
    if (r.action === 'repeat' && r.roles instanceof Map) return r.roles as Map<string, { type?: string }>;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = r[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const m = repeatRolesUE(x);
          if (m) return m;
        }
      } else if (c && typeof c === 'object') {
        const m = repeatRolesUE(c);
        if (m) return m;
      }
    }
    return undefined;
  }
  function hasAct(n: unknown, act: string): boolean {
    if (!n || typeof n !== 'object') return false;
    const r = n as Record<string, unknown>;
    if (r.action === act) return true;
    return ['body', 'statements', 'thenBranch', 'elseBranch'].some(f => {
      const c = r[f];
      return Array.isArray(c)
        ? c.some(x => hasAct(x, act))
        : !!c && typeof c === 'object' && hasAct(c, act);
    });
  }
  // Real corpus repeat-until-event texts (head: `on <ev> repeat until event <ev2> increment #counter wait 100ms end`).
  for (const [lang, src] of [
    ['ja', 'マウス押下 で 繰り返し イベント マウス解放 を まで それから #counter を 増加 それから 待つ 100ms 終わり'],
    ['ko', '마우스다운 할 때 반복 이벤트 마우스업 를 까지 그러면 #counter 를 증가 그러면 대기 100ms 끝'],
    ['bn', 'mousedown এ পুনরাবৃত্তি ঘটনা mouseup কে পর্যন্ত তারপর #counter কে বৃদ্ধি তারপর 100ms কে অপেক্ষা শেষ'],
    ['de', 'bei mausunten wiederholen bis ereignis mausoben dann erhöhen #counter dann warten 100ms ende'],
    ['ar', 'عند فأرة أسفل كرر حتى حدث فأرة أعلى ثم زِد #counter ثم انتظر 100ms النهاية'],
    // tr/hi/qu: FUSED mouse events (dict no longer emits the `_`-split compound),
    // which also routes the handler onto the fused-action path so the recovery fires.
    ['tr', 'farebas de tekrarla olay farebırak i kadar ardından #counter i artır ardından bekle 100ms son'],
    ['hi', 'माउसनीचे पर दोहराएं घटना माउसऊपर को तक फिर #counter को बढ़ाएं फिर प्रतीक्षा 100ms समाप्त'],
    ['qu', 'ratñitiy pi kutipay ruway rathuqariy ta hayk_akama chayqa #counter ta yapachiy chayqa suyay 100ms tukuy'],
  ] as [string, string][]) {
    it(`[${lang}] repeat-until-event → event:literal + loopType:literal="until-event", no phantom event/until`, () => {
      const node = parse(src, lang);
      const roles = repeatRolesUE(node);
      expect(roles).toBeTruthy();
      expect(roles!.get('event')?.type).toBe('literal');
      expect(roles!.get('loopType')).toMatchObject({ type: 'literal', value: 'until-event' });
      expect(hasAct(node, 'until')).toBe(false); // phantom `until` command gone
      expect(hasAct(node, 'increment')).toBe(true); // body survives
    });
  }
});

describe('en element-swap reference: `swap {destination} with {patient}` (swap-content)', () => {
  // The corpus element-swap `swap #a with #b` is method-less and `with`-marked. The
  // method form `swap {method} {destination}` (swap-en-handcrafted) greedily bound
  // #a→method and the bare word `with`→destination:literal, DROPPING #b — a broken en
  // REFERENCE that the (correct) translations were penalized against in R1. A dedicated
  // `swap-en-element` pattern (`swap {destination} with {patient}`, priority 120 > 110)
  // captures destination+patient, matching the schema and the translations. The method
  // forms (no `with`) still take the 110 pattern.
  function swapRoles(node: unknown): Map<string, { type?: string }> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const r = node as Record<string, unknown>;
    if (r.action === 'swap' && r.roles instanceof Map)
      return r.roles as Map<string, { type?: string }>;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = r[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const m = swapRoles(x);
          if (m) return m;
        }
      } else if (c && typeof c === 'object') {
        const m = swapRoles(c);
        if (m) return m;
      }
    }
    return undefined;
  }

  it('[en] `swap #a with #b` captures destination:selector + patient:selector (not method + #b dropped)', () => {
    const roles = swapRoles(parse('on click swap #a with #b', 'en'));
    expect(roles).toBeTruthy();
    expect(roles!.get('destination')?.type).toBe('selector'); // #a, not the word "with"
    expect(roles!.get('patient')?.type).toBe('selector'); // #b survives (was dropped)
    expect(roles!.has('method')).toBe(false); // #a is no longer mis-bound as method
  });

  // Translations (correct all along) now MATCH the corrected en reference.
  for (const [lang, src] of [
    ['de', 'bei klick tauschen #a mit #b'],
    ['es', 'en clic intercambiar #a con #b'],
    ['ja', '#a を クリック で 交換 #b で'],
  ] as [string, string][]) {
    it(`[${lang}] swap-content has destination:selector + patient:selector (aligns with en)`, () => {
      const roles = swapRoles(parse(src, lang));
      expect(roles).toBeTruthy();
      expect(roles!.get('destination')?.type).toBe('selector');
      expect(roles!.get('patient')?.type).toBe('selector');
    });
  }

  // The method form (no `with`) is UNCHANGED — still the 110 handcrafted pattern.
  it('[en] `swap innerHTML #target` still parses as method + destination (unchanged)', () => {
    const roles = swapRoles(parse('swap innerHTML #target', 'en'));
    expect(roles!.get('method')?.type).toBe('literal');
    expect(roles!.get('destination')?.type).toBe('selector');
  });
});

describe('`<ref>.<prop>` → property-path reclassification (put/set patient R1)', () => {
  // A dotted member access off a real reference (`it.error`, `result.name`) is
  // semantically a property access. The en reference previously typed it as a
  // bare `expression`, but ~18 translations render the possessive as
  // property-path (de `sein.error`, es `su.error`, ja `その.error`), so R1
  // (recall vs the en role signature) penalized them for `put.patient`. Emitting
  // property-path for reference-based dotted access in
  // `tryMatchPropertyAccessExpression` aligns en TOWARD the translations.
  // Four coupled fronts (all required for zero per-language regression):
  //   F1 — en `it.X` → property-path (the core flip)
  //   F2 — guard the fused-dot path against trailing method-calls
  //        (`target.closest("li")` is a call, NOT a property — stays expression)
  //   F3 — id/ms possessive: the dict renders `it` as id `miliknya` / ms `nya`,
  //        not in the profiles' possessive.keywords → without them id/ms stay
  //        `expression` and newly MISMATCH the flipped en reference
  //   F4 — keep the condition role as `expression` (the en `if event.X`
  //        condition is captured as a raw span, never routed through the value
  //        matcher; SOV window-keydown DOES route it through the matcher, so
  //        scope property-path emission out of the `condition` role).
  function rolesOf(node: unknown, action: string): Map<string, { type?: string }> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const r = node as Record<string, unknown>;
    if (r.action === action && r.roles instanceof Map)
      return r.roles as Map<string, { type?: string }>;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
      const c = r[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const m = rolesOf(x, action);
          if (m) return m;
        }
      } else if (c && typeof c === 'object') {
        const m = rolesOf(c, action);
        if (m) return m;
      }
    }
    return undefined;
  }

  // F1: en `it.X` patient → property-path (was `expression`).
  it('[en] `put it.error into #error` → put.patient:property-path', () => {
    const roles = rolesOf(parse('on click put it.error into #error', 'en'), 'put');
    expect(roles?.get('patient')?.type).toBe('property-path');
  });
  it('[en] `set #name.innerText to it.name` → set.patient:property-path', () => {
    const roles = rolesOf(parse('on click set #name.innerText to it.name', 'en'), 'set');
    expect(roles?.get('patient')?.type).toBe('property-path');
  });

  // F2: a fused `<ref>.<method>(...)` is a method CALL, not a property — it must
  // stay `expression` (else behavior-sortable's `set item to the
  // target.closest("li")` regresses; the fused path returned before checking for
  // a trailing `(`). behavior-sortable is OFF-LIMITS to edit; this guards the
  // PARSER fix that protects it.
  it('[en] `set item to the target.closest("li")` keeps patient:expression (method-call guard)', () => {
    const roles = rolesOf(parse('set item to the target.closest("li")', 'en'), 'set');
    expect(roles?.get('patient')?.type).toBe('expression');
    expect(roles?.get('patient')?.type).not.toBe('property-path');
  });

  // F3: id/ms render the reference `it` as the standalone possessor `miliknya` /
  // `nya`; with those in possessive.keywords the possessive matcher assembles the
  // property-path, matching the flipped en reference (without them they stay
  // `expression` and newly mismatch en → the regression the previous attempt hit).
  it('[id] `taruh miliknya.error ke #error` → put.patient:property-path', () => {
    const roles = rolesOf(parse('pada klik taruh miliknya.error ke #error', 'id'), 'put');
    expect(roles?.get('patient')?.type).toBe('property-path');
  });
  it('[ms] `letak nya.error ke #error` → put.patient:property-path', () => {
    const roles = rolesOf(parse('apabila click letak nya.error ke #error', 'ms'), 'put');
    expect(roles?.get('patient')?.type).toBe('property-path');
  });

  // F4: the SOV window-keydown condition `event.ctrlKey` DOES route through the
  // value matcher (unlike en, where it's a raw span) — but the en reference types
  // it `expression`, so the condition role must NOT flip to property-path or
  // ja/ko/qu regress. Scoped out by role name (`condition`).
  for (const [lang, src] of [
    [
      'ja',
      'keydown[key=="s"] で ウィンドウ から もし event.ctrlKey 呼び出し saveDocument() を 停止 終わり',
    ],
    ['ko', 'keydown[key=="s"] 할 때 창 에서 만약 event.ctrlKey 호출 saveDocument() 를 정지 끝'],
    ['qu', 'k_iri manta keydown[key=="s"] pi sichus event.ctrlKey qayay saveDocument() ta sayay tukuy'],
  ] as [string, string][]) {
    it(`[${lang}] window-keydown condition stays if.condition:expression (not property-path)`, () => {
      const roles = rolesOf(parse(src, lang), 'if');
      expect(roles?.get('condition')?.type).toBe('expression');
      expect(roles?.get('condition')?.type).not.toBe('property-path');
    });
  }

  // Translation-alignment: the ~18 langs that already render property-path now
  // MATCH the corrected en reference (the R1 gain).
  for (const [lang, src] of [
    ['de', 'bei klick setzen sein.name zu ich'],
    ['es', 'en clic poner su.name a yo'],
    ['ja', 'その.name を 私 に 置く'],
  ] as [string, string][]) {
    it(`[${lang}] possessive .name patient is property-path (aligns with en)`, () => {
      const roles = rolesOf(parse(src, lang), 'put');
      expect(roles?.get('patient')?.type).toBe('property-path');
    });
  }
});

describe('en `for` reference: no redundant loopType role (for.loopType R1)', () => {
  // The `for` schema (command-schemas.ts forSchema) has NO loopType role — only
  // patient + source. The en handcrafted `for-en-basic` pattern nonetheless set
  // an extraction default `loopType:literal="for"`, a role that merely duplicates
  // the action name and that NO schema-generated translation reproduces. That made
  // en the R1 outlier: all 23 langs "missed" `for.loopType:literal` on the corpus
  // for-pattern (template-literal-list-build). Dropping the default from both en
  // for-pattern paths (patterns/en.ts + patterns/languages/en/control-flow.ts)
  // aligns en TOWARD the translations. The for AST mapper (command-mappers.ts
  // forMapper) reads only patient+source, so it's R2-safe.
  function forRoles(node: unknown): Map<string, { type?: string }> | undefined {
    if (!node || typeof node !== 'object') return undefined;
    const r = node as Record<string, unknown>;
    if (r.action === 'for' && r.roles instanceof Map)
      return r.roles as Map<string, { type?: string }>;
    for (const f of ['body', 'statements', 'commands', 'thenBranch', 'elseBranch', 'branches']) {
      const c = r[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const m = forRoles(x);
          if (m) return m;
        }
      } else if (c && typeof c === 'object') {
        const m = forRoles(c);
        if (m) return m;
      }
    }
    return undefined;
  }

  it('[en] `for item in $items` captures patient+source but NOT loopType', () => {
    const roles = forRoles(parse('for item in $items', 'en'));
    expect(roles).toBeTruthy();
    expect(roles!.get('patient')).toBeTruthy();
    expect(roles!.get('source')).toBeTruthy();
    expect(roles!.has('loopType')).toBe(false); // the redundant role is gone
  });

  // The generated translations (schema-derived, no loopType) now MATCH the en
  // reference's for role signature.
  for (const [lang, src] of [
    ['es', 'para item en $items'],
    ['de', 'für item in $items'],
    ['id', 'untuk item dalam $items'],
  ] as [string, string][]) {
    it(`[${lang}] for-loop has no loopType role (aligns with en)`, () => {
      const roles = forRoles(parse(src, lang));
      expect(roles).toBeTruthy();
      expect(roles!.has('loopType')).toBe(false);
    });
  }
});

describe('increment/decrement by-marker quantity (es por, fr par, pt por, de um)', () => {
  // The R2 execution sweep found `increment #x by N` applying +1, not +N, in the
  // by-marker langs: they render the amount with a preposition the quantity role
  // must recognize, else it strands and defaults to 1. es/pt `por`, fr `par`
  // added to the increment/decrement schema quantity markerOverride; de uses the
  // hand-crafted increment-de-with-quantity (`um`, since de takes the
  // increment-de-full path the schema markerOverride can't reach). Space-marked
  // SVO langs (it/zh) render the amount BARE and already capture it positionally.
  // buildAST surfaces the captured amount as the `by` modifier.
  const cases: Array<[string, string]> = [
    ['incrementar #score por 10', 'es'],
    ['incrémenter #score par 10', 'fr'],
    ['incrementar #score por 10', 'pt'],
    ['erhöhe #score um 10', 'de'],
  ];
  for (const [input, lang] of cases) {
    it(`[${lang}] captures the by-amount (10) instead of defaulting to 1`, () => {
      const node = parse(input, lang);
      expect(node.action).toBe('increment');
      const { ast } = buildAST(node) as { ast: { modifiers?: { by?: { value?: unknown } } } };
      expect(ast.modifiers?.by?.value).toBe(10);
    });
  }

  it('[de] the patient-only form (no amount) still parses without the quantity pattern', () => {
    const node = parse('erhöhe #counter', 'de');
    expect(node.action).toBe('increment');
    const { ast } = buildAST(node) as { ast: { args?: Array<{ value?: unknown }> } };
    expect(ast.args?.[0]?.value).toBe('#counter');
  });
});

describe('SOV body-clause marker lookup: event markers must not clobber value roles', () => {
  // append-content (`append "<li>Item</li>" to #list`) reaches the Stage-3 SOV
  // fallback (no generated pattern matches the patient-first corpus emission),
  // where parseSOVClauseByVerbAnchoring binds roles via the profile's marker →
  // role lookup. The `event` roleMarker reuses a value role's particle in most
  // SOV profiles (ja を, tr i, bn তে, ko 을) and used to CLOBBER it, so the
  // fronted content bound as a bogus `event` role and the append executed with
  // no content (ja/tr runtime "append requires content", bn silent no-op). ko
  // survived only because its corpus form uses the 를 ALTERNATIVE, which never
  // clobbered. Event markers now only fill gaps in the body-clause lookup —
  // the event phrase is already stripped before that lookup is consulted.
  const cases: Array<[string, string, string]> = [
    ['ja', '"<li>Item</li>" を クリック で 末尾追加 #list に', 'clobbered patient を'],
    ['tr', '"<li>Item</li>" i tıklama de iliştir #list e', 'clobbered patient i'],
    ['bn', '"<li>Item</li>" কে ক্লিক এ জুড়ুন #list তে', 'clobbered destination তে'],
    ['ko', '"<li>Item</li>" 를 클릭 할 때 덧붙이다 #list 에', 'reference (already worked)'],
  ];
  for (const [lang, input, why] of cases) {
    it(`[${lang}] append-content captures content + destination (${why})`, () => {
      const node = parse(input, lang) as {
        kind: string;
        body?: Array<{ action?: string; roles?: Map<string, { type: string; value: unknown }> }>;
      };
      expect(node.kind).toBe('event-handler');
      const append = node.body?.find(c => c.action === 'append');
      expect(append).toBeTruthy();
      expect(append!.roles?.get('patient')?.value).toBe('<li>Item</li>');
      expect(append!.roles?.get('destination')?.value).toBe('#list');
      // The bogus `event` role must be gone from the body command.
      expect(append!.roles?.has('event')).toBe(false);
    });
  }
});

describe('SOV/th trailing bare quantity reclaim (increment-by-amount R2 blocker)', () => {
  // The i18n transformer renders `increment #score by 10` with the amount AFTER
  // the verb, bare (no marker), in the SOV languages and th — but every fused
  // event pattern ends at the verb (SOV) or the primary role (th VSO), so the
  // amount was left unconsumed and silently dropped: quantity defaulted to 1.
  // The fused-capture re-parse can't reclaim it in SOV (the fronted patient is
  // outside the [verb..boundary] slice, so the superset guard rejects the
  // re-parse — the qu safety rail). buildEventHandler now reclaims a trailing
  // bare NUMBER into the schema's absent optional `quantity` role. Marker langs
  // (es/fr/pt/de, #558) and positional SVO langs (it/zh) capture it upstream
  // and never reach the reclaim. Corpus forms from a fresh populate.
  const cases: Array<[string, string]> = [
    ['#score を クリック で 増加 10', 'ja'],
    ['#score 를 클릭 할 때 증가 10', 'ko'],
    ['#score i tıklama de artır 10', 'tr'],
    ['#score কে ক্লিক এ বৃদ্ধি 10', 'bn'],
    ['#score को क्लिक पर बढ़ाएं 10', 'hi'],
    ['#score ta ñitiy pi yapachiy 10', 'qu'],
    ['เมื่อ คลิก เพิ่มค่า #score 10', 'th'],
  ];
  for (const [input, lang] of cases) {
    it(`[${lang}] captures the trailing bare amount (10) instead of defaulting to 1`, () => {
      const node = parse(input, lang) as {
        kind: string;
        body?: Array<{ action?: string; roles?: Map<string, { value?: unknown }> }>;
      };
      expect(node.kind).toBe('event-handler');
      const inc = node.body?.find(c => c.action === 'increment');
      expect(inc).toBeTruthy();
      expect(inc!.roles?.get('patient')?.value).toBe('#score');
      expect(inc!.roles?.get('quantity')?.value).toBe(10);
    });
  }

  it('[ja] the amount-less form still parses without a phantom quantity', () => {
    const node = parse('#score を クリック で 増加', 'ja') as {
      body?: Array<{ action?: string; roles?: Map<string, unknown> }>;
    };
    const inc = node.body?.find(c => c.action === 'increment');
    expect(inc).toBeTruthy();
    expect(inc!.roles?.has('quantity')).toBe(false);
  });

  it('[ja] a trailing then-chain command is not swallowed as a quantity', () => {
    // `increment #score then wait 200ms` shape: the token after the verb is a
    // then-keyword, not a number — the reclaim must not fire and the chain must
    // survive as a second body command.
    const node = parse('#score を クリック で 増加 それから 200ms 待つ', 'ja') as {
      body?: Array<{
        action?: string;
        statements?: Array<{ action?: string }>;
        roles?: Map<string, unknown>;
      }>;
    };
    const actions: string[] = [];
    for (const stmt of node.body ?? []) {
      if (stmt.action) actions.push(stmt.action);
      for (const s of stmt.statements ?? []) if (s.action) actions.push(s.action);
    }
    expect(actions).toContain('increment');
    expect(actions).toContain('wait');
    const inc = (node.body ?? [])
      .flatMap(s => [s, ...(s.statements ?? [])])
      .find(c => (c as { action?: string }).action === 'increment') as
      | { roles?: Map<string, unknown> }
      | undefined;
    expect(inc?.roles?.has('quantity')).toBe(false);
  });
});

describe('SOV/marker-swallowed fetch responseType reclaim (R1 handoff cluster B)', () => {
  // `fetch /api/user as json` renders its as-tail AFTER the fused verb: bare
  // (ja/bn), word + as-postposition (tr olarak, hi के रूप में, qu hina — the
  // postposition stays skip-noise), or word + a particle the fused pattern's
  // optional trailing DESTINATION group swallows (ko `json 로` — 로 is a
  // destination alternative, and `json` violates destination's selector/
  // reference schema types). buildEventHandler now reclaims a known
  // response-type word into the absent optional `responseType` role — either
  // relabeling the schema-invalid destination (ko) or consuming the trailing
  // bare word (the rest). Corpus forms from a fresh populate.
  const cases: Array<[string, string]> = [
    ['/api/user を クリック で フェッチ json それから #name.innerText を その.name に 設定', 'ja'],
    ['/api/user 를 클릭 할 때 가져오기 json 로 그러면 #name.innerText 를 그것의.name 에 설정', 'ko'],
    ['/api/user i tıklama de getir json olarak ardından #name.innerText i onun.name e ayarla', 'tr'],
    ['/api/user কে ক্লিক এ আনুন json তারপর #name.innerText কে এর.name তে সেট', 'bn'],
    ['/api/user को क्लिक पर लाएं json के रूप में फिर #name.innerText को इसका.name में सेट', 'hi'],
    ['/api/user ta ñitiy pi apamuy json hina chayqa #name.innerText ta chaypaq.name man churanay', 'qu'],
  ];
  for (const [input, lang] of cases) {
    it(`[${lang}] fetch-json captures responseType=json (and no phantom destination)`, () => {
      const node = parse(input, lang) as {
        kind: string;
        body?: Array<{ action?: string; roles?: Map<string, { type: string; raw?: unknown }> }>;
      };
      expect(node.kind).toBe('event-handler');
      const fetch = node.body?.find(c => c.action === 'fetch');
      expect(fetch).toBeTruthy();
      const rt = fetch!.roles?.get('responseType');
      expect(rt?.type).toBe('expression');
      expect(rt?.raw).toBe('json');
      expect(fetch!.roles?.has('destination')).toBe(false);
    });
  }

  it('[ko] a genuine selector destination is NOT relabeled', () => {
    // `#output 로` is a schema-VALID destination (selector) — the reclaim must
    // leave it alone and add no responseType.
    const node = parse('/api/user 를 클릭 할 때 가져오기 #output 로', 'ko') as {
      body?: Array<{ action?: string; roles?: Map<string, { type: string; value?: unknown }> }>;
    };
    const fetch = node.body?.find(c => c.action === 'fetch');
    expect(fetch).toBeTruthy();
    expect(fetch!.roles?.get('destination')?.type).toBe('selector');
    expect(fetch!.roles?.has('responseType')).toBe(false);
  });

  it('[ja] a fetch with no as-tail gains no phantom responseType', () => {
    const node = parse('/api/user を クリック で フェッチ', 'ja') as {
      body?: Array<{ action?: string; roles?: Map<string, unknown> }>;
    };
    const fetch = node.body?.find(c => c.action === 'fetch');
    expect(fetch).toBeTruthy();
    expect(fetch!.roles?.has('responseType')).toBe(false);
  });
});

describe('possessive render/parse symmetry (specialForms inversion + qu chay-paq split) — R1 cluster A1', () => {
  // The i18n transformer renders possessives via the profile's `specialForms`
  // (concept → surface), but the matcher only consulted `keywords` (surface →
  // concept) — so ko `그것의.name` (its.name, rendered from specialForms.it)
  // never parsed back: the generated set pattern's {patient} failed and the
  // whole clause fell to the role-scrambling SOV fallback. getPossessiveReference
  // now inverts specialForms as a fallback. qu's `chaypaq.name` additionally
  // TOKENIZES as chay + paq (agglutinative split), covered by a `chay: it`
  // keyword + `paq`/`pa` possessive connectors. ja/hi (already-working) locked
  // as references.
  const cases: Array<[string, string]> = [
    ['#name.innerText を その.name に 設定', 'ja'],
    ['#name.innerText 를 그것의.name 에 설정', 'ko'],
    ['#name.innerText ta chaypaq.name man churanay', 'qu'],
    ['#name.innerText को इसका.name में सेट', 'hi'],
  ];
  for (const [input, lang] of cases) {
    it(`[${lang}] set with its-possessive patient parses via the generated pattern (both roles property-path)`, () => {
      const node = parse(input, lang) as {
        action?: string;
        roles?: Map<string, { type: string }>;
        metadata?: { patternId?: string };
      };
      expect(node.action).toBe('set');
      expect(node.metadata?.patternId).toBe(`set-${lang}-generated`);
      expect(node.roles?.get('destination')?.type).toBe('property-path');
      expect(node.roles?.get('patient')?.type).toBe('property-path');
    });
  }

  it('[qu] a marked bare-chay patient does not form a phantom possessive', () => {
    // `chay ta t'ikray` = "toggle it": chay is followed by the ta particle, not
    // a property token — the possessive matcher must not fire and the patient
    // stays a plain reference.
    const node = parse("chay ta t'ikray", 'qu') as {
      action?: string;
      roles?: Map<string, { type: string }>;
    };
    expect(node.action).toBe('toggle');
    expect(node.roles?.get('patient')?.type).not.toBe('property-path');
  });
});

describe('event-anchor guard: fronted positional/possessive/optional-chaining heads (R1 cluster C, hi tail)', () => {
  // The #508 guard rejects non-event-SHAPED single tokens for the event role,
  // but the expression assemblers still captured a fronted POSITIONAL phrase
  // (hi `पहला <input/> …` → event:expression) or POSSESSIVE head (hi `मेरा
  // @data-count …` → event:property-path; fused optional-chaining `मेरा?.…`)
  // wholesale into the event role — mis-anchoring the handler and garbling the
  // body. The guard now also rejects positional keywords, profile possessive
  // heads, and `?.`-fused tokens for the event role of `on` patterns, letting
  // the input fall through to the per-command pattern.
  it('[hi] first-in-parent: the fronted positional phrase is not the event', () => {
    const node = parse('पहला <input/> in closest <form/> को क्लिक पर फोकस', 'hi') as {
      kind: string;
      roles?: Map<string, { type: string; value?: unknown }>;
      body?: Array<{ action?: string; roles?: Map<string, { type: string }> }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.roles?.get('event')?.value).toBe('click');
    const focus = node.body?.find(c => c.action === 'focus');
    expect(focus).toBeTruthy();
    expect(focus!.roles?.get('patient')?.type).toBe('expression');
  });

  it('[hi] default-value: the fronted possessive is not the event', () => {
    const node = parse('मेरा @data-count को लोड पर डिफ़ॉल्ट "0" में', 'hi') as {
      kind: string;
      roles?: Map<string, { value?: unknown }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.roles?.get('event')?.value).toBe('load');
  });

  it('[hi] optional-chaining-possessive: the ?.-fused head is not the event, no phantom click command', () => {
    const node = parse('मेरा?.dataset?.customValue को क्लिक पर लॉग', 'hi') as {
      kind: string;
      roles?: Map<string, { value?: unknown }>;
      body?: Array<{ action?: string }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.roles?.get('event')?.value).toBe('click');
    expect(node.body?.some(c => c.action === 'click')).toBe(false);
    expect(node.body?.some(c => c.action === 'log')).toBe(true);
  });

  it('[hi] a plain selector-fronted handler still parses (guard is additive)', () => {
    const node = parse('.active को क्लिक पर टॉगल', 'hi') as {
      kind: string;
      roles?: Map<string, { value?: unknown }>;
      body?: Array<{ action?: string }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.roles?.get('event')?.value).toBe('click');
    expect(node.body?.some(c => c.action === 'toggle')).toBe(true);
  });
});

describe('sw `as` marker is kuwa, not the if-homonym kama (phantom-if family)', () => {
  // sw `kama` is both "as/like" (idiomatic) and the IF keyword — the semantic
  // sw parser reads a standalone `kama` as an `if` head, so any transformed
  // `as <Type>` tail (`kama JSON`, `kama Number`) mid-body grew a phantom `if`
  // command (computed-value precision 0.500, event-debounce / fetch-with-headers
  // / fetch-formdata 0.667–0.750). The i18n dict + grammar profile now emit
  // `kuwa` ("to be/become" — the conversion sense) for `as`, and the fetch-sw
  // pattern reads `kuwa` as the responseType marker while still tolerating
  // hand-written `kama` in as-marker position. Same dict↔profile homonym
  // disambiguation as pl get/pobierz.
  it('[sw] fetch with kuwa responseType parses (transformer-emitted form)', () => {
    const node = parse('leta /api/me kuwa JSON', 'sw') as {
      action?: string;
      roles?: Map<string, { type: string }>;
    };
    expect(node.action).toBe('fetch');
    expect(node.roles?.get('source')?.type).toBe('literal');
    expect(node.roles?.has('responseType')).toBe(true);
  });

  it('[sw] hand-written kama in as-marker position still captures responseType', () => {
    const node = parse('leta /api/me kama JSON', 'sw') as {
      action?: string;
      roles?: Map<string, { type: string }>;
    };
    expect(node.action).toBe('fetch');
    expect(node.roles?.has('responseType')).toBe(true);
  });

  it('[sw] corpus-shaped fetch-with-headers body grows no phantom if', () => {
    // Transformer output for `on click fetch /api/me with headers:{…} as JSON
    // then put its.name into me` — with `kuwa` the trailing as-phrase must not
    // split into a phantom `if` statement.
    const node = parse(
      'kwenye bonyeza leta /api/me na headers:{Authorization:`Bearer ${$token}`} kuwa JSON kisha weka yake.name kwa mimi',
      'sw'
    ) as { kind: string; body?: Array<{ action?: string }> };
    expect(node.kind).toBe('event-handler');
    const actions = (node.body ?? []).map(c => c.action);
    expect(actions).toContain('fetch');
    expect(actions).toContain('put');
    expect(actions).not.toContain('if');
  });

  it('[sw] kama still parses as a real conditional inside an event body', () => {
    const node = parse('kwenye bonyeza kama mimi ana .loading rudi mwisho', 'sw') as {
      kind: string;
      body?: Array<{ action?: string }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.body?.some(c => c.action === 'if')).toBe(true);
  });
});

describe('en-reference noise sweep: for-body add.destination + trigger event typing (R1 residue item 3)', () => {
  // Two phantom cross-language mismatches rooted in the EN reference / in
  // tokenizer-incidental typing (HANDOFF-r1-post-cluster-residue item 3):
  //
  // (a) `add .processed to item` in a for-body: `item` is a loop binding
  //     variable; it tokenizes as expression, so the add schema's
  //     [selector, reference] destination rejected the marked `to item` phrase
  //     and destination silently defaulted to `me` — in the EN reference AND
  //     most translations alike (it/qu captured it and were penalized for
  //     being right). The schema now admits `expression`; a bound identifier
  //     captured as a bare literal (ja/ko typing of the untranslated `item`)
  //     is canonicalized to expression via the parse-scoped bound-identifier
  //     registry.
  // (b) `trigger init`: en typed the event literal only because `init` happens
  //     to be an en KEYWORD; untranslated names elsewhere typed expression, and
  //     colon-split namespaced names (`sortable:start`) held a bare fragment.
  //     An event NAME now canonicalizes to `literal` on command nodes.
  function firstAction(node: unknown, action: string): Record<string, any> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, any>;
    if (rec.action === action) return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const child of c) {
          const hit = firstAction(child, action);
          if (hit) return hit;
        }
      }
    }
    return null;
  }
  const roleOf = (n: Record<string, any> | null, r: string) =>
    n && n.roles instanceof Map ? n.roles.get(r) : undefined;

  it('[en] for-body add captures the binding-var destination as expression', () => {
    const node = parse('on click repeat for item in .items add .processed to item', 'en');
    const add = firstAction(node, 'add');
    expect(roleOf(add, 'destination')).toMatchObject({ type: 'expression', raw: 'item' });
  });

  it('[ja] for-body add captures the binding-var destination as expression (not a bare literal, not defaulted me)', () => {
    const node = parse(
      'クリック で 繰り返し item の中 .items それから .processed を 追加 item に',
      'ja'
    );
    const add = firstAction(node, 'add');
    expect(roleOf(add, 'destination')).toMatchObject({ type: 'expression', raw: 'item' });
  });

  it('[es] trigger with an untranslated bare event name types it literal', () => {
    const node = parse('disparar init', 'es');
    const trigger = firstAction(node, 'trigger');
    expect(roleOf(trigger, 'event')).toMatchObject({ type: 'literal', value: 'init' });
  });

  it('[en] trigger with a namespaced event name types it literal', () => {
    const node = parse('trigger draggable:start', 'en');
    const trigger = firstAction(node, 'trigger');
    expect(roleOf(trigger, 'event')).toMatchObject({ type: 'literal', value: 'draggable:start' });
  });

  it('[en] an unmarked trailing identifier is NOT captured as add destination (marker-guarded)', () => {
    // Without a `to` marker the identifier is not a destination phrase — the
    // schema broadening must not let `add .x item` capture item.
    const node = parse('add .processed', 'en');
    const add = firstAction(node, 'add');
    const dest = roleOf(add, 'destination');
    expect(dest === undefined || (dest.type === 'reference' && dest.value === 'me')).toBe(true);
  });
});

describe('en-reference noise: send destination dropped / event truncated (R1 residue, send family)', () => {
  // Two EN-reference defects on the send command (socket-send ×23,
  // send-with-detail ×21 — every language "missed" entries that were en noise):
  //
  // (a) `send "hello" to ChatSocket`: the bare-identifier target tokenizes as
  //     expression, so the send schema's [selector, reference] destination
  //     rejected the marked `to ChatSocket` phrase and silently defaulted to
  //     `me`. The schema now admits `expression` (marker-guarded — the
  //     add.destination precedent).
  // (b) `send update(value: 42) to #target`: the event role skipped bare-call
  //     folding (an `on`-handler rule, where `(clientX, clientY)` destructures
  //     event params), so the event truncated to `literal="update"` and the
  //     dangling `( )` broke the `to {destination}` group. The fold skip is now
  //     scoped to the `on` handler's event role only.
  function firstAction(node: unknown, action: string): Record<string, any> | null {
    if (!node || typeof node !== 'object') return null;
    const rec = node as Record<string, any>;
    if (rec.action === action) return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const child of c) {
          const hit = firstAction(child, action);
          if (hit) return hit;
        }
      }
    }
    return null;
  }
  const roleOf = (n: Record<string, any> | null, r: string) =>
    n && n.roles instanceof Map ? n.roles.get(r) : undefined;

  it('[en] send to a bare-identifier target captures the marked destination as expression', () => {
    const node = parse('on click send "hello" to ChatSocket', 'en');
    const send = firstAction(node, 'send');
    expect(roleOf(send, 'event')).toMatchObject({ type: 'literal', value: 'hello' });
    expect(roleOf(send, 'destination')).toMatchObject({ type: 'expression', raw: 'ChatSocket' });
  });

  it('[en] send with a call-shaped event keeps the whole call AND the destination', () => {
    const node = parse('on click send update(value: 42) to #target', 'en');
    const send = firstAction(node, 'send');
    const ev = roleOf(send, 'event');
    expect(ev?.type).toBe('expression');
    expect(String(ev?.raw ?? '')).toContain('update');
    expect(String(ev?.raw ?? '')).toContain('42');
    expect(roleOf(send, 'destination')).toMatchObject({ type: 'selector', value: '#target' });
  });

  it('[ja] fused SOV send-with-detail matches the en reference role-for-role', () => {
    const node = parse('update(value: 42) を クリック で 送る #target に', 'ja');
    const send = firstAction(node, 'send');
    expect(roleOf(send, 'event')?.type).toBe('expression');
    expect(roleOf(send, 'destination')).toMatchObject({ type: 'selector', value: '#target' });
  });

  it('[en] on-handler event params are still destructured, not folded into the event name', () => {
    // The bare-call fold must stay OFF for the `on` handler's event role.
    const node = parse('on pointerdown(clientX, clientY) toggle .active', 'en');
    const on = firstAction(node, 'on');
    expect(roleOf(on, 'event')).toMatchObject({ value: 'pointerdown' });
  });

  it('[en] a plain send with a selector destination is unchanged', () => {
    const node = parse('on click send update to #target', 'en');
    const send = firstAction(node, 'send');
    expect(roleOf(send, 'event')).toMatchObject({ type: 'literal', value: 'update' });
    expect(roleOf(send, 'destination')).toMatchObject({ type: 'selector', value: '#target' });
  });

  describe('tell role alignment: patient→destination relabel over a junk literal destination', () => {
    // `tell #modal to show`: the en reference parses destination:selector and
    // drops the `to show` body. The generated marker extraction elsewhere bound
    // the element to the schema-unsanctioned `patient` and the dropped body's
    // verb to `destination` as a schema-invalid literal (`decir #modal a
    // mostrar` → patient:selector, destination:literal="show") — a 21-language
    // R1 miss. normalizeCommandRoles now relabels patient→destination when the
    // patient is selector/reference-shaped and destination is absent or a junk
    // literal.
    const cases: Array<[string, string]> = [
      ['es', 'en clic decir #modal a mostrar'],
      ['ja', '#modal を クリック で 伝える 表示 に'],
      ['qu', '#modal ta rikuchiy man ñitiy pi niy'],
    ];
    for (const [lang, input] of cases) {
      it(`[${lang}] tell binds the element as destination:selector, no junk literal`, () => {
        const node = parse(input, lang);
        const tell = firstAction(node, 'tell');
        expect(roleOf(tell, 'destination')).toMatchObject({ type: 'selector', value: '#modal' });
        expect(roleOf(tell, 'patient')).toBeUndefined();
      });
    }

    it('[en] tell with a selector destination is unchanged', () => {
      const node = parse('on click tell #modal to show', 'en');
      const tell = firstAction(node, 'tell');
      expect(roleOf(tell, 'destination')).toMatchObject({ type: 'selector', value: '#modal' });
    });
  });

  describe('wait for {event} (R1 residue: wait-for-event, the diagnosed R2-touching arc)', () => {
    // en `wait for transitionend` captured the KEYWORD as the duration
    // (duration:literal="for") and dropped the event name — and everything
    // after it (`wait for X then remove me` lost the remove). Four pieces:
    // the en `wait-en-for-event` head; the known-event duration→event relabel
    // (marker-less translations `esperar transitionend`); the trailing
    // event-name reclaim (SOV verb-final `待つ transitionend`); the waitMapper
    // emitting the runtime's modifiers.for. Gated on WAITABLE_EVENT_WORDS so
    // a time wait (`wait 2s`, `wait delay`) is never touched.
    it('[en] wait for <event> captures the event, not the keyword', () => {
      const node = parse('on click wait for transitionend', 'en');
      const wait = firstAction(node, 'wait');
      expect(roleOf(wait, 'event')).toMatchObject({ type: 'literal', value: 'transitionend' });
      expect(roleOf(wait, 'duration')).toBeUndefined();
    });

    it('[en] a then-chain after the event wait is no longer dropped', () => {
      const node = parse('on click wait for transitionend then remove me', 'en');
      expect(firstAction(node, 'wait')).not.toBeNull();
      expect(firstAction(node, 'remove')).not.toBeNull();
    });

    it('[en] time waits are unchanged (relabel gate)', () => {
      const n1 = parse('wait 2s', 'en');
      expect(roleOf(firstAction(n1, 'wait'), 'duration')).toMatchObject({ value: '2s' });
      expect(roleOf(firstAction(n1, 'wait'), 'event')).toBeUndefined();
      // A bare identifier that is NOT a known event name stays a duration
      // (time-variable wait).
      const n2 = parse('wait delay', 'en');
      expect(roleOf(firstAction(n2, 'wait'), 'event')).toBeUndefined();
    });

    it('[es] a marker-less known-event wait relabels duration→event', () => {
      const node = parse('en clic esperar transitionend', 'es');
      const wait = firstAction(node, 'wait');
      expect(roleOf(wait, 'event')).toMatchObject({ type: 'literal', value: 'transitionend' });
      expect(roleOf(wait, 'duration')).toBeUndefined();
    });

    it('[ja] SOV trailing event name is reclaimed, junk default dropped', () => {
      const node = parse('クリック で 待つ transitionend', 'ja');
      const wait = firstAction(node, 'wait');
      expect(roleOf(wait, 'event')).toMatchObject({ type: 'literal', value: 'transitionend' });
      expect(roleOf(wait, 'duration')).toBeUndefined();
    });

    it('[bn] the trailing for-postposition does not anchor a phantom `for` command', () => {
      const node = parse('ক্লিক এ অপেক্ষা transitionend জন্য', 'bn');
      const wait = firstAction(node, 'wait');
      expect(roleOf(wait, 'event')).toMatchObject({ type: 'literal', value: 'transitionend' });
      expect(firstAction(node, 'for')).toBeNull();
    });

    it('[tl] the fronted-source behaviors wait line captures the event (wait-tl-from-first)', () => {
      const node = parse('maghintay mula_sa dokumento pointermove o pointerup', 'tl');
      const wait = firstAction(node, 'wait');
      expect(roleOf(wait, 'event')).toMatchObject({ type: 'literal', value: 'pointermove' });
    });
  });

  describe('leaked-article halt patient: verb-boundary extension (R1 residue, halt family)', () => {
    // `halt the event` renders with the article leaked untranslated (`detener
    // the evento llamar …`). The leaked-article skip declined to fire when the
    // ref-noun was followed by a command VERB (the §7y tr gate), so the patient
    // captured the bare article (`patient:expression="the"`) in every
    // verb-first language — halt.patient missing ×74 (form-submit-prevent ×23
    // + behaviors ×17 each). In SVO/VSO a ref-noun followed by a command verb
    // IS a clause boundary (the verb opens the next juxtaposed body command),
    // so the skip now fires there; SOV profiles are exempt (tr's fronted
    // patient has its verb later in the clause — the original §7y fragility).
    const svoCases: Array<[string, string]> = [
      ['es', 'en enviar detener the evento llamar validateForm()'],
      ['it', 'su invio fermare the evento chiamare validateForm()'],
      ['zh', '当 提交 时 停止 把 the 事件 调用 validateForm()'],
    ];
    for (const [lang, input] of svoCases) {
      it(`[${lang}] halt captures the leaked-article event reference`, () => {
        const node = parse(input, lang);
        const halt = firstAction(node, 'halt');
        expect(roleOf(halt, 'patient')).toMatchObject({ type: 'reference', value: 'event' });
      });
    }

    it('[en] halt the event is unchanged', () => {
      const node = parse('on submit halt the event', 'en');
      const halt = firstAction(node, 'halt');
      expect(roleOf(halt, 'patient')).toMatchObject({ type: 'reference', value: 'event' });
    });

    it('[tr] the SOV exemption keeps the §7y parse shape (no NULL, halt present)', () => {
      // tr is SOV: the verb-boundary must NOT fire there. This locks the parse
      // returning a handler with a halt (the crossed roles are a known
      // deferred residue, not this fix's concern).
      const node = parse(
        'the olay çağır validateForm() i gönder de durdur',
        'tr'
      );
      expect(node).not.toBeNull();
      expect(firstAction(node, 'halt')).not.toBeNull();
    });
  });

  describe('mid-clause if fold: full condition captured, branch nested (if.condition en-reference noise)', () => {
    // `on submit halt the event call validateForm() if result is false log
    // "Invalid form" end` — no `then` before the `if`, so the clause-boundary
    // fold in parseBodyWithClauses never fires and the clause reaches
    // parseClause with the `if` mid-clause. matchBest then pattern-matched the
    // flat `if` head (`if-en-basic` = `if {condition}`), truncating the
    // condition to its first token (condition:reference="result", the `is
    // false` comparison silently dropped) and flattening `log` into a sibling.
    // This was EN-REFERENCE noise: translations reach the folding body walkers,
    // capture the full condition as an expression, and mis-scored against the
    // truncated en signature (if.condition ×14, form-submit-prevent). The
    // parseClause mirror of the fused-body fold hook now rewinds a flat-`if`
    // match and folds the whole block (form-submit-prevent en+14; collateral:
    // focus-trap ko/qu, behavior-removable js.patient bn/hi/ja/ko/qu/tr).
    it('[en] mid-clause if captures the FULL comparison as an expression condition', () => {
      const node = parse(
        'on submit halt the event call validateForm() if result is false log "Invalid form" end',
        'en'
      );
      const ifNode = firstAction(node, 'if');
      const cond = roleOf(ifNode, 'condition');
      expect(cond?.type).toBe('expression');
      expect(String(cond?.raw ?? cond?.value)).toContain('is false');
    });

    it('[en] the branch command nests under thenBranch (not a flattened sibling)', () => {
      const node = parse(
        'on submit halt the event call validateForm() if result is false log "Invalid form" end',
        'en'
      );
      const ifNode = firstAction(node, 'if');
      expect(ifNode).not.toBeNull();
      const thenBranch = (ifNode as Record<string, any>).thenBranch;
      expect(Array.isArray(thenBranch)).toBe(true);
      expect(thenBranch.some((c: Record<string, any>) => c.action === 'log')).toBe(true);
      // halt and call remain siblings OUTSIDE the conditional
      expect(firstAction(node, 'halt')).not.toBeNull();
      expect(firstAction(node, 'call')).not.toBeNull();
    });

    it('[en] a clause-boundary if (existing fold path) is unchanged', () => {
      const node = parse('on click if result is false log "bad" end', 'en');
      const ifNode = firstAction(node, 'if');
      const cond = roleOf(ifNode, 'condition');
      expect(cond?.type).toBe('expression');
      expect(String(cond?.raw ?? cond?.value)).toContain('is false');
    });
  });

  describe('transition family: schema/marker/keyword alignment (spurious-transition ×66 precision drill)', () => {
    // The transition schema's literal-only patient rejected the idiomatic bare
    // CSS property (`opacity` tokenizes identifier → expression; `*max-height`
    // tokenizes selector), and the goal markerOverride table disagreed with
    // what the i18n transformer actually renders in 11 languages — so the
    // generated pattern never fired: en (and 8 other languages) silently
    // DROPPED the whole command while the languages whose lax body walkers
    // recovered it were precision-penalized as "spurious transition" (×66, the
    // largest R0-precision family). Fixes locked here:
    //  - patient admits expression + selector (style-property syntax);
    //  - goal markers aligned to the rendered corpus (de zu, pl do, ru/uk в,
    //    he על, th ใน, it in, ms ke, vi vào, zh 到, sw kwa);
    //  - sw keyword alternative mpito (the rendered verb);
    //  - zh particle extractor defers to longer profile keywords (过渡 was
    //    split into 过 particle + 渡 identifier);
    //  - trailing bare TIME literal reclaims into transition's absent optional
    //    duration in verb-final renders (the #561 quantity-reclaim sibling).
    function findTransition(n: unknown): Record<string, any> | null {
      if (!n || typeof n !== 'object') return null;
      const rec = n as Record<string, any>;
      if (rec.action === 'transition') return rec;
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
        const c = rec[f];
        if (Array.isArray(c)) {
          for (const x of c) {
            const hit = findTransition(x);
            if (hit) return hit;
          }
        }
      }
      return null;
    }
    const roleOf2 = (n: Record<string, any> | null, r: string) =>
      n && n.roles instanceof Map ? n.roles.get(r) : undefined;

    it('[en] bare CSS property parses as the transition patient (expression)', () => {
      const node = parse('transition opacity to 0 over 500ms', 'en');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'patient')).toMatchObject({ type: 'expression' });
      expect(roleOf2(tr, 'goal')).toMatchObject({ type: 'literal' });
      expect(roleOf2(tr, 'duration')).toMatchObject({ type: 'literal', value: '500ms' });
    });

    it('[en] style-property syntax parses as the transition patient (selector)', () => {
      const node = parse('transition *background-color to "blue" over 500ms', 'en');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'patient')).toMatchObject({ type: 'selector' });
    });

    it('[de] corpus-shaped handler captures goal + duration (goal marker is zu, not auf)', () => {
      const node = parse('bei klick übergang opacity zu 0 500ms dann entfernen ich', 'de');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'goal')).toMatchObject({ type: 'literal' });
      expect(roleOf2(tr, 'duration')).toMatchObject({ type: 'literal', value: '500ms' });
    });

    it('[zh] 过渡 anchors the transition (particle extractor defers to the longer keyword)', () => {
      // Without the longer-keyword guard the particle extractor split 过渡 into
      // 过 (aspect particle) + 渡 (stray identifier) and the verb never anchored.
      const node = parse('当 点击 时 过渡 把 opacity 到 0 500ms', 'zh');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'goal')).toMatchObject({ type: 'literal' });
    });

    it('[sw] the rendered verb mpito anchors the transition', () => {
      const node = parse('kwenye bonyeza mpito opacity kwa 0 500ms', 'sw');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'goal')).toMatchObject({ type: 'literal' });
    });

    it('[ja] verb-final render reclaims the trailing bare duration', () => {
      const node = parse('opacity を クリック で 遷移 0 に 500ms', 'ja');
      const tr = findTransition(node);
      expect(tr).not.toBeNull();
      expect(roleOf2(tr, 'duration')).toMatchObject({ type: 'literal', value: '500ms' });
    });

    it('[en] a bare NUMBER is never reclaimed as duration (quantity domain untouched)', () => {
      // The reclaim is gated to time-shaped literals; `increment #score 10`
      // shapes stay the quantity reclaim's domain.
      const node = parse('#score を クリック で 増加 10', 'ja');
      function findAction2(n: unknown, a: string): Record<string, any> | null {
        if (!n || typeof n !== 'object') return null;
        const rec = n as Record<string, any>;
        if (rec.action === a) return rec;
        for (const f of ['body', 'statements']) {
          const c = rec[f];
          if (Array.isArray(c)) {
            for (const x of c) {
              const hit = findAction2(x, a);
              if (hit) return hit;
            }
          }
        }
        return null;
      }
      const inc = findAction2(node, 'increment');
      expect(inc).not.toBeNull();
      expect(roleOf2(inc, 'quantity')).toMatchObject({ type: 'literal', value: 10 });
    });
  });

  describe('conjunction-split loop head: the owed `end` is block content, not the body terminator', () => {
    // The i18n transformer inserts a conjunction between a loop head and its
    // body (es `para item en $items ENTONCES establecer … fin`; en renders
    // `for item in $items set … end`, no conjunction). Both body walkers
    // treated the head's later `fin` as THE body terminator and silently
    // dropped every command after the loop — template-literal-list-build lost
    // its final `set #list.innerHTML to $html` in ALL 22 translations
    // (set.destination:property-path ×46, the largest set-family R1 cluster).
    // Now: parseBodyWithClauses carries the opener's depth across the
    // conjunction boundary when the flushed clause really parsed to a loop
    // head (a loop opener can tokenize as a PARTICLE — es `para` — so
    // clause-initial particle openers count too), and
    // parseBodyWithGrammarPatterns consumes an `end` owed to a pushed
    // blockless loop head instead of breaking.
    function allActions(n: unknown, acc: string[] = []): string[] {
      if (!n || typeof n !== 'object') return acc;
      const rec = n as Record<string, any>;
      if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
        const c = rec[f];
        if (Array.isArray(c)) for (const x of c) allActions(x, acc);
      }
      return acc;
    }

    // pt `para` and sw `kwa` tokenize as destination PARTICLES (never
    // keyword/for), so the debt must derive from the clause PARSE, not token
    // kinds — these two lock the particle-opener languages alongside es.
    const conjunctionSplitCases: Array<[string, string]> = [
      [
        'pt',
        'em clique definir $html para "" então para item dentro $items então definir $html para $html + `<li>${item.name}</li>` fim então definir #list.innerHTML para $html',
      ],
      [
        'sw',
        'kwenye bonyeza seti $html kwa "" kisha kwa item ndani $items kisha seti $html kwa $html + `<li>${item.name}</li>` mwisho kisha seti #list.innerHTML kwa $html',
      ],
    ];
    for (const [lang, input] of conjunctionSplitCases) {
      it(`[${lang}] particle-opener loop keeps the final set after the loop end-word`, () => {
        const node = parse(input, lang);
        expect(allActions(node).filter(a => a === 'set').length).toBe(3);
      });
    }

    it('[es] template-literal-list-build keeps the final set after the loop `fin`', () => {
      const node = parse(
        'en clic establecer $html a "" entonces para item en $items entonces establecer $html a $html + `<li>${item.name}</li>` fin entonces establecer #list.innerHTML a $html',
        'es'
      );
      const sets = allActions(node).filter(a => a === 'set');
      expect(sets.length).toBe(3);
      // The reclaimed final set binds the property-path destination, like en.
      function findLastSet(x: unknown): Record<string, any> | null {
        let last: Record<string, any> | null = null;
        (function walk(n: unknown) {
          if (!n || typeof n !== 'object') return;
          const rec = n as Record<string, any>;
          if (rec.action === 'set') last = rec;
          for (const f of ['body', 'statements']) {
            const c = rec[f];
            if (Array.isArray(c)) c.forEach(walk);
          }
        })(x);
        return last;
      }
      const lastSet = findLastSet(node)!;
      const dest = lastSet.roles instanceof Map ? lastSet.roles.get('destination') : undefined;
      expect(dest?.type).toBe('property-path');
    });

    it('[en] the no-conjunction en form is unchanged (depth path, byte-identical)', () => {
      const node = parse(
        'on click set $html to "" then for item in $items set $html to $html + `<li>${item.name}</li>` end then set #list.innerHTML to $html',
        'en'
      );
      const sets = allActions(node).filter(a => a === 'set');
      expect(sets.length).toBe(3);
    });

    it('[es] a body with no loop head still terminates at `fin` (debt never negative)', () => {
      // `fin` with no owed loop head must terminate the body exactly as before.
      const node = parse('en clic alternar .active fin', 'es');
      const actions = allActions(node);
      expect(actions).toContain('toggle');
      expect(actions.filter(a => a === 'for' || a === 'repeat')).toHaveLength(0);
    });
  });
});

describe('set of-possessive destination + operator-run patient (the set/A2 drill)', () => {
  // set-color-variable: `set the *--primary-color of #theme to "#ff6600"`.
  // The of-connector the i18n transformer emits per language was unknown to
  // isOfPossessiveMarker in 10 languages (it `di` normalizes to `tell`,
  // pl `z`/uk `з` to `style`, th `ของ`/ja `の`/ko `의`/bn `র`/hi `का` carry no
  // usable normalization, qu `pa`/tr `nin` normalize to `destination`), and the
  // hand-crafted it/pl/ru/th/uk set patterns' destination tokens never opted
  // into property-path — so the destination truncated to a bare selector (SVO)
  // or the whole property half was skipped (SOV).
  function findAction(n: unknown, action: string): Record<string, any> | null {
    if (!n || typeof n !== 'object') return null;
    const rec = n as Record<string, any>;
    if (rec.action === action) return rec;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) {
        for (const x of c) {
          const hit = findAction(x, action);
          if (hit) return hit;
        }
      } else if (c && typeof c === 'object') {
        const hit = findAction(c, action);
        if (hit) return hit;
      }
    }
    return null;
  }
  function roleOf(cmd: Record<string, any> | null, role: string): any {
    if (!cmd) return undefined;
    return cmd.roles instanceof Map ? cmd.roles.get(role) : undefined;
  }

  // Corpus-shaped renders (i18n transformer output for set-color-variable).
  const ofPossessiveCases: Array<[string, string]> = [
    ['it', 'su clic impostare the *--primary-color di #theme in "#ff6600"'],
    ['pl', 'gdy kliknięcie ustaw the *--primary-color z #theme do "#ff6600"'],
    ['ru', 'при клик установить the *--primary-color из #theme в "#ff6600"'],
    ['th', 'เมื่อ คลิก ตั้ง the *--primary-color ของ #theme ใน "#ff6600"'],
    ['uk', 'при клік встановити the *--primary-color з #theme в "#ff6600"'],
    ['ja', 'the *--primary-color の #theme を "#ff6600" に 設定 クリック で'],
    ['ko', 'the *--primary-color 의 #theme 를 "#ff6600" 에 설정 클릭 할 때'],
    ['hi', 'the *--primary-color का #theme को "#ff6600" में सेट क्लिक पर'],
    ['bn', 'the *--primary-color র #theme কে "#ff6600" তে সেট ক্লিক এ'],
    ['tr', 'the *--primary-color nin #theme i "#ff6600" e ayarla tıklama de'],
    ['qu', 'the *--primary-color pa #theme ta "#ff6600" man ñitiy pi churanay'],
  ];
  for (const [lang, input] of ofPossessiveCases) {
    it(`[${lang}] set-color-variable destination is the full of-possessive property-path`, () => {
      const node = parse(input, lang);
      // The handler wrapper must survive (SOV trailing-event guard: the now-
      // whole set pattern must not swallow the trailing event phrase).
      expect((node as Record<string, any>).action).toBe('on');
      const set = findAction(node, 'set');
      expect(set).not.toBeNull();
      expect(roleOf(set, 'destination')?.type).toBe('property-path');
      expect(roleOf(set, 'patient')?.type).toBe('literal');
    });
  }

  it('[en] set-color-variable reference shape is unchanged', () => {
    const node = parse('on click set the *--primary-color of #theme to "#ff6600"', 'en');
    const set = findAction(node, 'set');
    expect(roleOf(set, 'destination')?.type).toBe('property-path');
    expect(roleOf(set, 'patient')?.type).toBe('literal');
  });

  // two-way-binding: `set #greeting.innerText to "Hello, " + my value`.
  // The tokenizers split the concatenation into value/operator/value runs; a
  // single-token capture took only `"Hello, "` — the en reference silently
  // dropped the `+ my value` tail, and the SOV six fell through to the
  // role-swapping verb-anchoring fallback (patient↔destination inverted).
  it('[en] operator-run patient captures the FULL concatenation as expression', () => {
    const node = parse(
      'on input from #firstName set #greeting.innerText to "Hello, " + my value',
      'en'
    );
    const set = findAction(node, 'set');
    expect(roleOf(set, 'destination')?.type).toBe('property-path');
    const patient = roleOf(set, 'patient');
    expect(patient?.type).toBe('expression');
    expect(String(patient?.raw ?? patient?.value)).toContain('+');
  });

  const operatorRunCases: Array<[string, string]> = [
    ['ja', '#greeting.innerText を "Hello, " + 私の 値 に 設定 入力 で #firstName から'],
    ['ko', '#greeting.innerText 를 "Hello, " + 내 값 에 설정 입력 할 때 #firstName 에서'],
    ['tr', '#greeting.innerText i "Hello, " + benim değer e ayarla giriş de #firstName den'],
    ['hi', '#greeting.innerText को "Hello, " + मेरा मान में सेट इनपुट पर #firstName से'],
    ['bn', '#greeting.innerText কে "Hello, " + আমার মান তে সেট ইনপুট এ #firstName থেকে'],
  ];
  for (const [lang, input] of operatorRunCases) {
    it(`[${lang}] two-way-binding matches the generated set pattern (no role swap)`, () => {
      const node = parse(input, lang);
      expect((node as Record<string, any>).action).toBe('on');
      const set = findAction(node, 'set');
      expect(set).not.toBeNull();
      // destination is the selector+property lvalue, patient the expression run
      expect(roleOf(set, 'destination')?.type).toBe('property-path');
      expect(roleOf(set, 'patient')?.type).toBe('expression');
    });
  }

  it('[ja] computed-value parenthesized operator-run patient assembles', () => {
    const node = parse(
      '#total.innerText を (the 値 の #price として Number) * (私の 値 として Number) に 設定 入力 で .quantity から',
      'ja'
    );
    const set = findAction(node, 'set');
    expect(roleOf(set, 'destination')?.type).toBe('property-path');
    expect(roleOf(set, 'patient')?.type).toBe('expression');
  });

  // Blast-radius locks: non-arithmetic captures must be untouched.
  it('[en] a plain literal patient does not assemble (set x to 5)', () => {
    const set = findAction(parse('set x to 5', 'en'), 'set');
    expect(roleOf(set, 'patient')?.type).toBe('literal');
  });
  it('[en] a dangling operator is left unconsumed (set x to 5 +)', () => {
    const set = findAction(parse('set x to 5 +', 'en'), 'set');
    expect(roleOf(set, 'patient')?.type).toBe('literal');
  });
  it('[ja] owner-first possessive patient is untouched (#button の .active を 切り替え)', () => {
    // toggle.patient does not opt into property-path; the の here is the
    // ordinary possessive scope, not the of-possessive corpus render.
    const node = parse('#button の .active を 切り替え', 'ja');
    const toggle = findAction(node, 'toggle');
    expect(toggle).not.toBeNull();
    expect(roleOf(toggle, 'patient')?.type).toBe('selector');
  });
});

describe('condition copulas: rendered identifier copulas keep the predicate in the condition', () => {
  // if-empty / input-validation: `if my value is empty add .error to me …`.
  // The rendered copulas (fr est, ru есть, pt é, uk є, tl ay, ms adalah,
  // th เป็น) tokenize as bare identifiers — and ar هو normalizes to `it` — so
  // the copula guard missed them, the condition split fired at the predicate
  // (vide/пустой/فارغ… doubles as the empty/null COMMAND keyword), and a
  // phantom `empty me` command opened the then-branch in 8 languages
  // (spurious-`empty` ×16, the R0-precision family).
  function allActions(n: unknown, acc: string[] = []): string[] {
    if (!n || typeof n !== 'object') return acc;
    const rec = n as Record<string, any>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') acc.push(rec.action);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) allActions(x, acc);
      else if (c && typeof c === 'object') allActions(c, acc);
    }
    return acc;
  }

  const cases: Array<[string, string]> = [
    [
      'fr',
      'sur défocaliser si mon valeur est vide ajouter .error à moi alors mettre "Required" à suivant .error-message fin',
    ],
    [
      'ru',
      'при размыть если мой значение есть пустой добавить .error в я затем положить "Required" в следующий .error-message конец',
    ],
    [
      'ar',
      'عند ضبابية إذا لي قيمة هو فارغ أضف .error إلى أنا ثم ضع "Required" إلى التالي .error-message النهاية',
    ],
    [
      'ms',
      'apabila kabur jika saya_punya nilai adalah kosong tambah .error ke saya kemudian letak "Required" ke seterusnya .error-message tamat',
    ],
  ];
  for (const [lang, input] of cases) {
    it(`[${lang}] if-empty has no phantom empty command`, () => {
      const actions = allActions(parse(input, lang));
      expect(actions.filter(a => a === 'empty')).toHaveLength(0);
      expect(actions).toContain('if');
      expect(actions).toContain('add');
      expect(actions).toContain('put');
    });
  }

  it('[ar] هو as the PRONOUN condition still splits at the command verb (fetch-do-not-throw)', () => {
    // `إذا هو اضبط $users إلى هو` = `if it set $users to it` — هو here is the
    // bare condition, not a copula; the then-branch set must not be swallowed.
    const actions = allActions(
      parse('احضر /api/users عند نقر كـJSON do ليس ارم ثم إذا هو اضبط $users إلى هو النهاية', 'ar')
    );
    expect(actions).toContain('set');
    expect(actions.filter(a => a === 'empty')).toHaveLength(0);
  });

  it('[en] the reference shape is unchanged (condition keeps `empty`, add opens the branch)', () => {
    const node = parse(
      'on blur if my value is empty add .error to me put "Required" into next .error-message end',
      'en'
    );
    const actions = allActions(node);
    expect(actions.filter(a => a === 'empty')).toHaveLength(0);
    expect(actions).toContain('add');
    expect(actions).toContain('put');
  });
});

// =============================================================================
// Nested-behavior sub-parse drill (#582): guard-clause `exit`, in-branch
// transition roles, structural-keyword event guard, bn fold terminator.
// =============================================================================

describe('nested-behavior sub-parse drill', () => {
  function walkNodes(n: unknown, acc: Record<string, any>[] = []): Record<string, any>[] {
    if (!n || typeof n !== 'object') return acc;
    const rec = n as Record<string, any>;
    if (typeof rec.action === 'string') acc.push(rec);
    for (const f of [
      'body',
      'statements',
      'thenBranch',
      'elseBranch',
      'eventHandlers',
      'initBlock',
    ]) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) walkNodes(x, acc);
      else if (c && typeof c === 'object') walkNodes(c, acc);
    }
    return acc;
  }
  const actionsOf = (n: unknown) =>
    walkNodes(n)
      .map(r => r.action)
      .filter(a => a !== 'compound');
  const role = (node: Record<string, any>, r: string): { type?: string; value?: unknown; raw?: unknown } | undefined =>
    node.roles instanceof Map ? node.roles.get(r) : undefined;

  it('[en] bare `exit` parses via the generated bare-keyword pattern', () => {
    // exitSchema has zero roles; without `bareKeyword: true` NO pattern exists
    // and the guard-clause branch (`if item is null exit end`) parses to
    // nothing, so the conditional fold rejects and the flat `if` truncates.
    expect(parse('exit', 'en').action).toBe('exit');
  });

  it('[en] a guard-clause `if … exit end` folds inside a handler body', () => {
    const node = parse(
      'on pointerdown set item to the target.closest("li") if item is null exit end halt the event',
      'en'
    );
    const actions = actionsOf(node);
    expect(actions).toContain('exit');
    expect(actions).toContain('halt');
    const conditional = walkNodes(node).find(r => r.kind === 'conditional');
    expect(conditional).toBeDefined();
    // Without the fold the condition truncates to its first token ("item").
    expect(String(role(conditional!, 'condition')?.raw ?? '')).toContain('null');
  });

  it('[id] behavior-sortable guard clause: leftover `kosong` no longer re-parses as `empty`', () => {
    const node = parse(
      'pada pointerdown(clientY) dari saya\n' +
        '  atur item ke the target.closest("li")\n' +
        '  jika item adalah kosong\n' +
        '    keluar\n' +
        '  akhir\n' +
        '  berhenti the peristiwa\n' +
        '  tambah .{dragClass} ke item',
      'id'
    );
    const actions = actionsOf(node);
    expect(actions.filter(a => a === 'empty')).toHaveLength(0);
    expect(actions).toContain('exit');
    expect(actions).toContain('halt');
    expect(actions).toContain('add');
  });

  it('[ja] 退出 parses as exit (profile primary, dict now aligned to it)', () => {
    expect(parse('退出', 'ja').action).toBe('exit');
  });

  it('[ja] in-branch transition captures patient/goal/duration like the en reference', () => {
    // `もし effect である "fade" opacity を 遷移 0 に 300ms 終わり` reaches the
    // verb-anchoring path (no fused-event reclaim there): the destination
    // particle に binds the goal as a junk literal destination, the bare 300ms
    // dropped, and the patient typed literal. The transition normalize rule +
    // the trailing TIME reclaim align all three.
    const node = parse(
      'クリック で 私 から もし effect である "fade" opacity を 遷移 0 に 300ms 終わり',
      'ja'
    );
    const transition = walkNodes(node).find(r => r.action === 'transition');
    expect(transition).toBeDefined();
    expect(role(transition!, 'patient')?.type).toBe('expression');
    expect(String(role(transition!, 'patient')?.raw)).toBe('opacity');
    expect(String(role(transition!, 'goal')?.value)).toBe('0');
    expect(String(role(transition!, 'duration')?.value)).toBe('300ms');
  });

  it('[ja] a verb-first trigger must not swallow the following if-keyword as its event', () => {
    // The db-faithful behavior-removable handler. Without the
    // STRUCTURAL_NEVER_EVENT guard the verb-first pattern (`引き金 {event}`)
    // captures event:literal="if" from the もし that opens the next clause,
    // hiding the if from the fold — the transition branch then degrades to
    // junk verb-anchoring (style/patient garbage, no goal/duration).
    const node = parse(
      'クリック で triggerEl から\n' +
        '  もし confirmRemoval\n' +
        '    js(me)\n' +
        '      if (!window.confirm("Are you sure?")) return "cancel";\n' +
        '    end\n' +
        '    もし それ である "cancel"\n' +
        '      停止\n' +
        '    終わり\n' +
        '  終わり\n' +
        '  removable:before を 引き金\n' +
        '  もし effect である "fade"\n' +
        '    opacity を 遷移 0 に 300ms\n' +
        '  終わり\n' +
        '  removable:removed を 引き金\n' +
        '  私 を 削除',
      'ja'
    );
    const triggers = walkNodes(node).filter(r => r.action === 'trigger');
    const events = triggers.map(t => String(role(t, 'event')?.value ?? ''));
    expect(events).toContain('removable:before');
    expect(events).toContain('removable:removed');
    expect(events).not.toContain('if');
    // The if now folds: the transition inside the branch survives with full roles.
    const transition = walkNodes(node).find(r => r.action === 'transition');
    expect(transition).toBeDefined();
    expect(String(role(transition!, 'goal')?.value)).toBe('0');
    expect(String(role(transition!, 'duration')?.value)).toBe('300ms');
  });

  it('[bn] the conditional fold terminates at শেষ so trailing siblings survive', () => {
    // শেষ cannot join the curated value set (it is also bn positional `last`),
    // so the fold used to consume the whole tail: both triggers and the remove
    // nested into the branch (behavior-removable). isBlockEndToken recognises
    // the tokenizer's normalized `end` with a selector-lookahead exception.
    // Db-faithful handler (the confirmRemoval block precedes the triggers).
    const node = parse(
      'ক্লিক এ triggerEl থেকে\n' +
        '  যদি confirmRemoval\n' +
        '    js(me)\n' +
        '      if (!window.confirm("Are you sure?")) return "cancel";\n' +
        '    end\n' +
        '    যদি এটি হয় "cancel"\n' +
        '      থামুন\n' +
        '    শেষ\n' +
        '  শেষ\n' +
        '  removable:before কে ট্রিগার\n' +
        '  যদি effect হয় "fade"\n' +
        '    opacity কে সংক্রমণ 0 তে 300ms জন্য\n' +
        '  শেষ\n' +
        '  removable:removed কে ট্রিগার\n' +
        '  আমি কে সরান',
      'bn'
    );
    const all = walkNodes(node);
    const events = all
      .filter(r => r.action === 'trigger')
      .map(t => String(role(t, 'event')?.value ?? ''));
    expect(events).toContain('removable:before');
    expect(events).toContain('removable:removed');
    const actions = actionsOf(node);
    expect(actions).toContain('transition');
    expect(actions).toContain('remove');
    // The জন্য for-postposition must not anchor a phantom zero-role `for`.
    expect(actions.filter(a => a === 'for')).toHaveLength(0);
  });
});

describe('then-boundary if fold: an open mid-clause `if` block spans the then-conjunction', () => {
  function walkNodes(n: unknown, acc: Record<string, any>[] = []): Record<string, any>[] {
    if (!n || typeof n !== 'object') return acc;
    const rec = n as Record<string, any>;
    if (typeof rec.action === 'string') acc.push(rec);
    for (const f of [
      'body',
      'statements',
      'thenBranch',
      'elseBranch',
      'eventHandlers',
      'initBlock',
    ]) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) walkNodes(x, acc);
      else if (c && typeof c === 'object') walkNodes(c, acc);
    }
    return acc;
  }
  const role = (node: Record<string, any>, r: string): { type?: string; value?: unknown; raw?: unknown } | undefined =>
    node.roles instanceof Map ? node.roles.get(r) : undefined;

  it('[en] a mid-clause `if x < y then … end` folds with its full condition', () => {
    // The `then` is a CONJUNCTION: the old clause split landed the if-head
    // clause-FINAL with no branch tokens, so the mid-clause fold had nothing to
    // fold (null) and the flat `if` truncated the condition to its first token.
    const node = parse(
      'on click set count to 1 if count < 2 then set count to 2 end add .done to me',
      'en'
    );
    const conditional = walkNodes(node).find(r => r.kind === 'conditional');
    expect(conditional).toBeDefined();
    expect(String(role(conditional!, 'condition')?.raw ?? '')).toBe('count < 2');
    const branchSets = walkNodes({ statements: conditional!.thenBranch }).filter(
      r => r.action === 'set'
    );
    expect(branchSets).toHaveLength(1);
    const actions = walkNodes(node).map(r => r.action);
    expect(actions).toContain('add');
  });

  it('[en] behavior-resizable: the four clamp ifs fold and the loop tail survives', () => {
    // Db-faithful handler segment. Without the then-boundary suppression the
    // if-blocks' owed `end`s desynced the debt bookkeeping and an `end` broke
    // the walk after the 3rd if — dropping the 4th clamp, both `set my
    // *width/*height`, and the last two triggers (bn parsed MORE of this body
    // than the en reference; its "spurious" set/trigger/if flags were en
    // deficits).
    const node = parse(
      'on pointerdown(clientX, clientY) from me\n' +
        '    halt the event\n' +
        '    trigger resizable:start\n' +
        '    measure width\n' +
        '    set startWidth to it\n' +
        '    measure height\n' +
        '    set startHeight to it\n' +
        '    set startX to clientX\n' +
        '    set startY to clientY\n' +
        '    repeat until event pointerup from document\n' +
        '      wait for pointermove(clientX, clientY) or pointerup(clientX, clientY) from document\n' +
        '      set newWidth to startWidth + clientX - startX\n' +
        '      set newHeight to startHeight + clientY - startY\n' +
        '      if newWidth < minWidth then set newWidth to minWidth end\n' +
        '      if newWidth > maxWidth then set newWidth to maxWidth end\n' +
        '      if newHeight < minHeight then set newHeight to minHeight end\n' +
        '      if newHeight > maxHeight then set newHeight to maxHeight end\n' +
        '      set my *width to newWidth + "px"\n' +
        '      set my *height to newHeight + "px"\n' +
        '      trigger resizable:resize\n' +
        '    end\n' +
        '    trigger resizable:end',
      'en'
    );
    const all = walkNodes(node);
    const conditionals = all.filter(r => r.kind === 'conditional');
    expect(conditionals).toHaveLength(4);
    for (const c of conditionals) {
      // Full comparison captured, not the first-token truncation.
      expect(String(role(c, 'condition')?.raw ?? '')).toMatch(/[<>]/);
      const branchSets = walkNodes({ statements: c.thenBranch }).filter(r => r.action === 'set');
      expect(branchSets).toHaveLength(1);
    }
    const events = all
      .filter(r => r.action === 'trigger')
      .map(t => String(role(t, 'event')?.value ?? ''));
    expect(events).toContain('resizable:start');
    expect(events).toContain('resizable:resize');
    expect(events).toContain('resizable:end');
    // The post-if siblings survive: 4 leading sets + 4 clamp sets + the two
    // style sets.
    expect(all.filter(r => r.action === 'set').length).toBeGreaterThanOrEqual(10);
  });
});

describe('event-head param phrase: parameterized SOV handler heads anchor the real event', () => {
  function walkNodes(n: unknown, acc: Record<string, any>[] = []): Record<string, any>[] {
    if (!n || typeof n !== 'object') return acc;
    const rec = n as Record<string, any>;
    if (typeof rec.action === 'string') acc.push(rec);
    for (const f of [
      'body',
      'statements',
      'thenBranch',
      'elseBranch',
      'eventHandlers',
      'initBlock',
    ]) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) walkNodes(x, acc);
      else if (c && typeof c === 'object') walkNodes(c, acc);
    }
    return acc;
  }
  const role = (node: Record<string, any>, r: string): { type?: string; value?: unknown; raw?: unknown } | undefined =>
    node.roles instanceof Map ? node.roles.get(r) : undefined;

  it('[ja] `pointerdown(clientY) で 私 から` anchors pointerdown, not the `)`', () => {
    // The tokenizers split `pointerdown(clientY)` into 4 tokens, so the SOV
    // event-marker check (marker DIRECTLY after the event keyword) never fired
    // on a parameterized event; the custom-event second pass then anchored the
    // `)` as the event (event:literal=")") and the leaked keyword-led `私 から`
    // head run was discarded by flushSkipped — killing the first body command.
    // Db-faithful behavior-sortable handler segment.
    const node = parse(
      'pointerdown(clientY) で 私 から\n' +
        '  item を the target.closest("li") に 設定\n' +
        '  もし item である null\n' +
        '    退出\n' +
        '  終わり\n' +
        '  the イベント を 停止\n' +
        '  .{dragClass} を 追加 item に',
      'ja'
    );
    const handler = walkNodes(node).find(r => r.kind === 'event-handler');
    expect(handler).toBeDefined();
    expect(String(role(handler!, 'event')?.value)).toBe('pointerdown');
    expect((handler as { parameterNames?: readonly string[] }).parameterNames).toEqual([
      'clientY',
    ]);
    // The handler set survives with en-aligned role types…
    const set = walkNodes(node).find(r => r.action === 'set');
    expect(set).toBeDefined();
    expect(role(set!, 'destination')?.type).toBe('expression');
    expect(String(role(set!, 'destination')?.raw ?? role(set!, 'destination')?.value)).toBe(
      'item'
    );
    expect(role(set!, 'patient')?.type).toBe('expression');
    // …and with `item` bound, the add's destination is the real item, not `me`.
    const add = walkNodes(node).find(r => r.action === 'add');
    expect(add).toBeDefined();
    expect(String(role(add!, 'destination')?.raw ?? role(add!, 'destination')?.value)).toBe(
      'item'
    );
  });

  it('[ko] `pointerdown(clientY) 할 때 나 에서` consumes params + marker phrase + source pair', () => {
    const node = parse(
      'pointerdown(clientY) 할 때 나 에서\n  item 를 the target.closest("li") 에 설정',
      'ko'
    );
    const handler = walkNodes(node).find(r => r.kind === 'event-handler');
    expect(handler).toBeDefined();
    expect(String(role(handler!, 'event')?.value)).toBe('pointerdown');
    const set = walkNodes(node).find(r => r.action === 'set');
    expect(set).toBeDefined();
    expect(role(set!, 'patient')?.type).toBe('expression');
  });

  it('[qu] fronted `noqa manta pointerdown(clientY) pi` strips the from-me pair', () => {
    const node = parse(
      'noqa manta pointerdown(clientY) pi\n  item ta the target.closest("li") man churanay',
      'qu'
    );
    const handler = walkNodes(node).find(r => r.kind === 'event-handler');
    expect(handler).toBeDefined();
    expect(String(role(handler!, 'event')?.value)).toBe('pointerdown');
    const set = walkNodes(node).find(r => r.action === 'set');
    expect(set).toBeDefined();
    expect(role(set!, 'patient')?.type).toBe('expression');
  });

  it('[ja] the fused method call folds its call parens into the expression', () => {
    // tryMatchPropertyAccessExpression used to return `target.closest` leaving
    // `( "li" )` in the stream — the following に marker then failed and the
    // whole set-ja-generated match died (falling to role-swapping
    // verb-anchoring).
    const node = parse('item を the target.closest("li") に 設定', 'ja');
    expect(node.action).toBe('set');
    const n = node as unknown as Record<string, any>;
    expect(role(n, 'destination')?.type).toBe('expression');
    expect(String(role(n, 'destination')?.raw)).toBe('item');
    expect(role(n, 'patient')?.type).toBe('expression');
    expect(String(role(n, 'patient')?.raw)).toContain('target.closest');
    expect(String(role(n, 'patient')?.raw)).toContain('"li"');
  });

  it('[ko] `repeat until event pointerup` head still parses as a loop, not a handler', () => {
    // pointerup is now a recognizable handler event (WAITABLE family) — but an
    // event name directly after the `event` KEYWORD is a loop phrase payload.
    const node = parse('까지 이벤트 pointerup 를 반복 문서 에서', 'ko');
    const all = walkNodes(node);
    expect(all.find(r => r.kind === 'event-handler')).toBeUndefined();
    expect(all.find(r => r.action === 'repeat')).toBeDefined();
  });
});

describe('remove source slot: bare-identifier acceptance + genitive/from-marker collision', () => {
  function walkNodes(n: unknown, acc: Record<string, any>[] = []): Record<string, any>[] {
    if (!n || typeof n !== 'object') return acc;
    const rec = n as Record<string, any>;
    if (typeof rec.action === 'string') acc.push(rec);
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
      const c = rec[f];
      if (Array.isArray(c)) for (const x of c) walkNodes(x, acc);
      else if (c && typeof c === 'object') walkNodes(c, acc);
    }
    return acc;
  }
  const role = (
    node: Record<string, any>,
    r: string
  ): { type?: string; value?: unknown; raw?: unknown } | undefined =>
    node.roles instanceof Map ? node.roles.get(r) : undefined;

  it('[en] `remove .{dragClass} from item` captures the bare identifier source', () => {
    // The source slot's expectedTypes rejected a bare identifier (expression),
    // so the en reference — even in ISOLATION — silently dropped `item` and the
    // schema's `me` default filled in; translations that DID capture the item
    // were penalized against the under-captured reference (behavior-sortable
    // remove.source ×12).
    const node = parse('remove .{dragClass} from item', 'en');
    expect(node.action).toBe('remove');
    const n = node as unknown as Record<string, any>;
    expect(role(n, 'patient')?.type).toBe('selector');
    expect(role(n, 'source')?.type).toBe('expression');
    expect(String(role(n, 'source')?.raw)).toBe('item');
  });

  for (const [lang, line] of [
    ['es', 'quitar .{dragClass} de item'],
    ['pt', 'remover .{dragClass} de item'],
  ] as const) {
    it(`[${lang}] \`${line}\`: \`de\` is remove's from-marker, not a possessive`, () => {
      // es/pt `de` is BOTH the Romance genitive connector AND remove's rendered
      // from-marker (normalized `source`). The possessive-selector matcher read
      // `.{dragClass} de item` as ".{dragClass}'s item" — a phantom
      // property-path patient — and the real source fell to the `me` default.
      // The marker-role collision gate keeps the fold off commands that declare
      // a `source` role.
      const node = parse(line, lang);
      expect(node.action).toBe('remove');
      const n = node as unknown as Record<string, any>;
      expect(role(n, 'patient')?.type).toBe('selector');
      expect(String(role(n, 'patient')?.value)).toBe('.{dragClass}');
      expect(role(n, 'source')?.type).toBe('expression');
      expect(String(role(n, 'source')?.raw)).toBe('item');
    });
  }

  it('[ja] a bound-identifier remove source retypes literal → expression', () => {
    // The SOV marked capture types the untranslated `item` as a bare literal;
    // en types the same variable read as expression. Same canonicalization as
    // the add/set destination retype, extended to `source`. Corpus-shaped
    // behavior-sortable handler segment (the set line binds `item`; a bare
    // two-line compound is NOT the corpus shape — the body sub-parse is).
    const node = parse(
      'pointerdown(clientY) で 私 から\n' +
        '  item を the target.closest("li") に 設定\n' +
        '  .{dragClass} を 削除 item から',
      'ja'
    );
    const rm = walkNodes(node).find(r => r.action === 'remove');
    expect(rm).toBeDefined();
    expect(role(rm!, 'patient')?.type).toBe('selector');
    expect(role(rm!, 'source')?.type).toBe('expression');
    expect(String(role(rm!, 'source')?.raw)).toBe('item');
  });

  it('[qu/tr] destination-normalized genitives still fold (bind possessives)', () => {
    // The collision gate is deliberately `source`-only: qu `pa` and tr `ın`
    // possessive folds are load-bearing on commands that declare a destination
    // — gating on any declared role parsed these binds to NULL
    // (bind-explicit-property / bind-non-form-display coverage regression).
    const qu = parse('$color ta #picker pa chanin man bind', 'qu');
    expect(qu).not.toBeNull();
    expect(walkNodes(qu).find(r => r.action === 'bind')).toBeDefined();
    const tr = parse('$color i #picker ın değer e bind', 'tr');
    expect(tr).not.toBeNull();
    expect(walkNodes(tr).find(r => r.action === 'bind')).toBeDefined();
  });
});
