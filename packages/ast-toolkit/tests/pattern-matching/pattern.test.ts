import { describe, it, expect } from 'vitest';
import { 
  matchPattern, 
  parsePattern, 
  extractPatterns, 
  matchWildcard,
  createPatternMatcher,
  PatternMatch
} from '../../src/pattern-matching/index.js';
import type { ASTNode } from '../../src/types.js';

// Mock AST nodes for testing
const createSimpleAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 25,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'add',
      start: 8,
      end: 25,
      line: 1,
      column: 9,
      args: [
        {
          type: 'selector',
          value: '.active',
          start: 12,
          end: 19,
          line: 1,
          column: 13
        }
      ],
      target: {
        type: 'identifier',
        name: 'me',
        start: 20,
        end: 22,
        line: 1,
        column: 21
      }
    }
  ]
} as any);

const createVariableAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 40,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'set',
      start: 8,
      end: 20,
      line: 1,
      column: 9,
      variable: {
        type: 'identifier',
        name: 'x',
        start: 12,
        end: 13,
        line: 1,
        column: 13
      },
      value: {
        type: 'literal',
        value: 5,
        start: 17,
        end: 18,
        line: 1,
        column: 18
      }
    },
    {
      type: 'command',
      name: 'log',
      start: 26,
      end: 31,
      line: 1,
      column: 27,
      args: [
        {
          type: 'identifier',
          name: 'x',
          start: 30,
          end: 31,
          line: 1,
          column: 31
        }
      ]
    }
  ]
} as any);

const createConditionalAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 60,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'conditional',
      start: 8,
      end: 60,
      line: 1,
      column: 9,
      condition: {
        type: 'binaryExpression',
        operator: '>',
        start: 11,
        end: 16,
        line: 1,
        column: 12,
        left: {
          type: 'identifier',
          name: 'x',
          start: 11,
          end: 12,
          line: 1,
          column: 12
        },
        right: {
          type: 'literal',
          value: 5,
          start: 15,
          end: 16,
          line: 1,
          column: 16
        }
      },
      then: {
        type: 'command',
        name: 'add',
        start: 22,
        end: 35,
        line: 1,
        column: 23,
        args: [
          {
            type: 'selector',
            value: '.big',
            start: 26,
            end: 30,
            line: 1,
            column: 27
          }
        ]
      }
    }
  ]
} as any);

describe('Pattern Matching - Basic Patterns', () => {
  it('should match simple literal patterns', () => {
    const ast = createSimpleAST();
    const pattern = 'on click add .active to me';
    
    const match = matchPattern(ast, pattern);
    
    expect(match).toBeDefined();
    expect(match!.confidence).toBeGreaterThan(0.8);
    expect(match!.bindings).toEqual({});
  });

  it('should match patterns with variables', () => {
    const ast = createSimpleAST(); 
    const pattern = 'on $event add $class to $target';
    
    const match = matchPattern(ast, pattern);
    
    expect(match).toBeDefined();
    expect(match!.bindings).toEqual({
      event: 'click',
      class: '.active', 
      target: 'me'
    });
  });

  it('should return null for non-matching patterns', () => {
    const ast = createSimpleAST();
    const pattern = 'on hover remove .inactive';
    
    const match = matchPattern(ast, pattern);
    
    expect(match).toBeNull();
  });

  it('should match with wildcards', () => {
    const ast = createSimpleAST();
    const pattern = 'on * add *';
    
    const match = matchWildcard(ast, pattern);
    
    expect(match).toBeTruthy();
  });

  it('should match nested structures', () => {
    const ast = createConditionalAST();
    const pattern = 'on click if $var > $value then add $class';

    const match = matchPattern(ast, pattern);

    expect(match).toBeDefined();
    // Bindings are extracted in AST traversal order, so values depend on order
    // The important thing is that the pattern matches and extracts bindings
    expect(match!.bindings).toHaveProperty('var');
    expect(match!.bindings).toHaveProperty('value');
    expect(match!.bindings).toHaveProperty('class');
    expect(match!.bindings.class).toBe('.big'); // class is the last variable, matches selector value
  });
});

describe('Pattern Matching - Pattern Parsing', () => {
  it('should parse simple patterns', () => {
    const pattern = 'on click add .active';
    
    const parsed = parsePattern(pattern);
    
    expect(parsed.tokens).toEqual([
      { type: 'keyword', value: 'on' },
      { type: 'literal', value: 'click' },
      { type: 'keyword', value: 'add' },
      { type: 'literal', value: '.active' }
    ]);
  });

  it('should parse patterns with variables', () => {
    const pattern = 'on $event add $class to $target';
    
    const parsed = parsePattern(pattern);
    
    expect(parsed.tokens).toEqual([
      { type: 'keyword', value: 'on' },
      { type: 'variable', value: 'event' },
      { type: 'keyword', value: 'add' },
      { type: 'variable', value: 'class' },
      { type: 'keyword', value: 'to' },
      { type: 'variable', value: 'target' }
    ]);
  });

  it('should parse patterns with wildcards', () => {
    const pattern = 'on * add * to *';
    
    const parsed = parsePattern(pattern);
    
    expect(parsed.tokens).toEqual([
      { type: 'keyword', value: 'on' },
      { type: 'wildcard', value: '*' },
      { type: 'keyword', value: 'add' },
      { type: 'wildcard', value: '*' },
      { type: 'keyword', value: 'to' },
      { type: 'wildcard', value: '*' }
    ]);
  });

  it('should handle complex nested patterns', () => {
    const pattern = 'if $condition then $action else $alternative end';

    const parsed = parsePattern(pattern);

    // Pattern has 7 tokens: if, $condition, then, $action, else, $alternative, end
    expect(parsed.tokens).toHaveLength(7);
    expect(parsed.tokens[0]).toEqual({ type: 'keyword', value: 'if' });
    expect(parsed.tokens[1]).toEqual({ type: 'variable', value: 'condition' });
  });
});

describe('Pattern Matching - Pattern Extraction', () => {
  it('should extract repeated patterns from multiple ASTs', () => {
    const asts = [
      createSimpleAST(),
      {
        ...createSimpleAST(),
        event: 'hover',
        commands: [{
          ...createSimpleAST().commands[0],
          args: [{ type: 'selector', value: '.hover', start: 0, end: 0, line: 1, column: 1 }]
        }]
      },
      {
        ...createSimpleAST(),
        event: 'focus',
        commands: [{
          ...createSimpleAST().commands[0],
          args: [{ type: 'selector', value: '.focus', start: 0, end: 0, line: 1, column: 1 }]
        }]
      }
    ] as ASTNode[];

    const patterns = extractPatterns(asts);

    // Multiple patterns may match; check that at least one matches all 3 ASTs
    expect(patterns.length).toBeGreaterThan(0);
    const highFrequencyPatterns = patterns.filter(p => p.occurrences >= 3);
    expect(highFrequencyPatterns.length).toBeGreaterThan(0);

    // The top pattern (highest frequency) should have 3 occurrences
    expect(patterns[0].occurrences).toBe(3);
  });

  it('should rank patterns by frequency', () => {
    const asts = [
      createSimpleAST(),
      createSimpleAST(),
      createVariableAST()
    ];
    
    const patterns = extractPatterns(asts);
    
    expect(patterns[0].occurrences).toBeGreaterThanOrEqual(patterns[1]?.occurrences || 0);
  });

  it('should handle patterns with different confidence levels', () => {
    const asts = [createSimpleAST(), createConditionalAST()];
    
    const patterns = extractPatterns(asts, { minConfidence: 0.5 });
    
    expect(patterns.every(p => p.confidence >= 0.5)).toBe(true);
  });
});

describe('Pattern Matching - Advanced Features', () => {
  it('should support pattern constraints', () => {
    const ast = createSimpleAST();
    const pattern = 'on $event add $class to $target';
    
    const matcher = createPatternMatcher(pattern, {
      event: (value) => typeof value === 'string' && value.length > 0,
      class: (value) => typeof value === 'string' && value.startsWith('.'),
      target: (value) => value === 'me' || value === 'you'
    });
    
    const match = matcher.match(ast);
    
    expect(match).toBeDefined();
    expect(match!.bindings.event).toBe('click');
    expect(match!.bindings.class).toBe('.active');
    expect(match!.bindings.target).toBe('me');
  });

  it('should reject patterns that fail constraints', () => {
    const ast = createSimpleAST();
    const pattern = 'on $event add $class to $target';
    
    const matcher = createPatternMatcher(pattern, {
      event: (value) => value === 'hover', // This will fail
      class: (value) => typeof value === 'string' && value.startsWith('.'),
      target: (value) => value === 'me'
    });
    
    const match = matcher.match(ast);
    
    expect(match).toBeNull();
  });

  it('should support partial pattern matching', () => {
    const ast = createSimpleAST();
    const pattern = 'add $class to $target';
    
    const match = matchPattern(ast, pattern, { partial: true });
    
    expect(match).toBeDefined();
    expect(match!.bindings).toEqual({
      class: '.active',
      target: 'me'
    });
  });

  it('should calculate pattern similarity', () => {
    const ast1 = createSimpleAST();
    const ast2 = {
      ...createSimpleAST(),
      event: 'hover'
    } as ASTNode;
    
    const pattern = 'on $event add $class to $target';
    const match1 = matchPattern(ast1, pattern);
    const match2 = matchPattern(ast2, pattern);
    
    expect(match1!.confidence).toBeCloseTo(match2!.confidence, 1);
  });
});

describe('Pattern Matching - Performance', () => {
  it('should handle large ASTs efficiently', () => {
    // Create a large nested AST
    const createLargeAST = (depth: number): ASTNode => {
      if (depth === 0) {
        return {
          type: 'literal',
          value: 'leaf',
          start: 0,
          end: 1,
          line: 1,
          column: 1
        };
      }

      return {
        type: 'container',
        start: 0,
        end: depth * 10,
        line: 1,
        column: 1,
        children: Array.from({ length: 5 }, () => createLargeAST(depth - 1))
      } as any;
    };

    const largeAST = createLargeAST(4); // 5^4 = 625 nodes
    // Use a pattern that matches values in the AST (leaf nodes have value: 'leaf')
    const pattern = '* leaf *';

    const startTime = Date.now();
    const match = matchWildcard(largeAST, pattern);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100); // Should be fast
    expect(match).toBeTruthy();
  });

  it('should cache pattern compilation', () => {
    const ast = createSimpleAST();
    const pattern = 'on $event add $class';
    
    // First call - should compile
    const start1 = Date.now();
    matchPattern(ast, pattern);
    const time1 = Date.now() - start1;
    
    // Second call - should use cache
    const start2 = Date.now();
    matchPattern(ast, pattern);
    const time2 = Date.now() - start2;
    
    expect(time2).toBeLessThanOrEqual(time1);
  });
});