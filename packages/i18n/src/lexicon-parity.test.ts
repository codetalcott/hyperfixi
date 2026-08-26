/**
 * Profile `lexicon` ↔ i18n Dictionary parity
 *
 * The semantic profile gained a `lexicon` block (2026-08-26) carrying the six
 * Dictionary categories it never modelled — the vocabulary that appears INSIDE
 * role values (`true`, `value`, `seconds`) rather than as a command verb or a
 * role marker. The renderer needs it: without it, `set @disabled to true`
 * renders into Spanish as `… a true` instead of `… a verdadero`, the Spanish
 * parser cannot bind the value back, and the role is silently dropped.
 *
 * This test is the oracle for that move: every entry in the hand-authored
 * dictionary must be reachable from the profile with the SAME rendering. It
 * lives in @lokascript/i18n rather than @lokascript/semantic because semantic
 * builds first and cannot import the dictionaries.
 *
 * Direction of authority: the dictionary is the incumbent, so it wins. A
 * mismatch here means the profile drifted from a curated translation, not that
 * the dictionary is stale.
 *
 * Nothing is deleted while this passes — the dictionaries remain the source for
 * i18n's own consumers. It exists so a later derive-flip can be made safely.
 */
import { describe, it, expect } from 'vitest';
import { dictionaries } from './dictionaries';
import { KNOWN_PROFILES } from '@lokascript/semantic';
import type { LanguageProfile } from '@lokascript/semantic';

const CATEGORIES = [
  'events',
  'logical',
  'temporal',
  'values',
  'attributes',
  'expressions',
] as const;

const profiles = KNOWN_PROFILES as Readonly<Record<string, LanguageProfile>>;
const codes = Object.keys(dictionaries).filter(c => profiles[c]);

describe('profile.lexicon ↔ i18n dictionary parity', () => {
  it('covers every language that has both a dictionary and a profile', () => {
    expect(codes.length).toBe(24);
  });

  describe.each(codes)('%s', code => {
    const dict = dictionaries[code] as unknown as Record<string, Record<string, string>>;
    const lexicon = (profiles[code].lexicon ?? {}) as Record<
      string,
      Record<string, { primary: string }>
    >;

    it('has a lexicon block', () => {
      expect(profiles[code].lexicon, `${code} profile is missing lexicon`).toBeDefined();
    });

    for (const category of CATEGORIES) {
      const entries = dict[category] ?? {};
      const keys = Object.keys(entries);
      if (keys.length === 0) continue;

      it(`${category}: all ${keys.length} dictionary entries are present with the same rendering`, () => {
        const missing: string[] = [];
        const diverged: string[] = [];
        for (const key of keys) {
          const onProfile = lexicon[category]?.[key];
          if (!onProfile) {
            missing.push(key);
          } else if (onProfile.primary !== entries[key]) {
            diverged.push(`${key}: profile=${onProfile.primary} dictionary=${entries[key]}`);
          }
        }
        expect({ missing, diverged }).toEqual({ missing: [], diverged: [] });
      });
    }
  });
});
