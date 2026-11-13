/**
 * Unit tests for BaseTokenizer utilities.
 *
 * Tests the extracted helper functions and factory methods used across tokenizers:
 * - createUnicodeRangeClassifier() - Unicode character classification
 * - combineClassifiers() - Combining multiple classifiers
 * - createLatinCharClassifiers() - Latin-based language character classification
 * - tryMatchTimeUnit() - Time unit pattern matching
 * - parseBaseNumber() - Number parsing without time units
 * - tryNumberWithTimeUnits() - Complete number + time unit parsing
 */

import { describe, it, expect } from 'vitest';
import {
  createUnicodeRangeClassifier,
  combineClassifiers,
  createLatinCharClassifiers,
  BaseTokenizer,
  TokenStreamImpl,
  type TimeUnitMapping,
} from '../../src/tokenizers/base';
import type { TokenStream, TokenKind } from '../../src/types';

// =============================================================================
// Test Subclass for Protected Methods
// =============================================================================

/**
 * Test subclass to expose protected methods for testing.
 */
class TestableTokenizer extends BaseTokenizer {
  readonly language = 'test';
  readonly direction = 'ltr' as const;

  tokenize(_input: string): TokenStream {
    return new TokenStreamImpl([], 'test');
  }

  classifyToken(_token: string): TokenKind {
    return 'identifier';
  }

  // Expose protected methods for testing
  public testTryMatchTimeUnit(
    input: string,
    pos: number,
    timeUnits: readonly TimeUnitMapping[],
    skipWhitespace = false
  ) {
    return this.tryMatchTimeUnit(input, pos, timeUnits, skipWhitespace);
  }

  public testParseBaseNumber(input: string, startPos: number, allowSign = true) {
    return this.parseBaseNumber(input, startPos, allowSign);
  }

  public testTryNumberWithTimeUnits(
    input: string,
    pos: number,
    nativeTimeUnits: readonly TimeUnitMapping[],
    options?: { allowSign?: boolean; skipWhitespace?: boolean }
  ) {
    return this.tryNumberWithTimeUnits(input, pos, nativeTimeUnits, options);
  }

  public getStandardTimeUnits() {
    return BaseTokenizer.STANDARD_TIME_UNITS;
  }
}

// =============================================================================
// createUnicodeRangeClassifier Tests
// =============================================================================

describe('createUnicodeRangeClassifier', () => {
  describe('basic range matching', () => {
    it('should match character within a single range', () => {
      // Hiragana range: U+3040-U+309F
      const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);

      expect(isHiragana('あ')).toBe(true); // U+3042
      expect(isHiragana('い')).toBe(true); // U+3044
      expect(isHiragana('ん')).toBe(true); // U+3093 (end of commonly used hiragana)
    });

    it('should not match character outside the range', () => {
      const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);

      expect(isHiragana('ア')).toBe(false); // Katakana U+30A2
      expect(isHiragana('漢')).toBe(false); // Kanji
      expect(isHiragana('a')).toBe(false); // ASCII
    });

    it('should match at range boundaries', () => {
      const isInRange = createUnicodeRangeClassifier([[0x0041, 0x005a]]); // A-Z

      expect(isInRange('A')).toBe(true); // Start of range
      expect(isInRange('Z')).toBe(true); // End of range
      expect(isInRange('@')).toBe(false); // Just before A
      expect(isInRange('[')).toBe(false); // Just after Z
    });
  });

  describe('multiple ranges', () => {
    it('should match characters in any of multiple ranges', () => {
      // Korean Hangul ranges
      const isKorean = createUnicodeRangeClassifier([
        [0xac00, 0xd7a3], // Hangul syllables
        [0x1100, 0x11ff], // Hangul Jamo
        [0x3130, 0x318f], // Hangul Compatibility Jamo
      ]);

      expect(isKorean('가')).toBe(true); // Hangul syllable U+AC00
      expect(isKorean('힣')).toBe(true); // Hangul syllable U+D7A3 (last syllable)
      expect(isKorean('ㄱ')).toBe(true); // Compatibility Jamo U+3131
    });

    it('should not match characters outside all ranges', () => {
      const isKorean = createUnicodeRangeClassifier([
        [0xac00, 0xd7a3],
        [0x1100, 0x11ff],
        [0x3130, 0x318f],
      ]);

      expect(isKorean('あ')).toBe(false); // Japanese hiragana
      expect(isKorean('中')).toBe(false); // Chinese character
      expect(isKorean('a')).toBe(false); // ASCII
    });
  });

  describe('edge cases', () => {
    it('should handle empty ranges array', () => {
      const isEmpty = createUnicodeRangeClassifier([]);

      expect(isEmpty('a')).toBe(false);
      expect(isEmpty('あ')).toBe(false);
      expect(isEmpty('')).toBe(false);
    });

    it('should handle single-character ranges', () => {
      const isExactlyA = createUnicodeRangeClassifier([[0x0041, 0x0041]]);

      expect(isExactlyA('A')).toBe(true);
      expect(isExactlyA('B')).toBe(false);
      expect(isExactlyA('a')).toBe(false);
    });

    it('should handle overlapping ranges', () => {
      // Overlapping ranges shouldn't cause issues
      const isInOverlap = createUnicodeRangeClassifier([
        [0x0041, 0x004d], // A-M
        [0x0048, 0x005a], // H-Z (overlaps with A-M)
      ]);

      expect(isInOverlap('A')).toBe(true);
      expect(isInOverlap('H')).toBe(true); // In both ranges
      expect(isInOverlap('Z')).toBe(true);
      expect(isInOverlap('@')).toBe(false);
    });

    it('should only check the first character of a string', () => {
      const isUppercase = createUnicodeRangeClassifier([[0x0041, 0x005a]]);

      expect(isUppercase('ABC')).toBe(true); // Checks 'A'
      expect(isUppercase('abc')).toBe(false); // Checks 'a'
    });
  });
});

// =============================================================================
// combineClassifiers Tests
// =============================================================================

describe('combineClassifiers', () => {
  describe('combining multiple classifiers', () => {
    it('should return true if any classifier returns true', () => {
      const isA = (c: string) => c === 'a';
      const isB = (c: string) => c === 'b';
      const isAorB = combineClassifiers(isA, isB);

      expect(isAorB('a')).toBe(true);
      expect(isAorB('b')).toBe(true);
      expect(isAorB('c')).toBe(false);
    });

    it('should combine three classifiers', () => {
      const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);
      const isKatakana = createUnicodeRangeClassifier([[0x30a0, 0x30ff]]);
      const isKanji = createUnicodeRangeClassifier([[0x4e00, 0x9fff]]);
      const isJapanese = combineClassifiers(isHiragana, isKatakana, isKanji);

      expect(isJapanese('あ')).toBe(true); // Hiragana
      expect(isJapanese('ア')).toBe(true); // Katakana
      expect(isJapanese('漢')).toBe(true); // Kanji
      expect(isJapanese('a')).toBe(false); // ASCII
      expect(isJapanese('가')).toBe(false); // Korean
    });
  });

  describe('edge cases', () => {
    it('should return false when combining zero classifiers', () => {
      const noClassifiers = combineClassifiers();

      expect(noClassifiers('a')).toBe(false);
      expect(noClassifiers('')).toBe(false);
    });

    it('should work with a single classifier', () => {
      const isDigit = (c: string) => /\d/.test(c);
      const combined = combineClassifiers(isDigit);

      expect(combined('5')).toBe(true);
      expect(combined('a')).toBe(false);
    });

    it('should short-circuit on first true', () => {
      let callCount = 0;
      const first = () => {
        callCount++;
        return true;
      };
      const second = () => {
        callCount++;
        return false;
      };
      const combined = combineClassifiers(first, second);

      combined('x');
      // Array.some short-circuits, so second should not be called
      expect(callCount).toBe(1);
    });
  });
});

// =============================================================================
// createLatinCharClassifiers Tests
// =============================================================================

describe('createLatinCharClassifiers', () => {
  describe('basic Latin classification', () => {
    it('should create classifiers for basic Latin letters', () => {
      const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-Z]/);

      expect(isLetter('a')).toBe(true);
      expect(isLetter('Z')).toBe(true);
      expect(isLetter('5')).toBe(false);
      expect(isLetter('_')).toBe(false);

      expect(isIdentifierChar('a')).toBe(true);
      expect(isIdentifierChar('5')).toBe(true);
      expect(isIdentifierChar('_')).toBe(true);
      expect(isIdentifierChar('-')).toBe(true);
      expect(isIdentifierChar(' ')).toBe(false);
    });
  });

  describe('Spanish characters', () => {
    it('should handle Spanish accented letters', () => {
      const { isLetter, isIdentifierChar } = createLatinCharClassifiers(
        /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/
      );

      expect(isLetter('ñ')).toBe(true);
      expect(isLetter('á')).toBe(true);
      expect(isLetter('ü')).toBe(true);
      expect(isLetter('Ñ')).toBe(true);
      expect(isLetter('ä')).toBe(false); // German umlaut not in Spanish

      expect(isIdentifierChar('ñ')).toBe(true);
      expect(isIdentifierChar('1')).toBe(true);
    });
  });

  describe('German characters', () => {
    it('should handle German special characters', () => {
      const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-ZäöüÄÖÜß]/);

      expect(isLetter('ä')).toBe(true);
      expect(isLetter('ß')).toBe(true);
      expect(isLetter('Ö')).toBe(true);
      expect(isLetter('é')).toBe(false); // French accent not in German set

      expect(isIdentifierChar('ß')).toBe(true);
      expect(isIdentifierChar('_')).toBe(true);
    });
  });

  describe('French characters', () => {
    it('should handle French accented letters', () => {
      const { isLetter } = createLatinCharClassifiers(
        /[a-zA-ZàâæçéèêëïîôùûüÿœÀÂÆÇÉÈÊËÏÎÔÙÛÜŸŒ]/
      );

      expect(isLetter('é')).toBe(true);
      expect(isLetter('ç')).toBe(true);
      expect(isLetter('œ')).toBe(true);
      expect(isLetter('ñ')).toBe(false); // Spanish not in French set
    });
  });

  describe('identifier character edge cases', () => {
    it('should include digits and common identifier chars', () => {
      const { isIdentifierChar } = createLatinCharClassifiers(/[a-zA-Z]/);

      // Digits
      expect(isIdentifierChar('0')).toBe(true);
      expect(isIdentifierChar('9')).toBe(true);

      // Common identifier characters
      expect(isIdentifierChar('_')).toBe(true);
      expect(isIdentifierChar('-')).toBe(true);

      // Excluded characters
      expect(isIdentifierChar(' ')).toBe(false);
      expect(isIdentifierChar('.')).toBe(false);
      expect(isIdentifierChar('!')).toBe(false);
      expect(isIdentifierChar('#')).toBe(false);
    });
  });
});

// =============================================================================
// tryMatchTimeUnit Tests
// =============================================================================

describe('tryMatchTimeUnit', () => {
  const tokenizer = new TestableTokenizer();

  const testUnits: TimeUnitMapping[] = [
    { pattern: 'milisegundos', suffix: 'ms', length: 12, caseInsensitive: true },
    { pattern: 'segundos', suffix: 's', length: 8, caseInsensitive: true },
    { pattern: 'segundo', suffix: 's', length: 7, caseInsensitive: true },
    { pattern: 'ms', suffix: 'ms', length: 2 },
    { pattern: 's', suffix: 's', length: 1, checkBoundary: true },
    { pattern: 'm', suffix: 'm', length: 1, checkBoundary: true, notFollowedBy: 's' },
    { pattern: 'h', suffix: 'h', length: 1, checkBoundary: true },
  ];

  describe('basic matching', () => {
    it('should match exact patterns', () => {
      const result = tokenizer.testTryMatchTimeUnit('500ms', 3, testUnits);
      expect(result).toEqual({ suffix: 'ms', endPos: 5 });
    });

    it('should match longer patterns first (sorted by length)', () => {
      const result = tokenizer.testTryMatchTimeUnit('2segundos', 1, testUnits);
      expect(result).toEqual({ suffix: 's', endPos: 9 });
    });

    it('should return null for no match', () => {
      const result = tokenizer.testTryMatchTimeUnit('100xyz', 3, testUnits);
      expect(result).toBeNull();
    });
  });

  describe('case sensitivity', () => {
    it('should match case-insensitively when configured', () => {
      const result = tokenizer.testTryMatchTimeUnit('5SEGUNDOS', 1, testUnits);
      expect(result).toEqual({ suffix: 's', endPos: 9 });
    });

    it('should not match case-sensitively for units without caseInsensitive flag', () => {
      const result = tokenizer.testTryMatchTimeUnit('5MS', 1, testUnits);
      expect(result).toBeNull(); // 'ms' is case-sensitive, 'MS' doesn't match
    });
  });

  describe('boundary checking', () => {
    it('should enforce word boundary when checkBoundary is true', () => {
      // 's' followed by letter should not match
      const result = tokenizer.testTryMatchTimeUnit('5seconds', 1, testUnits);
      expect(result).toBeNull(); // 's' at pos 1, followed by 'e' - not a boundary
    });

    it('should match at end of input', () => {
      const result = tokenizer.testTryMatchTimeUnit('5s', 1, testUnits);
      expect(result).toEqual({ suffix: 's', endPos: 2 });
    });

    it('should match when followed by whitespace', () => {
      const result = tokenizer.testTryMatchTimeUnit('5s ', 1, testUnits);
      expect(result).toEqual({ suffix: 's', endPos: 2 });
    });
  });

  describe('notFollowedBy constraint', () => {
    it('should skip m when followed by s (to avoid matching ms as m)', () => {
      // 'm' with notFollowedBy: 's' should not match 'ms'
      const result = tokenizer.testTryMatchTimeUnit('5ms', 1, testUnits);
      expect(result?.suffix).toBe('ms'); // Should match 'ms', not 'm'
    });

    it('should match m when not followed by s', () => {
      const result = tokenizer.testTryMatchTimeUnit('5m', 1, testUnits);
      expect(result).toEqual({ suffix: 'm', endPos: 2 });
    });
  });

  describe('whitespace skipping', () => {
    it('should skip whitespace when skipWhitespace is true', () => {
      const result = tokenizer.testTryMatchTimeUnit('500 ms', 3, testUnits, true);
      expect(result).toEqual({ suffix: 'ms', endPos: 6 });
    });

    it('should not skip whitespace when skipWhitespace is false', () => {
      const result = tokenizer.testTryMatchTimeUnit('500 ms', 3, testUnits, false);
      expect(result).toBeNull(); // Space at pos 3, 'ms' not matched
    });

    it('should handle multiple spaces', () => {
      const result = tokenizer.testTryMatchTimeUnit('500   ms', 3, testUnits, true);
      expect(result).toEqual({ suffix: 'ms', endPos: 8 });
    });
  });
});

// =============================================================================
// parseBaseNumber Tests
// =============================================================================

describe('parseBaseNumber', () => {
  const tokenizer = new TestableTokenizer();

  describe('integers', () => {
    it('should parse positive integers', () => {
      const result = tokenizer.testParseBaseNumber('123', 0);
      expect(result).toEqual({ number: '123', endPos: 3 });
    });

    it('should parse single digit', () => {
      const result = tokenizer.testParseBaseNumber('5', 0);
      expect(result).toEqual({ number: '5', endPos: 1 });
    });

    it('should parse from middle of string', () => {
      const result = tokenizer.testParseBaseNumber('abc123xyz', 3);
      expect(result).toEqual({ number: '123', endPos: 6 });
    });
  });

  describe('signed numbers', () => {
    it('should parse negative numbers', () => {
      const result = tokenizer.testParseBaseNumber('-42', 0);
      expect(result).toEqual({ number: '-42', endPos: 3 });
    });

    it('should parse positive numbers with explicit sign', () => {
      const result = tokenizer.testParseBaseNumber('+42', 0);
      expect(result).toEqual({ number: '+42', endPos: 3 });
    });

    it('should reject sign without digits when allowSign is true', () => {
      const result = tokenizer.testParseBaseNumber('-abc', 0);
      expect(result).toBeNull();
    });

    it('should not parse sign when allowSign is false', () => {
      const result = tokenizer.testParseBaseNumber('-42', 0, false);
      expect(result).toBeNull(); // '-' is not a digit
    });
  });

  describe('decimals', () => {
    it('should parse decimal numbers', () => {
      const result = tokenizer.testParseBaseNumber('3.14', 0);
      expect(result).toEqual({ number: '3.14', endPos: 4 });
    });

    it('should parse numbers with trailing decimal', () => {
      const result = tokenizer.testParseBaseNumber('42.', 0);
      expect(result).toEqual({ number: '42.', endPos: 3 });
    });

    it('should parse negative decimals', () => {
      const result = tokenizer.testParseBaseNumber('-0.5', 0);
      expect(result).toEqual({ number: '-0.5', endPos: 4 });
    });

    it('should not parse bare decimal point', () => {
      const result = tokenizer.testParseBaseNumber('.5', 0);
      expect(result).toBeNull(); // '.' is not a digit
    });
  });

  describe('edge cases', () => {
    it('should return null for non-numeric input', () => {
      const result = tokenizer.testParseBaseNumber('abc', 0);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = tokenizer.testParseBaseNumber('', 0);
      expect(result).toBeNull();
    });

    it('should return null for position beyond input', () => {
      const result = tokenizer.testParseBaseNumber('123', 10);
      expect(result).toBeNull();
    });

    it('should stop at non-numeric characters', () => {
      const result = tokenizer.testParseBaseNumber('123abc', 0);
      expect(result).toEqual({ number: '123', endPos: 3 });
    });

    it('should stop at second decimal point', () => {
      const result = tokenizer.testParseBaseNumber('1.2.3', 0);
      expect(result).toEqual({ number: '1.2', endPos: 3 });
    });
  });
});

// =============================================================================
// tryNumberWithTimeUnits Tests
// =============================================================================

describe('tryNumberWithTimeUnits', () => {
  const tokenizer = new TestableTokenizer();

  const spanishTimeUnits: TimeUnitMapping[] = [
    { pattern: 'milisegundos', suffix: 'ms', length: 12, caseInsensitive: true },
    { pattern: 'milisegundo', suffix: 'ms', length: 11, caseInsensitive: true },
    { pattern: 'segundos', suffix: 's', length: 8, caseInsensitive: true },
    { pattern: 'segundo', suffix: 's', length: 7, caseInsensitive: true },
    { pattern: 'minutos', suffix: 'm', length: 7, caseInsensitive: true },
    { pattern: 'minuto', suffix: 'm', length: 6, caseInsensitive: true },
    { pattern: 'horas', suffix: 'h', length: 5, caseInsensitive: true },
    { pattern: 'hora', suffix: 'h', length: 4, caseInsensitive: true },
  ];

  describe('with native time units', () => {
    it('should parse number with Spanish time unit', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('5segundos', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('5s');
      expect(token!.kind).toBe('literal');
      expect(token!.position.end).toBe(9);
    });

    it('should parse number with whitespace before time unit when enabled', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('5 segundos', 0, spanishTimeUnits, {
        skipWhitespace: true,
      });
      expect(token).not.toBeNull();
      expect(token!.value).toBe('5s');
      expect(token!.position.end).toBe(10);
    });

    it('should not skip whitespace by default', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('5 segundos', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('5'); // Just the number, no unit
      expect(token!.position.end).toBe(1);
    });
  });

  describe('with standard time units fallback', () => {
    it('should fall back to standard ms', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('500ms', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('500ms');
    });

    it('should fall back to standard s', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('2s', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('2s');
    });

    it('should fall back to standard m', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('30m', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('30m');
    });

    it('should fall back to standard h', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('1h', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('1h');
    });
  });

  describe('number without time unit', () => {
    it('should parse plain integer', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('42', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('42');
      expect(token!.position.end).toBe(2);
    });

    it('should parse decimal number', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('3.14', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('3.14');
    });

    it('should parse negative number', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('-10', 0, spanishTimeUnits);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('-10');
    });
  });

  describe('options', () => {
    it('should respect allowSign: false', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('-10', 0, spanishTimeUnits, {
        allowSign: false,
      });
      expect(token).toBeNull(); // '-' not allowed
    });

    it('should parse positive with allowSign: false', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('10', 0, spanishTimeUnits, {
        allowSign: false,
      });
      expect(token).not.toBeNull();
      expect(token!.value).toBe('10');
    });
  });

  describe('edge cases', () => {
    it('should return null for non-number input', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('abc', 0, spanishTimeUnits);
      expect(token).toBeNull();
    });

    it('should handle empty native units array', () => {
      const token = tokenizer.testTryNumberWithTimeUnits('500ms', 0, []);
      expect(token).not.toBeNull();
      expect(token!.value).toBe('500ms'); // Uses standard units
    });

    it('should prefer native units over standard', () => {
      // If 'segundos' appears before standard 's' in the combined array,
      // it should match 'segundos' first
      const token = tokenizer.testTryNumberWithTimeUnits('5segundos', 0, spanishTimeUnits);
      expect(token!.value).toBe('5s');
      expect(token!.position.end).toBe(9); // Consumed 'segundos'
    });
  });
});

// =============================================================================
// STANDARD_TIME_UNITS Tests
// =============================================================================

describe('BaseTokenizer.STANDARD_TIME_UNITS', () => {
  const tokenizer = new TestableTokenizer();
  const standardUnits = tokenizer.getStandardTimeUnits();

  it('should have 4 standard time units', () => {
    expect(standardUnits).toHaveLength(4);
  });

  it('should include ms, s, m, h', () => {
    const patterns = standardUnits.map(u => u.pattern);
    expect(patterns).toContain('ms');
    expect(patterns).toContain('s');
    expect(patterns).toContain('m');
    expect(patterns).toContain('h');
  });

  it('should have ms first (longest)', () => {
    expect(standardUnits[0].pattern).toBe('ms');
  });

  it('should have boundary checks on s, m, h', () => {
    const s = standardUnits.find(u => u.pattern === 's');
    const m = standardUnits.find(u => u.pattern === 'm');
    const h = standardUnits.find(u => u.pattern === 'h');

    expect(s?.checkBoundary).toBe(true);
    expect(m?.checkBoundary).toBe(true);
    expect(h?.checkBoundary).toBe(true);
  });

  it('should have notFollowedBy: s on m', () => {
    const m = standardUnits.find(u => u.pattern === 'm');
    expect(m?.notFollowedBy).toBe('s');
  });
});
