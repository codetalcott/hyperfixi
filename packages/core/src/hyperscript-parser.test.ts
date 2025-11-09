import { describe, it, expect } from 'vitest';
import { HyperscriptParser, parseHyperscript } from './hyperscript-parser';

describe('HyperscriptParser', () => {
  describe('basic parsing', () => {
    it('should parse simple commands', () => {
      const result = parseHyperscript('log "hello world"');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const program = result.result!;
      expect(program.type).toBe('program');
      expect(program.features).toHaveLength(1);

      const feature = program.features[0];
      expect(feature.type).toBe('feature');
      expect(feature.keyword).toBe('command');
      expect(feature.body).toHaveLength(1);

      const command = feature.body[0];
      expect(command.type).toBe('command');
      expect(command.name).toBe('log');
      expect(command.args).toHaveLength(1);
      expect(command.args[0].value).toBe('hello world');
    });

    it('should parse put commands', () => {
      const result = parseHyperscript('put "Hello" into #output');

      expect(result.success).toBe(true);
      const program = result.result!;
      const command = program.features[0].body[0];

      expect(command.name).toBe('put');
      expect(command.args).toHaveLength(2);
      expect(command.args[0].value).toBe('Hello');
      expect(command.args[1].value).toBe('#output');
    });

    it('should parse add commands', () => {
      const result = parseHyperscript('add .active to me');

      expect(result.success).toBe(true);
      const program = result.result!;
      const command = program.features[0].body[0];

      expect(command.name).toBe('add');
      expect(command.args).toHaveLength(2);
      expect(command.args[0].value).toBe('.active');
      expect(command.args[1].value).toBe('me');
    });

    it('should parse possessive expressions', () => {
      const result = parseHyperscript("put my value's length into result");

      expect(result.success).toBe(true);
      const program = result.result!;
      const command = program.features[0].body[0];

      expect(command.name).toBe('put');
      expect(command.args).toHaveLength(2);

      // First arg should be possessive expression
      const valueExpr = command.args[0];
      expect(valueExpr.operator).toBe('possessive');
      expect(valueExpr.operands).toHaveLength(2);
      expect(valueExpr.operands[0].value).toBe('my');
      expect(valueExpr.operands[1].value).toBe('length');
    });

    it('should parse on event features', () => {
      const result = parseHyperscript('on click log "clicked"');

      expect(result.success).toBe(true);
      const program = result.result!;
      const feature = program.features[0];

      expect(feature.type).toBe('feature');
      expect(feature.keyword).toBe('on');
      expect(feature.body).toHaveLength(1);

      const command = feature.body[0];
      expect(command.name).toBe('log');
      expect(command.args[0].value).toBe('clicked');
    });

    it('should parse mathematical expressions', () => {
      const result = parseHyperscript('put 5 + 3 * 2 into result');

      expect(result.success).toBe(true);
      const program = result.result!;
      const command = program.features[0].body[0];

      expect(command.name).toBe('put');
      expect(command.args).toHaveLength(2);

      // Should respect operator precedence (3 * 2 first, then + 5)
      const mathExpr = command.args[0];
      expect(mathExpr.operator).toBe('+');
      expect(mathExpr.operands[0].value).toBe(5);
      expect(mathExpr.operands[1].operator).toBe('*');
    });

    it('should handle parenthesized expressions', () => {
      const result = parseHyperscript('put (5 + 3) * 2 into result');

      expect(result.success).toBe(true);
      const program = result.result!;
      const command = program.features[0].body[0];

      const mathExpr = command.args[0];
      expect(mathExpr.operator).toBe('*');
      expect(mathExpr.operands[1].value).toBe(2);
      expect(mathExpr.operands[0].operator).toBe('+');
    });
  });

  describe('error handling', () => {
    it('should handle parse errors gracefully', () => {
      const result = parseHyperscript('put into');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Parse error');
    });

    it('should provide error location information', () => {
      const result = parseHyperscript('put "hello" into (');

      expect(result.success).toBe(false);
      expect(result.errors[0].line).toBeGreaterThan(0);
      expect(result.errors[0].column).toBeGreaterThan(0);
    });
  });

  describe('complex features', () => {
    it('should parse function definitions', () => {
      const result = parseHyperscript(`
        def greet(name)
          log "Hello " + name
        end
      `);

      expect(result.success).toBe(true);
      const program = result.result!;
      const feature = program.features[0];

      expect(feature.keyword).toBe('def');
      expect(feature.body).toHaveLength(1);

      const command = feature.body[0];
      expect(command.name).toBe('log');
    });

    it('should parse init features', () => {
      const result = parseHyperscript(`
        init
          set counter to 0
          log "initialized"
      `);

      expect(result.success).toBe(true);
      const program = result.result!;
      const feature = program.features[0];

      expect(feature.keyword).toBe('init');
      expect(feature.body).toHaveLength(2);

      expect(feature.body[0].name).toBe('set');
      expect(feature.body[1].name).toBe('log');
    });
  });

  describe('_hyperscript API integration', () => {
    it('should work with the _hyperscript.parse() method', async () => {
      const { _hyperscript } = await import('./api/hyperscript-api');

      const ast = _hyperscript.parse('log "test"');

      expect(ast.type).toBe('program');
      expect(ast.features).toHaveLength(1);
      expect(ast.features[0].body[0].name).toBe('log');
    });
  });
});
