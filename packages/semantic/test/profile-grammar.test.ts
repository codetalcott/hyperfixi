/**
 * A profile's grammar is framework's (`@lokascript/framework/languages/<code>`),
 * spread under hyperscript's vocabulary. A profile that set a grammar field
 * after the spread would read and render a language differently from every
 * domain that injects the same grammar, so each field must be framework's own
 * value: the same object, not a copy that could drift.
 */
import { describe, it, expect } from 'vitest';
import * as languages from '@lokascript/framework/languages';
import type { GrammarProfile } from '@lokascript/framework/languages';
import { KNOWN_PROFILES } from '../src/generators/known-profiles';

const grammars = Object.values(languages) as GrammarProfile[];

describe("a profile's grammar is framework's", () => {
  it('has a grammar for every profile, and a profile for every grammar', () => {
    expect(grammars.map(g => g.code).sort()).toEqual(Object.keys(KNOWN_PROFILES).sort());
  });

  it.each(grammars.map(g => [g.code, g] as const))('%s', (code, grammar) => {
    const profile = KNOWN_PROFILES[code] as unknown as Record<string, unknown>;
    for (const [field, value] of Object.entries(grammar)) {
      if (field === 'possessive') continue;
      expect(profile[field], field).toBe(value);
    }
    const possessive = profile.possessive as Record<string, unknown> | undefined;
    for (const [field, value] of Object.entries(grammar.possessive ?? {})) {
      expect(possessive?.[field], `possessive.${field}`).toBe(value);
    }
  });
});
