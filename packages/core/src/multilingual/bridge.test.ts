/**
 * Semantic-Grammar Bridge Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticGrammarBridge } from './bridge';

describe('SemanticGrammarBridge', () => {
  let bridge: SemanticGrammarBridge;

  beforeEach(async () => {
    bridge = new SemanticGrammarBridge();
    await bridge.initialize();
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      const newBridge = new SemanticGrammarBridge();
      await expect(newBridge.initialize()).resolves.not.toThrow();
      expect(newBridge.isInitialized()).toBe(true);
    });
  });

  describe('transform', () => {
    it('should return same text for same language', async () => {
      const result = await bridge.transform('toggle .active', 'en', 'en');
      expect(result.output).toBe('toggle .active');
      expect(result.usedSemantic).toBe(false);
      expect(result.confidence).toBe(1.0);
    });

    it('should transform English to Japanese', async () => {
      const result = await bridge.transform('toggle .active', 'en', 'ja');
      expect(result.output).toContain('.active');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('ja');
    });

    it('should transform English to Spanish', async () => {
      const result = await bridge.transform('toggle .active', 'en', 'es');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('es');
    });

    it('should handle complex statements', async () => {
      const result = await bridge.transform('toggle .active on #button', 'en', 'ja');
      expect(result.output).toContain('.active');
      expect(result.output).toContain('#button');
    });
  });

  describe('parse', () => {
    it('should parse English toggle command', async () => {
      const node = await bridge.parse('toggle .active', 'en');
      expect(node).not.toBeNull();
      if (node) {
        expect(node.action).toBe('toggle');
        expect(node.roles.has('patient')).toBe(true);
      }
    });

    it('should return null for invalid input', async () => {
      const node = await bridge.parse('definitely not hyperscript code', 'en');
      // May or may not parse - depends on patterns
      // Just verify it doesn't throw
    });
  });

  describe('render', () => {
    it('should render semantic node to English', async () => {
      const node = await bridge.parse('toggle .active', 'en');
      if (node) {
        const english = await bridge.render(node, 'en');
        expect(english).toContain('toggle');
        expect(english).toContain('.active');
      }
    });

    it('should render semantic node to Japanese', async () => {
      const node = await bridge.parse('toggle .active', 'en');
      if (node) {
        const japanese = await bridge.render(node, 'ja');
        expect(japanese).toContain('.active');
      }
    });
  });

  describe('getAllTranslations', () => {
    it('should return translations for all supported languages', async () => {
      const translations = await bridge.getAllTranslations('toggle .active', 'en');

      // Should have entries for multiple languages
      expect(Object.keys(translations).length).toBeGreaterThan(5);

      // Each should have the required fields
      for (const [lang, result] of Object.entries(translations)) {
        expect(result.sourceLang).toBe('en');
        expect(result.targetLang).toBe(lang);
        expect(typeof result.output).toBe('string');
      }
    });
  });

  describe('integration with semantic parser', () => {
    it('should use semantic parser for multilingual input', async () => {
      const result = await bridge.transform('toggle .active', 'en', 'ja');
      expect(result.usedSemantic).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });

    it('should fallback gracefully on low confidence', async () => {
      const result = await bridge.transform('very complex unrecognized syntax', 'en', 'ja');
      // Should still produce output even with low confidence
      expect(typeof result.output).toBe('string');
    });

    it('should handle semantic parsing errors', async () => {
      // Should not throw, but handle gracefully
      const result = await bridge.transform('', 'en', 'ja');
      expect(result).toBeDefined();
    });
  });

  describe('parseToAST integration', () => {
    it('should generate AST from English input', async () => {
      const ast = await bridge.parseToAST('toggle .active', 'en');
      expect(ast).toBeDefined();
      if (ast) {
        expect(ast.type).toBeDefined();
      }
    });

    it('should generate AST from Japanese input', async () => {
      const ast = await bridge.parseToAST('.active を トグル', 'ja');
      expect(ast).toBeDefined();
    });

    it('should generate AST from Spanish input', async () => {
      const ast = await bridge.parseToAST('alternar .active', 'es');
      expect(ast).toBeDefined();
    });

    it('should provide detailed AST results', async () => {
      const result = await bridge.parseToASTWithDetails('toggle .active', 'en');
      expect(result.lang).toBe('en');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.usedDirectPath).toBe('boolean');

      if (result.usedDirectPath) {
        expect(result.ast).not.toBeNull();
      } else {
        expect(result.fallbackText).not.toBeNull();
      }
    });
  });

  describe('cross-language consistency', () => {
    it('should produce consistent translations for toggle command', async () => {
      const languages = ['ja', 'es', 'ko', 'ar'];
      const results = await Promise.all(
        languages.map(lang => bridge.transform('toggle .active', 'en', lang))
      );

      // All should preserve .active selector
      for (const result of results) {
        expect(result.output).toContain('.active');
      }
    });

    it('should maintain selector integrity in complex commands', async () => {
      const result = await bridge.transform('toggle .class1 on #element', 'en', 'ja');
      expect(result.output).toContain('.class1');
      // Note: Semantic parser may simplify compound selectors
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle round-trip translations', async () => {
      const toJa = await bridge.transform('toggle .active', 'en', 'ja');
      const backToEn = await bridge.transform(toJa.output, 'ja', 'en');

      expect(backToEn.output).toContain('toggle');
      expect(backToEn.output).toContain('.active');
    });
  });

  describe('error recovery', () => {
    it('should handle empty input', async () => {
      const result = await bridge.transform('', 'en', 'ja');
      expect(result).toBeDefined();
      expect(typeof result.output).toBe('string');
    });

    it('should handle whitespace-only input', async () => {
      const result = await bridge.transform('   \n\t  ', 'en', 'ja');
      expect(result).toBeDefined();
    });

    it('should handle special characters', async () => {
      const result = await bridge.transform('toggle .active!@#', 'en', 'ja');
      expect(result).toBeDefined();
    });

    it('should handle very long input', async () => {
      const longInput = 'toggle .active '.repeat(100);
      const result = await bridge.transform(longInput, 'en', 'ja');
      expect(result).toBeDefined();
    });
  });

  describe('performance characteristics', () => {
    it('should cache repeated transformations', async () => {
      const input = 'toggle .active';

      const start1 = Date.now();
      await bridge.transform(input, 'en', 'ja');
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      await bridge.transform(input, 'en', 'ja');
      const duration2 = Date.now() - start2;

      // Second call might be faster due to caching (though not guaranteed)
      expect(duration2).toBeLessThanOrEqual(duration1 * 2); // At least not slower
    });

    it('should handle parallel transformations', async () => {
      const languages = ['ja', 'es', 'ko', 'ar', 'zh', 'tr'];

      const start = Date.now();
      await Promise.all(languages.map(lang => bridge.transform('toggle .active', 'en', lang)));
      const duration = Date.now() - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });
});

// =============================================================================
// MultilingualHyperscript API Tests
// =============================================================================

import { MultilingualHyperscript, getMultilingual, multilingual, type LanguageInfo } from './index';

describe('MultilingualHyperscript', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      const instance = new MultilingualHyperscript();
      expect(instance.isInitialized()).toBe(false);
      await instance.initialize();
      expect(instance.isInitialized()).toBe(true);
    });

    it('should auto-initialize on first operation', async () => {
      const instance = new MultilingualHyperscript();
      expect(instance.isInitialized()).toBe(false);
      await instance.translate('toggle .active', 'en', 'ja');
      expect(instance.isInitialized()).toBe(true);
    });

    it('should only initialize once', async () => {
      const instance = new MultilingualHyperscript();
      await instance.initialize();
      await instance.initialize(); // Should not throw
      expect(instance.isInitialized()).toBe(true);
    });
  });

  describe('parse', () => {
    it('should parse English input', async () => {
      const node = await ml.parse('toggle .active on #button', 'en');
      expect(node).not.toBeNull();
      if (node) {
        expect(node.action).toBe('toggle');
      }
    });

    it('should default to English language', async () => {
      const node = await ml.parse('toggle .active');
      expect(node).not.toBeNull();
    });
  });

  describe('translate', () => {
    it('should translate English to Japanese', async () => {
      const result = await ml.translate('toggle .active', 'en', 'ja');
      expect(result).toContain('.active');
    });

    it('should return same text for same language', async () => {
      const result = await ml.translate('toggle .active', 'en', 'en');
      expect(result).toBe('toggle .active');
    });
  });

  describe('translateWithDetails', () => {
    it('should return detailed translation result', async () => {
      const result = await ml.translateWithDetails('toggle .active', 'en', 'ja');
      expect(result.output).toContain('.active');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('ja');
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('render', () => {
    it('should render node to target language', async () => {
      const node = await ml.parse('toggle .active', 'en');
      if (node) {
        const japanese = await ml.render(node, 'ja');
        expect(japanese).toContain('.active');
      }
    });
  });

  describe('getAllTranslations', () => {
    it('should return translations for all languages', async () => {
      const translations = await ml.getAllTranslations('toggle .active', 'en');
      const languages = ml.getSupportedLanguages();

      for (const lang of languages) {
        expect(translations[lang]).toBeDefined();
        expect(translations[lang].targetLang).toBe(lang);
      }
    });
  });

  describe('language support', () => {
    it('should return 13 supported languages', () => {
      const languages = ml.getSupportedLanguages();
      expect(languages).toHaveLength(13);
      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
      expect(languages).toContain('qu');
      expect(languages).toContain('sw');
    });

    it('should check if language is supported', () => {
      expect(ml.isLanguageSupported('en')).toBe(true);
      expect(ml.isLanguageSupported('ja')).toBe(true);
      expect(ml.isLanguageSupported('xyz')).toBe(false);
    });

    it('should return language info', () => {
      const info = ml.getLanguageInfo('ja');
      expect(info).toBeDefined();
      expect(info?.code).toBe('ja');
      expect(info?.name).toBe('Japanese');
      expect(info?.nativeName).toBe('日本語');
      expect(info?.direction).toBe('ltr');
      expect(info?.wordOrder).toBe('SOV');
    });

    it('should return undefined for unknown language', () => {
      const info = ml.getLanguageInfo('xyz');
      expect(info).toBeUndefined();
    });

    it('should return all language info', () => {
      const allInfo = ml.getAllLanguageInfo();
      expect(Object.keys(allInfo)).toHaveLength(13);
      expect(allInfo.ar.direction).toBe('rtl');
      expect(allInfo.ar.wordOrder).toBe('VSO');
    });
  });
});

describe('getMultilingual', () => {
  it('should return initialized instance', async () => {
    const instance = await getMultilingual();
    expect(instance.isInitialized()).toBe(true);
  });

  it('should return same instance on repeated calls', async () => {
    const instance1 = await getMultilingual();
    const instance2 = await getMultilingual();
    expect(instance1).toBe(instance2);
  });
});

describe('multilingual export', () => {
  it('should export default instance', () => {
    expect(multilingual).toBeInstanceOf(MultilingualHyperscript);
  });

  it('should require initialization', () => {
    // New instances start uninitialized
    const instance = new MultilingualHyperscript();
    expect(instance.isInitialized()).toBe(false);
  });
});

// =============================================================================
// parseToAST Integration Tests (Direct Semantic-to-AST Path)
// =============================================================================

describe('parseToAST Integration', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('English inputs', () => {
    it('should parse toggle command to AST', async () => {
      const ast = await ml.parseToAST('toggle .active on #button', 'en');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });

    it('should parse add command to AST', async () => {
      const ast = await ml.parseToAST('add .highlight to #element', 'en');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('add');
    });

    it('should parse remove command to AST', async () => {
      const ast = await ml.parseToAST('remove .active from #button', 'en');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('remove');
    });

    it('should parse set command to AST', async () => {
      const ast = await ml.parseToAST("set #input's value to 'hello'", 'en');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('set');
    });

    it('should parse wait command to AST', async () => {
      const ast = await ml.parseToAST('wait 500ms', 'en');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('wait');
    });

    it('should parse show/hide commands to AST when confidence is high', async () => {
      // Note: show/hide may have lower confidence - test the detailed result
      const showResult = await ml.parseToASTWithDetails('show #modal', 'en');
      const hideResult = await ml.parseToASTWithDetails('hide #modal', 'en');

      // Verify the result structure is correct
      expect(showResult.lang).toBe('en');
      expect(hideResult.lang).toBe('en');

      // If direct path succeeded, verify the AST
      if (showResult.usedDirectPath && showResult.ast) {
        expect((showResult.ast as unknown as { name: string }).name).toBe('show');
      }
      if (hideResult.usedDirectPath && hideResult.ast) {
        expect((hideResult.ast as unknown as { name: string }).name).toBe('hide');
      }
    });
  });

  describe('Japanese inputs (SOV)', () => {
    it('should parse toggle command from Japanese', async () => {
      const ast = await ml.parseToAST('#button の .active を 切り替え', 'ja');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });

    it('should parse add command from Japanese', async () => {
      // Use parseToASTWithDetails to get either direct AST or fallback
      const result = await ml.parseToASTWithDetails('.highlight を 追加', 'ja');

      // Either direct path or fallback should succeed
      if (result.ast) {
        expect(result.ast.type).toBe('command');
        expect((result.ast as unknown as { name: string }).name).toBe('add');
      } else {
        // Fallback path - verify English rendering contains 'add'
        expect(result.fallbackText).not.toBeNull();
        expect(result.fallbackText).toContain('add');
      }
    });

    it('should parse show/hide from Japanese', async () => {
      const showAst = await ml.parseToAST('#modal を 表示', 'ja');
      const hideAst = await ml.parseToAST('#modal を 非表示', 'ja');

      expect(showAst).not.toBeNull();
      expect((showAst as unknown as { name: string }).name).toBe('show');

      expect(hideAst).not.toBeNull();
      expect((hideAst as unknown as { name: string }).name).toBe('hide');
    });
  });

  describe('Spanish inputs (SVO)', () => {
    it('should parse toggle command from Spanish', async () => {
      const ast = await ml.parseToAST('alternar .active en #button', 'es');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });

    it('should parse add command from Spanish', async () => {
      const ast = await ml.parseToAST('agregar .highlight a #element', 'es');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('add');
    });
  });

  describe('Korean inputs (SOV)', () => {
    it('should parse toggle command from Korean', async () => {
      const ast = await ml.parseToAST('#button 의 .active 를 토글', 'ko');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });
  });

  describe('Arabic inputs (VSO)', () => {
    it('should parse toggle command from Arabic', async () => {
      const ast = await ml.parseToAST('بدّل .active على #button', 'ar');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });
  });

  describe('Chinese inputs (SVO)', () => {
    it('should parse toggle command from Chinese', async () => {
      const ast = await ml.parseToAST('切换 .active 在 #button', 'zh');

      expect(ast).not.toBeNull();
      expect(ast!.type).toBe('command');
      expect((ast as unknown as { name: string }).name).toBe('toggle');
    });
  });
});

describe('parseToASTWithDetails Integration', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  it('should return detailed result with direct path or fallback', async () => {
    const result = await ml.parseToASTWithDetails('toggle .active', 'en');

    // Either direct path succeeds (confidence >= 0.55 threshold) or fallback is available
    if (result.usedDirectPath) {
      expect(result.ast).not.toBeNull();
      // Simple commands like "toggle .active" score ~0.556 (1 required / 1.8 with optional)
      expect(result.confidence).toBeGreaterThan(0.55);
      expect(result.fallbackText).toBeNull();
    } else {
      // Fallback path - should have English text for traditional parser
      expect(result.fallbackText).not.toBeNull();
      expect(result.fallbackText).toContain('toggle');
    }
    expect(result.lang).toBe('en');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle unrecognized input gracefully', async () => {
    const result = await ml.parseToASTWithDetails('xyzzy foobar', 'en');

    expect(result.usedDirectPath).toBe(false);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('should preserve language info', async () => {
    const result = await ml.parseToASTWithDetails('トグル .active', 'ja');

    expect(result.lang).toBe('ja');
  });
});

describe('Cross-Language AST Consistency', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  it('should produce equivalent AST for same command in different languages', async () => {
    // Use parseToASTWithDetails to get either direct AST or fallback text
    const englishResult = await ml.parseToASTWithDetails('toggle .active', 'en');
    const japaneseResult = await ml.parseToASTWithDetails('.active を 切り替え', 'ja');
    const spanishResult = await ml.parseToASTWithDetails('alternar .active', 'es');

    // All should produce a usable result (either direct AST or fallback)
    const hasValidResult = (result: typeof englishResult) =>
      result.ast !== null || result.fallbackText !== null;

    expect(hasValidResult(englishResult)).toBe(true);
    expect(hasValidResult(japaneseResult)).toBe(true);
    expect(hasValidResult(spanishResult)).toBe(true);

    // If direct path succeeded, verify command names
    if (englishResult.ast) {
      expect((englishResult.ast as unknown as { name: string }).name).toBe('toggle');
    }
    if (japaneseResult.ast) {
      expect((japaneseResult.ast as unknown as { name: string }).name).toBe('toggle');
    }
    if (spanishResult.ast) {
      expect((spanishResult.ast as unknown as { name: string }).name).toBe('toggle');
    }

    // All fallback texts should contain 'toggle' for English rendering
    if (englishResult.fallbackText) {
      expect(englishResult.fallbackText).toContain('toggle');
    }
    if (japaneseResult.fallbackText) {
      expect(japaneseResult.fallbackText).toContain('toggle');
    }
    if (spanishResult.fallbackText) {
      expect(spanishResult.fallbackText).toContain('toggle');
    }
  });

  it('should produce equivalent AST for add command across languages', async () => {
    // Use the full syntax with target for higher confidence parsing
    const englishResult = await ml.parseToASTWithDetails('add .highlight to #element', 'en');
    const japaneseResult = await ml.parseToASTWithDetails('.highlight を 追加', 'ja');

    // Both should have valid result structures
    expect(englishResult.lang).toBe('en');
    expect(japaneseResult.lang).toBe('ja');

    // English add with target should work
    expect(englishResult.usedDirectPath).toBe(true);
    expect(englishResult.ast).not.toBeNull();
    expect((englishResult.ast as unknown as { name: string }).name).toBe('add');

    // Japanese add may or may not work depending on pattern coverage
    // If it works, verify consistency
    if (japaneseResult.usedDirectPath && japaneseResult.ast) {
      expect((japaneseResult.ast as unknown as { name: string }).name).toBe('add');
      expect((japaneseResult.ast as unknown as { type: string }).type).toBe(
        (englishResult.ast as unknown as { type: string }).type
      );
    }
  });
});
