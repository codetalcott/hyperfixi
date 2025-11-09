/**
 * Test for JavaScript-standard precedence (UPDATED APPROACH)
 * We choose developer-friendly JavaScript precedence over strict parentheses
 * Following TDD pattern: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';

describe('JavaScript-Standard Precedence (Developer-Friendly)', () => {
  describe('Mathematical expressions', () => {
    it('should ACCEPT same operators', async () => {
      // These should work - same operators
      expect(await evalHyperScript('2 + 3 + 4')).toBe(9);
      expect(await evalHyperScript('2 * 3 * 4')).toBe(24);
      expect(await evalHyperScript('10 - 5 - 2')).toBe(3);
      expect(await evalHyperScript('8 / 2 / 2')).toBe(2);
    });

    it('should ACCEPT parenthesized mixed operators', async () => {
      // These should work - explicit parentheses
      expect(await evalHyperScript('(2 + 3) * 4')).toBe(20);
      expect(await evalHyperScript('2 + (3 * 4)')).toBe(14);
      expect(await evalHyperScript('(10 - 2) * 3')).toBe(24);
      expect(await evalHyperScript('8 / (2 + 2)')).toBe(2);
    });

    it('should ACCEPT mixed operators with JavaScript-standard precedence', async () => {
      // ✅ CHANGED: We now support JavaScript-standard precedence (developer-friendly)
      // These should work correctly using standard operator precedence rules
      expect(await evalHyperScript('2 + 3 * 4')).toBe(14); // * before +: 2 + 12 = 14
      expect(await evalHyperScript('10 - 2 * 3')).toBe(4); // * before -: 10 - 6 = 4
      expect(await evalHyperScript('2 * 3 + 4')).toBe(10); // * before +: 6 + 4 = 10
      expect(await evalHyperScript('8 / 2 + 3')).toBe(7); // / before +: 4 + 3 = 7
    });
  });

  describe('Logical expressions', () => {
    it('should ACCEPT same operators', async () => {
      // These should work - same operators
      expect(await evalHyperScript('true and true and false')).toBe(false);
      expect(await evalHyperScript('false or true or false')).toBe(true);
    });

    it('should ACCEPT parenthesized mixed operators', async () => {
      // These should work - explicit parentheses
      expect(await evalHyperScript('(true and false) or true')).toBe(true);
      expect(await evalHyperScript('true and (false or true)')).toBe(true);
    });

    it('should ACCEPT mixed operators with JavaScript-standard precedence', async () => {
      // ✅ CHANGED: We now support JavaScript-standard precedence (developer-friendly)
      // These should work correctly using standard logical precedence rules (and before or)
      expect(await evalHyperScript('true and false or true')).toBe(true); // (true and false) or true = false or true = true
      expect(await evalHyperScript('false or true and false')).toBe(false); // false or (true and false) = false or false = false
    });
  });

  describe('Single values and simple expressions', () => {
    it('should work with single values', async () => {
      expect(await evalHyperScript('5')).toBe(5);
      expect(await evalHyperScript('true')).toBe(true);
      expect(await evalHyperScript('"hello"')).toBe('hello');
    });

    it('should work with comparison operations', async () => {
      expect(await evalHyperScript('5 > 3')).toBe(true);
      expect(await evalHyperScript('2 == 2')).toBe(true);
      expect(await evalHyperScript('1 < 4')).toBe(true);
    });
  });
});
