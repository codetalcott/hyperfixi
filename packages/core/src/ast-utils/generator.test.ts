/**
 * Tests for AST Code Generator
 */

import { describe, it, expect } from 'vitest';
import {
  generate,
  generateWithMetadata,
  generateCommand,
  generateExpression,
  minify,
  format,
} from './generator.js';
import type { ASTNode } from './types.js';

describe('Code Generator', () => {
  describe('generate()', () => {
    it('should generate code from a simple event handler', () => {
      const ast: ASTNode = {
        type: 'eventHandler',
        event: 'click',
        start: 0,
        end: 30,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'toggle',
            start: 10,
            end: 25,
            line: 1,
            column: 11,
            args: [{ type: 'selector', value: '.active', start: 17, end: 24, line: 1, column: 18 }],
          },
        ],
      } as any;

      const code = generate(ast);
      expect(code).toContain('on click');
      expect(code).toContain('toggle');
      expect(code).toContain('.active');
    });

    it('should generate code from a program with multiple features', () => {
      const ast: ASTNode = {
        type: 'program',
        start: 0,
        end: 100,
        line: 1,
        column: 1,
        features: [
          {
            type: 'eventHandler',
            event: 'click',
            commands: [
              { type: 'command', name: 'add', args: [{ type: 'selector', value: '.visible' }] },
            ],
          },
          {
            type: 'eventHandler',
            event: 'mouseover',
            commands: [
              { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.hover' }] },
            ],
          },
        ],
      } as any;

      const code = generate(ast);
      expect(code).toContain('on click');
      expect(code).toContain('add .visible');
      expect(code).toContain('on mouseover');
      expect(code).toContain('toggle .hover');
    });

    it('should handle event handler with selector', () => {
      const ast: ASTNode = {
        type: 'eventHandler',
        event: 'click',
        selector: '#button',
        commands: [{ type: 'command', name: 'hide', args: [] }],
      } as any;

      const code = generate(ast);
      expect(code).toContain('on click');
      expect(code).toContain('from #button');
      expect(code).toContain('hide');
    });

    it('should handle commands with targets', () => {
      const ast: ASTNode = {
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: 'Hello' }],
        target: { type: 'selector', value: '#output' },
      } as any;

      const code = generate(ast);
      expect(code).toContain('put');
      expect(code).toContain("'Hello'");
      expect(code).toContain('into #output');
    });
  });

  describe('generateCommand()', () => {
    it('should generate a simple command', () => {
      const ast: ASTNode = {
        type: 'command',
        name: 'show',
        args: [{ type: 'selector', value: '#modal' }],
      } as any;

      const code = generateCommand(ast);
      expect(code).toBe('show #modal');
    });

    it('should generate a command with multiple args', () => {
      const ast: ASTNode = {
        type: 'command',
        name: 'add',
        args: [
          { type: 'selector', value: '.highlight' },
          { type: 'selector', value: '.visible' },
        ],
      } as any;

      const code = generateCommand(ast);
      expect(code).toContain('add');
      expect(code).toContain('.highlight');
      expect(code).toContain('.visible');
    });

    it('should generate toggle command correctly', () => {
      const ast: ASTNode = {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.active' }],
        target: { type: 'identifier', name: 'me' },
      } as any;

      const code = generateCommand(ast);
      expect(code).toBe('toggle .active on me');
    });
  });

  describe('generateExpression()', () => {
    it('should generate a selector', () => {
      const ast: ASTNode = { type: 'selector', value: '.my-class' } as any;
      expect(generateExpression(ast)).toBe('.my-class');
    });

    it('should generate a string literal', () => {
      const ast: ASTNode = { type: 'literal', value: 'hello' } as any;
      expect(generateExpression(ast)).toBe("'hello'");
    });

    it('should generate a number literal', () => {
      const ast: ASTNode = { type: 'literal', value: 42 } as any;
      expect(generateExpression(ast)).toBe('42');
    });

    it('should generate a boolean literal', () => {
      const ast: ASTNode = { type: 'literal', value: true } as any;
      expect(generateExpression(ast)).toBe('true');
    });

    it('should generate an identifier', () => {
      const ast: ASTNode = { type: 'identifier', name: 'myVar' } as any;
      expect(generateExpression(ast)).toBe('myVar');
    });

    it('should generate a binary expression', () => {
      const ast: ASTNode = {
        type: 'binaryExpression',
        operator: '+',
        left: { type: 'literal', value: 5 },
        right: { type: 'literal', value: 3 },
      } as any;
      expect(generateExpression(ast)).toBe('5 + 3');
    });

    it('should generate a comparison expression', () => {
      const ast: ASTNode = {
        type: 'binaryExpression',
        operator: '>',
        left: { type: 'identifier', name: 'count' },
        right: { type: 'literal', value: 0 },
      } as any;
      expect(generateExpression(ast)).toBe('count > 0');
    });

    it('should generate a logical expression', () => {
      const ast: ASTNode = {
        type: 'logicalExpression',
        operator: 'and',
        left: { type: 'identifier', name: 'a' },
        right: { type: 'identifier', name: 'b' },
      } as any;
      expect(generateExpression(ast)).toBe('a and b');
    });

    it('should generate a possessive expression', () => {
      const ast: ASTNode = {
        type: 'possessiveExpression',
        object: { type: 'identifier', name: 'element' },
        property: { type: 'identifier', name: 'className' },
      } as any;
      expect(generateExpression(ast)).toBe("element's className");
    });

    it('should generate a member expression', () => {
      const ast: ASTNode = {
        type: 'memberExpression',
        object: { type: 'identifier', name: 'arr' },
        property: { type: 'literal', value: 0 },
        computed: true,
      } as any;
      expect(generateExpression(ast)).toBe('arr[0]');
    });

    it('should generate a dot member expression', () => {
      const ast: ASTNode = {
        type: 'memberExpression',
        object: { type: 'identifier', name: 'obj' },
        property: { type: 'identifier', name: 'prop' },
        computed: false,
      } as any;
      expect(generateExpression(ast)).toBe('obj.prop');
    });

    it('should generate a call expression', () => {
      const ast: ASTNode = {
        type: 'callExpression',
        callee: { type: 'identifier', name: 'myFunc' },
        arguments: [
          { type: 'literal', value: 'arg1' },
          { type: 'literal', value: 42 },
        ],
      } as any;
      expect(generateExpression(ast)).toBe("myFunc('arg1', 42)");
    });
  });

  describe('Conditionals', () => {
    it('should generate a simple conditional', () => {
      const ast: ASTNode = {
        type: 'conditional',
        condition: {
          type: 'binaryExpression',
          operator: '>',
          left: { type: 'identifier', name: 'count' },
          right: { type: 'literal', value: 0 },
        },
        then: {
          type: 'command',
          name: 'show',
          args: [{ type: 'selector', value: '#message' }],
        },
      } as any;

      const code = generate(ast);
      expect(code).toContain('if');
      expect(code).toContain('count > 0');
      expect(code).toContain('then');
      expect(code).toContain('show #message');
      expect(code).toContain('end');
    });

    it('should generate a conditional with else', () => {
      const ast: ASTNode = {
        type: 'conditional',
        condition: { type: 'identifier', name: 'isValid' },
        then: {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.valid' }],
        },
        else: {
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: '.invalid' }],
        },
      } as any;

      const code = generate(ast);
      expect(code).toContain('if');
      expect(code).toContain('isValid');
      expect(code).toContain('then');
      expect(code).toContain('.valid');
      expect(code).toContain('else');
      expect(code).toContain('.invalid');
    });
  });

  describe('Behaviors', () => {
    it('should generate a simple behavior', () => {
      const ast: ASTNode = {
        type: 'behavior',
        name: 'Clickable',
        parameters: [],
        body: [
          {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'selector', value: '.active' }],
          },
        ],
      } as any;

      const code = generate(ast);
      expect(code).toContain('behavior');
      expect(code).toContain('Clickable');
      expect(code).toContain('toggle .active');
      expect(code).toContain('end');
    });

    it('should generate a behavior with parameters', () => {
      const ast: ASTNode = {
        type: 'behavior',
        name: 'Toggler',
        parameters: ['className', 'target'],
        body: [],
      } as any;

      const code = generate(ast);
      expect(code).toContain('behavior');
      expect(code).toContain('Toggler(className, target)');
      expect(code).toContain('end');
    });
  });

  describe('Functions', () => {
    it('should generate a simple function', () => {
      const ast: ASTNode = {
        type: 'def',
        name: 'sayHello',
        parameters: [],
        body: {
          type: 'returnStatement',
          argument: { type: 'literal', value: 'Hello!' },
        },
      } as any;

      const code = generate(ast);
      expect(code).toContain('def');
      expect(code).toContain('sayHello');
      expect(code).toContain("return 'Hello!'");
      expect(code).toContain('end');
    });

    it('should generate a function with parameters', () => {
      const ast: ASTNode = {
        type: 'function',
        name: 'add',
        parameters: ['a', 'b'],
        body: {
          type: 'returnStatement',
          argument: {
            type: 'binaryExpression',
            operator: '+',
            left: { type: 'identifier', name: 'a' },
            right: { type: 'identifier', name: 'b' },
          },
        },
      } as any;

      const code = generate(ast);
      expect(code).toContain('def');
      expect(code).toContain('add(a, b)');
      expect(code).toContain('return a + b');
    });
  });

  describe('minify()', () => {
    it('should produce minified output', () => {
      const ast: ASTNode = {
        type: 'program',
        features: [
          {
            type: 'eventHandler',
            event: 'click',
            commands: [
              { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] },
            ],
          },
        ],
      } as any;

      const minified = minify(ast);
      // Minified should not have newlines between event handler and commands
      expect(minified).not.toContain('\n\n');
    });
  });

  describe('format()', () => {
    it('should produce formatted output', () => {
      const ast: ASTNode = {
        type: 'eventHandler',
        event: 'click',
        commands: [
          { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] },
          { type: 'command', name: 'add', args: [{ type: 'selector', value: '.clicked' }] },
        ],
      } as any;

      const formatted = format(ast, '    '); // 4-space indentation
      expect(formatted).toContain('on click');
      expect(formatted).toContain('toggle .active');
    });
  });

  describe('generateWithMetadata()', () => {
    it('should return code and node count', () => {
      const ast: ASTNode = {
        type: 'program',
        features: [
          {
            type: 'eventHandler',
            event: 'click',
            commands: [
              { type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] },
            ],
          },
        ],
      } as any;

      const result = generateWithMetadata(ast);
      expect(result.code).toBeDefined();
      expect(result.nodeCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty program', () => {
      const ast: ASTNode = { type: 'program', features: [] } as any;
      const code = generate(ast);
      expect(code).toBe('');
    });

    it('should handle node without type', () => {
      const ast = { value: 'test' } as any;
      const code = generate(ast);
      // Fallback tries to use value property if present
      expect(code).toBe('test');
    });

    it('should return empty for completely empty node', () => {
      const ast = {} as any;
      const code = generate(ast);
      expect(code).toBe('');
    });

    it('should escape strings properly', () => {
      const ast: ASTNode = {
        type: 'literal',
        value: 'it\'s a "test"',
      } as any;

      const code = generateExpression(ast);
      expect(code).toContain("\\'");
    });

    it('should use raw when preserveRaw is enabled', () => {
      const ast: ASTNode = {
        type: 'selector',
        value: '.computed',
        raw: '#original-selector',
      } as any;

      const codeWithRaw = generate(ast, { preserveRaw: true });
      expect(codeWithRaw).toBe('#original-selector');

      const codeWithoutRaw = generate(ast, { preserveRaw: false });
      expect(codeWithoutRaw).toBe('.computed');
    });
  });
});
