/**
 * Multilingual Server Plugin Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMultilingualServerPlugin,
  KeywordAliasRegistry,
  detectLanguage,
  getWordOrder,
  getTextDirection,
  respondKeywords,
  redirectKeywords,
  requestKeywords,
  type LanguageCode,
} from './index';
import { createRegistry } from '../index';

// ============================================================================
// KeywordAliasRegistry Tests
// ============================================================================

describe('KeywordAliasRegistry', () => {
  let registry: KeywordAliasRegistry;

  beforeEach(() => {
    registry = new KeywordAliasRegistry();
  });

  describe('register/lookup', () => {
    it('should register and lookup a keyword', () => {
      registry.register('respond', '応答', 'ja');

      const result = registry.lookup('応答');

      expect(result).toEqual({ command: 'respond', language: 'ja' });
    });

    it('should normalize keywords to lowercase', () => {
      registry.register('respond', 'RESPOND', 'en');

      expect(registry.lookup('respond')).toBeDefined();
      expect(registry.lookup('RESPOND')).toBeDefined();
      expect(registry.lookup('Respond')).toBeDefined();
    });

    it('should return undefined for unknown keywords', () => {
      expect(registry.lookup('unknown')).toBeUndefined();
    });
  });

  describe('registerFromMap', () => {
    it('should register all keywords from a map', () => {
      registry.registerFromMap('respond', {
        en: { primary: 'respond', alternatives: ['reply'] },
        ja: { primary: '応答', alternatives: ['返す'] },
      });

      expect(registry.lookup('respond')).toEqual({ command: 'respond', language: 'en' });
      expect(registry.lookup('reply')).toEqual({ command: 'respond', language: 'en' });
      expect(registry.lookup('応答')).toEqual({ command: 'respond', language: 'ja' });
      expect(registry.lookup('返す')).toEqual({ command: 'respond', language: 'ja' });
    });

    it('should handle string-only keyword definitions', () => {
      registry.registerFromMap('test', {
        en: 'test',
        es: 'prueba',
      });

      expect(registry.lookup('test')).toEqual({ command: 'test', language: 'en' });
      expect(registry.lookup('prueba')).toEqual({ command: 'test', language: 'es' });
    });
  });

  describe('getKeywords', () => {
    it('should return all keywords for a command in a language', () => {
      registry.registerFromMap('respond', {
        en: { primary: 'respond', alternatives: ['reply', 'send'] },
        ja: { primary: '応答' },
      });

      const enKeywords = registry.getKeywords('respond', 'en');
      expect(enKeywords).toContain('respond');
      expect(enKeywords).toContain('reply');
      expect(enKeywords).toContain('send');

      const jaKeywords = registry.getKeywords('respond', 'ja');
      expect(jaKeywords).toContain('応答');
    });

    it('should return empty array for unknown command', () => {
      expect(registry.getKeywords('unknown', 'en')).toEqual([]);
    });
  });

  describe('getLanguages', () => {
    it('should return all languages for a command', () => {
      registry.registerFromMap('respond', {
        en: 'respond',
        ja: '応答',
        es: 'responder',
      });

      const languages = registry.getLanguages('respond');

      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('es');
    });
  });
});

// ============================================================================
// createMultilingualServerPlugin Tests
// ============================================================================

describe('createMultilingualServerPlugin', () => {
  it('should create a plugin with default settings', () => {
    const plugin = createMultilingualServerPlugin();

    expect(plugin.name).toBe('hyperfixi-multilingual-server');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.keywordRegistry).toBeInstanceOf(KeywordAliasRegistry);
  });

  it('should setup keyword registry on install', () => {
    const plugin = createMultilingualServerPlugin({
      languages: ['en', 'ja', 'es'],
    });

    const registry = createRegistry();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.use(plugin);

    // Check that keywords were registered
    expect(plugin.keywordRegistry.lookup('respond')).toBeDefined();
    expect(plugin.keywordRegistry.lookup('応答')).toBeDefined();
    expect(plugin.keywordRegistry.lookup('responder')).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('should filter languages based on options', () => {
    const plugin = createMultilingualServerPlugin({
      languages: ['en', 'ja'], // Only English and Japanese
    });

    const registry = createRegistry();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.use(plugin);

    // English and Japanese should be registered
    expect(plugin.keywordRegistry.lookup('respond')).toBeDefined();
    expect(plugin.keywordRegistry.lookup('応答')).toBeDefined();

    // Spanish should not be registered (not in languages list)
    const esLookup = plugin.keywordRegistry.lookup('responder');
    expect(esLookup).toBeUndefined();
  });

  it('should merge custom keywords with defaults', () => {
    const plugin = createMultilingualServerPlugin({
      languages: ['en', 'ja'],
      customKeywords: {
        respond: {
          ja: { primary: 'カスタム応答' }, // Override default
        },
      },
    });

    const registry = createRegistry();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.use(plugin);

    // Custom keyword should be registered
    expect(plugin.keywordRegistry.lookup('カスタム応答')).toEqual({
      command: 'respond',
      language: 'ja',
    });
  });

  it('should register context providers', () => {
    const plugin = createMultilingualServerPlugin();
    const registry = createRegistry();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.use(plugin);

    expect(registry.context.has('request')).toBe(true);
    expect(registry.context.has('response')).toBe(true);
  });
});

// ============================================================================
// Language Detection Tests
// ============================================================================

describe('detectLanguage', () => {
  let registry: KeywordAliasRegistry;

  beforeEach(() => {
    registry = new KeywordAliasRegistry();
    registry.registerFromMap('respond', respondKeywords);
    registry.registerFromMap('request', requestKeywords);
  });

  it('should detect Japanese from script', () => {
    // Hiragana/Katakana are uniquely Japanese
    expect(detectLanguage('リクエスト で', registry)).toBe('ja');
    expect(detectLanguage('おうとう with users', registry)).toBe('ja');
    // Note: Kanji-only text like "応答" is detected as Chinese since
    // CJK characters are shared between languages
  });

  it('should detect Korean from script', () => {
    expect(detectLanguage('응답 with users', registry)).toBe('ko');
  });

  it('should detect Arabic from script', () => {
    expect(detectLanguage('رد مع المستخدمين', registry)).toBe('ar');
  });

  it('should detect Chinese from script', () => {
    expect(detectLanguage('响应 用户', registry)).toBe('zh');
  });

  it('should detect Thai from script', () => {
    expect(detectLanguage('ตอบกลับ', registry)).toBe('th');
  });

  it('should detect Hindi/Devanagari from script', () => {
    expect(detectLanguage('जवाब', registry)).toBe('hi');
  });

  it('should detect Russian/Cyrillic from script', () => {
    expect(detectLanguage('ответить', registry)).toBe('ru');
  });

  it('should detect language from keywords for Latin scripts', () => {
    registry.registerFromMap('respond', {
      en: 'respond',
      es: 'responder',
      fr: 'répondre',
    });

    expect(detectLanguage('respond with users', registry)).toBe('en');
    expect(detectLanguage('responder con usuarios', registry)).toBe('es');
  });

  it('should default to English for unknown input', () => {
    expect(detectLanguage('unknown command here', registry)).toBe('en');
  });
});

// ============================================================================
// Word Order Tests
// ============================================================================

describe('getWordOrder', () => {
  it('should return SOV for Japanese', () => {
    expect(getWordOrder('ja')).toBe('SOV');
  });

  it('should return SOV for Korean', () => {
    expect(getWordOrder('ko')).toBe('SOV');
  });

  it('should return SOV for Turkish', () => {
    expect(getWordOrder('tr')).toBe('SOV');
  });

  it('should return VSO for Arabic', () => {
    expect(getWordOrder('ar')).toBe('VSO');
  });

  it('should return V2 for German', () => {
    expect(getWordOrder('de')).toBe('V2');
  });

  it('should return SVO for English', () => {
    expect(getWordOrder('en')).toBe('SVO');
  });

  it('should return SVO for Spanish', () => {
    expect(getWordOrder('es')).toBe('SVO');
  });

  it('should return SVO for Chinese', () => {
    expect(getWordOrder('zh')).toBe('SVO');
  });
});

// ============================================================================
// Text Direction Tests
// ============================================================================

describe('getTextDirection', () => {
  it('should return rtl for Arabic', () => {
    expect(getTextDirection('ar')).toBe('rtl');
  });

  it('should return ltr for all other languages', () => {
    const ltrLanguages: LanguageCode[] = [
      'en',
      'ja',
      'ko',
      'zh',
      'es',
      'pt',
      'fr',
      'de',
      'tr',
      'id',
      'ru',
    ];

    for (const lang of ltrLanguages) {
      expect(getTextDirection(lang)).toBe('ltr');
    }
  });
});

// ============================================================================
// Default Keywords Tests
// ============================================================================

describe('Default Keywords', () => {
  describe('respondKeywords', () => {
    it('should have English keywords', () => {
      expect(respondKeywords.en).toBeDefined();
      const en =
        typeof respondKeywords.en === 'string'
          ? { primary: respondKeywords.en }
          : respondKeywords.en;
      expect(en?.primary).toBe('respond');
    });

    it('should have Japanese keywords', () => {
      const ja =
        typeof respondKeywords.ja === 'string'
          ? { primary: respondKeywords.ja }
          : respondKeywords.ja;
      expect(ja?.primary).toBe('応答');
    });

    it('should have Spanish keywords', () => {
      const es =
        typeof respondKeywords.es === 'string'
          ? { primary: respondKeywords.es }
          : respondKeywords.es;
      expect(es?.primary).toBe('responder');
    });

    it('should have Arabic keywords', () => {
      const ar =
        typeof respondKeywords.ar === 'string'
          ? { primary: respondKeywords.ar }
          : respondKeywords.ar;
      expect(ar?.primary).toBe('رد');
    });
  });

  describe('redirectKeywords', () => {
    it('should have keywords for major languages', () => {
      expect(redirectKeywords.en).toBeDefined();
      expect(redirectKeywords.ja).toBeDefined();
      expect(redirectKeywords.es).toBeDefined();
      expect(redirectKeywords.ar).toBeDefined();
      expect(redirectKeywords.zh).toBeDefined();
    });
  });

  describe('requestKeywords', () => {
    it('should have keywords for major languages', () => {
      expect(requestKeywords.en).toBeDefined();
      expect(requestKeywords.ja).toBeDefined();
      expect(requestKeywords.es).toBeDefined();
      expect(requestKeywords.ar).toBeDefined();
    });

    it('should include HTTP as alternative', () => {
      const en =
        typeof requestKeywords.en === 'string'
          ? { primary: requestKeywords.en }
          : requestKeywords.en;
      expect(en?.alternatives).toContain('http');
    });
  });
});
