/**
 * TDD tests for context mapping issues
 * Testing the specific failing patterns from our compatibility tests
 */

import { describe, it, expect } from 'vitest';
import { evalHyperScript } from './eval-hyperscript';

describe('Context Mapping Issues', () => {
  describe('its result pattern', () => {
    it('should handle its result with nested result object', async () => {
      // This is the failing test case from compatibility tests
      const context = { result: { result: 'success' } };
      const result = await evalHyperScript('its result', context);
      expect(result).toBe('success');
    });

    it('should handle its property access on simple objects', async () => {
      const context = { result: { name: 'test', value: 42 } };
      expect(await evalHyperScript('its name', context)).toBe('test');
      expect(await evalHyperScript('its value', context)).toBe(42);
    });

    it('should return undefined for missing properties', async () => {
      const context = { result: { name: 'test' } };
      expect(await evalHyperScript('its missing', context)).toBeUndefined();
    });

    it('should return undefined when result is null or undefined', async () => {
      expect(await evalHyperScript('its anything', { result: null })).toBeUndefined();
      expect(await evalHyperScript('its anything', { result: undefined })).toBeUndefined();
      expect(await evalHyperScript('its anything', {})).toBeUndefined();
    });
  });

  describe('my context with type conversion', () => {
    it('should handle my property with type conversion in math', async () => {
      // This is the failing test: (my count as Int) * 2
      const context = { me: { count: '5' } };
      const result = await evalHyperScript('(my count as Int) * 2', context);
      expect(result).toBe(10);
    });

    it('should handle my property access in expressions', async () => {
      const context = { me: { age: 25, status: 'active' } };
      expect(await evalHyperScript('my age', context)).toBe(25);
      expect(await evalHyperScript('my status', context)).toBe('active');
    });
  });

  describe('your context expressions', () => {
    it('should handle your property access', async () => {
      const context = { you: { data: 'test', value: 123 } };
      expect(await evalHyperScript('your data', context)).toBe('test');
      expect(await evalHyperScript('your value', context)).toBe(123);
    });

    it('should return undefined when you is not set', async () => {
      expect(await evalHyperScript('your anything', {})).toBeUndefined();
    });
  });

  describe('complex context expressions', () => {
    it('should handle logical expressions with my context', async () => {
      // This is the failing test: my age > 18 and my status == 'active'
      const context = { me: { age: 25, status: 'active' } };
      const result = await evalHyperScript("my age > 18 and my status == 'active'", context);
      expect(result).toBe(true);
    });

    it('should handle mixed context and comparisons', async () => {
      const context = { me: { age: 16, status: 'inactive' } };
      const result = await evalHyperScript("my age > 18 and my status == 'active'", context);
      expect(result).toBe(false);
    });
  });
});
