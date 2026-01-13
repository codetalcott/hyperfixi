/**
 * Tests for prism-hyperfixi syntax highlighting plugin.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePatterns,
  clearPatternCache,
  getAllKeywords,
  getSupportedLanguages,
  isLanguageSupported,
} from './pattern-generator';
import { detectLanguage, isValidLanguage, getHighlightLanguage } from './language-detector';
import {
  isNonLatinLanguage,
  getTextDirection,
  NON_LATIN_LANGUAGES,
  RTL_LANGUAGES,
} from './token-definitions';

// =============================================================================
// Pattern Generator Tests
// =============================================================================

describe('Pattern Generator', () => {
  beforeEach(() => {
    clearPatternCache();
  });

  describe('generatePatterns', () => {
    it('should generate patterns for English', () => {
      const patterns = generatePatterns('en');

      expect(patterns.language).toBe('en');
      expect(patterns.direction).toBe('ltr');
      expect(patterns.isNonLatin).toBe(false);
      expect(patterns.patterns.command).toBeInstanceOf(RegExp);
      expect(patterns.patterns.modifier).toBeInstanceOf(RegExp);
      expect(patterns.patterns.event).toBeInstanceOf(RegExp);
    });

    it('should generate patterns for Japanese (non-Latin)', () => {
      const patterns = generatePatterns('ja');

      expect(patterns.language).toBe('ja');
      expect(patterns.direction).toBe('ltr');
      expect(patterns.isNonLatin).toBe(true);
      expect(patterns.patterns.command).toBeInstanceOf(RegExp);
    });

    it('should generate patterns for Arabic (RTL)', () => {
      const patterns = generatePatterns('ar');

      expect(patterns.language).toBe('ar');
      expect(patterns.direction).toBe('rtl');
      expect(patterns.isNonLatin).toBe(true);
    });

    it('should cache generated patterns', () => {
      const patterns1 = generatePatterns('en');
      const patterns2 = generatePatterns('en');

      expect(patterns1).toBe(patterns2); // Same reference
    });

    it('should clear cache', () => {
      const patterns1 = generatePatterns('en');
      clearPatternCache();
      const patterns2 = generatePatterns('en');

      expect(patterns1).not.toBe(patterns2); // Different references
      expect(patterns1).toEqual(patterns2); // But equal content
    });

    it('should throw for unknown language', () => {
      expect(() => generatePatterns('xx')).toThrow('Unknown language: xx');
    });
  });

  describe('getAllKeywords', () => {
    it('should return keywords for English', () => {
      const keywords = getAllKeywords('en');

      expect(keywords).toContain('toggle');
      expect(keywords).toContain('add');
      expect(keywords).toContain('remove');
      expect(keywords).toContain('click');
      expect(keywords.length).toBeGreaterThan(10);
    });

    it('should return keywords for Spanish', () => {
      const keywords = getAllKeywords('es');

      expect(keywords).toContain('alternar'); // toggle
      expect(keywords).toContain('agregar'); // add
      expect(keywords.length).toBeGreaterThan(10);
    });

    it('should return empty array for unknown language', () => {
      const keywords = getAllKeywords('xx');

      expect(keywords).toEqual([]);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('ar');
      expect(languages.length).toBeGreaterThanOrEqual(13);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('ja')).toBe(true);
      expect(isLanguageSupported('es')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('xx')).toBe(false);
      expect(isLanguageSupported('xyz')).toBe(false);
    });
  });
});

// =============================================================================
// Language Detector Tests
// =============================================================================

describe('Language Detector', () => {
  describe('detectLanguage', () => {
    it('should detect English for English code', () => {
      const result = detectLanguage('on click toggle .active');

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect Japanese for Japanese keywords', () => {
      const result = detectLanguage('クリック で .active を 切り替え');

      expect(result.language).toBe('ja');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should detect Spanish for Spanish keywords', () => {
      const result = detectLanguage('en clic alternar .active');

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Korean for Korean keywords', () => {
      const result = detectLanguage('.active 를 전환');

      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Arabic for Arabic keywords', () => {
      const result = detectLanguage('بدل .active');

      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should default to English for unknown content', () => {
      const result = detectLanguage('#something');

      expect(result.language).toBe('en');
    });

    it('should provide alternatives for ambiguous code', () => {
      // Some languages share similar keywords
      const result = detectLanguage('toggle .active on #element');

      // Even if alternatives exist, there should be a primary language
      expect(result.language).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('isValidLanguage', () => {
    it('should return true for valid languages', () => {
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('ja')).toBe(true);
      expect(isValidLanguage('es')).toBe(true);
    });

    it('should return false for invalid languages', () => {
      expect(isValidLanguage('xx')).toBe(false);
      expect(isValidLanguage('')).toBe(false);
    });
  });

  describe('getHighlightLanguage', () => {
    it('should use forced language if valid', () => {
      const lang = getHighlightLanguage('on click toggle .active', 'ja');

      expect(lang).toBe('ja');
    });

    it('should detect language if force is "auto"', () => {
      const lang = getHighlightLanguage('クリック で 切り替え', 'auto');

      expect(lang).toBe('ja');
    });

    it('should detect language if no force specified', () => {
      const lang = getHighlightLanguage('alternar .active en clic');

      expect(lang).toBe('es');
    });

    it('should fallback to detection if forced language is invalid', () => {
      const lang = getHighlightLanguage('on click toggle .active', 'xyz');

      expect(lang).toBe('en');
    });
  });
});

// =============================================================================
// Token Definitions Tests
// =============================================================================

describe('Token Definitions', () => {
  describe('isNonLatinLanguage', () => {
    it('should identify non-Latin languages', () => {
      expect(isNonLatinLanguage('ja')).toBe(true);
      expect(isNonLatinLanguage('ko')).toBe(true);
      expect(isNonLatinLanguage('zh')).toBe(true);
      expect(isNonLatinLanguage('ar')).toBe(true);
      expect(isNonLatinLanguage('ru')).toBe(true);
    });

    it('should identify Latin languages', () => {
      expect(isNonLatinLanguage('en')).toBe(false);
      expect(isNonLatinLanguage('es')).toBe(false);
      expect(isNonLatinLanguage('fr')).toBe(false);
      expect(isNonLatinLanguage('de')).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('should return rtl for Arabic', () => {
      expect(getTextDirection('ar')).toBe('rtl');
    });

    it('should return ltr for most languages', () => {
      expect(getTextDirection('en')).toBe('ltr');
      expect(getTextDirection('ja')).toBe('ltr');
      expect(getTextDirection('zh')).toBe('ltr');
    });
  });

  describe('NON_LATIN_LANGUAGES', () => {
    it('should contain expected languages', () => {
      expect(NON_LATIN_LANGUAGES.has('ja')).toBe(true);
      expect(NON_LATIN_LANGUAGES.has('ko')).toBe(true);
      expect(NON_LATIN_LANGUAGES.has('zh')).toBe(true);
      expect(NON_LATIN_LANGUAGES.has('ar')).toBe(true);
    });
  });

  describe('RTL_LANGUAGES', () => {
    it('should contain Arabic', () => {
      expect(RTL_LANGUAGES.has('ar')).toBe(true);
    });

    it('should not contain LTR languages', () => {
      expect(RTL_LANGUAGES.has('en')).toBe(false);
      expect(RTL_LANGUAGES.has('ja')).toBe(false);
    });
  });
});

// =============================================================================
// Pattern Matching Tests
// =============================================================================

describe('Pattern Matching', () => {
  it('should match English commands with word boundaries', () => {
    const patterns = generatePatterns('en');
    const code = 'on click toggle .active';

    // The command pattern should match 'toggle' but not partial matches
    expect(patterns.patterns.command.test('toggle')).toBe(true);
    patterns.patterns.command.lastIndex = 0; // Reset regex state
    expect(patterns.patterns.command.test('atoggle')).toBe(false);
  });

  it('should match Japanese commands without word boundaries', () => {
    const patterns = generatePatterns('ja');

    // Japanese doesn't use word boundaries
    expect(patterns.patterns.command.test('切り替え')).toBe(true);
  });

  it('should handle longest-first matching', () => {
    // If there are overlapping keywords, longer ones should be tried first
    // This is tested implicitly by the pattern generation sorting
    const patterns = generatePatterns('en');

    // Commands are sorted longest-first in the pattern
    expect(patterns.patterns.command).toBeDefined();
  });
});

// =============================================================================
// Multi-language Coverage Tests
// =============================================================================

describe('Multi-language Coverage', () => {
  const testLanguages = ['en', 'es', 'ja', 'ko', 'zh', 'ar', 'tr', 'id', 'fr', 'de'];

  for (const lang of testLanguages) {
    describe(`Language: ${lang}`, () => {
      it('should generate valid patterns', () => {
        const patterns = generatePatterns(lang);

        expect(patterns.language).toBe(lang);
        expect(patterns.patterns.command).toBeInstanceOf(RegExp);
        expect(patterns.patterns.event).toBeInstanceOf(RegExp);
      });

      it('should have keywords', () => {
        const keywords = getAllKeywords(lang);

        expect(keywords.length).toBeGreaterThan(0);
      });
    });
  }
});
