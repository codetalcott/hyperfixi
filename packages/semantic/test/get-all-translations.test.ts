/**
 * getAllTranslations: language coverage and best-effort semantics.
 *
 * The default target-language list used to be a frozen 13-entry literal while
 * the package documented and registered 24 languages, so consumers building UI
 * off the result had to count it rather than trust the documentation. The
 * default now derives from the tokenizer registry.
 */

import { describe, it, expect } from 'vitest';
import {
  getAllTranslations,
  getAllTranslationsWithStatus,
  getRegisteredLanguages,
} from '../src/index';

/** The frozen list the default used to be — every one must still be produced. */
const LEGACY_DEFAULT_LANGUAGES = [
  'en',
  'ja',
  'ar',
  'es',
  'ko',
  'zh',
  'tr',
  'pt',
  'fr',
  'de',
  'id',
  'qu',
  'sw',
];

describe('getAllTranslations', () => {
  const input = 'toggle .active on #button';

  it('covers every registered language by default', () => {
    const result = getAllTranslations(input, 'en');
    const registered = getRegisteredLanguages();

    expect(registered.length).toBeGreaterThanOrEqual(24);
    for (const lang of registered) {
      expect(result, `missing translation for registered language "${lang}"`).toHaveProperty(lang);
    }
  });

  it('still returns every language from the legacy 13-language default', () => {
    const result = getAllTranslations(input, 'en');
    for (const lang of LEGACY_DEFAULT_LANGUAGES) {
      expect(result[lang], `missing legacy language "${lang}"`).toBeTruthy();
    }
  });

  it('always includes the explicit key', () => {
    const result = getAllTranslations(input, 'en');
    expect(result['explicit']).toContain('[toggle');
  });

  it('honors an explicit target-language list', () => {
    const result = getAllTranslations(input, 'en', ['ja', 'ko']);
    expect(Object.keys(result).sort()).toEqual(['explicit', 'ja', 'ko']);
  });

  it('reports omissions through getAllTranslationsWithStatus', () => {
    const { translations, failed } = getAllTranslationsWithStatus(input, 'en');

    // Every key is in exactly one of the two maps (bar the explicit key).
    for (const lang of getRegisteredLanguages()) {
      const rendered = Object.prototype.hasOwnProperty.call(translations, lang);
      const dropped = Object.prototype.hasOwnProperty.call(failed, lang);
      expect(rendered !== dropped, `"${lang}" must be either rendered or reported as failed`).toBe(
        true
      );
    }
  });

  it('does not throw when one language fails to render', () => {
    // An unregistered code cannot render; the rest of the request must survive it.
    expect(() => getAllTranslations(input, 'en', ['en', 'ja', 'zzz'])).not.toThrow();
    const { translations, failed } = getAllTranslationsWithStatus(input, 'en', ['en', 'ja', 'zzz']);
    expect(translations['en']).toBeTruthy();
    expect(translations['ja']).toBeTruthy();
    expect(Object.keys(failed)).toContain('zzz');
  });
});
