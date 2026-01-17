/**
 * Language Loader Tests
 *
 * Tests for the lazy loading API (loadLanguage, loadLanguages, etc.)
 *
 * Note: The test setup (setup.ts) pre-registers all languages via languages/_all,
 * so tests must account for languages being already registered.
 */

import { describe, it, expect } from 'vitest';
import {
  loadLanguage,
  loadLanguages,
  canLoadLanguage,
  getLoadedLanguages,
  getUnloadedLanguages,
  SUPPORTED_LANGUAGES,
} from '../src/language-loader';
import { isLanguageRegistered } from '../src/registry';

describe('Language Loader', () => {
  // ==========================================================================
  // canLoadLanguage
  // ==========================================================================

  describe('canLoadLanguage', () => {
    it('returns true for all supported languages', () => {
      expect(canLoadLanguage('en')).toBe(true);
      expect(canLoadLanguage('ja')).toBe(true);
      expect(canLoadLanguage('ar')).toBe(true);
      expect(canLoadLanguage('es')).toBe(true);
      expect(canLoadLanguage('ko')).toBe(true);
      expect(canLoadLanguage('zh')).toBe(true);
      expect(canLoadLanguage('tr')).toBe(true);
      expect(canLoadLanguage('pt')).toBe(true);
      expect(canLoadLanguage('fr')).toBe(true);
      expect(canLoadLanguage('de')).toBe(true);
      expect(canLoadLanguage('id')).toBe(true);
      expect(canLoadLanguage('qu')).toBe(true);
      expect(canLoadLanguage('sw')).toBe(true);
    });

    it('returns false for unsupported languages', () => {
      expect(canLoadLanguage('xx')).toBe(false);
      expect(canLoadLanguage('invalid')).toBe(false);
      expect(canLoadLanguage('')).toBe(false);
      expect(canLoadLanguage('english')).toBe(false); // Full name, not code
    });
  });

  // ==========================================================================
  // SUPPORTED_LANGUAGES
  // ==========================================================================

  describe('SUPPORTED_LANGUAGES', () => {
    it('contains exactly 23 languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(23);
    });

    it('contains all expected language codes', () => {
      const expected = ['ar', 'bn', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'ms', 'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
      for (const code of expected) {
        expect(SUPPORTED_LANGUAGES).toContain(code);
      }
    });

    it('uses ISO 639-1 two-letter codes', () => {
      for (const code of SUPPORTED_LANGUAGES) {
        expect(code).toMatch(/^[a-z]{2}$/);
      }
    });
  });

  // ==========================================================================
  // loadLanguage
  // ==========================================================================

  describe('loadLanguage', () => {
    it('returns correct code in result', async () => {
      const result = await loadLanguage('en');
      expect(result.code).toBe('en');
    });

    it('skips already registered language by default', async () => {
      // All languages are pre-registered by test setup
      const result = await loadLanguage('en');
      expect(result.loaded).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('reloads if skipIfRegistered is false', async () => {
      const result = await loadLanguage('en', { skipIfRegistered: false });
      expect(result.code).toBe('en');
      expect(result.loaded).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error for unknown language code', async () => {
      const result = await loadLanguage('xx');
      expect(result.code).toBe('xx');
      expect(result.loaded).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown language');
    });

    it('handles empty string gracefully', async () => {
      const result = await loadLanguage('');
      expect(result.loaded).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('loads Japanese with correct module structure', async () => {
      const result = await loadLanguage('ja', { skipIfRegistered: false });
      expect(result.loaded).toBe(true);
      expect(isLanguageRegistered('ja')).toBe(true);
    });

    it('loads Arabic (RTL language) correctly', async () => {
      const result = await loadLanguage('ar', { skipIfRegistered: false });
      expect(result.loaded).toBe(true);
      expect(isLanguageRegistered('ar')).toBe(true);
    });
  });

  // ==========================================================================
  // loadLanguages
  // ==========================================================================

  describe('loadLanguages', () => {
    it('loads multiple languages and returns array of results', async () => {
      const results = await loadLanguages(['en', 'ja', 'es']);
      expect(results).toHaveLength(3);
      expect(results[0].code).toBe('en');
      expect(results[1].code).toBe('ja');
      expect(results[2].code).toBe('es');
    });

    it('handles empty array', async () => {
      const results = await loadLanguages([]);
      expect(results).toHaveLength(0);
    });

    it('handles mix of valid and invalid codes', async () => {
      const results = await loadLanguages(['en', 'xx', 'ja']);
      expect(results).toHaveLength(3);
      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toBeDefined();
      expect(results[2].error).toBeUndefined();
    });

    it('loads all 23 languages without errors', async () => {
      const results = await loadLanguages(SUPPORTED_LANGUAGES, { skipIfRegistered: false });
      expect(results).toHaveLength(23);
      const errors = results.filter(r => r.error);
      expect(errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getLoadedLanguages / getUnloadedLanguages
  // ==========================================================================

  describe('getLoadedLanguages', () => {
    it('returns array of loaded language codes', () => {
      const loaded = getLoadedLanguages();
      expect(Array.isArray(loaded)).toBe(true);
    });

    it('returns all languages when all are registered', () => {
      // Test setup registers all languages
      const loaded = getLoadedLanguages();
      expect(loaded.length).toBe(23);
    });

    it('contains only valid language codes', () => {
      const loaded = getLoadedLanguages();
      for (const code of loaded) {
        expect(SUPPORTED_LANGUAGES).toContain(code);
      }
    });
  });

  describe('getUnloadedLanguages', () => {
    it('returns array of unloaded language codes', () => {
      const unloaded = getUnloadedLanguages();
      expect(Array.isArray(unloaded)).toBe(true);
    });

    it('returns empty array when all languages are registered', () => {
      // Test setup registers all languages
      const unloaded = getUnloadedLanguages();
      expect(unloaded).toHaveLength(0);
    });

    it('loaded + unloaded equals all supported languages', () => {
      const loaded = getLoadedLanguages();
      const unloaded = getUnloadedLanguages();
      expect(loaded.length + unloaded.length).toBe(SUPPORTED_LANGUAGES.length);
    });
  });

  // ==========================================================================
  // Integration with registry
  // ==========================================================================

  describe('Registry Integration', () => {
    it('loadLanguage registers language with registry', async () => {
      // Force reload to test registration
      await loadLanguage('ko', { skipIfRegistered: false });
      expect(isLanguageRegistered('ko')).toBe(true);
    });

    it('all SUPPORTED_LANGUAGES can be loaded', async () => {
      for (const code of SUPPORTED_LANGUAGES) {
        expect(canLoadLanguage(code)).toBe(true);
        const result = await loadLanguage(code, { skipIfRegistered: false });
        expect(result.error).toBeUndefined();
      }
    });
  });
});
