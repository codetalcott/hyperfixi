import { describe, it, expect, beforeEach } from 'vitest';
import { ASTVisitor, visit, findNodes, findFirst, getAncestors } from './visitor.js';
import type { ASTNode, VisitorContext } from './types.js';

// Mock AST nodes for testing
const createMockAST = (): ASTNode =>
  ({
    type: 'eventHandler',
    start: 0,
    end: 20,
    line: 1,
    column: 1,
    event: 'click',
    commands: [
      {
        type: 'command',
        name: 'add',
        start: 8,
        end: 20,
        line: 1,
        column: 9,
        args: [
          {
            type: 'selector',
            value: '.active',
            start: 12,
            end: 19,
            line: 1,
            column: 13,
          },
        ],
        target: {
          type: 'identifier',
          name: 'me',
          start: 17,
          end: 19,
          line: 1,
          column: 18,
        },
      },
    ],
  }) as any;

const createComplexAST = (): ASTNode =>
  ({
    type: 'conditional',
    start: 0,
    end: 50,
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
        column: 4,
      },
      right: {
        type: 'literal',
        value: 5,
        start: 7,
        end: 8,
        line: 1,
        column: 8,
      },
    },
    then: {
      type: 'command',
      name: 'add',
      start: 14,
      end: 25,
      line: 1,
      column: 15,
      args: [
        {
          type: 'selector',
          value: '.big',
          start: 18,
          end: 21,
          line: 1,
          column: 19,
        },
      ],
    },
    else: {
      type: 'command',
      name: 'add',
      start: 31,
      end: 44,
      line: 1,
      column: 32,
      args: [
        {
          type: 'selector',
          value: '.small',
          start: 35,
          end: 41,
          line: 1,
          column: 36,
        },
      ],
    },
  }) as any;

describe('ASTVisitor - Basic Traversal', () => {
  it('should visit all nodes in order', () => {
    const ast = createMockAST();
    const visited: string[] = [];

    const visitor = new ASTVisitor({
      enter(node) {
        visited.push(`enter:${node.type}`);
      },
      exit(node) {
        visited.push(`exit:${node.type}`);
      },
    });

    visit(ast, visitor);

    expect(visited).toEqual([
      'enter:eventHandler',
      'enter:command',
      'enter:selector',
      'exit:selector',
      'enter:identifier',
      'exit:identifier',
      'exit:command',
      'exit:eventHandler',
    ]);
  });

  it('should support node-specific visitors', () => {
    const ast = createMockAST();
    const selectors: string[] = [];

    const visitor = new ASTVisitor({
      selector(node: any) {
        selectors.push(node.value);
      },
    });

    visit(ast, visitor);
    expect(selectors).toEqual(['.active']);
  });

  it('should allow visitor to skip subtrees', () => {
    const ast = createComplexAST();
    const visited: string[] = [];

    const visitor = new ASTVisitor({
      enter(node, context) {
        visited.push(node.type);
        if (node.type === 'conditional') {
          context.skip(); // Skip visiting children
        }
      },
    });

    visit(ast, visitor);
    expect(visited).toEqual(['conditional']);
  });

  it('should allow stopping traversal', () => {
    const ast = createComplexAST();
    const visited: string[] = [];

    const visitor = new ASTVisitor({
      enter(node, context) {
        visited.push(node.type);
        if (node.type === 'binaryExpression') {
          context.stop(); // Stop traversal completely
        }
      },
    });

    visit(ast, visitor);
    expect(visited).toEqual(['conditional', 'binaryExpression']);
  });
});

describe('ASTVisitor - Advanced Features', () => {
  it('should collect node paths during traversal', () => {
    const ast = createMockAST();
    const paths: string[] = [];

    const visitor = new ASTVisitor({
      enter(node, context) {
        const path = context.getPath().join('/');
        if (path) paths.push(path);
      },
    });

    visit(ast, visitor);
    expect(paths).toContain('commands/0');
    expect(paths).toContain('commands/0/args/0');
  });

  it('should support parent node access', () => {
    const ast = createComplexAST();
    let capturedParent: ASTNode | null = null;

    const visitor = new ASTVisitor({
      identifier(node: any, context) {
        if (node.name === 'x') {
          capturedParent = context.getParent();
        }
      },
    });

    visit(ast, visitor);
    expect((capturedParent as ASTNode | null)?.type).toBe('binaryExpression');
  });

  it('should maintain scope information', () => {
    const ast = createMockAST();
    const scopes: Map<string, any>[] = [];

    const visitor = new ASTVisitor({
      enter(node, context) {
        if (node.type === 'command') {
          context.setScope('currentCommand', (node as any).name);
        }
      },
      selector(node: any, context) {
        scopes.push(new Map(context.getScope()));
      },
    });

    visit(ast, visitor);
    expect(scopes[0].get('currentCommand')).toBe('add');
  });

  it('should support node replacement', () => {
    const ast = createMockAST();
    const replacedNodes: ASTNode[] = [];

    const visitor = new ASTVisitor({
      selector(node: any, context) {
        if (node.value === '.active') {
          const newNode = { ...node, value: '.inactive' };
          context.replace(newNode);
          replacedNodes.push(newNode);
        }
      },
    });

    const result = visit(ast, visitor);
    expect(replacedNodes).toHaveLength(1);
    expect(replacedNodes[0].value).toBe('.inactive');
  });
});

describe('Visitor Utilities', () => {
  it('should find all nodes matching predicate', () => {
    const ast = createComplexAST();

    const nodes = findNodes(ast, node => node.type === 'command');

    expect(nodes).toHaveLength(2);
    expect(nodes.map((n: any) => n.name)).toEqual(['add', 'add']);
  });

  it('should find first node matching predicate', () => {
    const ast = createComplexAST();

    const node = findFirst(ast, n => n.type === 'command');
    expect((node as any)?.name).toBe('add');
  });

  it('should get all ancestors of a node', () => {
    const ast = createComplexAST();
    const targetNode = findFirst(ast, n => n.type === 'literal');

    const ancestors = getAncestors(ast, targetNode!);
    expect(ancestors.map(n => n.type)).toEqual(['binaryExpression', 'conditional']);
  });

  it('should handle empty AST gracefully', () => {
    const ast = null;
    const nodes = findNodes(ast, () => true);
    expect(nodes).toEqual([]);
  });

  it('should handle nodes with no children', () => {
    const leafNode: ASTNode = {
      type: 'literal',
      start: 0,
      end: 1,
      line: 1,
      column: 1,
    };

    const visited: string[] = [];
    const visitor = new ASTVisitor({
      enter(node) {
        visited.push(node.type);
      },
    });

    visit(leafNode, visitor);
    expect(visited).toEqual(['literal']);
  });
});

describe('Visitor Error Handling', () => {
  it('should handle visitor exceptions gracefully', () => {
    const ast = createMockAST();

    const visitor = new ASTVisitor({
      enter(node) {
        if (node.type === 'selector') {
          throw new Error('Test error');
        }
      },
    });

    expect(() => visit(ast, visitor)).toThrow('Test error');
  });

  it('should handle malformed AST nodes', () => {
    const malformedAST = {
      type: 'test',
      // Missing required fields
    } as ASTNode;

    const visitor = new ASTVisitor({
      enter(node) {
        // Should still work
      },
    });

    expect(() => visit(malformedAST, visitor)).not.toThrow();
  });
});

describe('Visitor Performance', () => {
  it('should handle large ASTs efficiently', () => {
    // Create a large nested AST
    let ast: any = {
      type: 'root',
      start: 0,
      end: 1000,
      line: 1,
      column: 1,
    };

    // Build 100 nested levels
    let current = ast;
    for (let i = 0; i < 100; i++) {
      current.child = {
        type: 'nested',
        start: i,
        end: i + 1,
        line: 1,
        column: 1,
        depth: i,
      };
      current = current.child;
    }

    let visitCount = 0;
    const visitor = new ASTVisitor({
      enter() {
        visitCount++;
      },
    });

    const startTime = Date.now();
    visit(ast, visitor);
    const endTime = Date.now();

    expect(visitCount).toBe(101); // root + 100 nested
    expect(endTime - startTime).toBeLessThan(10); // Should be very fast
  });
});
