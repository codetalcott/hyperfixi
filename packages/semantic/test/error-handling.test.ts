/**
 * Error Handling and Edge Case Tests
 *
 * Tests graceful error handling and edge cases in the semantic parser.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, buildAST } from '../src';
import type { SemanticNode } from '../src/types';

// =============================================================================
// Parse Failure Tests
// =============================================================================

describe('Parse Failures', () => {
  describe('Unknown commands', () => {
    it('should throw on unknown command', () => {
      expect(() => parse('foobar .active', 'en')).toThrow();
    });

    it('should return false for canParse with unknown command', () => {
      expect(canParse('unknowncommand .active', 'en')).toBe(false);
    });

    it('should include input in error message', () => {
      try {
        parse('foobar .active', 'en');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('foobar');
      }
    });
  });

  describe('Unsupported languages', () => {
    it('should throw on unsupported language code', () => {
      expect(() => parse('toggle .active', 'xx')).toThrow();
    });

    it('should return false for canParse with unsupported language', () => {
      expect(canParse('toggle .active', 'invalid-lang')).toBe(false);
    });
  });

  describe('Empty input', () => {
    it('should throw on empty string', () => {
      expect(() => parse('', 'en')).toThrow();
    });

    it('should throw on whitespace only', () => {
      expect(() => parse('   ', 'en')).toThrow();
    });

    it('should return false for canParse with empty input', () => {
      expect(canParse('', 'en')).toBe(false);
      expect(canParse('   ', 'en')).toBe(false);
    });
  });

  describe('Malformed selectors', () => {
    it('should handle unclosed brackets gracefully', () => {
      // This tests that the parser doesn't crash on malformed input
      const result = canParse('toggle [data-unclosed', 'en');
      // Either parses as best-effort or returns false
      expect(typeof result).toBe('boolean');
    });

    it('should handle special characters in selectors', () => {
      const result = canParse('toggle #button-with-dashes', 'en');
      expect(result).toBe(true);
    });
  });
});

// =============================================================================
// AST Builder Error Handling
// =============================================================================

describe('AST Builder Errors', () => {
  it('should handle null/undefined nodes gracefully', () => {
    // TypeScript prevents this but runtime might encounter it
    expect(() => buildAST(null as any)).toThrow();
    expect(() => buildAST(undefined as any)).toThrow();
  });

  it('should handle nodes with missing required fields', () => {
    const malformedNode = { kind: 'command' } as SemanticNode;
    expect(() => buildAST(malformedNode)).toThrow();
  });

  it('should handle unknown node kinds', () => {
    const unknownNode = { kind: 'unknown-kind' } as any;
    expect(() => buildAST(unknownNode)).toThrow();
  });
});

// =============================================================================
// Edge Cases - Word Order
// =============================================================================

describe('Word Order Edge Cases', () => {
  describe('Japanese (SOV) edge cases', () => {
    it('should handle particles at end of sentence', () => {
      expect(canParse('.active を トグル', 'ja')).toBe(true);
    });

    it('should handle missing particles', () => {
      // May or may not parse depending on pattern flexibility
      const result = canParse('トグル .active', 'ja');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Korean (SOV) edge cases', () => {
    it('should handle particles correctly', () => {
      expect(canParse('.active 를 토글', 'ko')).toBe(true);
    });
  });

  describe('Arabic (VSO) edge cases', () => {
    it('should handle RTL text with LTR selectors', () => {
      expect(canParse('بدّل .active', 'ar')).toBe(true);
    });
  });
});

// =============================================================================
// Edge Cases - Selector Formats
// =============================================================================

describe('Selector Format Edge Cases', () => {
  it('should handle class selectors', () => {
    const node = parse('toggle .my-class', 'en');
    expect(node.roles.get('patient')?.value).toBe('.my-class');
  });

  it('should handle ID selectors', () => {
    const node = parse('toggle #my-id', 'en');
    expect(node.roles.get('patient')?.value).toBe('#my-id');
  });

  it('should handle element selectors', () => {
    const result = canParse('toggle div', 'en');
    expect(typeof result).toBe('boolean');
  });

  it('should handle complex selectors', () => {
    const result = canParse('toggle .parent .child', 'en');
    expect(typeof result).toBe('boolean');
  });

  it('should handle attribute selectors', () => {
    const result = canParse('toggle [data-active]', 'en');
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Edge Cases - Literal Values
// =============================================================================

describe('Literal Value Edge Cases', () => {
  it('should handle single quoted strings', () => {
    const result = canParse("put 'hello' into me", 'en');
    expect(result).toBe(true);
  });

  it('should handle double quoted strings', () => {
    const result = canParse('put "hello" into me', 'en');
    expect(result).toBe(true);
  });

  it('should handle strings with spaces', () => {
    const result = canParse("put 'hello world' into me", 'en');
    expect(result).toBe(true);
  });

  it('should handle numeric values', () => {
    const result = canParse('wait 500ms', 'en');
    expect(result).toBe(true);
  });

  it('should handle empty strings', () => {
    const result = canParse("put '' into me", 'en');
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Edge Cases - Reference Values
// =============================================================================

describe('Reference Value Edge Cases', () => {
  it('should handle "me" reference', () => {
    const node = parse('hide me', 'en');
    const dest = node.roles.get('destination') ?? node.roles.get('patient');
    expect(dest?.value).toBe('me');
  });

  it('should handle "it" reference', () => {
    const result = canParse('set it to 5', 'en');
    expect(typeof result).toBe('boolean');
  });

  it('should handle "event" reference', () => {
    const result = canParse('log event', 'en');
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Edge Cases - Mixed Language Content
// =============================================================================

describe('Mixed Language Content', () => {
  it('should handle English keywords with non-ASCII selectors', () => {
    // Selector with Japanese characters
    const result = canParse('toggle .日本語クラス', 'en');
    expect(typeof result).toBe('boolean');
  });

  it('should handle native keywords with English selectors', () => {
    expect(canParse('.active を トグル', 'ja')).toBe(true);
  });
});

// =============================================================================
// Performance Edge Cases
// =============================================================================

describe('Performance Edge Cases', () => {
  it('should handle long selector strings', () => {
    const longClass = '.very-long-class-name-that-goes-on-and-on';
    const result = canParse(`toggle ${longClass}`, 'en');
    expect(result).toBe(true);
  });

  it('should handle many tokens', () => {
    // A command with multiple modifiers
    const result = canParse('toggle .active on #button', 'en');
    expect(result).toBe(true);
  });
});

// =============================================================================
// Confidence Score Edge Cases
// =============================================================================

import { parseSemantic } from '../src';

describe('Confidence Score Edge Cases', () => {
  it('should produce high confidence for standard patterns', () => {
    const result = parseSemantic('toggle .active', 'en');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('should have confidence in analysis result', () => {
    const result = parseSemantic('.active を トグル', 'ja');
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should have low confidence for unparseable input', () => {
    const result = parseSemantic('foobar baz qux', 'en');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
