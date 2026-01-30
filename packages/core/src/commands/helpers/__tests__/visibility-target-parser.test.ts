import { describe, it, expect, vi } from 'vitest';
import { parseVisibilityInput } from '../visibility-target-parser';
import type { VisibilityRawInput } from '../visibility-target-parser';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';
import type { ExecutionContext } from '../../../types/base-types';

// Mock element-resolution module
vi.mock('../element-resolution', () => ({
  resolveTargetsFromArgs: vi.fn(async (args, evaluator, context, commandName) => {
    if (args.length === 0) {
      throw new Error(`${commandName}: no targets specified`);
    }
    return [document.createElement('div')];
  }),
}));

describe('visibility-target-parser', () => {
  const mockEvaluator = {
    evaluate: async (node: any) => node,
  } as unknown as ExpressionEvaluator;

  const mockContext = {} as ExecutionContext;

  describe('parseVisibilityInput', () => {
    it('should parse targets from args', async () => {
      const raw: VisibilityRawInput = {
        args: [{ type: 'selector', value: '#target' } as any],
        modifiers: {},
      };

      const result = await parseVisibilityInput(raw, mockEvaluator, mockContext, 'show');

      expect(result.targets).toBeDefined();
      expect(result.targets.length).toBeGreaterThan(0);
    });

    it('should delegate to resolveTargetsFromArgs', async () => {
      const { resolveTargetsFromArgs } = await import('../element-resolution');

      const raw: VisibilityRawInput = {
        args: [{ type: 'selector', value: '#target' } as any],
        modifiers: {},
      };

      await parseVisibilityInput(raw, mockEvaluator, mockContext, 'show');

      expect(resolveTargetsFromArgs).toHaveBeenCalledWith(
        raw.args,
        mockEvaluator,
        mockContext,
        'show'
      );
    });

    it('should throw if no targets found', async () => {
      const raw: VisibilityRawInput = {
        args: [],
        modifiers: {},
      };

      await expect(parseVisibilityInput(raw, mockEvaluator, mockContext, 'show')).rejects.toThrow(
        'show: no targets specified'
      );
    });
  });
});
