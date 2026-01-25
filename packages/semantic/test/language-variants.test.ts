/**
 * Language Variant Support Tests
 *
 * Tests for BCP 47 language codes (e.g., es-MX, pt-BR) and profile inheritance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerLanguage,
  registerProfile,
  getProfile,
  tryGetProfile,
  getTokenizer,
  tryGetTokenizer,
  isLanguageRegistered,
  isLanguageSupported,
  getBaseLanguageCode,
  isLanguageVariant,
  mergeProfiles,
  resolveProfile,
} from '../src/registry';
import { spanishProfile } from '../src/generators/profiles/spanish';
import { portugueseProfile } from '../src/generators/profiles/portuguese';
import { spanishTokenizer } from '../src/tokenizers/spanish';
import type { LanguageProfile, KeywordTranslation } from '../src/generators/profiles/types';
import type { LanguageTokenizer } from '../src/types';

// =============================================================================
// Language Code Utilities
// =============================================================================

describe('Language Code Utilities', () => {
  describe('getBaseLanguageCode', () => {
    it('extracts base code from BCP 47 tags', () => {
      expect(getBaseLanguageCode('es-MX')).toBe('es');
      expect(getBaseLanguageCode('pt-BR')).toBe('pt');
      expect(getBaseLanguageCode('zh-TW')).toBe('zh');
      expect(getBaseLanguageCode('en-US')).toBe('en');
    });

    it('returns the code unchanged for simple ISO codes', () => {
      expect(getBaseLanguageCode('es')).toBe('es');
      expect(getBaseLanguageCode('en')).toBe('en');
      expect(getBaseLanguageCode('ja')).toBe('ja');
    });
  });

  describe('isLanguageVariant', () => {
    it('returns true for BCP 47 variant codes', () => {
      expect(isLanguageVariant('es-MX')).toBe(true);
      expect(isLanguageVariant('pt-BR')).toBe(true);
      expect(isLanguageVariant('en-GB')).toBe(true);
    });

    it('returns false for simple ISO codes', () => {
      expect(isLanguageVariant('es')).toBe(false);
      expect(isLanguageVariant('en')).toBe(false);
      expect(isLanguageVariant('ja')).toBe(false);
    });
  });
});

// =============================================================================
// Profile Merging
// =============================================================================

describe('Profile Merging', () => {
  const baseProfile: LanguageProfile = {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    wordOrder: 'SVO',
    markingStrategy: 'preposition',
    usesSpaces: true,
    verb: {
      position: 'second',
      subjectDrop: true,
    },
    roleMarkers: {
      destination: { primary: 'a', position: 'before' },
    },
    keywords: {
      toggle: { primary: 'alternar', normalized: 'toggle' },
      add: { primary: 'agregar', normalized: 'add' },
    },
    references: {
      me: 'yo',
      it: 'eso',
    },
  };

  describe('mergeProfiles', () => {
    it('overrides top-level scalar fields', () => {
      const merged = mergeProfiles(baseProfile, {
        code: 'es-MX',
        name: 'Spanish (Mexico)',
        nativeName: 'Español (México)',
      });

      expect(merged.code).toBe('es-MX');
      expect(merged.name).toBe('Spanish (Mexico)');
      expect(merged.nativeName).toBe('Español (México)');
      // Inherited fields
      expect(merged.direction).toBe('ltr');
      expect(merged.wordOrder).toBe('SVO');
    });

    it('deep merges nested objects (keywords)', () => {
      const merged = mergeProfiles(baseProfile, {
        code: 'es-MX',
        name: 'Spanish (Mexico)',
        nativeName: 'Español (México)',
        keywords: {
          // Override toggle with Mexican alternative
          toggle: { primary: 'alternar', alternatives: ['dale', 'cambiar'], normalized: 'toggle' },
          // Add new keyword
          wait: { primary: 'espera', alternatives: ['ahorita'], normalized: 'wait' },
        },
      });

      // Overridden keyword
      expect(merged.keywords.toggle.primary).toBe('alternar');
      expect(merged.keywords.toggle.alternatives).toEqual(['dale', 'cambiar']);

      // Inherited keyword
      expect(merged.keywords.add.primary).toBe('agregar');

      // New keyword
      expect(merged.keywords.wait?.primary).toBe('espera');
    });

    it('deep merges references', () => {
      const merged = mergeProfiles(baseProfile, {
        code: 'es-MX',
        name: 'Spanish (Mexico)',
        nativeName: 'Español (México)',
        references: {
          // Mexican informal
          you: 'tú',
        },
      });

      // Inherited
      expect(merged.references?.me).toBe('yo');
      expect(merged.references?.it).toBe('eso');
      // New
      expect(merged.references?.you).toBe('tú');
    });

    it('replaces arrays entirely (does not merge)', () => {
      const baseWithAlternatives: LanguageProfile = {
        ...baseProfile,
        keywords: {
          toggle: {
            primary: 'alternar',
            alternatives: ['cambiar', 'modificar'],
            normalized: 'toggle',
          },
        },
      };

      const merged = mergeProfiles(baseWithAlternatives, {
        code: 'es-MX',
        name: 'Spanish (Mexico)',
        nativeName: 'Español (México)',
        keywords: {
          toggle: {
            primary: 'alternar',
            alternatives: ['dale'], // Should replace, not merge
            normalized: 'toggle',
          },
        },
      });

      expect(merged.keywords.toggle.alternatives).toEqual(['dale']);
    });
  });

  describe('resolveProfile', () => {
    it('returns profile unchanged if no extends field', () => {
      const resolved = resolveProfile(baseProfile);
      expect(resolved).toEqual(baseProfile);
    });

    // Note: Full inheritance testing requires registered profiles
    // See integration tests below
  });
});

// =============================================================================
// Registry Fallback (Integration Tests)
// =============================================================================

describe('Registry Fallback', () => {
  // These tests use the already-registered Spanish profile from imports

  describe('getProfile fallback', () => {
    it('returns base profile for unregistered variant', () => {
      // es-MX is not registered, should fall back to es
      const profile = getProfile('es-MX');
      expect(profile).toBeDefined();
      expect(profile.code).toBe('es'); // Falls back to base
      expect(profile.name).toBe('Spanish');
    });

    it('returns exact match when variant is registered', () => {
      // es is registered directly
      const profile = getProfile('es');
      expect(profile.code).toBe('es');
    });
  });

  describe('tryGetProfile fallback', () => {
    it('returns base profile for unregistered variant', () => {
      const profile = tryGetProfile('es-AR');
      expect(profile).toBeDefined();
      expect(profile?.code).toBe('es');
    });

    it('returns undefined for completely unregistered language', () => {
      const profile = tryGetProfile('xx-YY');
      expect(profile).toBeUndefined();
    });
  });

  describe('getTokenizer fallback', () => {
    it('returns base tokenizer for unregistered variant', () => {
      const tokenizer = getTokenizer('es-MX');
      expect(tokenizer).toBeDefined();
      expect(tokenizer.language).toBe('es');
    });
  });

  describe('tryGetTokenizer fallback', () => {
    it('returns base tokenizer for unregistered variant', () => {
      const tokenizer = tryGetTokenizer('pt-BR');
      expect(tokenizer).toBeDefined();
      expect(tokenizer?.language).toBe('pt');
    });

    it('returns undefined for completely unregistered language', () => {
      const tokenizer = tryGetTokenizer('xx-YY');
      expect(tokenizer).toBeUndefined();
    });
  });

  describe('isLanguageRegistered fallback', () => {
    it('returns true for registered base language', () => {
      expect(isLanguageRegistered('es')).toBe(true);
    });

    it('returns true for variant when base is registered', () => {
      expect(isLanguageRegistered('es-MX')).toBe(true);
      expect(isLanguageRegistered('pt-BR')).toBe(true);
    });

    it('returns false for completely unregistered language', () => {
      expect(isLanguageRegistered('xx')).toBe(false);
      expect(isLanguageRegistered('xx-YY')).toBe(false);
    });
  });

  describe('isLanguageSupported fallback', () => {
    it('returns true for variant when base is supported', () => {
      expect(isLanguageSupported('es-MX')).toBe(true);
      expect(isLanguageSupported('es-AR')).toBe(true);
    });

    it('returns false for unsupported language', () => {
      expect(isLanguageSupported('xx-YY')).toBe(false);
    });
  });
});

// =============================================================================
// Code Validation
// =============================================================================

describe('Code Validation', () => {
  const validCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;

  it('accepts ISO 639-1 codes', () => {
    expect(validCodePattern.test('en')).toBe(true);
    expect(validCodePattern.test('es')).toBe(true);
    expect(validCodePattern.test('ja')).toBe(true);
    expect(validCodePattern.test('zh')).toBe(true);
  });

  it('accepts BCP 47 codes with region', () => {
    expect(validCodePattern.test('es-MX')).toBe(true);
    expect(validCodePattern.test('pt-BR')).toBe(true);
    expect(validCodePattern.test('en-US')).toBe(true);
    expect(validCodePattern.test('en-GB')).toBe(true);
    expect(validCodePattern.test('zh-TW')).toBe(true);
    expect(validCodePattern.test('zh-CN')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(validCodePattern.test('spanish')).toBe(false); // Too long
    expect(validCodePattern.test('e')).toBe(false); // Too short
    expect(validCodePattern.test('ES')).toBe(false); // Wrong case
    expect(validCodePattern.test('es-mx')).toBe(false); // Region should be uppercase
    expect(validCodePattern.test('es-MEX')).toBe(false); // Region should be 2 chars
    expect(validCodePattern.test('es_MX')).toBe(false); // Wrong separator
  });
});
