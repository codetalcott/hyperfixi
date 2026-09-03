import { describe, it, expect } from 'vitest';
import { parseUrlArguments } from '../url-argument-parser';
import type { ASTNode, ExecutionContext } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

describe('url-argument-parser', () => {
  const mockContext = {} as ExecutionContext;

  const createMockEvaluator = (values: Record<string, any>): ExpressionEvaluator => {
    return {
      evaluate: async (node: ASTNode) => {
        const nodeRecord = node as unknown as Record<string, any>;
        if (nodeRecord.type === 'identifier' && nodeRecord.name) {
          return values[nodeRecord.name] ?? nodeRecord.name;
        }
        if (nodeRecord.type === 'literal') {
          return nodeRecord.value;
        }
        return node;
      },
    } as unknown as ExpressionEvaluator;
  };

  describe('parseUrlArguments', () => {
    it('reads the URL from the one positional argument', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [{ type: 'literal', value: '/page' } as any];
      const result = await parseUrlArguments({ args }, evaluator, mockContext, 'push-url');
      expect(result.url).toBe('/page');
      expect(result.title).toBeUndefined();
    });

    it('reads the title from the `title` slot', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [{ type: 'literal', value: '/page' } as any];
      const modifiers = { title: { type: 'literal', value: 'Page Title' } as any };
      const result = await parseUrlArguments(
        { args, modifiers },
        evaluator,
        mockContext,
        'push-url'
      );
      expect(result.url).toBe('/page');
      expect(result.title).toBe('Page Title');
    });

    it('never treats a word in args as a marker — `url` there IS the URL', async () => {
      // The parser consumes `url` / `with title`; nothing here scans for them.
      const evaluator = createMockEvaluator({ url: 'url' });
      const args: ASTNode[] = [
        { type: 'identifier', name: 'url' } as any,
        { type: 'literal', value: '/page' } as any,
      ];
      const result = await parseUrlArguments({ args }, evaluator, mockContext, 'push-url');
      expect(result.url).toBe('url');
    });

    it('should throw if no URL provided', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [];
      await expect(parseUrlArguments({ args }, evaluator, mockContext, 'push-url')).rejects.toThrow(
        'push-url command requires a URL argument'
      );
    });

    it('should validate URL using validateUrl', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [{ type: 'literal', value: null } as any];
      await expect(parseUrlArguments({ args }, evaluator, mockContext, 'push-url')).rejects.toThrow(
        '[HyperFixi] push-url: URL evaluated to string'
      );
    });
  });
});
