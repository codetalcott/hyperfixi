import { describe, it, expect } from 'vitest';
import {
  peekMatches,
  peekMatchesKind,
  peekAhead,
  isLastToken,
  remainingTokens,
  getTokenAt,
  isKeyword,
  findNextToken,
  findNextTokenKind,
  getTokensUntil,
  matchesSequence,
} from '../token-helpers';
import {
  createMockParserContext,
  createTokenStream,
} from '../../../__test-utils__/parser-context-mock';

describe('token-helpers', () => {
  describe('peekMatches', () => {
    it('should return true when current token matches value', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      expect(peekMatches(tokens, ctx.current, 'toggle')).toBe(true);
    });

    it('should return false when current token does not match', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      expect(peekMatches(tokens, ctx.current, 'add')).toBe(false);
    });

    it('should return false at end of tokens', () => {
      const tokens: any[] = [];
      const ctx = createMockParserContext(tokens);

      expect(peekMatches(tokens, ctx.current, 'toggle')).toBe(false);
    });

    it('should not advance parser position', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);
      const initialPos = ctx.current;

      peekMatches(tokens, ctx.current, 'toggle');

      expect(ctx.current).toBe(initialPos);
    });

    it('should be case-sensitive', () => {
      const tokens = createTokenStream(['Toggle']);
      const ctx = createMockParserContext(tokens);

      expect(peekMatches(tokens, ctx.current, 'toggle')).toBe(false);
      expect(peekMatches(tokens, ctx.current, 'Toggle')).toBe(true);
    });
  });

  describe('peekMatchesKind', () => {
    it('should return true when current token matches kind', () => {
      const tokens = createTokenStream(['toggle'], ['keyword']);
      const ctx = createMockParserContext(tokens);

      expect(peekMatchesKind(tokens, ctx.current, 'keyword' as any)).toBe(true);
    });

    it('should return false when current token has different kind', () => {
      const tokens = createTokenStream(['toggle'], ['identifier']);
      const ctx = createMockParserContext(tokens);

      expect(peekMatchesKind(tokens, ctx.current, 'keyword' as any)).toBe(false);
    });

    it('should return false at end of tokens', () => {
      const tokens: any[] = [];
      const ctx = createMockParserContext(tokens);

      expect(peekMatchesKind(tokens, ctx.current, 'identifier' as any)).toBe(false);
    });

    it('should not advance parser position', () => {
      const tokens = createTokenStream(['value'], ['identifier']);
      const ctx = createMockParserContext(tokens);
      const initialPos = ctx.current;

      peekMatchesKind(tokens, ctx.current, 'identifier' as any);

      expect(ctx.current).toBe(initialPos);
    });
  });

  describe('peekAhead', () => {
    it('should return token at offset 1', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);

      const token = peekAhead(tokens, ctx.current, 1);

      expect(token?.value).toBe('.active');
    });

    it('should return token at offset 2', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);

      const token = peekAhead(tokens, ctx.current, 2);

      expect(token?.value).toBe('on');
    });

    it('should return dummy EOF token when offset exceeds token length', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);

      const token = peekAhead(tokens, ctx.current, 5);

      // Returns dummy EOF token with kind 'unknown'
      expect(token.kind).toBe('unknown');
      expect(token.value).toBe('');
    });

    it('should handle offset 0 (current token)', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      const token = peekAhead(tokens, ctx.current, 0);

      expect(token?.value).toBe('toggle');
    });

    it('should not advance parser position', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);
      const initialPos = ctx.current;

      peekAhead(tokens, ctx.current, 1);

      expect(ctx.current).toBe(initialPos);
    });

    it('should work after advancing parser', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Move to '.active'

      const token = peekAhead(tokens, ctx.current, 1);

      expect(token?.value).toBe('on');
    });
  });

  describe('isLastToken', () => {
    it('should return true when at last token', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);

      expect(isLastToken(tokens, ctx.current)).toBe(true);
    });

    it('should return false when not at last token', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      expect(isLastToken(tokens, ctx.current)).toBe(false);
    });

    it('should return false when past last token', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Move past last token

      expect(isLastToken(tokens, ctx.current)).toBe(false);
    });

    it('should return false for empty token stream', () => {
      const tokens: any[] = [];
      const ctx = createMockParserContext(tokens);

      // Empty stream means current >= length, so not "last token"
      expect(isLastToken(tokens, ctx.current)).toBe(false);
    });
  });

  describe('remainingTokens', () => {
    it('should return count of remaining tokens', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on', 'click']);
      const ctx = createMockParserContext(tokens);

      expect(remainingTokens(tokens, ctx.current)).toBe(4);
    });

    it('should update after advancing', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);
      ctx.advance();

      expect(remainingTokens(tokens, ctx.current)).toBe(2);
    });

    it('should return 0 for empty stream', () => {
      const tokens: any[] = [];
      const ctx = createMockParserContext(tokens);

      expect(remainingTokens(tokens, ctx.current)).toBe(0);
    });

    it('should return 0 when at end', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);
      ctx.advance();

      expect(remainingTokens(tokens, ctx.current)).toBe(0);
    });
  });

  describe('getTokenAt', () => {
    it('should return token at specified index', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);

      expect(getTokenAt(tokens, 0)?.value).toBe('toggle');
      expect(getTokenAt(tokens, 1)?.value).toBe('.active');
      expect(getTokenAt(tokens, 2)?.value).toBe('on');
    });

    it('should return dummy EOF token for out-of-bounds index', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);

      const token = getTokenAt(tokens, 5);
      expect(token.kind).toBe('unknown');
      expect(token.value).toBe('');
    });

    it('should return dummy EOF token for negative index', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);

      const token = getTokenAt(tokens, -1);
      expect(token.kind).toBe('unknown');
      expect(token.value).toBe('');
    });

    it('should not be affected by current position', () => {
      const tokens = createTokenStream(['toggle', '.active', 'on']);
      const ctx = createMockParserContext(tokens);
      ctx.advance();
      ctx.advance();

      expect(getTokenAt(tokens, 0)?.value).toBe('toggle');
    });
  });

  describe('isKeyword', () => {
    it('should identify common keywords', () => {
      const token = { kind: 'keyword' as any, value: 'on', start: 0, end: 2, line: 1, column: 1 };
      const keywords = ['on', 'then', 'and', 'end'];

      expect(isKeyword(token, keywords)).toBe(true);
    });

    it('should return false for non-keywords', () => {
      const token = {
        kind: 'identifier' as any,
        value: 'toggle',
        start: 0,
        end: 6,
        line: 1,
        column: 1,
      };
      const keywords = ['on', 'then', 'and'];

      expect(isKeyword(token, keywords)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const token = { kind: 'keyword' as any, value: 'ON', start: 0, end: 2, line: 1, column: 1 };
      const keywords = ['on'];

      // isKeyword does case-insensitive matching (token.value.toLowerCase())
      expect(isKeyword(token, keywords)).toBe(true);
    });
  });

  describe('findNextToken', () => {
    it('should find next occurrence of token value', () => {
      const tokens = createTokenStream(['toggle', '.active', 'then', 'add']);
      const ctx = createMockParserContext(tokens);

      const index = findNextToken(tokens, ctx.current, 'then');

      expect(index).toBe(2);
    });

    it('should return -1 when token not found', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      const index = findNextToken(tokens, ctx.current, 'then');

      expect(index).toBe(-1);
    });

    it('should start searching from current position', () => {
      const tokens = createTokenStream(['then', 'toggle', 'then']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Skip first 'then'

      const index = findNextToken(tokens, ctx.current, 'then');

      expect(index).toBe(2);
    });

    it('should find token at current position', () => {
      const tokens = createTokenStream(['then', 'toggle']);
      const ctx = createMockParserContext(tokens);

      const index = findNextToken(tokens, ctx.current, 'then');

      expect(index).toBe(0); // Finds current token (search starts from current)
    });
  });

  describe('findNextTokenKind', () => {
    it('should find next occurrence of token kind', () => {
      const tokens = createTokenStream(
        ['toggle', '42', 'add'],
        ['identifier', 'number', 'identifier']
      );
      const ctx = createMockParserContext(tokens);

      const index = findNextTokenKind(tokens, ctx.current, 'number' as any);

      expect(index).toBe(1);
    });

    it('should return -1 when kind not found', () => {
      const tokens = createTokenStream(['toggle', 'add'], ['identifier', 'identifier']);
      const ctx = createMockParserContext(tokens);

      const index = findNextTokenKind(tokens, ctx.current, 'number' as any);

      expect(index).toBe(-1);
    });

    it('should start searching from current position', () => {
      const tokens = createTokenStream(['42', 'toggle', '99'], ['number', 'identifier', 'number']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Skip first number

      const index = findNextTokenKind(tokens, ctx.current, 'number' as any);

      expect(index).toBe(2);
    });
  });

  describe('getTokensUntil', () => {
    it('should return tokens until specified value', () => {
      const tokens = createTokenStream(['toggle', '.active', 'then', 'add']);
      const ctx = createMockParserContext(tokens);

      const result = getTokensUntil(tokens, ctx.current, 'then');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('toggle');
      expect(result[1].value).toBe('.active');
    });

    it('should return empty array when target is first token', () => {
      const tokens = createTokenStream(['then', 'toggle']);
      const ctx = createMockParserContext(tokens);

      const result = getTokensUntil(tokens, ctx.current, 'then');

      expect(result).toHaveLength(0);
    });

    it('should return all remaining tokens when target not found', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      const result = getTokensUntil(tokens, ctx.current, 'then');

      expect(result).toHaveLength(2);
    });

    it('should start from current position', () => {
      const tokens = createTokenStream(['skip', 'toggle', '.active', 'then']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Skip 'skip'

      const result = getTokensUntil(tokens, ctx.current, 'then');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('toggle');
    });

    it('should not include the target token', () => {
      const tokens = createTokenStream(['toggle', 'then']);
      const ctx = createMockParserContext(tokens);

      const result = getTokensUntil(tokens, ctx.current, 'then');

      expect(result.every(t => t.value !== 'then')).toBe(true);
    });
  });

  describe('matchesSequence', () => {
    it('should return true for matching sequence', () => {
      const tokens = createTokenStream(['wait', 'for', 'event']);
      const ctx = createMockParserContext(tokens);

      expect(matchesSequence(tokens, ctx.current, ['wait', 'for'])).toBe(true);
    });

    it('should return false for non-matching sequence', () => {
      const tokens = createTokenStream(['wait', 'until', 'event']);
      const ctx = createMockParserContext(tokens);

      expect(matchesSequence(tokens, ctx.current, ['wait', 'for'])).toBe(false);
    });

    it('should return true for single-token sequence', () => {
      const tokens = createTokenStream(['toggle', '.active']);
      const ctx = createMockParserContext(tokens);

      expect(matchesSequence(tokens, ctx.current, ['toggle'])).toBe(true);
    });

    it('should return false when sequence extends past tokens', () => {
      const tokens = createTokenStream(['wait']);
      const ctx = createMockParserContext(tokens);

      expect(matchesSequence(tokens, ctx.current, ['wait', 'for', 'event'])).toBe(false);
    });

    it('should return true for empty sequence', () => {
      const tokens = createTokenStream(['toggle']);
      const ctx = createMockParserContext(tokens);

      // Empty sequence matches vacuously (no tokens to mismatch)
      expect(matchesSequence(tokens, ctx.current, [])).toBe(true);
    });

    it('should work from current position', () => {
      const tokens = createTokenStream(['skip', 'wait', 'for']);
      const ctx = createMockParserContext(tokens);
      ctx.advance(); // Move to 'wait'

      expect(matchesSequence(tokens, ctx.current, ['wait', 'for'])).toBe(true);
    });

    it('should not advance parser position', () => {
      const tokens = createTokenStream(['wait', 'for', 'event']);
      const ctx = createMockParserContext(tokens);
      const initialPos = ctx.current;

      matchesSequence(tokens, ctx.current, ['wait', 'for']);

      expect(ctx.current).toBe(initialPos);
    });

    it('should be case-sensitive', () => {
      const tokens = createTokenStream(['Wait', 'For']);
      const ctx = createMockParserContext(tokens);

      expect(matchesSequence(tokens, ctx.current, ['wait', 'for'])).toBe(false);
      expect(matchesSequence(tokens, ctx.current, ['Wait', 'For'])).toBe(true);
    });
  });
});
