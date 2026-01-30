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
    it('should parse "url <url>" syntax', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [
        { type: 'identifier', name: 'url' } as any,
        { type: 'literal', value: '/page' } as any,
      ];

      const result = await parseUrlArguments(args, evaluator, mockContext, 'push-url');

      expect(result.url).toBe('/page');
      expect(result.title).toBeUndefined();
    });

    it('should parse URL without "url" keyword', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [{ type: 'literal', value: '/page' } as any];

      const result = await parseUrlArguments(args, evaluator, mockContext, 'push-url');

      expect(result.url).toBe('/page');
    });

    it('should parse "url <url> with title <title>" syntax', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [
        { type: 'identifier', name: 'url' } as any,
        { type: 'literal', value: '/page' } as any,
        { type: 'identifier', name: 'with' } as any,
        { type: 'identifier', name: 'title' } as any,
        { type: 'literal', value: 'Page Title' } as any,
      ];

      const result = await parseUrlArguments(args, evaluator, mockContext, 'push-url');

      expect(result.url).toBe('/page');
      expect(result.title).toBe('Page Title');
    });

    it('should detect keywords as identifiers', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [
        { type: 'identifier', name: 'url' } as any,
        { type: 'literal', value: '/test' } as any,
      ];

      const result = await parseUrlArguments(args, evaluator, mockContext, 'push-url');

      expect(result.url).toBe('/test');
    });

    it('should extract title after "with title" keywords', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [
        { type: 'literal', value: '/page' } as any,
        { type: 'identifier', name: 'with' } as any,
        { type: 'identifier', name: 'title' } as any,
        { type: 'literal', value: 'Test' } as any,
      ];

      const result = await parseUrlArguments(args, evaluator, mockContext, 'push-url');

      expect(result.title).toBe('Test');
    });

    it('should throw if no URL provided', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [];

      await expect(parseUrlArguments(args, evaluator, mockContext, 'push-url')).rejects.toThrow(
        'push-url command requires a URL argument'
      );
    });

    it('should validate URL using validateUrl', async () => {
      const evaluator = createMockEvaluator({});
      const args: ASTNode[] = [{ type: 'literal', value: null } as any];

      await expect(parseUrlArguments(args, evaluator, mockContext, 'push-url')).rejects.toThrow(
        '[HyperFixi] push-url: URL evaluated to string'
      );
    });
  });
});
