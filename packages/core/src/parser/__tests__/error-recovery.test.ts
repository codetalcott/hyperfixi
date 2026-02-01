/**
 * Edge cases and error recovery tests
 *
 * Tests parser behavior on malformed, incomplete, or unusual inputs.
 * Verifies that the parser either recovers gracefully or reports
 * meaningful errors without crashing.
 *
 * Phase 10: Parser Coverage & Refactoring Plan
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

// Helper: assert parse succeeds
function parseOk(input: string) {
  const result = parse(input);
  expect(
    result.success,
    `Expected parse to succeed for: "${input}"\nError: ${result.error?.message}`
  ).toBe(true);
  expect(result.node).toBeDefined();
  return result.node!;
}

// Helper: assert parse fails
function parseFail(input: string) {
  const result = parse(input);
  expect(result.success, `Expected parse to fail for: "${input}"`).toBe(false);
  expect(result.error).toBeDefined();
  return result.error!;
}

// Helper: parse without asserting success/failure
function tryParse(input: string) {
  const result = parse(input);
  // Should never throw - parse() wraps errors
  expect(typeof result.success).toBe('boolean');
  return result;
}

describe('Edge Cases and Error Recovery', () => {
  // ─── Unterminated Blocks ───────────────────────────────────────────

  describe('Unterminated Blocks', () => {
    it('should handle if block without end (lenient parser)', () => {
      // Parser tolerates missing end at end-of-input
      const result = tryParse('if x then add .active');
      expect(result.success).toBe(true);
      expect(result.node!.name).toBe('if');
    });

    it('should handle repeat block without end (lenient parser)', () => {
      const result = tryParse('repeat 3 times add .item');
      // Parser may tolerate or reject - no crash
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle nested if without inner end', () => {
      const result = tryParse('if a then if b then add .x end');
      // One end for inner if, outer if relies on end-of-input
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle if with else but no end', () => {
      const result = tryParse('if x then add .a else remove .a');
      expect(result.success).toBe(true);
    });

    it('should handle for-each without end', () => {
      const result = tryParse('for each item in items add .loaded');
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ─── Invalid Expressions Mid-Command ───────────────────────────────

  describe('Invalid Expressions Mid-Command', () => {
    it('should fail on incomplete binary expression', () => {
      const error = parseFail('5 +');
      expect(error.message).toContain('Expected expression');
    });

    it('should fail on missing right operand in multiplication', () => {
      const error = parseFail('3 *');
      expect(error.message).toContain('Expected expression');
    });

    it('should fail on invalid operator start', () => {
      const error = parseFail('* 5');
      expect(error.message).toBeDefined();
    });

    it('should fail on unmatched opening parenthesis', () => {
      const error = parseFail('(5 + 3');
      expect(error.message).toContain(')');
    });

    it('should fail on unmatched closing parenthesis', () => {
      const error = parseFail('5 + 3)');
      expect(error.message).toBeDefined();
    });

    it('should fail on unmatched bracket', () => {
      const error = parseFail('arr[0');
      expect(error.message).toBeDefined();
    });

    it('should fail on empty parentheses as expression', () => {
      const error = parseFail('()');
      expect(error.message).toBeDefined();
    });

    it('should fail on double operators', () => {
      const error = parseFail('5 + + 3');
      expect(error.message).toBeDefined();
    });

    it('should fail on missing comma in function args', () => {
      const error = parseFail('func(a b)');
      expect(error.message).toBeDefined();
    });

    it('should fail on trailing comma in function args', () => {
      const error = parseFail('func(a,)');
      expect(error.message).toBeDefined();
    });
  });

  // ─── Unknown and Unusual Command Names ─────────────────────────────

  describe('Unknown and Unusual Command Names', () => {
    it('should handle unknown identifier as expression', () => {
      const result = tryParse('foobar');
      // Single unknown identifier is a valid expression (identifier)
      expect(result.success).toBe(true);
      expect(result.node!.type).toBe('identifier');
    });

    it('should handle unknown two-word command gracefully', () => {
      const result = tryParse('foobar baz');
      // Parser may interpret as command or fail - no crash either way
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle numeric-only input', () => {
      const result = tryParse('42');
      expect(result.success).toBe(true);
      expect(result.node!.type).toBe('literal');
      expect(result.node!.value).toBe(42);
    });

    it('should handle string-only input', () => {
      const result = tryParse('"hello"');
      expect(result.success).toBe(true);
      expect(result.node!.type).toBe('literal');
    });

    it('should handle boolean-only input', () => {
      const result = tryParse('true');
      expect(result.success).toBe(true);
      expect(result.node!.value).toBe(true);
    });

    it('should handle null/nothing keyword', () => {
      const result = tryParse('nothing');
      expect(result.success).toBe(true);
    });
  });

  // ─── Malformed Event Handler Syntax ────────────────────────────────

  describe('Malformed Event Handler Syntax', () => {
    it('should fail on bare "on" keyword', () => {
      const error = parseFail('on');
      expect(error.message).toBeDefined();
    });

    it('should handle event handler with no commands', () => {
      // "on click" with nothing after - parser may treat as valid empty handler
      const result = tryParse('on click');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle event handler with unmatched bracket condition', () => {
      const result = tryParse('on click[shiftKey hide me');
      // Missing ] - should fail or recover
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle event handler with empty bracket condition', () => {
      const result = tryParse('on click[] hide me');
      expect(typeof result.success).toBe('boolean');
    });

    it('should parse event handler with from and missing target', () => {
      const result = tryParse('on click from');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle multiple on keywords', () => {
      // "on on click" - double on keyword
      const result = tryParse('on on click hide me');
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ─── Nested Error Scenarios ────────────────────────────────────────

  describe('Nested Error Scenarios', () => {
    it('should handle error in if condition', () => {
      // Invalid expression in condition
      const result = tryParse('if 5 + then add .x end');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle error in if then body', () => {
      const result = tryParse('if true then (5 + end');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle error in repeat body', () => {
      const result = tryParse('repeat 3 times 5 + end');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle error inside event handler body', () => {
      const result = tryParse('on click 5 +');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle deeply nested error', () => {
      // Error deep inside nested blocks
      const result = tryParse('on click if true then repeat 2 times 5 + end end');
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ─── Whitespace and Empty Input Edge Cases ─────────────────────────

  describe('Whitespace and Empty Input', () => {
    it('should fail on empty string', () => {
      const error = parseFail('');
      expect(error.message).toContain('empty');
    });

    it('should handle whitespace-only input', () => {
      const result = tryParse('   ');
      // Should fail like empty input
      expect(result.success).toBe(false);
    });

    it('should handle tab-only input', () => {
      const result = tryParse('\t\t');
      expect(result.success).toBe(false);
    });

    it('should handle newline-only input', () => {
      const result = tryParse('\n\n');
      expect(result.success).toBe(false);
    });

    it('should handle excessive whitespace between tokens', () => {
      const node = parseOk('add     .active');
      expect(node.type).toBe('command');
      expect(node.name).toBe('add');
    });

    it('should handle leading/trailing whitespace', () => {
      const node = parseOk('  toggle .active  ');
      expect(node.name).toBe('toggle');
    });
  });

  // ─── Special Characters and Unicode ────────────────────────────────

  describe('Special Characters and Unicode', () => {
    it('should fail on @ symbol', () => {
      const error = parseFail('5 @ 3');
      expect(error.message).toContain('Unexpected');
    });

    it('should fail on Unicode lambda', () => {
      const error = parseFail('5 + λ');
      expect(error.message).toBeDefined();
    });

    it('should handle hash selectors correctly', () => {
      const node = parseOk('hide #my-element');
      expect(node.name).toBe('hide');
    });

    it('should handle class selectors with hyphens', () => {
      const node = parseOk('toggle .my-class');
      expect(node.name).toBe('toggle');
    });

    it('should handle data attributes in member access', () => {
      const node = parseOk('my data-value');
      expect(node.type).toBe('memberExpression');
    });
  });

  // ─── Boundary Conditions ───────────────────────────────────────────

  describe('Boundary Conditions', () => {
    it('should parse single character identifier', () => {
      const node = parseOk('x');
      expect(node.type).toBe('identifier');
      expect(node.name).toBe('x');
    });

    it('should parse zero', () => {
      const node = parseOk('0');
      expect(node.type).toBe('literal');
      expect(node.value).toBe(0);
    });

    it('should parse negative number', () => {
      const node = parseOk('-1');
      expect(node.type).toBe('unaryExpression');
      expect(node.operator).toBe('-');
    });

    it('should parse empty string literal', () => {
      const node = parseOk('""');
      expect(node.type).toBe('literal');
      expect(node.value).toBe('');
    });

    it('should parse single-character string literal', () => {
      const node = parseOk('"a"');
      expect(node.type).toBe('literal');
      expect(node.value).toBe('a');
    });

    it('should parse deeply parenthesized expression', () => {
      const node = parseOk('((((42))))');
      expect(node.type).toBe('literal');
      expect(node.value).toBe(42);
    });

    it('should parse long identifier', () => {
      const longName = 'a'.repeat(100);
      const node = parseOk(longName);
      expect(node.type).toBe('identifier');
      expect(node.name).toBe(longName);
    });

    it('should handle set with empty string value', () => {
      const node = parseOk('set :x to ""');
      expect(node.name).toBe('set');
    });

    it('should handle set with zero value', () => {
      const node = parseOk('set :x to 0');
      expect(node.name).toBe('set');
    });

    it('should handle set with boolean value', () => {
      const node = parseOk('set :flag to true');
      expect(node.name).toBe('set');
    });
  });

  // ─── Keyword Sensitivity ───────────────────────────────────────────

  describe('Keyword Sensitivity', () => {
    it('should parse "then" as keyword in command chain', () => {
      const node = parseOk('add .a then remove .b');
      expect(node.type).toBe('CommandSequence');
    });

    it('should parse "end" as block terminator', () => {
      const node = parseOk('if true then add .x end');
      expect(node.name).toBe('if');
    });

    it('should parse "to" as keyword in set command', () => {
      const node = parseOk('set x to 5');
      expect(node.name).toBe('set');
    });

    it('should parse "by" as keyword in increment command', () => {
      const node = parseOk('increment x by 3');
      expect(node.name).toBe('set'); // transformed
      expect(node.originalCommand).toBe('increment');
    });

    it('should parse "from" as keyword in event handler', () => {
      const node = parseOk('on click from #btn toggle .active');
      expect(node.type).toBe('eventHandler');
      expect(node.target).toBe('#btn');
    });

    it('should parse "from" as keyword in remove command', () => {
      const node = parseOk('remove .active from #element');
      expect(node.name).toBe('remove');
    });

    it('should parse "into" as keyword in put command', () => {
      const node = parseOk('put "text" into #target');
      expect(node.name).toBe('put');
    });

    it('should parse "on" as keyword in toggle target', () => {
      const node = parseOk('toggle .active on #target');
      expect(node.name).toBe('toggle');
    });
  });

  // ─── Error Message Quality ─────────────────────────────────────────

  describe('Error Message Quality', () => {
    it('should include position info in errors', () => {
      const error = parseFail('5 +');
      expect(typeof error.position).toBe('number');
      expect(error.position).toBeGreaterThanOrEqual(0);
    });

    it('should include line info in errors', () => {
      const error = parseFail('5 +');
      expect(typeof error.line).toBe('number');
      expect(error.line).toBeGreaterThanOrEqual(1);
    });

    it('should include column info in errors', () => {
      const error = parseFail('5 +');
      expect(typeof error.column).toBe('number');
      expect(error.column).toBeGreaterThanOrEqual(1);
    });

    it('should have error name when provided', () => {
      const error = parseFail('5 +');
      // name is optional in ParseResult error - may be undefined
      if (error.name !== undefined) {
        expect(typeof error.name).toBe('string');
        expect(error.name.length).toBeGreaterThan(0);
      }
      // message is always present
      expect(typeof error.message).toBe('string');
    });

    it('should provide non-empty error messages', () => {
      const error = parseFail('(');
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('should report multi-line errors on correct line', () => {
      const error = parseFail('42\n5 +');
      expect(error.line).toBeGreaterThan(0);
    });
  });
});
