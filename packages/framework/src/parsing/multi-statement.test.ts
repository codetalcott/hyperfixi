import { describe, it, expect, vi } from 'vitest';
import {
  createMultiStatementParser,
  accumulateBlocks,
  type MultiStatementConfig,
  type ParsedStatement,
} from './multi-statement';
import type { MultilingualDSL } from '../api/create-dsl';
import type { SemanticNode } from '../core/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDSL(
  parseImpl?: (input: string, language: string) => SemanticNode
): MultilingualDSL {
  const defaultParse = (input: string, _language: string): SemanticNode => ({
    kind: 'command',
    action: input.split(/\s+/)[0].toLowerCase(),
    roles: new Map([['raw', { type: 'expression' as const, raw: input }]]),
  });

  return {
    parse: parseImpl ?? defaultParse,
    parseWithConfidence: (input: string, language: string) => ({
      node: (parseImpl ?? defaultParse)(input, language),
      confidence: 1.0,
    }),
    validate: () => ({ valid: true }),
    compile: () => ({ ok: true }),
    translate: (input: string) => input,
    getSupportedLanguages: () => ['en'],
  };
}

function mockNode(action: string, source?: string): SemanticNode {
  return {
    kind: 'command',
    action,
    roles: new Map(source ? [['raw', { type: 'expression' as const, raw: source }]] : []),
  };
}

// =============================================================================
// Statement Splitting
// =============================================================================

describe('createMultiStatementParser', () => {
  describe('line-based splitting', () => {
    const config: MultiStatementConfig = {
      split: { mode: 'line' },
    };

    it('splits input on newlines', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible\nwhen click\nthen hidden', 'en');
      expect(result.statements).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('skips empty lines', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible\n\n\nwhen click', 'en');
      expect(result.statements).toHaveLength(2);
    });

    it('skips comment lines', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse(
        'given visible\n-- this is a comment\n// also a comment\nwhen click',
        'en'
      );
      expect(result.statements).toHaveLength(2);
    });

    it('tracks line numbers correctly', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible\n\nwhen click\n-- comment\nthen hidden', 'en');
      expect(result.statements[0].line).toBe(1);
      expect(result.statements[1].line).toBe(3);
      expect(result.statements[2].line).toBe(5);
    });

    it('tracks indentation', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('test login\n  given visible\n    expect hidden', 'en');
      expect(result.statements[0].indent).toBe(0);
      expect(result.statements[1].indent).toBe(2);
      expect(result.statements[2].indent).toBe(4);
    });
  });

  describe('delimiter-based splitting', () => {
    const config: MultiStatementConfig = {
      split: {
        mode: 'delimiter',
        delimiters: {
          en: /,\s*|\n\s*/,
          ja: /、|。|\n\s*/,
        },
        defaultDelimiter: /,\s*|\n\s*/,
      },
    };

    it('splits on language-specific delimiters', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible, when click, then hidden', 'en');
      expect(result.statements).toHaveLength(3);
    });

    it('uses language-specific delimiters for Japanese', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('前提 表示、もし クリック。ならば 非表示', 'ja');
      expect(result.statements).toHaveLength(3);
    });

    it('uses default delimiter for unknown languages', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible, when click', 'fr');
      expect(result.statements).toHaveLength(2);
    });
  });

  // =============================================================================
  // Keyword Classification
  // =============================================================================

  describe('keyword classification', () => {
    const config: MultiStatementConfig = {
      split: { mode: 'line' },
      keywords: {
        categories: {
          given: { en: ['given'], ja: ['前提'], es: ['dado'] },
          when: { en: ['when'], ja: ['もし'], es: ['cuando'] },
          then: { en: ['then'], ja: ['ならば'], es: ['entonces'] },
        },
        wordOrders: { ja: 'SOV' },
      },
    };

    it('classifies SVO lines by start keyword', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible\nwhen click\nthen hidden', 'en');
      expect(result.statements[0].category).toBe('given');
      expect(result.statements[1].category).toBe('when');
      expect(result.statements[2].category).toBe('then');
    });

    it('classifies SOV lines by end keyword', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('表示 前提\nクリック もし', 'ja');
      expect(result.statements[0].category).toBe('given');
      expect(result.statements[1].category).toBe('when');
    });

    it('returns undefined category for unrecognized lines', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('some random line', 'en');
      expect(result.statements[0].category).toBeUndefined();
    });

    it('falls back to English keywords for unknown languages', () => {
      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible', 'fr');
      expect(result.statements[0].category).toBe('given');
    });
  });

  // =============================================================================
  // Continuation Resolution
  // =============================================================================

  describe('continuation resolution', () => {
    const config: MultiStatementConfig = {
      split: { mode: 'delimiter', defaultDelimiter: /,\s*|\n\s*/ },
      keywords: {
        categories: {
          given: { en: ['given'] },
          when: { en: ['when'] },
          then: { en: ['then'] },
        },
      },
      continuation: {
        keywords: { en: ['and'] },
      },
    };

    it('resolves "and" by re-prefixing with previous keyword', () => {
      const parseCalls: string[] = [];
      const dsl = createMockDSL(input => {
        parseCalls.push(input);
        return mockNode(input.split(/\s+/)[0].toLowerCase(), input);
      });
      const parser = createMultiStatementParser(dsl, config);

      parser.parse('given visible, and enabled', 'en');
      expect(parseCalls).toContain('given enabled');
    });

    it('does not resolve "and" without a previous statement', () => {
      const parseCalls: string[] = [];
      const dsl = createMockDSL(input => {
        parseCalls.push(input);
        return mockNode('test', input);
      });
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('and something', 'en');
      // Without previous category, continuation doesn't resolve — parses as-is
      expect(parseCalls).toContain('and something');
    });

    it('supports custom resolve function', () => {
      const customConfig: MultiStatementConfig = {
        ...config,
        continuation: {
          keywords: { en: ['and'] },
          resolve: (content, prevCategory) => `${prevCategory}: ${content}`,
        },
      };

      const parseCalls: string[] = [];
      const dsl = createMockDSL(input => {
        parseCalls.push(input);
        return mockNode('test', input);
      });
      const parser = createMultiStatementParser(dsl, customConfig);

      parser.parse('given visible, and enabled', 'en');
      expect(parseCalls).toContain('given: enabled');
    });
  });

  // =============================================================================
  // Preprocessor
  // =============================================================================

  describe('preprocessor', () => {
    it('allows transforming lines before parsing', () => {
      const config: MultiStatementConfig = {
        split: { mode: 'line' },
        preprocessor: (line, _cat, _lang) => {
          // Strip "the" article
          return line.replace(/\bthe\s+/gi, '');
        },
      };

      const parseCalls: string[] = [];
      const dsl = createMockDSL(input => {
        parseCalls.push(input);
        return mockNode('test', input);
      });
      const parser = createMultiStatementParser(dsl, config);

      parser.parse('toggle the .active', 'en');
      expect(parseCalls[0]).toBe('toggle .active');
    });

    it('allows skipping lines by returning null', () => {
      const config: MultiStatementConfig = {
        split: { mode: 'line' },
        preprocessor: line => {
          if (line.startsWith('skip:')) return null;
          return line;
        },
      };

      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      const result = parser.parse('given visible\nskip: this line\nwhen click', 'en');
      expect(result.statements).toHaveLength(2);
    });

    it('receives context with previous statement', () => {
      const contexts: Array<{ previous?: { action: string }; lineNumber: number }> = [];

      const config: MultiStatementConfig = {
        split: { mode: 'line' },
        preprocessor: (line, _cat, _lang, ctx) => {
          contexts.push({
            previous: ctx.previous ? { action: ctx.previous.node.action } : undefined,
            lineNumber: ctx.lineNumber,
          });
          return line;
        },
      };

      const dsl = createMockDSL();
      const parser = createMultiStatementParser(dsl, config);

      parser.parse('given visible\nwhen click', 'en');
      expect(contexts[0].previous).toBeUndefined();
      expect(contexts[0].lineNumber).toBe(1);
      expect(contexts[1].previous?.action).toBe('given');
      expect(contexts[1].lineNumber).toBe(2);
    });
  });

  // =============================================================================
  // Error Collection
  // =============================================================================

  describe('error collection', () => {
    it('collects parse errors with line numbers', () => {
      const dsl = createMockDSL(input => {
        if (input.includes('bad')) throw new Error('Parse failed');
        return mockNode('test', input);
      });

      const config: MultiStatementConfig = {
        split: { mode: 'line' },
      };

      const parser = createMultiStatementParser(dsl, config);
      const result = parser.parse('good line\nbad line\nanother good', 'en');

      expect(result.statements).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Parse failed');
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].source).toBe('bad line');
      expect(result.errors[0].code).toBe('parse-error');
    });

    it('continues parsing after errors', () => {
      const dsl = createMockDSL(input => {
        if (input.includes('error')) throw new Error('fail');
        return mockNode('test', input);
      });

      const config: MultiStatementConfig = {
        split: { mode: 'line' },
      };

      const parser = createMultiStatementParser(dsl, config);
      const result = parser.parse('ok1\nerror1\nok2\nerror2\nok3', 'en');

      expect(result.statements).toHaveLength(3);
      expect(result.errors).toHaveLength(2);
    });
  });
});

// =============================================================================
// Block Accumulator
// =============================================================================

describe('accumulateBlocks', () => {
  function stmt(
    category: string | undefined,
    source: string,
    line: number,
    indent: number
  ): ParsedStatement {
    return {
      node: mockNode(category ?? 'unknown', source),
      source,
      line,
      category,
      indent,
    };
  }

  describe('flat mode', () => {
    it('groups statements into blocks by block-opening keywords', () => {
      const statements = [
        stmt('test', 'test "Login"', 1, 0),
        stmt('given', 'given visible', 2, 2),
        stmt('when', 'when click', 3, 2),
        stmt('test', 'test "Logout"', 4, 0),
        stmt('given', 'given logged in', 5, 2),
      ];

      const result = accumulateBlocks(statements, {
        blockTypes: ['test'],
        nesting: 'flat',
        extractName: text => text.match(/"([^"]+)"/)?.[1],
      });

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].name).toBe('Login');
      expect(result.blocks[0].statements).toHaveLength(3); // test + given + when
      expect(result.blocks[1].name).toBe('Logout');
      expect(result.blocks[1].statements).toHaveLength(2);
      expect(result.orphans).toHaveLength(0);
    });

    it('collects orphan statements before first block', () => {
      const statements = [
        stmt(undefined, 'setup line', 1, 0),
        stmt('test', 'test "First"', 2, 0),
        stmt('given', 'given x', 3, 2),
      ];

      const result = accumulateBlocks(statements, {
        blockTypes: ['test'],
        nesting: 'flat',
      });

      expect(result.blocks).toHaveLength(1);
      expect(result.orphans).toHaveLength(1);
      expect(result.orphans[0].source).toBe('setup line');
    });
  });

  describe('indent mode', () => {
    it('nests blocks by indentation', () => {
      const statements = [
        stmt('feature', 'feature "Cart"', 1, 0),
        stmt('test', 'test "Add"', 2, 2),
        stmt('given', 'given visible', 3, 4),
        stmt('when', 'when click', 4, 4),
        stmt('test', 'test "Remove"', 5, 2),
        stmt('when', 'when click remove', 6, 4),
      ];

      const result = accumulateBlocks(statements, {
        blockTypes: ['feature', 'test'],
        nesting: 'indent',
        extractName: text => text.match(/"([^"]+)"/)?.[1],
      });

      expect(result.blocks).toHaveLength(1);
      const feature = result.blocks[0];
      expect(feature.name).toBe('Cart');
      expect(feature.children).toHaveLength(2);
      expect(feature.children[0].name).toBe('Add');
      expect(feature.children[0].statements).toHaveLength(3); // test + given + when
      expect(feature.children[1].name).toBe('Remove');
      expect(result.orphans).toHaveLength(0);
    });

    it('handles multiple top-level blocks', () => {
      const statements = [
        stmt('feature', 'feature "A"', 1, 0),
        stmt('test', 'test "A1"', 2, 2),
        stmt('feature', 'feature "B"', 3, 0),
        stmt('test', 'test "B1"', 4, 2),
      ];

      const result = accumulateBlocks(statements, {
        blockTypes: ['feature', 'test'],
        nesting: 'indent',
        extractName: text => text.match(/"([^"]+)"/)?.[1],
      });

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].name).toBe('A');
      expect(result.blocks[0].children).toHaveLength(1);
      expect(result.blocks[1].name).toBe('B');
      expect(result.blocks[1].children).toHaveLength(1);
    });
  });
});
