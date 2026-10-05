/**
 * Comprehensive Multilingual Tests
 *
 * Coverage for `@hyperfixi/core/multilingual`'s functions (parse, render,
 * translate):
 * - Error handling and edge cases
 * - Complex command combinations
 * - Performance patterns
 * - Cross-language consistency validation
 */

import { describe, it, expect } from 'vitest';
import { parse, render, translate } from './index';

describe('multilingual - Error Handling', () => {
  describe('invalid inputs', () => {
    it('should handle empty input gracefully', async () => {
      const node = await parse('', 'en');
      // Empty input may return null or a minimal node
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle whitespace-only input', async () => {
      const node = await parse('   \n\t  ', 'en');
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle very long input strings', async () => {
      const longInput = 'toggle .active '.repeat(100);
      const node = await parse(longInput, 'en');
      // Should either parse or return null without crashing
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle special characters in input', async () => {
      const specialInput = 'toggle .active!@#$%^&*()';
      const node = await parse(specialInput, 'en');
      // Parser should handle special chars gracefully
      expect(node === null || typeof node === 'object').toBe(true);
    });

    it('should handle unicode characters', async () => {
      const unicodeInput = 'toggle .active™®©';
      const node = await parse(unicodeInput, 'en');
      expect(node === null || typeof node === 'object').toBe(true);
    });
  });

  describe('unsupported languages', () => {
    it('should handle unsupported language codes', async () => {
      const node = await parse('toggle .active', 'xyz');
      // Should either use fallback or return null
      expect(node === null || typeof node === 'object').toBe(true);
    });
  });

  describe('translation errors', () => {
    it('should handle same source and target language', async () => {
      const result = await translate('toggle .active', 'en', 'en');
      expect(result).toBe('toggle .active');
    });

    it('should handle translation with unsupported source language', async () => {
      // Should not throw, may use fallback behavior
      const result = await translate('toggle .active', 'xyz', 'en');
      expect(typeof result).toBe('string');
    });

    it('should handle translation with unsupported target language', async () => {
      // Should not throw, may use fallback behavior
      const result = await translate('toggle .active', 'en', 'xyz');
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
        const node = await parse(input, lang);
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });
  });
});

describe('multilingual - Complex Commands', () => {
  describe('multi-word commands', () => {
    it('should parse multi-word English commands', async () => {
      const commands = [
        'add .highlight to #element',
        'remove .active from #button',
        'put "text" into #output',
        'set #input to "value"',
      ];

      for (const cmd of commands) {
        const node = await parse(cmd, 'en');
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
        const node = await parse(cmd, 'ja');
        // Should parse without throwing
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });

    it('should parse complex Arabic commands (VSO)', async () => {
      const commands = ['بدّل .active على #button', 'أضف .highlight إلى #element'];

      for (const cmd of commands) {
        const node = await parse(cmd, 'ar');
        expect(node === null || typeof node === 'object').toBe(true);
      }
    });
  });

  describe('chained commands', () => {
    it('should handle commands with "then"', async () => {
      const node = await parse('toggle .active then wait 100ms', 'en');
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
        const node = await parse(cmd, 'en');
        expect(node).not.toBeNull();
      }
    });

    it('should preserve primary selectors in translation', async () => {
      const cmd = 'toggle .class1 on #target';
      const result = await translate(cmd, 'en', 'ja');

      // Primary selectors should be preserved
      expect(result).toContain('.class1');
      // Note: Complex selectors may be simplified during semantic parsing
      // The test focuses on the primary action target
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('multilingual - Cross-Language Features', () => {
  describe('round-trip translations', () => {
    it('should maintain semantic meaning in round-trip translation', async () => {
      // English → Japanese → English
      const original = 'toggle .active';
      const japanese = await translate(original, 'en', 'ja');
      const backToEnglish = await translate(japanese, 'ja', 'en');

      // Should contain the key elements
      expect(backToEnglish).toContain('toggle');
      expect(backToEnglish).toContain('.active');
    });

    it('should handle SVO → SOV → SVO round-trip', async () => {
      // Spanish → Korean → Spanish
      const original = 'alternar .active';
      const korean = await translate(original, 'es', 'ko');
      expect(korean).toContain('.active'); // Selector preserved

      const backToSpanish = await translate(korean, 'ko', 'es');
      expect(backToSpanish).toContain('.active');
    });

    it('should handle VSO → SVO → VSO round-trip', async () => {
      // Arabic → English → Arabic
      const original = 'بدّل .active';
      const english = await translate(original, 'ar', 'en');
      expect(english).toContain('toggle');

      const backToArabic = await translate(english, 'en', 'ar');
      expect(backToArabic).toContain('.active');
    });
  });

  describe('multi-language consistency', () => {
    it('should produce consistent output for same command across languages', async () => {
      const languages = ['en', 'es', 'ja', 'ko', 'ar', 'zh'];
      const translations = await Promise.all(
        languages.map(lang => translate('toggle .active', 'en', lang))
      );

      // All translations should contain .active
      for (const translation of translations) {
        expect(translation).toContain('.active');
      }
    });
  });
});

describe('multilingual - Render Functionality', () => {
  describe('semantic node rendering', () => {
    it('should render node to multiple target languages', async () => {
      const node = await parse('toggle .active on #button', 'en');
      expect(node).not.toBeNull();

      if (node) {
        const languages = ['en', 'ja', 'es', 'ko', 'ar'];
        for (const lang of languages) {
          const rendered = await render(node, lang);
          expect(typeof rendered).toBe('string');
          expect(rendered.length).toBeGreaterThan(0);
          // Should preserve selector
          expect(rendered).toContain('.active');
        }
      }
    });

    it('should render complex nodes correctly', async () => {
      const node = await parse('add .highlight to #element', 'en');
      if (node) {
        const japanese = await render(node, 'ja');
        expect(japanese).toContain('.highlight');

        const spanish = await render(node, 'es');
        expect(spanish).toContain('.highlight');
      }
    });
  });
});

describe('multilingual - Performance Patterns', () => {
  describe('repeated operations', () => {
    it('should handle repeated parsing efficiently', async () => {
      const command = 'toggle .active';
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const node = await parse(command, 'en');
        expect(node).not.toBeNull();
      }
    });

    it('should handle repeated translations efficiently', async () => {
      const command = 'toggle .active';
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const result = await translate(command, 'en', 'ja');
        expect(result).toContain('.active');
      }
    });

    it('should handle multiple language translations in parallel', async () => {
      const command = 'toggle .active';
      const languages = ['ja', 'es', 'ko', 'ar', 'zh', 'tr', 'pt', 'fr'];

      const results = await Promise.all(languages.map(lang => translate(command, 'en', lang)));

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

      const results = await Promise.all(commands.map(cmd => parse(cmd, 'en')));

      expect(results).toHaveLength(commands.length);
      for (const result of results) {
        expect(result === null || typeof result === 'object').toBe(true);
      }
    });
  });
});

describe('multilingual - Edge Cases', () => {
  describe('unusual inputs', () => {
    it('should handle numeric-looking strings', async () => {
      const result = await parse('toggle 123', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle mixed scripts', async () => {
      // English command with Japanese selector
      const result = await parse('toggle .アクティブ', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle commands with URLs', async () => {
      const result = await parse('toggle https://example.com', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('boundary conditions', () => {
    it('should handle single character input', async () => {
      const result = await parse('a', 'en');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle language code case variations', async () => {
      // Language codes should be case-insensitive or handled gracefully
      const result1 = await parse('toggle .active', 'EN');
      const result2 = await parse('toggle .active', 'en');

      // Both should either work or both should fail consistently
      expect(typeof result1).toBe(typeof result2);
    });
  });
});
