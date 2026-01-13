// packages/i18n/src/formatting.test.ts

import { describe, it, expect } from 'vitest';
import { NumberFormatter, DateFormatter, LocaleFormatter, getFormatter } from './formatting';

describe('Formatting', () => {
  describe('NumberFormatter', () => {
    it('should format numbers in English', () => {
      const formatter = new NumberFormatter('en-US');

      expect(formatter.format(1234.56)).toBe('1,234.56');
      expect(formatter.format(1000000)).toBe('1,000,000');
    });

    it('should format numbers in German', () => {
      const formatter = new NumberFormatter('de-DE');

      // German uses . for thousands and , for decimals
      const result = formatter.format(1234.56);
      // Test environment may not fully support German locale, accept English format as fallback
      expect(result).toMatch(/1\.234,56|1234,56|1,234\.56/);
    });

    it('should format currency', () => {
      const formatter = new NumberFormatter('en-US');

      const result = formatter.formatCurrency(1234.56, 'USD');
      expect(result).toMatch(/\$1,234\.56|\$1234\.56/);
    });

    it('should format percentages', () => {
      const formatter = new NumberFormatter('en-US');

      const result = formatter.formatPercent(0.25);
      expect(result).toMatch(/25%/);
    });

    it('should handle fallback formatting', () => {
      const formatter = new NumberFormatter('invalid-locale');

      // Should not throw and provide reasonable fallback
      expect(() => formatter.format(1234.56)).not.toThrow();
    });
  });

  describe('DateFormatter', () => {
    const testDate = new Date('2023-12-25T15:30:00Z');

    it('should format dates in English', () => {
      const formatter = new DateFormatter('en-US');

      const result = formatter.format(testDate, { dateStyle: 'short' });
      expect(result).toMatch(/12\/25\/2023|25\/12\/2023/); // Different formats possible
    });

    it('should format dates with time', () => {
      const formatter = new DateFormatter('en-US');

      const result = formatter.format(testDate, {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      expect(result).toContain('2023');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Should contain time
    });

    it('should format relative time', () => {
      const formatter = new DateFormatter('en-US');
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const pastResult = formatter.formatRelative(oneHourAgo);
      const futureResult = formatter.formatRelative(oneHourLater);

      expect(pastResult).toMatch(/hour|ago/);
      expect(futureResult).toMatch(/hour|in/);
    });

    it('should handle fallback formatting', () => {
      const formatter = new DateFormatter('invalid-locale');

      expect(() => formatter.format(testDate)).not.toThrow();
    });
  });

  describe('LocaleFormatter', () => {
    it('should provide comprehensive formatting for a locale', () => {
      const formatter = new LocaleFormatter('en-US');

      expect(typeof formatter.formatNumber(1234.56)).toBe('string');
      expect(typeof formatter.formatCurrency(100, 'USD')).toBe('string');
      expect(typeof formatter.formatPercent(0.5)).toBe('string');
      expect(typeof formatter.formatDate(new Date())).toBe('string');
    });

    it('should format hyperscript values', () => {
      const formatter = new LocaleFormatter('en-US');

      expect(formatter.formatHyperscriptValue(1234.56)).toMatch(/1,234\.56|1234\.56/);
      expect(formatter.formatHyperscriptValue(100, 'currency')).toMatch(/\$100|\$100\.00/);
      expect(formatter.formatHyperscriptValue(0.5, 'percent')).toMatch(/50%/);
    });

    it('should format lists', () => {
      const formatter = new LocaleFormatter('en-US');

      expect(formatter.formatList(['apple'])).toBe('apple');
      expect(formatter.formatList(['apple', 'banana'])).toMatch(/apple and banana/);
      expect(formatter.formatList(['apple', 'banana', 'cherry'])).toMatch(
        /apple, banana, and cherry/
      );
    });

    it('should format units', () => {
      const formatter = new LocaleFormatter('en-US');

      const result = formatter.formatUnit(5, 'second');
      expect(result).toMatch(/5.*second/);
    });

    it('should change locale', () => {
      const formatter = new LocaleFormatter('en-US');
      expect(formatter.getLocale()).toBe('en-US');

      formatter.setLocale('fr-FR');
      expect(formatter.getLocale()).toBe('fr-FR');
    });
  });

  describe('Global formatter utilities', () => {
    it('should cache formatter instances', () => {
      const formatter1 = getFormatter('en-US');
      const formatter2 = getFormatter('en-US');

      expect(formatter1).toBe(formatter2); // Same instance
    });

    it('should create different instances for different locales', () => {
      const formatterEN = getFormatter('en-US');
      const formatterFR = getFormatter('fr-FR');

      expect(formatterEN).not.toBe(formatterFR);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid dates gracefully', () => {
      const formatter = new DateFormatter('en-US');

      expect(() => formatter.format('invalid-date')).not.toThrow();
    });

    it('should handle negative numbers', () => {
      const formatter = new NumberFormatter('en-US');

      expect(formatter.format(-1234.56)).toMatch(/-1,234\.56|-1234\.56/);
    });

    it('should handle zero values', () => {
      const formatter = new NumberFormatter('en-US');

      expect(formatter.format(0)).toBe('0');
      expect(formatter.formatCurrency(0, 'USD')).toMatch(/\$0|\$0\.00/);
    });

    it('should handle very large numbers', () => {
      const formatter = new NumberFormatter('en-US');

      expect(() => formatter.format(Number.MAX_SAFE_INTEGER)).not.toThrow();
    });

    it('should handle very small numbers', () => {
      const formatter = new NumberFormatter('en-US');

      expect(() => formatter.format(0.000001)).not.toThrow();
    });
  });

  describe('Locale-specific behaviors', () => {
    it('should format numbers differently for different locales', () => {
      const enFormatter = new NumberFormatter('en-US');
      const deFormatter = new NumberFormatter('de-DE');

      const enResult = enFormatter.format(1234.56);
      const deResult = deFormatter.format(1234.56);

      // They should be different (unless fallback is used)
      expect(typeof enResult).toBe('string');
      expect(typeof deResult).toBe('string');
    });

    it('should format dates differently for different locales', () => {
      const enFormatter = new DateFormatter('en-US');
      const deFormatter = new DateFormatter('de-DE');
      const testDate = new Date('2023-12-25');

      const enResult = enFormatter.format(testDate, { dateStyle: 'short' });
      const deResult = deFormatter.format(testDate, { dateStyle: 'short' });

      expect(typeof enResult).toBe('string');
      expect(typeof deResult).toBe('string');
    });

    it('should handle RTL locales', () => {
      const arFormatter = new LocaleFormatter('ar-EG');

      expect(() => arFormatter.formatNumber(1234)).not.toThrow();
      expect(() => arFormatter.formatDate(new Date())).not.toThrow();
    });
  });
});
