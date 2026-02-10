/**
 * Core Integration Tests
 *
 * Tests for the SemanticAnalyzer integration with @hyperfixi/core.
 * These tests validate that semantic parsing works end-to-end through
 * the core parser bridge interface.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSemanticAnalyzer,
  SemanticAnalyzer,
  SemanticAnalysisResult,
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  shouldUseSemanticResult,
  rolesToCommandArgs,
} from '../../src/core-bridge';
import { parse, tokenize } from '../../src';

// =============================================================================
// Test Setup
// =============================================================================

describe('Core Integration', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = createSemanticAnalyzer();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support all 25 languages (24 base + 1 variant)', () => {
      const languages = analyzer.supportedLanguages();
      // 24 base languages + es-MX variant (alphabetical by code)
      const expected = ['ar', 'bn', 'de', 'en', 'es', 'es-MX', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms', 'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
      for (const code of expected) {
        expect(languages).toContain(code);
      }
      expect(languages.length).toBe(25);
    });

    it('should return true for supported languages', () => {
      expect(analyzer.supportsLanguage('en')).toBe(true);
      expect(analyzer.supportsLanguage('ja')).toBe(true);
      expect(analyzer.supportsLanguage('ar')).toBe(true);
      expect(analyzer.supportsLanguage('es')).toBe(true);
      expect(analyzer.supportsLanguage('ko')).toBe(true);
      expect(analyzer.supportsLanguage('tr')).toBe(true);
      expect(analyzer.supportsLanguage('zh')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(analyzer.supportsLanguage('xx')).toBe(false);
      expect(analyzer.supportsLanguage('invalid')).toBe(false);
    });
  });

  // ===========================================================================
  // English Integration Tests
  // ===========================================================================

  describe('English Integration', () => {
    describe('toggle command', () => {
      it('parses "toggle .active on #button"', () => {
        const result = analyzer.analyze('toggle .active on #button', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command).toBeDefined();
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')).toBeDefined();
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
        expect(result.command?.roles.get('destination')).toBeDefined();
        expect(result.command?.roles.get('destination')?.value).toBe('#button');
      });

      it('parses "toggle .active" with implicit target', () => {
        const result = analyzer.analyze('toggle .active', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
      });
    });

    describe('put command', () => {
      it('parses "put \\"hello\\" into #output"', () => {
        const result = analyzer.analyze('put "hello" into #output', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('put');
        expect(result.command?.roles.get('patient')?.value).toBe('hello');
        expect(result.command?.roles.get('destination')?.value).toBe('#output');
      });
    });

    describe('add command', () => {
      it('parses "add .highlight to #element"', () => {
        const result = analyzer.analyze('add .highlight to #element', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('add');
        expect(result.command?.roles.get('patient')?.value).toBe('.highlight');
      });
    });

    describe('set command', () => {
      it('parses "set :count to 10"', () => {
        const result = analyzer.analyze('set :count to 10', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('set');
        expect(result.command?.roles.get('destination')?.value).toBe(':count');
        expect(result.command?.roles.get('patient')?.value).toBe(10);
      });
    });

    describe('show/hide commands', () => {
      it('parses "show #modal"', () => {
        const result = analyzer.analyze('show #modal', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('show');
      });

      it('parses "hide #modal"', () => {
        const result = analyzer.analyze('hide #modal', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('hide');
      });
    });

    describe('increment/decrement commands', () => {
      it('parses "increment :count"', () => {
        const result = analyzer.analyze('increment :count', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('increment');
      });

      it('parses "decrement :count"', () => {
        const result = analyzer.analyze('decrement :count', 'en');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('decrement');
      });
    });
  });

  // ===========================================================================
  // Japanese Integration Tests (with morphology)
  // ===========================================================================

  describe('Japanese Integration', () => {
    describe('toggle command', () => {
      it('parses ".active を 切り替え" (base form)', () => {
        const result = analyzer.analyze('.active を 切り替え', 'ja');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
      });

      it('parses "#button の .active を 切り替え" (with destination)', () => {
        const result = analyzer.analyze('#button の .active を 切り替え', 'ja');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
        expect(result.command?.roles.get('destination')?.value).toBe('#button');
      });
    });

    describe('put command', () => {
      it('parses "\\"hello\\" を #output に 置く"', () => {
        const result = analyzer.analyze('"hello" を #output に 置く', 'ja');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('put');
      });
    });
  });

  // ===========================================================================
  // Korean Integration Tests
  // ===========================================================================

  describe('Korean Integration', () => {
    describe('toggle command', () => {
      it('parses ".active 를 토글"', () => {
        const result = analyzer.analyze('.active 를 토글', 'ko');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
      });
    });
  });

  // ===========================================================================
  // Arabic Integration Tests
  // ===========================================================================

  describe('Arabic Integration', () => {
    describe('toggle command', () => {
      it('parses "بدّل .active"', () => {
        const result = analyzer.analyze('بدّل .active', 'ar');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
      });
    });
  });

  // ===========================================================================
  // Spanish Integration Tests
  // ===========================================================================

  describe('Spanish Integration', () => {
    describe('toggle command', () => {
      it('parses "alternar .active en #button"', () => {
        const result = analyzer.analyze('alternar .active en #button', 'es');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
      });
    });
  });

  // ===========================================================================
  // Turkish Integration Tests
  // ===========================================================================

  describe('Turkish Integration', () => {
    describe('toggle command', () => {
      it('parses ".active i değiştir" (with accusative marker)', () => {
        const result = analyzer.analyze('.active i değiştir', 'tr');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
      });
    });
  });

  // ===========================================================================
  // Chinese Integration Tests
  // ===========================================================================

  describe('Chinese Integration', () => {
    describe('toggle command', () => {
      it('parses "切换 .active" (simple SVO)', () => {
        const result = analyzer.analyze('切换 .active', 'zh');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
      });

      it('parses "切换 .active 在 #button" (full SVO with destination)', () => {
        const result = analyzer.analyze('切换 .active 在 #button', 'zh');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
        expect(result.command?.roles.get('destination')?.value).toBe('#button');
      });

      it('parses "把 .active 切换" (BA construction)', () => {
        const result = analyzer.analyze('把 .active 切换', 'zh');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('toggle');
        expect(result.command?.roles.get('patient')?.value).toBe('.active');
      });
    });

    describe('add command', () => {
      it('parses "添加 把 .highlight" (add command with BA)', () => {
        const result = analyzer.analyze('添加 把 .highlight', 'zh');

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.command?.name).toBe('add');
      });
    });
  });

  // ===========================================================================
  // Confidence Threshold Tests
  // ===========================================================================

  describe('Confidence Threshold', () => {
    it('shouldUseSemanticResult returns true for high confidence', () => {
      const result: SemanticAnalysisResult = {
        confidence: 0.9,
        command: {
          name: 'toggle',
          roles: new Map(),
        },
      };

      expect(shouldUseSemanticResult(result)).toBe(true);
      expect(shouldUseSemanticResult(result, DEFAULT_CONFIDENCE_THRESHOLD)).toBe(true);
      expect(shouldUseSemanticResult(result, HIGH_CONFIDENCE_THRESHOLD)).toBe(true);
    });

    it('shouldUseSemanticResult returns false for low confidence', () => {
      const result: SemanticAnalysisResult = {
        confidence: 0.3,
        command: {
          name: 'toggle',
          roles: new Map(),
        },
      };

      expect(shouldUseSemanticResult(result)).toBe(false);
      expect(shouldUseSemanticResult(result, DEFAULT_CONFIDENCE_THRESHOLD)).toBe(false);
    });

    it('shouldUseSemanticResult returns false when command is missing', () => {
      const result: SemanticAnalysisResult = {
        confidence: 0.9,
        errors: ['No pattern matched'],
      };

      expect(shouldUseSemanticResult(result)).toBe(false);
    });

    it('falls back gracefully on low confidence', () => {
      // Malformed input should return low confidence
      const result = analyzer.analyze('gibberish nonsense words', 'en');

      expect(result.confidence).toBe(0);
      expect(shouldUseSemanticResult(result)).toBe(false);
    });

    it('returns errors for unsupported language', () => {
      const result = analyzer.analyze('toggle .active', 'xyz');

      expect(result.confidence).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // rolesToCommandArgs Tests
  // ===========================================================================

  describe('rolesToCommandArgs', () => {
    it('converts patient role to positional arg', () => {
      const roles = new Map<string, { type: string; value: string }>([
        ['patient', { type: 'selector', value: '.active' }],
      ]);

      const { args, modifiers } = rolesToCommandArgs(roles as any, 'toggle');

      expect(args.length).toBe(1);
      expect(args[0]).toEqual({ type: 'selector', value: '.active' });
    });

    it('converts destination to "on" for toggle', () => {
      const roles = new Map<string, { type: string; value: string }>([
        ['patient', { type: 'selector', value: '.active' }],
        ['destination', { type: 'selector', value: '#button' }],
      ]);

      const { args, modifiers } = rolesToCommandArgs(roles as any, 'toggle');

      expect(modifiers['on']).toEqual({ type: 'selector', value: '#button' });
    });

    it('converts destination to "into" for put', () => {
      const roles = new Map<string, { type: string; value: string }>([
        ['patient', { type: 'literal', value: 'hello' }],
        ['destination', { type: 'selector', value: '#output' }],
      ]);

      const { args, modifiers } = rolesToCommandArgs(roles as any, 'put');

      expect(modifiers['into']).toEqual({ type: 'selector', value: '#output' });
    });

    it('converts source role to "from" modifier', () => {
      const roles = new Map<string, { type: string; value: string }>([
        ['patient', { type: 'selector', value: '.data' }],
        ['source', { type: 'selector', value: '#form' }],
      ]);

      const { args, modifiers } = rolesToCommandArgs(roles as any, 'take');

      expect(modifiers['from']).toEqual({ type: 'selector', value: '#form' });
    });

    it('converts duration role to "over" modifier', () => {
      const roles = new Map<string, { type: string; value: string }>([
        ['patient', { type: 'selector', value: '#element' }],
        ['duration', { type: 'literal', value: '500ms' }],
      ]);

      const { args, modifiers } = rolesToCommandArgs(roles as any, 'transition');

      expect(modifiers['over']).toEqual({ type: 'literal', value: '500ms' });
    });
  });

  // ===========================================================================
  // AST Equivalence Tests
  // ===========================================================================

  describe('AST Equivalence', () => {
    it('semantic parse produces equivalent AST to direct parse', () => {
      // Parse via semantic analyzer
      const semanticResult = analyzer.analyze('toggle .active on #button', 'en');
      // Parse via direct semantic parser
      const directNode = parse('toggle .active on #button', 'en');

      // Both should produce toggle command with same roles
      expect(semanticResult.command?.name).toBe(directNode.action);
      expect(semanticResult.command?.roles.get('patient')?.value).toBe(
        directNode.roles.get('patient')?.value
      );
      expect(semanticResult.command?.roles.get('destination')?.value).toBe(
        directNode.roles.get('destination')?.value
      );
    });

    it('cross-language parsing produces equivalent semantics', () => {
      // English
      const enResult = analyzer.analyze('toggle .active on #button', 'en');
      // Japanese
      const jaResult = analyzer.analyze('#button の .active を 切り替え', 'ja');

      // Both should be toggle commands
      expect(enResult.command?.name).toBe('toggle');
      expect(jaResult.command?.name).toBe('toggle');

      // Both should have .active as patient
      expect(enResult.command?.roles.get('patient')?.value).toBe('.active');
      expect(jaResult.command?.roles.get('patient')?.value).toBe('.active');

      // Both should have #button as destination
      expect(enResult.command?.roles.get('destination')?.value).toBe('#button');
      expect(jaResult.command?.roles.get('destination')?.value).toBe('#button');
    });
  });
});

// =============================================================================
// Coverage Report
// =============================================================================

describe('Integration Coverage Report', () => {
  it('reports language coverage', () => {
    const analyzer = createSemanticAnalyzer();
    const languages = analyzer.supportedLanguages();

    console.log('\n=== Integration Coverage Report ===');
    console.log(`Languages supported: ${languages.length}`);
    console.log(`Languages: ${languages.join(', ')}`);

    // Test each language with toggle command (using correct syntaxes)
    const results: Record<string, boolean> = {};
    const testCases: Record<string, { input: string; command: string }> = {
      en: { input: 'toggle .active', command: 'toggle' },
      ja: { input: '.active を 切り替え', command: 'toggle' },
      ar: { input: 'بدّل .active', command: 'toggle' },
      es: { input: 'alternar .active', command: 'toggle' },
      ko: { input: '.active 를 토글', command: 'toggle' },
      tr: { input: '.active i değiştir', command: 'toggle' }, // with accusative marker
      zh: { input: '切换 .active', command: 'toggle' }, // Chinese toggle
    };

    for (const [lang, { input, command }] of Object.entries(testCases)) {
      const result = analyzer.analyze(input, lang);
      results[lang] = result.command?.name === command;
    }

    console.log('\nCommand parsing by language:');
    for (const [lang, success] of Object.entries(results)) {
      console.log(`  ${lang}: ${success ? 'PASS' : 'FAIL'}`);
    }

    const passCount = Object.values(results).filter(Boolean).length;
    console.log(`\nTotal: ${passCount}/${Object.keys(results).length} languages passing`);
    console.log('=== End Report ===\n');

    // All 7 should pass
    expect(passCount).toBe(7);
  });
});
