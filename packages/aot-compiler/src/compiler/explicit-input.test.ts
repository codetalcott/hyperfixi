/**
 * Tests for explicit bracket syntax and JSON input support in AOT compiler.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AOTCompiler } from './aot-compiler.js';

describe('AOTCompiler — explicit syntax input', () => {
  let compiler: AOTCompiler;

  beforeEach(() => {
    compiler = new AOTCompiler();
    compiler.reset();
  });

  describe('parse() with explicit syntax', () => {
    it('parses [toggle patient:.active] to AST', () => {
      const ast = compiler.parse('[toggle patient:.active]');
      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('event'); // wrapped in event handler
      const body = (ast as any).body;
      expect(body).toHaveLength(1);
      expect(body[0].type).toBe('command');
      expect(body[0].name).toBe('toggle');
    });

    it('preserves role values as args', () => {
      const ast = compiler.parse('[add patient:.highlight destination:#output]');
      expect(ast).not.toBeNull();
      const cmd = (ast as any).body[0];
      expect(cmd.name).toBe('add');
      expect(cmd.args).toHaveLength(2);
      expect(cmd.roles.patient).toEqual({ type: 'selector', value: '.highlight' });
      expect(cmd.roles.destination).toEqual({ type: 'selector', value: '#output' });
    });

    it('handles string literals', () => {
      const ast = compiler.parse('[put patient:"hello" destination:#output]');
      const cmd = (ast as any).body[0];
      expect(cmd.roles.patient).toEqual({ type: 'literal', value: 'hello' });
    });

    it('handles numeric values', () => {
      const ast = compiler.parse('[increment destination:#count quantity:5]');
      const cmd = (ast as any).body[0];
      expect(cmd.roles.quantity).toEqual({ type: 'literal', value: 5 });
    });

    it('handles reference values (me, it, etc.)', () => {
      const ast = compiler.parse('[add patient:.active destination:me]');
      const cmd = (ast as any).body[0];
      expect(cmd.roles.destination).toEqual({ type: 'identifier', value: 'me' });
    });

    it('handles duration values', () => {
      const ast = compiler.parse('[wait duration:500ms]');
      const cmd = (ast as any).body[0];
      expect(cmd.roles.duration).toEqual({ type: 'literal', value: 500 });
    });

    it('handles event handlers with body', () => {
      const ast = compiler.parse('[on event:click body:[toggle patient:.active]]');
      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('event');
      expect((ast as any).event).toBe('click');
      expect((ast as any).body).toHaveLength(1);
      expect((ast as any).body[0].type).toBe('command');
      expect((ast as any).body[0].name).toBe('toggle');
    });
  });

  describe('parse() with JSON input', () => {
    it('parses LLM JSON to AST', () => {
      const json = JSON.stringify({
        action: 'toggle',
        roles: {
          patient: { type: 'selector', value: '.active' },
        },
      });
      const ast = compiler.parse(json);
      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('event');
      const cmd = (ast as any).body[0];
      expect(cmd.type).toBe('command');
      expect(cmd.name).toBe('toggle');
    });

    it('parses JSON with multiple roles', () => {
      const json = JSON.stringify({
        action: 'add',
        roles: {
          patient: { type: 'selector', value: '.highlight' },
          destination: { type: 'selector', value: '#output' },
        },
      });
      const ast = compiler.parse(json);
      const cmd = (ast as any).body[0];
      expect(cmd.name).toBe('add');
      expect(cmd.roles.patient).toEqual({ type: 'selector', value: '.highlight' });
      expect(cmd.roles.destination).toEqual({ type: 'selector', value: '#output' });
    });

    it('does not treat non-action JSON as input', () => {
      // JSON without "action" key should not be detected
      const json = JSON.stringify({ name: 'test', value: 42 });
      // Should fall through to createSimpleAST or return null
      const ast = compiler.parse(json);
      // Either null or a simple AST — should NOT throw
      expect(ast === null || ast.type === 'event').toBe(true);
    });
  });

  describe('compileExplicit()', () => {
    it('compiles explicit syntax to JavaScript', () => {
      const result = compiler.compileExplicit('[toggle patient:.active]');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toContain('toggle');
    });

    it('compiles JSON input to JavaScript', () => {
      const json = JSON.stringify({
        action: 'toggle',
        roles: {
          patient: { type: 'selector', value: '.active' },
        },
      });
      const result = compiler.compileExplicit(json);
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('returns error for invalid explicit syntax', () => {
      const result = compiler.compileExplicit('[invalid');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('returns error for invalid JSON', () => {
      const result = compiler.compileExplicit('{ not valid json }');
      expect(result.success).toBe(false);
    });
  });

  describe('regression: natural language still works', () => {
    it('falls through to simple AST for natural language', () => {
      const ast = compiler.parse('toggle .active');
      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('event');
    });

    it('falls through for on-event pattern', () => {
      const ast = compiler.parse('on click toggle .active');
      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('event');
      expect((ast as any).event).toBe('click');
    });
  });
});
