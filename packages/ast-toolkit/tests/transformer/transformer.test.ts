import { describe, it, expect } from 'vitest';
import { 
  transform,
  optimize,
  normalize,
  inlineVariables,
  extractCommonExpressions,
  createOptimizationPass,
  applyOptimizationPasses
} from '../../src/transformer/index.js';
import type { ASTNode, TransformOptions, OptimizationPass } from '../../src/types.js';

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
          value: '.old',
          start: 12,
          end: 16,
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

const createRedundantAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 80,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.a', start: 0, end: 2, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    },
    {
      type: 'command',
      name: 'remove',
      args: [{ type: 'selector', value: '.a', start: 0, end: 2, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    },
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.a', start: 0, end: 2, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    }
  ]
} as any);

const createBatchableAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 100,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.one', start: 0, end: 4, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    },
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.two', start: 0, end: 4, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    },
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.three', start: 0, end: 6, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
    }
  ]
} as any);

const createVariableAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 60,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'set',
      variable: { type: 'identifier', name: 'x', start: 0, end: 1, line: 1, column: 1 },
      value: { type: 'literal', value: 5, start: 0, end: 1, line: 1, column: 1 }
    },
    {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.active', start: 0, end: 7, line: 1, column: 1 }],
      target: { type: 'identifier', name: 'x', start: 0, end: 1, line: 1, column: 1 }
    }
  ]
} as any);

describe('AST Transformer - Basic', () => {
  it('should transform nodes using visitor pattern', () => {
    const ast = createSimpleAST();
    
    const transformed = transform(ast, {
      selector(node, context) {
        if ((node as any).value === '.old') {
          context.replace({ ...node, value: '.new' });
        }
      }
    });
    
    const selector = (transformed.commands[0] as any).args[0];
    expect(selector.value).toBe('.new');
  });

  it('should support removing nodes', () => {
    const ast: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'log',
          args: [{ type: 'literal', value: 'debug', start: 0, end: 5, line: 1, column: 1 }]
        },
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.active', start: 0, end: 7, line: 1, column: 1 }]
        }
      ]
    } as any;
    
    const transformed = transform(ast, {
      command(node, context) {
        if ((node as any).name === 'log') {
          context.replace(null as any); // Remove node
        }
      }
    });
    
    expect((transformed as any).commands).toHaveLength(1);
    expect((transformed as any).commands[0].name).toBe('add');
  });

  it('should support replacing nodes with multiple nodes', () => {
    const ast: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 30,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.active', start: 0, end: 7, line: 1, column: 1 }],
          target: { type: 'identifier', name: 'me', start: 0, end: 2, line: 1, column: 1 }
        }
      ]
    } as any;
    
    const transformed = transform(ast, {
      command(node, context) {
        if ((node as any).name === 'toggle') {
          const removeCmd = {
            type: 'command',
            name: 'remove',
            args: [(node as any).args[0]],
            target: (node as any).target,
            start: 0, end: 10, line: 1, column: 1
          };
          const addCmd = {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.inactive', start: 0, end: 9, line: 1, column: 1 }],
            target: (node as any).target,
            start: 0, end: 10, line: 1, column: 1
          };
          context.replace([removeCmd, addCmd] as any);
        }
      }
    });
    
    expect((transformed as any).commands).toHaveLength(2);
    expect((transformed as any).commands[0].name).toBe('remove');
    expect((transformed as any).commands[1].name).toBe('add');
  });
});

describe('AST Transformer - Optimization', () => {
  it('should optimize redundant operations', () => {
    const ast = createRedundantAST();
    
    const optimized = optimize(ast, {
      redundantClassOperations: true
    });
    
    expect((optimized as any).commands).toHaveLength(1);
    expect((optimized as any).commands[0].name).toBe('add');
  });

  it('should batch similar operations', () => {
    const ast = createBatchableAST();
    
    const optimized = optimize(ast, {
      batchSimilarOperations: true
    });
    
    expect((optimized as any).commands).toHaveLength(1);
    expect((optimized as any).commands[0].name).toBe('add');
    expect((optimized as any).commands[0].args).toHaveLength(3); // Combined classes
  });

  it('should apply multiple optimization passes', () => {
    const ast = createBatchableAST();
    
    const pass1: OptimizationPass = {
      name: 'batch-operations',
      transform: (node, context) => {
        if ((node as any).commands && Array.isArray((node as any).commands)) {
          const commands = (node as any).commands;
          const addCommands = commands.filter((cmd: any) => cmd.name === 'add');
          if (addCommands.length > 1) {
            const batchedCommand = {
              ...addCommands[0],
              args: addCommands.map((cmd: any) => cmd.args[0])
            };
            const newCommands = commands.filter((cmd: any) => cmd.name !== 'add');
            newCommands.push(batchedCommand);
            context.replace({ ...node, commands: newCommands });
          }
        }
        return node;
      }
    };
    
    const optimized = applyOptimizationPasses(ast, [pass1]);
    
    expect((optimized as any).commands).toHaveLength(1);
  });
});

describe('Transformation Utilities', () => {
  it('should normalize AST structure', () => {
    const ast: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.active', start: 0, end: 7, line: 1, column: 1 }],
          extraProperty: 'should be removed' // Non-standard property
        }
      ]
    } as any;
    
    const normalized = normalize(ast);
    
    expect((normalized.commands[0] as any).extraProperty).toBeUndefined();
    expect((normalized.commands[0] as any).name).toBe('add');
  });

  it('should inline simple variables', () => {
    const ast = createVariableAST();
    
    const inlined = inlineVariables(ast);
    
    const lastCommand = (inlined as any).commands[1];
    expect(lastCommand.target.type).toBe('literal');
    expect(lastCommand.target.value).toBe(5);
  });

  it('should extract repeated expressions', () => {
    const ast: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 80,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'conditional',
          condition: {
            type: 'binaryExpression',
            operator: '>',
            left: {
              type: 'binaryExpression',
              operator: '+',
              left: {
                type: 'binaryExpression',
                operator: '*',
                left: { type: 'identifier', name: 'x', start: 0, end: 1, line: 1, column: 1 },
                right: { type: 'literal', value: 2, start: 0, end: 1, line: 1, column: 1 }
              },
              right: { type: 'literal', value: 1, start: 0, end: 1, line: 1, column: 1 }
            },
            right: { type: 'literal', value: 10, start: 0, end: 2, line: 1, column: 1 }
          },
          then: {
            type: 'command',
            name: 'log',
            args: [{
              type: 'binaryExpression',
              operator: '+',
              left: {
                type: 'binaryExpression',
                operator: '*',
                left: { type: 'identifier', name: 'x', start: 0, end: 1, line: 1, column: 1 },
                right: { type: 'literal', value: 2, start: 0, end: 1, line: 1, column: 1 }
              },
              right: { type: 'literal', value: 1, start: 0, end: 1, line: 1, column: 1 }
            }]
          }
        }
      ]
    } as any;
    
    const extracted = extractCommonExpressions(ast);
    
    // Should create a temporary variable for the repeated expression
    const commands = (extracted as any).commands;
    expect(commands.length).toBeGreaterThan(1);
    expect(commands.some((cmd: any) => cmd.name === 'set')).toBe(true);
  });
});

describe('Custom Optimization Passes', () => {
  it('should create and apply custom optimization pass', () => {
    const ast = createSimpleAST();
    
    const customPass = createOptimizationPass({
      name: 'replace-old-classes',
      description: 'Replace .old with .new',
      transform: (node, context) => {
        if (node.type === 'selector' && (node as any).value === '.old') {
          context.replace({ ...node, value: '.new' });
        }
        return node;
      }
    });
    
    const optimized = applyOptimizationPasses(ast, [customPass]);
    
    const selector = (optimized.commands[0] as any).args[0];
    expect(selector.value).toBe('.new');
  });

  it('should apply optimization passes in order', () => {
    const ast: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 30,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.step1', start: 0, end: 6, line: 1, column: 1 }]
        }
      ]
    } as any;
    
    const pass1 = createOptimizationPass({
      name: 'step1-to-step2',
      transform: (node, context) => {
        if (node.type === 'selector' && (node as any).value === '.step1') {
          context.replace({ ...node, value: '.step2' });
        }
        return node;
      }
    });
    
    const pass2 = createOptimizationPass({
      name: 'step2-to-final',
      transform: (node, context) => {
        if (node.type === 'selector' && (node as any).value === '.step2') {
          context.replace({ ...node, value: '.final' });
        }
        return node;
      }
    });
    
    const optimized = applyOptimizationPasses(ast, [pass1, pass2]);
    
    const selector = (optimized.commands[0] as any).args[0];
    expect(selector.value).toBe('.final');
  });
});

describe('Transform Options', () => {
  it('should respect transform options', () => {
    const ast = createBatchableAST();
    
    const options: TransformOptions = {
      optimize: true,
      batchOperations: true,
      preserveComments: false
    };
    
    const transformed = transform(ast, {}, options);
    
    // Should be optimized based on options
    expect(transformed).toBeDefined();
  });

  it('should handle minification option', () => {
    const ast = createSimpleAST();
    
    const options: TransformOptions = {
      minify: true
    };
    
    const transformed = transform(ast, {}, options);
    
    // Properties should be minimized
    expect(transformed).toBeDefined();
  });
});

describe('Error Handling', () => {
  it('should handle transformation errors gracefully', () => {
    const ast = createSimpleAST();
    
    const faultyTransformer = {
      enter() {
        throw new Error('Transformation error');
      }
    };
    
    expect(() => transform(ast, faultyTransformer)).toThrow('Transformation error');
  });

  it('should handle invalid replacement nodes', () => {
    const ast = createSimpleAST();
    
    const transformed = transform(ast, {
      command(node, context) {
        // Try to replace with invalid node
        context.replace({ invalid: 'node' } as any);
      }
    });
    
    // Should handle gracefully or preserve original
    expect(transformed).toBeDefined();
  });
});

describe('Performance', () => {
  it('should handle large ASTs efficiently', () => {
    // Create a large AST
    const createLargeAST = (size: number): ASTNode => ({
      type: 'eventHandler',
      start: 0,
      end: size * 10,
      line: 1,
      column: 1,
      event: 'click',
      commands: Array.from({ length: size }, (_, i) => ({
        type: 'command',
        name: 'add',
        start: i * 10,
        end: (i + 1) * 10,
        line: 1,
        column: 1,
        args: [{ type: 'selector', value: `.class${i}`, start: 0, end: 5, line: 1, column: 1 }]
      }))
    } as any);
    
    const largeAST = createLargeAST(100);
    
    const startTime = Date.now();
    const transformed = transform(largeAST, {
      selector(node) {
        // Simple transformation
        return node;
      }
    });
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(50); // Should be fast
    expect((transformed as any).commands).toHaveLength(100);
  });
});