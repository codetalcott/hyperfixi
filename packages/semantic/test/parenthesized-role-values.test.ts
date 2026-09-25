/**
 * A parenthesized group as a role VALUE: `morph (closest <form/>) to it`.
 *
 * Parentheses are how hyperscript passes a computed target — upstream reads
 * `morph closest <form/> to it` as `morph (closest <form/> to it)` (closest owns
 * a `to` clause), so the parenthesized form is the only correct spelling. The
 * matcher had no step for a group that stands alone as a value: parens tokenize
 * as standalone tokens, so the single-token capture took the lone `(` and
 * stranded the rest (`put it into (closest <form/>)` rendered `put it into (`),
 * or a slot typed `selector|reference` rejected it and the whole command
 * vanished (`hide (closest .modal)` rendered `on click`). The English reference
 * dropped it, so every translation did too, with every multilingual signal
 * green — morph-form-update lost its whole `morph` in all 23 languages (#1167),
 * caught by the en-reference-preservation gate.
 *
 * The group is captured through `joinExpressionTokens` as an `expression`, so
 * the renderer localizes its interior and the target-language parser
 * normalizes it back — the same seam the operator run uses.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';
import { validateSemanticResult } from '../src/validators/command-validator';
import type { SemanticParseResult } from '../src/types';

const strip = (s: string): string => s.replace(/\s+/g, '');
const toEnglish = (src: string, language: string): string => render(parse(src, language), 'en');

const TARGET_SHAPES = [
  'on click morph (closest <form/>) to it',
  'on click hide (closest .modal)',
  'on click show (next <div/>)',
  'on click put it into (closest <form/>)',
  'on click add .a to (closest <form/>)',
  'on click remove .a from (closest <form/>)',
  'on click toggle .a on (next .panel)',
];

describe('a parenthesized group as a role value', () => {
  it.each(TARGET_SHAPES)('en: `%s` carries the whole group', src => {
    expect(strip(toEnglish(src, 'en'))).toBe(strip(src));
  });

  it('en: the corpus row (morph-form-update) keeps its morph', () => {
    const rendered = toEnglish(
      'on submit fetch /api/save then morph (closest <form/>) to it',
      'en'
    );
    expect(strip(rendered)).toContain(strip('then morph (closest <form/>) to it'));
  });

  it('parses the group as ONE expression value in the role', () => {
    const node = parse('on click morph (closest <form/>) to it', 'en') as unknown as {
      body: Array<{ action: string; roles: Map<string, { type: string; raw?: string }> }>;
    };
    const morph = node.body[0]!;
    expect(morph.action).toBe('morph');
    expect(morph.roles.get('patient')?.type).toBe('expression');
    expect(strip(morph.roles.get('patient')?.raw ?? '')).toBe('(closest<form/>)');
  });

  describe.each(['es', 'ja', 'ar'])('%s: survives a full translation round trip', language => {
    it.each(TARGET_SHAPES)('`%s`', src => {
      const translated = render(parse(src, 'en'), language);
      expect(strip(toEnglish(translated, language))).toBe(strip(src));
    });
  });

  describe('leaves the neighbouring shapes to their own matchers', () => {
    it('an operator run of groups stays one expression', () => {
      const src = 'on click set $x to ($a as Number) * ($b as Number)';
      expect(strip(toEnglish(src, 'en'))).toBe(strip(src));
    });

    it('a method call on a group stays a call', () => {
      const src = 'on click call (closest <form/>).reset()';
      expect(strip(toEnglish(src, 'en'))).toBe(strip(src));
    });

    // In a selector|reference slot the operator run does not apply, so these
    // reach the group step. Capturing just `(#a)` would render a plausible,
    // COMPLETE-looking `hide (#a)` with the rest silently gone — worse than
    // the loud drop the group step leaves them to.
    it.each([
      'on click hide (#a) + (#b)',
      'on click hide (#a).foo',
      "on click hide (#a)'s parentElement",
    ])('`%s` is never captured partially as `hide (#a)`', src => {
      expect(strip(toEnglish(src, 'en'))).not.toBe(strip('on click hide (#a)'));
    });

    it('an unbalanced `(` is not captured as a group', () => {
      expect(strip(toEnglish('on click hide (closest .modal', 'en'))).not.toContain(
        '(closest.modal'
      );
    });
  });

  describe('validation', () => {
    const hideWith = (raw: string): SemanticParseResult =>
      ({
        action: 'hide',
        confidence: 1,
        language: 'en',
        arguments: [{ type: 'expression', raw, role: 'patient' }],
      }) as SemanticParseResult;
    const invalidType = (result: SemanticParseResult) =>
      validateSemanticResult(result).warnings.filter(w => w.code === 'INVALID_TYPE');

    it('a whole group satisfies a selector|reference slot', () => {
      expect(invalidType(hideWith('(closest .modal)'))).toEqual([]);
    });

    it('an expression that merely starts and ends with parens does not', () => {
      expect(invalidType(hideWith('(a) * (b)'))).toHaveLength(1);
    });
  });
});
