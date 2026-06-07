/**
 * Multilingual roadmap — property-path patient (Tier 2).
 *
 * Regression guard for the property-path patient feature that cleared
 * `announce-screen-reader` (he+sw) — see docs-internal/MULTILINGUAL_ROADMAP.md.
 *
 * `put event.detail.message into #x` fails even in English at the bare-command
 * level: the tokenizer fuses the dotted path into a base token + `.`-prefixed
 * selector tokens (`event` + `.detail` + `.message`), which the property-access
 * matcher previously didn't recognize. The fix is gated to reference/identifier
 * bases so a command verb + class selector (`toggle .active`) is never consumed.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src';

describe('Property-path patient (fused-dot member access)', () => {
  const cases: [string, string][] = [
    ['put event.detail.message into #x', 'en'],
    ['put it.value into #x', 'en'],
    ['put my.innerHTML into #x', 'en'],
    ['שים את event.detail.message על #x', 'he'],
    ['weka event.detail.message kwa #x', 'sw'],
  ];
  for (const [input, lang] of cases) {
    it(`parses "${input}" (${lang})`, () => {
      expect(canParse(input, lang)).toBe(true);
      expect(parse(input, lang).action).toBe('put');
    });
  }

  it('does not swallow a command verb + class selector as a property path', () => {
    // The fused-dot branch is gated to reference bases; `toggle`/`بدل` are verbs.
    expect(parse('toggle .active', 'en').action).toBe('toggle');
    // Arabic proclitic conjunction form must still parse as toggle, not on.
    expect(parse('وبدل .active على #button', 'ar').action).toBe('toggle');
  });
});
