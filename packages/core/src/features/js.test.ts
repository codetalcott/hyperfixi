/**
 * Top-level JS Feature Tests
 * Tests the js feature for executing JavaScript code at the top level
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSFeature } from './js';
import { ExecutionContext } from '../types/core';

describe('Top-level JS Feature', () => {
  let feature: JSFeature;
  let context: ExecutionContext;
  let originalGlobals: any;

  beforeEach(() => {
    feature = new JSFeature();
    context = {
      me: null,
      you: null,
      it: null,
      locals: new Map(),
      globals: new Map(),
      result: undefined,
    };

    // Store original globals for cleanup
    originalGlobals = {};
  });

  afterEach(() => {
    // Clean up any globals that were set during tests
    for (const key in originalGlobals) {
      if (originalGlobals[key] === undefined) {
        delete (globalThis as any)[key];
      } else {
        (globalThis as any)[key] = originalGlobals[key];
      }
    }
  });

  describe('Basic JavaScript Execution', () => {
    it('can run javascript at the top level', async () => {
      const jsCode = 'globalThis.testSuccess = true';

      await feature.execute(context, jsCode);

      expect((globalThis as any).testSuccess).toBe(true);

      // Cleanup
      delete (globalThis as any).testSuccess;
    });

    it('can execute multi-line javascript', async () => {
      const jsCode = `
        const a = 5;
        const b = 10;
        globalThis.testResult = a + b;
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testResult).toBe(15);

      // Cleanup
      delete (globalThis as any).testResult;
    });
  });

  describe('Function Exposure', () => {
    it('can expose functions to global scope via return object', async () => {
      const jsCode = `
        function testFunction() {
          return 'test succeeded';
        }
        return { testFunction: testFunction };
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testFunction).toBeDefined();
      expect((globalThis as any).testFunction()).toBe('test succeeded');

      // Cleanup
      delete (globalThis as any).testFunction;
    });

    it('can expose multiple functions', async () => {
      const jsCode = `
        function add(a, b) {
          return a + b;
        }
        function multiply(a, b) {
          return a * b;
        }
        return { add, multiply };
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).add).toBeDefined();
      expect((globalThis as any).multiply).toBeDefined();
      expect((globalThis as any).add(2, 3)).toBe(5);
      expect((globalThis as any).multiply(2, 3)).toBe(6);

      // Cleanup
      delete (globalThis as any).add;
      delete (globalThis as any).multiply;
    });

    it('can hide functions not in return object', async () => {
      const jsCode = `
        function hiddenFunction() {
          return 'hidden';
        }
        function exposedFunction() {
          return hiddenFunction() + ' exposed';
        }
        return { exposedFunction };
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).exposedFunction).toBeDefined();
      expect((globalThis as any).hiddenFunction).toBeUndefined();
      expect((globalThis as any).exposedFunction()).toBe('hidden exposed');

      // Cleanup
      delete (globalThis as any).exposedFunction;
    });
  });

  describe('Variable Scoping', () => {
    it('does not expose var variables to global scope', async () => {
      const jsCode = `
        var testVar = 'should not be global';
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testVar).toBeUndefined();
    });

    it('does not expose let variables to global scope', async () => {
      const jsCode = `
        let testLet = 'should not be global';
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testLet).toBeUndefined();
    });

    it('does not expose const variables to global scope', async () => {
      const jsCode = `
        const testConst = 'should not be global';
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testConst).toBeUndefined();
    });
  });

  describe('Return Value Handling', () => {
    it('can expose globals via return object', async () => {
      const jsCode = `
        return { testValue: 'global value' };
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).testValue).toBe('global value');

      // Cleanup
      delete (globalThis as any).testValue;
    });

    it('handles return values with complex objects', async () => {
      const jsCode = `
        const helper = {
          format: (str) => str.toUpperCase()
        };
        return { helper };
      `;

      await feature.execute(context, jsCode);

      expect((globalThis as any).helper).toBeDefined();
      expect((globalThis as any).helper.format('test')).toBe('TEST');

      // Cleanup
      delete (globalThis as any).helper;
    });
  });

  describe('Error Handling', () => {
    it('throws error for invalid javascript', async () => {
      const jsCode = 'invalid javascript syntax {{';

      await expect(feature.execute(context, jsCode)).rejects.toThrow();
    });

    it('requires javascript code parameter', async () => {
      await expect(feature.execute(context)).rejects.toThrow(
        'JS feature requires JavaScript code to execute'
      );
    });

    it('requires string parameter', async () => {
      await expect(feature.execute(context, 123)).rejects.toThrow(
        'JavaScript code must be a string'
      );
    });
  });

  describe('Validation', () => {
    it('validates required parameters', () => {
      expect(feature.validate([])).toBe('JS feature requires JavaScript code to execute');
    });

    it('validates parameter types', () => {
      expect(feature.validate([123])).toBe('JavaScript code must be a string');
    });

    it('passes validation for valid parameters', () => {
      expect(feature.validate(['console.log("test")'])).toBeNull();
    });
  });
});
