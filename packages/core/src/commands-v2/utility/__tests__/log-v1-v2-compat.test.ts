/**
 * V1 vs V2 Compatibility Tests for LogCommand
 *
 * Ensures that standalone V2 LogCommand produces identical results
 * to the V1 implementation it replaces.
 *
 * Critical for maintaining backward compatibility with existing code.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogCommand as LogV1 } from '../../../commands/utility/log';
import { LogCommand as LogV2 } from '../log';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as any;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: any) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return node.value;
      }
      return node;
    },
  };
}

// ========== Compatibility Tests ==========

describe('LogCommand V1 vs V2 Compatibility', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    // Spy on console.log to verify identical behavior
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('basic logging behavior', () => {
    it('should produce identical console.log call for single string', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: ['Hello World'] }, ctx1);
      const v1Calls = consoleLogSpy.mock.calls.length;
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput(
        { args: [{ value: 'Hello World' } as any], modifiers: {} },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2Calls = consoleLogSpy.mock.calls.length;
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1Calls).toBe(v2Calls);
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall).toEqual(['Hello World']);
    });

    it('should produce identical console.log call for multiple values', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: ['Result:', 42, true] }, ctx1);
      const v1Calls = consoleLogSpy.mock.calls.length;
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      let callCount = 0;
      const valuesToReturn = ['Result:', 42, true];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      };

      const input = await v2.parseInput(
        {
          args: [
            { value: 'Result:' } as any,
            { value: 42 } as any,
            { value: true } as any,
          ],
          modifiers: {},
        },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2Calls = consoleLogSpy.mock.calls.length;
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1Calls).toBe(v2Calls);
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall).toEqual(['Result:', 42, true]);
    });

    it('should produce identical console.log call for empty values', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [] }, ctx1);
      const v1Calls = consoleLogSpy.mock.calls.length;
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput({ args: [], modifiers: {} }, evaluator as any, ctx2);
      await v2.execute(input, ctx2);
      const v2Calls = consoleLogSpy.mock.calls.length;
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1Calls).toBe(v2Calls);
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall).toEqual([]);
    });
  });

  describe('return value comparison', () => {
    it('should return identical structure for single value', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      const output1 = await v1.execute({ values: ['Test'] }, ctx1);

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput(
        { args: [{ value: 'Test' } as any], modifiers: {} },
        evaluator as any,
        ctx2
      );
      const output2 = await v2.execute(input, ctx2);

      // Compare structure
      expect(output1).toHaveProperty('values');
      expect(output2).toHaveProperty('values');
      expect(output1.values).toEqual(output2.values);
      expect(output1.values).toEqual(['Test']);

      expect(output1).toHaveProperty('loggedAt');
      expect(output2).toHaveProperty('loggedAt');
      expect(output1.loggedAt).toBeInstanceOf(Date);
      expect(output2.loggedAt).toBeInstanceOf(Date);
    });

    it('should return identical structure for multiple values', async () => {
      const testValues = ['a', 123, true, null];

      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      const output1 = await v1.execute({ values: testValues }, ctx1);

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      let callCount = 0;
      const evaluator = {
        evaluate: async () => testValues[callCount++],
      };

      const input = await v2.parseInput(
        {
          args: testValues.map(v => ({ value: v } as any)),
          modifiers: {},
        },
        evaluator as any,
        ctx2
      );
      const output2 = await v2.execute(input, ctx2);

      // Compare structure
      expect(output1.values).toEqual(output2.values);
      expect(output1.values).toEqual(testValues);
      expect(output1.loggedAt).toBeInstanceOf(Date);
      expect(output2.loggedAt).toBeInstanceOf(Date);
    });

    it('should return identical structure for empty values', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      const output1 = await v1.execute({ values: [] }, ctx1);

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput({ args: [], modifiers: {} }, evaluator as any, ctx2);
      const output2 = await v2.execute(input, ctx2);

      // Compare structure
      expect(output1.values).toEqual(output2.values);
      expect(output1.values).toEqual([]);
      expect(output1.loggedAt).toBeInstanceOf(Date);
      expect(output2.loggedAt).toBeInstanceOf(Date);
    });
  });

  describe('edge cases', () => {
    it('should handle numbers identically', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [0, -1, 42, 3.14, Infinity, -Infinity, NaN] }, ctx1);
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const values = [0, -1, 42, 3.14, Infinity, -Infinity, NaN];
      let callCount = 0;
      const evaluator = {
        evaluate: async () => values[callCount++],
      };

      const input = await v2.parseInput(
        {
          args: values.map(v => ({ value: v } as any)),
          modifiers: {},
        },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results (NaN requires special handling)
      expect(v1FirstCall.length).toBe(v2FirstCall.length);
      for (let i = 0; i < v1FirstCall.length; i++) {
        if (Number.isNaN(v1FirstCall[i])) {
          expect(Number.isNaN(v2FirstCall[i])).toBe(true);
        } else {
          expect(v1FirstCall[i]).toBe(v2FirstCall[i]);
        }
      }
    });

    it('should handle objects identically', async () => {
      const obj = { foo: 'bar', nested: { a: 1, b: 2 } };

      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [obj] }, ctx1);
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = {
        evaluate: async () => obj,
      };

      const input = await v2.parseInput(
        { args: [{ value: obj } as any], modifiers: {} },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall[0]).toBe(obj); // Same reference
      expect(v2FirstCall[0]).toBe(obj); // Same reference
    });

    it('should handle arrays identically', async () => {
      const arr = [1, 2, [3, 4, [5, 6]]];

      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [arr] }, ctx1);
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = {
        evaluate: async () => arr,
      };

      const input = await v2.parseInput(
        { args: [{ value: arr } as any], modifiers: {} },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall[0]).toBe(arr); // Same reference
      expect(v2FirstCall[0]).toBe(arr); // Same reference
    });

    it('should handle null and undefined identically', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [null, undefined] }, ctx1);
      const v1FirstCall = consoleLogSpy.mock.calls[0];

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      let callCount = 0;
      const valuesToReturn = [null, undefined];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      };

      const input = await v2.parseInput(
        {
          args: [{ value: null } as any, { value: undefined } as any],
          modifiers: {},
        },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2FirstCall = consoleLogSpy.mock.calls[0];

      // Compare results
      expect(v1FirstCall).toEqual(v2FirstCall);
      expect(v1FirstCall).toEqual([null, undefined]);
    });
  });

  describe('call count comparison', () => {
    it('should make exactly one console.log call per execute', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: ['test'] }, ctx1);
      const v1CallCount = consoleLogSpy.mock.calls.length;

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput(
        { args: [{ value: 'test' } as any], modifiers: {} },
        evaluator as any,
        ctx2
      );
      await v2.execute(input, ctx2);
      const v2CallCount = consoleLogSpy.mock.calls.length;

      // Compare call counts
      expect(v1CallCount).toBe(1);
      expect(v2CallCount).toBe(1);
      expect(v1CallCount).toBe(v2CallCount);
    });

    it('should make exactly one console.log call even for empty log', async () => {
      // V1 execution
      const v1 = new LogV1();
      const ctx1 = createMockContext();
      await v1.execute({ values: [] }, ctx1);
      const v1CallCount = consoleLogSpy.mock.calls.length;

      // Reset spy
      consoleLogSpy.mockClear();

      // V2 execution
      const v2 = new LogV2();
      const ctx2 = createMockContext();
      const evaluator = createMockEvaluator();
      const input = await v2.parseInput({ args: [], modifiers: {} }, evaluator as any, ctx2);
      await v2.execute(input, ctx2);
      const v2CallCount = consoleLogSpy.mock.calls.length;

      // Compare call counts
      expect(v1CallCount).toBe(1);
      expect(v2CallCount).toBe(1);
      expect(v1CallCount).toBe(v2CallCount);
    });
  });
});

describe('LogCommand V2 Size Verification', () => {
  it('should be significantly smaller than V1', () => {
    // This test documents the size difference
    // V1: 131 lines with imports from validation (Zod schemas)
    // V2: ~100 lines (standalone file) with zero external dependencies

    const v1 = new LogV1();
    const v2 = new LogV2();

    // Both should have the same command name
    expect(v1.name).toBe(v2.name);
    expect(v1.name).toBe('log');

    // V2 should have no V1 dependencies in its module imports
    // (This is verified by bundle size measurement, not runtime)
  });
});
