/**
 * Comprehensive tests for hyperscript AST parser
 * Tests parsing tokens into Abstract Syntax Tree
 */

import { describe, it, expect } from 'vitest';
import type { ASTNode } from '../types/core.js';
import { parse } from './parser.js';

describe('Hyperscript AST Parser', () => {
  
  // Helper function to test parsing
  function expectAST(input: string, expectedStructure: Partial<ASTNode>) {
    const result = parse(input);
    expect(result.success).toBe(true);
    expect(result.node).toMatchObject(expectedStructure);
  }

  describe('Basic Expression Parsing', () => {
    it('should parse simple literals', () => {
      expectAST('42', {
        type: 'literal',
        value: 42,
        raw: '42'
      });
    });

    it('should parse string literals', () => {
      expectAST('"hello"', {
        type: 'literal',
        value: 'hello',
        raw: '"hello"'
      });
    });

    it('should parse boolean literals', () => {
      expectAST('true', {
        type: 'literal',
        value: true,
        raw: 'true'
      });
    });

    it('should parse identifiers', () => {
      expectAST('myVariable', {
        type: 'identifier',
        name: 'myVariable'
      });
    });

    it('should parse context references', () => {
      expectAST('me', {
        type: 'identifier',
        name: 'me'
      });
    });
  });

  describe('Binary Expression Parsing', () => {
    it('should parse arithmetic expressions', () => {
      expectAST('5 + 3', {
        type: 'binaryExpression',
        operator: '+',
        left: {
          type: 'literal',
          value: 5
        },
        right: {
          type: 'literal',
          value: 3
        }
      });
    });

    it('should parse comparison expressions', () => {
      expectAST('x > 10', {
        type: 'binaryExpression',
        operator: '>',
        left: {
          type: 'identifier',
          name: 'x'
        },
        right: {
          type: 'literal',
          value: 10
        }
      });
    });

    it('should parse logical expressions', () => {
      expectAST('a and b', {
        type: 'binaryExpression',
        operator: 'and',
        left: {
          type: 'identifier',
          name: 'a'
        },
        right: {
          type: 'identifier',
          name: 'b'
        }
      });
    });

    it('should parse complex logical combinations', () => {
      expectAST('x > 5 and y < 10', {
        type: 'binaryExpression',
        operator: 'and',
        left: {
          type: 'binaryExpression',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 5 }
        },
        right: {
          type: 'binaryExpression',
          operator: '<',
          left: { type: 'identifier', name: 'y' },
          right: { type: 'literal', value: 10 }
        }
      });
    });
  });

  describe('Unary Expression Parsing', () => {
    it('should parse negation', () => {
      expectAST('not x', {
        type: 'unaryExpression',
        operator: 'not',
        argument: {
          type: 'identifier',
          name: 'x'
        },
        prefix: true
      });
    });

    it('should parse arithmetic negation', () => {
      expectAST('-42', {
        type: 'unaryExpression',
        operator: '-',
        argument: {
          type: 'literal',
          value: 42
        },
        prefix: true
      });
    });
  });

  describe('Member Expression Parsing', () => {
    it('should parse property access', () => {
      expectAST('element.className', {
        type: 'memberExpression',
        object: {
          type: 'identifier',
          name: 'element'
        },
        property: {
          type: 'identifier',
          name: 'className'
        },
        computed: false
      });
    });

    it('should parse computed property access', () => {
      expectAST('element[prop]', {
        type: 'memberExpression',
        object: {
          type: 'identifier',
          name: 'element'
        },
        property: {
          type: 'identifier',
          name: 'prop'
        },
        computed: true
      });
    });

    it('should parse possessive syntax', () => {
      // Debug: test what we actually get
      const result = parse('element\'s property');
      console.log('Possessive parse result:', JSON.stringify(result, null, 2));
      
      expectAST('element\'s property', {
        type: 'possessiveExpression',
        object: {
          type: 'identifier',
          name: 'element'
        },
        property: {
          type: 'identifier',
          name: 'property'
        }
      });
    });

    it('should parse chained property access', () => {
      expectAST('window.location.href', {
        type: 'memberExpression',
        object: {
          type: 'memberExpression',
          object: { type: 'identifier', name: 'window' },
          property: { type: 'identifier', name: 'location' },
          computed: false
        },
        property: {
          type: 'identifier',
          name: 'href'
        },
        computed: false
      });
    });
  });

  describe('Call Expression Parsing', () => {
    it('should parse function calls', () => {
      expectAST('func()', {
        type: 'callExpression',
        callee: {
          type: 'identifier',
          name: 'func'
        },
        arguments: []
      });
    });

    it('should parse function calls with arguments', () => {
      expectAST('func(a, b)', {
        type: 'callExpression',
        callee: {
          type: 'identifier',
          name: 'func'
        },
        arguments: [
          { type: 'identifier', name: 'a' },
          { type: 'identifier', name: 'b' }
        ]
      });
    });

    it('should parse method calls', () => {
      expectAST('object.method(arg)', {
        type: 'callExpression',
        callee: {
          type: 'memberExpression',
          object: { type: 'identifier', name: 'object' },
          property: { type: 'identifier', name: 'method' },
          computed: false
        },
        arguments: [
          { type: 'identifier', name: 'arg' }
        ]
      });
    });
  });

  describe('CSS Selector Parsing', () => {
    it('should parse simple CSS selectors', () => {
      expectAST('<button/>', {
        type: 'selector',
        value: 'button'
      });
    });

    it('should parse class selectors', () => {
      expectAST('<.primary/>', {
        type: 'selector',
        value: '.primary'
      });
    });

    it('should parse ID selectors', () => {
      expectAST('<#myButton/>', {
        type: 'selector',
        value: '#myButton'
      });
    });

    it('should parse complex CSS selectors', () => {
      expectAST('<button.primary:not(.disabled)/>', {
        type: 'selector',
        value: 'button.primary:not(.disabled)'
      });
    });
  });

  describe('Event Handler Parsing', () => {
    it('should parse simple event handlers', () => {
      expectAST('on click hide me', {
        type: 'eventHandler',
        event: 'click',
        commands: [{
          type: 'command',
          name: 'hide',
          args: [
            { type: 'identifier', name: 'me' }
          ]
        }]
      });
    });

    it('should parse event handlers with selectors', () => {
      expectAST('on click from .button hide me', {
        type: 'eventHandler',
        event: 'click',
        selector: '.button',
        commands: [{
          type: 'command',
          name: 'hide',
          args: [
            { type: 'identifier', name: 'me' }
          ]
        }]
      });
    });

    it('should parse multiple commands', () => {
      expectAST('on click hide me then show #result', {
        type: 'eventHandler',
        event: 'click',
        commands: [
          {
            type: 'command',
            name: 'hide',
            args: [{ type: 'identifier', name: 'me' }]
          },
          {
            type: 'command',
            name: 'show',
            args: [{ type: 'selector', value: '#result' }]
          }
        ]
      });
    });
  });

  describe('Command Parsing', () => {
    it('should parse simple commands', () => {
      expectAST('hide', {
        type: 'identifier',
        name: 'hide'
      });
    });

    it('should parse commands with targets', () => {
      expectAST('hide #target', {
        type: 'binaryExpression',
        operator: ' ',
        left: {
          type: 'identifier',
          name: 'hide'
        },
        right: {
          type: 'selector',
          value: '#target'
        }
      });
    });

    it('should parse put commands', () => {
      expectAST('put "hello" into #output', {
        type: 'Command',
        name: 'put',
        arguments: [
          { type: 'Literal', value: 'hello' },
          { type: 'Identifier', name: 'into' },
          { type: 'Selector', value: '#output' }
        ]
      });
    });

    it('should parse add/remove class commands', () => {
      expectAST('add .active', {
        type: 'Command',
        name: 'add',
        arguments: [
          { type: 'Selector', value: '.active' }
        ]
      });
    });

    it('should parse wait commands', () => {
      expectAST('wait 500ms', {
        type: 'Command',
        name: 'wait',
        arguments: [
          { type: 'Literal', value: '500ms' }
        ]
      });
    });
  });

  describe('Hyperscript Expression Parsing', () => {
    it('should parse "my" property access', () => {
      expectAST('my value', {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: 'me'
        },
        property: {
          type: 'Identifier',
          name: 'value'
        },
        computed: false
      });
    });

    it('should parse "as" type conversion', () => {
      expectAST('value as Int', {
        type: 'BinaryExpression',
        operator: 'as',
        left: {
          type: 'Identifier',
          name: 'value'
        },
        right: {
          type: 'Identifier',
          name: 'Int'
        }
      });
    });

    it('should parse "first of" positional expressions', () => {
      expectAST('first of items', {
        type: 'BinaryExpression',
        operator: 'of',
        left: {
          type: 'Identifier',
          name: 'first'
        },
        right: {
          type: 'Identifier',
          name: 'items'
        }
      });
    });

    it('should parse "closest" navigation', () => {
      expectAST('closest <form/>', {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'closest'
        },
        arguments: [
          { type: 'Selector', value: 'form' }
        ]
      });
    });
  });

  describe('Parenthesized Expression Parsing', () => {
    it('should parse parenthesized expressions', () => {
      expectAST('(x + y)', {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'Identifier', name: 'y' }
      });
    });

    it('should handle operator precedence with parentheses', () => {
      expectAST('(x + y) * z', {
        type: 'BinaryExpression',
        operator: '*',
        left: {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'Identifier', name: 'y' }
        },
        right: { type: 'Identifier', name: 'z' }
      });
    });
  });

  describe('Operator Precedence', () => {
    it('should handle multiplication before addition', () => {
      expectAST('2 + 3 * 4', {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: 2 },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'Literal', value: 3 },
          right: { type: 'Literal', value: 4 }
        }
      });
    });

    it('should handle comparison before logical', () => {
      expectAST('x > 5 and y < 10', {
        type: 'BinaryExpression',
        operator: 'and',
        left: {
          type: 'BinaryExpression',
          operator: '>',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'Literal', value: 5 }
        },
        right: {
          type: 'BinaryExpression',
          operator: '<',
          left: { type: 'Identifier', name: 'y' },
          right: { type: 'Literal', value: 10 }
        }
      });
    });

    it('should handle right associativity for assignment', () => {
      expectAST('a = b = c', {
        type: 'BinaryExpression',
        operator: '=',
        left: { type: 'Identifier', name: 'a' },
        right: {
          type: 'BinaryExpression',
          operator: '=',
          left: { type: 'Identifier', name: 'b' },
          right: { type: 'Identifier', name: 'c' }
        }
      });
    });
  });

  describe('Complex Real-World Examples', () => {
    it('should parse form processing expression', () => {
      expectAST('closest <form/> as Values', {
        type: 'BinaryExpression',
        operator: 'as',
        left: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'closest' },
          arguments: [{ type: 'Selector', value: 'form' }]
        },
        right: {
          type: 'Identifier',
          name: 'Values'
        }
      });
    });

    it('should parse property chain with conversion', () => {
      expectAST('my data-value as Int', {
        type: 'BinaryExpression',
        operator: 'as',
        left: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'me' },
          property: { type: 'Identifier', name: 'data-value' },
          computed: false
        },
        right: {
          type: 'Identifier',
          name: 'Int'
        }
      });
    });

    it('should parse conditional with commands', () => {
      expectAST('if x > 5 then add .active else remove .active', {
        type: 'ConditionalExpression',
        test: {
          type: 'BinaryExpression',
          operator: '>',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'Literal', value: 5 }
        },
        consequent: {
          type: 'Command',
          name: 'add',
          arguments: [{ type: 'Selector', value: '.active' }]
        },
        alternate: {
          type: 'Command',
          name: 'remove',
          arguments: [{ type: 'Selector', value: '.active' }]
        }
      });
    });

    it('should parse complex event handler with multiple conditions', () => {
      expectAST('on click if my value > 0 and my className contains active then hide me', {
        type: 'EventHandler',
        event: 'click',
        commands: [{
          type: 'ConditionalExpression',
          test: {
            type: 'BinaryExpression',
            operator: 'and',
            left: {
              type: 'BinaryExpression',
              operator: '>',
              left: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'me' },
                property: { type: 'Identifier', name: 'value' },
                computed: false
              },
              right: { type: 'Literal', value: 0 }
            },
            right: {
              type: 'BinaryExpression',
              operator: 'contains',
              left: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'me' },
                property: { type: 'Identifier', name: 'className' },
                computed: false
              },
              right: { type: 'Identifier', name: 'active' }
            }
          },
          consequent: {
            type: 'Command',
            name: 'hide',
            arguments: [{ type: 'Identifier', name: 'me' }]
          }
        }]
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty input', () => {
      // TODO: Test empty input handling
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should handle malformed expressions', () => {
      // TODO: Test error recovery for malformed expressions
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should handle unmatched parentheses', () => {
      // TODO: Test error handling for unmatched parentheses
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should provide meaningful error messages', () => {
      // TODO: Test error message quality
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should handle unexpected tokens', () => {
      // TODO: Test handling of unexpected tokens
      expect(true).toBe(false); // Force test failure to drive implementation
    });
  });

  describe('Position Information', () => {
    it('should track AST node positions', () => {
      // TODO: Test that AST nodes include position information for debugging
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should preserve source location for error reporting', () => {
      // TODO: Test source location preservation
      expect(true).toBe(false); // Force test failure to drive implementation
    });
  });

  describe('Performance', () => {
    it('should parse large expressions efficiently', () => {
      // TODO: Test parsing performance with large/complex expressions
      expect(true).toBe(false); // Force test failure to drive implementation
    });

    it('should handle deeply nested expressions', () => {
      // TODO: Test deeply nested expression parsing
      expect(true).toBe(false); // Force test failure to drive implementation
    });
  });
});