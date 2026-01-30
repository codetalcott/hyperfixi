import { describe, it, expect } from 'vitest';
import { parseNumericTargetInput } from '../numeric-target-parser';
import type { NumericTargetRawInput } from '../numeric-target-parser';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';
import type { ExecutionContext } from '../../../types/base-types';

describe('numeric-target-parser', () => {
  const mockEvaluator = {
    evaluate: async (node: any) => node.value || node.name || node,
  } as unknown as ExpressionEvaluator;

  const mockContext = {} as ExecutionContext;

  describe('parseNumericTargetInput', () => {
    it('should parse identifier as target', async () => {
      const raw: NumericTargetRawInput = {
        args: [{ type: 'identifier', name: 'counter' } as any],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment');

      expect(result.target).toBe('counter');
      expect(result.amount).toBe(1);
    });

    it('should parse literal as target', async () => {
      const raw: NumericTargetRawInput = {
        args: [{ type: 'literal', value: 42 } as any],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment');

      expect(result.target).toBe(42);
      expect(result.amount).toBe(1);
    });

    it('should extract scope from identifier', async () => {
      const raw: NumericTargetRawInput = {
        args: [{ type: 'identifier', name: 'counter', scope: 'global' } as any],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment');

      expect(result.target).toBe('counter');
      expect(result.scope).toBe('global');
    });

    it('should parse "by <amount>" pattern', async () => {
      const raw: NumericTargetRawInput = {
        args: [
          { type: 'identifier', name: 'counter' } as any,
          { type: 'literal', value: 5 } as any,
        ],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment');

      expect(result.target).toBe('counter');
      expect(result.amount).toBe(5);
    });

    it('should detect global scope from args', async () => {
      const raw: NumericTargetRawInput = {
        args: [
          { type: 'identifier', name: 'counter' } as any,
          { type: 'literal', value: 'global' } as any,
        ],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment');

      expect(result.target).toBe('counter');
      expect(result.scope).toBe('global');
    });

    it('should unwrap array from evaluation', async () => {
      const evaluator = {
        evaluate: async () => ['counter'],
      } as unknown as ExpressionEvaluator;

      const raw: NumericTargetRawInput = {
        args: [{ type: 'other' } as any],
        modifiers: {},
      };

      const result = await parseNumericTargetInput(raw, evaluator, mockContext, 'increment');

      expect(result.target).toBe('counter');
    });

    it('should throw if no target provided', async () => {
      const raw: NumericTargetRawInput = {
        args: [],
        modifiers: {},
      };

      await expect(
        parseNumericTargetInput(raw, mockEvaluator, mockContext, 'increment')
      ).rejects.toThrow('increment command requires a target');
    });
  });
});
