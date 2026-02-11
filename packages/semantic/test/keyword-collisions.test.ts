/**
 * Keyword Collision Tests
 *
 * Validates that no two commands share the same keyword (primary or alternative)
 * within any language profile. Collisions make one command unreachable because the
 * pattern matcher picks the first registered match.
 */

import { describe, it, expect } from 'vitest';
import {
  validateKeywordCollisions,
  validateAllKeywordCollisions,
} from '../src/generators/schema-validator';
import {
  arabicProfile,
  bengaliProfile,
  chineseProfile,
  englishProfile,
  frenchProfile,
  germanProfile,
  hebrewProfile,
  hindiProfile,
  indonesianProfile,
  italianProfile,
  japaneseProfile,
  koreanProfile,
  malayProfile,
  polishProfile,
  portugueseProfile,
  quechuaProfile,
  russianProfile,
  spanishProfile,
  spanishMexicoProfile,
  swahiliProfile,
  thaiProfile,
  tagalogProfile,
  turkishProfile,
  ukrainianProfile,
  vietnameseProfile,
} from '../src/generators/profiles/index';
import type { LanguageProfile } from '../src/generators/profiles/types';

const allProfiles: Record<string, LanguageProfile> = {
  ar: arabicProfile,
  bn: bengaliProfile,
  zh: chineseProfile,
  en: englishProfile,
  fr: frenchProfile,
  de: germanProfile,
  he: hebrewProfile,
  hi: hindiProfile,
  id: indonesianProfile,
  it: italianProfile,
  ja: japaneseProfile,
  ko: koreanProfile,
  ms: malayProfile,
  pl: polishProfile,
  pt: portugueseProfile,
  qu: quechuaProfile,
  ru: russianProfile,
  es: spanishProfile,
  'es-MX': spanishMexicoProfile,
  sw: swahiliProfile,
  th: thaiProfile,
  tl: tagalogProfile,
  tr: turkishProfile,
  uk: ukrainianProfile,
  vi: vietnameseProfile,
};

describe('Keyword Collision Validation', () => {
  describe('per-language validation', () => {
    for (const [code, profile] of Object.entries(allProfiles)) {
      it(`${code} (${profile.name}) has no keyword collisions`, () => {
        const result = validateKeywordCollisions(profile);
        if (result.collisions.length > 0) {
          const details = result.collisions
            .map(c => `  "${c.keyword}" → [${c.commands.join(', ')}] (${c.type})`)
            .join('\n');
          expect.fail(
            `${code} has ${result.collisions.length} keyword collision(s):\n${details}`
          );
        }
      });
    }
  });

  describe('cross-profile validation', () => {
    it('all profiles pass collision validation', () => {
      const results = validateAllKeywordCollisions(allProfiles);
      if (results.length > 0) {
        const summary = results
          .map(r => {
            const details = r.collisions
              .map(c => `    "${c.keyword}" → [${c.commands.join(', ')}] (${c.type})`)
              .join('\n');
            return `  ${r.language}: ${r.collisions.length} collision(s)\n${details}`;
          })
          .join('\n');
        expect.fail(`${results.length} language(s) have keyword collisions:\n${summary}`);
      }
    });
  });
});
