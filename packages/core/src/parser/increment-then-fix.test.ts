/**
 * Regression test: increment/decrement with 'then' keyword
 *
 * Fix: Added 'increment' and 'decrement' to skipSemanticParsing list.
 * The semantic parser's quantity role lacks a markerOverride for 'by',
 * causing it to misinterpret 'then' as a modifier value.
 * The traditional parser handles 'by' correctly via KEYWORDS.BY check.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Increment/Decrement with then keyword', () => {
  it('should parse increment with by and then', () => {
    const result = parse('on click increment x by 5 then toggle .active');
    expect(result.success).toBe(true);
  });

  it('should parse increment without by, followed by then', () => {
    const result = parse('on click increment x then toggle .active');
    expect(result.success).toBe(true);
  });

  it('should parse decrement followed by then', () => {
    const result = parse('on click decrement counter then log counter');
    expect(result.success).toBe(true);
  });

  it('should parse chained increment and decrement with then', () => {
    const result = parse(
      'on click increment counter by 1 then decrement counter then return counter'
    );
    expect(result.success).toBe(true);
  });

  it('should parse on exception from with increment then', () => {
    const result = parse(
      'on exception from #contents increment errorCount then toggle .error-visible'
    );
    expect(result.success).toBe(true);
  });
});
