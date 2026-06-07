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
