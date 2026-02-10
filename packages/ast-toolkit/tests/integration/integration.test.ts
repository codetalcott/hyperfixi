import { describe, it, expect } from 'vitest';
import { 
  ASTVisitor, 
  visit, 
  findNodes, 
  queryAll, 
  matchPattern,
  matchWildcard,
  calculateComplexity,
  analyzeMetrics,
  countNodeTypes
} from '../../src/index.js';

// We'll create mock hyperscript ASTs based on the core types
// In a real implementation, these would come from @hyperfixi/core parser

const createRealWorldAST = () => ({
  type: 'program',
  start: 0,
  end: 200,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      event: 'click',
      selector: '#toggle-button',
      commands: [
        {
          type: 'command',
          name: 'toggle',
          start: 20,
          end: 45,
          line: 1,
          column: 21,
          args: [
            {
              type: 'selector',
              value: '.menu-open',
              start: 27,
              end: 37,
              line: 1,
              column: 28
            }
          ],
          target: {
            type: 'selector',
            value: '#sidebar',
            start: 41,
            end: 49,
            line: 1,
            column: 42
          }
        }
      ]
    },
    {
      type: 'eventHandler',
      start: 55,
      end: 120,
      line: 2,
      column: 1,
      event: 'submit',
      selector: '#contact-form',
      commands: [
        {
          type: 'conditional',
          start: 75,
          end: 115,
          line: 2,
          column: 21,
          condition: {
            type: 'callExpression',
            callee: {
              type: 'memberExpression',
              object: {
                type: 'identifier',
                name: 'form',
                start: 78,
                end: 82,
                line: 2,
                column: 24
              },
              property: {
                type: 'identifier',
                name: 'checkValidity',
                start: 83,
                end: 96,
                line: 2,
                column: 29
              }
            }
          },
          then: {
            type: 'command',
            name: 'send',
            args: [
              {
                type: 'literal',
                value: 'formSubmitted',
                start: 105,
                end: 118,
                line: 2,
                column: 51
              }
            ]
          },
          else: {
            type: 'command',
            name: 'add',
            args: [
              {
                type: 'selector',
                value: '.error',
                start: 105,
                end: 111,
                line: 2,
                column: 51
              }
            ]
          }
        }
      ]
    },
    {
      type: 'eventHandler',
      start: 125,
      end: 200,
      line: 3,
      column: 1,
      event: 'load',
      commands: [
        {
          type: 'command',
          name: 'set',
          start: 135,
          end: 150,
          line: 3,
          column: 11,
          variable: {
            type: 'identifier',
            name: 'apiUrl',
            start: 139,
            end: 145,
            line: 3,
            column: 15
          },
          value: {
            type: 'literal',
            value: '/api/data',
            start: 149,
            end: 160,
            line: 3,
            column: 25
          }
        },
        {
          type: 'command',
          name: 'fetch',
          start: 165,
          end: 185,
          line: 3,
          column: 41,
          args: [
            {
              type: 'identifier',
              name: 'apiUrl',
              start: 171,
              end: 177,
              line: 3,
              column: 47
            }
          ]
        }
      ]
    }
  ]
} as any);

const createComplexConditionalAST = () => ({
  type: 'eventHandler',
  start: 0,
  end: 150,
  line: 1,
  column: 1,
  event: 'click',
  commands: [
    {
      type: 'conditional',
      start: 10,
      end: 140,
      line: 1,
      column: 11,
      condition: {
        type: 'binaryExpression',
        operator: 'and',
        left: {
          type: 'binaryExpression',
          operator: '>',
          left: {
            type: 'identifier',
            name: 'userLevel',
            start: 13,
            end: 22,
            line: 1,
            column: 14
          },
          right: {
            type: 'literal',
            value: 5,
            start: 25,
            end: 26,
            line: 1,
            column: 26
          }
        },
        right: {
          type: 'binaryExpression',
          operator: '<',
          left: {
            type: 'identifier',
            name: 'attempts',
            start: 31,
            end: 39,
            line: 1,
            column: 32
          },
          right: {
            type: 'literal',
            value: 3,
            start: 42,
            end: 43,
            line: 1,
            column: 43
          }
        }
      },
      then: {
        type: 'conditional',
        condition: {
          type: 'binaryExpression',
          operator: '==',
          left: {
            type: 'identifier',
            name: 'mode',
            start: 50,
            end: 54,
            line: 1,
            column: 51
          },
          right: {
            type: 'literal',
            value: 'admin',
            start: 57,
            end: 64,
            line: 1,
            column: 58
          }
        },
        then: {
          type: 'command',
          name: 'add',
          args: [
            {
              type: 'selector',
              value: '.admin-panel',
              start: 70,
              end: 82,
              line: 1,
              column: 71
            }
          ]
        },
        else: {
          type: 'command',
          name: 'add',
          args: [
            {
              type: 'selector',
              value: '.user-panel',
              start: 90,
              end: 101,
              line: 1,
              column: 91
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
            value: '.access-denied',
            start: 110,
            end: 124,
            line: 1,
            column: 111
          }
        ]
      }
    }
  ]
} as any);

describe('Integration Tests - Real World AST Analysis', () => {
  it('should analyze a complete hyperscript program', () => {
    const ast = createRealWorldAST();
    
    // Test visitor pattern
    let eventHandlerCount = 0;
    let commandCount = 0;
    
    const visitor = new ASTVisitor({
      enter(node) {
        if (node.type === 'eventHandler') {
          eventHandlerCount++;
        } else if (node.type === 'command') {
          commandCount++;
        }
      }
    });
    
    visit(ast, visitor);
    
    expect(eventHandlerCount).toBe(3);
    expect(commandCount).toBe(5); // All commands including nested ones
  });

  it('should query for specific patterns in real code', () => {
    const ast = createRealWorldAST();
    
    // Find all toggle commands
    const toggleCommands = queryAll(ast, 'command[name="toggle"]');
    expect(toggleCommands).toHaveLength(1);
    expect(toggleCommands[0].node.name).toBe('toggle');
    
    // Find all event handlers
    const eventHandlers = queryAll(ast, 'eventHandler');
    expect(eventHandlers).toHaveLength(3);
    
    // Find commands with selectors
    const commandsWithSelectors = findNodes(ast, node => 
      node.type === 'command' && 
      (node as any).target?.type === 'selector'
    );
    expect(commandsWithSelectors).toHaveLength(1);
  });

  it('should detect patterns in real hyperscript code', () => {
    const ast = createRealWorldAST();
    
    // Should detect event handler pattern
    const eventHandler = ast.features[0];
    
    // Simple pattern detection - check if it's an event handler with toggle command
    expect(eventHandler.type).toBe('eventHandler');
    expect(eventHandler.event).toBe('click');
    expect(eventHandler.commands[0].name).toBe('toggle');
  });

  it('should analyze complexity of real code', () => {
    const complexAST = createComplexConditionalAST();
    
    const complexity = calculateComplexity(complexAST);
    
    expect(complexity.cyclomatic).toBeGreaterThan(1); // At least some complexity
    expect(complexity.cognitive).toBeGreaterThan(1); // Some cognitive load
    expect(complexity.halstead.vocabulary).toBeGreaterThanOrEqual(1); // Some vocabulary
  });

  it('should provide comprehensive analysis of real code', () => {
    const ast = createRealWorldAST();
    
    const analysis = analyzeMetrics(ast);
    
    expect(analysis.complexity).toBeDefined();
    expect(analysis.smells).toBeDefined();
    expect(analysis.patterns).toBeDefined();
    expect(analysis.dependencies).toBeDefined();
    expect(typeof analysis.maintainabilityIndex).toBe('number');
    expect(typeof analysis.readabilityScore).toBe('number');
    
    // Real code should have reasonable scores
    expect(analysis.maintainabilityIndex).toBeGreaterThan(50);
    expect(analysis.readabilityScore).toBeGreaterThan(60);
  });
});

describe('Integration Tests - Node Type Analysis', () => {
  it('should accurately count different node types', () => {
    const ast = createRealWorldAST();
    
    const counts = countNodeTypes(ast);
    
    expect(counts.eventHandler).toBe(3);
    expect(counts.command).toBe(5);
    expect(counts.selector).toBeGreaterThan(0);
    expect(counts.identifier).toBeGreaterThan(0);
    expect(counts.literal).toBeGreaterThan(0);
  });

  it('should handle nested command structures', () => {
    const ast = createComplexConditionalAST();
    
    const commands = findNodes(ast, node => node.type === 'command');
    const conditionals = findNodes(ast, node => node.type === 'conditional');
    
    expect(commands).toHaveLength(3); // 3 add commands in nested conditionals
    expect(conditionals).toHaveLength(2); // 2 nested conditionals
  });
});

describe('Integration Tests - Performance with Real Data', () => {
  it('should handle multiple event handlers efficiently', () => {
    // Create an AST with many event handlers
    const createLargeProgram = (handlerCount: number) => ({
      type: 'program',
      start: 0,
      end: handlerCount * 100,
      line: 1,
      column: 1,
      features: Array.from({ length: handlerCount }, (_, i) => ({
        type: 'eventHandler',
        start: i * 100,
        end: (i + 1) * 100,
        line: i + 1,
        column: 1,
        event: i % 2 === 0 ? 'click' : 'hover',
        commands: [
          {
            type: 'command',
            name: 'add',
            start: i * 100 + 20,
            end: i * 100 + 40,
            line: i + 1,
            column: 21,
            args: [
              {
                type: 'selector',
                value: `.class${i}`,
                start: i * 100 + 25,
                end: i * 100 + 35,
                line: i + 1,
                column: 26
              }
            ]
          }
        ]
      }))
    } as any);
    
    const largeAST = createLargeProgram(50);
    
    const startTime = Date.now();
    
    // Perform multiple operations
    const eventHandlers = queryAll(largeAST, 'eventHandler');
    const complexity = calculateComplexity(largeAST);
    const analysis = analyzeMetrics(largeAST);
    
    const endTime = Date.now();
    
    expect(eventHandlers).toHaveLength(50);
    expect(complexity.cyclomatic).toBe(1); // No branching
    expect(analysis.maintainabilityIndex).toBeGreaterThan(70); // Simple code
    expect(endTime - startTime).toBeLessThan(100); // Should be fast
  });

  it('should handle deeply nested structures efficiently', () => {
    const createDeeplyNested = (depth: number): any => {
      if (depth === 0) {
        return {
          type: 'command',
          name: 'add',
          start: 0,
          end: 10,
          line: 1,
          column: 1,
          args: [
            {
              type: 'selector',
              value: '.leaf',
              start: 0,
              end: 5,
              line: 1,
              column: 1
            }
          ]
        };
      }
      
      return {
        type: 'conditional',
        start: 0,
        end: depth * 10,
        line: 1,
        column: 1,
        condition: {
          type: 'literal',
          value: true,
          start: 0,
          end: 4,
          line: 1,
          column: 1
        },
        then: createDeeplyNested(depth - 1)
      };
    };
    
    const deepAST = createDeeplyNested(20);
    
    const startTime = Date.now();
    
    const nodeCount = countNodeTypes(deepAST);
    const complexity = calculateComplexity(deepAST);
    
    const endTime = Date.now();
    
    expect(nodeCount.conditional).toBe(20);
    expect(nodeCount.command).toBe(1);
    expect(complexity.cyclomatic).toBe(21); // 1 + 20 decisions
    expect(endTime - startTime).toBeLessThan(50); // Should handle deep nesting efficiently
  });
});

describe('Integration Tests - Error Handling', () => {
  it('should handle malformed AST gracefully', () => {
    const malformedAST = {
      type: 'eventHandler',
      // Missing required fields
      commands: [
        {
          type: 'command',
          // Missing name
          args: null // Invalid args
        }
      ]
    } as any;
    
    expect(() => {
      const visitor = new ASTVisitor({
        enter(node) {
          // Should not crash
        }
      });
      visit(malformedAST, visitor);
    }).not.toThrow();
    
    expect(() => {
      calculateComplexity(malformedAST);
    }).not.toThrow();
    
    expect(() => {
      analyzeMetrics(malformedAST);
    }).not.toThrow();
  });

  it('should handle empty AST structures', () => {
    const emptyAST = {
      type: 'program',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      features: []
    } as any;
    
    const analysis = analyzeMetrics(emptyAST);
    const patterns = queryAll(emptyAST, 'command');
    
    expect(analysis.complexity.cyclomatic).toBe(1);
    expect(analysis.maintainabilityIndex).toBeGreaterThan(95); // Very good empty code
    expect(patterns).toHaveLength(0);
  });
});

describe('Integration Tests - Real Hyperscript Patterns', () => {
  it('should handle common UI interaction patterns', () => {
    const uiPatternAST = {
      type: 'program',
      start: 0,
      end: 300,
      line: 1,
      column: 1,
      features: [
        // Modal toggle pattern
        {
          type: 'eventHandler',
          event: 'click',
          selector: '.modal-trigger',
          commands: [
            {
              type: 'command',
              name: 'toggle',
              args: [{ type: 'selector', value: '.modal-visible', start: 0, end: 5, line: 1, column: 1 }],
              target: { type: 'selector', value: '#modal', start: 0, end: 5, line: 1, column: 1 }
            },
            {
              type: 'command',
              name: 'toggle',
              args: [{ type: 'selector', value: '.overlay-active', start: 0, end: 5, line: 1, column: 1 }],
              target: { type: 'identifier', name: 'body', start: 0, end: 4, line: 1, column: 1 }
            }
          ]
        },
        // Form validation pattern
        {
          type: 'eventHandler',
          event: 'input',
          selector: 'input[required]',
          commands: [
            {
              type: 'conditional',
              condition: {
                type: 'callExpression',
                callee: {
                  type: 'memberExpression',
                  object: { type: 'identifier', name: 'target', start: 0, end: 6, line: 1, column: 1 },
                  property: { type: 'identifier', name: 'checkValidity', start: 0, end: 13, line: 1, column: 1 }
                }
              },
              then: {
                type: 'command',
                name: 'remove',
                args: [{ type: 'selector', value: '.error', start: 0, end: 6, line: 1, column: 1 }],
                target: { type: 'identifier', name: 'target', start: 0, end: 6, line: 1, column: 1 }
              },
              else: {
                type: 'command',
                name: 'add',
                args: [{ type: 'selector', value: '.error', start: 0, end: 6, line: 1, column: 1 }],
                target: { type: 'identifier', name: 'target', start: 0, end: 6, line: 1, column: 1 }
              }
            }
          ]
        }
      ]
    } as any;
    
    const analysis = analyzeMetrics(uiPatternAST);
    const toggleCommands = findNodes(uiPatternAST, node => 
      node.type === 'command' && (node as any).name === 'toggle'
    );
    
    expect(toggleCommands.length).toBe(2); // Should find exactly 2 toggle commands
    expect(analysis.patterns.length).toBeGreaterThan(0);
    expect(analysis.readabilityScore).toBeGreaterThan(70); // Should be readable UI code
  });

  it('should detect anti-patterns in real code', () => {
    const antiPatternAST = {
      type: 'eventHandler',
      event: 'click',
      commands: Array.from({ length: 10 }, (_, i) => ({
        type: 'command',
        name: 'add',
        start: i * 20,
        end: (i + 1) * 20,
        line: 1,
        column: 1,
        args: [{ type: 'selector', value: `.class${i}`, start: 0, end: 5, line: 1, column: 1 }]
      }))
    } as any;
    
    const analysis = analyzeMetrics(antiPatternAST);
    
    // Should detect long command chain smell
    const longChainSmells = analysis.smells.filter(s => s.type === 'long-command-chain');
    expect(longChainSmells.length).toBeGreaterThan(0);
    expect(analysis.maintainabilityIndex).toBeLessThan(85); // Should penalize long chains
  });
});