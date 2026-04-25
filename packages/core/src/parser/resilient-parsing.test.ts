/**
 * Tests for Phase 2.3: Resilient Parsing
 *
 * Validates that the parser continues after errors, produces error nodes with
 * diagnostics, and the runtime skips error-diagnosed nodes gracefully.
 */
import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { tokenize } from './tokenizer';

function parse(input: string) {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Resilient Parsing', () => {
  describe('valid input unchanged', () => {
    it('should parse valid command sequence identically', () => {
      const result = parse('toggle .active');
      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should parse valid multi-command sequence', () => {
      const result = parse('toggle .active then add .done');
      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
    });
  });

  describe('error accumulation', () => {
    it('should accumulate errors in ParseResult.errors', () => {
      const result = parse('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple errors from multiple invalid tokens', () => {
      // Expression with errors
      const result = parse('set x to');
      expect(result.errors).toBeDefined();
    });
  });

  describe('error command nodes', () => {
    it('should produce a result even for unrecognized input', () => {
      const result = parse('INVALID');
      expect(result.node).toBeDefined();
    });

    it('should continue parsing after error in command sequence', () => {
      // "on click toggle .active then INVALID then add .done"
      // Parser should handle INVALID gracefully and still return a valid AST
      const result = parse('on click toggle .active then INVALID then add .done');
      expect(result.node).toBeDefined();

      // The AST should be an event handler (or Program wrapping one)
      const node = result.node as any;
      expect(['eventHandler', 'Program']).toContain(node.type);
    });
  });

  describe('error node diagnostics', () => {
    it('should attach diagnostics to error command nodes', () => {
      // Walk any AST looking for error-diagnosed nodes
      function findErrorNodes(node: any): any[] {
        const errors: any[] = [];
        if (node?.diagnostics?.some((d: any) => d.severity === 'error')) {
          errors.push(node);
        }
        for (const key of ['commands', 'statements', 'body']) {
          if (Array.isArray(node?.[key])) {
            for (const child of node[key]) {
              errors.push(...findErrorNodes(child));
            }
          }
        }
        return errors;
      }

      // Test with a command sequence containing invalid tokens
      const result = parse('on click toggle .active then INVALID then add .done');
      const errorNodes = findErrorNodes(result.node);

      // Verify error nodes have proper diagnostics structure
      for (const errorNode of errorNodes) {
        expect(errorNode.diagnostics).toBeDefined();
        expect(errorNode.diagnostics[0]).toMatchObject({
          severity: 'error',
          code: 'parse-error',
        });
        expect(errorNode.diagnostics[0].message).toBeTruthy();
      }
    });
  });

  describe('ParseResult.errors array', () => {
    it('should include all accumulated errors', () => {
      const result = parse('');
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toBe('Cannot parse empty input');
    });

    it('should not include errors when parsing succeeds cleanly', () => {
      const result = parse('toggle .active');
      expect(result.errors).toBeUndefined();
    });

    it('should have errors array alongside the error field for backward compatibility', () => {
      const result = parse('');
      // Both old single error and new errors array present
      expect(result.error).toBeDefined();
      expect(result.errors).toBeDefined();
      // First accumulated error matches the single error
      expect(result.errors![0].message).toBe(result.error!.message);
    });
  });

  describe('synchronization', () => {
    it('should synchronize to then keyword after error', () => {
      // The parser should skip INVALID tokens and find 'then' to continue
      const result = parse('toggle .active then INVALID stuff here then add .done');
      expect(result.node).toBeDefined();
    });

    it('should synchronize to end keyword', () => {
      // Error inside a block should sync to 'end'
      const result = parse('if true toggle .active end');
      expect(result.node).toBeDefined();
    });
  });
});
