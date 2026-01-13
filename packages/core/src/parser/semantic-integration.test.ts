/**
 * Semantic Integration Tests
 *
 * Tests the integration between the semantic parser and core parser.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SemanticIntegrationAdapter,
  SemanticAnalyzer,
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  shouldUseSemanticResult,
  languageBenefitsFromSemantic,
  createSemanticIntegration,
} from './semantic-integration';

// =============================================================================
// Mock Semantic Analyzer
// =============================================================================

function createMockAnalyzer(supportedLangs: string[] = ['en', 'es', 'ja', 'ar']): SemanticAnalyzer {
  return {
    analyze: vi.fn((input: string, _language: string) => {
      // Mock successful analysis for "toggle .active" pattern
      if (input.includes('toggle') || input.includes('alternar') || input.includes('切り替え')) {
        return {
          confidence: 0.9,
          command: {
            name: 'toggle',
            roles: new Map([['patient', { type: 'selector', value: '.active' }]]),
          },
          tokensConsumed: 3,
        };
      }

      // Mock low confidence for unknown input
      return {
        confidence: 0.2,
        errors: ['No pattern matched'],
      };
    }) as SemanticAnalyzer['analyze'],
    supportsLanguage: (lang: string) => supportedLangs.includes(lang),
    supportedLanguages: () => supportedLangs,
  };
}

// =============================================================================
// SemanticIntegrationAdapter Tests
// =============================================================================

describe('SemanticIntegrationAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default confidence threshold', () => {
      const analyzer = createMockAnalyzer();
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      expect(adapter.getLanguage()).toBe('en');
      expect(adapter.getConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
    });

    it('should accept custom confidence threshold', () => {
      const analyzer = createMockAnalyzer();
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'ja',
        confidenceThreshold: 0.7,
      });

      expect(adapter.getConfidenceThreshold()).toBe(0.7);
    });
  });

  describe('isAvailable', () => {
    it('should return true for supported languages', () => {
      const analyzer = createMockAnalyzer(['en', 'ja']);
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'ja',
      });

      expect(adapter.isAvailable()).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      const analyzer = createMockAnalyzer(['en']);
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'ko', // Not in supported list
      });

      expect(adapter.isAvailable()).toBe(false);
    });
  });

  describe('trySemanticParse', () => {
    it('should return successful result for matching input', () => {
      const analyzer = createMockAnalyzer();
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('toggle .active');

      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
      expect(result.node?.name).toBe('toggle');
      expect(result.confidence).toBe(0.9);
    });

    it('should return failed result for low confidence', () => {
      const analyzer = createMockAnalyzer();
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('unknown command here');

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.confidence).toBe(0.2);
    });

    it('should return failed result for unsupported language', () => {
      const analyzer = createMockAnalyzer(['en']);
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'ko',
      });

      const result = adapter.trySemanticParse('toggle .active');

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Semantic parsing not available for language 'ko'");
    });

    it('should respect custom confidence threshold', () => {
      const analyzer = createMockAnalyzer();
      // Mock analyzer to return 0.6 confidence
      vi.mocked(analyzer.analyze).mockReturnValueOnce({
        confidence: 0.6,
        command: {
          name: 'toggle',
          roles: new Map([['patient', { type: 'selector', value: '.active' }]]),
        },
      });

      // With threshold 0.7, should fail
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
        confidenceThreshold: 0.7,
      });

      const result = adapter.trySemanticParse('toggle .active');
      expect(result.success).toBe(false);
    });

    it('should handle analyzer errors gracefully', () => {
      const analyzer = createMockAnalyzer();
      vi.mocked(analyzer.analyze).mockImplementationOnce(() => {
        throw new Error('Tokenization failed');
      });

      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('broken input');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.errors).toContain('Tokenization failed');
    });
  });

  describe('CommandNode building', () => {
    it('should build correct CommandNode structure', () => {
      const analyzer = createMockAnalyzer();
      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('toggle .active');

      expect(result.node).toMatchObject({
        type: 'command',
        name: 'toggle',
        isBlocking: false,
      });
    });

    it('should map destination role to modifier', () => {
      const analyzer = createMockAnalyzer();
      vi.mocked(analyzer.analyze).mockReturnValueOnce({
        confidence: 0.9,
        command: {
          name: 'toggle',
          roles: new Map([
            ['patient', { type: 'selector', value: '.active' }],
            ['destination', { type: 'selector', value: '#button' }],
          ]),
        },
      });

      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('toggle .active on #button');

      expect(result.node?.modifiers).toBeDefined();
      expect(result.node?.modifiers?.['on']).toBeDefined();
    });

    it('should handle put command destination as into modifier', () => {
      const analyzer = createMockAnalyzer();
      vi.mocked(analyzer.analyze).mockReturnValueOnce({
        confidence: 0.9,
        command: {
          name: 'put',
          roles: new Map([
            ['patient', { type: 'literal', value: 'hello' }],
            ['destination', { type: 'selector', value: '#output' }],
          ]),
        },
      });

      const adapter = new SemanticIntegrationAdapter({
        analyzer,
        language: 'en',
      });

      const result = adapter.trySemanticParse('put "hello" into #output');

      expect(result.node?.name).toBe('put');
      expect(result.node?.modifiers?.['into']).toBeDefined();
    });
  });
});

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('shouldUseSemanticResult', () => {
  it('should return true for high confidence with command', () => {
    const result = {
      confidence: 0.8,
      command: { name: 'toggle', roles: new Map() },
    };

    expect(shouldUseSemanticResult(result)).toBe(true);
  });

  it('should return false for low confidence', () => {
    const result = {
      confidence: 0.3,
      command: { name: 'toggle', roles: new Map() },
    };

    expect(shouldUseSemanticResult(result)).toBe(false);
  });

  it('should return false when command is undefined', () => {
    const result = {
      confidence: 0.9,
      errors: ['No match'],
    };

    expect(shouldUseSemanticResult(result)).toBe(false);
  });

  it('should respect custom threshold', () => {
    const result = {
      confidence: 0.6,
      command: { name: 'toggle', roles: new Map() },
    };

    expect(shouldUseSemanticResult(result, 0.5)).toBe(true);
    expect(shouldUseSemanticResult(result, 0.7)).toBe(false);
  });
});

describe('languageBenefitsFromSemantic', () => {
  it('should return true for Japanese (SOV)', () => {
    expect(languageBenefitsFromSemantic('ja')).toBe(true);
  });

  it('should return true for Arabic (VSO)', () => {
    expect(languageBenefitsFromSemantic('ar')).toBe(true);
  });

  it('should return true for Korean (SOV with particles)', () => {
    expect(languageBenefitsFromSemantic('ko')).toBe(true);
  });

  it('should return true for Spanish (moderate benefit)', () => {
    expect(languageBenefitsFromSemantic('es')).toBe(true);
  });

  it('should return false for English', () => {
    expect(languageBenefitsFromSemantic('en')).toBe(false);
  });
});

describe('createSemanticIntegration', () => {
  it('should create adapter using factory function', () => {
    const analyzer = createMockAnalyzer();
    const adapter = createSemanticIntegration({
      analyzer,
      language: 'ja',
    });

    expect(adapter).toBeInstanceOf(SemanticIntegrationAdapter);
    expect(adapter.getLanguage()).toBe('ja');
  });
});

// =============================================================================
// Confidence Threshold Constants Tests
// =============================================================================

describe('Confidence thresholds', () => {
  it('should have correct default threshold', () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.5);
  });

  it('should have correct high threshold', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(0.8);
  });
});

// =============================================================================
// Expression Parsing Tests (parseExpressionString)
// =============================================================================

describe('parseExpressionString (via expression type values)', () => {
  /**
   * These tests verify the internal parseExpressionString method by testing
   * through the public interface. The adapter calls parseExpressionString
   * when converting 'expression' type semantic values.
   */

  function createExpressionMockAnalyzer(expressionValue: string): SemanticAnalyzer {
    return {
      analyze: vi.fn(() => ({
        confidence: 0.9,
        command: {
          name: 'call',
          roles: new Map([
            ['patient', { type: 'expression', value: expressionValue, raw: expressionValue }],
          ]),
        },
        tokensConsumed: 1,
      })),
      supportsLanguage: () => true,
      supportedLanguages: () => ['en'],
    };
  }

  it('should parse simple identifiers', () => {
    const analyzer = createExpressionMockAnalyzer('myVar');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call myVar');

    expect(result.success).toBe(true);
    expect(result.node?.args?.[0]).toMatchObject({
      type: 'identifier',
      name: 'myVar',
    });
  });

  it('should parse property access: me.textContent', () => {
    const analyzer = createExpressionMockAnalyzer('me.textContent');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('get me.textContent');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;
    expect(expr.type).toBe('memberExpression');
    expect(expr.object.name).toBe('me');
    expect(expr.property.name).toBe('textContent');
  });

  it('should parse chained property access: obj.foo.bar', () => {
    const analyzer = createExpressionMockAnalyzer('obj.foo.bar');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('get obj.foo.bar');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;
    expect(expr.type).toBe('memberExpression');
    expect(expr.property.name).toBe('bar');
    expect(expr.object.type).toBe('memberExpression');
    expect(expr.object.property.name).toBe('foo');
    expect(expr.object.object.name).toBe('obj');
  });

  it('should parse method calls with no arguments: foo()', () => {
    const analyzer = createExpressionMockAnalyzer('foo()');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call foo()');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;
    expect(expr.type).toBe('callExpression');
    expect(expr.callee.name).toBe('foo');
    expect(expr.arguments).toHaveLength(0);
  });

  it('should parse method calls with arguments: me.insertBefore(a, b)', () => {
    const analyzer = createExpressionMockAnalyzer('me.insertBefore(draggedItem, dropTarget)');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call me.insertBefore(draggedItem, dropTarget)');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;

    // Should be a callExpression
    expect(expr.type).toBe('callExpression');

    // Callee should be memberExpression: me.insertBefore
    expect(expr.callee.type).toBe('memberExpression');
    expect(expr.callee.object.name).toBe('me');
    expect(expr.callee.property.name).toBe('insertBefore');

    // Should have 2 arguments
    expect(expr.arguments).toHaveLength(2);
    expect(expr.arguments[0].name).toBe('draggedItem');
    expect(expr.arguments[1].name).toBe('dropTarget');
  });

  it('should parse nested property access in arguments: x.y(a.b, c)', () => {
    const analyzer = createExpressionMockAnalyzer('x.y(a.b, c)');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call x.y(a.b, c)');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;

    expect(expr.type).toBe('callExpression');
    expect(expr.arguments).toHaveLength(2);

    // First argument: a.b (memberExpression)
    expect(expr.arguments[0].type).toBe('memberExpression');
    expect(expr.arguments[0].object.name).toBe('a');
    expect(expr.arguments[0].property.name).toBe('b');

    // Second argument: c (identifier)
    expect(expr.arguments[1].type).toBe('identifier');
    expect(expr.arguments[1].name).toBe('c');
  });

  it('should parse chained method calls: obj.method().another()', () => {
    const analyzer = createExpressionMockAnalyzer('obj.method().another()');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call obj.method().another()');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;

    // Outermost: callExpression for .another()
    expect(expr.type).toBe('callExpression');
    expect(expr.callee.type).toBe('memberExpression');
    expect(expr.callee.property.name).toBe('another');

    // Inner: callExpression for .method()
    const inner = expr.callee.object;
    expect(inner.type).toBe('callExpression');
    expect(inner.callee.type).toBe('memberExpression');
    expect(inner.callee.property.name).toBe('method');
    expect(inner.callee.object.name).toBe('obj');
  });

  it('should handle whitespace in expressions', () => {
    const analyzer = createExpressionMockAnalyzer('  foo  .  bar  (  x  ,  y  )  ');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call foo.bar(x, y)');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;
    expect(expr.type).toBe('callExpression');
    expect(expr.callee.property.name).toBe('bar');
    expect(expr.arguments).toHaveLength(2);
  });

  it('should fallback to identifier for empty/unparseable input', () => {
    const analyzer = createExpressionMockAnalyzer('');
    const adapter = new SemanticIntegrationAdapter({ analyzer, language: 'en' });

    const result = adapter.trySemanticParse('call');

    expect(result.success).toBe(true);
    const expr = result.node?.args?.[0] as any;
    expect(expr.type).toBe('identifier');
    expect(expr.name).toBe('');
  });
});
