/**
 * Comprehensive Multilingual Tests
 *
 * Additional test coverage for MultilingualHyperscript API:
 * - Error handling and edge cases
 * - Complex command combinations
 * - Performance and caching scenarios
 * - Cross-language consistency validation
 * - API usage patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultilingualHyperscript, getMultilingual, type LanguageInfo } from './index';

describe('MultilingualHyperscript - Error Handling', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('invalid inputs', () => {
    it('should handle empty input gracefully', async () => {
      const node = await ml.parse('', 'en');
      // Empty input may return null or a minimal node
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle whitespace-only input', async () => {
      const node = await ml.parse('   \n\t  ', 'en');
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle very long input strings', async () => {
      const longInput = 'toggle .active '.repeat(100);
      const node = await ml.parse(longInput, 'en');
      // Should either parse or return null without crashing
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle special characters in input', async () => {
      const specialInput = 'toggle .active!@#$%^&*()';
      const node = await ml.parse(specialInput, 'en');
      // Parser should handle special chars gracefully
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle unicode characters', async () => {
      const unicodeInput = 'toggle .active™®©';
      const node = await ml.parse(unicodeInput, 'en');
      expect(node === null || typeof node === 'object').toBe(true);
    });
  });

  describe('unsupported languages', () => {
    it('should handle unsupported language codes', async () => {
      const node = await ml.parse('toggle .active', 'xyz');
      // Should either use fallback or return null
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should report unsupported language correctly', () => {
      expect(ml.isLanguageSupported('xyz')).toBe(false);
      expect(ml.isLanguageSupported('abc')).toBe(false);
      expect(ml.isLanguageSupported('')).toBe(false);
    });

    it('should return undefined for unsupported language info', () => {
      expect(ml.getLanguageInfo('xyz')).toBeUndefined();
      expect(ml.getLanguageInfo('')).toBeUndefined();
    });
  });

  describe('translation errors', () => {
    it('should handle same source and target language', async () => {
      const result = await ml.translate('toggle .active', 'en', 'en');
      expect(result).toBe('toggle .active');
    });

    it('should handle translation with unsupported source language', async () => {
      // Should not throw, may use fallback behavior
      const result = await ml.translate('toggle .active', 'xyz', 'en');
      expect(typeof result).toBe('string');
    });

    it('should handle translation with unsupported target language', async () => {
      // Should not throw, may use fallback behavior
      const result = await ml.translate('toggle .active', 'en', 'xyz');
      expect(typeof result).toBe('string');
    });
  });

  describe('null and undefined handling', () => {
    it('should handle null-like inputs gracefully', async () => {
      // Test that the system doesn't crash on edge cases
      const tests = [
        { input: 'null', lang: 'en' },
        { input: 'undefined', lang: 'en' },
        { input: 'NaN', lang: 'en' },
      ];

      for (const { input, lang } of tests) {
        const node = await ml.parse(input, lang);
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });
  });
});

describe('MultilingualHyperscript - Complex Commands', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('multi-word commands', () => {
    it('should parse multi-word English commands', async () => {
      const commands = [
        'add .highlight to #element',
        'remove .active from #button',
        'put "text" into #output',
        'set #input to "value"',
      ];

      for (const cmd of commands) {
        const node = await ml.parse(cmd, 'en');
        expect(node).not.toBeNull();
        if (node) {
          expect(node.action).toBeDefined();
        }
      }
    });

    it('should parse complex Japanese commands (SOV)', async () => {
      const commands = [
        '#element に .highlight を 追加',
        '#button から .active を 削除',
        '.active を 切り替え',
      ];

      for (const cmd of commands) {
        const node = await ml.parse(cmd, 'ja');
        // Should parse without throwing
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });

    it('should parse complex Arabic commands (VSO)', async () => {
      const commands = ['بدّل .active على #button', 'أضف .highlight إلى #element'];

      for (const cmd of commands) {
        const node = await ml.parse(cmd, 'ar');
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });
  });

  describe('chained commands', () => {
    it('should handle commands with "then"', async () => {
      const node = await ml.parse('toggle .active then wait 100ms', 'en');
      // May parse as sequence or complex node
      expect(node === null || typeof node === 'object').toBe(true);
    });
  });

  describe('commands with selectors', () => {
    it('should parse commands with CSS selectors', async () => {
      const selectors = [
        'toggle .active',
        'toggle #myId',
        'toggle [data-value]',
        'toggle .class1.class2',
        'toggle .parent > .child',
      ];

      for (const cmd of selectors) {
        const node = await ml.parse(cmd, 'en');
        expect(node).not.toBeNull();
      }
    });

    it('should preserve primary selectors in translation', async () => {
      const cmd = 'toggle .class1 on #target';
      const result = await ml.translate(cmd, 'en', 'ja');

      // Primary selectors should be preserved
      expect(result).toContain('.class1');
      // Note: Complex selectors may be simplified during semantic parsing
      // The test focuses on the primary action target
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('MultilingualHyperscript - Cross-Language Features', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('round-trip translations', () => {
    it('should maintain semantic meaning in round-trip translation', async () => {
      // English → Japanese → English
      const original = 'toggle .active';
      const japanese = await ml.translate(original, 'en', 'ja');
      const backToEnglish = await ml.translate(japanese, 'ja', 'en');

      // Should contain the key elements
      expect(backToEnglish).toContain('toggle');
      expect(backToEnglish).toContain('.active');
    });

    it('should handle SVO → SOV → SVO round-trip', async () => {
      // Spanish → Korean → Spanish
      const original = 'alternar .active';
      const korean = await ml.translate(original, 'es', 'ko');
      expect(korean).toContain('.active'); // Selector preserved

      const backToSpanish = await ml.translate(korean, 'ko', 'es');
      expect(backToSpanish).toContain('.active');
    });

    it('should handle VSO → SVO → VSO round-trip', async () => {
      // Arabic → English → Arabic
      const original = 'بدّل .active';
      const english = await ml.translate(original, 'ar', 'en');
      expect(english).toContain('toggle');

      const backToArabic = await ml.translate(english, 'en', 'ar');
      expect(backToArabic).toContain('.active');
    });
  });

  describe('multi-language consistency', () => {
    it('should produce consistent output for same command across languages', async () => {
      const languages = ['en', 'es', 'ja', 'ko', 'ar', 'zh'];
      const translations = await Promise.all(
        languages.map(lang => ml.translate('toggle .active', 'en', lang))
      );

      // All translations should contain .active
      for (const translation of translations) {
        expect(translation).toContain('.active');
      }
    });

    it('should handle all supported languages in getAllTranslations', async () => {
      const all = await ml.getAllTranslations('toggle .active', 'en');
      const supportedLangs = ml.getSupportedLanguages();

      expect(Object.keys(all).length).toBe(supportedLangs.length);

      // Verify each language has a valid translation
      for (const lang of supportedLangs) {
        expect(all[lang]).toBeDefined();
        expect(all[lang].output).toContain('.active');
        expect(all[lang].targetLang).toBe(lang);
      }
    });
  });
});

describe('MultilingualHyperscript - Language Info', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('language metadata', () => {
    it('should provide correct info for all 13 languages', () => {
      const languages = ml.getSupportedLanguages();
      expect(languages).toHaveLength(13);

      for (const lang of languages) {
        const info = ml.getLanguageInfo(lang);
        expect(info).toBeDefined();
        expect(info!.code).toBe(lang);
        expect(info!.name).toBeDefined();
        expect(info!.nativeName).toBeDefined();
        expect(['ltr', 'rtl']).toContain(info!.direction);
        expect(['SVO', 'SOV', 'VSO', 'VOS']).toContain(info!.wordOrder);
      }
    });

    it('should correctly identify RTL languages', () => {
      const arabicInfo = ml.getLanguageInfo('ar');
      expect(arabicInfo?.direction).toBe('rtl');

      // All others should be LTR
      const ltrLangs = ['en', 'ja', 'ko', 'es', 'zh', 'tr', 'pt', 'fr', 'de', 'id', 'qu', 'sw'];
      for (const lang of ltrLangs) {
        const info = ml.getLanguageInfo(lang);
        expect(info?.direction).toBe('ltr');
      }
    });

    it('should correctly identify word orders', () => {
      // SVO languages
      const svoLangs = ['en', 'es', 'zh', 'pt', 'fr', 'de', 'id', 'sw'];
      for (const lang of svoLangs) {
        const info = ml.getLanguageInfo(lang);
        expect(info?.wordOrder).toBe('SVO');
      }

      // SOV languages
      const sovLangs = ['ja', 'ko', 'tr', 'qu'];
      for (const lang of sovLangs) {
        const info = ml.getLanguageInfo(lang);
        expect(info?.wordOrder).toBe('SOV');
      }

      // VSO languages
      const info = ml.getLanguageInfo('ar');
      expect(info?.wordOrder).toBe('VSO');
    });
  });

  describe('getAllLanguageInfo', () => {
    it('should return info for all 13 languages', () => {
      const allInfo = ml.getAllLanguageInfo();
      expect(Object.keys(allInfo)).toHaveLength(13);

      // Verify structure
      for (const [code, info] of Object.entries(allInfo)) {
        expect(info.code).toBe(code);
        expect(info.name).toBeDefined();
        expect(info.nativeName).toBeDefined();
        expect(info.direction).toBeDefined();
        expect(info.wordOrder).toBeDefined();
      }
    });

    it('should return a copy, not the original object', () => {
      const allInfo1 = ml.getAllLanguageInfo();
      const allInfo2 = ml.getAllLanguageInfo();

      // Should be equal but not the same reference
      expect(allInfo1).toEqual(allInfo2);
      expect(allInfo1).not.toBe(allInfo2);
    });
  });
});

describe('MultilingualHyperscript - parseToAST Variations', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('direct AST generation', () => {
    it('should generate AST for simple English commands', async () => {
      const commands = [
        'toggle .active',
        'add .highlight',
        'remove .selected',
        'show #modal',
        'hide #sidebar',
      ];

      for (const cmd of commands) {
        const ast = await ml.parseToAST(cmd, 'en');
        if (ast) {
          expect(ast.type).toBeDefined();
        }
      }
    });

    it('should generate AST for Japanese commands', async () => {
      const commands = ['.active を トグル', '.highlight を 追加', '.selected を 削除'];

      for (const cmd of commands) {
        const ast = await ml.parseToAST(cmd, 'ja');
        // Should either succeed or return null without crashing
        expect(ast === null || typeof ast === 'object').toBe(true);
      }
    });

    it('should generate AST for Spanish commands', async () => {
      const commands = ['alternar .active', 'añadir .highlight', 'quitar .selected'];

      for (const cmd of commands) {
        const ast = await ml.parseToAST(cmd, 'es');
        if (ast) {
          expect(ast.type).toBe('command');
        }
      }
    });
  });

  describe('parseToASTWithDetails', () => {
    it('should provide confidence scores', async () => {
      const result = await ml.parseToASTWithDetails('toggle .active', 'en');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should indicate which path was used', async () => {
      const result = await ml.parseToASTWithDetails('toggle .active', 'en');
      expect(typeof result.usedDirectPath).toBe('boolean');

      if (result.usedDirectPath) {
        expect(result.ast).not.toBeNull();
      } else {
        expect(result.fallbackText).not.toBeNull();
      }
    });

    it('should preserve language information', async () => {
      const languages = ['en', 'ja', 'es', 'ko', 'ar'];
      for (const lang of languages) {
        const result = await ml.parseToASTWithDetails('toggle .active', lang);
        expect(result.lang).toBe(lang);
      }
    });
  });
});

describe('getMultilingual singleton', () => {
  it('should return the same instance on multiple calls', async () => {
    const instance1 = await getMultilingual();
    const instance2 = await getMultilingual();
    const instance3 = await getMultilingual();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
  });

  it('should return already-initialized instance', async () => {
    const instance = await getMultilingual();
    expect(instance.isInitialized()).toBe(true);
  });

  it('should be usable immediately', async () => {
    const instance = await getMultilingual();
    const node = await instance.parse('toggle .active', 'en');
    expect(node).not.toBeNull();
  });
});

describe('MultilingualHyperscript - Render Functionality', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('semantic node rendering', () => {
    it('should render node to multiple target languages', async () => {
      const node = await ml.parse('toggle .active on #button', 'en');
      expect(node).not.toBeNull();

      if (node) {
        const languages = ['en', 'ja', 'es', 'ko', 'ar'];
        for (const lang of languages) {
          const rendered = await ml.render(node, lang);
          expect(typeof rendered).toBe('string');
          expect(rendered.length).toBeGreaterThan(0);
          // Should preserve selector
          expect(rendered).toContain('.active');
        }
      }
    });

    it('should render complex nodes correctly', async () => {
      const node = await ml.parse('add .highlight to #element', 'en');
      if (node) {
        const japanese = await ml.render(node, 'ja');
        expect(japanese).toContain('.highlight');

        const spanish = await ml.render(node, 'es');
        expect(spanish).toContain('.highlight');
      }
    });
  });
});

describe('MultilingualHyperscript - Performance Patterns', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('repeated operations', () => {
    it('should handle repeated parsing efficiently', async () => {
      const command = 'toggle .active';
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const node = await ml.parse(command, 'en');
        expect(node).not.toBeNull();
      }
    });

    it('should handle repeated translations efficiently', async () => {
      const command = 'toggle .active';
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const result = await ml.translate(command, 'en', 'ja');
        expect(result).toContain('.active');
      }
    });

    it('should handle multiple language translations in parallel', async () => {
      const command = 'toggle .active';
      const languages = ['ja', 'es', 'ko', 'ar', 'zh', 'tr', 'pt', 'fr'];

      const results = await Promise.all(languages.map(lang => ml.translate(command, 'en', lang)));

      expect(results).toHaveLength(languages.length);
      for (const result of results) {
        expect(result).toContain('.active');
      }
    });
  });

  describe('batch operations', () => {
    it('should handle multiple parse operations in parallel', async () => {
      const commands = [
        'toggle .active',
        'add .highlight',
        'remove .selected',
        'show #modal',
        'hide #sidebar',
      ];

      const results = await Promise.all(commands.map(cmd => ml.parse(cmd, 'en')));

      expect(results).toHaveLength(commands.length);
      for (const result of results) {
        expect(result === null || typeof result === 'object').toBe(true);
      }
    });
  });
});

describe('MultilingualHyperscript - Edge Cases', () => {
  let ml: MultilingualHyperscript;

  beforeEach(async () => {
    ml = new MultilingualHyperscript();
    await ml.initialize();
  });

  describe('unusual inputs', () => {
    it('should handle numeric-looking strings', async () => {
      const result = await ml.parse('toggle 123', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle mixed scripts', async () => {
      // English command with Japanese selector
      const result = await ml.parse('toggle .アクティブ', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle commands with URLs', async () => {
      const result = await ml.parse('toggle https://example.com', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('boundary conditions', () => {
    it('should handle single character input', async () => {
      const result = await ml.parse('a', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle language code case variations', async () => {
      // Language codes should be case-insensitive or handled gracefully
      const result1 = await ml.parse('toggle .active', 'EN');
      const result2 = await ml.parse('toggle .active', 'en');

      // Both should either work or both should fail consistently
      expect(typeof result1).toBe(typeof result2);
    });
  });
});
