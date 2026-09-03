/**
 * Grammar PROFILES and role-transformation tests.
 *
 * What this file is: the surviving ~400 lines of the old 2,780-line
 * `grammar.test.ts`, which tested `GrammarTransformer` and the five profile /
 * role / dictionary describes below in one place. The transformer is retired
 * (see grammar/index.ts); these are not.
 *
 * They cover the half of `grammar/` that STAYS and has its own consumers:
 * `profiles/` (i18n's `runtime.ts`, and the classic-i18n browser bundle's
 * `getProfile` / `getSupportedGrammarLocales` / `profiles` surface), the role
 * helpers in `types.ts` (`reorderRoles` / `insertMarkers` / `joinTokens`, which
 * `constants.ts` imports from), and the has/have dictionary entries.
 */

import { describe, it, expect } from 'vitest';
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
  type SemanticRole,
} from './types';

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
