// packages/i18n/src/pluralization.test.ts

import { describe, it, expect } from 'vitest';
import { pluralRules, getPlural, PluralAwareTranslator } from './pluralization';

describe('Pluralization', () => {
  describe('plural rules', () => {
    it('should handle English pluralization', () => {
      expect(pluralRules.en(1)).toBe('one');
      expect(pluralRules.en(0)).toBe('other');
      expect(pluralRules.en(2)).toBe('other');
      expect(pluralRules.en(5)).toBe('other');
    });

    it('should handle French pluralization', () => {
      expect(pluralRules.fr(0)).toBe('one');
      expect(pluralRules.fr(1)).toBe('one');
      expect(pluralRules.fr(1.5)).toBe('one');
      expect(pluralRules.fr(2)).toBe('other');
      expect(pluralRules.fr(5)).toBe('other');
    });

    it('should handle Russian pluralization (complex)', () => {
      expect(pluralRules.ru(1)).toBe('one');
      expect(pluralRules.ru(21)).toBe('one');
      expect(pluralRules.ru(2)).toBe('few');
      expect(pluralRules.ru(3)).toBe('few');
      expect(pluralRules.ru(4)).toBe('few');
      expect(pluralRules.ru(22)).toBe('few');
      expect(pluralRules.ru(5)).toBe('many');
      expect(pluralRules.ru(11)).toBe('many');
      expect(pluralRules.ru(15)).toBe('many');
    });

    it('should handle Arabic pluralization (with zero)', () => {
      expect(pluralRules.ar(0)).toBe('zero');
      expect(pluralRules.ar(1)).toBe('one');
      expect(pluralRules.ar(2)).toBe('two');
      expect(pluralRules.ar(3)).toBe('few');
      expect(pluralRules.ar(10)).toBe('few');
      expect(pluralRules.ar(11)).toBe('many');
      expect(pluralRules.ar(99)).toBe('many');
      expect(pluralRules.ar(100)).toBe('other');
    });

    it('should handle Chinese (no pluralization)', () => {
      expect(pluralRules.zh(0)).toBe('other');
      expect(pluralRules.zh(1)).toBe('other');
      expect(pluralRules.zh(2)).toBe('other');
      expect(pluralRules.zh(100)).toBe('other');
    });
  });

  describe('getPlural', () => {
    it('should return correct plural form for English', () => {
      const forms = {
        one: 'second',
        other: 'seconds',
      };

      expect(getPlural('en', 1, forms)).toBe('second');
      expect(getPlural('en', 0, forms)).toBe('seconds');
      expect(getPlural('en', 2, forms)).toBe('seconds');
    });

    it('should return correct plural form for Russian', () => {
      const forms = {
        one: 'секунда',
        few: 'секунды',
        many: 'секунд',
        other: 'секунд',
      };

      expect(getPlural('ru', 1, forms)).toBe('секунда');
      expect(getPlural('ru', 2, forms)).toBe('секунды');
      expect(getPlural('ru', 5, forms)).toBe('секунд');
    });

    it('should fallback to other form', () => {
      const forms = {
        other: 'default',
      };

      expect(getPlural('en', 1, forms)).toBe('default');
      expect(getPlural('ru', 1, forms)).toBe('default');
    });
  });

  describe('PluralAwareTranslator', () => {
    describe('translateTimeExpression', () => {
      it('should translate English time expressions', () => {
        expect(PluralAwareTranslator.translateTimeExpression(1, 'second', 'en')).toBe('1 second');
        expect(PluralAwareTranslator.translateTimeExpression(2, 'second', 'en')).toBe('2 seconds');
        expect(PluralAwareTranslator.translateTimeExpression(1, 'minute', 'en')).toBe('1 minute');
        expect(PluralAwareTranslator.translateTimeExpression(5, 'minute', 'en')).toBe('5 minutes');
      });

      it('should translate Spanish time expressions', () => {
        expect(PluralAwareTranslator.translateTimeExpression(1, 'second', 'es')).toBe('1 segundo');
        expect(PluralAwareTranslator.translateTimeExpression(2, 'second', 'es')).toBe('2 segundos');
        expect(PluralAwareTranslator.translateTimeExpression(1, 'hour', 'es')).toBe('1 hora');
        expect(PluralAwareTranslator.translateTimeExpression(3, 'hour', 'es')).toBe('3 horas');
      });

      it('should translate Russian time expressions', () => {
        expect(PluralAwareTranslator.translateTimeExpression(1, 'second', 'ru')).toBe('1 секунда');
        expect(PluralAwareTranslator.translateTimeExpression(2, 'second', 'ru')).toBe('2 секунды');
        expect(PluralAwareTranslator.translateTimeExpression(5, 'second', 'ru')).toBe('5 секунд');
      });

      it('should translate Arabic time expressions', () => {
        expect(PluralAwareTranslator.translateTimeExpression(0, 'second', 'ar')).toBe('0 ثوانِ');
        expect(PluralAwareTranslator.translateTimeExpression(1, 'second', 'ar')).toBe('1 ثانية');
        expect(PluralAwareTranslator.translateTimeExpression(2, 'second', 'ar')).toBe('2 ثانيتان');
        expect(PluralAwareTranslator.translateTimeExpression(3, 'second', 'ar')).toBe('3 ثوانِ');
      });

      it('should handle unsupported locales with fallback', () => {
        expect(PluralAwareTranslator.translateTimeExpression(1, 'second', 'unknown')).toBe(
          '1 second'
        );
        expect(PluralAwareTranslator.translateTimeExpression(2, 'second', 'unknown')).toBe(
          '2 seconds'
        );
      });
    });

    describe('translateHyperscriptTime', () => {
      it('should translate time expressions in hyperscript', () => {
        const input = 'wait 5 seconds then wait 1 minute';
        const result = PluralAwareTranslator.translateHyperscriptTime(input, 'es');

        expect(result).toBe('wait 5 segundos then wait 1 minuto');
      });

      it('should handle milliseconds', () => {
        const input = 'wait 500 milliseconds';
        const result = PluralAwareTranslator.translateHyperscriptTime(input, 'en');

        expect(result).toBe('wait 500 milliseconds');
      });

      it('should handle abbreviated forms', () => {
        const input = 'wait 100 ms';
        const result = PluralAwareTranslator.translateHyperscriptTime(input, 'en');

        expect(result).toBe('wait 100 milliseconds');
      });

      it('should preserve non-time content', () => {
        const input = 'on click wait 2 seconds then show #result';
        const result = PluralAwareTranslator.translateHyperscriptTime(input, 'es');

        expect(result).toBe('on click wait 2 segundos then show #result');
      });
    });

    describe('getOrdinal', () => {
      it('should generate English ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'en')).toBe('1st');
        expect(PluralAwareTranslator.getOrdinal(2, 'en')).toBe('2nd');
        expect(PluralAwareTranslator.getOrdinal(3, 'en')).toBe('3rd');
        expect(PluralAwareTranslator.getOrdinal(4, 'en')).toBe('4th');
        expect(PluralAwareTranslator.getOrdinal(11, 'en')).toBe('11th');
        expect(PluralAwareTranslator.getOrdinal(21, 'en')).toBe('21st');
        expect(PluralAwareTranslator.getOrdinal(22, 'en')).toBe('22nd');
        expect(PluralAwareTranslator.getOrdinal(23, 'en')).toBe('23rd');
      });

      it('should generate Spanish ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'es')).toBe('1º');
        expect(PluralAwareTranslator.getOrdinal(5, 'es')).toBe('5º');
      });

      it('should generate French ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'fr')).toBe('1er');
        expect(PluralAwareTranslator.getOrdinal(2, 'fr')).toBe('2e');
        expect(PluralAwareTranslator.getOrdinal(5, 'fr')).toBe('5e');
      });

      it('should generate Chinese ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'zh')).toBe('第1');
        expect(PluralAwareTranslator.getOrdinal(5, 'zh')).toBe('第5');
      });

      it('should generate Japanese ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'ja')).toBe('1番目');
        expect(PluralAwareTranslator.getOrdinal(5, 'ja')).toBe('5番目');
      });

      it('should generate Korean ordinals', () => {
        expect(PluralAwareTranslator.getOrdinal(1, 'ko')).toBe('1번째');
        expect(PluralAwareTranslator.getOrdinal(5, 'ko')).toBe('5번째');
      });
    });
  });
});
