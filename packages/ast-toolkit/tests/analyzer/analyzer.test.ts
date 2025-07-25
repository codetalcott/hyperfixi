import { describe, it, expect } from 'vitest';
import { 
  calculateComplexity,
  detectCodeSmells,
  analyzeMetrics,
  analyzeDependencies,
  findDeadCode,
  suggestOptimizations,
  analyzePatterns
} from '../../src/analyzer/index.js';
import type { ASTNode, ComplexityMetrics, CodeSmell, AnalysisResult } from '../../src/types.js';

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

const createComplexAST = (): ASTNode => ({
  type: 'eventHandler',
  start: 0,
  end: 100,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'conditional',
      start: 8,
      end: 100,
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
        type: 'conditional',
        condition: {
          type: 'binaryExpression',
          operator: '>',
          left: {
            type: 'identifier',
            name: 'y',
            start: 25,
            end: 26,
            line: 1,
            column: 26
          },
          right: {
            type: 'literal',
            value: 10,
            start: 29,
            end: 31,
            line: 1,
            column: 30
          }
        },
        then: {
          type: 'command',
          name: 'add',
          args: [
            {
              type: 'selector',
              value: '.big',
              start: 40,
              end: 44,
              line: 1,
              column: 41
            }
          ]
        },
        else: {
          type: 'command',
          name: 'add',
          args: [
            {
              type: 'selector',
              value: '.medium',
              start: 55,
              end: 62,
              line: 1,
              column: 56
            }
          ]
        }
      },
      else: {
        type: 'command',
        name: 'add',
        args: [
          {
            type: 'selector',
            value: '.small',
            start: 80,
            end: 86,
            line: 1,
            column: 81
          }
        ]
      }
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
      name: 'set',
      start: 25,
      end: 40,
      line: 1,
      column: 26,
      variable: {
        type: 'identifier',
        name: 'y',
        start: 29,
        end: 30,
        line: 1,
        column: 30
      },
      value: {
        type: 'binaryExpression',
        operator: '*',
        left: {
          type: 'identifier',
          name: 'x',
          start: 34,
          end: 35,
          line: 1,
          column: 35
        },
        right: {
          type: 'literal',
          value: 2,
          start: 38,
          end: 39,
          line: 1,
          column: 39
        }
      }
    },
    {
      type: 'command',
      name: 'log',
      start: 45,
      end: 50,
      line: 1,
      column: 46,
      args: [
        {
          type: 'identifier',
          name: 'y',
          start: 49,
          end: 50,
          line: 1,
          column: 50
        }
      ]
    }
  ]
} as any);

describe('Complexity Analysis', () => {
  it('should calculate cyclomatic complexity', () => {
    const ast = createComplexAST();
    
    const complexity = calculateComplexity(ast);
    
    expect(complexity.cyclomatic).toBeGreaterThanOrEqual(3); // 3+ decision points
    expect(complexity.cognitive).toBeGreaterThan(0);
    expect(complexity.halstead.vocabulary).toBeGreaterThan(0);
    expect(complexity.halstead.length).toBeGreaterThan(0);
  });

  it('should calculate simple complexity for basic AST', () => {
    const ast = createSimpleAST();
    
    const complexity = calculateComplexity(ast);
    
    expect(complexity.cyclomatic).toBe(1); // No branching
    expect(complexity.cognitive).toBeLessThan(5);
  });

  it('should calculate Halstead metrics', () => {
    const ast = createVariableAST();
    
    const complexity = calculateComplexity(ast);
    
    expect(complexity.halstead.vocabulary).toBeGreaterThan(5);
    expect(complexity.halstead.length).toBeGreaterThan(8);
    expect(complexity.halstead.difficulty).toBeGreaterThan(0);
    expect(complexity.halstead.effort).toBeGreaterThan(0);
  });
});

describe('Code Smell Detection', () => {
  it('should detect excessive nesting', () => {
    const ast = createComplexAST();
    
    const smells = detectCodeSmells(ast);
    
    const nestingSmell = smells.find(smell => smell.type === 'excessive-nesting');
    expect(nestingSmell).toBeDefined();
    expect(nestingSmell!.severity).toBe('high');
    expect(nestingSmell!.message).toContain('Nesting depth');
  });

  it('should detect duplicate code patterns', () => {
    const ast: ASTNode = {
      type: 'program',
      start: 0,
      end: 100,
      line: 1,
      column: 1,
      features: [
        createSimpleAST(),
        createSimpleAST() // Duplicate
      ]
    } as any;
    
    const smells = detectCodeSmells(ast);
    
    const duplicateSmell = smells.find(smell => smell.type === 'duplicate-code');
    expect(duplicateSmell).toBeDefined();
  });

  it('should detect long command chains', () => {
    const longChainAST: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 200,
      line: 1,
      column: 1,
      event: 'click',
      commands: Array.from({ length: 8 }, (_, i) => ({
        type: 'command',
        name: 'add',
        start: i * 20,
        end: (i + 1) * 20,
        line: 1,
        column: 1,
        args: [{ type: 'selector', value: `.class${i}`, start: 0, end: 5, line: 1, column: 1 }]
      }))
    } as any;
    
    const smells = detectCodeSmells(longChainAST);
    
    const longChainSmell = smells.find(smell => smell.type === 'long-command-chain');
    expect(longChainSmell).toBeDefined();
    expect(longChainSmell!.severity).toBe('medium');
  });

  it('should return empty array for clean code', () => {
    const ast = createSimpleAST();
    
    const smells = detectCodeSmells(ast);
    
    expect(smells.filter(s => s.severity === 'high')).toHaveLength(0);
  });
});

describe('Dependency Analysis', () => {
  it('should analyze variable dependencies', () => {
    const ast = createVariableAST();
    
    const deps = analyzeDependencies(ast);
    
    expect(deps.nodes).toContain('x');
    expect(deps.nodes).toContain('y');
    expect(deps.edges.get('y')).toContain('x');
    expect(deps.cycles).toHaveLength(0);
  });

  it('should detect circular dependencies', () => {
    const circularAST: ASTNode = {
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
          variable: { type: 'identifier', name: 'a', start: 0, end: 1, line: 1, column: 1 },
          value: { type: 'identifier', name: 'b', start: 0, end: 1, line: 1, column: 1 }
        },
        {
          type: 'command',
          name: 'set',
          variable: { type: 'identifier', name: 'b', start: 0, end: 1, line: 1, column: 1 },
          value: { type: 'identifier', name: 'a', start: 0, end: 1, line: 1, column: 1 }
        }
      ]
    } as any;
    
    const deps = analyzeDependencies(circularAST);
    
    expect(deps.cycles.length).toBeGreaterThan(0);
  });

  it('should return empty graph for independent code', () => {
    const ast = createSimpleAST();
    
    const deps = analyzeDependencies(ast);
    
    expect(deps.nodes.size).toBe(0);
    expect(deps.edges.size).toBe(0);
  });
});

describe('Dead Code Detection', () => {
  it('should find unused variables', () => {
    const deadCodeAST: ASTNode = {
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
          variable: { type: 'identifier', name: 'unused', start: 0, end: 6, line: 1, column: 1 },
          value: { type: 'literal', value: 42, start: 0, end: 2, line: 1, column: 1 }
        },
        {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.active', start: 0, end: 7, line: 1, column: 1 }]
        }
      ]
    } as any;
    
    const deadCode = findDeadCode(deadCodeAST);
    
    expect(deadCode).toHaveLength(1);
    expect(deadCode[0].type).toBe('unused-variable');
    expect(deadCode[0].name).toBe('unused');
  });

  it('should find unreachable code', () => {
    const unreachableAST: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 60,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'halt',
          start: 0,
          end: 4,
          line: 1,
          column: 1
        },
        {
          type: 'command',
          name: 'add',
          start: 10,
          end: 20,
          line: 2,
          column: 1,
          args: [{ type: 'selector', value: '.unreachable', start: 0, end: 12, line: 2, column: 1 }]
        }
      ]
    } as any;
    
    const deadCode = findDeadCode(unreachableAST);
    
    const unreachable = deadCode.find(dc => dc.type === 'unreachable-code');
    expect(unreachable).toBeDefined();
  });

  it('should return empty array for clean code', () => {
    const ast = createSimpleAST();
    
    const deadCode = findDeadCode(ast);
    
    expect(deadCode).toHaveLength(0);
  });
});

describe('Optimization Suggestions', () => {
  it('should suggest batching similar operations', () => {
    const batchableAST: ASTNode = {
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
    } as any;
    
    const suggestions = suggestOptimizations(batchableAST);
    
    const batchSuggestion = suggestions.find(s => s.type === 'batch-operations');
    expect(batchSuggestion).toBeDefined();
    expect(batchSuggestion!.impact).toBe('high');
    expect(batchSuggestion!.suggestion).toContain('Combine multiple add operations');
  });

  it('should suggest simplifying nested conditionals', () => {
    const ast = createComplexAST();
    
    const suggestions = suggestOptimizations(ast);
    
    const simplificationSuggestion = suggestions.find(s => s.type === 'simplification');
    expect(simplificationSuggestion).toBeDefined();
  });

  it('should return empty array for optimal code', () => {
    const ast = createSimpleAST();
    
    const suggestions = suggestOptimizations(ast);
    
    expect(suggestions.filter(s => s.impact === 'high')).toHaveLength(0);
  });
});

describe('Pattern Analysis', () => {
  it('should detect common patterns', () => {
    const ast = createSimpleAST();
    
    const patterns = analyzePatterns(ast);
    
    expect(patterns).toContainEqual({
      type: 'event-handler',
      confidence: expect.any(Number),
      suggestion: expect.any(String)
    });
  });

  it('should detect toggle patterns', () => {
    const toggleAST: ASTNode = {
      type: 'eventHandler',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.menu', start: 0, end: 5, line: 1, column: 1 }],
          target: { type: 'selector', value: '#sidebar', start: 0, end: 8, line: 1, column: 1 }
        },
        {
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: '.overlay', start: 0, end: 8, line: 1, column: 1 }],
          target: { type: 'identifier', name: 'body', start: 0, end: 4, line: 1, column: 1 }
        }
      ]
    } as any;
    
    const patterns = analyzePatterns(toggleAST);
    
    const togglePattern = patterns.find(p => p.type === 'toggle-pair');
    expect(togglePattern).toBeDefined();
    expect(togglePattern!.confidence).toBeGreaterThan(0.8);
  });
});

describe('Complete Analysis', () => {
  it('should provide comprehensive analysis', () => {
    const ast = createComplexAST();
    
    const analysis = analyzeMetrics(ast);
    
    expect(analysis.complexity).toBeDefined();
    expect(analysis.smells).toBeDefined();
    expect(analysis.patterns).toBeDefined();
    expect(analysis.dependencies).toBeDefined();
    expect(typeof analysis.maintainabilityIndex).toBe('number');
    expect(typeof analysis.readabilityScore).toBe('number');
    expect(analysis.maintainabilityIndex).toBeGreaterThan(0);
    expect(analysis.maintainabilityIndex).toBeLessThanOrEqual(100);
  });

  it('should give high scores to clean code', () => {
    const ast = createSimpleAST();
    
    const analysis = analyzeMetrics(ast);
    
    expect(analysis.maintainabilityIndex).toBeGreaterThan(80);
    expect(analysis.readabilityScore).toBeGreaterThan(85);
  });

  it('should give lower scores to complex code', () => {
    const ast = createComplexAST();
    
    const analysis = analyzeMetrics(ast);
    
    expect(analysis.maintainabilityIndex).toBeLessThan(80);
  });
});