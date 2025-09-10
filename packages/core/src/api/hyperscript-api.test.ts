/**
 * Tests for the main Hyperscript API
 * Validates the public interface for compilation, execution, and utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from './hyperscript-api';

describe('Hyperscript Public API', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create a mock DOM element for testing
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);
  });

  describe('API Structure', () => {
    it('should expose the expected public interface', () => {
      expect(typeof hyperscript.compile).toBe('function');
      expect(typeof hyperscript.execute).toBe('function');
      expect(typeof hyperscript.run).toBe('function');
      expect(typeof hyperscript.evaluate).toBe('function');
      expect(typeof hyperscript.createContext).toBe('function');
      expect(typeof hyperscript.createChildContext).toBe('function');
      expect(typeof hyperscript.isValidHyperscript).toBe('function');
      expect(typeof hyperscript.version).toBe('string');
      expect(typeof hyperscript.createRuntime).toBe('function');
      expect(typeof hyperscript.parse).toBe('function');
    });

    it('should have a version string', () => {
      expect(hyperscript.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('compile() method', () => {
    it('should compile valid hyperscript code', () => {
      const result = hyperscript.compile('42');
      
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe('literal');
      expect(result.errors).toEqual([]);
    });

    it('should handle compilation errors gracefully', () => {
      const result = hyperscript.compile('invalid @@ syntax');
      
      expect(result.success).toBe(false);
      expect(result.ast).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unexpected token');
    });

    it('should return compilation metadata', () => {
      const result = hyperscript.compile('5 + 3');
      
      expect(result.tokens).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.compilationTime).toBeTypeOf('number');
    });
  });

  describe('execute() method', () => {
    it('should execute a compiled AST with context', async () => {
      const compiled = hyperscript.compile('42');
      expect(compiled.success).toBe(true);
      
      const context = hyperscript.createContext(mockElement);
      const result = await hyperscript.execute(compiled.ast!, context);
      
      expect(result).toBe(42);
    });

    it('should execute with default context if none provided', async () => {
      const compiled = hyperscript.compile('5 + 3');
      expect(compiled.success).toBe(true);
      
      const result = await hyperscript.execute(compiled.ast!);
      expect(result).toBe(8);
    });

    it('should handle execution errors gracefully', async () => {
      const compiled = hyperscript.compile('me.nonExistentMethod()');
      expect(compiled.success).toBe(true);
      
      const context = hyperscript.createContext(mockElement);
      
      await expect(hyperscript.execute(compiled.ast!, context))
        .rejects.toThrow();
    });
  });

  describe('run() method - combined compile and execute', () => {
    it('should compile and execute in one call', async () => {
      const result = await hyperscript.run('10 * 2');
      expect(result).toBe(20);
    });

    it('should use provided context', async () => {
      const context = hyperscript.createContext(mockElement);
      context.variables = new Map([['x', 5]]);
      
      const result = await hyperscript.run('x + 15', context);
      expect(result).toBe(20);
    });

    it('should handle both compilation and execution errors', async () => {
      await expect(hyperscript.run('invalid @@ syntax'))
        .rejects.toThrow('Compilation failed');
    });
  });

  describe('evaluate() method - alias for run()', () => {
    it('should work identically to run() method', async () => {
      const runResult = await hyperscript.run('7 * 6');
      const evaluateResult = await hyperscript.evaluate('7 * 6');
      expect(evaluateResult).toBe(runResult);
      expect(evaluateResult).toBe(42);
    });

    it('should compile and execute hyperscript expressions', async () => {
      const result = await hyperscript.evaluate('15 + 27');
      expect(result).toBe(42);
    });

    it('should handle complex hyperscript syntax', async () => {
      const context = hyperscript.createContext(mockElement);
      context.variables = new Map([['value', 10]]);
      
      const result = await hyperscript.evaluate('value * 2 + 2', context);
      expect(result).toBe(22);
    });

    it('should handle errors the same as run()', async () => {
      await expect(hyperscript.evaluate('invalid @@ syntax'))
        .rejects.toThrow('Compilation failed');
    });
  });

  describe('Context Management', () => {
    it('should create context with optional element', () => {
      const context1 = hyperscript.createContext();
      expect(context1.me).toBeNull();
      expect(context1.locals).toBeInstanceOf(Map);
      expect(context1.globals).toBeInstanceOf(Map);

      const context2 = hyperscript.createContext(mockElement);
      expect(context2.me).toBe(mockElement);
    });

    it('should create child context with parent reference', () => {
      const parent = hyperscript.createContext(mockElement);
      parent.globals.set('parentVar', 'value');
      
      const child = hyperscript.createChildContext(parent);
      expect(child.parent).toBe(parent);
      expect(child.globals).toBe(parent.globals); // Shared globals
      expect(child.locals).not.toBe(parent.locals); // Separate locals
    });

    it('should handle context inheritance properly', () => {
      const parent = hyperscript.createContext();
      parent.globals.set('globalVar', 42);
      
      const child = hyperscript.createChildContext(parent, mockElement);
      child.locals.set('localVar', 'child');
      
      expect(child.globals.get('globalVar')).toBe(42);
      expect(child.locals.get('localVar')).toBe('child');
      expect(parent.locals.has('localVar')).toBe(false);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate correct hyperscript syntax', () => {
      expect(hyperscript.isValidHyperscript('42')).toBe(true);
      expect(hyperscript.isValidHyperscript('5 + 3')).toBe(true);
      expect(hyperscript.isValidHyperscript('if x > 0 then result = 1')).toBe(true);
    });

    it('should reject invalid hyperscript syntax', () => {
      expect(hyperscript.isValidHyperscript('')).toBe(false);
      expect(hyperscript.isValidHyperscript('invalid @@ syntax')).toBe(false);
      expect(hyperscript.isValidHyperscript('5 +')).toBe(false);
    });
  });

  describe('Advanced Features', () => {
    it('should create runtime with custom options', () => {
      const runtime = hyperscript.createRuntime({
        enableAsyncCommands: false,
        commandTimeout: 5000
      });
      
      expect(runtime).toBeDefined();
      expect(typeof runtime.execute).toBe('function');
    });

    it('should provide access to low-level parse function', () => {
      const result = hyperscript.parse('42');
      expect(result.success).toBe(true);
      expect(result.node?.type).toBe('literal');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty input gracefully', async () => {
      await expect(hyperscript.run('')).rejects.toThrow('Compilation failed');
    });

    it('should provide detailed error information', () => {
      const result = hyperscript.compile('5 +');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatchObject({
        message: expect.stringContaining('Expected expression'),
        line: expect.any(Number),
        column: expect.any(Number),
        position: expect.any(Number)
      });
    });

    it('should handle null/undefined inputs safely', () => {
      expect(() => hyperscript.compile(null as any)).toThrow();
      expect(() => hyperscript.compile(undefined as any)).toThrow();
    });
  });

  describe('Integration with Existing Components', () => {
    it('should integrate with expression evaluator', async () => {
      const context = hyperscript.createContext(mockElement);
      const result = await hyperscript.run('me.tagName', context);
      expect(result.toLowerCase()).toBe('div'); // Happy-DOM returns lowercase
    });

    it('should handle assignments and variable scoping', async () => {
      const context = hyperscript.createContext();
      await hyperscript.run('x = 42', context);
      
      expect(context.variables?.get('x')).toBe(42);
      
      const result = await hyperscript.run('x + 8', context);
      expect(result).toBe(50);
    });
  });
});