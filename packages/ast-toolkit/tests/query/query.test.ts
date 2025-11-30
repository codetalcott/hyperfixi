import { describe, it, expect } from 'vitest';
import { query, queryAll, parseSelector } from '../../src/query/index.js';
import type { ASTNode, QueryMatch } from '../../src/types.js';

// Create complex test AST
const createTestAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 60,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'add',
      start: 8,
      end: 30,
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
        start: 23,
        end: 25,
        line: 1,
        column: 24
      }
    },
    {
      type: 'command',
      name: 'remove',
      start: 31,
      end: 50,
      line: 1,
      column: 32,
      args: [
        {
          type: 'selector',
          value: '.inactive',
          start: 38,
          end: 47,
          line: 1,
          column: 39
        }
      ]
    }
  ]
} as any);

const createNestedAST = (): ASTNode => ({
  type: 'conditional',
  start: 0,
  end: 80,
  line: 1,
  column: 1,
  condition: {
    type: 'binaryExpression',
    operator: '>',
    start: 3,
    end: 8,
    line: 1,
    column: 4,
    left: {
      type: 'identifier',
      name: 'x',
      start: 3,
      end: 4,
      line: 1,
      column: 4
    },
    right: {
      type: 'literal',
      value: 5,
      start: 7,
      end: 8,
      line: 1,
      column: 8
    }
  },
  then: {
    type: 'command',
    name: 'add',
    start: 14,
    end: 35,
    line: 1,
    column: 15,
    args: [
      {
        type: 'selector',
        value: '.big',
        start: 18,
        end: 22,
        line: 1,
        column: 19
      }
    ],
    target: {
      type: 'identifier',
      name: 'me',
      start: 26,
      end: 28,
      line: 1,
      column: 27
    }
  }
} as any);

describe('Query Engine - Basic Selectors', () => {
  it('should query by node type', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command');
    
    expect(matches).toHaveLength(2);
    expect(matches.map(m => (m.node as any).name)).toEqual(['add', 'remove']);
  });

  it('should query by attribute value', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command[name="add"]');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('add');
  });

  it('should query by multiple attributes', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'selector[value=".active"]');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).value).toBe('.active');
  });

  it('should return first match only', () => {
    const ast = createTestAST();
    
    const match = query(ast, 'command');
    
    expect(match).toBeDefined();
    expect((match!.node as any).name).toBe('add');
  });

  it('should return null when no matches found', () => {
    const ast = createTestAST();
    
    const match = query(ast, 'nonexistent');
    
    expect(match).toBeNull();
  });
});

describe('Query Engine - Advanced Selectors', () => {
  it('should support descendant selectors', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'eventHandler command');
    
    expect(matches).toHaveLength(2);
    expect(matches.map(m => (m.node as any).name)).toEqual(['add', 'remove']);
  });

  it('should support child selectors', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'eventHandler > command');
    
    expect(matches).toHaveLength(2);
  });

  it('should support attribute existence check', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command[target]');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('add');
  });

  it('should support attribute pattern matching', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'selector[value^="."]');
    
    expect(matches).toHaveLength(2);
    expect(matches.map(m => (m.node as any).value)).toEqual(['.active', '.inactive']);
  });

  it('should support multiple selectors', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command, selector');
    
    expect(matches).toHaveLength(4); // 2 commands + 2 selectors
  });
});

describe('Query Engine - Pseudo Selectors', () => {
  it('should support :first-child pseudo selector', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command:first-child');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('add');
  });

  it('should support :last-child pseudo selector', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command:last-child');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('remove');
  });

  it('should support :has() pseudo selector', () => {
    const ast = createNestedAST();
    
    const matches = queryAll(ast, 'conditional:has(identifier[name="me"])');
    
    expect(matches).toHaveLength(1);
    expect(matches[0].node.type).toBe('conditional');
  });

  it('should support :not() pseudo selector', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command:not([name="add"])');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('remove');
  });

  it('should support :contains() pseudo selector', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'selector:contains("active")');
    
    expect(matches).toHaveLength(2); // .active and .inactive both contain "active"
  });
});

describe('Query Engine - Complex Queries', () => {
  it('should handle nested descendant queries', () => {
    const ast = createNestedAST();
    
    const matches = queryAll(ast, 'conditional binaryExpression identifier');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('x');
  });

  it('should support combining multiple pseudo selectors', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command:first-child[name="add"]');
    
    expect(matches).toHaveLength(1);
    expect((matches[0].node as any).name).toBe('add');
  });

  it('should return query matches with paths', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'selector');
    
    expect(matches[0].path).toEqual(['commands/0', 'args/0']);
    expect(matches[1].path).toEqual(['commands/1', 'args/0']);
  });

  it('should support queries with capturing groups', () => {
    const ast = createTestAST();
    
    const matches = queryAll(ast, 'command[name] > selector[value]');
    
    expect(matches).toHaveLength(2);
    expect(matches[0].matches).toEqual({
      'command[name]': 'add',
      'selector[value]': '.active'
    });
  });
});

describe('Query Engine - Error Handling', () => {
  it('should handle invalid selectors gracefully', () => {
    const ast = createTestAST();
    
    expect(() => queryAll(ast, 'invalid[[')).toThrow();
  });

  it('should handle empty AST', () => {
    const matches = queryAll(null, 'command');
    
    expect(matches).toEqual([]);
  });

  it('should handle complex invalid queries', () => {
    const ast = createTestAST();
    
    expect(() => queryAll(ast, 'command > > selector')).toThrow();
  });
});

describe('Query Selector Parser', () => {
  it('should parse simple type selectors', () => {
    const selector = parseSelector('command');
    
    expect(selector).toEqual({
      type: 'command',
      attributes: [],
      pseudos: [],
      combinator: null
    });
  });

  it('should parse attribute selectors', () => {
    const selector = parseSelector('command[name="add"][target]');
    
    expect(selector.attributes).toEqual([
      { name: 'name', operator: '=', value: 'add' },
      { name: 'target', operator: 'exists', value: null }
    ]);
  });

  it('should parse pseudo selectors', () => {
    const selector = parseSelector('command:first-child:not([name="remove"])');
    
    expect(selector.pseudos).toEqual([
      { name: 'first-child', argument: null },
      { name: 'not', argument: '[name="remove"]' }
    ]);
  });

  it('should parse combinators', () => {
    const selectors = parseSelector('eventHandler > command + selector');

    // All selectors have consistent shape with attributes and pseudos arrays
    expect(selectors).toEqual({
      type: 'eventHandler',
      attributes: [],
      pseudos: [],
      combinator: {
        type: '>',
        right: {
          type: 'command',
          attributes: [],
          pseudos: [],
          combinator: {
            type: '+',
            right: {
              type: 'selector',
              attributes: [],
              pseudos: [],
              combinator: null
            }
          }
        }
      }
    });
  });
});