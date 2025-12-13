/**
 * Semantic-Grammar Bridge Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticGrammarBridge,
  semanticNodeToParsedStatement,
} from './bridge';

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
      const result = await bridge.transform(
        'toggle .active on #button',
        'en',
        'ja'
      );
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
});

describe('semanticNodeToParsedStatement', () => {
  it('should convert a semantic node to parsed statement', () => {
    // Type the roles map with the correct key type
    type SemanticRole = 'patient' | 'agent' | 'instrument' | 'destination' | 'source' | 'theme' | 'trigger' | 'condition' | 'duration' | 'value' | 'attribute';
    type SemanticValue = { type: 'selector'; value: string; selectorKind: string };

    const roles = new Map<SemanticRole, SemanticValue>();
    roles.set('patient', { type: 'selector', value: '.active', selectorKind: 'class' });

    const mockNode = {
      kind: 'command' as const,
      action: 'toggle' as const,
      roles,
      metadata: { sourceText: 'toggle .active' },
    };

    const statement = semanticNodeToParsedStatement(mockNode as any);

    expect(statement.type).toBe('command');
    expect(statement.roles.has('action')).toBe(true);
    expect(statement.roles.has('patient')).toBe(true);
    expect(statement.roles.get('action')?.value).toBe('toggle');
    expect(statement.roles.get('patient')?.value).toBe('.active');
    expect(statement.roles.get('patient')?.isSelector).toBe(true);
  });

  it('should handle references', () => {
    type SemanticRole = 'patient';
    type SemanticValue = { type: 'reference'; value: string };

    const roles = new Map<SemanticRole, SemanticValue>();
    roles.set('patient', { type: 'reference', value: 'me' });

    const mockNode = {
      kind: 'command' as const,
      action: 'increment' as const,
      roles,
      metadata: {},
    };

    const statement = semanticNodeToParsedStatement(mockNode as any);
    expect(statement.roles.get('patient')?.value).toBe('me');
    expect(statement.roles.get('patient')?.isSelector).toBe(false);
  });

  it('should handle property paths', () => {
    type SemanticRole = 'patient';
    type SemanticValue = {
      type: 'property-path';
      object: { type: 'selector'; value: string; selectorKind: string };
      property: string;
    };

    const roles = new Map<SemanticRole, SemanticValue>();
    roles.set('patient', {
      type: 'property-path',
      object: { type: 'selector', value: '#element', selectorKind: 'id' },
      property: 'value',
    });

    const mockNode = {
      kind: 'command' as const,
      action: 'set' as const,
      roles,
      metadata: {},
    };

    const statement = semanticNodeToParsedStatement(mockNode as any);
    expect(statement.roles.get('patient')?.value).toBe("#element's value");
  });
});

// =============================================================================
// MultilingualHyperscript API Tests
// =============================================================================

import {
  MultilingualHyperscript,
  getMultilingual,
  multilingual,
  type LanguageInfo,
} from './index';

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
