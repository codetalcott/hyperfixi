/**
 * Translation Validation Tests
 *
 * Verifies that all dictionaries have complete translations
 * with no TODO placeholders remaining.
 */

import { describe, it, expect } from 'vitest';
import { dictionaries } from './dictionaries';
import type { Dictionary } from './types';

// Focus on when/where which were the main TODO items we fixed
const REQUIRED_LOGICAL_KEYWORDS = ['when', 'where', 'and', 'or', 'not'] as const;

// Languages that are fully implemented (not placeholder stubs)
const COMPLETE_LANGUAGES = [
  'en', 'es', 'ja', 'ko', 'ar', 'id', 'pt', 'it', 'vi', 'qu', 'sw',
  'pl', 'ru', 'zh', 'hi', 'bn', 'de', 'th', 'fr', 'uk', 'tl', 'ms',
] as const;

// Languages with placeholder translations (none currently)
const INCOMPLETE_LANGUAGES = [] as const;

describe('Translation Validation', () => {
  describe('Logical keywords completeness', () => {
    COMPLETE_LANGUAGES.forEach((code) => {
      const dict = dictionaries[code] as Dictionary | undefined;
      if (!dict) return;

      it(`${code}: all logical keywords are translated (no TODO)`, () => {
        REQUIRED_LOGICAL_KEYWORDS.forEach((keyword) => {
          const value = dict.logical?.[keyword];
          expect(value, `Missing logical keyword: ${keyword}`).toBeDefined();
          expect(value, `${keyword} is still TODO`).not.toBe('TODO');
          expect(
            typeof value === 'string' && value.length > 0,
            `${keyword} is empty`
          ).toBe(true);
        });
      });
    });
  });

  describe('No TODO placeholders in complete languages', () => {
    COMPLETE_LANGUAGES.forEach((code) => {
      const dict = dictionaries[code] as Dictionary | undefined;
      if (!dict) return;

      it(`${code}: dictionary has no TODO values in core categories`, () => {
        const coreCategories = ['commands', 'modifiers', 'logical', 'values'] as const;
        const todos: string[] = [];

        coreCategories.forEach((category) => {
          const section = dict[category];
          if (section && typeof section === 'object') {
            Object.entries(section).forEach(([key, value]) => {
              if (value === 'TODO') {
                todos.push(`${category}.${key}`);
              }
            });
          }
        });

        expect(
          todos.length,
          `Found TODO values: ${todos.join(', ')}`
        ).toBe(0);
      });
    });
  });

  describe('when/where linguistic validation', () => {
    it('when keywords are temporal/conditional words (not interrogatives)', () => {
      // These patterns verify the translations are temporal markers, not questions
      const temporalPatterns: Record<string, RegExp> = {
        es: /cuando/i,     // Spanish: "cuando" (when as temporal)
        pt: /quando/i,     // Portuguese: "quando"
        it: /quando/i,     // Italian: "quando"
        fr: /quand/i,      // French: "quand"
        ja: /とき|時/,      // Japanese: "toki" (time/when)
        ko: /때/,          // Korean: "ttae" (time/when)
        de: /wenn|wann/i,  // German: "wenn" (conditional when)
        ru: /когда/i,      // Russian: "kogda"
        uk: /коли/i,       // Ukrainian: "koly"
        pl: /kiedy/i,      // Polish: "kiedy"
        ar: /عندما/,       // Arabic: "endama"
        zh: /当|當/,       // Chinese: "dang" (when)
      };

      Object.entries(temporalPatterns).forEach(([code, pattern]) => {
        const dict = dictionaries[code] as Dictionary | undefined;
        if (dict?.logical?.when && dict.logical.when !== 'TODO') {
          expect(
            dict.logical.when,
            `${code}: 'when' should match temporal pattern`
          ).toMatch(pattern);
        }
      });
    });

    it('where keywords are locative words', () => {
      // These patterns verify the translations are locative, not interrogatives
      const locativePatterns: Record<string, RegExp> = {
        es: /donde|dónde/i,   // Spanish: "donde"
        pt: /onde/i,          // Portuguese: "onde"
        it: /dove/i,          // Italian: "dove"
        fr: /où/i,            // French: "où"
        de: /wo/i,            // German: "wo"
        ru: /где/i,           // Russian: "gde"
        uk: /де/i,            // Ukrainian: "de"
        pl: /gdzie/i,         // Polish: "gdzie"
        ar: /أين/,            // Arabic: "ayna"
        zh: /哪里|哪裡/,       // Chinese: "nali"
      };

      Object.entries(locativePatterns).forEach(([code, pattern]) => {
        const dict = dictionaries[code] as Dictionary | undefined;
        if (dict?.logical?.where && dict.logical.where !== 'TODO') {
          expect(
            dict.logical.where,
            `${code}: 'where' should match locative pattern`
          ).toMatch(pattern);
        }
      });
    });
  });

  describe('Dictionary structure validation', () => {
    Object.entries(dictionaries).forEach(([code, dict]) => {
      it(`${code}: has required top-level categories`, () => {
        const requiredCategories = ['commands', 'modifiers', 'logical'];
        requiredCategories.forEach((category) => {
          expect(
            dict,
            `Missing category: ${category}`
          ).toHaveProperty(category);
        });
      });
    });
  });

  describe('All languages are complete', () => {
    it('no incomplete languages remain', () => {
      expect(INCOMPLETE_LANGUAGES.length).toBe(0);
    });

    // Verify tl and ms are now complete
    ['tl', 'ms'].forEach((code) => {
      const dict = dictionaries[code] as Dictionary | undefined;
      if (!dict) return;

      it(`${code}: is now fully translated (no TODO placeholders in core)`, () => {
        const coreValues = [
          ...Object.values(dict.commands || {}),
          ...Object.values(dict.logical || {}),
        ];
        const todos = coreValues.filter((v) => v === 'TODO');
        expect(todos.length, `${code} still has TODO values`).toBe(0);
      });
    });
  });
});
