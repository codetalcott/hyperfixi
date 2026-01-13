/**
 * Enhanced I18n Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TypedI18nContextImplementation,
  createI18nContext,
  createEnhancedI18n,
  enhancedI18nImplementation,
  type EnhancedI18nInput,
  type EnhancedI18nOutput,
} from './enhanced-i18n.js';

describe('Enhanced I18n Implementation', () => {
  let i18nContext: TypedI18nContextImplementation;

  beforeEach(() => {
    i18nContext = createI18nContext();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal configuration', async () => {
      const input: EnhancedI18nInput = {
        locale: 'en',
      };

      const result = await i18nContext.initialize(input);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();

      if (result.success && result.value) {
        expect(result.value.locale.current).toBe('en');
        expect(result.value.category).toBe('Universal');
        expect(result.value.capabilities).toContain('translation');
        expect(result.value.capabilities).toContain('locale-management');
      }
    });

    it('should initialize with comprehensive configuration', async () => {
      const spanishDict = {
        commands: { click: 'clic', add: 'agregar', remove: 'quitar' },
        modifiers: { to: 'a', from: 'de', with: 'con' },
        events: { click: 'clic', hover: 'hover', focus: 'foco' },
        logical: { and: 'y', or: 'o', not: 'no' },
        temporal: { then: 'luego', wait: 'esperar', after: 'después' },
        values: { true: 'verdadero', false: 'falso', null: 'nulo' },
        attributes: { class: 'clase', id: 'id', style: 'estilo' },
      };

      const input: EnhancedI18nInput = {
        locale: 'es',
        fallbackLocale: 'en',
        dictionaries: {
          es: spanishDict,
        },
        options: {
          detectLocale: true,
          rtlLocales: ['ar', 'he'],
          validate: true,
        },
        environment: 'frontend',
        debug: true,
      };

      const result = await i18nContext.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.locale.current).toBe('es');
        expect(result.value.locale.fallback).toBe('en');
        expect(result.value.locale.direction).toBe('ltr');
        expect(result.value.locale.available).toContain('es');
      }
    });

    it('should handle RTL languages correctly', async () => {
      const arabicDict = {
        commands: { click: 'انقر', add: 'أضف', remove: 'احذف' },
        modifiers: { to: 'إلى', from: 'من', with: 'مع' },
        events: { click: 'انقر', hover: 'تحوم', focus: 'التركيز' },
        logical: { and: 'و', or: 'أو', not: 'ليس' },
        temporal: { then: 'ثم', wait: 'انتظر', after: 'بعد' },
        values: { true: 'صحيح', false: 'خطأ', null: 'فارغ' },
        attributes: { class: 'فئة', id: 'معرف', style: 'نمط' },
      };

      const input: EnhancedI18nInput = {
        locale: 'ar',
        dictionaries: { ar: arabicDict },
        options: {
          rtlLocales: ['ar', 'he', 'fa', 'ur'],
        },
      };

      const result = await i18nContext.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.locale.direction).toBe('rtl');
        expect(result.value.capabilities).toContain('rtl-support');
      }
    });
  });

  describe('Translation Capabilities', () => {
    it('should translate individual terms', async () => {
      const frenchDict = {
        commands: { click: 'cliquer', add: 'ajouter', remove: 'supprimer' },
        modifiers: { to: 'à', from: 'de', with: 'avec' },
        events: { click: 'clic', hover: 'survol', focus: 'focus' },
        logical: { and: 'et', or: 'ou', not: 'non' },
        temporal: { then: 'puis', wait: 'attendre', after: 'après' },
        values: { true: 'vrai', false: 'faux', null: 'nul' },
        attributes: { class: 'classe', id: 'id', style: 'style' },
      };

      const result = await i18nContext.initialize({
        locale: 'fr',
        dictionaries: { fr: frenchDict },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const translate = result.value.translate;

        expect(translate('click', 'commands')).toBe('cliquer');
        expect(translate('to', 'modifiers')).toBe('à');
        expect(translate('and', 'logical')).toBe('et');
        expect(translate('nonexistent', 'commands')).toBe('nonexistent'); // Fallback
      }
    });

    it('should translate hyperscript expressions', async () => {
      const germanDict = {
        commands: { click: 'klicken', add: 'hinzufügen', remove: 'entfernen' },
        modifiers: { to: 'zu', from: 'von', with: 'mit' },
        events: { click: 'klick', hover: 'schweben', focus: 'fokus' },
        logical: { and: 'und', or: 'oder', not: 'nicht' },
        temporal: { then: 'dann', wait: 'warten', after: 'nach' },
        values: { true: 'wahr', false: 'falsch', null: 'null' },
        attributes: { class: 'klasse', id: 'id', style: 'stil' },
      };

      const result = await i18nContext.initialize({
        locale: 'de',
        dictionaries: { de: germanDict },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const translateHyperscript = result.value.translateHyperscript;

        const translated = translateHyperscript('on click add .highlight');
        expect(translated).toContain('klick'); // Event should be translated
        expect(translated).toContain('hinzufügen'); // Command should be translated
      }
    });
  });

  describe('Dictionary Management', () => {
    it('should provide dictionary access methods', async () => {
      const japaneseDict = {
        commands: { click: 'クリック', add: '追加', remove: '削除' },
        modifiers: { to: 'に', from: 'から', with: 'と' },
        events: { click: 'クリック', hover: 'ホバー', focus: 'フォーカス' },
        logical: { and: 'かつ', or: 'または', not: 'ではない' },
        temporal: { then: 'そして', wait: '待つ', after: '後' },
        values: { true: '真', false: '偽', null: 'null' },
        attributes: { class: 'クラス', id: 'ID', style: 'スタイル' },
      };

      const result = await i18nContext.initialize({
        locale: 'ja',
        dictionaries: { ja: japaneseDict },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const { dictionary } = result.value;

        // Test dictionary access
        expect(dictionary.get('commands.click')).toBe('クリック');
        expect(dictionary.has('commands.click')).toBe(true);
        expect(dictionary.has('commands.nonexistent')).toBe(false);

        // Test dictionary keys
        const keys = dictionary.keys();
        expect(keys).toContain('commands.click');
        expect(keys).toContain('modifiers.to');

        // Test setting new values
        dictionary.set('commands.test', 'テスト');
        expect(dictionary.get('commands.test')).toBe('テスト');
      }
    });
  });

  describe('Formatting Utilities', () => {
    it('should provide locale-aware number formatting', async () => {
      const result = await i18nContext.initialize({
        locale: 'de-DE',
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const { format } = result.value;

        // Number formatting (format may vary by environment)
        const formatted = format.number(1234.56);
        expect(typeof formatted).toBe('string');
        expect(formatted).toMatch(/1[,\s]?234/); // May have comma or space separator
      }
    });

    it('should provide locale-aware date formatting', async () => {
      const result = await i18nContext.initialize({
        locale: 'fr-FR',
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const { format } = result.value;

        const testDate = new Date('2024-01-15');
        const formatted = format.date(testDate, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        expect(typeof formatted).toBe('string');
        expect(formatted).toBeTruthy(); // Date formatting succeeds
      }
    });

    it('should provide currency formatting', async () => {
      const result = await i18nContext.initialize({
        locale: 'en-US',
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const { format } = result.value;

        const formatted = format.currency(1234.56, 'USD');
        expect(typeof formatted).toBe('string');
        expect(formatted).toMatch(/1[,\s]?234/); // Contains the number part with possible separators
      }
    });

    it('should provide relative time formatting', async () => {
      const result = await i18nContext.initialize({
        locale: 'en',
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const { format } = result.value;

        const relative = format.relative(-1, 'day');
        expect(relative).toMatch(/yesterday|1 day ago/);
      }
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate locale format', () => {
      const validationResult = i18nContext.validate({
        locale: 'invalid-locale',
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('invalid-locale');
      expect(validationResult.suggestions).toContain(
        'Use standard locale codes like "en", "es", "fr", "de", "ja", "zh"'
      );
    });

    it('should validate dictionary completeness', () => {
      const incompleteDict = {
        commands: { click: 'clic' },
        // Missing other required categories
      };

      const validationResult = i18nContext.validate({
        locale: 'es',
        dictionaries: {
          es: incompleteDict,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await i18nContext.initialize({
        locale: '', // Invalid empty locale
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await i18nContext.initialize({
          locale: 'en',
        });
      }

      const metrics = i18nContext.getPerformanceMetrics();

      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createI18nContext();
      expect(context).toBeInstanceOf(TypedI18nContextImplementation);
      expect(context.name).toBe('i18nContext');
      expect(context.category).toBe('Universal');
    });

    it('should create enhanced i18n through convenience function', async () => {
      const result = await createEnhancedI18n('zh-CN', {
        fallbackLocale: 'en',
        environment: 'frontend',
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(i18nContext.name).toBe('i18nContext');
      expect(i18nContext.category).toBe('Universal');
      expect(i18nContext.description).toBeDefined();
      expect(i18nContext.inputSchema).toBeDefined();
      expect(i18nContext.outputType).toBe('Context');
      expect(i18nContext.metadata).toBeDefined();
      expect(i18nContext.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = i18nContext;

      expect(metadata.category).toBe('Universal');
      expect(metadata.complexity).toBe('moderate');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = i18nContext;

      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('i18n');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Integration with Indigenous Languages', () => {
    it('should support Quechua language', async () => {
      const quechuaDict = {
        commands: { click: "ñit'iy", add: 'yapay', remove: 'qichuy' },
        modifiers: { to: 'man', from: 'manta', with: 'wan' },
        events: { click: "ñit'iy", hover: 'puray', focus: 'qhaway' },
        logical: { and: 'chaymanta', or: 'utaq', not: 'mana' },
        temporal: { then: 'chayqa', wait: 'suyay', after: 'qhipaman' },
        values: { true: 'cheqaq', false: 'mana cheqaq', null: 'mana ima' },
        attributes: { class: 'kaq', id: 'riqsichiq', style: "rikch'ay" },
      };

      const result = await i18nContext.initialize({
        locale: 'qu',
        dictionaries: { qu: quechuaDict },
        environment: 'universal',
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const translate = result.value.translate;
        expect(translate('click', 'commands')).toBe("ñit'iy");
        expect(translate('add', 'commands')).toBe('yapay');
      }
    });

    it('should support Swahili language', async () => {
      const swahiliDict = {
        commands: { click: 'bonyeza', add: 'ongeza', remove: 'ondoa' },
        modifiers: { to: 'kwa', from: 'kutoka', with: 'na' },
        events: { click: 'bonyeza', hover: 'ruka', focus: 'lenga' },
        logical: { and: 'na', or: 'au', not: 'si' },
        temporal: { then: 'kisha', wait: 'ngoja', after: 'baada' },
        values: { true: 'kweli', false: 'uongo', null: 'tupu' },
        attributes: { class: 'darasa', id: 'kitambulisho', style: 'mtindo' },
      };

      const result = await i18nContext.initialize({
        locale: 'sw',
        dictionaries: { sw: swahiliDict },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const translate = result.value.translate;
        expect(translate('click', 'commands')).toBe('bonyeza');
        expect(translate('add', 'commands')).toBe('ongeza');
      }
    });
  });
});

describe('Enhanced I18n Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedI18nImplementation).toBeInstanceOf(TypedI18nContextImplementation);
    expect(enhancedI18nImplementation.name).toBe('i18nContext');
  });
});
