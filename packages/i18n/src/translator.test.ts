// packages/i18n/src/translator.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { HyperscriptTranslator } from './translator';
import { Dictionary } from './types';

describe('HyperscriptTranslator', () => {
  let translator: HyperscriptTranslator;

  const testDictionary: Dictionary = {
    commands: {
      on: 'sur',
      click: 'cliquer',
      set: 'définir',
      get: 'obtenir',
    },
    modifiers: {
      to: 'à',
      from: 'de',
    },
    events: {
      click: 'clic',
    },
    logical: {
      and: 'et',
      or: 'ou',
    },
    temporal: {
      seconds: 'secondes',
    },
    values: {
      true: 'vrai',
      false: 'faux',
    },
    attributes: {
      class: 'classe',
    },
  };

  beforeEach(() => {
    translator = new HyperscriptTranslator({
      locale: 'en',
      dictionaries: {
        fr: testDictionary,
      },
    });
  });

  describe('basic translation', () => {
    it('should translate simple commands', () => {
      const result = translator.translate('on click set #value', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('sur clic définir #value');
    });

    it('should handle mixed content', () => {
      const result = translator.translate('on click get .className and set #result', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('sur clic obtenir .className et définir #result');
    });

    it('should preserve identifiers and literals', () => {
      const result = translator.translate('on click set #myId to "hello world"', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('sur clic définir #myId à "hello world"');
    });

    it('should handle boolean values', () => {
      const result = translator.translate('set #visible to true', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('définir #visible à vrai');
    });
  });

  describe('translation with details', () => {
    it('should return detailed translation result', () => {
      const result = translator.translateWithDetails('on click set #value', {
        from: 'en',
        to: 'fr',
      });

      expect(result.translated).toBe('sur clic définir #value');
      expect(result.locale.from).toBe('en');
      expect(result.locale.to).toBe('fr');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should preserve original when requested', () => {
      const result = translator.translateWithDetails('on click', {
        from: 'en',
        to: 'fr',
        preserveOriginal: true,
      });

      expect(result.original).toBe('on click');
    });
  });

  describe('language detection', () => {
    it('should detect language from content', () => {
      const detected = translator.detectLanguage('sur clic définir');
      expect(detected).toBe('fr');
    });

    it('should fallback to default when detection disabled', () => {
      const translator2 = new HyperscriptTranslator({
        locale: 'en',
        detectLocale: false,
      });

      const detected = translator2.detectLanguage('sur clic définir');
      expect(detected).toBe('en');
    });
  });

  describe('dictionary management', () => {
    it('should add new dictionaries', () => {
      const newDict: Dictionary = {
        commands: { test: 'prueba' },
        modifiers: {},
        events: {},
        logical: {},
        temporal: {},
        values: {},
        attributes: {},
      };

      translator.addDictionary('es', newDict);
      expect(translator.getSupportedLocales()).toContain('es');
    });

    it('should validate dictionaries', () => {
      const validation = translator.validateDictionary('fr');
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
    });
  });

  describe('RTL support', () => {
    it('should identify RTL locales', () => {
      expect(translator.isRTL('ar')).toBe(true);
      expect(translator.isRTL('he')).toBe(true);
      expect(translator.isRTL('en')).toBe(false);
      expect(translator.isRTL('fr')).toBe(false);
    });
  });

  describe('completions', () => {
    it('should provide completions for partial input', () => {
      const completions = translator.getCompletions({
        text: 'on cl',
        position: 5,
        locale: 'fr',
      });

      expect(completions).toContain('cliquer');
    });

    it('should handle empty partial input', () => {
      const completions = translator.getCompletions({
        text: 'on ',
        position: 3,
        locale: 'fr',
      });

      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle same source and target locale', () => {
      const result = translator.translate('on click', {
        from: 'en',
        to: 'en',
      });

      expect(result).toBe('on click');
    });

    it('should handle missing dictionary gracefully', () => {
      expect(() => {
        translator.translate('on click', {
          from: 'en',
          to: 'nonexistent',
        });
      }).toThrow();
    });

    it('should handle empty input', () => {
      const result = translator.translate('', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('');
    });

    it('should handle complex hyperscript expressions', () => {
      const input = 'on click if #myInput.value then set .result to true else set .result to false';
      const result = translator.translate(input, {
        from: 'en',
        to: 'fr',
      });

      // Should translate keywords but preserve selectors and structure
      expect(result).toContain('sur');
      expect(result).toContain('clic');
      expect(result).toContain('définir');
      expect(result).toContain('#myInput.value');
      expect(result).toContain('.result');
    });
  });

  describe('whitespace and formatting preservation', () => {
    it('should preserve whitespace', () => {
      const result = translator.translate('on  click   set #value', {
        from: 'en',
        to: 'fr',
      });

      expect(result).toBe('sur  clic   définir #value');
    });

    it('should preserve line breaks', () => {
      const input = `on click
        set #value
        to true`;

      const result = translator.translate(input, {
        from: 'en',
        to: 'fr',
      });

      expect(result).toContain('\n');
      expect(result).toContain('sur');
      expect(result).toContain('définir');
    });
  });
});
