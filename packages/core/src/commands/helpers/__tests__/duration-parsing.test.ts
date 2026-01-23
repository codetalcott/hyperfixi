/**
 * Unit Tests for Duration Parsing Helper
 *
 * Tests duration/time parsing utilities used by wait, transition, settle commands.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDuration,
  parseDurationStrict,
  parseCSSDurations,
  calculateMaxAnimationTime,
  camelToKebab,
  kebabToCamel,
  formatDuration,
} from '../duration-parsing';

// ========== Tests ==========

describe('Duration Parsing Helper', () => {
  // ========== parseDuration ==========

  describe('parseDuration', () => {
    describe('number inputs', () => {
      it('should return number as-is (floored) when input is a number', () => {
        expect(parseDuration(500)).toBe(500);
        expect(parseDuration(1000)).toBe(1000);
        expect(parseDuration(0)).toBe(0);
      });

      it('should floor decimal numbers', () => {
        expect(parseDuration(500.7)).toBe(500);
        expect(parseDuration(1.9)).toBe(1);
        expect(parseDuration(999.1)).toBe(999);
      });

      it('should clamp negative numbers to 0', () => {
        expect(parseDuration(-100)).toBe(0);
        expect(parseDuration(-1)).toBe(0);
      });
    });

    describe('millisecond string inputs', () => {
      it('should parse milliseconds with "ms" suffix', () => {
        expect(parseDuration('500ms')).toBe(500);
        expect(parseDuration('1000ms')).toBe(1000);
        expect(parseDuration('0ms')).toBe(0);
      });

      it('should parse milliseconds with full word suffix', () => {
        expect(parseDuration('500millisecond')).toBe(500);
        expect(parseDuration('500milliseconds')).toBe(500);
      });

      it('should handle spaces before unit', () => {
        expect(parseDuration('500 ms')).toBe(500);
        expect(parseDuration('1000  ms')).toBe(1000);
      });

      it('should handle decimal milliseconds', () => {
        expect(parseDuration('500.5ms')).toBe(500);
        expect(parseDuration('1.9ms')).toBe(1);
      });
    });

    describe('second string inputs', () => {
      it('should parse seconds with "s" suffix', () => {
        expect(parseDuration('2s')).toBe(2000);
        expect(parseDuration('1s')).toBe(1000);
        expect(parseDuration('0s')).toBe(0);
      });

      it('should parse seconds with "sec" suffix', () => {
        expect(parseDuration('2sec')).toBe(2000);
        expect(parseDuration('1sec')).toBe(1000);
      });

      it('should parse seconds with full word suffixes', () => {
        expect(parseDuration('2second')).toBe(2000);
        expect(parseDuration('2seconds')).toBe(2000);
      });

      it('should handle spaces before unit', () => {
        expect(parseDuration('2 s')).toBe(2000);
        expect(parseDuration('1  sec')).toBe(1000);
      });

      it('should handle decimal seconds', () => {
        expect(parseDuration('1.5s')).toBe(1500);
        expect(parseDuration('0.5s')).toBe(500);
        expect(parseDuration('2.25s')).toBe(2250);
      });
    });

    describe('default suffix behavior', () => {
      it('should treat numbers without suffix as milliseconds', () => {
        expect(parseDuration('500')).toBe(500);
        expect(parseDuration('1000')).toBe(1000);
      });
    });

    describe('case insensitivity', () => {
      it('should be case-insensitive for units', () => {
        expect(parseDuration('2S')).toBe(2000);
        expect(parseDuration('500MS')).toBe(500);
        expect(parseDuration('2SEC')).toBe(2000);
        expect(parseDuration('2SECONDS')).toBe(2000);
      });
    });

    describe('invalid inputs and defaults', () => {
      it('should return default when input is invalid string', () => {
        expect(parseDuration('invalid')).toBe(300);
        expect(parseDuration('abc')).toBe(300);
        expect(parseDuration('s')).toBe(300);
      });

      it('should return default when input is non-string/non-number', () => {
        expect(parseDuration(null)).toBe(300);
        expect(parseDuration(undefined)).toBe(300);
        expect(parseDuration({})).toBe(300);
        expect(parseDuration([])).toBe(300);
      });

      it('should use custom default when provided', () => {
        expect(parseDuration('invalid', 500)).toBe(500);
        expect(parseDuration(null, 1000)).toBe(1000);
      });

      it('should trim whitespace', () => {
        expect(parseDuration('  500ms  ')).toBe(500);
        expect(parseDuration('\t2s\n')).toBe(2000);
      });
    });
  });

  // ========== parseDurationStrict ==========

  describe('parseDurationStrict', () => {
    describe('valid inputs', () => {
      it('should parse number inputs', () => {
        expect(parseDurationStrict(500)).toBe(500);
        expect(parseDurationStrict(1000)).toBe(1000);
        expect(parseDurationStrict(0)).toBe(0);
      });

      it('should floor decimal numbers', () => {
        expect(parseDurationStrict(500.7)).toBe(500);
        expect(parseDurationStrict(1.9)).toBe(1);
      });

      it('should parse string with units', () => {
        expect(parseDurationStrict('500ms')).toBe(500);
        expect(parseDurationStrict('2s')).toBe(2000);
        expect(parseDurationStrict('1.5sec')).toBe(1500);
      });
    });

    describe('error handling', () => {
      it('should throw on negative numbers', () => {
        expect(() => parseDurationStrict(-100)).toThrow('Duration must be >= 0');
        expect(() => parseDurationStrict(-1)).toThrow('Duration must be >= 0');
      });

      it('should throw on invalid string format', () => {
        expect(() => parseDurationStrict('invalid')).toThrow('Invalid duration format');
        expect(() => parseDurationStrict('abc')).toThrow('Invalid duration format');
        expect(() => parseDurationStrict('s')).toThrow('Invalid duration format');
      });

      it('should throw on invalid type', () => {
        expect(() => parseDurationStrict(null)).toThrow('Invalid duration type');
        expect(() => parseDurationStrict(undefined)).toThrow('Invalid duration type');
        expect(() => parseDurationStrict({})).toThrow('Invalid duration type');
        expect(() => parseDurationStrict([])).toThrow('Invalid duration type');
      });
    });
  });

  // ========== parseCSSDurations ==========

  describe('parseCSSDurations', () => {
    describe('single values', () => {
      it('should parse single second value', () => {
        expect(parseCSSDurations('1s')).toEqual([1000]);
        expect(parseCSSDurations('2s')).toEqual([2000]);
      });

      it('should parse single millisecond value', () => {
        expect(parseCSSDurations('500ms')).toEqual([500]);
        expect(parseCSSDurations('1000ms')).toEqual([1000]);
      });

      it('should parse decimal seconds', () => {
        expect(parseCSSDurations('0.5s')).toEqual([500]);
        expect(parseCSSDurations('1.5s')).toEqual([1500]);
      });
    });

    describe('multiple values', () => {
      it('should parse comma-separated seconds', () => {
        expect(parseCSSDurations('1s, 2s')).toEqual([1000, 2000]);
        expect(parseCSSDurations('0.5s, 1s, 1.5s')).toEqual([500, 1000, 1500]);
      });

      it('should parse comma-separated milliseconds', () => {
        expect(parseCSSDurations('500ms, 1000ms')).toEqual([500, 1000]);
      });

      it('should parse mixed units', () => {
        expect(parseCSSDurations('1s, 500ms')).toEqual([1000, 500]);
      });

      it('should handle spaces around commas', () => {
        expect(parseCSSDurations('1s , 2s')).toEqual([1000, 2000]);
        expect(parseCSSDurations('1s,2s')).toEqual([1000, 2000]);
      });
    });

    describe('edge cases', () => {
      it('should return [0] for empty string', () => {
        expect(parseCSSDurations('')).toEqual([0]);
      });

      it('should return [0] for "none"', () => {
        expect(parseCSSDurations('none')).toEqual([0]);
      });

      it('should return 0 for invalid values in list', () => {
        expect(parseCSSDurations('1s, invalid, 2s')).toEqual([1000, 0, 2000]);
      });

      it('should handle zero values', () => {
        expect(parseCSSDurations('0s')).toEqual([0]);
        expect(parseCSSDurations('0ms')).toEqual([0]);
      });
    });
  });

  // ========== calculateMaxAnimationTime ==========

  describe('calculateMaxAnimationTime', () => {
    describe('basic calculations', () => {
      it('should calculate max time with single duration and delay', () => {
        expect(calculateMaxAnimationTime([1000], [500])).toBe(1500);
      });

      it('should calculate max time with multiple durations and delays', () => {
        expect(calculateMaxAnimationTime([1000, 2000], [500, 100])).toBe(2100);
      });

      it('should handle zero durations', () => {
        expect(calculateMaxAnimationTime([0], [0])).toBe(0);
        expect(calculateMaxAnimationTime([0, 1000], [0, 500])).toBe(1500);
      });

      it('should handle zero delays', () => {
        expect(calculateMaxAnimationTime([1000], [0])).toBe(1000);
        expect(calculateMaxAnimationTime([1000, 2000], [0, 0])).toBe(2000);
      });
    });

    describe('array length mismatches', () => {
      it('should handle more durations than delays', () => {
        expect(calculateMaxAnimationTime([1000, 2000, 3000], [500])).toBe(3000);
      });

      it('should handle more delays than durations', () => {
        expect(calculateMaxAnimationTime([1000], [500, 1000, 1500])).toBe(1500);
      });

      it('should use 0 for missing values', () => {
        expect(calculateMaxAnimationTime([1000, 2000], [500])).toBe(2000);
      });
    });

    describe('empty arrays', () => {
      it('should return 0 for empty arrays', () => {
        expect(calculateMaxAnimationTime([], [])).toBe(0);
      });

      it('should return 0 for empty durations', () => {
        expect(calculateMaxAnimationTime([], [500, 1000])).toBe(0);
      });

      it('should handle empty delays', () => {
        expect(calculateMaxAnimationTime([1000, 2000], [])).toBe(2000);
      });
    });

    describe('real-world examples', () => {
      it('should handle typical CSS transition timing', () => {
        // transition-duration: 1s, 0.5s
        // transition-delay: 0s, 0.2s
        const durations = [1000, 500];
        const delays = [0, 200];
        expect(calculateMaxAnimationTime(durations, delays)).toBe(1000);
      });

      it('should handle staggered animations', () => {
        // Increasing delays with same duration
        const durations = [500, 500, 500];
        const delays = [0, 100, 200];
        expect(calculateMaxAnimationTime(durations, delays)).toBe(700);
      });
    });
  });

  // ========== camelToKebab ==========

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('backgroundColor')).toBe('background-color');
      expect(camelToKebab('fontSize')).toBe('font-size');
      expect(camelToKebab('borderTopWidth')).toBe('border-top-width');
    });

    it('should handle single words', () => {
      expect(camelToKebab('color')).toBe('color');
      expect(camelToKebab('width')).toBe('width');
    });

    it('should handle multiple capital letters', () => {
      expect(camelToKebab('MozTransform')).toBe('-moz-transform');
      expect(camelToKebab('WebkitTransition')).toBe('-webkit-transition');
    });

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('');
    });

    it('should handle already kebab-case strings', () => {
      expect(camelToKebab('background-color')).toBe('background-color');
    });
  });

  // ========== kebabToCamel ==========

  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('background-color')).toBe('backgroundColor');
      expect(kebabToCamel('font-size')).toBe('fontSize');
      expect(kebabToCamel('border-top-width')).toBe('borderTopWidth');
    });

    it('should handle single words', () => {
      expect(kebabToCamel('color')).toBe('color');
      expect(kebabToCamel('width')).toBe('width');
    });

    it('should handle vendor prefixes', () => {
      expect(kebabToCamel('-moz-transform')).toBe('MozTransform');
      expect(kebabToCamel('-webkit-transition')).toBe('WebkitTransition');
    });

    it('should handle empty string', () => {
      expect(kebabToCamel('')).toBe('');
    });

    it('should handle already camelCase strings', () => {
      expect(kebabToCamel('backgroundColor')).toBe('backgroundColor');
    });
  });

  // ========== formatDuration ==========

  describe('formatDuration', () => {
    describe('millisecond formatting', () => {
      it('should format values < 1000 as milliseconds', () => {
        expect(formatDuration(0)).toBe('0ms');
        expect(formatDuration(1)).toBe('1ms');
        expect(formatDuration(500)).toBe('500ms');
        expect(formatDuration(999)).toBe('999ms');
      });
    });

    describe('second formatting', () => {
      it('should format values >= 1000 as seconds', () => {
        expect(formatDuration(1000)).toBe('1s');
        expect(formatDuration(2000)).toBe('2s');
        expect(formatDuration(5000)).toBe('5s');
      });

      it('should format decimal seconds with 1 decimal place', () => {
        expect(formatDuration(1500)).toBe('1.5s');
        expect(formatDuration(2250)).toBe('2.3s'); // 2.25 rounds to 2.3
        expect(formatDuration(1100)).toBe('1.1s');
      });

      it('should handle large values', () => {
        expect(formatDuration(60000)).toBe('60s');
        expect(formatDuration(90500)).toBe('90.5s');
      });
    });

    describe('rounding', () => {
      it('should round to 1 decimal place for seconds', () => {
        expect(formatDuration(1567)).toBe('1.6s');
        expect(formatDuration(2333)).toBe('2.3s');
      });

      it('should show integers without decimal point', () => {
        expect(formatDuration(3000)).toBe('3s');
        expect(formatDuration(10000)).toBe('10s');
      });
    });
  });

  // ========== Round-trip conversions ==========

  describe('round-trip conversions', () => {
    it('should convert camelCase to kebab and back', () => {
      const original = 'backgroundColor';
      const kebab = camelToKebab(original);
      const backToCamel = kebabToCamel(kebab);
      expect(backToCamel).toBe(original);
    });

    it('should convert kebab-case to camel and back', () => {
      const original = 'background-color';
      const camel = kebabToCamel(original);
      const backToKebab = camelToKebab(camel);
      expect(backToKebab).toBe(original);
    });

    it('should parse and format durations consistently', () => {
      expect(formatDuration(parseDuration('1.5s'))).toBe('1.5s');
      expect(formatDuration(parseDuration('500ms'))).toBe('500ms');
      expect(formatDuration(parseDuration('2s'))).toBe('2s');
    });
  });
});
