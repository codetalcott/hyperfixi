/**
 * Test for _hyperscript strict precedence compatibility
 * Following TDD pattern: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest';
import { evalHyperScript } from './eval-hyperscript.js';

describe('Strict Precedence Compatibility', () => {
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

    it('should REJECT mixed operators without parentheses', async () => {
      // These should fail - mixed operators require parentheses
      await expect(evalHyperScript('2 + 3 * 4')).rejects.toThrow(
        'You must parenthesize math operations with different operators'
      );
      
      await expect(evalHyperScript('10 - 2 * 3')).rejects.toThrow(
        'You must parenthesize math operations with different operators'
      );
      
      await expect(evalHyperScript('2 * 3 + 4')).rejects.toThrow(
        'You must parenthesize math operations with different operators'
      );
      
      await expect(evalHyperScript('8 / 2 + 3')).rejects.toThrow(
        'You must parenthesize math operations with different operators'
      );
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

    it('should REJECT mixed operators without parentheses', async () => {
      // These should fail - mixed operators require parentheses
      await expect(evalHyperScript('true and false or true')).rejects.toThrow(
        'You must parenthesize logical operations with different operators'
      );
      
      await expect(evalHyperScript('false or true and false')).rejects.toThrow(
        'You must parenthesize logical operations with different operators'
      );
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