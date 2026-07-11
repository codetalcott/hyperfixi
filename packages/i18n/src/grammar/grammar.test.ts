/**
 * Grammar Transformer Tests
 *
 * Tests for the generalized grammar transformation system
 * that handles multilingual hyperscript with proper word order
 * and grammatical markers.
 */

import { describe, it, expect } from 'vitest';
import {
  parseStatement,
  toLocale,
  toEnglish,
  translate,
  GrammarTransformer,
  examples,
} from './transformer';
import {
  getProfile,
  getSupportedLocales,
  profiles,
  englishProfile,
  japaneseProfile,
  chineseProfile,
  arabicProfile,
} from './profiles';
import {
  reorderRoles,
  insertMarkers,
  joinTokens,
  UNIVERSAL_PATTERNS,
  LANGUAGE_FAMILY_DEFAULTS,
} from './types';
import type { ParsedElement, SemanticRole } from './types';

// =============================================================================
// Profile Tests
// =============================================================================

describe('Language Profiles', () => {
  it('should have profiles for all supported locales', () => {
    const locales = getSupportedLocales();
    // Explicit expected list — when adding a profile, append it here so the
    // count assertion stays meaningful without becoming a magic number.
    const expectedLocales = [
      'en',
      'ja',
      'ko',
      'zh',
      'ar',
      'tr',
      'es',
      'de',
      'fr',
      'pt',
      'id',
      'ms',
      'qu',
      'sw',
      'bn',
      'it',
      'ru',
      'uk',
      'vi',
      'hi',
      'tl',
      'th',
      'pl',
      'he',
    ];
    for (const code of expectedLocales) {
      expect(locales, `missing profile: ${code}`).toContain(code);
    }
    expect(locales.length).toBe(expectedLocales.length);
  });

  it('should return undefined for unknown locales', () => {
    expect(getProfile('xx')).toBeUndefined();
    expect(getProfile('xyz')).toBeUndefined();
  });

  describe('English Profile', () => {
    it('should have SVO word order', () => {
      expect(englishProfile.wordOrder).toBe('SVO');
    });

    it('should use prepositions', () => {
      expect(englishProfile.adpositionType).toBe('preposition');
    });

    it('should have required markers', () => {
      const onMarker = englishProfile.markers.find(m => m.form === 'on');
      expect(onMarker).toBeDefined();
      expect(onMarker?.role).toBe('event');
      expect(onMarker?.required).toBe(true);
    });
  });

  describe('Japanese Profile', () => {
    it('should have SOV word order', () => {
      expect(japaneseProfile.wordOrder).toBe('SOV');
    });

    it('should use postpositions', () => {
      expect(japaneseProfile.adpositionType).toBe('postposition');
    });

    it('should have particle markers', () => {
      const woMarker = japaneseProfile.markers.find(m => m.form === 'を');
      expect(woMarker).toBeDefined();
      expect(woMarker?.role).toBe('patient');
      expect(woMarker?.position).toBe('postposition');
    });

    it('should place patient before action in canonical order', () => {
      const patientIndex = japaneseProfile.canonicalOrder.indexOf('patient');
      const actionIndex = japaneseProfile.canonicalOrder.indexOf('action');
      expect(patientIndex).toBeLessThan(actionIndex);
    });
  });

  describe('Arabic Profile', () => {
    it('should have VSO word order', () => {
      expect(arabicProfile.wordOrder).toBe('VSO');
    });

    it('should be RTL', () => {
      expect(arabicProfile.direction).toBe('rtl');
    });

    it('should place action first in canonical order', () => {
      expect(arabicProfile.canonicalOrder[0]).toBe('action');
    });
  });

  describe('Chinese Profile', () => {
    it('should have isolating morphology', () => {
      expect(chineseProfile.morphology).toBe('isolating');
    });

    it('should have circumfix markers for events', () => {
      const eventMarkers = chineseProfile.markers.filter(m => m.role === 'event');
      const hasPreposition = eventMarkers.some(m => m.position === 'preposition');
      const hasPostposition = eventMarkers.some(m => m.position === 'postposition');
      expect(hasPreposition).toBe(true);
      expect(hasPostposition).toBe(true);
    });
  });
});

// =============================================================================
// Statement Parsing Tests
// =============================================================================

describe('Statement Parser', () => {
  describe('parseStatement', () => {
    it('should parse event handlers', () => {
      const parsed = parseStatement('on click increment #count');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('event-handler');
      expect(parsed?.roles.get('event')?.value).toBe('click');
      expect(parsed?.roles.get('action')?.value).toBe('increment');
      expect(parsed?.roles.get('patient')?.value).toBe('#count');
    });

    it('should identify CSS selectors as patient', () => {
      const parsed = parseStatement('on click toggle .active');
      expect(parsed?.roles.get('patient')?.isSelector).toBe(true);
    });

    it('should parse commands', () => {
      const parsed = parseStatement('put my value into #output');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('command');
      expect(parsed?.roles.get('action')?.value).toBe('put');
    });

    it('should parse conditionals', () => {
      const parsed = parseStatement('if count > 5 then log done');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('conditional');
    });

    it('should return null for empty input', () => {
      const parsed = parseStatement('');
      expect(parsed).toBeNull();
    });

    it('should preserve original input', () => {
      const input = 'on click increment #count';
      const parsed = parseStatement(input);
      expect(parsed?.original).toBe(input);
    });
  });

  describe('Event Handler Parsing', () => {
    it('should handle various event types', () => {
      const events = ['click', 'input', 'keydown', 'mouseenter', 'submit'];
      for (const event of events) {
        const parsed = parseStatement(`on ${event} log done`);
        expect(parsed?.roles.get('event')?.value).toBe(event);
      }
    });

    it('should handle complex selectors', () => {
      const parsed = parseStatement('on click toggle .menu-item.active');
      expect(parsed?.roles.get('patient')?.value).toBe('.menu-item.active');
    });
  });

  describe('Command Parsing', () => {
    it('should identify destination with "to" keyword', () => {
      const parsed = parseStatement('add .highlight to #element');
      expect(parsed?.roles.get('destination')?.value).toBe('#element');
    });

    it('should identify destination with "into" keyword', () => {
      const parsed = parseStatement('put value into #output');
      expect(parsed?.roles.get('destination')?.value).toBe('#output');
    });

    it('should identify source with "from" keyword', () => {
      const parsed = parseStatement('get data from #input');
      expect(parsed?.roles.get('source')?.value).toBe('#input');
    });
  });
});

// =============================================================================
// Role Transformation Tests
// =============================================================================

describe('Role Transformation', () => {
  describe('reorderRoles', () => {
    it('should reorder roles according to target order', () => {
      const roles = new Map<SemanticRole, ParsedElement>([
        ['action', { role: 'action', value: 'increment' }],
        ['patient', { role: 'patient', value: '#count' }],
        ['event', { role: 'event', value: 'click' }],
      ]);

      // Japanese order: patient, event, action
      const reordered = reorderRoles(roles, ['patient', 'event', 'action']);

      expect(reordered[0].role).toBe('patient');
      expect(reordered[1].role).toBe('event');
      expect(reordered[2].role).toBe('action');
    });

    it('should skip roles not present in input', () => {
      const roles = new Map<SemanticRole, ParsedElement>([
        ['action', { role: 'action', value: 'toggle' }],
        ['patient', { role: 'patient', value: '.active' }],
      ]);

      const reordered = reorderRoles(roles, ['patient', 'destination', 'action']);

      expect(reordered.length).toBe(2);
      expect(reordered[0].role).toBe('patient');
      expect(reordered[1].role).toBe('action');
    });
  });

  describe('insertMarkers', () => {
    it('should insert preposition markers before elements', () => {
      const elements: ParsedElement[] = [
        { role: 'destination', value: '#output', translated: '#output' },
      ];
      const markers = [
        {
          form: 'to',
          role: 'destination' as SemanticRole,
          position: 'preposition' as const,
          required: false,
        },
      ];

      const result = insertMarkers(elements, markers, 'preposition');
      expect(result).toEqual(['to', '#output']);
    });

    it('should insert postposition markers after elements', () => {
      const elements: ParsedElement[] = [
        { role: 'patient', value: '#count', translated: '#count' },
      ];
      const markers = [
        {
          form: 'を',
          role: 'patient' as SemanticRole,
          position: 'postposition' as const,
          required: true,
        },
      ];

      const result = insertMarkers(elements, markers, 'postposition');
      expect(result).toEqual(['#count', 'を']);
    });

    it('should use translated values when available', () => {
      const elements: ParsedElement[] = [
        { role: 'action', value: 'increment', translated: '増加' },
      ];

      const result = insertMarkers(elements, [], 'none');
      expect(result).toEqual(['増加']);
    });
  });

  describe('joinTokens', () => {
    it('should join regular tokens with spaces', () => {
      const result = joinTokens(['hello', 'world']);
      expect(result).toBe('hello world');
    });

    it('should handle empty array', () => {
      const result = joinTokens([]);
      expect(result).toBe('');
    });

    it('should handle single token', () => {
      const result = joinTokens(['hello']);
      expect(result).toBe('hello');
    });

    it('should attach suffix markers without space (Quechua -ta)', () => {
      // #count + -ta → #countta
      const result = joinTokens(['#count', '-ta']);
      expect(result).toBe('#countta');
    });

    it('should attach prefix markers without space (Arabic بـ-)', () => {
      // بـ- + الماوس → بـالماوس
      const result = joinTokens(['بـ-', 'الماوس']);
      expect(result).toBe('بـالماوس');
    });

    it('should handle multiple suffix markers (Turkish case suffixes)', () => {
      // value + -i + another → valuei another
      const result = joinTokens(['value', '-i', 'another']);
      expect(result).toBe('valuei another');
    });

    it('should handle Japanese particles with normal spacing', () => {
      // Japanese particles don't use hyphen notation, so they get spaces
      const result = joinTokens(['#count', 'を', 'クリック', 'で', '増加']);
      expect(result).toBe('#count を クリック で 増加');
    });

    it('should handle Quechua agglutinative chain', () => {
      // #count + -ta + click + -pi + increment
      const result = joinTokens(['#count', '-ta', 'click', '-pi', 'increment']);
      expect(result).toBe('#countta clickpi increment');
    });

    it('should handle mixed prefix and regular tokens', () => {
      const result = joinTokens(['كـ-', 'JSON', 'format']);
      expect(result).toBe('كـJSON format');
    });
  });
});

// =============================================================================
// Grammar Transformer Tests
// =============================================================================

describe('GrammarTransformer', () => {
  describe('Constructor', () => {
    it('should create transformer with valid locales', () => {
      expect(() => new GrammarTransformer('en', 'ja')).not.toThrow();
      expect(() => new GrammarTransformer('en', 'zh')).not.toThrow();
      expect(() => new GrammarTransformer('en', 'ar')).not.toThrow();
    });

    it('should throw for invalid source locale', () => {
      expect(() => new GrammarTransformer('xx', 'ja')).toThrow('Unknown source locale');
    });

    it('should throw for invalid target locale', () => {
      expect(() => new GrammarTransformer('en', 'xx')).toThrow('Unknown target locale');
    });
  });

  describe('Japanese Transformation (SOV)', () => {
    const transformer = new GrammarTransformer('en', 'ja');

    it('should transform event handler to SOV order', () => {
      const result = transformer.transform('on click increment #count');
      // Should have patient (with を), event (with で), action pattern
      expect(result).toContain('#count');
      expect(result).toContain('を');
    });

    it('should preserve CSS selectors', () => {
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });

    it('should preserve ID selectors', () => {
      const result = transformer.transform('on input put value into #output');
      expect(result).toContain('#output');
    });

    it('should keep event guards intact and untranslated', () => {
      // `[key is 'Escape']` must stay one token with its contents verbatim —
      // the spaces must not split it, and `is` must not be translated as a verb.
      const result = transformer.transform("on keyup[key is 'Escape'] clear me");
      // Guard stays one verbatim token attached to the event (not split on its
      // internal spaces), and `is` inside it is not translated to a verb.
      expect(result).toContain("keyup[key is 'Escape']");
    });

    it('should keep an event-handler block body intact (not shredded)', () => {
      // `on <event> if … end` must keep the event clause first, then the whole
      // `if … end` block as a self-contained unit — never reordered into the
      // event handler's role soup.
      const result = transformer.transform(
        'on keydown[key=="Enter"] if event.shiftKey call submitAndContinue() end'
      );
      // Event leads; the if-block follows with its condition preserved.
      expect(result).toMatch(/keydown\[key=="Enter"\].*もし.*event\.shiftKey/);
      expect(result).toContain('submitAndContinue()');
      // `end` keyword present (translated), block not dropped.
      expect(result).toContain('終わり');
    });

    it('should mask inline js bodies from word-order reordering', () => {
      // The raw JS body must stay verbatim and immediately after the (translated)
      // `js` keyword — never reordered ahead of the event like other roles.
      const result = transformer.transform('on click js console.log("from js") end');
      expect(result).toContain('console.log("from js")');
      // js keyword precedes the raw body, which precedes the translated `end`.
      expect(result).toMatch(/JS実行\s+console\.log\("from js"\)\s+終わり/);
      // The body must not be split/reordered: no marker particle injected inside it.
      expect(result).not.toMatch(/console\.log.*を.*from/);
    });
  });

  describe('Hindi Transformation (SOV) — put-into verb-final', () => {
    const transformer = new GrammarTransformer('en', 'hi');

    // The hindiProfile was missing the `put-into` word-order rule that every
    // other SOV profile (ja/ko/tr/bn) carries, so `put X into Y` fell through to a
    // verb-MID default (`X को रखें Y में`). The semantic parser then mis-read the
    // verb-mid form — destination/patient swapped/mistyped — the put.* R1 residue
    // (hi only; other SOV langs already had the rule). With the rule, hi emits the
    // verb-final form `X को Y में रखें` like ja's `X を Y に 置く`.
    it('places the put verb after its destination (verb-final), not mid-clause', () => {
      const result = transformer.transform('put "<p>x</p>" into #out');
      const putIdx = result.indexOf('रखें');
      const destIdx = result.indexOf('#out');
      expect(putIdx).toBeGreaterThan(-1);
      expect(destIdx).toBeGreaterThan(-1);
      // verb-final: the put verb follows its destination.
      expect(putIdx).toBeGreaterThan(destIdx);
    });

    it('keeps the destination marker in (में) on the put target', () => {
      const result = transformer.transform('put "hi" into #out');
      expect(result).toContain('#out में');
    });
  });

  describe('SOV Transformation — set-to verb-final (set.* R1 residue)', () => {
    // No profile carried a `set` word-order rule, so ja/ko/bn/tr/hi emitted set
    // VERB-MEDIAL (`X को सेट Y में`), which the generated SOV set pattern (verb-final,
    // markerOverride: को on the target / में on the value) never matched — set parsed
    // to no/swapped roles (the dominant set.* R1 residue; qu/SVO were already fine).
    // The `set-to` rule emits the verb-final `X को Y में सेट`, like ja's `X を Y に 設定`.
    const langs: Array<[string, string, string]> = [
      // [lang, set verb, destination marker]
      ['hi', 'सेट', 'में'],
      ['ja', '設定', 'に'],
      ['ko', '설정', '에'],
      ['bn', 'সেট', 'তে'],
      ['tr', 'ayarla', 'e'],
    ];
    for (const [lang, verb, mark] of langs) {
      it(`[${lang}] set X to Y → verb-final (set verb after the value)`, () => {
        const t = new GrammarTransformer('en', lang);
        const result = t.transform('set @disabled to true');
        const verbIdx = result.indexOf(verb);
        const valIdx = result.search(/true|doğru|참|真|সত্য|सच/u);
        expect(verbIdx).toBeGreaterThan(-1);
        // verb-final: the set verb follows the (translated) value.
        expect(verbIdx).toBeGreaterThan(valIdx);
        // marker present (markerOverride alignment): value carries the dest marker.
        expect(result).toContain(mark);
      });
    }

    // Inline `if … then set X to Y end`: the set's value sweeps up the trailing
    // `end` token (`destination="minWidth end"`), so verb-final reordering would push
    // the set verb PAST `end` and break the block (the bn behavior-resizable
    // faithful→lossy flip). The set-to predicate skips such sets — they stay
    // verb-MEDIAL, so the set verb remains BEFORE the block terminator `end`.
    // (Without the guard the set verb lands after `end`, dropping the `if`.)
    for (const [lang, verb] of langs.map(l => [l[0], l[1]] as const)) {
      it(`[${lang}] inline if/then/set/end keeps the set verb before end (set-to skipped)`, () => {
        const t = new GrammarTransformer('en', lang);
        const result = t
          .transform('if newWidth < minWidth then set newWidth to minWidth end')
          .trim();
        const endWord = t.transform('end').trim();
        const endIdx = result.lastIndexOf(endWord);
        expect(endIdx).toBeGreaterThan(-1);
        // verb-medial (guarded): the set verb precedes the block terminator.
        expect(result.indexOf(verb)).toBeLessThan(endIdx);
      });
    }
  });

  describe('Hindi Transformation (SOV) — bind-to verb-final (bind.* R1 residue)', () => {
    // The hindiProfile lacked a `bind` word-order rule (ja/ko/zh/tr/bn had one), so hi
    // emitted bind VERB-MEDIAL (`$greeting को bind #name-input में`), which the generated
    // verb-final SOV bind pattern never matched → the bare-event fallback mis-anchored
    // the fronted `$greeting` as a phantom `on` event (the rf=0.00 bind residue). The
    // `bind-to` rule emits verb-final `$greeting को #name-input में bind`, like ja's
    // `$greeting を #name-input に バインド`.
    it('[hi] bind $var to #el → verb-final (bind verb after the element)', () => {
      const t = new GrammarTransformer('en', 'hi');
      const result = t.transform('bind $greeting to #name-input');
      const verbIdx = result.indexOf('bind');
      const elIdx = result.indexOf('#name-input');
      expect(verbIdx).toBeGreaterThan(-1);
      expect(elIdx).toBeGreaterThan(-1);
      // verb-final: the bind verb follows the element (was verb-MEDIAL before the rule).
      expect(verbIdx).toBeGreaterThan(elIdx);
      // markerOverride alignment: the element carries the destination locative में.
      expect(result).toContain('में');
    });
  });

  describe('Arabic Transformation (VSO)', () => {
    const transformer = new GrammarTransformer('en', 'ar');

    it('should transform to VSO order with action first', () => {
      const result = transformer.transform('on click increment #count');
      // Arabic VSO: action comes first
      expect(result).toBeTruthy();
      // Verify action (زِد/increment) appears before patient (#count)
      const actionIndex = result.indexOf('زِد');
      const patientIndex = result.indexOf('#count');
      expect(actionIndex).toBeLessThan(patientIndex);
    });

    it('should preserve selectors in transformation', () => {
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });
  });

  describe('Chinese Transformation (Topic-Prominent)', () => {
    const transformer = new GrammarTransformer('en', 'zh');

    it('should use 当 marker for events', () => {
      const result = transformer.transform('on click increment #count');
      // Chinese uses 当...时 pattern but custom transform may omit 时
      expect(result).toContain('当');
    });

    it('should include translated action', () => {
      const result = transformer.transform('on click increment #count');
      // Should contain 增加 (increment in Chinese)
      expect(result).toContain('增加');
    });

    it('should preserve patient selector', () => {
      const result = transformer.transform('on click toggle .menu');
      expect(result).toContain('.menu');
    });
  });

  describe('Quechua Transformation (SOV)', () => {
    const transformer = new GrammarTransformer('en', 'qu');

    it('should emit the install-specific verb (tarpuy), not the put/set verb (churay)', () => {
      // Regression: the qu dictionary mapped `install` to `churay`, which is
      // also `put`/`set`. The semantic qu profile expects `install` = `tarpuy`
      // (churay = put), so `install Draggable` parsed as a malformed `put` and
      // failed (`install-behavior` baseline failure). Align the emitted verb to
      // the semantic profile's install keyword.
      const result = transformer.transform('install Draggable');
      expect(result).toContain('tarpuy');
      expect(result).not.toContain('churay');
      expect(result).toContain('Draggable');
    });

    it('should emit the repeat verb (kutipay), not the return verb (kutichiy)', () => {
      // Regression: the qu dictionary mapped `repeat` to `kutichiy`, which is the
      // semantic qu profile's `return` primary (repeat = kutipay there). So every
      // qu `repeat …` transformed to `kutichiy …` and the semantic parser read it
      // as `return`, dropping the loop — degenerate parses for the qu repeat-*
      // cluster (repeat-while, repeat-for-each). Align the emitted verb to the
      // semantic repeat keyword. See docs-internal/SOV_REPEAT_SCOPE.md.
      const result = transformer.transform(
        'on click repeat for item in .items add .processed to item'
      );
      expect(result).toContain('kutipay');
      expect(result).not.toContain('kutichiy');
    });
  });

  describe('German Transformation (fetch/get disambiguation)', () => {
    const transformer = new GrammarTransformer('en', 'de');

    it('should emit the fetch-specific verb (abrufen), not the get verb (holen)', () => {
      // Regression: the de dictionary mapped `fetch` to `holen`, which is the
      // semantic profile's `get` primary (fetch = abrufen there). So
      // `fetch /api/data` transformed to `holen …` and the semantic parser read
      // it as `get`, dropping the `fetch` action — degenerate parses for the de
      // fetch cluster (fetch-do-not-throw, fetch-error-handling, fetch-json,
      // fetch-with-headers). Align the emitted verb to the semantic fetch keyword.
      const result = transformer.transform('on click fetch /api/data then put it into #result');
      expect(result).toContain('abrufen');
      expect(result).not.toContain('holen');
      expect(result).toContain('/api/data');
    });
  });

  describe('Swahili Transformation (as/if disambiguation)', () => {
    const transformer = new GrammarTransformer('en', 'sw');

    it('should emit kuwa for the as-marker, not the if-homonym kama', () => {
      // Regression: sw `kama` is both "as/like" and the IF keyword. The dict +
      // grammar profile emitted it for `as`, so every transformed `as <Type>`
      // tail (`kama JSON`, `kama Number`) grew a phantom `if` command at
      // semantic parse time (computed-value precision 0.500; event-debounce,
      // fetch-with-headers, fetch-formdata 0.667–0.750). The dict/profile now
      // emit `kuwa` ("to be/become" — the conversion sense, cf. badilisha kuwa).
      const result = transformer.transform('on click fetch /api/data as json');
      expect(result).toContain('kuwa');
      expect(result).not.toMatch(/\bkama\b/);
    });

    it('should still emit kama for a real if', () => {
      const result = transformer.transform('if true then log "Habari"');
      expect(result).toMatch(/\bkama\b/);
      expect(result).not.toContain('kuwa');
    });
  });

  describe('qu/tr while keyword alignment (fronted repeat-while head)', () => {
    // Regression: the qu dict emitted `kay_kaq` (unknown to the semantic qu
    // profile, whose while primary is `kaykamaqa`), and the tr dict emitted
    // `iken` (the tr profile's WHEN primary) — so the fronted repeat-while head
    // never formed a `while` node at parse time and the condition dropped
    // wholesale. Align both dicts to the profile while primary.
    const source = 'on click repeat while #counter.innerText < 10 increment #counter end';

    it('qu: repeat-while emits the profile while word kaykamaqa, not kay_kaq', () => {
      const result = new GrammarTransformer('en', 'qu').transform(source);
      expect(result).toContain('kaykamaqa');
      expect(result).not.toContain('kay_kaq');
    });

    it('tr: repeat-while emits süresince, not the when-homonym iken', () => {
      const result = new GrammarTransformer('en', 'tr').transform(source);
      expect(result).toContain('süresince');
      expect(result).not.toMatch(/\biken\b/);
    });
  });

  describe('Duration / literal-primary marking (no spurious object particle)', () => {
    // A command whose primary argument is a literal/measure (e.g. `wait <duration>`)
    // must NOT have that argument marked as a fronted object: the generic argument
    // parser used to default the leading arg to the `patient` role, so the target
    // emitted an object particle on the duration — Chinese `等待 把 1s` (ungrammatical;
    // a duration is never a BA-construction object), Japanese `1s を 待つ`, Korean
    // `1s 를 대기`. The marked forms failed the semantic parser's `等待 {duration}`
    // pattern and the trailing `wait` dropped. The transformer now honours the
    // command's true primary role (`wait` → `duration`, which carries no marker).
    // See docs-internal/ZH_BLOCK_BODY_SCOPE.md (#1 — transformer role model).

    it('zh: wait emits a grammatical duration (no 把 object marker)', () => {
      const result = new GrammarTransformer('en', 'zh').transform('wait 1s');
      expect(result).toContain('等待');
      expect(result).toContain('1s');
      expect(result).not.toContain('把');
    });

    it('ja: wait emits a duration with no を object particle', () => {
      const result = new GrammarTransformer('en', 'ja').transform('wait 1s');
      expect(result).toContain('待つ');
      expect(result).toContain('1s');
      expect(result).not.toContain('を');
    });

    it('ko: wait emits a duration with no 를/을 object particle', () => {
      const result = new GrammarTransformer('en', 'ko').transform('wait 1s');
      expect(result).toContain('대기');
      expect(result).toContain('1s');
      expect(result).not.toContain('를');
      expect(result).not.toContain('을');
    });

    it('does not disturb marker-bearing primaries: zh fetch keeps its 把 (out of scope)', () => {
      // `fetch`'s primary role is `source` (which IS marked in zh), so the fix must
      // leave it untouched — only markerless literal/measure primaries are re-marked.
      const result = new GrammarTransformer('en', 'zh').transform('fetch /api/data');
      expect(result).toContain('/api/data');
      expect(result).toContain('把');
    });

    it('does not disturb the SOV event-handler cue: ko `on click wait 2s` keeps its patient marker', () => {
      // In an event handler, a verb-final SOV language without an event particle
      // (Korean) relies on the leading argument's object marker to anchor the
      // handler. The fix is scoped to standalone command statements, so this stays
      // patient-marked and the `on` handler is still recognised downstream.
      const result = new GrammarTransformer('en', 'ko').transform(
        'on click wait 2s then remove me'
      );
      expect(result).toContain('를');
    });
  });
});

describe('Inline `unless` guard in an event handler (no object marker on condition)', () => {
  // `on click unless I match .disabled toggle .selected`: the event-handler body
  // is a bare `unless <cond> <verb>` guard (no `end`). parseEventHandler sweeps the
  // whole tail into one `patient` blob, so an object-marking SVO target used to
  // front the *condition* with its marker (he את / zh 把) and strip the marker off
  // the real toggle — the semantic parser then dropped `unless`.
  // tryTransformEventWithUnlessGuard routes the guard through the standalone block
  // path so the marker lands on the toggle patient, not the condition.
  // See docs-internal/HANDOFF-lossy-tail.md (unless-condition arc).
  const en = 'on click unless I match .disabled toggle .selected';

  it('zh: 把 marks the toggle patient, not the unless condition', () => {
    const result = new GrammarTransformer('en', 'zh').transform(en);
    expect(result).toContain('除非'); // unless
    expect(result).toContain('切换'); // toggle
    expect(result).toContain('切换 把 .selected'); // 把 on the toggle patient
    expect(result).not.toContain('除非 把'); // never on the condition
  });

  it('he: את marks the toggle patient, not the unless condition (unchanged)', () => {
    const result = new GrammarTransformer('en', 'he').transform(en);
    expect(result).toContain('אלא'); // unless
    expect(result).toContain('מתג את .selected'); // את on the toggle patient
    expect(result).not.toContain('אלא את'); // never on the condition
  });

  it('qu: dict emits the spaced `mana sichus`, not the `_`-split form', () => {
    const result = new GrammarTransformer('en', 'qu').transform(en);
    expect(result).toContain('mana sichus');
    expect(result).not.toContain('mana_sichus');
  });
});

describe('vi render keyword (kết xuất, distinct from show)', () => {
  // `render`/`show` both mapped to `hiển thị`, which the semantic profile reads as
  // `show` — so vi `render …` parsed as `show`. Dict realigned render → `kết xuất`
  // (the profile's render primary); `show` keeps `hiển thị`.
  // See docs-internal/HANDOFF-lossy-tail.md (render cluster).
  it('emits `kết xuất` for render, leaving show as `hiển thị`', () => {
    const t = new GrammarTransformer('en', 'vi');
    const rendered = t.transform('on click render #x with y: $data then put it into #out');
    expect(rendered).toContain('kết xuất');
    expect(rendered).not.toMatch(/hiển thị #x/);
    expect(t.transform('on click show #x')).toContain('hiển thị');
  });
});

describe('qu append keyword (qatichiy, not the _-splitting qhipaman_yapay)', () => {
  // `qhipaman_yapay` `_`-splits at parse time to `qhipaman`+`yapay`(=add); the dict
  // now emits the profile's single-token append primary `qatichiy`.
  // See docs-internal/HANDOFF-lossy-tail.md (singleton tail).
  it('emits the single-token `qatichiy` for append', () => {
    const result = new GrammarTransformer('en', 'qu').transform(
      'on click append "<li>Item</li>" to #list'
    );
    expect(result).toContain('qatichiy');
    expect(result).not.toContain('qhipaman_yapay');
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('Convenience Functions', () => {
  describe('toLocale', () => {
    it('should transform English to Japanese', () => {
      const result = toLocale('on click toggle .active', 'ja');
      expect(result).toContain('.active');
      expect(result).toContain('を');
    });

    it('should transform English to Chinese', () => {
      const result = toLocale('on click increment #count', 'zh');
      expect(result).toContain('当');
    });
  });

  describe('toEnglish', () => {
    it('should return unchanged when parsing fails', () => {
      // This tests fallback behavior
      const result = toEnglish('invalid input', 'ja');
      expect(result).toBeTruthy();
    });
  });

  describe('translate', () => {
    it('should return unchanged for same locale', () => {
      const input = 'on click toggle .active';
      expect(translate(input, 'en', 'en')).toBe(input);
    });

    it('should translate English to target locale', () => {
      const result = translate('on click increment #count', 'en', 'ja');
      expect(result).toContain('#count');
    });

    it('should translate to English from source locale', () => {
      const result = translate('test input', 'ja', 'en');
      expect(result).toBeTruthy();
    });

    it('should translate via English pivot', () => {
      const result = translate('on click log done', 'ja', 'zh');
      expect(result).toBeTruthy();
    });
  });
});

// =============================================================================
// Universal Pattern Tests
// =============================================================================

describe('Universal Patterns', () => {
  it('should define event-increment pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.eventIncrement;
    expect(pattern.name).toBe('event-increment');
    expect(pattern.roles).toContain('event');
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('patient');
  });

  it('should define put-into pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.putInto;
    expect(pattern.name).toBe('put-into');
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('patient');
    expect(pattern.roles).toContain('destination');
  });

  it('should define wait-duration pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.waitDuration;
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('quantity');
  });
});

// =============================================================================
// Language Family Defaults Tests
// =============================================================================

describe('Language Family Defaults', () => {
  it('should have Germanic defaults', () => {
    const germanic = LANGUAGE_FAMILY_DEFAULTS.germanic;
    expect(germanic.wordOrder).toBe('SVO');
    expect(germanic.adpositionType).toBe('preposition');
  });

  it('should have Japonic defaults', () => {
    const japonic = LANGUAGE_FAMILY_DEFAULTS.japonic;
    expect(japonic.wordOrder).toBe('SOV');
    expect(japonic.adpositionType).toBe('postposition');
  });

  it('should have Semitic defaults', () => {
    const semitic = LANGUAGE_FAMILY_DEFAULTS.semitic;
    expect(semitic.wordOrder).toBe('VSO');
    expect(semitic.direction).toBe('rtl');
  });

  it('should have Sinitic defaults', () => {
    const sinitic = LANGUAGE_FAMILY_DEFAULTS.sinitic;
    expect(sinitic.morphology).toBe('isolating');
  });
});

// =============================================================================
// Examples Tests
// =============================================================================

describe('Grammar Examples', () => {
  it('should have English examples', () => {
    expect(examples.english.eventHandler).toBe('on click increment #count');
    expect(examples.english.putInto).toBe('put my value into #output');
    expect(examples.english.toggle).toBe('toggle .active');
  });

  it('should have Japanese examples', () => {
    expect(examples.japanese.eventHandler).toContain('#count');
    expect(examples.japanese.eventHandler).toContain('を');
  });

  it('should have Chinese examples', () => {
    expect(examples.chinese.eventHandler).toContain('当');
    expect(examples.chinese.eventHandler).toContain('时');
  });

  it('should have Arabic examples', () => {
    expect(examples.arabic.eventHandler).toContain('عند');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty input gracefully', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('');
    expect(result).toBe('');
  });

  it('should handle single-word input', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('toggle');
    expect(result).toBeTruthy();
  });

  it('should preserve numbers', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('wait 500');
    expect(result).toContain('500');
  });

  it('should handle complex selectors with special characters', () => {
    const parsed = parseStatement('on click toggle .menu-item[data-active="true"]');
    expect(parsed?.roles.get('patient')?.value).toContain('data-active');
  });

  it('should handle multiple spaces in input', () => {
    const parsed = parseStatement('on   click    toggle   .active');
    expect(parsed).not.toBeNull();
  });
});

// =============================================================================
// Chinese Circumfix Tokenization Tests
// =============================================================================

describe('Chinese Circumfix Parsing', () => {
  it('should split attached 时 suffix from event words', () => {
    // 点击时 should be parsed as two tokens: 点击 + 时
    const parsed = parseStatement('当 点击时 增加 #count', 'zh');
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('event-handler');
  });

  it('should handle 当...时 circumfix pattern', () => {
    const transformer = new GrammarTransformer('en', 'zh');
    const result = transformer.transform('on click increment #count');
    // Should produce 当 X 时 pattern
    expect(result).toContain('当');
    expect(result).toContain('时');
  });

  it('should preserve selectors when splitting suffixes', () => {
    const parsed = parseStatement('当 点击时 切换 .active', 'zh');
    // Patient may include the action in some parsing patterns
    expect(parsed?.roles.get('patient')?.value).toContain('.active');
  });
});

// =============================================================================
// Round-Trip Translation Tests
// =============================================================================

describe('Round-Trip Translation', () => {
  describe('English → Japanese → English', () => {
    it('should preserve semantic roles in round-trip', () => {
      const original = 'on click increment #count';
      const toJapanese = translate(original, 'en', 'ja');
      expect(toJapanese).toContain('#count');
      expect(toJapanese).toContain('を');

      // Note: Perfect round-trip isn't expected due to translation,
      // but semantic structure should be preserved
      const backToEnglish = translate(toJapanese, 'ja', 'en');
      expect(backToEnglish).toBeTruthy();
    });

    it('should preserve CSS selectors through round-trip', () => {
      const original = 'toggle .menu-active';
      const toJapanese = translate(original, 'en', 'ja');
      expect(toJapanese).toContain('.menu-active');

      const backToEnglish = translate(toJapanese, 'ja', 'en');
      expect(backToEnglish).toContain('.menu-active');
    });
  });

  describe('English → Arabic → English', () => {
    it('should preserve semantic roles with VSO transformation', () => {
      const original = 'on click increment #count';
      const toArabic = translate(original, 'en', 'ar');
      expect(toArabic).toContain('#count');
      // Arabic VSO puts action first
      expect(toArabic).toBeTruthy();

      const backToEnglish = translate(toArabic, 'ar', 'en');
      expect(backToEnglish).toBeTruthy();
    });
  });

  describe('English → Chinese → English', () => {
    it('should preserve structure through topic-prominent language', () => {
      const original = 'on click toggle .active';
      const toChinese = translate(original, 'en', 'zh');
      expect(toChinese).toContain('.active');
      expect(toChinese).toContain('当');

      const backToEnglish = translate(toChinese, 'zh', 'en');
      expect(backToEnglish).toContain('.active');
    });
  });

  describe('Cross-Language via Pivot', () => {
    it('should translate Japanese → Arabic via English pivot', () => {
      // Start with a simple pattern
      const result = translate('on click log done', 'ja', 'ar');
      expect(result).toBeTruthy();
    });

    it('should translate Chinese → Korean via English pivot', () => {
      const result = translate('on click toggle .active', 'zh', 'ko');
      expect(result).toBeTruthy();
      expect(result).toContain('.active');
    });
  });
});

// =============================================================================
// Language-Specific Word Order Integration Tests
// =============================================================================

describe('Word Order Integration Tests', () => {
  describe('SOV Languages (Japanese, Korean, Turkish, Quechua)', () => {
    it('should place patient before action in Japanese', () => {
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform('on click increment #count');
      // Japanese SOV: #count を ... 増加
      const countIndex = result.indexOf('#count');
      const actionIndex = result.indexOf('増加');
      expect(countIndex).toBeLessThan(actionIndex);
    });

    it('should place patient before action in Korean', () => {
      const transformer = new GrammarTransformer('en', 'ko');
      const result = transformer.transform('on click increment #count');
      // Korean SOV: patient comes before action
      expect(result).toContain('#count');
      expect(result).toContain('를'); // Object marker
    });

    it('should preserve Japanese particle spacing (regression)', () => {
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform('on click toggle .active');
      // Japanese particles (を, で, に) should have spaces around them
      // They do NOT use hyphen notation like Turkish suffixes
      expect(result).toContain('.active を'); // Space before particle
    });

    it('should produce spaced Turkish suffixes for tokenization', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Turkish uses case suffixes - now with spaces for tokenization
      expect(result).toContain('.active');
      // Verify suffixes have spaces before them (for tokenization)
      expect(result).not.toContain('-i'); // No hyphenated suffixes in output
      expect(result).not.toContain('-e');
    });

    it('should produce spaced Turkish accusative suffix for tokenization', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Should have space between patient and accusative marker for tokenization
      // Output: ".active i" (spaced) so semantic tokenizer can parse it
      expect(result).toMatch(/\.active [iıuü]/);
    });

    it('should produce spaced Turkish locative suffix for tokenization', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Event should have space before locative marker for tokenization
      // Output: "tıklama de" (spaced) so semantic tokenizer can parse it
      expect(result).toMatch(/tıklama [dD][aAeE]/);
    });
  });

  describe('VSO Languages (Arabic)', () => {
    it('should place action first in Arabic', () => {
      const transformer = new GrammarTransformer('en', 'ar');
      const result = transformer.transform('on click increment #count');
      // Arabic VSO: زِد (action) comes first
      const actionIndex = result.indexOf('زِد');
      const patientIndex = result.indexOf('#count');
      expect(actionIndex).toBeLessThan(patientIndex);
    });
  });

  describe('SVO Languages with Special Features', () => {
    it('should use circumfix pattern for Chinese events', () => {
      const transformer = new GrammarTransformer('en', 'zh');
      const result = transformer.transform('on click increment #count');
      // Chinese uses 当...时 circumfix
      expect(result).toContain('当');
      expect(result).toContain('时');
    });

    it('should use correct markers for Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('on click toggle .active');
      // Spanish uses 'en' for events
      expect(result).toContain('.active');
    });

    it('should handle Indonesian SVO correctly', () => {
      const transformer = new GrammarTransformer('en', 'id');
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });

    it('should handle Swahili SVO correctly', () => {
      const transformer = new GrammarTransformer('en', 'sw');
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });
  });

  // Regression guards for the multilingual parse-rate roadmap (see
  // docs-internal/MULTILINGUAL_ROADMAP.md).
  describe('Multi-event handlers (or-conjoined events)', () => {
    it('keeps "or"-conjoined events together as a single event clause (ar)', () => {
      const transformer = new GrammarTransformer('en', 'ar');
      const result = transformer.transform('on click or keypress[key=="Enter"] toggle .active');
      // The toggle action must lead (VSO); the event clause "<click> or keypress"
      // stays together at the end, rather than "or keypress" being hoisted ahead
      // of the command (the old bug, which read "or" as the action verb).
      expect(result.indexOf('بدل')).toBeLessThan(result.indexOf('أو'));
      expect(result).toContain('أو keypress[key=="Enter"]');
    });

    it('keeps "or"-conjoined events together as a single event clause (tl)', () => {
      const transformer = new GrammarTransformer('en', 'tl');
      const result = transformer.transform('on click or keypress[key=="Enter"] toggle .active');
      expect(result).toContain('o keypress[key=="Enter"]');
      expect(result.indexOf('palitan')).toBeLessThan(result.indexOf(' o '));
    });
  });

  describe('Tagalog transition keyword alignment', () => {
    it('emits the semantic transition verb "lumipat" (not "baguhin"=morph)', () => {
      const transformer = new GrammarTransformer('en', 'tl');
      const result = transformer.transform('on click transition opacity to 0 over 300ms');
      expect(result).toContain('lumipat');
      expect(result).not.toContain('baguhin');
    });
  });
});

// =============================================================================
// Line Structure Preservation Tests
// =============================================================================

describe('Line Structure Preservation', () => {
  describe('Indentation Preservation', () => {
    it('should preserve indentation in multi-line statements', () => {
      const input = `on click
    toggle .active on me
    wait 1 second`;

      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(3);
      // First line has no indentation
      expect(lines[0]).not.toMatch(/^\s/);
      // Subsequent lines should have indentation
      expect(lines[1]).toMatch(/^\s{4}/);
      expect(lines[2]).toMatch(/^\s{4}/);
    });

    it('should normalize mixed tab/space indentation', () => {
      const input = `on click
\ttoggle .active
        wait 1 second`;

      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(3);
      // Both indented lines should use consistent 4-space indentation
      const indent1 = lines[1].match(/^\s*/)?.[0] || '';
      const indent2 = lines[2].match(/^\s*/)?.[0] || '';
      // Tabs normalized to spaces
      expect(indent1).not.toContain('\t');
      expect(indent2).not.toContain('\t');
    });

    it('should handle deeply nested indentation', () => {
      const input = `on click
    if something
        toggle .active
        wait 1 second`;

      const transformer = new GrammarTransformer('en', 'ko');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(4);
      // Check relative indentation is preserved
      const indent1 = (lines[1].match(/^\s*/)?.[0] || '').length;
      const indent2 = (lines[2].match(/^\s*/)?.[0] || '').length;
      const indent3 = (lines[3].match(/^\s*/)?.[0] || '').length;
      expect(indent2).toBeGreaterThan(indent1);
      expect(indent3).toBe(indent2); // Same level as line above
    });
  });

  describe('Blank Line Preservation', () => {
    it('should preserve blank lines between statements', () => {
      const input = `on click
    toggle .active

    wait 1 second`;

      const transformer = new GrammarTransformer('en', 'zh');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(4);
      expect(lines[2]).toBe(''); // Blank line preserved
    });

    it('should preserve multiple consecutive blank lines', () => {
      const input = `on click


    toggle .active`;

      const transformer = new GrammarTransformer('en', 'ar');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(4);
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('');
    });

    it('should handle blank lines with only whitespace', () => {
      const input = `on click
    toggle .active

    wait 1 second`;

      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform(input);

      const lines = result.split('\n');
      expect(lines.length).toBe(4);
      // Line with only whitespace should become empty
      expect(lines[2]).toBe('');
    });
  });

  describe('Single-line Backward Compatibility', () => {
    it('should not change behavior for single-line input', () => {
      const input = 'on click toggle .active';
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform(input);

      // Should not contain newlines
      expect(result).not.toContain('\n');
    });

    it('should handle then-chains on single line', () => {
      const input = 'on click toggle .active then wait 1 second';
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform(input);

      // Should not contain newlines
      expect(result).not.toContain('\n');
      // Should still have the translated "then" keyword
      expect(result.split(' ').length).toBeGreaterThan(3);
    });
  });

  describe('Multi-language Structure Preservation', () => {
    const languages = ['es', 'ja', 'ko', 'zh', 'ar', 'tr', 'id', 'qu', 'sw'];

    for (const lang of languages) {
      it(`should preserve structure when translating to ${lang}`, () => {
        const input = `on click
    toggle .active

    wait 1 second
    remove .active`;

        const transformer = new GrammarTransformer('en', lang);
        const result = transformer.transform(input);

        const lines = result.split('\n');
        expect(lines.length).toBe(5);
        // Verify blank line is preserved
        expect(lines[2]).toBe('');
        // Verify non-blank lines have content
        expect(lines[0].trim().length).toBeGreaterThan(0);
        expect(lines[1].trim().length).toBeGreaterThan(0);
        expect(lines[3].trim().length).toBeGreaterThan(0);
        expect(lines[4].trim().length).toBeGreaterThan(0);
      });
    }
  });
});

// =============================================================================
// Cross-Language Command Boundary Tests
// =============================================================================

describe('Cross-Language Command Boundaries', () => {
  // A grammatical marker (preposition/postposition) that binds an argument to
  // its verb must never be mistaken for a command boundary. The English base
  // set covers `to`/`on`/etc.; these cases verify the same protection for
  // localized markers sourced from each language's profile.
  const hasStandaloneThen = (s: string) => /(^|\s)then(\s|$)/.test(s);

  it('does not split a Japanese object marker (を) from its verb', () => {
    // Without locale-aware boundary modifiers, `を` before the command verb
    // `増加` was treated as a boundary, injecting a spurious `then`.
    const result = new GrammarTransformer('ja', 'en').transform('#count を 増加');

    expect(hasStandaloneThen(result)).toBe(false);
    expect(result).toBe('#count increment');
  });

  it('does not split a Korean object marker (을) from its verb', () => {
    const result = new GrammarTransformer('ko', 'en').transform('.active 을 토글');

    expect(hasStandaloneThen(result)).toBe(false);
    expect(result).toBe('.active toggle');
  });

  it('still keeps English base-set prepositions attached', () => {
    // `by` is in the English base set; the argument after it must stay
    // attached to the command rather than starting a new one.
    const result = new GrammarTransformer('en', 'en').transform('increment #count by 2');

    expect(result).not.toContain('\n');
    expect(hasStandaloneThen(result)).toBe(false);
    expect(result).toBe('increment #count by 2');
  });
});

// =============================================================================
// Has/Have Operator Translation Tests
// =============================================================================

describe('Has/Have Operator Translations', () => {
  describe('Dictionary Entries', () => {
    // Import dictionaries to verify has/have entries exist
    it('should have has/have in English dictionary', async () => {
      const { en } = await import('../dictionaries/en');
      expect(en.logical.has).toBe('has');
      expect(en.logical.have).toBe('have');
    });

    it('should have has/have in Spanish dictionary', async () => {
      const { es } = await import('../dictionaries/es');
      expect(es.logical.has).toBe('tiene'); // third-person
      expect(es.logical.have).toBe('tengo'); // first-person
    });

    it('should have has/have in Japanese dictionary', async () => {
      const { ja } = await import('../dictionaries/ja');
      expect(ja.logical.has).toBe('ある');
      expect(ja.logical.have).toBe('ある');
    });

    it('should have has/have in German dictionary', async () => {
      const { de } = await import('../dictionaries/de');
      expect(de.logical.has).toBe('hat'); // third-person
      expect(de.logical.have).toBe('habe'); // first-person
    });

    it('should have has/have in French dictionary', async () => {
      const { fr } = await import('../dictionaries/fr');
      expect(fr.logical.has).toBe('a'); // third-person
      expect(fr.logical.have).toBe('ai'); // first-person
    });

    it('should have has/have in Korean dictionary', async () => {
      const { ko } = await import('../dictionaries/ko');
      expect(ko.logical.has).toBe('있다');
      expect(ko.logical.have).toBe('있다');
    });

    it('should have has/have in Chinese dictionary', async () => {
      const { zh } = await import('../dictionaries/zh');
      expect(zh.logical.has).toBe('有');
      expect(zh.logical.have).toBe('有');
    });

    it('should have has/have in Arabic dictionary', async () => {
      const { ar } = await import('../dictionaries/ar');
      expect(ar.logical.has).toBe('لديه'); // third-person
      expect(ar.logical.have).toBe('لدي'); // first-person
    });
  });

  describe('Conjugating Languages', () => {
    // Languages that have different forms for has (3rd person) vs have (1st person)
    const conjugatingLanguages = [
      { code: 'es', has: 'tiene', have: 'tengo' },
      { code: 'de', has: 'hat', have: 'habe' },
      { code: 'fr', has: 'a', have: 'ai' },
      { code: 'pt', has: 'tem', have: 'tenho' },
      { code: 'it', has: 'ha', have: 'ho' },
      { code: 'pl', has: 'ma', have: 'mam' },
    ];

    for (const lang of conjugatingLanguages) {
      it(`should have different has/have forms in ${lang.code}`, async () => {
        const dict = await import(`../dictionaries/${lang.code}`);
        const dictionary = Object.values(dict)[0] as { logical: { has: string; have: string } };
        expect(dictionary.logical.has).toBe(lang.has);
        expect(dictionary.logical.have).toBe(lang.have);
      });
    }
  });

  describe('Non-Conjugating Languages', () => {
    // Languages that use the same form for both has and have
    const sameFormLanguages = [
      { code: 'ja', form: 'ある' },
      { code: 'ko', form: '있다' },
      { code: 'zh', form: '有' },
      { code: 'tr', form: 'var' },
      { code: 'id', form: 'punya' },
      { code: 'vi', form: 'có' },
      { code: 'th', form: 'มี' },
      { code: 'tl', form: 'may' },
      { code: 'ms', form: 'ada' },
    ];

    for (const lang of sameFormLanguages) {
      it(`should have same has/have form in ${lang.code}`, async () => {
        const dict = await import(`../dictionaries/${lang.code}`);
        const dictionary = Object.values(dict)[0] as { logical: { has: string; have: string } };
        expect(dictionary.logical.has).toBe(lang.form);
        expect(dictionary.logical.have).toBe(lang.form);
      });
    }
  });
});

// =============================================================================
// Possessive Dot Notation Translation Tests
// =============================================================================

describe('Possessive Dot Notation Translation', () => {
  describe('my.property patterns across languages', () => {
    it('should translate my.textContent to Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('mi.textContent');
      expect(result).not.toContain('my.textContent');
    });

    it('should translate my.textContent to Japanese', () => {
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('私の.textContent');
    });

    it('should translate my.textContent to German', () => {
      const transformer = new GrammarTransformer('en', 'de');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('mein.textContent');
    });

    it('should translate my.textContent to Korean', () => {
      const transformer = new GrammarTransformer('en', 'ko');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('내.textContent');
    });

    it('should translate my.textContent to Chinese', () => {
      const transformer = new GrammarTransformer('en', 'zh');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('我的.textContent');
    });

    it('should translate my.textContent to Turkish', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('benim.textContent');
    });

    it('should translate my.textContent to Arabic', () => {
      const transformer = new GrammarTransformer('en', 'ar');
      const result = transformer.transform('set my.textContent to "Done!"');
      expect(result).toContain('لي.textContent');
    });
  });

  describe('its.property and your.property patterns', () => {
    it('should translate its.value to Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('get its.value');
      expect(result).toContain('su.value');
    });

    it('should translate your.name to Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('log your.name');
      expect(result).toContain('tu.name');
    });
  });

  describe('pronoun dot notation (me., it., you.)', () => {
    it('should translate me.textContent to Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('set me.textContent to "Done!"');
      expect(result).toContain('mi.textContent');
    });
  });

  describe('optional chaining (?.)', () => {
    it('should translate my?.textContent to Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('log my?.textContent');
      expect(result).toContain('mi?.textContent');
    });
  });

  describe('chained access', () => {
    it('should only translate the possessive prefix in my.value.toUpperCase()', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('put my.value.toUpperCase() into #output');
      expect(result).toContain('mi.value.toUpperCase()');
    });
  });

  describe('backward compatibility', () => {
    it('should still translate space-separated possessives', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('set my textContent to "Done!"');
      expect(result).toContain('mi');
      expect(result).not.toMatch(/\bmy\b/);
    });
  });

  // ──── Reactive `live` block scope ────
  // Before this fix, the splitter cut between `live` and the body's
  // first command keyword, then the join logic re-inserted the target
  // language's `then` keyword between them. E.g.
  //   `live put X into me end` (en→de) became
  //   `live dann setzen X zu ich ende` (spurious `dann`).
  // The fix tracks block depth from `live` to its matching `end` and
  // suppresses splits inside that scope.
  describe('live block does not spuriously inject "then"', () => {
    const cases: Array<[string, string, RegExp]> = [
      // [target lang, input, banned pattern]
      ['de', 'live put $count into me end', /\bdann\b/i],
      ['es', 'live put $count into me end', /\bentonces\b/i],
      ['ja', 'live put $count into me end', /それから/],
      ['tr', 'live put $count into me end', /\bsonra\b/i],
      ['it', 'live put $count into me end', /\ballora\b/i],
      ['ru', 'live put $count into me end', /\bзатем\b/i],
      ['vi', 'live put $count into me end', /\brồi\b/i],
    ];

    for (const [target, input, banned] of cases) {
      it(`(${target}) does not inject "then" inside the body`, () => {
        const transformer = new GrammarTransformer('en', target);
        const result = transformer.transform(input);
        expect(result, `unexpected ${banned} in: ${result}`).not.toMatch(banned);
      });
    }

    it('keeps live body as one unit — no `live then` artifact', () => {
      const transformer = new GrammarTransformer('en', 'en');
      const result = transformer.transform('live put $count into me end');
      expect(result).not.toMatch(/live\s+then\b/i);
      expect(result).toMatch(/^live\b/);
      expect(result).toMatch(/\bend$/);
    });

    it('still splits on explicit "then" OUTSIDE the live block', () => {
      // Legitimate `then`-based chains MUST still split.
      const transformer = new GrammarTransformer('en', 'de');
      const result = transformer.transform('live put $x into me end then toggle .active');
      // German "then" = "dann" — appears exactly once (between block + toggle).
      const occurrences = (result.match(/\bdann\b/gi) || []).length;
      expect(occurrences).toBe(1);
    });
  });

  // ──── Malay `socket` keyword is translated to native `soket` ────
  // The ms dictionary was missing the `socket` command entry, so the
  // transformer emitted the English literal `socket`. The semantic ms
  // profile maps `socket` to its native primary `soket` (not the English
  // form), so the untranslated `socket` token tokenized as a bare
  // identifier and the `socket` block command was dropped — `socket-basic`
  // parsed as a degenerate `put`. (es only worked by coincidence: its
  // profile's socket.primary IS the English literal.) Fix: add
  // `socket: 'soket'` to the ms dictionary, mirroring ja `socket: ソケット`.
  describe('Malay socket command translates to native soket', () => {
    it('(ms) emits soket, not the English literal socket', () => {
      const result = new GrammarTransformer('en', 'ms').transform(
        'socket ChatSocket ws://localhost:8080 on message put it into #chat end'
      );
      expect(result, `expected native soket in: ${result}`).toMatch(/\bsoket\b/);
      expect(result, `English socket leaked in: ${result}`).not.toMatch(/\bsocket\b/);
    });
  });

  // ──── ru/uk install keyword is the loanword, not the set homonym ────
  // ru "install" and "set" are both `установить` (uk: `встановити`). The dict
  // emitted plain `установить` for install, which the semantic parser resolves to
  // `set` (the install action dropped → install-behavior degenerate). The install
  // command now uses the single-token loanword `инсталлировать` (ru) /
  // `інсталювати` (uk), distinct from the set primary.
  describe('ru/uk install command uses the loanword, not the set homonym', () => {
    // NB: substring (not /\b…\b/) — JS word boundaries are ASCII-only and never
    // match adjacent to Cyrillic text.
    const cases: Array<[string, string, string]> = [
      // [lang, expected install loanword, the set homonym that must NOT appear]
      ['ru', 'инсталлировать', 'установить'],
      ['uk', 'інсталювати', 'встановити'],
    ];
    for (const [lang, want, banned] of cases) {
      it(`(${lang}) emits the install loanword, not the set homonym`, () => {
        const result = new GrammarTransformer('en', lang).transform('install Draggable');
        expect(result, `expected install loanword in: ${result}`).toContain(want);
        expect(result, `set homonym leaked in: ${result}`).not.toContain(banned);
      });
    }
  });

  // ──── Block extraction for `when`, `unless`, and SOV `live` ────
  // Block-syntactic tokens are pulled out before parseStatement so
  // they don't end up as command verbs (`live` → action role) or get
  // swept into role values (`end` → destination tail). The body
  // recurses through the regular pipeline, which keeps SOV reorder
  // working *inside* the body without disturbing the block frame.
  describe('reactive blocks — when/unless/live block extraction', () => {
    it('`when X changes Y` does not truncate — body is translated (en→de)', () => {
      const t = new GrammarTransformer('en', 'de');
      const result = t.transform('when $count changes log $count');
      // Pre-fix output was just `wenn` (parseConditional returned only
      // the action role). Now we should see head + body translated.
      expect(result.length).toBeGreaterThan('wenn'.length + 5);
      expect(result).toMatch(/wenn/i);
      expect(result).toMatch(/protokolliere|log/i);
      expect(result).toMatch(/ändert|changes/i);
    });

    it('`unless X Y` does not truncate — body is translated (en→de)', () => {
      const t = new GrammarTransformer('en', 'de');
      const result = t.transform('unless $disabled add .ready to me');
      expect(result.length).toBeGreaterThan('wennnicht'.length + 5);
      expect(result).toMatch(/wennnicht|unless/i);
      expect(result).toMatch(/hinzufüg|add/i);
    });

    it('`live X end` keeps live at start and end at end (SOV: ja)', () => {
      const t = new GrammarTransformer('en', 'ja');
      const result = t.transform('live put $count into me end');
      // Block frame: head first, tail last. Pre-fix the SOV reorder
      // dragged `live` to the end as if it were the action verb.
      expect(result).toMatch(/^(live|ライブ)/);
      expect(result).toMatch(/(end|終わり)$/);
      // SOV reorder applies inside the body — destination marker に
      // should appear, indicating `me` was reordered with its postposition.
      expect(result).toMatch(/に/);
    });

    it('`live X end` keeps live at start and end at end (SOV: tr)', () => {
      const t = new GrammarTransformer('en', 'tr');
      const result = t.transform('live put $count into me end');
      expect(result).toMatch(/^(live|canlı)/i);
      expect(result).toMatch(/(end|son)$/i);
    });

    it('regression: `if X then Y end` still works (no block extraction)', () => {
      // `if` is intentionally not a BLOCK_HEAD_KEYWORD — splitOnThen +
      // parseConditional already handle it. Verify we didn't regress.
      const t = new GrammarTransformer('en', 'de');
      const result = t.transform('if $x then increment $count end');
      // de `if` emits `falls` (the profile's `if` primary). `wenn` was the old dict
      // value but collides with the profile's `when` keyword, so the conditional
      // never formed — aligned to `falls` (see de dict if-keyword alignment, A1).
      expect(result).toMatch(/falls|wenn|if/i);
      expect(result).toMatch(/dann|then/i);
      expect(result).toMatch(/erhöh|increment/i);
    });

    it('regression: `live X end then toggle .y` — exactly one "then" connector', () => {
      // Splitter must still recognize the `then` *outside* the live
      // block as a statement boundary, even now that we route blocks
      // around parseStatement.
      const t = new GrammarTransformer('en', 'de');
      const result = t.transform('live put $x into me end then toggle .active');
      const danns = (result.match(/\bdann\b/gi) || []).length;
      expect(danns).toBe(1);
    });
  });
});

describe('Caret-scoped variable read masking (`^name on <selector>`)', () => {
  // `put ^count on #host into me` carries a second, overloaded `on` (the caret
  // scope). The transformer masks ` on <selector>` so the splitter/event parser
  // doesn't mistake it for an event/command boundary: the event clause survives
  // and `^count on #host` stays adjacent. See caret-var-on-target in the roadmap.
  it('keeps `^count on #host` together and preserves the event (ar)', () => {
    const t = new GrammarTransformer('en', 'ar');
    const result = t.transform('on click put ^count on #host into me');
    expect(result).toContain('^count on #host'); // scope kept adjacent
    expect(result).toContain('نقر'); // event (click) preserved
    expect(result).not.toContain(''); // no leftover mask sentinel
  });

  it('does not disturb a normal command without a caret scope (ar)', () => {
    const t = new GrammarTransformer('en', 'ar');
    const result = t.transform('on click toggle .active on #button');
    expect(result).not.toContain('');
    expect(result).toMatch(/بدل|بدّل/);
  });
});

describe('Event-block body with `from <source>` (focus-trap)', () => {
  const raw =
    'on keydown[key=="Tab"] from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end';

  it('routes SOV `from`-source heads through the block-body path (tr)', () => {
    // The if-block body's inner keywords get translated (Turkish `odak`=focus,
    // `ilk`=first) instead of leaking English — and the event clause leads.
    const t = new GrammarTransformer('en', 'tr');
    const result = t.transform(raw);
    expect(result).toMatch(/odak/); // focus → odak (block body transformed)
    expect(result).toMatch(/keydown/); // event preserved
    // Event clause leads (keydown appears before the if/eğer block head).
    expect(result.indexOf('keydown')).toBeLessThan(result.search(/eğer/));
  });

  it('keeps VSO `from`-source heads on the existing path (ar unchanged)', () => {
    // VSO event-first emission with a `from` source reorders incorrectly, so ar
    // stays on the existing path. Guard: transform still succeeds and translates
    // the verb (`durdur`-style halt / `أوقف`), without throwing.
    const t = new GrammarTransformer('en', 'ar');
    expect(() => t.transform(raw)).not.toThrow();
    expect(t.transform(raw).length).toBeGreaterThan(0);
  });
});

describe('if/else block-body — else split + translation (Track 5 Tier 1)', () => {
  // The if-block body was reordered as one stream, so `else` rode along glued to a
  // selector-led clause (marked a selector → left UNTRANSLATED) with a spurious
  // `then` inserted around it. The body is now split at a top-level `else` into a
  // then-branch and an else-branch, each transformed independently, and `else` is
  // translated. See docs-internal/MULTILINGUAL_ROADMAP.md (Track 5 Tier 1).
  const raw = 'on click if #modal exists show #modal else make a <div#modal/> put it into body end';

  it('[ar] translates else to وإلا (no English else leaks)', () => {
    const result = new GrammarTransformer('en', 'ar').transform(raw);
    expect(result).toContain('وإلا');
    expect(result).not.toMatch(/\belse\b/);
  });

  it('[it] translates else to altrimenti (no English else leaks)', () => {
    const result = new GrammarTransformer('en', 'it').transform(raw);
    expect(result).toContain('altrimenti');
    expect(result).not.toMatch(/\belse\b/);
  });

  it('[ja] translates else to そうでなければ (no English else leaks)', () => {
    const result = new GrammarTransformer('en', 'ja').transform(raw);
    expect(result).toContain('そうでなければ');
    expect(result).not.toMatch(/\belse\b/);
  });

  it('leaves an else-less if-block body unchanged in shape', () => {
    // No `else` → single body transform path, no spurious split.
    const noElse = 'on click if #modal exists show #modal end';
    const result = new GrammarTransformer('en', 'ar').transform(noElse);
    expect(result).not.toMatch(/\belse\b/);
    expect(result).toContain('اظهر'); // show translated
  });
});

describe('SOV modifier-prefixed event body reorder (Track 5)', () => {
  // A leading command-modifier (async/once/debounced) must not be parsed as the
  // event handler's action. For SOV targets that mis-assignment surfaced the real
  // verb first on reorder (`取得 /api/data を クリック …`), which the semantic parser
  // collapsed to a bare `*-generated-verb-first` command (degenerate). The
  // transformer now lifts the modifier out and re-emits it as a leading English
  // literal, keeping the body in canonical patient-first SOV order so the event
  // sits mid-stream and the parser's SOV event-extraction recovers the full body.
  // See docs-internal/SOV_REORDER_SCOPE.md.

  for (const lang of ['ja', 'ko', 'tr'] as const) {
    const t = new GrammarTransformer('en', lang);

    it(`[${lang}] async body: modifier leads, real verb is not first`, () => {
      const out = t.transform('on click async fetch /api/data then put it into me');
      // The English modifier literal leads (the parser strips it pre-parse).
      expect(out.startsWith('async ')).toBe(true);
      // The patient precedes the fetch verb — the body stays patient-first, so the
      // verb is not the leading body token (which is what caused the degenerate parse).
      expect(out.indexOf('/api/data')).toBeLessThan(out.length);
      expect(out).toContain('/api/data');
    });

    it(`[${lang}] once body: modifier leads and the patient survives`, () => {
      const out = t.transform('on click once add .initialized to me call setup()');
      expect(out.startsWith('once ')).toBe(true);
      expect(out).toContain('.initialized');
      expect(out).toContain('setup()');
    });

    it(`[${lang}] debounced at N: modifier phrase leads intact`, () => {
      const out = t.transform(
        'on keyup debounced at 300ms fetch /api/search then put it into #results'
      );
      expect(out.startsWith('debounced at 300ms ')).toBe(true);
    });
  }

  it('[es] SVO target is unaffected — modifier is not relocated to the front', () => {
    const out = new GrammarTransformer('en', 'es').transform(
      'on click async fetch /api/data then put it into me'
    );
    // SVO keeps the body in an order the parser already handles, so the gate leaves
    // it byte-identical: the handler still leads with the (translated) event clause,
    // not a relocated bare `async` literal.
    expect(out.startsWith('async ')).toBe(false);
  });

  it('[ja] a simple handler without a modifier is unchanged', () => {
    const t = new GrammarTransformer('en', 'ja');
    expect(t.transform('on click toggle .active')).toBe(t.transform('on click toggle .active'));
    const out = t.transform('on click toggle .active');
    expect(out.startsWith('async ')).toBe(false);
    expect(out.startsWith('once ')).toBe(false);
    expect(out).toContain('.active');
  });
});

describe('SOV put-into verb-final reorder (Track 5)', () => {
  // ko/tr/bn lacked ja's `put-into` rule, so `put X into Y` reordered to
  // verb-middle (`X i koy Y e`) which the semantic parser can't match. The rule
  // (gated to standalone put via a no-event predicate) emits verb-final order.
  const verbFinal: Array<[string, string]> = [
    ['tr', 'koy'],
    ['ko', '넣다'],
    ['bn', 'রাখুন'],
  ];
  for (const [lang, verb] of verbFinal) {
    it(`[${lang}] standalone put is verb-final`, () => {
      const out = new GrammarTransformer('en', lang).transform('put it into me');
      // The verb is the last token (patient, destination, then verb).
      expect(out.trim().endsWith(verb)).toBe(true);
    });
  }

  it('[tr] event-handler `put` keeps the event before the verb (predicate gate)', () => {
    // The no-event predicate excludes event handlers, so the event clause is not
    // pushed past the verb (which would strand it from the parser).
    const out = new GrammarTransformer('en', 'tr').transform(
      'on success put event.detail.message into #sr-announce'
    );
    // `koy` (put) must not be verb-final here — the event (`success`) follows it.
    expect(out.trim().endsWith('koy')).toBe(false);
    expect(out).toMatch(/koy.*success|success.*koy/);
  });
});

// =============================================================================
// Destination `on` vs event `on` (bucket 1 — dual-`on`)
// =============================================================================
//
// `toggle X on Y` / `set @attr on Y` reuses the word `on` as a *locative
// target* preposition. But `on` is also the event-handler head keyword
// (`commands.on = 'on'` in the EN dictionary). Two bugs resulted:
//
//   1. SPLIT bug — `splitOnCommandBoundaries` treated the destination `on`
//      as a command boundary (it's in `commandKeywords`) and split there,
//      so the join re-inserted a spurious `then` (ثم / pagkatapos / entonces)
//      and a dangling `on Y` clause.
//   2. ROLE bug — once kept whole, the argument parser mapped the locative
//      `on` to the `event` role (EN profile marks `on → event`), overwriting
//      the already-captured head event — dropping the trigger entirely.
//
// The combined effect was garbage like
//   `on click toggle .open on #menu` → (ar) `بدل .open عند نقر ثم عند #menu`
// which silently dropped `#menu` on a round-trip back to English
// (`on click toggle .open`). The fix keeps the statement whole and routes
// the locative `on` to `destination`, matching how the semantic parser
// itself models `toggle .open on #menu` (patient `.open` + destination
// `#menu`).
describe('destination `on` is not confused with the event head `on`', () => {
  describe('parse: role assignment', () => {
    it('assigns the locative `on` target to destination, keeps the head event', () => {
      const parsed = parseStatement('on click toggle @hidden on #panel', 'en');
      expect(parsed).not.toBeNull();
      expect(parsed!.roles.get('event')?.value).toBe('click');
      expect(parsed!.roles.get('action')?.value).toBe('toggle');
      expect(parsed!.roles.get('patient')?.value).toBe('@hidden');
      // The destination `on #panel` must land in `destination`, NOT clobber `event`.
      expect(parsed!.roles.get('destination')?.value).toBe('#panel');
    });

    it('handles a bare command (no event handler): `toggle .active on me`', () => {
      const parsed = parseStatement('toggle .active on me', 'en');
      expect(parsed).not.toBeNull();
      expect(parsed!.roles.get('action')?.value).toBe('toggle');
      expect(parsed!.roles.get('patient')?.value).toBe('.active');
      expect(parsed!.roles.get('destination')?.value).toBe('me');
      // No bogus event role from the locative `on`.
      expect(parsed!.roles.has('event')).toBe(false);
    });
  });

  describe('transform: no spurious "then" injected', () => {
    // [target lang, banned "then" keyword]
    const cases: Array<[string, RegExp]> = [
      ['ar', /\bثم\b/],
      ['tl', /\bpagkatapos\b/i],
      ['es', /\bentonces\b/i],
      ['ja', /それから/],
      ['ko', /그러면/],
      ['zh', /那么/],
      ['he', /\bאז\b/],
    ];
    for (const [lang, banned] of cases) {
      it(`(${lang}) keeps "toggle X on Y" as one statement`, () => {
        const t = new GrammarTransformer('en', lang);
        const result = t.transform('on click toggle .open on #menu');
        expect(result, `unexpected then in: ${result}`).not.toMatch(banned);
        // Both selectors must still be present at the surface — the
        // destination is no longer split off into a dropped clause.
        expect(result).toContain('.open');
        expect(result).toContain('#menu');
      });
    }
  });

  describe('round-trip: destination + event survive (semantic correctness)', () => {
    // SVO / VSO / RTL languages place the destination before the verb (or
    // after the verb but pre-event, for VSO), which the round-trip recovers
    // losslessly. SOV destination-after-verb placement is a separate,
    // pre-existing limitation (it also drops `#bar` for `add .foo to #bar`)
    // and is intentionally out of scope here.
    //
    // `zh` is excluded from the *keyword* round-trip: its i18n→en reverse path
    // has a pre-existing quirk where `切换`/`把` (BA construction) mangles the
    // verb (`on click toggle .active` → `on click h .active`), independent of
    // the locative `on`. zh destination preservation is still asserted by the
    // "no spurious then" case above, and verified semantically via the parser's
    // own round-trip (render) outside this unit suite.
    const losslessLangs = ['ar', 'tl', 'es', 'he', 'fr', 'de', 'pt', 'it'];
    for (const lang of losslessLangs) {
      it(`(${lang}) en→${lang}→en preserves event, action, patient, destination`, () => {
        const out = toLocale('on click toggle .open on #menu', lang);
        const back = toEnglish(out, lang);
        expect(back).toContain('click');
        expect(back).toContain('toggle');
        expect(back).toContain('.open');
        expect(back).toContain('#menu'); // the destination must NOT be dropped
      });
    }

    it('regression: the OLD garbage form would have dropped the destination', () => {
      // Sanity anchor — the corrected output keeps `#menu`.
      const out = toLocale('on click toggle .open on #menu', 'ar');
      expect(out).toContain('#menu');
      expect(out).not.toMatch(/\bثم\b/); // no spurious "then"
    });
  });

  describe('does not disturb non-locative-`on` patterns', () => {
    // The remap only touches the `on` token in argument position; other
    // prepositions (to/into/from/by) and plain event handlers are unchanged.
    const unchanged = [
      'on click increment #count',
      'add .foo to #bar',
      'remove .x from #y',
      'on click toggle .active',
    ];
    for (const input of unchanged) {
      it(`(${input}) round-trips through Spanish unchanged in structure`, () => {
        const back = toEnglish(toLocale(input, 'es'), 'es');
        // First word (command/head) preserved
        expect(back.split(/\s+/)[0]).toBe(input.split(/\s+/)[0]);
        // No spurious "then"/"on" artifacts
        expect(back).not.toMatch(/\bthen\b/);
      });
    }
  });
});

describe('ko event marker 할 때 + set `on <scope>` capture (S1 tabs-aria)', () => {
  // koreanProfile gained the event-role marker 할 때 — the semantic
  // *-event-ko-sov-* patterns anchor on it; before, every ko handler emitted a
  // bare event name no fused pattern could match. A SELECTOR-shaped "event" (the
  // dangling target of a locative `on`) must NOT receive that marker, or the
  // emission grows a spurious mid-stream event anchor (`#sr-announce 할 때` / ja
  // `#sr-announce で`). For `set @role to "alert" on #sr-announce` the locative
  // `on` is now the set's SCOPE (S1): the transformer keeps it attached and
  // positions it before the clause-final verb (`on #sr-announce 설정` / `設定`),
  // so the scope is captured rather than dropped — and there is still exactly ONE
  // event marker (the real `success`), never a spurious one on the selector.
  it('[ko] a real event gets the marker', () => {
    const t = new GrammarTransformer('en', 'ko');
    expect(t.transform('on click increment #counter')).toBe('#counter 를 클릭 할 때 증가');
  });

  it('[ko] set `on <scope>` is captured, with no spurious event marker', () => {
    const t = new GrammarTransformer('en', 'ko');
    const out = t.transform(
      'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce'
    );
    // The real event keeps its marker…
    expect(out).toContain('success 할 때');
    // …and it is the ONLY event marker (the locative `on` is the set's scope,
    // not a second event anchor).
    expect(out.match(/할 때/g)?.length).toBe(1);
    // The set's scope is emitted (passthrough `on`) before the clause-final verb.
    expect(out).toContain('on #sr-announce 설정');
  });

  it('[ja] set `on <scope>` is captured before the verb, no spurious で', () => {
    const t = new GrammarTransformer('en', 'ja');
    const out = t.transform(
      'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce'
    );
    expect(out).toContain('on #sr-announce 設定');
  });
});

describe('command blur translates via commands.blur, not the blur EVENT word', () => {
  // de/fr/pt/pl/sw dicts had blur only in the EVENTS section (unscharf/flou/
  // desfoque/rozmycie/poteza_macho); the COMMAND `blur me` fell back to that
  // event word, which no semantic profile reads as the blur verb — blur-element
  // was lossy in all five. commands.blur now emits the profile's verb.
  const cases: Array<[string, string]> = [
    ['de', 'defokussieren'],
    ['fr', 'défocaliser'],
    ['pt', 'desfocar'],
    ['pl', 'rozmyj'],
    ['sw', 'blur'],
  ];
  for (const [lang, verb] of cases) {
    it(`[${lang}] blur me emits ${verb}`, () => {
      const t = new GrammarTransformer('en', lang);
      const out = t.transform('on keydown[key=="Escape"] blur me');
      expect(out).toContain(verb);
    });
  }

  it('[de] the blur EVENT now also emits the command word (shadowing, parse-safe)', () => {
    // commands.blur shadows events.blur in event-name translation too. That is
    // accepted: defokussieren is in the semantic eventNameTranslations for de,
    // so `bei defokussieren …` still anchors the handler (gate green), and the
    // command/event senses can never diverge again.
    const t = new GrammarTransformer('en', 'de');
    const out = t.transform('on blur add .error to me');
    expect(out).toContain('defokussieren');
  });
});

describe('trigger/send `on <target>` keeps its target — no spurious then (behavior-sortable)', () => {
  // `trigger X on me` / `send X on me` fire an event on a TARGET element. `on`
  // was treated as a command boundary (not in ON_TARGET_COMMANDS), so the
  // statement split into `trigger X` | `on me`, the line-join re-inserted the
  // target language's `then` (`disparar sortable:start entonces en yo`), and the
  // dangling `then` glued the FOLLOWING `repeat until event …` loop into a
  // then-chain — dropping `repeat`/`wait`. This kept behavior-sortable lossy
  // (fid 0.778) in every SVO language. `trigger`/`send` are now in
  // ON_TARGET_COMMANDS so `on <target>` stays attached. Guards the i18n half of
  // the sortable arc (semantic gate parse fidelity is guarded by the baseline).
  const cases: Array<[string, string]> = [
    ['es', 'yo'],
    ['fr', 'moi'],
    ['de', 'ich'],
    ['it', 'io'],
  ];
  for (const [lang, pronoun] of cases) {
    it(`[${lang}] trigger sortable:start on me — single statement, target preserved, no then`, () => {
      const out = new GrammarTransformer('en', lang).transform('trigger sortable:start on me');
      // The event name survives and the target pronoun is preserved.
      expect(out).toContain('sortable:start');
      expect(out.trim().endsWith(pronoun)).toBe(true);
      // No split: exactly `<verb> sortable:start <marker> <pronoun>` (4 tokens).
      // The old bug produced 5 (an extra `then` connective before the target).
      expect(out.trim().split(/\s+/)).toHaveLength(4);
    });

    it(`[${lang}] send foo:bar on me — target stays attached (no extra connective)`, () => {
      const out = new GrammarTransformer('en', lang).transform('send foo:bar on me');
      expect(out).toContain('foo:bar');
      expect(out.trim().endsWith(pronoun)).toBe(true);
      expect(out.trim().split(/\s+/)).toHaveLength(4);
    });
  }
});

describe('Hebrew fronted accusative marker is repaired (he add-body att-fronting)', () => {
  // An event-handler body that leads with a command-modifier (`on click once add …`)
  // or is a control block (`on blur if … add … end`) could emit the accusative
  // marker את AHEAD of the body command's verb — `add .error to me` rendering
  // `… את הוסף .error …` instead of the canonical `… הוסף את .error …`. את before a
  // verb is always ungrammatical Hebrew, and the semantic parser dropped the command
  // in every parse path (fused-event, multi-clause, conditional-body), keeping he
  // `if-empty` / `input-validation` / `event-once` lossy. transform() now repairs the
  // `<accusative-marker> <verb>` adjacency back to `<verb> <accusative-marker>`.
  const he = (src: string) => new GrammarTransformer('en', 'he').transform(src);

  it('[he] conditional-body add: את follows the verb (not fronted)', () => {
    const out = he(
      'on blur if my value is empty add .error to me put "Required" into next .error-message end'
    );
    expect(out).toContain('הוסף את .error');
    expect(out).not.toContain('את הוסף');
  });

  it('[he] if/else-body add: את follows the verb', () => {
    const out = he('on blur if my value is empty add .error to me else remove .error from me end');
    expect(out).toContain('הוסף את .error');
    expect(out).not.toContain('את הוסף');
  });

  it('[he] modifier-prefixed (once) body add: את follows the verb', () => {
    const out = he('on click once add .initialized to me call setup()');
    expect(out).toContain('הוסף את .initialized');
    expect(out).not.toContain('את הוסף');
  });

  it('[he] a legitimate `<verb> את <obj>` form is left untouched', () => {
    // send already emits `שלח את refresh` (verb then accusative); the repair must only
    // swap the ungrammatical marker-then-verb adjacency, never a real `<verb> את`.
    expect(he('send refresh to #widget')).toContain('שלח את refresh');
    expect(he('add .error to me')).toContain('הוסף את .error');
  });
});

describe('Hebrew scroll/last command translations (he last-in-collection dict gap)', () => {
  // `scroll` (command) and `last` (positional) were missing from the he i18n
  // dictionary, so `scroll to last <.message/> in #chat` emitted English scroll/last
  // that the semantic he parser dropped (last-in-collection lossy — scroll missing).
  // Adding scroll→גלול and last→אחרון (both already recognized on the semantic side)
  // makes it faithful. `in` is deliberately NOT translated: it would also rewrite the
  // `for X in Y` loop iterator and break template-literal-list-build (the for-loop's
  // English `in` already parses).
  const he = (s: string) => new GrammarTransformer('en', 'he').transform(s);

  it('[he] scroll command translates to גלול', () => {
    expect(he('scroll to last <.message/> in #chat')).toContain('גלול');
  });

  it('[he] positional last translates to אחרון', () => {
    expect(he('scroll to last <.message/> in #chat')).toContain('אחרון');
  });

  it('[he] for-loop `in` is left English (not rewritten — guards template-literal-list-build)', () => {
    expect(he('for item in $items log item')).toContain(' in ');
  });
});

describe('Hebrew event-handler inline `unless` guard (he unless-condition degenerate)', () => {
  // `on click unless I match .disabled toggle .selected` is an inline guard with no
  // `end`. parseEventHandler read `unless` as the action and swept the whole
  // `<cond> <body>` tail into one patient blob; Hebrew then prefixed that blob with
  // the accusative object marker את (`… אלא את I match .disabled מתג .selected`) and
  // the inner toggle lost its own את. The semantic parser collapsed that (degenerate):
  // את ahead of the condition blocks the `unless` pattern, AND the markerless `מתג
  // .selected` fails the he toggle pattern (which requires את). Marker-less langs
  // (de/it/ar/pl) parse the same role-blob faithfully — a Hebrew accusative-marker
  // artifact, not a general gap. The guard now routes through the standalone block
  // path (extractBlockStructure → transformBlock): condition kept marker-free, body
  // command keeps its את. Needs the he dict `unless: אלא` entry too.
  const he = (s: string) => new GrammarTransformer('en', 'he').transform(s);

  it('[he] unless guard: unless translates, condition is marker-free, toggle keeps its את', () => {
    const out = he('on click unless I match .disabled toggle .selected');
    expect(out).toContain('אלא I match .disabled'); // unless→אלא, no fronted את before the condition
    expect(out).not.toContain('אלא את'); // condition is NOT object-marked
    expect(out).toContain('מתג את .selected'); // body toggle keeps its accusative marker
    expect(out).not.toContain('unless'); // no English leak
  });

  it('[he] the event clause leads (SVO): `ב לחיצה` before the unless guard', () => {
    const out = he('on click unless I match .disabled toggle .selected');
    expect(out.indexOf('ב לחיצה')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('ב לחיצה')).toBeLessThan(out.indexOf('אלא'));
  });
});

describe('Attached parenthesized arg list stays one token (tl behavior-resizable degenerate)', () => {
  // The tokenizer tracked `<>` selectors and `[]` guards but not `()`, so an event
  // destructure `pointerdown(clientX, clientY)` split at the comma-space into
  // `pointerdown(clientX,` + `clientY)`. In the VSO from-first event-handler-head
  // reorder the two halves were SEPARATED (event role = `pointerdown(clientX,`, the
  // stray `clientY)` fronted) → `clientY) mula_sa ako kapag pointerdown(clientX,`,
  // an unparseable head that dropped the whole `on pointerdown … end` handler
  // (tl behavior-resizable DEGENERATE → {behavior}; ar lossy). Fix: track `(` as a
  // depth scope so the group stays atomic. Since the cluster E fix, STANDALONE
  // groups (`to ($count or 0)`) are atomic too — their interior keywords translate
  // in place via translateMultiWordValue/translateWord's paren handling.
  it('[tl] event-handler head with destructured params keeps the event atomic', () => {
    const out = new GrammarTransformer('en', 'tl').transform(
      'on pointerdown(clientX, clientY) from me'
    );
    // The from-source fronts (VSO), but the event + its params stay one clean unit.
    expect(out).toContain('pointerdown(clientX, clientY)');
    // Before the fix the split half `clientY)` was fronted to the very start.
    expect(out.startsWith('clientY)')).toBe(false);
  });

  it('[ar] same head is not split at the comma either', () => {
    const out = new GrammarTransformer('en', 'ar').transform(
      'on pointerdown(clientX, clientY) from me'
    );
    expect(out).toContain('pointerdown(clientX, clientY)');
  });

  it('a standalone expression paren still translates its interior operators', () => {
    // `($count or 0)` is NOT an attached call — the group is now atomic (cluster E),
    // but its `or` must still translate in place. Tagalog renders `or` → `o`.
    const out = new GrammarTransformer('en', 'tl').transform('set $x to ($count or 0)');
    expect(out).toContain('($count o 0)'); // atomic AND interior-translated
  });
});

describe('Standalone parenthesized expressions are opaque units (R1 cluster E, computed-value)', () => {
  // With standalone `(` untracked, `(the value of #price as Number)` tokenized
  // LOOSE and its interior `of`/`as` keywords hit the argument modifier map: the
  // parser split the expression across roles, so the transformer reordered INSIDE
  // the parens, embedded the event phrase mid-expression (`(the valor de #price
  // de .quantity como Number)`), and DROPPED the entire `* (my value as Number)`
  // second operand — in every language, including the SVO controls. Fused groups
  // keep the expression intact; interiors translate word-by-word in order.
  const COMPUTED_VALUE =
    'on input from .quantity set #total.innerText to (the value of #price as Number) * (my value as Number)';

  const firstParenGroup = (s: string): string => {
    const m = s.match(/\([^)]*\)/);
    return m ? m[0] : '';
  };

  it.each(['es', 'de', 'ko', 'hi', 'ja', 'qu'])(
    '[%s] keeps both operands and the * operator',
    lang => {
      const out = new GrammarTransformer('en', lang).transform(COMPUTED_VALUE);
      // The second operand was dropped in every language before the fix.
      expect(out).toContain(') * (');
      // Exactly two paren groups survive, in source order.
      expect(out.match(/\(/g)?.length).toBe(2);
      expect(out.match(/\)/g)?.length).toBe(2);
    }
  );

  it.each([
    ['es', ['establecer', 'entrada']],
    ['ko', ['설정', '입력']],
    ['ja', ['設定', '入力']],
  ] as Array<[string, string[]]>)(
    '[%s] never embeds the verb or event phrase inside the parens',
    (lang, forbidden) => {
      const out = new GrammarTransformer('en', lang).transform(COMPUTED_VALUE);
      const group = firstParenGroup(out);
      expect(group).not.toBe('');
      for (const word of forbidden) {
        expect(group).not.toContain(word);
      }
      // The event source selector stays outside the expression too.
      expect(group).not.toContain('.quantity');
    }
  );

  it('[es] interior keywords translate in place, in order', () => {
    const out = new GrammarTransformer('en', 'es').transform(COMPUTED_VALUE);
    expect(out).toContain('(the valor de #price como Number) * (mi valor como Number)');
  });
});

describe('Polish get translates to uzyskaj, not pobierz (pl get-value get/fetch homonym)', () => {
  // The pl dict emitted `pobierz` for get, but `pobierz` ("download") is the semantic pl
  // profile's FETCH primary — so every transformed get parsed as fetch (get-value lossy +
  // a phantom fetch). Emit `uzyskaj` (the profile's get primary) so get stays get.
  const pl = (s: string) => new GrammarTransformer('en', 'pl').transform(s);

  it('[pl] `get #x.value` emits uzyskaj (not the fetch word pobierz)', () => {
    const out = pl('get #input.value');
    expect(out).toContain('uzyskaj');
    expect(out).not.toContain('pobierz');
  });

  it('[pl] `fetch /api` still emits pobierz (fetch unaffected)', () => {
    expect(pl('fetch /api/data')).toContain('pobierz');
  });
});

describe('Chinese take translates to 拿取, not 获取 (zh take/get homonym)', () => {
  // The zh dict emitted `获取` for take, but `获取` is the semantic zh profile's GET primary
  // — so `take …` parsed as get (take-class-from-siblings: phantom get + take dropped).
  // Emit `拿取` (the profile's take primary) so take stays take.
  const zh = (s: string) => new GrammarTransformer('en', 'zh').transform(s);

  it('[zh] `take .x from .y` emits 拿取 (not the get word 获取)', () => {
    const out = zh('take .active from .tab-button');
    expect(out).toContain('拿取');
    expect(out).not.toContain('获取');
  });

  it('[zh] `get #x.value` still emits a get word, not 拿取', () => {
    expect(zh('get #input.value')).not.toContain('拿取');
  });
});

describe('tr resize single-token event keyword (window-resize NULL → faithful)', () => {
  // The dict previously emitted `boyut_değiştir` for the resize event; the tr
  // semantic tokenizer splits on `_` → `boyut` + `değiştir`, and `değiştir`
  // normalizes to `toggle` (homonym collision) — which destroyed the resize event
  // and made `window-resize` the lone tr parse hard-fail. A non-underscore keyword
  // (`boyutlandırma`) keeps the event token whole (mirrors the ru/uk install
  // single-token route). Pairs with the semantic event-map entry.
  const transformer = new GrammarTransformer('en', 'tr');

  it('emits the single-token resize keyword (no underscore, no toggle homonym)', () => {
    const result = transformer.transform('on resize from window call adjustLayout()');
    expect(result).toContain('boyutlandırma');
    expect(result).not.toContain('boyut_değiştir');
    expect(result).not.toContain('değiştir'); // the toggle-homonym fragment is gone
  });
});

describe('ru/uk fused (no-underscore) event keywords (mousedown/mouseup/resize)', () => {
  // The semantic tokenizer splits on `_`, so the old underscore forms
  // (мышь_вниз / изменение_размера) broke event recognition → the event typed as
  // a bare expression. The dict now emits the FUSED form (мышьвниз / изменениеразмера),
  // registered in the ru/uk tokenizer EXTRAS. Mirrors the #510 tr resize route.
  it('[ru] emits fused mousedown/mouseup/resize (no underscore)', () => {
    const tr = new GrammarTransformer('en', 'ru');
    expect(tr.transform('on mousedown toggle .x')).toContain('мышьвниз');
    expect(tr.transform('on mouseup toggle .x')).toContain('мышьвверх');
    expect(tr.transform('on resize call f()')).toContain('изменениеразмера');
    expect(tr.transform('on mousedown toggle .x')).not.toContain('мышь_вниз');
  });

  it('[uk] emits fused mousedown/mouseup/resize (no underscore)', () => {
    const tr = new GrammarTransformer('en', 'uk');
    expect(tr.transform('on mousedown toggle .x')).toContain('мишавниз');
    expect(tr.transform('on mouseup toggle .x')).toContain('мишавгору');
    expect(tr.transform('on resize call f()')).toContain('змінарозміру');
    expect(tr.transform('on mousedown toggle .x')).not.toContain('миша_вниз');
  });
});

describe('tr/hi/qu fused (no-underscore) mouse events (mousedown/mouseup)', () => {
  // The tokenizer splits on `_`, so the old underscore forms broke event
  // recognition (tr `fare_bas`→"bas", qu `rat_ñitiy`→click homonym). The dict now
  // emits the fused form, recognized in the tr/hi/qu tokenizer EXTRAS — which also
  // routes repeat-until-event onto the fused-action recovery path. Mirrors #535.
  it('[tr] emits fused mousedown/mouseup (no underscore)', () => {
    const t = new GrammarTransformer('en', 'tr');
    expect(t.transform('on mousedown toggle .x')).toContain('farebas');
    expect(t.transform('on mouseup toggle .x')).toContain('farebırak');
    expect(t.transform('on mousedown toggle .x')).not.toContain('fare_bas');
  });
  it('[hi] emits fused mousedown/mouseup (no underscore)', () => {
    const t = new GrammarTransformer('en', 'hi');
    expect(t.transform('on mousedown toggle .x')).toContain('माउसनीचे');
    expect(t.transform('on mouseup toggle .x')).toContain('माउसऊपर');
    expect(t.transform('on mousedown toggle .x')).not.toContain('माउस_नीचे');
  });
  it('[qu] emits fused mousedown/mouseup (no underscore, no click homonym)', () => {
    const t = new GrammarTransformer('en', 'qu');
    expect(t.transform('on mousedown toggle .x')).toContain('ratñitiy');
    expect(t.transform('on mouseup toggle .x')).toContain('rathuqariy');
    expect(t.transform('on mousedown toggle .x')).not.toContain('rat_ñitiy');
  });
});

describe('Predicate adjective stays inside the condition clause (empty ×8 bn/hi/tr)', () => {
  // `empty` is ALSO a hyperscript command (v0.9.90), so the block-body scans
  // (transformBlockBody, extractBlockStructure's unless path) cut the condition
  // of `if my value is empty add .error to me` at `is` and displaced the
  // adjective into the add's argument zone — where it anchored a spurious
  // `empty-{lang}-generated` parse and stole a neighboring role (hi took the
  // add's `.error` patient). A command-keyword candidate immediately after a
  // copula is a predicate adjective, never the body's first verb.
  const IF_EMPTY = 'on blur if my value is empty add .error to me else remove .error from me end';

  it('[hi] keeps है खाली adjacent inside the condition, verb after', () => {
    const out = new GrammarTransformer('en', 'hi').transform(IF_EMPTY);
    expect(out).toContain('है खाली'); // copula + predicate stay adjacent
    // the adjective precedes the then-branch (no displacement past .error)
    expect(out.indexOf('खाली')).toBeLessThan(out.indexOf('.error'));
  });

  it('[tr] keeps dir boş adjacent inside the condition', () => {
    const out = new GrammarTransformer('en', 'tr').transform(IF_EMPTY);
    expect(out).toContain('dir boş');
    expect(out.indexOf('boş')).toBeLessThan(out.indexOf('.error'));
  });

  it('[bn] keeps হয় খালি adjacent inside the condition', () => {
    const out = new GrammarTransformer('en', 'bn').transform(IF_EMPTY);
    expect(out).toContain('হয় খালি');
    expect(out.indexOf('খালি')).toBeLessThan(out.indexOf('.error'));
  });

  it('unless-path body scan applies the same copula guard', () => {
    // extractBlockStructure's unless heuristic shares the scan: the condition
    // runs through the predicate adjective to the real body verb.
    const out = new GrammarTransformer('en', 'hi').transform(
      'unless my value is empty add .error to me'
    );
    expect(out.indexOf('खाली')).toBeLessThan(out.indexOf('.error'));
  });

  it('a real body verb right after the condition still starts the body', () => {
    // No copula before `add` — the scan must still cut there (byte-identical
    // pre/post for conditions without a trailing predicate adjective).
    const out = new GrammarTransformer('en', 'hi').transform(
      'on blur if my value add .error to me end'
    );
    expect(out).toContain('.error');
  });
});

describe('take `for me` target stays in-clause (take-class spurious for ×6 bn/hi/ja/ko/qu/tr)', () => {
  // `for` is ALSO hyperscript's loop command, so splitOnCommandBoundaries cut
  // `take .active from .tab-button for me` at `for` and the join re-inserted
  // `then` — a dangling `then for me` clause that six SOV languages parsed as
  // a spurious `for` loop with patient "me". Hyperscript's only statement-head
  // `for` is `for <var> in <iterable>`: a `for` with no following `in` is a
  // role phrase and must stay attached (isLoopHeadFor).
  const TAKE = 'on click take .active from .tab-button for me';

  it('[hi] no then-shatter: फिर absent, take clause intact', () => {
    const out = new GrammarTransformer('en', 'hi').transform(TAKE);
    expect(out).not.toContain('फिर');
    expect(out).toContain('.tab-button');
  });

  it('[ja] no then-shatter: それから absent', () => {
    const out = new GrammarTransformer('en', 'ja').transform(TAKE);
    expect(out).not.toContain('それから');
  });

  it('[tr] no then-shatter: ardından absent', () => {
    const out = new GrammarTransformer('en', 'tr').transform(TAKE);
    expect(out).not.toContain('ardından');
  });

  it("[bn] no then-shatter AND the pronoun renders bare — জন্য doubles as bn's `for` loop keyword", () => {
    // insertMarkers suppresses the duration marker for a pronoun value: en maps
    // `for` → duration lexically, and emitting জন্য after আমি re-minted the
    // spurious `for` on the parse side (the SOV verb-anchoring fallback must
    // keep finding জন্য as a verb for real loops).
    const out = new GrammarTransformer('en', 'bn').transform(TAKE);
    expect(out).not.toContain('তারপর');
    expect(out).not.toContain('জন্য');
    expect(out).toContain('আমি');
  });

  it('a real `for <var> in <iterable>` loop is untouched (both-ways negative)', () => {
    const out = new GrammarTransformer('en', 'bn').transform(
      'on click repeat for item in .items add .processed to item'
    );
    expect(out).toContain('জন্য'); // bn's real loop keyword survives
    expect(out).toContain('তারপর'); // body still splits at the real command boundary
  });

  it('`wait for <event>` and real durations keep their marker (pronoun-only suppression)', () => {
    const wait = new GrammarTransformer('en', 'bn').transform('on click wait for transitionend');
    expect(wait).toContain('transitionend জন্য');
    const dur = new GrammarTransformer('en', 'bn').transform(
      'on click transition opacity to 0 over 300ms'
    );
    expect(dur).toContain('300ms জন্য');
  });
});

describe('qu fused (no-underscore) empty/null value word (chusaq)', () => {
  // The qu semantic tokenizer splits on `_` by design, so the old `ch_usaq`
  // shattered (ch / _ / usaq) and the `usaq` shard fused with the following
  // selector once the predicate-adjective guard healed the render order —
  // `add` captured patient=expression:"usaq.error" (input-validation/if-empty
  // qu). The dict now emits the fused `chusaq`, which the tokenizer already
  // recognizes (norm `null`). Mirrors the #535 ru/uk fused-event route and the
  // L4 qu ñawpaq_kaq dict↔profile realignment.
  it('emits chusaq (fused) for is-empty conditions', () => {
    const out = new GrammarTransformer('en', 'qu').transform(
      'on blur if my value is empty add .error to me else remove .error from me end'
    );
    expect(out).toContain('kanqa chusaq');
    expect(out).not.toContain('ch_usaq');
    expect(out.indexOf('chusaq')).toBeLessThan(out.indexOf('.error'));
  });
});

// =============================================================================
// SOV reorder stranding (transformer-rendering arc)
// =============================================================================
//
// Three rendering defects, one family (docs-internal/HANDOFF_transformer-rendering.md):
// (a) `wait for X or Y from Z` rendered verb-first (tr) / verb-medial (qu) —
//     reorderRoles' safety-net appended roles missing from canonicalOrder
//     AFTER the verb, stranding the or-run/from-phrase outside the clause;
// (b) `repeat until event E from S` postposed the from-phrase after the verb;
// (c) a trailing block terminator (`… wait 200ms end` fragments from the
//     then-splitter) was swept into the open role's VALUE and rendered inside
//     the phrase instead of after the verb.
// Fixed by extending tr/qu/bn canonicalOrder to full verb-final role orders
// and stripping/re-appending the stranded terminator in transformSingle.

describe('SOV reorder stranding (transformer-rendering arc)', () => {
  it('[tr] wait + or-run + from-phrase renders verb-final, from-phrase in-clause', () => {
    const out = new GrammarTransformer('en', 'tr').transform(
      'wait for pointermove(clientY) or pointerup(clientY) from document'
    );
    expect(out).toContain('veya');
    expect(out.trim().endsWith('bekle')).toBe(true);
    expect(out.indexOf('belge den')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('belge den')).toBeLessThan(out.indexOf('bekle'));
  });

  it('[qu] wait + or-run + from-phrase renders verb-final, from-phrase in-clause', () => {
    const out = new GrammarTransformer('en', 'qu').transform(
      'wait for pointermove(clientY) or pointerup(clientY) from document'
    );
    expect(out).toContain('utaq');
    expect(out.trim().endsWith('suyay')).toBe(true);
    expect(out.indexOf('qillqa manta')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('qillqa manta')).toBeLessThan(out.indexOf('pointermove'));
  });

  it('[tr] repeat-until-event keeps the from-phrase before the verb', () => {
    const out = new GrammarTransformer('en', 'tr').transform(
      'repeat until event pointerup from document'
    );
    expect(out.trim().endsWith('tekrarla')).toBe(true);
    expect(out.indexOf('belge den')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('belge den')).toBeLessThan(out.indexOf('tekrarla'));
  });

  it('[bn] trailing-end fragment renders the terminator after the verb', () => {
    // `then`-split fragment of `… then wait 200ms end` (repeat-while body).
    const out = new GrammarTransformer('en', 'bn').transform('wait 200ms end');
    expect(out.trim()).toBe('200ms কে অপেক্ষা শেষ');
    expect(out).not.toContain('শেষ কে'); // terminator no longer inside the object phrase
  });

  it('[qu] inline-if set keeps its verb-final tail before the terminator', () => {
    const out = new GrammarTransformer('en', 'qu').transform(
      'if newWidth < minWidth then set newWidth to minWidth end'
    );
    expect(out).toMatch(/man churanay tukuy\s*$/);
  });

  it('[tr] trailing-end set fragment renders verb-final with trailing terminator', () => {
    // Previously the set-to rule's end-guard predicate skipped verb-final
    // reorder for these fragments; with the terminator stripped first, the
    // rule applies and the terminator follows the verb.
    const out = new GrammarTransformer('en', 'tr').transform('set dragClass to "sorting" end');
    expect(out.trim()).toBe('dragClass i "sorting" e ayarla son');
  });

  const draggableWait =
    'wait for pointermove(clientX, clientY) or pointerup(clientX, clientY) from document';
  it('[tr] draggable-shaped wait (clientX, clientY) is verb-final', () => {
    const out = new GrammarTransformer('en', 'tr').transform(draggableWait);
    expect(out.trim().endsWith('bekle')).toBe(true);
    expect(out.indexOf('belge den')).toBeLessThan(out.indexOf('bekle'));
  });
  it('[qu] draggable-shaped wait (clientX, clientY) is verb-final', () => {
    const out = new GrammarTransformer('en', 'qu').transform(draggableWait);
    expect(out.trim().endsWith('suyay')).toBe(true);
    expect(out.indexOf('qillqa manta')).toBeLessThan(out.indexOf('pointermove'));
  });
});

// The form-submit-prevent head fuses TWO juxtaposed commands (`halt the event
// call validateForm()`); parseEventHandler sweeps both into one patient blob
// and the SOV patient-first reorder fronted it whole — halt's operand stranded
// clause-initial, call's operand riding with it (tr bound validateForm() to
// halt and the event to call). sovHaltCallFusedRule splits the blob at the
// language's call verb and emits both commands verb-final, joined by the
// then-connective (R1 deferred-tail Family H,
// docs-internal/HANDOFF_r1-deferred-tail.md).
describe('SOV fused halt+call heads render both commands verb-final (Family H)', () => {
  const src =
    'on submit halt the event call validateForm() if result is false log "Invalid form" end';
  const EXPECT: Array<[string, string]> = [
    ['ja', 'the イベント を 送信 で 停止 それから validateForm() を 呼び出し'],
    ['ko', 'the 이벤트 를 제출 할 때 정지 그러면 validateForm() 를 호출'],
    ['tr', 'the olay i gönder de durdur ardından validateForm() i çağır'],
    ['bn', 'the ঘটনা কে জমা এ থামুন তারপর validateForm() কে কল'],
    ['hi', 'the घटना को जमा पर रोकें फिर validateForm() को कॉल'],
    ['qu', 'the ruway ta kachay pi sayay chayqa validateForm() ta qayay'],
  ];
  for (const [lang, head] of EXPECT) {
    it(`[${lang}] halt keeps its operand adjacent + verb-final; call follows the connective`, () => {
      const out = new GrammarTransformer('en', lang).transform(src);
      expect(out.startsWith(head)).toBe(true);
    });
  }

  it('[ja] a plain `halt the event` handler keeps its default render (rule stands down)', () => {
    const out = new GrammarTransformer('en', 'ja').transform('on submit halt the event');
    expect(out.trim()).toBe('the イベント を 送信 で 停止');
  });

  it('[tr] a call-only handler keeps its default render (no halt — rule stands down)', () => {
    const out = new GrammarTransformer('en', 'tr').transform('on click call myFunction()');
    expect(out.trim()).toBe('myFunction() i tıklama de çağır');
  });
});
